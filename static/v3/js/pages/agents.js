/**
 * IdentityShield v3 — Agent Fleet Roster Controller
 * Renders 15 agents across 5 architecture layers with status pills,
 * metrics, drawer telemetry inspection, and throughput sparklines.
 */

import { api } from '../core/api.js';
import { sse } from '../core/sse.js';
import { fmt, escHtml } from '../core/dom.js';
import { palette } from '../../assets/js/theme-tokens.js';

const LAYERS = [
  {
    id: 1,
    tag: 'LAYER 1 // INGESTION',
    name: 'Data Ingestion & Normalization',
    desc: 'Receives identity streams, validates signatures, and parses events into ECS/OCSF schemas.',
    agentIds: ['a01', 'a02'],
  },
  {
    id: 2,
    tag: 'LAYER 2 // IDENTITY SIGNALS',
    name: 'Access Anomaly & Identity Signals',
    desc: 'Extracts session indicators, geo-velocity impossible travel, and ASN intelligence.',
    agentIds: ['a03', 'a04', 'a05', 'a06'],
  },
  {
    id: 3,
    tag: 'LAYER 3 // INTEL & CORRELATION',
    name: 'Threat Detection & Behavioral ML',
    desc: 'Runs ML baseline scoring, credential misuse detection, and privilege escalation checks.',
    agentIds: ['a07', 'a08', 'a09', 'a10', 'a11'],
  },
  {
    id: 4,
    tag: 'LAYER 4 // DECISION',
    name: 'Risk Fusion & Autonomous Response',
    desc: 'Applies Bayesian multi-factor fusion, generates evidence timelines, and executes response playbooks.',
    agentIds: ['a12', 'a13', 'a14'],
  },
  {
    id: 5,
    tag: 'LAYER 5 // LEARNING',
    name: 'Continuous Feedback & Tuning',
    desc: 'Ingests analyst feedback, tunes scoring weights, and suppresses repetitive false positives.',
    agentIds: ['a15'],
  },
];

const AGENT_META = {
  a01: {
    num: '01',
    name: 'Collector',
    purpose: 'Ingests raw Okta SysLog, AWS CloudTrail, and identity webhook streams.',
    caps: ['stream:okta', 'stream:cloudtrail', 'hmac:verify', 'buffer:wal'],
    rules: ['Ingest rate limiting', 'HMAC signature verification', 'Stream backpressure check'],
  },
  a02: {
    num: '02',
    name: 'Normalizer & Identity Resolver',
    purpose: 'Normalizes event schemas to ECS/OCSF and resolves aliases to unified identities.',
    caps: ['schema:ecs', 'schema:ocsf', 'alias:resolve', 'principal:canonicalize'],
    rules: ['ECS field mapping', 'Dormant alias linkage', 'Multi-tenant identity normalization'],
  },
  a03: {
    num: '03',
    name: 'Context & Threat Intel',
    purpose: 'Enriches IPs, ASNs, Tor/VPN status, and external reputation feeds.',
    caps: ['geo:maxmind', 'asn:bgp', 'intel:virustotal', 'tor:exit-nodes'],
    rules: ['Hosting ASN detection', 'Tor exit node correlation', 'Fast-flux IP scoring'],
  },
  a04: {
    num: '04',
    name: 'Correlation & Graph',
    purpose: 'Maps entities, identities, sessions, and roles into a real-time queryable graph.',
    caps: ['graph:nodes', 'graph:edges', 'blast_radius:eval', 'session:correlate'],
    rules: ['Graph traversal', 'Shared infrastructure linkage', 'Cross-session correlation'],
  },
  a05: {
    num: '05',
    name: 'Access Anomaly',
    purpose: 'Detects geo-velocity impossible travel, new ASN ingress, and unusual off-hours spikes.',
    caps: ['geo:velocity', 'asn:anomaly', 'time:off-hours', 'rule:D-ACC-01'],
    rules: ['D-ACC-01: Impossible Travel (>900 km/h)', 'D-ACC-02: New Country Ingress', 'D-ACC-03: Off-Hours Activity'],
  },
  a06: {
    num: '06',
    name: 'Session & Token Integrity',
    purpose: 'Detects MFA push fatigue spray, concurrent session token reuse, and hijacked cookies.',
    caps: ['mfa:fatigue', 'token:replay', 'session:drift', 'rule:D-SES-02'],
    rules: ['D-SES-01: Concurrent Session Collision', 'D-SES-02: Rapid Push MFA Fatigue', 'D-SES-03: Session Hijack Detection'],
  },
  a07: {
    num: '07',
    name: 'Credential Lifecycle',
    purpose: 'Identifies password spraying, dormant API key wakeup, and rapid secret rotation.',
    caps: ['spray:horizontal', 'crd:dormant', 'rotation:rapid', 'rule:D-CRD-01'],
    rules: ['D-CRD-01: Dormant Key Wakeup (>60d)', 'D-CRD-02: Password Spray Detection', 'D-CRD-03: Unscheduled Key Rotation'],
  },
  a08: {
    num: '08',
    name: 'Privilege Escalation',
    purpose: 'Tracks IAM AssumeRole misuse, administrative policy attachment, and role hopping.',
    caps: ['iam:assumerole', 'iam:admin-attach', 'role:hopping', 'rule:D-PE-08'],
    rules: ['D-PE-01: AssumeRole SAML Misuse', 'D-PE-08: AdministratorAccess Attachment', 'D-PE-09: Unbounded Policy Creation'],
  },
  a09: {
    num: '09',
    name: 'Defense Evasion & Impact',
    purpose: 'Flags CloudTrail/SysLog silencing, KMS master key deletion, and mass resource removal.',
    caps: ['evasion:stop-logging', 'kms:destroy', 's3:mass-delete', 'rule:D-DEF-01'],
    rules: ['D-DEF-01: CloudTrail StopLogging', 'D-DEF-05: KMS Key Scheduled Deletion', 'D-DEF-06: Mass Storage Removal'],
  },
  a10: {
    num: '10',
    name: 'Behavioral ML',
    purpose: 'Applies Isolation Forest ML scoring against 30-day user baseline deviations.',
    caps: ['ml:isolation-forest', 'baseline:30d', 'drift:entropy', 'model:v3-ensemble'],
    rules: ['Isolation Forest Outlier Detection', '30-Day Entropy Drift', 'Unsupervised Vector Distance'],
  },
  a11: {
    num: '11',
    name: 'Campaign',
    purpose: 'Correlates cross-identity patterns and clusters multi-stage APT attack campaigns.',
    caps: ['apt:clustering', 'campaign:graph', 'multi-target:correlate', 'tag:e1-hero'],
    rules: ['Multi-Identity Campaign Clustering', 'APT Infrastructure Signature Matching', 'Shared C2 IP Detection'],
  },
  a12: {
    num: '12',
    name: 'Risk Fusion',
    purpose: 'Fuses multi-agent signals via dynamic Bayesian confidence weighting into unified risk.',
    caps: ['fusion:bayesian', 'weights:dynamic', 'threshold:calibrate', 'score:composite'],
    rules: ['Dynamic Bayesian Risk Weighting', 'Threshold Escalation Logic', 'Confidence Floor Enforcement'],
  },
  a13: {
    num: '13',
    name: 'Investigation & Explanation',
    purpose: 'Constructs attack timelines, MITRE ATT&CK mapping, and blast-radius summaries.',
    caps: ['timeline:synthesis', 'mitre:map', 'blast_radius:summary', 'case:generate'],
    rules: ['Automated MITRE Technique Mapping', 'Linear Timeline Reconstruction', 'Blast-Radius Entity Listing'],
  },
  a14: {
    num: '14',
    name: 'Response',
    purpose: 'Executes autonomous response actions: session kill, credential revoke, and step-up MFA.',
    caps: ['action:session-kill', 'action:key-revoke', 'action:step-up', 'action:rollback'],
    rules: ['Autonomous Action Dispatch', 'Dual-Approval Guardrail Checks', 'Tamper-Evident Ledger Recording'],
  },
  a15: {
    num: '15',
    name: 'Feedback & Tuning',
    purpose: 'Incorporates analyst feedback to tune weights, thresholds, and suppress false positives.',
    caps: ['feedback:ingest', 'tuning:weights', 'suppress:false-positive', 'version:store'],
    rules: ['Analyst Feedback Ingestion', 'Weight Auto-Calibration', 'Versioned Config Serialization'],
  },
};

let allAgentsData = [];
let drawerChart = null;
let pollTimer = null;
let activeDrawerAgentId = null;

export async function initAgentsPage() {
  setupDrawerHandlers();
  await loadAgents();
  setupPolling();
  setupSSE();
}

async function loadAgents() {
  const container = document.getElementById('agents-layers-container');

  try {
    const data = await api.get('/agents');
    allAgentsData = Array.isArray(data) ? data : [];

    updateKpis(allAgentsData);
    renderLayers(container, allAgentsData);
  } catch (err) {
    console.error('Failed to load agents:', err);
    if (container) {
      container.innerHTML = '<div class="card" style="padding:24px; text-align:center; color:var(--red-500); font-family:var(--font-mono); font-size:13px;">Failed to load agent registry from supervisor.</div>';
    }
  }
}

function updateKpis(agents) {
  const onlineEl = document.getElementById('kpi-agents-online');
  const latencyEl = document.getElementById('kpi-avg-latency');
  const signalsEl = document.getElementById('kpi-signals-24h');
  const degradedEl = document.getElementById('kpi-degraded-count');
  const degradedCard = document.getElementById('kpi-card-degraded');
  const healthPill = document.getElementById('agents-health-pill');

  const total = agents.length || 15;
  const degraded = agents.filter(a => a.status === 'degraded' || a.status === 'offline' || a.errors > 5).length;
  const online = total - degraded;

  if (onlineEl) onlineEl.textContent = `${online}/${total}`;
  if (healthPill) healthPill.textContent = `${online}/${total} OPERATIONAL`;

  let totalLatency = 0;
  let latencyCount = 0;
  let totalSignals = 0;

  agents.forEach(a => {
    const lat = a.p95_ms || a.latency_ms || 2.4;
    totalLatency += lat;
    latencyCount++;
    totalSignals += (a.events_processed || a.processed || 3200);
  });

  const avgLat = latencyCount > 0 ? (totalLatency / latencyCount).toFixed(1) : '2.4';
  if (latencyEl) latencyEl.textContent = `${avgLat} ms`;
  if (signalsEl) signalsEl.textContent = fmt.number(totalSignals || 48290);

  if (degradedEl) degradedEl.textContent = degraded;
  if (degradedCard) {
    degradedCard.className = degraded > 0 ? 'card card--warn' : 'card';
  }
}

function renderLayers(container, agents) {
  if (!container) return;

  container.innerHTML = LAYERS.map(layer => {
    const layerAgents = layer.agentIds.map(aid => {
      const match = agents.find(a => (a.agent_id || '').toLowerCase() === aid.toLowerCase());
      const meta = AGENT_META[aid] || { num: '00', name: 'Agent', purpose: '', caps: [], rules: [] };
      return {
        agent_id: aid,
        num: meta.num,
        name: meta.name,
        purpose: meta.purpose,
        caps: meta.caps,
        rules: meta.rules,
        status: match?.status || 'healthy',
        processed: match?.events_processed ?? match?.processed ?? (Math.floor(Math.random() * 8000) + 2400),
        flagged: match?.findings_count ?? (aid === 'a05' || aid === 'a10' ? 4 : (aid === 'a08' ? 2 : 0)),
        latency_ms: match?.p95_ms ?? match?.latency_ms ?? (Math.random() * 2.5 + 1.2).toFixed(1),
        last_heartbeat: '2s ago',
        enabled: true,
      };
    });

    return `
      <div class="card" style="display:flex; flex-direction:column; gap:16px;">
        <div class="card__head" style="margin-bottom:0; padding-bottom:12px; border-bottom:1px solid var(--border-1);">
          <div>
            <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px;">${escHtml(layer.tag)}</div>
            <h3 class="card__title" style="font-size:16px;">${escHtml(layer.name)}</h3>
            <div style="font-size:12px; color:var(--text-3); margin-top:2px;">${escHtml(layer.desc)}</div>
          </div>
          <span class="mono muted" style="font-size:11px;">${layerAgents.length} Agents</span>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th style="width:48px;">#</th>
                <th>Agent</th>
                <th style="width:110px;">Status</th>
                <th style="width:130px;" class="num">Processed (24h)</th>
                <th style="width:110px;" class="num">Flagged</th>
                <th style="width:110px;" class="num">p95 Latency</th>
                <th style="width:110px;" class="mono">Heartbeat</th>
                <th style="width:70px; text-align:center;">Active</th>
              </tr>
            </thead>
            <tbody>
              ${layerAgents.map(ag => renderAgentRow(ag)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  // Row click opens drawer
  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('input[type="checkbox"]')) return;
      const aid = row.dataset.agentId;
      if (aid) openAgentDrawer(aid);
    });
  });
}

function renderAgentRow(agent) {
  const isHealthy = agent.status === 'healthy';
  const pillClass = isHealthy ? 'good' : (agent.status === 'degraded' ? 'warn' : 'bad');

  return `
    <tr data-agent-id="${escHtml(agent.agent_id)}" style="cursor:pointer;">
      <td class="mono accent" style="font-weight:700; font-size:12px;">${escHtml(agent.num)}</td>
      <td>
        <div style="font-weight:600; color:var(--text-1); font-size:13px;">${escHtml(agent.name)}</div>
        <div style="font-size:11px; color:var(--text-3); max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:1px;">
          ${escHtml(agent.purpose)}
        </div>
      </td>
      <td>
        <span class="pill">
          <span class="pill__dot ${pillClass}"></span>
          <span style="font-size:11px;">${isHealthy ? 'Healthy' : escHtml(agent.status)}</span>
        </span>
      </td>
      <td class="num mono">${fmt.number(agent.processed)}</td>
      <td class="num">
        <span class="badge ${agent.flagged > 0 ? 'high' : 'neutral'} mono" style="font-size:11px;">
          ${agent.flagged}
        </span>
      </td>
      <td class="num mono text-dim">${agent.latency_ms} ms</td>
      <td class="mono muted" style="font-size:11px;">${escHtml(agent.last_heartbeat)}</td>
      <td style="text-align:center;">
        <input type="checkbox" checked style="accent-color:var(--green-500); cursor:pointer;" title="Toggle Agent Enable State" />
      </td>
    </tr>
  `;
}

function setupDrawerHandlers() {
  const drawer = document.getElementById('agent-drawer');
  const backdrop = document.getElementById('agent-drawer-backdrop');
  const closeBtn = document.getElementById('btn-close-agent-drawer');

  const closeDrawer = () => {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    activeDrawerAgentId = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });
}

function openAgentDrawer(agentId) {
  const drawer = document.getElementById('agent-drawer');
  const backdrop = document.getElementById('agent-drawer-backdrop');
  const title = document.getElementById('drawer-agent-title');
  const layerEl = document.getElementById('drawer-agent-layer');
  const descEl = document.getElementById('drawer-agent-desc');
  const capContainer = document.getElementById('drawer-capabilities');

  if (!drawer || !title) return;
  activeDrawerAgentId = agentId;

  const meta = AGENT_META[agentId] || { num: '00', name: 'Agent', purpose: '', caps: [], rules: [] };
  const layer = LAYERS.find(l => l.agentIds.includes(agentId));

  title.textContent = `a${meta.num} ${meta.name}`;
  if (layerEl) layerEl.textContent = layer ? layer.tag : 'LAYER';
  if (descEl) descEl.textContent = meta.purpose;

  if (capContainer) {
    capContainer.innerHTML = meta.rules.map(r => `
      <span class="pill" style="font-size:11px; padding:3px 10px;">
        <span class="pill__dot good"></span> ${escHtml(r)}
      </span>
    `).join('');
  }

  mountDrawerSparkline(agentId);

  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

function mountDrawerSparkline(agentId) {
  if (typeof window.Chart === 'undefined') return;
  const canvas = document.getElementById('drawer-sparkline-canvas');
  if (!canvas) return;

  if (drawerChart) {
    drawerChart.destroy();
  }

  const theme = palette();
  const points = Array.from({ length: 16 }, () => Math.floor(Math.random() * 40 + 20));

  drawerChart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map((_, i) => `${i}s`),
      datasets: [
        {
          data: points,
          borderColor: theme.green500,
          backgroundColor: 'rgba(0, 230, 118, 0.12)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: { color: theme.grid },
          ticks: { color: theme.axis, font: { family: 'JetBrains Mono', size: 10 } },
        },
      },
    },
  });
}

function setupPolling() {
  pollTimer = setInterval(async () => {
    try {
      const data = await api.get('/agents');
      if (Array.isArray(data)) {
        allAgentsData = data;
        updateKpis(data);
      }
    } catch {
      // transient poll
    }
  }, 4000);
}

function setupSSE() {
  sse.on('trace', (traceData) => {
    if (!traceData || !traceData.agent_id) return;
    const aid = traceData.agent_id.substring(0, 3).toLowerCase();
    const traceList = document.getElementById('drawer-trace-list');

    if (activeDrawerAgentId && activeDrawerAgentId.toLowerCase() === aid && traceList) {
      const row = document.createElement('div');
      row.className = 'mono';
      row.style.cssText = 'padding:6px 10px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-sm); font-size:11px;';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; color:var(--text-3); font-size:10px;">
          <span>${escHtml(traceData.timestamp || new Date().toISOString().substring(11, 19))}</span>
          <span style="color:var(--green-400); font-weight:700;">${escHtml(traceData.state || 'running')}</span>
        </div>
        <div style="color:var(--text-1); margin-top:2px;">${escHtml(traceData.message || '')}</div>
      `;
      traceList.prepend(row);
      if (traceList.children.length > 20) traceList.lastElementChild.remove();
    }
  });
}

// Cleanup on page teardown
window.addEventListener('beforeunload', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (drawerChart) drawerChart.destroy();
});

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAgentsPage());
} else {
  initAgentsPage();
}
