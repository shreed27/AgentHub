/**
 * Database Operations for Orca DEX Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface OrcaPosition {
  id: string;
  userWallet: string;
  positionAddress: string;
  whirlpoolAddress: string;
  tickLowerIndex: number;
  tickUpperIndex: number;
  liquidity: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAAmount: number;
  tokenBAmount: number;
  feeOwedA: number;
  feeOwedB: number;
  rewardOwed0: number;
  rewardOwed1: number;
  rewardOwed2: number;
  status: 'active' | 'closed' | 'pending';
  openedAt: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface OrcaSwap {
  id: string;
  userWallet: string;
  whirlpoolAddress?: string;
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
  whirlpool_address: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_amount: number;
  token_b_amount: number;
  fee_owed_a: number;
  fee_owed_b: number;
  reward_owed_0: number;
  reward_owed_1: number;
  reward_owed_2: number;
  status: string;
  opened_at: number;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface SwapRow {
  id: string;
  user_wallet: string;
  whirlpool_address: string | null;
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

function rowToPosition(row: PositionRow): OrcaPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    positionAddress: row.position_address,
    whirlpoolAddress: row.whirlpool_address,
    tickLowerIndex: row.tick_lower_index,
    tickUpperIndex: row.tick_upper_index,
    liquidity: row.liquidity,
    tokenAMint: row.token_a_mint,
    tokenBMint: row.token_b_mint,
    tokenAAmount: row.token_a_amount,
    tokenBAmount: row.token_b_amount,
    feeOwedA: row.fee_owed_a,
    feeOwedB: row.fee_owed_b,
    rewardOwed0: row.reward_owed_0,
    rewardOwed1: row.reward_owed_1,
    rewardOwed2: row.reward_owed_2,
    status: row.status as OrcaPosition['status'],
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSwap(row: SwapRow): OrcaSwap {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    whirlpoolAddress: row.whirlpool_address || undefined,
    inputMint: row.input_mint,
    outputMint: row.output_mint,
    inputAmount: row.input_amount,
    outputAmount: row.output_amount,
    slippageBps: row.slippage_bps || undefined,
    priceImpact: row.price_impact || undefined,
    feeAmount: row.fee_amount,
    txSignature: row.tx_signature || undefined,
    status: row.status as OrcaSwap['status'],
    createdAt: row.created_at,
  };
}

// Position Operations
export function createPosition(data: Omit<OrcaPosition, 'id' | 'createdAt' | 'updatedAt'>): OrcaPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO orca_positions (
      id, user_wallet, position_address, whirlpool_address, tick_lower_index, tick_upper_index,
      liquidity, token_a_mint, token_b_mint, token_a_amount, token_b_amount,
      fee_owed_a, fee_owed_b, reward_owed_0, reward_owed_1, reward_owed_2,
      status, opened_at, closed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.positionAddress,
    data.whirlpoolAddress,
    data.tickLowerIndex,
    data.tickUpperIndex,
    data.liquidity,
    data.tokenAMint,
    data.tokenBMint,
    data.tokenAAmount,
    data.tokenBAmount,
    data.feeOwedA || 0,
    data.feeOwedB || 0,
    data.rewardOwed0 || 0,
    data.rewardOwed1 || 0,
    data.rewardOwed2 || 0,
    data.status,
    data.openedAt,
    data.closedAt || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; whirlpoolAddress?: string }): OrcaPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM orca_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.whirlpoolAddress) {
    query += ' AND whirlpool_address = ?';
    params.push(filters.whirlpoolAddress);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): OrcaPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM orca_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function getPositionByAddress(positionAddress: string): OrcaPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM orca_positions WHERE position_address = ?');
  const row = stmt.get(positionAddress) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<OrcaPosition>): OrcaPosition | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.liquidity !== undefined) {
    fields.push('liquidity = ?');
    params.push(updates.liquidity);
  }
  if (updates.tokenAAmount !== undefined) {
    fields.push('token_a_amount = ?');
    params.push(updates.tokenAAmount);
  }
  if (updates.tokenBAmount !== undefined) {
    fields.push('token_b_amount = ?');
    params.push(updates.tokenBAmount);
  }
  if (updates.feeOwedA !== undefined) {
    fields.push('fee_owed_a = ?');
    params.push(updates.feeOwedA);
  }
  if (updates.feeOwedB !== undefined) {
    fields.push('fee_owed_b = ?');
    params.push(updates.feeOwedB);
  }
  if (updates.rewardOwed0 !== undefined) {
    fields.push('reward_owed_0 = ?');
    params.push(updates.rewardOwed0);
  }
  if (updates.rewardOwed1 !== undefined) {
    fields.push('reward_owed_1 = ?');
    params.push(updates.rewardOwed1);
  }
  if (updates.rewardOwed2 !== undefined) {
    fields.push('reward_owed_2 = ?');
    params.push(updates.rewardOwed2);
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

  const stmt = db.prepare(`UPDATE orca_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getPositionById(id);
}

export function closePosition(id: string): OrcaPosition | null {
  return updatePosition(id, { status: 'closed', closedAt: Date.now() });
}

// Swap Operations
export function createSwap(data: Omit<OrcaSwap, 'id' | 'createdAt'>): OrcaSwap {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO orca_swaps (
      id, user_wallet, whirlpool_address, input_mint, output_mint, input_amount, output_amount,
      slippage_bps, price_impact, fee_amount, tx_signature, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.whirlpoolAddress || null,
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

export function getSwapsByWallet(userWallet: string, limit = 50): OrcaSwap[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM orca_swaps WHERE user_wallet = ? ORDER BY created_at DESC LIMIT ?');
  const rows = stmt.all(userWallet, limit) as SwapRow[];
  return rows.map(rowToSwap);
}

export function getSwapById(id: string): OrcaSwap | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM orca_swaps WHERE id = ?');
  const row = stmt.get(id) as SwapRow | undefined;
  return row ? rowToSwap(row) : null;
}

export function updateSwapStatus(id: string, status: OrcaSwap['status'], txSignature?: string): OrcaSwap | null {
  const db = getDatabase();

  if (txSignature) {
    const stmt = db.prepare('UPDATE orca_swaps SET status = ?, tx_signature = ? WHERE id = ?');
    stmt.run(status, txSignature, id);
  } else {
    const stmt = db.prepare('UPDATE orca_swaps SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  return getSwapById(id);
}

// Stats
export function getPositionStats(userWallet: string): {
  totalPositions: number;
  activePositions: number;
  totalFeeOwedA: number;
  totalFeeOwedB: number;
  totalRewardsOwed: number;
} {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(fee_owed_a) as fee_a,
      SUM(fee_owed_b) as fee_b,
      SUM(reward_owed_0 + reward_owed_1 + reward_owed_2) as rewards
    FROM orca_positions WHERE user_wallet = ?
  `);

  const row = stmt.get(userWallet) as {
    total: number;
    active: number;
    fee_a: number | null;
    fee_b: number | null;
    rewards: number | null;
  };

  return {
    totalPositions: row.total,
    activePositions: row.active,
    totalFeeOwedA: row.fee_a || 0,
    totalFeeOwedB: row.fee_b || 0,
    totalRewardsOwed: row.rewards || 0,
  };
}
