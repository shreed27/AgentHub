/**
 * Database Operations for Bybit Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface BybitPosition {
  id: string;
  userWallet: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  entryPrice: number;
  markPrice?: number;
  unrealisedPnl: number;
  realisedPnl: number;
  leverage: number;
  positionMargin?: number;
  liqPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  trailingStop?: number;
  positionIdx: number;
  status: 'open' | 'closed';
  createdAt: number;
  updatedAt: number;
}

export interface BybitOrder {
  id: string;
  userWallet: string;
  orderId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: string;
  qty: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce: string;
  reduceOnly: boolean;
  closeOnTrigger: boolean;
  status: string;
  cumExecQty: number;
  cumExecValue: number;
  avgPrice?: number;
  createdAt: number;
  updatedAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  mark_price: number | null;
  unrealised_pnl: number;
  realised_pnl: number;
  leverage: number;
  position_margin: number | null;
  liq_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  trailing_stop: number | null;
  position_idx: number;
  status: string;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  user_wallet: string;
  order_id: string;
  symbol: string;
  side: string;
  order_type: string;
  qty: number;
  price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  time_in_force: string;
  reduce_only: number;
  close_on_trigger: number;
  status: string;
  cum_exec_qty: number;
  cum_exec_value: number;
  avg_price: number | null;
  created_at: number;
  updated_at: number;
}

function rowToPosition(row: PositionRow): BybitPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    symbol: row.symbol,
    side: row.side as 'Buy' | 'Sell',
    size: row.size,
    entryPrice: row.entry_price,
    markPrice: row.mark_price || undefined,
    unrealisedPnl: row.unrealised_pnl,
    realisedPnl: row.realised_pnl,
    leverage: row.leverage,
    positionMargin: row.position_margin || undefined,
    liqPrice: row.liq_price || undefined,
    takeProfit: row.take_profit || undefined,
    stopLoss: row.stop_loss || undefined,
    trailingStop: row.trailing_stop || undefined,
    positionIdx: row.position_idx,
    status: row.status as 'open' | 'closed',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOrder(row: OrderRow): BybitOrder {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    orderId: row.order_id,
    symbol: row.symbol,
    side: row.side as 'Buy' | 'Sell',
    orderType: row.order_type,
    qty: row.qty,
    price: row.price || undefined,
    stopLoss: row.stop_loss || undefined,
    takeProfit: row.take_profit || undefined,
    timeInForce: row.time_in_force,
    reduceOnly: row.reduce_only === 1,
    closeOnTrigger: row.close_on_trigger === 1,
    status: row.status,
    cumExecQty: row.cum_exec_qty,
    cumExecValue: row.cum_exec_value,
    avgPrice: row.avg_price || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Position Operations
export function createPosition(data: Omit<BybitPosition, 'id' | 'createdAt' | 'updatedAt'>): BybitPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO bybit_positions (
      id, user_wallet, symbol, side, size, entry_price, mark_price, unrealised_pnl, realised_pnl,
      leverage, position_margin, liq_price, take_profit, stop_loss, trailing_stop, position_idx,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.symbol, data.side, data.size, data.entryPrice,
    data.markPrice || null, data.unrealisedPnl || 0, data.realisedPnl || 0, data.leverage,
    data.positionMargin || null, data.liqPrice || null, data.takeProfit || null,
    data.stopLoss || null, data.trailingStop || null, data.positionIdx || 0,
    data.status, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; symbol?: string }): BybitPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM bybit_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

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

export function getPositionById(id: string): BybitPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bybit_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<BybitPosition>): BybitPosition | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.markPrice !== undefined) { fields.push('mark_price = ?'); params.push(updates.markPrice); }
  if (updates.unrealisedPnl !== undefined) { fields.push('unrealised_pnl = ?'); params.push(updates.unrealisedPnl); }
  if (updates.realisedPnl !== undefined) { fields.push('realised_pnl = ?'); params.push(updates.realisedPnl); }
  if (updates.liqPrice !== undefined) { fields.push('liq_price = ?'); params.push(updates.liqPrice); }
  if (updates.takeProfit !== undefined) { fields.push('take_profit = ?'); params.push(updates.takeProfit); }
  if (updates.stopLoss !== undefined) { fields.push('stop_loss = ?'); params.push(updates.stopLoss); }
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return getPositionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE bybit_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getPositionById(id);
}

export function closePosition(id: string): BybitPosition | null {
  return updatePosition(id, { status: 'closed' });
}

// Order Operations
export function createOrder(data: Omit<BybitOrder, 'id' | 'createdAt' | 'updatedAt'>): BybitOrder {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO bybit_orders (
      id, user_wallet, order_id, symbol, side, order_type, qty, price, stop_loss, take_profit,
      time_in_force, reduce_only, close_on_trigger, status, cum_exec_qty, cum_exec_value,
      avg_price, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.orderId, data.symbol, data.side, data.orderType, data.qty,
    data.price || null, data.stopLoss || null, data.takeProfit || null, data.timeInForce || 'GTC',
    data.reduceOnly ? 1 : 0, data.closeOnTrigger ? 1 : 0, data.status,
    data.cumExecQty || 0, data.cumExecValue || 0, data.avgPrice || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getOrdersByWallet(userWallet: string, filters?: { status?: string; symbol?: string }): BybitOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM bybit_orders WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

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

export function getOrderById(id: string): BybitOrder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bybit_orders WHERE id = ?');
  const row = stmt.get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function updateOrder(id: string, updates: Partial<BybitOrder>): BybitOrder | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.cumExecQty !== undefined) { fields.push('cum_exec_qty = ?'); params.push(updates.cumExecQty); }
  if (updates.cumExecValue !== undefined) { fields.push('cum_exec_value = ?'); params.push(updates.cumExecValue); }
  if (updates.avgPrice !== undefined) { fields.push('avg_price = ?'); params.push(updates.avgPrice); }

  if (fields.length === 0) return getOrderById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE bybit_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getOrderById(id);
}

export function cancelOrder(id: string): BybitOrder | null {
  return updateOrder(id, { status: 'Cancelled' });
}

// Stats
export function getAccountStats(userWallet: string): {
  openPositions: number;
  totalUnrealisedPnl: number;
  totalRealisedPnl: number;
  openOrders: number;
} {
  const db = getDatabase();

  const posStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(unrealised_pnl) as upnl, SUM(realised_pnl) as rpnl
    FROM bybit_positions WHERE user_wallet = ? AND status = 'open'
  `);
  const posRow = posStmt.get(userWallet) as { count: number; upnl: number | null; rpnl: number | null };

  const ordStmt = db.prepare(`
    SELECT COUNT(*) as count FROM bybit_orders WHERE user_wallet = ? AND status IN ('New', 'PartiallyFilled')
  `);
  const ordRow = ordStmt.get(userWallet) as { count: number };

  return {
    openPositions: posRow.count,
    totalUnrealisedPnl: posRow.upnl || 0,
    totalRealisedPnl: posRow.rpnl || 0,
    openOrders: ordRow.count,
  };
}
