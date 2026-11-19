/**
 * IdentityShield v3 — SOC Agent Health Matrix
 * Renders a 15 rows × 60s scrolling health canvas at 60 fps.
 */

import { bus } from './bus.js';
import { palette } from '../theme-tokens.js';

const AGENT_LABELS = [
  '01 COLLECTOR',
  '02 NORMALIZER',
  '03 INTEL & CONTEXT',
  '04 DEVICE FINGERPRINT',
  '05 ACCESS ANOMALY',
  '06 SESSION INTEGRITY',
  '07 CREDENTIALS & MFA',
  '08 GEO-VELOCITY',
  '09 PRIVILEGE ESCALATION',
  '10 BEHAVIORAL ML',
  '11 CAMPAIGN CLUSTER',
  '12 RISK FUSION',
  '13 INVESTIGATION',
  '14 RESPONSE',
  '15 FEEDBACK & TUNING',
];

export class SocMatrix {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.rows = 15;
    this.cols = 60; // 60 seconds
    this.grid = Array.from({ length: 15 }, () => Array(60).fill('surface2'));
    this.agentCurrentStates = Array(15).fill('normal');
    this.lastTick = Date.now();
    this.bindBusEvents();
    this.startLoop();
  }

  bindBusEvents() {
    bus.on('agent:state', ({ agentId, state }) => {
      const idx = parseInt(agentId.replace('a', ''), 10) - 1;
      if (idx >= 0 && idx < 15) {
        if (state === 'flagged' || state === 'blocked') {
          this.agentCurrentStates[idx] = 'threat';
        } else if (state === 'warn') {
          this.agentCurrentStates[idx] = 'warn';
        } else if (state === 'scanning' || state === 'analyzing' || state === 'pass') {
          this.agentCurrentStates[idx] = 'normal';
        }
      }
    });
  }

  startLoop() {
    if (!this.canvas || !this.ctx) return;

    const render = () => {
      const now = Date.now();
      // Tick every 1000ms
      if (now - this.lastTick >= 1000) {
        this.lastTick = now;
        this.advanceOneSecond();
      }

      this.draw();
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  advanceOneSecond() {
    for (let r = 0; r < this.rows; r++) {
      this.grid[r].shift();
      const st = this.agentCurrentStates[r];
      this.grid[r].push(st);
      // Decay back to normal if not continuously flagged
      if (st === 'threat' || st === 'warn') {
        this.agentCurrentStates[r] = 'normal';
      }
    }
  }

  draw() {
    if (!this.canvas || !this.ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth || 900;
    const height = 15 * 18 + 20;

    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.scale(dpr, dpr);
    }

    const theme = palette();
    this.ctx.clearRect(0, 0, width, height);

    const labelWidth = 160;
    const gridWidth = width - labelWidth - 20;
    const cellW = gridWidth / this.cols;
    const cellH = 14;

    this.ctx.font = '600 10px "JetBrains Mono", monospace';
    this.ctx.textBaseline = 'middle';

    for (let r = 0; r < this.rows; r++) {
      const y = r * 18 + 10;

      // Draw agent label
      this.ctx.fillStyle = theme.text3 || 'rgba(107, 124, 114, 0.8)';
      this.ctx.fillText(AGENT_LABELS[r], 4, y + cellH / 2);

      // Draw 60 second cells
      for (let c = 0; c < this.cols; c++) {
        const x = labelWidth + c * cellW;
        const state = this.grid[r][c];

        if (state === 'threat') {
          this.ctx.fillStyle = theme.red500;
        } else if (state === 'warn') {
          this.ctx.fillStyle = theme.amber;
        } else if (state === 'normal') {
          this.ctx.fillStyle = theme.green500;
        } else {
          this.ctx.fillStyle = theme.surface2 || 'rgba(255,255,255,0.05)';
        }

        this.ctx.fillRect(x + 1, y, cellW - 2, cellH);
      }
    }
  }
}
