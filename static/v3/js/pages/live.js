/**
 * IdentityShield v3 — Live Page Controller
 * Security Operations Center (SOC) Console
 * Wires the 15-Agent Pipeline Board, SVG Connectors, Traveling Packets,
 * Live Agent Console Terminal, Event Trace & Verdict, Health Matrix, and Simulation Engine.
 */

import { SocBoard } from '../../assets/js/soc/board.js';
import { SocConnectors } from '../../assets/js/soc/connectors.js';
import { SocPackets } from '../../assets/js/soc/packets.js';
import { SocConsole } from '../../assets/js/soc/console.js';
import { SocTrace } from '../../assets/js/soc/trace.js';
import { SocMatrix } from '../../assets/js/soc/matrix.js';
import { SocEngine } from '../../assets/js/soc/engine.js';
import { mountCyberCommand3D } from '../../assets/js/soc/cyberCommand3D.js';

let boardInstance = null;
let connectorsInstance = null;
let packetsInstance = null;
let consoleInstance = null;
let traceInstance = null;
let matrixInstance = null;
let engineInstance = null;
let cyber3dInstance = null;

export async function initLivePage() {
  const boardEl = document.getElementById('soc-board');
  const svgEl = document.getElementById('soc-connectors');
  const packetsOverlayEl = document.getElementById('soc-packets');
  const consoleViewportEl = document.getElementById('console-viewport');
  const consoleToolbarEl = document.getElementById('soc-console-toolbar');
  const traceCardEl = document.getElementById('soc-trace-card');
  const matrixCanvasEl = document.getElementById('soc-matrix-canvas');

  // Initialize UI components
  if (boardEl) {
    boardInstance = new SocBoard(boardEl);
  }

  if (svgEl && boardEl) {
    connectorsInstance = new SocConnectors(svgEl, boardEl);
  }

  if (packetsOverlayEl && connectorsInstance) {
    packetsInstance = new SocPackets(packetsOverlayEl, connectorsInstance);
  }

  if (consoleViewportEl && consoleToolbarEl) {
    consoleInstance = new SocConsole(consoleViewportEl, consoleToolbarEl);
  }

  if (traceCardEl) {
    traceInstance = new SocTrace(traceCardEl);
  }

  if (matrixCanvasEl) {
    matrixInstance = new SocMatrix(matrixCanvasEl);
  }

  // Mount Interactive 3D Cyber Command Center Engine
  const cyber3dCanvasEl = document.getElementById('cyber-command-3d-canvas');
  if (cyber3dCanvasEl) {
    cyber3dInstance = mountCyberCommand3D(cyber3dCanvasEl, { height: 540 });
  }

  // Initialize Engine
  engineInstance = new SocEngine();

  // Setup Controls
  setupControls(engineInstance, boardInstance, consoleInstance, cyber3dInstance);

  // Setup Drawer close handlers
  setupDrawerHandlers();

  // Start engine automatically in default mixed traffic mode
  engineInstance.play();
}

function setupControls(engine, board, consoleTerm) {
  const selectScenario = document.getElementById('select-scenario');
  const selectPace = document.getElementById('select-pace');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnPlayIcon = document.getElementById('btn-play-icon');
  const btnPlayText = document.getElementById('btn-play-text');
  const btnStep = document.getElementById('btn-step');
  const btnReset = document.getElementById('btn-reset');

  if (selectScenario) {
    selectScenario.addEventListener('change', () => {
      const scenarioId = selectScenario.value;
      engine.setScenario(scenarioId);
      if (btnPlayText) btnPlayText.textContent = 'Pause';
      if (btnPlayIcon) btnPlayIcon.textContent = '⏸';
    });
  }

  if (selectPace) {
    selectPace.addEventListener('change', () => {
      engine.setPace(selectPace.value);
    });
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (engine.isPlaying) {
        engine.pause();
        if (btnPlayText) btnPlayText.textContent = 'Play';
        if (btnPlayIcon) btnPlayIcon.textContent = '▶';
      } else {
        engine.play();
        if (btnPlayText) btnPlayText.textContent = 'Pause';
        if (btnPlayIcon) btnPlayIcon.textContent = '⏸';
      }
    });
  }

  if (btnStep) {
    btnStep.addEventListener('click', () => {
      if (engine.isPlaying) {
        engine.pause();
        if (btnPlayText) btnPlayText.textContent = 'Play';
        if (btnPlayIcon) btnPlayIcon.textContent = '▶';
      }
      engine.step();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      engine.reset();
      if (board) board.reset();
      if (consoleTerm) consoleTerm.clear();
      if (btnPlayText) btnPlayText.textContent = 'Play';
      if (btnPlayIcon) btnPlayIcon.textContent = '▶';
    });
  }

  // 3D View Switcher & Camera Controls
  const btnView3d = document.getElementById('btn-view-3d');
  const btnView2d = document.getElementById('btn-view-2d');
  const wrap3d = document.getElementById('cyber-command-3d-wrap');
  const card2d = document.getElementById('soc-2d-board-card');
  const btnCamReset = document.getElementById('btn-cam-reset');
  const btnCamFlow = document.getElementById('btn-cam-flow');
  const btnCamTopDown = document.getElementById('btn-cam-topdown');

  if (btnView3d && btnView2d && wrap3d && card2d) {
    btnView3d.addEventListener('click', () => {
      wrap3d.style.display = 'block';
      card2d.style.display = 'none';
      btnView3d.className = 'btn btn--primary';
      btnView2d.className = 'btn btn--subtle';
      window.dispatchEvent(new Event('resize'));
    });

    btnView2d.addEventListener('click', () => {
      wrap3d.style.display = 'none';
      card2d.style.display = 'block';
      btnView2d.className = 'btn btn--primary';
      btnView3d.className = 'btn btn--subtle';
      window.dispatchEvent(new Event('resize'));
    });
  }

  if (btnCamReset) {
    btnCamReset.addEventListener('click', () => {
      if (cyber3dInstance) cyber3dInstance.resetCameraView();
    });
  }

  if (btnCamFlow) {
    btnCamFlow.addEventListener('click', () => {
      if (cyber3dInstance) cyber3dInstance.setPipelineFlowView();
    });
  }

  if (btnCamTopDown) {
    btnCamTopDown.addEventListener('click', () => {
      if (cyber3dInstance) cyber3dInstance.setTacticalTopDownView();
    });
  }
}

function setupDrawerHandlers() {
  const drawer = document.getElementById('agent-drawer');
  const backdrop = document.getElementById('agent-drawer-backdrop');
  const closeBtn = document.getElementById('drawer-agent-close');

  const close = () => {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

// Auto-boot on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLivePage);
} else {
  initLivePage();
}
