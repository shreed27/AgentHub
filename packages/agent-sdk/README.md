# @dain/agent-sdk

> The SDK for autonomous trading agents. Trade Solana DEXs, prediction markets, and perpetual futures without wallet popups.

[![npm version](https://img.shields.io/npm/v/@dain/agent-sdk.svg)](https://www.npmjs.com/package/@dain/agent-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @dain/agent-sdk
# or
yarn add @dain/agent-sdk
# or
pnpm add @dain/agent-sdk
```

## Quick Start

```typescript
import { DainClient } from '@dain/agent-sdk';

// Initialize the client
const dain = new DainClient({
  apiKey: process.env.DAIN_API_KEY!,
  environment: 'production'
});

// Register your agent
const agent = await dain.registerAgent({
  name: 'my-trading-bot',
  permissions: ['SWAP', 'LIMIT_ORDER', 'PLACE_BET'],
  survivalConfig: {
    initialBalance: 10000,
    autoKillOnCritical: true
  }
});

// Execute a Solana swap via Jupiter
const result = await dain.solana.swap({
  inputMint: 'So11111111111111111111111111111111111111112',  // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 100000000, // 0.1 SOL in lamports
  slippage: 0.5
});

console.log(`Swap executed: ${result.transactionId}`);
```

## Modules

### Solana DEX (`dain.solana`)

Trade on Solana DEXs via Jupiter V6 aggregator.

```typescript
// Get a quote
const quote = await dain.solana.getQuote({
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount: 1_000_000_000, // 1 SOL
  slippage: 0.5
});

console.log(`Price impact: ${quote.priceImpactPct}%`);
console.log(`Output: ${quote.outAmount} USDC`);

// Execute swap
const result = await dain.solana.swap({
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount: 1_000_000_000,
  slippage: 0.5
});

// Create limit order (auto-executes when price hits target)
const order = await dain.solana.createLimitOrder({
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount: 1_000_000_000,
  limitPrice: 150.00  // Execute when SOL >= $150
});

// Get portfolio
const portfolio = await dain.solana.getPortfolio();
console.log(`Total value: $${portfolio.totalValueUsd}`);
```

### Prediction Markets (`dain.prediction`)

Trade on Polymarket, Kalshi, Manifold, and more.

```typescript
// Search markets
const markets = await dain.prediction.searchMarkets({
  query: 'Bitcoin price',
  platform: 'polymarket',
  minVolume: 10000
});

// Place a bet
const result = await dain.prediction.placeBet({
  platform: 'polymarket',
  marketId: markets[0].id,
  outcome: 'YES',
  amount: 100,
  maxPrice: 0.65  // Max 65 cents per share
});

// Find arbitrage opportunities
const arbs = await dain.prediction.findArbitrage({
  minProfit: 2,  // Minimum 2% profit
  platforms: ['polymarket', 'kalshi']
});

// Execute arbitrage
if (arbs.length > 0) {
  const results = await dain.prediction.executeArbitrage(arbs[0], 1000);
}
```

### Perpetual Futures (`dain.futures`)

Trade leveraged perpetuals on Hyperliquid, Binance, Bybit, and Drift.

```typescript
// Open a leveraged long
const result = await dain.futures.openPosition({
  exchange: 'hyperliquid',
  symbol: 'BTC-USD',
  side: 'LONG',
  amount: 1000,      // $1000 position
  leverage: 10,
  stopLoss: 0.05,    // 5% stop loss
  takeProfit: 0.15   // 15% take profit
});

// Get positions
const positions = await dain.futures.getPositions('hyperliquid');
for (const pos of positions) {
  console.log(`${pos.symbol}: ${pos.unrealizedPnl > 0 ? '+' : ''}$${pos.unrealizedPnl}`);
}

// Close position
await dain.futures.closePosition(result.positionId);

// Get funding rates
const rates = await dain.futures.getFundingRates();
```

### Survival Mode (`dain.survival`)

Automatic risk management based on P&L health.

```typescript
// Get current status
const status = await dain.survival.getStatus();
console.log(`State: ${status.state}`);           // GROWTH, SURVIVAL, DEFENSIVE, CRITICAL
console.log(`Health: ${status.healthRatio * 100}%`);

// Check if action is allowed
if (dain.survival.canExecute('LEVERAGE_TRADE')) {
  await dain.futures.openPosition(...);
}

// Get adjusted position size based on survival state
const baseSize = 1000;
const adjustedSize = dain.survival.getAdjustedPositionSize(baseSize);
// GROWTH: 1500, SURVIVAL: 1000, DEFENSIVE: 500, CRITICAL: 0

// Get adjusted leverage
const maxLev = 20;
const adjustedLev = dain.survival.getAdjustedLeverage(maxLev);
// GROWTH: 20, SURVIVAL: 20, DEFENSIVE: 5, CRITICAL: 1
```

**Survival States:**

| State | Health Ratio | Behavior |
|-------|--------------|----------|
| GROWTH | ≥ 120% | Aggressive mode, X402 unlocked, full leverage |
| SURVIVAL | 85-120% | Normal operations, standard limits |
| DEFENSIVE | 50-85% | Positions reduced 50%, max 5x leverage |
| CRITICAL | < 50% | All trading halted, emergency exit |

## Copy Trading

Follow elite traders ("God Wallets") automatically.

```typescript
// Configure copy trading
const config = await dain.configureCopyTrading({
  targetWallet: '0x123...abc',
  targetLabel: 'Top Whale',
  enabled: true,
  dryRun: false,
  sizingMode: 'proportional',
  proportionMultiplier: 0.1,  // 10% of their size
  maxPositionSize: 1000,
  maxSlippage: 1.0,
  stopLoss: 0.10,
  takeProfit: 0.25
});

// List copy configs
const configs = await dain.getCopyTradingConfigs();
```

## Kill Switch

Emergency shutdown - closes all positions across all platforms.

```typescript
// EMERGENCY: Close everything
const result = await dain.killAgent();
console.log(`Closed ${result.positionsClosed} positions`);
console.log(`Returned $${result.fundsReturned}`);
```

## Framework Integrations

### Eliza

```typescript
import { DainClient } from '@dain/agent-sdk';
import { createElizaPlugin } from '@dain/agent-sdk/eliza';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

// Add DAIN trading capabilities to your Eliza agent
const elizaConfig = {
  plugins: [createElizaPlugin(dain)]
};
```

### solana-agent-kit

```typescript
import { DainClient } from '@dain/agent-sdk';
import { createSolanaAgentKitExtension } from '@dain/agent-sdk/solana-agent-kit';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });
const extension = createSolanaAgentKitExtension(dain);

// Use with solana-agent-kit
const agent = new SolanaAgent({
  extensions: [extension]
});
```

### Claude MCP

```typescript
import { DainClient } from '@dain/agent-sdk';
import { createMCPServer } from '@dain/agent-sdk/mcp';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });
const mcpServer = createMCPServer(dain);

// Claude can now call trading functions directly
mcpServer.start({ port: 3100 });
```

### LangChain

```typescript
import { DainClient } from '@dain/agent-sdk';
import { DainTradingToolkit } from '@dain/agent-sdk/langchain';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });
const toolkit = new DainTradingToolkit(dain);

// Add to your LangChain agent
const tools = toolkit.getTools();
```

## Common Token Addresses

```typescript
import { TOKENS } from '@dain/agent-sdk/solana';

TOKENS.SOL   // So11111111111111111111111111111111111111112
TOKENS.USDC  // EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
TOKENS.USDT  // Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
TOKENS.BONK  // DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
TOKENS.JUP   // JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
TOKENS.WIF   // EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm
TOKENS.PYTH  // HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  DainConfig,
  Agent,
  AgentPermission,
  TradeIntent,
  TradeResult,
  Position,
  Signal,
  SurvivalState,
  SurvivalStatus,
} from '@dain/agent-sdk';
```

## Environment Variables

```bash
DAIN_API_KEY=your-api-key
DAIN_ENVIRONMENT=production  # production | staging | local
```

## Error Handling

```typescript
try {
  const result = await dain.solana.swap({
    inputMint: TOKENS.SOL,
    outputMint: TOKENS.USDC,
    amount: 1_000_000_000,
    slippage: 0.5
  });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    console.log('Not enough SOL');
  } else if (error.code === 'SLIPPAGE_EXCEEDED') {
    console.log('Price moved too much');
  } else if (error.code === 'SURVIVAL_BLOCKED') {
    console.log('Trading blocked by Survival Mode');
  }
}
```

## API Reference

Full API documentation: [https://docs.dain.dev](https://docs.dain.dev)

## License

MIT
