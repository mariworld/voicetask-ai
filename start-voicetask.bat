@echo off
echo === VoiceTask AI - Development Environment ===

:: Kill existing processes
echo Killing any existing servers...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq backend-server" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq expo-server" 2>nul

:: Set paths
set PROJECT_DIR=%cd%
set BACKEND_DIR=%PROJECT_DIR%\api\app
set FRONTEND_DIR=%PROJECT_DIR%\voicetask

:: Check if directories exist
if not exist "%BACKEND_DIR%" (
    echo Error: Backend directory not found: %BACKEND_DIR%
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo Error: Frontend directory not found: %FRONTEND_DIR%
    exit /b 1
)

echo Starting servers...

:: Start backend server in a new window
start "backend-server" cmd /k "cd /d %BACKEND_DIR% && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment before starting the next server
timeout /t 2 >nul

:: Start frontend server in a new window
start "expo-server" cmd /k "cd /d %FRONTEND_DIR% && npx expo start"

echo.
echo Servers started!
echo - Backend: http://localhost:8000
echo - Frontend: Expo will open in browser 