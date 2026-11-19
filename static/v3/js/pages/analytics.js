/**
 * IdentityShield v3 — Security Analytics Page Controller
 * Drives Time-range filtering (24h / 7d / 30d), Logins Over Time (Area),
 * Detections by Type (Horizontal Bar), MFA Share (Donut), Top Risky Users (Table),
 * and Geography Breakdown (Bar) using Neon Shield charts theme.
 */

import { api } from '../core/api.js';
import { fmt, escHtml } from '../core/dom.js';

let activeRange = '24h';
let loginsChart = null;
let detectionsChart = null;
let mfaChart = null;
let geoChart = null;

// Multi-range datasets
const DATASETS = {
  '24h': {
    logins: {
      labels: ['12AM', '2AM', '4AM', '6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM', '12AM'],
      normal: [45, 60, 85, 110, 95, 125, 130, 120, 110, 98, 115, 135, 90],
      suspicious: [2, 1, 0, 2, 1, 3, 2, 4, 3, 42, 12, 3, 1],
    },
    detections: {
      labels: ['Impossible Travel', 'MFA Fatigue (Push Spam)', 'Privilege Escalation', 'Off-Hours Login', 'New ASN / IP'],
      data: [42, 28, 19, 14, 8],
    },
    mfa: {
      labels: ['Okta Verify Push', 'Authenticator TOTP', 'FIDO2 WebAuthn', 'SMS Fallback'],
      data: [68, 19, 10, 3],
    },
    geo: {
      labels: ['United States', 'Germany', 'United Kingdom', 'Russia', 'Singapore', 'India', 'Netherlands'],
      data: [1240, 185, 94, 42, 38, 29, 14],
    },
  },
  '7d': {
    logins: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      normal: [680, 740, 890, 810, 950, 420, 390],
      suspicious: [18, 12, 24, 15, 62, 8, 6],
    },
    detections: {
      labels: ['Impossible Travel', 'MFA Fatigue (Push Spam)', 'Privilege Escalation', 'Off-Hours Login', 'New ASN / IP'],
      data: [145, 92, 54, 48, 29],
    },
    mfa: {
      labels: ['Okta Verify Push', 'Authenticator TOTP', 'FIDO2 WebAuthn', 'SMS Fallback'],
      data: [65, 21, 11, 3],
    },
    geo: {
      labels: ['United States', 'Germany', 'United Kingdom', 'Russia', 'Singapore', 'India', 'Netherlands'],
      data: [7800, 1120, 620, 145, 210, 180, 95],
    },
  },
  '30d': {
    logins: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      normal: [3100, 3450, 3800, 3350],
      suspicious: [85, 64, 112, 78],
    },
    detections: {
      labels: ['Impossible Travel', 'MFA Fatigue (Push Spam)', 'Privilege Escalation', 'Off-Hours Login', 'New ASN / IP'],
      data: [540, 380, 210, 195, 110],
    },
    mfa: {
      labels: ['Okta Verify Push', 'Authenticator TOTP', 'FIDO2 WebAuthn', 'SMS Fallback'],
      data: [64, 22, 11, 3],
    },
    geo: {
      labels: ['United States', 'Germany', 'United Kingdom', 'Russia', 'Singapore', 'India', 'Netherlands'],
      data: [32000, 4500, 2600, 540, 890, 720, 380],
    },
  },
};

export async function initAnalyticsPage() {
  setupTabs();
  renderAllCharts();
  await loadTopRiskyUsers();
}

function setupTabs() {
  const tabs = document.querySelectorAll('#analytics-time-tabs .tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeRange = tab.dataset.range || '24h';
      renderAllCharts();
    });
  });
}

function renderAllCharts() {
  const ds = DATASETS[activeRange] || DATASETS['24h'];
  renderLoginsOverTime(ds.logins);
  renderDetectionsByType(ds.detections);
  renderMFAShare(ds.mfa);
  renderGeography(ds.geo);
}

/**
 * 1. Logins Over Time Area Chart
 */
function renderLoginsOverTime(data) {
  const canvas = document.getElementById('chart-logins-over-time');
  if (!canvas || !window.IS || !window.IS.charts) return;

  if (loginsChart) loginsChart.destroy();
  loginsChart = window.IS.charts.area(canvas, {
    labels: data.labels,
    normal: data.normal,
    suspicious: data.suspicious,
  });
}

/**
 * 2. Detections by Type (Horizontal Bar Chart)
 * Green -> Amber -> Red by severity
 */
function renderDetectionsByType(data) {
  const canvas = document.getElementById('chart-detections-by-type');
  if (!canvas || typeof window.Chart === 'undefined') return;

  if (detectionsChart) detectionsChart.destroy();

  // Colors per bar index: top 2 are Critical/High (Red), middle is Amber, bottom are Green
  const bgColors = [
    'rgba(255, 59, 59, 0.85)',
    'rgba(255, 59, 59, 0.75)',
    'rgba(245, 165, 36, 0.85)',
    'rgba(0, 230, 118, 0.75)',
    'rgba(0, 230, 118, 0.65)',
  ];

  const borderColors = [
    'var(--red-500)',
    'var(--red-500)',
    'var(--amber-500)',
    'var(--green-500)',
    'var(--green-500)',
  ];

  detectionsChart = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.data,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.x} incident detections`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'var(--text-3)', font: { family: 'JetBrains Mono', size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: 'var(--text-1)', font: { family: 'Inter', size: 12, weight: '600' } },
        },
      },
    },
  });
}

/**
 * 3. MFA Method Share Donut Chart
 */
function renderMFAShare(data) {
  const canvas = document.getElementById('chart-mfa-share');
  if (!canvas || !window.IS || !window.IS.charts) return;

  if (mfaChart) mfaChart.destroy();

  mfaChart = window.IS.charts.donut(canvas, {
    labels: data.labels,
    data: data.data,
    colors: [
      'var(--green-500)',
      'var(--amber-500)',
      'rgba(0, 230, 118, 0.45)',
      'var(--red-500)',
    ],
  });
}

/**
 * 4. Geography Breakdown (Vertical Bar Chart)
 */
function renderGeography(data) {
  const canvas = document.getElementById('chart-geography');
  if (!canvas || !window.IS || !window.IS.charts) return;

  if (geoChart) geoChart.destroy();

  geoChart = window.IS.charts.bar(canvas, {
    labels: data.labels,
    datasets: [
      {
        label: 'Logins',
        data: data.data,
        backgroundColor: data.labels.map((l) => l === 'Russia' ? 'rgba(255, 59, 59, 0.8)' : 'rgba(0, 230, 118, 0.65)'),
        borderColor: data.labels.map((l) => l === 'Russia' ? 'var(--red-500)' : 'var(--green-500)'),
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  });
}

/**
 * 5. Top Risky Users Table
 */
async function loadTopRiskyUsers() {
  const tbody = document.getElementById('top-risky-users-body');
  if (!tbody) return;

  try {
    const data = await api.get('/cases?limit=10').catch(() => null);
    const items = data?.items || [];

    if (items.length === 0) {
      // High quality fallback demonstration rows
      tbody.innerHTML = `
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-1);">svc-report</div>
            <div class="mono muted" style="font-size:11px;">ses-okta-882194</div>
          </td>
          <td>Cloud Automation</td>
          <td>Impossible Travel: Dallas &rarr; Moscow</td>
          <td><span class="badge--score">92.4</span></td>
          <td><span class="pill" style="height:26px; padding:0 8px;"><span class="pill__dot bad"></span> RESTRICT</span></td>
          <td style="text-align:right;">
            <a href="/v3/case.html?id=case-e1-svcreport" class="btn btn--ghost" style="padding:3px 8px; font-size:11px; text-decoration:none;">Inspect &rarr;</a>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-1);">sarah.c@corp.example</div>
            <div class="mono muted" style="font-size:11px;">ses-aws-40192</div>
          </td>
          <td>DevOps Lead</td>
          <td>MFA Fatigue (Push Notification Spam)</td>
          <td><span class="badge--score">76.0</span></td>
          <td><span class="pill" style="height:26px; padding:0 8px;"><span class="pill__dot warn"></span> STEP-UP</span></td>
          <td style="text-align:right;">
            <a href="/v3/cases.html?identity_id=sarah.c" class="btn btn--ghost" style="padding:3px 8px; font-size:11px; text-decoration:none;">Inspect &rarr;</a>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-1);">anita.rao@corp.example</div>
            <div class="mono muted" style="font-size:11px;">ses-okta-1017</div>
          </td>
          <td>Finance Admin</td>
          <td>Privilege Escalation on S3 Bucket</td>
          <td><span class="badge--score">54.0</span></td>
          <td><span class="pill" style="height:26px; padding:0 8px;"><span class="pill__dot warn"></span> STEP-UP</span></td>
          <td style="text-align:right;">
            <a href="/v3/cases.html?identity_id=anita.rao" class="btn btn--ghost" style="padding:3px 8px; font-size:11px; text-decoration:none;">Inspect &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.slice(0, 5).map((c) => {
      const risk = Number(c.identity_risk ?? c.risk_score ?? 0);
      const band = (c.band || 'monitor').toLowerCase().replace('-', '_');
      let statusDot = 'ok';
      if (band === 'revoke' || band === 'restrict' || risk >= 70) statusDot = 'bad';
      else if (band === 'step_up' || risk >= 50) statusDot = 'warn';

      let detection = 'Suspicious Login Sequence';
      if (c.narrative && c.narrative.includes('Impossible travel')) detection = 'Impossible Travel Detected';
      else if (c.narrative && c.narrative.includes('device')) detection = 'New Device / ASN Anomaly';

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-1);">${escHtml(c.identity_id)}</div>
            <div class="mono muted" style="font-size:11px;">${escHtml(c.session_id || c.case_id)}</div>
          </td>
          <td>Enterprise Identity</td>
          <td style="color:var(--text-2); font-size:13px;">${escHtml(detection)}</td>
          <td><span class="badge--score">${risk.toFixed(1)}</span></td>
          <td>
            <span class="pill" style="height:26px; padding:0 8px;">
              <span class="pill__dot ${statusDot}"></span>
              ${escHtml(band.toUpperCase())}
            </span>
          </td>
          <td style="text-align:right;">
            <a href="/v3/case.html?id=${encodeURIComponent(c.case_id)}" class="btn btn--ghost" style="padding:3px 8px; font-size:11px; text-decoration:none;">Inspect &rarr;</a>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load top risky users:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalyticsPage);
} else {
  initAnalyticsPage();
}
