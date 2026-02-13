#!/bin/bash

# Collesium Trading Platform - Cloud Run Environment Variables Setup
# Run this after deploying all services to configure service URLs

set -e

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   Setting up Cloud Run Environment Variables                       ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Get service URLs
echo "Fetching service URLs..."
GATEWAY_URL=$(gcloud run services describe gateway --format="value(status.url)" 2>/dev/null || echo "")
ORCHESTRATOR_URL=$(gcloud run services describe orchestrator --format="value(status.url)" 2>/dev/null || echo "")
CLODDSBOT_URL=$(gcloud run services describe cloddsbot --format="value(status.url)" 2>/dev/null || echo "")
AGENT_DEX_URL=$(gcloud run services describe agent-dex --format="value(status.url)" 2>/dev/null || echo "")
OPENCLAW_URL=$(gcloud run services describe openclaw --format="value(status.url)" 2>/dev/null || echo "")

echo ""
echo "Service URLs discovered:"
echo "  Gateway:      ${GATEWAY_URL:-NOT FOUND}"
echo "  Orchestrator: ${ORCHESTRATOR_URL:-NOT FOUND}"
echo "  CloddsBot:    ${CLODDSBOT_URL:-NOT FOUND}"
echo "  Agent DEX:    ${AGENT_DEX_URL:-NOT FOUND}"
echo "  OpenClaw:     ${OPENCLAW_URL:-NOT FOUND}"
echo ""

# Check required services
if [ -z "$GATEWAY_URL" ]; then
    echo "❌ Gateway service not found. Deploy it first with:"
    echo "   ./scripts/deploy-cloudrun.sh service gateway"
    exit 1
fi

# Ask for CORS origins
echo "Enter your Vercel frontend URL (e.g., https://your-app.vercel.app):"
read -p "Frontend URL: " FRONTEND_URL

if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL="http://localhost:3000"
fi

# Ask for optional API keys
echo ""
echo "Optional: Enter your Anthropic API key for AI features (press Enter to skip):"
read -p "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY

echo ""
echo "Optional: Enter your Solana RPC URL (press Enter for public endpoint):"
read -p "SOLANA_RPC_URL: " SOLANA_RPC_URL

if [ -z "$SOLANA_RPC_URL" ]; then
    SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
fi

echo ""
echo "Updating Gateway environment variables..."
gcloud run services update gateway --set-env-vars "\
NODE_ENV=production,\
PORT=4000,\
CORS_ORIGINS=${FRONTEND_URL},\
ORCHESTRATOR_URL=${ORCHESTRATOR_URL},\
CLODDSBOT_URL=${CLODDSBOT_URL},\
AGENT_DEX_URL=${AGENT_DEX_URL},\
OPENCLAW_URL=${OPENCLAW_URL},\
SOLANA_RPC_URL=${SOLANA_RPC_URL}" \
--quiet

echo "✅ Gateway updated"

if [ -n "$ORCHESTRATOR_URL" ]; then
    echo ""
    echo "Updating Orchestrator environment variables..."
    gcloud run services update orchestrator --set-env-vars "\
NODE_ENV=production,\
PORT=4001,\
CLODDSBOT_URL=${CLODDSBOT_URL},\
AGENT_DEX_URL=${AGENT_DEX_URL},\
OPENCLAW_URL=${OPENCLAW_URL},\
SOLANA_RPC_URL=${SOLANA_RPC_URL}" \
--quiet
    echo "✅ Orchestrator updated"
fi

if [ -n "$CLODDSBOT_URL" ] && [ -n "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "Updating CloddsBot environment variables..."
    gcloud run services update cloddsbot --set-env-vars "\
NODE_ENV=production,\
PORT=18789,\
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
--quiet
    echo "✅ CloddsBot updated"
fi

if [ -n "$AGENT_DEX_URL" ]; then
    echo ""
    echo "Updating Agent DEX environment variables..."
    gcloud run services update agent-dex --set-env-vars "\
NODE_ENV=production,\
PORT=3001,\
SOLANA_RPC_URL=${SOLANA_RPC_URL}" \
--quiet
    echo "✅ Agent DEX updated"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Configuration Complete! 🎉                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Your Gateway URL: $GATEWAY_URL"
echo ""
echo "For Vercel deployment, set these environment variables:"
echo ""
echo "  NEXT_PUBLIC_GATEWAY_URL=$GATEWAY_URL"
echo "  NEXT_PUBLIC_WS_URL=${GATEWAY_URL/https:/wss:}"
echo "  NEXT_PUBLIC_DEMO_MODE=false"
echo ""
echo "Test your deployment:"
echo "  curl $GATEWAY_URL/api/v1/health"
