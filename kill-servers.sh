#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}=== Killing VoiceTask AI Development Servers ===${NC}"

# Find and kill processes running on port 8003 (API server)
API_PIDS=$(lsof -t -i:8003)
if [ -n "$API_PIDS" ]; then
  echo -e "Killing API server processes: $API_PIDS"
  kill -9 $API_PIDS
  echo -e "${GREEN}API server processes terminated.${NC}"
else
  echo -e "No API server processes found running on port 8003."
fi

# Find and kill processes running on port 3000 (Next.js)
NEXT_PIDS=$(lsof -t -i:3000)
if [ -n "$NEXT_PIDS" ]; then
  echo -e "Killing Next.js processes: $NEXT_PIDS"
  kill -9 $NEXT_PIDS
  echo -e "${GREEN}Next.js processes terminated.${NC}"
else
  echo -e "No Next.js processes found running on port 3000."
fi

echo -e "\n${GREEN}All development servers have been stopped.${NC}" 