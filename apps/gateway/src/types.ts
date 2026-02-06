// Core Types for Super Trading Platform Gateway

// ==================== Signal Types ====================

export type SignalSource =
  | 'osint'
  | 'whale'
  | 'ai'
  | 'arbitrage'
  | 'social'
  | 'onchain'
  | 'god_wallet';

export interface Signal {
  id: string;
  source: SignalSource;
  type: string;
  data: unknown;
  confidence: number; // 0-100
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface WhaleSignal extends Signal {
  source: 'whale' | 'god_wallet';
  data: {
    walletAddress: string;
    walletLabel?: string;
    token: string;
    tokenSymbol?: string;
    action: 'buy' | 'sell';
    amount: number;
    price: number;
    marketCap?: number;
    txSignature?: string;
  };
}

export interface ArbitrageSignal extends Signal {
  source: 'arbitrage';
  data: {
    token: string;
    buyPlatform: string;
    buyPrice: number;
    sellPlatform: string;
    sellPrice: number;
    profitPercent: number;
    liquidity: number;
  };
}

export interface AISignal extends Signal {
  source: 'ai';
  data: {
    token: string;
    recommendation: 'strong_buy' | 'buy' | 'watch' | 'avoid' | 'sell';
    reasoning: string;
    metrics: {
      confidence: number;
      liquidity: number;
      holders: number;
      momentum: number;
      trustScore: number;
    };
  };
}

// ==================== Trade Intent Types ====================

export type TradeAction = 'buy' | 'sell' | 'close';
export type MarketType = 'dex' | 'prediction_market' | 'futures';
export type Chain = 'solana' | 'base' | 'ethereum' | 'arbitrum' | 'polygon';

export interface TradeIntent {
  id: string;
  agentId: string;
  strategyId?: string;
  action: TradeAction;
  marketType: MarketType;
  chain: Chain;
  asset: string;
  amount: number;
  constraints?: TradeConstraints;
  signalIds?: string[];
  status: 'pending' | 'routing' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface TradeConstraints {
  maxSlippageBps?: number;
  timeLimitMs?: number;
  minLiquidity?: number;
  stopLoss?: number;
  takeProfit?: number;
  takeProfitLevels?: number[];
}

// ==================== Execution Types ====================

export interface ExecutionRoute {
  executor: 'agent-dex' | 'cloddsbot' | 'openclaw';
  platform: string;
  path: string[];
  estimatedPrice: number;
  estimatedSlippage: number;
  estimatedFees: number;
  estimatedTimeMs: number;
  score: number;
}

export interface ExecutionResult {
  intentId: string;
  success: boolean;
  txHash?: string;
  orderId?: string;
  executedAmount: number;
  executedPrice: number;
  fees: number;
  slippage: number;
  executionTimeMs: number;
  error?: string;
  route: ExecutionRoute;
}

// ==================== Agent Types ====================

export type AgentStatus = 'active' | 'paused' | 'stopped' | 'error';
export type AgentType = 'main' | 'trading' | 'research' | 'alerts';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  strategyId?: string;
  walletAddress?: string;
  config: AgentConfig;
  performance: AgentPerformance;
  createdAt: number;
  updatedAt: number;
}

export interface AgentConfig {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  allowedMarkets: MarketType[];
  allowedChains: Chain[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoExecute: boolean;
}

export interface AgentPerformance {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  dailyPnL: number;
  avgTradeSize: number;
  avgHoldTime: number;
}

// ==================== Position Types ====================

export interface Position {
  id: string;
  agentId: string;
  token: string;
  tokenSymbol: string;
  chain: Chain;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  takeProfitLevels?: TakeProfitLevel[];
  openedAt: number;
  updatedAt: number;
}

export interface TakeProfitLevel {
  price: number;
  percent: number;
  triggered: boolean;
  triggeredAt?: number;
}

// ==================== Risk Types ====================

export interface RiskCheck {
  approved: boolean;
  adjustedSize?: number;
  reason?: string;
  warnings: string[];
  checks: RiskCheckResult[];
  regime: VolatilityRegime;
}

export interface RiskCheckResult {
  name: string;
  passed: boolean;
  message?: string;
}

export type VolatilityRegime = 'low' | 'elevated' | 'high' | 'extreme';

// ==================== WebSocket Event Types ====================

export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'signal_received'
  | 'intent_generated'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'position_opened'
  | 'position_closed'
  | 'price_update'
  | 'holdings_snapshot'
  | 'risk_limit_triggered'
  | 'agent_status_changed'
  | 'whale_detected'
  | 'god_wallet_buy'
  | 'arbitrage_opportunity'
  | 'ai_analysis'
  | 'ai_reasoning';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  timestamp: number;
  data: T;
}

// ==================== Service Config Types ====================

export interface ServiceConfig {
  cloddsbotUrl: string;
  agentDexUrl: string;
  opusXUrl: string;
  openclawUrl: string;
  osintMarketUrl: string;
  clawdnetUrl: string;
}

export interface GatewayConfig {
  port: number;
  corsOrigins: string[];
  services: ServiceConfig;
  websocket: {
    pingInterval: number;
    pingTimeout: number;
  };
}
