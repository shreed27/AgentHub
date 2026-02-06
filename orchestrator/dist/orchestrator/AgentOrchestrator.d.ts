/**
 * AgentOrchestrator - Manages agent lifecycle and coordinates execution
 */
import { EventEmitter } from 'events';
import { AgentConfig, AgentPerformance, Signal, TradeIntent, ExecutionResult, Position } from '../types';
import { PermissionManager } from './PermissionManager';
import { StrategyRegistry } from './StrategyRegistry';
export declare class AgentOrchestrator extends EventEmitter {
    private permissionManager;
    private strategyRegistry;
    private agents;
    private positions;
    private performance;
    constructor(permissionManager: PermissionManager, strategyRegistry: StrategyRegistry);
    /**
     * Create and start a new agent
     */
    createAgent(config: Omit<AgentConfig, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig>;
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AgentConfig | undefined;
    /**
     * Get all agents for a user
     */
    getAgentsByUser(userId: string): AgentConfig[];
    /**
     * Process signals for an agent
     */
    processSignals(agentId: string, signals: Signal[]): Promise<TradeIntent | null>;
    /**
     * Record execution result
     */
    recordExecution(agentId: string, result: ExecutionResult): void;
    /**
     * Add position for an agent
     */
    addPosition(agentId: string, position: Position): void;
    /**
     * Close position for an agent
     */
    closePosition(agentId: string, positionId: string): void;
    /**
     * Get positions for an agent
     */
    getPositions(agentId: string): Position[];
    /**
     * Get performance for an agent
     */
    getPerformance(agentId: string): AgentPerformance | undefined;
    /**
     * Pause an agent
     */
    pauseAgent(agentId: string): boolean;
    /**
     * Resume an agent
     */
    resumeAgent(agentId: string): boolean;
    /**
     * Kill switch - immediately stop agent and close all positions
     */
    killAgent(agentId: string): Promise<{
        success: boolean;
        positionsClosed: number;
        fundsReturned: number;
    }>;
    private generateAgentId;
    private generateIntentId;
    private emitEvent;
}
//# sourceMappingURL=AgentOrchestrator.d.ts.map