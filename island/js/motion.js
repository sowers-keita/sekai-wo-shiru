// しぜんな うごき（Mixamo のモーションを ほねの「むき」に なおしたもの・assets/motions.json）
// どうぶつも にんげんも おなじ ほね（body/head/armR/armL/legR/legL）なので ぜんいん つかえる
import * as THREE from 'three';
let MOT = null;
export async function loadMotions(base = '') {
  try { MOT = await fetch(base + 'assets/motions.json').then((r) => (r.ok ? r.json() : null)); } catch (e) { MOT = null; }
  if (MOT) for (const m of Object.values(MOT)) m.q = m.frames.map((fd) => { const o = {}; for (const b of BONES) o[b] = new THREE.Quaternion(...fd[b]); o.bp = fd.bp; return o; });
  return !!MOT;
}
export const hasMotions = () => !!MOT;
export const BONES = ['body', 'head', 'armR', 'armL', 'legR', 'legL'];
const HIP0 = 1.03;
const ID = new THREE.Quaternion();
const DAMP = { body: 0.45, head: 0.55, armR: 1, armL: 1, legR: 0.85, legL: 0.85 };
// t びょうめの ポーズ（ループ）
function sample(key, t, out) {
  const m = MOT[key]; const n = m.len; const ft = ((t * m.fps) % n + n) % n; const i0 = Math.floor(ft), i1 = (i0 + 1) % n, a = ft - i0;
  const A = m.q[i0], B = m.q[i1];
  for (const b of BONES) (out[b] || (out[b] = new THREE.Quaternion())).slerpQuaternions(A[b], B[b], a);
  // あたまが おおきい 2とうしん むけに からだ・あたまの かたむきを ひかえめに
  for (const b of BONES) { const k = DAMP[b]; if (k < 1) out[b].slerp(ID, 1 - k); }
  out.y = (A.bp[1] * (1 - a) + B.bp[1] * a) - HIP0; out.x = A.bp[0] * (1 - a) + B.bp[0] * a;
  return out;
}
// モードから うごきを えらぶ（null なら いままでの てづくりの うごき）
export function pickMotion(mode, speed, ch) {
  if (!MOT) return null;
  if (mode === 'sleep' || mode === 'cook' || mode === 'eat' || mode === 'surprise') return null;
  if (mode === 'sit') return 'sit';
  if (mode === 'dance') return 'dance';
  if (mode === 'wave') return 'wave';
  if (mode === 'joy' || mode === 'cheer') return 'joy';
  if (mode === 'sad') return 'sad';
  if (mode === 'stomp') return 'angry';
  if (speed > 2.0) return 'run';
  if (speed > 0.1) return 'walk';
  if (ch.act === 'sulk') return 'angry';
  if (ch.act === 'laugh') return 'clap';
  if (ch.act === 'shy' || ch.act === 'trouble') return null;
  if (ch.talking) return 'talk';
  return 'idle';
}
const P1 = {}, P2 = {};
const _q = new THREE.Quaternion();
// ch：AnimalCharacter（ほね＝ch._bone）。てづくりの うごきの あとに よぶ
export function applyMotion(ch, t, speed, dt, mode) {
  const key = pickMotion(mode, speed, ch);
  const M = ch._mo || (ch._mo = { key: null, t: 0, prev: null, pt: 0, w: 1 });
  if (key !== M.key) { M.prev = M.key; M.pt = M.t; M.key = key; M.t = Math.random() * 2; M.w = 0; }
  const rate = key === 'walk' ? Math.max(0.6, speed * 1.25) : key === 'run' ? Math.max(0.8, speed * 0.42) : 1;
  M.t += dt * rate; M.pt += dt; M.w = Math.min(1, M.w + dt * 4);
  if (!key && (!M.prev || M.w >= 1)) return false;
  const bone = ch._bone; if (!bone) return false;
  const B = ch._mb || (ch._mb = Object.fromEntries(BONES.map((b) => [b, bone(b)])));
  const cur = key ? sample(key, M.t, P1) : null; const prv = M.prev && M.w < 1 ? sample(M.prev, M.pt, P2) : null;
  const sitUpper = key === 'sit'; // すわる ときは うわはんしん だけ（いすの たかさは てづくりの まま）
  for (const b of BONES) {
    const o = B[b]; if (!o) continue;
    if (sitUpper && (b === 'legR' || b === 'legL' || b === 'body')) continue;
    if (cur && prv) { _q.slerpQuaternions(prv[b], cur[b], M.w); o.quaternion.copy(_q); }
    else if (cur) { if (M.w < 1) o.quaternion.slerp(cur[b], M.w); else o.quaternion.copy(cur[b]); }
    else if (prv) o.quaternion.slerp(prv[b], 1 - M.w);
  }
  // こしの うえした（キャラの こしの たかさに あわせて ちいさく）
  const bb = B.body; if (bb && !sitUpper) { if (!bb.userData.p0) bb.userData.p0 = bb.position.clone(); const k = (bb.userData.p0.y / HIP0) * 1.6; const y = cur ? cur.y : 0, x = cur ? cur.x : 0; bb.position.set(bb.userData.p0.x + x * k, bb.userData.p0.y + y * k, bb.userData.p0.z); }
  if (key && !sitUpper && ch.body) { ch.body.position.y = 0; ch.body.rotation.set(0, 0, 0); }
  return true;
}
