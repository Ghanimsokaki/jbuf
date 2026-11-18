/**
 * Anime bust portraits, drawn in code: the close-ups shown during
 * conversations, on character cards and on the select screen.
 *
 * drawPortrait(ctx, w, h, look, opts) paints a front-facing, cel-shaded
 * head-and-shoulders portrait with line art, big glossy eyes, a hair shine
 * band and an expression.
 *
 * opts: { expr, talking, t, seed, fx }
 *   expr: normal | happy | blush | surprised | sad | annoyed | smug | sleepy
 *   fx:   sparkle | sweat | anger | heart (little extras drawn on top)
 */

const hexCache = new Map();
function rgb(h) {
  if (!hexCache.has(h)) {
    const n = parseInt(h.slice(1), 16);
    hexCache.set(h, [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  return hexCache.get(h);
}
function shade(h, k) {
  const [r, g, b] = rgb(h);
  const f = (v) => Math.round(Math.max(0, Math.min(255, k < 1 ? v * k : v + (255 - v) * (k - 1))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const line = (h) => shade(h, 0.45); // line art: a deep version of the fill

/** the portrait is laid out on a 400 × 520 grid and scaled to fit */
const GW = 400, GH = 520;

export function drawPortrait(c, w, h, L, o = {}) {
  const t = o.t || 0;
  const expr = o.expr || (L.sleepy ? 'sleepy' : 'normal');
  const seed = o.seed || 0;
  const girl = !!L.girl;
  c.save();
  const k = Math.min(w / GW, h / GH);
  c.translate((w - GW * k) / 2, h - GH * k);
  c.scale(k, k);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  const breathe = Math.sin(t * 1.6 + seed) * 2;
  const sway = Math.sin(t * 1.1 + seed) * 4; // hair in the breeze

  if (o.fx === 'sparkle' || o.fx === 'heart') sparkles(c, t, o.fx === 'heart');

  /* ---------- hair behind the head ---------- */
  c.save();
  c.translate(0, breathe * 0.4);
  backHair(c, L, sway);
  c.restore();

  /* ---------- shoulders ---------- */
  c.save();
  c.translate(0, breathe);
  body(c, L);
  c.restore();

  /* ---------- head ---------- */
  c.save();
  c.translate(0, breathe * 0.6);
  const skin = L.skin;
  // ears
  if (!girl || ['ponytail', 'bun', 'pixie'].includes(L.style)) {
    for (const s of [-1, 1]) {
      c.fillStyle = skin;
      c.strokeStyle = line(skin);
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(200 + s * 96, 238, 13, 22, s * 0.15, 0, Math.PI * 2);
      c.fill(); c.stroke();
    }
  }
  // face
  c.beginPath();
  c.moveTo(104, 215);
  c.bezierCurveTo(100, 120, 300, 120, 296, 215);
  c.bezierCurveTo(296, 268, 262, 318, 200, 338);
  c.bezierCurveTo(138, 318, 104, 268, 104, 215);
  c.closePath();
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = line(skin);
  c.lineWidth = 3.5;
  c.stroke();
  // shadow under the fringe and down one side of the jaw
  c.save();
  c.clip();
  c.fillStyle = shade(skin, 0.86);
  c.beginPath();
  c.moveTo(90, 150);
  for (let x = 90; x <= 310; x += 20) c.lineTo(x, 215 + Math.sin(x * 0.09) * 9);
  c.lineTo(310, 100); c.lineTo(90, 100);
  c.fill();
  c.beginPath(); c.moveTo(104, 230); c.bezierCurveTo(112, 290, 150, 322, 196, 338); c.lineTo(120, 340); c.fill();
  c.restore();

  face(c, L, expr, o.talking, t, seed);
  frontHair(c, L, sway, t);
  brows(c, L, expr);
  if (L.glasses) glasses(c);
  accessories(c, L, sway);
  if (o.fx === 'sweat') sweat(c, t);
  if (o.fx === 'anger') anger(c);
  c.restore();
  c.restore();
}

/* ------------------------------------------------------------------ body */
function body(c, L) {
  const top = L.top, sh = L.topSh || shade(top, 0.82);
  // neck
  c.fillStyle = shade(L.skin, 0.9);
  c.strokeStyle = line(L.skin);
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(176, 318); c.lineTo(174, 372); c.lineTo(226, 372); c.lineTo(224, 318); c.fill(); c.stroke();
  // shoulders
  c.beginPath();
  c.moveTo(20, 520);
  c.bezierCurveTo(30, 430, 70, 392, 150, 374);
  c.quadraticCurveTo(200, 390, 250, 374);
  c.bezierCurveTo(330, 392, 370, 430, 380, 520);
  c.closePath();
  const g = c.createLinearGradient(20, 0, 380, 0);
  g.addColorStop(0, sh);
  g.addColorStop(0.35, top);
  g.addColorStop(1, top);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = line(top === '#ffffff' ? '#c8ccd8' : top);
  c.lineWidth = 3.5;
  c.stroke();
  // collar
  const collar = L.collar || (top === '#ffffff' ? '#ffffff' : null);
  if (collar || L.shirtUnder) {
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#a8aec0';
    c.lineWidth = 3;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(200, 400);
      c.lineTo(200 + s * 48, 368);
      c.lineTo(200 + s * 62, 398);
      c.closePath();
      c.fill(); c.stroke();
    }
  } else {
    // hoodie / jersey neckline
    c.strokeStyle = shade(top, 0.6);
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(160, 378); c.quadraticCurveTo(200, 410, 240, 378); c.stroke();
  }
  if (L.tie) {
    c.fillStyle = L.tie;
    c.strokeStyle = line(L.tie);
    c.lineWidth = 2.5;
    if (L.girl) {
      // a ribbon bow at the collar
      c.beginPath();
      c.moveTo(200, 404); c.lineTo(168, 390); c.lineTo(170, 420); c.closePath();
      c.moveTo(200, 404); c.lineTo(232, 390); c.lineTo(230, 420); c.closePath();
      c.fill(); c.stroke();
      c.beginPath(); c.arc(200, 405, 7, 0, Math.PI * 2); c.fill(); c.stroke();
    } else {
      c.beginPath(); c.moveTo(192, 400); c.lineTo(208, 400); c.lineTo(212, 470); c.lineTo(200, 484); c.lineTo(188, 470); c.closePath(); c.fill(); c.stroke();
    }
  }
  if (L.apron) {
    c.strokeStyle = L.apron;
    c.lineWidth = 12;
    c.beginPath(); c.moveTo(140, 380); c.lineTo(150, 520); c.moveTo(260, 380); c.lineTo(250, 520); c.stroke();
  }
  if (L.number) {
    c.fillStyle = '#ffffff';
    c.font = '900 64px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(L.number, 290, 470);
  }
  if (L.camera) {
    c.strokeStyle = '#2a2a38'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(150, 378); c.lineTo(260, 500); c.stroke();
  }
  if (L.headphones && !L.girl) {
    // the band rests around the neck when not on the head? keep it on the head (see accessories)
  }
}

/* ------------------------------------------------------------------ face */
function face(c, L, expr, talking, t, seed) {
  const girl = !!L.girl;
  const blink = Math.sin(t * 1.3 + seed * 1.7) > 0.982;
  // a younger, softer face gets bigger eyes
  const ew = girl ? 54 : L.young ? 52 : 46, eh = girl ? 62 : L.young ? 58 : 50;
  const ey = 246;
  const look = expr === 'blush' ? 7 : 0;
  for (const s of [-1, 1]) {
    eye(c, 200 + s * 46, ey, ew, eh, s, L, blink ? 'closed' : expr, look, girl);
  }
  // blush
  const strong = expr === 'blush' || expr === 'happy';
  c.fillStyle = `rgba(255,110,140,${strong ? 0.45 : 0.22})`;
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(200 + s * 58, 288, 26, 11, 0, 0, Math.PI * 2); c.fill(); }
  if (expr === 'blush') {
    c.strokeStyle = 'rgba(230,70,110,0.75)';
    c.lineWidth = 2.5;
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = 200 + s * 46 + i * 9 * s - s * 10;
      c.beginPath(); c.moveTo(x, 294); c.lineTo(x + 7, 282); c.stroke();
    }
  }
  // nose
  c.strokeStyle = line(L.skin);
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(206, 284); c.lineTo(202, 292); c.stroke();
  mouth(c, L, expr, talking, t);
}

function eye(c, cx, cy, ew, eh, side, L, state, look, girl) {
  const dark = '#2a1a2e';
  if (state === 'closed' || state === 'happy') {
    c.strokeStyle = dark;
    c.lineWidth = girl ? 6 : 5;
    c.beginPath();
    if (state === 'happy') { c.moveTo(cx - ew / 2, cy + 6); c.quadraticCurveTo(cx, cy - eh * 0.45, cx + ew / 2, cy + 6); }
    else { c.moveTo(cx - ew / 2, cy); c.quadraticCurveTo(cx, cy + eh * 0.25, cx + ew / 2, cy); }
    c.stroke();
    if (girl && state === 'happy') {
      c.beginPath(); c.moveTo(cx + side * ew / 2, cy + 6); c.lineTo(cx + side * (ew / 2 + 9), cy - 2); c.stroke();
    }
    return;
  }
  const wide = state === 'surprised';
  const half = state === 'annoyed' || state === 'sleepy' || state === 'smug' ? 0.45 : state === 'sad' ? 0.25 : 0;
  const rx = ew / 2 * (wide ? 1.05 : 1), ry = eh / 2 * (wide ? 1.1 : 1);
  // white of the eye, a soft rounded shape
  c.save();
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = '#ffffff';
  c.fill();
  c.clip();
  // iris
  const iris = L.iris || '#6a4a8a';
  const ix = cx + look + side * 1.5, iy = cy + ry * 0.12;
  const irx = rx * (wide ? 0.6 : 0.78), iry = ry * (wide ? 0.62 : 0.86);
  const g = c.createLinearGradient(0, iy - iry, 0, iy + iry);
  g.addColorStop(0, shade(iris, 0.35));
  g.addColorStop(0.45, iris);
  g.addColorStop(1, shade(iris, 1.55));
  c.fillStyle = g;
  c.beginPath(); c.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = shade(iris, 0.3);
  c.lineWidth = 2.5;
  c.stroke();
  // pupil
  c.fillStyle = shade(iris, 0.2);
  c.beginPath(); c.ellipse(ix, iy - 2, irx * 0.42, iry * 0.5, 0, 0, Math.PI * 2); c.fill();
  // glints
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(ix - irx * 0.35, iy - iry * 0.38, irx * 0.32, iry * 0.26, -0.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(ix + irx * 0.4, iy + iry * 0.42, irx * 0.14, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.ellipse(ix, iy + iry * 0.55, irx * 0.6, iry * 0.25, 0, 0, Math.PI * 2); c.fill();
  // a heavy lid for tired or annoyed looks
  if (half > 0) {
    c.fillStyle = L.skin;
    c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 * half + 2);
  }
  // shadow from the upper lid
  c.fillStyle = 'rgba(60,30,60,0.18)';
  c.fillRect(cx - rx, cy - ry + ry * 2 * half, rx * 2, ry * 0.35);
  c.restore();
  // upper lash line
  const lidY = cy - ry + ry * 2 * half;
  c.strokeStyle = dark;
  c.lineWidth = girl ? 6.5 : 5;
  c.beginPath();
  if (half > 0) { c.moveTo(cx - rx - 2, lidY); c.quadraticCurveTo(cx, lidY - 4, cx + rx + 2, lidY + (state === 'sad' ? 6 * side : 0)); }
  else c.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
  c.stroke();
  if (girl) {
    // the flick of lashes at the outer corner
    c.fillStyle = dark;
    const ox = cx + side * rx * 0.95, oy = half > 0 ? lidY : cy - ry * 0.45;
    c.beginPath(); c.moveTo(ox - side * 8, oy - 2); c.lineTo(ox + side * 13, oy - 12); c.lineTo(ox + side * 4, oy + 6); c.fill();
  }
  // lower lash
  c.strokeStyle = shade('#2a1a2e', 1.6);
  c.lineWidth = 2.5;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI * (side > 0 ? 0.12 : 0.62), Math.PI * (side > 0 ? 0.38 : 0.88)); c.stroke();
}

function mouth(c, L, expr, talking, t) {
  const open = talking && Math.sin(t * 16) > -0.2;
  c.strokeStyle = '#7a3040';
  c.lineWidth = 3;
  c.fillStyle = '#9a3048';
  const mx = 200, my = 308;
  c.beginPath();
  if (expr === 'happy' || (expr === 'smug' && open)) {
    c.moveTo(mx - 18, my - 3); c.quadraticCurveTo(mx, my + (open ? 22 : 18), mx + 18, my - 3); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#ff8aa0';
    c.beginPath(); c.ellipse(mx, my + 8, 8, 4, 0, 0, Math.PI * 2); c.fill();
  } else if (expr === 'surprised') {
    c.ellipse(mx, my + 2, 8, open ? 11 : 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (open) {
    c.ellipse(mx, my + 2, 10, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (expr === 'sad') {
    c.moveTo(mx - 12, my + 5); c.quadraticCurveTo(mx, my - 4, mx + 12, my + 5); c.stroke();
  } else if (expr === 'annoyed') {
    c.moveTo(mx - 12, my + 2); c.lineTo(mx + 12, my); c.stroke();
  } else if (expr === 'blush') {
    c.moveTo(mx - 12, my); c.quadraticCurveTo(mx - 6, my + 5, mx, my); c.quadraticCurveTo(mx + 6, my - 5, mx + 12, my); c.stroke();
  } else if (expr === 'smug') {
    c.moveTo(mx - 12, my + 2); c.quadraticCurveTo(mx + 4, my + 8, mx + 14, my - 4); c.stroke();
  } else {
    c.moveTo(mx - 12, my); c.quadraticCurveTo(mx, my + 8, mx + 12, my); c.stroke();
  }
}

function brows(c, L, expr) {
  c.strokeStyle = shade(L.hair, 0.7);
  c.lineWidth = L.girl ? 4 : 5.5;
  for (const s of [-1, 1]) {
    const x = 200 + s * 46, y = 206;
    let inner = 0, outer = 0;
    if (expr === 'sad' || expr === 'blush') { inner = -9; outer = 4; }
    if (expr === 'annoyed') { inner = 8; outer = -5; }
    if (expr === 'surprised') { inner = -10; outer = -10; }
    if (expr === 'smug') { inner = s > 0 ? -6 : 3; outer = s > 0 ? -8 : 0; }
    c.beginPath();
    c.moveTo(x - s * 4 - s * -20 * 0 + -s * 18 * -1 * 0, y);
    c.moveTo(200 + s * 22, y + inner);
    c.quadraticCurveTo(x, y - 6 + (inner + outer) / 2, 200 + s * 70, y + outer + 2);
    c.stroke();
  }
}

function glasses(c) {
  c.strokeStyle = '#3a3050';
  c.lineWidth = 4;
  for (const s of [-1, 1]) {
    c.beginPath(); c.roundRect(200 + s * 46 - 36, 214, 72, 62, 18); c.stroke();
    c.save();
    c.globalAlpha = 0.35;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(200 + s * 46 + 12, 222); c.lineTo(200 + s * 46 + 26, 236); c.stroke();
    c.restore();
  }
  c.beginPath(); c.moveTo(190, 236); c.quadraticCurveTo(200, 230, 210, 236); c.stroke();
}

/* ------------------------------------------------------------------ hair */
function hairPaint(c, L) {
  c.fillStyle = L.hair;
  c.strokeStyle = line(L.hair);
  c.lineWidth = 3.5;
}

function backHair(c, L, sway) {
  hairPaint(c, L);
  const st = L.style;
  if (st === 'long') {
    c.beginPath();
    c.moveTo(96, 190);
    c.bezierCurveTo(70, 300, 50 + sway, 430, 40 + sway, 520);
    c.lineTo(360 + sway, 520);
    c.bezierCurveTo(350 + sway, 430, 330, 300, 304, 190);
    c.closePath();
    c.fill(); c.stroke();
  }
  if (st === 'bob') {
    c.beginPath();
    c.moveTo(94, 190);
    c.bezierCurveTo(70, 270, 86, 330, 120 + sway * 0.5, 344);
    c.lineTo(280 + sway * 0.5, 344);
    c.bezierCurveTo(314, 330, 330, 270, 306, 190);
    c.closePath();
    c.fill(); c.stroke();
  }
  if (st === 'ponytail') {
    c.beginPath();
    c.moveTo(270, 120);
    c.bezierCurveTo(360 + sway, 140, 370 + sway * 2, 280, 330 + sway * 2.5, 400);
    c.bezierCurveTo(340 + sway, 300, 320, 190, 250, 140);
    c.closePath();
    c.fill(); c.stroke();
  }
  if (st === 'twintails') {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(200 + s * 92, 150);
      c.bezierCurveTo(200 + s * 170, 170, 200 + s * 180 + sway, 320, 200 + s * 150 + sway * 1.6, 450);
      c.bezierCurveTo(200 + s * 140 + sway, 340, 200 + s * 130, 230, 200 + s * 84, 190);
      c.closePath();
      c.fill(); c.stroke();
    }
  }
  if (st === 'bun' || st === 'pixie' || st === 'braid') {
    c.beginPath();
    c.ellipse(200, 205, 108, 112, 0, Math.PI * 0.85, Math.PI * 2.15);
    c.fill();
  }
  if (st === 'bun') {
    c.beginPath(); c.arc(200, 88, 42, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = shade(L.hair, 1.5);
    c.lineWidth = 3;
    c.beginPath(); c.arc(200, 88, 26, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
  }
}

function frontHair(c, L, sway, t) {
  const st = L.style;
  const girl = !!L.girl;
  hairPaint(c, L);
  if (st === 'buzz') {
    c.beginPath();
    c.moveTo(102, 196);
    c.bezierCurveTo(98, 92, 302, 92, 298, 196);
    c.quadraticCurveTo(250, 160, 200, 162);
    c.quadraticCurveTo(150, 160, 102, 196);
    c.fill(); c.stroke();
    return;
  }
  // the cap of hair over the head
  c.beginPath();
  c.moveTo(96, 236);
  c.bezierCurveTo(70, 70, 330, 70, 304, 236);
  // fringe: strands hanging over the forehead, right to left
  const parted = st === 'parted';
  const tips = girl
    ? [[300, 236], [280, 200], [262, 222], [240, 186], [222, 218], [200, 182], [180, 216], [160, 186], [140, 222], [120, 196], [100, 236]]
    : parted
      ? [[302, 230], [284, 196], [266, 214], [244, 176], [222, 200], [196, 170], [170, 204], [146, 182], [124, 214], [100, 230]]
      : [[302, 230], [282, 192], [264, 214], [242, 180], [222, 210], [200, 178], [178, 210], [156, 182], [134, 214], [116, 194], [100, 230]];
  for (let i = 0; i < tips.length; i++) {
    const [x, y] = tips[i];
    const dy = i % 2 === 0 ? 0 : Math.sin(t * 2 + i) * 1.5;
    const [px, py] = i ? tips[i - 1] : [304, 236];
    c.quadraticCurveTo((px + x) / 2, (py + y) / 2 - (i % 2 ? 10 : -12), x, y + dy);
  }
  c.closePath();
  c.fill();
  c.stroke();

  // side locks framing the face
  const lockEnd = girl ? (st === 'bob' ? 320 : st === 'pixie' ? 290 : 350) : 262;
  for (const s of [-1, 1]) {
    c.beginPath();
    const x0 = 200 + s * 100;
    c.moveTo(x0, 190);
    c.bezierCurveTo(200 + s * 112, 250, 200 + s * 104 + sway * 0.4, lockEnd - 30, 200 + s * 92 + sway * 0.5, lockEnd);
    c.bezierCurveTo(200 + s * 84, lockEnd - 40, 200 + s * 82, 240, 200 + s * 74, 200);
    c.closePath();
    c.fill(); c.stroke();
  }

  // extra shapes per style
  if (st === 'spiky') {
    for (const [x, y, x2, y2] of [[120, 120, 92, 72], [160, 98, 150, 44], [210, 92, 226, 36], [252, 104, 290, 60], [286, 132, 330, 108]]) {
      c.beginPath(); c.moveTo(x - 20, y + 34); c.lineTo(x2 + sway * 0.3, y2 + 14); c.lineTo(x + 22, y + 26); c.closePath(); c.fill(); c.stroke();
    }
  }
  if (st === 'messy') {
    for (const [x, y, x2, y2] of [[150, 96, 128, 66], [214, 88, 236, 56], [270, 116, 304, 96]]) {
      c.beginPath(); c.moveTo(x - 12, y + 10); c.quadraticCurveTo(x, y - 10, x2 + sway * 0.4, y2); c.quadraticCurveTo(x + 6, y, x + 14, y + 8); c.closePath(); c.fill(); c.stroke();
    }
  }
  if (st === 'curly') {
    for (const [x, y, r] of [[110, 150, 30], [140, 112, 32], [182, 96, 32], [226, 96, 32], [266, 112, 32], [292, 150, 30], [104, 196, 22], [298, 196, 22]]) {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }
  if (st === 'parted') {
    c.beginPath(); c.moveTo(196, 110); c.quadraticCurveTo(260, 80, 300, 150); c.quadraticCurveTo(250, 120, 210, 130); c.closePath(); c.fill(); c.stroke();
  }
  if (st === 'braid') {
    // one braid over the front shoulder
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.ellipse(282 + i * 4 + sway * (i / 7), 300 + i * 30, 22 - i, 18, 0.3, 0, Math.PI * 2);
      c.fill(); c.stroke();
    }
    c.fillStyle = '#ffcf3f';
    c.beginPath(); c.arc(312 + sway, 512, 9, 0, Math.PI * 2); c.fill();
    hairPaint(c, L);
  }

  // the shiny "angel ring" highlight on the hair
  c.save();
  c.beginPath();
  c.moveTo(96, 236);
  c.bezierCurveTo(70, 70, 330, 70, 304, 236);
  c.closePath();
  c.clip();
  c.strokeStyle = shade(L.hair, L.hairShine || 2.2);
  c.globalAlpha = 0.4;
  c.lineWidth = 8;
  c.setLineDash([20, 16]);
  c.beginPath();
  c.ellipse(200, 168, 92, 52, 0, Math.PI * 1.08, Math.PI * 1.92);
  c.stroke();
  c.restore();
}

function accessories(c, L, sway) {
  if (L.style === 'cap') {
    c.fillStyle = L.cap;
    c.strokeStyle = line(L.cap);
    c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(94, 170); c.bezierCurveTo(90, 66, 310, 66, 306, 170); c.quadraticCurveTo(200, 150, 94, 170); c.fill(); c.stroke();
    // backwards cap: the strap shows at the front
    c.fillStyle = shade(L.cap, 0.8);
    c.beginPath(); c.roundRect(170, 150, 60, 14, 6); c.fill(); c.stroke();
  }
  if (L.style === 'beanie') {
    c.fillStyle = L.beanie;
    c.strokeStyle = line(L.beanie);
    c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(92, 176); c.bezierCurveTo(86, 50, 314, 50, 308, 176); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(L.beanie, 0.75);
    c.beginPath(); c.roundRect(88, 150, 224, 34, 14); c.fill(); c.stroke();
  }
  if (L.headphones) {
    c.strokeStyle = '#2a2a38';
    c.lineWidth = 12;
    c.beginPath(); c.ellipse(200, 190, 112, 116, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.fillStyle = L.headphones;
    c.strokeStyle = line(L.headphones);
    c.lineWidth = 3.5;
    for (const s of [-1, 1]) { c.beginPath(); c.roundRect(200 + s * 104 - 20, 200, 40, 62, 16); c.fill(); c.stroke(); }
  }
  if (L.ribbon) {
    // hair bows (twin tails get two)
    const spots = L.style === 'twintails' ? [[-1, 150], [1, 150]] : L.style === 'ponytail' ? [[1, 128]] : [[1, 120]];
    c.fillStyle = L.ribbon;
    c.strokeStyle = line(L.ribbon);
    c.lineWidth = 3;
    for (const [s, y] of spots) {
      const x = 200 + s * (L.style === 'ponytail' ? 70 : 96);
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x - 28, y - 18); c.lineTo(x - 26, y + 18); c.closePath();
      c.moveTo(x, y); c.lineTo(x + 28, y - 18); c.lineTo(x + 26, y + 18); c.closePath();
      c.fill(); c.stroke();
      c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }
  if (L.clip) {
    // a star hair clip
    c.fillStyle = L.clip;
    c.strokeStyle = line(L.clip);
    c.lineWidth = 2.5;
    const cx = 132, cy = 176, R = 15, r = 6.5;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); c.stroke();
  }
}

/* ---------------------------------------------------------- little extras */
function sparkles(c, t, hearts) {
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4 + t * 0.4;
    const x = 200 + Math.cos(a) * (140 + (i % 3) * 30);
    const y = 230 + Math.sin(a * 1.3) * 170;
    const s = 6 + (i % 4) * 4 + Math.sin(t * 4 + i) * 3;
    c.fillStyle = i % 3 === 0 ? 'rgba(255,170,200,0.75)' : 'rgba(255,255,255,0.85)';
    c.beginPath();
    if (hearts && i % 2) {
      c.moveTo(x, y + s * 0.8); c.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.8, y - s * 1.2, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.8, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
    } else {
      c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s);
    }
    c.fill();
  }
  // soft bubbles, shoujo-manga style
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 60 + Math.sin(t + i) * 10, y = 120 + ((i * 97 + t * 30) % 300);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 10 + (i % 3) * 6, 0, Math.PI * 2); c.stroke();
  }
}
function sweat(c, t) {
  const y = 150 + (t * 20) % 20;
  c.fillStyle = 'rgba(160,210,255,0.95)';
  c.strokeStyle = '#4a8ad8';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(300, y); c.quadraticCurveTo(318, y + 30, 300, y + 40); c.quadraticCurveTo(282, y + 30, 300, y); c.fill(); c.stroke();
}
function anger(c) {
  c.strokeStyle = '#e8304f';
  c.lineWidth = 6;
  const x = 280, y = 128;
  for (const [a, b] of [[[-16, -4], [-4, -4]], [[4, -4], [16, -4]], [[-16, 6], [-4, 6]], [[4, 6], [16, 6]]]) {
    c.beginPath(); c.moveTo(x + a[0], y + a[1]); c.quadraticCurveTo(x, y + (a[1] < 0 ? -12 : 14), x + b[0], y + b[1]); c.stroke();
  }
}

/**
 * Draws a character using real illustrated art when it has loaded, falling
 * back to the drawn-in-code portrait otherwise. The art is a cut-out bust; it
 * breathes gently, bobs while talking, and gets the same sparkle, sweat and
 * anger effects as the code-drawn faces.
 */
export function drawCharacter(c, w, h, L, art, o = {}) {
  if (!art || !art.complete || !art.naturalWidth) return drawPortrait(c, w, h, L, o);
  const t = o.t || 0;
  const breathe = 1 + Math.sin(t * 1.6 + (o.seed || 0)) * 0.006;
  const bob = o.talking ? Math.abs(Math.sin(t * 9)) * 3 : 0;
  const k = Math.min((h * (o.fill || 0.98)) / art.naturalHeight, w / art.naturalWidth);
  const dw = art.naturalWidth * k * breathe, dh = art.naturalHeight * k * breathe;
  c.save();
  c.translate(w / 2, h);
  if (o.flip) c.scale(-1, 1);
  c.drawImage(art, -dw / 2, -dh - bob, dw, dh);
  c.restore();
  if (o.expr === 'blush') {
    c.save();
    c.fillStyle = 'rgba(255,90,130,0.16)';
    c.beginPath(); c.ellipse(w / 2, h - dh * 0.66, dw * 0.22, dh * 0.05, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  if (o.fx) {
    c.save();
    const g = Math.min(w / GW, h / GH);
    c.translate((w - GW * g) / 2, h - GH * g);
    c.scale(g, g);
    if (o.fx === 'sparkle' || o.fx === 'heart') sparkles(c, t, o.fx === 'heart');
    if (o.fx === 'sweat') sweat(c, t);
    if (o.fx === 'anger') anger(c);
    c.restore();
  }
}
