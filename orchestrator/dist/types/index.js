"use strict";
/**
 * Central type exports
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
exports.EventType = exports.AgentStatus = void 0;
// Strategy types
__exportStar(require("./strategy"), exports);
// Signal types
__exportStar(require("./signal"), exports);
// Trade intent types
__exportStar(require("./trade-intent"), exports);
// Permission types
__exportStar(require("./permissions"), exports);
// Execution types
__exportStar(require("./execution"), exports);
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["Active"] = "active";
    AgentStatus["Paused"] = "paused";
    AgentStatus["Stopped"] = "stopped";
    AgentStatus["Error"] = "error";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var EventType;
(function (EventType) {
    EventType["SignalReceived"] = "signal_received";
    EventType["IntentGenerated"] = "intent_generated";
    EventType["ExecutionStarted"] = "execution_started";
    EventType["ExecutionCompleted"] = "execution_completed";
    EventType["ExecutionFailed"] = "execution_failed";
    EventType["PositionOpened"] = "position_opened";
    EventType["PositionClosed"] = "position_closed";
    EventType["RiskLimitTriggered"] = "risk_limit_triggered";
    EventType["AgentPaused"] = "agent_paused";
    EventType["AgentResumed"] = "agent_resumed";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=index.js.map