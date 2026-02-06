
HIGH-LEVEL ARCHITECTURE (USER → AGENTS → MARKETS)
┌──────────────────────────┐
│        USER / UI         │
│  Web App (Dashboard)     │
│                          │
│ - Connect Wallet         │
│ - Create Agents          │
│ - Set Risk Rules         │
│ - View PnL & Logs        │
└───────────┬──────────────┘
            │
            │ Wallet Signatures / Permissions
            ▼
┌──────────────────────────┐
│   WALLET & PERMISSION    │
│         LAYER            │
│                          │
│ - User-owned wallet      │
│ - Trade caps             │
│ - Kill switch            │
│ - No custody             │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│           AGENT ORCHESTRATION LAYER           │
│        (OpenClaw-based Runtime Engine)        │
│                                              │
│ ┌──────────────┐   ┌──────────────────────┐ │
│ │ TradingAgent │◀──▶│ Research / OSINTAgent│ │
│ └──────────────┘   └──────────────────────┘ │
│        ▲                     ▲               │
│        │                     │               │
│ ┌──────────────┐   ┌──────────────────────┐ │
│ │ RoutingAgent │◀──▶│ Signal / NetworkAgent│ │
│ └──────────────┘   └──────────────────────┘ │
│                                              │
│ - Agent memory                                │
│ - State management                            │
│ - Logs & decisions                            │
└───────────┬──────────────────────────────────┘
            │
            │ Trade Intent (abstract)
            ▼
┌──────────────────────────┐
│     SMART ROUTER         │
│      (Superrouter)      │
│                          │
│ - Best price discovery   │
│ - Slippage optimization  │
│ - Multi-hop execution    │
│ - Market selection       │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│            EXECUTION LAYER                │
│                                          │
│ ┌───────────────┐   ┌──────────────────┐ │
│ │ Prediction Mkts│   │     DEXs         │ │
│ │ (CloddsBot)   │   │ (agent-dex)      │ │
│ └───────────────┘   └──────────────────┘ │
│                                          │
│ - Yes/No trades                           │
│ - Spot swaps                              │
│ - LP / Arb (basic)                        │
└───────────┬──────────────────────────────┘
            │
            ▼
┌──────────────────────────┐
│    BLOCKCHAIN NETWORKS   │
│  (Solana / EVM chains)   │
└──────────────────────────┘

AGENT COMMUNICATION (clawdnet – SIDE CHANNEL)

┌──────────────┐     Signals     ┌──────────────┐
│ Agent A      │◀──────────────▶│ Agent B      │
│ (Trader)     │                 │ (OSINT)     │
└──────────────┘                 └──────────────┘
        ▲                                 ▲
        │                                 │
        └──────────── Agent Network ──────┘

DATA FLOW (REAL EXAMPLE)
News breaks →
OSINT Agent detects sentiment spike →
Signal sent to Trading Agent →
Trading Agent asks Router for best path →
Router chooses Prediction Market →
User wallet signs trade →
CloddsBot executes →
Result logged → Dashboard updated


SECURITY & TRUST BOUNDARY (IMPORTANT): 
USER WALLET
  │
  ├─ owns funds
  ├─ signs transactions
  └─ can revoke agent anytime

AGENTS
  ├─ cannot withdraw funds
  ├─ cannot escalate permissions
  └─ operate under caps
