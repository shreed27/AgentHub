# Cloudflare Pages Deployment for DAIN Trading Platform

## Quick Setup Guide

### Option 1: Deploy via Cloudflare Dashboard (Easiest)

1. **Sign up for Cloudflare Pages**
   - Go to [pages.cloudflare.com](https://pages.cloudflare.com)
   - Sign up for free account

2. **Connect GitHub Repository**
   - Click "Create a project"
   - Connect your GitHub account
   - Select your `Collesium-Project` repository

3. **Configure Build Settings**
   ```
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: .next
   Root directory: trading-frontend
   ```

4. **Set Environment Variables**
   In Cloudflare Pages dashboard → Settings → Environment variables:
   ```
   NEXT_PUBLIC_GATEWAY_URL=https://gateway-6f65ip4gea-uc.a.run.app
   NEXT_PUBLIC_WS_URL=wss://gateway-6f65ip4gea-uc.a.run.app
   NEXT_PUBLIC_DEMO_MODE=false
   ```

5. **Deploy**
   - Click "Save and Deploy"
   - Your site will be available at: `dain-dev.pages.dev`

6. **Custom Domain (Optional)**
   If you purchase `dain.dev`:
   - Go to Custom domains → Add custom domain
   - Enter `dain.dev` or `app.dain.dev`
   - Follow DNS instructions

---

### Option 2: Deploy via CLI (Advanced)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to frontend
cd trading-frontend

# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next --project-name=dain-dev

# Set environment variables
wrangler pages secret put NEXT_PUBLIC_GATEWAY_URL
# Enter: https://gateway-6f65ip4gea-uc.a.run.app

wrangler pages secret put NEXT_PUBLIC_WS_URL
# Enter: wss://gateway-6f65ip4gea-uc.a.run.app
```

---

## Result

Your frontend will be accessible at:
- **Free subdomain**: `dain-dev.pages.dev`
- **Custom domain** (if purchased): `dain.dev` or `app.dain.dev`

Backend services remain on Cloud Run:
- Gateway: `https://gateway-6f65ip4gea-uc.a.run.app`
- Orchestrator: `https://orchestrator-6f65ip4gea-uc.a.run.app`
- etc.

---

## Next Steps

1. Deploy to Cloudflare Pages using Option 1 or 2
2. Test the deployment at your `.pages.dev` URL
3. (Optional) Purchase `dain.dev` domain and configure custom domain
4. Update any hardcoded URLs in your codebase

---

## Purchasing dain.dev Domain

If you want to purchase the domain:
1. Check availability at [Namecheap](https://namecheap.com) or [Porkbun](https://porkbun.com)
2. Purchase for ~$10-15/year
3. Add custom domain in Cloudflare Pages dashboard
4. Update DNS nameservers to Cloudflare's
