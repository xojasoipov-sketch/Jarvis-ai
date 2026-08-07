/**
 * Holographic orb scene — adapted from
 * https://github.com/SAGAR-TAMANG/ultron-by-sagar-builds (MIT)
 *
 * Two resting states, driven by whether the orb is hearing anything:
 *   idle   — amber. The orb is asleep: slow breathing, dim wiring, no reach.
 *   active — blue. A voice woke it: nodes ride the spectrum, wiring lights up.
 *
 * Every node is bound to its own frequency bin, so a voice moves the whole
 * shell rather than a single highlighted point — the network reads as one
 * organism reacting, not a scatter of independent dots.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type OrbMode = "idle" | "active";

export type OrbSceneApi = {
  rotateBy: (dt: number, dp: number) => void;
  zoomBy: (factor: number) => void;
  /** ndcX/ndcY in [-1, 1] — lights up the nearest node to that screen point. */
  highlightAt: (ndcX: number, ndcY: number) => void;
  clearHighlight: () => void;
  /**
   * Feed live audio. `level` is overall loudness 0..1; `spectrum` is a
   * normalised frequency curve (any length — it is resampled onto the nodes).
   */
  setAudio: (level: number, spectrum: Float32Array | null) => void;
  setMode: (mode: OrbMode) => void;
  reset: () => void;
  dispose: () => void;
};

const NODE_COUNT = 64;
const NODE_RADIUS_BASE = 0.02;
const SHELL_RADIUS = 1.14;
const EDGE_NEIGHBORS = 2;
const HIGHLIGHT_NDC_RADIUS = 0.16;
const HIGHLIGHT_DECAY = 0.9;
const SPIN_DAMPING = 0.92;
const SPIN_CARRY = 0.72;

/** How fast the amber→blue crossfade runs, and how fast node energy falls back. */
const MODE_LERP = 0.055;
const ENERGY_ATTACK = 0.45;
const ENERGY_RELEASE = 0.08;

// Asleep: amber. The dim/bright pair is what a node breathes between.
const IDLE_DIM = new THREE.Color(0x4a3312);
const IDLE_BRIGHT = new THREE.Color(0xffc266);
const IDLE_CORE = new THREE.Color(0xffb347);
const IDLE_CORE_EMISSIVE = new THREE.Color(0x7a4a10);
const IDLE_SHELL = new THREE.Color(0xcc8a3a);

// Awake: blue.
const ACTIVE_DIM = new THREE.Color(0x14405e);
const ACTIVE_BRIGHT = new THREE.Color(0xa8e6ff);
const ACTIVE_CORE = new THREE.Color(0x9fdcff);
const ACTIVE_CORE_EMISSIVE = new THREE.Color(0x1d6ea8);
const ACTIVE_SHELL = new THREE.Color(0x5aa8ff);

// Hermes-orange — reserved for a deliberate point/hover, readable in both states.
const TOUCH_COLOR = new THREE.Color(0xff6a1a);

function fibonacciSphere(count: number, radius: number): Float32Array {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts[i * 3] = Math.cos(theta) * r * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return pts;
}

function buildEdges(positions: Float32Array, count: number, k: number): number[] {
  const pairs = new Set<string>();
  const edges: number[] = [];
  for (let i = 0; i < count; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let n = 0; n < k; n++) {
      const j = dists[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      edges.push(i, j);
    }
  }
  return edges;
}

export function createOrbScene(container: HTMLElement): OrbSceneApi {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0.15, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.4;
  controls.maxDistance = 6;
  controls.enablePan = false;

  const ambient = new THREE.AmbientLight(0x6688ff, 0.55);
  scene.add(ambient);
  const key = new THREE.PointLight(0x88ccff, 2.2, 20);
  key.position.set(2, 2, 3);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6644, 1.1, 16);
  rim.position.set(-2, -1, -2);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // Wireframe shells
  const shellMats: THREE.MeshBasicMaterial[] = [];
  for (const [r, op] of [
    [0.85, 0.45],
    [1.05, 0.28],
    [1.28, 0.16],
  ] as const) {
    const m = new THREE.MeshBasicMaterial({
      color: ACTIVE_SHELL.clone(),
      wireframe: true,
      transparent: true,
      opacity: op,
    });
    m.userData.baseOpacity = op;
    shellMats.push(m);
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), m));
  }

  // Core
  const coreMat = new THREE.MeshStandardMaterial({
    color: ACTIVE_CORE.clone(),
    emissive: ACTIVE_CORE_EMISSIVE.clone(),
    emissiveIntensity: 1.4,
    metalness: 0.3,
    roughness: 0.25,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 3), coreMat);
  root.add(core);

  // ── Live nodes — a breathing neural network on the outer shell ────────────
  const nodePositions = fibonacciSphere(NODE_COUNT, SHELL_RADIUS);
  const nodePhase = new Float32Array(NODE_COUNT);
  const nodeSpeed = new Float32Array(NODE_COUNT);
  const nodeActive = new Float32Array(NODE_COUNT); // 0..1, set by highlightAt
  const nodeEnergy = new Float32Array(NODE_COUNT); // 0..1, driven by the mic
  for (let i = 0; i < NODE_COUNT; i++) {
    nodePhase[i] = Math.random() * Math.PI * 2;
    nodeSpeed[i] = 0.6 + Math.random() * 0.9;
  }

  const nodeGeo = new THREE.IcosahedronGeometry(NODE_RADIUS_BASE, 1);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, NODE_COUNT);
  const dummy = new THREE.Object3D();
  const nodeColor = new THREE.Color();
  for (let i = 0; i < NODE_COUNT; i++) {
    dummy.position.set(nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2]);
    dummy.updateMatrix();
    nodeMesh.setMatrixAt(i, dummy.matrix);
    nodeMesh.setColorAt(i, IDLE_DIM);
  }
  nodeMesh.instanceMatrix.needsUpdate = true;
  if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
  root.add(nodeMesh);

  // ── Edges — nearest-neighbor wiring, brightness follows the nodes it joins
  const edgeIndex = buildEdges(nodePositions, NODE_COUNT, EDGE_NEIGHBORS);
  const edgeCount = edgeIndex.length / 2;
  const edgePos = new Float32Array(edgeCount * 2 * 3);
  for (let e = 0; e < edgeCount; e++) {
    const a = edgeIndex[e * 2];
    const b = edgeIndex[e * 2 + 1];
    edgePos[e * 6] = nodePositions[a * 3];
    edgePos[e * 6 + 1] = nodePositions[a * 3 + 1];
    edgePos[e * 6 + 2] = nodePositions[a * 3 + 2];
    edgePos[e * 6 + 3] = nodePositions[b * 3];
    edgePos[e * 6 + 4] = nodePositions[b * 3 + 1];
    edgePos[e * 6 + 5] = nodePositions[b * 3 + 2];
  }
  const edgeColor = new Float32Array(edgeCount * 2 * 3);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
  const edgeColorAttr = new THREE.BufferAttribute(edgeColor, 3);
  edgeGeo.setAttribute("color", edgeColorAttr);
  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    toneMapped: false,
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  root.add(edges);

  // Spiral points (ambient texture)
  const spiralN = 400;
  const spiralPos = new Float32Array(spiralN * 3);
  for (let i = 0; i < spiralN; i++) {
    const t = i / spiralN;
    const a = t * Math.PI * 10;
    const r = 0.2 + t * 0.7;
    spiralPos[i * 3] = Math.cos(a) * r;
    spiralPos[i * 3 + 1] = (t - 0.5) * 1.4;
    spiralPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const spiralGeo = new THREE.BufferGeometry();
  spiralGeo.setAttribute("position", new THREE.BufferAttribute(spiralPos, 3));
  const spiralMat = new THREE.PointsMaterial({
    color: ACTIVE_BRIGHT.clone(),
    size: 0.012,
    transparent: true,
    opacity: 0.85,
  });
  const spiral = new THREE.Points(spiralGeo, spiralMat);
  root.add(spiral);

  // Dust
  const dustN = 800;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    const r = 1.5 + Math.random() * 2.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    dustPos[i * 3 + 2] = r * Math.cos(ph);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: ACTIVE_SHELL.clone(),
    size: 0.01,
    transparent: true,
    opacity: 0.5,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // Scan rings
  const rings: THREE.Mesh[] = [];
  const ringMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: ACTIVE_SHELL.clone(),
      transparent: true,
      opacity: 0.35 - i * 0.08,
    });
    m.userData.baseOpacity = 0.35 - i * 0.08;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.12, 0.006, 8, 100), m);
    ring.rotation.x = Math.PI / 2 + i * 0.15;
    root.add(ring);
    rings.push(ring);
    ringMats.push(m);
  }

  let raf = 0;
  let disposed = false;
  const clock = new THREE.Clock();

  // Rotation inertia — a residual trail so a released hand keeps spinning briefly.
  let velTheta = 0;
  let velPhi = 0;

  // Audio + mode state
  let targetMode = 0; // 0 = idle (amber), 1 = active (blue)
  let modeMix = 0; // smoothed toward targetMode
  let audioLevel = 0; // smoothed overall loudness

  const onResize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const pulseAt = new Float32Array(NODE_COUNT); // scratch, avoids per-frame alloc
  const dimColor = new THREE.Color();
  const brightColor = new THREE.Color();
  const shellColor = new THREE.Color();

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    modeMix += (targetMode - modeMix) * MODE_LERP;

    // Palette for this frame — one crossfade drives every material.
    dimColor.copy(IDLE_DIM).lerp(ACTIVE_DIM, modeMix);
    brightColor.copy(IDLE_BRIGHT).lerp(ACTIVE_BRIGHT, modeMix);
    shellColor.copy(IDLE_SHELL).lerp(ACTIVE_SHELL, modeMix);

    coreMat.color.copy(IDLE_CORE).lerp(ACTIVE_CORE, modeMix);
    coreMat.emissive.copy(IDLE_CORE_EMISSIVE).lerp(ACTIVE_CORE_EMISSIVE, modeMix);
    // Loudness pushes the core's glow and size — the orb "breathes in" on a voice.
    coreMat.emissiveIntensity = 1.4 + audioLevel * 2.6;
    core.scale.setScalar(1 + audioLevel * 0.22);

    for (const m of shellMats) {
      m.color.copy(shellColor);
      m.opacity = (m.userData.baseOpacity as number) * (1 + audioLevel * 0.8);
    }
    for (const m of ringMats) {
      m.color.copy(shellColor);
      m.opacity = (m.userData.baseOpacity as number) * (1 + audioLevel * 1.2);
    }
    spiralMat.color.copy(brightColor);
    dustMat.color.copy(shellColor);
    ambient.color.copy(shellColor);

    core.rotation.y = t * 0.35;
    core.rotation.x = Math.sin(t * 0.4) * 0.15;
    spiral.rotation.y = -t * 0.2;
    rings.forEach((r, i) => {
      r.rotation.z = t * (0.2 + i * 0.05);
      // Rings ride the voice — they widen as the orb hears more.
      r.scale.setScalar(1 + Math.sin(t * 1.5 + i) * 0.03 + audioLevel * 0.12);
    });

    // Inertia trail — decays after gestures/drag release, giving the orb weight.
    if (Math.abs(velTheta) > 1e-5 || Math.abs(velPhi) > 1e-5) {
      root.rotation.y += velTheta;
      root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + velPhi, -0.9, 0.9);
      velTheta *= SPIN_DAMPING;
      velPhi *= SPIN_DAMPING;
      if (Math.abs(velTheta) < 1e-5) velTheta = 0;
      if (Math.abs(velPhi) < 1e-5) velPhi = 0;
    } else {
      // Asleep it drifts; awake it turns with intent.
      root.rotation.y += 0.0015 + modeMix * 0.0018;
    }

    // Every node breathes on its own phase, then rides its own frequency bin —
    // so a voice moves the whole shell, not one point.
    for (let i = 0; i < NODE_COUNT; i++) {
      const breath = 0.5 + 0.5 * Math.sin(t * nodeSpeed[i] + nodePhase[i]);
      const energy = nodeEnergy[i];
      const pulse = Math.min(1, breath * (0.55 + 0.45 * modeMix) + energy);
      pulseAt[i] = pulse;

      nodeActive[i] *= HIGHLIGHT_DECAY;
      if (nodeActive[i] < 0.01) nodeActive[i] = 0;
      nodeEnergy[i] *= 1 - ENERGY_RELEASE;
      if (nodeEnergy[i] < 0.001) nodeEnergy[i] = 0;

      const scale =
        NODE_RADIUS_BASE * (0.8 + 0.45 * pulse) * (1 + nodeActive[i] * 1.4 + energy * 1.1);
      dummy.position.set(nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2]);
      dummy.scale.setScalar(scale / NODE_RADIUS_BASE);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(i, dummy.matrix);

      nodeColor.copy(dimColor).lerp(brightColor, pulse).lerp(TOUCH_COLOR, nodeActive[i]);
      nodeMesh.setColorAt(i, nodeColor);
    }
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;

    // Edge brightness follows the mean pulse+activity of the two nodes it connects.
    for (let e = 0; e < edgeCount; e++) {
      const a = edgeIndex[e * 2];
      const b = edgeIndex[e * 2 + 1];
      const brightness = (pulseAt[a] + pulseAt[b]) * 0.5;
      const touched = Math.max(nodeActive[a], nodeActive[b]);
      nodeColor.copy(dimColor).lerp(brightColor, brightness * 0.7).lerp(TOUCH_COLOR, touched);
      const o = e * 6;
      edgeColor[o] = nodeColor.r;
      edgeColor[o + 1] = nodeColor.g;
      edgeColor[o + 2] = nodeColor.b;
      edgeColor[o + 3] = nodeColor.r;
      edgeColor[o + 4] = nodeColor.g;
      edgeColor[o + 5] = nodeColor.b;
    }
    edgeColorAttr.needsUpdate = true;
    edgeMat.opacity = 0.6 + audioLevel * 0.35;

    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  const tmp = new THREE.Vector3();
  function worldPosOfNode(i: number): THREE.Vector3 {
    tmp.set(nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2]);
    return tmp.applyMatrix4(root.matrixWorld);
  }

  return {
    rotateBy(dt, dp) {
      root.rotation.y += dt;
      root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + dp, -0.9, 0.9);
      velTheta = dt * SPIN_CARRY;
      velPhi = dp * SPIN_CARRY;
    },
    zoomBy(factor) {
      const d = camera.position.length() * factor;
      camera.position.setLength(THREE.MathUtils.clamp(d, 1.4, 6));
    },
    highlightAt(ndcX, ndcY) {
      let best = -1;
      let bestD = HIGHLIGHT_NDC_RADIUS * HIGHLIGHT_NDC_RADIUS;
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = worldPosOfNode(i).project(camera);
        const dx = p.x - ndcX;
        const dy = p.y - ndcY;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) nodeActive[best] = 1;
    },
    clearHighlight() {
      // Handled by natural per-frame decay; nothing to force here.
    },
    setAudio(level, spectrum) {
      const clamped = THREE.MathUtils.clamp(level, 0, 1);
      // Rise fast, fall slow — speech reads as attack, not flicker.
      audioLevel += (clamped - audioLevel) * (clamped > audioLevel ? ENERGY_ATTACK : ENERGY_RELEASE);
      if (!spectrum || spectrum.length === 0) return;
      // Resample the spectrum onto the nodes so every dot owns a slice of the voice.
      for (let i = 0; i < NODE_COUNT; i++) {
        const bin = Math.min(
          spectrum.length - 1,
          Math.floor((i / NODE_COUNT) * spectrum.length),
        );
        const v = THREE.MathUtils.clamp(spectrum[bin], 0, 1);
        if (v > nodeEnergy[i]) nodeEnergy[i] += (v - nodeEnergy[i]) * ENERGY_ATTACK;
      }
    },
    setMode(mode) {
      targetMode = mode === "active" ? 1 : 0;
    },
    reset() {
      root.rotation.set(0, 0, 0);
      camera.position.set(0, 0.15, 3.2);
      controls.target.set(0, 0, 0);
      controls.update();
      velTheta = 0;
      velPhi = 0;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
