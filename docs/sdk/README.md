# DAIN Agent SDK Documentation

> Complete guide to building autonomous trading agents with DAIN

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Modules](#modules)
4. [Framework Integrations](#framework-integrations)
5. [Examples](#examples)
6. [API Reference](#api-reference)

---

## Getting Started

### Installation

```bash
npm install @dain/agent-sdk
```

### Quick Example

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({
  apiKey: process.env.DAIN_API_KEY!,
  environment: 'production'
});

// Register your agent
const agent = await dain.registerAgent({
  name: 'my-trading-bot',
  permissions: ['SWAP', 'LIMIT_ORDER', 'PLACE_BET']
});

// Trade on Solana
const swap = await dain.solana.swap({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 100000000,
  slippage: 0.5
});

// Trade on prediction markets
const bet = await dain.prediction.placeBet({
  platform: 'polymarket',
  marketId: '0x...',
  outcome: 'YES',
  amount: 100
});

// Trade futures
const position = await dain.futures.openPosition({
  exchange: 'hyperliquid',
  symbol: 'BTC-USD',
  side: 'LONG',
  amount: 1000,
  leverage: 10
});
```

---

## Core Concepts

### Agent Registration

Every trading agent must be registered with DAIN. This creates a secure identity with specific permissions.

```typescript
const agent = await dain.registerAgent({
  name: 'arbitrage-bot',
  permissions: ['SWAP', 'PLACE_BET', 'LIMIT_ORDER'],
  survivalConfig: {
    initialBalance: 10000,
    autoKillOnCritical: true
  }
});
```

### Permissions

Agents are granted specific permissions that limit what actions they can perform:

| Permission | Description |
|------------|-------------|
| `SWAP` | Execute token swaps on DEXs |
| `LIMIT_ORDER` | Create limit orders |
| `PLACE_BET` | Place bets on prediction markets |
| `CLOSE_POSITION` | Close existing positions |
| `LEVERAGE_TRADE` | Open leveraged futures positions |
| `COPY_TRADE` | Execute copy trading strategies |
| `WITHDRAW` | Withdraw funds (rarely granted) |

### Survival Mode

Automatic risk management based on portfolio health:

```
Health Ratio = Current Balance / Initial Balance

>= 120% -> GROWTH:     Full capabilities, X402 payments enabled
85-120% -> SURVIVAL:   Normal operations
50-85%  -> DEFENSIVE:  Position sizes reduced 50%, max 5x leverage
< 50%   -> CRITICAL:   All trading halted, emergency exit
```

Check survival status:

```typescript
const status = await dain.survival.getStatus();

if (status.state === 'DEFENSIVE') {
  // Reduce position sizes
  const size = dain.survival.getAdjustedPositionSize(1000); // Returns 500
}
```

### Kill Switch

Emergency shutdown that closes all positions across all platforms:

```typescript
// EMERGENCY: Stop everything
const result = await dain.killAgent();
console.log(`Closed ${result.positionsClosed} positions`);
console.log(`Returned $${result.fundsReturned} to wallet`);
```

---

## Modules

### Solana Module (`dain.solana`)

Trade on Solana DEXs via Jupiter V6 aggregator.

#### Get Quote

```typescript
const quote = await dain.solana.getQuote({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 1_000_000_000, // 1 SOL in lamports
  slippage: 0.5          // 0.5% slippage
});

console.log(`Output: ${quote.outAmount}`);
console.log(`Price Impact: ${quote.priceImpactPct}%`);
console.log(`Routes: ${quote.routePlan.length}`);
```

#### Execute Swap

```typescript
const result = await dain.solana.swap({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 1_000_000_000,
  slippage: 0.5
});

console.log(`Transaction: ${result.transactionId}`);
console.log(`Executed at: ${result.executedPrice}`);
```

#### Limit Orders

```typescript
// Create limit order (auto-executes when price hits target)
const order = await dain.solana.createLimitOrder({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 1_000_000_000,
  limitPrice: 150.00 // Execute when SOL >= $150
});

// List orders
const orders = await dain.solana.getLimitOrders('pending');

// Cancel order
await dain.solana.cancelLimitOrder(order.id);
```

#### Portfolio

```typescript
const portfolio = await dain.solana.getPortfolio();

console.log(`Total Value: $${portfolio.totalValueUsd}`);
for (const token of portfolio.tokens) {
  console.log(`${token.symbol}: ${token.balance} ($${token.valueUsd})`);
}
```

### Prediction Module (`dain.prediction`)

Trade on Polymarket, Kalshi, Manifold, and more.

#### Search Markets

```typescript
const markets = await dain.prediction.searchMarkets({
  query: 'Bitcoin price',
  platform: 'polymarket',
  minVolume: 10000,
  limit: 10
});

for (const market of markets) {
  console.log(`${market.question}`);
  console.log(`  YES: ${market.outcomes[0].price * 100}%`);
  console.log(`  NO: ${market.outcomes[1].price * 100}%`);
}
```

#### Place Bets

```typescript
const result = await dain.prediction.placeBet({
  platform: 'polymarket',
  marketId: markets[0].id,
  outcome: 'YES',
  amount: 100,
  maxPrice: 0.65 // Max 65 cents per share
});
```

#### Arbitrage

```typescript
// Find cross-platform arbitrage
const opportunities = await dain.prediction.findArbitrage({
  minProfit: 2, // 2% minimum
  platforms: ['polymarket', 'kalshi']
});

// Execute arbitrage
if (opportunities.length > 0) {
  const results = await dain.prediction.executeArbitrage(
    opportunities[0],
    1000 // $1000 total
  );
}
```

### Futures Module (`dain.futures`)

Trade perpetual futures with leverage.

#### Open Position

```typescript
const result = await dain.futures.openPosition({
  exchange: 'hyperliquid',
  symbol: 'BTC-USD',
  side: 'LONG',
  amount: 1000,
  leverage: 10,
  stopLoss: 0.05,    // 5% stop loss
  takeProfit: 0.15   // 15% take profit
});
```

#### Manage Positions

```typescript
// Get all positions
const positions = await dain.futures.getPositions('hyperliquid');

for (const pos of positions) {
  console.log(`${pos.symbol}: ${pos.side} ${pos.leverage}x`);
  console.log(`  Entry: $${pos.entryPrice}`);
  console.log(`  Current: $${pos.currentPrice}`);
  console.log(`  PnL: $${pos.unrealizedPnl}`);
}

// Modify position
await dain.futures.modifyPosition(positions[0].id, {
  stopLoss: 0.03,
  takeProfit: 0.20
});

// Close position
await dain.futures.closePosition(positions[0].id);
```

#### Funding Rates

```typescript
const rates = await dain.futures.getFundingRates('hyperliquid');

for (const rate of rates) {
  console.log(`${rate.symbol}: ${rate.rate > 0 ? '+' : ''}${rate.rate * 100}%`);
}
```

---

## Framework Integrations

### Eliza Integration

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

// Eliza plugin configuration
export const dainPlugin = {
  name: 'dain-trading',
  actions: [
    {
      name: 'SWAP_TOKENS',
      handler: async (params: { input: string; output: string; amount: number }) => {
        return await dain.solana.swap({
          inputMint: params.input,
          outputMint: params.output,
          amount: params.amount,
          slippage: 0.5
        });
      }
    },
    {
      name: 'PLACE_BET',
      handler: async (params: { market: string; outcome: string; amount: number }) => {
        return await dain.prediction.placeBet({
          platform: 'polymarket',
          marketId: params.market,
          outcome: params.outcome as 'YES' | 'NO',
          amount: params.amount
        });
      }
    },
    {
      name: 'GET_SURVIVAL_STATUS',
      handler: async () => {
        return await dain.survival.getStatus();
      }
    }
  ]
};
```

### solana-agent-kit Integration

```typescript
import { DainClient, TOKENS } from '@dain/agent-sdk';
import { SolanaAgentKit } from 'solana-agent-kit';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

// Create extension for solana-agent-kit
export const dainExtension = {
  name: 'dain',

  async swapWithJupiter(inputToken: string, outputToken: string, amount: number) {
    return await dain.solana.swap({
      inputMint: inputToken,
      outputMint: outputToken,
      amount,
      slippage: 0.5
    });
  },

  async getPortfolio() {
    return await dain.solana.getPortfolio();
  },

  async createLimitOrder(input: string, output: string, amount: number, price: number) {
    return await dain.solana.createLimitOrder({
      inputMint: input,
      outputMint: output,
      amount,
      limitPrice: price
    });
  }
};

// Usage with solana-agent-kit
const agent = new SolanaAgentKit({
  privateKey: process.env.SOLANA_PRIVATE_KEY!,
  rpcUrl: process.env.SOLANA_RPC_URL!,
  extensions: [dainExtension]
});
```

### Claude MCP Server

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

// MCP tool definitions
export const mcpTools = [
  {
    name: 'dain_swap',
    description: 'Swap tokens on Solana via Jupiter',
    inputSchema: {
      type: 'object',
      properties: {
        inputMint: { type: 'string', description: 'Input token mint address' },
        outputMint: { type: 'string', description: 'Output token mint address' },
        amount: { type: 'number', description: 'Amount in smallest unit' },
        slippage: { type: 'number', description: 'Slippage tolerance %' }
      },
      required: ['inputMint', 'outputMint', 'amount']
    },
    handler: async (params: any) => {
      return await dain.solana.swap(params);
    }
  },
  {
    name: 'dain_prediction_bet',
    description: 'Place a bet on a prediction market',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['polymarket', 'kalshi', 'manifold'] },
        marketId: { type: 'string' },
        outcome: { type: 'string', enum: ['YES', 'NO'] },
        amount: { type: 'number' }
      },
      required: ['platform', 'marketId', 'outcome', 'amount']
    },
    handler: async (params: any) => {
      return await dain.prediction.placeBet(params);
    }
  },
  {
    name: 'dain_survival_status',
    description: 'Get current survival mode status',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return await dain.survival.getStatus();
    }
  },
  {
    name: 'dain_kill_switch',
    description: 'Emergency kill switch - closes all positions',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return await dain.killAgent();
    }
  }
];
```

### LangChain Integration

```typescript
import { DainClient } from '@dain/agent-sdk';
import { Tool } from 'langchain/tools';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

export class DainSwapTool extends Tool {
  name = 'dain_swap';
  description = 'Swap tokens on Solana. Input: JSON with inputMint, outputMint, amount';

  async _call(input: string): Promise<string> {
    const params = JSON.parse(input);
    const result = await dain.solana.swap({
      ...params,
      slippage: params.slippage || 0.5
    });
    return JSON.stringify(result);
  }
}

export class DainPredictionTool extends Tool {
  name = 'dain_prediction';
  description = 'Place prediction market bets. Input: JSON with platform, marketId, outcome, amount';

  async _call(input: string): Promise<string> {
    const params = JSON.parse(input);
    const result = await dain.prediction.placeBet(params);
    return JSON.stringify(result);
  }
}

export class DainSurvivalTool extends Tool {
  name = 'dain_survival';
  description = 'Check survival mode status. No input required.';

  async _call(_input: string): Promise<string> {
    const status = await dain.survival.getStatus();
    return JSON.stringify(status);
  }
}

// Usage
const tools = [
  new DainSwapTool(),
  new DainPredictionTool(),
  new DainSurvivalTool()
];
```

---

## Examples

### Arbitrage Bot

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

async function runArbitrageBot() {
  await dain.registerAgent({
    name: 'arbitrage-bot',
    permissions: ['SWAP', 'PLACE_BET'],
    survivalConfig: { initialBalance: 10000 }
  });

  while (true) {
    // Check survival status
    const status = await dain.survival.getStatus();
    if (status.state === 'CRITICAL') {
      console.log('CRITICAL state - stopping bot');
      break;
    }

    // Find arbitrage opportunities
    const opportunities = await dain.prediction.findArbitrage({
      minProfit: 2,
      platforms: ['polymarket', 'kalshi']
    });

    for (const opp of opportunities) {
      if (!dain.survival.canExecute('PLACE_BET')) continue;

      const size = dain.survival.getAdjustedPositionSize(500);
      if (size === 0) continue;

      try {
        await dain.prediction.executeArbitrage(opp, size);
        console.log(`Executed arb: ${opp.profit}% profit`);
      } catch (error) {
        console.error('Arb failed:', error);
      }
    }

    await sleep(30000); // Wait 30 seconds
  }
}
```

### Copy Trading Bot

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

async function setupCopyTrading() {
  await dain.registerAgent({
    name: 'copy-trader',
    permissions: ['SWAP', 'COPY_TRADE']
  });

  // Configure whales to follow
  const whales = [
    { wallet: '0x123...', label: 'Top Trader', multiplier: 0.1 },
    { wallet: '0x456...', label: 'Whale #2', multiplier: 0.05 }
  ];

  for (const whale of whales) {
    await dain.configureCopyTrading({
      targetWallet: whale.wallet,
      targetLabel: whale.label,
      enabled: true,
      dryRun: false,
      sizingMode: 'proportional',
      proportionMultiplier: whale.multiplier,
      maxPositionSize: 1000,
      maxSlippage: 1.0,
      stopLoss: 0.10,
      takeProfit: 0.25
    });
  }

  console.log('Copy trading configured');
}
```

### Risk-Managed Futures Bot

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY! });

async function tradeFutures() {
  await dain.registerAgent({
    name: 'futures-bot',
    permissions: ['LEVERAGE_TRADE', 'CLOSE_POSITION'],
    survivalConfig: {
      initialBalance: 10000,
      autoKillOnCritical: true
    }
  });

  // Check survival before trading
  const status = await dain.survival.getStatus();

  if (!dain.survival.canExecute('LEVERAGE_TRADE')) {
    console.log(`Cannot trade in ${status.state} state`);
    return;
  }

  // Adjust leverage based on survival state
  const maxLeverage = 20;
  const adjustedLeverage = dain.survival.getAdjustedLeverage(maxLeverage);

  // Adjust position size
  const baseSize = 1000;
  const adjustedSize = dain.survival.getAdjustedPositionSize(baseSize);

  if (adjustedSize === 0) {
    console.log('Position size reduced to 0 - not trading');
    return;
  }

  const result = await dain.futures.openPosition({
    exchange: 'hyperliquid',
    symbol: 'BTC-USD',
    side: 'LONG',
    amount: adjustedSize,
    leverage: adjustedLeverage,
    stopLoss: 0.05,
    takeProfit: 0.15
  });

  console.log(`Opened position: ${result.positionId}`);
  console.log(`Size: $${adjustedSize} @ ${adjustedLeverage}x`);
}
```

---

## API Reference

### DainClient

```typescript
class DainClient {
  constructor(config: DainConfig)

  // Agent management
  registerAgent(params: RegisterAgentParams): Promise<Agent>
  getAgent(): Promise<Agent>
  pauseAgent(): Promise<void>
  resumeAgent(): Promise<void>
  killAgent(): Promise<{ positionsClosed: number; fundsReturned: number }>
  connectAgent(agentId: string): void
  getAgentId(): string | null

  // Signals
  getSignals(options?: SignalOptions): Promise<Signal[]>

  // Copy trading
  configureCopyTrading(config: CopyTradingConfig): Promise<CopyTradingConfig>
  getCopyTradingConfigs(): Promise<CopyTradingConfig[]>

  // Modules
  solana: SolanaModule
  prediction: PredictionModule
  futures: FuturesModule
  survival: SurvivalMode
}
```

### Configuration

```typescript
interface DainConfig {
  apiKey: string;
  environment?: 'production' | 'staging' | 'local';
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}
```

---

## Error Handling

```typescript
try {
  await dain.solana.swap(params);
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      // Not enough tokens
      break;
    case 'SLIPPAGE_EXCEEDED':
      // Price moved too much
      break;
    case 'SURVIVAL_BLOCKED':
      // Trading blocked by Survival Mode
      break;
    case 'PERMISSION_DENIED':
      // Agent doesn't have permission
      break;
    case 'RATE_LIMITED':
      // Too many requests
      break;
  }
}
```

---

## Support

- **Documentation:** [https://docs.dain.dev](https://docs.dain.dev)
- **GitHub Issues:** [https://github.com/dain-protocol/agent-sdk/issues](https://github.com/dain-protocol/agent-sdk/issues)
- **Discord:** [https://discord.gg/dain](https://discord.gg/dain)
