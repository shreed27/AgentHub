/**
 * Trade Intent Type Definitions
 */
import { MarketType } from './strategy';
export interface TradeIntent {
    id: string;
    agentId: string;
    strategyId: string;
    action: TradeAction;
    market: MarketType;
    asset: string;
    amount: number;
    constraints: TradeConstraints;
    reasoning: string;
    status: IntentStatus;
    createdAt: number;
    executedAt?: number;
}
export declare enum TradeAction {
    Buy = "buy",
    Sell = "sell",
    Close = "close",
    PlaceOrder = "place_order",
    CancelOrder = "cancel_order"
}
export interface TradeConstraints {
    maxSlippage: number;
    timeLimit: number;
    minLiquidity: number;
    preferredRoute?: string;
    stopLoss?: number;
    takeProfit?: number;
}
export declare enum IntentStatus {
    Pending = "pending",
    Routing = "routing",
    Executing = "executing",
    Completed = "completed",
    Failed = "failed",
    Cancelled = "cancelled"
}
//# sourceMappingURL=trade-intent.d.ts.map