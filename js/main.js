/**
 * Get a Crush Before College
 *
 * Five days until graduation. The squad made a pact: everyone gets a crush
 * before college, or treats everyone to bakso. Pick which friend you are,
 * walk around school, talk to your friends for advice and to four classmates
 * who might become your crush. Every talk with a crush uses up a lunch break
 * or an afternoon. On the last afternoon you confess under the cherry tree.
 *
 * Everything is drawn on a 2D canvas in a cel-shaded anime style.
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
const $ = (id) => document.getElementById(id);

let W = 0, H = 0, S = 1, DPR = 1;

/* ----------------------------------------------------------------- helpers */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hexCache = new Map();
function hex(h) {
  if (!hexCache.has(h)) {
    const n = parseInt(h.slice(1), 16);
    hexCache.set(h, [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  return hexCache.get(h);
}
/** blend a midday colour toward its late-afternoon colour */
function mix(a, b, t, alpha = 1) {
  const A = hex(a), B = hex(b);
  return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${alpha})`;
}
function darker(h, k = 0.78) {
  const [r, g, b] = hex(h);
  return `rgb(${(r * k) | 0},${(g * k) | 0},${(b * k) | 0})`;
}
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FONT = '"M PLUS Rounded 1c", system-ui, sans-serif';

/* ---------------------------------------------------------------- the cast */
const SHIRT = '#ffffff', SHIRT_SH = '#dfe3ee', PANTS = '#5a5f70', SKIRT = '#5a5f78';
const look = (o) => ({ skin: '#f2c6a8', hairHi: '#5a4a6e', top: SHIRT, topSh: SHIRT_SH, bottom: PANTS, shoe: '#2a2a38', eye: '#2a1e2e', ...o });

/** the squad: whoever you pick is you, the rest are around school */
const FRIENDS = [
  { name: 'Ghanim', role: 'the planner', look: look({ hair: '#1e1a28', style: 'parted', glasses: true, skin: '#f0c4a4' }),
    line: 'I made a spreadsheet for the pact. You are currently in last place.',
    hint: ['alya', 'Data point: Alya hates flattery. Be useful, not smooth.'] },
  { name: 'Ghiffy', role: 'the hype man', look: look({ hair: '#5a3a2a', hairHi: '#8a5a40', style: 'spiky', top: '#e8504f', topSh: '#c03a3a', skin: '#e8b48e' }),
    line: 'LET’S GOOO! Today’s the day, I can feel it in my bones!',
    hint: ['kirana', 'Kirana respects people who never give up. Don’t quit, bro!'] },
  { name: 'Lindan', role: 'the calm one', look: look({ hair: '#2a2230', style: 'short', top: '#6a9a7a', topSh: '#4f7a5f', skin: '#f6cdb2' }),
    line: 'Relax. A crush is like an exam. Show up, be honest, don’t cheat.',
    hint: ['alya', 'Alya acts tough, but she’s scared of leaving home. Just listen to her.'] },
  { name: 'Arkan', role: 'the athlete', look: look({ hair: '#141018', style: 'buzz', top: '#2f7fd8', topSh: '#2160aa', skin: '#d9a07a' }),
    line: 'Want to run laps with me? …No? Your loss. Cardio is love.',
    hint: ['kirana', 'Kirana hurt her knee before the last meet. Be kind, not a coach.'] },
  { name: 'Dyas', role: 'the romantic', look: look({ hair: '#2b2236', style: 'spiky', top: '#3a5aa8', topSh: '#2a3f7c', skin: '#f6cdb2' }),
    line: 'Find someone to watch the sunset with. Trust me. It works.',
    hint: ['sekar', 'Sekar likes quiet. Don’t try to fill the silence with jokes.'] },
  { name: 'Zubair', role: 'the gamer', look: look({ hair: '#1e1a28', style: 'messy', headphones: '#ff5f96', top: '#7a7f90', topSh: '#5f6474', skin: '#e8b48e' }),
    line: 'Romance is a side quest with no save points. Choose wisely.',
    hint: ['rania', 'Rania wants honest reviews of her food. Like a game critic, but nicer.'] },
  { name: 'Ahza', role: 'the photographer', look: look({ hair: '#3a2a2a', hairHi: '#6a4a44', style: 'curly', camera: true, skin: '#f0c4a4' }),
    line: 'Smile! …That’s the most nervous smile I’ve ever photographed.',
    hint: ['sekar', 'Sekar is drawing everyone in our class. If she asks to draw you, say yes.'] },
  { name: 'Aboi', role: 'the joker', look: look({ hair: '#1e1a28', style: 'cap', cap: '#ffcf3f', top: '#f08a3a', topSh: '#c86a28', skin: '#d9a07a' }),
    line: 'I confessed to three people today. One of them was the vending machine.',
    hint: ['rania', 'Whatever you do, don’t insult Rania’s bakso. She has a ladle.'] },
  { name: 'Qai', role: 'the sleepy one', look: look({ hair: '#2a2236', style: 'messy', sleepy: true, top: '#7a5bb5', topSh: '#5f4590', skin: '#f6cdb2' }),
    line: 'Zzz… huh? Graduation? Wake me up when it’s college.',
    hint: ['kirana', '…Kirana got some big news… mumble… scholarship… zzz…'] },
  { name: 'Hamzah', role: 'the foodie', look: look({ hair: '#1e1a28', style: 'short', top: '#4f8a46', topSh: '#3a6a34', skin: '#e8b48e' }),
    line: 'Rania’s cheese bakso is a masterpiece. Tell her I said so.',
    hint: ['rania', 'If Rania makes you a bento, that means something. Trust me. I know bentos.'] },
  { name: 'Nizam', role: 'the musician', look: look({ hair: '#2a2230', style: 'beanie', beanie: '#3a3050', top: '#2a2a38', topSh: '#1c1c28', skin: '#f0c4a4' }),
    line: 'I’m writing a song for graduation. It’s in D major. D for Dramatic.',
    hint: ['alya', 'Alya feeds a stray cat behind the library. If you find out, keep it secret.'] },
];

/** the four classmates who might become your crush */
const CRUSHES = {
  alya: { id: 'alya', name: 'Alya', role: 'class president', x: 1820, look: look({ hair: '#1e1a28', hairHi: '#4a4060', style: 'ponytail', glasses: true, bottom: SKIRT, skirt: true, tie: '#e8304f', skin: '#f6cdb2' }), end: { girlHair: '#1e1a28', girlHairHi: '#4a4060', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 40 } },
  kirana: { id: 'kirana', name: 'Kirana', role: 'track team ace', x: 2990, look: look({ hair: '#3a2420', hairHi: '#6a4438', style: 'bob', top: '#ff8a3a', topSh: '#d86a20', bottom: '#2a2a38', skin: '#d9a07a' }), end: { girlHair: '#3a2420', girlHairHi: '#6a4438', cardigan: '#ff8a3a', cardiganSh: '#d86a20', hairLen: 14 } },
  sekar: { id: 'sekar', name: 'Sekar', role: 'quiet artist', x: 3720, look: look({ hair: '#5b3428', hairHi: '#8a5a44', style: 'braid', top: '#9fc4a0', topSh: '#7aa47c', bottom: SKIRT, skirt: true, skin: '#f0c4a4' }), end: { girlHair: '#5b3428', girlHairHi: '#8a5a44', cardigan: '#9fc4a0', cardiganSh: '#7aa47c', hairLen: 58 } },
  rania: { id: 'rania', name: 'Rania', role: 'canteen chef', x: 2440, look: look({ hair: '#2a1a1e', hairHi: '#5a3a44', style: 'bun', apron: '#ff9fc2', bottom: SKIRT, skirt: true, skin: '#e8b48e' }), end: { girlHair: '#2a1a1e', girlHairHi: '#5a3a44', cardigan: '#ff9fc2', cardiganSh: '#e07aa6', hairLen: 26 } },
};

/* ----------------------------------------------------------------- state */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = ['Lunch break', 'After school'];
const state = {
  me: null, // the friend you play
  x: 400, face: 1, phase: 0, moving: false,
  day: 0, slot: 0,
  aff: { alya: 0, kirana: 0, sekar: 0, rania: 0 },
  scene: { alya: 0, kirana: 0, sekar: 0, rania: 0 }, // scenes seen
  seenDay: { alya: -1, kirana: -1, sekar: -1, rania: -1 },
  met: new Set(),
  talkedFriend: new Set(),
  busy: true, started: false, ended: false,
  last: null, // crush talked to most recently
};
const isFinal = () => state.day === 4 && state.slot === 1;

/* --------------------------------------------------------------- the school */
const WORLD = 3920;
const ZONES = [
  ['Classroom 12-A', 0, 800],
  ['Hallway', 800, 1500],
  ['Library', 1500, 2100],
  ['Canteen', 2100, 2700],
  ['Courtyard', 2700, 3400],
  ['Rooftop', 3400, WORLD + 100],
];
const zoneAt = (x) => ZONES.find(([, a, b]) => x >= a && x < b)?.[0] || 'Rooftop';
const SAKURA_X = 3150;

let camX = 0;
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
const baseY = () => H * (W < H ? 0.6 : 0.8); // higher on phones so the dialogue box covers no one
const viewW = () => W / S;
const sx = (x) => (x - camX) * S;
const sy = (h) => baseY() - h * S;
/** how late in the day it looks: 0 midday, 1 sunset */
const lateness = () => (state.slot === 0 ? 0 : state.day === 4 ? 1 : 0.82);

/* ---------------------------------------------------------------- the people */
let friendsHere = []; // { f, x, face } for this time slot
function placeFriends() {
  const r = seeded(state.day * 7 + state.slot * 3 + 1);
  const spots = [180, 330, 560, 700, 950, 1120, 1330, 1600, 2000, 2200, 2620, 2800, 3300, 3480, 3850];
  const taken = Object.values(CRUSHES).map((c) => crushX(c));
  const free = spots.filter((s) => taken.every((b) => Math.abs(b - s) > 140));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  friendsHere = FRIENDS.filter((f) => f !== state.me).map((f, i) => ({ f, x: free[i % free.length] + (i >= free.length ? 60 : 0), face: r() < 0.5 ? 1 : -1 }));
}
const crushX = (c) => (isFinal() && c.id === topCrush()?.id ? SAKURA_X + 60 : c.x);
function topCrush() {
  let best = null;
  for (const c of Object.values(CRUSHES)) {
    if (!state.met.has(c.id)) continue;
    if (!best || state.aff[c.id] > state.aff[best.id] || (state.aff[c.id] === state.aff[best.id] && c.id === state.last)) best = c;
  }
  return best;
}

/* ------------------------------------------------------------ draw: the sky */
function skyGradient(q, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, mix('#3d7fe0', '#2f45a8', q));
  g.addColorStop(0.4, mix('#73aef2', '#8a63cf', q));
  g.addColorStop(0.7, mix('#b8dcff', '#ff8aa1', q));
  g.addColorStop(1, mix('#fff2d8', '#ffd59a', q));
  return g;
}

function drawOutside(q, t) {
  ctx.fillStyle = skyGradient(q, 0, baseY());
  ctx.fillRect(0, 0, W, H);
  const sunX = W * 0.75, sunY = lerp(H * 0.15, baseY() - 120 * S, q), r = 38 * S;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 6);
  glow.addColorStop(0, `rgba(255,240,200,${0.6 + q * 0.3})`);
  glow.addColorStop(1, 'rgba(255,170,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - r * 6, sunY - r * 6, r * 12, r * 12);
  ctx.fillStyle = '#fff8e6';
  ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill();
  // drifting clouds
  const lit = mix('#ffffff', '#ffd3ad', q), shade = mix('#c3d6f3', '#c86a93', q);
  const span = W / S + 500;
  for (let i = 0; i < 6; i++) {
    const cx = (((i * 420 + t * 8 - camX * 0.05) % span) + span) % span - 200;
    const cy = 70 + (i % 3) * 60;
    for (const [col, oy, rs] of [[shade, 0, 1], [lit, -8, 0.86]]) {
      ctx.fillStyle = col;
      for (const [dx, dy, rr] of [[-60, 0, 34], [-20, -18, 46], [30, -8, 40], [70, 4, 28]]) {
        ctx.beginPath(); ctx.arc((cx + dx) * S, (cy + dy + oy) * S, rr * rs * S, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // the town below the roof
  const hy = sy(30);
  ctx.fillStyle = mix('#9bb3d8', '#9a6c9c', q);
  const r2 = seeded(5);
  const shift = (camX * 0.2 * S) % (90 * S);
  for (let x = -100 * S; x < W + 100 * S; ) {
    const w = (40 + r2() * 50) * S, h = (40 + r2() * 110) * S;
    ctx.fillRect(x - shift, hy - h, w, h + H);
    x += w + 6 * S;
  }
}

/* ------------------------------------------------- draw: the school building */
function rect(x, h, w, hh, col) {
  ctx.fillStyle = col;
  ctx.fillRect(sx(x), sy(h + hh), w * S, hh * S);
}
function text(str, x, h, size, col, weight = 800) {
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size * S}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, sx(x), sy(h));
}
function windowPane(x, h, w, hh, q) {
  rect(x - 4, h - 4, w + 8, hh + 8, '#ffffff');
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx(x), sy(h + hh), w * S, hh * S);
  ctx.clip();
  ctx.fillStyle = skyGradient(q, sy(h + hh), sy(h));
  ctx.fillRect(sx(x), sy(h + hh), w * S, hh * S);
  ctx.fillStyle = mix('#ffffff', '#ffd3ad', q, 0.9);
  ctx.beginPath(); ctx.arc(sx(x + w * 0.3), sy(h + hh * 0.7), 18 * S, 0, Math.PI * 2); ctx.arc(sx(x + w * 0.45), sy(h + hh * 0.75), 22 * S, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rect(x + w / 2 - 2, h, 4, hh, '#ffffff');
}

function drawInterior(q) {
  const wallTop = 330;
  const walls = [[0, 800, '#f5ecd8'], [800, 1500, '#e6eef7'], [1500, 2100, '#efe2cc'], [2100, 2700, '#fff0dc']];
  for (const [a, b, col] of walls) {
    rect(a, 0, b - a, wallTop, col);
    rect(a, 0, b - a, 22, darker(col, 0.88)); // skirting board
  }
  rect(0, wallTop - 14, 2700, 14, '#d8ccb8');
  // afternoon light through the windows
  ctx.fillStyle = `rgba(255,170,110,${q * 0.18})`;
  ctx.fillRect(sx(0), sy(wallTop), 2700 * S, wallTop * S);

  // classroom
  rect(110, 120, 360, 150, '#2f5a46');
  rect(104, 114, 372, 6, '#a8865a');
  const left = 5 - state.day;
  text(left > 1 ? `${left} days until graduation!` : 'Graduation is TOMORROW!', 290, 225, 22, '#f4f1e6');
  text('PACT: a crush before college', 290, 185, 14, '#ffd98a', 700);
  text('♥', 430, 150, 22, '#ff9fc2');
  for (const wx of [520, 650]) windowPane(wx, 130, 110, 140, q);
  for (const dx of [200, 360, 560, 700]) {
    rect(dx - 34, 60, 68, 8, '#c99a6a');
    rect(dx - 30, 0, 6, 60, '#8a6a4a');
    rect(dx + 24, 0, 6, 60, '#8a6a4a');
  }
  text('12-A', 40, 300, 14, '#8a7a6a');
  // hallway
  for (let i = 0; i < 9; i++) {
    rect(840 + i * 36, 0, 32, 190, i % 2 ? '#5a8ad8' : '#6a9ae6');
    rect(862 + i * 36, 120, 4, 20, '#e6eef7');
  }
  rect(1200, 150, 160, 110, '#c99a6a');
  rect(1206, 156, 148, 98, '#f6e6c6');
  text('PROM', 1280, 225, 18, '#e8417a');
  text('Friday night', 1280, 200, 12, '#3a2a50', 700);
  text('♥ ♥ ♥', 1280, 175, 12, '#ff7aa8');
  windowPane(1390, 130, 90, 140, q);
  // library
  const bookCols = ['#e8504f', '#3a5aa8', '#ffcf3f', '#4f8a46', '#7a5bb5'];
  for (const bx of [1530, 1690, 1950]) {
    rect(bx, 0, 130, 250, '#8a5a3a');
    for (let r = 0; r < 4; r++) {
      rect(bx + 6, 18 + r * 58, 118, 6, '#6a4228');
      for (let b = 0; b < 9; b++) rect(bx + 10 + b * 12.5, 24 + r * 58, 10, 36 + ((b * 7 + r) % 3) * 4, bookCols[(b + r) % 5]);
    }
  }
  text('Quiet please', 1885, 290, 12, '#8a6a4a', 700);
  // canteen
  rect(2150, 0, 230, 90, '#c4814e');
  rect(2150, 90, 230, 10, '#e9b88a');
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (const px of [2190, 2260, 2330]) {
    rect(px - 18, 100, 36, 26, '#9aa0b0');
    ctx.beginPath(); ctx.moveTo(sx(px - 4), sy(132)); ctx.quadraticCurveTo(sx(px + 6), sy(145), sx(px - 2), sy(160)); ctx.stroke();
  }
  rect(2420, 140, 230, 140, '#3a3040');
  text('MENU', 2535, 260, 16, '#ffd98a');
  text('Bakso ...... 10k', 2535, 228, 14, '#ffffff', 700);
  text('Mie ayam .. 12k', 2535, 204, 14, '#ffffff', 700);
  text('Es teh ....... 3k', 2535, 180, 14, '#ffffff', 700);
  text('Cheese bakso NEW!', 2535, 156, 12, '#ff9fc2', 700);
  // door frames between rooms, and the way out to the courtyard
  for (const d of [800, 1500, 2100]) rect(d - 10, 0, 20, 300, '#c9b8a0');
  rect(2690, 0, 14, wallTop, '#c9b8a0');
  // wooden floor
  ctx.fillStyle = '#c99a6a';
  ctx.fillRect(sx(0), sy(0), 2700 * S, H);
  ctx.fillStyle = '#b8895a';
  for (let x = Math.floor(camX / 60) * 60; x < Math.min(2700, camX + viewW() + 60); x += 60) ctx.fillRect(sx(x), sy(0), 2 * S, H);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(sx(0), sy(0), 2700 * S, 10 * S);
}

const blossoms = (() => {
  const r = seeded(31);
  return Array.from({ length: 26 }, () => { const a = r() * 6.28, d = Math.sqrt(r()); return [Math.cos(a) * d * 130, Math.sin(a) * d * 60 - 230, 22 + r() * 26]; }).sort((a, b) => a[1] - b[1]);
})();

function drawCourtyardAndRoof(q, t) {
  // the school wall behind the courtyard
  rect(2700, 0, 700, 210, mix('#f2ead8', '#e8c8b0', q));
  for (let i = 0; i < 6; i++) windowPane(2740 + i * 110, 90, 70, 90, q);
  rect(2700, 196, 700, 14, mix('#d8ccb8', '#c8a890', q));
  // the cherry tree
  ctx.save();
  ctx.translate(sx(SAKURA_X), sy(0));
  ctx.scale(S, S);
  ctx.fillStyle = '#6a4a44';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.bezierCurveTo(-8, -70, -18, -130, 2, -190); ctx.lineTo(12, -186); ctx.bezierCurveTo(4, -130, 12, -70, 16, 0); ctx.fill();
  const sway = Math.sin(t * 0.8) * 3;
  for (const [col, ox, oy, rs] of [[mix('#ea8ab2', '#e07aa6', q), 0, 0, 1], [mix('#ffc6db', '#ffb8d2', q), -0.14, -0.18, 0.82], [mix('#fff0f5', '#ffe4ef', q), -0.28, -0.36, 0.45]]) {
    ctx.fillStyle = col;
    for (const [bx, by, br] of blossoms) { ctx.beginPath(); ctx.arc(bx + sway * (1 + by / -300) + br * ox, by + br * oy, br * rs, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  // bench
  rect(SAKURA_X - 120, 0, 6, 24, '#4a3a34');
  rect(SAKURA_X - 50, 0, 6, 24, '#4a3a34');
  rect(SAKURA_X - 128, 22, 92, 8, '#a86a44');
  // grass in the courtyard, concrete on the roof
  ctx.fillStyle = mix('#7cc06a', '#5d8a52', q);
  ctx.fillRect(sx(2700), sy(0), 700 * S, H);
  ctx.fillStyle = mix('#5aa050', '#3f6a44', q);
  ctx.fillRect(sx(2700), sy(-14), 700 * S, H);
  ctx.fillStyle = mix('#c9c2bc', '#c4a69a', q);
  ctx.fillRect(sx(3400), sy(0), (WORLD - 3400 + 200) * S, H);
  rect(3400, 0, 12, 260, mix('#d8ccb8', '#c8a890', q));
  rect(3412, 0, 70, 120, mix('#8a9aaa', '#7a6a8a', q));
  text('ROOF', 3447, 135, 12, mix('#5a6a7a', '#6a5a7a', q), 800);
  // water tank
  rect(3770, 0, 8, 120, '#7a8090');
  rect(3880, 0, 8, 120, '#7a8090');
  ctx.fillStyle = mix('#a8b8c8', '#9a90b0', q);
  ctx.beginPath(); ctx.roundRect(sx(3760), sy(230), 140 * S, 110 * S, 20 * S); ctx.fill();
  // rooftop fence
  ctx.strokeStyle = mix('#7a8a9a', '#5a4a6a', q, 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 3480; x < WORLD + 120; x += 14) { ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x + 30), sy(100)); ctx.moveTo(sx(x + 30), sy(0)); ctx.lineTo(sx(x), sy(100)); }
  ctx.stroke();
  ctx.lineWidth = 4 * S;
  ctx.beginPath(); ctx.moveTo(sx(3480), sy(100)); ctx.lineTo(sx(WORLD + 150), sy(100)); ctx.stroke();
}

/* ------------------------------------------------------- draw: characters */
/**
 * A chibi character seen from the side, facing right (mirrored for left).
 * Origin is between the feet on the ground; o.k is the pixel scale.
 */
function chibi(c, o) {
  const L = o.look;
  c.save();
  c.translate(o.x, o.y);
  c.scale(o.k * o.face, o.k);

  if (!o.portrait) {
    c.fillStyle = 'rgba(40,20,50,0.18)';
    c.beginPath(); c.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2); c.fill();
  }
  const swing = o.moving ? Math.sin(o.phase) : 0;
  const bob = o.moving ? Math.abs(Math.cos(o.phase)) * 2.5 : Math.sin(o.t * 2 + o.seed) * 0.6;
  const hipY = -30 - bob;

  const leg = (a, col) => {
    const fx2 = Math.sin(a) * 28, fy = hipY + Math.cos(a) * 28;
    c.strokeStyle = L.skirt ? L.skin : col;
    c.lineWidth = L.skirt ? 7 : 10;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, hipY); c.lineTo(fx2, fy); c.stroke();
    c.fillStyle = L.shoe;
    c.beginPath(); c.ellipse(fx2 + 4, fy + 1, 8, 4.5, 0, 0, Math.PI * 2); c.fill();
  };
  const arm = (a, col) => {
    const hx = Math.sin(a) * 22 + 2, hy = -56 - bob + Math.cos(a) * 22;
    c.strokeStyle = col;
    c.lineWidth = 8;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -56 - bob); c.lineTo(hx, hy); c.stroke();
    c.fillStyle = L.skin;
    c.beginPath(); c.arc(hx, hy, 4.5, 0, Math.PI * 2); c.fill();
  };

  leg(-swing * 0.45, darker(L.bottom));
  arm(swing * 0.6, L.topSh);

  const hx = 2, hy = -86 - bob;
  const wind = Math.sin(o.t * 2 + o.seed) * 2 - (o.moving ? 5 : 0);
  // hair that hangs behind the head
  c.fillStyle = L.hair;
  if (L.style === 'bob') {
    c.beginPath(); c.moveTo(hx - 24, hy - 4); c.quadraticCurveTo(hx - 28 + wind, hy + 14, hx - 20 + wind, hy + 20); c.lineTo(hx + 6, hy + 18); c.lineTo(hx + 10, hy + 6); c.fill();
  }
  if (L.style === 'ponytail') {
    c.beginPath(); c.ellipse(hx - 30 + wind, hy + 2, 9, 22, 0.35 + wind * 0.03, 0, Math.PI * 2); c.fill();
  }
  if (L.style === 'braid') {
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(hx - 20 + wind * (i / 6), hy + 4 + i * 9, 7 - i * 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffcf3f';
    c.beginPath(); c.arc(hx - 20 + wind, hy + 54, 3.5, 0, Math.PI * 2); c.fill();
  }

  // body
  c.fillStyle = L.bottom;
  if (L.skirt) {
    c.beginPath(); c.moveTo(-11, -46 - bob); c.lineTo(11, -46 - bob); c.lineTo(17 + swing * 2, hipY + 6); c.lineTo(-17 + swing * 2, hipY + 6); c.fill();
  } else {
    c.fillRect(-10, hipY - 8, 20, 10);
  }
  c.fillStyle = L.top;
  c.beginPath(); c.roundRect(-12, -64 - bob, 24, 26, 7); c.fill();
  c.fillStyle = L.topSh;
  c.beginPath(); c.roundRect(-12, -64 - bob, 9, 26, [7, 0, 0, 7]); c.fill();
  if (L.tie) { c.fillStyle = L.tie; c.beginPath(); c.moveTo(6, -62 - bob); c.lineTo(10, -62 - bob); c.lineTo(9, -50 - bob); c.lineTo(7, -50 - bob); c.fill(); }
  if (L.apron) { c.fillStyle = L.apron; c.beginPath(); c.roundRect(-2, -58 - bob, 13, 30, 3); c.fill(); }
  if (L.camera) {
    c.strokeStyle = '#2a2a38'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-8, -62 - bob); c.lineTo(8, -44 - bob); c.stroke();
    c.fillStyle = '#2a2a38'; c.fillRect(3, -48 - bob, 12, 8);
    c.fillStyle = '#9fd0ff'; c.beginPath(); c.arc(12, -44 - bob, 2.5, 0, Math.PI * 2); c.fill();
  }
  leg(swing * 0.45, L.bottom);

  // neck + head
  c.fillStyle = L.skin;
  c.fillRect(-3, -68 - bob, 7, 6);
  c.beginPath(); c.arc(hx, hy, 24, 0, Math.PI * 2); c.fill();

  // face
  c.fillStyle = `rgba(255,120,150,${o.blush ? 0.75 : 0.45})`;
  c.beginPath(); c.ellipse(hx + 12, hy + 9, o.blush ? 6 : 4.5, 2.8, 0, 0, Math.PI * 2); c.fill();
  const blink = Math.sin(o.t * 1.3 + o.seed) > 0.985;
  if (blink || L.sleepy) {
    c.strokeStyle = L.eye; c.lineWidth = 2;
    c.beginPath();
    if (L.sleepy && !blink) { c.moveTo(hx + 7, hy + 1); c.lineTo(hx + 15, hy + 1); }
    else c.arc(hx + 11, hy + 1, 3.5, 0.2, Math.PI - 0.2);
    c.stroke();
  } else {
    c.fillStyle = L.eye;
    c.beginPath(); c.ellipse(hx + 11, hy + 1, 3.6, 5.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(hx + 10, hy - 1.5, 1.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(hx + 12.4, hy + 3, 0.8, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = L.eye;
  c.lineWidth = 1.6;
  c.beginPath();
  if (o.talking && Math.sin(o.t * 18) > 0) {
    c.fillStyle = '#9a3a4a';
    c.ellipse(hx + 18, hy + 12, 2.2, 2.6, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.arc(hx + 17, hy + 10, 2.4, 0.3, Math.PI - 0.6);
    c.stroke();
  }
  if (L.glasses) {
    c.strokeStyle = '#3a3050'; c.lineWidth = 1.6;
    c.beginPath(); c.roundRect(hx + 5, hy - 5, 13, 11, 4); c.moveTo(hx + 5, hy - 1); c.lineTo(hx - 8, hy - 2); c.stroke();
  }

  // hair on top
  c.fillStyle = L.hair;
  c.beginPath();
  if (L.style === 'buzz') {
    c.arc(hx, hy - 2, 25.5, Math.PI * 0.98, Math.PI * 1.98);
    c.lineTo(hx + 22, hy - 8);
    c.lineTo(hx - 24, hy + 2);
    c.fill();
  } else {
    c.moveTo(hx - 25, hy + 8);
    c.arc(hx, hy - 1, 26, Math.PI * 0.96, Math.PI * 1.98);
    const bangs = L.style === 'parted'
      ? [[24, -2], [20, -8], [12, 2], [4, -10], [-6, -12], [-14, 0], [-23, 12]]
      : [[24, 2], [19, -6], [15, 5], [9, -8], [3, 2], [-4, -9], [-12, 3], [-19, -2], [-23, 12]];
    for (const [bx, by] of bangs) c.lineTo(hx + bx, hy + by);
    c.closePath();
    c.fill();
    const w = Math.sin(o.t * 3 + o.seed) * 1.5;
    if (L.style === 'spiky') {
      c.beginPath();
      c.moveTo(hx - 24, hy - 6); c.lineTo(hx - 38 + w, hy - 4); c.lineTo(hx - 25, hy + 8);
      c.moveTo(hx - 20, hy - 16); c.lineTo(hx - 33 + w, hy - 27); c.lineTo(hx - 10, hy - 24);
      c.moveTo(hx - 6, hy - 24); c.lineTo(hx - 6 + w, hy - 40); c.lineTo(hx + 8, hy - 26);
      c.moveTo(hx + 8, hy - 24); c.lineTo(hx + 22 + w, hy - 33); c.lineTo(hx + 20, hy - 16);
      c.fill();
    }
    if (L.style === 'messy') {
      c.beginPath();
      c.moveTo(hx - 14, hy - 22); c.lineTo(hx - 20 + w, hy - 34); c.lineTo(hx - 4, hy - 26);
      c.moveTo(hx + 2, hy - 26); c.lineTo(hx + 12 + w, hy - 36); c.lineTo(hx + 14, hy - 22);
      c.moveTo(hx - 24, hy - 2); c.lineTo(hx - 33 + w, hy + 6); c.lineTo(hx - 22, hy + 10);
      c.fill();
    }
    if (L.style === 'curly') {
      for (const [cx, cy] of [[-20, -14], [-10, -24], [2, -27], [14, -22], [-24, -2], [-22, 10]]) { c.beginPath(); c.arc(hx + cx, hy + cy, 9, 0, Math.PI * 2); c.fill(); }
    }
    if (L.style === 'parted') {
      c.beginPath(); c.moveTo(hx + 4, hy - 24); c.quadraticCurveTo(hx + 20 + w, hy - 34, hx + 26, hy - 16); c.lineTo(hx + 10, hy - 18); c.fill();
    }
    if (L.style === 'bun') { c.beginPath(); c.arc(hx - 18, hy - 22, 11, 0, Math.PI * 2); c.fill(); }
    if (L.style === 'ponytail') {
      c.fillStyle = '#e8304f';
      c.beginPath(); c.arc(hx - 23, hy - 4, 3.5, 0, Math.PI * 2); c.fill();
    }
    if (L.style === 'cap') {
      c.fillStyle = L.cap; // worn backwards
      c.beginPath(); c.arc(hx, hy - 4, 25, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(hx - 22, hy - 6); c.lineTo(hx - 38, hy - 2); c.lineTo(hx - 24, hy - 12); c.fill();
    }
    if (L.style === 'beanie') {
      c.fillStyle = L.beanie;
      c.beginPath(); c.arc(hx, hy - 6, 26, Math.PI, Math.PI * 2); c.lineTo(hx + 26, hy - 2); c.lineTo(hx - 26, hy - 2); c.fill();
      c.fillStyle = darker(L.beanie, 0.7);
      c.fillRect(hx - 26, hy - 8, 52, 7);
      c.beginPath(); c.arc(hx - 4, hy - 34, 6, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = L.hairHi;
    c.lineWidth = 2;
    c.beginPath(); c.arc(hx - 2, hy - 4, 16, Math.PI * 1.15, Math.PI * 1.5); c.stroke();
  }
  if (!['bob', 'braid'].includes(L.style)) {
    c.fillStyle = L.skin;
    c.beginPath(); c.ellipse(hx - 5, hy + 4, 4, 5.5, 0, 0, Math.PI * 2); c.fill();
  }
  if (L.headphones) {
    c.strokeStyle = '#2a2a38'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(hx - 4, hy - 2, 26, Math.PI * 1.1, Math.PI * 1.85); c.stroke();
    c.fillStyle = L.headphones;
    c.beginPath(); c.roundRect(hx - 15, hy - 3, 10, 15, 4); c.fill();
    c.strokeStyle = '#2a2a38'; c.lineWidth = 1.5; c.stroke();
  }
  if (!o.portrait) arm(-swing * 0.6, L.top);
  c.restore();
}

/* ------------------------------------------------------------- prompts */
let near = null;
function interactables() {
  const list = friendsHere.map((p) => ({ kind: 'friend', id: p.f.name, x: p.x, who: p.f }));
  for (const c of Object.values(CRUSHES)) list.push({ kind: 'crush', id: c.id, x: crushX(c), who: c });
  return list;
}
function findNear() {
  let best = null, bd = 80;
  for (const n of interactables()) {
    const d = Math.abs(n.x - state.x);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
function bubble(x, label, t, color) {
  const bx = sx(x), by = sy(134) + Math.sin(t * 4) * 3;
  ctx.font = `800 ${13 * S}px ${FONT}`;
  const w = ctx.measureText(label).width + 22 * S;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(bx - w / 2, by - 26 * S, w, 26 * S, 13 * S);
  ctx.moveTo(bx - 6 * S, by); ctx.lineTo(bx + 6 * S, by); ctx.lineTo(bx, by + 7 * S);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx, by - 13 * S);
}
function heartMark(x, t) {
  const k = S * (1 + Math.sin(t * 6) * 0.08);
  ctx.save();
  ctx.translate(sx(x), sy(140) + Math.sin(t * 5) * 3);
  ctx.scale(k, k);
  ctx.fillStyle = '#ff5f96';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-14, -2, -11, -14, 0, -7); ctx.bezierCurveTo(11, -14, 14, -2, 0, 8);
  ctx.stroke(); ctx.fill();
  ctx.restore();
}
const sceneReady = (c) => state.scene[c.id] < 3 && state.seenDay[c.id] !== state.day;

/* ------------------------------------------------------------- dialogue */
const dlg = $('dialog');
const dlgName = dlg.querySelector('.dialog-name');
const dlgText = dlg.querySelector('.dialog-text');
const dlgChoices = dlg.querySelector('.dialog-choices');
let advance = null;
let speaking = null;

function whoClass(who) {
  if (who === state.me?.name) return 'dyas'; // blue name tag for you
  if (Object.values(CRUSHES).some((c) => c.name === who)) return 'naswa'; // pink for crushes
  return 'other';
}
function say(who, line) {
  return new Promise((resolve) => {
    dlg.hidden = false;
    dlg.classList.remove('done');
    dlg.classList.toggle('narr', !who);
    dlgName.textContent = who || '';
    dlgName.dataset.who = whoClass(who);
    dlgChoices.innerHTML = '';
    speaking = who;
    let i = 0;
    dlgText.textContent = '';
    const pitch = whoClass(who) === 'naswa' ? 1.4 : who === state.me?.name ? 0 : 0.7;
    const timer = setInterval(() => {
      i++;
      dlgText.textContent = line.slice(0, i);
      if (i % 2 === 0 && who) song.blip(pitch);
      if (i >= line.length) finish();
    }, reduced ? 5 : 24);
    function finish() {
      clearInterval(timer);
      dlgText.textContent = line;
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
function closeDialog() { dlg.hidden = true; speaking = null; }
dlg.addEventListener('click', () => advance && advance());

/* ------------------------------------------------------------- HUD */
const toastEl = $('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
function updateHud() {
  $('quest').textContent = `Day ${state.day + 1} · ${DAYS[state.day]} · ${SLOTS[state.slot]}`;
  $('zone').textContent = zoneAt(state.x);
  const ul = $('hearts');
  ul.innerHTML = '';
  for (const c of Object.values(CRUSHES)) {
    if (!state.met.has(c.id)) continue;
    const full = Math.floor(state.aff[c.id] / 2), half = state.aff[c.id] % 2;
    const li = document.createElement('li');
    li.innerHTML = `${c.name} <span class="h">${'♥'.repeat(full)}${half ? '♡' : ''}<i>${'♡'.repeat(3 - full - half)}</i></span>`;
    li.setAttribute('aria-label', `${c.name}: ${state.aff[c.id]} of 6`);
    ul.append(li);
  }
}
let lastZone = '';

/* ----------------------------------------------------------- talking */
async function talk(n) {
  if (state.busy || state.ended) return;
  state.busy = true;
  state.moving = false;
  state.face = n.x > state.x ? 1 : -1;
  let usedTime = false;
  if (n.kind === 'friend') await talkFriend(n.who);
  else usedTime = await talkCrush(n.who);
  closeDialog();
  updateHud();
  if (state.ended) return;
  if (usedTime) await nextSlot();
  if (!state.ended) state.busy = false;
}

/** the first of these names that isn't you */
const other = (...names) => names.find((nm) => nm !== state.me.name) || FRIENDS.find((f) => f !== state.me).name;

async function talkFriend(f) {
  const me = state.me.name;
  if (isFinal()) {
    const top = topCrush();
    await say(f.name, top ? `Why are you talking to me?! ${top.name} is waiting by the cherry tree. GO!` : 'Bro… you didn’t talk to anyone. I can already taste the bakso.');
    return;
  }
  if (!state.talkedFriend.has(f.name)) {
    state.talkedFriend.add(f.name);
    await say(f.name, f.line);
    const [cid, tip] = f.hint;
    await say(f.name, tip);
    if (!state.met.has(cid)) await say(me, `${CRUSHES[cid].name}… the ${CRUSHES[cid].role}? Hmm.`);
    return;
  }
  const r = seeded(state.day * 13 + state.slot * 5 + f.name.length)();
  const left = 5 - state.day;
  const lines = [
    `How’s the pact going, ${me}? Don’t make me eat bakso alone… actually, do.`,
    `${left} day${left === 1 ? '' : 's'} left. No pressure. Okay, a little pressure.`,
    'I believe in you. Mostly. Like 60%.',
    'Go! Time’s ticking!',
  ];
  await say(f.name, lines[Math.floor(r * lines.length)]);
  await say(f.name, f.hint[1]);
}

/** returns true when the talk used up the time slot */
async function talkCrush(c) {
  if (isFinal()) {
    if (c.id === topCrush()?.id) { await confession(c); return false; }
    await say(c.name, '…Shouldn’t you be somewhere right now?');
    return false;
  }
  if (state.scene[c.id] >= 3) {
    await say(c.name, ['See you at graduation.', 'Hi again. …Stop smiling like that.', 'Back already?'][state.day % 3]);
    return false;
  }
  if (state.seenDay[c.id] === state.day) {
    await say(c.name, `See you tomorrow, ${state.me.name}.`);
    return false;
  }
  state.met.add(c.id);
  state.last = c.id;
  const gain = await SCENES[c.id][state.scene[c.id]](c, state.me.name);
  state.scene[c.id]++;
  state.seenDay[c.id] = state.day;
  state.aff[c.id] += gain;
  if (gain === 2) { toast(`${c.name} ♥ +2`); song.pickup(); fx.burst(sx(c.x), sy(120), reduced ? 6 : 14); }
  else if (gain === 1) toast(`${c.name} ♥ +1`);
  else toast(`${c.name} …`);
  updateHud();
  await wait(800);
  return true;
}

/** each scene is a little moment with one choice; it returns 2, 1 or 0 affection */
const SCENES = {
  alya: [
    async (c, me) => {
      await say('', 'Alya, the class president, is buried in a stack of college forms.');
      await say(c.name, `Oh. ${me}. If you came to copy homework, the answer is no.`);
      const i = await choose(['I came to help with those forms.', '…Is it that obvious?', 'You look tired. You should smile more.']);
      if (i === 0) { await say(c.name, '…You’d actually do that? Fine. Sort these by deadline.'); await say('', 'You spend the whole break sorting forms. She hums while she works.'); return 2; }
      if (i === 1) { await say(c.name, 'Painfully. …Sit. I’ll explain it instead. Copying won’t help you in college.'); return 1; }
      await say(c.name, 'And you should mind your own business.');
      return 0;
    },
    async (c) => {
      await say(c.name, 'I got into the university in Bandung. My parents are thrilled.');
      await say(c.name, '…I’m scared, though. Living alone, new city. Is that stupid?');
      const i = await choose(['Not stupid. I’m scared too.', 'You’ll be fine, you’re the smartest here!', 'Bandung is really far, huh.']);
      if (i === 0) { await say(c.name, '…Thanks. That helps more than you’d think.'); return 2; }
      if (i === 1) { await say(c.name, 'Everyone says that. It doesn’t make it less scary. But… thanks.'); return 1; }
      await say(c.name, '…Thanks for reminding me.');
      return 0;
    },
    async (c, me) => {
      await say('', 'Behind the library, Alya is crouched down, feeding a stray cat.');
      await say(c.name, `Wh— ${me}! Don’t tell anyone. The class president feeding cats is bad for my image.`);
      const i = await choose(['Your secret’s safe with me.', 'Can I pet her too?', 'Everyone already knows.']);
      if (i === 0) { await say(c.name, `…You’re nicer than you look, ${me}.`); return 2; }
      if (i === 1) { await say(c.name, 'Gently! …Huh. She likes you.'); return 1; }
      await say(c.name, 'WHAT.');
      return 0;
    },
  ],
  kirana: [
    async (c, me) => {
      await say(c.name, `Hey, ${me}! Race me to the fence! Loser buys es teh!`);
      const i = await choose(['You’re on!', 'I’ll cheer for you from here.', 'Running is for people without motorbikes.']);
      if (i === 0) { await say('', 'You lose. Badly. But you finish.'); await say(c.name, 'You lost, but you didn’t quit. I like that.'); return 2; }
      if (i === 1) { await say(c.name, 'Boo! …Okay, the cheering was kind of cute.'); return 1; }
      await say(c.name, '…Wow. Okay.');
      return 0;
    },
    async (c) => {
      await say('', 'Kirana sits on the bench with an ice pack on her knee.');
      await say(c.name, 'Twisted it. Right before the last meet. Great timing, huh?');
      const i = await choose(['Let me carry your bag to the nurse.', 'Does it hurt a lot?', 'Guess you’re done running, then.']);
      if (i === 0) { await say(c.name, '…You don’t have to. …Okay. Thanks.'); return 2; }
      if (i === 1) { await say(c.name, 'Only my pride. Thanks for asking.'); return 1; }
      await say(c.name, 'Thanks, coach. Really encouraging.');
      return 0;
    },
    async (c, me) => {
      await say(c.name, `${me}! I got the sports scholarship! …You’re the first person I told.`);
      const i = await choose(['I knew you would. I’m so proud of you.', 'Congrats! Now you can buy me es teh.', 'Oh, cool. Anyway—']);
      if (i === 0) { await say(c.name, '…Don’t make that face. You’ll make me cry.'); return 2; }
      if (i === 1) { await say(c.name, 'Ha! Deal. A big one.'); return 1; }
      await say(c.name, '…Yeah. Anyway.');
      return 0;
    },
  ],
  sekar: [
    async (c) => {
      await say('', 'Sekar is sketching the sky. She hasn’t noticed you.');
      const i = await choose(['Sit quietly and watch the clouds with her.', 'Whoa, can I see that?', 'Is this the art club? Where’s everyone?']);
      if (i === 0) { await say('', 'You sit. Neither of you says anything. A cloud drifts by.'); await say(c.name, '…You didn’t say anything. That was nice.'); return 2; }
      if (i === 1) { await say(c.name, 'It’s not done… but okay. Just a peek.'); return 1; }
      await say(c.name, 'There is no everyone. Just me.');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'I’m drawing everyone in our class before we graduate. So I don’t forget anyone.');
      await say(c.name, `…Can I draw you, ${me}?`);
      const i = await choose(['Only if I can keep a copy.', 'Sure! Make me look cool.', 'Nah, I’m not photogenic.']);
      if (i === 0) { await say(c.name, '…Okay. I’ll make it a good one, then.'); return 2; }
      if (i === 1) { await say(c.name, 'I draw what I see. …You already look cool. Hold still.'); return 1; }
      await say(c.name, 'Drawing isn’t a photo…');
      return 0;
    },
    async (c) => {
      await say('', 'Sekar turns her sketchbook around. It’s you, laughing with your friends in the canteen.');
      await say(c.name, 'I drew this one from memory.');
      const i = await choose(['You remember that day? …I remember it too.', 'You drew me?! It’s amazing.', 'My nose isn’t that big.']);
      if (i === 0) { await say(c.name, '…I remember a lot of days with you in them.'); return 2; }
      if (i === 1) { await say(c.name, 'It was easy. You laugh a lot.'); return 1; }
      await say(c.name, '…It’s exactly that big.');
      return 0;
    },
  ],
  rania: [
    async (c, me) => {
      await say(c.name, `${me}! Taste test! New recipe: bakso with cheese inside. Be honest!`);
      const i = await choose(['It’s great — but it needs more chili.', 'Delicious!', 'Cheese in bakso is a crime.']);
      if (i === 0) { await say(c.name, 'An honest critic! Finally! You’re my official taster now.'); return 2; }
      if (i === 1) { await say(c.name, 'You’d say that about anything. …But thanks.'); return 1; }
      await say(c.name, 'Then you are banned from my canteen.');
      return 0;
    },
    async (c) => {
      await say(c.name, 'I want to open a café after college. Everyone says it’s not a “real” career.');
      const i = await choose(['Your food makes people happy. That’s as real as it gets.', 'I’ll be your first customer.', 'Maybe get a “real” degree first?']);
      if (i === 0) { await say(c.name, '…I’m going to remember you said that.'); return 2; }
      if (i === 1) { await say(c.name, 'First customer pays double. …Kidding.'); return 1; }
      await say(c.name, '…You sound like my uncle.');
      return 0;
    },
    async (c) => {
      await say('', 'Rania hands you a bento. The egg is shaped like a heart.');
      await say(c.name, 'Don’t read into the egg. …It just came out that shape.');
      const i = await choose(['Then I’ll pretend I didn’t notice. …I noticed.', 'Thank you! It looks amazing.', 'Is this a pity bento?']);
      if (i === 0) { await say(c.name, '…Shut up and eat.'); await say('', 'Her ears are bright red.'); return 2; }
      if (i === 1) { await say(c.name, 'Eat it while it’s warm!'); return 1; }
      await say(c.name, 'It WAS a nice bento.');
      return 0;
    },
  ],
};

/* ------------------------------------------------------------- time */
const fade = $('fade');
async function eyecatch() {
  const ec = $('eyecatch');
  ec.querySelector('.ec-day').textContent = `DAY ${state.day + 1}`;
  ec.querySelector('.ec-name').textContent = DAYS[state.day];
  ec.querySelector('.ec-slot').textContent = isFinal() ? 'The last afternoon' : SLOTS[state.slot];
  ec.hidden = false;
  await wait(30);
  ec.classList.add('show');
  song.chime();
  await wait(reduced ? 900 : 1700);
  ec.classList.remove('show');
  await wait(500);
  ec.hidden = true;
}
async function nextSlot() {
  fade.classList.add('on');
  await wait(900);
  if (state.slot === 0) state.slot = 1;
  else { state.slot = 0; state.day++; }
  state.x = state.slot === 0 ? 400 : 1000;
  camX = clamp(state.x - viewW() * 0.42, 0, WORLD - viewW());
  placeFriends();
  updateHud();
  fade.classList.remove('on');
  await eyecatch();
  if (isFinal()) await finalAfternoon();
}

async function finalAfternoon() {
  const top = topCrush();
  const me = state.me.name;
  if (!top) {
    await say(other('Ghanim', 'Lindan'), `${me}. It’s the last afternoon. You didn’t talk to a single one of them?`);
    await say(other('Hamzah', 'Aboi'), 'BAKSO! BAKSO! BAKSO!');
    closeDialog();
    await baksoEnd(null);
    return;
  }
  await say(other('Ghanim', 'Lindan'), `This is it, ${me}. Graduation is tomorrow.`);
  await say(other('Ghiffy', 'Arkan'), `${top.name} is waiting by the cherry tree in the courtyard. I may have… told her you wanted to talk.`);
  await say(me, 'You WHAT?');
  await say(other('Lindan', 'Nizam'), 'Go. Be honest. We’ll be hiding in the bushes. Supportively.');
  closeDialog();
}

/* ------------------------------------------------------------- endings */
async function confession(c) {
  const me = state.me.name;
  await say('', `Petals drift down from the cherry tree. ${c.name} turns around.`);
  await say(c.name, `${me}. Your friends said you wanted to tell me something. …Then they ran away.`);
  const i = await choose(['I like you. I have for a while.', 'Want to get es teh together… every day, in college too?', '(Say nothing. Just hold out your hand.)']);
  if (state.aff[c.id] < 4) {
    await say(c.name, `${me}… you’re really sweet. But I feel like I’ve only just met you.`);
    await say(c.name, 'Text me in college? Let’s see what happens.');
    closeDialog();
    await baksoEnd(c);
    return;
  }
  if (i === 0) await say(c.name, '…Took you long enough. I like you too.');
  else if (i === 1) await say(c.name, 'Every day? …Okay. But you’re paying.');
  else { await say('', `${c.name} looks at your hand for a long moment. Then she takes it.`); await say(c.name, '…Hi.'); }
  await say(other('Ghiffy', 'Aboi'), '(from the bushes) LET’S GOOOOO!');
  await say(c.name, 'Were they there the whole time?!');
  closeDialog();
  happyEnd(c);
}

function results(winner) {
  const outcomes = ['has a crush ✓ (won’t say who)', 'has a crush ✓', 'is “keeping his options open”', 'fell in love with Rania’s cheese bakso', 'says he’ll find someone in college', 'has a crush ✓ (it’s mutual!)', 'has a crush on graduation itself', 'is still deciding'];
  const r = seeded(state.aff.alya * 7 + state.aff.kirana * 5 + state.aff.sekar * 3 + state.aff.rania + state.me.name.length);
  const ul = $('res-list');
  ul.innerHTML = '';
  const me = document.createElement('li');
  me.innerHTML = `<b>${state.me.name} (you)</b> ${winner ? `— ${winner.name} said yes ♥` : '— pays for the bakso'}`;
  ul.append(me);
  for (const f of FRIENDS) {
    if (f === state.me) continue;
    const li = document.createElement('li');
    li.innerHTML = `<b>${f.name}</b> ${outcomes[Math.floor(r() * outcomes.length)]}`;
    ul.append(li);
  }
}

async function baksoEnd(c) {
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  await wait(1200);
  $('hud').hidden = true;
  $('pad').hidden = true;
  $('res-kana').textContent = 'バクソ・エンド';
  $('res-title').textContent = 'Bakso End';
  $('res-sub').textContent = c
    ? `${c.name} wants to get to know you first. That’s not a no! But a pact is a pact: tonight, ${state.me.name} treats the whole squad to bakso.`
    : `No crush before college… The whole squad eats bakso on ${state.me.name}. Extra meatballs.`;
  results(null);
  document.body.classList.add('show-results');
  $('results').hidden = false;
  fade.classList.remove('on');
}

function happyEnd(c) {
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  setTimeout(() => {
    $('hud').hidden = true;
    $('pad').hidden = true;
    stopLoop = true;
    $('tc-names').innerHTML = `${state.me.name} <span class="heart">♥</span> ${c.name}`;
    $('tc-episode').textContent = 'Final Episode · Get a Crush Before College';
    const L = state.me.look;
    const plain = L.top === SHIRT;
    startEnding({
      canvas, fx, song,
      names: [state.me.name, c.name],
      looks: { boyHair: L.hair, boyHairHi: L.hairHi, jacket: plain ? '#5a6a9a' : L.top, jacketSh: plain ? '#47557f' : L.topSh, ...c.end },
      gifts: { ribbon: c.id === 'alya' },
    });
    fade.classList.remove('on');
    // once the title card has had its moment, show how everyone did
    setTimeout(() => {
      $('res-kana').textContent = '卒業おめでとう！';
      $('res-title').innerHTML = `${state.me.name} <span class="heart">♥</span> ${c.name}`;
      $('res-sub').textContent = `${state.me.name} got a crush before college. No bakso tonight. (Okay, bakso anyway. To celebrate.)`;
      results(c);
      document.body.classList.add('show-results');
      $('results').hidden = false;
    }, 56000);
  }, 1300);
}

/* ---------------------------------------------------------------- input */
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (!state.started || state.ended) return;
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
  if (k === 'e' || k === ' ' || k === 'enter') {
    if (e.target.tagName === 'BUTTON' && dlgChoices.contains(e.target)) return;
    e.preventDefault();
    if (state.busy) { advance && advance(); return; }
    const n = findNear();
    if (n) talk(n);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

const hold = { left: false, right: false };
for (const [id, dir] of [['btn-left', 'left'], ['btn-right', 'right']]) {
  const b = $(id);
  const on = (e) => { e.preventDefault(); hold[dir] = true; b.classList.add('held'); };
  const off = () => { hold[dir] = false; b.classList.remove('held'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  b.addEventListener('pointercancel', off);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
const talkBtn = $('btn-talk');
talkBtn.addEventListener('click', () => {
  if (state.busy) { advance && advance(); return; }
  const n = findNear();
  if (n) talk(n);
});
canvas.addEventListener('pointerdown', (e) => {
  if (!state.started || state.ended) return;
  if (state.busy) { advance && advance(); return; }
  const n = findNear();
  if (n && Math.abs(e.clientX - sx(n.x)) < 90 * S) talk(n);
});

/* ----------------------------------------------------------------- loop */
let last = performance.now();
let stopLoop = false;
function frame(now) {
  if (stopLoop) return;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const t = now / 1000;

  const left = keys.has('arrowleft') || keys.has('a') || hold.left;
  const right = keys.has('arrowright') || keys.has('d') || hold.right;
  const dir = state.busy || !state.started ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
  state.moving = dir !== 0;
  if (dir) {
    state.face = dir;
    state.x = clamp(state.x + dir * 190 * dt, 60, WORLD - 60);
    state.phase += dt * 11;
  }
  const vw = viewW();
  camX += (clamp(state.x - vw * 0.42, 0, WORLD - vw) - camX) * Math.min(1, dt * 5);

  near = state.busy || !state.started ? null : findNear();
  document.body.classList.toggle('talking', state.busy);
  if (talkBtn.disabled === !!(near || state.busy)) talkBtn.disabled = !(near || state.busy);
  const z = zoneAt(state.x);
  if (z !== lastZone && state.started) { lastZone = z; $('zone').textContent = z; }

  const q = lateness();
  ctx.clearRect(0, 0, W, H);
  drawOutside(q, t);
  drawInterior(q);
  drawCourtyardAndRoof(q, t);

  for (const p of friendsHere) {
    const face = Math.abs(state.x - p.x) < 200 ? (state.x < p.x ? -1 : 1) : p.face;
    chibi(ctx, { x: sx(p.x), y: sy(0), k: S, face, look: p.f.look, t, phase: 0, moving: false, talking: speaking === p.f.name, seed: p.x });
  }
  for (const c of Object.values(CRUSHES)) {
    const x = crushX(c);
    const face = Math.abs(state.x - x) < 220 ? (state.x < x ? -1 : 1) : -1;
    chibi(ctx, { x: sx(x), y: sy(0), k: S, face, look: c.look, t, phase: 0, moving: false, talking: speaking === c.name, seed: x, blush: state.aff[c.id] >= 4 && Math.abs(state.x - x) < 140 });
  }
  if (state.me) chibi(ctx, { x: sx(state.x), y: sy(0), k: S, face: state.face, look: state.me.look, t, phase: state.phase, moving: state.moving, talking: speaking === state.me.name, seed: 3 });

  // hearts over crushes with something new to say, names over people nearby
  if (state.started && !state.ended) {
    for (const c of Object.values(CRUSHES)) {
      const x = crushX(c);
      const show = isFinal() ? c.id === topCrush()?.id : sceneReady(c);
      if (show && near?.id !== c.id) heartMark(x, t);
    }
    for (const n of interactables()) {
      if (Math.abs(n.x - state.x) < 260 && near?.id !== n.id) text(n.who.name, n.x, -22, 12, 'rgba(255,255,255,0.95)');
    }
    if (near && !state.busy) bubble(near.x, `${touch ? 'Talk' : 'E'} · ${near.who.name}`, t, near.kind === 'crush' ? '#e8417a' : '#3a5aa8');
  }

  // late-afternoon light
  if (q > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255,140,90,${q * 0.4})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  fx.update(dt, state.started);
  requestAnimationFrame(frame);
}

/* --------------------------------------------------------- start & select */
const track = new Audio(MUSIC_URL);
track.loop = true;
track.volume = 0;
function fadeTrack(to, ms = 2500) {
  const from = track.volume, start = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - start) / ms);
    track.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function buildRoster() {
  const roster = $('roster');
  const px = Math.round(110 * Math.min(window.devicePixelRatio || 1, 2));
  for (const f of FRIENDS) {
    const b = document.createElement('button');
    b.type = 'button';
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    chibi(cv.getContext('2d'), { x: px * 0.47, y: px * 1.12, k: px / 100, face: 1, look: f.look, t: 0, phase: 0, moving: false, seed: 1, portrait: true });
    const name = document.createElement('b');
    name.textContent = f.name;
    const role = document.createElement('small');
    role.textContent = f.role;
    b.append(cv, name, role);
    b.addEventListener('click', () => pick(f));
    roster.append(b);
  }
}

async function pick(f) {
  state.me = f;
  $('select').hidden = true;
  $('hud').hidden = false;
  if (touch) $('pad').hidden = false;
  state.started = true;
  state.x = 400;
  // the whole squad gathers in the classroom for the pact
  friendsHere = FRIENDS.filter((x) => x !== f).map((x, i) => ({ f: x, x: 90 + i * 62 + (i > 4 ? 130 : 0), face: i % 2 ? -1 : 1 }));
  updateHud();
  await eyecatch();
  const me = f.name;
  await say('', 'Five days before graduation. Class 12-A, lunch break.');
  await say(other('Ghanim', 'Lindan'), 'Alright, everyone. The pact. Say it with me.');
  await say(other('Ghiffy', 'Arkan'), 'EVERYONE GETS A CRUSH BEFORE COLLEGE!');
  await say(other('Aboi', 'Zubair'), 'And whoever doesn’t…');
  await say(other('Hamzah', 'Qai'), '…treats the whole squad to bakso. Extra meatballs.');
  await say(other('Lindan', 'Nizam'), `${me}, you go first. Don’t make us eat for free. …Actually, do.`);
  await say(me, '…Why does this feel like a trap?');
  await say('', 'Friends give advice for free. Each talk with a crush (♥) takes your whole lunch break or afternoon. On Friday afternoon, you confess.');
  closeDialog();
  placeFriends();
  state.busy = false;
}

$('start').addEventListener('click', (e) => {
  e.currentTarget.blur();
  $('intro').classList.add('gone');
  $('select').hidden = false;
  $('sound').hidden = false;
  song.start();
  track.play().then(() => fadeTrack(0.65)).catch(() => {
    song.music = true; // no recording: play the built-in song
    song.ctx && song.ctx.close();
    song.ctx = null;
    song.start();
  });
});

const soundBtn = $('sound');
soundBtn.addEventListener('click', () => {
  const on = soundBtn.getAttribute('aria-pressed') === 'true';
  soundBtn.setAttribute('aria-pressed', String(!on));
  soundBtn.setAttribute('aria-label', on ? 'Play music' : 'Mute music');
  song.setMuted(on);
  fadeTrack(on ? 0 : 0.65, 400);
});
$('replay').addEventListener('click', () => location.reload());
$('again').addEventListener('click', () => location.reload());

window.addEventListener('resize', resize);
resize();
buildRoster();
requestAnimationFrame(frame);
