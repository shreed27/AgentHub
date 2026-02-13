# DAIN SDK Quick Start

Get your trading agent running in 5 minutes.

## 1. Install

```bash
npm install @dain/agent-sdk
```

## 2. Initialize

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({
  apiKey: process.env.DAIN_API_KEY!,
  environment: 'production'
});
```

## 3. Register Your Agent

```typescript
const agent = await dain.registerAgent({
  name: 'my-trading-bot',
  permissions: ['SWAP', 'LIMIT_ORDER', 'PLACE_BET'],
  survivalConfig: {
    initialBalance: 10000,
    autoKillOnCritical: true
  }
});

console.log(`Agent ID: ${agent.id}`);
console.log(`Wallet: ${agent.wallet?.address}`);
```

## 4. Trade

### Solana Swaps

```typescript
import { TOKENS } from '@dain/agent-sdk/solana';

const result = await dain.solana.swap({
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount: 100000000, // 0.1 SOL
  slippage: 0.5
});
```

### Prediction Markets

```typescript
const markets = await dain.prediction.searchMarkets({
  query: 'Bitcoin',
  platform: 'polymarket'
});

await dain.prediction.placeBet({
  platform: 'polymarket',
  marketId: markets[0].id,
  outcome: 'YES',
  amount: 100
});
```

### Futures

```typescript
await dain.futures.openPosition({
  exchange: 'hyperliquid',
  symbol: 'BTC-USD',
  side: 'LONG',
  amount: 1000,
  leverage: 10
});
```

## 5. Monitor Risk

```typescript
const status = await dain.survival.getStatus();

console.log(`State: ${status.state}`);
console.log(`Health: ${(status.healthRatio * 100).toFixed(1)}%`);

// Check before trading
if (dain.survival.canExecute('LEVERAGE_TRADE')) {
  // Safe to trade
}
```

## 6. Emergency Kill Switch

```typescript
// EMERGENCY: Close all positions
const result = await dain.killAgent();
console.log(`Closed ${result.positionsClosed} positions`);
```

## Environment Variables

```bash
DAIN_API_KEY=your-api-key
DAIN_ENVIRONMENT=production
```

## Next Steps

- [Full SDK Documentation](./README.md)
- [Framework Integrations](./README.md#framework-integrations)
- [Examples](./README.md#examples)
