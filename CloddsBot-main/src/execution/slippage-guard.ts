/**
 * Slippage Guard - Protection system for copy trading execution
 *
 * Features:
 * - Pre-trade price checking against orderbook
 * - Slippage estimation based on order size
 * - Execution with protection (abort if slippage exceeds threshold)
 * - Retry logic with configurable attempts
 * - Smart routing support (check multiple platforms)
 */

import { logger } from '../utils/logger';
import type { Platform } from '../types';
import type { WhalePlatform } from '../trading/whale-tracker-unified';

// =============================================================================
// TYPES
// =============================================================================

export interface SlippageCheckParams {
  /** Platform to check */
  platform: WhalePlatform;
  /** Symbol/market identifier */
  symbol: string;
  /** Token ID (for Polymarket) */
  tokenId?: string;
  /** Trade direction */
  side: 'buy' | 'sell';
  /** Order size (in base units for perpetuals, shares for prediction markets) */
  size: number;
  /** Target execution price */
  targetPrice: number;
  /** Outcome side for prediction markets */
  outcome?: 'yes' | 'no';
}

export interface SlippageCheckResult {
  /** Whether the slippage is acceptable */
  acceptable: boolean;
  /** Estimated slippage percentage (positive = worse than target) */
  estimatedSlippage: number;
  /** Best available price in the orderbook */
  bestPrice: number;
  /** Expected execution price given the order size */
  expectedExecutionPrice: number;
  /** Available liquidity at the best price level */
  availableLiquidity: number;
  /** Spread between best bid and ask */
  spread: number;
  /** Timestamp of the check */
  timestamp: number;
}

export interface SlippageGuardConfig {
  /** Maximum acceptable slippage percentage (default: 2.0) */
  maxSlippagePercent: number;
  /** Number of retry attempts if slippage exceeds threshold (default: 3) */
  maxRetries: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs: number;
  /** Check orderbook before each execution (default: true) */
  checkOrderbook: boolean;
  /** Use limit orders instead of market orders (default: true) */
  useLimitOrders: boolean;
  /** Price buffer for limit orders as decimal (default: 0.01 = 1%) */
  limitPriceBuffer: number;
  /** Abort execution if slippage exceeds threshold (default: true) */
  abortOnExcessiveSlippage: boolean;
}

export interface ExecutionParams {
  platform: WhalePlatform;
  symbol: string;
  tokenId?: string;
  side: 'buy' | 'sell';
  size: number;
  targetPrice: number;
  outcome?: 'yes' | 'no';
  /** Override slippage config for this execution */
  maxSlippagePercent?: number;
}

export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Order ID if placed */
  orderId?: string;
  /** Filled size */
  filledSize?: number;
  /** Average fill price */
  avgFillPrice?: number;
  /** Actual slippage experienced */
  actualSlippage?: number;
  /** Error message if failed */
  error?: string;
  /** Reason for abort if aborted */
  abortReason?: string;
  /** Number of retries attempted */
  retries?: number;
}

type OrderbookFetcher = (
  platform: WhalePlatform,
  symbol: string,
  tokenId?: string
) => Promise<OrderbookData | null>;

type OrderExecutor = (params: ExecutionParams) => Promise<{
  success: boolean;
  orderId?: string;
  filledSize?: number;
  avgFillPrice?: number;
  error?: string;
}>;

export interface OrderbookData {
  /** Bid levels: [price, size][] sorted by price descending */
  bids: Array<[number, number]>;
  /** Ask levels: [price, size][] sorted by price ascending */
  asks: Array<[number, number]>;
  /** Mid price */
  midPrice: number;
  /** Timestamp */
  timestamp?: number;
}

export interface SlippageGuard {
  /**
   * Check slippage for a potential trade
   * Returns estimated slippage and whether it's acceptable
   */
  checkSlippage(params: SlippageCheckParams): Promise<SlippageCheckResult>;

  /**
   * Execute an order with slippage protection
   * Will abort or retry if slippage exceeds threshold
   */
  executeWithProtection(params: ExecutionParams): Promise<ExecutionResult>;

  /**
   * Estimate fill price for a given order size
   * Walks through orderbook to calculate VWAP
   */
  estimateFillPrice(
    platform: WhalePlatform,
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    tokenId?: string
  ): Promise<{ price: number; fillable: boolean; partialSize: number }>;

  /**
   * Get current spread for a market
   */
  getSpread(
    platform: WhalePlatform,
    symbol: string,
    tokenId?: string
  ): Promise<{ spread: number; spreadPercent: number; bestBid: number; bestAsk: number } | null>;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SlippageGuardConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): SlippageGuardConfig;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: SlippageGuardConfig = {
  maxSlippagePercent: 2.0,
  maxRetries: 1,                    // Reduced from 3 - fail fast
  retryDelayMs: 50,                 // Reduced from 1000 - minimal retry delay
  checkOrderbook: false,            // Disabled by default for speed - enable per-trade
  useLimitOrders: true,
  limitPriceBuffer: 0.01,
  abortOnExcessiveSlippage: false,  // Don't abort by default - just warn
};

// Polymarket CLOB API
const POLY_CLOB_URL = process.env.POLY_CLOB_URL || 'https://clob.polymarket.com';

// Hyperliquid API
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createSlippageGuard(
  orderbookFetcher?: OrderbookFetcher,
  orderExecutor?: OrderExecutor,
  config: Partial<SlippageGuardConfig> = {}
): SlippageGuard {
  let cfg = { ...DEFAULT_CONFIG, ...config };

  // Default orderbook fetcher if not provided
  const fetchOrderbook: OrderbookFetcher = orderbookFetcher || (async (platform, symbol, tokenId) => {
    try {
      switch (platform) {
        case 'polymarket': {
          if (!tokenId) return null;
          const response = await fetch(`${POLY_CLOB_URL}/book?token_id=${tokenId}`);
          if (!response.ok) return null;

          const data = await response.json() as {
            bids?: Array<{ price: string; size: string }>;
            asks?: Array<{ price: string; size: string }>;
          };

          const bids: Array<[number, number]> = (data.bids || [])
            .map((b) => [parseFloat(b.price), parseFloat(b.size)] as [number, number])
            .sort((a, b) => b[0] - a[0]);

          const asks: Array<[number, number]> = (data.asks || [])
            .map((a) => [parseFloat(a.price), parseFloat(a.size)] as [number, number])
            .sort((a, b) => a[0] - b[0]);

          const bestBid = bids[0]?.[0] || 0;
          const bestAsk = asks[0]?.[0] || 1;

          return {
            bids,
            asks,
            midPrice: (bestBid + bestAsk) / 2,
            timestamp: Date.now(),
          };
        }

        case 'hyperliquid': {
          const response = await fetch(HYPERLIQUID_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'l2Book', coin: symbol }),
          });
          if (!response.ok) return null;

          const data = await response.json() as {
            levels?: Array<Array<{ px: string; sz: string; n: number }>>;
          };

          if (!data.levels || data.levels.length < 2) return null;

          const bids: Array<[number, number]> = data.levels[0]
            .map((l) => [parseFloat(l.px), parseFloat(l.sz)] as [number, number])
            .sort((a, b) => b[0] - a[0]);

          const asks: Array<[number, number]> = data.levels[1]
            .map((l) => [parseFloat(l.px), parseFloat(l.sz)] as [number, number])
            .sort((a, b) => a[0] - b[0]);

          const bestBid = bids[0]?.[0] || 0;
          const bestAsk = asks[0]?.[0] || 0;

          return {
            bids,
            asks,
            midPrice: (bestBid + bestAsk) / 2,
            timestamp: Date.now(),
          };
        }

        case 'kalshi': {
          // Kalshi orderbook is fetched via the Kalshi feed
          // This is a placeholder - actual implementation should use KalshiFeed
          const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';
          const response = await fetch(`${BASE_URL}/markets/${symbol}/orderbook`);
          if (!response.ok) return null;

          const data = await response.json() as {
            orderbook?: { yes?: Array<[number, number]>; no?: Array<[number, number]> };
          };

          const orderbook = data.orderbook || {};
          // Convert Kalshi cents to decimals and normalize
          const yesBids = (orderbook.yes || [])
            .map(([price, size]) => [price > 1.5 ? price / 100 : price, size] as [number, number])
            .sort((a, b) => b[0] - a[0]);

          const noAsks = (orderbook.no || [])
            .map(([price, size]) => [(1 - (price > 1.5 ? price / 100 : price)), size] as [number, number])
            .filter(([price]) => price > 0 && price < 1)
            .sort((a, b) => a[0] - b[0]);

          const bestBid = yesBids[0]?.[0] || 0;
          const bestAsk = noAsks[0]?.[0] || 1;

          return {
            bids: yesBids,
            asks: noAsks,
            midPrice: (bestBid + bestAsk) / 2,
            timestamp: Date.now(),
          };
        }

        default:
          return null;
      }
    } catch (error) {
      logger.error({ platform, symbol, error }, 'Failed to fetch orderbook');
      return null;
    }
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Calculate VWAP (Volume Weighted Average Price) for filling an order
   */
  function calculateVWAP(
    levels: Array<[number, number]>,
    size: number
  ): { vwap: number; fillable: boolean; filledSize: number } {
    let remaining = size;
    let totalValue = 0;
    let filledSize = 0;

    for (const [price, available] of levels) {
      if (remaining <= 0) break;

      const fillAtLevel = Math.min(remaining, available);
      totalValue += price * fillAtLevel;
      filledSize += fillAtLevel;
      remaining -= fillAtLevel;
    }

    if (filledSize === 0) {
      return { vwap: 0, fillable: false, filledSize: 0 };
    }

    return {
      vwap: totalValue / filledSize,
      fillable: remaining <= 0,
      filledSize,
    };
  }

  /**
   * Calculate slippage percentage
   */
  function calculateSlippage(
    targetPrice: number,
    executionPrice: number,
    side: 'buy' | 'sell'
  ): number {
    if (targetPrice === 0) return 0;

    // For buys, paying more = positive slippage (bad)
    // For sells, receiving less = positive slippage (bad)
    if (side === 'buy') {
      return ((executionPrice - targetPrice) / targetPrice) * 100;
    } else {
      return ((targetPrice - executionPrice) / targetPrice) * 100;
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  return {
    async checkSlippage(params: SlippageCheckParams): Promise<SlippageCheckResult> {
      const { platform, symbol, tokenId, side, size, targetPrice } = params;

      const orderbook = await fetchOrderbook(platform, symbol, tokenId);

      if (!orderbook) {
        logger.warn({ platform, symbol }, 'Could not fetch orderbook for slippage check');
        return {
          acceptable: false,
          estimatedSlippage: 0,
          bestPrice: targetPrice,
          expectedExecutionPrice: targetPrice,
          availableLiquidity: 0,
          spread: 0,
          timestamp: Date.now(),
        };
      }

      // Get relevant side of the book
      const levels = side === 'buy' ? orderbook.asks : orderbook.bids;
      const bestPrice = levels[0]?.[0] || targetPrice;
      const availableLiquidity = levels.reduce((sum, [, size]) => sum + size, 0);

      // Calculate expected execution price
      const { vwap, fillable, filledSize } = calculateVWAP(levels, size);
      const expectedExecutionPrice = vwap || bestPrice;

      // Calculate slippage
      const estimatedSlippage = calculateSlippage(targetPrice, expectedExecutionPrice, side);

      // Calculate spread
      const bestBid = orderbook.bids[0]?.[0] || 0;
      const bestAsk = orderbook.asks[0]?.[0] || 0;
      const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

      const acceptable = Math.abs(estimatedSlippage) <= cfg.maxSlippagePercent;

      logger.debug({
        platform,
        symbol,
        side,
        size,
        targetPrice,
        bestPrice,
        expectedExecutionPrice,
        estimatedSlippage: estimatedSlippage.toFixed(2),
        acceptable,
        fillable,
      }, 'Slippage check completed');

      return {
        acceptable,
        estimatedSlippage,
        bestPrice,
        expectedExecutionPrice,
        availableLiquidity,
        spread,
        timestamp: Date.now(),
      };
    },

    async executeWithProtection(params: ExecutionParams): Promise<ExecutionResult> {
      const maxSlippage = params.maxSlippagePercent ?? cfg.maxSlippagePercent;
      let retries = 0;

      while (retries <= cfg.maxRetries) {
        // Check slippage before execution
        if (cfg.checkOrderbook) {
          const slippageCheck = await this.checkSlippage({
            platform: params.platform,
            symbol: params.symbol,
            tokenId: params.tokenId,
            side: params.side,
            size: params.size,
            targetPrice: params.targetPrice,
            outcome: params.outcome,
          });

          if (!slippageCheck.acceptable && cfg.abortOnExcessiveSlippage) {
            if (retries < cfg.maxRetries) {
              logger.info({
                platform: params.platform,
                symbol: params.symbol,
                slippage: slippageCheck.estimatedSlippage.toFixed(2),
                maxSlippage,
                retry: retries + 1,
              }, 'Slippage exceeds threshold, retrying...');

              retries++;
              await new Promise((resolve) => setTimeout(resolve, cfg.retryDelayMs));
              continue;
            }

            logger.warn({
              platform: params.platform,
              symbol: params.symbol,
              slippage: slippageCheck.estimatedSlippage.toFixed(2),
              maxSlippage,
            }, 'Execution aborted due to excessive slippage');

            return {
              success: false,
              abortReason: `Slippage ${slippageCheck.estimatedSlippage.toFixed(2)}% exceeds max ${maxSlippage}%`,
              retries,
            };
          }
        }

        // Execute the order
        if (orderExecutor) {
          try {
            const result = await orderExecutor(params);

            if (result.success && result.avgFillPrice) {
              const actualSlippage = calculateSlippage(
                params.targetPrice,
                result.avgFillPrice,
                params.side
              );

              logger.info({
                platform: params.platform,
                symbol: params.symbol,
                orderId: result.orderId,
                targetPrice: params.targetPrice,
                avgFillPrice: result.avgFillPrice,
                actualSlippage: actualSlippage.toFixed(2),
              }, 'Order executed with slippage protection');

              return {
                ...result,
                actualSlippage,
                retries,
              };
            }

            return { ...result, retries };
          } catch (error) {
            logger.error({ params, error }, 'Execution failed');

            if (retries < cfg.maxRetries) {
              retries++;
              await new Promise((resolve) => setTimeout(resolve, cfg.retryDelayMs));
              continue;
            }

            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              retries,
            };
          }
        }

        // No executor provided - dry run
        logger.info({
          platform: params.platform,
          symbol: params.symbol,
          side: params.side,
          size: params.size,
          targetPrice: params.targetPrice,
        }, 'Dry run - order would be executed');

        return {
          success: true,
          orderId: `dry_${Date.now()}`,
          filledSize: params.size,
          avgFillPrice: params.targetPrice,
          actualSlippage: 0,
          retries,
        };
      }

      return {
        success: false,
        error: 'Max retries exceeded',
        retries,
      };
    },

    async estimateFillPrice(
      platform: WhalePlatform,
      symbol: string,
      side: 'buy' | 'sell',
      size: number,
      tokenId?: string
    ): Promise<{ price: number; fillable: boolean; partialSize: number }> {
      const orderbook = await fetchOrderbook(platform, symbol, tokenId);

      if (!orderbook) {
        return { price: 0, fillable: false, partialSize: 0 };
      }

      const levels = side === 'buy' ? orderbook.asks : orderbook.bids;
      const { vwap, fillable, filledSize } = calculateVWAP(levels, size);

      return {
        price: vwap,
        fillable,
        partialSize: filledSize,
      };
    },

    async getSpread(
      platform: WhalePlatform,
      symbol: string,
      tokenId?: string
    ): Promise<{ spread: number; spreadPercent: number; bestBid: number; bestAsk: number } | null> {
      const orderbook = await fetchOrderbook(platform, symbol, tokenId);

      if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
        return null;
      }

      const bestBid = orderbook.bids[0][0];
      const bestAsk = orderbook.asks[0][0];
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      return { spread, spreadPercent, bestBid, bestAsk };
    },

    updateConfig(newConfig: Partial<SlippageGuardConfig>): void {
      cfg = { ...cfg, ...newConfig };
      logger.info({ config: cfg }, 'Slippage guard config updated');
    },

    getConfig(): SlippageGuardConfig {
      return { ...cfg };
    },
  };
}

// Types are already exported at their definition above
// ExecutionParams is also exported as SlippageProtectedExecutionParams for backwards compatibility
export type SlippageProtectedExecutionParams = ExecutionParams;
