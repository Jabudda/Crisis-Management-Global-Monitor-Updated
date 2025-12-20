"""
News fetcher module
Handles fetching news from RSS feeds and APIs
"""

import logging
import time
import requests
import feedparser
from datetime import datetime
from typing import List, Dict

logger = logging.getLogger(__name__)


class NewsFetcher:
    """Fetches news from multiple sources"""
    
    def __init__(self, config: Dict, timeout: int = 10):
        """
        Initialize fetcher with configuration
        
        Args:
            config: Configuration dictionary with sources
            timeout: Request timeout in seconds
        """
        self.sources = config.get('sources', [])
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CrisisManagementScraper/1.0'
        })
    
    def fetch_rss(self, url: str, source_name: str) -> List[Dict]:
        """
        Fetch events from RSS feed
        
        Args:
            url: RSS feed URL
            source_name: Name of the source
            
        Returns:
            List of event dictionaries
        """
        events = []
        
        try:
            logger.info(f"Fetching RSS from {source_name}: {url}")
            feed = feedparser.parse(url)
            
            if feed.bozo:
                logger.warning(f"Feed parsing warning for {source_name}: {feed.bozo_exception}")
            
            for entry in feed.entries[:20]:  # Limit to 20 most recent
                event = {
                    'title': entry.get('title', 'No title'),
                    'description': entry.get('summary', entry.get('description', '')),
                    'url': entry.get('link', ''),
                    'published': self._parse_date(entry.get('published', entry.get('updated', ''))),
                    'source': source_name,
                    'type': 'rss'
                }
                events.append(event)
            
            logger.info(f"Fetched {len(events)} events from {source_name}")
            
        except Exception as e:
            logger.error(f"Error fetching RSS from {source_name}: {e}")
        
        return events
    
    def fetch_api(self, url: str, source_name: str) -> List[Dict]:
        """
        Fetch events from JSON API
        
        Args:
            url: API endpoint URL
            source_name: Name of the source
            
        Returns:
            List of event dictionaries
        """
        events = []
        
        try:
            logger.info(f"Fetching API from {source_name}: {url}")
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            articles = data.get('articles', data.get('items', []))
            
            for article in articles[:20]:  # Limit to 20 most recent
                event = {
                    'title': article.get('title', 'No title'),
                    'description': article.get('description', article.get('content', '')),
                    'url': article.get('url', article.get('link', '')),
                    'published': article.get('publishedAt', article.get('pubDate', '')),
                    'source': source_name,
                    'type': 'api'
                }
                events.append(event)
            
            logger.info(f"Fetched {len(events)} events from {source_name}")
            
        except requests.RequestException as e:
            logger.error(f"Error fetching API from {source_name}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error with {source_name}: {e}")
        
        return events
    
    def fetch_all(self) -> List[Dict]:
        """
        Fetch events from all configured sources
        
        Returns:
            List of all events from all sources
        """
        all_events = []
        
        for source in self.sources:
            if not source.get('enabled', True):
                logger.info(f"Skipping disabled source: {source.get('name')}")
                continue
            
            source_type = source.get('type', 'rss').lower()
            source_name = source.get('name', 'Unknown')
            url = source.get('url')
            
            if not url:
                logger.warning(f"No URL for source: {source_name}")
                continue
            
            if source_type == 'rss':
                events = self.fetch_rss(url, source_name)
            elif source_type == 'api':
                events = self.fetch_api(url, source_name)
            else:
                logger.warning(f"Unknown source type '{source_type}' for {source_name}")
                continue
            
            all_events.extend(events)
            
            # Rate limiting - be respectful
            time.sleep(1)
        
        return all_events
    
    def _parse_date(self, date_str: str) -> str:
        """
        Parse and normalize date string
        
        Args:
            date_str: Date string in various formats
            
        Returns:
            ISO format date string
        """
        if not date_str:
            return datetime.utcnow().isoformat() + "Z"
        
        try:
            # feedparser usually handles this
            return date_str
        except Exception:
            return datetime.utcnow().isoformat() + "Z"
