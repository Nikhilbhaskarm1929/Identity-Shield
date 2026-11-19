/**
 * IdentityShield v3 — SOC Pipeline Board
 * Renders 5 architecture layer columns, 15 agent cards with state machines,
 * mini sparklines, and opens the Agent Inspector drawer on click.
 */

import { bus } from './bus.js';
import { escHtml } from '/v3/js/core/dom.js';

export const LAYERS = [
  {
    index: 0,
    tag: '01 · INGESTION',
    title: 'Ingestion & Normalization',
    desc: 'Validates and normalizes raw identity streams',
    agents: [
      { id: 'a01', num: '01', key: 'collector', name: 'Collector', desc: 'Okta & CloudTrail Ingest', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
      { id: 'a02', num: '02', key: 'normalizer', name: 'Normalizer', desc: 'ECS / OCSF Normalization', icon: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5' },
      { id: 'a03', num: '03', key: 'enricher', name: 'Context & Intel', desc: 'GeoIP, ASN & Reputation', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0' },
    ]
  },
  {
    index: 1,
    tag: '02 · IDENTITY SIGNALS',
    title: 'Access & Session Anomalies',
    desc: 'Extracts session tokens, geo-velocity, and device drift',
    agents: [
      { id: 'a04', num: '04', key: 'device', name: 'Device Fingerprint', desc: 'Known Device & OS Tracking', icon: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM10 20h4M12 16v4' },
      { id: 'a05', num: '05', key: 'access', name: 'Access Anomaly', desc: 'Policy & App Assignment', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
      { id: 'a06', num: '06', key: 'session', name: 'Session Integrity', desc: 'Token Hijacking & Replay', icon: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' },
    ]
  },
  {
    index: 2,
    tag: '03 · INTEL & CORRELATION',
    title: 'Threat ML & Correlation',
    desc: 'Detects spray attacks, privilege escalation, and ML baselines',
    agents: [
      { id: 'a07', num: '07', key: 'credentials', name: 'Credential Lifecycle', desc: 'MFA Push Fatigue & Spray', icon: 'M21 2l-2 2m-2-2l2 2M3 13l2-2 4 4L19 5l2 2L9 19l-6-6z' },
      { id: 'a08', num: '08', key: 'velocity', name: 'Geo-Velocity', desc: 'Impossible Travel (>900 km/h)', icon: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.8.2-2.3.9l-.5.7 6.1 3.6L6 14.5l-2.4-.4-.8.8 2.6 1.8 1.8 2.6.8-.8-.4-2.4 2.6-2.6 3.6 6.1.7-.5c.7-.5 1.1-1.4.9-2.3z' },
      { id: 'a09', num: '09', key: 'privilege', name: 'Threat Intel & Privilege', desc: 'Feeds & IAM Role Attachment', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { id: 'a10', num: '10', key: 'behavior', name: 'Behavioral ML', desc: 'Isolation Forest Baseline Drift', icon: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z' },
      { id: 'a11', num: '11', key: 'correlation', name: 'Campaign Cluster', desc: 'MITRE ATT&CK Clustering', icon: 'M18 18.72a9 9 0 1 1 0-13.44M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
    ]
  },
  {
    index: 3,
    tag: '04 · DECISION',
    title: 'Fusion & Response',
    desc: 'Composite risk scoring, evidence synthesis, and containment',
    agents: [
      { id: 'a12', num: '12', key: 'fusion', name: 'Risk Fusion', desc: 'Bayesian Weight Aggregation', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
      { id: 'a13', num: '13', key: 'investigation', name: 'Investigation', desc: 'Evidence & Case Synthesis', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
      { id: 'a14', num: '14', key: 'response', name: 'Response', desc: 'Autonomous Session Containment', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01' },
    ]
  },
  {
    index: 4,
    tag: '05 · LEARNING',
    title: 'Continuous Tuning',
    desc: 'Analyst feedback ingestion and threshold auto-calibration',
    agents: [
      { id: 'a15', num: '15', key: 'feedback', name: 'Feedback & Tuning', desc: 'False Positive Suppression', icon: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5' },
    ]
  }
];

export class SocBoard {
  constructor(containerEl) {
    this.container = containerEl;
    this.agentCards = new Map();
    this.counters = { processed: {}, flagged: {} };
    this.init();
    this.bindBusEvents();
  }

  init() {
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    LAYERS.forEach(layer => {
      const col = document.createElement('div');
      col.className = 'soc-layer-col';
      col.dataset.layerIndex = layer.index;

      col.innerHTML = `
        <div class="soc-layer-head">
          <div>
            <div class="soc-layer-tag">${escHtml(layer.tag)}</div>
            <div class="soc-layer-title">${escHtml(layer.title)}</div>
            <div class="text-dim" style="font-size:11px; margin-top:2px;">${escHtml(layer.desc)}</div>
          </div>
          <span class="soc-layer-count" id="layer-cnt-${layer.index}">0 evts</span>
        </div>
        <div class="soc-layer-cards" style="display:flex; flex-direction:column; gap:10px;"></div>
      `;

      const cardsContainer = col.querySelector('.soc-layer-cards');

      layer.agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'soc-agent-card';
        card.dataset.agentId = agent.id;
        card.dataset.state = 'idle';

        this.counters.processed[agent.id] = Math.floor(Math.random() * 200 + 40);
        this.counters.flagged[agent.id] = (agent.id === 'a08' || agent.id === 'a07') ? 1 : 0;

        card.innerHTML = `
          <div class="soc-agent-card-head">
            <div class="soc-agent-identity">
              <div class="soc-agent-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="${agent.icon}"/>
                </svg>
              </div>
              <span class="soc-agent-num">${agent.num}</span>
              <span class="soc-agent-name" title="${escHtml(agent.name)}">${escHtml(agent.name)}</span>
            </div>
            <span class="soc-agent-status-pill">○ IDLE</span>
          </div>

          <div class="soc-agent-check-line dim" id="check-${agent.id}">Waiting for events…</div>

          <div class="soc-agent-progress">
            <div class="soc-agent-progress-fill" id="prog-${agent.id}"></div>
          </div>

          <div class="soc-agent-metrics">
            <span>⟳ <strong id="cnt-p-${agent.id}" class="mono">${this.counters.processed[agent.id]}</strong></span>
            <span>⚑ <strong id="cnt-f-${agent.id}" class="mono ${this.counters.flagged[agent.id] > 0 ? 'text-danger' : ''}">${this.counters.flagged[agent.id]}</strong></span>
            <span>⏱ <span id="lat-${agent.id}" class="mono">8ms</span></span>
          </div>
        `;

        card.addEventListener('click', () => {
          this.openAgentDrawer(agent);
        });

        cardsContainer.appendChild(card);
        this.agentCards.set(agent.id, card);
      });

      this.container.appendChild(col);
    });
  }

  bindBusEvents() {
    bus.on('agent:state', ({ agentId, state, eventId }) => {
      const card = this.agentCards.get(agentId);
      if (!card) return;

      card.dataset.state = state;
      const pill = card.querySelector('.soc-agent-status-pill');
      const prog = card.querySelector('.soc-agent-progress-fill');

      if (state === 'idle') {
        if (pill) pill.innerHTML = '○ IDLE';
        if (prog) prog.style.width = '0%';
      } else if (state === 'receiving') {
        if (pill) pill.innerHTML = '● RECEIVING';
        if (prog) prog.style.width = '20%';
      } else if (state === 'scanning') {
        if (pill) pill.innerHTML = '<span class="pill__dot good"></span> SCANNING';
        if (prog) prog.style.width = '45%';
      } else if (state === 'analyzing') {
        if (pill) pill.innerHTML = '<span class="pill__dot good"></span> ANALYZING';
        if (prog) prog.style.width = '75%';
      } else if (state === 'pass') {
        if (pill) pill.innerHTML = '✓ CLEAR';
        if (prog) prog.style.width = '100%';
        this.incrementProcessed(agentId);
        setTimeout(() => {
          if (card.dataset.state === 'pass') card.dataset.state = 'idle';
        }, 1200);
      } else if (state === 'warn') {
        if (pill) pill.innerHTML = '⚠ ANOMALY';
        if (prog) prog.style.width = '100%';
        this.incrementProcessed(agentId);
        setTimeout(() => {
          if (card.dataset.state === 'warn') card.dataset.state = 'idle';
        }, 2500);
      } else if (state === 'flagged') {
        if (pill) pill.innerHTML = '⚑ THREAT';
        if (prog) prog.style.width = '100%';
        this.incrementProcessed(agentId);
        this.incrementFlagged(agentId);
      } else if (state === 'blocked') {
        if (pill) pill.innerHTML = '⛔ CONTAINED';
        if (prog) prog.style.width = '100%';
      }
    });

    bus.on('agent:check', ({ agentId, text, level, ms }) => {
      const card = this.agentCards.get(agentId);
      if (!card) return;

      const line = card.querySelector(`#check-${agentId}`);
      if (line) {
        line.className = `soc-agent-check-line ${level === 'threat' ? 'text-danger' : (level === 'warn' ? 'text-warn' : '')}`;
        line.textContent = `▸ ${text}`;
      }

      const lat = card.querySelector(`#lat-${agentId}`);
      if (lat && ms) lat.textContent = `${ms}ms`;
    });

    bus.on('packet:move', ({ toLayer }) => {
      const cnt = document.getElementById(`layer-cnt-${toLayer}`);
      if (cnt) {
        const cur = parseInt(cnt.textContent, 10) || 0;
        cnt.textContent = `${cur + 1} evts`;
      }
    });
  }

  incrementProcessed(agentId) {
    this.counters.processed[agentId] = (this.counters.processed[agentId] || 0) + 1;
    const el = document.getElementById(`cnt-p-${agentId}`);
    if (el) el.textContent = this.counters.processed[agentId];
  }

  incrementFlagged(agentId) {
    this.counters.flagged[agentId] = (this.counters.flagged[agentId] || 0) + 1;
    const el = document.getElementById(`cnt-f-${agentId}`);
    if (el) {
      el.textContent = this.counters.flagged[agentId];
      el.className = 'mono text-danger font-bold';
    }
  }

  openAgentDrawer(agent) {
    const drawer = document.getElementById('agent-drawer');
    const backdrop = document.getElementById('agent-drawer-backdrop');
    const title = document.getElementById('drawer-agent-title');
    const desc = document.getElementById('drawer-agent-desc');
    const layerEl = document.getElementById('drawer-agent-layer');

    if (!drawer) return;

    if (title) title.textContent = `${agent.num} · ${agent.name}`;
    if (desc) desc.textContent = agent.desc;
    if (layerEl) layerEl.textContent = `AGENT a${agent.num} // ${agent.key.toUpperCase()}`;

    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  reset() {
    this.agentCards.forEach(card => {
      card.dataset.state = 'idle';
      const pill = card.querySelector('.soc-agent-status-pill');
      const prog = card.querySelector('.soc-agent-progress-fill');
      const check = card.querySelector('.soc-agent-check-line');
      if (pill) pill.innerHTML = '○ IDLE';
      if (prog) prog.style.width = '0%';
      if (check) {
        check.className = 'soc-agent-check-line dim';
        check.textContent = 'Waiting for events…';
      }
    });
  }
}
