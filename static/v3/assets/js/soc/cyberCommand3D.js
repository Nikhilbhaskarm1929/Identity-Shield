/**
 * IdentityShield v3 — CyberCommand 3D Engine
 * Interactive, fully 3D connected spatial DAG graph for the 15-Agent Pipeline.
 *
 * Architecture:
 * 1. 15 3D Graph Nodes arranged in a clear 5-Layer Pipeline DAG across 3D space.
 * 2. Explicit 3D Directed Graph Edges connecting Ingestion -> Signals -> ML -> Decision -> Remediation.
 * 3. Closed-loop Continuous Learning Feedback Edge looping high in 3D from Agent 15 back to Agent 02 & 10.
 * 4. Active Working Highlighting: when an agent (e.g. Normalizer) is working, it surges with radiant
 *    neon glow, fires expanding 3D shockwave rings, and illuminates its connected graph edges.
 * 5. Overhead Sentinel: Agent 00 (Omni-Supervisor) auditing the graph with sub-millisecond precision chronometers.
 * 6. Interactive 3D Damped Orbit, Zoom, Node Click-to-Inspect, and Camera Preset Views.
 */

import * as ModuleTHREE from '/vendor/three/three.module.js';
import { bus } from './bus.js';
import { escHtml } from '/v3/js/core/dom.js';

// Resolve THREE: prefer global window.THREE, fallback to ModuleTHREE
const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : ModuleTHREE;

// 15 Canonical Graph Nodes positioned across 5 architectural pipeline layers
export const GRAPH_NODES = [
  // Layer 01: Ingestion & Normalization (Left tier, X = -7.6)
  { id: 'a01', num: '01', key: 'collector', name: 'Collector', role: 'Stream Ingress', layer: 1, layerName: '01 · INGESTION', pos: [-7.6, 1.2, -2.4], color: 0x00e676 },
  { id: 'a02', num: '02', key: 'normalizer', name: 'Normalizer', role: 'OCSF Parsing', layer: 1, layerName: '01 · INGESTION', pos: [-7.6, 1.2, 0.0], color: 0x00e676 },
  { id: 'a03', num: '03', key: 'enricher', name: 'Context & Intel', role: 'Threat Feeds', layer: 1, layerName: '01 · INGESTION', pos: [-7.6, 1.2, 2.4], color: 0x00e676 },

  // Layer 02: Identity Signals (Mid-Left tier, X = -3.8)
  { id: 'a04', num: '04', key: 'device', name: 'Device FP', role: 'Browser & OS Drift', layer: 2, layerName: '02 · SIGNALS', pos: [-3.8, 1.4, -2.6], color: 0x00e676 },
  { id: 'a05', num: '05', key: 'access', name: 'Access Anomaly', role: 'Dormant / Off-Hours', layer: 2, layerName: '02 · SIGNALS', pos: [-3.8, 1.4, 0.0], color: 0x00e676 },
  { id: 'a06', num: '06', key: 'session', name: 'Session Token', role: 'Replay & Hijack', layer: 2, layerName: '02 · SIGNALS', pos: [-3.8, 1.4, 2.6], color: 0x00e676 },

  // Layer 03: Threat Detection & Behavioral ML (Center tier, X = 0.0)
  { id: 'a07', num: '07', key: 'credentials', name: 'Credentials', role: 'Password Spray', layer: 3, layerName: '03 · DETECTION & ML', pos: [0.0, 1.6, -3.8], color: 0x00e676 },
  { id: 'a08', num: '08', key: 'velocity', name: 'Geo-Velocity', role: 'Impossible Travel', layer: 3, layerName: '03 · DETECTION & ML', pos: [0.0, 1.6, -1.9], color: 0x00e676 },
  { id: 'a09', num: '09', key: 'privilege', name: 'Privilege Esc.', role: 'Admin Policy Drift', layer: 3, layerName: '03 · DETECTION & ML', pos: [0.0, 1.6, 0.0], color: 0x00e676 },
  { id: 'a10', num: '10', key: 'behavior', name: 'Behavior ML', role: 'Isolation Forest', layer: 3, layerName: '03 · DETECTION & ML', pos: [0.0, 1.6, 1.9], color: 0x00e676 },
  { id: 'a11', num: '11', key: 'correlation', name: 'Campaign Cluster', role: 'Actor Correlation', layer: 3, layerName: '03 · DETECTION & ML', pos: [0.0, 1.6, 3.8], color: 0x00e676 },

  // Layer 04: Risk Decision & Case Fusion (Mid-Right tier, X = 3.8)
  { id: 'a12', num: '12', key: 'fusion', name: 'Risk Fusion', role: 'Bayesian Scoring', layer: 4, layerName: '04 · DECISION', pos: [3.8, 1.4, -1.6], color: 0xf5a524 },
  { id: 'a13', num: '13', key: 'investigation', name: 'Investigation', role: 'Automated Dossier', layer: 4, layerName: '04 · DECISION', pos: [3.8, 1.4, 1.6], color: 0xff3b3b },

  // Layer 05: Remediation & Continuous Learning (Right tier, X = 7.6)
  { id: 'a14', num: '14', key: 'response', name: 'Response Engine', role: 'Autonomous Action', layer: 5, layerName: '05 · LEARNING', pos: [7.6, 1.2, -1.5], color: 0xff3b3b },
  { id: 'a15', num: '15', key: 'feedback', name: 'Feedback & Tuning', role: 'Threshold Optimizer', layer: 5, layerName: '05 · LEARNING', pos: [7.6, 1.2, 1.5], color: 0x00e676 },
];

export const AGENT_NODES_3D = GRAPH_NODES;

// Explicit Directed Graph Edges linking the pipeline
export const GRAPH_EDGES = [
  // Layer 1 Ingestion intra-flow
  { from: 'a01', to: 'a02' },
  { from: 'a02', to: 'a03' },

  // Layer 1 Normalizer (a02) feeds the Signals Layer
  { from: 'a02', to: 'a04' },
  { from: 'a02', to: 'a05' },
  { from: 'a02', to: 'a06' },
  { from: 'a03', to: 'a05' },

  // Layer 2 Signals feed Detection & ML Layer
  { from: 'a04', to: 'a07' },
  { from: 'a04', to: 'a10' },
  { from: 'a05', to: 'a08' },
  { from: 'a05', to: 'a09' },
  { from: 'a06', to: 'a07' },
  { from: 'a06', to: 'a10' },
  { from: 'a06', to: 'a11' },

  // Layer 3 Detection engines converge into Risk Fusion & Investigation
  { from: 'a07', to: 'a12' },
  { from: 'a08', to: 'a12' },
  { from: 'a09', to: 'a12' },
  { from: 'a10', to: 'a12' },
  { from: 'a11', to: 'a12' },
  { from: 'a11', to: 'a13' },
  { from: 'a12', to: 'a13' },

  // Layer 4 Decision leads to Response & Continuous Feedback
  { from: 'a12', to: 'a14' },
  { from: 'a13', to: 'a14' },
  { from: 'a12', to: 'a15' },
  { from: 'a13', to: 'a15' },

  // High-Altitude Feedback Loop Edge (from a15 back to a02 Normalizer and a10 ML)
  { from: 'a15', to: 'a02', isFeedback: true },
  { from: 'a15', to: 'a10', isFeedback: true },
];

export class CyberCommand3D {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = options;
    const parentW = containerEl.parentElement ? containerEl.parentElement.clientWidth : 0;
    this.width = containerEl.clientWidth || parentW || window.innerWidth || 1200;
    this.height = options.height || containerEl.clientHeight || 460;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.rootGroup = null;
    this.nodeMeshes = new Map();
    this.edgeMeshes = [];
    this.hudOverlays = new Map();
    this.activePackets = [];
    this.activeShockwaves = [];
    this.selectedAgentId = null;

    // Camera & Interaction parameters
    this.cameraState = {
      rotX: 0.42,
      rotY: 0.08,
      targetRotX: 0.42,
      targetRotY: 0.08,
      dist: 18.5,
      targetDist: 18.5,
      panX: 0,
      panY: 1.2,
      targetPanX: 0,
      targetPanY: 1.2,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      isHovering: false,
    };

    // Master Omni-Supervisor telemetry
    this.supervisorState = {
      activeEventId: 'DEMO-8F3A21',
      eventStartTime: Date.now(),
      pipelineLatency: 42.1,
      totalVerified: 4280,
    };

    this.rafId = null;
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    this.setupScene();
    this.setupLighting();
    this.buildTopologicalGridPlatform();
    this.buildConnectedGraphEdges();
    this.buildGraphNodes();
    this.buildOmniSupervisorSentinel();
    this.setupInteractionListeners();
    this.bindBusEvents();
    this.startAnimationLoop();

    // Trigger post-mount layout refresh
    setTimeout(() => {
      if (this.container && this.renderer && this.camera) {
        const w = this.container.clientWidth || this.container.parentElement?.clientWidth || this.width;
        const h = this.options.height || this.container.clientHeight || this.height;
        if (w > 0 && h > 0) {
          this.width = w;
          this.height = h;
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
        }
      }
    }, 120);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = null; // No black fog obscuring graph

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 140);
    this.updateCameraTransform();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.appendChild(this.renderer.domElement);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.packetGroup = new THREE.Group();
    this.rootGroup.add(this.packetGroup);

    // 3D HTML HUD Overlay Container
    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'cyber-3d-hud-container';
    this.hudContainer.style.position = 'absolute';
    this.hudContainer.style.inset = '0';
    this.hudContainer.style.pointerEvents = 'none';
    this.hudContainer.style.zIndex = '10';
    this.container.appendChild(this.hudContainer);
  }

  setupLighting() {
    // 1. Crisp white ambient fill so every node and edge is clearly visible
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambient);

    // 2. Strong white directional key light with depth
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 18, 12);
    this.scene.add(key);

    // 3. Cyber emerald rim light
    const rim = new THREE.DirectionalLight(0x00e676, 1.8);
    rim.position.set(-8, 8, -6);
    this.scene.add(rim);

    // 4. Overhead Supervisor Sentinel Point Light
    this.sentinelLight = new THREE.PointLight(0x00e676, 3.0, 24, 1.2);
    this.sentinelLight.position.set(0, 4.8, 0);
    this.scene.add(this.sentinelLight);
  }

  buildTopologicalGridPlatform() {
    const gridGroup = new THREE.Group();

    // 1. Layer Column Guides on the floor
    const layerX = [-7.6, -3.8, 0.0, 3.8, 7.6];
    const layerColors = [0x00e676, 0x00e676, 0x00e676, 0xf5a524, 0x00e676];

    layerX.forEach((x, i) => {
      // Longitudinal guide bar
      const barGeom = new THREE.BoxGeometry(0.04, 0.02, 10.5);
      const barMat = new THREE.MeshBasicMaterial({
        color: layerColors[i],
        transparent: true,
        opacity: i === 2 ? 0.45 : 0.25,
      });
      const bar = new THREE.Mesh(barGeom, barMat);
      bar.position.set(x, -0.02, 0);
      gridGroup.add(bar);

      // Floor Zone Ring beneath each layer
      const ringGeom = new THREE.RingGeometry(0.8, 0.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: layerColors[i],
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, -0.01, 0);
      gridGroup.add(ring);
    });

    // 2. Cross Grid Lines (Z-Axis)
    for (let z = -5; z <= 5; z += 1.25) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10.5, -0.02, z),
        new THREE.Vector3(10.5, -0.02, z),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00e676,
        transparent: true,
        opacity: 0.15,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      gridGroup.add(line);
    }

    // 3. Cyber Platform Perimeter Border
    const basePlateGeom = new THREE.BoxGeometry(21.5, 0.15, 11.5);
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0x081510,
      metalness: 0.85,
      roughness: 0.25,
    });
    const basePlate = new THREE.Mesh(basePlateGeom, basePlateMat);
    basePlate.position.set(0, -0.1, 0);
    gridGroup.add(basePlate);

    // Glowing border outline
    const borderEdges = new THREE.EdgesGeometry(basePlateGeom);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.45,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMat);
    borderLines.position.copy(basePlate.position);
    gridGroup.add(borderLines);

    this.rootGroup.add(gridGroup);
  }

  buildConnectedGraphEdges() {
    const nodeMap = new Map();
    GRAPH_NODES.forEach((n) => nodeMap.set(n.id, n));

    this.edgeGroup = new THREE.Group();
    this.rootGroup.add(this.edgeGroup);

    GRAPH_EDGES.forEach((edgeDef) => {
      const fromNode = nodeMap.get(edgeDef.from);
      const toNode = nodeMap.get(edgeDef.to);
      if (!fromNode || !toNode) return;

      const p0 = new THREE.Vector3(...fromNode.pos);
      const p2 = new THREE.Vector3(...toNode.pos);

      // Calculate smooth 3D curved trajectory
      let p1;
      if (edgeDef.isFeedback) {
        // High-altitude feedback arc looping back across the ceiling of the graph
        p1 = new THREE.Vector3((p0.x + p2.x) / 2, 4.2, (p0.z + p2.z) / 2 - 2.0);
      } else {
        // Gentle spatial curve between sequential layers
        p1 = new THREE.Vector3((p0.x + p2.x) / 2, Math.max(p0.y, p2.y) + 0.35, (p0.z + p2.z) / 2);
      }

      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const points = curve.getPoints(24);
      const geom = new THREE.BufferGeometry().setFromPoints(points);

      const isFeedback = !!edgeDef.isFeedback;
      const mat = new THREE.LineBasicMaterial({
        color: isFeedback ? 0x22ff9a : 0x00e676,
        transparent: true,
        opacity: isFeedback ? 0.65 : 0.45,
        linewidth: 2,
      });

      const line = new THREE.Line(geom, mat);
      this.edgeGroup.add(line);

      this.edgeMeshes.push({
        line,
        mat,
        curve,
        fromId: edgeDef.from,
        toId: edgeDef.to,
        isFeedback,
        highlightTime: 0,
      });
    });
  }

  buildGraphNodes() {
    GRAPH_NODES.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...node.pos);
      nodeGroup.userData = { agentId: node.id, agentKey: node.key, node };

      // 1. Luminous Cyber Sphere
      const sphereGeom = new THREE.SphereGeometry(0.38, 28, 28);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.65,
        metalness: 0.4,
        roughness: 0.15,
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      nodeGroup.add(sphere);

      // 2. Inner Glowing Wireframe Core
      const coreGeom = new THREE.OctahedronGeometry(0.24, 0);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      nodeGroup.add(core);

      // 3. Orbiting Crystalline Sensor Torus
      const ringGeom = new THREE.TorusGeometry(0.56, 0.022, 8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 3;
      nodeGroup.add(ring);

      // 4. Vertical Ground Beacon Column (connecting node down to floor grid)
      const beaconGeom = new THREE.CylinderGeometry(0.018, 0.018, node.pos[1], 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.45,
      });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.y = -node.pos[1] / 2;
      nodeGroup.add(beacon);

      // 5. Floor Target Pedestal
      const pedestalGeom = new THREE.CylinderGeometry(0.35, 0.45, 0.08, 6);
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x0e2418,
        metalness: 0.9,
        roughness: 0.3,
      });
      const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
      pedestal.position.y = -node.pos[1] + 0.04;
      nodeGroup.add(pedestal);

      // 6. Threat Containment Cage (Hidden initially)
      const cageGeom = new THREE.BoxGeometry(1.0, 1.0, 1.0);
      const cageEdges = new THREE.EdgesGeometry(cageGeom);
      const cageMat = new THREE.LineBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0 });
      const cage = new THREE.LineSegments(cageEdges, cageMat);
      nodeGroup.add(cage);

      this.rootGroup.add(nodeGroup);

      this.nodeMeshes.set(node.id, {
        group: nodeGroup,
        sphere,
        core,
        ring,
        beacon,
        cage,
        node,
        state: 'idle',
        timerMs: 0,
        highlightPulse: 0,
      });

      // Attach 3D HTML HUD Badge
      this.createNodeHudOverlay(node);
    });
  }

  createNodeHudOverlay(node) {
    const el = document.createElement('div');
    el.className = 'cyber-3d-agent-badge';
    el.dataset.agentId = node.id;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -100%)';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';

    el.innerHTML = `
      <div class="cyber-badge-inner" style="background:rgba(7,14,10,0.92); border:1px solid var(--border-2); border-radius:var(--radius-sm); padding:4px 8px; backdrop-filter:blur(6px); display:flex; flex-direction:column; gap:2px; box-shadow:0 4px 14px rgba(0,0,0,0.8); transition:all 0.15s ease;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
          <span class="mono font-bold" style="font-size:10px; color:var(--text-1); white-space:nowrap;">
            ${node.num} ${escHtml(node.name)}
          </span>
          <span class="cyber-badge-timer mono" style="font-size:9px; color:var(--text-3);">[0ms]</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
          <span class="cyber-badge-state badge low mono" style="font-size:8px; padding:1px 4px;">IDLE</span>
          <span class="cyber-badge-role mono muted" style="font-size:8px; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(node.role)}</span>
        </div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.inspectAgent(node.id);
    });

    el.addEventListener('mouseenter', () => {
      this.highlightNode(node.id, true);
    });

    el.addEventListener('mouseleave', () => {
      this.highlightNode(node.id, false);
    });

    this.hudContainer.appendChild(el);
    this.hudOverlays.set(node.id, el);
  }

  buildOmniSupervisorSentinel() {
    this.sentinelGroup = new THREE.Group();
    this.sentinelGroup.position.set(0, 4.6, 0);

    // 1. Faceted Master Diamond (Octahedron)
    const octGeom = new THREE.OctahedronGeometry(0.75, 0);
    const octMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.9,
      metalness: 0.85,
      roughness: 0.1,
    });
    this.sentinelMesh = new THREE.Mesh(octGeom, octMat);
    this.sentinelGroup.add(this.sentinelMesh);

    // 2. Counter-Rotating Cyber Gyroscope Gimbal
    const gyroGeom = new THREE.TorusGeometry(1.15, 0.025, 8, 36);
    const gyroMat = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.75 });
    this.sentinelGyro = new THREE.Mesh(gyroGeom, gyroMat);
    this.sentinelGroup.add(this.sentinelGyro);

    // 3. Sweeping Emerald Surveillance Radar Arc
    const scanGeom = new THREE.ConeGeometry(3.5, 4.2, 3, 1, true);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    this.sentinelRadar = new THREE.Mesh(scanGeom, scanMat);
    this.sentinelRadar.rotation.x = Math.PI;
    this.sentinelRadar.position.y = -2.1;
    this.sentinelGroup.add(this.sentinelRadar);

    this.rootGroup.add(this.sentinelGroup);
  }

  setupInteractionListeners() {
    const el = this.container;

    // Mouse Drag to Orbit
    el.addEventListener('mousedown', (e) => {
      this.cameraState.isDragging = true;
      this.cameraState.lastMouseX = e.clientX;
      this.cameraState.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.cameraState.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.cameraState.isDragging) {
        const dx = e.clientX - this.cameraState.lastMouseX;
        const dy = e.clientY - this.cameraState.lastMouseY;
        this.cameraState.lastMouseX = e.clientX;
        this.cameraState.lastMouseY = e.clientY;

        this.cameraState.targetRotY -= dx * 0.006;
        this.cameraState.targetRotX = Math.max(0.05, Math.min(1.52, this.cameraState.targetRotX - dy * 0.005));
      }
    });

    // Wheel to Zoom
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraState.targetDist = Math.max(8.0, Math.min(32.0, this.cameraState.targetDist + e.deltaY * 0.015));
    }, { passive: false });

    // Window Resize Observer
    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth || this.container.parentElement?.clientWidth || this.width;
      const h = this.options.height || this.container.clientHeight || this.height;

      if (w > 0 && h > 0) {
        this.width = w;
        this.height = h;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    };

    window.addEventListener('resize', onResize);
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(this.container);
  }

  bindBusEvents() {
    bus.on('agent:state', ({ agentId, state, eventId }) => {
      this.setAgentState(agentId, state, eventId);
    });

    bus.on('agent:check', ({ agentId, eventId, text, level, ms }) => {
      this.updateAgentTiming(agentId, text, level, ms);
    });

    bus.on('packet:move', ({ eventId, fromLayer, toLayer, verdict }) => {
      this.spawnEdgePacketsBetweenLayers(fromLayer, toLayer, verdict);
    });

    bus.on('event:verdict', ({ score, level }) => {
      this.updateSystemThreatState(score, level);
    });

    bus.on('event:new', ({ event }) => {
      this.supervisorState.activeEventId = event.id;
      this.supervisorState.eventStartTime = Date.now();
      this.supervisorState.totalVerified++;
      this.updateSupervisorHud();
    });
  }

  /**
   * Highlight agent working state (e.g. Normalizer working)
   */
  setAgentState(agentId, state, eventId) {
    if (agentId === 'all') {
      this.nodeMeshes.forEach((mesh, id) => {
        mesh.state = state;
        this.applyNodeVisualState(id, state);
      });
      return;
    }

    const mesh = this.nodeMeshes.get(agentId);
    if (!mesh) return;

    mesh.state = state;
    this.applyNodeVisualState(agentId, state);

    // Trigger Expanding 3D Shockwave when Working/Analyzing
    if (state === 'receiving' || state === 'scanning' || state === 'analyzing') {
      this.triggerShockwave(mesh);
      this.highlightConnectedEdges(agentId);
    }

    // Update 3D HTML HUD Badge
    const hud = this.hudOverlays.get(agentId);
    if (hud) {
      const stateEl = hud.querySelector('.cyber-badge-state');
      const inner = hud.querySelector('.cyber-badge-inner');
      if (stateEl) {
        stateEl.textContent = state.toUpperCase();
        stateEl.className = `cyber-badge-state badge mono ${state === 'flagged' || state === 'blocked' ? 'high' : (state === 'warn' ? 'medium' : (state === 'idle' ? 'neutral' : 'low'))}`;
      }
      if (inner) {
        if (state === 'scanning' || state === 'analyzing' || state === 'receiving') {
          inner.style.borderColor = 'var(--green-500)';
          inner.style.boxShadow = '0 0 18px rgba(0, 230, 118, 0.6)';
          inner.style.background = 'rgba(10, 28, 18, 0.95)';
        } else if (state === 'flagged' || state === 'blocked') {
          inner.style.borderColor = 'var(--red-500)';
          inner.style.boxShadow = '0 0 20px rgba(255, 59, 59, 0.6)';
          inner.style.background = 'rgba(28, 10, 10, 0.95)';
        } else if (state === 'warn') {
          inner.style.borderColor = 'var(--amber-500)';
          inner.style.boxShadow = '0 0 16px rgba(245, 165, 36, 0.5)';
        } else {
          inner.style.borderColor = 'var(--border-2)';
          inner.style.boxShadow = '0 4px 14px rgba(0,0,0,0.7)';
          inner.style.background = 'rgba(7,14,10,0.88)';
        }
      }
    }
  }

  applyNodeVisualState(agentId, state) {
    const m = this.nodeMeshes.get(agentId);
    if (!m) return;

    if (state === 'idle') {
      m.sphere.material.emissiveIntensity = 0.65;
      m.ring.material.opacity = 0.85;
      m.cage.material.opacity = 0;
      m.sphere.scale.set(1.0, 1.0, 1.0);
    } else if (state === 'receiving' || state === 'scanning' || state === 'analyzing') {
      // High-intensity WORKING glow
      m.sphere.material.emissiveIntensity = 3.5;
      m.ring.material.opacity = 1.0;
      m.sphere.scale.set(1.22, 1.22, 1.22);
    } else if (state === 'pass') {
      // Verified green nominal
      m.sphere.material.emissiveIntensity = 1.2;
      m.cage.material.opacity = 0;
      m.sphere.scale.set(1.0, 1.0, 1.0);
    } else if (state === 'warn') {
      // Medium amber warning
      m.sphere.material.color.setHex(0xf5a524);
      m.sphere.material.emissive.setHex(0xf5a524);
      m.sphere.material.emissiveIntensity = 2.5;
      m.ring.material.color.setHex(0xf5a524);
    } else if (state === 'flagged') {
      // Critical threat crimson pulse
      m.sphere.material.color.setHex(0xff3b3b);
      m.sphere.material.emissive.setHex(0xff3b3b);
      m.sphere.material.emissiveIntensity = 3.8;
      m.ring.material.color.setHex(0xff3b3b);
    } else if (state === 'blocked') {
      m.sphere.material.color.setHex(0xff3b3b);
      m.sphere.material.emissive.setHex(0xff3b3b);
      m.sphere.material.emissiveIntensity = 4.0;
      m.cage.material.opacity = 0.9;
    }
  }

  /**
   * Expanding 3D Shockwave Ring when node is working
   */
  triggerShockwave(mesh) {
    const shockGeom = new THREE.RingGeometry(0.45, 0.55, 32);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const shockRing = new THREE.Mesh(shockGeom, shockMat);
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.set(mesh.node.pos[0], 0.05, mesh.node.pos[2]);
    this.rootGroup.add(shockRing);

    this.activeShockwaves.push({
      mesh: shockRing,
      scale: 1.0,
      opacity: 0.9,
      speed: 0.05,
    });
  }

  /**
   * Illuminate graph edges connected to active agent
   */
  highlightConnectedEdges(agentId) {
    this.edgeMeshes.forEach((e) => {
      if (e.fromId === agentId || e.toId === agentId) {
        e.highlightTime = 1.0;
        e.mat.opacity = 1.0;
        e.mat.color.setHex(0x22ff9a);

        // Spawn a photon stream along this active edge
        this.spawnPhotonOnCurve(e.curve, e.isFeedback ? 0x22ff9a : 0x00e676);
      }
    });
  }

  spawnPhotonOnCurve(curve, color = 0x00e676) {
    const pGeom = new THREE.SphereGeometry(0.1, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({ color });
    const pMesh = new THREE.Mesh(pGeom, pMat);
    this.packetGroup.add(pMesh);

    this.activePackets.push({
      mesh: pMesh,
      curve,
      progress: 0,
      speed: 0.04,
    });
  }

  spawnEdgePacketsBetweenLayers(fromLayer, toLayer, verdict) {
    this.edgeMeshes.forEach((e) => {
      const fromNode = GRAPH_NODES.find((n) => n.id === e.fromId);
      const toNode = GRAPH_NODES.find((n) => n.id === e.toId);
      if (fromNode && toNode && fromNode.layer === fromLayer && toNode.layer === toLayer) {
        e.highlightTime = 1.0;
        const color = verdict === 'CRITICAL' || verdict === 'HIGH' ? 0xff3b3b : (verdict === 'MEDIUM' ? 0xf5a524 : 0x00e676);
        this.spawnPhotonOnCurve(e.curve, color);
      }
    });
  }

  updateAgentTiming(agentId, text, level, ms) {
    const m = this.nodeMeshes.get(agentId);
    if (m) m.timerMs = ms || 12;

    const hud = this.hudOverlays.get(agentId);
    if (hud) {
      const timerEl = hud.querySelector('.cyber-badge-timer');
      if (timerEl) {
        timerEl.textContent = `[+${ms || 12}ms]`;
        timerEl.style.color = level === 'threat' ? 'var(--red-500)' : (level === 'warn' ? 'var(--amber-500)' : 'var(--text-3)');
      }
    }
  }

  updateSystemThreatState(score, level) {
    const isThreat = level === 'CRITICAL' || level === 'HIGH';
    const isWarn = level === 'MEDIUM';

    if (this.sentinelMesh) {
      if (isThreat) {
        this.sentinelMesh.material.color.setHex(0xff3b3b);
        this.sentinelMesh.material.emissive.setHex(0xff3b3b);
        this.sentinelLight.color.setHex(0xff3b3b);
      } else if (isWarn) {
        this.sentinelMesh.material.color.setHex(0xf5a524);
        this.sentinelMesh.material.emissive.setHex(0xf5a524);
        this.sentinelLight.color.setHex(0xf5a524);
      } else {
        this.sentinelMesh.material.color.setHex(0x00e676);
        this.sentinelMesh.material.emissive.setHex(0x00e676);
        this.sentinelLight.color.setHex(0x00e676);
      }
    }
  }

  updateSupervisorHud() {
    const elapsed = Date.now() - this.supervisorState.eventStartTime;
    const supTimer = document.getElementById('supervisor-chronometer');
    const supEvent = document.getElementById('supervisor-active-event');
    const supLatency = document.getElementById('supervisor-hotpath-latency');

    if (supTimer) supTimer.textContent = `T+${elapsed}ms`;
    if (supEvent) supEvent.textContent = this.supervisorState.activeEventId;
    if (supLatency) supLatency.textContent = `${Math.min(999, elapsed + 18)}ms`;
  }

  inspectAgent(agentId) {
    this.selectedAgentId = agentId;
    const m = this.nodeMeshes.get(agentId);
    if (!m) return;

    // Smoothly fly camera to focus on this agent
    this.cameraState.targetPanX = m.node.pos[0] * 0.8;
    this.cameraState.targetPanY = m.node.pos[1] + 0.4;
    this.cameraState.targetDist = 10.5;

    // Highlight this node and its direct neighbors
    this.highlightConnectedEdges(agentId);

    // Open sliding Agent Inspector Drawer
    bus.emit('agent:inspect', { agentId, node: m.node });
  }

  highlightNode(agentId, isHigh) {
    const m = this.nodeMeshes.get(agentId);
    const hud = this.hudOverlays.get(agentId);

    if (m) {
      m.sphere.scale.set(isHigh ? 1.25 : 1, isHigh ? 1.25 : 1, isHigh ? 1.25 : 1);
    }
    if (hud) {
      const inner = hud.querySelector('.cyber-badge-inner');
      if (inner) {
        inner.style.borderColor = isHigh ? 'var(--green-500)' : 'var(--border-2)';
        inner.style.transform = isHigh ? 'scale(1.08)' : 'scale(1.0)';
      }
    }
  }

  resetCameraView() {
    this.cameraState.targetRotX = 0.42;
    this.cameraState.targetRotY = 0.08;
    this.cameraState.targetDist = 18.5;
    this.cameraState.targetPanX = 0;
    this.cameraState.targetPanY = 1.2;
    this.selectedAgentId = null;
  }

  setPipelineFlowView() {
    this.cameraState.targetRotX = 0.12;
    this.cameraState.targetRotY = 0.0;
    this.cameraState.targetDist = 19.5;
    this.cameraState.targetPanX = 0;
    this.cameraState.targetPanY = 1.4;
  }

  setTacticalTopDownView() {
    this.cameraState.targetRotX = 1.50; // 90° down
    this.cameraState.targetRotY = 0;
    this.cameraState.targetDist = 22.0;
    this.cameraState.targetPanX = 0;
    this.cameraState.targetPanY = 0;
  }

  startAnimationLoop() {
    const animate = () => {
      this.rafId = requestAnimationFrame(animate);

      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // 1. Damped Camera Motion (Smooth slerp)
      const damp = Math.min(1, dt * 6.5);
      this.cameraState.rotX += (this.cameraState.targetRotX - this.cameraState.rotX) * damp;
      this.cameraState.rotY += (this.cameraState.targetRotY - this.cameraState.rotY) * damp;
      this.cameraState.dist += (this.cameraState.targetDist - this.cameraState.dist) * damp;
      this.cameraState.panX += (this.cameraState.targetPanX - this.cameraState.panX) * damp;
      this.cameraState.panY += (this.cameraState.targetPanY - this.cameraState.panY) * damp;

      this.updateCameraTransform();

      // 2. Animate Sentinel Overhead (Agent 00)
      if (this.sentinelGroup) {
        this.sentinelMesh.rotation.y += dt * 0.75;
        this.sentinelGyro.rotation.x += dt * 1.2;
        this.sentinelGyro.rotation.z -= dt * 0.9;
        this.sentinelRadar.rotation.y += dt * 1.5;
      }

      // 3. Animate 3D Graph Nodes
      this.nodeMeshes.forEach((mesh) => {
        mesh.ring.rotation.z += dt * (mesh.state === 'scanning' || mesh.state === 'analyzing' ? 3.5 : 0.8);
        mesh.core.rotation.y += dt * 1.4;

        if (mesh.state === 'flagged') {
          // Crimson danger pulse
          const pulse = 2.0 + Math.sin(elapsed * 12.0) * 0.9;
          mesh.sphere.material.emissiveIntensity = pulse;
        }
      });

      // 4. Animate Shockwaves
      for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
        const sw = this.activeShockwaves[i];
        sw.scale += dt * 2.6;
        sw.opacity -= dt * 1.2;

        if (sw.opacity <= 0) {
          this.rootGroup.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mesh.material.dispose();
          this.activeShockwaves.splice(i, 1);
        } else {
          sw.mesh.scale.set(sw.scale, sw.scale, 1);
          sw.mesh.material.opacity = Math.max(0, sw.opacity);
        }
      }

      // 5. Animate Connected Graph Edges
      this.edgeMeshes.forEach((e) => {
        if (e.highlightTime > 0) {
          e.highlightTime -= dt * 1.5;
          if (e.highlightTime <= 0) {
            e.mat.color.setHex(e.isFeedback ? 0x22ff9a : 0x00e676);
            e.mat.opacity = e.isFeedback ? 0.65 : 0.45;
          }
        }
      });

      // 6. Animate Traveling Photons along edges
      for (let i = this.activePackets.length - 1; i >= 0; i--) {
        const p = this.activePackets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          this.packetGroup.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.activePackets.splice(i, 1);
        } else {
          const pt = p.curve.getPoint(p.progress);
          p.mesh.position.copy(pt);
        }
      }

      // 7. Project 3D HUD Badges into Screen Coordinates
      this.projectHudBadges();

      // 8. Update Supervisor Chronometer Bar
      this.updateSupervisorHud();

      this.renderer.render(this.scene, this.camera);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  updateCameraTransform() {
    const rx = this.cameraState.rotX;
    const ry = this.cameraState.rotY;
    const d = this.cameraState.dist;

    const cx = Math.sin(ry) * Math.cos(rx) * d + this.cameraState.panX;
    const cy = Math.sin(rx) * d + this.cameraState.panY;
    const cz = Math.cos(ry) * Math.cos(rx) * d;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.cameraState.panX, this.cameraState.panY, 0);
  }

  projectHudBadges() {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const tempVec = new THREE.Vector3();

    this.nodeMeshes.forEach((mesh, id) => {
      const hud = this.hudOverlays.get(id);
      if (!hud) return;

      mesh.group.getWorldPosition(tempVec);
      tempVec.y += 0.65; // Position directly above node sphere

      tempVec.project(this.camera);

      // Check if node is behind camera
      if (tempVec.z > 1.0 || tempVec.z < -1.0) {
        hud.style.display = 'none';
        return;
      }

      hud.style.display = 'block';
      const screenX = tempVec.x * halfW + halfW;
      const screenY = -(tempVec.y * halfH) + halfH;

      const clampedX = Math.max(40, Math.min(this.width - 40, screenX));
      const clampedY = Math.max(20, Math.min(this.height - 20, screenY));

      hud.style.left = `${clampedX}px`;
      hud.style.top = `${clampedY}px`;
    });
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
    }
  }
}

// Global Factory Mount Helper
export function mountCyberCommand3D(container, options = {}) {
  if (!container) return null;
  return new CyberCommand3D(container, options);
}

// Backward Compatibility Export for shieldCore
export function mountShieldCore(container, options = {}) {
  return mountCyberCommand3D(container, options);
}
