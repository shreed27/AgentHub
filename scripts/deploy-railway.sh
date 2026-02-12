#!/bin/bash

# Collesium Trading Platform - Railway Deployment Script
# This script deploys all backend services to Railway

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    Collesium Trading Platform - Railway Deployment         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Railway CLI ready"
echo ""

PROJECT_ROOT=$(pwd)

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_dir=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Deploying $service_name..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    cd "$PROJECT_ROOT/$service_dir"

    # Check if service is linked, if not, prompt to link
    if ! railway status &> /dev/null 2>&1; then
        echo "⚠️  Service not linked. Please run in $service_dir:"
        echo "   railway link"
        echo "   Then select or create service: $service_name"
        return 1
    fi

    railway up --detach

    if [ $? -eq 0 ]; then
        echo "✅ $service_name deployed successfully"
    else
        echo "❌ Failed to deploy $service_name"
        return 1
    fi

    cd "$PROJECT_ROOT"
    echo ""
}

echo "Deployment Order:"
echo "  1. Gateway (primary API)"
echo "  2. Trading Orchestrator"
echo "  3. Agent DEX"
echo "  4. OpenClaw"
echo "  5. CloddsBot"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Deploy services in order
deploy_service "gateway" "apps/gateway"
deploy_service "orchestrator" "trading-orchestrator"
deploy_service "agent-dex" "agent-dex-main/api"
deploy_service "openclaw" "openclaw-sidex-kit-main"
deploy_service "cloddsbot" "CloddsBot-main"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║               Deployment Complete! 🎉                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Set environment variables in Railway Dashboard"
echo "  2. Configure internal networking (*.railway.internal URLs)"
echo "  3. Generate public domain for gateway"
echo "  4. Deploy frontend to Vercel"
echo ""
echo "See DEPLOYMENT.md for detailed instructions."
