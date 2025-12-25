"""
Severity ranking module
Analyzes events and assigns severity scores
"""

import logging
import re
from typing import List, Dict

logger = logging.getLogger(__name__)


class SeverityRanker:
    """Ranks events by severity using configurable rules"""
    
    def __init__(self, config: Dict):
        """
        Initialize ranker with severity rules
        
        Args:
            config: Configuration dictionary with severity rules
        """
        self.keywords = config.get('keywords', {})
        self.geographic_scope = config.get('geographic_scope', {})
        self.default_score = config.get('default_score', 1)
        self.ticker = config.get('ticker', {})
    
    def calculate_severity(self, event: Dict) -> int:
        """
        Calculate severity score for an event
        
        Args:
            event: Event dictionary
            
        Returns:
            Severity score (higher = more severe)
        """
        score = self.default_score
        text = f"{event.get('title', '')} {event.get('description', '')}".lower()
        
        # Score based on keywords
        for category, keywords in self.keywords.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    weight = self._get_keyword_weight(category)
                    score += weight
                    logger.debug(f"Keyword '{keyword}' ({category}) found, +{weight} score")
        
        # Score based on geographic scope
        for scope, keywords in self.geographic_scope.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    weight = self._get_scope_weight(scope)
                    score += weight
                    logger.debug(f"Scope '{keyword}' ({scope}) found, +{weight} score")
        
        # Check for numbers indicating casualties or impact
        casualty_score = self._analyze_casualties(text)
        score += casualty_score
        
        return score
    
    def _get_keyword_weight(self, category: str) -> int:
        """Get weight for keyword category"""
        weights = {
            'critical': 10,
            'high': 7,
            'medium': 4,
            'low': 2
        }
        return weights.get(category, 1)
    
    def _get_scope_weight(self, scope: str) -> int:
        """Get weight for geographic scope"""
        weights = {
            'global': 8,
            'national': 5,
            'regional': 3,
            'local': 1
        }
        return weights.get(scope, 1)
    
    def _analyze_casualties(self, text: str) -> int:
        """
        Analyze text for casualty numbers
        
        Args:
            text: Text to analyze
            
        Returns:
            Additional score based on casualties
        """
        score = 0
        
        # Look for death/casualty patterns
        patterns = [
            r'(\d+)\s*(?:dead|killed|deaths|casualties|fatalities)',
            r'(?:dead|killed|deaths):\s*(\d+)',
            r'death toll:?\s*(\d+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    count = int(match)
                    if count > 100:
                        score += 10
                    elif count > 50:
                        score += 7
                    elif count > 10:
                        score += 5
                    elif count > 0:
                        score += 3
                except ValueError:
                    continue
        
        return score
    
    def rank_events(self, events: List[Dict]) -> List[Dict]:
        """
        Rank all events by severity
        
        Args:
            events: List of event dictionaries
            
        Returns:
            Sorted list of events with severity scores
        """
        logger.info(f"Ranking {len(events)} events")
        
        # Calculate severity for each event
        for event in events:
            event['severity_score'] = self.calculate_severity(event)
            event['severity_level'] = self._get_severity_level(event['severity_score'])
            # Add ticker flags if applicable
            self._apply_ticker_flags(event)
        
        # Sort by severity (highest first)
        ranked_events = sorted(events, key=lambda x: x['severity_score'], reverse=True)
        
        logger.info(f"Ranking complete. Highest score: {ranked_events[0]['severity_score'] if ranked_events else 0}")
        
        return ranked_events

    def _apply_ticker_flags(self, event: Dict) -> None:
        """Determine if event belongs in ticker and annotate flags"""
        cfg = self.ticker.get('categories', {})
        text = f"{event.get('title', '')} {event.get('description', '')}".lower()

        category = None
        emoji = ''

        # Airline disasters
        air = cfg.get('airline_disaster', {})
        if air:
            if self._has_any(text, air.get('keywords_any', [])) and (
                self._has_any(text, air.get('context_any', []))
            ):
                category, emoji = 'airline_disaster', air.get('emoji', '✈️')

        # Natural disasters
        if not category:
            nd = cfg.get('natural_disaster', {})
            if nd and self._has_any(text, nd.get('keywords_any', [])):
                category, emoji = 'natural_disaster', nd.get('emoji', '🌪️')

        # War
        if not category:
            war = cfg.get('war', {})
            if war and self._has_any(text, war.get('keywords_any', [])):
                category, emoji = 'war', war.get('emoji', '🪖')

        # Terrorism
        if not category:
            ter = cfg.get('terrorism', {})
            if ter and self._has_any(text, ter.get('keywords_any', [])):
                category, emoji = 'terrorism', ter.get('emoji', '💥')

        # Active shooter
        if not category:
            act = cfg.get('active_shooter', {})
            if act and self._has_any(text, act.get('keywords_any', [])):
                category, emoji = 'active_shooter', act.get('emoji', '🚨')

        # Mass casualty
        if not category:
            mc = cfg.get('mass_casualty', {})
            if mc:
                if self._has_any(text, mc.get('keywords_any', [])) or self._has_casualty_threshold(text, mc.get('casualty_threshold', 10)):
                    category, emoji = 'mass_casualty', mc.get('emoji', '🚑')

        # Stock swings
        if not category:
            ss = cfg.get('stock_swing', {})
            if ss:
                if self._has_any(text, ss.get('finance_keywords', [])) and self._has_percent_threshold(text, ss.get('percent_threshold', 50)):
                    category, emoji = 'stock_swing', ss.get('emoji', '📈')

        event['is_ticker'] = category is not None
        if category:
            event['ticker_category'] = category
            event['ticker_emoji'] = emoji
            event['ticker_label'] = f"{emoji} {event.get('title', '')}"

    def _has_any(self, text: str, words: List[str]) -> bool:
        return any(w.lower() in text for w in words)

    def _has_percent_threshold(self, text: str, threshold: int) -> bool:
        import re
        for m in re.finditer(r"(-?\d{1,3})\s*%", text):
            try:
                val = abs(int(m.group(1)))
                if val >= threshold:
                    return True
            except ValueError:
                continue
        return False

    def _has_casualty_threshold(self, text: str, threshold: int) -> bool:
        import re
        for m in re.finditer(r"(?:dead|killed|deaths|casualties|fatalities)\s*:?\s*(\d+)", text):
            try:
                val = int(m.group(1))
                if val >= threshold:
                    return True
            except ValueError:
                continue
        return False
    
    def _get_severity_level(self, score: int) -> str:
        """
        Convert numeric score to severity level label
        
        Args:
            score: Numeric severity score
            
        Returns:
            Severity level string
        """
        if score >= 20:
            return "Critical"
        elif score >= 10:
            return "High"
        elif score >= 5:
            return "Medium"
        else:
            return "Low"
