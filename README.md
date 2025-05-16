# Voice-to-Task AI API

Backend API for the Voice-to-Task AI application, which transcribes voice notes and extracts structured tasks using AI.

## Features

- Record voice notes from any device
- Automatic transcription using OpenAI's Whisper API
- AI-powered task extraction from natural language
- Task management with status tracking
- Cross-device compatibility (desktop and mobile)

## Setup

### Basic Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/voicetask-ai.git
cd voicetask-ai
```

2. Install frontend dependencies:
```bash
npm install
```

3. Create a virtual environment for the API:
```bash
cd api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

4. Create a `.env` file in the `api` directory with the following content:
```
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# JWT Secret Key for token signing
# For production, generate a secure random key
SECRET_KEY=your_secret_key
```

### Running the Application

For the best experience, use our startup menu script:

```bash
./start.sh
```

This provides options for:
1. **Standard HTTP mode** - For local development (desktop only)
2. **HTTPS with mkcert** - For secure development with mobile device testing
3. **HTTPS with ngrok** - For external access and testing
4. **Connection testing** - To verify HTTPS is working correctly

## Mobile Device Testing

To use voice recording features on mobile devices, the application **must** be served over HTTPS. 

### HTTPS Setup with mkcert (Recommended)

The easiest way to set up HTTPS for local development is using mkcert:

1. Install mkcert:
   - macOS: `brew install mkcert`
   - Ubuntu/Debian: `apt install mkcert`
   - Windows: Download from [https://github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert)

2. Run our setup script:
```bash
./start-https.sh
```

This will:
- Install local CA (Certificate Authority) and generate certificates
- Configure both frontend and backend to use HTTPS
- Make the app accessible on your local network for mobile testing

3. On your mobile device:
   - Connect to the same WiFi network as your development computer
   - Visit `https://YOUR_COMPUTER_IP:3000` (the IP will be shown in the console)
   - Accept the certificate warning (one-time step)
   - Use voice recording features securely

### Troubleshooting

If you encounter issues with HTTPS or voice recording:

1. Run the test script:
```bash
node test-https-connection.js
```

2. Check for these common issues:
   - Ensure both frontend and API are running with HTTPS
   - Verify your mobile device and computer are on the same network
   - Check that your browser allows microphone access 
   - Accept the certificate in your mobile browser
   - Ensure the API URL in the frontend uses HTTPS (check browser console)

## API Endpoints

### Authentication

#### 1. Register User

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Register a new user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

#### 2. Login

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Authenticate a user and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "your_jwt_token",
  "token_type": "bearer",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

### Tasks

#### 1. Get Tasks

**Endpoint:** `GET /api/v1/tasks`

**Description:** Get all tasks for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter tasks by status ("To Do", "In Progress", "Done")

**Response:**
```json
[
  {
    "id": "task_id",
    "user_id": "user_id",
    "title": "Call John about the project",
    "status": "To Do",
    "created_at": "2023-05-14T12:00:00Z",
    "updated_at": "2023-05-14T12:00:00Z"
  }
]
```

#### 2. Create Task

**Endpoint:** `POST /api/v1/tasks`

**Description:** Create a new task for the authenticated user.

**Request:**
```json
{
  "title": "Submit the report",
  "status": "To Do"
}
```

#### 3. Update Task

**Endpoint:** `PUT /api/v1/tasks/{task_id}`

**Description:** Update an existing task.

**Request:**
```json
{
  "title": "Submit the quarterly report",
  "status": "In Progress"
}
```

#### 4. Delete Task

**Endpoint:** `DELETE /api/v1/tasks/{task_id}`

**Description:** Delete a task.

### Voice Processing

#### 1. Transcribe Audio

**Endpoint:** `POST /api/v1/voice/transcribe`

**Description:** Transcribes an audio file using OpenAI's Whisper API.

**Request:**
- Form data with an audio file (supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm)

**Response:**
```
"Your transcribed text here"
```

#### 2. Extract Tasks

**Endpoint:** `POST /api/v1/voice/extract-tasks`

**Description:** Extracts structured tasks from a transcript using OpenAI GPT.

**Request:**
```json
{
  "transcription": "I need to call John about the project tomorrow and submit the report by Friday."
}
```

**Response:**
```json
[
  {
    "title": "Call John about the project",
    "status": "To Do"
  },
  {
    "title": "Submit the report",
    "status": "To Do"
  }
]
```

#### 3. Process Voice

**Endpoint:** `POST /api/v1/voice/process`

**Description:** Process voice recording into tasks (transcribe, extract, save).

**Request:**
- Form data with an audio file (supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm)

**Response:**
```json
[
  {
    "id": "task_id",
    "user_id": "user_id",
    "title": "Call John about the project",
    "status": "To Do",
    "created_at": "2023-05-14T12:00:00Z",
    "updated_at": "2023-05-14T12:00:00Z"
  }
]
```

## Database Schema

The SQLite database contains a `