#!/usr/bin/env python3
"""
Reddit Idea Agent - HTTP Server
Execute via curl: curl -X POST http://localhost:8080/scan -d '{"subreddits": ["shopify", "notion"]}'
"""

import json
import os
import sys
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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


def get_reddit():
    cfg = load_config()
    cid = cfg.get("reddit_client_id") or os.environ.get("REDDIT_CLIENT_ID")
    csec = cfg.get("reddit_client_secret") or os.environ.get("REDDIT_CLIENT_SECRET")
    if not cid or not csec:
        return None
    try:
        import praw
        return praw.Reddit(client_id=cid, client_secret=csec, user_agent="RedditIdeaAgent/1.0")
    except:
        return None


def scan_subreddits(subreddits, limit=25):
    reddit = get_reddit()
    if not reddit:
        return {"error": "Reddit credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET"}
    
    results = []
    high = []
    medium = []
    
    for sr in subreddits:
        try:
            sub = reddit.subreddit(sr)
            posts = list(sub.rising(limit=limit))
            for post in posts:
                title = post.title.lower()
                body = (post.selftext or "").lower()
                content = title + " " + body
                
                is_high = any(kw in content for kw in HIGH_INTENT)
                is_med = any(kw in content for kw in MEDIUM_INTENT)
                
                pdata = {
                    "id": post.id,
                    "title": post.title,
                    "subreddit": sr,
                    "url": f"https://reddit.com{post.permalink}",
                    "score": post.score,
                    "intent": "high" if is_high else ("medium" if is_med else "low"),
                }
                
                if is_high:
                    high.append(pdata)
                elif is_med:
                    medium.append(pdata)
                results.append(pdata)
            time.sleep(0.5)
        except Exception as e:
            results.append({"error": str(e), "subreddit": sr})
    
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
                "version": "1.0.0",
                "endpoints": {
                    "POST /scan": "Scan subreddits",
                    "GET /list": "List subreddits",
                    "POST /config": "Set config",
                }
            }
            self.wfile.write(json.dumps(resp, indent=2).encode())
        elif parsed.path == "/list":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(SUBREDDITS, indent=2).encode())
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
            result = scan_subreddits(subreddits, limit)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        elif parsed.path == "/config":
            cfg = load_config()
            cfg.update(data)
            CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_FILE, "w") as f:
                json.dump(cfg, f, indent=2)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Reddit Idea Agent server running on http://localhost:{port}")
    print("Endpoints:")
    print("  POST /scan   - Scan subreddits")
    print("  GET  /list   - List subreddits")
    print("  POST /config - Set config")
    print("")
    print("Example curl commands:")
    print(f'  curl -X POST http://localhost:{port}/scan -H "Content-Type: application/json" -d \'{{"subreddits": ["shopify", "notion"]}}\'')
    print(f'  curl http://localhost:{port}/list')
    
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
