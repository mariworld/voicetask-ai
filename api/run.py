#!/usr/bin/env python3
import os
import sys

def main():
    print("Starting Voice-to-Task AI API server...")
    
    # Use command line arguments or default to port 8001
    if len(sys.argv) > 1:
        os.system(f"python -m uvicorn api.app.main:app --host 0.0.0.0 --port {sys.argv[1]} --reload")
    else:
        os.system("python -m uvicorn api.app.main:app --host 0.0.0.0 --port 8001 --reload")

if __name__ == "__main__":
    main() 