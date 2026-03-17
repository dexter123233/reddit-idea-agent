#!/bin/bash
# Reddit Idea Agent - Single command startup (no dependencies needed!)
# Run: bash <(curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh)

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
rm -rf "$TMP_DIR"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo ""
echo "========================================"
echo "Reddit Idea Agent - Server Running"
echo "========================================"
echo ""
echo "Using free Reddit JSON API - no credentials!"
echo "Server: http://localhost:8080"
echo ""
echo "Commands:"
echo "  curl -X POST http://localhost:8080/scan -H 'Content-Type: application/json' -d '{\"subreddits\": [\"shopify\", \"notion\"]}'"
echo "  curl http://localhost:8080/list"
echo "  curl http://localhost:8080/results"
echo ""

exec python3 server.py
