# Collesium Trading Platform - Deployment Guide

Deploy the full stack using **Vercel** (frontend) + **Railway** (backends).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERCEL (Frontend)                             │
│              trading-platform.vercel.app                             │
│                        Port: 3000                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAILWAY (Backends)                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    GATEWAY (4000)                             │   │
│  │            Unified API Gateway + WebSocket                    │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ Internal Network                       │
│  ┌────────────┬─────────────┼─────────────┬─────────────┐          │
│  │            │             │             │             │          │
│  ▼            ▼             ▼             ▼             ▼          │
│ ┌────────┐ ┌────────────┐ ┌────────┐ ┌────────┐ ┌────────────┐    │
│ │Orchestr│ │ CloddsBot  │ │AgentDex│ │OpenClaw│ │  (Future)  │    │
│ │  4001  │ │   18789    │ │  3001  │ │  3003  │ │  Services  │    │
│ └────────┘ └────────────┘ └────────┘ └────────┘ └────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Railway Account**: https://railway.app (free tier available)
2. **Vercel Account**: https://vercel.com (free tier available)
3. **GitHub Repository**: Push your code to GitHub first

### Required API Keys

| Service | Required | Get From |
|---------|----------|----------|
| Anthropic or Groq | Yes (one) | console.anthropic.com / console.groq.com |
| Telegram Bot | Recommended | t.me/BotFather |
| Polymarket CLOB | Optional | polymarket.com/settings/api |

---

## Step 1: Deploy Backend Services to Railway

### 1.1 Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 1.2 Create Railway Project

```bash
# From project root
railway init
# Select "Empty Project"
# Name it: collesium-trading
```

### 1.3 Deploy Services (in order)

Deploy each service as a separate Railway service within the same project:

#### A. Deploy Gateway (Primary - deploy first)

```bash
cd apps/gateway
railway link
# Select your project, create new service named "gateway"
railway up
```

Set environment variables in Railway Dashboard:
- Go to: Railway Dashboard → gateway service → Variables
- Add variables from `apps/gateway/.env.production.example`

#### B. Deploy Trading Orchestrator

```bash
cd trading-orchestrator
railway link
# Create new service named "orchestrator"
railway up
```

Set variables from `trading-orchestrator/.env.production.example`

#### C. Deploy Agent DEX

```bash
cd agent-dex-main/api
railway link
# Create new service named "agent-dex"
railway up
```

Set variables from `agent-dex-main/api/.env.production.example`

#### D. Deploy OpenClaw

```bash
cd openclaw-sidex-kit-main
railway link
# Create new service named "openclaw"
railway up
```

Set variables from `openclaw-sidex-kit-main/.env.production.example`

#### E. Deploy CloddsBot

```bash
cd CloddsBot-main
railway link
# Create new service named "cloddsbot"
railway up
```

Set variables from `CloddsBot-main/.env.production.example`

### 1.4 Configure Internal Networking

Once all services are deployed, update the Gateway's service URLs to use Railway's private networking:

In Railway Dashboard → gateway → Variables:
```
ORCHESTRATOR_URL=http://orchestrator.railway.internal:4001
CLODDSBOT_URL=http://cloddsbot.railway.internal:18789
AGENT_DEX_URL=http://agent-dex.railway.internal:3001
OPENCLAW_URL=http://openclaw.railway.internal:3003
```

### 1.5 Get Gateway Public URL

1. Go to Railway Dashboard → gateway service → Settings
2. Generate a public domain (or add custom domain)
3. Copy the URL (e.g., `gateway-production-xxxx.up.railway.app`)

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Deploy via Vercel CLI

```bash
cd trading-frontend
npx vercel

# Follow prompts:
# - Link to existing project? N
# - Project name: collesium-trading-frontend
# - Framework: Next.js
# - Build command: npm run build
# - Output directory: .next
```

### 2.2 Set Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_GATEWAY_URL=https://gateway-production-xxxx.up.railway.app
NEXT_PUBLIC_WS_URL=wss://gateway-production-xxxx.up.railway.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Optional:
```
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### 2.3 Deploy Production

```bash
npx vercel --prod
```

### 2.4 Update Gateway CORS

Go back to Railway → gateway → Variables and update:
```
CORS_ORIGINS=https://your-frontend.vercel.app
```

Redeploy gateway for CORS changes to take effect.

---

## Step 3: Verification

### 3.1 Test Backend Health

```bash
# Gateway health
curl https://gateway-production-xxxx.up.railway.app/api/health

# Gateway API health
curl https://gateway-production-xxxx.up.railway.app/api/v1/health

# Test Polymarket markets
curl https://gateway-production-xxxx.up.railway.app/api/v1/polymarket/markets
```

### 3.2 Test Frontend

1. Open: `https://your-frontend.vercel.app`
2. Check browser console for WebSocket connection
3. Connect wallet (Phantom, Solflare, etc.)
4. Navigate to different pages:
   - `/` - Dashboard
   - `/polymarket` - Prediction Markets
   - `/trading` - Swap Widget
   - `/portfolio` - Holdings

### 3.3 Test Telegram Bot (if configured)

1. Find your bot on Telegram
2. Send `/start`
3. Try `/findtrades` to test market scanning

---

## Environment Variables Reference

### Gateway (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| NODE_ENV | Environment | production |
| CORS_ORIGINS | Allowed origins | https://app.vercel.app |
| SOLANA_RPC_URL | Solana endpoint | https://api.mainnet-beta.solana.com |

### CloddsBot (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| ANTHROPIC_API_KEY | AI provider | sk-ant-... |
| TELEGRAM_BOT_TOKEN | Telegram bot | 123456:ABC... |
| CLODDS_CREDENTIAL_KEY | Encryption | (32-byte hex) |

### Trading Orchestrator (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| JWT_SECRET | Auth token | (32-byte hex) |
| ENCRYPTION_KEY | Encryption | (32-byte hex) |

### Frontend (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_GATEWAY_URL | Backend URL | https://gateway.up.railway.app |
| NEXT_PUBLIC_WS_URL | WebSocket URL | wss://gateway.up.railway.app |

---

## Cost Estimate

| Service | Platform | Monthly Cost |
|---------|----------|--------------|
| Frontend | Vercel Hobby | Free |
| Gateway | Railway | ~$5 |
| Orchestrator | Railway | ~$2 |
| Agent DEX | Railway | ~$2 |
| OpenClaw | Railway | ~$2 |
| CloddsBot | Railway | ~$5-10 |
| **Total** | | **~$16-21/month** |

Railway provides $5 free credit per month.

---

## Troubleshooting

### Services not connecting

1. Check Railway logs: Dashboard → Service → Deployments → View Logs
2. Verify internal URLs use `.railway.internal` domain
3. Ensure all services are in the same Railway project

### WebSocket not connecting

1. Check browser console for connection errors
2. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
3. Ensure CORS_ORIGINS includes your frontend URL

### Database errors

Services use SQLite (file-based). For Railway:
- Gateway and CloddsBot need persistent volumes for database
- Add a volume in Railway Dashboard → Service → Settings → Volumes
- Mount path: `/app/data` or `/data`

### Build failures

1. Check Railway build logs
2. Ensure Dockerfile exists and is valid
3. Verify all dependencies in package.json

### AI not responding

1. Check CloddsBot logs for API errors
2. Verify ANTHROPIC_API_KEY or GROQ_API_KEY is set
3. Check API key has sufficient credits

---

## Production Checklist

- [ ] All Railway services deployed and healthy
- [ ] Environment variables set for all services
- [ ] Internal networking configured (*.railway.internal)
- [ ] Gateway public URL generated
- [ ] Frontend deployed to Vercel
- [ ] CORS configured with frontend URL
- [ ] Health checks passing
- [ ] WebSocket connection working
- [ ] Wallet connection working
- [ ] API responses returning data

---

## Custom Domain Setup

### Railway (Gateway)

1. Dashboard → Service → Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Add CNAME record in DNS: `api` → Railway provided value

### Vercel (Frontend)

1. Dashboard → Project → Settings → Domains
2. Add domain: `app.yourdomain.com`
3. Add CNAME record in DNS: `app` → `cname.vercel-dns.com`

Update environment variables with new domains:
- Gateway: `CORS_ORIGINS=https://app.yourdomain.com`
- Frontend: `NEXT_PUBLIC_GATEWAY_URL=https://api.yourdomain.com`

---

## Scaling

### Horizontal Scaling (Railway)

Railway automatically handles scaling. For high traffic:
1. Upgrade to Pro plan
2. Enable autoscaling in Service Settings
3. Set min/max instances

### Database Scaling

For production with high traffic, consider:
1. PostgreSQL on Railway (add as service)
2. Update services to use DATABASE_URL
3. Run migrations

---

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Project Issues: [Your GitHub Issues URL]
