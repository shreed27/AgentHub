# Collesium Trading Platform - Google Cloud Run Deployment Guide

This guide covers deploying the complete trading platform using **Vercel** (frontend) + **Google Cloud Run** (backends).

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
│                   GOOGLE CLOUD RUN (Backends)                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    GATEWAY (4000)                             │   │
│  │     gateway-xxxxx-uc.a.run.app (public)                       │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ Internal/Public URLs                   │
│  ┌────────────┬─────────────┼─────────────┬─────────────┐          │
│  │            │             │             │             │          │
│  ▼            ▼             ▼             ▼             ▼          │
│ ┌────────┐ ┌────────────┐ ┌────────┐ ┌────────┐                    │
│ │Orchestr│ │ CloddsBot  │ │AgentDex│ │OpenClaw│                    │
│ │  4001  │ │   18789    │ │  3001  │ │  3003  │                    │
│ └────────┘ └────────────┘ └────────┘ └────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed locally (optional - Cloud Build works without it)
4. **Vercel Account**: https://vercel.com

## Quick Start

### 1. Setup Google Cloud CLI

```bash
# Login to gcloud
gcloud auth login

# Set project (creates if doesn't exist)
export GCP_PROJECT_ID=collesium-trading
export GCP_REGION=us-central1

# Run the deployment script
./scripts/deploy-cloudrun.sh all
```

### 2. Deploy Frontend to Vercel

```bash
cd trading-frontend
npx vercel --prod
```

## Manual Deployment Steps

### Step 1: Setup Google Cloud Project

```bash
# Login to gcloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create collesium-trading --name="Collesium Trading"

# Set as active project
gcloud config set project collesium-trading

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Set default region
gcloud config set run/region us-central1
```

### Step 2: Deploy Backend Services

Deploy each service using Cloud Build + Cloud Run:

| Order | Service | Directory | Port | Min Instances |
|-------|---------|-----------|------|---------------|
| 1 | gateway | `/apps/gateway` | 4000 | 1 (always on) |
| 2 | orchestrator | `/trading-orchestrator` | 4001 | 0 |
| 3 | agent-dex | `/agent-dex-main/api` | 3001 | 0 |
| 4 | openclaw | `/openclaw-sidex-kit-main` | 3003 | 0 |
| 5 | cloddsbot | `/CloddsBot-main` | 18789 | 0 |

**Deploy Gateway (Primary - deploy first):**
```bash
cd apps/gateway

gcloud run deploy gateway \
  --source . \
  --port 4000 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,PORT=4000"
```

**Deploy Trading Orchestrator:**
```bash
cd trading-orchestrator

gcloud run deploy orchestrator \
  --source . \
  --port 4001 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --set-env-vars "NODE_ENV=production,PORT=4001"
```

**Deploy Agent DEX:**
```bash
cd agent-dex-main/api

gcloud run deploy agent-dex \
  --source . \
  --port 3001 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 256Mi \
  --set-env-vars "NODE_ENV=production,PORT=3001"
```

**Deploy OpenClaw:**
```bash
cd openclaw-sidex-kit-main

gcloud run deploy openclaw \
  --source . \
  --port 3003 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 256Mi \
  --set-env-vars "NODE_ENV=production,PORT=3003"
```

**Deploy CloddsBot:**
```bash
cd CloddsBot-main

gcloud run deploy cloddsbot \
  --source . \
  --port 18789 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,PORT=18789"
```

### Step 3: Get Service URLs

```bash
# List all deployed services and their URLs
gcloud run services list

# Get specific service URL
gcloud run services describe gateway --format="value(status.url)"
```

### Step 4: Set Environment Variables

For each service, update with the correct URLs:

```bash
# Get all service URLs
GATEWAY_URL=$(gcloud run services describe gateway --format="value(status.url)")
ORCHESTRATOR_URL=$(gcloud run services describe orchestrator --format="value(status.url)")
CLODDSBOT_URL=$(gcloud run services describe cloddsbot --format="value(status.url)")
AGENT_DEX_URL=$(gcloud run services describe agent-dex --format="value(status.url)")
OPENCLAW_URL=$(gcloud run services describe openclaw --format="value(status.url)")

# Update gateway with internal service URLs
gcloud run services update gateway --set-env-vars "\
NODE_ENV=production,\
PORT=4000,\
CORS_ORIGINS=https://your-app.vercel.app,\
ORCHESTRATOR_URL=$ORCHESTRATOR_URL,\
CLODDSBOT_URL=$CLODDSBOT_URL,\
AGENT_DEX_URL=$AGENT_DEX_URL,\
OPENCLAW_URL=$OPENCLAW_URL,\
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"

# Update orchestrator
gcloud run services update orchestrator --set-env-vars "\
NODE_ENV=production,\
PORT=4001,\
CLODDSBOT_URL=$CLODDSBOT_URL,\
AGENT_DEX_URL=$AGENT_DEX_URL,\
OPENCLAW_URL=$OPENCLAW_URL,\
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"

# Update cloddsbot (add your API key)
gcloud run services update cloddsbot --set-env-vars "\
NODE_ENV=production,\
PORT=18789,\
ANTHROPIC_API_KEY=sk-ant-xxx"
```

### Step 5: Deploy Frontend to Vercel

```bash
cd trading-frontend
npx vercel --prod
```

Set these environment variables in Vercel dashboard:
```
NEXT_PUBLIC_GATEWAY_URL=https://gateway-xxxxx-uc.a.run.app
NEXT_PUBLIC_WS_URL=wss://gateway-xxxxx-uc.a.run.app
NEXT_PUBLIC_DEMO_MODE=false
```

## Environment Variables by Service

### gateway
```env
NODE_ENV=production
PORT=4000
CORS_ORIGINS=https://your-app.vercel.app
ORCHESTRATOR_URL=https://orchestrator-xxxxx-uc.a.run.app
CLODDSBOT_URL=https://cloddsbot-xxxxx-uc.a.run.app
AGENT_DEX_URL=https://agent-dex-xxxxx-uc.a.run.app
OPENCLAW_URL=https://openclaw-xxxxx-uc.a.run.app
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### trading-orchestrator
```env
NODE_ENV=production
PORT=4001
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JWT_SECRET=<generate-with-openssl-rand-hex-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
CLODDSBOT_URL=https://cloddsbot-xxxxx-uc.a.run.app
AGENT_DEX_URL=https://agent-dex-xxxxx-uc.a.run.app
OPENCLAW_URL=https://openclaw-xxxxx-uc.a.run.app
```

### CloddsBot
```env
NODE_ENV=production
PORT=18789
ANTHROPIC_API_KEY=sk-ant-...
# or GROQ_API_KEY=gsk_...
```

### agent-dex
```env
NODE_ENV=production
PORT=3001
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_RPC_URL=https://your-helius-url.helius-rpc.com
```

### openclaw
```env
NODE_ENV=production
PORT=3003
EVM_RPC_URL=https://mainnet.base.org
EVM_PRIVATE_KEY=0x...  # For X402 payments (optional)
```

### trading-frontend (Vercel)
```env
NEXT_PUBLIC_GATEWAY_URL=https://gateway-xxxxx-uc.a.run.app
NEXT_PUBLIC_WS_URL=wss://gateway-xxxxx-uc.a.run.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Verification

```bash
# 1. Test gateway health
curl https://gateway-xxxxx-uc.a.run.app/api/v1/health

# 2. Test specific endpoints
curl https://gateway-xxxxx-uc.a.run.app/api/v1/polymarket/markets

# 3. Check service logs
gcloud run logs read gateway --limit 50

# 4. Open frontend
open https://your-app.vercel.app
```

## Cost Estimate

| Service | Platform | Monthly Cost |
|---------|----------|--------------|
| Frontend | Vercel | Free (hobby) |
| Gateway (min 1 instance) | Cloud Run | ~$10-15 |
| Other services (scale to 0) | Cloud Run | ~$0-5 |
| **Total** | | **~$10-20/month** |

**Cloud Run Free Tier (per month):**
- 2 million requests
- 360,000 GB-seconds compute
- 180,000 vCPU-seconds

## WebSocket Considerations

Cloud Run supports WebSocket connections with these caveats:

1. **60-minute timeout** - Connections automatically close after 60 minutes
2. **Client reconnection** - Implement automatic reconnection in frontend
3. **HTTP/2** - Cloud Run uses HTTP/2 by default which improves WebSocket performance

For production with heavy WebSocket usage, consider:
- Cloud Pub/Sub for message broadcasting
- Firebase Realtime Database
- A dedicated WebSocket service on GKE

## Troubleshooting

### Service won't start
```bash
# Check logs
gcloud run logs read <service-name> --limit 100

# Check service details
gcloud run services describe <service-name>
```

### Permission errors
```bash
# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin
```

### Cold start latency
- Set `--min-instances 1` for the gateway
- Use smaller container images (Alpine-based)
- Reduce startup dependencies

### CORS errors
Update the gateway's CORS_ORIGINS environment variable:
```bash
gcloud run services update gateway \
  --set-env-vars "CORS_ORIGINS=https://your-frontend-domain.vercel.app"
```

## Cleanup

To delete all services:
```bash
gcloud run services delete gateway --quiet
gcloud run services delete orchestrator --quiet
gcloud run services delete agent-dex --quiet
gcloud run services delete openclaw --quiet
gcloud run services delete cloddsbot --quiet
```

## Security Best Practices

1. **Never commit secrets** - Use Cloud Run environment variables or Secret Manager
2. **Use HTTPS only** - Cloud Run provides this by default
3. **Set CORS properly** - Restrict to your frontend domain
4. **Enable IAM** - For internal service-to-service calls, use IAM authentication
5. **Monitor costs** - Set up billing alerts in GCP Console

## Updating Services

To deploy updates:
```bash
cd <service-directory>
gcloud run deploy <service-name> --source .
```

Or use the deployment script:
```bash
./scripts/deploy-cloudrun.sh service gateway
```
