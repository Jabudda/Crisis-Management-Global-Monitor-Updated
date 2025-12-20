# Deployment Guide

## Setting Up GitHub Pages

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Select **main** branch and **/docs** folder
   - Click **Save**

3. **Configure GitHub Actions**:
   - Go to **Settings** → **Actions** → **General**
   - Under **Workflow permissions**, enable:
     - ✅ Read and write permissions
     - ✅ Allow GitHub Actions to create and approve pull requests
   - Click **Save**

4. **Your site will be live at**:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

## Manual Testing

Before deploying, test locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the scraper
python scraper/main.py

# Check the output
cat data/events.json

# Test the website locally
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

## Triggering Updates

The scraper runs automatically every hour via GitHub Actions. You can also:

- **Manual trigger**: Go to **Actions** → **Scrape Crisis Events** → **Run workflow**
- **Push changes**: Any push to `main` branch with changes to `scraper/` or `config/`

## Troubleshooting

### Actions not running
- Check that GitHub Actions is enabled in repository settings
- Verify workflow permissions are set correctly

### Data not updating
- Check the Actions tab for error logs
- Ensure `data/events.json` is being committed

### Website not loading data
- Check that `data/events.json` exists and is valid JSON
- Verify the path in `docs/app.js` matches your repository structure
- Update `dataUrl` if needed:
  ```javascript
  this.dataUrl = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/data/events.json';
  ```

## Customization

### Adding News Sources

Edit `config/sources.json`:

```json
{
  "name": "Your News Source",
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "enabled": true
}
```

### Adjusting Severity Rules

Edit `config/severity_rules.json` to add keywords or adjust weights.

### Changing Update Frequency

Edit `.github/workflows/scrape.yml`:

```yaml
schedule:
  # Every 2 hours
  - cron: '0 */2 * * *'
```

Cron syntax: `minute hour day month weekday`
