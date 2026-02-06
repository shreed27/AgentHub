"use strict";
/**
 * AgentOrchestrator - Manages agent lifecycle and coordinates execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const events_1 = require("events");
const types_1 = require("../types");
class AgentOrchestrator extends events_1.EventEmitter {
    permissionManager;
    strategyRegistry;
    agents = new Map();
    positions = new Map();
    performance = new Map();
    constructor(permissionManager, strategyRegistry) {
        super();
        this.permissionManager = permissionManager;
        this.strategyRegistry = strategyRegistry;
    }
    /**
     * Create and start a new agent
     */
    async createAgent(config) {
        // Validate strategy exists
        const strategy = this.strategyRegistry.get(config.strategyId);
        if (!strategy) {
            throw new Error(`Strategy ${config.strategyId} not found`);
        }
        // Create agent config
        const agent = {
            ...config,
            id: this.generateAgentId(),
            status: types_1.AgentStatus.Active,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        // Register permission
        this.permissionManager.registerPermission(config.permissions);
        // Initialize agent state
        this.agents.set(agent.id, agent);
        this.positions.set(agent.id, []);
        this.performance.set(agent.id, {
            totalTrades: 0,
            winRate: 0,
            totalPnL: 0,
            currentPositions: 0,
            dailyPnL: 0,
            weeklyPnL: 0
        });
        // Emit event
        this.emitEvent({
            type: types_1.EventType.AgentResumed,
            agentId: agent.id,
            timestamp: Date.now(),
            data: agent
        });
        return agent;
    }
    /**
     * Get agent by ID
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Get all agents for a user
     */
    getAgentsByUser(userId) {
        return Array.from(this.agents.values()).filter(a => a.userId === userId);
    }
    /**
     * Process signals for an agent
     */
    async processSignals(agentId, signals) {
        const agent = this.agents.get(agentId);
        if (!agent || agent.status !== types_1.AgentStatus.Active) {
            return null;
        }
        // Get strategy
        const strategy = this.strategyRegistry.get(agent.strategyId);
        if (!strategy) {
            throw new Error(`Strategy ${agent.strategyId} not found`);
        }
        // Emit signal received events
        signals.forEach(signal => {
            this.emitEvent({
                type: types_1.EventType.SignalReceived,
                agentId,
                timestamp: Date.now(),
                data: signal
            });
        });
        // Evaluate strategy
        const intent = strategy.evaluate(signals);
        if (intent) {
            // Add agent context to intent
            intent.agentId = agentId;
            intent.strategyId = agent.strategyId;
            intent.id = this.generateIntentId();
            intent.createdAt = Date.now();
            // Emit intent generated event
            this.emitEvent({
                type: types_1.EventType.IntentGenerated,
                agentId,
                timestamp: Date.now(),
                data: intent
            });
        }
        return intent;
    }
    /**
     * Record execution result
     */
    recordExecution(agentId, result) {
        const performance = this.performance.get(agentId);
        if (!performance) {
            return;
        }
        // Update performance metrics
        performance.totalTrades++;
        if (result.success) {
            // Calculate P&L (simplified - would need more context in real implementation)
            const pnl = 0; // TODO: Calculate actual P&L
            performance.totalPnL += pnl;
            performance.dailyPnL += pnl;
            performance.weeklyPnL += pnl;
        }
        // Emit event
        const eventType = result.success ? types_1.EventType.ExecutionCompleted : types_1.EventType.ExecutionFailed;
        this.emitEvent({
            type: eventType,
            agentId,
            timestamp: Date.now(),
            data: result
        });
    }
    /**
     * Add position for an agent
     */
    addPosition(agentId, position) {
        const positions = this.positions.get(agentId) || [];
        positions.push(position);
        this.positions.set(agentId, positions);
        const performance = this.performance.get(agentId);
        if (performance) {
            performance.currentPositions = positions.length;
        }
        this.emitEvent({
            type: types_1.EventType.PositionOpened,
            agentId,
            timestamp: Date.now(),
            data: position
        });
    }
    /**
     * Close position for an agent
     */
    closePosition(agentId, positionId) {
        const positions = this.positions.get(agentId) || [];
        const index = positions.findIndex(p => p.id === positionId);
        if (index !== -1) {
            const position = positions[index];
            positions.splice(index, 1);
            this.positions.set(agentId, positions);
            const performance = this.performance.get(agentId);
            if (performance) {
                performance.currentPositions = positions.length;
            }
            this.emitEvent({
                type: types_1.EventType.PositionClosed,
                agentId,
                timestamp: Date.now(),
                data: position
            });
        }
    }
    /**
     * Get positions for an agent
     */
    getPositions(agentId) {
        return this.positions.get(agentId) || [];
    }
    /**
     * Get performance for an agent
     */
    getPerformance(agentId) {
        return this.performance.get(agentId);
    }
    /**
     * Pause an agent
     */
    pauseAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }
        agent.status = types_1.AgentStatus.Paused;
        agent.updatedAt = Date.now();
        this.emitEvent({
            type: types_1.EventType.AgentPaused,
            agentId,
            timestamp: Date.now(),
            data: { reason: 'Manual pause' }
        });
        return true;
    }
    /**
     * Resume an agent
     */
    resumeAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }
        agent.status = types_1.AgentStatus.Active;
        agent.updatedAt = Date.now();
        this.emitEvent({
            type: types_1.EventType.AgentResumed,
            agentId,
            timestamp: Date.now(),
            data: { reason: 'Manual resume' }
        });
        return true;
    }
    /**
     * Kill switch - immediately stop agent and close all positions
     */
    async killAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return { success: false, positionsClosed: 0, fundsReturned: 0 };
        }
        // Stop agent
        agent.status = types_1.AgentStatus.Stopped;
        agent.updatedAt = Date.now();
        // Get all positions
        const positions = this.positions.get(agentId) || [];
        const positionsClosed = positions.length;
        // TODO: Actually close positions via execution engines
        // For now, just clear them
        let fundsReturned = 0;
        positions.forEach(position => {
            fundsReturned += position.amount * position.currentPrice;
        });
        this.positions.set(agentId, []);
        // Revoke permissions
        const permission = this.permissionManager.getPermissionByAgent(agentId);
        if (permission) {
            this.permissionManager.revokePermission(permission.id);
        }
        return {
            success: true,
            positionsClosed,
            fundsReturned
        };
    }
    // Private helper methods
    generateAgentId() {
        return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateIntentId() {
        return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    emitEvent(event) {
        this.emit(event.type, event);
        this.emit('event', event);
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=AgentOrchestrator.js.map