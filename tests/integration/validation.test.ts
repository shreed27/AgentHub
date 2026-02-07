/**
 * Integration Tests: Input Validation
 *
 * Tests the validation utilities for addresses, amounts, and slippage.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidSolanaAddress,
  isValidEvmAddress,
  validateAmount,
  validateSlippageBps,
} from '../../apps/gateway/src/utils/validation';

describe('Solana Address Validation', () => {
  it('should accept valid Solana addresses', () => {
    // Valid Solana addresses (base58, 32-44 chars)
    expect(isValidSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
    expect(isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
  });

  it('should reject invalid Solana addresses', () => {
    expect(isValidSolanaAddress('')).toBe(false);
    expect(isValidSolanaAddress('invalid')).toBe(false);
    expect(isValidSolanaAddress('0x1234567890123456789012345678901234567890')).toBe(false);
    expect(isValidSolanaAddress(null as any)).toBe(false);
    expect(isValidSolanaAddress(undefined as any)).toBe(false);
  });
});

describe('EVM Address Validation', () => {
  it('should accept valid EVM addresses', () => {
    expect(isValidEvmAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    expect(isValidEvmAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    expect(isValidEvmAddress('0xabcdef1234567890abcdef1234567890abcdef12')).toBe(true);
  });

  it('should reject invalid EVM addresses', () => {
    expect(isValidEvmAddress('')).toBe(false);
    expect(isValidEvmAddress('invalid')).toBe(false);
    expect(isValidEvmAddress('0x123')).toBe(false); // Too short
    expect(isValidEvmAddress('0x12345678901234567890123456789012345678901')).toBe(false); // Too long
    expect(isValidEvmAddress('1234567890123456789012345678901234567890')).toBe(false); // Missing 0x
    expect(isValidEvmAddress(null as any)).toBe(false);
  });
});

describe('Amount Validation', () => {
  it('should accept valid amounts', () => {
    expect(validateAmount(100)).toEqual({ valid: true, value: 100 });
    expect(validateAmount(0.001)).toEqual({ valid: true, value: 0.001 });
    expect(validateAmount('50')).toEqual({ valid: true, value: 50 });
    expect(validateAmount('0.5')).toEqual({ valid: true, value: 0.5 });
  });

  it('should reject invalid amounts', () => {
    expect(validateAmount('invalid').valid).toBe(false);
    expect(validateAmount(NaN).valid).toBe(false);
    expect(validateAmount(-100).valid).toBe(false);
  });

  it('should respect min/max bounds', () => {
    expect(validateAmount(5, 10).valid).toBe(false);
    expect(validateAmount(5, 10).error).toContain('>= 10');

    expect(validateAmount(100, 0, 50).valid).toBe(false);
    expect(validateAmount(100, 0, 50).error).toContain('<= 50');
  });
});

describe('Slippage Validation', () => {
  it('should accept valid slippage values', () => {
    expect(validateSlippageBps(50)).toEqual({ valid: true, value: 50 });
    expect(validateSlippageBps(1)).toEqual({ valid: true, value: 1 });
    expect(validateSlippageBps(500)).toEqual({ valid: true, value: 500 });
    expect(validateSlippageBps('100')).toEqual({ valid: true, value: 100 });
  });

  it('should return default for undefined', () => {
    expect(validateSlippageBps(undefined)).toEqual({ valid: true, value: 50 });
    expect(validateSlippageBps(null)).toEqual({ valid: true, value: 50 });
  });

  it('should reject slippage below minimum (1 bps / 0.01%)', () => {
    expect(validateSlippageBps(0).valid).toBe(false);
    expect(validateSlippageBps(0).error).toContain('0.01%');
  });

  it('should reject slippage above maximum (500 bps / 5%)', () => {
    expect(validateSlippageBps(501).valid).toBe(false);
    expect(validateSlippageBps(501).error).toContain('5%');

    expect(validateSlippageBps(1000).valid).toBe(false);
  });

  it('should reject non-numeric slippage', () => {
    expect(validateSlippageBps('invalid').valid).toBe(false);
  });
});
