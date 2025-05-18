#!/bin/bash

# Function to find and kill processes using specific ports
kill_process_on_port() {
    local port=$1
    echo "Checking for processes on port $port..."
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || echo "Failed to kill process on port $port"
    else
        echo "No process found on port $port"
    fi
}

# Kill any process running on common development ports
echo "Cleaning up any previous server instances..."
kill_process_on_port 8000  # FastAPI backend
kill_process_on_port 19000 # Expo Metro bundler
kill_process_on_port 19001 # Expo dev tools
kill_process_on_port 19002 # Expo dev tools alternative port

# Start FastAPI backend
echo "Starting FastAPI backend..."
cd "$(dirname "$0")/../" || exit
python -m uvicorn api.app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start React Native Expo frontend
echo "Starting React Native Expo frontend..."
cd frontend || exit
npm start &
FRONTEND_PID=$!

# Handle cleanup on script termination
function cleanup {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Register the cleanup function for these signals
trap cleanup INT TERM

# Keep script running
echo "Dev environment running. Press Ctrl+C to stop."
wait