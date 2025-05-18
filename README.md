# VoiceTask AI Monorepo

A comprehensive suite for voice-controlled task management, including a React Native Expo mobile app, a Next.js web interface (if applicable), and a Python FastAPI backend.

## Table of Contents

- [Project Overview](#project-overview)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup Instructions](#setup-instructions)
- [Running the Development Environment](#running-the-development-environment)
  - [Starting the Mobile App & API (Recommended)](#starting-the-mobile-app--api-recommended)
  - [Starting the Web App (Next.js)](#starting-the-web-app-nextjs)
  - [Manual Startup of Individual Components](#manual-startup-of-individual-components)
- [Environment Variables](#environment-variables)
- [Development Notes](#development-notes)
- [License](#license)

## Project Overview

This monorepo houses the VoiceTask AI ecosystem, which primarily includes:
- **Mobile App (`./voicetask/`)**: A React Native (Expo) application for voice recording, task creation, and management on mobile devices.
- **Backend API (`./api/`)**: A Python FastAPI server that supports the mobile app by handling voice transcription, task extraction, and data persistence.
- **Web App (`./src/`)**: (Optional) A Next.js application. Its current functionality and integration should be documented here if it's an active part of the project.

## Monorepo Structure

The project is organized as a monorepo with the following key directories:

- **`/api/`**: Python FastAPI backend for the mobile app.
  - `api/.venv/`: Python virtual environment for the API.
- **`/voicetask/`**: React Native (Expo) mobile application.
- **`/src/`**: (Optional) Next.js frontend web application.
- **`/public/`**: Static assets for the Next.js web application (if used).
- **`/scripts/`**: Utility and helper scripts for the monorepo (e.g., `start-dev-environment.sh`).
- **`package.json` (root)**: Manages Node.js dependencies and scripts for the monorepo (potentially for Next.js, Expo, and shared development tools).

## Getting Started

### Prerequisites

- **Node.js**: v18+ recommended.
- **npm** or **Yarn** or **PNPM**: For managing Node.js packages.
- **Python**: v3.9+ (for the FastAPI backend).
- **pip**: Python package manager.
- **Expo CLI** (globally or as a project dependency): `npm install -g expo-cli` (if not already managed by the project's dependencies).
- **Git**: For version control.

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/voicetask-ai.git # Replace with your repo URL
    cd voicetask-ai
    ```

2.  **Install Root & Web App Dependencies (if applicable):**
    (This step handles dependencies for the root of the monorepo and the Next.js app if present)
    ```bash
    npm install # or yarn install / pnpm install
    ```

3.  **Install Mobile App (Expo) Dependencies:**
    ```bash
    cd voicetask
    npm install # or yarn install / pnpm install
    cd ..
    ```

4.  **Setup Backend API & Virtual Environment:**
    ```bash
    cd api
    python -m venv .venv      # Create virtual environment
    source .venv/bin/activate # On Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    # Deactivate if you wish (the start script will try to activate it): deactivate
    cd ..
    ```

## Running the Development Environment

### Starting the Mobile App & API (Recommended)

The `start-dev-environment.sh` script (located in the root or `/scripts/`) is the primary way to launch the development environment for the **mobile app** and its supporting **backend API**.

**Usage (from the monorepo root):**
```bash
./start-dev-environment.sh
# or if moved to scripts/:
# ./scripts/start-dev-environment.sh
```
This script will:
1. Terminate any conflicting previously running server processes.
2. Activate the Python virtual environment for the API (if `api/.venv` exists).
3. Start the FastAPI backend server (typically on `http://localhost:8001`).
4. Start the Expo development server for the mobile app (typically on `http://localhost:8081`), opening it in a new terminal window on macOS.

### Starting the Web App (Next.js)

If you have a Next.js web application in `./src/` and want to run it:
From the monorepo root:
```bash
npm run dev:web # Assuming a script like "dev:web": "cd src && npm run dev" or "next dev" in root package.json
# or
# cd src
# npm run dev
# cd ..
```
*(Please update this section based on how your Next.js app is actually started).*

### Manual Startup of Individual Components

**1. Backend API (`./api/`):**
   From the monorepo root:
   ```bash
   cd api
   source .venv/bin/activate # On Windows: .venv\Scripts\activate
   python start_api.py       # This script should handle 'uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload'
   cd ..
   ```

**2. Mobile App - Expo (`./voicetask/`):**
   From the monorepo root:
   ```bash
   cd voicetask
   npx expo start
   cd ..
   ```

## Environment Variables

-   **Backend API (`./api/.env`):**
    Create a `.env` file in the `./api/` directory with necessary variables:
    ```env
    OPENAI_API_KEY=your_openai_api_key
    SUPABASE_URL=your_supabase_url # If using Supabase
    SUPABASE_KEY=your_supabase_key   # If using Supabase
    SECRET_KEY=a_strong_random_secret_key_for_security
    # Any other backend-specific variables
    ```

-   **Frontend (Mobile/Web):**
    For the mobile app (`./voicetask/`) to connect to your local API, ensure the API base URL in `voicetask/services/api.ts` (or equivalent configuration file) is correctly set (e.g., `http://localhost:8001` for simulators/emulators, or your computer's local network IP for testing on a physical device).
    Next.js environment variables are typically managed via `.env.local` in the project root or the `./src/` directory.

## Development Notes

- Ensure your computer and any physical mobile devices used for testing are on the same network to allow the mobile app to connect to the local API server.
- The `start-dev-environment.sh` script is tailored for macOS/Linux. For Windows, you might need to adapt parts of it or run components manually.

## License

[MIT License](LICENSE) (Assuming you have a LICENSE file. If not, you can remove this line or add one.)