"use strict";
/**
 * Main entry point for trading orchestrator
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyRegistry = exports.permissionManager = exports.orchestrator = void 0;
const orchestrator_1 = require("./orchestrator");
// Initialize core components
const permissionManager = new orchestrator_1.PermissionManager();
exports.permissionManager = permissionManager;
const strategyRegistry = new orchestrator_1.StrategyRegistry();
exports.strategyRegistry = strategyRegistry;
const orchestrator = new orchestrator_1.AgentOrchestrator(permissionManager, strategyRegistry);
exports.orchestrator = orchestrator;
// Export types
__exportStar(require("./types"), exports);
// Export modules
__exportStar(require("./orchestrator"), exports);
//# sourceMappingURL=index.js.map