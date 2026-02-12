/**
 * Unified Whale Tracker - Common interface for whale tracking across all platforms
 *
 * Aggregates trade signals from:
 * - Polymarket (wallet-based whale tracking)
 * - Hyperliquid (perpetuals whale tracking)
 * - Kalshi (orderbook momentum detection)
 *
 * Emits unified WhaleTrade events that can be consumed by the copy trading system.
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import type { Platform } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export type WhalePlatform = 'polymarket' | 'hyperliquid' | 'kalshi';

export interface WhaleTrade {
  /** Unique trade identifier */
  id: string;
  /** Platform where trade occurred */
  platform: WhalePlatform;
  /** Wallet address that made the trade (null for momentum-based signals) */
  walletAddress: string | null;
  /** Trade timestamp */
  timestamp: Date;
  /** Market/symbol identifier */
  symbol: string;
  /** Token ID (for Polymarket) or contract symbol (for perpetuals) */
  tokenId?: string;
  /** Market question or description */
  marketQuestion?: string;
  /** Trade direction */
  side: 'buy' | 'sell';
  /** Trade size in native units (shares/contracts) */
  size: number;
  /** Execution price */
  price: number;
  /** USD value of the trade */
  usdValue: number;
  /** Whether this was a liquidation (for perpetuals) */
  isLiquidation?: boolean;
  /** Leverage used (for perpetuals) */
  leverage?: number;
  /** Margin type (for perpetuals) */
  marginType?: 'cross' | 'isolated';
  /** Entry price of the position (for perpetuals) */
  entryPrice?: number;
  /** Position size after trade (for perpetuals) */
  positionSize?: number;
  /** Unrealized PnL (for perpetuals) */
  unrealizedPnl?: number;
  /** Signal confidence for momentum-based detection (0-100) */
  confidence?: number;
  /** Raw data from the source platform */
  raw?: unknown;
}

export interface WhalePosition {
  /** Platform */
  platform: WhalePlatform;
  /** Wallet address */
  walletAddress: string;
  /** Symbol/market identifier */
  symbol: string;
  /** Position side */
  side: 'long' | 'short';
  /** Position size */
  size: number;
  /** Entry price */
  entryPrice: number;
  /** Current mark price */
  markPrice: number;
  /** Leverage (for perpetuals) */
  leverage?: number;
  /** Unrealized PnL */
  unrealizedPnl: number;
  /** Margin used */
  margin?: number;
  /** Last updated */
  lastUpdated: Date;
}

export interface WhaleProfile {
  /** Wallet address */
  walletAddress: string;
  /** Platforms this whale is active on */
  platforms: WhalePlatform[];
  /** Total value across all platforms */
  totalValue: number;
  /** Win rate (0-100) */
  winRate: number;
  /** Average return per trade */
  avgReturn: number;
  /** Total trades tracked */
  totalTrades: number;
  /** Recent trades */
  recentTrades: WhaleTrade[];
  /** Active positions */
  positions: WhalePosition[];
  /** First seen timestamp */
  firstSeen: Date;
  /** Last active timestamp */
  lastActive: Date;
  /** Performance by platform */
  platformPerformance: Map<WhalePlatform, {
    trades: number;
    wins: number;
    losses: number;
    totalPnl: number;
  }>;
}

export interface WhaleTrackerConfig {
  /** Platforms to track */
  platforms: WhalePlatform[];
  /** Minimum trade size in USD to track */
  minTradeSize: number;
  /** Specific wallet addresses to follow */
  trackedWallets: string[];
  /** Auto-discover large traders above threshold */
  autoDiscovery: boolean;
  /** Threshold multiplier for auto-discovery (e.g., 5x minTradeSize) */
  autoDiscoveryMultiplier: number;
  /** Minimum confidence for momentum signals (Kalshi) */
  minMomentumConfidence: number;
  /** Enable real-time WebSocket connections */
  enableRealtime: boolean;
}

export interface UnifiedWhaleTrackerEvents {
  /** New whale trade detected */
  trade: (trade: WhaleTrade) => void;
  /** New position opened by a whale */
  positionOpened: (position: WhalePosition) => void;
  /** Position closed by a whale */
  positionClosed: (position: WhalePosition, pnl: number) => void;
  /** Position size changed */
  positionChanged: (position: WhalePosition, change: number) => void;
  /** New whale discovered */
  newWhale: (profile: WhaleProfile) => void;
  /** Momentum signal detected (Kalshi) */
  momentumSignal: (signal: MomentumSignal) => void;
  /** Connection state changed for a platform */
  connectionState: (platform: WhalePlatform, state: ConnectionState) => void;
  /** Error occurred */
  error: (error: Error, platform?: WhalePlatform) => void;
}

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface MomentumSignal {
  /** Market identifier */
  market: string;
  /** Signal direction */
  direction: 'bullish' | 'bearish';
  /** Confidence score (0-100) */
  confidence: number;
  /** Price change percentage */
  priceChange: number;
  /** Volume compared to average */
  volumeMultiple: number;
  /** Orderbook bid/ask imbalance ratio */
  orderbookImbalance: number;
  /** Trigger timestamp */
  triggerTime: Date;
  /** Components that contributed to the signal */
  components: {
    priceMovement: number;
    volumeSpike: number;
    orderbookImbalance: number;
    largeOrders: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: WhaleTrackerConfig = {
  platforms: ['polymarket', 'hyperliquid', 'kalshi'],
  minTradeSize: 10000,
  trackedWallets: [],
  autoDiscovery: true,
  autoDiscoveryMultiplier: 5,
  minMomentumConfidence: 70,
  enableRealtime: true,
};

// =============================================================================
// UNIFIED WHALE TRACKER INTERFACE
// =============================================================================

export interface UnifiedWhaleTracker extends EventEmitter<keyof UnifiedWhaleTrackerEvents> {
  /** Start tracking on all configured platforms */
  start(): Promise<void>;
  /** Stop all tracking */
  stop(): void;
  /** Check if tracker is running */
  isRunning(): boolean;

  /** Track a specific wallet address */
  trackAddress(address: string, platforms?: WhalePlatform[]): void;
  /** Stop tracking a wallet address */
  untrackAddress(address: string): void;
  /** Get all tracked wallet addresses */
  getTrackedAddresses(): string[];

  /** Get all known whale profiles */
  getWhaleProfiles(): WhaleProfile[];
  /** Get a specific whale profile */
  getWhaleProfile(address: string): WhaleProfile | undefined;
  /** Get top whales by value */
  getTopWhales(limit?: number): WhaleProfile[];
  /** Get profitable whales for copy trading */
  getProfitableWhales(minWinRate?: number, minTrades?: number): WhaleProfile[];

  /** Get recent trades across all platforms */
  getRecentTrades(limit?: number): WhaleTrade[];
  /** Get trades for a specific platform */
  getTradesByPlatform(platform: WhalePlatform, limit?: number): WhaleTrade[];
  /** Get trades for a specific wallet */
  getTradesByWallet(address: string, limit?: number): WhaleTrade[];

  /** Get active positions across all platforms */
  getActivePositions(): WhalePosition[];
  /** Get positions for a specific platform */
  getPositionsByPlatform(platform: WhalePlatform): WhalePosition[];
  /** Get positions for a specific wallet */
  getPositionsByWallet(address: string): WhalePosition[];

  /** Get connection state for a platform */
  getConnectionState(platform: WhalePlatform): ConnectionState;

  /** Update configuration */
  updateConfig(config: Partial<WhaleTrackerConfig>): void;
  /** Get current configuration */
  getConfig(): WhaleTrackerConfig;

  /** Register a platform tracker (for extensibility) */
  registerPlatformTracker(platform: WhalePlatform, tracker: PlatformWhaleTracker): void;

  /** Calculate signal strength for a whale */
  calculateSignalStrength(profile: WhaleProfile): number;
}

// =============================================================================
// PLATFORM TRACKER INTERFACE
// =============================================================================

export interface PlatformWhaleTracker extends EventEmitter {
  /** Platform identifier */
  readonly platform: WhalePlatform;

  /** Start the tracker */
  start(): Promise<void>;
  /** Stop the tracker */
  stop(): void;
  /** Check if running */
  isRunning(): boolean;

  /** Track a specific address */
  trackAddress(address: string): void;
  /** Untrack an address */
  untrackAddress(address: string): void;

  /** Get connection state */
  getConnectionState(): ConnectionState;

  /** Get recent trades */
  getRecentTrades(limit?: number): WhaleTrade[];
  /** Get active positions for an address */
  getPositions(address: string): Promise<WhalePosition[]>;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createUnifiedWhaleTracker(
  config: Partial<WhaleTrackerConfig> = {}
): UnifiedWhaleTracker {
  const emitter = new EventEmitter() as UnifiedWhaleTracker;
  let cfg = { ...DEFAULT_CONFIG, ...config };
  let running = false;

  // Platform trackers
  const platformTrackers = new Map<WhalePlatform, PlatformWhaleTracker>();

  // Aggregated state
  const whaleProfiles = new Map<string, WhaleProfile>();
  const recentTrades: WhaleTrade[] = [];
  const activePositions = new Map<string, WhalePosition>();
  const trackedAddresses = new Set<string>(cfg.trackedWallets);
  const connectionStates = new Map<WhalePlatform, ConnectionState>();

  // Performance tracking
  const performanceByWallet = new Map<string, {
    wins: number;
    losses: number;
    totalPnl: number;
    trades: number;
  }>();

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  function getOrCreateWhaleProfile(address: string): WhaleProfile {
    let profile = whaleProfiles.get(address);
    if (!profile) {
      profile = {
        walletAddress: address,
        platforms: [],
        totalValue: 0,
        winRate: 0,
        avgReturn: 0,
        totalTrades: 0,
        recentTrades: [],
        positions: [],
        firstSeen: new Date(),
        lastActive: new Date(),
        platformPerformance: new Map(),
      };
      whaleProfiles.set(address, profile);
    }
    return profile;
  }

  function updateWhaleProfile(trade: WhaleTrade): void {
    if (!trade.walletAddress) return;

    const profile = getOrCreateWhaleProfile(trade.walletAddress);
    profile.lastActive = new Date();
    profile.totalTrades++;

    // Add platform if not already tracked
    if (!profile.platforms.includes(trade.platform)) {
      profile.platforms.push(trade.platform);
    }

    // Update recent trades
    profile.recentTrades.unshift(trade);
    if (profile.recentTrades.length > 100) {
      profile.recentTrades.pop();
    }

    // Update platform performance
    let platformPerf = profile.platformPerformance.get(trade.platform);
    if (!platformPerf) {
      platformPerf = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
      profile.platformPerformance.set(trade.platform, platformPerf);
    }
    platformPerf.trades++;
  }

  function recordClosedPosition(address: string, pnl: number, platform: WhalePlatform): void {
    const profile = whaleProfiles.get(address);
    if (!profile) return;

    // Update overall performance
    let perf = performanceByWallet.get(address);
    if (!perf) {
      perf = { wins: 0, losses: 0, totalPnl: 0, trades: 0 };
      performanceByWallet.set(address, perf);
    }

    perf.trades++;
    perf.totalPnl += pnl;
    if (pnl > 0) {
      perf.wins++;
    } else {
      perf.losses++;
    }

    // Update profile
    profile.winRate = perf.trades > 0 ? (perf.wins / perf.trades) * 100 : 0;
    profile.avgReturn = perf.trades > 0 ? perf.totalPnl / perf.trades : 0;

    // Update platform performance
    const platformPerf = profile.platformPerformance.get(platform);
    if (platformPerf) {
      if (pnl > 0) {
        platformPerf.wins++;
      } else {
        platformPerf.losses++;
      }
      platformPerf.totalPnl += pnl;
    }
  }

  function calculateSignalStrengthInternal(profile: WhaleProfile): number {
    const perf = performanceByWallet.get(profile.walletAddress);
    if (!perf || perf.trades < 3) return 0;

    const winRate = perf.wins / perf.trades;
    const avgPnl = perf.totalPnl / perf.trades;

    // Signal strength based on:
    // - Win rate (40% weight)
    // - Number of trades / confidence (30% weight)
    // - Average PnL (30% weight)
    const winRateScore = Math.max(0, (winRate - 0.5) * 2); // 0 at 50%, 1 at 100%
    const tradeCountScore = Math.min(1, perf.trades / 20); // 1 at 20+ trades
    const pnlScore = avgPnl > 0 ? Math.min(1, avgPnl / 1000) : 0; // 1 at $1000 avg PnL

    return winRateScore * 0.4 + tradeCountScore * 0.3 + pnlScore * 0.3;
  }

  // ==========================================================================
  // PLATFORM TRACKER EVENT HANDLERS
  // ==========================================================================

  function setupPlatformTrackerEvents(tracker: PlatformWhaleTracker): void {
    const platform = tracker.platform;

    tracker.on('trade', (trade: WhaleTrade) => {
      // Check if trade meets our criteria
      if (trade.usdValue < cfg.minTradeSize) return;

      // Check if from tracked wallet or should auto-discover
      const isTracked = trade.walletAddress && trackedAddresses.has(trade.walletAddress);
      const shouldDiscover = cfg.autoDiscovery &&
        trade.walletAddress &&
        trade.usdValue >= cfg.minTradeSize * cfg.autoDiscoveryMultiplier;

      if (!isTracked && !shouldDiscover && trade.walletAddress) {
        return;
      }

      // Auto-discover new whales
      if (shouldDiscover && trade.walletAddress && !trackedAddresses.has(trade.walletAddress)) {
        trackedAddresses.add(trade.walletAddress);
        logger.info({ address: trade.walletAddress, platform }, 'New whale discovered');

        const profile = getOrCreateWhaleProfile(trade.walletAddress);
        emitter.emit('newWhale', profile);
      }

      // Store and emit
      recentTrades.unshift(trade);
      if (recentTrades.length > 1000) {
        recentTrades.pop();
      }

      updateWhaleProfile(trade);

      logger.info({
        platform,
        wallet: trade.walletAddress?.slice(0, 8),
        side: trade.side,
        size: trade.size,
        usdValue: trade.usdValue,
        leverage: trade.leverage,
      }, 'Whale trade detected');

      emitter.emit('trade', trade);
    });

    tracker.on('positionOpened', (position: WhalePosition) => {
      const key = `${position.platform}_${position.walletAddress}_${position.symbol}`;
      activePositions.set(key, position);
      emitter.emit('positionOpened', position);
    });

    tracker.on('positionClosed', (position: WhalePosition, pnl: number) => {
      const key = `${position.platform}_${position.walletAddress}_${position.symbol}`;
      activePositions.delete(key);
      recordClosedPosition(position.walletAddress, pnl, position.platform);
      emitter.emit('positionClosed', position, pnl);
    });

    tracker.on('positionChanged', (position: WhalePosition, change: number) => {
      const key = `${position.platform}_${position.walletAddress}_${position.symbol}`;
      activePositions.set(key, position);
      emitter.emit('positionChanged', position, change);
    });

    tracker.on('momentumSignal', (signal: MomentumSignal) => {
      if (signal.confidence < cfg.minMomentumConfidence) return;
      emitter.emit('momentumSignal', signal);
    });

    tracker.on('connectionState', (state: ConnectionState) => {
      connectionStates.set(platform, state);
      emitter.emit('connectionState', platform, state);
    });

    tracker.on('error', (error: Error) => {
      emitter.emit('error', error, platform);
    });
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  Object.assign(emitter, {
    async start(): Promise<void> {
      if (running) return;
      running = true;

      logger.info({ config: cfg }, 'Starting unified whale tracker');

      // Initialize connection states
      for (const platform of cfg.platforms) {
        connectionStates.set(platform, 'disconnected');
      }

      // Start all registered platform trackers
      const startPromises: Promise<void>[] = [];
      for (const [platform, tracker] of platformTrackers) {
        if (cfg.platforms.includes(platform)) {
          startPromises.push(
            tracker.start().catch((error) => {
              logger.error({ platform, error }, 'Failed to start platform tracker');
            })
          );
        }
      }

      await Promise.all(startPromises);
      logger.info({ platforms: cfg.platforms }, 'Unified whale tracker started');
    },

    stop(): void {
      if (!running) return;
      running = false;

      for (const tracker of platformTrackers.values()) {
        tracker.stop();
      }

      logger.info('Unified whale tracker stopped');
    },

    isRunning(): boolean {
      return running;
    },

    trackAddress(address: string, platforms?: WhalePlatform[]): void {
      trackedAddresses.add(address);

      // Track on specific platforms or all
      const targetPlatforms = platforms || cfg.platforms;
      for (const platform of targetPlatforms) {
        const tracker = platformTrackers.get(platform);
        if (tracker) {
          tracker.trackAddress(address);
        }
      }

      logger.info({ address, platforms: targetPlatforms }, 'Now tracking address');
    },

    untrackAddress(address: string): void {
      trackedAddresses.delete(address);

      for (const tracker of platformTrackers.values()) {
        tracker.untrackAddress(address);
      }

      logger.info({ address }, 'Stopped tracking address');
    },

    getTrackedAddresses(): string[] {
      return Array.from(trackedAddresses);
    },

    getWhaleProfiles(): WhaleProfile[] {
      return Array.from(whaleProfiles.values());
    },

    getWhaleProfile(address: string): WhaleProfile | undefined {
      return whaleProfiles.get(address);
    },

    getTopWhales(limit = 10): WhaleProfile[] {
      return Array.from(whaleProfiles.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, limit);
    },

    getProfitableWhales(minWinRate = 55, minTrades = 5): WhaleProfile[] {
      return Array.from(whaleProfiles.values())
        .filter((p) => p.winRate >= minWinRate && p.totalTrades >= minTrades)
        .sort((a, b) => b.winRate - a.winRate);
    },

    getRecentTrades(limit = 100): WhaleTrade[] {
      return recentTrades.slice(0, limit);
    },

    getTradesByPlatform(platform: WhalePlatform, limit = 100): WhaleTrade[] {
      return recentTrades
        .filter((t) => t.platform === platform)
        .slice(0, limit);
    },

    getTradesByWallet(address: string, limit = 100): WhaleTrade[] {
      return recentTrades
        .filter((t) => t.walletAddress === address)
        .slice(0, limit);
    },

    getActivePositions(): WhalePosition[] {
      return Array.from(activePositions.values());
    },

    getPositionsByPlatform(platform: WhalePlatform): WhalePosition[] {
      return Array.from(activePositions.values())
        .filter((p) => p.platform === platform);
    },

    getPositionsByWallet(address: string): WhalePosition[] {
      return Array.from(activePositions.values())
        .filter((p) => p.walletAddress === address);
    },

    getConnectionState(platform: WhalePlatform): ConnectionState {
      return connectionStates.get(platform) || 'disconnected';
    },

    updateConfig(newConfig: Partial<WhaleTrackerConfig>): void {
      cfg = { ...cfg, ...newConfig };

      if (newConfig.trackedWallets) {
        trackedAddresses.clear();
        for (const addr of newConfig.trackedWallets) {
          trackedAddresses.add(addr);
        }
      }

      logger.info({ config: cfg }, 'Whale tracker config updated');
    },

    getConfig(): WhaleTrackerConfig {
      return { ...cfg };
    },

    registerPlatformTracker(platform: WhalePlatform, tracker: PlatformWhaleTracker): void {
      if (platformTrackers.has(platform)) {
        const existing = platformTrackers.get(platform);
        if (existing) {
          existing.stop();
        }
      }

      platformTrackers.set(platform, tracker);
      setupPlatformTrackerEvents(tracker);
      connectionStates.set(platform, 'disconnected');

      // Start if we're already running
      if (running && cfg.platforms.includes(platform)) {
        tracker.start().catch((error) => {
          logger.error({ platform, error }, 'Failed to start platform tracker');
        });
      }

      logger.info({ platform }, 'Platform tracker registered');
    },

    calculateSignalStrength(profile: WhaleProfile): number {
      return calculateSignalStrengthInternal(profile);
    },
  } as Partial<UnifiedWhaleTracker>);

  return emitter;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert Polymarket WhaleTrade to unified format
 */
export function fromPolymarketTrade(trade: {
  id: string;
  marketId: string;
  marketQuestion?: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  usdValue: number;
  maker: string;
  taker: string;
  timestamp: Date;
}): WhaleTrade {
  return {
    id: trade.id,
    platform: 'polymarket',
    walletAddress: trade.taker, // Taker initiated the trade
    timestamp: trade.timestamp,
    symbol: trade.marketId,
    tokenId: trade.tokenId,
    marketQuestion: trade.marketQuestion,
    side: trade.side.toLowerCase() as 'buy' | 'sell',
    size: trade.size,
    price: trade.price,
    usdValue: trade.usdValue,
  };
}

/**
 * Convert Hyperliquid trade to unified format
 */
export function fromHyperliquidTrade(trade: {
  hash: string;
  coin: string;
  side: string;
  px: string;
  sz: string;
  time: number;
  user: string;
  closedPnl?: string;
  fee?: string;
  leverage?: number;
  entryPx?: string;
  positionSize?: string;
}): WhaleTrade {
  const price = parseFloat(trade.px);
  const size = parseFloat(trade.sz);

  return {
    id: trade.hash,
    platform: 'hyperliquid',
    walletAddress: trade.user,
    timestamp: new Date(trade.time),
    symbol: trade.coin,
    side: trade.side.toLowerCase() === 'b' || trade.side.toLowerCase() === 'buy' ? 'buy' : 'sell',
    size,
    price,
    usdValue: price * size,
    leverage: trade.leverage,
    entryPrice: trade.entryPx ? parseFloat(trade.entryPx) : undefined,
    positionSize: trade.positionSize ? parseFloat(trade.positionSize) : undefined,
    unrealizedPnl: trade.closedPnl ? parseFloat(trade.closedPnl) : undefined,
  };
}

/**
 * Create a WhaleTrade from Kalshi momentum signal
 */
export function fromKalshiMomentum(signal: MomentumSignal, marketQuestion?: string): WhaleTrade {
  return {
    id: `kalshi_momentum_${signal.market}_${signal.triggerTime.getTime()}`,
    platform: 'kalshi',
    walletAddress: null, // Kalshi doesn't expose wallet addresses
    timestamp: signal.triggerTime,
    symbol: signal.market,
    marketQuestion,
    side: signal.direction === 'bullish' ? 'buy' : 'sell',
    size: 0, // Unknown for momentum signals
    price: 0, // Derived from orderbook
    usdValue: 0, // Unknown for momentum signals
    confidence: signal.confidence,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { WhaleTrackerConfig as UnifiedWhaleTrackerConfig };
