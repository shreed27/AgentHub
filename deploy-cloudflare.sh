#!/bin/bash

# Cloudflare Pages Deployment Script
# Deploys trading-frontend to Cloudflare Pages

set -e

echo "🚀 Deploying DAIN Trading Platform to Cloudflare Pages"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Login to Cloudflare
echo "🔐 Logging in to Cloudflare..."
wrangler login

# Navigate to frontend directory
cd trading-frontend

# Build the project
echo "🔨 Building Next.js application..."
npm run build

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
wrangler pages deploy .next \
    --project-name=dain-dev \
    --branch=main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your site is available at: https://dain-dev.pages.dev"
echo ""
echo "⚠️  Don't forget to set environment variables in Cloudflare dashboard:"
echo "   NEXT_PUBLIC_GATEWAY_URL=https://gateway-6f65ip4gea-uc.a.run.app"
echo "   NEXT_PUBLIC_WS_URL=wss://gateway-6f65ip4gea-uc.a.run.app"
echo ""
