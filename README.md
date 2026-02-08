# DAIN - Decentralized Autonomous Intelligence Network

> **The First Unified Platform for AI-Powered Trading Agents**

---

## The Problem

Crypto traders juggle **10+ fragmented platforms** daily:
- DEXs (Jupiter, Uniswap) for spot trading
- CEXs (Binance, Bybit) for perpetuals
- Prediction markets (Polymarket, Kalshi) for event trading
- Analytics tools (Birdeye, DeFiLlama) for signals
- Different APIs, UIs, and risk models for each

**AI agents can't operate efficiently** across this fragmentation. They need unified access, consistent risk management, and coordinated execution.

## The Solution:

DAIN unifies **7 trading projects** into one super platform where AI agents can:

- **Trade across 9 prediction markets** with unified position management
- **Execute on Solana + 5 EVM chains + 4 CEXs** through a single API
- **Follow elite "God Wallets"** with automatic trade mirroring
- **Manage risk with Survival Mode** - adaptive limits based on P&L
- **Communicate via A2A Protocol** - agents pay each other with X402

---

## Quick Start

### Option 1: Docker (Recommended for Judges)

```bash
docker-compose up
# Frontend: http://localhost:3000
# API:      http://localhost:4000
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Run demo (shows all features)
./scripts/demo.sh

# Or start manually:
npm run dev  # Starts gateway + orchestrator + frontend
```

---

## Key Features

### 103 AI Skills
From basic swaps to complex multi-leg arbitrage, powered by 6 LLMs (Claude, GPT-4, Gemini, Groq).

### God Wallet Tracking
24 elite traders monitored in real-time. Automatic copy trading with configurable thresholds.

### Survival Mode (Unique)
Adaptive risk management based on portfolio P&L:
- **SURVIVAL** (0% to -15%): Normal trading
- **DEFENSIVE** (-15% to -50%): Positions reduced 50%
- **CRITICAL** (< -50%): Full hibernation
- **GROWTH** (>= +20%): Aggressive mode unlocked

### Jito MEV Protection
All Solana trades bundled via Jito to prevent front-running.

### A2A Protocol
Agent-to-agent communication with X402 USDC payments on Base.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER TRADING PLATFORM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   OSINT     │    │  ClawdNet   │    │  Opus-X     │     │
│  │  Market     │───▶│  Protocol   │◀───│ SuperRouter │     │
│  │ (Intel)     │    │ (Discovery) │    │ (Signals)   │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          TRADING ORCHESTRATOR (Core)                │   │
│  │   Agent Lifecycle + Permissions + Risk + Signals    │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            │                               │
│         ┌──────────────────┼──────────────────┐           │
│         ▼                  ▼                  ▼           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │  AgentDEX   │    │  CloddsBot  │    │  OpenClaw   │   │
│  │ (DEX API)   │    │ (Terminal)  │    │ (Pipelines) │   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│         │                  │                  │           │
│         └──────────────────┼──────────────────┘           │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              BLOCKCHAIN EXECUTION                   │   │
│  │  Solana (Jupiter, Jito) │ EVM (Uniswap, 1inch)     │   │
│  │  Prediction Markets │ Perpetuals (Binance, Bybit)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Integrated Projects

| Project | Purpose | Key Features |
|---------|---------|--------------|
| **CloddsBot** | Execution Engine | 103 skills, 9 prediction markets, 4 CEX perpetuals, risk engine |
| **AgentDEX** | Solana DEX API | Jupiter V6, agent registration, limit orders |
| **OpenClaw** | Multi-Exchange | Survival mode, X402 payments, trading pipelines |
| **ClawdNet** | A2A Protocol | Agent discovery, USDC payments, reputation |
| **Opus-X** | Signal Router | God wallets, AI analysis, smart trading |
| **OSINT Market** | Intelligence | Bounty marketplace, escrow, wallet auth |

---

## Supported Platforms

### DEXs
- **Solana**: Jupiter V6, Raydium, Orca, Meteora
- **EVM**: Uniswap, 1inch, Wormhole bridges

### CEXs (Perpetuals)
- Binance (up to 125x)
- Bybit (up to 100x)
- Hyperliquid
- Drift Labs

### Prediction Markets
- Polymarket
- Kalshi
- Manifold
- Predict.fun
- Betfair
- PredictIt
- Metaculus
- Smarkets
- And more...

---

## API Reference

### REST Endpoints (Gateway :4000)

```
POST /api/v1/agents                  Create agent
PUT  /api/v1/agents/:id/status       Update status
PUT  /api/v1/agents/:id/kill         Emergency kill

POST /api/v1/execution/quote         Get swap quote
POST /api/v1/execution/swap          Execute swap

GET  /api/v1/signals                 List signals
GET  /api/v1/signals/god-wallets     God wallet activity

GET  /api/v1/portfolio/positions     Current positions
GET  /api/v1/arbitrage               Arbitrage opportunities
GET  /api/v1/survival-mode           Current survival state
```

### WebSocket Events

```javascript
socket.emit('subscribe', ['signals', 'positions', 'market']);

// Events received:
socket.on('signal_received', data => { /* whale/ai/arb signals */ });
socket.on('whale_detected', data => { /* god wallet trade */ });
socket.on('ai_reasoning', data => { /* AI analysis stream */ });
socket.on('price_update', data => { /* real-time prices */ });
socket.on('execution_completed', data => { /* trade executed */ });
```

---

## Demo Features

When you run the demo, you'll see:

1. **Dashboard** - Real-time signal feed with whale alerts and AI reasoning
2. **Agent Management** - Deploy, pause, and monitor trading agents
3. **Copy Trading** - Follow God Wallets with trust scores
4. **Arbitrage Scanner** - Cross-platform opportunities
5. **Swarm Trading** - Multi-wallet coordinated execution
6. **Survival Mode** - Adaptive risk visualization

---

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Core Services
GATEWAY_PORT=4000
FRONTEND_URL=http://localhost:3000

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=

# CEX API Keys (optional)
BINANCE_API_KEY=
BYBIT_API_KEY=
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Gateway | Express.js, Socket.io, TypeScript |
| Database | SQLite (better-sqlite3), Supabase PostgreSQL |
| Blockchain | @solana/web3.js, viem, Jupiter V6, Wormhole |
| AI/LLM | Claude 3, GPT-4, Gemini, Groq |

---

## What Makes This Unique

1. **7 Projects Unified** - First platform to consolidate this many trading tools
2. **103 AI Skills** - Comprehensive skill library for agents
3. **Survival Mode** - Novel adaptive risk management
4. **God Wallet Tracking** - 24 elite traders in one view
5. **A2A Protocol** - Agents can discover and pay each other
6. **Multi-Chain** - Solana + EVM via Wormhole
7. **MEV Protection** - Jito bundles for all Solana trades

---

## License

MIT

---

Built for the Solana Colosseum Hackathon
