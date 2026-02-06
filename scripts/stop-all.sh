#!/bin/bash
# Super Trading Platform - Stop All Services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}Stopping all Super Trading Platform services...${NC}"

# Kill Node processes related to our services
pkill -f 'tsx watch' 2>/dev/null || true
pkill -f 'next dev' 2>/dev/null || true
pkill -f 'node dist/index.js' 2>/dev/null || true

# Kill processes on specific ports
for port in 3000 3001 3002 3003 3004 4000 4001 5000 18789; do
    pid=$(lsof -ti:$port 2>/dev/null) || true
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

echo -e "${GREEN}All services stopped.${NC}"
