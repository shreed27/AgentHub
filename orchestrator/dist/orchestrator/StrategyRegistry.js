"use strict";
/**
 * StrategyRegistry - Manages trading strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyRegistry = void 0;
class StrategyRegistry {
    strategies = new Map();
    /**
     * Register a new strategy
     */
    register(strategy) {
        this.strategies.set(strategy.id, strategy);
    }
    /**
     * Get strategy by ID
     */
    get(strategyId) {
        return this.strategies.get(strategyId);
    }
    /**
     * Get all strategies for a user
     */
    getByUser(userId) {
        return Array.from(this.strategies.values()).filter(s => s.userId === userId);
    }
    /**
     * Update strategy
     */
    update(strategyId, updates) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) {
            return false;
        }
        Object.assign(strategy, {
            ...updates,
            updatedAt: Date.now()
        });
        return true;
    }
    /**
     * Delete strategy
     */
    delete(strategyId) {
        return this.strategies.delete(strategyId);
    }
    /**
     * Get all strategies
     */
    getAll() {
        return Array.from(this.strategies.values());
    }
    /**
     * Check if strategy exists
     */
    exists(strategyId) {
        return this.strategies.has(strategyId);
    }
}
exports.StrategyRegistry = StrategyRegistry;
//# sourceMappingURL=StrategyRegistry.js.map