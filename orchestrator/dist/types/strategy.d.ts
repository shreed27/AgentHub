/**
 * Trading Strategy Type Definitions
 */
import type { Signal } from './signal';
import type { TradeIntent } from './trade-intent';
export interface TradingStrategy {
    id: string;
    name: string;
    description: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    riskLimits: RiskLimits;
    capitalAllocation: CapitalAllocation;
    evaluate(signals: Signal[]): TradeIntent | null;
}
export interface RiskLimits {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxOpenPositions: number;
    allowedMarkets: MarketType[];
    allowedChains: Chain[];
    stopLossPercent?: number;
    takeProfitPercent?: number;
}
export interface CapitalAllocation {
    totalCapital: number;
    perTradePercent: number;
    reservePercent: number;
    currentlyAllocated: number;
}
export declare enum MarketType {
    DEX = "dex",
    PredictionMarket = "prediction",
    Futures = "futures"
}
export declare enum Chain {
    Solana = "solana",
    Base = "base",
    Ethereum = "ethereum",
    Arbitrum = "arbitrum",
    Polygon = "polygon"
}
//# sourceMappingURL=strategy.d.ts.map