/**
 * Dyas ♥ Naswa · Sunset Errand
 *
 * You are Dyas. Naswa texted: "Meet me on the hill before the sun goes down."
 * Walk through the neighbourhood, the shopping street and the park, talk to
 * the people on the way, pick up gifts, and find Naswa on the hill. The sun
 * sets as you go; talking to Naswa starts the ending (js/ending.js).
 *
 * Everything is drawn with the 2D canvas in a cel-shaded anime style.
 */
import { LoveSong } from './audio.js';
import { HeartFx } from './fx.js';
import { startEnding } from './ending.js';

const MUSIC_URL = './prettyjohn1-calm-537656.mp3';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(hover: none)').matches;
const fx = new HeartFx(document.getElementById('fx'), reduced);
const song = new LoveSong({ music: false });

let W = 0, H = 0, S = 1, DPR = 1;

/* ----------------------------------------------------------------- helpers */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hexCache = new Map();
function hex(h) {
  if (!hexCache.has(h)) {
    const n = parseInt(h.slice(1), 16);
    hexCache.set(h, [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  return hexCache.get(h);
}
/** blend afternoon colour a toward sunset colour b */
function mix(a, b, t, alpha = 1) {
  const A = hex(a), B = hex(b);
  return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${alpha})`;
}
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FONT = '"M PLUS Rounded 1c", system-ui, sans-serif';

/* ------------------------------------------------------------------- world */
const WORLD = 4300;
const HILL_START = 3350, HILL_TOP = 3950, HILL_H = 150;
const elev = (x) => HILL_H * smooth(HILL_START, HILL_TOP, x);

const state = {
  x: 130,
  face: 1,
  phase: 0,
  moving: false,
  progress: 0, // how far toward sunset the day has gone (0..1)
  inv: { flower: false, milk: false, ribbon: false },
  talked: new Set(),
  busy: false, // in a conversation
  ended: false,
  started: false,
};

let camX = 0, camE = 0;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  S = W < H ? Math.min(H / 700, W / 400) : Math.min(H / 720, W / 520);
  fx.resize();
}
const baseY = () => H * (W < H ? 0.6 : 0.8); // higher on phones so the dialogue box doesn't cover anyone
const viewW = () => W / S;
/** world → screen */
const sx = (x, par = 1) => (x - camX * par) * S;
const sy = (h) => baseY() - (h - camE) * S;

/* --------------------------------------------------------------- the town */
const rnd = seeded(7);
const clouds = Array.from({ length: 8 }, (_, i) => {
  const size = 50 + rnd() * 70;
  const n = 5 + Math.floor(rnd() * 3);
  return {
    x: i * 900 + rnd() * 300,
    y: 60 + rnd() * 200,
    puffs: Array.from({ length: n }, (_, j) => {
      const f = j / (n - 1) - 0.5;
      return { dx: f * size * 3, dy: -Math.cos(f * Math.PI) * size * 0.5 - rnd() * size * 0.3, r: size * (0.55 + 0.45 * Math.cos(f * Math.PI)) * (0.8 + rnd() * 0.3) };
    }),
  };
});
const skyline = [];
for (let x = -100; x < WORLD * 0.3 + 1400; ) {
  const w = 30 + rnd() * 60;
  skyline.push({ x, w, h: 30 + rnd() * (rnd() < 0.2 ? 150 : 70) });
  x += w + rnd() * 8;
}
function makeCanopy(seed, n, rx, ry) {
  const r = seeded(seed);
  return Array.from({ length: n }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    return { x: Math.cos(a) * d * rx, y: Math.sin(a) * d * ry, r: 18 + r() * 26 };
  }).sort((a, b) => a.y - b.y);
}
const trees = [2480, 2700, 3020, 3300].map((x, i) => ({ x, big: false, canopy: makeCanopy(i + 11, 22, 95, 48) }));
trees.push({ x: 3930, big: true, canopy: makeCanopy(99, 32, 140, 70) });
const poles = [620, 1320, 2020];
const petals = [];

/* ------------------------------------------------------------- the people */
const LOOKS = {
  dyas: { skin: '#f6cdb2', hair: '#2b2236', hairHi: '#5a4a6e', top: '#3a5aa8', topSh: '#2a3f7c', bottom: '#3b3550', shoe: '#ffffff', eye: '#3a2a50', style: 'spiky' },
  naswa: { skin: '#f8d3bd', hair: '#5b2c3a', hairHi: '#9a4d5e', top: '#f6dbe4', topSh: '#d9aec0', bottom: '#6a4a7a', shoe: '#5a3040', eye: '#5a2a3a', style: 'long', skirt: true },
  mom: { skin: '#f2c6a8', hair: '#3a2a2a', hairHi: '#6a4a4a', top: '#e9a35a', topSh: '#c4813e', bottom: '#7a5a8a', shoe: '#5a4040', eye: '#3a2a2a', style: 'bun', skirt: true },
  sari: { skin: '#f0c2a0', hair: '#8a4a2a', hairHi: '#b8704a', top: '#ffffff', topSh: '#e6dce6', bottom: '#4a7a5a', shoe: '#4a3a30', eye: '#4a2a1a', style: 'bob', skirt: true, apron: '#6fbf8a' },
  raka: { skin: '#e8b48e', hair: '#1e1a28', hairHi: '#4a4060', top: '#ffcf3f', topSh: '#e0a820', bottom: '#3a6ab0', shoe: '#e8304f', eye: '#2a1e2e', style: 'kid', small: 0.78 },
  budi: { skin: '#e6b896', hair: '#d8d4e0', hairHi: '#ffffff', top: '#6a7a5a', topSh: '#4f5c42', bottom: '#4a4038', shoe: '#2a2020', eye: '#2a2020', style: 'old' },
};

const NPCS = [
  { id: 'mom', name: 'Mom', x: 215, look: LOOKS.mom, face: 1, talk: talkMom },
  { id: 'vending', name: 'Vending machine', x: 735, object: true, talk: talkVending },
  { id: 'cat', name: 'Mochi', x: 1060, object: true, talk: talkCat },
  { id: 'sari', name: 'Mrs. Sari', x: 1555, look: LOOKS.sari, face: -1, talk: talkSari },
  { id: 'raka', name: 'Raka', x: 2165, look: LOOKS.raka, face: 1, talk: talkRaka },
  { id: 'budi', name: 'Mr. Budi', x: 2860, look: LOOKS.budi, face: -1, sit: true, talk: talkBudi },
  { id: 'ribbon', name: 'Something red', x: 3195, object: true, talk: talkRibbon },
  { id: 'naswa', name: 'Naswa', x: 4060, look: LOOKS.naswa, face: 1, range: 130, talk: talkNaswa },
];
const npc = (id) => NPCS.find((n) => n.id === id);

/* --------------------------------------------------------- draw: the sky */
function drawSky(q, t) {
  const g = ctx.createLinearGradient(0, 0, 0, baseY());
  g.addColorStop(0, mix('#3d7fe0', '#2f45a8', q));
  g.addColorStop(0.35, mix('#73aef2', '#8a63cf', q));
  g.addColorStop(0.62, mix('#b8dcff', '#ff8aa1', q));
  g.addColorStop(0.82, mix('#ffe6c2', '#ffbd7f', q));
  g.addColorStop(1, mix('#fff2d8', '#ffe9ad', q));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const sunX = W * 0.72;
  const sunY = lerp(H * 0.14, baseY() - 110 * S, q);
  const r = 40 * S;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (q > 0.35) {
    const a = (q - 0.35) * 0.08;
    for (let i = 0; i < 9; i++) {
      const ang = -Math.PI / 2 + (i - 4) * 0.3 + Math.sin(t * 0.2 + i) * 0.03;
      ctx.fillStyle = `rgba(255,220,170,${a})`;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(ang - 0.05) * H, sunY + Math.sin(ang - 0.05) * H);
      ctx.lineTo(sunX + Math.cos(ang + 0.05) * H, sunY + Math.sin(ang + 0.05) * H);
      ctx.fill();
    }
  }
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 7);
  glow.addColorStop(0, `rgba(255,240,200,${0.6 + q * 0.3})`);
  glow.addColorStop(0.15, `rgba(255,${Math.round(lerp(230, 190, q))},150,${0.25 + q * 0.3})`);
  glow.addColorStop(1, 'rgba(255,160,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - r * 7, sunY - r * 7, r * 14, r * 14);
  ctx.restore();
  ctx.fillStyle = mix('#fffbe8', '#fff6dc', q);
  ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill();

  // clouds, barely moving with the camera
  const lit = mix('#ffffff', '#ffd3ad', q), shade = mix('#c3d6f3', '#c86a93', q), high = mix('#ffffff', '#fff3dc', q);
  for (const c of clouds) {
    const x = sx(c.x + t * 6, 0.06);
    const span = (WORLD * 0.06 + viewW() + 900) * S;
    const cx = ((x % span) + span) % span - 300 * S;
    const cy = c.y * S;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - 400 * S, cy - 300 * S, 800 * S, 300 * S); ctx.clip();
    for (const [col, ox, oy, rs] of [[shade, 0, 0, 1], [lit, -0.12, -0.16, 0.86], [high, -0.25, -0.34, 0.5]]) {
      ctx.fillStyle = col;
      for (const p of c.puffs) {
        ctx.beginPath();
        ctx.arc(cx + (p.dx + p.r * ox) * S, cy + (p.dy + p.r * oy) * S, p.r * rs * S, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawFar(q) {
  const hy = sy(70) + camE * S * 0.7; // the horizon only drifts a little as the hill rises
  ctx.fillStyle = mix('#a9c3e6', '#c98fae', q);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 30; x += 30) {
    const wx = x / S + camX * 0.12;
    ctx.lineTo(x, hy - (40 + 30 * Math.sin(wx * 0.004) + 18 * Math.sin(wx * 0.013 + 1)) * S);
  }
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.fillStyle = mix('#8fa8d0', '#9a6c9c', q);
  for (const b of skyline) {
    const x = sx(b.x, 0.25);
    if (x > W || x + b.w * S < 0) continue;
    ctx.fillRect(x, hy - b.h * S, b.w * S, b.h * S + H);
  }
  const haze = ctx.createLinearGradient(0, hy - 60 * S, 0, hy + 10 * S);
  haze.addColorStop(0, mix('#ffffff', '#ffd0a0', q, 0));
  haze.addColorStop(1, mix('#ffffff', '#ffd0a0', q, 0.5));
  ctx.fillStyle = haze;
  ctx.fillRect(0, hy - 60 * S, W, 70 * S);
}

/* ---------------------------------------------------- draw: buildings etc */
function rect(x, h, w, hh, col) {
  ctx.fillStyle = col;
  ctx.fillRect(sx(x), sy(h + hh), w * S, hh * S);
}
function label(text, x, h, size, col, weight = 800) {
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size * S}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx(x), sy(h));
}

function house(x, w, h, wall, wallSh, roof, door) {
  rect(x, 0, w, h, wall);
  rect(x + w * 0.72, 0, w * 0.28, h, wallSh);
  // roof
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(sx(x - 18), sy(h));
  ctx.lineTo(sx(x + w * 0.5), sy(h + 70));
  ctx.lineTo(sx(x + w + 18), sy(h));
  ctx.fill();
  // windows
  for (const wx of [x + 26, x + w - 76]) {
    rect(wx, h - 70, 50, 42, '#fff6e0');
    rect(wx + 4, h - 66, 42, 34, mix('#9fd0ff', '#ffc89a', state.progress));
    rect(wx + 24, h - 66, 2, 34, '#fff6e0');
  }
  if (door) {
    rect(door - 20, 0, 40, 72, '#7a4a3a');
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(sx(door + 12), sy(36), 3 * S, 0, Math.PI * 2); ctx.fill();
  }
}

function shop(x, w, name, wall, awning, signCol, kana) {
  rect(x, 0, w, 170, wall);
  rect(x, 0, w, 10, 'rgba(0,0,0,0.12)');
  rect(x + 14, 0, w - 28, 92, '#3a3050');
  rect(x + 18, 4, w - 36, 84, mix('#bfe2ff', '#ffcf9a', state.progress, 0.85));
  // awning stripes
  const n = Math.max(4, Math.round(w / 36));
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : awning;
    ctx.beginPath();
    const ax = x - 6 + (i * (w + 12)) / n, aw = (w + 12) / n;
    ctx.moveTo(sx(ax), sy(122));
    ctx.lineTo(sx(ax + aw), sy(122));
    ctx.lineTo(sx(ax + aw), sy(100));
    ctx.quadraticCurveTo(sx(ax + aw / 2), sy(92), sx(ax), sy(100));
    ctx.fill();
  }
  // sign
  ctx.fillStyle = signCol;
  const sw = w * 0.74;
  ctx.beginPath();
  ctx.roundRect(sx(x + (w - sw) / 2), sy(162), sw * S, 32 * S, 8 * S);
  ctx.fill();
  label(name, x + w / 2, 146, 17, '#ffffff');
  if (kana) label(kana, x + w / 2, 182, 11, 'rgba(255,255,255,0.85)', 700);
}

function vending(x, q, t) {
  rect(x - 26, 0, 52, 96, '#e8304f');
  rect(x - 26, 0, 6, 96, '#c41f3c');
  rect(x - 20, 34, 40, 56, '#2a2040');
  const cols = ['#ffb3cc', '#9fe0ff', '#ffe08a', '#b7f0a0'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(x - 17 + c * 9.5, 40 + r * 17, 7, 12, cols[(r + c) % 4]);
  rect(x - 18, 8, 22, 12, '#1a1428');
  // glow once the light starts to fade
  if (q > 0.4) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx(x), sy(60), 0, sx(x), sy(60), 90 * S);
    g.addColorStop(0, `rgba(255,240,220,${(q - 0.4) * 0.5})`);
    g.addColorStop(1, 'rgba(255,200,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx(x) - 90 * S, sy(150), 180 * S, 180 * S);
    ctx.restore();
  }
}

function wall(x0, x1, h) {
  rect(x0, 0, x1 - x0, h, '#cfc6c2');
  rect(x0, h - 6, x1 - x0, 6, '#e6dfdb');
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let x = x0; x < x1; x += 40) {
    ctx.beginPath(); ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(h - 6)); ctx.stroke();
  }
}

function pole(x, q) {
  ctx.strokeStyle = mix('#5a5060', '#3a2a44', q);
  ctx.lineWidth = 8 * S;
  ctx.beginPath(); ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(330)); ctx.stroke();
  ctx.lineWidth = 5 * S;
  ctx.beginPath(); ctx.moveTo(sx(x - 40), sy(318)); ctx.lineTo(sx(x + 40), sy(318)); ctx.stroke();
}
function wires(q) {
  ctx.strokeStyle = mix('#4a4458', '#3a2a44', q, 0.9);
  ctx.lineWidth = 1.3;
  const pts = [-200, ...poles, 2500];
  for (const dx of [-36, -12, 12, 36]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      ctx.beginPath();
      ctx.moveTo(sx(a + dx), sy(318));
      ctx.quadraticCurveTo(sx((a + b) / 2 + dx), sy(318 - 60), sx(b + dx), sy(318));
      ctx.stroke();
    }
  }
}

function lamp(x, q) {
  const h = elev(x);
  ctx.strokeStyle = '#4a4458';
  ctx.lineWidth = 5 * S;
  ctx.beginPath(); ctx.moveTo(sx(x), sy(h)); ctx.lineTo(sx(x), sy(h + 170)); ctx.quadraticCurveTo(sx(x), sy(h + 190), sx(x + 22), sy(h + 186)); ctx.stroke();
  const on = smooth(0.6, 0.9, q);
  ctx.fillStyle = on > 0 ? `rgba(255,230,160,${0.4 + on * 0.6})` : '#d8d0c8';
  ctx.beginPath(); ctx.arc(sx(x + 24), sy(h + 180), 7 * S, 0, Math.PI * 2); ctx.fill();
  if (on > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx(x + 24), sy(h + 180), 0, sx(x + 24), sy(h + 180), 70 * S);
    g.addColorStop(0, `rgba(255,220,150,${0.5 * on})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx(x + 24) - 70 * S, sy(h + 180) - 70 * S, 140 * S, 140 * S);
    ctx.restore();
  }
}

function tree(tr, q, t) {
  const h = elev(tr.x);
  const k = tr.big ? 1.25 : 1;
  const sway = Math.sin(t * 0.8 + tr.x) * 3;
  ctx.save();
  ctx.translate(sx(tr.x), sy(h));
  ctx.scale(S * k, S * k);
  ctx.fillStyle = mix('#6a4a44', '#5a3a3e', q);
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.bezierCurveTo(-8, -60, -16, -110, 2, -165);
  ctx.lineTo(10, -162);
  ctx.bezierCurveTo(4, -110, 10, -60, 14, 0);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (const [x2, y2] of [[-70, -170], [72, -175], [-20, -205]]) {
    ctx.beginPath(); ctx.moveTo(2, -115); ctx.quadraticCurveTo(x2 / 2, -140, x2 + sway, y2); ctx.stroke();
  }
  for (const [col, ox, oy, rs] of [[mix('#ea8ab2', '#e07aa6', q), 0, 0, 1], [mix('#ffc6db', '#ffb8d2', q), -0.14, -0.18, 0.82], [mix('#fff0f5', '#ffe4ef', q), -0.28, -0.36, 0.45]]) {
    ctx.fillStyle = col;
    for (const c of tr.canopy) {
      ctx.beginPath();
      ctx.arc(c.x + sway * (1 - c.y / 100) + c.r * ox, c.y - 185 + c.r * oy, c.r * rs, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function bench(x) {
  rect(x - 46, 0, 6, 26, '#4a3a34');
  rect(x + 40, 0, 6, 26, '#4a3a34');
  rect(x - 52, 24, 104, 8, '#a86a44');
  rect(x - 52, 40, 104, 7, '#a86a44');
  rect(x - 52, 52, 104, 7, '#a86a44');
}

function ground(q) {
  // grass everywhere, rising into the hill
  ctx.fillStyle = mix('#7cc06a', '#5d8a52', q);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, sy(elev(x / S + camX)));
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.fillStyle = mix('#5aa050', '#3f6a44', q);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, sy(elev(x / S + camX) - 14));
  ctx.lineTo(W, H);
  ctx.fill();
  // pavement and road through town
  const end = sx(2420);
  if (end > 0) {
    ctx.fillStyle = mix('#e9ddd2', '#e2c3b0', q);
    ctx.fillRect(0, sy(0), end, 16 * S);
    ctx.fillStyle = mix('#c9bab0', '#b89a92', q);
    ctx.fillRect(0, sy(-16), end, 5 * S);
    ctx.fillStyle = mix('#57586a', '#4a3f5a', q);
    ctx.fillRect(0, sy(-21), end, H);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = Math.floor(camX / 120) * 120; x < Math.min(2420, camX + viewW() + 120); x += 120) {
      ctx.fillRect(sx(x), sy(-70), 60 * S, 5 * S);
    }
  }
  // park path
  const p0 = Math.max(0, sx(2420)), p1 = W;
  if (p1 > p0) {
    ctx.fillStyle = mix('#e8cfa0', '#d9a986', q);
    ctx.beginPath();
    ctx.moveTo(p0, sy(elev(p0 / S + camX)));
    for (let x = p0; x <= p1 + 8; x += 8) ctx.lineTo(x, sy(elev(x / S + camX)));
    for (let x = p1 + 8; x >= p0; x -= 8) ctx.lineTo(x, sy(elev(x / S + camX) - 12));
    ctx.fill();
  }
}

/* -------------------------------------------------------- draw: people */
/**
 * A chibi character seen from the side, facing right (mirrored for left).
 * Origin is between the feet on the ground.
 */
function chibi(o) {
  const L = o.look;
  const k = (L.small || 1) * S;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(k * o.face, k);

  // shadow
  ctx.fillStyle = 'rgba(40,20,50,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

  const swing = o.moving ? Math.sin(o.phase) : 0;
  const bob = o.moving ? Math.abs(Math.cos(o.phase)) * 2.5 : Math.sin(o.t * 2) * 0.6;
  const hipY = o.sit ? -30 : -30 - bob;

  const leg = (a, col) => {
    if (o.sit) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(16, hipY); ctx.lineTo(18, -2); ctx.stroke();
      ctx.fillStyle = L.shoe;
      ctx.beginPath(); ctx.ellipse(22, -1, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const fx2 = Math.sin(a) * 28, fy = hipY + Math.cos(a) * 28;
    ctx.strokeStyle = L.skirt ? L.skin : col;
    ctx.lineWidth = L.skirt ? 7 : 10;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(fx2, fy); ctx.stroke();
    ctx.fillStyle = L.shoe;
    ctx.beginPath(); ctx.ellipse(fx2 + 4, fy + 1, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  };
  const arm = (a, col) => {
    const ang = o.sit ? 0.9 : a;
    const hx = Math.sin(ang) * 22 + 2, hy = -56 - bob + Math.cos(ang) * 22;
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -56 - bob); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = L.skin;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill();
    return [hx, hy];
  };

  leg(-swing * 0.45, L.topSh === L.bottom ? L.bottom : shade(L.bottom));
  arm(swing * 0.6, L.topSh);

  // long hair falls behind the body
  const hx = 2, hy = -86 - bob;
  if (L.style === 'long' || L.style === 'bob') {
    const len = L.style === 'long' ? 50 : 22;
    const wv = Math.sin(o.t * 2) * 2 - (o.moving ? 5 : 0);
    ctx.fillStyle = L.hair;
    ctx.beginPath();
    ctx.moveTo(hx - 24, hy - 4);
    ctx.quadraticCurveTo(hx - 30 + wv, hy + len * 0.6, hx - 22 + wv * 1.4, hy + len);
    ctx.lineTo(hx + 4, hy + len - 4);
    ctx.lineTo(hx + 10, hy + 6);
    ctx.fill();
  }

  // body
  if (L.skirt) {
    ctx.fillStyle = L.bottom;
    ctx.beginPath();
    ctx.moveTo(-11, -46 - bob); ctx.lineTo(11, -46 - bob);
    ctx.lineTo(17 + swing * 2, hipY + 6); ctx.lineTo(-17 + swing * 2, hipY + 6);
    ctx.fill();
  } else {
    ctx.fillStyle = L.bottom;
    ctx.fillRect(-10, hipY - 8, 20, 10);
  }
  ctx.fillStyle = L.top;
  ctx.beginPath(); ctx.roundRect(-12, -64 - bob, 24, 26, 7); ctx.fill();
  ctx.fillStyle = L.topSh;
  ctx.beginPath(); ctx.roundRect(-12, -64 - bob, 9, 26, [7, 0, 0, 7]); ctx.fill();
  if (L.apron) {
    ctx.fillStyle = L.apron;
    ctx.beginPath(); ctx.roundRect(-2, -58 - bob, 13, 30, 3); ctx.fill();
  }
  if (!o.sit) leg(swing * 0.45, L.bottom);
  else leg(0, L.bottom);

  // neck + head
  ctx.fillStyle = L.skin;
  ctx.fillRect(-3, -68 - bob, 7, 6);
  ctx.beginPath(); ctx.arc(hx, hy, 24, 0, Math.PI * 2); ctx.fill();

  // face
  const blink = (Math.sin(o.t * 1.3 + o.seed) > 0.985);
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  ctx.beginPath(); ctx.ellipse(hx + 12, hy + 9, 4.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  if (blink) {
    ctx.strokeStyle = L.eye; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx + 11, hy + 1, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ctx.fillStyle = L.eye;
    ctx.beginPath(); ctx.ellipse(hx + 11, hy + 1, 3.6, 5.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hx + 10, hy - 1.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 12.4, hy + 3, 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = L.eye;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (o.talking && Math.sin(o.t * 18) > 0) {
    ctx.fillStyle = '#9a3a4a';
    ctx.ellipse(hx + 18, hy + 12, 2.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.arc(hx + 17, hy + 10, 2.4, 0.3, Math.PI - 0.6);
    ctx.stroke();
  }
  if (L.style === 'old') {
    ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(hx + 11, hy + 1, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.ellipse(hx + 16, hy + 8, 6, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
  }

  // hair on top
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  if (L.style === 'old') {
    ctx.ellipse(hx - 14, hy + 2, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a6a5a'; // flat cap
    ctx.beginPath();
    ctx.arc(hx, hy - 4, 25, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(hx + 32, hy - 6);
    ctx.lineTo(hx + 22, hy - 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.moveTo(hx - 25, hy + 8);
    ctx.arc(hx, hy - 1, 26, Math.PI * 0.96, Math.PI * 1.98);
    const bangs = [[24, 2], [19, -6], [15, 5], [9, -8], [3, 2], [-4, -9], [-12, 3], [-19, -2], [-23, 12]];
    for (const [bx, by] of bangs) ctx.lineTo(hx + bx, hy + by);
    ctx.closePath();
    ctx.fill();
    if (L.style === 'spiky') {
      const w = Math.sin(o.t * 3) * 1.5;
      ctx.beginPath();
      ctx.moveTo(hx - 24, hy - 6); ctx.lineTo(hx - 38 + w, hy - 4); ctx.lineTo(hx - 25, hy + 8);
      ctx.moveTo(hx - 20, hy - 16); ctx.lineTo(hx - 33 + w, hy - 27); ctx.lineTo(hx - 10, hy - 24);
      ctx.moveTo(hx - 6, hy - 24); ctx.lineTo(hx - 6 + w, hy - 40); ctx.lineTo(hx + 8, hy - 26);
      ctx.moveTo(hx + 8, hy - 24); ctx.lineTo(hx + 22 + w, hy - 33); ctx.lineTo(hx + 20, hy - 16);
      ctx.fill();
    }
    if (L.style === 'bun') {
      ctx.beginPath(); ctx.arc(hx - 20, hy - 18, 11, 0, Math.PI * 2); ctx.fill();
    }
    if (L.style === 'kid') {
      ctx.fillStyle = '#e8304f'; // cap worn backwards
      ctx.beginPath();
      ctx.arc(hx, hy - 4, 25, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(hx - 22, hy - 6);
      ctx.lineTo(hx - 38, hy - 2);
      ctx.lineTo(hx - 24, hy - 12);
      ctx.fill();
    }
    ctx.strokeStyle = L.hairHi;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx - 2, hy - 4, 16, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
  }
  // ear (short hair only)
  if (L.style === 'spiky' || L.style === 'kid' || L.style === 'old' || L.style === 'bun') {
    ctx.fillStyle = L.skin;
    ctx.beginPath(); ctx.ellipse(hx - 5, hy + 4, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (o.ribbon) {
    ctx.fillStyle = '#e8304f';
    ctx.beginPath();
    ctx.moveTo(hx - 22, hy - 8); ctx.lineTo(hx - 34, hy - 16); ctx.lineTo(hx - 32, hy - 2); ctx.closePath();
    ctx.moveTo(hx - 22, hy - 8); ctx.lineTo(hx - 12, hy - 20); ctx.lineTo(hx - 10, hy - 6); ctx.closePath();
    ctx.fill();
  }

  // front arm
  arm(-swing * 0.6, L.top);
  ctx.restore();
}

function shade(hexCol) {
  const [r, g, b] = hex(hexCol);
  return `rgb(${r * 0.75 | 0},${g * 0.75 | 0},${b * 0.75 | 0})`;
}

function cat(x, h, t, awake) {
  ctx.save();
  ctx.translate(sx(x), sy(h));
  ctx.scale(S, S);
  const tail = Math.sin(t * 2.2) * 0.5;
  ctx.strokeStyle = '#f0a050';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(-30, -10 + tail * 10, -26 + tail * 8, -30); ctx.stroke();
  ctx.fillStyle = '#f0a050';
  ctx.beginPath(); ctx.ellipse(0, -10, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -22, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -29); ctx.lineTo(8, -40); ctx.lineTo(14, -32); ctx.moveTo(16, -32); ctx.lineTo(22, -40); ctx.lineTo(23, -28); ctx.fill();
  ctx.strokeStyle = '#d07a30'; ctx.lineWidth = 2;
  for (const dx of [-8, -2, 4]) { ctx.beginPath(); ctx.moveTo(dx, -20); ctx.lineTo(dx + 2, -12); ctx.stroke(); }
  ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 1.6;
  if (awake) {
    ctx.fillStyle = '#3a2a30';
    ctx.beginPath(); ctx.ellipse(13, -23, 1.6, 2.6, 0, 0, Math.PI * 2); ctx.ellipse(20, -23, 1.6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(13, -24, 2.5, 0.2, Math.PI - 0.2); ctx.moveTo(22.5, -24); ctx.arc(20, -24, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
}

function kite(x, t) {
  const kx = sx(x + 130 + Math.sin(t * 0.7) * 20), ky = sy(330 + Math.sin(t * 1.1) * 18);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx(x + 18), sy(50)); ctx.quadraticCurveTo(sx(x + 60), sy(150), kx, ky); ctx.stroke();
  ctx.save();
  ctx.translate(kx, ky);
  ctx.rotate(Math.sin(t * 1.3) * 0.2);
  ctx.scale(S, S);
  ctx.fillStyle = '#ff5f96';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(16, 0); ctx.lineTo(0, 30); ctx.lineTo(-16, 0); ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(16, 0); ctx.lineTo(0, 0); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 30);
  for (let i = 1; i < 6; i++) ctx.lineTo(Math.sin(t * 4 + i) * 6, 30 + i * 9);
  ctx.stroke();
  ctx.restore();
}

function ribbonItem(x, t) {
  const h = elev(x) + 34;
  ctx.save();
  ctx.translate(sx(x), sy(h));
  ctx.scale(S, S);
  // a little bush it is caught on
  ctx.fillStyle = '#4f8a46';
  ctx.beginPath(); ctx.arc(-10, 30, 18, 0, Math.PI * 2); ctx.arc(12, 30, 20, 0, Math.PI * 2); ctx.arc(0, 18, 18, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(Math.sin(t * 2) * 0.15);
  ctx.fillStyle = '#e8304f';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-11, -7); ctx.lineTo(-10, 6); ctx.closePath();
  ctx.moveTo(0, 0); ctx.lineTo(11, -7); ctx.lineTo(10, 6); ctx.closePath();
  ctx.fill();
  ctx.restore();
  // sparkle
  const a = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  const px = sx(x + 14), py = sy(h + 12), L = 8 * S * a;
  ctx.beginPath(); ctx.moveTo(px - L, py); ctx.lineTo(px + L, py); ctx.moveTo(px, py - L); ctx.lineTo(px, py + L); ctx.stroke();
}

/* ---------------------------------------------------------- the prompt */
let near = null;
function findNear() {
  let best = null, bd = Infinity;
  for (const n of NPCS) {
    if (n.id === 'ribbon' && state.inv.ribbon) continue;
    const d = Math.abs(n.x - state.x);
    if (d < (n.range || 80) && d < bd) { bd = d; best = n; }
  }
  return best;
}
function promptBubble(n, t) {
  const top = n.id === 'cat' ? 100 : n.id === 'vending' ? 112 : n.id === 'ribbon' ? 80 : n.sit ? 140 : n.look && n.look.small ? 110 : 132;
  const x = sx(n.x), y = sy(elev(n.x) + top) + Math.sin(t * 4) * 3;
  const text = touch ? 'Talk' : 'E  Talk';
  ctx.font = `800 ${13 * S}px ${FONT}`;
  const w = ctx.measureText(text).width + 22 * S;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 26 * S, w, 26 * S, 13 * S);
  ctx.moveTo(x - 6 * S, y); ctx.lineTo(x + 6 * S, y); ctx.lineTo(x, y + 7 * S);
  ctx.fill();
  ctx.fillStyle = '#e8417a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - 13 * S);
}
function newMark(n, t) {
  if (state.talked.has(n.id) || n.object) return;
  const top = n.sit ? 140 : n.look && n.look.small ? 110 : 132;
  const x = sx(n.x), y = sy(elev(n.x) + top) + Math.sin(t * 5) * 3;
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.font = `800 ${26 * S}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText('!', x, y);
  ctx.fillText('!', x, y);
}

/* ------------------------------------------------------------- dialogue */
const dlg = document.getElementById('dialog');
const dlgName = dlg.querySelector('.dialog-name');
const dlgText = dlg.querySelector('.dialog-text');
const dlgChoices = dlg.querySelector('.dialog-choices');
let advance = null; // called when the player presses next
let speaking = null; // id of whoever is talking (for mouth animation)

const WHO = { Dyas: 'dyas', Naswa: 'naswa' };
function say(who, text) {
  return new Promise((resolve) => {
    dlg.hidden = false;
    dlg.classList.remove('done');
    dlg.classList.toggle('narr', !who);
    dlgName.textContent = who || '';
    dlgName.dataset.who = WHO[who] || 'other';
    dlgChoices.innerHTML = '';
    speaking = who;
    let i = 0;
    dlgText.textContent = '';
    const pitch = who === 'Naswa' ? 1.4 : who === 'Dyas' ? 0 : who === 'Raka' ? 2 : 0.7;
    const timer = setInterval(() => {
      i++;
      dlgText.textContent = text.slice(0, i);
      if (i % 2 === 0 && who) song.blip(pitch);
      if (i >= text.length) finish();
    }, reduced ? 5 : 26);
    function finish() {
      clearInterval(timer);
      dlgText.textContent = text;
      dlg.classList.add('done');
      speaking = null;
      advance = () => { advance = null; resolve(); };
    }
    advance = () => finish();
  });
}
function choose(options) {
  return new Promise((resolve) => {
    dlg.classList.remove('done');
    advance = null;
    dlgChoices.innerHTML = '';
    options.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span>${i + 1}</span>`;
      b.append(label);
      b.addEventListener('click', (e) => { e.stopPropagation(); pick(i); });
      dlgChoices.append(b);
    });
    dlgChoices.firstChild.focus({ preventScroll: true });
    function pick(i) {
      window.removeEventListener('keydown', onKey, true);
      dlgChoices.innerHTML = '';
      resolve(i);
    }
    function onKey(e) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) { e.preventDefault(); e.stopPropagation(); pick(n - 1); }
    }
    window.addEventListener('keydown', onKey, true);
  });
}
function closeDialog() {
  dlg.hidden = true;
  speaking = null;
}
dlg.addEventListener('click', () => advance && advance());

async function conversation(n) {
  if (state.busy || state.ended) return;
  state.busy = true;
  state.moving = false;
  if (!n.object) state.face = n.x > state.x ? 1 : -1;
  await n.talk();
  state.talked.add(n.id);
  closeDialog();
  state.busy = false;
  updateQuest();
}

/* ---------------------------------------------------------- items & HUD */
const ITEMS = {
  flower: { name: 'Pink tulips', svg: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 22V11M12 15c-3-1-5-3-5-6M12 15c3-1 5-3 5-6" stroke="#4f8a46" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8 4v5c0 2 2 3 4 3s4-1 4-3V4l-2 2-2-3-2 3z" fill="#ff5f96"/></svg>' },
  milk: { name: 'Strawberry milk ×2', svg: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M7 7l3-4h4l3 4v14H7z" fill="#ffd1e0"/><path d="M7 11h10v5H7z" fill="#ff6f9f"/><path d="M10 3h4l3 4H7z" fill="#fff"/></svg>' },
  ribbon: { name: 'Naswa’s red ribbon', svg: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 12L4 7v10zM12 12l8-5v10z" fill="#e8304f"/><circle cx="12" cy="12" r="2.5" fill="#b81f3a"/><path d="M11 13l-3 8M13 13l3 8" stroke="#e8304f" stroke-width="2.2" stroke-linecap="round"/></svg>' },
};
const invEl = document.getElementById('inv');
const toastEl = document.getElementById('toast');
let toastTimer;
function give(item) {
  if (state.inv[item]) return;
  state.inv[item] = true;
  const li = document.createElement('li');
  li.innerHTML = ITEMS[item].svg;
  li.title = ITEMS[item].name;
  li.setAttribute('aria-label', ITEMS[item].name);
  invEl.append(li);
  toastEl.textContent = `Got: ${ITEMS[item].name}!`;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  song.pickup();
  fx.burst(sx(state.x), sy(elev(state.x) + 130), reduced ? 6 : 12);
}
const gifts = () => Object.values(state.inv).filter(Boolean).length;
const questEl = document.getElementById('quest');
function updateQuest() {
  if (state.x > HILL_START) questEl.textContent = 'Naswa is at the top of the hill';
  else if (gifts() === 0) questEl.textContent = 'Meet Naswa on the hill before sunset →';
  else questEl.textContent = `Gifts for Naswa: ${gifts()}/3 · head for the hill →`;
}

/* ------------------------------------------------------------- the talks */
async function talkMom() {
  if (state.talked.has('mom')) {
    await say('Mom', 'Still here? The sun won’t wait for you, Dyas!');
    return;
  }
  await say('Mom', 'Going to see Naswa again? Your face is all red, Dyas.');
  const c = await choose(['It’s just the sunset!', '…Is it that obvious?']);
  if (c === 0) await say('Mom', 'The sun hasn’t even set yet. Nice try.');
  else await say('Mom', 'Only to everyone in the neighbourhood. Go on, then.');
  await say('Mom', 'And don’t go empty-handed. Mrs. Sari’s flower shop is on the way.');
}

async function talkVending() {
  if (state.inv.milk) {
    await say('', 'You already have two strawberry milks. A third would be weird.');
    return;
  }
  await say('', 'A vending machine. Strawberry milk: Naswa’s favourite.');
  const c = await choose(['Buy two — one for each of us', 'Leave it']);
  if (c === 0) {
    await say('', '*clunk* *clunk*');
    give('milk');
    await say('Dyas', 'Still cold. Perfect.');
  } else {
    await say('Dyas', 'Hmm… maybe later.');
  }
}

async function talkCat() {
  catAwake = true;
  if (state.inv.ribbon) {
    await say('Mochi', 'Mrrrp. (Mochi looks very pleased with you.)');
  } else if (state.talked.has('cat')) {
    await say('Mochi', 'Mrow. (Mochi stares toward the park again. Insistently.)');
  } else {
    await say('Mochi', 'Mrow.');
    await say('Dyas', 'Hey, Mochi. Seen Naswa today?');
    await say('Mochi', 'Mrrow! (Mochi’s tail swishes. It keeps looking toward the park…)');
    await say('Dyas', 'Something over there? Okay, okay, I’ll look.');
  }
  catAwake = false;
}

async function talkSari() {
  if (state.inv.flower) {
    await say('Mrs. Sari', 'Go on, before they wilt! And before you do.');
    return;
  }
  await say('Mrs. Sari', 'Welcome to Hana Flowers! Oh — it’s Dyas. Flowers for someone special?');
  const c = await choose(['Yes. For Naswa.', 'N-no! I’m just looking…']);
  if (c === 0) {
    await say('Mrs. Sari', 'Then these: pink tulips. They mean “I’m falling for you.”');
    await say('Mrs. Sari', 'No charge. I don’t take money for young love.');
  } else {
    await say('Mrs. Sari', 'Just looking. With a red face. At sunset. Mm-hm.');
    await say('Mrs. Sari', 'Take these anyway. Naswa always stops to smell the pink ones.');
  }
  give('flower');
  await say('Dyas', 'Thank you, Mrs. Sari!');
}

async function talkRaka() {
  await say('Raka', 'Dyas-kak! Look how high my kite is! Higher than the wires!');
  const c = await choose(['That’s amazing!', 'Have you seen Naswa?']);
  if (c === 0) {
    await say('Raka', 'I know, right? I’m gonna fly it to the moon!');
  } else {
    await say('Raka', 'Naswa-kak? She walked up the hill ages ago.');
    await say('Raka', 'She was smiling at nothing. Like you’re doing right now. Weird.');
  }
}

async function talkBudi() {
  if (state.talked.has('budi')) {
    await say('Mr. Budi', 'Still here, young man? Go on. Hold her hand.');
    return;
  }
  await say('Mr. Budi', 'Sixty years ago, I walked this same path to meet my wife.');
  await say('Mr. Budi', 'She was late. I didn’t mind. I’d have waited all night.');
  const c = await choose(['Any advice for me?', 'That’s really sweet, sir.']);
  if (c === 0) {
    await say('Mr. Budi', 'Say what you feel before the sun sets. And if words are hard…');
    await say('Mr. Budi', '…hold her hand. Words are hard. Hands are easy.');
  } else {
    await say('Mr. Budi', 'Ha! It was. It still is. Now don’t keep yours waiting.');
  }
}

async function talkRibbon() {
  await say('', 'Something red is caught in the bush, fluttering in the wind.');
  await say('Dyas', 'A ribbon…? Wait. This is Naswa’s! She was looking for it all week.');
  give('ribbon');
  await say('Dyas', 'Good job, Mochi.');
}

async function talkNaswa() {
  naswaTurn = true;
  await say('Naswa', 'Dyas! You’re late…');
  await say('Naswa', '…just kidding. You’re right on time.');
  if (state.inv.ribbon) {
    await say('Dyas', 'I found something in the park.');
    await say('Naswa', 'My ribbon! I thought it was gone forever… Thank you, Dyas.');
    naswaRibbon = true;
    await say('', 'She ties it back into her hair, and smiles.');
  }
  if (state.inv.flower) {
    await say('Dyas', 'And… these are for you.');
    await say('Naswa', 'Pink tulips? Do you know what they mean?');
    const c = await choose(['Yes.', 'No idea!']);
    if (c === 0) await say('Naswa', '…Then I’ll keep them forever.');
    else await say('Naswa', 'Liar. Your ears just turned red.');
  }
  if (state.inv.milk) {
    await say('Naswa', 'Strawberry milk! You remembered.');
  }
  if (gifts() === 0) {
    await say('Naswa', 'You came empty-handed? …Good. You’re the only thing I wanted to see.');
  }
  await say('Naswa', 'Sit with me? The sky is about to do the thing.');
  const c = await choose(['Sit next to her', 'Sit next to her (but closer)']);
  if (c === 1) await say('Naswa', 'Hehe. Hi.');
  closeDialog();
  toEnding();
}

/* ------------------------------------------------------------- ending */
let naswaTurn = false, naswaRibbon = false, catAwake = false;
const fade = document.getElementById('fade');
function toEnding() {
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  setTimeout(() => {
    document.getElementById('hud').hidden = true;
    document.getElementById('pad').hidden = true;
    stopLoop = true;
    startEnding({ canvas, fx, song, gifts: { ...state.inv } });
    fade.classList.remove('on');
  }, 1400);
}

/* ---------------------------------------------------------------- input */
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (!state.started || state.ended) return;
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
  if (k === 'e' || k === ' ' || k === 'enter') {
    if (e.target.tagName === 'BUTTON' && dlgChoices.contains(e.target)) return; // let the choice click
    e.preventDefault();
    if (state.busy) { advance && advance(); return; }
    const n = findNear();
    if (n) conversation(n);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

const hold = { left: false, right: false };
for (const [id, dir] of [['btn-left', 'left'], ['btn-right', 'right']]) {
  const b = document.getElementById(id);
  const on = (e) => { e.preventDefault(); hold[dir] = true; b.classList.add('held'); };
  const off = () => { hold[dir] = false; b.classList.remove('held'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  b.addEventListener('pointercancel', off);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
const talkBtn = document.getElementById('btn-talk');
talkBtn.addEventListener('click', () => {
  if (state.busy) { advance && advance(); return; }
  const n = findNear();
  if (n) conversation(n);
});
canvas.addEventListener('pointerdown', (e) => {
  if (!state.started || state.ended) return;
  if (state.busy) { advance && advance(); return; }
  // tapping someone nearby talks to them
  const n = findNear();
  if (n && Math.abs(e.clientX - sx(n.x)) < 90 * S) conversation(n);
});

/* ----------------------------------------------------------------- loop */
let last = performance.now();
let stopLoop = false;
function frame(now) {
  if (stopLoop) return;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const t = now / 1000;

  // movement
  const left = keys.has('arrowleft') || keys.has('a') || hold.left;
  const right = keys.has('arrowright') || keys.has('d') || hold.right;
  const dir = state.busy || !state.started ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
  state.moving = dir !== 0;
  if (dir) {
    state.face = dir;
    const slope = elev(state.x + dir * 4) > elev(state.x) ? 0.8 : 1;
    state.x = clamp(state.x + dir * 175 * slope * dt, 60, 4010);
    state.phase += dt * 11;
  }
  state.progress = Math.max(state.progress, clamp((state.x - 250) / 3700));
  const q = state.progress;

  const vw = viewW();
  camX += (clamp(state.x - vw * 0.42, 0, WORLD - vw) - camX) * Math.min(1, dt * 5);
  camE += (elev(state.x) * 0.85 - camE) * Math.min(1, dt * 4);

  near = state.busy ? null : findNear();
  document.body.classList.toggle('talking', state.busy);
  if (talkBtn.disabled === !!(near || state.busy)) talkBtn.disabled = !(near || state.busy);
  if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) updateQuest();

  ctx.clearRect(0, 0, W, H);
  drawSky(q, t);
  drawFar(q);

  // the street
  house(30, 270, 150, '#fff3df', '#ecd9bf', '#c4574a', 215);
  house(330, 230, 130, '#dff0ff', '#c4dcf0', '#4a6aa8');
  wall(880, 1220, 46);
  shop(1400, 300, 'Hana Flowers', '#fff0f5', '#ff7aa8', '#e8417a', '花屋');
  shop(1730, 250, 'Bakery', '#fff6e6', '#f0a050', '#c4813e', 'パン');
  shop(2010, 280, 'Mart 24', '#eef6ff', '#4a8ae0', '#3a6ab0', 'コンビニ');
  // flower pots in front of the shop
  for (let i = 0; i < 4; i++) {
    const x = 1420 + i * 26;
    rect(x, 0, 18, 16, '#c4814e');
    ctx.fillStyle = ['#ff5f96', '#ffd23f', '#ff9fc2', '#ffffff'][i];
    ctx.beginPath(); ctx.arc(sx(x + 9), sy(22), 8 * S, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of poles) pole(p, q);
  wires(q);
  vending(735, q, t);
  // park
  ctx.fillStyle = '#7a5a4a';
  rect(2430, 0, 8, 90, '#7a5a4a');
  ctx.beginPath(); ctx.roundRect(sx(2390), sy(130), 100 * S, 40 * S, 8 * S); ctx.fill();
  label('Sakura Park', 2440, 110, 13, '#ffe4ef');
  for (const tr of trees) tree(tr, q, t);
  bench(2850);
  lamp(3560, q);
  lamp(3820, q);
  if (!state.inv.ribbon) ribbonItem(3195, t);
  // railing at the top of the hill
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * S;
  for (const x of [4140, 4180, 4220, 4260]) { ctx.beginPath(); ctx.moveTo(sx(x), sy(HILL_H)); ctx.lineTo(sx(x), sy(HILL_H + 36)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(sx(4130), sy(HILL_H + 34)); ctx.lineTo(sx(4290), sy(HILL_H + 34)); ctx.stroke();

  ground(q);

  // people
  kite(2165, t);
  cat(1060, 46, t, catAwake || near?.id === 'cat');
  for (const n of NPCS) {
    if (n.object) continue;
    let face = n.face;
    if (n.id === 'naswa') face = naswaTurn || Math.abs(state.x - n.x) < 220 ? -1 : 1;
    else if (Math.abs(state.x - n.x) < 220) face = state.x < n.x ? -1 : 1;
    chibi({
      x: sx(n.x), y: sy(elev(n.x) + (n.sit ? 0 : 0)), face, look: n.look, t, phase: 0, moving: false,
      sit: n.sit, talking: speaking === n.name, seed: n.x, ribbon: n.id === 'naswa' && naswaRibbon,
    });
  }
  chibi({ x: sx(state.x), y: sy(elev(state.x)), face: state.face, look: LOOKS.dyas, t, phase: state.phase, moving: state.moving, talking: speaking === 'Dyas', seed: 3 });

  for (const n of NPCS) newMark(n, t);
  if (near && !state.busy) promptBubble(near, t);

  // falling petals in the park
  const parkness = smooth(2200, 2600, camX + vw / 2);
  const want = Math.round((reduced ? 15 : 60) * parkness);
  while (petals.length < want) petals.push({ x: Math.random() * W, y: -10 - Math.random() * H * 0.5, vx: 20 + Math.random() * 30, vy: 20 + Math.random() * 25, r: (3 + Math.random() * 3) * S, rot: Math.random() * 6, spin: Math.random() * 4 - 2, flip: Math.random() * 6 });
  ctx.fillStyle = 'rgba(255,198,218,0.9)';
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.x += (p.vx + Math.sin(t + i) * 15) * dt; p.y += p.vy * dt; p.rot += p.spin * dt; p.flip += dt * 3;
    if (p.y > H || p.x > W + 20) { if (petals.length > want) { petals.splice(i, 1); continue; } p.x = Math.random() * W - 40; p.y = -10; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.flip), 1);
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // the warm wash of late afternoon turning to sunset
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(255,${Math.round(lerp(200, 120, q))},90,${0.15 + q * 0.35})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  fx.update(dt, state.started);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- start */
const track = new Audio(MUSIC_URL);
track.loop = true;
track.volume = 0;
let muted = false;
function fadeTrack(to, ms = 2500) {
  const from = track.volume, start = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - start) / ms);
    track.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

document.getElementById('start').addEventListener('click', async (e) => {
  if (state.started) return;
  e.currentTarget.blur(); // so Space/Enter later don't press it again
  document.getElementById('intro').classList.add('gone');
  document.getElementById('sound').hidden = false;
  document.getElementById('hud').hidden = false;
  if (touch) document.getElementById('pad').hidden = false;
  song.start();
  track.play().then(() => fadeTrack(0.7)).catch(() => {
    song.music = true; // no recording: play the built-in song
    song.ctx && song.ctx.close();
    song.ctx = null;
    song.start();
  });
  state.started = true;
  updateQuest();
  state.busy = true;
  await new Promise((r) => setTimeout(r, 900));
  await say('', 'Late afternoon. Dyas’ phone buzzes. A message from Naswa:');
  await say('Naswa', '“Meet me on the hill before the sun goes down. Don’t be late! ♡”');
  await say('Dyas', 'Before sunset… I should bring her something on the way.');
  closeDialog();
  state.busy = false;
});

const soundBtn = document.getElementById('sound');
soundBtn.addEventListener('click', () => {
  const on = soundBtn.getAttribute('aria-pressed') === 'true';
  soundBtn.setAttribute('aria-pressed', String(!on));
  soundBtn.setAttribute('aria-label', on ? 'Play music' : 'Mute music');
  muted = on;
  song.setMuted(on);
  fadeTrack(on ? 0 : 0.7, 400);
});
document.getElementById('replay').addEventListener('click', () => location.reload());

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
