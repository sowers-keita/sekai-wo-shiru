// ミニゲーム（かくれんぼ・ダンス・つり・おえかきしょうぶ）1かい 1〜2ふん
import { drawIcon } from './icons.js';
import * as THREE from 'three';
import { standable, FOODS } from './life.js';
import { B } from './blocks.js';
import { faceIcon } from './chars.js';
import { openDraw } from './draw.js';
import { speak } from './study.js';
import { SFX } from './audio.js';
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
let G = null, box = null;
const panel = () => { if (!box) { box = h('div', '', ''); box.id = 'mini'; document.body.appendChild(box); } box.className = 'show'; box.innerHTML = ''; box._tok = null; return box; };
const closePanel = () => { if (box) { box.className = ''; box.innerHTML = ''; } };
function finish(r, ok, title) {
  G.mini = null; closePanel();
  if (r) { r.hidden = false; r.state = 'idle'; r.timer = 1.5; r.mode = 'walk'; }
  if (ok && r && G.me) { G.count && G.count('play'); r.addRel(G.me, 10, G); G.me.addRel(r, 10, G); r.addExp(12, G); r.log(`${G.me.name}と ${title}を した`); r.pm(G.mini && G.mini.fish ? `いっしょに ${G.mini.fish}を つった` : `いっしょに ${title}を した`); const i = Math.floor(Math.random() * FOODS.length); G.bag.food[i] = (G.bag.food[i] || 0) + 1; G.news(`🎁 ごほうび：${FOODS[i][0]} ${FOODS[i][1]}`); }
}
const LV = () => (G.miniLv = G.miniLv || {});
const STAR = (n) => '★'.repeat(n + 1);
const hold = (r, mode) => { r.path = null; r.state = 'mini'; r.evMode = mode; r.evFace = G.me ? [G.me.p.x, G.me.p.z] : null; };

// ---------- さそいカード
export function invite(g, r) {
  G = g; if (G.mini) return;
  const P = panel(); P.classList.add('inv'); const my = {}; P._tok = my;
  const top = h('div', 'mtop'); top.appendChild(faceIcon(r.f, r.drawingCanvas, 76)); top.appendChild(h('div', 'mtxt', `<b>${r.name}</b>「いっしょに あそぼ！」`)); P.appendChild(top);
  const row = h('div', 'mrow'); P.appendChild(row);
  const L = LV(); const opts = [['🙈', `かくれんぼ ${STAR(Math.min(2, L.hide || 0))}`, () => hide(r)], ['💃', `ダンス ${STAR(L.dance || 0)}`, () => dance(r)], ['🎣', `つり ${L.fishBest ? L.fishBest + 'cm' : ''}`, () => fish(r)], ['🎨', `おえかき ${STAR(Math.min(2, Math.floor((L.paint || 0) / 3)))}`, () => paint(r)], ['👋', 'またね', () => { r.say(rnd(['うん！ またね！', 'じゃあ ひとりで あそぼっと！', 'わかった〜 またこんど！']), 3); finish(r, false); }]];
  for (const [ic, n, fn] of opts) { const b = h('button', 'mbig', `<span>${ic}</span><i>${n}</i>`); b.onclick = () => { clearTimeout(tm); SFX.pop(); fn(); }; row.appendChild(b); }
  speak(`${r.name}、いっしょに あそぼ`);
  const tm = setTimeout(() => { if (box && box._tok === my && box.classList.contains('inv')) { r.say('じゃあ ひとりで あそぼっと！', 3); finish(r, false); } }, G.inviteWait || 16000);
}

// ---------- かくれんぼ
function hide(r) {
  const P = panel(); P.classList.add('dark'); P.appendChild(h('div', 'mcount', '🙈 めを つぶって… <b>3</b>'));
  G.mini = { k: 'hide', r }; hold(r, 'walk'); speak('いーち、にーい、さーん');
  let n = 3; const iv = setInterval(() => { n--; const b = $('b', P); if (b) b.textContent = n; if (n <= 0) { clearInterval(iv); start(); } }, 1000);
  const start = () => {
    const w = G.world, me = G.me.p; let best = null, bs = -1;
    const hl = Math.min(2, LV().hide || 0); for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, d = 7 + hl * 3 + Math.random() * (11 + hl * 4); const x = Math.floor(me.x + Math.cos(a) * d), z = Math.floor(me.z + Math.sin(a) * d);
      for (let dy = -3; dy <= 3; dy++) { const y = Math.floor(me.y) + dy; if (!standable(w, x, y, z)) continue; let s = G.roofed(G, x + 0.5, y, z + 0.5) ? 4 : 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const yy of [y, y + 1]) { const id = w.get(x + dx, yy, z + dz); if (id && id !== 0) s += 1; } s += Math.random() * 2; if (s > bs) { bs = s; best = [x, y, z]; } break; } }
    if (!best) best = [Math.floor(me.x) + 8, Math.floor(me.y), Math.floor(me.z)];
    r.p.x = best[0] + 0.5; r.p.y = best[1] + 0.02; r.p.z = best[2] + 0.5; r.p.vy = 0; r.hidden = true; hold(r, 'idle'); r.evFace = null;
    let T = 90, call = 8 + hl * 3; P.className = 'show bar'; P.innerHTML = '<div class="mhud">🙈 <b>さがしてね！</b> <span class="mt"></span> <span class="mh"></span></div>';
    const tick = () => {
      if (G.mini?.k !== 'hide') return;
      const dt = 0.25; T -= dt; call -= dt; const d = Math.hypot(r.p.x - G.me.p.x, r.p.z - G.me.p.z) + Math.abs(r.p.y - G.me.p.y);
      $('.mt', P).textContent = `のこり ${Math.ceil(T)}びょう`;
      $('.mh', P).textContent = d < 4 ? '🔥🔥 すごく あつい！' : d < 8 ? '🔥 あったかい' : d < 13 ? '🙂 ちょっと ちかい' : '❄️ つめたい';
      if (call <= 0) { call = 10 + hl * 4; const dir = Math.atan2(r.p.x - G.me.p.x, r.p.z - G.me.p.z) - (G.yaw + Math.PI); const s = Math.sin(dir); G.news(`${r.name}「こっちだよ〜」${Math.abs(s) < 0.4 ? (Math.cos(dir) > 0 ? '（まえの ほう）' : '（うしろの ほう）') : s > 0 ? '（ひだりの ほう）' : '（みぎの ほう）'}`); SFX.babble(r.f.personality, 4, r.f.voice || 1); }
      if (d < 2.4) { const up = (LV().hide || 0) < 2; LV().hide = (LV().hide || 0) + 1; if (up) setTimeout(() => G.news(`🙈 かくれんぼが ${STAR(Math.min(2, LV().hide))} に！ つぎは もっと じょうずに かくれるよ`), 2500); r.hidden = false; r.say('みつかっちゃった〜！', 3, 'surprise'); SFX.ok(); G.news(`🙈 ${r.name}を みつけた！`); setTimeout(() => G.photo && G.photo([r, G.me], `${r.name}と かくれんぼ`), 1500); finish(r, true, 'かくれんぼ'); r.state = 'event'; r.evMode = 'joy'; r.timer = 3; return; }
      if (T <= 0) { r.hidden = false; r.say('ここだよ〜！ かくれんぼ じょうずでしょ', 3.5, 'joy'); G.news(`🙈 ${r.name}は ここに かくれてた！`); finish(r, false); return; }
      setTimeout(tick, 250);
    };
    tick();
  };
}

// ---------- ダンス
function dance(r) {
  G.mini = { k: 'dance', r }; hold(r, 'dance');
  G.residents.filter((o) => o !== r && o !== G.me && !o.controlled && o.state !== 'sleep' && o.state !== 'mini' && o.dist(G.me) < 12).slice(0, 3).forEach((o) => { o.path = null; o.state = 'event'; o.evMode = 'dance'; o.timer = 18; o.say('いっしょに おどる！', 2); });
  const P = panel(); P.classList.add('dance');
  const top = h('div', 'mtop'); top.appendChild(faceIcon(r.f, r.drawingCanvas, 60)); top.appendChild(h('div', 'mtxt', `💃 <b>${r.name}と ダンス ${STAR(lv)}</b> まるが ちいさく なったら おしてね`)); P.appendChild(top);
  const stage = h('div', 'dstage', '<div class="ring"></div><div class="arw"></div><div class="dres"></div>'); P.appendChild(stage);
  const row = h('div', 'mrow'); P.appendChild(row);
  const AR = ['⬅️', '⬆️', '➡️', '⬇️'], KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  const lv = LV().dance || 0; const N = [10, 12, 14][lv], GAP = [1.25, 1.0, 0.85][lv], WIN = [0.45, 0.38, 0.32][lv]; const notes = Array.from({ length: N }, (_, i) => ({ t: 1.6 + i * GAP, a: Math.floor(Math.random() * 4), hit: null }));
  let t0 = performance.now(), score = 0, cur = 0, alive = true;
  const press = (a) => { const t = (performance.now() - t0) / 1000; const n = notes[cur]; if (!n) return; const dd = Math.abs(t - n.t); if (dd > 0.55) return; n.hit = n.a === a && dd < WIN; if (n.hit) { score++; SFX.pop(); $('.dres', stage).textContent = dd < 0.2 ? '🌟 パーフェクト！' : '⭐ グッド！'; r.say(rnd(['いいね！', 'ノリノリ！', '♪']), 1); } else { $('.dres', stage).textContent = '😆 おしい！'; } cur++; };
  AR.forEach((e, i) => { const b = h('button', 'mbig arrow', `<span>${e}</span>`); b.onpointerdown = (ev) => { ev.preventDefault(); press(i); }; row.appendChild(b); });
  const kh = (e) => { const i = KEYS.indexOf(e.code); if (i >= 0) { e.preventDefault(); press(i); } }; addEventListener('keydown', kh);
  let pad0 = [];
  const loop = () => {
    if (!alive) return; const t = (performance.now() - t0) / 1000; const n = notes[cur];
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (gp) { [14, 12, 15, 13].forEach((bi, i) => { const p = gp.buttons[bi]?.pressed; if (p && !pad0[i]) press(i); pad0[i] = p; }); }
    if (n && t > n.t + 0.55) { n.hit = false; cur++; $('.dres', stage).textContent = '💨'; }
    const m = notes[cur];
    if (m) { const k = Math.max(0, (m.t - t) / GAP); $('.arw', stage).textContent = t > m.t - GAP ? AR[m.a] : ''; $('.ring', stage).style.transform = `translate(-50%,-50%) scale(${0.55 + k * 1.6})`; $('.ring', stage).style.opacity = t > m.t - GAP ? 1 : 0; }
    else { alive = false; removeEventListener('keydown', kh); end(); return; }
    requestAnimationFrame(loop);
  };
  const end = () => { const good = score >= N * 0.6; if (score >= N * 0.8 && lv < 2) { LV().dance = lv + 1; setTimeout(() => G.news(`💃 ダンスが ${STAR(lv + 1)} に レベルアップ！`), 1500); } else if (score < N * 0.4 && lv > 0) LV().dance = lv - 1; P.innerHTML = `<div class="mres"><h2>${score >= N * 0.9 ? '🌟🌟🌟' : good ? '🌟🌟' : '🌟'}</h2><p>${score}/${N} できた！ ${score >= N * 0.9 ? 'ダンスの スター！' : good ? 'じょうず！' : 'たのしかったね！'}</p></div>`; r.say(good ? 'すっごく たのしかった！' : 'たのしかった〜！ また おどろうね', 3, 'joy'); SFX.ok(); if (score >= N * 0.8) G.bag.tickets++; setTimeout(() => { G.photo && G.photo([r, G.me], `${r.name}と ダンス`); finish(r, true, 'ダンス'); }, 2600); };
  requestAnimationFrame(loop);
}

// ---------- つり
let bob = null;
function fish(r) {
  const me = G.me, w = G.world; let wcell = null, stand = null, bd = 1e9; const fx = Math.floor(me.p.x), fy = Math.floor(me.p.y), fz = Math.floor(me.p.z);
  for (let dz = -20; dz <= 20; dz++) for (let dx = -20; dx <= 20; dx++) { const dd = dx * dx + dz * dz; if (dd >= bd) continue; for (let y = fy - 4; y <= fy + 2; y++) { const x = fx + dx, z = fz + dz; if (B[w.get(x, y, z)]?.shape !== 'water' || w.get(x, y + 1, z)) continue; for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (standable(w, x + ax, y + 1, z + az)) { bd = dd; wcell = [x, y, z]; stand = [x + ax, y + 1, z + az]; break; } break; } }
  if (!stand) { r.say('ちかくに みずが ないね… ダンスに しよう！', 3); dance(r); return; }
  G.mini = { k: 'fish', r };
  me.p.x = stand[0] + 0.5; me.p.y = stand[1] + 0.02; me.p.z = stand[2] + 0.5; me.p.vy = 0; me.yaw = Math.atan2(wcell[0] - stand[0], wcell[2] - stand[2]); G.yaw = me.yaw + Math.PI; G.pitch = -0.35; G.dist = 4;
  const side = [stand[0] - (wcell[2] - stand[2]), stand[1], stand[2] + (wcell[0] - stand[0])]; if (standable(G.world, ...side)) { r.p.x = side[0] + 0.5; r.p.y = side[1]; r.p.z = side[2] + 0.5; } hold(r, 'sit'); r.evFace = [wcell[0] + 0.5, wcell[2] + 0.5]; r.say('🎣 いっぱい つろうね！', 2.5);
  if (!bob) { bob = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshLambertMaterial({ color: 0xff3a3a })); const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff })); bob.add(a, b); }
  { const dx = wcell[0] - stand[0], dz = wcell[2] - stand[2]; let k = 0; while (k < 3 && B[w.get(wcell[0] + dx * (k + 1), wcell[1], wcell[2] + dz * (k + 1))]?.shape === 'water' && !w.get(wcell[0] + dx * (k + 1), wcell[1] + 1, wcell[2] + dz * (k + 1))) k++; bob.position.set(wcell[0] + dx * k + 0.5, wcell[1] + 0.92, wcell[2] + dz * k + 0.5); }
  if (!bob.line) { bob.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x333333 })); }
  G.scene.add(bob); G.scene.add(bob.line);
  const P = panel(); P.classList.add('fish');
  P.appendChild(h('div', 'mhud', '🎣 <b class="fs">うきを みててね…</b> <span class="fc"></span>'));
  const btn = h('button', 'mbig huge', '<span>🎣</span><i>つりあげる！</i>'); P.appendChild(btn);
  let round = 0, phase = 'wait', T = 2 + Math.random() * 3, caught = [], alive = true;
  const by = bob.position.y;
  const fl = Math.min(3, Math.floor((LV().fishN || 0) / 4)); const POOL = [['🐟', 'さかな', 5, 30], ['🐠', 'ねったいぎょ', 3, 15], ['🦀', 'カニ', 2, 12], ['🐙', 'タコ', 1.5, 40], ['👢', 'ながぐつ', 1, 25], ['🦐', 'エビ', 0.8 + fl * 0.4, 14], ['🦑', 'イカ', 0.6 + fl * 0.4, 35], ['🐡', 'ふぐ', 0.2 + fl * 0.3, 22], ['🦈', 'サメ', 0.05 + fl * 0.15, 90]];
  const pickFish = () => { let s = Math.random() * POOL.reduce((a, p) => a + p[2], 0); for (const p of POOL) { s -= p[2]; if (s <= 0) return p; } return POOL[0]; };
  const msg = (t) => { $('.fs', P).textContent = t; };
  const next = () => { round++; $('.fc', P).textContent = `${Math.min(round + 1, 3)}/3かいめ`; if (round >= 3) return end(); phase = 'wait'; T = 2 + Math.random() * 3.5; msg('うきを みててね…'); };
  btn.onpointerdown = (e) => { e.preventDefault(); act(); };
  const kh = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); act(); } }; addEventListener('keydown', kh);
  const act = () => {
    if (phase === 'wait') { msg('あっ、はやすぎた〜！ もういちど'); SFX.ng(); T = 2 + Math.random() * 3; return; }
    if (phase === 'bite') { const f = pickFish(); caught.push(f); if (G.mini && f[1] !== 'ながぐつ') G.mini.fish = f[1]; phase = 'show'; SFX.splash(); SFX.ok(); const cm = f[1] === 'ながぐつ' ? 0 : Math.round(f[3] * (0.6 + Math.random() * 0.9)); LV().fishN = (LV().fishN || 0) + 1; const rec = cm > (LV().fishBest || 0); if (rec) LV().fishBest = cm; msg(`${f[0]} ${f[1]}が つれた！${cm ? ` ${cm}cm` : ''}${rec ? ' 🏆さいこう きろく！' : ''}`); G.discover && G.discover(f[1], f[0], 'つりで つった'); r.say(f[0] === '👢' ? 'ながぐつ〜！ あはは' : rnd(['すごーい！', 'おおきい！', 'やったね！']), 2.5, 'joy'); r.evMode = 'joy'; setTimeout(() => { r.evMode = 'sit'; next(); }, 2200); }
  };
  let pad0 = false;
  const loop = () => {
    if (!alive) return; const tt = performance.now() / 1000; const dt = Math.min(0.5, tt - (loop.last || tt)); loop.last = tt;
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (gp) { const p = gp.buttons[0]?.pressed || gp.buttons[1]?.pressed; if (p && !pad0) act(); pad0 = p; }
    if (phase === 'wait') { T -= dt; bob.position.y = by + Math.sin(tt * 3) * 0.03; if (T <= 0) { phase = 'bite'; T = 1.4; msg('❗ いまだ！ おして！'); SFX.hit(); } }
    else if (phase === 'bite') { T -= dt; bob.position.y = by - 0.12 + Math.sin(tt * 30) * 0.04; if (T <= 0) { msg('にげられた〜！'); SFX.ng(); phase = 'show'; setTimeout(next, 1400); } }
    else bob.position.y = by;
    { const pa = bob.line.geometry.attributes.position; pa.setXYZ(0, me.p.x + Math.sin(me.yaw) * 0.9, me.p.y + 2.1, me.p.z + Math.cos(me.yaw) * 0.9); pa.setXYZ(1, bob.position.x, bob.position.y + 0.08, bob.position.z); pa.needsUpdate = true; }
    requestAnimationFrame(loop);
  };
  const end = () => { alive = false; removeEventListener('keydown', kh); G.scene.remove(bob); G.scene.remove(bob.line); const got = caught.length; P.innerHTML = `<div class="mres"><h2>${caught.map((f) => f[0]).join(' ') || '💧'}</h2><p>${got ? `${got}ひき つれた！` : 'こんどは つれるよ！'}</p></div>`; r.say(got >= 2 ? 'つり めいじんだね！' : 'たのしかった！ また こようね', 3, 'joy'); setTimeout(() => { if (got) G.photo && G.photo([r, G.me], `${r.name}と つり`); finish(r, true, 'つり'); }, 2400); };
  $('.fc', P).textContent = '1/3かいめ'; requestAnimationFrame(loop);
}

// ---------- おえかき しょうぶ
const GENRES = [['どうぶつ', [['ねこ', '🐱'], ['いぬ', '🐶'], ['うさぎ', '🐰'], ['ぞう', '🐘'], ['ペンギン', '🐧']]], ['たべもの', [['ケーキ', '🍰'], ['りんご', '🍎'], ['アイス', '🍦'], ['おにぎり', '🍙'], ['ピザ', '🍕']]], ['のりもの', [['くるま', '🚗'], ['ロケット', '🚀'], ['でんしゃ', '🚃'], ['ふね', '⛵'], ['ひこうき', '✈️']]], ['しぜん', [['はな', '🌷'], ['おひさま', '☀️'], ['にじ', '🌈'], ['き', '🌳'], ['おつきさま', '🌙']]]];
async function paint(r) {
  G.mini = { k: 'paint', r }; hold(r, 'walk'); r.state = 'using'; r.use = { at: [Math.floor(r.p.x), Math.floor(r.p.y), Math.floor(r.p.z) + 1], kind: 'paint' }; r.timer = 99; r.state = 'mini'; r.evMode = 'cook';
  const pc = LV().paint || 0; const [gn, gl] = GENRES[pc % GENRES.length]; const [tn, te] = rnd(gl); LV().paint = pc + 1; closePanel(); speak(`${gn}の おだい。${tn}`);
  const layer = document.createElement('canvas'); layer.width = layer.height = 1024;
  const ok = await openDraw({ layer, title: `🎨 ${gn}の おだい「${tn}」 ${r.name}と しょうぶ！（${pc + 1}かいめ）`, size: 1024 });
  if (!ok || blank(layer)) { r.say('また こんど かこうね！', 3); finish(r, false); return; }
  const mine = document.createElement('canvas'); mine.width = mine.height = 300; const mg = mine.getContext('2d'); mg.fillStyle = '#fff'; mg.fillRect(0, 0, 300, 300); mg.drawImage(layer, 0, 0, 300, 300);
  const theirs = resDrawing(r, te);
  const P = panel(); P.classList.add('paint');
  const row = h('div', 'prow'); const c1 = h('div', 'pcard', `<i>${G.me.name}</i>`); c1.prepend(mine); const c2 = h('div', 'pcard', `<i>${r.name}</i>`); c2.prepend(theirs); row.append(c1, c2); P.appendChild(h('h2', '', `🎨 おだい「${tn}」`)); P.appendChild(row);
  const praise = rnd(['いろが きれい！', 'かたちが じょうず！', 'げんきな え！', 'すごく かわいい！', 'ほんものみたい！']);
  const judge = G.residents.filter((o) => o !== r && o !== G.me)[0];
  P.appendChild(h('div', 'mres', `<p>${judge ? judge.name : 'みんな'}「${praise}」</p><h2>🏅 ふたりとも きんメダル！</h2>`));
  r.say(`${G.me.name}の え、${praise}`, 3.5, 'joy'); speak(`${praise}。ふたりとも、きんメダル`); SFX.level();
  // アルバムに のこす
  const cv = document.createElement('canvas'); cv.width = 680; cv.height = 540; const g = cv.getContext('2d'); g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 680, 540); g.drawImage(mine, 30, 90, 300, 300); g.drawImage(theirs, 350, 90, 300, 300); g.fillStyle = '#3a2f3d'; g.font = 'bold 30px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; g.fillText(`🎨 おえかきしょうぶ「${tn}」`, 340, 56); g.font = 'bold 22px sans-serif'; g.fillText(G.me.name, 180, 420); g.fillText(r.name, 500, 420); g.fillText('🏅 ふたりとも きんメダル！', 340, 480); g.font = '16px sans-serif'; g.fillStyle = '#9a8a80'; g.fillText(`${G.day}にちめ`, 340, 520);
  { const sm = document.createElement('canvas'); sm.width = sm.height = 256; const sg = sm.getContext('2d'); sg.fillStyle = '#fff'; sg.fillRect(0, 0, 256, 256); sg.drawImage(layer, 0, 0, 256, 256); G.gallery = [...(G.gallery || []), { img: sm.toDataURL('image/jpeg', 0.85), d: G.day }].slice(-30); }
  G.album.push({ d: G.day, t: `${r.name}と おえかきしょうぶ「${tn}」`, uids: [r.uid, G.me.uid], img: cv.toDataURL('image/jpeg', 0.75) }); G.albumTrim && G.albumTrim();
  const b = h('button', 'mbig', '<span>👍</span><i>おしまい</i>'); b.onclick = () => finish(r, true, 'おえかきしょうぶ'); P.appendChild(b);
  setTimeout(() => { if (G.mini?.k === 'paint') finish(r, true, 'おえかきしょうぶ'); }, 15000);
}
function blank(cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 256) if (d[i]) return false; return true; }
function resDrawing(r, e) {
  const c = document.createElement('canvas'); c.width = c.height = 300; const g = c.getContext('2d');
  const good = r.f.talent === 1, bad = r.f.weak === 1;
  g.fillStyle = good ? '#fff8e6' : '#fff'; g.fillRect(0, 0, 300, 300);
  if (good) { g.fillStyle = '#bfe6ff'; g.fillRect(0, 0, 300, 180); g.fillStyle = '#9fd67a'; g.fillRect(0, 180, 300, 120); }
  g.save(); g.translate(150, 160); g.rotate(bad ? 0.35 : (Math.random() - 0.5) * 0.3); const s = bad ? 90 : good ? 150 : 120; g.font = `${s}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (bad) g.globalAlpha = 0.8; drawIcon(g, e, bad ? 30 : 0, 0, s); g.restore();
  g.strokeStyle = ['#ff7aa8', '#5a8ae0', '#f5b700', '#5ac06a'][r.uid % 4]; g.lineWidth = bad ? 3 : 6; g.lineCap = 'round';
  if (bad) { g.beginPath(); for (let i = 0; i < 18; i++) g.lineTo(30 + Math.random() * 240, 30 + Math.random() * 240); g.stroke(); }
  else { for (let i = 0; i < (good ? 8 : 4); i++) { const x = 30 + Math.random() * 240, y = 25 + Math.random() * 60; drawIcon(g, rnd(['✨', '⭐', '💗', '🌸']), x, y, 30); } }
  return c;
}
export const isHidden = (r) => !!r.hidden;
