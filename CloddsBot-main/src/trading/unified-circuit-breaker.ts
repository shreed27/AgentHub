/**
 * Unified Circuit Breaker
 *
 * Consolidates the execution and risk circuit breakers into a single
 * safety manager that coordinates all trading safety checks.
 */

import { EventEmitter } from 'eventemitter3';
import {
  createCircuitBreaker as createExecutionBreaker,
  CircuitBreaker as ExecutionBreaker,
  CircuitBreakerConfig as ExecutionConfig,
  TradeResult,
} from '../execution/circuit-breaker';
import {
  createCircuitBreaker as createRiskBreaker,
  CircuitBreaker as RiskBreaker,
  CircuitBreakerConfig as RiskConfig,
  TripCondition,
} from '../risk/circuit-breaker';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedCircuitBreakerConfig {
  execution?: Partial<ExecutionConfig>;
  risk?: RiskConfig;
  initialBalance?: number;
  enabled?: boolean;
}

export interface TradingAllowed {
  allowed: boolean;
  reason?: string;
  blockedBy?: 'execution' | 'risk' | 'manual' | 'disabled';
}

export interface UnifiedTradeResult {
  success: boolean;
  pnlUsd?: number;
  sizeUsd?: number;
  error?: string;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class UnifiedCircuitBreaker extends EventEmitter {
  private executionBreaker: ExecutionBreaker;
  private riskBreaker: RiskBreaker;
  private manuallyDisabled: boolean = false;
  private enabled: boolean = true;

  constructor(config: UnifiedCircuitBreakerConfig = {}) {
    super();

    this.enabled = config.enabled ?? true;

    // Initialize execution circuit breaker
    this.executionBreaker = createExecutionBreaker(
      config.execution || {},
      config.initialBalance || 10000
    );

    // Initialize risk circuit breaker
    this.riskBreaker = createRiskBreaker(config.risk || { conditions: [] });

    // Forward events
    this.executionBreaker.on('tripped', (event) => {
      logger.warn({ source: 'execution', ...event }, 'Unified circuit breaker: execution tripped');
      this.emit('tripped', { source: 'execution', ...event });
    });

    this.executionBreaker.on('reset', (event) => {
      logger.info({ source: 'execution', ...event }, 'Unified circuit breaker: execution reset');
      this.emit('reset', { source: 'execution', ...event });
    });

    this.riskBreaker.on('tripped', (event) => {
      logger.warn({ source: 'risk', ...event }, 'Unified circuit breaker: risk tripped');
      this.emit('tripped', { source: 'risk', ...event });
    });

    this.riskBreaker.on('reset', (manual) => {
      logger.info({ source: 'risk', manual }, 'Unified circuit breaker: risk reset');
      this.emit('reset', { source: 'risk', manual });
    });
  }

  /**
   * Check if trading is currently allowed
   */
  canTrade(platform?: string, marketId?: string): TradingAllowed {
    // Check if disabled
    if (!this.enabled) {
      return { allowed: false, reason: 'Circuit breaker disabled', blockedBy: 'disabled' };
    }

    // Check manual disable
    if (this.manuallyDisabled) {
      return { allowed: false, reason: 'Trading manually disabled', blockedBy: 'manual' };
    }

    // Check execution breaker
    if (!this.executionBreaker.canTrade()) {
      const state = this.executionBreaker.getState();
      return {
        allowed: false,
        reason: `Execution circuit breaker tripped: ${state.tripReason}`,
        blockedBy: 'execution',
      };
    }

    // Check risk breaker
    if (!this.riskBreaker.canTrade(platform, marketId)) {
      const state = this.riskBreaker.getState();
      return {
        allowed: false,
        reason: `Risk circuit breaker tripped: ${state.tripEvent?.condition.type}`,
        blockedBy: 'risk',
      };
    }

    return { allowed: true };
  }

  /**
   * Record a trade result with both circuit breakers
   */
  recordTrade(result: UnifiedTradeResult): void {
    // Record with execution breaker
    const execResult: TradeResult = {
      pnlUsd: result.pnlUsd || 0,
      success: result.success,
      sizeUsd: result.sizeUsd || 0,
      error: result.error,
    };
    this.executionBreaker.recordTrade(execResult);

    // Record with risk breaker
    this.riskBreaker.recordTrade({
      success: result.success,
      pnl: result.pnlUsd ? result.pnlUsd / 100 : undefined, // Convert to percentage
    });

    this.emit('trade', result);
  }

  /**
   * Manually trip the unified circuit breaker
   */
  trip(reason: string): void {
    logger.error({ reason }, 'Unified circuit breaker manually tripped');
    this.executionBreaker.trip('manual');
    this.riskBreaker.trip(reason);
    this.emit('tripped', { source: 'manual', reason });
  }

  /**
   * Reset both circuit breakers
   */
  reset(): void {
    logger.info('Unified circuit breaker reset');
    this.executionBreaker.reset();
    this.riskBreaker.reset();
    this.manuallyDisabled = false;
    this.emit('reset', { source: 'manual' });
  }

  /**
   * Disable trading without tripping (soft disable)
   */
  disable(): void {
    this.manuallyDisabled = true;
    logger.info('Unified circuit breaker: trading disabled');
    this.emit('disabled');
  }

  /**
   * Re-enable trading after soft disable
   */
  enable(): void {
    this.manuallyDisabled = false;
    logger.info('Unified circuit breaker: trading enabled');
    this.emit('enabled');
  }

  /**
   * Get combined state from both breakers
   */
  getState(): {
    execution: ReturnType<ExecutionBreaker['getState']>;
    risk: ReturnType<RiskBreaker['getState']>;
    manuallyDisabled: boolean;
    enabled: boolean;
  } {
    return {
      execution: this.executionBreaker.getState(),
      risk: this.riskBreaker.getState(),
      manuallyDisabled: this.manuallyDisabled,
      enabled: this.enabled,
    };
  }

  /**
   * Update position size for execution breaker
   */
  updatePositionSize(sizeUsd: number): void {
    this.executionBreaker.updatePositionSize(sizeUsd);
  }

  /**
   * Start monitoring on both breakers
   */
  start(): void {
    this.executionBreaker.start();
    this.riskBreaker.startMonitoring();
    logger.info('Unified circuit breaker started');
    this.emit('started');
  }

  /**
   * Stop monitoring on both breakers
   */
  stop(): void {
    this.executionBreaker.stop();
    this.riskBreaker.stopMonitoring();
    logger.info('Unified circuit breaker stopped');
    this.emit('stopped');
  }

  /**
   * Check a specific risk condition
   */
  checkRiskCondition(
    condition: TripCondition,
    platform?: string,
    marketId?: string
  ): { tripped: boolean; details: Record<string, unknown> } {
    return this.riskBreaker.checkCondition(condition, platform, marketId);
  }
}

// =============================================================================
// GLOBAL INSTANCE
// =============================================================================

let globalUnifiedBreaker: UnifiedCircuitBreaker | null = null;

export function getUnifiedCircuitBreaker(): UnifiedCircuitBreaker {
  if (!globalUnifiedBreaker) {
    globalUnifiedBreaker = new UnifiedCircuitBreaker();
  }
  return globalUnifiedBreaker;
}

export function initUnifiedCircuitBreaker(
  config: UnifiedCircuitBreakerConfig
): UnifiedCircuitBreaker {
  globalUnifiedBreaker = new UnifiedCircuitBreaker(config);
  return globalUnifiedBreaker;
}
