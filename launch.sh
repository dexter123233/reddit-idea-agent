#!/bin/bash
# Pain Point Scanner Launcher
# This script starts the local server and opens Chrome with the extension

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3002

echo "Starting Pain Point Scanner..."

# Check if server is already running
if curl -s http://localhost:$PORT/ > /dev/null 2>&1; then
    echo "Server already running on port $PORT"
else
    echo "Starting local server..."
    cd "$SCRIPT_DIR"
    node server.js > /dev/null 2>&1 &
    sleep 2
    
    if curl -s http://localhost:$PORT/ > /dev/null 2>&1; then
        echo "Server started successfully on port $PORT"
    else
        echo "Error: Failed to start server. Please check Node.js is installed."
        exit 1
    fi
fi

# Open Chrome with extension (if Chrome is installed)
if command -v google-chrome &> /dev/null; then
    echo "Opening Chrome with extension..."
    google-chrome --load-extension="$SCRIPT_DIR" --new-window https://www.reddit.com &
elif command -v chromium-browser &> /dev/null; then
    echo "Opening Chromium with extension..."
    chromium-browser --load-extension="$SCRIPT_DIR" --new-window https://www.reddit.com &
else
    echo "Chrome not found. Please open Chrome manually and load the extension from:"
    echo "$SCRIPT_DIR"
fi

echo "Done! The Pain Point Scanner is ready."
