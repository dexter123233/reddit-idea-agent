# Changelog

## 2026-03-17

### Added - Reddit Idea Agent (CLI)

Created an OpenCode-style CLI for scraping Reddit for business ideas:

- **reddit-agent/reddit** - Main CLI (executable)
  - OpenCode-style minimalist interface
  - ASCII box header
  - Commands: scan, list, config, results
  - Keyword-based intent detection (high/medium/low)
  - Multi-subreddit scanning (20+ targets)
  - JSON export with full metadata

- **reddit-agent/quickstart.sh** - Quick start installer
  - Auto-installs dependencies
  - Handles all commands

- **Target Subreddits** (20+):
  - E-commerce: shopify, shopifyapps, dropshipping
  - Business: smallbusiness, entrepreneur, startups, freelance, indiehackers
  - Tech: webdev, python, javascript, reactjs, aws
  - Productivity: notion, n8n, zapier, airtable
  - SaaS: saas, sideproject

#### Quick Start
```bash
cd /home/arx/Completed Agents/pain-point-scanner-ext/reddit-agent
./quickstart.sh scan shopify smallbusiness notion
```

### Added - Reddit Pain Point Scanner Extension
- Chrome extension with AI-powered Reddit scanning
- Local proxy server (server.js) for Notion/CORS
- Export to CSV, JSON, Excel, Google Sheets, Notion
- Discord/Slack webhook notifications
- Auto-scheduling (15min/1hr/6hr)
- Reddit-themed UI with dark mode
- Server auto-start scripts (launch.sh, launch.bat)

### Files Created
- pain-point-scanner-ext/ directory
  - manifest.json - Extension manifest (MV3)
  - popup.html - Main extension UI
  - popup.js - All JavaScript logic
  - background.js - Background service worker
  - content.js - Reddit overlay script
  - styles.css - Extension styling
  - server.js - Local proxy server
  - launch.sh - Linux/Mac launcher
  - launch.bat - Windows launcher

### Features
- Keyword-based post filtering (high/medium intent)
- AI analysis via OpenRouter (Gemini, Claude, GPT)
- Multi-stage filtering (keyword router + AI analyzer)
- Scheduled auto-scanning
- Discord/Slack webhook notifications
- Export to Notion via local proxy

## 2026-03-16

### Added
- Local installation guide for Clawd bot (OpenClaw)
- OpenRouter API configuration instructions
- make.md documentation file
- changelog.md file
- Reddit Pain Point Scanner Bot (AI agent for market research)

### Packages Installed
- openclaw@2026.3.13 (global npm)
- clawd@1.2.0 (global npm)

### Configuration
- OpenRouter set as primary LLM provider
- .clawd/ directory initialized for clawd CLI
- .openclaw/ directory structure created
- Gateway installed and running on port 18789
- Web dashboard accessible at http://127.0.0.1:18789/

### Reddit Scanner Bot Changes
- Added OpenRouter support in ai_analyzer.py
- Enhanced pain point detection prompts with "buy signal" keywords
- Added Slack integration for daily digest notifications
- Added notifier.py for Slack webhook support
- Updated config.yaml with OpenRouter defaults and new subreddits
- Enhanced bot.py to send digests after scans

### GitHub Page Files
- Created /home/arx/reddit-pain-point-scanner/ directory
- README.md with full project documentation
- LICENSE (MIT)
- .gitignore
- docs/SETUP.md - Setup guide
- docs/CONFIGURATION.md - Configuration documentation
- Full source code ready for GitHub upload

### Notes
- Skipped VPS/cloud installation sections from SOP
- Used OpenRouter instead of Anthropic for API access
- Local computer setup only (not Railway/VPS)