/**
 * Database Operations for Hyperliquid Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface HyperliquidPosition {
  id: string;
  userWallet: string;
  coin: string;
  side: 'long' | 'short';
  sizeCoins: number;
  entryPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  returnOnEquity: number;
  liquidationPrice?: number;
  marginUsed?: number;
  maxLeverage?: number;
  status: 'open' | 'closed';
  createdAt: number;
  updatedAt: number;
}

export interface HyperliquidOrder {
  id: string;
  userWallet: string;
  oid: string;
  coin: string;
  side: 'buy' | 'sell';
  orderType: string;
  size: number;
  limitPrice?: number;
  triggerPrice?: number;
  reduceOnly: boolean;
  status: string;
  filledSize: number;
  avgFillPrice?: number;
  createdAt: number;
  updatedAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  coin: string;
  side: string;
  size_coins: number;
  entry_price: number;
  position_value: number;
  unrealized_pnl: number;
  return_on_equity: number;
  liquidation_price: number | null;
  margin_used: number | null;
  max_leverage: number | null;
  status: string;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  user_wallet: string;
  oid: string;
  coin: string;
  side: string;
  order_type: string;
  size: number;
  limit_price: number | null;
  trigger_price: number | null;
  reduce_only: number;
  status: string;
  filled_size: number;
  avg_fill_price: number | null;
  created_at: number;
  updated_at: number;
}

function rowToPosition(row: PositionRow): HyperliquidPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    coin: row.coin,
    side: row.side as 'long' | 'short',
    sizeCoins: row.size_coins,
    entryPrice: row.entry_price,
    positionValue: row.position_value,
    unrealizedPnl: row.unrealized_pnl,
    returnOnEquity: row.return_on_equity,
    liquidationPrice: row.liquidation_price || undefined,
    marginUsed: row.margin_used || undefined,
    maxLeverage: row.max_leverage || undefined,
    status: row.status as 'open' | 'closed',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOrder(row: OrderRow): HyperliquidOrder {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    oid: row.oid,
    coin: row.coin,
    side: row.side as 'buy' | 'sell',
    orderType: row.order_type,
    size: row.size,
    limitPrice: row.limit_price || undefined,
    triggerPrice: row.trigger_price || undefined,
    reduceOnly: row.reduce_only === 1,
    status: row.status,
    filledSize: row.filled_size,
    avgFillPrice: row.avg_fill_price || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Position Operations
export function createPosition(data: Omit<HyperliquidPosition, 'id' | 'createdAt' | 'updatedAt'>): HyperliquidPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO hyperliquid_positions (
      id, user_wallet, coin, side, size_coins, entry_price, position_value, unrealized_pnl,
      return_on_equity, liquidation_price, margin_used, max_leverage, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.coin, data.side, data.sizeCoins, data.entryPrice,
    data.positionValue, data.unrealizedPnl || 0, data.returnOnEquity || 0,
    data.liquidationPrice || null, data.marginUsed || null, data.maxLeverage || null,
    data.status, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; coin?: string }): HyperliquidPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM hyperliquid_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.coin) {
    query += ' AND coin = ?';
    params.push(filters.coin);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): HyperliquidPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM hyperliquid_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<HyperliquidPosition>): HyperliquidPosition | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.positionValue !== undefined) { fields.push('position_value = ?'); params.push(updates.positionValue); }
  if (updates.unrealizedPnl !== undefined) { fields.push('unrealized_pnl = ?'); params.push(updates.unrealizedPnl); }
  if (updates.returnOnEquity !== undefined) { fields.push('return_on_equity = ?'); params.push(updates.returnOnEquity); }
  if (updates.liquidationPrice !== undefined) { fields.push('liquidation_price = ?'); params.push(updates.liquidationPrice); }
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return getPositionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE hyperliquid_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getPositionById(id);
}

export function closePosition(id: string): HyperliquidPosition | null {
  return updatePosition(id, { status: 'closed' });
}

// Order Operations
export function createOrder(data: Omit<HyperliquidOrder, 'id' | 'createdAt' | 'updatedAt'>): HyperliquidOrder {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO hyperliquid_orders (
      id, user_wallet, oid, coin, side, order_type, size, limit_price, trigger_price,
      reduce_only, status, filled_size, avg_fill_price, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.oid, data.coin, data.side, data.orderType, data.size,
    data.limitPrice || null, data.triggerPrice || null, data.reduceOnly ? 1 : 0,
    data.status, data.filledSize || 0, data.avgFillPrice || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getOrdersByWallet(userWallet: string, filters?: { status?: string; coin?: string }): HyperliquidOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM hyperliquid_orders WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.coin) {
    query += ' AND coin = ?';
    params.push(filters.coin);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as OrderRow[];
  return rows.map(rowToOrder);
}

export function getOrderById(id: string): HyperliquidOrder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM hyperliquid_orders WHERE id = ?');
  const row = stmt.get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function updateOrder(id: string, updates: Partial<HyperliquidOrder>): HyperliquidOrder | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.filledSize !== undefined) { fields.push('filled_size = ?'); params.push(updates.filledSize); }
  if (updates.avgFillPrice !== undefined) { fields.push('avg_fill_price = ?'); params.push(updates.avgFillPrice); }

  if (fields.length === 0) return getOrderById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE hyperliquid_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getOrderById(id);
}

export function cancelOrder(id: string): HyperliquidOrder | null {
  return updateOrder(id, { status: 'cancelled' });
}

// Stats
export function getAccountStats(userWallet: string): {
  openPositions: number;
  totalUnrealizedPnl: number;
  totalPositionValue: number;
  openOrders: number;
  avgReturnOnEquity: number;
} {
  const db = getDatabase();

  const posStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(unrealized_pnl) as upnl, SUM(position_value) as value, AVG(return_on_equity) as roe
    FROM hyperliquid_positions WHERE user_wallet = ? AND status = 'open'
  `);
  const posRow = posStmt.get(userWallet) as { count: number; upnl: number | null; value: number | null; roe: number | null };

  const ordStmt = db.prepare(`
    SELECT COUNT(*) as count FROM hyperliquid_orders WHERE user_wallet = ? AND status = 'open'
  `);
  const ordRow = ordStmt.get(userWallet) as { count: number };

  return {
    openPositions: posRow.count,
    totalUnrealizedPnl: posRow.upnl || 0,
    totalPositionValue: posRow.value || 0,
    openOrders: ordRow.count,
    avgReturnOnEquity: posRow.roe || 0,
  };
}
