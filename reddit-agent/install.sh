#!/bin/bash
# Reddit Idea Agent - Full implementation with integrations
# Run: bash <(curl -sSL https://raw.githubusercontent.com/dexter123233/reddit-idea-agent/main/reddit-agent/install.sh)

set -e

echo "Cloning Reddit Idea Agent..."
TMP_DIR="/tmp/reddit-agent-$$"
rm -rf "$TMP_DIR"
git clone --depth 1 https://github.com/dexter123233/reddit-idea-agent.git "$TMP_DIR"

cd "$TMP_DIR/reddit-agent"

echo ""
echo "========================================"
echo "Reddit Idea Agent - Full Integrations"
echo "========================================"
echo ""
echo "Starting TUI..."
echo ""

exec python3 reddit
