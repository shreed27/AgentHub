/**
 * Execution Result Type Definitions
 */
export interface ExecutionResult {
    intentId: string;
    success: boolean;
    txHash?: string;
    orderId?: string;
    executedAmount: number;
    executedPrice: number;
    fees: number;
    slippage?: number;
    executionTime?: number;
    error?: string;
    timestamp: number;
}
export interface ExecutionRoute {
    executor: string;
    path: string[];
    estimatedSlippage: number;
    estimatedTime: number;
    estimatedFees: number;
}
export interface Position {
    id: string;
    agentId: string;
    token: string;
    amount: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    stopLoss?: number;
    takeProfit?: number;
    openedAt: number;
}
//# sourceMappingURL=execution.d.ts.map