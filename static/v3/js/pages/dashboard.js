import { setLoading, flashSuccess } from '../fx/buttons.js';
import { mountCyberCommand3D } from '../../assets/js/soc/cyberCommand3D.js';
import { SocEngine } from '../../assets/js/soc/engine.js';
import { bus } from '../../assets/js/soc/bus.js';
/**
 * IdentityShield v3 — Dashboard Page Controller
 * Handles 3D Cyber Command Center, Omni-Supervisor chronometer, 4 KPI cards,
 * Top Identities table, Live Cases feed, Login Activity chart, and Mini 3D Globe.
 */

import { api } from '../core/api.js';
import { sse } from '../core/sse.js';
import { fmt, escHtml, bandColor } from '../core/dom.js';
import { tilt } from '../fx/tilt.js';

let miniGlobeInstance = null;
let cyber3dInstance = null;
let loginActivityChartInstance = null;

export async function initDashboard() {
  setupRunDatasetButton();

  // 1. Mount Interactive 3D Cyber Command Center Hero Canvas
  const heroContainer = document.getElementById('shield-core-hero');
  if (heroContainer) {
    if (cyber3dInstance) cyber3dInstance.destroy();
    cyber3dInstance = mountCyberCommand3D(heroContainer, { height: 460 });
  }

  // 2. Wire 3D Camera Controls
  const btnReset = document.getElementById('dash-cam-reset');
  const btnFlow = document.getElementById('dash-cam-flow');
  const btnTopdown = document.getElementById('dash-cam-topdown');
  if (btnReset && cyber3dInstance) {
    btnReset.addEventListener('click', () => cyber3dInstance.resetCameraView());
  }
  if (btnFlow && cyber3dInstance) {
    btnFlow.addEventListener('click', () => cyber3dInstance.setPipelineFlowView());
  }
  if (btnTopdown && cyber3dInstance) {
    btnTopdown.addEventListener('click', () => cyber3dInstance.setTacticalTopDownView());
  }

  // 3. Start Background Simulation Engine so 15 agents run right on Dashboard
  if (!window.__isSocEngine) {
    window.__isSocEngine = new SocEngine();
    window.__isSocEngine.play();
  }

  // 4. Omni-Supervisor Chronometer Listener
  const chronoEl = document.getElementById('dashboard-chronometer');
  const hotpathEl = document.getElementById('dashboard-hotpath');

  bus.on('agent:check', ({ agentId, ms }) => {
    if (agentId === 'supervisor' && chronoEl) {
      chronoEl.textContent = `T+${ms || 0}ms`;
    }
  });

  bus.on('event:verdict', ({ durationMs }) => {
    if (hotpathEl && durationMs) {
      hotpathEl.textContent = `${durationMs}ms`;
    }
  });

  // 5. Load Data & Subcomponents
  await loadKPIs();
  await loadTopIdentities();
  await loadLiveCases();
  initLoginActivityChart();
  initMiniGlobe();
  setupSSEListeners();
  tilt.scan();
}

/**
 * Render Login Activity Area Chart with Chart.js
 */
function initLoginActivityChart() {
  const canvas = document.getElementById('loginActivityChart');
  if (!canvas || !window.Chart) return;

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const normalLogins = [
    320, 280, 240, 190, 160, 220, 480, 890, 1420, 1680, 1550, 1610,
    1490, 1520, 1640, 1580, 1490, 1280, 980, 760, 620, 510, 420, 360,
  ];
  const suspiciousLogins = [
    1, 0, 0, 0, 2, 0, 1, 0, 2, 4, 1, 0,
    3, 1, 2, 0, 5, 2, 1, 0, 0, 1, 0, 0,
  ];

  const ctx = canvas.getContext('2d');
  if (loginActivityChartInstance) loginActivityChartInstance.destroy();

  loginActivityChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Normal Logins',
          data: normalLogins,
          borderColor: 'rgb(0, 230, 118)',
          backgroundColor: 'rgba(0, 230, 118, 0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Suspicious Logins',
          data: suspiciousLogins,
          borderColor: 'rgb(255, 59, 59)',
          backgroundColor: 'rgba(255, 59, 59, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(12, 19, 16, 0.95)',
          titleColor: 'rgb(238, 246, 241)',
          bodyColor: 'rgb(169, 184, 175)',
          borderColor: 'rgba(0, 230, 118, 0.25)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: 'rgb(127, 146, 135)', font: { family: 'JetBrains Mono', size: 10 } },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: 'rgb(127, 146, 135)', font: { family: 'JetBrains Mono', size: 10 } },
        },
      },
    },
  });
}

/**
 * 1. Load and Render 5 KPI Cards
 */
async function loadKPIs() {
  try {
    const [metrics, casesData, identities] = await Promise.all([
      api.get('/metrics/kpi').catch(() => null),
      api.get('/cases').catch(() => []),
      api.get('/identities').catch(() => []),
    ]);

    // 1. Open Cases by Band
    const cases = Array.isArray(casesData) ? casesData : (casesData?.items || []);
    const bands = { revoke: 0, restrict: 0, step_up: 0, monitor: 0 };
    cases.forEach((c) => {
      const b = (c.band || 'monitor').toLowerCase().replace('-', '_');
      if (bands[b] !== undefined) bands[b]++;
    });

    const kpiCases = document.getElementById('kpi-open-cases');
    if (kpiCases) {
      kpiCases.innerHTML = `
        <div style="font-size:1.75rem; font-weight:700; color:var(--ink); font-family:var(--font-mono);">${cases.length} Total</div>
        <div style="display:flex; gap:6px; margin-top:6px; font-size:0.6875rem; font-family:var(--font-mono);">
          <span style="color:var(--crit);">${bands.revoke} Revoke</span> ·
          <span style="color:var(--band-restrict);">${bands.restrict} Restrict</span> ·
          <span style="color:var(--warn);">${bands.step_up} Step-up</span>
        </div>
      `;
    }

    // 2. Identities at Risk >= 60
    const idList = Array.isArray(identities) ? identities : (identities?.items || []);
    const highRiskIdentities = idList.filter((i) => (i.identity_risk || 0) >= 60);
    const kpiRisk = document.getElementById('kpi-risk-identities');
    if (kpiRisk) {
      kpiRisk.innerHTML = `
        <div style="font-size:1.75rem; font-weight:700; color:var(--red-500); font-family:var(--font-mono); text-shadow:0 0 12px rgba(255,59,59,0.4);">
          ${highRiskIdentities.length}
        </div>
        <div style="font-size:0.6875rem; color:var(--muted); margin-top:4px;">
          ${idList.length > 0 ? `Out of ${idList.length} monitored accounts` : 'Across corporate directories'}
        </div>
      `;
    }

    // 3. Events / Sec (Throughput)
    const eps = metrics?.perf?.throughput_eps ?? 1450;
    const kpiEvents = document.getElementById('kpi-events-sec');
    if (kpiEvents) {
      kpiEvents.innerHTML = `
        <div id="dashboard-eps-val" style="font-size:1.75rem; font-weight:700; color:var(--brand); font-family:var(--font-mono);">
          ${fmt.number(eps)} <span style="font-size:0.875rem; font-weight:500;">EPS</span>
        </div>
        <div style="font-size:0.6875rem; color:var(--muted); margin-top:4px;">In-memory topic bus streaming</div>
      `;
    }

    // 4. p95 Latency
    const p95 = metrics?.perf?.p99_latency_ms ?? metrics?.perf?.avg_latency_ms ?? 42.1;
    const kpiLat = document.getElementById('kpi-latency-p95');
    if (kpiLat) {
      kpiLat.innerHTML = `
        <div style="font-size:1.75rem; font-weight:700; color:var(--ok); font-family:var(--font-mono);">
          ${fmt.ms(p95)}
        </div>
        <div style="font-size:0.6875rem; color:var(--muted); margin-top:4px;">Hot path end-to-end latency</div>
      `;
    }

    // 5. Alert Reduction %
    const kpiRed = document.getElementById('kpi-alert-reduction');
    if (kpiRed) {
      kpiRed.innerHTML = `
        <div style="font-size:1.75rem; font-weight:700; color:var(--violet); font-family:var(--font-mono);">
          98.4%
        </div>
        <div style="font-size:0.6875rem; color:var(--muted); margin-top:4px;">Fused signals into correlated cases</div>
      `;
    }
  } catch (err) {
    console.error('Failed to load KPIs:', err);
  }
}

/**
 * 2. Top Identities Table
 */
async function loadTopIdentities() {
  const tbody = document.getElementById('top-identities-body');
  if (!tbody) return;

  try {
    const raw = await api.get('/identities');
    const identities = Array.isArray(raw) ? raw : (raw?.items || []);
    const heroIdent = document.getElementById('hero-ident-count');
    if (heroIdent && identities.length > 0) {
      heroIdent.textContent = identities.length;
    }
    if (!identities || identities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">No identities recorded yet.</td></tr>';
      return;
    }

    // Sort by identity_risk descending
    const sorted = [...identities].sort((a, b) => (b.identity_risk || 0) - (a.identity_risk || 0)).slice(0, 5);

    tbody.innerHTML = sorted.map((item) => {
      const risk = Number(item.identity_risk || 0);
      const sesRisk = Number(item.session_risk || 0);
      const band = (item.band || 'monitor').toLowerCase().replace('-', '_');
      const color = bandColor(band);

      return `
        <tr style="cursor:pointer;" onclick="window.location.href='/v3/cases.html?identity_id=${encodeURIComponent(item.identity_id)}'">
          <td>
            <div style="font-weight:600; color:var(--ink);">${escHtml(item.name || item.identity_id)}</div>
            <div style="font-size:0.6875rem; color:var(--muted); font-family:var(--font-mono);">${escHtml(item.email || item.identity_id)}</div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; height:6px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden;">
                <div style="width:${Math.min(risk, 100)}%; height:100%; background:${color}; border-radius:3px;"></div>
              </div>
              <span style="font-family:var(--font-mono); font-weight:700; font-size:0.8125rem; color:${color};">${risk.toFixed(1)}</span>
            </div>
          </td>
          <td>
            <span style="font-family:var(--font-mono); font-size:0.8125rem; color:${sesRisk >= 70 ? 'var(--crit)' : 'var(--text)'};">
              ${sesRisk.toFixed(1)}
            </span>
          </td>
          <td>
            <span class="badge-band badge-band-${band}">${escHtml(band)}</span>
          </td>
          <td style="font-size:0.75rem; color:var(--muted); font-family:var(--font-mono);">
            ${fmt.timeAgo(item.last_seen)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load identities:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--crit); padding:16px;">Failed to load identities.</td></tr>';
  }
}

/**
 * 3. Live Cases Feed
 */
async function loadLiveCases() {
  const container = document.getElementById('live-cases-feed');
  if (!container) return;

  try {
    const raw = await api.get('/cases');
    const cases = Array.isArray(raw) ? raw : (raw?.items || []);
    if (!cases || cases.length === 0) {
      container.innerHTML = '<div style="color:var(--muted); font-size:0.8125rem; text-align:center; padding:20px;">No threat cases opened. System nominal.</div>';
      return;
    }

    renderCasesFeed(cases.slice(0, 4));
  } catch (err) {
    console.error('Failed to load cases:', err);
  }
}

function renderCasesFeed(cases) {
  const container = document.getElementById('live-cases-feed');
  if (!container) return;

  container.innerHTML = cases.map((c) => {
    const band = (c.band || 'monitor').toLowerCase().replace('-', '_');
    const color = bandColor(band);

    return `
      <div onclick="window.location.href='/v3/case.html?id=${encodeURIComponent(c.case_id)}'" style="padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--panel-border); border-radius:8px; cursor:pointer; transition:all 0.15s ease;" onmouseenter="this.style.borderColor='var(--panel-border-bright)'" onmouseleave="this.style.borderColor='var(--panel-border)'">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="badge-band badge-band-${band}" style="padding:1px 6px; font-size:0.6875rem;">${escHtml(band)}</span>
            <span style="font-size:0.75rem; font-weight:600; color:var(--ink);">${escHtml(c.identity_id)}</span>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.8125rem; font-weight:700; color:${color};">
            ${Number(c.risk_score || 0).toFixed(1)}
          </span>
        </div>
        <div style="font-size:0.75rem; color:var(--muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
          ${escHtml(c.title || c.summary || c.case_id)}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 4. Mini 3D Globe using globe.gl
 */
async function initMiniGlobe() {
  const container = document.getElementById('mini-globe-container');
  if (!container) return;

  if (typeof window.Globe === 'undefined') {
    container.innerHTML = '<div style="color:var(--muted); font-size:0.75rem; padding:12px; text-align:center;">3D Globe engine loading...</div>';
    return;
  }

  try {
    const rawGeo = await api.get('/geo/logins').catch(() => []);
    const geoData = Array.isArray(rawGeo) ? rawGeo : (rawGeo?.points || []);
    container.innerHTML = ''; // clear loading text

    const width = container.clientWidth || 320;
    const height = 200;

    const sphereCanvas = document.createElement('canvas');
    sphereCanvas.width = 16;
    sphereCanvas.height = 16;
    const sCtx = sphereCanvas.getContext('2d');
    sCtx.fillStyle = '#0a110d';
    sCtx.fillRect(0, 0, 16, 16);
    const sphereTexUrl = sphereCanvas.toDataURL();

    const globe = window.Globe()(container)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('rgba(0, 230, 118, 0.25)')
      .atmosphereAltitude(0.12)
      .globeImageUrl(sphereTexUrl)
      .pointsData(geoData)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor((d) => (d.impossible_travel || d.is_threat ? 'rgba(255, 59, 59, 0.9)' : 'rgba(0, 230, 118, 0.9)'))
      .pointAltitude(0.04)
      .pointRadius(0.8)
      .arcsData(
        geoData.length > 1
          ? [
            {
              startLat: geoData[0].lat,
              startLng: geoData[0].lon,
              endLat: geoData[1].lat,
              endLng: geoData[1].lon,
              color: 'rgba(255, 59, 59, 0.85)',
            },
          ]
          : []
      )
      .arcColor((d) => d.color || 'rgba(255, 59, 59, 0.85)')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(1500)
      .arcStroke(1.2);

    // Auto-rotate
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.8;
    globe.controls().enableZoom = false;

    // Camera initial position
    globe.pointOfView({ lat: 30, lng: 0, altitude: 2.2 });

    miniGlobeInstance = globe;

    // Pause on visibility change
    document.addEventListener('visibilitychange', () => {
      if (globe && globe.controls()) {
        globe.controls().autoRotate = !document.hidden;
      }
    });

    // Make container click redirect to globe page
    container.style.cursor = 'pointer';
    container.addEventListener('click', () => {
      window.location.href = '/v3/globe.html';
    });
  } catch (err) {
    console.warn('Mini globe initialization failed:', err);
    container.innerHTML = '<div style="color:var(--muted); font-size:0.75rem; padding:12px; text-align:center;">Geographic telemetry ready (2D mode)</div>';
  }
}

/**
 * 5. Run Dataset Button Workflow
 */
function setupRunDatasetButton() {
  const btn = document.getElementById('btn-run-dataset');
  const btnText = document.getElementById('btn-run-dataset-text');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      setLoading(btn, true);
      if (btnText) btnText.textContent = 'Running Replay...';

      const resp = await api.post('/run/dataset', { pace: 0.0 });
      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: `Dataset replay initiated: ${resp.run_id || 'active'}`, type: 'success' },
        })
      );

      // Reload fresh data after a brief pause
      setTimeout(async () => {
        await loadKPIs();
        await loadTopIdentities();
        await loadLiveCases();
        setLoading(btn, false);
        if (btnText) btnText.textContent = 'Run Dataset Replay';
        await flashSuccess(btn, 900);
      }, 1500);
    } catch (err) {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Run Dataset Replay';
      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: `Run failed: ${err.message}`, type: 'error' },
        })
      );
    }
  });
}

/**
 * 6. SSE Stream Event Listeners
 */
function setupSSEListeners() {
  // Update live throughput EPS counter
  sse.on('metrics', (data) => {
    if (data && data.eps !== undefined) {
      const el = document.getElementById('dashboard-eps-val');
      if (el) el.innerHTML = `${fmt.number(data.eps)} <span style="font-size:0.875rem; font-weight:500;">EPS</span>`;
    }
  });

  // Prepend live case events to the feed
  sse.on('case', (caseItem) => {
    if (!caseItem) return;

    // Optional tie-in (UI_DESIGN.md §4 / U3): threat deflection when revoke arrives
    const band = (caseItem.band || 'monitor').toLowerCase().replace('-', '_');
    if (band === 'revoke' && shieldCoreInstance) {
      shieldCoreInstance.threat();
    }

    const container = document.getElementById('live-cases-feed');
    if (!container) return;

    const color = bandColor(band);

    const div = document.createElement('div');
    div.style.cssText = 'padding:10px 12px; background:rgba(59,130,246,0.12); border:1px solid var(--brand); border-radius:8px; cursor:pointer; animation:toast-in 0.3s ease-out;';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="badge-band badge-band-${band}" style="padding:1px 6px; font-size:0.6875rem;">${escHtml(band)}</span>
          <span style="font-size:0.75rem; font-weight:600; color:var(--ink);">${escHtml(caseItem.identity_id)}</span>
        </div>
        <span style="font-family:var(--font-mono); font-size:0.8125rem; font-weight:700; color:${color};">
          ${Number(caseItem.risk_score || 0).toFixed(1)}
        </span>
      </div>
      <div style="font-size:0.75rem; color:var(--text); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
        ${escHtml(caseItem.title || caseItem.case_id)}
      </div>
    `;
    div.addEventListener('click', () => {
      window.location.href = `/v3/case.html?id=${encodeURIComponent(caseItem.case_id)}`;
    });

    container.prepend(div);
    loadKPIs();
    loadTopIdentities();
  });

  // Auto-refresh dynamic telemetry every 4 seconds
  setInterval(() => {
    loadKPIs();
    loadTopIdentities();
    load30DayMemoryCard();
  }, 4000);
}

/**
 * 7. Load and Render 30-Day Memory Card (Task M1)
 */
async function load30DayMemoryCard() {
  const container = document.getElementById('dashboard-memory-content');
  if (!container) return;

  try {
    const [statsRes, findingsRes] = await Promise.all([
      fetch('/api/memory/stats').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/memory/findings?limit=3').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    if (!statsRes) {
      container.innerHTML = '<div style="font-size:0.8125rem; color:var(--muted); padding:6px 0;">Memory not loaded yet</div>';
      return;
    }

    const findingsCount = statsRes.rows?.findings ?? (findingsRes?.findings?.length || 0);
    const dbSize = statsRes.db_size_mb !== undefined ? `${statsRes.db_size_mb} MB` : '0.0 MB';

    let windowText = 'No data yet';
    if (statsRes.memory_days && statsRes.memory_days.first && statsRes.memory_days.last) {
      windowText = `${escHtml(statsRes.memory_days.first)} &rarr; ${escHtml(statsRes.memory_days.last)}`;
    }

    const findingsList = Array.isArray(findingsRes?.findings) ? findingsRes.findings : [];

    let rowsHtml = '';
    if (findingsList.length === 0) {
      rowsHtml = '<div style="font-size:0.75rem; color:var(--muted); font-style:italic; padding:4px 0;">No correlated findings yet.</div>';
    } else {
      rowsHtml = findingsList.slice(0, 3).map((f) => {
        const ident = escHtml(f.identity || f.target || 'unknown');
        const risk = Number(f.risk || f.score || 0).toFixed(0);
        const stagesCount = Array.isArray(f.stages) ? f.stages.length : (f.stages_count || 1);
        const stagesText = `${stagesCount} stage${stagesCount === 1 ? '' : 's'}`;

        let riskColor = 'var(--ok)';
        if (risk >= 90) riskColor = 'var(--crit)';
        else if (risk >= 70) riskColor = 'var(--band-restrict)';
        else if (risk >= 40) riskColor = 'var(--warn)';

        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--surface-2); border-radius:6px; font-size:0.75rem;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-family:var(--font-mono); font-weight:600; color:var(--ink);">${ident}</span>
              <span style="color:var(--muted); font-size:0.6875rem;">(${stagesText})</span>
            </div>
            <span style="font-family:var(--font-mono); font-weight:700; color:${riskColor};">Risk ${risk}</span>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding-bottom:8px; border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:0.6875rem; color:var(--muted); text-transform:uppercase;">Findings</div>
          <div style="font-size:1.125rem; font-weight:700; font-family:var(--font-mono); color:var(--ink);">${findingsCount}</div>
        </div>
        <div>
          <div style="font-size:0.6875rem; color:var(--muted); text-transform:uppercase;">DB Size</div>
          <div style="font-size:1.125rem; font-weight:700; font-family:var(--font-mono); color:var(--ink);">${dbSize}</div>
        </div>
        <div>
          <div style="font-size:0.6875rem; color:var(--muted); text-transform:uppercase;">Window</div>
          <div style="font-size:0.6875rem; font-family:var(--font-mono); color:var(--ink); margin-top:4px;">${windowText}</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
        <div style="font-size:0.6875rem; color:var(--muted); text-transform:uppercase; font-family:var(--font-mono);">Top Findings (30-Day Span)</div>
        ${rowsHtml}
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div style="font-size:0.8125rem; color:var(--muted); padding:6px 0;">Memory not loaded yet</div>';
  }
}

// Cleanup on page teardown
window.addEventListener('beforeunload', () => {
  if (cyber3dInstance) {
    cyber3dInstance.destroy();
  }
  if (miniGlobeInstance && miniGlobeInstance._destructor) {
    miniGlobeInstance._destructor();
  }
});

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initDashboard());
} else {
  initDashboard();
}
