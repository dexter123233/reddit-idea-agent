#!/bin/bash
# Reddit Idea Agent - Single command startup
# Run: bash <(curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh)

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
rm -rf "$TMP_DIR"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo ""
echo "========================================"
echo "Reddit Idea Agent"
echo "========================================"
echo ""
echo "Starting in TUI mode..."
echo ""

exec python3 reddit
