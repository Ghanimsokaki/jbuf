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
import { battle } from './battle.js';
import { drawPortrait, drawCharacter } from './portrait.js';

/* real illustrated art: art/<name>.webp, a cut-out bust for every character */
const ART = {};
function artFor(name) {
  if (!name) return null;
  const key = name.toLowerCase();
  if (!(key in ART)) { const im = new Image(); im.src = `./art/${key}.webp`; ART[key] = im; }
  return ART[key];
}

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
  { name: 'Haidar', fates: ['asked someone to prom with a single rose. Smooth ✓', 'got 14 love letters and answered none of them'], role: 'the class prince', look: look({ hair: '#2a1e1a', hairHi: '#5a4438', style: 'parted', top: '#ffffff', topSh: '#dfe3ee', tie: '#7a2a3a', skin: '#e8b896' }),
    line: 'Relax. Confidence is 90% of romance. The other 10% is good hair.',
    hint: ['renata', 'Renata surfs at the beach after school. Don’t try to impress her — she sees right through it.'],
    end: {
      option: 'Offer her a single red rose, and a bow.',
      reply: '…Is this a romance drama? …Okay. I’ll play the heroine. Yes.',
      b: 'Do you practise being this smooth?',
      a: 'Only in the mirror. You’re the first live audience.',
      epilogue: 'Haidar, the class prince, finally found his princess.',
      bakso: 'Even the class prince pays for bakso sometimes. Tonight, it’s his turn.',
    } },
  { name: 'Athar', fates: ['gave someone a ride home on his bike. She held on tight ✓', 'is still polishing his motorbike instead of texting back'], role: 'the rider', look: look({ hair: '#141018', style: 'messy', top: '#3a3a44', topSh: '#26262e', skin: '#d9a07a' }),
    line: 'Every road in this town, I’ve ridden it. Every girl in this town? Talked to none.',
    hint: ['thisa', 'Thisa runs her family’s satay stall at the night market. Order the extra-spicy one. Trust me.'],
    end: {
      option: 'Hand her a spare helmet: “Want a ride home… every day?”',
      reply: '…You bought a pink helmet? For me? …Okay. Yes. Drive slowly.',
      b: 'You drove so slowly the bicycles passed us.',
      a: 'Precious cargo. Safety first.',
      epilogue: 'Athar found someone worth riding slowly for.',
      bakso: 'Athar’s bike ran out of fuel on the way to confess. He walked to the bakso stall instead. His treat.',
    } },
];

/** the classmates who might become your crush */
const CRUSHES = {
  ana: { id: 'ana', name: 'Ana', kana: 'アナ', role: 'transfer student from Japan', x: 600,
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
  nadia: { id: 'nadia', name: 'Nadia', kana: 'ナディア', role: 'the singer', x: 1350,
    look: look({ girl: true, hair: '#6a2a3a', hairHi: '#a85a6a', style: 'long', ribbon: '#ffffff', iris: '#c84a6a', tie: '#c84a6a', bottom: SKIRT, skirt: true, skin: '#f6cdb2' }),
    end: { girlHair: '#6a2a3a', girlHairHi: '#a85a6a', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 56 } },
  thisa: { id: 'thisa', name: 'Thisa', kana: 'ティサ', role: 'night-market satay queen', x: 2250,
    look: look({ girl: true, hair: '#1e1612', hairHi: '#4a3a30', style: 'ponytail', ribbon: '#ffb000', iris: '#8a4a1a', top: '#f08a3a', topSh: '#c86a28', bottom: SKIRT, skirt: true, skin: '#d9a07a' }),
    end: { girlHair: '#1e1612', girlHairHi: '#4a3a30', cardigan: '#f08a3a', cardiganSh: '#c86a28', hairLen: 40 } },
  renata: { id: 'renata', name: 'Renata', kana: 'レナタ', role: 'the surfer', x: 3260,
    look: look({ girl: true, hair: '#c8a060', hairHi: '#f0d090', style: 'bob', iris: '#2a8ab0', top: '#4ac0d8', topSh: '#2a98b0', bottom: '#2a2a38', skin: '#d9a07a' }),
    end: { girlHair: '#c8a060', girlHairHi: '#f0d090', cardigan: '#4ac0d8', cardiganSh: '#2a98b0', hairLen: 16 } },
  mira: { id: 'mira', name: 'Mira', kana: 'ミラ', role: 'new transfer student ♡', x: -9999, secret: true,
    look: look({ girl: true, hair: '#b8a0e0', hairHi: '#e0d0ff', style: 'twintails', ribbon: '#ff3f7f', iris: '#e0306a', tie: '#ff3f7f', bottom: SKIRT, skirt: true, skin: '#f8dcc8' }),
    end: { girlHair: '#b8a0e0', girlHairHi: '#e0d0ff', cardigan: '#ffffff', cardiganSh: '#dfe3ee', hairLen: 40 } },
};
const CRUSH_IDS = Object.keys(CRUSHES);
const perCrush = (v) => Object.fromEntries(CRUSH_IDS.map((id) => [id, v]));

/** a little extra for each friend: their name in katakana, eye colour, and a second tip */
const EXTRA = {
  Ghanim: ['ガニム', '#3a3050'], Ghiffy: ['ギフィ', '#7a4a2a'], Lindan: ['リンダン', '#3a6a7a', ['nayla', 'Nayla’s tracking a meteor shower on the last night. Clear skies, by my forecast.']],
  Arkan: ['アルカン', '#3a2a20'], Dyas: ['ディアス', '#3a3a6a'], Zubair: ['ズバイル', '#5a3a6a', ['ana', 'Ana’s from Japan. Don’t be weird about anime with her. …I learned that the hard way.']],
  Ahza: ['アフザ', '#4a3020', ['putri', 'I photographed Putri’s rehearsal. She acts confident, but her hands were shaking.']],
  Aboi: ['アボイ', '#3a2a20'], Qai: ['カイ', '#5a4a7a'], Hamzah: ['ハムザ', '#3a4a2a'],
  Haidar: ['ハイダル', '#5a3a2a', ['nadia', 'Nadia sings in the music room when she thinks nobody’s listening. Be the somebody.']],
  Athar: ['アタル', '#2a2a3a'],
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
  room: null, // which building you are inside, if any
  gift: null, giftDay: -1,
  soul: {}, asked: new Set(), bullyDone: false,
  missing: null, // the girl Bagas took behind the school
};
/** a girl says yes at the confession with at least WIN points (two full hearts) */
const WIN = 4, MAX_AFF = 6;
const isFinal = () => state.day === LAST_DAY && state.clock >= PROM;
const afterSchool = () => state.clock >= SCHOOL_OUT;

/* --------------------------------------------------------------- the school */
const WORLD = 11000;
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
  ['Grand Bintang Hotel', 6760, 7700],
  ['Train station', 7700, 8400],
  ['Night market', 8400, 9300],
  ['Bintang Mall', 9300, 10000],
  ['The beach', 10000, WORLD + 100],
];
const zoneAt = (x) => roomAt(x)?.name || ZONES.find(([, a, b]) => x >= a && x < b)?.[0] || 'Rooftop';
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
    ? [3880, 4100, 4250, 4380, 4960, 5300, 5800, 6080, 6450, 6720, 6900, 7330, 7900, 8250, 8600, 9100, 9500, 9850, 10250, 10700, 20800, 22560, 23020, 24880, 26560, 28200, 28820]
    : [180, 330, 560, 700, 950, 1120, 1330, 1600, 2000, 2200, 2620, 2800, 3300, 3480, 3850];
  const taken = Object.values(CRUSHES).map((c) => crushX(c));
  const free = spots.filter((s) => taken.every((b) => Math.abs(b - s) > 140));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  friendsHere = FRIENDS.filter((f) => f !== state.me).map((f, i) => ({ f, x: free[i % free.length] + (i >= free.length ? 60 : 0), face: r() < 0.5 ? 1 : -1 }));
}
const TOWN_SPOT = { ana: 4640, rania: 4820, alya: 5560, kirana: 5960, sekar: 6290, nayla: 6560, putri: 7000, thisa: 8460, nadia: 9700, renata: 10420 };
const HOTEL_BALCONY = 7460;
const crushX = (c) => (state.missing === c.id ? ROOMS.back.x0 + 880 : isFinal() && c.id === topCrush()?.id ? HOTEL_BALCONY : c.id === 'mira' ? miraX : afterSchool() ? (INSIDE_SPOT[c.id] ? insideX(c.id) : TOWN_SPOT[c.id]) : c.x);
async function addAff(c, n) {
  const before = state.aff[c.id];
  state.aff[c.id] = Math.min(MAX_AFF, before + n);
  updateHud();
  if (before < WIN && state.aff[c.id] >= WIN && !c.secret) {
    await wait(900);
    await say('', `💌 ${c.name} likes you enough to say yes! On Sunday at 18:00 she’ll be waiting on the hotel balcony (Grand Bintang Hotel). Don’t be late.`);
    closeDialog();
  }
}
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
  // the path round the back of the school
  rect(ROOMS.back.door - 3, 0, 6, 120, '#5a4a40');
  ctx.fillStyle = '#3a8a5a';
  ctx.beginPath(); ctx.moveTo(sx(ROOMS.back.door - 46), sy(126)); ctx.lineTo(sx(ROOMS.back.door + 40), sy(126)); ctx.lineTo(sx(ROOMS.back.door + 56), sy(110)); ctx.lineTo(sx(ROOMS.back.door + 40), sy(94)); ctx.lineTo(sx(ROOMS.back.door - 46), sy(94)); ctx.fill();
  text('BACK OF SCHOOL', ROOMS.back.door + 2, 110, 9, '#ffffff');
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

/* ------------------------------------------- draw: further out in town */
const STATION = 7700, MARKET = 8400, MALL = 9300, BEACH = 10000;
function drawFarTown(q, n, t) {
  if (camX + viewW() < STATION - 80) return;
  // train station: platform roof, a train passing every so often
  rect(STATION + 20, 0, 640, 300, mix('#dfe6ee', '#c8b8c8', q));
  rect(STATION, 300, 680, 24, '#3a5aa8');
  text('STASIUN BINTANG', STATION + 340, 312, 16, '#ffffff');
  for (let i = 0; i < 5; i++) rect(STATION + 60 + i * 120, 0, 10, 300, '#7a8090');
  rect(STATION + 40, 120, 600, 160, mix('#9fc8ee', '#ffc89a', q, 0.6));
  const cycle = (t * 260) % 3400;
  if (cycle < 1600) {
    const tx = STATION - 900 + cycle;
    rect(tx, 130, 860, 120, '#e8eef7');
    rect(tx, 200, 860, 16, '#e8304f');
    for (let k = 0; k < 9; k++) rect(tx + 30 + k * 92, 150, 60, 40, n > 0 ? 'rgba(255,220,150,0.9)' : '#7aa8d8');
  }
  rect(STATION + 40, 120, 600, 8, '#5a6070');
  text('Platform 1 · to the city', STATION + 340, 96, 11, '#3a3050', 700);

  // night market: stalls, string lights, steam
  const stalls = [['SATE THISA', '#f08a3a'], ['Martabak', '#e8504f'], ['Es Doger', '#4ac0d8'], ['Jagung Bakar', '#ffcf3f'], ['Takoyaki', '#7a5bb5']];
  stalls.forEach(([name, col], i) => {
    const x = MARKET + 40 + i * 170;
    rect(x, 0, 140, 80, '#8a5a3a');
    rect(x - 6, 140, 152, 20, col);
    rect(x, 80, 6, 60, '#5a3a2a'); rect(x + 134, 80, 6, 60, '#5a3a2a');
    text(name, x + 70, 150, 11, '#ffffff', 800);
    if (i === 0) for (let s2 = 0; s2 < 3; s2++) { // smoke from the satay grill
      ctx.fillStyle = `rgba(255,255,255,${0.25 - s2 * 0.06})`;
      ctx.beginPath(); ctx.arc(sx(x + 70 + Math.sin(t * 2 + s2) * 8), sy(100 + s2 * 26 + (t * 20) % 26), (10 + s2 * 6) * S, 0, Math.PI * 2); ctx.fill();
    }
  });
  for (let i = 0; i < 26; i++) {
    const x = MARKET + 20 + i * 34;
    ctx.fillStyle = ['#ffd23f', '#ff7aa8', '#7fd8ff', '#9fe08a'][i % 4];
    ctx.globalAlpha = 0.5 + 0.5 * n + 0.2 * Math.sin(t * 3 + i);
    ctx.beginPath(); ctx.arc(sx(x), sy(190 + Math.sin(i * 0.7) * 10), 4 * S, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // mall
  rect(MALL + 20, 0, 660, 420, mix('#e8e0f0', '#c8b0d0', q));
  for (let fl = 0; fl < 3; fl++) rect(MALL + 40, 140 + fl * 90, 620, 60, n > 0 ? `rgba(255,214,160,${0.5 + n * 0.5})` : mix('#9fd0ff', '#ffc89a', q));
  rect(MALL + 260, 0, 180, 120, '#2a2238');
  rect(MALL + 270, 0, 160, 110, n > 0 ? 'rgba(255,230,180,0.9)' : '#bfe2ff');
  rect(MALL + 160, 400, 380, 40, '#ff5f96');
  text('BINTANG MALL', MALL + 350, 420, 20, '#ffffff');
  rect(MALL + 520, 20, 120, 80, '#3a2050');
  text('OPEN MIC', MALL + 580, 74, 12, '#ffd98a');
  text('Sat · 7pm ♪', MALL + 580, 50, 10, '#ffffff', 700);

  // beach: sand, sea and a lifeguard tower
  const b0 = Math.max(0, sx(BEACH));
  if (b0 < W) {
    const g = ctx.createLinearGradient(0, sy(90), 0, sy(0));
    g.addColorStop(0, mix('#4aa8d8', '#c870a0', q));
    g.addColorStop(1, mix('#7fd0e8', '#e8a0a0', q));
    ctx.fillStyle = g;
    ctx.fillRect(b0, sy(90), W - b0, 90 * S);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * S;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      for (let x = b0; x < W; x += 10) ctx.lineTo(x, sy(20 + k * 18) + Math.sin(x * 0.03 + t * 2 + k) * 3 * S);
      ctx.stroke();
    }
    rect(BEACH + 600, 0, 8, 150, '#c8a060'); rect(BEACH + 680, 0, 8, 150, '#c8a060');
    rect(BEACH + 590, 150, 110, 50, '#e8304f');
    text('LIFEGUARD', BEACH + 645, 175, 10, '#ffffff');
    // palm tree
    rect(BEACH + 250, 0, 12, 230, '#8a6a4a');
    ctx.fillStyle = mix('#4f9a46', '#2f5a3a', q);
    for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(sx(BEACH + 256), sy(230)); ctx.rotate(-Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(t + k) * 0.04); ctx.beginPath(); ctx.ellipse(55 * S, 0, 60 * S, 12 * S, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // a surfboard stuck in the sand
    ctx.save(); ctx.translate(sx(BEACH + 470), sy(0)); ctx.rotate(-0.15); ctx.fillStyle = '#4ac0d8';
    ctx.beginPath(); ctx.ellipse(0, -60 * S, 14 * S, 62 * S, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  for (const x of [8350, 9250, 9950]) streetLamp(x, n);
}

/* ------------------------------------------------- cars on the town road */
const cars = [];
let nextCar = 3;
/* ------------------------------------------------- inside the buildings */
// each room is its own little stage far past the end of town
const ROOMS = {
  cafe: { name: 'Kopi Senja · inside', label: 'Kopi Senja', door: 4700, x0: 20000, w: 1300 },
  games: { name: 'Game Center · inside', label: 'Game Center', door: 5160, x0: 22000, w: 1200 },
  books: { name: 'Toko Buku · inside', label: 'Toko Buku', door: 5570, x0: 24000, w: 1100 },
  hotel: { name: 'Grand Bintang · ballroom', label: 'the hotel', door: 7190, x0: 26000, w: 1500 },
  mall: { name: 'Bintang Mall · inside', label: 'Bintang Mall', door: 9650, x0: 28000, w: 1400 },
  back: { name: 'Behind the school', label: 'the back of school', enter: 'Go behind the school', door: 3330, x0: 32000, w: 1300 },
};
/** after school some girls are inside: [room, distance from the room's left wall] */
const INSIDE_SPOT = { rania: ['cafe', 610], ana: ['cafe', 1000], alya: ['books', 640], putri: ['hotel', 950], nadia: ['mall', 1030] };
const insideX = (id) => { const [r, off] = INSIDE_SPOT[id]; return ROOMS[r].x0 + off; };
const roomAt = (x) => Object.values(ROOMS).find((r) => x >= r.x0 && x < r.x0 + r.w);
/** things to do inside: a gift (one a day) to give a girl for +1, or just a moment */
const THINGS = [
  { room: 'cafe', off: 380, name: 'Counter', gift: 'an iced Milo', line: 'The barista slides a tall iced Milo across the counter. You know exactly who it’s for.' },
  { room: 'games', off: 380, name: 'Claw machine', gift: 'a pink teddy bear', line: 'The claw wobbles… slips… and drops a pink teddy bear into the chute. FIRST TRY.' },
  { room: 'games', off: 800, name: 'Arcade', line: 'You play “Bakso Fighter II” and set a new high score. You enter your initials. Then you add a heart.' },
  { room: 'books', off: 300, name: 'Poetry shelf', gift: 'a little poetry book', line: 'You find a tiny book of love poems. One page is folded down already. Fate?' },
  { room: 'hotel', off: 330, name: 'Grand piano', line: 'You play the only song you know: Twinkle Twinkle Little Star. A waiter claps, slowly. Respect.' },
  { room: 'mall', off: 330, name: 'Crepe stand', gift: 'a strawberry crepe', line: 'One strawberry crepe, extra cream, wrapped with a little heart sticker.' },
  { room: 'mall', off: 640, name: 'Photo booth', line: 'Click! A sticker photo of you doing a peace sign, alone. Next time, with someone.' },
];
function camTarget() {
  const vw = viewW();
  const r = state.room && ROOMS[state.room];
  if (!r) return clamp(state.x - vw * 0.42, 0, WORLD - vw);
  return r.w <= vw ? r.x0 + (r.w - vw) / 2 : clamp(state.x - vw * 0.42, r.x0, r.x0 + r.w - vw);
}
async function goThrough(n) {
  state.busy = true;
  fade.classList.add('on');
  await wait(420);
  if (n.room) { state.room = n.room; state.x = ROOMS[n.room].x0 + 170; }
  else { state.x = ROOMS[state.room].door + 30; state.room = null; }
  state.face = 1;
  camX = camTarget();
  fade.classList.remove('on');
  await wait(200);
  if (n.room === 'back' && state.missing) {
    await wait(900);
    await bullyEvent(CRUSHES[state.missing]);
    state.missing = null;
    closeDialog();
    updateHud();
  }
  state.busy = false;
}
async function useThing(th) {
  const me = state.me.name;
  if (!th.gift) { await say('', th.line); return; }
  if (state.gift) { await say('', `You’re already carrying ${state.gift}. Give it to someone first!`); return; }
  if (state.giftDay === state.day) { await say('', 'Your wallet says no. One gift a day, big spender. Come back tomorrow.'); return; }
  await say('', th.line);
  state.gift = th.gift;
  state.giftDay = state.day;
  toast(`🎁 Got ${th.gift}! Give it to a girl for ♥ +1`);
  updateHud();
  await say(me, 'Now… who should I give this to?', 'blush', 'sweat');
}

function door(x, glow) {
  rect(x - 32, 0, 64, 118, '#5a3a2a');
  rect(x - 25, 6, 50, 104, glow);
  rect(x - 1, 6, 2, 104, '#5a3a2a');
  ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(sx(x + 14), sy(52), 3 * S, 0, Math.PI * 2); ctx.fill();
  rect(x - 22, 124, 44, 18, '#3a8a5a');
  text('OPEN', x, 133, 10, '#ffffff');
}
function pendant(x, h, col, n) {
  ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 2 * S;
  ctx.beginPath(); ctx.moveTo(sx(x), sy(420)); ctx.lineTo(sx(x), sy(h + 14)); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(sx(x - 18), sy(h)); ctx.lineTo(sx(x + 18), sy(h)); ctx.lineTo(sx(x + 8), sy(h + 16)); ctx.lineTo(sx(x - 8), sy(h + 16)); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx(x), sy(h), 0, sx(x), sy(h), 150 * S);
  g.addColorStop(0, `rgba(255,210,140,${0.35 + n * 0.2})`); g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g; ctx.fillRect(sx(x - 160), sy(h + 160), 320 * S, 320 * S);
  ctx.restore();
}
function table(x, w = 90, top = '#c99a6a', leg = '#6a4228') {
  rect(x - w / 2, 62, w, 8, top);
  rect(x - 4, 0, 8, 62, leg);
  rect(x - 20, 0, 40, 5, leg);
}
function floorBoards(r, col, line, step = 60) {
  ctx.fillStyle = col;
  ctx.fillRect(sx(r.x0), sy(0), r.w * S, H);
  ctx.fillStyle = line;
  for (let x = r.x0; x < r.x0 + r.w; x += step) ctx.fillRect(sx(x), sy(0), 2 * S, H);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(sx(r.x0), sy(0), r.w * S, 10 * S);
}

function drawBack(r, q, n, t) {
  const x0 = r.x0, w = r.w;
  ctx.fillStyle = skyGradient(q, 0, baseY());
  ctx.fillRect(0, 0, W, H);
  // the back wall of the school, grey and a bit sad
  rect(x0 - 400, 0, w + 800, 330, mix('#c9c2bc', '#b8a29a', q));
  for (let i = 0; i < 8; i++) rect(x0 + 60 + i * 170, 240, 90, 50, mix('#8a9aaa', '#9a8aa0', q));
  rect(x0 - 400, 320, w + 800, 12, mix('#a8a098', '#9a8a88', q));
  ctx.strokeStyle = 'rgba(90,70,70,0.35)'; ctx.lineWidth = 2 * S;
  ctx.beginPath(); ctx.moveTo(sx(x0 + 300), sy(330)); ctx.lineTo(sx(x0 + 330), sy(260)); ctx.lineTo(sx(x0 + 310), sy(200)); ctx.stroke();
  text('BAGAS WUZ HERE', x0 + 640, 170, 22, 'rgba(200,40,60,0.75)');
  text('♥ ? ♥', x0 + 640, 140, 14, 'rgba(255,255,255,0.6)');
  // bike shed
  rect(x0 + 820, 0, 8, 200, '#5a6070'); rect(x0 + 1180, 0, 8, 200, '#5a6070'); rect(x0 + 800, 196, 410, 14, '#3a5aa8');
  for (let i = 0; i < 4; i++) { const bx = x0 + 1050 + i * 34; ctx.strokeStyle = '#2a2a38'; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.arc(sx(bx), sy(18), 16 * S, 0, Math.PI * 2); ctx.stroke(); }
  // bins and an old vending machine
  rect(x0 + 380, 0, 90, 80, '#4f8a46'); rect(x0 + 376, 78, 98, 8, '#3a6a34');
  rect(x0 + 480, 0, 90, 80, '#3a5aa8'); rect(x0 + 476, 78, 98, 8, '#2a4a88');
  rect(x0 + 640, 0, 100, 190, '#e8504f'); rect(x0 + 652, 70, 76, 100, 'rgba(255,255,255,0.75)');
  for (let k = 0; k < 6; k++) rect(x0 + 658 + (k % 3) * 24, 120 + Math.floor(k / 3) * 36, 16, 26, ['#ffcf3f', '#3a5aa8', '#4f8a46'][k % 3]);
  text('OUT OF ORDER', x0 + 690, 40, 9, '#ffffff', 700);
  // the ground: cracked asphalt
  ctx.fillStyle = mix('#8a8478', '#7a6a6a', q); ctx.fillRect(0, sy(0), W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = 0; k < 14; k++) ctx.fillRect(sx(x0 + k * 97), sy(-4 - (k % 3) * 10), 40 * S, 2 * S);
  // the way back
  rect(x0 + 60, 0, 60, 130, '#5a3a2a'); rect(x0 + 66, 6, 48, 118, mix('#bfe2ff', '#ffc89a', q));
  rect(x0 + 50, 138, 80, 18, '#3a8a5a'); text('COURTYARD', x0 + 90, 147, 9, '#ffffff');
}
function drawRoom(r, q, n, t) {
  if (state.room === 'back') { drawBack(r, q, n, t); return; }
  ctx.fillStyle = '#140f1e';
  ctx.fillRect(0, 0, W, H);
  const x0 = r.x0, w = r.w, id = state.room;
  const wall = { cafe: '#f2e2c8', games: '#2a1e4a', books: '#e8eef7', hotel: '#f3e6cf', mall: '#f0eaf6' }[id];
  const top = Math.max(440, baseY() / S + 40); // walls all the way up to the top of the screen
  rect(x0, 0, w, top, wall);
  rect(x0, 410, w, 20, darker(wall, 0.82));
  if (id === 'cafe') {
    rect(x0, 0, w, 80, '#8a5a3a'); rect(x0, 80, w, 6, '#6a4228');
    for (const wx of [x0 + 880, x0 + 1080]) windowPane(wx, 130, 150, 170, q);
    rect(x0 + 230, 170, 320, 150, '#2e3a32'); rect(x0 + 224, 164, 332, 6, '#a8865a');
    text('MENU', x0 + 390, 300, 18, '#ffd98a');
    text('Kopi susu ........ 18k', x0 + 390, 268, 13, '#ffffff', 700);
    text('Iced Milo ......... 15k', x0 + 390, 244, 13, '#ffffff', 700);
    text('Matcha latte ..... 20k', x0 + 390, 220, 13, '#ffffff', 700);
    text('Cheese bakso? ... ask Rania', x0 + 390, 192, 11, '#ff9fc2', 700);
    rect(x0 + 250, 0, 420, 96, '#6a4228'); rect(x0 + 240, 96, 440, 12, '#c99a6a');
    rect(x0 + 300, 108, 70, 56, '#9aa0b0'); rect(x0 + 310, 118, 50, 30, '#5a6070');
    for (const [k, col] of ['#ff9fc2', '#ffd98a', '#9fe0ff'].entries()) { rect(x0 + 470 + k * 34, 108, 22, 30, col); rect(x0 + 468 + k * 34, 136, 26, 5, '#ffffff'); }
    for (const px of [x0 + 330, x0 + 620, x0 + 930, x0 + 1150]) pendant(px, 330, '#3a5a46', n);
    for (const tx of [x0 + 820, x0 + 1180]) { table(tx); rect(tx - 70, 0, 8, 46, '#6a4228'); rect(tx - 78, 40, 30, 6, '#8a5a3a'); rect(tx + 62, 0, 8, 46, '#6a4228'); rect(tx + 48, 40, 30, 6, '#8a5a3a'); rect(tx - 10, 70, 20, 16, '#ffffff'); }
    for (const px of [x0 + 160, x0 + 720]) { rect(px - 16, 0, 32, 36, '#c4814e'); ctx.fillStyle = '#4f8a46'; ctx.beginPath(); ctx.arc(sx(px), sy(60), 30 * S, 0, Math.PI * 2); ctx.fill(); }
    text('Kopi Senja ☕', x0 + 650, 390, 20, '#6a4228');
    floorBoards(r, '#a8754a', '#94653e');
  } else if (id === 'games') {
    for (let k = 0; k < 3; k++) rect(x0, 320 + k * 30, w, 4, ['#ff5f96', '#5fd8ff', '#ffd95f'][k]);
    text('★ GAME CENTER ★', x0 + 650, 390, 22, '#ff9fc2');
    // claw machine
    const cx = x0 + 380;
    rect(cx - 70, 0, 140, 260, '#ff9fc2'); rect(cx - 60, 90, 120, 150, 'rgba(220,240,255,0.55)');
    for (let k = 0; k < 7; k++) { ctx.fillStyle = ['#ffd95f', '#9fe0ff', '#ffffff', '#c8a0ff'][k % 4]; ctx.beginPath(); ctx.arc(sx(cx - 45 + k * 15), sy(102 + (k % 2) * 10), 10 * S, 0, Math.PI * 2); ctx.fill(); }
    const clawX = cx + Math.sin(t * 1.3) * 40;
    ctx.strokeStyle = '#5a6070'; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(sx(clawX), sy(240)); ctx.lineTo(sx(clawX), sy(190)); ctx.moveTo(sx(clawX - 12), sy(178)); ctx.lineTo(sx(clawX), sy(190)); ctx.lineTo(sx(clawX + 12), sy(178)); ctx.stroke();
    text('CLAW', cx, 250, 14, '#ffffff');
    // arcade cabinets with glowing screens
    for (let k = 0; k < 5; k++) {
      const ax = x0 + 580 + k * 120;
      rect(ax - 45, 0, 90, 230, ['#3a5aa8', '#e8504f', '#4f8a46', '#7a5bb5', '#ff8a3a'][k]);
      const hue = (t * 60 + k * 70) % 360;
      ctx.fillStyle = `hsl(${hue},80%,62%)`; ctx.fillRect(sx(ax - 32), sy(200), 64 * S, 56 * S);
      rect(ax - 40, 110, 80, 22, '#1a1424');
      ctx.fillStyle = '#ff3f5f'; ctx.beginPath(); ctx.arc(sx(ax + 16), sy(124), 5 * S, 0, Math.PI * 2); ctx.fill();
      rect(ax - 20, 118, 4, 14, '#cccccc');
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, sy(260), 0, sy(0)); g.addColorStop(0, 'rgba(255,95,150,0.12)'); g.addColorStop(1, 'rgba(95,216,255,0.06)');
    ctx.fillStyle = g; ctx.fillRect(sx(x0), sy(430), w * S, 430 * S); ctx.restore();
    ctx.fillStyle = '#2a2244'; ctx.fillRect(sx(x0), sy(0), w * S, H);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let k = 0; k < 40; k++) { const fx = x0 + ((k * 137) % w), fy = -((k * 53) % 120) - 8; ctx.fillRect(sx(fx), sy(fy), 3 * S, 3 * S); }
  } else if (id === 'books') {
    windowPane(x0 + 900, 130, 140, 170, q);
    const cols = ['#e8504f', '#3a5aa8', '#ffcf3f', '#4f8a46', '#7a5bb5'];
    for (const [k, bx] of [x0 + 220, x0 + 380, x0 + 540, x0 + 700].entries()) {
      rect(bx, 0, 140, 300, '#8a5a3a');
      for (let rr = 0; rr < 5; rr++) {
        rect(bx + 6, 18 + rr * 56, 128, 6, '#6a4228');
        for (let b = 0; b < 10; b++) rect(bx + 10 + b * 12.4, 24 + rr * 56, 10, 34 + ((b * 7 + rr + k) % 3) * 5, cols[(b + rr + k) % 5]);
      }
      text(['POETRY ♥', 'MANGA', 'NOVELS', 'STUDY'][k], bx + 70, 318, 12, '#3a6ab0');
    }
    rect(x0 + 960, 0, 110, 50, '#c4814e'); rect(x0 + 960, 50, 22, 50, '#c4814e'); rect(x0 + 1048, 50, 22, 50, '#c4814e'); rect(x0 + 970, 46, 90, 14, '#e09a64');
    pendant(x0 + 470, 340, '#3a6ab0', n); pendant(x0 + 860, 340, '#3a6ab0', n);
    text('Toko Buku', x0 + 600, 395, 20, '#3a6ab0');
    floorBoards(r, '#c99a6a', '#b8895a');
  } else if (id === 'hotel') {
    for (let k = 0; k < 8; k++) rect(x0 + 40 + k * 185, 60, 10, 340, '#e2c78a');
    rect(x0, 400, w, 8, '#c9a24a');
    // the stage
    rect(x0 + 700, 0, 520, 70, '#5a2a3a'); rect(x0 + 690, 70, 540, 10, '#c9a24a');
    rect(x0 + 690, 80, 70, 320, '#b8304f'); rect(x0 + 1160, 80, 70, 320, '#b8304f');
    rect(x0 + 760, 330, 400, 60, '#ff5f96');
    text(state.day === LAST_DAY ? 'PROM NIGHT ♥ TONIGHT' : 'PROM NIGHT ♥ SUNDAY', x0 + 960, 360, 18, '#ffffff');
    // chandeliers
    for (const cxh of [x0 + 400, x0 + 960]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx(cxh), sy(330), 0, sx(cxh), sy(330), 220 * S);
      g.addColorStop(0, 'rgba(255,230,170,0.45)'); g.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = g; ctx.fillRect(sx(cxh - 230), sy(560), 460 * S, 460 * S); ctx.restore();
      for (let k = -3; k <= 3; k++) { ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(sx(cxh + k * 16), sy(320 - Math.abs(k) * 6 + Math.sin(t * 2 + k) * 1.5), 5 * S, 0, Math.PI * 2); ctx.fill(); }
      rect(cxh - 60, 340, 120, 6, '#c9a24a');
    }
    // piano and round tables with white cloths
    const px = x0 + 330;
    rect(px - 70, 50, 150, 40, '#141018'); rect(px - 70, 0, 8, 50, '#141018'); rect(px + 64, 0, 8, 50, '#141018');
    for (let k = 0; k < 12; k++) rect(px - 60 + k * 11, 82, 9, 8, '#ffffff');
    for (const tx of [x0 + 560, x0 + 1340]) { rect(tx - 55, 0, 110, 66, '#ffffff'); rect(tx - 55, 66, 110, 6, '#f0e6d8'); ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.arc(sx(tx), sy(84), 10 * S, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#7a2a3a'; ctx.fillRect(sx(x0), sy(0), w * S, H);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(sx(x0), sy(0), w * S, 4 * S);
  } else if (id === 'mall') {
    const shops = [['Crepes', '#ff9fc2', 330], ['Photo Booth', '#5fd8ff', 640], ['Fashion', '#c8a0ff', 1250]];
    for (const [nm, col, off] of shops) {
      rect(x0 + off - 110, 0, 220, 280, '#ffffff'); rect(x0 + off - 100, 0, 200, 220, darker(col, 0.95));
      rect(x0 + off - 110, 280, 220, 40, col); text(nm, x0 + off, 300, 16, '#3a2a50');
      rect(x0 + off - 70, 0, 140, 150, 'rgba(255,255,255,0.45)');
    }
    // escalator
    ctx.fillStyle = '#b8b0c8'; ctx.beginPath(); ctx.moveTo(sx(x0 + 760), sy(0)); ctx.lineTo(sx(x0 + 840), sy(0)); ctx.lineTo(sx(x0 + 900), sy(260)); ctx.lineTo(sx(x0 + 820), sy(260)); ctx.fill();
    // the open-mic stage
    rect(x0 + 940, 0, 240, 40, '#3a2050'); rect(x0 + 930, 40, 260, 8, '#ffd98a');
    rect(x0 + 950, 260, 220, 50, '#3a2050'); text('OPEN MIC ♪', x0 + 1060, 285, 16, '#ffd98a');
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(sx(x0 + 1100), sy(40)); ctx.lineTo(sx(x0 + 1100), sy(120)); ctx.stroke();
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(sx(x0 + 1100), sy(124), 6 * S, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,240,180,0.13)'; ctx.beginPath(); ctx.moveTo(sx(x0 + 1040), sy(420)); ctx.lineTo(sx(x0 + 1080), sy(420)); ctx.lineTo(sx(x0 + 1170), sy(0)); ctx.lineTo(sx(x0 + 950), sy(0)); ctx.fill(); ctx.restore();
    text('BINTANG MALL', x0 + 700, 395, 20, '#ff5f96');
    floorBoards(r, '#ddd5e6', '#cbc2d6', 90);
  }
  // the way out
  rect(x0 + 60, 0, 60, 130, '#5a3a2a'); rect(x0 + 66, 6, 48, 118, mix('#bfe2ff', '#ffc89a', q));
  rect(x0 + 66, 138, 48, 18, '#3a8a5a'); text('EXIT', x0 + 90, 147, 10, '#ffffff');
}

function drawCar(x, h, col, dir) {
  ctx.save();
  ctx.translate(sx(x), sy(h));
  ctx.scale(S * dir, S);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.roundRect(-90, -52, 180, 36, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-50, -82, 100, 34, 12); ctx.fill();
  ctx.fillStyle = 'rgba(200,230,255,0.9)';
  ctx.fillRect(-42, -76, 38, 24); ctx.fillRect(4, -76, 38, 24);
  ctx.fillStyle = '#ffeaa0'; ctx.fillRect(84, -44, 8, 10);
  ctx.fillStyle = '#2a2a38';
  ctx.beginPath(); ctx.arc(-55, -14, 15, 0, Math.PI * 2); ctx.arc(55, -14, 15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function updateCars(dt) {
  if (!road && afterSchool()) {
    nextCar -= dt;
    if (nextCar <= 0) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      cars.push({ x: dir > 0 ? camX - 300 : camX + viewW() + 300, dir, speed: 300 + Math.random() * 200, col: ['#e8504f', '#3a5aa8', '#ffcf3f', '#e8eef7', '#4f8a46'][Math.floor(Math.random() * 5)] });
      nextCar = 2 + Math.random() * 4;
    }
  }
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    c.x += c.dir * c.speed * dt;
    if (c.x < camX - 600 || c.x > camX + viewW() + 600) { cars.splice(i, 1); continue; }
    if (c.x > TOWN) drawCar(c.x, c.dir > 0 ? -100 : -50, c.col, c.dir);
  }
}

/* ------------------------------------------ event: a girl steps into the road */
let road = null; // { c, x, carX, t, done }
let roadDay = -1;
function maybeStartRoadEvent(dt) {
  if (road || state.room || roadDay === state.day || !afterSchool() || state.day === LAST_DAY || state.busy || state.ended || state.x < 4300 || state.x > BEACH) return;
  // usually within ten seconds of reaching town, and for sure by 17:30
  if (Math.random() > dt / 10 && state.clock < 17.5) return;
  const pool = Object.values(CRUSHES).filter((c) => !c.secret && Math.abs(crushX(c) - state.x) > 300);
  startRoadEvent(pool[Math.floor(Math.random() * pool.length)]);
}
function startRoadEvent(c) {
  roadDay = state.day;
  road = { c, x: state.x + 240 * state.face, carX: state.x + 240 * state.face + 1300, t: 0, done: false };
  state.busy = true;
  stage.right = null;
  $('save-btn').hidden = false;
  $('save-btn').focus({ preventScroll: true });
  song.chime();
}
function drawRoadEvent(dt, t) {
  if (!road) return;
  road.t += dt;
  const slow = road.saved ? 0.2 : 1;
  if (!road.done) road.carX -= 400 * dt * slow;
  // the girl looking at her phone in the middle of the road
  const gx = road.saved ? road.x - 20 : road.x;
  walker(road.c.name, { x: sx(gx), y: sy(road.saved ? 0 : -50), k: S, face: 1, look: road.c.look, t, phase: 0, moving: false, seed: 9 });
  drawCar(road.carX, -50, '#e8304f', -1);
  if (!road.saved && !road.done) {
    // warning marks and the prompt
    text('!!', road.x, 150, 34, '#ff3f5f');
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3 * S;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx(road.carX + 100 + k * 30), sy(-70 - k * 8)); ctx.lineTo(sx(road.carX + 180 + k * 40), sy(-70 - k * 8)); ctx.stroke(); }
  }
  if (!road.done && road.carX - road.x < 130) finishRoad(false);
}
async function finishRoad(saved) {
  if (!road || road.done) return;
  road.done = true;
  road.saved = saved;
  $('save-btn').hidden = true;
  const c = road.c;
  const me = state.me.name;
  if (saved) {
    shock();
    state.x = road.x - 60;
    state.face = 1;
    await wait(900);
    if (!state.met.has(c.id)) await introCard(c);
    state.met.add(c.id);
    await say('', `${me} dives into the road and pulls ${c.name} back onto the pavement. The car roars past, inches away.`);
    await say(c.name, `W-what… ${me}? You… you just saved my life?!`, 'surprised', 'shock');
    await say(c.name, '…My heart is beating so fast. I don’t think it’s only because of the car.', 'blush', 'heart');
    state.last = c.id;
    toast(`HERO! ${c.name} ♥ +3`);
    addSoul('bravery', 2);
    song.pickup();
    fx.burst(sx(state.x), sy(110), reduced ? 8 : 20);
    closeDialog();
    await addAff(c, 3);
  } else {
    await say('', `SCREEEECH! The car brakes hard and stops just in front of ${c.name}. The driver honks. She jumps back to the pavement, shaking.`);
    await say(c.name, '…That was way too close. I need to stop texting while walking.', 'sad', 'sweat');
    toast('Too slow… she’s okay, but no hero points.');
  }
  closeDialog();
  road = null;
  state.busy = false;
  updateHud();
}
$('save-btn').addEventListener('click', () => finishRoad(true));
window.addEventListener('keydown', (e) => { if (road && !road.done && e.key.toLowerCase() === 'f') { e.preventDefault(); finishRoad(true); } });

/* ------------------------------------------------------ the crazy crush */
let miraX = -9999;
function updateMira(dt) {
  if (state.day < 2 || !state.me || (isFinal() && topCrush()?.id !== 'mira')) { miraX = -9999; return; }
  // she is always just a little behind you. always.
  const target = state.x - 170 * state.face;
  if (miraX < -1000) miraX = target - 400 * state.face;
  miraX += (target - miraX) * Math.min(1, dt * 0.9);
}

async function crazyEnd(c) {
  const me = state.me.name;
  await say('', 'The lights on the balcony flicker. When they come back on, Mira is standing right in front of you.');
  await say(c.name, `I knew you’d choose me, ${me}. I’ve known since… well, since I chose you. ♡`, 'happy', 'heart');
  await say(c.name, 'Look! My phone wallpaper is you. And my lock screen. And my notebook. And my pillowcase.', 'happy', 'sparkle');
  await say(c.name, 'I already enrolled in your college. Same major. Same dorm floor. I bought us matching bags! ♡', 'smug', 'heart');
  await choose(['…Run.', 'Mira, this is a lot.', '(Smile nervously.)']);
  await say(c.name, 'Hehe, you’re so funny! Let’s run together! Forever and ever and ever. ♡', 'happy', 'shock');
  closeDialog();
  state.ended = true;
  state.busy = true;
  fade.classList.add('on');
  await wait(1400);
  ['hud', 'skip', 'pad', 'save-btn'].forEach((id) => { $(id).hidden = true; });
  document.body.classList.remove('talking');
  $('res-kana').textContent = 'ヤンデレ・エンド';
  $('res-title').innerHTML = `${me} <span class="heart">♥</span> Mira…?`;
  $('res-sub').textContent = `${me} got a crush before college. Technically, the crush got ${me}. She’ll be there on the first day of college. And the second. And every day after that. ♡`;
  results(c);
  $('res-list').firstChild.innerHTML = `<b>${me} (you)</b> — Mira said yes before you asked`;
  const cg = document.createElement('img');
  cg.src = './art/ending/mira.webp';
  cg.className = 'crazy-cg';
  cg.alt = '';
  $('results').prepend(cg);
  document.body.classList.add('show-results', 'crazy');
  $('results').hidden = false;
  fade.classList.remove('on');
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

/** the illustrated walking sprites in art/sprite/, with the code-drawn chibi as a fallback */
const SPRITE = {};
function spriteFor(name) {
  const key = name.toLowerCase();
  if (!(key in SPRITE)) { const im = new Image(); im.src = `./art/sprite/${key}.webp`; SPRITE[key] = im; }
  return SPRITE[key];
}
function frameFor(name, kind) {
  const key = `${name.toLowerCase()}-${kind}`;
  if (!(key in SPRITE)) { const im = new Image(); im.src = `./art/sprite/${key}.webp`; SPRITE[key] = im; }
  const im = SPRITE[key];
  return im.complete && im.naturalWidth ? im : null;
}
function walker(name, o) {
  let im = spriteFor(name);
  if (o.moving) {
    // a two-frame cycle: stride and stand for walking, run and stride for running
    const step = Math.floor(o.phase / Math.PI) % 2;
    const walk = frameFor(name, 'walk'), run = frameFor(name, 'run');
    if (o.running && run) im = step ? run : (walk || im);
    else if (walk) im = step ? walk : im;
  }
  if (!im.complete || !im.naturalWidth) return chibi(ctx, o);
  const h = 128 * o.k, w = (im.naturalWidth * h) / im.naturalHeight;
  const bob = o.moving ? Math.abs(Math.sin(o.phase)) * 5 * o.k : Math.sin(o.t * 2 + o.seed) * 1.2 * o.k;
  const hop = o.talking ? Math.abs(Math.sin(o.t * 9)) * 3 * o.k : 0;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(40,20,50,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.32, 5 * o.k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(o.moving ? Math.sin(o.phase) * 0.05 : 0);
  ctx.scale(o.face, 1);
  ctx.drawImage(im, -w / 2, -h - bob - hop, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------- prompts */
let near = null;
function interactables() {
  const list = friendsHere.map((p) => ({ kind: 'friend', id: p.f.name, x: p.x, who: p.f }));
  for (const c of Object.values(CRUSHES)) { const x = crushX(c); if (x > -1000) list.push({ kind: 'crush', id: c.id, x, who: c }); }
  if (state.room) {
    const r = ROOMS[state.room];
    list.push({ kind: 'door', id: 'out', x: r.x0 + 90, who: { name: 'Go outside' }, room: null });
    for (const th of THINGS) if (th.room === state.room) list.push({ kind: 'thing', id: th.name, x: r.x0 + th.off, who: { name: th.gift ? `${th.name} 🎁` : th.name }, th });
  } else {
    for (const [k, r] of Object.entries(ROOMS)) list.push({ kind: 'door', id: `in-${k}`, x: r.door, who: { name: r.enter || `Enter ${r.label}` }, room: k });
  }
  return list;
}
function findNear() {
  let best = null, bd = 80;
  const top = isFinal() ? topCrush()?.id : null;
  for (const n of interactables()) {
    let d = Math.abs(n.x - state.x);
    // the girl you came to see wins over whoever is standing next to her
    if (n.kind === 'crush' && n.id === top) d = d < 130 ? 0 : d;
    else if (n.kind === 'crush' && sceneReady(n.who)) d -= 25;
    else if (n.kind === 'door' || n.kind === 'thing') d += 15; // people first
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
const sceneReady = (c) => state.seenDay[c.id] !== state.day;

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
  if (name === 'Bagas') return BAGAS_LOOK;
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
  drawCharacter(c, w, h, L, artFor(name), { expr: stage.ex[name], talking: talkingNow, t, seed: name.length * 3, fx: stage.speaker === name ? stage.fx : null });
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
  const top = topCrush();
  const ready = top && state.aff[top.id] >= WIN;
  $('goal').textContent = state.missing
    ? `🚨 ${CRUSHES[state.missing].name} is missing! Find her behind the school (courtyard)`
    : isFinal() && top
    ? `💌 Go to the hotel balcony → confess to ${top.name}!`
    : ready
      ? `💌 ${top.name} would say yes · Sunday 18:00, hotel balcony`
      : state.day === LAST_DAY
        ? 'Last day! Get ♥♥ with someone before 18:00'
        : 'Goal: ♥♥ with one girl by Sunday 18:00';
  if (state.gift) $('goal').textContent += ` · 🎁 ${state.gift}`;
  for (const c of Object.values(CRUSHES)) {
    if (!state.met.has(c.id)) continue;
    const a = Math.min(MAX_AFF, state.aff[c.id]);
    const full = Math.floor(a / 2), half = a % 2;
    const li = document.createElement('li');
    if (a >= WIN) li.className = 'ready';
    li.innerHTML = `${c.name} <span class="h">${'♥'.repeat(full)}${half ? '♡' : ''}<i>${'♡'.repeat(Math.max(0, 3 - full - half))}</i></span>${a >= WIN ? ' 💌' : ''}`;
    li.setAttribute('aria-label', `${c.name}: ${state.aff[c.id]} of 6`);
    ul.append(li);
  }
}
let lastZone = '';

/* ----------------------------------------------------------- talking */
async function talk(n) {
  if (state.busy || state.ended) return;
  if (n.kind === 'door') { await goThrough(n); return; }
  if (n.kind === 'thing') {
    state.busy = true; state.moving = false; stage.right = null;
    await useThing(n.th);
    closeDialog();
    if (!state.ended) state.busy = false;
    return;
  }
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
  nadia: [['La la la— oh! You heard that, didn’t you.', 'blush'], ['The mall food court has the best acoustics. Don’t laugh.', 'smug']],
  thisa: [['Hungry? You look hungry. Come to the night market later.', 'happy'], ['Ten skewers, extra spicy, coming up!', 'happy']],
  renata: [['The surf report says big waves after school. Don’t miss it.', 'smug'], ['Sit on the sand with me. Watch the waves for a bit.', 'normal']],
  mira: [['Oh, what a coincidence! ♡ Hehe.', 'happy'], ['I’m not following you! I just walk the same way. Every day. ♡', 'smug']],
  ana: [['The clouds here are fluffier than in Japan. Is that weird to notice?', 'normal'], ['This café’s iced coffee is dangerous. That’s my third.', 'happy']],
  putri: [['Run lines with me later? I need a scene partner. Any scene partner.', 'smug'], ['The ballroom stage is HUGE. I’m going to be so good up there.', 'happy']],
  alya: [['Did you finish the reading? …Of course you didn’t.', 'annoyed'], ['This bookstore has the best study corner in town. Don’t tell anyone.', 'smug']],
  rania: [['Cheese bakso sold out again. Popular, huh?', 'happy'], ['Welcome to Kopi Senja! …Oh, it’s you. The usual?', 'happy']],
  kirana: [['Ten more laps, then I’m all yours. …For a chat! A chat.', 'blush'], ['The river path at sunset is the best run in town.', 'happy']],
  nayla: [['Too bright to see stars. Come back when it’s dark.', 'annoyed'], ['See that bright one? Jupiter. Say hi.', 'happy']],
  sekar: [['…Hi. I’m drawing the window light.', 'blush'], ['Hold still. You’re in my picture now.', 'smug']],
};

/* ---------------------------------------------- your SOUL, and the questions */
const SOULS = {
  determination: { name: 'DETERMINATION', col: '#ff2a3a', text: 'You never give up — not on the pact, and not on her.' },
  bravery: { name: 'BRAVERY', col: '#ff8a1a', text: 'You face scary things head-on: bullies, cars, confessions.' },
  justice: { name: 'JUSTICE', col: '#ffd21a', text: 'You stand up for what is right, even when it is hard.' },
  kindness: { name: 'KINDNESS', col: '#2fd05a', text: 'You make everyone around you feel safe and seen.' },
  patience: { name: 'PATIENCE', col: '#38d8f0', text: 'You wait for the right moment — and it always comes.' },
  integrity: { name: 'INTEGRITY', col: '#3a6aff', text: 'You are honest, even when a lie would be easier.' },
  perseverance: { name: 'PERSEVERANCE', col: '#b04aff', text: 'You keep going. Laps, homework, bakso: you finish everything.' },
};
function addSoul(trait, n = 1) { state.soul[trait] = (state.soul[trait] || 0) + n; }
function topSoul() {
  let best = 'determination', v = 0;
  for (const [k, n] of Object.entries(state.soul)) if (n > v) { best = k; v = n; }
  return best;
}
/** two a day, asked by a friend: [question, [answer, soul, reply] x3] */
const QUESTIONS = [
  ['You find 100k rupiah on the canteen floor. What do you do?', [['Hand it in to the teacher’s office.', 'integrity', 'A saint. An actual saint.'], ['Buy bakso for the whole squad!', 'kindness', 'Okay, now I’m hungry.'], ['Wait and see if someone comes back for it.', 'patience', 'Very patient. Very you.']]],
  ['A senior is picking on a grade-10 kid. You…', [['Step in. Right now.', 'bravery', 'Whoa. Remind me never to fight you.'], ['Go get a teacher.', 'justice', 'Smart. Rules are rules.'], ['Check the kid is okay afterwards.', 'kindness', 'That’s actually really sweet.']]],
  ['Big exam tomorrow and you understand NOTHING.', [['Study all night. I will not lose.', 'determination', 'Bring snacks. Lots of snacks.'], ['A little bit at a time, every hour.', 'perseverance', 'Slow and steady, huh?'], ['Tell the teacher honestly and ask for help.', 'integrity', 'Brave AND honest. Respect.']]],
  ['Your crush shows you her drawing. It’s… not great. You say…', [['The truth, but gently.', 'integrity', 'Risky. But she’ll trust you.'], ['I love it, because she made it.', 'kindness', 'Okay that was smooth.'], ['“Teach me to draw too?”', 'patience', 'Ooh, a date disguised as a lesson.']]],
  ['The squad dares you to sing on the rooftop. Alone.', [['Give me the mic. NOW.', 'bravery', 'LEGEND.'], ['Only if everyone sings too.', 'justice', 'Fair is fair, I guess.'], ['Practise first, then do it perfectly.', 'perseverance', 'Tomorrow, then. We’re watching.']]],
  ['You missed the bus. The next one is in an hour.', [['Run to school. All the way.', 'determination', 'You are insane. I love it.'], ['Wait and read a book.', 'patience', 'Peaceful. Suspiciously peaceful.'], ['Share an ojek with a classmate.', 'kindness', 'Carpool king.']]],
  ['Someone copies your homework and gets a better grade.', [['Tell the teacher what happened.', 'justice', 'Justice has been served.'], ['Let it go. Karma’s coming.', 'patience', 'Zen mode activated.'], ['Next time I’ll do even better.', 'determination', 'That’s the spirit!']]],
  ['Your best friend likes the same girl as you. What now?', [['Talk to him about it honestly.', 'integrity', 'Mature. Weirdly mature.'], ['Let her choose. No drama.', 'justice', 'Fair play.'], ['Step back. Friends first.', 'kindness', 'Bro… I’m tearing up.']]],
  ['Hamzah offers you his LAST cheese bakso.', [['Split it half and half.', 'justice', 'Perfectly balanced.'], ['No way, it’s yours.', 'kindness', 'Hamzah will remember this.'], ['Accept, and buy him two tomorrow.', 'integrity', 'A man of his word.']]],
  ['Losing a football match 3–0 at half-time. Your team talk?', [['We can STILL win this!', 'determination', 'Goosebumps.'], ['One goal at a time. Keep going.', 'perseverance', 'Coach material.'], ['Cheer everyone up first.', 'kindness', 'The team needed that.']]],
  ['A stray kitten follows you home in the rain.', [['Take it home and dry it off.', 'kindness', 'Name it after me. Please.'], ['Find its owner, whatever it takes.', 'perseverance', 'Detective mode.'], ['Ask my parents first.', 'integrity', 'Responsible. Boring. Correct.']]],
  ['The teacher blames the whole class for something YOU did.', [['Raise my hand and admit it.', 'integrity', 'That takes guts.'], ['Admit it, and say sorry to everyone.', 'justice', 'Respect, honestly.'], ['Take everyone’s punishment myself.', 'bravery', 'Hero of class 12-A!']]],
  ['You get lost in the haunted house at the night market.', [['Walk deeper in. Ghosts fear ME.', 'bravery', 'The ghosts are scared of you now.'], ['Stay calm and find the exit slowly.', 'patience', 'Calm under pressure.'], ['Keep going until I find my friends.', 'perseverance', 'You’d never leave anyone behind.']]],
  ['The class group chat is roasting someone who isn’t there. You…', [['Tell everyone to stop.', 'justice', 'Chat went silent. Respect.'], ['Message the person to check on them.', 'kindness', 'You’re a good one.'], ['Mute the chat and say nothing.', 'patience', 'Peace and quiet, huh.']]],
  ['You get a 40 on your maths test. Your mum asks how it went.', [['Show her the test. Honest.', 'integrity', 'Brave AND honest. Respect.'], ['“Next one will be 90. Watch me.”', 'determination', 'Big words! Now do it.'], ['Ask her to help me study.', 'patience', 'That’s actually smart.']]],
  ['A spider is on your crush’s desk. She screams.', [['Catch it and take it outside.', 'bravery', 'Hero. Spider hero.'], ['Calm her down first.', 'kindness', 'Smooth AND sweet.'], ['Let it walk away by itself.', 'patience', 'The spider thanks you.']]],
  ['The canteen auntie gives you too much change.', [['Give it back right away.', 'integrity', 'The auntie will love you forever.'], ['Give it back and say thanks for the bakso.', 'kindness', 'Extra meatballs next time, for sure.'], ['Tell her the price is wrong on the menu too.', 'justice', 'A man of the people.']]],
  ['Aboi tells the worst joke you have ever heard.', [['Laugh anyway. He tried.', 'kindness', 'Aboi is crying happy tears.'], ['Tell him honestly it was bad.', 'integrity', 'Ouch. But fair.'], ['Help him fix the punchline.', 'perseverance', 'A comedy duo is born.']]],
  ['Your phone dies right before an important call.', [['Run and borrow a charger.', 'determination', 'Fastest charger hunt in history.'], ['Wait, charge, then call back.', 'patience', 'Calm as a cucumber.'], ['Borrow a friend’s phone and explain.', 'integrity', 'Problem solved.']]],
  ['It’s pouring rain and your crush forgot her umbrella.', [['Give her mine. I’ll run.', 'kindness', 'You’re going to be SOAKED. Worth it.'], ['Share it and walk her home.', 'bravery', 'That’s basically a date.'], ['Wait with her until it stops.', 'patience', 'Rain dates are the best dates.']]],
  ['You’re picked for a team you didn’t want. You…', [['Give it my everything anyway.', 'perseverance', 'That’s the spirit!'], ['Make friends with the new team.', 'kindness', 'Instant team captain.'], ['Ask the teacher why, politely.', 'justice', 'Fair question.']]],
  ['Qai fell asleep in class. The teacher is coming!', [['Wake him up. Quick!', 'kindness', 'Qai owes you his life.'], ['Let him learn his lesson.', 'justice', 'Harsh. But fair.'], ['Cover for him with a fake question.', 'bravery', 'Legendary teamwork.']]],
  ['You promised to help a friend move house, but your crush invites you out.', [['Keep my promise to my friend.', 'integrity', 'Friends first. Respect.'], ['Help my friend, then meet her after.', 'perseverance', 'Busy day! You can do it.'], ['Bring her along to help too!', 'kindness', 'Teamwork makes the dream work.']]],
  ['Someone cuts in front of you in the bakso queue.', [['“Excuse me, the line starts back there.”', 'justice', 'Order has been restored.'], ['Let it go. It’s just bakso.', 'patience', 'A zen master of bakso.'], ['Ask if they’re in a hurry. Maybe they are.', 'kindness', 'Wow. So understanding.']]],
  ['A new transfer student is eating lunch alone.', [['Sit with them and say hi.', 'kindness', 'You just made their whole week.'], ['Invite them to sit with the squad.', 'bravery', 'The squad grows!'], ['Give them space, then say hi tomorrow.', 'patience', 'Gentle. Nice.']]],
  ['You’re running the 3 km race and your legs are dying.', [['Keep going. I will NOT stop.', 'determination', 'That’s the spirit!'], ['Slow down, but finish.', 'perseverance', 'Finishing is winning.'], ['Help the guy who fell behind me.', 'kindness', 'Real winner right there.']]],
  ['Your friend borrowed 50k a month ago and forgot.', [['Remind him, nicely.', 'integrity', 'Honest and chill.'], ['Let it go. He’s my friend.', 'kindness', 'Generous!'], ['Wait. He’ll remember.', 'patience', 'Patient… maybe too patient.']]],
  ['The stage lights fail in the middle of the school play.', [['Turn on my phone light and keep going.', 'bravery', 'The show must go on!'], ['Help fix the lights backstage.', 'perseverance', 'Behind-the-scenes hero.'], ['Calm the audience down.', 'kindness', 'Crisis handled.']]],
  ['You find out a teacher marked your friend’s test wrong.', [['Tell the teacher, with proof.', 'justice', 'Justice, served with proof.'], ['Tell my friend so they can ask.', 'integrity', 'Honest and helpful.'], ['Help them prepare what to say.', 'kindness', 'What a friend.']]],
  ['Your crush says she likes a song you think is terrible.', [['Listen to it ten times. Maybe I’ll like it.', 'perseverance', 'Dedication.'], ['Tell her I don’t like it, but I like her taste.', 'integrity', 'Honest and smooth.'], ['Ask her why she loves it.', 'patience', 'Ooh, deep conversation.']]],
  ['There’s one slice of martabak left and five people.', [['Cut it into five tiny pieces.', 'justice', 'Perfectly fair.'], ['Give it to whoever is hungriest.', 'kindness', 'Hamzah says thank you.'], ['Rock-paper-scissors. Winner takes all.', 'bravery', 'Risky! I like it.']]],
  ['Your bike gets a flat tyre on the way to school.', [['Push it all the way there.', 'determination', 'Unstoppable.'], ['Fix it myself on the spot.', 'perseverance', 'Bike mechanic unlocked.'], ['Call the squad for help.', 'patience', 'That’s what friends are for.']]],
  ['You see someone drop their wallet on the train.', [['Chase them and give it back.', 'bravery', 'Train hero!'], ['Hand it to the station guard.', 'integrity', 'The right call.'], ['Hold it and wait at the station.', 'patience', 'Patient AND good.']]],
  ['Your crush is sad but won’t say why.', [['Sit with her quietly.', 'patience', 'Sometimes that’s all she needs.'], ['Buy her favourite snack.', 'kindness', 'Snacks heal all.'], ['Gently ask again later.', 'perseverance', 'She’ll open up.']]],
  ['You accidentally break a classroom window with a football.', [['Tell the teacher straight away.', 'integrity', 'That takes guts.'], ['Offer to pay for it.', 'justice', 'Fair and square.'], ['Admit it and help clean up.', 'bravery', 'Owning it. Respect.']]],
  ['A cat steals your fried chicken at the night market.', [['Let it have it. It looks hungry.', 'kindness', 'The cat has adopted you now.'], ['Chase it! That was MY chicken!', 'determination', 'Did you win?'], ['Buy another one. Life goes on.', 'patience', 'Very wise.']]],
  ['You have to give a speech in front of the whole school.', [['Go up there and nail it.', 'bravery', 'Standing ovation!'], ['Practise it fifty times first.', 'perseverance', 'Preparation king.'], ['Speak from the heart, no script.', 'integrity', 'Real and honest.']]],
  ['Lindan’s weather forecast is wrong AGAIN. Everyone laughs.', [['Defend him. Weather is hard!', 'justice', 'Lindan felt that.'], ['Help him check the forecast next time.', 'kindness', 'Science buddies!'], ['Tell him to keep trying.', 'perseverance', 'He’ll get it right one day.']]],
  ['Your friend wants to quit the football team after one loss.', [['“One loss means nothing. Keep going!”', 'determination', 'Captain material.'], ['Listen to why first.', 'patience', 'Good listener.'], ['Train with him every morning.', 'perseverance', 'Morning runs, here we come.']]],
  ['You win a free trip, but only for one person.', [['Give it to my mum.', 'kindness', 'Best kid ever.'], ['Share the prize money with the squad.', 'justice', 'Everybody wins!'], ['Go, and bring back gifts for everyone.', 'integrity', 'Souvenirs for all!']]],
  ['Ghanim’s code crashes right before his demo.', [['Debug it with him all night.', 'perseverance', 'Coffee and code.'], ['Tell him it’s okay to show it anyway.', 'bravery', 'Live demos are scary!'], ['Cheer him up with bakso.', 'kindness', 'Bakso fixes bugs. Probably.']]],
  ['Last question! Why do you want a crush before college?', [['Because I never give up on a pact.', 'determination', 'A promise is a promise!'], ['Because I want to make someone happy.', 'kindness', 'Aww. Go get her.'], ['Because I want to be honest about my feelings.', 'integrity', 'Then tell her tonight.']]],
];
const Q_PER_DAY = 3, Q_TIMES = [8.5, 12, 16.6];
let qOrder = null;
/** a different mix of questions every game; the last question is always last */
function questionFor(n) {
  if (!qOrder) {
    qOrder = QUESTIONS.slice(0, -1).map((_, i) => i);
    for (let i = qOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [qOrder[i], qOrder[j]] = [qOrder[j], qOrder[i]]; }
  }
  const total = DAYS.length * Q_PER_DAY;
  return n === total - 1 ? QUESTIONS.length - 1 : qOrder[n % qOrder.length];
}
async function questionTime(n) {
  const [text, answers] = QUESTIONS[questionFor(n)];
  const asker = FRIENDS.filter((f) => f !== state.me)[n % (FRIENDS.length - 1)].name;
  await say(asker, `QUESTION TIME! ${text}`, 'happy', 'sparkle');
  const i = await choose(answers.map((a) => a[0]));
  await say(asker, answers[i][2], 'happy');
  addSoul(answers[i][1]);
  toast(`♥ ${SOULS[answers[i][1]].name} +1`);
  closeDialog();
}

/* ------------------------------------------------- the bully, Bagas */
/** from Thursday, the girl you like most goes missing after school */
async function missingAlert(c) {
  const me = state.me.name;
  state.missing = c.id;
  const a = other('Ghiffy', 'Aboi'), b = other('Lindan', 'Ghanim');
  await say(a, `${me}!! Have you seen ${c.name}? She was supposed to meet us after school, but she’s GONE.`, 'surprised', 'shock');
  await say(b, `I saw Bagas following her toward the BACK OF THE SCHOOL. That guy’s been bugging her all week…`, 'annoyed', 'sweat');
  await say(me, `…Behind the school? I’m going. NOW.`, 'annoyed', 'anger');
  await say('', `Find ${c.name}! The path to the back of the school is in the courtyard, next to the cherry tree.`);
  toast(`🚨 ${c.name} is missing! Go behind the school`);
  closeDialog();
  updateHud();
}
const BAGAS_LOOK = look({ hair: '#1a1416', hairHi: '#3a2c2c', style: 'messy', top: '#c8303a', topSh: '#a02028', tie: '#7a2a3a', skin: '#d9a07a' });
async function bullyEvent(c) {
  const me = state.me.name;
  state.bullyDone = true;
  await say('', `Behind the bike shed you find ${c.name}. Bagas is standing in front of her, blocking the way out.`);
  await say(c.name, `${me}!! You came!`, 'surprised', 'shock');
  await say('Bagas', `Oi. This is a private conversation, nerd. ${c.name}’s going to prom with ME. Right, ${c.name}?`, 'smug');
  await say(c.name, 'I already told you NO, Bagas. Let me go!', 'annoyed', 'anger');
  await say('Bagas', `She’s just shy. Now get lost, ${me}. Unless you want to fight about it.`, 'smug', 'anger');
  const i = await choose(['…Fine. Let’s settle this.', `${c.name} can decide for herself.`, '(Step between them.)']);
  addSoul(['bravery', 'justice', 'integrity'][i]);
  await say(me, i === 1 ? `She can decide for herself, Bagas. And I’m not going anywhere.` : 'Bring it.', 'annoyed', 'shock');
  closeDialog();
  const musicOn = soundBtn.getAttribute('aria-pressed') === 'true';
  fadeTrack(0, 600);
  const out = await battle({ me, crush: c.name, portrait: './art/bagas.webp', muted: !musicOn, onTrait: (t) => addSoul(t) });
  if (soundBtn.getAttribute('aria-pressed') === 'true') fadeTrack(0.65, 1800);
  state.last = c.id;
  if (out === 'spared') {
    await say(c.name, `You didn’t even need to be mean to him. That was… really cool, ${me}.`, 'blush', 'heart');
    toast(`♥ ${c.name} +2 · you spared Bagas`);
    closeDialog();
    await addAff(c, 2);
  } else if (out === 'won') {
    await say(c.name, `${me}! You actually stood up to him! My hero!`, 'happy', 'heart');
    toast(`♥ ${c.name} +2 · Bagas ran away`);
    closeDialog();
    await addAff(c, 2);
  } else {
    await say(c.name, '…It’s okay. Bagas is a jerk anyway. Thanks for trying.', 'sad');
    closeDialog();
  }
}

async function talkCrush(c) {
  if (isFinal()) {
    if (c.id === topCrush()?.id) { await confession(c); return false; }
    await say(c.name, '…Shouldn’t you be somewhere right now?');
    return false;
  }
  if (state.gift) {
    if (!state.met.has(c.id)) { await introCard(c); state.met.add(c.id); }
    const g = state.gift;
    state.gift = null;
    await say('', `You hand ${c.name} ${g}.`);
    await say(c.name, c.id === 'mira' ? 'A present?! I’ll keep it forever. FOREVER. ♡' : `For me? …${state.me.name}, you remembered I like this?`, 'blush', 'heart');
    state.last = c.id;
    toast(`🎁 ${c.name} ♥ +1`);
    addSoul('kindness');
    closeDialog();
    await addAff(c, 1);
    return true;
  }
  if (state.scene[c.id] >= 3 && state.seenDay[c.id] !== state.day) {
    // after her three moments you can still hang out once a day
    const [line, ex] = CHAT[c.id][afterSchool() ? 1 : 0];
    await say(c.name, line, ex);
    await say('', `You spend a while together with ${c.name}. Time flies.`);
    state.seenDay[c.id] = state.day;
    state.last = c.id;
    toast(`Hanging out · ${c.name} ♥ +1`);
    addSoul('patience');
    closeDialog();
    await addAff(c, 1);
    return true;
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
  if (gain === 2) { toast(`${c.name} ♥ +2`); song.pickup(); fx.burst(sx(c.x), sy(120), reduced ? 6 : 14); }
  else if (gain === 1) toast(`${c.name} ♥ +1`);
  else toast(`${c.name} …`);
  closeDialog();
  await addAff(c, gain);
  await wait(800);
  return true;
}

/**
 * Each scene is a little moment with one choice; it returns 2, 1 or 0
 * affection. say(who, line, expression, effect)
 */
const SCENES = {
  nadia: [
    async (c, me) => {
      await say('', 'Someone is singing in the empty music room. The voice stops the second you open the door.');
      await say(c.name, `${me}?! How long were you standing there?`, 'surprised', 'shock');
      const i = await choose(['Long enough. Please keep singing.', 'I didn’t hear anything!', 'Was that the radio?']);
      if (i === 0) { await say(c.name, '…Okay. But don’t look at me. Look at the window.', 'blush', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'You’re a terrible liar. …Thanks for trying, though.', 'smug'); return 1; }
      await say(c.name, 'The RADIO?!', 'annoyed', 'anger');
      return 0;
    },
    async (c) => {
      await say(c.name, 'There’s an open-mic night at the mall on Saturday. I signed up. I might throw up.', 'sad', 'sweat');
      const i = await choose(['I’ll be in the front row with a glowstick.', 'You’ll be great.', 'Maybe just don’t go?']);
      if (i === 0) { await say(c.name, 'A glowstick?! …Bring two. One for each hand.', 'happy', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'You have to say that. …But I’ll take it.', 'blush'); return 1; }
      await say(c.name, '…Wow. Thanks for the support.', 'annoyed');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'I wrote a new song. It’s about someone who listens to me sing when no one else does.', 'blush');
      await say(c.name, `…Do you want to know who it’s about, ${me}?`, 'blush', 'sparkle');
      const i = await choose(['…I think I already know.', 'Is it about me?', 'Is it about your cat?']);
      if (i === 0) { await say(c.name, '…Then I don’t have to sing the last verse. You already know how it ends.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'You’ll have to come to the show to find out.', 'smug'); return 1; }
      await say(c.name, 'I don’t HAVE a cat!', 'annoyed', 'anger');
      return 0;
    },
  ],
  thisa: [
    async (c, me) => {
      await say(c.name, `Satay, ten skewers, extra peanut sauce. That’s your order, right ${me}? I never forget a face. Or an order.`, 'smug');
      const i = await choose(['Make it extra spicy.', 'Whatever you recommend.', 'Do you have salad?']);
      if (i === 0) { await say(c.name, 'Ooh, a brave one! The last guy who ordered that cried. I liked him less than you.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Chef’s choice. You’ve got good instincts.', 'happy'); return 1; }
      await say(c.name, '…This is a SATAY stall.', 'annoyed', 'anger');
      return 0;
    },
    async (c) => {
      await say('', 'It starts to rain. Thisa is struggling to cover the grill on her own.');
      const i = await choose(['Grab the other side of the tarp.', 'Hold your umbrella over her.', 'Run for cover.']);
      if (i === 0) { await say(c.name, '…We’re both soaked now. Ha! But the satay survived. My hero.', 'happy', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'Now YOU’RE getting wet, silly.', 'blush'); return 1; }
      await say(c.name, '…Thanks for nothing!', 'annoyed', 'anger');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'Mom says I can run the stall alone after graduation. But… sometimes I want to go to college too.', 'sad');
      const i = await choose(['Why not both? I’ll help on weekends.', 'You can do anything you want.', 'Satay is your destiny.']);
      if (i === 0) { await say(c.name, `…You’d flip satay with me every weekend, ${me}? …That sounds kind of perfect.`, 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'You really think so? …Thanks.', 'blush'); return 1; }
      await say(c.name, 'Wow. Inspiring.', 'annoyed');
      return 0;
    },
  ],
  renata: [
    async (c, me) => {
      await say('', 'Renata walks out of the waves with her surfboard, totally unbothered.');
      await say(c.name, `${me}. You can’t surf, can you? I can tell by the way you’re standing.`, 'smug');
      const i = await choose(['Teach me?', 'I could learn in a day.', 'Surfing is just standing on a plank.']);
      if (i === 0) { await say(c.name, 'Honest. I like that. Lesson one: fall a lot.', 'happy', 'sparkle'); return 2; }
      if (i === 1) { await say(c.name, 'Ha! You’ll be eating sand in a minute. …I’ll watch.', 'smug'); return 1; }
      await say(c.name, 'Get in the water and say that.', 'annoyed', 'anger');
      return 0;
    },
    async (c) => {
      await say('', 'You fall off the board. A lot. Renata laughs until she can’t breathe.');
      const i = await choose(['Laugh with her and try again.', 'Pretend it was on purpose.', 'Quit and sulk on the sand.']);
      if (i === 0) { await say(c.name, 'You actually stood up for two seconds! …I’m weirdly proud of you.', 'happy', 'heart'); return 2; }
      if (i === 1) { await say(c.name, 'Sure. Very… artistic.', 'smug'); return 1; }
      await say(c.name, 'The ocean doesn’t care if you sulk.', 'annoyed');
      return 0;
    },
    async (c, me) => {
      await say(c.name, 'Sunset sessions are my favourite. Everyone else has gone home. It’s just the waves.', 'normal');
      await say(c.name, `…And you, I guess, ${me}.`, 'blush', 'sparkle');
      const i = await choose(['Then I’ll come every sunset.', 'Should I leave you alone?', 'The waves are pretty boring, honestly.']);
      if (i === 0) { await say(c.name, '…Okay. Every sunset. Don’t be late.', 'blush', 'heart'); return 2; }
      if (i === 1) { await say(c.name, '…No. Stay.', 'blush'); return 1; }
      await say(c.name, '…Get off my beach.', 'annoyed', 'anger');
      return 0;
    },
  ],
  // Mira likes every answer. That's the problem.
  mira: [
    async (c, me) => {
      await say('', 'A girl with lavender twin tails is standing right behind you. You didn’t hear her walk up.');
      await say(c.name, `Hi, ${me}! I’m Mira, I just transferred here. …How do I know your name? Lucky guess! ♡`, 'happy', 'sparkle');
      await say(c.name, 'Your favourite drink is iced Milo, right? And your birthday is— oh, hehe, sorry, I’m talking too much.', 'happy');
      await choose(['…How do you know that?', 'Nice to meet you, Mira!', '(Slowly step back.)']);
      await say(c.name, 'You’re so funny! I can tell we’re going to be together a LOT. ♡', 'happy', 'heart');
      return 2;
    },
    async (c, me) => {
      await say(c.name, `I made you a bento! Look, I drew your face with seaweed. I made one yesterday too, ${me}. And the day before. You just didn’t see me.`, 'happy', 'heart');
      await choose(['…Thank you?', 'You didn’t have to do that.', 'How long have you been following me?']);
      await say(c.name, 'Following? Silly. I just happen to be wherever you are. Isn’t that romantic? ♡', 'smug', 'sparkle');
      return 2;
    },
    async (c, me) => {
      await say(c.name, `I saw you talking to other girls today, ${me}. That’s okay! I wrote their names down. In my notebook.`, 'happy');
      await say(c.name, 'Just so I remember them. Forever. ♡', 'smug', 'sparkle');
      await choose(['That’s… a little scary, Mira.', 'Can I see the notebook?', 'I need to go. Now.']);
      await say(c.name, 'Scary? I’m just organised! Anyway — see you at prom. I already know where you’ll be standing. ♡', 'happy', 'heart');
      return 2;
    },
  ],
  ana: [
    async (c, me) => {
      await say('', 'By the classroom window sits Ana, the transfer student from Japan, watching the clouds.');
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
      await say('', 'Ana slides a folded note across the desk. It’s written in Japanese.');
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
    drawCharacter(c, w, h, who.look, artFor(who.name), { expr: who.look.girl ? 'happy' : 'smug', t: (performance.now() - t0) / 1000, seed: 2, fx: 'sparkle' });
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
  // the trailer reel: the illustrated scenes, each with a slow camera move
  const reel = op.querySelector('.op-reel');
  const shot = (name) => {
    const im = document.createElement('img');
    im.src = `./art/ending/${name}.webp`;
    im.alt = '';
    reel.append(im);
    requestAnimationFrame(() => im.classList.add('on'));
    const old = [...reel.children].slice(0, -2);
    old.forEach((o) => o.remove());
  };
  // the Dreamina trailer clip opens the reel
  const clip = document.createElement('video');
  Object.assign(clip, { src: './art/trailer.mp4', muted: true, playsInline: true, autoplay: true, preload: 'auto' });
  clip.className = 'on';
  reel.append(clip);
  clip.play().catch(() => {});
  const beats = [['Seven days before college.', null], ['Thirteen friends.', null], ['One pact.', 'nayla'], ['', 'kirana']];
  for (const [b, img] of beats) {
    if (skip) break;
    if (img) shot(img);
    if (!b) { await wait(reduced ? 500 : 900); continue; }
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
  op.querySelector('.op-reel').innerHTML = '';
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
  const lost = state.missing && CRUSHES[state.missing];
  state.missing = null;
  if (lost) state.bullyDone = true;
  state.day++;
  state.room = null;
  state.clock = DAY_START;
  state.x = 400;
  state.face = 1;
  camX = clamp(state.x - viewW() * 0.42, 0, WORLD - viewW());
  placeFriends();
  updateHud();
  fade.classList.remove('on');
  await eyecatch();
  if (lost) {
    await say(lost.name, `…I waited for you yesterday, behind the school. A teacher finally made Bagas leave.`, 'sad');
    state.aff[lost.id] = Math.max(0, state.aff[lost.id] - 1);
    toast(`${lost.name} ♥ −1`);
    closeDialog();
    updateHud();
  }
  state.busy = false;
}

/** called every frame: moves the clock and handles what happens at certain hours */
let lastHour = DAY_START;
async function tickClock(dt) {
  if (!state.started || state.ended || state.busy || !state.me) return;
  const before = state.clock;
  state.clock += dt / SECONDS_PER_HOUR;
  // the bully takes your crush behind the school (once, Thursday to Saturday)
  if (!state.bullyDone && !state.missing && state.day >= 3 && state.day < LAST_DAY && state.clock >= 15.6 && !road && state.room !== 'back') {
    const c = topCrush();
    if (c && !c.secret && state.aff[c.id] >= 1) {
      state.busy = true;
      await missingAlert(c);
      if (!state.ended) state.busy = false;
      return;
    }
  }
  // question time: morning, lunch and after school
  const slot = Q_TIMES.filter((h) => state.clock >= h).length - 1;
  const qn = state.day * Q_PER_DAY + slot;
  if (slot >= 0 && !state.asked.has(qn) && !road && !isFinal() && !state.missing) {
    state.asked.add(qn);
    state.busy = true;
    await questionTime(qn);
    if (!state.ended) state.busy = false;
    return;
  }
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
  if (c.id === 'mira') return crazyEnd(c);
  const me = state.me.name;
  await say('', `Music drifts out from the ballroom. On the balcony, under the fairy lights, ${c.name} turns around.`);
  await say(c.name, `${me}. Your friends said you wanted to tell me something. …Then they ran away.`, 'blush', 'sweat');
  const mine = state.me.end;
  const i = await choose([mine.option, 'I like you. I have for a while.', '(Say nothing. Just hold out your hand.)']);
  if (state.aff[c.id] < WIN) {
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

function showSoul() {
  const k = topSoul(), S = SOULS[k];
  const el = $('res-soul');
  const chips = Object.entries(state.soul).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span style="--c:${SOULS[t].col}">${SOULS[t].name} ${n}</span>`).join('');
  el.innerHTML = `<svg viewBox="0 0 24 24" width="54" height="54" aria-hidden="true"><path d="M12 21S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 13-10 13Z" fill="${S.col}"/></svg>
    <div><p class="soul-k">YOUR SOUL</p><h3 style="color:${S.col}">${S.name}</h3><p>${S.text}</p>${chips ? `<p class="soul-chips">${chips}</p>` : ''}</div>`;
  el.hidden = false;
}
function results(winner) {
  showSoul();
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
  const had = c ? Math.min(MAX_AFF, state.aff[c.id]) : 0;
  $('res-tip').textContent = `How to win: a girl says yes with ♥♥ (4 points). ${c ? `${c.name} was at ${had} of 4.` : 'You didn’t get close to anyone.'} Pick the answers that make her light up (+2), talk to her every day (one new moment a day, then you can hang out for +1), buy her a gift in the shops (+1), and save her on the road for +3.`;
  $('res-tip').hidden = false;
  results(null);
  document.body.classList.add('show-results');
  $('results').hidden = false;
  fade.classList.remove('on');
}

/** the endings Dreamina has animated so far (the others use the still picture) */
const ENDING_CLIPS = new Set(['ana', 'putri', 'alya', 'rania', 'kirana', 'nayla', 'sekar', 'nadia', 'thisa', 'renata']);
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
      cg: `./art/ending/${c.id}.webp`,
      clip: ENDING_CLIPS.has(c.id) ? `./art/ending/${c.id}.${document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001F"') ? 'mp4' : 'webm'}` : null,
      cgNight: c.id === 'nayla',
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
  if ((k === 'arrowup' || k === 'w') && !state.busy) { const d = findNear(); if (d?.kind === 'door') { e.preventDefault(); talk(d); } }
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
    const r = state.room && ROOMS[state.room];
    state.x = r ? clamp(state.x + dir * 190 * run * dt, r.x0 + 60, r.x0 + r.w - 60) : clamp(state.x + dir * 190 * run * dt, 60, WORLD - 60);
    state.phase += dt * 11;
  }
  const vw = viewW();
  camX += (camTarget() - camX) * Math.min(1, dt * 5);

  near = state.busy || !state.started ? null : findNear();
  document.body.classList.toggle('talking', state.busy && !(road && !road.done));
  if (talkBtn.disabled === !!(near || state.busy)) talkBtn.disabled = !(near || state.busy);
  const z = zoneAt(state.x);
  if (z !== lastZone && state.started) { lastZone = z; $('zone').textContent = z; }

  if (showcase) camX = clamp(showcase.x - viewW() / 2, 0, WORLD - viewW());
  tickClock(dt);
  const q = showcase ? showcase.q : lateness();
  const n = showcase ? 0 : nightness();
  if (Math.floor(t) !== Math.floor(t - dt)) $('quest').textContent = state.me ? `Day ${state.day + 1} · ${DAYS[state.day]} · ${clockText(state.clock)}` : '';
  ctx.clearRect(0, 0, W, H);
  if (state.room) drawRoom(ROOMS[state.room], q, n, t);
  else {
    drawOutside(q, t);
    drawInterior(q);
    drawCourtyardAndRoof(q, t);
    drawTown(q, n, t);
    drawFarTown(q, n, t);
    nightFall(n, t);
    updateCars(dt);
    // doors you can walk through, with a heart when someone inside has time for you
    if (state.started && state.missing && near?.id !== 'in-back') heartMark(ROOMS.back.door, t);
    if (camX + viewW() > TOWN) {
      door(ROOMS.cafe.door, n > 0 ? 'rgba(255,214,140,0.95)' : '#ffe9c4');
      door(ROOMS.games.door, '#ff9fc2');
      door(ROOMS.books.door, n > 0 ? 'rgba(255,214,140,0.95)' : '#dfeaf7');
      if (state.started && afterSchool() && !isFinal()) {
        for (const [k, r] of Object.entries(ROOMS)) {
          if (Object.entries(INSIDE_SPOT).some(([id, [rk]]) => rk === k && sceneReady(CRUSHES[id])) && near?.id !== `in-${k}`) heartMark(r.door, t);
        }
      }
    }
  }
  updateMira(dt);
  maybeStartRoadEvent(dt);

  for (const p of friendsHere) {
    const face = Math.abs(state.x - p.x) < 200 ? (state.x < p.x ? -1 : 1) : p.face;
    walker(p.f.name, { x: sx(p.x), y: sy(0), k: S, face, look: p.f.look, t, phase: 0, moving: false, talking: speaking === p.f.name, seed: p.x });
  }
  for (const c of Object.values(CRUSHES)) {
    const x = crushX(c);
    const face = Math.abs(state.x - x) < 220 ? (state.x < x ? -1 : 1) : -1;
    walker(c.name, { x: sx(x), y: sy(0), k: S, face, look: c.look, t, phase: 0, moving: false, talking: speaking === c.name, seed: x, blush: state.aff[c.id] >= 4 && Math.abs(state.x - x) < 140 });
  }
  if (state.room === 'back' && state.missing) walker('Bagas', { x: sx(ROOMS.back.x0 + 960), y: sy(0), k: S, face: -1, look: BAGAS_LOOK, t, phase: 0, moving: false, seed: 7 });
  drawRoadEvent(dt, t);
  if (state.me) walker(state.me.name, { x: sx(state.x), y: sy(0), k: S, face: state.face, look: state.me.look, t, phase: state.phase, moving: state.moving, talking: speaking === state.me.name, seed: 3, running: keys.has('shift') || hold.run });

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
    if (near && !state.busy) bubble(near.x, near.kind === 'door' ? `${touch ? '' : '↑ / E · '}${near.who.name}` : `${touch ? 'Talk' : 'E'} · ${near.who.name}`, t, near.kind === 'crush' ? '#e8417a' : near.kind === 'door' ? '#3a8a5a' : near.kind === 'thing' ? '#c8780a' : '#3a5aa8');
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
    const paint = () => { const c2 = cv.getContext('2d'); c2.clearRect(0, 0, px, px); drawCharacter(c2, px, px, f.look, artFor(f.name), { expr: 'normal', t: 1, seed: 1, fill: 1.05 }); };
    paint();
    artFor(f.name).addEventListener('load', paint);
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
  await say('', 'Each day lasts nine minutes, from 07:00 to 21:00. Talk to anyone, anytime: a ♥ over a girl means she has time for you today. After 15:00 everyone heads into town — and some girls are INSIDE the shops: walk up to a door and press ↑ or E to go in.');
  await say('', 'HOW TO WIN: get ♥♥ (4 points) with one girl — her best answers give +2. On Sunday at 18:00 she waits on the hotel balcony. Confess there. Fewer than ♥♥ = bakso for everyone.');
  closeDialog();
  placeFriends();
  state.busy = false;
}

function startMusic() {
  $('sound').hidden = false;
  song.start();
  track.play().then(() => fadeTrack(0.65)).catch(() => {
    song.music = true; // no recording: play the built-in song
    song.ctx && song.ctx.close();
    song.ctx = null;
    song.start();
  });
}
$('start').addEventListener('click', (e) => {
  e.currentTarget.blur();
  $('intro').classList.add('gone');
  startMusic();
  opening().then(() => { $('select').hidden = false; showcase = null; });
});

/* --------------------------------------------- test scenes (title screen) */
function buildTest() {
  const me = $('t-me'), cr = $('t-crush');
  for (const f of FRIENDS) me.add(new Option(f.name, f.name));
  for (const c of Object.values(CRUSHES)) cr.add(new Option(c.secret ? `${c.name} (secret)` : c.name, c.id));
  $('test-open').addEventListener('click', () => { $('test').hidden = false; });
  $('test-close').addEventListener('click', () => { $('test').hidden = true; });
  for (const b of $('test').querySelectorAll('[data-t]')) b.addEventListener('click', () => testRun(b.dataset.t));
}
async function testRun(mode) {
  const f = FRIENDS.find((x) => x.name === $('t-me').value);
  const c = CRUSHES[$('t-crush').value];
  $('test').hidden = true;
  $('intro').classList.add('gone');
  startMusic();
  showcase = null;
  state.me = f;
  state.started = true;
  state.busy = true;
  $('hud').hidden = false;
  $('skip').hidden = false;
  if (touch) $('pad').hidden = false;
  state.met.add(c.id);
  state.last = c.id;
  const at = (day, clock, x, room = null) => {
    state.day = day; state.clock = clock; lastHour = Math.floor(clock); state.room = room;
    state.x = room ? x : clamp(x, 60, WORLD - 60); state.face = 1;
    camX = camTarget();
    placeFriends();
    updateHud();
  };
  const girl = c.secret ? CRUSHES.ana : c; // Mira never needs saving
  if (mode === 'roam') { at(0, DAY_START, 400); toast('Test · free roam, Monday morning'); }
  else if (mode === 'town') {
    if (INSIDE_SPOT[c.id]) at(1, SCHOOL_OUT + 0.1, insideX(c.id) - 260, INSIDE_SPOT[c.id][0]);
    else at(c.secret ? 2 : 1, SCHOOL_OUT + 0.1, (TOWN_SPOT[c.id] || 4700) - 160);
    toast(INSIDE_SPOT[c.id] ? `Test · inside ${ROOMS[INSIDE_SPOT[c.id][0]].label}` : 'Test · after school in town');
  }
  else if (mode === 'bully') {
    const girl = c.secret ? CRUSHES.ana : c;
    state.met.add(girl.id); state.aff[girl.id] = 2; state.last = girl.id;
    at(3, SCHOOL_OUT + 0.7, ROOMS.back.door - 420);
    state.asked = new Set([...Array(DAYS.length * Q_PER_DAY).keys()]); // no questions during the test
    roadDay = state.day;
    await missingAlert(girl);
  }
  else if (mode === 'quiz') {
    at(0, 8.4, 400);
    for (let n = 0; n < 4; n++) { await questionTime(n); await wait(400); }
    state.asked = new Set([0, 1, 2, 3]);
    toast(`Your SOUL so far: ${SOULS[topSoul()].name}`);
  }
  else if (mode === 'inside') { at(1, SCHOOL_OUT + 0.5, ROOMS.cafe.door - 300); roadDay = state.day; toast('Test · walk right to the café door, press ↑ or E'); }
  else if (mode === 'scene') {
    at(c.secret ? 2 : 1, 9, (c.secret ? 400 : c.x) - 140);
    await introCard(c);
    for (let n = 0; n < 3; n++) {
      const gain = await SCENES[c.id][n](c, f.name);
      toast(`${c.name} ${gain ? `♥ +${gain}` : '…'}`);
      closeDialog();
      await addAff(c, gain);
      await wait(1100);
    }
    state.scene[c.id] = 3;
    state.seenDay[c.id] = state.day;
  } else if (mode === 'road') {
    state.met.add(girl.id);
    at(1, 16, 8700);
    await wait(700);
    startRoadEvent(girl);
    return;
  } else if (mode === 'prom') {
    state.aff[c.id] = MAX_AFF;
    at(LAST_DAY, PROM + 0.02, HOTEL_BALCONY - 120);
    await finalAfternoon();
  } else if (mode === 'happy') {
    state.aff[c.id] = MAX_AFF;
    at(LAST_DAY, PROM + 0.5, HOTEL_BALCONY);
    if (c.secret) await crazyEnd(c); else happyEnd(c);
    return;
  } else if (mode === 'bakso') {
    at(LAST_DAY, DAY_END - 0.01, HOTEL_BALCONY);
    await baksoEnd(c.secret ? null : c);
    return;
  } else if (mode === 'yandere') {
    state.met.add('mira');
    at(LAST_DAY, PROM + 0.5, HOTEL_BALCONY);
    await crazyEnd(CRUSHES.mira);
    return;
  }
  closeDialog();
  updateHud();
  state.busy = false;
}

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
for (const n of [...FRIENDS.map((f) => f.name), ...Object.values(CRUSHES).map((c) => c.name)]) { artFor(n); spriteFor(n); frameFor(n, 'walk'); frameFor(n, 'run'); }
buildRoster();
buildTest();
requestAnimationFrame(frame);
