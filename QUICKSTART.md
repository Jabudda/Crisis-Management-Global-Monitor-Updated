# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
pip3 install -r requirements.txt
```

### 2. Run the Scraper
```bash
python3 scraper/main.py
```

This will:
- Fetch news from 5 major sources (BBC, Al Jazeera, CNN, Guardian, Reuters)
- Rank events by severity
- Save results to `data/events.json`

### 3. View the Dashboard Locally
Option A — minimal static server:
```bash
cd docs
python3 -m http.server 8000
```
Open: http://localhost:8000

Option B — full local site + proxy (recommended for market data widgets):
```bash
bash scripts/run_local.sh
```
Open: http://localhost:8000/docs/ (proxy: http://localhost:8001/health)

### 4. Deploy to GitHub Pages

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

Quick version:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages in Settings → Pages → Deploy from `/docs` folder.

## 📊 What You'll See

The dashboard shows:
- **Total events** fetched
- **Severity breakdown** (Critical, High, Medium, Low)
- **Event cards** with titles, descriptions, and links
- **Filters** to view specific severity levels
- **Auto-refresh** indicator

## ⚙️ Customization

### Add Your Own News Sources

Edit `config/sources.json`:
```json
{
  "name": "Your Source",
  "type": "rss",
  "url": "https://example.com/rss",
  "enabled": true
}
```

### Adjust Severity Keywords

Edit `config/severity_rules.json` to customize what makes an event "Critical" vs "Low".

### Change Update Frequency

Edit `.github/workflows/scrape.yml` to run more/less frequently.

### Override Scraper User-Agent (advanced)

Some sources are sensitive to the `User-Agent`. You can override it via environment variable:
```bash
export CRISIS_SCRAPER_UA="YourAgent/1.0"
python3 scraper/main.py
```

## 🎯 Current Status

✅ Scraper is working  
✅ 80 events fetched successfully  
✅ Data saved to JSON  
✅ Website ready to deploy  
✅ GitHub Actions configured  

## 📚 More Information

- [Configuration Guide](CONFIGURATION.md) - Customize severity rules and sources
- [Deployment Guide](DEPLOYMENT.md) - Deploy to GitHub Pages
- [README.md](README.md) - Full project documentation
