// 住人の顔（パーツ＋お絵かき）と3Dモデル
import * as THREE from 'three';

export const SKINS = ['#ffe6d5', '#fcd9bf', '#f5c9a6', '#eab68b', '#d9a072', '#c48a5a', '#a86e44', '#8a5433', '#6a3f26', '#ffd8e4'];
export const HAIR_COLORS = ['#1e1a18', '#3b2a20', '#5a3a24', '#7a4e2c', '#a8743e', '#d9b064', '#f1dc9c', '#c0c0c0', '#f5f5f0', '#b8392f', '#e8742c', '#f0a8c0', '#8a5ad0', '#3a6ad8', '#3aa878', '#2a2a5a'];
export const EYE_COLORS = ['#1a1a1a', '#5a3a24', '#3a6a3a', '#3a5ab8', '#8a8a8a', '#c88a2a', '#8a3ac8', '#c83a4a'];
export const CLOTH_COLORS = ['#e8443a', '#f28a2c', '#f5cf30', '#86c63a', '#3aa858', '#4fb6e3', '#3352b8', '#7f3ca8', '#f08cb2', '#f2f2ee', '#3a3a40', '#8a5a3a'];
export const SHAPES = ['まる', 'たまご', 'ながい', 'しかく', 'ハート', 'ほそい', 'ふっくら', 'おにぎり'];
export const HAIRS = ['ショート', 'ぼっちゃん', 'ボブ', 'ロング', 'ポニーテール', 'ツインテール', 'おだんご', 'アフロ', 'ツンツン', 'モヒカン', 'ぼうず', 'つるつる',
  'ななめまえがみ', 'センターわけ', 'くるくる', 'みつあみ', 'ひめカット', 'リーゼント', 'アホげ', 'ふわふわロング', 'サイドテール', 'ベリーショート', 'おかっぱ', 'ちょんまげ', 'ウルフ', 'くるりんまえがみ', 'ハーフアップ', 'ツーブロック', 'ロングツインテール', 'おさげ'];
export const EYES = ['まる', 'つぶら', 'おおきい', 'たれめ', 'つりめ', 'ねむそう', 'にっこり', 'きらきら', 'まつげ', 'ほそめ', 'ジトめ', 'アニメ', 'しかく', 'たまご', 'ほし', 'ハート', 'ぐるぐる', 'しょうじょ', 'クール', 'ねこめ'];
export const BROWS = ['まっすぐ', 'アーチ', 'ふとい', 'ほそい', 'おこり', 'こまり', 'みじかい', 'まろ', 'もじゃ', 'ながい', 'なみ', 'なし'];
export const NOSES = ['てん', 'まる', 'かげ', 'ぶた', 'ながい', 'ひろい', 'L', 'うえむき', 'おおきい', 'せん', 'ちいさい', 'なし'];
export const MOUTHS = ['にこ', 'わらい', 'お', 'まっすぐ', 'へ', 'ねこ', 'にかっ', 'ベー', 'ちゅー', 'あーん', 'くちべに', 'なみ', 'ニヤ', 'でっぱ', 'さんかく', 'くちばし'];
export const GLASSES = ['なし', 'まる', 'しかく', 'はんぶん', 'サングラス', 'ほし', 'ハート', 'かため', 'ゴーグル', 'ねこ'];
export const BEARDS = ['なし', 'くちひげ', 'くるりひげ', 'あごひげ', 'もじゃひげ', 'ぶしょう', 'ながいひげ', 'もみあげ'];
export const PERSONALITIES = [
  { name: 'げんき', icon: '☀️', speed: 1.25, talk: ['やっほー！', 'あそぼうよ！', 'きょうも げんき いっぱい！', 'はしろう！', 'わーい！'] },
  { name: 'のんびり', icon: '🌙', speed: 0.8, talk: ['ふわぁ…', 'のんびり いこうね', 'ねむくなっちゃった', 'いい てんき だね〜', 'おひるね したいな'] },
  { name: 'しっかり', icon: '📘', speed: 1.0, talk: ['きょうの よてい は…', 'みんな げんき？', 'ちゃんと ごはん たべた？', 'きれいに しようね', 'がんばろう！'] },
  { name: 'マイペース', icon: '🌀', speed: 0.95, talk: ['ふふふ', 'なんか おもしろい こと ないかな', 'くもの かたち みてた', 'へんな ゆめ みたよ', 'ひみつ だよ'] },
  { name: 'あまえんぼ', icon: '🧸', speed: 1.0, talk: ['いっしょに いて〜', 'ぎゅってして！', 'ひとりは さみしいな', 'ねえねえ、あそんで！', 'えへへ、だいすき'] },
  { name: 'いたずら', icon: '😜', speed: 1.15, talk: ['しっしっし…', 'びっくり させちゃおう', 'ないしょの いたずら かんがえた！', 'つかまえてごらん！', 'へへーん'] },
  { name: 'はずかしがり', icon: '🌷', speed: 0.9, talk: ['あ、あの…', 'ちょっと はずかしい…', 'こんにちは…', 'みてたの？', 'えっと… ありがとう'] },
];
export const HATS = ['なし', 'キャップ', 'リボン', 'おうかん', 'はなかざり', 'ねこみみ', 'まじょぼうし', 'ベレーぼう', 'ヘッドホン', 'ニットぼう', 'むぎわらぼうし', 'うさみみ', 'てんしのわ', 'つの', 'はちまき', 'ヘアピン', 'カチューシャ', 'サンバイザー', 'パーティーハット', 'くまみみ'];
export const CLOTH_STYLES = ['Tシャツ', 'ながそで', 'パーカー', 'ワンピース', 'オーバーオール', 'ジャケット', 'セーラー', 'きもの', 'スーツ', 'ドレス'];
export const PATTERNS = ['むじ', 'しましま', 'みずたま', 'チェック', 'ほし'];

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (n) => Math.floor(Math.random() * n);
export function randomFace(name = '') {
  return {
    name, personality: ri(7), birthday: 2 + ri(12), talent: ri(6), weak: ri(6), walk: ri(4), voice: 0.85 + Math.random() * 0.35, laugh: ri(6), food: ri(20), shape: ri(8), skin: ri(9), hair: ri(24), hairColor: rnd(HAIR_COLORS.slice(0, 9)),
    eye: { t: ri(20), c: rnd(EYE_COLORS), y: 0, size: 1, sp: 0, rot: 0 }, brow: { t: ri(11), c: null, y: 0, size: 1, sp: 0, rot: 0 },
    nose: { t: ri(11), y: 0, size: 1 }, mouth: { t: ri(16), c: '#c84a4a', y: 0, size: 1 },
    glass: { t: Math.random() < 0.2 ? 1 + ri(9) : 0, c: '#2a2a2a', y: 0, size: 1 }, beard: Math.random() < 0.12 ? 1 + ri(7) : 0,
    blush: Math.random() < 0.5, freckles: Math.random() < 0.1, mole: Math.random() < 0.1 ? { x: 62, y: 62 } : null,
    height: 0.9 + Math.random() * 0.2, width: 0.9 + Math.random() * 0.25, shirt: rnd(CLOTH_COLORS), cstyle: ri(10), pattern: Math.random() < 0.4 ? 1 + ri(4) : 0, c2: rnd(['#ffffff', '#f5cf30', '#3a3a40', '#e8443a', '#4fb6e3']), pants: rnd(['#3a4a6a', '#3a3a40', '#8a5a3a', '#f2f2ee', '#4a6a3a']),
    hat: 0, drawing: null,
  };
}

// ---------- 顔テクスチャ（0..100座標）
const FX = 50, FY = 50;
function withT(g, x, y, sx, sy, rot, f) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, sy); f(); g.restore(); }
function ell(g, x, y, rx, ry, fill, stroke, lw = 0.8) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function line(g, pts, w, c, close) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function poly(g, pts, c) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); }
const K = '#231a17';

export function drawEye(g, t, col, expr) {
  // 原点中心・幅±4くらい
  if (expr === 'blink' && t !== 6) { line(g, [[-3.5, 0.3], [0, 1.2], [3.5, 0.3]], 0.9, K); return; }
  if (expr === 'happy' && t !== 6 && t !== 15 && t !== 16) { line(g, [[-3.2, 1], [0, -1.6], [3.2, 1]], 1, K); return; }
  const iris = (r, ry = r) => { ell(g, 0, 0, r, ry, col); ell(g, 0, 0, r * 0.55, ry * 0.55, K); ell(g, -r * 0.35, -ry * 0.4, r * 0.3, ry * 0.3, '#fff'); };
  switch (t) {
    case 0: ell(g, 0, 0, 1.9, 2.5, col || K); ell(g, -0.6, -0.9, 0.6, 0.7, '#fff'); break;
    case 1: ell(g, 0, 0, 1.2, 1.3, col || K); ell(g, -0.35, -0.4, 0.35, 0.35, '#fff'); break;
    case 2: ell(g, 0, 0, 3.6, 3.4, '#fff', K, 0.7); iris(2.3, 2.5); break;
    case 3: withT(g, 0, 0, 1, 1, 0.25, () => { ell(g, 0, 0, 3.6, 2.4, '#fff', K, 0.7); iris(1.8, 2.1); line(g, [[-3.8, -0.6], [0, -2.6], [3.8, -0.4]], 0.9, K); }); break;
    case 4: withT(g, 0, 0, 1, 1, -0.3, () => { ell(g, 0, 0, 3.8, 2.2, '#fff', K, 0.7); iris(1.7, 2); line(g, [[-3.8, 0], [0, -2.5], [4.2, -1.2]], 1.1, K); }); break;
    case 5: ell(g, 0, 0.5, 3.3, 2.3, '#fff', K, 0.7); g.save(); g.beginPath(); g.rect(-5, 0, 10, 5); g.clip(); iris(1.8, 2); g.restore(); line(g, [[-3.4, 0], [3.4, 0]], 1, K); break;
    case 6: line(g, [[-3.2, 1], [0, -1.8], [3.2, 1]], 1.1, K); break;
    case 7: ell(g, 0, 0, 3.6, 3.8, '#fff', K, 0.7); ell(g, 0, 0.2, 2.6, 3, col); ell(g, 0, 0.2, 1.3, 1.6, K); star(g, -0.8, -1, 1.2, '#fff'); ell(g, 1, 1.4, 0.5, 0.5, '#fff'); break;
    case 8: ell(g, 0, 0, 3.4, 2.4, '#fff', K, 0.7); iris(1.8, 2.1); for (let i = 0; i < 3; i++) line(g, [[1.5 + i * 0.9, -1.6 + i * 0.3], [2.7 + i * 1.1, -2.9 + i * 0.5]], 0.6, K); line(g, [[-3.6, -0.5], [0, -2.6], [3.6, -0.6]], 1, K); break;
    case 9: line(g, [[-3.5, 0], [3.5, 0]], 1, K); ell(g, 0, 0, 0.9, 0.6, col || K); break;
    case 10: ell(g, 0, 0.6, 3.2, 1.8, '#fff', K, 0.7); ell(g, 0, 0.8, 1.4, 1.4, col); ell(g, 0, 0.8, 0.7, 0.7, K); line(g, [[-3.4, -0.3], [3.4, -0.3]], 1.3, K); break;
    case 11: ell(g, 0, 0, 3.4, 4, '#fff', K, 0.8); ell(g, 0, 0.5, 2.6, 3.3, col); ell(g, 0, 1.2, 1.6, 1.8, K); ell(g, -1, -1, 1, 1.3, '#fff'); ell(g, 1.2, 1.8, 0.5, 0.5, '#fff'); line(g, [[-3.8, -2.6], [3.8, -3.2]], 1.4, K); break;
    case 12: g.fillStyle = col || K; g.fillRect(-2, -2, 4, 4); g.fillStyle = '#fff'; g.fillRect(-1.4, -1.4, 1.2, 1.2); break;
    case 13: ell(g, 0, 0, 2.3, 3.3, '#fff', K, 0.7); ell(g, 0, 0.3, 1.4, 2, col); ell(g, 0, 0.3, 0.7, 1, K); ell(g, -0.5, -0.7, 0.4, 0.5, '#fff'); break;
    case 14: star(g, 0, 0, 3.2, col); star(g, 0, 0, 1.4, '#fff'); break;
    case 15: heart(g, 0, 0, 3.2, '#e83a6a'); ell(g, -0.9, -0.8, 0.5, 0.5, '#fff'); break;
    case 16: { g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = a * 0.27; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.strokeStyle = col || K; g.lineWidth = 0.6; g.stroke(); ell(g, 0, 0, 3.4, 3.4, null, col || K, 0.6); break; }
    case 17: ell(g, 0, 0, 3.8, 4.4, '#fff', K, 0.8); ell(g, 0, 0.6, 2.9, 3.6, col); ell(g, 0, 1, 1.6, 2, K); ell(g, -1.1, -1, 1.1, 1.4, '#fff'); ell(g, 1.3, 2.1, 0.6, 0.6, '#fff'); for (let i = 0; i < 4; i++) line(g, [[1.8 + i * 0.7, -3.4 + i * 0.6], [3.2 + i * 0.9, -4.6 + i * 0.7]], 0.6, K); line(g, [[-4, -2.4], [0, -4.6], [4, -2.8]], 1.3, K); break;
    case 18: withT(g, 0, 0, 1, 1, -0.15, () => { poly(g, [[-4, 0.6], [-1, -1.8], [4, -0.8], [1, 1.6]], '#fff'); ell(g, 0, 0, 1.4, 1.6, col); ell(g, 0, 0, 0.7, 0.8, K); line(g, [[-4, 0.6], [-1, -1.8], [4.4, -1]], 1.2, K); }); break;
    case 19: ell(g, 0, 0, 3.4, 2.6, col, K, 0.7); ell(g, 0, 0, 0.5, 2.3, K); ell(g, -1, -0.8, 0.5, 0.5, '#fff'); break;
  }
}
function star(g, x, y, r, c) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = c; g.fill(); }
function heart(g, x, y, s, c) { g.beginPath(); g.moveTo(x, y + s); g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s); g.fillStyle = c; g.fill(); }
export function drawBrow(g, t, c) {
  switch (t) {
    case 0: line(g, [[-3.6, 0], [3.6, 0]], 1.1, c); break;
    case 1: line(g, [[-3.8, 0.8], [0, -0.8], [3.8, 0.6]], 1.1, c); break;
    case 2: line(g, [[-3.8, 0.3], [0, -0.3], [3.8, 0.2]], 2, c); break;
    case 3: line(g, [[-3.6, 0.5], [0, -0.4], [3.6, 0.4]], 0.5, c); break;
    case 4: line(g, [[-3.6, -1.2], [3.6, 1]], 1.3, c); break;
    case 5: line(g, [[-3.6, 0.9], [3.6, -1.1]], 1.1, c); break;
    case 6: line(g, [[-1.6, 0], [1.6, 0]], 1.3, c); break;
    case 7: ell(g, 0, 0, 1.6, 1.1, c); break;
    case 8: for (let i = -3; i <= 3; i++) line(g, [[i, 0.8], [i + 0.8, -1]], 0.8, c); break;
    case 9: line(g, [[-4.5, 0.6], [0, -0.6], [4.5, 0.2]], 1, c); break;
    case 10: line(g, [[-3.8, 0], [-1.9, -0.8], [0, 0], [1.9, -0.8], [3.8, 0]], 1, c); break;
  }
}
export function drawNose(g, t, skin) {
  const sh = 'rgba(120,60,40,0.55)';
  switch (t) {
    case 0: ell(g, 0, 0, 0.7, 0.6, sh); break;
    case 1: ell(g, 0, 0, 1.6, 1.3, 'rgba(220,120,100,0.45)'); ell(g, -0.4, -0.4, 0.4, 0.3, 'rgba(255,255,255,0.5)'); break;
    case 2: poly(g, [[0, -3], [1.6, 1], [-0.4, 1]], 'rgba(120,60,40,0.3)'); break;
    case 3: ell(g, 0, 0, 2.2, 1.6, 'rgba(240,150,150,0.8)'); ell(g, -0.7, 0, 0.4, 0.6, K); ell(g, 0.7, 0, 0.4, 0.6, K); break;
    case 4: line(g, [[0, -3.5], [0.6, 1], [-0.8, 1.2]], 0.6, sh); break;
    case 5: line(g, [[-2, 0], [-1, 1], [1, 1], [2, 0]], 0.6, sh); break;
    case 6: line(g, [[0, -2.5], [0, 1], [1.2, 1]], 0.6, sh); break;
    case 7: line(g, [[-1, 0.8], [0, -0.6], [1, 0.8]], 0.6, sh); ell(g, -0.6, 0.9, 0.3, 0.3, sh); ell(g, 0.6, 0.9, 0.3, 0.3, sh); break;
    case 8: ell(g, 0, 0, 2.6, 2.2, 'rgba(200,90,70,0.35)'); ell(g, -0.8, -0.8, 0.6, 0.5, 'rgba(255,255,255,0.45)'); break;
    case 9: line(g, [[0, -1.5], [0, 1]], 0.5, sh); break;
    case 10: ell(g, 0, 0, 0.45, 0.4, sh); break;
  }
}
export function drawMouth(g, t, c, expr, lc) {
  const L = lc || K;
  if (expr === 'talkA' || expr === 'laugh') { ell(g, 0, 0.9, 3.1, 2.6, '#7a2a2a', K, 0.5); ell(g, 0, 2.2, 1.8, 0.9, '#e86a6a'); g.fillStyle = '#fff'; g.fillRect(-2, -1.4, 4, 0.8); return; }
  if (expr === 'talkI') { ell(g, 0, 0.3, 3.4, 1.0, '#7a2a2a', K, 0.5); g.fillStyle = '#fff'; g.fillRect(-2.6, -0.4, 5.2, 0.5); return; }
  if (expr === 'talkO') { ell(g, 0, 0.5, 1.5, 1.8, '#7a2a2a', K, 0.5); return; }
  if (expr === 'shy') { line(g, [[-2, 0.4], [-1, -0.2], [0, 0.4], [1, -0.2], [2, 0.4]], 0.7, K); return; }
  if (expr === 'sulk') { line(g, [[-1.3, -0.8], [0, 0], [-1.3, 0.8]], 0.8, K); return; }
  if (expr === 'trouble') { line(g, [[-2.6, 0.6], [-1.3, -0.3], [0, 0.6], [1.3, -0.3], [2.6, 0.6]], 0.8, K); return; }
  if (expr === 'talk') { g.beginPath(); g.moveTo(-3, -0.6); g.quadraticCurveTo(0, -1, 3, -0.6); g.quadraticCurveTo(0, 4, -3, -0.6); g.fillStyle = '#7a2a2a'; g.fill(); ell(g, 0, 1.6, 1.4, 0.7, '#e86a6a'); return; }
  switch (t) {
    case 0: line(g, [[-3, -0.5], [0, 1.2], [3, -0.5]], 0.9, L); break;
    case 1: g.beginPath(); g.moveTo(-3.4, -0.6); g.quadraticCurveTo(0, -0.2, 3.4, -0.6); g.quadraticCurveTo(0, 4.4, -3.4, -0.6); g.fillStyle = (lc || '#7a2a2a'); g.fill(); ell(g, 0, 2, 1.6, 0.8, '#e86a6a'); break;
    case 2: ell(g, 0, 0, 1.3, 1.6, (lc || '#7a2a2a'), K, 0.5); break;
    case 3: line(g, [[-2.6, 0], [2.6, 0]], 0.9, L); break;
    case 4: line(g, [[-3, 0.8], [0, -0.6], [3, 0.8]], 0.9, L); break;
    case 5: line(g, [[-3, -0.5], [-1.5, 0.8], [0, -0.2], [1.5, 0.8], [3, -0.5]], 0.8, L); break;
    case 6: g.beginPath(); g.moveTo(-3.6, -0.6); g.quadraticCurveTo(0, 4, 3.6, -0.6); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = K; g.lineWidth = 0.7; g.stroke(); line(g, [[-3.2, 0.4], [3.2, 0.4]], 0.4, '#bbb'); break;
    case 7: line(g, [[-3, -0.3], [0, 0.6], [3, -0.3]], 0.9, L); g.beginPath(); g.ellipse(0.8, 1.2, 1.2, 1.5, 0, 0, Math.PI); g.fillStyle = '#e8606a'; g.fill(); break;
    case 8: ell(g, 0, 0, 1.2, 1, c); ell(g, 0, 0, 0.5, 0.4, (lc || '#7a2a2a')); break;
    case 9: g.beginPath(); g.moveTo(-3, -1.2); g.lineTo(3, -1.2); g.quadraticCurveTo(3, 3.8, 0, 3.8); g.quadraticCurveTo(-3, 3.8, -3, -1.2); g.fillStyle = (lc || '#7a2a2a'); g.fill(); g.fillStyle = '#fff'; g.fillRect(-2.6, -1.2, 5.2, 1); ell(g, 0, 2.6, 1.6, 0.9, '#e86a6a'); break;
    case 10: g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(-1.5, -1.4, 0, -0.6); g.quadraticCurveTo(1.5, -1.4, 3, 0); g.quadraticCurveTo(0, 2.4, -3, 0); g.fillStyle = c; g.fill(); line(g, [[-3, 0], [3, 0]], 0.3, 'rgba(0,0,0,0.4)'); break;
    case 11: line(g, [[-3, 0], [-1.5, -0.6], [0, 0], [1.5, -0.6], [3, 0]], 0.8, L); break;
    case 12: line(g, [[-2.6, 0.2], [1.6, 0.2], [3, -1]], 0.9, L); break;
    case 13: line(g, [[-3, -0.5], [0, 0.8], [3, -0.5]], 0.9, L); g.fillStyle = '#fff'; g.fillRect(-1.2, 0.3, 1.1, 1.6); g.fillRect(0.1, 0.3, 1.1, 1.6); g.strokeStyle = K; g.lineWidth = 0.3; g.strokeRect(-1.2, 0.3, 2.4, 1.6); break;
    case 14: poly(g, [[-2.6, -0.8], [2.6, -0.8], [0, 2.6]], (lc || '#7a2a2a')); break;
    case 15: poly(g, [[-2.4, -0.6], [2.4, -0.6], [0, 1.6]], '#f2b030'); line(g, [[-2.4, -0.6], [2.4, -0.6]], 0.4, '#c88a20'); break;
  }
}
export function drawGlass(g, t, c, sx) {
  const L = -sx, R = sx;
  const pair = (f) => { f(L); f(R); };
  switch (t) {
    case 1: pair((x) => ell(g, x, 0, 4.6, 4.4, 'rgba(220,240,255,0.15)', c, 0.8)); line(g, [[L + 4.6, 0], [R - 4.6, 0]], 0.8, c); break;
    case 2: pair((x) => { g.strokeStyle = c; g.lineWidth = 0.9; g.strokeRect(x - 5, -3.5, 10, 7); }); line(g, [[L + 5, -1], [R - 5, -1]], 0.8, c); break;
    case 3: pair((x) => line(g, [[x - 5, -3], [x + 5, -3]], 1.2, c)); pair((x) => { g.beginPath(); g.moveTo(x - 5, -3); g.quadraticCurveTo(x, 5, x + 5, -3); g.strokeStyle = c; g.lineWidth = 0.4; g.stroke(); }); line(g, [[L + 5, -3], [R - 5, -3]], 0.8, c); break;
    case 4: pair((x) => { g.beginPath(); g.moveTo(x - 5.4, -3); g.lineTo(x + 5.4, -3); g.quadraticCurveTo(x + 5, 4.5, x, 4); g.quadraticCurveTo(x - 5, 4.5, x - 5.4, -3); g.fillStyle = 'rgba(20,20,30,0.92)'; g.fill(); }); line(g, [[L + 5, -2.6], [R - 5, -2.6]], 1, '#222'); break;
    case 5: pair((x) => { star(g, x, 0, 6, c); star(g, x, 0, 4.4, 'rgba(255,250,200,0.3)'); }); break;
    case 6: pair((x) => { heart(g, x, 0.5, 4.6, c); heart(g, x, 0.5, 3.4, 'rgba(255,220,230,0.4)'); }); break;
    case 7: ell(g, R, 0, 4.4, 4.4, 'rgba(220,240,255,0.15)', '#c8a040', 0.9); line(g, [[R + 3, 3], [R + 6, 12]], 0.4, '#c8a040'); break;
    case 8: pair((x) => ell(g, x, 0, 5, 4.6, 'rgba(120,200,255,0.4)', '#444', 1.6)); line(g, [[-30, 0], [L - 5, 0]], 2, '#444'); line(g, [[R + 5, 0], [30, 0]], 2, '#444'); line(g, [[L + 5, 0], [R - 5, 0]], 1.4, '#444'); break;
    case 9: pair((x) => { const s = x < 0 ? -1 : 1; g.beginPath(); g.moveTo(x - 5 * s, -1); g.lineTo(x + 5.5 * s, -4); g.quadraticCurveTo(x + 4 * s, 4, x, 3.6); g.quadraticCurveTo(x - 5 * s, 3.5, x - 5 * s, -1); g.strokeStyle = c; g.lineWidth = 0.9; g.stroke(); }); line(g, [[L + 4.5, -1], [R - 4.5, -1]], 0.8, c); break;
  }
}
export function drawBeard(g, t, c) {
  switch (t) {
    case 1: g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3, -1.4, -6, 0.8); g.quadraticCurveTo(-3, 0.2, 0, 1); g.quadraticCurveTo(3, 0.2, 6, 0.8); g.quadraticCurveTo(3, -1.4, 0, 0); g.fillStyle = c; g.fill(); break;
    case 2: line(g, [[0, 0], [-4, -0.5], [-6, -2], [-5.5, -3.2]], 1, c); line(g, [[0, 0], [4, -0.5], [6, -2], [5.5, -3.2]], 1, c); break;
    case 3: poly(g, [[-2.5, 6], [2.5, 6], [0, 11]], c); break;
    case 4: g.beginPath(); g.moveTo(-12, -4); g.quadraticCurveTo(-11, 14, 0, 15); g.quadraticCurveTo(11, 14, 12, -4); g.quadraticCurveTo(6, 4, 0, 4); g.quadraticCurveTo(-6, 4, -12, -4); g.fillStyle = c; g.fill(); break;
    case 5: for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI, r = 6 + Math.random() * 7; g.fillStyle = c; g.globalAlpha = 0.5; g.fillRect(Math.cos(a) * r * 1.1, 2 + Math.sin(a) * r * 0.9, 0.3, 0.3); } g.globalAlpha = 1; break;
    case 6: g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(-4, 22, 0, 24); g.quadraticCurveTo(4, 22, 6, 4); g.closePath(); g.fillStyle = c; g.fill(); break;
    case 7: g.fillStyle = c; g.fillRect(-15, -14, 2.4, 12); g.fillRect(12.6, -14, 2.4, 12); break;
  }
}
// expr: 'open' | 'blink' | 'talk' | 'happy'
export function renderFace(f, size = 1024, expr = 'open', drawingImg = null) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
  drawFaceParts(g, f, size, expr);
  if (drawingImg) g.drawImage(drawingImg, 0, 0, size, size);
  return cv;
}
export function drawFaceParts(g, f, size, expr = 'open') {
  g.save(); g.setTransform(size / 100, 0, 0, size / 100, 0, 0); g.translate(50, 52); g.scale(1.3, 1.3); g.translate(-50, -52);
  const e = f.eye, b = f.brow, n = f.nose, m = f.mouth, gl = f.glass;
  const browC = b.c || f.hairColor;
  if (f.blush || expr === 'shy' || expr === 'laugh') { const a = expr === 'shy' ? 0.65 : expr === 'laugh' ? 0.45 : 0.32; ell(g, 34, 60, expr === 'shy' ? 6 : 5, expr === 'shy' ? 3.2 : 2.6, `rgba(255,110,120,${a})`); ell(g, 66, 60, expr === 'shy' ? 6 : 5, expr === 'shy' ? 3.2 : 2.6, `rgba(255,110,120,${a})`); if (expr === 'shy') for (const x of [31, 35, 63, 67]) line(g, [[x, 58.5], [x - 1.2, 61.5]], 0.45, 'rgba(220,60,80,0.7)'); }
  if (expr === 'sulk') { ell(g, 33, 61, 6.5, 4.5, 'rgba(255,140,150,0.45)'); ell(g, 67, 61, 6.5, 4.5, 'rgba(255,140,150,0.45)'); }
  if (expr === 'trouble') { g.beginPath(); g.moveTo(74, 36); g.quadraticCurveTo(77, 41, 74.5, 43); g.quadraticCurveTo(72, 41, 74, 36); g.fillStyle = '#8ad0ff'; g.fill(); }
  if (f.freckles) for (const s of [-1, 1]) for (let i = 0; i < 5; i++) ell(g, 50 + s * (12 + (i % 3) * 2.2), 57 + Math.floor(i / 2) * 1.6, 0.45, 0.45, 'rgba(150,80,50,0.6)');
  if (f.mole) ell(g, f.mole.x, f.mole.y, 0.7, 0.7, '#3a2a20');
  const ex = 11 + e.sp * 1.5, ey = FY - 2 + e.y * 1.2;
  for (const s of [-1, 1]) withT(g, FX + s * ex, ey, s * e.size, e.size, s * e.rot * 0.12, () => { if (expr === 'surprise') { ell(g, 0, 0, 3.4, 3.8, '#fff', K, 0.8); ell(g, 0, 0, 1.2, 1.3, K); } else drawEye(g, e.t, e.c, expr === 'laugh' ? 'happy' : expr === 'shy' ? (e.t === 6 ? 'open' : 'happy') : ['blink', 'happy'].includes(expr) ? expr : 'open'); });
  if (expr === 'sad') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(FX + s * ex, ey + 3); g.quadraticCurveTo(FX + s * ex + 1.6, ey + 6.5, FX + s * ex, ey + 7.5); g.quadraticCurveTo(FX + s * ex - 1.6, ey + 6.5, FX + s * ex, ey + 3); g.fillStyle = '#6ab8f0'; g.fill(); }
  const bx = 11 + b.sp * 1.5, by = FY - 9 + b.y * 1.2;
  const bt = expr === 'angry' || expr === 'sulk' ? 4 : expr === 'sad' || expr === 'trouble' || expr === 'shy' ? 5 : expr === 'surprise' ? 1 : b.t;
  if (bt !== 11) for (const s of [-1, 1]) withT(g, FX + s * bx, by - (expr === 'surprise' ? 2 : 0), s * b.size, b.size, s * b.rot * 0.12, () => drawBrow(g, bt, browC));
  if (expr === 'angry') { g.strokeStyle = '#e8303a'; g.lineWidth = 1.2; for (const [a, c] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.beginPath(); g.arc(70 + a * 2.2, 30 + c * 2.2, 1.8, 0, Math.PI * 2); g.stroke(); } }
  if (n.t !== 11) withT(g, FX, FY + 6 + n.y * 1.2, n.size, n.size, 0, () => drawNose(g, n.t));
  if (f.beard) withT(g, FX, FY + 14 + m.y * 1.2, 1, 1, 0, () => drawBeard(g, f.beard, f.hairColor));
  withT(g, FX, FY + 14 + m.y * 1.2, m.size, m.size, 0, () => drawMouth(g, expr === 'angry' || expr === 'sad' ? 4 : expr === 'surprise' ? 2 : m.t, m.c, ['blink', 'happy', 'open', 'angry', 'sad', 'surprise'].includes(expr) && expr !== 'talk' ? expr : expr, m.lc));
  if (gl.t) withT(g, FX, ey + gl.y * 1.2, gl.size, gl.size, 0, () => drawGlass(g, gl.t, gl.c, ex));
  g.restore();
}

// ---------- 3D
const DEFORM = [
  (x, y, z) => [x, y, z],
  (x, y, z) => (y < 0 ? [x * (1 - 0.22 * Math.pow(-y, 1.5)), y * 1.05, z * (1 - 0.1 * -y)] : [x * 0.97, y * 1.05, z]),
  (x, y, z) => [x * 0.88, y * 1.16, z * 0.95],
  (x, y, z) => { const p = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.7); return [p(x) * 0.92, p(y) * 0.95, z * 0.98]; },
  (x, y, z) => (y < 0 ? [x * (1 - 0.38 * Math.pow(-y, 1.2)), y * 1.06, z] : [x * 1.04, y, z]),
  (x, y, z) => [x * 0.84, y * 1.06, z * 0.94],
  (x, y, z) => [x * (1.1 + (y < 0.3 ? 0.08 * (1 - Math.abs(y + 0.2)) : 0)), y * 0.96, z * 1.04],
  (x, y, z) => [x * (1 - 0.18 * y), y * 1.02, z],
];
function deformGeo(geo, shape) {
  const p = geo.attributes.position; const fn = DEFORM[shape] || DEFORM[0];
  for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i) / 0.5, p.getY(i) / 0.5, p.getZ(i) / 0.5); p.setXYZ(i, v[0] * 0.5, v[1] * 0.5, v[2] * 0.5); }
  geo.computeVertexNormals(); return geo;
}
// 髪の殻: [前, 横, 後ろ]の生えぎわ角度(度)
const HAIR_SHELL = [
  [42, 82, 110], [62, 92, 112], [55, 125, 128], [48, 120, 150], [42, 85, 112], [45, 90, 112], [40, 85, 108], null, [38, 80, 105], null, [30, 72, 102], null,
  [52, 90, 115], [48, 95, 118], [45, 92, 118], [45, 90, 115], [62, 125, 150], [36, 82, 108], [42, 85, 112], [50, 120, 150], [44, 88, 114], [32, 76, 104], [66, 112, 116], [36, 70, 95],
  [46, 105, 138], [40, 86, 112], [50, 110, 140], [34, 66, 100], [46, 92, 116], [48, 112, 130],
];
function hairShell(front, side, back, r = 0.535, asym = 0) {
  const seg = 40, rows = 14, pos = [], idx = [];
  const thetaMax = (phi) => { // phi: 0=前(+z)
    const c = Math.cos(phi); const s = Math.sin(phi);
    let t = c >= 0 ? side + (front - side) * c * c : side + (back - side) * c * c;
    if (asym && c > 0) t += asym * s * c * 30;
    return (t * Math.PI) / 180;
  };
  for (let i = 0; i <= seg; i++) {
    const phi = (i / seg) * Math.PI * 2, tm = thetaMax(phi);
    for (let j = 0; j <= rows; j++) {
      const th = (j / rows) * tm, rr = r * (1 + (j === rows ? 0.02 : 0));
      pos.push(rr * Math.sin(th) * Math.sin(phi), rr * Math.cos(th), rr * Math.sin(th) * Math.cos(phi));
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = (i + 1) * (rows + 1) + j; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function hairExtras(t, mat) {
  const G = new THREE.Group();
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); G.add(m); return m; };
  const cap = (r, l, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); G.add(m); return m; };
  const cone = (r, h, x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); G.add(m); };
  switch (t) {
    case 3: sph(0.5, 0, -0.22, -0.18, 1.06, 1.15, 0.6); break;
    case 4: sph(0.14, 0, 0.12, -0.52); cap(0.11, 0.35, 0, -0.18, -0.6, 0.35); break;
    case 5: cap(0.1, 0.32, -0.55, -0.05, -0.1, 0, -0.35); cap(0.1, 0.32, 0.55, -0.05, -0.1, 0, 0.35); sph(0.08, -0.48, 0.2, -0.1); sph(0.08, 0.48, 0.2, -0.1); break;
    case 6: sph(0.2, 0, 0.58, -0.12); break;
    case 7: sph(0.72, 0, 0.18, -0.08, 1, 0.9, 0.95); break;
    case 8: for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; cone(0.1, 0.32, Math.sin(a) * 0.26, 0.5, Math.cos(a) * 0.26 - 0.05, Math.cos(a) * 0.7, -Math.sin(a) * 0.7); } cone(0.1, 0.35, 0, 0.6, 0, 0, 0); break;
    case 9: for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.4; cone(0.09, 0.3, 0, 0.5 * Math.cos(a) + 0.1, 0.5 * Math.sin(a), a, 0); } break;
    case 12: sph(0.3, 0.12, 0.3, 0.32, 1.3, 0.55, 0.6).rotation.z = -0.4; break;
    case 13: sph(0.22, -0.16, 0.32, 0.33, 1, 0.6, 0.6); sph(0.22, 0.16, 0.32, 0.33, 1, 0.6, 0.6); break;
    case 14: for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.6; sph(0.12, Math.sin(b) * Math.sin(a) * 0.52, Math.cos(b) * 0.52, Math.sin(b) * Math.cos(a) * 0.52 - 0.02); } break;
    case 15: for (const s of [-1, 1]) for (let i = 0; i < 5; i++) sph(0.075, s * 0.4, -0.1 - i * 0.12, 0.05 - i * 0.02); break;
    case 16: for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.22), mat); m.position.set(s * 0.47, -0.12, 0.12); G.add(m); } sph(0.5, 0, -0.25, -0.2, 1.05, 1.15, 0.6); break;
    case 17: sph(0.26, 0, 0.42, 0.28, 1.1, 0.75, 1.1); break;
    case 18: { const m = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), mat); m.position.set(0, 0.6, 0.05); m.rotation.y = Math.PI / 2; G.add(m); break; }
    case 19: sph(0.55, 0, -0.3, -0.16, 1.1, 1.25, 0.7); for (let i = 0; i < 8; i++) sph(0.1, (i % 2 ? -1 : 1) * 0.45, -0.3 - (i >> 1) * 0.1, -0.05); break;
    case 20: sph(0.13, 0.42, 0.25, -0.2); cap(0.1, 0.3, 0.55, -0.1, -0.15, 0, 0.3); break;
    case 22: break;
    case 23: cap(0.06, 0.2, 0, 0.6, -0.15, 1.3); break;
    case 24: for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; cone(0.08, 0.28, Math.sin(a) * 0.42, -0.22, Math.cos(a) * 0.3 - 0.25, 0.6, Math.sin(a) * 0.4); } break;
    case 25: { const m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), mat); m.position.set(0.12, 0.38, 0.44); m.rotation.y = 0.3; G.add(m); break; }
    case 26: sph(0.12, 0, 0.3, -0.5); sph(0.45, 0, -0.25, -0.2, 1.05, 1.1, 0.6); break;
    case 27: sph(0.36, 0, 0.36, 0.05, 1.25, 0.6, 1.25); break;
    case 28: cap(0.1, 0.55, -0.55, -0.25, -0.1, 0, -0.25); cap(0.1, 0.55, 0.55, -0.25, -0.1, 0, 0.25); sph(0.08, -0.48, 0.2, -0.1); sph(0.08, 0.48, 0.2, -0.1); break;
    case 29: for (const s2 of [-1, 1]) for (let i = 0; i < 6; i++) sph(0.07, s2 * 0.38, -0.12 - i * 0.1, 0.12 - i * 0.01); break;
  }
  return G;
}
function hatMesh(t) {
  const G = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); G.add(m); return m; };
  switch (t) {
    case 1: add(new THREE.SphereGeometry(0.56, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), '#d8302a', 0, 0.04, 0); add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), '#d8302a', 0, 0.12, 0.42, 0.15); break;
    case 2: add(new THREE.SphereGeometry(0.14, 10, 8), '#f070a0', 0.22, 0.52, 0, 0, 0, 0.6, 1.4, 0.7, 0.6); add(new THREE.SphereGeometry(0.14, 10, 8), '#f070a0', 0.44, 0.48, 0, 0, 0, -0.6, 1.4, 0.7, 0.6); add(new THREE.SphereGeometry(0.06, 8, 6), '#e04080', 0.33, 0.5, 0); break;
    case 3: { const m = add(new THREE.CylinderGeometry(0.3, 0.26, 0.2, 12, 1, true), '#f0c030', 0, 0.58, 0); m.material.side = THREE.DoubleSide; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(new THREE.ConeGeometry(0.06, 0.14, 4), '#f0c030', Math.sin(a) * 0.29, 0.74, Math.cos(a) * 0.29); add(new THREE.SphereGeometry(0.035, 6, 4), i % 2 ? '#e03a4a' : '#3a8ae0', Math.sin(a) * 0.3, 0.6, Math.cos(a) * 0.3); } break; }
    case 4: for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.47; add(new THREE.SphereGeometry(0.08, 8, 6), ['#f070a0', '#f8e060', '#fff', '#a080f0'][i % 4], Math.sin(a) * 0.48, 0.32 + Math.cos(a) * 0.1, Math.cos(a) * 0.1 - 0.02); } break;
    case 5: case 11: { const c = t === 5 ? '#3a3a3a' : '#fff'; for (const s of [-1, 1]) add(t === 5 ? new THREE.ConeGeometry(0.13, 0.25, 4) : new THREE.CapsuleGeometry(0.07, 0.35, 4, 8), c, s * 0.28, t === 5 ? 0.58 : 0.72, 0, 0, 0, -s * 0.25); break; }
    case 6: add(new THREE.CylinderGeometry(0.7, 0.7, 0.03, 24), '#4a2a7a', 0, 0.36, 0); add(new THREE.ConeGeometry(0.4, 0.8, 16), '#4a2a7a', 0, 0.76, -0.05, -0.2); break;
    case 7: add(new THREE.SphereGeometry(0.55, 16, 8), '#c83a3a', 0.05, 0.36, -0.02, 0, 0, -0.2, 1, 0.35, 1); break;
    case 8: add(new THREE.TorusGeometry(0.52, 0.04, 6, 20, Math.PI), '#333', 0, 0.05, 0, 0, Math.PI / 2, 0); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), '#e83a6a', s * 0.52, 0, 0, 0, 0, Math.PI / 2); break;
    case 9: add(new THREE.SphereGeometry(0.56, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#3a8ad8', 0, 0.06, 0); add(new THREE.SphereGeometry(0.1, 8, 6), '#fff', 0, 0.64, 0); break;
    case 10: add(new THREE.CylinderGeometry(0.75, 0.75, 0.03, 24), '#e8c870', 0, 0.3, 0); add(new THREE.CylinderGeometry(0.34, 0.38, 0.25, 20), '#e8c870', 0, 0.44, 0); add(new THREE.CylinderGeometry(0.385, 0.385, 0.06, 20), '#d83a3a', 0, 0.36, 0); break;
    case 12: add(new THREE.TorusGeometry(0.28, 0.035, 8, 24), '#ffe880', 0, 0.82, 0, Math.PI / 2); break;
    case 13: for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.07, 0.25, 8), '#f2ead8', s * 0.24, 0.6, 0.05, 0, 0, -s * 0.3); break;
    case 14: add(new THREE.TorusGeometry(0.52, 0.05, 6, 24), '#f2f2ee', 0, 0.22, 0, Math.PI / 2 - 0.15); add(new THREE.SphereGeometry(0.06, 8, 6), '#e8443a', 0, 0.3, 0.52); break;
    case 15: add(new THREE.BoxGeometry(0.16, 0.04, 0.03), '#f08cb2', 0.25, 0.36, 0.42, 0, 0, 0.5); add(new THREE.SphereGeometry(0.05, 8, 6), '#ffd23a', 0.32, 0.4, 0.42); break;
    case 16: add(new THREE.TorusGeometry(0.5, 0.03, 6, 20, Math.PI), '#e8443a', 0, 0.12, 0.05, 0, Math.PI / 2, 0); break;
    case 17: add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20, 1, true), '#f5f5f0', 0, 0.28, 0); add(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), '#3a8ae0', 0, 0.28, 0.42, 0.15); break;
    case 18: add(new THREE.ConeGeometry(0.2, 0.42, 12), '#9a5ae0', 0.05, 0.72, 0, 0, 0, -0.15); add(new THREE.SphereGeometry(0.06, 8, 6), '#ffd23a', 0.1, 0.95, 0); break;
    case 19: for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.12, 10, 8), '#8a5a3a', s * 0.32, 0.46, 0); add(new THREE.SphereGeometry(0.06, 8, 6), '#e8b8a0', s * 0.32, 0.46, 0.07); } break;
  }
  return G;
}

const patCache = new Map();
function patternTex(p, a, b) {
  const k = p + a + b; if (patCache.has(k)) return patCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b;
  if (p === 1) for (let y = 0; y < 64; y += 12) g.fillRect(0, y, 64, 5);
  if (p === 2) for (let y = 4; y < 64; y += 14) for (let x = 4 + (y % 28 ? 7 : 0); x < 64; x += 14) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
  if (p === 3) { g.globalAlpha = 0.5; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 7, 64); for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 7); g.globalAlpha = 1; }
  if (p === 4) for (let i = 0; i < 9; i++) { const x = (i * 23) % 64, y = (i * 37) % 64; g.beginPath(); for (let j = 0; j < 10; j++) { const an = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 2.2 : 5; g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); patCache.set(k, t); return t;
}
let _grad = null;
function toon(color, extra = {}) {
  if (!_grad) { const c = document.createElement('canvas'); c.width = 4; c.height = 1; const g = c.getContext('2d'); ['#7a7a7a', '#b8b8b8', '#ececec', '#ffffff'].forEach((v, i) => { g.fillStyle = v; g.fillRect(i, 0, 1, 1); }); _grad = new THREE.CanvasTexture(c); _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.generateMipmaps = false; }
  return new THREE.MeshToonMaterial({ color, gradientMap: _grad, ...extra });
}
export class Character {
  constructor(f) {
    this.f = f; this.root = new THREE.Group(); this.textures = {}; this.expr = 'open';
    this.drawingImg = null; this.build();
  }
  setDrawing(img) { this.drawingImg = img; this.refreshFace(); }
  refreshFace() {
    for (const k in this.textures) this.textures[k].dispose();
    const mk = (expr, s) => { const t = new THREE.CanvasTexture(renderFace(this.f, s, expr, this.drawingImg)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    this.textures = { open: mk('open', 1024), blink: mk('blink', 512), talk: mk('talk', 512), happy: mk('happy', 512) };
    if (this.faceMat) { this.faceMat.map = this.textures[this.expr]; this.faceMat.needsUpdate = true; }
  }
  setExpr(e) {
    if (this.expr === e) return;
    if (!this.textures[e]) { if (!['angry', 'sad', 'surprise', 'talkA', 'talkI', 'talkO', 'shy', 'sulk', 'trouble', 'laugh'].includes(e)) return; const t = new THREE.CanvasTexture(renderFace(this.f, 512, e, this.drawingImg)); t.colorSpace = THREE.SRGBColorSpace; this.textures[e] = t; }
    this.expr = e; this.faceMat.map = this.textures[e];
  }
  build() {
    const f = this.f, R = this.root;
    while (R.children.length) R.remove(R.children[0]);
    const skin = toon(SKINS[f.skin]);
    const shirt = toon(f.shirt), pants = toon(f.pants); this.shirtM = shirt; this.shirt0 = { map: shirt.map, color: shirt.color.clone() };
    const hairM = toon(f.hairColor, { side: THREE.DoubleSide });
    const body = new THREE.Group(); R.add(body); this.body = body;
    const hs = f.height, ws = f.width;
    // 足
    this.legs = [];
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.085 * ws, 0.26 * hs, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.16 * hs, 4, 10), pants); m.position.y = -0.13 * hs; m.castShadow = true; piv.add(m); const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon('#4a3a30')); shoe.scale.set(1, 0.6, 1.4); shoe.position.set(0, -0.24 * hs, 0.03); piv.add(shoe); body.add(piv); this.legs.push(piv); }
    // 胴
    const cs = f.cstyle || 0, c2 = f.c2 || '#ffffff';
    if (f.pattern) { shirt.map = patternTex(f.pattern, f.shirt, c2); shirt.color.set('#ffffff'); }
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15 * ws, 0.2 * hs, 6, 14), shirt); torso.position.y = 0.42 * hs; torso.scale.z = 0.8; torso.castShadow = true; body.add(torso); this.torso = torso; this.shirt0 = { map: shirt.map, color: shirt.color.clone() };
    if (f.art) { const at = new THREE.TextureLoader().load(f.art); at.colorSpace = THREE.SRGBColorSpace; const am = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * ws, 0.2 * ws), new THREE.MeshBasicMaterial({ map: at, transparent: true })); am.position.set(0, 0.44 * hs, 0.125 * ws); body.add(am); this.artM = am; }
    const accM = toon(c2);
    const acc = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); body.add(o); return o; };
    if (cs === 2) { acc(new THREE.SphereGeometry(0.17 * ws, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shirt, 0, 0.58 * hs, -0.1, -1.9, 0, 0, 1, 0.7, 1); acc(new THREE.BoxGeometry(0.16 * ws, 0.06, 0.02), accM, 0, 0.36 * hs, 0.125 * ws); }
    if (cs === 3 || cs === 9) acc(new THREE.CylinderGeometry(0.15 * ws, (cs === 9 ? 0.34 : 0.26) * ws, 0.24 * hs, 16), shirt, 0, 0.26 * hs, 0);
    if (cs === 4) { const pm = pants; acc(new THREE.BoxGeometry(0.2 * ws, 0.14 * hs, 0.03), pm, 0, 0.42 * hs, 0.12 * ws); for (const sx of [-1, 1]) acc(new THREE.BoxGeometry(0.035, 0.2 * hs, 0.03), pm, sx * 0.07 * ws, 0.52 * hs, 0.11 * ws); }
    if (cs === 5) { for (const sx of [-1, 1]) acc(new THREE.BoxGeometry(0.1 * ws, 0.32 * hs, 0.02), accM, sx * 0.07 * ws, 0.42 * hs, 0.118 * ws, 0, sx * 0.2, 0); }
    if (cs === 6) { acc(new THREE.BoxGeometry(0.3 * ws, 0.02, 0.18), accM, 0, 0.58 * hs, -0.04, 0.3); acc(new THREE.SphereGeometry(0.04, 8, 6), toon('#e8443a'), 0, 0.53 * hs, 0.125 * ws, 0, 0, 0, 1.6, 0.8, 0.6); }
    if (cs === 7) acc(new THREE.CylinderGeometry(0.155 * ws, 0.155 * ws, 0.07 * hs, 16), accM, 0, 0.36 * hs, 0, 0, 0, 0, 1, 1, 0.82);
    if (cs === 8) { acc(new THREE.BoxGeometry(0.04, 0.16 * hs, 0.02), accM, 0, 0.45 * hs, 0.122 * ws); acc(new THREE.BoxGeometry(0.12 * ws, 0.06, 0.02), toon('#f2f2ee'), 0, 0.54 * hs, 0.12 * ws); }
    // 腕
    this.arms = [];
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * (0.17 * ws + 0.04), 0.55 * hs, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(cs === 7 ? 0.075 : 0.05, 0.16 * hs, 4, 8), cs === 0 || cs === 3 ? skin : shirt); m.position.y = -0.11 * hs; piv.add(m); if (cs === 0 || cs === 3) { const sl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), shirt); sl.position.y = -0.02; piv.add(sl); } const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin); hand.position.y = -0.24 * hs; piv.add(hand); piv.rotation.z = s * 0.12; body.add(piv); this.arms.push(piv); }
    // 頭
    const head = new THREE.Group(); head.position.y = 0.66 * hs + 0.27; head.scale.setScalar(0.56); body.add(head); this.head = head;
    const hg = deformGeo(new THREE.SphereGeometry(0.5, 40, 28), f.shape); const hm = new THREE.Mesh(hg, skin); hm.castShadow = true; head.add(hm);
    // 耳
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), skin); e.position.set(s * 0.48 * (f.shape === 2 || f.shape === 5 ? 0.88 : 1), -0.02, 0); e.scale.set(0.6, 1, 0.8); head.add(e); }
    const L = (118 * Math.PI) / 180;
    const fg = deformGeo(new THREE.SphereGeometry(0.506, 48, 36, Math.PI / 2 - L / 2, L, (30 * Math.PI) / 180, (118 * Math.PI) / 180), f.shape);
    // three の球は phi=π/2 で -x… 正面を +z に
    fg.rotateY(-Math.PI / 2 + Math.PI / 2);
    this.faceMat = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const fm = new THREE.Mesh(fg, this.faceMat); fm.renderOrder = 2; head.add(fm); this.faceMesh = fm;
    // 髪
    const sh = HAIR_SHELL[f.hair];
    const hairG = new THREE.Group(); head.add(hairG);
    if (sh) { const shellG = deformGeo(hairShell(sh[0], sh[1], sh[2], f.hair === 10 || f.hair === 21 ? 0.515 : 0.535, f.hair === 12 ? 1 : 0), f.shape); const m = new THREE.Mesh(shellG, hairM); m.castShadow = true; hairG.add(m); }
    const ex = hairExtras(f.hair, hairM); hairG.add(ex); ex.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (f.hat) head.add(hatMesh(f.hat));
    this.refreshFace();
    // 影
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; R.add(shadow);
    this.height = 0.66 * hs + 0.27 + 0.32;
    const um = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: ['#e8443a', '#3a8ae0', '#f5cf30', '#f08cb2', '#3aa858'][Math.abs(f.food || 0) % 5], side: THREE.DoubleSide });
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 10, 1, true), cm); top.position.y = 1.55 * hs; um.add(top);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9), new THREE.MeshLambertMaterial({ color: '#555' })); st.position.y = 1.1 * hs; um.add(st);
    um.position.set(0.18, 0, 0.05); um.visible = false; R.add(um); this.umbrella = um;
  }
  // 歩きアニメ
  animate(t, speed, dt, mode) {
    const ws = this.f.walk || 0; const fq = [1, 0.9, 1.3, 1.4][ws], amp = [1, 0.8, 0.45, 1.1][ws];
    this.phase = (this.phase || 0) + dt * speed * 4.6 * fq;
    const run = Math.min(1.4, speed / 2.2); const sw = Math.sin(this.phase) * Math.min(1, speed * 0.5) * amp;
    this.legs[0].rotation.x = sw * 0.7; this.legs[1].rotation.x = -sw * 0.7;
    if (mode === 'dance') { this.arms[0].rotation.z = -2.4 + Math.sin(t * 8) * 0.5; this.arms[1].rotation.z = 2.4 + Math.sin(t * 8 + 1) * 0.5; this.body.position.y = Math.abs(Math.sin(t * 8)) * 0.08; this.body.rotation.y = Math.sin(t * 4) * 0.5; }
    else if (mode === 'wave') { this.arms[1].rotation.z = 2.6 + Math.sin(t * 12) * 0.4; this.arms[0].rotation.x = 0; this.body.rotation.y = 0; this.body.position.y = 0; }
    else if (mode === 'sleep') { this.body.rotation.x = -Math.PI / 2 + 0.05; this.body.position.y = 0.25; this.arms[0].rotation.x = this.arms[1].rotation.x = 0; }
    else if (mode === 'sit') { this.legs[0].rotation.x = this.legs[1].rotation.x = -1.5; this.body.position.y = -0.2; this.body.rotation.x = 0; this.arms[0].rotation.set(-0.8, 0, -0.15); this.arms[1].rotation.set(-0.8, 0, 0.15); }
    else if (mode === 'cook') { this.arms[0].rotation.set(-1.2 + Math.sin(t * 9) * 0.3, 0, -0.2); this.arms[1].rotation.set(-1.2 + Math.cos(t * 9) * 0.3, 0, 0.2); this.body.position.y = 0; this.body.rotation.set(0.08, Math.sin(t * 2) * 0.1, 0); }
    else if (mode === 'eat') { this.arms[1].rotation.x = -1.6 + Math.sin(t * 10) * 0.3; this.arms[1].rotation.z = 0.3; this.body.position.y = 0; }
    else if (mode === 'joy') { this.arms[0].rotation.z = -2.6; this.arms[1].rotation.z = 2.6; this.arms[0].rotation.x = this.arms[1].rotation.x = 0; this.body.position.y = Math.abs(Math.sin(t * 7)) * 0.45; this.legs[0].rotation.x = -0.6; this.legs[1].rotation.x = 0.6; this.body.rotation.set(0, 0, 0); }
    else if (mode === 'stomp') { const s = Math.sin(t * 16); this.legs[0].rotation.x = Math.max(0, s) * -0.9; this.legs[1].rotation.x = Math.max(0, -s) * -0.9; this.arms[0].rotation.z = -0.5; this.arms[1].rotation.z = 0.5; this.arms[0].rotation.x = this.arms[1].rotation.x = -0.3; this.body.position.y = 0; this.body.rotation.set(0.12, 0, Math.sin(t * 20) * 0.06); }
    else if (mode === 'sad') { this.arms[0].rotation.set(0, 0, -0.05); this.arms[1].rotation.set(0, 0, 0.05); this.legs[0].rotation.x = this.legs[1].rotation.x = 0; this.body.position.y = -0.03; this.body.rotation.set(0.28, 0, Math.sin(t * 1.5) * 0.05); this.head.rotation.x = 0.35; }
    else if (mode === 'surprise') { this.arms[0].rotation.set(0, 0, -1.4); this.arms[1].rotation.set(0, 0, 1.4); this.body.position.y = Math.max(0, Math.sin(Math.min(t % 1.5, 0.4) / 0.4 * Math.PI)) * 0.35; this.body.rotation.set(-0.15, 0, 0); }
    else if (mode === 'cheer') { this.arms[0].rotation.z = -2.8; this.arms[1].rotation.z = 2.8; this.body.position.y = Math.abs(Math.sin(t * 9)) * 0.25; }
    else {
      this.arms[0].rotation.x = -sw * (0.8 + run * 0.5); this.arms[1].rotation.x = sw * (0.8 + run * 0.5); this.arms[0].rotation.z = -0.12; this.arms[1].rotation.z = 0.12; if (run > 0.9) this.body.rotation.x = 0.1;
      this.body.position.y = Math.abs(sw) * (ws === 1 ? 0.16 : 0.03); this.body.rotation.set(0, ws === 3 ? 0 : 0, ws === 2 ? Math.sin(t * fq) * 0.12 * Math.min(1, speed) : 0); if (ws === 3 && speed > 0.1) this.body.rotation.x = 0.12;
      if (speed < 0.05) { this.head.rotation.z = Math.sin(t * 1.3) * 0.04; if (this.torso) this.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.02; if (this.talking) { this.arms[1].rotation.x = -0.6 + Math.sin(t * 5) * 0.4; this.arms[1].rotation.z = 0.3; this.arms[0].rotation.x = Math.sin(t * 4 + 1) * 0.25; } }
    }
    if (mode !== 'sleep' && mode !== 'sit' && mode !== 'stomp' && mode !== 'sad' && mode !== 'surprise') this.body.rotation.x = 0;
    if (mode !== 'sad') this.head.rotation.x = 0;
    if (this.act && speed < 0.05 && !['sleep', 'sit', 'eat', 'cook'].includes(mode)) { const A = this.arms, H = this.head, Bd = this.body;
      if (this.act === 'shy') { A[0].rotation.set(-0.5, 0, 0.35); A[1].rotation.set(-0.5, 0, -0.35); H.rotation.x = 0.18; H.rotation.z = Math.sin(t * 2) * 0.06; Bd.position.y = -0.02 + Math.sin(t * 3) * 0.008; }
      else if (this.act === 'sulk') { A[0].rotation.set(-1.25, 0, 0.95); A[1].rotation.set(-1.25, 0, -0.95); H.rotation.y = 0.7; H.rotation.x = -0.08; }
      else if (this.act === 'trouble') { A[1].rotation.set(-2.7, 0, -0.2); H.rotation.y = Math.sin(t * 2.4) * 0.45; H.rotation.z = 0.12; }
      else if (this.act === 'laugh') { A[0].rotation.set(-0.7, 0, 0.5); A[1].rotation.set(-0.7, 0, -0.5); Bd.rotation.z = Math.sin(t * 15) * 0.07; Bd.position.y = Math.abs(Math.sin(t * 15)) * 0.03; H.rotation.x = -0.15; }
      else if (this.talking) { const p = this.f.personality || 0;
        if (p === 0) { A[0].rotation.set(-2.2 + Math.sin(t * 6) * 0.5, 0, 0.3); A[1].rotation.set(-2.2 + Math.cos(t * 6) * 0.5, 0, -0.3); }
        else if (p === 1) { A[1].rotation.set(-0.3 + Math.sin(t * 2) * 0.15, 0, -0.15); H.rotation.z = Math.sin(t * 1.5) * 0.08; }
        else if (p === 2) { A[1].rotation.set(-1.5, 0, -0.1); A[1].rotation.x += Math.sin(t * 8) * 0.12; }
        else if (p === 3) { A[1].rotation.set(-2.3, 0, -0.55); H.rotation.z = 0.15; }
        else if (p === 4) { A[0].rotation.set(-0.9, 0, 0.6); A[1].rotation.set(-0.9, 0, -0.6); Bd.rotation.z = Math.sin(t * 4) * 0.05; }
        else if (p === 5) { A[0].rotation.set(-2.8, 0, 0.9); A[1].rotation.set(-2.8, 0, -0.9); }
        else { A[0].rotation.set(-0.4 + Math.sin(t * 5) * 0.1, 0, 0.3); A[1].rotation.set(-0.4 + Math.cos(t * 5) * 0.1, 0, -0.3); H.rotation.x = 0.1; } } }
    if (this.listening && mode !== 'sleep') { this.head.rotation.x = Math.max(0, Math.sin(t * 3.2)) * 0.14; this.head.rotation.z = 0.1; }
  }
  setPajama(on) { if (this.pj === on || !this.shirtM) return; this.pj = on; if (this.artM) this.artM.visible = !on; if (on) { this.shirtM.map = patternTex(1, '#b8d4ff', '#ffffff'); this.shirtM.color.set('#ffffff'); } else { this.shirtM.map = this.shirt0.map; this.shirtM.color.copy(this.shirt0.color); } this.shirtM.needsUpdate = true; }
  dispose() { for (const k in this.textures) this.textures[k].dispose(); this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
}

// 顔アイコン（2D・UI用）
let ICON_HOOK = null; export const setFaceIconHook = (fn) => (ICON_HOOK = fn);
export function faceIcon(f, drawingImg, size = 128) {
  if (f && f.species && ICON_HOOK) { const c = ICON_HOOK(f, size); if (c) return c; }
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
  g.fillStyle = f.hairColor; g.beginPath(); g.ellipse(size / 2, size * 0.46, size * 0.47, size * 0.44, 0, Math.PI, 0); g.fill();
  g.fillStyle = SKINS[f.skin]; g.beginPath(); g.ellipse(size / 2, size * 0.55, size * 0.4, size * 0.42, 0, 0, Math.PI * 2); g.fill();
  const fc = renderFace(f, 256, 'open', drawingImg);
  g.save(); g.beginPath(); g.ellipse(size / 2, size * 0.55, size * 0.4, size * 0.42, 0, 0, Math.PI * 2); g.clip(); g.drawImage(fc, size * 0.02, size * 0.08, size * 0.96, size * 0.96); g.restore();
  g.fillStyle = f.hairColor; g.beginPath(); g.ellipse(size / 2, size * 0.24, size * 0.38, size * 0.14, 0, 0, Math.PI * 2); g.fill();
  return cv;
}
export const hatMeshFor = (t) => hatMesh(t);
