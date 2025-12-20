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
        
        # Sort by severity (highest first)
        ranked_events = sorted(events, key=lambda x: x['severity_score'], reverse=True)
        
        logger.info(f"Ranking complete. Highest score: {ranked_events[0]['severity_score'] if ranked_events else 0}")
        
        return ranked_events
    
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
