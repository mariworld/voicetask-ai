#!/bin/bash
# Simple script to kill previous servers and start new ones

echo "=== VoiceTask AI - Development Environment ==="

# Kill any existing servers
echo "Killing any existing servers..."
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "expo start" 2>/dev/null

# Wait for processes to terminate
sleep 1

# Set paths
PROJECT_DIR="$(pwd)"
BACKEND_DIR="$PROJECT_DIR/api/app"
FRONTEND_DIR="$PROJECT_DIR/voicetask"

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

echo "Starting servers..."

# Start backend server in a new terminal window
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS approach
    open -a Terminal.app "$BACKEND_DIR"
    osascript -e 'tell application "Terminal" to do script "cd '"$BACKEND_DIR"' && uvicorn main:app --host 0.0.0.0 --port 8000 --reload" in front window'
else
    # Linux approach with gnome-terminal or fallback to just printing commands
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $BACKEND_DIR && uvicorn main:app --host 0.0.0.0 --port 8000 --reload; exec bash"
    else
        echo "Command to run backend: cd $BACKEND_DIR && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    fi
fi

# Short pause
sleep 2

# Start frontend server in a new terminal window
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS approach
    open -a Terminal.app "$FRONTEND_DIR"
    osascript -e 'tell application "Terminal" to do script "cd '"$FRONTEND_DIR"' && npx expo start" in front window'
else
    # Linux approach with gnome-terminal or fallback to just printing commands
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $FRONTEND_DIR && npx expo start; exec bash"
    else
        echo "Command to run frontend: cd $FRONTEND_DIR && npx expo start"
    fi
fi

echo "Servers started!"
echo "- Backend: http://localhost:8000"
echo "- Frontend: Expo will open in browser" 