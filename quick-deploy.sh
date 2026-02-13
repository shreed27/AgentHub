#!/bin/bash

# Quick Deploy Script - Run this after gcloud is installed and authenticated
# This is a simplified wrapper around the full deployment script

set -e

echo "🚀 Collesium Trading Platform - Quick Deploy"
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found!"
    echo ""
    echo "The installation is still running. Please:"
    echo "1. Enter your sudo password in the terminal"
    echo "2. Wait for installation to complete"
    echo "3. Run: source ~/google-cloud-sdk/path.bash.inc"
    echo "4. Then run this script again"
    exit 1
fi

# Check if authenticated
if ! gcloud auth print-identity-token &> /dev/null 2>&1; then
    echo "🔐 Not authenticated. Logging in..."
    gcloud auth login
fi

# Set project ID
export GCP_PROJECT_ID="colosseum-dain"
export GCP_REGION="us-central1"

echo ""
echo "📋 Deployment Configuration:"
echo "   Project ID: colosseum-dain"
echo "   Region: "us-central1"
echo ""
echo "This will deploy:"
echo "   ✓ Frontend (Next.js)"
echo "   ✓ Gateway API"
echo "   ✓ Trading Orchestrator"
echo "   ✓ Agent DEX"
echo "   ✓ OpenClaw"
echo "   ✓ CloddsBot"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Run the full deployment script
./scripts/deploy-cloudrun-full.sh all

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add API keys (optional):"
echo "   gcloud run services update cloddsbot --set-env-vars ANTHROPIC_API_KEY=sk-ant-xxx"
echo ""
echo "2. Get your URLs:"
echo "   gcloud run services list"
echo ""
echo "3. Test your app:"
FRONTEND_URL=$(gcloud run services describe frontend --format="value(status.url)" 2>/dev/null)
echo "   Frontend: $FRONTEND_URL"
