"use strict";
/**
 * Trading Strategy Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chain = exports.MarketType = void 0;
var MarketType;
(function (MarketType) {
    MarketType["DEX"] = "dex";
    MarketType["PredictionMarket"] = "prediction";
    MarketType["Futures"] = "futures";
})(MarketType || (exports.MarketType = MarketType = {}));
var Chain;
(function (Chain) {
    Chain["Solana"] = "solana";
    Chain["Base"] = "base";
    Chain["Ethereum"] = "ethereum";
    Chain["Arbitrum"] = "arbitrum";
    Chain["Polygon"] = "polygon";
})(Chain || (exports.Chain = Chain = {}));
//# sourceMappingURL=strategy.js.map