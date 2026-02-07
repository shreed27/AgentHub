/**
 * Database Operations for Drift Protocol Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface DriftPosition {
  id: string;
  userWallet: string;
  accountPubkey?: string;
  marketIndex: number;
  marketType: 'perp' | 'spot';
  baseAssetAmount: string;
  quoteAssetAmount: string;
  side: 'long' | 'short';
  entryPrice?: number;
  markPrice?: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  liquidationPrice?: number;
  status: 'open' | 'closed' | 'liquidated';
  openedAt: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DriftOrder {
  id: string;
  userWallet: string;
  accountPubkey?: string;
  orderId?: number;
  marketIndex: number;
  marketType: 'perp' | 'spot';
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market' | 'trigger_market' | 'trigger_limit';
  baseAssetAmount: string;
  price?: string;
  triggerPrice?: string;
  reduceOnly: boolean;
  postOnly: boolean;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'expired';
  filledAmount: string;
  avgFillPrice?: number;
  txSignature?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  account_pubkey: string | null;
  market_index: number;
  market_type: string;
  base_asset_amount: string;
  quote_asset_amount: string;
  side: string;
  entry_price: number | null;
  mark_price: number | null;
  unrealized_pnl: number;
  realized_pnl: number;
  leverage: number;
  liquidation_price: number | null;
  status: string;
  opened_at: number;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  user_wallet: string;
  account_pubkey: string | null;
  order_id: number | null;
  market_index: number;
  market_type: string;
  side: string;
  order_type: string;
  base_asset_amount: string;
  price: string | null;
  trigger_price: string | null;
  reduce_only: number;
  post_only: number;
  status: string;
  filled_amount: string;
  avg_fill_price: number | null;
  tx_signature: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToPosition(row: PositionRow): DriftPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    accountPubkey: row.account_pubkey || undefined,
    marketIndex: row.market_index,
    marketType: row.market_type as 'perp' | 'spot',
    baseAssetAmount: row.base_asset_amount,
    quoteAssetAmount: row.quote_asset_amount,
    side: row.side as 'long' | 'short',
    entryPrice: row.entry_price || undefined,
    markPrice: row.mark_price || undefined,
    unrealizedPnl: row.unrealized_pnl,
    realizedPnl: row.realized_pnl,
    leverage: row.leverage,
    liquidationPrice: row.liquidation_price || undefined,
    status: row.status as DriftPosition['status'],
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOrder(row: OrderRow): DriftOrder {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    accountPubkey: row.account_pubkey || undefined,
    orderId: row.order_id || undefined,
    marketIndex: row.market_index,
    marketType: row.market_type as 'perp' | 'spot',
    side: row.side as 'buy' | 'sell',
    orderType: row.order_type as DriftOrder['orderType'],
    baseAssetAmount: row.base_asset_amount,
    price: row.price || undefined,
    triggerPrice: row.trigger_price || undefined,
    reduceOnly: row.reduce_only === 1,
    postOnly: row.post_only === 1,
    status: row.status as DriftOrder['status'],
    filledAmount: row.filled_amount,
    avgFillPrice: row.avg_fill_price || undefined,
    txSignature: row.tx_signature || undefined,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Position Operations
export function createPosition(data: Omit<DriftPosition, 'id' | 'createdAt' | 'updatedAt'>): DriftPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO drift_positions (
      id, user_wallet, account_pubkey, market_index, market_type, base_asset_amount, quote_asset_amount,
      side, entry_price, mark_price, unrealized_pnl, realized_pnl, leverage, liquidation_price,
      status, opened_at, closed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.accountPubkey || null,
    data.marketIndex,
    data.marketType,
    data.baseAssetAmount,
    data.quoteAssetAmount,
    data.side,
    data.entryPrice || null,
    data.markPrice || null,
    data.unrealizedPnl || 0,
    data.realizedPnl || 0,
    data.leverage || 1,
    data.liquidationPrice || null,
    data.status,
    data.openedAt,
    data.closedAt || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; marketIndex?: number; marketType?: string }): DriftPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM drift_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.marketIndex !== undefined) {
    query += ' AND market_index = ?';
    params.push(filters.marketIndex);
  }

  if (filters?.marketType) {
    query += ' AND market_type = ?';
    params.push(filters.marketType);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): DriftPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM drift_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<DriftPosition>): DriftPosition | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.markPrice !== undefined) {
    fields.push('mark_price = ?');
    params.push(updates.markPrice);
  }
  if (updates.unrealizedPnl !== undefined) {
    fields.push('unrealized_pnl = ?');
    params.push(updates.unrealizedPnl);
  }
  if (updates.realizedPnl !== undefined) {
    fields.push('realized_pnl = ?');
    params.push(updates.realizedPnl);
  }
  if (updates.liquidationPrice !== undefined) {
    fields.push('liquidation_price = ?');
    params.push(updates.liquidationPrice);
  }
  if (updates.status) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.closedAt !== undefined) {
    fields.push('closed_at = ?');
    params.push(updates.closedAt);
  }

  if (fields.length === 0) return getPositionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE drift_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getPositionById(id);
}

export function closePosition(id: string): DriftPosition | null {
  return updatePosition(id, { status: 'closed', closedAt: Date.now() });
}

// Order Operations
export function createOrder(data: Omit<DriftOrder, 'id' | 'createdAt' | 'updatedAt'>): DriftOrder {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO drift_orders (
      id, user_wallet, account_pubkey, order_id, market_index, market_type, side, order_type,
      base_asset_amount, price, trigger_price, reduce_only, post_only, status, filled_amount,
      avg_fill_price, tx_signature, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.accountPubkey || null,
    data.orderId || null,
    data.marketIndex,
    data.marketType,
    data.side,
    data.orderType,
    data.baseAssetAmount,
    data.price || null,
    data.triggerPrice || null,
    data.reduceOnly ? 1 : 0,
    data.postOnly ? 1 : 0,
    data.status,
    data.filledAmount || '0',
    data.avgFillPrice || null,
    data.txSignature || null,
    data.error || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getOrdersByWallet(userWallet: string, filters?: { status?: string; marketIndex?: number }): DriftOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM drift_orders WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.marketIndex !== undefined) {
    query += ' AND market_index = ?';
    params.push(filters.marketIndex);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as OrderRow[];
  return rows.map(rowToOrder);
}

export function getOrderById(id: string): DriftOrder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM drift_orders WHERE id = ?');
  const row = stmt.get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function updateOrder(id: string, updates: Partial<DriftOrder>): DriftOrder | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.filledAmount !== undefined) {
    fields.push('filled_amount = ?');
    params.push(updates.filledAmount);
  }
  if (updates.avgFillPrice !== undefined) {
    fields.push('avg_fill_price = ?');
    params.push(updates.avgFillPrice);
  }
  if (updates.txSignature !== undefined) {
    fields.push('tx_signature = ?');
    params.push(updates.txSignature);
  }
  if (updates.error !== undefined) {
    fields.push('error = ?');
    params.push(updates.error);
  }

  if (fields.length === 0) return getOrderById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE drift_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getOrderById(id);
}

export function cancelOrder(id: string): DriftOrder | null {
  return updateOrder(id, { status: 'cancelled' });
}

// Stats
export function getAccountStats(userWallet: string): {
  totalPositions: number;
  openPositions: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  openOrders: number;
} {
  const db = getDatabase();

  const positionStmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_positions,
      SUM(CASE WHEN status = 'open' THEN unrealized_pnl ELSE 0 END) as unrealized,
      SUM(realized_pnl) as realized
    FROM drift_positions WHERE user_wallet = ?
  `);

  const orderStmt = db.prepare(`
    SELECT COUNT(*) as open_orders
    FROM drift_orders WHERE user_wallet = ? AND status IN ('pending', 'open')
  `);

  const positionRow = positionStmt.get(userWallet) as {
    total: number;
    open_positions: number;
    unrealized: number | null;
    realized: number | null;
  };

  const orderRow = orderStmt.get(userWallet) as { open_orders: number };

  return {
    totalPositions: positionRow.total,
    openPositions: positionRow.open_positions,
    totalUnrealizedPnl: positionRow.unrealized || 0,
    totalRealizedPnl: positionRow.realized || 0,
    openOrders: orderRow.open_orders,
  };
}
