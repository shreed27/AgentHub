# Colosseum Hackathon Submission

## Team: DAIN

---

# DAIN - AUTONOMOUS TRADING OS

> *One Brain. Every Market. Zero Wallet Popups.*

**Tags:** AI, DeFi, Trading, Infrastructure

---

## Description

The operating system for autonomous trading agents.

7 integrated services. 80,000+ lines of production code. Your agent trades Solana DEXs, prediction markets, and perpetual futures - without wallet popups or human babysitting.

**Signal -> Decide -> Execute -> Adapt**

Your agent spots alpha on Polymarket. Routes through Jupiter for best price. Survival Mode auto-triggers if P&L drops. X402 handles payments. One orchestration layer runs it all.

### Quick Start

```bash
npm install @dain/agent-sdk
```

```typescript
import { DainClient } from '@dain/agent-sdk';

const dain = new DainClient({ apiKey: process.env.DAIN_API_KEY });

// Register your agent
const agent = await dain.registerAgent({
  name: 'my-trading-bot',
  permissions: ['SWAP', 'LIMIT_ORDER']
});

// Execute a Solana swap via Jupiter
const result = await dain.solana.swap({
  inputMint: 'So11...112',  // SOL
  outputMint: 'EPjF...1v',  // USDC
  amount: 100000000,
  slippage: 0.5
});
```

### Integrations

- **Eliza** - Plugin for AI agent framework
- **solana-agent-kit** - Extension for Solana agents
- **Claude MCP** - Model Context Protocol server
- **LangChain** - Trading toolkit for LangChain agents

### Key Features

- 7 production repos, fully integrated
- Real order execution (EIP-712 signed, not mocked)
- Survival Mode: auto risk at 50%/85%/120% thresholds
- 16 feeds, 5 exchanges, 8 prediction platforms
- X402 agent-to-agent payments on Base

---

## Problem & Audience

### The Problem

AI agents need to trade. Current options are broken.

**Option A:** Give your agent a wallet and pray. No permissions, no limits, no kill switch. One bad trade and your treasury is gone.

**Option B:** Build everything yourself. Jupiter integration. Exchange APIs. Risk management. Order routing. That's 6 months of work before your agent makes its first trade.

There's no operating system for autonomous trading. Agents today are either dangerously unrestricted or painfully limited.

### Target Audience

**Primary:** AI agent developers building trading bots on Eliza or solana-agent-kit.

Today they're copy-pasting Jupiter code, writing their own retry logic, and hoping their agent doesn't blow up the treasury.

With DAIN: 3 lines of SDK. Agent registers, gets permissioned wallet access, trades through unified API. Kill switch ready. Survival Mode built-in.

**Secondary:** DeFi protocols needing agent-compatible infrastructure.

- Copy trading systems
- Yield optimizers
- Prediction market aggregators
- Cross-chain arbitrage bots

---

## Solution

### Architecture

```
Agent -> Orchestrator -> Adapters -> Markets
              |
        Permission Check
              |
        Risk Validation
              |
        Execute or Reject
```

### 7 Integrated Services

| Service | Function | Lines of Code |
|---------|----------|---------------|
| **Gateway** | Unified API, 60+ endpoints, WebSocket | ~2,000 |
| **Orchestrator** | Permissions, lifecycle, kill switch | ~3,500 |
| **Agent-DEX** | Solana swaps via Jupiter V6, limit orders | ~1,500 |
| **OpenClaw** | Multi-exchange futures, X402 payments | ~1,500 |
| **CloddsBot** | 25+ skills, 16 feeds, copy trading | ~50,000 |
| **ClawdNet** | A2A protocol, agent registry | Contracts + Docs |
| **Frontend** | 25 pages, real-time dashboard | ~15,000 |

**Total: 80,000+ lines of production code**

### Survival Mode

Automatic risk state machine based on P&L:

```
Health Ratio = currentBalance / initialBalance

>= 120%  GROWTH     Aggressive mode, X402 unlocked
85-120%  SURVIVAL   Normal operations
50-85%   DEFENSIVE  Costs frozen, conservative only
< 50%    CRITICAL   Process exits (capital preserved)
```

No agent decision. Pure math. Tamper-proof.

### Solana Integration

- **Jupiter V6** for DEX routing (best price aggregation)
- **Limit orders** with 30-second auto-execution polling
- **Portfolio tracking** (SOL + all SPL tokens)
- **Agent keypair** generation and management
- **Trade history** audit log

### Permission System

```typescript
interface WalletPermission {
  allowedActions: ['SWAP', 'LIMIT_ORDER', 'LEVERAGE_TRADE'];
  limits: {
    maxTransactionValue: 1000,   // Per-trade cap
    dailyLimit: 5000,            // Daily aggregate
    weeklyLimit: 20000,          // Weekly aggregate
    requiresApproval: false      // Auto-execute
  };
  expiresAt: 1739500000;         // Auto-revoke
}
```

---

## Business Case

### Business Model

**Phase 1 (Now):** Free and open-source. Maximize adoption.

**Phase 2:** Hosted infrastructure.
- $99/mo for managed orchestration
- Kill switch API
- Risk dashboard
- Save teams 3 months of infra work

**Phase 3:** Transaction fees.
- 0.1% on routed volume
- At $10M daily volume = $10K/day revenue

### Competitive Landscape

| Competitor | Gap |
|------------|-----|
| **Generic agent frameworks** (Eliza, AutoGPT) | No trading primitives. Build everything yourself. |
| **Exchange SDKs** | Single exchange, no orchestration, no risk management. |
| **Wallet-as-a-service** (Privy, Dynamic) | Auth only. No trading logic. |

DAIN is the only complete stack: **authentication + permissions + execution + risk + multi-market**.

### What We Built

During this hackathon:

- Full 7-service architecture from scratch
- Real EIP-712 order signing for Polymarket
- Survival Mode state machine
- X402 payment protocol integration
- Copy trading with whale replication
- 80,000+ lines of TypeScript
- 25-page Next.js dashboard
- SDK with framework integrations

### Future Roadmap

**Immediate:** MCP server for Claude integration. Any AI can trade through natural language.

**3 months:** Cross-chain via Wormhole. Agents arbitrage between Solana and EVM.

**6 months:** Agent reputation system. On-chain track record. Verifiable P&L history.

**Long-term:** DAIN becomes the standard runtime for autonomous trading agents. Every serious trading agent runs on our rails.

---

## Technical Details

### Supported Markets

**Solana DEXs:**
- Jupiter V6 (aggregator)
- Raydium
- Orca
- Meteora

**Prediction Markets:**
- Polymarket
- Kalshi
- Manifold
- Metaculus
- PredictIt
- Betfair
- Smarkets

**Perpetual Futures:**
- Hyperliquid (50x)
- Binance Futures (125x)
- Bybit (100x)
- Drift

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind 4, Framer Motion |
| Backend | Express.js, Socket.io, TypeScript |
| Database | SQLite (better-sqlite3) |
| Blockchain | @solana/web3.js, viem, Jupiter V6 |
| AI/LLM | Claude, GPT-4, Gemini, Groq |
| Testing | Jest (2,443 lines of tests) |

### Key Files

| Purpose | Location |
|---------|----------|
| Orchestrator core | `trading-orchestrator/src/orchestrator/AgentOrchestrator.ts` |
| Jupiter integration | `agent-dex-main/api/src/services/jupiter.ts` |
| Survival Mode | `openclaw-sidex-kit-main/core/survival/SurvivalManager.js` |
| EIP-712 signing | `CloddsBot-main/src/execution/index.ts` |
| Copy trading | `CloddsBot-main/src/trading/copy-trading-orchestrator.ts` |
| SDK | `packages/agent-sdk/src/index.ts` |

---

## Links

- **Repository:** [GitHub](https://github.com/dain-protocol/collesium-project)
- **Live Demo:** [https://dain.dev](https://dain.dev)
- **SDK Documentation:** [https://docs.dain.dev](https://docs.dain.dev)
- **Video Demo:** [YouTube/Loom Link]

---

## Key Differentiators

1. **REAL** - Not a demo. Real order execution, real signatures, real risk management.

2. **COMPLETE** - 7 services that actually work together. Not 7 README files.

3. **PRODUCTION-READY** - Docker, Railway, Cloud Run configs. Deploy in 10 minutes.

4. **NOVEL** - Survival Mode is a new primitive. X402 agent payments is a new primitive.

5. **MASSIVE SCOPE** - 80K+ lines is bigger than most startups ship in a year.

---

## Running the Demo

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/dain-protocol/collesium-project.git
cd collesium-project
cp .env.docker .env
docker-compose up

# Open http://localhost:3000
```

### Option 2: Local Development

```bash
# Terminal 1: Backend
cd trading-orchestrator && npm install && npm run dev

# Terminal 2: Frontend
cd trading-frontend && npm install && npm run dev

# Open http://localhost:3000
```

### Demo Walkthrough

1. **Paper Trading** (no setup required)
   - Go to http://localhost:3000/sidex
   - Start with $10,000 virtual balance
   - Open BTC/ETH positions with 10x leverage
   - Watch real-time P&L from Binance prices

2. **Solana Swaps** (requires funded wallet)
   - Go to http://localhost:3000/trading
   - Connect Phantom/Solflare
   - See real Jupiter quotes
   - Execute swaps on mainnet

3. **Copy Trading**
   - Go to http://localhost:3000/sidex (Copy tab)
   - Add a whale wallet to follow
   - Configure sizing and risk limits

---

## Team

**DAIN Team** - Building the future of autonomous trading.

---

*Built with care for the Solana Colosseum Hackathon*
