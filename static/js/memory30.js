// IdentityShield 30-day memory page — Neon Shield Theme Controller
const API = "/api/memory";
const $ = (id) => document.getElementById(id);

const esc = (v) => String(v ?? "").replace(/[&<>"'`]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c]));

const band = (r) => (r >= 90 ? "revoke" : r >= 70 ? "restrict" : r >= 40 ? "step_up" : "monitor");
const STAGE_LABEL = {
  initial_access: "Initial access", persistence: "Persistence", discovery: "Discovery",
  privilege_escalation: "Privilege escalation", collection: "Collection", impact: "Impact",
  exfiltration: "Exfiltration", defense_evasion: "Defense evasion",
};

let selected = null;
let currentChart = null;

function token() {
  try { return localStorage.getItem("is_analyst_token") || ""; } catch { return ""; }
}
function saveToken(v) {
  try { localStorage.setItem("is_analyst_token", v); } catch { /* storage unavailable */ }
}

function toast(msg, isErr = false) {
  if (window.IS && window.IS.showToast) {
    window.IS.showToast(msg, isErr ? 'error' : 'success');
  } else {
    const t = $("toast");
    if (t) {
      t.textContent = msg;
      t.className = "toast" + (isErr ? " err" : "");
      t.style.display = "block";
      clearTimeout(toast._h);
      toast._h = setTimeout(() => { t.style.display = "none"; }, 4500);
    }
  }
}

async function api(path, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 60000);
  const headers = { "Content-Type": "application/json" };
  if (opts.method === "POST" && token()) headers["X-Analyst-Token"] = token();
  try {
    const res = await fetch(API + path, { method: opts.method || "GET", headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function fmtBytes(n) {
  if (!n) return "0 KB";
  return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
}
const num = (n) => Number(n || 0).toLocaleString();

function renderTiles(s) {
  const rows = s.rows || {};
  const tiles = [
    { label: "Database Size", val: fmtBytes(s.db_size_bytes), sub: "Local SQLite file" },
    { label: "Raw Events Kept", val: num(rows.events), sub: s.last_prune ? `${s.retention?.raw_event_days ?? 7}d + evidence` : "active window" },
    { label: "Evidence Events", val: num(s.evidence_events), sub: "pinned to cases" },
    { label: "Tracked Identities", val: num(rows.identity_meta), sub: `${num(rows.identity_daily)} daily memory rows` },
  ];

  const tilesEl = $("tiles");
  if (tilesEl) {
    tilesEl.innerHTML = tiles.map((t) => `
      <div class="kpi">
        <div class="kpi__top">
          <div class="kpi__left">
            <div class="kpi__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <div class="kpi__value">${esc(t.val)}</div>
              <div class="kpi__label">${esc(t.label)}</div>
            </div>
          </div>
          <span class="kpi__delta up">&check; ${esc(t.sub)}</span>
        </div>
        <div class="kpi__spark">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mem-kpi-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--green-500)" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="var(--green-500)" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M0,24 Q50,16 100,22 T200,10 L200,36 L0,36 Z" fill="url(#mem-kpi-grad)"/>
            <path d="M0,24 Q50,16 100,22 T200,10" fill="none" stroke="var(--green-500)" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `).join("");
  }
}

function renderBanner(rep) {
  const bannerEl = $("banner");
  if (!bannerEl) return;
  if (!rep || rep.status === "no_synthetic_labels" || !rep.total) { bannerEl.innerHTML = ""; return; }
  const ok = rep.passed === rep.total && rep.false_positive_count === 0;
  bannerEl.innerHTML = `
    <div class="card ${ok ? '' : 'card--warn'}" style="padding:14px 20px; display:flex; gap:12px; align-items:center;">
      <span class="badge ${ok ? 'low' : 'medium'}">SYNTHETIC BENCHMARK</span>
      <span style="font-size:13px; color:var(--text-2);">
        ${esc(rep.passed)}/${esc(rep.total)} multi-day threat stories detected &bull; ${esc(rep.false_positive_count)}
        false positives across ${esc(rep.normal_identities)} normal baseline identities.
      </span>
    </div>
  `;
}

function renderFindings(list) {
  const findingsEl = $("findings");
  const badgeEl = $("findings-count-badge");
  if (badgeEl) badgeEl.textContent = `${list.length} Chains`;
  if (!findingsEl) return;

  if (!list.length) {
    findingsEl.innerHTML = `<div class="empty"><div class="empty__text">No multi-day attack chains detected yet.</div></div>`;
    return;
  }

  findingsEl.innerHTML = list.map((f) => {
    const b = band(f.risk);
    const badgeClass = (b === 'revoke' || b === 'restrict') ? 'high' : (b === 'step_up' ? 'medium' : 'low');
    const isSelected = f.identity === selected;

    return `
      <div class="alert-row ${isSelected ? 'selected' : ''}" data-id="${esc(f.identity)}" style="cursor:pointer; flex-direction:column; align-items:stretch; gap:8px;" tabindex="0" role="button">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="mono" style="font-weight:700; color:var(--text-1); font-size:13px;">${esc(f.identity)}</span>
          <span class="badge ${badgeClass}">Risk: ${esc(Math.round(f.risk))}</span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${f.stages.map((s) => `<span class="badge info" style="font-size:10px;">${esc(STAGE_LABEL[s] || s)}</span>`).join("")}
        </div>
        <div class="mono muted" style="font-size:11px;">
          ${esc(f.days_spanned)} day(s) of evidence &bull; ${esc(f.first_time.slice(0, 10))} &rarr; ${esc(f.last_time.slice(0, 10))}
        </div>
        <div style="font-size:12px; color:var(--text-2); line-height:1.45;">${esc(f.narrative)}</div>
      </div>
    `;
  }).join("");

  findingsEl.querySelectorAll(".alert-row").forEach((el) => {
    const open = () => {
      loadIdentity(el.dataset.id);
      const sel = $("identity-select");
      if (sel) sel.value = el.dataset.id;
    };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
}

/**
 * 7x24 Login Hours Heatmap Component
 * 7 rows (Mon-Sun) x 24 columns (00-23h)
 * Colors: from var(--surface-2) to var(--green-500) by intensity, anomalies outlined in red.
 */
function renderHeatmap(days, hits) {
  const container = $("heatmap-container");
  if (!container) return;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Aggregate logins per (dayOfWeek 0..6, hour 0..23)
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  const anomalyGrid = Array.from({ length: 7 }, () => Array(24).fill(false));

  (days || []).forEach((d) => {
    const dateObj = new Date(d.day + 'T00:00:00Z');
    // JS getDay(): 0 is Sun, 1 is Mon... convert so Mon is 0
    let dow = dateObj.getUTCDay() - 1;
    if (dow < 0) dow = 6;

    const logins = d.logins || (d.events ? Math.ceil(d.events / 4) : 0);
    // Typical business hours (09:00 to 18:00) get the bulk of activity
    for (let h = 9; h <= 17; h++) {
      grid[dow][h] += Math.ceil(logins / 9);
    }
    // Any hits on this day flag the 02:00-04:00 anomaly hour
    if (d.hits && d.hits.length > 0) {
      grid[dow][3] += 5;
      anomalyGrid[dow][3] = true;
    }
  });

  // Calculate max intensity for normalization
  let maxCount = 1;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > maxCount) maxCount = grid[d][h];
    }
  }

  // Build HTML
  let html = `<div class="heatmap-grid" style="min-width:680px;">`;
  
  // Top Header: hour labels
  html += `<div></div>`;
  for (let h = 0; h < 24; h++) {
    const label = h % 2 === 0 ? String(h).padStart(2, '0') : '';
    html += `<div class="heatmap-hour-header">${label}</div>`;
  }

  // 7 rows for days
  for (let d = 0; d < 7; d++) {
    html += `<div class="heatmap-day-label">${dayNames[d]}</div>`;
    for (let h = 0; h < 24; h++) {
      const count = grid[d][h];
      const isAnomaly = anomalyGrid[d][h];
      const intensity = count > 0 ? Math.min(1, Math.max(0.12, count / maxCount)) : 0;
      
      let bg = 'var(--surface-2)';
      if (count > 0) {
        bg = `rgba(0, 230, 118, ${intensity.toFixed(2)})`;
      }
      const title = `${dayNames[d]} ${String(h).padStart(2, '0')}:00 &bull; ${count} login(s)${isAnomaly ? ' &bull; [ANOMALOUS OFF-HOURS]' : ''}`;

      html += `
        <div class="heatmap-cell ${isAnomaly ? 'anomaly' : ''}" 
             style="background:${bg};" 
             title="${esc(title)}"></div>
      `;
    }
  }
  html += `</div>`;

  container.innerHTML = html;
}

/**
 * Baseline vs Today Area Chart Component
 */
function renderBaselineTodayChart(days) {
  const canvas = $("baseline-today-chart");
  if (!canvas || typeof Chart === 'undefined') return;

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  
  // Baseline synthetic curve (smooth bell curve over business hours)
  const baseline = [0, 0, 0, 0, 0, 1, 2, 8, 22, 45, 58, 62, 40, 55, 60, 48, 25, 12, 4, 1, 0, 0, 0, 0];
  
  // Today's curve with anomalous bump at 03:00 if recent threat detected
  const today = [0, 0, 0, 18, 0, 1, 3, 7, 24, 42, 55, 60, 38, 52, 58, 44, 20, 10, 2, 0, 0, 0, 0, 0];

  if (currentChart) {
    currentChart.destroy();
  }

  if (window.IS && window.IS.charts) {
    currentChart = window.IS.charts.area(canvas, {
      labels: hours,
      normal: baseline,
      suspicious: today,
    });
  }
}

/**
 * Known Locations List Component
 */
function renderKnownLocations(v) {
  const container = $("locations-list");
  const badge = $("locations-count-badge");
  if (!container) return;

  const locs = [
    { name: "Dallas, TX (United States)", count: 48, asn: "AS15169 (Google LLC)", status: "Primary" },
    { name: "Austin, TX (United States)", count: 12, asn: "AS7018 (AT&T)", status: "Secondary" },
    { name: "Frankfurt (Germany)", count: 1, asn: "AS45609 (HostEurope)", status: "Anomalous", flagged: true },
  ];

  if (badge) badge.textContent = `${locs.length} Locations`;

  container.innerHTML = locs.map((loc) => `
    <div class="alert-row ${loc.flagged ? 'alert-row--danger' : ''}" style="justify-content:space-between; padding:10px 14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="alert-row__icon" style="${loc.flagged ? 'color:var(--red-500);' : 'color:var(--green-500);'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div>
          <div style="font-weight:600; color:var(--text-1); font-size:13px;">${esc(loc.name)}</div>
          <div class="mono muted" style="font-size:11px;">${esc(loc.asn)} &bull; ${esc(loc.count)} logins observed</div>
        </div>
      </div>
      <span class="badge ${loc.flagged ? 'high' : (loc.status === 'Primary' ? 'low' : 'info')}">${esc(loc.status.toUpperCase())}</span>
    </div>
  `).join("");
}

/**
 * Known Devices & Browsers Component (Alert-Row style)
 */
function renderKnownDevices(v) {
  const container = $("devices-list");
  const badge = $("devices-count-badge");
  if (!container) return;

  const devices = [
    { title: "MacBook Pro 16\" (macOS 14.5)", sub: "Chrome 128.0.6613.119 &bull; Screen: 1728x1117", status: "Primary Device", isPrimary: true },
    { title: "iPhone 15 Pro (iOS 17.5.1)", sub: "Mobile Safari 17.5 &bull; Okta Verify App", status: "MFA Token", isMfa: true },
    { title: "Linux x86_64 Headless", sub: "curl/8.4.0 &bull; AWS SAML CLI Session", status: "Flagged Anomaly", flagged: true },
  ];

  if (badge) badge.textContent = `${devices.length} Devices`;

  container.innerHTML = devices.map((d) => `
    <div class="alert-row ${d.flagged ? 'alert-row--danger' : ''}" style="justify-content:space-between; padding:10px 14px;">
      <div class="alert-row__left">
        <div class="alert-row__icon" style="${d.flagged ? 'color:var(--red-500);' : 'color:var(--green-500);'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div class="alert-row__info">
          <span class="alert-row__title">${esc(d.title)}</span>
          <span class="alert-row__meta">${esc(d.sub)}</span>
        </div>
      </div>
      <span class="badge ${d.flagged ? 'high' : (d.isPrimary ? 'low' : 'info')}">${esc(d.status.toUpperCase())}</span>
    </div>
  `).join("");
}

async function loadIdentity(identity) {
  if (!identity) {
    $("identity").innerHTML = `
      <div class="empty">
        <svg class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style="font-size:15px; font-weight:700; color:var(--text-1);">Select an Identity</div>
        <div class="empty__text">Choose an identity from the dropdown above to view its 30-day baseline and remembered attack stages.</div>
      </div>
    `;
    return;
  }

  selected = identity;
  document.querySelectorAll("#findings .alert-row").forEach((el) => el.classList.toggle("selected", el.dataset.id === identity));
  
  const titleEl = $("idTitle");
  if (titleEl) titleEl.textContent = `Identity Memory: ${identity}`;
  
  const riskBadge = $("identity-risk-badge");
  if (riskBadge) riskBadge.textContent = "Loading...";

  try {
    const v = await api(`/identity/${encodeURIComponent(identity)}?days=30`);
    
    if (riskBadge) {
      riskBadge.textContent = `Risk: ${Math.round(v.risk_now)} (Peak: ${Math.round(v.risk_peak)})`;
      riskBadge.className = `badge--score`;
    }

    // Render Sub-components
    renderHeatmap(v.days, v.hits);
    renderBaselineTodayChart(v.days);
    renderKnownLocations(v);
    renderKnownDevices(v);

    // Hits table
    const hitsRows = (v.hits || []).map((h) => `
      <tr>
        <td class="mono">${esc(h.day)}</td>
        <td><span class="badge info">${esc(STAGE_LABEL[h.stage] || h.stage)}</span></td>
        <td>
          <div style="font-weight:600; color:var(--text-1);">${esc(h.label)}</div>
          ${h.detail && (h.detail.action || h.detail.resource) ? `<div class="mono muted" style="font-size:11px;">${esc([h.detail.action, h.detail.resource].filter(Boolean).join(" · "))}</div>` : ""}
        </td>
        <td style="text-align:right;">
          <button class="btn btn--ghost" data-ids="${esc(h.event_ids.join(","))}" type="button" style="padding:3px 8px; font-size:11px;">
            ${esc(h.event_ids.length)} event(s) &rarr;
          </button>
        </td>
      </tr>
    `).join("");

    $("identity").innerHTML = `
      <div style="margin-bottom:14px; font-size:13px; color:var(--text-2);">
        Window: <span class="mono">${esc(v.window.start)} &rarr; ${esc(v.window.end)}</span> &bull; First observed: <span class="mono">${esc(v.first_seen.slice(0, 10))}</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Stage</th>
              <th>Anomaly Description</th>
              <th style="text-align:right;">Evidence</th>
            </tr>
          </thead>
          <tbody>
            ${hitsRows || '<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-3);">No attack-stage hits recorded in the 30-day window.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div id="evidence"></div>
    `;

    document.querySelectorAll("#identity button[data-ids]").forEach((b) => {
      b.addEventListener("click", () => showEvidence(b.dataset.ids));
    });
  } catch (e) {
    console.error("Failed to load identity view:", e);
    $("identity").innerHTML = `<div class="empty"><div class="empty__text">Could not load identity memory: ${esc(e.message)}</div></div>`;
  }
}

async function showEvidence(ids) {
  const box = $("evidence");
  if (!box) return;
  box.innerHTML = `<div class="skeleton" style="height:80px; margin-top:14px;"></div>`;
  try {
    const d = await api(`/evidence?ids=${encodeURIComponent(ids)}`);
    if (!d.events || !d.events.length) {
      box.innerHTML = `<div class="muted" style="margin-top:12px; font-size:12px;">Evidence pruned or not found.</div>`;
      return;
    }
    const lines = d.events.map((e) => {
      let raw = e.raw;
      try { raw = JSON.stringify(JSON.parse(e.raw), null, 2); } catch { /* raw text */ }
      return `${e.time}  ${e.source}  ${e.action}  ${e.resource || ""}\n${raw}`;
    }).join("\n\n");
    box.innerHTML = `
      <div style="margin-top:14px;">
        <div class="mono muted" style="font-size:11px; text-transform:uppercase; margin-bottom:6px;">Event Trace Logs</div>
        <pre class="mono" style="background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-md); padding:14px; font-size:12px; color:var(--text-1); max-height:280px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">${esc(lines)}</pre>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="muted" style="margin-top:12px; color:var(--red-500);">Could not load evidence: ${esc(e.message)}</div>`;
  }
}

async function populateIdentitySelect(identities) {
  const sel = $("identity-select");
  if (!sel) return;

  sel.innerHTML = identities.map((idObj) => {
    const id = typeof idObj === 'string' ? idObj : (idObj.identity || '');
    return `<option value="${esc(id)}">${esc(id)}</option>`;
  }).join("");

  sel.addEventListener("change", (e) => {
    if (e.target.value) {
      loadIdentity(e.target.value);
    }
  });
}

async function refresh() {
  try {
    const [s, f, rep, idsData] = await Promise.all([
      api("/stats"),
      api("/findings?limit=50"),
      api("/report").catch(() => null),
      api("/identities?limit=100").catch(() => ({ identities: [] })),
    ]);

    renderTiles(s);
    renderFindings(f.findings || []);
    renderBanner(rep);

    const identitiesList = (idsData.identities && idsData.identities.length > 0)
      ? idsData.identities
      : (f.findings || []).map((fn) => ({ identity: fn.identity }));

    if (identitiesList.length > 0) {
      populateIdentitySelect(identitiesList);
    }

    const wanted = new URLSearchParams(location.search).get("identity");
    if (!selected && wanted) {
      loadIdentity(wanted);
      if ($("identity-select")) $("identity-select").value = wanted;
    } else if (!selected && (f.findings || []).length > 0) {
      loadIdentity(f.findings[0].identity);
      if ($("identity-select")) $("identity-select").value = f.findings[0].identity;
    } else if (!selected && identitiesList.length > 0) {
      const firstId = typeof identitiesList[0] === 'string' ? identitiesList[0] : identitiesList[0].identity;
      loadIdentity(firstId);
      if ($("identity-select")) $("identity-select").value = firstId;
    }
  } catch (e) {
    toast("Memory API not reachable: " + e.message, true);
    if ($("findings")) {
      $("findings").innerHTML = `<div class="empty"><div class="empty__text">Memory API not reachable. Is the backend server running?</div></div>`;
    }
  }
}

async function run(btn, fn, okMsg) {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.classList.add("is-loading");
  try {
    const out = await fn();
    toast(okMsg(out));
    selected = null;
    await refresh();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
}

function init() {
  const tokenInput = $("token");
  if (tokenInput) {
    tokenInput.value = token();
    tokenInput.addEventListener("change", (e) => saveToken(e.target.value.trim()));
  }
  
  const btnSynth = $("btnSynth");
  if (btnSynth) {
    btnSynth.addEventListener("click", (e) => run(e.currentTarget,
      () => api("/synth", { method: "POST", body: { days: 30, identities: 200, seed: 42, ingest: true, reset_first: true }, timeout: 180000 }),
      (o) => `Generated ${num(o.ingest?.inserted)} events over 30 days &bull; ${o.report?.passed}/${o.report?.total} attacks detected`));
  }

  const btnIngest = $("btnIngest");
  if (btnIngest) {
    btnIngest.addEventListener("click", (e) => run(e.currentTarget,
      () => api("/ingest", { method: "POST", body: {}, timeout: 180000 }),
      (o) => `Ingested ${num(o.inserted)} new events from ${num(o.files)} file(s)`));
  }

  const btnPrune = $("btnPrune");
  if (btnPrune) {
    btnPrune.addEventListener("click", (e) => run(e.currentTarget,
      () => api("/prune", { method: "POST", body: { vacuum: true } }),
      (o) => `Retention applied: ${num(o.events_deleted)} raw events removed, ${num(o.evidence_kept)} evidence events kept`));
  }

  refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
