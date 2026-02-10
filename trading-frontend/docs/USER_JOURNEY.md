# Complete User Journey - Collesium Trading Platform

This document describes the end-to-end user flow for trading on the Collesium platform via both Web and Telegram.

---

## Overview

Users can trade through two channels:
1. **Web Dashboard** - Full-featured trading with AI analysis
2. **Telegram Bot** - Quick trading on-the-go with AI trade discovery

Both channels support:
- Wallet connection
- AI-powered trade suggestions
- Order execution with real exchange integration

---

## Web Trading Flow

### Step 1: Connect Wallet

1. User visits the dashboard at `https://app.collesium.com` (or localhost:3000 for dev)
2. Click the **"Connect Wallet"** button in the header
3. Select wallet provider (Phantom, Solflare, Backpack, etc.)
4. Approve connection in wallet popup

**Technical Implementation:**
- `src/components/providers/WalletProvider.tsx` - Solana wallet adapter setup
- `src/components/wallet/CustomWalletModal.tsx` - Wallet selection UI
- Uses `@solana/wallet-adapter-react` for wallet connection

### Step 2: View AI Suggestions (Passive)

1. Once connected, the dashboard shows real-time AI analysis
2. The **AI Reasoning** panel streams recommendations via WebSocket
3. Shows: token symbol, signal (buy/sell/watch), confidence %, reasoning

**Technical Implementation:**
- `src/components/trading/AIReasoning.tsx` - Display component
- `src/lib/useWebSocket.ts` - WebSocket hook (`useAIReasoning()`)
- Subscribes to `ai_reasoning` events from gateway

### Step 3: Analyze Token (On-Demand) ✨ NEW

1. Navigate to **Trading → Live Execution** tab
2. Use the **SwapWidget** to select tokens
3. Enter an amount to swap
4. Click **"Analyze with AI"** button
5. AI analyzes the trade opportunity and shows:
   - Signal: Strong Buy / Buy / Watch / Avoid / Sell
   - Confidence percentage
   - Reasoning explanation
   - Key risks
   - Entry/exit strategy

**Technical Implementation:**
- `src/app/api/ai-analysis/route.ts` - API endpoint (Groq/Llama 3.3)
- `src/lib/useTokenAnalysis.ts` - React hook for on-demand analysis
- `src/components/trading/SwapWidget.tsx` - Integrated "Analyze with AI" button

### Step 4: Execute Trade

1. Review the AI analysis (if requested)
2. Verify quote details (rate, price impact, minimum received)
3. Click **"Swap [Token] for [Token]"** button
4. Sign transaction in wallet popup
5. Wait for confirmation
6. View transaction on Solscan

**Technical Implementation:**
- `src/components/trading/SwapWidget.tsx` - Full swap execution
- Uses Jupiter V6 via gateway API (`/api/v1/execution/quote`, `/api/v1/execution/swap-transaction`)
- Signs with connected wallet via `signTransaction()`

---

## Telegram Trading Flow

### Step 1: Connect Wallet (Pairing)

1. User starts the Telegram bot
2. Send `/start` command
3. Bot provides an 8-character pairing code
4. User enters code in web app settings OR
5. User can pair via `/pair` command

**Technical Implementation:**
- `src/pairing/index.ts` (CloddsBot) - Generates and validates pairing codes
- Codes expire after 1 hour
- Links Telegram chat ID to wallet address

### Step 2: AI Trade Discovery

1. Send `/findtrades` or tap **"🔍 Find Trades"** button
2. Bot scans 500+ active markets
3. AI analyzes for opportunities
4. Returns TOP 3 opportunities with:
   - Market question
   - Recommended side (YES/NO)
   - Current price → Target price
   - Confidence %
   - Edge type (arbitrage, volume spike, value play)

**Technical Implementation:**
- `src/telegram-menu/menus/find-trades.ts` - AI-powered trade discovery
- `analyzeOpportunities()` - Cross-platform analysis
- Checks for arbitrage between Polymarket and Kalshi

### Step 3: Quick Buy (1-Click)

From the Find Trades results:
1. Tap **"💰 BUY $50 #1"** or **"💰 BUY $100 #1"**
2. Bot executes market buy immediately
3. Confirmation shows: order ID, shares, fill price

**Technical Implementation:**
- `quickBuyHandler()` in `find-trades.ts`
- Creates per-user execution service with user's credentials
- Executes via `userExecution.marketBuy()`

### Step 4: Order Wizard (Custom Orders)

For more control:
1. Tap **"📊 View Market"** on any opportunity
2. Select **"🟢 Buy YES"** or **"🔴 Buy NO"**
3. Choose order size: $10, $25, $50, $100, Custom
4. For limit orders: select price point
5. Confirm order
6. Bot executes with user's credentials

**Technical Implementation:**
- `src/telegram-menu/menus/order-wizard.ts` - Multi-step flow
- State machine: size → price → confirm → execute
- Uses EIP-712 signed orders for Polymarket CLOB

### Step 5: Manage Portfolio

1. Tap **"📊 Portfolio"** from main menu
2. View all positions with P&L
3. Tap any position for details
4. Options: Close position, view market, refresh

**Technical Implementation:**
- `src/telegram-menu/menus/portfolio.ts` - Position management
- `executeClosePosition()` - Market sell for exit

---

## Credentials Flow

### Web App
- User adds Polymarket API credentials in Settings
- Credentials stored with AES-256-GCM encryption
- Per-credential salt (16 bytes) + IV (12 bytes)

### Telegram
- Bot retrieves user's credentials via wallet address
- Creates per-user execution service on each trade
- Never shares credentials between users

**Technical Implementation:**
- `src/credentials/index.ts` (CloddsBot) - Encrypted storage
- Format: `v2:salt:iv:authTag:encryptedData`
- Uses `ENCRYPTION_KEY` env variable (32-byte hex)

---

## Order Execution Flow

### Polymarket (via CloddsBot/Telegram)

```
1. User initiates trade
2. createUserExecutionService() loads user's credentials
3. Build order: {
     marketId, tokenId, side, size,
     price (for limits), orderType (GTC/FOK)
   }
4. Sign order with EIP-712 (Polymarket CLOB format)
5. Submit to Polymarket CLOB API
6. Wait for fill confirmation
7. Update local position records
```

### Jupiter Swap (via Web)

```
1. User enters swap amount
2. Fetch quote from Jupiter V6 via gateway
3. User clicks "Swap"
4. Gateway returns serialized transaction
5. User signs with Solana wallet
6. Transaction sent to Solana RPC
7. Confirmation via confirmTransaction()
8. Show success with Solscan link
```

---

## API Endpoints Used

### Gateway API (localhost:4000)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/execution/quote` | Get Jupiter swap quote |
| `POST /api/v1/execution/swap-transaction` | Get signed swap transaction |
| `GET /api/v1/positions` | Get user positions |
| `GET /api/v1/agents` | Get registered agents |
| `GET /api/v1/market-stats` | Platform statistics |

### Frontend API Routes (Next.js)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai-analysis` | On-demand AI token analysis |

### WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `ai_reasoning` | Server → Client | Streamed AI analysis |
| `whale_detected` | Server → Client | Whale activity alerts |
| `signal_received` | Server → Client | Trading signals |
| `price_update` | Server → Client | Real-time price feeds |

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
GROQ_API_KEY=gsk_...  # For AI analysis
```

### CloddsBot (.env)
```env
TELEGRAM_BOT_TOKEN=...
ENCRYPTION_KEY=...  # 32-byte hex
DATABASE_PATH=./data/bot.db
POLY_ADDRESS=...
POLY_PRIVATE_KEY=...
POLY_API_KEY=...
POLY_API_SECRET=...
POLY_API_PASSPHRASE=...
```

---

## Summary

| Step | Web | Telegram |
|------|-----|----------|
| Connect Wallet | Solana adapter modal | 8-char pairing code |
| AI Suggestions | AIReasoning panel (streaming) | /findtrades command |
| On-Demand Analysis | "Analyze with AI" button | Built into Find Trades |
| Execute Trade | SwapWidget (Jupiter) | Quick Buy / Order Wizard |
| Platforms | Solana DEX (Jupiter) | Polymarket CLOB |

Both flows are **100% functional** for their respective platforms:
- **Web**: Solana token swaps via Jupiter V6
- **Telegram**: Polymarket prediction market trading

---

## Testing the Flow

### Web
1. Start frontend: `cd trading-frontend && pnpm dev`
2. Start gateway: `cd trading-orchestrator && pnpm dev`
3. Visit `http://localhost:3000`
4. Connect Phantom wallet
5. Go to Trading → use SwapWidget
6. Click "Analyze with AI" then "Swap"

### Telegram
1. Start CloddsBot: `cd CloddsBot-main && pnpm dev`
2. Open bot in Telegram
3. Send `/start`
4. Pair wallet via web app
5. Send `/findtrades`
6. Tap "BUY $50 #1"
