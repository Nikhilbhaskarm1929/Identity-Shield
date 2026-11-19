/**
 * IdentityShield v3 — SOC Event Packets Controller
 * Animates lightweight event chips along connector paths using requestAnimationFrame.
 */

import { bus } from './bus.js';

export class SocPackets {
  constructor(overlayContainerEl, connectorsInstance) {
    this.container = overlayContainerEl;
    this.connectors = connectorsInstance;
    this.activePackets = [];
    this.maxPackets = 12;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bindBusEvents();
    this.startLoop();
  }

  bindBusEvents() {
    bus.on('packet:move', ({ eventId, fromLayer, toLayer, verdict }) => {
      this.spawnPacket(eventId, fromLayer, toLayer, verdict);
    });
  }

  spawnPacket(eventId, fromLayer, toLayer, verdict = 'pass') {
    if (!this.container || !this.connectors) return;

    const path = this.connectors.getPathForTransition(fromLayer, toLayer);
    if (!path) return;

    // Prune oldest if over limit
    while (this.activePackets.length >= this.maxPackets) {
      const oldest = this.activePackets.shift();
      if (oldest.el && oldest.el.parentNode) oldest.el.remove();
    }

    const shortId = eventId ? eventId.replace('EVT-', '').replace('DEMO-', '').substring(0, 4) : 'EVT';
    const chip = document.createElement('div');
    chip.className = `soc-packet-chip ${verdict}`;
    chip.dataset.eventId = eventId;
    chip.innerHTML = `◆ <span style="font-family:var(--font-mono);">${shortId}</span>`;

    chip.addEventListener('click', () => {
      bus.emit('event:select', { eventId });
    });

    this.container.appendChild(chip);

    const totalLen = path.getTotalLength();

    if (this.reducedMotion) {
      const endPt = path.getPointAtLength(totalLen);
      chip.style.left = `${endPt.x}px`;
      chip.style.top = `${endPt.y}px`;
      setTimeout(() => {
        chip.style.opacity = '0';
        setTimeout(() => chip.remove(), 400);
      }, 800);
      return;
    }

    this.activePackets.push({
      el: chip,
      path,
      totalLen,
      startTime: performance.now(),
      duration: 650, // ms
      progress: 0,
      done: false,
    });
  }

  startLoop() {
    const loop = (now) => {
      if (!document.hidden) {
        for (let i = this.activePackets.length - 1; i >= 0; i--) {
          const p = this.activePackets[i];
          const elapsed = now - p.startTime;
          p.progress = Math.min(1, elapsed / p.duration);

          const currentLen = p.progress * p.totalLen;
          const pt = p.path.getPointAtLength(currentLen);

          p.el.style.left = `${pt.x}px`;
          p.el.style.top = `${pt.y}px`;

          if (p.progress >= 1) {
            p.el.style.opacity = '0';
            p.el.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
              if (p.el.parentNode) p.el.remove();
            }, 300);
            this.activePackets.splice(i, 1);
          }
        }
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  clear() {
    this.activePackets.forEach(p => {
      if (p.el && p.el.parentNode) p.el.remove();
    });
    this.activePackets = [];
  }
}
