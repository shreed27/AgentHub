/**
 * Database Operations for Meteora DEX Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface MeteoraPosition {
  id: string;
  userWallet: string;
  positionAddress: string;
  lbPairAddress: string;
  lowerBinId: number;
  upperBinId: number;
  totalXAmount: string;
  totalYAmount: string;
  feeX: number;
  feeY: number;
  rewardOne: number;
  rewardTwo: number;
  status: 'active' | 'closed' | 'pending';
  openedAt: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MeteoraSwap {
  id: string;
  userWallet: string;
  lbPairAddress?: string;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  slippageBps?: number;
  priceImpact?: number;
  feeAmount: number;
  txSignature?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  position_address: string;
  lb_pair_address: string;
  lower_bin_id: number;
  upper_bin_id: number;
  total_x_amount: string;
  total_y_amount: string;
  fee_x: number;
  fee_y: number;
  reward_one: number;
  reward_two: number;
  status: string;
  opened_at: number;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface SwapRow {
  id: string;
  user_wallet: string;
  lb_pair_address: string | null;
  input_mint: string;
  output_mint: string;
  input_amount: number;
  output_amount: number;
  slippage_bps: number | null;
  price_impact: number | null;
  fee_amount: number;
  tx_signature: string | null;
  status: string;
  created_at: number;
}

function rowToPosition(row: PositionRow): MeteoraPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    positionAddress: row.position_address,
    lbPairAddress: row.lb_pair_address,
    lowerBinId: row.lower_bin_id,
    upperBinId: row.upper_bin_id,
    totalXAmount: row.total_x_amount,
    totalYAmount: row.total_y_amount,
    feeX: row.fee_x,
    feeY: row.fee_y,
    rewardOne: row.reward_one,
    rewardTwo: row.reward_two,
    status: row.status as MeteoraPosition['status'],
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSwap(row: SwapRow): MeteoraSwap {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    lbPairAddress: row.lb_pair_address || undefined,
    inputMint: row.input_mint,
    outputMint: row.output_mint,
    inputAmount: row.input_amount,
    outputAmount: row.output_amount,
    slippageBps: row.slippage_bps || undefined,
    priceImpact: row.price_impact || undefined,
    feeAmount: row.fee_amount,
    txSignature: row.tx_signature || undefined,
    status: row.status as MeteoraSwap['status'],
    createdAt: row.created_at,
  };
}

// Position Operations
export function createPosition(data: Omit<MeteoraPosition, 'id' | 'createdAt' | 'updatedAt'>): MeteoraPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO meteora_positions (
      id, user_wallet, position_address, lb_pair_address, lower_bin_id, upper_bin_id,
      total_x_amount, total_y_amount, fee_x, fee_y, reward_one, reward_two,
      status, opened_at, closed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.positionAddress,
    data.lbPairAddress,
    data.lowerBinId,
    data.upperBinId,
    data.totalXAmount,
    data.totalYAmount,
    data.feeX || 0,
    data.feeY || 0,
    data.rewardOne || 0,
    data.rewardTwo || 0,
    data.status,
    data.openedAt,
    data.closedAt || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; lbPairAddress?: string }): MeteoraPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM meteora_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.lbPairAddress) {
    query += ' AND lb_pair_address = ?';
    params.push(filters.lbPairAddress);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): MeteoraPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM meteora_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function getPositionByAddress(positionAddress: string): MeteoraPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM meteora_positions WHERE position_address = ?');
  const row = stmt.get(positionAddress) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<MeteoraPosition>): MeteoraPosition | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.totalXAmount !== undefined) {
    fields.push('total_x_amount = ?');
    params.push(updates.totalXAmount);
  }
  if (updates.totalYAmount !== undefined) {
    fields.push('total_y_amount = ?');
    params.push(updates.totalYAmount);
  }
  if (updates.feeX !== undefined) {
    fields.push('fee_x = ?');
    params.push(updates.feeX);
  }
  if (updates.feeY !== undefined) {
    fields.push('fee_y = ?');
    params.push(updates.feeY);
  }
  if (updates.rewardOne !== undefined) {
    fields.push('reward_one = ?');
    params.push(updates.rewardOne);
  }
  if (updates.rewardTwo !== undefined) {
    fields.push('reward_two = ?');
    params.push(updates.rewardTwo);
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

  const stmt = db.prepare(`UPDATE meteora_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getPositionById(id);
}

export function closePosition(id: string): MeteoraPosition | null {
  return updatePosition(id, { status: 'closed', closedAt: Date.now() });
}

// Swap Operations
export function createSwap(data: Omit<MeteoraSwap, 'id' | 'createdAt'>): MeteoraSwap {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO meteora_swaps (
      id, user_wallet, lb_pair_address, input_mint, output_mint, input_amount, output_amount,
      slippage_bps, price_impact, fee_amount, tx_signature, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.lbPairAddress || null,
    data.inputMint,
    data.outputMint,
    data.inputAmount,
    data.outputAmount,
    data.slippageBps || null,
    data.priceImpact || null,
    data.feeAmount || 0,
    data.txSignature || null,
    data.status,
    now
  );

  return { id, ...data, createdAt: now };
}

export function getSwapsByWallet(userWallet: string, limit = 50): MeteoraSwap[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM meteora_swaps WHERE user_wallet = ? ORDER BY created_at DESC LIMIT ?');
  const rows = stmt.all(userWallet, limit) as SwapRow[];
  return rows.map(rowToSwap);
}

export function getSwapById(id: string): MeteoraSwap | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM meteora_swaps WHERE id = ?');
  const row = stmt.get(id) as SwapRow | undefined;
  return row ? rowToSwap(row) : null;
}

export function updateSwapStatus(id: string, status: MeteoraSwap['status'], txSignature?: string): MeteoraSwap | null {
  const db = getDatabase();

  if (txSignature) {
    const stmt = db.prepare('UPDATE meteora_swaps SET status = ?, tx_signature = ? WHERE id = ?');
    stmt.run(status, txSignature, id);
  } else {
    const stmt = db.prepare('UPDATE meteora_swaps SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  return getSwapById(id);
}

// Stats
export function getPositionStats(userWallet: string): {
  totalPositions: number;
  activePositions: number;
  totalFeeX: number;
  totalFeeY: number;
  totalRewards: number;
} {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(fee_x) as fee_x,
      SUM(fee_y) as fee_y,
      SUM(reward_one + reward_two) as rewards
    FROM meteora_positions WHERE user_wallet = ?
  `);

  const row = stmt.get(userWallet) as {
    total: number;
    active: number;
    fee_x: number | null;
    fee_y: number | null;
    rewards: number | null;
  };

  return {
    totalPositions: row.total,
    activePositions: row.active,
    totalFeeX: row.fee_x || 0,
    totalFeeY: row.fee_y || 0,
    totalRewards: row.rewards || 0,
  };
}
