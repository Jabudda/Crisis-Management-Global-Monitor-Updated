// Crisis Management Dashboard - Frontend Application

class CrisisDashboard {
    constructor() {
        this.events = [];
        this.currentFilter = 'all';
        this.dataUrl = '../data/events.json';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadEvents();
    }

    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.level);
                
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    async loadEvents() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const eventsEl = document.getElementById('events');

        try {
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';
            eventsEl.innerHTML = '';

            const response = await fetch(this.dataUrl);
            
            if (!response.ok) {
                throw new Error('Failed to load events');
            }

            const data = await response.json();
            this.events = data.events || [];
            
            // Update last updated time
            this.updateLastUpdated(data.last_updated);
            
            // Update statistics
            this.updateStats();
            
            // Render events
            this.renderEvents();

            loadingEl.style.display = 'none';

        } catch (error) {
            console.error('Error loading events:', error);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
        }
    }

    updateLastUpdated(timestamp) {
        const updateTimeEl = document.getElementById('updateTime');
        if (timestamp) {
            const date = new Date(timestamp);
            updateTimeEl.textContent = date.toLocaleString();
        }
    }

    updateStats() {
        const stats = {
            total: this.events.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        this.events.forEach(event => {
            const level = event.severity_level.toLowerCase();
            if (stats.hasOwnProperty(level)) {
                stats[level]++;
            }
        });

        document.getElementById('totalEvents').textContent = stats.total;
        document.getElementById('criticalCount').textContent = stats.critical;
        document.getElementById('highCount').textContent = stats.high;
        document.getElementById('mediumCount').textContent = stats.medium;
    }

    handleFilterChange(level) {
        this.currentFilter = level;
        this.renderEvents();
    }

    renderEvents() {
        const eventsEl = document.getElementById('events');
        const noEventsEl = document.getElementById('noEvents');
        
        // Filter events
        let filteredEvents = this.events;
        if (this.currentFilter !== 'all') {
            filteredEvents = this.events.filter(
                event => event.severity_level === this.currentFilter
            );
        }

        // Show/hide no events message
        if (filteredEvents.length === 0) {
            eventsEl.style.display = 'none';
            noEventsEl.style.display = 'block';
            return;
        } else {
            eventsEl.style.display = 'grid';
            noEventsEl.style.display = 'none';
        }

        // Render event cards
        eventsEl.innerHTML = filteredEvents.map(event => this.createEventCard(event)).join('');
    }

    createEventCard(event) {
        const severityClass = event.severity_level.toLowerCase();
        const description = this.truncateText(event.description, 200);
        const publishedDate = this.formatDate(event.published);

        return `
            <div class="event-card ${severityClass}">
                <div class="event-header">
                    <h2 class="event-title">
                        <a href="${this.escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer">
                            ${this.escapeHtml(event.title)}
                        </a>
                    </h2>
                    <span class="severity-badge ${severityClass}">
                        ${event.severity_level}
                    </span>
                </div>
                <p class="event-description">${this.escapeHtml(description)}</p>
                <div class="event-meta">
                    <span class="event-source">
                        📰 ${this.escapeHtml(event.source)}
                    </span>
                    <span class="event-date">
                        🕒 ${publishedDate}
                    </span>
                    <span class="score">
                        Score: ${event.severity_score}
                    </span>
                </div>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        if (!text) return 'No description available.';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffHours < 1) {
                return 'Just now';
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'Unknown date';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CrisisDashboard();
    });
} else {
    new CrisisDashboard();
}
