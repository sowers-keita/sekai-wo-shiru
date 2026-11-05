// ひだまりの島（旧：なかよしアイランド） — メイン
import { startIcons, preloadIcons } from './icons.js';
startIcons();
import * as THREE from 'three';
import { B, ID, atlas, BLOCK_COUNT, DOORS, doorCanvas, tileUV, T, USE } from './blocks.js';
import { eventsTick, dramaTick, startDrama, placesTick, placeLifeTick, dreamsTick, weatherTick, consultTick, findShelter, roofed, gather } from './events.js';
import { mailTick, dailyTick, inviteTick, count, goalsTick, weekTick, episodeTick, islandReport, onUse, kindTick, playTick, nightTick, artTick, weeklyArt, rareTick, onBestie, bestieTick, idleTick, pickFair, appearDecay, petTick, petArrive } from './daily.js';
import * as MINI from './mini.js';
import { World, generate, CS, buildHouse, isHouse, tree, W as WW, D as DD } from './world.js';
import { buildChunk, blockGeo } from './mesher.js';
import { loadKenney, kFurniture } from './props.js';
import { loadVoices } from './voice.js';
import { loadMotions } from './motion.js';
import { Resident, Pet, standable } from './life.js';
import { SFX } from './audio.js';
import { saveGame, loadGame } from './save.js';
import * as UI from './ui.js';
import { sekaiWallet, sekaiSpend, sekaiEarn } from './sekai.js';
import { preloadAll } from './animal.js';

const $ = (s) => document.querySelector(s);
export const G = window.G = {
  world: null, residents: [], pets: [], hour: 8, day: 1, me: null, watch: null, isFly: false, party: null,
  bag: { food: { 0: 3, 2: 2, 5: 1 }, hats: [1, 2], eggs: 1, tickets: 0 }, stats: {}, settings: { shadow: true, sound: true, quiz: 'all' },
  hotbar: [], sel: 0, newsLog: [], sfx: SFX, center: { x: 64.5, y: 23, z: 64.5 }, houseless: 0,
};
G.byUid = (u) => G.residents.find((r) => r.uid === u);
G.petName = (r) => { const p = G.pets.find((p) => p.owner === r.uid); return p ? p.name : 'ペット'; };
G.near = (r) => cam && r.obj.position.distanceTo(cam.position) < 18;
G.news = (t) => { if (G.fav && G.fav.length && !/^⭐/.test(t)) { const f = G.fav.map((u) => G.byUid(u)).find((r) => r && t.includes(r.name)); if (f) t = '⭐' + t; } UI.news(t); };

// ---------- 描画
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(/shot/.test(location.search) ? 1 : Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.28;
$('#game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.08, 260);
G.cam = cam; G.scene = scene; G.renderer = renderer;
scene.fog = new THREE.Fog(0x9fd8ff, 50, 170);
const hemi = new THREE.HemisphereLight(0xfff3fa, 0xa8d890, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 1.7); sun.castShadow = true;
sun.shadow.mapSize.set(/shot/.test(location.search) ? 1024 : 2048, /shot/.test(location.search) ? 1024 : 2048); if (/shot/.test(location.search)) renderer.shadowMap.type = THREE.PCFShadowMap; Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const amb = new THREE.AmbientLight(0xfff0f4, 0.3); scene.add(amb);
const lamps = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffc880, 0, 11, 1.4); scene.add(l); lamps.push(l); }

const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.LinearMipmapLinearFilter; atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const mOp = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
const mTr = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const mGl = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
const windU = { value: 0 };
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999); renderer.localClippingEnabled = true;
[mOp, mTr, mGl].forEach((m) => (m.clippingPlanes = [cutPlane]));
const mPl = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
mPl.onBeforeCompile = (sh) => { sh.uniforms.uTime = windU; sh.vertexShader = 'attribute float sway;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uTime * 2.1 + position.x * 0.8 + position.z * 0.6) * 0.07 * sway;\n transformed.z += cos(uTime * 1.7 + position.x * 0.5) * 0.05 * sway;'); };
mPl.clippingPlanes = [cutPlane];
G.toggleCut = () => { G.cutaway = !G.cutaway; UI.news(G.cutaway ? '🏠 やねを とって なかを みるよ' : '🏠 もとに もどしたよ'); };
G.atlasTex = atlasTex;

// そら（グラデーション）
const skyU = { top: { value: new THREE.Color(0x5aa8f0) }, bot: { value: new THREE.Color(0xcfeeff) } };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float vy; void main(){ float t = smoothstep(-0.05, 0.6, vy); gl_FragColor = vec4(mix(bot, top, t), 1.0); }' }));
skyDome.renderOrder = -10; scene.add(skyDome);
const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ color: 0xf4f0d8, fog: false, transparent: true, opacity: 0.95 })); scene.add(moonDisc);
const starPts = (() => { const n = 500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 6.28, v = Math.random() * 0.9 + 0.08; p[i * 3] = Math.cos(u) * Math.cos(v) * 180; p[i * 3 + 1] = Math.sin(v) * 180; p[i * 3 + 2] = Math.sin(u) * Math.cos(v) * 180; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(m); return m; })();
const pools = []; { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,210,140,1)'); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; scene.add(m); pools.push(m); } }
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false, transparent: true, opacity: 0.9 })); scene.add(sunDisc);
// 雲
const clouds = new THREE.Group(); scene.add(clouds);
{ const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x888888, transparent: true, opacity: 0.92 }); for (let i = 0; i < 16; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 8, 1.6, 4 + Math.random() * 6), cm); b.position.set(Math.random() * 8, Math.random() * 0.6, Math.random() * 6); c.add(b); } c.position.set(Math.random() * 220 - 46, 52 + Math.random() * 6, Math.random() * 220 - 46); clouds.add(c); } }
// 海（島のまわり）
{ const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: 0x3a8fd8, transparent: true, opacity: 0.85 })); sea.rotation.x = -Math.PI / 2; sea.position.set(64, 20.85, 64); scene.add(sea);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: 0xd8c890 })); floor.rotation.x = -Math.PI / 2; floor.position.set(64, 10, 64); scene.add(floor);
  // 端は水で隠す
}

// ---------- あめ・ゆき・にじ
const RN = 1600; const rainGeo = new THREE.BufferGeometry(); const rainPos = new Float32Array(RN * 3); for (let i = 0; i < RN; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 50; rainPos[i * 3 + 1] = Math.random() * 30; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50; } rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({ color: 0xaad4ff, size: 0.09, transparent: true, opacity: 0.75, depthWrite: false });
const rain = new THREE.Points(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const rainbow = new THREE.Group(); { const cols = [0xff4a4a, 0xff9a3a, 0xffe04a, 0x5ad86a, 0x4ab0ff, 0x6a6aff, 0xb06aff]; cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(70 - i * 1.6, 0.8, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false, fog: false })); rainbow.add(m); }); rainbow.position.set(64, 14, -30); rainbow.visible = false; scene.add(rainbow); }
function updateWeather(dt) {
  const W = G.weather; const wet = W && W.k !== 'sun';
  rain.visible = !!wet; G.wetF = (G.wetF || 0) + ((wet ? 1 : 0) - (G.wetF || 0)) * Math.min(1, dt * 0.8);
  if (wet) { const snow = W.k === 'snow'; rainMat.size = snow ? 0.16 : 0.08; rainMat.color.set(snow ? 0xffffff : 0xaad4ff); const p = rainGeo.attributes.position.array; const sp = snow ? 2.2 : 18; for (let i = 0; i < RN; i++) { p[i * 3 + 1] -= sp * dt; if (snow) p[i * 3] += Math.sin(t + i) * dt * 0.5; if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 30; } rainGeo.attributes.position.needsUpdate = true; rain.position.set(cam.position.x, cam.position.y - 10, cam.position.z); }
  if (G.rainbow > 0) { G.rainbow -= dt; rainbow.visible = true; rainbow.children.forEach((m) => (m.material.opacity = Math.min(0.45, G.rainbow / 10))); } else rainbow.visible = false;
}

// ---------- いきもの・けしき
const critters = new THREE.Group(); scene.add(critters);
const sprite = (e, s) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: UI.getEmojiTex(e), transparent: true, depthWrite: false })); m.scale.setScalar(s); return m; };
const flies = []; for (let i = 0; i < 14; i++) { const e = ['🦋', '🦋', '🐝', '🐞'][i % 4]; const m = sprite(e, 0.35); m.userData = { a: Math.random() * 6, home: null, e }; critters.add(m); flies.push(m); }
const fireflies = []; for (let i = 0; i < 26; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8ff6a, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); m.scale.setScalar(0.12); m.userData = { a: Math.random() * 6, e: '✨' }; critters.add(m); fireflies.push(m); }
const birds = []; for (let i = 0; i < 6; i++) { const m = sprite('🕊️', 0.9); m.userData = { a: Math.random() * 6, r: 30 + Math.random() * 40, h: 38 + Math.random() * 10, sp: 0.15 + Math.random() * 0.1 }; critters.add(m); birds.push(m); }
const fishes = []; for (let i = 0; i < 5; i++) { const m = sprite('🐟', 0.6); m.visible = false; m.userData = { t: 0 }; critters.add(m); fishes.push(m); }
// とおくの こじまと ふね
{ const isl = (x, z, r, h) => { const g = new THREE.Group(); const sand = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 1.2, 10), new THREE.MeshLambertMaterial({ color: 0xe2d39c })); sand.position.y = 20.4; g.add(sand); const hill = new THREE.Mesh(new THREE.ConeGeometry(r * 0.75, h, 9), new THREE.MeshLambertMaterial({ color: 0x5f9a3a })); hill.position.y = 20.6 + h / 2; g.add(hill); for (let k = 0; k < 3; k++) { const tr = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.5, 6), new THREE.MeshLambertMaterial({ color: 0x2f6a3a })); tr.position.set((Math.random() - 0.5) * r, 21 + h * 0.6, (Math.random() - 0.5) * r); g.add(tr); } g.position.set(x, 0, z); scene.add(g); };
  isl(-60, 40, 10, 9); isl(200, 90, 14, 14); isl(90, -70, 8, 6); isl(-40, 190, 12, 11);
  const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.6), new THREE.MeshLambertMaterial({ color: 0xc8503a })); hull.position.y = 21.2; boat.add(hull); const sail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 3), new THREE.MeshLambertMaterial({ color: 0xffffff })); sail.position.y = 23.3; boat.add(sail); scene.add(boat); G._boat = boat; }
let ambT = 3;
function updateCritters(dt) {
  const c = cam.position, day = (G.nightF || 0) < 0.5 && !(G.weather && G.weather.k !== 'sun');
  for (const f of flies) { const u = f.userData; if (!u.home || Math.random() < dt * 0.05 || Math.hypot(u.home[0] - c.x, u.home[2] - c.z) > 30) { const fl = G.flowerIds; for (let k = 0; k < 20; k++) { const x = Math.floor(c.x + (Math.random() - 0.5) * 40), z = Math.floor(c.z + (Math.random() - 0.5) * 40), y = G.world.top(x, z) + 1; if (fl.includes(G.world.get(x, y, z))) { u.home = [x + 0.5, y + 0.8, z + 0.5]; break; } } if (!u.home) u.home = [c.x, c.y, c.z]; }
    u.a += dt * 3; f.position.set(u.home[0] + Math.cos(u.a * 0.7) * 1.2, u.home[1] + Math.sin(u.a * 2.3) * 0.3, u.home[2] + Math.sin(u.a * 0.9) * 1.2); f.visible = day; f.material.rotation = Math.sin(u.a * 8) * 0.3; }
  const night = (G.nightF || 0) > 0.6; for (const f of fireflies) { const u = f.userData; if (!u.home || Math.random() < dt * 0.03 || Math.hypot(u.home[0] - c.x, u.home[2] - c.z) > 30) { const wt = G.findWaterEdge({ x: c.x, y: c.y, z: c.z }, 16); u.home = wt ? [wt[0] + 0.5, wt[1] + 0.6, wt[2] + 0.5] : [c.x + (Math.random() - 0.5) * 10, c.y, c.z + (Math.random() - 0.5) * 10]; } u.a += dt; f.position.set(u.home[0] + Math.sin(u.a * 0.6) * 2, u.home[1] + Math.sin(u.a * 1.3) * 0.5, u.home[2] + Math.cos(u.a * 0.5) * 2); f.visible = night && (fireflies.indexOf(f) < 10 || G.week === 'firefly'); f.material.opacity = 0.5 + Math.sin(u.a * 5) * 0.45; }
  for (const b of birds) { const u = b.userData; u.a += dt * u.sp; b.position.set(64 + Math.cos(u.a) * u.r, u.h + Math.sin(u.a * 3) * 2, 64 + Math.sin(u.a) * u.r); b.visible = day; }
  for (const f of fishes) { const u = f.userData; if (u.t > 0) { u.t -= dt; const k = 1 - u.t / 1.2; f.position.set(u.x + k * 1.5, u.y + Math.sin(k * Math.PI) * 1.3, u.z); f.material.rotation = -k * 2 + 1; if (u.t <= 0) f.visible = false; } else if (Math.random() < dt * 0.15) { const wt = G.findWaterEdge({ x: c.x, y: 21, z: c.z }, 18, true); if (wt) { u.x = wt[0] + 0.5; u.y = wt[1] + 0.8; u.z = wt[2] + 0.5; u.t = 1.2; f.visible = true; } } }
  if (G._boat) { const a = t * 0.01; G._boat.position.set(64 + Math.cos(a) * 110, Math.sin(t) * 0.1, 64 + Math.sin(a) * 110); G._boat.rotation.y = -a; }
  ambT -= dt; if (ambT <= 0) { ambT = 4 + Math.random() * 6; if (day) (Math.random() < 0.6 ? SFX.bird() : SFX.wave()); else if ((G.nightF || 0) > 0.6) SFX.cricket(); }
}

// ---------- チャンク
const chunks = new Map();
function geoFrom(d) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3)); if (d.sw) g.setAttribute('sway', new THREE.BufferAttribute(d.sw, 1)); g.setAttribute('normal', new THREE.BufferAttribute(d.nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(d.col, 3)); g.setIndex(new THREE.BufferAttribute(d.idx, 1)); g.computeBoundingSphere(); return g; }
function rebuildChunk(cx, cz) {
  const key = cx + ',' + cz; const old = chunks.get(key);
  if (old) for (const m of old) { scene.remove(m); if (!m.userData.shared) m.geometry.dispose(); }
  const o = buildChunk(G.world, cx, cz, CS); const arr = [];
  for (const [k, mat] of [['op', mOp], ['tr', mTr], ['gl', mGl], ['pl', mPl]]) { const d = o[k]; if (!d.idx.length) continue; const m = new THREE.Mesh(geoFrom(d), mat); if (k === 'op' || k === 'pl') { m.castShadow = k === 'op'; m.receiveShadow = true; } else if (k === 'tr') m.renderOrder = 1; scene.add(m); arr.push(m); }
  // ふわふわかぐ（3D モデル）
  const W_ = G.world; for (let x = cx * CS; x < cx * CS + CS; x++) for (let z = cz * CS; z < cz * CS + CS; z++) { const top = W_.top(x, z); for (let y = 1; y <= Math.min(top + 1, 63); y++) { const id = W_.get(x, y, z); if (!id || B[id].shape !== 'kmodel') continue; const o = kFurniture(B[id], W_.meta(x, y, z) & 3); if (!o) continue; o.position.set(x + 0.5, y, z + 0.5); scene.add(o); arr.push(o); } }
  chunks.set(key, arr);
}
function rebuildAll() { for (let cz = 0; cz < DD / CS; cz++) for (let cx = 0; cx < WW / CS; cx++) rebuildChunk(cx, cz); G.world.dirty.clear(); }

// ---------- ドア
const doors = new Map(); const doorTex = new Map();
function doorMat(di, gate) {
  if (!doorTex.has(di)) { const t = new THREE.CanvasTexture(doorCanvas(di)); if (gate) { t.repeat.set(1, 0.5); t.offset.set(0, 0.5); } t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; const face = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide }); const edge = new THREE.MeshLambertMaterial({ color: DOORS[di][1] }); doorTex.set(di, [edge, edge, edge, edge, face, face]); }
  return doorTex.get(di);
}
function addDoor(k) {
  const d = G.world.doors.get(k); if (!d) return; removeDoor(k);
  const outer = new THREE.Group(); outer.position.set(d.x + 0.5, d.y, d.z + 0.5); outer.rotation.y = -d.rot * Math.PI / 2;
  const hinge = new THREE.Group(); hinge.position.set(-0.5, 0, 0); outer.add(hinge);
  const gate = B[d.id].gate; const m = new THREE.Mesh(new THREE.BoxGeometry(1, gate ? 1 : 2, 0.12), doorMat(B[d.id].door, gate)); m.position.set(0.5, gate ? 0.5 : 1, 0); m.castShadow = true; hinge.add(m);
  scene.add(outer); doors.set(k, { d, outer, hinge, a: 0, open: false, slide: !!B[d.id].slide });
}
function removeDoor(k) { const e = doors.get(k); if (e) { scene.remove(e.outer); doors.delete(k); } }
function updateDoors(dt) {
  const ents = [...G.residents.map((r) => r.p)];
  for (const e of doors.values()) {
    const cx = e.d.x + 0.5, cz = e.d.z + 0.5;
    let near = false; for (const p of ents) if (Math.abs(p.x - cx) < 1.7 && Math.abs(p.z - cz) < 1.7 && Math.abs(p.y - e.d.y) < 2) { near = true; break; }
    if (near !== e.open) { e.open = near; if (cam.position.distanceTo(e.outer.position) < 14) SFX.door(); }
    const tgt = e.open ? -Math.PI * 0.48 : 0; e.a += (tgt - e.a) * Math.min(1, dt * 8); if (e.slide) e.hinge.position.x = -0.5 + e.a / (-Math.PI * 0.48) * 0.9; else e.hinge.rotation.y = e.a;
  }
}

// ---------- 当たり・ターゲット
const hl = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 }));
hl.visible = false; scene.add(hl); const hl0 = hl;
let target = null, targetRes = null;
const ray = new THREE.Raycaster();
function updateTarget() {
  target = null; targetRes = null; hl.visible = false; ghost.visible = false;
  if (!G.me && !G.freeCam) return;
  const o = cam.position.clone(), d = new THREE.Vector3(); cam.getWorldDirection(d);
  // 住人
  ray.set(o, d); ray.far = 9;
  let best = null;
  for (const r of G.residents) { if (r === G.me) continue; const c = r.obj.position.clone(); c.y += 0.6; const s = new THREE.Sphere(c, 0.55); const p = ray.ray.intersectSphere(s, new THREE.Vector3()); if (p) { const dd = p.distanceTo(o); if (!best || dd < best.dd) best = { r, dd }; } }
  const hit = G.world.raycast(o, d, 11);
  if (best && (!hit || best.dd < hit.t)) { targetRes = best.r; return; }
  if (hit) {
    const me = G.me ? G.me.p : o; if (Math.hypot(hit.x + 0.5 - me.x, hit.y + 0.5 - me.y, hit.z + 0.5 - me.z) > 8.5) return;
    target = hit; target.point = o.clone().addScaledVector(d, hit.t);
    hl.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); hl.visible = true;
  }
  updateGhost();
  if (G.selA) { const b = target ? [target.x, target.y, target.z] : G.selA; const x0 = Math.min(G.selA[0], b[0]), x1 = Math.max(G.selA[0], b[0]), y0 = Math.min(G.selA[1], b[1]), y1 = Math.max(G.selA[1], b[1]), z0 = Math.min(G.selA[2], b[2]), z1 = Math.max(G.selA[2], b[2]); selBox.scale.set(x1 - x0 + 1.02, y1 - y0 + 1.02, z1 - z0 + 1.02); selBox.position.set((x0 + x1) / 2 + 0.5, (y0 + y1) / 2 + 0.5, (z0 + z1) / 2 + 0.5); selBox.visible = true; } else selBox.visible = false;
}

// ---------- おく まえの プレビュー
const ghost = new THREE.Group(); scene.add(ghost); let ghostKey = '';
const ghostMat = { op: new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, opacity: 0.5, depthWrite: false, alphaTest: 0.1 }) };
const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xff8a5c })); selBox.visible = false; scene.add(selBox);
function placePos() { const h = target; if (!h) return null; const hd = B[h.id]; return replaceable(h.id) && hd.shape !== 'water' ? [h.x, h.y, h.z] : [h.x + h.n[0], h.y + h.n[1], h.z + h.n[2]]; }
function updateGhost() {
  const it = G.hotbar[G.sel]; const pp = placePos();
  if (!it || it.type !== 'block' || !pp || !G.me) { ghost.visible = false; return; }
  const d = B[it.id]; const rot = d.rot ? facingRot() : 0; const key = it.id + ':' + rot;
  if (key !== ghostKey) { ghostKey = key; while (ghost.children.length) { const c = ghost.children.pop(); if (!c.userData.shared && c.geometry) c.geometry.dispose(); }
    const o = blockGeo(it.id, rot); for (const k of ['op', 'tr', 'gl', 'pl']) { const dd = o[k]; if (!dd || !dd.idx.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dd.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(dd.uv, 2)); g.setIndex(new THREE.BufferAttribute(dd.idx, 1)); ghost.add(new THREE.Mesh(g, ghostMat.op)); }
    if (d.shape === 'kmodel') { const m = kFurniture(d, rot); if (m) { m.traverse((o) => { if (o.isMesh) o.material = ghostMat.op; }); m.position.set(0.5, 0, 0.5); ghost.add(m); } }
    if (d.shape === 'door' && !d.gate) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.12), ghostMat.op); m.position.set(0.5, 1, 0.5); m.rotation.y = -rot * Math.PI / 2; ghost.add(m); } }
  ghost.position.set(pp[0], pp[1], pp[2]); ghost.visible = true;
}
// ---------- 置く・こわす
function facingRot() { if (G.rotOverride != null) return G.rotOverride; return autoRot(); }
function autoRot() { const tx = Math.sin(G.yaw), tz = Math.cos(G.yaw); const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; let bi = 0, bv = -9; dirs.forEach((v, i) => { const s = v[0] * tx + v[1] * tz; if (s > bv) { bv = s; bi = i; } }); return bi; }
const replaceable = (id) => !id || B[id].shape === 'water' || B[id].shape === 'cross' || B[id].name === 'くさむら';
// ---------- とりけし
G.undoStack = [];
const beginOp = () => { G.world.rec = []; };
const endOp = () => { const r = G.world.rec; G.world.rec = null; if (r && r.length) { G.undoStack.push(r); if (G.undoStack.length > 30) G.undoStack.shift(); } UI.setUndo && UI.setUndo(G.undoStack.length); };
G.beginOp = beginOp; G.endOp = endOp; G.onBestie = (a, b) => { onBestie(G, a, b); G.bestieCut(a, b); }; G.pickFair = (L) => pickFair(G, L); G.onPetArrive = (p, r) => petArrive(G, p, r);
let tutRing = null;
// チュートリアル用：見通しがよく平らな場所をさがして、そちらを向く
G.tutOpen = (dists, half) => { const me = G.me; if (!me) return null; const w = G.world, gy = Math.floor(me.p.y - 1.1); const mx = me.p.x, mz = me.p.z;
  const flat = (x, z) => { for (let i = -half; i <= half + 1; i++) for (let j = -half; j <= half + 1; j++) { const xx = x + i, zz = z + j; if (xx < 4 || zz < 4 || xx > WW - 5 || zz > DD - 5) return false; const t = w.top(xx, zz); if (t !== gy) return false; const id = w.get(xx, t, zz); if (B[id].shape === 'water') return false; } return true; };
  const los = (x, z) => { const d = Math.hypot(x - mx, z - mz); for (let k = 1; k < d * 2; k++) { const f = k / (d * 2); if (w.top(Math.floor(mx + (x + 0.5 - mx) * f), Math.floor(mz + (z + 0.5 - mz) * f)) > gy + 1) return false; } return true; };
  for (const dist of dists) for (let a = 0; a < 24; a++) { const yaw = G.yaw + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * (Math.PI / 12); const x = Math.floor(mx + Math.sin(yaw + Math.PI) * dist), z = Math.floor(mz + Math.cos(yaw + Math.PI) * dist); if (flat(x, z) && los(x, z) && los(Math.floor(mx - Math.sin(yaw + Math.PI) * 4), Math.floor(mz - Math.cos(yaw + Math.PI) * 4))) return [x, gy + 1, z, yaw]; }
  for (const dist of dists) for (let a = 0; a < 24; a++) { const yaw = G.yaw + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * (Math.PI / 12); const x = Math.floor(mx + Math.sin(yaw + Math.PI) * dist), z = Math.floor(mz + Math.cos(yaw + Math.PI) * dist); if (flat(x, z) && los(x, z)) return [x, gy + 1, z, yaw]; }
  return null; };
G.tutMarker = (on) => { if (tutRing) { scene.remove(tutRing); tutRing = null; } if (!on || !G.me) return; const o = G.tutOpen([9, 11, 8, 13, 15], 5); let x, y, z; if (o) { [x, y, z] = o; G.yaw = o[3]; G.pitch = -0.35; } else { const fx = Math.sin(G.yaw + Math.PI), fz = Math.cos(G.yaw + Math.PI); x = Math.floor(G.me.p.x + fx * 9); z = Math.floor(G.me.p.z + fz * 9); y = G.world.top(x, z) + 1; } const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 40), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring); const sp = sprite('🏠', 1.6); sp.position.y = 2.2; g.add(sp); g.position.set(x + 0.5, y, z + 0.5); scene.add(g); tutRing = g; G.tutSpot = [x, y, z]; };
G.tutBuild = () => { const it = G.hotbar[G.sel]; if (!it || it.type !== 'house' || !G.tutSpot) return; const [x, y, z] = G.tutSpot; const r = facingRot(); const ox = x - 3, oz = z - 3; buildHouse(G.world, ox, y, oz, r, it.key); G.world.scanDoors(); for (const k of G.world.doors.keys()) if (!doors.has(k)) addDoor(k); SFX.ok(); UI.news('🏠 おうちが できた！'); UI.effect('sparkle', { p: { x: ox + 3.5, y: y + 3, z: oz + 3.5 } }); UI.tutFlag && UI.tutFlag('built'); G.tutHouse = [ox + 3, y, oz + 3]; };
function tutRingTick(t) { if (tutRing) { tutRing.children[0].scale.setScalar(1 + Math.sin(t * 4) * 0.08); tutRing.children[1].position.y = 2.2 + Math.sin(t * 3) * 0.25; const s = UI.tutStep(); if (s == null || s < 0) G.tutMarker(false); } }
G.bestieCut = (a, b) => { if (G.simulating || !G.me || UI.isModal() || G.mini || G.watchTemp || !G.started) return; const mx = (a.p.x + b.p.x) / 2, mz = (a.p.z + b.p.z) / 2; let ax = b.p.x - a.p.x, az = b.p.z - a.p.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al; const cxp = mx - az * 3, czp = mz + ax * 3; [a, b].forEach((r, i) => { const o = i ? a : b; r.path = null; r.state = 'event'; r.timer = 7; r.evMode = 'walk'; r.evFace = [(o.p.x + cxp) / 2, (o.p.z + czp) / 2]; }); G.watchTemp = { back: G.me, t: 8 }; G.setWatch(a); G.cine = true; G.cinePair = [a, b]; cineL.copy(a.obj.position); setTimeout(() => (G.cinePair = null), 8000); setTimeout(() => { [a, b].forEach((r) => { r.evMode = 'cheer'; }); a.say('ハイタッチ！', 2, 'joy'); b.say('いえーい！', 2, 'joy'); SFX.clap(); }, 2800); setTimeout(() => G.photo && G.photo([a, b], `${a.name}と ${b.name}、しんゆうの きねん`), 4500); }; G.onUse = (r, u) => onUse(G, r, u); G.count = (k, v) => count(G, k, v); G.burst = (...a) => UI.burst(...a); G.onGoalDone = (all) => UI.goalFx && UI.goalFx(all); G.onGoals = () => UI.updateGoals && UI.updateGoals();
G.onInvite = (r) => MINI.invite(G, r); G.onMail = () => UI.updateMail && UI.updateMail();
G.undo = () => { const r = G.undoStack.pop(); if (!r) { UI.news('もどせるものが ないよ'); return; } for (let i = r.length - 1; i >= 0; i--) { const [x, y, z, id, m] = r[i]; G.world.set(x, y, z, id, m); } G.world.scanDoors(); G.rebuildDoors(); SFX.pop(); UI.news('↶ もとに もどしたよ'); UI.setUndo && UI.setUndo(G.undoStack.length); };
// ---------- ちけいの どうぐ
export const TOOLS = [
  { key: 'raise', name: 'もりあげる', icon: '⛰️' }, { key: 'dig3', name: 'ほる', icon: '🕳️' }, { key: 'flat', name: 'たいらに する', icon: '🟫' },
  { key: 'water', name: 'みずを ながす（かわ・いけ・たき）', icon: '💧' }, { key: 'path', name: 'こみちを つくる', icon: '🛤️' }, { key: 'flowers', name: 'はなばたけ', icon: '🌼' },
  { key: 'fill', name: 'はんいを ぬる（2かい おす）', icon: '🟦' }, { key: 'walls', name: 'かべを つくる（2かい おす）', icon: '🧱' }, { key: 'clear', name: 'はんいを けす（2かい おす）', icon: '🧹' }, { key: 'copy', name: 'コピー（2かい おす）', icon: '📋' }, { key: 'paste', name: 'はりつけ', icon: '📌' },
  { key: 'tree0', name: 'きを うえる（オーク）', icon: '🌳' }, { key: 'tree6', name: 'きを うえる（サクラ）', icon: '🌸' }, { key: 'tree2', name: 'きを うえる（トウヒ）', icon: '🌲' }, { key: 'tree1', name: 'きを うえる（シラカバ）', icon: '🌿' }, { key: 'tree11', name: 'きを うえる（ゆめのき）', icon: '🔮' },
];
G.TOOLS = TOOLS;
function useArea(key) {
  const h = target; const w = G.world;
  if (key === 'paste') { const C = G.clip; if (!C) { UI.news('📋 さきに コピーしてね'); return; } const pp = placePos(); if (!pp) return; for (const [dx, dy, dz, id, m] of C.cells) { const x = pp[0] + dx, y = pp[1] + dy, z = pp[2] + dz; if (w.inb(x, y, z)) w.set(x, y, z, id, m); } w.scanDoors(); G.rebuildDoors(); SFX.ok(); UI.news('📌 はりつけたよ'); return; }
  const p = key === 'fill' || key === 'walls' ? placePos() : [h.x, h.y, h.z];
  if (!G.selA) { G.selA = p; G.selKey = key; UI.news('もう 1かい おして はんいを きめてね'); SFX.pop(); return; }
  const A = G.selA; G.selA = null; const x0 = Math.min(A[0], p[0]), x1 = Math.max(A[0], p[0]), y0 = Math.min(A[1], p[1]), y1 = Math.max(A[1], p[1]), z0 = Math.min(A[2], p[2]), z1 = Math.max(A[2], p[2]);
  const vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1); if (vol > 6000) { UI.news('ちょっと おおきすぎるよ'); return; }
  const bid = G.lastBlock || ID.plank0;
  if (key === 'copy') { const cells = []; for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const id = w.get(x, y, z); if (id) cells.push([x - x0, y - y0, z - z0, id, w.meta(x, y, z)]); } G.clip = { cells }; UI.news(`📋 ${cells.length}こ コピーしたよ。「はりつけ」で おけるよ`); SFX.ok(); return; }
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (key === 'clear') { if (y > 0) w.set(x, y, z, 0); continue; }
    if (key === 'walls' && !(x === x0 || x === x1 || z === z0 || z === z1)) continue;
    if (replaceable(w.get(x, y, z))) w.set(x, y, z, bid, B[bid].rot ? facingRot() : 0);
  }
  w.scanDoors(); G.rebuildDoors(); SFX.ok(); UI.burst((x0 + x1) / 2 + 0.5, y1 + 0.5, (z0 + z1) / 2 + 0.5, bid, 12);
}
function useTool(key) {
  if (['fill', 'walls', 'clear', 'copy', 'paste'].includes(key)) { useArea(key); return; }
  const h = target; if (!h) return; const w = G.world;
  const cols = (R) => { const o = []; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dz * dz <= R * R + 1) o.push([h.x + dx, h.z + dz]); return o; };
  const solidTop = (x, z) => { for (let y = Math.min(w.H - 2, h.y + 6); y > 0; y--) { const id = w.get(x, y, z); if (id && B[id].full) return y; } return -1; };
  if (key === 'raise') for (const [x, z] of cols(2)) { const dd = Math.hypot(x - h.x, z - h.z); if (dd > 0.5 && Math.random() > 1.15 - dd * 0.4) continue; const y = solidTop(x, z); if (y < 0 || y > w.H - 3) continue; const top = w.get(x, y, z); w.set(x, y, z, B[top].tint === 'grass' ? ID.dirt : top); w.set(x, y + 1, z, top); if (w.get(x, y + 2, z) && B[w.get(x, y + 2, z)].shape === 'cross') w.set(x, y + 2, z, 0); }
  if (key === 'dig3') for (const [x, z] of cols(1)) { const y = solidTop(x, z); if (y <= 2) continue; const top = w.get(x, y, z); const up = w.get(x, y + 1, z); if (up && !B[up].full) w.set(x, y + 1, z, 0); w.set(x, y, z, 0); if (B[top].tint === 'grass' && y > 1) w.set(x, y - 1, z, ID.grass); }
  if (key === 'flat') { const ty = h.y; for (const [x, z] of cols(2)) { for (let y = ty + 1; y < ty + 8; y++) { const id = w.get(x, y, z); if (id && (B[id].full || B[id].shape === 'cross')) w.set(x, y, z, 0); } for (let y = ty; y > ty - 4; y--) { const id = w.get(x, y, z); if (!id || !B[id].full) w.set(x, y, z, y === ty ? ID.grass : ID.dirt); } if (B[w.get(x, ty, z)].full && w.get(x, ty, z) !== ID.grass && B[w.get(x, ty, z)].tint !== 'grass') {} } }
  if (key === 'path') for (const [x, z] of cols(1)) { const y = solidTop(x, z); if (y < 0) continue; const id = w.get(x, y, z); if (B[id].tint === 'grass' || id === ID.dirt) w.set(x, y, z, (x + z) % 3 ? ID.gravel : ID.paving); const up = w.get(x, y + 1, z); if (up && B[up].shape === 'cross') w.set(x, y + 1, z, 0); }
  if (key === 'flowers') for (let i = 0; i < 14; i++) { const x = h.x + Math.round((Math.random() - 0.5) * 6), z = h.z + Math.round((Math.random() - 0.5) * 6); const y = solidTop(x, z); if (y < 0) continue; if (B[w.get(x, y, z)].tint === 'grass' && !w.get(x, y + 1, z)) w.set(x, y + 1, z, G.flowerIds[Math.floor(Math.random() * G.flowerIds.length)]); }
  if (key.startsWith('tree')) { const wi = +key.slice(4); const x = h.x + h.n[0], y = h.y + h.n[1], z = h.z + h.n[2]; if (!w.get(x, y, z)) { tree(w, x, y, z, wi); for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) w.dirty.add(((x + dx) >> 4) + ',' + ((z + dz) >> 4)); } }
  if (key === 'water') {
    let sx = h.x + h.n[0], sy = h.y + h.n[1], sz = h.z + h.n[2]; if (h.n[1] === 1) sy = h.y + 1;
    const q = [[sx, sy, sz, 0]], seen = new Set(); let n = 0;
    while (q.length && n < 500) { const [x, y, z, d] = q.shift(); const k = x + ',' + y + ',' + z; if (seen.has(k)) continue; seen.add(k); const id = w.get(x, y, z); if (!w.inb(x, y, z) || (id && !replaceable(id))) continue; w.set(x, y, z, ID.water); n++;
      const below = w.get(x, y - 1, z); if (y > 1 && (!below || replaceable(below) && below !== ID.water)) { q.push([x, y - 1, z, d]); continue; }
      if (d < 6) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) q.push([x + dx, y, z + dz, d + 1]); }
  }
  SFX.place(); UI.burst(h.x + 0.5, h.y + 1, h.z + 0.5, key === 'water' ? ID.water : ID.dirt, 8); G.lastBuild = performance.now();
}
function place() {
  const item = G.hotbar[G.sel]; if (!item || !target) return;
  if (item.type === 'tool') { beginOp(); useTool(item.key); endOp(); return; }
  beginOp(); try { place2(item); } finally { endOp(); }
}
function place2(item) {
  const h = target; const hd = B[h.id];
  let [x, y, z] = replaceable(h.id) && hd.shape !== 'water' ? [h.x, h.y, h.z] : [h.x + h.n[0], h.y + h.n[1], h.z + h.n[2]];
  if (item.type === 'house') {
    const r = facingRot();
    // 正面がプレイヤーを向くように、少し奥にたてる
    const fwd = [[0, -1], [1, 0], [0, 1], [-1, 0]][r];
    const cx = x - fwd[0] * 5, cz = z - fwd[1] * 5;
    const ox = r === 0 || r === 2 ? cx - 3 : cx - 3, oz = cz - 3;
    if (ox < 3 || oz < 3 || ox > WW - 11 || oz > DD - 11) { UI.news('ここには たてられないよ'); return; }
    buildHouse(G.world, ox, y, oz, r, item.key); G.world.scanDoors(); for (const k of G.world.doors.keys()) if (!doors.has(k)) addDoor(k);
    UI.tutFlag && UI.tutFlag('built'); G.tutHouse = [ox + 3, y, oz + 3];
    SFX.ok(); UI.news('🏠 おうちが できた！'); UI.effect('sparkle', { p: { x: ox + 3.5, y: y + 3, z: oz + 3.5 } }); return;
  }
  const id = item.id, d = B[id]; G.lastBlock = id;
  if (!G.world.inb(x, y, z) || !replaceable(G.world.get(x, y, z))) return;
  let meta = 0;
  if (d.rot) meta = facingRot();
  if (d.axis) meta = (h.n[0] ? 1 : h.n[2] ? 2 : 0) << 2;
  if (d.shape === 'slab') { const fy = h.point.y - Math.floor(h.point.y); if (h.n[1] === -1 || (h.n[1] === 0 && fy > 0.5)) meta |= 4; }
  if (d.solid && d.shape !== 'door' && G.me) { const p = G.me.p; if (Math.abs(p.x - (x + 0.5)) < 0.8 && Math.abs(p.z - (z + 0.5)) < 0.8 && p.y < y + 1 && p.y + 1.3 > y) return; }
  if (d.shape === 'door' && d.gate) G.world.set(x, y, z, id, meta);
  else if (d.shape === 'door') { if (!replaceable(G.world.get(x, y + 1, z))) return; G.world.set(x, y + 1, z, id, meta | 8); G.world.set(x, y, z, id, meta); }
  else G.world.set(x, y, z, id, meta);
  if (d.model === 'cake') G.cakeAt = [x, y, z];
  G.count('build'); if (d.cat === 'furn') { G.placed = G.placed || {}; G.placed[x + ',' + y + ',' + z] = { d: G.day, n: d.name }; const ks = Object.keys(G.placed); if (ks.length > 60) delete G.placed[ks[0]]; }
  if (!G.recent) G.recent = []; G.recent = [id, ...G.recent.filter((r) => r !== id)].slice(0, 24);
  SFX.pon(); UI.burst(x + 0.5, y + 0.5, z + 0.5, id, 4); G.lastBuild = performance.now();
}
function dig() { beginOp(); try { dig2(); } finally { endOp(); } }
const FINDS = { fossil: [['きょうりゅうの ほね', '🦴'], ['アンモナイト', '🐚'], ['キバ', '🦷']], gem: [['ダイヤ', '💎'], ['すいしょう', '🔮'], ['ヒスイ', '🟢']], treasure: [['おうかん', '👑'], ['きんか', '🪙'], ['ふしぎな かぎ', '🗝️']] };
function dig2() {
  if (!target) return; const h = target;
  if (h.y <= 0) return;
  { const d0 = B[h.id]; const w = G.world; const R = Math.random();
    if ((d0.cat === 'stone' || d0.name === 'つち' || d0.name === 'じゃり' || d0.name === 'すな') && h.y <= 20 && R < 0.08) { const L = Math.random() < 0.5 ? FINDS.fossil : FINDS.gem; const f = L[Math.floor(Math.random() * 3)]; G.discover(f[0], f[1], 'ほって みつけた'); }
    else if ((d0.tint === 'grass' || d0.name === 'つち') && R < 0.07) { let nearLog = false; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const id = w.get(h.x + dx, h.y + 1, h.z + dz); if (id && B[id].axis) nearLog = true; } if (nearLog) { const f = FINDS.treasure[Math.floor(Math.random() * 3)]; G.discover(f[0], f[1], 'きの したで みつけた'); } }
    if (d0.secret) G.discover(d0.name, d0.name === 'にじいろのはな' ? '🌈' : '🌙', 'つんだ'); }
  UI.burst(h.x + 0.5, h.y + 0.5, h.z + 0.5, h.id, 10);
  G.world.set(h.x, h.y, h.z, 0); SFX.dig(); G.lastBuild = performance.now();
  // 上に乗っている草花も
  const up = G.world.get(h.x, h.y + 1, h.z); if (up && (B[up].shape === 'cross' || B[up].shape === 'carpet' || B[up].shape === 'torch')) G.world.set(h.x, h.y + 1, h.z, 0);
}
function pickBlock() { if (!target) return; const id = target.id; if (B[id].shape === 'water') return; G.hotbar[G.sel] = { type: 'block', id }; UI.drawHotbar(); }
G.place = place; G.dig = dig; G.pickBlock = pickBlock;
G.snap = (w = 1280, h = 800) => { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); updateDay(0.001, G.me ? G.me.obj.position : G.freePos); updateCamera(1); renderer.render(scene, cam); const u = renderer.domElement.toDataURL('image/jpeg', 0.85); renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); return u; };
G.testTool = (x, y, z, key) => { target = { x, y, z, n: [0, 1, 0], id: G.world.get(x, y, z) }; beginOp(); useTool(key); endOp(); };

// ---------- 入力
const keys = {}; const inp = { mx: 0, mz: 0, lx: 0, ly: 0, jump: false, down: false };
G.yaw = Math.PI; G.pitch = -0.25; G.dist = 5;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; keys[e.code] = true; SFX.unlock();
  if (UI.isModal()) { if (e.code === 'Escape') UI.closeTop(); return; }
  if (e.code === 'KeyE' || e.code === 'KeyB') UI.openPicker();
  if (e.code === 'KeyF') talk();
  if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) G.undo();
  if (e.code === 'KeyQ' || e.code === 'KeyM') UI.openMenu();
  if (e.code === 'KeyG') toggleFly();
  if (e.code === 'KeyR') G.rotate();
  if (e.code === 'KeyV') G.dist = G.dist < 1.5 ? 5 : 0.6;
  if (/^Digit[1-9]$/.test(e.code)) { G.sel = +e.code.slice(5) - 1; UI.drawHotbar(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
const cvs = renderer.domElement;
let locked = false;
cvs.addEventListener('mousedown', (e) => {
  SFX.unlock(); if (UI.isModal()) return;
  if (e.pointerType === 'touch') return;
  if (!locked && matchMedia('(pointer:fine)').matches) { cvs.requestPointerLock?.(); return; }
  if (!locked) return;
  if (e.button === 0) { const o = cam.position, dd = new THREE.Vector3(); cam.getWorldDirection(dd); ray.set(o, dd); const hb = ray.intersectObjects(flies.concat(fireflies).filter((f) => f.visible), false)[0]; if (hb && hb.distance < 9) { catchBug(hb.object); return; } if (targetRes) talk(); else { dig(); G.holdAct = { f: dig, t: 0.35 }; } } else if (e.button === 2) { place(); G.holdAct = { f: place, t: 0.35 }; } else if (e.button === 1) pickBlock();
});
cvs.addEventListener('contextmenu', (e) => e.preventDefault()); addEventListener('mouseup', () => (G.holdAct = null));
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cvs; $('#hud').classList.toggle('locked', locked); });
addEventListener('mousemove', (e) => { if (locked) { G.yaw -= e.movementX * 0.0028; G.pitch = Math.max(-1.45, Math.min(1.2, G.pitch - e.movementY * 0.0028)); } });
addEventListener('wheel', (e) => { if (UI.isModal()) return; if (locked) { G.sel = (G.sel + (e.deltaY > 0 ? 1 : 8)) % 9; UI.drawHotbar(); } else { G.dist = Math.max(0.6, Math.min(14, G.dist * (e.deltaY > 0 ? 1.1 : 0.9))); } }, { passive: true });
// タッチ
const touches = new Map(); let joyId = null, joyO = null;
cvs.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return; SFX.unlock(); if (UI.isModal()) return;
  const left = e.clientX < innerWidth * 0.38 && e.clientY > innerHeight * 0.35;
  if (left && joyId === null) { joyId = e.pointerId; joyO = [e.clientX, e.clientY]; UI.joy(true, joyO, joyO); }
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
  cvs.setPointerCapture(e.pointerId);
});
cvs.addEventListener('pointermove', (e) => {
  const t = touches.get(e.pointerId); if (!t) return;
  if (e.pointerId === joyId) { let dx = e.clientX - joyO[0], dy = e.clientY - joyO[1]; const l = Math.hypot(dx, dy), m = 60; if (l > m) { dx *= m / l; dy *= m / l; } inp.mx = dx / m; inp.mz = dy / m; UI.joy(true, joyO, [joyO[0] + dx, joyO[1] + dy]); }
  else { G.yaw -= (e.clientX - t.x) * 0.006; G.pitch = Math.max(-1.45, Math.min(1.2, G.pitch - (e.clientY - t.y) * 0.006)); }
  t.x = e.clientX; t.y = e.clientY;
});
const tEnd = (e) => {
  const t = touches.get(e.pointerId); touches.delete(e.pointerId);
  if (e.pointerId === joyId) { joyId = null; inp.mx = inp.mz = 0; UI.joy(false); return; }
  if (t && performance.now() - t.t < 280 && Math.hypot(e.clientX - t.sx, e.clientY - t.sy) < 12) tapAt(e.clientX, e.clientY);
};
cvs.addEventListener('pointerup', tEnd); cvs.addEventListener('pointercancel', tEnd);
function tapAt(x, y) {
  const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(v, cam); ray.far = 30;
  let best = null;
  for (const r of G.residents) { const c = r.obj.position.clone(); c.y += 0.6; const p = ray.ray.intersectSphere(new THREE.Sphere(c, 0.6), new THREE.Vector3()); if (p) { const d = p.distanceTo(cam.position); if (!best || d < best.d) best = { r, d }; } }
  for (const pt of G.pets) { const c = pt.obj.position.clone(); c.y += 0.5 * pt.size; const p = ray.ray.intersectSphere(new THREE.Sphere(c, 0.5 * pt.size + 0.15), new THREE.Vector3()); if (p) { const d = p.distanceTo(cam.position); if (!best || d < best.d) best = { pet: pt, d }; } }
  const hitBug = ray.intersectObjects(flies.concat(fireflies).filter((f) => f.visible), false)[0];
  if (hitBug && (!best || hitBug.distance < best.d) && hitBug.distance < 9) { catchBug(hitBug.object); return; }
  if (best && best.pet) UI.openPet(best.pet); else if (best) UI.openResident(best.r);
}
function catchBug(o) { G.count('bug'); const nm = { '🦋': 'チョウ', '🐝': 'ハチ', '🐞': 'テントウムシ', '✨': 'ホタル' }[o.userData.e] || 'むし'; G.discover(nm, o.userData.e, 'つかまえた'); o.userData.home = null; UI.burst(o.position.x, o.position.y, o.position.z, ID.grass, 4); SFX.pop(); }
function talk() { const r = targetRes || nearestRes(2.6); if (r) UI.openResident(r); }
function nearestRes(max) { if (!G.me) return null; let b = null, bd = max; for (const r of G.residents) { if (r === G.me) continue; const d = r.dist(G.me); if (d < bd) { bd = d; b = r; } } return b; }
G.talk = talk; G.nearestRes = nearestRes;
function toggleFly() { G.isFly = !G.isFly; if (G.me) G.me.p.vy = 0; UI.setFly(G.isFly); }
G.toggleFly = toggleFly;
G.rotate = () => { G.rotStep = ((G.rotStep || 0) + 1) % 4; G.rotOverride = G.rotStep === 0 ? null : (autoRot() + G.rotStep) % 4; UI.news(G.rotOverride == null ? '↻ むき：じどう' : `↻ むき ${['↑', '→', '↓', '←'][G.rotOverride]}`); };
// ゲームパッド
const padPrev = {};
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = [...pads].find((x) => x);
  if (!p) return null;
  const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
  const b = (i) => p.buttons[i] && p.buttons[i].pressed, edge = (i) => { const v = b(i), pv = padPrev[i]; padPrev[i] = v; return v && !pv; };
  if (UI.isModal()) { if (edge(1)) UI.closeTop(); UI.padNav && UI.padNav(p, edge); return null; }
  if (document.querySelector('#mini.inv, #mini.paint')) { UI.padNav(p, edge); return null; }
  G.yaw -= dz(p.axes[2]) * dt * 2.6; G.pitch = Math.max(-1.45, Math.min(1.2, G.pitch - dz(p.axes[3]) * dt * 2));
  if (edge(7)) place(); if (edge(6) || edge(2)) dig(); if (edge(1)) talk(); if (edge(3)) UI.openPicker(); if (edge(9) || edge(8)) UI.openMenu();
  if (edge(4) || edge(14)) { G.sel = (G.sel + 8) % 9; UI.drawHotbar(); } if (edge(5) || edge(15)) { G.sel = (G.sel + 1) % 9; UI.drawHotbar(); }
  if (edge(10)) toggleFly(); if (edge(11)) G.dist = G.dist < 1.5 ? 5 : 0.6;
  return { mx: dz(p.axes[0]), mz: dz(p.axes[1]), jump: b(0), down: b(13) || b(12) && false };
}

// ---------- プレイヤー移動・カメラ
function controlMe(dt) {
  const pad = pollPad(dt);
  let mx = inp.mx, mz = inp.mz;
  if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  let jump = keys.Space || inp.jump || G.inpJump, down = keys.ShiftLeft || inp.down || G.inpDown;
  if (pad) { mx += pad.mx; mz += pad.mz; jump = jump || pad.jump; down = down || pad.down; }
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  if (!G.me) { // 自由カメラ
    const sp = 14 * dt; const f = new THREE.Vector3(-Math.sin(G.yaw), 0, -Math.cos(G.yaw)), r = new THREE.Vector3(Math.cos(G.yaw), 0, -Math.sin(G.yaw));
    G.freePos.addScaledVector(f, -mz * sp).addScaledVector(r, mx * sp); if (jump) G.freePos.y += sp; if (down) G.freePos.y -= sp; return;
  }
  const me = G.me, p = me.p;
  const sp = (G.isFly ? 9 : keys.ShiftLeft && !G.isFly ? 3 : 4.6) * dt;
  const fx = -Math.sin(G.yaw), fz = -Math.cos(G.yaw), rx = Math.cos(G.yaw), rz = -Math.sin(G.yaw);
  const dx = (fx * -mz + rx * mx) * sp, dz = (fz * -mz + rz * mx) * sp;
  me.speed = l * 4;
  if (l > 0.05) me.yaw = Math.atan2(dx, dz);
  const inWater = B[G.world.get(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z))]?.shape === 'water';
  if (G.isFly) { G.world.move(p, dx, 0, dz, 0.25, 1.3, false); const vy = (jump ? 7 : 0) - (down ? 7 : 0); G.world.move(p, 0, vy * dt, 0, 0.25, 1.3, false); }
  else {
    G.world.move(p, dx * (inWater ? 0.6 : 1), 0, dz * (inWater ? 0.6 : 1), 0.25, 1.3, true);
    if (jump && (p.onGround || inWater)) p.vy = inWater ? 4 : 7.6;
    p.vy = Math.max(inWater ? -3 : -24, p.vy - (inWater ? 10 : 24) * dt);
    G.world.move(p, 0, p.vy * dt, 0, 0.25, 1.3, false);
    if (p.y < 5) { p.y = G.world.top(Math.floor(p.x), Math.floor(p.z)) + 1.2; p.vy = 0; }
  }
}
const camT = new THREE.Vector3();
G.twoShot = (dt, pair) => twoShot(dt, pair);
const cineT = new THREE.Vector3(), cineL = new THREE.Vector3(); let cineSpk = null;
function twoShot(dt, pair) {
  const [a, b] = pair || G.cinePair; const pa = a.obj.position, pb = b.obj.position; const mid = pa.clone().add(pb).multiplyScalar(0.5); mid.y += Math.max(a.ch.height, b.ch.height) * 0.62;
  const ab = pb.clone().sub(pa); ab.y = 0; ab.normalize(); let best = null;
  for (const s of [1, -1]) { const n = new THREE.Vector3(-ab.z * s, 0, ab.x * s); const dir = n.clone(); dir.y = 0.16; dir.normalize(); const hit = G.world.raycast(mid, dir, 3.6, true); const free = hit ? hit.t : 3.6; if (!best || free > best.free) best = { dir, free }; }
  cineT.copy(mid).addScaledVector(best.dir, Math.max(2.2, Math.min(3.4, best.free - 0.2))); cam.position.lerp(cineT, Math.min(1, dt * 3)); cineL.lerp(mid, Math.min(1, dt * 4)); cam.lookAt(cineL); return true;
}
function cineCam(dt) {
  if (G.cinePair) return twoShot(dt);
  const a = G.watch; if (!a) return false; const near = G.residents.filter((r) => r !== a && r.dist(a) < 5);
  const recent = [a, ...near].filter((r) => r.bubbleT > 0 && r.sayAt).sort((x, y) => y.sayAt - x.sayAt)[0];
  if (!recent && !near.length) return false;
  const spk = recent || a; const lis = spk === a ? (a.partner && near.includes(a.partner) ? a.partner : near.sort((x, y) => x.dist(spk) - y.dist(spk))[0]) : a; if (!lis) return false;
  const sh = spk.obj.position.clone(); sh.y += spk.ch.height * 0.82; const lh = lis.obj.position.clone(); lh.y += lis.ch.height * 0.8;
  const dir = sh.clone().sub(lh); dir.y = 0; const L = dir.length() || 1; dir.divideScalar(L); const side = new THREE.Vector3(dir.z, 0, -dir.x);
  cineT.copy(lh).addScaledVector(dir, -1.5).addScaledVector(side, 0.75); cineT.y = Math.max(lh.y, sh.y) + 0.15;
  const hit = G.world.raycast(sh, cineT.clone().sub(sh).normalize(), cineT.distanceTo(sh), true); if (hit) cineT.copy(sh).addScaledVector(cineT.clone().sub(sh).normalize(), Math.max(0.6, hit.t - 0.2));
  const cut = cineSpk !== spk; cineSpk = spk; if (cut) { cam.position.copy(cineT); cineL.copy(sh); } else { cam.position.lerp(cineT, Math.min(1, dt * 2.5)); cineL.lerp(sh, Math.min(1, dt * 4)); }
  cam.lookAt(cineL); return true;
}
function updateCamera(dt) {
  if (G.introCam && G.introCam(dt)) return;
  if (G.watch && !G.me && G.cine && cineCam(dt)) return;
  let focus;
  if (G.watch && !G.me) focus = G.watch.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  else if (G.me) focus = G.me.obj.position.clone().add(new THREE.Vector3(0, 1.25, 0));
  else { focus = G.freePos.clone(); }
  if (G.watch && !G.me) G.yaw += dt * (G.watchTemp ? 0.05 : 0.12);
  const first = G.me && G.dist < 1.2;
  if (G.me) G.me.obj.visible = !first;
  const dir = new THREE.Vector3(-Math.sin(G.yaw) * Math.cos(G.pitch), Math.sin(G.pitch), -Math.cos(G.yaw) * Math.cos(G.pitch));
  if (first) { cam.position.copy(focus).add(new THREE.Vector3(0, 0.05, 0)); cam.lookAt(focus.clone().add(dir)); return; }
  const side = new THREE.Vector3(Math.cos(G.yaw), 0, -Math.sin(G.yaw)).multiplyScalar(G.me ? 0.45 : 0);
  const base = focus.clone().add(side);
  let d = G.dist;
  if ((G.me || G.watch) && cutPlane.constant > 900) { const back = dir.clone().negate(); const hit = G.world.raycast(base, back, d + 0.3, true); if (hit) d = Math.max(0.5, hit.t - 0.3); }
  if (G.me) G.me.obj.visible = d > 1.15;
  camT.copy(base).addScaledVector(dir, -d);
  cam.position.lerp(camT, Math.min(1, dt * 18));
  cam.lookAt(base.clone().addScaledVector(dir, 3));
}

// ---------- 昼と夜
const SKY = [[0, 0x262a5e], [5, 0x34366e], [6, 0xffc4b0], [7.5, 0xb4e2ff], [17, 0xb4e2ff], [18.5, 0xffb4c8], [19.5, 0x6a5aa8], [21, 0x2c2e66], [24, 0x262a5e]];
function skyAt(h) { for (let i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h <= SKY[i + 1][0]) return new THREE.Color(SKY[i][1]).lerp(new THREE.Color(SKY[i + 1][1]), (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0])); return new THREE.Color(SKY[0][1]); }
let lampT = 0;
function updateDay(dt, focus) {
  const prevDay = Math.floor(G.time / 24);
  G.time += dt * (24 / 720); G.hour = G.time % 24; G.day = Math.floor(G.time / 24) + 1;
  if (Math.floor(G.time / 24) !== prevDay) { UI.news(`☀️ ${G.day}にちめの あさ！`); }
  const h = G.hour, c = skyAt(h).lerp(new THREE.Color(0x7a8290), (G.wetF || 0) * 0.55);
  scene.background = c; scene.fog.color.copy(c); scene.fog.far = 170 - (G.wetF || 0) * 70;
  const dayF = Math.max(0, Math.min(1, h < 12 ? (h - 5.5) / 2 : (19.5 - h) / 2));
  skyU.bot.value.copy(c).lerp(new THREE.Color(0xffeef6), 0.45 * dayF); skyU.top.value.copy(c).lerp(new THREE.Color(0x7cc4ff), 0.5 * dayF).multiplyScalar(0.8 + 0.1 * dayF); skyDome.position.copy(cam.position);
  hemi.intensity = 0.5 + dayF * 0.85 - (G.wetF || 0) * 0.15; sun.intensity = (0.25 + dayF * 1.35) * (1 - (G.wetF || 0) * 0.6); amb.intensity = 0.24 + dayF * 0.16;
  sun.color.setHSL(0.08, 0.55, 0.6 + dayF * 0.32);
  const a = ((h - 6) / 12) * Math.PI; const sx = Math.cos(a) * 60, sy = Math.max(15, Math.sin(a) * 80);
  sun.position.set(focus.x + sx, focus.y + sy, focus.z + 30); sun.target.position.copy(focus);
  sunDisc.position.set(cam.position.x + sx * 3, cam.position.y + Math.sin(a) * 200, cam.position.z + 90); sunDisc.lookAt(cam.position); sunDisc.visible = h > 5.5 && h < 19 && !(G.weather && G.weather.k !== 'sun'); sunDisc.material.color.setHSL(0.12, 0.9, 0.85 - (1 - dayF) * 0.2);
  sun.shadow.camera.updateProjectionMatrix();
  const night = 1 - dayF; G.nightF = night;
  moonDisc.visible = night > 0.4 && !(G.weather && G.weather.k !== 'sun'); moonDisc.position.set(cam.position.x - sx * 3, cam.position.y + 140, cam.position.z - 90); moonDisc.lookAt(cam.position);
  starPts.position.copy(cam.position); starPts.material.opacity = Math.max(0, night - 0.3) * (G.wetF ? 1 - G.wetF : 1) * 1.2; starPts.visible = starPts.material.opacity > 0.02;
  if (night > 0.5) { sun.color.setRGB(0.55, 0.65, 1); sun.intensity = 0.32; sun.position.set(focus.x - sx, focus.y + 70, focus.z - 30); }
  pools.forEach((p, i) => { const l = lamps[i]; const on = l.userData.on && night > 0.4; p.visible = !!on; if (on) { const x = Math.floor(l.position.x), z = Math.floor(l.position.z); let y = Math.floor(l.position.y); for (let k = 0; k < 6 && !(G.world.get(x, y - 1, z) && B[G.world.get(x, y - 1, z)].solid); k++) y--; p.position.set(l.position.x, y + 0.03, l.position.z); p.material.opacity = 0.35 * night; } });
  // ちかくの あかり
  lampT -= dt;
  if (lampT <= 0) {
    lampT = 1.2; const found = [], R = 12, fx = Math.floor(focus.x), fy = Math.floor(focus.y), fz = Math.floor(focus.z);
    for (let y = fy - 6; y <= fy + 8; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) { const id = G.world.get(x, y, z); if (id && B[id].light) found.push([(x - fx) ** 2 + (z - fz) ** 2 + (y - fy) ** 2, x, y, z]); }
    found.sort((p, q) => p[0] - q[0]);
    lamps.forEach((l, i) => { const f = found[i]; if (f) { l.position.set(f[1] + 0.5, f[2] + 0.7, f[3] + 0.5); l.userData.on = 1; } else l.userData.on = 0; });
  }
  lamps.forEach((l) => (l.intensity = (l.userData.on || 0) * (0.4 + night * 2.6)));
}

// ---------- ベッドの持ち主
let bedT = 3;
function updateHomes(dt) {
  bedT -= dt; if (bedT > 0) return; bedT = 6;
  const w = G.world, beds = [];
  for (let k = 0; k < w.ids.length; k++) { const id = w.ids[k]; if (id && B[id].bed) beds.push([k % WW, Math.floor(k / (WW * DD)), Math.floor(k / WW) % DD]); }
  const owned = new Set(G.residents.filter((r) => r.home).map((r) => r.home.join(',')));
  for (const r of G.residents) if (r.home) { const id = w.get(...r.home); if (!id || !B[id].bed) { r.home = null; } }
  const homeless = G.residents.filter((r) => !r.home);
  G.houseless = homeless.length;
  for (const b of beds) {
    if (owned.has(b.join(',')) || !homeless.length) continue;
    if (!isHouse(w, ...b)) continue;
    const r = homeless.shift(); r.home = b; owned.add(b.join(','));
    UI.news(`🏠 ${r.name}が あたらしい おうちに ひっこした！`); r.say('わーい！ じぶんの おうちだ！', 4); r.addExp(30, G); UI.effect('heart', r);
  }
}
G.findNear = (p, pred, R) => { let best = null, bd = 1e9; const fx = Math.floor(p.x), fy = Math.floor(p.y), fz = Math.floor(p.z); for (let y = fy - 2; y <= fy + 2; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) { const id = G.world.get(x, y, z); if (id && pred(B[id])) { const d = (x - fx) ** 2 + (z - fz) ** 2; if (d < bd && !G.residents.some((r) => r.state === 'sit' && Math.floor(r.p.x) === x && Math.floor(r.p.z) === z)) { bd = d; best = [x, y, z]; } } } return best; };
G.findWaterEdge = (p, R, adjOnly) => { const fx = Math.floor(p.x), fy = Math.floor(p.y), fz = Math.floor(p.z); for (let i = 0; i < 40; i++) { const x = fx + Math.floor((Math.random() - 0.5) * R * 2), z = fz + Math.floor((Math.random() - 0.5) * R * 2); for (let y = fy - 4; y <= fy + 3; y++) { const id = G.world.get(x, y, z); if (id === ID.water && G.world.get(x, y + 1, z) === 0) { if (adjOnly) return [x, y, z]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (standable(G.world, x + dx, y + 1, z + dz)) return [x + dx, y + 1, z + dz]; } } } return null; };
G.findUse = (p, R, kinds) => {
  const px = Array.isArray(p) ? p[0] : p.x, py = Array.isArray(p) ? p[1] : p.y, pz = Array.isArray(p) ? p[2] : p.z;
  const fx = Math.floor(px), fy = Math.floor(py), fz = Math.floor(pz), out = [];
  for (let y = fy - 4; y <= fy + 4; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) { const id = G.world.get(x, y, z); if (!id) continue; const k = USE[B[id].model]; if (k && (!kinds || kinds.includes(k))) out.push([x, y, z, k]); }
  return out.length ? out[Math.floor(Math.random() * out.length)] : null;
};
G.findShelter = findShelter; G.roofed = roofed;
G.flowerIds = B.filter((b) => b.cat === 'plant' && b.shape === 'cross' && !b.name.includes('なえぎ') && !['くさむら', 'シダ', 'かれき', 'すすき', 'さとうきび', 'タケノコ', 'あかいきのこ', 'ちゃいろのきのこ'].includes(b.name)).map((b) => b.id);

// ---------- 住人とペットの追加
G.addResident = (f, drawingCanvas, data) => {
  const r = new Resident(f, data); r.drawingCanvas = drawingCanvas || null; if (drawingCanvas) r.ch.setDrawing(drawingCanvas);
  if (!data) { r.p.x = G.center.x + (Math.random() - 0.5) * 6; r.p.z = G.center.z + 3 + Math.random() * 3; r.p.y = G.world.top(Math.floor(r.p.x), Math.floor(r.p.z)) + 1.1; }
  scene.add(r.obj); G.residents.push(r); return r;
};
G.rebuildResident = (r) => { r._draw = undefined; scene.remove(r.obj); r.ch.dispose(); r.ch = new (r.ch.constructor)(r.f); r.obj = r.ch.root; if (r.drawingCanvas) r.ch.setDrawing(r.drawingCanvas); scene.add(r.obj); };
G.addPet = (data, canvas) => { const p = new Pet(data, canvas); scene.add(p.obj); G.pets.push(p); return p; };
G.setMe = (r) => { if (G.me) G.me.controlled = false; G.me = r; G.watch = null; if (r) { r.controlled = true; r.state = 'idle'; r.path = null; G.yaw = r.yaw + Math.PI; } UI.updateHUD(); };
G.setWatch = (r) => { if (G.me) { G.me.controlled = false; G.me = null; } G.watch = r; G.freePos = r.obj.position.clone(); UI.updateHUD(); };
G.watchPrompt = (r, title, sec = 15) => { const fav = r && (G.fav || []).includes(r.uid); if (fav) { title = '⭐ ' + title; sec += 6; } if (!r || !G.me || UI.isModal() || performance.now() - (G.lastBuild || 0) < (fav ? 4000 : 6000) || G.watchTemp) return; if (G.mini) return; UI.watchPrompt(title, () => { G.cine = true; G.watchTemp = { back: G.me, t: sec }; G.setWatch(r); G.dist = 5; G.pitch = -0.25; }); };
G.ask = (r, cb) => UI.askQuiz(r, cb);
G.endWatch = () => { G.cinePair = null; if (!G.watchTemp) return; const b = G.watchTemp.back; G.watchTemp = null; G.cine = false; G.setMe(b); };
G.zukan = {};
G.discover = (name, e, how) => { if (G.zukan[name]) { UI.news(`${e} ${name}（${how}）`); return; } G.zukan[name] = { e, d: G.day, how }; UI.news(`📖 ずかんに「${e} ${name}」が のった！`); SFX.ok(); dispT = 0;
  if (['ダイヤ', 'すいしょう', 'ヒスイ'].includes(name)) { const left = [...Array(20).keys()].filter((i) => i && !G.bag.hats.includes(i)); left.sort(() => Math.random() - 0.5).slice(0, 2).forEach((i) => G.bag.hats.push(i)); setTimeout(() => UI.news(`💎 ${name}で アクセサリーを つくった！（ぼうしが ふえたよ）`), 1500); }
  if (['きょうりゅうの ほね', 'アンモナイト', 'キバ'].includes(name)) setTimeout(() => UI.news('🏛️「はくぶつかんの てんじだい」に かざれるよ'), 1500);
  if (['チョウ', 'ハチ', 'テントウムシ', 'ホタル'].includes(name)) setTimeout(() => UI.news('🦗「むしかご」を おくと かえるよ'), 1500);
  if (['さかな', 'ねったいぎょ', 'カニ', 'タコ'].includes(name)) setTimeout(() => UI.news('🐠 すいそうを おくと およぐよ'), 1500);
  if (['にじいろのはな', 'つきみそう'].includes(name)) setTimeout(() => UI.news(`🌱 ${name}の たねを ゲット！「はな」から うえられるよ`), 1500); const r = Math.random(); if (r < 0.6) { const i = Math.floor(Math.random() * 20); G.bag.food[i] = (G.bag.food[i] || 0) + 1; } else G.bag.eggs++; };
// てんじ・すいそう・むしかごに みつけた ものを かざる
const disp = new Map(); let dispT = 1; G._disp = disp;
const coneGeo = new THREE.ConeGeometry(0.75, 1.9, 20, 1, true); const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function labelSprite(name, d) { const c = document.createElement('canvas'); c.width = 256; c.height = 80; const g = c.getContext('2d'); g.fillStyle = '#5a3a22'; g.fillRect(4, 4, 248, 72); g.fillStyle = '#fff6dc'; g.fillRect(10, 10, 236, 60); g.fillStyle = '#3a2f3d'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(name, 128, 40); g.font = '17px sans-serif'; g.fillStyle = '#8a6a50'; g.fillText(`${d}にちめに はっけん`, 128, 62); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(0.8, 0.25, 1); s.position.set(0, 0.62, 0.62); s.renderOrder = 6; s.userData.fixed = true; return s; }
// ながれぼし
const stars = []; let starT = 0;
function updateStars(dt) {
  if (!(G.shootStar > 0)) { stars.forEach((s) => (s.visible = false)); return; } G.shootStar -= dt; starT -= dt;
  if (starT <= 0) { starT = 0.6 + Math.random() * 1.2; let s = stars.find((q) => !q.visible); if (!s && stars.length < 5) { s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 9), new THREE.MeshBasicMaterial({ color: 0xfff8d0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(s); stars.push(s); } if (s) { const a = Math.random() * 6.28; s.position.set(cam.position.x + Math.cos(a) * 70, cam.position.y + 35 + Math.random() * 15, cam.position.z + Math.sin(a) * 70); s.userData.v = new THREE.Vector3(Math.random() - 0.5, -0.35, Math.random() - 0.5).normalize().multiplyScalar(60); s.lookAt(s.position.clone().add(s.userData.v)); s.userData.life = 0.9; s.visible = true; } }
  for (const s of stars) if (s.visible) { s.position.addScaledVector(s.userData.v, dt); s.userData.life -= dt; s.material.opacity = Math.max(0, s.userData.life); if (s.userData.life <= 0) s.visible = false; }
}
function updateDisplays(dt) {
  dispT -= dt; const z = G.zukan;
  if (dispT <= 0) { dispT = 3; const f = G.me ? G.me.p : G.freePos; if (!f) return; const seen = new Set(); const R = 14;
    for (let y = Math.floor(f.y) - 4; y <= Math.floor(f.y) + 6; y++) for (let zz = Math.floor(f.z) - R; zz <= Math.floor(f.z) + R; zz++) for (let x = Math.floor(f.x) - R; x <= Math.floor(f.x) + R; x++) {
      const id = G.world.get(x, y, zz); if (!id) continue; const m = B[id].model; if (!['display', 'bugcage', 'aquarium', 'bigtank'].includes(m)) continue;
      const key = x + ',' + y + ',' + zz; seen.add(key); if (disp.has(key)) continue;
      const pool = m === 'display' ? ['きょうりゅうの ほね', 'アンモナイト', 'キバ', 'ダイヤ', 'すいしょう', 'ヒスイ', 'おうかん', 'きんか', 'ふしぎな かぎ'] : m === 'bugcage' ? ['チョウ', 'ハチ', 'テントウムシ', 'ホタル'] : ['さかな', 'ねったいぎょ', 'カニ', 'タコ'];
      const got = pool.filter((n) => z[n]); if (!got.length) continue;
      const grp = new THREE.Group(); grp.position.set(x + 0.5, y, zz + 0.5); grp.userData = { m, t: Math.random() * 6 };
      const n = m === 'display' ? 1 : Math.min(3, got.length); for (let i = 0; i < n; i++) { const nm = got[(Math.abs(x * 7 + zz * 13) + i) % got.length]; const e = z[nm].e; const sp = sprite(e, m === 'display' ? 0.6 : 0.32); sp.renderOrder = 5; grp.add(sp); if (m === 'display') { grp.add(labelSprite(nm, z[nm].d)); const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.y = 2.1; cone.renderOrder = 4; grp.add(cone); } }
      scene.add(grp); disp.set(key, grp); }
    for (const [k, g] of disp) if (!seen.has(k)) { scene.remove(g); disp.delete(k); } }
  for (const g of disp.values()) { const u = g.userData; u.t += dt; g.children.forEach((sp, i) => { if (sp.userData.fixed) return; if (u.m === 'display') sp.position.set(0, 1.25 + Math.sin(u.t) * 0.04, 0); else if (u.m === 'bugcage') sp.position.set(Math.sin(u.t * 2 + i * 2) * 0.25, 0.5 + Math.sin(u.t * 5 + i) * 0.15, Math.cos(u.t * 1.6 + i) * 0.25); else sp.position.set(Math.sin(u.t * 0.8 + i * 2) * 0.35, (u.m === 'bigtank' ? 0.9 : 0.75) + Math.sin(u.t * 1.3 + i) * 0.12, Math.cos(u.t * 0.6 + i) * 0.15); }); }
}
let secretT = 5; const secretFlowers = [];
function updateSecrets(dt) {
  secretT -= dt; if (secretT > 0) return; secretT = 8;
  const w = G.world, f = G.me ? G.me.p : G.freePos; if (!f) return;
  const wet = G.weather && G.weather.k === 'rain', night = (G.nightF || 0) > 0.7;
  for (let i = secretFlowers.length - 1; i >= 0; i--) { const [x, y, z, id] = secretFlowers[i]; if ((id === ID.rainbowFlower && !wet) || (id === ID.moonFlower && !night)) { if (w.get(x, y, z) === id) w.set(x, y, z, 0); secretFlowers.splice(i, 1); } }
  for (const [want, id] of [[wet, ID.rainbowFlower], [night, ID.moonFlower]]) { if (!want || secretFlowers.filter((s) => s[3] === id).length >= 3) continue; for (let k = 0; k < 15; k++) { const x = Math.floor(f.x + (Math.random() - 0.5) * 30), z = Math.floor(f.z + (Math.random() - 0.5) * 30), y = w.top(x, z); if (y > 0 && B[w.get(x, y, z)].tint === 'grass' && !w.get(x, y + 1, z)) { w.set(x, y + 1, z, id); secretFlowers.push([x, y + 1, z, id]); break; } } }
  if (w.cave && G.me && Math.hypot(G.me.p.x - w.cave[0], G.me.p.z - w.cave[2]) < 5 && Math.abs(G.me.p.y - w.cave[1]) < 4) G.discover('ひかるどうくつ', '🕯️', 'やまの なかで みつけた');
  if (G.rainbow > 0 && G.me) G.discover('にじ', '🌈', 'あめあがりに みた');
}
G.startParty = () => { G.party = { x: G.center.x, y: 23, z: G.center.z, t: 40 }; for (const r of G.residents) { if (!r.controlled && r.state !== 'mini') { r.state = 'idle'; r.timer = 0; } } UI.news('🎆 パーティーが はじまった！ みんな ひろばへ！'); };
G.rebuildDoors = () => { for (const k of [...doors.keys()]) removeDoor(k); for (const k of G.world.doors.keys()) addDoor(k); };

// ---------- 保存
G.save = async (quiet) => {
  const data = {
    v: 1, time: G.time, artWk: G.artWk ?? null, arts: G.arts || {}, gallery: G.gallery || [], placed: G.placed || {}, fav: G.fav || [], isleStats: G.isleStats || [], islandName: G.islandName || null, signAt: G.signAt || null, goals: G.goals || null, coins: G.coins || 0, tutStep: G.tutStep ?? null, money: G.money || 0, owned: G.owned || {}, shopAt: G.shopAt || null, unlock: G.unlock || {}, epis: G.epis || [], epiStart: G.epiStart || 0, miniLv: G.miniLv || {}, cnt: G.cnt || null, wkDone: Object.fromEntries(Object.entries(G.wkDone || {}).slice(-30)), mail: G.mail || [], mailDay: G.mailDay || 0, stamps: G.stamps || {}, real: new Date().toDateString(), recent: G.recent || [], zukan: G.zukan, cave: G.world.cave || null, album: G.album, places: G.placeSeen || {}, world: G.world.serialize(), bag: G.bag, stats: G.stats, settings: G.settings, hotbar: G.hotbar, me: G.me ? G.me.uid : null, newsLog: G.newsLog.slice(-60),
    residents: G.residents.map((r) => ({ f: r.f, d: r.toJSON(), draw: r._draw !== undefined ? r._draw : (r._draw = r.drawingCanvas && !blank(r.drawingCanvas) ? r.drawingCanvas.toDataURL('image/png') : null) })),
    pets: G.pets.map((p) => ({ d: p.toJSON(), draw: p._draw || (p._draw = p.canvas.toDataURL('image/png')) })),
  };
  const ok = await saveGame(data); if (!quiet) UI.news(ok ? '💾 セーブしたよ' : '⚠️ セーブできなかった'); return ok;
};
function blank(cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 64) if (d[i]) return false; return true; }
const imgToCanvas = (url, S = 1024) => new Promise((res) => { const c = document.createElement('canvas'); c.width = c.height = S; if (!url) return res(c); const im = new Image(); im.onload = () => { c.getContext('2d').drawImage(im, 0, 0, S, S); res(c); }; im.onerror = () => res(c); im.src = url; });
G.imgToCanvas = imgToCanvas;

// おかねは「せかいを しる」と おなじ えん（1つの さいふ・かぞくで おなじ・おうちの ひとが げんきんに かえられる）
{ let cv = 0, ct = 0; Object.defineProperty(G, 'money', { configurable: true, enumerable: true,
  get() { if (Date.now() - ct > 700) { try { cv = sekaiWallet().yen; } catch (e) {} ct = Date.now(); } return cv; },
  set(v) { const d = Math.round((+v || 0) - this.money); if (d > 0) sekaiEarn(d); else if (d < 0) sekaiSpend(-d, 'ひだまりの島：かいもの'); ct = 0; } }); }
async function startGame(data) {
  try { await Promise.all([preloadAll(''), loadKenney(''), loadVoices(''), preloadIcons(), loadMotions('')]); } catch (e) { console.warn(e); }
  G.world = new World();
  G.world.onDoor = (op, k) => (op === 'add' ? addDoor(k) : removeDoor(k));
  if (data) {
    G.world.deserialize(data.world); G.time = data.time || 8; Object.assign(G.bag, data.bag || {}); G.stats = data.stats || {}; Object.assign(G.settings, data.settings || {}); if (data.hotbar) G.hotbar = data.hotbar; G.newsLog = data.newsLog || []; G.recent = data.recent || []; G.album = data.album || []; G.zukan = data.zukan || {}; if (data.cave) G.world.cave = data.cave; G.placeSeen = data.places || {}; G.artWk = data.artWk ?? null; G.arts = data.arts || {}; G.gallery = data.gallery || []; G.placed = data.placed || {}; G.fav = data.fav || []; G.isleStats = data.isleStats || []; G.islandName = data.islandName || null; G.signAt = data.signAt || null; G.mail = data.mail || []; G.mailDay = data.mailDay || 0; G.goals = data.goals || null; G.coins = data.coins || 0;  G.owned = data.owned || {}; G.shopAt = data.shopAt || null; for (const it of G.hotbar || []) if (it && it.type === 'block' && B[it.id]) G.owned[B[it.id].fam] = 1; G.unlock = data.unlock || {}; G.epis = data.epis || []; G.epiStart = data.epiStart || 0; G.miniLv = data.miniLv || {}; G.cnt = data.cnt || null; G.wkDone = data.wkDone || {}; G.stamps = data.stamps || {}; G.dayDone = { ['a' + (Math.floor(G.time / 24) + 1)]: 1 };
    for (const r of data.residents || []) { const cv = await imgToCanvas(r.draw); G.addResident(r.f, cv, r.d); }
    for (const p of data.pets || []) { const cv = await imgToCanvas(p.draw); G.addPet(p.d, cv); }
    const me = G.residents.find((r) => r.uid === data.me); if (me) G.setMe(me);
  } else { generate(G.world); G.time = 8; G.owned = {}; }
  if (!G.hotbar.length) G.hotbar = UI.defaultHotbar();
  rebuildAll(); G.rebuildDoors();
  G.freePos = new THREE.Vector3(G.center.x, 34, G.center.z + 18);
  if (/lite/.test(location.search)) G.settings.shadow = false;
  SFX.on = G.settings.sound; SFX.vol.se = G.settings.vol_se ?? 1; SFX.vol.voice = G.settings.vol_voice ?? 1; window.__voiceVol = SFX.vol.voice; SFX.vol.bgm = G.settings.vol_bgm ?? 0.6; G.placeSign(true); renderer.shadowMap.enabled = G.settings.shadow; sun.castShadow = G.settings.shadow;
  makeShop(); G.payReward = UI.payReward; if (data && data.tutStep != null && G.me) setTimeout(() => UI.tutorial(data.tutStep), 2500);
  UI.initHUD(G); UI.drawHotbar(); UI.updateHUD();
  G.started = true;
  if (!G.residents.length) UI.firstRun();
  if (data && data._restored) setTimeout(() => UI.news('🛟 まえの セーブから しまを ふっかつ したよ'), 2500);
  else if (data && data.real !== new Date().toDateString()) setTimeout(() => mailTick(G, true), 4000);
  UI.updateMail && UI.updateMail();
  setInterval(() => G.save(true), 60000);
  addEventListener('visibilitychange', () => { if (document.hidden) G.save(true); });
}
// ---------- まちの おみせ（やたい）
let shopObj = null;
function makeShop() {
  const w = G.world, c = G.center;
  if (!G.shopAt) {
    const gy = w.top(Math.floor(c.x), Math.floor(c.z));
    const ok = (x, z) => { for (let i = -2; i <= 2; i++) for (let j = -1; j <= 2; j++) { const t = w.top(x + i, z + j); if (t !== gy || !B[w.get(x + i, t, z + j)].solid) return false; } return true; };
    outer: for (let r = 9; r <= 18; r++) for (let a = 0; a < 16; a++) { const an = 0.4 + a / 16 * Math.PI * 2; const x = Math.floor(c.x + Math.cos(an) * r), z = Math.floor(c.z + Math.sin(an) * r); if (ok(x, z)) { G.shopAt = [x, gy + 1, z]; break outer; } }
    if (!G.shopAt) G.shopAt = [Math.floor(c.x) + 9, gy + 1, Math.floor(c.z) - 6];
  }
  const [x, y, z] = G.shopAt; const g = new THREE.Group(); g.position.set(x + 0.5, y, z + 0.5);
  g.rotation.y = Math.atan2(c.x - x, c.z - z);
  const wood = new THREE.MeshLambertMaterial({ color: 0xc89a6a }), wood2 = new THREE.MeshLambertMaterial({ color: 0xf6e3c6 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.9), wood2); counter.position.set(0, 0.52, 0.6); g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.1), wood); top.position.set(0, 1.08, 0.6); g.add(top);
  for (const sx of [-1.55, 1.55]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.9, 0.16), wood); p.position.set(sx, 1.45, 0.95); g.add(p); const p2 = p.clone(); p2.position.z = -0.6; g.add(p2); }
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16; const cx = cv.getContext('2d'); for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#fff7f0' : '#ff8fb1'; cx.fillRect(i * 16, 0, 16, 16); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const aw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.0), new THREE.MeshLambertMaterial({ map: tex })); aw.position.set(0, 2.95, 0.25); aw.rotation.x = -0.22; g.add(aw);
  const goods = ['🍎', '🪴', '🛋️', '🧱', '🎀']; goods.forEach((e, i) => { const s = sprite(e, 0.55); s.position.set(-1.2 + i * 0.6, 1.42, 0.62); g.add(s); });
  const sign = sprite('🏪', 1.1); sign.position.set(0, 3.7, 1.0); g.add(sign);
  const keeper = sprite('🐷', 1.1); keeper.position.set(0, 1.55, -0.15); keeper.userData.keeper = true; g.add(keeper);
  const lbl = UI.labelSprite ? UI.labelSprite('おみせ') : null; if (lbl) { lbl.position.set(0, 4.4, 1.0); g.add(lbl); }
  scene.add(g); shopObj = g;
}
G.shopTick = (t) => { if (!shopObj) return; const k = shopObj.children.find((o) => o.userData.keeper); if (k) k.position.y = 1.55 + Math.abs(Math.sin(t * 2.2)) * 0.12; };
G.setShadow = (v) => { G.settings.shadow = v; renderer.shadowMap.enabled = v; sun.castShadow = v; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };

// ---------- しゃしん（だいじな できごとを アルバムに）
G.album = []; G.photoQ = [];
const keep = (a) => a.mine || a.island || a.rare || a.star || /たんじょうび|しんゆう|ゆめ|なかなおり|おえかき/.test(a.t || '');
G.albumTrim = () => { const MAX = 80; while (G.album.length > MAX) { const i = G.album.findIndex((a) => !keep(a)); if (i < 0) break; G.album.splice(i, 1); } if (G.album.length > MAX && !G._albWarn) { G._albWarn = 1; UI.news('📸 アルバムが いっぱい！ だいじな しゃしんは のこしてあるよ（☆を はずすと せいりできる）'); } if (G.album.length > 140) G.album.splice(G.album.findIndex((a) => !a.star && !a.mine), 1); }; G.arts = {}; G.gallery = [];
G.photo = (subs, title, tag) => { if (!G.started) return; G.photoQ.push({ subs: subs.filter(Boolean), title, tag }); };
const pcam = new THREE.PerspectiveCamera(45, 1.5, 0.1, 120);
function takePhoto() {
  const q = G.photoQ.shift(); if (!q || !q.subs.length) return;
  const c = new THREE.Vector3(); q.subs.forEach((r) => c.add(r.obj.position)); c.divideScalar(q.subs.length); c.y += 0.9;
  const a = q.subs[0].yaw, spread = Math.max(...q.subs.map((r) => r.obj.position.distanceTo(q.subs[0].obj.position)));
  const dist = 1.7 + spread * 0.75;
  let best = null;
  for (let k = 0; k < 12; k++) { const aa = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6); const dir = new THREE.Vector3(Math.sin(aa), 0.22, Math.cos(aa)).normalize(); const hit = G.world.raycast(c, dir, dist + 0.3, true); const free = hit ? hit.t - 0.3 : dist; if (!best || free > best.free + 0.4) best = { dir, free }; if (free >= dist) break; }
  if (best.free < 1.1) { q.subs.forEach((r) => (r.obj.rotation.y = r.obj.rotation.y)); G.photoQ.push(q); q.tries = (q.tries || 0) + 1; if (q.tries > 3) G.photoQ.pop(); return; }
  const dd = Math.max(1.2, Math.min(dist, best.free));
  pcam.position.copy(c).addScaledVector(best.dir, dd); pcam.lookAt(c);
  q.subs.forEach((r) => (r.obj.rotation.y = Math.atan2(pcam.position.x - r.obj.position.x, pcam.position.z - r.obj.position.z)));
  q.subs.forEach((r) => { r.ch.setExpr('happy'); });
  const rots = q.subs.map((r) => r.obj.rotation.y);
  const vis = G.me ? G.me.obj.visible : true; if (G.me && !q.subs.includes(G.me)) G.me.obj.visible = q.subs.includes(G.me);
  const hl = hl0.visible; hl0.visible = false; rain.visible = false;
  renderer.setSize(640, 440, false); pcam.aspect = 640 / 440; pcam.updateProjectionMatrix(); renderer.render(scene, pcam); hl0.visible = hl;
  q.subs.forEach((r, i) => (r.obj.rotation.y = rots[i]));
  const cv = document.createElement('canvas'); cv.width = 680; cv.height = 540; const g = cv.getContext('2d');
  g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 680, 540); g.drawImage(renderer.domElement, 20, 20, 640, 440);
  g.fillStyle = '#3a2f3d'; g.font = 'bold 26px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; g.fillText(q.title.slice(0, 24), 340, 500);
  g.font = '16px "M PLUS Rounded 1c", sans-serif'; g.fillStyle = '#9a8a80'; g.fillText(`${G.day}にちめ・${q.subs.map((r) => r.name).join('・').slice(0, 30)}`, 340, 528);
  renderer.setSize(innerWidth, innerHeight); if (G.me) G.me.obj.visible = vis;
  G.album.push({ d: G.day, t: q.title, uids: q.subs.map((r) => r.uid), ...(q.tag || {}), img: cv.toDataURL('image/jpeg', 0.72) }); G.albumTrim();
  G._phN = (G._phN || 0) + 1; G._phT = q.title; clearTimeout(G._phTm); G._phTm = setTimeout(() => { UI.news(G._phN > 1 ? `📸 しゃしんが ${G._phN}まい ふえたよ（アルバム）` : '📸 しゃしんを とったよ：' + G._phT); G._phN = 0; }, 2500); G.count('photo');
}

// ---------- めずらしい できごと
let rare = null;
G.rareView = () => { const c = G.center; const k = rare && rare.R.k; return k === 'whale' ? [Math.floor(c.x), 23, Math.floor(c.z) + 14, c.x, c.z + 60] : [Math.floor(c.x), 23, Math.floor(c.z) + 2, c.x - 20, c.z - 10]; };
G.spawnRare = (R) => { if (rare) scene.remove(rare.s); const s = sprite(R.e, R.k === 'whale' ? 6 : R.k === 'balloon' ? 4 : 0.6); s.renderOrder = 5; scene.add(s); const c = G.center; rare = { s, R, t: 0, c: [c.x, c.z] }; };
function updateRare(dt) { if (!rare) return; const r = rare; r.t += dt; const [cx, cz] = r.c; if (r.R.k === 'whale') r.s.position.set(cx - 70 + r.t * 1.2, 19.5 + Math.abs(Math.sin(r.t * 0.8)) * 1.5, cz + 58); else if (r.R.k === 'balloon') r.s.position.set(cx - 60 + r.t * 1.5, 45 + Math.sin(r.t * 0.3) * 3, cz - 10); else { const f = G.me ? G.me.p : { x: cx, y: 24, z: cz }; r.s.position.set(cx + Math.sin(r.t * 0.5) * 8, 24.5 + Math.sin(r.t * 2) * 0.6, cz + Math.cos(r.t * 0.4) * 8); if (G.me && r.s.position.distanceTo(G.me.obj.position) < 2.2) { G.discover('にじいろの ちょうちょ', '🦋', 'めずらしい ひに つかまえた'); scene.remove(r.s); rare = null; return; } } if (r.t > 100) { scene.remove(r.s); rare = null; } }

// ---------- えを かざる（がくぶち・はた・クッション・Tシャツかけ・かんばん）
const artM = new Map(); let artT = 0; const texCache = new Map();
const ART = { artframe: [[0.5, 0.59, 0.925], [0, 0, -1], 0.72, 0.68], artflag: [[0.765, 1.43, 0.47], [0, 0, -1], 0.46, 0.62, true], artcushion: [[0.5, 0.26, 0.5], [0, 1, 0], 0.72, 0.72], artshirt: [[0.5, 1.05, 0.43], [0, 0, -1], 0.6, 0.6], sign: [[0.5, 1.07, 0.43], [0, 0, -1], 0.85, 0.6] };
function artTex(url) { if (!texCache.has(url)) { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; texCache.set(url, t); } return texCache.get(url); }
G.refreshArts = () => { artT = 0; };
function updateArts(dt) {
  artT -= dt; if (artT > 0) return; artT = 2.5; const A = G.arts || {}; const seen = new Set();
  for (const k in A) { const [x, y, z] = k.split(',').map(Number); const id = G.world.get(x, y, z); const d = id && B[id]; const def = d && ART[d.model]; if (!def) { delete A[k]; continue; } seen.add(k); const url = A[k]; const old = artM.get(k); if (old && old.userData.url === url) continue; if (old) { scene.remove(old); artM.delete(k); }
    const rot = G.world.meta(x, y, z) & 3; const rp = (p) => { let [a, b, c] = p; for (let i = 0; i < rot; i++) { const na = 1 - c, nc = a; a = na; c = nc; } return [a, b, c]; }; const rn = (n) => { let [a, b, c] = n; for (let i = 0; i < rot; i++) { const na = -c, nc = a; a = na; c = nc; } return [a, b, c]; };
    const [px, py, pz] = rp(def[0]); const nrm = rn(def[1]); const m = new THREE.Mesh(new THREE.PlaneGeometry(def[2], def[3]), new THREE.MeshLambertMaterial({ map: artTex(url), transparent: true, side: def[4] ? THREE.DoubleSide : THREE.FrontSide }));
    m.position.set(x + px + nrm[0] * 0.012, y + py + nrm[1] * 0.012, z + pz + nrm[2] * 0.012); m.lookAt(m.position.x + nrm[0], m.position.y + nrm[1], m.position.z + nrm[2]); m.userData.url = url; scene.add(m); artM.set(k, m); }
  for (const [k, m] of artM) if (!seen.has(k)) { scene.remove(m); artM.delete(k); }
}
G.artBlocksNear = (p, R = 8) => { const out = []; const fx = Math.floor(p.x), fy = Math.floor(p.y), fz = Math.floor(p.z); for (let y = fy - 3; y <= fy + 4; y++) for (let z = fz - R; z <= fz + R; z++) for (let x = fx - R; x <= fx + R; x++) { const id = G.world.get(x, y, z); if (id && ART[B[id].model]) out.push({ key: x + ',' + y + ',' + z, name: B[id].name, d: Math.hypot(x - fx, z - fz) }); } return out.sort((a, b) => a.d - b.d).slice(0, 8); };

// ---------- しまの なまえ・かんばん・きねんしゃしん
let signSp = null;
G.placeSign = (onlyLabel) => {
  if (!G.islandName) return; const w = G.world;
  if (!onlyLabel && (!G.signAt || B[w.get(...G.signAt)]?.model !== 'sign')) { const sid = B.find((d) => d && d.model === 'sign').id; const cx = Math.floor(G.center.x), cz = Math.floor(G.center.z); let at = null; for (let r = 7; r < 14 && !at; r++) for (const [dx, dz] of [[0, r], [r, 0], [0, -r], [-r, 0]]) { const x = cx + dx, z = cz + dz, y = w.top(x, z) + 1; if (!w.get(x, y, z) && standable(w, x, y, z) && !G.roofed(G, x + 0.5, y, z + 0.5)) { at = [x, y, z]; break; } } if (at) { w.set(...at, sid, dz0(at)); G.signAt = at; } }
  if (signSp) { scene.remove(signSp); signSp = null; } if (!G.signAt) return;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#8a5a32'; g.beginPath(); g.roundRect(4, 4, 504, 120, 26); g.fill(); g.fillStyle = '#fff3d6'; g.beginPath(); g.roundRect(14, 14, 484, 100, 20); g.fill(); g.fillStyle = '#3a2f3d'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏝️ ' + G.islandName, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; signSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); signSp.scale.set(3.2, 0.8, 1); signSp.position.set(G.signAt[0] + 0.5, G.signAt[1] + 2.1, G.signAt[2] + 0.5); signSp.renderOrder = 6; scene.add(signSp);
};
const dz0 = (at) => { const dx = G.center.x - at[0], dz = G.center.z - at[2]; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 3 : 1) : (dz > 0 ? 0 : 2); };
G.shoot = (W = 1200, H = 800) => { const vis = hl0.visible; hl0.visible = false; ghost.visible = false; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); renderer.render(scene, cam); const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(renderer.domElement, 0, 0); renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); hl0.visible = vis; return c; };
G.islandPhoto = (title) => {
  const c = new THREE.Vector3(G.center.x, 20, G.center.z); const pc = new THREE.PerspectiveCamera(50, 640 / 440, 0.5, 400); pc.position.set(c.x - 42, 66, c.z + 58); pc.lookAt(c.x, 18, c.z - 4);
  const hl = hl0.visible; hl0.visible = false; rain.visible = false;
  renderer.setSize(640, 440, false); renderer.render(scene, pc); hl0.visible = hl;
  const cv = document.createElement('canvas'); cv.width = 680; cv.height = 540; const g = cv.getContext('2d'); g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 680, 540); g.drawImage(renderer.domElement, 20, 20, 640, 440);
  g.fillStyle = '#3a2f3d'; g.font = 'bold 26px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; g.fillText(('🏝️ ' + title).slice(0, 26), 340, 500); g.font = '16px sans-serif'; g.fillStyle = '#9a8a80'; g.fillText(`${G.day}にちめ・なかま ${G.residents.length}にん`, 340, 528);
  renderer.setSize(innerWidth, innerHeight);
  G.album.push({ d: G.day, t: title, uids: [], island: true, img: cv.toDataURL('image/jpeg', 0.75) }); G.albumTrim();
  UI.news('📸 しまの きねんしゃしんを とったよ'); G.count('photo');
};
function islandAuto() { if (G.hour >= 12 && G.hour < 13 && (G.day - 1) % 7 === 6 && G.isleDay !== G.day) { G.isleDay = G.day; G.islandPhoto(`${G.islandName || 'しま'} ${Math.ceil(G.day / 7)}しゅうめ`); islandReport(G); } }

// ---------- ループ
const clock = new THREE.Clock(); let t = 0, fpsT = 0, fpsN = 0, slow = 0;
function loop() {
  requestAnimationFrame(loop);
  if (G.pauseRender) return;
  const dt = Math.min(0.05, clock.getDelta()); t += dt; windU.value = t;
  if (!G.started) { renderer.render(scene, cam); return; }
  // 汚れたチャンクを作り直す
  let n = 0; for (const k of G.world.dirty) { const [cx, cz] = k.split(',').map(Number); rebuildChunk(cx, cz); G.world.dirty.delete(k); if (++n >= 3) break; }
  if (!UI.isModal() || UI.modalKeepsWorld()) {
    if (!UI.isModal() && !G.intro) controlMe(dt);
    for (const r of G.residents) r.update(dt, G);
    if (G.me) G.me.physics && null;
    for (const r of G.residents) r.sync(t, dt);
    for (const p of G.pets) p.update(dt, G, cam);
    if (G.party) { G.party.t -= dt; if (Math.random() < dt * 2.5) UI.firework(G.party); if (G.party.t <= 0) { G.party = null; UI.news('🎉 パーティー おしまい！ たのしかったね'); } }
    updateDoors(dt); updateHomes(dt); eventsTick(G, dt); dramaTick(G, dt); placesTick(G, dt); placeLifeTick(G, dt); dreamsTick(G, dt); weatherTick(G, dt); consultTick(G, dt); updateWeather(dt); updateSecrets(dt); updateDisplays(dt); mailTick(G); dailyTick(G, dt, gather); inviteTick(G, dt, () => UI.isModal()); updateStars(dt); islandAuto(); updateArts(dt); goalsTick(G); weekTick(G, dt); episodeTick(G, dt); kindTick(G, dt); playTick(G, dt); nightTick(G, dt); artTick(G, dt); weeklyArt(G); rareTick(G); bestieTick(G, dt); idleTick(G, dt); petTick(G, dt); appearDecay(G); updateRare(dt); SFX.bgm(G.settings.sound && (G.nightF || 0) > 0.6 ? 'night' : G.settings.bgmDay ? 'day' : null);
    updateDay(dt, G.me ? G.me.obj.position : G.watch ? G.watch.obj.position : G.freePos);
    clouds.children.forEach((c) => { c.position.x += dt * 0.6; if (c.position.x > 190) c.position.x = -70; });
    updateCritters(dt);
  }
  if (G.holdAct) { G.holdAct.t -= dt; if (G.holdAct.t <= 0) { G.holdAct.t = 0.16; if (!UI.isModal()) G.holdAct.f(); } }
  if (G.photoQ.length) takePhoto();
  if (G.watchTemp) { G.watchTemp.t -= dt; if (G.watchTemp.t <= 0) G.endWatch(); }
  { const f = G.me ? G.me.obj.position : G.watch ? G.watch.obj.position : null; const auto = G.watch && roofed(G, G.watch.p.x, G.watch.p.y, G.watch.p.z); cutPlane.constant = (G.cutaway || auto) && f ? f.y + 2.7 : 999; if (auto) { G.dist += (4.2 - G.dist) * Math.min(1, dt * 2); G.pitch += (-0.9 - G.pitch) * Math.min(1, dt * 2); } }
  tutRingTick(t); G.shopTick(t); updateCamera(dt); updateTarget(); if (G.photoMode) { hl0.visible = false; ghost.visible = false; selBox.visible = false; } UI.frame(dt, t, targetRes, target);
  renderer.render(scene, cam);
  fpsT += dt; fpsN++; if (fpsT > 3) { const fps = fpsN / fpsT; fpsT = fpsN = 0; if (fps < 24 && G.settings.shadow && ++slow > 2) { G.setShadow(false); UI.news('かるくするため かげを オフにしたよ'); } else if (fps < 22 && !G.settings.shadow && !G.lowRes && ++slow > 5) { G.lowRes = true; renderer.setPixelRatio(0.8); renderer.setSize(innerWidth, innerHeight); UI.news('⚡ かるく するため がめんを すこし あらく したよ'); } }
}
// テスト用：画面なしで時間をすすめる
G.startDrama = (k) => startDrama(G, k);
G.simulate = (sec, step = 0.1) => { G.simulating = true; try { for (let s = 0; s < sec; s += step) { for (const r of G.residents) r.update(step, G); for (const r of G.residents) r.sync(s, step); for (const p of G.pets) p.update(step, G, cam); updateHomes(step); eventsTick(G, step); dramaTick(G, step); placesTick(G, step); placeLifeTick(G, step); dreamsTick(G, step); weatherTick(G, step); consultTick(G, step); mailTick(G); dailyTick(G, step, gather); goalsTick(G); weekTick(G, step); episodeTick(G, step); kindTick(G, step); playTick(G, step); nightTick(G, step); rareTick(G); bestieTick(G, step); petTick(G, step); appearDecay(G); G.time += step * (24 / 720); G.hour = G.time % 24; G.day = Math.floor(G.time / 24) + 1; if (G.party) { G.party.t -= step; if (G.party.t <= 0) G.party = null; } } } finally { G.simulating = false; } };
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
cam.position.set(40, 45, 30); cam.lookAt(64, 22, 64);
loop();

// タイトル
(async () => {
  const data = await loadGame();
  UI.title(!!data, async (cont) => { SFX.unlock(); await startGame(cont ? data : null); });
  $('#count').textContent = BLOCK_COUNT;
})();
