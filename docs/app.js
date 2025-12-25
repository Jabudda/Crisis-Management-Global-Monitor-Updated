// Crisis Management Dashboard - Frontend Application
console.log('[CrisisDashboard] version local-2025-12-24');

class CrisisDashboard {
    constructor() {
        this.events = [];
        this.currentFilter = 'all';
        // Crisis Management Dashboard - Simplified Frontend
        console.log('[CrisisDashboard] simplified version 2025-12-24');

        class CrisisDashboard {
            constructor() {
                this.events = [];
                this.currentFilter = 'all';
                // Prefer local data file; remote fallback kept for prod
                this.dataUrl = 'events.json';
                const saved = this._loadTickerDuration();
                this.tickerDuration = saved ?? 100; // seconds
                this.lastEventLoadAttempts = [];
                this.init();
            }

            async init() {
                this.setupEventListeners();
                await this.loadEvents();
                this.renderDiagnostics();
            }

            setupEventListeners() {
                const filterButtons = document.querySelectorAll('.filter-btn');
                filterButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const target = e.currentTarget;
                        const level = target && target.dataset ? target.dataset.level : 'all';
                        this.handleFilterChange(level);
                        filterButtons.forEach(b => b.classList.remove('active'));
                        target.classList.add('active');
                    });
                });

                const controls = document.getElementById('tickerControls');
                if (controls) {
                    controls.addEventListener('click', (e) => {
                        const target = e.target;
                        if (!(target instanceof HTMLElement)) return;
                        const action = target.dataset.action;
                        if (action === 'slower') this.adjustTickerSpeed(1);
                        else if (action === 'faster') this.adjustTickerSpeed(-1);
                        else if (action === 'reset') this.resetTickerSpeed();
                    });
                }
            }

            async loadEvents() {
                const loadingEl = document.getElementById('loading');
                const errorEl = document.getElementById('error');
                const eventsEl = document.getElementById('events');
                let attempts = [];
                try {
                    loadingEl.style.display = 'block';
                    errorEl.style.display = 'none';
                    eventsEl.innerHTML = '';
                    let data = null;
                    const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
                    const urls = [this.dataUrl];
                    try {
                        const params = new URLSearchParams(window.location.search);
                        if (params.get('simulateError') === '1') urls.splice(0, urls.length, '/missing.json');
                    } catch (_) {}
                    for (const url of urls) {
                        try {
                            const response = await this.fetchWithTimeout(url, 6000);
                            if (response && response.ok) {
                                const text = await response.text();
                                let json = null;
                                try { json = JSON.parse(text); } catch {}
                                if (json && json.contents) {
                                    try { data = JSON.parse(json.contents); } catch { data = null; }
                                } else {
                                    data = json;
                                }
                                if (data) { attempts.push({ url, ok: true }); break; }
                                attempts.push({ url, ok: false, status: response.status || 'bad-json' });
                            } else {
                                attempts.push({ url, ok: false, status: (response && response.status) || 'timeout' });
                            }
                        } catch (e) {
                            attempts.push({ url, ok: false, error: String(e) });
                        }
                    }
                    if (!data) {
                        const msg = attempts.map(a => `• ${a.url} → ${a.ok ? 'OK' : (a.status ? 'HTTP '+a.status : a.error || 'error')}`).join('\n');
                        const err = new Error('Failed to load events. Attempts:\n' + msg);
                        err.attempts = attempts;
                        throw err;
                    }
                    this.lastEventLoadAttempts = attempts;
                    this.events = data.events || [];
                    this.tickerConfig = data.ticker_config || { freshness_hours: 72, max_items: 20 };
                    this.updateLastUpdated(data.last_updated);
                    this.updateStats();
                    this.renderEvents();
                    this.renderTicker();
                    loadingEl.style.display = 'none';
                    this.renderDiagnostics();
                    this.renderStatusBadge();
                } catch (error) {
                    console.error('Error loading events:', error);
                    loadingEl.style.display = 'none';
                    errorEl.style.display = 'block';
                    this.showErrorBanner(error, attempts);
                    this.lastEventLoadAttempts = attempts;
                    try {
                        this.events = [];
                        this.updateStats();
                        this.renderEvents();
                        this.renderTicker();
                    } catch (_) {}
                    this.renderDiagnostics();
                    this.renderStatusBadge();
                }
            }

            updateLastUpdated(timestamp) {
                const updateTimeEl = document.getElementById('updateTime');
                if (timestamp) updateTimeEl.textContent = new Date(timestamp).toLocaleString();
            }

            updateStats() {
                const stats = { total: this.events.length, critical: 0, high: 0, medium: 0, low: 0 };
                this.events.forEach(event => {
                    const level = (event.severity_level || '').toLowerCase();
                    if (stats.hasOwnProperty(level)) stats[level]++;
                });
                document.getElementById('totalEvents').textContent = stats.total;
                document.getElementById('criticalCount').textContent = stats.critical;
                document.getElementById('highCount').textContent = stats.high;
                document.getElementById('mediumCount').textContent = stats.medium;
            }

            handleFilterChange(level) { this.currentFilter = level; this.renderEvents(); }

            renderEvents() {
                const eventsEl = document.getElementById('events');
                const noEventsEl = document.getElementById('noEvents');
                let filteredEvents = this.events;
                if (this.currentFilter !== 'all') filteredEvents = this.events.filter(e => e.severity_level === this.currentFilter);
                if (!filteredEvents.length) { eventsEl.style.display = 'none'; noEventsEl.style.display = 'block'; return; }
                eventsEl.style.display = 'grid'; noEventsEl.style.display = 'none';
                eventsEl.innerHTML = filteredEvents.map(event => this.createEventCard(event)).join('');
            }

            createEventCard(event) {
                const severityClass = (event.severity_level || 'Low').toLowerCase();
                const description = this.truncateText(event.description || '', 200);
                const publishedDate = this.formatDate(event.published);
                return `
                    <div class="event-card ${severityClass}">
                        <div class="event-header">
                            <h2 class="event-title"><a href="${this.escapeHtml(event.url || '#')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(event.title || 'Untitled')}</a></h2>
                            <span class="severity-badge ${severityClass}">${event.severity_level || 'Low'}</span>
                        </div>
                        <p class="event-description">${this.escapeHtml(description)}</p>
                        <div class="event-meta">
                            <span class="event-source">📰 ${this.escapeHtml(event.source || '')}</span>
                            <span class="event-date">🕒 ${publishedDate}</span>
                            <span class="score">Score: ${event.severity_score ?? 0}</span>
                        </div>
                    </div>`;
            }

            truncateText(text, maxLength) { if (!text) return 'No description available.'; return text.length <= maxLength ? text : text.substring(0, maxLength).trim() + '...'; }

            formatDate(dateString) {
                if (!dateString) return 'Unknown date';
                try {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    if (diffHours < 1) return 'Just now';
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString();
                } catch { return 'Unknown date'; }
            }

            escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

            renderTicker() {
                const bar = document.getElementById('ticker');
                const track = document.getElementById('tickerTrack');
                if (!bar || !track) return;
                const items = this.getTickerItems(this.events);
                if (!items.length) { bar.style.display = 'none'; document.body.classList.remove('ticker-active'); track.innerHTML = ''; return; }
                bar.style.display = 'block'; document.body.classList.add('ticker-active');
                const html = items.map(i => `<span class="ticker-item"><a href="${this.escapeHtml(i.url || '#')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(i.label || '')}</a><span class="ticker-sep">•</span></span>`).join('');
                track.innerHTML = html + html;
                track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`);
                const label = document.getElementById('tickerSpeedLabel'); if (label) label.textContent = `Speed: ${this.tickerDuration}s`;
            }

            getTickerItems(events) {
                const maxItems = this.tickerConfig?.max_items ?? 20;
                const freshnessHours = this.tickerConfig?.freshness_hours ?? 72;
                const now = Date.now(); const seen = new Set(); const items = [];
                const isFresh = (published) => { const t = Date.parse(published || 0) || 0; const ageHours = (now - t) / (1000 * 60 * 60); return !published || Number.isNaN(t) || ageHours <= freshnessHours; };
                for (const e of events) {
                    if (!isFresh(e.published)) continue;
                    let label = e.ticker_label || null; let category = e.ticker_category || null; const url = e.url;
                    const text = `${e.title || ''} ${e.description || ''}`.toLowerCase();
                    if (!label || !category) {
                        if (this.isAirlineDisaster(text)) { label = `✈️ ${e.title}`; category = 'airline_disaster'; }
                        else if (this.isNaturalDisaster(text)) { label = `🌪️ ${e.title}`; category = 'natural_disaster'; }
                        else if (this.isWar(text)) { label = `🪖 ${e.title}`; category = 'war'; }
                        else if (this.isTerrorism(text)) { label = `💥 ${e.title}`; category = 'terrorism'; }
                        else if (this.isActiveShooter(text)) { label = `🚨 ${e.title}`; category = 'active_shooter'; }
                        else if (this.isMassCasualty(text, 10)) { label = `🚑 ${e.title}`; category = 'mass_casualty'; }
                        else if (this.isStockSwing(text, 50)) { label = `📈 ${e.title}`; category = 'stock_swing'; }
                    }
                    if (label) {
                        if (category === 'stock_swing') { const t = Date.parse(e.published || 0) || 0; const ageHours = (Date.now() - t) / (1000 * 60 * 60); if (!(ageHours <= 12)) continue; }
                        const key = label.toLowerCase().replace(/\s+/g, ' ').trim(); if (seen.has(key)) continue; seen.add(key);
                        items.push({ label, url }); if (items.length >= maxItems) break;
                    }
                }
                return items;
            }

            isAirlineDisaster(text) { const hasAviation = /(airline|aircraft|flight|plane|jet|aviation|airport)\b/.test(text); const hasCrash = /(crash|downed|mid-?air|collision|fell|plunged)/.test(text); const hasSevere = /(fatal|fatalities|killed|dead|emergency landing)/.test(text); return hasAviation && (hasCrash || hasSevere); }
            isNaturalDisaster(text) { return /(earthquake|tremor|tsunami|hurricane|cyclone|typhoon|tornado|wildfire|bushfire|wild fire|flood|landslide|mudslide|volcano|eruption|storm)\b/.test(text); }
            isWar(text) { return /(war|invasion|frontline|airstrike|strike|missile|shelling|bombardment|offensive|counteroffensive|ceasefire)\b/.test(text); }
            isTerrorism(text) { return /(terror|terrorist|bomb|bombing|suicide bomber|ied|extremist attack)\b/.test(text); }
            isActiveShooter(text) { return /(shooting|shooter|gunman|shots? fired|mass shooting)\b/.test(text); }
            isMassCasualty(text, threshold = 10) { const hasWords = /(mass casualty|death toll|multiple fatalities)\b/.test(text); const re = /(?:dead|killed|deaths|casualties|fatalities)\s*:?\s*(\d+)/g; let high = false, m; while ((m = re.exec(text)) !== null) { const n = parseInt(m[1], 10); if (!Number.isNaN(n) && n >= threshold) { high = true; break; } } return hasWords || high; }
            isStockSwing(text, threshold = 50) { const hasFinance = /(stock|shares|market|price|ticker|exchange|nasdaq|nyse)\b/.test(text); let swing = false; const re = /(-?\d{1,3})\s*%/g; let m; while ((m = re.exec(text)) !== null) { const pct = Math.abs(parseInt(m[1], 10)); if (!Number.isNaN(pct) && pct >= threshold) { swing = true; break; } } return hasFinance && swing; }

            adjustTickerSpeed(direction) { const steps = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100]; let idx = steps.findIndex(s => s === this.tickerDuration); if (idx === -1) idx = steps.reduce((best, s, i) => Math.abs(s - this.tickerDuration) < Math.abs(steps[best] - this.tickerDuration) ? i : best, 0); const next = Math.max(0, Math.min(steps.length - 1, idx + direction)); this.tickerDuration = steps[next]; const track = document.getElementById('tickerTrack'); if (track) track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`); const label = document.getElementById('tickerSpeedLabel'); if (label) label.textContent = `Speed: ${this.tickerDuration}s`; this._saveTickerDuration(this.tickerDuration); }
            resetTickerSpeed() { this.tickerDuration = 100; const track = document.getElementById('tickerTrack'); if (track) track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`); const label = document.getElementById('tickerSpeedLabel'); if (label) label.textContent = `Speed: ${this.tickerDuration}s`; this._saveTickerDuration(this.tickerDuration); }
            _saveTickerDuration(seconds) { try { localStorage.setItem('tickerDuration', String(seconds)); } catch (_) {} }
            _loadTickerDuration() { try { const v = localStorage.getItem('tickerDuration'); const n = v ? parseInt(v, 10) : NaN; if (!Number.isNaN(n)) return n; } catch (_) {} return null; }

            async fetchWithTimeout(url, ms = 4000) { const controller = new AbortController(); const id = setTimeout(() => controller.abort(), ms); try { const res = await fetch(url, { signal: controller.signal }); return res; } catch { return null; } finally { clearTimeout(id); } }
            showErrorBanner(error, attempts) { const errorEl = document.getElementById('error'); if (!errorEl) return; errorEl.innerHTML = '<p>❌ Unable to load events. Please try again later.</p>'; const banner = document.createElement('div'); banner.className = 'error-banner'; const message = error && error.message ? error.message : 'An unknown error occurred.'; const listItems = (attempts || []).map(a => { const status = a.ok ? 'OK' : (a.status ? `HTTP ${a.status}` : (a.error || 'error')); const href = a.url || ''; return `<li><a class="error-link" href="${href}" target="_blank" rel="noopener">${href}</a> — ${status}</li>`; }).join(''); banner.innerHTML = `<div><strong>Failed to load events.</strong> ${this.escapeHtml(message)}</div>${attempts && attempts.length ? `<ul>${listItems}</ul>` : ''}<div class="error-actions"><button type="button" class="retry-btn" aria-label="Retry loading events">Retry</button></div>`; errorEl.appendChild(banner); const retryBtn = banner.querySelector('.retry-btn'); if (retryBtn) { retryBtn.addEventListener('click', async () => { banner.remove(); errorEl.style.display = 'none'; const loadingEl = document.getElementById('loading'); if (loadingEl) loadingEl.style.display = 'block'; try { await this.loadEvents(); } finally { if (loadingEl) loadingEl.style.display = 'none'; } }); } }
            isLocalEnv() { try { return typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname); } catch (_) { return false; } }
            renderDiagnostics() { try { const box = document.getElementById('diagnostics'); const content = document.getElementById('diagContent'); if (!box || !content) return; const params = new URLSearchParams(window.location.search); const enabled = params.get('debug') === '1'; box.style.display = enabled ? 'block' : 'none'; if (!enabled) return; const isLocal = this.isLocalEnv(); const attemptLines = (this.lastEventLoadAttempts || []).map(a => `${a.ok ? 'OK' : 'ERR'} ${a.status ? '('+a.status+')' : ''} → ${a.url}`); const nowStr = new Date().toLocaleString(); content.innerHTML = [`Time: ${this.escapeHtml(nowStr)}`, `Env: ${isLocal ? 'local' : 'prod-like'}`, `Event load attempts:`, `<ul>${attemptLines.map(l => `<li>${this.escapeHtml(l)}</li>`).join('')}</ul>`].join('<br>'); } catch(_) {} }
            renderStatusBadge() { try { const el = document.getElementById('statusBadge'); if (!el) return; const isLocal = this.isLocalEnv(); const pills = []; pills.push(`<span class="badge-pill"><span class="dot"></span> Env: ${isLocal ? 'local' : 'prod-like'}</span>`); el.innerHTML = pills.join(' '); } catch(_) {} }
        }

        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { new CrisisDashboard(); }); } else { new CrisisDashboard(); }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderTicker() {
        const bar = document.getElementById('ticker');
        const track = document.getElementById('tickerTrack');
        if (!bar || !track) return;

        const items = this.getTickerItems(this.events);
        if (!items.length) {
            bar.style.display = 'none';
            document.body.classList.remove('ticker-active');
            track.innerHTML = '';
            return;
        }

        bar.style.display = 'block';
        document.body.classList.add('ticker-active');
        const html = items.map(i => (
            `<span class="ticker-item"><a href="${this.escapeHtml(i.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(i.label)}</a><span class="ticker-sep">•</span></span>`
        )).join('');
        track.innerHTML = html + html;

        // Apply current speed
        track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`);

        // Update speed label
        const label = document.getElementById('tickerSpeedLabel');
        if (label) {
            label.textContent = `Speed: ${this.tickerDuration}s`;
        }
    }

    getTickerItems(events) {
        const maxItems = this.tickerConfig?.max_items ?? 20;
        const freshnessHours = this.tickerConfig?.freshness_hours ?? 72;
        const now = Date.now();
        const seen = new Set();
        const wlTickers = this.getWatchlistTickers();
        const items = [];

        const isFresh = (published) => {
            if (!published) return true;
            const t = Date.parse(published);
            if (Number.isNaN(t)) return true;
            const ageHours = (now - t) / (1000 * 60 * 60);
            return ageHours <= freshnessHours;
        };

        for (const e of events) {
            if (!isFresh(e.published)) continue;
            let label = e.ticker_label || null;
            let category = e.ticker_category || null;
            const url = e.url;
            const text = `${e.title || ''} ${e.description || ''}`.toLowerCase();

            if (!label || !category) {
                if (this.isAirlineDisaster(text)) { label = `✈️ ${e.title}`; category = 'airline_disaster'; }
                else if (this.isNaturalDisaster(text)) { label = `🌪️ ${e.title}`; category = 'natural_disaster'; }
                else if (this.isWar(text)) { label = `🪖 ${e.title}`; category = 'war'; }
                else if (this.isTerrorism(text)) { label = `💥 ${e.title}`; category = 'terrorism'; }
                else if (this.isActiveShooter(text)) { label = `🚨 ${e.title}`; category = 'active_shooter'; }
                else if (this.isMassCasualty(text, this.thresholds.massCasualty)) { label = `🚑 ${e.title}`; category = 'mass_casualty'; }
                else if (this.isStockSwing(text, this.thresholds.stockPercent)) { label = `📈 ${e.title}`; category = 'stock_swing'; }
            }

            if (label) {
                // Additional freshness constraint for stock price swings: last 12 hours only
                if (category === 'stock_swing') {
                    const t = Date.parse(e.published || 0) || 0;
                    const ageHours = (Date.now() - t) / (1000 * 60 * 60);
                    if (!(ageHours <= 12)) continue;
                }
                if (category === 'stock_swing') {
                    // Exclude watchlist symbols from ticker
                    const combined = `${label} ${e.title || ''} ${e.description || ''}`.toLowerCase();
                    const isWatchlistSymbol = wlTickers.some(tok => new RegExp(`\b${this.escapeRegex(tok.toLowerCase())}\b`, 'i').test(combined));
                    if (isWatchlistSymbol) continue;
                    if (!this.isStockSwing(text, this.thresholds.stockPercent)) continue;
                }
                if (category === 'mass_casualty' && !this.isMassCasualty(text, this.thresholds.massCasualty)) continue;
                const key = label.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seen.has(key)) continue;
                seen.add(key);
                items.push({ label, url });
                if (items.length >= maxItems) break;
            }
        }
        return items;
    }

    isAirlineDisaster(text) {
        const hasAviation = /(airline|aircraft|flight|plane|jet|aviation|airport)\b/.test(text);
        const hasCrash = /(crash|downed|mid-?air|collision|fell|plunged)/.test(text);
        const hasSevere = /(fatal|fatalities|killed|dead|emergency landing)/.test(text);
        return hasAviation && (hasCrash || hasSevere);
    }

    isStockSwing(text, threshold = 50) {
        const hasFinance = /(stock|shares|market|price|ticker|exchange|nasdaq|nyse)\b/.test(text);
        let swing = false;
        const re = /(-?\d{1,3})\s*%/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const pct = Math.abs(parseInt(m[1], 10));
            if (!Number.isNaN(pct) && pct >= threshold) {
                swing = true;
                break;
            }
        }
        return hasFinance && swing;
    }

    adjustTickerSpeed(direction) {
        // direction: +1 to slow down, -1 to speed up
        // Allowed durations in seconds
        const steps = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
        let idx = steps.findIndex(s => s === this.tickerDuration);
        if (idx === -1) {
            // Normalize to nearest step
            idx = steps.reduce((best, s, i) => Math.abs(s - this.tickerDuration) < Math.abs(steps[best] - this.tickerDuration) ? i : best, 0);
        }
        const next = Math.max(0, Math.min(steps.length - 1, idx + direction));
        this.tickerDuration = steps[next];

        const track = document.getElementById('tickerTrack');
        if (track) {
            track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`);
        }

        const label = document.getElementById('tickerSpeedLabel');
        if (label) {
            label.textContent = `Speed: ${this.tickerDuration}s`;
        }

        this._saveTickerDuration(this.tickerDuration);
    }

    resetTickerSpeed() {
        this.tickerDuration = 100;
        const track = document.getElementById('tickerTrack');
        if (track) {
            track.style.setProperty('--ticker-duration', `${this.tickerDuration}s`);
        }
        const label = document.getElementById('tickerSpeedLabel');
        if (label) {
            label.textContent = `Speed: ${this.tickerDuration}s`;
        }
        this._saveTickerDuration(this.tickerDuration);
    }

    _saveTickerDuration(seconds) {
        try {
            localStorage.setItem('tickerDuration', String(seconds));
        } catch (_) {}
    }

    _loadTickerDuration() {
        try {
            const v = localStorage.getItem('tickerDuration');
            const n = v ? parseInt(v, 10) : NaN;
            if (!Number.isNaN(n)) return n;
        } catch (_) {}
        return null;
    }

    isNaturalDisaster(text) {
        return /(earthquake|tremor|tsunami|hurricane|cyclone|typhoon|tornado|wildfire|bushfire|wild fire|flood|landslide|mudslide|volcano|eruption|storm)\b/.test(text);
    }

    isWar(text) {
        return /(war|invasion|frontline|airstrike|strike|missile|shelling|bombardment|offensive|counteroffensive|ceasefire)\b/.test(text);
    }

    isTerrorism(text) {
        return /(terror|terrorist|bomb|bombing|suicide bomber|ied|extremist attack)\b/.test(text);
    }

    isActiveShooter(text) {
        return /(shooting|shooter|gunman|shots? fired|mass shooting)\b/.test(text);
    }

    isMassCasualty(text, threshold = 10) {
        // Detect via explicit wording or high casualty counts
        const hasWords = /(mass casualty|death toll|multiple fatalities)\b/.test(text);
        // Reuse casualty number detection: any number >= 10 triggers
        const re = /(?:dead|killed|deaths|casualties|fatalities)\s*:?\s*(\d+)/g;
        let high = false;
        let m;
        while ((m = re.exec(text)) !== null) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n >= threshold) { high = true; break; }
        }
        return hasWords || high;
    }

    _saveThresholds() {
        try {
            localStorage.setItem('tickerThresholds', JSON.stringify(this.thresholds));
        } catch (_) {}
    }

    _loadThresholds() {
        try {
            const v = localStorage.getItem('tickerThresholds');
            if (!v) return null;
            const obj = JSON.parse(v);
            if (typeof obj?.stockPercent === 'number' && typeof obj?.massCasualty === 'number') {
                return obj;
            }
        } catch (_) {}
        return null;
    }

    _saveWatchlist() {
        try {
            localStorage.setItem('stockWatchlist', JSON.stringify(this.watchlist));
        } catch (_) {}
        // Re-render watchlist banner when watchlist changes
        this.renderWatchlist();
        this.renderLivePrices();
    }

    _loadWatchlist() {
        try {
            const v = localStorage.getItem('stockWatchlist');
            if (!v) return null;
            const arr = JSON.parse(v);
            if (Array.isArray(arr)) return arr.slice(0, 5);
        } catch (_) {}
        return null;
    }

    _normalizeWatchlist(raw) {
        if (!raw) return null;
        if (Array.isArray(raw)) {
            // strings → objects, objects → keep
            return raw.map(item => {
                if (item && typeof item === 'object' && 'value' in item) {
                    return { value: String(item.value || ''), type: item.type === 'company' ? 'company' : 'ticker' };
                }
                return { value: String(item || ''), type: 'ticker' };
            }).slice(0, 5);
        }
        return null;
    }

    renderWatchlist() {
        const container = document.getElementById('watchlistMentions');
        if (!container) return;
        const entries = (this.watchlist || []).map(o => {
            const value = String(o?.value || '').trim();
            const type = o?.type === 'company' ? 'company' : 'ticker';
            return { value, type };
        }).filter(e => e.value.length > 0);
        if (!this.events?.length || entries.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        // Build latest mention per entry
        const sorted = [...this.events].sort((a, b) => {
            const ta = Date.parse(a.published || 0) || 0;
            const tb = Date.parse(b.published || 0) || 0;
            return tb - ta;
        });

        const results = entries.map(entry => {
            const base = entry.value;
            const tokens = entry.type === 'ticker'
                ? [base, ...this.getWatchlistSynonyms(base)]
                : [base];
            const tokensLc = tokens.map(t => String(t).toLowerCase());
            const match = sorted.find(e => {
                const text = `${e.title || ''} ${e.description || ''}`.toLowerCase();
                return tokensLc.some(t => new RegExp(`\\b${this.escapeRegex(t)}\\b`, 'i').test(text));
            });
            return { entry: base, type: entry.type, match };
        });

        const itemsHtml = results.map(r => {
            const id = `wl-${this.escapeHtml(r.entry)}`;
            const base = r.match ? (() => {
                const published = this.formatDate(r.match.published);
                const label = this.escapeHtml(r.match.title || r.match.description || 'View');
                const url = this.escapeHtml(r.match.url || '#');
                return `<strong>${this.escapeHtml(r.entry)}</strong>: <a href="${url}" target="_blank" rel="noopener">${label}</a> — ${published}`;
            })() : `<strong>${this.escapeHtml(r.entry)}</strong>`;
            return `<li class="watchlist-item" id="${id}">${base}<span class="mini-spinner" aria-label="Loading RSS"></span></li>`;
        }).join('');

        container.innerHTML = `
            <h3>Watchlist Mentions</h3>
            <ul class="watchlist-list">${itemsHtml}</ul>
        `;
        container.style.display = 'block';

        // Fetch RSS per entry and append under each item
        results.forEach(({ entry, type, match }) => {
            Promise.all([
                this.fetchFinancialRss({ value: entry, type }),
                this.fetchMarketWatchRss({ value: entry, type })
            ]).then(([gnItems, mwItems]) => {
                const li = document.getElementById(`wl-${entry}`);
                if (!li) return;
                const spinner = li.querySelector('.mini-spinner');
                if (spinner) spinner.remove();
                let all = [];
                if (this.rssFilters.gn) all = all.concat(gnItems || []);
                if (mwItems?.length) {
                    const top = (mwItems || []).filter(i => i.source === 'MW Top Stories');
                    const rt = (mwItems || []).filter(i => i.source === 'MW Realtime');
                    const pulse = (mwItems || []).filter(i => i.source === 'MW Market Pulse');
                    if (this.rssFilters.mwTop) all = all.concat(top);
                    if (this.rssFilters.mwRealtime) all = all.concat(rt);
                    if (this.rssFilters.mwPulse) all = all.concat(pulse);
                }
                if (!all.length) {
                    if (!match) {
                        const nm = document.createElement('span');
                        nm.className = 'no-mentions';
                        nm.textContent = 'No recent mentions';
                        li.appendChild(nm);
                    }
                    return;
                }
                const seen = new Set();
                const list = document.createElement('ul');
                list.className = 'watchlist-rss';
                list.innerHTML = all.filter(it => {
                    const key = (it.link || it.title || '').toLowerCase();
                    if (seen.has(key)) return false; seen.add(key); return true;
                }).slice(0, 5).map(it => {
                    const title = this.escapeHtml(it.title || 'View');
                    const link = this.escapeHtml(it.link || '#');
                    const when = this.formatDate(it.pubDate || null);
                    const source = this.escapeHtml(it.source || '');
                    return `<li class=\"watchlist-rss-item\"><span class=\"source-badge\">${source.replace('Google News','GN').replace('MarketWatch','MW')}</span> <a href=\"${link}\" target=\"_blank\" rel=\"noopener\">${title}</a> — ${when}</li>`;
                }).join('');
                // If no internal match but RSS items exist, add a small subheading
                if (!match) {
                    const sh = document.createElement('div');
                    sh.className = 'watchlist-subheading';
                    sh.textContent = 'Latest headlines';
                    li.appendChild(sh);
                }
                li.appendChild(list);
            }).catch(() => {
                const li = document.getElementById(`wl-${entry}`);
                if (!li) return;
                const spinner = li.querySelector('.mini-spinner');
                if (spinner) spinner.remove();
                // On error, avoid showing misleading "No recent mentions"; leave entry as-is
            });
        });
    }

    getWatchlistTickers() {
        return (this.watchlist || [])
            .filter(o => o && o.type === 'ticker' && String(o.value || '').trim().length > 0)
            .map(o => String(o.value).trim().toUpperCase());
    }

    async renderLivePrices() {
        const container = document.getElementById('livePriceTracker');
        if (!container) return;
        const tickers = this.getWatchlistTickers();
        if (!tickers.length) { container.style.display = 'none'; container.innerHTML = ''; return; }
        container.innerHTML = '<h3>Live Watchlist Prices</h3><div class="panel-actions"><button type="button" class="refresh-btn" id="priceRefreshBtn" aria-label="Refresh live prices">Refresh</button></div><p class="panel-note">This shows today\'s percent change for stocks in your Watchlist. Green (📈) means up; red (📉) means down. The big news ticker above is separate; the Stock ±% slider only filters the news ticker.</p><ul class="price-list" id="priceList"></ul>';
        container.style.display = 'block';
        const list = document.getElementById('priceList');
        const results = [];
        for (const sym of tickers) {
            const quote = await this.fetchYahooQuote(sym);
            results.push({ sym, quote });
        }
        list.innerHTML = results.map(r => {
            const q = r.quote;
            const name = q && q.name ? q.name : '';
            const price = typeof q?.price === 'number' ? q.price : null;
            const pct = typeof q?.pct === 'number' ? q.pct : null;
            const currency = q?.currency || '';
            const currencySymbol = q?.currencySymbol || this.currencySymbolForCode(currency) || '';
            const logo = this.logoForSymbol(r.sym, name);
            if (pct === null && price === null) {
                return `<li class="price-item">${logo ? `<img class="price-logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(name || r.sym)} logo" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.style.display='none'">` : ''}<span class="price-symbol">${this.escapeHtml(r.sym)}</span>${name ? ` <span class="price-name">${this.escapeHtml(name)}</span>` : ''} <span class="price-time">unavailable</span></li>`;
            }
            const up = pct >= 0;
            const icon = up ? '📈' : '📉';
            const cls = up ? 'price-up' : 'price-down';
            const when = 'today';
            const pricePrefix = currencySymbol ? currencySymbol : '';
            const priceSuffix = (!currencySymbol && currency) ? ` ${this.escapeHtml(currency)}` : '';
            const priceHtml = price !== null ? ` <span class="price-amount">${pricePrefix}${price.toFixed(2)}${priceSuffix}</span>` : '';
            const nameHtml = name ? ` <span class="price-name">${this.escapeHtml(name)}</span>` : '';
            const logoHtml = logo ? `<img class="price-logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(name || r.sym)} logo" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.style.display='none'">` : '';
            const pctHtml = pct !== null ? ` <span class="${cls} price-change">${icon} ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>` : '';
            return `<li class="price-item">${logoHtml}<span class="price-symbol">${this.escapeHtml(r.sym)}</span>${nameHtml}${priceHtml}${pctHtml} <span class="price-time">${when}</span></li>`;
        }).join('');

        // Wire refresh button to bypass cache and re-fetch
        const btn = document.getElementById('priceRefreshBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = 'Refreshing…';
                    this._clearYfCacheForSymbols(tickers);
                    this._clearYfQuoteCacheForSymbols(tickers);
                    await this.renderLivePrices();
                } finally {
                    // New button instance will be wired on next render
                }
            });
        }
        // Mark last refresh time and update badge
        this.lastLiveRefreshTs = Date.now();
        this.renderStatusBadge();
    }

    startLiveAutoRefresh() {
        try {
            if (this.liveRefreshTimer) {
                clearInterval(this.liveRefreshTimer);
                this.liveRefreshTimer = null;
            }
            const intervalMs = 30 * 60 * 1000; // 30 minutes
            this.liveRefreshTimer = setInterval(async () => {
                const tickers = this.getWatchlistTickers();
                this._clearYfCacheForSymbols(tickers);
                this._clearYfQuoteCacheForSymbols(tickers);
                await this.renderLivePrices();
                this.lastLiveRefreshTs = Date.now();
                this.renderStatusBadge();
            }, intervalMs);
        } catch (_) {}
    }

    _clearYfCacheForSymbols(symbols) {
        try {
            const key = 'yfChangeCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            for (const s of (symbols || [])) {
                const k = String(s).toUpperCase();
                if (obj[k]) delete obj[k];
            }
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (_) {}
    }

    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    isLocalEnv() {
        try {
            return typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
        } catch (_) { return false; }
    }

    _localProxyUrls(apiUrl) {
        const ports = [8001, 8003, 8002];
        const paramPort = (() => { try { const p = new URLSearchParams(window.location.search).get('proxyPort'); return p ? parseInt(p, 10) : null; } catch(_) { return null; } })();
        const host = '127.0.0.1';
        const list = [];
        if (paramPort) list.push(`http://${host}:${paramPort}/proxy?url=${encodeURIComponent(apiUrl)}`);
        ports.forEach(pt => list.push(`http://${host}:${pt}/proxy?url=${encodeURIComponent(apiUrl)}`));
        return list;
    }

    getWatchlistSynonyms(entry) {
        const map = {
            'C': ['Citigroup', 'Citi', 'Citibank'],
            'BAC': ['Bank of America'],
            'JPM': ['JPMorgan', 'JPMorgan Chase'],
            'AAPL': ['Apple', 'Apple Inc'],
            'MSFT': ['Microsoft'],
            'GOOGL': ['Google', 'Alphabet'],
            'TSLA': ['Tesla'],
            // Added for prepopulated examples
            'KO': ['Coca-Cola', 'The Coca-Cola Company', 'Coke'],
            'MCD': ["McDonald's", 'McDonalds', 'McDonald’s']
        };
        const key = String(entry || '').toUpperCase();
        return map[key] || [];
    }

    async fetchFinancialRss(entry) {
        try {
            const value = String(entry?.value || '').trim();
            const isCompany = entry?.type === 'company';
            const synonyms = isCompany ? [] : this.getWatchlistSynonyms(value);
            const terms = [value, ...synonyms].filter(Boolean).join(' OR ');
            const q = encodeURIComponent(`(${terms}) (stock OR shares OR price)`);
            const rssUrl = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
            const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
            const res = await fetch(proxied);
            if (!res.ok) return [];
            const json = await res.json();
            const contents = json && json.contents ? json.contents : '';
            if (!contents) return [];
            const parser = new DOMParser();
            const xml = parser.parseFromString(contents, 'text/xml');
            const tokens = [value, ...synonyms];
            const items = Array.from(xml.querySelectorAll('item')).map(item => ({
                title: item.querySelector('title')?.textContent || '',
                link: item.querySelector('link')?.textContent || '',
                pubDate: item.querySelector('pubDate')?.textContent || '',
                source: 'Google News'
            })).filter(it => {
                const text = (it.title || '').toLowerCase();
                const t = Date.parse(it.pubDate || 0) || 0;
                const ageHours = (Date.now() - t) / (1000 * 60 * 60);
                const matchesToken = tokens.some(token => new RegExp(`\\b${this.escapeRegex(String(token).toLowerCase())}\\b`, 'i').test(text));
                return matchesToken && ageHours <= 12;
            });
            return items;
        } catch (_) {
            return [];
        }
    }

    async fetchMarketWatchRss(entry) {
        try {
            const feeds = [
                { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', label: 'MW Top Stories' },
                { url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', label: 'MW Realtime' },
                { url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse', label: 'MW Market Pulse' }
            ];
            const value = String(entry?.value || '').trim();
            const isCompany = entry?.type === 'company';
            const synonyms = isCompany ? [] : this.getWatchlistSynonyms(value);
            const tokens = [value, ...synonyms];
            const fetchViaProxy = async (feed) => {
                const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
                const res = await fetch(proxied);
                if (!res.ok) return [];
                const json = await res.json();
                const contents = json && json.contents ? json.contents : '';
                if (!contents) return [];
                const parser = new DOMParser();
                const xml = parser.parseFromString(contents, 'text/xml');
                return Array.from(xml.querySelectorAll('item')).map(item => {
                    const title = item.querySelector('title')?.textContent || '';
                    const link = (item.querySelector('link')?.textContent || item.querySelector('guid')?.textContent || '').trim();
                    const pubDate = (item.querySelector('pubDate')?.textContent || item.querySelector('updated')?.textContent || '').trim();
                    const description = item.querySelector('description')?.textContent || '';
                    return { title, link, pubDate, description, source: feed.label };
                });
            };
            const allItems = (await Promise.all(feeds.map(fetchViaProxy))).flat();
            const filtered = allItems.filter(it => {
                const text = `${it.title || ''} ${it.description || ''}`.toLowerCase();
                const t = Date.parse(it.pubDate || 0) || 0;
                const ageHours = (Date.now() - t) / (1000 * 60 * 60);
                const matchesToken = tokens.some(token => new RegExp(`\\b${this.escapeRegex(String(token).toLowerCase())}\\b`, 'i').test(text));
                return matchesToken && ageHours <= 12;
            });
            return filtered;
        } catch (_) {
            return [];
        }
    }

    domainFromUrl(link) {
        try {
            const u = new URL(link);
            return u.hostname.replace(/^www\./, '');
        } catch (_) { return ''; }
    }

    _saveRssFilters() {
        try { localStorage.setItem('rssFilters', JSON.stringify(this.rssFilters)); } catch (_) {}
    }
    _loadRssFilters() {
        try {
            const v = localStorage.getItem('rssFilters');
            return v ? JSON.parse(v) : null;
        } catch (_) { return null; }
    }

    _saveTestDataFlag(flag) {
        try { localStorage.setItem('enableTestData', flag ? '1' : '0'); } catch (_) {}
    }
    _loadTestDataFlag() {
        try {
            const v = localStorage.getItem('enableTestData');
            return v === '1';
        } catch (_) { return false; }
    }

    _saveTestCategories() {
        try { localStorage.setItem('testCategories', JSON.stringify(this.testCategories)); } catch (_) {}
    }
    _loadTestCategories() {
        try {
            const v = localStorage.getItem('testCategories');
            const obj = v ? JSON.parse(v) : null;
            if (!obj || typeof obj !== 'object') return null;
            return {
                stock: !!obj.stock,
                casualty: !!obj.casualty,
                airline: !!obj.airline
            };
        } catch (_) { return null; }
    }

    // Fetch and inject a small set of live stocks after initial render
    async fetchAndInjectLiveStocks() {
        const syms = ['OMER', 'VIVK', 'MU', 'ASTS'];
        for (const s of syms) {
            try {
                const pct = await this.fetchYahooChangePercent(s);
                if (typeof pct === 'number') {
                    const now = new Date().toISOString();
                    const icon = pct >= 0 ? '📈' : '📉';
                    const label = `${icon} ${s} ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% today`;
                    const title = `${s} stock ${pct >= 0 ? 'surged' : 'plunged'} ${pct.toFixed(1)}% today`;
                    const desc = `${s} shares moved ${pct.toFixed(1)}% today based on Yahoo Finance.`;
                    const event = {
                        title,
                        description: desc,
                        severity_level: 'High',
                        severity_score: 55,
                        source: 'Yahoo Finance',
                        url: `https://finance.yahoo.com/quote/${s}`,
                        published: now,
                        ticker_label: label,
                        ticker_category: 'stock_swing'
                    };
                    this.events = [event, ...this.events];
                }
            } catch (_) {}
        }
        // Re-render ticker after injection
        this.renderTicker();
    }

    // Helper: fetch with timeout to avoid long hangs
    async fetchWithTimeout(url, ms = 4000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: controller.signal });
            return res;
        } catch (e) {
            return null;
        } finally {
            clearTimeout(id);
        }
    }

    showErrorBanner(error, attempts) {
        const errorEl = document.getElementById('error');
        if (!errorEl) return;
        // Reset base error content
        errorEl.innerHTML = '<p>❌ Unable to load events. Please try again later.</p>';
        const banner = document.createElement('div');
        banner.className = 'error-banner';
        const message = error && error.message ? error.message : 'An unknown error occurred.';
        const listItems = (attempts || []).map(a => {
            const status = a.ok ? 'OK' : (a.status ? `HTTP ${a.status}` : (a.error || 'error'));
            const href = a.url || '';
            return `<li><a class="error-link" href="${href}" target="_blank" rel="noopener">${href}</a> — ${status}</li>`;
        }).join('');
        banner.innerHTML = `
            <div><strong>Failed to load events.</strong> ${this.escapeHtml(message)}</div>
            ${attempts && attempts.length ? `<ul>${listItems}</ul>` : ''}
            <div class="error-actions"><button type="button" class="retry-btn" aria-label="Retry loading events">Retry</button></div>
        `;
        errorEl.appendChild(banner);
        const retryBtn = banner.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                // remove banner and retry loading
                banner.remove();
                errorEl.style.display = 'none';
                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'block';
                try {
                    await this.loadEvents();
                } finally {
                    if (loadingEl) loadingEl.style.display = 'none';
                }
            });
        }
    }

    async fetchYahooChangePercent(symbol) {
        try {
            const cache = this._loadYfCache(symbol);
            const now = Date.now();
            const freshMs = 10 * 60 * 1000;
            if (cache && now - cache.ts < freshMs) {
                return cache.pct;
            }
            // Try JSON quote API via Jina CORS-friendly fetch
            const jsonPct1 = await this.fetchYahooQuotePercent(symbol, 'jina');
            if (typeof jsonPct1 === 'number') { this._saveYfCache(symbol, jsonPct1); return jsonPct1; }
            // Fallback: JSON quote API via allorigins
            const jsonPct2 = await this.fetchYahooQuotePercent(symbol, 'allorigins');
            if (typeof jsonPct2 === 'number') { this._saveYfCache(symbol, jsonPct2); return jsonPct2; }
            // Final fallback: parse HTML quote page via allorigins
            const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
            const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            let res = await this.fetchWithTimeout(proxied, 4000);
            let contents = '';
            if (res && res.ok) {
                const json = await res.json();
                contents = json && json.contents ? json.contents : '';
            }
            // If allorigins failed, try Jina HTML proxy
            if (!contents) {
                const jinaHtml = `https://r.jina.ai/http://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
                const r2 = await this.fetchWithTimeout(jinaHtml, 4000);
                if (r2 && r2.ok) {
                    contents = await r2.text();
                }
            }
            if (!contents) return cache ? cache.pct : null;
            const parser = new DOMParser();
            const doc = parser.parseFromString(contents, 'text/html');
            let txt = doc.querySelector('fin-streamer[data-field="regularMarketChangePercent"]')?.textContent?.trim() || '';
            if (!txt || !/%/.test(txt)) {
                const m = contents.match(/regularMarketChangePercent[^%]*?fmt"\s*:\s*"([+\-]?[0-9]+(?:\.[0-9]+)?)%"/);
                if (m) txt = `${m[1]}%`;
            }
            const pctMatch = txt && txt.match(/([+\-]?[0-9]+(?:\.[0-9]+)?)%/);
            if (!pctMatch) return cache ? cache.pct : null;
            const pct = parseFloat(pctMatch[1]);
            if (Number.isNaN(pct)) return cache ? cache.pct : null;
            this._saveYfCache(symbol, pct);
            return pct;
        } catch (_) {
            const cache = this._loadYfCache(symbol);
            return cache ? cache.pct : null;
        }
    }

    async fetchYahooQuote(symbol) {
        // Adapter entry: switchable provider
        if (this.marketProvider === 'public') {
            const r = await this.fetchPublicQuote(symbol);
            if (r) return r;
            // fall back to Yahoo if public fails
        }
        try {
            const cache = this._loadYfQuoteCache(symbol);
            const now = Date.now();
            const freshMs = 10 * 60 * 1000;
            if (cache && now - cache.ts < freshMs) {
                return { pct: cache.pct ?? null, price: cache.price ?? null, name: cache.name ?? '', currency: cache.currency ?? '', currencySymbol: cache.currencySymbol ?? '' };
            }
            // Try JSON via Jina
            let data = await this._fetchYahooQuoteJson(symbol, 'jina');
            if (!data) {
                // Fallback: JSON via allorigins
                data = await this._fetchYahooQuoteJson(symbol, 'allorigins');
            }
            if (data) {
                const result = data?.quoteResponse?.result?.[0] || null;
                let name = result?.shortName || result?.longName || '';
                let price = typeof result?.regularMarketPrice === 'number' ? result.regularMarketPrice : null;
                let pct = typeof result?.regularMarketChangePercent === 'number' ? result.regularMarketChangePercent : null;
                let currency = result?.currency || '';
                let currencySymbol = result?.currencySymbol || '';
                if (pct === null) {
                    const prev = typeof result?.regularMarketPreviousClose === 'number' ? result.regularMarketPreviousClose : null;
                    if (price !== null && prev !== null && prev !== 0) {
                        pct = ((price - prev) / prev) * 100;
                    }
                }
                this._saveYfQuoteCache(symbol, { pct, price, name, currency, currencySymbol });
                // Also update simple pct cache for consistency
                if (typeof pct === 'number') this._saveYfCache(symbol, pct);
                return { pct, price, name, currency, currencySymbol };
            }
            // Final fallback: parse HTML page
            const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
            const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            let res = await this.fetchWithTimeout(proxied, 4000);
            let contents = '';
            if (res && res.ok) {
                const json = await res.json();
                contents = json && json.contents ? json.contents : '';
            }
            // If allorigins failed or empty, try Jina HTML proxy
            if (!contents) {
                const jinaHtml = `https://r.jina.ai/http://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
                const r2 = await this.fetchWithTimeout(jinaHtml, 4000);
                if (r2 && r2.ok) {
                    contents = await r2.text();
                }
            }
            if (!contents) return cache ? { pct: cache.pct ?? null, price: cache.price ?? null, name: cache.name ?? '', currency: cache.currency ?? '', currencySymbol: cache.currencySymbol ?? '' } : { pct: null, price: null, name: '', currency: '', currencySymbol: '' };
            const parser = new DOMParser();
            const doc = parser.parseFromString(contents, 'text/html');
            const nameNode = doc.querySelector('h1');
            let name = nameNode?.textContent?.trim() || '';
            // Clean name like "KO - Coca-Cola Company"
            if (name) {
                const parts = name.split('(')[0].split('-');
                name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            }
            // Price from fin-streamer
            let priceTxt = doc.querySelector('fin-streamer[data-field="regularMarketPrice"]')?.textContent?.trim() || '';
            let price = null;
            if (priceTxt) {
                const m = priceTxt.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
                if (m) price = parseFloat(m[1]);
            }
            // Percent from fin-streamer or embedded JSON
            let pctTxt = doc.querySelector('fin-streamer[data-field="regularMarketChangePercent"]')?.textContent?.trim() || '';
            if (!pctTxt || !/%/.test(pctTxt)) {
                const m = contents.match(/regularMarketChangePercent[^%]*?fmt"\s*:\s*"([+\-]?[0-9]+(?:\.[0-9]+)?)%"/);
                if (m) pctTxt = `${m[1]}%`;
            }
            let pct = null;
            const pctMatch = pctTxt && pctTxt.match(/([+\-]?[0-9]+(?:\.[0-9]+)?)%/);
            if (pctMatch) {
                const p = parseFloat(pctMatch[1]);
                if (!Number.isNaN(p)) pct = p;
            }
            // Currency fallback: attempt to parse symbol from page title (rare)
            let currency = '';
            let currencySymbol = '';
            const symNode = doc.querySelector('span[data-symbol]');
            if (symNode && /USD|EUR|GBP|JPY/.test(symNode.textContent || '')) {
                currency = symNode.textContent.trim();
                currencySymbol = this.currencySymbolForCode(currency) || '';
            }
            this._saveYfQuoteCache(symbol, { pct, price, name, currency, currencySymbol });
            if (typeof pct === 'number') this._saveYfCache(symbol, pct);
            return { pct, price, name, currency, currencySymbol };
        } catch (_) {
            const cache = this._loadYfQuoteCache(symbol);
            return cache ? { pct: cache.pct ?? null, price: cache.price ?? null, name: cache.name ?? '', currency: cache.currency ?? '', currencySymbol: cache.currencySymbol ?? '' } : { pct: null, price: null, name: '', currency: '', currencySymbol: '' };
        }
    }

    async fetchPublicQuote(symbol) {
        // Placeholder public adapter: returns null by default.
        // To enable, replace implementation with your chosen free API.
        // Example shape to return: { pct: number|null, price: number|null, name: string, currency: string, currencySymbol: string }
        try {
            // Example stub: Stooq CSV (daily; limited data). Disabled by default.
            return null;
        } catch (_) {
            return null;
        }
    }

    async _fetchYahooQuoteJson(symbol, method = 'jina') {
        try {
            let url;
            if (this.isLocalEnv()) {
                const api = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
                const urls = this._localProxyUrls(api);
                for (const u of urls) {
                    const res = await this.fetchWithTimeout(u, 4000);
                    if (res && res.ok) {
                        try { const m = u.match(/:(\d+)\/proxy/); this.lastProxyPortUsed = m ? parseInt(m[1], 10) : null; } catch(_) {}
                        let text = await res.text();
                        if (!text) continue;
                        try { return JSON.parse(text); } catch { continue; }
                    }
                }
                return null;
            } else if (method === 'jina') {
                url = `https://r.jina.ai/http://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
            } else {
                const api = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
                url = `https://api.allorigins.win/get?url=${encodeURIComponent(api)}`;
            }
            const res = await this.fetchWithTimeout(url, 4000);
            if (!res || !res.ok) return null;
            let text;
            if (method === 'jina') {
                text = await res.text();
            } else {
                const j = await res.json();
                text = j && j.contents ? j.contents : '';
            }
            if (!text) return null;
            try { return JSON.parse(text); } catch { return null; }
        } catch (_) { return null; }
    }

    async _fetchYahooQuoteSummaryJson(symbol, method = 'jina') {
        try {
            let url;
            if (this.isLocalEnv()) {
                const api = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`;
                const urls = this._localProxyUrls(api);
                for (const u of urls) {
                    const res = await this.fetchWithTimeout(u, 4000);
                    if (res && res.ok) {
                        try { const m = u.match(/:(\d+)\/proxy/); this.lastProxyPortUsed = m ? parseInt(m[1], 10) : null; } catch(_) {}
                        let text = await res.text();
                        if (!text) continue;
                        try { return JSON.parse(text); } catch { continue; }
                    }
                }
                return null;
            } else if (method === 'jina') {
                url = `https://r.jina.ai/http://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`;
            } else {
                const api = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`;
                url = `https://api.allorigins.win/get?url=${encodeURIComponent(api)}`;
            }
            const res = await this.fetchWithTimeout(url, 4000);
            if (!res || !res.ok) return null;
            let text;
            if (method === 'jina') {
                text = await res.text();
            } else {
                const j = await res.json();
                text = j && j.contents ? j.contents : '';
            }
            if (!text) return null;
            try { return JSON.parse(text); } catch { return null; }
        } catch (_) { return null; }
    }

    async _fetchYahooChartJson(symbol, method = 'jina') {
        try {
            let url;
            if (this.isLocalEnv()) {
                const api = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
                const urls = this._localProxyUrls(api);
                for (const u of urls) {
                    const res = await this.fetchWithTimeout(u, 4000);
                    if (res && res.ok) {
                        try { const m = u.match(/:(\d+)\/proxy/); this.lastProxyPortUsed = m ? parseInt(m[1], 10) : null; } catch(_) {}
                        let text = await res.text();
                        if (!text) continue;
                        try { return JSON.parse(text); } catch { continue; }
                    }
                }
                return null;
            } else if (method === 'jina') {
                url = `https://r.jina.ai/http://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
            } else {
                const api = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
                url = `https://api.allorigins.win/get?url=${encodeURIComponent(api)}`;
            }
            const res = await this.fetchWithTimeout(url, 4000);
            if (!res || !res.ok) return null;
            let text;
            if (method === 'jina') {
                text = await res.text();
            } else {
                const j = await res.json();
                text = j && j.contents ? j.contents : '';
            }
            if (!text) return null;
            try { return JSON.parse(text); } catch { return null; }
        } catch (_) { return null; }
    }

    async fetchYahooQuotePercent(symbol, method = 'jina') {
        try {
            let url;
            if (method === 'jina') {
                url = `https://r.jina.ai/http://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
            } else {
                const api = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
                url = `https://api.allorigins.win/get?url=${encodeURIComponent(api)}`;
            }
            const res = await this.fetchWithTimeout(url, 4000);
            if (!res || !res.ok) return null;
            let text;
            if (method === 'jina') {
                text = await res.text();
            } else {
                const j = await res.json();
                text = j && j.contents ? j.contents : '';
            }
            if (!text) return null;
            let data;
            try { data = JSON.parse(text); } catch { return null; }
            const result = data && data.quoteResponse && Array.isArray(data.quoteResponse.result) ? data.quoteResponse.result[0] : null;
            if (!result) return null;
            let pct = typeof result.regularMarketChangePercent === 'number' ? result.regularMarketChangePercent : null;
            if (pct === null) {
                const price = typeof result.regularMarketPrice === 'number' ? result.regularMarketPrice : null;
                const prev = typeof result.regularMarketPreviousClose === 'number' ? result.regularMarketPreviousClose : null;
                if (price !== null && prev !== null && prev !== 0) {
                    pct = ((price - prev) / prev) * 100;
                }
            }
            return typeof pct === 'number' ? pct : null;
        } catch (_) {
            return null;
        }
    }

    _saveYfCache(symbol, pct) {
        try {
            const key = 'yfChangeCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            obj[String(symbol).toUpperCase()] = { pct, ts: Date.now() };
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (_) {}
    }

    _loadYfCache(symbol) {
        try {
            const key = 'yfChangeCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            return obj[String(symbol).toUpperCase()] || null;
        } catch (_) { return null; }
    }

    _saveYfQuoteCache(symbol, data) {
        try {
            const key = 'yfQuoteCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            obj[String(symbol).toUpperCase()] = { pct: data?.pct ?? null, price: data?.price ?? null, name: data?.name ?? '', currency: data?.currency ?? '', currencySymbol: data?.currencySymbol ?? '', ts: Date.now() };
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (_) {}
    }

    _loadYfQuoteCache(symbol) {
        try {
            const key = 'yfQuoteCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            return obj[String(symbol).toUpperCase()] || null;
        } catch (_) { return null; }
    }

    _clearYfQuoteCacheForSymbols(symbols) {
        try {
            const key = 'yfQuoteCache';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            for (const s of (symbols || [])) {
                const k = String(s).toUpperCase();
                if (obj[k]) delete obj[k];
            }
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (_) {}
    }

    logoForSymbol(symbol, name) {
        const map = {
            'KO': 'https://logo.clearbit.com/coca-colacompany.com',
            'MCD': 'https://logo.clearbit.com/mcdonalds.com',
            'AAPL': 'https://logo.clearbit.com/apple.com',
            'MSFT': 'https://logo.clearbit.com/microsoft.com',
            'TSLA': 'https://logo.clearbit.com/tesla.com',
            'GOOGL': 'https://logo.clearbit.com/abc.xyz',
            'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
            'BAC': 'https://logo.clearbit.com/bankofamerica.com',
            'C': 'https://logo.clearbit.com/citigroup.com',
            'T': 'https://logo.clearbit.com/att.com',
            // Added for live symbols and common tickers
            'OMER': 'https://logo.clearbit.com/omeros.com',
            'VIVK': 'https://logo.clearbit.com/vivakor.com',
            'MU': 'https://logo.clearbit.com/micron.com',
            'ASTS': 'https://logo.clearbit.com/ast-science.com',
            'AMZN': 'https://logo.clearbit.com/amazon.com',
            'META': 'https://logo.clearbit.com/meta.com',
            'NVDA': 'https://logo.clearbit.com/nvidia.com',
            'NFLX': 'https://logo.clearbit.com/netflix.com',
            'NIO': 'https://logo.clearbit.com/nio.com',
            'BABA': 'https://logo.clearbit.com/alibaba.com',
            'ORCL': 'https://logo.clearbit.com/oracle.com',
            'INTC': 'https://logo.clearbit.com/intel.com'
        };
        const s = String(symbol).toUpperCase();
        if (map[s]) return map[s];
        // Fallback: no logo available
        return '';
    }

    currencySymbolForCode(code) {
        const map = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CNY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'CHF': 'CHF',
            'HKD': 'HK$',
            'INR': '₹',
            'KRW': '₩',
            'BRL': 'R$',
            'ZAR': 'R'
        };
        const k = String(code || '').toUpperCase();
        return map[k] || '';
    }

    // Diagnostics panel
    renderDiagnostics() {
        try {
            const box = document.getElementById('diagnostics');
            const content = document.getElementById('diagContent');
            if (!box || !content) return;
            const enabled = this.diagnosticsEnabled;
            box.style.display = enabled ? 'block' : 'none';
            if (!enabled) return;
            // Cache sizes
            let changeSize = 0, quoteSize = 0;
            try {
                const chRaw = localStorage.getItem('yfChangeCache');
                const chObj = chRaw ? JSON.parse(chRaw) : {};
                changeSize = Object.keys(chObj).length;
            } catch(_) {}
            try {
                const qRaw = localStorage.getItem('yfQuoteCache');
                const qObj = qRaw ? JSON.parse(qRaw) : {};
                quoteSize = Object.keys(qObj).length;
            } catch(_) {}
            // Env
            const isLocal = this.isLocalEnv();
            // Attempts summary
            const attemptLines = (this.lastEventLoadAttempts || []).map(a => `${a.ok ? 'OK' : 'ERR'} ${a.status ? '('+a.status+')' : ''} → ${a.url}`);
            const wl = this._loadWatchlist ? this._loadWatchlist() : [];
            const provider = this.marketProvider;
            const nowStr = new Date().toLocaleString();
            content.innerHTML = [
                `Time: ${this.escapeHtml(nowStr)}`,
                `Env: ${isLocal ? 'local' : 'prod-like'}`,
                `Provider: ${this.escapeHtml(String(provider))}`,
                `Watchlist entries: ${wl.length}`,
                `Caches — change: ${changeSize}, quote: ${quoteSize}`,
                `Event load attempts:`,
                `<ul>${attemptLines.map(l => `<li>${this.escapeHtml(l)}</li>`).join('')}</ul>`
            ].join('<br>');
        } catch(_) {}
    }

    // Status badge
    renderStatusBadge() {
        try {
            const el = document.getElementById('statusBadge');
            if (!el) return;
            const isLocal = this.isLocalEnv();
            const provider = this.marketProvider;
            const port = this.lastProxyPortUsed;
            const lastTs = this.lastLiveRefreshTs;
            const lastStr = lastTs ? new Date(lastTs).toLocaleTimeString() : '—';
            const pills = [];
            pills.push(`<span class="badge-pill badge-info"><span class="dot"></span> Provider: ${this.escapeHtml(String(provider))}</span>`);
            pills.push(`<span class="badge-pill"><span class="dot"></span> Env: ${isLocal ? 'local' : 'prod-like'}</span>`);
            if (isLocal) {
                pills.push(`<span class="badge-pill ${port ? '' : 'badge-warn'}"><span class="dot"></span> Proxy: ${port ? port : 'none'}</span>`);
            }
            pills.push(`<span class="badge-pill"><span class="dot"></span> Live refreshed: ${this.escapeHtml(lastStr)}</span>`);
            el.innerHTML = pills.join(' ');
        } catch(_) {}
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
