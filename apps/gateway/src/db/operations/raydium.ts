/**
 * Database Operations for Raydium DEX Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface RaydiumPosition {
  id: string;
  userWallet: string;
  poolId: string;
  nftMint?: string;
  positionType: 'clmm' | 'amm';
  tickLower?: number;
  tickUpper?: number;
  priceLower?: number;
  priceUpper?: number;
  liquidity?: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAAmount: number;
  tokenBAmount: number;
  feeOwedA: number;
  feeOwedB: number;
  rewardOwed: number;
  status: 'active' | 'closed' | 'pending';
  openedAt: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface RaydiumSwap {
  id: string;
  userWallet: string;
  poolId?: string;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  minOutputAmount?: number;
  priceImpact?: number;
  feeAmount: number;
  txSignature?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}

interface PositionRow {
  id: string;
  user_wallet: string;
  pool_id: string;
  nft_mint: string | null;
  position_type: string;
  tick_lower: number | null;
  tick_upper: number | null;
  price_lower: number | null;
  price_upper: number | null;
  liquidity: string | null;
  token_a_mint: string;
  token_b_mint: string;
  token_a_amount: number;
  token_b_amount: number;
  fee_owed_a: number;
  fee_owed_b: number;
  reward_owed: number;
  status: string;
  opened_at: number;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface SwapRow {
  id: string;
  user_wallet: string;
  pool_id: string | null;
  input_mint: string;
  output_mint: string;
  input_amount: number;
  output_amount: number;
  min_output_amount: number | null;
  price_impact: number | null;
  fee_amount: number;
  tx_signature: string | null;
  status: string;
  created_at: number;
}

function rowToPosition(row: PositionRow): RaydiumPosition {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    poolId: row.pool_id,
    nftMint: row.nft_mint || undefined,
    positionType: row.position_type as 'clmm' | 'amm',
    tickLower: row.tick_lower || undefined,
    tickUpper: row.tick_upper || undefined,
    priceLower: row.price_lower || undefined,
    priceUpper: row.price_upper || undefined,
    liquidity: row.liquidity || undefined,
    tokenAMint: row.token_a_mint,
    tokenBMint: row.token_b_mint,
    tokenAAmount: row.token_a_amount,
    tokenBAmount: row.token_b_amount,
    feeOwedA: row.fee_owed_a,
    feeOwedB: row.fee_owed_b,
    rewardOwed: row.reward_owed,
    status: row.status as RaydiumPosition['status'],
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSwap(row: SwapRow): RaydiumSwap {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    poolId: row.pool_id || undefined,
    inputMint: row.input_mint,
    outputMint: row.output_mint,
    inputAmount: row.input_amount,
    outputAmount: row.output_amount,
    minOutputAmount: row.min_output_amount || undefined,
    priceImpact: row.price_impact || undefined,
    feeAmount: row.fee_amount,
    txSignature: row.tx_signature || undefined,
    status: row.status as RaydiumSwap['status'],
    createdAt: row.created_at,
  };
}

// Position Operations
export function createPosition(data: Omit<RaydiumPosition, 'id' | 'createdAt' | 'updatedAt'>): RaydiumPosition {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO raydium_positions (
      id, user_wallet, pool_id, nft_mint, position_type, tick_lower, tick_upper,
      price_lower, price_upper, liquidity, token_a_mint, token_b_mint,
      token_a_amount, token_b_amount, fee_owed_a, fee_owed_b, reward_owed,
      status, opened_at, closed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.poolId,
    data.nftMint || null,
    data.positionType,
    data.tickLower || null,
    data.tickUpper || null,
    data.priceLower || null,
    data.priceUpper || null,
    data.liquidity || null,
    data.tokenAMint,
    data.tokenBMint,
    data.tokenAAmount,
    data.tokenBAmount,
    data.feeOwedA || 0,
    data.feeOwedB || 0,
    data.rewardOwed || 0,
    data.status,
    data.openedAt,
    data.closedAt || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPositionsByWallet(userWallet: string, filters?: { status?: string; poolId?: string }): RaydiumPosition[] {
  const db = getDatabase();
  let query = 'SELECT * FROM raydium_positions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.poolId) {
    query += ' AND pool_id = ?';
    params.push(filters.poolId);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PositionRow[];
  return rows.map(rowToPosition);
}

export function getPositionById(id: string): RaydiumPosition | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM raydium_positions WHERE id = ?');
  const row = stmt.get(id) as PositionRow | undefined;
  return row ? rowToPosition(row) : null;
}

export function updatePosition(id: string, updates: Partial<RaydiumPosition>): RaydiumPosition | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

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
  if (updates.rewardOwed !== undefined) {
    fields.push('reward_owed = ?');
    params.push(updates.rewardOwed);
  }
  if (updates.status) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.closedAt !== undefined) {
    fields.push('closed_at = ?');
    params.push(updates.closedAt);
  }
  if (updates.liquidity !== undefined) {
    fields.push('liquidity = ?');
    params.push(updates.liquidity);
  }

  if (fields.length === 0) return getPositionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE raydium_positions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getPositionById(id);
}

export function closePosition(id: string): RaydiumPosition | null {
  return updatePosition(id, { status: 'closed', closedAt: Date.now() });
}

// Swap Operations
export function createSwap(data: Omit<RaydiumSwap, 'id' | 'createdAt'>): RaydiumSwap {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO raydium_swaps (
      id, user_wallet, pool_id, input_mint, output_mint, input_amount, output_amount,
      min_output_amount, price_impact, fee_amount, tx_signature, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.poolId || null,
    data.inputMint,
    data.outputMint,
    data.inputAmount,
    data.outputAmount,
    data.minOutputAmount || null,
    data.priceImpact || null,
    data.feeAmount || 0,
    data.txSignature || null,
    data.status,
    now
  );

  return { id, ...data, createdAt: now };
}

export function getSwapsByWallet(userWallet: string, limit = 50): RaydiumSwap[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM raydium_swaps WHERE user_wallet = ? ORDER BY created_at DESC LIMIT ?');
  const rows = stmt.all(userWallet, limit) as SwapRow[];
  return rows.map(rowToSwap);
}

export function getSwapById(id: string): RaydiumSwap | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM raydium_swaps WHERE id = ?');
  const row = stmt.get(id) as SwapRow | undefined;
  return row ? rowToSwap(row) : null;
}

export function updateSwapStatus(id: string, status: RaydiumSwap['status'], txSignature?: string): RaydiumSwap | null {
  const db = getDatabase();

  if (txSignature) {
    const stmt = db.prepare('UPDATE raydium_swaps SET status = ?, tx_signature = ? WHERE id = ?');
    stmt.run(status, txSignature, id);
  } else {
    const stmt = db.prepare('UPDATE raydium_swaps SET status = ? WHERE id = ?');
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
  totalRewardOwed: number;
} {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(fee_owed_a) as fee_a,
      SUM(fee_owed_b) as fee_b,
      SUM(reward_owed) as rewards
    FROM raydium_positions WHERE user_wallet = ?
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
    totalRewardOwed: row.rewards || 0,
  };
}
