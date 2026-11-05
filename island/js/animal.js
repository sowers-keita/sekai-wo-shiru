// どうぶつの なかま（AIで かいた せっていが → AIで 3D → ほねいれ）
// ・からだ：GLB（スキン つき。ほねは かいてん なしの ふしぶし）
// ・かお：うすい かおシールに め・くち・まゆ・ほっぺを キャンバスで かく（ひょうじょうが かわる）
// ・Character と おなじ うごき（animate）を そのまま つかう
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { kFood } from './props.js';
import { applyMotion } from './motion.js';
import { humanMaterial, buildHair, hairMaterial, buildSkirt, randomHum } from './human.js';
import { Character, drawEye, drawBrow, drawMouth, drawGlass, hatMeshFor, setFaceIconHook } from './chars.js';

export const SPECIES = [
  // にんげんは アストラの モデル待ち（試作は js/human.js・animals/human.json）
  ...(window.__human ? [{ key: 'human', name: 'にんげん', ic: '🧍', file: 'animals/human.json', human: true, humanNose: true, colors: [['ふつう', 0, 1, 1]] }] : []),
  { key: 'pig', name: 'ぶた', ic: '🐷', file: 'animals/pig.json', colors: [['ももいろ', 0, 1, 1], ['しろ', 0, 0.25, 1.12], ['くろ', 0, 0.35, 0.32], ['ちゃいろ', 18, 0.9, 0.62], ['ラベンダー', -60, 0.7, 1]] },
  { key: 'tanuki', name: 'たぬき', ic: '🦝', file: 'animals/tanuki.json', colors: [['ちゃいろ', 0, 1, 1], ['こげちゃ', 0, 1, 0.72], ['グレー', 0, 0.2, 0.95], ['きつねいろ', 10, 1.25, 1.08], ['ゆきいろ', 0, 0.15, 1.4]] },
  { key: 'elephant', name: 'ぞう', ic: '🐘', file: 'animals/elephant.json', colors: [['そらいろ', 0, 1, 1], ['ももいろ', 0, 0.3, 1.1, '#ffc6d6'], ['しろ', 0, 0.2, 1.25], ['ミント', 0, 0.3, 1.05, '#c6f0dc'], ['むらさき', 30, 1.3, 1]] },
  { key: 'tiger', name: 'とら', ic: '🐯', file: 'animals/tiger.json', colors: [['オレンジ', 0, 1, 1], ['きいろ', 12, 1, 1.12], ['しろとら', 0, 0.12, 1.35], ['ピンク', -28, 0.8, 1.15], ['こむぎ', 6, 0.6, 1.08]] },
  { key: 'rabbit', name: 'うさぎ', ic: '🐰', file: 'animals/rabbit.json', colors: [['クリーム', 0, 1, 1], ['しろ', 0, 0.2, 1.12], ['ちゃいろ', 0, 1.6, 0.78], ['ピンク', -25, 1.2, 1.02], ['グレー', 0, 0.1, 0.85]] },
  { key: 'cat', name: 'ねこ', ic: '🐱', file: 'animals/cat.json', colors: [['グレー', 0, 1, 1], ['くろ', 0, 1, 0.4], ['ちゃとら', 0, 1, 1, '#ffc27a'], ['しろ', 0, 1, 1.3], ['みけ', 0, 1, 1.05, '#ffe2c4']] },
  { key: 'dog', name: 'いぬ', ic: '🐶', file: 'animals/dog.json', colors: [['きなこ', 0, 1, 1], ['ちゃいろ', 0, 1.1, 0.75], ['しろ', 0, 0.5, 1.3], ['くろ', 0, 1, 0.45], ['ごま', 0, 0.8, 0.9, '#e8d8c8']] },
  { key: 'bear', name: 'くま', ic: '🐻', file: 'animals/bear.json', colors: [['こげちゃ', 0, 1, 1], ['ちゃいろ', 0, 1, 1.3], ['くろ', 0, 0.6, 0.45], ['しろくま', 0, 0.15, 2.2], ['ピンク', 0, 0.6, 1.4, '#ffc4d6']] },
  { key: 'panda', name: 'パンダ', ic: '🐼', file: 'animals/panda.json', eyeRim: true, decalNose: true, colors: [['しろくろ', 0, 1, 1], ['ちゃいろ', 0, 1, 1, '#ffd9b0'], ['ピンク', 0, 1, 1, '#ffd0de'], ['みずいろ', 0, 1, 1, '#cfe8ff'], ['きいろ', 0, 1, 1, '#fff0a8']] },
  { key: 'hamster', name: 'ハムスター', ic: '🐹', file: 'animals/hamster.json', colors: [['しろ', 0, 1, 1], ['クリーム', 0, 1, 1, '#ffe0b0'], ['ちゃいろ', 0, 1, 0.9, '#d9a77a'], ['グレー', 0, 1, 0.85, '#c4c4d4'], ['さくら', 0, 1, 1, '#ffd0de']] },
];
export const PROP0 = { hs: 1, hy: 0, bw: 1, bh: 1, al: 1, ll: 1 };
export const PAINT_SIZE = 512;
const PIMG = new Map(); export function paintImg(src) { let im = PIMG.get(src); if (!im) { im = new Image(); im.src = src; PIMG.set(src, im); if (PIMG.size > 40) PIMG.delete(PIMG.keys().next().value); } return im; }
// ぬる：あたった ところの まわりの さんかくを UV に ぬる（つなぎめを またいでも きれいに）
export function paintPrep(mesh) {
  if (mesh.userData.pp) return mesh.userData.pp; const g = mesh.geometry, P = g.attributes.position, U = g.attributes.uv, I = g.index; const nf = I.count / 3;
  const cen = new Float32Array(nf * 3), rad = new Float32Array(nf);
  for (let f = 0; f < nf; f++) { let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { const v = I.getX(f * 3 + k); cx += P.getX(v); cy += P.getY(v); cz += P.getZ(v); } cx /= 3; cy /= 3; cz /= 3; cen[f * 3] = cx; cen[f * 3 + 1] = cy; cen[f * 3 + 2] = cz; let r = 0; for (let k = 0; k < 3; k++) { const v = I.getX(f * 3 + k); r = Math.max(r, Math.hypot(P.getX(v) - cx, P.getY(v) - cy, P.getZ(v) - cz)); } rad[f] = r; }
  return (mesh.userData.pp = { P, U, I, nf, cen, rad });
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
export function paintHit(mesh, hit) { // ポーズの ついた あたり → もとの かたちの ざひょう
  const f = hit.face; mesh.getVertexPosition(f.a, _a); mesh.getVertexPosition(f.b, _b); mesh.getVertexPosition(f.c, _c); mesh.localToWorld(_a); mesh.localToWorld(_b); mesh.localToWorld(_c);
  const bc = new THREE.Vector3(); THREE.Triangle.getBarycoord(hit.point, _a, _b, _c, bc); const P = mesh.geometry.attributes.position;
  return [0, 1, 2].map((k) => bc.x * P.getComponent(f.a, k) + bc.y * P.getComponent(f.b, k) + bc.z * P.getComponent(f.c, k));
}
export function paintDab(pp, img, hp, r, rgb, mode) {
  const { P, U, I, nf, cen, rad } = pp, S = img.width, D = img.data;
  for (let f = 0; f < nf; f++) {
    const dx = cen[f * 3] - hp[0], dy = cen[f * 3 + 1] - hp[1], dz = cen[f * 3 + 2] - hp[2]; if (dx * dx + dy * dy + dz * dz > (r + rad[f]) ** 2) continue;
    const v = [I.getX(f * 3), I.getX(f * 3 + 1), I.getX(f * 3 + 2)]; const ux = v.map((i) => U.getX(i) * S), uy = v.map((i) => U.getY(i) * S);
    const x0 = Math.max(0, Math.floor(Math.min(...ux)) - 1), x1 = Math.min(S - 1, Math.ceil(Math.max(...ux)) + 1), y0 = Math.max(0, Math.floor(Math.min(...uy)) - 1), y1 = Math.min(S - 1, Math.ceil(Math.max(...uy)) + 1);
    const det = (uy[1] - uy[2]) * (ux[0] - ux[2]) + (ux[2] - ux[1]) * (uy[0] - uy[2]); if (Math.abs(det) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5; const l0 = ((uy[1] - uy[2]) * (px - ux[2]) + (ux[2] - ux[1]) * (py - uy[2])) / det, l1 = ((uy[2] - uy[0]) * (px - ux[2]) + (ux[0] - ux[2]) * (py - uy[2])) / det, l2 = 1 - l0 - l1;
      const e = -0.12; if (l0 < e || l1 < e || l2 < e) continue;
      let d2 = 0; for (let k = 0; k < 3; k++) { const q = l0 * P.getComponent(v[0], k) + l1 * P.getComponent(v[1], k) + l2 * P.getComponent(v[2], k) - hp[k]; d2 += q * q; }
      if (d2 > r * r) continue; const a = Math.min(1, (1 - Math.sqrt(d2) / r) * 3); const o = (y * S + x) * 4;
      if (mode === 'erase') D[o + 3] = Math.max(0, D[o + 3] - a * 255);
      else { const na = Math.max(D[o + 3], a * 255); const k = a; D[o] = D[o] + (rgb[0] - D[o]) * (D[o + 3] ? k : 1); D[o + 1] = D[o + 1] + (rgb[1] - D[o + 1]) * (D[o + 3] ? k : 1); D[o + 2] = D[o + 2] + (rgb[2] - D[o + 2]) * (D[o + 3] ? k : 1); D[o + 3] = na; }
    }
  }
}
export const CHEEKS = ['まる', 'おおきい', 'なし', 'ハート', 'ぐるぐる', 'そばかす'];
const cache = {};
export function speciesOf(key) { return SPECIES.find((s) => s.key === key) || SPECIES[0]; }
export function loadSpecies(key, base = '') {
  const sp = speciesOf(key); if (cache[sp.key]) return cache[sp.key];
  cache[sp.key] = fetch(base + sp.file).then((r) => { if (!r.ok) throw new Error('load ' + r.status); return r.json(); }).then((j) => { const bin = atob(j.glb); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new GLTFLoader().parseAsync(u.buffer, base); }).then((g) => { const meta = g.parser.json.extras || {}; return { scene: g.scene, meta }; });
  return cache[sp.key];
}
const ready = {}; // key → { scene, meta }
export async function preloadAll(base = '') { for (const s of SPECIES) { try { ready[s.key] = await loadSpecies(s.key, base); } catch (e) { console.warn('animal load', s.key, e); const el = document.getElementById('err'); if (el) el.textContent += 'LOAD ' + s.key + ' ' + (e.stack || e) + '\n'; } } return Object.keys(ready).length; }
export const hasSpecies = (key) => !!ready[key];

// けいろの いろかえ（色相・さいど・あかるさ）
const NOPAINT = (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); t.needsUpdate = true; return t; })();
function furMaterial(map, fur, paint) {
  const m = new THREE.MeshLambertMaterial({ map });
  m.userData.paint = { value: paint || NOPAINT };
  m.userData.fur = { value: new THREE.Vector3(fur[1] / 360, fur[2], fur[3]) }; m.userData.tint = { value: new THREE.Color(fur[4] || '#ffffff') };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFur = m.userData.fur; sh.uniforms.uTint = m.userData.tint; sh.uniforms.uPaint = m.userData.paint;
    sh.fragmentShader = 'uniform vec3 uFur; uniform vec3 uTint; uniform sampler2D uPaint;\nvec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.0e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}\nvec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 h = rgb2hsv(diffuseColor.rgb); h.x = fract(h.x + uFur.x); h.y = clamp(h.y * uFur.y, 0., 1.); h.z = clamp(h.z * uFur.z, 0., 1.); diffuseColor.rgb = hsv2rgb(h) * uTint; vec4 pt = texture2D(uPaint, vMapUv); diffuseColor.rgb = mix(diffuseColor.rgb, pt.rgb, pt.a); }`)
        .replace('#include <opaque_fragment>', `float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.,0.,1.)), 0.0); outgoingLight += vec3(1.0,0.96,0.92) * pow(rim, 2.5) * 0.18 * diffuseColor.rgb;\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'fur';
  return m;
}

// かおシール
const K = '#2a1d1a';
export function renderAnimalFace(f, meta, size = 512, expr = 'open', drawingImg = null) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const F = meta.face; if (!F) return cv;
  const P = (uv) => [uv[0] * size, (1 - uv[1]) * size];
  const r = F.eyeR_r * size; const sc = (r / 2.6) * (f.eye?.size || 1);
  const shy = expr === 'shy' || expr === 'laugh' || expr === 'sulk';
  // ほっぺ
  const ck = f.cheek ?? 0; const cr = (F.cheek_r || F.eyeR_r * 1.2) * size;
  for (const k of ['cheekL', 'cheekR']) { const c = F[k] ? P(F[k]) : null; if (!c) continue; const a = shy ? 0.75 : 0.5;
    if (ck === 0 || shy) { g.fillStyle = `rgba(255,120,140,${a})`; g.beginPath(); g.ellipse(c[0], c[1], cr * 0.95, cr * 0.75, 0, 0, Math.PI * 2); g.fill(); }
    else if (ck === 1) { const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], cr * 1.6); gr.addColorStop(0, 'rgba(255,100,125,0.7)'); gr.addColorStop(0.65, 'rgba(255,100,125,0.55)'); gr.addColorStop(1, 'rgba(255,100,125,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], cr * 1.6, cr * 1.3, 0, 0, Math.PI * 2); g.fill(); }
    else if (ck === 3) { g.save(); g.translate(c[0], c[1]); g.scale(cr / 3.2, cr / 3.2); g.beginPath(); g.moveTo(0, 2.6); g.bezierCurveTo(-4, -0.4, -1.6, -3.4, 0, -1); g.bezierCurveTo(1.6, -3.4, 4, -0.4, 0, 2.6); g.fillStyle = 'rgba(255,90,130,0.75)'; g.fill(); g.restore(); }
    else if (ck === 4) { g.strokeStyle = 'rgba(255,100,130,0.7)'; g.lineWidth = cr * 0.12; g.beginPath(); for (let a = 0; a < 11; a += 0.25) { const rr = a * cr * 0.075; g.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); } g.stroke(); }
    else if (ck === 5) { g.fillStyle = 'rgba(150,80,60,0.7)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(c[0] + ((i % 3) - 1) * cr * 0.45, c[1] + Math.floor(i / 3) * cr * 0.4 - cr * 0.15, cr * 0.1, 0, Math.PI * 2); g.fill(); } } }
  // め・まゆ
  const RIM = SPECIES.find((x) => x.key === f.species)?.eyeRim;
  const ex = expr === 'laugh' ? 'happy' : expr === 'talk' || /^talk/.test(expr) ? 'open' : expr;
  const E = f.eye || {}, Bw = f.brow || {}, Mo = f.mouth || {}, Gl = f.glass || {}; const xc = (P(F.eyeL)[0] + P(F.eyeR)[0]) / 2, u = Math.abs(P(F.eyeL)[0] - P(F.eyeR)[0]) / 22;
  const eyeAt = (k) => { const [x0, y0] = P(F[k]); const d = Math.sign(x0 - xc) || 1; return [x0 + d * (E.sp || 0) * 0.55 * u, y0 + (E.y || 0) * 0.75 * u]; };
  for (const [k, s] of [['eyeR', -1], ['eyeL', 1]]) { const [x, y] = eyeAt(k); g.save(); g.translate(x, y); g.scale(sc * s, sc); g.rotate((E.rot || 0) * 0.12); if (expr === 'surprise') { el(g, 0, 0, 3.4, 3.8, '#fff', K, 0.8); el(g, 0, 0, 1.4, 1.5, K); } else { if (RIM) el(g, 0, 0.1, 3.1, 3.4, '#fffaf0'); drawEye(g, f.eye?.t ?? 1, f.eye?.c || '#1a1a1a', ex); } g.restore();
    const bt = expr === 'angry' || expr === 'sulk' ? 4 : expr === 'sad' || expr === 'trouble' || expr === 'shy' ? 5 : expr === 'surprise' ? 1 : (f.brow?.t ?? 11);
    if (bt !== 11) { const d = Math.sign(x - xc) || 1; const bs = (Bw.size || 1) / (E.size || 1); g.save(); g.translate(x + d * (Bw.sp || 0) * 0.45 * u, y - r * 2.0 + (Bw.y || 0) * 0.6 * u - (expr === 'surprise' ? r * 0.5 : 0)); g.scale(sc * s * 0.8 * bs, sc * 0.8 * bs); g.rotate((Bw.rot || 0) * 0.12); drawBrow(g, bt, Bw.c || '#5a3a2a'); g.restore(); }
    if (expr === 'sad') { g.fillStyle = '#6ab8f0'; g.beginPath(); g.ellipse(x + s * r * 0.3, y + r * 2, r * 0.35, r * 0.55, 0, 0, Math.PI * 2); g.fill(); } }
  if (expr === 'trouble') { const [x, y] = P(F.eyeL); g.fillStyle = '#8ad0ff'; g.beginPath(); g.ellipse(x + r * 2.4, y - r * 1.6, r * 0.45, r * 0.7, 0, 0, Math.PI * 2); g.fill(); }
  // くち
  if (SPECIES.find((x) => x.key === f.species)?.humanNose) { const [mx, my] = P(F.mouth); const ey = (P(F.eyeL)[1] + P(F.eyeR)[1]) / 2; el(g, mx, my - (my - ey) * 0.42, r * 0.26, r * 0.2, 'rgba(214,128,104,0.55)'); }
  if (SPECIES.find((x) => x.key === f.species)?.decalNose) { const [mx, my] = P(F.mouth); const ey = (P(F.eyeL)[1] + P(F.eyeR)[1]) / 2; const ny = my - (my - ey) * 0.5; el(g, mx, ny, r * 0.62, r * 0.45, '#221a19'); el(g, mx - r * 0.18, ny - r * 0.16, r * 0.17, r * 0.1, 'rgba(255,255,255,0.75)'); }
  { const [x, y0] = P(F.mouth); const y = y0 + (Mo.y || 0) * 0.75 * u; const ms = (F.mouthW * size / 6.5) * (f.mouth?.size || 1); g.save(); g.translate(x, y); g.scale(ms, ms);
    drawMouth(g, expr === 'angry' || expr === 'sad' ? 4 : expr === 'surprise' ? 2 : (f.mouth?.t ?? 5), f.mouth?.c || '#e86a6a', expr, f.mouth?.lc); g.restore(); }
  if (f.glass?.t) { const [x, y] = eyeAt('eyeR'), [x2] = eyeAt('eyeL'); const gs = sc * 1.1 * (Gl.size || 1) / (E.size || 1); g.save(); g.translate((x + x2) / 2, y + (Gl.y || 0) * 0.6 * u); g.scale(gs, gs); drawGlass(g, f.glass.t, f.glass.c, Math.abs(x2 - x) / 2 / gs); g.restore(); }
  if (drawingImg) g.drawImage(drawingImg, 0, 0, size, size);
  return cv;
}
function el(g, x, y, rx, ry, fill, stroke, lw = 0.8) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }

export class AnimalCharacter extends Character {
  refreshFace() {
    for (const k in this.textures) this.textures[k].dispose();
    const meta = this.meta; if (!meta) return;
    const mk = (expr, s) => { const t = new THREE.CanvasTexture(renderAnimalFace(this.f, meta, s, expr, this.drawingImg)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    this.textures = { open: mk('open', 512), blink: mk('blink', 256), talk: mk('talk', 256), happy: mk('happy', 256) };
    if (this.faceMat) { this.faceMat.map = this.textures[this.expr] || this.textures.open; this.faceMat.needsUpdate = true; }
  }
  setExpr(e) {
    if (this.expr === e) return;
    if (!this.textures[e]) { if (!['angry', 'sad', 'surprise', 'talkA', 'talkI', 'talkO', 'shy', 'sulk', 'trouble', 'laugh'].includes(e)) return; const t = new THREE.CanvasTexture(renderAnimalFace(this.f, this.meta, 256, e, this.drawingImg)); t.colorSpace = THREE.SRGBColorSpace; this.textures[e] = t; }
    this.expr = e; if (this.faceMat) this.faceMat.map = this.textures[e];
  }
  build() {
    const f = this.f, R = this.root; while (R.children.length) R.remove(R.children[0]);
    const A = ready[f.species] || ready.pig; if (!A) { console.warn('animal not ready'); return; }
    this.meta = A.meta; const sp = speciesOf(f.species);
    const body = new THREE.Group(); R.add(body); this.body = body;
    const S = (f.height || 1) * 0.92 + 0.08; body.scale.setScalar(S);
    const obj = skClone(A.scene); body.add(obj);
    const fur = sp.colors[(f.fur ?? 0) % sp.colors.length];
    obj.traverse((o) => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.frustumCulled = false; o.castShadow = true;
        if (o.name === 'face' || (o.material && o.material.name === 'face')) { this.faceMat = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); o.material = this.faceMat; o.renderOrder = 2; o.castShadow = false; this.faceMesh = o; }
        else if (sp.human) { this.initPaint(); o.material = humanMaterial(o.material.map, f, this.paintTex, NOPAINT); this.furMat = o.material; this.furMesh = o; }
        else { const map = o.material.map; map.colorSpace = THREE.SRGBColorSpace; this.initPaint(); o.material = furMaterial(map, fur, this.paintTex); this.furMat = o.material; this.furMesh = o; }
      }
    });
    const bone = (n) => { let b = null; obj.traverse((o) => { if (o.isBone && o.name === n) b = o; }); return b; };
    const pivot = (n) => bone(n) || new THREE.Group();
    this.head = pivot('head'); this.arms = [pivot('armR'), pivot('armL')]; this.legs = [pivot('legR'), pivot('legL')]; this.tail = bone('tail');
    this.obj = obj; this._bone = bone;
    if (sp.human && A.meta.headE) { const E = A.meta.headE.slice(), J0 = A.meta.joints.head; E[0] -= J0[0]; E[1] -= J0[1]; E[2] -= J0[2]; this.hair = buildHair(f, E, hairMaterial(f)); this.head.add(this.hair); const sk = buildSkirt(f); const bb = bone('body'); if (sk && bb) { sk.position.y -= A.meta.joints.body[1]; bb.add(sk); } }
    this.applyProp(bone);
    // ぼうし（あたまの てっぺん）
    const J = A.meta.joints; const headTop = A.meta.height - J.head[1]; const PR = this.pr;
    if (f.hat && hatMeshFor) { const h = hatMeshFor(f.hat); const k = headTop / 0.56 * 0.4; h.scale.multiplyScalar(k); h.position.set(0, headTop * 0.7, 0.02); this.head.add(h); }
    this.refreshFace();
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; R.add(shadow);
    this.height = PR.top * S + 0.05;
    const um = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: ['#e8443a', '#3a8ae0', '#f5cf30', '#f08cb2', '#3aa858'][Math.abs(f.food || 0) % 5], side: THREE.DoubleSide });
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.3, 10, 1, true), cm); top.position.y = this.height + 0.35; um.add(top);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1), new THREE.MeshLambertMaterial({ color: '#555' })); st.position.y = this.height - 0.15; um.add(st);
    um.position.set(0.3, 0, 0.05); um.visible = false; R.add(um); this.umbrella = um;
  }
  // からだの バランス（あたま・くび・どう・うで・あし）
  applyProp(bone = this._bone) {
    const p = Object.assign({}, PROP0, this.f.prop || {}); const M = this.meta, J = M.joints, hipY = J.body[1];
    const B = bone('body'), H = bone('head'), T = bone('tail'), A = [bone('armR'), bone('armL')], L = [bone('legR'), bone('legL')];
    const keep = (o) => { if (o && !o.userData.p0) o.userData.p0 = o.position.clone(); return o; };
    if (B) B.scale.set(p.bw, p.bh, p.bw);
    if (keep(H)) { H.scale.set(p.hs / p.bw, p.hs / p.bh, p.hs / p.bw); H.position.copy(H.userData.p0); H.position.y += (p.hy * M.height) / p.bh; }
    for (const a of A) if (a) a.scale.set(1 / p.bw, p.al / p.bh, 1 / p.bw);
    for (const l of L) if (l) l.scale.set(1 / p.bw, p.ll / p.bh, 1 / p.bw);
    if (T) T.scale.set(1 / p.bw, 1 / p.bh, 1 / p.bw);
    this.obj.position.y = hipY * (p.ll - 1);
    const neck = hipY * p.ll + (J.head[1] - hipY) * p.bh + p.hy * M.height; const hh = M.height - J.head[1];
    this.pr = { p, neck, top: neck + hh * p.hs, headC: neck + hh * 0.42 * p.hs, headR: hh * 0.62 * p.hs }; if (this.body) this.height = this.pr.top * this.body.scale.x + 0.05;
  }
  // ぬりえ（からだに じかに ぬる）
  initPaint() {
    if (this.paintTex) return; const c = document.createElement('canvas'); c.width = c.height = PAINT_SIZE; this.paintCanvas = c;
    const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; this.paintTex = t;
    const f = this.f; if (f.paint && f.paintSp === f.species) { const im = paintImg(f.paint); const draw = () => { c.getContext('2d').drawImage(im, 0, 0, PAINT_SIZE, PAINT_SIZE); t.needsUpdate = true; }; if (im.complete && im.naturalWidth) draw(); else im.addEventListener('load', draw); }
  }
  setPaintCanvas(src) { const g = this.paintCanvas.getContext('2d'); g.clearRect(0, 0, PAINT_SIZE, PAINT_SIZE); if (src) g.drawImage(src, 0, 0); this.paintTex.needsUpdate = true; }
  animate(t, speed, dt, mode) {
    super.animate(t, speed, dt, mode);
    // しぜんな うごき（Mixamo）。つかえない モードは てづくりの まま
    const mo = !window.__noMotion && applyMotion(this, t, speed, dt, mode);
    // みじかい てあし むけに すこし ちいさく：うでの はばを おさえる
    if (!mo) for (const a of this.arms) { a.rotation.x *= 0.85; }
    // ごはん：すきな たべもの（eatFood）を くちもとに
    if (mode === 'eat' && this.pr) { if (!this.foodObj) { const o = kFood(this.eatFood ?? this.f.food ?? 0, this.pr.headR * 0.75); if (o) { this.foodObj = o; this.body.add(o); } } if (this.foodObj) { this.foodObj.position.set(0, this.pr.headC - this.pr.headR * 0.62 + Math.sin(t * 10) * 0.015, this.pr.headR * 1.05); this.foodObj.rotation.y = Math.sin(t * 0.8) * 0.4; } }
    else if (this.foodObj) { this.body.remove(this.foodObj); this.foodObj = null; }
    if (this.tail) this.tail.rotation.y = Math.sin(t * (speed > 0.1 || mode === 'joy' ? 14 : 3)) * (speed > 0.1 || mode === 'joy' ? 0.5 : 0.18);
    if (this.head && speed < 0.05 && mode !== 'sleep' && !mo) this.head.rotation.y = Math.sin(t * 0.7) * 0.08;
    if (mo && this.listening) this.head.rotateX(Math.max(0, Math.sin(t * 3.2)) * 0.14);
  }
  setPajama() {}
}

// ---------- ゲームで つかう ヘルパー
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export const availableSpecies = () => SPECIES.filter((s) => ready[s.key]);
export const CUTE_EYES = [0, 1, 13, 2, 7, 11, 17, 6, 19, 3];
export const CUTE_MOUTHS = [5, 0, 1, 10, 11, 2, 7, 13];
export function animalize(f, idx) {
  const av = availableSpecies(); if (!av.length) return f; const sp = idx != null ? av[idx % av.length] : rnd(av);
  f.species = sp.key; f.fur = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * sp.colors.length); if (sp.human) f.hum = randomHum();
  f.eye = { t: rnd([0, 0, 1, 13, 2, 7, 11]), c: '#1a1a1a', y: 0, size: 1, sp: 0, rot: 0 }; f.mouth = { t: rnd([5, 5, 0, 1, 10]), c: '#e86a6a', y: 0, size: 1 };
  f.brow = { t: 11, c: null, y: 0, size: 1, sp: 0, rot: 0 }; f.cheek = rnd([0, 0, 1, 3, 5]); f.glass = { t: Math.random() < 0.08 ? 1 + Math.floor(Math.random() * 6) : 0, c: '#2a2a2a', y: 0, size: 1 };
  f.height = 0.92 + Math.random() * 0.16; return f;
}
export const makeChar = (f) => (f && f.species && ready[f.species] ? new AnimalCharacter(f) : new Character(f));
// アイコン（かおの アップを 3Dで とる）
let IR = null, IS = null, IC = null; const icache = new Map();
export function animalIcon(f, size = 128) {
  if (!ready[f.species]) return null;
  const key = JSON.stringify([f.species, f.fur, f.eye?.t, f.eye?.c, f.mouth?.t, f.cheek, f.hat, f.brow?.t, f.glass?.t, f.prop, f.hum, f.paint ? f.paint.length + f.paint.slice(-40) : 0]);
  let src = icache.get(key);
  if (!src && f.paint) { const im = paintImg(f.paint); if (!(im.complete && im.naturalWidth)) return null; }
  if (!src) {
    try {
      if (!IR) { IR = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); IR.setSize(192, 192); IR.outputColorSpace = THREE.SRGBColorSpace; IS = new THREE.Scene(); IS.add(new THREE.HemisphereLight(0xffffff, 0xd8c8c0, 1.7)); const d = new THREE.DirectionalLight(0xffffff, 1.3); d.position.set(1, 2, 3); IS.add(d); IC = new THREE.PerspectiveCamera(30, 1, 0.05, 20); }
      const ch = new AnimalCharacter(f); ch.setExpr('happy'); IS.add(ch.root); const S = ch.body.scale.x; const hy = ch.pr.headC * S, hr = ch.pr.headR * S;
      IC.position.set(0, hy + hr * 0.15, hr * 4.6); IC.lookAt(0, hy, 0); IR.render(IS, IC); IS.remove(ch.root); ch.dispose();
      src = document.createElement('canvas'); src.width = src.height = 192; const g = src.getContext('2d'); g.fillStyle = '#fff4ea'; g.beginPath(); g.arc(96, 96, 96, 0, Math.PI * 2); g.fill(); g.drawImage(IR.domElement, 0, 0);
      icache.set(key, src);
    } catch (e) { return null; }
  }
  const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(src, 0, 0, size, size); return c;
}
setFaceIconHook(animalIcon);
