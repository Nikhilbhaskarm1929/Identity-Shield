/**
 * IdentityShield v3 — Shared App Shell (Sidebar + Topbar + Command Palette)
 * Single source of truth: reference_target_ui.png & DESIGN_SPEC.md §4, §5
 */

(() => {
  const NAV_ITEMS = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/v3/index.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    },
    {
      key: 'live',
      label: 'Live Stream',
      href: '/v3/live.html',
      icon: `<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    },
    {
      key: 'cases',
      label: 'Threat Cases',
      href: '/v3/cases.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>`,
    },
    {
      key: 'memory',
      label: '30-Day Memory',
      href: '/memory.html',
      icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/><path d="M4 12a8 8 0 0 1 8-8"/></svg>`,
    },
    {
      key: 'graph',
      label: 'Graph 3D',
      href: '/v3/graph.html',
      icon: `<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    },
    {
      key: 'globe',
      label: 'Login Globe',
      href: '/v3/globe.html',
      icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    },
    {
      key: 'agents',
      label: '15 Agents',
      href: '/v3/agents.html',
      icon: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/><path d="M9 15h.01"/><path d="M15 9h.01"/></svg>`,
    },
    {
      key: 'analytics',
      label: 'Analytics',
      href: '/v3/analytics.html',
      icon: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    },
    {
      key: 'performance',
      label: 'Performance',
      href: '/v3/performance.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    },
    {
      key: 'ingest',
      label: 'Ingest & Scan',
      href: '/v3/input.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    },
    {
      key: 'audit',
      label: 'Audit Trail',
      href: '/v3/audit.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    },
    {
      key: 'settings',
      label: 'Settings',
      href: '/v3/settings.html',
      icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
  ];

  class SharedShell {
    constructor() {
      this.sidebarEl = document.getElementById('is-sidebar');
      this.topbarEl = document.getElementById('is-topbar');
      this.cmdModal = null;
      this.isCollapsed = this._loadCollapsed();
    }

    _loadCollapsed() {
      try {
        return localStorage.getItem('is_sidebar_collapsed') === '1';
      } catch {
        return false;
      }
    }

    _saveCollapsed(val) {
      try {
        localStorage.setItem('is_sidebar_collapsed', val ? '1' : '0');
      } catch {}
    }

    init() {
      this._applySavedTheme();
      this._renderSidebar();
      this._renderTopbar();
      this._setupClock();
      this._setupThemeToggle();
      this._setupCommandPalette();
      this._setupLiveMonitoring();
      this._renderToastContainer();
    }

    _applySavedTheme() {
      try {
        const theme = localStorage.getItem('identityshield_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch {}
    }

    _getCurrentPageKey() {
      const explicit = document.body.getAttribute('data-page');
      if (explicit) return explicit;

      const path = window.location.pathname.toLowerCase();
      if (path.endsWith('cases.html') || path.endsWith('case.html')) return 'cases';
      if (path.endsWith('memory.html')) return 'memory';
      if (path.endsWith('live.html')) return 'live';
      if (path.endsWith('graph.html')) return 'graph';
      if (path.endsWith('globe.html')) return 'globe';
      if (path.endsWith('agents.html')) return 'agents';
      if (path.endsWith('analytics.html')) return 'analytics';
      if (path.endsWith('performance.html')) return 'performance';
      if (path.endsWith('input.html')) return 'ingest';
      if (path.endsWith('audit.html')) return 'audit';
      if (path.endsWith('settings.html')) return 'settings';
      return 'dashboard';
    }

    _renderSidebar() {
      if (!this.sidebarEl) return;
      const currentKey = this._getCurrentPageKey();

      if (this.isCollapsed) {
        this.sidebarEl.classList.add('is-collapsed');
      }

      this.sidebarEl.innerHTML = `
        <a href="/v3/index.html" class="is-sidebar-brand" title="IdentityShield">
          <svg class="is-brand-shield" viewBox="0 0 36 36" fill="none">
            <path d="M18 2L5 7.5V17C5 25.5 10.5 32.5 18 35C25.5 32.5 31 25.5 31 17V7.5L18 2Z" 
                  stroke="var(--green-500)" stroke-width="2.2" stroke-linejoin="round" fill="rgba(0, 230, 118, 0.08)"/>
            <path d="M18 9C14.5 9 12 11.5 12 15C12 19 14.5 22 18 22C21.5 22 24 19 24 15C24 11.5 21.5 9 18 9Z" 
                  stroke="var(--green-500)" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2 1.5"/>
            <path d="M15 15C15 13.5 16.3 12.2 18 12.2C19.7 12.2 21 13.5 21 15C21 17 19.5 18.8 18 18.8" 
                  stroke="var(--green-500)" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M18 15V16" stroke="var(--green-500)" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M10 17C10 21.5 13 25.5 18 27C23 25.5 26 21.5 26 17" 
                  stroke="var(--green-500)" stroke-width="1.2" stroke-linecap="round" opacity="0.65"/>
          </svg>
          <div class="is-brand-info">
            <div class="is-brand-title">
              <span>IdentityShield</span>
              <span class="is-brand-chip">v3</span>
            </div>
            <div class="is-brand-tagline">Detect. Prevent. Secure.</div>
          </div>
        </a>

        <nav class="is-sidebar-nav">
          ${NAV_ITEMS.map((item) => {
            const isActive = item.key === currentKey;
            return `
              <a href="${item.href}" class="is-nav-item ${isActive ? 'active' : ''}" title="${item.label}">
                ${item.icon}
                <span class="is-nav-text">${item.label}</span>
              </a>
            `;
          }).join('')}
        </nav>

        <div class="is-sidebar-footer">
          <button type="button" class="is-collapse-btn" id="is-sidebar-collapse-btn" title="Toggle Sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            <span class="is-collapse-text">${this.isCollapsed ? 'Expand' : 'Collapse View'}</span>
          </button>
        </div>
      `;

      const collapseBtn = this.sidebarEl.querySelector('#is-sidebar-collapse-btn');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
          this.isCollapsed = !this.isCollapsed;
          this.sidebarEl.classList.toggle('is-collapsed', this.isCollapsed);
          this._saveCollapsed(this.isCollapsed);
          const txt = this.sidebarEl.querySelector('.is-collapse-text');
          if (txt) txt.textContent = this.isCollapsed ? 'Expand' : 'Collapse View';
        });
      }
    }

    _renderTopbar() {
      if (!this.topbarEl) return;

      this.topbarEl.innerHTML = `
        <div class="is-topbar-left">
          <!-- Okta Connection Pill -->
          <div class="is-pill" id="okta-status-pill">
            <span class="is-dot ok" id="okta-status-dot"></span>
            <span id="okta-status-text">Connected to Okta</span>
          </div>

          <!-- Last Sync Pill -->
          <div class="is-pill" style="color:var(--text-2);">
            <span id="last-sync-time">Last Sync: 10:42 AM</span>
          </div>

          <!-- System Status Pill -->
          <div class="is-pill">
            <span class="is-dot ok" id="run-status-dot"></span>
            <span id="run-status-text" style="font-family:var(--font-mono); font-weight:700;">SYSTEM READY</span>
          </div>

          <!-- EPS Pill -->
          <div class="is-pill is-pill-metric">
            <span class="label">EPS:</span>
            <strong id="topbar-eps" class="val">0.0</strong>
          </div>

          <!-- Ingest Toggle Pill Button -->
          <button type="button" id="topbar-ingest-status-btn" class="is-pill is-pill-btn" title="Toggle Mock / Live Ingest Mode">
            <span class="is-dot ok" id="ingest-status-dot"></span>
            <span style="color:var(--text-3); font-family:var(--font-mono); font-size:11px;">INGEST:</span>
            <strong id="ingest-status-text" style="font-family:var(--font-mono); font-size:12px;">8001 ACTIVE</strong>
          </button>
        </div>

        <div class="is-topbar-right">
          <!-- Tagline & Speed Stripes -->
          <div class="is-tagline-wrap">
            <span>Your Identity. Our Priority.</span>
            <span class="is-slashes">////</span>
          </div>

          <!-- Search (Ctrl K) Button -->
          <button type="button" class="is-search-btn" id="topbar-search-btn">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Search</span>
            <kbd class="is-kbd">Ctrl K</kbd>
          </button>

          <!-- Theme Toggle -->
          <button type="button" id="topbar-theme-toggle" class="is-theme-toggle" title="Toggle Dark/Light Theme">
            <span class="theme-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </span>
            <span class="theme-label">Dark</span>
          </button>

          <!-- UTC Clock -->
          <div id="topbar-clock" class="is-clock">--:--:-- UTC</div>

          <!-- Notification Bell -->
          <button type="button" class="is-bell-btn" id="topbar-bell-btn" title="Threat Cases">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span id="topbar-badge" class="is-bell-badge">3</span>
          </button>

          <!-- User Pill -->
          <div class="is-user-pill" title="Current Operator">
            <div class="is-user-avatar">O</div>
            <span>Omana</span>
            <svg class="is-user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      `;

      // Update theme toggle icon & label
      this._updateThemeBtn();

      // Hook search button
      const searchBtn = this.topbarEl.querySelector('#topbar-search-btn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => this.openCommandPalette());
      }

      // Hook bell button to Threat Cases
      const bellBtn = this.topbarEl.querySelector('#topbar-bell-btn');
      if (bellBtn) {
        bellBtn.addEventListener('click', () => {
          window.location.href = '/v3/cases.html';
        });
      }
    }

    _setupClock() {
      const clockEl = document.getElementById('topbar-clock');
      const syncEl = document.getElementById('last-sync-time');

      const update = () => {
        const now = new Date();
        if (clockEl) {
          clockEl.textContent = now.toISOString().substring(11, 19) + ' UTC';
        }
      };

      const updateSync = () => {
        if (!syncEl) return;
        const now = new Date();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        syncEl.textContent = `Last Sync: ${hours}:${minutes} ${ampm}`;
      };

      update();
      updateSync();
      setInterval(update, 1000);
      setInterval(updateSync, 60000);
    }

    _setupThemeToggle() {
      const btn = document.getElementById('topbar-theme-toggle');
      if (!btn) return;

      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem('identityshield_theme', next);
        } catch {}
        this._updateThemeBtn();
        window.dispatchEvent(new CustomEvent('is:theme-change', { detail: { theme: next } }));
      });
    }

    _updateThemeBtn() {
      const btn = document.getElementById('topbar-theme-toggle');
      if (!btn) return;
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const isDark = cur === 'dark';
      const label = btn.querySelector('.theme-label');
      const icon = btn.querySelector('.theme-icon');

      if (label) label.textContent = isDark ? 'Dark' : 'Light';
      if (icon) {
        icon.innerHTML = isDark
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
      }
    }

    _setupLiveMonitoring() {
      // 1. Health check poll
      const checkHealth = async () => {
        try {
          const res = await fetch('/api/health');
          if (res.ok) {
            const data = await res.json();
            const statusEl = document.getElementById('run-status-text');
            const dotEl = document.getElementById('run-status-dot');
            if (statusEl && dotEl) {
              if (data.status === 'ok' || data.healthy) {
                statusEl.textContent = 'SYSTEM READY';
                dotEl.className = 'is-dot ok';
              } else {
                statusEl.textContent = 'DEGRADED';
                dotEl.className = 'is-dot warn';
              }
            }
          }
        } catch {
          const statusEl = document.getElementById('run-status-text');
          const dotEl = document.getElementById('run-status-dot');
          if (statusEl && dotEl) {
            statusEl.textContent = 'OFFLINE';
            dotEl.className = 'is-dot danger';
          }
        }
      };

      checkHealth();
      setInterval(checkHealth, 8000);

      // 2. Ingest mode check & toggle
      const ingestBtn = document.getElementById('topbar-ingest-status-btn');
      const ingestDot = document.getElementById('ingest-status-dot');
      const ingestText = document.getElementById('ingest-status-text');

      let isMock = false;
      try {
        isMock = localStorage.getItem('identityshield_mock') === '1' || window.location.search.includes('mock=1');
      } catch {}

      if (ingestDot && ingestText) {
        if (isMock) {
          ingestDot.className = 'is-dot warn';
          ingestText.textContent = 'MOCK MODE';
        } else {
          ingestDot.className = 'is-dot ok';
          ingestText.textContent = '8001 ACTIVE';
        }
      }

      if (ingestBtn) {
        ingestBtn.addEventListener('click', () => {
          try {
            if (isMock) {
              localStorage.removeItem('identityshield_mock');
              const u = new URL(window.location.href);
              u.searchParams.delete('mock');
              window.location.href = u.toString();
            } else {
              localStorage.setItem('identityshield_mock', '1');
              const u = new URL(window.location.href);
              u.searchParams.set('mock', '1');
              window.location.href = u.toString();
            }
          } catch {
            window.location.reload();
          }
        });
      }

      // 3. SSE metrics stream for live EPS
      try {
        const evtSource = new EventSource('/v3/api/stream');
        evtSource.addEventListener('metrics', (e) => {
          try {
            const data = JSON.parse(e.data);
            const epsEl = document.getElementById('topbar-eps');
            if (epsEl && data && data.eps !== undefined) {
              epsEl.textContent = Number(data.eps).toFixed(1);
            }
          } catch {}
        });
        evtSource.addEventListener('trace', (e) => {
          try {
            const data = JSON.parse(e.data);
            const epsEl = document.getElementById('topbar-eps');
            if (epsEl && data && data.eps !== undefined) {
              epsEl.textContent = Number(data.eps).toFixed(1);
            }
          } catch {}
        });
        evtSource.onerror = () => {
          // Keep EPS at 0.0 or last value without breaking
        };
      } catch {}

      // 4. Update bell count from active cases
      fetch('/api/alerts')
        .then((r) => r.json())
        .then((alerts) => {
          const badge = document.getElementById('topbar-badge');
          if (!badge) return;
          const count = Array.isArray(alerts) ? alerts.length : 3;
          if (count > 0) {
            badge.style.display = 'flex';
            badge.textContent = count > 99 ? '99+' : count;
          } else {
            badge.style.display = 'none';
          }
        })
        .catch(() => {});
    }

    _setupCommandPalette() {
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.openCommandPalette();
        }
        if (e.key === 'Escape' && this.cmdModal) {
          this.closeCommandPalette();
        }
      });
    }

    openCommandPalette() {
      if (this.cmdModal) return;

      const backdrop = document.createElement('div');
      backdrop.className = 'is-cmd-backdrop';
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeCommandPalette();
      });

      const modal = document.createElement('div');
      modal.className = 'is-cmd-modal';

      const inputWrap = document.createElement('div');
      inputWrap.className = 'is-cmd-input-wrap';
      inputWrap.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="is-cmd-input" placeholder="Type a page name or action..." autofocus />
        <kbd class="is-kbd">ESC</kbd>
      `;

      const list = document.createElement('div');
      list.className = 'is-cmd-list';

      const groupedData = [
        {
          group: 'Pages & Navigation',
          items: NAV_ITEMS.map((n) => ({
            label: n.label,
            sub: n.href,
            action: () => (window.location.href = n.href),
          })),
        },
        {
          group: 'Identities & Users',
          items: [
            { label: 'svc-report (High Risk Service Principal)', sub: 'user:svc-report', action: () => (window.location.href = '/v3/cases.html?case_id=case-e1-svcreport') },
            { label: 'anita.rao (Impossible Travel Incident)', sub: 'user:anita.rao', action: () => (window.location.href = '/v3/globe.html') },
            { label: 'alice (Corporate Office Ingress)', sub: 'user:alice', action: () => (window.location.href = '/v3/memory.html?user=alice') },
            { label: 'alok.mishra (Engineering Group)', sub: 'user:alok.mishra', action: () => (window.location.href = '/v3/memory.html?user=alok.mishra') },
          ],
        },
        {
          group: 'Threat Cases & Investigations',
          items: [
            { label: 'Case E1: Multi-Stage SAML Escalation (CRITICAL)', sub: 'case-e1-svcreport · Risk 92.4', action: () => (window.location.href = '/v3/cases.html?case_id=case-e1-svcreport') },
            { label: 'Case E2: Bengaluru → Moscow Velocity Anomaly', sub: 'case-e2-jdoe · Risk 84.0', action: () => (window.location.href = '/v3/cases.html') },
            { label: 'Case E4: MFA Push Fatigue Exhaustion Spray', sub: 'case-e4-asmith · Risk 76.5', action: () => (window.location.href = '/v3/cases.html') },
          ],
        },
        {
          group: 'Suspicious Network IPs',
          items: [
            { label: '185.220.101.5 (Frankfurt / Tor Exit Node)', sub: 'AS-TOR-ROUTER · 12 events', action: () => (window.location.href = '/v3/globe.html') },
            { label: '198.51.100.12 (New York Ingress)', sub: 'AS-CORP-EAST · 48 events', action: () => (window.location.href = '/v3/globe.html') },
            { label: '203.0.113.88 (Singapore Datacenter)', sub: 'AS-CLOUD-EDGE · 6 events', action: () => (window.location.href = '/v3/globe.html') },
          ],
        },
      ];

      const render = (q = '') => {
        list.innerHTML = '';
        let flatIndex = 0;
        let totalMatches = 0;

        groupedData.forEach((grp) => {
          const matching = grp.items.filter((item) => {
            if (!q) return true;
            return item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q);
          });

          if (matching.length === 0) return;
          totalMatches += matching.length;

          const grpHeader = document.createElement('div');
          grpHeader.className = 'is-cmd-group-title';
          grpHeader.textContent = grp.group;
          list.appendChild(grpHeader);

          matching.forEach((cmd) => {
            const row = document.createElement('div');
            row.className = `is-cmd-item ${flatIndex === 0 ? 'selected' : ''}`;
            row.dataset.flatIdx = flatIndex;
            row.innerHTML = `
              <span>${cmd.label}</span>
              <span class="sub">${cmd.sub}</span>
            `;
            row.addEventListener('click', () => {
              this.closeCommandPalette();
              cmd.action();
            });
            list.appendChild(row);
            flatIndex++;
          });
        });

        if (totalMatches === 0) {
          list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-3); font-family:var(--font-mono); font-size:12px;">No matching results across Pages, Users, Cases, or IPs.</div>';
        }
      };

      render('');

      const input = inputWrap.querySelector('input');
      input.addEventListener('input', () => {
        render(input.value.trim().toLowerCase());
      });

      input.addEventListener('keydown', (e) => {
        const rows = Array.from(list.querySelectorAll('.is-cmd-item'));
        let sel = rows.findIndex((r) => r.classList.contains('selected'));
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (rows.length > 0) {
            if (sel >= 0) rows[sel].classList.remove('selected');
            sel = (sel + 1) % rows.length;
            rows[sel].classList.add('selected');
            rows[sel].scrollIntoView({ block: 'nearest' });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (rows.length > 0) {
            if (sel >= 0) rows[sel].classList.remove('selected');
            sel = (sel - 1 + rows.length) % rows.length;
            rows[sel].classList.add('selected');
            rows[sel].scrollIntoView({ block: 'nearest' });
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (sel >= 0 && rows[sel]) {
            rows[sel].click();
          }
        }
      });

      modal.appendChild(inputWrap);
      modal.appendChild(list);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      this.cmdModal = backdrop;
      setTimeout(() => input.focus(), 50);
    }

    closeCommandPalette() {
      if (this.cmdModal) {
        this.cmdModal.remove();
        this.cmdModal = null;
      }
    }

    _renderToastContainer() {
      if (!document.getElementById('toast-container')) {
        const c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
      }
    }
  }

  // Global helper namespace
  window.IS = window.IS || {};
  window.IS.pageHeader = function({ title, accent, subtitle }) {
    return `
      <div class="is-page-head">
        <h1>${title || ''} ${accent ? `<span class="accent">${accent}</span>` : ''}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
    `;
  };

  // Toast helper
  window.IS.showToast = function(message, type = 'info', duration = 3500) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    c.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  };

  // Prevent old legacy shell.js from double-rendering if loaded
  if (typeof window !== 'undefined') {
    window.__IS_SHARED_SHELL_ACTIVE__ = true;
  }

  // Auto-boot shared shell
  const sharedShell = new SharedShell();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => sharedShell.init());
  } else {
    sharedShell.init();
  }
})();
