# Crisis Management Web Scraper - GitHub Copilot Instructions

## Project Overview
A web scraper that monitors current events from multiple news sources, ranks them by severity, and displays them on a GitHub Pages website.

## Tech Stack
- **Backend**: Python 3.9+ (web scraping)
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Data Storage**: JSON files
- **Automation**: GitHub Actions
- **Hosting**: GitHub Pages

## Project Structure
- `scraper/` - Python web scraping modules
- `docs/` - GitHub Pages website files
- `.github/workflows/` - CI/CD automation
- `config/` - Configuration files
- `data/` - Generated JSON data files

## Development Guidelines
- Follow PEP 8 for Python code
- Use semantic HTML5 elements
- Implement responsive design (mobile-first)
- Handle errors gracefully with proper logging
- Respect rate limits when scraping
- Use environment variables for sensitive data

## Severity Ranking Criteria
Events are ranked based on:
1. **Keywords**: disaster, crisis, emergency, fatal, etc.
2. **Geographic scope**: local, regional, national, global
3. **Impact level**: casualties, economic impact, population affected
4. **Urgency**: breaking news vs. ongoing situations
