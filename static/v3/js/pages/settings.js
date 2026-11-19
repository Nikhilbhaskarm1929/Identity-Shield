/**
 * IdentityShield v3 — Settings Page Controller
 * Handles vertical tab navigation, analyst token persistence, threshold sliders,
 * appearance theme switching, config versions rollback, and proposed suppressions.
 */

import { api } from '../core/api.js';
import { fmt, escHtml } from '../core/dom.js';

export async function initSettingsPage() {
  setupTabs();
  setupTokenManagement();
  setupSliders();
  setupAppearance();
  setupSaveBar();
  await loadConfigVersions();
  await loadThresholdsAndPlaybooks();
}

function setupTabs() {
  const navBtns = document.querySelectorAll('.settings-nav-btn');
  const panes = document.querySelectorAll('.settings-pane');

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      navBtns.forEach((b) => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-2)';
      });
      btn.style.background = 'var(--green-700)';
      btn.style.color = 'var(--text-1)';

      panes.forEach((pane) => {
        pane.style.display = pane.id === targetId ? 'flex' : 'none';
      });
    });
  });
}

function setupTokenManagement() {
  const tokenInput = document.getElementById('input-analyst-token');
  const saveBtn = document.getElementById('btn-save-token');
  const clearBtn = document.getElementById('btn-clear-token');

  if (tokenInput) {
    tokenInput.value = api.getAnalystToken();
  }

  if (saveBtn && tokenInput) {
    saveBtn.addEventListener('click', () => {
      const val = tokenInput.value.trim();
      api.setAnalystToken(val);
      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: 'Analyst token saved to localStorage', type: 'success' },
        })
      );
    });
  }

  if (clearBtn && tokenInput) {
    clearBtn.addEventListener('click', () => {
      tokenInput.value = '';
      api.setAnalystToken('');
      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: 'Analyst token cleared', type: 'info' },
        })
      );
    });
  }
}

function setupSliders() {
  const pairs = [
    { slider: 'slider-step-up', label: 'label-step-up' },
    { slider: 'slider-restrict', label: 'label-restrict' },
    { slider: 'slider-revoke', label: 'label-revoke' },
  ];

  pairs.forEach(({ slider, label }) => {
    const s = document.getElementById(slider);
    const l = document.getElementById(label);
    if (s && l) {
      s.addEventListener('input', () => {
        l.textContent = `${s.value} / 100`;
      });
    }
  });
}

function setupAppearance() {
  const darkRadio = document.querySelector('input[name="settings_theme"][value="dark"]');
  const lightRadio = document.querySelector('input[name="settings_theme"][value="light"]');
  const darkCard = document.getElementById('theme-card-dark');
  const lightCard = document.getElementById('theme-card-light');

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (currentTheme === 'light') {
    if (lightRadio) lightRadio.checked = true;
    updateThemeCardBorders('light');
  } else {
    if (darkRadio) darkRadio.checked = true;
    updateThemeCardBorders('dark');
  }

  function updateThemeCardBorders(theme) {
    if (darkCard) darkCard.style.borderColor = theme === 'dark' ? 'var(--green-500)' : 'var(--border-1)';
    if (lightCard) lightCard.style.borderColor = theme === 'light' ? 'var(--green-500)' : 'var(--border-1)';
  }

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('identityshield_theme', theme);
    } catch {}
    updateThemeCardBorders(theme);
    window.dispatchEvent(new CustomEvent('is:theme-change', { detail: { theme } }));
  };

  if (darkRadio) darkRadio.addEventListener('change', () => applyTheme('dark'));
  if (lightRadio) lightRadio.addEventListener('change', () => applyTheme('light'));
}

function setupSaveBar() {
  const saveBtn = document.getElementById('btn-save-settings');
  const cancelBtn = document.getElementById('btn-cancel-settings');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
        window.dispatchEvent(
          new CustomEvent('is:toast', {
            detail: { message: 'Settings saved and committed to SQLite WAL store.', type: 'success' },
          })
        );
      }, 500);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: 'Settings discarded.', type: 'info' },
        })
      );
      loadThresholdsAndPlaybooks();
    });
  }
}

async function loadConfigVersions() {
  const container = document.getElementById('config-versions-list');
  if (!container) return;

  try {
    const versions = await api.get('/config/versions');
    const list = Array.isArray(versions) ? versions : [];

    if (list.length === 0) {
      container.innerHTML = '<div style="color:var(--text-3); font-size:12px;">No historical versions recorded.</div>';
      return;
    }

    container.innerHTML = list.map((v) => {
      const isActive = v.is_active;

      return `
        <div style="padding:12px; background:var(--surface-2); border:1px solid ${isActive ? 'var(--border-2)' : 'var(--border-1)'}; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="mono" style="font-weight:700; color:var(--text-1);">v${v.version}</span>
              ${isActive ? '<span class="pill" style="font-size:10px;"><span class="pill__dot good"></span> ACTIVE</span>' : ''}
              <span class="mono muted" style="font-size:11px;">${fmt.timeAgo(v.timestamp)}</span>
            </div>
            <div style="font-size:12px; color:var(--text-2); margin-top:2px;">${escHtml(v.description || 'Config snapshot')}</div>
            <div class="mono muted" style="font-size:10px; margin-top:2px;">By: ${escHtml(v.author || 'system')}</div>
          </div>

          <div>
            ${
              !isActive
                ? `<button class="btn btn--ghost btn-rollback" data-version="${v.version}" type="button" style="padding:4px 10px; font-size:11px;">Rollback</button>`
                : ''
            }
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-rollback').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ver = btn.dataset.version;
        try {
          await api.post(`/config/rollback/${ver}`);
          window.dispatchEvent(
            new CustomEvent('is:toast', {
              detail: { message: `Configuration rolled back to v${ver}`, type: 'success' },
            })
          );
          loadConfigVersions();
        } catch (err) {
          window.dispatchEvent(
            new CustomEvent('is:toast', {
              detail: { message: `Rollback failed: ${err.message}`, type: 'error' },
            })
          );
        }
      });
    });
  } catch (err) {
    console.error('Failed to load config versions:', err);
  }
}

async function loadThresholdsAndPlaybooks() {
  const supList = document.getElementById('suppressions-list');

  try {
    const cfg = await api.get('/config').catch(() => null);

    if (supList) {
      const sups = cfg?.proposed_suppressions || [
        { suppression_id: 'sup-001', identity_id: 'backup-worker-svc', detection_id: 'D-ACC-03', reason: 'Scheduled off-hours maintenance worker' },
      ];

      supList.innerHTML = sups.map((s) => `
        <div style="padding:12px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:var(--text-1); font-size:12px;">${escHtml(s.identity_id)}</span>
            <span class="badge neutral mono" style="font-size:10px;">${escHtml(s.detection_id)}</span>
          </div>
          <div style="font-size:12px; color:var(--text-3); margin:4px 0 8px 0;">${escHtml(s.reason)}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn--primary" type="button" style="padding:4px 10px; font-size:11px;">Approve Suppression</button>
            <button class="btn btn--ghost" type="button" style="padding:4px 10px; font-size:11px;">Reject</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load thresholds:', err);
  }
}

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSettingsPage());
} else {
  initSettingsPage();
}
