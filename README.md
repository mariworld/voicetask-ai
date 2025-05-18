# VoiceTask AI

A voice-controlled task management app built with React Native Expo and Python FastAPI.

## Features

- **Voice Recording**: Record voice notes to create tasks
- **AI Transcription**: Convert your voice to text using OpenAI Whisper
- **Task Extraction**: Automatically identify tasks from natural language
- **Task Management**: View and organize tasks in To Do, In Progress, and Done tabs

## Getting Started

### Prerequisites

- Node.js (v14+)
- Python (v3.9+)
- Expo CLI
- pip (Python package manager)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/voicetask-ai.git
   cd voicetask-ai
   ```

2. Install frontend dependencies:
   ```
   cd voicetask
   npm install
   ```

3. Install backend dependencies:
   ```
   cd ../api
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Create a `.env` file in the `api` directory with:
     ```
     OPENAI_API_KEY=your_openai_api_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_KEY=your_supabase_key
     SECRET_KEY=your_secret_key
     ```

### Running the App

#### Using Start Scripts (Recommended)

For convenience, we've provided startup scripts that will launch both the backend and frontend in separate terminals.

**macOS/Linux:**
```
./start-voicetask.sh
```

**Windows:**
```
start-voicetask.bat
```

These scripts will:
1. Kill any existing server processes
2. Start the FastAPI backend server
3. Start the Expo dev server for the frontend

#### Manual Start

If you prefer to start the servers manually:

**Backend:**
```
cd api/app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```
cd voicetask
npx expo start
```

## API Configuration

To connect to your backend API:
1. Update the `API_BASE_URL` in `voicetask/services/api.ts` with your local IP address
2. Ensure all devices are on the same network for testing

## Development Notes

- The backend provides test endpoints that don't require authentication
- For production, implement proper authentication using the `/voice/transcribe` and `/voice/extract-tasks` endpoints
- To customize the voice processing, modify the `voice_service.py` file in the backend

## License

[MIT License](LICENSE)