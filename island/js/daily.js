// まいにちの たのしみ（おてがみ・ひがわりイベント・おへやおまかせ・あそぼう の さそい）
import { B } from './blocks.js';
import { standable, FOODS } from './life.js';
import { DREAMS } from './events.js';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export function pickFair(G, L) { if (!L.length) return null; const A = G.appear || {}; const w = L.map((r) => (1 + (r.f.personality === 0 || r.f.personality === 5 ? 0.3 : 0)) / (1 + (A[r.uid] || 0) * 0.4)); let s = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < L.length; i++) { s -= w[i]; if (s <= 0) { G.appear = A; A[r0(L[i])] = (A[r0(L[i])] || 0) + 1; return L[i]; } } return L[0]; }
const r0 = (r) => r.uid;
export function appearDecay(G) { if (G.apDay === G.day) return; G.apDay = G.day; const A = G.appear || {}; for (const k in A) A[k] *= 0.6; }
export const isFree = (r) => !r.controlled && !['sleep', 'event', 'goevent', 'mini'].includes(r.state);

// ---------- おてがみ
export function mailTick(G, force) {
  if (!force && (G.hour < 7 || (G.mailDay || 0) >= G.day)) return;
  G.mailDay = G.day; G.mail = G.mail || [];
  const L = G.residents.filter((r) => r !== G.me); if (!L.length) return;
  const n = L.length >= 4 ? 2 : 1;
  const score = (r) => r.diary.filter((e) => e.d >= G.day - 1).length + Math.random() * 2 + (G.mail.some((m) => m.from === r.uid && m.d >= G.day - 2) ? -3 : 0) + ((G.fav || [])[0] === r.uid ? 20 : (G.fav || []).includes(r.uid) ? 4 : 0);
  const pick = [...L].sort((a, b) => score(b) - score(a)).slice(0, n);
  for (const r of pick) G.mail.push(makeLetter(G, r));
  G.mail = G.mail.slice(-24);
  G.news(`📮 おてがみが ${n}つ とどいたよ！`); G.onMail && G.onMail();
}
function makeLetter(G, r) {
  const me = G.me ? G.me.name : 'みんな';
  const yd = r.diary.filter((e) => e.d >= G.day - 1 && !/はじめて はなした/.test(e.t));
  const ev = yd.length ? rnd(yd).t : null;
  const fr = Object.entries(r.rel).sort((a, b) => b[1] - a[1])[0]; const fo = fr && G.byUid(+fr[0]);
  const pet = G.pets.find((p) => p.owner === r.uid);
  const lines = [rnd([`${me}へ`, `${me}、おはよう！`, `だいすきな ${me}へ`])];
  if (ev) lines.push(`きのうは ${ev.replace(/\s*\S*[\u{1F300}-\u{1FAFF}☀-➿]\S*$/u, '')}！`, rnd(['とっても たのしかったよ。', 'わすれられないな。', 'また したいな。', 'ドキドキ したよ。']));
  else lines.push(rnd(r.pers.talk), rnd(['きょうも いい てんきだね。', 'しまの くらし、たのしいよ。', 'きょうは なにを つくるの？']));
  const req = r.dream && DREAMS[r.dream] ? `おねがいが あるの。${DREAMS[r.dream].t}な。` : pet ? `こんど ${pet.name}と いっしょに あそぼうね！` : fo ? `${fo.name}と いっしょに あそびに きてね。` : 'こんど いっしょに あそぼうね！';
  { const m = r.pmRecall && r.pmRecall(); if (m && Math.random() < 0.7) lines.push(`このまえ ${m.t}の、うれしかったよ。`); }
  lines.push(req);
  const R = Math.random(); let gift;
  if (R < 0.12 && (G.bag.hats || []).length < 19) gift = { k: 'hat' }; else if (R < 0.2) gift = { k: 'egg' }; else if (R < 0.26) gift = { k: 'ticket' }; else { const i = Math.random() < 0.4 ? r.f.food : Math.floor(Math.random() * FOODS.length); gift = { k: 'food', i }; }
  return { id: Date.now() + Math.random(), from: r.uid, name: r.name, d: G.day, text: lines, gift, got: false, read: false };
}
export const giftLabel = (g) => (g.k === 'food' ? FOODS[g.i][0] + ' ' + FOODS[g.i][1] : g.k === 'hat' ? '🧢 ぼうし' : g.k === 'egg' ? '🥚 ペットのたまご' : '🎟️ パーティーけん');
export function takeGift(G, m) {
  if (m.got) return; m.got = true; const g = m.gift;
  if (g.k === 'food') G.bag.food[g.i] = (G.bag.food[g.i] || 0) + 1;
  else if (g.k === 'egg') G.bag.eggs++;
  else if (g.k === 'ticket') G.bag.tickets++;
  else { const left = [...Array(20).keys()].filter((i) => i && !G.bag.hats.includes(i)); if (left.length) G.bag.hats.push(rnd(left)); }
}

// ---------- ひがわり イベント
const DAILY = [
  { k: 'flower', n: '🌸 おはなまつり', h: 16, mode: 'dance', say: ['🌸 いいにおい〜', 'はなかんむり！', 'おはな きれい！'], line: [['じゃーん！ はなかんむり！', 'にあう〜！']] },
  { k: 'petshoot', n: '📸 ペットさつえいかい', h: 15, mode: 'cheer', pet: 1, say: ['はい、ポーズ！', 'かわいい〜！', 'こっち むいて〜'], line: [['うちの こ みて！', 'かわいい〜！'], ['おすわり できるよ！', 'すごーい！']] },
  { k: 'fashion', n: '👗 ファッションショー', h: 16, mode: 'cheer', say: ['すてき〜！', 'おしゃれ！', '👏👏'], line: [['じゃーん！ どう？ にあう？', 'すてき！ モデルみたい！'], ['くるっと まわって… ポーズ！', 'かっこいい〜！']] },
  { k: 'sports', n: '🏅 うんどうかい', h: 15, mode: 'cheer', say: ['フレー！ フレー！', 'がんばれ〜！', 'よーい ドン！'], line: [['いちばん はやいのは わたし！', 'まけないぞ〜！'], ['ジャンプ たいかい！ えいっ！', 'たかーい！']], vars: [{ n: 'かけっこ', mode: 'cheer', line: [['よーい ドン！ はしるぞ〜！', 'はやーい！'], ['ゴール！ 1ばん！', 'すごい！']] }, { n: 'つなひき', mode: 'stomp', line: [['オーエス！ オーエス！', 'ひっぱれ〜！'], ['かったー！', 'もう1かい！']] }, { n: 'たまいれ', mode: 'joy', line: [['えいっ！ はいった！', 'ナイス！'], ['いっぱい はいったよ！', 'やったね！']] }] },
  { k: 'star', n: '🌠 ながれぼしの よる', h: 20, mode: 'sit', say: ['あ！ ながれぼし！', 'おねがい しなきゃ！', 'きれい…'], line: [['ゆめが かないますように…', 'わたしも おねがい した！']] },
  { k: 'sweets', n: '🍪 おかしパーティー', h: 15, mode: 'eat', say: ['あまーい！', 'もぐもぐ', 'おかわり！'], line: [['クッキー やいて きたよ！', 'おいしい〜！'], ['プリン わけっこ しよ！', 'ありがとう！']] },
  { k: 'music', n: '🎵 おんがくかい', h: 17, mode: 'dance', say: ['🎵 ラララ〜', 'ノリノリ！', '♪♪♪'], line: [['🎹 ピアノ ひくよ！', 'じょうず〜！'], ['🥁 ドンドン！', 'リズム ばっちり！']], vars: [{ n: 'うたの ひ', mode: 'cheer', line: [['🎤 ラ〜ラ〜♪ ききいって！', 'きれいな こえ〜！'], ['🎤 みんなで うたおう！', 'ラララ〜♪']] }, { n: 'ダンスの ひ', mode: 'dance', line: [['💃 ステップ みてて！', 'かっこいい！'], ['🕺 くるっと ターン！', 'すごーい！']] }, { n: 'がっそうの ひ', mode: 'joy', line: [['🎺 パッパカパーン！', 'いい おと！'], ['🎻 ふたりで あわせよう！', 'ぴったり！']] }] },
];
export function todayEvent(G) { const L = DAILY.filter((e) => !e.pet || G.pets.length); return L[(G.day - 1) % L.length]; }
export function dailyTick(G, dt, gather) {
  const E0 = todayEvent(G); G.todayName = E0.n.replace(/^\S+\s/, ''); const d = G.day, h = G.hour; G.dayDone = G.dayDone || {}; const V = E0.vars ? E0.vars[(d * 7 + 3) % E0.vars.length] : null; const E = V ? { ...E0, n: `${E0.n}（${V.n}）`, mode: V.mode, line: V.line } : E0;
  if (h >= 7 && !G.dayDone['a' + d]) { G.dayDone['a' + d] = 1; G.news(`📅 きょうは ${E.n}！ ${E.h}じから ひろばで やるよ`); }
  if (h >= E.h && h < E.h + 1 && !G.dayDone['s' + d]) {
    G.dayDone['s' + d] = 1;
    const spot = spotFor(G, E);
    G.dayEv = { E, spot, t: 0, next: 4 };
    G.news(`${E.n}が はじまったよ！ みんな あつまれ！`); G.watchPrompt && G.watchPrompt(G.residents.find(isFree), E.n, 16);
    gather(G, spot[0], spot[1], spot[2], { mode: E.mode, t: 16, rad: 3.2, say: () => rnd(E.say) });
    if (E.pet) G.pets.forEach((p, i) => { p.p.x = spot[0] + Math.cos(i * 1.4) * 1.5; p.p.z = spot[2] + Math.sin(i * 1.4) * 1.5; p.p.y = spot[1] + 0.5; p.doTrick('spin'); });
    if (E.k === 'sweets') G.residents.forEach((r) => (r.hunger = Math.max(0, r.hunger - 30)));
    if (E.k === 'star') G.shootStar = 22;
    if (E.k === 'music') G.party = { x: spot[0], y: spot[1], z: spot[2], t: 14 };
  }
  const D = G.dayEv; if (!D) return;
  D.t += dt; D.next -= dt;
  if (D.next <= 0 && D.t < 15) { D.next = 3; const ps = G.residents.filter((r) => !r.controlled && r.state === 'event' && Math.hypot(r.p.x - D.spot[0], r.p.z - D.spot[2]) < 6); if (ps.length >= 2) { const [a, b] = [...ps].sort(() => Math.random() - 0.5); const [s1, s2] = rnd(D.E.line); a.say(s1, 2.6, 'joy'); a.evMode = D.E.k === 'fashion' || D.E.k === 'sports' ? 'joy' : D.E.mode; setTimeout(() => b.say(s2, 2.4, 'joy'), 1300); G.effect && G.effect(D.E.k === 'sweets' ? 'eat' : 'heart', a); if (D.E.k === 'petshoot') G.pets.forEach((p) => Math.random() < 0.5 && p.doTrick(rnd(['spin', 'jump', 'sit']))); } }
  if (D.t >= 16) {
    G.dayEv = null; const ps = G.residents.filter((r) => Math.hypot(r.p.x - D.spot[0], r.p.z - D.spot[2]) < 9);
    ps.forEach((r) => { r.log(`${D.E.n.replace(/^\S+\s/, '')}に でた`); ps.forEach((o) => o !== r && r.addRel(o, 0.6, G)); });
    G.photo && G.photo(ps.slice(0, 5), D.E.n);
    const joined = G.me && Math.hypot(G.me.p.x - D.spot[0], G.me.p.z - D.spot[2]) < 14;
    if (joined) { G.stamps = G.stamps || {}; G.stamps[D.E.k] = (G.stamps[D.E.k] || 0) + 1; G.coins = (G.coins || 0) + 1; count(G, 'event'); G.bag.food[Math.floor(Math.random() * FOODS.length)] = (G.bag.food[Math.floor(Math.random() * FOODS.length)] || 0) + 1; G.bag.food[5] = (G.bag.food[5] || 0) + 1; G.news(`🏅 さんかした きねんに「${D.E.n}」スタンプと おみやげを もらった！`); }
    else G.news(`${D.E.n} おしまい！ たのしかったね`);
  }
}
function spotFor(G, E) {
  const c = [Math.floor(G.center.x), 23, Math.floor(G.center.z)];
  if (E.k === 'star' && G.hills && G.hills.length) return G.hills[0];
  if (E.k === 'flower') { let best = null, bn = 0; for (let i = 0; i < 40; i++) { const x = c[0] + Math.floor((Math.random() - 0.5) * 50), z = c[2] + Math.floor((Math.random() - 0.5) * 50), y = G.world.top(x, z) + 1; let n = 0; for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (G.flowerIds.includes(G.world.get(x + dx, y, z + dz))) n++; if (n > bn && standable(G.world, x, y, z)) { bn = n; best = [x, y, z]; } } if (best && bn >= 4) return best; }
  if (E.k === 'music' || E.k === 'fashion') { const t = G.findUse(G.center, 40, ['stage', 'piano']); if (t) return [t[0], t[1], t[2] + 2]; }
  return c;
}

// ---------- おへや おまかせ
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const THEMES = [
  { k: 'cute', lamp: 'ピンクのランプ', props: ['ほんだな(ひくい)', 'はちうえ'], n: 'かわいい', ic: '🎀', floor: 'さくらのタイル', wall: 'いちごのかべがみ', bed: 'ピンクのベッド', center: 'まるいテーブル', rug: 'まるもようのラグ', items: ['ピンクのソファ', 'うさぎのぬいぐるみ', 'ドレッサー', 'くまのぬいぐるみ', 'はちうえ', 'ぬいぐるみタワー', 'ピンクのカーテン'], say: ['かわいい〜！ ピンクで いっぱい！', 'ぬいぐるみ だいすき！'] },
  { k: 'chic', lamp: 'クリームのランプ', props: ['ほんだな(ひくい)', 'つぼ'], n: 'おしゃれ', ic: '🕯️', floor: 'ヘリンボーンのゆか', wall: 'しまのかべがみ', bed: 'こんのベッド', center: 'ちいさいつくえ', rug: 'しましまのラグ', items: ['こんのソファ', 'おおきなかんようしょくぶつ', 'ほんだな(たかい)', 'だんろ', 'はしらどけい', 'ラジオ', 'ハンガーラック'], say: ['わあ、カフェみたいで おしゃれ！', 'おとなの へやって かんじ！'] },
  { k: 'dream', lamp: 'ラベンダーのランプ', props: ['ほんだな(ひくい)', 'くまのぬいぐるみ'], n: 'ゆめかわ', ic: '🦄', floor: 'ラベンダーのタイル', wall: 'くものかべがみ', bed: 'ラベンダーのベッド', center: 'まるいテーブル', rug: 'はなもようのラグ', items: ['ラベンダーのソファ', 'ペンギンのぬいぐるみ', 'ドレッサー', 'おもちゃばこ', 'ぬいぐるみタワー', 'みずいろのカーテン', 'はちうえ'], say: ['ゆめの なかみたい〜！', 'ふわふわで しあわせ！'] },
  { k: 'animal', lamp: 'きみどりのランプ', props: ['はちうえ', 'いぬごや'], n: 'どうぶつ', ic: '🐾', floor: 'オークのいた', wall: 'もりのかべがみ', bed: 'きみどりのベッド', center: 'ちゃぶだい', rug: 'チェックのラグ', items: ['いぬのぬいぐるみ', 'ペットベッド', 'ねこタワー', 'とりかご', 'アクアリウム', 'ねこのぬいぐるみ', 'おおきなかんようしょくぶつ'], say: ['どうぶつが いっぱい！ もりの おうちだ！', 'ペットも よろこぶね！'] },
  { k: 'wa', lamp: 'オレンジのランプ', props: ['ぼんさい', 'つぼ'], n: 'わふう', ic: '🍵', floor: 'たたみ', wall: 'クリームのかべ', bed: 'ふとん', center: 'ちゃぶだい', rug: null, items: ['ぼんさい', 'つぼ', 'たんす', 'ししおどし', 'こたつ', 'ラジオ', 'はちうえ'], say: ['おちつく〜。おちゃが のみたいな', 'たたみの においが する！'] },
];
const byName = new Map(); const idOf = (n) => { if (!n) return 0; if (!byName.size) B.forEach((b) => b && b.name && byName.set(b.name, b.id)); return byName.get(n) || 0; };
export function findRoom(G, p) {
  const w = G.world, y = Math.floor(p.y + 0.05), sx = Math.floor(p.x), sz = Math.floor(p.z);
  const open = (x, z) => { const id = w.get(x, y, z); if (id && (B[id].full || B[id].shape === 'door' || B[id].shape === 'pane' || B[id].shape === 'window' || B[id].shape === 'fence' || B[id].shape === 'wall')) return false; const up = w.get(x, y + 1, z); if (up && B[up].full) return false; return true; };
  if (!open(sx, sz) || !G.roofed(G, sx + 0.5, y, sz + 0.5)) return null;
  const seen = new Set([sx + ',' + sz]), q = [[sx, sz]], cells = [];
  while (q.length) { const [x, z] = q.shift(); if (!G.roofed(G, x + 0.5, y, z + 0.5)) return null; const fl = w.get(x, y - 1, z); if (!fl || !B[fl].solid) return null; cells.push([x, z]); if (cells.length > 150) return null;
    for (const [dx, dz] of DIRS) { const k = (x + dx) + ',' + (z + dz); if (seen.has(k)) continue; seen.add(k); if (open(x + dx, z + dz)) q.push([x + dx, z + dz]); } }
  return cells.length >= 4 ? { y, cells } : null;
}
export function decorateRoom(G, theme) {
  const me = G.me; if (!me) return 'なかまで あそんでいる ときに つかえるよ';
  const R = findRoom(G, me.p); if (!R) return '🏠 おうちの なかに はいってから つかってね（かべと やねの ある へや）';
  const w = G.world, { y, cells } = R, set = new Set(cells.map((c) => c.join(',')));
  const T = THEMES.find((t) => t.k === theme) || THEMES[0];
  G.beginOp();
  try {
    let bed = false; const doorCells = [];
    for (const [x, z] of cells) { const id = w.get(x, y, z); if (id && B[id].bed) bed = true; }
    // かべ・ゆか・とびら
    const wallId = idOf(T.wall), floorId = idOf(T.floor);
    for (const [x, z] of cells) {
      for (const [dx, dz] of DIRS) { const nx = x + dx, nz = z + dz; if (set.has(nx + ',' + nz)) continue; for (let yy = y; yy <= y + 2; yy++) { const id = w.get(nx, yy, nz); if (!id) continue; if (B[id].shape === 'door') { doorCells.push([x, z]); continue; } if (wallId && B[id].full && !B[id].glassy && !B[id].light && B[id].cat !== 'roof') w.set(nx, yy, nz, wallId); } }
      const f = w.get(x, y - 1, z); if (floorId && f && B[f].full) w.set(x, y - 1, z, floorId);
    }
    // いまの かぐを かたづける（ベッドは のこす）
    for (const [x, z] of cells) { const id = w.get(x, y, z); if (id && !B[id].bed && (B[id].shape === 'model' || B[id].shape === 'carpet') && B[id].cat === 'furn') w.set(x, y, z, 0); }
    const nearDoor = (x, z) => doorCells.some(([a, b]) => Math.abs(a - x) + Math.abs(b - z) <= 1);
    const wallDir = (x, z) => DIRS.findIndex(([dx, dz]) => !set.has((x + dx) + ',' + (z + dz)));
    const edge = cells.filter(([x, z]) => wallDir(x, z) >= 0 && !nearDoor(x, z) && !w.get(x, y, z));
    const inner = cells.filter(([x, z]) => wallDir(x, z) < 0 && !w.get(x, y, z));
    let k = 0; const put = (c, name) => { const id = idOf(name); if (!id || !c) return false; const [x, z] = c; if (w.get(x, y, z)) return false; const d = wallDir(x, z); w.set(x, y, z, id, B[id].rot ? Math.max(0, d) : 0); return true; };
    edge.sort(() => Math.random() - 0.5);
    if (!bed && T.bed) put(edge.shift(), T.bed);
    const n = Math.max(2, Math.round(edge.length * 0.5));
    for (const c of edge.slice(0, n)) { put(c, T.items[k % T.items.length]); k++; }
    if (inner.length) { const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length, cz = cells.reduce((a, c) => a + c[1], 0) / cells.length; inner.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz)); put(inner[0], T.center); if (T.rug) inner.slice(1, 9).forEach((c) => put(c, T.rug));
      const lc = inner[0]; const lid = idOf(T.lamp); for (let yy = y + 2; yy <= y + 3 && lid; yy++) { if (w.get(lc[0], yy, lc[1])) break; const up = w.get(lc[0], yy + 1, lc[1]); if (up && B[up].solid) { w.set(lc[0], yy, lc[1], lid); break; } } }
    for (const c of edge.slice(n, n + 2)) put(c, rnd(T.props));
  } finally { G.endOp(); }
  w.scanDoors(); G.rebuildDoors();
  // じゅうにんが みにくる
  const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length, cz = cells.reduce((a, c) => a + c[1], 0) / cells.length;
  const owner = G.residents.find((r) => r.home && set.has(r.home[0] + ',' + r.home[2]) && r !== me && isFree(r)) || G.residents.filter((r) => r !== me && isFree(r)).sort((a, b) => a.dist(me) - b.dist(me))[0];
  if (owner && owner.goTo(G, cx, y, cz)) { owner.state = 'goevent'; owner.evMode = 'joy'; owner.evT = 6; owner.evSay = rnd(T.say); owner.evFace = [cx, cz]; owner.log(`おへやが「${T.n}」に なった ${T.ic}`); owner.pm(`おへやを「${T.n}」に してくれた`); setTimeout(() => G.photo && G.photo([owner], `${T.ic} ${T.n}の おへや`), 12000); }
  return null;
}

// ---------- 「いっしょに あそぼ！」の さそい
export function inviteTick(G, dt, busy) {
  const r0 = G.inviter;
  if (r0) { r0.inviteT -= dt; if (!r0.inviting) { G.inviter = null; return; } if (G.me && r0.dist(G.me) < 2.8) { r0.inviting = false; G.inviter = null; r0.path = null; r0.state = 'mini'; r0.evMode = 'wave'; r0.evFace = [G.me.p.x, G.me.p.z]; r0.say('ねえねえ、いっしょに あそぼ！', 4, 'joy'); G.onInvite && G.onInvite(r0); return; } if (r0.inviteT <= 0 || r0.state === 'idle') { r0.inviting = false; G.inviter = null; } else if (r0.state === 'walk' && Math.random() < dt) r0.goTo(G, G.me.p.x + 1, G.me.p.y, G.me.p.z); return; }
  G.inviteCD = (G.inviteCD ?? 80) - dt;
  if (G.inviteCD > 0 || !G.me || G.hour < 8 || G.hour >= 19 || G.drama || G.dayEv || G.mini || busy()) return;
  G.inviteCD = 140 + Math.random() * 120;
  const c = G.residents.filter((r) => r !== G.me && isFree(r) && r.dist(G.me) < 35 && !r.need).sort((a, b) => (b.rel[G.me.uid] || 0) - (a.rel[G.me.uid] || 0) + (Math.random() - 0.5) * 30)[0];
  if (!c || !c.goTo(G, G.me.p.x + 1, G.me.p.y, G.me.p.z)) return;
  c.state = 'walk'; c.inviting = true; c.inviteT = 25; G.inviter = c; c.say(`${G.me.name}〜！`, 2.5);
}

// ---------- カウンター（きょう やったこと）
export function count(G, k, v) {
  const c = G.cnt && G.cnt.d === G.day ? G.cnt : (G.cnt = { d: G.day });
  if (v != null) { (c[k] = c[k] || []).includes(v) || c[k].push(v); } else c[k] = (c[k] || 0) + 1;
  goalsCheck(G);
}
const got = (G, k) => { const c = G.cnt && G.cnt.d === G.day ? G.cnt : {}; return c[k] || 0; };

// ---------- きょうの 3つ
const GOALS = [
  { k: 'talk1', t: (G, a) => `${a.name}に はなしかけよう`, ic: '💬', arg: (G) => rnd(G.residents.filter((r) => r !== G.me)), ok: (G, a) => (got(G, 'talk') || []).includes(a.uid) },
  { k: 'bug', t: () => 'むしを 1ぴき つかまえよう', ic: '🦋', ok: (G) => got(G, 'bug') >= 1 },
  { k: 'play', t: () => 'だれかと いっしょに あそぼう', ic: '🎈', ok: (G) => got(G, 'play') >= 1 },
  { k: 'quiz', t: () => 'もんだいに 3もん せいかい しよう', ic: '❓', ok: (G) => got(G, 'quiz') >= 3 },
  { k: 'food', t: () => 'だれかに たべものを あげよう', ic: '🍙', ok: (G) => got(G, 'food') >= 1 },
  { k: 'build', t: () => 'ブロックを 20こ おこう', ic: '🧱', ok: (G) => got(G, 'build') >= 20 },
  { k: 'mail', t: () => 'おてがみを よもう', ic: '📮', ok: (G) => got(G, 'mail') >= 1 },
  { k: 'pet', t: () => 'ペットを なでて あげよう', ic: '🐾', ok: (G) => got(G, 'pet') >= 1, need: (G) => G.pets.length },
  { k: 'event', t: (G) => `「${todayEvent(G).n}」に さんか しよう`, ic: '📅', ok: (G) => got(G, 'event') >= 1 },
  { k: 'photo', t: () => 'しゃしんを 1まい ふやそう', ic: '📸', ok: (G) => got(G, 'photo') >= 1 },
];
export function goalsTick(G) {
  if (G.goals && G.goals.d === G.day) return;
  if (!G.me || G.residents.length < 2) return;
  const pool = GOALS.filter((g) => !g.need || g.need(G)).sort(() => Math.random() - 0.5);
  const pick = [pool.find((g) => g.k === 'talk1'), ...pool.filter((g) => g.k !== 'talk1').slice(0, 2)].filter(Boolean);
  G.goals = { d: G.day, list: pick.map((g) => { const a = g.arg ? g.arg(G) : null; return { k: g.k, t: g.t(G, a), ic: g.ic, uid: a ? a.uid : null, done: false }; }), bonus: false };
  G.onGoals && G.onGoals();
}
export function goalsCheck(G) {
  const L = G.goals; if (!L || L.d !== G.day) return;
  for (const g of L.list) { if (g.done) continue; const D = GOALS.find((x) => x.k === g.k); const a = g.uid != null ? G.byUid(g.uid) : null; if (D && D.ok(G, a || {})) { g.done = true; G.coins = (G.coins || 0) + 1; G.news(`✅ きょうの 3つ「${g.t}」できた！ シール +1`); G.onGoalDone && G.onGoalDone(false); } }
  if (!L.bonus && L.list.every((g) => g.done)) { L.bonus = true; G.coins = (G.coins || 0) + 1; G.bag.tickets++; G.news('🌟 きょうの 3つ ぜんぶ できた！ シール +1・パーティーけん +1'); G.onGoalDone && G.onGoalDone(true); if (G.me) G.residents.filter((r) => r !== G.me && isFree(r) && r.dist(G.me) < 14).slice(0, 4).forEach((r) => { r.path = null; r.state = 'event'; r.evMode = 'cheer'; r.timer = 4; r.evFace = [G.me.p.x, G.me.p.z]; r.say(rnd(['すごーい！ 👏', 'ぜんぶ できたね！', 'やったね！ 👏👏']), 3, 'joy'); }); }
  G.onGoals && G.onGoals();
}

// ---------- こんしゅうの しま
export const WEEKS = [
  { k: 'flower', n: '🌸 はなが いっぱいの しゅう' }, { k: 'rainbow', n: '🌈 にじが でやすい しゅう' }, { k: 'shell', n: '🐚 かいがらの しゅう' },
  { k: 'firefly', n: '✨ ホタルの しゅう' }, { k: 'sweets', n: '🍪 おかしの しゅう' },
];
export const weekOf = (G) => WEEKS[Math.floor((G.day - 1) / 7) % WEEKS.length];
export function weekTick(G, dt = 0) {
  const W = weekOf(G); G.week = W.k; G.wkDone = G.wkDone || {};
  const wk = Math.floor((G.day - 1) / 7);
  if (G.hour >= 6.5 && !G.wkDone['n' + wk]) { G.wkDone['n' + wk] = 1; G.news(`🗓️ こんしゅうは ${W.n}！`); }
  if (W.k === 'sweets' && Math.random() < dt * 0.01) { const r = rnd(G.residents.filter(isFree)); if (r) r.say(rnd(['🍩 おかしの しゅうだね！', '🍪 クッキー やこうかな', '🍮 プリン たべたい〜', '🍰 きょうの おやつ なにかな？']), 3); }
  if (G.hour >= 6.5 && !G.wkDone['d' + G.day]) {
    G.wkDone['d' + G.day] = 1; const w = G.world;
    if (W.k === 'flower') for (let i = 0, n = 0; i < 300 && n < 24; i++) { const x = 6 + Math.floor(Math.random() * (w.W - 12)), z = 6 + Math.floor(Math.random() * (w.D - 12)), y = w.top(x, z); if (B[w.get(x, y, z)]?.tint === 'grass' && !w.get(x, y + 1, z)) { w.set(x, y + 1, z, rnd(G.flowerIds)); n++; } }
    if (W.k === 'sweets') {} 
    if (W.k === 'shell') { const sh = idOf('おおきなかいがら'); for (let i = 0, n = 0; i < 400 && n < 6; i++) { const x = 4 + Math.floor(Math.random() * (w.W - 8)), z = 4 + Math.floor(Math.random() * (w.D - 8)), y = w.top(x, z); if (B[w.get(x, y, z)]?.name === 'すな' && !w.get(x, y + 1, z) && y >= 21) { w.set(x, y + 1, z, sh, Math.floor(Math.random() * 4)); n++; } } }
  }
}

// ---------- つづきもの（2〜4にち つづく おはなし）
const HATV = [['はなかんむり', '🌸', 4], ['リボン', '🎀', 2], ['おうかん', '👑', 3]];
const CAKEV = [['ケーキ', '🍰'], ['クッキー', '🍪'], ['ドーナツ', '🍩']];
const EPIS = [
  { k: 'hat', title: (e) => HATV[e.v || 0][0], steps: [
    (G, r, f, p, e) => { r.say(`${HATV[e.v || 0][1]} じぶんで ${HATV[e.v || 0][0]}を つくって みたいな…`, 4); G.news(`🧵 ${r.name}「じぶんで ${HATV[e.v || 0][0]}を つくりたい」…どうなるかな？`); r.log(`${HATV[e.v || 0][0]}を つくると きめた`); },
    (G, r, f, p, e) => { goFlowers(G, r, `${HATV[e.v || 0][1]} ざいりょうを あつめてるの`); G.news(`🧺 ${r.name}が ざいりょうを あつめている…`); r.log('ざいりょうを あつめた'); r.epiAsk = 'つくって みたけど むずかしい… てつだって！'; },
    (G, r, f, p, e) => { const V = HATV[e.v || 0]; r.f.hat = V[2]; G.rebuildResident(r); const m = G.findUse(r.p, 14, ['makeup']); if (m) r.goUse(G, m); setTimeout(() => { r.spinT = 2.6; r.say(`じゃーん！ ${V[0]} かんせい！ くるくる〜`, 4, 'joy'); G.sfx.sticker && G.sfx.sticker(); }, m ? 3500 : 300); G.news(`${V[1]} ${r.name}の ${V[0]}が かんせい！`); setTimeout(() => G.photo && G.photo([r], `${r.name}の ${V[0]}`), 6500); r.log(`${V[0]}が できた ${V[1]}`); },
    (G, r, f, p, e) => { const V = HATV[e.v || 0]; if (f) { f.f.hat = V[2]; G.rebuildResident(f); f.spinT = 2; r.spinT = 2; f.say(`${r.name}の まね！ おそろい！`, 4, 'joy'); r.say('おそろいだね！', 3, 'joy'); r.addRel(f, 10, G); G.news(`${V[1]} しまで ${V[0]}が はやってる！ ${f.name}も おそろいに`); setTimeout(() => G.photo && G.photo([r, f], `${V[0]} ブーム`), 2500); } } ] },
  { k: 'cake', title: (e) => `${CAKEV[e.v || 0][0]}やさん`, steps: [
    (G, r, f, p, e) => { const V = CAKEV[e.v || 0]; r.say(`${V[1]} ${V[0]}やさんに なりたいな！`, 4); G.news(`🧵 ${r.name}「${V[0]}やさんに なりたい！」`); r.log(`${V[0]}やさんに なると きめた`); },
    (G, r, f, p, e) => { const V = CAKEV[e.v || 0]; const u = G.findUse(r.p, 30, ['cook']); if (u) r.goUse(G, u); r.say('🍳 れんしゅう… あっ こげちゃった…', 4, 'sad'); G.news(`🍳 ${r.name}の ${V[0]}、こげちゃった… がんばれ！`); r.log(`${V[0]}の れんしゅう`); r.epiAsk = `${V[0]}の つくりかた、いっしょに かんがえて！`; },
    (G, r, f, p, e) => { const V = CAKEV[e.v || 0]; const u = G.findUse(r.p, 30, ['cook']); if (u) r.goUse(G, u); r.say(`${V[1]} ふわふわに やけた！`, 4, 'joy'); if (f) { setTimeout(() => f.say('おいしい〜！ おみせ できるよ！', 3, 'joy'), 2000); r.addRel(f, 8, G); } G.news(`${V[1]} ${r.name}の ${V[0]}が だいせいこう！`); r.log(`${V[0]}が じょうずに やけた ${V[1]}`); },
    (G, r, f, p, e) => { const V = CAKEV[e.v || 0]; G.news(`${V[1]} きょうだけ ${r.name}の ${V[0]}やさん オープン！ ぎょうれつが できてる！`); r.path = null; r.state = 'event'; r.evMode = 'wave'; r.timer = 16; r.say('いらっしゃいませ！', 4, 'joy');
      const c = G.center; let dx = c.x - r.p.x, dz = c.z - r.p.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl; r.evFace = [r.p.x + dx, r.p.z + dz];
      G.residents.filter((o) => o !== r && o !== G.me && isFree(o)).slice(0, 5).forEach((o, i) => { const tx = r.p.x + dx * (1.4 + i * 1.1), tz = r.p.z + dz * (1.4 + i * 1.1); if (o.goTo(G, tx, r.p.y, tz)) { o.state = 'goevent'; o.evMode = 'walk'; o.evT = 6 + i; o.evSay = i ? rnd(['まだかな〜', 'たのしみ！', 'いい におい〜']) : `${V[0]} ください！`; o.evFace = [r.p.x, r.p.z]; setTimeout(() => { if (o.state === 'event') { o.evMode = 'eat'; o.timer = 4; o.say(`${V[1]} おいしい！`, 2.5, 'joy'); G.effect && G.effect('eat', o); o.addRel(r, 3, G); } }, 9000 + i * 1500); } });
      setTimeout(() => G.photo && G.photo([r, ...G.residents.filter((o) => o !== r && o.dist(r) < 6).slice(0, 3)], `${r.name}の ${V[0]}やさん`), 12000); r.log(`${V[0]}やさんを ひらいた ${V[1]}`); } ] },
  { k: 'star', title: () => 'ほしの かけら', steps: [
    (G, r, f) => { r.say('あれ？ きらきらの いし… ほしの かけら？', 4, 'surprise'); G.news(`🧵 ${r.name}が ふしぎな きらきらの いしを ひろった`); r.log('ふしぎな いしを ひろった'); },
    (G, r, f) => { if (f) { r.say(`${f.name}、これ なにか しってる？`, 3.5); setTimeout(() => f.say('ほしの かけら かも！ よるに そらを みよう！', 3.5, 'surprise'), 1800); } G.news(`🔭 ${r.name}たちが こんやは そらを みるんだって`); r.log('ほしの かけらを しらべた'); r.epiAsk = 'ほしの こと、もっと しりたいな… いっしょに しらべて！'; },
    (G, r, f) => { G.shootStar = 20; r.say('🌠 ながれぼし！ かけらが ひかってる！', 4, 'surprise'); if (f) { f.say('きれい〜！', 3, 'joy'); r.addRel(f, 12, G); } G.news(`🌠 ${r.name}の ほしの かけらが ひかった！`); r.log('ながれぼしを みた 🌠'); },
    (G, r, f) => { r.spinT = 2.2; G.shootStar = 8; G.sfx.sticker && G.sfx.sticker(); r.say('ほしの かけらで ペンダントを つくったよ！', 4, 'joy'); G.news(`⭐ ${r.name}が ほしの ペンダントを つくった！ たからもの`); G.photo && G.photo([r, f].filter(Boolean), `${r.name}の ほしの ペンダント`); r.log('ほしの ペンダントが できた ⭐'); } ] },
  { k: 'trick', title: () => 'ペットの げい', need: 'pet', steps: [
    (G, r, f, p) => { r.say(`${p.name}に げいを おしえたい！`, 4); G.news(`🧵 ${r.name}「${p.name}に げいを おしえたい！」`); r.log(`${p.name}に げいを おしえると きめた`); },
    (G, r, f, p) => { p.tricks += 3; p.doTrick('jump'); r.say(`${p.name}、ジャンプ！ …おしい！`, 3.5); G.news(`🐾 ${r.name}と ${p.name}が れんしゅう ちゅう`); r.log(`${p.name}と れんしゅう`); r.epiAsk = `${p.name}の れんしゅう、おうえん して！`; },
    (G, r, f, p) => { p.tricks += 3; p.doTrick('spin'); r.say(`できたー！ ${p.name} すごい！`, 4, 'joy'); G.news(`🎪 ${p.name}が くるくるを おぼえた！`); r.log(`${p.name}が げいを おぼえた 🎪`); },
    (G, r, f, p) => { G.party = { x: r.p.x, y: r.p.y, z: r.p.z, t: 14 }; p.doTrick('spin'); [1, 2, 3].forEach((i) => setTimeout(() => p.doTrick(['jump', 'spin', 'jump'][i - 1]), i * 2200)); G.residents.filter((o) => o !== r && isFree(o) && o.dist(r) < 15).slice(0, 4).forEach((o) => { o.path = null; o.state = 'event'; o.evMode = 'cheer'; o.timer = 8; o.evFace = [r.p.x, r.p.z]; }); G.sfx.clap && G.sfx.clap(); r.say(`${p.name}の げい、みてね！`, 4, 'joy'); G.news(`🎪 ${r.name}と ${p.name}の げいの はっぴょうかい！`); G.photo && G.photo([r], `${p.name}の はっぴょうかい`); r.log('げいの はっぴょうかい 🎪'); } ] },
  { k: 'garden', title: () => 'ひみつの たね', steps: [
    (G, r, f) => { r.say('🌱 ひみつの たねを もらったよ！', 4); G.news(`🧵 ${r.name}が ひみつの たねを もらった`); r.log('ひみつの たねを もらった'); },
    (G, r, f) => { plant(G, r, 'なえぎ'); r.say('🚿 おおきく なあれ！', 3.5); G.news(`🌱 ${r.name}が たねを うえた`); r.log('たねを うえた'); r.epiAsk = 'たねに みずを あげるの、てつだって！'; },
    (G, r, f) => { plant(G, r, 'flower', 4); r.say('めが でた！ おはなも さいたよ！', 4, 'joy'); G.news(`🌷 ${r.name}の たねから はなが さいた！`); r.log('たねから はなが さいた 🌷'); },
    (G, r, f) => { const ps = [...plant(G, r, 'ひまわり', 2), ...plant(G, r, 'flower', 12)]; ps.forEach(([x, y, z, id], i) => setTimeout(() => { G.burst && G.burst(x + 0.5, y + 0.6, z + 0.5, id, 6); if (i % 3 === 0) G.sfx.pop && G.sfx.pop(); }, 400 + i * 220)); r.spinT = 2; r.say('こんなに おおきく なった！ みんなの おかげ！', 4, 'joy'); G.news(`🌻 ${r.name}の ひみつの にわが かんせい！`); G.photo && G.photo([r], `${r.name}の ひみつの にわ`); r.log('ひみつの にわが できた 🌻'); } ] },
];
function goFlowers(G, r, say) { const t = G.findNear(r.p, (d) => G.flowerIds.includes(d.id), 16); if (t && r.goTo(G, t[0] + 1, t[1], t[2])) { r.state = 'goevent'; r.evMode = 'cook'; r.evT = 6; r.evSay = say; r.evFace = [t[0] + 0.5, t[2] + 0.5]; } else r.say(say, 3.5); }
function plant(G, r, what, n = 1) { const out = []; const w = G.world, b = r.home || [Math.floor(r.p.x), Math.floor(r.p.y), Math.floor(r.p.z)]; for (let i = 0, k = 0; i < 60 && k < n; i++) { const x = b[0] + Math.floor((Math.random() - 0.5) * 8), z = b[2] + Math.floor((Math.random() - 0.5) * 8), y = w.top(x, z); if (B[w.get(x, y, z)]?.tint !== 'grass' || w.get(x, y + 1, z) || G.roofed(G, x + 0.5, y + 1, z + 0.5)) continue; const id = what === 'flower' ? rnd(G.flowerIds) : (B.find((d) => d && d.name && d.name.includes(what) && d.shape === 'cross') || {}).id || rnd(G.flowerIds); w.set(x, y + 1, z, id); out.push([x, y + 1, z, id]); k++; } return out; }
export function episodeTick(G, dt) {
  G.epis = G.epis || []; const d = G.day, h = G.hour;
  // あたらしい おはなしを はじめる（いちどに 2つまで）
  if (h >= 9 && h < 10 && G.epiStart !== d && G.epis.length < 2) {
    G.epiStart = d; const busy = new Set(G.epis.map((e) => e.uid));
    const cand = G.residents.filter((r) => r !== G.me && !busy.has(r.uid) && isFree(r)); const r = pickFair(G, cand);
    if (r) { const done = r.epiDone || []; const pool = EPIS.filter((e) => !done.includes(e.k) && !G.epis.some((x) => x.k === e.k) && (!e.need || G.pets.some((p) => p.owner === r.uid))); const E = rnd(pool); if (E) G.epis.push({ uid: r.uid, k: E.k, step: 0, v: Math.floor(Math.random() * 3), day: d - 1, at: 9.5 + Math.random() * 6 }); }
  }
  for (const e of [...G.epis]) {
    const r = G.byUid(e.uid), E = EPIS.find((x) => x.k === e.k); if (!r || !E) { G.epis.splice(G.epis.indexOf(e), 1); continue; }
    if (e.day >= d || h < e.at || h > 19 || r.state === 'sleep' || r.state === 'mini' || G.drama) continue;
    if (e.ask) { if (e.helped || d > e.askDay) { e.ask = false; if (r.need === 'episode') r.need = null; } else continue; }
    e.day = d; e.at = 9.5 + Math.random() * 7;
    const fr = Object.entries(r.rel).sort((a, b) => b[1] - a[1]).map(([u]) => G.byUid(+u)).find((o) => o && o !== G.me && o.state !== 'sleep');
    const pet = G.pets.find((p) => p.owner === r.uid);
    r.epiAsk = null; E.steps[e.step](G, r, fr, pet, e);
    if (r.epiAsk && G.me) { r.need = 'episode'; r.epiKey = e.k; e.ask = true; e.askDay = d; }
    G.watchPrompt && G.watchPrompt(r, `${r.name}の「${E.title(e)}」`, 14);
    e.step++;
    if (e.step >= E.steps.length) { G.epis.splice(G.epis.indexOf(e), 1); (r.epiDone = r.epiDone || []).push(e.k); }
  }
}
export function helpEpisode(G, r) { const e = (G.epis || []).find((x) => x.uid === r.uid); G.payReward && G.payReward(r, 'episode'); if (e) { e.helped = true; const E = EPIS.find((x) => x.k === e.k); if (E) r.pm(`「${E.title(e)}」を てつだって くれた`); } r.need = null; r.epiAsk = null; r.addRel(G.me, 8, G); r.say('ありがとう！ あしたの つづきも みてね！', 3.5, 'joy'); r.log(`${G.me.name}に てつだって もらった`); }
export const epiHint = (G, r) => { const e = (G.epis || []).find((x) => x.uid === r.uid); if (!e) return null; const E = EPIS.find((x) => x.k === e.k); return E ? `「${E.title(e)}」の おはなし（${e.step}/${E.steps.length}）` : null; };

// ---------- こうかんじょ
export const SHOP = [
  { k: 'gold', ic: '🌟', n: 'ペットへんしん「ゴールド」', c: 3, ok: (G) => !(G.unlock || {}).gold, buy: (G) => { (G.unlock = G.unlock || {}).gold = 1; } },
  { k: 'night', ic: '🌌', n: 'ペットへんしん「ほしぞら」', c: 3, ok: (G) => !(G.unlock || {}).night, buy: (G) => { (G.unlock = G.unlock || {}).night = 1; } },
  { k: 'hat', ic: '👒', n: 'めずらしい ぼうし', c: 2, ok: (G) => G.bag.hats.length < 19, buy: (G) => { const left = [...Array(20).keys()].filter((i) => i && !G.bag.hats.includes(i)); G.bag.hats.push(rnd(left)); } },
  { k: 'egg', ic: '🥚', n: 'ペットの たまご', c: 2, ok: () => true, buy: (G) => { G.bag.eggs++; } },
  { k: 'ticket', ic: '🎟️', n: 'パーティーけん', c: 1, ok: () => true, buy: (G) => { G.bag.tickets++; } },
  { k: 'treat', ic: '🍪', n: 'みんなに おかしを くばる', c: 1, ok: () => true, buy: (G) => { G.residents.forEach((r) => { r.hunger = Math.max(0, r.hunger - 30); if (!r.controlled && r.state !== 'sleep') r.say(rnd(['🍪 ありがとう！', 'おいしい〜！', 'あまーい！']), 3, 'joy'); if (G.me && r !== G.me) r.addRel(G.me, 3, G); }); } },
  { k: 'cake', ic: '🎂', n: 'おおきな ケーキ（みんなで たべる）', c: 2, ok: (G) => !!G.me, buy: (G) => { G.cakeAt = [Math.floor(G.me.p.x), Math.round(G.me.p.y), Math.floor(G.me.p.z)]; } },
];
export function swapGoal(G, i) {
  const L = G.goals; if (!L || !L.list[i] || L.list[i].done || L.list[i].swapped) return false;
  const have = L.list.map((g) => g.k); const pool = GOALS.filter((g) => !have.includes(g.k) && (!g.need || g.need(G)) && !(g.k === 'talk1'));
  const g = rnd(pool); if (!g) return false; const a = g.arg ? g.arg(G) : null;
  L.list[i] = { k: g.k, t: g.t(G, a), ic: g.ic, uid: a ? a.uid : null, done: false, swapped: true }; goalsCheck(G); return true;
}

// ---------- しまの せいちょう
export function islandStats(G) {
  const w = G.world, fl = new Set(G.flowerIds); const S = { flowers: 0, leaves: 0, furn: 0, beds: 0, lamps: 0, deco: 0, water: 0 };
  for (let k = 0; k < w.ids.length; k++) { const id = w.ids[k]; if (!id) continue; const d = B[id]; if (fl.has(id)) S.flowers++; else if (d.name && d.name.endsWith('のは')) S.leaves++; else if (d.shape === 'water') S.water++; if (d.cat === 'furn') { S.furn++; if (d.bed) S.beds++; } if (d.light) S.lamps++; if (d.name && /かべがみ|ラグ|カーテン|タイル/.test(d.name)) S.deco++; }
  S.residents = G.residents.length; S.hats = G.residents.filter((r) => r.f.hat).length; S.zukan = Object.keys(G.zukan || {}).length; S.pets = G.pets.length;
  const st = (v, a) => Math.max(1, Math.min(5, Math.round(v / a)));
  S.rate = { にぎやかさ: st(S.residents * 3 + S.furn / 4 + S.pets * 2, 14), おしゃれ: st(S.deco / 8 + S.lamps / 3 + S.hats * 2, 12), しぜん: st(S.flowers / 40 + S.leaves / 600 + S.water / 1200, 4.5) };
  return S;
}
export function islandReport(G) {
  const S = islandStats(G); const P = (G.isleStats || []).slice(-1)[0]; G.isleStats = [...(G.isleStats || []), { d: G.day, flowers: S.flowers, furn: S.furn, residents: S.residents, zukan: S.zukan, hats: S.hats }].slice(-12);
  if (!P) return S;
  const diff = [['🌷 はな', S.flowers - P.flowers], ['🪑 かぐ', S.furn - P.furn], ['👫 なかま', S.residents - P.residents], ['📖 ずかん', S.zukan - P.zukan], ['🎀 ぼうし', S.hats - P.hats]].filter(([, v]) => v > 0);
  if (diff.length) G.news(`🏝️ しまレポート（${P.d}にちめ→${G.day}にちめ）：${diff.map(([n, v]) => `${n} +${v}`).join('・')}`);
  const r = G.residents.find((o) => o !== G.me && isFree(o)); if (r) r.say(rnd(['しま、かわったね！', 'さいしょより にぎやかに なった！', 'この しま、どんどん すてきに なるね！']), 4, 'joy');
  return S;
}

// ---------- プレイヤーとの おもいで・つかう ときの ひとこと
export function onUse(G, r, use) {
  const key = use.at.join(','), pl = G.placed && G.placed[key];
  if (pl && G.me && r !== G.me && G.day - pl.d <= 7 && Math.random() < 0.6) { r.pm(`${pl.n}を おいて くれた`); return `${G.me.name}が おいてくれた ${pl.n}、だいすき！`; }
  if (use.kind === 'mail' && G.me && r !== G.me && Math.random() < 0.4 && !(G.mail || []).some((m) => m.from === r.uid && m.d === G.day)) { G.mail.push(makeLetter(G, r)); G.mail = G.mail.slice(-24); G.news(`📮 ${r.name}が ${G.me.name}に てがみを だした！`); G.onMail && G.onMail(); return `📮 ${G.me.name}に てがみ だそうっと`; }
  if (use.kind === 'kotatsu' && ((G.day - 1) % 14) >= 11) return '🍊 ぬくぬく〜 さむい ひは こたつが いちばん！';
  return null;
}
export function memLine(G, r) { const m = r.pmRecall && r.pmRecall(); if (!m || !G.me) return null; const ago = G.day - m.d; const when = ago === 0 ? 'さっき' : ago === 1 ? 'きのう' : 'このまえ'; return rnd([`${when} ${m.t}ね！ ありがとう`, `${when} ${m.t}の、おぼえてる？ うれしかった〜`, `${G.me.name}、${when} ${m.t}よね！ だいすき！`]); }

// ---------- ちいさな やさしさ
export function kindTick(G, dt) {
  G.kindCD = (G.kindCD ?? 30) - dt; if (G.kindCD > 0 || G.drama || G.dayEv) return; G.kindCD = 25 + Math.random() * 30;
  const free = G.residents.filter((r) => r !== G.me && isFree(r)); if (free.length < 2) return;
  const near = (a) => free.filter((o) => o !== a && o.dist(a) < 10).sort((x, y) => (a.rel[y.uid] || 0) - (a.rel[x.uid] || 0))[0];
  const meet = (b, a, say, mode) => { if (b.goTo(G, a.p.x + 1, a.p.y, a.p.z)) { b.state = 'goevent'; b.evMode = mode || 'wave'; b.evT = 4; b.evSay = say; b.evFace = [a.p.x, a.p.z]; return true; } return false; };
  const tell = (t) => { if (Math.random() < 0.35) G.news('💝 ' + t); };
  const W = G.weather && G.weather.k;
  const opts = [];
  if (W === 'rain') { const a = free.find((r) => !G.roofed(G, r.p.x, r.p.y, r.p.z)); const b = a && near(a); if (a && b) opts.push(() => { if (meet(b, a, '☂️ かさ いっしょに はいろう！')) { setTimeout(() => a.say('ありがとう！ ぬれなくて すむ〜', 3, 'joy'), 4500); b.addRel(a, 4, G); a.log(`${b.name}が かさに いれてくれた ☂️`); tell(`${b.name}が ${a.name}を かさに いれてあげた`); } }); }
  const sad = free.find((r) => Object.values(r.quarrel || {}).includes(G.day) || r.mood < 35); const sb = sad && near(sad); if (sad && sb && !sb.quarrel[sad.uid]) opts.push(() => { if (meet(sb, sad, '🌸 げんき だして！ これ あげる')) { setTimeout(() => { sad.say('ありがとう…！ げんき でた！', 3, 'joy'); sad.mood = Math.min(100, (sad.mood || 50) + 20); }, 4500); sb.addRel(sad, 5, G); sad.log(`${sb.name}が おはなを くれた 🌸`); tell(`${sb.name}が おちこんでいた ${sad.name}に おはなを あげた`); } });
  if (G.hour >= 19.5) { const pt = G.pets.find((p) => p.sleeping && !p.blanket); const b = pt && free.filter((o) => Math.hypot(o.p.x - pt.p.x, o.p.z - pt.p.z) < 12)[0]; if (pt && b) opts.push(() => { if (b.goTo(G, pt.p.x + 0.8, pt.p.y, pt.p.z)) { b.state = 'goevent'; b.evMode = 'cook'; b.evT = 3; b.evSay = `🧣 ${pt.name}に もうふ かけて あげるね`; b.evFace = [pt.p.x, pt.p.z]; setTimeout(() => { pt.blanket = true; }, 4000); b.log(`${pt.name}に もうふを かけた`); tell(`${b.name}が ねている ${pt.name}に もうふを かけてあげた`); } }); }
  const cook = G.residents.find((r) => r.state === 'using' && r.use && r.use.kind === 'cook'); const cb = cook && near(cook); if (cook && cb) opts.push(() => { if (meet(cb, cook, '🍳 てつだうよ！', 'cook')) { setTimeout(() => cook.say('たすかる〜！ いっしょに つくろう', 3, 'joy'), 4200); cb.addRel(cook, 4, G); tell(`${cb.name}が ${cook.name}の りょうりを てつだった`); } });
  if (opts.length) rnd(opts)();
}

// ---------- じぶんたちで あそびを はじめる
const ROLE = (r) => ['おにいさん', 'あかちゃん', 'おかあさん', 'ねこ', 'あかちゃん', 'いぬ', 'おとうさん'][r.f.personality % 7];
const PLAYS = [
  { k: 'chairs', n: '🪑 いすとりゲーム', find: (G, p) => { const out = []; const fx = Math.floor(p.x), fy = Math.floor(p.y), fz = Math.floor(p.z); for (let y = fy - 2; y <= fy + 2; y++) for (let z = fz - 8; z <= fz + 8; z++) for (let x = fx - 8; x <= fx + 8; x++) { const id = G.world.get(x, y, z); if (id && B[id].seat && B[id].model !== 'sofa') out.push([x, y, z]); } return out.length >= 3 ? out.slice(0, 4) : null; },
    run: (G, ps, at) => { const c = at.reduce((a, q) => [a[0] + q[0] / at.length, a[1] + q[1] / at.length, a[2] + q[2] / at.length], [0, 0, 0]); ps.forEach((r, i) => { const an = (i / ps.length) * 6.28; if (r.goTo(G, c[0] + Math.cos(an) * 2.2, c[1], c[2] + Math.sin(an) * 2.2)) { r.state = 'goevent'; r.evMode = 'dance'; r.evT = 7; r.evSay = '🎵 ラララ〜'; r.evFace = [c[0], c[2]]; } });
      setTimeout(() => { ps[0].say('ストップ！', 2, 'surprise'); const ch = ps.slice(0, at.length); ch.forEach((r, i) => { r.path = null; if (r.goTo(G, at[i][0] + 0.5, at[i][1], at[i][2] + 0.5)) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 5; r.evSay = rnd(['すわれた！', 'セーフ！', 'やったー！']); } }); const out = ps[at.length]; if (out) setTimeout(() => out.say(out.f.personality === 6 ? 'まけちゃった… えへへ' : 'まけた〜！ あはは！ もう1かい！', 3, 'joy'), 2500); }, 9000); } },
  { k: 'house', n: '🍳 おままごと', find: (G, p) => { const t = G.findUse(p, 10, ['cook']); const d = G.findUse(p, 10, ['dine']); return t && d ? [t, d] : null; },
    run: (G, ps, [k, d]) => { ps.forEach((r, i) => { const tgt = i === 0 ? k : d; if (r.goTo(G, tgt[0] + (i % 2), tgt[1], tgt[2] + 1 + Math.floor(i / 2) * 0.3)) { r.state = 'goevent'; r.evMode = i === 0 ? 'cook' : 'sit'; r.evT = 9; r.evSay = i === 0 ? `わたし ${ROLE(r)}やく！ ごはん できたよ〜` : ROLE(r) === 'あかちゃん' ? 'ばぶばぶ〜' : ROLE(r) === 'ねこ' ? 'にゃーん' : ROLE(r) === 'いぬ' ? 'わん！' : `${ROLE(r)}やく！ いただきまーす`; r.evFace = [d[0] + 0.5, d[2] + 0.5]; } }); setTimeout(() => ps[ps.length - 1].say('おいしいね〜（ごっこ）', 2.5, 'joy'), 9000); } },
  { k: 'shop', n: '🏪 おみせやさんごっこ', find: (G, p) => { const t = G.findUse(p, 10, ['cook', 'snack']) || G.findUse(p, 10, ['dine']); return t ? [t] : null; },
    run: (G, ps, [t]) => { const [a, ...cs] = ps; if (a.goTo(G, t[0], t[1], t[2] + 1)) { a.state = 'goevent'; a.evMode = 'wave'; a.evT = 12; a.evSay = 'いらっしゃいませ〜！ なんでも 100えん！'; a.evFace = [t[0] + 0.5, t[2] + 3]; } cs.forEach((r, i) => { if (r.goTo(G, t[0] - 1 + i, t[1], t[2] + 2.5)) { r.state = 'goevent'; r.evMode = 'walk'; r.evT = 6 + i * 2; r.evSay = rnd(['これ ください！', 'おすすめは なんですか？', 'はい、100えん！']); r.evFace = [t[0] + 0.5, t[2] + 0.5]; } }); setTimeout(() => a.say('まいど ありがとう ございます！', 2.5, 'joy'), 10000); } },
  { k: 'plush', n: '🧸 ぬいぐるみの おたんじょうびかい', find: (G, p) => { const t = G.findUse(p, 12, ['play']); return t && ['bear', 'bunny', 'penguin'].includes(B[G.world.get(t[0], t[1], t[2])]?.model) ? [t] : null; },
    run: (G, ps, [t]) => { ps.forEach((r, i) => { const an = (i / ps.length) * 6.28; if (r.goTo(G, t[0] + 0.5 + Math.cos(an) * 1.8, t[1], t[2] + 0.5 + Math.sin(an) * 1.8)) { r.state = 'goevent'; r.evMode = 'cheer'; r.evT = 9; r.evSay = i ? rnd(['おめでとう〜！', '🎂 ケーキも あるよ！', 'なんさいに なったの？']) : `${B[G.world.get(t[0], t[1], t[2])].name.replace('の ぬいぐるみ', '').replace('のぬいぐるみ', '')}ちゃん、おたんじょうび おめでとう！`; r.evFace = [t[0] + 0.5, t[2] + 0.5]; } }); setTimeout(() => { G.party = { x: t[0], y: t[1], z: t[2], t: 6 }; ps[0].say('🎵 ハッピーバースデー トゥーユー♪', 3, 'joy'); }, 8000); } },
];
export function playTick(G, dt) {
  G.playCD = (G.playCD ?? 50) - dt; if (G.playCD > 0 || G.hour < 9 || G.hour >= 18 || G.drama || G.dayEv || G.mini) return; G.playCD = 70 + Math.random() * 70;
  const free = G.residents.filter((r) => r !== G.me && isFree(r)); if (free.length < 3) return;
  const lead = pickFair(G, free); const ps = [lead, ...free.filter((o) => o !== lead && o.dist(lead) < 14).sort((a, b) => (lead.rel[b.uid] || 0) - (lead.rel[a.uid] || 0))].slice(0, 4); if (ps.length < 3) return;
  const pool = PLAYS.map((P) => [P, P.find(G, lead.p)]).filter(([, at]) => at); if (!pool.length) return;
  const pool2 = pool.length > 1 ? pool.filter(([P]) => P.k !== G.lastPlay) : pool; const [P, at] = rnd(pool2); G.lastPlay = P.k; P.run(G, ps, at); afterPlay(G, P.k, ps);
  G.news(`🎲 ${lead.name}たちが ${P.n}を はじめた！`); ps.forEach((r) => r.log(`${P.n.replace(/^\S+\s/, '')}を した`)); ps.forEach((a) => ps.forEach((b) => a !== b && a.addRel(b, 1, G)));
  G.watchPrompt && G.watchPrompt(lead, P.n, 18); setTimeout(() => G.photo && G.photo(ps.slice(0, 4), P.n), 11000);
}

// ---------- よるの とくべつな じかん
export function nightTick(G, dt) {
  const h = G.hour, d = G.day; G.nDone = G.nDone || {};
  const clear = !(G.weather && G.weather.k !== 'sun');
  if (h >= 20.6 && h < 21 && !G.nDone['b' + d]) { G.nDone['b' + d] = 1; const L = G.residents.filter(isFree); const rd = L.find((r) => r.f.personality === 2) || L[0]; if (rd && L.length >= 3) { const kids = L.filter((o) => o !== rd).slice(0, 3); const SL = ['くまさんの ぼうけん', 'ほしの こどもの おはなし', 'くもの うえの おしろ', 'まいごの ペンギン', 'ねこの パンやさん', 'つきに いった うさぎ', 'おおきな かぶ', 'にじの はし']; const story = SL[(d * 3) % SL.length]; rd.path = null; rd.state = 'event'; rd.evMode = 'sit'; rd.timer = 14; rd.say(`📖 むかしむかし… 「${story}」`, 5); kids.forEach((k, i) => { if (k.goTo(G, rd.p.x + Math.cos(i * 2) * 1.4, rd.p.y, rd.p.z + Math.sin(i * 2) * 1.4)) { k.state = 'goevent'; k.evMode = 'sit'; k.evT = 9; k.evSay = rnd(['わくわく…', 'それで それで？', 'ふわぁ… ねむくなってきた']); k.evFace = [rd.p.x, rd.p.z]; } }); setTimeout(() => rd.say('…めでたし めでたし。おやすみ〜', 3.5, 'joy'), 9000); G.news(`📖 おやすみまえの えほんタイム「${story}」`); G.watchPrompt && G.watchPrompt(rd, 'えほんタイム', 16); [rd, ...kids].forEach((r) => r.log(`えほん「${story}」を よんだ`)); } }
  if (h >= 21 && h < 21.4 && clear && !G.nDone['w' + d]) { G.nDone['w' + d] = 1; const full = d % 7 === 0; const L = G.residents.filter(isFree).slice(0, full ? 8 : 3); if (L.length >= 2) { G.shootStar = full ? 20 : 12; const sp = (G.hills && G.hills[0]) || [Math.floor(G.center.x), 23, Math.floor(G.center.z)]; G.news(full ? '🌕 きょうは まんげつ！ みんなで おつきみ' : '🌠 ながれぼし… おねがい しよう'); L.forEach((r, i) => { const an = i * 0.8; if (r.goTo(G, sp[0] + Math.cos(an) * 2, sp[1], sp[2] + Math.sin(an) * 2)) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 10; const D = r.dream && DREAMS[r.dream]; r.evSay = D ? `🌠 ${D.t.replace(/たい$/, 'たい')}…かないますように` : rnd(['🌠 みんなと ずっと なかよし でいられますように', '🌠 あしたも はれますように', full ? '🌕 おつきさま まんまる！' : '🌠 ねがいごと した！']); r.evFace = [sp[0] + 10, sp[2]]; } }); setTimeout(() => { const [a, b] = L; if (a && b) { a.say('🤫 ねえ… なに おねがい した？', 3); setTimeout(() => b.say('ひみつ〜 えへへ', 3, 'shy'), 1800); } }, 11000); } }
  if (h >= 21 && h < 22 && Math.random() < dt * 0.02) { const a = G.residents.find((r) => isFree(r) && r.ch.pj); const b = a && G.residents.find((o) => o !== a && isFree(o) && o.dist(a) < 6); if (a && b) { a.say(rnd(['🤫 ひそひそ… パジャマ かわいいね', '🤫 あしたの あさ いっしょに あそぼ', '🤫 おばけ でたら どうする？']), 3); setTimeout(() => b.say(rnd(['えへへ、ありがと', 'うん！ やくそく', 'きゃー！ こわい〜']), 3, 'shy'), 1700); } }
}

// ---------- あそびの つづき・えの かんそう・めずらしい できごと
export function afterPlay(G, k, ps) {
  if (k === 'chairs' && Math.random() < 0.6) setTimeout(() => { const [oni, ...o] = ps; oni.say('つぎは かくれんぼ しよう！ もういいかい？', 3, 'joy'); o.forEach((r, i) => { const a = Math.random() * 6.28; if (r.goTo(G, r.p.x + Math.cos(a) * 7, r.p.y, r.p.z + Math.sin(a) * 7)) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 8; r.evSay = i ? 'まーだだよ！' : 'もういいよ〜！'; } }); setTimeout(() => { const t = o[0]; if (t && oni.goTo(G, t.p.x + 1, t.p.y, t.p.z)) { oni.state = 'goevent'; oni.evMode = 'joy'; oni.evT = 3; oni.evSay = `${t.name}、みーつけた！`; setTimeout(() => t.say('みつかっちゃった〜！ あはは', 3), 5500); } }, 9000); }, 16000);
  if (k === 'shop') setTimeout(() => { const [a, ...cs] = ps; a.say('🍬 きょうは とくべつ！ おかし くばるよ！', 3, 'joy'); cs.forEach((r) => { r.hunger = Math.max(0, r.hunger - 20); setTimeout(() => r.say('🍬 やったー！ ありがとう！', 2.5, 'joy'), 1500); }); if (G.me && a.dist(G.me) < 10) { G.bag.food[13] = (G.bag.food[13] || 0) + 1; G.news(`🍬 ${a.name}の おみせから おかしを もらった！`); } }, 13000);
  if (k === 'house') ps.forEach((r) => r.log(`おままごとで ${ROLE(r)}やくを した`));
}
export function artTick(G, dt) {
  G.artCD = (G.artCD ?? 20) - dt; if (G.artCD > 0) return; G.artCD = 30 + Math.random() * 40;
  const keys = Object.keys(G.arts || {}); if (!keys.length) return;
  const k = rnd(keys); const [x, y, z] = k.split(',').map(Number); const r = G.residents.filter((o) => o !== G.me && isFree(o) && Math.hypot(o.p.x - x, o.p.z - z) < 14)[0]; if (!r) return;
  if (r.goTo(G, x + 0.5, y, z + 1.6)) { r.state = 'goevent'; r.evMode = 'walk'; r.evT = 4; r.evSay = rnd(['この え、すてき！', 'だれが かいたのかな？ じょうず！', 'みてると にこにこ しちゃう', 'わたしも こんな え かきたい！', 'この いろ だいすき！']); r.evFace = [x + 0.5, z + 0.5]; if (G.me) r.pm('すてきな えを かざって くれた'); }
}
export function weeklyArt(G) {
  const wk = Math.floor((G.day - 1) / 7); if (G.artWk === wk || !(G.gallery || []).length || !G.signAt) return; G.artWk = wk;
  G.arts[G.signAt.join(',')] = G.gallery[G.gallery.length - 1].img; G.refreshArts && G.refreshArts(); G.news('🏆「こんしゅうの 1まい」を ひろばの かんばんに かざったよ！');
}
const RARE = [
  { k: 'whale', n: '🐋 うみに くじらが あらわれた！', e: '🐋', say: ['くじらだー！', 'おおきい〜！', 'しおふいてる！'] },
  { k: 'balloon', n: '🎈 ききゅうが とんできた！', e: '🎈', say: ['ききゅうだ！', 'のってみたい〜', 'おーい！'] },
  { k: 'butterfly', n: '🦋 にじいろの ちょうちょが きた！ つかまえられるかな？', e: '🦋', say: ['きれい〜！', 'にじいろだ！', 'まって〜！'] },
];
export function rareTick(G) {
  if ((G.day - 1) % 7 !== 3 || G.hour < 13 || G.hour >= 14 || G.rareDay === G.day) return; G.rareDay = G.day;
  const R = RARE[Math.floor((G.day - 1) / 7) % RARE.length]; G.news(R.n); G.spawnRare && G.spawnRare(R); G.sfx.rare && G.sfx.rare();
  const ps = G.residents.filter(isFree).slice(0, 6); const vp = G.rareView ? G.rareView() : null;
  ps.forEach((r, i) => { if (vp && r.goTo(G, vp[0] + (i % 3) - 1, vp[1], vp[2] + Math.floor(i / 3))) { r.state = 'goevent'; r.evMode = 'wave'; r.evT = 10; r.evSay = rnd(R.say); r.evFace = [vp[3], vp[4]]; } else r.say(rnd(R.say), 3, 'surprise'); r.log(`${R.n.replace(/^\S+\s/, '').replace(/！.*$/, '')}のを みた ${R.e}`); r.pm && G.me && r.pm(`いっしょに ${R.e}を みた`); });
  (G.rareLog = G.rareLog || []).push({ d: G.day, n: R.n }); setTimeout(() => G.photo && G.photo(ps.slice(0, 4), R.n.replace(/！.*$/, '！'), { rare: true }), 14000);
  G.watchPrompt && G.watchPrompt(G.residents.find(isFree), R.n.slice(0, 14), 14);
}

// ---------- しんゆう
export function onBestie(G, a, b) {
  const hat = a.f.hat || b.f.hat || 2; [a, b].forEach((r) => { r.f.hat = hat; G.rebuildResident(r); r.spinT = 1.5; });
  a.say(`${b.name}、ずっと しんゆう だよ！`, 3.5, 'joy'); setTimeout(() => b.say('おそろいの ぼうしに しよ！', 3, 'joy'), 1800);
  G.news(`💞 ${a.name}と ${b.name}が しんゆうに！ おそろいの ぼうしで きねんしゃしん`); G.sfx.rare && G.sfx.rare();
  (a.besties = a.besties || []).includes(b.uid) || a.besties.push(b.uid); (b.besties = b.besties || []).includes(a.uid) || b.besties.push(a.uid);
}
export function bestieTick(G, dt) {
  if (G.hour < 10 || G.hour >= 17 || G.bfDay === G.day || G.drama || G.dayEv) return;
  const pairs = []; for (const a of G.residents) for (const b of G.residents) if (a.uid < b.uid && a !== G.me && b !== G.me && (a.rel[b.uid] || 0) >= 95 && isFree(a) && isFree(b)) pairs.push([a, b]);
  if (!pairs.length || Math.random() > dt * 0.02) return; G.bfDay = G.day; const [a, b] = rnd(pairs);
  const spots = [...(G.hills || []), G.places && G.places.sunset, G.places && G.places.park].filter(Boolean); const sp = spots.length ? rnd(spots) : [Math.floor(G.center.x) + 8, 23, Math.floor(G.center.z) + 8];
  a.say(`${b.name}、ふたりで おでかけ しよ！`, 3, 'joy'); setTimeout(() => b.say('いく いく！ ふたりだけの ひみつの ばしょ！', 3, 'joy'), 1500);
  [a, b].forEach((r, i) => { if (r.goTo(G, sp[0] + i, sp[1], sp[2])) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 12; r.evSay = i ? '🤫 しんゆう だけの ひみつ、おしえてあげる…' : 'ここ、ふたりの ひみつきち だね'; r.evFace = [sp[0] + 0.5, sp[2] + 6]; } });
  setTimeout(() => { a.say('🤫 …だれにも ないしょ だよ', 3, 'shy'); setTimeout(() => b.say('えへへ、やくそく！', 3, 'shy'), 1600); G.photo && G.photo([a, b], `${a.name}と ${b.name}、しんゆうの おでかけ`); }, 20000);
  G.news(`💞 しんゆうの ${a.name}と ${b.name}が ふたりで おでかけ`); G.watchPrompt && G.watchPrompt(a, 'しんゆうの おでかけ', 18); a.log(`${b.name}と ふたりで おでかけ 💞`); b.log(`${a.name}と ふたりで おでかけ 💞`);
}

// ---------- ぼんやり たのしい ちいさな こと
const MUTTER = ['きょうの くもは ソフトクリーム みたい…', 'あしの ゆびって なんで 5ほん なんだろ', 'おなかの むしが ないてる…', 'ゆめは おそらの パンやさん！', 'ありさん、どこ いくの？', 'くしゃみ でそう… でない', 'ぼく、きょう ちょっと かっこいい？', 'あ、いま かぜが わらった'];
export function idleTick(G, dt) {
  G.idleCD = (G.idleCD ?? 6) - dt; if (G.idleCD > 0 || G.hour < 7 || G.hour >= 20) return; G.idleCD = 6 + Math.random() * 6;
  const f = G.me ? G.me.p : G.watch ? G.watch.p : G.freePos; if (!f) return;
  const L = G.residents.filter((r) => r !== G.me && r.state === 'idle' && Math.hypot(r.p.x - f.x, r.p.z - f.z) < 25); if (!L.length) { const pt = G.pets.find((p) => !p.sleeping && Math.random() < 0.5); if (pt) { pt.doTrick(rnd(['spin', 'jump'])); pt.say(rnd(['♪', 'くるりん！', 'ぴょん！']), 1.5); } return; }
  const r = rnd(L); const k = Math.floor(Math.random() * 4);
  if (k === 0) { const fl = G.findNear(r.p, (d) => G.flowerIds.includes(d.id), 6); if (fl && r.goTo(G, fl[0] + 1, fl[1], fl[2])) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 3; r.evSay = rnd(['くんくん… いいにおい', 'この はな、なんて なまえ？', 'おはなさん、こんにちは']); r.evFace = [fl[0] + 0.5, fl[2] + 0.5]; return; } }
  if (k === 1) { const a = Math.random() * 6.28; if (r.goTo(G, r.p.x + Math.cos(a) * 4, r.p.y, r.p.z + Math.sin(a) * 4)) { r.state = 'goevent'; r.evMode = 'joy'; r.evT = 2; r.evSay = rnd(['まって〜 ちょうちょ！', 'あっ にげた〜', 'つかまえた… と おもったのに！']); return; } }
  if (k === 2) { const s = G.findNear(r.p, (d) => d.seat, 6); if (s && r.goTo(G, s[0], s[1], s[2])) { r.state = 'goevent'; r.evMode = 'sit'; r.evT = 6; r.evSay = '…ぼーっ'; return; } }
  r.say(rnd(MUTTER), 3); r.timer = 2;
}

// ---------- ペットも しまの なかま
export function petTick(G, dt) {
  G.petCD = (G.petCD ?? 15) - dt; if (G.petCD > 0 || G.hour < 7 || G.hour >= 21) return; G.petCD = 30 + Math.random() * 40;
  const pets = G.pets.filter((p) => !p.sleeping && !p.comfort); if (!pets.length) return;
  const sad = G.residents.find((r) => r !== G.me && r.state !== 'sleep' && (Object.values(r.quarrel || {}).includes(G.day) || r.mood < 40 || (r.bubbleKind === 'sad' && r.bubbleT > 0)));
  if (sad && Math.random() < 0.7) { const p = pets.sort((a, b) => Math.hypot(a.p.x - sad.p.x, a.p.z - sad.p.z) - Math.hypot(b.p.x - sad.p.x, b.p.z - sad.p.z))[0]; p.comfort = { uid: sad.uid, t: 14, done: false }; G.stats.petInt = (G.stats.petInt || 0) + 1; return; }
  const p = rnd(pets); const r = G.residents.filter((o) => o !== G.me && isFree(o) && Math.hypot(o.p.x - p.p.x, o.p.z - p.p.z) < 10 && o.uid !== p.owner)[0];
  if (r && Math.random() < 0.45) { r.say(rnd([`${p.name}〜！ おいで〜`, `${p.name}、あそぼ！`, `${p.name}ちゃん、こっち こっち`, `あ、${p.name}だ！ なでなで させて`, `${p.name}、きょうも かわいいね`]), 2.5, 'joy'); p.comfort = { uid: r.uid, t: 8, done: false, call: true }; G.stats.petInt = (G.stats.petInt || 0) + 1; }
}
export function petArrive(G, p, r) {
  const c = p.comfort; c.done = true; p.doTrick('jump'); p.say('🐾 すりすり', 2.5);
  if (c.call) { r.say(rnd([`${p.name}、かわいい〜！`, `よしよし、${p.name}`, `${p.name}は もふもふ だね`]), 3, 'joy'); p.love += 2; if (p.owner !== r.uid && Math.random() < 0.3) { p.fav = r.uid; G.news(`🐾 ${p.name}は ${r.name}も だいすき みたい`); } return; }
  r.path = null; r.state = 'event'; r.evMode = 'sit'; r.timer = 5; r.evFace = [p.p.x, p.p.z]; const off = 0.5 + p.size * 0.35 + (p.shape === 3 ? 0.2 : 0); p.p.x = r.p.x + Math.sin(r.yaw) * off; p.p.z = r.p.z + Math.cos(r.yaw) * off; if (G.world.solidAt(p.p.x, p.p.y + 0.3, p.p.z)) { p.p.x = r.p.x - Math.sin(r.yaw) * off; p.p.z = r.p.z - Math.cos(r.yaw) * off; } p.comfort.t = 4.5; p.comfort.hold = true;
  setTimeout(() => { p.doTrick('spin'); G.effect && G.effect('heart', p); }, 1300);
  setTimeout(() => { const small = p.size < 0.9 && p.shape !== 3 && !p.wings; r.evMode = small ? 'cheer' : 'joy'; r.say(`${p.name}、なぐさめて くれるの？ ありがとう！ ${small ? 'だっこ〜' : p.wings ? 'ふわふわの はね〜' : 'よしよし'}`, 3.5, 'joy'); r.mood = Math.min(100, (r.mood || 50) + 25); G.effect && G.effect('heart', r); }, 900);
  p.love += 4; if (p.owner !== r.uid) p.fav = r.uid; r.log(`${p.name}が なぐさめて くれた 🐾`); if (Math.random() < 0.5) G.news(`💝 ${p.name}が おちこんでいた ${r.name}を なぐさめた`);
}
