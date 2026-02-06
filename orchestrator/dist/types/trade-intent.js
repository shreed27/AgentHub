"use strict";
/**
 * Trade Intent Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentStatus = exports.TradeAction = void 0;
var TradeAction;
(function (TradeAction) {
    TradeAction["Buy"] = "buy";
    TradeAction["Sell"] = "sell";
    TradeAction["Close"] = "close";
    TradeAction["PlaceOrder"] = "place_order";
    TradeAction["CancelOrder"] = "cancel_order";
})(TradeAction || (exports.TradeAction = TradeAction = {}));
var IntentStatus;
(function (IntentStatus) {
    IntentStatus["Pending"] = "pending";
    IntentStatus["Routing"] = "routing";
    IntentStatus["Executing"] = "executing";
    IntentStatus["Completed"] = "completed";
    IntentStatus["Failed"] = "failed";
    IntentStatus["Cancelled"] = "cancelled";
})(IntentStatus || (exports.IntentStatus = IntentStatus = {}));
//# sourceMappingURL=trade-intent.js.map