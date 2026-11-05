// 住人たちの くらし（自動で生活・会話・なかよし度）とペット
import { drawIcon } from './icons.js';
import * as THREE from 'three';
import { B, USE } from './blocks.js';
import { Character, PERSONALITIES } from './chars.js';
import { makeChar } from './animal.js';

export const FOODS = [['🍙', 'おにぎり'], ['🍞', 'パン'], ['🍎', 'りんご'], ['🍓', 'いちご'], ['🍌', 'バナナ'], ['🍰', 'ケーキ'], ['🍩', 'ドーナツ'], ['🍕', 'ピザ'], ['🍔', 'ハンバーガー'], ['🍛', 'カレー'],
  ['🍜', 'ラーメン'], ['🍣', 'おすし'], ['🍦', 'アイス'], ['🍪', 'クッキー'], ['🍮', 'プリン'], ['🥞', 'ホットケーキ'], ['🍉', 'スイカ'], ['🍇', 'ぶどう'], ['🍳', 'たまごやき'], ['🍫', 'チョコ']];
export const REL_LABEL = (v) => (v >= 95 ? ['しんゆう', '💞'] : v >= 75 ? ['なかよし', '💗'] : v >= 45 ? ['ともだち', '😊'] : v >= 20 ? ['しりあい', '🙂'] : ['はじめまして', '❔']);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const VA = 'あかさたなはまやらわがざだばぱぁゃアカサタナハマヤラワガザダバパァャ', VI = 'いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィえけせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェ', VO = 'うくすつぬふむゆるぐずづぶぷぅゅおこそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョウクスツヌフムユルグズヅブプゥュ';
const VOW = (c) => (!c ? null : VA.includes(c) ? 'talkA' : VI.includes(c) ? 'talkI' : VO.includes(c) ? 'talkO' : null);
let uidSeq = Date.now() % 100000;

// ---------- 経路さがし（地面の上を歩く）
function blocked(w, x, y, z) { return w.solidAt(x + 0.5, y + 0.2, z + 0.5) || w.solidAt(x + 0.5, y + 0.8, z + 0.5); }
export function standable(w, x, y, z) {
  if (!w.inb(x, y, z)) return false;
  const id = w.get(x, y, z); if (id && B[id].shape === 'water') return false;
  if (blocked(w, x, y, z) || w.solidAt(x + 0.5, y + 1.25, z + 0.5)) return false;
  return w.solidAt(x + 0.5, y - 0.1, z + 0.5);
}
export function findPath(w, s, t, max = 2500) {
  const key = (x, y, z) => (y * w.D + z) * w.W + x;
  const open = [[s[0], s[1], s[2], 0, 0]], came = new Map(), g = new Map([[key(...s), 0]]);
  const h = (x, y, z) => Math.abs(x - t[0]) + Math.abs(z - t[2]) + Math.abs(y - t[1]);
  let best = null, bestH = 1e9, n = 0;
  while (open.length && n++ < max) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][4] < open[bi][4]) bi = i;
    const [x, y, z, gc] = open[bi]; open.splice(bi, 1);
    const hh = h(x, y, z); if (hh < bestH) { bestH = hh; best = [x, y, z]; }
    if (hh <= 1 && Math.abs(y - t[1]) <= 1) { best = [x, y, z]; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1, -2]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!standable(w, nx, ny, nz)) continue;
      if (dy > 0 && blocked(w, x, y + 2, z)) continue;
      if (dy < 0 && blocked(w, nx, y, nz)) continue;
      const k = key(nx, ny, nz), ng = gc + 1 + (dy ? 0.5 : 0);
      if (g.has(k) && g.get(k) <= ng) continue;
      g.set(k, ng); came.set(k, key(x, y, z)); open.push([nx, ny, nz, ng, ng + h(nx, ny, nz) * 1.2]);
      break;
    }
  }
  if (!best) return null;
  const path = []; let k = key(...best); const sk = key(...s);
  while (k !== undefined && k !== sk) { const x = k % w.W, z = Math.floor(k / w.W) % w.D, y = Math.floor(k / (w.W * w.D)); path.unshift([x, y, z]); k = came.get(k); }
  return path;
}

// ---------- 会話
const TALK = {
  hello: ['{B}、こんにちは！', '{B}だ！ やっほー', 'あ、{B}！', '{B}、げんき？'],
  pair: [
    ['きょう なに してた？', ['おはなを みてたよ', 'さんぽ してた！', 'ずっと ねてた…', 'おうちを そうじしたよ']],
    ['すきな たべものは？', ['{F}が だいすき！']],
    ['いっしょに あそぼう！', ['いいよ！', 'うん、あそぼ！', 'あとでね〜']],
    ['その ふく にあってるね', ['えへへ、ありがと', 'ほんと？ うれしい！']],
    ['あした なに する？', ['うみに いきたい！', 'おうちを つくりたいな', 'ダンスの れんしゅう！']],
    ['みて みて、くもが {C}みたい', ['ほんとだ！', 'えー、みえない〜']],
    ['ねえ、ないしょの はなし…', ['なになに？', 'ひみつ だよね！']],
    ['おなか すいたね', ['{F} たべたい！', 'ぺこぺこ〜']],
    ['{P}ちゃん かわいいね', ['でしょ〜！']],
    ['この しま、いいところだね', ['ずっと ここに いたいな', 'うん、だいすき！']],
  ],
  clouds: ['ひつじ', 'ソフトクリーム', 'くじら', 'ねこ', 'おしろ'],
  player: ['あそびに きてくれたの？', 'きょうも いい てんき！', 'なにか つくってるの？', 'いつも ありがとう！', 'ねえねえ、きいて きいて', 'いっしょに おさんぽ しよう！'],
  needHungry: ['おなか すいたなぁ…', 'なにか たべたいな'], needHouse: ['じぶんの おうちが ほしいな…', 'ベッドの ある おうちに すみたいな'],
  needQuiz: ['もんだい だすよ！ わかるかな？', 'ねえ、クイズ しよう！'], needFriend: ['{B}と なかよく なりたいな…'], needGift: ['なにか プレゼント ほしいな〜'],
  thanks: ['ありがとう！ うれしい！', 'わーい！', 'やったー！', 'だいすき！'],
  fav: ['これ だいすきなの！！', 'えっ、{F}！ さいこう！'],
  sleep: ['むにゃ…', 'Zzz…'], morning: ['おはよう！', 'ふわぁ、いい あさ！'],
  newFriend: ['{B}と ともだちに なったよ！', '{B}と なかよし！'],
};
const fill = (s, o) => s.replace(/\{B\}/g, o.B || '').replace(/\{F\}/g, o.F || '').replace(/\{C\}/g, rnd(TALK.clouds)).replace(/\{P\}/g, o.P || 'ペット');

const USE_FX = {
  cook: { say: '🍳 りょうり ちゅう…', done: '🍛 できた！ いただきます', mode: 'cook', t: 6, hunger: 30, exp: 6, log: 'りょうりを した 🍳' },
  snack: { say: '🧃 おやつ たべよ', done: 'おいしかった！', mode: 'eat', t: 3, hunger: 20 },
  dine: { say: '🍽️ いただきます！', done: 'ごちそうさま！', mode: 'eat', t: 6, hunger: 35, share: true },
  tv: { say: '📺 わはは！ おもしろい', mode: 'walk', t: 8, exp: 3 },
  bath: { say: '🛁 いい おゆ〜♪', done: 'さっぱり！', mode: 'cheer', t: 5, log: 'おふろに はいった 🛁' },
  piano: { say: '🎹 ♪ ド レ ミ〜', mode: 'eat', t: 7, exp: 5, log: 'ピアノを ひいた 🎹' },
  read: { say: '📖 ふむふむ…', mode: 'walk', t: 7, exp: 4, log: 'ほんを よんだ 📖' },
  play: { say: '🧸 あそぼ〜', mode: 'dance', t: 6, exp: 4 }, game: { say: '🎮 やったー！ クリア！', mode: 'eat', t: 7, exp: 3 },
  swing: { say: '🎵 びゅーん！', mode: 'cheer', t: 6, exp: 4, log: 'ブランコで あそんだ' }, study: { say: '✏️ べんきょう ちゅう', done: 'わかった！ 💡', mode: 'eat', t: 7, exp: 8, log: 'べんきょうを した ✏️' },
  paint: { say: '🎨 おえかき〜', mode: 'eat', t: 7, exp: 5, log: 'えを かいた 🎨' }, makeup: { say: '💄 おしゃれ しよ', mode: 'wave', t: 4 },
  warm: { say: '🔥 あったかい〜', mode: 'walk', t: 6 }, garden: { say: '🌷 おみずを あげよう', mode: 'eat', t: 6, exp: 4, log: 'かだんの おせわを した 🌷' },
  stage: { say: '🎤 ラララ〜♪', mode: 'dance', t: 7, exp: 5 }, ball: { say: '⚽ えいっ！', mode: 'cheer', t: 5, exp: 3 },
  fish: { say: '🎣 つりに いこう', mode: 'walk', t: 2 }, kotatsu: { say: '🍊 ぬくぬく〜', mode: 'sit', t: 9, exp: 2 }, nap: { say: 'ゆらゆら〜 💤', mode: 'sleep', t: 9 }, mail: { say: '📮 おてがみ きてるかな？', mode: 'walk', t: 3 }, walkbaby: { say: '🍼 おさんぽ しようね', mode: 'walk', t: 4 }, cool: { say: '❄️ すずしい〜', mode: 'walk', t: 5 }, museum: { say: '🦴 すごい！ むかしの いきものだ！', mode: 'walk', t: 5, exp: 4, log: 'はくぶつかんを みた 🏛️' }, look: { say: '👀 きれい〜', mode: 'walk', t: 4 }, music: { say: '🎵 ノリノリ♪', mode: 'dance', t: 6 }, pray: { say: '🙏 いいこと ありますように', mode: 'walk', t: 4 },
};
export const TAL = ['うた', 'え', 'りょうり', 'スポーツ', 'べんきょう', 'ダンス'];
export const RTYPE = { rival: ['ライバル', '🔥'], respect: ['そんけい', '🙇'], admire: ['あこがれ', '✨'], dislike: ['にがて', '😣'] };
export class Resident {
  constructor(f, data = {}) {
    this.uid = data.uid || ++uidSeq; this.f = f; this.ch = makeChar(f); this.obj = this.ch.root;
    this.p = { x: data.x ?? 64.5, y: data.y ?? 23, z: data.z ?? 64.5, vy: 0, onGround: false };
    this.yaw = Math.random() * 6; this.state = 'idle'; this.timer = Math.random() * 2; this.path = null; this.mode = 'walk';
    this.rel = data.rel || {}; this.hunger = data.hunger ?? 20; this.mood = data.mood ?? 60; this.level = data.level || 1; this.exp = data.exp || 0;
    this.home = data.home || null; this.need = data.need || null; this.needT = 25 + Math.random() * 90; this.talkT = 0; this.partner = null; this.anim = 0; this.speed = 0;
    this.bubble = null; this.drawingCanvas = null; this.controlled = false; this.lastPos = null; this.stuckT = 0; this.wantFriend = null; this.flowerCount = data.flowerCount || 0;
    this.diary = data.diary || []; this.quarrel = data.quarrel || {}; this.bathDay = -1; this.mem = data.mem || []; this.rtype = data.rtype || {}; this.lessons = data.lessons || 0; this.revenge = data.revenge || null; this.surpassed = data.surpassed || false; this.dream = data.dream ?? null; this.dreamDone = data.dreamDone || []; this.reads = data.reads || 0; this.epiDone = data.epiDone || []; this.talkN = data.talkN || 0; this.catch = data.catch || []; this.pmem = data.pmem || [];
  }
  log(t) { const G = this.G; this.diary.push({ d: G ? G.day : 1, t }); if (this.diary.length > 12) this.diary.shift(); }
  remember(k, uid, t) { const d = this.G ? this.G.day : 1; this.mem.push({ k, uid, t, d }); this.mem = this.mem.filter((m) => d - m.d <= 7).slice(-30); }
  pm(t) { const d = this.G ? this.G.day : 1; this.pmem = [...this.pmem.filter((m) => m.t !== t && d - m.d <= 14), { t, d }].slice(-12); }
  pmRecall() { const d = this.G ? this.G.day : 1; const L = this.pmem.filter((m) => d - m.d <= 14 && d - m.d >= 0); return L.length ? L[Math.floor(Math.random() * L.length)] : null; }
  recall(k, uid) { return this.mem.filter((m) => m.k === k && (uid == null || m.uid === uid)); }
  get pers() { return PERSONALITIES[this.f.personality] || PERSONALITIES[0]; }
  get name() { return this.f.name || 'なまえ'; }
  toJSON() { return { uid: this.uid, x: this.p.x, y: this.p.y, z: this.p.z, rel: this.rel, hunger: this.hunger, mood: this.mood, level: this.level, exp: this.exp, home: this.home, need: this.need, flowerCount: this.flowerCount, diary: this.diary, quarrel: this.quarrel, mem: this.mem, rtype: this.rtype, lessons: this.lessons, revenge: this.revenge, surpassed: this.surpassed, dream: this.dream, dreamDone: this.dreamDone, reads: this.reads, epiDone: this.epiDone, talkN: this.talkN, catch: this.catch, pmem: this.pmem }; }
  say(text, sec = 3, kind = '') { if (!kind || kind === 'joy') { if (/あはは|わはは|きゃはは|あははは/.test(text)) kind = 'laugh'; else if (/えへへ|てれ|はずかし|もじもじ/.test(text) || (this.f.personality === 6 && !kind && Math.random() < 0.4)) kind = 'shy'; else if (/ぷいっ|ふんっ|しらない/.test(text)) kind = 'sulk'; else if (/こまった|どうしよう|むずかしい|おしい|こげ/.test(text)) kind = 'trouble'; } this.sayAt = performance.now(); this.bubbleText = text; this.bubbleT = sec; this.bubbleKind = kind; const R = { angry: 'stomp', sad: 'sad', surprise: 'surprise', joy: 'joy', laugh: 'joy' }[kind]; if (R) this.react = { mode: R, t: Math.min(sec, 2.6) }; this.G && this.G.sfx && this.G.near(this) && this.G.sfx.babble(this.f.personality, text.length, this.f.voice || 1, kind, text, this.uid); }
  get laughText() { return ['あはは！', 'えへへ！', 'うふふ', 'わっはっは！', 'きゃはは！', 'ふふっ'][this.f.laugh || 0]; }
  addExp(n, G) { this.exp += n; this.mood = Math.min(100, this.mood + n * 0.6); if (this.exp >= 100) { this.exp -= 100; this.level++; G.news(`🎉 ${this.name}が レベル${this.level}に なった！`); G.effect && G.effect('level', this); this.state = 'cheer'; this.timer = 2.5; return true; } return false; }
  addRel(o, n, G) {
    const a = this.rel[o.uid] || 0;
    if (n > 0) { const lo = Math.min(this.uid, o.uid), hi = Math.max(this.uid, o.uid); const comp = 0.55 + (((lo * 31 + hi * 17) % 7) / 10) + (this.f.personality === o.f.personality ? 0.15 : 0); n *= comp * (a < 45 ? 1 : a < 75 ? (n >= 8 ? 0.7 : 0.3) : (n >= 8 ? 0.45 : 0.1)); }
    const b = Math.max(0, Math.min(100, a + n));
    this.rel[o.uid] = b; o.rel[this.uid] = Math.max(0, Math.min(100, (o.rel[this.uid] || 0) + n));
    for (const th of [20, 45, 75, 95]) if (a < th && b >= th) { const [lb, ic] = REL_LABEL(b); if (th >= 45) G.news(`${ic} ${this.name}と ${o.name}が「${lb}」に なった！`); this.log(`${o.name}と ${lb}に なった ${ic}`); o.log(`${this.name}と ${lb}に なった ${ic}`); if (th >= 75 && G.photo) G.photo([this, o], `${this.name}と ${o.name}は ${lb}`); G.effect && G.effect('heart', this); if (this.wantFriend === o.uid) { this.need = null; this.wantFriend = null; } if (th === 95) G.onBestie && G.onBestie(this, o); }
  }
  dist(o) { return Math.hypot(this.p.x - o.p.x, this.p.z - o.p.z); }
  updateType(o, G) {
    const rel = this.rel[o.uid] || 0, cur = this.rtype[o.uid]; let t = cur;
    const qs = this.recall('quarrel', o.uid).length;
    if (qs >= 2 && rel < 40) t = 'dislike'; else if (cur === 'dislike' && rel >= 50) t = null;
    else if (!cur && this.f.talent === o.f.talent && rel >= 30) t = 'rival';
    else if (!cur && o.f.talent === this.f.weak && rel >= 30) t = 'respect';
    else if (!cur && o.level >= this.level + 1 && rel >= 60) t = 'admire';
    if (t === cur) return; if (t) this.rtype[o.uid] = t; else delete this.rtype[o.uid];
    const tal = TAL[o.f.talent ?? 0];
    if (t === 'rival') { o.rtype[this.uid] = 'rival'; G.news(`🔥 ${this.name}と ${o.name}は ${tal}の ライバル！`); }
    if (t === 'respect') G.news(`🙇 ${this.name}は ${tal}が とくいな ${o.name}を そんけい！`);
    if (t === 'admire') G.news(`✨ ${this.name}は ${o.name}に あこがれている`);
    if (t === 'dislike') G.news(`😣 ${this.name}は ${o.name}が ちょっと にがて…`);
    if (!t && cur === 'dislike') G.news(`🌱 ${this.name}は ${o.name}と うちとけた！`);
    this.log(t ? `${o.name}は ${RTYPE[t][0]} ${RTYPE[t][1]}` : `${o.name}と うちとけた`);
  }
  goTo(G, x, y, z) {
    const s = [Math.floor(this.p.x), Math.round(this.p.y), Math.floor(this.p.z)];
    const p = findPath(G.world, s, [Math.floor(x), Math.round(y), Math.floor(z)], 1800);
    this.path = p && p.length ? p : null; this.goal = [x, y, z]; this.stuckT = 0;
    return !!this.path;
  }
  // 1フレーム
  update(dt, G) {
    this.G = G;
    const isNight = G.hour >= 21 || G.hour < 6;
    this.hunger = Math.min(100, this.hunger + dt * 0.12);
    if (this.bubbleT > 0) this.bubbleT -= dt;
    // ほしいもの
    this.needT -= dt;
    if (!this.need && this.needT <= 0 && !isNight) {
      this.needT = 70 + Math.random() * 110;
      const r = Math.random();
      if (this.hunger > 65) this.need = 'hungry';
      else if (!this.home && r < 0.25 && G.houseless > 0) this.need = 'house';
      else if (r < 0.42) this.need = 'quiz';
      else if (r < 0.65) { const s = G.residents.filter((o) => o !== this && (this.rel[o.uid] || 0) < 45); if (s.length) { const o = rnd(s); this.need = 'friend'; this.wantFriend = o.uid; } }
      else if (r < 0.75) this.need = 'gift';
      if (this.need) { const k = { hungry: 'needHungry', house: 'needHouse', quiz: 'needQuiz', friend: 'needFriend', gift: 'needGift' }[this.need]; const o = G.byUid(this.wantFriend); this.say(fill(rnd(TALK[k]), { B: o && o.name }), 4, 'need'); }
    }
    if (this.need === 'house' && this.home) { this.need = null; G.me && G.payReward && G.payReward(this, 'house'); }
    if (this.need === 'consult' && G.day > (this.consultDay || 0)) { this.need = null; this.consult = null; }
    if (this.spinT > 0) { this.spinT -= dt; this.yaw += dt * 9; this.evFace = null; if (Math.random() < dt * 3) G.effect && G.effect('sparkle', this); }
    if (this.controlled) { this.mode = 'walk'; return; }
    if (this.state !== this._st) { this._st = this.state; this.stT = 0; } else if ((this.stT += dt) > 60 && ['walk', 'gouse', 'goevent', 'visit', 'gohome', 'goseat', 'gofish', 'party'].includes(this.state)) { this.path = null; this.state = 'idle'; this.timer = 0.5; this.inviting = false; }
    this.timer -= dt;
    const st = this.state;
    if (st === 'idle' && this.timer <= 0) this.think(G, isNight);
    else if (st === 'walk' || st === 'visit' || st === 'gohome' || st === 'goseat' || st === 'gofish' || st === 'party' || st === 'gouse' || st === 'goevent') this.follow(dt, G);
    else if (st === 'using') this.using(dt, G);
    else if (st === 'mini') { this.mode = this.evMode || 'walk'; if (this.evFace) this.yaw = Math.atan2(this.evFace[0] - this.p.x, this.evFace[1] - this.p.z); }
    else if (st === 'event') { this.mode = this.evMode || 'walk'; if (this.evFace) this.yaw = Math.atan2(this.evFace[0] - this.p.x, this.evFace[1] - this.p.z); if (this.timer <= 0) { this.state = 'idle'; this.timer = 1; this.mode = 'walk'; } }
    else if (st === 'chat') {
      this.mode = 'talk'; this.faceTo(this.partner);
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1 + Math.random() * 3; this.partner = null; }
    } else if (st === 'dance' || st === 'cheer' || st === 'eat' || st === 'wave' || st === 'fish' || st === 'sit' || st === 'look') {
      this.mode = st === 'look' ? 'walk' : st;
      if (st === 'fish' && Math.random() < dt * 0.08) { const f = rnd([['🐟', 'さかな'], ['🐠', 'ねったいぎょ'], ['👢', 'ながぐつ'], ['🦀', 'カニ'], ['🐙', 'タコ']]); this.say(f[0] === '👢' ? '👢 …ながぐつ' : `${f[0]} ${f[1]}が つれた！`, 3, 'joy'); this.addExp(3, G); G.discover && G.discover(f[1], f[0], `${this.name}が つった`); }
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1 + Math.random() * 2; this.mode = 'walk'; if (st === 'sit' && this.seatY) { this.p.y = this.seatY; this.seatY = null; } }
    } else if (st === 'sleep') {
      this.mode = 'sleep'; if (Math.random() < dt * 0.2) this.say(rnd(TALK.sleep), 2, 'sleep');
      if (!isNight) { this.state = 'idle'; this.timer = 1; this.mode = 'walk'; this.p.y += 0.5; this.say(rnd(TALK.morning), 3); this.hunger += 10; }
    }
    if (this.state !== 'sleep' && this.state !== 'sit') this.physics(dt, G);
  }
  think(G, isNight) {
    const others = G.residents.filter((o) => o !== this);
    if (G.party) { this.goTo(G, G.party.x + (Math.random() - 0.5) * 8, G.party.y, G.party.z + (Math.random() - 0.5) * 8); this.state = 'party'; return; }
    const wet = G.weather && G.weather.k !== 'sun';
    if (wet && !isNight && this.shelterFor !== G.weather && G.findShelter && !G.roofed(G, this.p.x, this.p.y, this.p.z)) { this.shelterFor = G.weather; const sh = G.findShelter(G, this.p); if (sh && this.goTo(G, ...sh)) { this.state = 'goevent'; this.evMode = 'walk'; this.evT = 25; this.evSay = rnd(['あまやどり！', 'ぬれちゃう〜', 'ここなら だいじょうぶ']); this.evFace = null; this.say(G.weather.k === 'snow' ? '❄️ さむい〜！' : '☔ あめだ〜！', 2, 'surprise'); return; } else this.say('☂️ かさ さそう', 2); }
    if (isNight && this.bathDay !== G.day && this.home && G.hour >= 21 && G.hour < 23) { this.bathDay = G.day; const u = G.findUse(this.home, 7, ['bath']); if (u && this.goUse(G, u)) return; }
    if (isNight) {
      if (this.home) { const [hx, hy, hz] = this.home; const bid = G.world.get(hx, hy, hz); if (!bid || !B[bid].bed) { this.home = null; return; }
        const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [hx + dx, hy, hz + dz]).find((c) => standable(G.world, ...c));
        if (adj && this.goTo(G, ...adj)) { this.state = 'gohome'; return; } }
      this.state = 'sleep'; this.p.y += 0; this.timer = 999; return;
    }
    const r = Math.random();
    // 友だちになりたい相手
    if (this.need === 'friend' && this.wantFriend && this.introduced) { const o = G.byUid(this.wantFriend); if (o && !o.controlled && o.state !== 'sleep') { if (this.goTo(G, o.p.x, o.p.y, o.p.z)) { this.state = 'visit'; this.partner = o; return; } } }
    if (this.revenge && r < 0.25) {
      const o = G.byUid(this.revenge.vs);
      if (o && G.day > this.revenge.day && o.state !== 'sleep' && !o.controlled && this.goTo(G, o.p.x, o.p.y, o.p.z)) { this.state = 'visit'; this.partner = o; this.intent = 'contest'; this.say('リベンジだ！', 2.5, 'angry'); return; }
      if (G.day === this.revenge.day) { const K = { 0: ['stage', 'music'], 1: ['paint'], 2: ['cook'], 3: ['swing', 'ball'], 4: ['study', 'read'], 5: ['stage', 'music'] }[this.f.talent ?? 0]; const u = G.findUse(this.p, 20, K); if (u && this.goUse(G, u)) { this.say('🔥 れんしゅう するぞ！', 2.5); this.log('リベンジに むけて れんしゅう 🔥'); return; } }
    }
    if (r < 0.06) { const rv = others.find((o) => this.rtype[o.uid] === 'rival' && o.state !== 'sleep' && !o.controlled && o.state !== 'event'); if (rv && this.dist(rv) < 30 && this.goTo(G, rv.p.x, rv.p.y, rv.p.z)) { this.state = 'visit'; this.partner = rv; this.intent = 'contest'; return; } }
    if (r < 0.1) { const tc = others.find((o) => this.rtype[o.uid] === 'respect' && o.state !== 'sleep' && !o.controlled && o.state !== 'event'); if (tc && this.dist(tc) < 30 && this.goTo(G, tc.p.x, tc.p.y, tc.p.z)) { this.state = 'visit'; this.partner = tc; this.intent = 'lesson'; return; } }
    if (r < 0.13) { const ad = others.find((o) => this.rtype[o.uid] === 'admire' && o.state !== 'sleep'); if (ad && this.goTo(G, ad.p.x + 1.2, ad.p.y, ad.p.z + 1.2)) { this.state = 'walk'; this.say(`${ad.name}みたいに なりたいな…`, 3); return; } }
    if (r < 0.2) { const kinds = this.hunger > 50 ? ['cook', 'snack'] : null; const u = G.findUse(this.p, 16, kinds); if (u && this.goUse(G, u)) return; }
    if (r < 0.4 && others.length) {
      // なかよしを優先
      const w = others.map((o) => (o.state === 'sleep' || this.rtype[o.uid] === 'dislike' || this.quarrel[o.uid] != null && G.day === this.quarrel[o.uid] ? 0 : 1 + (this.rel[o.uid] || 0) / 30 + (o.controlled ? 0.5 : 0) + (this.recall('gift', o.uid).some((m) => !m.ret) ? 3 : 0)));
      let t = Math.random() * w.reduce((a, b) => a + b, 0); let o = others[0]; for (let i = 0; i < others.length; i++) { t -= w[i]; if (t <= 0) { o = others[i]; break; } }
      if (o.state !== 'sleep' && this.dist(o) < 40 && this.goTo(G, o.p.x, o.p.y, o.p.z)) { this.state = 'visit'; this.partner = o; return; }
    }
    if (r < 0.42) { const seat = G.findNear(this.p, (d) => d.seat, 10); if (seat && this.goTo(G, seat[0], seat[1], seat[2])) { this.state = 'goseat'; this.seat = seat; return; } }
    if (r < 0.48) { const wt = G.findWaterEdge(this.p, 14); if (wt && this.goTo(G, ...wt)) { this.state = 'gofish'; return; } }
    if (r < 0.51 && G.hour >= 11 && G.hour < 16 && !(G.weather && G.weather.k !== 'sun')) { const wt = G.findWaterEdge(this.p, 12); if (wt && this.goTo(G, ...wt)) { this.state = 'goevent'; this.evMode = 'cheer'; this.evT = 6; this.evSay = rnd(['💦 ばしゃばしゃ！', 'みず つめたーい！', '💦 えいっ！']); this.evFace = null; this.log('みずあそびを した 💦'); return; } }
    if (r < 0.535 && G.hills && G.hills.length) { const hl = rnd(G.hills); if (Math.hypot(hl[0] - this.p.x, hl[2] - this.p.z) < 40 && this.goTo(G, ...hl)) { this.state = 'goevent'; this.evMode = 'sit'; this.evT = 8; this.evSay = rnd(['やっほー！ けしきが いい！', '🧺 おかの うえで ピクニック', 'しまが よく みえる！']); this.evFace = [G.center.x, G.center.z]; this.log('おかに のぼった ⛰️'); return; } }
    if (r < 0.555 && G.bridges && G.bridges.length) { const bd = rnd(G.bridges); if (this.goTo(G, bd[0], bd[1] + 1, bd[2])) { this.state = 'goevent'; this.evMode = 'walk'; this.evT = 3; this.evSay = rnd(['はしを わたろう♪', 'たかーい！', 'みずが きれい']); this.evFace = null; return; } }
    if (r < 0.54 && this.flowerCount < 25) { this.plantFlower(G); this.state = 'look'; this.timer = 1.5; return; }
    if (r < 0.6) { this.state = 'dance'; this.timer = 3 + Math.random() * 3; this.say(rnd(['♪〜', 'ルンルン♪', 'おどろう♪']), 2); return; }
    if (r < 0.66) { this.state = 'look'; this.timer = 2; this.say(rnd(['いい てんき〜', 'ふわぁ', 'なに しようかな', '🎵', '…']), 2); return; }
    // さんぽ
    const cx = this.home ? this.home[0] : G.center.x, cz = this.home ? this.home[2] : G.center.z;
    for (let i = 0; i < 6; i++) {
      const x = cx + (Math.random() - 0.5) * 30, z = this.p.z + (Math.random() - 0.5) * 24 * 0 + (cz - this.p.z) * 0.3 + (Math.random() - 0.5) * 24;
      const y = G.world.top(Math.floor(x), Math.floor(z)) + 1;
      if (y > 0 && standable(G.world, Math.floor(x), y, Math.floor(z)) && this.goTo(G, x, y, z)) { this.state = 'walk'; return; }
    }
    this.timer = 1;
  }
  goUse(G, u) {
    const [fx, fy, fz, kind] = u; const w = G.world;
    const adj = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dz]) => [fx + dx, fy, fz + dz]).filter((c) => standable(w, ...c));
    if (!adj.length) return false; const a = adj[Math.floor(Math.random() * adj.length)];
    if (!this.goTo(G, ...a)) return false; this.state = 'gouse'; this.use = { at: [fx, fy, fz], kind }; return true;
  }
  using(dt, G) {
    const k = this.use.kind, U = USE_FX[k] || USE_FX.look;
    this.mode = U.mode; this.yaw = Math.atan2(this.use.at[0] + 0.5 - this.p.x, this.use.at[2] + 0.5 - this.p.z);
    if (this.timer <= 0) {
      if (U.done) this.say(U.done, 2.5);
      if (U.hunger) this.hunger = Math.max(0, this.hunger - U.hunger);
      this.mood = Math.min(100, this.mood + 6); this.addExp(U.exp || 3, G);
      if (k === 'cook' && Math.random() < 0.6) { const t = G.findUse(this.p, 12, ['dine']); if (t && this.goUse(G, t)) return; }
      if (this.need === 'hungry' && this.hunger < 40) this.need = null;
      if (U.log) this.log(U.log);
      if (k === 'read') this.reads++;
      this.state = 'idle'; this.timer = 1 + Math.random() * 2; this.mode = 'walk';
    }
  }
  plantFlower(G) {
    const fl = G.flowerIds; const w = G.world;
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(this.p.x + (Math.random() - 0.5) * 4), z = Math.floor(this.p.z + (Math.random() - 0.5) * 4), y = w.top(x, z);
      if (y > 0 && B[w.get(x, y, z)].name === 'くさ' && !w.get(x, y + 1, z)) { w.set(x, y + 1, z, rnd(fl)); this.flowerCount++; this.say('🌷 おはなを うえたよ', 2.5); return; }
    }
  }
  faceTo(o) { if (!o) return; this.yaw = Math.atan2(o.p.x - this.p.x, o.p.z - this.p.z); }
  follow(dt, G) {
    this.mode = 'walk';
    if (this.state === 'visit' && this.partner) {
      const o = this.partner;
      if (this.dist(o) < 1.6) { this.path = null; this.startChat(o, G); return; }
      if (this.path && this.path.length && Math.random() < dt * 0.6) this.goTo(G, o.p.x, o.p.y, o.p.z);
    }
    if (!this.path || !this.path.length) {
      if (this.state === 'gohome') { const [hx, hy, hz] = this.home; this.p.x = hx + 0.5; this.p.z = hz + 0.5; this.p.y = hy + 0.45; this.state = 'sleep'; this.timer = 999; this.yaw = 0; return; }
      if (this.state === 'goseat' && this.seat) { const [sx, sy, sz] = this.seat; const id = G.world.get(sx, sy, sz); if (id && B[id].seat) { this.seatY = this.p.y; this.p.x = sx + 0.5; this.p.z = sz + 0.5; this.p.y = sy + (B[id].model === 'zabuton' || B[id].model === 'futon' ? 0.15 : 0.45); this.yaw = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][G.world.meta(sx, sy, sz) & 3] + Math.PI; this.state = 'sit'; this.timer = 5 + Math.random() * 6; return; } }
      if (this.state === 'gofish') { this.state = 'fish'; this.timer = 8 + Math.random() * 8; this.say('🎣 つりを しよう', 2); const wt = G.findWaterEdge(this.p, 2, true); if (wt) this.yaw = Math.atan2(wt[0] + 0.5 - this.p.x, wt[2] + 0.5 - this.p.z); return; }
      if (this.state === 'party') { this.state = 'dance'; this.timer = 6; return; }
      if (this.state === 'gouse') { const U = USE_FX[this.use.kind] || USE_FX.look; this.state = 'using'; this.timer = U.t; let say = U.say; const hk = G.onUse && G.onUse(this, this.use); if (hk) say = hk; if (this.use.kind === 'museum' && G.zukan) { const ex = Object.entries(G.zukan).filter(([n]) => ['きょうりゅうの ほね', 'アンモナイト', 'キバ', 'ダイヤ', 'すいしょう', 'ヒスイ', 'おうかん', 'きんか', 'ふしぎな かぎ'].includes(n)); if (ex.length) { const [n, z] = rnd(ex); say = `${z.e} ${n}${rnd(['、おおきい〜！', 'って むかしの もの？', '、きらきら してる！', '、だれが みつけたの？'])}`; this.log(`はくぶつかんで ${n}を みた`); } } this.say(say, Math.min(4, U.t)); if (U.share) G.residents.forEach((o) => { if (o !== this && o.state === 'using' && o.dist(this) < 4) this.addRel(o, 2, G); }); return; }
      if (this.state === 'goevent') { this.state = 'event'; this.timer = this.evT || 8; if (this.evSay) this.say(this.evSay, 3); return; }
      this.state = 'idle'; this.timer = 0.5 + Math.random() * 2; return;
    }
    const n = this.path[0], tx = n[0] + 0.5, tz = n[2] + 0.5;
    const dx = tx - this.p.x, dz = tz - this.p.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { this.path.shift(); return; }
    const sp = 2.0 * this.pers.speed * (this.state === 'party' ? 1.3 : 1);
    const ty = Math.atan2(dx, dz); let dy2 = ty - this.yaw; while (dy2 > Math.PI) dy2 -= Math.PI * 2; while (dy2 < -Math.PI) dy2 += Math.PI * 2; this.yaw += dy2 * Math.min(1, dt * 10);
    const mx = (dx / d) * sp * dt, mz = (dz / d) * sp * dt;
    const before = [this.p.x, this.p.z];
    G.world.move(this.p, mx, 0, mz, 0.25, 1.3, true);
    this.speed = sp;
    const moved = Math.hypot(this.p.x - before[0], this.p.z - before[1]);
    if (moved < sp * dt * 0.3) { this.stuckT += dt; if (this.stuckT > 1.2 && this.p.onGround) { this.p.vy = 6; this.stuckT = 0.6; } } else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > 1.1 && Math.random() < 0.02) { this.path = null; this.state = 'idle'; this.timer = 0.5; }
  }
  startChat(o, G) {
    if (o.state === 'sleep' || o.state === 'chat' && o.partner !== this) { this.state = 'idle'; this.timer = 1; return; }
    if (o.controlled) { this.state = 'chat'; this.partner = o; this.timer = 3; this.faceTo(o); this.say(rnd(TALK.player), 3); this.mode = 'wave'; return; }
    this.state = 'chat'; this.partner = o; this.timer = 7; o.state = 'chat'; o.partner = this; o.timer = 7; o.path = null;
    this.faceTo(o); o.faceTo(this);
    if ((this.rel[o.uid] || 0) < 5) { this.log(`${o.name}と はじめて はなした`); o.log(`${this.name}と はじめて はなした`); }
    const first = (this.rel[o.uid] || 0) < 5;
    const rel = this.rel[o.uid] || 0, rr = Math.random();
    const intent = this.intent; this.intent = null;
    if (intent === 'contest') {
      const tal = TAL[this.f.talent ?? 0]; const sc = (x) => x.level + Math.random() * 3 + (x.mood / 50);
      const win = sc(this) >= sc(o) ? this : o, lose = win === this ? o : this;
      this.say(`${o.name}！ ${tal}で しょうぶだ！`, 3, 'angry'); setTimeout(() => o.say('のぞむ ところ！', 2.5, 'joy'), 1500);
      const rev = this.revenge && this.revenge.vs === o.uid; this.revenge = null;
      setTimeout(() => { win.say(rev && win === this ? 'リベンジ せいこう！ やったー！' : 'やったー！ かった！', 3, 'joy'); lose.say('くやしい〜！ れんしゅう して また しょうぶだ！', 3, 'sad'); lose.revenge = { vs: win.uid, day: G.day }; G.news(rev && win === this ? `🔥 ${this.name}が ${o.name}に ${tal}で リベンジ せいこう！` : `🔥 ${tal}たいけつ！ ${win.name}が ${lose.name}に かった`); if (rev && win === this) { G.photo && G.photo([this, o], `${this.name}の リベンジ`); lose.revenge = null; } win.addExp(10, G); this.addRel(o, 6, G); win.log(`${lose.name}に ${tal}で かった 🏆`); lose.log(`${win.name}に ${tal}で まけた…`); }, 4200);
      o.state = 'chat'; o.partner = this; o.timer = 7; return;
    }
    if (intent === 'lesson' && this.lessons >= 5 && this.f.weak === -1 && !this.surpassed) {
      const tal = TAL[o.f.talent ?? 0]; this.surpassed = true; this.say(`${o.name}せんせい、${tal}で しょうぶ して ください！`, 3, 'joy'); setTimeout(() => o.say('よし、みせて ごらん！', 2.5, 'joy'), 1500);
      const won = Math.random() < 0.6; setTimeout(() => { if (won) { this.say('せんせいを こえた…！', 3, 'surprise'); o.say('すごい！ もう りっぱな せんせいだね', 3.5, 'joy'); G.news(`🎓 ${this.name}が ${o.name}せんせいを こえた！`); G.photo && G.photo([this, o], `${this.name}、せんせいを こえる`); this.addExp(40, G); } else { this.say('まだまだ かなわない！', 3, 'sad'); o.say('でも すごく じょうずに なったよ', 3, 'joy'); this.surpassed = false; } this.addRel(o, 10, G); }, 4200);
      o.state = 'chat'; o.partner = this; o.timer = 7; return;
    }
    if (intent === 'lesson') {
      const tal = TAL[o.f.talent ?? 0];
      this.say(`${o.name}せんせい、${tal}を おしえて！`, 3, 'joy'); setTimeout(() => o.say('いいよ！ こうやって…', 3, 'joy'), 1600);
      this.lessons++; o.addExp(8, G); this.addRel(o, 8, G); this.log(`${o.name}に ${tal}を ならった`);
      if (this.lessons >= 3 && this.f.weak === o.f.talent) { setTimeout(() => { this.say(`${tal}が できるように なった！`, 3.5, 'joy'); G.news(`🎓 ${this.name}が にがてな ${tal}を こくふく！ ${o.name}の おかげ`); this.f.weak = -1; G.photo && G.photo([this, o], `${this.name}、${tal}を こくふく`); }, 4000); }
      o.state = 'chat'; o.partner = this; o.timer = 7; return;
    }
    if (this.quarrel[o.uid] != null && G.day > this.quarrel[o.uid]) {
      this.say('このあいだは ごめんね…', 3, 'sad'); setTimeout(() => o.say('ううん、わたしこそ ごめんね！', 3), 1800);
      delete this.quarrel[o.uid]; delete o.quarrel[this.uid]; this.addRel(o, 15, G);
      G.near(this) && G.sfx.melody && G.sfx.melody(); if ((this.rel[o.uid] || 0) >= 70) setTimeout(() => { this.say('ずっと しんゆう だよ！', 3, 'joy'); o.say('うん！ ぎゅー！', 3, 'joy'); this.spinT = 1.2; o.spinT = 1.2; for (let i = 0; i < 3; i++) setTimeout(() => { G.effect && G.effect('heart', this); G.effect && G.effect('heart', o); }, i * 400); }, 2400); setTimeout(() => { G.news(`🤝 ${this.name}と ${o.name}が なかなおりした！`); G.effect && G.effect('heart', this); }, 3600); this.log(`${o.name}と なかなおり 🤝`); o.log(`${this.name}と なかなおり 🤝`); G.photo && G.photo([this, o], `${this.name}と ${o.name}の なかなおり`); return;
    }
    if (this.quarrel[o.uid] != null) { this.say('…ぷいっ', 2, 'angry'); o.say('…', 2, 'sad'); this.timer = 2.5; o.timer = 2.5; return; }
    if (!first && rr < 0.05 && rel < 80) {
      const why = rnd(['どっちが はやいか', 'おやつの とりあい', 'すきな いろの はなし', 'ブランコの じゅんばん']);
      this.say('💢 それ ちがうよ！', 2.5, 'angry'); setTimeout(() => o.say('💢 もう しらない！', 2.5, 'angry'), 1500);
      this.addRel(o, -12, G); this.quarrel[o.uid] = G.day; o.quarrel[this.uid] = G.day;
      setTimeout(() => G.news(`💢 ${this.name}と ${o.name}が ${why}で けんか… あした なかなおり できるかな`), 2600); this.log(`${o.name}と けんかした 💢`); o.log(`${this.name}と けんかした 💢`); this.remember('quarrel', o.uid); o.remember('quarrel', this.uid); return;
    }
    const owe = this.recall('gift', o.uid).find((m) => !m.ret);
    if (owe) { owe.ret = true; const g2 = rnd(['🍰 ケーキ', '🌻 ひまわり', '🎨 え', '🍬 あめ']); this.say(`このあいだの おかえし！ ${g2}`, 3, 'joy'); setTimeout(() => o.say('わあ、おぼえてて くれたの！？', 3, 'surprise'), 1700); this.addRel(o, 12, G); setTimeout(() => G.news(`🎁 ${this.name}が ${o.name}に おかえしを した`), 2200); this.log(`${o.name}に おかえしを した`); return; }
    const past = this.mem.find((m) => m.k === 'event' && m.uid === o.uid && G.day - m.d >= 1 && !m.talked);
    if (past && rr < 0.5) { past.talked = true; this.say(`${G.day - past.d === 1 ? 'きのう' : 'このまえ'}の「${past.t}」、おぼえてる？`, 3.2); setTimeout(() => o.say(rnd(['うん！ たのしかったね！', 'あれは わらったね〜', 'わすれられないよ！']), 3, 'joy'), 1900); this.addRel(o, 6, G); return; }
    if (!first && rr < 0.15 && rel >= 40) {
      const gift = rnd(['🍪 クッキー', '🌸 おはな', '🐚 かいがら', '💎 きれいな いし', '📕 えほん', '🎀 リボン']);
      this.say(`${gift}、あげる！`, 3); setTimeout(() => o.say('わあ！ ありがとう！', 3, 'surprise'), 1700);
      this.addRel(o, 10, G); setTimeout(() => { G.news(`🎁 ${this.name}が ${o.name}に ${gift}を プレゼント`); G.effect && G.effect('gift', o); }, 2200); o.log(`${this.name}から ${gift}を もらった`); o.remember('gift', this.uid, gift); return;
    }
    if (!first && rr < 0.25 && rel >= 30) {
      this.say('🤫 ないしょ だよ… ひそひそ', 3); setTimeout(() => o.say(rnd(['えーっ！ ほんと！？', 'ひゃー！', 'だれにも いわない！']), 3, 'surprise'), 1800);
      this.addRel(o, 8, G); return;
    }
    if (!first && rr < 0.6) { const T = topicPair(G, this, o); if (T) { this.say(T[0], 3.2); setTimeout(() => o.say(T[1], 3, T[2] || ''), 1900); this.addRel(o, 3, G); return; } }
    if (first) { this.say(`はじめまして！ ${this.name}だよ`, 3); setTimeout(() => o.say(`${o.name}です、よろしくね！`, 3), 1600); }
    else {
      const [q, as] = rnd(TALK.pair);
      const ctx = { B: o.name, F: rnd(FOODS)[1], P: G.petName(this) };
      this.say(fill(rnd(TALK.hello), ctx), 2);
      setTimeout(() => this.say(fill(q, ctx), 2.6), 1500);
      setTimeout(() => o.say(fill(rnd(as), { B: this.name, F: FOODS[o.f.food][1], P: G.petName(o) }), 2.6), 3600);
    }
    const bonus = (this.wantFriend === o.uid || o.wantFriend === this.uid) ? 18 : 0;
    this.addRel(o, 10 + Math.random() * 7 + bonus, G); this.updateType(o, G); o.updateType(this, G);
    if ((this.rel[o.uid] || 0) > 40 && Math.random() < 0.35) { setTimeout(() => { if (this.state === 'chat') { this.state = 'dance'; this.timer = 4; o.state = 'dance'; o.timer = 4; } }, 5200); }
  }
  physics(dt, G) {
    if (G.isFly && this.controlled) return;
    this.p.vy = Math.max(-20, this.p.vy - 22 * dt);
    G.world.move(this.p, 0, this.p.vy * dt, 0, 0.25, 1.3, false);
    if (this.p.y < 0) { this.p.y = 40; }
  }
  sync(t, dt) {
    this.obj.position.set(this.p.x, this.p.y, this.p.z);
    let d = this.yaw - this.obj.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.obj.rotation.y += d * Math.min(1, dt * 12);
    const moving = this.state === 'walk' || this.state === 'visit' || this.state === 'gohome' || this.state === 'goseat' || this.state === 'gofish' || this.state === 'party' || this.state === 'gouse' || this.state === 'goevent' || (this.controlled && this.speed > 0.1);
    if (this.react) { this.react.t -= dt; if (this.react.t <= 0) this.react = null; }
    this.ch.talking = this.bubbleT > 0 && this.bubbleKind !== 'sleep'; this.ch.act = this.bubbleT > 0 && ['shy', 'sulk', 'trouble', 'laugh'].includes(this.bubbleKind) ? this.bubbleKind : this.ch.talking ? 'talk' : null;
    { const pt = this.partner; this.ch.listening = !this.ch.talking && this.state === 'chat' && pt && pt.bubbleT > 0; const G = this.G; if (G) { const nt = (G.hour >= 20.5 || G.hour < 6.3) && !this.controlled; this.ch.setPajama && this.ch.setPajama(nt || this.state === 'sleep'); if (nt && G.hour < 21.5 && this.state !== 'sleep' && Math.random() < dt * 0.01) this.say(rnd(['ふわぁ〜… ねむい', 'パジャマに きがえたよ', 'もう ねる じかんだ〜']), 2.5); } }
    if (this.ch.umbrella && this.G) { const wet = this.G.weather && this.G.weather.k !== 'sun'; this.ch.umbrella.visible = !!(wet && this.state !== 'sleep' && this.G.roofed && !this.G.roofed(this.G, this.p.x, this.p.y, this.p.z)); }
    const lp = this._lp || (this._lp = this.obj.position.clone()); const vel = dt > 0 ? Math.min(8, Math.hypot(this.obj.position.x - lp.x, this.obj.position.z - lp.z) / dt) : 0; lp.copy(this.obj.position); this._vel = (this._vel || 0) * 0.7 + vel * 0.3;
    this.ch.animate(t + this.uid, this.react ? 0 : this._vel, dt, this.react ? this.react.mode : this.mode === 'walk' ? (moving ? 'walk' : 'idle') : this.mode);
    // 表情
    if (this.bubbleT > 0 && ['angry', 'sad', 'surprise', 'shy', 'sulk', 'trouble'].includes(this.bubbleKind)) this.ch.setExpr(this.bubbleKind);
    else if (this.bubbleT > 0 && this.bubbleKind === 'laugh') this.ch.setExpr(Math.floor(t * 7) % 2 ? 'laugh' : 'happy');
    else if (this.bubbleT > 0 && this.bubbleKind !== 'sleep') { const tx = this.bubbleText || '', el = (performance.now() - (this.sayAt || 0)) / 1000, ci = Math.floor(el * 7.5); const ch = ci < tx.length ? tx[ci] : ''; this.ch.setExpr(VOW(ch) || ((t + this.uid * 0.37) % 4 < 0.12 ? 'blink' : this.bubbleKind === 'joy' && ci >= tx.length ? 'happy' : 'open')); }
    else if (this.state === 'sleep') this.ch.setExpr('blink');
    else if (this.react && this.react.mode === 'joy') this.ch.setExpr('happy');
    else if (this.react && this.react.mode === 'sad') this.ch.setExpr('sad');
    else if (this.state === 'dance' || this.state === 'cheer' || this.mode === 'eat') this.ch.setExpr('happy');
    else this.ch.setExpr((t + this.uid * 0.37) % 4 < 0.13 ? 'blink' : 'open');
  }
}

// ---------- ペット（おえかき）
export const PET_MOVES = [['ぴょんぴょん', '🐇'], ['ふわふわ', '🎈'], ['とことこ', '🐾'], ['くねくね', '🐍']];
export const PET_PERS = [['げんき', '⚡'], ['あまえんぼ', '💕'], ['ねぼすけ', '💤'], ['くいしんぼう', '🍖']];
// ---------- はなしの わだい
const REPLY = [['いいね！ いこういこう！', 'わーい！ たのしそう！'], ['ふわぁ… いいねぇ〜', 'のんびり きく〜'], ['なるほど、ちゃんと おぼえておくね', 'それは だいじだね'], ['ふふふ、おもしろ〜い', 'へんなの〜 すき！'], ['えー！ わたしも いっしょが いい！', 'すごーい！ もっと はなして！'], ['しっしっし、いいこと きいた', 'じゃあ いたずら しちゃお！'], ['そ、そうなんだ…', 'え、えへへ… いいね']];
const SILLY = ['ねえ、くもって わたあめ かな？', 'さかなって ねるとき めを あけてるんだって！', 'あしたは ほうきで そらを とぶ よてい！', 'おへそって なんで あるの？', 'ペンギンって ひざ あるんだって！', 'あめって そらの なみだ かな？'];
export const CATCH = [['いくぞー！', 'ばっちり！', 'ワクワク〜！'], ['ふわふわ〜', 'まったり〜', 'ねむねむ…'], ['よし！', 'ちゃんと しよ', 'えらい！'], ['ふしぎ〜', 'なんでかな？', 'ふむふむ'], ['ぎゅー！', 'えへへ〜', 'いっしょ！'], ['しっしっし', 'ドッキリ！', 'ひみつ〜'], ['もじもじ…', 'てれちゃう…', 'えへ…']];
const stripEmo = (t) => t.replace(/\s*\S*[\u{1F300}-\u{1FAFF}☀-➿]\S*$/u, '');
const SEASON = [['はるだね！ さくらが きれい', 'おはなみ しよう！'], ['なつだね〜 あつい！', 'うみで およごう！'], ['あきだね。おちば ふかふか', 'おいもを やこう！'], ['ふゆだね… ゆき ふるかな', 'こたつで みかん！']];
export const seasonOf = (G) => { const k = (G.day - 1) % 14; return k < 4 ? 0 : k < 8 ? 1 : k < 11 ? 2 : 3; };
export function fresh(G, s) { const R = G.recentLines || (G.recentLines = new Map()); const t = G.time || 0; const last = R.get(s); if (last != null && t - last < 8) return false; R.set(s, t); if (R.size > 300) { for (const [k, v] of R) if (t - v > 8) R.delete(k); } return true; }
function topicPair(G, a, b) { for (let i = 0; i < 4; i++) { const T = topicPair1(G, a, b); if (T && fresh(G, T[0])) return T; } return null; }
function topicPair1(G, a, b) {
  const rep = rnd(REPLY[b.f.personality % 7]); const c = Math.floor(Math.random() * 8);
  if (c === 7) { const S = SEASON[seasonOf(G)]; return [S[0], rnd([S[1], rep]), 'joy']; }
  const pet = G.pets.find((p) => p.owner === a.uid); const yd = a.diary.filter((e) => e.d === G.day - 1 && !/はじめて/.test(e.t)); const W = G.weather && G.weather.k;
  if (c === 0 && G.islandName) return [`「${G.islandName}」って いい なまえだよね`, rnd(['うん！ だいすきな しま！', 'この しまに きて よかった！', rep]), 'joy'];
  if (c === 1 && W === 'rain') return ['あめ、やまないね…', rnd(['あめの おと すき！', 'かさ いっしょに はいる？', 'あめあがりに にじ でるかも！']), ''];
  if (c === 1 && W === 'snow') return ['ゆき！ ゆきだるま つくろう！', 'つくろう！ おおきいの！', 'joy'];
  if (c === 1) return [rnd(['きょうは いい てんき！', 'おひさま きもちいいね', 'そらが あおいね〜']), rnd(['おさんぽ しよう！', 'ピクニック いいね！', rep]), ''];
  if (c === 2 && yd.length) return [`きのう ${stripEmo(rnd(yd).t)}んだよ`, rnd(['いいな〜 こんど いっしょに！', 'すごいね！', rep]), 'joy'];
  if (c === 3 && pet) return [`${pet.name}が ${rnd(['ねぞう わるいの', 'くしゃみ したの', 'ぼうしを かじったの', 'ねごと いってたの'])}`, rnd(['あはは！ かわいい〜', 'えー！ みたかった！']), 'joy'];
  if (c === 4) return [rnd(SILLY), rnd(['なにそれ〜！ あはは', 'ほんと！？ しらなかった！', 'あはは！ へんなの〜']), 'joy'];
  if (c === 5 && G.todayName) return [`きょうの ${G.todayName}、たのしみだね！`, rnd(['うん！ いっしょに いこう！', 'ドキドキする〜', rep]), 'joy'];
  if (c === 6 && a.catch.length) return [rnd(a.catch), rnd([`それ、${a.name}の くちぐせだね！`, 'でた〜！ あはは']), 'joy'];
  return null;
}
export class Pet {
  constructor(data, canvas) {
    this.uid = data.uid || ++uidSeq; this.name = data.name || 'ペット'; this.owner = data.owner ?? null; this.move = data.move || 0; this.size = data.size || 0.8;
    this.canvas = canvas; this.p = { x: data.x ?? 64, y: data.y ?? 24, z: data.z ?? 64, vy: 0 };
    this.pers = data.pers ?? Math.floor(Math.random() * 4); this.tricks = data.tricks || 0; this.love = data.love || 0; this.trick = null; this.trickT = 0; this.bubbleT = 0; this.sleeping = false;
    const small = document.createElement('canvas'); small.width = small.height = 512; small.getContext('2d').drawImage(canvas, 0, 0, 512, 512);
    this.tex = new THREE.CanvasTexture(small); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.obj = new THREE.Group(); this.inner = new THREE.Group(); this.obj.add(this.inner);
    const mat = new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); this.mesh.position.y = 0.5; this.mesh.castShadow = true; this.inner.add(this.mesh);
    // 厚み（うしろに少しずらして重ねる）
    for (let i = 1; i <= 3; i++) { const m2 = new THREE.Mesh(this.mesh.geometry, new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, alphaTest: 0.3, color: 0x999999 })); m2.position.set(0, 0.5, -0.012 * i); m2.rotation.y = Math.PI; this.inner.add(m2); }
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.2, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; this.obj.add(sh);
    this.inner.scale.setScalar(this.size); this.t = Math.random() * 10; this.target = null;
    this.wings = data.wings || 0; this.legs = data.legs || 0; this.shape = data.shape || 0; this.buildParts(); this.magic = 0; if (data.magic) this.setMagic(data.magic, true); this.fav = data.fav || null;
  }
  avgColor() { const d = this.tex.image.getContext('2d').getImageData(0, 0, 512, 512).data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 64) if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } return n ? new THREE.Color(r / n / 255, g / n / 255, b / n / 255) : new THREE.Color(0.8, 0.8, 0.8); }
  buildParts() {
    if (this.parts) this.inner.remove(this.parts);
    const P = new THREE.Group(); this.parts = P; this.inner.add(P); this.wingM = []; this.legM = [];
    const col = this.avgColor();
    if (this.wings) { const wm = new THREE.MeshLambertMaterial({ color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.55), side: THREE.DoubleSide, transparent: true, opacity: 0.9 }); for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.22, 0.62, -0.06); const m = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), wm); m.scale.set(1, 0.6, 1); m.position.x = s * 0.24; piv.add(m); P.add(piv); this.wingM.push(piv); } }
    if (this.legs) { const lm = new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(0.7) }); const n = this.legs; for (let i = 0; i < n; i++) { const piv = new THREE.Group(); const x = ((i % (n / 2)) / Math.max(1, n / 2 - 1) - 0.5) * 0.36 * (n > 2 ? 1 : 0.8); piv.position.set(n === 2 ? (i ? 0.1 : -0.1) : x, 0.16, i < n / 2 ? 0.05 : -0.05); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.18, 6), lm); m.position.y = -0.09; piv.add(m); P.add(piv); this.legM.push(piv); } this.mesh.position.y = 0.62; this.inner.children.forEach((c) => { if (c.isMesh && c !== this.mesh && c.geometry === this.mesh.geometry) c.position.y = 0.62; }); }
    else { this.mesh.position.y = 0.5; this.inner.children.forEach((c) => { if (c.isMesh && c !== this.mesh && c.geometry === this.mesh.geometry) c.position.y = 0.5; }); }
    if (this.wings) this.move = 1; else if (this.legs) this.move = 2;
    const [sx, sy] = [[1, 1], [0.72, 1.3], [1.25, 0.85], [1.45, 0.62]][this.shape || 0];
    this.inner.children.forEach((c) => { if (c.isMesh && c.geometry === this.mesh.geometry) { c.scale.set(sx, sy, 1); c.position.y = (this.legs ? 0.62 : 0.5) * sy + (this.legs ? 0.12 : 0) * (1 - sy); } });
  }
  refresh() { this._draw = null; const c = this.tex.image.getContext('2d'); c.clearRect(0, 0, 512, 512); c.drawImage(this.canvas, 0, 0, 512, 512); this.tex.needsUpdate = true; this.inner.scale.setScalar(this.size); this.buildParts(); }
  setMagic(k, quiet) {
    if (this.magicG) { this.obj.remove(this.magicG); this.magicG = null; }
    this.magic = k; const mm = this.mesh.material; mm.color.setRGB(1, 1, 1); mm.emissive && mm.emissive.setRGB(0, 0, 0);
    if (k) { const M = new THREE.Group(); this.magicG = M; this.obj.add(M);
      if (k === 1) { const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }); for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.04, 10, 8), cm); const a = (i / 6) * 6.28; s.position.set(Math.cos(a) * 0.28, 0.1, Math.sin(a) * 0.2); s.scale.y = 0.6; M.add(s); } }
      if (k === 4 || k === 5) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); drawIcon(g, k === 4 ? '🌟' : '⭐', 32, 32, 56, () => (t.needsUpdate = true)); const sm = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }); for (let i = 0; i < (k === 4 ? 4 : 8); i++) { const sp = new THREE.Sprite(sm); sp.scale.setScalar(k === 4 ? 0.26 : 0.16); M.add(sp); } if (k === 4) { mm.color.setRGB(1, 0.86, 0.35); mm.emissive && mm.emissive.setRGB(0.35, 0.25, 0.02); } else { mm.color.setRGB(0.45, 0.5, 0.95); mm.emissive && mm.emissive.setRGB(0.05, 0.05, 0.2); } }
      if (k === 2) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); drawIcon(g, '✨', 32, 32, 58, () => (t.needsUpdate = true)); const sm = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }); for (let i = 0; i < 6; i++) { const sp = new THREE.Sprite(sm); sp.scale.setScalar(0.22); M.add(sp); } mm.emissive && mm.emissive.setRGB(0.18, 0.16, 0.05); }
      if (k === 3) { [0xff5a5a, 0xffb43a, 0xffee5a, 0x6ad86a, 0x5aa8ff, 0xa87aff].forEach((col, i) => { const tr = new THREE.Mesh(new THREE.TorusGeometry(0.62 - i * 0.05, 0.022, 6, 24, Math.PI), new THREE.MeshBasicMaterial({ color: col })); tr.position.set(0, 0.55, -0.12); M.add(tr); }); }
    }
    if (!quiet) { this.say(['もとに もどった！', '☁️ ふわふわ〜ん', '✨ キラーン☆', '🌈 にじにじ〜', '🌟 ピッカピカ〜！', '🌌 よぞらの まほう…'][k], 3); this.doTrick(k === 1 ? 'jump' : 'spin'); }
  }
  toJSON() { return { uid: this.uid, fav: this.fav || null, magic: this.magic || 0, name: this.name, owner: this.owner, move: this.move, size: this.size, wings: this.wings, legs: this.legs, shape: this.shape, x: this.p.x, y: this.p.y, z: this.p.z, pers: this.pers, tricks: this.tricks, love: this.love }; }
  say(t, s = 2.5) { this.bubbleText = t; this.bubbleT = s; }
  doTrick(k) { this.trick = k; this.trickT = 2; }
  update(dt, G, cam) {
    this.t += dt; if (this.bubbleT > 0) this.bubbleT -= dt; if (this.trickT > 0) this.trickT -= dt; else this.trick = null;
    const o = this.owner != null ? G.byUid(this.owner) : null;
    let tx = this.p.x, tz = this.p.z;
    const night = G.hour >= 21 || G.hour < 6;
    const wantSleep = (o && o.state === 'sleep') || (!o && night) || (this.pers === 2 && !night && (Math.floor(this.t / 40) % 4 === 0));
    if (wantSleep !== this.sleeping) { this.sleeping = wantSleep; if (wantSleep) { this.say('💤', 3); if (night) { const b = G.findNear(o ? o.p : this.p, (d) => d.model === 'petbed', 16); this.bedAt = b; } else this.bedAt = null; } else this.say(this.pers === 0 ? '⚡ おきた！' : '…ふわぁ', 2); }
    if (this.sleeping && Math.random() < dt * 0.25) this.say('💤', 2);
    if (o && !this.sleeping && o.mode === 'eat' && Math.random() < dt * (this.pers === 3 ? 0.6 : 0.2)) this.say(this.pers === 3 ? '🍖 ちょうだい！' : '🍖 もぐもぐ', 2);
    if (o && !this.sleeping && (o.mode === 'dance' || o.mode === 'cheer') && !this.trick) this.doTrick('spin');
    if (!this.sleeping && Math.random() < dt * 0.02) this.say(rnd(this.pers === 1 ? ['💕', 'すりすり'] : this.pers === 0 ? ['⚡', 'わんわん！', '♪'] : ['♪', '…']), 2);
    if (!this.sleeping && !this.trick && Math.random() < dt * 0.05) { const o2 = G.pets.find((q) => q !== this && !q.sleeping && Math.hypot(q.p.x - this.p.x, q.p.z - this.p.z) < 5); if (o2) { this.doTrick('spin'); o2.doTrick('jump'); this.say('♪', 1.5); o2.say('♪', 1.5); this.love += 1; } }
    if (!this.sleeping && Math.random() < dt * 0.004) { const fx = Math.floor(this.p.x), fy = Math.floor(this.p.y), fz = Math.floor(this.p.z); for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const id = G.world.get(fx + dx, fy, fz + dz); if (id && G.flowerIds.includes(id)) { G.world.set(fx + dx, fy, fz + dz, 0); this.say('🐾 ほりほり… えへ', 2.5); break; } } }
    const cf = this.comfort, cr = cf && G.byUid(cf.uid); if (cf) { cf.t -= dt; if (cf.t <= 0 || !cr || this.sleeping) this.comfort = null; }
    const fv = !this.comfort && this.fav && (!o || o.state === 'sleep' || Math.hypot(o.p.x - this.p.x, o.p.z - this.p.z) > 30) ? G.byUid(this.fav) : null;
    if (this.comfort && cr) { tx = cf.hold ? this.p.x : cr.p.x + Math.sin(cr.yaw) * 0.75; tz = cf.hold ? this.p.z : cr.p.z + Math.cos(cr.yaw) * 0.75; if (!cf.done && Math.hypot(cr.p.x - this.p.x, cr.p.z - this.p.z) < 1.4) G.onPetArrive && G.onPetArrive(this, cr); }
    else if (fv && fv.state !== 'sleep') { const d = Math.hypot(fv.p.x - this.p.x, fv.p.z - this.p.z); if (d > 2) { tx = fv.p.x - 1; tz = fv.p.z; } }
    else if (this.sleeping && this.bedAt) { tx = this.bedAt[0] + 0.5; tz = this.bedAt[2] + 0.5; }
    else if (this.sleeping) { tx = this.p.x; tz = this.p.z; }
    else if (o) { const d = Math.hypot(o.p.x - this.p.x, o.p.z - this.p.z); if (d > (this.pers === 1 ? 1.4 : 2.2)) { tx = o.p.x - Math.sin(o.yaw) * 1.2 + Math.cos(this.t) * 0.3; tz = o.p.z - Math.cos(o.yaw) * 1.2; } if (d > 25) { this.p.x = o.p.x; this.p.z = o.p.z; this.p.y = o.p.y + 1; } }
    else { if (!this.target || Math.random() < dt * 0.1) this.target = [G.center.x + (Math.random() - 0.5) * 16, G.center.z + (Math.random() - 0.5) * 16]; [tx, tz] = this.target; }
    const dx = tx - this.p.x, dz = tz - this.p.z, d = Math.hypot(dx, dz);
    const sp = (this.move === 1 ? 2.4 : 3.2) * Math.min(1, d / 1.5);
    if (d > 0.3) { G.world.move(this.p, (dx / d) * sp * dt, 0, (dz / d) * sp * dt, 0.2, 0.6, true); this.moving = true; } else this.moving = false;
    if (this.move !== 1) { this.p.vy -= 22 * dt; G.world.move(this.p, 0, this.p.vy * dt, 0, 0.2, 0.6, false); }
    else { const gy = G.world.top(Math.floor(this.p.x), Math.floor(this.p.z)) + 1; this.p.y += (gy + 0.6 - this.p.y) * Math.min(1, dt * 3); }
    this.obj.position.set(this.p.x, this.p.y, this.p.z);
    // カメラを向く（Y軸のみ）
    this.obj.rotation.y = Math.atan2(cam.position.x - this.p.x, cam.position.z - this.p.z);
    const m = this.mesh, t = this.t;
    this.inner.position.y = 0; this.inner.rotation.z = 0; this.inner.scale.set(this.size, this.size, this.size);
    if (this.move === 0) { const h = Math.abs(Math.sin(t * (this.moving ? 9 : 3))) * (this.moving ? 0.35 : 0.08); this.inner.position.y = h; this.inner.scale.y = this.size * (h < 0.03 ? 0.85 : 1.05); }
    if (this.move === 1) { this.inner.position.y = Math.sin(t * 2) * 0.12; this.inner.rotation.z = Math.sin(t * 1.3) * 0.08; }
    if (this.move === 2) { this.inner.rotation.z = Math.sin(t * (this.moving ? 12 : 3)) * (this.moving ? 0.15 : 0.04); }
    if (this.move === 3) { this.inner.scale.x = this.size * (1 + Math.sin(t * 6) * 0.12); this.inner.rotation.z = Math.sin(t * 6) * 0.1; }
    this.wingM.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * (this.moving ? 18 : 8)) * 0.6)));
    this.legM.forEach((l, i) => (l.rotation.x = this.moving ? Math.sin(t * 14 + i * Math.PI) * 0.7 : 0));
    if (this.blanket && !this.blanketM) { this.blanketM = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0xff9ab8 })); this.blanketM.position.y = 0.32; this.obj.add(this.blanketM); } if (this.blanketM) { this.blanketM.visible = !!(this.sleeping && this.blanket); if (!this.sleeping) this.blanket = false; this.blanketM.scale.setScalar(this.size); }
    if (this.sleeping) { this.inner.position.y = 0; this.inner.rotation.z = 1.3; this.inner.scale.set(this.size, this.size * (0.95 + Math.sin(t * 2) * 0.04), this.size); }
    if (this.trick === 'spin') this.inner.rotation.y = (2 - this.trickT) * Math.PI * 2; else this.inner.rotation.y = 0;
    if (this.trick === 'jump') this.inner.position.y = Math.sin((2 - this.trickT) * Math.PI) * 1.2;
    if (this.trick === 'sit') this.inner.scale.y = this.size * 0.8;
    if (this.magic && this.magicG) { const M = this.magicG, k = this.magic;
      if (k === 1) { if (!this.sleeping) this.inner.position.y += 0.28 + Math.sin(t * 1.5) * 0.06; M.position.y = this.inner.position.y - 0.05; M.rotation.y = t * 0.3; }
      if (k === 4 || k === 5) M.children.forEach((sp, i) => { const a = t * (k === 4 ? 2.4 : 0.8) + (i / M.children.length) * 6.28; sp.position.set(Math.cos(a) * 0.5 * this.size, (k === 4 ? 1.05 : 0.5 + Math.sin(a * 2) * 0.35) * this.size, Math.sin(a) * 0.3); sp.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + i)); });
      if (k === 2) M.children.forEach((sp, i) => { const a = t * 1.6 + (i / M.children.length) * 6.28; sp.position.set(Math.cos(a) * 0.55 * this.size, 0.4 + Math.sin(t * 3 + i) * 0.25, Math.sin(a) * 0.3); sp.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * 4 + i)); });
      if (k === 3) { this.mesh.material.color.setHSL((t * 0.15) % 1, 0.7, 0.8); M.position.y = this.inner.position.y; M.scale.setScalar(this.size); }
      if (!this.sleeping && Math.random() < dt * 0.03) { this.say(['', rnd(['ふわ〜', '☁️ ぷかぷか']), rnd(['✨ キラキラ', '☆ ピカッ']), rnd(['🌈 にじにじ', '🌈 なないろ〜']), rnd(['🌟 キンキラ！', '👑 ゴージャス〜']), rnd(['🌌 キラリ…', '⭐ ほしが きれい'])][k], 2); if (k === 3) this.doTrick('spin'); }
    }
  }
}
