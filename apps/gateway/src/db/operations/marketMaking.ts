/**
 * Database Operations for Market Making Strategies
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface MarketMakingStrategy {
  id: string;
  userWallet: string;
  name: string;
  exchange: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  spread: number;
  minSpread: number;
  maxSpread: number;
  orderSize: number;
  maxInventory: number;
  inventorySkew: number;
  rebalanceThreshold: number;
  refreshInterval: number;
  status: 'active' | 'paused' | 'stopped';
  config: Record<string, unknown>;
  currentInventory: number;
  totalPnl: number;
  totalVolume: number;
  totalTrades: number;
  lastRefresh?: number;
  startedAt?: number;
  stoppedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketMakingOrder {
  id: string;
  strategyId: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  filledSize: number;
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  exchangeOrderId?: string;
  createdAt: number;
  updatedAt: number;
}

interface StrategyRow {
  id: string;
  user_wallet: string;
  name: string;
  exchange: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  spread: number;
  min_spread: number;
  max_spread: number;
  order_size: number;
  max_inventory: number;
  inventory_skew: number;
  rebalance_threshold: number;
  refresh_interval: number;
  status: string;
  config: string;
  current_inventory: number;
  total_pnl: number;
  total_volume: number;
  total_trades: number;
  last_refresh: number | null;
  started_at: number | null;
  stopped_at: number | null;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  strategy_id: string;
  side: string;
  price: number;
  size: number;
  filled_size: number;
  status: string;
  exchange_order_id: string | null;
  created_at: number;
  updated_at: number;
}

function rowToStrategy(row: StrategyRow): MarketMakingStrategy {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    name: row.name,
    exchange: row.exchange,
    symbol: row.symbol,
    baseAsset: row.base_asset,
    quoteAsset: row.quote_asset,
    spread: row.spread,
    minSpread: row.min_spread,
    maxSpread: row.max_spread,
    orderSize: row.order_size,
    maxInventory: row.max_inventory,
    inventorySkew: row.inventory_skew,
    rebalanceThreshold: row.rebalance_threshold,
    refreshInterval: row.refresh_interval,
    status: row.status as MarketMakingStrategy['status'],
    config: JSON.parse(row.config || '{}'),
    currentInventory: row.current_inventory,
    totalPnl: row.total_pnl,
    totalVolume: row.total_volume,
    totalTrades: row.total_trades,
    lastRefresh: row.last_refresh || undefined,
    startedAt: row.started_at || undefined,
    stoppedAt: row.stopped_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOrder(row: OrderRow): MarketMakingOrder {
  return {
    id: row.id,
    strategyId: row.strategy_id,
    side: row.side as 'buy' | 'sell',
    price: row.price,
    size: row.size,
    filledSize: row.filled_size,
    status: row.status as MarketMakingOrder['status'],
    exchangeOrderId: row.exchange_order_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Strategy Operations
export function createStrategy(data: Omit<MarketMakingStrategy, 'id' | 'createdAt' | 'updatedAt'>): MarketMakingStrategy {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO market_making_strategies (
      id, user_wallet, name, exchange, symbol, base_asset, quote_asset, spread, min_spread, max_spread,
      order_size, max_inventory, inventory_skew, rebalance_threshold, refresh_interval, status, config,
      current_inventory, total_pnl, total_volume, total_trades, last_refresh, started_at, stopped_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.name, data.exchange, data.symbol, data.baseAsset, data.quoteAsset,
    data.spread, data.minSpread || 0.001, data.maxSpread || 0.05, data.orderSize, data.maxInventory,
    data.inventorySkew || 0, data.rebalanceThreshold || 0.1, data.refreshInterval || 5000,
    data.status || 'paused', JSON.stringify(data.config || {}), data.currentInventory || 0,
    data.totalPnl || 0, data.totalVolume || 0, data.totalTrades || 0, data.lastRefresh || null,
    data.startedAt || null, data.stoppedAt || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getStrategiesByWallet(userWallet: string, filters?: { status?: string; exchange?: string }): MarketMakingStrategy[] {
  const db = getDatabase();
  let query = 'SELECT * FROM market_making_strategies WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.exchange) {
    query += ' AND exchange = ?';
    params.push(filters.exchange);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as StrategyRow[];
  return rows.map(rowToStrategy);
}

export function getStrategyById(id: string): MarketMakingStrategy | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM market_making_strategies WHERE id = ?');
  const row = stmt.get(id) as StrategyRow | undefined;
  return row ? rowToStrategy(row) : null;
}

export function updateStrategy(id: string, updates: Partial<MarketMakingStrategy>): MarketMakingStrategy | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.spread !== undefined) { fields.push('spread = ?'); params.push(updates.spread); }
  if (updates.minSpread !== undefined) { fields.push('min_spread = ?'); params.push(updates.minSpread); }
  if (updates.maxSpread !== undefined) { fields.push('max_spread = ?'); params.push(updates.maxSpread); }
  if (updates.orderSize !== undefined) { fields.push('order_size = ?'); params.push(updates.orderSize); }
  if (updates.maxInventory !== undefined) { fields.push('max_inventory = ?'); params.push(updates.maxInventory); }
  if (updates.inventorySkew !== undefined) { fields.push('inventory_skew = ?'); params.push(updates.inventorySkew); }
  if (updates.rebalanceThreshold !== undefined) { fields.push('rebalance_threshold = ?'); params.push(updates.rebalanceThreshold); }
  if (updates.refreshInterval !== undefined) { fields.push('refresh_interval = ?'); params.push(updates.refreshInterval); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(updates.config)); }
  if (updates.currentInventory !== undefined) { fields.push('current_inventory = ?'); params.push(updates.currentInventory); }
  if (updates.totalPnl !== undefined) { fields.push('total_pnl = ?'); params.push(updates.totalPnl); }
  if (updates.totalVolume !== undefined) { fields.push('total_volume = ?'); params.push(updates.totalVolume); }
  if (updates.totalTrades !== undefined) { fields.push('total_trades = ?'); params.push(updates.totalTrades); }
  if (updates.lastRefresh !== undefined) { fields.push('last_refresh = ?'); params.push(updates.lastRefresh); }
  if (updates.startedAt !== undefined) { fields.push('started_at = ?'); params.push(updates.startedAt); }
  if (updates.stoppedAt !== undefined) { fields.push('stopped_at = ?'); params.push(updates.stoppedAt); }

  if (fields.length === 0) return getStrategyById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE market_making_strategies SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getStrategyById(id);
}

export function startStrategy(id: string): MarketMakingStrategy | null {
  return updateStrategy(id, { status: 'active', startedAt: Date.now(), stoppedAt: undefined });
}

export function stopStrategy(id: string): MarketMakingStrategy | null {
  return updateStrategy(id, { status: 'stopped', stoppedAt: Date.now() });
}

export function pauseStrategy(id: string): MarketMakingStrategy | null {
  return updateStrategy(id, { status: 'paused' });
}

export function deleteStrategy(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM market_making_strategies WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Order Operations
export function createMmOrder(data: Omit<MarketMakingOrder, 'id' | 'createdAt' | 'updatedAt'>): MarketMakingOrder {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO mm_orders (
      id, strategy_id, side, price, size, filled_size, status, exchange_order_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.strategyId, data.side, data.price, data.size, data.filledSize || 0, data.status, data.exchangeOrderId || null, now, now);

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getOrdersByStrategy(strategyId: string, filters?: { status?: string }): MarketMakingOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM mm_orders WHERE strategy_id = ?';
  const params: unknown[] = [strategyId];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as OrderRow[];
  return rows.map(rowToOrder);
}

export function updateMmOrder(id: string, updates: Partial<MarketMakingOrder>): MarketMakingOrder | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.filledSize !== undefined) { fields.push('filled_size = ?'); params.push(updates.filledSize); }
  if (updates.exchangeOrderId !== undefined) { fields.push('exchange_order_id = ?'); params.push(updates.exchangeOrderId); }

  if (fields.length === 0) return null;

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE mm_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  const row = db.prepare('SELECT * FROM mm_orders WHERE id = ?').get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

// Stats
export function getStrategyStats(id: string): {
  strategy: MarketMakingStrategy | null;
  openOrders: number;
  filledOrders: number;
  avgSpread: number;
  inventoryValue: number;
} {
  const strategy = getStrategyById(id);
  if (!strategy) {
    return { strategy: null, openOrders: 0, filledOrders: 0, avgSpread: 0, inventoryValue: 0 };
  }

  const db = getDatabase();
  const openStmt = db.prepare('SELECT COUNT(*) as count FROM mm_orders WHERE strategy_id = ? AND status = ?');
  const openRow = openStmt.get(id, 'open') as { count: number };

  const filledStmt = db.prepare('SELECT COUNT(*) as count FROM mm_orders WHERE strategy_id = ? AND status = ?');
  const filledRow = filledStmt.get(id, 'filled') as { count: number };

  return {
    strategy,
    openOrders: openRow.count,
    filledOrders: filledRow.count,
    avgSpread: strategy.spread,
    inventoryValue: strategy.currentInventory,
  };
}

export function getWalletStats(userWallet: string): {
  totalStrategies: number;
  activeStrategies: number;
  totalPnl: number;
  totalVolume: number;
} {
  const db = getDatabase();

  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM market_making_strategies WHERE user_wallet = ?');
  const totalRow = totalStmt.get(userWallet) as { count: number };

  const activeStmt = db.prepare('SELECT COUNT(*) as count FROM market_making_strategies WHERE user_wallet = ? AND status = ?');
  const activeRow = activeStmt.get(userWallet, 'active') as { count: number };

  const pnlStmt = db.prepare('SELECT SUM(total_pnl) as pnl, SUM(total_volume) as volume FROM market_making_strategies WHERE user_wallet = ?');
  const pnlRow = pnlStmt.get(userWallet) as { pnl: number | null; volume: number | null };

  return {
    totalStrategies: totalRow.count,
    activeStrategies: activeRow.count,
    totalPnl: pnlRow.pnl || 0,
    totalVolume: pnlRow.volume || 0,
  };
}
