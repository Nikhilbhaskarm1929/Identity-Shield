/**
 * IdentityShield v3 — SOC Event Trace & Verdict Controller
 * Renders the active investigation trace, 10-block risk gauge,
 * agent checklist, previous vs current login compare box, and dry-run actions.
 */

import { bus } from './bus.js';
import { escHtml } from '/v3/js/core/dom.js';

export class SocTrace {
  constructor(containerEl) {
    this.container = containerEl;
    this.currentEvent = null;
    this.eventChecks = new Map();
    this.bindBusEvents();
  }

  bindBusEvents() {
    bus.on('event:new', ({ event }) => {
      // Keep memory bounded: cap stored event checks
      if (this.eventChecks.size > 50) {
        const oldest = this.eventChecks.keys().next().value;
        this.eventChecks.delete(oldest);
      }
      // Default to displaying incoming event if none selected or if it's suspicious
      if (!this.currentEvent || event.isSuspicious) {
        this.currentEvent = event;
        this.eventChecks.set(event.id, []);
        this.render();
      }
    });

    bus.on('agent:check', ({ agentId, eventId, text, level, ms }) => {
      let checks = this.eventChecks.get(eventId);
      if (!checks) {
        checks = [];
        this.eventChecks.set(eventId, checks);
      }
      checks.push({ agentId, text, level, ms });

      if (this.currentEvent && this.currentEvent.id === eventId) {
        this.appendCheckItem({ agentId, text, level, ms });
      }
    });

    bus.on('event:verdict', ({ eventId, score, level, breakdown, caseId, actions }) => {
      if (this.currentEvent && this.currentEvent.id === eventId) {
        this.updateVerdict({ score, level, breakdown, caseId, actions });
      }
    });

    bus.on('event:select', ({ eventId }) => {
      const checks = this.eventChecks.get(eventId) || [];
      // If we don't have full event object, build proxy
      if (!this.currentEvent || this.currentEvent.id !== eventId) {
        this.currentEvent = {
          id: eventId,
          user: 'omana@corp.example',
          ip: '185.220.101.4',
          geo: { city: 'Moscow', country: 'RU' },
          ts: Date.now(),
        };
      }
      this.render();
      checks.forEach(c => this.appendCheckItem(c));
    });
  }

  render() {
    if (!this.container) return;

    if (!this.currentEvent) {
      this.container.innerHTML = `
        <div class="empty" style="padding:40px; text-align:center; color:var(--text-3); font-size:12px;">
          Listening for identity events… Click any packet or console line to inspect trace.
        </div>
      `;
      return;
    }

    const ev = this.currentEvent;
    const shortId = ev.id || 'EVT-0000';
    const user = ev.user || 'user@corp.example';
    const loc = ev.geo ? `${ev.geo.city}, ${ev.geo.country}` : 'Internal Office';
    const ip = ev.ip || '10.0.4.12';

    this.container.innerHTML = `
      <!-- Header info -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:1px solid var(--border-1);">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="mono accent" style="font-weight:700; font-size:13px;">${escHtml(shortId)}</span>
            <span class="badge neutral mono" style="font-size:10px;">AUTH_LOGIN</span>
          </div>
          <div style="font-weight:600; color:var(--text-1); font-size:13px; margin-top:3px;">
            ${escHtml(user)}
          </div>
          <div class="mono muted" style="font-size:11px; margin-top:2px;">
            ${escHtml(ip)} &middot; ${escHtml(loc)}
          </div>
        </div>
        <span id="trace-verdict-pill" class="badge low mono">EVALUATING</span>
      </div>

      <!-- Risk Gauge: 10 Segmented Blocks -->
      <div class="soc-risk-gauge-wrap">
        <div>
          <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Composite Risk</div>
          <div style="display:flex; align-items:baseline; gap:6px; margin-top:2px;">
            <span id="trace-risk-num" class="mono font-bold" style="font-size:18px; color:var(--green-500);">15</span>
            <span id="trace-risk-level" class="mono muted" style="font-size:11px;">/ 100 LOW</span>
          </div>
        </div>

        <div class="soc-risk-blocks" id="trace-risk-blocks">
          <div class="soc-risk-block active-green"></div>
          <div class="soc-risk-block active-green"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
          <div class="soc-risk-block"></div>
        </div>
      </div>

      <!-- Score Breakdown -->
      <div style="padding:6px 10px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-sm); margin-top:6px;">
        <div class="mono muted" style="font-size:9px; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px;">Score Breakdown</div>
        <div id="trace-score-breakdown" class="mono" style="font-size:11px; color:var(--text-2); word-break:break-word;">
          baseline = 15
        </div>
        <div id="trace-case-wrap" class="mono" style="font-size:11px; margin-top:4px; display:none;"></div>
      </div>

      <!-- Agent Execution Checklist -->
      <div>
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.04em;">
          Pipeline Checks Execution
        </div>
        <div id="trace-checks-list" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto; padding-right:2px;"></div>
      </div>

      <!-- Previous vs Current Login Compare Box -->
      <div>
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.04em;">
          Previous vs Current Login Drift
        </div>
        <div class="compare">
          <div class="compare__row">
            <span class="compare__label">Location</span>
            <span class="compare__val" id="trace-cmp-loc">Bengaluru, IN &rarr; ${escHtml(ev.geo?.city || 'Moscow')}, ${escHtml(ev.geo?.country || 'RU')}</span>
          </div>
          <div class="compare__row">
            <span class="compare__label">Device / OS</span>
            <span class="compare__val" id="trace-cmp-dev">${ev.previous?.device?.os || 'macOS 14'} &rarr; ${ev.device?.os || 'Windows 11 (New)'}</span>
          </div>
          <div class="compare__row">
            <span class="compare__label">Browser</span>
            <span class="compare__val" id="trace-cmp-browser">${ev.previous?.device?.browser || 'Chrome 128'} &rarr; ${ev.device?.browser || 'Edge 129'}</span>
          </div>
          <div class="compare__row">
            <span class="compare__label">MFA Factor</span>
            <span class="compare__val" id="trace-cmp-mfa">Okta Verify Push (Success)</span>
          </div>
        </div>
      </div>

      <!-- Recommended Response -->
      <div id="trace-response-box" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-sm);">
        <div>
          <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Autonomous Response</div>
          <div id="trace-response-actions" style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px;">
            Monitor Workday Activity
          </div>
        </div>
        <span class="badge neutral mono" style="font-size:10px;">dry-run</span>
      </div>
    `;
  }

  appendCheckItem({ agentId, text, level, ms }) {
    const list = this.container.querySelector('#trace-checks-list');
    if (!list) return;

    const icon = level === 'threat' ? '✗' : (level === 'warn' ? '⚠' : '✓');
    const color = level === 'threat' ? 'var(--red-500)' : (level === 'warn' ? 'var(--amber-500)' : 'var(--green-500)');

    const item = document.createElement('div');
    item.className = 'soc-trace-check-item';
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
        <span style="color:${color}; font-weight:700;">${icon}</span>
        <span style="font-weight:700; color:var(--text-1); font-size:10px;">${agentId}</span>
        <span style="color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;">${escHtml(text)}</span>
      </div>
      <span class="mono muted" style="font-size:10px; flex-shrink:0;">${ms || 12}ms</span>
    `;

    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }

  updateVerdict({ score, level, breakdown, caseId, actions }) {
    const pill = this.container.querySelector('#trace-verdict-pill');
    const numEl = this.container.querySelector('#trace-risk-num');
    const levelEl = this.container.querySelector('#trace-risk-level');
    const blocks = this.container.querySelectorAll('.soc-risk-block');
    const respActions = this.container.querySelector('#trace-response-actions');

    const isThreat = level === 'CRITICAL' || level === 'HIGH';
    const isMedium = level === 'MEDIUM';

    if (pill) {
      pill.className = `badge ${isThreat ? 'high' : (isMedium ? 'medium' : 'low')} mono`;
      pill.textContent = level;
    }

    if (numEl) {
      numEl.textContent = score;
      numEl.style.color = isThreat ? 'var(--red-500)' : (isMedium ? 'var(--amber-500)' : 'var(--green-500)');
    }

    if (levelEl) {
      levelEl.textContent = `/ 100 ${level}`;
    }

    // Fill 10 blocks based on score (e.g. 92 = 9 active blocks)
    const filledCount = Math.round(score / 10);
    blocks.forEach((b, idx) => {
      b.className = 'soc-risk-block';
      if (idx < filledCount) {
        if (isThreat) b.classList.add('active-red');
        else if (isMedium) b.classList.add('active-amber');
        else b.classList.add('active-green');
      }
    });

    const breakdownEl = this.container.querySelector('#trace-score-breakdown');
    if (breakdownEl) {
      if (breakdown && Object.keys(breakdown).length > 0) {
        const parts = Object.entries(breakdown)
          .map(([k, v]) => `${escHtml(k)} +${v}`)
          .join(' &middot; ');
        breakdownEl.innerHTML = `${parts} = <span style="font-weight:700; color:${isThreat ? 'var(--red-500)' : (isMedium ? 'var(--amber-500)' : 'var(--green-500)')};">${score}</span>`;
      } else {
        breakdownEl.innerHTML = `baseline = <span style="font-weight:700; color:var(--green-500);">${score}</span>`;
      }
    }

    const caseWrap = this.container.querySelector('#trace-case-wrap');
    if (caseWrap) {
      if (caseId) {
        caseWrap.innerHTML = `Case escalated: <a href="cases.html?id=${encodeURIComponent(caseId)}" class="accent" style="text-decoration:underline; font-weight:700;">${escHtml(caseId)}</a>`;
        caseWrap.style.display = 'block';
      } else {
        caseWrap.style.display = 'none';
      }
    }

    if (respActions) {
      if (actions && actions.length > 0) {
        respActions.innerHTML = actions.join(' &middot; ');
        respActions.style.color = isThreat ? 'var(--red-500)' : 'var(--text-1)';
      } else {
        respActions.textContent = isThreat ? 'Revoke Session &middot; Quarantine Policy' : 'Monitor Workday Ingress';
      }
    }
  }

  clear() {
    this.currentEvent = null;
    this.eventChecks.clear();
    this.render();
  }
}
