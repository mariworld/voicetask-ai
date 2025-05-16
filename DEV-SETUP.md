# VoiceTask AI Development Setup

This document explains how to set up and run the VoiceTask AI application for development.

## Prerequisites

- Node.js (v18 or higher)
- Python 3.10 or higher
- pip (Python package manager)

## Getting Started

### 1. Install Dependencies

First, install all required dependencies:

```bash
# Install JavaScript dependencies
npm install

# Install Python dependencies in the api directory
cd api
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment Variables

Create an `.env` file in the `/api` directory:

```bash
# api/.env
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=development_secret_key_not_for_production
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 3. Start the Development Server

Run the development server:

```bash
./dev-simple.sh
```

This script will:
- Kill any existing servers running on the required ports
- Set up the proper environment variables
- Start the API server on port 8003
- Start the Next.js frontend on port 3000 with Turbopack

## Accessing the Application

- API server: http://localhost:8003
- Frontend: http://localhost:3000

## Development

The application uses:
- Next.js with Turbopack for the frontend
- FastAPI for the backend
- OpenAI API for speech-to-text and task extraction

Any changes you make to the code will be automatically reloaded thanks to:
- Next.js's development server with Turbopack
- Uvicorn's --reload flag for the FastAPI server

## Testing Voice Recognition

To test voice recognition:
1. Open the application in your browser
2. Click the record button and speak a task (e.g., "Remember to buy milk")
3. Stop recording
4. The application will transcribe your speech and extract tasks

## Stop the Server

Press `Ctrl+C` in the terminal where you started the server to stop both the API and frontend servers. 