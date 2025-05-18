#!/bin/bash

# Set colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping all development servers...${NC}"

# Kill existing node processes related to Expo
if pgrep -f "expo start" > /dev/null || pgrep -f "expo-cli start" > /dev/null; then
    echo -e "${RED}Terminating Expo processes...${NC}"
    pkill -f "expo start" || true
    pkill -f "expo-cli start" || true
    sleep 1
fi

# Kill existing Python/uvicorn processes
if pgrep -f "uvicorn api.app.main:app" > /dev/null; then
    echo -e "${RED}Terminating FastAPI processes...${NC}"
    pkill -f "uvicorn api.app.main:app" || true
    sleep 1
fi

# Optional: Kill any processes using port 8001 and 8081
if command -v lsof >/dev/null 2>&1; then
    # Find and kill process using port 8001 (FastAPI)
    PORT_PID=$(lsof -ti:8001 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo -e "${RED}Killing process using port 8001: PID $PORT_PID${NC}"
        kill -9 $PORT_PID 2>/dev/null || true
    fi
    
    # Find and kill process using port 8081 (Expo)
    PORT_PID=$(lsof -ti:8081 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo -e "${RED}Killing process using port 8081: PID $PORT_PID${NC}"
        kill -9 $PORT_PID 2>/dev/null || true
    fi
    sleep 1
fi

echo -e "${GREEN}All development servers stopped.${NC}" 