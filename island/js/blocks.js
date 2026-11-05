// ひだまりの島（旧：なかよしアイランド） — ブロック登録とテクスチャ生成（すべて最初から使える）
export const T = 32, PAD = 4, CELL = 40, ATL = 2048, PER = Math.floor(ATL / CELL);
export const atlas = document.createElement('canvas');
atlas.width = atlas.height = ATL;
const actx = atlas.getContext('2d');

// ---------- 乱数・色
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hx = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const C = (c) => (typeof c === 'string' ? hx(c) : c);

// ---------- タイル
let nTiles = 0;
const tileCache = new Map();
export const tileUV = []; // [u0,v0,u1,v1]
export const tileAvg = [];
function makePainter(key) {
  const img = new ImageData(T, T); const d = img.data; const r = mulberry(hashStr(key));
  // 周期的な値ノイズ
  const grids = {};
  function vn(x, y, g) {
    let G = grids[g]; if (!G) { G = grids[g] = []; for (let i = 0; i < g * g; i++) G.push(r()); }
    const s = T / g, gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const at = (a, b) => G[((b % g + g) % g) * g + ((a % g + g) % g)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  }
  return {
    img, r, vn,
    set(x, y, c, a = 255) { if (x < 0 || y < 0 || x >= T || y >= T) return; const i = (y * T + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; },
    get(x, y) { const i = (((y + T) % T) * T + ((x + T) % T)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; },
    shade(x, y, f) { if (x < 0 || y < 0 || x >= T || y >= T) return; const i = (y * T + x) * 4; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; },
    alpha(x, y, a) { const i = (y * T + x) * 4; d[i + 3] = a; },
  };
}
export function tile(key, paint) {
  if (tileCache.has(key)) return tileCache.get(key);
  const id = nTiles++;
  const P = makePainter(key); paint(P);
  const pad = new ImageData(CELL, CELL), s = P.img.data, o = pad.data;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const sx = Math.min(T - 1, Math.max(0, x - PAD)), sy = Math.min(T - 1, Math.max(0, y - PAD));
    const si = (sy * T + sx) * 4, oi = (y * CELL + x) * 4;
    o[oi] = s[si]; o[oi + 1] = s[si + 1]; o[oi + 2] = s[si + 2]; o[oi + 3] = s[si + 3];
  }
  { let R = 0, Gg = 0, Bb = 0, n = 0; for (let i = 0; i < s.length; i += 16) if (s[i + 3] > 100) { R += s[i]; Gg += s[i + 1]; Bb += s[i + 2]; n++; } tileAvg[id] = n ? [R / n, Gg / n, Bb / n] : [128, 128, 128]; }
  const col = id % PER, row = Math.floor(id / PER);
  actx.putImageData(pad, col * CELL, row * CELL);
  const u0 = (col * CELL + PAD) / ATL, u1 = (col * CELL + PAD + T) / ATL;
  const v1 = 1 - (row * CELL + PAD) / ATL, v0 = 1 - (row * CELL + PAD + T) / ATL;
  tileUV[id] = [u0 + 0.0002, v0 + 0.0002, u1 - 0.0002, v1 - 0.0002];
  tileCache.set(key, id);
  return id;
}
export function tileCanvas(id) { // アイコン用
  const c = document.createElement('canvas'); c.width = c.height = T;
  const col = id % PER, row = Math.floor(id / PER);
  c.getContext('2d').drawImage(atlas, col * CELL + PAD, row * CELL + PAD, T, T, 0, 0, T, T);
  return c;
}

// ---------- 模様
const P_ = {
  noise(c, v = 0.14) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(c, 1 + (P.r() - 0.5) * v + (P.vn(x, y, 4) - 0.5) * v)); }; },
  soft(c, v = 0.1) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(c, 1 + (P.vn(x, y, 8) - 0.5) * v + (P.vn(x, y, 16) - 0.5) * v * 0.6 + (P.r() - 0.5) * 0.03)); }; },
  flat(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(c, 1 + (P.r() - 0.5) * 0.025)); }; },
  wool(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const w = ((x + (y >> 1)) % 4 < 2 ? 1.03 : 0.97); P.set(x, y, mul(c, w * (1 + (P.vn(x, y, 8) - 0.5) * 0.12 + (P.r() - 0.5) * 0.06))); } }; },
  plaster(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(c, 1 + (P.vn(x, y, 8) - 0.5) * 0.06 + (P.r() < 0.03 ? -0.05 : 0))); }; },
  planks(c) { c = C(c); return (P) => {
    const off = [0, 13, 6, 20];
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const row = y >> 3, ry = y & 7, seam = (x + off[row]) % 32 === 0;
      let f = 1 + (P.vn(x * 0.25, y * 2, 8) - 0.5) * 0.18 + (row % 2 ? -0.04 : 0.03) + (P.r() - 0.5) * 0.04;
      if (ry === 7) f *= 0.68; else if (ry === 0) f *= 1.08; if (seam) f *= 0.72;
      P.set(x, y, mul(c, f));
    } }; },
  logSide(c, mark) { c = C(c); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { let f = 1 + (P.vn(x * 2, y * 0.25, 16) - 0.5) * 0.35 + (P.r() - 0.5) * 0.05; if (x % 6 === 0) f *= 0.82; P.set(x, y, mul(c, f)); }
    if (mark) { const m = C(mark); for (let i = 0; i < 7; i++) { const yy = Math.floor(P.r() * T), xx = Math.floor(P.r() * T), w = 3 + Math.floor(P.r() * 6); for (let k = 0; k < w; k++) { P.set(xx + k, yy, m); P.set(xx + k, yy + 1, mul(m, 1.2)); } } }
  }; },
  logTop(inner, bark) { inner = C(inner); bark = C(bark); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const dx = x - 15.5, dy = y - 15.5, d = Math.max(Math.abs(dx), Math.abs(dy)), rd = Math.sqrt(dx * dx + dy * dy);
      if (d > 13.5) P.set(x, y, mul(bark, 0.9 + P.r() * 0.15));
      else P.set(x, y, mul(inner, (Math.floor(rd / 2.5) % 2 ? 0.88 : 1.02) + (P.r() - 0.5) * 0.05));
    } }; },
  bricks(c, mortar = '#c9c1b4', h = 8, w = 16) { c = C(c); mortar = C(mortar); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const row = Math.floor(y / h), xo = (x + (row % 2) * (w >> 1)) % w, yo = y % h;
      const bid = row * 7 + Math.floor((x + (row % 2) * (w >> 1)) / w);
      if (yo === h - 1 || xo === w - 1) P.set(x, y, mul(mortar, 0.95 + P.r() * 0.08));
      else { const tone = 0.88 + ((bid * 37) % 11) / 45; P.set(x, y, mul(c, tone * (1 + (P.r() - 0.5) * 0.12) * (yo === 0 ? 1.08 : 1))); }
    } }; },
  stoneBricks(c, mossy = 0, cracked = 0) { c = C(c); return (P) => {
    const moss = hx('#5f8a3a');
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const row = y >> 4, xo = (x + (row % 2) * 8) % 16, yo = y & 15;
      let col = mul(c, 1 + (P.vn(x, y, 8) - 0.5) * 0.15 + (P.r() - 0.5) * 0.06);
      if (yo === 15 || xo === 15) col = mul(c, 0.62); else if (yo === 0 || xo === 0) col = mul(col, 1.12);
      if (mossy && P.vn(x, y, 4) > 0.62 - mossy * 0.1) col = mix(col, moss, 0.65);
      P.set(x, y, col);
    }
    if (cracked) for (let k = 0; k < 2; k++) { let x = Math.floor(P.r() * T), y = Math.floor(P.r() * T); for (let i = 0; i < 14; i++) { P.set(x, y, mul(c, 0.45)); x += Math.floor(P.r() * 3) - 1; y += 1; } }
  }; },
  cobble(c, moss = 0) { c = C(c); return (P) => {
    const pts = []; for (let i = 0; i < 14; i++) pts.push([P.r() * T, P.r() * T, 0.8 + P.r() * 0.35]);
    const mc = hx('#5d8a38');
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let b1 = 1e9, b2 = 1e9, bi = 0;
      for (let i = 0; i < pts.length; i++) for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { const dx = x - pts[i][0] - ox, dy = y - pts[i][1] - oy, dd = dx * dx + dy * dy; if (dd < b1) { b2 = b1; b1 = dd; bi = i; } else if (dd < b2) b2 = dd; }
      const edge = Math.sqrt(b2) - Math.sqrt(b1);
      let col = edge < 1.3 ? mul(c, 0.55) : mul(c, pts[bi][2] * (1 + (P.r() - 0.5) * 0.08) * (edge < 2.5 ? 0.9 : 1.05));
      if (moss && P.vn(x, y, 4) > 0.55) col = mix(col, mc, 0.7);
      P.set(x, y, col);
    } }; },
  polished(c) { c = C(c); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let f = 1 + (P.vn(x, y, 8) - 0.5) * 0.06; if (x === 0 || y === 0) f = 1.15; if (x === T - 1 || y === T - 1) f = 0.7; else if (x === 1 || y === 1) f *= 1.06;
      P.set(x, y, mul(c, f));
    } }; },
  chiseled(c) { c = C(c); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const e = Math.min(x, y, T - 1 - x, T - 1 - y); let f = 1;
      if (e === 0) f = 0.7; else if (e === 3) f = 0.75; else if (e === 4) f = 1.12;
      const cx = Math.abs(x - 15.5), cy = Math.abs(y - 15.5); if (e > 5 && (Math.abs(cx - cy) < 1 || Math.max(cx, cy) < 3)) f = 0.78;
      P.set(x, y, mul(c, f * (1 + (P.r() - 0.5) * 0.05)));
    } }; },
  tiles(c, n = 4, c2) { c = C(c); const cc = c2 ? C(c2) : null; return (P) => {
    const s = T / n;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const tx = Math.floor(x / s), ty = Math.floor(y / s), ox = x % s, oy = y % s;
      let col = cc && (tx + ty) % 2 ? cc : c; col = mul(col, 1 + (P.r() - 0.5) * 0.04);
      if (ox === s - 1 || oy === s - 1) col = mul(col, 0.72); else if (ox === 0 || oy === 0) col = mul(col, 1.1);
      P.set(x, y, col);
    } }; },
  glazed(c, c2) { c = C(c); c2 = C(c2); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const dx = x - 15.5, dy = y - 15.5, a = Math.atan2(dy, dx), r = Math.sqrt(dx * dx + dy * dy);
      const v = Math.sin(a * 4 + r * 0.35);
      let col = v > 0.3 ? c2 : v < -0.5 ? mul(c, 0.8) : c;
      if (Math.min(x, y, T - 1 - x, T - 1 - y) < 2) col = mul(c2, 0.85);
      P.set(x, y, mul(col, 1 + (P.r() - 0.5) * 0.04));
    } }; },
  terracotta(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(c, 1 + (P.vn(x, y, 8) - 0.5) * 0.1 + (P.r() < 0.05 ? -0.08 : 0) + (P.r() - 0.5) * 0.05)); }; },
  glass(c, a = 60) { c = C(c); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const e = Math.min(x, y, T - 1 - x, T - 1 - y);
      if (e < 2) P.set(x, y, mul(c, e === 0 ? 0.75 : 1.1), 230);
      else { const s = (x + y) % 22; P.set(x, y, mul(c, 1.15), (s === 5 || s === 6) && x > 6 && x < 20 ? a + 90 : a); }
    } }; },
  leaves(c, flowers) { c = C(c); return (P) => {
    const fl = flowers ? C(flowers) : null;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = P.vn(x, y, 8), r = P.r();
      if (r < 0.015) { P.set(x, y, mul(c, 0.85), 0); continue; }
      let col = mul(c, 0.72 + n * 0.45 + (r - 0.5) * 0.15);
      if (fl && P.vn(x * 2, y * 2, 8) > 0.72) col = mul(fl, 0.9 + P.r() * 0.2);
      P.set(x, y, col);
    } }; },
  ore(stone, ore) { stone = C(stone); ore = C(ore); return (P) => {
    P_.noise(stone, 0.18)(P);
    for (let k = 0; k < 6; k++) { const cx = 3 + Math.floor(P.r() * 26), cy = 3 + Math.floor(P.r() * 26); for (let i = 0; i < 6; i++) { const x = cx + Math.floor(P.r() * 4) - 2, y = cy + Math.floor(P.r() * 4) - 2; P.set(x, y, mul(ore, 0.85 + P.r() * 0.35)); P.set(x + 1, y, mul(ore, 0.7)); } }
  }; },
  gem(c) { c = C(c); return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const e = Math.min(x, y, T - 1 - x, T - 1 - y); let f = e === 0 ? 0.7 : e < 3 ? 1.25 : 1; if ((x + y) % 11 === 0 && e > 2) f = 1.3; P.set(x, y, mul(c, f * (1 + (P.r() - 0.5) * 0.05))); }
  }; },
  sand(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const r = P.r(); P.set(x, y, mul(c, 1 + (r < 0.08 ? -0.12 : r > 0.95 ? 0.08 : 0) + (P.vn(x, y, 8) - 0.5) * 0.07)); } }; },
  gravel(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const n = P.vn(x, y, 16); P.set(x, y, mul(c, 0.7 + n * 0.6 + (P.r() - 0.5) * 0.15)); } }; },
  grassTop(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const r = P.r(); P.set(x, y, mul(c, 1 + (P.vn(x, y, 8) - 0.5) * 0.18 + (r < 0.15 ? 0.1 : r > 0.9 ? -0.1 : 0))); } }; },
  grassSide(dirt, grass) { dirt = C(dirt); grass = C(grass); return (P) => {
    P_.noise(dirt, 0.2)(P);
    for (let x = 0; x < T; x++) { const h = 6 + Math.floor(P.vn(x, 0, 16) * 7); for (let y = 0; y < h; y++) P.set(x, y, mul(grass, 0.92 + P.r() * 0.16 - (y === h - 1 ? 0.1 : 0))); }
  }; },
  snowSide(dirt) { const s = hx('#f4f8fb'); dirt = C(dirt); return (P) => { P_.noise(dirt, 0.2)(P); for (let x = 0; x < T; x++) { const h = 6 + Math.floor(P.vn(x, 0, 8) * 5); for (let y = 0; y < h; y++) P.set(x, y, mul(s, 0.95 + P.r() * 0.05)); } }; },
  water() { const c = hx('#3a8fd8'); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const w = Math.sin((x + P.vn(x, y, 4) * 10) * 0.4) * 0.5 + 0.5; P.set(x, y, mul(c, 0.9 + w * 0.18), 165); } }; },
  lava() { return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const n = P.vn(x, y, 8); P.set(x, y, mix(hx('#d9420f'), hx('#ffd23a'), n * n)); } }; },
  lamp(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const e = Math.min(x, y, T - 1 - x, T - 1 - y); const dx = x - 15.5, dy = y - 15.5, g = 1 - Math.sqrt(dx * dx + dy * dy) / 26; P.set(x, y, e < 2 ? mul(c, 0.55) : mix(c, [255, 255, 245], Math.max(0, g) * 0.75)); } }; },
  glowstone() { return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const n = P.vn(x, y, 8); P.set(x, y, n > 0.55 ? hx('#fff2b0') : n > 0.4 ? hx('#f5c45a') : hx('#b8823a')); } }; },
  // 屋根
  kawara(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const w = Math.cos((x % 8) / 8 * Math.PI * 2) * 0.5 + 0.5, row = y % 8; let f = 0.78 + w * 0.32; if (row === 7) f *= 0.6; else if (row < 2) f *= 1.08; P.set(x, y, mul(c, f * (1 + (P.r() - 0.5) * 0.04))); } }; },
  spanish(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const row = Math.floor(y / 11), xo = (x + row * 5) % 11; const w = Math.sin(xo / 11 * Math.PI); let f = 0.72 + w * 0.42; if (y % 11 === 10) f *= 0.6; P.set(x, y, mul(c, f * (1 + (P.r() - 0.5) * 0.08))); } }; },
  shingle(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const row = y >> 3, xo = (x + (row % 2) * 4) % 8, yo = y & 7; const dx = xo - 3.5, round = Math.sqrt(dx * dx + (yo - 1) * (yo - 1)); let f = 1 + (P.r() - 0.5) * 0.08 + (((row * 13 + ((x + (row % 2) * 4) >> 3)) * 7) % 5) * 0.03; if (yo === 7 || (yo > 4 && round > 6.5)) f *= 0.62; if (xo === 0) f *= 0.8; P.set(x, y, mul(c, f)); } }; },
  slate(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const row = y >> 2, xo = (x + (row % 2) * 5) % 10; let f = 0.9 + (((row * 11 + Math.floor((x + (row % 2) * 5) / 10)) * 13) % 7) * 0.035; if ((y & 3) === 3) f *= 0.6; if (xo === 0) f *= 0.75; P.set(x, y, mul(c, f * (1 + (P.r() - 0.5) * 0.05))); } }; },
  thatch(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { let f = 0.75 + P.vn(x * 3, y * 0.3, 16) * 0.5 + (P.r() - 0.5) * 0.2; if (y % 10 === 9) f *= 0.65; P.set(x, y, mul(c, f)); } }; },
  metal(c) { c = C(c); return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const xo = x % 8; let f = xo === 0 ? 1.25 : xo === 1 ? 0.75 : 1 - xo * 0.01; P.set(x, y, mul(c, f * (1 + (P.vn(x, y, 8) - 0.5) * 0.06))); } }; },
  copperRoof(c, pat) { c = C(c); const p2 = pat ? C(pat) : null; return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const xo = x % 8, yo = y % 16; let col = mul(c, xo === 0 ? 1.2 : xo === 7 ? 0.75 : 1); if (yo === 15) col = mul(col, 0.7); if (p2 && P.vn(x, y, 8) > 0.6) col = mix(col, p2, 0.6); P.set(x, y, mul(col, 1 + (P.r() - 0.5) * 0.05)); } }; },
  snowRoof() { return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(hx('#f2f6fa'), 0.94 + P.vn(x, y, 8) * 0.08)); }; },
};
export const PAT = P_;

// ---------- ブロック定義
export const B = [];
export const CATS = [
  { id: 'nature', name: 'しぜん', icon: '🌱' }, { id: 'wood', name: 'き', icon: '🪵' }, { id: 'stone', name: 'いし', icon: '🪨' },
  { id: 'color', name: 'いろ', icon: '🌈' }, { id: 'glass', name: 'ガラス', icon: '🪟' }, { id: 'roof', name: 'やね', icon: '🏠' },
  { id: 'door', name: 'ドア', icon: '🚪' }, { id: 'furn', name: 'かぐ', icon: '🛋️' }, { id: 'kfurn', name: 'ふわふわかぐ', icon: '🧸' }, { id: 'light', name: 'あかり', icon: '💡' },
  { id: 'plant', name: 'はな', icon: '🌷' }, { id: 'fence', name: 'さく', icon: '🧱' }, { id: 'house', name: 'おうちセット', icon: '🏡' },
];
function add(name, cat, o = {}) {
  const d = Object.assign({ id: B.length, name, cat, shape: 'cube', mat: 0, solid: true }, o);
  if (d.t !== undefined && typeof d.t === 'number') d.t = { top: d.t, bot: d.t, side: d.t };
  d.full = d.shape === 'cube' && d.mat === 0 && !d.cut;
  B.push(d); return d;
}
B.push({ id: 0, name: 'くうき', shape: 'air', solid: false, full: false });
export const ID = {};

// 24色
export const COLORS = [
  ['しろ', '#f2f2ee'], ['うすはい', '#b9b9b4'], ['はいいろ', '#6f7275'], ['くろ', '#26272b'], ['ちゃいろ', '#7b5233'], ['あか', '#c8322e'],
  ['オレンジ', '#ee8a24'], ['きいろ', '#f5cf30'], ['きみどり', '#86c63a'], ['みどり', '#4a7f2c'], ['みずいろ', '#4fb6e3'], ['あお', '#3352b8'],
  ['むらさき', '#7f3ca8'], ['ピンクむらさき', '#c04bb4'], ['ピンク', '#f08cb2'], ['こん', '#22305e'], ['ベージュ', '#d9c39a'], ['クリーム', '#f6ecc4'],
  ['ミント', '#9fe0c4'], ['ラベンダー', '#b8a6e6'], ['さくら', '#f7c6d2'], ['レモン', '#f8ee8a'], ['ワイン', '#7a2338'], ['ターコイズ', '#2aa6a0'],
];

// 木 12種
export const WOODS = [
  ['オーク', '#b8945a', '#6b5133', '#b08f5a', '#4c8a32'], ['シラカバ', '#dccb8f', '#e6e2d8', '#d6c68c', '#6f9a45', '#2a2a28'],
  ['トウヒ', '#7a5a36', '#3f2d1c', '#6f5232', '#2f5d3a'], ['ジャングル', '#b0805a', '#5a4520', '#a77a4f', '#3a9a24'],
  ['アカシア', '#bd643c', '#6a6560', '#b45a32', '#7a9a2a'], ['ダークオーク', '#523722', '#3a2a18', '#4c321c', '#2f5a20'],
  ['サクラ', '#ebbdb4', '#3e2a2e', '#e2aaa4', '#f2a8c8'], ['タケ', '#d8c060', '#8aa83a', '#e0cc70', '#6ab040'],
  ['マングローブ', '#7a3a32', '#4a3a2a', '#7a342c', '#4a8a30'], ['スギ', '#c08858', '#6a3e28', '#c48a5a', '#2a6a40'],
  ['ヒノキ', '#e8cfa0', '#8a5a3a', '#ecd4a6', '#3a7a4a'], ['ゆめのき', '#8a6ac8', '#4a3a7a', '#9a7ad8', '#b8a0f0'],
];

// 石 46種: [なまえ, 色, 模様]
const STONES = [
  ['いし', '#8a8a88', 'noise'], ['まるいし', '#7d7d7b', 'cobble'], ['こけまるいし', '#7d7d7b', 'cobblemoss'], ['いしレンガ', '#8c8c8a', 'sbrick'],
  ['こけいしレンガ', '#8c8c8a', 'sbrickmoss'], ['ひびいしレンガ', '#8c8c8a', 'sbrickcrack'], ['もようのいし', '#8c8c8a', 'chisel'], ['なめらかないし', '#9d9d9b', 'polish'],
  ['かこうがん', '#a2705c', 'noise'], ['みがいたかこうがん', '#a2705c', 'polish'], ['せんりょくがん', '#bdbdbb', 'noise'], ['みがいたせんりょくがん', '#bdbdbb', 'polish'],
  ['あんざんがん', '#8a8a8c', 'noise'], ['みがいたあんざんがん', '#8a8a8c', 'polish'], ['しんそうがん', '#4d4d52', 'noise'], ['しんそうがんタイル', '#46464b', 'tile'],
  ['しんそうがんレンガ', '#4d4d52', 'sbrick'], ['ぎょうかいがん', '#6c6d66', 'noise'], ['ほうかいせき', '#e0e1dc', 'soft'], ['こくようせき', '#1c1626', 'gem'],
  ['すないわ', '#dccf9c', 'noise'], ['なめらかなすないわ', '#dccf9c', 'polish'], ['もようのすないわ', '#dccf9c', 'chisel'], ['あかすないわ', '#b95f28', 'noise'],
  ['なめらかなあかすないわ', '#b95f28', 'polish'], ['レンガ', '#9c4f3d', 'brick'], ['くろレンガ', '#2e1a1e', 'brick2'], ['どろレンガ', '#8c6a52', 'brick2'],
  ['プリズマリン', '#64a89a', 'soft'], ['プリズマリンレンガ', '#6cb8a8', 'sbrick'], ['ダークプリズマリン', '#2f5a4a', 'tile'], ['せきえい', '#ede6de', 'polish'],
  ['せきえいレンガ', '#ede6de', 'sbrick'], ['もようのせきえい', '#ede6de', 'chisel'], ['げんぶがん', '#4a4a50', 'noise'], ['みがいたげんぶがん', '#5a5a60', 'polish'],
  ['ブラックストーン', '#2c2830', 'noise'], ['みがいたブラックストーン', '#35303a', 'polish'], ['エンドストーン', '#e0dea0', 'noise'], ['エンドレンガ', '#e3e1a6', 'sbrick'],
  ['プルプァ', '#a77aa7', 'tile'], ['だいりせき', '#eceae6', 'soft'], ['みがいただいりせき', '#f3f1ee', 'polish'], ['だいりせきタイル', '#efedea', 'tilechk'],
  ['いしだたみ', '#9a958c', 'cobble'], ['ほんわかレンガ', '#e4b8a0', 'brick'],
];
function stonePaint(c, p) {
  switch (p) {
    case 'cobble': return P_.cobble(c); case 'cobblemoss': return P_.cobble(c, 1); case 'sbrick': return P_.stoneBricks(c);
    case 'sbrickmoss': return P_.stoneBricks(c, 1); case 'sbrickcrack': return P_.stoneBricks(c, 0, 1); case 'chisel': return P_.chiseled(c);
    case 'polish': return P_.polished(c); case 'tile': return P_.tiles(c, 2); case 'tilechk': return P_.tiles(c, 2, mul(hx(c), 0.8));
    case 'gem': return P_.gem(c); case 'soft': return P_.soft(c, 0.12); case 'brick': return P_.bricks(c); case 'brick2': return P_.bricks(c, mul(hx(c), 0.6), 8, 16);
    default: return P_.noise(c, 0.2);
  }
}

// 屋根 素材20 × 形12
export const ROOF_MATS = [
  ['あかがわら', '#b8392f', 'kawara'], ['あおがわら', '#2f5f9a', 'kawara'], ['くろがわら', '#3a3d44', 'kawara'], ['みどりがわら', '#3f7a4a', 'kawara'],
  ['ちゃがわら', '#7a4a2e', 'kawara'], ['オレンジがわら', '#d7703a', 'spanish'], ['テラコッタやね', '#c2683e', 'spanish'], ['スレート', '#4f5560', 'slate'],
  ['こけスレート', '#5a6650', 'slate'], ['わらぶき', '#c9a85a', 'thatch'], ['かやぶき', '#9c8a58', 'thatch'], ['いたぶき', '#9a6e44', 'shingle'],
  ['ピンクのいたぶき', '#e89ab0', 'shingle'], ['むらさきのいたぶき', '#8a6ac0', 'shingle'], ['どうのやね', '#c8774a', 'copper'], ['りょくしょうのやね', '#5aa58e', 'copper2'],
  ['あかいトタン', '#a83a32', 'metal'], ['あおいトタン', '#3a6aa0', 'metal'], ['きんのやね', '#e2b23a', 'metal'], ['ゆきのやね', '#f2f6fa', 'snow'], ['ガラスのやね', '#cfefff', 'glass'],
];
function roofPaint(c, p) {
  switch (p) {
    case 'kawara': return P_.kawara(c); case 'spanish': return P_.spanish(c); case 'slate': return P_.slate(c); case 'thatch': return P_.thatch(c);
    case 'shingle': return P_.shingle(c); case 'copper': return P_.copperRoof(c); case 'copper2': return P_.copperRoof(c, '#8fd0b8');
    case 'metal': return P_.metal(c); case 'snow': return P_.snowRoof(); case 'glass': return P_.glass(c, 80); default: return P_.noise(c);
  }
}
export const ROOF_SHAPES = [
  ['さか', 'slope'], ['ゆるいさか(した)', 'slopeLow'], ['ゆるいさか(うえ)', 'slopeHigh'], ['そとかど', 'cornerOut'], ['うちかど', 'cornerIn'],
  ['てっぺん', 'ridge'], ['ひくいてっぺん', 'ridgeLow'], ['とんがり', 'pyramid'], ['まるやね', 'dome'], ['かまぼこ', 'barrel'], ['ハーフ', 'slab'], ['かいだん', 'stairs'],
];

// ---------- 登録
function reg() {
  const dirt = '#866043', grass = '#6dab3c';
  const tDirt = tile('dirt', P_.noise(dirt, 0.22));
  ID.grass = add('くさ', 'nature', { tint: 'grass', t: { top: tile('grassTop', P_.grassTop(grass)), bot: tDirt, side: tile('grassSide', P_.grassSide(dirt, grass)) } }).id;
  ID.dirt = add('つち', 'nature', { t: tDirt }).id;
  add('あらいつち', 'nature', { t: tile('cdirt', P_.gravel('#7a5638')) });
  add('ポドゾル', 'nature', { t: { top: tile('podzol', P_.noise('#6a4a26', 0.3)), bot: tDirt, side: tile('podzolS', P_.grassSide(dirt, '#6a4a26')) } });
  add('きんし', 'nature', { t: { top: tile('myc', P_.noise('#7d6a7e', 0.3)), bot: tDirt, side: tile('mycS', P_.grassSide(dirt, '#7d6a7e')) } });
  add('こけ', 'nature', { t: tile('moss', P_.soft('#5c8a2e', 0.25)) });
  ID.sand = add('すな', 'nature', { t: tile('sand', P_.sand('#e2d39c')) }).id;
  add('あかすな', 'nature', { t: tile('rsand', P_.sand('#bf6a2e')) });
  ID.gravel = add('じゃり', 'nature', { t: tile('gravel', P_.gravel('#878280')) }).id;
  add('ねんど', 'nature', { t: tile('clay', P_.soft('#a4a8b4', 0.1)) });
  add('どろ', 'nature', { t: tile('mud', P_.soft('#3c3434', 0.15)) });
  ID.snow = add('ゆき', 'nature', { t: tile('snow', P_.soft('#f6fafc', 0.06)) }).id;
  ID.snowgrass = add('ゆきのくさ', 'nature', { t: { top: tile('snow', null), bot: tDirt, side: tile('snowSide', P_.snowSide(dirt)) } }).id;
  add('こおり', 'nature', { t: tile('ice', P_.glass('#9cc8f2', 170)), mat: 1, glassy: true });
  add('あおいこおり', 'nature', { t: tile('bice', P_.soft('#74a8ee', 0.1)) });
  add('かたいこおり', 'nature', { t: tile('pice', P_.soft('#8cb8f0', 0.18)) });
  ID.water = add('みず', 'nature', { t: tile('water', P_.water()), mat: 1, solid: false, shape: 'water' }).id;
  add('ようがん', 'nature', { t: tile('lava', P_.lava()), mat: 2, solid: false, shape: 'water' });
  add('ほしくさ', 'nature', { t: { top: tile('hayT', P_.thatch('#c9a640')), bot: tile('hayT', null), side: tile('hayS', P_.thatch('#d4b048')) } });
  add('カボチャ', 'nature', { t: { top: tile('pumT', P_.soft('#d9802a', 0.2)), bot: tile('pumT', null), side: tile('pumS', P_.metal('#e08a2c')) } });
  add('スイカ', 'nature', { t: { top: tile('melT', P_.soft('#6a9a2a', 0.2)), bot: tile('melT', null), side: tile('melS', P_.metal('#5a9a2a')) } });
  add('サボテン', 'nature', { t: { top: tile('cacT', P_.tiles('#5a9a3a', 2)), bot: tile('cacT', null), side: tile('cacS', P_.metal('#4a8a32')) } });
  add('あかいきのこブロック', 'nature', { t: tile('mushR', (P) => { P_.soft('#c22a24', 0.1)(P); for (let i = 0; i < 6; i++) { const cx = P.r() * T, cy = P.r() * T; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < 10) P.set(x, y, [240, 236, 230]); } }) });
  add('ちゃいろきのこブロック', 'nature', { t: tile('mushB', P_.soft('#97704f', 0.12)) });
  add('はちのす', 'nature', { t: tile('comb', P_.tiles('#e8a838', 4)) });
  add('スポンジ', 'nature', { t: tile('sponge', (P) => { P_.noise('#d8cc4a', 0.2)(P); for (let i = 0; i < 40; i++) P.set(Math.floor(P.r() * T), Math.floor(P.r() * T), [140, 128, 40]); }) });
  const oreList = [['せきたん', '#2a2a2a'], ['てつ', '#d8a888'], ['きん', '#f2d040'], ['ダイヤ', '#5ce8e0'], ['エメラルド', '#2ad860'], ['ラピス', '#2a4ab8'], ['レッドストーン', '#e02020'], ['どう', '#e07a4a']];
  for (const [n, c] of oreList) add(n + 'のこうせき', 'nature', { t: tile('ore' + n, P_.ore('#8a8a88', c)) });
  for (const [n, c] of oreList) add(n + 'ブロック', 'stone', { t: tile('gem' + n, P_.gem(c === '#2a2a2a' ? '#1a1a1a' : c)) });
  add('アメジスト', 'stone', { t: tile('ame', P_.gem('#9a6ad8')) });
  add('さびたどう', 'stone', { t: tile('cu2', P_.copperRoof('#a0805a', '#6aa08a')) });
  add('あおいどう', 'stone', { t: tile('cu3', P_.gem('#5aa58e')) });
  add('カットしたどう', 'stone', { t: tile('cucut', P_.tiles('#c8774a', 2)) });
  add('ほねブロック', 'nature', { t: { top: tile('boneT', P_.logTop('#e8e2cc', '#d8d2bc')), bot: tile('boneT', null), side: tile('boneS', P_.logSide('#e8e2cc')) } });
  add('ネザーラック', 'nature', { t: tile('netherr', P_.noise('#7a2a2a', 0.3)) });
  add('ソウルサンド', 'nature', { t: tile('soul', P_.gravel('#54402e')) });
  add('ひかるコケ', 'light', { t: tile('gmoss', P_.soft('#8ae86a', 0.2)), mat: 2 });

  // 木
  WOODS.forEach(([n, plank, bark, inner, leaf, mark], wi) => {
    const tp = tile('plank' + n, P_.planks(plank)), ts = tile('log' + n, P_.logSide(bark, mark)), tt = tile('logT' + n, P_.logTop(inner, bark));
    const tst = tile('slog' + n, P_.logSide(inner)), tl = tile('leaf' + n, P_.leaves(leaf, n === 'サクラ' ? '#ffd8e6' : null));
    const d = { wood: wi };
    ID['log' + wi] = add(n + 'のげんぼく', 'wood', { ...d, t: { top: tt, bot: tt, side: ts }, axis: true }).id;
    add('かわをむいた' + n, 'wood', { ...d, t: { top: tt, bot: tt, side: tst }, axis: true });
    ID['plank' + wi] = add(n + 'のいた', 'wood', { ...d, t: tp }).id;
    add(n + 'のハーフ', 'wood', { ...d, t: tp, shape: 'slab' });
    add(n + 'のかいだん', 'wood', { ...d, t: tp, shape: 'stairs', rot: true }); add(n + 'のかいだん(そとかど)', 'wood', { ...d, t: tp, shape: 'stairsOut', rot: true }); add(n + 'のかいだん(うちかど)', 'wood', { ...d, t: tp, shape: 'stairsIn', rot: true });
    add(n + 'のフェンス', 'fence', { ...d, t: tp, shape: 'fence' });
    add(n + 'のさく(ひくい)', 'fence', { ...d, t: tp, shape: 'wall' });
    ID['leaf' + wi] = add(n + 'のはっぱ', 'wood', { ...d, t: tl, cut: true, tint: wi === 6 || wi === 11 ? null : 'leaf' }).id;
    add(n + 'のなえぎ', 'plant', { ...d, t: tile('sap' + n, (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const dx = x - 15.5, dy = y - 12; const leafy = dx * dx + dy * dy < 80 && P.r() > 0.25; const stem = Math.abs(dx) < 1.5 && y > 14; P.set(x, y, leafy ? mul(hx(leaf), 0.8 + P.r() * 0.4) : stem ? hx(bark) : [0, 0, 0], leafy || stem ? 255 : 0); } }), shape: 'cross', solid: false });
  });
  add('ほんだな', 'furn', { t: { top: tile('plankオーク', null), bot: tile('plankオーク', null), side: tile('books', (P) => { P_.planks('#b8945a')(P); const cols = ['#a33', '#3a6', '#36a', '#a83', '#738', '#2a8a8a']; for (let row = 0; row < 2; row++) { let x = 2; while (x < 30) { const w = 2 + Math.floor(P.r() * 3), h = 10 + Math.floor(P.r() * 4), c = hx(cols[Math.floor(P.r() * cols.length)].replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')); for (let xx = 0; xx < w && x + xx < 30; xx++) for (let yy = 0; yy < h; yy++) P.set(x + xx, row * 16 + 14 - yy, mul(c, xx === 0 ? 1.2 : 1)); x += w + (P.r() < 0.2 ? 1 : 0); } } }) } });

  // 石
  STONES.forEach(([n, c, p]) => {
    const t = tile('st' + n, stonePaint(c, p));
    const id = add(n, 'stone', { t }).id; if (n === 'いし') ID.stone = id; if (n === 'いしだたみ') ID.paving = id; if (n === 'まるいし') ID.cobble = id; if (n === 'レンガ') ID.brick = id;
    if (n === 'いしレンガ') ID.stonebrick = id; if (n === 'すないわ') ID.sandstone = id; if (n === 'しんそうがんタイル') ID.deepslateTile = id;
    add(n + 'のハーフ', 'stone', { t, shape: 'slab' });
    add(n + 'のかいだん', 'stone', { t, shape: 'stairs', rot: true }); add(n + 'のかいだん(そとかど)', 'stone', { t, shape: 'stairsOut', rot: true }); add(n + 'のかいだん(うちかど)', 'stone', { t, shape: 'stairsIn', rot: true });
    add(n + 'のへい', 'fence', { t, shape: 'wall' });
  });

  // 色ブロック
  COLORS.forEach(([n, c], ci) => {
    const tw = tile('wool' + n, P_.wool(c));
    ID['wool' + ci] = add(n + 'のぬの', 'color', { t: tw, color: ci }).id;
    ID['conc' + ci] = add(n + 'のコンクリート', 'color', { t: tile('conc' + n, P_.flat(c)), color: ci }).id;
    add(n + 'のテラコッタ', 'color', { t: tile('terra' + n, P_.terracotta(mix(hx(c), hx('#9a6a50'), 0.35))), color: ci });
    add(n + 'のもようタイル', 'color', { t: tile('glz' + n, P_.glazed(c, mix(hx(c), [255, 255, 255], 0.55))), color: ci });
    ID['plaster' + ci] = add(n + 'のかべ', 'color', { t: tile('pl' + n, P_.plaster(mix(hx(c), [250, 248, 240], 0.25))), color: ci }).id;
    add(n + 'のレンガ', 'color', { t: tile('cb' + n, P_.bricks(c, '#e8e2d6')), color: ci });
    add(n + 'のタイル', 'color', { t: tile('ctile' + n, P_.tiles(c, 4)), color: ci });
    add(n + 'のぬののハーフ', 'color', { t: tw, shape: 'slab', color: ci });
    add(n + 'のカーペット', 'color', { t: tw, shape: 'carpet', solid: false, color: ci });
    ID['glass' + ci] = add(n + 'のいろガラス', 'glass', { t: tile('cg' + n, P_.glass(c, 120)), mat: 1, glassy: true, color: ci }).id;
    add(n + 'のガラスいた', 'glass', { t: tile('cg' + n, null), mat: 1, shape: 'pane', glassy: true, color: ci });
    ID['lamp' + ci] = add(n + 'のランプ', 'light', { t: tile('lamp' + n, P_.lamp(mix(hx(c), [255, 255, 255], 0.2))), mat: 2, color: ci, light: 1 }).id;
  });
  const WP = [['いちごの', '#ffe2ea', (x, y) => (((x + 4) % 16 < 3 && (y + 4) % 16 < 3) ? [230, 70, 90] : null)], ['しまの', '#e8f4ff', (x, y) => (x % 8 < 3 ? [180, 210, 240] : null)], ['はなの', '#fff6e0', (x, y) => { const dx = (x % 16) - 8, dy = (y % 16) - 8; return dx * dx + dy * dy < 6 ? [250, 180, 60] : dx * dx + dy * dy < 18 ? [240, 140, 170] : null; }], ['ほしの', '#2a3060', (x, y) => (((x * 7 + y * 11) % 23) < 2 ? [255, 240, 150] : null)],
    ['チェックの', '#fff', (x, y) => (((x >> 3) + (y >> 3)) % 2 ? [200, 230, 200] : null)], ['くもの', '#bfe6ff', (x, y) => { const v = Math.sin(x * 0.4) + Math.cos(y * 0.5); return v > 1.2 ? [255, 255, 255] : null; }], ['ドットの', '#f2e8ff', (x, y) => ((x % 8 - 4) ** 2 + (y % 8 - 4) ** 2 < 4 ? [180, 140, 230] : null)], ['もりの', '#e8f5dc', (x, y) => ((x % 16 === 8 && y % 16 > 4) || (Math.abs(x % 16 - 8) < (y % 16) / 3 && y % 16 < 10) ? [90, 160, 90] : null)]];
  WP.forEach(([n, bg, fn]) => add(n + 'かべがみ', 'color', { t: tile('wp' + n, (P) => { const b = hx(bg); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(fn(x, y) || b, 0.97 + P.r() * 0.04)); }) }));
  add('たたみ', 'wood', { t: tile('tatami', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, x < 2 || x > 29 ? [60, 90, 60] : mul([196, 200, 130], 0.92 + (y % 3 === 0 ? -0.05 : 0.03) + P.r() * 0.05)); }) });
  add('ヘリンボーンのゆか', 'wood', { t: tile('herring', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const k = Math.floor((x + y) / 8) % 2, l = ((k ? x - y : x + y) + 64) % 8; P.set(x, y, mul([180, 130, 80], (k ? 1.05 : 0.9) * (l === 0 ? 0.75 : 1) * (0.95 + P.r() * 0.06))); } }) });
  add('しろい タイルの ゆか', 'stone', { t: tile('wtile', P_.tiles('#f4f4f0', 2)) }); add('もようタイルの ゆか', 'stone', { t: tile('mtile', P_.tiles('#e8e0d0', 4, '#7a9ac0')) });
  add('あついガラスのかべ', 'glass', { t: tile('thickglass', P_.glass('#e8fbff', 25)), mat: 1, glassy: true });
  add('しきりかべ（き）', 'glass', { t: tile('plankオーク', null), shape: 'pane' }); add('しきりかべ（しろ）', 'glass', { t: tile('concしろ', null), shape: 'pane' });
  ID.glass = add('ガラス', 'glass', { t: tile('glass', P_.glass('#d8eef6', 40)), mat: 1, glassy: true }).id;
  ID.pane = add('ガラスいた', 'glass', { t: tile('glass', null), mat: 1, shape: 'pane', glassy: true }).id;
  add('わくつきまど', 'glass', { t: tile('winframe', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const f = x < 3 || y < 3 || x > 28 || y > 28 || (x > 14 && x < 17) || (y > 14 && y < 17); P.set(x, y, f ? hx('#f4f0e6') : hx('#bfe0f0'), f ? 255 : 70); } }), mat: 1, glassy: true });
  add('しょうじまど', 'glass', { t: tile('shojiwin', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const f = x < 2 || y < 2 || x > 29 || y > 29 || x % 8 === 0 || y % 10 === 0; P.set(x, y, f ? hx('#8a6a44') : hx('#f6f0dc'), f ? 255 : 220); } }), mat: 1, glassy: true });
  add('ステンドグラス', 'glass', { t: tile('stained', (P) => { const cs = ['#e04a4a', '#4a8ae0', '#f0c040', '#5ac06a', '#a05ae0']; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const cell = (Math.floor(x / 8) * 3 + Math.floor(y / 8) * 7) % 5; const e = x % 8 === 0 || y % 8 === 0; P.set(x, y, e ? [40, 40, 40] : hx(cs[cell]), e ? 255 : 170); } }), mat: 1, glassy: true });
  add('てつごうし', 'glass', { t: tile('bars', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const f = x % 8 < 2 || y < 2 || y > 29; P.set(x, y, [90, 92, 96], f ? 255 : 0); } }), shape: 'pane', cut: true });

  // 屋根
  ROOF_MATS.forEach(([mn, c, p], mi) => {
    const t = tile('roof' + mn, roofPaint(c, p));
    ROOF_SHAPES.forEach(([sn, shape]) => {
      const id = add(mn + 'の' + sn, 'roof', { t, shape, rot: shape !== 'slab' && shape !== 'pyramid' && shape !== 'dome', roofMat: mi, mat: p === 'glass' ? 1 : 0, glassy: p === 'glass' }).id;
      ID['roof_' + mi + '_' + shape] = id;
    });
    ID['roofblock' + mi] = add(mn + 'ブロック', 'roof', { t, roofMat: mi, mat: p === 'glass' ? 1 : 0, glassy: p === 'glass' }).id;
  });
  ID.roofRed = ID['roof_0_slope'];

  // ドア
  DOORS.forEach((dd, di) => { const gate = dd[2] === 'gate'; const slide = dd[3] === 'slide'; ID['door' + di] = add(dd[0], gate ? 'fence' : 'door', { shape: 'door', door: di, rot: true, solid: true, gate, slide }).id; });
  // てすり・ベランダのさく・まどわく
  [['しろい', 'concしろ'], ['てつの', 'concくろ'], ['オークの', 'plankオーク'], ['ダークオークの', 'plankダークオーク'], ['サクラの', 'plankサクラ'], ['あおい', 'concあお']].forEach(([n, t]) => { const tt = tile(t, null); add(n + 'ベランダのさく', 'fence', { t: tt, shape: 'rail', rot: true }); add(n + 'てすり', 'fence', { t: tt, shape: 'handrail', rot: true, solid: false }); });
  [['しろい', 'concしろ'], ['きの', 'plankオーク'], ['くろい', 'concくろ'], ['あおい', 'concみずいろ'], ['ピンクの', 'concピンク']].forEach(([n, t]) => { const tt = tile(t, null); add(n + 'まどわく', 'glass', { t: tt, shape: 'window', rot: true, cross: true, glassy: true }); add(n + 'まどわく(1まい)', 'glass', { t: tt, shape: 'window', rot: true, cross: false, glassy: true }); });

  // 植物（クロス）
  const FL = [['たんぽぽ', '#f6d22a', 'round'], ['ポピー', '#d8282a', 'round'], ['ヤグルマギク', '#4a6ad8', 'star'], ['アリウム', '#b45ad8', 'ball'], ['ヒナソウ', '#c8d8f0', 'small'],
    ['あかいチューリップ', '#e02a2a', 'tulip'], ['オレンジのチューリップ', '#f08a2a', 'tulip'], ['しろいチューリップ', '#f4f4f0', 'tulip'], ['ピンクのチューリップ', '#f4a0c0', 'tulip'],
    ['フランスギク', '#f8f8f4', 'daisy'], ['スズラン', '#ffffff', 'bell'], ['ひまわり', '#f8c818', 'big'], ['バラ', '#d0203a', 'round'], ['ライラック', '#c8a0e0', 'ball'], ['ボタン', '#f0a8c8', 'big'],
    ['コスモス', '#f088b8', 'daisy'], ['あおいアジサイ', '#6a8ae8', 'ball'], ['ピンクのアジサイ', '#e888c0', 'ball'], ['ハイビスカス', '#e8384a', 'big'], ['ネモフィラ', '#8ac0f0', 'small'],
    ['すいせん', '#f8e870', 'daisy'], ['あさがお', '#5a5ae0', 'big'], ['クローバー', '#4aa83a', 'clover'], ['ラベンダーのはな', '#9a7ad8', 'spike'], ['なのはな', '#f0e040', 'spike']];
  FL.forEach(([n, c, s]) => add(n, 'plant', { t: tile('fl' + n, flowerPaint(c, s)), shape: 'cross', solid: false }));
  ID.tallgrass = add('くさむら', 'plant', { t: tile('tgrass', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(hx('#6aa83a'), 0.8 + P.r() * 0.4), 0); for (let k = 0; k < 9; k++) { let x = 3 + Math.floor(P.r() * 26); const h = 10 + Math.floor(P.r() * 18); for (let y = 0; y < h; y++) { P.alpha(Math.round(x + Math.sin(y * 0.2 + k) * 1.2), T - 1 - y, 255); } } }), shape: 'cross', solid: false }).id;
  add('シダ', 'plant', { t: tile('fern', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const dx = Math.abs(x - 15.5), ok = dx < 1 || (y % 4 < 2 && dx < (T - y) * 0.45); P.set(x, y, mul(hx('#4a8a3a'), 0.85 + P.r() * 0.3), ok && y > 2 ? 255 : 0); } }), shape: 'cross', solid: false });
  add('すすき', 'plant', { t: tile('susuki', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, [0, 0, 0], 0); for (let k = 0; k < 5; k++) { const bx = 8 + k * 4; for (let y = 4; y < T; y++) { const x = Math.round(bx + (T - y) * 0.15 * (k - 2) * 0.3); P.set(x, y, y < 12 ? hx('#e8dcc0') : hx('#7a9a4a')); } } }), shape: 'cross', solid: false });
  add('かれき', 'plant', { t: tile('deadbush', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, [0, 0, 0], 0); const br = (x, y, a, l) => { for (let i = 0; i < l; i++) { P.set(Math.round(x), Math.round(y), hx('#8a6a3a')); x += Math.cos(a); y -= Math.sin(a); } if (l > 4) { br(x, y, a + 0.5, l * 0.6); br(x, y, a - 0.5, l * 0.6); } }; br(16, 31, Math.PI / 2, 12); }), shape: 'cross', solid: false });
  add('あかいきのこ', 'plant', { t: tile('mushr', mushPaint('#d02a2a', true)), shape: 'cross', solid: false });
  add('ちゃいろのきのこ', 'plant', { t: tile('mushb', mushPaint('#9a6a4a', false)), shape: 'cross', solid: false });
  add('さとうきび', 'plant', { t: tile('cane', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const on = [6, 7, 15, 16, 24, 25].includes(x); P.set(x, y, mul(hx('#8ac85a'), (y % 8 === 0 ? 0.75 : 1) * (0.9 + P.r() * 0.2)), on ? 255 : 0); } }), shape: 'cross', solid: false });
  add('タケノコ', 'plant', { t: tile('takenoko', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const w = (y - 8) * 0.35; const on = y > 8 && Math.abs(x - 15.5) < w; P.set(x, y, mul(hx('#8a6a3a'), (y % 5 === 0 ? 0.7 : 1)), on ? 255 : 0); } }), shape: 'cross', solid: false });
  ID.rainbowFlower = add('にじいろのはな', 'plant', { t: tile('flRainbow', (P) => { flowerPaint('#ff6a8a', 'big')(P); for (let y = 0; y < 16; y++) for (let x = 6; x < 26; x++) { const a = P.get(x, y); if (a[3] > 0 && !(a[1] > a[0])) { const hh = (x + y) / 32; P.set(x, y, [Math.sin(hh * 6) * 120 + 135, Math.sin(hh * 6 + 2) * 120 + 135, Math.sin(hh * 6 + 4) * 120 + 135]); } } }), shape: 'cross', solid: false, mat: 2, secret: 1 }).id;
  ID.moonFlower = add('つきみそう', 'plant', { t: tile('flMoon', flowerPaint('#fff8b0', 'daisy')), shape: 'cross', solid: false, mat: 2, secret: 1 }).id;
  add('はっぱのしげみ', 'plant', { t: tile('leafオーク', null), cut: true });
  add('つた', 'plant', { t: tile('vine', P_.leaves('#3a7a2a')), shape: 'carpet', solid: false, cut: true });
  add('はすのは', 'plant', { t: tile('lily', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const dx = x - 15.5, dy = y - 15.5, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx); P.set(x, y, mul(hx('#3a8a3a'), 0.85 + P.r() * 0.2), r < 14 && !(a > -0.2 && a < 0.2) ? 255 : 0); } }), shape: 'carpet', solid: false, cut: true });

  // あかり
  ID.torch = add('たいまつ', 'light', { t: tile('torch', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, y < 12 ? mix(hx('#ffe060'), hx('#ff8a20'), y / 12) : hx('#7a5a34')); }), shape: 'torch', mat: 2, solid: false, light: 1 }).id;
  add('ソウルたいまつ', 'light', { t: tile('storch', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, y < 12 ? mix(hx('#a0f8ff'), hx('#30c0e0'), y / 12) : hx('#5a4a34')); }), shape: 'torch', mat: 2, solid: false, light: 1 });
  add('グロウストーン', 'light', { t: tile('glowst', P_.glowstone()), mat: 2, light: 1 });
  add('シーランタン', 'light', { t: tile('sealant', P_.tiles('#d8f0ea', 2, '#b8e0e0')), mat: 2, light: 1 });
  add('ジャックオランタン', 'light', { t: { top: tile('pumT', null), bot: tile('pumT', null), side: tile('jackS', (P) => { P_.metal('#e08a2c')(P); const face = [[8, 9], [9, 9], [22, 9], [23, 9], [8, 10], [23, 10]]; for (let y = 6; y < 13; y++) for (let x = 7; x < 12; x++) P.set(x, y, [255, 220, 80]); for (let y = 6; y < 13; y++) for (let x = 20; x < 25; x++) P.set(x, y, [255, 220, 80]); for (let x = 7; x < 25; x++) for (let y = 19; y < 24; y++) if (!(y === 19 && x % 5 === 0)) P.set(x, y, [255, 210, 70]); }) }, mat: 2, light: 1 });
  add('ちょうちん', 'light', { shape: 'model', model: 'chochin', mat: 2, solid: false, light: 1 });
  add('ランタン', 'light', { shape: 'model', model: 'lantern', mat: 2, solid: false, light: 1 });
  add('ろうそく', 'light', { shape: 'model', model: 'candle', mat: 2, solid: false, light: 1 });
  add('いしどうろう', 'light', { shape: 'model', model: 'toro', mat: 0, light: 1 });
  add('がいとう', 'light', { shape: 'model', model: 'streetlamp', mat: 0, light: 1 });
  add('かがりび', 'light', { shape: 'model', model: 'brazier', mat: 0, light: 1 });
  add('ほしのライト', 'light', { t: tile('starlamp', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const dx = x - 15.5, dy = y - 15.5, a = Math.atan2(dy, dx), r = Math.sqrt(dx * dx + dy * dy); const s = 9 + Math.cos(a * 5) * 5; P.set(x, y, r < s ? hx('#fff0a0') : hx('#3a3a7a')); } }), mat: 2, light: 1 });

  // 家具
  for (const f of FURN) add(f[0], 'furn', { shape: 'model', model: f[1], color: f[2], rot: true, solid: f[3] !== false, bed: ['bed', 'futon', 'hammock', 'bunkbed', 'loftbed', 'doublebed'].includes(f[1]), seat: f[4] });
  COLORS.forEach(([n], ci) => { add(n + 'のベッド', 'furn', { shape: 'model', model: 'bed', color: ci, rot: true, bed: true }); });
  COLORS.forEach(([n], ci) => { add(n + 'のソファ', 'furn', { shape: 'model', model: 'sofa', color: ci, rot: true, seat: true }); });
  [0, 5, 6, 10, 11, 14].forEach((ci) => add(COLORS[ci][0] + 'のカーテン', 'furn', { shape: 'model', model: 'curtain', color: ci, rot: true, solid: false }));
  [0, 1, 6, 4].forEach((wi) => add(WOODS[wi][0] + 'のウッドデッキ', 'wood', { shape: 'model', model: 'deck', color: wi, rot: true, wood: wi }));
  const RUGS = [['まるもようの', (P, x, y) => (Math.floor(Math.hypot(x - 15.5, y - 15.5) / 3) % 2 ? [240, 120, 140] : [250, 230, 200])], ['しましまの', (P, x, y) => ((y >> 2) % 2 ? [90, 160, 230] : [250, 250, 245])], ['チェックの', (P, x, y) => (((x >> 3) + (y >> 3)) % 2 ? [200, 60, 60] : [245, 235, 220])], ['はなもようの', (P, x, y) => { const dx = (x % 16) - 8, dy = (y % 16) - 8; return dx * dx + dy * dy < 14 ? [250, 200, 60] : dx * dx + dy * dy < 40 ? [240, 140, 180] : [150, 200, 130]; }], ['ほしもようの', (P, x, y) => (((x * 7 + y * 13) % 29) < 2 ? [255, 240, 120] : [40, 50, 110])], ['ハートの', (P, x, y) => { const X = ((x % 16) - 8) / 6, Y = -((y % 16) - 8) / 6; return (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y < 0 ? [240, 90, 130] : [255, 230, 236]; }]];
  RUGS.forEach(([n, fn], i) => add(n + 'ラグ', 'furn', { t: tile('rug' + i, (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, mul(fn(P, x, y), 0.95 + P.r() * 0.06)); }), shape: 'carpet', solid: false }));
  add('たき', 'nature', { t: tile('falls', (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const st = (Math.sin(x * 1.3) + Math.sin(x * 0.7 + y * 0.2)) * 0.25 + 0.5; P.set(x, y, mix(hx('#5ab0f0'), hx('#ffffff'), st * 0.6), 175); } }), mat: 1, solid: false, glassy: true });
  COLORS.forEach(([n], ci) => { add(n + 'のざぶとん', 'furn', { shape: 'model', model: 'zabuton', color: ci, rot: true, solid: false, seat: true }); });
  // ふわふわ かぐ（Kenney Furniture Kit・CC0）— かならず さいごに ついか（ID を ずらさない）
  for (const [k, n, o] of KFURN) add(n, 'kfurn', Object.assign({ shape: 'kmodel', kmodel: k, rot: true, solid: true }, o || {}));
}
// [モデル名, なまえ, オプション]
export const KFURN = [
  ['bedSingle', 'ふわふわベッド', { bed: true }], ['bedBunk', 'にだんベッド', { bed: true }], ['bench', 'きのベンチ', { seat: true }], ['benchCushion', 'クッションベンチ', { seat: true }],
  ['chair', 'シンプルいす', { seat: true }], ['chairCushion', 'クッションいす', { seat: true }], ['chairRounded', 'まるいす', { seat: true }], ['stoolBar', 'たかいいす', { seat: true }],
  ['loungeChair', 'ひとりがけソファ', { seat: true }], ['loungeSofa', 'ふわふわソファ', { seat: true }], ['loungeSofaCorner', 'コーナーソファ', { seat: true }], ['loungeDesignSofa', 'おしゃれソファ', { seat: true }],
  ['tableRound', 'まるテーブル'], ['tableCloth', 'クロスのテーブル'], ['tableCoffee', 'ローテーブル'], ['sideTable', 'サイドテーブル'], ['desk', 'べんきょうづくえ'],
  ['bookcaseOpen', 'ほんだな'], ['bookcaseClosedWide', 'ひろいたな'], ['books', 'ほんの やま', { solid: false }], ['cabinetTelevision', 'テレビだい'], ['televisionModern', 'うすいテレビ'], ['televisionVintage', 'むかしのテレビ'],
  ['computerScreen', 'パソコン'], ['laptop', 'ノートパソコン', { solid: false }], ['radio', 'ラジオ', { solid: false }], ['speaker', 'スピーカー'],
  ['kitchenFridge', 'れいぞうこ'], ['kitchenStove', 'コンロ'], ['kitchenSink', 'ながし'], ['kitchenCabinet', 'キッチンだな'], ['kitchenMicrowave', 'でんしレンジ', { solid: false }], ['kitchenCoffeeMachine', 'コーヒーメーカー', { solid: false }], ['kitchenBlender', 'ミキサー', { solid: false }], ['toaster', 'トースター', { solid: false }],
  ['washer', 'せんたくき'], ['bathtub', 'おふろ'], ['toilet', 'トイレ', { seat: true }], ['bathroomSink', 'せんめんだい'], ['trashcan', 'ごみばこ'],
  ['lampRoundFloor', 'まるい スタンドライト', { light: 1 }], ['lampSquareFloor', 'しかくい スタンドライト', { light: 1 }], ['lampRoundTable', 'テーブルライト', { light: 1, solid: false }],
  ['plantSmall1', 'ちいさな はちうえ', { solid: false }], ['plantSmall2', 'ちいさな はちうえ2', { solid: false }], ['plantSmall3', 'ちいさな はちうえ3', { solid: false }], ['pottedPlant', 'おおきな はちうえ'],
  ['rugRound', 'まるい じゅうたん', { solid: false }], ['rugRectangle', 'ながい じゅうたん', { solid: false }], ['rugRounded', 'かどまる じゅうたん', { solid: false }],
  ['bear', 'くまの ぬいぐるみ', { solid: false }], ['pillow', 'しろい まくら', { solid: false }], ['pillowBlue', 'あおい まくら', { solid: false }], ['cardboardBoxClosed', 'だんボール'], ['coatRackStanding', 'ぼうしかけ'],
];

function flowerPaint(c, s) {
  c = hx(c); const stem = hx('#4a8a32');
  return (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, [0, 0, 0], 0);
    const cx = 15.5, top = s === 'big' ? 8 : s === 'small' ? 18 : 12;
    for (let y = top; y < T; y++) { P.set(15, y, stem); P.set(16, y, mul(stem, 0.85)); }
    for (let k = 0; k < 2; k++) { const ly = 22 + k * 4, dir = k ? 1 : -1; for (let i = 0; i < 6; i++) { P.set(Math.round(cx + dir * i), ly - Math.floor(i / 2), stem); P.set(Math.round(cx + dir * i), ly - Math.floor(i / 2) + 1, mul(stem, 0.8)); } }
    const blob = (bx, by, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) P.set(Math.round(bx + x), Math.round(by + y), mul(col, 0.88 + P.r() * 0.2)); };
    if (s === 'tulip') { for (let y = 0; y < 9; y++) for (let x = -4; x <= 4; x++) if (y > 2 || Math.abs(x) % 3 !== 2) P.set(Math.round(cx + x), top - 4 + y, mul(c, 0.85 + y * 0.03)); }
    else if (s === 'daisy' || s === 'star') { for (let a = 0; a < 8; a++) blob(cx + Math.cos(a * 0.785) * 5, top + Math.sin(a * 0.785) * 5, 2, c); blob(cx, top, 2, s === 'daisy' ? hx('#f6c020') : mul(c, 0.6)); }
    else if (s === 'ball') { for (let k = 0; k < 14; k++) blob(cx + (P.r() - 0.5) * 12, top + (P.r() - 0.5) * 10, 2, c); }
    else if (s === 'bell') { for (let k = 0; k < 4; k++) blob(cx + 4 + (k % 2) * 3, top + 2 + k * 4, 2, c); }
    else if (s === 'spike') { for (let y = 0; y < 14; y++) blob(cx + (y % 2 ? 1.5 : -1.5), top - 4 + y, 1.5, c); }
    else if (s === 'clover') { blob(cx - 4, top + 6, 4, mul(stem, 1.2)); blob(cx + 4, top + 6, 4, mul(stem, 1.2)); blob(cx, top + 2, 4, mul(stem, 1.25)); }
    else if (s === 'big') { for (let a = 0; a < 10; a++) blob(cx + Math.cos(a * 0.628) * 6, top + Math.sin(a * 0.628) * 6, 3, c); blob(cx, top, 4, s === 'big' && c[0] > 200 && c[1] > 150 ? hx('#6a3a1a') : hx('#f8e060')); }
    else if (s === 'small') { for (let a = 0; a < 4; a++) blob(cx + Math.cos(a * 1.57) * 3, top + Math.sin(a * 1.57) * 3, 2, c); blob(cx, top, 1, hx('#f8e060')); }
    else { blob(cx, top, 5, c); blob(cx - 1, top - 1, 2, mul(c, 1.25)); }
  };
}
function mushPaint(c, dots) {
  return (P) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, [0, 0, 0], 0);
    for (let y = 18; y < T; y++) for (let x = 13; x < 19; x++) P.set(x, y, hx('#efe6d4'));
    for (let y = 8; y < 19; y++) for (let x = 4; x < 28; x++) { const dx = (x - 15.5) / 12, dy = (y - 19) / 11; if (dx * dx + dy * dy < 1) P.set(x, y, dots && P.vn(x, y, 4) > 0.7 ? [250, 245, 240] : mul(hx(c), 0.9 + P.r() * 0.15)); } };
}

// ドア 40種: [なまえ, 色, スタイル, 色2]
export const DOORS = [
  ...WOODS.map((w) => [w[0] + 'のドア', w[1], 'panel']),
  ['てつのドア', '#c8cacc', 'iron'], ['ガラスのドア', '#d8eef6', 'glass'], ['しょうじのとびら', '#f6f0dc', 'shoji'], ['ふすま', '#e8dcc0', 'fusuma'],
  ['こうしど', '#7a5a3a', 'lattice'], ['くらのとびら', '#f2f0ea', 'kura'], ['あかいげんかん', '#c8322e', 'panel2'], ['あおいげんかん', '#3352b8', 'panel2'],
  ['きいろのげんかん', '#f5cf30', 'panel2'], ['みどりのげんかん', '#4a7f2c', 'panel2'], ['ピンクのげんかん', '#f08cb2', 'panel2'], ['しろいげんかん', '#f2f2ee', 'panel2'],
  ['くろいげんかん', '#2a2a2e', 'panel2'], ['みずいろのげんかん', '#4fb6e3', 'panel2'], ['むらさきのげんかん', '#7f3ca8', 'panel2'], ['おしろのとびら', '#6a4a2a', 'castle'],
  ['まるいとびら', '#4a8a3a', 'round'], ['アーチまどのドア', '#a07850', 'arch'], ['うちゅうせんのドア', '#b8c8d8', 'space'], ['おかしのドア', '#c88a5a', 'candy'],
  ['おみせのドア', '#2a6a5a', 'shop'], ['ようかんのドア', '#5a2a2a', 'mansion'], ['こやのドア', '#8a6a4a', 'barn'], ['ほしのドア', '#3a3a7a', 'star'],
  ['ハートのドア', '#f07aa0', 'heart'], ['きんのドア', '#e8c040', 'panel2'], ['こおりのドア', '#a8d8f0', 'glass'], ['ぬののドア(のれん)', '#2a4a8a', 'noren'],
  ['りょうびらきドア（き）', '#a07850', 'double'], ['りょうびらきドア（しろ）', '#f2f2ee', 'double'], ['ひきど（しょうじ）', '#f6f0dc', 'shoji', 'slide'], ['ひきど（ガラス）', '#d8eef6', 'glass', 'slide'], ['ひきど（き）', '#b8945a', 'lattice', 'slide'],
  ...WOODS.map((w) => [w[0] + 'のもん', w[1], 'gate']), ['てつのもん', '#3a3a40', 'gate'], ['しろいもん', '#f2f2ee', 'gate'],
];
// ドアは 32×64 のキャンバスで描く
const doorCache = new Map();
export function doorCanvas(di) {
  if (doorCache.has(di)) return doorCache.get(di);
  const [, col, st] = DOORS[di]; const W = 32, H = 64;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const c = hx(col), rgb = (cc, f = 1) => `rgb(${cc[0] * f | 0},${cc[1] * f | 0},${cc[2] * f | 0})`;
  const r = mulberry(di * 999 + 7);
  g.fillStyle = rgb(c); g.fillRect(0, 0, W, H);
  const grain = () => { for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * W | 0, r() * H | 0, 1, 3); } };
  const frame = (f = 0.7) => { g.strokeStyle = rgb(c, f); g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2); };
  const panel = (x, y, w, h) => { g.fillStyle = rgb(c, 0.86); g.fillRect(x, y, w, h); g.fillStyle = rgb(c, 1.12); g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h); g.fillStyle = rgb(c, 0.65); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h); };
  const knob = (clr = '#e8c860') => { g.fillStyle = clr; g.beginPath(); g.arc(25, 34, 2, 0, 7); g.fill(); };
  const win = (x, y, w, h) => { g.clearRect(x, y, w, h); g.fillStyle = 'rgba(200,232,248,0.45)'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 2, y + 2, 2, h - 6); };
  switch (st) {
    case 'panel': grain(); panel(4, 5, 10, 22); panel(18, 5, 10, 22); panel(4, 34, 10, 25); panel(18, 34, 10, 25); frame(); knob(); break;
    case 'panel2': panel(4, 5, 24, 20); panel(4, 30, 24, 29); win(9, 9, 14, 12); frame(0.6); knob(); break;
    case 'iron': g.fillStyle = rgb(c, 0.9); for (let y = 6; y < H; y += 14) g.fillRect(3, y, W - 6, 2); for (let y = 4; y < H; y += 7) { g.fillStyle = '#888'; g.fillRect(4, y, 2, 2); g.fillRect(26, y, 2, 2); } win(9, 8, 14, 12); frame(0.55); knob('#555'); break;
    case 'glass': win(4, 4, 24, 56); g.fillStyle = rgb(c, 0.75); g.fillRect(0, 0, W, 4); g.fillRect(0, H - 4, W, 4); g.fillRect(0, 0, 4, H); g.fillRect(W - 4, 0, 4, H); g.fillRect(4, 31, 24, 2); knob('#ccc'); break;
    case 'shoji': g.fillStyle = '#f6f0dc'; g.fillRect(0, 0, W, H); g.fillStyle = '#8a6a44'; for (let x = 0; x <= W; x += 8) g.fillRect(Math.min(x, W - 2), 0, 2, H); for (let y = 0; y <= H; y += 10) g.fillRect(0, Math.min(y, H - 2), W, 2); break;
    case 'fusuma': g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, W, H); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(80,120,80,0.35)'; g.beginPath(); g.arc(6 + r() * 20, 10 + r() * 40, 3 + r() * 5, 0, 7); g.fill(); } g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H); g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillStyle = '#5a4a3a'; g.beginPath(); g.ellipse(24, 32, 2, 4, 0, 0, 7); g.fill(); break;
    case 'lattice': grain(); g.fillStyle = rgb(c, 0.6); for (let x = 3; x < W; x += 4) g.fillRect(x, 3, 1, 40); g.fillRect(2, 44, W - 4, 2); panel(4, 47, 24, 13); frame(0.5); break;
    case 'kura': g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, W, 3); g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H); for (let y = 8; y < H; y += 12) { g.fillStyle = '#ddd8cc'; g.fillRect(4, y, 24, 6); } g.fillStyle = '#2a2a2a'; g.fillRect(14, 30, 4, 6); break;
    case 'castle': grain(); g.fillStyle = rgb(c, 0.75); for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 1, H); g.fillStyle = '#3a3a3a'; for (const y of [10, 50]) { g.fillRect(2, y, W - 4, 4); for (let x = 4; x < W - 2; x += 6) { g.fillStyle = '#888'; g.fillRect(x, y + 1, 2, 2); g.fillStyle = '#3a3a3a'; } } g.strokeStyle = '#d8b040'; g.lineWidth = 2; g.beginPath(); g.arc(24, 32, 3, 0, 7); g.stroke(); break;
    case 'round': g.clearRect(0, 0, W, H); g.fillStyle = rgb(c); g.beginPath(); g.moveTo(0, H); g.lineTo(0, 16); g.arc(16, 16, 16, Math.PI, 0); g.lineTo(W, H); g.fill(); g.fillStyle = '#e8c860'; g.beginPath(); g.arc(16, 34, 3, 0, 7); g.fill(); g.strokeStyle = rgb(c, 0.6); g.lineWidth = 2; for (let x = 6; x < W; x += 6) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, H); g.stroke(); } break;
    case 'arch': grain(); panel(4, 36, 24, 24); g.fillStyle = rgb(c, 0.7); g.fillRect(4, 6, 24, 26); g.clearRect(6, 14, 20, 16); g.fillStyle = 'rgba(200,232,248,0.45)'; g.fillRect(6, 14, 20, 16); g.beginPath(); g.arc(16, 14, 10, Math.PI, 0); g.fill(); g.fillStyle = rgb(c, 0.7); g.fillRect(15, 6, 2, 24); frame(); knob(); break;
    case 'space': g.fillStyle = '#b8c8d8'; g.fillRect(0, 0, W, H); g.fillStyle = '#7a8a9a'; g.fillRect(15, 0, 2, H); g.fillStyle = '#4ae8f0'; g.fillRect(4, 28, 3, 8); g.fillRect(25, 28, 3, 8); g.fillStyle = '#f0c030'; for (let y = 54; y < 62; y += 4) for (let x = 0; x < W; x += 8) g.fillRect(x + (y % 8 ? 4 : 0), y, 4, 4); break;
    case 'candy': g.fillStyle = '#c88a5a'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; for (let y = 0; y < H; y += 8) { g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, y + (x % 8 ? 3 : 0)); g.lineTo(W, y + 2); g.lineTo(0, y + 2); g.fill(); } const cc = ['#f04a7a', '#4ac8f0', '#f0d040', '#7ad85a']; for (let i = 0; i < 10; i++) { g.fillStyle = cc[i % 4]; g.beginPath(); g.arc(4 + r() * 24, 6 + r() * 52, 2, 0, 7); g.fill(); } break;
    case 'shop': panel(3, 30, 26, 30); win(5, 4, 22, 22); g.fillStyle = '#f0e8d0'; g.fillRect(6, 27, 20, 3); g.fillStyle = '#c33'; g.font = 'bold 6px sans-serif'; g.fillText('OPEN', 9, 30); frame(0.5); knob(); break;
    case 'mansion': grain(); panel(3, 4, 12, 26); panel(17, 4, 12, 26); panel(3, 34, 12, 26); panel(17, 34, 12, 26); g.fillStyle = '#d8b040'; g.fillRect(14, 30, 4, 4); g.fillRect(0, 0, W, 2); frame(0.5); break;
    case 'barn': grain(); g.strokeStyle = rgb(c, 1.3); g.lineWidth = 3; g.strokeRect(3, 3, 26, 58); g.beginPath(); g.moveTo(3, 3); g.lineTo(29, 61); g.moveTo(29, 3); g.lineTo(3, 61); g.stroke(); break;
    case 'star': g.fillStyle = '#3a3a7a'; g.fillRect(0, 0, W, H); for (let i = 0; i < 25; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#ffe880'; g.fillRect(r() * W | 0, r() * H | 0, 1, 1); } g.fillStyle = '#ffe060'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4 : 9; g.lineTo(16 + Math.cos(a) * rr, 22 + Math.sin(a) * rr); } g.fill(); knob(); break;
    case 'heart': g.fillStyle = '#f07aa0'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff0f4'; g.beginPath(); g.moveTo(16, 32); g.bezierCurveTo(2, 22, 6, 8, 16, 16); g.bezierCurveTo(26, 8, 30, 22, 16, 32); g.fill(); frame(0.75); knob('#fff'); break;
    case 'double': grain(); panel(3, 5, 11, 54); panel(18, 5, 11, 54); win(5, 9, 7, 16); win(20, 9, 7, 16); g.fillStyle = rgb(c, 0.55); g.fillRect(15, 0, 2, H); g.fillStyle = '#e8c860'; g.fillRect(12, 32, 2, 4); g.fillRect(18, 32, 2, 4); break;
    case 'gate': g.clearRect(0, 0, W, H); g.fillStyle = rgb(c); for (let x = 1; x < W; x += 7) { g.fillRect(x, 4, 5, 60); g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 2.5, 0); g.lineTo(x + 5, 4); g.fill(); } g.fillStyle = rgb(c, 0.75); g.fillRect(0, 14, W, 5); g.fillRect(0, 48, W, 5); break;
    case 'noren': g.clearRect(0, 0, W, H); g.fillStyle = rgb(c); for (let i = 0; i < 3; i++) g.fillRect(i * 11, 0, 10, 30); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 14, 5, 0, 7); g.fill(); g.fillStyle = rgb(c); g.beginPath(); g.arc(16, 14, 3, 0, 7); g.fill(); break;
  }
  doorCache.set(di, cv);
  return cv;
}

// 家具: [なまえ, モデル, 色index, solid, すわれる]
export const FURN = [
  ['つくえ', 'table', 0], ['ちいさいつくえ', 'smalltable', 0], ['ちゃぶだい', 'chabudai', 0], ['こたつ', 'kotatsu', 5], ['いす', 'chair', 0, true, true], ['しろいいす', 'chair', 1, true, true],
  ['スツール', 'stool', 0, true, true], ['ベンチ', 'bench', 0, true, true], ['テレビ', 'tv', 0], ['パソコン', 'pc', 0], ['れいぞうこ', 'fridge', 0], ['キッチン', 'kitchen', 0],
  ['ながし', 'sink', 0], ['コンロ', 'stove', 0], ['おふろ', 'bath', 0], ['トイレ', 'toilet', 0, true, true], ['せんめんだい', 'washbasin', 0], ['たんす', 'dresser', 0],
  ['クローゼット', 'closet', 0], ['とけい', 'clock', 0], ['はしらどけい', 'grandclock', 0], ['ピアノ', 'piano', 0], ['はちうえ', 'pot', 0], ['おおきなかんようしょくぶつ', 'bigplant', 0],
  ['ゴミばこ', 'bin', 0], ['ポスト', 'mailbox', 5], ['かんばん', 'sign', 0], ['たる', 'barrel', 0], ['たからばこ', 'chest', 0], ['つぼ', 'vase', 0],
  ['こくばん', 'blackboard', 0], ['くまのぬいぐるみ', 'bear', 4], ['うさぎのぬいぐるみ', 'bunny', 14], ['ケーキ', 'cake', 0, false], ['まるいテーブル', 'roundtable', 1], ['ほんばこ(ひくい)', 'lowshelf', 0],
  ['かがみ', 'mirror', 0], ['だんろ', 'fireplace', 0], ['せんぷうき', 'fan', 0], ['ラジオ', 'radio', 6], ['ゲームき', 'console', 3], ['すべりだい', 'slide', 7],
  ['ブランコ', 'swing', 5], ['すなば', 'sandbox', 7, false], ['ふんすい', 'fountain', 0], ['こいのぼり', 'koinobori', 5], ['クリスマスツリー', 'xmastree', 0], ['ゆきだるま', 'snowman', 0],
  ['かかし', 'scarecrow', 0], ['たきび', 'campfire', 0, false], ['テント', 'tent', 10], ['パラソル', 'parasol', 5], ['ハンモック', 'hammock', 7], ['じはんき', 'vending', 5],
  ['でんわボックス', 'phonebox', 5], ['いど', 'well', 0], ['とりい', 'torii', 5], ['さいせんばこ', 'offering', 0], ['ほこら', 'hokora', 0], ['ぼんさい', 'bonsai', 0],
  ['ししおどし', 'shishi', 0], ['えんがわ', 'engawa', 0, true, true], ['こたつみかん', 'mikan', 6, false], ['まくら', 'pillow', 0, false], ['ふとん', 'futon', 11, false, true], ['ドレッサー', 'vanity', 14],
  ['ハンガーラック', 'rack', 0], ['ぬいぐるみタワー', 'plushtower', 14], ['アクアリウム', 'aquarium', 0], ['とりかご', 'birdcage', 7], ['いぬごや', 'doghouse', 5], ['ねこタワー', 'cattower', 16],
  ['にだんベッド', 'bunkbed', 4], ['ロフトベッド', 'loftbed', 10], ['せんたくき', 'washer', 0], ['シーソー', 'seesaw', 5], ['メリーゴーランド', 'merry', 14], ['えんとつ', 'chimney', 0], ['でまど', 'baywindow', 0], ['アーチまど', 'archwindow', 0], ['やねうらまど', 'dormer', 0], ['はし', 'bridge', 0], ['らせんかいだん', 'spiral', 0],
  ['かざりばしら', 'column', 0], ['まるばしら', 'rcolumn', 0], ['ついたて', 'screen', 0], ['べんきょうづくえ', 'studydesk', 0], ['ランドセルおき', 'randoseru', 5], ['いぬのぬいぐるみ', 'bear', 16], ['ねこのぬいぐるみ', 'bunny', 1], ['ペンギンのぬいぐるみ', 'penguin', 15], ['しゅうのうだな', 'storage', 0], ['エアコン', 'aircon', 0, false], ['キッチンカウンター', 'counter', 0], ['おおきなすいそう', 'bigtank', 0],
  ['はくぶつかんの てんじだい', 'display', 0], ['むしかご', 'bugcage', 7],
  ['がくぶち', 'artframe', 0, false], ['えの はた', 'artflag', 5], ['えの クッション', 'artcushion', 20, true, true], ['えの Tシャツかけ', 'artshirt', 0],
  ['ダブルベッド', 'doublebed', 14], ['ベビーカー', 'stroller', 10], ['かさたて', 'umbrellastand', 0], ['てんまど', 'skylight', 0, false], ['きの アーチ', 'woodarch', 0], ['かだんの かこい', 'flowerborder', 0, false], ['アーケードの やね', 'arcade', 0],
  ['おおきなかいがら', 'shell', 20], ['ふしぎな たからばこ', 'chest', 7],
  ['おもちゃばこ', 'toybox', 7], ['ペットベッド', 'petbed', 14, false], ['ステージ', 'stage', 5], ['がっこうのつくえ', 'schooldesk', 0, true, true], ['かだん', 'flowerbed', 0], ['ダイニングテーブル', 'diningtable', 0], ['ほんだな(たかい)', 'tallshelf', 0], ['おえかきボード', 'easel', 0], ['ボールいれ', 'ballbox', 10], ['つりざお', 'rodstand', 0],
];
reg();
for (const d of B) { if (!d.id) continue; d.fam = famOf(d); }
export const BLOCK_COUNT = B.length - 1;
export const isSolid = (id) => id > 0 && B[id].solid;
export const isFull = (id) => id > 0 && B[id].full;

function famOf(d) {
  const n = d.name;
  if (d.cat === 'roof' && d.roofMat != null) return 'r' + d.roofMat;
  if (d.color != null && (d.cat === 'color' || d.cat === 'glass' || d.cat === 'light' || d.model === 'bed' || d.model === 'sofa' || d.model === 'zabuton')) { const c = COLORS[d.color][0]; return 'c' + n.slice(c.length); }
  if (d.wood != null) { const w = WOODS[d.wood][0]; return 'w' + n.slice(w.length); }
  if (d.shape === 'door' && !d.gate) { if (n.endsWith('のドア') && WOODS.some((w) => n.startsWith(w[0]))) return 'dwood'; if (n.endsWith('げんかん')) return 'dgen'; }
  if (d.gate) return 'gate';
  if (n.endsWith('のこうせき')) return 'ore'; if (n.endsWith('ブロック') && d.cat === 'stone' && !n.includes('の')) return 'oreb';
  if (d.cat === 'stone' || (d.cat === 'fence' && d.shape === 'wall' && d.wood == null)) { const b = n.replace(/のハーフ$|のかいだん$|のへい$|のかいだん\(.+\)$/, ''); if (STONES.some((s) => s[0] === b)) return 's' + b; }
  if (d.cat === 'stone') { const b = n.replace(/のかいだん\(.+\)$/, ''); if (STONES.some((s) => s[0] === b)) return 's' + b; }
  if (d.shape === 'rail') return 'rail'; if (d.shape === 'handrail') return 'hrail'; if (d.shape === 'window') return 'win';
  return 'x' + d.id;
}
export const RECOMMEND = ['くさ', 'つち', 'すな', 'オークのいた', 'オークのげんぼく', 'しろのかべ', 'クリームのかべ', 'レンガ', 'いしレンガ', 'ガラス', 'しろいまどわく', 'あかがわらのさか', 'あかがわらのてっぺん', 'あおがわらのさか', 'しろいげんかん', 'オークのドア', 'きいろのベッド', 'つくえ', 'いす', 'たいまつ', 'たんぽぽ', 'みず', 'オークのフェンス', 'しろいベランダのさく'];
export const USE = { kotatsu: 'kotatsu', hammock: 'nap', mailbox: 'mail', stroller: 'walkbaby', umbrellastand: 'look', display: 'museum', bugcage: 'look', studydesk: 'study', aircon: 'cool', counter: 'cook', randoseru: 'read', penguin: 'play', bear: 'play', bigtank: 'look', storage: 'read', washer: 'laundry', seesaw: 'swing', merry: 'swing', table: 'dine', diningtable: 'dine', chabudai: 'dine', roundtable: 'dine', stove: 'cook', kitchen: 'cook', fridge: 'snack', tv: 'tv', bath: 'bath', piano: 'piano', lowshelf: 'read', tallshelf: 'read', toybox: 'play', console: 'game', swing: 'swing', slide: 'swing', blackboard: 'study', schooldesk: 'study', easel: 'paint', vanity: 'makeup', mirror: 'makeup', campfire: 'warm', fireplace: 'warm', flowerbed: 'garden', stage: 'stage', ballbox: 'ball', rodstand: 'fish', aquarium: 'look', radio: 'music', pc: 'game', well: 'look', offering: 'pray', hokora: 'pray' };
