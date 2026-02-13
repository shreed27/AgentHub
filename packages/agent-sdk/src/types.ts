/**
 * Core types for the DAIN Agent SDK
 */

/**
 * Configuration for initializing the DAIN client
 */
export interface DainConfig {
  /** Your DAIN API key */
  apiKey: string;
  /** Environment: 'production' | 'staging' | 'local' */
  environment?: 'production' | 'staging' | 'local';
  /** Custom API base URL (optional) */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Agent registration and management
 */
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  permissions: AgentPermission[];
  wallet?: {
    address: string;
    publicKey: string;
  };
  survivalState: SurvivalState;
  createdAt: Date;
  lastActiveAt: Date;
  metadata?: Record<string, unknown>;
}

export type AgentStatus = 'active' | 'paused' | 'stopped' | 'error';

export type AgentPermission =
  | 'SWAP'
  | 'LIMIT_ORDER'
  | 'PLACE_BET'
  | 'CLOSE_POSITION'
  | 'WITHDRAW'
  | 'LEVERAGE_TRADE'
  | 'COPY_TRADE';

export interface RegisterAgentParams {
  name: string;
  permissions: AgentPermission[];
  initialBalance?: number;
  survivalConfig?: SurvivalConfig;
  metadata?: Record<string, unknown>;
}

/**
 * Trading types
 */
export interface TradeIntent {
  type: 'SWAP' | 'LIMIT_ORDER' | 'PREDICTION_BET' | 'FUTURES_OPEN' | 'FUTURES_CLOSE';
  params: SwapParams | LimitOrderParams | PredictionBetParams | FuturesParams;
  signal?: Signal;
}

export interface TradeResult {
  success: boolean;
  transactionId?: string;
  executedPrice?: number;
  executedAmount?: number;
  fees?: number;
  error?: string;
  timestamp: Date;
}

export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippage?: number;
  exactIn?: boolean;
}

export interface LimitOrderParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  limitPrice: number;
  expiration?: number;
}

export interface PredictionBetParams {
  platform: PredictionPlatform;
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  maxPrice?: number;
}

export interface FuturesParams {
  exchange: FuturesExchange;
  symbol: string;
  side: 'LONG' | 'SHORT';
  amount: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export type PredictionPlatform =
  | 'polymarket'
  | 'kalshi'
  | 'manifold'
  | 'metaculus'
  | 'predictit'
  | 'betfair'
  | 'smarkets';

export type FuturesExchange =
  | 'hyperliquid'
  | 'binance'
  | 'bybit'
  | 'drift';

/**
 * Position tracking
 */
export interface Position {
  id: string;
  agentId: string;
  type: 'SPOT' | 'PREDICTION' | 'FUTURES';
  platform: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage?: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Signal types
 */
export interface Signal {
  id: string;
  source: SignalSource;
  type: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type SignalSource =
  | 'WHALE'
  | 'AI'
  | 'OSINT'
  | 'ARBITRAGE'
  | 'SOCIAL'
  | 'ONCHAIN';

/**
 * Survival Mode - Adaptive risk management
 */
export type SurvivalState = 'GROWTH' | 'SURVIVAL' | 'DEFENSIVE' | 'CRITICAL';

export interface SurvivalConfig {
  initialBalance: number;
  growthThreshold?: number;    // Default: 1.2 (120%)
  survivalThreshold?: number;  // Default: 0.85 (85%)
  defensiveThreshold?: number; // Default: 0.5 (50%)
  autoKillOnCritical?: boolean;
}

export interface SurvivalStatus {
  state: SurvivalState;
  healthRatio: number;
  currentBalance: number;
  initialBalance: number;
  maxDrawdown: number;
  positionsReduced: boolean;
  x402Enabled: boolean;
}

/**
 * Wallet permission system
 */
export interface WalletPermission {
  agentId: string;
  walletAddress: string;
  allowedActions: AgentPermission[];
  limits: {
    maxTransactionValue: number;
    dailyLimit: number;
    weeklyLimit: number;
    requiresApproval: boolean;
  };
  expiresAt?: Date;
}

/**
 * Copy trading
 */
export interface CopyTradingConfig {
  id: string;
  agentId: string;
  targetWallet: string;
  targetLabel?: string;
  enabled: boolean;
  dryRun: boolean;
  sizingMode: 'fixed' | 'proportional' | 'percentage';
  fixedSize?: number;
  proportionMultiplier?: number;
  portfolioPercentage?: number;
  maxPositionSize: number;
  minTradeSize: number;
  copyDelayMs: number;
  maxSlippage: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    latencyMs: number;
  };
}

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  signal_received: Signal;
  price_update: { symbol: string; price: number; timestamp: Date };
  position_update: Position;
  execution_completed: TradeResult;
  survival_state_changed: SurvivalStatus;
  whale_detected: { wallet: string; action: string; asset: string; amount: number };
}
