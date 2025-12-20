# Crisis Management Web Scraper

A web scraper that monitors current events from multiple news sources, ranks them by severity, and displays them on a GitHub Pages website.

## Features

- 🔍 **Multi-Source Scraping**: Fetches news from RSS feeds and APIs
- 📊 **Severity Ranking**: Automatically ranks events by crisis level
- 🌐 **Live Website**: Displays results on GitHub Pages
- ⚡ **Automated Updates**: GitHub Actions runs scraper automatically
- 📱 **Responsive Design**: Mobile-friendly interface

## Severity Criteria

Events are ranked based on:
1. **Keywords**: disaster, crisis, emergency, fatal, casualties
2. **Geographic Scope**: local, regional, national, global
3. **Impact Level**: affected population, economic impact
4. **Urgency**: breaking news vs. ongoing situations

## Setup

### Prerequisites
- Python 3.9 or higher
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/crisis-management-scraper.git
cd crisis-management-scraper
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure news sources in `config/sources.json`

4. Run the scraper:
```bash
python scraper/main.py
```

## GitHub Pages Deployment

1. Enable GitHub Pages in repository settings
2. Set source to the `docs/` folder
3. GitHub Actions will automatically update the site

## Configuration

Edit `config/sources.json` to add or remove news sources:

```json
{
  "sources": [
    {
      "name": "Example News",
      "type": "rss",
      "url": "https://example.com/rss",
      "enabled": true
    }
  ]
}
```

Edit `config/severity_rules.json` to customize ranking criteria.

## Project Structure

```
.
├── scraper/              # Python scraping modules
│   ├── main.py          # Main scraper script
│   ├── fetcher.py       # News fetching logic
│   └── ranker.py        # Severity ranking algorithm
├── docs/                # GitHub Pages website
│   ├── index.html       # Main webpage
│   ├── styles.css       # Styling
│   └── app.js           # Frontend logic
├── config/              # Configuration files
│   ├── sources.json     # News sources
│   └── severity_rules.json  # Ranking criteria
├── data/                # Generated data files
│   └── events.json      # Latest events data
└── .github/workflows/   # GitHub Actions
    └── scrape.yml       # Automated scraping workflow

```

## License

MIT License

## Contributing

Pull requests are welcome! Please ensure code follows PEP 8 standards.
