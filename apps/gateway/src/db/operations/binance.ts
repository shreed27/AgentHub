/**
 * Database Operations for Binance Futures Integration
 * Note: Uses the existing futures_positions and futures_orders tables
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types - reusing futures tables with exchange='binance'
export interface BinancePosition {
  id: string;
  userWallet: string;
  symbol: string;
  side: 'long' | 'short';
  leverage: number;
  size: number;
  entryPrice: number;
  markPrice?: number;
  liquidationPrice?: number;
  unrealizedPnl: number;
  realizedPnl: number;
  margin: number;
  marginType: 'isolated' | 'cross';
  stopLoss?: number;
  takeProfit?: number;
  status: 'open' | 'closed' | 'liquidated';
  openedAt: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface BinanceOrder {
  id: string;
  userWallet: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  leverage: number;
  reduceOnly: boolean;
  timeInForce: string;
  status: string;
  filledQuantity: number;
  avgFillPrice?: number;
  exchangeOrderId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  exchange: string;
  symbol: string;
  side: string;
  leverage: number;
  size: number;
  entry_price: number;
  mark_price: number | null;
  liquidation_price: number | null;
  unrealized_pnl: number;
  realized_pnl: number;
  margin: number;
  margin_type: string;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  opened_at: number;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  user_wallet: string;
  exchange: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  leverage: number;
  reduce_only: number;
  time_in_force: string;
  status: string;
  filled_quantity: number;
  avg_fill_price: number | null;
  exchange_order_id: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToPosition(row: PositionRow): BinancePosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    symbol: row.symbol,
    side: row.side as 'long' | 'short',
    leverage: row.leverage,
    size: row.size,
    entryPrice: row.entry_price,
    markPrice: row.mark_price || undefined,
    liquidationPrice: row.liquidation_price || undefined,
    unrealizedPnl: row.unrealized_pnl,
    realizedPnl: row.realized_pnl,
    margin: row.margin,
    marginType: row.margin_type as 'isolated' | 'cross',
    stopLoss: row.stop_loss || undefined,
    takeProfit: row.take_profit || undefined,
    status: row.status as BinancePosition['status'],
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOrder(row: OrderRow): BinanceOrder {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    symbol: row.symbol,
    side: row.side as 'buy' | 'sell',
    orderType: row.order_type,
    quantity: row.quantity,
    price: row.price || undefined,
    stopPrice: row.stop_price || undefined,
    leverage: row.leverage,
    reduceOnly: row.reduce_only === 1,
    timeInForce: row.time_in_force,
    status: row.status,
    filledQuantity: row.filled_quantity,
    avgFillPrice: row.avg_fill_price || undefined,
    exchangeOrderId: row.exchange_order_id || undefined,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Position Operations
export function createPosition(data: Omit<BinancePosition, 'id' | 'createdAt' | 'updatedAt'>): BinancePosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO futures_positions (
      id, user_wallet, exchange, symbol, side, leverage, size, entry_price, mark_price,
      liquidation_price, unrealized_pnl, realized_pnl, margin, margin_type, stop_loss, take_profit,
      status, opened_at, closed_at, created_at, updated_at
    ) VALUES (?, ?, 'binance', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.symbol, data.side, data.leverage, data.size, data.entryPrice,
    data.markPrice || null, data.liquidationPrice || null, data.unrealizedPnl || 0,
    data.realizedPnl || 0, data.margin, data.marginType || 'isolated',
    data.stopLoss || null, data.takeProfit || null, data.status, data.openedAt,
    data.closedAt || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; symbol?: string }): BinancePosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM futures_positions WHERE user_wallet = ? AND exchange = ?';
  const params: unknown[] = [userWallet, 'binance'];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.symbol) {
    query += ' AND symbol = ?';
    params.push(filters.symbol);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): BinancePosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM futures_positions WHERE id = ? AND exchange = ?');
  const row = stmt.get(id, 'binance') as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<BinancePosition>): BinancePosition | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.markPrice !== undefined) { fields.push('mark_price = ?'); params.push(updates.markPrice); }
  if (updates.liquidationPrice !== undefined) { fields.push('liquidation_price = ?'); params.push(updates.liquidationPrice); }
  if (updates.unrealizedPnl !== undefined) { fields.push('unrealized_pnl = ?'); params.push(updates.unrealizedPnl); }
  if (updates.realizedPnl !== undefined) { fields.push('realized_pnl = ?'); params.push(updates.realizedPnl); }
  if (updates.stopLoss !== undefined) { fields.push('stop_loss = ?'); params.push(updates.stopLoss); }
  if (updates.takeProfit !== undefined) { fields.push('take_profit = ?'); params.push(updates.takeProfit); }
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.closedAt !== undefined) { fields.push('closed_at = ?'); params.push(updates.closedAt); }

  if (fields.length === 0) return getPositionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE futures_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getPositionById(id);
}

export function closePosition(id: string): BinancePosition | null {
  return updatePosition(id, { status: 'closed', closedAt: Date.now() });
}

// Order Operations
export function createOrder(data: Omit<BinanceOrder, 'id' | 'createdAt' | 'updatedAt'>): BinanceOrder {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO futures_orders (
      id, user_wallet, exchange, symbol, side, order_type, quantity, price, stop_price, leverage,
      reduce_only, time_in_force, status, filled_quantity, avg_fill_price, exchange_order_id, error,
      created_at, updated_at
    ) VALUES (?, ?, 'binance', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.symbol, data.side, data.orderType, data.quantity,
    data.price || null, data.stopPrice || null, data.leverage || 10, data.reduceOnly ? 1 : 0,
    data.timeInForce || 'GTC', data.status, data.filledQuantity || 0,
    data.avgFillPrice || null, data.exchangeOrderId || null, data.error || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getOrdersByWallet(userWallet: string, filters?: { status?: string; symbol?: string }): BinanceOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM futures_orders WHERE user_wallet = ? AND exchange = ?';
  const params: unknown[] = [userWallet, 'binance'];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.symbol) {
    query += ' AND symbol = ?';
    params.push(filters.symbol);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as OrderRow[];
  return rows.map(rowToOrder);
}

export function getOrderById(id: string): BinanceOrder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM futures_orders WHERE id = ? AND exchange = ?');
  const row = stmt.get(id, 'binance') as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function updateOrder(id: string, updates: Partial<BinanceOrder>): BinanceOrder | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.filledQuantity !== undefined) { fields.push('filled_quantity = ?'); params.push(updates.filledQuantity); }
  if (updates.avgFillPrice !== undefined) { fields.push('avg_fill_price = ?'); params.push(updates.avgFillPrice); }
  if (updates.exchangeOrderId !== undefined) { fields.push('exchange_order_id = ?'); params.push(updates.exchangeOrderId); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }

  if (fields.length === 0) return getOrderById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE futures_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getOrderById(id);
}

export function cancelOrder(id: string): BinanceOrder | null {
  return updateOrder(id, { status: 'cancelled' });
}

// Stats
export function getAccountStats(userWallet: string): {
  openPositions: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalMarginUsed: number;
  openOrders: number;
} {
  const db = getDatabase();

  const posStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(unrealized_pnl) as upnl, SUM(realized_pnl) as rpnl, SUM(margin) as margin
    FROM futures_positions WHERE user_wallet = ? AND exchange = 'binance' AND status = 'open'
  `);
  const posRow = posStmt.get(userWallet) as { count: number; upnl: number | null; rpnl: number | null; margin: number | null };

  const ordStmt = db.prepare(`
    SELECT COUNT(*) as count FROM futures_orders WHERE user_wallet = ? AND exchange = 'binance' AND status IN ('pending', 'open', 'partially_filled')
  `);
  const ordRow = ordStmt.get(userWallet) as { count: number };

  return {
    openPositions: posRow.count,
    totalUnrealizedPnl: posRow.upnl || 0,
    totalRealizedPnl: posRow.rpnl || 0,
    totalMarginUsed: posRow.margin || 0,
    openOrders: ordRow.count,
  };
}
