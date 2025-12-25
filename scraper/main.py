#!/usr/bin/env python3
"""
Main scraper script for Crisis Management Web Scraper
Fetches news from multiple sources, ranks by severity, and saves to JSON
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from fetcher import NewsFetcher
from ranker import SeverityRanker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config(config_path):
    """Load configuration from JSON file"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {config_path}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file: {e}")
        raise


def save_events(events, output_path, extra: dict | None = None):
    """Save events to JSON file with timestamp"""
    data = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "event_count": len(events),
        "events": events
    }
    if extra:
        data.update(extra)
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(events)} events to {output_path}")


def main():
    """Main execution function"""
    logger.info("Starting Crisis Management Web Scraper")
    
    # Define paths
    base_path = Path(__file__).parent.parent
    sources_config = base_path / "config" / "sources.json"
    severity_config = base_path / "config" / "severity_rules.json"
    output_path = base_path / "data" / "events.json"
    
    try:
        # Load configurations
        sources = load_config(sources_config)
        severity_rules = load_config(severity_config)
        
        # Fetch news from all sources
        fetcher = NewsFetcher(sources)
        raw_events = fetcher.fetch_all()
        logger.info(f"Fetched {len(raw_events)} events from {len(sources.get('sources', []))} sources")
        
        # Rank events by severity
        ranker = SeverityRanker(severity_rules)
        ranked_events = ranker.rank_events(raw_events)
        logger.info(f"Ranked {len(ranked_events)} events")
        
        # Save to JSON, include ticker config for frontend
        extra = {"ticker_config": severity_rules.get("ticker", {})}
        save_events(ranked_events, output_path, extra)
        
        logger.info("Scraping completed successfully")
        
    except Exception as e:
        logger.error(f"Scraping failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
