/* ==========================================================================
   Hero "trailer": una mirrorless full-frame in 3D che esplode mentre scorri.
   Nessun modello esterno: geometrie, texture e luci da studio sono generate qui.
   ========================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const section = document.getElementById('trailer');
const stage = section?.querySelector('.trailer__stage');
const canvas = section?.querySelector('.trailer__canvas');

// pittogramma del logo (coordinate originali 1932×1932)
const MARK = [
  'M448 393L735 367V705Q735 735 710 752L562 850Q522 878 528 915L715 1340Q735 1390 735 1440V1650H450V1480Q450 1430 428 1380L262 1010Q245 955 290 920L430 826Q448 812 448 790Z',
  'M920 350L1207 325V595Q1207 625 1182 640L1035 735Q1005 760 1015 800L1185 1190Q1207 1240 1207 1290V1650H920V1330Q920 1280 898 1225L752 890Q735 830 790 790L897 712Q920 695 920 675Z',
  'M1392 307L1680 280V480Q1680 505 1652 523L1520 608Q1488 632 1497 675L1655 1025Q1680 1080 1680 1135V1650H1392V1145Q1392 1095 1368 1045L1235 745Q1222 690 1262 655L1370 585Q1392 568 1392 545Z',
];

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (section && canvas && hasWebGL()) init();
else document.documentElement.classList.add('no-webgl');

function init() {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const hq = !isTouch && (navigator.hardwareConcurrency || 4) >= 4;

  /* ---------- Renderer & scena ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 600);

  /* ---------- Studio fotografico virtuale (riflessi realistici) ---------- */
  function studio() {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x010102);
    const panel = (w, h, color, k, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
    };
    panel(34, 9, 0xffffff, 2.2, [0, 26, 4]);        // strip dall'alto
    panel(14, 26, 0xffffff, 6.5, [-24, 8, 20]);     // softbox principale
    panel(12, 20, 0xffffff, 3.0, [22, 10, 20]);     // softbox secondario
    panel(5, 30, 0xb98cff, 2.2, [26, 4, -12]);      // taglio viola (colori del logo)
    panel(5, 30, 0x7f8cff, 3.2, [-24, 2, -18]);     // taglio blu
    panel(18, 10, 0xffffff, 1.8, [0, 6, 30]);       // riempimento frontale
    panel(46, 12, 0xffffff, 0.25, [0, -24, 14]);    // rimbalzo dal pavimento
    return s;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.012).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-14, 16, 20); scene.add(key);
  const rimV = new THREE.DirectionalLight(0xb48cff, 1.6); rimV.position.set(14, 6, -16); scene.add(rimV);
  const rimB = new THREE.DirectionalLight(0x7d8cff, 1.8); rimB.position.set(-16, 2, -12); scene.add(rimB);
  const lights = [[key, 2.2], [rimV, 1.6], [rimB, 1.8]];

  /* ---------- Texture procedurali ---------- */
  const canvasOf = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  function tex(c, repeat = 1, color = true) {
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (repeat !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  // mappa normale da una mappa d'altezza disegnata su canvas (tileable)
  function normalMap(size, drawHeight, strength) {
    const [c, ctx] = canvasOf(size);
    drawHeight(ctx, size);
    const src = ctx.getImageData(0, 0, size, size).data;
    const out = ctx.createImageData(size, size);
    const h = (x, y) => src[((((y + size) % size) * size) + ((x + size) % size)) * 4] / 255;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return c;
  }
  const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  // similpelle "a grana"
  const leatherHeight = (ctx, n) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < n * n / 18; i++) {
      const x = rand() * n, y = rand() * n, r = 1.2 + rand() * 3.2, v = rand() > 0.5 ? 255 : 0;
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, `rgba(${v},${v},${v},.22)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = g; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  };
  // vernice micro-goffrata
  const grainHeight = (ctx, n) => {
    const d = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = 118 + rand() * 20; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    ctx.putImageData(d, 0, 0);
  };
  const leatherC = normalMap(256, leatherHeight, 3.2);
  const grainC = normalMap(128, grainHeight, 1.2);
  const nmap = (c, r) => { const t = tex(c, 1, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(r, r); return t; };

  function markPath(ctx, x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 1450, size / 1450); ctx.translate(-240, -270);
    MARK.forEach((d) => ctx.fill(new Path2D(d))); ctx.restore();
  }

  /* ---------- Materiali ---------- */
  const leatherOpts = (r) => ({ color: 0x0d0d0e, roughness: 0.78, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x333340), normalMap: nmap(leatherC, r), normalScale: new THREE.Vector2(0.9, 0.9) });
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.5, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.4, normalMap: nmap(grainC, 0.35), normalScale: new THREE.Vector2(0.35, 0.35) }),
    leather: new THREE.MeshPhysicalMaterial(leatherOpts(0.28)),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.88, metalness: 0 }),
    anod: new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 0.32, metalness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xeceef2, roughness: 0.06, metalness: 1 }),
    brushed: new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.22, metalness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95, metalness: 0 }),
    blackInside: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95, metalness: 0, side: THREE.BackSide }),
    frame: new THREE.MeshStandardMaterial({ color: 0x70737a, roughness: 0.4, metalness: 0.95 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0a2e22, roughness: 0.5, metalness: 0.1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe0b35a, roughness: 0.22, metalness: 1 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.3, metalness: 0.3 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.4, metalness: 0.2 }),
    sd: new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.35, metalness: 0.1 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x9a6bff, emissive: 0x8a5cff, emissiveIntensity: 0.6, roughness: 0.3 }),
    redGlass: new THREE.MeshPhysicalMaterial({ color: 0x6a0d0d, roughness: 0.05, metalness: 0, clearcoat: 1, emissive: 0x300000 }),
    sensor: new THREE.MeshPhysicalMaterial({ color: 0x141a33, roughness: 0.08, metalness: 0.6, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 900], emissive: 0x3a1a8a, emissiveIntensity: 0, clearcoat: 1 }),
    glass: hq
      ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 1, thickness: 0.6, ior: 1.6, iridescence: 0.7, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420], attenuationColor: new THREE.Color(0xd8ffe8), attenuationDistance: 6, specularIntensity: 1, clearcoat: 1, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: 0x8fa4e6, roughness: 0, metalness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420], side: THREE.DoubleSide, depthWrite: false }),
    blade: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }),
  };

  const FONT = (wt, px) => `${wt} ${px}px "Inter", -apple-system, Helvetica, Arial, sans-serif`;
  // testi stampati (bianchi su fondo nero opaco)
  function printedMat(w, h, draw, rough = 0.5) {
    const [c, ctx] = canvasOf(w, h);
    ctx.fillStyle = '#0e0e10'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e9e9ee'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    draw(ctx, w, h);
    return new THREE.MeshStandardMaterial({ map: tex(c), roughness: rough, metalness: 0.1 });
  }
  const gradTex = (w, h, draw) => { const [c, g] = canvasOf(w, h); draw(g, w, h); return tex(c); };
  const brandGrad = (g, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#c85cff'); gr.addColorStop(1, '#6f80ff'); return gr; };

  /* ---------- Geometrie di utilità ---------- */
  const rbox = (w, h, d, r = 0.3, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);
  const cylZ = (rt, rb, len, seg = 96, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, open); g.rotateX(Math.PI / 2); return g; };
  function knurl(r, len, ridges = 72, depth = 0.05, axisZ = true) {
    const g = new THREE.CylinderGeometry(r, r, len, ridges * 4, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z);
      if (rr < r * 0.9) continue;
      const a = Math.atan2(z, x);
      const k = 1 + depth * (Math.cos(a * ridges) > 0 ? 1 : 0) / r;
      p.setX(i, x * k); p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    if (axisZ) g.rotateX(Math.PI / 2);
    return g;
  }
  function lensGeo(r, front, back) {
    const pts = [], n = 28;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(r * t, -back * (1 - t * t))); }
    for (let i = n; i >= 0; i--) { const t = i / n; pts.push(new THREE.Vector2(r * t, front * (1 - t * t))); }
    const g = new THREE.LatheGeometry(pts, 72); g.rotateX(Math.PI / 2); return g;
  }
  function extrude(shape, depth, bevel = 0.25, seg = 4) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 14 });
    g.translate(0, 0, -depth / 2); return g;
  }

  /* ---------- Struttura ---------- */
  const root = new THREE.Group(); scene.add(root);
  const model = new THREE.Group(); root.add(model);
  const parts = [];
  const named = {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  const add = (group, obj, rot) => { if (rot) obj.rotation.set(...rot); group.add(obj); return obj; };
  function part(name, obj, base, off, opts = {}) {
    obj.position.copy(base); model.add(obj);
    const p = { obj, base: base.clone(), off, rot: opts.rot || new THREE.Euler(), delay: opts.delay ?? 0, baseRot: obj.rotation.clone() };
    parts.push(p); if (name) named[name] = obj; return p;
  }

  // Sagoma frontale del corpo (con la gobba del mirino)
  const HX = 0.9, TOP = 3.35, BOT = -3.55, L = -6.45, R = 6.45, HUMP = 5.3;
  function bodyShape(k = 0) {
    const s = new THREE.Shape(), r = 0.55;
    const l = L + k, rr = R - k, b = BOT + k, t = TOP - k, ht = HUMP - k, hb = 2.95 - k, htw = 1.8 - k;
    s.moveTo(l + r, b);
    s.lineTo(rr - r, b); s.quadraticCurveTo(rr, b, rr, b + r);
    s.lineTo(rr, t - r); s.quadraticCurveTo(rr, t, rr - r, t);
    s.lineTo(HX + hb + 0.35, t); s.quadraticCurveTo(HX + hb, t, HX + hb - 0.12, t + 0.3);
    s.lineTo(HX + htw + 0.14, ht - 0.28); s.quadraticCurveTo(HX + htw, ht, HX + htw - 0.35, ht);
    s.lineTo(HX - htw + 0.35, ht); s.quadraticCurveTo(HX - htw, ht, HX - htw - 0.14, ht - 0.28);
    s.lineTo(HX - hb + 0.12, t + 0.3); s.quadraticCurveTo(HX - hb, t, HX - hb - 0.35, t);
    s.lineTo(l + r, t + 0.12); s.quadraticCurveTo(l, t + 0.12, l, t - r);
    s.lineTo(l, b + r); s.quadraticCurveTo(l, b, l + r, b);
    return s;
  }

  /* ---- Scocca posteriore ---- */
  const rear = new THREE.Group();
  rear.add(mesh(extrude(bodyShape(), 1.6).translate(0, 0, 0.225), M.paint));
  rear.add(mesh(rbox(3.3, 2.2, 1.2, 0.5, 5), M.rubber, HX, 4.1, -1.05));   // oculare
  add(rear, mesh(new THREE.PlaneGeometry(2.1, 1.3), M.black, HX, 4.1, -1.66), [0, Math.PI, 0]);
  rear.add(mesh(rbox(1.6, 3.8, 0.5, 0.25), M.rubber, -5.3, 0.9, -0.9)); // appoggio pollice
  for (const [x, y, r] of [[4.6, 2.3, 0.3], [5.5, 2.3, 0.3], [4.3, -2.6, 0.28], [5.4, -2.6, 0.28], [3.2, 2.5, 0.26]]) rear.add(mesh(cylZ(r, r, 0.3, 32), M.anod, x, y, -0.72));
  rear.add(mesh(knurl(0.8, 0.28, 40, 0.04), M.anod, 4.95, -0.4, -0.7));
  rear.add(mesh(cylZ(0.3, 0.3, 0.35, 32), M.brushed, 4.95, -0.4, -0.86));
  rear.add(mesh(cylZ(0.34, 0.3, 0.5, 24), M.rubber, 4.3, 1.1, -0.75)); // joystick
  part('rear', rear, V(0, 0, -1.2), V(0, 0, -5), { delay: 0.5, rot: new THREE.Euler(0, 0.2, 0) });

  /* ---- Display orientabile ---- */
  const screenTex = gradTex(640, 420, (g) => {
    const grd = g.createLinearGradient(0, 0, 640, 420); grd.addColorStop(0, '#26123f'); grd.addColorStop(.5, '#0f2d5c'); grd.addColorStop(1, '#361048');
    g.fillStyle = grd; g.fillRect(0, 0, 640, 420);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,${180 + rand() * 60},${200 + rand() * 55},${rand() * .5})`; g.beginPath(); g.arc(rand() * 640, 120 + rand() * 200, 2 + rand() * 18, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(640 * i / 3, 0); g.lineTo(640 * i / 3, 420); g.stroke(); g.beginPath(); g.moveTo(0, 420 * i / 3); g.lineTo(640, 420 * i / 3); g.stroke(); }
    g.strokeStyle = '#30d158'; g.lineWidth = 3; g.strokeRect(280, 140, 80, 100);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 372, 640, 48);
    g.fillStyle = '#fff'; g.font = FONT(600, 22); g.textBaseline = 'middle';
    g.fillText('1/250', 24, 396); g.fillText('F2.8', 120, 396); g.fillText('ISO 3200', 200, 396); g.fillText('±0.0', 330, 396);
    g.fillStyle = '#ff453a'; g.beginPath(); g.arc(560, 28, 7, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText('RAW', 575, 28);
    markPath(g, 20, 12, 34);
  });
  const lcd = new THREE.Group();
  lcd.add(mesh(rbox(7.4, 4.8, 0.32, 0.14), M.paint));
  add(lcd, mesh(new THREE.PlaneGeometry(6.9, 4.4), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }), 0, 0, -0.17), [0, Math.PI, 0]);
  add(lcd, mesh(new THREE.PlaneGeometry(7.0, 4.5), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.15, roughness: 0.05, clearcoat: 1 }), 0, 0, -0.175), [0, Math.PI, 0]);
  part('lcd', lcd, V(-0.6, -0.6, -2.35), V(0, -1, -8.5), { delay: 0.55, rot: new THREE.Euler(-0.4, 0.45, 0) });

  /* ---- Telaio in magnesio, scheda madre, sensore ---- */
  const frame = new THREE.Group();
  frame.add(mesh(extrude(bodyShape(0.35), 1.3, 0.12, 2), M.frame));
  part('frame', frame, V(0, 0, -0.1), V(0, 0, 0), { delay: 0.45 });

  const board = new THREE.Group();
  board.add(mesh(new THREE.BoxGeometry(10, 5.6, 0.1), M.pcb));
  for (const [x, y, w, h] of [[-2.4, 1, 2.3, 2.3], [1.2, 1.5, 1.6, 1.1], [1.4, -1.3, 2.2, 1.4], [3.8, 0.3, 1.1, 1.1], [-2.2, -1.8, 1.4, 0.8], [3.6, -1.8, 0.8, 0.8]]) board.add(mesh(new THREE.BoxGeometry(w, h, 0.22), M.chip, x, y, -0.15));
  for (let i = 0; i < 30; i++) board.add(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), M.gold, -4.5 + (i % 15) * 0.32, i < 15 ? 2.55 : -2.55, -0.06));
  part('board', board, V(0.3, -0.1, -0.85), V(0, 0, -2.4), { delay: 0.5 });

  const sensor = new THREE.Group();
  sensor.add(mesh(new THREE.BoxGeometry(5.2, 4.3, 0.18), M.pcb));
  sensor.add(mesh(new THREE.BoxGeometry(4.3, 3.1, 0.2), M.gold, 0, 0, 0.06));
  sensor.add(mesh(new THREE.BoxGeometry(3.6, 2.4, 0.16), M.sensor, 0, 0, 0.16));
  part('sensor', sensor, V(HX, 0.25, 0.75), V(0, 0, 3.2), { delay: 0.42 });

  /* ---- Frontale: baionetta, logo, dettagli ---- */
  const front = new THREE.Group();
  front.add(mesh(extrude(bodyShape(), 1.5).translate(0, 0, -0.225), M.paint));
  const MX = HX, MY = 0.25, MZ = 0.8;
  const panelL = new THREE.Shape(); // pannello in similpelle a sinistra della baionetta
  panelL.moveTo(-3.3, -3.2); panelL.lineTo(MX - 3.0, -3.2); panelL.absarc(MX, MY, 3.15, Math.PI * 1.13, Math.PI * 0.87, true); panelL.lineTo(-3.3, 2.7); panelL.closePath();
  front.add(mesh(new THREE.ShapeGeometry(panelL, 24), M.leather, 0, 0, 0.785));
  front.add(mesh(new THREE.TorusGeometry(2.78, 0.16, 24, 128), M.chrome, MX, MY, MZ));
  front.add(mesh(new THREE.RingGeometry(2.3, 2.9, 128), M.chrome, MX, MY, MZ + 0.02));
  front.add(mesh(cylZ(2.3, 2.3, 0.9, 96, true), M.blackInside, MX, MY, MZ - 0.45));
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + 0.4; add(front, mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), M.chrome, MX + Math.cos(a) * 2.2, MY + Math.sin(a) * 2.2, MZ - 0.05), [0, 0, a + Math.PI / 2]); }
  for (let i = 0; i < 10; i++) { const a = -0.5 + i * 0.11; add(front, mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), M.gold, MX + Math.sin(a) * 2.05, MY - Math.cos(a) * 2.05, MZ - 0.02), [0, 0, a]); }
  front.add(mesh(cylZ(0.34, 0.34, 0.3, 32), M.brushed, 4.6, -1.3, 0.72)); // sblocco obiettivo
  front.add(mesh(cylZ(0.22, 0.26, 0.12, 32), M.redGlass, -2.6, 2.45, 0.78)); // illuminatore AF
  const logoTex = gradTex(512, 512, (g) => { g.fillStyle = '#dcdce4'; markPath(g, 56, 56, 400); });
  front.add(mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.3, metalness: 0.6 }), HX, 4.25, 0.79));
  for (const x of [L - 0.05, R + 0.05]) add(front, mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), M.brushed, x, 2.5, -0.6), [0, Math.PI / 2, 0]);
  part('front', front, V(0, 0, 0.85), V(0, 0.3, 4.4), { delay: 0.38, rot: new THREE.Euler(0, -0.15, 0) });

  /* ---- Impugnatura ---- */
  const gripShape = new THREE.Shape(); // vista dall'alto (x, -z)
  gripShape.moveTo(-6.45, -0.2); gripShape.lineTo(-6.45, -3.3); gripShape.quadraticCurveTo(-6.4, -4.55, -5.3, -4.6);
  gripShape.lineTo(-4.3, -4.5); gripShape.quadraticCurveTo(-3.35, -4.35, -3.3, -3.4); gripShape.quadraticCurveTo(-3.05, -2.5, -3.5, -1.5); gripShape.lineTo(-3.5, -0.2); gripShape.closePath();
  const gripGeo = new THREE.ExtrudeGeometry(gripShape, { depth: 6.0, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 6, curveSegments: 20 });
  gripGeo.rotateX(-Math.PI / 2); gripGeo.translate(0, -3.1, 0);
  const grip = new THREE.Group();
  grip.add(mesh(gripGeo, M.leather));
  const gTop = 3.35;
  grip.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 48), M.brushed, -4.9, gTop + 0.45, 3.2)); // pulsante di scatto
  grip.add(mesh(knurl(0.8, 0.24, 30, 0.04, false), M.anod, -4.9, gTop + 0.26, 3.2));
  add(grip, mesh(new THREE.TorusGeometry(0.47, 0.035, 12, 48), M.accent, -4.9, gTop + 0.62, 3.2), [Math.PI / 2, 0, 0]);
  grip.add(mesh(knurl(0.75, 0.3, 30, 0.04, false), M.anod, -4.3, gTop - 0.35, 4.25)); // ghiera anteriore
  part('grip', grip, V(0, 0, 0), V(-5, 0.4, 2.6), { delay: 0.36, rot: new THREE.Euler(0, 0.3, 0.08) });

  /* ---- Ghiere superiori + slitta flash ---- */
  const dialTop = (label) => {
    const t = gradTex(256, 256, (g) => { g.fillStyle = '#18181b'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#eee'; g.font = FONT(700, 26); g.textAlign = 'center'; g.textBaseline = 'middle'; label.forEach((s, i) => { const a = -Math.PI / 2 + (i - (label.length - 1) / 2) * 0.5; g.fillText(s, 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); }); });
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.5 });
  };
  const dials = new THREE.Group();
  dials.add(mesh(knurl(1.05, 0.6, 44, 0.05, false), [M.anod, dialTop(['M', 'S', 'A', 'P', 'AUTO']), M.anod], 4.35, 0.3, 0.4));
  dials.add(mesh(knurl(1.15, 0.35, 44, 0.04, false), M.anod, 4.35, -0.12, 0.4));
  dials.add(mesh(knurl(0.9, 0.55, 40, 0.05, false), [M.anod, dialTop(['+3', '+2', '+1', '0', '-1', '-2', '-3']), M.anod], 5.2, 0.28, -1.15));
  dials.add(mesh(knurl(0.8, 0.5, 34, 0.04, false), [M.anod, dialTop(['H', 'M', 'L', 'S']), M.anod], -2.3, 0.25, -0.4));
  for (const x of [2.7, 3.2]) dials.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 24), M.anod, x, 0.08, -1.3));
  part('dials', dials, V(0, TOP, 0), V(0, 7.5, 0), { delay: 0.48, rot: new THREE.Euler(0, 0.5, 0) });

  const shoe = new THREE.Group();
  shoe.add(mesh(new THREE.BoxGeometry(2.1, 0.12, 2.0), M.brushed));
  for (const x of [-0.95, 0.95]) shoe.add(mesh(new THREE.BoxGeometry(0.2, 0.28, 2.0), M.brushed, x, 0.1, 0));
  for (let i = 0; i < 5; i++) shoe.add(mesh(new THREE.BoxGeometry(0.1, 0.04, 0.3), M.gold, -0.4 + i * 0.2, 0.08, 0.3));
  part('shoe', shoe, V(HX, HUMP + 0.3, 0), V(0, 6, 0.5), { delay: 0.46 });

  /* ---- Batteria e scheda SD ---- */
  const bat = new THREE.Group();
  bat.add(mesh(rbox(2.0, 5.0, 3.3, 0.22), M.battery));
  const batLabel = gradTex(512, 256, (g) => { g.fillStyle = '#1f1f23'; g.fillRect(0, 0, 512, 256); g.fillStyle = brandGrad(g, 0, 0, 512, 0); g.fillRect(0, 0, 512, 34); g.fillStyle = '#fff'; g.font = FONT(700, 44); g.fillText('Li-ion 2280mAh', 30, 110); g.font = FONT(500, 30); g.fillStyle = '#aaa'; g.fillText('7.2V · 16.4Wh', 30, 170); });
  add(bat, mesh(new THREE.PlaneGeometry(3.2, 4.2), new THREE.MeshStandardMaterial({ map: batLabel, roughness: 0.4 }), -1.01, 0, 0), [0, -Math.PI / 2, Math.PI / 2]);
  bat.add(mesh(new THREE.BoxGeometry(1.1, 0.06, 0.8), M.gold, 0, 2.52, 0));
  part('battery', bat, V(-4.95, -0.6, 1.6), V(-0.8, -9, 1.5), { delay: 0.55, rot: new THREE.Euler(0, 0.9, 0.2) });
  const sdTex = gradTex(256, 320, (g) => { g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, 256, 320); g.fillStyle = brandGrad(g, 0, 0, 256, 320); g.fillRect(0, 150, 256, 90); g.fillStyle = '#fff'; g.font = FONT(800, 60); g.fillText('256GB', 18, 110); g.font = FONT(700, 34); g.fillText('V90', 18, 200); });
  const sd = mesh(new THREE.BoxGeometry(1.5, 1.9, 0.12), [M.sd, M.sd, M.sd, M.sd, new THREE.MeshStandardMaterial({ map: sdTex, roughness: 0.35 }), M.sd]);
  part('sd', sd, V(-4.4, -1.6, -0.3), V(-2.5, -6, 2.5), { delay: 0.6, rot: new THREE.Euler(0.4, 1.0, 0.3) });

  /* ---------- Obiettivo 24-70 f/2.8 ---------- */
  const LZ = 1.95;
  function lensPart(name, obj, z, offZ, delay) { return part(name, obj, V(MX, MY, LZ + z), V(0, 0, offZ), { delay }); }

  const lMount = new THREE.Group();
  lMount.add(mesh(cylZ(2.72, 2.72, 0.4), M.chrome));
  lMount.add(mesh(new THREE.RingGeometry(1.6, 2.4, 96), M.black, 0, 0, -0.21));
  lensPart('lMount', lMount, 0.2, 4, 0.0);

  const lRear = new THREE.Group();
  lRear.add(mesh(cylZ(3.25, 3.05, 1.7), M.paint));
  lRear.add(mesh(rbox(0.6, 1.1, 0.9, 0.12), M.anod, -3.2, 0.6, 0.1));  // selettore AF/MF
  lRear.add(mesh(rbox(0.25, 0.45, 0.35, 0.08), M.brushed, -3.45, 0.75, 0.2));
  lensPart('lRear', lRear, 1.25, 6, 0.03);

  const zoomNumbers = printedMat(1024, 128, (g, w, h) => { g.font = FONT(600, 44); ['24', '28', '35', '50', '70'].forEach((t, i) => g.fillText(t, w * (0.38 + i * 0.06), h / 2)); });
  const lZoom = new THREE.Group();
  lZoom.add(mesh(knurl(3.45, 1.9, 120, 0.07), M.rubber, 0, 0, 0.35));
  lZoom.add(mesh(cylZ(3.4, 3.4, 0.55, 128), [zoomNumbers, M.paint, M.paint], 0, 0, -0.95));
  lensPart('lZoom', lZoom, 3.2, 9, 0.06);

  const midPrint = printedMat(2048, 128, (g, w, h) => { g.font = FONT(600, 46); g.fillText('24-70mm  1:2.8', w * 0.5, h / 2); g.font = FONT(500, 34); g.fillText('ø82', w * 0.66, h / 2); });
  const lMid = new THREE.Group();
  lMid.add(mesh(cylZ(3.36, 3.36, 1.1, 128), [midPrint, M.paint, M.paint]));
  const badgeTex = gradTex(256, 256, (g) => { g.fillStyle = brandGrad(g, 0, 0, 0, 256); markPath(g, 28, 28, 200); });
  add(lMid, mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true, emissive: 0xffffff, emissiveMap: badgeTex, emissiveIntensity: 0.4, roughness: 0.3 }), 0, 3.38, 0.1), [-Math.PI / 2, 0, 0]);
  lMid.add(mesh(new THREE.TorusGeometry(3.37, 0.035, 12, 160), M.accent, 0, 0, 0.56));
  lensPart('lMid', lMid, 4.75, 12, 0.09);

  lensPart('lFocus', mesh(knurl(3.48, 1.4, 150, 0.045), M.rubber), 6.05, 15.5, 0.12);

  const frontPrint = gradTex(1024, 1024, (g) => {
    g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, 1024, 1024); g.fillStyle = '#dedee6'; g.font = FONT(600, 34); g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = '1:2.8   24–70mm   ø82   ·   CRAPANZANO OPTICS   ·   ';
    [...txt].forEach((ch, i) => { const a = -Math.PI / 2 + (i - txt.length / 2) * 0.052; g.save(); g.translate(512 + Math.cos(a) * 455, 512 + Math.sin(a) * 455); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); });
  });
  const lFront = new THREE.Group();
  lFront.add(mesh(cylZ(3.72, 3.45, 1.3, 128), M.paint));
  lFront.add(mesh(new THREE.TorusGeometry(3.6, 0.1, 16, 160), M.anod, 0, 0, 0.66));
  lFront.add(mesh(new THREE.RingGeometry(3.08, 3.62, 128), new THREE.MeshStandardMaterial({ map: frontPrint, roughness: 0.6 }), 0, 0, 0.62));
  lFront.add(mesh(cylZ(3.08, 3.0, 1.2, 96, true), M.blackInside));
  lensPart('lFront', lFront, 7.45, 18.5, 0.15);

  const frontGlass = mesh(lensGeo(3.05, 0.8, 0.2), M.glass); frontGlass.renderOrder = 2;
  lensPart('lGlass', frontGlass, 7.85, 22.5, 0.18);

  const inner = [];
  [[2.2, .35, .25, 1.4], [2.5, .5, .15, 2.5], [2.35, .2, .4, 3.7], [2.75, .45, .3, 5.3], [2.95, .3, .3, 6.7]].forEach(([r, f, b, z], i) => {
    const g = mesh(lensGeo(r, f, b), M.glass); g.renderOrder = 2;
    g.add(mesh(new THREE.TorusGeometry(r, 0.08, 10, 90), M.anod));
    inner.push(lensPart('lIn' + i, g, z, 6.5 + i * 3.1 + 1.2, 0.2 + i * 0.03));
  });

  const iris = new THREE.Group(); const blades = [];
  const bladeShape = new THREE.Shape(); bladeShape.moveTo(0, 0); bladeShape.quadraticCurveTo(0.8, 0.35, 1.5, 0); bladeShape.quadraticCurveTo(0.8, 0.8, 0, 0);
  for (let i = 0; i < 11; i++) { const pv = new THREE.Group(); pv.rotation.z = (i / 11) * Math.PI * 2; const bl = mesh(new THREE.ShapeGeometry(bladeShape, 12), M.blade, 1.05, 0, i * 0.004); pv.add(bl); iris.add(pv); blades.push(bl); }
  iris.add(mesh(new THREE.TorusGeometry(2.6, 0.2, 16, 96), M.anod));
  lensPart('iris', iris, 4.3, 13.6, 0.22);

  /* ---------- Flash (esce dalla fotocamera sul finale) ---------- */
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const cm = (m) => { const c = m.clone(); c.clippingPlanes = [clip]; return c; };
  const fresnelTex = gradTex(512, 256, (g) => { g.fillStyle = '#d9d9de'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${i % 2 ? .07 : .02})`; g.fillRect(0, i * 6.4, 512, 3.2); } for (let i = 0; i < 64; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(i * 8, 0, 2, 256); } });
  const fresnelMat = cm(new THREE.MeshStandardMaterial({ color: 0xffffff, map: fresnelTex, roughness: 0.25, emissive: 0xffffff, emissiveMap: fresnelTex, emissiveIntensity: 0.05 }));
  const flash = new THREE.Group();
  const flashInner = new THREE.Group(); flash.add(flashInner);
  flashInner.add(mesh(new THREE.BoxGeometry(1.9, 0.18, 1.9), cm(M.brushed), 0, 0.1, 0));
  flashInner.add(mesh(rbox(2.2, 0.8, 2.2, 0.2), cm(M.paint), 0, 0.6, 0));
  flashInner.add(mesh(rbox(3.6, 4.3, 2.8, 0.35, 5), cm(M.paint), 0, 3.0, 0));
  flashInner.add(mesh(rbox(3.0, 1.2, 0.1, 0.05), cm(M.black), 0, 3.6, -1.42));
  add(flashInner, mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.3, 24), cm(M.anod), 0, 5.2, 0), [0, 0, Math.PI / 2]);
  flashInner.add(mesh(cylZ(0.18, 0.18, 0.1, 16), cm(M.redGlass), 1.2, 3.0, 1.42));
  const head = new THREE.Group(); head.position.set(0, 6.6, 0.3); flashInner.add(head);
  head.add(mesh(rbox(4.2, 2.6, 3.6, 0.4, 5), cm(M.paint)));
  head.add(mesh(new THREE.PlaneGeometry(3.7, 2.05), fresnelMat, 0, 0, 1.81));
  const flashLight = new THREE.PointLight(0xf4f1ff, 0, 60, 1.6); flashLight.position.set(0, 0, 4); head.add(flashLight);
  const flashSpot = new THREE.DirectionalLight(0xffffff, 0); flashSpot.position.set(0, 10, 30); scene.add(flashSpot);
  flash.scale.setScalar(0.85);
  flash.position.set(HX, HUMP + 0.36, 0.1);
  model.add(flash);
  const shoeTop = new THREE.Vector3(HX, HUMP + 0.36, 0);
  const up = new THREE.Vector3();

  /* ---------- Timeline ---------- */
  const tmp = new THREE.Vector3();
  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ramp = (p, a, b) => clamp01((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;

  function explodeAt(p) {
    if (p < 0.12) return 0;
    if (p < 0.6) return smooth(ramp(p, 0.12, 0.6));
    if (p < 0.8) return 1;
    return 1 - smooth(ramp(p, 0.8, 0.88));
  }
  function applyExplode(E, drift) {
    for (const pt of parts) {
      const e = smooth(clamp01((E * 1.6 - pt.delay) / 1.0)) * (1 + drift);
      pt.obj.position.set(pt.base.x + pt.off.x * e, pt.base.y + pt.off.y * e, pt.base.z + pt.off.z * e);
      pt.obj.rotation.set(pt.baseRot.x + pt.rot.x * e, pt.baseRot.y + pt.rot.y * e, pt.baseRot.z + pt.rot.z * e);
    }
    inner.forEach((pt, i) => { pt.obj.rotation.y = Math.sin(E * Math.PI) * (i % 2 ? .3 : -.3); });
    const open = 0.55 + 0.45 * Math.cos(E * Math.PI * 2);
    blades.forEach((b) => { b.rotation.z = lerp(-0.9, 0.15, open); });
    M.sensor.emissiveIntensity = E * 0.8;
  }

  let portrait = false;
  let smx = 0, smy = 0;
  let extraDrop = 0, extraDist = 0;
  const tanH = () => Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const fit = (w, h) => Math.max(h / tanH(), w / (tanH() * cam.aspect));

  function place(p, E, t) {
    const hold = smooth(ramp(p, 0.62, 0.8)) * (1 - smooth(ramp(p, 0.8, 0.86)));
    const endK = smooth(ramp(p, 0.8, 0.9));
    const idle = Math.sin(t * 0.4) * 0.05;
    // l'asse dell'esploso punta quasi verso chi guarda: i pezzi volano verso lo spettatore
    const rx = lerp(lerp(0.2, 0.1, E), 0.1, endK);
    const ry = lerp(lerp(0.62 + idle, portrait ? 0.5 : 1.0, E) - hold * (portrait ? 0.3 : 0.55), 0.22 + idle * 0.5, endK);
    root.rotation.set(rx + smy * 0.15, ry + smx * 0.3, 0);
    // distanza: prima si allarga per far spazio, poi la camera "vola" dentro l'esploso
    const d0 = fit(12.5, 10.5) * 1.1;
    const dE = fit(portrait ? 13 : 23, portrait ? 21 : 16) * 1.05;
    const dEnd = fit(13, 25) * 1.08;
    let d = lerp(d0, dE, E);
    d = lerp(d, dE * 0.52, hold);
    d = lerp(d, dEnd * (1 + extraDist), endK);
    // l'obiettivo esploso va verso destra: sposto l'inquadratura per tenerlo nello schermo
    const shiftX = lerp(0, portrait ? 2.2 : 3.2 + Math.max(0, cam.aspect - 1.6) * 2.2, E) * (1 - endK);
    cam.position.set(lerp(0, -1.5, hold) + shiftX, lerp(0, 1.2, hold), d);
    cam.lookAt(shiftX, lerp(0, -0.5, hold), 0);
    model.position.set(-HX, lerp(-0.4, portrait ? 0.5 : -0.2, E), -lerp(3.4, 6.5, E));
    root.position.y = -endK * ((portrait ? 4.6 : 6.6) + extraDrop); // extraDrop: vedi fitUnderTitle()
  }

  /* ---------- Titoli, callout e barre ---------- */
  const beats = [...section.querySelectorAll('.beat')].map((el) => ({ el, a: +el.dataset.in, b: +el.dataset.out, title: el.querySelector('.beat__title') }));
  const callouts = [...section.querySelectorAll('.callout')].map((el) => ({
    el, a: +el.dataset.in, b: +el.dataset.out, part: named[el.dataset.part],
    ang: (+el.dataset.ang || -35) * Math.PI / 180, len: +el.dataset.len || 80,
    line: el.querySelector('.callout__line'), label: el.querySelector('.callout__label'),
  }));
  const intro = section.querySelector('.trailer__intro');
  const cue = section.querySelector('.scroll-cue');
  const cta = section.querySelector('.trailer__cta');
  const flashEl = section.querySelector('.trailer__flash');
  const glow = section.querySelector('.trailer__glow');
  const ticks = [...section.querySelectorAll('.trailer__progress i')];

  function windowAlpha(p, a, b, edge = 0.28) {
    if (p <= a || p >= b) return { o: 0, k: p <= a ? 0 : 1 };
    const k = (p - a) / (b - a);
    if (b > 1) return { o: smooth(clamp01((p - a) / 0.035)), k: clamp01((p - a) / (1 - a)) };
    return { o: smooth(clamp01(Math.min(1, k / edge, (1 - k) / edge))), k };
  }
  const FIRE_A = 0.885, FIRE_B = 0.925;
  function updateOverlay(p) {
    const io = 1 - smooth(ramp(p, 0.02, 0.09));
    intro.style.opacity = io;
    intro.style.transform = `translateY(${(1 - io) * -40}px) scale(${1 + (1 - io) * 0.06})`;
    intro.style.filter = `blur(${(1 - io) * 10}px)`;
    cue.style.opacity = 1 - ramp(p, 0, 0.03);
    for (const b of beats) {
      const { o, k } = windowAlpha(p, b.a, b.b);
      b.el.style.opacity = o;
      b.el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      b.el.style.filter = o < 0.999 ? `blur(${(1 - o) * 12}px)` : 'none';
      if (b.title) {
        const s = 1.08 - 0.08 * smooth(clamp01(k * 2.2)), ty = (1 - smooth(clamp01(k * 3))) * 30;
        b.title.style.transform = `translateY(${ty}px) scale(${s})`;
        b.title.style.letterSpacing = `${-0.04 + (1 - o) * 0.06}em`;
      }
    }
    const bar = smooth(ramp(p, 0.1, 0.2)) * (1 - smooth(ramp(p, 0.84, 0.92)));
    stage.style.setProperty('--bar', `${bar * 9}vh`);
    const f = p > FIRE_A && p < FIRE_B ? Math.pow(Math.sin(ramp(p, FIRE_A, FIRE_B) * Math.PI), 0.6) : 0;
    flashEl.style.opacity = f * 0.92;
    glow.style.opacity = 0.4 + smooth(ramp(p, 0.85, 1)) * 0.6;
    const co = smooth(ramp(p, 0.94, 0.98));
    cta.style.opacity = co;
    cta.style.transform = `translateX(-50%) translateY(${(1 - co) * 20}px)`;
    cta.classList.toggle('is-on', co > 0.5);
    ticks.forEach((tk, i) => tk.style.setProperty('--p', clamp01(p * ticks.length - i)));
  }

  function updateCallouts(p) {
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const c of callouts) {
      const { o, k } = windowAlpha(p, c.a, c.b, 0.22);
      c.el.style.opacity = o;
      if (o <= 0 || !c.part) continue;
      c.part.getWorldPosition(tmp).project(cam);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      if (tmp.z > 1 || x < 20 || x > w - 20 || y < 60 || y > h - 40) { c.el.style.opacity = 0; continue; }
      c.el.style.transform = `translate(${x}px, ${y}px)`;
      let ang = c.ang; const len = w < 600 ? c.len * 0.6 : c.len;
      const lw = c.label.offsetWidth + 14, room = 8;
      const fitsR = x + len + lw < w - room, fitsL = x - len - lw > room;
      if (Math.cos(ang) >= 0 ? (!fitsR && fitsL) : (!fitsL && fitsR)) ang = Math.PI - ang;
      let ex = Math.cos(ang) * len; const ey = Math.sin(ang) * len;
      if (Math.cos(ang) >= 0) ex -= Math.max(0, x + ex + lw - (w - room)); else ex += Math.max(0, room - (x + ex - lw));
      c.line.style.width = len + 'px';
      c.line.style.transform = `rotate(${ang}rad) scaleX(${smooth(clamp01(k * 4))})`;
      c.label.style.transform = `translate(${ex + (Math.cos(ang) >= 0 ? 6 : -6)}px, ${ey}px) translate(${Math.cos(ang) >= 0 ? '0' : '-100%'}, -50%)`;
      c.label.style.opacity = smooth(clamp01(k * 4 - 0.4));
    }
  }

  // Sul finale il flash non deve mai toccare il titolo: misuro dove finisce il testo
  // e abbasso la fotocamera quanto serve (funziona su qualunque schermo).
  const finalBeat = beats[beats.length - 1]?.el;
  const headTop = new THREE.Vector3();
  function fitUnderTitle(rise) {
    if (!finalBeat || rise < 0.95 || finalBeat.style.opacity < 0.5) return;
    head.localToWorld(headTop.set(0, 1.5, 0)).project(cam);
    const yHead = (-headTop.y * 0.5 + 0.5) * stage.clientHeight;
    const textBottom = finalBeat.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
    if (yHead < textBottom + 28) extraDrop = Math.min(extraDrop + 0.12, 8);
    else if (yHead > textBottom + 90 && extraDrop > 0) extraDrop = Math.max(extraDrop - 0.06, 0);
    // e non deve finire sotto i pulsanti: se serve, la allontano (diventa più piccola)
    let yLow = 0;
    for (const pt of lowPts) { model.localToWorld(headTop.copy(pt)).project(cam); yLow = Math.max(yLow, (-headTop.y * 0.5 + 0.5) * stage.clientHeight); }
    const ctaTop = cta.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    if (yLow > ctaTop - 20) extraDist = Math.min(extraDist + 0.02, 1.2);
    else if (yLow < ctaTop - 70 && extraDist > 0) extraDist = Math.max(extraDist - 0.01, 0);
  }
  const lowPts = [new THREE.Vector3(HX, BOT - 0.2, 1.5), new THREE.Vector3(MX, MY - 3.75, LZ + 8)];
  addEventListener('resize', () => { extraDrop = 0; extraDist = 0; });

  /* ---------- Loop ---------- */
  let target = 0, prog = 0, visible = true, mx = 0, my = 0;
  function measure() {
    const r = section.getBoundingClientRect();
    target = clamp01(-r.top / Math.max(1, section.offsetHeight - stage.offsetHeight));
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; portrait = cam.aspect < 0.85;
    cam.fov = portrait ? 40 : 32; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();
  addEventListener('scroll', measure, { passive: true }); measure(); prog = target;
  if (!isTouch) addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(stage);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    prog += (target - prog) * 0.085;
    if (Math.abs(target - prog) < 0.0001) prog = target;
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;

    const E = explodeAt(prog);
    const drift = 0.35 * smooth(ramp(prog, 0.6, 0.8)) * (1 - smooth(ramp(prog, 0.8, 0.86)));
    applyExplode(E, drift);
    place(prog, E, t);

    // flash: sale dalla slitta e scatta
    const rise = smooth(ramp(prog, 0.82, 0.875));
    flash.visible = rise > 0.001;
    flashInner.position.y = lerp(-9.5, 0, rise);
    const fire = prog > FIRE_A && prog < FIRE_B ? Math.sin(ramp(prog, FIRE_A, FIRE_B) * Math.PI) : 0;
    root.position.x = fire > 0 ? Math.sin(t * 90) * 0.04 * fire : 0; // micro vibrazione dello scatto
    root.updateMatrixWorld(true);
    model.localToWorld(tmp.copy(shoeTop));
    up.set(0, 1, 0).applyQuaternion(root.quaternion).normalize();
    clip.setFromNormalAndCoplanarPoint(up, tmp);
    fresnelMat.emissiveIntensity = 0.05 + fire * 30;
    flashLight.intensity = fire * 900;
    flashSpot.intensity = fire * 6;

    const lightUp = 0.2 + 0.8 * smooth(ramp(prog, 0.0, 0.07));
    for (const [l, i] of lights) l.intensity = i * lightUp;
    scene.environmentIntensity = lightUp;

    fitUnderTitle(rise);
    renderer.render(scene, cam);
    updateOverlay(prog);
    updateCallouts(prog);
  }
  tick();
}
