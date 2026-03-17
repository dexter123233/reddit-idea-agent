#!/usr/bin/env python3
"""
Reddit Idea Agent - HTTP Server
Uses free Reddit JSON API (no credentials needed)
"""

import json
import sys
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
from urllib.parse import urlparse

CONFIG_DIR = Path.home() / ".reddit-idea-agent"
CONFIG_FILE = CONFIG_DIR / "config.json"
DATA_DIR = CONFIG_DIR / "data"

SUBREDDITS = {
    "shopify": "E-commerce", "shopifyapps": "Shopify apps", "dropshipping": "Dropshipping",
    "smallbusiness": "Small business", "entrepreneur": "Entrepreneurship", "startups": "Startups",
    "sideproject": "Side projects", "saas": "SaaS", "webdev": "Web dev", "python": "Python",
    "javascript": "JavaScript", "reactjs": "React", "aws": "AWS", "notion": "Notion",
    "n8n": "n8n", "zapier": "Zapier", "airtable": "Airtable", "productivity": "Productivity",
    "freelance": "Freelance", "indiehackers": "Indie hackers", "bootstrapped": "Bootstrapped",
}

HIGH_INTENT = [
    "is there a tool", "is there an app", "looking for a tool", "recommend a tool", "need a tool",
    "how do i automate", "can i automate", "is there a way to", "why isn't there", "there should be",
    "i wish there was", "tired of", "sick of", "hate it when", "manually", "tedious", "repetitive",
]

MEDIUM_INTENT = ["how do i", "how can i", "help me", "looking for", "struggling with", "having trouble"]


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def fetch_reddit_json(subreddit, limit=25):
    """Fetch posts from Reddit using free JSON API"""
    url = f"https://www.reddit.com/r/{subreddit}/rising.json?limit={limit}"
    headers = {"User-Agent": "RedditIdeaAgent/1.0"}
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get("data", {}).get("children", [])
    except Exception as e:
        print(f"Error fetching r/{subreddit}: {e}")
        return []


def scan_subreddits(subreddits, limit=25):
    results = []
    high = []
    medium = []
    
    for sr in subreddits:
        try:
            posts = fetch_reddit_json(sr, limit)
            
            for post_data in posts:
                post = post_data.get("data", {})
                title = (post.get("title", "") or "").lower()
                body = (post.get("selftext", "") or "").lower()
                content = title + " " + body
                
                is_high = any(kw in content for kw in HIGH_INTENT)
                is_med = any(kw in content for kw in MEDIUM_INTENT)
                
                pdata = {
                    "id": post.get("id"),
                    "title": post.get("title"),
                    "subreddit": sr,
                    "url": f"https://reddit.com{post.get('permalink')}",
                    "score": post.get("score", 0),
                    "comments": post.get("num_comments", 0),
                    "intent": "high" if is_high else ("medium" if is_med else "low"),
                }
                
                if is_high:
                    high.append(pdata)
                elif is_med:
                    medium.append(pdata)
                results.append(pdata)
            
            print(f"  r/{sr}: {len(posts)} posts")
            time.sleep(1)
            
        except Exception as e:
            print(f"  r/{sr}: error - {e}")
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = DATA_DIR / f"scan_{ts}.json"
    with open(out_file, "w") as f:
        json.dump({"results": results, "high": high, "medium": medium}, f, indent=2)
    
    return {
        "subreddits": subreddits,
        "total": len(results),
        "high_intent": len(high),
        "medium_intent": len(medium),
        "high": high[:10],
        "saved_to": str(out_file)
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "name": "Reddit Idea Agent",
                "version": "2.0.0",
                "api": "Free Reddit JSON API (no credentials needed)",
                "endpoints": {
                    "POST /scan": "Scan subreddits",
                    "GET /list": "List subreddits",
                    "GET /results": "Recent scan results",
                }
            }
            self.wfile.write(json.dumps(resp, indent=2).encode())
        elif parsed.path == "/list":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(SUBREDDITS, indent=2).encode())
        elif parsed.path == "/results":
            if DATA_DIR.exists():
                files = sorted(DATA_DIR.glob("scan_*.json"), key=lambda x: x.stat().st_mtime, reverse=True)[:5]
                results = []
                for f in files:
                    data = json.loads(f.read_text())
                    results.append({"file": f.name, "total": len(data.get("results", [])), "high": len(data.get("high", []))})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(results, indent=2).encode())
            else:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps([]).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}
        
        parsed = urlparse(self.path)
        
        if parsed.path == "/scan":
            subreddits = data.get("subreddits", ["shopify", "smallbusiness", "notion"])
            limit = data.get("limit", 25)
            print(f"\nScanning: {subreddits}")
            result = scan_subreddits(subreddits, limit)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Reddit Idea Agent server running on http://localhost:{port}")
    print("Using free Reddit JSON API - no credentials needed!")
    print("")
    print("Endpoints:")
    print("  GET  /          - Status")
    print("  POST /scan     - Scan subreddits")
    print("  GET  /list     - List subreddits")
    print("  GET  /results  - Recent results")
    print("")
    print("Example:")
    print(f'  curl -X POST http://localhost:{port}/scan -H "Content-Type: application/json" -d \'{{"subreddits": ["shopify", "notion"]}}\'')
    
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


def run_server(port=8080):
    """Run the HTTP server (imported by CLI)"""
    print(f"Reddit Idea Agent server running on http://localhost:{port}")
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
