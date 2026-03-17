#!/bin/bash
# Reddit Idea Agent - One-line installer
# Run: curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh | bash

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo "Installing dependencies..."

# Find Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "Error: Python not found. Install Python 3 first."
    exit 1
fi

# Find pip
if command -v pip3 &> /dev/null; then
    PIP=pip3
elif command -v pip &> /dev/null; then
    PIP=pip
else
    echo "Error: pip not found. Install pip first."
    exit 1
fi

$PIP install -q praw requests 2>/dev/null || $PYTHON -m pip install -q praw requests || echo "Warning: Could not install deps automatically"

echo "Starting server on http://localhost:8080"
$PYTHON server.py
