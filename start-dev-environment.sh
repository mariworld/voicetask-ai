#!/bin/bash

# Set colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "🚀 VoiceTask-AI Development Environment Launcher 🚀"
echo "=================================================="
echo -e "${NC}"

# Project root directory
PROJECT_ROOT="$(pwd)"

# Kill existing processes
echo -e "${YELLOW}[1/5] Checking for running servers to terminate...${NC}"

# Kill existing node processes related to Expo
if pgrep -f "expo start" > /dev/null || pgrep -f "expo-cli start" > /dev/null; then
    echo -e "${RED}Terminating existing Expo processes...${NC}"
    pkill -f "expo start" || true
    pkill -f "expo-cli start" || true
    sleep 1
fi

# Kill existing Python/uvicorn processes
if pgrep -f "uvicorn api.app.main:app" > /dev/null; then
    echo -e "${RED}Terminating existing FastAPI processes...${NC}"
    pkill -f "uvicorn api.app.main:app" || true
    sleep 1
fi

# Optional: Kill any processes using port 8001 and 8081
if command -v lsof >/dev/null 2>&1; then
    echo -e "${YELLOW}Checking for processes using ports 8001 and 8081...${NC}"
    # Find and kill process using port 8001 (FastAPI)
    PORT_PID=$(lsof -ti:8001)
    if [ -n "$PORT_PID" ]; then
        echo -e "${RED}Killing process using port 8001: PID $PORT_PID${NC}"
        kill -9 $PORT_PID 2>/dev/null || true
    fi
    
    # Find and kill process using port 8081 (Expo)
    PORT_PID=$(lsof -ti:8081)
    if [ -n "$PORT_PID" ]; then
        echo -e "${RED}Killing process using port 8081: PID $PORT_PID${NC}"
        kill -9 $PORT_PID 2>/dev/null || true
    fi
    sleep 1
fi

echo -e "${GREEN}[2/5] All previous servers terminated successfully.${NC}"

# API Environment Setup and Server Start
APIDIR="api"
START_API_SCRIPT="start_api.py"
API_VENV_PATH="$APIDIR/.venv"

echo -e "${YELLOW}[3/5] Setting up API environment and starting server...${NC}"

if [ -d "$API_VENV_PATH" ]; then
    echo -e "${GREEN}Found API virtual environment at $API_VENV_PATH${NC}"
    echo -e "${BLUE}Changing to API directory: $APIDIR/${NC}"
    cd "$APIDIR" || { echo -e "${RED}Failed to cd into $APIDIR directory${NC}"; exit 1; }
    
    echo -e "${GREEN}Activating virtual environment...${NC}"
    source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null || { echo -e "${RED}Failed to activate virtual environment in $APIDIR ${NC}"; cd "$PROJECT_ROOT"; exit 1; }
    
    echo -e "${YELLOW}Starting FastAPI server on port 8001 from $(pwd)...${NC}"
    echo -e "${BLUE}Running: python $START_API_SCRIPT${NC}"
    python "$START_API_SCRIPT" &
    FASTAPI_PID=$!

    echo -e "${GREEN}Returning to project root: $PROJECT_ROOT${NC}"
    cd "$PROJECT_ROOT" || { echo -e "${RED}Failed to cd back to project root${NC}"; exit 1; }
else
    echo -e "${YELLOW}API virtual environment ($API_VENV_PATH) not found.${NC}"
    echo -e "${YELLOW}Attempting to start API server using: python $APIDIR/$START_API_SCRIPT${NC}"
    if [ -f "$APIDIR/$START_API_SCRIPT" ]; then
        python "$APIDIR/$START_API_SCRIPT" &
        FASTAPI_PID=$!
    else
        echo -e "${RED}❌ API start script ($APIDIR/$START_API_SCRIPT) not found!${NC}"
        exit 1
    fi
fi

# Wait for FastAPI to start
echo -e "${GREEN}Waiting for FastAPI server to initialize...${NC}"
sleep 3

# Verify FastAPI is running
if ps -p $FASTAPI_PID > /dev/null; then
    echo -e "${GREEN}✅ FastAPI server started successfully (PID: $FASTAPI_PID)${NC}"
    echo -e "${GREEN}   API available at: http://localhost:8001${NC}"
else
    echo -e "${RED}❌ FastAPI server failed to start${NC}"
    exit 1
fi

# Start Expo in a new terminal window if possible
echo -e "${YELLOW}[5/5] Starting Expo server on port 8081...${NC}"

EXPO_APP_DIR="voicetask" # Corrected Expo app directory

# Check if Expo app directory exists
if [ ! -d "$EXPO_APP_DIR" ]; then
    echo -e "${RED}❌ Expo app directory '$EXPO_APP_DIR' not found in $PROJECT_ROOT! Exiting.${NC}"
    exit 1
fi

# Check for necessary Expo files in the Expo app directory
if [ ! -f "$EXPO_APP_DIR/package.json" ] || [ ! -f "$EXPO_APP_DIR/app.json" ] ; then
    echo -e "${RED}❌ Expo project files (package.json or app.json) not found in $PROJECT_ROOT/$EXPO_APP_DIR.${NC}"
    exit 1
fi

echo -e "${GREEN}Changing to Expo app directory: $PROJECT_ROOT/$EXPO_APP_DIR${NC}"
cd "$EXPO_APP_DIR" || { echo -e "${RED}Failed to cd into $EXPO_APP_DIR directory${NC}"; exit 1; }

echo -e "${GREEN}Expo will be started from: $(pwd)${NC}"

# Check if we can open a new terminal window (macOS)
if [ "$(uname)" == "Darwin" ]; then
    echo -e "${BLUE}Opening new terminal for Expo server...${NC}"
    # $PWD is now the EXPO_APP_DIR, so just use $PWD
    osascript -e "tell application \"Terminal\" to do script \"cd \\\"$PWD\\\" && npx expo start\""
    echo -e "${GREEN}✅ Expo server starting in a new terminal window${NC}"
# For Windows (using WSL or Git Bash)
elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ] || [ "$(expr substr $(uname -s) 1 5)" == "MSYS" ]; then
    echo -e "${BLUE}Starting Expo server in this terminal...${NC}"
    echo -e "${YELLOW}NOTE: FastAPI server is running in the background.${NC}"
    echo -e "${YELLOW}To view FastAPI logs, check another terminal.${NC}"
    npx expo start
# For Linux or other Unix-like systems
else
    echo -e "${BLUE}Starting Expo server in this terminal...${NC}"
    echo -e "${YELLOW}NOTE: FastAPI server is running in the background.${NC}"
    echo -e "${YELLOW}To view FastAPI logs, check another terminal.${NC}"
    npx expo start
fi

# This line is reached if npx expo start terminates or if we opened a new terminal
echo -e "${GREEN}Development environment running.${NC}"
echo -e "${YELLOW}NOTE: FastAPI is still running in the background (PID: $FASTAPI_PID)${NC}"
echo -e "${YELLOW}To terminate all servers, press Ctrl+C and run: kill $FASTAPI_PID${NC}"

# Keep the script running to maintain the FastAPI server
# This only applies if Expo is run in a separate terminal
if [ "$(uname)" == "Darwin" ]; then
    echo -e "${BLUE}Press Ctrl+C to terminate the FastAPI server${NC}"
    wait $FASTAPI_PID
fi 