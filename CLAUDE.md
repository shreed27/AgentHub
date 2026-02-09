# CloddsBot - AI Trading Bot Platform

CloddsBot is a multi-platform AI trading assistant that integrates with prediction markets (Polymarket, Kalshi, Manifold, etc.), crypto exchanges, and DeFi protocols. It supports Telegram, Discord, Slack, and web interfaces.

## Quick Start

```bash
cd CloddsBot-main
pnpm install
pnpm dev        # Development mode with hot reload
pnpm build      # Production build
pnpm start      # Start production server
```

## Project Structure

```
CloddsBot-main/
├── src/
│   ├── gateway/           # Main entry point & HTTP server
│   ├── channels/          # Chat platform adapters (Telegram, Discord, etc.)
│   ├── telegram-menu/     # Interactive Telegram UI (PolyBot-style)
│   ├── feeds/             # Market data feeds (Polymarket, Kalshi, etc.)
│   ├── execution/         # Order execution service
│   ├── trading/           # Trading strategies, copy trading
│   ├── skills/            # Command handlers (bundled skills)
│   ├── db/                # SQLite database
│   ├── pairing/           # Wallet-to-chat linking
│   ├── credentials/       # Per-wallet API credential storage
│   ├── solana/            # Solana DeFi integrations
│   ├── evm/               # EVM chain integrations
│   └── types.ts           # Core type definitions
└── trading-frontend/      # Next.js web dashboard
```

## Core Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Gateway (src/gateway/index.ts)            │
│  - Express HTTP server (port 3001)                              │
│  - WebSocket for real-time updates                              │
│  - REST API routes for frontend                                 │
│  - Coordinates all services                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  Channels   │      │    Feeds     │      │   Execution    │
│  Manager    │      │   Manager    │      │   Service      │
└─────────────┘      └──────────────┘      └────────────────┘
     │                       │                       │
     ▼                       ▼                       ▼
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│ - Telegram  │      │ - Polymarket │      │ - CLOB API     │
│ - Discord   │      │ - Kalshi     │      │ - Limit orders │
│ - Slack     │      │ - Manifold   │      │ - Market orders│
│ - Webchat   │      │ - Metaculus  │      │ - Slippage     │
└─────────────┘      └──────────────┘      └────────────────┘
```

## Key Files Reference

### Entry Points
- `src/gateway/index.ts` - Main server startup, service initialization
- `src/gateway/server.ts` - Express routes, WebSocket setup

### Chat Adapters
- `src/channels/base-adapter.ts` - Base adapter interface
- `src/channels/telegram/index.ts` - Telegram bot (grammY)
- `src/channels/discord/index.ts` - Discord bot
- `src/channels/index.ts` - ChannelManager orchestrator

### Telegram Interactive Menu (NEW)
- `src/telegram-menu/index.ts` - TelegramMenuService orchestrator
- `src/telegram-menu/types.ts` - MenuState, MenuContext, MenuResult types
- `src/telegram-menu/menus/main.ts` - Main menu handler
- `src/telegram-menu/menus/markets.ts` - Market search & detail
- `src/telegram-menu/menus/portfolio.ts` - Portfolio view
- `src/telegram-menu/menus/orders.ts` - Orders view
- `src/telegram-menu/menus/wallet.ts` - Wallet view
- `src/telegram-menu/menus/copy-trading.ts` - Copy trading UI
- `src/telegram-menu/menus/order-wizard.ts` - Order entry flow

### Market Data Feeds
- `src/feeds/index.ts` - FeedManager (aggregates all feeds)
- `src/feeds/polymarket/index.ts` - Polymarket API
- `src/feeds/kalshi/index.ts` - Kalshi API
- `src/feeds/manifold/index.ts` - Manifold API

### Trading & Execution
- `src/execution/index.ts` - ExecutionService factory
- `src/trading/copy-trading-orchestrator.ts` - Copy trading engine
- `src/skills/bundled/trading-polymarket/index.ts` - Polymarket trading skill

### Database & State
- `src/db/index.ts` - SQLite wrapper, schema
- `src/pairing/index.ts` - PairingService (wallet↔chat linking)
- `src/credentials/index.ts` - CredentialsManager (encrypted API keys)

### Skills System
- `src/skills/executor.ts` - Skill executor
- `src/skills/bundled/` - All bundled skills (80+ skills)
- `src/commands/index.ts` - Command parser

## Database Schema

```sql
-- Wallet-Chat Pairing
CREATE TABLE wallet_pairings (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  platform TEXT NOT NULL,         -- 'telegram', 'discord', etc.
  chat_id TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Per-Wallet Credentials
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  platform TEXT NOT NULL,         -- 'polymarket', 'kalshi', etc.
  encrypted_data TEXT NOT NULL,   -- AES-256-GCM encrypted JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Copy Trading Configs
CREATE TABLE copy_configs (
  id TEXT PRIMARY KEY,
  follower_wallet TEXT NOT NULL,
  target_wallet TEXT NOT NULL,
  target_label TEXT,
  enabled INTEGER DEFAULT 1,
  max_position_size REAL,
  proportion REAL DEFAULT 1.0,
  platforms TEXT,                 -- JSON array
  created_at INTEGER DEFAULT (unixepoch())
);

-- Positions
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  platform TEXT NOT NULL,
  market_id TEXT NOT NULL,
  token_id TEXT,
  outcome TEXT,
  shares REAL NOT NULL,
  avg_price REAL NOT NULL,
  current_price REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  platform TEXT NOT NULL,
  market_id TEXT NOT NULL,
  token_id TEXT,
  side TEXT NOT NULL,             -- 'BUY' or 'SELL'
  size REAL NOT NULL,
  price REAL,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch())
);
```

## Telegram Menu Callback Protocol

Telegram limits callback_data to 64 bytes. Compact encoding:

```
Format: action:param1:param2:...

Examples:
- menu:main           → Show main menu
- menu:portfolio      → Show portfolio
- menu:orders         → Show orders
- menu:wallet         → Show wallet
- menu:copy           → Show copy trading
- menu:search         → Show search prompt
- search:query:page   → Search results
- market:marketId     → Market detail
- buy:tokenId         → Start buy flow
- sell:tokenId        → Start sell flow
- order:size:tid:100  → Set order size
- order:price:tid:0.5 → Set order price
- order:exec:tid      → Execute order
- copy:add            → Add copy subscription
- copy:toggle:cfgId   → Toggle subscription
- refresh             → Refresh current view
```

## Environment Variables

```env
# Required
TELEGRAM_BOT_TOKEN=           # Telegram bot token
DATABASE_PATH=./data/bot.db   # SQLite database path
ENCRYPTION_KEY=               # 32-byte hex for credentials encryption

# Polymarket CLOB API
POLY_ADDRESS=                 # Ethereum address for Polymarket
POLY_PRIVATE_KEY=             # Private key for signing
POLY_API_KEY=                 # CLOB API key
POLY_API_SECRET=              # CLOB API secret
POLY_API_PASSPHRASE=          # CLOB API passphrase

# Optional
DISCORD_TOKEN=                # Discord bot token
ANTHROPIC_API_KEY=            # For AI features
OPENAI_API_KEY=               # Alternative AI provider
```

## Common Patterns

### Adding a New Telegram Menu

1. Create handler in `src/telegram-menu/menus/your-menu.ts`:
```typescript
import { MenuContext, MenuResult, btn, mainMenuButton } from '../types';

export async function yourMenuHandler(ctx: MenuContext, params: string[]): Promise<MenuResult> {
  return {
    text: '**Your Menu**\n\nContent here...',
    buttons: [
      [btn('Option 1', 'your:action1'), btn('Option 2', 'your:action2')],
      [mainMenuButton()],
    ],
  };
}
```

2. Register in `src/telegram-menu/index.ts`:
```typescript
import { yourMenuHandler } from './menus/your-menu';

// In getHandler():
case 'your': return yourMenuHandler;
```

### Adding a New Skill

1. Create in `src/skills/bundled/your-skill/index.ts`:
```typescript
import { createSkill } from '../../types';

export default createSkill({
  name: 'your-skill',
  description: 'What it does',
  examples: ['example usage'],
  handler: async (ctx, params) => {
    // Implementation
    return { content: 'Response' };
  },
});
```

2. Export from `src/skills/bundled/index.ts`

### Adding a New Feed

1. Create in `src/feeds/your-platform/index.ts`:
```typescript
export function createYourPlatformFeed(): Feed {
  return {
    platform: 'your-platform',
    async getMarkets(options) { ... },
    async getMarket(id) { ... },
    async searchMarkets(query) { ... },
  };
}
```

2. Register in `src/feeds/index.ts`

## Recently Implemented Features

### Interactive Telegram Menu (Feb 2025)
- Full menu-driven UI replacing text commands
- Market search with pagination
- Order entry wizard (size → price → confirm)
- Copy trading management via buttons
- Portfolio and orders view

### Copy Trading Orchestrator (Feb 2025)
- `src/trading/copy-trading-orchestrator.ts`
- Monitors target wallets for trades
- Replicates trades proportionally
- Per-follower configuration

### Polymarket CLOB Integration (Feb 2025)
- Real order execution via CLOB API
- Limit orders and market orders
- Order signing with private key

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/feeds/polymarket/index.test.ts

# Type check
pnpm tsc --noEmit
```

## Troubleshooting

### TypeScript Errors
- Run `pnpm tsc --noEmit` to see all errors
- Most pre-existing errors are in Solana files (optional dependencies)

### Telegram Bot Not Responding
- Check `TELEGRAM_BOT_TOKEN` is set
- Verify bot hasn't been blocked
- Check `src/channels/telegram/index.ts` for error handling

### Orders Not Executing
- Verify Polymarket credentials in database
- Check `POLY_*` environment variables
- Test with `dryRun: true` first
