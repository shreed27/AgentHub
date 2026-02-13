# Deploy Entire Project to Google Cloud Run

This guide will help you deploy the **complete Collesium Trading Platform** (backend + frontend) to Google Cloud Run.

## 🚀 Quick Deploy

Once gcloud is installed and you're authenticated, run:

```bash
./scripts/deploy-cloudrun-full.sh all
```

This single command will:
- ✅ Deploy 5 backend services (gateway, orchestrator, agent-dex, openclaw, cloddsbot)
- ✅ Deploy frontend (Next.js app)
- ✅ Configure all service URLs automatically
- ✅ Set up CORS between frontend and backend
- ✅ Display all deployment URLs

## 📋 Prerequisites

### 1. Complete gcloud Installation

The gcloud installation is currently running. Complete it by:

1. **Enter your sudo password** in the terminal where installation is running
2. After installation completes, **restart your terminal** or run:
   ```bash
   source ~/google-cloud-sdk/path.bash.inc
   source ~/google-cloud-sdk/completion.bash.inc
   ```
3. Verify installation:
   ```bash
   gcloud --version
   ```

### 2. Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens a browser for you to sign in with your Google account.

### 3. Enable Billing

- Go to [Google Cloud Console](https://console.cloud.google.com)
- Navigate to Billing
- Link a billing account (required for Cloud Run)
- **Note**: You get $300 free credits for new accounts

## 🎯 Deployment Steps

### Option 1: Deploy Everything (Recommended)

```bash
cd /Users/shreedshrivastava/Projects/Collesium-Project

# Set your project ID (choose a unique name)
export GCP_PROJECT_ID=collesium-trading-$(date +%s)
export GCP_REGION=us-central1

# Deploy all services
./scripts/deploy-cloudrun-full.sh all
```

### Option 2: Deploy Services Individually

```bash
# Deploy backend services first
./scripts/deploy-cloudrun.sh all

# Then deploy frontend
./scripts/deploy-cloudrun-full.sh service frontend
```

## 📦 What Gets Deployed

| Service | Port | Purpose | Min Instances |
|---------|------|---------|---------------|
| **frontend** | 3000 | Next.js web app | 1 (always on) |
| **gateway** | 4000 | API gateway | 1 (always on) |
| **orchestrator** | 4001 | Trading orchestrator | 0 (scales to zero) |
| **agent-dex** | 3001 | Solana DEX integration | 0 (scales to zero) |
| **openclaw** | 3003 | Multi-exchange trading | 0 (scales to zero) |
| **cloddsbot** | 18789 | AI trading bot | 0 (scales to zero) |

## 🔧 Post-Deployment Configuration

### 1. Add API Keys (Optional but Recommended)

```bash
# Add Anthropic API key for AI features
gcloud run services update cloddsbot --set-env-vars "ANTHROPIC_API_KEY=sk-ant-your-key"

# Add Solana private key for trading
gcloud run services update orchestrator --set-env-vars "SOLANA_PRIVATE_KEY=your-key"

# Add other API keys as needed
gcloud run services update agent-dex --set-env-vars "HELIUS_RPC_URL=your-helius-url"
```

### 2. Get Your Application URLs

```bash
# Frontend URL
gcloud run services describe frontend --format="value(status.url)"

# Gateway API URL
gcloud run services describe gateway --format="value(status.url)"

# All services
gcloud run services list
```

### 3. Test Your Deployment

```bash
# Get URLs
FRONTEND_URL=$(gcloud run services describe frontend --format="value(status.url)")
GATEWAY_URL=$(gcloud run services describe gateway --format="value(status.url)")

# Test backend health
curl $GATEWAY_URL/api/v1/health

# Test frontend (open in browser)
echo "Frontend: $FRONTEND_URL"
```

## 💰 Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| Frontend (1 min instance) | ~$10-15 |
| Gateway (1 min instance) | ~$10-15 |
| Other services (scale to 0) | ~$0-5 |
| **Total** | **~$20-35/month** |

**Free Tier Included:**
- 2 million requests/month
- 360,000 GB-seconds compute
- 180,000 vCPU-seconds

## 🔍 Monitoring & Logs

### View Logs

```bash
# Frontend logs
gcloud run logs read frontend --limit 50

# Gateway logs
gcloud run logs read gateway --limit 50

# Follow logs in real-time
gcloud run logs tail frontend
```

### Check Service Status

```bash
./scripts/deploy-cloudrun-full.sh status
```

### Monitor Costs

```bash
# Set up billing alerts
gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Collesium Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## 🔄 Updating Services

To deploy updates after making code changes:

```bash
# Update a specific service
cd /path/to/service
gcloud run deploy service-name --source .

# Or use the script
./scripts/deploy-cloudrun-full.sh service frontend
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
gcloud run logs read SERVICE_NAME --limit 100

# Check service details
gcloud run services describe SERVICE_NAME
```

### CORS Errors

The script automatically configures CORS, but if you have issues:

```bash
FRONTEND_URL=$(gcloud run services describe frontend --format="value(status.url)")
gcloud run services update gateway --set-env-vars "CORS_ORIGINS=$FRONTEND_URL"
```

### Cold Start Issues

```bash
# Increase min instances for better performance
gcloud run services update frontend --min-instances 1
gcloud run services update gateway --min-instances 1
```

### Build Failures

If a service fails to build:

1. Check Dockerfile exists in service directory
2. Verify package.json has correct scripts
3. Check build logs: `gcloud builds list --limit 5`
4. View specific build: `gcloud builds log BUILD_ID`

## 🧹 Cleanup

To delete all services and stop charges:

```bash
# Delete all services
gcloud run services delete frontend --quiet
gcloud run services delete gateway --quiet
gcloud run services delete orchestrator --quiet
gcloud run services delete agent-dex --quiet
gcloud run services delete openclaw --quiet
gcloud run services delete cloddsbot --quiet

# Or delete the entire project
gcloud projects delete $GCP_PROJECT_ID
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Next.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Project Documentation](./DEPLOYMENT-CLOUDRUN.md)

## 🎉 Success Checklist

After deployment, verify:

- [ ] All 6 services show "Ready" status
- [ ] Frontend URL loads in browser
- [ ] Wallet connect works
- [ ] API health endpoint responds: `curl $GATEWAY_URL/api/v1/health`
- [ ] No CORS errors in browser console
- [ ] Real-time data updates work
- [ ] Billing alerts are configured

---

**Need Help?** Check the logs first:
```bash
gcloud run logs read SERVICE_NAME --limit 100
```
