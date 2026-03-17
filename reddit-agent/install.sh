#!/bin/bash
# Reddit AI Scraper - Browser Interface
# Run: bash <(curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh)

set -e

echo "Cloning Reddit AI Scraper..."
TMP_DIR="/tmp/reddit-agent-$$"
rm -rf "$TMP_DIR"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo ""
echo "========================================"
echo "Reddit AI Scraper"
echo "========================================"
echo ""
echo "Starting server..."
echo "Open in browser: http://localhost:8080"
echo ""

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8080 &
elif command -v open &> /dev/null; then
    open http://localhost:8080 &
fi

exec python3 server.py
