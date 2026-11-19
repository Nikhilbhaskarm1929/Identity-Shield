/**
 * IdentityShield v3 — 3D Attack Graph Controller
 * Renders 3d-force-graph with token colors, directional red particles along attack paths,
 * pill labels on key nodes, camera controls, and .compare styled inspector.
 */

import { api } from '../core/api.js';
import { escHtml } from '../core/dom.js';
import { palette } from '../../assets/js/theme-tokens.js';

let graphInstance = null;
let rawGraphData = null;

export async function initGraphPage() {
  setupControls();
  await populateIdentityDropdown();
  await loadGraph('global');
}

function getNodeColor(node, theme) {
  if (node.is_threat || (node.risk || 0) >= 70) {
    return theme.red500;
  }
  const kind = (node.kind || node.type || '').toLowerCase();
  if (kind === 'identity' || kind === 'user') {
    return theme.green500;
  }
  if (kind === 'ip' || kind === 'asn') {
    return (node.risk || 0) > 20 ? theme.amber : theme.green700;
  }
  if (kind === 'role' || kind === 'sensitive_resource') {
    return (node.risk || 0) > 20 ? theme.amber : theme.text2;
  }
  return theme.text2;
}

function createPillSprite(text, isThreat, theme) {
  if (typeof window.THREE === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = isThreat ? theme.red500 : theme.green500;
  ctx.lineWidth = 3;

  const r = 18;
  const x = 6, y = 6, w = 244, h = 52;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.fillStyle = isThreat ? theme.red500 : theme.text1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = text.length > 18 ? text.substring(0, 16) + '..' : text;
  ctx.fillText(label, 128, 32);

  const texture = new window.THREE.CanvasTexture(canvas);
  const material = new window.THREE.SpriteMaterial({ map: texture, depthWrite: false });
  const sprite = new window.THREE.Sprite(material);
  sprite.scale.set(36, 9, 1);
  sprite.position.set(0, 10, 0);
  return sprite;
}

async function populateIdentityDropdown() {
  const select = document.getElementById('select-graph-identity');
  if (!select) return;

  try {
    const events = await api.get('/events?limit=100');
    const eventList = Array.isArray(events) ? events : (events?.items || []);
    const identities = new Set();

    identities.add('svc-report');
    identities.add('jdoe');
    identities.add('asmith');

    for (const ev of eventList) {
      if (ev.identity_id) identities.add(ev.identity_id);
      if (ev.raw_principal) {
        const rp = String(ev.raw_principal);
        const name = rp.includes('/') ? rp.split('/').pop() : (rp.includes('@') ? rp.split('@')[0] : rp);
        if (name && !name.startsWith('arn:')) identities.add(name);
      }
    }

    const currentVal = select.value || 'global';
    select.innerHTML = '<option value="global">Global Attack Graph (All Ingested Logs)</option>';

    for (const id of Array.from(identities).sort()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id === 'svc-report' ? 'svc-report (Hero Attack Chain)' : id;
      if (id === currentVal) opt.selected = true;
      select.appendChild(opt);
    }
  } catch (err) {
    console.warn('Failed to populate identity dropdown:', err);
  }
}

async function loadGraph(identityId = 'global') {
  const container = document.getElementById('graph-canvas-container');
  if (!container) return;

  try {
    const endpoint = identityId === 'global' ? '/graph/global' : `/identities/${encodeURIComponent(identityId)}/graph`;
    const data = await api.get(endpoint);
    rawGraphData = data;
    updateThreatCount(data);
    render3DGraph(container, data);
  } catch (err) {
    console.error('Failed to load graph data:', err);
    render2DVisFallback(container);
  }
}

function updateThreatCount(data) {
  const badge = document.getElementById('graph-threat-badge');
  const countEl = document.getElementById('graph-threat-count');
  if (!badge || !countEl) return;

  const threats = (data?.nodes || []).filter(n => n.is_threat || (n.risk || 0) >= 70);
  const count = threats.length;
  countEl.textContent = `${count} FLAGGED ${count === 1 ? 'ENTITY' : 'ENTITIES'}`;
  badge.className = count > 0 ? 'badge high' : 'badge low';
}

function render3DGraph(container, data) {
  if (typeof window.ForceGraph3D === 'undefined') {
    render2DVisFallback(container, data);
    return;
  }

  try {
    container.innerHTML = '';
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const theme = palette();

    const graph = window.ForceGraph3D()(container)
      .width(width)
      .height(height)
      .backgroundColor(theme.bg0)
      .graphData(data)
      .nodeLabel((node) => `
        <div style="background:var(--surface-2); border:1px solid var(--border-2); border-radius:var(--radius-pill); padding:4px 12px; font-family:var(--font-ui); font-size:12px; color:var(--text-1); box-shadow:0 6px 20px rgba(0,0,0,0.5); display:inline-flex; align-items:center; gap:8px; white-space:nowrap;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getNodeColor(node, theme)};"></span>
          <span style="font-weight:600;">${escHtml(node.name || node.id)}</span>
          <span style="font-family:var(--font-mono); font-size:11px; color:${node.is_threat ? 'var(--red-500)' : 'var(--text-3)'};">
            ${node.is_threat ? 'THREAT' : (node.kind || node.type || '')}
          </span>
        </div>
      `)
      .nodeColor((node) => getNodeColor(node, theme))
      .nodeVal((node) => node.is_threat ? 14 : Math.max(4, (node.risk || 20) / 4))
      .nodeOpacity(0.92)
      .nodeThreeObjectExtend(true)
      .nodeThreeObject((node) => {
        if (!node.is_threat && (node.risk || 0) < 30 && node.kind !== 'identity') {
          return null;
        }
        return createPillSprite(node.name || node.id, node.is_threat, theme);
      })
      .linkWidth((link) => (link.is_attack_path ? 2.5 : 1.0))
      .linkColor((link) => (link.is_attack_path ? theme.graphLinkThreat : theme.graphLink))
      .linkDirectionalParticles((link) => (link.is_attack_path ? 4 : 0))
      .linkDirectionalParticleWidth(2.8)
      .linkDirectionalParticleSpeed(0.008)
      .linkDirectionalParticleColor(() => theme.red500)
      .linkLabel((link) => `
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-2); background:var(--surface-2); padding:2px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-1);">
          ${escHtml(link.label || '')}
        </span>
      `)
      .onNodeClick((node) => {
        const distance = 140;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1500
        );
        inspectNode(node, data);
      });

    graph.cameraPosition({ z: 350 });
    graphInstance = graph;

    window.addEventListener('resize', () => {
      if (graph && container) {
        graph.width(container.clientWidth);
        graph.height(container.clientHeight);
      }
    });

    window.addEventListener('is:theme-change', () => {
      if (graphInstance) {
        const updatedTheme = palette();
        graphInstance.backgroundColor(updatedTheme.bg0);
        graphInstance.refresh();
      }
    });
  } catch (err) {
    console.warn('3D Force Graph WebGL failed, falling back to 2D:', err);
    render2DVisFallback(container, data);
  }
}

function render2DVisFallback(container, data) {
  if (typeof window.vis === 'undefined' || !window.vis.Network) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-3); font-family:var(--font-mono); font-size:12px;">Graph rendering unavailable.</div>';
    return;
  }

  container.innerHTML = '';
  const theme = palette();

  const nodes = (data?.nodes || []).map((n) => ({
    id: n.id,
    label: n.name || n.id,
    color: getNodeColor(n, theme),
    font: { color: theme.text1, size: 12 },
  }));

  const edges = (data?.links || []).map((l) => ({
    from: l.source?.id || l.source,
    to: l.target?.id || l.target,
    label: l.label,
    color: l.is_attack_path ? theme.red500 : theme.green700,
    arrows: 'to',
  }));

  const net = new window.vis.Network(
    container,
    { nodes: new window.vis.DataSet(nodes), edges: new window.vis.DataSet(edges) },
    {
      physics: { stabilization: true },
      nodes: { shape: 'dot', size: 16 },
    }
  );

  net.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nid = params.nodes[0];
      const node = (data?.nodes || []).find((n) => n.id === nid);
      if (node) inspectNode(node, data);
    }
  });
}

function inspectNode(node, graphData) {
  const title = document.getElementById('panel-node-title');
  const details = document.getElementById('panel-node-details');
  const linkedCard = document.getElementById('panel-linked-case');
  const btnInvestigate = document.getElementById('panel-btn-investigate');
  const theme = palette();

  if (title) title.textContent = node.name || node.id;

  // Calculate blast radius (number of connections)
  const connectedEdges = (graphData?.links || []).filter(l => {
    const s = l.source?.id || l.source;
    const t = l.target?.id || l.target;
    return s === node.id || t === node.id;
  });

  const isThreat = node.is_threat || (node.risk || 0) >= 70;

  if (details) {
    details.innerHTML = `
      <div class="compare" style="margin-top:4px;">
        <div class="compare__row">
          <span class="compare__label">Entity ID</span>
          <span class="compare__val mono" style="font-size:12px; color:var(--text-1); word-break:break-all;">${escHtml(node.id)}</span>
        </div>
        <div class="compare__row">
          <span class="compare__label">Entity Type</span>
          <span class="compare__val" style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getNodeColor(node, theme)};"></span>
            <span class="mono" style="font-size:11px; text-transform:uppercase; font-weight:700;">${escHtml(node.kind || node.type || 'Entity')}</span>
          </span>
        </div>
        <div class="compare__row">
          <span class="compare__label">Risk Score</span>
          <span class="compare__val mono" style="font-size:12px; font-weight:700; color:${isThreat ? 'var(--red-500)' : 'var(--green-500)'};">
            ${Number(node.risk || 0).toFixed(1)} / 100
          </span>
        </div>
        <div class="compare__row">
          <span class="compare__label">Blast Radius</span>
          <span class="compare__val mono" style="font-size:12px; color:var(--text-1);">
            ${connectedEdges.length} connected ${connectedEdges.length === 1 ? 'edge' : 'edges'}
          </span>
        </div>
        <div class="compare__row">
          <span class="compare__label">Attack Path</span>
          <span class="compare__val">
            <span class="badge ${isThreat ? 'high' : 'low'}" style="font-size:10px;">
              ${isThreat ? 'ACTIVE PARTICIPANT' : 'BENIGN'}
            </span>
          </span>
        </div>
      </div>

      <div style="margin-top:12px;">
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.04em;">Connected Relationships (${connectedEdges.length})</div>
        <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto; padding-right:4px;">
          ${connectedEdges.length === 0 ? '<div style="font-size:11px; color:var(--text-3);">No direct edges recorded.</div>' : connectedEdges.map(e => {
            const s = e.source?.name || e.source?.id || e.source;
            const t = e.target?.name || e.target?.id || e.target;
            const isAttack = e.is_attack_path;
            return `
              <div style="font-size:11px; font-family:var(--font-mono); padding:6px 8px; background:var(--surface-2); border:1px solid ${isAttack ? 'var(--border-2)' : 'var(--border-1)'}; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${escHtml(s)} &rarr; ${escHtml(t)}</span>
                <span style="color:${isAttack ? 'var(--red-500)' : 'var(--green-400)'}; font-size:10px; font-weight:600;">${escHtml(e.label || 'LINK')}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (linkedCard) {
    if (isThreat || (node.id || '').includes('svc-report')) {
      linkedCard.style.display = 'block';
      if (btnInvestigate) btnInvestigate.href = `/v3/case.html?id=case-e1-svcreport`;
    } else {
      linkedCard.style.display = 'none';
    }
  }
}

function setupControls() {
  const selectIdentity = document.getElementById('select-graph-identity');
  const chkOnlyAttack = document.getElementById('chk-only-attack');
  const chkCampaignLinks = document.getElementById('chk-campaign-links');
  const btnReset = document.getElementById('btn-reset-camera');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnScreenshot = document.getElementById('btn-screenshot-graph');
  const btnRefresh = document.getElementById('btn-refresh-graph');

  if (selectIdentity) {
    selectIdentity.addEventListener('change', () => {
      loadGraph(selectIdentity.value);
    });
  }

  function applyFilters() {
    if (!rawGraphData || !graphInstance) return;

    let nodes = [...rawGraphData.nodes];
    let links = [...rawGraphData.links];

    if (chkOnlyAttack && chkOnlyAttack.checked) {
      nodes = nodes.filter(n => n.is_threat || (n.risk || 0) >= 70);
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => {
        const s = l.source?.id || l.source;
        const t = l.target?.id || l.target;
        return l.is_attack_path && nodeIds.has(s) && nodeIds.has(t);
      });
    }

    if (chkCampaignLinks && !chkCampaignLinks.checked) {
      links = links.filter(l => l.label !== 'Campaign Correlation');
    }

    graphInstance.graphData({ nodes, links });
  }

  if (chkOnlyAttack) chkOnlyAttack.addEventListener('change', applyFilters);
  if (chkCampaignLinks) chkCampaignLinks.addEventListener('change', applyFilters);

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      if (!graphInstance) return;
      const pos = graphInstance.cameraPosition();
      graphInstance.cameraPosition({ x: pos.x * 0.75, y: pos.y * 0.75, z: pos.z * 0.75 }, undefined, 400);
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      if (!graphInstance) return;
      const pos = graphInstance.cameraPosition();
      graphInstance.cameraPosition({ x: pos.x * 1.33, y: pos.y * 1.33, z: pos.z * 1.33 }, undefined, 400);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (!graphInstance) return;
      graphInstance.cameraPosition({ x: 0, y: 0, z: 350 }, { x: 0, y: 0, z: 0 }, 1000);
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      try {
        await populateIdentityDropdown();
        await loadGraph(selectIdentity ? selectIdentity.value : 'global');
      } finally {
        btnRefresh.disabled = false;
      }
    });
  }

  if (btnScreenshot) {
    btnScreenshot.addEventListener('click', () => {
      const canvas = document.querySelector('#graph-canvas-container canvas');
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `identityshield-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      window.dispatchEvent(
        new CustomEvent('is:toast', {
          detail: { message: '3D Graph screenshot saved to downloads', type: 'success' },
        })
      );
    });
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (graphInstance && graphInstance._destructor) {
    graphInstance._destructor();
  }
});

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initGraphPage());
} else {
  initGraphPage();
}
