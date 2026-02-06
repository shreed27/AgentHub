#!/bin/bash
# Super Trading Platform - Start All Services
# This script starts all services needed for the platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     SUPER TRADING PLATFORM - SERVICE LAUNCHER              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Function to start a service in the background
start_service() {
    local name=$1
    local port=$2
    local dir=$3
    local cmd=$4

    echo -e "${YELLOW}Starting $name on port $port...${NC}"

    if check_port $port; then
        echo -e "${GREEN}  → $name already running on port $port${NC}"
        return 0
    fi

    cd "$dir"
    $cmd > "/tmp/$name.log" 2>&1 &
    local pid=$!
    cd - > /dev/null

    # Wait a moment and check if it started
    sleep 2
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}  → $name started (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}  → Failed to start $name. Check /tmp/$name.log${NC}"
        return 1
    fi
}

echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install --silent 2>/dev/null || true

echo -e "\n${BLUE}Starting services...${NC}\n"

# Start Gateway (port 4000)
start_service "gateway" 4000 "apps/gateway" "npm run dev"

# Start Trading Orchestrator (port 4001)
start_service "orchestrator" 4001 "trading-orchestrator" "npm run dev"

# Start Trading Frontend (port 5000)
start_service "frontend" 5000 "trading-frontend" "npm run dev -- -p 5000"

# Optional: Start AgentDEX API (port 3001)
if [ -d "agent-dex-main/api" ]; then
    start_service "agent-dex" 3001 "agent-dex-main/api" "npm run dev"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗"
echo "║                    SERVICES STARTED                         ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Gateway:      http://localhost:4000                       ║"
echo "║  Orchestrator: http://localhost:4001                       ║"
echo "║  Frontend:     http://localhost:5000                       ║"
echo "║  AgentDEX:     http://localhost:3001                       ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Logs: /tmp/{gateway,orchestrator,frontend,agent-dex}.log  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for user interrupt
trap "echo -e '\n${RED}Stopping services...${NC}'; pkill -f 'tsx watch' 2>/dev/null; pkill -f 'next dev' 2>/dev/null; exit 0" INT

# Keep script running
while true; do
    sleep 1
done
