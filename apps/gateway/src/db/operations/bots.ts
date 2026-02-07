/**
 * Database Operations for Trading Bots
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface TradingBot {
  id: string;
  userWallet: string;
  name: string;
  strategyType: string;
  exchange: string;
  symbol: string;
  config: Record<string, unknown>;
  status: 'running' | 'paused' | 'stopped' | 'error';
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastTradeAt?: number;
  startedAt?: number;
  stoppedAt?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BotTrade {
  id: string;
  botId: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  price: number;
  size: number;
  fee: number;
  pnl: number;
  signal?: string;
  metadata?: Record<string, unknown>;
  executedAt: number;
  createdAt: number;
}

interface BotRow {
  id: string;
  user_wallet: string;
  name: string;
  strategy_type: string;
  exchange: string;
  symbol: string;
  config: string;
  status: string;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  max_drawdown: number;
  sharpe_ratio: number;
  last_trade_at: number | null;
  started_at: number | null;
  stopped_at: number | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface TradeRow {
  id: string;
  bot_id: string;
  side: string;
  order_type: string;
  price: number;
  size: number;
  fee: number;
  pnl: number;
  signal: string | null;
  metadata: string | null;
  executed_at: number;
  created_at: number;
}

function rowToBot(row: BotRow): TradingBot {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    name: row.name,
    strategyType: row.strategy_type,
    exchange: row.exchange,
    symbol: row.symbol,
    config: JSON.parse(row.config || '{}'),
    status: row.status as TradingBot['status'],
    totalPnl: row.total_pnl,
    totalTrades: row.total_trades,
    winRate: row.win_rate,
    maxDrawdown: row.max_drawdown,
    sharpeRatio: row.sharpe_ratio,
    lastTradeAt: row.last_trade_at || undefined,
    startedAt: row.started_at || undefined,
    stoppedAt: row.stopped_at || undefined,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTrade(row: TradeRow): BotTrade {
  return {
    id: row.id,
    botId: row.bot_id,
    side: row.side as 'buy' | 'sell',
    orderType: row.order_type as 'market' | 'limit',
    price: row.price,
    size: row.size,
    fee: row.fee,
    pnl: row.pnl,
    signal: row.signal || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    executedAt: row.executed_at,
    createdAt: row.created_at,
  };
}

// Bot Operations
export function createBot(data: Omit<TradingBot, 'id' | 'createdAt' | 'updatedAt'>): TradingBot {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO trading_bots (
      id, user_wallet, name, strategy_type, exchange, symbol, config, status,
      total_pnl, total_trades, win_rate, max_drawdown, sharpe_ratio, last_trade_at,
      started_at, stopped_at, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.name, data.strategyType, data.exchange, data.symbol,
    JSON.stringify(data.config || {}), data.status || 'stopped', data.totalPnl || 0,
    data.totalTrades || 0, data.winRate || 0, data.maxDrawdown || 0, data.sharpeRatio || 0,
    data.lastTradeAt || null, data.startedAt || null, data.stoppedAt || null, data.error || null,
    now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getBotsByWallet(userWallet: string, filters?: { status?: string; strategyType?: string }): TradingBot[] {
  const db = getDatabase();
  let query = 'SELECT * FROM trading_bots WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.strategyType) {
    query += ' AND strategy_type = ?';
    params.push(filters.strategyType);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as BotRow[];
  return rows.map(rowToBot);
}

export function getBotById(id: string): TradingBot | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM trading_bots WHERE id = ?');
  const row = stmt.get(id) as BotRow | undefined;
  return row ? rowToBot(row) : null;
}

export function updateBot(id: string, updates: Partial<TradingBot>): TradingBot | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(updates.config)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.totalPnl !== undefined) { fields.push('total_pnl = ?'); params.push(updates.totalPnl); }
  if (updates.totalTrades !== undefined) { fields.push('total_trades = ?'); params.push(updates.totalTrades); }
  if (updates.winRate !== undefined) { fields.push('win_rate = ?'); params.push(updates.winRate); }
  if (updates.maxDrawdown !== undefined) { fields.push('max_drawdown = ?'); params.push(updates.maxDrawdown); }
  if (updates.sharpeRatio !== undefined) { fields.push('sharpe_ratio = ?'); params.push(updates.sharpeRatio); }
  if (updates.lastTradeAt !== undefined) { fields.push('last_trade_at = ?'); params.push(updates.lastTradeAt); }
  if (updates.startedAt !== undefined) { fields.push('started_at = ?'); params.push(updates.startedAt); }
  if (updates.stoppedAt !== undefined) { fields.push('stopped_at = ?'); params.push(updates.stoppedAt); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }

  if (fields.length === 0) return getBotById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE trading_bots SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getBotById(id);
}

export function startBot(id: string): TradingBot | null {
  return updateBot(id, { status: 'running', startedAt: Date.now(), stoppedAt: undefined, error: undefined });
}

export function stopBot(id: string): TradingBot | null {
  return updateBot(id, { status: 'stopped', stoppedAt: Date.now() });
}

export function pauseBot(id: string): TradingBot | null {
  return updateBot(id, { status: 'paused' });
}

export function setBotError(id: string, error: string): TradingBot | null {
  return updateBot(id, { status: 'error', error });
}

export function deleteBot(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM trading_bots WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Trade Operations
export function createTrade(data: Omit<BotTrade, 'id' | 'createdAt'>): BotTrade {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO bot_trades (
      id, bot_id, side, order_type, price, size, fee, pnl, signal, metadata, executed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.botId, data.side, data.orderType, data.price, data.size, data.fee,
    data.pnl, data.signal || null, data.metadata ? JSON.stringify(data.metadata) : null,
    data.executedAt, now
  );

  // Update bot stats
  const bot = getBotById(data.botId);
  if (bot) {
    const trades = getTradesByBot(data.botId);
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    updateBot(data.botId, {
      totalTrades: trades.length,
      totalPnl,
      winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
      lastTradeAt: data.executedAt,
    });
  }

  return { id, ...data, createdAt: now };
}

export function getTradesByBot(botId: string, filters?: { limit?: number; offset?: number }): BotTrade[] {
  const db = getDatabase();
  let query = 'SELECT * FROM bot_trades WHERE bot_id = ? ORDER BY executed_at DESC';
  const params: unknown[] = [botId];

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  if (filters?.offset) {
    query += ' OFFSET ?';
    params.push(filters.offset);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as TradeRow[];
  return rows.map(rowToTrade);
}

// Available Strategies
export function getAvailableStrategies(): { type: string; name: string; description: string; parameters: string[] }[] {
  return [
    {
      type: 'grid',
      name: 'Grid Trading',
      description: 'Places buy and sell orders at predefined intervals',
      parameters: ['gridSize', 'gridLevels', 'upperPrice', 'lowerPrice'],
    },
    {
      type: 'dca',
      name: 'Dollar Cost Averaging',
      description: 'Buys fixed amount at regular intervals',
      parameters: ['amount', 'interval', 'maxBuys'],
    },
    {
      type: 'momentum',
      name: 'Momentum Trading',
      description: 'Trades based on price momentum indicators',
      parameters: ['lookbackPeriod', 'threshold', 'stopLoss', 'takeProfit'],
    },
    {
      type: 'mean_reversion',
      name: 'Mean Reversion',
      description: 'Trades when price deviates from moving average',
      parameters: ['maPeriod', 'deviationThreshold', 'stopLoss', 'takeProfit'],
    },
    {
      type: 'breakout',
      name: 'Breakout Strategy',
      description: 'Trades on price breakouts from support/resistance',
      parameters: ['lookbackPeriod', 'confirmationCandles', 'stopLoss', 'takeProfit'],
    },
    {
      type: 'arbitrage',
      name: 'Arbitrage',
      description: 'Exploits price differences across exchanges',
      parameters: ['minSpread', 'exchanges', 'maxSlippage'],
    },
  ];
}

// Performance Metrics
export function getBotPerformance(id: string): {
  bot: TradingBot | null;
  trades: BotTrade[];
  metrics: {
    totalReturn: number;
    avgTradeReturn: number;
    maxWin: number;
    maxLoss: number;
    avgHoldTime: number;
    profitFactor: number;
  };
} {
  const bot = getBotById(id);
  if (!bot) {
    return {
      bot: null,
      trades: [],
      metrics: { totalReturn: 0, avgTradeReturn: 0, maxWin: 0, maxLoss: 0, avgHoldTime: 0, profitFactor: 0 },
    };
  }

  const trades = getTradesByBot(id);
  const profits = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const totalProfit = profits.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  return {
    bot,
    trades,
    metrics: {
      totalReturn: bot.totalPnl,
      avgTradeReturn: trades.length > 0 ? bot.totalPnl / trades.length : 0,
      maxWin: profits.length > 0 ? Math.max(...profits.map(t => t.pnl)) : 0,
      maxLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
      avgHoldTime: 0, // Would need entry/exit timestamps
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    },
  };
}

export function getWalletBotStats(userWallet: string): {
  totalBots: number;
  runningBots: number;
  totalPnl: number;
  totalTrades: number;
  avgWinRate: number;
} {
  const db = getDatabase();

  const botsStmt = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
           SUM(total_pnl) as pnl, SUM(total_trades) as trades, AVG(win_rate) as win_rate
    FROM trading_bots WHERE user_wallet = ?
  `);
  const row = botsStmt.get(userWallet) as {
    total: number;
    running: number;
    pnl: number | null;
    trades: number | null;
    win_rate: number | null;
  };

  return {
    totalBots: row.total,
    runningBots: row.running || 0,
    totalPnl: row.pnl || 0,
    totalTrades: row.trades || 0,
    avgWinRate: row.win_rate || 0,
  };
}
