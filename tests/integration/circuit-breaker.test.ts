/**
 * Integration Tests: Circuit Breaker
 *
 * Tests the unified circuit breaker safety functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger
vi.mock('../../CloddsBot-main/src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Execution Circuit Breaker', () => {
  it('should allow trading when not tripped', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/execution/circuit-breaker');

    const breaker = createCircuitBreaker({
      maxLossUsd: 1000,
      maxConsecutiveLosses: 5,
    });

    expect(breaker.canTrade()).toBe(true);
  });

  it('should trip on consecutive losses', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/execution/circuit-breaker');

    const breaker = createCircuitBreaker({
      maxConsecutiveLosses: 3,
      maxLossUsd: 10000, // High limit so loss amount doesn't trip
    });

    // Record 3 consecutive losses
    breaker.recordTrade({ pnlUsd: -10, success: false, sizeUsd: 100 });
    breaker.recordTrade({ pnlUsd: -10, success: false, sizeUsd: 100 });
    breaker.recordTrade({ pnlUsd: -10, success: false, sizeUsd: 100 });

    expect(breaker.canTrade()).toBe(false);

    const state = breaker.getState();
    expect(state.isTripped).toBe(true);
    expect(state.tripReason).toBe('consecutive_losses');
  });

  it('should reset consecutive losses on successful trade', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/execution/circuit-breaker');

    const breaker = createCircuitBreaker({
      maxConsecutiveLosses: 5,
    });

    // Record 2 losses
    breaker.recordTrade({ pnlUsd: -10, success: false, sizeUsd: 100 });
    breaker.recordTrade({ pnlUsd: -10, success: false, sizeUsd: 100 });

    // Record 1 win
    breaker.recordTrade({ pnlUsd: 20, success: true, sizeUsd: 100 });

    // Should still be able to trade
    expect(breaker.canTrade()).toBe(true);

    const state = breaker.getState();
    expect(state.consecutiveLosses).toBe(0);
  });

  it('should trip on max loss USD', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/execution/circuit-breaker');

    const breaker = createCircuitBreaker({
      maxLossUsd: 100,
      maxConsecutiveLosses: 100, // High so it doesn't trip first
    });

    // Record large losses
    breaker.recordTrade({ pnlUsd: -50, success: true, sizeUsd: 100 });
    breaker.recordTrade({ pnlUsd: -60, success: true, sizeUsd: 100 }); // Total: -110

    expect(breaker.canTrade()).toBe(false);

    const state = breaker.getState();
    expect(state.isTripped).toBe(true);
    expect(state.tripReason).toBe('max_loss');
  });

  it('should allow manual trip and reset', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/execution/circuit-breaker');

    const breaker = createCircuitBreaker({});

    // Manually trip
    breaker.trip('manual');

    expect(breaker.canTrade()).toBe(false);
    expect(breaker.getState().isTripped).toBe(true);
    expect(breaker.getState().tripReason).toBe('manual');

    // Manual reset
    breaker.reset();

    expect(breaker.canTrade()).toBe(true);
    expect(breaker.getState().isTripped).toBe(false);
  });
});

describe('Risk Circuit Breaker', () => {
  it('should trip on loss percentage', async () => {
    const { createCircuitBreaker, CONSERVATIVE_CONFIG } = await import('../../CloddsBot-main/src/risk/circuit-breaker');

    const breaker = createCircuitBreaker({
      conditions: [
        { type: 'loss', maxLossPct: 5, window: 'daily' },
      ],
    });

    // Record loss exceeding 5%
    breaker.recordTrade({ success: true, pnl: -6 }); // -6%

    expect(breaker.canTrade()).toBe(false);

    const state = breaker.getState();
    expect(state.tripped).toBe(true);
  });

  it('should track multiple conditions', async () => {
    const { createCircuitBreaker } = await import('../../CloddsBot-main/src/risk/circuit-breaker');

    const breaker = createCircuitBreaker({
      conditions: [
        { type: 'failures', maxConsecutive: 3 },
        { type: 'loss', maxLossPct: 10, window: 'daily' },
      ],
    });

    // Should allow trading initially
    expect(breaker.canTrade()).toBe(true);

    // Trip via failures
    breaker.recordTrade({ success: false });
    breaker.recordTrade({ success: false });
    breaker.recordTrade({ success: false });

    expect(breaker.canTrade()).toBe(false);
  });
});
