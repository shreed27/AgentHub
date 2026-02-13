/**
 * Database Seeding Module
 * Seeds demo data for showcase/hackathon demos
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase, stringifyJSON } from './index.js';
import type { Agent, AgentConfig, AgentPerformance } from '../types.js';

interface DemoAgent {
  name: string;
  type: string;
  status: 'active' | 'paused';
  performance: Partial<AgentPerformance>;
}

const demoAgents: DemoAgent[] = [
  {
    name: 'Alpha-1',
    type: 'trading',
    status: 'active',
    performance: {
      totalTrades: 127,
      winRate: 72.4,
      totalPnL: 2847.50,
      dailyPnL: 156.30,
      avgTradeSize: 450,
      avgHoldTime: 3600000, // 1 hour in ms
    },
  },
  {
    name: 'Gamma-Ray',
    type: 'trading',
    status: 'active',
    performance: {
      totalTrades: 89,
      winRate: 85.2,
      totalPnL: 1542.80,
      dailyPnL: 89.20,
      avgTradeSize: 800,
      avgHoldTime: 300000, // 5 minutes
    },
  },
  {
    name: 'Delta-V',
    type: 'trading',
    status: 'paused',
    performance: {
      totalTrades: 56,
      winRate: 58.9,
      totalPnL: -234.60,
      dailyPnL: -45.20,
      avgTradeSize: 300,
      avgHoldTime: 7200000, // 2 hours
    },
  },
];

export function seedDemoAgents(): void {
  const db = getDatabase();

  // Check if agents already exist
  const stmt = db.prepare('SELECT COUNT(*) as count FROM agents');
  const result = stmt.get() as { count: number };

  if (result.count > 0) {
    console.log('[Seed] Agents already exist, skipping seed');
    return;
  }

  console.log('[Seed] Seeding demo agents...');

  const insertStmt = db.prepare(`
    INSERT INTO agents (id, name, type, status, strategy_id, wallet_address, config, performance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const defaultConfig: AgentConfig = {
    maxPositionSize: 1000,
    maxDailyLoss: 100,
    maxOpenPositions: 5,
    allowedMarkets: ['dex', 'prediction_market'],
    allowedChains: ['solana'],
    riskLevel: 'moderate',
    autoExecute: true,
  };

  for (const agent of demoAgents) {
    const id = uuidv4();
    const performance: AgentPerformance = {
      totalTrades: agent.performance.totalTrades || 0,
      winRate: agent.performance.winRate || 0,
      totalPnL: agent.performance.totalPnL || 0,
      dailyPnL: agent.performance.dailyPnL || 0,
      avgTradeSize: agent.performance.avgTradeSize || 0,
      avgHoldTime: agent.performance.avgHoldTime || 0,
    };

    insertStmt.run(
      id,
      agent.name,
      agent.type,
      agent.status,
      null,
      null,
      stringifyJSON(defaultConfig),
      stringifyJSON(performance),
      now,
      now
    );

    console.log(`[Seed] Created agent: ${agent.name} (${id})`);
  }

  console.log(`[Seed] Seeded ${demoAgents.length} demo agents`);
}

export function seedDemoPositions(): void {
  const db = getDatabase();

  // Check if positions already exist
  const stmt = db.prepare('SELECT COUNT(*) as count FROM positions');
  const result = stmt.get() as { count: number };

  if (result.count > 0) {
    console.log('[Seed] Positions already exist, skipping seed');
    return;
  }

  console.log('[Seed] Seeding demo positions...');

  const insertStmt = db.prepare(`
    INSERT INTO positions (id, agent_id, token, token_symbol, chain, side, amount, entry_price, current_price, unrealized_pnl, unrealized_pnl_percent, opened_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const demoPositions = [
    {
      tokenSymbol: 'SOL',
      tokenAddress: 'So11111111111111111111111111111111111111112',
      side: 'long',
      entryPrice: 145.20,
      currentPrice: 152.80,
      amount: 10,
    },
    {
      tokenSymbol: 'JUP',
      tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      side: 'long',
      entryPrice: 0.85,
      currentPrice: 0.92,
      amount: 500,
    },
    {
      tokenSymbol: 'BONK',
      tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      side: 'long',
      entryPrice: 0.000015,
      currentPrice: 0.000018,
      amount: 5000000,
    },
  ];

  // Get first active agent
  const agentStmt = db.prepare('SELECT id FROM agents WHERE status = ? LIMIT 1');
  const agent = agentStmt.get('active') as { id: string } | undefined;
  const agentId = agent?.id || 'demo-agent';

  for (const pos of demoPositions) {
    const id = uuidv4();
    const pnl = (pos.currentPrice - pos.entryPrice) * pos.amount;
    const pnlPercent = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

    insertStmt.run(
      id,
      agentId,
      pos.tokenAddress,
      pos.tokenSymbol,
      'solana',
      pos.side,
      pos.amount,
      pos.entryPrice,
      pos.currentPrice,
      pnl,
      pnlPercent,
      now - 3600000, // Opened 1 hour ago
      now
    );

    console.log(`[Seed] Created position: ${pos.tokenSymbol}`);
  }

  console.log(`[Seed] Seeded ${demoPositions.length} demo positions`);
}

export function runAllSeeds(): void {
  console.log('[Seed] Running all seeds...');
  seedDemoAgents();
  seedDemoPositions();
  console.log('[Seed] All seeds complete');
}
