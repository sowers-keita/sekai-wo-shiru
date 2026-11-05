// 画面（HUD・メニュー・かおづくり・ブロックえらび・もんだい）
import { drawIcon, hasEmo, rich, noEmo, iconImg, imgReady } from './icons.js';
import * as THREE from 'three';
import { B, ID, CATS, DOORS, doorCanvas, tileCanvas, atlas, CELL, PAD, PER, T, BLOCK_COUNT, COLORS, RECOMMEND, tileAvg } from './blocks.js';
import { HOUSES } from './world.js';
import { blockGeo } from './mesher.js';
import { Character, randomFace, faceIcon, drawFaceParts, drawEye, drawBrow, drawNose, drawMouth, drawGlass, drawBeard, SKINS, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, SHAPES, HAIRS, EYES, BROWS, NOSES, MOUTHS, GLASSES, BEARDS, PERSONALITIES, HATS, CLOTH_STYLES, PATTERNS } from './chars.js';
import { FOODS, REL_LABEL, PET_MOVES, PET_PERS, RTYPE, CATCH } from './life.js';
import { DREAMS, CONSULT_OPTS } from './events.js';
import { openDraw } from './draw.js';
import { makeQuestion, makeLeveled, recordAnswer, levelOf, subjOf, themedQuestion, speak, speakEn, CAT_NAME } from './study.js';
import { SFX } from './audio.js';
import { owned, houseOwned, price, housePrice, buy, shelf, REWARD } from './shop.js';
import { openSekai } from './sekai.js';
import { kFurniture, kFood, kFoodIcon } from './props.js';
const foodIc = (i) => { const u = kFoodIcon(i); return u ? `<img class="fic" src="${u}" alt="">` : FOODS[i][0]; };
import { speaking } from './voice.js';
import { animalIcon, animalize, makeChar, SPECIES, availableSpecies, CHEEKS, CUTE_EYES, CUTE_MOUTHS, renderAnimalFace, speciesOf, PROP0, PAINT_SIZE, paintPrep, paintHit, paintDab, paintImg } from './animal.js';
import { giftLabel, takeGift, THEMES, decorateRoom, todayEvent, weekOf, SHOP, helpEpisode, epiHint, swapGoal, islandStats, memLine } from './daily.js';

let G = null;
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export const TALENTS = ['うた', 'え', 'りょうり', 'スポーツ', 'べんきょう', 'ダンス'];
const NAMES = ['はると', 'ゆい', 'そうた', 'あおい', 'りく', 'ひまり', 'ゆうと', 'めい', 'こはる', 'れん', 'さくら', 'たいが', 'みお', 'かえで', 'ひなた', 'つむぎ', 'いつき', 'ゆず', 'こうき', 'あかり'];

// ---------- モーダル
const stack = [];
export const isModal = () => stack.length > 0;
export const modalKeepsWorld = () => true;
function modal(cls, html, opts = {}) {
  const bg = h('div', 'overlay show ' + (cls || '')); const box = h('div', 'panel', html); bg.appendChild(box);
  if (!opts.noClose) { const x = h('button', 'pclose', '✕'); x.onclick = () => closeModal(bg); box.prepend(x); }
  bg.onpointerdown = (e) => { if (e.target === bg && !opts.noClose) closeModal(bg); };
  document.body.appendChild(bg); stack.push(bg); if (document.pointerLockElement) document.exitPointerLock();
  bg.onClose = opts.onClose; return box;
}
function closeModal(bg) { const i = stack.indexOf(bg); if (i >= 0) stack.splice(i, 1); bg.remove(); bg.onClose && bg.onClose(); }
export function closeTop() { if (stack.length) closeModal(stack[stack.length - 1]); }
const closeAll = () => { while (stack.length) closeTop(); };

// ---------- ニュース・エフェクト
const LOW = /^(⭐)?(💝|🐾|🎁|🍽|☕|🏃|🛝|💗|🍬|🧺|🌅)/; let lowAt = 0; const bigQ = [];
const busyNow = () => isModal() || (G && performance.now() - (G.lastBuild || 0) < 4000) || document.querySelector('#draw.show, #pmode');
setInterval(() => { if (bigQ.length && !busyNow()) news(bigQ.shift(), true); }, 1500);
export function news(t, fromQ) {
  if (G && !fromQ) G.newsLog.push({ t, d: G.day, h: Math.floor(G.hour) });
  if (G && G.simulating) return;
  if (LOW.test(t)) { const now = performance.now(); if (now - lowAt < 25000) return; lowAt = now; }
  if (/^(⭐)?(🎉|🌈|💞|🐋|🎈|🦋|🎂|🏆|🌟|🌕|🎊|👑)/.test(t) && busyNow() && !fromQ) { bigQ.push(t); if (bigQ.length > 3) bigQ.shift(); return; }
  if (/^(⭐)?(🎉|🌈|💞|🐋|🎈|🦋|🎂|🏆|🌟|🌕|🎊|👑)/.test(t)) { let bg = $('#bignews'); if (!bg) { bg = h('div', ''); bg.id = 'bignews'; document.body.appendChild(bg); } bg.textContent = t; bg.classList.remove('show'); void bg.offsetWidth; bg.classList.add('show'); clearTimeout(bg._t); bg._t = setTimeout(() => bg.classList.remove('show'), 5200); return; }
  if (!fromQ && !/^(📮|✅|🎁 ごほうび|📖 ずかん|🏅|🌟|💡|🧵|📸)/.test(t)) { const now = performance.now(); if (now - (news.last || 0) < 7000 && !/[🙈🎣💃🎨]/.test(t)) return; news.last = now; }
  const box = $('#news'); if (!box) return; const e = h('div', 'nw', t); box.appendChild(e);
  setTimeout(() => e.classList.add('out'), 3200); setTimeout(() => e.remove(), 4000);
  while (box.children.length > 2) box.firstChild.remove();
}
const fxList = [];
const emojiTex = new Map();
export const getEmojiTex = (e) => emojiTexture(e);
function emojiTexture(e) { if (!emojiTex.has(e)) { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const paint = () => { g.shadowColor = 'rgba(255,255,255,0.95)'; g.shadowBlur = 6; t.needsUpdate = true; }; g.shadowColor = 'rgba(255,255,255,0.95)'; g.shadowBlur = 6; drawIcon(g, e, 48, 48, 78, paint); emojiTex.set(e, t); } return emojiTex.get(e); }
export function setTxt(el, s) { s = s ?? ''; if (el._s === s) return; el._s = s; if (hasEmo(s)) el.innerHTML = rich(s); else el.textContent = s; }
export function effect(kind, r) {
  const em = { heart: ['💗', '💕', '💖'], level: ['⭐', '🎉', '✨'], sparkle: ['✨', '🌟'], eat: ['😋', '💕'], gift: ['🎁', '💖'] }[kind] || ['✨'];
  for (let i = 0; i < (kind === 'level' ? 10 : 5); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(rnd(em)), transparent: true, depthWrite: false }));
    s.position.set(r.p.x + (Math.random() - 0.5) * 0.8, r.p.y + 1.4 + Math.random() * 0.4, r.p.z + (Math.random() - 0.5) * 0.8); s.scale.setScalar(0.45);
    G.scene.add(s); fxList.push({ o: s, v: new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2 + Math.random(), (Math.random() - 0.5) * 0.8), life: 1.6, g: -0.6 });
  }
  if (kind === 'level') SFX.level();
}
const tileColorCache = new Map();
function tileColor(id) {
  if (tileColorCache.has(id)) return tileColorCache.get(id);
  const d = B[id]; let col = new THREE.Color(DOORS[d.door]?.[1] || '#888');
  const t = d.t ? (d.t.side ?? d.t.top) : null;
  if (t != null) { const a = tileAvg[t]; col = new THREE.Color(a[0] / 255, a[1] / 255, a[2] / 255).convertSRGBToLinear(); }
  tileColorCache.set(id, col); return col;
}
const partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12); const burstMat = new Map();
export function burst(x, y, z, id, n = 8) {
  const col = tileColor(id);
  const mat = burstMat.get(id) || burstMat.set(id, new THREE.MeshLambertMaterial({ color: col, transparent: true })).get(id);
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(partGeo, mat); m.position.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6); G.scene.add(m); fxList.push({ o: m, shared: true, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), life: 0.7, g: -12 }); }
}
export function firework(p) {
  const cols = [0xff5a7a, 0xffd23a, 0x5ad8ff, 0x9a7aff, 0x7aff9a, 0xffffff]; const c = rnd(cols);
  const cx = p.x + (Math.random() - 0.5) * 20, cy = p.y + 14 + Math.random() * 8, cz = p.z + (Math.random() - 0.5) * 20;
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: c })); m.position.set(cx, cy, cz); const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 2); m.scale.setScalar(1.6); G.scene.add(m); fxList.push({ o: m, v, life: 1.4, g: -3 }); }
  if (G.cam.position.distanceTo(new THREE.Vector3(cx, cy, cz)) < 50) SFX.firework();
}

// ---------- HUD
export function defaultHotbar() {
  const n = (s) => B.find((b) => b.name === s)?.id;
  return [n('くさ'), n('オークのいた'), n('しろのかべ'), n('いしレンガ'), n('ガラス'), n('あかがわらのさか'), n('しろいげんかん'), n('きいろのベッド'), n('たいまつ')].map((id) => ({ type: 'block', id }));
}
export function initHUD(g) {
  G = g; $('#hud').classList.add('show');
  $('#bMenu').onclick = () => openMenu();
  $('#bMail').onclick = () => openMail();
  $('#bHelp').onclick = () => openHelp();
  $('#bSkip').onclick = () => G.endWatch();
  $('#bCine').onclick = () => { G.cine = !G.cine; $('#bCine').classList.toggle('on', G.cine); news(G.cine ? '🎬 ドラマカメラ：はなしている子を アップで うつすよ' : '🎬 ふつうの カメラ'); };
  $('#goals').onclick = () => openGoals();
  $('#bBlocks').onclick = () => openPicker();
  $('#wallet').onclick = () => openStore(); $('#bSekai').onclick = () => { SFX.pop(); openWorldStudy(); }; $('#tShop').onclick = () => openStore();
  $('#bWatch').onclick = () => { if (G.watch) { const r = G.tutBack || G.watch; G.tutBack = null; G.setMe(r); } else if (G.me) { if (tut != null && TUT[tut] && TUT[tut].k === 'watch' && TS.g) { G.tutBack = G.me; G.setWatch(TS.g); } else G.setWatch(G.me); } };
  $('#bQuiz').onclick = () => askQuiz(null);
  $('#bUndo').onclick = () => G.undo(); setUndo(0);
  $('#bCut').onclick = () => { G.toggleCut(); $('#bCut').classList.toggle('on', !!G.cutaway); };
  const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); SFX.unlock(); on(); }); el.addEventListener('pointerup', (e) => { e.preventDefault(); off && off(); }); el.addEventListener('pointerleave', () => off && off()); };
  hold($('#tJump'), () => (G.inpJump = true), () => (G.inpJump = false));
  hold($('#tDown'), () => (G.inpDown = true), () => (G.inpDown = false));
  hold($('#tPlace'), () => { G.place(); G.holdAct = { f: G.place, t: 0.35 }; }, () => (G.holdAct = null)); hold($('#tDig'), () => { G.dig(); G.holdAct = { f: G.dig, t: 0.35 }; }, () => (G.holdAct = null)); hold($('#tRot'), () => G.rotate()); hold($('#tFly'), () => G.toggleFly()); hold($('#tTalk'), () => G.talk());
  hold($('#tCam'), () => (G.dist = G.dist < 1.5 ? 5 : G.dist < 6 ? 9 : 0.6));
}
export function updateHUD() {
  if (!G) return;
  $('#bWatch').textContent = G.watch ? '🎮' : '👀'; $('#bWatch').title = G.watch ? 'あそぶ' : 'みまもる';
  $('#hud').classList.toggle('watching', !!G.watch && !G.me);
  $('#hud').classList.toggle('nome', !G.me); $('#hud').classList.toggle('wtemp', !!G.watchTemp); $('#bCine').classList.toggle('on', !!G.cine);
}
export function setUndo(n) { const b = $('#bUndo'); if (b) b.style.opacity = n ? 1 : 0.4; }
export function setFly(v) { $('#tFly').classList.toggle('on', v); $('#tDown').style.display = v ? '' : 'none'; news(v ? '🕊️ とべるよ！' : '🚶 あるくよ'); }
export function joy(on, o, p) { const j = $('#joy'); j.style.display = on ? 'block' : 'none'; if (on) { j.style.left = o[0] + 'px'; j.style.top = o[1] + 'px'; $('#joyk').style.transform = `translate(${p[0] - o[0]}px,${p[1] - o[1]}px)`; } }
export function drawHotbar() {
  const hb = $('#hotbar'); hb.innerHTML = '';
  G.hotbar.forEach((it, i) => { const b = h('button', 'slot' + (i === G.sel ? ' on' : '')); const ic = itemIcon(it); if (ic) b.appendChild(ic); b.onclick = () => { if (G.sel === i) openPicker(); G.sel = i; drawHotbar(); }; hb.appendChild(b); });
  const it = G.hotbar[G.sel]; $('#selname').textContent = it ? (it.type === 'house' ? HOUSES.find((x) => x.key === it.key).name : it.type === 'tool' ? G.TOOLS.find((x) => x.key === it.key).name : B[it.id].name) : '';
  $('#selname').classList.remove('fade'); void $('#selname').offsetWidth; $('#selname').classList.add('fade');
}
function itemIcon(it) { if (!it) return null; if (it.type === 'tool') return h('span', 'emo', G.TOOLS.find((x) => x.key === it.key).icon); if (it.type === 'house') { const s = h('span', 'emo', HOUSES.find((x) => x.key === it.key).icon); return s; } const c = blockIcon(it.id); const cc = document.createElement('canvas'); cc.width = cc.height = c.width; cc.getContext('2d').drawImage(c, 0, 0); return cc; }

// ---------- アイコン（ミニ描画）
let mini = null; const iconCache = new Map();
function miniR() {
  if (mini) return mini;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(96, 96); r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.4)); const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(-1, 3, 2); sc.add(dl);
  const cam = new THREE.OrthographicCamera(-0.9, 0.9, 0.9, -0.9, 0.1, 20);
  const mats = { op: new THREE.MeshLambertMaterial({ map: G.atlasTex, vertexColors: true, alphaTest: 0.5 }), tr: new THREE.MeshLambertMaterial({ map: G.atlasTex, vertexColors: true, transparent: true }), gl: new THREE.MeshBasicMaterial({ map: G.atlasTex, vertexColors: true, alphaTest: 0.5 }) };
  mini = { r, sc, cam, mats }; return mini;
}
function blockIcon(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const d = B[id]; let c;
  if (d.shape === 'door') { c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(doorCanvas(d.door), 28, 4, 40, 88); }
  else if (d.shape === 'cross' || d.shape === 'torch') { c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tileCanvas(d.t.side), 8, 8, 80, 80); }
  else {
    const M = miniR(); const o = blockGeo(id); const grp = new THREE.Group();
    for (const k of ['op', 'tr', 'gl']) { const dd = o[k]; if (!dd.idx.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dd.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(dd.nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(dd.uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(dd.col, 3)); g.setIndex(new THREE.BufferAttribute(dd.idx, 1)); grp.add(new THREE.Mesh(g, M.mats[k])); }
    if (d.shape === 'kmodel') { const m = kFurniture(d, 0); if (m) { m.position.set(0.5, 0, 0.5); grp.add(m); } }
    const box = new THREE.Box3().setFromObject(grp); const ctr = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length();
    grp.position.sub(ctr); M.sc.add(grp);
    const s = Math.max(0.5, sz * 0.55); M.cam.left = -s; M.cam.right = s; M.cam.top = s; M.cam.bottom = -s; M.cam.updateProjectionMatrix();
    M.cam.position.set(2.2, 1.8, -2.6); M.cam.lookAt(0, 0, 0);
    M.r.render(M.sc, M.cam);
    c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(M.r.domElement, 0, 0);
    M.sc.remove(grp); grp.traverse((x) => x.geometry && !x.userData.shared && x.geometry.dispose());
  }
  iconCache.set(id, c); return c;
}

// ---------- 毎フレーム（ふきだし・ボタン）
const bubbles = new Map();
const v3 = new THREE.Vector3();
const NEED_IC = { hungry: '🍙', house: '🏠', quiz: '❓', friend: '💗', gift: '🎁', consult: '💭', episode: '🧵' };
export function frame(dt, t, targetRes, target) {
  for (let i = fxList.length - 1; i >= 0; i--) { const f = fxList[i]; f.life -= dt; f.v.y += f.g * dt; f.o.position.addScaledVector(f.v, dt); if (f.o.material) if (!f.shared) { f.o.material.opacity = Math.min(1, f.life * 2); f.o.material.transparent = true; } else f.o.scale.setScalar(Math.min(1, f.life * 2)); if (f.life <= 0) { G.scene.remove(f.o); if (!f.shared) f.o.material.dispose(); fxList.splice(i, 1); } }
  const lay = $('#bubbles');
  let focus = null; { let best = 0; for (const r of G.residents) if (r !== G.me && r.bubbleT > 0 && r.sayAt > best && r.obj.position.distanceTo(G.cam.position) < 14) { best = r.sayAt; focus = r; } }
  for (const r of G.residents) {
    let b = bubbles.get(r.uid); if (!b) { b = h('div', 'bub'); b.innerHTML = '<div class="bt"></div><div class="bn"></div>'; lay.appendChild(b); bubbles.set(r.uid, b); } if (b._tg !== (tut != null && TS.g === r)) { b._tg = tut != null && TS.g === r; b.classList.toggle('tutg', b._tg); }
    v3.copy(r.obj.position); v3.y += r.ch.height * (r.state === 'sleep' ? 0.4 : 1) + 0.25;
    const dist = v3.distanceTo(G.cam.position); v3.project(G.cam);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && dist < 40 && r !== G.me && !r.hidden && !isModalHard();
    if (!vis) { b.style.display = 'none'; continue; }
    b.style.display = 'block'; const sc = Math.max(0.55, Math.min(1.15, 7 / dist));
    b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px,${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%) scale(${sc})`;
    const bt = b.firstChild, bn = b.lastChild;
    const EMO = { angry: '💢', sad: '😢', surprise: '❗', joy: '💗', laugh: '😆', shy: '☺️', sulk: '😤', trouble: '💦' };
    if (r.bubbleT > 0 && dist > 12 && EMO[r.bubbleKind]) { setTxt(bt, EMO[r.bubbleKind]); bt.className = 'bt on need'; }
    else if (r.bubbleT > 0 && focus && r !== focus && !isModalHard() && (performance.now() - r.sayAt > 600)) { setTxt(bt, EMO[r.bubbleKind] || '💬'); bt.className = 'bt on mini'; }
    else if (r.bubbleT > 0) { setTxt(bt, r.bubbleText); bt.className = 'bt on ' + (r.bubbleKind || ''); }
    else if (r.need) { setTxt(bt, NEED_IC[r.need]); bt.className = 'bt on need'; }
    else bt.className = 'bt';
    if (dist > 26 && !bt.classList.contains('need')) { b.style.display = 'none'; continue; }
    setTxt(bn, r.name + (r === targetRes ? ' 💬' : '')); bn.style.opacity = dist < 9 || r === targetRes ? 1 : 0;
    b.style.zIndex = Math.floor(1000 - dist * 10);
  }
  for (const p of G.pets) {
    let b = bubbles.get('p' + p.uid); if (!b) { b = h('div', 'bub pet'); b.innerHTML = '<div class="bt"></div><div class="bn"></div>'; lay.appendChild(b); bubbles.set('p' + p.uid, b); }
    v3.copy(p.obj.position); v3.y += p.size * 1.1 + 0.2; const dist = v3.distanceTo(G.cam.position); v3.project(G.cam);
    if (!(v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && dist < 18) || isModalHard()) { b.style.display = 'none'; continue; }
    b.style.display = 'block'; const sc = Math.max(0.5, Math.min(1, 6 / dist));
    b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px,${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%) scale(${sc})`;
    setTxt(b.firstChild, p.bubbleText || ''); b.firstChild.className = 'bt' + (p.bubbleT > 0 ? ' on' : ''); setTxt(b.lastChild, dist < 7 ? p.name : ''); 
  }
  for (const [u, b] of bubbles) if (typeof u === 'string' ? !G.pets.some((p) => 'p' + p.uid === u) : !G.byUid(u)) { b.remove(); bubbles.delete(u); }
  // 時計
  const hr = Math.floor(G.hour), mn = Math.floor((G.hour % 1) * 6) * 10;
  const ic = hr < 5 || hr >= 20 ? '🌙' : hr < 7 ? '🌅' : hr < 17 ? '☀️' : '🌇';
  $('#clock').textContent = `${ic} ${G.day}にちめ ${hr}:${String(mn).padStart(2, '0')}`;
  if (G._todayD !== G.day) { G._todayD = G.day; const E = todayEvent(G); $('#today').textContent = `きょうは ${E.n}（${E.h}じ〜）・${weekOf(G).n.split(' ')[0]}`; updateGoals(); }
  const near = targetRes || G.nearestRes(2.6);
  $('#tTalk').style.display = near ? '' : 'none';
  { const w = $('#wallet'); if (w && w._v !== G.money) { w._v = G.money; w.querySelector('b').textContent = G.money || 0; } const sp = $('#tShop'); if (sp) sp.style.display = G.me && G.shopAt && Math.hypot(G.me.p.x - G.shopAt[0] - 0.5, G.me.p.z - G.shopAt[2] - 0.5) < 4.5 ? '' : 'none'; }
  $('#cross').classList.toggle('res', !!targetRes);
  tutTick();
}
const isModalHard = () => stack.some((s) => s.classList.contains('hard'));

// ---------- ブロックえらび
export function openPicker() {
  const box = modal('picker', `<div class="ptabs"></div><div class="psearch"><input placeholder="🔍 さがす（ひらがな・カタカナ）"><span class="pcount"></span></div><div class="pvar"></div><div class="pgrid"></div><div class="pname"></div>`);
  const tabs = $('.ptabs', box), grid = $('.pgrid', box), name = $('.pname', box), search = $('input', box), vrow = $('.pvar', box);
  $('.pcount', box).textContent = `ぜんぶで ${BLOCK_COUNT}しゅるい`;
  let cat = G.pickCat || 'rec';
  const TABS = [{ id: 'rec', name: 'おすすめ', icon: '⭐' }, { id: 'recent', name: 'さいきん', icon: '🕘' }, { id: 'tool', name: 'ちけい', icon: '⛰️' }, ...CATS];
  TABS.forEach((c) => { const b = h('button', '', `<span>${c.icon}</span><i>${c.name}</i>`); b.dataset.c = c.id; b.onclick = () => { cat = c.id; G.pickCat = cat; search.value = ''; show(); }; tabs.appendChild(b); });
  let job = 0;
  const choose = (it) => { G.hotbar[G.sel] = it; drawHotbar(); SFX.pop(); closeTop(); };
  const icBtn = (d, cls = 'pit') => { const b = h('button', cls); b.title = d.name; const c = blockIcon(d.id); const cc = document.createElement('canvas'); cc.width = cc.height = 96; cc.getContext('2d').drawImage(c, 0, 0); b.appendChild(cc); b.appendChild(h('i', 'pn', d.name)); return b; };
  const fams = (fam) => B.filter((x) => x.fam === fam);
  function variants(d) {
    const L = fams(d.fam); vrow.innerHTML = ''; if (L.length < 2) { vrow.classList.remove('show'); return false; }
    vrow.classList.add('show'); vrow.appendChild(h('b', 'pvt', `いろ・かたち ちがい（${L.length}）`));
    const sc = h('div', 'pvs'); vrow.appendChild(sc);
    let i = 0; const step = () => { const end = Math.min(L.length, i + 12); for (; i < end; i++) { const v = L[i]; const b = icBtn(v, 'pit sm'); b.onclick = () => choose({ type: 'block', id: v.id }); sc.appendChild(b); } if (i < L.length && vrow.isConnected) requestAnimationFrame(step); }; step();
    return true;
  }
  function show() {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === cat && !search.value));
    grid.innerHTML = ''; vrow.innerHTML = ''; vrow.classList.remove('show'); const my = ++job;
    const q = search.value.trim();
    if (!q && cat === 'tool') { for (const tl of G.TOOLS) { const b = h('button', 'pit house', `<span class="emo">${tl.icon}</span><i>${tl.name}</i>`); b.onclick = () => choose({ type: 'tool', key: tl.key }); grid.appendChild(b); } name.textContent = 'しまの かたちを かえよう（↶で もどせる）'; return; }
    if (!q && cat === 'house') { for (const hs of HOUSES) { const b = h('button', 'pit house', `<span class="emo">${hs.icon}</span><i>${hs.name}</i>`); if (houseOwned(G, hs.key)) b.onclick = () => choose({ type: 'house', key: hs.key }); else { b.classList.add('lock'); b.appendChild(h('b', 'pprice', '🪙' + housePrice(hs.key))); b.onclick = () => buyAsk({ house: hs, fam: 'h:' + hs.key, cost: housePrice(hs.key) }, choose); } grid.appendChild(b); } name.textContent = 'おうちセット：まえに ドーンと たてられるよ'; return; }
    let list;
    if (q) list = B.filter((d) => d.id && d.shape !== 'air' && (!d.secret || G.zukan[d.name]) && (d.name.includes(q) || kata(d.name).includes(kata(q))));
    else if (cat === 'rec') list = RECOMMEND.map((n) => B.find((d) => d.name === n)).filter(Boolean);
    else if (cat === 'recent') list = (G.recent || []).map((id) => B[id]);
    else { const seen = new Set(); list = B.filter((d) => d.id && d.cat === cat && (!d.secret || G.zukan[d.name]) && !seen.has(d.fam) && seen.add(d.fam)); }
    const grouped = !q && cat !== 'rec' && cat !== 'recent';
    name.textContent = list.length ? (grouped ? 'おすと いろちがいも でるよ' : `${list.length}こ`) : 'まだ ないよ';
    let i = 0;
    const step = () => { if (my !== job) return; const end = Math.min(list.length, i + 18); for (; i < end; i++) { const d = list[i]; const n = fams(d.fam).length; const b = icBtn(d); if (grouped && n > 1) b.appendChild(h('b', 'pcnt', '×' + n)); if (!owned(G, d)) { b.classList.add('lock'); b.appendChild(h('b', 'pprice', '🪙' + price(d))); b.onclick = () => buyAsk({ d, fam: d.fam, n, cost: price(d) }, choose); grid.appendChild(b); continue; } b.onclick = () => { if (grouped && n > 1) { if (!variants(d)) choose({ type: 'block', id: d.id }); grid.querySelectorAll('.pit').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); } else choose({ type: 'block', id: d.id }); }; grid.appendChild(b); } if (i < list.length) requestAnimationFrame(step); };
    step();
  }
  search.oninput = show; show();
}
const kata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

// ---------- メニュー
export function openMenu() {
  const box = modal('menu', `<h2>🏝️ メニュー</h2><div class="mgrid"></div>`);
  const items = [
    ['👨‍👩‍👧', 'なかま', () => openResidents()], ['➕', 'なかまを つくる', () => newResident()], ['💞', 'なかよし', () => openRelations()],
    ['🌍', 'せかいを しる', () => openWorldStudy()], ['🏪', 'おみせ', () => openStore()], ['📘', 'あそびかた', () => tutorial(0)], ['📷', 'しゃしんを とる', () => openPhotoMode()], ['🖼️', 'えを かざる', () => openArt()], ['🏝️', 'わたしの しま', () => openIsland()], ['📮', 'おてがみ', () => openMail()], ['🎯', 'きょうの 3つ', () => openGoals()], ['🎪', 'こうかんじょ', () => openShop()], ['🛋️', 'おへや おまかせ', () => openTheme()], ['🐾', 'ペット', () => openPets()], ['🎒', 'バッグ', () => openBag()], ['❓', 'もんだい', () => askQuiz(null)],
    ['📰', 'しまニュース', () => openNews()], ['📸', 'アルバム', () => openAlbum()], ['📖', 'ずかん', () => openZukan()], ['⚙️', 'せってい', () => openSettings()], ['💾', 'セーブ', () => { closeTop(); G.save(); }],
  ];
  const mg = $('.mgrid', box);
  for (const [ic, nm, fn] of items) { const b = h('button', 'mbtn', `<span>${ic}</span><i>${nm}</i>`); b.onclick = () => { closeTop(); fn(); }; mg.appendChild(b); }
}
function openResidents() {
  const box = modal('list', `<h2>👨‍👩‍👧 なかま（${G.residents.length}/10）</h2><div class="rlist"></div>`);
  const L = $('.rlist', box);
  for (const r of G.residents) {
    const row = h('button', 'rrow'); row.appendChild(faceIcon(r.f, r.drawingCanvas, 72));
    row.appendChild(h('div', 'rinfo', `<b>${r.name}</b> <small>${r.pers.icon}${r.pers.name}・Lv${r.level}</small><div class="bar"><i style="width:${r.exp}%"></i></div><small>${r === G.me ? '🎮 あそんでいる' : r.home ? '🏠 おうちあり' : '⛺ おうちなし'} ${r.need ? NEED_IC[r.need] : ''}</small>`));
    row.onclick = () => { closeTop(); openResident(r); }; L.appendChild(row);
  }
  if (G.residents.length < 10) { const add = h('button', 'rrow add', '<span>➕</span><b>なかまを つくる</b>'); add.onclick = () => { closeTop(); newResident(); }; L.appendChild(add); }
}
export function openResident(r) {
  if (isModal()) return;
  TS.talked = true;
  { const ml = Math.random() < 0.45 && memLine(G, r); r.say(ml || rnd(['なあに？', 'どうしたの？', `${G.me ? G.me.name : ''}だ！`, 'やっほー！', ...(r.catch || [])]), ml ? 3.5 : 2, ml ? 'joy' : ''); } G.count && G.count('talk', r.uid); talkGrow(r);
  if (r.state !== 'sleep' && !r.controlled) { r.path = null; r.state = 'look'; r.timer = 6; if (G.me) r.faceTo(G.me); }
  const box = modal('res', `<div class="rhead"></div><div class="ract"></div><button class="more">もっと みる ▼</button><div class="rmore"><div class="ract a2"></div></div>`);
  const head = $('.rhead', box); head.appendChild(faceIcon(r.f, r.drawingCanvas, 110));
  { const fav = (G.fav || []).includes(r.uid); const fb = h('button', 'favb' + (fav ? ' on' : ''), fav ? '⭐' : '☆'); fb.title = 'おきにいり'; fb.onclick = () => { G.fav = G.fav || []; if (G.fav.includes(r.uid)) { G.fav = G.fav.filter((u) => u !== r.uid); fb.textContent = '☆'; fb.classList.remove('on'); } else { G.fav = [...G.fav, r.uid].slice(-3); fb.textContent = '⭐'; fb.classList.add('on'); r.say(rnd(['えっ、うれしい！', 'わたしが おきにいり！？ えへへ', 'ずっと なかよしだよ！']), 3, 'joy'); SFX.sticker(); news(`⭐ ${r.name}が おきにいりに なった！ ${r.name}の できごとを さきに おしらせ するね`); } }; box.prepend(fb); }
  const pet = G.pets.find((p) => p.owner === r.uid);
  head.appendChild(h('div', 'rinfo', `<h2>${r.name}</h2><div>${r.pers.icon} ${r.pers.name}・すきなもの ${FOODS[r.f.food][1]}・とくい ${TALENTS[r.f.talent ?? 0]}${r.f.weak >= 0 ? '・にがて ' + TALENTS[r.f.weak ?? 1] : ''}</div><div>Lv${r.level} <span class="bar"><i style="width:${r.exp}%"></i></span></div><div>${r.home ? '🏠 おうちあり' : '⛺ おうちなし'} ${pet ? '・🐾 ' + pet.name : ''}・🎂 ${r.f.birthday || '?'}にちめ</div>${r.need ? `<div class="needline">${NEED_IC[r.need]} ${{ hungry: 'おなかが すいている', house: 'おうちが ほしい', quiz: 'もんだいを だしたい', consult: 'そうだんが ある', episode: r.epiAsk || 'てつだって ほしい', friend: (G.byUid(r.wantFriend)?.name || '') + 'と なかよく なりたい', gift: 'プレゼントが ほしい' }[r.need]}</div>` : ''}`));
  const A1 = $('.ract', box), A2 = $('.a2', box), M = $('.rmore', box); let A = A1;
  $('.more', box).onclick = (e) => { M.classList.toggle('open'); e.target.textContent = M.classList.contains('open') ? 'とじる ▲' : 'もっと みる ▼'; };
  const act = (ic, nm, fn, hi) => { const b = h('button', 'abtn' + (hi ? ' hi' : ''), `<span>${ic}</span><i>${nm}</i>`); b.onclick = fn; A.appendChild(b); };
  if (r.need === 'consult' && r.consult) act('💭', 'そうだんに のる', () => { closeTop(); openConsult(r); }, true);
  if (r.need === 'episode') act('🧵', 'てつだう', () => { closeTop(); askQuiz(r, () => helpEpisode(G, r)); }, true);
  act('💬', 'はなす', () => { closeTop(); talkTo(r); });
  act('🍙', 'たべもの', () => { closeTop(); giveFood(r); }, r.need === 'hungry');
  if (r !== G.me && G.me && r.state !== 'sleep') act('🎈', 'あそぼう', () => { closeTop(); G.onInvite && G.onInvite(r); });
  act('❓', 'もんだい', () => { closeTop(); askQuiz(r); }, r.need === 'quiz');
  if (r.need === 'gift') act('🎁', 'プレゼント', () => { closeTop(); giveGift(r); }, true);
  A = A2; if (r.need !== 'gift') act('🎁', 'プレゼント', () => { closeTop(); giveGift(r); });
  if (r.need === 'friend') act('💗', 'あわせてあげる', () => { closeTop(); r.introduced = true; r.state = 'idle'; r.timer = 0; const o = G.byUid(r.wantFriend); r.say(`${o ? o.name : ''}に あいに いくね！`, 3); }, true);
  if (r.need === 'house') act('🏠', 'おうちの つくりかた', () => { closeTop(); news('🏠 ベッドを おいて、かべと やねで かこむと おうちに なるよ（おうちセットも つかえる）'); }, true);
  act('✏️', 'かおを かえる', () => { closeTop(); editResident(r); });
  act('🐾', pet ? 'ペットを なおす' : 'ペットを かく', () => { closeTop(); pet ? editPet(pet) : newPet(r); });
  if (r !== G.me) act('🎮', 'この子で あそぶ', () => { closeTop(); G.setMe(r); news(`🎮 ${r.name}で あそぶよ`); });
  act('👀', 'みまもる', () => { closeTop(); G.setWatch(r); });
  const box0 = box; { const eh = epiHint(G, r); if (eh) M.appendChild(h('div', 'dream', `<h3>🧵 ${eh}</h3>`)); } if (r.catch && r.catch.length) M.appendChild(h('div', 'dream', `<h3>💬 くちぐせ：${r.catch.join('・')}</h3><small>たくさん はなすと ふえるよ（${r.talkN || 0}かい）</small>`));
  if (r.dream && DREAMS[r.dream]) { const D = DREAMS[r.dream]; const pr = Math.round(Math.min(1, D.prog(G, r)) * 100); M.appendChild(h('div', 'dream', `<h3>${D.ic} ゆめ：${D.t}</h3><div class="bar big"><i style="width:${pr}%"></i></div>${D.hint ? `<small>ヒント：${D.hint}</small>` : ''}`)); }
  const ph = G.album.filter((a) => a.uids.includes(r.uid)); if (ph.length) { const row = h('div', 'phrow', '<h3>📸 しゃしん</h3>'); const sc = h('div', 'phs'); ph.slice(-8).reverse().forEach((a) => { const im = h('img'); im.src = a.img; im.onclick = () => showPhoto(a); sc.appendChild(im); }); row.appendChild(sc); M.appendChild(row); }
  if (r.diary && r.diary.length) { const dl = h('div', 'diary', '<h3>📔 にっき</h3>'); r.diary.slice(-6).reverse().forEach((e) => dl.appendChild(h('div', 'nrow', `<small>${e.d}にちめ</small> ${e.t}`))); M.appendChild(dl); }
}
export function openPet(p) {
  if (isModal()) return;
  const box = modal('res', `<div class="rhead"></div><div class="ract"></div>`);
  const c = document.createElement('canvas'); c.width = c.height = 110; c.getContext('2d').drawImage(p.canvas, 0, 0, 110, 110); $('.rhead', box).appendChild(c);
  const o = G.byUid(p.owner); const [pn, pi] = PET_PERS[p.pers] || PET_PERS[0];
  $('.rhead', box).appendChild(h('div', 'rinfo', `<h2>${p.name}</h2><div>${pi} ${pn}・${o ? o.name + 'の ペット' : 'のらペット'}</div><div>💗 なかよし <span class="bar"><i style="width:${Math.min(100, p.love)}%"></i></span></div><div>🎪 おぼえた げい：${['おすわり', 'ジャンプ', 'くるくる'].slice(0, 1 + Math.min(2, Math.floor(p.tricks / 3))).join('・')}</div>`));
  const A = $('.ract', box); const act = (ic, nm, fn) => { const b = h('button', 'abtn', `<span>${ic}</span><i>${nm}</i>`); b.onclick = fn; A.appendChild(b); };
  act('🤚', 'なでる', () => { closeTop(); G.count && G.count('pet'); p.say('💕', 2); p.love += 5; p.tricks++; p.doTrick('spin'); effect('heart', p); if (p.tricks % 3 === 0 && p.tricks <= 6) news(`🎪 ${p.name}が あたらしい げいを おぼえた！`); });
  act('🦴', 'おやつ', () => { closeTop(); p.say(p.pers === 3 ? '🍖 もっと！' : '🍖 おいしい！', 2.5); p.love += 8; p.doTrick('jump'); effect('eat', p); });
  act('🪑', 'おすわり', () => { closeTop(); p.doTrick('sit'); p.say('ちょこん', 2); });
  if (p.tricks >= 3) act('⤴️', 'ジャンプ', () => { closeTop(); p.doTrick('jump'); p.say('ぴょーん！', 2); });
  if (p.tricks >= 6) act('🌀', 'くるくる', () => { closeTop(); p.doTrick('spin'); p.say('くるくる〜', 2); });
  act('✨', 'へんしん', () => { closeTop(); openMagic(p); });
  act('✏️', 'なおす', () => { closeTop(); editPet(p); });
}
function openMagic(p) {
  const box = modal('res magic', `<h2>✨ ${p.name}を へんしん！</h2><div class="ract"></div><p class="hint">なんかいでも かえられるよ</p>`); const A = $('.ract', box);
  [['☁️', 'ふわふわ', 1], ['✨', 'キラキラ', 2], ['🌈', 'にじいろ', 3], ...((G.unlock || {}).gold ? [['🌟', 'ゴールド', 4]] : []), ...((G.unlock || {}).night ? [['🌌', 'ほしぞら', 5]] : []), ['🔙', 'もとに もどす', 0]].forEach(([ic, n, k]) => { const b = h('button', 'abtn' + (p.magic === k ? ' hi' : ''), `<span>${ic}</span><i>${n}</i>`); b.onclick = () => { closeTop(); p.setMagic(k); SFX.level(); effect('sparkle', p); if (k) { news(`✨ ${p.name}が「${n}」に へんしん！`); const o = G.byUid(p.owner); if (o && !o.controlled) setTimeout(() => o.say(rnd(['わあ！ すごい へんしん！', `${p.name}、かわいい〜！`, 'まほう みたい！']), 3, 'surprise'), 900); } }; A.appendChild(b); });
}
function openTheme() {
  const box = modal('res theme', `<h2>🛋️ おへや おまかせ</h2><p>いま いる へやを テーマで かざるよ（↶で もどせる）</p><div class="ract"></div>`); const A = $('.ract', box);
  THEMES.forEach((T) => { const b = h('button', 'abtn', `<span>${T.ic}</span><i>${T.n}</i>`); b.onclick = () => { closeTop(); const err = decorateRoom(G, T.k); if (err) { news(err); SFX.ng(); } else { SFX.level(); news(`${T.ic} おへやが「${T.n}」に なった！`); if (!G.cutaway) { G.toggleCut(); $('#bCut').classList.add('on'); } } }; A.appendChild(b); });
}
export function goalFx(all) {
  SFX.sticker && SFX.sticker(); if (all) setTimeout(() => SFX.clap && SFX.clap(), 300);
  const t = $('#goals'), r = t ? t.getBoundingClientRect() : { left: 20, top: 80, width: 100, height: 30 };
  const n = all ? 6 : 1; for (let i = 0; i < n; i++) { const e = h('div', 'stfly', all ? ['🌟', '🪙', '🎉', '⭐', '🪙', '🎊'][i] : '🪙'); e.style.left = innerWidth / 2 + (Math.random() - 0.5) * (all ? 300 : 0) + 'px'; e.style.top = innerHeight / 2 + 'px'; document.body.appendChild(e);
    requestAnimationFrame(() => setTimeout(() => { e.style.transform = 'translate(-50%,-50%) scale(1.8)'; setTimeout(() => { e.style.left = r.left + r.width / 2 + 'px'; e.style.top = r.top + r.height / 2 + 'px'; e.style.transform = 'translate(-50%,-50%) scale(0.6)'; e.style.opacity = '0.2'; }, 650 + i * 90); setTimeout(() => e.remove(), 1700 + i * 90); }, 20)); }
  if (all) { const b = h('div', 'stbig', '🌟 ぜんぶ できた！'); document.body.appendChild(b); setTimeout(() => b.remove(), 2400); }
  const g = $('#goals'); if (g) { g.classList.remove('pulse'); void g.offsetWidth; g.classList.add('pulse'); }
}
export function updateGoals() { const e = $('#goals'); if (!e || !G || !G.goals) { if (e) e.textContent = ''; return; } const n = G.goals.list.filter((g) => g.done).length; e.innerHTML = `🎯 きょうの3つ <b>${n}/${G.goals.list.length}</b>`; e.classList.toggle('all', n === G.goals.list.length); }
export function openGoals() {
  if (!G.goals) { news('なかまで あそぶと でてくるよ'); return; }
  const box = modal('mail', `<h2>🎯 きょうの 3つ</h2><div class="goals"></div><p class="hint">できなくても だいじょうぶ。すきな ことを して あそんでね。できると シール 🪙（いま ${G.coins || 0}まい）</p>`);
  const L = $('.goals', box); G.goals.list.forEach((g, i) => { const row = h('div', 'goal' + (g.done ? ' done' : ''), `<span>${g.done ? '✅' : g.ic}</span><b>${g.t}</b>`); if (!g.done && !g.swapped) { const sw = h('button', 'swap', '🔄 かえる'); sw.onclick = () => { if (swapGoal(G, i)) { SFX.pop(); closeTop(); openGoals(); } }; row.appendChild(sw); } L.appendChild(row); });
  speak('きょうの みっつ。' + G.goals.list.map((g) => g.t).join('。'));
}
async function openArt(sel) {
  const tg = G.me ? G.artBlocksNear(G.me.p) : []; const friends = G.residents.filter((r) => G.me && r.dist(G.me) < 6);
  const box = modal('mail', `<h2>🖼️ えを かざる</h2><p>えを えらんで、かざる ところを えらんでね</p><h3>1. え</h3><div class="artpick a1"></div><h3>2. かざる ところ</h3><div class="artpick a2"></div><p class="hint">がくぶち・えの はた・えの クッション・えの Tシャツかけ・かんばんを ちかくに おくと かざれるよ。なかまの Tシャツにも プリントできる！</p>`);
  const A1 = $('.a1', box), A2 = $('.a2', box); let pick = sel ?? (G.gallery.length ? G.gallery.length - 1 : -1);
  const nb = h('button', '', '<span style="font-size:44px">✏️</span><br>あたらしく かく'); nb.onclick = async () => { closeTop(); const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const ok = await openDraw({ layer: cv, title: '🖼️ かざる えを かこう', size: 1024 }); if (!ok) return; const sm = document.createElement('canvas'); sm.width = sm.height = 256; const g = sm.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.drawImage(cv, 0, 0, 256, 256); G.gallery.push({ img: sm.toDataURL('image/jpeg', 0.85), d: G.day }); G.gallery = G.gallery.slice(-30); openArt(G.gallery.length - 1); }; A1.appendChild(nb);
  G.gallery.forEach((a, i) => { const b = h('button', i === pick ? 'on' : '', `<img src="${a.img}" alt="">`); b.onclick = () => { pick = i; A1.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; A1.appendChild(b); });
  const apply = (fn) => { if (pick < 0 || !G.gallery[pick]) { news('さきに えを えらんでね（✏️で かける）'); SFX.ng(); return; } fn(G.gallery[pick].img); SFX.sticker(); closeTop(); };
  tg.forEach((t) => { const b = h('button', '', `<span style="font-size:36px">🖼️</span><br>${t.name}`); b.onclick = () => apply((img) => { G.arts[t.key] = img; G.refreshArts(); news(`🖼️ ${t.name}に えを かざったよ！`); const r = G.residents.find((o) => o !== G.me && G.me && o.dist(G.me) < 10 && o.state !== 'sleep'); if (r) setTimeout(() => r.say(rnd(['すてきな え！', 'わあ、かわいい！ だれが かいたの？', 'びじゅつかん みたい！']), 3, 'joy'), 1200); }); A2.appendChild(b); });
  friends.forEach((r) => { const b = h('button', ''); b.appendChild(faceIcon(r.f, r.drawingCanvas, 64)); b.appendChild(h('div', '', `👕 ${r.name}の Tシャツ`)); b.onclick = () => apply((img) => { r.f.art = img; G.rebuildResident(r); r.say(r === G.me ? 'じぶんの え の Tシャツ！' : rnd(['わあ！ この Tシャツ、たからものに する！', 'えの Tシャツだ！ にあう？']), 3, 'joy'); if (r !== G.me) r.pm('えの Tシャツを つくって くれた'); news(`👕 ${r.name}の Tシャツに えを プリント したよ！`); }); A2.appendChild(b); });
  if (!tg.length && !friends.length) A2.innerHTML = '<p>ちかくに かざれる ものが ないよ</p>';
}
export function openPhotoMode() {
  closeAll(); G.photoMode = true; document.body.classList.add('pmode');
  const P = h('div', '', ''); P.id = 'pmode'; document.body.appendChild(P); let frame = 0, tx = G.islandName || '';
  const FR = ['なし', '💗 ハート', '🌸 おはな', '⭐ ほし', '🎀 リボン'];
  P.innerHTML = `<div class="pt"><button data-k="x">✕ おわる</button><button data-k="fr">🖼️ わく：なし</button><input class="ptx" maxlength="14" placeholder="もじ（なくても いいよ）" value="${tx}"></div><div class="pl"><button data-k="up">⬆</button><button data-k="dn">⬇</button></div><div class="pr"><button data-k="zi">＋</button><button data-k="zo">－</button></div><div class="pb"><button data-k="l">◀</button><button data-k="pose">🙆 ポーズ！</button><button data-k="shot" class="shut">📸</button><button data-k="r">▶</button></div>`;
  const hold = {}; let raf = 0;
  const step = () => { if (!G.photoMode) return; if (hold.l) G.yaw += 0.03; if (hold.r) G.yaw -= 0.03; if (hold.up) G.pitch = Math.min(1.2, G.pitch + 0.02); if (hold.dn) G.pitch = Math.max(-1.45, G.pitch - 0.02); if (hold.zi) G.dist = Math.max(0.6, G.dist * 0.97); if (hold.zo) G.dist = Math.min(16, G.dist * 1.03); raf = requestAnimationFrame(step); }; step();
  P.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; if (['l', 'r', 'up', 'dn', 'zi', 'zo'].includes(k)) { b.onpointerdown = (e) => { e.preventDefault(); hold[k] = true; }; b.onpointerup = b.onpointerleave = () => (hold[k] = false); return; }
    b.onclick = () => {
      if (k === 'x') { G.photoMode = false; cancelAnimationFrame(raf); P.remove(); document.body.classList.remove('pmode'); return; }
      if (k === 'fr') { frame = (frame + 1) % FR.length; b.textContent = '🖼️ わく：' + FR[frame]; return; }
      if (k === 'pose') { const c = G.cam.position; G.residents.filter((r) => r !== G.me && r.state !== 'sleep' && r.obj.position.distanceTo(c) < 14).forEach((r, i) => { r.path = null; r.state = 'event'; r.timer = 6; r.evFace = [c.x, c.z]; r.evMode = ['joy', 'wave', 'cheer', 'dance'][i % 4]; setTimeout(() => r.say(rnd(['ピース！', 'はい チーズ！', 'にっこり〜', 'ポーズ！']), 2.5, 'joy'), 200 + i * 150); }); G.pets.forEach((p) => p.obj.position.distanceTo(c) < 14 && p.doTrick('jump')); SFX.pop(); return; }
      if (k === 'shot') { const W = 1200, H = 800; const c = G.shoot(W, H); const g = c.getContext('2d'); const t = $('.ptx', P).value.trim();
        if (frame) { const e = ['', '💗', '🌸', '⭐', '🎀'][frame]; g.lineWidth = 34; g.strokeStyle = ['', '#ffb6cf', '#ffd6e4', '#fff0a0', '#ffc8dc'][frame]; g.strokeRect(17, 17, W - 34, H - 34); for (let i = 0; i < 14; i++) { const a = i / 14; const [x, y] = a < 0.25 ? [a * 4 * W, 30] : a < 0.5 ? [W - 30, (a - 0.25) * 4 * H] : a < 0.75 ? [W - (a - 0.5) * 4 * W, H - 30] : [30, H - (a - 0.75) * 4 * H]; drawIcon(g, e, x, y, 56); } }
        if (t) { g.font = 'bold 58px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(t, W / 2, H - 70); g.fillStyle = '#ff6a8a'; g.fillText(t, W / 2, H - 70); }
        g.font = '24px sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(`${G.day}にちめ`, W - 50, 60);
        const sm = document.createElement('canvas'); sm.width = 680; sm.height = 453; sm.getContext('2d').drawImage(c, 0, 0, 680, 453);
        const uids = G.residents.filter((r) => r.obj.position.distanceTo(G.cam.position) < 10).map((r) => r.uid);
        G.album.push({ d: G.day, t: t || 'じぶんで とった しゃしん', uids, mine: true, img: sm.toDataURL('image/jpeg', 0.8) }); G.albumTrim && G.albumTrim();
        G.count && G.count('photo'); SFX.sticker(); const fl = h('div', 'flash'); document.body.appendChild(fl); setTimeout(() => fl.remove(), 500); news('📸 アルバムに いれたよ！'); }
    }; });
}
function openHelp() {
  TS.helped = true;
  const L = []; const add = (ic, t, fn) => L.push([ic, t, fn]);
  const unread = (G.mail || []).filter((m) => !m.read).length; if (unread) add('📮', `おてがみが ${unread}つ きてるよ`, () => openMail());
  const need = G.residents.filter((r) => r !== G.me && (r.need === 'consult' || r.need === 'episode'))[0]; if (need) add(need.need === 'episode' ? '🧵' : '💭', `${need.name}が こまってるみたい`, () => { if (G.me) { G.me.p.x = need.p.x + 1.3; G.me.p.z = need.p.z + 0.4; G.me.p.y = need.p.y + 0.3; } openResident(need); });
  if (G.goals) { const g = G.goals.list.find((x) => !x.done); if (g) add(g.ic, `きょうの3つ：${g.t}`, () => openGoals()); }
  const E = todayEvent(G); if (G.hour < E.h + 1) add('📅', `${E.h}じから ${E.n}`, () => {});
  const fav = (G.fav || []).map((u) => G.byUid(u)).filter(Boolean)[0]; if (fav) add('⭐', `${fav.name}に あいに いく`, () => { if (G.me) { G.me.p.x = fav.p.x + 1.3; G.me.p.z = fav.p.z + 0.4; G.me.p.y = fav.p.y + 0.3; G.yaw = Math.atan2(1.3, 0.4); } fav.say('あ！ きてくれたの！', 3, 'joy'); });
  add('🧱', 'おうちや こうえんを つくる', () => openPicker()); add('👀', 'なかまを みまもる', () => { const r = G.residents.find((o) => o !== G.me && o.state !== 'sleep'); if (r) G.setWatch(r); }); add('❓', 'もんだいで ごほうび', () => askQuiz(null));
  const box = modal('mail', `<h2>💡 いま できること</h2><div class="helpl"></div>`); const H = $('.helpl', box);
  L.slice(0, 5).forEach(([ic, t, fn], i) => { const b = h('button', 'hrow' + (i ? '' : ' top'), `<span>${ic}</span><div>${i ? '' : '<small>いちばん おすすめ</small>'}${t}</div>`); b.onclick = () => { closeTop(); fn(); }; H.appendChild(b); });
  speak(L.slice(0, 3).map((x) => x[1]).join('。'));
}
function openIsland() {
  const nm = G.islandName || 'ひだまりの島';
  const box = modal('mail', `<h2>🏝️ わたしの しま</h2><div class="iname"><input maxlength="12" value="${nm}"><button class="big ok">なまえを きめる</button></div><div class="ract"></div><h3>📸 しまの アルバム</h3><div class="icmp"></div>`);
  const inp = $('input', box); $('.iname button', box).onclick = () => { const v = inp.value.trim().slice(0, 12); if (!v) return; const first = !G.islandName; G.islandName = v; G.placeSign && G.placeSign(); SFX.level(); news(`🏝️ しまの なまえは「${v}」！ ひろばに かんばんが たったよ`); if (first) setTimeout(() => G.islandPhoto && G.islandPhoto(`「${v}」の はじまり`), 800); closeTop(); };
  { const S = islandStats(G); const rt = h('div', 'rates'); for (const [k, v] of Object.entries(S.rate)) rt.appendChild(h('div', '', `${k}<b>${'★'.repeat(v)}${'☆'.repeat(5 - v)}</b>`)); $('.iname', box).after(rt); rt.after(h('p', 'hint', `🌷 はな ${S.flowers}・🪑 かぐ ${S.furn}・🏠 ベッド ${S.beds}・👫 なかま ${S.residents}・📖 ずかん ${S.zukan}`)); }
  const A = $('.ract', box); const b = h('button', 'abtn', '<span>📸</span><i>しまの きねんしゃしん</i>'); b.onclick = () => { closeTop(); G.islandPhoto && G.islandPhoto(`${G.islandName || nm} ${G.day}にちめ`); }; A.appendChild(b);
  const ph = G.album.filter((a) => a.island); const C = $('.icmp', box);
  if (ph.length < 1) C.innerHTML = '<p>しゃしんを とると、しまの せいちょうを くらべられるよ（まいしゅう じどうでも とるよ）</p>';
  else { const pair = ph.length > 1 ? [ph[0], ph[ph.length - 1]] : [ph[0]]; pair.forEach((a, i) => { const c = h('div', 'icard', `<img src="${a.img}" alt=""><i>${i ? 'いま' : 'さいしょ'}（${a.d}にちめ）</i>`); c.onclick = () => showPhoto(a); C.appendChild(c); }); }
}
function openShop() {
  const box = modal('mail', `<h2>🎪 こうかんじょ</h2><p>シール：<b class="coins">🪙 ${G.coins || 0}</b>（きょうの3つ・ひがわりイベントで もらえる）</p><div class="shop"></div>`); const S = $('.shop', box);
  for (const it of SHOP) { if (!it.ok(G)) continue; const b = h('button', 'sitem', `<span>${it.ic}</span><b>${it.n}</b><i>🪙${it.c}</i>`); if ((G.coins || 0) < it.c) b.classList.add('dim'); b.onclick = () => { if ((G.coins || 0) < it.c) { SFX.ng(); news('シールが たりないよ'); return; } G.coins -= it.c; it.buy(G); SFX.level(); news(`${it.ic} ${it.n}と こうかん したよ！`); closeTop(); if (it.k === 'gold' || it.k === 'night') news('🐾 ペットの「へんしん」で つかえるよ'); }; S.appendChild(b); }
}
export function updateMail() { const b = $('#bMail'); if (!b || !G) return; const n = (G.mail || []).filter((m) => !m.read || !m.got).length; b.classList.toggle('has', n > 0); $('.badge', b).textContent = n || ''; }
export function openMail() {
  const L = [...(G.mail || [])].reverse();
  const box = modal('mail', `<h2>📮 おてがみ</h2><div class="mails"></div>`); const M = $('.mails', box);
  if (!L.length) M.innerHTML = '<p>まいあさ なかまから おてがみが とどくよ</p>';
  for (const m of L.slice(0, 10)) {
    const r = G.byUid(m.from); const c = h('div', 'letter' + (m.read ? '' : ' new'));
    const hd = h('div', 'lh'); if (r) hd.appendChild(faceIcon(r.f, r.drawingCanvas, 56)); hd.appendChild(h('div', '', `<b>${m.name}より</b><br><small>${m.d}にちめ</small>`)); c.appendChild(hd);
    c.appendChild(h('div', 'stamp', ['💌', '🌸', '⭐', '🍀'][Math.floor(m.id) % 4]));
    c.appendChild(h('p', '', m.text.join('<br>')));
    c.appendChild(h('div', 'sig', `${m.name}`));
    const A = h('div', 'la'); c.appendChild(A);
    const rd = h('button', '', '🔊 よむ'); rd.onclick = () => speak(m.text.join('。') + '。' + m.name + 'より'); A.appendChild(rd);
    if (!m.got) { const g = h('button', 'hi', `🎁 ${giftLabel(m.gift)}`); g.onclick = () => { takeGift(G, m); SFX.ok(); g.remove(); news(`🎁 ${m.name}から ${giftLabel(m.gift)}を もらった！`); updateMail(); }; A.appendChild(g); }
    if (r && r !== G.me) { const go = h('button', '', '🏃 あいにいく'); go.onclick = () => { closeAll(); if (G.me) { G.me.p.x = r.p.x + 1.3; G.me.p.y = r.p.y + 0.3; G.me.p.z = r.p.z + 0.4; G.me.p.vy = 0; G.yaw = Math.atan2(G.me.p.x - r.p.x, G.me.p.z - r.p.z); G.pitch = -0.2; G.dist = 3.5; } else G.setWatch(r); if (r.state !== 'sleep' && !r.controlled && r.state !== 'mini') { r.path = null; r.state = 'look'; r.timer = 5; if (G.me) r.faceTo(G.me); } r.say(rnd(['てがみ よんで くれた？ うれしい！', 'きてくれたの！？ ありがとう！', 'わーい！ あいに きてくれた！']), 3.5, 'joy'); if (G.me && !m.met) { m.met = 1; r.addRel(G.me, 6, G); r.pm('てがみを よんで あいに きてくれた'); } effect('heart', r); }; A.appendChild(go); }
    M.appendChild(c); m.read = true;
  }
  if (L.length) G.count && G.count('mail');
  updateMail();
}
let talkLast = {};
function talkGrow(r) { const now = performance.now(); if (now - (talkLast[r.uid] || 0) < 15000) return; talkLast[r.uid] = now; r.talkN = (r.talkN || 0) + 1; const pool = CATCH[r.f.personality % 7]; const k = [3, 8, 15].indexOf(r.talkN); if (k >= 0 && pool[k] && !(r.catch || []).includes(pool[k])) { r.catch = [...(r.catch || []), pool[k]]; setTimeout(() => { r.say(`${pool[k]}`, 3, 'joy'); news(`💬 ${r.name}に あたらしい くちぐせ「${pool[k]}」！ よく はなして くれるから`); r.ch && r.ch.setExpr && r.ch.setExpr('happy'); }, 1200); } }
function talkTo(r) {
  const ml = memLine(G, r); const lines = [...(ml ? [ml, ml] : []), ...r.pers.talk, 'きょうは なにを つくるの？', 'この しま すきだよ', `${r.home ? 'おうち きにいってるよ' : 'おうちが ほしいなぁ'}`];
  { const yd = r.diary.filter((e) => e.d === G.day - 1 && !/はじめて/.test(e.t)); if (yd.length) lines.push(`きのう ${rnd(yd).t.replace(/\s*\S*[\u{1F300}-\u{1FAFF}☀-➿]\S*$/u, '')}んだよ！`, `きのう ${rnd(yd).t.replace(/\s*\S*[\u{1F300}-\u{1FAFF}☀-➿]\S*$/u, '')}の！ きいて きいて！`);
    if (G.islandName) lines.push(`「${G.islandName}」、だいすき！`); const W = G.weather && G.weather.k; lines.push(W === 'rain' ? 'あめの ひは おうちで あそぼ' : W === 'snow' ? 'ゆき！ さむいけど たのしい！' : 'きょうは いい てんきだね！');
    const pt = G.pets.find((p) => p.owner === r.uid); if (pt) lines.push(`${pt.name}ね、きのう ${rnd(['ねごと いってたの', 'くしゃみ したの', 'わたしの くつを かくしたの'])}！ あはは`);
    if (G.todayName) lines.push(`きょうの ${G.todayName}、いっしょに いこうね！`); if ((G.fav || []).includes(r.uid)) lines.push('いつも あいに きてくれて うれしいな', 'ずっと なかよし だよ！');
    if (Math.random() < 0.25) lines.push(rnd(['ねえ、くもって わたあめ かな？', 'さかなって ねるとき めを あけてるんだって！', 'ペンギンって ひざ あるんだって！']));
    (r.catch || []).forEach((c) => lines.push(`${rnd(r.pers.talk)} ${c}`)); }
  const fr = Object.entries(r.rel).sort((a, b) => b[1] - a[1])[0]; if (fr) { const o = G.byUid(+fr[0]); if (o) lines.push(`${o.name}とは ${REL_LABEL(fr[1])[0]}なんだ`); }
  { const L2 = lines.filter((l) => !G.recentLines || !G.recentLines.has(l) || (G.time - G.recentLines.get(l)) > 8); const ln = rnd(L2.length ? L2 : lines); (G.recentLines || (G.recentLines = new Map())).set(ln, G.time); r.say(ln, 3.5); } r.addExp(4, G); r.faceTo(G.me || { p: { x: G.cam.position.x, z: G.cam.position.z } }); effect('heart', r);
}
function giveFood(r) {
  const box = modal('bag', `<h2>🍙 ${r.name}に たべものを あげる</h2><div class="fgrid"></div><p class="hint">もんだいに せいかいすると たべものが もらえるよ</p>`);
  const fg = $('.fgrid', box); let any = false;
  FOODS.forEach(([e, n], i) => { const c = G.bag.food[i] || 0; if (!c) return; any = true; const b = h('button', 'fbtn', `<span>${foodIc(i)}</span><i>${n}</i><b>×${c}</b>`); b.onclick = () => {
    G.bag.food[i]--; closeTop(); G.count && G.count('food'); r.pm(`${e} ${n}を くれた`); r.state = 'eat'; r.timer = 3; r.mode = 'eat'; r.hunger = Math.max(0, r.hunger - 55); if (r.ch.foodObj) { r.ch.body.remove(r.ch.foodObj); r.ch.foodObj = null; } r.ch.eatFood = i; setTimeout(() => { if (r.ch.eatFood === i) r.ch.eatFood = null; }, 4500);
    const fav = i === r.f.food; r.say(fav ? `${e} ${n}！ だいすき！！` : `${e} いただきます！ おいしい！`, 3.5, 'joy'); effect(fav ? 'heart' : 'eat', r); SFX.ok();
    r.addExp(fav ? 35 : 15, G); if (r.need === 'hungry') { r.need = null; payReward(r, 'food'); } }; fg.appendChild(b); });
  if (!any) { fg.innerHTML = '<p>たべものが ないよ。<br>もんだいに こたえて もらおう！</p>'; const q = h('button', 'big ok', '❓ もんだいに こたえる'); q.onclick = () => { closeTop(); askQuiz(null); }; fg.appendChild(q); }
}
function giveGift(r) {
  const box = modal('bag', `<h2>🎁 ${r.name}に ぼうしを プレゼント</h2><div class="fgrid"></div>`);
  const fg = $('.fgrid', box);
  HATS.forEach((n, i) => { if (i && !G.bag.hats.includes(i)) return; const b = h('button', 'fbtn' + (r.f.hat === i ? ' on' : ''), `<span>${['🙅', '🧢', '🎀', '👑', '🌸', '🐱', '🧙', '🎨', '🎧', '🧶', '👒', '🐰', '😇', '🦄', '🎌', '📎', '👸', '🧢', '🥳', '🐻'][i]}</span><i>${n}</i>`); b.onclick = () => {
    closeTop(); r.f.hat = i; G.rebuildResident(r); r.say(i ? 'わあ、かわいい！ ありがとう！' : 'すっきり！', 3, 'joy'); effect('gift', r); SFX.ok(); if (r.need === 'gift') { r.need = null; r.addExp(25, G); payReward(r, 'gift'); } else r.addExp(8, G); }; fg.appendChild(b); });
  box.appendChild(h('p', 'hint', `ぼうしは もんだいの ごほうびで ふえるよ（${G.bag.hats.length}/${HATS.length - 1}）`));
}
function openRelations() {
  const box = modal('list', `<h2>💞 なかよし ちず</h2><div class="relmap"></div><div class="rellegend">💗 なかよし　🔥 ライバル　🙇 そんけい　😣 にがて</div><div class="relgrid"></div><div class="reldet"></div>`);
  const grid = $('.relgrid', box), det = $('.reldet', box);
  const L = G.residents, S = 520, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); const pos = L.map((r, i) => { const a = (i / L.length) * Math.PI * 2 - Math.PI / 2; return [S / 2 + Math.cos(a) * S * 0.38, S / 2 + Math.sin(a) * S * 0.38]; });
  const icons = L.map((r) => faceIcon(r.f, r.drawingCanvas, 76));
  const drawMap = (sel) => { g.clearRect(0, 0, S, S);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], v = Math.max(a.rel[b.uid] || 0, b.rel[a.uid] || 0), t = a.rtype[b.uid] || b.rtype[a.uid]; if (v < 45 && !t) continue; const on = !sel || a === sel || b === sel; g.beginPath(); g.moveTo(...pos[i]); g.lineTo(...pos[j]); g.setLineDash(t === 'dislike' ? [8, 8] : []); g.strokeStyle = t === 'rival' ? '#ff9a3a' : t === 'respect' ? '#5a8ae0' : t === 'dislike' ? '#9a9a9a' : t === 'admire' ? '#c8a0f0' : '#ff7aa8'; g.lineWidth = (t ? 5 : 2 + (v - 45) / 10) * (sel && on ? 1.8 : 1); g.globalAlpha = on ? (sel ? 0.95 : t ? 0.9 : 0.35 + (v - 45) / 100) : 0.07; g.stroke(); g.globalAlpha = 1; }
    g.setLineDash([]); L.forEach((r, i) => { const on = !sel || r === sel || Math.max(sel.rel[r.uid] || 0, r.rel[sel.uid] || 0) >= 45 || sel.rtype[r.uid] || r.rtype[sel.uid]; g.globalAlpha = on ? 1 : 0.35; const R0 = r === sel ? 44 : 36; g.save(); g.beginPath(); g.arc(pos[i][0], pos[i][1], R0, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = r === sel ? 6 : 3; g.strokeStyle = r === sel ? '#ff8a5c' : '#e9dccb'; g.stroke(); g.clip(); g.drawImage(icons[i], pos[i][0] - R0 - 2, pos[i][1] - R0 - 2, R0 * 2 + 4, R0 * 2 + 4); g.restore(); g.fillStyle = '#3a2f3d'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText(r.name, pos[i][0], pos[i][1] + R0 + 16); g.globalAlpha = 1; }); };
  cv.className = 'relcv'; $('.relmap', box).appendChild(cv);
  cv.onclick = (e) => { const b = cv.getBoundingClientRect(); const x = (e.clientX - b.left) * S / b.width, y = (e.clientY - b.top) * S / b.height; const i = pos.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 44); if (i >= 0) grid.children[i]?.click(); };
  const show = (r) => {
    det.innerHTML = `<h3>${r.name}の ともだち</h3>`;
    const others = G.residents.filter((o) => o !== r).sort((a, b) => (r.rel[b.uid] || 0) - (r.rel[a.uid] || 0));
    for (const o of others) { const v = r.rel[o.uid] || 0, [lb, ic] = REL_LABEL(v); const row = h('div', 'relrow'); row.appendChild(faceIcon(o.f, o.drawingCanvas, 44)); const rt = r.rtype && r.rtype[o.uid]; row.appendChild(h('div', '', `<b>${o.name}</b> ${ic} ${lb}${rt ? ` <span class="rt">${RTYPE[rt][1]} ${RTYPE[rt][0]}</span>` : ''}<div class="bar"><i style="width:${v}%"></i></div>`)); det.appendChild(row); }
    if (!others.length) det.innerHTML += '<p>なかまを ふやそう！</p>';
  };
  G.residents.forEach((r, i) => { const b = h('button', 'relf'); b.appendChild(faceIcon(r.f, r.drawingCanvas, 60)); b.appendChild(h('i', '', r.name)); b.onclick = () => { grid.querySelectorAll('.relf').forEach((x) => x.classList.remove('on')); b.classList.add('on'); show(r); drawMap(r); }; grid.appendChild(b); if (!i) { b.classList.add('on'); show(r); drawMap(r); } });
}
const ZUKAN = [['むし', [['チョウ', '🦋'], ['ハチ', '🐝'], ['テントウムシ', '🐞'], ['ホタル', '✨']], 'とんでいる むしを タップ（よるは みずべに ホタル）'],
  ['さかな', [['さかな', '🐟'], ['ねったいぎょ', '🐠'], ['カニ', '🦀'], ['タコ', '🐙'], ['ながぐつ', '👢'], ['エビ', '🦐'], ['イカ', '🦑'], ['ふぐ', '🐡'], ['サメ', '🦈']], 'つりを すると みつかる（じょうずに なると めずらしい さかなも）'],
  ['かせき', [['きょうりゅうの ほね', '🦴'], ['アンモナイト', '🐚'], ['キバ', '🦷']], 'うみより ひくい ところを ほる'], ['ほうせき', [['ダイヤ', '💎'], ['すいしょう', '🔮'], ['ヒスイ', '🟢']], 'ひくい ところの いしを ほる'],
  ['たから', [['おうかん', '👑'], ['きんか', '🪙'], ['ふしぎな かぎ', '🗝️']], 'きの ねもとの じめんを ほる'], ['はな', [['にじいろのはな', '🌈'], ['つきみそう', '🌙']], 'あめの ひ・よるだけ さく はなを つむ'],
  ['ふしぎ', [['ひかるどうくつ', '🕯️'], ['にじ', '🌈'], ['にじいろの ちょうちょ', '🦋']], 'やまの なかと あめあがりの そら・めずらしい ひ']];
function openZukan() {
  const total = ZUKAN.reduce((a, z) => a + z[1].length, 0), got = Object.keys(G.zukan).length;
  const box = modal('bag', `<h2>📖 ずかん（${got}/${total}）</h2><div class="zk"></div>`); const Z = $('.zk', box);
  for (const [cat, items, hint] of ZUKAN) { Z.appendChild(h('h3', '', cat)); const g = h('div', 'fgrid'); for (const [n, e] of items) { const f = G.zukan[n]; g.appendChild(h('div', 'fbtn' + (f ? '' : ' dim'), f ? `<span>${e}</span><i>${n}</i><b>${f.d}にちめ</b>` : '<span>❓</span><i>？？？</i>')); } Z.appendChild(g); Z.appendChild(h('p', 'hint', 'ヒント：' + hint)); }
}
function showPhoto(a) { const box = modal('photo', `<img src="${a.img}" alt=""><p>${a.d}にちめ ${a.t}</p>`); const b = h('button', 'more', a.star ? '⭐ だいじ（けさない）' : '☆ だいじに する'); b.onclick = () => { a.star = !a.star; b.textContent = a.star ? '⭐ だいじ（けさない）' : '☆ だいじに する'; SFX.pop(); }; box.appendChild(b); }
function openAlbum(filt) {
  const L0 = filt === 'fav' ? G.album.filter((a) => a.uids.some((u) => (G.fav || []).includes(u))) : filt === 'island' ? G.album.filter((a) => a.island) : filt === 'rare' ? G.album.filter((a) => a.rare) : G.album;
  const box = modal('list', `<h2>📸 アルバム（${L0.length}まい）</h2><div class="atabs"></div><div class="album"></div>`);
  const T = $('.atabs', box); [['all', 'ぜんぶ'], ['fav', '⭐ おきにいり'], ['island', '🏝️ しま'], ['rare', '✨ めずらしい']].forEach(([k, n]) => { const b = h('button', (filt || 'all') === k ? 'on' : '', n); b.onclick = () => { closeTop(); openAlbum(k); }; T.appendChild(b); });
  const L = $('.album', box); if (!L0.length) L.innerHTML = filt === 'fav' ? '<p>なかまの パネルの ☆ で おきにいりを えらぼう</p>' : '<p>たんじょうび・なかなおり・ゆめが かなった とき などに しゃしんが ふえるよ</p>';
  [...L0].reverse().forEach((a) => { const im = h('img'); im.src = a.img; im.onclick = () => showPhoto(a); L.appendChild(im); });
}
function openNews() {
  const box = modal('list', `<h2>📰 しまニュース</h2><div class="nlist"></div>`);
  const L = $('.nlist', box); const items = G.newsLog.slice(-50).reverse();
  if (!items.length) L.innerHTML = '<p>まだ ニュースは ないよ</p>';
  for (const n of items) L.appendChild(h('div', 'nrow', `<small>${n.d}にちめ ${n.h}じ</small> ${n.t}`));
}
function openBag() {
  const box = modal('bag', `<h2>🎒 バッグ</h2><h3>たべもの</h3><div class="fgrid f1"></div><h3>そのほか</h3><div class="fgrid f2"></div>`);
  const f1 = $('.f1', box), f2 = $('.f2', box);
  FOODS.forEach(([e, n], i) => { const c = G.bag.food[i] || 0; if (c) f1.appendChild(h('div', 'fbtn', `<span>${foodIc(i)}</span><i>${n}</i><b>×${c}</b>`)); });
  if (!f1.children.length) f1.innerHTML = '<p>なし</p>';
  f2.appendChild(h('div', 'fbtn', `<span>🥚</span><i>ペットのたまご</i><b>×${G.bag.eggs}</b>`));
  const tk = h('button', 'fbtn', `<span>🎟️</span><i>パーティーけん</i><b>×${G.bag.tickets}</b>`); tk.onclick = () => { if (G.bag.tickets > 0) { G.bag.tickets--; closeTop(); G.startParty(); } else news('もんだいの ごほうびで もらえるよ'); }; f2.appendChild(tk);
  f2.appendChild(h('div', 'fbtn', `<span>🧢</span><i>ぼうし</i><b>${G.bag.hats.length}こ</b>`));
  { const sb = h('button', 'fbtn', `<span>🪙</span><i>シール</i><b>×${G.coins || 0}</b>`); sb.onclick = () => { closeTop(); openShop(); }; f2.appendChild(sb); }
  box.appendChild(h('h3', '', '🏅 きねんスタンプ')); const st = h('div', 'stamps'); box.appendChild(st);
  [['flower', '🌸', 'おはなまつり'], ['petshoot', '📸', 'ペット'], ['fashion', '👗', 'ファッション'], ['sports', '🏅', 'うんどうかい'], ['star', '🌠', 'ながれぼし'], ['sweets', '🍪', 'おかし'], ['music', '🎵', 'おんがくかい']].forEach(([k, e, n]) => { const c = (G.stamps || {})[k] || 0; st.appendChild(h('div', c ? '' : 'dim', `${e}<i>${n}${c > 1 ? '×' + c : ''}</i>`)); });
}
function openSettings() {
  const box = modal('list', `<h2>⚙️ せってい</h2><div class="sets"></div>`);
  const S = $('.sets', box);
  const tg = (label, get, set) => { const b = h('button', 'setb', `${label}：<b>${get() ? 'オン' : 'オフ'}</b>`); b.onclick = () => { set(!get()); b.innerHTML = `${label}：<b>${get() ? 'オン' : 'オフ'}</b>`; }; S.appendChild(b); };
  tg('🌑 かげ', () => G.settings.shadow, (v) => G.setShadow(v));
  tg('🔊 おと', () => G.settings.sound, (v) => { G.settings.sound = v; SFX.on = v; });
  tg('🎵 ひるの おんがく', () => !!G.settings.bgmDay, (v) => { G.settings.bgmDay = v; });
  for (const [k, n] of [['se', '🔔 こうかおん'], ['voice', '🗣️ なかまの こえ'], ['bgm', '🎵 おんがく']]) { const row = h('div', 'qsel', n + '：'); [0, 0.25, 0.5, 0.75, 1].forEach((v) => { const b = h('button', Math.abs((G.settings['vol_' + k] ?? (k === 'bgm' ? 0.6 : 1)) - v) < 0.01 ? 'on' : '', v ? '🔈'.repeat(Math.ceil(v * 4)) : '🔇'); b.onclick = () => { G.settings['vol_' + k] = v; SFX.vol[k] = v; if (k === 'voice') window.__voiceVol = v; row.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); k === 'se' ? SFX.pon() : k === 'voice' ? SFX.babble(0, 5, 1, 'joy') : null; }; row.appendChild(b); }); S.appendChild(row); }
  const qs = h('div', 'qsel', '❓ もんだいの しゅるい：'); [['all', 'ぜんぶ'], ['math', 'さんすう'], ['kokugo', 'こくご'], ['eigo', 'えいご']].forEach(([k, n]) => { const b = h('button', G.settings.quiz === k ? 'on' : '', n); b.onclick = () => { G.settings.quiz = k; qs.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; qs.appendChild(b); }); S.appendChild(qs);
  S.appendChild(h('div', 'help', `<h3>あそびかた</h3><p>📱 タッチ：ひだりで いどう・みぎを なぞって みまわす・ボタンで おく/こわす</p><p>⌨️ キーボード：WASD いどう・クリックで マウスそうさ・ひだりクリック こわす・みぎクリック おく・E ブロック・F はなす・G とぶ・Q メニュー</p><p>🎮 コントローラー：R2 おく・L2 こわす・○ はなす・△ ブロック・L1/R1 えらぶ・L3 とぶ</p>`));
}

// ---------- もんだい
const REWARDS = () => { const r = Math.random(); if (r < 0.58) return 'food'; if (r < 0.74) return 'hat'; if (r < 0.9) return 'egg'; return 'ticket'; };
export function watchPrompt(title, go) {
  const old = $('#wprompt'); if (old) old.remove();
  const b = h('button', '', `👀 みてみる？<small>${title}</small>`); b.id = 'wprompt'; document.body.appendChild(b);
  b.onclick = () => { b.remove(); go(); }; setTimeout(() => b.remove(), 9000);
}
function openConsult(r) {
  const c = r.consult; const opts = CONSULT_OPTS[c.k](G, r);
  const box = modal('res', `<div class="rhead"></div><h3>どうする？</h3><div class="ract"></div>`);
  $('.rhead', box).appendChild(faceIcon(r.f, r.drawingCanvas, 90));
  const o = c.to && G.byUid(c.to);
  $('.rhead', box).appendChild(h('div', 'rinfo', `<h2>${r.name}の そうだん</h2><div>${c.k === 'makeup' ? `${o?.name}と けんかしちゃった… なかなおり したい` : c.k === 'bdgift' ? `あしたは ${o?.name}の たんじょうび。プレゼント なにが いいかな？` : c.k === 'friend' ? 'もっと ともだちが ほしいな' : 'みんなで なにして あそぼう？'}</div>`));
  const A = $('.ract', box);
  for (const [ic, nm, fn] of opts) { const b = h('button', 'abtn', `<span>${ic}</span><i>${nm}</i>`); b.onclick = () => { closeTop(); r.need = null; r.consult = null; payReward(r, 'consult'); fn(); r.pm('そうだんに のって くれた'); r.addExp(15, G); effect('heart', r); r.log(`そうだんに のってもらった 💭`); }; A.appendChild(b); }
}
export function askQuiz(r, onOk) {
  // もんだいは「せかいを しる」で 1もん（きょうかしょの つづき・ずんだもんの こえ・1もん 5えん）
  if (G.started === false || document.getElementById('sk')) return;
  const prefer = ['math', 'kokugo', 'eigo'].includes(G.settings.quiz) ? G.settings.quiz : undefined;
  if (r) r.say('いっしょに かんがえよう！', 2.5);
  G.studyOpen = true; const end = () => { G.studyOpen = false; G.save && G.save(true); };
  openSekai({ gameId: 'nakayoshi', prefer,
    gate: { goal: 1, back: 'しま', onDone: () => { end(); G.count && G.count('quiz'); reward(r, null); onOk && onOk(); }, onQuit: () => end(), onAssistExit: () => end() } });
}
function reward(r, q) {
  const bonus = G.studyBonus === G.day;
  const k = REWARDS(); let html = '';
  if (bonus) { G.bag.food[13] = (G.bag.food[13] || 0) + 1; }
  if (k === 'food') { const i = Math.floor(Math.random() * FOODS.length), n = 1 + (Math.random() < 0.4 ? 1 : 0); G.bag.food[i] = (G.bag.food[i] || 0) + n; html = `<div class="rwbig">${foodIc(i)}</div><p>${FOODS[i][1]}を ${n}こ もらった！</p>`; }
  else if (k === 'hat') { const left = HATS.map((_, i) => i).filter((i) => i && !G.bag.hats.includes(i)); if (left.length) { const i = rnd(left); G.bag.hats.push(i); html = `<div class="rwbig">🧢</div><p>あたらしい ぼうし「${HATS[i]}」を もらった！<br>なかまに プレゼント しよう</p>`; } else { G.bag.food[5] = (G.bag.food[5] || 0) + 2; html = `<div class="rwbig">🍰</div><p>ケーキを 2こ もらった！</p>`; } }
  else if (k === 'egg') { G.bag.eggs++; html = `<div class="rwbig">🥚</div><p>ペットのたまごを もらった！<br>なかまの ペットを かこう</p>`; }
  else { G.bag.tickets++; html = `<div class="rwbig">🎟️</div><p>パーティーけんを もらった！<br>バッグから つかうと みんなで パーティー</p>`; }
  if (r) { r.addExp(25, G); r.say(rnd(['せいかい！ すごい！', 'やったね！', 'てんさい！']), 3, 'joy'); effect('heart', r); if (r.need === 'quiz') { r.need = null; payReward(r, 'quiz'); }
    const c = q && q.ctx;
    if (q && q.theme === 'share' && c && c.o) { setTimeout(() => { r.say(`${c.o.name}に クッキー もっていくね！`, 3, 'joy'); r.addRel(c.o, 8, G); news(`🍪 ${r.name}が ${c.o.name}に クッキーを わけた`); r.log(`${c.o.name}に クッキーを わけた 🍪`); }, 2500); }
    if (q && q.theme === 'letter' && c && c.o) { setTimeout(() => { r.say(`${c.o.name}に てがみを だしてくる！`, 3, 'joy'); r.addRel(c.o, 8, G); news(`✉️ ${r.name}が ${c.o.name}に てがみを かいた`); c.o.log(`${r.name}から てがみが きた ✉️`); }, 2500); }
    if (q && q.theme === 'pet' && c && c.pet) { setTimeout(() => { c.pet.doTrick('spin'); c.pet.say('♪ わーい', 2); c.pet.love += 5; }, 1500); }
  }
  const box = modal('reward', `<h2>⭕ せいかい！</h2>${html}${bonus ? '<p>📚 べんきょうかい ボーナス：🍪クッキーも もらった！</p>' : ''}<div class="row"><button class="big ok">やったー！</button><button class="big more">もう1もん</button></div>`);
  $('.ok', box).onclick = () => closeTop(); $('.more', box).onclick = () => { closeTop(); askQuiz(null); };
}

// ---------- かおづくり
let pv = null;
function previewR() {
  if (pv) return pv;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x9a8a80, 1.3)); const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(1, 2, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  pv = { r, sc, cam, yaw: 0, zoom: 'face' }; r.domElement.className = 'pv3d';
  let drag = null; r.domElement.addEventListener('pointerdown', (e) => { r.domElement.setPointerCapture(e.pointerId); if (pv.paint) { pv.paint(e, 'down'); return; } drag = e.clientX; });
  r.domElement.addEventListener('pointermove', (e) => { if (pv.paint) { if (e.buttons || e.pointerType === 'touch') pv.paint(e, 'move'); return; } if (drag != null) { pv.yaw += (e.clientX - drag) * 0.012; drag = e.clientX; } });
  r.domElement.addEventListener('pointerup', (e) => { drag = null; if (pv.paint) pv.paint(e, 'up'); });
  const loop = () => { requestAnimationFrame(loop); if (!pv.ch || !r.domElement.isConnected) return; const w = r.domElement.clientWidth, hh = r.domElement.clientHeight; if (r.domElement.width !== Math.floor(w * r.getPixelRatio())) { r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); } if (pv.paint || window.__pvStill) { pv.ch.root.rotation.y = pv.yaw; if (!pv.posed) { pv.ch.animate(0, 0, 0.016, 'idle'); pv.ch.body.position.y = 0; pv.posed = true; } } else { pv.posed = false; pv.ch.root.rotation.y = pv.yaw + Math.sin(performance.now() / 1400) * 0.25; pv.ch.animate(performance.now() / 1000, 0, 0.016, 'idle'); }
    const M = pv.ch.meta, S = pv.ch.body.scale.y; const hy = M && pv.ch.pr ? pv.ch.pr.headC * S : pv.ch.head.position.y; const H = pv.ch.height || 1.1; const tl = pv.tilt || 0;
    if (pv.zoom === 'face') { const d = M ? Math.max(1.6, pv.ch.pr.headR * S * 6.5) : 1.7; cam.position.set(0, hy + 0.05 + tl * d * 0.7, d * (1 - tl * 0.3)); cam.lookAt(0, hy, 0); } else { const d = Math.max(2.6, H * 3.1); cam.position.set(0, H * 0.55 + tl * d * 0.8, d * (1 - tl * 0.3)); cam.lookAt(0, H * 0.5, 0); } r.render(sc, cam); };
  loop(); return pv;
}
function setPreview(f, drawing) { const P = previewR(); if (P.ch) { P.sc.remove(P.ch.root); P.ch.dispose(); } P.ch = makeChar(f); if (drawing) P.ch.setDrawing(drawing); P.sc.add(P.ch.root); return P; }
function partIcon(kind, i, f) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = SKINS[f.skin]; g.fillRect(0, 0, 64, 64);
  g.setTransform(64 / 22, 0, 0, 64 / 22, 32, 32);
  if (kind === 'eye') { g.translate(-4.5, 0); drawEye(g, i, f.eye.c, 'open'); g.translate(9, 0); g.scale(-1, 1); drawEye(g, i, f.eye.c, 'open'); }
  if (kind === 'brow') { g.translate(-5, 0); g.scale(0.7, 1); drawBrow(g, i, f.brow.c || f.hairColor); g.setTransform(64 / 22, 0, 0, 64 / 22, 32, 32); g.translate(5, 0); g.scale(-0.7, 1); drawBrow(g, i, f.brow.c || f.hairColor); }
  if (kind === 'nose') { g.scale(1.6, 1.6); drawNose(g, i); }
  if (kind === 'mouth') { g.scale(1.5, 1.5); drawMouth(g, i, f.mouth.c, undefined, f.mouth.lc); }
  if (kind === 'glass') { g.scale(0.55, 0.55); drawGlass(g, i, f.glass.c, 11); }
  if (kind === 'beard') { g.scale(0.55, 0.55); g.translate(0, -8); drawBeard(g, i, f.hairColor); }
  return c;
}
export function openFaceEditor(f, drawing, title) {
  return new Promise((resolve) => {
    f = JSON.parse(JSON.stringify(f)); const dcv = document.createElement('canvas'); dcv.width = dcv.height = 1024; if (drawing) dcv.getContext('2d').drawImage(drawing, 0, 0);
    const box = modal('editor hard', `<div class="ed-l"><div class="ed-pv"></div><div class="ed-zoom"><button data-z="face">かお</button><button data-z="body">ぜんしん</button></div><button class="big drawbtn">✏️ おえかきで かきこむ</button></div>
      <div class="ed-r"><div class="ed-tabs"></div><div class="ed-body"></div></div>
      <div class="ed-bot"><button class="big rnd">🎲 おまかせ</button><span class="sp"></span><button class="big no">やめる</button><button class="big ok">できた！</button></div>`, { noClose: true });
    box.prepend(h('h2', 'ed-title', title || 'かおを つくろう'));
    const pcv = document.createElement('canvas'); pcv.width = pcv.height = PAINT_SIZE; const pctx = pcv.getContext('2d', { willReadFrequently: true }); let painted = !!(f.paint && f.paintSp === f.species); const undoS = [];
    const syncPaint = () => { if (P.ch && P.ch.setPaintCanvas) P.ch.setPaintCanvas(pcv); };
    if (painted) { const im = paintImg(f.paint); const dr = () => { pctx.drawImage(im, 0, 0, PAINT_SIZE, PAINT_SIZE); syncPaint(); }; if (im.complete && im.naturalWidth) setTimeout(dr, 0); else im.addEventListener('load', dr); }
    const P = setPreview(f, dcv); $('.ed-pv', box).appendChild(P.r.domElement); P.paint = null; P.tilt = 0; P.yaw = 0;
    const upd = (full = true) => { if (full) { setPreview(f, dcv); syncPaint(); P.posed = false; } else { P.ch.f = f; P.ch.refreshFace(); } };
    box.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { P.zoom = b.dataset.z; box.querySelectorAll('[data-z]').forEach((x) => x.classList.toggle('on', x === b)); })); P.zoom = 'face'; box.querySelector('[data-z=face]').classList.add('on');
    const ALL_TABS = [['name', '📛', 'なまえ'], ['shape', '🙂', 'りんかく'], ['hair', '💇', 'かみ'], ['eye', '👀', 'め'], ['brow', '〰️', 'まゆ'], ['nose', '👃', 'はな'], ['mouth', '👄', 'くち'], ['glass', '👓', 'メガネ'], ['extra', '🧔', 'ひげ・ほお'], ['body', '👕', 'からだ']];
    const tabs = $('.ed-tabs', box), body = $('.ed-body', box); let cur = 'name', lastCur = null;
    let easy = G.editEasy ?? true;
    const mkTabs = () => { tabs.innerHTML = ''; const mb = h('button', 'mode', easy ? '<span>🌟</span><i>かんたん</i>' : '<span>🛠️</span><i>こだわり</i>'); mb.onclick = () => { easy = !easy; G.editEasy = easy; mkTabs(); render(); }; tabs.appendChild(mb);
      (f.species ? [['name', '📛', 'なまえ'], ['species', '🐾', 'どうぶつ'], ['eye', '👀', 'め'], ['mouth', '👄', 'くち'], ['cheek', '🌸', 'ほっぺ'], ['brow', '〰️', 'まゆ'], ['glass', '👓', 'メガネ'], ['body', '🤸', 'からだ'], ['paint', '🖌️', 'ぬる']].filter(([k]) => !easy || ['name', 'species', 'eye', 'mouth', 'cheek', 'body', 'paint'].includes(k)) : ALL_TABS.filter(([k]) => !easy || ['name', 'hair', 'eye', 'mouth', 'body'].includes(k))).forEach(([k, ic, nm]) => { const b = h('button', '', `<span>${ic}</span><i>${nm}</i>`); b.dataset.k = k; b.onclick = () => { cur = k; render(); }; tabs.appendChild(b); }); };
    mkTabs();
    const grid = (opts, get, set, full = true) => { const g = h('div', 'og'); opts.forEach((o, i) => { const b = h('button', 'ob' + (get() === i ? ' on' : '')); if (o instanceof HTMLCanvasElement) b.appendChild(o); else b.innerHTML = o; b.onclick = () => { set(i); g.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); upd(full); }; g.appendChild(b); }); body.appendChild(g); };
    const colors = (label, list, get, set, full = false) => { const row = h('div', 'cr', `<i>${label}</i>`); list.forEach((c) => { const b = h('button', 'cb' + (get() === c ? ' on' : '')); b.style.background = c; b.onclick = () => { set(c); row.querySelectorAll('.cb').forEach((x) => x.classList.remove('on')); b.classList.add('on'); upd(full); }; row.appendChild(b); }); const pick = h('input'); pick.type = 'color'; pick.value = get() || '#000000'; pick.oninput = () => { set(pick.value); upd(full); }; row.appendChild(pick); body.appendChild(row); };
    const slider = (label, min, max, step, get, set, full = false) => { const row = h('div', 'sr', `<i>${label}</i>`); const s = h('input'); s.type = 'range'; s.min = min; s.max = max; s.step = step; s.value = get(); s.oninput = () => { set(+s.value); upd(full); }; row.appendChild(s); body.appendChild(row); };
    const pos = (o, sp = true, rot = true) => { o.y = o.y || 0; o.size = o.size || 1; o.sp = o.sp || 0; o.rot = o.rot || 0; slider('うえ・した', -6, 6, 0.25, () => o.y, (v) => (o.y = v)); slider('おおきさ', 0.5, 1.7, 0.05, () => o.size, (v) => (o.size = v)); if (sp) slider('あいだ', -4, 6, 0.25, () => o.sp, (v) => (o.sp = v)); if (rot) slider('かたむき', -4, 4, 0.25, () => o.rot, (v) => (o.rot = v)); };
    function render() {
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === cur)); body.innerHTML = '';
      if (cur !== lastCur) { P.zoom = cur === 'body' || cur === 'paint' ? 'body' : 'face'; P.tilt = 0; lastCur = cur; } P.paint = null; box.classList.toggle('painting', cur === 'paint'); box.querySelectorAll('[data-z]').forEach((x) => x.classList.toggle('on', x.dataset.z === P.zoom));
      if (cur === 'name') {
        if (easy) { body.appendChild(h('p', 'hint', '🌟 かんたんモード：🎲おまかせ と かみ・め・くち・ふくを えらぶだけ。こまかく したい ときは 🛠️こだわり に きりかえてね')); }
        const row = h('div', 'nm', `<input maxlength="8" placeholder="なまえ"><button class="rn">🎲</button>`); body.appendChild(row);
        const ip = $('input', row); ip.value = f.name || ''; ip.oninput = () => (f.name = ip.value); $('.rn', row).onclick = () => { f.name = rnd(NAMES); ip.value = f.name; };
        body.appendChild(h('h4', '', 'せいかく'));
        grid(PERSONALITIES.map((p) => `<span>${p.icon}</span><i>${p.name}</i>`), () => f.personality, (i) => (f.personality = i), false);
        if (easy) return;
        body.appendChild(h('h4', '', 'とくいな こと')); grid(TALENTS.map((n) => `<i>${n}</i>`), () => f.talent ?? 0, (i) => (f.talent = i), false);
        body.appendChild(h('h4', '', 'あるきかた')); grid(['🚶 ふつう', '🦘 ぴょこぴょこ', '🐧 よちよち', '🏃 せかせか'].map((n) => `<i>${n}</i>`), () => f.walk ?? 0, (i) => (f.walk = i), false);
        body.appendChild(h('h4', '', 'たんじょうび（14にちで 1ねん）'));
        grid([...Array(14)].map((_, i) => `<i>${i + 1}にちめ</i>`), () => (f.birthday || 1) - 1, (i) => (f.birthday = i + 1), false);
        body.appendChild(h('h4', '', 'すきな たべもの'));
        grid(FOODS.map(([e, n], i) => `<span>${foodIc(i)}</span><i>${n}</i>`), () => f.food, (i) => (f.food = i), false);
      }
      if (cur === 'shape') { grid(SHAPES.map((n) => `<i>${n}</i>`), () => f.shape, (i) => (f.shape = i)); colors('はだ', SKINS, () => SKINS[f.skin], (c) => (f.skin = SKINS.indexOf(c) < 0 ? 0 : SKINS.indexOf(c)), true); body.lastChild.querySelector('input').remove(); }
      if (cur === 'hair') { grid(HAIRS.map((n) => `<i>${n}</i>`), () => f.hair, (i) => (f.hair = i)); colors('いろ', HAIR_COLORS, () => f.hairColor, (c) => (f.hairColor = c), true); }
      if (cur === 'eye') { grid(EYES.map((_, i) => partIcon('eye', i, f)), () => f.eye.t, (i) => (f.eye.t = i), false); colors('いろ', EYE_COLORS, () => f.eye.c, (c) => (f.eye.c = c)); pos(f.eye); }
      if (cur === 'brow') { grid(BROWS.map((_, i) => partIcon('brow', i, f)), () => f.brow.t, (i) => (f.brow.t = i), false); colors('いろ', HAIR_COLORS, () => f.brow.c || f.hairColor, (c) => (f.brow.c = c)); pos(f.brow); }
      if (cur === 'nose') { grid(NOSES.map((_, i) => partIcon('nose', i, f)), () => f.nose.t, (i) => (f.nose.t = i), false); pos(f.nose, false, false); }
      if (cur === 'mouth') { grid(MOUTHS.map((_, i) => partIcon('mouth', i, f)), () => f.mouth.t, (i) => (f.mouth.t = i), false); colors('くちの いろ', ['#2a1d1a', '#c84a4a', '#e83a6a', '#f08cb2', '#b83a2a', '#8a3ac8', '#e8742c', '#3a8ae0'], () => (f.mouth.lc || '#2a1d1a'), (c) => { f.mouth.lc = c === '#2a1d1a' ? null : c; if (c !== '#2a1d1a') f.mouth.c = c; }); pos(f.mouth, false, false); }
      if (cur === 'glass') { grid(GLASSES.map((_, i) => partIcon('glass', i, f)), () => f.glass.t, (i) => (f.glass.t = i), false); colors('いろ', ['#2a2a2a', '#8a5a3a', '#c8322e', '#3352b8', '#f08cb2', '#e8c040', '#3aa858', '#f2f2ee'], () => f.glass.c, (c) => (f.glass.c = c)); pos(f.glass, false, false); }
      if (cur === 'extra') {
        body.appendChild(h('h4', '', 'ひげ')); grid(BEARDS.map((_, i) => partIcon('beard', i, f)), () => f.beard, (i) => (f.beard = i), false);
        const tg = (label, get, set) => { const b = h('button', 'tgb' + (get() ? ' on' : ''), label); b.onclick = () => { set(!get()); b.classList.toggle('on', get()); upd(false); }; body.appendChild(b); };
        tg('🌸 ほっぺ', () => f.blush, (v) => (f.blush = v)); tg('✨ そばかす', () => f.freckles, (v) => (f.freckles = v)); tg('・ ほくろ', () => !!f.mole, (v) => (f.mole = v ? { x: 62, y: 62 } : null));
        if (f.mole) { slider('ほくろ よこ', 25, 75, 0.5, () => f.mole.x, (v) => (f.mole.x = v)); slider('ほくろ たて', 35, 80, 0.5, () => f.mole.y, (v) => (f.mole.y = v)); }
      }
      if (cur === 'species' && f.species) {
        body.appendChild(h('h4', '', 'どうぶつ')); const av = availableSpecies();
        grid(av.map((sp) => { const c = animalIcon({ ...f, species: sp.key, fur: 0, paint: null, prop: null, hat: 0, glass: null }, 72); return `<span class="spic">${c ? `<img src="${c.toDataURL()}" alt="">` : sp.ic}</span><i>${sp.name}</i>`; }), () => av.findIndex((sp) => sp.key === f.species), (i) => { if (f.species !== av[i].key) { pctx.clearRect(0, 0, PAINT_SIZE, PAINT_SIZE); painted = false; f.prop = null; } f.species = av[i].key; f.fur = 0; render(); }, true);
        const sp = speciesOf(f.species); body.appendChild(h('h4', '', 'けの いろ'));
        grid(sp.colors.map((c) => `<i>${c[0]}</i>`), () => f.fur || 0, (i) => (f.fur = i), true);
      }
      if (cur === 'cheek' && f.species) { grid(CHEEKS.map((n) => `<i>${n}</i>`), () => f.cheek || 0, (i) => (f.cheek = i), false); }
      if (cur === 'body' && f.species) {
        const pr = () => (f.prop = f.prop || { ...PROP0 }); const live = () => { if (P.ch.applyProp) P.ch.applyProp(); };
        const PRESETS = [['🙂 ふつう', {}], ['👶 ちびっこ', { hs: 1.3, bh: 0.85, ll: 0.75, al: 0.85 }], ['🦒 すらっと', { hs: 0.85, bh: 1.3, ll: 1.7, al: 1.3 }], ['🍙 ずんぐり', { bw: 1.35, bh: 0.9, ll: 0.8 }], ['🐢 ながい くび', { hy: 0.18 }], ['🎈 おおあたま', { hs: 1.5, bw: 0.9 }], ['🦵 ながい あし', { ll: 2, al: 1.2 }], ['💪 ながい うで', { al: 1.9 }]];
        body.appendChild(h('h4', '', 'へんしん！'));
        const pg = h('div', 'og'); PRESETS.forEach(([n, v]) => { const b = h('button', 'ob', `<i>${n}</i>`); b.onclick = () => { f.prop = { ...PROP0, ...v }; render(); live(); SFX.pop(); }; pg.appendChild(b); }); body.appendChild(pg);
        body.appendChild(h('h4', '', 'じぶんで ちょうせい'));
        const ps = (label, k, mn, mx, st) => { const row = h('div', 'sr', `<i>${label}</i>`); const sl = h('input'); sl.type = 'range'; sl.min = mn; sl.max = mx; sl.step = st; sl.value = (f.prop || PROP0)[k]; sl.oninput = () => { pr()[k] = +sl.value; live(); }; row.appendChild(sl); body.appendChild(row); };
        ps('あたまの おおきさ', 'hs', 0.6, 1.7, 0.01); ps('あたまの たかさ', 'hy', -0.08, 0.3, 0.005); ps('からだの よこはば', 'bw', 0.65, 1.6, 0.01); ps('からだの ながさ', 'bh', 0.6, 1.9, 0.01); ps('うでの ながさ', 'al', 0.5, 2.2, 0.01); ps('あしの ながさ', 'll', 0.5, 2.4, 0.01);
        slider('ぜんたいの おおきさ', 0.7, 1.4, 0.01, () => f.height || 1, (v) => (f.height = v), true);
        body.appendChild(h('h4', '', 'あるきかた')); grid(['🚶 ふつう', '🦘 ぴょこぴょこ', '🐧 よちよち', '🏃 せかせか'].map((n) => `<i>${n}</i>`), () => f.walk ?? 0, (i) => (f.walk = i), false);
        body.appendChild(h('h4', '', 'ぼうし'));
        const owned = [0, ...G.bag.hats]; grid(HATS.map((n, i) => (owned.includes(i) ? `<i>${n}</i>` : '<i>🔒</i>')), () => f.hat, (i) => { if (owned.includes(i)) f.hat = i; }, true);
      }
      if (cur === 'paint' && f.species) {
        body.appendChild(h('p', 'hint', '🖌️ キャラを ゆびで なぞって ぬってね！ ⟲⟳ で まわせるよ'));
        const st = P.brush || (P.brush = { c: '#ff6a9a', r: 1, mode: 'paint' });
        const PC = ['#ff6a9a', '#ff3b3b', '#ff9a3c', '#ffd23c', '#7ed957', '#3aa858', '#4fb6e3', '#3b6fe0', '#9b6ae0', '#ffffff', '#f6d6b8', '#c08a5a', '#7a4a2a', '#8a8a96', '#2a2a2a', '#ffb6d9'];
        const crow = h('div', 'cr', '<i>いろ</i>'); PC.forEach((c) => { const b = h('button', 'cb' + (st.c === c && st.mode === 'paint' ? ' on' : '')); b.style.background = c; b.onclick = () => { st.c = c; st.mode = 'paint'; render(); }; crow.appendChild(b); }); const pk = h('input'); pk.type = 'color'; pk.value = st.c; pk.oninput = () => { st.c = pk.value; st.mode = 'paint'; }; crow.appendChild(pk); body.appendChild(crow);
        body.appendChild(h('h4', '', 'ふとさ')); grid(['・ ほそい', '● ふつう', '⬤ ふとい', '🟠 でっかい'].map((n) => `<i>${n}</i>`), () => st.r, (i) => (st.r = i), false);
        const tools = h('div', 'og'); [['🖌️ ふで', () => (st.mode = 'paint'), st.mode === 'paint'], ['🧽 けしゴム', () => (st.mode = 'erase'), st.mode === 'erase'], ['⟲', () => (P.yaw -= 0.6)], ['⟳', () => (P.yaw += 0.6)], [P.tilt ? '⬇️ よこから' : '⬆️ うえから', () => { P.tilt = P.tilt ? 0 : 1; }], [P.zoom === 'face' ? '🧍 ぜんしん' : '🔍 かお', () => { P.zoom = P.zoom === 'face' ? 'body' : 'face'; }], ['↩️ もどす', () => { const u = undoS.pop(); if (u) { pctx.putImageData(u, 0, 0); syncPaint(); } }], ['🗑️ ぜんぶ けす', () => { undoS.push(pctx.getImageData(0, 0, PAINT_SIZE, PAINT_SIZE)); pctx.clearRect(0, 0, PAINT_SIZE, PAINT_SIZE); syncPaint(); }]].forEach(([n, fn, on]) => { const b = h('button', 'ob' + (on ? ' on' : ''), `<i>${n}</i>`); b.onclick = () => { fn(); SFX.pop(); if (!/[⟲⟳]|もどす/.test(n)) render(); }; tools.appendChild(b); }); body.appendChild(tools);
        const RAD = [0.018, 0.035, 0.06, 0.1]; const ray = new THREE.Raycaster(); let img = null, last = null;
        P.paint = (e, ph) => {
          const ch = P.ch, mesh = ch && ch.furMesh; if (!mesh) return;
          if (ph === 'up') { if (img) { img = null; painted = true; } return; }
          if (ph === 'down') { undoS.push(pctx.getImageData(0, 0, PAINT_SIZE, PAINT_SIZE)); if (undoS.length > 15) undoS.shift(); img = pctx.getImageData(0, 0, PAINT_SIZE, PAINT_SIZE); last = null; }
          if (!img) return; const pp = paintPrep(mesh); const rc = P.r.domElement.getBoundingClientRect(); const cur = [e.clientX, e.clientY]; const pts = [];
          if (last) { const d = Math.hypot(cur[0] - last[0], cur[1] - last[1]); const n = Math.max(1, Math.ceil(d / 6)); for (let i = 1; i <= n; i++) pts.push([last[0] + (cur[0] - last[0]) * i / n, last[1] + (cur[1] - last[1]) * i / n]); } else pts.push(cur); last = cur;
          const rgb = [parseInt(st.c.slice(1, 3), 16), parseInt(st.c.slice(3, 5), 16), parseInt(st.c.slice(5, 7), 16)]; const R = RAD[st.r] * ch.meta.height * (P.zoom === 'face' ? 0.6 : 1);
          for (const [x, y] of pts) { ray.setFromCamera({ x: ((x - rc.left) / rc.width) * 2 - 1, y: -((y - rc.top) / rc.height) * 2 + 1 }, P.cam); const hit = ray.intersectObject(mesh, false)[0]; if (!hit) continue; paintDab(pp, img, paintHit(mesh, hit), R, rgb, st.mode); }
          pctx.putImageData(img, 0, 0); syncPaint();
        };
      }
      if (cur === 'body' && !f.species) {
        body.appendChild(h('h4', '', 'たいけい')); grid(['ほっそり', 'ふつう', 'ぽっちゃり'].map((n) => `<i>${n}</i>`), () => (f.width < 0.92 ? 0 : f.width > 1.15 ? 2 : 1), (i) => { f.width = [0.85, 1.0, 1.28][i]; }, true);
        slider('せの たかさ', 0.75, 1.3, 0.01, () => f.height, (v) => (f.height = v), true); slider('からだの はば', 0.8, 1.4, 0.01, () => f.width, (v) => (f.width = v), true);
        body.appendChild(h('h4', '', 'ふくの かたち')); grid(CLOTH_STYLES.map((n) => `<i>${n}</i>`), () => f.cstyle || 0, (i) => (f.cstyle = i), true);
        body.appendChild(h('h4', '', 'もよう')); grid(PATTERNS.map((n) => `<i>${n}</i>`), () => f.pattern || 0, (i) => (f.pattern = i), true);
        colors('もようの いろ', ['#ffffff', '#f5cf30', '#3a3a40', '#e8443a', '#4fb6e3', '#f08cb2', '#3aa858', '#7f3ca8'], () => f.c2 || '#ffffff', (c) => (f.c2 = c), true);
        colors('ふく', CLOTH_COLORS, () => f.shirt, (c) => (f.shirt = c), true); colors('ズボン', ['#3a4a6a', '#3a3a40', '#8a5a3a', '#f2f2ee', '#4a6a3a', '#c8322e', '#f08cb2', '#4fb6e3'], () => f.pants, (c) => (f.pants = c), true);
        body.appendChild(h('h4', '', 'ぼうし'));
        const owned = [0, ...G.bag.hats]; grid(HATS.map((n, i) => (owned.includes(i) ? `<i>${n}</i>` : '<i>🔒</i>')), () => f.hat, (i) => { if (owned.includes(i)) f.hat = i; }, true);
      }
    }
    render();
    const cpb = h('button', 'big', '📄 おえかきを コピー'); cpb.onclick = () => { const others = G.residents.filter((r) => r.drawingCanvas); if (!others.length) { news('コピーできる おえかきが ないよ'); return; } const bx2 = modal('list', '<h2>だれの おえかきを コピーする？</h2><div class="rlist"></div>'); others.forEach((r) => { const b = h('button', 'rrow'); b.appendChild(faceIcon(r.f, r.drawingCanvas, 60)); b.appendChild(h('b', '', r.name)); b.onclick = () => { dcv.getContext('2d').clearRect(0, 0, 1024, 1024); dcv.getContext('2d').drawImage(r.drawingCanvas, 0, 0); P.ch.setDrawing(dcv); closeTop(); }; $('.rlist', bx2).appendChild(b); }); };
    $('.ed-l', box).appendChild(cpb);
    $('.rnd', box).onclick = () => { pctx.clearRect(0, 0, PAINT_SIZE, PAINT_SIZE); const nm = f.name; f = animalize(randomFace(nm || rnd(NAMES))); f.hat = 0; render(); upd(true); };
    $('.drawbtn', box).onclick = async () => {
      P.zoom = 'face';
      const sk = SKINS[f.skin];
      await openDraw({ title: '✏️ かおに おえかき（ズームで こまかく）', size: 1024, layer: dcv, mirror: false, color: '#231a17',
        under: (g, S) => { if (f.species && P.ch && P.ch.meta) { g.fillStyle = '#f6d6cf'; g.fillRect(0, 0, S, S); g.drawImage(renderAnimalFace(f, P.ch.meta, S, 'open'), 0, 0); } else { g.fillStyle = sk; g.fillRect(0, 0, S, S); drawFaceParts(g, f, S, 'open'); } },
        guide: (g, S) => { g.save(); g.fillStyle = 'rgba(40,30,30,0.18)'; const hy = S * 0.12; g.fillRect(0, 0, S, hy); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([S / 80, S / 80]); g.lineWidth = S / 400; g.beginPath(); g.ellipse(S / 2, S * 0.5, S * 0.33, S * 0.42, 0, 0, Math.PI * 2); g.stroke(); g.restore(); },
        previewEl: P.r.domElement, onStroke: () => P.ch.setDrawing(dcv) });
      $('.ed-pv', box).appendChild(P.r.domElement); P.ch.setDrawing(dcv);
    };
    $('.no', box).onclick = () => { P.paint = null; closeTop(); resolve(null); };
    $('.ok', box).onclick = () => { if (!f.name) f.name = rnd(NAMES); if (f.species) { const d = pctx.getImageData(0, 0, PAINT_SIZE, PAINT_SIZE).data; let any = false; for (let i = 3; i < d.length; i += 4) if (d[i]) { any = true; break; } f.paint = any ? pcv.toDataURL('image/png') : null; f.paintSp = any ? f.species : null; } P.paint = null; closeTop(); resolve({ f, drawing: dcv }); };
  });
}
export async function newResident() {
  if (G.residents.length >= 10) { news('なかまは 10にんまで だよ'); return; }
  const f = animalize(randomFace(rnd(NAMES.filter((n) => !G.residents.some((r) => r.name === n))))); f.hat = 0;
  const res = await openFaceEditor(f, null, `なかまを つくろう（${G.residents.length + 1}にんめ）`);
  if (!res) return null;
  const r = G.addResident(res.f, res.drawing); news(`🎉 ${r.name}が しまに やってきた！`); r.say(`はじめまして！ ${r.name}です！`, 4); effect('sparkle', r);
  if (!G.me && !G.watch) G.setMe(r);
  return r;
}
async function editResident(r) {
  const res = await openFaceEditor(r.f, r.drawingCanvas, `${r.name}の かお`);
  if (!res) return; r.f = res.f; r.drawingCanvas = res.drawing; G.rebuildResident(r); r.say('どう？ にあう？', 3); effect('sparkle', r);
}

// ---------- ペット
function openPets() {
  const box = modal('list', `<h2>🐾 ペット</h2><div class="rlist"></div><p class="hint">🥚 ペットのたまご：${G.bag.eggs}こ（もんだいの ごほうびで ふえるよ）</p>`);
  const L = $('.rlist', box);
  for (const p of G.pets) { const row = h('button', 'rrow'); const c = document.createElement('canvas'); c.width = c.height = 72; c.getContext('2d').drawImage(p.canvas, 0, 0, 72, 72); row.appendChild(c); const o = G.byUid(p.owner); row.appendChild(h('div', 'rinfo', `<b>${p.name}</b><small>${o ? o.name + 'の ペット' : 'のらペット'}・${PET_MOVES[p.move][1]}${PET_MOVES[p.move][0]}</small>`)); row.onclick = () => { closeTop(); editPet(p); }; const cp = h('button', 'cpb', '📄 コピー'); cp.onclick = (e) => { e.stopPropagation(); if (G.bag.eggs <= 0) { news('🥚 たまごが いるよ'); return; } G.bag.eggs--; const cv = document.createElement('canvas'); cv.width = cv.height = 1024; cv.getContext('2d').drawImage(p.canvas, 0, 0); const d = p.toJSON(); delete d.uid; d.name = p.name + '2'; d.owner = null; G.addPet(d, cv); closeTop(); news(`🐣 ${p.name}の ふたごが うまれた！`); }; row.appendChild(cp); L.appendChild(row); }
  const add = h('button', 'rrow add', '<span>🥚</span><b>あたらしい ペットを かく</b>'); add.onclick = () => { closeTop(); newPet(null); }; L.appendChild(add);
}
async function petForm(p, isNew) {
  return new Promise((resolve) => {
    const box = modal('petform', `<h2>${isNew ? '🥚 ペットが うまれるよ！' : '🐾 ' + p.name}</h2><div class="pfv"></div>
      <div class="nm"><input maxlength="8" placeholder="なまえ"></div><h4>うごきかた</h4><div class="og mv"></div><h4>からだの かたち</h4><div class="og psh"></div><h4>からだの パーツ</h4><div class="og pw"></div><div class="og pl"></div><h4>せいかく</h4><div class="og ps"></div><h4>おおきさ</h4><input type="range" class="sz" min="0.4" max="1.8" step="0.05">
      <h4>かいぬし</h4><div class="og ow"></div><div class="row"><button class="big drw">✏️ ${isNew ? 'かく' : 'かきなおす'}</button><button class="big ok">できた！</button></div>`, { noClose: false, onClose: () => resolve(null) });
    const pfv = $('.pfv', box); const showC = () => { pfv.innerHTML = ''; const c = document.createElement('canvas'); c.width = c.height = 160; c.getContext('2d').drawImage(p.canvas, 0, 0, 160, 160); pfv.appendChild(c); };
    showC();
    const ip = $('input', box); ip.value = p.name; ip.oninput = () => (p.name = ip.value || 'ペット');
    const mv = $('.mv', box); PET_MOVES.forEach(([n, e], i) => { const b = h('button', 'ob' + (p.move === i ? ' on' : ''), `<span>${e}</span><i>${n}</i>`); b.onclick = () => { p.move = i; mv.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; mv.appendChild(b); });
    const pw = $('.pw', box), pl = $('.pl', box), psh = $('.psh', box);
    [['まる', '⚪'], ['ほそながい', '🥖'], ['ずんぐり', '🍙'], ['ひらべったい', '🥞']].forEach(([n, e], i) => { const b = h('button', 'ob' + ((p.shape || 0) === i ? ' on' : ''), `<span>${e}</span><i>${n}</i>`); b.onclick = () => { p.shape = i; psh.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; psh.appendChild(b); });
    [['なし', '🚫'], ['はね', '🪽']].forEach(([n, e], i) => { const b = h('button', 'ob' + ((p.wings || 0) === i ? ' on' : ''), `<span>${e}</span><i>${n}</i>`); b.onclick = () => { p.wings = i; pw.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; pw.appendChild(b); });
    [0, 2, 4, 6].forEach((n, i) => { const b = h('button', 'ob' + ((p.legs || 0) === n ? ' on' : ''), `<span>🦵</span><i>あし ${n}ぽん</i>`); b.onclick = () => { p.legs = n; pl.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; pl.appendChild(b); });
    const ps = $('.ps', box); if (p.pers == null) p.pers = Math.floor(Math.random() * 4); PET_PERS.forEach(([n, e], i) => { const b = h('button', 'ob' + (p.pers === i ? ' on' : ''), `<span>${e}</span><i>${n}</i>`); b.onclick = () => { p.pers = i; ps.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; ps.appendChild(b); });
    const sz = $('.sz', box); sz.value = p.size; sz.oninput = () => (p.size = +sz.value);
    const ow = $('.ow', box); [null, ...G.residents.map((r) => r.uid)].forEach((u) => { const r = u && G.byUid(u); const b = h('button', 'ob' + (p.owner === u ? ' on' : '')); if (r) { b.appendChild(faceIcon(r.f, r.drawingCanvas, 44)); b.appendChild(h('i', '', r.name)); } else b.innerHTML = '<span>🌳</span><i>なし</i>'; b.onclick = () => { p.owner = u; ow.querySelectorAll('.ob').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; ow.appendChild(b); });
    $('.drw', box).onclick = async () => { await openDraw({ title: '🐾 ペットを かこう（まわりは とうめい）', size: 1024, layer: p.canvas, color: '#231a17', mirror: false }); showC(); };
    $('.ok', box).onclick = () => { const bg = stack[stack.length - 1]; bg.onClose = null; closeTop(); resolve(p); };
  });
}
async function newPet(owner) {
  if (G.bag.eggs <= 0) { news('🥚 ペットのたまごが ないよ。もんだいに こたえて もらおう！'); askQuiz(null); return; }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ok = await openDraw({ title: '🐾 ペットを かこう（まわりは とうめい）', size: 1024, layer: canvas, color: '#231a17' });
  if (!ok) return;
  const draft = { name: rnd(['ポチ', 'モフ', 'ピコ', 'ぷに', 'チビ', 'ルル', 'もち', 'コロ']), owner: owner ? owner.uid : null, move: 0, size: 0.8, canvas };
  const res = await petForm(draft, true); if (!res) return;
  G.bag.eggs--; const o = owner || (res.owner && G.byUid(res.owner));
  const pos = o ? o.p : G.center;
  const pet = G.addPet({ name: res.name, owner: res.owner, move: res.move, size: res.size, pers: res.pers, wings: res.wings, legs: res.legs, shape: res.shape, x: pos.x + 1, y: pos.y + 1, z: pos.z }, canvas);
  news(`🐣 ${pet.name}が うまれた！`); if (o) { G.photo([o], `${o.name}と ${pet.name}の であい`); o.say(`${pet.name}、よろしくね！`, 3); effect('heart', o); o.addExp(20, G); }
}
async function editPet(p) {
  const backup = document.createElement('canvas'); backup.width = backup.height = 1024; backup.getContext('2d').drawImage(p.canvas, 0, 0);
  const draft = { name: p.name, owner: p.owner, move: p.move, size: p.size, pers: p.pers, wings: p.wings, legs: p.legs, shape: p.shape, canvas: p.canvas };
  const res = await petForm(draft, false);
  if (!res) { p.canvas.getContext('2d').clearRect(0, 0, 1024, 1024); p.canvas.getContext('2d').drawImage(backup, 0, 0); p.refresh(); return; }
  Object.assign(p, { name: res.name, owner: res.owner, move: res.move, size: res.size, pers: res.pers, wings: res.wings, legs: res.legs, shape: res.shape }); p.refresh();
}

// ---------- タイトル・はじめて
export function title(hasSave, start) {
  const t = $('#title'); t.classList.add('show');
  $('#tCont').style.display = hasSave ? '' : 'none';
  $('#tCont').onclick = () => { t.classList.remove('show'); start(true); };
  $('#tNew').onclick = () => { if (hasSave && !confirmNew()) return; t.classList.remove('show'); start(false); };
}
let confirmed = false;
function confirmNew() { if (confirmed) return true; confirmed = true; $('#tNew').textContent = 'ほんとうに さいしょから？（もういちど おす）'; return false; }
let tut = null;
// ---------- チュートリアル（やってみて すすむ）
const TUT = [
  { k: 'walk', t: (d) => d === 'pad' ? 'スティックで あるこう！' : d === 'key' ? 'W A S D で あるこう！' : 'ひだりを なぞって あるこう！', ic: '🚶', at: 'joy', ok: () => G.me && Math.hypot(G.me.p.x - TS.x0, G.me.p.z - TS.z0) > 3, done: () => 'あるけたね！' },
  { k: 'talk', v: () => 'なかまの そばで、はなすボタンを おしてね！', t: () => `${TS.g ? TS.g.name : 'なかま'}の そばで 💬 を おしてね`, ic: '💬', at: '#tTalk', lbl: 'はなす', res: true, ok: () => TS.talked && !isModal(), expect: 'res', done: () => 'おはなし できたね！' },
  { k: 'pick', v: () => (isModal() ? 'ひかってる おうちを おしてね！' : 'はこの ボタンを おそう！'), t: () => (isModal() ? 'ひかってる おうちを おしてね！' : '📦 を おそう！'), ic: '📦', at: () => (isModal() ? '.pit.house' : '#bBlocks'), lbl: () => (isModal() ? 'これ！' : 'ブロック'), ok: () => { const it = G.hotbar[G.sel]; return it && it.type === 'house' && !isModal(); }, expect: 'picker' },
  { k: 'build', t: () => 'きいろい わっかに おこう！', ic: '🧱', at: '#tPlace', lbl: 'おく', ok: () => TS.built, done: () => 'おうちが できたね！' },
  { k: 'watch', v: () => 'めの ボタンで、なかまを みてみよう！', t: () => `👀 で ${TS.g ? TS.g.name : 'なかま'}を みてみよう！`, ic: '👀', at: '#bWatch', lbl: () => `${TS.g ? TS.g.name : 'この子'}を みる`, ok: () => !!G.watch && !G.me, done: () => 'みえたね！' },
  { k: 'back', v: () => 'コントローラーの ボタンで、じぶんに もどろう！', t: () => '🎮 で じぶんに もどろう！', ic: '🎮', at: '#bWatch', lbl: 'じぶんに もどる', ok: () => !!G.me, done: () => 'もどれたね！' },
  { k: 'help', v: () => 'こまったら、でんきの ボタンを おしてみて！', t: () => 'こまったら 💡！ おしてみて', ic: '💡', at: '#bHelp', lbl: 'こまったら', ok: () => TS.helped && !isModal(), expect: 'help', done: () => 'これで まよわないね！' },
];
const TS = { x0: 0, z0: 0, g: null, talked: false, built: false, helped: false, idle: 0, last: 0 };
addEventListener('pointerdown', () => { TS.idle = Math.min(TS.idle, 2); }, true); addEventListener('keydown', () => { TS.idle = Math.min(TS.idle, 2); }, true);
function tutHand(sel) { const el = typeof sel === 'string' && sel !== 'joy' ? $(sel) : null; const r = el && el.offsetParent ? el.getBoundingClientRect() : { left: innerWidth * 0.18, top: innerHeight * 0.62, width: 60, height: 60 };
  const hnd = h('div', 'tuthand', '👆'); hnd.style.left = r.left + r.width / 2 + 'px'; hnd.style.top = r.top + r.height / 2 + 'px'; if (sel === 'joy') hnd.classList.add('drag'); document.body.appendChild(hnd); setTimeout(() => hnd.remove(), 3600); }
const inputKind = () => (navigator.getGamepads && [...navigator.getGamepads()].some(Boolean) ? 'pad' : matchMedia('(pointer: coarse)').matches ? 'touch' : 'key');
export function tutorial(step) {
  const old = $('#tut'); if (old) old.remove(); const ar = $('#tutArrow'); if (ar) ar.remove(); document.querySelectorAll('.tuthl').forEach((e) => e.classList.remove('tuthl'));
  if (step >= TUT.length) { if (tut != null && step < 99) tutDone(); tut = null; G.tutStep = null; document.body.classList.remove('tutfocus'); return; }
  if (step === 0) { TS.talked = TS.built = TS.helped = false; TS.g = null; }
  if (step < 99 && (!TS.g || !G.residents.includes(TS.g))) { if (!G.residents.some((r) => r !== G.me)) addFriends(3); TS.g = G.residents.find((r) => r !== G.me) || null; }
  tut = step; G.tutStep = step; const S = TUT[step]; TS.t0 = performance.now(); TS.hint = 0; TS.idle = 0; TS.last = performance.now(); document.body.classList.add('tutfocus'); if (S.k === 'walk' && G.me) { TS.x0 = G.me.p.x; TS.z0 = G.me.p.z; }
  if (S.k === 'pick') G.pickCat = 'house';
  G.tutMarker && G.tutMarker(S.k === 'build');
  if (S.k === 'watch' && TS.g && G.tutHouse) { const g = TS.g, hh = G.tutHouse; g.timer = 0; if (g.goTo(G, hh[0], hh[1], hh[2])) { g.state = 'goevent'; g.evMode = 'joy'; g.evT = 8; g.evSay = 'わあ！ あたらしい おうち！'; g.evFace = [hh[0], hh[2]]; } }
  if (S.k === 'talk' && TS.g && G.me) { const g = TS.g; g.path = null; { const o = G.tutOpen && G.tutOpen([4, 5, 3, 6], 0); if (o) { g.p.x = o[0] + 0.5; g.p.z = o[2] + 0.5; g.p.y = o[1] + 0.1; G.yaw = o[3]; G.pitch = -0.2; } else if (g.dist(G.me) > 6) { g.p.x = G.me.p.x + Math.sin(G.yaw + Math.PI) * 4; g.p.z = G.me.p.z + Math.cos(G.yaw + Math.PI) * 4; g.p.y = G.world.top(Math.floor(g.p.x), Math.floor(g.p.z)) + 1.1; } } g.state = 'event'; g.timer = 999; g.evMode = 'wave'; g.evFace = [G.me.p.x, G.me.p.z]; g.say('こっち こっち〜！', 4, 'joy'); }
  const txt = S.t(inputKind()); TS.txt = txt;
  const b = h('div', '', `<div class="tg"></div><div class="tb"><div class="tdots">${TUT.map((x, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}">${i < step ? '💮' : x.ic}</i>`).join('')}</div><b>${txt.includes(S.ic) ? "" : S.ic + " "}${txt}</b></div><div class="tbtn"><button class="tsay">🔊</button><button class="tskip">あとで</button></div>`); b.id = 'tut';
  if (TS.g) $('.tg', b).appendChild(faceIcon(TS.g.f, TS.g.drawingCanvas, 64));
  document.body.appendChild(b);
  const vtx = () => (S.v ? S.v(inputKind()) : null);
  $('.tsay', b).onclick = () => speak(txt.replace(/[^　-ヿ一-鿿a-zA-Z0-9、。！？ ]/g, ''), true, vtx());
  $('.tskip', b).onclick = () => { if (TS.g && TS.g.state === 'event') TS.g.timer = 0.5; tutorial(99); news('📘 メニューの「あそびかた」で また みられるよ'); };
  const arw = h('div', '', '👆'); arw.id = 'tutArrow'; document.body.appendChild(arw);
  speak(txt.replace(/[^　-ヿ一-鿿a-zA-Z0-9、。！？ ]/g, ''), true, vtx()); SFX.pop();
}
function tutDone() {
  if (TS.g && TS.g.state === 'event') TS.g.timer = 0.5;
  const box = modal('first', `<div class="tfin">🎉</div><div class="tstamps">${TUT.map(() => '<i>💮</i>').join('')}</div><h2>ぼうけんスタンプ コンプリート！<br>これで しまの なかまだね</h2><p>なかまは かってに くらしているよ。<br>📮 おてがみ や 💡 も みてみてね</p><p class="hint">🎟️ パーティーけんを 1まい プレゼント！</p><button class="big ok">はじめる</button>`, { noClose: true });
  G.bag.tickets++; SFX.level(); speak('できた！ これで しまの なかまだね'); $('.ok', box).onclick = () => closeTop();
  G.residents.filter((r) => r !== G.me && r.state !== 'sleep').slice(0, 4).forEach((r) => r.say(rnd(['ようこそ！', 'よろしくね！', 'いっしょに あそぼう！']), 3, 'joy'));
}
export function tutTick() {
  if (tut == null) return; const S = TUT[tut]; if (!S) return;
  // やじるし
  const ar = $('#tutArrow'); let el = null; const at = typeof S.at === 'function' ? S.at() : S.at;
  document.querySelectorAll('.tuthl').forEach((e) => e.classList.remove('tuthl'));
  if (at === 'joy') { if (ar) { ar.className = 'joyhint'; ar._lb = null; ar.textContent = inputKind() === 'key' ? '⌨️ W A S D' : inputKind() === 'pad' ? '🕹️' : '👆'; ar.style.left = '22%'; ar.style.top = '68%'; } }
  else if (S.k === 'talk' && TS.g && !($('#tTalk') && $('#tTalk').offsetParent) && ar) { const v = TS.g.obj.position.clone(); v.y += TS.g.ch.height + 1.1; v.project(G.cam); ar.className = 'up'; ar._lb = null; ar.textContent = '👆'; ar.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; ar.style.top = (-v.y * 0.5 + 0.5) * innerHeight - 60 + 'px'; }
  else { el = $(at); if (el && el.offsetParent) { el.classList.add('tuthl'); const r = el.getBoundingClientRect(); if (ar) { ar.className = ''; const lb = typeof S.lbl === 'function' ? S.lbl() : S.lbl; if (ar._lb !== lb) { ar._lb = lb; ar.innerHTML = lb ? `👆<span class="tlbl">${lb}</span>` : '👆'; } ar.style.left = r.left + r.width / 2 + 'px'; ar.style.top = (r.bottom + 6 > innerHeight - 80 ? r.top - 64 : r.bottom + 6) + 'px'; ar.classList.toggle('up', r.bottom + 6 > innerHeight - 80); } } else if (ar) ar.style.left = '-200px'; }
  if (S.k === 'talk' && TS.g && G.me) { const g = TS.g; if (Math.random() < 0.01) g.say(rnd(['こっち こっち〜！', 'おーい！', `${G.me.name}〜！`]), 2.5, 'joy'); }
  if (S.k === 'pick') { const hs = document.querySelectorAll('.pit.house'); hs.forEach((b, i) => { b.classList.toggle('tutdim', i > 0); b.classList.toggle('tutpick', i === 0); }); }
  const now = performance.now(), dtt = Math.min(1, (now - TS.last) / 1000); TS.last = now; if (!speaking() && !document.hidden) TS.idle += dtt; const idle = TS.idle; const tb = $('#tut');
  // ちがう がめんを ひらいたら もどす
  { const top = document.querySelector('.overlay.show:last-of-type'); const want = S.expect; const ok = !top || (want === 'picker' && top.classList.contains('picker')) || (want === 'res' && top.querySelector('.rhead,.rtabs,.rname')) || (want === 'help' && TS.helped) || top.classList.contains('first');
    if (top && !ok) { TS.wrong = (TS.wrong || 0) + dtt; if (TS.wrong > 0.8 && !TS.wrongSaid) { TS.wrongSaid = true; speak('いまは こっちだよ！'); news('👆 いまは こっちだよ！'); const x = top.querySelector('.pclose'); if (x) x.classList.add('tuthl'); } if (TS.wrong > 5) { closeTop(); TS.wrong = 0; TS.wrongSaid = false; } } else { TS.wrong = 0; TS.wrongSaid = false; } }
  if (tb) { const nt = S.t(inputKind()); if (nt !== TS.txt) { TS.txt = nt; $('b', tb).textContent = (nt.includes(S.ic) ? '' : S.ic + ' ') + nt; speak(nt.replace(/[^\u3000-\u30ff\u4e00-\u9fffa-zA-Z0-9、。！？ ]/g, ''), true, S.v ? S.v(inputKind()) : null); } }
  if (tb) { tb.classList.toggle('strong', idle > 8); if (idle > 15 && TS.hint < 1) { TS.hint = 1; const tx = $('#tut b'); if (tx) speak(tx.textContent.replace(/[^\u3000-\u30ff\u4e00-\u9fffa-zA-Z0-9、。！？ ]/g, ''), true, S.v ? S.v(inputKind()) : null); } if (idle > 25 && TS.hint < 2) { TS.hint = 2; const d = h('button', 'tdemo', '🤝 いっしょに やってみる？'); d.onclick = () => { d.remove(); const at2 = typeof S.at === 'function' ? S.at() : S.at; tutHand(S.k === 'talk' && !($('#tTalk') && $('#tTalk').offsetParent) ? 'joy' : at2); speak(S.k === 'walk' ? 'こうやって なぞるよ。こんどは やってみよう！' : 'ここを おすよ。こんどは やってみよう！'); TS.idle = 0; TS.hint = 0; }; $('.tb', tb).appendChild(d); speak('いっしょに やってみる？'); } }
  if (S.ok()) { SFX.sticker(); const msg = S.done ? S.done() : null; if (msg) { speak(msg); if (tb) { $('b', tb).textContent = '✨ ' + msg; tb.classList.remove('strong'); tb.classList.add('ok'); } } const st = h('div', 'stbig', rnd(['⭐ できた！', '🌟 じょうず！', '💮 ばっちり！'])); document.body.appendChild(st); setTimeout(() => st.remove(), 1400); const n = tut + 1; tut = -1; setTimeout(() => tutorial(n), msg ? 2400 : 1300); }
}
export const tutFlag = (k) => { TS[k] = true; };
export const tutStep = () => tut;
// ---------- オープニング（しまに とうちゃく → あんないがかりが おでむかえ → ぼうけんスタンプ）
export function opening(done) {
  const me = G.me; if (!me) { done(); return; }
  if (!G.residents.some((r) => r !== me)) addFriends(3);
  const g = G.residents.find((r) => r !== me); if (!g) { done(); return; }
  const V = THREE.Vector3; G.intro = true; document.body.classList.add("introing");
  const lay = h('div', 'intro', `<div class="ibar t"></div><div class="ibar b"></div><div class="ititle"><span>🏝️</span><b>ひだまりの島</b><small>へ ようこそ！</small></div><button class="iskip">とばす ⏭</button>`); document.body.appendChild(lay);
  const head = () => me.obj.position.clone().add(new V(0, 1.2, 0));
  const c0 = new V(G.center.x, 26, G.center.z); const P0 = new V(G.center.x + 46, 40, G.center.z + 52); const look = new V();
  let T = 0, phase = 'fly', li = -1, box = null, padHeld = true, fin = false, snap = true;
  SFX.unlock && SFX.unlock(); SFX.melody(); setTimeout(() => lay.classList.add('t1'), 900); setTimeout(() => { lay.classList.add('t2'); SFX.rare(); }, 1500);
  // あんないがかりと みんなを まえに
  const place = () => {
    const o = G.tutOpen && G.tutOpen([3, 4, 3, 5], 0);
    if (o) { g.p.x = o[0] + 0.5; g.p.z = o[2] + 0.5; g.p.y = o[1] + 0.1; G.yaw = o[3]; }
    else { // じぶんと おなじ たかさの ひらけた ところを さがす（やねの うえに のらない ように）
      const gy = Math.floor(me.p.y - 1.1); let hit = null;
      for (let d = 2; d <= 6 && !hit; d++) for (let a = 0; a < 16 && !hit; a++) { const an = G.yaw + Math.PI + a * Math.PI / 8; const x = Math.floor(me.p.x + Math.sin(an) * d), z = Math.floor(me.p.z + Math.cos(an) * d); if (G.world.top(x, z) === gy) hit = [x + 0.5, z + 0.5, an]; }
      if (hit) { g.p.x = hit[0]; g.p.z = hit[1]; G.yaw = hit[2] - Math.PI; } else { g.p.x = me.p.x + 1.2; g.p.z = me.p.z; }
      g.p.y = me.p.y; }
    g.path = null; g.state = 'event'; g.timer = 999; g.evMode = 'wave'; g.evFace = [me.p.x, me.p.z]; me.yaw = Math.atan2(g.p.x - me.p.x, g.p.z - me.p.z);
    G.residents.filter((r) => r !== me && r !== g).slice(0, 5).forEach((r, i) => { const a = me.yaw + Math.PI + (i - 2) * 0.5; const x = g.p.x + Math.sin(a) * 2.2, z = g.p.z + Math.cos(a) * 2.2; if (r.goTo(G, x, G.world.top(Math.floor(x), Math.floor(z)) + 1, z)) { r.state = 'goevent'; r.evMode = 'joy'; r.evT = 30; r.evSay = rnd(['わーい！', 'ようこそ〜！', 'なかまだ！']); r.evFace = [me.p.x, me.p.z]; } });
  };
  const nm = me.name || 'きみ';
  const L = [
    ['joy', `わあっ！ あたらしい なかまが きたよ〜！`, () => { effect('level', g); SFX.clap(); }],
    ['wave', `${nm}、ようこそ！ ${g.name}だよ。この しまの あんないがかり なんだ！`, null, 'ようこそ！ ぼくは この しまの あんないがかり なんだ！'],
    ['talk', `ここでは みんなで くらして、おうちを たてて、おみせで おかいもの も できるよ`],
    ['joy', `さあ、いっしょに しまを たんけんしよう！ ぼうけんスタンプを 7こ あつめてね！`, () => showStamps()],
  ];
  const sayLine = () => {
    li++; if (li >= L.length) return;
    const [mode, txt, fx, vt] = L[li]; g.evMode = mode === 'talk' ? 'wave' : mode; g.timer = 999; g.ch.talking = true; setTimeout(() => (g.ch.talking = false), 1800);
    SFX.babble && SFX.babble(g.f.personality || 0, 6, 1, mode === 'joy' ? 'joy' : '', txt, g.uid);
    $('b', box).textContent = txt; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); speak(txt.replace(/[^　-ヿ一-鿿a-zA-Z0-9、。！？ ]/g, ''), true, vt);
    if (fx) fx(); if (li === L.length - 1) $('.inext', box).style.display = 'none';
  };
  const startTalk = () => {
    phase = 'talk'; place(); lay.classList.add('t3');
    box = h('div', 'ibox', `<div class="if"></div><div class="it"><small>${g.name}</small><b></b></div><button class="inext">つぎ ▶</button>`); $('.if', box).appendChild(faceIcon(g.f, g.drawingCanvas, 80)); document.body.appendChild(box);
    box.onclick = (e) => { if (li < L.length - 1) { SFX.pop(); sayLine(); } }; sayLine();
  };
  const showStamps = () => {
    const card = h('div', 'istamp', `<h2>🗺️ ぼうけんスタンプ</h2><div class="ist">${TUT.map((x) => `<i>${x.ic}</i>`).join('')}</div><p>ひとつ できるたびに スタンプが もらえるよ！</p><button class="big ok">🌟 たんけん スタート！</button>`);
    setTimeout(() => { document.body.appendChild(card); SFX.sticker(); setTimeout(() => speak('ひとつ できるたびに スタンプが もらえるよ！'), 1200); $('.ok', card).onclick = () => { card.remove(); finish(); }; }, 1600);
  };
  const finish = () => {
    if (fin) return; fin = true; G.intro = false; G.introCam = null; document.body.classList.remove("introing"); removeEventListener('keydown', onKey, true);
    lay.classList.add('out'); setTimeout(() => lay.remove(), 600); if (box) box.remove(); document.querySelector('.istamp')?.remove();
    g.timer = 0.5; g.ch.talking = false; SFX.ok(); news('🗺️ ぼうけん スタート！'); done();
  };
  const onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); const st = document.querySelector('.istamp .ok'); if (st) st.click(); else if (box) box.click(); } };
  addEventListener('keydown', onKey, true);
  $('.iskip', lay).onclick = () => { if (phase === 'fly') { T = 99; } else finish(); };
  G.introCam = (dt) => {
    const now = performance.now(); T += Math.min(0.5, (now - (G._itL || now)) / 1000); G._itL = now; const cam = G.cam;
    const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; const pb = pad && pad.buttons[0] && pad.buttons[0].pressed;
    if (pb && !padHeld) { const st = document.querySelector('.istamp .ok'); if (st) st.click(); else if (box) box.click(); } padHeld = !!pb;
    if (phase === 'fly') {
      const k = Math.min(1, T / 5.5), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const hd = head(); const end = hd.clone().add(new V(Math.sin(G.yaw) * 4.5, 1.4, Math.cos(G.yaw) * 4.5));
      cam.position.lerpVectors(P0, end, e); cam.position.y += Math.sin(Math.PI * e) * 6; look.lerpVectors(c0, hd, Math.min(1, e * 1.15)); cam.lookAt(look);
      if (k >= 1) startTalk(); return true;
    }
    // かたごしに あんないがかりを うつす
    const mp = me.obj.position, gp = g.obj.position; const dx = gp.x - mp.x, dz = gp.z - mp.z, l = Math.hypot(dx, dz) || 1; const ux = dx / l, uz = dz / l;
    const tgt = new V(mp.x - ux * 2.3 + uz * 0.9, mp.y + me.ch.height + 0.55, mp.z - uz * 2.3 - ux * 0.9);
    const lk = new V(gp.x, gp.y + g.ch.height * 0.62, gp.z);
    const k = snap ? 1 : Math.min(1, dt * 3); cam.position.lerp(tgt, k); look.lerp(lk, snap ? 1 : Math.min(1, dt * 4)); cam.lookAt(look); snap = false; return true;
  };
}
// じぶん だけの ときは なかまを よぶ（チュートリアルで はなす あいてが いないと すすめないため）
function addFriends(n) {
  const used = new Set(G.residents.map((r) => r.name)); const names = [...NAMES].filter((x) => !used.has(x)).sort(() => Math.random() - 0.5);
  const c = G.me ? G.me.p : G.center;
  for (let i = 0; i < n && i < names.length; i++) { const f = animalize(randomFace(names[i]), i + 1); f.hat = 0; f.birthday = 5 + i * 7; const r = G.addResident(f, null); const a = i * 2.1 + 0.6; r.p.x = c.x + Math.cos(a) * 4; r.p.z = c.z + Math.sin(a) * 4; r.p.y = G.world.top(Math.floor(r.p.x), Math.floor(r.p.z)) + 1.1; }
  news(`🎉 ${n}にんの なかまが あそびに きたよ！`);
}
export function firstRun() {
  const box = modal('first', `<h2>🏝️ ようこそ ひだまりの島へ！</h2><p>しまに すむ なかまを つくろう。<br>かおは パーツで えらんだり、おえかきで こまかく かきこめるよ。</p>
    <div class="row"><button class="big ok mk">✏️ じぶんで つくる</button><button class="big rnd10">🎲 おまかせで 10にん</button></div>`, { noClose: true });
  $('.mk', box).onclick = async () => { closeTop(); const r = await newResident(); if (!r) firstRun(); else { news('➕ メニューから なかまを ふやせるよ（10にんまで）'); opening(() => tutorial(0)); } };
  $('.rnd10', box).onclick = () => {
    closeTop(); const names = [...NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 10; i++) { const f = animalize(randomFace(names[i]), i); f.hat = 0; f.birthday = 2 + i; const r = G.addResident(f, null); r.p.x = G.center.x + Math.cos(i * 0.63) * 5; r.p.z = G.center.z + Math.sin(i * 0.63) * 5; r.p.y = G.world.top(Math.floor(r.p.x), Math.floor(r.p.z)) + 1.1; }
    G.setMe(G.residents[0]); opening(() => tutorial(0));
  };
}
let padIdx = 0;
export function padNav(p, edge) {
  const top = stack[stack.length - 1] || document.querySelector('#mini.inv, #mini.paint'); if (!top) return;
  const els = [...top.querySelectorAll('button, input')].filter((e) => e.offsetParent && !e.disabled);
  if (!els.length) return;
  let cur = els.indexOf(document.querySelector('.padfocus')); if (cur < 0) cur = 0;
  const ax = p.axes[0], ay = p.axes[1];
  const dir = edge(12) || (ay < -0.6 && !padNav.held) ? [0, -1] : edge(13) || (ay > 0.6 && !padNav.held) ? [0, 1] : edge(14) || (ax < -0.6 && !padNav.held) ? [-1, 0] : edge(15) || (ax > 0.6 && !padNav.held) ? [1, 0] : null;
  padNav.held = Math.abs(ax) > 0.6 || Math.abs(ay) > 0.6;
  if (dir) {
    const r0 = els[cur].getBoundingClientRect(), c0 = [r0.x + r0.width / 2, r0.y + r0.height / 2]; let best = -1, bd = 1e9;
    els.forEach((e, i) => { if (i === cur) return; const r = e.getBoundingClientRect(), c = [r.x + r.width / 2, r.y + r.height / 2]; const dx = c[0] - c0[0], dy = c[1] - c0[1]; const along = dx * dir[0] + dy * dir[1]; if (along <= 4) return; const side = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]); const sc = along + side * 2.5; if (sc < bd) { bd = sc; best = i; } });
    if (best >= 0) cur = best;
  }
  document.querySelectorAll('.padfocus').forEach((e) => e.classList.remove('padfocus'));
  els[cur].classList.add('padfocus'); if (dir) els[cur].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (edge(0)) els[cur].click();
}

// ---------- おかね・おみせ・せかいを しる
export function coinFly(n, from) {
  SFX.sticker(); const w = $('#wallet'); if (!w) return; const r = w.getBoundingClientRect();
  const k = Math.min(6, Math.max(1, Math.ceil(n / 3)));
  for (let i = 0; i < k; i++) { const e = h('div', 'stfly', '🪙'); e.style.left = (from ? from[0] : innerWidth / 2) + (Math.random() - 0.5) * 60 + 'px'; e.style.top = (from ? from[1] : innerHeight / 2) + 'px'; document.body.appendChild(e);
    requestAnimationFrame(() => setTimeout(() => { e.style.left = r.left + r.width / 2 + 'px'; e.style.top = r.top + r.height / 2 + 'px'; e.style.transform = 'translate(-50%,-50%) scale(0.6)'; e.style.opacity = '0.3'; setTimeout(() => e.remove(), 800); }, 120 + i * 90)); }
  const t = h('div', 'coinpop', `+${n}えん`); t.style.left = r.left + r.width / 2 + 'px'; t.style.top = r.bottom + 6 + 'px'; document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
  w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump');
}
export function payReward(r, kind) {
  const n = REWARD[kind] || 3; if (G.simulating) { G.money = (G.money || 0) + n; return; }
  G.money = (G.money || 0) + n; let at = null;
  if (r && r.obj && G.cam) { const v = r.obj.position.clone(); v.y += 2; v.project(G.cam); if (v.z < 1) at = [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; }
  coinFly(n, at); news(`🪙 ${r ? r.name + 'から ' : ''}おれいに ${n}えん！`);
}
export function buyAsk(it, choose) {
  const nm = it.house ? it.house.name : it.d.name; const icon = it.house ? `<span class="emo big">${it.house.icon}</span>` : '';
  const box = modal('buy', `<h2>🏪 ${nm}</h2><div class="bico">${icon}</div><p class="bp"><b>${it.cost}</b>えんで かえるよ${it.n > 1 ? `（いろちがい ${it.n}しゅるい ぜんぶ）` : ''}</p><p class="hint">いま もっている おかね：${G.money || 0}えん</p><div class="brow"><button class="big ok">かう！</button><button class="big no">やめる</button></div><button class="study">🌍 せかいを しる で コインを ためる</button>`);
  if (!it.house) { const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(blockIcon(it.d.id), 0, 0); $('.bico', box).appendChild(c); }
  const enough = (G.money || 0) >= it.cost; const ok = $('.ok', box); if (!enough) { ok.classList.add('dim'); ok.textContent = 'おかねが たりない'; }
  speak(enough ? `${nm}。${it.cost}えんで かえるよ` : `おかねが たりないよ。せかいを しるで おかねを ためよう`);
  ok.onclick = () => { if (!buy(G, it.fam, it.cost)) { SFX.ng(); return; } SFX.level(); closeTop(); news(`🛍️ ${nm}を かったよ！ ずっと つかえるよ`); effect && G.me && effect('sparkle', G.me); G.save && G.save(true);
    if (choose) choose(it.house ? { type: 'house', key: it.house.key } : { type: 'block', id: it.d.id }); else if (!it.house) { G.hotbar[G.sel] = { type: 'block', id: it.d.id }; drawHotbar(); } };
  $('.no', box).onclick = () => closeTop(); $('.study', box).onclick = () => { closeTop(); openWorldStudy(); };
}
export function openStore() {
  const box = modal('store', `<h2>🏪 おみせ <span class="wal"><b>${G.money || 0}</b>えん</span></h2><p class="hint">かった ものは 📦に はいって ずっと つかえるよ。おかねは なかまの おねがい や 🌍せかいを しる で たまるよ（せかいを しると おなじ さいふ）</p><div class="ptabs"></div><div class="sgrid"></div>`);
  const tabs = $('.ptabs', box), grid = $('.sgrid', box); let cat = G.storeCat || 'furn';
  const show = () => { tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === cat)); grid.innerHTML = ''; const L = shelf(G, cat);
    if (!L.length) { grid.appendChild(h('p', 'hint', 'ぜんぶ もってるよ！')); return; }
    let i = 0; const step = () => { const end = Math.min(L.length, i + 16); for (; i < end; i++) { const it = L[i]; const b = h('button', 'pit sitem2'); if (it.house) b.innerHTML = `<span class="emo">${it.house.icon}</span><i class="pn">${it.house.name}</i>`; else { const cc = document.createElement('canvas'); cc.width = cc.height = 96; cc.getContext('2d').drawImage(blockIcon(it.d.id), 0, 0); b.appendChild(cc); b.appendChild(h('i', 'pn', it.d.name)); if (it.n > 1) b.appendChild(h('b', 'pcnt', '×' + it.n)); }
      b.appendChild(h('b', 'pprice', it.cost + 'えん')); if ((G.money || 0) < it.cost) b.classList.add('dim'); b.onclick = () => buyAsk(it, null); grid.appendChild(b); } if (i < L.length && grid.isConnected) requestAnimationFrame(step); }; step(); };
  for (const c of [...CATS.filter((c) => c.id !== 'house'), { id: 'house', name: 'おうち', icon: '🏡' }]) { const b = h('button', '', `<span>${c.icon}</span><i>${c.name}</i>`); b.dataset.c = c.id; b.onclick = () => { cat = G.storeCat = c.id; show(); }; tabs.appendChild(b); }
  show(); speak('いらっしゃいませ！');
}
export function openWorldStudy(prefer) {
  if (G.started === false) return; G.studyOpen = true;
  openSekai({ gameId: 'nakayoshi', prefer,
    onClose: (earned) => { G.studyOpen = false; G.money; if (earned) { G.stats.sekaiCoins = (G.stats.sekaiCoins || 0) + earned; news(`🌍 せかいを しる で ${earned}えん ゲット！`); coinFly(earned); } G.save && G.save(true); } });
}
