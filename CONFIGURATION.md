# Configuration Guide

## News Sources Configuration

The file `config/sources.json` defines where the scraper fetches news from.

### Source Types

#### RSS Feeds
```json
{
  "name": "Example RSS",
  "type": "rss",
  "url": "https://example.com/rss.xml",
  "enabled": true
}
```

#### JSON APIs
```json
{
  "name": "Example API",
  "type": "api",
  "url": "https://api.example.com/news",
  "enabled": true
}
```

### Finding RSS Feeds

Most news websites provide RSS feeds. Look for:
- `/rss` or `/feed` URLs
- Orange RSS icons on websites
- Site footer links to "RSS" or "Feeds"

### Popular News RSS Feeds

- **BBC**: `http://feeds.bbci.co.uk/news/world/rss.xml`
- **Reuters**: `https://www.reuters.com/rssfeed/world`
- **Al Jazeera**: `https://www.aljazeera.com/xml/rss/all.xml`
- **The Guardian**: `https://www.theguardian.com/world/rss`
- **NPR**: `https://feeds.npr.org/1001/rss.xml`

## Severity Rules Configuration

The file `config/severity_rules.json` controls how events are ranked.

### Keyword Categories

Keywords are grouped by importance:

- **Critical** (weight: 10): Disasters, catastrophes, major emergencies
- **High** (weight: 7): Crises, deaths, attacks, conflicts
- **Medium** (weight: 4): Protests, accidents, alerts
- **Low** (weight: 2): Concerns, debates, announcements

### Geographic Scope

Events affecting larger areas get higher scores:

- **Global** (weight: 8): Worldwide events
- **National** (weight: 5): Country-level events
- **Regional** (weight: 3): State/province events
- **Local** (weight: 1): City-level events

### Casualty Analysis

The ranker automatically detects casualty numbers:

- 100+ casualties: +10 points
- 50-99 casualties: +7 points
- 10-49 casualties: +5 points
- 1-9 casualties: +3 points

### Severity Levels

Final scores are converted to levels:

- **Critical**: Score ≥ 20
- **High**: Score ≥ 10
- **Medium**: Score ≥ 5
- **Low**: Score < 5

### Example Configuration

```json
{
  "default_score": 1,
  "keywords": {
    "critical": ["disaster", "catastrophe", "pandemic"],
    "high": ["crisis", "fatal", "attack"],
    "medium": ["protest", "accident", "alert"],
    "low": ["concern", "debate", "report"]
  },
  "geographic_scope": {
    "global": ["global", "worldwide", "international"],
    "national": ["national", "nationwide", "country"],
    "regional": ["regional", "state", "province"],
    "local": ["local", "city", "town"]
  }
}
```

## Customization Tips

1. **Be specific**: Add keywords relevant to your area of interest
2. **Avoid overlap**: Don't repeat keywords across categories
3. **Test changes**: Run the scraper manually to verify scoring
4. **Balance weights**: Adjust if too many/few events are marked critical
