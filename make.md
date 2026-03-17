# Clawd Bot Local Installation Guide

## Overview

This guide covers local installation of Clawd bot (OpenClaw) on your computer with OpenRouter for API access.

## Prerequisites

- Node.js 18+ and npm
- OpenRouter API key (get from https://openrouter.ai/)
- Terminal with shell access

## Installation Steps

### 1. Install OpenClaw

```bash
npm install -g openclaw
```

### 2. Initialize Configuration

```bash
mkdir -p ~/.openclaw/agents/main/agent
```

### 3. Configure OpenRouter API Key

Get your API key from https://openrouter.ai/keys

Add the API key to auth profiles:

```bash
openclaw models auth paste-token --provider openrouter
```

When prompted, paste your OpenRouter API key.

### 4. Set Default Model

Choose an OpenRouter model. Recommended options:

- `openrouter/anthropic/claude-3.5-sonnet` - Good balance of cost/performance
- `openrouter/anthropic/claude-3-haiku` - Fast and affordable
- `openrouter/deepseek/deepseek-r1` - Reasoning model
- `openrouter/google/gemini-2.0-flash-001` - Fast Google model

```bash
openclaw models set openrouter/anthropic/claude-3.5-sonnet
```

### 5. Verify Configuration

```bash
openclaw models status
```

Should show:
- Default model pointing to openrouter
- Auth configured with your API key

## Optional: Install Clawd CLI Wrapper

For additional CLI functionality:

```bash
npm install -g clawd
clawd init
```

## Starting OpenClaw

### Start Gateway

```bash
openclaw gateway start
```

### Access Web Interface

Once running, access at: http://127.0.0.1:18789/

### Check Status

```bash
openclaw gateway status
```

## Configuration Files

- Main config: `~/.openclaw/openclaw.json`
- Agent config: `~/.openclaw/agents/main/agent/config.json`
- Auth profiles: `~/.openclaw/agents/main/agent/auth-profiles.json`

## Troubleshooting

### Check model status
```bash
openclaw models status
```

### List available models
```bash
openclaw models list --provider openrouter
```

### Reconfigure auth
```bash
openclaw models auth paste-token --provider openrouter
```

## Integrations

After basic setup, you can configure additional integrations:

- Slack
- Telegram
- Discord
- Meta Ads
- GHL (Go High Level)
- Monday.com
- Google Drive/Sheets

See the full SOP for integration configuration details.

---

# Reddit Pain Point Scanner Browser Extension

A Chrome extension that finds software business opportunities on Reddit with AI-powered analysis.

## Quick Start

### Option 1: Launcher Script (Recommended)

```bash
cd /home/arx/pain-point-scanner-ext
./launch.sh
```

### Option 2: Manual

1. Start the server:
```bash
cd /home/arx/pain-point-scanner-ext
node server.js
```

2. Load extension in Chrome:
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extension folder

## Features

- **Reddit Scanning**: Monitor subreddits for pain points
- **AI Analysis**: OpenRouter integration (Gemini, Claude, GPT)
- **Export**: CSV, JSON, Excel, Google Sheets, Notion
- **Auto-Scan**: Schedule scans (15min/1hr/6hr)
- **Webhooks**: Discord/Slack notifications

## API Keys

1. **OpenRouter** (free): https://openrouter.ai
2. **Notion** (optional): https://www.notion.so/my-integrations

## Architecture

- **Filter**: Keyword-based intent detection
- **Analyzer**: OpenRouter AI for pain point extraction
- **Proxy**: Local Node.js server for CORS/Notion

## Files

| File | Description |
|------|-------------|
| manifest.json | Extension manifest (MV3) |
| popup.html | Main UI |
| popup.js | Logic |
| background.js | Service worker |
| content.js | Reddit overlay |
| server.js | Local proxy |
| launch.sh | Linux/Mac launcher |

An AI agent that scans Reddit for software business opportunities by identifying pain points that can be fixed with software.

## Architecture

- **Ingestor**: PRAW (Reddit API) - Fetches posts from target subreddits
- **Filter**: Fast/cheap LLM (Claude Haiku via OpenRouter) - Discards 90% of fluff
- **Analyzer**: Reasoning model (Claude Sonnet via OpenRouter) - Pain point extraction
- **Database**: SQLite - Stores structured leads
- **Notifier**: Slack integration for daily digest

## Prerequisites

- Python 3.9+
- Reddit API credentials (script app)
- OpenRouter API key
- (Optional) Slack webhook for daily digest

## Setup

### 1. Install Dependencies

```bash
cd /home/arx/reddit-scanner-bot/reddit-scanner
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
export REDDIT_CLIENT_ID="your_reddit_client_id"
export REDDIT_CLIENT_SECRET="your_reddit_client_secret"
export OPENROUTER_API_KEY="your_openrouter_api_key"
export SLACK_WEBHOOK_URL="your_slack_webhook_url"  # Optional
```

### 3. Get Reddit Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Create a "Script" app
3. Copy the client ID and secret

### 4. Edit config.yaml

Update the following in `config.yaml`:
- `reddit.client_id` and `reddit.client_secret`
- Target subreddits (vertical communities)
- AI model settings (defaults to OpenRouter)

## Usage

### Run Once

```bash
python -m src.main --run-once
```

### Run on Schedule (every 6 hours)

```bash
python -m src.main --schedule
```

### View Recent Leads

```bash
python -m src.main --leads
```

### Export Leads to JSON

```bash
python -m src.main --export
```

### Scan Specific Subreddits

```bash
python -m src.main --run-once --subreddits shopify python
```

## Target Subreddits

Recommended vertical subreddits for software opportunities:
- shopify, notion, excel, realestate, n8n
- saas, sideproject, entrepreneur, webdev
- smallbusiness, startups, python

## Pain Point Detection

The bot looks for these "buy signals":
- "Is there a tool for..." - ultimate buy signal
- "How do I..." - problem seeking solution
- "I'm currently using a spreadsheet for..." - inefficient workaround
- "Why isn't there..." - unmet need
- "I hate it when..." - frustration signal
- "Manual", "tedious", "repetitive" - pain indicators

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `reddit.post_limit` | Posts to fetch per subreddit | 20 |
| `reddit.sort_method` | Sort: rising, hot, new, top | rising |
| `ai.provider` | AI provider: anthropic, openrouter | openrouter |
| `ai.model` | Main analysis model | openrouter/anthropic/claude-3.5-sonnet |
| `scheduler.interval_hours` | Scan frequency | 6 |
| `output.daily_digest` | Send Slack digest | true |

---

# Reddit Idea Agent (CLI)

OpenCode-style CLI for scraping Reddit for business ideas.

## Quick Start

```bash
cd /home/arx/Completed\ Agents/pain-point-scanner-ext/reddit-agent
./quickstart.sh
```

## Curl Commands (Server Mode)

Start the server:
```bash
./quickstart.sh server
```

Then use curl:

```bash
# Scan subreddits
curl -X POST http://localhost:8080/scan \
  -H "Content-Type: application/json" \
  -d '{"subreddits": ["shopify", "smallbusiness", "notion"]}'

# List available subreddits
curl http://localhost:8080/list

# Set config
curl -X POST http://localhost:8080/config \
  -H "Content-Type: application/json" \
  -d '{"reddit_client_id": "xxx", "reddit_client_secret": "yyy"}'
```

## Features

- **OpenCode-style CLI**: Minimalist, command-based interface
- **HTTP Server**: Execute via curl
- **Agentic Scanning**: Automatically detects high/medium intent pain points
- **Multi-subreddit**: Scan 20+ target subreddits simultaneously
- **Intent Filtering**: Keyword-based detection (high/medium/low)
- **JSON Export**: Results saved with full metadata

## Prerequisites

- Python 3.9+
- Reddit API credentials (script app)
- OpenRouter API key (optional, for AI analysis)

## Installation

```bash
cd reddit-agent
pip install praw requests
```

## Usage

```
reddit scan <subreddits..>   scan subreddits for pain points
reddit list                  list available subreddits
reddit config                configure API keys
reddit results               show saved scan results
```

### Examples

```bash
reddit scan shopify smallbusiness notion
reddit scan
reddit list
reddit config
reddit results
```

## Target Subreddits

| Category | Subreddits |
|----------|------------|
| E-commerce | shopify, shopifyapps, dropshipping |
| Business | smallbusiness, entrepreneur, startups, freelance, indiehackers |
| Tech | webdev, python, javascript, reactjs, aws |
| Productivity | notion, n8n, zapier, airtable, productivity |
| SaaS | saas, sideproject |

## Pain Point Keywords

**High Intent:**
- "is there a tool", "looking for a tool"
- "how do i automate"
- "tired of", "sick of", "hate it when"
- "manually", "tedious", "repetitive"
- "why isn't there", "there should be"

**Medium Intent:**
- "how do i", "help me"
- "struggling with", "having trouble"
- "looking for", "considering"

## Configuration

Set via `reddit config` or environment variables:

```bash
export REDDIT_CLIENT_ID="your_client_id"
export REDDIT_CLIENT_SECRET="your_client_secret"
export OPENROUTER_API_KEY="your_openrouter_key"
```

## Files

| File | Description |
|------|-------------|
| `reddit` | Main CLI (executable) |
| `quickstart.sh` | Quick start script |

## Troubleshooting

- "credentials not configured" → Run `reddit config`
- "No posts found" → Check Reddit API credentials
- Set env vars if CLI config fails