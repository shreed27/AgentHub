/**
 * Survival Mode - Adaptive risk management based on P&L health
 *
 * Automatically adjusts trading behavior based on portfolio performance:
 * - GROWTH (≥120%): Aggressive mode, X402 payments unlocked
 * - SURVIVAL (85-120%): Normal operations
 * - DEFENSIVE (50-85%): Costs frozen, conservative only
 * - CRITICAL (<50%): Process exits, capital preserved
 */

import type {
  SurvivalState,
  SurvivalConfig,
  SurvivalStatus,
} from './types';
import type { DainClient } from './client';

/**
 * Survival Mode module - Automatic risk management
 *
 * @example
 * ```ts
 * // Get current survival status
 * const status = await dain.survival.getStatus();
 * console.log(`State: ${status.state}, Health: ${status.healthRatio}`);
 *
 * // Configure survival parameters
 * await dain.survival.configure({
 *   initialBalance: 10000,
 *   autoKillOnCritical: true
 * });
 *
 * // Check if an action is allowed in current state
 * if (dain.survival.canExecute('LEVERAGE_TRADE')) {
 *   await dain.futures.openPosition(...);
 * }
 * ```
 */
export class SurvivalMode {
  private cachedStatus: SurvivalStatus | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(private client: DainClient) {}

  /**
   * Get current survival status
   */
  async getStatus(): Promise<SurvivalStatus> {
    // Use cached status if recent
    if (this.cachedStatus && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return this.cachedStatus;
    }

    const response = await this.client.request<SurvivalStatus>(
      'GET',
      '/api/v1/survival-mode/status'
    );

    if (response.success && response.data) {
      this.cachedStatus = response.data;
      this.lastFetch = Date.now();
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get survival status');
  }

  /**
   * Configure survival mode parameters
   */
  async configure(config: SurvivalConfig): Promise<void> {
    const response = await this.client.request(
      'PUT',
      '/api/v1/survival-mode/config',
      config
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to configure survival mode');
    }

    // Invalidate cache
    this.cachedStatus = null;
  }

  /**
   * Update the initial balance (resets health ratio calculation)
   */
  async updateInitialBalance(balance: number): Promise<void> {
    const response = await this.client.request(
      'PUT',
      '/api/v1/survival-mode/initial-balance',
      { balance }
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update initial balance');
    }

    this.cachedStatus = null;
  }

  /**
   * Check if a specific action is allowed in current survival state
   */
  canExecute(action: 'SWAP' | 'LIMIT_ORDER' | 'LEVERAGE_TRADE' | 'X402_PAYMENT'): boolean {
    if (!this.cachedStatus) {
      // If no cached status, assume SURVIVAL state (normal operations)
      return action !== 'X402_PAYMENT';
    }

    const { state, x402Enabled } = this.cachedStatus;

    switch (state) {
      case 'GROWTH':
        return true; // All actions allowed

      case 'SURVIVAL':
        return action !== 'X402_PAYMENT'; // X402 requires GROWTH state

      case 'DEFENSIVE':
        // Only conservative actions
        return action === 'SWAP';

      case 'CRITICAL':
        return false; // No trading allowed

      default:
        return false;
    }
  }

  /**
   * Get recommended position sizing based on survival state
   *
   * @param baseSize - The intended position size
   * @returns Adjusted size based on current survival state
   */
  getAdjustedPositionSize(baseSize: number): number {
    if (!this.cachedStatus) {
      return baseSize;
    }

    switch (this.cachedStatus.state) {
      case 'GROWTH':
        return baseSize * 1.5; // Can be more aggressive

      case 'SURVIVAL':
        return baseSize; // Normal sizing

      case 'DEFENSIVE':
        return baseSize * 0.5; // Reduce by 50%

      case 'CRITICAL':
        return 0; // No new positions

      default:
        return baseSize;
    }
  }

  /**
   * Get recommended max leverage based on survival state
   *
   * @param maxLeverage - The maximum allowed leverage
   * @returns Adjusted leverage based on survival state
   */
  getAdjustedLeverage(maxLeverage: number): number {
    if (!this.cachedStatus) {
      return maxLeverage;
    }

    switch (this.cachedStatus.state) {
      case 'GROWTH':
        return maxLeverage; // Full leverage allowed

      case 'SURVIVAL':
        return Math.min(maxLeverage, 20); // Cap at 20x

      case 'DEFENSIVE':
        return Math.min(maxLeverage, 5); // Cap at 5x

      case 'CRITICAL':
        return 1; // No leverage

      default:
        return maxLeverage;
    }
  }

  /**
   * Calculate health ratio from balances
   */
  calculateHealthRatio(currentBalance: number, initialBalance: number): number {
    if (initialBalance <= 0) return 0;
    return currentBalance / initialBalance;
  }

  /**
   * Determine survival state from health ratio
   */
  getStateFromHealthRatio(
    healthRatio: number,
    config?: {
      growthThreshold?: number;
      survivalThreshold?: number;
      defensiveThreshold?: number;
    }
  ): SurvivalState {
    const growth = config?.growthThreshold ?? 1.2;
    const survival = config?.survivalThreshold ?? 0.85;
    const defensive = config?.defensiveThreshold ?? 0.5;

    if (healthRatio >= growth) return 'GROWTH';
    if (healthRatio >= survival) return 'SURVIVAL';
    if (healthRatio >= defensive) return 'DEFENSIVE';
    return 'CRITICAL';
  }

  /**
   * Get human-readable description of survival state
   */
  getStateDescription(state: SurvivalState): string {
    const descriptions: Record<SurvivalState, string> = {
      GROWTH: 'Portfolio performing well. Aggressive strategies and X402 payments enabled.',
      SURVIVAL: 'Normal operations. Standard risk limits apply.',
      DEFENSIVE: 'Portfolio under pressure. Positions reduced by 50%, no new leverage.',
      CRITICAL: 'Capital preservation mode. All trading halted, positions being closed.',
    };
    return descriptions[state];
  }

  /**
   * Force refresh the cached status
   */
  invalidateCache(): void {
    this.cachedStatus = null;
  }
}

// Export thresholds for external use
export const SURVIVAL_THRESHOLDS = {
  GROWTH: 1.2,      // 120%
  SURVIVAL: 0.85,   // 85%
  DEFENSIVE: 0.5,   // 50%
  CRITICAL: 0,      // Below 50% is critical
} as const;
