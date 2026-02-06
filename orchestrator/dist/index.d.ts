/**
 * Main entry point for trading orchestrator
 */
import { AgentOrchestrator, PermissionManager, StrategyRegistry } from './orchestrator';
declare const permissionManager: PermissionManager;
declare const strategyRegistry: StrategyRegistry;
declare const orchestrator: AgentOrchestrator;
export { orchestrator, permissionManager, strategyRegistry };
export * from './types';
export * from './orchestrator';
//# sourceMappingURL=index.d.ts.map