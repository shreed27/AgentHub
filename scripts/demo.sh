#!/bin/bash

# DAIN - Decentralized Autonomous Intelligence Network
# Demo Script for Hackathon Judges

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}                                                                ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}     ${CYAN}DAIN - Decentralized Autonomous Intelligence Network${NC}      ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                                                ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}     ${YELLOW}Super Trading Platform Demo${NC}                               ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                                                ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Function to display spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

echo -e "${BLUE}Installing dependencies...${NC}"
npm install --silent &
spinner $!
echo -e "${GREEN}Dependencies installed!${NC}"
echo ""

echo -e "${BLUE}Starting services...${NC}"
echo ""

# Start all services in the background
npm run start:all &
MAIN_PID=$!

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 10

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                    ${GREEN}SERVICES RUNNING${NC}                           ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Frontend:${NC}     http://localhost:3000                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Gateway API:${NC}  http://localhost:4000                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Orchestrator:${NC} http://localhost:4001                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                    ${YELLOW}KEY FEATURES TO DEMO${NC}                       ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${PURPLE}1. Dashboard${NC}                                                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Real-time signal feed with whale alerts                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - AI reasoning stream                                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Active agent monitoring                                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${PURPLE}2. Agents Tab${NC}                                                 ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - 103 AI Skills marketplace                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Agent deployment & management                            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Automation rules configuration                           ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${PURPLE}3. Copy Trading${NC}                                               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Follow elite 'God Wallets'                               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Trust score system                                       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Automatic trade mirroring                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${PURPLE}4. Arbitrage${NC}                                                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Cross-platform opportunity detection                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Prediction market arbitrage                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - One-click execution                                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${PURPLE}5. Swarm Trading${NC}                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Multi-wallet coordination                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}     - Distributed execution                                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                    ${YELLOW}UNIQUE FEATURES${NC}                             ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Survival Mode:${NC} Adaptive risk based on P&L                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    - SURVIVAL (0% to -15%): Normal trading                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    - DEFENSIVE (-15% to -50%): Reduced positions               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    - CRITICAL (<-50%): Hibernation mode                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    - GROWTH (>+20%): Aggressive mode unlocked                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Jito MEV Protection:${NC} Bundles for front-run protection        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}A2A Protocol:${NC} Agent-to-agent communication + X402 payments   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}God Wallet Tracking:${NC} 24 elite traders monitored              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                    ${YELLOW}SUPPORTED PLATFORMS${NC}                        ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}DEXs:${NC} Jupiter, Raydium, Orca, Meteora (Solana)               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}CEXs:${NC} Binance, Bybit, Hyperliquid, Drift                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Prediction Markets:${NC} Polymarket, Kalshi, Manifold, etc.       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Chains:${NC} Solana + 5 EVM chains via Wormhole                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for the main process
wait $MAIN_PID
