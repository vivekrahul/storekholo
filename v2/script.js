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
function fbm(x, y, o) {
  o = o || 5;
  var val = 0, amp = 0.5, freq = 1;
  for (var i = 0; i < o; i++) {
    val  += smoothNoise(x * freq, y * freq) * amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return val;
}
function getH(x, z) {
  var h = fbm(x * 0.016 + 7.3, z * 0.016 + 4.1) * 38;
  h += fbm(x * 0.055, z * 0.055) * 12;
  h += fbm(x * 0.13 + 2, z * 0.13) * 4;
  h -= 8;
  var corridor = Math.exp(-(x * x) / (28 * 28));
  h -= corridor * 12;
  var edge = Math.max(0, Math.abs(x) - 48);
  h += edge * 0.5;
  return h;
}
function heightColorGreen(h) {
  if (h < 0)   return [0.01, 0.07, 0.03];
  if (h < 5)   { var t=h/5;    return [0.01+t*.02, 0.07+t*.13, 0.03+t*.07]; }
  if (h < 13)  { var t=(h-5)/8;  return [0.03+t*.04, 0.20+t*.22, 0.10+t*.14]; }
  if (h < 22)  { var t=(h-13)/9; return [0.07+t*.05, 0.42+t*.30, 0.24+t*.20]; }
  var t = Math.min((h-22)/12, 1);
  return [0.12+t*.00, 0.72+t*.28, 0.44+t*.56];
}

/* ─────────────────────────────────────────
   SCENE
───────────────────────────────────────── */
var canvas   = document.getElementById('world');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x020c05);
scene.fog = new THREE.FogExp2(0x020d06, 0.007);

var camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800);

/* ─────────────────────────────────────────
   LIGHTS
───────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x042010, 1.5));

var sun = new THREE.DirectionalLight(0x00ff88, 0.4);
sun.position.set(20, 60, -30);
scene.add(sun);

var gLight1 = new THREE.PointLight(0x00ff88, 3.0, 100);
gLight1.position.set(-20, 28, 15);
scene.add(gLight1);

var gLight2 = new THREE.PointLight(0x10b981, 2.2, 110);
gLight2.position.set(30, 18, -25);
scene.add(gLight2);

var tealLight = new THREE.PointLight(0x06b6d4, 1.8, 70);
tealLight.position.set(0, 10, -88);
scene.add(tealLight);

var limeLight = new THREE.PointLight(0xa3e635, 1.2, 50);
limeLight.position.set(-30, 5, -45);
scene.add(limeLight);

/* ─────────────────────────────────────────
   TERRAIN — GREEN
───────────────────────────────────────── */
var SEGS = 96;
var terrGeo = new THREE.PlaneGeometry(380, 380, SEGS, SEGS);
terrGeo.rotateX(-Math.PI / 2);

var tPos    = terrGeo.attributes.position;
var tColors = new Float32Array(tPos.count * 3);

for (var i = 0; i < tPos.count; i++) {
  var tx = tPos.getX(i), tz = tPos.getZ(i);
  var th = getH(tx, tz);
  tPos.setY(i, th);
  var col = heightColorGreen(th);
  tColors[i*3]=col[0]; tColors[i*3+1]=col[1]; tColors[i*3+2]=col[2];
}
terrGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrGeo.computeVertexNormals();

var terrMesh = new THREE.Mesh(terrGeo, new THREE.MeshStandardMaterial({
  vertexColors: true, metalness:0.15, roughness:0.8
}));
scene.add(terrMesh);

/* Green wireframe overlay */
var wireMesh = new THREE.Mesh(terrGeo, new THREE.MeshBasicMaterial({
  color: 0x00ff88, wireframe:true, transparent:true, opacity:0.035
}));
wireMesh.position.y = 0.08;
scene.add(wireMesh);

/* ─────────────────────────────────────────
   BACKGROUND MOUNTAINS
───────────────────────────────────────── */
var bgGeo = new THREE.PlaneGeometry(600, 200, 60, 20);
bgGeo.rotateX(-Math.PI / 2);
var bgP = bgGeo.attributes.position;
for (var i = 0; i < bgP.count; i++) {
  bgP.setY(i, fbm(bgP.getX(i)*0.01+11, bgP.getZ(i)*0.01+7) * 55 + 5);
}
bgGeo.computeVertexNormals();
var bgMesh = new THREE.Mesh(bgGeo, new THREE.MeshStandardMaterial({ color:0x010a03, roughness:1, metalness:0 }));
bgMesh.position.set(0, -5, -185);
scene.add(bgMesh);

/* ─────────────────────────────────────────
   STARS (green-tinted)
───────────────────────────────────────── */
var starCount = 2800;
var starPos   = new Float32Array(starCount * 3);
var starColors = new Float32Array(starCount * 3);
for (var i = 0; i < starCount * 3; i += 3) {
  starPos[i]   = (Math.random()-.5)*500;
  starPos[i+1] = Math.random()*130 + 30;
  starPos[i+2] = (Math.random()-.5)*500;
  var r = Math.random();
  if (r < 0.5) { starColors[i]=.85; starColors[i+1]=1; starColors[i+2]=.9; }
  else if (r < 0.75) { starColors[i]=.6; starColors[i+1]=.95; starColors[i+2]=.7; }
  else { starColors[i]=1; starColors[i+1]=1; starColors[i+2]=1; }
}
var starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  vertexColors:true, size:0.2, sizeAttenuation:true, transparent:true, opacity:0.8
}));
scene.add(stars);

/* ─────────────────────────────────────────
   NEON PARTICLES
───────────────────────────────────────── */
var dustCount = 500;
var dustPos   = new Float32Array(dustCount * 3);
for (var i = 0; i < dustCount * 3; i += 3) {
  dustPos[i]   = (Math.random()-.5)*220;
  dustPos[i+1] = Math.random()*28 + 2;
  dustPos[i+2] = (Math.random()-.5)*220;
}
var dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color:0x00ff88, size:0.25, sizeAttenuation:true,
  transparent:true, opacity:0.3,
  blending:THREE.AdditiveBlending, depthWrite:false
}));
scene.add(dust);

/* ─────────────────────────────────────────
   FLOATING CREATURES (green wireframes)
───────────────────────────────────────── */
var creatureData = [
  { g:'ico', r:1.6, x:-20, y:24, z:70, c:0x00ff88 },
  { g:'oct', r:1.1, x: 22, y:16, z:50, c:0x10b981 },
  { g:'tet', r:2.0, x:-32, y:32, z:18, c:0x06b6d4 },
  { g:'ico', r:0.8, x: 14, y:10, z: 8, c:0x00ff88 },
  { g:'oct', r:2.3, x:-14, y:38, z:-18, c:0xa3e635 },
  { g:'tet', r:1.3, x: 26, y:22, z:-32, c:0x10b981 },
  { g:'ico', r:2.8, x:-38, y:33, z:-48, c:0x00ff88 },
  { g:'oct', r:1.0, x: 12, y:14, z:-62, c:0x06b6d4 },
  { g:'tet', r:1.8, x:-18, y:26, z:-76, c:0xa3e635 },
  { g:'ico', r:1.4, x:  4, y:18, z:-86, c:0x00ff88 },
];

var creatures = [];
creatureData.forEach(function(d, idx) {
  var geo;
  if (d.g === 'ico') geo = new THREE.IcosahedronGeometry(d.r, 0);
  if (d.g === 'oct') geo = new THREE.OctahedronGeometry(d.r, 0);
  if (d.g === 'tet') geo = new THREE.TetrahedronGeometry(d.r, 0);

  var wMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color:d.c, wireframe:true, transparent:true, opacity:0.6
  }));
  var iMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color:d.c, transparent:true, opacity:0.05,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  var group = new THREE.Group();
  group.add(wMesh, iMesh);
  group.position.set(d.x, d.y, d.z);
  group.userData = { baseY:d.y, speed:0.35+Math.random()*0.4, phase:idx*1.4 };
  scene.add(group);
  creatures.push(group);
});

/* ─────────────────────────────────────────
   LARGE ROTATING TORUS (unique to v2)
───────────────────────────────────────── */
var torusGroup = new THREE.Group();

var makeTorusRing = function(r, tube, color, opacity) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, 8, 80),
    new THREE.MeshBasicMaterial({
      color:color, transparent:true, opacity:opacity,
      blending:THREE.AdditiveBlending, depthWrite:false, wireframe:true
    })
  );
};
var torus1 = makeTorusRing(18, 0.15, 0x00ff88, 0.25);
var torus2 = makeTorusRing(22, 0.08, 0x10b981, 0.12);
var torus3 = makeTorusRing(26, 0.06, 0x00ff88, 0.06);
torusGroup.add(torus1, torus2, torus3);
torusGroup.position.set(0, 18, -40);
torusGroup.rotation.x = Math.PI / 3;
scene.add(torusGroup);

/* ─────────────────────────────────────────
   PORTAL RINGS (green, at contact section)
───────────────────────────────────────── */
var makePortalRing = function(r, color, opacity) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.09, 12, 80),
    new THREE.MeshBasicMaterial({
      color:color, transparent:true, opacity:opacity,
      blending:THREE.AdditiveBlending, depthWrite:false
    })
  );
};
var portalGroup = new THREE.Group();
portalGroup.add(makePortalRing(7,  0x00ff88, 0.9));
portalGroup.add(makePortalRing(9,  0x10b981, 0.35));
portalGroup.add(makePortalRing(12, 0x00ff88, 0.12));
portalGroup.add(makePortalRing(16, 0x06b6d4, 0.05));
portalGroup.position.set(0, 16, -100);
portalGroup.rotation.x = Math.PI / 2.2;
scene.add(portalGroup);

/* ─────────────────────────────────────────
   CAMERA PATH — more dramatic sweeps
───────────────────────────────────────── */
var camPts = [
  new THREE.Vector3(-22, 16, 85),   // Hero - left approach
  new THREE.Vector3( 18,  8, 55),   // Valley - sweeping right, low
  new THREE.Vector3( -8,  5, 15),   // Systems - very low flight
  new THREE.Vector3( 22, 38, -8),   // Crossing - high right bank
  new THREE.Vector3(-12, 12, -42),  // Peaks - back left low
  new THREE.Vector3(  0, 32, -65),  // Manifesto - high center
  new THREE.Vector3(  0,  9, -93),  // Portal - low approach
];
var lookPts = [
  new THREE.Vector3( 0,  8, 35),
  new THREE.Vector3( 2,  3, 10),
  new THREE.Vector3(-4,  5, -20),
  new THREE.Vector3( 2, 10, -45),
  new THREE.Vector3(-2,  6, -64),
  new THREE.Vector3( 0,  3, -82),
  new THREE.Vector3( 0,  8, -120),
];

var camPath  = new THREE.CatmullRomCurve3(camPts,  false, 'catmullrom', 0.5);
var lookPath = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.5);

camera.position.copy(camPts[0]);
camera.lookAt(lookPts[0]);

/* ─────────────────────────────────────────
   LOADING + GSAP
───────────────────────────────────────── */
var loadingEl = document.getElementById('loading');
var fillEl    = loadingEl.querySelector('.ld-fill');
var loadPct   = 0;

var loadTimer = setInterval(function() {
  loadPct = Math.min(loadPct + Math.random() * 18 + 5, 95);
  fillEl.style.width = loadPct + '%';
}, 120);

function onWorldReady() {
  clearInterval(loadTimer);
  fillEl.style.width = '100%';
  setTimeout(function() {
    loadingEl.classList.add('hidden');
    initGSAP();
    initUI();
  }, 600);
}

function initGSAP() {
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var scrollProgress = 0;

  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 2,
    onUpdate: function(self) { scrollProgress = self.progress; },
  });

  window._v2ScrollProg = function() { return scrollProgress; };

  /* Reveal elements */
  document.querySelectorAll('.reveal').forEach(function(el) {
    ScrollTrigger.create({
      trigger: el, start: 'top 87%', once: true,
      onEnter: function() { el.classList.add('vis'); }
    });
  });

  /* System cards with stagger */
  document.querySelectorAll('.sys-card').forEach(function(el) {
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function() { el.classList.add('vis'); }
    });
  });

  /* Manifesto lines */
  document.querySelectorAll('.mf-line').forEach(function(el, i) {
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function() {
        el.style.transitionDelay = (i * 130) + 'ms';
        el.classList.add('vis');
      }
    });
  });

  /* Count-ups */
  document.querySelectorAll('[data-count]').forEach(function(el) {
    ScrollTrigger.create({
      trigger: el, start: 'top 86%', once: true,
      onEnter: function() {
        var target = +el.dataset.count;
        var suffix = el.dataset.suffix || '';
        var dur = 1800, start = performance.now();
        function tick(now) {
          var p = Math.min((now - start) / dur, 1);
          var ease = 1 - Math.pow(1-p, 3);
          el.textContent = Math.round(target * ease).toLocaleString('en-IN') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    });
  });
}

/* ─────────────────────────────────────────
   MOUSE
───────────────────────────────────────── */
var mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', function(e) {
  mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

/* ─────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────── */
var targetPos  = new THREE.Vector3().copy(camPts[0]);
var targetLook = new THREE.Vector3().copy(lookPts[0]);
var currentLook = new THREE.Vector3().copy(lookPts[0]);

function animate(time) {
  requestAnimationFrame(animate);
  var t  = time * 0.001;
  var sp = window._v2ScrollProg ? window._v2ScrollProg() : 0;

  camPath.getPoint(sp, targetPos);
  lookPath.getPoint(sp, targetLook);

  var lookWithMouse = targetLook.clone();
  lookWithMouse.x += mouseX * 5;
  lookWithMouse.y -= mouseY * 2.5;

  camera.position.lerp(targetPos, 0.04);
  currentLook.lerp(lookWithMouse, 0.04);
  camera.lookAt(currentLook);

  /* Creatures drift */
  for (var i = 0; i < creatures.length; i++) {
    var c = creatures[i];
    c.position.y = c.userData.baseY + Math.sin(t * c.userData.speed + c.userData.phase) * 2;
    c.rotation.x = t * 0.18 + i * 0.55;
    c.rotation.y = t * 0.25 + i * 0.88;
  }

  /* Torus rotate */
  torus1.rotation.z = t * 0.25;
  torus2.rotation.z = -t * 0.18;
  torus3.rotation.z = t * 0.12;
  torusGroup.rotation.y = t * 0.06;

  /* Portal spin */
  portalGroup.rotation.z = t * 0.35;
  portalGroup.children.forEach(function(r, i) {
    r.rotation.z = t * (0.35 + i * 0.12);
  });

  /* Pulsing lights */
  gLight1.intensity  = 2.5 + Math.sin(t * 2.0) * 0.7;
  gLight2.intensity  = 2.0 + Math.cos(t * 1.6) * 0.6;
  tealLight.intensity = 1.5 + Math.sin(t * 1.2 + 1) * 0.4;
  limeLight.intensity = 0.8 + Math.cos(t * 2.5) * 0.4;

  /* Stars slow drift */
  stars.rotation.y = t * 0.007;
  dust.rotation.y  = t * 0.014;

  renderer.render(scene, camera);
}

/* ─────────────────────────────────────────
   RESIZE
───────────────────────────────────────── */
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────────────────────────────────────
   UI
───────────────────────────────────────── */
function initUI() {
  /* Cursor */
  var cursor = document.getElementById('cursor');
  document.addEventListener('mousemove', function(e) {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });
  var inters = 'a, button, input, textarea, .sys-card, .sp-panel';
  document.addEventListener('mouseover', function(e) {
    if (e.target.closest(inters)) cursor.classList.add('exp');
  });
  document.addEventListener('mouseout', function(e) {
    if (e.target.closest(inters)) cursor.classList.remove('exp');
  });

  /* Navbar */
  var navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', function() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive:true });

  /* Mobile menu */
  var hamburger  = document.querySelector('.hamburger');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
  }
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* Cycler */
  var words = ['Sell.', 'Scale.', 'Win.', 'Grow.'];
  var wi = 0;
  var cycler = document.querySelector('.cycler');
  if (cycler) {
    setInterval(function() {
      wi = (wi + 1) % words.length;
      var span = cycler.querySelector('span');
      span.style.animation = 'none';
      void span.offsetWidth;
      span.textContent = words[wi];
      span.style.animation = 'clipIn .55s ease forwards';
    }, 2800);
  }

  /* Stage toggle */
  document.querySelectorAll('.stage-toggle button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.stage-toggle button').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  /* Contact form */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = form.querySelector('.form-submit');
      btn.textContent = 'SUBMITTED ✓';
      btn.style.background = '#22c55e';
      setTimeout(function() { btn.textContent = 'REQUEST DISCOVERY CALL →'; btn.style.background = ''; }, 3000);
    });
  }
}

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
animate(0);
setTimeout(onWorldReady, 850);
