/**
 * StrategyRegistry - Manages trading strategies
 */
import { TradingStrategy } from '../types';
export declare class StrategyRegistry {
    private strategies;
    /**
     * Register a new strategy
     */
    register(strategy: TradingStrategy): void;
    /**
     * Get strategy by ID
     */
    get(strategyId: string): TradingStrategy | undefined;
    /**
     * Get all strategies for a user
     */
    getByUser(userId: string): TradingStrategy[];
    /**
     * Update strategy
     */
    update(strategyId: string, updates: Partial<TradingStrategy>): boolean;
    /**
     * Delete strategy
     */
    delete(strategyId: string): boolean;
    /**
     * Get all strategies
     */
    getAll(): TradingStrategy[];
    /**
     * Check if strategy exists
     */
    exists(strategyId: string): boolean;
}
//# sourceMappingURL=StrategyRegistry.d.ts.map