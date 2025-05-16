#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Starting VoiceTask AI in Simple Dev Mode ===${NC}"

# Store current directory
PROJECT_ROOT=$(pwd)

# Kill any existing servers
echo -e "\n${YELLOW}Stopping any existing servers...${NC}"

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

# Wait a moment to ensure ports are freed
sleep 2

# Create or update .env.local for Next.js with simple config
echo -e "\n${YELLOW}Setting up Next.js environment...${NC}"
cat > "$PROJECT_ROOT/.env.local" << EOF
# Development settings
NEXT_PUBLIC_API_URL=http://localhost:8003
EOF
echo -e "${GREEN}Created .env.local file with development settings${NC}"

# Start the API server
echo -e "\n${YELLOW}Starting API server...${NC}"
(cd "$PROJECT_ROOT/api" && python -m uvicorn app.main:app --port 8003 --host 0.0.0.0 --reload) &
API_PID=$!
echo -e "${GREEN}API server started with PID: ${API_PID}${NC}"

# Wait for API server to start
echo -e "Waiting for API server to initialize..."
sleep 3

# Start the Next.js frontend
echo -e "\n${YELLOW}Starting Next.js frontend...${NC}"
(cd "$PROJECT_ROOT" && NEXT_CONFIG_FILE=next.config.mjs npx next dev --turbo) &
NEXT_PID=$!
echo -e "${GREEN}Next.js server started with PID: ${NEXT_PID}${NC}"

echo -e "\n${YELLOW}Development environment is running!${NC}"
echo -e "API server: http://localhost:8003"
echo -e "Frontend: http://localhost:3000"

echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for user to press Ctrl+C
trap "echo -e '\n${RED}Shutting down all servers...${NC}'; kill -9 $API_PID $NEXT_PID 2>/dev/null; exit 0" INT
wait 