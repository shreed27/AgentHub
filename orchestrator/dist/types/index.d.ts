/**
 * Central type exports
 */
export * from './strategy';
export * from './signal';
export * from './trade-intent';
export * from './permissions';
export * from './execution';
export interface AgentConfig {
    id: string;
    userId: string;
    strategyId: string;
    walletAddress: string;
    permissions: import('./permissions').WalletPermission;
    status: AgentStatus;
    createdAt: number;
    updatedAt: number;
}
export declare enum AgentStatus {
    Active = "active",
    Paused = "paused",
    Stopped = "stopped",
    Error = "error"
}
export interface AgentPerformance {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    currentPositions: number;
    dailyPnL: number;
    weeklyPnL: number;
}
export interface AgentEvent {
    type: EventType;
    agentId: string;
    timestamp: number;
    data: any;
}
export declare enum EventType {
    SignalReceived = "signal_received",
    IntentGenerated = "intent_generated",
    ExecutionStarted = "execution_started",
    ExecutionCompleted = "execution_completed",
    ExecutionFailed = "execution_failed",
    PositionOpened = "position_opened",
    PositionClosed = "position_closed",
    RiskLimitTriggered = "risk_limit_triggered",
    AgentPaused = "agent_paused",
    AgentResumed = "agent_resumed"
}
//# sourceMappingURL=index.d.ts.map