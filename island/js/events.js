// しまの イベント（ごはん・たんじょうび・ステージ・べんきょうかい・あそび）
import { B, USE } from './blocks.js';
import { standable } from './life.js';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const done = {};
const once = (k) => { if (done[k]) return false; done[k] = 1; return true; };
export function gather(G, x, y, z, opt) {
  const list = G.residents.filter((r) => !r.controlled && r.state !== 'sleep' && r.state !== 'mini' && !r.inviting);
  let i = 0;
  for (const r of list) {
    const a = (i++ / list.length) * Math.PI * 2, rad = opt.rad || 2.5;
    let tx = Math.floor(x + Math.cos(a) * rad), tz = Math.floor(z + Math.sin(a) * rad), ty = y;
    for (let k = 0; k < 4 && !standable(G.world, tx, ty, tz); k++) ty = G.world.top(tx, tz) + 1;
    if (r.goTo(G, tx, ty, tz)) { r.state = 'goevent'; r.evMode = opt.mode; r.evT = opt.t; r.evSay = opt.say && opt.say(r); r.evFace = [x + 0.5, z + 0.5]; r.use = null; }
  }
  return list;
}
export function eventsTick(G, dt) {
  const d = G.day, h = G.hour;
  if (h >= 5 && once(`decay${d}`)) for (const r of G.residents) for (const k in r.rel) if (r.rel[k] > 20 && r.rel[k] < 95) r.rel[k] -= 2;
  // たんじょうび
  const bd = G.residents.filter((r) => ((d - 1) % 14) + 1 === (r.f.birthday || 0));
  for (const r of bd) {
    if (h >= 8 && once(`bdn${d}${r.uid}`)) { G.news(`🎂 きょうは ${r.name}の たんじょうび！`); r.say('きょうは わたしの たんじょうび！', 4); r.log('たんじょうび 🎂'); }
    if (h >= 15 && once(`bdp${d}${r.uid}`)) { G.party = { x: r.p.x, y: r.p.y, z: r.p.z, t: 35, who: r }; G.news(`🎉 ${r.name}の たんじょうびパーティー！ みんな あつまれ！`); G.watchPrompt && G.watchPrompt(r, `${r.name}の たんじょうびパーティー`, 20); gather(G, r.p.x, Math.round(r.p.y), r.p.z, { mode: 'cheer', t: 10, rad: 2.4, say: (o) => (o === r ? 'みんな ありがとう！' : `${r.name}、おめでとう！ 🎂`) }); G.residents.forEach((o) => o !== r && o.addRel(r, 6, G)); r.addExp(40, G);
      G.residents.filter((o) => o.bdGift && o.bdGift.to === r.uid).forEach((o, i) => { const g = o.bdGift; o.bdGift = null; setTimeout(() => { o.say(`${r.name}、おめでとう！ ${g.e} どうぞ！`, 3.5, 'joy'); setTimeout(() => r.say(g.good ? `${g.e}！ だいすきな もの！ ありがとう！！` : 'わあ、ありがとう！', 3.5, g.good ? 'joy' : ''), 1800); o.addRel(r, g.good ? 20 : 10, G); if (g.good) G.news(`🎁 ${o.name}の プレゼント「${g.e}」に ${r.name}が おおよろこび！`); }, 4000 + i * 3000); }); setTimeout(() => G.photo && G.photo([r, ...G.residents.filter((o) => o !== r && o.dist(r) < 5).slice(0, 3)], `${r.name}の たんじょうび`), 7000); }
  }
  // ごはん
  for (const mh of [12, 18]) if (h >= mh && h < mh + 1 && once(`meal${d}${mh}`)) {
    const t = G.findUse(G.center, 40, ['dine']);
    if (t) { G.news(mh === 12 ? '🍽️ おひるごはんの じかん！ みんなで たべよう' : '🍽️ ばんごはんの じかん！'); gather(G, t[0], t[1], t[2], { mode: 'eat', t: 9, rad: 1.6, say: () => rnd(['いただきまーす！', 'おいしそう！', 'もぐもぐ']) }); G.residents.forEach((r) => (r.hunger = Math.max(0, r.hunger - 40))); pairUp(G, 3); }
    else if (mh === 12) { G.news('🧺 ひろばで ピクニック！（テーブルを おくと みんなで ごはんを たべるよ）'); gather(G, G.center.x, 23, G.center.z, { mode: 'eat', t: 8, rad: 3.5, say: () => '🍙 ピクニック！' }); G.residents.forEach((r) => (r.hunger = Math.max(0, r.hunger - 30))); pairUp(G, 2); }
  }
  // べんきょうかい
  if (h >= 10 && h < 11 && once(`study${d}`)) {
    const t = G.findUse(G.center, 40, ['study']);
    if (t) { G.news('📚 べんきょうかい！ いまから 11じまで もんだいの ごほうびが 2ばい'); G.studyBonus = d; gather(G, t[0], t[1], t[2], { mode: 'walk', t: 12, rad: 2, say: () => rnd(['✏️ がんばるぞ', 'せんせい、しつもん！', 'わかった！']) }); }
  }
  if (G.studyBonus === d && h >= 11) G.studyBonus = null;
  // ステージショー
  if (h >= 19 && h < 20 && once(`stage${d}`)) {
    const t = G.findUse(G.center, 40, ['stage']);
    if (t) { const cand = G.residents.filter((r) => !r.controlled); const star = cand.find((r) => (r.f.talent === 0 || r.f.talent === 5) && Math.random() < 0.7) || rnd(cand); if (star) { G.news(`🎤 ${star.name}の ステージショー！`); gather(G, t[0], t[1], t[2], { mode: 'cheer', t: 10, rad: 3.5, say: () => rnd(['すてき〜！', 'アンコール！', '👏👏']) }); if (star.goTo(G, t[0], t[1] + 1, t[2])) { star.state = 'goevent'; star.evMode = 'dance'; star.evT = 12; star.evSay = '🎤 ラララ〜♪'; star.evFace = [G.cam.position.x, G.cam.position.z]; } star.addExp(20, G); star.log('ステージで うたった 🎤'); } }
  }
  // あそび（14じ）
  if (h >= 14 && h < 15 && once(`play${d}`)) {
    const game = rnd(['おにごっこ', 'かくれんぼ', 'だるまさんがころんだ']); G.news(`🏃 みんなで ${game}！`);
    const list = G.residents.filter((r) => !r.controlled && r.state !== 'sleep' && r.state !== 'mini'); const oni = rnd(list);
    for (const r of list) { r.state = 'idle'; r.timer = 0; r.say(r === oni ? (game === 'かくれんぼ' ? 'もういいかい？' : rnd(['まてまて〜！', 'つかまえるぞ〜！', 'いくよ〜！'])) : game === 'かくれんぼ' ? rnd(['まーだだよ！', 'どこに かくれよう…', 'しーっ']) : rnd(['にげろ〜！', 'きゃー！', 'つかまらないよ〜', 'こっちだよ〜！']), 3); }
    pairUp(G, 4);
  }
  // ケーキ
  if (G.cakeAt && once('cake' + G.cakeAt.join(','))) { const [x, y, z] = G.cakeAt; G.news('🎂 ケーキだ！ みんなで たべよう'); gather(G, x, y, z, { mode: 'cheer', t: 8, rad: 2, say: () => rnd(['ケーキ！', 'わーい！', 'あまーい！']) }); pairUp(G, 3); G.cakeAt = null; }
}
function pairUp(G, n) { n = Math.min(n, 1.5); const L = G.residents; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (L[i].dist(L[j]) < 12) L[i].addRel(L[j], n, G); }

// ---------- ミニドラマ（じけんと オチ）
// step: [びょう, だれ(a/b/c/pet/all), せりふ, きもち]
const P = (r) => r.f.personality;
const DRAMAS = [
  { key: 'cake', need: 'pet', title: (A) => `🎂 ケーキじけん！ はんにんは ペットの ${A.pet.name}！`, steps: (A) => [
    [0, 'a', 'あれ！？ ケーキが ない！', 'surprise'], [2.2, 'b', 'わたしじゃ ないよ〜！', 'sad'], [4.2, 'c', 'あやしい…', 'angry'],
    [6.4, 'pet', '🐾 もぐもぐ… 🍰'], [8, 'a', `${A.pet.name}だったー！`, 'surprise'], [9.6, 'all', 'あはははは！', 'joy']] },
  { key: 'rumor', title: (A) => `🤫 ${A.c.name}の うわさが しまじゅうに…！`, steps: (A) => [
    [0, 'a', `🤫 ${A.c.name}って、${A.food}が だいすき なんだって`, ''], [2.6, 'b', 'えー！ ほんと！？', 'surprise'], [5, 'b', `ねえ ${A.c.name}、${A.food} すきなの？`, ''],
    [7.4, 'c', 'えっ！？ なんで しってるの！？', 'surprise'], [9.6, 'c', P(A.c) === 6 ? 'はずかしい〜…' : P(A.c) === 0 ? 'そうだよ！ だいだいすき！' : 'まあね、ふふふ', P(A.c) === 6 ? 'sad' : 'joy']] },
  { key: 'lost', title: (A) => `🧢 ${A.a.name}の おとしもの、${A.b.name}が みつけた！`, steps: (A) => [
    [0, 'a', 'たいへん！ だいじな ものを なくしちゃった…', 'sad'], [2.6, 'b', 'いっしょに さがそう！', ''], [5.5, 'b', 'あった！ みつけたよ！', 'joy'], [7.6, 'a', 'ありがとう！！ だいすき！', 'joy']], rel: 14 },
  { key: 'surprise', title: (A) => `🎉 ${A.b.name}たちが ${A.a.name}に サプライズ！`, steps: (A) => [
    [0, 'b', `🤫 ${A.a.name}に ないしょで…`, ''], [2.2, 'c', 'うんうん、まかせて！', ''], [4.6, 'b', '🎉 サプライズ〜！！', 'joy'], [4.8, 'c', '🎉 いつも ありがとう！', 'joy'], [6.6, 'a', 'えーっ！？ うれしい！！', 'surprise'], [8.6, 'a', 'みんな だいすき！', 'joy']], rel: 12 },
  { key: 'dream', title: (A) => `💭 ${A.a.name}の へんな ゆめの はなし`, steps: (A) => [
    [0, 'a', `きのう ${A.b.name}が ${rnd(['ケーキ', 'ねこ', 'ロケット', 'おばけ'])}に なる ゆめ みた！`, ''], [2.8, 'b', 'なにそれ〜！', 'surprise'], [4.8, 'all', 'あはは！', 'joy']], rel: 6 },
  { key: 'prank', need: 'prankster', title: (A) => `😜 ${A.a.name}の いたずらに ${A.b.name}が びっくり！`, steps: (A) => [
    [0, 'a', '（そ〜っと…）', ''], [2, 'a', 'わっ！！', 'joy'], [2.4, 'b', 'ひゃああっ！', 'surprise'],
    [4.4, 'b', P(A.b) === 6 || P(A.b) === 4 ? 'こわかった… ぐすん' : 'もー！ びっくりしたぁ！', P(A.b) === 6 || P(A.b) === 4 ? 'sad' : 'angry'], [6.6, 'a', 'ごめんごめん！', 'sad'], [8.2, 'b', 'もう…ゆるして あげる！', 'joy']], rel: 4 },
  { key: 'mimic', title: (A) => `🎭 ${A.a.name}が ${A.b.name}の ものまね！`, steps: (A) => [
    [0, 'a', `${A.b.name}の まね！「${rnd(A.b.pers.talk)}」`, 'joy'], [2.8, 'b', 'にてる〜！', 'surprise'], [4.6, 'c', 'そっくり！ あはは', 'joy']], rel: 8 },
  { key: 'lostpet', need: 'pet', title: (A) => `🐾 ${A.pet.name}が まいごに！ みんなで みつけた`, steps: (A) => [
    [0, 'owner', `${A.pet.name}が いない…！`, 'sad'], [2.4, 'b', 'みんなで さがそう！', ''], [2.5, 'hide'], [6, 'c', 'いたー！ おはなばたけに いたよ！', 'joy'], [6.1, 'find'], [8, 'owner', 'よかったぁ… もう はなれないでね', 'joy']], rel: 10 },
  { key: 'petgift', need: 'pet', title: (A) => `🐚 ${A.pet.name}が ${A.owner.name}に プレゼント`, steps: (A) => [
    [0, 'pet', `🐾 ${rnd(['🐚', '🌸', '🍀', '💎'])} どうぞ`], [2, 'owner', 'わあ！ くれるの！？', 'surprise'], [4, 'owner', 'ありがとう！ たからものに するね', 'joy']] },
  { key: 'song', title: (A) => `🎵 ${A.a.name}の うたの れんしゅう`, steps: (A) => [
    [0, 'a', A.a.f.talent === 0 ? '🎵 ラ〜ラ〜♪（きれいな こえ）' : '🎵 ラ〜ラ〜♪（はずれ）', 'joy'], [2.6, 'b', '……', 'surprise'], [4.4, 'b', A.a.f.talent === 0 ? 'じょうず〜！ プロみたい！' : P(A.b) === 2 ? 'もうすこし れんしゅう しよう！' : 'げんきが でる うただね！', A.a.f.talent === 0 ? 'surprise' : 'joy'], [6.4, 'a', 'えへへ！', 'joy']], rel: 6 },
  { key: 'race', title: (A) => `🏃 ${A.a.name}と ${A.b.name}の かけっこ！ かったのは ${A.win.name}`, steps: (A) => [
    [0, 'a', `${A.b.name}、かけっこ しよう！`, ''], [1.8, 'b', 'まけないよ！', 'joy'], [3.4, 'a', 'よーい… ドン！', ''], [3.5, 'run'],
    [8, 'win', 'やったー！ かった！', 'joy'], [8.6, 'lose', 'くやしい〜！ もう1かい！', 'sad']], rel: 8 },
  { key: 'cook', title: (A) => `🍳 ${A.a.name}が みんなに ${A.food}を つくった`, steps: (A) => [
    [0, 'a', `${A.food}を つくって みたよ！`, 'joy'], [2.4, 'b', 'いただきます！', ''], [4.4, 'b', A.a.f.talent === 2 ? 'おいしすぎる！ おみせ ひらけるよ！' : P(A.a) === 5 ? 'からーい！！ いたずらでしょ！' : A.a.f.weak === 2 ? 'こ、こげてる…！' : 'おいしい〜！', P(A.a) === 5 || A.a.f.weak === 2 ? 'surprise' : 'joy'], [6.4, 'c', 'おかわり！', 'joy']], rel: 8 },
];
export function dramaTick(G, dt) {
  if (G.drama) {
    const D = G.drama; D.t += dt;
    while (D.i < D.steps.length && D.steps[D.i][0] <= D.t) { runStep(G, D, D.steps[D.i]); D.i++; }
    if (D.i >= D.steps.length && D.t > D.steps[D.steps.length - 1][0] + 2) { G.drama = null; }
    return;
  }
  G.dramaCD = (G.dramaCD ?? 30) - dt;
  if (G.dramaCD > 0 || G.hour < 7 || G.hour >= 21) return;
  G.dramaCD = 45 + Math.random() * 50;
  startDrama(G);
}
export function startDrama(G, key) {
  const awake = G.residents.filter((r) => !r.controlled && r.state !== 'sleep' && r.state !== 'goevent' && r.state !== 'event' && r.state !== 'mini' && !r.inviting);
  if (awake.length < 3) return false;
  const pets = G.pets.filter((p) => !p.sleeping && p.owner != null && G.byUid(p.owner));
  let pool = DRAMAS.filter((d) => (!d.need || (d.need === 'pet' && pets.length) || (d.need === 'prankster' && awake.some((r) => P(r) === 5))));
  if (key) pool = pool.filter((d) => d.key === key);
  if (!pool.length) return false;
  const d = rnd(pool);
  const sh = [...awake].sort(() => Math.random() - 0.5);
  let a = G.pickFair ? G.pickFair(sh) : sh[0]; sh.splice(sh.indexOf(a), 1); sh.unshift(a);
  if (d.need === 'prankster') a = awake.find((r) => P(r) === 5);
  const pet = d.need === 'pet' ? rnd(pets) : null, owner = pet ? G.byUid(pet.owner) : null;
  if (owner) a = owner;
  const others = sh.filter((r) => r !== a);
  // ちかくの 2人を あつめる
  let b = others[0], c = others[1], coop = false;
  if (d.key === 'lostpet') { for (const x of others) { const y = others.find((q) => q !== x && x.rtype[q.uid] === 'dislike'); if (y) { b = x; c = y; coop = true; break; } } }
  const A = { a, b, c, pet, owner, coop, food: rnd(['カレー', 'ケーキ', 'おにぎり', 'ラーメン', 'プリン']) };
  const spd = (r) => r.pers.speed + (r.f.talent === 3 ? 0.6 : 0) - (r.f.weak === 3 ? 0.4 : 0); A.win = spd(a) >= spd(b) ? (Math.random() < 0.75 ? a : b) : (Math.random() < 0.75 ? b : a); A.lose = A.win === a ? b : a;
  for (const r of [b, c]) { const ang = Math.random() * 6.28; const tx = a.p.x + Math.cos(ang) * 1.6, tz = a.p.z + Math.sin(ang) * 1.6; if (r.goTo(G, tx, a.p.y, tz)) { r.state = 'goevent'; r.evMode = 'walk'; r.evT = 14; r.evSay = null; r.evFace = [a.p.x, a.p.z]; } }
  a.path = null; a.state = 'event'; a.timer = 16; a.evMode = 'walk'; a.evFace = null;
  G.drama = { d, A, steps: d.steps(A).map((s) => [s[0] + 3, ...s.slice(1)]), t: 0, i: 0 };
  G.watchPrompt && G.watchPrompt(a, d.title(A).replace(/！.*$/, '').slice(0, 16), 18);
  return true;
}
function runStep(G, D, [t, who, text, kind]) {
  const A = D.A;
  if (who === 'hide') { if (A.pet) { A.pet.p.x += 12; A.pet.p.z += 6; A.pet.p.y = G.world.top(Math.floor(A.pet.p.x), Math.floor(A.pet.p.z)) + 1; } return; }
  if (who === 'find') { if (A.pet && A.owner) { A.pet.p.x = A.owner.p.x + 1; A.pet.p.z = A.owner.p.z; A.pet.p.y = A.owner.p.y + 0.5; A.pet.doTrick('jump'); } return; }
  if (who === 'run') { const ang = Math.random() * 6.28; for (const r of [A.a, A.b]) { const tx = r.p.x + Math.cos(ang) * 10, tz = r.p.z + Math.sin(ang) * 10; if (r.goTo(G, tx, G.world.top(Math.floor(tx), Math.floor(tz)) + 1, tz)) { r.state = 'goevent'; r.evMode = 'walk'; r.evT = 5; r.evSay = null; } } return; }
  const list = who === 'all' ? [A.a, A.b, A.c] : [{ a: A.a, b: A.b, c: A.c, owner: A.owner || A.a, win: A.win, lose: A.lose }[who]];
  if (who === 'pet') { A.pet && A.pet.say(text, 3); A.pet && A.pet.doTrick('jump'); return; }
  for (const r of list) if (r) { r.say(who === 'all' && /あはは/.test(text) ? r.laughText : text, 2.8, kind || ''); if (r.state === 'event') r.timer = Math.max(r.timer, 3); }
  if (D.i === D.steps.length - 1) {
    const title = D.d.title(A); G.news(title);
    const short = title.replace(/^\S+\s/, '').slice(0, 14);
    for (const r of [A.a, A.b, A.c]) if (r) { r.log(title.replace(/^\S+\s/, '')); for (const o of [A.a, A.b, A.c]) if (o && o !== r) r.remember('event', o.uid, short); }
    if (A.coop) { delete A.b.rtype[A.c.uid]; delete A.c.rtype[A.b.uid]; A.b.addRel(A.c, 25, G); setTimeout(() => { A.b.say(`${A.c.name}、いっしょに みつけたね！`, 3, 'joy'); A.c.say('うん！ これから なかよく しよう', 3, 'joy'); G.news(`🤝 にがてだった ${A.b.name}と ${A.c.name}が ペットを たすけて なかよしに！`); G.photo && G.photo([A.b, A.c], `${A.b.name}と ${A.c.name}、なかよしに`); }, 1500); }
    if (D.d.rel) { A.a.addRel(A.b, D.d.rel, G); A.a.addRel(A.c, D.d.rel / 2, G); A.b.addRel(A.c, D.d.rel / 2, G); }
    G.effect && G.effect('heart', A.a);
  }
}

// ---------- ばしょ（家具の くみあわせで きまる）
const near = (a, b, R) => a.some((p) => b.some((q) => Math.abs(p[0] - q[0]) <= R && Math.abs(p[2] - q[2]) <= R && Math.abs(p[1] - q[1]) <= 3));
let placeT = 2;
export function placesTick(G, dt) {
  placeT -= dt; if (placeT > 0) return; placeT = 15;
  const w = G.world, M = {}; const add = (k, c) => (M[k] || (M[k] = [])).push(c);
  for (let k = 0; k < w.ids.length; k++) { const id = w.ids[k]; if (!id) continue; const d = B[id]; if (d.shape !== 'model') continue; const c = [k % w.W, Math.floor(k / (w.W * w.D)), Math.floor(k / w.W) % w.D]; add(d.model, c); }
  const get = (...ks) => ks.flatMap((k) => M[k] || []);
  const P = {};
  if (near(get('blackboard'), get('schooldesk'), 8)) P.school = get('blackboard')[0];
  const tables = get('table', 'diningtable', 'roundtable'); if (near(tables, get('kitchen', 'stove', 'vending', 'fridge'), 8) && near(tables, get('chair', 'stool'), 3)) P.cafe = tables.find((t) => get('kitchen', 'stove', 'vending', 'fridge').some((q) => Math.abs(t[0] - q[0]) <= 8 && Math.abs(t[2] - q[2]) <= 8));
  const play = get('swing', 'slide', 'sandbox', 'fountain'); if (near(play, get('bench'), 10)) P.park = play[0];
  const sea = get('bench').filter((b) => { for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (B[w.get(b[0] + dx, b[1] - 1, b[2] + dz)]?.shape === 'water' || B[w.get(b[0] + dx, b[1], b[2] + dz)]?.shape === 'water') return true; return false; });
  if (sea.length) P.sunset = sea[0];
  G.bridges = get('bridge').concat(B.filter((d) => d.model === 'deck').length ? get('deck') : []).slice(0, 20);
  // おか（まわりより たかくて のぼれる ところ）
  const hills = []; for (let i = 0; i < 60; i++) { const x = 6 + Math.floor(Math.random() * (w.W - 12)), z = 6 + Math.floor(Math.random() * (w.D - 12)); const y = w.top(x, z); if (y < 24) continue; let lower = 0; for (const [dx, dz] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) if (w.top(x + dx, z + dz) <= y - 2) lower++; if (lower >= 3 && standable(w, x, y + 1, z)) hills.push([x, y + 1, z]); } if (hills.length) G.hills = hills.slice(0, 8);
  const NAMES = { school: '🏫 がっこう', cafe: '☕ カフェ', park: '🛝 こうえん', sunset: '🌅 ゆうひの ベンチ' };
  G.places = G.places || {}; G.placeSeen = G.placeSeen || {};
  for (const k in P) if (!G.placeSeen[k]) { G.placeSeen[k] = 1; G.news(`${NAMES[k]}が できた！ みんなが つかいはじめるよ`); }
  for (const k in G.places) if (!P[k]) delete G.places[k];
  Object.assign(G.places, P);
}
export function placeLifeTick(G, dt) {
  const d = G.day, h = G.hour, P = G.places || {};
  // カフェ：9〜17じ、ときどき
  G.cafeCD = (G.cafeCD ?? 20) - dt;
  if (P.cafe && h >= 9 && h < 17 && G.cafeCD <= 0 && !G.drama) {
    G.cafeCD = 70 + Math.random() * 60;
    const free = G.residents.filter((r) => !r.controlled && r.state !== 'sleep' && r.state !== 'event' && r.state !== 'goevent' && r.state !== 'mini');
    if (free.length >= 3) {
      const staff = free.find((r) => r.dream === 'cafe') || rnd(free); const cus = free.filter((r) => r !== staff).sort(() => Math.random() - 0.5).slice(0, 2);
      const [x, y, z] = P.cafe;
      if (staff.goTo(G, x + 2, y, z)) { staff.state = 'goevent'; staff.evMode = 'wave'; staff.evT = 12; staff.evSay = '☕ いらっしゃいませ！'; staff.evFace = [x + 0.5, z + 0.5]; }
      cus.forEach((r, i) => { if (r.goTo(G, x + (i ? -1 : 1), y, z + 1)) { r.state = 'goevent'; r.evMode = 'eat'; r.evT = 10; r.evSay = rnd(['☕ ココア ください', '🍰 ケーキ ください', '🥞 ホットケーキ！']); r.evFace = [x + 0.5, z + 0.5]; } staff.addRel(r, 5, G); });
      staff.cafeWork = (staff.cafeWork || 0) + 1; staff.log('カフェで はたらいた ☕');
    }
  }
  // ゆうひ
  if (P.sunset && h >= 17 && h < 18 && once(`sunset${d}`)) { const [x, y, z] = P.sunset; G.news('🌅 ゆうひが きれい… みんなで ながめよう'); gather(G, x, y, z, { mode: 'walk', t: 14, rad: 2.2, say: () => rnd(['ゆうひ きれい…', 'まっかだね', 'あしたも はれるかな']) }); }
  // こうえんで ピクニック（12じ・テーブルがないとき）
  if (P.park && h >= 13 && h < 14 && once(`park${d}`)) { const [x, y, z] = P.park; G.news('🛝 こうえんで あそぼう！'); gather(G, x, y, z, { mode: 'cheer', t: 10, rad: 3, say: () => rnd(['すべりだい！', 'ブランコ のりたい！', 'たのしい〜']) }); pairUp(G, 3); }
}

// ---------- ゆめ（住人の もくひょう）
const flowersNear = (G, p, R) => { let n = 0; const [fx, fy, fz] = p; for (let y = fy - 2; y <= fy + 3; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) if (G.flowerIds.includes(G.world.get(x, y, z))) n++; return n; };
const hasModel = (G, p, R, models) => { const [fx, fy, fz] = p; for (let y = fy - 2; y <= fy + 3; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) { const id = G.world.get(x, y, z); if (id && models.includes(B[id].model)) return true; } return false; };
export const DREAMS = {
  home: { t: 'じぶんの おうちに すみたい', ic: '🏠', ok: (G, r) => !!r.home, prog: (G, r) => (r.home ? 1 : 0) },
  flowers: { t: 'おはなが いっぱいの おにわが ほしい', ic: '🌷', ok: (G, r) => flowersNear(G, base(G, r), 6) >= 12, prog: (G, r) => Math.min(1, flowersNear(G, base(G, r), 6) / 12), hint: 'おうちの まわりに はなを 12こ' },
  pethouse: { t: 'ペットの おうちが ほしい', ic: '🐾', ok: (G, r) => G.pets.some((p) => p.owner === r.uid) && hasModel(G, base(G, r), 8, ['petbed', 'doghouse', 'cattower']), prog: (G, r) => (G.pets.some((p) => p.owner === r.uid) ? 0.5 : 0) + (hasModel(G, base(G, r), 8, ['petbed', 'doghouse', 'cattower']) ? 0.5 : 0), hint: 'ペットと ペットベッド・いぬごや' },
  pet: { t: 'ペットと くらしたい', ic: '🥚', ok: (G, r) => G.pets.some((p) => p.owner === r.uid), prog: (G, r) => (G.pets.some((p) => p.owner === r.uid) ? 1 : 0), hint: 'ペットを かいて あげよう' },
  bestie: { t: 'しんゆうが ほしい', ic: '💞', ok: (G, r) => Object.values(r.rel).some((v) => v >= 95), prog: (G, r) => Math.max(0, ...Object.values(r.rel)) / 95 },
  concert: { t: 'ともだちと えんそうかいを したい', ic: '🎹', ok: (G, r) => hasModel(G, base(G, r), 30, ['piano']) && Object.values(r.rel).filter((v) => v >= 45).length >= 2, prog: (G, r) => (hasModel(G, base(G, r), 30, ['piano']) ? 0.5 : 0) + Math.min(2, Object.values(r.rel).filter((v) => v >= 45).length) / 4, hint: 'ピアノと ともだち2にん' },
  stage: { t: 'ステージで うたいたい', ic: '🎤', ok: (G, r) => hasModel(G, base(G, r), 40, ['stage']), prog: (G, r) => (hasModel(G, base(G, r), 40, ['stage']) ? 1 : 0), hint: 'ステージを おこう' },
  cafe: { t: 'カフェで はたらきたい', ic: '☕', ok: (G, r) => (r.cafeWork || 0) >= 2, prog: (G, r) => (G.places?.cafe ? 0.5 : 0) + Math.min(2, r.cafeWork || 0) / 4, hint: 'テーブル・いす・キッチンを ちかくに' },
  books: { t: 'ほんを 5さつ よみたい', ic: '📚', ok: (G, r) => r.reads >= 5, prog: (G, r) => Math.min(1, r.reads / 5), hint: 'ほんだなを おこう' },
  park: { t: 'みんなで あそべる こうえんが ほしい', ic: '🛝', ok: (G) => !!G.places?.park, prog: (G) => (G.places?.park ? 1 : 0), hint: 'ブランコや すべりだいと ベンチ' },
};
const PREF = [['park', 'stage', 'bestie'], ['flowers', 'books', 'home'], ['books', 'cafe', 'home'], ['concert', 'flowers', 'pet'], ['pet', 'bestie', 'pethouse'], ['stage', 'park', 'pet'], ['flowers', 'books', 'pethouse']];
function base(G, r) { return r.home || [Math.floor(r.p.x), Math.floor(r.p.y), Math.floor(r.p.z)]; }
let dreamT = 5;
export function dreamsTick(G, dt) {
  dreamT -= dt; if (dreamT > 0) return; dreamT = 8;
  for (const r of G.residents) {
    if (!r.dream && (r.dreamDay == null || G.day > r.dreamDay)) { const c = [...PREF[r.f.personality % 7], ...Object.keys(DREAMS)].filter((k) => !r.dreamDone.includes(k) && !DREAMS[k].ok(G, r)); if (c.length) { r.dream = c[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * c.length)]; if (!r.controlled) r.say(`ゆめが あるんだ… ${DREAMS[r.dream].t}`, 4); } }
    if (r.dream && DREAMS[r.dream] && DREAMS[r.dream].ok(G, r)) {
      const D = DREAMS[r.dream]; r.dreamDone.push(r.dream); r.dreamDay = G.day; const k = r.dream; r.dream = null;
      G.news(`🌈 ${r.name}の ゆめが かなった！「${D.t}」`); G.watchPrompt && G.watchPrompt(r, `${r.name}の ゆめが かなった`, 14); r.say('ゆめが かなった！ ありがとう！', 4, 'joy'); G.me && G.payReward && G.payReward(r, 'dream'); r.addExp(60, G); r.log(`ゆめが かなった ${D.ic}`);
      gather(G, r.p.x, Math.round(r.p.y), r.p.z, { mode: 'cheer', t: 8, rad: 2.2, say: (o) => (o === r ? '🌈 やったー！' : `${r.name}、おめでとう！`) });
      G.photo && setTimeout(() => G.photo([r], `${r.name}の ゆめ：${D.t}`), 3500);
      G.bag.food[5] = (G.bag.food[5] || 0) + 2; G.bag.tickets++;
      if (k === 'concert' || k === 'stage') G.party = { x: r.p.x, y: r.p.y, z: r.p.z, t: 20 };
    }
  }
}

// ---------- てんき
export function weatherTick(G, dt) {
  const W = G.weather || (G.weather = { k: 'sun', t: 120 });
  W.t -= dt;
  if (W.t > 0) return;
  if (W.k === 'rain' || W.k === 'snow') {
    const was = W.k; W.k = 'sun'; W.t = 150 + Math.random() * 200;
    if (was === 'rain' && Math.random() < (G.week === 'rainbow' ? 1 : 0.6) && G.hour > 6 && G.hour < 19) { G.rainbow = 50; G.news('🌈 にじが でた！'); G.residents.forEach((r) => { if (!r.controlled && r.state !== 'sleep') { r.say(rnd(['にじだ！', 'きれい〜！', 'わあ！']), 3, 'surprise'); r.yaw = Math.PI; } }); G.watchPrompt && G.watchPrompt(G.residents.find((r) => !r.controlled), 'にじ'); }
    else G.news('☀️ はれてきた！');
    return;
  }
  if (Math.random() < (G.week === 'rainbow' ? 0.6 : 0.35)) { const snow = ((G.day - 1) % 14) >= 11; W.k = snow ? 'snow' : 'rain'; W.t = 60 + Math.random() * 60; G.news(snow ? '❄️ ゆきが ふってきた！' : '☔ あめが ふってきた！ あまやどり しよう'); G.residents.forEach((r) => { if (!r.controlled && r.state !== 'sleep' && r.state !== 'event' && r.state !== 'mini') { r.state = 'idle'; r.timer = Math.random(); } }); }
  else W.t = 120 + Math.random() * 160;
}
export const roofed = (G, x, y, z) => { for (let yy = Math.floor(y) + 2; yy < Math.floor(y) + 9; yy++) { const id = G.world.get(Math.floor(x), yy, Math.floor(z)); if (id && B[id].solid) return true; } return false; };
export function findShelter(G, p, R = 14) {
  const fx = Math.floor(p.x), fy = Math.round(p.y), fz = Math.floor(p.z); let best = null, bd = 1e9;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d = dx * dx + dz * dz; if (d >= bd) continue; for (let dy = -2; dy <= 2; dy++) { const x = fx + dx, y = fy + dy, z = fz + dz; if (standable(G.world, x, y, z) && roofed(G, x, y, z)) { bd = d; best = [x, y, z]; break; } } }
  return best;
}

// ---------- そうだん（プレイヤーが たすける）
export function consultTick(G, dt) {
  G.consultCD = (G.consultCD ?? 60) - dt;
  if (G.consultCD > 0 || G.hour < 8 || G.hour >= 20 || !G.me) return;
  G.consultCD = 110 + Math.random() * 90;
  if (G.residents.some((r) => r.need === 'consult')) return;
  const cand = [];
  for (const r of G.residents) {
    if (r.controlled || r.state === 'sleep' || r.state === 'mini' || r.inviting) continue;
    const q = Object.keys(r.quarrel); if (q.length) cand.push([r, { k: 'makeup', to: +q[0] }]);
    const tomorrow = ((G.day) % 14) + 1; const bd = G.residents.find((o) => o !== r && o.f.birthday === tomorrow && (r.rel[o.uid] || 0) >= 20); if (bd && !r.bdGift) cand.push([r, { k: 'bdgift', to: bd.uid }]);
    if (Object.values(r.rel).filter((v) => v >= 45).length < 2 && G.residents.length > 3) cand.push([r, { k: 'friend' }]);
    cand.push([r, { k: 'play' }]);
  }
  if (!cand.length) return;
  const pri = cand.filter(([, c]) => c.k !== 'play'); const [r, c] = rnd(pri.length && Math.random() < 0.8 ? pri : cand);
  r.need = 'consult'; r.consult = c; r.consultDay = G.day;
  r.say(c.k === 'makeup' ? `${G.byUid(c.to)?.name}と なかなおり したいな… そうだん のって？` : c.k === 'bdgift' ? `あしたは ${G.byUid(c.to)?.name}の たんじょうび！ そうだん したいな` : c.k === 'friend' ? 'ともだちを ふやしたいな… そうだん しても いい？' : 'ねえねえ、なにして あそぶか いっしょに きめて！', 4.5);
  if (r.goTo(G, G.me.p.x + 1, G.me.p.y, G.me.p.z + 1)) r.state = 'walk';
}
export const CONSULT_OPTS = {
  makeup: (G, r) => { const o = G.byUid(r.consult.to); return [
    ['🤝', 'いっしょに あやまりに いこう', () => { if (!o) return; delete r.quarrel[o.uid]; delete o.quarrel[r.uid]; r.addRel(o, 25, G); G.sfx.melody && G.sfx.melody(); r.say('ごめんね！', 3, 'sad'); setTimeout(() => o.say('ううん、こっちこそ！ なかなおり しよう', 3, 'joy'), 1600); G.news(`🤝 あなたの おかげで ${r.name}と ${o.name}が なかなおり！`); r.log(`${o.name}と なかなおり 🤝`); G.photo && G.photo([r, o], `${r.name}と ${o.name}の なかなおり`); meet(G, r, o); }],
    ['✉️', 'てがみを かいて みよう', () => { r.say('てがみ かいてみる！', 3, 'joy'); G.ask && G.ask(r, () => { if (!o) return; delete r.quarrel[o.uid]; delete o.quarrel[r.uid]; r.addRel(o, 20, G); o.say(`${r.name}から てがみ… うれしい！`, 3.5, 'joy'); G.news(`✉️ ${r.name}の てがみで ${o.name}と なかなおり！`); }); }],
    ['⏳', 'すこし まって みよう', () => { r.say('うん… あした はなして みるね', 3, 'sad'); }],
  ]; },
  bdgift: (G, r) => { const o = G.byUid(r.consult.to); const fav = o ? FOODS_E[o.f.food] : '🍰'; const items = [[fav, o ? `${o.name}の すきな もの` : 'すきなもの', true], ['🌸', 'はなたば', o && [1, 4, 6].includes(o.f.personality)], ['🧸', 'ぬいぐるみ', o && [4, 3].includes(o.f.personality)], ['⚽', 'ボール', o && [0, 5].includes(o.f.personality)]].sort(() => Math.random() - 0.5).slice(0, 3);
    return items.map(([e, n, good]) => [e, n, () => { r.bdGift = { to: r.consult.to, e, good: !!good }; r.say(`${e} ${n}に する！ あした わたすね`, 3, 'joy'); }]); },
  friend: (G, r) => G.residents.filter((o) => o !== r && (r.rel[o.uid] || 0) < 45).sort(() => Math.random() - 0.5).slice(0, 3).map((o) => ['💗', `${o.name}を しょうかいする`, () => { r.wantFriend = o.uid; r.introduced = true; G.payReward && G.payReward(r, 'friend'); r.need = null; meet(G, r, o); r.addRel(o, 15, G); G.news(`💗 ${r.name}に ${o.name}を しょうかいした`); }]),
  play: (G, r) => [['💃', 'ダンス パーティー', () => { G.party = { x: r.p.x, y: r.p.y, z: r.p.z, t: 25 }; G.news(`💃 ${r.name}の ダンスパーティー！`); }], ['🙈', 'かくれんぼ', () => { G.news('🙈 かくれんぼ はじまり！'); G.residents.forEach((o) => { if (!o.controlled && o.state !== 'sleep') { o.state = 'idle'; o.timer = 0; o.say(o === r ? 'もういいかい？' : 'まーだだよ！', 3, 'joy'); } }); }], ['🎨', 'おえかき たいかい', () => { G.news('🎨 おえかき たいかい！'); r.say('みんなで えを かこう！', 3, 'joy'); G.residents.filter((o) => !o.controlled && o.state !== 'sleep').slice(0, 5).forEach((o) => { o.state = 'using'; o.use = { at: [Math.floor(o.p.x), Math.floor(o.p.y), Math.floor(o.p.z) + 1], kind: 'paint' }; o.timer = 6; o.say('🎨 かくぞー！', 2); }); }]],
};
const FOODS_E = ['🍙', '🍞', '🍎', '🍓', '🍌', '🍰', '🍩', '🍕', '🍔', '🍛', '🍜', '🍣', '🍦', '🍪', '🍮', '🥞', '🍉', '🍇', '🍳', '🍫'];
function meet(G, r, o) { if (!o) return; if (r.goTo(G, o.p.x + 1, o.p.y, o.p.z)) { r.state = 'goevent'; r.evMode = 'joy'; r.evT = 5; r.evSay = null; r.evFace = [o.p.x, o.p.z]; } }
