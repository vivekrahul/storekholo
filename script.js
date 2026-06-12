import * as THREE from 'three';

/* ─────────────────────────────────────────
   NOISE UTILITIES
───────────────────────────────────────── */
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function smoothNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return hash(xi,yi)*(1-u)*(1-v) + hash(xi+1,yi)*u*(1-v) +
         hash(xi,yi+1)*(1-u)*v   + hash(xi+1,yi+1)*u*v;
}
function fbm(x, y, o = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < o; i++) {
    val  += smoothNoise(x * freq, y * freq) * amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return val; // ~0..1
}
function getH(x, z) {
  let h = fbm(x * 0.016 + 3.7, z * 0.016 + 1.3) * 38;
  h += fbm(x * 0.055, z * 0.055) * 12;
  h += fbm(x * 0.13, z * 0.13) * 4;
  h -= 8;
  // carve a navigable corridor along x≈0
  const corridor = Math.exp(-(x * x) / (30 * 30));
  h -= corridor * 14;
  // boost far edges into mountain ridges
  const edge = Math.max(0, Math.abs(x) - 50);
  h += edge * 0.45;
  return h;
}
function heightColor(h) {
  if (h < 0)   return [0.03, 0.02, 0.13];
  if (h < 6)   { const t=h/6;    return [0.03+t*.04, 0.02+t*.02, 0.13+t*.10]; }
  if (h < 14)  { const t=(h-6)/8;  return [0.07+t*.05, 0.04+t*.03, 0.23+t*.10]; }
  if (h < 22)  { const t=(h-14)/8; return [0.12+t*.14, 0.07+t*.05, 0.33+t*.08]; }
  const t = Math.min((h-22)/12,1);
  return [0.26+t*.74, 0.12-t*.04, 0.41-t*.26];
}

/* ─────────────────────────────────────────
   SCENE SETUP
───────────────────────────────────────── */
const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x07071a, 0.006);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800);

/* ─────────────────────────────────────────
   LIGHTS
───────────────────────────────────────── */
const ambient = new THREE.AmbientLight(0x0a0a2e, 1.2);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0x8080ff, 0.5);
sun.position.set(30, 60, -20);
scene.add(sun);

const redLight  = new THREE.PointLight(0xff3d2e, 2.5, 90);
redLight.position.set(-25, 30, 10);
scene.add(redLight);

const blueLight = new THREE.PointLight(0x4a7cff, 2.0, 120);
blueLight.position.set(35, 20, -30);
scene.add(blueLight);

const tealLight = new THREE.PointLight(0x00e5cc, 1.5, 60);
tealLight.position.set(0, 8, -90);
scene.add(tealLight);

/* ─────────────────────────────────────────
   TERRAIN
───────────────────────────────────────── */
const SEGS = 96;
const terrainGeo = new THREE.PlaneGeometry(380, 380, SEGS, SEGS);
terrainGeo.rotateX(-Math.PI / 2);

const tPos = terrainGeo.attributes.position;
const tColors = new Float32Array(tPos.count * 3);

for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i), z = tPos.getZ(i);
  const h = getH(x, z);
  tPos.setY(i, h);
  const [r, g, b] = heightColor(h);
  tColors[i*3]=r; tColors[i*3+1]=g; tColors[i*3+2]=b;
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  metalness: 0.2,
  roughness: 0.85,
});
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// Wireframe overlay — subtle grid glow
const wireMat = new THREE.MeshBasicMaterial({
  color: 0x4a7cff,
  wireframe: true,
  transparent: true,
  opacity: 0.025,
});
const wire = new THREE.Mesh(terrainGeo, wireMat);
wire.position.y = 0.05;
scene.add(wire);

/* ─────────────────────────────────────────
   BACKGROUND MOUNTAIN SILHOUETTE
───────────────────────────────────────── */
const bgGeo = new THREE.PlaneGeometry(600, 200, 60, 20);
bgGeo.rotateX(-Math.PI / 2);
const bgPos = bgGeo.attributes.position;
for (let i = 0; i < bgPos.count; i++) {
  const x = bgPos.getX(i), z = bgPos.getZ(i);
  const h = fbm(x * 0.01 + 9.1, z * 0.01 + 5.3) * 50 + 5;
  bgPos.setY(i, h);
}
bgGeo.computeVertexNormals();
const bgMat = new THREE.MeshStandardMaterial({ color: 0x05050f, roughness:1, metalness:0 });
const bgMesh = new THREE.Mesh(bgGeo, bgMat);
bgMesh.position.set(0, -5, -180);
scene.add(bgMesh);

/* ─────────────────────────────────────────
   STAR FIELD
───────────────────────────────────────── */
const starCount = 2500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i]   = (Math.random() - 0.5) * 500;
  starPos[i+1] = Math.random() * 120 + 25;
  starPos[i+2] = (Math.random() - 0.5) * 500;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.75 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

/* ─────────────────────────────────────────
   FLOATING DUST
───────────────────────────────────────── */
const dustCount = 400;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount * 3; i += 3) {
  dustPos[i]   = (Math.random() - 0.5) * 200;
  dustPos[i+1] = Math.random() * 25 + 2;
  dustPos[i+2] = (Math.random() - 0.5) * 200;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({
  color: 0x4a7cff, size: 0.22, sizeAttenuation: true,
  transparent: true, opacity: 0.25,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

/* ─────────────────────────────────────────
   FLOATING CREATURES (sacred geometry)
───────────────────────────────────────── */
const creatureData = [
  { geo:'ico', r:1.8, x:-18, y:22, z:65, col:0x4a7cff },
  { geo:'oct', r:1.2, x: 22, y:18, z:45, col:0xff3d2e },
  { geo:'tet', r:2.2, x:-30, y:30, z:15, col:0x00e5cc },
  { geo:'ico', r:0.9, x: 15, y:12, z: 5, col:0x4a7cff },
  { geo:'oct', r:2.5, x:-12, y:40, z:-20, col:0xff3d2e },
  { geo:'tet', r:1.4, x: 28, y:25, z:-35, col:0x00e5cc },
  { geo:'ico', r:3.0, x:-35, y:35, z:-50, col:0x4a7cff },
  { geo:'oct', r:1.1, x: 10, y:15, z:-65, col:0xff3d2e },
  { geo:'tet', r:2.0, x:-20, y:28, z:-78, col:0x00e5cc },
  { geo:'ico', r:1.6, x:  5, y:20, z:-88, col:0x4a7cff },
];

const creatures = [];
creatureData.forEach((d, i) => {
  let geo;
  if (d.geo === 'ico') geo = new THREE.IcosahedronGeometry(d.r, 0);
  if (d.geo === 'oct') geo = new THREE.OctahedronGeometry(d.r, 0);
  if (d.geo === 'tet') geo = new THREE.TetrahedronGeometry(d.r, 0);

  // Wireframe shell
  const wMat = new THREE.MeshBasicMaterial({
    color: d.col, wireframe: true,
    transparent: true, opacity: 0.55,
  });
  const wMesh = new THREE.Mesh(geo, wMat);

  // Inner glow
  const iMat = new THREE.MeshBasicMaterial({
    color: d.col, transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const iMesh = new THREE.Mesh(geo, iMat);

  const group = new THREE.Group();
  group.add(wMesh, iMesh);
  group.position.set(d.x, d.y, d.z);
  group.userData = { baseY: d.y, speed: 0.4 + Math.random() * 0.4, phase: i * 1.3 };
  scene.add(group);
  creatures.push(group);
});

/* ─────────────────────────────────────────
   PORTAL RING (at contact zone)
───────────────────────────────────────── */
const makeRing = (r, color, opacity) => {
  const g = new THREE.TorusGeometry(r, 0.08, 12, 80);
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Mesh(g, m);
};
const portalGroup = new THREE.Group();
portalGroup.add(makeRing(7, 0xff3d2e, 0.9));
portalGroup.add(makeRing(9, 0xff3d2e, 0.35));
portalGroup.add(makeRing(11, 0xff3d2e, 0.12));
portalGroup.add(makeRing(14, 0xff3d2e, 0.05));
portalGroup.position.set(0, 16, -100);
portalGroup.rotation.x = Math.PI / 2.2;
scene.add(portalGroup);

/* ─────────────────────────────────────────
   CAMERA PATH
───────────────────────────────────────── */
const camPts = [
  new THREE.Vector3(  0, 20,  88),  // Hero
  new THREE.Vector3( -6, 14,  58),  // Valley
  new THREE.Vector3(  8,  9,  18),  // Systems (low flight)
  new THREE.Vector3(-14, 28, -12),  // Crossing (bird's eye)
  new THREE.Vector3(  6, 12, -42),  // Peaks
  new THREE.Vector3(  0, 22, -65),  // Oracle (ethereal)
  new THREE.Vector3(  0, 10, -93),  // Portal
];
const lookPts = [
  new THREE.Vector3( -2,  8,  40),
  new THREE.Vector3(  4,  4,  12),
  new THREE.Vector3( -5,  6, -18),
  new THREE.Vector3(  2, 10, -44),
  new THREE.Vector3( -2,  6, -62),
  new THREE.Vector3(  0,  4, -82),
  new THREE.Vector3(  0,  8, -120),
];

const camPath  = new THREE.CatmullRomCurve3(camPts,  false, 'catmullrom', 0.5);
const lookPath = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.5);

// Init camera
camera.position.copy(camPts[0]);
camera.lookAt(lookPts[0]);

/* ─────────────────────────────────────────
   LOADING & GSAP SCROLL
───────────────────────────────────────── */
const loadingEl = document.getElementById('loading');
const fillEl    = loadingEl.querySelector('.ld-fill');

let loadPct = 0;
const loadTimer = setInterval(() => {
  loadPct = Math.min(loadPct + Math.random() * 18 + 5, 95);
  fillEl.style.width = loadPct + '%';
}, 120);

function onWorldReady() {
  clearInterval(loadTimer);
  fillEl.style.width = '100%';
  setTimeout(() => {
    loadingEl.classList.add('hidden');
    initGSAP();
    initUI();
  }, 600);
}

function initGSAP() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  let scrollProgress = 0;

  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.8,
    onUpdate(self) { scrollProgress = self.progress; },
  });

  // Expose scrollProgress to animation loop
  window._sk_scrollProg = () => scrollProgress;

  /* Per-section content reveals */
  document.querySelectorAll('.reveal').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter() { el.classList.add('vis'); },
    });
  });

  /* Oracle lines stagger */
  document.querySelectorAll('.ol').forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter() {
        el.style.transitionDelay = (i * 120) + 'ms';
        el.classList.add('vis');
      },
    });
  });

  /* Count-up for stat numbers */
  document.querySelectorAll('[data-count]').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter() {
        const target = +el.dataset.count;
        const suffix = el.dataset.suffix || '';
        const dur = 1800;
        const start = performance.now();
        function tick(now) {
          const p  = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * ease).toLocaleString('en-IN') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
    });
  });
}

/* ─────────────────────────────────────────
   MOUSE
───────────────────────────────────────── */
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
  mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

/* ─────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────── */
const targetCamPos = new THREE.Vector3().copy(camPts[0]);
const targetLook   = new THREE.Vector3().copy(lookPts[0]);
const currentLook  = new THREE.Vector3().copy(lookPts[0]);

function animate(time) {
  requestAnimationFrame(animate);

  const t  = time * 0.001;
  const sp = window._sk_scrollProg ? window._sk_scrollProg() : 0;

  // Camera path
  camPath.getPoint(sp, targetCamPos);
  lookPath.getPoint(sp, targetLook);

  // Apply mouse parallax offset to look target
  const lookWithMouse = targetLook.clone();
  lookWithMouse.x += mouseX * 5;
  lookWithMouse.y += -mouseY * 2.5;

  // Smooth camera
  camera.position.lerp(targetCamPos, 0.04);
  currentLook.lerp(lookWithMouse, 0.04);
  camera.lookAt(currentLook);

  // Creatures drift
  creatures.forEach((c, i) => {
    c.position.y = c.userData.baseY + Math.sin(t * c.userData.speed + c.userData.phase) * 1.8;
    c.rotation.x = t * 0.15 + i * 0.6;
    c.rotation.y = t * 0.22 + i * 0.9;
  });

  // Portal ring spin
  portalGroup.rotation.z = t * 0.3;
  portalGroup.children.forEach((r, i) => {
    r.rotation.z = t * (0.4 + i * 0.15);
  });

  // Pulsing lights
  redLight.intensity  = 2.0 + Math.sin(t * 2.1) * 0.6;
  blueLight.intensity = 1.8 + Math.cos(t * 1.7) * 0.5;
  tealLight.intensity = 1.2 + Math.sin(t * 1.3 + 1) * 0.4;

  // Stars slow drift
  stars.rotation.y = t * 0.008;

  // Dust particles gentle drift
  dust.rotation.y = t * 0.015;

  renderer.render(scene, camera);
}

/* ─────────────────────────────────────────
   RESIZE
───────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────────────────────────────────────
   UI INTERACTIONS
───────────────────────────────────────── */
function initUI() {
  /* Custom cursor */
  const cursor = document.getElementById('cursor');
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });
  const interactives = 'a, button, .sys-hd, input, textarea, .stage-toggle button';
  document.addEventListener('mouseover', e => { if (e.target.closest(interactives)) cursor.classList.add('exp'); });
  document.addEventListener('mouseout',  e => { if (e.target.closest(interactives)) cursor.classList.remove('exp'); });

  /* Navbar scroll style */
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* Mobile menu */
  const hamburger  = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }));

  /* Hero cycling word */
  const words = ['Sell.', 'Scale.', 'Win.', 'Grow.'];
  let wi = 0;
  const cycler = document.querySelector('.cycler');
  if (cycler) {
    setInterval(() => {
      wi = (wi + 1) % words.length;
      const span = cycler.querySelector('span');
      span.style.animation = 'none';
      void span.offsetWidth;
      span.textContent = words[wi];
      span.style.animation = 'clipIn .6s ease forwards';
    }, 2800);
  }

  /* Systems accordion */
  document.querySelectorAll('.sys-item').forEach(item => {
    item.querySelector('.sys-hd').addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.sys-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* Stage toggle */
  document.querySelectorAll('.stage-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stage-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* Contact form */
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    btn.textContent = 'SUBMITTED ✓';
    btn.style.background = '#34D399';
    setTimeout(() => { btn.textContent = 'REQUEST DISCOVERY CALL →'; btn.style.background = ''; }, 3000);
  });

}

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
animate(0);

// Small delay so geometry builds before revealing
setTimeout(onWorldReady, 800);
