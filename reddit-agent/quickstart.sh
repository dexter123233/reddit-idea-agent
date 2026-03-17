#!/bin/bash
# Reddit Idea Agent - Quick Start
# Execute via curl

set -e

CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}"
cat << 'EOF'
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█                                                        
█   ██████╗ ███████╗██╗    ██╗███████╗██╗      ██████╗ 
█   ██╔══██╗██╔════╝██║    ██║██╔════╝██║     ██╔═══██╗
█   ██║  ██║█████╗  ██║ █╗ ██║█████╗  ██║     ██║   ██║
█   ██║  ██║██╔══╝  ██║███╗██║██╔══╝  ██║     ██║   ██║
█   ██████╔╝███████╗╚███╔███╔╝███████╗███████╗╚██████╔╝
█   ╚═════╝ ╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝ ╚═════╝ 
█                                                       
█        AGENTIC AI FOR SCRAPING REDDIT FOR IDEAS       
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
EOF
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8080

if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 required"
    exit 1
fi

pip3 install -q praw requests 2>/dev/null || pip install -q praw requests

mkdir -p ~/.reddit-idea-agent/data

if [ "$1" == "server" ]; then
    echo "Starting server on port $PORT..."
    python3 "$SCRIPT_DIR/server.py" "$PORT"
elif [ "$1" == "curl" ] || [ "$2" == "curl" ]; then
    python3 "$SCRIPT_DIR/server.py" "$PORT" &
    sleep 2
    echo ""
    echo "Curl commands:"
    echo ""
    echo "Scan subreddits:"
    echo "curl -X POST http://localhost:$PORT/scan -H 'Content-Type: application/json' -d '{\"subreddits\": [\"shopify\", \"smallbusiness\", \"notion\"]}'"
    echo ""
    echo "List subreddits:"
    echo "curl http://localhost:$PORT/list"
    echo ""
    echo "Set config:"
    echo "curl -X POST http://localhost:$PORT/config -H 'Content-Type: application/json' -d '{\"reddit_client_id\": \"xxx\", \"reddit_client_secret\": \"yyy\"}'"
    kill %1 2>/dev/null
else
    python3 "$SCRIPT_DIR/server.py" "$PORT"
fi
