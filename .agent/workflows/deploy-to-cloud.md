---
description: Deploy complete project to Google Cloud Run and Vercel
---

# Complete Cloud Deployment Workflow

This workflow deploys the entire Collesium Trading Platform to production.

## Prerequisites

1. Google Cloud account with billing enabled
2. Vercel account
3. gcloud CLI installed and authenticated
4. Required API keys (optional but recommended):
   - ANTHROPIC_API_KEY for AI features
   - SOLANA_PRIVATE_KEY for trading execution

## Backend Deployment (Google Cloud Run)

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens a browser for authentication.

### 2. Set up project variables

```bash
export GCP_PROJECT_ID=collesium-trading-$(date +%s)
export GCP_REGION=us-central1
```

### 3. Run automated deployment

// turbo
```bash
cd /Users/shreedshrivastava/Projects/Collesium-Project
./scripts/deploy-cloudrun.sh all
```

This will:
- Create/configure Google Cloud project
- Enable required APIs (Cloud Run, Cloud Build, Artifact Registry)
- Deploy 5 backend services:
  - gateway (port 4000) - Always on, 1 min instance
  - orchestrator (port 4001) - Scales to zero
  - agent-dex (port 3001) - Scales to zero
  - openclaw (port 3003) - Scales to zero
  - cloddsbot (port 18789) - Scales to zero
- Configure inter-service URLs
- Display deployment summary

### 4. Get service URLs

```bash
gcloud run services list --format="table(SERVICE,URL)"
```

Save the gateway URL - you'll need it for the frontend.

### 5. (Optional) Add API keys

```bash
# Add Anthropic API key for AI features
gcloud run services update cloddsbot --set-env-vars "ANTHROPIC_API_KEY=sk-ant-your-key-here"

# Add Solana private key for trading
gcloud run services update orchestrator --set-env-vars "SOLANA_PRIVATE_KEY=your-key-here"
```

### 6. Verify backend deployment

```bash
# Test gateway health
GATEWAY_URL=$(gcloud run services describe gateway --format="value(status.url)")
curl $GATEWAY_URL/api/v1/health

# Expected response: {"status":"ok","timestamp":"..."}
```

## Frontend Deployment (Vercel)

### 1. Login to Vercel

```bash
cd trading-frontend
npx vercel login
```

Follow the prompts to authenticate.

### 2. Deploy to production

```bash
npx vercel --prod
```

### 3. Set environment variables in Vercel

After deployment, configure these in Vercel dashboard or via CLI:

```bash
# Get gateway URL
GATEWAY_URL=$(gcloud run services describe gateway --format="value(status.url)")

# Set Vercel environment variables
npx vercel env add NEXT_PUBLIC_GATEWAY_URL production
# Paste: $GATEWAY_URL

npx vercel env add NEXT_PUBLIC_WS_URL production
# Paste: wss://gateway-xxxxx-uc.a.run.app (replace https with wss)

npx vercel env add NEXT_PUBLIC_DEMO_MODE production
# Paste: false
```

### 4. Redeploy frontend with new env vars

```bash
npx vercel --prod
```

### 5. Update backend CORS

```bash
# Get your Vercel URL (e.g., https://your-app.vercel.app)
VERCEL_URL="https://your-app.vercel.app"

# Update gateway CORS
gcloud run services update gateway --set-env-vars "CORS_ORIGINS=$VERCEL_URL"
```

## Verification

### 1. Test backend

```bash
curl $GATEWAY_URL/api/v1/health
curl $GATEWAY_URL/api/v1/polymarket/markets
```

### 2. Test frontend

Open your Vercel URL in a browser and verify:
- [ ] Dashboard loads
- [ ] Wallet connect works
- [ ] Real-time data updates
- [ ] Trading features accessible

### 3. Check logs

```bash
# Backend logs
gcloud run logs read gateway --limit 50

# Frontend logs
npx vercel logs
```

## Cost Monitoring

Set up billing alerts in Google Cloud Console:
1. Go to Billing → Budgets & alerts
2. Create budget: $20/month
3. Set alert at 50%, 90%, 100%

**Expected monthly cost: $10-20**

## Rollback

If something goes wrong:

```bash
# Rollback a specific service
gcloud run services update-traffic SERVICE_NAME --to-revisions=PREVIOUS_REVISION=100

# Or delete and redeploy
gcloud run services delete SERVICE_NAME
./scripts/deploy-cloudrun.sh service SERVICE_NAME
```

## Updating Services

To deploy updates:

```bash
# Backend
cd /path/to/service
gcloud run deploy service-name --source .

# Frontend
cd trading-frontend
npx vercel --prod
```

## Troubleshooting

### Backend won't start
```bash
gcloud run logs read SERVICE_NAME --limit 100
```

### CORS errors
```bash
gcloud run services update gateway --set-env-vars "CORS_ORIGINS=https://your-frontend.vercel.app"
```

### Cold start issues
```bash
# Increase min instances for critical services
gcloud run services update gateway --min-instances 1
```

### WebSocket connection fails
- Ensure NEXT_PUBLIC_WS_URL uses `wss://` not `https://`
- Check gateway logs for connection errors
- Verify CORS settings include your frontend domain
