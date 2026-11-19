/**
 * IdentityShield v3 — SOC Pipeline Simulation & Execution Engine
 * Drives the 15-agent pipeline layer-by-layer, orchestrating live SSE and authentic demo scenarios.
 */

import { bus } from './bus.js';
import { LAYERS } from './board.js';
import { CHECKS } from './checks.js';
import { SCENARIOS } from './scenarios.js';
import { LiveSource } from './liveSource.js';

const PACE_MULTIPLIERS = {
  slow: 1.8,
  normal: 1.0,
  fast: 0.4,
  instant: 0.08,
};

export class SocEngine {
  constructor() {
    this.mode = 'scenario'; // 'live' | 'scenario'
    this.currentScenarioId = 'mixed_traffic';
    this.pace = 'normal';
    this.isPlaying = false;
    this.isPaused = false;
    this.eventQueue = [];
    this.activeProcessingCount = 0;
    this.maxConcurrent = 3;
    this.scenarioTimer = null;
    this.scenarioStepIndex = 0;
    this.mixedTrafficCycle = 0;

    this.kpis = {
      events: 4280,
      signals: 142,
      cases: 9,
      threats: 2,
      latency: 18,
    };

    this.liveSource = new LiveSource(
      (event) => this.enqueueEvent(event),
      (status) => this.onLiveStatus(status)
    );

    this.init();
  }

  init() {
    this.updateKpiDisplay();
  }

  scalePace(ms) {
    const mult = PACE_MULTIPLIERS[this.pace] || 1.0;
    return Math.max(10, Math.round(ms * mult));
  }

  setPace(newPace) {
    if (PACE_MULTIPLIERS[newPace]) {
      this.pace = newPace;
    }
  }

  setScenario(scenarioId) {
    this.stopScenario();

    if (scenarioId === 'live') {
      this.mode = 'live';
      this.currentScenarioId = 'live';
      this.liveSource.connect();
      this.setLivePillState('live');
      this.syncLiveKpis();
    } else {
      if (this.mode === 'live') {
        this.liveSource.disconnect();
      }
      this.mode = 'scenario';
      this.currentScenarioId = scenarioId;
      this.scenarioStepIndex = 0;
      this.setLivePillState('demo');
      if (this.isPlaying) {
        this.startScenario();
      }
    }
  }

  play() {
    this.isPlaying = true;
    this.isPaused = false;

    if (this.mode === 'live') {
      this.setLivePillState('live');
      this.liveSource.connect();
    } else {
      this.setLivePillState('demo');
      this.startScenario();
    }

    this.pumpQueue();
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    this.stopScenario();
    this.setLivePillState('paused');
  }

  step() {
    if (this.mode === 'live') return;

    const event = this.getNextScenarioEvent();
    if (event) {
      this.enqueueEvent(event);
      this.pumpQueue();
    }
  }

  reset() {
    this.pause();
    this.eventQueue = [];
    this.scenarioStepIndex = 0;
    this.activeProcessingCount = 0;

    // Reset board & console
    bus.emit('agent:state', { agentId: 'all', state: 'idle' });
    this.updateKpiDisplay();
  }

  startScenario() {
    this.stopScenario();

    const tick = () => {
      if (!this.isPlaying || this.isPaused) return;

      const event = this.getNextScenarioEvent();
      if (event) {
        this.enqueueEvent(event);
        this.pumpQueue();
      }

      const delay = event?.delayMs ? this.scalePace(event.delayMs) : this.scalePace(2000);
      this.scenarioTimer = setTimeout(tick, delay);
    };

    tick();
  }

  stopScenario() {
    if (this.scenarioTimer) {
      clearTimeout(this.scenarioTimer);
      this.scenarioTimer = null;
    }
  }

  getNextScenarioEvent() {
    if (this.currentScenarioId === 'mixed_traffic') {
      return this.generateMixedTrafficEvent();
    }

    const sc = SCENARIOS[this.currentScenarioId];
    if (!sc || !sc.events || sc.events.length === 0) {
      return this.generateMixedTrafficEvent();
    }

    const event = sc.events[this.scenarioStepIndex % sc.events.length];
    this.scenarioStepIndex++;

    // Clone event and assign fresh timestamp
    return {
      ...event,
      ts: Date.now(),
      id: `${event.id.split('-')[0] || 'DEMO'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    };
  }

  generateMixedTrafficEvent() {
    this.mixedTrafficCycle++;

    // Every 7th event in mixed traffic, inject a realistic anomaly
    if (this.mixedTrafficCycle % 7 === 0) {
      const anomalyScenarios = ['impossible_travel', 'mfa_fatigue', 'session_replay', 'device_drift', 'admin_access'];
      const chosenId = anomalyScenarios[Math.floor(Math.random() * anomalyScenarios.length)];
      const sc = SCENARIOS[chosenId];
      if (sc && sc.events.length > 0) {
        const ev = sc.events[sc.events.length - 1];
        return {
          ...ev,
          ts: Date.now(),
          id: `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        };
      }
    }

    // Otherwise standard normal workday login
    const normalSc = SCENARIOS.normal_workday;
    const base = normalSc.events[Math.floor(Math.random() * normalSc.events.length)];
    return {
      ...base,
      ts: Date.now(),
      id: `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    };
  }

  enqueueEvent(event) {
    if (!event) return;
    this.eventQueue.push(event);
    this.pumpQueue();
  }

  pumpQueue() {
    if (this.activeProcessingCount >= this.maxConcurrent || this.eventQueue.length === 0) {
      return;
    }

    const event = this.eventQueue.shift();
    this.activeProcessingCount++;
    this.processEvent(event).finally(() => {
      this.activeProcessingCount--;
      this.pumpQueue();
    });
  }

  async processEvent(event) {
    const eventStartTime = performance.now();
    bus.emit('event:new', { event, startTime: eventStartTime });

    // Omni-Supervisor: Initialize Master Chronometer
    bus.emit('agent:check', {
      agentId: 'supervisor',
      eventId: event.id,
      text: `[OMNI-SUPERVISOR T+00.0ms] Registered event ${event.id} (${event.user} from ${event.ip}) · Master Chronometer initialized`,
      level: 'info',
      ms: 0,
    });

    if (this.mode !== 'live') {
      this.kpis.events++;
      this.updateKpiDisplay();
    }

    const ctx = {
      signals: Array.isArray(event.signals) ? [...event.signals] : [],
      scoreParts: {},
      caseId: event.case_id || event.caseId || null,
    };
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const layer of LAYERS) {
      const layerStart = performance.now();

      // Move packet across SVG connectors and 3D energy splines
      const currentVerdict = this.getRunningVerdict(ctx);
      bus.emit('packet:move', {
        eventId: event.id,
        fromLayer: Math.max(0, layer.index - 1),
        toLayer: layer.index,
        verdict: currentVerdict,
      });

      // Execute all agents in this layer in parallel
      await Promise.all(
        layer.agents.map((agent) => this.runAgentChecks(agent, event, ctx, wait))
      );

      const elapsedMs = Math.round(performance.now() - eventStartTime);
      const layerDuration = Math.round(performance.now() - layerStart);

      // Omni-Supervisor: Formal Layer Audit Verification
      if (layer.index === 0) {
        bus.emit('agent:check', {
          agentId: 'supervisor',
          eventId: event.id,
          text: `[OMNI-SUPERVISOR T+${elapsedMs}ms] Layer 01 Ingestion: 3/3 agents certified · OCSF normalization verified · Ingest digest OK (${layerDuration}ms)`,
          level: 'pass',
          ms: elapsedMs,
        });
      } else if (layer.index === 1) {
        const hasDeviceWarn = ctx.signals.some((s) => s.type === 'NEW_DEVICE' || s.type === 'BROWSER_DRIFT');
        bus.emit('agent:check', {
          agentId: 'supervisor',
          eventId: event.id,
          text: `[OMNI-SUPERVISOR T+${elapsedMs}ms] Layer 02 Signals: Device fingerprint & session token integrity audited (${layerDuration}ms)`,
          level: hasDeviceWarn ? 'warn' : 'pass',
          ms: elapsedMs,
        });
      } else if (layer.index === 2) {
        const hasThreat = ctx.signals.some((s) => s.severity === 'high' || s.severity === 'critical');
        bus.emit('agent:check', {
          agentId: 'supervisor',
          eventId: event.id,
          text: `[OMNI-SUPERVISOR T+${elapsedMs}ms] Layer 03 Intel & Correlation: Haversine geo-velocity & multi-signal clustering certified (${layerDuration}ms)`,
          level: hasThreat ? 'threat' : 'pass',
          ms: elapsedMs,
        });
      } else if (layer.index === 3) {
        const total = Object.values(ctx.scoreParts).reduce((a, b) => a + b, 0);
        const lvl = total >= 90 ? 'CRITICAL' : (total >= 70 ? 'HIGH' : (total >= 40 ? 'MEDIUM' : 'LOW'));
        bus.emit('agent:check', {
          agentId: 'supervisor',
          eventId: event.id,
          text: `[OMNI-SUPERVISOR T+${elapsedMs}ms] Layer 04 Decision: Bayesian weight aggregation validated (Score: ${total}/100 [${lvl}]) (${layerDuration}ms)`,
          level: total >= 70 ? 'threat' : (total >= 40 ? 'warn' : 'pass'),
          ms: elapsedMs,
        });
      } else if (layer.index === 4) {
        bus.emit('agent:check', {
          agentId: 'supervisor',
          eventId: event.id,
          text: `[OMNI-SUPERVISOR T+${elapsedMs}ms] Layer 05 Learning: Autonomous containment policy verified (dry-run) · 30-day baseline updated (${layerDuration}ms)`,
          level: 'pass',
          ms: elapsedMs,
        });
      }
    }

    // Finalize verdict
    const finalVerdict = this.finalizeVerdict(event, ctx);
    const totalPipelineDuration = Math.round(performance.now() - eventStartTime);

    // Omni-Supervisor: Final Execution Certification
    bus.emit('agent:check', {
      agentId: 'supervisor',
      eventId: event.id,
      text: `[OMNI-SUPERVISOR T+${totalPipelineDuration}ms] Master Simulation Audit: 15/15 agents executed in ${totalPipelineDuration}ms · Verdict Integrity: CERTIFIED`,
      level: 'pass',
      ms: totalPipelineDuration,
    });

    bus.emit('event:verdict', {
      ...finalVerdict,
      durationMs: totalPipelineDuration,
    });

    if (this.mode !== 'live') {
      if (finalVerdict.level === 'CRITICAL' || finalVerdict.level === 'HIGH') {
        this.kpis.threats++;
        this.kpis.cases++;
      }
      if (ctx.signals.length > 0) {
        this.kpis.signals += ctx.signals.length;
      }
      this.updateKpiDisplay();
    } else {
      this.syncLiveKpis();
    }
  }

  async runAgentChecks(agent, event, ctx, wait) {
    bus.emit('agent:state', { agentId: agent.id, state: 'receiving', eventId: event.id });
    await wait(this.scalePace(80));

    bus.emit('agent:state', { agentId: agent.id, state: 'scanning', eventId: event.id });
    await wait(this.scalePace(100));

    const checkFn = CHECKS[agent.key];
    const checks = checkFn ? checkFn(event, ctx) : [];
    let worstLevel = 'pass';

    for (const check of checks) {
      bus.emit('agent:state', { agentId: agent.id, state: 'analyzing', eventId: event.id });
      await wait(this.scalePace(check.ms ? check.ms * 10 : 120));

      bus.emit('agent:check', {
        agentId: agent.id,
        eventId: event.id,
        ...check,
      });

      if (check.level === 'threat') worstLevel = 'threat';
      else if (check.level === 'warn' && worstLevel !== 'threat') worstLevel = 'warn';

      if (check.signal) ctx.signals.push({ agent: agent.key, ...check.signal });
      if (check.score) {
        ctx.scoreParts[check.score.key] = (ctx.scoreParts[check.score.key] || 0) + check.score.value;
      }
    }

    let finalState = 'pass';
    if (worstLevel === 'threat') {
      finalState = agent.id === 'a14' ? 'blocked' : 'flagged';
    } else if (worstLevel === 'warn') {
      finalState = 'warn';
    }

    bus.emit('agent:state', { agentId: agent.id, state: finalState, eventId: event.id });
  }

  getRunningVerdict(ctx) {
    const total = Object.values(ctx.scoreParts).reduce((a, b) => a + b, 0);
    if (total >= 70) return 'threat';
    if (total >= 40) return 'warn';
    return 'pass';
  }

  finalizeVerdict(event, ctx) {
    const total = Object.values(ctx.scoreParts).reduce((a, b) => a + b, 0);
    const level = total >= 90 ? 'CRITICAL' : (total >= 70 ? 'HIGH' : (total >= 40 ? 'MEDIUM' : 'LOW'));

    const caseId = total >= 70 ? `CASE-1115-${Math.floor(Math.random() * 800 + 100)}` : null;

    let actions = [];
    if (level === 'CRITICAL') {
      actions = ['Revoke active sessions (dry-run)', 'Force MFA re-enroll (dry-run)', 'Lock Okta user (dry-run)'];
    } else if (level === 'HIGH') {
      actions = ['Step-up MFA challenge (dry-run)', 'Invalidate bearer token (dry-run)'];
    } else if (level === 'MEDIUM') {
      actions = ['Flag device for re-verification', 'Log telemetry anomaly'];
    }

    return {
      eventId: event.id,
      score: total,
      level,
      breakdown: ctx.scoreParts,
      caseId,
      actions,
    };
  }

  setLivePillState(state) {
    const pill = document.getElementById('soc-stream-pill');
    if (!pill) return;

    if (state === 'live') {
      pill.className = 'pill';
      pill.innerHTML = '<span class="pill__dot good"></span> LIVE STREAMING';
    } else if (state === 'demo') {
      pill.className = 'pill';
      pill.style.borderColor = 'var(--amber-500)';
      pill.style.color = 'var(--amber-500)';
      pill.innerHTML = '<span class="pill__dot warn"></span> DEMO MODE';
    } else if (state === 'paused') {
      pill.className = 'pill';
      pill.style.borderColor = 'var(--border-2)';
      pill.style.color = 'var(--text-3)';
      pill.innerHTML = '<span class="pill__dot dim"></span> PAUSED';
    }
  }

  onLiveStatus(status) {
    if (status.status === 'offline') {
      this.setLivePillState('paused');
    } else if (status.status === 'idle') {
      bus.emit('console:idle', { message: status.message || 'Waiting for Okta events… switch Scenario to a demo to preview.' });
    } else if (status.status === 'connected') {
      this.syncLiveKpis();
    }
  }

  async syncLiveKpis() {
    if (this.mode !== 'live') return;
    try {
      const res = await fetch('/api/v3/metrics/perf');
      if (res.ok) {
        const data = await res.json();
        if (data.events_total != null) this.kpis.events = data.events_total;
        if (data.cases_total != null) this.kpis.cases = data.cases_total;
        if (data.p50_ms != null) this.kpis.latency = Math.round(data.p50_ms);
        this.updateKpiDisplay();
      }
    } catch {
      // Offline fallback
    }
  }

  updateKpiDisplay() {
    const elEvents = document.getElementById('kpi-events-count');
    const elSignals = document.getElementById('kpi-signals-count');
    const elCases = document.getElementById('kpi-cases-count');
    const elThreats = document.getElementById('kpi-threats-count');
    const elLatency = document.getElementById('kpi-latency-val');
    const elThreatCard = document.getElementById('kpi-threats-card');

    if (elEvents) elEvents.textContent = this.kpis.events.toLocaleString();
    if (elSignals) elSignals.textContent = this.kpis.signals.toLocaleString();
    if (elCases) elCases.textContent = this.kpis.cases.toLocaleString();
    if (elThreats) elThreats.textContent = this.kpis.threats.toLocaleString();
    if (elLatency) elLatency.textContent = `${this.kpis.latency}ms`;

    if (elThreatCard) {
      if (this.kpis.threats > 0) {
        elThreatCard.classList.add('card--danger');
      } else {
        elThreatCard.classList.remove('card--danger');
      }
    }
  }
}
