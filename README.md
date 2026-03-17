# Pain Point Scanner

A Chrome extension that finds software business opportunities on Reddit using AI-powered analysis.

![Version](https://img.shields.io/badge/version-1.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-extensions-green)

## What It Does

Scans Reddit subreddits for posts describing problems, frustrations, and unmet needs—potential signals for software business opportunities. Uses AI to analyze monetization potential and extracts actionable insights.

## Quick Start

### Option 1: Launcher Script (Recommended)

```bash
cd pain-point-scanner-ext
./launch.sh
```

This will:
1. Start the local server (port 3002)
2. Open Chrome with the extension loaded
3. Navigate to Reddit

### Option 2: Manual

1. Start the server:
```bash
cd pain-point-scanner-ext
node server.js
```

2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the extension folder

## Features

| Feature | Description |
|---------|-------------|
| **Reddit Scanning** | Monitor multiple subreddits for pain points |
| **AI Analysis** | OpenRouter-powered analysis (Gemini, Claude, GPT) |
| **Intent Filtering** | Keyword-based high/medium intent detection |
| **Export** | CSV, JSON, Excel, Google Sheets, Notion |
| **Auto-Scan** | Schedule scans every 15min, 1hr, or 6hrs |
| **Webhooks** | Discord/Slack notifications |

## API Keys Setup

### OpenRouter (Required for AI)

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up and get a free API key
3. Enter the key in **Settings** tab

### Notion (Optional for Export)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the **Internal Integration Token** (starts with `secret_`)
4. Create a database with these properties:
   - Name (title)
   - Subreddit (text)
   - URL (url)
   - Score (number)
   - Problem (text)
   - Workaround (text)
   - AI Score (number)
   - Status (select)
5. Share the database with your integration
6. Enter token and database ID in **Settings**

## How It Works

1. **Fetch Posts**: Retrieves posts from configured subreddits
2. **Keyword Filter**: Identifies high/medium intent posts using keywords
3. **AI Analysis**: Scores monetization potential (1-10)
4. **Store Results**: Saves leads locally
5. **Export**: Send to your preferred platform

## Usage

1. Enter subreddits (comma-separated) or use quick tags
2. Toggle AI analysis on/off
3. Set auto-scan schedule (optional)
4. Click **Start Scan**
5. View results in the Scan tab
6. Export to your preferred format

## Keyboard Shortcuts

| Action | Result |
|--------|--------|
| High intent posts | Green highlight |
| Medium intent posts | Yellow highlight |
| AI analyzed | Shows score & problem |

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :3002

# Kill existing process
kill $(lsof -t -i:3002)
```

### Extension not loading
- Enable Developer mode in Chrome
- Check for errors at `chrome://extensions/`

### Notion export failing
- Verify server is running (green dot in UI)
- Check database has all required properties
- Ensure database is shared with integration

## Files

```
pain-point-scanner-ext/
├── manifest.json      # Extension manifest (MV3)
├── popup.html         # Main UI
├── popup.js           # All logic
├── background.js      # Service worker
├── content.js         # Reddit overlay
├── styles.css        # Styling
├── server.js         # Local proxy server
├── launch.sh         # Linux/Mac launcher
├── launch.bat        # Windows launcher
├── README.md         # This file
├── make.md          # Full documentation
└── changelog.md     # Version history
```

## License

MIT

---

Built with OpenRouter AI
