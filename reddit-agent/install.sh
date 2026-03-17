#!/bin/bash
# Reddit Idea Agent - One-line installer
# Run: curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh | bash

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo "Installing dependencies..."
pip3 install -q praw requests 2>/dev/null || pip install -q praw requests

echo "Starting server on http://localhost:8080"
python3 server.py
