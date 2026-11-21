/**
 * The showdown with the class bully. A turn-based battle: pick an action,
 * then dodge his insults with your heart inside the box.
 * The battle music is an original chiptune piece made with Web Audio.
 */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ------------------------------------------------------------ the music */
// 168 bpm, A minor: Am – F – G – E. Square-wave lead, pulse arpeggio,
// octave-jumping bass and a noise drum kit.
const BPM = 168;
const STEP = 60 / BPM / 4; // one sixteenth
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

class BattleMusic {
  constructor(muted) { this.muted = muted; }
  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : 0.2;
    this.out.connect(ctx.destination);
    // a shared noise buffer for the drums
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
    const ctx = this.ctx;
    while (this.next < ctx.currentTime + 0.12) {
      const t = this.next, s = this.step;
      const bar = Math.floor(s / 16) % 8, i = s % 16;
      const ch = PROG[bar % 4];
      // bass: eighth notes, jumping an octave
      if (i % 2 === 0) this.tone('square', hz(ch.bass + (i % 4 === 2 ? 12 : 0)), t, STEP * 1.8, 0.16);
      // arpeggio
      this.tone('square', hz(ch.arp[i % 3] + 12), t, STEP * 0.9, 0.035);
      // lead
      for (const [m, at, l] of LEAD[bar]) if (at === i) this.tone('square', hz(m), t, STEP * l * 0.95, 0.09);
      // drums
      if (i === 0 || i === 8 || (bar % 2 && i === 10)) this.drum(t, 'kick');
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
}

/* ------------------------------------------------------------ the battle */
const WORDS = ['LOSER', 'NERD', 'HA!', 'WEAK', 'LOL', 'NOOB', 'CRINGE'];
const COMEBACKS = [
  '“Nice jacket. Did it come with a personality?”',
  '“You’re not tall, Bagas. You’re just loud.”',
  '“Even the vending machine likes me more than you.”',
  '“She’s not a trophy, Bagas.”',
  '“Is that your final form?”',
  '“Your hair gel has more confidence than you.”',
];
const TAUNTS = [
  'Ha! YOU? Talking to HER?',
  'I’ve got a car. Well. My mom’s car.',
  'Everyone says I’m the coolest guy in school!',
  'Why are you still standing?!',
  'S-stop looking at me like that…',
  'Whatever, nerd!',
];

/**
 * opts: { me, crush, portrait, muted, onTrait(trait) }
 * resolves 'spared', 'won' (he ran off) or 'fled'
 */
export function battle(opts) {
  const { me, crush, portrait, onTrait = () => {} } = opts;
  const music = new BattleMusic(!!opts.muted);
  const root = document.createElement('div');
  root.className = 'battle';
  root.innerHTML = `
    <div class="bt-enemy"><img class="bt-foe" alt="Bagas" src="${portrait}"><p class="bt-bubble" hidden></p></div>
    <div class="bt-meters">
      <span>BAGAS</span>
      <span class="bt-m">CONFIDENCE <i class="bt-conf"><b></b></i></span>
      <span class="bt-m">MERCY <i class="bt-mercy"><b></b></i></span>
    </div>
    <div class="bt-box"><p class="bt-text"></p><div class="bt-sub"></div><canvas class="bt-arena"></canvas></div>
    <div class="bt-stats"><b>${me.toUpperCase()}</b><span>LV 17</span><span>HP</span><i class="bt-hp"><b></b></i><span class="bt-hpn"></span></div>
    <div class="bt-menu">
      <button type="button" data-a="fight"><span>⚔</span>COMEBACK</button>
      <button type="button" data-a="act"><span>💬</span>ACT</button>
      <button type="button" data-a="item"><span>🍜</span>BAKSO</button>
      <button type="button" data-a="mercy"><span>✋</span>MERCY</button>
    </div>`;
  document.body.append(root);
  const q = (s) => root.querySelector(s);
  const box = q('.bt-box'), textEl = q('.bt-text'), sub = q('.bt-sub'), arena = q('.bt-arena');
  const foe = q('.bt-foe'), bubble = q('.bt-bubble');
  const menuBtns = [...root.querySelectorAll('.bt-menu button')];
  const ctx = arena.getContext('2d');

  const s = { hp: 20, maxHp: 20, conf: 30, mercy: 0, bakso: 3, turn: 0 };
  const meters = () => {
    q('.bt-conf b').style.width = `${(Math.max(0, s.conf) / 30) * 100}%`;
    q('.bt-mercy b').style.width = `${Math.min(100, s.mercy)}%`;
    q('.bt-mercy').classList.toggle('full', s.mercy >= 100);
    q('.bt-hp b').style.width = `${(Math.max(0, s.hp) / s.maxHp) * 100}%`;
    q('.bt-hpn').textContent = `${Math.max(0, s.hp)} / ${s.maxHp}`;
  };
  meters();

  /* ---- input ---- */
  const held = new Set();
  let onPress = null; // what the confirm / back / arrow keys do right now
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

  /** type a line into the box; resolves when the player confirms */
  const type = (line) => new Promise((resolve) => {
    sub.innerHTML = '';
    textEl.textContent = '';
    let i = 0, done = false;
    const tick = setInterval(() => {
      i++;
      textEl.textContent = line.slice(0, i);
      if (i % 3 === 0) music.blip();
      if (i >= line.length) { clearInterval(tick); done = true; }
    }, reduced ? 4 : 28);
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

  /** pick one of the four big buttons */
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
  /** a list of options inside the box; resolves an index, or -1 for back */
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
    const t0 = performance.now(), dur = 1300;
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
      g.addColorStop(0, '#203060'); g.addColorStop(0.42, '#3a6ab0'); g.addColorStop(0.5, '#ffe14d'); g.addColorStop(0.58, '#3a6ab0'); g.addColorStop(1, '#203060');
      ctx.fillStyle = g; ctx.fillRect(20, H * 0.3, W - 40, H * 0.4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(20, H * 0.3, W - 40, H * 0.4);
      ctx.fillStyle = '#fff'; ctx.fillRect(20 + (W - 40) * k - 6, H * 0.2, 12, H * 0.6);
      ctx.font = `${H * 0.12}px DotGothic16, monospace`; ctx.textAlign = 'center';
      ctx.fillText('PRESS Z / TAP!', W / 2, H * 0.14);
      requestAnimationFrame(draw);
    };
    draw();
  });

  /** his turn: dodge with your heart inside the box for a few seconds */
  const dodge = (pattern, seconds) => new Promise((resolve) => {
    box.classList.add('arena');
    textEl.textContent = '';
    setTimeout(() => {
      const W = (arena.width = box.clientWidth), H = (arena.height = box.clientHeight);
      const heart = { x: W / 2, y: H / 2, r: 8 };
      let bullets = [], spawn = 0, invul = 0, last = performance.now(), t = 0, dead = false, tx = null, ty = null;
      const speed = 150;
      arena.onpointermove = arena.onpointerdown = (e) => { const r = arena.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * W; ty = ((e.clientY - r.top) / r.height) * H; };
      const word = () => WORDS[Math.floor(Math.random() * WORDS.length)];
      const hard = Math.min(1.6, 1 + s.turn * 0.12);
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now; t += dt;
        // move the heart
        let dx = 0, dy = 0;
        if (held.has('arrowleft') || held.has('a')) dx -= 1;
        if (held.has('arrowright') || held.has('d')) dx += 1;
        if (held.has('arrowup') || held.has('w')) dy -= 1;
        if (held.has('arrowdown') || held.has('s')) dy += 1;
        if (tx !== null && !dx && !dy) { const ax = tx - heart.x, ay = ty - heart.y, l = Math.hypot(ax, ay); if (l > 3) { dx = ax / l; dy = ay / l; } }
        heart.x = Math.max(10, Math.min(W - 10, heart.x + dx * speed * dt));
        heart.y = Math.max(10, Math.min(H - 10, heart.y + dy * speed * dt));
        // spawn his attacks
        spawn -= dt;
        if (spawn <= 0 && t < seconds - 0.6) {
          if (pattern === 0) { bullets.push({ x: 20 + Math.random() * (W - 40), y: -10, vx: 0, vy: (90 + Math.random() * 60) * hard, txt: word() }); spawn = 0.42 / hard; }
          else if (pattern === 1) { const L = Math.random() < 0.5; bullets.push({ x: L ? -30 : W + 30, y: 15 + Math.random() * (H - 30), vx: (L ? 1 : -1) * 130 * hard, vy: 0, txt: word() }); spawn = 0.55 / hard; }
          else if (pattern === 2) { bullets.push({ x: -12, y: 10 + Math.random() * 30, vx: (90 + Math.random() * 60) * hard, vy: 0, ball: true, g: 380 }); spawn = 0.75 / hard; }
          else if (pattern === 3) {
            const gap = 30 + Math.random() * (W - 110), letters = 'SHE’S MINE'.repeat(3);
            for (let x = 8, n = 0; x < W - 8; x += 18, n++) if (x < gap || x > gap + 62) bullets.push({ x, y: -12, vx: 0, vy: 70 * hard, txt: letters[n % letters.length] || '!' });
            spawn = 1.5 / hard;
          } else { if (Math.random() < 0.5) bullets.push({ x: 20 + Math.random() * (W - 40), y: -10, vx: 0, vy: 120 * hard, txt: word() }); else bullets.push({ x: -12, y: 20, vx: 120 * hard, vy: 0, ball: true, g: 380 }); spawn = 0.4 / hard; }
        }
        // move and draw
        ctx.clearRect(0, 0, W, H);
        invul -= dt;
        bullets = bullets.filter((b) => b.x > -60 && b.x < W + 60 && b.y < H + 40);
        for (const b of bullets) {
          if (b.ball) { b.vy += b.g * dt; if (b.y > H - 12 && b.vy > 0) b.vy *= -0.82; }
          b.x += b.vx * dt; b.y += b.vy * dt;
          let hw, hh;
          if (b.ball) {
            ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.arc(b.x, b.y, 11, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x - 11, b.y); ctx.lineTo(b.x + 11, b.y); ctx.moveTo(b.x, b.y - 11); ctx.lineTo(b.x, b.y + 11); ctx.stroke();
            hw = hh = 9;
          } else {
            ctx.font = 'bold 15px DotGothic16, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff'; ctx.fillText(b.txt, b.x, b.y);
            hw = ctx.measureText(b.txt).width / 2; hh = 7;
          }
          if (invul <= 0 && Math.abs(b.x - heart.x) < hw + 5 && Math.abs(b.y - heart.y) < hh + 5) {
            s.hp -= 3; invul = 0.9; meters(); music.hit();
            box.classList.remove('hurt'); void box.offsetWidth; box.classList.add('hurt');
            if (s.hp <= 0) dead = true;
          }
        }
        // the heart (your soul)
        if (invul <= 0 || Math.floor(t * 14) % 2) {
          ctx.save(); ctx.translate(heart.x, heart.y); ctx.fillStyle = '#ff2a3a';
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

  return (async () => {
    music.start();
    await wait(400);
    root.classList.add('in');
    await type(`* Bagas blocks your way. He wants ${crush} for himself.`);
    await say('She’s MINE, nerd. Get lost.');
    let result = null;
    while (!result) {
      await type(s.mercy >= 100 ? '* Bagas doesn’t want to fight anymore.' : s.conf <= 10 ? '* Bagas is sweating. A lot.' : `* ${crush} is watching nervously.`);
      const a = await menu();
      if (a === 'fight') {
        const x = await timing();
        const acc = 1 - Math.min(1, Math.abs(x - 0.5) * 2);
        const dmg = acc < 0.1 ? 0 : Math.round(3 + acc * 9);
        await type(`* You: ${COMEBACKS[s.turn % COMEBACKS.length]}`);
        if (dmg) { s.conf -= dmg; shakeFoe(); music.hit(); meters(); onTrait('justice'); await type(`* It's super effective! Bagas loses ${dmg} confidence.`); }
        else await type('* You mumbled it. Bagas didn’t hear you.');
        if (s.conf <= 0) { await say('I-I’m telling my mom!!', 1800); foe.classList.add('run'); await type('* Bagas ran away. You won without throwing a single punch.'); result = 'won'; break; }
      } else if (a === 'act') {
        const i = await list(['Check', 'Stand tall', 'Compliment him', `Make ${crush} laugh`]);
        if (i < 0) continue;
        if (i === 0) { onTrait('patience'); await type(`* BAGAS — CONFIDENCE ${Math.max(0, s.conf)}/30. Thinks he’s cool. Is secretly scared of cats.`); continue; }
        if (i === 1) { s.conf -= 4; s.mercy += 25; onTrait('bravery'); shakeFoe(); meters(); await type('* You stand tall and look him right in the eye. Bagas takes a step back.'); }
        if (i === 2) { s.mercy += 35; onTrait('kindness'); meters(); await type('* You tell Bagas his hair looks great. He… was not ready for that.'); await say('W-what?! …Really?', 1300); }
        if (i === 3) { s.mercy += 20; onTrait('integrity'); meters(); await type(`* You tell a terrible bakso joke. ${crush} laughs so hard she snorts. Bagas looks lost.`); }
      } else if (a === 'item') {
        if (s.bakso <= 0) { await type('* The bakso is all gone. Hamzah ate the last one.'); continue; }
        s.bakso--; s.hp = s.maxHp; meters(); onTrait('perseverance');
        await type(`* You eat a bowl of bakso. Extra meatballs. HP fully restored! (${s.bakso} left)`);
      } else if (a === 'mercy') {
        const i = await list([s.mercy >= 100 ? 'Spare' : 'Spare', 'Run away']);
        if (i < 0) continue;
        if (i === 0) {
          if (s.mercy >= 100) { onTrait('kindness'); await say(`…You’re alright, ${me}. Treat her well.`, 2200); await type('* You spared Bagas. He walks away… and almost smiles.'); result = 'spared'; break; }
          await type('* Bagas isn’t ready to back down yet. (Try ACT to win him over.)');
        } else { await type('* You ran away. Behind you, Bagas laughs.'); result = 'fled'; break; }
      }
      // his turn
      await say(s.mercy >= 70 ? '…Nobody’s ever been nice to me before.' : TAUNTS[s.turn % TAUNTS.length]);
      const r = await dodge(s.turn % 5, 5.2);
      s.turn++;
      if (r === 'dead') {
        await type(`* Your heart is aching… but ${crush} is still watching. Don’t give up, ${me}!`);
        const k = await list(['Try again', 'Give up']);
        if (k === 1) { await type('* You walk away. Bagas laughs. It stings.'); result = 'fled'; break; }
        onTrait('determination');
        s.hp = s.maxHp; meters();
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
