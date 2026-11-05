import { hasVoice, playVoice, stopVoice } from './voice.js';
// なかよしアイランド — べんきょう（えがき大戦から流用＋えいご）（小1・11月ごろ：くり上がり／くり下がり・3つのかず・10といくつ・とけい・ぶんしょうだい
//                        こくご：かんじ・カタカナ・は／を／へ・ちいさい「っ」「ゃゅょ」）
// まちがえたら、図つきで わかりやすく せつめいする。

const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function choicesNum(ans, lo = 0, hi = 20) {
  const s = new Set([ans]);
  const near = [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2].filter(v => v >= lo && v <= hi && v !== ans);
  shuffle(near);
  for (const v of near) { if (s.size >= 3) break; s.add(v); }
  while (s.size < 3) s.add(R(lo, hi));
  return shuffle([...s]).map(String);
}

// ---- 図（HTML）
const dot = (on, cls = '') => `<i class="d ${on ? 'on' : ''} ${cls}"></i>`;
function tenFrame(n, cls = '', cross = 0) {
  let h = '<span class="tf">';
  for (let i = 0; i < 10; i++) h += dot(i < n, (i < n && i >= n - cross ? 'x ' : '') + cls);
  return h + '</span>';
}
function dotsRow(n, cls = '', cross = 0) { let h = '<span class="dr">'; for (let i = 0; i < n; i++) h += dot(true, (i >= n - cross ? 'x ' : '') + cls); return h + '</span>'; }
function clockSVG(h, half) {
  const ha = ((h % 12) + (half ? 0.5 : 0)) / 12 * Math.PI * 2, ma = half ? Math.PI : 0;
  let ticks = '';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; ticks += `<text x="${50 + Math.sin(a) * 37}" y="${54 + -Math.cos(a) * 37}" font-size="10" text-anchor="middle" fill="#2a2433" font-weight="700">${i}</text>`; }
  return `<svg class="clk" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fffaf0" stroke="#2a2433" stroke-width="4"/>${ticks}
    <line x1="50" y1="50" x2="${50 + Math.sin(ha) * 22}" y2="${50 - Math.cos(ha) * 22}" stroke="#e8383d" stroke-width="6" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${50 + Math.sin(ma) * 34}" y2="${50 - Math.cos(ma) * 34}" stroke="#2f6fe0" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="4" fill="#2a2433"/></svg>`;
}

// ---- もんだいの しゅるい
const KANJI = [
  ['山', 'やま', 'やまの かたちから できた じ。まんなかが いちばん たかいね'], ['川', 'かわ', 'みずが ながれる ようすを 3ぼんの せんで あらわした じ'],
  ['木', 'き', 'えだと ねが ある きの かたち'], ['日', 'ひ', 'おひさまの かたちから できた じ'], ['月', 'つき', 'みかづきの かたちから できた じ'],
  ['火', 'ひ', 'もえる ほのおの かたち'], ['水', 'みず', 'ながれる みずの かたち'], ['田', 'た', 'たんぼを うえから みた かたち'],
  ['口', 'くち', 'ひらいた くちの かたち'], ['目', 'め', 'めを たてに した かたち'], ['手', 'て', 'ゆびを ひらいた ての かたち'],
  ['足', 'あし', 'ひざから したの あしの かたち'], ['雨', 'あめ', 'くもから あめつぶが おちる かたち'], ['花', 'はな', 'くさかんむりは しょくぶつの しるし'],
  ['石', 'いし', 'がけの したに ころがる いしの かたち'], ['空', 'そら', 'あなの むこうに ひろがる そら'], ['犬', 'いぬ', 'いぬが よこを むいた かたち'],
  ['虫', 'むし', 'へびや むしの かたち'], ['森', 'もり', '木が 3つで もり。木が 2つだと 林（はやし）'], ['人', 'ひと', 'ひとが たって いる よこがお'],
];
const KATA = [
  ['ぺっと', 'ペット', ['ベット', 'ペツト']], ['どあ', 'ドア', ['トア', 'ドマ']], ['べっど', 'ベッド', ['ペッド', 'ベツド']],
  ['しーる', 'シール', ['ツール', 'シーリ']], ['けーき', 'ケーキ', ['ケーモ', 'ゲーキ']], ['ぺん', 'ペン', ['ベン', 'ペソ']],
  ['ぼーる', 'ボール', ['ポール', 'ボーリ']], ['ろけっと', 'ロケット', ['ロケツト', 'ロケッソ']], ['どらごん', 'ドラゴン', ['トラゴン', 'ドラコン']],
];
const PARTICLE = [
  ['わたし（ ）がっこうへ いきます。', 'は', 'わ', '「〜は」は、「わ」と よむけど「は」と かくよ。だれの おはなしかを あらわす ことば'],
  ['ぼく（ ）えを かきます。', 'は', 'わ', 'だれが するかの あとの「わ」と よむ ことばは「は」と かく'],
  ['えほん（ ）よみます。', 'を', 'お', 'なにを するかを あらわす「お」は「を」と かくよ'],
  ['おうち（ ）たてます。', 'を', 'お', '「〜を たてます」の「を」。ことばと ことばを つなぐ「お」は「を」'],
  ['こうえん（ ）いきます。', 'へ', 'え', 'いく ばしょの あとの「え」は「へ」と かくよ'],
  ['おしろ（ ）もどります。', 'へ', 'え', 'むかう ばしょの「え」は「へ」と かく'],
];
const SMALL = [
  ['✉️ ゆうびんで はる もの', 'きって', ['きて', 'きつて'], 'つまる おとは ちいさい「っ」。「き・っ・て」と 3つで よむ'],
  ['🚂 せんろを はしる のりもの', 'きしゃ', ['きしや', 'きさ'], '「しゃ」は「し」に ちいさい「ゃ」。いっしょに 1つの おとで よむ'],
  ['🐟 うみや かわに すむ', 'さかな', ['さっかな', 'さかなゃ'], 'ちいさい じは いらないね。「さ・か・な」'],
  ['🐠 すいそうで かう あかい さかな', 'きんぎょ', ['きんぎよ', 'きんご'], '「ぎょ」は「ぎ」に ちいさい「ょ」。いっしょに 1つの おとで よむ'],
  ['🚃 せんろを はしる', 'でんしゃ', ['でんしや', 'でしゃ'], '「しゃ」は「し」に ちいさい「ゃ」'],
  ['📕 いえで やる べんきょう', 'しゅくだい', ['しゆくだい', 'しくだい'], '「しゅ」は「し」に ちいさい「ゅ」'],
  ['🥛 しろい のみもの', 'ぎゅうにゅう', ['ぎゆうにゆう', 'ぎうにう'], '「ぎゅ」「にゅ」は ちいさい「ゅ」を つける'],
  ['🐱 にゃあと なく', 'ねこ', ['ねっこ', 'ねこゃ'], 'ちいさい じは いらないね。「ね・こ」'],
];

function q_addCarry() {
  const a = R(4, 9), b = R(11 - a, 9), ans = a + b, need = 10 - a, rest = b - need;
  return {
    cat: 'add', text: `${a} ＋ ${b} ＝ ？`, say: `${a} たす ${b} は いくつ？`, ans: String(ans), choices: choicesNum(ans, 2, 20),
    explain: `<p>${a} に <b>${need}</b> を たして <b>10</b>。のこりは <b>${rest}</b>。</p>
      <div class="viz">${tenFrame(10, 'a')}<span class="op">＋</span>${dotsRow(rest, 'b')}</div>
      <p class="hl">${ans}</p>`,
  };
}
function q_subBorrow() {
  const m = R(3, 9), n = R(11, 9 + m), ones = n - 10, ans = n - m;
  return {
    cat: 'sub', text: `${n} − ${m} ＝ ？`, say: `${n} ひく ${m} は いくつ？`, ans: String(ans), choices: choicesNum(ans, 0, 18),
    explain: `<p><b>10</b> から ${m} を ひいて <b>${10 - m}</b>。${10 - m} と ${ones} で…</p>
      <div class="viz">${tenFrame(10, 'a', m)}<span class="op">と</span>${dotsRow(ones, 'b')}</div>
      <p class="hl">${ans}</p>`,
  };
}
function q_three() {
  if (Math.random() < 0.5) {
    const a = R(2, 6), b = R(1, 4), c = R(1, 10 - a - b > 0 ? 9 - a - b : 1), ans = a + b + c;
    return { cat: 'three', text: `${a} ＋ ${b} ＋ ${c} ＝ ？`, say: `${a} たす ${b} たす ${c} は？`, ans: String(ans), choices: choicesNum(ans, 2, 20),
      explain: `<p>まえから じゅんばんに。 ${a} ＋ ${b} ＝ <b>${a + b}</b></p><p>${a + b} ＋ ${c} ＝ <b class="hl">${ans}</b></p><div class="viz">${dotsRow(a, 'a')}${dotsRow(b, 'b')}${dotsRow(c, 'c')}</div>` };
  }
  const a = R(10, 15), b = R(1, 4), c = R(1, 4), ans = a - b - c;
  return { cat: 'three', text: `${a} − ${b} − ${c} ＝ ？`, say: `${a} ひく ${b} ひく ${c} は？`, ans: String(ans), choices: choicesNum(ans, 0, 18),
    explain: `<p>まえから じゅんばんに。 ${a} − ${b} ＝ <b>${a - b}</b></p><p>${a - b} − ${c} ＝ <b class="hl">${ans}</b></p>` };
}
function q_teen() {
  const o = R(1, 9), n = 10 + o;
  if (Math.random() < 0.5) return { cat: 'teen', text: `10 と ${o} で いくつ？`, say: `じゅう と ${o} で いくつ？`, ans: String(n), choices: choicesNum(n, 1, 20),
    explain: `<div class="viz">${tenFrame(10, 'a')}<span class="op">と</span>${dotsRow(o, 'b')}</div><p>10 の まとまりが 1つ と ${o}。 じゅう${o === 1 ? 'いち' : ''}… <b class="hl">${n}</b></p>` };
  return { cat: 'teen', text: `${n} は 10 と いくつ？`, say: `${n} は じゅう と いくつ？`, ans: String(o), choices: choicesNum(o, 0, 10),
    explain: `<div class="viz">${tenFrame(10, 'a')}<span class="op">と</span>${dotsRow(o, 'b')}</div><p>${n} の みぎの すうじが「いくつ」。 <b class="hl">${o}</b></p>` };
}
function q_clock() {
  const h = R(1, 12), half = Math.random() < 0.5;
  const ans = half ? `${h}じはん` : `${h}じ`;
  const other = [half ? `${h}じ` : `${h}じはん`, `${(h % 12) + 1}じ${half ? 'はん' : ''}`, half ? `${h === 12 ? 1 : h + 1}じ` : `${(h + 5) % 12 + 1}じ`];
  const ch = shuffle([...new Set([ans, ...other])].slice(0, 3));
  return { cat: 'clock', text: 'なんじ？', say: 'とけいは なんじ？', html: clockSVG(h, half), ans, choices: ch,
    explain: `${clockSVG(h, half)}<p><span style="color:#e8383d">みじかい はり</span>＝なんじ。<span style="color:#2f6fe0">ながい はり</span>が ${half ? '<b>6</b> なら「はん」' : '<b>12</b> なら「ちょうど」'}。</p><p class="hl">${ans}</p>` };
}
function q_word() {
  const t = R(0, 2);
  if (t === 0) { const a = R(11, 16), b = R(3, 9), ans = a - b;
    return { cat: 'word', text: `りんごが ${a}こ あります。${b}こ たべました。のこりは なんこ？`, say: `りんごが ${a}こ あります。${b}こ たべました。のこりは なんこ？`, ans: String(ans), choices: choicesNum(ans, 0, 18),
      explain: `<p>「のこりは」は <b>ひきざん</b>。</p><p>${a} − ${b} ＝ <b class="hl">${ans}</b></p><div class="viz">${tenFrame(10, 'a', Math.min(b, 10))}${dotsRow(a - 10, 'b')}</div>` }; }
  if (t === 1) { const a = R(5, 9), b = R(11 - a, 9), ans = a + b;
    return { cat: 'word', text: `しまに ともだちが ${a}にん います。${b}にん きました。ぜんぶで なんにん？`, say: `しまに ともだちが ${a}にん います。${b}にん きました。ぜんぶで なんにん？`, ans: String(ans), choices: choicesNum(ans, 2, 20),
      explain: `<p>「ぜんぶで」は <b>たしざん</b>。</p><p>${a} ＋ ${b} ＝ <b class="hl">${ans}</b></p>` }; }
  const a = R(12, 17), b = R(5, 9), ans = a - b;
  return { cat: 'word', text: `コインが ${a}まい。${b}まい つかうと なんまい のこる？`, say: `コインが ${a}まい。${b}まい つかうと なんまい のこる？`, ans: String(ans), choices: choicesNum(ans, 0, 18),
    explain: `<p>つかうと へるから <b>ひきざん</b>。</p><p>${a} − ${b} ＝ <b class="hl">${ans}</b></p>` };
}
function q_kanjiRead() {
  const [k, y, why] = KANJI[R(0, KANJI.length - 1)];
  const others = shuffle(KANJI.filter(x => x[1] !== y).map(x => x[1])).slice(0, 2);
  return { cat: 'kanji', text: 'この かんじの よみかたは？', say: 'この かんじの よみかたは？', html: `<div class="kj">${k}</div>`, ans: y, choices: shuffle([y, ...others]),
    explain: `<div class="kj">${k}</div><p>「${k}」は「<b>${y}</b>」。${why}。</p>` };
}
function q_kanjiPick() {
  const [k, y, why] = KANJI[R(0, KANJI.length - 1)];
  const others = shuffle(KANJI.filter(x => x[1] !== y).map(x => x[0])).slice(0, 2);
  return { cat: 'kanji', text: `「${y}」を かんじで かくと？`, say: `${y} を かんじで かくと どれ？`, ans: k, choices: shuffle([k, ...others]), big: true,
    explain: `<div class="kj">${k}</div><p>「${y}」は「<b>${k}</b>」。${why}。</p>` };
}
function q_kata() {
  const [h, k, ng] = KATA[R(0, KATA.length - 1)];
  return { cat: 'kata', text: `「${h}」を カタカナで かくと？`, say: `${h} を カタカナで かくと どれ？`, ans: k, choices: shuffle([k, ...ng.filter(x => x !== k)].slice(0, 3)), big: true,
    explain: `<p>「${h}」は</p><p class="hl">${k}</p><p>「ー」「゛」「ッ」を よく みよう。</p>` };
}
function q_particle() {
  const [s, a, b, why] = PARTICLE[R(0, PARTICLE.length - 1)];
  return { cat: 'joshi', text: `（ ）に はいる じは？\n${s}`, say: s.replace('（ ）', 'まる'), ans: a, choices: shuffle([a, b]), big: true,
    explain: `<p>${s.replace('（ ）', `<b class="hl">${a}</b>`)}</p><p>${why}。</p>` };
}
function q_small() {
  const [hint, a, ng, why] = SMALL[R(0, SMALL.length - 1)];
  return { cat: 'small', text: `ただしい かきかたは？\n${hint}`, say: `ただしい かきかたは どれ？`, ans: a, choices: shuffle([a, ...ng]), big: true,
    explain: `<p>ただしくは「<b class="hl">${a}</b>」。</p><p>${why}。</p>` };
}


// ---- えいご（小1）
const EN = [
  ['🍎', 'apple', 'りんご'], ['🐶', 'dog', 'いぬ'], ['🐱', 'cat', 'ねこ'], ['🍌', 'banana', 'バナナ'], ['🚗', 'car', 'くるま'], ['🏠', 'house', 'いえ'],
  ['🌸', 'flower', 'はな'], ['🐟', 'fish', 'さかな'], ['☀️', 'sun', 'たいよう'], ['🌙', 'moon', 'つき'], ['⭐', 'star', 'ほし'], ['🍰', 'cake', 'ケーキ'],
  ['🐻', 'bear', 'くま'], ['🐰', 'rabbit', 'うさぎ'], ['🐦', 'bird', 'とり'], ['🌳', 'tree', 'き'], ['📕', 'book', 'ほん'], ['🎈', 'balloon', 'ふうせん'],
  ['🥚', 'egg', 'たまご'], ['🍓', 'strawberry', 'いちご'], ['🚪', 'door', 'ドア'], ['🛏️', 'bed', 'ベッド'], ['🪑', 'chair', 'いす'], ['🧢', 'hat', 'ぼうし'],
];
const EN_COL = [['red', 'あか', '#e8383d'], ['blue', 'あお', '#2f6fe0'], ['yellow', 'きいろ', '#f5cf30'], ['green', 'みどり', '#3aa858'], ['pink', 'ピンク', '#f08cb2'], ['black', 'くろ', '#222'], ['white', 'しろ', '#fff'], ['orange', 'オレンジ', '#ee8a24'], ['purple', 'むらさき', '#7f3ca8'], ['brown', 'ちゃいろ', '#7b5233']];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const EN_GREET = [['おはよう', 'Good morning'], ['こんにちは', 'Hello'], ['ありがとう', 'Thank you'], ['さようなら', 'Goodbye'], ['おやすみ', 'Good night'], ['ごめんなさい', "I'm sorry"]];
function q_enWord() {
  const [e, w, j] = EN[R(0, EN.length - 1)]; const others = shuffle(EN.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[1]);
  return { cat: 'en', text: 'えいごで なんて いう？', say: j + ' は えいごで なんていう？', en: w, html: `<div class="kj">${e}</div>`, ans: w, choices: shuffle([w, ...others]), big: true,
    explain: `<div class="kj">${e}</div><p>${j} は <b class="hl">${w}</b></p>` };
}
function q_enPic() {
  const [e, w, j] = EN[R(0, EN.length - 1)]; const others = shuffle(EN.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[0]);
  return { cat: 'en', text: `「${w}」は どれ？`, say: w, sayEn: true, ans: e, choices: shuffle([e, ...others]), big: true, emoji: true,
    explain: `<p><b>${w}</b> は「${j}」</p><div class="kj">${e}</div>` };
}
function q_enColor() {
  const [w, j, c] = EN_COL[R(0, EN_COL.length - 1)]; const others = shuffle(EN_COL.filter((x) => x[0] !== w)).slice(0, 2).map((x) => x[0]);
  return { cat: 'en', text: 'この いろは えいごで？', say: 'このいろは えいごで なんていう？', en: w, html: `<div class="kj"><span style="display:inline-block;width:90px;height:90px;border-radius:50%;background:${c};border:4px solid #2a2433"></span></div>`, ans: w, choices: shuffle([w, ...others]), big: true,
    explain: `<p>${j} は <b class="hl">${w}</b></p>` };
}
function q_enNum() {
  const n = R(1, 10); const others = shuffle([...Array(11).keys()].filter((x) => x && x !== n)).slice(0, 2).map((x) => EN_NUM[x]);
  return { cat: 'en', text: `${'🍬'.repeat(n)}\nいくつ？ えいごで こたえよう`, say: 'いくつ？ えいごで こたえよう', en: EN_NUM[n], ans: EN_NUM[n], choices: shuffle([EN_NUM[n], ...others]), big: true,
    explain: `<p>${n} は <b class="hl">${EN_NUM[n]}</b></p>` };
}
function q_enGreet() {
  const [j, e] = EN_GREET[R(0, EN_GREET.length - 1)]; const others = shuffle(EN_GREET.filter((x) => x[1] !== e)).slice(0, 2).map((x) => x[1]);
  return { cat: 'en', text: `「${j}」は えいごで？`, say: j + ' は えいごで？', en: e, ans: e, choices: shuffle([e, ...others]), big: true, explain: `<p>${j} は <b class="hl">${e}</b></p>` };
}
function q_enFirst() {
  const [e, w, j] = EN[R(0, EN.length - 1)]; const L = w[0]; const pool = 'abcdefghijklmnoprstuwy'.split('').filter((c) => c !== L);
  return { cat: 'en', text: `${j} = _${w.slice(1)}\nさいしょの もじは？`, say: w, sayEn: true, html: `<div class="kj">${e}</div>`, ans: L, choices: shuffle([L, ...shuffle(pool).slice(0, 2)]), big: true,
    explain: `<p><b class="hl">${L}</b>${w.slice(1)}（${j}）</p>` };
}

// ---- しまの ものがたり もんだい（住人の なまえ入り）
export function themedQuestion(ctx) {
  const t = R(0, 2);
  if (t === 0) { // さんすう：おかしの わけっこ
    const a = R(6, 12), b = R(2, Math.min(5, a - 1)), ans = a - b;
    return { cat: 'word', theme: 'share', text: `${ctx.a}は クッキーを ${a}こ もっています。${ctx.b}に ${b}こ あげました。のこりは なんこ？`, say: `${ctx.a}は クッキーを ${a}こ もっています。${ctx.b}に ${b}こ あげました。のこりは なんこ？`, ans: String(ans), choices: choicesNum(ans, 0, 15),
      explain: `<p>「あげる」と へるから <b>ひきざん</b>。</p><p>${a} − ${b} ＝ <b class="hl">${ans}</b></p><div class="viz">${dotsRow(a, 'a', b)}</div>` };
  }
  if (t === 1) { // こくご：てがみの あなうめ
    const [s, a, b, why] = [['（ ）', 'は', 'わ', 'だれの おはなしかの「わ」は「は」と かく'], ['（ ）', 'を', 'お', 'なにを するかの「お」は「を」'], ['（ ）', 'へ', 'え', 'いく ばしょの「え」は「へ」']][R(0, 2)];
    const body = a === 'は' ? `${ctx.b}へ。わたし（ ）${ctx.a}です。あした あそぼうね。` : a === 'を' ? `${ctx.b}へ。いっしょに おにぎり（ ）たべようね。${ctx.a}より` : `${ctx.b}へ。あした ひろば（ ）きてね。${ctx.a}より`;
    return { cat: 'joshi', theme: 'letter', text: `${ctx.a}の てがみ。（ ）に はいる じは？\n${body}`, say: `${ctx.a}の てがみ。まるに はいる じは？`, ans: a, choices: shuffle([a, b]), big: true,
      explain: `<p>${body.replace('（ ）', `<b class="hl">${a}</b>`)}</p><p>${why}。</p>` };
  }
  // えいご：ペット・どうぶつ
  const AN = [['🐶', 'dog', 'いぬ'], ['🐱', 'cat', 'ねこ'], ['🐰', 'rabbit', 'うさぎ'], ['🐦', 'bird', 'とり'], ['🐟', 'fish', 'さかな'], ['🐻', 'bear', 'くま'], ['🐸', 'frog', 'かえる'], ['🐵', 'monkey', 'さる']];
  const [e, w, j] = AN[R(0, AN.length - 1)]; const others = shuffle(AN.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[1]);
  return { cat: 'en', theme: 'pet', text: `${ctx.pet || ctx.a}が「${e}」の まねを してるよ。えいごで なんて いう？`, say: `${j}は えいごで なんていう？`, en: w, html: `<div class="kj">${e}</div>`, ans: w, choices: shuffle([w, ...others]), big: true, explain: `<div class="kj">${e}</div><p>${j} は <b class="hl">${w}</b></p>` };
}

const GEN = { add: q_addCarry, sub: q_subBorrow, three: q_three, teen: q_teen, clock: q_clock, word: q_word, kanji: () => (Math.random() < 0.5 ? q_kanjiRead() : q_kanjiPick()), kata: q_kata, joshi: q_particle, small: q_small, en: () => [q_enWord, q_enPic, q_enColor, q_enNum, q_enGreet, q_enFirst][R(0, 5)]() };
export const CAT_NAME = { add: 'たしざん（くりあがり）', sub: 'ひきざん（くりさがり）', three: '3つの かず', teen: '10と いくつ', clock: 'とけい', word: 'ぶんしょうだい', kanji: 'かんじ', kata: 'カタカナ', joshi: 'は・を・へ', small: 'ちいさい「っ」「ゃゅょ」', en: 'えいご' };

// ---- むずかしさ（せいかいが つづくと あがる）
function q_easyMath() { const a = R(1, 6), b = R(1, 9 - a); if (Math.random() < 0.5) return { cat: 'add', text: `${a} ＋ ${b} ＝ ？`, say: `${a} たす ${b} は？`, ans: String(a + b), choices: choicesNum(a + b, 0, 10), explain: `<div class="viz">${dotsRow(a, 'a')}<span class="op">＋</span>${dotsRow(b, 'b')}</div><p class="hl">${a + b}</p>` };
  const c = a + b; return { cat: 'sub', text: `${c} − ${a} ＝ ？`, say: `${c} ひく ${a} は？`, ans: String(b), choices: choicesNum(b, 0, 10), explain: `<div class="viz">${dotsRow(c, 'a', a)}</div><p class="hl">${b}</p>` }; }
function q_hardMath() { if (Math.random() < 0.5) { const a = R(2, 8) * 10 + R(0, 5), b = R(1, 4); return { cat: 'add', text: `${a} ＋ ${b} ＝ ？`, say: `${a} たす ${b} は？`, ans: String(a + b), choices: choicesNum(a + b, a - 5, a + 15), explain: `<p>いちの くらいだけ たすよ。${a % 10} ＋ ${b} ＝ ${a % 10 + b}</p><p class="hl">${a + b}</p>` }; }
  const a = R(3, 9) * 10, b = R(1, a / 10 - 1) * 10; return { cat: 'sub', text: `${a} − ${b} ＝ ？`, say: `${a} ひく ${b} は？`, ans: String(a - b), choices: [...new Set([a - b, a - b + 10, Math.max(0, a - b - 10)])].map(String).sort(() => Math.random() - 0.5), explain: `<p>10の まとまりで かんがえよう。${a / 10} − ${b / 10} ＝ ${(a - b) / 10}</p><p class="hl">${a - b}</p>` }; }
const SUBJ = { math: ['add', 'sub', 'three', 'teen', 'clock', 'word'], kokugo: ['kanji', 'kata', 'joshi', 'small'], eigo: ['en'] };
export function levelOf(stats, subj) { return (stats._lv || {})[subj] ?? 1; }
export function subjOf(cat) { return SUBJ.math.includes(cat) ? 'math' : SUBJ.kokugo.includes(cat) ? 'kokugo' : 'eigo'; }
export function recordAnswer(stats, cat, ok) {
  const sj = subjOf(cat); stats._lv = stats._lv || {}; stats._st = stats._st || {}; const st = stats._st[sj] || (stats._st[sj] = { ok: 0, ng: 0 }); let lv = levelOf(stats, sj), msg = null;
  if (ok) { st.ok++; st.ng = 0; if (st.ok >= 3 && lv < 2) { lv++; st.ok = 0; msg = '⭐ すこし むずかしく なったよ！'; } } else { st.ng++; st.ok = 0; if (st.ng >= 2 && lv > 0) { lv--; st.ng = 0; msg = '🌱 すこし やさしく したよ'; } }
  stats._lv[sj] = lv; return msg;
}
export function makeLeveled(stats, prefer) {
  const sj = prefer && prefer !== 'all' ? (prefer === 'eigo' ? 'eigo' : prefer) : ['math', 'math', 'kokugo', 'eigo'][R(0, 3)];
  const lv = levelOf(stats, sj); let q;
  if (sj === 'math') q = lv === 0 ? q_easyMath() : lv === 2 ? (Math.random() < 0.6 ? q_hardMath() : makeQuestion(stats, 'math')) : makeQuestion(stats, 'math');
  else if (sj === 'kokugo') q = lv === 0 ? (Math.random() < 0.5 ? q_kata() : q_small()) : lv === 2 ? q_kanjiPick() : makeQuestion(stats, 'kokugo');
  else { q = lv === 2 ? (Math.random() < 0.5 ? q_enFirst() : q_enGreet()) : [q_enWord, q_enPic, q_enColor, q_enNum][R(0, 3)](); if (lv === 0 && q.choices.length > 2) { q.choices = shuffle([q.ans, q.choices.find((c) => c !== q.ans)]); } }
  q.lv = lv; return q;
}
// まちがえが おおい しゅるいを 多めに出す
export function makeQuestion(stats, prefer) {
  const cats = Object.keys(GEN);
  let pool = prefer === 'math' ? cats.slice(0, 6) : prefer === 'kokugo' ? cats.slice(6, 10) : prefer === 'eigo' ? ['en'] : [...cats, 'en', 'en'];
  const w = pool.map(c => { const s = stats[c] || { ok: 0, ng: 0 }; return 1 + s.ng * 1.5 - Math.min(s.ok, 6) * 0.1; });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return GEN[pool[i]](); }
  return GEN[pool[0]]();
}

export function speakEn(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) {} }
export function speak(text, on = true, vtext) {
  if (!on) return;
  if (hasVoice(vtext || text)) { playVoice(vtext || text, window.__voiceVol ?? 1); return; }
  if (!window.speechSynthesis) return;
  try {
    stopVoice(); speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\n/g, '。').replace(/[＋]/g, 'たす').replace(/[−]/g, 'ひく').replace(/＝ ？/g, 'は？'));
    u.lang = 'ja-JP'; u.rate = 0.95; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (e) {}
}
