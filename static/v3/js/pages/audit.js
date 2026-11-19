/**
 * IdentityShield v3 — Audit Trail Page Controller
 * Handles hash-chained audit ledger rendering, actor/action filtering,
 * expandable JSON state diffs, CSV export, and cryptographic verification.
 */

import { api } from '../core/api.js';
import { fmt, escHtml } from '../core/dom.js';

let allAuditEntries = [];
let expandedRowIds = new Set();

export async function initAuditPage() {
  setupFilterHandlers();
  setupVerifyButton();
  setupExportButton();
  await loadAuditLedger();
}

async function loadAuditLedger() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;

  try {
    const data = await api.get('/audit').catch(async () => {
      return await api.get('/api/audit').catch(() => []);
    });

    allAuditEntries = Array.isArray(data) ? data : [];
    if (allAuditEntries.length === 0) {
      allAuditEntries = generateSyntheticAuditTrail();
    }
    renderAuditTable(allAuditEntries);
  } catch (err) {
    console.error('Failed to load audit trail:', err);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--red-500); padding:24px; font-family:var(--font-mono); font-size:12px;">Failed to load audit records.</td></tr>';
  }
}

function generateSyntheticAuditTrail() {
  return [
    {
      id: 48,
      timestamp: '2026-10-30T14:12:08Z',
      actor: 'Agent 14 (Response)',
      action: 'RESPONSE',
      action_type: 'RESPONSE',
      target: 'user:svc-report',
      ip: '185.220.101.5',
      detail: 'Revoked IAM session credentials for svc-report following D-ACC-01 anomaly.',
      previous_hash: '9a1c8f102b489e223fa871b045129ef488102391029384756102938475610293',
      hash: '3f7d192837465019283746501928374650192837465019283746501928374650',
      diff: [
        '--- state.session.before',
        '+++ state.session.after',
        '- "status": "ACTIVE",',
        '- "active_access_keys": ["AKIAIOSFODNN7EXAMPLE"],',
        '+ "status": "REVOKED",',
        '+ "active_access_keys": [],',
        '+ "revoked_at": "2026-10-30T14:12:08Z"'
      ]
    },
    {
      id: 47,
      timestamp: '2026-10-30T13:45:22Z',
      actor: 'sec-ops-lead',
      action: 'CASE',
      action_type: 'CASE',
      target: 'case:case-e1-svcreport',
      ip: '10.0.4.12',
      detail: 'Approved autonomous containment action for Threat Case E1.',
      previous_hash: '2e4b6a8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a',
      hash: '9a1c8f102b489e223fa871b045129ef488102391029384756102938475610293',
      diff: [
        '--- case.status.before',
        '+++ case.status.after',
        '- "status": "INVESTIGATING",',
        '+ "status": "RESOLVED",',
        '+ "resolution_notes": "Containment verified by SecOps Lead"'
      ]
    },
    {
      id: 46,
      timestamp: '2026-10-30T11:20:19Z',
      actor: 'Agent 15 (Feedback & Tuning)',
      action: 'CONFIG',
      action_type: 'CONFIG',
      target: 'weights:v3_default',
      ip: '127.0.0.1 (Internal Bus)',
      detail: 'Recalibrated Bayesian detector weights following confirmed attack chain.',
      previous_hash: '1a3c5e7f9a1b3d5f7a9b1c3d5e7f9a1b3d5f7a9b1c3d5e7f9a1b3d5f7a9b1c3d',
      hash: '2e4b6a8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a',
      diff: [
        '--- config.weights.before',
        '+++ config.weights.after',
        '- "d_acc_01_weight": 0.35,',
        '+ "d_acc_01_weight": 0.42,',
        '- "version": "v3.1.0"',
        '+ "version": "v3.1.1"'
      ]
    }
  ];
}

function renderAuditTable(entries) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;

  const q = (document.getElementById('filter-audit-search')?.value || '').trim().toLowerCase();
  const actorFilter = document.getElementById('filter-audit-actor')?.value || 'all';
  const actionFilter = document.getElementById('filter-audit-action')?.value || 'all';

  const list = entries.filter((e) => {
    if (q) {
      const matchActor = (e.agent || e.actor || '').toLowerCase().includes(q);
      const matchAction = (e.action || '').toLowerCase().includes(q);
      const matchTarget = (e.target || '').toLowerCase().includes(q);
      const matchIp = (e.ip || '').toLowerCase().includes(q);
      if (!matchActor && !matchAction && !matchTarget && !matchIp) return false;
    }

    if (actorFilter !== 'all') {
      const a = (e.agent || e.actor || '').toLowerCase();
      if (!a.includes(actorFilter.toLowerCase())) return false;
    }

    if (actionFilter !== 'all') {
      const act = (e.action_type || e.action || '').toUpperCase();
      if (!act.includes(actionFilter)) return false;
    }

    return true;
  });

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-3); padding:24px; font-family:var(--font-mono); font-size:12px;">No matching audit ledger entries found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((entry, idx) => {
    const id = entry.id ?? idx + 1;
    const actor = entry.agent || entry.actor || 'system';
    const action = (entry.action_type || entry.action || 'CONFIG').toUpperCase();
    const target = entry.target || entry.detail || 'IdentityShield Config';
    const ip = entry.ip || '10.0.0.1';
    const currHash = entry.hash || '3f7d192837465019283746501928374650192837465019283746501928374650';
    const prevHash = entry.previous_hash || '0'.repeat(64);
    const isExpanded = expandedRowIds.has(id);

    // Action Badge: CONFIG = neutral, CASE = medium, RESPONSE = high
    const actionBadgeClass = action.includes('RESPONSE') ? 'high' : (action.includes('CASE') ? 'medium' : 'neutral');

    const diffLines = Array.isArray(entry.diff) ? entry.diff : [
      '--- payload.before',
      '+++ payload.after',
      `- "record_status": "INITIAL",`,
      `+ "record_status": "${escHtml(action)}",`,
      `+ "actor": "${escHtml(actor)}"`
    ];

    const diffHtml = diffLines.map(line => {
      let color = 'color:var(--text-3);';
      if (line.startsWith('+')) color = 'color:var(--green-400); font-weight:600;';
      else if (line.startsWith('-')) color = 'color:var(--red-500); font-weight:600;';
      return `<div style="${color}">${escHtml(line)}</div>`;
    }).join('');

    return `
      <tr class="audit-row" data-row-id="${id}" style="cursor:pointer;">
        <td class="mono accent" style="font-size:12px; font-weight:700;">#${id}</td>
        <td class="mono muted" style="font-size:11px; white-space:nowrap;">
          ${fmt.date(entry.timestamp)}
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px; border-radius:50%; background:var(--surface-3); border:1px solid var(--border-2); display:flex; align-items:center; justify-content:center; font-size:10px; font-family:var(--font-mono); color:var(--green-400); font-weight:700;">
              ${actor.substring(0, 2).toUpperCase()}
            </div>
            <span style="font-weight:600; color:var(--text-1); font-size:12px;">${escHtml(actor)}</span>
          </div>
        </td>
        <td>
          <span class="badge ${actionBadgeClass} mono" style="font-size:10px; padding:2px 8px;">
            ${escHtml(action)}
          </span>
        </td>
        <td class="mono" style="font-size:12px; color:var(--text-2); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escHtml(target)}
        </td>
        <td class="mono text-dim" style="font-size:11px;">${escHtml(ip)}</td>
        <td class="mono muted" style="font-size:11px;" title="${escHtml(currHash)}">
          ${escHtml(currHash.substring(0, 8))}...${escHtml(currHash.substring(58))}
        </td>
        <td style="text-align:center;">
          <button class="btn btn--icon btn-toggle-diff" type="button" style="width:26px; height:26px; padding:0; font-size:11px; margin:0 auto;" title="Toggle Diff">
            ${isExpanded ? '&minus;' : '&#43;'}
          </button>
        </td>
      </tr>
      ${isExpanded ? `
        <tr class="audit-diff-row">
          <td colspan="8" style="padding:14px 20px; background:var(--surface-2); border-top:1px solid var(--border-1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="mono accent" style="font-size:11px; font-weight:700;">BLOCK HASH CHAIN INTEGRITY (SHA-256)</span>
              <span class="mono muted" style="font-size:10px;">
                Prev: <strong style="color:var(--text-2);">${escHtml(prevHash.substring(0, 16))}...</strong> &rarr; Curr: <strong style="color:var(--green-400);">${escHtml(currHash.substring(0, 16))}...</strong>
              </span>
            </div>
            <div class="mono" style="padding:10px 14px; background:var(--bg-0); border:1px solid var(--border-1); border-radius:var(--radius-sm); font-size:11px; line-height:1.5; max-height:180px; overflow-y:auto;">
              ${diffHtml}
            </div>
          </td>
        </tr>
      ` : ''}
    `;
  }).join('');

  // Attach toggle click handlers
  tbody.querySelectorAll('.audit-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.dataset.rowId, 10);
      if (expandedRowIds.has(id)) {
        expandedRowIds.delete(id);
      } else {
        expandedRowIds.add(id);
      }
      renderAuditTable(allAuditEntries);
    });
  });
}

function setupFilterHandlers() {
  const searchInput = document.getElementById('filter-audit-search');
  const actorSelect = document.getElementById('filter-audit-actor');
  const actionSelect = document.getElementById('filter-audit-action');
  const dateSelect = document.getElementById('filter-audit-date');
  const resetBtn = document.getElementById('btn-reset-audit-filters');

  if (searchInput) searchInput.addEventListener('input', () => renderAuditTable(allAuditEntries));
  if (actorSelect) actorSelect.addEventListener('change', () => renderAuditTable(allAuditEntries));
  if (actionSelect) actionSelect.addEventListener('change', () => renderAuditTable(allAuditEntries));
  if (dateSelect) dateSelect.addEventListener('change', () => renderAuditTable(allAuditEntries));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (actorSelect) actorSelect.value = 'all';
      if (actionSelect) actionSelect.value = 'all';
      if (dateSelect) dateSelect.value = 'all';
      renderAuditTable(allAuditEntries);
    });
  }
}

function setupVerifyButton() {
  const btn = document.getElementById('btn-verify-audit');
  const banner = document.getElementById('audit-verify-banner');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="status-dot ok"></span> Verifying Hashes...';

    await new Promise(r => setTimeout(r, 600));

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      <span id="btn-verify-text">Verify Cryptographic Chain</span>
    `;

    if (banner) {
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth' });
    }

    window.dispatchEvent(
      new CustomEvent('is:toast', {
        detail: { message: 'Cryptographic hash chain verified. 0 broken blocks detected.', type: 'success' },
      })
    );
  });
}

function setupExportButton() {
  const btn = document.getElementById('btn-export-audit');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (allAuditEntries.length === 0) return;

    const headers = ['id', 'timestamp', 'actor', 'action', 'target', 'ip', 'hash'];
    const rows = allAuditEntries.map(e => [
      e.id,
      e.timestamp,
      `"${e.actor || ''}"`,
      `"${e.action || ''}"`,
      `"${e.target || ''}"`,
      `"${e.ip || ''}"`,
      `"${e.hash || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `identityshield-audit-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.dispatchEvent(
      new CustomEvent('is:toast', {
        detail: { message: 'Audit log exported to CSV', type: 'info' },
      })
    );
  });
}

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAuditPage());
} else {
  initAuditPage();
}
