#!/usr/bin/env python3
"""
Reddit Idea Agent - Full Server with Integrations
Includes: Discord, Slack, Notion, CSV/JSON export, AI Analysis
"""

import json
import sys
import time
import csv
import io
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlparse, parse_qs
import urllib.error

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

AI_MODELS = {
    "google/gemini-2.0-flash-001": "Gemini 2.0 Flash",
    "anthropic/claude-3-haiku-20240307": "Claude 3 Haiku",
    "anthropic/claude-3.5-sonnet-20241022": "Claude 3.5 Sonnet",
    "openai/gpt-4o-mini": "GPT-4o Mini",
}


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def save_config(config):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def fetch_reddit(subreddit, limit=25):
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
            posts = fetch_reddit(sr, limit)
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
                    "author": post.get("author"),
                    "created": post.get("created_utc"),
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
    filename = f"scan_{ts}.json"
    with open(DATA_DIR / filename, "w") as f:
        json.dump({"results": results, "high": high, "medium": medium, "subreddits": subreddits}, f, indent=2)
    
    return {
        "subreddits": subreddits,
        "total": len(results),
        "high_intent": len(high),
        "medium_intent": len(medium),
        "high": high[:20],
        "saved_to": str(DATA_DIR / filename)
    }


def analyze_with_ai(posts, model="google/gemini-2.0-flash-001"):
    """Analyze posts with OpenRouter AI"""
    config = load_config()
    api_key = config.get("openrouter_api_key")
    
    if not api_key:
        return [{"error": "OpenRouter API key not configured"}]
    
    analyzed = []
    for post in posts[:5]:
        prompt = f"""Analyze this Reddit post for a software business opportunity:

Title: {post.get('title')}
Subreddit: r/{post.get('subreddit')}
URL: {post.get('url')}
Score: {post.get('score')}

Provide:
1. Problem identified (brief)
2. Potential solution (brief)
3. Monetization potential (1-10)
"""
        
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://reddit-idea-agent.local",
                "X-Title": "Reddit Idea Agent"
            }
            data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}]
            }
            req = Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(data).encode(),
                headers=headers,
                method="POST"
            )
            with urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                analysis = result["choices"][0]["message"]["content"]
                post["ai_analysis"] = analysis
        except Exception as e:
            post["ai_analysis"] = f"Error: {e}"
        
        analyzed.append(post)
    
    return analyzed


def send_discord_webhook(webhook_url, posts):
    """Send results to Discord webhook"""
    if not webhook_url or not posts:
        return {"error": "Webhook URL or posts missing"}
    
    embed = {
        "title": "🔥 New Pain Points Found!",
        "description": f"Found {len(posts)} high-intent posts",
        "color": 0xFF6B6B,
        "fields": []
    }
    
    for post in posts[:5]:
        embed["fields"].append({
            "name": post.get("title", "")[:100],
            "value": f"r/{post.get('subreddit')} | {post.get('score')} pts\n{post.get('url')}",
            "inline": False
        })
    
    data = {"embeds": [embed]}
    
    try:
        req = Request(
            webhook_url,
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urlopen(req, timeout=10):
            return {"status": "sent"}
    except Exception as e:
        return {"error": str(e)}


def send_slack_webhook(webhook_url, posts):
    """Send results to Slack webhook"""
    if not webhook_url or not posts:
        return {"error": "Webhook URL or posts missing"}
    
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "🔥 New Pain Points Found!"}
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"Found *{len(posts)}* high-intent posts"}
        },
        {"type": "divider"}
    ]
    
    for post in posts[:5]:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*{post.get('title', '')[:100]}*\n• r/{post.get('subreddit')} | {post.get('score')} pts\n• <{post.get('url')}|View Post>"}
        })
    
    data = {"blocks": blocks}
    
    try:
        req = Request(
            webhook_url,
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urlopen(req, timeout=10):
            return {"status": "sent"}
    except Exception as e:
        return {"error": str(e)}


def export_to_notion(posts, token, db_id):
    """Export posts to Notion database"""
    if not token or not db_id:
        return {"error": "Token or Database ID missing"}
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    
    created = []
    for post in posts[:10]:
        data = {
            "parent": {"database_id": db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": post.get("title", "")[:100]}}]},
                "Subreddit": {"rich_text": [{"text": {"content": post.get("subreddit", "")}}]},
                "URL": {"url": post.get("url", "")},
                "Score": {"number": post.get("score", 0)},
                "Intent": {"select": {"name": post.get("intent", "low")}},
            }
        }
        
        try:
            req = Request(
                "https://api.notion.com/v1/pages",
                data=json.dumps(data).encode(),
                headers=headers,
                method="POST"
            )
            with urlopen(req, timeout=10):
                created.append(post.get("id"))
        except Exception as e:
            print(f"Notion error: {e}")
    
    return {"created": len(created), "ids": created}


def export_to_csv(posts):
    """Export posts to CSV"""
    output = io.StringIO()
    if not posts:
        return ""
    
    fieldnames = ["title", "subreddit", "url", "score", "comments", "intent"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for post in posts:
        writer.writerow({k: post.get(k, "") for k in fieldnames})
    
    return output.getvalue()


def export_to_json(posts, pretty=True):
    """Export posts to JSON"""
    return json.dumps(posts, indent=2 if pretty else None)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            config = load_config()
            resp = {
                "name": "Reddit Idea Agent",
                "version": "3.0.0",
                "integrations": ["discord", "slack", "notion", "csv", "json", "ai"],
                "endpoints": {
                    "GET /": "Status",
                    "POST /scan": "Scan subreddits",
                    "GET /list": "List subreddits",
                    "GET /results": "Recent results",
                    "POST /config": "Set config",
                    "POST /export/csv": "Export to CSV",
                    "POST /export/json": "Export to JSON",
                    "POST /ai/analyze": "AI analysis",
                    "POST /webhook/discord": "Send to Discord",
                    "POST /webhook/slack": "Send to Slack",
                    "POST /notion": "Export to Notion",
                }
            }
            self.wfile.write(json.dumps(resp, indent=2).encode())
        
        elif path == "/list":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.wfile.write(json.dumps(SUBREDDITS, indent=2).encode())
        
        elif path == "/results":
            if DATA_DIR.exists():
                files = sorted(DATA_DIR.glob("scan_*.json"), key=lambda x: x.stat().st_mtime, reverse=True)[:10]
                results = []
                for f in files:
                    data = json.loads(f.read_text())
                    results.append({
                        "file": f.name,
                        "total": len(data.get("results", [])),
                        "high": len(data.get("high", [])),
                        "subreddits": data.get("subreddits", [])
                    })
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.wfile.write(json.dumps(results, indent=2).encode())
            else:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.wfile.write(json.dumps([]).encode())
        
        elif path == "/models":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.wfile.write(json.dumps(AI_MODELS, indent=2).encode())
        
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
        path = parsed.path
        
        if path == "/scan":
            subreddits = data.get("subreddits", ["shopify", "smallbusiness", "notion"])
            limit = data.get("limit", 25)
            print(f"\nScanning: {subreddits}")
            result = scan_subreddits(subreddits, limit)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        elif path == "/config":
            config = load_config()
            config.update(data)
            save_config(config)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        
        elif path == "/export/csv":
            posts = data.get("posts", [])
            csv_data = export_to_csv(posts)
            
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self.send_header("Content-Disposition", "attachment; filename=reddit-ideas.csv")
            self.end_headers()
            self.wfile.write(csv_data.encode())
        
        elif path == "/export/json":
            posts = data.get("posts", [])
            json_data = export_to_json(posts)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Disposition", "attachment; filename=reddit-ideas.json")
            self.end_headers()
            self.wfile.write(json_data.encode())
        
        elif path == "/ai/analyze":
            posts = data.get("posts", [])
            model = data.get("model", "google/gemini-2.0-flash-001")
            print(f"\nAnalyzing {len(posts)} posts with {model}...")
            result = analyze_with_ai(posts, model)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        elif path == "/webhook/discord":
            webhook_url = data.get("webhook_url")
            posts = data.get("posts", [])
            result = send_discord_webhook(webhook_url, posts)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        elif path == "/webhook/slack":
            webhook_url = data.get("webhook_url")
            posts = data.get("posts", [])
            result = send_slack_webhook(webhook_url, posts)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        elif path == "/notion":
            posts = data.get("posts", [])
            token = data.get("token")
            db_id = data.get("db_id")
            result = export_to_notion(posts, token, db_id)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")


def run_server(port=8080):
    """Run the HTTP server"""
    print(f"Reddit Idea Agent server running on http://localhost:{port}")
    print("Integrations: Discord, Slack, Notion, CSV, JSON, AI Analysis")
    print("")
    print("Endpoints:")
    print("  POST /scan           - Scan subreddits")
    print("  POST /config        - Set config (api keys, webhooks)")
    print("  POST /export/csv    - Export to CSV")
    print("  POST /export/json   - Export to JSON")
    print("  POST /ai/analyze    - AI analysis")
    print("  POST /webhook/discord - Send to Discord")
    print("  POST /webhook/slack   - Send to Slack")
    print("  POST /notion        - Export to Notion")
    print("")
    
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)


if __name__ == "__main__":
    main()
