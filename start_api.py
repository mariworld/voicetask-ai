#!/usr/bin/env python3
import os
import sys
import subprocess

def main():
    """Run the uvicorn server directly"""
    print("Starting Voice-to-Task AI API server...")
    
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Current directory: {current_dir}")
    
    # Start the server
    port = sys.argv[1] if len(sys.argv) > 1 else "8001"
    try:
        cmd = ["uvicorn", "api.app.main:app", "--host", "0.0.0.0", "--port", port, "--reload"]
        print(f"Running command: {' '.join(cmd)}")
        subprocess.run(cmd)
    except Exception as e:
        print(f"Error starting server: {str(e)}")

if __name__ == "__main__":
    main() 