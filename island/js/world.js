// ワールド（データ・地形・おうちセット・当たり判定）
import { B, ID, WOODS, ROOF_MATS, DOORS, COLORS, mulberry } from './blocks.js';

export const W = 128, D = 128, H = 64, CS = 16, SEA = 20;
export class World {
  constructor() {
    this.W = W; this.D = D; this.H = H;
    this.ids = new Uint16Array(W * D * H); this.mt = new Uint8Array(W * D * H);
    this.dirty = new Set(); this.doors = new Map(); this.version = 0; this.onDoor = null;
  }
  i(x, y, z) { return (y * D + z) * W + x; }
  inb(x, y, z) { return x >= 0 && z >= 0 && y >= 0 && x < W && z < D && y < H; }
  get(x, y, z) { if (x < 0 || z < 0 || y < 0 || x >= W || z >= D || y >= H) return 0; return this.ids[(y * D + z) * W + x]; }
  meta(x, y, z) { if (!this.inb(x, y, z)) return 0; return this.mt[this.i(x, y, z)]; }
  setRaw(x, y, z, id, m = 0) { if (!this.inb(x, y, z)) return; const k = this.i(x, y, z); if (this.rec) this.rec.push([x, y, z, this.ids[k], this.mt[k]]); this.ids[k] = id; this.mt[k] = m; }
  set(x, y, z, id, m = 0) {
    if (!this.inb(x, y, z)) return false;
    const k = this.i(x, y, z), old = this.ids[k];
    if (this.rec) this.rec.push([x, y, z, old, this.mt[k]]);
    if (old && B[old].shape === 'door') this._doorRemoved(x, y, z, this.mt[k], B[old].gate);
    this.ids[k] = id; this.mt[k] = m; this.version++;
    if (id && B[id].shape === 'door' && !(m & 8)) { this.doors.set(k, { x, y, z, id, rot: m & 3 }); this.onDoor && this.onDoor('add', k); }
    const cx = x >> 4, cz = z >> 4;
    this.dirty.add(cx + ',' + cz);
    if ((x & 15) === 0 && cx > 0) this.dirty.add(cx - 1 + ',' + cz); if ((x & 15) === 15 && cx < W / CS - 1) this.dirty.add(cx + 1 + ',' + cz);
    if ((z & 15) === 0 && cz > 0) this.dirty.add(cx + ',' + (cz - 1)); if ((z & 15) === 15 && cz < D / CS - 1) this.dirty.add(cx + ',' + (cz + 1));
    return true;
  }
  _doorRemoved(x, y, z, m, gate) {
    const by = m & 8 ? y - 1 : y; const k = this.i(x, by, z);
    if (this.doors.has(k)) { this.doors.delete(k); this.onDoor && this.onDoor('del', k); }
    if (gate) return;
    const oy = m & 8 ? y - 1 : y + 1; const ok = this.i(x, oy, z);
    if (this.inb(x, oy, z) && this.ids[ok] && B[this.ids[ok]].shape === 'door') { this.ids[ok] = 0; this.mt[ok] = 0; }
  }
  scanDoors() { this.doors.clear(); for (let k = 0; k < this.ids.length; k++) { const id = this.ids[k]; if (id && B[id].shape === 'door' && !(this.mt[k] & 8)) { const x = k % W, z = Math.floor(k / W) % D, y = Math.floor(k / (W * D)); this.doors.set(k, { x, y, z, id, rot: this.mt[k] & 3 }); } } }
  top(x, z) { for (let y = H - 1; y >= 0; y--) { const id = this.get(x, y, z); if (id && B[id].solid) return y; } return -1; }
  surface(x, z) { for (let y = H - 1; y >= 0; y--) { const id = this.get(x, y, z); if (id && (B[id].solid || id === ID.water)) return y; } return -1; }
  // 視線の先のブロック（DDA）
  raycast(o, d, max = 8, skipWater = true) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
    let n = [0, 0, 0], t = 0;
    for (let i = 0; i < 200 && t <= max; i++) {
      const id = this.get(x, y, z);
      if (id && !(skipWater && B[id].shape === 'water')) return { x, y, z, n, id, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
      if (y < 0 || y >= H) break;
    }
    return null;
  }
  // 当たり判定（ドアはしまっていても通れる＝近づくと開く）
  solidAt(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    if (xi < 0 || zi < 0 || xi >= W || zi >= D) return true;
    if (yi < 0) return true;
    const id = this.get(xi, yi, zi); if (!id) return false;
    const d = B[id]; if (!d.solid || d.shape === 'door') return false;
    if (d.shape === 'slab') { const up = this.meta(xi, yi, zi) & 4; const fy = y - yi; return up ? fy >= 0.5 : fy < 0.5; }
    return true;
  }
  boxFree(px, py, pz, r, h) {
    for (const yy of [py + 0.01, py + h * 0.5, py + h - 0.01]) for (const xx of [px - r, px + r]) for (const zz of [pz - r, pz + r]) if (this.solidAt(xx, yy, zz)) return false;
    return true;
  }
  // 位置ベクトルを当たり判定つきで動かす。e={x,y,z,vy,onGround}
  move(e, dx, dy, dz, r = 0.28, h = 1.3, autoStep = true) {
    let moved = false;
    // 横
    for (const [ax, dv] of [['x', dx], ['z', dz]]) {
      if (!dv) continue;
      const nx = ax === 'x' ? e.x + dv : e.x, nz = ax === 'z' ? e.z + dv : e.z;
      if (this.boxFree(nx, e.y, nz, r, h)) { e[ax] += dv; moved = true; }
      else if (autoStep && e.onGround) {
        for (const st of [0.5, 1.05]) { if (this.boxFree(nx, e.y + st, nz, r, h) && this.boxFree(e.x, e.y + st, e.z, r, h)) { e.y += st; e[ax] += dv; e.stepped = true; moved = true; break; } }
      }
    }
    // 縦
    e.onGround = false;
    if (dy < 0) {
      if (this.boxFree(e.x, e.y + dy, e.z, r, h)) e.y += dy;
      else { // 床にぴったり
        let y = e.y; for (let k = 0; k < 20 && this.boxFree(e.x, y - 0.05, e.z, r, h); k++) y -= 0.05; e.y = y; e.vy = 0; e.onGround = true;
        const fy = Math.floor(e.y + 0.001); const cands = [fy, fy + 0.5]; for (const c of cands) if (Math.abs(e.y - c) < 0.06 && this.boxFree(e.x, c, e.z, r, h)) e.y = c;
      }
    } else if (dy > 0) {
      if (this.boxFree(e.x, e.y + dy, e.z, r, h)) e.y += dy; else e.vy = 0;
    }
    if (!this.boxFree(e.x, e.y, e.z, r, h)) { for (let k = 1; k < 30; k++) if (this.boxFree(e.x, e.y + k * 0.1, e.z, r, h)) { e.y += k * 0.1; break; } }
    return moved;
  }
  // 保存（RLE）
  serialize() {
    const out = [];
    let prev = -1, cnt = 0;
    const N = this.ids.length;
    for (let k = 0; k <= N; k++) {
      const v = k < N ? (this.ids[k] << 8) | this.mt[k] : -2;
      if (v === prev && cnt < 65535) cnt++;
      else { if (prev >= 0) out.push(prev, cnt); prev = v; cnt = 1; }
    }
    return new Uint32Array(out);
  }
  deserialize(arr) {
    let k = 0;
    for (let i = 0; i < arr.length; i += 2) { const v = arr[i], c = arr[i + 1]; const id = v >>> 8, m = v & 255; for (let j = 0; j < c; j++) { this.ids[k] = id; this.mt[k] = m; k++; } }
    this.scanDoors();
  }
}

// ---------- 地形
function vnoise(seed) {
  const r = mulberry(seed), P = new Float32Array(256 * 256); for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, y) => P[(y & 255) * 256 + (x & 255)];
  return (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy; };
}
export function generate(world, seed = 1234) {
  const n1 = vnoise(seed), n2 = vnoise(seed + 7), n3 = vnoise(seed + 13), r = mulberry(seed + 99);
  const fbm = (x, z) => n1(x / 32, z / 32) * 0.6 + n2(x / 14, z / 14) * 0.3 + n3(x / 6, z / 6) * 0.1;
  const C = W / 2, hmap = new Int16Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const dx = (x - C) / C, dz = (z - C) / C; const d = Math.sqrt(dx * dx + dz * dz) * (0.9 + n3(x / 20, z / 20) * 0.2);
    let h = 21 + (fbm(x, z) - 0.45) * 10;
    // 山
    const mx = x - 96, mz = z - 34; h += 18 * Math.exp(-(mx * mx + mz * mz) / 260);
    // 丘
    const hx2 = x - 30, hz = z - 36; h += 6 * Math.exp(-(hx2 * hx2 + hz * hz) / 180);
    const f = Math.min(1, Math.max(0, (d - 0.62) / 0.3)); h = h * (1 - f) + 13 * f;
    // 広場は平ら
    const pd = Math.hypot(x - C, z - C); if (pd < 22) { const t = Math.max(0, (pd - 12) / 10); h = 22 * (1 - t) + h * t; }
    // 池
    const pdx = x - 42, pdz = z - 86, pp = Math.sqrt(pdx * pdx / 1.6 + pdz * pdz); if (pp < 9) h = Math.min(h, 18 + pp * 0.4);
    hmap[z * W + x] = Math.round(h);
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = hmap[z * W + x];
    for (let y = 0; y <= h; y++) {
      let id = ID.stone;
      if (y === h) id = h <= SEA + 1 ? ID.sand : h > 36 ? ID.snow : h > 32 ? ID.stone : ID.grass;
      else if (y > h - 4) id = h <= SEA + 1 ? ID.sand : h > 32 ? ID.stone : ID.dirt;
      world.setRaw(x, y, z, id);
    }
    const inPond = Math.sqrt((x - 42) ** 2 / 1.6 + (z - 86) ** 2) < 9;
    const wl = inPond ? 21 : SEA;
    for (let y = h + 1; y <= wl; y++) world.setRaw(x, y, z, ID.water);
  }
  // 広場
  const smooth = B.find((b) => b.name === 'なめらかないし').id, chis = B.find((b) => b.name === 'もようのいし').id, flw = B.filter((b) => b.cat === 'plant' && b.shape === 'cross' && !b.name.includes('なえぎ') && !['くさむら', 'シダ', 'かれき', 'すすき', 'さとうきび', 'タケノコ', 'あかいきのこ', 'ちゃいろのきのこ'].includes(b.name)).map((b) => b.id);
  for (let z = -10; z <= 10; z++) for (let x = -10; x <= 10; x++) {
    const d = Math.sqrt(x * x + z * z);
    if (d <= 2.2) world.setRaw(C + x, 22, C + z, chis);
    else if (d <= 3.4) world.setRaw(C + x, 22, C + z, smooth);
    else if (d <= 7.2) world.setRaw(C + x, 22, C + z, r() < 0.12 ? ID.stonebrick : r() < 0.08 ? ID.cobble : ID.paving);
    else if (d <= 8.3) world.setRaw(C + x, 22, C + z, ID.stonebrick);
    else if (d <= 9.6 && world.get(C + x, 22, C + z) === ID.grass && !world.get(C + x, 23, C + z) && r() < 0.55) world.setRaw(C + x, 23, C + z, flw[Math.floor(r() * flw.length)]);
  }
  // こみち（いえへ）
  for (const dir of [-1, 1]) for (let i = 8; i <= 13; i++) for (const w of [-1, 0, 1]) { const x = C + dir * i, z = C + w; if (world.get(x, 22, z) === ID.grass || world.get(x, 22, z) === ID.dirt) world.setRaw(x, 22, z, (i + w) % 3 ? ID.gravel : ID.paving); if (world.get(x, 23, z) && B[world.get(x, 23, z)].shape === 'cross') world.setRaw(x, 23, z, 0); }
  const fid = B.find((b) => b.model === 'fountain').id; world.setRaw(C, 23, C, fid);
  const bench = B.find((b) => b.model === 'bench').id, lamp = B.find((b) => b.model === 'streetlamp').id;
  [[0, -5, 0], [5, 0, 1], [0, 5, 2], [-5, 0, 3]].forEach(([x, z, rr]) => world.setRaw(C + x, 23, C + z, bench, rr));
  [[-6, -3], [6, 3], [-3, 6], [3, -6]].forEach(([x, z]) => world.setRaw(C + x, 23, C + z, lamp));
  // 木と花
  const flowers = B.filter((b) => b.cat === 'plant' && b.shape === 'cross' && !b.name.includes('なえぎ')).map((b) => b.id);
  for (let i = 0; i < 3600; i++) {
    const x = 2 + Math.floor(r() * (W - 4)), z = 2 + Math.floor(r() * (D - 4));
    const h = hmap[z * W + x]; if (Math.hypot(x - C, z - C) < 12) continue;
    if (world.get(x, h, z) !== ID.grass || world.get(x, h + 1, z)) continue;
    const t = r();
    if (t < 0.05) tree(world, x, h + 1, z, pickWood(x, z, h, r), r);
    else if (t < 0.4) world.setRaw(x, h + 1, z, ID.tallgrass);
    else if (t < 0.55) world.setRaw(x, h + 1, z, flowers[Math.floor(n1(x / 9, z / 9) * flowers.length * 1.5) % flowers.length]);
  }
  // ひかる どうくつ（やまの なか）
  { const cx = 96, cz = 34, cy = 23; const glow = B.find((b) => b.name === 'ひかるコケ').id, ame = B.find((b) => b.name === 'アメジスト').id;
    for (let z = 12; z <= cz; z++) for (let dy = 0; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) { const y = cy + dy; if (world.get(cx + dx, y, z)) world.setRaw(cx + dx, y, z, 0); }
    for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) for (let y = cy; y <= cy + 4; y++) { const d = Math.hypot(x - cx, z - cz, (y - cy - 1) * 1.4); if (d < 4.2) world.setRaw(x, y, z, 0); else if (d < 5.2 && world.get(x, y, z) && r() < 0.35) world.setRaw(x, y, z, ame); }
    for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) if (!world.get(x, cy, z) && world.get(x, cy - 1, z)) { if (r() < 0.5) world.setRaw(x, cy - 1, z, glow); }
    world.cave = [cx, cy, cz]; }
  // はじめのおうち 2けん
  buildHouse(world, C - 15, 23, C - 4, 1, 'yofu');
  buildHouse(world, C + 9, 23, C - 4, 3, 'wafu');
  world.scanDoors();
}
function pickWood(x, z, h, r) {
  if (h > 28) return 2; // トウヒ
  const v = r();
  if (x > W / 2 && z > D / 2) return v < 0.6 ? 6 : 0; // さくらのもり
  if (x < W / 2 && z < D / 2) return v < 0.6 ? 1 : 0;
  if (v < 0.03) return 11;
  return v < 0.75 ? 0 : v < 0.9 ? 5 : 9;
}
export function tree(world, x, y, z, w, r = Math.random) {
  const log = ID['log' + w], leaf = ID['leaf' + w];
  const put = (xx, yy, zz, id) => { if (!world.get(xx, yy, zz) || B[world.get(xx, yy, zz)].shape === 'cross') world.setRaw(xx, yy, zz, id); };
  if (w === 2 || w === 9) { // 円すい
    const h = 6 + Math.floor(r() * 3);
    for (let i = 0; i < h; i++) world.setRaw(x, y + i, z, log);
    for (let i = 2; i <= h; i++) { const rad = Math.max(0, Math.floor((h - i) / 2.2) + (i % 2)); for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (Math.abs(dx) + Math.abs(dz) <= rad + 0.5) put(x + dx, y + i, z + dz, leaf); }
    put(x, y + h, z, leaf); put(x, y + h + 1, z, leaf);
    return;
  }
  const h = (w === 1 ? 6 : 4) + Math.floor(r() * 2), rad = w === 6 ? 3 : 2;
  for (let i = 0; i < h; i++) world.setRaw(x, y + i, z, log);
  for (let dy = -2; dy <= 1; dy++) {
    const rr = dy === 1 ? rad - 1 : rad;
    for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
      if (dx * dx + dz * dz + dy * dy * 1.2 > rr * rr + 1.5) continue;
      if (Math.abs(dx) === rr && Math.abs(dz) === rr && r() < 0.6) continue;
      put(x + dx, y + h + dy, z + dz, leaf);
    }
  }
}

// ---------- おうちセット
const dn = (name) => B.find((b) => b.name === name)?.id;
export const HOUSES = [
  { key: 'yofu', name: 'ようふうのいえ', icon: '🏠' }, { key: 'wafu', name: 'わふうのいえ', icon: '🏯' }, { key: 'log', name: 'ログハウス', icon: '🛖' },
  { key: 'pink', name: 'かわいいいえ', icon: '🎀' }, { key: 'castle', name: 'ちいさなおしろ', icon: '🏰' }, { key: 'tofu', name: 'しかくいいえ', icon: '⬜' },
  { key: 'shop', name: 'おみせ', icon: '🏪' }, { key: 'blue', name: 'うみのいえ', icon: '🌊' }, { key: 'candy', name: 'おかしのいえ', icon: '🍭' },
];
function style(s) {
  const roof = (m, sh = 'slope') => ID['roof_' + m + '_' + sh];
  switch (s) {
    case 'wafu': return { wall: ID['plaster17'], pillar: ID.log5, floor: ID.plank10, roofM: 2, door: dn('しょうじのとびら'), win: dn('しょうじまど'), bed: dn('ふとん'), table: dn('ちゃぶだい'), lamp: dn('ちょうちん'), deco: dn('ぼんさい'), rug: null };
    case 'log': return { wall: ID.log2, pillar: ID.log2, floor: ID.plank2, roofM: 11, door: ID.door2, win: ID.pane, bed: dn('あかのベッド'), table: dn('つくえ'), lamp: dn('ランタン'), deco: dn('だんろ'), rug: dn('ちゃいろのカーペット') };
    case 'pink': return { wall: ID['plaster14'], pillar: ID['plaster0'], floor: ID.plank6, roofM: 12, door: dn('ハートのドア'), win: dn('わくつきまど'), bed: dn('ピンクのベッド'), table: dn('まるいテーブル'), lamp: dn('ピンクのランプ'), deco: dn('うさぎのぬいぐるみ'), rug: dn('さくらのカーペット'), pyramid: true };
    case 'castle': return { wall: ID.stonebrick, pillar: dn('こけいしレンガ'), floor: dn('みがいただいりせき'), roofM: 1, door: dn('おしろのとびら'), win: ID.pane, bed: dn('むらさきのベッド'), table: dn('つくえ'), lamp: dn('ランタン'), deco: dn('たからばこ'), rug: dn('あかのカーペット'), pyramid: true };
    case 'tofu': return { wall: ID['conc0'], pillar: ID['conc0'], floor: ID['conc1'], flat: true, door: dn('しろいげんかん'), win: ID.pane, bed: dn('みずいろのベッド'), table: dn('つくえ'), lamp: dn('しろのランプ'), deco: dn('はちうえ'), rug: dn('みずいろのカーペット') };
    case 'shop': return { wall: ID.brick, pillar: ID.plank5, floor: ID.plank0, roofM: 16, door: dn('おみせのドア'), win: ID.glass, bed: dn('みどりのベッド'), table: dn('つくえ'), lamp: dn('がいとう') && dn('きいろのランプ'), deco: dn('じはんき'), rug: null };
    case 'blue': return { wall: ID['plaster10'], pillar: ID['plaster0'], floor: ID.plank1, roofM: 17, door: dn('みずいろのげんかん'), win: dn('わくつきまど'), bed: dn('あおのベッド'), table: dn('まるいテーブル'), lamp: dn('シーランタン'), deco: dn('アクアリウム'), rug: dn('ターコイズのカーペット') };
    case 'candy': return { wall: ID['plaster17'], pillar: ID['plaster14'], floor: dn('ピンクのタイル'), roofM: 13, door: dn('おかしのドア'), win: dn('ステンドグラス'), bed: dn('レモンのベッド'), table: dn('ケーキ'), lamp: dn('レモンのランプ'), deco: dn('くまのぬいぐるみ'), rug: dn('ミントのカーペット'), pyramid: true };
    default: return { wall: ID['plaster0'], pillar: ID.plank0, floor: ID.plank0, roofM: 0, door: dn('しろいげんかん'), win: dn('わくつきまど'), bed: dn('きいろのベッド'), table: dn('つくえ'), lamp: dn('クリームのランプ'), deco: dn('おおきなかんようしょくぶつ'), rug: dn('ベージュのカーペット') };
  }
}
// 原点(ox,oy,oz)=地面の上、rot=正面の向き(0:-z,1:+x,2:+z,3:-x)
export function buildHouse(world, ox, oy, oz, rot, key) {
  const S = style(key), w = 7, d = 7, wallH = 3;
  const T = (lx, lz) => { switch (rot) { case 1: return [ox + (d - 1 - lz), oz + lx]; case 2: return [ox + (w - 1 - lx), oz + (d - 1 - lz)]; case 3: return [ox + lz, oz + (w - 1 - lx)]; default: return [ox + lx, oz + lz]; } };
  const put = (lx, ly, lz, id, lr = 0, extra = 0) => { if (!id) return; const [x, z] = T(lx, lz); world.setRaw(x, oy + ly, z, id, (B[id].rot ? (lr + rot) & 3 : 0) | extra); };
  // 整地
  for (let lz = -2; lz < d + 2; lz++) for (let lx = -2; lx < w + 2; lx++) {
    const [x, z] = T(lx, lz); if (!world.inb(x, 0, z)) continue;
    for (let y = oy; y < oy + 12; y++) world.setRaw(x, y, z, 0);
    for (let y = oy - 1; y > oy - 6; y--) { const id = world.get(x, y, z); if (!id || B[id].shape === 'water' || !B[id].solid) world.setRaw(x, y, z, ID.dirt); }
    if (lx >= -1 && lx <= w && lz >= -1 && lz <= d) world.setRaw(x, oy - 1, z, lx >= 0 && lx < w && lz >= 0 && lz < d ? S.floor : ID.grass);
  }
  // かべ
  for (let ly = 0; ly < wallH; ly++) for (let lz = 0; lz < d; lz++) for (let lx = 0; lx < w; lx++) {
    const edge = lx === 0 || lz === 0 || lx === w - 1 || lz === d - 1; if (!edge) continue;
    const corner = (lx === 0 || lx === w - 1) && (lz === 0 || lz === d - 1);
    let id = corner ? S.pillar : S.wall;
    if (ly === 1 && !corner && ((lz === 0 && (lx === 1 || lx === 5)) || ((lx === 0 || lx === w - 1) && lz === 3) || (lz === d - 1 && lx === 3))) id = S.win;
    put(lx, ly, lz, id);
  }
  // ドア（正面のまんなか）
  put(3, 0, 0, S.door, 0); put(3, 1, 0, S.door, 0, 8);
  // やね
  const top = wallH;
  if (S.flat) {
    for (let lz = -1; lz <= d; lz++) for (let lx = -1; lx <= w; lx++) put(lx, top, lz, lx < 0 || lz < 0 || lx === w || lz === d ? ID.paving + 1 : S.wall);
  } else if (S.pyramid) {
    for (let i = 0; i <= 4; i++) {
      const a = -1 + i, b = w - i;
      if (a > b) break;
      if (a === b) { put(a, top + i, a, ID['roof_' + S.roofM + '_pyramid']); break; }
      for (let k = a; k <= b; k++) {
        const edgeA = k === a, edgeB = k === b;
        put(k, top + i, a, ID['roof_' + S.roofM + '_' + (edgeA || edgeB ? 'cornerOut' : 'slope')], edgeA ? 0 : edgeB ? 1 : 0);
        put(k, top + i, b, ID['roof_' + S.roofM + '_' + (edgeA || edgeB ? 'cornerOut' : 'slope')], edgeA ? 3 : edgeB ? 2 : 2);
        if (!edgeA && !edgeB) { put(a, top + i, k, ID['roof_' + S.roofM + '_slope'], 3); put(b, top + i, k, ID['roof_' + S.roofM + '_slope'], 1); }
      }
      for (let lz = a + 1; lz < b; lz++) for (let lx = a + 1; lx < b; lx++) if (i > 0) { /* 中は空 */ }
    }
  } else {
    for (let i = 0; i <= 4; i++) {
      const fz = -1 + i, bz = d - i;
      for (let lx = -1; lx <= w; lx++) {
        if (fz === bz) put(lx, top + i, fz, ID['roof_' + S.roofM + '_ridge']);
        else if (fz < bz) { put(lx, top + i, fz, ID['roof_' + S.roofM + '_slope'], 0); put(lx, top + i, bz, ID['roof_' + S.roofM + '_slope'], 2); }
      }
      // 妻壁
      if (fz + 1 <= bz - 1) for (let lz = fz + 1; lz <= bz - 1; lz++) { if (lz < 0 || lz >= d) continue; put(0, top + i, lz, S.wall); put(w - 1, top + i, lz, S.wall); }
    }
  }
  // 中のかぐ
  put(5, 0, 5, S.bed, 2); put(1, 0, 5, S.table, 0); put(1, 0, 1, S.deco, 0); put(5, 0, 1, S.lamp, 0);
  if (S.rug) for (let lz = 2; lz <= 4; lz++) for (let lx = 2; lx <= 4; lx++) put(lx, 0, lz, S.rug);
  if (S.lamp && B[S.lamp].shape === 'cube') { put(5, 0, 1, dn('ちいさいつくえ')); put(3, top - 1, 3, S.lamp); }
  world.version++;
  // チャンクを汚す
  for (let lz = -2; lz < d + 2; lz += 1) for (let lx = -2; lx < w + 2; lx += 1) { const [x, z] = T(lx, lz); if (world.inb(x, 0, z)) world.dirty.add((x >> 4) + ',' + (z >> 4)); }
}

// ベッドのまわりが「おうち」か判定（屋根あり・かこまれている）
export function isHouse(world, bx, by, bz) {
  const seen = new Set(), q = [[bx, by, bz]]; let n = 0;
  while (q.length) {
    const [x, y, z] = q.pop(); const k = x + ',' + z; if (seen.has(k)) continue; seen.add(k);
    if (++n > 120) return false;
    if (Math.abs(x - bx) > 10 || Math.abs(z - bz) > 10) return false;
    // 屋根
    let roofed = false; for (let yy = y + 1; yy < y + 8; yy++) { const id = world.get(x, yy, z); if (id && B[id].solid && B[id].shape !== 'door') { roofed = true; break; } }
    if (!roofed) return false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz; const a = world.get(nx, y, nz), b = world.get(nx, y + 1, nz);
      const wallA = a && (B[a].solid || B[a].glassy || B[a].shape === 'door'); const wallB = b && (B[b].solid || B[b].glassy || B[b].shape === 'door');
      if (wallA && B[a].shape !== 'model' && B[a].shape !== 'kmodel' && (B[a].full || B[a].glassy || B[a].shape === 'door' || B[a].shape === 'pane')) continue;
      if (wallB && (B[b].full || B[b].glassy || B[b].shape === 'door' || B[b].shape === 'pane')) continue;
      q.push([nx, y, nz]);
    }
  }
  return true;
}
