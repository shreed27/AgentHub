/**
 * Database Operations for Trade Ledger (Decision Audit Trail)
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';

export type LedgerAction = 'buy' | 'sell' | 'close' | 'open_position' | 'close_position' | 'adjust_sl' | 'adjust_tp';
export type DecisionSource = 'manual' | 'ai' | 'signal' | 'copy_trade' | 'automation' | 'limit_order';

export interface TradeLedgerEntry {
  id: string;
  agentId?: string;
  walletAddress: string;
  action: LedgerAction;
  token: string;
  tokenSymbol?: string;
  chain: string;
  amount: number;
  price: number;
  decisionSource: DecisionSource;
  reasoning?: string;
  confidence?: number;
  signalIds?: string[];
  positionId?: string;
  txSignature?: string;
  fees: number;
  slippage: number;
  pnl?: number;
  createdAt: number;
}

interface TradeLedgerRow {
  id: string;
  agent_id: string | null;
  wallet_address: string;
  action: string;
  token: string;
  token_symbol: string | null;
  chain: string;
  amount: number;
  price: number;
  decision_source: string;
  reasoning: string | null;
  confidence: number | null;
  signal_ids: string | null;
  position_id: string | null;
  tx_signature: string | null;
  fees: number;
  slippage: number;
  pnl: number | null;
  created_at: number;
}

function rowToTradeLedgerEntry(row: TradeLedgerRow): TradeLedgerEntry {
  return {
    id: row.id,
    agentId: row.agent_id || undefined,
    walletAddress: row.wallet_address,
    action: row.action as LedgerAction,
    token: row.token,
    tokenSymbol: row.token_symbol || undefined,
    chain: row.chain,
    amount: row.amount,
    price: row.price,
    decisionSource: row.decision_source as DecisionSource,
    reasoning: row.reasoning || undefined,
    confidence: row.confidence || undefined,
    signalIds: row.signal_ids ? parseJSON<string[]>(row.signal_ids, []) : undefined,
    positionId: row.position_id || undefined,
    txSignature: row.tx_signature || undefined,
    fees: row.fees,
    slippage: row.slippage,
    pnl: row.pnl || undefined,
    createdAt: row.created_at,
  };
}

export function createLedgerEntry(entry: TradeLedgerEntry): TradeLedgerEntry {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO trade_ledger (
      id, agent_id, wallet_address, action, token, token_symbol, chain,
      amount, price, decision_source, reasoning, confidence, signal_ids,
      position_id, tx_signature, fees, slippage, pnl, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    entry.id,
    entry.agentId || null,
    entry.walletAddress,
    entry.action,
    entry.token,
    entry.tokenSymbol || null,
    entry.chain,
    entry.amount,
    entry.price,
    entry.decisionSource,
    entry.reasoning || null,
    entry.confidence || null,
    entry.signalIds ? stringifyJSON(entry.signalIds) : null,
    entry.positionId || null,
    entry.txSignature || null,
    entry.fees,
    entry.slippage,
    entry.pnl || null,
    entry.createdAt
  );

  return entry;
}

export function getLedgerEntryById(id: string): TradeLedgerEntry | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM trade_ledger WHERE id = ?');
  const row = stmt.get(id) as TradeLedgerRow | undefined;
  return row ? rowToTradeLedgerEntry(row) : null;
}

export function getLedgerEntries(options?: {
  walletAddress?: string;
  agentId?: string;
  token?: string;
  action?: LedgerAction;
  decisionSource?: DecisionSource;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): { entries: TradeLedgerEntry[]; total: number } {
  const db = getDatabase();

  let query = 'SELECT * FROM trade_ledger WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM trade_ledger WHERE 1=1';
  const params: unknown[] = [];

  if (options?.walletAddress) {
    query += ' AND wallet_address = ?';
    countQuery += ' AND wallet_address = ?';
    params.push(options.walletAddress);
  }

  if (options?.agentId) {
    query += ' AND agent_id = ?';
    countQuery += ' AND agent_id = ?';
    params.push(options.agentId);
  }

  if (options?.token) {
    query += ' AND token = ?';
    countQuery += ' AND token = ?';
    params.push(options.token);
  }

  if (options?.action) {
    query += ' AND action = ?';
    countQuery += ' AND action = ?';
    params.push(options.action);
  }

  if (options?.decisionSource) {
    query += ' AND decision_source = ?';
    countQuery += ' AND decision_source = ?';
    params.push(options.decisionSource);
  }

  if (options?.startTime) {
    query += ' AND created_at >= ?';
    countQuery += ' AND created_at >= ?';
    params.push(options.startTime);
  }

  if (options?.endTime) {
    query += ' AND created_at <= ?';
    countQuery += ' AND created_at <= ?';
    params.push(options.endTime);
  }

  // Get total count
  const countStmt = db.prepare(countQuery);
  const countRow = countStmt.get(...params) as { count: number };

  // Add order and pagination
  query += ' ORDER BY created_at DESC';

  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  query += ' LIMIT ? OFFSET ?';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params, limit, offset) as TradeLedgerRow[];

  return {
    entries: rows.map(rowToTradeLedgerEntry),
    total: countRow.count,
  };
}

export function getLedgerStats(walletAddress: string, startTime?: number): {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgTradeSize: number;
  bySource: Record<DecisionSource, number>;
  byAction: Record<string, number>;
} {
  const db = getDatabase();

  let query = `
    SELECT
      COUNT(*) as total_trades,
      SUM(amount * price) as total_volume,
      SUM(fees) as total_fees,
      SUM(CASE WHEN pnl IS NOT NULL THEN pnl ELSE 0 END) as total_pnl,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as win_count,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as loss_count,
      AVG(amount * price) as avg_trade_size
    FROM trade_ledger
    WHERE wallet_address = ?
  `;
  const params: unknown[] = [walletAddress];

  if (startTime) {
    query += ' AND created_at >= ?';
    params.push(startTime);
  }

  const stmt = db.prepare(query);
  const row = stmt.get(...params) as {
    total_trades: number;
    total_volume: number;
    total_fees: number;
    total_pnl: number;
    win_count: number;
    loss_count: number;
    avg_trade_size: number;
  };

  // Get breakdown by source
  let sourceQuery = `
    SELECT decision_source, COUNT(*) as count
    FROM trade_ledger
    WHERE wallet_address = ?
  `;
  if (startTime) sourceQuery += ' AND created_at >= ?';
  sourceQuery += ' GROUP BY decision_source';

  const sourceStmt = db.prepare(sourceQuery);
  const sourceRows = sourceStmt.all(...params) as { decision_source: string; count: number }[];

  const bySource: Record<DecisionSource, number> = {
    manual: 0, ai: 0, signal: 0, copy_trade: 0, automation: 0, limit_order: 0
  };
  for (const r of sourceRows) {
    bySource[r.decision_source as DecisionSource] = r.count;
  }

  // Get breakdown by action
  let actionQuery = `
    SELECT action, COUNT(*) as count
    FROM trade_ledger
    WHERE wallet_address = ?
  `;
  if (startTime) actionQuery += ' AND created_at >= ?';
  actionQuery += ' GROUP BY action';

  const actionStmt = db.prepare(actionQuery);
  const actionRows = actionStmt.all(...params) as { action: string; count: number }[];

  const byAction: Record<string, number> = {};
  for (const r of actionRows) {
    byAction[r.action] = r.count;
  }

  const totalClosed = row.win_count + row.loss_count;

  return {
    totalTrades: row.total_trades || 0,
    totalVolume: row.total_volume || 0,
    totalFees: row.total_fees || 0,
    totalPnl: row.total_pnl || 0,
    winCount: row.win_count || 0,
    lossCount: row.loss_count || 0,
    winRate: totalClosed > 0 ? (row.win_count / totalClosed) * 100 : 0,
    avgTradeSize: row.avg_trade_size || 0,
    bySource,
    byAction,
  };
}

export function getRecentDecisions(
  walletAddress: string,
  limit: number = 20
): TradeLedgerEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM trade_ledger
    WHERE wallet_address = ? AND reasoning IS NOT NULL
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(walletAddress, limit) as TradeLedgerRow[];
  return rows.map(rowToTradeLedgerEntry);
}

export function getEntriesByPositionId(positionId: string): TradeLedgerEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM trade_ledger
    WHERE position_id = ?
    ORDER BY created_at ASC
  `);
  const rows = stmt.all(positionId) as TradeLedgerRow[];
  return rows.map(rowToTradeLedgerEntry);
}

export function getConfidenceCalibration(walletAddress: string): {
  ranges: { min: number; max: number; count: number; winRate: number }[];
  avgConfidence: number;
  calibrationScore: number;
} {
  const db = getDatabase();

  // Get all entries with confidence and PnL
  const stmt = db.prepare(`
    SELECT confidence, pnl
    FROM trade_ledger
    WHERE wallet_address = ? AND confidence IS NOT NULL AND pnl IS NOT NULL
  `);
  const rows = stmt.all(walletAddress) as { confidence: number; pnl: number }[];

  // Bucket into ranges
  const ranges = [
    { min: 0, max: 20, count: 0, wins: 0 },
    { min: 20, max: 40, count: 0, wins: 0 },
    { min: 40, max: 60, count: 0, wins: 0 },
    { min: 60, max: 80, count: 0, wins: 0 },
    { min: 80, max: 100, count: 0, wins: 0 },
  ];

  let totalConfidence = 0;
  let calibrationError = 0;

  for (const row of rows) {
    totalConfidence += row.confidence;
    const isWin = row.pnl > 0;

    for (const range of ranges) {
      if (row.confidence >= range.min && row.confidence < range.max) {
        range.count++;
        if (isWin) range.wins++;
        break;
      }
    }
  }

  const rangeResults = ranges.map(r => ({
    min: r.min,
    max: r.max,
    count: r.count,
    winRate: r.count > 0 ? (r.wins / r.count) * 100 : 0,
  }));

  // Calculate calibration score (how well confidence matches actual outcomes)
  for (const r of rangeResults) {
    if (r.count > 0) {
      const expectedWinRate = (r.min + r.max) / 2;
      calibrationError += Math.abs(r.winRate - expectedWinRate) * r.count;
    }
  }

  const avgConfidence = rows.length > 0 ? totalConfidence / rows.length : 0;
  const calibrationScore = rows.length > 0 ? 100 - (calibrationError / rows.length) : 0;

  return {
    ranges: rangeResults,
    avgConfidence,
    calibrationScore: Math.max(0, calibrationScore),
  };
}
