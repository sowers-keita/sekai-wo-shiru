// チャンクのメッシュ生成（立方体はAOつき・ほかは形ごとのジオメトリ）
import { B, tile, tileUV, PAT, COLORS, WOODS, hx } from './blocks.js';

const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], k: 'side' },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], k: 'side' },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], k: 'top' },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], k: 'bot' },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], k: 'back' },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], k: 'front' },
];
function projUV(fi, p) {
  switch (fi) { case 0: return [1 - p[2], p[1]]; case 1: return [p[2], p[1]]; case 2: return [p[0], 1 - p[2]]; case 3: return [p[0], p[2]]; case 4: return [p[0], p[1]]; default: return [1 - p[0], p[1]]; }
}
const AO = [0.5, 0.68, 0.84, 1];

export class Geo {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  vert(p, n, uv, c) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]); if (this.tint) this.col.push(c * this.tint[0], c * this.tint[1], c * this.tint[2]); else this.col.push(c, c, c); if (this.sw) this.sw.push(this.swv || 0); return this.n++; }
  quad(ps, n, uvs, cs, flip) {
    const a = this.vert(ps[0], n, uvs[0], cs[0]), b = this.vert(ps[1], n, uvs[1], cs[1]), c = this.vert(ps[2], n, uvs[2], cs[2]), d = this.vert(ps[3], n, uvs[3], cs[3]);
    if (flip) this.idx.push(a, b, d, b, c, d); else this.idx.push(a, b, c, a, c, d);
  }
  tri(ps, n, uvs, c) { const a = this.vert(ps[0], n, uvs[0], c), b = this.vert(ps[1], n, uvs[1], c), d = this.vert(ps[2], n, uvs[2], c); this.idx.push(a, b, d); }
  out() { const o = { pos: new Float32Array(this.pos), nor: new Float32Array(this.nor), uv: new Float32Array(this.uv), col: new Float32Array(this.col), idx: this.n > 65000 ? new Uint32Array(this.idx) : new Uint16Array(this.idx) }; if (this.sw) o.sw = new Float32Array(this.sw); return o; }
}
const BLOB = tile('blob', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5) / 15.5; P.set(x, y, [20, 14, 10], Math.max(0, Math.round(Math.pow(Math.max(0, 1 - d), 1.4) * 120))); } });
const NOBLOB = new Set(['chimney', 'baywindow', 'archwindow', 'dormer', 'bridge', 'spiral', 'column', 'rcolumn', 'curtain', 'aircon', 'clock', 'sign', 'torii', 'koinobori', 'parasol']);
const tuv = (t, u, v) => { const r = tileUV[t]; u = Math.min(1, Math.max(0, u)); v = Math.min(1, Math.max(0, v)); return [r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v]; };
function rotP(p, r) { let [x, y, z] = p; for (let i = 0; i < r; i++) { const nx = 1 - z, nz = x; x = nx; z = nz; } return [x, y, z]; }
function rotN(n, r) { let [x, y, z] = n; for (let i = 0; i < r; i++) { const nx = -z, nz = x; x = nx; z = nz; } return [x, y, z]; }
const ftile = (tiles, k) => (typeof tiles === 'number' ? tiles : tiles[k] ?? tiles.side ?? tiles.top);

// 箱（0..1座標）
export function emitBox(g, bx, by, bz, b, tiles, rot = 0, shade = 1, skipBottom = false) {
  for (let fi = 0; fi < 6; fi++) {
    if (fi === 3 && skipBottom) continue;
    const F = FACES[fi], t = ftile(tiles, F.k);
    if (t < 0) continue;
    const ps = [], uvs = [];
    for (const c of F.c) { const p = [c[0] ? b[3] : b[0], c[1] ? b[4] : b[1], c[2] ? b[5] : b[2]]; const uv = projUV(fi, p); uvs.push(tuv(t, uv[0], uv[1])); const rp = rotP(p, rot); ps.push([rp[0] + bx, rp[1] + by, rp[2] + bz]); }
    g.quad(ps, rotN(F.n, rot), uvs, [shade, shade, shade, shade]);
  }
}

// 高さ関数の形（屋根）
const HF = {
  slope: [(x, z) => z, 2], slopeLow: [(x, z) => 0.5 * z, 2], slopeHigh: [(x, z) => 0.5 + 0.5 * z, 2],
  cornerOut: [(x, z) => Math.min(x, z), 2], cornerIn: [(x, z) => Math.max(x, z), 2],
  ridge: [(x, z) => 1 - Math.abs(2 * z - 1), 2], ridgeLow: [(x, z) => 0.5 * (1 - Math.abs(2 * z - 1)), 2],
  pyramid: [(x, z) => 1 - Math.max(Math.abs(2 * x - 1), Math.abs(2 * z - 1)), 2],
  dome: [(x, z) => Math.sqrt(Math.max(0, 1 - ((2 * x - 1) ** 2 + (2 * z - 1) ** 2) / 2)), 4],
  barrel: [(x, z) => Math.sqrt(Math.max(0, 1 - (2 * z - 1) ** 2)), 4],
};
function emitHF(g, bx, by, bz, h, res, t, rot, skipBottom) {
  const P = (x, y, z) => { const r = rotP([x, y, z], rot); return [r[0] + bx, r[1] + by, r[2] + bz]; };
  const s = 1 / res;
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const x0 = i * s, x1 = x0 + s, z0 = j * s, z1 = z0 + s;
    const a = [x0, h(x0, z0), z0], b = [x1, h(x1, z0), z0], c = [x1, h(x1, z1), z1], d = [x0, h(x0, z1), z1];
    const hc = h(x0 + s / 2, z0 + s / 2);
    const tris = Math.abs((a[1] + c[1]) / 2 - hc) <= Math.abs((b[1] + d[1]) / 2 - hc) ? [[d, c, a], [c, b, a]] : [[d, c, b], [d, b, a]];
    for (const tr of tris) {
      const u = [tr[1][0] - tr[0][0], tr[1][1] - tr[0][1], tr[1][2] - tr[0][2]], v = [tr[2][0] - tr[0][0], tr[2][1] - tr[0][1], tr[2][2] - tr[0][2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; n = n.map((q) => q / l);
      g.tri(tr.map((p) => P(...p)), rotN(n, rot), tr.map((p) => tuv(t, p[0], 1 - p[2])), 1);
    }
  }
  // 側面
  for (let fi of [0, 1, 4, 5]) {
    const F = FACES[fi], bl = F.c[0], br = F.c[1];
    for (let k = 0; k < res; k++) {
      const t0 = k * s, t1 = t0 + s;
      const q0 = [bl[0] + (br[0] - bl[0]) * t0, 0, bl[2] + (br[2] - bl[2]) * t0], q1 = [bl[0] + (br[0] - bl[0]) * t1, 0, bl[2] + (br[2] - bl[2]) * t1];
      const h0 = h(q0[0], q0[2]), h1 = h(q1[0], q1[2]);
      if (h0 < 0.001 && h1 < 0.001) continue;
      const ps = [P(q0[0], 0, q0[2]), P(q1[0], 0, q1[2]), P(q1[0], h1, q1[2]), P(q0[0], h0, q0[2])];
      const sh = 0.92;
      g.quad(ps, rotN(F.n, rot), [tuv(t, t0, 0), tuv(t, t1, 0), tuv(t, t1, h1), tuv(t, t0, h0)], [sh, sh, sh, sh]);
    }
  }
  if (!skipBottom) emitBox(g, bx, by, bz, [0, 0, 0, 1, 0.001, 1], { top: -1, bot: t, side: -1 }, 0);
}

// ---------- 家具モデル
const MT = {};
function mt() {
  if (MT.ready) return MT;
  MT.wood = tile('plankオーク', null); MT.dark = tile('plankダークオーク', null); MT.birch = tile('plankシラカバ', null); MT.cherry = tile('plankサクラ', null);
  MT.white = tile('concしろ', null); MT.black = tile('concくろ', null); MT.gray = tile('concはいいろ', null); MT.lgray = tile('concうすはい', null);
  MT.metal = tile('m_metal', PAT.metal('#c8ccd0')); MT.stone = tile('stいし', null); MT.cobble = tile('stまるいし', null);
  MT.leaf = tile('leafオーク', null); MT.dirt = tile('dirt', null); MT.sand = tile('sand', null); MT.water = tile('water', null); MT.glass = tile('glass', null);
  MT.screen = tile('m_screen', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, [30 + y * 2, 60 + y * 3, 120 + x * 2]); for (let i = 0; i < 20; i++) P.set(Math.floor(P.r() * 32), Math.floor(P.r() * 20), [255, 255, 255]); });
  MT.clock = tile('m_clock', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy); P.set(x, y, r > 14 ? [120, 80, 50] : r > 12 ? [230, 200, 120] : (Math.abs(dx) < 1 && dy < 0 && dy > -10) || (Math.abs(dy) < 1 && dx > 0 && dx < 7) ? [40, 40, 40] : [250, 248, 240]); } });
  MT.keys = tile('m_keys', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, x % 4 === 0 ? [80, 80, 80] : y < 16 && x % 4 === 2 ? [20, 20, 20] : [250, 250, 248]); });
  MT.fire = tile('m_fire', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = P.vn(x, y, 8); P.set(x, y, n + y / 40 > 0.75 ? [255, 230, 120] : n + y / 40 > 0.5 ? [255, 140, 40] : [220, 60, 20], y > 6 || n > 0.55 ? 255 : 0); } });
  MT.paper = tile('m_paper', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, mul3([250, 238, 200], 0.95 + P.r() * 0.05)); });
  MT.red = tile('m_red', PAT.soft('#d8302a', 0.1)); MT.pot = tile('m_pot', PAT.terracotta('#b8603a')); MT.mirror = tile('m_mirror', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, x < 2 || x > 29 || y < 2 || y > 29 ? [180, 140, 80] : [200 + y, 220 + y / 2, 240]); }); MT.gold = tile('gemきん', null); MT.rope = tile('m_rope', PAT.thatch('#c8a878')); MT.cab = tile('m_cab', (P) => { PAT.flat('#e8e2d8')(P); for (let y = 0; y < 32; y++) P.set(15, y, [170, 160, 150]); for (let x = 0; x < 32; x++) { P.set(x, 0, [200, 190, 180]); } P.set(12, 14, [90, 90, 90]); P.set(19, 14, [90, 90, 90]); }); MT.fur = (c) => tile('wool' + COLORS[c][0], null);
  MT.board = tile('m_board', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, [40 + P.r() * 10, 70 + P.r() * 10, 50]); for (let i = 0; i < 30; i++) P.set(8 + Math.floor(P.r() * 16), 8 + Math.floor(P.r() * 10), [240, 240, 230]); });
  MT.fish = tile('m_fish', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, [80, 170, 230], 150); for (let k = 0; k < 4; k++) { const cx = 4 + P.r() * 22, cy = 6 + P.r() * 18; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) P.set(Math.floor(cx + i), Math.floor(cy + j), [250, 140, 40]); } });
  MT.ready = true; return MT;
}
const mul3 = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const bx = (x0, y0, z0, x1, y1, z1, t, g, tr) => ({ b: [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16], t, g, tr });
const legs4 = (h, t, inset = 1, w = 2) => [bx(inset, 0, inset, inset + w, h, inset + w, t), bx(16 - inset - w, 0, inset, 16 - inset, h, inset + w, t), bx(inset, 0, 16 - inset - w, inset + w, h, 16 - inset, t), bx(16 - inset - w, 0, 16 - inset - w, 16 - inset, h, 16 - inset, t)];
const modelCache = new Map();
export function modelBoxes(name, ci = 0) {
  const key = name + ':' + ci; if (modelCache.has(key)) return modelCache.get(key);
  const M = mt(), W = M.wood, F = M.fur(ci ?? 0);
  let r;
  switch (name) {
    case 'table': r = [bx(0, 13, 0, 16, 15, 16, W), ...legs4(13, W)]; break;
    case 'smalltable': r = [bx(2, 10, 2, 14, 12, 14, W), ...legs4(10, W, 3)]; break;
    case 'roundtable': r = [bx(1, 13, 1, 15, 15, 15, F), bx(7, 0, 7, 9, 13, 9, M.metal), bx(4, 0, 4, 12, 1, 12, M.metal)]; break;
    case 'chabudai': r = [bx(1, 6, 1, 15, 8, 15, M.cherry), ...legs4(6, M.dark, 3)]; break;
    case 'kotatsu': r = [bx(0, 6, 0, 16, 8, 16, W), bx(-1, 1, -1, 17, 6, 17, F)]; break;
    case 'chair': r = [bx(2, 7, 2, 14, 9, 14, ci ? M.white : W), ...legs4(7, ci ? M.white : W, 2), bx(2, 9, 12, 14, 20, 14, ci ? M.white : W)]; break;
    case 'stool': r = [bx(3, 8, 3, 13, 10, 13, M.red), ...legs4(8, M.metal, 4, 1)]; break;
    case 'bench': r = [bx(0, 6, 3, 16, 8, 13, W), bx(0, 8, 12, 16, 15, 13, W), bx(1, 0, 4, 3, 6, 12, M.metal), bx(13, 0, 4, 15, 6, 12, M.metal)]; break;
    case 'tv': r = [bx(1, 0, 5, 15, 4, 12, M.dark), bx(0, 4, 7, 16, 14, 9, { side: M.black, front: M.screen, back: M.black, top: M.black, bot: M.black })]; break;
    case 'pc': r = [bx(0, 0, 0, 16, 10, 16, W), bx(3, 10, 8, 13, 17, 9, { side: M.black, front: M.screen }), bx(7, 10, 9, 9, 13, 10, M.black), bx(3, 10, 3, 13, 11, 6, M.lgray)]; break;
    case 'fridge': r = [bx(1, 0, 1, 15, 31, 15, { side: M.white, front: tile('m_fridge', (P) => { PAT.flat('#f2f2ee')(P); for (let x = 0; x < 32; x++) P.set(x, 12, [180, 180, 180]); for (let y = 3; y < 9; y++) P.set(26, y, [150, 150, 150]); for (let y = 16; y < 28; y++) P.set(26, y, [150, 150, 150]); }) })]; break;
    case 'kitchen': r = [bx(0, 0, 1, 16, 14, 16, { side: M.white, front: M.cab }), bx(0, 14, 0, 16, 16, 16, M.lgray)]; break;
    case 'sink': r = [bx(0, 0, 1, 16, 14, 16, M.white), bx(0, 14, 0, 16, 16, 3, M.lgray), bx(0, 14, 13, 16, 16, 16, M.lgray), bx(0, 14, 3, 2, 16, 13, M.lgray), bx(14, 14, 3, 16, 16, 13, M.lgray), bx(2, 12, 3, 14, 13, 13, M.water), bx(7, 16, 13, 9, 21, 15, M.metal), bx(7, 19, 9, 9, 21, 13, M.metal)]; break;
    case 'stove': r = [bx(0, 0, 1, 16, 14, 16, M.black), bx(0, 14, 0, 16, 16, 16, M.gray), bx(3, 16, 3, 7, 17, 7, M.black), bx(9, 16, 9, 13, 17, 13, M.black), bx(4, 17, 4, 6, 17.5, 6, M.fire, 1)]; break;
    case 'bath': r = [bx(0, 0, 0, 16, 10, 2, M.white), bx(0, 0, 14, 16, 10, 16, M.white), bx(0, 0, 2, 2, 10, 14, M.white), bx(14, 0, 2, 16, 10, 14, M.white), bx(2, 0, 2, 14, 7, 14, M.water)]; break;
    case 'toilet': r = [bx(4, 0, 2, 12, 7, 12, M.white), bx(3, 7, 1, 13, 8, 13, M.white), bx(3, 7, 12, 13, 18, 16, M.white)]; break;
    case 'washbasin': r = [bx(5, 0, 8, 11, 10, 14, M.white), bx(2, 10, 4, 14, 13, 16, M.white), bx(3, 13, 14, 13, 26, 15, M.glass)]; break;
    case 'dresser': r = [bx(1, 0, 3, 15, 16, 16, { side: W, front: tile('m_drawer', (P) => { PAT.planks('#b8945a')(P); for (const yy of [10, 21]) for (let x = 0; x < 32; x++) P.set(x, yy, [90, 60, 30]); for (const yy of [5, 16, 27]) { P.set(15, yy, [230, 200, 90]); P.set(16, yy, [230, 200, 90]); } }) })]; break;
    case 'closet': r = [bx(0, 0, 4, 16, 31, 16, { side: W, front: tile('m_closet', (P) => { PAT.planks('#a07a48')(P); for (let y = 0; y < 32; y++) P.set(15, y, [70, 45, 25]); P.set(13, 16, [230, 200, 90]); P.set(18, 16, [230, 200, 90]); }) })]; break;
    case 'clock': r = [bx(2, 2, 14, 14, 14, 16, { side: W, front: M.clock })]; break;
    case 'grandclock': r = [bx(3, 0, 5, 13, 30, 13, { side: M.dark, front: M.dark }), bx(4, 20, 4, 12, 28, 5, { side: M.dark, front: M.clock })]; break;
    case 'piano': r = [bx(0, 0, 8, 16, 18, 16, M.black), bx(0, 9, 3, 16, 11, 8, { side: M.black, top: M.keys }), bx(1, 0, 3, 3, 9, 5, M.black), bx(13, 0, 3, 15, 9, 5, M.black)]; break;
    case 'pot': r = [bx(5, 0, 5, 11, 6, 11, M.pot), bx(4, 6, 4, 12, 13, 12, M.leaf)]; break;
    case 'bigplant': r = [bx(4, 0, 4, 12, 7, 12, M.white), bx(7, 7, 7, 9, 18, 9, M.dark), bx(1, 14, 1, 15, 28, 15, M.leaf)]; break;
    case 'bin': r = [bx(4, 0, 4, 12, 11, 12, M.metal), bx(3, 11, 3, 13, 12, 13, M.gray)]; break;
    case 'mailbox': r = [bx(7, 0, 7, 9, 12, 9, M.dark), bx(4, 12, 3, 12, 20, 13, F)]; break;
    case 'sign': r = [bx(7, 0, 7, 9, 12, 9, W), bx(1, 12, 7, 15, 22, 9, M.paper)]; break;
    case 'barrel': r = [bx(2, 0, 2, 14, 16, 14, { side: tile('m_barrel', (P) => { PAT.planks('#8a6a3a')(P); for (const yy of [4, 27]) for (let x = 0; x < 32; x++) { P.set(x, yy, [70, 70, 75]); P.set(x, yy + 1, [70, 70, 75]); } }), top: tile('logTオーク', null) })]; break;
    case 'chest': r = [bx(1, 0, 1, 15, 14, 15, { side: tile('m_chest', (P) => { PAT.planks('#a8743a')(P); for (let x = 0; x < 32; x++) P.set(x, 14, [60, 40, 20]); for (let y = 12; y < 19; y++) { P.set(15, y, [230, 200, 80]); P.set(16, y, [230, 200, 80]); } }), top: W })]; break;
    case 'vase': r = [bx(5, 0, 5, 11, 2, 11, F), bx(4, 2, 4, 12, 10, 12, F), bx(6, 10, 6, 10, 14, 10, F)]; break;
    case 'blackboard': r = [bx(0, 6, 14, 16, 26, 16, { side: W, front: M.board })]; break;
    case 'bear': r = [bx(4, 0, 5, 12, 8, 11, F), bx(5, 8, 5, 11, 14, 11, F), bx(5, 13, 7, 7, 15, 9, F), bx(9, 13, 7, 11, 15, 9, F), bx(7, 10, 4, 9, 11, 5, M.black)]; break;
    case 'bunny': r = [bx(4, 0, 5, 12, 8, 11, F), bx(5, 8, 5, 11, 14, 11, F), bx(5, 14, 7, 7, 20, 8, F), bx(9, 14, 7, 11, 20, 8, F)]; break;
    case 'cake': r = [bx(3, 0, 3, 13, 7, 13, { side: tile('m_cake', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, y < 8 ? [250, 245, 240] : y % 10 < 3 ? [240, 120, 140] : [250, 220, 170]); }), top: M.white }), bx(7, 7, 7, 9, 10, 9, M.red)]; break;
    case 'lowshelf': r = [bx(0, 0, 6, 16, 12, 16, { side: W, front: tile('books', null) })]; break;
    case 'mirror': r = [bx(3, 0, 13, 13, 28, 16, { side: W, front: M.mirror })]; break;
    case 'fireplace': r = [bx(0, 0, 8, 16, 20, 16, M.cobble), bx(-1, 18, 6, 17, 20, 16, M.dark), bx(3, 1, 7, 13, 9, 8, M.fire, 1)]; break;
    case 'fan': r = [bx(6, 0, 6, 10, 1, 10, M.white), bx(7, 1, 7, 9, 14, 9, M.white), bx(3, 12, 6, 13, 22, 8, tile('m_fan', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const r2 = Math.hypot(x - 15.5, y - 15.5), a = Math.atan2(y - 15.5, x - 15.5); P.set(x, y, [120, 200, 240], r2 < 15 && (Math.sin(a * 3) > 0 || r2 < 3) ? 255 : 0); } }))]; break;
    case 'radio': r = [bx(2, 0, 5, 14, 8, 11, F), bx(3, 2, 4.5, 8, 6, 5, M.gray), bx(12, 8, 7, 13, 14, 8, M.metal)]; break;
    case 'console': r = [bx(3, 0, 4, 13, 3, 12, M.black), bx(4, 3, 6, 12, 4, 10, M.red)]; break;
    case 'slide': r = [bx(12, 0, 2, 16, 16, 14, F), bx(0, 0, 3, 12, 2, 13, M.metal), bx(6, 2, 3, 12, 9, 13, M.metal)]; break;
    case 'swing': r = [bx(0, 0, 7, 2, 28, 9, F), bx(14, 0, 7, 16, 28, 9, F), bx(0, 28, 7, 16, 30, 9, F), bx(4, 6, 6, 12, 7, 10, W), bx(5, 7, 7.5, 5.5, 28, 8.5, M.metal), bx(10.5, 7, 7.5, 11, 28, 8.5, M.metal)]; break;
    case 'sandbox': r = [bx(0, 0, 0, 16, 4, 1, W), bx(0, 0, 15, 16, 4, 16, W), bx(0, 0, 1, 1, 4, 15, W), bx(15, 0, 1, 16, 4, 15, W), bx(1, 0, 1, 15, 3, 15, M.sand)]; break;
    case 'fountain': r = [bx(0, 0, 0, 16, 5, 16, M.stone), bx(1, 4, 1, 15, 5.2, 15, M.water), bx(6, 5, 6, 10, 14, 10, M.stone), bx(4, 14, 4, 12, 16, 12, M.stone), bx(5, 16, 5, 11, 16.5, 11, M.water)]; break;
    case 'koinobori': r = [bx(7, 0, 7, 9, 32, 9, M.white), bx(9, 22, 7.5, 20, 27, 8.5, M.red), bx(9, 15, 7.5, 18, 20, 8.5, tile('conc' + 'あお', null))]; break;
    case 'xmastree': r = [bx(6, 0, 6, 10, 4, 10, M.dark), bx(1, 4, 1, 15, 12, 15, M.leaf), bx(3, 12, 3, 13, 20, 13, M.leaf), bx(5, 20, 5, 11, 27, 11, M.leaf), bx(7, 27, 7, 9, 30, 9, M.gold, 1)]; break;
    case 'snowman': { const s = tile('snow', null); r = [bx(2, 0, 2, 14, 11, 14, s), bx(4, 11, 4, 12, 19, 12, s), bx(7, 14, 3, 9, 15, 4, tile('concオレンジ', null)), bx(4, 19, 4, 12, 20, 12, M.black), bx(5, 20, 5, 11, 25, 11, M.black)]; break; }
    case 'scarecrow': r = [bx(7, 0, 7, 9, 26, 9, W), bx(0, 18, 7, 16, 20, 9, W), bx(4, 10, 6, 12, 20, 10, tile('woolあお', null)), bx(5, 20, 5, 11, 26, 11, tile('hayT', null)), bx(3, 26, 3, 13, 27, 13, tile('hayT', null))]; break;
    case 'campfire': r = [bx(1, 0, 3, 15, 3, 6, tile('logオーク', null)), bx(1, 0, 10, 15, 3, 13, tile('logオーク', null)), bx(4, 1, 4, 12, 12, 12, M.fire, 1)]; break;
    case 'tent': r = [bx(0, 0, 0, 16, 1, 16, F), bx(1, 1, 1, 15, 4, 15, F), bx(3, 4, 1, 13, 8, 15, F), bx(5, 8, 1, 11, 11, 15, F), bx(7, 11, 1, 9, 13, 15, F)]; break;
    case 'parasol': r = [bx(7.5, 0, 7.5, 8.5, 26, 8.5, M.white), bx(-6, 24, -6, 22, 26, 22, F), bx(-2, 26, -2, 18, 28, 18, F), bx(4, 28, 4, 12, 29, 12, F)]; break;
    case 'hammock': r = [bx(0, 0, 7, 1, 16, 9, W), bx(15, 0, 7, 16, 16, 9, W), bx(1, 6, 4, 15, 8, 12, F)]; break;
    case 'vending': r = [bx(0, 0, 3, 16, 31, 16, { side: F, front: tile('m_vend', (P) => { PAT.flat('#d8302a')(P); for (let y = 3; y < 20; y++) for (let x = 3; x < 29; x++) P.set(x, y, (x % 6 < 3 && y % 6 < 4) ? [[240, 200, 60], [60, 160, 240], [240, 240, 240]][(x + y) % 3] : [30, 30, 40]); for (let y = 23; y < 28; y++) for (let x = 4; x < 28; x++) P.set(x, y, [30, 30, 30]); }) })]; break;
    case 'phonebox': r = [bx(0, 0, 0, 16, 1, 16, F), bx(0, 31, 0, 16, 32, 16, F), bx(0, 1, 0, 1, 31, 1, F), bx(15, 1, 0, 16, 31, 1, F), bx(0, 1, 15, 1, 31, 16, F), bx(15, 1, 15, 16, 31, 16, F), bx(1, 1, 0.5, 15, 31, 1, M.glass), bx(0.5, 1, 1, 1, 31, 15, M.glass), bx(15, 1, 1, 15.5, 31, 15, M.glass), bx(1, 1, 15, 15, 31, 15.5, M.glass), bx(6, 14, 13, 10, 20, 15, M.gray)]; break;
    case 'well': r = [bx(0, 0, 0, 16, 8, 2, M.cobble), bx(0, 0, 14, 16, 8, 16, M.cobble), bx(0, 0, 2, 2, 8, 14, M.cobble), bx(14, 0, 2, 16, 8, 14, M.cobble), bx(2, 0, 2, 14, 5, 14, M.water), bx(0, 8, 7, 1, 24, 9, W), bx(15, 8, 7, 16, 24, 9, W), bx(-1, 24, 2, 17, 26, 14, tile('roofくろがわら', null))]; break;
    case 'torii': r = [bx(1, 0, 6, 4, 32, 9, M.red), bx(12, 0, 6, 15, 32, 9, M.red), bx(-4, 26, 5, 20, 28, 10, M.red), bx(-6, 30, 4, 22, 32, 11, M.black)]; break;
    case 'offering': r = [bx(1, 0, 4, 15, 10, 12, { side: M.dark, top: tile('m_grill', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, x % 4 < 2 ? [40, 30, 20] : [120, 80, 50]); }) })]; break;
    case 'hokora': r = [bx(2, 0, 2, 14, 2, 14, M.stone), bx(3, 2, 3, 13, 12, 13, W), bx(1, 12, 1, 15, 14, 15, tile('roofくろがわら', null)), bx(6, 3, 2.5, 10, 9, 3, tile('m_red', null))]; break;
    case 'bonsai': r = [bx(3, 0, 4, 13, 3, 12, M.pot), bx(7, 3, 7, 9, 8, 9, M.dark), bx(2, 7, 5, 9, 10, 11, M.leaf), bx(8, 9, 6, 14, 12, 10, M.leaf)]; break;
    case 'shishi': r = [bx(2, 0, 2, 14, 3, 14, M.stone), bx(3, 3, 3, 13, 3.5, 13, M.water), bx(2, 3, 7, 4, 10, 9, tile('logタケ', null)), bx(4, 8, 7.5, 14, 10, 8.5, tile('logタケ', null))]; break;
    case 'engawa': r = [bx(0, 6, 0, 16, 8, 16, W), ...legs4(6, M.dark, 0, 2)]; break;
    case 'mikan': r = [bx(2, 0, 2, 14, 1, 14, M.white), bx(4, 1, 4, 8, 4, 8, tile('concオレンジ', null)), bx(8, 1, 7, 12, 4, 11, tile('concオレンジ', null))]; break;
    case 'pillow': r = [bx(3, 0, 5, 13, 3, 11, M.white)]; break;
    case 'futon': r = [bx(0, 0, 0, 16, 2, 16, M.white), bx(0, 2, 0, 16, 4, 12, F), bx(3, 2, 12, 13, 4, 15, M.white)]; break;
    case 'vanity': r = [bx(0, 0, 8, 16, 12, 16, M.white), bx(2, 12, 14, 14, 28, 16, { side: M.white, front: M.mirror }), bx(4, 12, 10, 6, 15, 12, F)]; break;
    case 'rack': r = [bx(0, 0, 7, 1, 28, 9, M.metal), bx(15, 0, 7, 16, 28, 9, M.metal), bx(0, 26, 7.5, 16, 27, 8.5, M.metal), bx(2, 12, 6, 6, 26, 10, tile('woolあか', null)), bx(7, 14, 6, 11, 26, 10, tile('woolきいろ', null)), bx(12, 12, 6, 15, 26, 10, tile('woolみずいろ', null))]; break;
    case 'plushtower': r = [bx(3, 0, 3, 13, 8, 13, F), bx(4, 8, 4, 12, 15, 12, M.fur(10)), bx(5, 15, 5, 11, 21, 11, M.fur(7)), bx(6, 21, 6, 10, 26, 10, M.fur(18))]; break;
    case 'aquarium': r = [bx(0, 0, 3, 16, 8, 13, M.dark), bx(0, 8, 3, 16, 20, 13, M.fish), bx(0, 20, 3, 16, 21, 13, M.black)]; break;
    case 'birdcage': r = [bx(4, 0, 4, 12, 1, 12, M.gold), bx(4, 1, 4, 12, 14, 12, tile('bars', null)), bx(6, 4, 7, 10, 8, 9, tile('concきいろ', null)), bx(7, 14, 7, 9, 18, 9, M.gold)]; break;
    case 'doghouse': r = [bx(1, 0, 1, 15, 12, 15, { side: F, front: tile('m_dogdoor', (P) => { PAT.planks('#c8322e')(P); for (let y = 12; y < 32; y++) for (let x = 9; x < 23; x++) if (y > 16 || (x - 16) ** 2 + (y - 17) ** 2 < 40) P.set(x, y, [20, 15, 10]); }) }), bx(0, 12, 0, 16, 14, 16, tile('roofあおがわら', null)), bx(2, 14, 0, 14, 17, 16, tile('roofあおがわら', null))]; break;
    case 'cattower': r = [bx(7, 0, 7, 9, 30, 9, M.rope), bx(1, 0, 1, 15, 2, 15, F), bx(2, 12, 2, 14, 14, 14, F), bx(4, 24, 4, 12, 26, 12, F), bx(5, 26, 5, 11, 30, 11, F)]; break;
    case 'artframe': r = [bx(1, 3, 14, 15, 4, 16, W), bx(1, 15, 14, 15, 16, 16, W), bx(1, 4, 14, 2, 15, 16, W), bx(14, 4, 14, 15, 15, 16, W), bx(2, 4, 15, 14, 15, 16, M.paper)]; break;
    case 'artflag': r = [bx(7, 0, 7, 9, 2, 9, M.dark), bx(7.5, 2, 7.5, 8.5, 30, 8.5, M.metal), bx(8.5, 18, 7.7, 16, 28, 8.3, M.paper)]; break;
    case 'artcushion': r = [bx(2, 0, 2, 14, 4, 14, F)]; break;
    case 'artshirt': r = [bx(7, 0, 7, 9, 2, 9, M.dark), bx(7.5, 2, 7.5, 8.5, 12, 8.5, M.metal), bx(3, 12, 7, 13, 22, 9, M.paper), bx(0, 18, 7, 3, 22, 9, M.paper), bx(13, 18, 7, 16, 22, 9, M.paper), bx(5, 22, 7.5, 11, 24, 8.5, M.metal)]; break;
    case 'doublebed': { const s = M.fur(ci); r = [bx(0, 0, 0, 16, 5, 16, W), bx(0, 5, 0, 16, 8, 16, M.white), bx(0, 8, 0, 16, 9, 11, s), bx(1, 8, 12, 7, 10, 15, M.white), bx(9, 8, 12, 15, 10, 15, M.white), bx(0, 0, 15, 16, 16, 16, W), bx(6, 16, 15, 10, 18, 16, W)]; break; }
    case 'stroller': r = [bx(2, 0, 2, 5, 3, 5, M.black), bx(11, 0, 2, 14, 3, 5, M.black), bx(2, 0, 11, 5, 3, 14, M.black), bx(11, 0, 11, 14, 3, 14, M.black), bx(3, 3, 3, 13, 10, 13, F), bx(3, 10, 9, 13, 15, 13, F), bx(7, 10, 0, 9, 16, 2, M.metal), bx(4, 15, 0, 12, 17, 2, M.black)]; break;
    case 'umbrellastand': r = [bx(4, 0, 4, 12, 10, 12, M.metal), bx(5, 10, 6, 6, 22, 7, tile('concあか', null)), bx(9, 10, 5, 10, 24, 6, tile('concあお', null)), bx(7, 10, 9, 8, 21, 10, tile('concきいろ', null)), bx(4, 21, 5, 7, 23, 8, tile('concあか', null))]; break;
    case 'skylight': r = [bx(0, 14, 0, 16, 16, 2, W), bx(0, 14, 14, 16, 16, 16, W), bx(0, 14, 2, 2, 16, 14, W), bx(14, 14, 2, 16, 16, 14, W), bx(2, 15, 2, 14, 15.5, 14, M.glass, false, true)]; break;
    case 'woodarch': r = [bx(0, 0, 6, 3, 30, 10, W), bx(13, 0, 6, 16, 30, 10, W), bx(-1, 28, 5, 17, 32, 11, W), bx(3, 26, 7, 13, 28, 9, W), bx(1, 20, 5, 3, 28, 11, M.leaf), bx(13, 18, 5, 15, 26, 11, M.leaf)]; break;
    case 'flowerborder': r = [bx(0, 0, 0, 16, 4, 2, M.cobble), bx(0, 0, 14, 16, 4, 16, M.cobble), bx(0, 0, 2, 2, 4, 14, M.cobble), bx(14, 0, 2, 16, 4, 14, M.cobble), bx(2, 0, 2, 14, 3, 14, M.dirt)]; break;
    case 'arcade': r = [bx(0, 0, 0, 2, 28, 2, M.white), bx(14, 0, 0, 16, 28, 2, M.white), bx(-1, 28, -1, 17, 30, 17, tile('concあか', null)), bx(0, 30, 2, 16, 31, 14, tile('concあか', null))]; break;
    case 'bed': { const s = M.fur(ci); r = [bx(0, 0, 0, 16, 5, 16, W), bx(0, 5, 0, 16, 8, 16, M.white), bx(0, 8, 0, 16, 9, 11, s), bx(2, 8, 12, 14, 10, 15, M.white), bx(0, 0, 15, 16, 14, 16, W)]; break; }
    case 'sofa': r = [bx(0, 0, 1, 16, 7, 15, F), bx(0, 7, 11, 16, 15, 15, F), bx(0, 7, 1, 2, 11, 11, F), bx(14, 7, 1, 16, 11, 11, F)]; break;
    case 'zabuton': r = [bx(2, 0, 2, 14, 2, 14, F)]; break;
    case 'toybox': r = [bx(1, 0, 2, 15, 10, 14, { side: tile('m_toy', (P) => { PAT.flat('#f5cf30')(P); const cs = [[230, 70, 70], [70, 140, 230], [80, 190, 90]]; for (let i = 0; i < 6; i++) { const c = cs[i % 3], x0 = 2 + (i % 3) * 10, y0 = 4 + Math.floor(i / 3) * 14; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) P.set(x0 + x, y0 + y, c); } }), top: M.red }), bx(3, 10, 4, 7, 14, 8, tile('concみずいろ', null)), bx(9, 10, 6, 13, 13, 10, tile('concピンク', null))]; break;
    case 'petbed': r = [bx(1, 0, 1, 15, 2, 15, F), bx(1, 2, 1, 15, 5, 3, F), bx(1, 2, 13, 15, 5, 15, F), bx(1, 2, 3, 3, 5, 13, F), bx(13, 2, 3, 15, 5, 13, F), bx(3, 2, 3, 13, 3, 13, M.white)]; break;
    case 'stage': r = [bx(0, 0, 0, 16, 6, 16, { side: M.red, top: M.wood }), bx(0, 6, 15, 16, 30, 16, tile('m_curtain', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, [180 + Math.sin(x * 0.8) * 30, 30, 40]); }))]; break;
    case 'schooldesk': r = [bx(1, 11, 2, 15, 12, 10, W), bx(2, 0, 3, 3, 11, 9, M.metal), bx(13, 0, 3, 14, 11, 9, M.metal), bx(2, 6, 10, 14, 7, 15, W), bx(2, 0, 10, 3, 6, 11, M.metal), bx(13, 0, 10, 14, 6, 11, M.metal), bx(2, 7, 14, 14, 13, 15, W)]; break;
    case 'flowerbed': r = [bx(0, 0, 0, 16, 5, 16, M.cobble), bx(1, 5, 1, 15, 6, 15, M.dirt), bx(2, 6, 2, 6, 10, 6, tile('concあか', null)), bx(9, 6, 3, 13, 11, 7, tile('concきいろ', null)), bx(4, 6, 9, 8, 10, 13, tile('concピンク', null)), bx(10, 6, 10, 14, 9, 14, tile('concむらさき', null))]; break;
    case 'diningtable': r = [bx(0, 12, 0, 16, 14, 16, M.white), bx(-0.1, 10, -0.1, 16.1, 12, 16.1, tile('m_cloth', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, ((x >> 2) + (y >> 2)) % 2 ? [230, 80, 80] : [250, 250, 250]); })), bx(7, 0, 7, 9, 10, 9, W), bx(4, 0, 4, 12, 1, 12, W)]; break;
    case 'tallshelf': r = [bx(0, 0, 4, 16, 30, 16, { side: W, front: tile('books', null) })]; break;
    case 'easel': r = [bx(3, 0, 8, 4, 26, 9, W), bx(12, 0, 8, 13, 26, 9, W), bx(2, 10, 6, 14, 26, 7, tile('m_canvas', (P) => { PAT.flat('#fbfaf6')(P); for (let i = 0; i < 9; i++) { const c = [[240, 90, 90], [90, 160, 240], [250, 210, 60]][i % 3]; const cx = 6 + P.r() * 20, cy = 6 + P.r() * 20; for (let y = -3; y < 3; y++) for (let x = -3; x < 3; x++) if (x * x + y * y < 9) P.set(Math.floor(cx + x), Math.floor(cy + y), c); } }))]; break;
    case 'ballbox': r = [bx(1, 0, 1, 15, 8, 15, F), bx(3, 8, 3, 8, 13, 8, tile('concあか', null)), bx(8, 8, 7, 13, 13, 12, tile('concきいろ', null)), bx(4, 8, 9, 8, 12, 13, tile('concしろ', null))]; break;
    case 'rodstand': r = [bx(2, 0, 6, 14, 3, 10, W), bx(4, 3, 7.5, 5, 30, 8.5, M.dark), bx(8, 3, 7.5, 9, 28, 8.5, M.dark), bx(11, 3, 7.5, 12, 26, 8.5, M.dark), bx(3, 0, 11, 7, 4, 15, tile('concみずいろ', null))]; break;
    case 'bunkbed': { const s2 = M.fur(ci); r = [bx(0, 0, 0, 2, 31, 2, W), bx(14, 0, 0, 16, 31, 2, W), bx(0, 0, 14, 2, 31, 16, W), bx(14, 0, 14, 16, 31, 16, W), bx(1, 2, 1, 15, 6, 15, W), bx(1, 6, 1, 15, 8, 15, M.white), bx(1, 8, 1, 15, 9, 11, s2), bx(1, 18, 1, 15, 21, 15, W), bx(1, 21, 1, 15, 23, 15, M.white), bx(1, 23, 1, 15, 24, 11, M.fur(10)), bx(1, 24, 0, 15, 27, 1, W), bx(15, 4, 4, 16, 20, 5, W), bx(15, 4, 8, 16, 20, 9, W)]; break; }
    case 'loftbed': r = [bx(0, 0, 0, 2, 30, 2, W), bx(14, 0, 0, 16, 30, 2, W), bx(0, 0, 14, 2, 30, 16, W), bx(14, 0, 14, 16, 30, 16, W), bx(1, 20, 1, 15, 23, 15, W), bx(1, 23, 1, 15, 25, 15, M.white), bx(1, 25, 1, 15, 26, 11, M.fur(ci)), bx(2, 11, 8, 14, 12, 15, W), bx(3, 0, 13, 4, 11, 14, W), bx(12, 0, 13, 13, 11, 14, W)]; break;
    case 'curtain': r = [bx(0, 30, 14, 16, 31, 15, M.metal), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => bx(i * 2, 2, 13.6 + (i % 2) * 0.8, i * 2 + 2, 30, 14.4 + (i % 2) * 0.8, F))]; break;
    case 'washer': r = [bx(1, 0, 1, 15, 15, 15, { side: M.white, top: M.white, front: tile('m_washer', (P) => { PAT.flat('#f2f2ee')(P); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 17.5); if (d < 10) P.set(x, y, d < 8 ? [140, 200, 240] : [150, 150, 155]); } for (let x = 4; x < 12; x++) P.set(x, 4, [90, 90, 90]); }) })]; break;
    case 'seesaw': r = [bx(6, 0, 6, 10, 5, 10, M.red), bx(-8, 5, 6, 24, 6.5, 10, tile('concきいろ', null)), bx(-7, 6.5, 7, -5, 10, 9, M.red), bx(21, 6.5, 7, 23, 10, 9, M.red)]; break;
    case 'merry': { const cs = ['concあか', 'concみずいろ', 'concきいろ', 'concピンク'].map((k) => tile(k, null)); r = [bx(-6, 0, -6, 22, 2, 22, tile('concしろ', null)), bx(7, 2, 7, 9, 26, 9, M.gold), bx(-7, 26, -7, 23, 28, 23, M.red), bx(-3, 28, -3, 19, 30, 19, M.red), bx(2, 30, 2, 14, 32, 14, M.red), bx(-3, 6, 5, 1, 12, 11, cs[0]), bx(15, 6, 5, 19, 12, 11, cs[1]), bx(5, 6, -3, 11, 12, 1, cs[2]), bx(5, 6, 15, 11, 12, 19, cs[3]), bx(-2, 2, 7.5, -1, 26, 8.5, M.gold), bx(17, 2, 7.5, 18, 26, 8.5, M.gold)]; break; }
    case 'chimney': r = [bx(3, 0, 3, 13, 28, 13, tile('stレンガ', null)), bx(2, 28, 2, 14, 31, 14, tile('stレンガ', null)), bx(5, 31, 5, 11, 32, 11, M.black)]; break;
    case 'baywindow': r = [bx(0, 0, 0, 16, 2, 6, W), bx(0, 14, 0, 16, 16, 6, W), bx(0, 2, 0, 1, 14, 1, W), bx(15, 2, 0, 16, 14, 1, W), bx(0, 2, 5, 1, 14, 6, W), bx(15, 2, 5, 16, 14, 6, W), bx(1, 2, 0.4, 15, 14, 0.6, M.glass, 0, 1), bx(0.4, 2, 1, 0.6, 14, 5, M.glass, 0, 1), bx(15.4, 2, 1, 15.6, 14, 5, M.glass, 0, 1), bx(2, 2, 1, 6, 5, 5, tile('m_pot', null)), bx(2, 5, 1.5, 6, 9, 4.5, M.leaf)]; break;
    case 'archwindow': r = [bx(0, 0, 7, 16, 2, 9, M.white), bx(0, 2, 7, 2, 10, 9, M.white), bx(14, 2, 7, 16, 10, 9, M.white), bx(2, 10, 7, 3, 13, 9, M.white), bx(13, 10, 7, 14, 13, 9, M.white), bx(3, 13, 7, 5, 15, 9, M.white), bx(11, 13, 7, 13, 15, 9, M.white), bx(5, 15, 7, 11, 16, 9, M.white), bx(7.5, 2, 7.2, 8.5, 15, 8.8, M.white), bx(2, 2, 7.8, 14, 10, 8.2, M.glass, 0, 1), bx(3, 10, 7.8, 13, 13, 8.2, M.glass, 0, 1), bx(5, 13, 7.8, 11, 15, 8.2, M.glass, 0, 1)]; break;
    case 'dormer': { const rf = tile('roofあかがわら', null); r = [bx(2, 0, 4, 14, 10, 16, M.white), bx(4, 2, 3.8, 12, 8, 4, M.glass, 0, 1), bx(1, 10, 3, 15, 12, 16, rf), bx(3, 12, 3, 13, 14, 16, rf), bx(5, 14, 3, 11, 16, 16, rf)]; break; }
    case 'bridge': r = [bx(0, 0, 0, 16, 2, 16, W), bx(0, 2, 0, 2, 14, 2, M.dark), bx(0, 2, 14, 2, 14, 16, M.dark), bx(0, 11, 0.5, 16, 12, 1.5, M.rope), bx(0, 11, 14.5, 16, 12, 15.5, M.rope)]; break;
    case 'spiral': r = [bx(7, 0, 7, 9, 16, 9, M.metal), bx(0, 0, 0, 8, 1.5, 8, W), bx(8, 4, 0, 16, 5.5, 8, W), bx(8, 8, 8, 16, 9.5, 16, W), bx(0, 12, 8, 8, 13.5, 16, W)]; break;
    case 'deck': { const pw = tile('plank' + WOODS[ci][0], null); r = [bx(0, 14, 0.2, 16, 16, 3.8, pw), bx(0, 14, 4.2, 16, 16, 7.8, pw), bx(0, 14, 8.2, 16, 16, 11.8, pw), bx(0, 14, 12.2, 16, 16, 15.8, pw), bx(1, 0, 1, 3, 14, 3, pw), bx(13, 0, 13, 15, 14, 15, pw), bx(1, 0, 13, 3, 14, 15, pw), bx(13, 0, 1, 15, 14, 3, pw)]; break; }
    case 'column': r = [bx(2, 0, 2, 14, 2, 14, M.white), bx(4, 2, 4, 12, 14, 12, M.white), bx(2, 14, 2, 14, 16, 14, M.white), bx(3.5, 2, 3.5, 4.5, 14, 4.5, M.lgray), bx(11.5, 2, 11.5, 12.5, 14, 12.5, M.lgray)]; break;
    case 'rcolumn': r = [bx(4, 0, 5, 12, 16, 11, W), bx(5, 0, 4, 11, 16, 12, W)]; break;
    case 'screen': r = [bx(0, 0, 7, 1, 20, 9, M.dark), bx(15, 0, 7, 16, 20, 9, M.dark), bx(1, 2, 7.5, 15, 20, 8.5, tile('m_screenp', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, x % 8 === 0 || y % 8 === 0 ? [90, 60, 40] : [245, 238, 215]); }))]; break;
    case 'studydesk': r = [bx(0, 12, 4, 16, 14, 16, W), bx(0, 0, 4, 2, 12, 16, W), bx(14, 0, 4, 16, 12, 16, W), bx(1, 14, 13, 15, 22, 16, W), bx(2, 14, 13.5, 7, 19, 15.5, tile('books', null)), bx(11, 14, 6, 12, 20, 7, M.metal), bx(9, 19, 5, 13, 21, 9, tile('lampレモン', null), 1), bx(5, 14, 6, 10, 14.5, 10, M.paper)]; break;
    case 'randoseru': r = [bx(0, 0, 8, 16, 2, 16, W), bx(0, 14, 8, 16, 16, 16, W), bx(0, 2, 8, 1, 14, 16, W), bx(15, 2, 8, 16, 14, 16, W), bx(2, 3, 9, 7, 10, 15, M.red), bx(9, 3, 9, 14, 10, 15, tile('concくろ', null))]; break;
    case 'penguin': r = [bx(4, 0, 5, 12, 10, 11, tile('concくろ', null)), bx(5, 1, 4.8, 11, 9, 5, M.white), bx(5, 10, 6, 11, 15, 10, tile('concくろ', null)), bx(7, 11, 5.5, 9, 12, 6, tile('concオレンジ', null))]; break;
    case 'storage': r = [bx(0, 0, 6, 16, 24, 16, W), bx(1, 1, 5.5, 7, 7, 6, tile('concあか', null)), bx(9, 1, 5.5, 15, 7, 6, tile('concあお', null)), bx(1, 9, 5.5, 7, 15, 6, tile('concきいろ', null)), bx(9, 9, 5.5, 15, 15, 6, tile('concみどり', null)), bx(1, 17, 5.5, 15, 23, 6, tile('concピンク', null))]; break;
    case 'aircon': r = [bx(1, 10, 11, 15, 15, 16, { side: M.white, front: tile('m_aircon', (P) => { PAT.flat('#f6f6f2')(P); for (let x = 2; x < 30; x++) { P.set(x, 22, [170, 170, 170]); P.set(x, 25, [170, 170, 170]); } P.set(27, 6, [60, 200, 80]); }) })]; break;
    case 'counter': r = [bx(0, 0, 2, 16, 14, 16, { side: M.dark, front: M.cab }), bx(-1, 14, 0, 17, 16, 16, M.white)]; break;
    case 'bigtank': r = [bx(0, 0, 2, 16, 6, 14, M.dark), bx(0, 6, 2, 16, 28, 14, M.fish, 0, 1), bx(0, 28, 2, 16, 29, 14, M.black), bx(3, 6, 6, 5, 14, 8, M.leaf), bx(11, 6, 5, 13, 10, 7, M.stone)]; break;
    case 'display': r = [bx(2, 0, 2, 14, 10, 14, M.dark), bx(1, 10, 1, 15, 12, 15, M.white), bx(2, 12, 2, 14, 13, 14, tile('concあか', null)), bx(2, 13, 2, 2.5, 26, 2.5, M.glass, 0, 1), bx(2, 13, 2, 14, 26, 2.5, M.glass, 0, 1), bx(2, 13, 13.5, 14, 26, 14, M.glass, 0, 1), bx(2, 13, 2, 2.5, 26, 14, M.glass, 0, 1), bx(13.5, 13, 2, 14, 26, 14, M.glass, 0, 1), bx(2, 26, 2, 14, 27, 14, M.glass, 0, 1)]; break;
    case 'bugcage': r = [bx(2, 0, 2, 14, 2, 14, tile('concみどり', null)), bx(2, 2, 2, 14, 14, 14, tile('bars', null)), bx(2, 14, 2, 14, 16, 14, tile('concみどり', null)), bx(4, 2, 4, 12, 4, 12, M.leaf)]; break;
    case 'shell': r = [bx(2, 0, 3, 14, 5, 13, tile('concさくら', null)), bx(4, 5, 4, 12, 8, 12, tile('concさくら', null)), bx(6, 8, 6, 10, 10, 10, M.white)]; break;
    // あかり
    case 'chochin': r = [bx(4, 4, 4, 12, 14, 12, tile('m_chochin', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, y % 5 === 0 ? [150, 30, 20] : [240, 60, 40]); for (let y = 10; y < 22; y++) for (let x = 12; x < 20; x++) if ((x + y) % 3 === 0) P.set(x, y, [30, 20, 10]); }), 1), bx(5, 3, 5, 11, 4, 11, M.black), bx(5, 14, 5, 11, 15, 11, M.black), bx(7.5, 15, 7.5, 8.5, 16, 8.5, M.black)]; break;
    case 'lantern': r = [bx(5, 0, 5, 11, 1, 11, M.black), bx(5.5, 1, 5.5, 10.5, 7, 10.5, tile('lamp' + 'レモン', null), 1), bx(5, 7, 5, 11, 8, 11, M.black), bx(7, 8, 7, 9, 10, 9, M.black)]; break;
    case 'candle': r = [bx(7, 0, 7, 9, 6, 9, M.white), bx(7.5, 6, 7.5, 8.5, 8, 8.5, M.fire, 1)]; break;
    case 'toro': r = [bx(4, 0, 4, 12, 2, 12, M.stone), bx(6, 2, 6, 10, 8, 10, M.stone), bx(3, 8, 3, 13, 9, 13, M.stone), bx(4, 9, 4, 12, 14, 12, tile('m_toro', (P) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) P.set(x, y, x > 8 && x < 24 && y > 6 && y < 26 ? [255, 220, 140] : [150, 150, 148]); }), 1), bx(2, 14, 2, 14, 16, 14, M.stone), bx(6, 16, 6, 10, 18, 10, M.stone)]; break;
    case 'streetlamp': r = [bx(6, 0, 6, 10, 2, 10, M.black), bx(7, 2, 7, 9, 28, 9, M.black), bx(5, 28, 5, 11, 32, 11, tile('lamp' + 'クリーム', null), 1), bx(4.5, 32, 4.5, 11.5, 33, 11.5, M.black)]; break;
    case 'brazier': r = [bx(5, 0, 5, 11, 10, 11, M.black), bx(3, 10, 3, 13, 13, 13, M.black), bx(4, 13, 4, 12, 22, 12, M.fire, 1)]; break;
    default: r = [bx(2, 0, 2, 14, 12, 14, W)];
  }
  modelCache.set(key, r); return r;
}

// ---------- チャンク
export function buildChunk(world, cx, cz, CS) {
  const op = new Geo(), tr = new Geo(), gl = new Geo(), pl = new Geo(); pl.sw = [];
  const H = world.H, get = (x, y, z) => world.get(x, y, z);
  const full = (x, y, z) => { if (y < 0) return true; const id = get(x, y, z); return id > 0 && B[id].full; };
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const id = get(x, y, z); if (!id) continue;
    const d = B[id]; const meta = world.meta(x, y, z); const rot = meta & 3;
    const g = d.mat === 1 ? tr : d.mat === 2 ? gl : op;
    op.tint = d.tint ? tintAt(x, z, d.tint) : null;
    switch (d.shape) {
      case 'cube': {
        const axis = d.axis ? (meta >> 2) & 3 : 0;
        for (let fi = 0; fi < 6; fi++) {
          const F = FACES[fi], nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
          const nid = ny < 0 ? 1 : get(nx, ny, nz);
          if (nid && B[nid].full) continue;
          if (d.mat === 1 && nid === id) continue;
          if (d.cut && nid === id && fi !== 2) continue;
          let k = F.k === 'front' || F.k === 'back' ? 'side' : F.k;
          if (axis === 1) k = fi <= 1 ? 'top' : 'side'; else if (axis === 2) k = fi >= 4 ? 'top' : 'side';
          const t = d.t[k] ?? d.t.side;
          const ps = [], uvs = [], cs = [];
          for (const c of F.c) {
            ps.push([x + c[0], y + c[1], z + c[2]]);
            const uv = projUV(fi, c); uvs.push(tuv(t, uv[0], uv[1]));
            // AO
            const ax = [0, 1, 2].filter((a) => F.n[a] === 0);
            const s = ax.map((a) => (c[a] ? 1 : -1));
            const o = [nx, ny, nz];
            const p1 = [...o]; p1[ax[0]] += s[0]; const p2 = [...o]; p2[ax[1]] += s[1]; const p3 = [...o]; p3[ax[0]] += s[0]; p3[ax[1]] += s[1];
            const s1 = full(...p1) ? 1 : 0, s2 = full(...p2) ? 1 : 0, s3 = full(...p3) ? 1 : 0;
            const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + s3);
            cs.push(d.mat === 2 ? 1 : AO[ao]);
          }
          if (d.mat !== 1 && d.mat !== 2) { const jt = 0.955 + hash2(x * 3 + y, z * 5 - y) * 0.09; for (let i = 0; i < 4; i++) cs[i] *= jt; }
          g.quad(ps, F.n, uvs, cs, cs[0] + cs[2] < cs[1] + cs[3]);
        }
        break;
      }
      case 'water': {
        const above = get(x, y + 1, z) === id;
        const top = above ? 1 : 0.875;
        for (let fi = 0; fi < 6; fi++) {
          const F = FACES[fi], nid = y + F.n[1] < 0 ? 1 : get(x + F.n[0], y + F.n[1], z + F.n[2]);
          if (nid === id || (nid && B[nid].full)) continue;
          const ps = F.c.map((c) => [x + c[0], y + (c[1] ? top : 0), z + c[2]]);
          const uvs = F.c.map((c) => { const uv = projUV(fi, c); return tuv(d.t.side, uv[0], uv[1]); });
          g.quad(ps, F.n, uvs, [1, 1, 1, 1]);
        }
        break;
      }
      case 'slab': emitBox(g, x, y, z, meta & 4 ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1], d.t, 0, 1, full(x, y - 1, z)); break;
      case 'carpet': emitBox(g, x, y, z, [0, 0, 0, 1, 1 / 16, 1], d.t, 0, 1, true); break;
      case 'stairs': emitBox(g, x, y, z, [0, 0, 0, 1, 0.5, 1], d.t, rot, 1, full(x, y - 1, z)); emitBox(g, x, y, z, [0, 0.5, 0.5, 1, 1, 1], d.t, rot, 1, true); break;
      case 'stairsOut': emitBox(g, x, y, z, [0, 0, 0, 1, 0.5, 1], d.t, rot, 1, full(x, y - 1, z)); emitBox(g, x, y, z, [0.5, 0.5, 0.5, 1, 1, 1], d.t, rot, 1, true); break;
      case 'stairsIn': emitBox(g, x, y, z, [0, 0, 0, 1, 0.5, 1], d.t, rot, 1, full(x, y - 1, z)); emitBox(g, x, y, z, [0, 0.5, 0.5, 1, 1, 1], d.t, rot, 1, true); emitBox(g, x, y, z, [0.5, 0.5, 0, 1, 1, 0.5], d.t, rot, 1, true); break;
      case 'cross': {
        const grassy = d.name === 'くさむら' || d.name === 'シダ'; const hv = hash2(x + 7, z + 3), hv2 = hash2(z + 11, x + 5); const t = d.t.side, sh = grassy ? 1 : 0.9 + hv * 0.2, G2 = d.mat === 2 ? gl : pl; pl.tint = grassy ? tintAt(x, z, 'grass') : d.cat === 'plant' ? [1, 0.92 + hv2 * 0.16, 0.9 + hv * 0.2] : null;
        const jx = (hash2(x, z) - 0.5) * 0.25, jz = (hash2(z, x) - 0.5) * 0.25;
        const qd = (a, b) => { const ps = [[x + a[0] + jx, y, z + a[1] + jz], [x + b[0] + jx, y, z + b[1] + jz], [x + b[0] + jx, y + 1, z + b[1] + jz], [x + a[0] + jx, y + 1, z + a[1] + jz]]; const uvs = [tuv(t, 0, 0), tuv(t, 1, 0), tuv(t, 1, 1), tuv(t, 0, 1)]; const n = [0, 1, 0];
          const em = (P, U) => { const v = []; for (let i = 0; i < 4; i++) { G2.swv = i >= 2 ? 1 : 0; v.push(G2.vert(P[i], n, U[i], sh)); } G2.idx.push(v[0], v[1], v[2], v[0], v[2], v[3]); };
          em(ps, uvs); em([ps[1], ps[0], ps[3], ps[2]], [uvs[1], uvs[0], uvs[3], uvs[2]]); };
        qd([0.15, 0.15], [0.85, 0.85]); qd([0.15, 0.85], [0.85, 0.15]); pl.tint = null;
        break;
      }
      case 'torch': emitBox(g, x, y, z, [7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16], d.t, 0, 1); break;
      case 'fence': case 'pane': case 'wall': {
        const conn = (nx, nz) => { const n = get(nx, y, nz); if (!n) return false; const nd = B[n]; return nd.full || nd.glassy || nd.shape === d.shape || nd.shape === 'door' || (d.shape !== 'pane' && (nd.shape === 'fence' || nd.shape === 'wall')); };
        const N = conn(x, z - 1), S = conn(x, z + 1), E = conn(x + 1, z), Wd = conn(x - 1, z);
        if (d.shape === 'pane') {
          const a = 7 / 16, b = 9 / 16;
          if (!N && !S && !E && !Wd) emitBox(g, x, y, z, [0, 0, a, 1, 1, b], d.t);
          else { emitBox(g, x, y, z, [a, 0, a, b, 1, b], d.t); if (N) emitBox(g, x, y, z, [a, 0, 0, b, 1, a], d.t); if (S) emitBox(g, x, y, z, [a, 0, b, b, 1, 1], d.t); if (E) emitBox(g, x, y, z, [b, 0, a, 1, 1, b], d.t); if (Wd) emitBox(g, x, y, z, [0, 0, a, a, 1, b], d.t); }
        } else if (d.shape === 'fence') {
          emitBox(g, x, y, z, [6 / 16, 0, 6 / 16, 10 / 16, 1, 10 / 16], d.t);
          for (const [h0, h1] of [[6, 9], [12, 15]]) {
            const y0 = h0 / 16, y1 = h1 / 16, a = 7 / 16, b = 9 / 16;
            if (N) emitBox(g, x, y, z, [a, y0, 0, b, y1, 6 / 16], d.t); if (S) emitBox(g, x, y, z, [a, y0, 10 / 16, b, y1, 1], d.t);
            if (E) emitBox(g, x, y, z, [10 / 16, y0, a, 1, y1, b], d.t); if (Wd) emitBox(g, x, y, z, [0, y0, a, 6 / 16, y1, b], d.t);
          }
        } else {
          emitBox(g, x, y, z, [4 / 16, 0, 4 / 16, 12 / 16, 1, 12 / 16], d.t);
          const a = 5 / 16, b = 11 / 16, h = 13 / 16;
          if (N) emitBox(g, x, y, z, [a, 0, 0, b, h, 4 / 16], d.t); if (S) emitBox(g, x, y, z, [a, 0, 12 / 16, b, h, 1], d.t);
          if (E) emitBox(g, x, y, z, [12 / 16, 0, a, 1, h, b], d.t); if (Wd) emitBox(g, x, y, z, [0, 0, a, 4 / 16, h, b], d.t);
        }
        break;
      }
      case 'rail': case 'handrail': {
        const H = d.shape === 'rail' ? 1 : 0.62, T = d.t;
        emitBox(op, x, y, z, [0, 0, 0, 2 / 16, H, 2 / 16], T, rot); emitBox(op, x, y, z, [14 / 16, 0, 0, 1, H, 2 / 16], T, rot);
        emitBox(op, x, y, z, [0, H - 2 / 16, 0, 1, H, 2 / 16], T, rot);
        if (d.shape === 'rail') for (let k = 1; k < 4; k++) emitBox(op, x, y, z, [k * 4 / 16 - 0.5 / 16, 0, 0.3 / 16, k * 4 / 16 + 0.5 / 16, H, 1.7 / 16], T, rot);
        break;
      }
      case 'window': {
        const T = d.t, a = 7 / 16, b = 9 / 16;
        emitBox(op, x, y, z, [0, 0, a, 1, 2 / 16, b], T, rot); emitBox(op, x, y, z, [0, 14 / 16, a, 1, 1, b], T, rot);
        emitBox(op, x, y, z, [0, 2 / 16, a, 2 / 16, 14 / 16, b], T, rot); emitBox(op, x, y, z, [14 / 16, 2 / 16, a, 1, 14 / 16, b], T, rot);
        if (d.cross) { emitBox(op, x, y, z, [7.5 / 16, 2 / 16, a + 0.01, 8.5 / 16, 14 / 16, b - 0.01], T, rot); emitBox(op, x, y, z, [2 / 16, 7.5 / 16, a + 0.01, 14 / 16, 8.5 / 16, b - 0.01], T, rot); }
        emitBox(tr, x, y, z, [2 / 16, 2 / 16, 7.8 / 16, 14 / 16, 14 / 16, 8.2 / 16], tile('glass', null), rot);
        break;
      }
      case 'model': {
        for (const m of modelBoxes(d.model, d.color)) emitBox(m.g ? gl : m.tr ? tr : (d.mat === 2 ? gl : op), x, y, z, m.b, m.t, rot, 1);
        if (!NOBLOB.has(d.model) && full(x, y - 1, z)) { const a = -0.14, b = 1.14, yy = y + 0.012; tr.quad([[x + a, yy, z + a], [x + a, yy, z + b], [x + b, yy, z + b], [x + b, yy, z + a]], [0, 1, 0], [tuv(BLOB, 0, 0), tuv(BLOB, 0, 1), tuv(BLOB, 1, 1), tuv(BLOB, 1, 0)], [1, 1, 1, 1]); }
        break;
      }
      case 'door': break;
      case 'air': break;
      default: {
        const hf = HF[d.shape];
        if (hf) emitHF(g, x, y, z, hf[0], hf[1], d.t.top, rot, full(x, y - 1, z));
      }
    }
  }
  return { op: op.out(), tr: tr.out(), gl: gl.out(), pl: pl.out() };
}

// 場所ごとの色ゆらぎ
function hash2(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn2(x, z) { const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); return (hash2(x0, z0) * (1 - sx) + hash2(x0 + 1, z0) * sx) * (1 - sz) + (hash2(x0, z0 + 1) * (1 - sx) + hash2(x0 + 1, z0 + 1) * sx) * sz; }
function tintAt(x, z, kind) {
  const n = vn2(x / 11, z / 11) * 0.7 + vn2(x / 4, z / 4) * 0.3;
  if (kind === 'grass') return [0.9 + n * 0.2, 1.0 + (0.5 - Math.abs(n - 0.5)) * 0.08, 0.82 + (1 - n) * 0.12];
  return [0.9 + n * 0.16, 0.95 + n * 0.08, 0.88 + (1 - n) * 0.1];
}

// アイコン・手に持つ表示用に1ブロックぶんのジオメトリ
export function blockGeo(id, m = 0) {
  const fake = { H: 1, get: (x, y, z) => (x === 0 && y === 0 && z === 0 ? id : 0), meta: () => m };
  return buildChunk(fake, 0, 0, 1);
}
export { HF };
