import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  E_CHARGE,
  M_DEUTERON,
  phi0OverV0,
  verletStep,
  kineticEV,
  mulberry32,
} from "./physics.js";

const METERS_TO_UNITS = 22;
const R_MIN = 1e-3;
const TRAIL = 28;

const canvas = document.getElementById("view");
const ui = {
  v0: document.getElementById("v0"),
  ra: document.getElementById("ra"),
  rc: document.getElementById("rc"),
  n: document.getElementById("n"),
  speed: document.getElementById("speed"),
  seed: document.getElementById("seed"),
  trails: document.getElementById("trails"),
  pause: document.getElementById("pause"),
  reset: document.getElementById("reset"),
  v0Out: document.getElementById("v0Out"),
  raOut: document.getElementById("raOut"),
  rcOut: document.getElementById("rcOut"),
  nOut: document.getElementById("nOut"),
  speedOut: document.getElementById("speedOut"),
  phi0: document.getElementById("phi0"),
  ratio: document.getElementById("ratio"),
  energies: document.getElementById("energies"),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x07090d, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07090d, 0.035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.02, 80);
camera.position.set(4.2, 2.4, 5.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x9eb4c8, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(4, 6, 3);
scene.add(key);

const anodeMat = new THREE.MeshPhongMaterial({
  color: 0x8ec5ff,
  transparent: true,
  opacity: 0.08,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const anode = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), anodeMat);
scene.add(anode);

const cathode = new THREE.Mesh(
  new THREE.SphereGeometry(1, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xe7b15a, wireframe: true })
);
scene.add(cathode);

const ionGeo = new THREE.SphereGeometry(0.035, 8, 6);
const ionMat = new THREE.MeshBasicMaterial({ color: 0xd7f3ff });
let ions = new THREE.InstancedMesh(ionGeo, ionMat, 180);
ions.count = 72;
scene.add(ions);
const dummy = new THREE.Object3D();
const color = new THREE.Color();

const trailGeom = new THREE.BufferGeometry();
const trailPos = new Float32Array(180 * (TRAIL - 1) * 2 * 3);
trailGeom.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
const trails = new THREE.LineSegments(
  trailGeom,
  new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.35 })
);
scene.add(trails);

const state = {
  paused: false,
  n: 72,
  pos: [],
  vel: [],
  trail: [],
  head: [],
};

function params() {
  let Ra = Number(ui.ra.value);
  let Rc = Number(ui.rc.value);
  if (!(Ra > Rc * 1.08)) {
    if (document.activeElement === ui.rc) {
      Ra = Rc * 1.08;
      ui.ra.value = Ra.toFixed(3);
    } else {
      Rc = Ra / 1.08;
      ui.rc.value = Rc.toFixed(3);
    }
  }
  return {
    V0: Number(ui.v0.value) * 1000,
    Ra,
    Rc,
    n: Number(ui.n.value),
    speed: Number(ui.speed.value),
    seed: Number(ui.seed.value) >>> 0,
  };
}

function spawn() {
  const p = params();
  state.n = p.n;
  ions.count = p.n;
  const rand = mulberry32(p.seed);
  state.pos = [];
  state.vel = [];
  state.trail = [];
  state.head = [];
  const vTherm = Math.sqrt((2 * 0.05 * E_CHARGE) / M_DEUTERON);
  for (let i = 0; i < p.n; i++) {
    const z = rand() * 2 - 1;
    const ang = rand() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - z * z));
    const ux = s * Math.cos(ang);
    const uy = s * Math.sin(ang);
    const uz = z;
    const radius = p.Rc + (p.Ra - p.Rc) * (0.15 + 0.85 * rand());
    const pos = [ux * radius, uy * radius, uz * radius];
    // Small angular momentum: tangential kick, mostly starting near rest.
    const tx = -uy;
    const ty = ux;
    const tz = 0.15 * (rand() - 0.5);
    const vTan = vTherm * (0.4 + rand());
    const vel = [tx * vTan, ty * vTan, tz * vTan];
    state.pos.push(pos);
    state.vel.push(vel);
    const hist = [];
    for (let k = 0; k < TRAIL; k++) hist.push(pos.slice());
    state.trail.push(hist);
    state.head.push(0);
  }
}

function syncGeometry() {
  const p = params();
  anode.scale.setScalar(p.Ra * METERS_TO_UNITS);
  cathode.scale.setScalar(p.Rc * METERS_TO_UNITS);
  ui.v0Out.textContent = `${(p.V0 / 1000).toFixed(0)} kV`;
  ui.raOut.textContent = `${p.Ra.toFixed(3)} m`;
  ui.rcOut.textContent = `${p.Rc.toFixed(3)} m`;
  ui.nOut.textContent = String(p.n);
  ui.speedOut.textContent = `${p.speed.toFixed(2)}×`;
  const ratio = p.Ra / p.Rc;
  const phiRatio = phi0OverV0(p.Rc, p.Ra);
  ui.ratio.textContent = ratio.toFixed(2);
  ui.phi0.textContent = phiRatio.toFixed(4);
}

function stepPhysics() {
  const p = params();
  const budget = p.speed * 4e-9;
  let dt = 5e-11;
  let steps = Math.max(1, Math.round(budget / dt));
  if (steps > 220) {
    steps = 220;
    dt = budget / steps;
  }
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < state.n; i++) {
      verletStep(state.pos[i], state.vel[i], dt, E_CHARGE, M_DEUTERON, p.Rc, p.Ra, p.V0, R_MIN);
    }
  }
  if (ui.trails.checked) {
    for (let i = 0; i < state.n; i++) {
      const h = (state.head[i] + 1) % TRAIL;
      state.head[i] = h;
      const slot = state.trail[i][h];
      slot[0] = state.pos[i][0];
      slot[1] = state.pos[i][1];
      slot[2] = state.pos[i][2];
    }
  }
}

function pushVisuals() {
  const p = params();
  const showTrails = ui.trails.checked;
  trails.visible = showTrails;
  let eText = "";
  for (let i = 0; i < state.n; i++) {
    const pos = state.pos[i];
    const vel = state.vel[i];
    dummy.position.set(pos[0] * METERS_TO_UNITS, pos[1] * METERS_TO_UNITS, pos[2] * METERS_TO_UNITS);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    ions.setMatrixAt(i, dummy.matrix);
    const eV = kineticEV(vel[0], vel[1], vel[2], M_DEUTERON);
    const t = Math.min(1, eV / p.V0);
    color.setRGB(0.45 + 0.55 * t, 0.75 - 0.35 * t, 1 - 0.75 * t);
    ions.setColorAt(i, color);
    if (i < 4) {
      const keV = eV / 1000;
      eText += `${keV.toFixed(1)} keV  `;
    }
  }
  ions.instanceMatrix.needsUpdate = true;
  if (ions.instanceColor) ions.instanceColor.needsUpdate = true;
  ui.energies.textContent = eText.trim();

  const attr = trailGeom.getAttribute("position");
  const arr = attr.array;
  let w = 0;
  const maxSeg = 180 * (TRAIL - 1);
  if (showTrails) {
    for (let i = 0; i < state.n; i++) {
      const hist = state.trail[i];
      const head = state.head[i];
      for (let k = 0; k < TRAIL - 1; k++) {
        const a = hist[(head + 1 + k) % TRAIL];
        const b = hist[(head + 2 + k) % TRAIL];
        arr[w++] = a[0] * METERS_TO_UNITS;
        arr[w++] = a[1] * METERS_TO_UNITS;
        arr[w++] = a[2] * METERS_TO_UNITS;
        arr[w++] = b[0] * METERS_TO_UNITS;
        arr[w++] = b[1] * METERS_TO_UNITS;
        arr[w++] = b[2] * METERS_TO_UNITS;
      }
    }
  }
  while (w < maxSeg * 6) arr[w++] = 0;
  attr.needsUpdate = true;
  trailGeom.setDrawRange(0, showTrails ? state.n * (TRAIL - 1) * 2 : 0);
}

function animate() {
  requestAnimationFrame(animate);
  if (!state.paused) stepPhysics();
  syncGeometry();
  pushVisuals();
  controls.update();
  renderer.render(scene, camera);
}

ui.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
});
ui.reset.addEventListener("click", () => {
  spawn();
});
ui.n.addEventListener("change", spawn);
ui.seed.addEventListener("change", spawn);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

spawn();
syncGeometry();
animate();
