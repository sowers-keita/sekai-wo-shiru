// にんげんの なかま（どうぶつと おなじ 2とうしんの ぬいぐるみ）
// ・からだ：animals/human.json（テクスチャは「どこが うで・あし・あたまか」の ちず）
// ・はだ／ふく／くつの いろ と そで・すその ながさは シェーダーで ぬる
// ・かみがたは あたまの ほねに つける（その ばで つくる）
import * as THREE from 'three';

export const SKINS_H = ['#ffe4d0', '#fbd3b6', '#f0c09a', '#dca478', '#b9805a', '#8c5a3c'];
export const HAIR_COLS = ['#2e2422', '#5a3a28', '#8a5a34', '#c88c4c', '#f0cf7a', '#e9e2da', '#e86e50', '#f28fb4', '#8f72dc', '#4a8ee0'];
export const CLOTH_COLS = ['#f25f5c', '#ff9f43', '#ffd34d', '#7bcf6b', '#4fb8a8', '#5aa0f0', '#3d5fc4', '#a07ae0', '#f59ac0', '#ffffff', '#c9c4bd', '#3b3a40', '#a8754f', '#f3e3c3'];
export const HAIRS_H = ['ショート', 'ボブ', 'ロング', 'ポニーテール', 'ツインテール', 'おだんご', 'つんつん', 'みつあみ', 'ふわふわ', 'ぼうず'];
export const SLEEVES = ['そでなし', 'はんそで', 'ながそで'];
export const BOTTOMS = ['ながズボン', 'はんズボン', 'スカート', 'ワンピース'];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export function randomHum() {
  return { sk: Math.floor(Math.random() * 4), hs: Math.floor(Math.random() * 9), hc: rnd(HAIR_COLS.slice(0, 6)), sh: rnd(CLOTH_COLS), sl: rnd([1, 1, 2, 0]), pa: rnd(CLOTH_COLS), bt: Math.floor(Math.random() * 4), so: rnd(['#3b3a40', '#ffffff', '#f25f5c', '#5aa0f0', '#a8754f', '#ffd34d']) };
}
export const humOf = (f) => Object.assign({ sk: 1, hs: 0, hc: '#5a3a28', sh: '#5aa0f0', sl: 1, pa: '#3d5fc4', bt: 0, so: '#3b3a40' }, f.hum || {});

// ぬのの こまかい もよう（ちいさな ノイズ）
let NOISE = null;
function noiseTex() {
  if (NOISE) return NOISE; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const d = g.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const x = i % 128, y = (i / 128) | 0; const v = 128 + (Math.random() - 0.5) * 70 + Math.sin(x * 0.8) * 10 + Math.sin(y * 0.8) * 10; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
  g.putImageData(d, 0, 0); NOISE = new THREE.CanvasTexture(c); NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping; return NOISE;
}
export function humanMaterial(map, f, paint, NOPAINT) {
  const H = humOf(f); map.colorSpace = THREE.NoColorSpace; map.needsUpdate = true;
  const m = new THREE.MeshLambertMaterial({ map });
  const U = m.userData; U.paint = { value: paint || NOPAINT }; U.noise = { value: noiseTex() };
  U.skin = { value: new THREE.Color(SKINS_H[H.sk % SKINS_H.length]) }; U.shirt = { value: new THREE.Color(H.sh) }; U.pants = { value: new THREE.Color(H.bt === 3 ? H.sh : H.pa) }; U.shoe = { value: new THREE.Color(H.so) };
  U.cut = { value: new THREE.Vector3([0.02, 0.36, 0.78][H.sl ?? 1], [0.62, 0.3, 0.13, 0.13][H.bt ?? 0], 1) };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uPaint: U.paint, uNoise: U.noise, uSkin: U.skin, uShirt: U.shirt, uPants: U.pants, uShoe: U.shoe, uCut: U.cut });
    sh.fragmentShader = 'uniform sampler2D uPaint; uniform sampler2D uNoise; uniform vec3 uSkin; uniform vec3 uShirt; uniform vec3 uPants; uniform vec3 uShoe; uniform vec3 uCut;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `
        vec3 fld = texture2D(map, vMapUv).rgb; float s = fld.r, l = fld.g, hd = fld.b;
        float up = 1.0 - smoothstep(0.012, 0.028, l);
        float shirt = up * (1.0 - smoothstep(uCut.x - 0.012, uCut.x + 0.012, s)) * (1.0 - smoothstep(0.35, 0.65, hd));
        float pants = smoothstep(0.012, 0.028, l) * (1.0 - smoothstep(uCut.y - 0.012, uCut.y + 0.012, l));
        float shoe = smoothstep(0.585, 0.612, l);
        vec3 col = mix(uSkin, uShirt, shirt); col = mix(col, uPants, pants); col = mix(col, uShoe, shoe);
        float cloth = max(max(shirt, pants), shoe);
        float n = texture2D(uNoise, vMapUv * 14.0).r; col *= mix(0.985 + (n - 0.5) * 0.05, 0.94 + (n - 0.5) * 0.16, cloth);
        float seam = max(max(shirt * (1.0 - shirt), pants * (1.0 - pants)), shoe * (1.0 - shoe)) * 4.0; col *= 1.0 - seam * 0.16;
        diffuseColor.rgb *= col;
        { vec4 pt = texture2D(uPaint, vMapUv); diffuseColor.rgb = mix(diffuseColor.rgb, pt.rgb, pt.a); }`)
        .replace('#include <opaque_fragment>', `float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.,0.,1.)), 0.0); outgoingLight += vec3(1.0,0.96,0.92) * pow(rim, 2.5) * 0.16 * diffuseColor.rgb;\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'human';
  return m;
}

// ---------- かみがた
// あたまの だえん（ほね から みた いち）に あわせて つくる
function capGeo(E, lim, puff = 1.06, seg = 64) {
  // はえぎわより したの 頂点は はえぎわに よせる（ふちが なめらかに なる）
  const g = new THREE.SphereGeometry(1, seg, seg * 0.75); const P = g.attributes.position;
  for (let j = 0; j < P.count; j++) {
    let x = P.getX(j), y = P.getY(j), z = P.getZ(j); const L = lim(x, y, z);
    if (y < L) { const r0 = Math.hypot(x, z) || 1e-6, r1 = Math.sqrt(Math.max(0, 1 - L * L)); x = (x / r0) * r1; z = (z / r0) * r1; y = L; }
    const bulge = puff + Math.max(0, -y) * 0.04 + Math.max(0, y - 0.6) * 0.04; P.setXYZ(j, x * E[3] * bulge, y * E[4] * bulge, z * E[5] * bulge);
  }
  g.computeVertexNormals(); return g;
}
// まえがみの ふち（ぎざぎざ）
export function buildHair(f, E, mat) {
  const H = humOf(f); const st = H.hs ?? 0; const G = new THREE.Group(); const add = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; G.add(o); return o; };
  const R = E[3];
  // かみの はえぎわ：まえ（z>0）は おでこの うえ、よこ・うしろは ながさで かわる
  const line = (front, side, back, wav = 0.05) => (x, y, z) => { const a = Math.atan2(x, z); const c = Math.cos(a); const base = c > 0 ? side + (front - side) * Math.pow(c, 1.5) : side + (back - side) * Math.pow(-c, 1.2); const w = c > 0.3 ? (0.5 - 0.5 * Math.cos(a * 10)) * wav * Math.min(1, (c - 0.3) * 3) : 0; return base - w; };
  const sph = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 20, 14); g.scale(rx, ry, rz); return g; };
  if (st === 9) { const c0 = add(capGeo(E, line(0.4, 0.0, -0.3, 0), 1.025)); c0.position.set(E[0], E[1], E[2]); return G; } // ぼうず
  if (st === 8) { // ふわふわ（アフロ）
    const c0 = add(capGeo(E, line(0.3, -0.25, -0.5, 0), 1.14)); c0.position.set(E[0], E[1], E[2]);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const y = 0.15 + Math.sin(i * 1.7) * 0.25; if (Math.cos(a) > 0.6 && y < 0.35) continue; add(sph(R * 0.33, R * 0.33, R * 0.33), Math.sin(a) * R * 0.95, y * E[4] + E[1], Math.cos(a) * R * 0.9 + E[2]); }
    return G;
  }
  const lens = { 0: [0.2, -0.02, -0.5], 1: [0.16, -0.62, -0.66], 2: [0.16, -0.66, -0.75], 3: [0.18, -0.08, -0.55], 4: [0.18, -0.08, -0.55], 5: [0.22, -0.1, -0.5], 6: [0.26, 0.0, -0.45], 7: [0.16, -0.2, -0.6] }[st];
  const cap = add(capGeo(E, line(...lens), st === 1 || st === 2 ? 1.1 : 1.07)); cap.position.set(E[0], E[1], E[2]);
  const top = E[1] + E[4];
  if (st === 2) { const b = add(sph(R * 0.95, R * 0.95, R * 0.38), E[0], E[1] - R * 0.55, E[2] - R * 0.62); b.scale.y = 1.1; }
  if (st === 3) { add(sph(R * 0.16, R * 0.16, R * 0.16), 0, E[1] + E[4] * 0.35, E[2] - E[5] * 1.0); const t = add(sph(R * 0.26, R * 0.62, R * 0.24), 0, E[1] - E[4] * 0.25, E[2] - E[5] * 1.18, -0.35); t.userData.swing = 1; }
  if (st === 4) for (const s of [1, -1]) { add(sph(R * 0.13, R * 0.13, R * 0.13), s * E[3] * 0.92, E[1] + E[4] * 0.2, E[2] - E[5] * 0.25); const t = add(sph(R * 0.22, R * 0.55, R * 0.22), s * E[3] * 1.18, E[1] - E[4] * 0.35, E[2] - E[5] * 0.3, 0, 0, s * 0.35); t.userData.swing = s; }
  if (st === 5) { add(sph(R * 0.36, R * 0.32, R * 0.36), 0, top + R * 0.12, E[2] - E[5] * 0.15); }
  if (st === 6) for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const g = new THREE.ConeGeometry(R * 0.2, R * 0.55, 8); add(g, Math.sin(a) * R * 0.45, top - R * 0.02, Math.cos(a) * R * 0.45 + E[2] - R * 0.05, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7); }
  if (st === 7) for (const s of [1, -1]) for (let i = 0; i < 4; i++) add(sph(R * 0.13, R * 0.14, R * 0.13), s * E[3] * 0.95, E[1] - E[4] * (0.25 + i * 0.32), E[2] - E[5] * 0.15);
  return G;
}
export function hairMaterial(f) {
  const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(humOf(f).hc) });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.,0.,1.)), 0.0); outgoingLight += vec3(1.0,0.97,0.94) * pow(rim, 2.2) * 0.22 * diffuseColor.rgb; float hl = smoothstep(0.55, 0.8, normalize(vNormal).y) * 0.12; outgoingLight += hl * vec3(1.0);\n#include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'hair'; return m;
}
// スカート・ワンピースの すそ
export function buildSkirt(f, J) {
  const H = humOf(f); if (!(H.bt === 2 || H.bt === 3)) return null;
  const g = new THREE.CylinderGeometry(0.2, 0.3, 0.13, 28, 1, true); const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(H.bt === 3 ? H.sh : H.pa), side: THREE.DoubleSide });
  const o = new THREE.Mesh(g, m); o.position.set(0, 0.135, 0.01); o.castShadow = true; return o;
}
