import { PublicKey } from '@solana/web3.js';

/**
 * Shared validation utilities for the gateway
 */

// Slippage bounds
const SLIPPAGE_BOUNDS = {
  MIN_BPS: 1,      // 0.01%
  MAX_BPS: 500,    // 5%
  DEFAULT_BPS: 50, // 0.5%
};

/**
 * Validate a Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an EVM wallet address (Ethereum, Base, Polygon, etc.)
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a numeric amount
 */
export function validateAmount(amount: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): { valid: boolean; error?: string; value?: number } {
  if (typeof amount === 'string') {
    amount = parseFloat(amount);
  }

  if (typeof amount !== 'number' || isNaN(amount as number)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  const numAmount = amount as number;

  if (numAmount < min) {
    return { valid: false, error: `Amount must be >= ${min}` };
  }
  if (numAmount > max) {
    return { valid: false, error: `Amount must be <= ${max}` };
  }

  return { valid: true, value: numAmount };
}

/**
 * Validate slippage in basis points
 */
export function validateSlippageBps(bps: unknown): { valid: boolean; error?: string; value?: number } {
  if (bps === undefined || bps === null) {
    return { valid: true, value: SLIPPAGE_BOUNDS.DEFAULT_BPS };
  }

  if (typeof bps === 'string') {
    bps = parseInt(bps, 10);
  }

  if (typeof bps !== 'number' || isNaN(bps as number)) {
    return { valid: false, error: 'Slippage must be a valid number' };
  }

  const numBps = bps as number;

  if (numBps < SLIPPAGE_BOUNDS.MIN_BPS) {
    return { valid: false, error: `Slippage must be >= ${SLIPPAGE_BOUNDS.MIN_BPS} bps (0.01%)` };
  }
  if (numBps > SLIPPAGE_BOUNDS.MAX_BPS) {
    return { valid: false, error: `Slippage must be <= ${SLIPPAGE_BOUNDS.MAX_BPS} bps (5%)` };
  }

  return { valid: true, value: numBps };
}

/**
 * Validate a token mint address (alias for Solana address validation)
 */
export const isValidMintAddress = isValidSolanaAddress;

/**
 * Validate transaction signature format
 */
export function isValidTransactionSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  // Solana signatures are base58 encoded and ~88 characters
  return /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(signature);
}

/**
 * Validation error response helper
 */
export function validationError(message: string): { success: false; error: string } {
  return { success: false, error: message };
}
