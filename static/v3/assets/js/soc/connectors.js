/**
 * IdentityShield v3 — SOC SVG Connectors
 * Computes card anchor positions and draws smooth cubic Bézier curves
 * between pipeline layer columns, with pulse and threat trail effects.
 */

import { bus } from './bus.js';

export class SocConnectors {
  constructor(svgEl, boardContainerEl) {
    this.svg = svgEl;
    this.board = boardContainerEl;
    this.paths = new Map();
    this.init();
    this.bindBusEvents();
  }

  init() {
    this.update();
    window.addEventListener('resize', () => this.update());
  }

  update() {
    if (!this.svg || !this.board) return;
    this.svg.innerHTML = '';
    this.paths.clear();

    const cols = Array.from(this.board.querySelectorAll('.soc-layer-col'));
    if (cols.length < 2) return;

    const boardRect = this.board.getBoundingClientRect();
    this.svg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);

    for (let i = 0; i < cols.length - 1; i++) {
      const fromCol = cols[i];
      const toCol = cols[i + 1];

      const fromCards = Array.from(fromCol.querySelectorAll('.soc-agent-card'));
      const toCards = Array.from(toCol.querySelectorAll('.soc-agent-card'));

      fromCards.forEach((fc, fIdx) => {
        toCards.forEach((tc, tIdx) => {
          // Draw primary paths to avoid visual clutter (only nearest 2 or key paths)
          if (Math.abs(fIdx - tIdx) > 2) return;

          const fRect = fc.getBoundingClientRect();
          const tRect = tc.getBoundingClientRect();

          const x1 = fRect.right - boardRect.left;
          const y1 = fRect.top + fRect.height / 2 - boardRect.top;
          const x2 = tRect.left - boardRect.left;
          const y2 = tRect.top + tRect.height / 2 - boardRect.top;

          const dx = (x2 - x1) * 0.5;
          const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', 'soc-connector-path');

          const key = `${i}->${i + 1}:${fc.dataset.agentId}->${tc.dataset.agentId}`;
          this.paths.set(key, path);
          this.svg.appendChild(path);
        });
      });
    }
  }

  bindBusEvents() {
    bus.on('packet:move', ({ fromLayer, toLayer, verdict }) => {
      // Find paths matching this layer transition and pulse them
      const prefix = `${fromLayer}->${toLayer}`;
      this.paths.forEach((path, key) => {
        if (key.startsWith(prefix)) {
          if (verdict === 'threat') {
            path.classList.add('trail-threat');
            setTimeout(() => path.classList.remove('trail-threat'), 3000);
          } else {
            path.classList.add('active');
            setTimeout(() => path.classList.remove('active'), 600);
          }
        }
      });
    });
  }

  getPathForTransition(fromLayer, toLayer) {
    const prefix = `${fromLayer}->${toLayer}`;
    for (const [key, path] of this.paths.entries()) {
      if (key.startsWith(prefix)) return path;
    }
    return null;
  }
}
