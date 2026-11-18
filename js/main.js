/**
 * Get a Crush Before College
 *
 * Seven days until college. The squad made a pact: everyone gets a crush
 * before college, or treats everyone to bakso. Pick which friend you are,
 * walk around school, talk to your friends for advice and to four classmates
 * who might become your crush. Every talk with a crush uses up a lunch break
 * Each day is a nine-minute clock from morning to night; after school the
 * town opens up. On Sunday night, at the prom, you confess.
 *
 * Everything is drawn on a 2D canvas in a cel-shaded anime style.
 */
import { LoveSong } from './audio.js';
import { HeartFx } from './fx.js';
import { startEnding } from './ending.js';
import { drawPortrait } from './portrait.js';

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
  { name: 'Ghanim', fates: ['built a dating app for the squad. It matched him with someone ✓', 'is still debugging his feelings. Estimated fix: college'], role: 'the coder', look: look({ hair: '#1e1a28', style: 'short', glasses: true, laptop: true, young: true, skin: '#f0c4a4' }),
    line: 'I wrote a script that tracks the pact. You are currently in last place.',
    hint: ['alya', 'Debug tip: Alya hates flattery. Be useful, not smooth.'],
    end: {
      option: 'Show her a website you coded: “Will you go out with me?” [YES] [NO]',
      reply: '…The NO button runs away every time I try to click it. …Fine. Yes. YES.',
      b: 'Did you really code a whole website just to ask me out?',
      a: 'Three nights. Zero bugs. …Okay, one bug.',
      epilogue: 'Ghanim shipped the best project of his life. Uptime: forever.',
      bakso: 'Ghanim’s confession website crashed in production. He’s fixing the bug at the bakso stall. His treat.',
    } },
  { name: 'Ghiffy', fates: ['found a Player 2 at the prom ✓', 'is speedrunning college instead. Current record: pending'], role: 'the gamer', look: look({ hair: '#5a3a2a', hairHi: '#8a5a40', style: 'spiky', headphones: '#4ad07a', top: '#e8504f', topSh: '#c03a3a', skin: '#e8b48e' }),
    line: 'Seven days left? That’s like… one boss fight per day. Easy.',
    hint: ['kirana', 'Kirana respects people who never rage-quit. Keep going, bro!'],
    end: {
      option: 'Hand her a controller: “Player 2… want to join?”',
      reply: '…Player 2 has joined the game.',
      b: 'So am I your Player 2 now?',
      a: 'Co-op mode. Permanently. No respawns needed.',
      epilogue: 'Achievement unlocked: Crush Before College (only 0.1% of players get this).',
      bakso: 'GAME OVER. Continue? Ghiffy bought a continue — in bakso, for the whole squad.',
    } },
  { name: 'Lindan', fates: ['predicted his own crush three days early ✓', 'says the forecast for love is “cloudy, clearing by college”'], role: 'the meteorologist', look: look({ hair: '#2a2230', style: 'short', top: '#6a9a7a', topSh: '#4f7a5f', skin: '#f6cdb2' }),
    line: 'Today’s forecast: sunny, light wind, 80% chance of someone in our squad blushing.',
    hint: ['alya', 'Alya acts tough, but there’s a storm inside. She’s scared of leaving home. Just listen.'],
    end: {
      option: '“Tomorrow’s forecast: clear skies, and a 100% chance I still like you.”',
      reply: '…Did you just do a weather report at me? …Okay. That was cute.',
      b: 'So, weatherman. What’s the forecast for us?',
      a: 'Clear skies. Light winds. 100% chance of shooting stars.',
      epilogue: 'Lindan’s forecast was right again. Clear skies, all the way to college.',
      bakso: 'Lindan forecast sunshine. It poured. He’s buying the bakso, umbrellas included.',
    } },
  { name: 'Arkan', fates: ['asked someone out at the finish line. She said yes ✓', 'is training for love. Day 1 of 365'], role: 'the athlete', look: look({ hair: '#1a1424', hairHi: '#4a4060', style: 'spiky', top: '#2f7fd8', topSh: '#2160aa', skin: '#d9a07a' }),
    line: 'Want to run laps with me? …No? Your loss. Cardio is love.',
    hint: ['kirana', 'Kirana hurt her knee before the last meet. Be kind, not a coach.'],
    end: {
      option: 'Sprint across the courtyard to her: “I ran here. Mostly so I could say this.”',
      reply: 'You’re completely out of breath. …Say it, then. …Yes.',
      b: 'Do you ever stop running?',
      a: 'Only for you. This is my favourite finish line.',
      epilogue: 'Arkan crossed the finish line first. The prize was worth it.',
      bakso: 'Arkan didn’t catch this one. Cool-down lap: straight to the bakso stall. On him.',
    } },
  { name: 'Dyas', fates: ['scored the winning goal and pointed at the stands. Someone pointed back ✓', 'is saving his best goal for college'], role: 'the footballer', look: look({ hair: '#2b2236', style: 'spiky', top: '#2f9a5a', topSh: '#237a46', number: '10', skin: '#f6cdb2' }),
    line: 'Last match of senior year tomorrow. Win or lose, I’m pointing at the stands.',
    hint: ['sekar', 'Sekar likes quiet. Don’t try to fill the silence with jokes. Pass, don’t shoot.'],
    end: {
      option: 'Juggle a football twenty times, catch it, and hand it to her: “That one’s for you.”',
      reply: '…Show-off. …Do it again. …And yes.',
      b: 'You scored last match and pointed at me. Everyone saw.',
      a: 'That was the plan. Best assist of my life.',
      epilogue: 'Dyas scored the winning goal of senior year. Off the pitch.',
      bakso: 'Dyas missed the penalty this time. Extra time is in college. Bakso’s on him.',
    } },
  { name: 'Zubair', fates: ['met someone who has watched every episode he has ✓', 'is waiting for season two'], role: 'the anime fan', look: look({ hair: '#1e1a28', style: 'messy', headphones: '#ff5f96', top: '#7a7f90', topSh: '#5f6474', skin: '#e8b48e' }),
    line: 'This week is literally the last arc of a school anime. I hope we get a good ending.',
    hint: ['rania', 'Rania wants honest reviews of her food. Like rating an episode, but nicer.'],
    end: {
      option: 'Recite the confession from your favourite anime, word for word.',
      reply: '…That’s from episode 12, isn’t it? …I watched it too. …Yes.',
      b: 'This feels like the last episode of an anime.',
      a: 'Then let’s make it a season finale. Season two: college.',
      epilogue: 'Zubair got his anime ending. Season two confirmed.',
      bakso: 'No anime ending yet. Zubair says season two will be better. Bakso first, his treat.',
    } },
  { name: 'Ahza', fates: ['got a photo, and a phone number ✓', 'took 400 photos of everyone else’s crushes'], role: 'the photographer', look: look({ hair: '#3a2a2a', hairHi: '#6a4a44', style: 'curly', camera: true, skin: '#f0c4a4' }),
    line: 'Smile! …That’s the most nervous smile I’ve ever photographed.',
    hint: ['sekar', 'Sekar is drawing everyone in our class. If she asks to draw you, say yes.'],
    end: {
      option: 'Show her a photo you took weeks ago: her, laughing.',
      reply: '…You kept this? …I look happy here. Because you were there.',
      b: 'Are you taking a picture right now?',
      a: 'Of the sky. …You’re in it. Lucky shot.',
      epilogue: 'Ahza’s best photo of senior year: the two of them, on the hotel balcony at prom.',
      bakso: 'Ahza got a great photo of the squad eating bakso. He paid for every bowl in it.',
    } },
  { name: 'Aboi', fates: ['made someone laugh so hard she said yes ✓', 'confessed to the vending machine again. It said “sold out”'], role: 'the joker', look: look({ hair: '#1e1a28', style: 'cap', cap: '#ffcf3f', top: '#f08a3a', topSh: '#c86a28', skin: '#d9a07a' }),
    line: 'I confessed to three people today. One of them was the vending machine.',
    hint: ['rania', 'Whatever you do, don’t insult Rania’s bakso. She has a ladle.'],
    end: {
      option: '“Are you a vending machine? Because I’d confess to you four times.”',
      reply: '…That is the worst line I have ever heard. …Yes.',
      b: 'Tell me a joke.',
      a: 'I got a crush before college. …That’s not the joke. That’s the punchline.',
      epilogue: 'Aboi’s worst joke worked. Scientists are baffled.',
      bakso: 'Aboi’s joke didn’t land. The squad laughed anyway, then ordered extra bakso on him.',
    } },
  { name: 'Qai', fates: ['woke up just in time for his crush ✓', 'slept through the whole pact. Peacefully'], role: 'the sleepy one', look: look({ hair: '#2a2236', style: 'messy', sleepy: true, top: '#7a5bb5', topSh: '#5f4590', skin: '#f6cdb2' }),
    line: 'Zzz… huh? Graduation? Wake me up when it’s college.',
    hint: ['kirana', '…Kirana got some big news… mumble… scholarship… zzz…'],
    end: {
      option: '(Yawn.) “I stayed awake all week. Just so I wouldn’t miss this.”',
      reply: '…Qai, awake for a whole week? That’s the most romantic thing I’ve ever heard. Yes.',
      b: 'You’re not falling asleep on my shoulder, are you?',
      a: '…Five more minutes. Best nap spot in the world.',
      epilogue: 'Qai stayed awake for the most important moment. Then napped, very happily.',
      bakso: 'Qai slept through his own confession. Woke up at the bakso stall. Somehow, it’s his bill.',
    } },
  { name: 'Hamzah', fates: ['bonded with someone over cheese bakso ✓', 'is in a committed relationship with bakso'], role: 'the foodie', look: look({ hair: '#1e1a28', style: 'short', top: '#4f8a46', topSh: '#3a6a34', skin: '#e8b48e' }),
    line: 'Rania’s cheese bakso is a masterpiece. Tell her I said so.',
    hint: ['rania', 'If Rania makes you a bento, that means something. Trust me. I know bentos.'],
    end: {
      option: 'Give her your last meatball. (The biggest sacrifice a foodie can make.)',
      reply: '…Hamzah, giving away food? This is serious. …Okay. Yes.',
      b: 'You gave me your last meatball today.',
      a: 'I’d give you every meatball. That’s how I know.',
      epilogue: 'Hamzah found something better than bakso. (Don’t tell the bakso.)',
      bakso: 'Hamzah didn’t get the crush, but he did get bakso. A lot of bakso. Honestly? A win.',
    } },
  { name: 'Nizam', fates: ['played his song at prom. Someone sang along ✓', 'is still writing the second verse'], role: 'the musician', look: look({ hair: '#2a2230', style: 'beanie', beanie: '#3a3050', top: '#2a2a38', topSh: '#1c1c28', skin: '#f0c4a4' }),
    line: 'I’m writing a song for graduation. It’s in D major. D for Dramatic.',
    hint: ['alya', 'Alya feeds a stray cat behind the library. If you find out, keep it secret.'],
    end: {
      option: 'Play her the graduation song you wrote. It’s about her.',
      reply: '…D major. D for… “Dramatic”? …It was beautiful. Yes.',
      b: 'Will you play that song again?',
      a: 'Every time we come back here. It’s ours now.',
      epilogue: 'Nizam’s graduation song topped the class charts. Everyone knows who it’s about.',
      bakso: 'Nizam’s song needs one more verse. He’s writing it at the bakso stall. His treat.',
    } },
];

/** the classmates who might become your crush */
const CRUSHES = {
  hana: { id: 'hana', name: 'Hana', kana: 'ハナ', role: 'transfer student from Japan', x: 600,
    look: look({ girl: true, hair: '#16121e', hairHi: '#3a3050', style: 'long', iris: '#4a3a6a', clip: '#ffffff', tie: '#3a5aa8', bottom: SKIRT, skirt: true, skin: '#f8d8c4' }),
    end: { girlHair: '#16121e', girlHairHi: '#3a3050', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 60 } },
  putri: { id: 'putri', name: 'Putri', kana: 'プトリ', role: 'drama club star', x: 1160,
    look: look({ girl: true, hair: '#c98a5a', hairHi: '#e8b88a', style: 'twintails', ribbon: '#ff5f96', iris: '#d85a8a', tie: '#ff5f96', bottom: SKIRT, skirt: true, skin: '#f6cdb2' }),
    end: { girlHair: '#c98a5a', girlHairHi: '#e8b88a', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 34 } },
  alya: { id: 'alya', name: 'Alya', kana: 'アリヤ', role: 'class president', x: 1820,
    look: look({ girl: true, hair: '#1e1a28', hairHi: '#4a4060', style: 'ponytail', ribbon: '#e8304f', glasses: true, iris: '#4a5aa8', bottom: SKIRT, skirt: true, tie: '#e8304f', skin: '#f6cdb2' }),
    end: { girlHair: '#1e1a28', girlHairHi: '#4a4060', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 40 } },
  rania: { id: 'rania', name: 'Rania', kana: 'ラニア', role: 'canteen chef', x: 2440,
    look: look({ girl: true, hair: '#2a1a1e', hairHi: '#5a3a44', style: 'bun', apron: '#ff9fc2', iris: '#7a3a3a', tie: '#ff7aa8', bottom: SKIRT, skirt: true, skin: '#e8b48e' }),
    end: { girlHair: '#2a1a1e', girlHairHi: '#5a3a44', cardigan: '#ff9fc2', cardiganSh: '#e07aa6', hairLen: 26 } },
  kirana: { id: 'kirana', name: 'Kirana', kana: 'キラナ', role: 'track team ace', x: 2990,
    look: look({ girl: true, hair: '#3a2420', hairHi: '#6a4438', style: 'bob', iris: '#8a5a2a', top: '#ff8a3a', topSh: '#d86a20', bottom: '#2a2a38', skin: '#d9a07a' }),
    end: { girlHair: '#3a2420', girlHairHi: '#6a4438', cardigan: '#ff8a3a', cardiganSh: '#d86a20', hairLen: 14 } },
  nayla: { id: 'nayla', name: 'Nayla', kana: 'ナイラ', role: 'astronomy club', x: 3560,
    look: look({ girl: true, hair: '#2a2a4a', hairHi: '#5a5a8a', style: 'pixie', clip: '#ffd23f', iris: '#3a8ad8', top: '#2a3a6a', topSh: '#1c2a50', bottom: SKIRT, skirt: true, skin: '#f0c4a4' }),
    end: { girlHair: '#2a2a4a', girlHairHi: '#5a5a8a', cardigan: '#2a3a6a', cardiganSh: '#1c2a50', hairLen: 10 } },
  sekar: { id: 'sekar', name: 'Sekar', kana: 'スカル', role: 'quiet artist', x: 3740,
    look: look({ girl: true, hair: '#5b3428', hairHi: '#8a5a44', style: 'braid', iris: '#3a7a5a', top: '#9fc4a0', topSh: '#7aa47c', collar: true, bottom: SKIRT, skirt: true, skin: '#f0c4a4' }),
    end: { girlHair: '#5b3428', girlHairHi: '#8a5a44', cardigan: '#9fc4a0', cardiganSh: '#7aa47c', hairLen: 58 } },
};
const CRUSH_IDS = Object.keys(CRUSHES);
const perCrush = (v) => Object.fromEntries(CRUSH_IDS.map((id) => [id, v]));

/** a little extra for each friend: their name in katakana, eye colour, and a second tip */
const EXTRA = {
  Ghanim: ['ガニム', '#3a3050'], Ghiffy: ['ギフィ', '#7a4a2a'], Lindan: ['リンダン', '#3a6a7a', ['nayla', 'Nayla’s tracking a meteor shower on the last night. Clear skies, by my forecast.']],
  Arkan: ['アルカン', '#3a2a20'], Dyas: ['ディアス', '#3a3a6a'], Zubair: ['ズバイル', '#5a3a6a', ['hana', 'Hana’s from Japan. Don’t be weird about anime with her. …I learned that the hard way.']],
  Ahza: ['アフザ', '#4a3020', ['putri', 'I photographed Putri’s rehearsal. She acts confident, but her hands were shaking.']],
  Aboi: ['アボイ', '#3a2a20'], Qai: ['カイ', '#5a4a7a'], Hamzah: ['ハムザ', '#3a4a2a'],
  Nizam: ['ニザム', '#3a3a4a', ['putri', 'Putri’s play opens on graduation eve. If she asks for help, help. I’m doing the music.']],
};
for (const f of FRIENDS) {
  const [kana, iris, hint2] = EXTRA[f.name];
  f.kana = kana;
  f.look.iris = iris;
  if (hint2) f.hint2 = hint2;
}

/* ----------------------------------------------------------------- state */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LAST_DAY = DAYS.length - 1;
const DAY_START = 7, DAY_END = 21; // 07:00 to 21:00
const SECONDS_PER_DAY = 9 * 60; // one day lasts nine real minutes
const SECONDS_PER_HOUR = SECONDS_PER_DAY / (DAY_END - DAY_START);
const SCHOOL_OUT = 15, PROM = 18;
const clockText = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const state = {
  me: null, // the friend you play
  x: 400, face: 1, phase: 0, moving: false,
  day: 0, clock: DAY_START,
  aff: perCrush(0),
  scene: perCrush(0), // scenes seen
  seenDay: perCrush(-1),
  visits: {},
  met: new Set(),
  talkedFriend: new Set(),
  busy: true, started: false, ended: false,
  last: null, // crush talked to most recently
};
const isFinal = () => state.day === LAST_DAY && state.clock >= PROM;
const afterSchool = () => state.clock >= SCHOOL_OUT;

/* --------------------------------------------------------------- the school */
const WORLD = 7700;
const ZONES = [
  ['Classroom 12-A', 0, 800],
  ['Hallway', 800, 1500],
  ['Library', 1500, 2100],
  ['Canteen', 2100, 2700],
  ['Courtyard', 2700, 3400],
  ['Rooftop', 3400, 3920],
  ['School gate', 3920, 4200],
  ['Town street', 4200, 4450],
  ['Kopi Senja café', 4450, 4950],
  ['Game Center', 4950, 5380],
  ['Bookstore', 5380, 5760],
  ['Riverside park', 5760, 6760],
  ['Grand Bintang Hotel', 6760, WORLD + 100],
];
const zoneAt = (x) => ZONES.find(([, a, b]) => x >= a && x < b)?.[0] || 'Rooftop';
const SAKURA_X = 3150;

let camX = 0;
/** before the game starts the camera rests on the cherry tree at sunset */
let showcase = { x: 3150, q: 0.9 };
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
const smoothstep = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
const lateness = () => smoothstep(14, 18.2, state.clock);
const nightness = () => smoothstep(18.2, 20.5, state.clock);

/* ---------------------------------------------------------------- the people */
let friendsHere = []; // { f, x, face } for this part of the day
function placeFriends() {
  const r = seeded(state.day * 7 + (afterSchool() ? 3 : 0) + 1);
  const spots = afterSchool()
    ? [3880, 4100, 4250, 4380, 4960, 5150, 5300, 5420, 5800, 6080, 6450, 6720, 6900, 7200]
    : [180, 330, 560, 700, 950, 1120, 1330, 1600, 2000, 2200, 2620, 2800, 3300, 3480, 3850];
  const taken = Object.values(CRUSHES).map((c) => crushX(c));
  const free = spots.filter((s) => taken.every((b) => Math.abs(b - s) > 140));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  friendsHere = FRIENDS.filter((f) => f !== state.me).map((f, i) => ({ f, x: free[i % free.length] + (i >= free.length ? 60 : 0), face: r() < 0.5 ? 1 : -1 }));
}
const TOWN_SPOT = { hana: 4640, rania: 4820, alya: 5560, kirana: 5960, sekar: 6290, nayla: 6560, putri: 7000 };
const HOTEL_BALCONY = 7460;
const crushX = (c) => (isFinal() && c.id === topCrush()?.id ? HOTEL_BALCONY : afterSchool() ? TOWN_SPOT[c.id] : c.x);
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

/** soft beams of light falling from the windows, like a film still */
function lightBeams(wins, q) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, w] of wins) {
    const g = ctx.createLinearGradient(0, sy(270), 0, sy(0));
    g.addColorStop(0, `rgba(255,${Math.round(240 - q * 70)},${Math.round(200 - q * 110)},0.16)`);
    g.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx(x), sy(270)); ctx.lineTo(sx(x + w), sy(270));
    ctx.lineTo(sx(x + w - 160), sy(0)); ctx.lineTo(sx(x - 160), sy(0));
    ctx.fill();
  }
  ctx.restore();
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
  const left = DAYS.length - state.day;
  text(left > 1 ? `${left} days until college!` : 'PROM TONIGHT!', 290, 225, 22, '#f4f1e6');
  text('PACT: a crush before college', 290, 185, 14, '#ffd98a', 700);
  text('♥', 430, 150, 22, '#ff9fc2');
  for (const wx of [520, 650]) windowPane(wx, 130, 110, 140, q);
  lightBeams([[520, 110], [650, 110], [1390, 90]], q);
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
  text('Sun · Grand Bintang', 1280, 200, 11, '#3a2a50', 700);
  text('♥ ♥ ♥', 1280, 175, 12, '#ff7aa8');
  windowPane(1390, 130, 90, 140, q);
  // the drama club poster
  rect(1020, 150, 90, 120, '#3a2050');
  text('DRAMA', 1065, 248, 13, '#ffd98a');
  text('CLUB', 1065, 230, 13, '#ffd98a');
  text('♥', 1065, 200, 26, '#ff5f96');
  text('Fri · 7pm', 1065, 168, 10, '#ffffff', 700);
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
  ctx.fillRect(sx(3400), sy(0), 520 * S, H);
  rect(3400, 0, 12, 260, mix('#d8ccb8', '#c8a890', q));
  rect(3412, 0, 70, 120, mix('#8a9aaa', '#7a6a8a', q));
  text('ROOF', 3447, 135, 12, mix('#5a6a7a', '#6a5a7a', q), 800);
  // Nayla's telescope
  ctx.strokeStyle = '#4a4458';
  ctx.lineWidth = 3 * S;
  ctx.beginPath(); ctx.moveTo(sx(3610), sy(0)); ctx.lineTo(sx(3624), sy(52)); ctx.lineTo(sx(3638), sy(0)); ctx.moveTo(sx(3624), sy(0)); ctx.lineTo(sx(3624), sy(52)); ctx.stroke();
  ctx.save(); ctx.translate(sx(3624), sy(58)); ctx.rotate(-0.6);
  ctx.fillStyle = '#e8eef7'; ctx.fillRect(-26 * S, -6 * S, 52 * S, 12 * S);
  ctx.fillStyle = '#3a5aa8'; ctx.fillRect(18 * S, -7 * S, 8 * S, 14 * S);
  ctx.restore();
  // water tank
  rect(3770, 0, 8, 120, '#7a8090');
  rect(3880, 0, 8, 120, '#7a8090');
  ctx.fillStyle = mix('#a8b8c8', '#9a90b0', q);
  ctx.beginPath(); ctx.roundRect(sx(3760), sy(230), 140 * S, 110 * S, 20 * S); ctx.fill();
  // rooftop fence
  ctx.strokeStyle = mix('#7a8a9a', '#5a4a6a', q, 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 3480; x < 3900; x += 14) { ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x + 30), sy(100)); ctx.moveTo(sx(x + 30), sy(0)); ctx.lineTo(sx(x), sy(100)); }
  ctx.stroke();
  ctx.lineWidth = 4 * S;
  ctx.beginPath(); ctx.moveTo(sx(3480), sy(100)); ctx.lineTo(sx(3910), sy(100)); ctx.stroke();
}

/* ------------------------------------------------------ draw: the town */
const TOWN = 3920; // everything past here is outside the school gate
function storefront(x, w, h, wall, sign, signCol, awning, light, n) {
  rect(x, 0, w, h, wall);
  rect(x, h - 10, w, 10, darker(wall, 0.8));
  // big shop window, warm when the lights come on
  rect(x + 16, 10, w - 32, 110, '#2a2238');
  ctx.fillStyle = `rgba(255,${Math.round(220 - 30 * n)},${Math.round(160 - 40 * n)},${0.35 + n * 0.55})`;
  ctx.fillRect(sx(x + 20), sy(116), (w - 40) * S, 102 * S);
  if (awning) {
    const k = Math.max(4, Math.round(w / 40));
    for (let i = 0; i < k; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : awning;
      const ax = x - 6 + (i * (w + 12)) / k, aw = (w + 12) / k;
      ctx.beginPath();
      ctx.moveTo(sx(ax), sy(150)); ctx.lineTo(sx(ax + aw), sy(150)); ctx.lineTo(sx(ax + aw), sy(128));
      ctx.quadraticCurveTo(sx(ax + aw / 2), sy(120), sx(ax), sy(128)); ctx.fill();
    }
  }
  ctx.fillStyle = signCol;
  ctx.beginPath(); ctx.roundRect(sx(x + w * 0.12), sy(h - 18), w * 0.76 * S, 34 * S, 8 * S); ctx.fill();
  text(sign, x + w / 2, h - 35, 16, light || '#ffffff');
  if (n > 0.2) { // a soft glow spilling onto the pavement
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx(x + w / 2), sy(40), 0, sx(x + w / 2), sy(40), w * 0.7 * S);
    g.addColorStop(0, `rgba(255,200,140,${0.22 * n})`); g.addColorStop(1, 'rgba(255,180,120,0)');
    ctx.fillStyle = g; ctx.fillRect(sx(x - w * 0.2), sy(200), w * 1.4 * S, 240 * S);
    ctx.restore();
  }
}
function streetLamp(x, n) {
  ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 5 * S;
  ctx.beginPath(); ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(200)); ctx.quadraticCurveTo(sx(x), sy(220), sx(x + 24), sy(214)); ctx.stroke();
  ctx.fillStyle = n > 0.1 ? `rgba(255,230,160,${0.5 + n * 0.5})` : '#d8d0c8';
  ctx.beginPath(); ctx.arc(sx(x + 26), sy(208), 8 * S, 0, Math.PI * 2); ctx.fill();
  if (n > 0.1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx(x + 26), sy(208), 0, sx(x + 26), sy(208), 120 * S);
    g.addColorStop(0, `rgba(255,220,150,${0.45 * n})`); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(sx(x - 100), sy(330), 250 * S, 250 * S);
    ctx.restore();
  }
}
function sakuraAt(x, scale, q, t) {
  ctx.save();
  ctx.translate(sx(x), sy(0));
  ctx.scale(S * scale, S * scale);
  ctx.fillStyle = '#6a4a44';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.bezierCurveTo(-8, -70, -18, -130, 2, -190); ctx.lineTo(12, -186); ctx.bezierCurveTo(4, -130, 12, -70, 16, 0); ctx.fill();
  const sway = Math.sin(t * 0.8 + x) * 3;
  for (const [col, ox, oy, rs] of [[mix('#ea8ab2', '#e07aa6', q), 0, 0, 1], [mix('#ffc6db', '#ffb8d2', q), -0.14, -0.18, 0.82], [mix('#fff0f5', '#ffe4ef', q), -0.28, -0.36, 0.45]]) {
    ctx.fillStyle = col;
    for (const [bx, by, br] of blossoms) { ctx.beginPath(); ctx.arc(bx + sway + br * ox, by + br * oy, br * rs, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function drawTown(q, n, t) {
  if (camX + viewW() < TOWN - 50) return;
  // school gate
  rect(TOWN, 0, 40, 260, '#c9c2bc'); rect(TOWN + 230, 0, 40, 260, '#c9c2bc');
  rect(TOWN - 10, 250, 290, 34, '#3a5aa8');
  text('SMA BINTANG', TOWN + 135, 267, 16, '#ffffff');
  ctx.strokeStyle = '#7a8090'; ctx.lineWidth = 3 * S; ctx.beginPath();
  for (let x = TOWN + 50; x < TOWN + 230; x += 18) { ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(90)); }
  ctx.stroke();
  // bus stop
  rect(4300, 0, 6, 150, '#5a6070'); rect(4300, 140, 110, 10, '#3a5aa8'); rect(4404, 0, 6, 150, '#5a6070');
  text('BUS', 4355, 125, 12, '#3a5aa8');
  // shops
  storefront(4460, 470, 230, '#f2e2c8', 'Kopi Senja ☕', '#6a4228', '#b8704a', '#ffe9c4', n);
  storefront(4960, 400, 250, '#4a3a7a', 'GAME CENTER', '#ff5f96', null, '#ffffff', Math.max(n, 0.5));
  storefront(5390, 360, 220, '#e8eef7', 'Toko Buku', '#3a6ab0', '#6a9ae6', '#ffffff', n);
  // claw machines in the arcade window
  for (const [i, col] of ['#ff9fc2', '#9fe0ff', '#ffe08a'].entries()) { rect(5000 + i * 110, 10, 80, 100, col); rect(5010 + i * 110, 40, 60, 60, 'rgba(255,255,255,0.6)'); }
  // books in the bookstore window
  for (let i = 0; i < 18; i++) rect(5410 + i * 18, 12, 14, 40 + (i * 7) % 30, ['#e8504f', '#3a5aa8', '#ffcf3f', '#4f8a46', '#7a5bb5'][i % 5]);
  // riverside park
  ctx.fillStyle = mix('#7cc06a', '#5d8a52', q);
  ctx.fillRect(sx(5770), sy(0), 990 * S, 14 * S);
  ctx.fillStyle = mix('#7ac0e8', '#c88aa8', q, 0.85);
  ctx.fillRect(sx(5770), sy(-60), 990 * S, 40 * S); // the river beyond the path
  sakuraAt(5880, 0.8, q, t); sakuraAt(6420, 1.0, q, t);
  rect(6200, 0, 6, 24, '#4a3a34'); rect(6280, 0, 6, 24, '#4a3a34'); rect(6192, 22, 102, 8, '#a86a44');
  // Nayla's telescope by the river
  ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 3 * S;
  ctx.beginPath(); ctx.moveTo(sx(6600), sy(0)); ctx.lineTo(sx(6614), sy(52)); ctx.lineTo(sx(6628), sy(0)); ctx.stroke();
  ctx.save(); ctx.translate(sx(6614), sy(58)); ctx.rotate(-0.6); ctx.fillStyle = '#e8eef7'; ctx.fillRect(-26 * S, -6 * S, 52 * S, 12 * S); ctx.restore();
  // the hotel
  rect(6780, 0, 820, 560, mix('#efe4d0', '#d8b8a0', q));
  for (let fl = 0; fl < 6; fl++) for (let i = 0; i < 9; i++) {
    const lit = n > 0 && ((fl * 9 + i) * 37) % 10 < 7;
    rect(6820 + i * 86, 150 + fl * 66, 50, 40, lit ? `rgba(255,214,140,${0.6 + n * 0.4})` : mix('#9fd0ff', '#ffc89a', q));
  }
  rect(7060, 0, 260, 130, '#3a2a20');
  rect(7080, 0, 220, 110, n > 0 ? 'rgba(255,214,140,0.9)' : '#c8a878');
  rect(7020, 126, 340, 16, '#c9a24a');
  text('GRAND BINTANG HOTEL', 7190, 545, 22, '#c9a24a');
  rect(6900, 60, 140, 80, '#ff5f96');
  text('PROM NIGHT', 6970, 116, 13, '#ffffff');
  text('Sun · 7pm', 6970, 92, 11, '#ffffff', 700);
  text('♥', 6970, 72, 14, '#ffffff');
  // balcony with fairy lights
  rect(7360, 120, 220, 10, '#c9a24a');
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(255,${200 + (i % 3) * 20},150,${0.4 + n * 0.6 * (0.6 + 0.4 * Math.sin(t * 3 + i))})`;
    ctx.beginPath(); ctx.arc(sx(7370 + i * 18), sy(150 + Math.sin(i) * 6), 3.5 * S, 0, Math.PI * 2); ctx.fill();
  }
  for (const x of [4240, 4950, 5770, 6150, 6740, 7620]) streetLamp(x, n);
  // pavement and road through town
  const a = Math.max(0, sx(TOWN));
  if (a < W) {
    ctx.fillStyle = mix('#e9ddd2', '#e2c3b0', q);
    ctx.fillRect(a, sy(0), W - a, 16 * S);
    ctx.fillStyle = mix('#c9bab0', '#b89a92', q);
    ctx.fillRect(a, sy(-16), W - a, 5 * S);
    ctx.fillStyle = mix('#57586a', '#4a3f5a', q);
    ctx.fillRect(a, sy(-21), W - a, H);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = Math.max(TOWN, Math.floor(camX / 120) * 120); x < camX + viewW() + 120; x += 120) ctx.fillRect(sx(x), sy(-70), 60 * S, 5 * S);
  }
}

/** night: the sky darkens, stars come out */
function nightFall(n, t) {
  if (n <= 0) return;
  ctx.fillStyle = `rgba(14,16,52,${n * 0.5})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const x = ((i * 137.5) % W), y = ((i * 61.3) % (baseY() * 0.45));
    ctx.globalAlpha = n * (0.4 + 0.6 * Math.sin(t * 1.3 + i) ** 2);
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
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
  if (L.style === 'long') {
    c.beginPath(); c.moveTo(hx - 24, hy - 4); c.quadraticCurveTo(hx - 30 + wind, hy + 30, hx - 22 + wind * 1.5, hy + 52); c.lineTo(hx + 4, hy + 50); c.lineTo(hx + 10, hy + 6); c.fill();
  }
  if (L.style === 'twintails') {
    for (const dx of [-26, -18]) { c.beginPath(); c.ellipse(hx + dx + wind, hy + 18, 8, 26, 0.2 + wind * 0.02, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = L.ribbon || '#ff5f96';
    c.beginPath(); c.arc(hx - 22, hy - 8, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.hair;
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
  if (L.number) {
    c.fillStyle = '#ffffff';
    c.font = '800 11px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save(); c.scale(o.face, 1); c.fillText(L.number, 2 * o.face, -50 - bob); c.restore();
  }
  if (L.laptop) {
    c.fillStyle = '#9aa0b0'; c.beginPath(); c.roundRect(-16, -50 - bob, 22, 15, 2); c.fill();
    c.fillStyle = '#7fd8ff'; c.beginPath(); c.arc(-5, -43 - bob, 2, 0, Math.PI * 2); c.fill();
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
  if (!['bob', 'braid', 'long', 'twintails'].includes(L.style)) {
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
const stageEl = $('stage');
const porL = $('por-left'), porR = $('por-right');
const stage = { right: null, speaker: null, ex: {}, fx: null };
function lookOf(name) {
  if (name === state.me?.name) return state.me.look;
  return (FRIENDS.find((f) => f.name === name) || Object.values(CRUSHES).find((c) => c.name === name))?.look;
}
function paintPortrait(cv, name, t) {
  const L = name && lookOf(name);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  if (!L) return;
  const talkingNow = speaking === name;
  drawPortrait(c, w, h, L, { expr: stage.ex[name], talking: talkingNow, t, seed: name.length * 3, fx: stage.speaker === name ? stage.fx : null });
}
function drawStage(t) {
  if (stageEl.hidden) return;
  paintPortrait(porL, state.me?.name, t);
  paintPortrait(porR, stage.right, t);
  porL.classList.toggle('dim', stage.speaker !== state.me?.name);
  porR.classList.toggle('dim', !stage.right || stage.speaker !== stage.right);
  porR.classList.toggle('gone', !stage.right);
}
/** speed lines and a screen shake, for big reactions */
function shock() {
  const cv = $('lines');
  const w = cv.width = innerWidth, h = cv.height = innerHeight;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + Math.random() * 0.05;
    const r0 = Math.min(w, h) * (0.32 + Math.random() * 0.15), r1 = Math.max(w, h);
    const da = 0.004 + Math.random() * 0.01;
    c.beginPath();
    c.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
    c.lineTo(w / 2 + Math.cos(a - da) * r1, h / 2 + Math.sin(a - da) * r1);
    c.lineTo(w / 2 + Math.cos(a + da) * r1, h / 2 + Math.sin(a + da) * r1);
    c.fill();
  }
  cv.classList.remove('show'); void cv.offsetWidth; cv.classList.add('show');
  document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
}

function say(who, line, ex = null, effect = null) {
  // who is on stage: you on the left, whoever you're talking to on the right
  if (who && who !== state.me?.name) stage.right = who;
  stage.speaker = who || null;
  if (who) stage.ex[who] = ex || (lookOf(who)?.sleepy ? 'sleepy' : 'normal');
  stage.fx = effect;
  if (state.me && !state.ended) stageEl.hidden = false;
  if (effect === 'shock' && !reduced) shock();
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
function closeDialog() { dlg.hidden = true; speaking = null; stageEl.hidden = true; stage.right = null; stage.ex = {}; }
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
  $('quest').textContent = `Day ${state.day + 1} · ${DAYS[state.day]} · ${clockText(state.clock)}`;
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
  stage.right = n.who.name;
  if (n.kind === 'friend') await talkFriend(n.who);
  else await talkCrush(n.who);
  closeDialog();
  updateHud();
  if (!state.ended) state.busy = false;
}

/** the first of these names that isn't you */
const other = (...names) => names.find((nm) => nm !== state.me.name) || FRIENDS.find((f) => f !== state.me).name;

async function talkFriend(f) {
  const me = state.me.name;
  if (isFinal()) {
    const top = topCrush();
    await say(f.name, top ? `Why are you talking to me?! ${top.name} is waiting on the hotel balcony. GO!` : 'Bro… you didn’t talk to anyone. I can already taste the bakso.');
    return;
  }
  if (!state.talkedFriend.has(f.name)) {
    state.talkedFriend.add(f.name);
    await say(f.name, f.line, 'happy');
    const [cid, tip] = f.hint;
    await say(f.name, tip);
    if (!state.met.has(cid)) await say(me, `${CRUSHES[cid].name}… the ${CRUSHES[cid].role}? Hmm.`);
    return;
  }
  state.visits[f.name] = (state.visits[f.name] || 0) + 1;
  const r = seeded(state.day * 13 + Math.floor(state.clock) * 5 + f.name.length)();
  const left = DAYS.length - state.day;
  const lines = [
    `How’s the pact going, ${me}? Don’t make me eat bakso alone… actually, do.`,
    `${left} day${left === 1 ? '' : 's'} left. No pressure. Okay, a little pressure.`,
    'I believe in you. Mostly. Like 60%.',
    'Go! Time’s ticking!',
  ];
  await say(f.name, lines[Math.floor(r * lines.length)], 'smug');
  const [cid, tip] = f.hint2 && state.visits[f.name] % 2 ? f.hint2 : f.hint;
  await say(f.name, tip);
  if (!state.met.has(cid)) await say(me, `${CRUSHES[cid].name}… the ${CRUSHES[cid].role}? Hmm.`);
}

/** small talk for when there's no new scene today */
const CHAT = {
  hana: [['The clouds here are fluffier than in Japan. Is that weird to notice?', 'normal'], ['This café’s iced coffee is dangerous. That’s my third.', 'happy']],
  putri: [['Run lines with me later? I need a scene partner. Any scene partner.', 'smug'], ['The ballroom stage is HUGE. I’m going to be so good up there.', 'happy']],
  alya: [['Did you finish the reading? …Of course you didn’t.', 'annoyed'], ['This bookstore has the best study corner in town. Don’t tell anyone.', 'smug']],
  rania: [['Cheese bakso sold out again. Popular, huh?', 'happy'], ['Welcome to Kopi Senja! …Oh, it’s you. The usual?', 'happy']],
  kirana: [['Ten more laps, then I’m all yours. …For a chat! A chat.', 'blush'], ['The river path at sunset is the best run in town.', 'happy']],
  nayla: [['Too bright to see stars. Come back when it’s dark.', 'annoyed'], ['See that bright one? Jupiter. Say hi.', 'happy']],
  sekar: [['…Hi. I’m drawing the window light.', 'blush'], ['Hold still. You’re in my picture now.', 'smug']],
};

async function talkCrush(c) {
  if (isFinal()) {
    if (c.id === topCrush()?.id) { await confession(c); return false; }
    await say(c.name, '…Shouldn’t you be somewhere right now?');
    return false;
  }
  if (state.scene[c.id] >= 3 || state.seenDay[c.id] === state.day) {
    // you can always talk; a new scene waits for tomorrow
    const [line, ex] = CHAT[c.id][afterSchool() ? 1 : 0];
    await say(c.name, line, ex);
    if (state.scene[c.id] < 3) await say(c.name, `Come find me tomorrow, ${state.me.name}. I’ll have something to tell you.`, 'smug');
    return false;
  }
  if (!state.met.has(c.id)) await introCard(c);
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

/**
 * Each scene is a little moment with one choice; it returns 2, 1 or 0
 * affection. say(who, line, expression, effect)
 */
const SCENES = {
  hana: [
    async (c, me) => {
      await say('', 'By the classroom window sits Hana, the transfer student from Japan, watching the clouds.');
      await say(c.name, 'Ah— sorry. In Japan, the window seat is where the main character sits.', 'surprised');
      await say(c.name, '…That was a joke.', 'smug');
      const i = await choose(['Then I guess I’m the side character who talks to you.', 'Your Indonesian is really good!', 'Do you know any ninjas?']);
      if (i === 0) { await say(c.name, 'Fufu. Side characters always get the best episodes.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Terima kasih! I practised with a lot of sinetron.', 'happy'); return 1; }
      await say(c.name, '…No.', 'annoyed', 'anger');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'My family moves every two years. I always leave right when I finally make friends.', 'sad');
      await say(c.name, `So I try not to get close. …It’s easier that way, ${me}.`, 'sad');
      const i = await choose(['Then let’s make this one count. Graduation isn’t goodbye.', 'You can text me from anywhere.', 'That sounds exhausting.']);
      if (i === 0) { await say(c.name, '…Okay. Let’s make it count.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Every day? …I might actually do it.', 'happy'); return 1; }
      await say(c.name, '…It is.', 'sad');
      return 0;
    },
    async (c, me) => {
      await say('', 'Hana slides a folded note across the desk. It’s written in Japanese.');
      await say(c.name, 'Don’t translate it until after graduation. Promise.', 'blush');
      const i = await choose(['I promise. I’ll wait.', 'Open it right now.', 'Is it a ransom note?']);
      if (i === 0) { await say(c.name, '…It says “I’m glad I met you.” …Ah. I just told you.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'Mou! …Fine. It says “thank you.” Mostly.', 'annoyed', 'sweat'); return 1; }
      await say(c.name, 'It is now.', 'annoyed', 'anger');
      return 0;
    },
  ],
  putri: [
    async (c, me) => {
      await say(c.name, 'Ah! A volunteer! Read this line with me: “I’ve loved you since the first day of school!”', 'happy', 'sparkle');
      const i = await choose(['Read it with full drama.', 'Read it, but mumble.', 'Run away.']);
      if (i === 0) { await say(c.name, '…Whoa. You’re actually good. Our lead just quit — want the part?', 'surprised', 'shock'); return 2; }
      if (i === 1) { await say(c.name, 'Louder! From the diaphragm! …Eh. It’ll do.', 'annoyed', 'sweat'); return 1; }
      await say(c.name, 'COWARD!', 'annoyed', 'anger');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'Opening night is graduation eve. If I forget my lines, the whole school will see.', 'sad');
      const i = await choose(['Then I’ll be in the front row, cheering the loudest.', 'You won’t forget. You’re Putri.', 'Just… don’t forget them?']);
      if (i === 0) { await say(c.name, '…Front row. I’ll look for you. Don’t you dare leave.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Hmph. Of course I won’t. …Thanks.', 'smug'); return 1; }
      await say(c.name, 'Wow. So helpful.', 'annoyed');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'No script this time. Real talk.', 'sad');
      await say(c.name, `Do you ever feel like you’re always acting? Like nobody sees the real you, ${me}?`, 'sad');
      const i = await choose(['I see you. The real one’s better than any role.', 'Sometimes. But not when I’m with you.', 'Is this a line from the play?']);
      if (i === 0) { await say(c.name, '…That wasn’t in the script. Say it again?', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, '…Same. Weird, huh?', 'blush'); return 1; }
      await say(c.name, '…Yeah. Sure. It’s from the play.', 'sad');
      return 0;
    },
  ],
  alya: [
    async (c, me) => {
      await say('', 'Alya, the class president, is buried under a stack of college forms.');
      await say(c.name, `Oh. ${me}. If you came to copy homework, the answer is no.`, 'annoyed');
      const i = await choose(['I came to help with those forms.', '…Is it that obvious?', 'You look tired. You should smile more.']);
      if (i === 0) { await say(c.name, '…You’d actually do that? Fine. Sort these by deadline.', 'surprised'); await say('', 'You spend the whole break sorting forms. She hums while she works.'); return 2; }
      if (i === 1) { await say(c.name, 'Painfully. …Sit. I’ll explain it instead. Copying won’t help you in college.', 'smug'); return 1; }
      await say(c.name, 'And you should mind your own business.', 'annoyed', 'anger');
      return 0;
    },
    async (c) => {
      await say(c.name, 'I got into the university in Bandung. My parents are thrilled.', 'normal');
      await say(c.name, '…I’m scared, though. Living alone, a new city. Is that stupid?', 'sad');
      const i = await choose(['Not stupid. I’m scared too.', 'You’ll be fine, you’re the smartest here!', 'Bandung is really far, huh.']);
      if (i === 0) { await say(c.name, '…Thanks. That helps more than you’d think.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Everyone says that. It doesn’t make it less scary. But… thanks.', 'sad'); return 1; }
      await say(c.name, '…Thanks for reminding me.', 'annoyed');
      return 0;
    },
    async (c, me) => {
      await say('', 'Behind the library, Alya is crouched down, feeding a stray cat.');
      await say(c.name, `Wh— ${me}! Don’t tell anyone. The class president feeding cats is bad for my image.`, 'surprised', 'shock');
      const i = await choose(['Your secret’s safe with me.', 'Can I pet her too?', 'Everyone already knows.']);
      if (i === 0) { await say(c.name, `…You’re nicer than you look, ${me}.`, 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'Gently! …Huh. She likes you.', 'happy'); return 1; }
      await say(c.name, 'WHAT.', 'surprised', 'shock');
      return 0;
    },
  ],
  rania: [
    async (c, me) => {
      await say(c.name, `${me}! Taste test! New recipe: bakso with cheese inside. Be honest!`, 'happy');
      const i = await choose(['It’s great — but it needs more chili.', 'Delicious!', 'Cheese in bakso is a crime.']);
      if (i === 0) { await say(c.name, 'An honest critic! Finally! You’re my official taster now.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'You’d say that about anything. …But thanks.', 'smug'); return 1; }
      await say(c.name, 'Then you are banned from my canteen.', 'annoyed', 'anger');
      return 0;
    },
    async (c) => {
      await say(c.name, 'I want to open a café after college. Everyone says it’s not a “real” career.', 'sad');
      const i = await choose(['Your food makes people happy. That’s as real as it gets.', 'I’ll be your first customer.', 'Maybe get a “real” degree first?']);
      if (i === 0) { await say(c.name, '…I’m going to remember you said that.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'First customer pays double. …Kidding.', 'happy'); return 1; }
      await say(c.name, '…You sound like my uncle.', 'annoyed');
      return 0;
    },
    async (c) => {
      await say('', 'Rania hands you a bento. The egg is shaped like a heart.');
      await say(c.name, 'Don’t read into the egg. …It just came out that shape.', 'blush', 'sweat');
      const i = await choose(['Then I’ll pretend I didn’t notice. …I noticed.', 'Thank you! It looks amazing.', 'Is this a pity bento?']);
      if (i === 0) { await say(c.name, '…Shut up and eat.', 'blush', 'heart'); await say('', 'Her ears are bright red.'); return 2; }
      if (i === 1) { await say(c.name, 'Eat it while it’s warm!', 'happy'); return 1; }
      await say(c.name, 'It WAS a nice bento.', 'annoyed', 'anger');
      return 0;
    },
  ],
  kirana: [
    async (c, me) => {
      await say(c.name, `Hey, ${me}! Race me to the fence! Loser buys es teh!`, 'happy');
      const i = await choose(['You’re on!', 'I’ll cheer for you from here.', 'Running is for people without motorbikes.']);
      if (i === 0) { await say('', 'You lose. Badly. But you finish.'); await say(c.name, 'You lost, but you didn’t quit. I like that.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Boo! …Okay, the cheering was kind of cute.', 'smug'); return 1; }
      await say(c.name, '…Wow. Okay.', 'annoyed');
      return 0;
    },
    async (c) => {
      await say('', 'Kirana sits on the bench with an ice pack on her knee.');
      await say(c.name, 'Twisted it. Right before the last meet. Great timing, huh?', 'sad');
      const i = await choose(['Let me carry your bag to the nurse.', 'Does it hurt a lot?', 'Guess you’re done running, then.']);
      if (i === 0) { await say(c.name, '…You don’t have to. …Okay. Thanks.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Only my pride. Thanks for asking.', 'normal'); return 1; }
      await say(c.name, 'Thanks, coach. Really encouraging.', 'annoyed', 'anger');
      return 0;
    },
    async (c, me) => {
      await say(c.name, `${me}! I got the sports scholarship! …You’re the first person I told.`, 'happy', 'sparkle');
      const i = await choose(['I knew you would. I’m so proud of you.', 'Congrats! Now you can buy me es teh.', 'Oh, cool. Anyway—']);
      if (i === 0) { await say(c.name, '…Don’t make that face. You’ll make me cry.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'Ha! Deal. A big one.', 'happy'); return 1; }
      await say(c.name, '…Yeah. Anyway.', 'sad');
      return 0;
    },
  ],
  nayla: [
    async (c) => {
      await say('', 'Nayla from the astronomy club is fiddling with a telescope pointed at an empty sky.');
      await say(c.name, 'Shh. I’m calibrating. There’s a meteor shower on the last night.', 'annoyed');
      const i = await choose(['Can I watch it with you?', 'What’s a meteor shower?', 'Stars are just old light. Kind of sad.']);
      if (i === 0) { await say(c.name, '…You’d stay up that late? For space rocks? …Okay. Bring snacks.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Tiny bits of a comet burning up in the sky. Hundreds of wishes, all at once.', 'happy'); return 1; }
      await say(c.name, 'That’s the beautiful part, actually. You just don’t get it.', 'annoyed');
      return 0;
    },
    async (c) => {
      await say(c.name, 'See those two? Vega and Altair. Two stars on opposite sides of the Milky Way.', 'normal');
      await say(c.name, 'The story says they only get to meet once a year.', 'sad');
      const i = await choose(['Then I’d cross the Milky Way every day.', 'That’s a sad story.', 'Sounds like long-distance. Never works.']);
      if (i === 0) { await say(c.name, '…That’s not how space works. …But I liked it.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'It’s a love story. Sad ones count too.', 'sad'); return 1; }
      await say(c.name, '…Okay, Mr. Romance.', 'annoyed', 'anger');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'I named an asteroid. Well — I submitted a name. It’s tiny and far away and no one will ever see it.', 'blush');
      await say(c.name, '…I named it after someone.', 'blush', 'sweat');
      const i = await choose(['…Is that someone on this rooftop right now?', 'Lucky someone.', 'Hope it doesn’t crash into Earth.']);
      if (i === 0) { await say(c.name, `…Asteroid ${me}. It’s very small. And very bright.`, 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, '…Yeah. Lucky.', 'smug'); return 1; }
      await say(c.name, '…I’m renaming it.', 'annoyed', 'anger');
      return 0;
    },
  ],
  sekar: [
    async (c) => {
      await say('', 'Sekar is sketching the sky. She hasn’t noticed you.');
      const i = await choose(['Sit quietly and watch the clouds with her.', 'Whoa, can I see that?', 'Is this the art club? Where’s everyone?']);
      if (i === 0) { await say('', 'You sit. Neither of you says anything. A cloud drifts by.'); await say(c.name, '…You didn’t say anything. That was nice.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'It’s not done… but okay. Just a peek.', 'surprised', 'sweat'); return 1; }
      await say(c.name, 'There is no everyone. Just me.', 'sad');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'I’m drawing everyone in our class before we graduate. So I don’t forget anyone.', 'normal');
      await say(c.name, `…Can I draw you, ${me}?`, 'blush');
      const i = await choose(['Only if I can keep a copy.', 'Sure! Make me look cool.', 'Nah, I’m not photogenic.']);
      if (i === 0) { await say(c.name, '…Okay. I’ll make it a good one, then.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'I draw what I see. …You already look cool. Hold still.', 'blush'); return 1; }
      await say(c.name, 'Drawing isn’t a photo…', 'sad');
      return 0;
    },
    async (c) => {
      await say('', 'Sekar turns her sketchbook around. It’s you, laughing with your friends in the canteen.');
      await say(c.name, 'I drew this one from memory.', 'blush');
      const i = await choose(['You remember that day? …I remember it too.', 'You drew me?! It’s amazing.', 'My nose isn’t that big.']);
      if (i === 0) { await say(c.name, '…I remember a lot of days with you in them.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'It was easy. You laugh a lot.', 'happy'); return 1; }
      await say(c.name, '…It’s exactly that big.', 'smug');
      return 0;
    },
  ],
};

/* ------------------------------------------------- cinematic moments */
const EPISODES = ['The Pact', 'Hearts on the Line', 'After School', 'Halfway There', 'The Weekend', 'Almost Brave', 'Prom Night'];

/** the freeze-frame card anime uses to introduce a character */
async function introCard(who, label) {
  const card = $('card');
  card.querySelector('.card-kana').textContent = who.kana || '';
  card.querySelector('.card-name').textContent = who.name;
  card.querySelector('.card-role').textContent = label || who.role;
  card.hidden = false;
  const cv = $('card-por');
  const t0 = performance.now();
  let live = true;
  const draw = () => {
    if (!live) return;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w && cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    drawPortrait(c, w, h, who.look, { expr: who.look.girl ? 'happy' : 'smug', t: (performance.now() - t0) / 1000, seed: 2, fx: 'sparkle' });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  await wait(30);
  card.classList.add('show');
  song.chime();
  await wait(reduced ? 1200 : 2600);
  card.classList.remove('show');
  await wait(450);
  live = false;
  card.hidden = true;
}

/** the opening: a few lines over the cherry tree, then the title drop */
async function opening() {
  const op = $('op');
  const lineEl = op.querySelector('.op-line');
  op.hidden = false;
  let skip = false;
  const onSkip = () => { skip = true; };
  op.addEventListener('click', onSkip);
  window.addEventListener('keydown', onSkip, { once: true });
  const beats = ['Seven days before college.', 'Eleven friends.', 'One pact.'];
  for (const b of beats) {
    if (skip) break;
    lineEl.textContent = b;
    lineEl.classList.remove('show'); void lineEl.offsetWidth; lineEl.classList.add('show');
    await wait(reduced ? 900 : 1900);
  }
  lineEl.classList.remove('show');
  op.classList.add('flash');
  song.chime();
  op.querySelector('.op-title').classList.add('show');
  await wait(skip ? 600 : 2600);
  op.removeEventListener('click', onSkip);
  op.classList.add('out');
  await wait(600);
  op.hidden = true;
}

/** end credits rolling over the night sky */
async function credits(c) {
  const el = $('credits');
  const roll = el.querySelector('.roll');
  const others = Object.values(CRUSHES).filter((x) => x !== c).map((x) => x.name).join(' · ');
  const squad = FRIENDS.filter((f) => f !== state.me).map((f) => `<p>${f.name} <small>${f.role}</small></p>`).join('');
  roll.innerHTML = `
    <h2>Get a Crush Before College</h2>
    <h3>Starring</h3><p class="big">${state.me.name}</p><p class="big pink">${c.name}</p>
    <h3>The Squad</h3>${squad}
    <h3>Classmates</h3><p>${others}</p>
    <h3>Music</h3><p>“Calm” by prettyjohn1</p>
    <h3>Filmed on location at</h3><p>Class 12-A · the library · the canteen · the rooftop · the cherry tree</p>
    <p class="fin">ありがとう — thank you for playing</p>`;
  el.hidden = false;
  document.body.classList.add('credits-on');
  await wait(30);
  el.classList.add('roll-on');
  await new Promise((r) => { const done = () => { el.removeEventListener('click', done); r(); }; el.addEventListener('click', done); setTimeout(done, reduced ? 6000 : 26000); });
  el.hidden = true;
  document.body.classList.remove('credits-on');
}

/* ------------------------------------------------------------- time */
const fade = $('fade');
async function eyecatch() {
  const ec = $('eyecatch');
  ec.querySelector('.ec-day').textContent = `EPISODE ${state.day + 1} · ${DAYS[state.day]}`;
  ec.querySelector('.ec-name').textContent = EPISODES[state.day];
  ec.querySelector('.ec-slot').textContent = state.day === LAST_DAY ? 'Prom night is tonight' : `${DAYS.length - state.day} days until college`;
  ec.hidden = false;
  await wait(30);
  ec.classList.add('show');
  song.chime();
  await wait(reduced ? 900 : 1700);
  ec.classList.remove('show');
  await wait(500);
  ec.hidden = true;
}
async function nextDay() {
  state.busy = true;
  fade.classList.add('on');
  await wait(900);
  state.day++;
  state.clock = DAY_START;
  state.x = 400;
  state.face = 1;
  camX = clamp(state.x - viewW() * 0.42, 0, WORLD - viewW());
  placeFriends();
  updateHud();
  fade.classList.remove('on');
  await eyecatch();
  state.busy = false;
}

/** called every frame: moves the clock and handles what happens at certain hours */
let lastHour = DAY_START;
async function tickClock(dt) {
  if (!state.started || state.ended || state.busy || !state.me) return;
  const before = state.clock;
  state.clock += dt / SECONDS_PER_HOUR;
  if (before < SCHOOL_OUT && state.clock >= SCHOOL_OUT) {
    placeFriends();
    toast('🔔 School’s out! Everyone heads into town.');
    song.chime();
  }
  if (state.day === LAST_DAY && before < PROM && state.clock >= PROM) {
    state.busy = true;
    await finalAfternoon();
    if (!state.ended) state.busy = false;
    return;
  }
  if (state.clock >= DAY_END) {
    state.clock = DAY_END;
    if (state.day === LAST_DAY) { await baksoEnd(topCrush()); return; }
    state.busy = true;
    await say('', `It’s getting late. ${state.me.name} heads home.`);
    closeDialog();
    await nextDay();
  }
  if (Math.floor(state.clock) !== lastHour) { lastHour = Math.floor(state.clock); updateHud(); }
}
/** skip ahead an hour */
$('skip').addEventListener('click', () => {
  if (!state.started || state.ended || state.busy) return;
  state.clock = Math.min(DAY_END, state.clock + 1);
  tickClock(0);
  updateHud();
});

async function finalAfternoon() {
  const top = topCrush();
  const me = state.me.name;
  if (!top) {
    await say(other('Ghanim', 'Lindan'), `${me}. It’s prom night. You didn’t talk to a single one of them?`);
    await say(other('Hamzah', 'Aboi'), 'BAKSO! BAKSO! BAKSO!');
    closeDialog();
    await baksoEnd(null);
    return;
  }
  await say(other('Ghanim', 'Lindan'), `This is it, ${me}. Prom night. College starts tomorrow.`);
  await say(other('Ghiffy', 'Arkan'), `${top.name} is on the hotel balcony. I may have… told her you wanted to talk.`, 'smug');
  await say(me, 'You WHAT?', 'surprised', 'shock');
  await say(other('Lindan', 'Nizam'), 'Go. Be honest. We’ll be hiding behind the curtains. Supportively.');
  closeDialog();
}

/* ------------------------------------------------------------- endings */
async function confession(c) {
  const me = state.me.name;
  await say('', `Music drifts out from the ballroom. On the balcony, under the fairy lights, ${c.name} turns around.`);
  await say(c.name, `${me}. Your friends said you wanted to tell me something. …Then they ran away.`, 'blush', 'sweat');
  const mine = state.me.end;
  const i = await choose([mine.option, 'I like you. I have for a while.', '(Say nothing. Just hold out your hand.)']);
  if (state.aff[c.id] < 4) {
    await say(c.name, `${me}… you’re really sweet. But I feel like I’ve only just met you.`, 'sad');
    await say(c.name, 'Text me in college? Let’s see what happens.', 'blush');
    closeDialog();
    await baksoEnd(c);
    return;
  }
  if (i === 0) await say(c.name, mine.reply, 'blush', 'heart');
  else if (i === 1) await say(c.name, '…Took you long enough. I like you too.', 'blush', 'heart');
  else { await say('', `${c.name} looks at your hand for a long moment. Then she takes it.`); await say(c.name, '…Hi.', 'happy', 'heart'); }
  await say(other('Ghiffy', 'Aboi'), '(from the bushes) LET’S GOOOOO!', 'happy', 'shock');
  await say(c.name, 'Were they there the whole time?!', 'surprised', 'sweat');
  closeDialog();
  happyEnd(c);
}

function results(winner) {
  const r = seeded(CRUSH_IDS.reduce((a, id, k) => a + state.aff[id] * (k + 3), 0) + state.me.name.length);
  const ul = $('res-list');
  ul.innerHTML = '';
  const me = document.createElement('li');
  me.innerHTML = `<b>${state.me.name} (you)</b> ${winner ? `— ${winner.name} said yes ♥` : '— pays for the bakso'}`;
  ul.append(me);
  for (const f of FRIENDS) {
    if (f === state.me) continue;
    const li = document.createElement('li');
    li.innerHTML = `<b>${f.name}</b> ${f.fates[r() < 0.6 ? 0 : 1]}`;
    ul.append(li);
  }
}

async function baksoEnd(c) {
  closeDialog();
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  await wait(1200);
  $('hud').hidden = true;
  $('skip').hidden = true;
  $('pad').hidden = true;
  document.body.classList.remove('talking');
  $('res-kana').textContent = 'バクソ・エンド';
  $('res-title').textContent = 'Bakso End';
  $('res-sub').textContent = c
    ? `${c.name} wants to get to know you first. That’s not a no! But a pact is a pact. ${state.me.end.bakso}`
    : `No crush before college… ${state.me.end.bakso}`;
  results(null);
  document.body.classList.add('show-results');
  $('results').hidden = false;
  fade.classList.remove('on');
}

function happyEnd(c) {
  closeDialog();
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  setTimeout(() => {
    $('hud').hidden = true;
    $('skip').hidden = true;
    $('pad').hidden = true;
    stopLoop = true;
    document.body.classList.remove('talking');
    $('tc-names').innerHTML = `${state.me.name} <span class="heart">♥</span> ${c.name}`;
    $('tc-episode').textContent = 'Final Episode · Get a Crush Before College';
    const L = state.me.look;
    const plain = L.top === SHIRT;
    startEnding({
      canvas, fx, song,
      names: [state.me.name, c.name],
      looks: { boyHair: L.hair, boyHairHi: L.hairHi, jacket: plain ? '#5a6a9a' : L.top, jacketSh: plain ? '#47557f' : L.topSh, ...c.end },
      gifts: { ribbon: c.id === 'alya' },
      personal: [state.me.end.b, state.me.end.a],
    });
    fade.classList.remove('on');
    // after the title card: the credits roll, then how everyone did
    setTimeout(async () => {
      await credits(c);
      $('res-kana').textContent = '卒業おめでとう！';
      $('res-title').innerHTML = `${state.me.name} <span class="heart">♥</span> ${c.name}`;
      $('res-sub').textContent = `${state.me.end.epilogue} No bakso bill tonight. (Okay, bakso anyway. To celebrate.)`;
      results(c);
      document.body.classList.add('show-results');
      $('results').hidden = false;
    }, 47000);
  }, 1300);
}

/* ---------------------------------------------------------------- input */
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (!state.started || state.ended) return;
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd', 'shift'].includes(k)) { keys.add(k); e.preventDefault(); }
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

const hold = { left: false, right: false, run: false };
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
{
  const b = $('btn-run');
  const on = (e) => { e.preventDefault(); hold.run = !hold.run; b.classList.toggle('held', hold.run); };
  b.addEventListener('pointerdown', on);
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
    const run = keys.has('shift') || hold.run ? 1.9 : 1;
    state.x = clamp(state.x + dir * 190 * run * dt, 60, WORLD - 60);
    state.phase += dt * 11;
  }
  const vw = viewW();
  camX += (clamp(state.x - vw * 0.42, 0, WORLD - vw) - camX) * Math.min(1, dt * 5);

  near = state.busy || !state.started ? null : findNear();
  document.body.classList.toggle('talking', state.busy);
  if (talkBtn.disabled === !!(near || state.busy)) talkBtn.disabled = !(near || state.busy);
  const z = zoneAt(state.x);
  if (z !== lastZone && state.started) { lastZone = z; $('zone').textContent = z; }

  if (showcase) camX = clamp(showcase.x - viewW() / 2, 0, WORLD - viewW());
  tickClock(dt);
  const q = showcase ? showcase.q : lateness();
  const n = showcase ? 0 : nightness();
  if (Math.floor(t) !== Math.floor(t - dt)) $('quest').textContent = state.me ? `Day ${state.day + 1} · ${DAYS[state.day]} · ${clockText(state.clock)}` : '';
  ctx.clearRect(0, 0, W, H);
  drawOutside(q, t);
  drawInterior(q);
  drawCourtyardAndRoof(q, t);
  drawTown(q, n, t);
  nightFall(n, t);

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
  petalsOutside(dt, t);
  drawStage(t);
  fx.update(dt, state.started);
  requestAnimationFrame(frame);
}

/** cherry petals drifting whenever the camera sees outdoors */
const petals = [];
function petalsOutside(dt, t) {
  // petals only where the cherry trees are: the school courtyard and the riverside park
  const mid = camX + viewW() / 2;
  const near = (a, b) => clamp(1 - Math.max(a - mid, mid - b, 0) / 500);
  const outdoors = Math.max(near(2700, 3400), near(5760, 6760));
  const want = Math.round((reduced ? 14 : 55) * outdoors);
  while (petals.length < want) petals.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: 25 + Math.random() * 35, vy: 25 + Math.random() * 30, r: (3 + Math.random() * 3) * S, rot: Math.random() * 6, spin: Math.random() * 4 - 2, flip: Math.random() * 6 });
  ctx.fillStyle = 'rgba(255,196,216,0.92)';
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.x += (p.vx + Math.sin(t + i) * 18) * dt; p.y += p.vy * dt; p.rot += p.spin * dt; p.flip += dt * 3;
    if (p.y > H || p.x > W + 20) { if (petals.length > want) { petals.splice(i, 1); continue; } p.x = Math.random() * W - 60; p.y = -20; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.flip), 1);
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
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
    drawPortrait(cv.getContext('2d'), px, px, f.look, { expr: 'normal', t: 1, seed: 1 });
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
  $('skip').hidden = false;
  if (touch) $('pad').hidden = false;
  state.started = true;
  state.x = 400;
  // the whole squad gathers in the classroom for the pact
  friendsHere = FRIENDS.filter((x) => x !== f).map((x, i) => ({ f: x, x: 90 + i * 62 + (i > 4 ? 130 : 0), face: i % 2 ? -1 : 1 }));
  updateHud();
  await introCard(f, `${f.role} · our protagonist`);
  await eyecatch();
  const me = f.name;
  await say('', 'Seven days before college. Class 12-A, Monday morning.');
  await say(other('Ghanim', 'Lindan'), 'Alright, everyone. The pact. Say it with me.');
  await say(other('Ghiffy', 'Arkan'), 'EVERYONE GETS A CRUSH BEFORE COLLEGE!', 'happy', 'shock');
  await say(other('Aboi', 'Zubair'), 'And whoever doesn’t…');
  await say(other('Hamzah', 'Qai'), '…treats the whole squad to bakso. Extra meatballs.', 'smug');
  await say(other('Lindan', 'Nizam'), `${me}, you go first. Don’t make us eat for free. …Actually, do.`);
  await say(me, '…Why does this feel like a trap?', 'annoyed', 'sweat');
  await say('', 'Each day lasts nine minutes, from 07:00 to 21:00. Talk to anyone, anytime: a ♥ means a girl has a new moment for you today. After 15:00 everyone heads into town. Sunday night is prom — that’s when you confess.');
  closeDialog();
  placeFriends();
  state.busy = false;
}

$('start').addEventListener('click', (e) => {
  e.currentTarget.blur();
  $('intro').classList.add('gone');
  $('sound').hidden = false;
  song.start();
  track.play().then(() => fadeTrack(0.65)).catch(() => {
    song.music = true; // no recording: play the built-in song
    song.ctx && song.ctx.close();
    song.ctx = null;
    song.start();
  });
  opening().then(() => { $('select').hidden = false; showcase = null; });
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
