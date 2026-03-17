@echo off
REM Pain Point Scanner Launcher for Windows
REM This script starts the local server and opens Chrome with the extension

echo Starting Pain Point Scanner...

REM Check if server is already running
curl -s http://localhost:3002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Server already running on port 3002
) else (
    echo Starting local server...
    start /B node server.js >nul 2>&1
    timeout /t 2 /nobreak >nul
    
    curl -s http://localhost:3002/health >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: Failed to start server. Please check Node.js is installed.
        pause
        exit /b 1
    )
    echo Server started successfully on port 3002
)

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Open Chrome with extension
where google-chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo Opening Chrome with extension...
    start chrome --load-extension="%SCRIPT_DIR%" --new-window https://www.reddit.com
) else (
    echo Chrome not found. Please open Chrome manually and load the extension from:
    echo %SCRIPT_DIR%
    pause
)

echo Done! The Pain Point Scanner is ready.
