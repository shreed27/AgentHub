/**
 * Database Operations for Pump.fun Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface PumpfunTrade {
  id: string;
  userWallet: string;
  tokenMint: string;
  tokenSymbol?: string;
  action: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  pricePerToken: number;
  feeAmount: number;
  bondingProgress?: number;
  wasGraduated: boolean;
  txSignature?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}

export interface PumpfunWatchlistItem {
  id: string;
  userWallet: string;
  tokenMint: string;
  tokenSymbol?: string;
  tokenName?: string;
  addedPrice?: number;
  currentPrice?: number;
  bondingProgress?: number;
  notes?: string;
  alertsEnabled: boolean;
  graduationAlert: boolean;
  priceAlertAbove?: number;
  priceAlertBelow?: number;
  createdAt: number;
  updatedAt: number;
}

interface TradeRow {
  id: string;
  user_wallet: string;
  token_mint: string;
  token_symbol: string | null;
  action: string;
  sol_amount: number;
  token_amount: number;
  price_per_token: number;
  fee_amount: number;
  bonding_progress: number | null;
  was_graduated: number;
  tx_signature: string | null;
  status: string;
  created_at: number;
}

interface WatchlistRow {
  id: string;
  user_wallet: string;
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  added_price: number | null;
  current_price: number | null;
  bonding_progress: number | null;
  notes: string | null;
  alerts_enabled: number;
  graduation_alert: number;
  price_alert_above: number | null;
  price_alert_below: number | null;
  created_at: number;
  updated_at: number;
}

function rowToTrade(row: TradeRow): PumpfunTrade {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    tokenMint: row.token_mint,
    tokenSymbol: row.token_symbol || undefined,
    action: row.action as 'buy' | 'sell',
    solAmount: row.sol_amount,
    tokenAmount: row.token_amount,
    pricePerToken: row.price_per_token,
    feeAmount: row.fee_amount,
    bondingProgress: row.bonding_progress || undefined,
    wasGraduated: row.was_graduated === 1,
    txSignature: row.tx_signature || undefined,
    status: row.status as PumpfunTrade['status'],
    createdAt: row.created_at,
  };
}

function rowToWatchlistItem(row: WatchlistRow): PumpfunWatchlistItem {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    tokenMint: row.token_mint,
    tokenSymbol: row.token_symbol || undefined,
    tokenName: row.token_name || undefined,
    addedPrice: row.added_price || undefined,
    currentPrice: row.current_price || undefined,
    bondingProgress: row.bonding_progress || undefined,
    notes: row.notes || undefined,
    alertsEnabled: row.alerts_enabled === 1,
    graduationAlert: row.graduation_alert === 1,
    priceAlertAbove: row.price_alert_above || undefined,
    priceAlertBelow: row.price_alert_below || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Trade Operations
export function createTrade(data: Omit<PumpfunTrade, 'id' | 'createdAt'>): PumpfunTrade {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO pumpfun_trades (
      id, user_wallet, token_mint, token_symbol, action, sol_amount, token_amount,
      price_per_token, fee_amount, bonding_progress, was_graduated, tx_signature, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.tokenMint,
    data.tokenSymbol || null,
    data.action,
    data.solAmount,
    data.tokenAmount,
    data.pricePerToken,
    data.feeAmount || 0,
    data.bondingProgress || null,
    data.wasGraduated ? 1 : 0,
    data.txSignature || null,
    data.status,
    now
  );

  return { id, ...data, createdAt: now };
}

export function getTradesByWallet(userWallet: string, filters?: { tokenMint?: string; action?: string; limit?: number }): PumpfunTrade[] {
  const db = getDatabase();
  let query = 'SELECT * FROM pumpfun_trades WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.tokenMint) {
    query += ' AND token_mint = ?';
    params.push(filters.tokenMint);
  }

  if (filters?.action) {
    query += ' AND action = ?';
    params.push(filters.action);
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as TradeRow[];
  return rows.map(rowToTrade);
}

export function getTradeById(id: string): PumpfunTrade | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pumpfun_trades WHERE id = ?');
  const row = stmt.get(id) as TradeRow | undefined;
  return row ? rowToTrade(row) : null;
}

export function updateTradeStatus(id: string, status: PumpfunTrade['status'], txSignature?: string): PumpfunTrade | null {
  const db = getDatabase();

  if (txSignature) {
    const stmt = db.prepare('UPDATE pumpfun_trades SET status = ?, tx_signature = ? WHERE id = ?');
    stmt.run(status, txSignature, id);
  } else {
    const stmt = db.prepare('UPDATE pumpfun_trades SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  return getTradeById(id);
}

// Watchlist Operations
export function addToWatchlist(data: Omit<PumpfunWatchlistItem, 'id' | 'createdAt' | 'updatedAt'>): PumpfunWatchlistItem {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO pumpfun_watchlist (
      id, user_wallet, token_mint, token_symbol, token_name, added_price, current_price,
      bonding_progress, notes, alerts_enabled, graduation_alert, price_alert_above,
      price_alert_below, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_wallet, token_mint) DO UPDATE SET
      token_symbol = excluded.token_symbol,
      token_name = excluded.token_name,
      notes = excluded.notes,
      alerts_enabled = excluded.alerts_enabled,
      graduation_alert = excluded.graduation_alert,
      price_alert_above = excluded.price_alert_above,
      price_alert_below = excluded.price_alert_below,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    id,
    data.userWallet,
    data.tokenMint,
    data.tokenSymbol || null,
    data.tokenName || null,
    data.addedPrice || null,
    data.currentPrice || null,
    data.bondingProgress || null,
    data.notes || null,
    data.alertsEnabled ? 1 : 0,
    data.graduationAlert ? 1 : 0,
    data.priceAlertAbove || null,
    data.priceAlertBelow || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getWatchlist(userWallet: string): PumpfunWatchlistItem[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pumpfun_watchlist WHERE user_wallet = ? ORDER BY created_at DESC');
  const rows = stmt.all(userWallet) as WatchlistRow[];
  return rows.map(rowToWatchlistItem);
}

export function getWatchlistItem(userWallet: string, tokenMint: string): PumpfunWatchlistItem | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pumpfun_watchlist WHERE user_wallet = ? AND token_mint = ?');
  const row = stmt.get(userWallet, tokenMint) as WatchlistRow | undefined;
  return row ? rowToWatchlistItem(row) : null;
}

export function updateWatchlistItem(id: string, updates: Partial<PumpfunWatchlistItem>): PumpfunWatchlistItem | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.currentPrice !== undefined) {
    fields.push('current_price = ?');
    params.push(updates.currentPrice);
  }
  if (updates.bondingProgress !== undefined) {
    fields.push('bonding_progress = ?');
    params.push(updates.bondingProgress);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    params.push(updates.notes);
  }
  if (updates.alertsEnabled !== undefined) {
    fields.push('alerts_enabled = ?');
    params.push(updates.alertsEnabled ? 1 : 0);
  }
  if (updates.graduationAlert !== undefined) {
    fields.push('graduation_alert = ?');
    params.push(updates.graduationAlert ? 1 : 0);
  }
  if (updates.priceAlertAbove !== undefined) {
    fields.push('price_alert_above = ?');
    params.push(updates.priceAlertAbove);
  }
  if (updates.priceAlertBelow !== undefined) {
    fields.push('price_alert_below = ?');
    params.push(updates.priceAlertBelow);
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE pumpfun_watchlist SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  const getStmt = db.prepare('SELECT * FROM pumpfun_watchlist WHERE id = ?');
  const row = getStmt.get(id) as WatchlistRow | undefined;
  return row ? rowToWatchlistItem(row) : null;
}

export function removeFromWatchlist(userWallet: string, tokenMint: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM pumpfun_watchlist WHERE user_wallet = ? AND token_mint = ?');
  const result = stmt.run(userWallet, tokenMint);
  return result.changes > 0;
}

// Stats
export function getTradeStats(userWallet: string): {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  totalSolSpent: number;
  totalSolReceived: number;
  totalFees: number;
  graduatedTokensTrades: number;
} {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN action = 'buy' THEN 1 ELSE 0 END) as buys,
      SUM(CASE WHEN action = 'sell' THEN 1 ELSE 0 END) as sells,
      SUM(CASE WHEN action = 'buy' THEN sol_amount ELSE 0 END) as sol_spent,
      SUM(CASE WHEN action = 'sell' THEN sol_amount ELSE 0 END) as sol_received,
      SUM(fee_amount) as fees,
      SUM(CASE WHEN was_graduated = 1 THEN 1 ELSE 0 END) as graduated
    FROM pumpfun_trades WHERE user_wallet = ? AND status = 'confirmed'
  `);

  const row = stmt.get(userWallet) as {
    total: number;
    buys: number;
    sells: number;
    sol_spent: number | null;
    sol_received: number | null;
    fees: number | null;
    graduated: number;
  };

  return {
    totalTrades: row.total,
    buyCount: row.buys,
    sellCount: row.sells,
    totalSolSpent: row.sol_spent || 0,
    totalSolReceived: row.sol_received || 0,
    totalFees: row.fees || 0,
    graduatedTokensTrades: row.graduated,
  };
}
