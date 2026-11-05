// Kenney の 3D こもの（Food Kit / Furniture Kit・CC0）
// ・かぐ：ブロックとして おける（shape: 'kmodel'）
// ・たべもの：ごはんの とき てに もって たべる
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const KSCALE = 2.0; // かぐの おおきさ（ブロック 1こ ≒ 1）
export const KROT0 = Math.PI; // Kenney は +Z が まえ、ブロックの かぐは -Z が まえ
// FOODS（life.js）の じゅんばんに たいおう
export const FOOD3D = ['rice-ball', 'loaf', 'apple', 'strawberry', 'banana', 'cake', 'donut-sprinkles', 'pizza', 'burger', 'pan-stew', 'bowl-broth', 'sushi-salmon', 'ice-cream', 'cookie-chocolate', 'pudding', 'pancakes', 'watermelon', 'grapes', 'egg-cooked', 'chocolate'];
const T = {};
let loading = null;
export function loadKenney(base = '') {
  if (loading) return loading;
  loading = (async () => {
    const j = await fetch(base + 'assets/kenney.json').then((r) => { if (!r.ok) throw new Error('kenney ' + r.status); return r.json(); });
    const L = new GLTFLoader();
    for (const g of Object.keys(j)) for (const [k, b64] of Object.entries(j[g])) {
      try {
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const gl = await L.parseAsync(u.buffer, ''); const s = gl.scene;
        s.traverse((o) => { if (o.isMesh) { const m0 = o.material; const m = new THREE.MeshLambertMaterial({ color: m0.color ? m0.color.clone() : 0xffffff, map: m0.map || null, transparent: !!m0.transparent, opacity: m0.opacity ?? 1 }); if (m.map) m.map.colorSpace = THREE.SRGBColorSpace; o.material = m; o.castShadow = true; o.receiveShadow = true; } });
        const box = new THREE.Box3().setFromObject(s); const c = box.getCenter(new THREE.Vector3());
        s.position.set(-c.x, -box.min.y, -c.z); const grp = new THREE.Group(); grp.add(s); grp.userData.size = box.getSize(new THREE.Vector3());
        T[g + ':' + k] = grp;
      } catch (e) { console.warn('kenney', k, e); }
    }
    return Object.keys(T).length;
  })().catch((e) => { console.warn(e); return 0; });
  return loading;
}
export const kReady = (g, k) => !!T[g + ':' + k];
// かたちは きょうゆう（geometry/material は すてない こと）
export function kModel(g, k) { const t = T[g + ':' + k]; if (!t) return null; const o = t.clone(); o.userData.shared = true; o.traverse((x) => (x.userData.shared = true)); return o; }
// ブロックとして おく かぐ
export function kFurniture(d, rot) { const o = kModel('furn', d.kmodel); if (!o) return null; const sz = o.userData.size || { x: 1, z: 1 }; o.scale.setScalar(Math.min(KSCALE * (d.ks || 1), 2.1 / Math.max(sz.x, sz.z, 0.01))); o.rotation.y = -rot * Math.PI / 2 + KROT0; return o; }
// てに もつ たべもの（ながさ L に あわせる）
export function kFood(i, L = 0.32) { const o = kModel('food', FOOD3D[i % FOOD3D.length]); if (!o) return null; const s = o.userData.size || new THREE.Vector3(1, 1, 1); o.scale.setScalar(L / Math.max(s.x, s.y, s.z, 0.01)); return o; }
// たべものの アイコン（3D から つくる）
let FR = null, FS = null, FC = null; const FIC = new Map();
export function kFoodIcon(i) {
  i = i % FOOD3D.length; if (FIC.has(i)) return FIC.get(i);
  const o = kFood(i, 1); if (!o) return null;
  try {
    if (!FR) {
      FR = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); FR.setSize(128, 128); FR.outputColorSpace = THREE.SRGBColorSpace;
      FS = new THREE.Scene(); FS.add(new THREE.HemisphereLight(0xffffff, 0xd8c4b0, 2.4)); const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(1.5, 3, 2); FS.add(d); FC = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
    }
    const box = new THREE.Box3().setFromObject(o); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()); const r = Math.max(sz.x, sz.y, sz.z) * 0.62;
    FC.position.set(c.x + r * 1.5, c.y + r * 1.9, c.z + r * 3.0); FC.lookAt(c); FC.updateProjectionMatrix();
    FS.add(o); FR.render(FS, FC); FS.remove(o);
    const u = FR.domElement.toDataURL(); FIC.set(i, u); return u;
  } catch (e) { return null; }
}
