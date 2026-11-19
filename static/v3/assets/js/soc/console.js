/**
 * IdentityShield v3 — SOC Live Agent Console
 * Renders high-performance terminal logs with filtering, auto-scroll, and click-to-trace.
 */

import { bus } from './bus.js';
import { escHtml } from '/v3/js/core/dom.js';

export class SocConsole {
  constructor(viewportEl, toolbarEl) {
    this.viewport = viewportEl;
    this.toolbar = toolbarEl;
    this.maxLines = 300;
    this.autoScroll = true;
    this.agentFilter = 'all';
    this.severityFilter = 'all';
    this.lines = [];
    this.init();
    this.bindBusEvents();
  }

  init() {
    this.setupToolbar();
  }

  setupToolbar() {
    if (!this.toolbar) return;

    const selectAgent = this.toolbar.querySelector('#console-filter-agent');
    const selectSev = this.toolbar.querySelector('#console-filter-sev');
    const btnAuto = this.toolbar.querySelector('#console-btn-autoscroll');
    const btnClear = this.toolbar.querySelector('#console-btn-clear');
    const btnCopy = this.toolbar.querySelector('#console-btn-copy');

    if (selectAgent) {
      selectAgent.addEventListener('change', () => {
        this.agentFilter = selectAgent.value;
        this.reapplyFilters();
      });
    }

    if (selectSev) {
      selectSev.addEventListener('change', () => {
        this.severityFilter = selectSev.value;
        this.reapplyFilters();
      });
    }

    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        this.autoScroll = !this.autoScroll;
        btnAuto.classList.toggle('active', this.autoScroll);
        btnAuto.textContent = this.autoScroll ? 'Autoscroll: ON' : 'Autoscroll: PAUSED';
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => this.clear());
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const text = this.lines.map(l => l.rawText).join('\n');
        navigator.clipboard.writeText(text).then(() => {
          window.dispatchEvent(
            new CustomEvent('is:toast', {
              detail: { message: `Copied ${this.lines.length} console lines to clipboard`, type: 'info' },
            })
          );
        });
      });
    }

    if (this.viewport) {
      this.viewport.addEventListener('scroll', () => {
        const atBottom = this.viewport.scrollHeight - this.viewport.scrollTop <= this.viewport.clientHeight + 40;
        if (!atBottom && this.autoScroll) {
          this.autoScroll = false;
          if (btnAuto) {
            btnAuto.classList.remove('active');
            btnAuto.textContent = 'Autoscroll: PAUSED';
          }
        }
      });
    }
  }

  bindBusEvents() {
    bus.on('agent:check', ({ agentId, eventId, text, level }) => {
      this.addLine({ agentId, eventId, text, level });
    });

    bus.on('console:idle', ({ message }) => {
      this.showIdleHint(message || 'Waiting for Okta events… switch Scenario to a demo to preview.');
    });
  }

  showIdleHint(message) {
    if (!this.viewport) return;
    this.removeIdleHint();
    const hint = document.createElement('div');
    hint.className = 'empty soc-console-idle-hint';
    hint.id = 'console-idle-hint';
    hint.style.padding = '14px';
    hint.style.textAlign = 'center';
    hint.style.color = 'var(--text-3)';
    hint.style.fontFamily = 'var(--font-mono)';
    hint.style.fontSize = '11px';
    hint.style.borderTop = '1px dashed var(--border-1)';
    hint.style.borderBottom = '1px dashed var(--border-1)';
    hint.style.margin = '8px 0';
    hint.textContent = message;
    this.viewport.appendChild(hint);
    if (this.autoScroll) this.viewport.scrollTop = this.viewport.scrollHeight;
  }

  removeIdleHint() {
    const existing = this.viewport?.querySelector('#console-idle-hint');
    if (existing) existing.remove();
  }

  addLine({ agentId, eventId, text, level = 'info' }) {
    if (!this.viewport) return;
    this.removeIdleHint();

    const now = new Date();
    const ts = now.toISOString().substring(11, 23);
    const rawTag = `[${(agentId || 'SYS').toUpperCase().padEnd(13, ' ')}]`;
    const icon = level === 'threat' ? '✗' : (level === 'warn' ? '⚠' : (level === 'pass' ? '✓' : 'ℹ'));

    const lineData = {
      agentId,
      eventId,
      level,
      rawText: `${ts} ${rawTag} ${icon} ${text}`,
    };

    this.lines.push(lineData);
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }

    const isSupervisor = agentId === 'supervisor';
    const row = document.createElement('div');
    row.className = `soc-console-line ${level} ${isSupervisor ? 'supervisor' : ''}`;
    row.dataset.agentId = agentId;
    row.dataset.level = level;
    row.dataset.eventId = eventId;

    row.innerHTML = `
      <span class="ts">${ts}</span>
      <span class="tag">${rawTag}</span>
      <span class="icon">${icon}</span>
      <span class="msg">${escHtml(text)}</span>
    `;

    row.addEventListener('click', () => {
      bus.emit('event:select', { eventId });
    });

    // Check filter visibility
    if (!this.matchesFilter(agentId, level)) {
      row.style.display = 'none';
    }

    this.viewport.appendChild(row);

    // Prune DOM lines
    while (this.viewport.children.length > this.maxLines) {
      this.viewport.removeChild(this.viewport.firstChild);
    }

    if (this.autoScroll) {
      this.viewport.scrollTop = this.viewport.scrollHeight;
    }
  }

  matchesFilter(agentId, level) {
    if (this.agentFilter !== 'all' && agentId !== this.agentFilter) {
      return false;
    }
    if (this.severityFilter !== 'all') {
      if (this.severityFilter === 'threat' && level !== 'threat') return false;
      if (this.severityFilter === 'warn' && level !== 'warn' && level !== 'threat') return false;
    }
    return true;
  }

  reapplyFilters() {
    if (!this.viewport) return;
    Array.from(this.viewport.children).forEach(row => {
      const aid = row.dataset.agentId;
      const lvl = row.dataset.level;
      row.style.display = this.matchesFilter(aid, lvl) ? 'flex' : 'none';
    });
  }

  clear() {
    if (this.viewport) this.viewport.innerHTML = '';
    this.lines = [];
  }
}
