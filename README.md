# Super Trading Platform (DAIN)

> Decentralized Autonomous Intelligence Network - A unified autonomous trading platform combining 7 projects into one super app.

## Architecture Overview

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

## Integrated Projects

| Project | Purpose | Features |
|---------|---------|----------|
| **CloddsBot** | Execution Engine | 22 channels, 9 prediction markets, 4 CEX perpetuals, risk engine |
| **AgentDEX** | Solana DEX API | Jupiter V6 swaps, agent registration, limit orders |
| **trading-frontend** | Unified Dashboard | God wallets, AI analysis, smart trading, bounties (features extracted from Opus-X & OSINT Market) |
| **OpenClaw** | Multi-Exchange | Survival mode, X402 payments, trading pipelines |
| **ClawdNet** | A2A Protocol | Agent discovery, X402 USDC payments, reputation |
| **AgentHub** | Architecture | Multi-agent coordination patterns |

> **Note**: Features from Opus-X (god wallets, AI entry analysis, smart trading types) and OSINT Market (bounties, reputation, wallet auth, escrow) have been extracted and integrated into `trading-frontend` and `apps/gateway`.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start Services

```bash
# Start all services
./scripts/start-all.sh

# Or start individually:
npm run dev:gateway      # Gateway API (port 4000)
npm run dev:orchestrator # Orchestrator (port 4001)
npm run dev:frontend     # Frontend (port 5000)
```

### 4. Open Dashboard

Visit http://localhost:5000

## Project Structure

```
super-trading-platform/
├── apps/
│   └── gateway/              # Unified API Gateway
│       ├── src/
│       │   ├── routes/       # REST API endpoints
│       │   ├── services/     # Service registry
│       │   └── websocket/    # Real-time events
│       └── package.json
├── trading-orchestrator/     # Core Orchestration
│   ├── src/
│   │   ├── orchestrator/     # Agent lifecycle, permissions
│   │   ├── adapters/         # Service adapters
│   │   └── types/            # TypeScript types
│   └── package.json
├── trading-frontend/         # Premium Dashboard (with extracted features)
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   ├── components/       # UI components
│   │   ├── features/         # Feature modules (god-wallets, smart-trading, bounties)
│   │   ├── lib/              # API client, WebSocket, AI analysis, reputation
│   │   └── types/            # TypeScript types (portfolio)
│   └── package.json
├── CloddsBot-main/           # Execution Engine
├── agent-dex-main/           # Solana DEX API (backend only)
├── openclaw-sidex-kit-main/  # Multi-Exchange Pipelines
├── clawdnet-main/            # A2A Protocol
├── AgentHub-Repo/            # Architecture Reference (backend only)
├── scripts/
│   ├── start-all.sh          # Start all services
│   └── stop-all.sh           # Stop all services
├── package.json              # Monorepo root
└── README.md
```

## API Endpoints

### Gateway API (port 4000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Service health status |
| `/api/v1/agents` | GET/POST | List/create agents |
| `/api/v1/agents/:id/status` | PUT | Update agent status |
| `/api/v1/agents/:id/kill` | PUT | Emergency kill switch |
| `/api/v1/execution/intent` | POST | Create trade intent |
| `/api/v1/execution/quote` | POST | Get swap quote |
| `/api/v1/execution/swap` | POST | Execute swap |
| `/api/v1/signals` | GET | List signals |
| `/api/v1/signals/god-wallets` | GET | God wallet tracking |
| `/api/v1/portfolio/positions` | GET | Current positions |
| `/api/v1/portfolio/wallet/:addr` | GET | Wallet portfolio |
| `/api/v1/market/prices/:mint` | GET | Token price |
| `/api/v1/market/trending` | GET | Trending tokens |
| `/api/v1/market/arbitrage` | GET | Arbitrage opportunities |
| `/api/v1/bounties` | GET/POST | List/create bounties |
| `/api/v1/bounties/:id` | GET | Get bounty details |
| `/api/v1/bounties/:id/claim` | POST | Claim bounty |
| `/api/v1/bounties/:id/submit` | POST | Submit solution |
| `/api/v1/bounties/:id/resolve` | POST | Resolve submission |

### WebSocket Events

Connect to `ws://localhost:4000` and subscribe to rooms:

```javascript
socket.emit('subscribe', ['signals', 'positions', 'market']);
```

| Event | Description |
|-------|-------------|
| `signal_received` | New signal from any source |
| `whale_detected` | Whale trade alert |
| `god_wallet_buy` | God wallet purchase |
| `ai_reasoning` | AI analysis stream |
| `arbitrage_opportunity` | Arb opportunity |
| `position_opened` | New position |
| `position_closed` | Position closed |
| `price_update` | Price change |
| `execution_completed` | Trade executed |

## Adapters

The orchestrator uses adapters to connect to each service:

```typescript
import {
  CloddsBotAdapter,
  AgentDexAdapter,
  OpusXAdapter,
  OpenClawAdapter,
  OsintMarketAdapter,
  ClawdnetAdapter
} from 'trading-orchestrator';

// Example: Execute swap via AgentDEX
const agentDex = new AgentDexAdapter({ baseUrl: 'http://localhost:3001' });
const result = await agentDex.executeSwap({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '1000000000',
});

// Example: Check risk via CloddsBot
const cloddsbot = new CloddsBotAdapter({ baseUrl: 'http://localhost:18789' });
const riskCheck = await cloddsbot.checkRisk({
  userId: 'agent-1',
  platform: 'polymarket',
  side: 'buy',
  size: 1000,
  price: 0.65,
});
```

## Features by Source

### Trading & Execution
- 9 Prediction Markets (CloddsBot)
- 4 CEX Perpetuals up to 200x (CloddsBot, OpenClaw)
- Solana DEX via Jupiter (AgentDEX, CloddsBot)
- EVM DEX via Uniswap/1inch (CloddsBot, OpenClaw)
- Smart Router for best price (CloddsBot)
- MEV Protection via Jito (CloddsBot)

### Intelligence & Signals
- 24 God Wallet Tracking (Opus-X)
- Whale Detection (CloddsBot, Opus-X)
- AI Entry Analysis with Gemini (Opus-X)
- Arbitrage Detection (CloddsBot)
- OSINT Bounty Marketplace (OSINT Market)

### Risk & Safety
- VaR/CVaR Risk Engine (CloddsBot)
- Circuit Breaker (CloddsBot)
- Survival Mode (OpenClaw)
- Permission Manager (Orchestrator)
- Kill Switch (Orchestrator)

### AI & Agents
- 6 LLM Providers (CloddsBot)
- 103 Skills (CloddsBot)
- Agent Discovery (ClawdNet)
- A2A Protocol (ClawdNet)
- X402 Payments (ClawdNet, OpenClaw)

## Development

### Running Individual Services

```bash
# Gateway
cd apps/gateway && npm run dev

# Orchestrator
cd trading-orchestrator && npm run dev

# Frontend
cd trading-frontend && npm run dev

# CloddsBot
cd CloddsBot-main && npm start

# AgentDEX
cd agent-dex-main/api && npm run dev
```

### Building for Production

```bash
npm run build
```

## Environment Variables

See `.env.example` for all required variables:

- **Gateway**: Port, CORS, service URLs
- **CloddsBot**: AI API keys, Solana keys, channel tokens
- **AgentDEX**: Helius RPC URL
- **Opus-X**: Gemini API, Supabase
- **OpenClaw**: Sidex token, EVM keys, CEX API keys
- **OSINT Market**: Escrow keys, database URL

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Backend | Node.js 20+, Express, TypeScript |
| Real-time | Socket.io, WebSocket |
| Blockchain | @solana/web3.js, viem, ethers.js |
| Database | SQLite, Supabase PostgreSQL |
| AI | Claude, GPT-4, Gemini, Groq |

## License

MIT
