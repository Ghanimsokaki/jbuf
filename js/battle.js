/**
 * The bully battles. Turn-based: pick an action, then dodge their attacks
 * with your heart inside the box. Each bully has their own attacks, ACT
 * options and lines; the last one has a second phase.
 * The battle music is an original chiptune piece made with Web Audio,
 * with a faster "finale" arrangement for the last fight.
 */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ------------------------------------------------------------ the music */
// A minor: Am – F – G – E, square-wave lead, pulse arpeggio, octave bass
// and a noise drum kit. The finale plays it faster, a fourth higher, with
// a counter-melody and double-time hats.
const PROG = [
  { bass: 45, arp: [57, 60, 64] },
  { bass: 41, arp: [53, 57, 60] },
  { bass: 43, arp: [55, 59, 62] },
  { bass: 40, arp: [52, 56, 59] },
];
// [midi, start in sixteenths, length in sixteenths], one array per bar
const LEAD = [
  [[69, 0, 2], [72, 2, 2], [76, 4, 2], [81, 6, 1], [79, 7, 1], [76, 8, 2], [72, 10, 2], [74, 12, 2], [76, 14, 2]],
  [[77, 0, 3], [76, 3, 1], [72, 4, 2], [69, 6, 2], [72, 8, 4], [77, 12, 2], [81, 14, 2]],
  [[79, 0, 2], [74, 2, 2], [71, 4, 2], [79, 6, 2], [81, 8, 2], [83, 10, 2], [86, 12, 4]],
  [[80, 0, 4], [76, 4, 2], [71, 6, 2], [68, 8, 4], [71, 12, 2], [74, 14, 2]],
  [[81, 0, 2], [76, 2, 1], [81, 3, 1], [84, 4, 2], [83, 6, 2], [81, 8, 2], [79, 10, 2], [76, 12, 4]],
  [[77, 0, 2], [81, 2, 2], [84, 4, 4], [83, 8, 2], [81, 10, 2], [77, 12, 2], [72, 14, 2]],
  [[83, 0, 2], [81, 2, 2], [79, 4, 2], [74, 6, 2], [79, 8, 4], [83, 12, 4]],
  [[88, 0, 8], [86, 8, 2], [83, 10, 2], [80, 12, 4]],
];
// the finale's counter-melody, long notes under the lead
const COUNTER = [[64, 0, 8], [60, 8, 8], [65, 0, 8], [64, 8, 8], [62, 0, 8], [67, 8, 8], [64, 0, 16]];

class BattleMusic {
  constructor(muted, finale) {
    this.muted = muted;
    this.finale = finale;
    this.step16 = 60 / (finale ? 186 : 168) / 4;
    this.key = finale ? 5 : 0;
  }
  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : 0.2;
    this.out.connect(ctx.destination);
    const len = ctx.sampleRate * 0.4;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.step = 0;
    this.next = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  tone(type, freq, t, dur, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  drum(t, kind) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g).connect(this.out);
      o.start(t); o.stop(t + 0.16);
      return;
    }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise;
    f.type = kind === 'snare' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'snare' ? 1800 : 7000;
    const dur = kind === 'snare' ? 0.14 : 0.04;
    g.gain.setValueAtTime(kind === 'snare' ? 0.5 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.out);
    s.start(t); s.stop(t + dur + 0.01);
  }
  schedule() {
    const ctx = this.ctx, k = this.key, STEP = this.step16;
    while (this.next < ctx.currentTime + 0.12) {
      const t = this.next, s = this.step;
      const bar = Math.floor(s / 16) % 8, i = s % 16;
      const ch = PROG[bar % 4];
      if (i % 2 === 0) this.tone('square', hz(ch.bass + k + (i % 4 === 2 ? 12 : 0)), t, STEP * 1.8, 0.16);
      this.tone('square', hz(ch.arp[i % 3] + k + 12), t, STEP * 0.9, 0.035);
      for (const [m, at, l] of LEAD[bar]) if (at === i) this.tone('square', hz(m + k), t, STEP * l * 0.95, 0.09);
      if (this.finale) {
        const c = COUNTER[bar % COUNTER.length];
        if (c[1] === i) this.tone('triangle', hz(c[0] + k), t, STEP * c[2] * 0.95, 0.12);
        if (i % 2 === 1) this.drum(t, 'hat');
      }
      if (i === 0 || i === 8 || (bar % 2 && i === 10) || (this.finale && i === 14)) this.drum(t, 'kick');
      if (i === 4 || i === 12) this.drum(t, 'snare');
      if (i % 2 === 0) this.drum(t, 'hat');
      this.next += STEP;
      this.step++;
    }
  }
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.2; }
  async stop() {
    if (!this.ctx) return;
    clearInterval(this.timer);
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    await wait(900);
    this.ctx.close();
    this.ctx = null;
  }
  hit() { if (this.ctx && !this.muted) this.tone('sawtooth', 110, this.ctx.currentTime, 0.18, 0.25); }
  blip() { if (this.ctx && !this.muted) this.tone('square', 880, this.ctx.currentTime, 0.05, 0.05); }
  power() { if (this.ctx && !this.muted) for (let k = 0; k < 6; k++) this.tone('square', hz(57 + k * 5), this.ctx.currentTime + k * 0.07, 0.12, 0.08); }
}

/* ------------------------------------------------------------ the bullies */
export const FOES = {
  bagas: {
    name: 'BAGAS', portrait: './art/bagas.webp', conf: 45, dmg: 4, speed: 1,
    patterns: ['rain', 'sides', 'balls', 'wall', 'homing', 'spotlight'],
    words: ['LOSER', 'NERD', 'HA!', 'WEAK', 'LOL', 'NOOB', 'CRINGE'],
    intro: (c) => `* Bagas blocks the way out. He wants ${c} for himself.`,
    opener: 'She’s MINE, nerd. Get lost.',
    taunts: ['Ha! YOU? Talking to HER?', 'I’ve got a car. Well. My mom’s car.', 'Everyone says I’m the coolest guy in school!', 'Why are you still standing?!', 'Dodge THIS!', 'Whatever, nerd!'],
    soft: '…Nobody’s ever been nice to me before.',
    comebacks: ['“Nice jacket. Did it come with a personality?”', '“You’re not tall, Bagas. You’re just loud.”', '“Even the vending machine likes me more than you.”', '“She’s not a trophy, Bagas.”', '“Is that your final form?”', '“Your hair gel has more confidence than you.”'],
    check: (s) => `* BAGAS — CONFIDENCE ${s}. Thinks he’s cool. Is secretly scared of cats.`,
    acts: [
      { label: 'Stand tall', conf: 4, mercy: 15, trait: 'bravery', text: '* You stand tall and look him right in the eye. Bagas takes a step back.' },
      { label: 'Compliment him', mercy: 22, trait: 'kindness', text: '* You tell Bagas his hair looks great. He… was not ready for that.', reply: 'W-what?! …Really?' },
      { label: 'Make her laugh', mercy: 15, trait: 'integrity', text: '* You tell a terrible bakso joke. She laughs so hard she snorts. Bagas looks lost.' },
      { label: 'Ignore him', conf: 3, mercy: 10, trait: 'patience', text: '* You ignore Bagas and check your phone. He HATES being ignored.', reply: 'HEY! Look at me!' },
    ],
    spare: (me) => `…You’re alright, ${me}. Treat her well.`,
    beaten: 'I-I’m telling my mom!!',
  },
  kevin: {
    name: 'KEVIN', portrait: './art/kevin.webp', conf: 55, dmg: 4, speed: 1.15,
    patterns: ['balls', 'dunk', 'sides', 'homing', 'spotlight', 'rain'],
    words: ['AIRBALL', 'BENCH', 'SWISH', 'BRICK', 'L', 'TRASH'],
    intro: (c) => `* Kevin, Bagas’s cousin, is spinning a basketball in front of ${c}.`,
    opener: 'You embarrassed my cousin. Now I embarrass YOU.',
    taunts: ['I’m the captain. You’re the BENCH.', 'Catch! …Oh wait, you can’t.', 'She only likes winners.', 'I’ve never missed a dunk in my life!', 'Full-court PRESS!', 'Bagas said you were soft…'],
    soft: '…Bagas said you were actually cool. Ugh. Maybe he’s right.',
    comebacks: ['“You spin the ball because you can’t shoot it.”', '“Captain? Of the BENCH?”', '“My grandma dunks higher than you.”', '“Number 23 doesn’t make you famous, Kevin.”', '“Even Bagas gave up. Take the hint.”', '“Nice headband. Holding your ego in?”'],
    check: (s) => `* KEVIN — CONFIDENCE ${s}. Basketball captain. Has never lost a game. Has never been told no.`,
    acts: [
      { label: 'Free-throw duel', conf: 5, mercy: 18, trait: 'bravery', text: '* You challenge Kevin to free throws. You sink one. He bricks his. The crowd gasps.', reply: 'That was LUCK!' },
      { label: 'Praise his skills', mercy: 20, trait: 'kindness', text: '* You tell Kevin he really is good at basketball. He didn’t expect that from you.' },
      { label: 'Talk about Bagas', mercy: 25, trait: 'integrity', text: '* You tell Kevin you and Bagas made peace. Kevin hesitates, ball still spinning.', reply: '…He said that?' },
      { label: 'Pass the ball', mercy: 12, conf: 3, trait: 'justice', text: '* You steal the ball and pass it to her. She shoots… and scores! Kevin’s jaw drops.' },
    ],
    spare: (me) => `Fine. You win, ${me}. Don’t tell the team.`,
    beaten: 'This game doesn’t COUNT!!',
  },
  bagas2: {
    name: 'BAGAS ★ MAX', portrait: './art/bagas.webp', conf: 70, dmg: 5, speed: 1.25, finale: true, max: true,
    patterns: ['spotlight', 'spiral', 'wall', 'homing', 'gel', 'balls', 'rain'],
    words: ['MINE', 'LOSER', 'PROM', 'HA!', 'MAX', 'GEL'],
    intro: (c) => `* On the rooftop at sunset, Bagas is back. His hair is taller. Much taller. ${c} looks worried.`,
    opener: 'Prom is TOMORROW. This time I won’t hold back.',
    taunts: ['Did you think it was OVER?!', 'Hair gel… MAXIMUM!', 'I trained for this. Mostly in the mirror.', 'Look at my hair. LOOK AT IT.', 'You can’t dodge forever!', 'She’ll see who’s stronger!'],
    soft: '…Why do you keep being nice to me? Even now?',
    comebacks: ['“Your hair is a fire hazard, Bagas.”', '“Round two? I thought you went home to your mom.”', '“You lost to a nerd. Twice is a habit.”', '“That gel can’t hold up your ego.”', '“She’s not a prize. She’s a person.”', '“Max hair. Minimum brain.”'],
    check: (s) => `* BAGAS ★ MAX — CONFIDENCE ${s}. Used an entire tub of hair gel. Wants to win at any cost.`,
    acts: [
      { label: 'Stand tall', conf: 5, mercy: 12, trait: 'bravery', text: '* You stand tall. Your heart doesn’t shake this time.' },
      { label: 'Remind him', mercy: 25, trait: 'integrity', text: '* You remind him what he said last time: “Treat her well.” His eyes start to water.', reply: '…I did say that.' },
      { label: 'Offer friendship', mercy: 22, trait: 'kindness', text: '* You hold out your hand. “Come to prom with the squad, Bagas. As a friend.”', reply: 'A… friend?' },
      { label: 'Wipe off the gel', conf: 8, mercy: 8, trait: 'perseverance', text: '* You throw a wet towel at his hair. It sizzles. He shrinks two centimetres.' },
    ],
    phase2: { at: 35, line: 'You think you can beat me TWICE?! HAIR GEL… OVERDRIVE!!', speed: 1.5 },
    spare: (me) => `…Okay. You win, ${me}. Can I… still come to prom? With the squad?`,
    beaten: 'MY HAIR!! I’M TELLING MY MOM. AND MY DAD!!',
  },
};

/** what your SOUL does in battle */
const PERKS = {
  determination: 'If your HP hits 0 once, you get right back up.',
  bravery: 'Your comebacks hit harder.',
  justice: 'Perfect comebacks can be critical hits.',
  kindness: 'Being nice to them works better.',
  patience: 'Their attacks are a little slower.',
  integrity: 'You packed two extra bowls of bakso.',
  perseverance: 'You have more HP.',
};

/**
 * opts: { me, crush, foe (key of FOES), lv, soul, soulName, soulCol, muted, onTrait(trait) }
 * resolves 'spared', 'won' (they ran off) or 'fled'
 */
export function battle(opts) {
  const { me, crush, onTrait = () => {} } = opts;
  const F = FOES[opts.foe || 'bagas'];
  const soul = opts.soul || 'determination';
  const music = new BattleMusic(!!opts.muted, !!F.finale);
  const lv = opts.lv || 1;
  const root = document.createElement('div');
  root.className = 'battle' + (F.max ? ' max' : '');
  root.innerHTML = `
    <div class="bt-enemy"><img class="bt-foe" alt="${F.name}" src="${F.portrait}"><p class="bt-bubble" hidden></p></div>
    <div class="bt-meters">
      <span class="bt-name">${F.name}</span>
      <span class="bt-m">CONFIDENCE <i class="bt-conf"><b></b></i></span>
      <span class="bt-m">MERCY <i class="bt-mercy"><b></b></i></span>
    </div>
    <div class="bt-box"><p class="bt-text"></p><div class="bt-sub"></div><canvas class="bt-arena"></canvas></div>
    <div class="bt-stats"><b>${me.toUpperCase()}</b><span>LV ${lv}</span><span>HP</span><i class="bt-hp"><b></b></i><span class="bt-hpn"></span><span class="bt-soul" style="color:${opts.soulCol || '#ff2a3a'}">♥ ${opts.soulName || 'DETERMINATION'}</span></div>
    <div class="bt-menu">
      <button type="button" data-a="fight"><span>⚔</span>COMEBACK</button>
      <button type="button" data-a="act"><span>💬</span>ACT</button>
      <button type="button" data-a="item"><span>🍜</span>ITEM</button>
      <button type="button" data-a="mercy"><span>✋</span>MERCY</button>
    </div>`;
  document.body.append(root);
  const q = (s) => root.querySelector(s);
  const box = q('.bt-box'), textEl = q('.bt-text'), sub = q('.bt-sub'), arena = q('.bt-arena');
  const foe = q('.bt-foe'), bubble = q('.bt-bubble');
  const menuBtns = [...root.querySelectorAll('.bt-menu button')];
  const ctx = arena.getContext('2d');
  const heartCol = opts.soulCol || '#ff2a3a';

  const maxHp = 20 + (lv - 1) * 4 + (soul === 'perseverance' ? 8 : 0);
  const s = {
    hp: maxHp, conf: F.conf, mercy: 0, turn: 0, phased: false, speed: F.speed * (soul === 'patience' ? 0.85 : 1),
    revive: soul === 'determination', shield: false,
    items: { Bakso: 3 + (soul === 'integrity' ? 2 : 0), 'Iced Milo': 2, 'Teddy bear': 1 },
  };
  const meters = () => {
    q('.bt-conf b').style.width = `${(Math.max(0, s.conf) / F.conf) * 100}%`;
    q('.bt-mercy b').style.width = `${Math.min(100, s.mercy)}%`;
    q('.bt-mercy').classList.toggle('full', s.mercy >= 100);
    q('.bt-hp b').style.width = `${(Math.max(0, s.hp) / maxHp) * 100}%`;
    q('.bt-hpn').textContent = `${Math.max(0, s.hp)} / ${maxHp}`;
  };
  meters();

  /* ---- input ---- */
  const held = new Set();
  let onPress = null;
  const key = (e) => {
    const k = e.key.toLowerCase();
    e.stopPropagation();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { held.add(k); e.preventDefault(); }
    const act = ['z', 'enter', ' ', 'e'].includes(k) ? 'ok' : ['x', 'escape', 'shift'].includes(k) ? 'back'
      : ['arrowleft', 'a'].includes(k) ? 'left' : ['arrowright', 'd'].includes(k) ? 'right'
        : ['arrowup', 'w'].includes(k) ? 'up' : ['arrowdown', 's'].includes(k) ? 'down' : null;
    if (act && onPress) { e.preventDefault(); onPress(act); }
  };
  const keyUp = (e) => { held.delete(e.key.toLowerCase()); e.stopPropagation(); };
  window.addEventListener('keydown', key, true);
  window.addEventListener('keyup', keyUp, true);

  const type = (line) => new Promise((resolve) => {
    sub.innerHTML = '';
    textEl.textContent = '';
    let i = 0, done = false;
    const tick = setInterval(() => {
      i++;
      textEl.textContent = line.slice(0, i);
      if (i % 3 === 0) music.blip();
      if (i >= line.length) { clearInterval(tick); done = true; }
    }, reduced ? 4 : 26);
    const go = () => {
      if (!done) { clearInterval(tick); textEl.textContent = line; done = true; return; }
      onPress = null; box.removeEventListener('click', tap); resolve();
    };
    const tap = () => go();
    onPress = (a) => { if (a === 'ok') go(); };
    box.addEventListener('click', tap);
  });
  const say = async (line, ms = 1500) => {
    bubble.textContent = line;
    bubble.hidden = false;
    await wait(reduced ? 500 : ms);
    bubble.hidden = true;
  };
  const menu = () => new Promise((resolve) => {
    let sel = 0;
    const paint = () => menuBtns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    paint();
    root.classList.add('choosing');
    const pick = (i) => { onPress = null; root.classList.remove('choosing'); menuBtns.forEach((b) => { b.onclick = null; }); resolve(menuBtns[i].dataset.a); };
    menuBtns.forEach((b, i) => { b.onclick = () => pick(i); });
    onPress = (a) => {
      if (a === 'left') { sel = (sel + 3) % 4; paint(); music.blip(); }
      if (a === 'right') { sel = (sel + 1) % 4; paint(); music.blip(); }
      if (a === 'ok') pick(sel);
    };
  });
  const list = (opts2) => new Promise((resolve) => {
    let sel = 0;
    textEl.textContent = '';
    sub.innerHTML = '';
    const btns = opts2.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="h">♥</span>* ${o}`;
      b.onclick = (e) => { e.stopPropagation(); done(i); };
      sub.append(b);
      return b;
    });
    const back = document.createElement('button');
    back.type = 'button'; back.className = 'back'; back.textContent = '← back';
    back.onclick = (e) => { e.stopPropagation(); done(-1); };
    sub.append(back);
    const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    paint();
    function done(i) { onPress = null; sub.innerHTML = ''; resolve(i); }
    onPress = (a) => {
      if (a === 'up' || a === 'left') { sel = (sel + btns.length - 1) % btns.length; paint(); music.blip(); }
      if (a === 'down' || a === 'right') { sel = (sel + 1) % btns.length; paint(); music.blip(); }
      if (a === 'ok') done(sel);
      if (a === 'back') done(-1);
    };
  });

  /** the comeback timing bar: stop the cursor in the middle for a big hit */
  const timing = () => new Promise((resolve) => {
    textEl.textContent = '';
    box.classList.add('aim');
    const W = (arena.width = box.clientWidth * 2), H = (arena.height = box.clientHeight * 2);
    const t0 = performance.now(), dur = F.max ? 1000 : 1200;
    const zone = soul === 'justice' ? 0.12 : 0.08;
    let stopped = false;
    const finish = (x) => { if (stopped) return; stopped = true; onPress = null; arena.onpointerdown = null; box.classList.remove('aim'); resolve(x); };
    onPress = (a) => { if (a === 'ok') finish(Math.min(1, (performance.now() - t0) / dur)); };
    arena.onpointerdown = () => finish(Math.min(1, (performance.now() - t0) / dur));
    const draw = () => {
      if (stopped) return;
      const k = (performance.now() - t0) / dur;
      if (k >= 1) { finish(1); return; }
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#203060'); g.addColorStop(0.5 - zone, '#3a6ab0'); g.addColorStop(0.5, '#ffe14d'); g.addColorStop(0.5 + zone, '#3a6ab0'); g.addColorStop(1, '#203060');
      ctx.fillStyle = g; ctx.fillRect(20, H * 0.3, W - 40, H * 0.4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(20, H * 0.3, W - 40, H * 0.4);
      ctx.fillStyle = '#fff'; ctx.fillRect(20 + (W - 40) * k - 6, H * 0.2, 12, H * 0.6);
      ctx.font = `${H * 0.12}px DotGothic16, monospace`; ctx.textAlign = 'center';
      ctx.fillText('PRESS Z / TAP!', W / 2, H * 0.14);
      requestAnimationFrame(draw);
    };
    draw();
  });

  /** their turn: dodge with your heart inside the box */
  const dodge = (pattern, seconds) => new Promise((resolve) => {
    box.classList.add('arena');
    textEl.textContent = '';
    setTimeout(() => {
      const W = (arena.width = box.clientWidth), H = (arena.height = box.clientHeight);
      const heart = { x: W / 2, y: H / 2 };
      let bullets = [], beams = [], spawn = 0, invul = 0, last = performance.now(), t = 0, dead = false, tx = null, ty = null, ang = 0;
      const speed = 155;
      arena.onpointermove = arena.onpointerdown = (e) => { const r = arena.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * W; ty = ((e.clientY - r.top) / r.height) * H; };
      const word = () => F.words[Math.floor(Math.random() * F.words.length)];
      const hard = Math.min(2, s.speed * (1 + s.turn * 0.07));
      const hurt = () => {
        if (s.shield) { s.shield = false; invul = 0.9; music.blip(); return; }
        s.hp -= F.dmg; invul = 0.75; meters(); music.hit();
        box.classList.remove('hurt'); void box.offsetWidth; box.classList.add('hurt');
        if (s.hp <= 0) dead = true;
      };
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now; t += dt;
        let dx = 0, dy = 0;
        if (held.has('arrowleft') || held.has('a')) dx -= 1;
        if (held.has('arrowright') || held.has('d')) dx += 1;
        if (held.has('arrowup') || held.has('w')) dy -= 1;
        if (held.has('arrowdown') || held.has('s')) dy += 1;
        if (tx !== null && !dx && !dy) { const ax = tx - heart.x, ay = ty - heart.y, l = Math.hypot(ax, ay); if (l > 3) { dx = ax / l; dy = ay / l; } }
        heart.x = Math.max(10, Math.min(W - 10, heart.x + dx * speed * dt));
        heart.y = Math.max(10, Math.min(H - 10, heart.y + dy * speed * dt));
        // spawn the attacks
        spawn -= dt;
        if (spawn <= 0 && t < seconds - 0.6) {
          const p = pattern;
          if (p === 'rain') { bullets.push({ x: 20 + Math.random() * (W - 40), y: -10, vx: 0, vy: (90 + Math.random() * 60) * hard, txt: word() }); spawn = 0.38 / hard; }
          else if (p === 'sides') { const L = Math.random() < 0.5; bullets.push({ x: L ? -30 : W + 30, y: 15 + Math.random() * (H - 30), vx: (L ? 1 : -1) * 130 * hard, vy: 0, txt: word() }); spawn = 0.5 / hard; }
          else if (p === 'balls') { bullets.push({ x: -12, y: 10 + Math.random() * 30, vx: (90 + Math.random() * 70) * hard, vy: 0, ball: 11, g: 380 }); spawn = 0.65 / hard; }
          else if (p === 'wall') {
            const gap = 30 + Math.random() * (W - 110), letters = (F.words[0] + ' ').repeat(9);
            for (let x = 8, n = 0; x < W - 8; x += 18, n++) if (x < gap || x > gap + 58) bullets.push({ x, y: -12, vx: 0, vy: 75 * hard, txt: letters[n % letters.length] === ' ' ? '!' : letters[n % letters.length] });
            spawn = 1.35 / hard;
          } else if (p === 'homing') {
            const side = Math.floor(Math.random() * 4);
            const x = side === 0 ? -20 : side === 1 ? W + 20 : Math.random() * W, y = side === 2 ? -15 : side === 3 ? H + 15 : Math.random() * H;
            bullets.push({ x, y, vx: 0, vy: 0, txt: word(), home: 70 * hard, life: 3.2 }); spawn = 0.7 / hard;
          } else if (p === 'spotlight') {
            const n = F.max ? 2 : 1;
            for (let k = 0; k < n; k++) { const w = 38 + Math.random() * 24; beams.push({ x: Math.random() * (W - w), w, t: 0 }); }
            spawn = 1.1 / hard;
            if (Math.random() < 0.5) bullets.push({ x: 20 + Math.random() * (W - 40), y: -10, vx: 0, vy: 110 * hard, txt: word() });
          } else if (p === 'spiral') {
            ang += 0.55;
            for (let k = 0; k < 3; k++) { const a = ang + (k * Math.PI * 2) / 3; bullets.push({ x: W / 2, y: 18, vx: Math.cos(a) * 95 * hard, vy: Math.abs(Math.sin(a)) * 95 * hard + 20, txt: '✦' }); }
            spawn = 0.22 / hard;
          } else if (p === 'dunk') {
            bullets.push({ x: 25 + Math.random() * (W - 50), y: -24, vx: 0, vy: 40, g: 900, ball: 18, dunk: true }); spawn = 0.9 / hard;
          } else if (p === 'gel') {
            bullets.push({ x: 20 + Math.random() * (W - 40), y: -10, vx: (Math.random() - 0.5) * 40, vy: 60 * hard, txt: '●', gel: true }); spawn = 0.3 / hard;
          }
        }
        ctx.clearRect(0, 0, W, H);
        invul -= dt;
        // warning beams, then the spotlight
        beams = beams.filter((b) => (b.t += dt) < 1.25);
        for (const b of beams) {
          if (b.t < 0.75) { ctx.fillStyle = `rgba(255,60,80,${0.15 + 0.15 * Math.sin(b.t * 30)})`; ctx.fillRect(b.x, 0, b.w, H); }
          else { ctx.fillStyle = 'rgba(255,250,220,0.9)'; ctx.fillRect(b.x, 0, b.w, H); if (invul <= 0 && heart.x > b.x - 4 && heart.x < b.x + b.w + 4) hurt(); }
        }
        bullets = bullets.filter((b) => b.x > -70 && b.x < W + 70 && b.y < H + 50 && b.y > -80 && (b.life === undefined || (b.life -= dt) > 0));
        for (const b of bullets) {
          if (b.home) { const ax = heart.x - b.x, ay = heart.y - b.y, l = Math.hypot(ax, ay) || 1; b.vx += (ax / l) * b.home * dt * 2; b.vy += (ay / l) * b.home * dt * 2; const v = Math.hypot(b.vx, b.vy), mx = b.home * 1.4; if (v > mx) { b.vx *= mx / v; b.vy *= mx / v; } }
          if (b.g) { b.vy += b.g * dt; if (b.y > H - b.ball && b.vy > 0) { b.vy *= b.dunk ? -0.55 : -0.82; if (b.dunk) b.vx = (Math.random() - 0.5) * 220; } }
          b.x += b.vx * dt; b.y += b.vy * dt;
          let hw, hh;
          if (b.ball) {
            const r = b.ball;
            ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x - r, b.y); ctx.lineTo(b.x + r, b.y); ctx.moveTo(b.x, b.y - r); ctx.lineTo(b.x, b.y + r); ctx.stroke();
            hw = hh = r - 2;
          } else {
            ctx.font = `bold ${b.gel ? 18 : 15}px DotGothic16, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = b.gel ? '#7ae0ff' : b.home ? '#ffb0c0' : '#ffffff'; ctx.fillText(b.txt, b.x, b.y);
            hw = ctx.measureText(b.txt).width / 2; hh = 7;
          }
          if (invul <= 0 && Math.abs(b.x - heart.x) < hw + 5 && Math.abs(b.y - heart.y) < hh + 5) hurt();
        }
        // your heart, in the colour of your SOUL
        if (invul <= 0 || Math.floor(t * 14) % 2) {
          ctx.save(); ctx.translate(heart.x, heart.y); ctx.fillStyle = heartCol;
          if (s.shield) { ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-11, -1, -8, -10, 0, -4); ctx.bezierCurveTo(8, -10, 11, -1, 0, 7); ctx.fill(); ctx.restore();
        }
        if (dead || t >= seconds) {
          arena.onpointermove = arena.onpointerdown = null;
          ctx.clearRect(0, 0, W, H);
          box.classList.remove('arena');
          setTimeout(() => resolve(dead ? 'dead' : 'ok'), 250);
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, 280);
  });

  const shakeFoe = () => { foe.classList.remove('shake'); void foe.offsetWidth; foe.classList.add('shake'); };
  const kind = (n) => Math.round(n * (soul === 'kindness' ? 1.3 : 1));

  return (async () => {
    music.start();
    await wait(400);
    root.classList.add('in');
    await type(F.intro(crush));
    await say(F.opener);
    await type(`* Your SOUL shines: ${opts.soulName || 'DETERMINATION'}. ${PERKS[soul]}`);
    let result = null;
    while (!result) {
      await type(s.mercy >= 100 ? `* ${F.name} doesn’t want to fight anymore.` : s.conf <= F.conf * 0.25 ? `* ${F.name} is sweating. A lot.` : `* ${crush} is watching nervously.`);
      const a = await menu();
      if (a === 'fight') {
        const x = await timing();
        const off = Math.abs(x - 0.5);
        const acc = 1 - Math.min(1, off * 2);
        let dmg = acc < 0.1 ? 0 : Math.round(3 + acc * 9 + (soul === 'bravery' ? 3 : 0));
        const crit = soul === 'justice' && off < 0.06;
        if (crit) dmg = Math.round(dmg * 1.6);
        await type(`* You: ${F.comebacks[s.turn % F.comebacks.length]}`);
        if (dmg) { s.conf -= dmg; shakeFoe(); music.hit(); meters(); onTrait('justice'); await type(`* ${crit ? 'CRITICAL! ' : ''}It's super effective! ${F.name} loses ${dmg} confidence.`); }
        else await type('* You mumbled it. Nobody heard you.');
      } else if (a === 'act') {
        const i = await list(['Check', ...F.acts.map((x) => x.label)]);
        if (i < 0) continue;
        if (i === 0) { onTrait('patience'); await type(F.check(`${Math.max(0, s.conf)}/${F.conf}`)); continue; }
        const A = F.acts[i - 1];
        s.mercy += kind(A.mercy || 0); s.conf -= A.conf || 0;
        if (A.conf) shakeFoe();
        onTrait(A.trait); meters();
        await type(A.text);
        if (A.reply) await say(A.reply, 1300);
      } else if (a === 'item') {
        const names = Object.keys(s.items);
        const i = await list(names.map((n) => `${n} ×${s.items[n]}`));
        if (i < 0) continue;
        const n = names[i];
        if (!s.items[n]) { await type(`* No ${n} left. Hamzah ate it.`); continue; }
        s.items[n]--;
        if (n === 'Bakso') { s.hp = maxHp; onTrait('perseverance'); await type('* You eat a bowl of bakso. Extra meatballs. HP fully restored!'); }
        else if (n === 'Iced Milo') { s.hp = Math.min(maxHp, s.hp + 10); await type('* You drink an iced Milo. Chocolatey courage. +10 HP.'); }
        else { s.shield = true; onTrait('kindness'); await type(`* You hug the teddy bear. It will block the next hit for you.`); }
        meters();
      } else if (a === 'mercy') {
        const i = await list(['Spare', 'Run away']);
        if (i < 0) continue;
        if (i === 0) {
          if (s.mercy >= 100) { onTrait('kindness'); await say(F.spare(me), 2300); await type(`* You spared ${F.name}. They walk away… and almost smile.`); result = 'spared'; break; }
          await type(`* ${F.name} isn’t ready to back down. (ACT fills MERCY.)`);
        } else { await type('* You ran away. Behind you, someone laughs.'); result = 'fled'; break; }
      }
      if (s.conf <= 0) { await say(F.beaten, 1900); foe.classList.add('run'); await type(`* ${F.name} ran away. You won without throwing a single punch.`); result = 'won'; break; }
      // the second phase
      if (F.phase2 && !s.phased && s.conf <= F.phase2.at) {
        s.phased = true;
        s.speed = F.phase2.speed * (soul === 'patience' ? 0.85 : 1);
        root.classList.add('overdrive');
        music.power();
        await say(F.phase2.line, 2200);
        s.conf = Math.min(F.conf, s.conf + 15); meters();
        await type(`* ${F.name} powered up! His confidence went back up. His attacks are faster now!`);
      }
      // their turn
      await say(s.mercy >= 70 ? F.soft : F.taunts[s.turn % F.taunts.length]);
      const pat = F.patterns[(s.turn + (s.phased ? 2 : 0)) % F.patterns.length];
      const r = await dodge(pat, F.max ? 6.5 : 6);
      s.turn++;
      if (r === 'dead') {
        if (s.revive) {
          s.revive = false; s.hp = maxHp; meters(); onTrait('determination');
          await type(`* Your HP hit 0… but your SOUL refuses to break. You stand back up!`);
          continue;
        }
        await type(`* Your heart is aching… but ${crush} is still watching. Don’t give up, ${me}!`);
        const k = await list(['Try again', 'Give up']);
        if (k === 1) { await type('* You walk away. It stings.'); result = 'fled'; break; }
        onTrait('determination');
        s.hp = maxHp; meters();
        await type('* You get back up. Your heart burns brighter than ever.');
      }
    }
    root.classList.add('out');
    await music.stop();
    window.removeEventListener('keydown', key, true);
    window.removeEventListener('keyup', keyUp, true);
    root.remove();
    return result;
  })();
}
