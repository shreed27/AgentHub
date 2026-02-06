import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/agentdex.db');

// Ensure directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    api_key TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    name TEXT,
    trade_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS limit_orders (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    input_mint TEXT NOT NULL,
    output_mint TEXT NOT NULL,
    amount TEXT NOT NULL,
    target_price REAL NOT NULL,
    slippage_bps INTEGER DEFAULT 50,
    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'filled', 'cancelled', 'failed')),
    tx_signature TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    filled_at TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS trade_history (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    wallet TEXT NOT NULL,
    input_mint TEXT NOT NULL,
    output_mint TEXT NOT NULL,
    input_amount TEXT NOT NULL,
    output_amount TEXT NOT NULL,
    tx_signature TEXT NOT NULL,
    price_impact TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
  CREATE INDEX IF NOT EXISTS idx_limit_orders_agent ON limit_orders(agent_id);
  CREATE INDEX IF NOT EXISTS idx_limit_orders_status ON limit_orders(status);
  CREATE INDEX IF NOT EXISTS idx_trade_history_wallet ON trade_history(wallet);
  CREATE INDEX IF NOT EXISTS idx_trade_history_agent ON trade_history(agent_id);
`);

// ---- Agent Operations ----

export interface Agent {
  id: string;
  api_key: string;
  public_key: string;
  secret_key: string;
  name: string | null;
  trade_count: number;
  created_at: string;
}

export function registerAgent(name?: string): { agent: Agent; keypair: Keypair } {
  const id = uuidv4();
  const apiKey = `adx_${uuidv4().replace(/-/g, '')}`;
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const secretKey = bs58.encode(keypair.secretKey);

  const stmt = db.prepare(`
    INSERT INTO agents (id, api_key, public_key, secret_key, name)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, apiKey, publicKey, secretKey, name || null);

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent;
  return { agent, keypair };
}

export function getAgentByApiKey(apiKey: string): Agent | undefined {
  return db.prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey) as Agent | undefined;
}

export function getAgentById(id: string): Agent | undefined {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

export function incrementTradeCount(agentId: string): void {
  db.prepare('UPDATE agents SET trade_count = trade_count + 1, updated_at = datetime(\'now\') WHERE id = ?').run(agentId);
}

export function getAgentKeypair(agent: Agent): Keypair {
  const secretKey = bs58.decode(agent.secret_key);
  return Keypair.fromSecretKey(secretKey);
}

// ---- Limit Order Operations ----

export interface LimitOrder {
  id: string;
  agent_id: string;
  input_mint: string;
  output_mint: string;
  amount: string;
  target_price: number;
  slippage_bps: number;
  side: 'buy' | 'sell';
  status: string;
  tx_signature: string | null;
  created_at: string;
  updated_at: string;
  filled_at: string | null;
}

export function createLimitOrder(params: {
  agentId: string;
  inputMint: string;
  outputMint: string;
  amount: string;
  targetPrice: number;
  slippageBps?: number;
  side: 'buy' | 'sell';
}): LimitOrder {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO limit_orders (id, agent_id, input_mint, output_mint, amount, target_price, slippage_bps, side)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, params.agentId, params.inputMint, params.outputMint, params.amount, params.targetPrice, params.slippageBps || 50, params.side);

  return db.prepare('SELECT * FROM limit_orders WHERE id = ?').get(id) as LimitOrder;
}

export function getActiveLimitOrders(agentId?: string): LimitOrder[] {
  if (agentId) {
    return db.prepare('SELECT * FROM limit_orders WHERE agent_id = ? AND status = ? ORDER BY created_at DESC').all(agentId, 'active') as LimitOrder[];
  }
  return db.prepare('SELECT * FROM limit_orders WHERE status = ? ORDER BY created_at DESC').all('active') as LimitOrder[];
}

export function getLimitOrderById(id: string): LimitOrder | undefined {
  return db.prepare('SELECT * FROM limit_orders WHERE id = ?').get(id) as LimitOrder | undefined;
}

export function cancelLimitOrder(id: string, agentId: string): boolean {
  const result = db.prepare('UPDATE limit_orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND agent_id = ? AND status = ?').run('cancelled', id, agentId, 'active');
  return result.changes > 0;
}

export function fillLimitOrder(id: string, txSignature: string): void {
  db.prepare(`
    UPDATE limit_orders SET status = 'filled', tx_signature = ?, filled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
  `).run(txSignature, id);
}

export function failLimitOrder(id: string): void {
  db.prepare(`
    UPDATE limit_orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?
  `).run(id);
}

// ---- Trade History ----

export interface TradeRecord {
  id: string;
  agent_id: string | null;
  wallet: string;
  input_mint: string;
  output_mint: string;
  input_amount: string;
  output_amount: string;
  tx_signature: string;
  price_impact: string | null;
  status: string;
  created_at: string;
}

export function recordTrade(params: {
  agentId?: string;
  wallet: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  txSignature: string;
  priceImpact?: string;
}): TradeRecord {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO trade_history (id, agent_id, wallet, input_mint, output_mint, input_amount, output_amount, tx_signature, price_impact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, params.agentId || null, params.wallet, params.inputMint, params.outputMint, params.inputAmount, params.outputAmount, params.txSignature, params.priceImpact || null);

  return db.prepare('SELECT * FROM trade_history WHERE id = ?').get(id) as TradeRecord;
}

export function getTradeHistory(wallet: string, limit = 50): TradeRecord[] {
  return db.prepare('SELECT * FROM trade_history WHERE wallet = ? ORDER BY created_at DESC LIMIT ?').all(wallet, limit) as TradeRecord[];
}

export function getStats(): { totalAgents: number; totalTrades: number; activeLimitOrders: number } {
  const totalAgents = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as any).count;
  const totalTrades = (db.prepare('SELECT COUNT(*) as count FROM trade_history').get() as any).count;
  const activeLimitOrders = (db.prepare('SELECT COUNT(*) as count FROM limit_orders WHERE status = ?').get('active') as any).count;
  return { totalAgents, totalTrades, activeLimitOrders };
}

export default db;
