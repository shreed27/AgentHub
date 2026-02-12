/**
 * Kalshi Whale Momentum Detector - Orderbook momentum pattern detection
 *
 * Since Kalshi doesn't expose wallet addresses, we detect whale activity through
 * orderbook momentum patterns:
 * - Rapid price movement (>2% in <30 seconds)
 * - Volume spikes (5x average volume)
 * - Orderbook imbalance (bid/ask ratio shifts >3:1)
 * - Large order detection (single order >$5k appearing)
 *
 * Emits MomentumSignal events that can trigger copy trading.
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../../utils/logger';
import type { MomentumSignal, WhaleTrade, WhalePosition, PlatformWhaleTracker, ConnectionState } from '../../trading/whale-tracker-unified';
import type { KalshiFeed, KalshiOrderbookDelta, KalshiTradeEvent, KalshiOrderbookSnapshot } from './index';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Scoring weights for momentum detection */
const MOMENTUM_WEIGHTS = {
  priceMovement: 0.30,      // 2%+ = max points
  volumeSpike: 0.30,        // 5x+ = max points
  orderbookImbalance: 0.25, // 3:1+ = max points
  largeOrders: 0.15,        // >$5k = max points
};

/** Default configuration - optimized for low latency */
const DEFAULT_CONFIG = {
  /** Minimum confidence to emit signal (0-100) */
  minConfidence: 65,               // Reduced from 70 - faster trigger
  /** Price change threshold for max score (percentage) */
  priceChangeThreshold: 1.5,       // Reduced from 2.0 - more sensitive
  /** Time window for price change detection (ms) */
  priceTimeWindowMs: 15000,        // Reduced from 30000 - faster detection
  /** Volume multiple for max score */
  volumeSpikeThreshold: 3.0,       // Reduced from 5.0 - more sensitive
  /** Orderbook imbalance ratio for max score */
  imbalanceThreshold: 2.5,         // Reduced from 3.0 - more sensitive
  /** Large order size threshold (USD) */
  largeOrderThreshold: 3000,       // Reduced from 5000 - catch smaller whales
  /** Volume averaging window (number of candles) */
  volumeWindowSize: 10,            // Reduced from 20 - faster adaptation
  /** Cooldown between signals for same market (ms) */
  signalCooldownMs: 10000,         // Reduced from 60000 - faster re-trigger
};

// =============================================================================
// TYPES
// =============================================================================

export interface KalshiMomentumConfig {
  /** Minimum confidence to emit signal (0-100) */
  minConfidence?: number;
  /** Price change threshold for max score (percentage) */
  priceChangeThreshold?: number;
  /** Time window for price change detection (ms) */
  priceTimeWindowMs?: number;
  /** Volume multiple for max score */
  volumeSpikeThreshold?: number;
  /** Orderbook imbalance ratio for max score */
  imbalanceThreshold?: number;
  /** Large order size threshold (USD) */
  largeOrderThreshold?: number;
  /** Signal cooldown (ms) */
  signalCooldownMs?: number;
  /** Ultra-low latency mode - emit signals immediately on first trigger */
  ultraLowLatency?: boolean;
}

interface MarketState {
  ticker: string;
  /** Price history: [timestamp, price][] */
  priceHistory: Array<[number, number]>;
  /** Volume history: [timestamp, volume][] */
  volumeHistory: Array<[number, number]>;
  /** Current orderbook state */
  orderbook: {
    yesTotal: number;
    noTotal: number;
    bestYesBid: number;
    bestNoAsk: number;
  };
  /** Last signal timestamp */
  lastSignalTime: number;
  /** Current momentum signal (if any) */
  currentSignal: MomentumSignal | null;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createKalshiMomentumDetector(
  kalshiFeed: KalshiFeed,
  config: KalshiMomentumConfig = {}
): PlatformWhaleTracker {
  const emitter = new EventEmitter() as PlatformWhaleTracker;

  // Merge config with defaults
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // State
  let running = false;
  let connectionState: ConnectionState = 'disconnected';
  const marketStates = new Map<string, MarketState>();
  const recentSignals: MomentumSignal[] = [];
  const recentTrades: WhaleTrade[] = [];

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  function getOrCreateMarketState(ticker: string): MarketState {
    let state = marketStates.get(ticker);
    if (!state) {
      state = {
        ticker,
        priceHistory: [],
        volumeHistory: [],
        orderbook: {
          yesTotal: 0,
          noTotal: 0,
          bestYesBid: 0,
          bestNoAsk: 1,
        },
        lastSignalTime: 0,
        currentSignal: null,
      };
      marketStates.set(ticker, state);
    }
    return state;
  }

  function calculatePriceMovementScore(state: MarketState): number {
    const now = Date.now();
    const windowStart = now - cfg.priceTimeWindowMs;

    // Get prices within the time window
    const recentPrices = state.priceHistory.filter(([ts]) => ts >= windowStart);

    if (recentPrices.length < 2) return 0;

    const oldestPrice = recentPrices[0][1];
    const newestPrice = recentPrices[recentPrices.length - 1][1];

    if (oldestPrice === 0) return 0;

    const priceChange = Math.abs((newestPrice - oldestPrice) / oldestPrice) * 100;

    // Score: 0 at 0% change, 1 at threshold
    return Math.min(1, priceChange / cfg.priceChangeThreshold);
  }

  function calculateVolumeSpikeScore(state: MarketState): number {
    if (state.volumeHistory.length < 2) return 0;

    const recentVolumes = state.volumeHistory.slice(-cfg.volumeWindowSize);
    if (recentVolumes.length < 5) return 0;

    // Calculate average excluding the latest
    const historical = recentVolumes.slice(0, -1);
    const avgVolume = historical.reduce((sum, [, v]) => sum + v, 0) / historical.length;

    if (avgVolume === 0) return 0;

    const latestVolume = recentVolumes[recentVolumes.length - 1][1];
    const volumeMultiple = latestVolume / avgVolume;

    // Score: 0 at 1x, 1 at threshold
    return Math.min(1, Math.max(0, (volumeMultiple - 1) / (cfg.volumeSpikeThreshold - 1)));
  }

  function calculateOrderbookImbalanceScore(state: MarketState): number {
    const { yesTotal, noTotal } = state.orderbook;

    if (yesTotal === 0 && noTotal === 0) return 0;

    // Calculate imbalance ratio
    const ratio = yesTotal > noTotal
      ? yesTotal / (noTotal || 0.01)
      : noTotal / (yesTotal || 0.01);

    // Score: 0 at 1:1, 1 at threshold ratio
    return Math.min(1, Math.max(0, (ratio - 1) / (cfg.imbalanceThreshold - 1)));
  }

  function calculateLargeOrderScore(state: MarketState): number {
    // This is calculated per-order in the orderbook delta handler
    // For now, check if any recent large orders exist
    const recentLargeOrders = state.priceHistory.filter(([ts]) => {
      return Date.now() - ts < 60000; // Last minute
    });

    // If we have recent activity with significant orderbook changes, score higher
    if (recentLargeOrders.length > 5) {
      return 0.7; // High activity
    } else if (recentLargeOrders.length > 2) {
      return 0.4; // Moderate activity
    }

    return 0;
  }

  function calculateMomentumSignal(state: MarketState): MomentumSignal | null {
    // Check cooldown
    if (Date.now() - state.lastSignalTime < cfg.signalCooldownMs) {
      return null;
    }

    // Calculate component scores
    const priceMovement = calculatePriceMovementScore(state);
    const volumeSpike = calculateVolumeSpikeScore(state);
    const orderbookImbalance = calculateOrderbookImbalanceScore(state);
    const largeOrders = calculateLargeOrderScore(state);

    // Calculate weighted confidence
    const confidence = Math.round(
      (priceMovement * MOMENTUM_WEIGHTS.priceMovement +
        volumeSpike * MOMENTUM_WEIGHTS.volumeSpike +
        orderbookImbalance * MOMENTUM_WEIGHTS.orderbookImbalance +
        largeOrders * MOMENTUM_WEIGHTS.largeOrders) * 100
    );

    if (confidence < cfg.minConfidence) {
      return null;
    }

    // Determine direction based on orderbook imbalance and price movement
    const recentPrices = state.priceHistory.slice(-10);
    const priceDirection = recentPrices.length >= 2
      ? recentPrices[recentPrices.length - 1][1] - recentPrices[0][1]
      : 0;

    const direction: 'bullish' | 'bearish' = priceDirection >= 0
      ? 'bullish'
      : 'bearish';

    // Calculate price change
    const priceChange = recentPrices.length >= 2 && recentPrices[0][1] > 0
      ? ((recentPrices[recentPrices.length - 1][1] - recentPrices[0][1]) /
          recentPrices[0][1]) * 100
      : 0;

    const signal: MomentumSignal = {
      market: state.ticker,
      direction,
      confidence,
      priceChange,
      volumeMultiple: volumeSpike * cfg.volumeSpikeThreshold,
      orderbookImbalance: orderbookImbalance * cfg.imbalanceThreshold,
      triggerTime: new Date(),
      components: {
        priceMovement,
        volumeSpike,
        orderbookImbalance,
        largeOrders,
      },
    };

    return signal;
  }

  function convertSignalToWhaleTrade(
    signal: MomentumSignal,
    marketQuestion?: string
  ): WhaleTrade {
    return {
      id: `kalshi_momentum_${signal.market}_${signal.triggerTime.getTime()}`,
      platform: 'kalshi',
      walletAddress: null, // Kalshi doesn't expose wallet addresses
      timestamp: signal.triggerTime,
      symbol: signal.market,
      marketQuestion,
      side: signal.direction === 'bullish' ? 'buy' : 'sell',
      size: 0, // Unknown for momentum signals
      price: 0, // Would need to fetch current price
      usdValue: 0, // Unknown for momentum signals
      confidence: signal.confidence,
    };
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  function handlePriceUpdate(ticker: string, price: number): void {
    const state = getOrCreateMarketState(ticker);

    state.priceHistory.push([Date.now(), price]);

    // Keep only last 5 minutes of price history
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    state.priceHistory = state.priceHistory.filter(([ts]) => ts > fiveMinutesAgo);

    // Check for momentum signal
    const signal = calculateMomentumSignal(state);
    if (signal) {
      state.lastSignalTime = Date.now();
      state.currentSignal = signal;

      recentSignals.unshift(signal);
      if (recentSignals.length > 100) {
        recentSignals.pop();
      }

      logger.info({
        market: signal.market,
        direction: signal.direction,
        confidence: signal.confidence,
        priceChange: signal.priceChange.toFixed(2),
        components: signal.components,
      }, 'Kalshi: Momentum signal detected');

      emitter.emit('momentumSignal', signal);

      // Also emit as a "trade" for unified tracking
      const whaleTrade = convertSignalToWhaleTrade(signal);
      recentTrades.unshift(whaleTrade);
      if (recentTrades.length > 500) {
        recentTrades.pop();
      }
      emitter.emit('trade', whaleTrade);
    }
  }

  function handleTradeEvent(event: KalshiTradeEvent): void {
    const state = getOrCreateMarketState(event.marketId);

    // Record volume
    state.volumeHistory.push([Date.now(), event.count]);

    // Keep only recent volume history
    if (state.volumeHistory.length > 100) {
      state.volumeHistory = state.volumeHistory.slice(-50);
    }

    // Update price
    handlePriceUpdate(event.marketId, event.price);
  }

  function handleOrderbookSnapshot(snapshot: KalshiOrderbookSnapshot): void {
    const state = getOrCreateMarketState(snapshot.marketId);

    // Calculate totals
    let yesTotal = 0;
    let noTotal = 0;

    for (const [, size] of snapshot.yes) {
      yesTotal += size;
    }
    for (const [, size] of snapshot.no) {
      noTotal += size;
    }

    state.orderbook.yesTotal = yesTotal;
    state.orderbook.noTotal = noTotal;

    if (snapshot.yes.length > 0) {
      state.orderbook.bestYesBid = snapshot.yes.sort((a, b) => b[0] - a[0])[0][0];
    }
    if (snapshot.no.length > 0) {
      state.orderbook.bestNoAsk = 1 - snapshot.no.sort((a, b) => b[0] - a[0])[0][0];
    }
  }

  function handleOrderbookDelta(delta: KalshiOrderbookDelta): void {
    const state = getOrCreateMarketState(delta.marketId);

    // Update orderbook totals
    if (delta.side === 'yes') {
      state.orderbook.yesTotal = Math.max(0, state.orderbook.yesTotal + delta.delta);
    } else {
      state.orderbook.noTotal = Math.max(0, state.orderbook.noTotal + delta.delta);
    }

    // Check for large order (could indicate whale activity)
    if (Math.abs(delta.delta) >= cfg.largeOrderThreshold) {
      logger.debug({
        market: delta.marketId,
        side: delta.side,
        delta: delta.delta,
      }, 'Kalshi: Large order detected');

      // Record as activity
      const price = state.priceHistory.length > 0
        ? state.priceHistory[state.priceHistory.length - 1][1]
        : 0.5;
      handlePriceUpdate(delta.marketId, price);
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  Object.defineProperty(emitter, 'platform', {
    value: 'kalshi' as const,
    writable: false,
    enumerable: true,
  });

  Object.assign(emitter, {
    async start(): Promise<void> {
      if (running) return;
      running = true;

      logger.info({ config: cfg }, 'Starting Kalshi momentum detector');

      // Connect to Kalshi feed
      await kalshiFeed.connect();

      // Listen for events
      kalshiFeed.on('price', (update: { marketId: string; price: number }) => {
        handlePriceUpdate(update.marketId, update.price);
      });

      kalshiFeed.on('trade', handleTradeEvent);
      kalshiFeed.on('orderbook_snapshot', handleOrderbookSnapshot);
      kalshiFeed.on('orderbook_delta', handleOrderbookDelta);

      kalshiFeed.on('connected', () => {
        connectionState = 'connected';
        emitter.emit('connectionState', connectionState);
      });

      kalshiFeed.on('disconnected', () => {
        connectionState = 'disconnected';
        emitter.emit('connectionState', connectionState);
      });

      connectionState = 'connected';
      emitter.emit('connectionState', connectionState);
    },

    stop(): void {
      if (!running) return;
      running = false;

      logger.info('Stopping Kalshi momentum detector');
      kalshiFeed.disconnect();

      connectionState = 'disconnected';
      emitter.emit('connectionState', connectionState);
    },

    isRunning(): boolean {
      return running;
    },

    trackAddress(_address: string): void {
      // Kalshi doesn't support wallet tracking
      logger.warn('Kalshi momentum detector does not support wallet tracking');
    },

    untrackAddress(_address: string): void {
      // No-op
    },

    getConnectionState(): ConnectionState {
      return connectionState;
    },

    getRecentTrades(limit = 100): WhaleTrade[] {
      return recentTrades.slice(0, limit);
    },

    async getPositions(_address: string): Promise<WhalePosition[]> {
      // Kalshi doesn't expose position data by wallet
      return [];
    },

    /**
     * Subscribe to a specific market for momentum detection
     */
    trackMarket(ticker: string): void {
      getOrCreateMarketState(ticker);

      // Subscribe to market channels
      kalshiFeed.subscribeToMarket(ticker, ['ticker', 'trade', 'orderbook_delta']);

      logger.debug({ ticker }, 'Tracking Kalshi market for momentum');
    },

    /**
     * Unsubscribe from a market
     */
    untrackMarket(ticker: string): void {
      marketStates.delete(ticker);
      kalshiFeed.unsubscribeFromMarket(ticker);
    },

    /**
     * Get recent momentum signals
     */
    getRecentSignals(limit = 50): MomentumSignal[] {
      return recentSignals.slice(0, limit);
    },

    /**
     * Get current signal for a market (if any)
     */
    getCurrentSignal(ticker: string): MomentumSignal | null {
      return marketStates.get(ticker)?.currentSignal || null;
    },

    /**
     * Get all tracked markets
     */
    getTrackedMarkets(): string[] {
      return Array.from(marketStates.keys());
    },

    /**
     * Get market state for debugging
     */
    getMarketState(ticker: string): MarketState | undefined {
      return marketStates.get(ticker);
    },

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<KalshiMomentumConfig>): void {
      Object.assign(cfg, newConfig);
      logger.info({ config: cfg }, 'Kalshi momentum config updated');
    },

    /**
     * Get current configuration
     */
    getConfig(): KalshiMomentumConfig {
      return { ...cfg };
    },

    /**
     * Force check momentum for a market (useful for testing)
     */
    checkMomentum(ticker: string): MomentumSignal | null {
      const state = marketStates.get(ticker);
      if (!state) return null;
      return calculateMomentumSignal(state);
    },
  } as Partial<PlatformWhaleTracker>);

  return emitter;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MOMENTUM_WEIGHTS as KALSHI_MOMENTUM_WEIGHTS };
