#!/bin/bash

# Collesium Trading Platform - Deployment Verification Script
# This script tests all deployed services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE WITH YOUR ACTUAL URLS
# For Cloud Run: https://gateway-xxxxx-uc.a.run.app
# For Railway: https://gateway-production-xxxx.up.railway.app
GATEWAY_URL="${GATEWAY_URL:-https://gateway-xxxxx-uc.a.run.app}"
FRONTEND_URL="${FRONTEND_URL:-https://your-app.vercel.app}"
PLATFORM="${PLATFORM:-cloudrun}"  # cloudrun or railway

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    Collesium Trading Platform - Deployment Verification    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Gateway URL: $GATEWAY_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    printf "  Testing %-30s" "$name..."

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        echo -e " ${GREEN}✓ OK${NC} ($response)"
        return 0
    else
        echo -e " ${RED}✗ FAIL${NC} (got $response, expected $expected_status)"
        return 1
    fi
}

# Function to test JSON endpoint
test_json_endpoint() {
    local name=$1
    local url=$2

    printf "  Testing %-30s" "$name..."

    response=$(curl -s --max-time 10 "$url" 2>/dev/null)

    if echo "$response" | jq -e '.success != false' > /dev/null 2>&1 || echo "$response" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
        echo -e " ${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e " ${RED}✗ FAIL${NC}"
        echo "    Response: $(echo "$response" | head -c 100)"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Testing Gateway Health Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GATEWAY_HEALTHY=true

test_json_endpoint "Gateway /api/v1/health" "$GATEWAY_URL/api/v1/health" || GATEWAY_HEALTHY=false
test_endpoint "Gateway /api/v1/health/ready" "$GATEWAY_URL/api/v1/health/ready" || GATEWAY_HEALTHY=false
test_endpoint "Gateway /api/v1/health/live" "$GATEWAY_URL/api/v1/health/live" || GATEWAY_HEALTHY=false

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Testing API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Polymarket Markets" "$GATEWAY_URL/api/v1/polymarket/markets" || true
test_endpoint "Leaderboard" "$GATEWAY_URL/api/v1/leaderboard" || true
test_endpoint "Copy Trading Configs" "$GATEWAY_URL/api/v1/copy-trading/configs" || true
test_endpoint "Arbitrage Opportunities" "$GATEWAY_URL/api/v1/arbitrage/opportunities" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Testing Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Frontend Root" "$FRONTEND_URL" || true
test_endpoint "Frontend Polymarket Page" "$FRONTEND_URL/polymarket" || true
test_endpoint "Frontend Trading Page" "$FRONTEND_URL/trading" || true
test_endpoint "Frontend Portfolio Page" "$FRONTEND_URL/portfolio" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$GATEWAY_HEALTHY" = true ]; then
    echo -e "${GREEN}✓ Gateway is healthy${NC}"
else
    echo -e "${RED}✗ Gateway has issues${NC}"
fi

echo ""
echo "Note: Some endpoints may return errors if not configured."
echo "Check logs for detailed error messages."
echo ""
echo "Commands for debugging:"
if [ "$PLATFORM" = "cloudrun" ]; then
    echo "  gcloud run logs read gateway --limit 50"
    echo "  gcloud run logs read orchestrator --limit 50"
    echo "  gcloud run logs read cloddsbot --limit 50"
    echo "  gcloud run services list"
else
    echo "  railway logs --service gateway"
    echo "  railway logs --service orchestrator"
    echo "  railway logs --service cloddsbot"
fi
