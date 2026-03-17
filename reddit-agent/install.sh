#!/bin/bash
# Reddit Idea Agent - Single command startup
# Run: bash <(curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh)

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
rm -rf "$TMP_DIR"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

# Find Python
PYTHON=python3
command -v python3 &>/dev/null || PYTHON=python

# Install deps
echo "Installing dependencies..."
$PYTHON -m pip install --user -q praw requests 2>/dev/null || pip install -q praw requests || true

echo ""
echo "========================================"
echo "Reddit Idea Agent - Server Running"
echo "========================================"
echo ""
echo "Server: http://localhost:8080"
echo ""
echo "Commands:"
echo "  curl -X POST http://localhost:8080/config -H 'Content-Type: application/json' -d '{\"reddit_client_id\": \"ID\", \"reddit_client_secret\": \"SECRET\"}'"
echo "  curl -X POST http://localhost:8080/scan -H 'Content-Type: application/json' -d '{\"subreddits\": [\"shopify\", \"notion\"]}'"
echo "  curl http://localhost:8080/list"
echo ""

exec $PYTHON server.py
