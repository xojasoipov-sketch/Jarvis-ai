/**
 * Holographic orb scene — adapted from
 * https://github.com/SAGAR-TAMANG/ultron-by-sagar-builds (MIT)
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type OrbSceneApi = {
  rotateBy: (dt: number, dp: number) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
  dispose: () => void;
};

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

  scene.add(new THREE.AmbientLight(0x6688ff, 0.55));
  const key = new THREE.PointLight(0x88ccff, 2.2, 20);
  key.position.set(2, 2, 3);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6644, 1.1, 16);
  rim.position.set(-2, -1, -2);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // Wireframe shells
  const shellMat = new THREE.MeshBasicMaterial({
    color: 0x66aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  for (const [r, op] of [
    [0.85, 0.45],
    [1.05, 0.28],
    [1.28, 0.16],
  ] as const) {
    const m = shellMat.clone();
    m.opacity = op;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), m);
    root.add(mesh);
  }

  // Core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 3),
    new THREE.MeshStandardMaterial({
      color: 0x99ddff,
      emissive: 0x2266aa,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.25,
    }),
  );
  root.add(core);

  // Spiral points
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
  const spiral = new THREE.Points(
    spiralGeo,
    new THREE.PointsMaterial({ color: 0xaaddff, size: 0.012, transparent: true, opacity: 0.85 }),
  );
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
  scene.add(
    new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0x88aaff, size: 0.01, transparent: true, opacity: 0.5 }),
    ),
  );

  // Scan rings
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15 + i * 0.12, 0.006, 8, 100),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.35 - i * 0.08,
      }),
    );
    ring.rotation.x = Math.PI / 2 + i * 0.15;
    root.add(ring);
    rings.push(ring);
  }

  let raf = 0;
  let disposed = false;
  const clock = new THREE.Clock();

  const onResize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    core.rotation.y = t * 0.35;
    core.rotation.x = Math.sin(t * 0.4) * 0.15;
    spiral.rotation.y = -t * 0.2;
    rings.forEach((r, i) => {
      r.rotation.z = t * (0.2 + i * 0.05);
      r.scale.setScalar(1 + Math.sin(t * 1.5 + i) * 0.03);
    });
    root.rotation.y += 0.0015;
    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  return {
    rotateBy(dt, dp) {
      root.rotation.y += dt;
      root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + dp, -0.9, 0.9);
    },
    zoomBy(factor) {
      const d = camera.position.length() * factor;
      camera.position.setLength(THREE.MathUtils.clamp(d, 1.4, 6));
    },
    reset() {
      root.rotation.set(0, 0, 0);
      camera.position.set(0, 0.15, 3.2);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
