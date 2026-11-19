/**
 * IdentityShield v3 — Geographic Login Globe Controller
 * Renders dark stylized 3D globe with country polygons, normal logins,
 * pulsing anomaly rings, animated impossible-travel arcs, and synced investigation panel.
 */

import { api } from '../core/api.js';
import { escHtml } from '../core/dom.js';
import { palette } from '../../assets/js/theme-tokens.js';

let globeInstance = null;
let allPoints = [];
let allArcs = [];
let countriesGeoJson = null;

export async function initGlobePage() {
  setupControls();
  await loadGeoData();
}

function hexToRgba(hexStr, alpha = 1) {
  if (!hexStr) return `rgba(255, 59, 59, ${alpha})`;
  const clean = hexStr.replace(/^#/, '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createDarkSphereTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 16, 16);
  return canvas.toDataURL();
}

async function loadGeoData() {
  const container = document.getElementById('globe-container');
  if (!container) return;

  try {
    const [geoRes, countriesRes] = await Promise.all([
      api.get('/geo/logins'),
      fetch('/vendor/countries.json').then(r => r.json()).catch(() => null)
    ]);

    countriesGeoJson = countriesRes;
    allPoints = geoRes?.points || [];
    allArcs = geoRes?.arcs || [];

    populateIdentitySelect(allPoints, allArcs);
    renderGlobe(container, allPoints, allArcs);
    updatePanelsAndCounters('all');
  } catch (err) {
    console.error('Failed to load geo data:', err);
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-3); font-family:var(--font-mono); font-size:13px;">Geographic intelligence unavailable.</div>';
  }
}

function populateIdentitySelect(points, arcs) {
  const select = document.getElementById('select-globe-identity');
  if (!select) return;

  const identities = new Set();
  points.forEach(p => { if (p.identity_id) identities.add(p.identity_id); });
  arcs.forEach(a => { if (a.identity_id) identities.add(a.identity_id); });

  const sorted = Array.from(identities).sort();
  select.innerHTML = '<option value="all">All Identities</option>' + sorted.map(id => {
    const hasImp = arcs.some(a => a.impossible_travel && a.identity_id === id);
    const suffix = hasImp ? ' (Impossible Travel)' : '';
    return `<option value="${escHtml(id)}">${escHtml(id)}${suffix}</option>`;
  }).join('');
}

function renderGlobe(container, points, arcs) {
  if (typeof window.Globe === 'undefined') {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-3); font-family:var(--font-mono); font-size:13px;">3D Globe engine not loaded.</div>';
    return;
  }

  try {
    container.innerHTML = '';
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const theme = palette();

    const globe = window.Globe()(container)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor(theme.green500)
      .atmosphereAltitude(0.15)
      .globeImageUrl(createDarkSphereTexture(theme.mapOcean));

    // Hex polygons for land masses (dark console styling)
    if (countriesGeoJson && countriesGeoJson.features) {
      globe
        .hexPolygonsData(countriesGeoJson.features)
        .hexPolygonGeoJsonGeometry(d => d.geometry)
        .hexPolygonColor(() => theme.mapLand)
        .hexPolygonAltitude(0.006)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.28)
        .hexPolygonUseDots(false);
    }

    // Login Points
    globe
      .pointsData(points)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor(d => d.impossible_travel || d.outcome === 'FAILURE' ? theme.suspicious : theme.green500)
      .pointAltitude(d => d.impossible_travel ? 0.06 : 0.02)
      .pointRadius(d => d.impossible_travel ? 0.9 : 0.45)
      .pointLabel(d => `
        <div style="background:var(--surface-1); border:1px solid var(--border-2); padding:8px 12px; border-radius:var(--radius-sm); font-family:var(--font-ui); font-size:12px; color:var(--text-1); box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="font-weight:700; color:${d.impossible_travel || d.outcome === 'FAILURE' ? 'var(--red-500)' : 'var(--green-500)'}; font-size:11px; font-family:var(--font-mono); letter-spacing:0.04em;">
            ${d.impossible_travel ? 'IMPOSSIBLE TRAVEL ORIGIN' : (d.outcome === 'FAILURE' ? 'FAILED AUTH INGRESS' : 'TRUSTED INGRESS')}
          </div>
          <div style="font-weight:600; margin-top:2px;">${escHtml(d.city || 'Unknown')}, ${escHtml(d.country || '')}</div>
          <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-3); margin-top:3px;">
            ${escHtml(d.event_id || '')} &middot; ${escHtml(d.time ? d.time.substring(11, 19) + ' UTC' : '')}
          </div>
          <div style="margin-top:4px; font-family:var(--font-mono); font-size:11px; color:var(--green-400);">
            Identity: <span style="color:var(--text-1); font-weight:600;">${escHtml(d.identity_id || '')}</span>
          </div>
        </div>
      `);

    // Arcs
    globe
      .arcsData(arcs)
      .arcStartLat(d => d.from ? d.from.lat : (d.startLat || 0))
      .arcStartLng(d => d.from ? d.from.lon : (d.startLng || 0))
      .arcEndLat(d => d.to ? d.to.lat : (d.endLat || 0))
      .arcEndLng(d => d.to ? d.to.lon : (d.endLng || 0))
      .arcColor(d => d.impossible_travel ? theme.suspicious : hexToRgba(theme.green500, 0.40))
      .arcStroke(d => d.impossible_travel ? 2.2 : 0.8)
      .arcAltitude(d => d.impossible_travel ? 0.32 : 0.18)
      .arcDashLength(d => d.impossible_travel ? 0.4 : 0.9)
      .arcDashGap(d => d.impossible_travel ? 0.2 : 0)
      .arcDashAnimateTime(d => d.impossible_travel ? 2000 : 0)
      .arcLabel(d => `
        <div style="background:var(--surface-1); border:1px solid var(--border-2); padding:8px 12px; border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:11px; color:var(--text-1); box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="color:${d.impossible_travel ? 'var(--red-500)' : 'var(--green-500)'}; font-weight:700;">
            ${d.impossible_travel ? 'IMPOSSIBLE TRAVEL (&gt; 900 km/h)' : 'CONSECUTIVE SESSION ROUTE'}
          </div>
          <div style="margin-top:2px; font-family:var(--font-ui); font-size:12px;">
            ${escHtml(d.from?.city || 'Unknown')} &rarr; ${escHtml(d.to?.city || 'Unknown')}
          </div>
          <div style="color:var(--text-3); font-size:11px; margin-top:2px;">
            Distance: ${Math.round(d.distance_km || 0).toLocaleString()} km &middot; Speed: ${Math.round(d.speed_kmh || 0).toLocaleString()} km/h
          </div>
          <div style="color:var(--green-400); margin-top:2px;">
            Identity: ${escHtml(d.identity_id || '')}
          </div>
        </div>
      `);

    // Anomaly Rings on impossible travel endpoints
    updateRings(globe, arcs);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;
    globe.pointOfView({ lat: 25, lng: 20, altitude: 2.2 });

    globeInstance = globe;

    // Pause on tab hidden
    document.addEventListener('visibilitychange', () => {
      if (globe && globe.controls()) {
        globe.controls().autoRotate = !document.hidden;
      }
    });

    window.addEventListener('resize', () => {
      if (globe && container) {
        globe.width(container.clientWidth);
        globe.height(container.clientHeight);
      }
    });
  } catch (err) {
    console.warn('3D Globe initialization error:', err);
  }
}

function updateRings(globe, arcs) {
  const theme = palette();
  const impArcs = arcs.filter(a => a.impossible_travel);
  const rings = [];

  impArcs.forEach(a => {
    if (a.from && a.from.lat) {
      rings.push({ lat: a.from.lat, lng: a.from.lon, identity: a.identity_id });
    }
    if (a.to && a.to.lat) {
      rings.push({ lat: a.to.lat, lng: a.to.lon, identity: a.identity_id });
    }
  });

  globe
    .ringsData(rings)
    .ringLat('lat')
    .ringLng('lng')
    .ringColor(() => t => hexToRgba(theme.red500, Math.max(0, (1 - t) * 0.85)))
    .ringMaxRadius(3.5)
    .ringPropagationSpeed(1.8)
    .ringRepeatPeriod(2000);
}

function updatePanelsAndCounters(selectedIdentity) {
  const filteredArcs = selectedIdentity === 'all'
    ? allArcs
    : allArcs.filter(a => (a.identity_id || '').toLowerCase() === selectedIdentity.toLowerCase());

  const filteredPoints = selectedIdentity === 'all'
    ? allPoints
    : allPoints.filter(p => (p.identity_id || '').toLowerCase() === selectedIdentity.toLowerCase());

  const impossibleTravelEvents = filteredArcs.filter(a => a.impossible_travel);

  // Sync Header Counter Badge
  const badge = document.getElementById('impossible-arc-badge');
  const countEl = document.getElementById('impossible-arc-count');
  if (countEl && badge) {
    const count = impossibleTravelEvents.length;
    countEl.textContent = `${count} IMPOSSIBLE TRAVEL ${count === 1 ? 'ARC' : 'ARCS'}`;
    if (count > 0) {
      badge.className = 'badge high';
      badge.style.display = 'inline-flex';
    } else {
      badge.className = 'badge low';
      badge.style.display = 'inline-flex';
    }
  }

  // Sync Card 1: Impossible Travel Events Panel
  const impCard = document.getElementById('card-impossible-travel');
  const impBadge = document.getElementById('impossible-panel-badge');
  const eventsList = document.getElementById('globe-events-list');

  if (impCard && impBadge && eventsList) {
    if (impossibleTravelEvents.length === 0) {
      impCard.className = 'card';
      impBadge.className = 'badge low';
      impBadge.textContent = 'None';
      eventsList.innerHTML = '<div class="empty" style="padding:28px 16px; text-align:center; color:var(--text-3); font-size:12px;">No impossible travel anomalies detected for current filter.</div>';
    } else {
      impCard.className = 'card card--danger';
      impBadge.className = 'badge high';
      impBadge.textContent = `${impossibleTravelEvents.length} Active`;

      eventsList.innerHTML = impossibleTravelEvents.map((arc, idx) => {
        const fromCity = arc.from?.city || 'Unknown';
        const toCity = arc.to?.city || 'Unknown';
        const dist = Math.round(arc.distance_km || 0).toLocaleString();
        const speed = Math.round(arc.speed_kmh || 0).toLocaleString();
        
        return `
          <div class="alert-row" data-arc-idx="${idx}" style="cursor:pointer; padding:12px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-md); transition:border-color var(--dur-fast), background var(--dur-fast);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="pill__dot bad"></span>
                <span class="mono" style="font-size:11px; font-weight:700; color:var(--red-500);">${escHtml(fromCity)} &rarr; ${escHtml(toCity)}</span>
              </div>
              <span class="badge high" style="font-size:10px; padding:2px 6px;">HIGH</span>
            </div>
            <div class="mono" style="font-size:12px; color:var(--text-1); font-weight:600;">
              ${dist} km &middot; <span style="color:var(--red-500);">${speed} km/h</span>
            </div>
            <div style="font-size:11px; color:var(--text-3); margin-top:3px; display:flex; justify-content:space-between; align-items:center;">
              <span>Identity: <strong style="color:var(--text-2); font-family:var(--font-mono);">${escHtml(arc.identity_id)}</strong></span>
              <span class="mono" style="color:var(--green-400); font-size:10px;">Focus &rarr;</span>
            </div>
          </div>
        `;
      }).join('');

      // Add click listeners to focus globe on arc
      eventsList.querySelectorAll('.alert-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.dataset.arcIdx, 10);
          const arc = impossibleTravelEvents[idx];
          if (arc && globeInstance && arc.from && arc.to) {
            const midLat = (arc.from.lat + arc.to.lat) / 2;
            const midLng = (arc.from.lon + arc.to.lon) / 2;
            globeInstance.pointOfView({ lat: midLat, lng: midLng, altitude: 1.8 }, 1200);
          }
        });
      });
    }
  }

  // Sync Card 2: Active Locations & ASN Prefixes (Aggregated)
  const locList = document.getElementById('globe-locations-list');
  const countPill = document.getElementById('locations-count-pill');

  if (locList) {
    const locationMap = new Map();
    filteredPoints.forEach(pt => {
      const city = pt.city || 'Unknown';
      const country = pt.country || 'Unknown';
      const asn = pt.asn || 'AS-Internal';
      const key = `${city}|${country}|${asn}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { city, country, asn, count: 0, hasThreat: false });
      }
      const entry = locationMap.get(key);
      entry.count += 1;
      if (pt.impossible_travel || pt.outcome === 'FAILURE') {
        entry.hasThreat = true;
      }
    });

    const aggregated = Array.from(locationMap.values()).sort((a, b) => b.count - a.count);

    if (countPill) {
      countPill.textContent = `${aggregated.length} unique location${aggregated.length === 1 ? '' : 's'}`;
    }

    if (aggregated.length === 0) {
      locList.innerHTML = '<div class="empty" style="padding:24px; text-align:center; color:var(--text-3); font-size:12px;">No active locations found.</div>';
    } else {
      locList.innerHTML = aggregated.map(loc => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--surface-2); border:1px solid var(--border-1); border-radius:var(--radius-sm); font-size:12px;">
          <div>
            <div style="font-weight:600; color:var(--text-1); display:flex; align-items:center; gap:6px;">
              ${loc.hasThreat ? '<span class="pill__dot bad"></span>' : '<span class="pill__dot good"></span>'}
              <span>${escHtml(loc.city)}, ${escHtml(loc.country)}</span>
            </div>
            <div class="mono" style="font-size:11px; margin-top:2px; ${loc.asn === 'AS-Internal' ? 'color:var(--text-3);' : 'color:var(--text-2);'}">
              ${escHtml(loc.asn)}
            </div>
          </div>
          <span class="badge ${loc.hasThreat ? 'high' : 'neutral'}" style="font-size:11px; font-family:var(--font-mono);">
            ${loc.count} ${loc.count === 1 ? 'login' : 'logins'}
          </span>
        </div>
      `).join('');
    }
  }
}

function setupControls() {
  const select = document.getElementById('select-globe-identity');
  const toggleBtn = document.getElementById('btn-toggle-rotate');

  if (select) {
    select.addEventListener('change', () => {
      const selectedId = select.value;
      if (!globeInstance) return;

      const filteredPoints = selectedId === 'all'
        ? allPoints
        : allPoints.filter(p => (p.identity_id || '').toLowerCase() === selectedId.toLowerCase());

      const filteredArcs = selectedId === 'all'
        ? allArcs
        : allArcs.filter(a => (a.identity_id || '').toLowerCase() === selectedId.toLowerCase());

      globeInstance.pointsData(filteredPoints);
      globeInstance.arcsData(filteredArcs);
      updateRings(globeInstance, filteredArcs);
      updatePanelsAndCounters(selectedId);

      // If an identity with impossible travel is selected, focus on it
      const imp = filteredArcs.find(a => a.impossible_travel);
      if (imp && imp.from && imp.to) {
        const midLat = (imp.from.lat + imp.to.lat) / 2;
        const midLng = (imp.from.lon + imp.to.lon) / 2;
        globeInstance.pointOfView({ lat: midLat, lng: midLng, altitude: 1.8 }, 1200);
      }
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (globeInstance && globeInstance.controls()) {
        const cur = globeInstance.controls().autoRotate;
        globeInstance.controls().autoRotate = !cur;
      }
    });
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (globeInstance && globeInstance._destructor) {
    globeInstance._destructor();
  }
});

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initGlobePage());
} else {
  initGlobePage();
}
