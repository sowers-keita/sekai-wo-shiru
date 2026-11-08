// せかいを しる — 小学1年・11月ごろの こくご／さんすう／えいご
// ・1もん とくと 5えん（おうちの ひとに いえば げんきんにも できる・ほかの ゲームでも つかえる おかね）
// ・せいかいが つづくと ほんの すこしずつ むずかしく（スキルの はしご＋こまかい レート）
// ・まちがえたら こえと ずで ゆっくり ぶんかいして せつめい
// ・れんぞく せいかいで コンボ・フィーバー
// ・たっせいどは localStorage「sekai-wo-shiru:v1」に ほぞん（おなじ サイトの ほかの ゲームと きょうゆう）＋まなびコード
const KEY = 'sekai-wo-shiru:v1';
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (a) => [...new Set(a)];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ※ short-benkyo 版：opt.gate={goal,onDone} で「N もん せいかいするまで おわれない」モード（なかよしアイランド版から流用・2026-11-04）
// ───────── ほぞん（ほかの ゲームでも つかえる 共通の かたち）
export function loadProgress() {
  let p = null; try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!p || p.v !== 1) { let main = null; try { main = localStorage.getItem(KEY); } catch (e) {} try { p = JSON.parse(localStorage.getItem(KEY + ':bak') || 'null'); } catch (e) { p = null; } if (main && p && p.v === 1) try { localStorage.setItem(KEY + ':broken', main); localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} } // こわれて いたら バックアップから もどして なおす（こわれた ものも のこす）
  if (p && p.v === 1) gcInit(p);
  if (!p || p.v !== 1) p = { v: 1, subj: { math: { r: 0, ok: 0, ng: 0 }, kokugo: { r: 0, ok: 0, ng: 0 }, eigo: { r: 0, ok: 0, ng: 0 } }, skill: {}, total: { ok: 0, ng: 0 }, coins: 0, cards: [], days: {}, best: 0, games: {} };
  gcInit(p); return p;
}
export function saveProgress(p) { try { const j = JSON.stringify(p); localStorage.setItem(KEY, j); const d = new Date().toDateString(); if (localStorage.getItem(KEY + ':bakday') !== d) { localStorage.setItem(KEY + ':bak', j); localStorage.setItem(KEY + ':bakday', d); } } catch (e) {} }
const ck = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1296).toString(36).padStart(2, '0'); };
export function exportCode(p) { const s = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, subj: p.subj, skill: p.skill, total: p.total, coins: p.coins, yen: p.yen, cards: p.cards, best: p.best, review: p.review, mastered: p.mastered, goal: p.goal, pickSubj: p.pickSubj, days: p.days, hist: p.hist, dev: p.dev, devSeq: p.devSeq || 0, devChk: p.devChk || {}, gcm: { ...(p.gcm || {}), [p.dev]: { seq: p.devSeq || 0 } }, snapMeta: p.snapMeta || {}, devRandTail: { from: Math.max(p.devRandFrom || 0, (p.devSeq || 0) - 2000), s: (p.devRand || '').slice(-2000 * RW_) }, own: packOwn(p), forkBase: p.forkBase || {}, forkMine: p.forkMine || {}, gcDead: p.gcDead || [], gcx: gcBuckets(p) })))); return 'SEKAI1-' + s + '-' + ck(s); }
// ───────── くみこみ用の やくそく（API）
export const SEKAI_API = '1.1';   // openSekai の よびかた（1.0＝これまで／1.1＝onResult・rewards・motion を ついか）
export const SEKAI_DATA = 1;      // まなびの きろくの かたち（p.v）
const OPT_KEYS = { voiceBase: 's', layout: 's', gamepad: 'b', keys: 'b', gameId: 's', prefer: 's', wallet: 'f', onCoins: 'f', onClose: 'f', onResult: 'f', onError: 'f', gate: 'o', voice: 'b', fx: 's', motion: 's', rewards: 'b', warmup: 'a', debug: 'b', force: 'a', mapOnly: 'b', api: 's' };
const GATE_KEYS = { onAssistExit: 'f', count: 's', goal: 'n', start: 'n', onProgress: 'f', onDone: 'f', onQuit: 'f', pick: 'a', back: 's' };
export function checkOpts(o) { // まちがった オプションは つかわずに むしして、けいこくの リストを かえす（アプリは とまらない）
  const w = []; const ty = { s: 'string', f: 'function', o: 'object', b: 'boolean', n: 'number' };
  const chk = (obj, K, pre) => { for (const k of Object.keys(obj)) { const t = K[k]; if (!t) { w.push(`${pre}${k}: しらない オプション（むし）`); continue; } if (t !== 'a' && obj[k] != null && typeof obj[k] !== ty[t]) { w.push(`${pre}${k}: ${ty[t]} では ない（むし）`); delete obj[k]; } } };
  chk(o, OPT_KEYS, '');
  if (o.prefer != null && !['math', 'kokugo', 'eigo'].includes(o.prefer)) { w.push(`prefer: ${o.prefer} は ない きょうか（むし）`); delete o.prefer; }
  if (o.fx != null && !['pop', 'sparkle', 'gentle'].includes(o.fx)) { w.push(`fx: ${o.fx}（pop に する）`); delete o.fx; }
  if (o.layout != null && !['auto', 'column', 'row'].includes(o.layout)) { w.push(`layout: ${o.layout}（auto に する）`); delete o.layout; }
  if (o.motion != null && !['full', 'reduce'].includes(o.motion)) { w.push(`motion: ${o.motion}（むし）`); delete o.motion; }
  if (o.api && o.api.split('.')[0] !== SEKAI_API.split('.')[0]) w.push(`api: ${o.api} は ${SEKAI_API} と ちがう おおきな はん`);
  if (o.gate) { o.gate = { ...o.gate }; chk(o.gate, GATE_KEYS, 'gate.'); if (o.gate.count != null && !['all', 'self'].includes(o.gate.count)) { w.push(`gate.count: ${o.gate.count}（all に する）`); delete o.gate.count; } const g = o.gate.goal; if (!(g >= 1 && g <= 30)) { w.push(`gate.goal: ${g}（5 に する）`); o.gate.goal = 5; } o.gate.goal = Math.round(o.gate.goal); if (o.gate.start != null && !(o.gate.start >= 0 && o.gate.start < o.gate.goal)) { w.push(`gate.start: ${o.gate.start}（0 に する）`); o.gate.start = 0; } }
  return w;
}
// こたえ 1かい＝イベント1つ（id つき）。あわせる ときは id で かさなりを のぞき、ちがう こたえは りょうほう のこす（なくならない・ふえすぎない）
const EV_DAYS = 60, EV_MAX = 4000;
const evInc = (C, e, sg = 1) => { // イベント1つぶんの かずを たす
  const H = (C.hist[e.d] = C.hist[e.d] || {}); H._all = (H._all || 0) + sg;
  if (e.f) { const v = (H[e.j] = H[e.j] ? [...H[e.j]] : [0, 0]); v[1] += sg; v[0] += e.c * sg; }
  if (e.a) H._assist = (H._assist || 0) + sg;
  const sk = (C.skill[e.s] = C.skill[e.s] || {}); const sj = (C.subj[e.j] = C.subj[e.j] || {});
  if (e.a) sk.assist = (sk.assist || 0) + sg;
  if (e.c) { C.total.ok += sg; C.days[e.d] = (C.days[e.d] || 0) + sg; } else C.total.ng += sg;
  if (e.g) { const f = e.c ? 'ok' : 'ng'; sk[f] = (sk[f] || 0) + sg; sj[f] = (sj[f] || 0) + sg; }
  if (e.r) { sk.rt = (sk.rt || 0) + sg; sk.ro = (sk.ro || 0) + e.c * sg; }
};
const countsOf = (p) => { const C = { total: { ok: (p.total || {}).ok || 0, ng: (p.total || {}).ng || 0 }, days: { ...(p.days || {}) }, hist: JSON.parse(JSON.stringify(p.hist || {})), skill: {}, subj: {} };
  for (const [id, x] of Object.entries(p.skill || {})) C.skill[id] = { ok: x.ok, ng: x.ng, assist: x.assist, rt: x.rt, ro: x.ro };
  for (const [k, x] of Object.entries(p.subj || {})) C.subj[k] = { ok: x.ok, ng: x.ng }; return C; };
export function trimEvents(p) { const ev = p.ev || []; if (!ev.length) return; const lim = dayN(today()) - EV_DAYS; let cut = 0; while (cut < ev.length && (dayN(ev[cut].d) < lim || ev.length - cut > EV_MAX)) cut++; if (cut) { p.evFrom = Math.max(p.evFrom || 0, dayN(ev[cut - 1].d) + 1); p.ev = ev.slice(cut); } }
// ── かぞえる きろくの あわせかた（たんまつ ごとの 「ばけつ」＝G-カウンター）
// それぞれの たんまつは じぶんの ばけつ だけを ふやす。あわせる ときは ばけつ ごとに おおきい ほう、ぜんたいは ばけつの ごうけい。
// → なんど あわせても ふえすぎない・ちがう たんまつの こたえは なくならない・ひづけの ずれや ふるい きろくの けしかたに よらない。
// ふるい かたち（ばけつ なし）の かずは 'legacy' ばけつ 1つに まとめ、おおきい ほうを とる（ふえすぎない かわりに、すくなめに なる ことが ある）。
const HIST_DAYS = 60;
const cWalk = (a, b, f) => { if (Array.isArray(a) || Array.isArray(b)) { const x = a || [], y = b || []; return Array.from({ length: Math.max(x.length, y.length) }, (_, i) => f(x[i] || 0, y[i] || 0)); }
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) { const o = {}; for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { const v = cWalk((a || {})[k], (b || {})[k], f); if (v !== undefined) o[k] = v; } return o; }
  if (a == null && b == null) return undefined; return f(a || 0, b || 0); };
const cSum = (a, b) => cWalk(a, b, (x, y) => x + y), cSub = (a, b) => cWalk(a, b, (x, y) => x - y), cMax = (a, b) => cWalk(a, b, (x, y) => Math.max(x, y));
const cNeg = (c, path = '') => { const out = []; const go = (v, k) => { if (Array.isArray(v)) v.forEach((x, i) => go(x, k + '[' + i + ']')); else if (v && typeof v === 'object') for (const kk of Object.keys(v)) go(v[kk], k + '.' + kk); else if (v < 0) out.push(k + '=' + v); }; go(c, path); return out; };
const cOf = (p) => { const C = { total: { ok: (p.total || {}).ok || 0, ng: (p.total || {}).ng || 0 }, days: { ...(p.days || {}) }, hist: JSON.parse(JSON.stringify(p.hist || {})), skill: {}, subj: {} };
  for (const [id, x] of Object.entries(p.skill || {})) { const o = {}; for (const f of ['ok', 'ng', 'assist', 'rt', 'ro']) if (x[f]) o[f] = x[f]; C.skill[id] = o; }
  for (const [k, x] of Object.entries(p.subj || {})) C.subj[k] = { ok: x.ok || 0, ng: x.ng || 0 }; return C; };
const cPrune = (C) => { const lim = dayN(today()) - HIST_DAYS; for (const f of ['days', 'hist']) for (const d of Object.keys(C[f] || {})) if (dayN(d) < lim) delete C[f][d]; return C; };
const cApply = (p, C) => { p.total = { ok: C.total.ok || 0, ng: C.total.ng || 0 }; p.days = C.days || {}; p.hist = C.hist || {};
  for (const [id, x] of Object.entries(C.skill || {})) { const t = p.skill[id] || (p.skill[id] = { ok: 0, ng: 0 }); for (const f of ['ok', 'ng', 'assist', 'rt', 'ro']) if (x[f] != null || t[f] != null) t[f] = x[f] || 0; }
  for (const [k, x] of Object.entries(C.subj || {})) { const t = p.subj[k] || (p.subj[k] = { r: 0, ok: 0, ng: 0 }); t.ok = x.ok || 0; t.ng = x.ng || 0; } };
function gcInit(p) { if (!p.dev) p.dev = newDev(); if (!p.gc) p.gc = { legacy: cPrune(cOf(p)) }; if (!p.ownC) p.ownC = gcOwnInfer(p); } // ownC＝この たんまつ（いまの ID）で こたえた ぶん だけを べつに かぞえる
// おなじ たんまつから わかれた ばけつ（D と D~xxx）は おなじ れきしを ふくむので「おおきい ほう」、ちがう たんまつは「たす」（にじゅうに しない）
const gRoot = (k) => String(k).split('~')[0];
const gcSum = (B) => { const G = {}; for (const [k, c] of Object.entries(B || {})) { const r = gRoot(k); G[r] = G[r] ? cMax(G[r], c) : JSON.parse(JSON.stringify(c)); } return Object.values(G).reduce((a, c) => cSum(a, c), { total: { ok: 0, ng: 0 } }); };
const gcOthers = (p) => gcSum(p.gc);
const newDev = () => 'd' + Math.random().toString(36).slice(2, 10);
// ふっきゅう・コピーで うけとった きろく：これまでの じぶんの ぶんを「D~x」として こおらせ、あたらしい たんまつIDで つづける（もとの たんまつと IDが かぶらない）
export function sekaiAdopt(p) { if (!p || p.v !== 1) return p; gcInit(p); const own = gcOwn(p); const sk = p.dev + '~' + Math.random().toString(36).slice(2, 6); p.gc[sk] = own; p.snapMeta = { ...(p.snapMeta || {}), [sk]: { seq: p.devSeq || 0, r: rAt(p, p.devSeq || 0) } }; p.ownC = zeroC(); p.dev = newDev(); p.devSeq = 0; p.devChk = {}; p.devRand = ''; p.devRandFrom = 0; p.ownLog = []; return p; }
const zeroC = () => ({ total: { ok: 0, ng: 0 }, days: {}, hist: {}, skill: {}, subj: {} });
const gcOwn = (p) => (p.ownC ? cPrune(JSON.parse(JSON.stringify(p.ownC))) : gcOwnInfer(p));
const gcOwnInfer = (p) => { const oth = {}; for (const [k, c] of Object.entries(p.gc || {})) if (gRoot(k) !== p.dev) oth[k] = c; return cSub(cPrune(cOf(p)), cPrune(JSON.parse(JSON.stringify(gcSum(oth))))); }; // じぶんの グループ（D と D~x）は じぶんの ぶんに ふくまれる // じぶんの ばけつ＝いまの かず − ほかの ばけつ
export function gcBuckets(p) { gcInit(p); return { ...JSON.parse(JSON.stringify(p.gc)), [p.dev]: gcOwn(p) }; }
// せいごう チェック：じぶんの ばけつが マイナスに なって いないか（なって いたら どこかで かぞえ まちがい）
export function sekaiIntegrity(p) { p = p || loadProgress(); const neg = cNeg(gcOwn(p), 'own'); for (const [k, c] of Object.entries(p.gc || {})) neg.push(...cNeg(c, k)); const S = gcSum(gcBuckets(p)); const C = cOf(p); if (!Object.keys(p.snapMeta || {}).some((k) => gRoot(k) === p.dev) && (S.total.ok !== C.total.ok || S.total.ng !== C.total.ng)) neg.push(`ばけつの ごうけい(${S.total.ok}/${S.total.ng}) と ひょうじ(${C.total.ok}/${C.total.ng}) が ちがう`); const sk = Object.values(C.skill).reduce((a, x) => ({ ok: a.ok + (x.ok || 0), ng: a.ng + (x.ng || 0) }), { ok: 0, ng: 0 }), sj = Object.values(C.subj).reduce((a, x) => ({ ok: a.ok + (x.ok || 0), ng: a.ng + (x.ng || 0) }), { ok: 0, ng: 0 }); if (sk.ok !== sj.ok || sk.ng !== sj.ng) neg.push(`たんげんの ごうけい(${sk.ok}/${sk.ng}) と きょうかの ごうけい(${sj.ok}/${sj.ng}) が ちがう`); const lim = dayN(today()) - HIST_DAYS; if (!Object.keys(p.days || {}).some((d) => dayN(d) <= lim + 1) && !(p.gc && p.gc.legacy && p.gc.legacy.total.ok)) { const dsum = Object.values(p.days || {}).reduce((a, n) => a + n, 0); const all = Object.values(p.hist || {}).reduce((a, h) => a + (h._all || 0), 0); if (dsum > C.total.ok) neg.push(`ひごとの せいかい(${dsum}) が ごうけい(${C.total.ok}) より おおい`); if (all > C.total.ok + C.total.ng) neg.push(`ひごとの かいとう(${all}) が ごうけい より おおい`); } return { ok: !neg.length, problems: neg.slice(0, 10), devices: Object.keys(p.gc || {}).length + 1, total: S.total }; }
// ちがう たんまつ・ゲームの きろくを あわせる：すすんだ ほうを とる。ふくしゅうは りょうほう のこし、ひくい だんかいに する（わすれた かも しれない ほうを だいじに）
const gOrd = (g) => (g ? g.g * 100 + g.m : 0);
export function mergeProgress(a, b) { const p = mergeProgress0(a, b); mergeYen(p, a, b); return p; }
const yenOf = (p) => { const y = p.yen || (p.yen = { e: {}, s: [] }); if (!y.mig) { const d = p.dev || 'd0'; y.e[d] = Math.max(y.e[d] || 0, p.coins || 0); y.mig = 1; } return y; };
const yenBal = (p) => { const y = yenOf(p); return Object.values(y.e).reduce((a, b) => a + b, 0) - y.s.reduce((a, b) => a + b.n, 0); };
function earnYen(p, n) { const y = yenOf(p); const d = p.dev || 'd0'; y.e[d] = (y.e[d] || 0) + n; p.coins = yenBal(p); }
function spendYen(p, n, why) { if (!(n > 0) || yenBal(p) < n) return false; yenOf(p).s.push({ id: (p.dev || 'd0') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n, why, at: Date.now() }); p.coins = yenBal(p); return true; }
function mergeYen(p, a, b) { const ya = (a && a.yen) || null, yb = (b && b.yen) || null; if (!ya && !yb) return; const e = {}; for (const y of [ya, yb]) if (y) for (const [k, v] of Object.entries(y.e || {})) e[k] = Math.max(e[k] || 0, v); const s = new Map(); for (const y of [ya, yb]) if (y) for (const x of y.s || []) s.set(x.id, x); p.yen = { e, s: [...s.values()].sort((x, z) => x.at - z.at), mig: 1 }; p.coins = yenBal(p); }
export function sekaiWallet() { const p = loadProgress(); return { yen: yenBal(p), earned: Object.values(yenOf(p).e).reduce((a, b) => a + b, 0), spent: yenOf(p).s.slice() }; }
export function sekaiEarn(n) { if (!(n > 0)) return false; const p = loadProgress(); earnYen(p, Math.round(n)); saveProgress(p); return true; } // ほかの ゲームで もらった えん（おなじ さいふ）
export function sekaiSpend(n, why) { const p = loadProgress(); const ok = spendYen(p, n, why || 'ゲーム'); if (ok) { saveProgress(p); sekaiSync().catch(() => {}); } return ok; } // ほかの ゲームで かいものを したとき
// ───────── かぞくで おなじ きろく（MEGAPAD・スマホ どれでも おなじ。Supabase に まなびコードの かたちで あずける）
const SB_URL = 'https://ihdrkukgeqqktzxmlrzy.supabase.co', SB_KEY = 'sb_publishable_-Q-BiuJ-PqeUG04nOcVnRA_LL9Ri3J3', FAM_KEY = 'sekai-family';
const HOME_FAM = { code: 'sekai-home-k1', pin: '4817' }; // かぞくだけで つかう：せっていなしで どの アプリ・たんまつも おなじ きろくに（ためしの とき・ローカルでは つながない）
const famGet = () => { if (window.__skNoSync || location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname)) return null; try { return JSON.parse(localStorage.getItem(FAM_KEY) || 'null') || HOME_FAM; } catch (e) { return HOME_FAM; } };
const famSet = (f) => { try { if (f) localStorage.setItem(FAM_KEY, JSON.stringify(f)); else localStorage.removeItem(FAM_KEY); } catch (e) {} };
async function sbRpc(fn, args) { const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) }); const t = await r.text(); if (!r.ok) throw new Error(/PIN_NG/.test(t) ? 'PIN_NG' : 'NET'); return t ? JSON.parse(t) : null; }
let syncBusy = null;
export function sekaiSync() { if (syncBusy) return syncBusy; const f = famGet(); if (!f) return Promise.resolve({ ok: false, why: 'none' });
  syncBusy = (async () => { try { for (let tries = 0; tries < 3; tries++) {
    const got = await sbRpc('sekai_load', { p_code: f.code, p_pin: f.pin }); let p = loadProgress();
    if (got && got.data && got.data.code) { const m = importCode(got.data.code, 'merge'); if (m) { p = m; saveProgress(p); } }
    const put = await sbRpc('sekai_save', { p_code: f.code, p_pin: f.pin, p_data: { code: exportCode(p), at: Date.now() }, p_version: got ? got.version : 0 });
    if (put && !put.conflict) { famSet({ ...f, last: Date.now() }); return { ok: true }; } }
    return { ok: false, why: 'busy' }; } catch (e) { return { ok: false, why: e.message }; } finally { setTimeout(() => { syncBusy = null; }, 0); } })(); return syncBusy; }
// ほかの アプリ（ショート×チャレンジ など）の せってい がめんから かぞくコードを つなぐ
export function sekaiFamily(v) { if (v === undefined) { const f = famGet(); return f ? { code: f.code, last: f.last || null } : null; } if (v === null) { famSet(null); return Promise.resolve({ ok: true }); }
  const code = String(v.code || '').trim().toLowerCase(), pin = String(v.pin || '').trim(); if (!/^[a-z0-9_-]{6,}$/.test(code) || !/^\d{4}$/.test(pin)) return Promise.resolve({ ok: false, why: 'FORMAT' });
  famSet({ code, pin }); return sekaiSync().then((r) => { if (!r.ok) famSet(null); return r; }); }
function mergeProgress0(a, b) {
  const p = JSON.parse(JSON.stringify(a)); const mx = (x, y) => Math.max(x || 0, y || 0);
  for (const k of Object.keys(b.subj || {})) { const x = p.subj[k] || (p.subj[k] = { r: 0, ok: 0, ng: 0 }), y = b.subj[k]; x.r = mx(x.r, y.r); x.ok = mx(x.ok, y.ok); x.ng = mx(x.ng, y.ng); }
  for (const [id, y] of Object.entries(b.skill || {})) { const x = p.skill[id]; if (!x) { p.skill[id] = JSON.parse(JSON.stringify(y)); continue; } for (const f of ['ok', 'ng', 'assist', 'rt', 'ro', 'star']) if (x[f] != null || y[f] != null) x[f] = mx(x[f], y[f]); if (/x/.test((y.h || '').slice(-2)) && !/x/.test((x.h || '').slice(-2))) x.h = y.h; /* さいきん まちがえた ほうの れきしを つかう（★を あげすぎない） */ if (x.fmts || y.fmts) x.fmts = [...new Set([...(x.fmts || []), ...(y.fmts || [])])].slice(-6); if (x.days || y.days) x.days = [...new Set([...(x.days || []), ...(y.days || [])])].sort((u, v) => dayN(u) - dayN(v)).slice(-10); }
  p.total = { ok: mx(p.total.ok, (b.total || {}).ok), ng: mx(p.total.ng, (b.total || {}).ng) }; p.coins = mx(p.coins, b.coins); p.best = mx(p.best, b.best);
  p.cards = [...new Set([...(p.cards || []), ...(b.cards || [])])];
  const R = new Map(); for (const it of [...(p.review || []), ...(b.review || [])]) { const k = rkey(it), o = R.get(k); if (!o) { R.set(k, JSON.parse(JSON.stringify(it))); continue; } { const SA = new Set(o.att || []), SB = new Set(it.att || []); const newA = (o.att || []).filter((x) => !SB.has(x)), newB = (it.att || []).filter((x) => !SA.has(x));
      if (!o.att || !it.att) { if (it.stage < o.stage) { o.stage = it.stage; o.day = it.day; o.sess = it.sess; } } /* ふるい かたち：ふくしゅうが ひつような ほう */
      else if (!newB.length) {} /* こちらが あたらしい（あいては ふるい コピー） */
      else if (!newA.length) { o.stage = it.stage; o.day = it.day; o.sess = it.sess; o.att = it.att; } /* あいてが あたらしい */
      else { o.stage = Math.min(o.stage, it.stage); if ([...newA, ...newB].some((x) => x.endsWith('x'))) o.stage = Math.min(o.stage, 1); o.sess = null; o.day = today(); o.att = [...o.att, ...newB].slice(-20); o.conflict = 1; } } /* どうじに といて いた：できた とは しない・すぐ たしかめ */ o.lapses = mx(o.lapses, it.lapses); o.miss = mx(o.miss, it.miss); if (!o.q && it.q) o.q = it.q; if ((it.log || []).length > (o.log || []).length) o.log = it.log; }
  p.review = [...R.values()].slice(-25);
  const open = new Set(p.review.filter((x) => x.stage < 4).map(rkey)); const M = new Map(); for (const m of [...(a.mastered || []), ...(b.mastered || [])]) if (!open.has(rkey(m))) M.set(rkey(m), m); p.mastered = [...M.values()].slice(-30);
  if (gOrd(b.goal) > gOrd(p.goal)) p.goal = b.goal; if (p.pickSubj === undefined && b.pickSubj !== undefined) p.pickSubj = b.pickSubj;
  // かず：たんまつ ごとの ばけつを あわせて ごうけい
  const A = gcBuckets(a), B = b.gcx ? JSON.parse(JSON.stringify(b.gcx)) : b.gc ? { ...JSON.parse(JSON.stringify(b.gc)), [b.dev || 'other']: gcOwn(b) } : { legacy: cPrune(cOf(b)) };
  if (!b.gc && !b.gcx) p.mergeNote = today(); // ふるい かたちを あわせた（すくなめに なる ことが ある）
  delete B[a.dev]; // じぶんの IDの ばけつは じぶんが いちばん ただしい（よそから きた ものは じぶんの むかし か、コピーから わかれた もの）
  const MA = { ...(a.gcm || {}), [a.dev]: { seq: a.devSeq || 0 } }, MBm = { ...(b.gcm || {}), ...(b.dev ? { [b.dev]: { seq: b.devSeq || 0 } } : {}) }; p.gcm = {};
  const MB = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { const ma = MA[k], mb = MBm[k];
    if (A[k] && B[k] && ma && mb && ma.seq !== mb.seq) { MB[k] = cPrune(JSON.parse(JSON.stringify(ma.seq > mb.seq ? A[k] : B[k]))); p.gcm[k] = ma.seq > mb.seq ? ma : mb; } /* おなじ たんまつの ばけつは あたらしい ほうを まるごと（ちがう れきしを まぜない） */
    else { MB[k] = cPrune(cMax(A[k], B[k])); if (ma || mb) p.gcm[k] = (ma && mb ? (ma.seq >= mb.seq ? ma : mb) : ma || mb); } }
  delete p.gcm[a.dev];
  const FB = { ...(b.forkBase || {}), ...(a.forkBase || {}) }; for (const k of Object.keys(FB)) { if ((a.forkBase || {})[k] != null && A[k]) MB[k] = A[k]; else if ((b.forkBase || {})[k] != null && B[k]) MB[k] = B[k]; } p.forkBase = FB; p.forkMine = { ...(a.forkMine || {}) };
  // わかれた あとの こたえは、それぞれの たんまつが じぶんの こたえの きろくから つくった「D>k>なまえ」だけで かぞえる（D の ふるい コピーは つかわない＝にじゅうに ならない。まだ まとめて いない ほうの あたらしい ぶんは、その たんまつが まとめる まで ほりゅう）
  for (const D of Object.keys(FB)) for (const k of Object.keys(MB)) if (k.startsWith(D + '~')) p.gcDead = [...(p.gcDead || []), k]; /* わかれめで まとめた たんまつの ふるい しゃしん（D~x）は、わかれた あとの ぶんが「D>k>…」に はいるので つかわない */
  p.gcDead = [...new Set([...(a.gcDead || []), ...(b.gcDead || []), ...(p.gcDead || [])])]; for (const k of p.gcDead) delete MB[k]; // わかれめで こおらせた きょうつう ぶんは そのまま（あとから きた ふるい コピーで ふやさない）
  p.snapMeta = { ...(b.snapMeta || {}), ...(a.snapMeta || {}) }; const forSum = { ...MB };
  for (const [k, m] of Object.entries(p.snapMeta)) if (forSum[k] && gRoot(k) === a.dev && m && m.r && rAt(a, m.seq) !== m.r) delete forSum[k]; // じぶんと おなじ IDでも ちがう れきしの しゃしん（コピーから わかれた）は たさない
  const SUM = gcSum(forSum); cApply(p, SUM); p.ownC = JSON.parse(JSON.stringify(a.ownC || gcOwn(a))); p.dev = a.dev; p.gc = {}; for (const [k, c] of Object.entries(MB)) if (k !== a.dev) p.gc[k] = c;
  const E = new Map(); for (const e of [...(a.ev || []), ...(b.ev || [])]) E.set(e.i, e); p.ev = [...E.values()].sort((u, v) => u.t - v.t); trimEvents(p);
  if (p.held && p.held.length) p.held = p.held.filter((h) => !Object.keys(p.gc || {}).some((k) => k.startsWith(`${h.dev}>${h.k}>`) && k !== (p.forkMine || {})[h.dev])); // あいてが まとめた ぶんが とどいたら ほりゅう かいしょう
  p.v = SEKAI_DATA; return p;
}
// ── わかれた きろく（おなじ たんまつIDの コピー）を りょうほう のこす
// わかれた ところ（k ばんめ）までの きょうつうの ぶんは 1かい だけ。k より あとの こたえは、それぞれ 1もんずつの きろく（ID）から かぞえなおして べつの ばけつに。
// こたえの きろくが そろって いない ぶんは かぞえず「ほりゅう」（あとで あいての たんまつが まとめた ときに はいる）。
const EVRE = /^(.+)\.(\d+)\.(\w+)$/;
const ownMap = (p) => { const m = { ...(p.devChk || {}) }; for (const e of p.ev || []) { const r = EVRE.exec(e.i); if (r && r[1] === p.dev) m[r[2]] = r[3]; } return m; };
const ownEvents = (p, k) => { if (p.ownLog && p.ownLog.length) return p.ownLog.filter((x) => x[0] > k).map((x) => ({ i: p.dev + '.' + x[0] + '.' + (rAt(p, x[0]) || 'x'), d: x[1], j: x[2], s: x[3], c: x[4] & 1, f: (x[4] >> 1) & 1, r: (x[4] >> 2) & 1, a: (x[4] >> 3) & 1, g: (x[4] >> 4) & 1 }));
  return (p.ev || []).filter((e) => { const r = EVRE.exec(e.i); return r && r[1] === p.dev && +r[2] > k; }).sort((x, y) => +EVRE.exec(x.i)[2] - +EVRE.exec(y.i)[2]); }; // じぶんの こたえは みじかい かたちで 1まんこ まで のこす（わかれめ の けいさん よう）
const unpackOwn = (b) => (b.own || []).map((x) => ({ i: b.dev + '.' + x[0], d: x[1], j: x[2], s: x[3], c: x[4] & 1, f: (x[4] >> 1) & 1, r: (x[4] >> 2) & 1, a: (x[4] >> 3) & 1, g: (x[4] >> 4) & 1 }));
const packOwn = (p) => ownEvents(p, 0).slice(-300).map((e) => { const r = EVRE.exec(e.i); return [r[2] + '.' + r[3], e.d, e.j, e.s, (e.c ? 1 : 0) | (e.f ? 2 : 0) | (e.r ? 4 : 0) | (e.a ? 8 : 0) | (e.g ? 16 : 0)]; });
const divCounts = (evs) => { const C = { total: { ok: 0, ng: 0 }, days: {}, hist: {}, skill: {}, subj: {} }; for (const e of evs) evInc(C, e); return cPrune(C); };
// わかれめ（k）を ぴったり きめる：1もんずつの なまえ（4もじ）の ならびを くらべる。ぴったり わからない ときは まとめない（あいてで さきに まとめて もらう）
const rid10 = () => { let r = ''; const c = window.crypto; if (c && c.getRandomValues) { const a = new Uint32Array(2); c.getRandomValues(a); r = a[0].toString(36) + a[1].toString(36); } else r = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); return (r + '0000000000').slice(0, 10); };
const RW_ = 10; // 1もんの ID（10もじ・36しんすう≒3.6×10^15とおり）
const rAt = (p, q) => { const i = q - 1 - (p.devRandFrom || 0); return p.devRand && i >= 0 && i * RW_ < p.devRand.length ? p.devRand.substr(i * RW_, RW_) : null; };
const rAtB = (b, q) => { const t = b.devRandTail; if (!t) return null; const i = q - 1 - t.from; return i >= 0 && i * RW_ < t.s.length ? t.s.substr(i * RW_, RW_) : null; };
function forkPoint(a, b) { const f = forkInfo(a, b); return f && f.exact ? f.k : null; }
function forkInfo(a, b) { if (!b) return null; if (b.forkBase && b.forkBase[a.dev] != null) return { k: b.forkBase[a.dev], exact: true };
  if (!b.dev || b.dev !== a.dev) return null; const as = a.devSeq || 0, bs = b.devSeq || 0;
  const lo = Math.max((a.devRandFrom || 0), b.devRandTail ? b.devRandTail.from : Infinity) + 1, hi = Math.min(as, bs);
  if (b.devRandTail && a.devRand != null && lo <= hi + 1) { for (let q = lo; q <= hi; q++) { const x = rAt(a, q), y = rAtB(b, q); if (x !== y) return q > lo || lo === 1 ? { k: q - 1, exact: true } : { k: q - 1, exact: false }; } return null; } // さいごまで おなじ＝かたほうが もう かたほうの まえの すがた（わかれて いない）
  const A = ownMap(a), B = { ...(b.devChk || {}) }; for (const x of b.own || []) { const [sq, r] = String(x[0]).split('.'); B[sq] = r; } // ふるい かたち：チェックポイントで けいこく だけ
  let m = Infinity; for (const k of Object.keys(B)) if (A[k] != null && A[k] !== B[k]) m = Math.min(m, +k); if (m === Infinity) return null; let k = 0; for (const s2 of Object.keys(B)) if (A[s2] === B[s2] && +s2 < m) k = Math.max(k, +s2); return { k, exact: false }; }
function resolveFork(a, b, k) { const D = a.dev; const evA = ownEvents(a, k); const full = evA.length === (a.devSeq || 0) - k && (!evA.length || +EVRE.exec(evA[0].i)[2] === k + 1) && !evA.some((e) => e.i.endsWith('.x'));
  const bBase = b.forkBase && b.forkBase[D] === k && b.gcx && b.gcx[D] ? b.gcx[D] : null; // あいてが さきに まとめて いれば、きょうつう ぶんが わかる
  if (!full && !bBase) return { ok: false, reason: 'own-incomplete' }; // ふるい こたえの きろくが のこって いない：あいてで さきに まとめて もらう
  const own = gcOwn(a); const Adiv = full ? divCounts(evA) : cPrune(cWalk(cSub(own, bBase), null, (x) => Math.max(0, x))); const base = full ? cSub(own, Adiv) : JSON.parse(JSON.stringify(bBase));
  const pre = `${D}>${k}>`; const named = !full && b.gcx ? Object.keys(b.gcx).find((x) => x.startsWith(pre) && x !== (b.forkMine || {})[D] && !x.slice(pre.length).startsWith('!')) : null; // あいてが つけた こちらの なまえを つかう
  const randAt = (q) => { const i = q - 1 - (a.devRandFrom || 0); return a.devRand && i >= 0 && i * RW_ < a.devRand.length ? a.devRand.substr(i * RW_, RW_) : null; }; // わかれた つぎの こたえの なまえ（ふたつの たんまつで おなじ なまえに なる）
  const firstA = randAt(k + 1) || (full && evA.length ? EVRE.exec(evA[0].i)[3] : null); const kA = firstA ? `${pre}${firstA}` : (b.forkMine && b.forkMine[D] && named) || `${pre}u${Math.random().toString(36).slice(2, 6)}`;
  if (globalThis.__dbgFork) globalThis.__dbgFork({ D, k, full, own: own.total, Adiv: Adiv.total, base: base.total, bBase: !!bBase, gcKeys: Object.keys(a.gc) }); a.gc[D] = base; a.gc[kA] = Adiv; for (const x of Object.keys(a.gc)) if (x.startsWith(D + '~')) { delete a.gc[x]; a.gcDead = [...new Set([...(a.gcDead || []), x])]; } a.forkBase = { ...(a.forkBase || {}), [D]: k }; a.forkMine = { ...(a.forkMine || {}), [D]: kA }; const nd = newDev(); for (const t of a.txOut || []) if (t.st === 'pending' && (!t.dev || t.dev === D)) t.dev = nd; a.dev = nd; a.ownC = zeroC(); a.devSeq = 0; a.devChk = {}; a.devRand = ''; a.devRandFrom = 0; a.ownLog = [];
  let held = 0; if (b.dev === D) { const evB = unpackOwn(b).filter((e) => +EVRE.exec(e.i)[2] > k).sort((x, y) => +EVRE.exec(x.i)[2] - +EVRE.exec(y.i)[2]); if (evB.length && +EVRE.exec(evB[0].i)[2] === k + 1 && evB.length === (b.devSeq || 0) - k) { const kB = `${D}>${k}>${EVRE.exec(evB[0].i)[3]}`; a.gc[kB] = cMax(a.gc[kB], divCounts(evB)); } else { held = (b.devSeq || 0) - k; a.held = (a.held || []).concat({ dev: D, k, n: held, at: today() }).slice(-10); } } /* あいての かずは まとめる ときに「きょうつう ぶんより おおい ところ」から はいる。こたえの きろくで なまえが きまらない ときは「!」で いったん あずかる */
  return { ok: true, mine: evA.length, theirs: b.dev === D ? (b.devSeq || 0) - k : null, held }; }
// おなじ たんまつIDで ちがう こたえが ある＝コピーから わかれた
function forkOf(a, b) { return forkInfo(a, b) != null; }
function forkOfOld(a, b) { if (!b || !b.dev || b.dev !== a.dev) return false; const mine = { ...(a.devChk || {}) }; for (const e of a.ev || []) { const m = /^(.+)\.(\d+)\.(\w+)$/.exec(e.i); if (m && m[1] === a.dev) mine[m[2]] = m[3]; } for (const [k, v] of Object.entries(b.devChk || {})) if (mine[k] && mine[k] !== v) return true; return false; }
export function importCheck(code) { const m = /^SEKAI1-([A-Za-z0-9+/=]+)-([0-9a-z]{2})$/.exec((code || '').trim()); if (!m || ck(m[1]) !== m[2]) return { ok: false, reason: 'bad' }; let d; try { d = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { return { ok: false, reason: 'bad' }; } if (!d || !d.subj || !d.skill) return { ok: false, reason: 'bad' }; if (d.v && d.v > SEKAI_DATA) return { ok: false, reason: 'new' }; const p = loadProgress(); { const fi = forkInfo(p, d); if (fi && !fi.exact) return { ok: false, reason: 'fork-later', msg: 'この端末と同じ記録から分かれた端末があります。分かれた所をこの端末では特定できないため、もう一方の端末で先に「まとめる」をしてから、そのコードを読みこんでください。' }; const k = fi ? fi.k : null; if (k != null) { const mine = ownEvents(p, k).length, mineAll = (p.devSeq || 0) - k, theirs = d.dev === p.dev ? (d.devSeq || 0) - k : null, theirsKnown = d.dev === p.dev ? unpackOwn(d).filter((e) => +EVRE.exec(e.i)[2] > k).length : null;
      return { ok: false, reason: 'fork', k, mine: mineAll, mineOk: mine === mineAll, theirs, theirsOk: theirs == null || theirsKnown === theirs, local: p.total, incoming: d.total, msg: `この端末と、コードの端末は 同じ記録から分かれています（ブラウザのデータをコピーした等）。分かれる前の ${k}問は共通、分かれた後は この端末 ${mineAll}問・コードの端末 ${theirs == null ? '（相手側でまとめ済み）' : theirs + '問'}です。` }; } } return { ok: true, same: d.dev === p.dev }; }
// フォークの かいけつ：この たんまつの きろくを のこす（いまの IDは こおらせて あたらしい IDへ。あとで あわせても にじゅうに ならない）
export function sekaiHeld() { const p = loadProgress(); return (p.held || []).map((h) => ({ ...h })); }
export function sekaiDropHeld() { const p = loadProgress(); p.heldDropped = (p.heldDropped || []).concat((p.held || []).map((h) => ({ ...h, dropped: today() }))).slice(-10); p.held = []; saveProgress(p); return p; } // あいての たんまつが つかえない とき：その ぶんは かぞえずに つづける
export function sekaiKeepLocal() { const p = loadProgress(); sekaiAdopt(p); saveProgress(p); return p; }
export function importCode(code, mode) { // mode：'merge'（きほん・あわせる）／'replace'（そのまま おきかえる）
  const m = /^SEKAI1-([A-Za-z0-9+/=]+)-([0-9a-z]{2})$/.exec((code || '').trim()); if (!m || ck(m[1]) !== m[2]) return null;
  try { const d = JSON.parse(decodeURIComponent(escape(atob(m[1])))); if (!d || typeof d !== 'object' || (d.v && d.v > SEKAI_DATA) || !d.subj || !d.skill) return null; const p = loadProgress(); if (mode === 'replace') { try { localStorage.setItem(KEY + ':before-replace', JSON.stringify(p)); } catch (e) {} const keepTx = p.txOut; Object.assign(p, d, { v: SEKAI_DATA }); p.txOut = keepTx; delete p.own; p.gc = d.gcx ? JSON.parse(JSON.stringify(d.gcx)) : { legacy: cPrune(cOf(d)) }; delete p.gcx; p.ownC = zeroC(); p.dev = newDev(); p.devSeq = 0; p.devChk = {}; p.devRand = ''; p.devRandFrom = 0; p.ownLog = []; return p; } /* おきかえ＝その きろくを ひきつぐ あたらしい たんまつ */ { const fi = forkInfo(p, d); if (fi && !fi.exact) return null; const k = fi ? fi.k : null; if (k != null) { if (mode !== 'both') return null; const r = resolveFork(p, d, k); if (!r.ok) return null; p.lastFork = { ...r, at: today() }; } } /* おなじ たんまつIDから わかれた きろく：じどうでは あわせない（importCheck で あんない） */ return mergeProgress(p, { ...d, v: SEKAI_DATA }); } catch (e) { return null; }
}

// ───────── こえ
let voiceOn = true;
// こえは 1つずつ じゅんばんに（かさならない・とちゅうで きれない）。がめんが かわる ときは hush() で ぜんぶ とめる
let sayChain = Promise.resolve(), sayGen = 0;
function say(text, opt = {}) { const g = sayGen; const pr = sayChain.then(() => (g === sayGen ? speakNow(text, opt) : null)); sayChain = pr.catch(() => {}); return pr; }
function hush() { sayGen++; sayChain = Promise.resolve(); try { curSrc && curSrc.stop(); } catch (e) {} curSrc = null; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
// ずんだもんの こえ（VOICEVOX:ずんだもん）：voice/index.json に ある ことばは ファイルで、ない ことばは たんまつの こえで
const SEKAI_HOST = 'https://sekai-wo-shiru.vercel.app/'; // え・こえが ない アプリは ここから よむ
let VB = null, VM = null, curSrc = null, speakingN = 0; const VBUF = new Map();
const vNorm = (t) => noEmo(t).replace(/\n/g, '。').replace(/＋/g, 'たす').replace(/−/g, 'ひく').replace(/＝ ？/g, 'は？').replace(/＝/g, 'は').trim();
function vHash(t) { let h = 0x811c9dc5; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
function sekaiVoiceInit(base) { if (VB === base) return; VB = base; VM = null; if (Array.isArray(window.SEKAI_VOICE_LIST)) { VM = new Set(window.SEKAI_VOICE_LIST); return; } try { const away = () => { const hv = SEKAI_HOST + 'voice/'; if (base !== hv && location.protocol !== 'file:') { VB = null; sekaiVoiceInit(hv); } }; fetch(base + 'index.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (Array.isArray(j)) VM = new Set(j); else away(); }).catch(away); } catch (e) {} }
async function vBuf(h) { if (VBUF.has(h)) return VBUF.get(h); const c = ac(); if (!c) return null; const r = await fetch(VB + h + '.mp3'); if (!r.ok) return null; const b = await c.decodeAudioData(await r.arrayBuffer()); VBUF.set(h, b); if (VBUF.size > 80) VBUF.delete(VBUF.keys().next().value); return b; }
function vPrefetch(t) { if (!VM || !t) return; const h = vHash(vNorm(t)); if (VM.has(h) && !VBUF.has(h)) vBuf(h).catch(() => {}); }
const isSpeaking = () => speakingN > 0 || !!(window.speechSynthesis && speechSynthesis.speaking);
// かずが はいる ことばは「ことばの きれはし＋かず」を つなげて よむ（ぜんぶの くみあわせを つくらなくて すむ）
const VTOK = /(\d+(?:じ(?=\d|はん|ちょうど|$|[^ゃゅょ])|ふん|ぷん|こ|まい|ほん|ぽん|ぼん|つ|ばんめ|にん|えん|さつ|ひき|びき|ぴき|わ|だい|ど|かい|ばん|ページ|がつ|にち|ねん|じかん|ぶん)?)/;
const vToks = (t) => t.split(VTOK).map((s) => s.trim()).filter((s) => s && s.replace(/[ 、。]/g, '') && s !== ':');
function speakParts(hs, opt) { return new Promise((res) => { let done = false; const fin = () => { if (!done) { done = true; speakingN = Math.max(0, speakingN - 1); res(); } }; speakingN++; const g = sayGen;
  Promise.all(hs.map((h) => vBuf(h))).then((bs) => { const c = ac(); if (g !== sayGen || !c || bs.some((b) => !b)) { fin(); return; } const rate = opt.fast ? 1.12 : 1; let t = c.currentTime + 0.02, last = null; const srcs = [];
    for (const b of bs) { const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(c.destination); s.start(t); t += b.duration / rate - 0.06; srcs.push(s); last = s; }
    curSrc = { stop: () => srcs.forEach((s) => { try { s.stop(); } catch (e) {} }) }; last.onended = fin; setTimeout(fin, (t - c.currentTime) * 1000 + 800); }).catch(fin); }); }
function enFileH(text, slow) { if (!VM) return null; const k = 'en|' + String(text).trim(); let h = vHash(k + (slow ? '|s' : '')); if (!VM.has(h)) h = vHash(k); return VM.has(h) ? h : null; } // えいごは ネイティブの こえの ファイル（ゆっくりは ゆっくり よんだ ファイル）
function playH(h, text, opt) { return new Promise((res) => { let done = false; const fin = () => { if (!done) { done = true; speakingN = Math.max(0, speakingN - 1); res(); } }; speakingN++; const g = sayGen;
  vBuf(h).then((b) => { const c = ac(); if (g !== sayGen) { fin(); return; } if (!b || !c) { ttsNow(text, opt).then(fin); return; } const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.onended = fin; curSrc = s; s.start(); setTimeout(fin, b.duration * 1000 + 700); }).catch(() => { ttsNow(text, opt).then(fin); }); }); }
function speakNow(text, opt = {}) {
  if (voiceOn && opt.en && VM && location.protocol !== 'file:') { const h = enFileH(text, opt.slow); if (h) return playH(h, text, opt); }
  if (voiceOn && !opt.en && VM && location.protocol !== 'file:') { const tk = vToks(vNorm(text)); if (tk.length > 1 && !VM.has(vHash(vNorm(text))) && tk.every((x) => VM.has(vHash(x)))) return speakParts(tk.map(vHash), opt); }
  if (voiceOn && !opt.en && VM) { const h = vHash(vNorm(text)); if (VM.has(h)) return new Promise((res) => {
    let done = false; const fin = () => { if (!done) { done = true; speakingN = Math.max(0, speakingN - 1); res(); } }; speakingN++; const g = sayGen;
    if (location.protocol === 'file:') { try { const a = new Audio(VB + h + '.mp3'); a.playbackRate = opt.fast ? 1.12 : 1; a.onended = fin; a.onerror = () => ttsNow(text, opt).then(fin); curSrc = { stop: () => a.pause() }; a.play().catch(() => ttsNow(text, opt).then(fin)); setTimeout(fin, 9000); } catch (e) { fin(); } return; } // パソコンで ファイルを ひらいた とき
    vBuf(h).then((b) => { const c = ac(); if (g !== sayGen) { fin(); return; } if (!b || !c) { ttsNow(text, opt).then(fin); return; }
      const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = opt.fast ? 1.12 : 1; s.connect(c.destination); s.onended = fin; curSrc = s; s.start(); setTimeout(fin, (b.duration / s.playbackRate.value) * 1000 + 700); })
      .catch(() => { ttsNow(text, opt).then(fin); }); }); }
  return ttsNow(text, opt);
}
// えいごの こえ：ききとりやすい こえを えらぶ（なければ たんまつの きほん）
let EV = null; function enVoice() { if (EV) return EV; try { const vs = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang)); EV = vs.find((v) => /Samantha|Google US English|Ava|Allison|Susan|Zira|Aria|Jenny/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null; } catch (e) {} return EV; }
function ttsNow(text, opt = {}) {
  return new Promise((res) => {
    if (!voiceOn || !window.speechSynthesis) { setTimeout(res, Math.min(2600, 400 + text.length * 90)); return; }
    try {
      const u = new SpeechSynthesisUtterance(noEmo(text).replace(/\n/g, '。').replace(/＋/g, 'たす').replace(/−/g, 'ひく').replace(/＝ ？/g, 'は？').replace(/＝/g, 'は'));
      u.lang = opt.en ? 'en-US' : 'ja-JP'; u.rate = opt.en ? (opt.slow ? 0.75 : 0.9) : opt.fast ? 1.15 : opt.slow ? 0.85 : 0.95; if (opt.en) { const v = enVoice(); if (v) u.voice = v; } u.pitch = opt.en ? 1 : 1.12;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * (opt.slow ? 380 : 300)); // onend が こない たんまつ むけの ほけん（ながめに）
      speechSynthesis.speak(u);
    } catch (e) { res(); }
  });
}

// ───────── おと
let AC = null; const ac = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (AC && AC.state === 'suspended') AC.resume(); return AC; };
function tone(f, d = 0.12, type = 'sine', v = 0.12, slide = 0, delay = 0) { const c = ac(); if (!c) return; const t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
const SE = {
  ok(combo) { const k = Math.min(combo, 12), b = 523 * Math.pow(1.0595, k); [1, 1.26, 1.5, 2].forEach((m, i) => tone(b * m, 0.16, 'triangle', 0.11, 0, i * 0.065)); if (combo >= 5) tone(b * 3, 0.3, 'sine', 0.05, 0, 0.28); },
  ng() { tone(587, 0.12, 'sine', 0.05); tone(494, 0.18, 'sine', 0.045, 0, 0.11); }, // やわらかい「ぽろん」（しっぱいを つよく しない）
  coin(i = 0) { tone(1568, 0.06, 'square', 0.04, 0, i * 0.05); tone(2093, 0.12, 'square', 0.04, 0, i * 0.05 + 0.05); },
  fever() { [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, 0, i * 0.06)); },
  tap() { tone(700, 0.05, 'sine', 0.08, 200); },
  step() { tone(880, 0.07, 'sine', 0.06, 0); },
  card() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, 0, i * 0.09)); },
  clap() { for (let i = 0; i < 1; i++) { const c = ac(); if (!c) return; const b = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate), a = b.getChannelData(0); for (let j = 0; j < a.length; j++) a[j] = (Math.random() * 2 - 1) * (1 - j / a.length); const s = c.createBufferSource(), g = c.createGain(); g.gain.value = 0.15; s.buffer = b; s.connect(g); g.connect(c.destination); s.start(); } },
};

// ───────── ずの パーツ
const dots = (n, cls = 'a', x = '') => `<span class="sk-dr ${x}">${Array.from({ length: n }, (_, i) => `<i class="sk-d ${cls}" style="--i:${i}"></i>`).join('')}</span>`;
function frame(nA, nB = 0, opt = {}) { // 10の わく。A=オレンジ B=みずいろ、cross=けす
  let h = `<span class="sk-tf ${opt.cls || ''}">`;
  for (let i = 0; i < 10; i++) { const c = i < nA ? 'a' : i < nA + nB ? 'b mv' : 'e'; const x = opt.cross && i >= 10 - opt.cross ? ' x' : ''; const hl = opt.hlEmpty && i >= nA + nB ? ' hle' : ''; h += `<i class="sk-d ${c}${x}${hl}" style="--i:${i}"></i>`; }
  return h + '</span>';
}
const dotsX = (n, cls, cross) => `<span class="sk-dr">${Array.from({ length: n }, (_, i) => `<i class="sk-d ${cls}${i >= n - cross ? ' x' : ''}"></i>`).join('')}</span>`;
const big = (t, cls = '') => `<div class="sk-big ${cls}">${t}</div>`;
const eq = (t) => `<div class="sk-eq">${t}</div>`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// かずの つぶに ばんごうを つけて ならべる
const numDots = (n, cls = 'a', start = 1, x = '') => `<span class="sk-dr ${x}">${Array.from({ length: n }, (_, i) => `<i class="sk-d ${cls}"${start ? ` data-n="${start + i}"` : ''}></i>`).join('')}</span>`;
// せつめいの うごき：つぶを ひとつずつ だしながら こえで かぞえる
function countRun(sel, start = 1) { return async (stage, alive) => {
  const ds = [...stage.querySelectorAll(sel)]; ds.forEach((d) => { d.classList.add('hid'); delete d.dataset.n; });
  for (let i = 0; i < ds.length; i++) { if (!alive()) return; const d = ds[i]; d.classList.remove('hid'); d.classList.add('pop'); d.dataset.n = start + i; SE.step(); await say(String(start + i), { fast: true }); await wait(180); }
}; }
// せつめいの うごき：うしろから ひとつずつ ✕を つけて「1こ、2こ」と とる
function crossRun(n, sel = '.sk-d') { return async (stage, alive) => {
  const ds = [...stage.querySelectorAll(sel)].slice(-n);
  for (let i = 0; i < ds.length; i++) { if (!alive()) return; ds[i].classList.add('x'); SE.tap(); await say(`${i + 1}こ`, { fast: true }); await wait(160); }
}; }
function clock(h, half) {
  const ha = ((h % 12) + (half ? 0.5 : 0)) / 12 * Math.PI * 2, ma = half ? Math.PI : 0; let t = '';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; t += `<text x="${50 + Math.sin(a) * 36}" y="${54 - Math.cos(a) * 36}" font-size="11" text-anchor="middle" fill="#4a3b52" font-weight="800">${i}</text>`; }
  return `<svg class="sk-clk" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fffdf6" stroke="#4a3b52" stroke-width="4"/>${t}<line class="hh" x1="50" y1="50" x2="${50 + Math.sin(ha) * 22}" y2="${50 - Math.cos(ha) * 22}" stroke="#ff6b6b" stroke-width="7" stroke-linecap="round"/><line class="mh" x1="50" y1="50" x2="${50 + Math.sin(ma) * 34}" y2="${50 - Math.cos(ma) * 34}" stroke="#4d8af0" stroke-width="4.5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#4a3b52"/></svg>`;
}
function numChoices(ans, lo, hi, n = 3) { const s = new Set([ans]); const near = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10].filter((v) => v >= lo && v <= hi)); for (const v of near) { if (s.size >= n) break; s.add(v); } let g = 0; while (s.size < n && g++ < 50) s.add(R(lo, hi)); return shuffle([...s]).map(String); }

// ───────── さんすう（スキルの はしご）
const M = [
  { id: 'm_add10', n: '10までの たしざん', q(d) { const a = R(1, 5 + d * 3 | 0), b = R(1, Math.max(1, 10 - a)); return addQ(a, b); } },
  { id: 'm_sub10', n: '10までの ひきざん', q(d) { const c = R(3, 10), b = R(1, c - 1); return subSimpleQ(c, b); } },
  { id: 'm_make10', n: '10の まとまり', q() { const a = R(1, 9); return { text: `${a} と いくつで 10？`, sayQ: `${a} と いくつで じゅう？`, ans: String(10 - a), choices: numChoices(10 - a, 0, 10), viz: frame(a, 0), steps: [
    { h: frame(a, 0, { hlEmpty: true }), s: `${a}こ ならんでるね。あいている ところを かぞえよう` }, { h: frame(a, 10 - a), s: `あいている ところは ${10 - a}こ` }, { h: eq(`${a} と <b>${10 - a}</b> で 10`), s: `${a} と ${10 - a} で じゅう！` }] }; } },
  { id: 'm_teen', n: '10と いくつ', q() { const o = R(1, 9), n = 10 + o; return Math.random() < 0.5 ? { text: `10 と ${o} で いくつ？`, sayQ: `じゅう と ${o} で いくつ？`, ans: String(n), choices: numChoices(n, 1, 20), steps: [
    { h: frame(10) + dots(o, 'b'), s: `10の まとまりが 1つと、ばらが ${o}こ` }, { h: eq(`10 と ${o} で <b>${n}</b>`), s: `じゅうと ${o}で ${n}` }] }
    : { text: `${n} は 10 と いくつ？`, sayQ: `${n} は じゅう と いくつ？`, ans: String(o), choices: numChoices(o, 0, 10), steps: [{ h: big(`<u>1</u><b>${o}</b>`, 'num'), s: `${n}の みぎの すうじを みてね` }, { h: frame(10) + dots(o, 'b'), s: `10と ${o}。こたえは ${o}` }] }; } },
  { id: 'm_carry9', n: 'くりあがり（9＋）', q() { return carryQ(9, R(2, 9)); } },
  { id: 'm_carry87', n: 'くりあがり（8・7＋）', q() { const a = pick([8, 7]); return carryQ(a, R(11 - a, 9)); } },
  { id: 'm_carry', n: 'くりあがりの たしざん', q() { const a = R(3, 9); const b = R(11 - a, 9); const hi = Math.max(a, b), lo = Math.min(a, b); return Math.random() < 0.35 && hi !== lo ? carryQ(hi, lo, true) : carryQ(a, b); } }, // swap＝「ちいさい＋おおきい」の とき、おおきい ほうを 10に する
  { id: 'm_sub1x', n: '十いくつ − いくつ', q() { const o = R(2, 9), b = R(1, o); return { text: `${10 + o} − ${b} ＝ ？`, sayQ: `${10 + o} ひく ${b} は？`, ans: String(10 + o - b), choices: numChoices(10 + o - b, 0, 20), steps: [
    { h: frame(10) + dots(o, 'b'), s: `${10 + o}は 10と ${o}` }, { h: frame(10) + dotsX(o, 'b', b), s: `ばらの ${o}こから ${b}こ とるよ` }, { h: eq(`10 と ${o - b} で <b>${10 + o - b}</b>`), s: `10と ${o - b}で ${10 + o - b}` }] }; } },
  { id: 'm_borrow', n: 'くりさがりの ひきざん', q() { const m = R(3, 9), n = R(11, 9 + m); return borrowQ(n, m); } },
  { id: 'm_three', n: '3つの かず', q() { if (Math.random() < 0.55) { const a = R(2, 7), b = R(1, 3), c = R(1, Math.max(1, 9 - b)); const s = a + b + c; return { text: `${a} ＋ ${b} ＋ ${c} ＝ ？`, sayQ: `${a} たす ${b} たす ${c} は？`, ans: String(s), choices: numChoices(s, 2, 20), steps: [
      { h: eq(`<b>${a} ＋ ${b}</b> ＋ ${c}`), s: `まえから じゅんばんに。まず ${a} たす ${b}` }, { h: eq(`${a + b} ＋ ${c}`), s: `${a} たす ${b} は ${a + b}` }, { h: eq(`${a + b} ＋ ${c} ＝ <b>${s}</b>`), s: `${a + b} たす ${c} は ${s}` }] }; }
    const a = R(12, 18), b = R(1, 4), c = R(1, 4), s = a - b - c; return { text: `${a} − ${b} − ${c} ＝ ？`, sayQ: `${a} ひく ${b} ひく ${c} は？`, ans: String(s), choices: numChoices(s, 0, 18), steps: [
      { h: eq(`<b>${a} − ${b}</b> − ${c}`), s: `まえから じゅんばんに。まず ${a} ひく ${b}` }, { h: eq(`${a - b} − ${c}`), s: `${a - b} に なったね` }, { h: eq(`${a - b} − ${c} ＝ <b>${s}</b>`), s: `${a - b} ひく ${c} は ${s}` }] }; } },
  { id: 'm_clock', n: 'とけい', q() { const h = R(1, 12), half = Math.random() < 0.5, ans = half ? `${h}じはん` : `${h}じ`; const ch = shuffle(uniq([ans, half ? `${h}じ` : `${h}じはん`, `${h % 12 + 1}じ${half ? 'はん' : ''}`, `${(h + 5) % 12 + 1}じ`]).slice(0, 3)); if (!ch.includes(ans)) ch[0] = ans;
    return { text: 'とけいは なんじ？', sayQ: 'とけいは なんじ？', viz: clock(h, half), ans, choices: shuffle(ch), steps: [
      { h: clock(h, half) + '<p class="sk-p"><span style="color:#ff6b6b">●みじかい はり</span>が「なんじ」</p>', s: `みじかい はりを みよう。${half ? `${h}と ${h % 12 + 1}の あいだ` : `${h}を さしてるね`}` },
      { h: clock(h, half) + `<p class="sk-p"><span style="color:#4d8af0">●ながい はり</span>が ${half ? '6 → 「はん」' : '12 → 「ちょうど」'}</p>`, s: half ? 'ながい はりが 6の ときは、はん' : 'ながい はりが 12の ときは、ちょうど' },
      { h: big(ans), s: `こたえは ${ans}` }] }; } },
  { id: 'm_word', n: 'ぶんしょうだい', q() { return wordQ(); } },
  { id: 'm_shape', n: 'かたち', q() { return shapeQ(); } },
  { id: 'm_carry2', n: 'くりあがり（はやとき）', q() { const a = R(5, 9), b = R(11 - a, 9); const q = carryQ(a, b); q.choices = numChoices(a + b, 10, 20, 4); return q; } },
  { id: 'm_borrow2', n: 'くりさがり（はやとき）', q() { const m = R(4, 9), n = R(11, 9 + m); const q = borrowQ(n, m); q.choices = numChoices(n - m, 0, 12, 4); return q; } },
];
function addQ(a, b) { const s = a + b; return { text: `${a} ＋ ${b} ＝ ？`, sayQ: `${a} たす ${b} は？`, ans: String(s), choices: numChoices(s, 0, 10), nums: [a, b, '+'], steps: [
  { h: numDots(a, 'a', 0), s: `まず ${a}こ`, run: countRun('.sk-d.a', 1) },
  { h: numDots(a, 'a', 1) + numDots(b, 'b', 0, 'join'), s: `${b}こ ふえるよ。${a + 1}から つづけて かぞえよう`, run: countRun('.sk-d.b', a + 1) },
  { h: numDots(a, 'a', 1) + numDots(b, 'b', a + 1, 'join') + eq(`${a} ＋ ${b} ＝ <b>${s}</b>`), s: `${a}と ${b}を あわせると ${s}！` }] }; }
function subSimpleQ(c, b) { const s = c - b; return { text: `${c} − ${b} ＝ ？`, sayQ: `${c} ひく ${b} は？`, ans: String(s), choices: numChoices(s, 0, 10), nums: [c, b, '-'], steps: [
  { h: numDots(c, 'a', 0), s: `${c}こ あるよ`, run: countRun('.sk-d.a', 1) },
  { h: numDots(c, 'a', 0), s: `ここから ${b}こ とるよ`, run: crossRun(b) },
  { h: `<span class="sk-dr">${Array.from({ length: c }, (_, i) => `<i class="sk-d a${i >= s ? ' x' : ''}"></i>`).join('')}</span>`, s: 'のこりを かぞえよう', run: countRun('.sk-d.a:not(.x)', 1) },
  { h: eq(`${c} − ${b} ＝ <b>${s}</b>`), s: `${c} ひく ${b} は ${s}` }] }; }
function carryQ(a, b, swap) { // a + b （a に 10を つくる）
  const s = a + b, need = 10 - a, rest = b - need; const A = swap ? b : a, B = swap ? a : b;
  return { text: `${A} ＋ ${B} ＝ ？`, sayQ: `${A} たす ${B} は？`, ans: String(s), choices: numChoices(s, 2, 20), viz: '', nums: [A, B, '+'],
    steps: [
      { h: frame(a) + '<span class="sk-op">＋</span>' + dots(b, 'b'), s: `${swap ? `おおきい ${a}から かんがえよう。` : ''}${a}を 10の わくに いれたよ` },
      { h: frame(a, 0, { hlEmpty: true }) + '<span class="sk-op">＋</span>' + dots(b, 'b'), s: `${a}は、10まで あと いくつ？`, ask: { choices: numChoices(need, 1, 9), ans: String(need), help: countRun('.sk-d.hle', 1), ok: `そう！ あと ${need}で 10` } },
      { h: frame(a) + '<span class="sk-op">＋</span>' + `<span class="sk-split">${dots(need, 'b', 'up')}<em>と</em>${dots(rest, 'b')}</span>`, s: `${b}を ${need}と ${rest}に わけて、${need}こ もってくるよ` },
      { h: frame(a, need, { cls: 'full' }) + '<span class="sk-op">と</span>' + dots(rest, 'b'), s: `ぴったり 10！ のこりは ${rest}` },
      { h: frame(10, 0, { cls: 'full' }) + '<span class="sk-op">と</span>' + dots(rest, 'b') + eq(`10 と ${rest} で <b>${s}</b>`), s: `10と ${rest}で ${s}` }] };
}
function borrowQ(n, m) { const o = n - 10, s = n - m;
  return { text: `${n} − ${m} ＝ ？`, sayQ: `${n} ひく ${m} は？`, ans: String(s), choices: numChoices(s, 0, 18), nums: [n, m, '-'],
    steps: [
      { h: frame(10) + '<span class="sk-op">と</span>' + dots(o, 'b'), s: `${n}は、10と ${o}` },
      { h: frame(10) + '<span class="sk-op">と</span>' + dots(o, 'b'), s: `${o}こから ${m}こは とれないね。だから 10の ほうから とるよ` },
      { h: frame(10) + '<span class="sk-op">と</span>' + dots(o, 'b'), s: `10から ${m}こ、ひとつずつ とるよ`, run: crossRun(m, '.sk-tf .sk-d') },
      { h: frame(10 - m) + '<span class="sk-op">と</span>' + dots(o, 'b') + `<div class="sk-taken"><span>とった ${m}こ</span>${dotsX(m, 'a', m)}</div>`, s: `10こから ${m}こ とったら、のこりは なんこ？`, ask: { choices: numChoices(10 - m, 0, 10), ans: String(10 - m), help: countRun('.sk-tf .sk-d.a', 1), ok: `そう、のこりは ${10 - m}` } },
      { h: numDots(10 - m, 'a', 0) + '<span class="sk-op">と</span>' + numDots(o, 'b', 0), s: `のこった ${10 - m}と、${o}を あわせて かぞえよう`, run: countRun('.sk-d', 1) },
      { h: numDots(10 - m, 'a', 1) + '<span class="sk-op">と</span>' + numDots(o, 'b', 10 - m + 1) + eq(`${10 - m} と ${o} で <b>${s}</b>`), s: `${10 - m}と ${o}で ${s}。${n} ひく ${m} は ${s}` }] };
}
function wordQ() {
  const t = R(0, 3), nm = pick(['ぶた', 'たぬき', 'うさぎ', 'くま', 'ねこ']), ic = { ぶた: '🐷', たぬき: '🦝', うさぎ: '🐰', くま: '🐻', ねこ: '🐱' }[nm];
  if (t === 0) { const a = R(11, 16), b = R(3, 9), s = a - b; return { text: `${ic} ${nm}さんは どんぐりを ${a}こ もっています。${b}こ たべました。のこりは なんこ？`, sayQ: `${nm}さんは どんぐりを ${a}こ もっています。${b}こ たべました。のこりは なんこ？`, ans: String(s), choices: numChoices(s, 0, 18),
    steps: [{ h: `<p class="sk-p">「たべました」「<b class="mark">のこりは</b>」</p>`, s: 'のこりは、と きいてるね。へるから ひきざん' }, { h: eq(`${a} − ${b}`), s: `${a} ひく ${b}` }, ...borrowOrSimple(a, b)] }; }
  if (t === 1) { const a = R(4, 9), b = R(11 - a, 9), s = a + b; return { text: `${ic} ${nm}さんの いえに ともだちが ${a}にん います。あとから ${b}にん きました。<b>ぜんぶで</b> なんにん？`, sayQ: `${nm}さんの いえに ともだちが ${a}にん います。あとから ${b}にん きました。ぜんぶで なんにん？`, ans: String(s), choices: numChoices(s, 2, 20),
    steps: [{ h: `<p class="sk-p">「<b class="mark">ぜんぶで</b>」</p>`, s: 'ぜんぶで、と きいてるね。あわせるから たしざん' }, { h: eq(`${a} ＋ ${b}`), s: `${a} たす ${b}` }, ...carryQ(a, b).steps.slice(2)] }; }
  if (t === 2) { const a = R(5, 9), b = R(2, a - 1), s = a - b; return { text: `🍓 いちごが ${a}こ、🍋 レモンが ${b}こ。<b>どちらが なんこ おおい？</b>`, sayQ: `いちごが ${a}こ、レモンが ${b}こ。どちらが なんこ おおい？`, ans: `いちごが ${s}こ`, choices: shuffle([`いちごが ${s}こ`, `レモンが ${s}こ`, `いちごが ${s + 1}こ`]),
    steps: [{ h: `<div>${'🍓'.repeat(a)}</div><div>${'🍋'.repeat(b)}</div>`, s: 'ならべて くらべよう' }, { h: `<div>${'🍓'.repeat(b)}<b class="mark">${'🍓'.repeat(s)}</b></div><div>${'🍋'.repeat(b)}</div>`, s: `いちごが ${s}こ おおいね` }] }; }
  const a = R(12, 17), b = R(5, 9), s = a - b; return { text: `🪙 コインが ${a}まい。おみせで ${b}まい つかうと、のこりは なんまい？`, sayQ: `コインが ${a}まい。おみせで ${b}まい つかうと、のこりは なんまい？`, ans: String(s), choices: numChoices(s, 0, 18),
    steps: [{ h: `<p class="sk-p">「つかう」→ へる → <b class="mark">ひきざん</b></p>`, s: 'つかうと へるから ひきざん' }, ...borrowOrSimple(a, b)] };
}
function borrowOrSimple(a, b) { return a - 10 >= b ? [{ h: eq(`${a} − ${b} ＝ <b>${a - b}</b>`), s: `こたえは ${a - b}` }] : borrowQ(a, b).steps; }
function shapeQ() {
  const kinds = [['まる', '●', 'circle'], ['さんかく', '▲', 'tri'], ['しかく', '■', 'sq']]; const [nm, , k] = pick(kinds); const n = R(2, 5); const items = shuffle([...Array(n).fill(k), ...Array(R(3, 5)).fill(0).map(() => pick(kinds.filter((x) => x[2] !== k))[2])]);
  const svg = (hl) => `<div class="sk-shapes">${items.map((t, i) => `<i class="sh ${t}${hl && t === k ? ' hl' : ''}" style="--r:${(i * 37) % 30 - 15}deg"></i>`).join('')}</div>`;
  return { text: `${nm}は いくつ ある？`, sayQ: `${nm}は いくつ ある？`, viz: svg(false), ans: String(n), choices: numChoices(n, 1, 9), steps: [{ h: svg(true), s: `${nm}だけ ひからせたよ。ひとつずつ かぞえよう` }, { h: svg(true) + big(String(n)), s: Array.from({ length: n }, (_, i) => i + 1).join('、') + `。${n}こ` }] };
}

// ───────── こくご
const KANA_H = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const KANA_K = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const KATA_W = [['🍰', 'けーき', 'ケーキ', ['ケーモ', 'ゲーキ', 'ケ-キ']], ['🛏️', 'べっど', 'ベッド', ['ペッド', 'ベツド', 'ベット']], ['✏️', 'ぺん', 'ペン', ['ベン', 'ペソ', 'ヘン']], ['⚽', 'ぼーる', 'ボール', ['ポール', 'ボーリ', 'ホール']],
  ['🚀', 'ろけっと', 'ロケット', ['ロケツト', 'ロケッソ', 'ロテット']], ['🚪', 'どあ', 'ドア', ['トア', 'ドマ', 'ドヤ']], ['🍫', 'ちょこれーと', 'チョコレート', ['チヨコレート', 'チョコレト', 'テョコレート']], ['🚌', 'ばす', 'バス', ['パス', 'バヌ', 'ハス']],
  ['🍞', 'ぱん', 'パン', ['バン', 'パソ', 'ハン']], ['🎹', 'ぴあの', 'ピアノ', ['ビアノ', 'ピマノ', 'ヒアノ']], ['🍕', 'ぴざ', 'ピザ', ['ビザ', 'ピサ', 'ヒザ']], ['🦁', 'らいおん', 'ライオン', ['ラインオ', 'ライオソ', 'ヲイオン']],
  ['🐧', 'ぺんぎん', 'ペンギン', ['ベンギン', 'ペンキン', 'ペソギン']], ['🍈', 'めろん', 'メロン', ['メロソ', 'ノロン', 'メコン']], ['🚒', 'しょうぼうしゃ', 'ショウボウシャ', ['シヨウボウシヤ', 'ショウポウシャ', 'ツョウボウシャ']], ['🧃', 'じゅーす', 'ジュース', ['ジユース', 'シュース', 'ジュース-']]];
const KANJI = [['山', 'やま', '⛰️', 'やまの かたちから できた じ'], ['川', 'かわ', '🏞️', 'みずが ながれる ようす'], ['木', 'き', '🌳', 'えだと ねが ある き'], ['日', 'ひ', '☀️', 'おひさまの かたち'], ['月', 'つき', '🌙', 'みかづきの かたち'],
  ['火', 'ひ', '🔥', 'もえる ほのお'], ['水', 'みず', '💧', 'ながれる みず'], ['田', 'た', '🌾', 'たんぼを うえから みた かたち'], ['口', 'くち', '👄', 'ひらいた くち'], ['目', 'め', '👁️', 'めを たてに した かたち'],
  ['手', 'て', '✋', 'ゆびを ひらいた て'], ['足', 'あし', '🦶', 'ひざから したの あし'], ['雨', 'あめ', '🌧️', 'くもから あめつぶが おちる'], ['花', 'はな', '🌸', 'くさかんむりは しょくぶつの しるし'], ['石', 'いし', '🪨', 'がけの したの いし'],
  ['空', 'そら', '🌤️', 'ひろい そら'], ['犬', 'いぬ', '🐕', 'いぬが よこを むいた かたち'], ['虫', 'むし', '🐛', 'むしの かたち'], ['人', 'ひと', '🧍', 'ひとが たって いる よこがお'], ['森', 'もり', '🌲', '木が 3つで もり'],
  ['一', 'いち', '1️⃣', 'よこぼう 1ぽんで 1'], ['二', 'に', '2️⃣', 'よこぼう 2ほんで 2'], ['三', 'さん', '3️⃣', 'よこぼう 3ぼんで 3'], ['大きい', 'おおきい', '🙆', '「大」は ひとが てを おおきく ひろげた かたち'], ['小さい', 'ちいさい', '🤏', '「小」は ちいさな つぶの かたち'],
  ['上', 'うえ', '⬆️', 'せんの うえに しるし'], ['下', 'した', '⬇️', 'せんの したに しるし'], ['子', 'こ', '👶', 'あかちゃんの かたち'], ['女', 'おんな', '🙎‍♀️', 'すわった ひとの かたち'], ['耳', 'みみ', '👂', 'みみの かたち']];
const KS = { 山: '山に のぼりました。', 川: '川で あそびました。', 木: '木に とりが とまって いる。', 日: '日が のぼりました。', 月: 'よぞらに 月が でて いる。', 火: 'ろうそくの 火を けしました。', 水: '水を のみました。', 口: '口を おおきく あけました。', 目: '目を とじました。', 手: '手を あらいました。', 足: 'うさぎは 足が はやい。', 雨: '雨が ふって きた。', 花: '花が さきました。', 石: '石を ひろいました。', 空: '空が あおい。', 犬: '犬が はしって いる。', 虫: '虫を みつけた。', 森: '森の なかを あるく。', 耳: '耳を すませた。', 子: 'ねこの 子が うまれた。', 上: 'つくえの 上に ほんが ある。', 下: 'いすの 下に ねこが いる。' };
const PART = [['わたし（ ）がっこうへ いきます。', 'は', 'わ', 'だれの おはなしかを いう「わ」は「は」と かく'], ['ぼく（ ）えを かきます。', 'は', 'わ', 'だれが するかの「わ」は「は」と かく'], ['えほん（ ）よみます。', 'を', 'お', 'なにを するかの「お」は「を」と かく'],
  ['おにぎり（ ）たべます。', 'を', 'お', 'なにを たべるかの「お」は「を」'], ['こうえん（ ）いきます。', 'へ', 'え', 'いく ばしょの「え」は「へ」と かく'], ['うみ（ ）でかけます。', 'へ', 'え', 'むかう ばしょの「え」は「へ」'], ['ねこ（ ）ねて います。', 'が', 'を', 'だれが しているかは「が」']];
const SMALL = [['✉️', 'きって', ['きて', 'きつて'], ['き', 'っ', 'て']], ['🚂', 'きしゃ', ['きしや', 'きさ'], ['き', 'しゃ']], ['🐠', 'きんぎょ', ['きんぎよ', 'きんご'], ['き', 'ん', 'ぎょ']], ['🚃', 'でんしゃ', ['でんしや', 'でしゃ'], ['で', 'ん', 'しゃ']],
  ['🥛', 'ぎゅうにゅう', ['ぎゆうにゆう', 'ぎうにう'], ['ぎゅ', 'う', 'にゅ', 'う']], ['🛌', 'ねっこ', ['ねこ', 'ねつこ'], null], ['🧸', 'にんぎょう', ['にんぎよう', 'にんごう'], ['に', 'ん', 'ぎょ', 'う']], ['📷', 'しゃしん', ['しやしん', 'さしん'], ['しゃ', 'し', 'ん']],
  ['🏃', 'がっこう', ['がこう', 'がつこう'], ['が', 'っ', 'こ', 'う']], ['🦗', 'ばった', ['ばた', 'ばつた'], ['ば', 'っ', 'た']]].filter((x) => x[3]);
const LONG = [['🍦', 'こおり', ['こうり', 'こーり']], ['🗻', 'おおきい', ['おうきい', 'おーきい']], ['👨', 'おとうさん', ['おとおさん', 'おとーさん']], ['👩', 'おかあさん', ['おかさん', 'おかーさん']], ['👧', 'おねえさん', ['おねいさん', 'おねーさん']], ['🎈', 'ふうせん', ['ふせん', 'ふーせん']]];
const READ = [
  { t: 'バスは、おおぜいの ひとを のせて はこびます。トラックは、おもい にもつを はこびます。', q: 'にもつを はこぶのは？', a: 'トラック', ng: ['バス', 'じてんしゃ'], k: 1 },
  { t: 'バスは、おおぜいの ひとを のせて はこびます。トラックは、おもい にもつを はこびます。', q: 'ひとを のせて はこぶのは？', a: 'バス', ng: ['トラック', 'ふね'], k: 0 },
  { t: 'たぬきの ぽんたは、もりで あかい きのみを みつけました。いもうとに あげると、にっこり わらいました。', q: 'ぽんたが みつけたのは？', a: 'あかい きのみ', ng: ['あおい いし', 'きいろい はな'], k: 0 },
  { t: 'たぬきの ぽんたは、もりで あかい きのみを みつけました。いもうとに あげると、にっこり わらいました。', q: 'わらったのは だれ？', a: 'いもうと', ng: ['ぽんた', 'おかあさん'], k: 1 },
  { t: 'クレーンしゃは、おもい ものを つりあげる しごとを します。そのために、じょうぶな うでが のびたり うごいたり します。', q: 'クレーンしゃの しごとは？', a: 'おもい ものを つりあげる', ng: ['ひとを はこぶ', 'みちを はく'], k: 0 },
  { t: 'ぶたの ぶうこは、あさ はやく おきました。かおを あらって、パンを たべて、がっこうへ いきました。', q: 'ぶうこが たべたのは？', a: 'パン', ng: ['ごはん', 'りんご'], k: 1 },
  { t: 'うさぎの みみは ながいです。とおくの おとも よく きこえます。', q: 'みみが ながいと どうなる？', a: 'とおくの おとが きこえる', ng: ['はやく はしれる', 'よく みえる'], k: 1 },
];
const K = [
  { id: 'k_kana1', n: 'カタカナ 1もじ', q(d) { const i = R(0, Math.min(KANA_H.length - 1, 10 + d * 30 | 0)); const h = KANA_H[i], k = KANA_K[i]; const ng = shuffle([...KANA_K].filter((c) => c !== k)).slice(0, 2); return { text: `「${h}」の カタカナは？`, sayQ: `${h} の カタカナは どれ？`, ans: k, choices: shuffle([k, ...ng]), bigC: true, steps: [{ h: big(`${h} → <b>${k}</b>`), s: `${h} は カタカナで こう かくよ` }, { h: big(`<b>${k}</b>`), s: 'かたちを よく みてね' }] }; } },
  { id: 'k_kata', n: 'カタカナの ことば', q(d) { const [e, h, k, ng] = pick(KATA_W); const ch = shuffle([k, ...shuffle(ng).slice(0, d > 0.5 ? 3 : 2)]);
    const diff = [...k].map((c, i) => { const w = ng[0][i]; return c !== w ? `<b class="mark">${c}</b>` : c; }).join('');
    return { text: `${e}「${h}」を カタカナで かくと？`, sayQ: `${h} を カタカナで かくと どれ？`, ans: k, choices: ch, bigC: true, steps: [{ h: big(e) + big(`${[...h].join(' ')}`), s: `${h}。ひとつずつ カタカナに しよう` }, { h: big(`${[...h].map((c) => `<span>${c}</span>`).join('')}<br>↓<br>${k}`), s: `${h} は ${k}` }, { h: big(diff), s: '「゛」と「゜」、ちいさい「ッ」、のばす「ー」に きを つけようね' }] }; } },
  { id: 'k_small', n: 'ちいさい「っ」「ゃゅょ」', q() { const [e, a, ng, beats] = pick(SMALL); return { text: `${e} ただしい かきかたは？`, sayQ: 'ただしい かきかたは どれ？', ans: a, choices: shuffle([a, ...ng]), bigC: true,
    ng: (c) => ({ h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(c)}</div><div class="okp"><span class="lab">ただしくは</span>${big(a)}</div></div>`, s: /[ゃゅょっ]/.test(c) === /[ゃゅょっ]/.test(a) && c.length === a.length ? 'くらべると、かきかたが ちがう ところが あるね' : /[ゃゅょっ]/.test(a) ? `${c} では、ちいさい じが ないね` : `${c} は、よみかたが ちがうね` }),
    steps: [{ h: big(e) + `<div class="sk-beats">${beats.map((b) => `<i>${b}</i>`).join('')}</div>`, s: `てを たたいて よもう。${beats.join('、')}` }, { h: `<div class="sk-beats on">${beats.map((b) => `<i>${b}<em>👏</em></i>`).join('')}</div>`, s: `${beats.length}かい てを たたくね。${a.includes('っ') ? 'つまる ところは ちいさい「っ」' : /[ゃゅょ]/.test(a) ? 'ちいさい じは まえの じと いっしょに よむ' : `${a}には ちいさい じは ないよ`}` }, ...(() => { const cm = [...new Set(beats.filter((b) => b.length === 2 && /[ゃゅょ]/.test(b[1])))]; return cm.length ? [{ h: cm.map((b) => eq(`${b[0]} ＋ <span class="smk">${b[1]}</span> → <b>${b}</b>`)).join(''), s: cm.map((b) => `${b[0]}と ちいさい ${b[1]}で ${b}`).join('。') }] : []; })(), { h: big(a), s: `ただしくは ${a}` }] }; } },
  { id: 'k_long', n: 'のばす おと', q() { const [e, a, ng] = pick(LONG); return { text: `${e} ただしい かきかたは？`, sayQ: 'ただしい かきかたは どれ？', ans: a, choices: shuffle([a, ...ng]), bigC: true, steps: [{ h: big(e) + big(a), s: `${a}。ひらがなでは「ー」を つかわないよ` }, { h: big(a), s: a.includes('おお') ? 'おお と かく ことばは とくべつ。おおきい、こおり、とおい' : 'まえの おとと おなじ なかまの じで のばすよ' }] }; } },
  { id: 'k_part', n: '「は」「を」「へ」', q() { const [s, a, b, why] = pick(PART); return { text: `（ ）に はいる じは？\n${s}`, sayQ: s.replace('（ ）', 'まる'), ans: a, choices: shuffle([a, b]), bigC: true,
    steps: [{ h: `<p class="sk-p">${s.replace('（ ）', `<b class="mark">${a === 'は' ? 'わ' : a === 'を' ? 'お' : a === 'へ' ? 'え' : a}</b>`)}</p>`, s: 'よむ ときの おとは こうだね' }, { h: `<p class="sk-p">${s.replace('（ ）', `<b class="mark big">${a}</b>`)}</p>`, s: `でも かく ときは ${a}。${why}` }] }; } },
  { id: 'k_kanjiR', n: 'かんじを よむ', q(d) { const L = KANJI.slice(0, 12 + (d * 18 | 0)); const ctx = d >= 0.5 ? L.filter((x) => KS[x[0]]) : []; const [k, y, e, why] = pick(ctx.length ? ctx : L); const ng = shuffle(uniq(L.filter((x) => x[1] !== y).map((x) => x[1]))).slice(0, 2);
    // はじめは「え＋かんじ」、なれたら みじかい ぶんの なかで よむ
    const inS = ctx.length > 0; const viz = inS ? `<div class="sk-p">${KS[k].replace(k, `<b class="mark big">${k}</b>`)}</div>` : `<div class="sk-morph">${big(e, 'emos')}${big(k, 'kj')}</div>`;
    return { text: inS ? 'いろの ついた かんじの よみかたは？' : 'この かんじの よみかたは？', sayQ: inS ? 'いろの ついた かんじの よみかたは？' : 'この かんじの よみかたは？', viz, ans: y, choices: shuffle([y, ...ng]),
    ng: (c) => { const f = KANJI.find((x) => x[1] === c); return f ? { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ よみ</span>${big(c)}<span class="ar">は</span>${big(f[0], 'kjs')}</div><div class="okp"><span class="lab">この かんじ</span>${big(k, 'kjs')}<span class="ar">は</span>${big(y)}</div></div>`, s: `${c} と よむのは「${f[0]}」。この かんじは ${y} だよ` } : null; },
    steps: [{ h: `<div class="sk-morph">${big(e, 'emo')}<span>→</span>${big(k, 'kj')}</div>`, s: `${why}。だから ${k} は ${y}` }, ...(inS ? [{ h: `<div class="sk-p">${KS[k].replace(k, `<b class="mark big">${k}</b>`)}</div>`, s: KS[k].replace(k, y) }] : [])] }; } },
  { id: 'k_kanjiW', n: 'かんじを えらぶ', q(d) { const L = KANJI.slice(0, 15 + (d * 15 | 0)); const [k, y, e, why] = pick(L); const ng = shuffle(L.filter((x) => x[0] !== k && x[1] !== y)).slice(0, 2).map((x) => x[0]); return { text: `「${y}」を かんじで かくと？`, sayQ: `${y} を かんじで かくと どれ？`, ans: k, choices: shuffle([k, ...ng]), bigC: true, kanji: true,
    steps: [{ h: `<div class="sk-morph">${big(e, 'emo')}<span>→</span>${big(k, 'kj')}</div>`, s: `${y}は、${why}。だから ${k}` }] }; } },
  { id: 'k_read', n: 'おはなしを よむ', q() { const r = pick(READ); const sents = r.t.split('。').filter(Boolean); return { text: `<div class="sk-story">${r.t}</div>${r.q}`, sayQ: r.t + '。' + r.q, ans: r.a, choices: shuffle([r.a, ...r.ng]),
    steps: [{ h: `<div class="sk-story">${sents.map((s, i) => `<span class="${i === r.k ? 'mark' : ''}">${s}。</span>`).join('')}</div>`, s: `この ぶんを よく よもう。${sents[r.k]}` }, { h: big(r.a), s: `こたえは ${r.a}` }] }; } },
];

// ───────── えいご
const EN = [['🍎', 'apple', 'りんご'], ['🐶', 'dog', 'いぬ'], ['🐱', 'cat', 'ねこ'], ['🍌', 'banana', 'バナナ'], ['🚗', 'car', 'くるま'], ['🏠', 'house', 'いえ'], ['🌸', 'flower', 'はな'], ['🐟', 'fish', 'さかな'], ['☀️', 'sun', 'たいよう'], ['🌙', 'moon', 'つき'],
  ['⭐', 'star', 'ほし'], ['🐻', 'bear', 'くま'], ['🐰', 'rabbit', 'うさぎ'], ['🐦', 'bird', 'とり'], ['🌳', 'tree', 'き'], ['📕', 'book', 'ほん'], ['🥚', 'egg', 'たまご'], ['🍓', 'strawberry', 'いちご'], ['🐷', 'pig', 'ぶた'], ['🐘', 'elephant', 'ぞう'], ['🐯', 'tiger', 'とら'], ['🐵', 'monkey', 'さる']];
const COL = [['red', 'あか', '#ff5b5b'], ['blue', 'あお', '#4d8af0'], ['yellow', 'きいろ', '#ffd23a'], ['green', 'みどり', '#3fbf6a'], ['pink', 'ピンク', '#ff9cc2'], ['black', 'くろ', '#333'], ['white', 'しろ', '#fff'], ['orange', 'オレンジ', '#ff9a3c'], ['purple', 'むらさき', '#a56be8'], ['brown', 'ちゃいろ', '#9a6a43']];
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const GREET = [['おはよう', 'Good morning', '🌅'], ['こんにちは', 'Hello', '👋'], ['ありがとう', 'Thank you', '🙏'], ['さようなら', 'Goodbye', '🫡'], ['おやすみ', 'Good night', '🌙'], ['ごめんなさい', 'Sorry', '🙇']];
const BODY = [['👁️', 'eye', 'め'], ['👂', 'ear', 'みみ'], ['👃', 'nose', 'はな'], ['👄', 'mouth', 'くち'], ['✋', 'hand', 'て'], ['🦶', 'foot', 'あし'], ['🙂', 'face', 'かお']];
const enSteps = (e, w, j) => [{ h: big(e, 'emo'), s: `${j}は えいごで…`, en: null }, { h: big(`<span class="sk-spell">${[...w].map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i>`).join('')}</span>`), s: w, en: true }, { h: big(e, 'emo') + big(w), s: `${j} は ${w}`, mix: w }];
const E = [
  { id: 'e_col', n: 'いろ', q() { const [w, j, c] = pick(COL); const ng = shuffle(COL.filter((x) => x[0] !== w)).slice(0, 2).map((x) => x[0]); return { text: 'この いろは えいごで？', sayQ: 'この いろは えいごで なんていう？', viz: `<div class="sk-col" style="background:${c}"></div>`, ans: w, choices: shuffle([w, ...ng]), en: true, steps: enSteps(`<span class="sk-col" style="background:${c}"></span>`, w, j) }; } },
  { id: 'e_num', n: 'かず 1〜10', q() { const n = R(1, 10); const ng = shuffle([...Array(10).keys()].map((x) => x + 1).filter((x) => x !== n)).slice(0, 2).map((x) => NUM[x]); return { text: `${'🍬'.repeat(n)}<br>いくつ？ えいごで`, sayQ: 'いくつ？ えいごで こたえよう', ans: NUM[n], choices: shuffle([NUM[n], ...ng]), en: true,
    steps: [{ h: `<div class="sk-count">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}">🍬<b>${NUM[i + 1]}</b></i>`).join('')}</div>`, s: Array.from({ length: n }, (_, i) => NUM[i + 1]).join(', '), en: true }, { h: big(`${n} = ${NUM[n]}`), s: `${n}は ${NUM[n]}`, mix: NUM[n] }] }; } },
  { id: 'e_ani', n: 'ことば（どうぶつ・もの）', q(d) { const L = EN.slice(0, 10 + (d * 12 | 0)); const [e, w, j] = pick(L); if (Math.random() < 0.5) { const ng = shuffle(L.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[1]); return { text: 'えいごで なんて いう？', sayQ: `${j} は えいごで なんていう？`, viz: big(e, 'emo'), ans: w, choices: shuffle([w, ...ng]), en: true, steps: enSteps(e, w, j) }; }
    const ng = shuffle(L.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[0]); return { text: `「${w}」は どれ？`, sayQ: w, sayEn: true, ans: e, choices: shuffle([e, ...ng]), emoji: true, steps: enSteps(e, w, j) }; } },
  { id: 'e_body', n: 'からだ', q() { const [e, w, j] = pick(BODY); const ng = shuffle(BODY.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[1]); return { text: `${e} は えいごで？`, sayQ: `${j} は えいごで？`, ans: w, choices: shuffle([w, ...ng]), en: true, steps: enSteps(e, w, j) }; } },
  { id: 'e_greet', n: 'あいさつ', q() { const [j, e, ic] = pick(GREET); const ng = shuffle(GREET.filter((x) => x[1] !== e)).slice(0, 2).map((x) => x[1]); return { text: `${ic}「${j}」は えいごで？`, sayQ: `${j} は えいごで？`, ans: e, choices: shuffle([e, ...ng]), en: true, steps: enSteps(ic, e, j), ng: (c) => { const f = GREET.find((x) => x[1] === c); return f ? { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(f[2], 'emos')}${big(c)}</div></div>`, s: `${c} は ${f[0]} だよ`, seq: [[ 'えらんだのは' ], [c, 2], [`${f[0]} の ことだよ`]] } : null; } }; } },
  { id: 'e_first', n: 'さいしょの もじ', q() { const [e, w, j] = pick(EN); const L = w[0]; const ng = shuffle('abcdefghmnoprstw'.split('').filter((c) => c !== L)).slice(0, 2); return { text: `${e} <b>_</b>${w.slice(1)}<br>さいしょの もじは？`, sayQ: w, sayEn: true, ans: L, choices: shuffle([L, ...ng]), en: true, bigC: true,
    steps: [{ h: big(e, 'emo'), s: w, en: true }, { h: big(`<b class="mark">${L}</b>${w.slice(1)}`), s: `${w}。さいしょは ${L.toUpperCase()}`, mix: w }] }; } },
];

// ───────── 2026-11-04 アストラ レビュー①：こくご・えいごの ふやし／いれかえ（「どうして ちがうか」が わかる せつめい）
const SIM = 'うかきけこせにへもやりろ';
const kanaH = (k) => KANA_H[KANA_K.indexOf(k)];
const pairH = (a, b, cls, lab) => `<div class="${cls}">${lab ? `<span class="lab">${lab}</span>` : ''}${big(a)}<span class="ar">→</span>${big(b)}</div>`;
const SHUGO = [['🐱', 'ねこ', 'さかな', 'たべました', 'たべた'], ['🐶', 'いぬ', 'ボール', 'おいかけました', 'おいかけた'], ['🐰', 'うさぎ', 'にんじん', 'かじりました', 'かじった'], ['🐻', 'くま', 'はちみつ', 'なめました', 'なめた'], ['🐷', 'ぶた', 'おにぎり', 'たべました', 'たべた'], ['🐵', 'さる', 'バナナ', 'むきました', 'むいた'], ['🐘', 'ぞう', 'りんご', 'はこびました', 'はこんだ']];
const BUN = [['わたし', 'は', 'こうえん', 'へ', 'いきます'], ['ぼく', 'は', 'がっこう', 'へ', 'いきます'], ['いもうと', 'は', 'うみ', 'へ', 'でかけます'], ['わたし', 'は', 'ほん', 'を', 'よみます'], ['ぼく', 'は', 'えほん', 'を', 'かいます'], ['ねこ', 'は', 'ミルク', 'を', 'のみます']];
const JUN = [[['🌱', 'たねを まく'], ['🌿', 'めが でる'], ['🌸', 'はなが さく']], [['🥚', 'たまご'], ['🐣', 'ひよこ'], ['🐔', 'にわとり']], [['⏰', 'あさ おきる'], ['🪥', 'はを みがく'], ['🎒', 'がっこうへ いく']], [['🧼', 'てを あらう'], ['🙏', 'いただきます'], ['🍚', 'ごはんを たべる']],
  [['👕', 'ふくを ぬぐ'], ['🛁', 'おふろに はいる'], ['🛌', 'ねる']], [['🐛', 'あおむし'], ['🫘', 'さなぎ'], ['🦋', 'ちょう']], [['☁️', 'くもが でる'], ['🌧️', 'あめが ふる'], ['🌈', 'にじが でる']]];
const KIMO = [ // lv1＝きもちの ことばが ある／lv2＝ようすから わかる／lv3＝おはなしの ながれから わかる
  { lv: 1, t: 'ぽんたは かけっこで 1ばんに なりました。「やったあ！」と とびはねました。', k: '「やったあ！」', a: ['😄', 'うれしい'], ng: [['😢', 'かなしい'], ['😱', 'こわい']] },
  { lv: 1, t: 'ころんで ひざを すりむきました。うさこは「えーん」と なきました。', k: '「えーん」と なきました', a: ['😢', 'かなしい'], ng: [['😄', 'うれしい'], ['😠', 'おこっている']] },
  { lv: 1, t: 'おおきな いぬが ほえました。ねこみは「こわいよう」と ママに しがみつきました。', k: '「こわいよう」', a: ['😱', 'こわい'], ng: [['😆', 'たのしい'], ['😪', 'ねむい']] },
  { lv: 2, t: 'ぶうこは だいじな ぼうしを なくしました。したを むいて、なみだが ぽろぽろ こぼれました。', k: 'なみだが ぽろぽろ', a: ['😢', 'かなしい'], ng: [['😄', 'うれしい'], ['😪', 'ねむい']] },
  { lv: 2, t: 'くらい みちで「ガサッ」と おとが しました。うさこは からだが ぶるぶる ふるえました。', k: 'からだが ぶるぶる ふるえました', a: ['😱', 'こわい'], ng: [['😆', 'たのしい'], ['😄', 'うれしい']] },
  { lv: 2, t: 'ともだちに だまって おもちゃを とられました。くまたは かおを まっかに して、あしを どんどん ならしました。', k: 'かおを まっかに して、あしを どんどん', a: ['😠', 'おこっている'], ng: [['😄', 'うれしい'], ['😪', 'ねむい']] },
  { lv: 2, t: 'はこを あけたら、おおきな ケーキが でて きました。ねこみは めを まるく して、くちを ぽかんと あけました。', k: 'めを まるく して、くちを ぽかんと', a: ['😲', 'びっくり'], ng: [['😢', 'かなしい'], ['😱', 'こわい']] },
  { lv: 2, t: 'おばあちゃんから てがみが とどきました。いぬおは にこにこ しながら、なんども よみました。', k: 'にこにこ しながら、なんども よみました', a: ['😄', 'うれしい'], ng: [['😠', 'おこっている'], ['😱', 'こわい']] },
  { lv: 3, t: 'あしたは えんそくです。ぽんたは リュックを なんども あけて、おやつを かぞえました。「はやく あしたに ならないかな」。', k: '「はやく あしたに ならないかな」', a: ['🤩', 'たのしみ'], ng: [['😢', 'かなしい'], ['😠', 'おこっている']], w: 'かなしい なら「はやく」とは いわないね' },
  { lv: 3, t: 'まいにち いっしょに あそんだ ともだちが、とおくへ ひっこしました。うさこは ともだちの いえの まえで、ずっと まどを みあげて いました。', k: 'ずっと まどを みあげて', a: ['🥺', 'さびしい'], ng: [['😆', 'たのしい'], ['😲', 'びっくり']], w: 'ともだちが いなくなって、ずっと みている。たのしい ようすでは ないね' },
  { lv: 3, t: 'たんじょうびに もらった ペンダントを、ねこみは まいばん そっと なでてから ねます。だれにも さわらせません。', k: 'まいばん そっと なでて', a: ['🥰', 'だいじに おもっている'], ng: [['😠', 'おこっている'], ['😱', 'こわい']], w: 'おこっていたら、そっと なでたり しないね' }];

const JUN2 = [['🌱', ['まず、たねを まきました。', 'それから、まいにち みずを やりました。', 'さいごに、はなが さきました。'], ['まず', 'それから', 'さいごに']],
  ['🍳', ['まず、たまごを わりました。', 'つぎに、フライパンで やきました。', 'さいごに、おさらに のせました。'], ['まず', 'つぎに', 'さいごに']],
  ['🎨', ['はじめに、えのぐを だしました。', 'つぎに、えを かきました。', 'おわったら、ふでを あらいました。'], ['はじめに', 'つぎに', 'おわったら']],
  ['🛁', ['まず、ふくを ぬぎました。', 'それから、おふろに はいりました。', 'さいごに、パジャマを きました。'], ['まず', 'それから', 'さいごに']],
  ['⛄', ['はじめに、ゆきを まるめました。', 'つぎに、ごろごろ ころがしました。', 'さいごに、あたまを のせました。'], ['はじめに', 'つぎに', 'さいごに']],
  ['🪁', ['まず、たこに いとを つけました。', 'それから、かぜに むかって はしりました。', 'すると、たこが たかく あがりました。'], ['まず', 'それから', 'すると']]];
const sent = (parts) => `<div class="sk-sent">${parts.map(([w, lab]) => lab ? `<span class="w mark">${w}<em>${lab}</em></span>` : `<span class="w">${w}</span>`).join('')}</div>`;
const NEWK = [
  { id: 'k_kana1', n: 'カタカナ 1もじ', q(d) { const i = R(0, Math.min(KANA_H.length - 1, 10 + d * 30 | 0)); const h = KANA_H[i], k = KANA_K[i]; const ng = shuffle([...KANA_K].filter((c) => c !== k)).slice(0, 2); return { text: `「${h}」の カタカナは？`, sayQ: `${h} の カタカナは どれ？`, ans: k, choices: shuffle([k, ...ng]), bigC: true,
    ng: (c) => { const ch = kanaH(c); return ch ? { h: `<div class="sk-pair">${pairH(ch, c, 'ngp', 'えらんだ のは')}${pairH(h, k, 'okp', 'こたえ')}</div>`, s: `えらんだ ${c} は「${ch}」の カタカナ。「${h}」の カタカナは ${k} だよ` } : null; },
    steps: [{ h: `<div class="sk-sbs">${big(h)}<span class="ar">と</span>${big(`<b>${k}</b>`)}</div>`, s: SIM.includes(h) ? `${h} と ${k}。かたちが にているね` : `${h} と ${k}。かたちを よく みて おぼえよう` }] }; } },
  { id: 'k_kata', n: 'カタカナの ことば', q(d) { const [e, h, k, ng] = pick(KATA_W); const ch = shuffle([k, ...shuffle(ng).slice(0, d > 0.5 ? 3 : 2)]);
    return { text: `${e}「${h}」を カタカナで かくと？`, sayQ: `${h} を カタカナで かくと どれ？`, ans: k, choices: ch, bigC: true,
      ng: (c) => { const A = [...k], C = [...c]; const mk = (arr, other, cls) => arr.map((x, i) => x !== other[i] ? `<b class="${cls}">${x}</b>` : x).join(''); return { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(mk(C, A, 'ngm'))}</div><div class="okp"><span class="lab">ただしくは</span>${big(mk(A, C, 'mark'))}</div></div>`, s: 'くらべると、いろが ついた ところが ちがうね' }; },
      steps: [{ h: big(e) + big(`${[...h].map((c) => `<span>${c}</span>`).join('')}<br>↓<br>${k}`), s: `${h} を カタカナで かくと ${k}` }, { h: big(k), s: '「゛」と「゜」、ちいさい「ッ」、のばす「ー」に きを つけようね' }] }; } },
  { id: 'k_kanjiR', n: 'かんじを よむ', q(d) { const L = KANJI.slice(0, 12 + (d * 18 | 0)); const ctx = d >= 0.5 ? L.filter((x) => KS[x[0]]) : []; const [k, y, e, why] = pick(ctx.length ? ctx : L); const ng = shuffle(uniq(L.filter((x) => x[1] !== y).map((x) => x[1]))).slice(0, 2);
    // はじめは「え＋かんじ」、なれたら みじかい ぶんの なかで よむ
    const inS = ctx.length > 0; const viz = inS ? `<div class="sk-p">${KS[k].replace(k, `<b class="mark big">${k}</b>`)}</div>` : `<div class="sk-morph">${big(e, 'emos')}${big(k, 'kj')}</div>`;
    return { text: inS ? 'いろの ついた かんじの よみかたは？' : 'この かんじの よみかたは？', sayQ: inS ? 'いろの ついた かんじの よみかたは？' : 'この かんじの よみかたは？', viz, ans: y, choices: shuffle([y, ...ng]),
    ng: (c) => { const f = KANJI.find((x) => x[1] === c); return f ? { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ よみ</span>${big(c)}<span class="ar">は</span>${big(f[0], 'kjs')}</div><div class="okp"><span class="lab">この かんじ</span>${big(k, 'kjs')}<span class="ar">は</span>${big(y)}</div></div>`, s: `${c} と よむのは「${f[0]}」。この かんじは ${y} だよ` } : null; },
    steps: [{ h: `<div class="sk-morph">${big(e, 'emo')}<span>→</span>${big(k, 'kj')}</div>`, s: `${why}。だから ${k} は ${y}` }, ...(inS ? [{ h: `<div class="sk-p">${KS[k].replace(k, `<b class="mark big">${k}</b>`)}</div>`, s: KS[k].replace(k, y) }] : [])] }; } },
  { id: 'k_kanjiW', n: 'かんじを えらぶ', q(d) { const L = KANJI.slice(0, 15 + (d * 15 | 0)); const [k, y, e, why] = pick(L); const ng = shuffle(L.filter((x) => x[0] !== k && x[1] !== y)).slice(0, 2).map((x) => x[0]); return { text: `「${y}」を かんじで かくと？`, sayQ: `${y} を かんじで かくと どれ？`, ans: k, choices: shuffle([k, ...ng]), bigC: true, kanji: true,
    ng: (c) => { const f = KANJI.find((x) => x[0] === c); return f ? { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(c, 'kjs')}<span class="ar">=</span>${big(f[2], 'emos')}${big(f[1])}</div><div class="okp"><span class="lab">こたえ</span>${big(k, 'kjs')}<span class="ar">=</span>${big(e, 'emos')}${big(y)}</div></div>`, s: `${c} は ${f[1]}。${y} は ${k}` } : null; },
    steps: [{ h: `<div class="sk-morph">${big(e, 'emo')}<span>→</span>${big(k, 'kj')}</div>`, s: `${y}は、${why}。だから ${k}` }] }; } },
  { id: 'k_shugo', n: 'だれが・なにを', q() { const [e, s, o, v, pl] = pick(SHUGO); const other = pick(SHUGO.filter((x) => x[1] !== s)); const who = Math.random() < 0.5;
    const line = `${e}「${s}が ${o}を ${v}。」`;
    return who ? { text: `${line}\n${pl}のは だれ？`, sayQ: `${s}が ${o}を ${v}。${pl}のは だれ？`, ans: s, choices: shuffle([s, o, other[1]]),
      steps: [{ h: sent([[`${s}が`, 'だれが'], [`${o}を`], [v, 'どうした']]), s: '「が」の まえが「だれが」' }, { h: big(e, 'emo') + big(s), s: `${pl}のは ${s}` }] }
    : { text: `${line}\n${s}は なにを ${pl}？`, sayQ: `${s}が ${o}を ${v}。${s}は なにを ${pl}？`, ans: o, choices: shuffle([o, s, other[2]]),
      steps: [{ h: sent([[`${s}が`], [`${o}を`, 'なにを'], [v, 'どうした']]), s: '「を」の まえが「なにを」' }, { h: big(o), s: `${s}が ${pl}のは ${o}` }] }; } },
  { id: 'k_bun', n: 'ぶんを つくる', q() { const [a, p1, b, p2, v] = pick(BUN); const ok = `${a}${p1} ${b}${p2} ${v}。`; const w1 = `${a}${p2} ${b}${p1} ${v}。`; const w2 = `${a}わ ${b}${p2 === 'へ' ? 'え' : 'お'} ${v}。`;
    return { text: 'ただしい ぶんは どれ？', sayQ: 'ただしい ぶんは どれ？', ans: ok, choices: shuffle([ok, w1, w2]), txt: true,
      ng: (c) => ({ h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ ぶん</span><div class="sk-p">${c}</div></div></div>`, s: c === w1 ? `これだと ${b}が ${v} みたいに なっちゃうね` : '「わ」「え」「お」の かきかたが ちがうね' }),
      steps: [{ h: sent([[`${a}${p1}`, 'だれが'], [`${b}${p2}`, p2 === 'へ' ? 'どこへ' : 'なにを'], [v, 'どうする']]), s: `だれが → ${p2 === 'へ' ? 'どこへ' : 'なにを'} → どうする` }, { h: `<div class="sk-p">${a}<b class="mark big">${p1}</b> ${b}<b class="mark big">${p2}</b> ${v}。</div>`, s: `よむ ときは「${p1 === 'は' ? 'わ' : p1}」「${p2 === 'へ' ? 'え' : 'お'}」、かく ときは「${p1}」「${p2}」` }] }; } },
  { id: 'k_jun', n: 'じゅんばんの ことば', q() { const [e, ss, cue] = pick(JUN2); const first = Math.random() < 0.6; const ans = first ? ss[0] : ss[2]; const mix = shuffle(ss);
    const hl = (t, i) => t.replace(cue[i], `<b class="mark">${cue[i]}</b>`);
    return { text: `${e} おはなしの じゅんばんを かんがえよう\n<b>${first ? 'いちばん はじめ' : 'いちばん さいご'}</b>は どれ？`, sayQ: `おはなしの じゅんばんを かんがえよう。${first ? 'いちばん はじめ' : 'いちばん さいご'}は どれ？`, ans, choices: mix, txt: true,
      steps: [{ h: `<div class="sk-story">${ss.map((t, i) => `<div>${i + 1}. ${hl(t, i)}</div>`).join('')}</div>`, s: `「${cue[0]}」「${cue[1]}」「${cue[2]}」が じゅんばんの あいず` }, { h: `<div class="sk-story"><div>${hl(ans, first ? 0 : 2)}</div></div>`, s: `「${first ? cue[0] : cue[2]}」が ついているから、${first ? 'いちばん はじめ' : 'いちばん さいご'}` }] }; } },
  { id: 'k_kimochi', n: 'きもちを よむ', q(d) { const lv = d < 0.34 ? 1 : d < 0.67 ? 2 : 3; const r = pick(KIMO.filter((x) => x.lv === lv)); const tier = ['', 'きもちの ことばを さがそう', 'ようすから かんがえよう', 'おはなしから かんがえよう'][lv]; const op = (x) => `${x[0]} ${x[1]}`; return { text: `<div class="sk-story">${r.t}</div>${lv === 3 ? 'いちばん ちかい きもちは？' : 'どんな きもち？'}`, sayQ: `${r.t} どんな きもち？`, ans: op(r.a), choices: shuffle([op(r.a), ...r.ng.map(op)]), txt: true,
      steps: [{ h: `<div class="sk-story">${r.t.replace(r.k, `<span class="mark">${r.k}</span>`)}</div>`, s: `${tier}。ヒントは「${r.k}」` }, { h: `<div class="sk-p"><span class="mark">${r.k}</span></div><div class="sk-p">↓</div>` + big(r.a[0], 'emo') + big(r.a[1]), s: `${r.k}、だから ${r.a[1]} きもち` }, ...(r.w ? [{ h: `<div class="sk-p">${r.ng.map((x) => `${x[0]} ${x[1]}`).join('　')} は？</div>`, s: r.w }] : [])] }; } },
];
const COLE = [['red', 'あか', '🟥'], ['blue', 'あお', '🟦'], ['yellow', 'きいろ', '🟨'], ['green', 'みどり', '🟩'], ['pink', 'ピンク', '🩷'], ['black', 'くろ', '⬛'], ['white', 'しろ', '⬜'], ['orange', 'オレンジ', '🟧'], ['purple', 'むらさき', '🟪'], ['brown', 'ちゃいろ', '🟫']];
const ED = {}; [...EN, ...BODY].forEach(([e, w, j]) => { ED[w] = [e, j]; ED[e] = [w, j]; }); COLE.forEach(([w, j, e]) => { ED[w] = [e, j]; ED[e] = [w, j]; });
// まちがえた ときの くらべる がめん：えらんだ え と こたえ の え を おなじ データから つくる（もじは ださない）
const enPairOld = (cE, cW, cJ, aE, aW, aJ) => ({ h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(cE, 'emos')}<span class="ar">${cJ}</span></div><div class="okp"><span class="lab">きこえたのは</span>${big(aE, 'emos')}<span class="ar">${aJ}</span></div></div>`, s: `えらんだのは ${cJ}。きこえたのは ${aJ}`, seq: [[`えらんだのは ${cJ}。`], [cW, 1], ['きこえたのは'], [aW, 1], [`${aJ}だよ`]], chk: [cE, aE] });
// まちがえた とき：えらんだ え は ちいさく みじかく、こたえの え を おおきく＋ただしい おとを 2かい
const enPair = (cE, cW, cJ, aE, aW, aJ) => ({ h: `<div class="sk-enok"><div class="ngs"><span>えらんだ のは</span>${big(cE, 'emos')}</div><div class="okb">${big(aE, 'emo')}<div class="sk-ear">👂</div></div></div>`, s: 'もういちど きいて みよう 🔊', seq: [['もういちど きいて みよう'], [aW, 1]], chk: [cE, aE] });
const enNgFor = (ans) => (c) => { const x = ED[c], a = ED[ans]; if (!x || !a) return null; return enPair(c, x[0], x[1], ans, a[0], a[1]); };
const enEar = (e, w, j) => [{ h: big(e, 'emo') + big(j), s: `${j}は えいごで 🔊`, seq: [[`${j}は えいごで`], [w, 1]] }, { h: big(e, 'emo') + '<div class="sk-ear">👂</div>', s: 'いっしょに いってみよう', seq: [['いっしょに いってみよう'], [w, 1]] }]; // はじめは もじを ださない（おとと え だけ）
const listen = (id, n, list, mk) => ({ id, n, q(d) { const L = list.slice(0, Math.max(6, Math.min(list.length, 8 + (d * 10 | 0)))); const [e, w, j] = mk(pick(L)); const ng = shuffle(L.map(mk).filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[0]);
  return { text: '🔊 きいて えらんでね', sayQ: w, sayEn: true, viz: '<div class="sk-ear">👂</div>', ans: e, choices: shuffle([e, ...ng]), emoji: true, ng: enNgFor(e), steps: enEar(e, w, j) }; } });
const NEWE = [
  listen('e_listen', 'きいて えらぶ', EN, (x) => x),
  listen('e_col', 'いろ（きく）', COLE, ([w, j, e]) => [e, w, j]),
  { id: 'e_num', n: 'かず 1〜10（きく）', q() { const n = R(1, 10); return { text: '🔊 きいて えらんでね', sayQ: NUM[n], sayEn: true, viz: '<div class="sk-ear">👂</div>', ans: String(n), choices: numChoices(n, 1, 10), bigC: true, ng: (c) => ({ h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(c)}</div></div>`, s: `えらんだ ${c} は ${NUM[+c]}`, seq: [[`えらんだ ${c} は`], [NUM[+c], 2]] }),
    steps: [{ h: '<div class="sk-p" style="flex-basis:100%;text-align:center">きこえた かずだけ かぞえよう</div>' + `<div class="sk-count">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}">🍬<small class="cn">${i + 1}</small></i>`).join('')}</div>`, s: Array.from({ length: n }, (_, i) => NUM[i + 1]).join(', '), en: true }, { h: big(String(n)) + '<div class="sk-ear">👂</div>', s: `${n}は ${NUM[n]}`, mix: NUM[n] }] }; } },
  listen('e_body', 'からだ（きく）', BODY, (x) => x),
];
const MEM = new Set(['k_hira', 'k_kana1', 'k_kata', 'k_small', 'k_long', 'k_kanjiR', 'k_kanjiW', 'e_listen', 'e_col', 'e_body', 'e_greet', 'e_ani', 'e_first']);
const order = (ids, ...lists) => ids.map((id) => { for (const l of lists) { const f = l.find((s) => s.id === id); if (f) return f; } throw new Error(id); });
// ───────── がくねん・つき（小1 の きょうかしょの ながれ に あわせた じゅんばん。m＝がっこうの つき）
const MON = { m_count: 4, m_cmp: 5, m_bunkai: 5, k_hira: 4, k_hira2: 5, m_make10: 6, m_add10: 6, m_sub10: 7, m_teen: 9, m_sub1x: 9, m_clock: 9, m_three: 10, m_carry9: 11, m_carry87: 11, m_carry: 11, m_shape: 12, m_borrow: 1, m_word: 2, m_carry2: 3, m_borrow2: 3,
  k_small: 6, k_long: 6, k_part: 7, k_kana1: 9, k_shugo: 9, k_read: 9, k_kata: 10, k_kanjiR: 10, k_bun: 11, k_kanjiW: 12, k_jun: 1, k_kimochi: 2 };
const YEN_PER_Q = 5, CARD_YEN = 50;
const MON_EMO = { 4: '🌸', 5: '🎏', 6: '☔', 7: '🌻', 8: '🍉', 9: '🎑', 10: '🍂', 11: '🍁', 12: '⛄', 1: '🎍', 2: '❄️', 3: '🌷' };
const SCHOOL = [4, 5, 6, 7, 9, 10, 11, 12, 1, 2, 3]; const ordM = (m) => (m + 8) % 12; // 4がつ＝0 … 3がつ＝11
const NEWM = [
  { id: 'm_count', n: 'かずを かぞえる', q() { const n = R(1, 10); const [em, nm] = pick([['🍎', 'りんご'], ['🐟', 'さかな'], ['⭐', 'ほし'], ['🌷', 'はな'], ['🚗', 'くるま']]); return { text: `${nm}は いくつ？`, sayQ: `${nm}は いくつ？`, viz: `<div class="sk-objs">${em.repeat(n)}</div>`, ans: String(n), choices: numChoices(n, 1, 10), bigC: true, steps: [{ h: `<div class="sk-objs">${[...Array(n)].map(() => `<i class="sk-d emo-d">${em}</i>`).join('')}</div>`, s: 'ひとつずつ ゆびで さして かぞえよう', run: countRun('.sk-d', 1) }, { h: big(String(n)), s: `${n}こ` }] }; } },
  { id: 'm_cmp', n: 'どちらが おおきい', q() { let a = R(1, 10), b = R(1, 10); while (b === a) b = R(1, 10); return { text: 'おおきい かずは どっち？', sayQ: `${a} と ${b}、おおきい かずは どっち？`, viz: `<div class="sk-cmp"><div><b>${a}</b>${numDots(a, 'a', 0)}</div><div><b>${b}</b>${numDots(b, 'b', 0)}</div></div>`, ans: String(Math.max(a, b)), choices: shuffle([String(a), String(b)]), bigC: true, steps: [{ h: `<div class="sk-cmp"><div>${numDots(a, 'a', 1)}<b>${a}</b></div><div>${numDots(b, 'b', 1)}<b>${b}</b></div></div>`, s: 'つぶを ならべて くらべよう。ながい ほうが おおきい' }, { h: big(String(Math.max(a, b))), s: `${Math.max(a, b)}の ほうが おおきい` }] }; } },
  { id: 'm_bunkai', n: 'いくつと いくつ', q() { const n = R(3, 9), a = R(1, n - 1); return { text: `${n}は ${a}と いくつ？`, sayQ: `${n}は ${a}と いくつ？`, viz: numDots(n, 'a', 0), ans: String(n - a), choices: numChoices(n - a, 0, 9), bigC: true, steps: [{ h: numDots(a, 'a', 1) + numDots(n - a, 'b', 0, 'join'), s: `${n}こを ${a}こと のこりに わけるよ`, run: countRun('.sk-d.b', 1) }, { h: eq(`${n}は ${a}と <b>${n - a}</b>`), s: `${n}は ${a}と ${n - a}` }] }; } },
];
const HIRA_W = [['🐶', 'いぬ'], ['🐱', 'ねこ'], ['🐟', 'さかな'], ['🍎', 'りんご'], ['🚗', 'くるま'], ['🌸', 'はな'], ['🐻', 'くま'], ['🦊', 'きつね'], ['🍓', 'いちご'], ['🐢', 'かめ'], ['🍉', 'すいか'], ['🐘', 'ぞう'], ['🥚', 'たまご'], ['🦉', 'ふくろう']];
const NEWK2 = [
  { id: 'k_hira', n: 'ひらがな（はじめの じ）', q() { const [e, w] = pick(HIRA_W); const h = w[0]; const ng = shuffle(KANA_H.split('').filter((c) => c !== h)).slice(0, 2); return { text: `${e}「<span class="sk-blank"></span>${w.slice(1)}」\nはじめの じは どれ？`, sayQ: `${w}。はじめの じは どれ？`, ans: h, choices: shuffle([h, ...ng]), bigC: true, mem: true, steps: [{ h: big(e, 'emo') + `<div class="sk-beats on">${[...w].map((c) => `<i>${c}</i>`).join('')}</div>`, s: `${[...w].join('、')}。はじめは「${h}」` }] }; } },
  { id: 'k_hira2', n: 'ことばを よむ', q() { const [e, w] = pick(HIRA_W); const ng = shuffle(HIRA_W.filter((x) => x[1] !== w)).slice(0, 2).map((x) => x[0]); return { text: `「${w}」は どれ？`, sayQ: 'よんで、えを えらんでね', ans: e, choices: shuffle([e, ...ng]), emoji: true, ng: (c) => { const f = HIRA_W.find((x) => x[0] === c); return f ? { h: `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${big(c, 'emos')}<span class="ar">${f[1]}</span></div><div class="okp"><span class="lab">こたえ</span>${big(e, 'emos')}<span class="ar">${w}</span></div></div>`, s: `えらんだのは ${f[1]}。「${w}」は こっち` } : null; }, steps: [{ h: `<div class="sk-beats on">${[...w].map((c) => `<i>${c}</i>`).join('')}</div>` + big(e, 'emo'), s: `${[...w].join('、')}。${w}` }] }; } },
];

// ───────── イラスト（ChatGPTで かいた えほんふうの え。ill/<key>.webp）。えもじは がめんに ださない
const ILL_JA = {"kaguya": "たけの なかの おひめさま", "apple": "赤いりんご", "mikan": "みかん", "persimmon": "かき", "chestnut": "くり", "strawberry": "いちご", "banana": "バナナ", "candy": "あめ", "cookie": "まるいクッキー", "choco": "板チョコ", "senbei": "しょうゆせんべい", "cake": "ショートケーキ", "egg": "たまご", "fish": "さかな", "carrot": "にんじん", "tomato": "トマト", "peach": "もも", "lemon": "レモン", "melon": "メロン", "watermelon": "すいか", "bread": "しょくパン", "rice": "ごはん", "pizza": "ピザ1きれ", "hamburger": "ハンバーガー", "ramen": "ラーメン", "pancake": "ホットケーキ", "icecream": "ソフトクリーム", "cheese": "チーズ", "milk": "ぎゅうにゅう", "juice": "パックのジュース", "honey": "はちみつのつぼ", "beans": "おまめ", "fried_egg": "めだまやき", "cucumber": "きゅうり", "pumpkin": "かぼちゃ", "natto": "なっとう", "sausage": "ソーセージ", "gum": "板ガム1パック", "onigiri": "おにぎり", "dango": "おだんご", "juice_can": "かんジュース", "pudding": "プリン", "donut": "ドーナツ", "corn": "とうもろこし", "grapes": "ぶどう", "cherry": "さくらんぼ", "pear": "なし", "onion": "たまねぎ", "potato": "じゃがいも", "dog": "いぬ", "cat": "ねこ", "rabbit": "うさぎ", "bear": "くま", "pig": "ぶた", "lion": "ライオン", "elephant": "ぞう", "tiger": "とら", "monkey": "さる", "fox": "きつね", "raccoon": "たぬき", "panda": "パンダ", "koala": "コアラ", "giraffe": "きりん", "penguin": "ペンギン", "frog": "かえる", "bird": "ことり", "owl": "ふくろう", "chicken": "にわとり", "chick": "ひよこ", "parrot": "オウム", "sparrow": "すずめ", "pigeon": "はと", "plover": "コチドリ", "butterfly": "ちょう", "bee": "みつばち", "snail": "かたつむり", "caterpillar": "いもむし", "cricket": "こおろぎ", "mouse": "ねずみ", "white_dog": "まっ白な子犬", "anteater": "オオアリクイ", "tropical_fish": "ねったいぎょ", "octopus": "たこ", "shark": "サメ", "dolphin": "イルカ", "turtle": "うみがめ", "tuna": "まぐろ", "jellyfish": "にじいろの くらげ", "spiny_lobster": "いせえび", "eel": "うなぎ", "sea_anemone": "ももいろの いそぎんちゃく", "sauropod": "くびのながい きょうりゅう", "trex": "ティラノサウルス", "wave": "うみの なみ", "sailboat": "ヨット", "kyakusen": "大きな白い きゃくせん", "ferry": "フェリー", "gyosen": "ぎょせん", "fireboat": "しょうぼうてい", "car": "くるま", "bus": "バス", "taxi": "タクシー", "fire_engine": "しょうぼうしゃ", "dump_truck": "ダンプカー", "train": "でんしゃ", "steam_train": "きかんしゃ", "monorail": "モノレール", "airplane": "ひこうき", "helicopter": "ヘリコプター", "rocket": "ロケット", "ufo": "UFO", "bicycle": "じてんしゃ", "elevator": "エレベーター", "sun": "おひさま", "moon": "みかづき", "cloud": "くも", "rain_cloud": "あめぐも", "sun_cloud": "はれときどきくもり", "snowflake": "ゆきの けっしょう", "lightning": "かみなり", "rainbow": "にじ", "droplet": "みずの しずく", "tree": "き", "pine": "き", "palm": "やしの き", "mountain": "やま", "fuji": "ふじさん", "snow_mountain": "ゆきやま", "volcano": "かざん", "sakura": "さくらの花", "koinobori": "こいのぼり", "umbrella": "あまがさと雨", "sunflower": "ひまわり", "tsukimi": "おつきみ", "fallen_leaf": "おちば", "maple": "もみじ", "snowman": "ゆきだるま", "kadomatsu": "かどまつ", "tulip": "チューリップ", "xmas_tree": "クリスマスツリー", "rice_plant": "いね", "herb": "はっぱ", "rock": "いし", "desert": "さばく", "park": "やまと かわの けしき", "eye": "め", "ear": "みみ", "nose": "はな", "mouth": "くち", "hand": "て", "foot": "あし", "pinch": "ゆびで つまむ て", "wave_hand": "てを ふる", "clap": "はくしゅ", "baby": "あかちゃん", "boy": "おとこのこ", "girl": "おんなのこ", "man": "おとうさん", "woman": "おかあさん", "child": "こども", "runner": "はしる こども", "face_happy": "うれしい かお", "face_sad": "かなしくて なく かお", "face_scared": "こわがる かお", "face_angry": "おこった かお", "face_fun": "たのしくて わらう かお", "face_sleepy": "ねむい かお", "face_surprised": "びっくりした かお", "face_excited": "わくわくする かお", "face_lonely": "さびしい かお", "face_love": "だいじに おもう やさしい かお", "face_smile": "にっこり", "face_calm": "すこし ほほえむ", "face_mask": "マスクの かお", "bow": "おじぎする こども", "pray": "てを あわせる", "ok_pose": "あたまの うえで まる", "bed": "ベッド", "sleeping": "ふとんで ねる こ", "bath": "おふろ", "door": "ドア", "sofa": "ソファ", "tv": "テレビ", "camera": "カメラ", "toothbrush": "はぶらし", "soap": "せっけん", "spoon": "スプーン", "fork_knife": "フォークと ナイフ", "kitchen_knife": "ほうちょう", "tshirt": "Tシャツ", "necktie": "ネクタイ", "ribbon": "リボン", "yarn": "けいとだま", "pencil": "えんぴつ", "notebook": "ノート", "book": "えほん", "eraser": "けしゴム", "crayon": "クレヨン", "palette": "えのぐの パレット", "envelope": "ふうとう", "stamp": "きって", "ball": "サッカーボール", "balloon": "ふうせん", "teddy": "くまの ぬいぐるみ", "kite": "たこあげの たこ", "piano": "ピアノの けんばん", "telescope": "ぼうえんきょう", "gem": "ほうせき", "planet": "どせい", "ball_red": "たまいれの 赤い玉", "ball_white": "たまいれの 白い玉", "card": "うらむきの カード", "bottle_pin": "ペットボトルの ボウリングピン", "chair": "こどもの いす", "robot": "ちいさな ロボット", "stick": "かぞえぼう 1ぽん", "stick10": "かぞえぼう 10ぽんの たば", "stick100": "10ぽんの たばを 10こ まとめた 大きな たば", "sticker": "シール", "bucket": "きいろい バケツ", "cape": "マント", "shower": "シャワー", "candle": "ろうそく", "watering_can": "じょうろ", "vest": "あかと あおの しましまの チョッキ", "coin1": "1えんだま", "coin5": "5えんだま", "coin10": "10えんだま", "coin50": "50えんだま", "coin100": "100えんだま", "coin500": "500えんだま", "bill1000": "1000えんさつ", "piggy": "ぶたの ちょきんばこ", "earth": "ちきゅう", "tokyo_tower": "とうきょうタワー", "superhero": "マントの ヒーロー", "stuffed_rabbit": "うさぎの ぬいぐるみ", "color_pencils": "いろえんぴつの セット", "juice_bottle": "ペットボトルの おちゃ", "toy_car": "おもちゃの くるま", "jigsaw": "パズル"};
const EMO_MAP = {"🍎": "apple", "🍓": "strawberry", "🍌": "banana", "🍬": "candy", "🍪": "cookie", "🍫": "choco", "🍰": "cake", "🥚": "egg", "🐟": "fish", "🥕": "carrot", "🍅": "tomato", "🍋": "lemon", "🍈": "melon", "🍉": "watermelon", "🍞": "bread", "🍚": "rice", "🍕": "pizza", "🍔": "hamburger", "🍜": "ramen", "🥞": "pancake", "🍦": "icecream", "🧀": "cheese", "🥛": "milk", "🧃": "juice", "🍯": "honey", "🫘": "beans", "🍳": "fried_egg", "🐶": "dog", "🐱": "cat", "🐰": "rabbit", "🐻": "bear", "🐷": "pig", "🦁": "lion", "🐘": "elephant", "🐯": "tiger", "🐵": "monkey", "🦊": "fox", "🦝": "raccoon", "🐼": "panda", "🐨": "koala", "🦒": "giraffe", "🐧": "penguin", "🐸": "frog", "🐦": "bird", "🦉": "owl", "🐔": "chicken", "🐣": "chick", "🦜": "parrot", "🦋": "butterfly", "🐝": "bee", "🐌": "snail", "🐛": "caterpillar", "🦗": "cricket", "🐠": "tropical_fish", "🐙": "octopus", "🦈": "shark", "🐬": "dolphin", "🐢": "turtle", "🦕": "sauropod", "🦖": "trex", "🌊": "wave", "⛵": "sailboat", "🚗": "car", "🚌": "bus", "🚕": "taxi", "🚒": "fire_engine", "🚃": "train", "🚂": "steam_train", "🚝": "monorail", "🚁": "helicopter", "🚀": "i:rocket", "🛸": "ufo", "🛗": "elevator", "☀": "sun", "🌙": "moon", "☁": "cloud", "🌧": "rain_cloud", "🌤": "sun_cloud", "❄": "snowflake", "⚡": "lightning", "🌈": "i:rainbow", "💧": "droplet", "🌳": "tree", "🌲": "pine", "🌴": "palm", "⛰": "mountain", "🗻": "fuji", "🏔": "snow_mountain", "🌋": "volcano", "🌸": "sakura", "🎏": "koinobori", "☔": "umbrella", "🌻": "sunflower", "🎑": "tsukimi", "🍂": "fallen_leaf", "🍁": "maple", "⛄": "snowman", "🎍": "kadomatsu", "🌷": "tulip", "🎄": "xmas_tree", "🌾": "rice_plant", "🌿": "herb", "🪨": "rock", "🏜": "desert", "🏞": "park", "👁": "eye", "👂": "ear", "👃": "nose", "👄": "mouth", "✋": "hand", "🦶": "foot", "🤏": "pinch", "👋": "wave_hand", "👏": "clap", "👶": "baby", "👧": "girl", "👨": "man", "👩": "woman", "🧍": "child", "🏃": "runner", "😄": "face_happy", "😢": "face_sad", "😱": "face_scared", "😠": "face_angry", "😆": "face_fun", "😪": "face_sleepy", "😲": "face_surprised", "🤩": "face_excited", "🥺": "face_lonely", "🥰": "face_love", "😊": "face_smile", "🙂": "face_calm", "😷": "face_mask", "🙇": "bow", "🙏": "pray", "🙆": "ok_pose", "🛏": "bed", "🛌": "sleeping", "🛁": "bath", "🚪": "door", "🛋": "sofa", "📺": "tv", "📷": "camera", "🪥": "toothbrush", "🧼": "soap", "🥄": "spoon", "🍴": "fork_knife", "🔪": "kitchen_knife", "👕": "tshirt", "👔": "necktie", "🎀": "ribbon", "🧶": "yarn", "✏": "pencil", "📓": "notebook", "📕": "book", "🎨": "palette", "✉": "envelope", "⚽": "ball", "🎈": "balloon", "🧸": "teddy", "🪁": "kite", "🎹": "piano", "🔭": "telescope", "💎": "gem", "🪐": "planet", "🤖": "robot", "🌏": "earth", "🗼": "tokyo_tower", "🦸": "superhero", "🐕": "dog", "🙎‍♀": "face_angry", "🙎": "face_angry", "♀": null, "🫡": "bow", "🌅": "sun", "❗": null, "🌍": "earth", "🪙": "coin100", "💴": "bill1000", "🌱": "herb", "🎒": "i:bag", "⭐": "i:star", "★": "i:star", "🌟": "i:star", "✨": "i:spark", "💫": "i:spark", "💥": "i:boom", "💖": "i:heart", "💗": "i:heart", "🔥": "i:fire", "🔊": "i:speaker", "🔇": "i:mute", "🔁": "i:repeat", "🔄": "i:repeat", "⭕": "i:ok", "❌": "i:ng", "✅": "i:ok", "🔒": "i:lock", "💡": "i:bulb", "🤔": "i:think", "👉": "i:point", "⬆": "i:up", "⬇": "i:down", "🎉": "i:party", "🃏": "i:card", "🔑": "i:key", "🧾": "i:list", "📈": "i:grow", "🏠": "i:home", "📖": "i:book", "📚": "i:book", "🔢": "i:num", "🔤": "i:abc", "📋": "i:list", "📥": "i:list", "🇯🇵": "i:jp", "🟥": "#e2574c", "🟦": "#4a8fd6", "🟨": "#f2c94c", "🟩": "#5cb85c", "⬛": "#333333", "⬜": "#ffffff", "🟧": "#f29a38", "🟪": "#9a6ad6", "🟫": "#8a5a3c", "🔵": "#4a8fd6", "⚪": "#ffffff", "🩷": "#f4a6c6", "✕": "KEEP"};

let ILL_BASE = 'ill/';
const ill = (k, cls = '') => `<span class="sk-ill ${cls}" data-k="${k}" data-l="${ILL_JA[k] || ''}"><img src="${ILL_BASE}${k}.webp" alt="" draggable="false" onerror="if(!this.dataset.r&&location.protocol!=='file:'){this.dataset.r=1;this.src='https://sekai-wo-shiru.vercel.app/ill/${k}.webp'}else this.parentNode.classList.add('miss')"></span>`;
const ICON = {
  star: '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#ffc83d" stroke="#e39b16" stroke-width="1.2" stroke-linejoin="round"/>',
  spark: '<path d="M12 2c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" fill="#ffd95a"/><path d="M19 14c.4 2.2 1.1 2.9 3 3.3-1.9.4-2.6 1.1-3 3.3-.4-2.2-1.1-2.9-3-3.3 1.9-.4 2.6-1.1 3-3.3z" fill="#ffb7d0"/>',
  boom: '<path d="M12 1.5l2 5 5-2.5-2.2 5 5.2 1.6-5 2.2 2.6 4.8-5.2-1.5L12 22l-1.4-5.9-5.2 1.5 2.6-4.8-5-2.2L8.2 9 6 4l5 2.5z" fill="#ff8a3d" stroke="#e0601c" stroke-width="1" stroke-linejoin="round"/>',
  heart: '<path d="M12 20.5s-8-4.8-8-10.4C4 7 6.2 5 8.6 5c1.5 0 2.7.8 3.4 2 .7-1.2 1.9-2 3.4-2C17.8 5 20 7 20 10.1c0 5.6-8 10.4-8 10.4z" fill="#ff7aa8" stroke="#e0507f" stroke-width="1.2"/>',
  fire: '<path d="M12 22c-4.2 0-7-2.8-7-6.6 0-3.4 2.4-5.4 3.6-8.2.4 1.8 1.3 2.9 2.5 3.4C10.8 6.8 12.4 4 15.2 2c-.3 3 1 4.8 2.4 6.7 1.1 1.6 1.4 3 1.4 4.6C19 18.6 16.2 22 12 22z" fill="#ff7b2e"/><path d="M12 21c-2.2 0-3.6-1.4-3.6-3.3 0-2 1.6-3 2.4-4.8.4 1 1 1.6 1.8 1.9.2-1.5 1-2.7 2.2-3.5-.1 1.7.5 2.7 1.1 3.7.4.7.6 1.4.6 2.2C16.5 19.3 14.6 21 12 21z" fill="#ffd13d"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#ffb03a" stroke="#d98a1a" stroke-width="1.2" stroke-linejoin="round"/><path d="M15 9a4 4 0 010 6M17.5 6.5a7.5 7.5 0 010 11" fill="none" stroke="#d98a1a" stroke-width="1.8" stroke-linecap="round"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#c9bcc9"/><path d="M15.5 9.5l5 5m0-5l-5 5" stroke="#a8939f" stroke-width="1.8" stroke-linecap="round"/>',
  repeat: '<path d="M5 12a7 7 0 0112-4.9M19 12a7 7 0 01-12 4.9" fill="none" stroke="#5aa6e0" stroke-width="2.2" stroke-linecap="round"/><path d="M17.5 3.5v4h-4M6.5 20.5v-4h4" fill="none" stroke="#5aa6e0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  ok: '<circle cx="12" cy="12" r="8" fill="none" stroke="#ff6b6b" stroke-width="3"/>',
  ng: '<path d="M6 6l12 12M18 6L6 18" stroke="#6a8fd6" stroke-width="3" stroke-linecap="round"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#f2c25a" stroke="#cf9a2e" stroke-width="1.2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="#cf9a2e" stroke-width="2"/>',
  bulb: '<path d="M12 2.5a6.5 6.5 0 00-3.8 11.8c.6.5 1 1.2 1 2v.7h5.6v-.7c0-.8.4-1.5 1-2A6.5 6.5 0 0012 2.5z" fill="#ffe066" stroke="#e0b52a" stroke-width="1.2"/><rect x="9.2" y="18" width="5.6" height="3.2" rx="1.2" fill="#b9a9b9"/>',
  think: '<circle cx="12" cy="12" r="8.5" fill="#ffd98a" stroke="#e0a948" stroke-width="1.2"/><circle cx="9" cy="10.5" r="1.1" fill="#5a4660"/><circle cx="15" cy="10.5" r="1.1" fill="#5a4660"/><path d="M9.5 15.5h5" stroke="#5a4660" stroke-width="1.4" stroke-linecap="round"/>',
  point: '<path d="M3 12h11" stroke="#f0a35e" stroke-width="4" stroke-linecap="round"/><path d="M13 7l7 5-7 5z" fill="#f0a35e"/>',
  up: '<path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="#5aa6e0"/>', down: '<path d="M12 20l7-8h-4.5V4h-5v8H5z" fill="#5aa6e0"/>',
  party: '<path d="M3 21l4.5-12 7.5 7.5z" fill="#ffb03a" stroke="#d98a1a" stroke-width="1"/><circle cx="15" cy="5" r="1.4" fill="#ff7aa8"/><circle cx="19.5" cy="9" r="1.3" fill="#5aa6e0"/><circle cx="18" cy="3" r="1" fill="#7fd08a"/><path d="M11 6c1-2 3-2.5 4-1M15 11c2-1 4-.5 5 1" fill="none" stroke="#ff7aa8" stroke-width="1.4" stroke-linecap="round"/>',
  card: '<rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="#fff" stroke="#c58bd0" stroke-width="1.6"/><path d="M12 8.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#c58bd0"/>',
  key: '<circle cx="8" cy="12" r="4.2" fill="none" stroke="#e0a948" stroke-width="2.4"/><path d="M12 12h9M18 12v3.5M15.5 12v2.5" stroke="#e0a948" stroke-width="2.4" stroke-linecap="round"/>',
  list: '<rect x="5" y="3" width="14" height="18" rx="2" fill="#fff" stroke="#a9a0c8" stroke-width="1.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" stroke="#a9a0c8" stroke-width="1.6" stroke-linecap="round"/>',
  grow: '<path d="M4 19l5.5-6 4 3.5L20 8" fill="none" stroke="#5cb85c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 7.5H20V12" fill="none" stroke="#5cb85c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  home: '<path d="M3.5 11.5L12 4l8.5 7.5" fill="none" stroke="#e98a6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h12v-9.5" fill="#ffe3d6" stroke="#e98a6a" stroke-width="1.6"/><rect x="10" y="14" width="4" height="6" fill="#e98a6a"/>',
  book: '<path d="M3.5 5.5c3-1 5.8-.6 8.5 1.2v13c-2.7-1.8-5.5-2.2-8.5-1.2zM20.5 5.5c-3-1-5.8-.6-8.5 1.2v13c2.7-1.8 5.5-2.2 8.5-1.2z" fill="#fff6e0" stroke="#e0a948" stroke-width="1.4" stroke-linejoin="round"/>',
  num: '<rect x="3" y="5" width="18" height="14" rx="3" fill="#fff1e0" stroke="#ff9a3c" stroke-width="1.5"/><text x="12" y="15.6" font-size="8.5" font-weight="900" text-anchor="middle" fill="#ff8a1c" font-family="system-ui">123</text>',
  abc: '<rect x="3" y="5" width="18" height="14" rx="3" fill="#e6f3ff" stroke="#4dabf0" stroke-width="1.5"/><text x="12" y="15.6" font-size="8.5" font-weight="900" text-anchor="middle" fill="#2a8ad8" font-family="system-ui">abc</text>',
  rocket: '<path d="M12 2.5c3.2 2.4 4.6 6 4.2 10.5l-2.2 3h-4L7.8 13c-.4-4.5 1-8.1 4.2-10.5z" fill="#f4f0ea" stroke="#b98a7a" stroke-width="1.2"/><circle cx="12" cy="9" r="1.9" fill="#7fb6e6"/><path d="M8 12.5l-3 3.5 3.5.5M16 12.5l3 3.5-3.5.5" fill="#ff7a5a"/><path d="M10.5 16.5c.2 2.2.8 3.6 1.5 5 .7-1.4 1.3-2.8 1.5-5z" fill="#ffb03a"/>',
  rainbow: '<path d="M3 18a9 9 0 0118 0" fill="none" stroke="#ff7a7a" stroke-width="2.2"/><path d="M5.6 18a6.4 6.4 0 0112.8 0" fill="none" stroke="#ffd15a" stroke-width="2.2"/><path d="M8.2 18a3.8 3.8 0 017.6 0" fill="none" stroke="#7fc8f0" stroke-width="2.2"/>',
  jp: '<rect x="2.5" y="6" width="19" height="12.5" rx="1.5" fill="#fff" stroke="#d9cfd9"/><circle cx="12" cy="12.2" r="3.6" fill="#e2574c"/>',
  bag: '<rect x="5" y="7" width="14" height="13" rx="3" fill="#e98a6a"/><path d="M8.5 7a3.5 3.5 0 017 0" fill="none" stroke="#c96a4a" stroke-width="2"/><rect x="8" y="11" width="8" height="4" rx="1.5" fill="#ffd2c2"/>',
};
const icon = (k) => `<svg class="sk-ic" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;
const EMO_RE = /(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:[☀-➿⬀-⯿\u{1F000}-\u{1FAFF}][️‍\u{1F3FB}-\u{1F3FF}]*(?:‍[☀-➿\u{1F000}-\u{1FAFF}]️?)*)/gu;
const emoKey = (e) => { const b = e.replace(/️/g, ''); return EMO_MAP[b] !== undefined ? EMO_MAP[b] : EMO_MAP[b.replace(/‍.*$/, '')]; };
const noEmo = (t) => String(t).replace(EMO_RE, (e) => (emoKey(e) === 'KEEP' ? e : '')).replace(/[ 　]{2,}/g, ' ');
function emoHTML(e) { const v = emoKey(e); if (v === 'KEEP') return null; if (!v) return ''; if (v[0] === '#') return `<i class="sk-sw" style="background:${v}"></i>`; if (v.startsWith('i:')) return icon(v.slice(2)); return ill(v); }
function deEmoText(tn) { const t = tn.nodeValue; if (!t || !EMO_RE.test(t)) return; EMO_RE.lastIndex = 0; const pe = tn.parentNode; if (!pe || /^(SCRIPT|STYLE|TEXTAREA)$/.test(pe.nodeName)) return;
  let html = '', last = 0, changed = false; for (const m of t.matchAll(EMO_RE)) { const h = emoHTML(m[0]); if (h === null) continue; changed = true; html += esc(t.slice(last, m.index)) + h; last = m.index + m[0].length; } if (!changed) return; html += esc(t.slice(last));
  const tmp = document.createElement('template'); tmp.innerHTML = html; pe.replaceChild(tmp.content, tn); }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function deEmo(node) { if (node.nodeType === 3) { deEmoText(node); return; } if (node.nodeType !== 1) return; const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); const list = []; while (w.nextNode()) list.push(w.currentNode); list.forEach(deEmoText); }
// おかねで かえるもの（だいたいの ねだん・2026ねん）
const SHOP = [[10, 'candy', 'あめ', 'こ'], [30, 'choco', 'ちいさい チョコ', 'こ'], [40, 'egg', 'たまご', 'こ'], [40, 'banana', 'バナナ', 'ほん'], [50, 'mikan', 'みかん', 'こ'], [60, 'pencil', 'えんぴつ', 'ほん'], [80, 'eraser', 'けしゴム', 'こ'], [110, 'gum', 'ガム', 'パック'], [130, 'apple', 'りんご', 'こ'], [150, 'onigiri', 'おにぎり', 'こ'], [150, 'pudding', 'プリン', 'こ'],
  [160, 'juice_bottle', 'ペットボトルの おちゃ', 'ほん'], [200, 'notebook', 'ノート', 'さつ'], [200, 'hamburger', 'ハンバーガー', 'こ'], [220, 'donut', 'ドーナツ', 'こ'], [250, 'milk', 'ぎゅうにゅう', 'パック'], [300, 'sticker', 'シール', 'まい'], [350, 'icecream', 'ソフトクリーム', 'こ'], [400, 'cake', 'ショートケーキ', 'こ'], [600, 'strawberry', 'いちご', 'パック'],
  [600, 'color_pencils', 'いろえんぴつ', 'はこ'], [1000, 'jigsaw', 'パズル', 'こ'], [1100, 'toy_car', 'おもちゃの くるま', 'だい'], [1300, 'book', 'えほん', 'さつ'], [2000, 'teddy', 'くまの ぬいぐるみ', 'こ'], [2000, 'stuffed_rabbit', 'うさぎの ぬいぐるみ', 'こ'], [3000, 'ball', 'サッカーボール', 'こ'], [20000, 'bicycle', 'じてんしゃ', 'だい']];
const cnt = (n, u) => u === 'ほん' ? n + ([1, 6, 8, 0].includes(n % 10) && n !== 11 ? 'ぽん' : n % 10 === 3 ? 'ぼん' : 'ほん') : u === 'はこ' ? n + (n === 1 || n === 6 || n === 8 || n % 10 === 0 ? 'ぱこ' : n === 3 ? 'ぱこ' : 'はこ') : u === 'だい' ? n + 'だい' : n + u;

// ───────── きょうかしょ（啓林館『わくわく さんすう 1』p76〜p139）に そった さんすう
// エンジンの なかに はりこむ。TB_MATH だけを そとに だす（ほかの なまえは この なかだけ）。
const TB_MATH = (() => {
  // ── ず の パーツ
  const O = (k, n, x = 0) => `<div class="sk-objs">${Array.from({ length: n }, (_, i) => `<i class="sk-d emo-d${i >= n - x ? ' x' : ''}">${ill(k)}</i>`).join('')}</div>`;
  const OP = (t) => `<span class="sk-op">${t}</span>`;
  const P = (t) => `<p class="sk-p">${t}</p>`;
  const LB = (t, h) => `<div style="display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap"><b style="font-size:24px;min-width:4em;text-align:right">${t}</b>${h}</div>`;
  const COL = (...hs) => `<div style="display:flex;flex-direction:column;gap:8px;align-items:center">${hs.join('')}</div>`;
  const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const chT = (ans, cands, n = 3) => { ans = String(ans); const o = shuffle(uniq(cands.map(String)).filter((c) => c !== ans)).slice(0, n - 1); return shuffle([ans, ...o]); };
  const pickD = (d, list) => list[Math.min(list.length - 1, Math.floor(d * list.length))];
  const SY = (op) => (op === '+' ? '＋' : '−'), WD = (op) => (op === '+' ? 'たす' : 'ひく');
  // かぞえかたの ことば
  const sfx = (n, a, b, c) => { const l = n % 10; return n === 0 ? a : [1, 6, 8, 0].includes(l) ? c : l === 3 ? b : a; };
  const hon = (n) => n + sfx(n, 'ほん', 'ぼん', 'ぽん');
  const hiki = (n) => n + sfx(n, 'ひき', 'びき', 'ぴき');
  const fun = (m) => ([1, 3, 6, 8, 0].includes(m % 10) ? 'ぷん' : 'ふん');
  const TL = (h, m) => (m === 0 ? `${h}じ` : `${h}じ${m}${fun(m)}`);
  const DG = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
  // 10の たば・ばら（100の たばも）
  const BD = (n) => { const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10; return `<div class="sk-objs">${[...Array(h).fill('stick100'), ...Array(t).fill('stick10'), ...Array(o).fill('stick')].map((k) => `<i class="sk-d emo-d">${ill(k)}</i>`).join('')}</div>`; };
  const B10 = (n) => O('stick10', Math.floor(n / 10)); // 10の たばだけで ならべる（100も 10たば）
  // くらいの ひょう
  const PV = (t, o, hl) => `<div style="display:inline-grid;grid-template-columns:repeat(2,110px);border:4px solid #4a3b52;border-radius:12px;overflow:hidden;background:#fff;font-weight:900;text-align:center"><span style="font-size:18px;padding:4px;background:#ffe6cc">じゅうの くらい</span><span style="font-size:18px;padding:4px;background:#dff0ff">いちの くらい</span><span style="font-size:48px;${hl === 't' ? 'color:#ff5a8a' : ''}">${t}</span><span style="font-size:48px;${hl === 'o' ? 'color:#ff5a8a' : ''}">${o}</span></div>`;
  // かずの せん（すきな はんい）。q＝？に する ところ、show＝かずを みせる ところ
  const NL = (vals, o = {}) => `<div class="sk-line">${vals.map((v) => `<i data-v="${v}" class="${v === o.q ? (o.reveal ? 'end' : 'st') : (o.hl || []).includes(v) ? 'hop' : ''}">${v === o.q && !o.reveal ? '？' : !o.show || o.show(v) || v === o.q ? v : ''}</i>`).join('')}</div>`;
  const rng = (lo, hi, st = 1) => { const a = []; for (let v = lo; st > 0 ? v <= hi : v >= hi; v += st) a.push(v); return a; };
  // ますめ（ひろさ）
  const TILES = (w, h, cls, num) => `<span style="display:inline-grid;grid-template-columns:repeat(${w},30px);gap:3px;vertical-align:middle">${Array.from({ length: w * h }, (_, i) => `<i class="sk-d ${cls}" style="border-radius:5px;width:30px;height:30px;animation:none;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:15px;font-weight:900;color:#fff">${num ? i + 1 : ''}</i>`).join('')}</span>`;
  const STRIPE = (n, c1, c2, num) => `<span style="display:inline-flex;border:3px solid #4a3b52;border-radius:8px;overflow:hidden">${Array.from({ length: n }, (_, i) => `<i style="width:30px;height:26px;background:${i % 2 ? c2 : c1};font-style:normal;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center">${num ? i + 1 : ''}</i>`).join('')}</span>`;
  const CUPS = (n, num) => `<span style="display:inline-flex;gap:5px">${Array.from({ length: n }, (_, i) => `<i style="width:26px;height:34px;border:3px solid #4a3b52;border-top:none;border-radius:0 0 8px 8px;background:linear-gradient(transparent 25%,#8ccfff 25%);font-style:normal;font-size:14px;font-weight:900;display:flex;align-items:flex-end;justify-content:center">${num ? i + 1 : ''}</i>`).join('')}</span>`;
  // みじかい はりと ながい はり（clock() の ながい はりを なんぷんに うごかし、めもりを つける）
  const CLK = (h, m) => { const a = (m / 60) * Math.PI * 2; let s = clock(h + m / 60, false); s = s.replace(/class="mh" x1="50" y1="50" x2="[^"]*" y2="[^"]*"/, `class="mh" x1="50" y1="50" x2="${50 + Math.sin(a) * 34}" y2="${50 - Math.cos(a) * 34}"`);
    let t = ''; for (let i = 0; i < 60; i++) { const b = (i / 60) * Math.PI * 2, r1 = i % 5 ? 41 : 39.5; t += `<line x1="${50 + Math.sin(b) * r1}" y1="${50 - Math.cos(b) * r1}" x2="${50 + Math.sin(b) * 43.5}" y2="${50 - Math.cos(b) * 43.5}" stroke="#4a3b52" stroke-width="${i % 5 ? 0.7 : 1.6}"/>`; }
    return s.replace('<line class="hh"', t + '<line class="hh"'); };

  // ── けいさんの もんだい（20まで）
  function zeroQ(a, op, b) { const r = op === '+' ? a + b : a - b; const t = `${a} ${SY(op)} ${b} ＝ ？`;
    const st = op === '+' ? [{ h: COL(LB(String(a), a ? dots(a, 'a') : P('なし')), LB(String(b), b ? dots(b, 'b') : P('なし'))), s: `0は、なにも ない こと` }, { h: eq(`${a} ＋ ${b} ＝ <b>${r}</b>`), s: `0を たしても かずは かわらない。こたえは ${r}` }]
      : b === 0 ? [{ h: a ? dots(a, 'a') : P('なにも ない'), s: `${a}こ あって、ひとつも とらない` }, { h: eq(`${a} − 0 ＝ <b>${r}</b>`), s: `0を ひいても かわらない。こたえは ${r}` }]
        : [{ h: dotsX(a, 'a', a), s: `${a}こ あって、${a}こ ぜんぶ とる` }, { h: eq(`${a} − ${b} ＝ <b>0</b>`), s: 'ぜんぶ とると なにも のこらない。こたえは 0' }];
    return { text: t, sayQ: `${a} ${WD(op)} ${b} は？`, ans: String(r), choices: numChoices(r, 0, 12), bigC: true, steps: st }; }
  function teenAdd(a, b) { const r = a + b, bg = Math.max(a, b), sm = Math.min(a, b), o = bg - 10;
    const st = bg === 10 && sm === 10 ? [{ h: frame(10) + OP('と') + frame(10), s: '10と 10' }, { h: eq(`10 ＋ 10 ＝ <b>20</b>`), s: '10が 2つで 20' }]
      : [{ h: frame(10) + OP('と') + dots(o, 'b') + OP('＋') + dots(sm, 'a'), s: o ? `${bg}は 10と ${o}` : `10の まとまりと ${sm}` }, ...(o ? [{ h: frame(10) + OP('と') + dots(o + sm, 'b'), s: `ばらを あわせる。${o}と ${sm}で ${o + sm}` }] : []), { h: eq(`10 と ${o + sm} で <b>${r}</b>`), s: `10と ${o + sm}で ${r}` }];
    return { text: `${a} ＋ ${b} ＝ ？`, sayQ: `${a} たす ${b} は？`, ans: String(r), choices: numChoices(r, 0, 20), bigC: true, steps: st }; }
  function teenSub(a, b) { const o = a - 10, r = a - b;
    return { text: `${a} − ${b} ＝ ？`, sayQ: `${a} ひく ${b} は？`, ans: String(r), choices: numChoices(r, 0, 20), bigC: true, steps: [
      { h: frame(10) + OP('と') + dots(o, 'b'), s: `${a}は 10と ${o}` }, { h: frame(10) + OP('と') + dotsX(o, 'b', b), s: `ばらの ${o}こから ${b}こ とるよ` }, { h: eq(`10 と ${o - b} で <b>${r}</b>`), s: o - b ? `10と ${o - b}で ${r}` : `ばらが なくなって 10` }] }; }
  function cq(a, op, b) { // 20までの けいさん：ちょうど いい せつめいを えらぶ
    if (a > 20 || b > 20 || (op === '+' && a + b > 20)) return bigQ(a, op, b);
    let q; if (op === '+') { if (a === 0 || b === 0) q = zeroQ(a, op, b); else if (a + b <= 10) q = addQ(a, b); else if (a >= 10 || b >= 10) q = teenAdd(a, b); else q = a >= b ? carryQ(a, b) : carryQ(b, a, true); }
    else if (b === 0 || a === b) q = zeroQ(a, op, b); else if (a <= 10) q = subSimpleQ(a, b); else if (b >= 10) q = bigQ(a, op, b); else if (a - 10 >= b) q = teenSub(a, b); else q = borrowQ(a, b);
    q.bigC = true; return q; }
  function bigQ(a, op, b) { // 100までの けいさん（10の たばで せつめい）
    const r = op === '+' ? a + b : a - b, S = SY(op), W = WD(op), at = a - (a % 10), ao = a % 10; let st;
    if (a % 10 === 0 && b % 10 === 0) st = [{ h: B10(a) + OP(S) + B10(b), s: `${a}は 10が ${a / 10}こ、${b}は 10が ${b / 10}こ` }, { h: eq(`10が ${a / 10} ${S} ${b / 10} で ${r / 10}こ`), s: `10の たばで かんがえる。${a / 10} ${W} ${b / 10}は ${r / 10}` }, { h: (r ? B10(r) : '') + eq(`${a} ${S} ${b} ＝ <b>${r}</b>`), s: `10が ${r / 10}こで ${r}` }];
    else if (b % 10 === 0) st = [{ h: BD(a), s: `${a}は ${at}と ${ao}` }, { h: eq(`${at} ${S} ${b} ＝ ${op === '+' ? at + b : at - b}`), s: `10の たばの ほうを けいさん。${at} ${W} ${b}は ${op === '+' ? at + b : at - b}` }, { h: BD(r) + eq(`${a} ${S} ${b} ＝ <b>${r}</b>`), s: `ばらの ${ao}は そのまま。こたえは ${r}` }];
    else if (op === '+' && ao === 0) st = [{ h: BD(a) + OP('と') + O('stick', b), s: `${a}と ${b}` }, { h: BD(r) + eq(`${a} ＋ ${b} ＝ <b>${r}</b>`), s: `${a}と ${b}で ${r}` }];
    else if (op === '-' && b === ao) st = [{ h: BD(a), s: `${a}は ${at}と ${ao}` }, { h: B10(at) + `<div class="sk-objs">${O('stick', ao, ao)}</div>`, s: `ばらの ${ao}を とると` }, { h: eq(`${a} − ${b} ＝ <b>${r}</b>`), s: `${at}が のこる。こたえは ${r}` }];
    else { const oo = op === '+' ? ao + b : ao - b; st = [{ h: BD(a), s: `${a}は ${at}と ${ao}` }, { h: eq(`${ao} ${S} ${b} ＝ ${oo}`), s: `ばらの ほうを けいさん。${ao} ${W} ${b}は ${oo}` }, { h: BD(r) + eq(`${at} と ${oo} で <b>${r}</b>`), s: `${at}と ${oo}で ${r}` }]; }
    return { text: `${a} ${S} ${b} ＝ ？`, sayQ: `${a} ${W} ${b} は？`, ans: String(r), choices: numChoices(r, 0, 100), bigC: true, steps: st }; }
  function threeQ(a, o1, b, o2, c) { const ab = o1 === '+' ? a + b : a - b, r = o2 === '+' ? ab + c : ab - c;
    return { text: `${a} ${SY(o1)} ${b} ${SY(o2)} ${c} ＝ ？`, sayQ: `${a} ${WD(o1)} ${b} ${WD(o2)} ${c} は？`, ans: String(r), choices: numChoices(r, 0, 20), bigC: true, steps: [
      { h: eq(`<b>${a} ${SY(o1)} ${b}</b> ${SY(o2)} ${c}`), s: `まえから じゅんばんに。まず ${a} ${WD(o1)} ${b}` }, { h: eq(`${ab} ${SY(o2)} ${c}`), s: `${a} ${WD(o1)} ${b} は ${ab}` }, { h: eq(`${ab} ${SY(o2)} ${c} ＝ <b>${r}</b>`), s: `${ab} ${WD(o2)} ${c} は ${r}` }] }; }
  const parse = (e) => { const m = /^(\d+)([+-])(\d+)(?:([+-])(\d+))?$/.exec(e); return m[4] ? threeQ(+m[1], m[2], +m[3], m[4], +m[5]) : cq(+m[1], m[2], +m[3]); };
  const valOf = (e) => { const m = /^(\d+)([+-])(\d+)(?:([+-])(\d+))?$/.exec(e); let v = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]; if (m[4]) v = m[4] === '+' ? v + +m[5] : v - +m[5]; return v; };
  const show = (e) => e.replace(/\+/g, ' ＋ ').replace(/-/g, ' − ');
  // ぶんしょうだい：ことば → しき → けいさん
  function wq(o) { const base = cq(o.a, o.op, o.b), r = +base.ans; const u = o.u || '';
    return { text: o.text, sayQ: o.say || strip(o.text), viz: o.viz || '', ans: o.ansS || String(r), choices: o.choices || numChoices(r, 0, Math.max(20, r + 10)), bigC: !o.choices, txt: !!o.choices, nums: base.nums,
      steps: [{ h: P(o.kw), s: o.kws }, ...(o.vizS ? [{ h: o.vizS, s: o.vizSs }] : []), { h: eq(`${o.a} ${SY(o.op)} ${o.b}`), s: `しきは ${o.a} ${WD(o.op)} ${o.b}` }, ...base.steps, { h: big(`${o.ansS || r + u}`), s: `こたえは ${o.ansS || r + u}` }] }; }

  // ── きょうかしょの もんだい リスト
  const HC = ['14-9', '12-4', '17-8', '11-3', '14-5', '16-8', '11-2', '14-6', '16-9', '12-8', '13-7', '17-9', '12-3', '11-9', '15-6', '13-5', '12-7', '11-4', '15-9', '11-7', '14-8', '16-7', '15-7', '18-9', '13-9', '12-5', '13-8', '11-5', '12-6', '11-8', '12-9', '13-4', '13-6', '15-8', '11-6', '14-7']; // p82 ひきざんの かあど
  const L = {
    r1: ['3+2', '5+4', '7+1', '2+8', '3+4', '2+6', '4+5', '1+7', '8+1', '2+1', '3+6', '2+7', '2+2', '6+2', '5+2', '6+3', '4+2', '1+8', '5+5', '6+4'],
    r2: ['9-4', '5-1', '6-3', '8-1', '7-3', '6-4', '9-6', '6-5', '8-3', '7-4', '5-2', '7-1', '8-6', '3-2', '10-5', '8-4', '9-3', '7-6', '10-2', '10-7'],
    r3: ['10+5', '10+2', '10+8', '10+10', '13-3', '18-8', '11-1', '19-9'],
    r4: ['17+2', '15+3', '14+3', '12+6', '16+2', '13+3', '14+5', '18+1', '15+1', '11+8', '12+5', '13+2', '18-5', '16-4', '18-7', '14-3', '13-1', '17-3', '19-5', '16-2', '19-2', '12-1', '16-3', '15-4'],
    r5: ['5+1+2', '7+3+4', '6+4+8', '7-2-1', '14-4-2', '19-9-3', '9-8+5', '10-7+6', '16-6+4', '4+3-5', '10+9-6', '13+2-4'],
    r6: ['9+5', '5+6', '8+9', '7+4', '6+7', '9+6', '8+3', '4+9', '3+9', '9+8', '8+8', '7+5', '6+5', '5+8', '3+8', '7+9', '2+9', '9+7', '7+7', '8+4', '9+9', '6+8', '9+3', '8+5', '5+7', '4+8', '7+6', '7+8', '8+7', '5+9', '9+2', '6+6'],
    r7: ['17-9', '15-6', '13-4', '14-5', '13-9', '16-8', '12-8', '11-8', '11-3', '13-5', '17-8', '12-3', '16-7', '14-6', '15-9', '11-9', '12-7', '11-5', '13-7', '11-4', '14-9', '15-7', '13-6', '12-4', '15-8', '18-9', '11-7', '13-8', '12-9', '12-6', '16-9'],
    r8: ['5+0', '2+0', '8+0', '9+0', '0+3', '0+6', '0+7', '0+2', '9-9', '7-7', '4-4', '6-6', '4-0', '6-0', '9-0', '1-0'],
    r9: ['50+20', '70+10', '40+50', '20+60', '30+60', '40+40', '70+20', '10+90', '70-40', '80-60', '90-30', '60-50', '40-20', '50-10', '100-70', '100-20'],
    r10: ['60+2', '40+3', '30+9', '70+7', '90+4', '50+8', '80+6', '20+5', '58-8', '91-1', '86-6', '24-4', '49-9', '33-3', '75-5', '67-7'],
    r11: ['36+1', '72+5', '65+3', '81+8', '57+2', '22+6', '23+4', '91+7', '41+5', '84+3', '52+2', '73+6', '48-5', '96-3', '37-6', '65-4', '79-7', '93-2', '29-8', '88-6', '64-1', '39-4', '78-7', '57-5'],
    k1: ['5+3', '8+1', '1+5', '6+0', '4+6', '7+3', '5+8', '9+4', '7+5', '5+6', '6+9', '8+6'],
    k2: ['6-2', '9-1', '4-3', '5-5', '10-4', '10-8', '13-4', '12-5', '11-2', '14-7', '17-8', '15-9'],
    k3: ['6+1+2', '2+8+7', '6+4+4', '7-3-1', '15-5-2', '10-7+3', '10-6+4', '8+2-3', '4+6-5', '17-7+3', '12-2+8', '11+5-4'],
    k4: ['20+4', '80+6', '14+2', '11+7', '32+3', '44+5', '10+30', '20+70', '80+20'],
    k5: ['56-6', '99-9', '13-2', '17-5', '75-3', '67-4', '80-30', '100-60'],
  };
  // おなじ なかまの もんだいを あたらしく つくる（まいかい すこし かずを かえる）
  const G = {
    r1: () => { const a = R(1, 8); return `${a}+${R(1, 10 - a)}`; }, r2: () => { const a = R(3, 10); return `${a}-${R(1, a - 1)}`; },
    r3: () => (Math.random() < 0.5 ? `10+${R(1, 9)}` : ((o) => `${10 + o}-${o}`)(R(1, 9))), r4: () => { const o = R(1, 8); return Math.random() < 0.5 ? `${10 + o}+${R(1, 9 - o)}` : `${10 + o + 1}-${R(1, o)}`; },
    r6: () => { const a = R(2, 9); return `${a}+${R(Math.max(2, 11 - a), 9)}`; }, r7: () => { const m = R(2, 9); return `${R(11, 9 + m)}-${m}`; },
    r8: () => { const a = R(1, 10); return pick([`${a}+0`, `0+${a}`, `${a}-${a}`, `${a}-0`]); },
    r9: () => { const a = R(1, 9) * 10; return Math.random() < 0.5 ? `${a}+${R(1, 10 - a / 10) * 10}` : `${a}-${R(1, a / 10) * 10}`; },
    r10: () => { const a = R(2, 9) * 10, o = R(1, 9); return Math.random() < 0.5 ? `${a}+${o}` : `${a + o}-${o}`; },
    r11: () => { const t = R(2, 9) * 10, o = R(1, 8); return Math.random() < 0.5 ? `${t + o}+${R(1, 9 - o)}` : `${t + o + 1}-${R(1, o)}`; },
  };
  const fromList = (key) => (G[key] && Math.random() < 0.5 ? G[key]() : pick(L[key]));

  // ── しょうてん：ことばの ひんと
  const KW_NOKORI = (w) => `「<b class="mark">${w}</b>」→ へる → ひきざん`;
  const KW_FUERU = (w) => `「<b class="mark">${w}</b>」→ ふえる → たしざん`;
  const KW_AWASE = (w) => `「<b class="mark">${w}</b>」→ あわせる → たしざん`;

  return [
    // ════ 15 ひきざん(2)  p76〜87
    { id: 'tm_hiku9', n: 'ひきざん（−9）', page: 76, m: 12, q(d) { // p76 13−9、p77 15−9・11−9、p80 □−9
      const m = d < 0.6 ? 9 : pick([9, 9, 8]), n = d < 0.3 ? pick([13, 15, 11]) : R(11, 9 + m); const q = borrowQ(n, m); q.bigC = true; return q; } },
    { id: 'tm_hiku_iro', n: 'くりさがりの ひきざん', page: 78, m: 12, q(d) { // p78 12−7、p79 ▲5、p80 ▲8、p81 ▲11（13−4 など）
      const lst = d < 0.4 ? ['14-9', '13-8', '14-7', '13-6', '11-6', '15-7', '16-8', '18-9', '12-7', '15-6'] : d < 0.7 ? ['11-9', '12-9', '16-9', '17-9', '14-8', '15-8', '12-8', '17-8', '11-7', '15-7', '16-7', '12-7', '14-6', '11-6', '15-6', '12-6']
        : ['13-5', '14-5', '12-5', '11-4', '12-4', '11-3', '12-3', '11-2', '13-4'];
      let e = pick(lst); if (Math.random() < 0.5) { const m = d < 0.7 ? R(6, 9) : R(2, 5); e = `${R(11, 9 + m)}-${m}`; } const q = parse(e); return q; } },
    { id: 'tm_hiku_bun', n: 'ひきざんの おはなし', page: 77, m: 12, q(d) { const t = R(0, 4);
      if (t === 0) { const m = d < 0.5 ? 9 : R(6, 9), n = R(11, 9 + m); return wq({ a: n, op: '-', b: m, u: 'こ', text: `かきが ${n}こ なって います。${m}こ とると、<b>のこりは</b> なんこ？`, viz: O('persimmon', n), kw: KW_NOKORI('のこりは'), kws: 'のこりは、と きいて いるね。とると へるから ひきざん', vizS: O('persimmon', n, m), vizSs: `${m}こ とるよ` }); } // p77
      if (t === 1) { const n = R(11, 15), m = R(n - 9, 9); return wq({ a: n, op: '-', b: m, u: 'まい', text: `かあどが ${n}まい あります。うらを むいて いる かあどは ${m}まい。おもてを むいて いる かあどは なんまい？`, viz: O('card', n), kw: `ぜんぶ ${n}まい から うらの ${m}まいを ひく`, kws: `ぜんぶの ${n}まいから、うらの ${m}まいを ひけば おもての かずが わかる` }); } // p79
      if (t === 2) { const w = R(11, 16), r = R(w - 9, 9), s = w - r; const ans = `しろが ${s}こ おおい`; const q = wq({ a: w, op: '-', b: r, ansS: ans, choices: chT(ans, [`あかが ${s}こ おおい`, `しろが ${s + 1}こ おおい`, `しろが ${s - 1 || s + 2}こ おおい`], 3), text: `たまいれ。あかは ${r}こ、しろは ${w}こ はいりました。<b>どちらが なんこ おおい？</b>`, viz: COL(LB('あか', O('ball_red', r)), LB('しろ', O('ball_white', w))), kw: 'ちがいは おおい ほう − すくない ほう', kws: `おおいのは しろ。ちがいは ${w} ひく ${r} で わかる` });
        const row = (k, n, hl) => `<div class="sk-cmprow"><b>${k === 'ball_red' ? 'あか' : 'しろ'}</b>${Array.from({ length: n }, (_, i) => `<i class="sk-d emo-d${hl && i >= r ? ' xtra' : ''}${hl && i < r ? ' dim' : ''}">${ill(k)}</i>`).join('')}</div>`;
        const cmp = (hl) => `<div class="sk-cmp">${row('ball_red', r)}${row('ball_white', w, hl)}</div>`;
        q.viz = cmp(false); q.steps = [{ h: cmp(false), s: 'あかと しろを 1こずつ ならべて みよう' }, { h: cmp(true), s: `しろが ${s}こ のこったね。これが おおい ぶんだよ` }, { h: eq(`${w} − ${r} ＝ <b>${s}</b>`), s: `しきに すると ${w} ひく ${r} は ${s}` }, { h: big(ans), s: `こたえは ${ans}` }]; return q; } // p80
      if (t === 3) { const n = R(11, 14), m = R(n - 9, 5); return wq({ a: n, op: '-', b: m, u: 'こ', text: `くりが ${n}こ あります。${m}こ たべると、<b>のこりは</b> なんこ？`, viz: O('chestnut', n), kw: KW_NOKORI('のこりは'), kws: 'たべると へる。のこりは ひきざん', vizS: O('chestnut', n, m), vizSs: `${m}こ たべるよ` }); } // p81
      const n = R(11, 15), m = R(n - 9, 9); return wq({ a: n, op: '-', b: m, u: 'ひき', ansS: hiki(n - m), text: `こねこが ${hiki(n)} あそんで いました。${hiki(m)} ねました。<b>おきて いるのは</b> なんびき？`, choices: chT(hiki(n - m), [hiki(n - m + 1), hiki(n - m - 1 || n - m + 2), hiki(n + m > 20 ? n - m + 10 : n + m)], 3), kw: 'ねた ぶんを ひく → ひきざん', kws: `${n}ひきの うち ${m}ひき ねたから、ひきざん` }); } }, // p85 かみしばい
    { id: 'tm_hiku_card', n: 'ひきざんの かあど', page: 82, m: 12, q(d) { const t = R(0, 2);
      if (t === 0) { const tg = d < 0.4 ? 9 : R(2, 9); const ok = HC.filter((e) => valOf(e) === tg), ng = HC.filter((e) => valOf(e) !== tg); const a = pick(ok), n = d < 0.5 ? 3 : 4; const raw = shuffle([a, ...shuffle(ng).slice(0, n - 1)]), ch = raw.map(show);
        return { text: `こたえが ${tg}に なる かあどは どれ？`, sayQ: `こたえが ${tg} に なる かあどは どれ？`, ans: show(a), choices: ch, txt: true, steps: [{ h: P(raw.map((c) => `${show(c)} ＝ ${valOf(c)}`).join('<br>')), s: 'ひとつずつ こたえを だして みよう' }, { h: eq(`${show(a)} ＝ <b>${tg}</b>`), s: `${strip(show(a)).replace('−', 'ひく')} は ${tg}` }] }; } // p82・p86 めいろ
      if (t === 1) { const cs = shuffle(HC).reduce((acc, e) => (acc.some((x) => valOf(x) === valOf(e)) ? acc : [...acc, e]), []).slice(0, d < 0.5 ? 3 : 4); const a = cs.reduce((x, y) => (valOf(y) < valOf(x) ? y : x));
        return { text: 'こたえが いちばん ちいさい かあどは どれ？', sayQ: 'こたえが いちばん ちいさい かあどは どれ？', ans: show(a), choices: shuffle(cs.map(show)), txt: true, steps: [{ h: P(cs.map((c) => `${show(c)} ＝ ${valOf(c)}`).join('<br>')), s: 'ぜんぶの こたえを だして くらべよう' }, { h: eq(`${show(a)} ＝ <b>${valOf(a)}</b>`), s: `いちばん ちいさいのは ${valOf(a)}` }] }; } // p87 ぷれぜんと
      const m = R(3, 9), n = R(11, 9 + m), o = n - 10, k = d < 0.4 ? 0 : R(0, 2); // p86 ▲1 13−8 の □
      const tx = [`${n}を 10と <b>？</b>に わける`, `10から ${m}を ひいて <b>？</b>`, `${10 - m}と ${o}で <b>？</b>`]; const ans = [o, 10 - m, n - m][k];
      const lines = [`${n}を 10と ${k === 0 ? '<b>？</b>' : o}に わける`, k <= 0 ? '' : `10から ${m}を ひいて ${k === 1 ? '<b>？</b>' : 10 - m}`, k === 2 ? tx[2] : ''].filter(Boolean).join('<br>');
      const qk = [`${n}は 10と いくつ？`, `10から ${m}を とると いくつ？`, `${10 - m}と ${o}を あわせると いくつ？`][k];
      return { text: `<small class="sk-sub">${n} − ${m} の じゅんび</small>\n<b>${qk}</b>`, sayQ: `${n} ひく ${m} の じゅんび。${qk}`, viz: k === 0 ? '' : P(lines), ans: String(ans), choices: numChoices(ans, 0, 18), bigC: true, steps: k === 0
        ? [{ h: frame(10) + OP('と') + dots(o, 'b'), s: `${n}こは、10こと ${o}こ` }, { h: eq(`${n} は 10 と <b>${o}</b>`), s: `だから こたえは ${o}` }]
        : k === 1 ? [{ h: frame(10), s: `10こから ${m}こ とるよ`, run: crossRun(m, '.sk-tf .sk-d') }, { h: frame(10 - m) + `<div class="sk-taken"><span>とった ${m}こ</span>${dotsX(m, 'a', m)}</div>`, s: `のこりは ${10 - m}こ。だから こたえは ${10 - m}` }]
        : [{ h: numDots(10 - m, 'a', 0) + OP('と') + numDots(o, 'b', 0), s: `${10 - m}こと ${o}こを あわせて かぞえよう`, run: countRun('.sk-d', 1) }, { h: numDots(10 - m, 'a', 1) + OP('と') + numDots(o, 'b', 10 - m + 1) + eq(`${10 - m} と ${o} で <b>${n - m}</b>`), s: `${10 - m}と ${o}で ${n - m}。だから こたえは ${n - m}` }] }; } },
    { id: 'tm_kazuate', n: 'かずあて げえむ', page: 84, m: 12, q(d) { const t = d < 0.4 ? 0 : R(0, 2); // p84 7＋□＝15、12−□＝9
      if (t === 0) { const a = R(2, 9), b = R(Math.max(2, 11 - a), 9), s = a + b;
        return { text: `${a} ＋ □ ＝ ${s}　□は いくつ？`, sayQ: `${a} たす しかく は ${s}。しかくは いくつ？`, viz: frame(a) + OP('＋') + big('□'), ans: String(b), choices: numChoices(b, 1, 10), bigC: true, steps: [
          { h: frame(a, 10 - a), s: `${a}こに あと ${10 - a}こ たすと 10こ`, run: countRun('.sk-tf .sk-d.b', 1) }, { h: frame(a, 10 - a, { cls: 'full' }) + OP('と') + dots(s - 10, 'b'), s: `${s}こに するには、もう ${s - 10}こ`, run: countRun('.sk-dr .sk-d.b', 1) }, { h: `<span class="sk-grp">${dots(10 - a, 'b')}<b>${10 - a}こ</b></span>` + OP('＋') + `<span class="sk-grp">${dots(s - 10, 'b')}<b>${s - 10}こ</b></span>`, s: `たした のは ${10 - a}こと ${s - 10}こ` }, { h: eq(`${10 - a} ＋ ${s - 10} ＝ <b>${b}</b>`), s: `${10 - a}と ${s - 10}で ${b}` }, { h: eq(`${a} ＋ <b>${b}</b> ＝ ${s}`), s: `${a} たす ${b} は ${s}。しかくは ${b}` }] }; }
      const m = R(2, 9), n = R(11, 9 + m), r = n - m;
      if (t === 1) { const sub = cq(n, '-', r); return { text: `${n} − □ ＝ ${r}　□は いくつ？`, sayQ: `${n} ひく しかく は ${r}。しかくは いくつ？`, ans: String(m), choices: numChoices(m, 1, 10), bigC: true, steps: [{ h: P(`${n}から いくつ とると ${r}？`), s: `${n}から なんこ とると ${r}に なるかな` }, { h: eq(`${n} − ${r} ＝ ？`), s: `${n} ひく ${r} を けいさん すると わかるよ` }, ...sub.steps, { h: eq(`${n} − <b>${m}</b> ＝ ${r}`), s: `しかくは ${m}` }] }; }
      const add = cq(r, '+', m); return { text: `□ − ${m} ＝ ${r}　□は いくつ？`, sayQ: `しかく ひく ${m} は ${r}。しかくは いくつ？`, ans: String(n), choices: numChoices(n, 10, 20), bigC: true, steps: [{ h: P(`${m} とったら ${r} のこった`), s: `${m}こ とったら ${r}こ のこった。もとは いくつ？` }, { h: eq(`${r} ＋ ${m} ＝ ？`), s: `のこりと とった ぶんを あわせると もとの かず` }, ...add.steps, { h: eq(`<b>${n}</b> − ${m} ＝ ${r}`), s: `しかくは ${n}` }] }; } },

    // ════ 16 0の たしざんと ひきざん  p88〜89
    { id: 'tm_zero', n: '0の たしざんと ひきざん', page: 88, m: 1, q(d) { const t = R(0, 2);
      if (t === 0) { const nm = pick(['みさき', 'けんた', 'あすか']); const a = d < 0.5 ? R(0, 3) : R(0, 5), b = a === 0 ? R(0, 3) : pick([0, 0, R(1, 3)]); const r = a + b; // p88 たまいれ
        return { text: `たまいれ。${nm}さんは 1かいめ ${a}こ、2かいめ ${b}こ はいりました。あわせて なんこ？`, sayQ: `たまいれ。${nm}さんは いっかいめ ${a}こ、にかいめ ${b}こ はいりました。あわせて なんこ？`, viz: COL(LB('1かいめ', a ? O('ball_red', a) : P('0こ')), LB('2かいめ', b ? O('ball_red', b) : P('0こ'))), ans: String(r), choices: numChoices(r, 0, 8), bigC: true, steps: [{ h: P('はいらなかった ときは 0こ'), s: '1こも はいらない ときは 0こ。0も しきに かけるよ' }, ...(a === 0 || b === 0 ? zeroQ(a, '+', b).steps.slice(-1) : addQ(a, b).steps)] }; }
      if (t === 1) { const k = pick([R(1, 5), 6, 0]), nm = pick(['けんた', 'あすか', 'みさき']); const r = 6 - k; // p89 ボウリング
        return { text: `ペットボトルが ${hon(6)} たって います。${nm}さんは ${k === 0 ? '1ぽんも たおせませんでした' : `${hon(k)} たおしました`}。のこりは なんぼん？`, sayQ: `ペットボトルが ${hon(6)} たって います。${nm}さんは ${k === 0 ? 'いっぽんも たおせませんでした' : `${hon(k)} たおしました`}。のこりは なんぼん？`, viz: O('bottle_pin', 6), ans: String(r), choices: numChoices(r, 0, 8), bigC: true, steps: [{ h: O('bottle_pin', 6, k), s: k ? `${k}ほん たおれた` : 'ひとつも たおれない ときは 0ぽん' }, { h: eq(`6 − ${k} ＝ <b>${r}</b>`), s: `6 ひく ${k} は ${r}` }] }; }
      const e = pick(d < 0.5 ? ['1+0', '4+0', '7+0', '10+0', '0+1', '0+5', '0+9', '0+10'] : ['1-1', '3-3', '8-8', '10-10', '1-0', '5-0', '10-0', '0-0', '0+0', ...L.r8]); return Math.random() < 0.5 ? parse(e) : parse(G.r8()); } },

    // ════ 17 ものと ひとの かず  p90〜93
    { id: 'tm_mono', n: 'ものと ひとの かず', page: 90, m: 1, q(d) {
      if (Math.random() < 0.6) { const n = d < 0.4 ? R(6, 10) : R(11, 15), c = d < 0.4 ? R(2, n - 1) : R(Math.max(n - 9, 5), 9); const r = n - c; // p90 ▲1 いす14 こども9
        return { text: `いすが ${n}きゃく あります。こどもが ${c}にん、1にんずつ すわります。<b>あいて いる いすは</b> なんきゃく？`, sayQ: `いすが ${n}きゃく あります。こどもが ${c}にん、ひとりずつ すわります。あいて いる いすは なんきゃく？`, viz: COL(LB('いす', O('chair', n)), LB('こども', O('child', c))), ans: String(r), choices: numChoices(r, 0, 12), bigC: true, nums: n <= 20 ? [n, c, '-'] : undefined,
          steps: [{ h: COL(LB('いす', O('chair', n, r)), LB('こども', O('child', c))), s: 'いすと こどもを 1つずつ せんで むすぶと、こどもの いない いすが のこる' }, { h: eq(`${n} − ${c}`), s: `いすの かずから こどもの かずを ひく。${n} ひく ${c}` }, ...cq(n, '-', c).steps, { h: big(`${r}きゃく`), s: `あいて いる いすは ${r}きゃく` }] }; }
      const s = d < 0.4 ? R(3, 5) : R(4, 9), t = d < 0.4 ? R(2, 5) : R(Math.max(2, 11 - s), 9), r = s + t; // p90 ▲2 しゃしん
      return { text: `しゃしんを とります。${s}きゃくの いすに 1にんずつ すわり、うしろに ${t}にん たちます。<b>みんなで</b> なんにん？`, sayQ: `しゃしんを とります。${s}きゃくの いすに ひとりずつ すわり、うしろに ${t}にん たちます。みんなで なんにん？`, viz: COL(LB('たつ', O('child', t)), LB('すわる', O('child', s))), ans: String(r), choices: numChoices(r, 2, 20), bigC: true,
        steps: [{ h: P('いす 1きゃくに 1にん → すわる ひとは いすの かずと おなじ'), s: `すわって いるのは ${s}にん` }, { h: eq(`${s} ＋ ${t}`), s: `すわる ${s}にんと たつ ${t}にんを あわせる` }, ...cq(s, '+', t).steps, { h: big(`${r}にん`), s: `みんなで ${r}にん` }] }; } },
    { id: 'tm_junban', n: 'なんばんめ', page: 91, m: 1, q(d) { const t = d < 0.3 ? R(0, 1) : R(0, 3); const row = (n, k, hl) => `<div style="display:flex;align-items:center;gap:8px;justify-content:center"><b style="font-size:22px">まえ</b><span class="sk-dr" style="max-width:520px">${Array.from({ length: n }, (_, i) => `<i class="sk-d ${i === k - 1 ? 'b' : 'a'}${hl && hl(i) ? ' hle' : ''}" style="--i:${i}"${hl ? ` data-n="${i + 1}"` : ''}></i>`).join('')}</span><b style="font-size:22px">うしろ</b></div>`;
      if (t === 0) { const b = d < 0.5 ? R(2, 7) : R(5, 11), k = b + 1; // p91 ▲1 けんたさんの まえに 7にん
        return { text: `1にんずつ じゅんに ならびます。けんたさんの まえに ${b}にん います。けんたさんは まえから なんばんめ？`, sayQ: `ひとりずつ じゅんに ならびます。けんたさんの まえに ${b}にん います。けんたさんは まえから なんばんめ？`, viz: row(k, k), ans: `${k}ばんめ`, choices: chT(`${k}ばんめ`, [`${b}ばんめ`, `${k + 1}ばんめ`, `${b - 1}ばんめ`]), txt: true,
          steps: [{ h: row(k, k, (i) => i < b), s: `まえの ${b}にんの つぎが けんたさん` }, { h: row(k, k, () => true), s: Array.from({ length: k }, (_, i) => i + 1).join('、') }, { h: big(`${k}ばんめ`), s: `けんたさんは まえから ${k}ばんめ` }] }; }
      if (t === 1) { const k = d < 0.5 ? R(3, 8) : R(6, 12), b = k - 1; // p91 ▲2 みさきさんは 6ばんめ
        return { text: `ふねに のります。みさきさんは まえから ${k}ばんめ。みさきさんの <b>まえには</b> なんにん？`, sayQ: `ふねに のります。みさきさんは まえから ${k}ばんめ。みさきさんの まえには なんにん？`, viz: row(k, k), ans: `${b}にん`, choices: chT(`${b}にん`, [`${k}にん`, `${b - 1}にん`, `${k + 1}にん`]), txt: true,
          steps: [{ h: row(k, k, () => true), s: `まえから ${k}ばんめ。みさきさんも いれて ${k}にん` }, { h: row(k, k, (i) => i < b), s: `みさきさんを いれないから ${k} ひく 1` }, { h: big(`${b}にん`), s: `まえには ${b}にん` }] }; }
      if (t === 2) { const k = R(2, 5), u = d < 0.6 ? R(2, 5) : R(5, 9), r = k + u; // p92 ▲3 ももかさんは 3ばんめ うしろに 8にん
        return { text: `ももかさんは まえから ${k}ばんめ。ももかさんの うしろに ${u}にん います。<b>みんなで</b> なんにん？`, sayQ: `ももかさんは まえから ${k}ばんめ。ももかさんの うしろに ${u}にん います。みんなで なんにん？`, viz: row(r, k).replace(/(<i class="sk-d a[^"]*" style="--i:(\d+)")/g, (m0, m1, m2) => (+m2 >= k ? m1.replace('sk-d a', 'sk-d e') : m1)), ans: `${r}にん`, choices: chT(`${r}にん`, [`${r - 1}にん`, `${r + 1}にん`, `${u}にん`]), txt: true,
          steps: [{ h: row(r, k, (i) => i < k), s: `まえから ${k}ばんめ だから、ももかさんまでで ${k}にん` }, { h: eq(`${k} ＋ ${u}`), s: `${k}にんと、うしろの ${u}にんを あわせる` }, ...cq(k, '+', u).steps, { h: big(`${r}にん`), s: `みんなで ${r}にん` }] }; }
      const n = d < 0.6 ? R(6, 10) : R(9, 14), k = R(2, n - 2), r = n - k; // p93 ▲4 9にん ゆうとさんは 5ばんめ
      return { text: `${n}にん ならんで います。ゆうとさんは まえから ${k}ばんめ。ゆうとさんの <b>うしろには</b> なんにん？`, sayQ: `${n}にん ならんで います。ゆうとさんは まえから ${k}ばんめ。ゆうとさんの うしろには なんにん？`, viz: row(n, k), ans: `${r}にん`, choices: chT(`${r}にん`, [`${r + 1}にん`, `${r - 1}にん`, `${k}にん`]), txt: true,
        steps: [{ h: row(n, k, (i) => i < k), s: `ゆうとさんまでで ${k}にん` }, { h: eq(`${n} − ${k}`), s: `ぜんぶの ${n}にんから ${k}にんを ひく` }, ...cq(n, '-', k).steps, { h: big(`${r}にん`), s: `うしろには ${r}にん` }] }; } },

    // ════ わくわく ぷろぐらみんぐ  p94〜95
    { id: 'tm_prog', n: 'ぷろぐらみんぐ', page: 94, m: 1, q(d) { const pool = shuffle([...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめも']); const cell = {}; let k = 0; for (let r = 1; r <= 4; r++) for (let c = 1; c <= 5; c++) if (!(r === 1 && c === 1)) cell[`${r},${c}`] = pool[k++];
      const grid = (bg) => `<div style="display:inline-grid;grid-template-columns:repeat(5,52px);gap:4px">${[4, 3, 2, 1].map((r) => [1, 2, 3, 4, 5].map((c) => `<i style="font-style:normal;width:52px;height:52px;border-radius:10px;background:${(bg && bg(r, c)) || '#fff'};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;border-bottom:4px solid #e3d6e6">${r === 1 && c === 1 ? ill('robot') : cell[`${r},${c}`]}</i>`).join('')).join('')}</div>`;
      const near = (r, c) => [[c, r], [r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].map(([x, y]) => cell[`${x},${y}`]).filter(Boolean);
      if (d < 0.5 || Math.random() < 0.4) { const r = R(2, 4), c = R(1, 5), a = cell[`${r},${c}`]; // p94 したから 2ばんめ、ひだりから 3ばんめ
        return { text: `したから ${r}ばんめ、ひだりから ${c}ばんめ の もじは どれ？`, sayQ: `したから ${r}ばんめ、ひだりから ${c}ばんめ の もじは どれ？`, viz: grid(), ans: a, choices: chT(a, near(r, c)), bigC: true, steps: [
          { h: grid((y) => (y === r ? '#fff2a8' : '')), s: `したから ${r}ばんめの よこの ならび` }, { h: grid((y, x) => (y === r && x === c ? '#5cc183' : y === r ? '#fff2a8' : '')), s: `その なかで ひだりから ${c}ばんめ` }, { h: big(a), s: `こたえは ${a}` }] }; }
      let u = R(0, 3), rt = R(0, 4); if (u + rt === 0) rt = 2; const mv = d > 0.8 ? shuffle([...Array(u).fill('うえ'), ...Array(rt).fill('みぎ')]) : [...Array(u).fill('うえ'), ...Array(rt).fill('みぎ')]; // p95 うえ・みぎ・みぎ
      const r = 1 + u, c = 1 + rt, a = cell[`${r},${c}`]; const path = []; { let y = 1, x = 1; for (const s of mv) { if (s === 'うえ') y++; else x++; path.push(`${y},${x}`); } }
      return { text: `ろぼっとが「${mv.join('・')}」と 1ますずつ すすむと、どの もじに つく？`, sayQ: `ろぼっとが ${mv.join('、')} と ひとますずつ すすむと、どの もじに つく？`, viz: grid(), ans: a, choices: chT(a, near(r, c)), bigC: true, steps: [
        { h: grid((y, x) => (y === 1 && x === 1 ? '#ffb84d' : '')), s: 'ろぼっとは ひだりの いちばん した' }, { h: grid((y, x) => (path.includes(`${y},${x}`) ? (y === r && x === c ? '#5cc183' : '#8ccfff') : '')), s: `${mv.join('、')}。1ますずつ すすむと ここ` }, { h: big(a), s: `こたえは ${a}` }] }; } },

    // ════ ふくしゅう  p96〜97
    { id: 'tm_fuku96', n: 'ふくしゅう（96ページ）', page: 96, m: 1, q(d) { const t = R(0, 4);
      if (t === 0) { const up = Math.random() < 0.5, st = up ? 2 : 1; const s0 = up ? 2 * R(1, 4) : R(14, 20), seq = Array.from({ length: 6 }, (_, i) => (up ? s0 + st * i : s0 - i)); const hi = R(2, 5), a = seq[hi]; // p96 ▲2 2ずつ・1ずつ へる
        return { text: `${seq.map((v, i) => (i === hi ? '□' : v)).join('、')}　□に はいる かずは？`, sayQ: `${seq.map((v, i) => (i === hi ? 'しかく' : v)).join('、')}。しかくに はいる かずは？`, ans: String(a), choices: numChoices(a, 0, 22), bigC: true, steps: [{ h: NL(seq, { q: a }), s: up ? '2ずつ ふえて いるね' : '1ずつ へって いるね' }, { h: NL(seq, { q: a, reveal: true }), s: `${seq[hi - 1]}の つぎは ${a}` }] }; }
      if (t === 1) { const q0 = R(1, 19), sh = (v) => v % 5 === 0; // p96 ▲2 かずの せん
        return { text: 'かずの せんの ？に はいる かずは？', sayQ: 'かずの せんの はてなに はいる かずは？', viz: NL(rng(0, 20), { q: q0, show: sh }), ans: String(q0), choices: numChoices(q0, 0, 20), bigC: true, steps: [{ h: NL(rng(0, 20), { q: q0, show: (v) => sh(v) || Math.abs(v - q0) < 3 }), s: `ちかくの かずから かぞえよう` }, { h: NL(rng(0, 20), { q: q0, reveal: true }), s: `こたえは ${q0}` }] }; }
      if (t === 2) { const add = Math.random() < 0.5; const c = add ? (d < 0.5 ? 6 : R(5, 9)) : (d < 0.5 ? 13 : R(11, 15)); const pt = add ? pick([6, 9, 5, 7, 0, 4, 8, 2]) : pick([8, 0, 3, 2, 7, 4, 9, 5].filter((v) => v <= c)); // p97 ▲3 はなの けいさん
        const q = cq(c, add ? '+' : '-', pt); q.viz = P(`まんなかの ${c}に はなびらの ${pt}を ${add ? 'たす' : 'ひく'}`); return q; }
      if (t === 3) { const ok = pick([`${R(8, 9)}+${R(3, 5)}`, `${R(17, 19)}-${R(5, 6)}`]); const ng = [`${R(2, 4)}+${R(3, 6)}`, `${R(11, 12)}-${R(2, 5)}`, `${R(5, 6)}+${R(2, 4)}`, `${R(13, 15)}-${R(4, 6)}`].filter((e) => valOf(e) <= 10); const ch = shuffle([ok, ...shuffle(ng).slice(0, 2)]); // ❗p97 ▲5
        return { text: 'こたえが 10より おおきく なるのは どれ？', sayQ: 'こたえが じゅうより おおきく なるのは どれ？', ans: show(ok), choices: ch.map(show), txt: true, steps: [{ h: P(ch.map((e) => `${show(e)} ＝ ${valOf(e)}`).join('<br>')), s: 'ひとつずつ けいさん して みよう' }, { h: eq(`${show(ok)} ＝ <b>${valOf(ok)}</b>`), s: `10より おおきいのは ${valOf(ok)}` }] }; }
      const a = d < 0.5 ? 13 : R(11, 16), b = d < 0.5 ? 6 : R(a - 9, 9), r = a - b; // ❗p97 ▲6 すずめ13 はと6
      return wq({ a, op: '-', b, u: 'わ', text: `すずめが ${a}わ、はとが ${b}わ います。すずめは はとより なんわ おおい？`, viz: COL(LB('すずめ', O('sparrow', a)), LB('はと', O('pigeon', b))), kw: 'ちがいは ひきざん', kws: `どちらが おおいかの ちがいは ${a} ひく ${b}` }); } },

    // ════ 18 大きい かず  p98〜111
    { id: 'tm_kazoe', n: 'ぼうの かずを かぞえる', page: 98, m: 1, q(d) { const t = d < 0.4 ? R(2, 4) : R(2, 9), o = R(0, 9), n = t * 10 + o; // p98 26・30、p99 42・60、p100 54・70・43
      const ch = chT(n, [o * 10 + t, n + 1, n - 1, n + 10, n - 10].filter((v) => v > 0 && v < 100 && v !== n), d < 0.5 ? 3 : 4);
      return { text: 'ぼうは なんぼん？', sayQ: 'ぼうは なんぼん あるかな？', viz: BD(n), ans: String(n), choices: ch, bigC: true, steps: [
        { h: O('stick10', t), s: `10ぽんの たばが ${t}こで ${t * 10}` }, { h: BD(n), s: o ? `ばらが ${hon(o)}` : 'ばらは ない' }, { h: PV(t, o) + eq(`${t * 10} と ${o} で <b>${n}</b>`), s: o ? `${t * 10}と ${o}で ${n}` : `こたえは ${n}` }] }; } },
    { id: 'tm_kurai', n: 'くらいと かず', page: 100, m: 1, q(d) { const t = R(1, 9), o = d < 0.3 ? R(1, 9) : R(0, 9), n = t * 10 + o, k = R(0, 3);
      if (k === 0) return { text: `じゅうの くらいが ${t}、いちの くらいが ${o}の かずは？`, sayQ: `じゅうの くらいが ${t}、いちの くらいが ${o}の かずは？`, viz: PV(t, '？'), ans: String(n), choices: chT(n, [o * 10 + t, n + 1, n - 1, n + 10, n - 10].filter((v) => v > 0 && v < 100)), bigC: true, steps: [{ h: PV(t, o), s: 'ひだりが じゅうの くらい、みぎが いちの くらい' }, { h: big(String(n)), s: `${t}と ${o}を ならべて ${n}` }] }; // p100 ▲3 49
      if (k === 1) return { text: `10が ${t}つと 1が ${o}つで いくつ？`, sayQ: `じゅうが ${t}つと いちが ${o}つで いくつ？`, ans: String(n), choices: chT(n, [o * 10 + t, t + o, n + 10, n - 1].filter((v) => v > 0 && v < 100)), bigC: true, steps: [{ h: BD(n), s: `10が ${t}つで ${t * 10}` }, { h: PV(t, o) + eq(`<b>${n}</b>`), s: `${t * 10}と ${o}で ${n}` }] }; // p101 ▲4・▲5
      const askT = k === 2; const ans = askT ? t : o; // p101 ▲7 56は 10が □つと 1が □つ
      return { text: o === 0 && askT ? `${n}は 10が いくつ？` : `${n}は 10が ${askT ? '□' : t}つと 1が ${askT ? o : '□'}つ。□は？`, sayQ: o === 0 && askT ? `${n}は じゅうが いくつ？` : askT ? `${n}は、じゅうが いくつと、いちが ${o}つ？` : `${n}は、じゅうが ${t}つと、いちが いくつ？`, ans: String(ans), choices: numChoices(ans, 0, 10), bigC: true, steps: [{ h: PV(t, o, askT ? 't' : 'o'), s: `${n}の ${askT ? 'じゅうの くらいは ' + t : 'いちの くらいは ' + o}` }, { h: BD(n), s: `10の たばが ${t}こ、ばらが ${o}こ。こたえは ${ans}` }] }; } },
    { id: 'tm_100', n: '100までの かず', page: 102, m: 1, q(d) { const t = R(0, 4);
      if (t === 0) { const up = Math.random() < 0.5, k = d < 0.5 ? 1 : R(1, 4), base = up ? R(20, 99 - k) : R(20 + k, 100), a = up ? base + k : base - k; // p103 ▲3
        return { text: `${base}より ${k} ${up ? 'おおきい' : 'ちいさい'} かずは？`, sayQ: `${base}より ${k} ${up ? 'おおきい' : 'ちいさい'} かずは？`, ans: String(a), choices: chT(a, [up ? base - k : base + k, a + 1, a - 1, a + (up ? 1 : -1) * 10].filter((v) => v >= 0 && v <= 101)), bigC: true, steps: [{ h: NL(rng(Math.min(base, a) - 1, Math.max(base, a) + 1), { q: a, hl: [base] }), s: `${base}から ${up ? 'みぎへ' : 'ひだりへ'} ${k}つ` }, { h: NL(rng(Math.min(base, a) - 1, Math.max(base, a) + 1), { q: a, reveal: true, hl: [base] }), s: `こたえは ${a}` }] }; }
      if (t === 1) { const a = d < 0.5 ? pick([92, 48, 69, R(31, 89)]) : R(31, 89), b = a + pick([10, -10]), c = Math.floor(a / 10) * 10 + ((a % 10) + R(1, 8)) % 10; const cs = uniq([a, b, c]); const bg = Math.max(...cs); // p104 ▲5 92と76・48と38・69と65
        return { text: 'いちばん おおきい かずは どれ？', sayQ: `${cs.join('、')}。いちばん おおきい かずは どれ？`, ans: String(bg), choices: shuffle(cs.map(String)), bigC: true, steps: [{ h: `<div class="sk-pvrow">${cs.map((v) => PV(Math.floor(v / 10), v % 10)).join('')}</div>`, s: 'まず じゅうの くらいを くらべる。おなじ なら いちの くらいで くらべる' }, ...(() => { const T = Math.floor(bg / 10), tie = cs.filter((v) => Math.floor(v / 10) === T).sort((x, y) => x - y); const s2 = { h: `<div class="sk-pvrow">${cs.map((v) => `<div class="${Math.floor(v / 10) === T ? 'win' : 'lose'}">${PV(Math.floor(v / 10), v % 10, 't')}</div>`).join('')}</div>`, s: tie.length > 1 ? `じゅうの くらいを くらべると、のこるのは ${tie.join('と ')}` : `じゅうの くらいが いちばん おおきいのは ${T}。いちばん おおきいのは ${bg}` }; return tie.length > 1 ? [s2, { h: `<div class="sk-pvrow">${tie.map((v) => `<div class="${v === bg ? 'win' : 'lose'}">${PV(T, v % 10, 'o')}</div>`).join('')}</div>`, s: `${tie.join('と ')}は、じゅうの くらいが おなじ ${T}。いちの くらいは ${tie.filter((v) => v !== bg).map((v) => v % 10).join('、')}より ${bg % 10}が おおきいね。いちばん おおきいのは ${bg}` }] : [s2]; })()] }; }
      if (t === 2) { const s = pick(pickD(d, [[1], [1, 10], [5, 10, 2], [5, -1, 2, -5]])), len = 6; const s0 = s === 1 ? R(20, 95) : s === 2 ? 2 * R(5, 45) : s === 5 ? 5 * R(1, 14) : s === 10 ? 10 * R(1, 5) : s === -1 ? R(26, 100) : 5 * R(6, 20); // p105 ▲7・▲8
        const seq = Array.from({ length: len }, (_, i) => s0 + s * i); const hi = R(2, len - 1), a = seq[hi];
        return { text: `${seq.map((v, i) => (i === hi ? '□' : v)).join('、')}　□に はいる かずは？`, sayQ: `${seq.map((v, i) => (i === hi ? 'しかく' : v)).join('、')}。しかくに はいる かずは？`, ans: String(a), choices: chT(a, [a + 1, a - 1, a + s, a - s, a + 10].filter((v) => v >= 0 && v <= 110)), bigC: true, steps: [{ h: NL(seq, { q: a }), s: `${Math.abs(s)}ずつ ${s > 0 ? 'ふえて' : 'へって'} いるね` }, { h: NL(seq, { q: a, reveal: true }), s: `${seq[hi - 1]}の つぎは ${a}` }] }; }
      if (t === 3) { const b = d < 0.5 ? R(1, 9) * 10 : R(81, 99), r = 100 - b; // p105 ▲9 あと いくつで 100
        return { text: `${b}は、あと いくつで 100？`, sayQ: `${b}は、あと いくつで ひゃく？`, ans: String(r), choices: chT(r, [r + 10, r - 10, r + 1, r - 1, 10 - (b % 10)].filter((v) => v > 0 && v <= 100)), bigC: true, steps: b % 10 === 0 ? [{ h: B10(b), s: `${b}は 10が ${b / 10}こ` }, { h: eq(`10が ${b / 10}こ と <b>${10 - b / 10}</b>こ で 100`), s: `100は 10が 10こ。あと ${10 - b / 10}こで ${r}` }] : [{ h: NL(rng(b, 100), { q: 100, reveal: true, hl: [b] }), s: `${b}から 100まで かぞえよう` }, { h: eq(`${b} と <b>${r}</b> で 100`), s: `あと ${r}で 100` }] }; }
      const big_ = Math.random() < 0.5, cs = []; while (cs.length < (d < 0.5 ? 3 : 4)) { const v = R(15, 99); if (!cs.includes(v)) cs.push(v); } const a = big_ ? Math.max(...cs) : Math.min(...cs); // p105 ▲6・p111 あんごう
      return { text: `いちばん ${big_ ? 'おおきい' : 'ちいさい'} かずは どれ？`, sayQ: `いちばん ${big_ ? 'おおきい' : 'ちいさい'} かずは どれ？`, ans: String(a), choices: shuffle(cs.map(String)), bigC: true, steps: (() => { const W = big_ ? 'おおきい' : 'ちいさい', T = Math.floor(a / 10), tie = cs.filter((v) => Math.floor(v / 10) === T).sort((x, y) => x - y), row = (L, hl, on) => `<div class="sk-pvrow">${L.map((v) => `<div class="${on ? (on(v) ? 'win' : 'lose') : ''}">${PV(Math.floor(v / 10), v % 10, hl)}</div>`).join('')}</div>`;
        const st = [{ h: row(cs, 't', null), s: 'まず じゅうの くらいを くらべる' }, { h: row(cs, 't', (v) => Math.floor(v / 10) === T), s: tie.length > 1 ? `じゅうの くらいが いちばん ${W}のは ${T}。のこるのは ${tie.join('と ')}` : `じゅうの くらいが いちばん ${W}のは ${T}。だから ${a}` }];
        if (tie.length > 1) st.push({ h: row(tie, 'o', (v) => v === a), s: `いちの くらいで くらべると、いちばん ${W}のは ${a}` }); return st; })() }; } },
    { id: 'tm_okane', n: 'おかねで かいもの', page: 107, m: 2, q(d) { let price = pick([28, 36, 52, R(21, 59)]); while (price % 10 === 0) price = R(21, 59); const t = Math.floor(price / 10), o = price % 10, nm = { 28: 'ガム', 36: 'あめ', 52: 'グミ' }[price] || 'おかし'; const k = d < 0.4 ? 0 : R(0, 2);
      const coins = (n10, n5, n1) => `<div class="sk-objs">${[...Array(n10).fill('coin10'), ...Array(n5).fill('coin5'), ...Array(n1).fill('coin1')].map((x) => `<i class="sk-d emo-d">${ill(x)}</i>`).join('')}</div>`;
      if (k === 0) return { text: `10えんだまが ${t}まいと 1えんだまが ${o}まい。ぜんぶで なんえん？`, sayQ: `じゅうえんだまが ${t}まいと いちえんだまが ${o}まい。ぜんぶで なんえん？`, viz: coins(t, 0, o), ans: `${price}えん`, choices: chT(`${price}えん`, [`${o * 10 + t}えん`, `${t + o}えん`, `${price + 10}えん`, `${price - 1}えん`]), txt: true, steps: [{ h: coins(t, 0, 0), s: `10えんが ${t}まいで ${t * 10}えん` }, { h: `<span class="sk-grp">${coins(t, 0, 0)}<b>${t * 10}えん</b></span>` + OP('＋') + `<span class="sk-grp">${coins(0, 0, o)}<b>${o}えん</b></span>`, s: `10えんだまで ${t * 10}えん。1えんだまで ${o}えん` }, { h: eq(`${t * 10}えん ＋ ${o}えん ＝ <b>${price}えん</b>`), s: `${t * 10}えんと ${o}えん。あわせて ${price}えん` }] }; // p107 そら「10が2つと1が8つ」
      if (k === 1) { const f = Math.floor(price / 5), r1 = price % 5; return { text: `5えんだまが ${f}まいと 1えんだまが ${r1}まい。ぜんぶで なんえん？`, sayQ: `ごえんだまが ${f}まいと いちえんだまが ${r1}まい。ぜんぶで なんえん？`, viz: coins(0, f, r1), ans: `${price}えん`, choices: chT(`${price}えん`, [`${f + r1}えん`, `${price + 5}えん`, `${price - 5}えん`, `${price + 1}えん`]), txt: true, steps: [{ h: coins(0, f, 0), s: Array.from({ length: f }, (_, i) => (i + 1) * 5).join('、') }, { h: coins(0, f, r1) + eq(`<b>${price}</b>えん`), s: r1 ? `${f * 5}から ${Array.from({ length: r1 }, (_, i) => f * 5 + i + 1).join('、')}。${price}えん` : `${price}えん` }] }; } // p107 れん「5、10、15…」
      return { text: `${price}えんの ${nm}を かいます。10えんだま ${t}まいと、1えんだまは なんまい いる？`, sayQ: `${price}えんの ${nm}を かいます。じゅうえんだま ${t}まいと、いちえんだまは なんまい いる？`, viz: coins(t, 0, 0), ans: `${o}まい`, choices: chT(`${o}まい`, [`${t}まい`, `${o + 1}まい`, `${o > 1 ? o - 1 : o + 2}まい`, `${price}まい`]), txt: true, steps: [{ h: PV(t, o), s: `${price}は 10が ${t}つと 1が ${o}つ` }, { h: coins(t, 0, o), s: `1えんだまは ${o}まい` }] }; } },
    { id: 'tm_100koe', n: '100より おおきい かず', page: 108, m: 2, q(d) { const t = R(0, 2);
      if (t === 0) { const x = d < 0.4 ? pick([13, 20, 6]) : R(1, 20), n = 100 + x; // p108 113・120・106
        return { text: 'ぼうは なんぼん？', sayQ: 'ぼうは なんぼん あるかな？', viz: BD(n), ans: String(n), choices: chT(n, [100 + (x % 10) * 10 + Math.floor(x / 10), n + 1, n - 1, n + 10, x < 10 ? 100 + x * 10 : n - 10].filter((v) => v > 100 && v <= 130)), bigC: true, steps: [{ h: O('stick100', 1), s: '10の たばが 10こで 100' }, { h: BD(n), s: `100と ${x}` }, { h: eq(`100 と ${x} で <b>${n}</b>`), s: `ひゃくと ${x}で ${n}` }] }; }
      if (t === 1) { const lo = d < 0.5 ? R(90, 100) : R(95, 110), vals = rng(lo, lo + 10), q0 = pick(vals.slice(1, -1).filter((v) => v % 5)); // p109 ▲4 かずの せん
        return { text: 'かずの せんの ？に はいる かずは？', sayQ: 'かずの せんの はてなに はいる かずは？', viz: NL(vals, { q: q0, show: (v) => v % 5 === 0 || v === lo }), ans: String(q0), choices: chT(q0, [q0 + 1, q0 - 1, q0 + 10, q0 - 10, q0 > 100 ? q0 - 100 : q0 + 2].filter((v) => v > 0)), bigC: true, steps: [{ h: NL(vals, { q: q0, show: (v) => v % 5 === 0 || v === lo || Math.abs(v - q0) < 2 }), s: '1めもりは 1。となりの かずから かぞえよう' }, { h: NL(vals, { q: q0, reveal: true }), s: `こたえは ${q0}` }] }; }
      const items = shuffle([['はさみ', 120], ['のり', 95], ['けしゴム', 78], ['ノート', 103]].map(([a, p]) => [a, Math.random() < 0.5 ? p : p > 100 ? R(101, 120) : R(60, 99)])); const ok = items.find((x) => x[1] <= 100), ng = items.filter((x) => x[1] > 100); // p109 ▲3 100えんで かえる？
      const lab = (x) => `${x[0]}（${x[1]}えん）`; const ch = shuffle([ok, ...ng]).map(lab);
      return { text: '100えんで かえるのは どれ？', sayQ: 'ひゃくえんで かえるのは どれ？', viz: O('coin100', 1), ans: lab(ok), choices: ch, txt: true, steps: [{ h: P(items.map((x) => `${lab(x)} ${x[1] <= 100 ? '100より ちいさい' : '100より おおきい'}`).join('<br>')), s: '100より おおきいと、100えんでは たりない' }, { h: big(ok[0]), s: `${ok[0]}は ${ok[1]}えん。100えんで かえる` }] }; } },

    // ════ 19 なんじ なんぷん  p112〜114
    { id: 'tm_jifun', n: 'なんじ なんぷん', page: 112, m: 2, q(d) { const h = R(1, 12), m = d < 0.3 ? pick([10, 30, 15, 45, 20, 50, 5, 40]) : d < 0.6 ? R(1, 11) * 5 : R(1, 59), nx = (h % 12) + 1, pv = h === 1 ? 12 : h - 1; const ans = TL(h, m);
      const st = [{ h: CLK(h, m) + P('<span style="color:#ff6b6b">みじかい はり</span>で なんじ'), s: `みじかい はりは ${h}と ${nx}の あいだ。まだ ${nx}に なって いないから ${h}じ` }, { h: CLK(h, m).replace('class="sk-clk" viewBox="0 0 100 100"', 'class="sk-clk mins" viewBox="-14 -14 128 128"').replace('</svg>', Array.from({ length: Math.max(1, Math.floor(m / 5)) }, (_, i) => { const b = ((i + 1) / 12) * Math.PI * 2; return `<text x="${50 + Math.sin(b) * 55}" y="${52.5 - Math.cos(b) * 55}" font-size="9.5" text-anchor="middle" fill="#2f7fe0" font-weight="900" style="animation:skfade .25s ${(i * 0.3).toFixed(2)}s both">${(i + 1) * 5}</text>`; }).join('') + '</svg>') + P('<span style="color:#4d8af0">ながい はり</span>で なんぷん'), run: () => new Promise((ok) => setTimeout(ok, Math.max(1, Math.floor(m / 5)) * 300 + 200)), s: m < 5 ? `ながい はりは 12から ${m}つ すすんで いるね。${m}${fun(m)}` : m < 10 ? `ながい はりが 1の ところは 5${fun(5)}${m % 5 ? `。そこから 1ずつ かぞえて ${m}` : ''}。${m}${fun(m)}` : `ながい はりを 5ずつ かぞえよう。${Array.from({ length: Math.floor(m / 5) }, (_, i) => (i + 1) * 5).join('、')}${m % 5 ? `。そこから 1ずつ かぞえて ${m}` : ''}。${m}${fun(m)}` }, { h: big(ans), s: `こたえは ${ans}` }];
      if (Math.random() < 0.3 && d >= 0.3) { const a = DG(h, m), sw = DG(Math.round(m / 5) || 12, Math.min(59, h * 5)), mis = DG(h, Math.max(1, Math.round(m / 5))); // p114 ▲6 おなじ とけいは
        return { text: 'この とけいと おなじ じこくは どれ？', sayQ: 'この とけいと おなじ じこくは どれ？', viz: CLK(h, m), ans: a, choices: chT(a, [sw, mis, DG(m >= 30 ? nx : pv, m), DG(h, (m + 10) % 60)]), bigC: true, steps: [...st.slice(0, 2), { h: big(a), s: `${ans}。すうじの とけいでは ${a} と かく` }] }; }
      const ch = chT(ans, [TL(m >= 30 ? nx : pv, m), TL(h, Math.max(1, Math.round(m / 5))), TL(h, (m + 5) % 60 || 5), TL(h, m >= 6 ? m - 5 : m + 10)].filter((x) => x !== ans), d < 0.5 ? 3 : 4); // p113 9じ10ぷん・9じ58ふん、p114 ▲5
      return { text: 'とけいは なんじ なんぷん？', sayQ: 'とけいは なんじ なんぷん？', viz: CLK(h, m), ans, choices: ch, txt: true, steps: st }; } },

    // ════ 20 おなじ かずずつ  p115
    { id: 'tm_wakeru', n: 'おなじ かずずつ', page: 115, m: 2, q(d) { const ppl = d < 0.5 ? pick([2, 3]) : R(2, 4), per = d < 0.5 ? R(2, 4) : R(2, 5), tot = ppl * per;
      const rows = (n) => COL(...Array.from({ length: ppl }, (_, i) => LB(`${i + 1}にんめ`, O('cookie', n))));
      if (Math.random() < 0.5) return { text: `クッキーが ${tot}こ あります。${ppl}にんで おなじ かずずつ わけると、1にん なんこ？`, sayQ: `クッキーが ${tot}こ あります。${ppl}にんで おなじ かずずつ わけると、ひとり なんこ？`, viz: O('cookie', tot), ans: `${per}こ`, choices: chT(`${per}こ`, [`${per + 1}こ`, `${per - 1}こ`, `${ppl}こ`, `${per + 2}こ`].filter((x) => x !== '0こ' && x !== '1こ')), txt: true, // p115 ▲1 12こを 3にんで
        steps: [{ h: rows(1), s: `${ppl}にんに 1こずつ くばるよ` }, { h: rows(per), s: `ぜんぶ なくなるまで、1こずつ じゅんばんに くばる` }, { h: eq(`${Array(ppl).fill(per).join(' ＋ ')} ＝ ${tot}`), s: `1にん ${per}こで ちょうど ${tot}こ` }, { h: big(`${per}こ`), s: `こたえは ${per}こ` }] };
      const grp = COL(...Array.from({ length: ppl }, () => `<span style="border:3px dashed #4dabf0;border-radius:14px;padding:4px 8px">${O('candy', per)}</span>`));
      return { text: `あめが ${tot}こ あります。1にんに ${per}こずつ わけると、なんにんに わけられる？`, sayQ: `あめが ${tot}こ あります。ひとりに ${per}こずつ わけると、なんにんに わけられる？`, viz: O('candy', tot), ans: `${ppl}にん`, choices: chT(`${ppl}にん`, [`${ppl + 1}にん`, `${ppl - 1}にん`, `${per}にん`, `${ppl + 2}にん`].filter((x) => x !== '1にん' && x !== `${ppl}にん`)), txt: true, // p115 ▲2 8こを 2こずつ
        steps: [{ h: grp, s: `${per}こずつ かこんで みよう` }, { h: grp + big(`${ppl}にん`), s: `かこみが ${ppl}つ。${ppl}にんに わけられる` }] }; } },

    // ════ たすのかな ひくのかな  p116〜117
    { id: 'tm_tasuhiku', n: 'たすのかな ひくのかな', page: 116, m: 2, q(d) { const t = R(0, 2);
      const mk = (a, op, b, u, text, kw, kws, viz) => { const r = op === '+' ? a + b : a - b, w = op === '+' ? a - b : a + b, fx = (n) => (u === 'ほん' ? hon(n) : `${n}${u}`); return wq({ a, op, b, u, text, viz, kw, kws, choices: chT(fx(r), [Math.abs(w), r + 1, r - 1].filter((x) => x > 0).map(fx), 3), ansS: fx(r) }); };
      if (t === 0) { const a = d < 0.5 ? 6 : R(4, 9), b = d < 0.5 ? 7 : R(11 - a, 9); return mk(a, '+', b, 'にん', `はるなさんたちは ${a}にんで あそんで いました。ともだちが ${b}にん きました。<b>みんなで</b> なんにん？`, KW_AWASE('みんなで'), 'きて ふえたから たしざん', COL(LB('はじめ', O('child', a)), LB('きた', O('child', b)))); } // p116
      if (t === 1) { const a = d < 0.5 ? 12 : R(11, 16), b = d < 0.5 ? 8 : R(a - 9, 9); return mk(a, '-', b, 'わ', `とりが ${a}わ きに とまって いました。そのうち ${b}わ とんで いきました。<b>のこりは</b> なんわ？`, KW_NOKORI('のこりは'), 'とんで いって へったから ひきざん', O('sparrow', a)); } // p117 ▲2
      const a = d < 0.5 ? 7 : R(4, 9), b = d < 0.5 ? 8 : R(11 - a, 9); return mk(a, '+', b, 'ほん', `きいろい かさが ${hon(a)}、あおい かさが ${hon(b)} あります。<b>ぜんぶで</b> なんぼん？`, KW_AWASE('ぜんぶで'), 'ぜんぶで、は あわせるから たしざん', COL(LB('きいろ', dots(a, 'a')), LB('あお', dots(b, 'b')))); } }, // p117 ▲3

    // ════ ふくしゅう  p118〜119
    { id: 'tm_fuku118', n: 'ふくしゅう（118ページ）', page: 118, m: 2, q(d) { const t = R(0, 4);
      if (t === 0) { const ops = d < 0.5 ? 2 : 3; let v = R(4, 8); const seq = []; const s0 = v; for (let i = 0; i < ops; i++) { const op = v >= 11 ? '-' : v <= 6 ? '+' : pick(['+', '-']); const b = op === '+' ? R(2, Math.min(9, 18 - v)) : R(2, Math.min(9, v - 1)); seq.push([op, b, v]); v = op === '+' ? v + b : v - b; } // p118 ▲3 けいさんの リレー
        const chain = (k) => `${s0} ${seq.slice(0, k).map(([op, b]) => `→ ${b}を ${op === '+' ? 'たす' : 'ひく'}`).join(' ')}`;
        return { text: `けいさんの りれえ。${chain(ops)} → ？`, sayQ: `けいさんの りれえ。${s0} から、${seq.map(([op, b]) => `${b}を ${op === '+' ? 'たす' : 'ひく'}`).join('、')}。こたえは いくつ？`, ans: String(v), choices: numChoices(v, 0, 20), bigC: true,
          steps: seq.map(([op, b, x], i) => { const y = op === '+' ? x + b : x - b; return { h: eq(`${x} ${SY(op)} ${b} ＝ <b>${y}</b>`), s: `${x} ${WD(op)} ${b} は ${y}` }; }).concat([{ h: big(String(v)), s: `さいごは ${v}` }]) }; }
      if (t === 1) { const add = Math.random() < 0.5, c = add ? 7 : 14, pt = add ? pick([2, 6, 9, 5, 7, 0, 3, 8]) : pick([5, 6, 8, 3, 2, 7, 4, 9]); const q = cq(c, add ? '+' : '-', pt); q.viz = P(`まんなかの ${c}に はなびらの ${pt}を ${add ? 'たす' : 'ひく'}`); return q; } // p118 ▲2
      if (t === 2) { const k = R(0, 2); // p118 ▲1・p119 ▲7
        if (k === 0) { const x = R(1, 19), n = 100 + x; return { text: `${n}は 100と いくつを あわせた かず？`, sayQ: `${n}は ひゃくと いくつを あわせた かず？`, ans: String(x), choices: chT(x, [x + 10, x - 1, x + 1, n - 10, Math.floor(x / 10) + (x % 10)].filter((v) => v > 0 && v < 120)), bigC: true, steps: [{ h: BD(n), s: `${n}は 100と ${x}` }, { h: eq(`100 と <b>${x}</b> で ${n}`), s: `こたえは ${x}` }] }; }
        if (k === 1) { const t2 = R(2, 9), n = t2 * 10; return { text: `${n}は 10が いくつ？`, sayQ: `${n}は じゅうが いくつ？`, ans: String(t2), choices: numChoices(t2, 1, 10), bigC: true, steps: [{ h: B10(n), s: `10の たばが ${t2}こ` }, { h: big(String(t2)), s: `${n}は 10が ${t2}こ` }] }; }
        const o = R(1, 9), n = 100 + o; return { text: 'ぼうは なんぼん？', sayQ: 'ぼうは なんぼん あるかな？', viz: BD(n), ans: String(n), choices: chT(n, [100 + o * 10, 10 + o, n + 1, n - 1]), bigC: true, steps: [{ h: BD(n), s: `100の たばと ばらが ${o}` }, { h: eq(`100 と ${o} で <b>${n}</b>`), s: `ひゃくと ${o}で ${n}` }] }; }
      if (t === 3) { const a = d < 0.5 ? 12 : R(11, 15), b = d < 0.5 ? 9 : R(a - 9, 9); return wq({ a, op: '-', b, u: 'こ', text: `みかんが ${a}こ あります。${b}にんの こどもに 1こずつ あげると、のこりは なんこ？`, viz: COL(LB('みかん', O('mikan', a)), LB('こども', O('child', b))), kw: KW_NOKORI('のこりは'), kws: `${b}にんに 1こずつ だから ${b}こ へる` }); } // p119 ▲5
      const tg = d < 0.5 ? 5 : R(5, 9), seq = Array.from({ length: tg - 1 }, (_, i) => [i + 1, tg - i - 1]), hi = R(1, seq.length - 2 >= 1 ? seq.length - 2 : 1), [x, y] = seq[hi]; const a = `${x} ＋ ${y}`; // p119 ▲6
      return { text: `こたえが ${tg}に なる たしざん。${seq.map(([p, q], i) => (i === hi ? '□' : `${p} ＋ ${q}`)).join('、')}　□は どれ？`, sayQ: `こたえが ${tg}に なる たしざんの かあど。しかくに はいるのは どれ？`, ans: a, choices: chT(a, [`${x} ＋ ${y + 1}`, `${x + 1} ＋ ${y + 1}`, `${x} ＋ ${y - 1}`, `${x - 1} ＋ ${y - 1}`].filter((c) => c !== a && !/^0 |＋ 0$/.test(c))), txt: true,
        steps: [{ h: P(seq.map(([p, q]) => `${p} ＋ ${q}`).join('<br>')), s: 'まえの かずが 1ずつ ふえて、うしろの かずが 1ずつ へって いる' }, { h: eq(`${a} ＝ <b>${tg}</b>`), s: `□は ${x} たす ${y}` }] }; } },

    // ════ 21 100までの かずの けいさん  p120〜123
    { id: 'tm_nanju', n: 'なん十の けいさん', page: 120, m: 3, q(d) { const add = Math.random() < 0.5;
      if (Math.random() < 0.35) { if (add) { const a = d < 0.5 ? 40 : R(1, 8) * 10, b = d < 0.5 ? 30 : R(1, 10 - a / 10) * 10; return wq({ a, op: '+', b, u: 'こ', text: `いちごあじの あめが ${a}こ、めろんあじの あめが ${b}こ あります。<b>あわせて</b> なんこ？`, kw: KW_AWASE('あわせて'), kws: 'あわせて、だから たしざん', choices: undefined }); } // p120 ▲1
        const a = d < 0.5 ? 70 : R(3, 10) * 10, b = d < 0.5 ? 20 : R(1, a / 10 - 1) * 10; return wq({ a, op: '-', b, u: 'こ', text: `あめが ${a}こ あります。${b}こ たべると、<b>のこりは</b> なんこ？`, kw: KW_NOKORI('のこりは'), kws: 'たべると へる。のこりは ひきざん' }); } // p120 ▲3
      return parse(Math.random() < 0.5 ? pick(add ? ['40+20', '70+10', '30+50', '20+80'] : ['70-30', '60-40', '90-50', '100-10']) : add ? `${R(1, 8) * 10}+${R(1, 2) * 10}` : `${R(3, 10) * 10}-${R(1, 2) * 10}`); } },
    { id: 'tm_nanjuto', n: 'なん十と いくつ', page: 121, m: 3, q(d) { const add = Math.random() < 0.5, t = R(2, 9) * 10, o = R(1, 9);
      if (Math.random() < 0.35) return add ? wq({ a: d < 0.5 ? 20 : t, op: '+', b: d < 0.5 ? 6 : o, u: 'まい', text: `いろがみが ${d < 0.5 ? 20 : t}まい あります。${d < 0.5 ? 6 : o}まい もらうと、<b>ぜんぶで</b> なんまい？`, kw: KW_FUERU('もらうと'), kws: 'もらうと ふえる。たしざん' }) // p121 ▲5
        : wq({ a: d < 0.5 ? 34 : t + o, op: '-', b: d < 0.5 ? 4 : o, u: 'まい', text: `いろがみが ${d < 0.5 ? 34 : t + o}まい あります。${d < 0.5 ? 4 : o}まい つかうと、<b>のこりは</b> なんまい？`, kw: KW_NOKORI('のこりは'), kws: 'つかうと へる。ひきざん' }); // p121 ▲7
      return parse(Math.random() < 0.4 ? pick(add ? ['20+3', '30+2', '70+5', '90+9'] : ['37-7', '46-6', '65-5', '82-2']) : add ? `${t}+${o}` : `${t + o}-${o}`); } },
    { id: 'tm_2keta', n: '2けたと 1けたの けいさん', page: 122, m: 3, q(d) { const add = Math.random() < 0.5;
      if (d > 0.8 && Math.random() < 0.25) return parse(add ? `${R(1, 8) * 10 + R(1, 9)}+10` : `${R(2, 9) * 10 + R(1, 9)}-10`); // p122・p123 さんすうぽけっと 25＋10・36−10
      if (Math.random() < 0.35) { if (add) { const t = d < 0.5 ? 30 : R(2, 9) * 10, o = d < 0.5 ? 2 : R(1, 7), b = d < 0.5 ? 5 : R(1, 9 - o); return wq({ a: t + o, op: '+', b, u: 'こ', text: `おはじきが ${t + o}こ あります。${b}こ もらうと、<b>ぜんぶで</b> なんこ？`, kw: KW_FUERU('もらうと'), kws: 'もらうと ふえる。たしざん' }); } // p122 ▲9
        const t = d < 0.5 ? 20 : R(2, 9) * 10, o = d < 0.5 ? 7 : R(2, 9), b = d < 0.5 ? 4 : R(1, o - 1); return wq({ a: t + o, op: '-', b, u: 'こ', text: `おはじきが ${t + o}こ あります。${b}こ あげると、<b>のこりは</b> なんこ？`, kw: `「<b class="mark">あげると</b>」→ へる → ひきざん`, kws: 'あげると へる。ひきざん' }); } // p123 ▲11
      return parse(Math.random() < 0.4 ? pick(add ? ['32+6', '72+2', '43+4', '26+3', '82+7', '53+3', '65+2', '94+4'] : ['27-3', '49-5', '95-3', '38-5', '79-8', '29-4', '88-2', '69-7']) : fromList('r11')); } },

    // ════ 22 おおい ほう すくない ほう  p124〜125
    { id: 'tm_ooi', n: 'おおい ほう すくない ほう', page: 124, m: 3, q(d) { const t = R(0, 3); const big_ = d >= 0.5;
      const S = [[5, 3, '+', 'こ', ['たいき', 'ひまり'], 'たいきさんの うえきばちに めが {a}こ でました。ひまりさんは たいきさんより {b}こ おおく でました。ひまりさんは なんこ？'], // p124 ▲1
        [8, 4, '+', 'ひき', ['ひまり', 'たいき'], 'きんぎょすくい。ひまりさんは {a}ひき すくいました。たいきさんは ひまりさんより {b}ひき おおく すくいました。たいきさんは なんびき？'], // p124 ▲2
        [9, 2, '-', 'こ', ['たいき', 'ひまり'], 'たいきさんは どんぐりを {a}こ ひろいました。ひまりさんは たいきさんより {b}こ すくなかった。ひまりさんは なんこ？'], // p125 ▲3
        [12, 3, '-', 'こ', ['ひまり', 'たいき'], 'おはじきとり。ひまりさんは {a}こ とりました。たいきさんは ひまりさんより {b}こ すくなかった。たいきさんは なんこ？']][t]; // p125 ▲4
      let [a, b, op, u] = S; if (Math.random() < 0.6) { if (op === '+') { a = big_ ? R(5, 9) : R(3, 6); b = big_ ? R(Math.max(2, 11 - a), 9) : R(1, 10 - a); } else { a = big_ ? R(11, 16) : R(5, 10); b = big_ ? R(a - 9, 9) : R(1, a - 2); } }
      const r = op === '+' ? a + b : a - b; const text = S[5].replace('{a}', a).replace('{b}', b); const fx = (n) => (u === 'ひき' ? hiki(n) : `${n}${u}`); const txt = text.replace(`${a}ひき`, hiki(a)).replace(`${b}ひき`, hiki(b));
      const tape = (hl) => COL(LB(S[4][0], dots(a, 'a')), LB(S[4][1], op === '+' ? dots(a, 'b') + `<span class="sk-split">${dots(b, 'b')}</span>` : `<span class="sk-dr">${Array.from({ length: a }, (_, i) => `<i class="sk-d ${i < r ? 'b' : 'e'}${hl && i >= r ? ' hle' : ''}"></i>`).join('')}</span>`));
      return wq({ a, op, b, u, text: txt, ansS: fx(r), choices: chT(fx(r), [fx(op === '+' ? Math.abs(a - b) : a + b), fx(r + 1), fx(r - 1)].filter((x) => !/^0/.test(x))), viz: '', kw: op === '+' ? `「<b class="mark">より ${fx(b)} おおい</b>」→ たしざん` : `「<b class="mark">より ${fx(b)} すくない</b>」→ ひきざん`, kws: op === '+' ? `${b}こ おおい から、${a}に ${b}を たす` : `${b}こ すくない から、${a}から ${b}を ひく`, vizS: tape(true), vizSs: op === '+' ? `ならべると、${b}こ ぶん ながい` : `ならべると、${b}こ ぶん みじかい` }); } },

    // ════ 23 大きさくらべ(2)（ひろさ）  p126〜127
    { id: 'tm_hirosa', n: 'ひろさくらべ', page: 126, m: 3, q(d) { let w1, h1, w2, h2; if (d < 0.4 || Math.random() < 0.3) { [w1, h1, w2, h2] = Math.random() < 0.5 ? [4, 2, 3, 3] : [3, 3, 4, 2]; } else { do { w1 = R(2, 5); h1 = R(1, 4); w2 = R(2, 5); h2 = R(1, 4); } while (Math.abs(w1 * h1 - w2 * h2) > (d < 0.7 ? 3 : 1) || (w1 === w2 && h1 === h2) || (w1 === h2 && h1 === w2)); } // p127 ▲3 4×2 と 3×3
      const a1 = w1 * h1, a2 = w2 * h2, ans = a1 === a2 ? 'おなじ' : a1 > a2 ? 'あ' : 'い';
      const pic = (num) => `<div style="display:flex;gap:28px;align-items:center;justify-content:center"><div style="text-align:center"><b style="font-size:26px">あ</b><br>${TILES(w1, h1, 'a', num)}</div><div style="text-align:center"><b style="font-size:26px">い</b><br>${TILES(w2, h2, 'b', num)}</div></div>`;
      return { text: 'はなだんの ひろさ。どちらが ひろい？', sayQ: 'はなだんの ひろさ。あ と い、どちらが ひろい？', viz: pic(false), ans, choices: ['あ', 'い', 'おなじ'], bigC: true, steps: [{ h: pic(true), s: `おなじ おおきさの ますが いくつ あるかで くらべる。あは ${a1}ます、いは ${a2}ます` }, { h: big(ans === 'おなじ' ? 'おなじ' : ans), s: ans === 'おなじ' ? 'ますの かずが おなじ だから、おなじ ひろさ' : `${ans}の ほうが ますが おおいから ひろい` }] }; } },

    // ════ かえますか？ かえませんか？  p128〜129
    { id: 'tm_kaeru', n: 'かえますか？', page: 128, m: 3, q(d) { const IT = [['チョコレート', 'choco', 48], ['ガム', 'gum', 47], ['せんべい', 'senbei', 52], ['あめ', 'candy', 55]];
      const pr = (p) => (Math.random() < 0.5 ? p : p < 50 ? R(40, 49) : R(51, 59)); const opts = ['やすいから かえます', 'たかいから かえません', 'やすいから かえません', 'たかいから かえます'];
      if (d < 0.5 || Math.random() < 0.5) { const [nm, k, p0] = pick(IT), p = pr(p0), cheap = p < 50, a = cheap ? opts[0] : opts[1]; // p128 ▲1あ・い、p129 ▲2
        return { text: `50えんだま 1まいで、${nm}（${p}えん）は かえますか？「50えんより ……」`, sayQ: `ごじゅうえんだま いちまいで、${p}えんの ${nm}は かえますか？`, viz: `<div style="display:flex;gap:24px;align-items:center;justify-content:center">${O('coin50', 1)}${LB(`${p}えん`, O(k, 1))}</div>`, ans: a, choices: shuffle(opts.slice()), txt: true,
          steps: [{ h: NL(rng(Math.min(p, 50) - 1, Math.max(p, 50) + 1), { q: p, reveal: true, hl: [50] }), s: `${p}と 50を くらべると、${p}の ほうが ${cheap ? 'ちいさい' : 'おおきい'}` }, { h: big(a), s: `${nm}は 50えんより ${cheap ? 'やすいから かえます' : 'たかいから かえません'}` }] }; }
      const cheapP = Math.random() < 0.5, both = cheapP ? [IT[0], IT[1]] : [IT[2], IT[3]], ps = both.map((x) => (Math.random() < 0.5 ? x[2] : cheapP ? R(40, 49) : R(51, 59))); // p128 ▲1う、p129 ▲2う
      const o2 = ['どちらも やすいから かえます', 'どちらも たかいから かえません', 'どちらも やすいから かえません', 'どちらも たかいから かえます'], cc = cheapP, aa = cc ? o2[0] : o2[1];
      return { text: `50えんだま 2まいで、${both[0][0]}（${ps[0]}えん）と ${both[1][0]}（${ps[1]}えん）を 1つずつ かえますか？`, sayQ: `ごじゅうえんだま にまいで、${ps[0]}えんの ${both[0][0]}と ${ps[1]}えんの ${both[1][0]}を ひとつずつ かえますか？`, viz: `<div style="display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap">${O('coin50', 2)}${LB(`${ps[0]}えん`, O(both[0][1], 1))}${LB(`${ps[1]}えん`, O(both[1][1], 1))}</div>`, ans: aa, choices: shuffle(o2.slice()), txt: true,
        steps: [{ h: P(`50えんだま 1まいで 1つ かう と かんがえる<br>${both[0][0]} ${ps[0]}えん、${both[1][0]} ${ps[1]}えん`), s: `どちらも 50えんと くらべよう` }, { h: big(aa), s: cc ? 'どちらも 50えんより やすいから かえます' : 'どちらも 50えんより たかいから かえません' }] }; } },

    // ════ もうすぐ 2ねんせい  p130〜135
    { id: 'tm_2nen_kazu', n: 'もうすぐ2ねんせい（かず）', page: 130, m: 3, q(d) { const t = R(0, 2);
      if (t === 0) { const tt = R(2, 9), o = R(0, 9), n = tt * 10 + o, it = pick([['えんぴつ', 'ほん', '10ぽん いりの はこ'], ['はっぱ', 'まい', '10まいの たば']]); // p130 ▲1 36・73
        return { text: `${it[0]}。${it[2]}が ${tt}つと、1${it[1] === 'ほん' ? 'ぽん' : 'まい'}が ${o}つ。ぜんぶで いくつ？`, sayQ: `${it[0]}。${it[2]}が ${tt}つと、ばらが ${o}つ。ぜんぶで いくつ？`, viz: BD(n), ans: String(n), choices: chT(n, [o * 10 + tt, n + 10, n - 1, tt + o].filter((v) => v > 0 && v !== n)), bigC: true, steps: [{ h: BD(n), s: `10が ${tt}つで ${tt * 10}` }, { h: PV(tt, o) + eq(`<b>${n}</b>`), s: `${tt * 10}と ${o}で ${n}` }] }; }
      if (t === 1) { const st = pick(d < 0.5 ? [1, 2] : [2, 5, -5, -1]), len = 7; const s0 = st > 0 ? R(1, Math.floor((100 - st * (len - 1)) / st)) * st : R(Math.abs(st) * (len - 1) / Math.abs(st) + 2, 20) * Math.abs(st); // p130 ▲2
        const seq = Array.from({ length: len }, (_, i) => s0 + st * i).filter((v) => v >= 0 && v <= 100); const hi = R(2, seq.length - 1), a = seq[hi];
        return { text: `${seq.map((v, i) => (i === hi ? '□' : v)).join('、')}　□に はいる かずは？`, sayQ: `${seq.map((v, i) => (i === hi ? 'しかく' : v)).join('、')}。しかくに はいる かずは？`, ans: String(a), choices: chT(a, [a + 1, a - 1, a + st, a - st, a + 10].filter((v) => v >= 0 && v <= 105)), bigC: true, steps: [{ h: NL(seq, { q: a }), s: `${Math.abs(st)}ずつ ${st > 0 ? 'ふえて' : 'へって'} いるね` }, { h: NL(seq, { q: a, reveal: true }), s: `こたえは ${a}` }] }; }
      const tri = [[72, 58, 61], [109, 106, 110], [99, 103, 101]]; let cs = Math.random() < 0.5 ? pick(tri).slice() : [R(50, 120), R(50, 120), R(50, 120)]; cs = uniq(cs); while (cs.length < 3) cs = uniq([...cs, R(50, 120)]); const sm = Math.min(...cs); // ❗p130 ▲3 ちいさい ほう
      return { text: 'いちばん ちいさい かずは どれ？', sayQ: `${cs.join('、')}。いちばん ちいさい かずは どれ？`, ans: String(sm), choices: shuffle(cs.map(String)), bigC: true, steps: [{ h: NL(rng(Math.min(...cs), Math.max(...cs)), { hl: cs, show: (v) => cs.includes(v) }), s: 'かずの せんで いちばん ひだりに ある かずが いちばん ちいさい' }, { h: big(String(sm)), s: `${sm}が いちばん ちいさい` }] }; } },
    { id: 'tm_2nen_keisan', n: 'もうすぐ2ねんせい（けいさん）', page: 131, m: 3, q(d) { const k = pickD(d, ['k1', 'k2', 'k3', 'k4', 'k5']); const pool = Math.random() < 0.6 ? pick(L[k]) : { k1: G.r6, k2: G.r7, k3: () => pick(L.k3), k4: G.r10, k5: G.r11 }[k](); return parse(pool); } },
    { id: 'tm_2nen_kurabe', n: 'くらべかたと とけい', page: 132, m: 3, q(d) { const t = R(0, 3);
      if (t === 0) { const a = R(5, 10); let b = R(5, 10); if (b === a) b = a + 1; const ans = a > b ? 'あ' : 'い'; const pic = (num) => COL(LB('あ', STRIPE(a, '#ff9a3c', '#ffd8b0', num)), LB('い', STRIPE(b, '#4dabf0', '#c9e7ff', num))); // p132 ▲1 しまもよう
        return { text: 'しまもようの ぼう。どちらが ながい？', sayQ: 'しまもようの ぼう。あ と い、どちらが ながい？', viz: pic(false), ans, choices: ['あ', 'い', 'おなじ'], bigC: true, steps: [{ h: pic(true), s: `おなじ ながさの しまが いくつ あるか かぞえる。あは ${a}こ、いは ${b}こ` }, { h: big(ans), s: `${ans}の ほうが ながい` }] }; }
      if (t === 1) { const a = R(3, 8); let b = R(3, 8); if (b === a) b = a + 1; const ans = a > b ? 'あ' : 'い'; const pic = (num) => COL(LB('あ', CUPS(a, num)), LB('い', CUPS(b, num))); // p132 ▲2 コップ
        return { text: 'すいとうの みずを おなじ コップに うつしました。どちらが おおく はいる？', sayQ: 'すいとうの みずを おなじ コップに うつしました。あ と い、どちらが おおく はいる？', viz: pic(false), ans, choices: ['あ', 'い', 'おなじ'], bigC: true, steps: [{ h: pic(true), s: `コップの かずで くらべる。あは ${a}はい、いは ${b}はい` }, { h: big(ans), s: `${ans}の ほうが おおく はいる` }] }; }
      if (t === 2) { const a = R(5, 9); let b = R(5, 9); if (b === a) b = a - 1; const sh = (n) => (n % 2 === 0 ? [n / 2, 2] : [n, 1]), [w1, h1] = sh(a), [w2, h2] = sh(b); const ans = a > b ? 'あ' : 'い'; const pic = (num) => `<div style="display:flex;gap:28px;justify-content:center"><div><b style="font-size:26px">あ</b><br>${TILES(w1, h1, 'a', num)}</div><div><b style="font-size:26px">い</b><br>${TILES(w2, h2, 'b', num)}</div></div>`; // p132 ▲3
        return { text: 'どちらが ひろい？', sayQ: 'あ と い、どちらが ひろい？', viz: pic(false), ans, choices: ['あ', 'い', 'おなじ'], bigC: true, steps: [{ h: pic(true), s: `ますの かずで くらべる。あは ${a}ます、いは ${b}ます` }, { h: big(ans), s: `${ans}の ほうが ひろい` }] }; }
      const [h, m] = Math.random() < 0.5 ? pick([[4, 30], [5, 50], [2, 59], [4, 6]]) : [R(1, 12), d < 0.5 ? R(1, 11) * 5 : R(1, 59)]; const ans = TL(h, m), nx = (h % 12) + 1; // p132 ▲4 4じ30ぷん・❗5じ50ぷん・❗2じ59ふん
      return { text: 'とけいは なんじ なんぷん？', sayQ: 'とけいは なんじ なんぷん？', viz: CLK(h, m), ans, choices: chT(ans, [TL(nx, m), TL(h, Math.max(1, Math.round(m / 5))), TL(h, m >= 6 ? m - 5 : m + 10)].filter((x) => x !== ans)), txt: true, steps: [{ h: CLK(h, m) + P('みじかい はりで なんじ'), s: `みじかい はりは ${h}と ${nx}の あいだ。${m >= 45 ? `${nx}に ちかいけれど まだ ${h}じ` : `${h}じ`}` }, { h: CLK(h, m) + P('ながい はりで なんぷん'), s: `ながい はりは ${m}${fun(m)}` }, { h: big(ans), s: `こたえは ${ans}` }] }; } },
    { id: 'tm_2nen_bun', n: 'もうすぐ2ねんせい（ぶんしょうだい）', page: 134, m: 3, q(d) { const t = d < 0.4 ? R(0, 2) : R(0, 5); const vy = Math.random() < 0.5;
      if (t === 0) { const a = vy ? 7 : R(4, 9), b = vy ? 6 : R(11 - a, 9); return wq({ a, op: '+', b, u: 'にん', text: `こどもが ${a}にん あそんで いました。ともだちが ${b}にん きました。<b>みんなで</b> なんにん？`, viz: COL(LB('はじめ', O('child', a)), LB('きた', O('child', b))), kw: KW_AWASE('みんなで'), kws: 'きて ふえたから たしざん' }); } // p134 ▲1
      if (t === 1) { const a = vy ? 20 : R(2, 8) * 10, b = vy ? 7 : R(1, 9); return wq({ a, op: '+', b, u: 'ほん', ansS: hon(a + b), choices: chT(hon(a + b), [hon(a - b), hon(a + b + 10), hon(a + b - 1)]), text: `つくしとり。つばささんは ${hon(a)} とりました。みらいさんは つばささんより ${hon(b)} おおく とりました。みらいさんは なんぼん？`, kw: `「<b class="mark">より ${hon(b)} おおい</b>」→ たしざん`, kws: `${hon(b)} おおいから ${a}に ${b}を たす` }); } // p134 ▲2
      if (t === 2) { const a = vy ? 80 : R(3, 9) * 10; return wq({ a: 100, op: '-', b: a, u: 'かい', text: `かたを 100かい たたく やくそく。いままでに ${a}かい たたきました。<b>あと</b> なんかい？`, kw: 'あと いくつ → 100から ひく', kws: `100から いままでの ${a}を ひく` }); } // p134 ▲3
      if (t === 3) { const a = vy ? 15 : R(11, 16), b = vy ? 9 : R(a - 9, 9); return wq({ a, op: '-', b, u: 'ほん', ansS: hon(a - b), choices: chT(hon(a - b), [hon(a + b), hon(a - b + 1), hon(a - b - 1 || a - b + 2)]), text: `くじが ${hon(a)} あります。はずれは ${hon(b)}。<b>あたりは</b> なんぼん？`, viz: dots(a, 'a'), kw: 'ぜんぶ − はずれ ＝ あたり', kws: `ぜんぶの ${hon(a)}から はずれの ${hon(b)}を ひく` }); } // ❗p135 ▲4
      if (t === 4) { const a = vy ? 25 : R(2, 9) * 10 + R(4, 9), b = vy ? 3 : R(1, Math.min(3, a % 10 - 1)); return wq({ a, op: '-', b, u: 'ほん', ansS: hon(a - b), choices: chT(hon(a - b), [hon(a + b), hon(a - b + 1), hon(a - b - 10)]), text: `あかい ちゅうりっぷが ${hon(a)} さいて います。きいろい ちゅうりっぷは それより ${hon(b)} すくない。きいろは なんぼん？`, kw: `「<b class="mark">より ${hon(b)} すくない</b>」→ ひきざん`, kws: `${hon(b)} すくないから ${a}から ${b}を ひく` }); } // ❗p135 ▲5
      const ap = vy ? 7 : R(4, 9), sh = vy ? 4 : R(2, 6), r = ap + sh; // ❗p135 ▲6 りんご7こ 4にんぶん たりない
      return wq({ a: ap, op: '+', b: sh, u: 'にん', text: `りんごが ${ap}こ あります。こどもに 1こずつ くばると、${sh}にんぶん たりません。こどもは なんにん？`, viz: O('apple', ap), kw: 'もらえた ひと ＋ たりない ひと', kws: `りんごを もらえた ${ap}にんと、もらえない ${sh}にんを あわせる`, vizS: COL(LB('りんご', O('apple', ap)), LB('こども', O('child', r, sh))), vizSs: `りんごを もらえる こどもは ${ap}にん。もらえない こどもが ${sh}にん` }); } },

    // ════ けいさんの れんしゅう  p136〜138
    { id: 'tm_renshu', n: 'けいさんの れんしゅう', page: 136, m: 3, q(d) { const P9 = [['r1', 'r2'], ['r8', 'r3'], ['r4'], ['r5'], ['r6'], ['r7'], ['r9'], ['r10'], ['r11']]; const idx = Math.min(8, Math.floor(d * 9)); const g = P9[R(Math.max(0, idx - 2), idx)]; return parse(fromList(pick(g))); } },

    // ════ かあどげえむ  p139
    { id: 'tm_cardgame', n: 'かあどげえむ', page: 139, m: 3, q(d) { const mk = () => (d < 0.4 ? G.r1() : pick([G.r1, G.r2, G.r6, G.r7])()); const t = R(0, 1);
      if (t === 0) { const x = mk(); let y = mk(), g = 0; while ((valOf(y) === valOf(x) && Math.random() < 0.7) || y === x) { y = mk(); if (++g > 20) break; } if (y === x) y = valOf(x) > 1 ? `${valOf(x) - 1}+1` : '1+1'; const vx = valOf(x), vy = valOf(y), ans = vx === vy ? 'おなじ' : show(vx > vy ? x : y); // おおきさくらべ（5＋1 と 3＋2）
        return { text: `おおきさくらべ。こたえが おおきい かあどは どっち？`, sayQ: `おおきさくらべ。${strip(show(x)).replace(/＋/g, 'たす').replace(/−/g, 'ひく')} と ${strip(show(y)).replace(/＋/g, 'たす').replace(/−/g, 'ひく')}、こたえが おおきい のは どっち？`, ans, choices: [show(x), show(y), 'おなじ'], txt: true, steps: [{ h: P(`${show(x)} ＝ ${vx}<br>${show(y)} ＝ ${vy}`), s: 'それぞれの こたえを だそう' }, { h: big(ans === 'おなじ' ? 'おなじ' : String(Math.max(vx, vy))), s: ans === 'おなじ' ? 'こたえが おなじ' : `${Math.max(vx, vy)}の ほうが おおきい` }] }; }
      const tg = d < 0.4 ? R(5, 10) : R(5, 18); let ok = null, g = 0; while (!ok && g++ < 50) { const e = mk(); if (valOf(e) === tg) ok = e; } if (!ok) ok = tg <= 10 ? `${tg - 2}+2` : `${tg - 9}+9`; const ng = []; g = 0; while (ng.length < (d < 0.5 ? 2 : 3) && g++ < 100) { const e = mk(); if (valOf(e) !== tg && !ng.includes(e) && e !== ok) ng.push(e); } // かあどとり・なかまあつめ
      const ch = shuffle([ok, ...ng]); return { text: `かあどとり。こたえが ${tg}の かあどを とろう。どれ？`, sayQ: `かあどとり。こたえが ${tg}の かあどを とろう。どれ？`, ans: show(ok), choices: ch.map(show), txt: true, steps: [{ h: P(ch.map((e) => `${show(e)} ＝ ${valOf(e)}`).join('<br>')), s: 'ひとつずつ こたえを だして みよう' }, { h: eq(`${show(ok)} ＝ <b>${tg}</b>`), s: `こたえが ${tg}なのは この かあど` }] }; } },
  ];
})();

// ───────── きょうかしょ（東京書籍『新しい こくご 一下』p44〜165）に そった こくごの ユニット
// エンジンの なかに はりこんで つかう。ヘルパーは この なかだけで つかう（そとの なまえと ぶつからないように）。
// 文の かきかた：{漢|よみ} … がめんには かんじ、よみあげは よみ。 [漢|よみ] … かんじの よみ／かきの もんだいの ねらいの じ。
const TB_KOKUGO = (() => {
  const RB = /\{([^|{}]+)\|([^{}]+)\}/g;
  const TG = /\[([^|\]]+)\|([^\]]+)\]/;
  const D = (s) => String(s).replace(RB, '$1');
  const Y = (s) => String(s).replace(RB, '$2').replace(/（　）/g, ' まる ').replace(/<br\s*\/?>/g, '、').replace(/<[^>]+>/g, ' ').replace(/[「」『』（）\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const end = (s) => (/[。？！]$/.test(s) ? s : s + '。');
  const plain = (s) => D(s).replace(/<[^>]+>/g, '');
  const lvOf = (d) => (d < 0.34 ? 1 : d < 0.67 ? 2 : 3);
  // いまの レベルの もんだいを おおめに、したの レベルも まぜる
  const pool = (L, d) => { const v = lvOf(d); const f = L.filter((x) => (x.lv || 1) <= v); const top = f.filter((x) => (x.lv || 1) === v); return top.length && Math.random() < 0.6 ? top : f.length ? f : L; };
  const opts = (a, ng, d) => { const A = D(a); const rest = shuffle(uniq(ng.map(D)).filter((x) => x !== A)); if (rest.length < 2) throw new Error('ng too few: ' + A); return shuffle([A, ...rest.slice(0, (d > 0.6 ? 4 : 3) - 1)]); };
  const look = (ch) => (ch.some((c) => plain(c).length > 4) ? { txt: true } : { bigC: true });
  const story = (t, k) => { const T = D(t); if (!k) return `<div class="sk-story">${T}</div>`; const K = D(k); if (!T.includes(K)) throw new Error('k not in t: ' + K); return `<div class="sk-story">${T.replace(K, `<span class="mark">${K}</span>`)}</div>`; };
  const ansBox = (a) => (plain(a).length > 6 ? `<div class="sk-p"><b class="mark">${D(a)}</b></div>` : big(D(a)));
  const pairNg = (a, cls = '') => (c) => { const kj = cls === 'kjs', yc = kj && KY[c], ya = kj && KY[a]; return { h: `<div class="sk-pair${kj ? ' row' : ''}"><div class="ngp"><span class="lab">えらんだ のは</span>${big(c, cls)}${yc ? `<span class="yo">${yc}</span>` : ''}</div><div class="okp"><span class="lab">こたえ</span>${big(a, cls)}${ya ? `<span class="yo">${ya}</span>` : ''}</div></div>`, s: yc && ya ? `えらんだ ${c} は「${yc}」の かんじ。${ya} は こっち。かたちの ちがいを よく みてね` : 'ふたつを くらべて みよう。ちがう ところを よく みてね' }; };
  const KY = {'一':'いち','二':'に','三':'さん','四':'よん','五':'ご','六':'ろく','七':'なな','八':'はち','九':'きゅう','十':'じゅう','百':'ひゃく','千':'せん','上':'うえ','下':'した','左':'ひだり','右':'みぎ','中':'なか','大':'おお','小':'ちい','月':'つき','日':'ひ','年':'ねん','早':'はや','木':'き','林':'はやし','山':'やま','川':'かわ','土':'つち','空':'そら','田':'た','天':'てん','生':'う','花':'はな','草':'くさ','虫':'むし','犬':'いぬ','人':'ひと','名':'な','女':'おんな','男':'おとこ','子':'こ','目':'め','耳':'みみ','口':'くち','手':'て','足':'あし','見':'み','音':'おと','力':'ちから','気':'き','円':'えん','入':'い','出':'で','立':'た','休':'やす','先':'せん','夕':'ゆう','本':'ほん','文':'ぶん','字':'じ','学':'がく','校':'こう','村':'むら','町':'まち','森':'もり','正':'ただ','水':'みず','火':'ひ','玉':'たま','王':'おう','石':'いし','竹':'たけ','糸':'いと','貝':'かい','車':'くるま','金':'かね','雨':'あめ','赤':'あか','青':'あお','白':'しろ'}; KANJI.forEach((x) => { KY[x[0]] = x[1]; }); const kyAdd = (L) => L.forEach((x) => { const m = x.s && x.s.match(TG); if (m && !KY[m[1]]) KY[m[1]] = m[2]; });

  // ふつうの もんだい：{ t:ほんぶん（みじかい まとめ）, q:しつもん, a:こたえ, ng:[まちがい], k:ヒントの ぶぶん, w:せつめい, iv:もんだいの え, il:せつめいの え, sq:よみあげ }
  const ask = (it0, d) => {
    const it = !it0.t && it0.k && !it0.not ? { ...it0, t: /[。」]$/.test(plain(it0.k)) ? it0.k : it0.k + '。', hs: 'おはなしを みて みよう' } : it0;
    const ch = opts(it.a, it.ng, d); const steps = [];
    if (it.t && it.k) steps.push({ h: story(it.t, it.k), s: Y(`${it.hs || 'ここを よもう'}。${it.k}`) });
    else if (it.k) steps.push({ h: `<div class="sk-p"><span class="mark">${D(it.k)}</span></div>`, s: Y(`${it.hs || 'ヒントは'}、${it.k}`) });
    steps.push({ h: (it.il ? ill(it.il) : '') + ansBox(it.a), s: Y(`${it.w ? it.w + '。' : ''}こたえは ${it.a}`) });
    const nwOf = (c) => { const pc = plain(c); if (it.nw) { const f = Object.keys(it.nw).find((x) => plain(x) === pc); if (f) return it.nw[f]; } if (it.t && !plain(it.t).replace(/\s/g, '').includes(pc.replace(/\s/g, ''))) return `えらんだのは「${pc}」。おはなしに なんて かいて あるか、もういちど よもう`; return null; };
    const ng = (c) => { let r = nwOf(c); if (!r) return null; const il2 = typeof r === 'object' ? r.il : null; if (typeof r === 'object') r = r.s; return { h: (il2 ? ill(il2) : '') + `<div class="sk-pair"><div class="ngp"><span class="lab">えらんだ のは</span>${ansBox(c)}</div></div>`, s: Y(r) }; };
    return { text: (it.t ? story(it.t) : '') + D(it.q), sayQ: Y(it.sq || `${it.t || ''} ${it.q}`), viz: it.iv ? ill(it.iv) : '', ans: D(it.a), choices: ch, ...look(ch), steps, ng };
  };
  // じゅんばんの もんだい
  const ordQ = (title, L, d, extra = []) => {
    const n = L.length; const t = lvOf(d) === 1 ? R(0, 1) : pick([0, 1, 2, 2, 3]); let q, ai, ri = -1;
    if (t === 0) { q = 'いちばん はじめは どれ？'; ai = 0; } else if (t === 1) { q = 'いちばん さいごは どれ？'; ai = n - 1; }
    else if (t === 2) { ri = R(0, n - 2); ai = ri + 1; q = `「${L[ri]}」の つぎは どれ？`; } else { ri = R(1, n - 1); ai = ri - 1; q = `「${L[ri]}」の まえは どれ？`; }
    const ng = L.filter((_, i) => i !== ai && i !== ri); const ch = opts(L[ai], ng.length >= 2 ? ng : [...ng, ...extra], d);
    const list = (hi) => `<div class="sk-story">${L.map((x, i) => `<div>${i + 1}. ${i === hi ? `<span class="mark">${D(x)}</span>` : D(x)}</div>`).join('')}</div>`;
    return { text: `${D(title)}\n${D(q)}`, sayQ: Y(`${title}。${q}`), ans: D(L[ai]), choices: ch, txt: true,
      steps: [{ h: list(-1), s: Y(`じゅんばんに ならべると、${L.join('、')}`) }, { h: list(ai), s: Y(`${t >= 2 ? `「${L[ri]}」の ${t === 2 ? 'つぎ' : 'まえ'}は、` : ''}${L[ai]}`) }] };
  };
  // かんじの よみ：{ s:'…[漢|よみ]…', ng:[まちがいの よみ], w:ひとこと }
  const kjR = (L, d) => {
    const it = pick(pool(L, d)); const [, kj, yo] = it.s.match(TG);
    const ng = uniq([...shuffle(it.ng), ...shuffle(L.map((x) => x.s.match(TG)[2]))]).filter((r) => r !== yo);
    const ch = shuffle([yo, ...ng.slice(0, (d > 0.6 ? 4 : 3) - 1)]);
    const show = (rb) => D(it.s.replace(TG, rb ? `<ruby><b class="mark big">${kj}</b><rt>${yo}</rt></ruby>` : `<b class="mark big">${kj}</b>`));
    return { text: 'いろの ついた かん字の よみかたは？', sayQ: 'いろの ついた かんじの よみかたは どれ？', viz: `<div class="sk-p">${show(false)}</div>`, ans: yo, choices: ch, bigC: true,
      steps: [{ h: `<div class="sk-p">${show(true)}</div><div class="sk-yomi">${Y(it.s.replace(TG, '⟪$2⟫')).replace(/⟪([^⟫]*)⟫/, '<b class="mark">$1</b>').replace(/[。、]$/, '')}</div>`, s: end(Y(it.s.replace(TG, '$2'))) + `いろの ついた かんじは、ここでは ${yo} と よむよ${it.w ? '。' + it.w : ''}` }] };
  };
  // かんじを えらぶ：{ s:'…[漢|よみ]…', ng:[にた かんじ], w:おぼえかた（ひらがな） }
  const kjW = (L, d) => {
    kyAdd(L); const it = pick(pool(L, d)); const [, kj, yo] = it.s.match(TG); const ch = opts(kj, it.ng, d);
    return { text: `［${yo}］を かん字で かくと？`, sayQ: end(Y(it.s.replace(TG, '$2'))) + `${yo} を かんじで かくと どれ？`, viz: `<div class="sk-p">${D(it.s.replace(TG, `<b class="mark">［${yo}］</b>`))}</div>`, ans: kj, choices: ch, bigC: true, kanji: true, ng: pairNg(kj, 'kjs'),
      steps: [{ h: `<div class="sk-p">${D(it.s.replace(TG, `<b class="mark big">${kj}</b>`))}</div>`, s: `${it.w ? it.w + '。' : ''}${yo} は この かんじ` }] };
  };
  const U = (id, n, page, m, L) => ({ id, n, page, m, q(d) { const it = pick(pool(L, d)); return it.f ? it.f(d) : ask(it, d); } });
  const F = (lv, f) => ({ lv, f });

  // ───── いろいろな ふね（ふくしゅう）
  const FUNE = ['きゃくせん', 'フェリーボート', 'ぎょせん', 'しょうぼうてい'];
  const FUNE_IL = { きゃくせん: 'kyakusen', フェリーボート: 'ferry', ぎょせん: 'gyosen', しょうぼうてい: 'fireboat' };
  const FUNE_YAKU = { きゃくせん: 'たくさんの {人|ひと}を はこぶ', フェリーボート: '{人|ひと}と じどう{車|しゃ}を いっしょに はこぶ', ぎょせん: 'さかなを とる', しょうぼうてい: '{火|か}じを けす' };
  const fune1 = [
    ...FUNE.map((f) => ({ lv: 1, q: `${FUNE_YAKU[f]} ための ふねは どれ？`, a: f, ng: FUNE, il: FUNE_IL[f], w: `${FUNE_YAKU[f]} ための ふねは ${f}`, nw: Object.fromEntries(FUNE.map((g) => [g, { s: `${g}は、${FUNE_YAKU[g]} ための ふねだよ`, il: FUNE_IL[g] }])) })),
    ...FUNE.map((f) => ({ lv: 2, q: `${f}は、なにを する ための ふね？`, a: FUNE_YAKU[f], ng: Object.values(FUNE_YAKU), iv: FUNE_IL[f], il: FUNE_IL[f], w: `${f}の おしごとは ${FUNE_YAKU[f]} こと`, nw: Object.fromEntries(FUNE.map((g) => [FUNE_YAKU[g], { s: `${FUNE_YAKU[g]} のは、${g}だよ`, il: FUNE_IL[g] }])) })),
    { lv: 2, t: 'きゃくせんの {中|なか}には、きゃくしつや しょくどうが あります。', q: 'きゃくせんの {中|なか}に あるのは？', a: 'きゃくしつや しょくどう', ng: ['ポンプや ホース', 'さかなを {見|み}つける きかい', 'あみ'], k: 'きゃくしつや しょくどう', iv: 'kyakusen' },
    { lv: 2, t: 'ぎょせんは、さかなの むれを {見|み}つける きかいや、あみを つんで います。', q: 'ぎょせんに つんで あるのは？', a: 'きかいや あみ', ng: ['ポンプや ホース', 'きゃくしつや しょくどう', 'たくさんの じどう{車|しゃ}'], k: 'きかいや、あみ', iv: 'gyosen' },
    { lv: 2, t: 'しょうぼうていは、ポンプや ホースを つんで います。', q: 'しょうぼうていに つんで あるのは？', a: 'ポンプや ホース', ng: ['あみ', 'きゃくしつや しょくどう', 'さかなを {見|み}つける きかい'], k: 'ポンプや ホース', iv: 'fireboat' },
    { lv: 3, t: 'きゃくせんの {人|ひと}は、きゃくしつで {休|やす}んだり、しょくどうで しょくじを したり します。', q: 'きゃくしつで {人|ひと}は なにを する？', a: '{休|やす}む', ng: ['さかなを とる', '{火|ひ}を けす', '{車|くるま}を とめる'], k: 'きゃくしつで {休|やす}んだり' },
    { lv: 3, t: 'フェリーボートに のる {人|ひと}は、{車|くるま}を ふねに {入|い}れてから、きゃくしつで {休|やす}みます。', q: 'きゃくしつで {休|やす}む まえに なにを する？', a: '{車|くるま}を ふねに {入|い}れる', ng: ['さかなを とる', 'しょくどうで たべる', 'ホースで {水|みず}を かける'], k: '{車|くるま}を ふねに {入|い}れてから', iv: 'ferry' },
    { lv: 3, t: 'しょうぼうていは、{火|か}じが あると、{水|みず}や くすりを かけて、{火|ひ}を けします。', q: '{火|か}じが あると、どう する？', a: '{水|みず}や くすりを かけて けす', ng: ['あみで とる', 'きゃくしつで {休|やす}む', '{人|ひと}を たくさん のせる'], k: '{水|みず}や くすりを かけて', iv: 'fireboat' },
    { lv: 3, t: 'ぎょせんは、{見|み}つけた さかなを あみで とります。', q: '{見|み}つけた さかなを どう やって とる？', a: 'あみで とる', ng: ['ホースで とる', 'てで つかむ', 'つりざおで つる'], k: 'あみで とります', iv: 'gyosen' },
  ];
  const KJ_FUNE = [{ s: 'たくさんの [人|ひと]を はこぶ。', ng: ['いり', 'き', 'くち'] }, { lv: 2, s: 'きゃくしつで [休|やす]む。', ng: ['ねむ', 'あそ', 'よこ'] }, { lv: 2, s: '[車|くるま]を とめる。', ng: ['しゃ', 'ふね', 'みち'] }, { lv: 3, s: 'じどう[車|しゃ]を はこぶ。', ng: ['くるま', 'しや', 'じゃ'] }];
  const KW_FUNE = [{ s: 'たくさんの [人|ひと]', ng: ['入', '八', '大'], w: 'ひとが たって いる かたち' }, { s: 'きゃくしつで [休|やす]む', ng: ['木', '本', '体'], w: 'ひとが きの そばで やすむ' }, { s: 'じどう[車|しゃ]', ng: ['東', '早', '草'], w: 'くるまの タイヤと じくの かたち' }];
  const fune2 = [
    F(1, (d) => ordQ('「いろいろな ふね」に {出|で}て きた じゅんばん', FUNE, d)),
    ...FUNE.map((f) => ({ lv: 1, q: 'この ふねの なまえは？', a: f, ng: FUNE, iv: FUNE_IL[f], sq: 'この ふねの なまえは なに？', w: `${FUNE_YAKU[f]} ふね` })),
    F(2, (d) => kjR(KJ_FUNE, d)), F(2, (d) => kjW(KW_FUNE, d)),
    { lv: 3, q: 'いろいろな ふねは、なにに あうように つくられて いる？', a: 'それぞれの やく{目|め}', ng: ['うみの いろ', 'すきな かたち', 'ふねの なまえ'], k: 'それぞれの やく{目|め}に あうように', hs: 'さいごの まとめに かいて あるよ' },
  ];

  // ───── 「のりものカード」を つくろう
  const YAKU = ['たくさんの {人|ひと}を はこぶ ための ふねです。', 'さかなを とる ための ふねです。', '{火|か}じを けす ための ふねです。', '{土|つち}や すなを はこぶ ための {車|くるま}です。'];
  const TSUKURI = ['きゃくしつや しょくどうが あります。', 'ポンプや ホースを つんで います。', '{大|おお}きな にだいが あります。', 'あみを つんで います。'];
  const norimono = [
    { lv: 1, t: 'ダンプカーは、たくさんの {土|つち}や すなを はこぶ ための {車|くるま}です。', q: 'ダンプカーが はこぶ ものは？', a: '{土|つち}や すな', ng: ['{人|ひと}', 'さかな', 'ごみ'], k: 'たくさんの {土|つち}や すな', iv: 'dump_truck' },
    { lv: 1, t: 'この {車|くるま}には、{大|おお}きな にだいが あります。にだいを かたむけて、{土|つち}や すなを おろします。', q: 'にだいを どう して おろす？', a: 'かたむける', ng: ['まわす', 'たたむ', 'あらう'], k: 'にだいを かたむけて', iv: 'dump_truck' },
    { lv: 1, q: 'のりものの ことは、なにで しらべる？', a: '{本|ほん}や ずかん', ng: ['テレビの アニメ', 'てがみ', 'おりがみ'], k: '{本|ほん}や ずかんで しらべる' },
    F(2, (d) => ask({ q: '「やく{目|め}」が かいて ある {文|ぶん}は どれ？', sq: 'やくめ が かいて ある ぶんは どれ？', a: pick(YAKU), ng: TSUKURI, w: 'やくめは、その のりものが「なにを するか」。おしごとの こと', nw: Object.fromEntries(TSUKURI.map((x) => [x, 'これは、のりものに「なにが あるか」の ぶん。つくりの せつめいだよ'])) }, d)),
    F(2, (d) => ask({ q: '「つくり」が かいて ある {文|ぶん}は どれ？', sq: 'つくり が かいて ある ぶんは どれ？', a: pick(TSUKURI), ng: YAKU, w: 'つくりは、のりものに「なにが あるか」', nw: Object.fromEntries(YAKU.map((x) => [x, 'これは、のりものが「なにを するか」の ぶん。やくめの せつめいだよ'])) }, d)),
    F(2, (d) => (Math.random() < 0.5 ? kjR([{ s: '[本|ほん]で しらべる。', ng: ['き', 'もと', 'ぼん'] }, { s: 'ずかんの [本|ほん]を よむ。', ng: ['き', 'ひと', 'やす'] }], d) : kjR([{ s: '[車|くるま]の しごと。', ng: ['しゃ', 'くる', 'ま'] }, { s: '[土|つち]を はこぶ。', ng: ['ど', 'と', 'ち'] }], d))),
    F(3, (d) => kjW([{ s: '[本|ほん]で しらべる', ng: ['木', '休', '大'], w: 'きの したに よこぼう。きの ねもとを あらわす' }, { s: 'じどう[車|しゃ]', ng: ['東', '早', '日'], w: 'くるまを うえから みた かたち' }, { s: '[土|つち]や すな', ng: ['上', '士', '工'], w: 'したの よこぼうが ながいよ' }], d)),
    { lv: 2, t: 'しょうぼうていは、{火|か}じを けす ための ふねです。ポンプや ホースを つんで います。', q: 'しょうぼうていが つんで いる ものは？', a: 'ポンプや ホース', ng: ['あみ', 'きゃくしつ', '{土|つち}や すな'], k: 'ポンプや ホースを つんで います' },
    { lv: 2, t: 'ぎょせんは、さかなを とる ための ふねです。あみを つんで います。', q: 'ぎょせんの やく{目|め}は？', a: 'さかなを とる', ng: ['{火|か}じを けす', '{人|ひと}を はこぶ', '{土|つち}を はこぶ'], k: 'さかなを とる ための ふね' },
  ];

  // ───── まとめて よぶ ことば
  const GRP = [['じどう{車|しゃ}', ['バス', 'トラック', 'きゅうきゅう{車|しゃ}', 'タクシー']], ['ふね', ['きゃくせん', 'ヨット', 'ボート', 'ぎょせん']], ['くだもの', ['バナナ', 'みかん', 'ぶどう', 'りんご', 'メロン']], ['がっき', ['ピアノ', 'タンブリン', 'カスタネット', 'たいこ']],
    ['やさい', ['にんじん', 'キャベツ', 'だいこん', 'なす']], ['どうぶつ', ['ぞう', 'きりん', 'ライオン', 'うさぎ']], ['むし', ['とんぼ', 'ちょう', 'せみ', 'ばった']], ['ぶんぼうぐ', ['えんぴつ', 'けしゴム', 'じょうぎ', 'はさみ']]];
  const grpQ = (d) => {
    const v = lvOf(d); const [g, L] = v === 1 ? pick(GRP.slice(0, 4)) : pick(GRP); const others = GRP.filter((x) => x[0] !== g);
    const t = v === 1 ? 0 : pick([0, 1, 2]); const show = (L2) => `<div class="sk-p">${L2.map(D).join('・')}</div>`;
    if (t === 0) { const s3 = shuffle(L).slice(0, 3); const ch = opts(g, others.map((x) => x[0]), d);
      return { text: `${s3.map(D).join('・')}\nまとめて よぶ ことばは？`, sayQ: Y(`${s3.join('、')}。まとめて よぶ ことばは どれ？`), ans: D(g), choices: ch, ...look(ch), steps: [{ h: show(L) + big(D(g)), s: Y(`${L.join('、')}。みんな ${g}の なかま`) }] }; }
    if (t === 1) { const a = pick(L); const ch = opts(a, shuffle(others).slice(0, 3).map((x) => pick(x[1])), d);
      return { text: `「${D(g)}」の なかまは どれ？`, sayQ: Y(`${g} の なかまは どれ？`), ans: D(a), choices: ch, ...look(ch), steps: [{ h: big(D(g)) + show(L), s: Y(`${g}の なかまは、${L.join('、')}`) }] }; }
    const o = pick(others); const odd = pick(o[1]); const s3 = shuffle(L).slice(0, d > 0.6 ? 3 : 2); const ch = shuffle([D(odd), ...s3.map(D)]);
    return { text: 'なかまはずれは どれ？', sayQ: 'なかまはずれは どれ？', ans: D(odd), choices: ch, ...look(ch), steps: [{ h: show(s3) + big(D(g)), s: Y(`${s3.join('、')}は ${g}`) }, { h: big(D(odd)), s: Y(`${odd}は ${o[0]}。だから なかまはずれ`) }] };
  };
  const matome = [
    F(1, grpQ), F(2, grpQ),
    { lv: 3, q: '「じどう{車|しゃ}」や「ふね」を まとめて よぶ ことばは？', a: 'のりもの', ng: ['たべもの', 'がっき', 'どうぶつ'], w: 'じどうしゃも ふねも ひとや ものを のせて はこぶ' },
    { lv: 3, q: '「くだもの」や「やさい」を まとめて よぶ ことばは？', a: 'たべもの', ng: ['のりもの', 'ぶんぼうぐ', 'むし'], w: 'どちらも たべる もの' },
  ];

  // ───── すきな きょうかを はなそう
  const KENTA = '{一|ひと}つ{目|め}は、たいいくです。はしる ことが すきだからです。{二|ふた}つ{目|め}は、こくごです。かん{字|じ}を おぼえる ことが たのしいからです。';
  const kyouka = [
    { lv: 1, t: KENTA, q: 'けんたさんの すきな きょうかは？', a: 'たいいくと こくご', ng: ['さんすうと おんがく', 'ずこうと たいいく', 'こくごと せいかつ'], k: '{一|ひと}つ{目|め}は、たいいくです', hs: 'ひとつめと ふたつめを さがそう' },
    { lv: 2, t: KENTA, q: 'たいいくが すきな わけは？', a: 'はしる ことが すきだから', ng: ['かん{字|じ}を おぼえるのが たのしいから', 'うたが すきだから', 'えを かくのが すきだから'], k: 'はしる ことが すきだからです' },
    { lv: 2, t: KENTA, q: 'こくごが すきな わけは？', a: 'かん{字|じ}を おぼえるのが たのしいから', ng: ['はしる ことが すきだから', 'ボールあそびが できるから', 'きゅうしょくが おいしいから'], k: 'かん{字|じ}を おぼえる ことが たのしいからです' },
    { lv: 2, q: '「わけ」を いって いる {文|ぶん}は どれ？', a: 'はしるのが たのしいからです。', ng: ['ぼくは、たいいくが すきです。', 'すきな きょうかは、なに。', 'いっしょに はしろうね。'], k: '「〜から」', hs: 'わけを いう ときは', w: '「からです」が わけの めじるし' },
    { lv: 1, q: 'みんなの まえで はなす ときは、どんな こえ？', a: 'うしろの {人|ひと}にも きこえる こえ', ng: ['となりの {人|ひと}だけに きこえる こえ', 'とても はやい こえ', 'ないしょばなしの こえ'], w: 'おおきな こえで、ゆっくり はなすと ききやすいね' },
    F(3, (d) => kjR([{ s: '[学校|がっこう]へ いく。', ng: ['がくこう', 'かっこう', 'がっこ'] }], d)),
    F(3, (d) => kjW([{ s: '[学校|がっこう]で べんきょうする', ng: ['字校', '子校', '学木'], w: 'がっこうの がは、うえに てんが みっつ' }], d)),
  ];

  // ───── ことばで あそぼう
  const PALIN = [['しんぶんし', 'しんぶんし'], ['トマト', 'とまと'], ['きつつき', 'きつつき'], ['やおや', 'やおや'], ['みなみ', 'みなみ'], ['たけやぶやけた', 'たけやぶやけた'], ['セミの みせ', 'せみのみせ']];
  const NOPAL = ['しんぶん', 'きつね', 'やさい', 'みかん', 'たけのこ', 'さかな', 'くつした', 'ひまわり', 'あさがお', 'トマトジュース'];
  const beats = (w, on) => `<div class="sk-beats${on ? ' on' : ''}">${[...w].map((c) => `<i>${c}</i>`).join('')}</div>`;
  const palQ = (d) => { const [w, r] = pick(PALIN); const ch = opts(w, NOPAL, d); const rv = [...r].reverse().join('');
    return { text: 'さかさまに よんでも おなじに なる ことばは どれ？', sayQ: 'さかさまに よんでも おなじに なる ことばは どれ？', ans: w, choices: ch, ...look(ch),
      steps: [{ h: beats(r, true), s: `${[...r].join('、')}` }, { h: beats(rv, true), s: `うしろから よむと ${[...rv].join('、')}。おなじだね` }] }; };
  const REV = ['いるか', 'たぬき', 'さかな', 'くじら', 'すいか', 'とけい', 'いちご'];
  const revQ = (d) => { const w = pick(REV); const c = [...w]; const rv = [...c].reverse().join('');
    const perms = uniq([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map((p) => p.map((i) => c[i]).join(''))).filter((x) => x !== rv);
    const ch = opts(rv, perms, d);
    return { text: `「${w}」を さかさまに よむと？`, sayQ: `${w} を さかさまに よむと どれ？`, ans: rv, choices: ch, bigC: true,
      steps: [{ h: beats(w, true), s: `${c.join('、')}。うしろから よもう` }, { h: beats(rv, true), s: `${[...rv].join('、')}。${w} を さかさまに よむと ${rv}` }] }; };
  const ACRO = [[['いつも すいすい', 'るんるん およぐよ', 'かわいい なきごえ'], 'いるか', ['くじら', 'さかな', 'らっこ']], [['かたい こうらで', 'めは かわいい'], 'かめ', ['かに', 'うさぎ', 'へび']],
    [['ねるのが だいすき', 'こたつで まるく なる'], 'ねこ', ['いぬ', 'うさぎ', 'ねずみ']], [['うしろあしで ぴょん', 'さっと はしるよ', 'ぎゅっと だっこ してね'], 'うさぎ', ['りす', 'ねこ', 'うま']],
    [['かたい はさみ', 'にょきっと よこあるき'], 'かに', ['えび', 'かめ', 'たこ']], [['たくさんの あしで', 'こっそり かくれるよ'], 'たこ', ['いか', 'かに', 'たい']]];
  const acroQ = (d) => { const [L, a, ng] = pick(ACRO); const ch = opts(a, ng, d); const lines = (m) => `<div class="sk-story">${L.map((x) => `<div>${m ? `<span class="mark">${x[0]}</span>${x.slice(1)}` : x}</div>`).join('')}</div>`;
    return { text: `${lines(false)}わたしは だあれ？`, sayQ: `${L.join('。')}。わたしは だあれ？`, ans: a, choices: ch, ...look(ch),
      steps: [{ h: lines(true), s: 'それぞれの ぎょうの はじめの じを みてね' }, { h: lines(true) + big(a), s: `はじめの じを つなげると、${L.map((x) => x[0]).join('、')}。${a}` }] }; };
  const DJ = (q, a, ng, w) => ({ lv: 2, q: `だじゃれに なるように、（　）に はいる ことばは？\n「${q}」`, sq: `だじゃれに なるように、まるに はいる ことばは どれ？ ${q}`, a, ng, w });
  const asobo = [
    F(1, palQ), F(1, acroQ), F(2, revQ), F(3, revQ), F(3, acroQ),
    DJ('タイが たべ（　）', 'たい', ['たこ', 'たら', 'たね'], 'タイと たべたい。おなじ おとが はいって いるね'),
    DJ('パンダの （　）だ', 'パン', ['ごはん', 'おにぎり', 'ケーキ'], 'パンダと パンだ'),
    DJ('ブドウ ひとつぶ （　）ですか', 'どう', ['なん', 'いくつ', 'だれ'], 'ブドウと どう'),
    DJ('ふとんが （　）', 'ふっとんだ', ['ほされた', 'たたまれた', 'しかれた'], 'ふとんと ふっとんだ'),
    DJ('イカは （　）ですか', 'いかが', ['どう', 'なに', 'すき'], 'イカと いかが'),
    DJ('ねこが （　）', 'ねころんだ', ['ないた', 'はしった', 'わらった'], 'ねこと ねころんだ'),
    DJ('アルミかんの うえに ある （　）', 'みかん', ['りんご', 'バナナ', 'いちご'], 'アルミかんと ある みかん'),
  ];

  // ───── おもい出して かこう（じゅんじょ・かぎ）
  const JW = ['はじめに', 'つぎに', 'それから', 'さいごに'];
  const BENTO = ['かみねん{土|ど}で おむすびを つくる', 'ちゃいろの かみねん{土|ど}で ハンバーグを つくる', 'みどりの おりがみで レタスを つくる', 'あきばこに つめる'];
  const KAGI = [['となりの せきの けんたさんが、おいしそうだねと いった。', 'おいしそうだね', ['となりの せきの', 'けんたさんが', 'と いった']], ['おかあさんが、おかえりと いった。', 'おかえり', ['おかあさんが', 'と いった', 'おかあ']],
    ['ぼくは、いただきますと いった。', 'いただきます', ['ぼくは', 'と いった', 'いただき']], ['せんせいが、みんな あつまってと いった。', 'みんな あつまって', ['せんせいが', 'と いった', 'せんせいが みんな']], ['いもうとが、まってよと よんだ。', 'まってよ', ['いもうとが', 'と よんだ', 'いもうと']]];
  const kagiQ = (d) => { const [s, a, ng] = pick(KAGI); const ch = opts(a, ng, d);
    return { text: `${story(s)}かぎ（「」）を つける ところは？`, sayQ: `${s} かぎを つける ところは どれ？`, ans: a, choices: ch, ...look(ch),
      steps: [{ h: story(s, a), s: 'はなした ことばは どこかな' }, { h: `<div class="sk-story kgs">${D(s).replace(a, `<b class="kg">「</b><span class="mark">${a}。</span><b class="kg">」</b>`)}</div>`, s: `はなした ことばは ${a}。だから かぎを つけるよ` }, { h: `<div class="sk-story kgs">${D(s).replace(a, `<b class="kg">「</b>${a}。<b class="kg">」</b>`)}</div>`, s: 'かぎを つけると、こう なるね' }] }; };
  const junjo = [
    F(1, (d) => ordQ('じゅんじょを あらわす ことばの じゅんばん', JW, d)),
    F(2, (d) => ordQ('めいさんが おべんとうを つくった じゅんばん', BENTO, d)),
    { lv: 1, q: 'かぎ（「」）は、どんな ときに つける？', sq: 'かぎは どんな ときに つける？', a: 'はなした ことばを かく とき', ng: ['なまえを かく とき', 'いちばん さいごの {文|ぶん}', 'すきな ことばを かく とき'], w: 'はなした ことばには かぎを つけるよ' },
    F(1, kagiQ), F(2, kagiQ),
    { lv: 2, t: 'つぎに、ちゃいろの かみねん{土|ど}で ハンバーグを つくりました。', q: 'ちゃいろの かみねん{土|ど}で つくったのは？', a: 'ハンバーグ', ng: ['おむすび', 'レタス', 'たまごやき'], k: 'ハンバーグ' },
    { lv: 3, q: 'かぎが ただしく ついて いる {文|ぶん}は どれ？', a: 'けんたさんが「おいしそうだね。」と いった。', ng: ['「けんたさんが」おいしそうだね。と いった。', 'けんたさんが おいしそうだね。「と いった。」', 'けんたさんが「おいしそうだね。と いった。」'], w: 'はなした ことばだけを かぎで かこむよ' },
  ];

  // ───── ひらがなを つかおう２（ちいさい じ・のばす おと）
  const HW = [['stamp', 'きって', ['きつて', 'きて'], ['き', 'っ', 'て'], 'つまる ところは ちいさい「っ」'], ['pumpkin', 'かぼちゃ', ['かぼちや', 'かぼちょ', 'かぼっちゃ'], ['か', 'ぼ', 'ちゃ'], '「ちゃ」は ちいさい「ゃ」で ひとつの おと'],
    ['candle', 'ろうそく', ['ろおそく', 'ろそく', 'ろうそっく'], ['ろ', 'う', 'そ', 'く'], '「ろお」と きこえるけど「う」と かくよ'], ['airplane', 'ひこうき', ['ひこおき', 'ひこき', 'ひっこうき'], ['ひ', 'こ', 'う', 'き'], '「こお」と きこえるけど「う」と かくよ'],
    ['cucumber', 'きゅうり', ['きゆうり', 'きゅり', 'きゅおり'], ['きゅ', 'う', 'り'], '「きゅ」は ちいさい「ゅ」。のばす ところは「う」'], ['natto', 'なっとう', ['なつとう', 'なっとお', 'なとう'], ['な', 'っ', 'と', 'う'], 'つまる「っ」と のばす「う」が あるね', '（　）を たべる。'],
    ['earth', 'ちきゅう', ['ちきゆう', 'ちきゅ', 'ちきゅお'], ['ち', 'きゅ', 'う'], '「きゅ」は ちいさい「ゅ」。のばす ところは「う」', '（　）は まるい。'], ['watering_can', 'じょうろ', ['じようろ', 'じょおろ', 'じょろ'], ['じょ', 'う', 'ろ'], '「じょ」は ちいさい「ょ」。のばす ところは「う」', '（　）で {水|みず}を まく。']];
  const hira2 = HW.map(([il, a, ng, bt, tip, c], i) => F(i < 3 ? 1 : i < 5 ? 2 : 3, (d) => { const ch = opts(a, ng, d);
    return { text: `${c ? `「${D(c)}」\n` : ''}えに あう ことばを ただしく かいて いるのは？`, sayQ: `${c ? end(Y(c)) : ''}えに あう ことばを ただしく かいて いるのは どれ？`, viz: ill(il), ans: a, choices: ch, bigC: true, ng: pairNg(a),
      steps: [{ h: ill(il) + `<div class="sk-beats">${bt.map((b) => `<i>${b}</i>`).join('')}</div>`, s: `てを たたいて よもう。${bt.join('、')}` }, { h: big(a), s: `${tip}。ただしくは ${a}` }] }; }));

  // ───── おとうとねずみ チロ
  const chiro1 = [
    { lv: 1, t: 'ある {日|ひ}、{三|さん}びきの ねずみの きょうだいの ところへ、おばあちゃんから {手|て}がみが とどきました。', q: '{手|て}がみは だれから とどいた？', a: 'おばあちゃん', ng: ['おかあさん', 'にいさんねずみ', 'ともだち'], k: 'おばあちゃんから', iv: 'mouse' },
    { lv: 1, t: '「あたらしい けいとで、おまえたちの チョッキを あんで います。けいとの いろは、{赤|あか}と {青|あお}です。」', q: 'おばあちゃんが あんで いる ものは？', a: 'チョッキ', ng: ['ぼうし', 'てぶくろ', 'マフラー'], k: 'チョッキを あんで います', il: 'vest' },
    { lv: 1, t: '「あたらしい けいとで、おまえたちの チョッキを あんで います。けいとの いろは、{赤|あか}と {青|あお}です。」', q: 'けいとの いろは？', a: '{赤|あか}と {青|あお}', ng: ['{赤|あか}と {白|しろ}', '{青|あお}と きいろ', '{白|しろ}と くろ'], k: '{赤|あか}と {青|あお}です' },
    { lv: 1, t: '{三|さん}びきの ねずみの きょうだいが いました。いちばん {下|した}の おとうとねずみは、チロと いう {名|な}まえです。', q: 'チロは だれ？', a: 'おとうとねずみ', ng: ['にいさんねずみ', 'ねえさんねずみ', 'おじいさんねずみ'], k: 'おとうとねずみは、チロと いう {名|な}まえ', iv: 'mouse' },
    { lv: 2, t: 'にいさんねずみは「ぼくは {赤|あか}が いいな。」と いい、ねえさんねずみは「わたしは {青|あお}が すき。」と いいました。', q: '{青|あお}が すきなのは だれ？', a: 'ねえさんねずみ', ng: ['にいさんねずみ', 'チロ', 'おばあちゃん'], k: 'ねえさんねずみは「わたしは {青|あお}が すき。」' },
    { lv: 2, t: 'チロは「ぼくは {赤|あか}と {青|あお}。」と いいました。', q: 'チロが ほしい いろは？', a: '{赤|あか}と {青|あお}', ng: ['{赤|あか}だけ', '{青|あお}だけ', 'きいろ'], k: '「ぼくは {赤|あか}と {青|あお}。」' },
    { lv: 3, t: 'チロは「ぼくのも あるよ。」と いいかえしましたが、ほんとうは とても しんぱいでした。', q: 'この ときの チロの ほんとうの きもちは？', a: 'とても しんぱい', ng: ['とても うれしい', 'とても ねむい', 'とても おこって いる'], k: 'ほんとうは とても しんぱい' },
    { lv: 3, t: 'チロは まだ {字|じ}が かけません。だから {手|て}がみで おばあちゃんに たのむ ことも できません。', q: '{手|て}がみで たのめない わけは？', a: 'まだ {字|じ}が かけないから', ng: ['{手|て}がみが ないから', 'おばあちゃんが ねて いるから', 'いそがしいから'], k: 'まだ {字|じ}が かけません' },
  ];
  const chiro2 = [
    { lv: 1, t: 'チロは どんどん はしって いって、おかの てっぺんの {木|き}に のぼりました。', q: 'チロが のぼったのは どこ？', a: 'おかの てっぺんの {木|き}', ng: ['いえの やね', '{山|やま}の てっぺん', 'はしの 上'], k: 'おかの てっぺんの {木|き}' },
    { lv: 1, t: '{木|き}に {立|た}つと、たにを はさんで、たかい {山|やま}が {見|み}えました。おばあちゃんの うちは、あの {山|やま}の ずっと むこうがわです。', q: 'おばあちゃんの うちは どこ？', a: '{山|やま}の ずっと むこうがわ', ng: ['おかの {下|した}', 'たにの そこ', 'となりの いえ'], k: '{山|やま}の ずっと むこうがわ' },
    { lv: 2, t: '「おばあちゃあん……。」と よぶと、「おばあちゃあん、おばあちゃあん……。」と、こえが くりかえし ひびきながら、だんだん とおく なって いきました。', q: 'チロの こえは どう なって いった？', a: 'だんだん とおく なった', ng: ['だんだん {大|おお}きく なった', 'すぐに きえた', 'ずっと おなじだった'], k: 'だんだん とおく なって いきました' },
    { lv: 2, t: 'チロは {大|おお}きく {口|くち}を あけ、いちばん だいじな ことを いいました。', q: 'チロが いった いちばん だいじな ことばは？', a: '「ぼくにも チョッキ、あんでね。」', ng: ['「ぼくは、チロだよう。」', '「チロのは ないよ。」', '「おばあちゃん、こんにちは。」'], k: 'いちばん だいじな こと', hs: 'チロが いちばん いいたかった ことは', w: 'チョッキが ほしかったんだね' },
    { lv: 2, t: 'なん{日|にち}か たって、おばあちゃんから {小|こ}づつみが とどきました。{中|なか}には、けいとの チョッキが {三|さん}まい。', q: 'チョッキは なんまい？', a: '{三|さん}まい', ng: ['{一|いち}まい', '{二|に}まい', '{四|よん}まい'], k: 'チョッキが {三|さん}まい', il: 'vest' },
    { lv: 3, t: 'いちばん {大|おお}きいのが {赤|あか}。つぎが {青|あお}。{小|ちい}さいのは、{赤|あか}と {青|あお}の よこじま。', q: 'チロの チョッキは どれ？', a: '{赤|あか}と {青|あお}の よこじま', ng: ['{赤|あか}', '{青|あお}', '{白|しろ}と くろの しましま'], k: '{小|ちい}さいのは、{赤|あか}と {青|あお}の よこじま', w: 'チロは いちばん ちいさいね', il: 'vest' },
    { lv: 3, t: 'いちばん {大|おお}きいのが {赤|あか}。つぎが {青|あお}。{小|ちい}さいのは、{赤|あか}と {青|あお}の よこじま。', q: 'いちばん {大|おお}きい チョッキの いろは？', a: '{赤|あか}', ng: ['{青|あお}', 'よこじま', 'きいろ'], k: 'いちばん {大|おお}きいのが {赤|あか}' },
    { lv: 3, t: 'チロは チョッキを きると、また おかの てっぺんの {木|き}へ かけのぼりました。', q: 'こんどは なんと いった？', a: '「しましまの チョッキ、ありがとう。」', ng: ['「ぼくにも チョッキ、あんでね。」', '「チロのは ないよ。」', '「さむいよう。」'], k: 'また おかの てっぺんの {木|き}へ', hs: 'チョッキが とどいた あとだよ', w: 'おれいを いったんだね' },
  ];
  const CHIRO_EV = ['おばあちゃんから {手|て}がみが とどく', 'チロが しんぱいに なる', 'おかの {木|き}に のぼって よぶ', '{小|こ}づつみが とどく', 'チョッキを きて おれいを いう'];
  const SERIFU = [['「チロのは ないよ。」', 'にいさんねずみ'], ['「そうよ。{青|あお}いのと {赤|あか}いのだけよ。」', 'ねえさんねずみ'], ['「そんな こと ないよ。ぼくのも あるよ。」', 'チロ'], ['「たのしみに まって いて ください。」', 'おばあちゃん'], ['「あ、しましまだ。だあいすき。」', 'チロ']];
  const WHO = ['にいさんねずみ', 'ねえさんねずみ', 'チロ', 'おばあちゃん'];
  const KJ_CHIRO = [{ s: '[手|て]がみが とどく。', ng: ['め', 'け', 'しゅ'] }, { s: '[赤|あか]い チョッキ', ng: ['あお', 'しろ', 'あけ'] }, { s: '[青|あお]が すき。', ng: ['あか', 'みどり', 'せい'] }, { s: 'チロと いう [名|な]まえ', ng: ['め', 'ゆう', 'みょう'] },
    { lv: 2, s: '{木|き}に [立|た]つ。', ng: ['う', 'も', 'ま'] }, { lv: 2, s: '{大|おお}きく [口|くち]を あける。', ng: ['め', 'みみ', 'て'] }, { lv: 2, s: 'じっと [耳|みみ]を すます。', ng: ['め', 'くち', 'て'] }, { lv: 3, s: 'こえを はり[上|あ]げる。', ng: ['うえ', 'した', 'のぼ'] }, { lv: 3, s: '[小|こ]づつみが とどく。', ng: ['ちい', 'しょう', 'お'] }];
  const KW_CHIRO = [{ s: '[赤|あか]い チョッキ', ng: ['青', '白', '黄'], w: 'あかは したに ひらいた かたち' }, { s: '[青|あお]い そら', ng: ['赤', '月', '春'], w: 'あおは したに つきの かたち' }, { s: '[手|て]がみ', ng: ['毛', '子', '午'], w: 'ゆびを ひろげた て の かたち' },
    { lv: 2, s: '[口|くち]を あける', ng: ['日', '目', '田'], w: 'あいた くちの かたち' }, { lv: 2, s: '[耳|みみ]を すます', ng: ['目', '月', '自'], w: 'みみの かたち。よこぼうが みっつ' }, { lv: 3, s: '[名|な]まえを かく', ng: ['夕', '各', '石'], w: 'ゆうがたの ゆう に くち' }, { lv: 3, s: '{木|き}に [立|た]つ', ng: ['六', '文', '交'], w: 'じめんに ひとが たって いる かたち' }];
  const chiro3 = [
    F(1, (d) => ordQ('「おとうとねずみ チロ」の できごとの じゅんばん', CHIRO_EV, d)),
    F(2, (d) => { const [s, a] = pick(SERIFU); const ch = opts(a, WHO, d); return { text: `${D(s)}\nこれは だれの ことば？`, sayQ: Y(`${s} これは だれの ことば？`), ans: a, choices: ch, ...look(ch), steps: [{ h: `<div class="sk-p">${D(s)}</div>` + big(a), s: Y(`これは ${a}の ことば`) }] }; }),
    F(1, (d) => kjR(KJ_CHIRO, d)), F(2, (d) => kjW(KW_CHIRO, d)), F(3, (d) => kjR(KJ_CHIRO, d)), F(3, (d) => kjW(KW_CHIRO, d)),
  ];

  // ───── かん字を つかおう１
  const kanji1 = [
    F(1, (d) => kjR([{ s: '{女|おんな}の{子|こ}の くつが [一|いっ]そく。', ng: ['いち', 'ひと', 'に'] }, { s: '[川|かわ]の そばに とんぼ。', ng: ['やま', 'き', 'たに'] }, { lv: 2, s: 'とんぼが [七|なな]ひき。', ng: ['はち', 'ろく', 'じゅう'] }, { lv: 2, s: '[四|よん]かいの へや', ng: ['ご', 'に', 'さん'] }, { lv: 3, s: 'がびょうが [十二|じゅうに]こ。', ng: ['にじゅう', 'じゅうさん', 'とおに'] },
      { s: '[女|おんな]の{子|こ}', ng: ['おとこ', 'こ', 'め'] }, { s: '[男|おとこ]の{子|こ}', ng: ['おんな', 'た', 'ちから'] }, { lv: 2, s: '{男|おとこ}の[子|こ]', ng: ['し', 'ね', 'じ'] }], d)),
    F(2, (d) => kjW([{ s: '[女|おんな]の{子|こ}', ng: ['男', '安', '子'], w: 'おんなの ひとが すわって いる かたち' }, { s: '[男|おとこ]の{子|こ}', ng: ['女', '田', '力'], w: 'たんぼで ちからを だす ひと。うえが た、したが ちから' }, { s: '{女|おんな}の[子|こ]', ng: ['字', '了', '手'], w: 'あかちゃんの かたち' }, { lv: 3, s: '[川|かわ]の そば', ng: ['小', '山', '三'], w: 'みずが ながれる かたち' }], d)),
    F(3, (d) => kjR([{ s: 'とんぼが [七|なな]ひき。', ng: ['はち', 'ろく', 'じゅう'] }, { s: 'がびょうが [十二|じゅうに]こ。', ng: ['にじゅう', 'じゅうさん', 'とおに'] }, { s: '{女|おんな}の{子|こ}の くつが [一|いっ]そく。', ng: ['いち', 'ひと', 'に'] }], d)),
  ];

  // ───── すきな おはなしは なにかな（きいろい ばけつ）
  const bucket = [
    { lv: 1, t: 'げつようび。きつねの こが、まるきばしの たもとで きいろい ばけつを みつけました。', q: 'ばけつを みつけたのは だれ？', a: 'きつねの こ', ng: ['うさぎの こ', 'くまの こ', 'たぬきの こ'], k: 'きつねの こ', il: 'bucket' },
    { lv: 1, t: 'げつようび。きつねの こが、まるきばしの たもとで きいろい ばけつを みつけました。', q: 'ばけつの いろは？', a: 'きいろ', ng: ['あか', 'あお', 'みどり'], k: 'きいろい ばけつ', il: 'bucket' },
    { lv: 2, t: 'げつようび。きつねの こが、まるきばしの たもとで きいろい ばけつを みつけました。', q: 'どこで みつけた？', a: 'まるきばしの たもと', ng: ['もりの なか', 'いえの まえ', 'がっこうの にわ'], k: 'まるきばしの たもと' },
    { lv: 2, t: 'げつようび。きつねの こが、まるきばしの たもとで きいろい ばけつを みつけました。', q: 'なんようびの こと？', a: 'げつようび', ng: ['すいようび', 'きんようび', 'にちようび'], k: 'げつようび' },
    { lv: 2, t: 'ばけつの なかには、ほんの すこし みずが はいって いました。かおを ちかづけると、みずに かおが うつりました。', q: 'ばけつの なかに あったのは？', a: 'すこしの みず', ng: ['さかな', 'どんぐり', 'すな'], k: 'ほんの すこし みずが' },
    { lv: 3, t: 'ばけつの なかには、ほんの すこし みずが はいって いました。かおを ちかづけると、みずに かおが うつりました。', q: 'みずに うつったのは？', a: 'きつねの こ の かお', ng: ['にじ', 'はな', 'くも'], k: 'みずに かおが うつりました' },
    { lv: 3, t: 'めいさんの カード：バケツの {中|なか}の {水|みず}に、{月|つき}が うつる ところが すきです。', q: 'めいさんが すきな ところは？', a: '{水|みず}に {月|つき}が うつる ところ', ng: ['バケツを みつける ところ', 'きつねが はしる ところ', 'はしを わたる ところ'], k: '{月|つき}が うつる ところ' },
    F(2, (d) => kjR([{ s: '{一|いち}[年|ねん]{生|せい}の {本|ほん}だな', ng: ['とし', 'なん', 'せい'] }], d)),
  ];

  // ───── みみずの たいそう
  const MIMI = 'つちの なかから とびだして<br>みみずの たいそう<br>ぴん ぴこ ぴん';
  const mimizu = [
    { lv: 1, t: MIMI, q: 'だれの たいそう？', a: 'みみず', ng: ['かえる', 'ねこ', 'へび'], k: 'みみずの たいそう' },
    { lv: 1, t: MIMI, q: 'どこから とびだした？', a: 'つちの なか', ng: ['みずの なか', 'そら', 'はなの なか'], k: 'つちの なかから' },
    { lv: 2, q: 'しの なかで なんども {出|で}て くる ことばは？', a: 'ぴん ぴこ ぴん', ng: ['ぴょん ぴょん', 'くね くね', 'ぱっ ぱっ'], w: 'ぴん ぴこ ぴん は なんども でて くるね' },
    { lv: 2, t: 'あさの くうきを<br>いっぱい すって', q: 'あさの なにを いっぱい すった？', a: 'くうき', ng: ['みず', 'つゆ', 'はなの みつ'], k: 'あさの くうきを' },
    { lv: 3, t: 'はりきり はじけて<br>はねすぎて<br>ちきゅうの そとへ', q: 'はねすぎて どこへ いった？', a: 'ちきゅうの そと', ng: ['つちの なか', 'いけの なか', 'くさの かげ'], k: 'ちきゅうの そとへ', il: 'earth' },
  ];

  // ───── むかしばなしを たのしもう
  const MK = ['ももたろう', 'うらしまたろう', 'かぐやひめ', 'さるかにがっせん', 'かちかち{山|やま}', '{花|はな}さかじいさん', 'おむすびころりん', 'つるの おんがえし'];
  const MKD = { ももたろう: 'ももから うまれた おとこのこが、おにたいじに いく おはなし', うらしまたろう: 'かめを たすけて、りゅうぐうじょうへ いく おはなし', かぐやひめ: 'たけを きったら、なかに ちいさな おひめさまが いた おはなし', さるかにがっせん: 'かにと さるが でて くる おはなし', 'かちかち{山|やま}': 'うさぎと たぬきが でて くる おはなし', '{花|はな}さかじいさん': 'はいを まいて、かれきに はなを さかせる おはなし', おむすびころりん: 'おむすびが あなに ころがって、ねずみが でて くる おはなし', 'つるの おんがえし': 'たすけて もらった つるが、おれいに はたを おる おはなし' };
  const mukashi0 = [
    { lv: 1, q: 'ももたろうは なにから うまれた？', a: 'もも', ng: ['かぼちゃ', 'たけ', 'たまご'], il: 'peach' },
    { lv: 1, q: '「どんぶらこ、どんぶらこ。」と ながれて きたのは？', a: 'もも', ng: ['はこ', 'ふね', 'おむすび'], il: 'peach', w: 'ももたろうの おはなしだね' },
    { lv: 1, q: 'かめに のって りゅうぐうじょうへ いくのは？', a: 'うらしまたろう', ng: MK, il: 'turtle' },
    { lv: 2, q: 'たけを きったら、なかに ちいさな おひめさまが いた おはなしは？', a: 'かぐやひめ', ng: MK },
    { lv: 2, q: 'かにと さるが {出|で}て くる おはなしは？', a: 'さるかにがっせん', ng: MK },
    { lv: 2, q: 'うさぎと たぬきが {出|で}て くる おはなしは？', a: 'かちかち{山|やま}', ng: MK },
    { lv: 2, q: 'はいを まいて かれ{木|き}に {花|はな}を さかせる おはなしは？', a: '{花|はな}さかじいさん', ng: MK },
    { lv: 3, q: 'おむすびが あなに ころがって いって、ねずみが {出|で}て くる おはなしは？', a: 'おむすびころりん', ng: MK },
    { lv: 3, q: 'ももたろうと いっしょに おにたいじに いったのは？', a: 'いぬ・さる・きじ', ng: ['いぬ・ねこ・とり', 'くま・うさぎ・きじ', 'さる・かに・はち'] },
  ];

  const MKI = { ももたろう: 'peach', うらしまたろう: 'turtle', さるかにがっせん: 'monkey', 'かちかち{山|やま}': 'raccoon', '{花|はな}さかじいさん': 'sakura', おむすびころりん: 'onigiri', かぐやひめ: 'kaguya', 'つるの おんがえし': 'bird' };
  const mukashi = mukashi0.map((it) => (it.ng === MK ? { ...it, il: it.il || MKI[it.a], w: MKD[it.a] ? `「${it.a}」は、${MKD[it.a]}` : it.w, nw: Object.fromEntries(MK.map((x) => [x, { s: `「${x}」は、${MKD[x]}`, il: MKI[x] }])) } : it));
  // ───── おはなしを かこう（かぼちゃたろう）
  const KABO = 'ある {日|ひ}、おばあさんは、{川|かわ}で かぼちゃを ひろいました。その かぼちゃから {赤|あか}んぼうが {生|う}まれました。';
  const kabocha = [
    { lv: 1, t: KABO, q: 'かぼちゃたろうは なにから {生|う}まれた？', a: 'かぼちゃ', ng: ['もも', 'たけ', 'すいか'], k: 'その かぼちゃから', il: 'pumpkin' },
    { lv: 1, t: KABO, q: 'おばあさんは どこで かぼちゃを ひろった？', a: '{川|かわ}', ng: ['{山|やま}', 'はたけ', 'うみ'], k: '{川|かわ}で' },
    { lv: 2, t: 'かぼちゃたろうは、とても {力|ちから}もちで、すもうが とくいです。', q: 'かぼちゃたろうの とくいな ことは？', a: 'すもう', ng: ['およぐ こと', 'うた', 'えかき'], k: 'すもうが とくい' },
    { lv: 2, t: 'かぼちゃたろうは、{大|おお}きく なって、{村|むら}の すもう{大|たい}かいに {出|で}ました。', q: 'かぼちゃたろうが {出|で}た {大|たい}かいは？', a: 'すもう{大|たい}かい', ng: ['かけっこ{大|たい}かい', 'うたの {大|たい}かい', 'つりの {大|たい}かい'], k: 'すもう{大|たい}かい' },
    { lv: 3, t: '{大|たい}かいで ゆうしょうして、なすたろうや トマトたろうと ともだちに なりました。', q: 'ともだちに なったのは？', a: 'なすたろうと トマトたろう', ng: ['ももたろうと きんたろう', 'きゅうりたろうと にんじんたろう', 'おじいさんと おばあさん'], k: 'なすたろうや トマトたろう' },
    { lv: 3, q: 'けんたさんは、なにの まねを して この おはなしを かいた？', a: 'むかしばなし', ng: ['ずかん', 'しんぶん', 'てがみ'], k: 'むかしばなしの まねを して', hs: 'けんたさんは こう いって いたよ' },
    F(2, (d) => kjR([{ s: '[村|むら]の すもう{大|たい}かい', ng: ['まち', 'もり', 'はやし'] }, { lv: 3, s: 'すもう[大|たい]かい', ng: ['おお', 'だい', 'た'] }], d)),
  ];

  // ───── かたかなの かたち
  const HK = [['か', 'カ'], ['も', 'モ'], ['り', 'リ'], ['や', 'ヤ'], ['へ', 'ヘ'], ['き', 'キ'], ['せ', 'セ'], ['に', 'ニ']];
  const hkQ = (d) => { const [h, k] = pick(HK); const rev = lvOf(d) === 3 && Math.random() < 0.6;
    const ans = rev ? h : k; const ch = opts(ans, HK.map((x) => (rev ? x[0] : x[1])), d);
    return { text: rev ? `かたかなの「${k}」と かたちが にて いる ひらがなは？` : `ひらがなの「${h}」と かたちが にて いる かたかなは？`, sayQ: rev ? 'この かたかなと かたちが にて いる ひらがなは どれ？' : `ひらがなの ${h} と かたちが にて いる かたかなは どれ？`, ans, choices: ch, bigC: true, ng: pairNg(ans),
      steps: [{ h: `<div class="sk-sbs">${big(h)}<span class="ar">と</span>${big(`<b>${k}</b>`)}</div>`, s: `ひらがなの ${h} と、かたかなの ${h}。かたちが にて いるね` }] }; };
  const TIP = { シ: 'シは てんを よこに ならべて、さいごは したから うえへ はらう', ツ: 'ツは てんを うえに ならべて、さいごは うえから したへ はらう', ソ: 'ソは てんを うえに かいて、ながい せんは うえから したへ', ン: 'ンは てんを ひだりうえに かいて、せんは したから うえへ はらう',
    ア: 'アは さいごに ななめの せんを ながく はらう', マ: 'マは さいごに みじかい てんを うつ', ク: 'クは はじめに ななめの みじかい せんを かく', ワ: 'ワは はじめに みじかい たての せんを かく' };
  const KW2 = [['sticker', 'シール', 0, 'ツ', 'ミ', ['ツール', 'ミール']], ['bucket', 'バケツ', 2, 'シ', 'ミ', ['バケシ', 'バケミ']], ['sausage', 'ソーセージ', 0, 'ン', 'リ', ['ンーセージ', 'リーセージ']], ['lion', 'ライオン', 3, 'ソ', 'リ', ['ライオソ', 'ライオリ']],
    ['koala', 'コアラ', 1, 'マ', 'フ', ['コマラ', 'コフラ']], ['cape', 'マント', 0, 'ア', 'フ', ['アント', 'フント']], ['necktie', 'ネクタイ', 1, 'ワ', 'タ', ['ネワタイ', 'ネタタイ']], ['shower', 'シャワー', 2, 'ク', 'ウ', ['シャクー', 'シャウー']]];
  const kwQ = (d) => { const [il, w, p, sim, oth, wrong] = pick(KW2); const L = [...w]; const t = L[p]; const blank = lvOf(d) === 1 || (lvOf(d) === 2 && Math.random() < 0.5);
    const mark = L.map((c, i) => (i === p ? `<b class="mark">${c}</b>` : c)).join('');
    const steps = [{ h: ill(il) + big(mark), s: `${w}。${TIP[t]}` }, { h: `<div class="sk-sbs">${big(t)}<span class="ar">と</span>${big(sim)}</div>`, s: TIP[sim] }];
    if (blank) { const ch = shuffle([t, sim, oth]); return { text: `「${L.map((c, i) => (i === p ? '□' : c)).join('')}」\n□に はいる かたかなは？`, sayQ: `${w}。しかくに はいる かたかなは どれ？`, viz: ill(il), ans: t, choices: ch, bigC: true, ng: pairNg(t), steps }; }
    const ch = shuffle([w, ...wrong]); return { text: 'ただしく かいて いるのは？', sayQ: `${w}。ただしく かいて いるのは どれ？`, viz: ill(il), ans: w, choices: ch, bigC: true, ng: pairNg(w), steps };
  };
  const kata1 = [F(1, hkQ), F(2, hkQ), F(3, hkQ)];
  const kata2 = [F(1, kwQ), F(2, kwQ), F(3, kwQ)];

  // ───── かん字を つかおう２
  const kanji2 = [
    F(1, (d) => kjR([{ s: 'じてん[車|しゃ]が {三|さん}だい。', ng: ['くるま', 'じゃ', 'しや'] }, { s: 'じてん{車|しゃ}が [三|さん]だい。', ng: ['みっ', 'し', 'ご'] }, { lv: 2, s: 'タイヤが [六|むっ]つ。', ng: ['ろく', 'みっ', 'よっ'] }, { s: 'ライオンの [口|くち]の {中|なか}', ng: ['め', 'みみ', 'て'] },
      { s: 'ライオンの {口|くち}の [中|なか]', ng: ['うえ', 'した', 'ちゅう'] }, { s: 'うさぎの [耳|みみ]の {下|した}', ng: ['め', 'くち', 'あし'] }, { lv: 2, s: 'うさぎの {耳|みみ}の [下|した]', ng: ['うえ', 'なか', 'しも'] }, { lv: 2, s: 'さかなの [青|あお]い {目|め}', ng: ['あか', 'しろ', 'せい'] }, { lv: 3, s: 'あたまの [上|うえ]', ng: ['した', 'なか', 'あ'] }], d)),
    F(2, (d) => kjW([{ s: 'じてん[車|しゃ]', ng: ['東', '早', '草'] }, { s: 'ライオンの [口|くち]', ng: ['日', '目', '田'] }, { s: 'うさぎの [耳|みみ]', ng: ['目', '月', '自'] }, { s: '[青|あお]い {目|め}', ng: ['赤', '月', '春'] }, { lv: 3, s: 'さかなの {青|あお}い [目|め]', ng: ['日', '耳', '月'] }, { lv: 3, s: 'あたまの [上|うえ]', ng: ['下', '止', '土'] }], d)),
  ];

  // ───── 子どもを まもる どうぶつたち
  const mamoru1 = [
    { lv: 1, t: 'オオアリクイは、ながい したを つかって、アリや シロアリを とって たべます。', q: 'オオアリクイが たべる ものは？', a: 'アリや シロアリ', ng: ['さかな', 'くさ', 'きのみ'], k: 'アリや シロアリ', iv: 'anteater' },
    { lv: 1, t: 'ライオンは、{子|こ}どもを {口|くち}に くわえて、あんぜんな ところまで はこびます。', q: 'ライオンは {子|こ}どもを どう はこぶ？', a: '{口|くち}に くわえて', ng: ['せなかに のせて', 'てで だいて', 'しっぽで まいて'], k: '{口|くち}に くわえて', iv: 'lion' },
    { lv: 2, t: 'したを しまって おく ために、オオアリクイの {口|くち}は ほそながく なって います。', q: '{口|くち}が ほそながいのは なんの ため？', a: 'したを しまって おく ため', ng: ['{水|みず}を のむ ため', 'こえを {出|だ}す ため', '{子|こ}どもを くわえる ため'], k: 'したを しまって おく ために', iv: 'anteater' },
    { lv: 2, t: 'オオアリクイは {口|くち}が ほそながいので、{子|こ}どもを くわえて はこぶ ことが できません。', q: '{子|こ}どもを くわえて はこべない わけは？', a: '{口|くち}が ほそながいから', ng: ['はが ないから', 'からだが {小|ちい}さいから', 'あしが みじかいから'], k: '{口|くち}が ほそながいので' },
    { lv: 2, t: 'オオアリクイの おやは、{子|こ}どもを せなかに のせて はこびます。', q: '{子|こ}どもを どこに のせる？', a: 'せなか', ng: ['あたま', 'おなか', 'しっぽ'], k: 'せなかに のせて', iv: 'anteater' },
    { lv: 3, t: 'せなかに のせると、おやの もようと {子|こ}どもの もようが つながって、{子|こ}どもが {目|め}{立|だ}たなく なります。', q: 'せなかに のせると どう なる？', a: '{子|こ}どもが {目|め}{立|だ}たなく なる', ng: ['{子|こ}どもが はやく そだつ', '{子|こ}どもが ねむく なる', 'おやが はやく はしれる'], k: '{子|こ}どもが {目|め}{立|だ}たなく なります', w: 'もようが つながって、てきから みつかりにくい' },
  ];
  const KOCHI_EV = ['{早|はや}{足|あし}で すから とおざかる', 'なきごえを {上|あ}げて、はねを バサバサ させる', 'はねを ひきずって、よろよろ あるく'];
  const mamoru2 = [
    { lv: 1, t: 'コチドリは、{小|ちい}さな わたりどりです。なつに {日|に}{本|ほん}に やって きます。', q: 'コチドリが {日|に}{本|ほん}に くるのは いつ？', a: 'なつ', ng: ['ふゆ', 'あき', 'はる'], k: 'なつに', iv: 'plover' },
    { lv: 1, t: 'コチドリは、じゃりの じめんに すを つくります。', q: 'コチドリは すを どこに つくる？', a: 'じゃりの じめん', ng: ['{木|き}の {上|うえ}', 'いえの やね', '{水|みず}の {中|なか}'], k: 'じゃりの じめん', iv: 'plover' },
    { lv: 2, t: 'じゃりの じめんに すを つくるので、ひなが てきから よく {見|み}えて しまいます。', q: 'こまる ことは なに？', a: 'ひなが てきから よく {見|み}える', ng: ['たまごが われやすい', 'たべものが ない', 'さむくて ねられない'], k: 'ひなが てきから よく {見|み}えて しまいます' },
    F(2, (d) => ordQ('コチドリの おやが てきを {見|み}つけた ときに する じゅんばん', KOCHI_EV, d, ['ひなを くわえて とぶ', 'すを こわして にげる'])),
    { lv: 3, t: 'おやは、じぶんが けがを して いると てきに {見|み}せかけて、てきの ちゅういを ひなから そらします。', q: 'けがの ふりを するのは なんの ため？', a: 'てきの ちゅういを ひなから そらす ため', ng: ['ひなに とびかたを おしえる ため', 'なかまを よぶ ため', 'ひるねを する ため'], k: 'てきの ちゅういを ひなから そらします' },
    F(2, (d) => kjR([{ s: '[早|はや]{足|あし}で はなれる。', ng: ['そう', 'くさ', 'はな'] }, { s: '{早|はや}[足|あし]で はなれる。', ng: ['そく', 'て', 'くち'] }], d)),
    F(3, (d) => kjW([{ s: '[早|はや]く おきる', ng: ['草', '車', '旦'], w: 'ひの したに じゅう' }, { s: '[足|あし]が はやい', ng: ['兄', '早', '是'], w: 'くちの したに ひざと あし' }], d)),
  ];
  const ANI = ['オオアリクイ', 'コチドリ', 'ライオン'];
  const mamoru3 = [
    { lv: 1, q: '{子|こ}どもを せなかに のせて はこぶのは？', a: 'オオアリクイ', ng: ANI, il: 'anteater' },
    { lv: 1, q: 'けがを した ふりを して、てきを ひなから とおざけるのは？', a: 'コチドリ', ng: ANI, il: 'plover' },
    { lv: 1, q: '{子|こ}どもを {口|くち}に くわえて はこぶのは？', a: 'ライオン', ng: ANI, il: 'lion' },
    { lv: 2, q: 'オオアリクイと コチドリの にて いる ところは？', a: 'どちらも {子|こ}どもを くわえて はこべない', ng: ['どちらも そらを とぶ', 'どちらも ながい したが ある', 'どちらも じゃりに すを つくる'], w: 'くわえて はこべないから、べつの ちえを つかうんだね' },
    { lv: 2, q: 'ふたつの ものを くらべて よむと、なにが {見|み}つかる？', a: 'にて いる ところや ちがう ところ', ng: ['ただしい かん{字|じ}', 'いちばん ながい {文|ぶん}', 'すきな いろ'], w: 'くらべて よむと、にて いる ところや ちがう ところが わかるね' },
    { lv: 3, t: 'どうぶつたちは、さまざまな ちえを つかって {子|こ}どもを てきから まもり、いのちを つないで います。', q: 'どうぶつたちは なにを つかって {子|こ}どもを まもる？', a: 'ちえ', ng: ['どうぐ', 'つよい きば', 'おかね'], k: 'さまざまな ちえを つかって' },
  ];

  // ───── ことばを あつめよう
  const YOUSU = ['あまい', '{小|ちい}さい', 'まるい', 'かたい', '{赤|あか}い'], MONO = ['かぶ', 'とびら', 'トマト', 'さかな', 'けいと'], UGOKI = ['まるめる', 'たべる', 'ひっぱる', 'きる', 'たたく'];
  const KIND = [['ようすを あらわす ことば', YOUSU], ['ものの なまえ', MONO], ['うごきを あらわす ことば', UGOKI]];
  const kindQ = (d) => { const i = R(0, 2); const [nm, L] = KIND[i]; const a = pick(L); const ng = KIND.filter((_, j) => j !== i).flatMap((x) => shuffle(x[1]).slice(0, 2)); const ch = opts(a, ng, d);
    return { text: `「${nm}」は どれ？`, sayQ: `${nm} は どれ？`, ans: D(a), choices: ch, ...look(ch), steps: [{ h: `<div class="sk-p">${nm}</div><div class="sk-p">${L.map(D).join('・')}</div>`, s: Y(`${nm}は、${L.join('、')}`) }] }; };
  const atsume = [
    F(1, kindQ), F(2, kindQ),
    { lv: 1, q: 'あまい （　）を たべる。', sq: 'あまい まる を たべる。まるに あう ことばは どれ？', a: 'トマト', ng: ['とびら', 'けいと', 'くつ'], w: 'たべられるのは トマト' },
    { lv: 2, q: 'とびらを （　）。', sq: 'とびらを まる。まるに あう ことばは どれ？', a: 'たたく', ng: ['たべる', 'のむ', 'まるめる'], w: 'とびらを とんとん たたく' },
    { lv: 2, q: '{大|おお}きな かぶを （　）。', sq: 'おおきな かぶを まる。まるに あう ことばは どれ？', a: 'ひっぱる', ng: ['のむ', 'たたむ', 'およぐ'], w: 'うんとこしょ、どっこいしょ と ひっぱるね' },
    { lv: 3, q: 'けいとを （　）。', sq: 'けいとを まる。まるに あう ことばは どれ？', a: 'まるめる', ng: ['たべる', 'のむ', 'およぐ'], w: 'けいとを くるくる まるめる' },
    { lv: 3, q: '{文|ぶん}に なって いるのは どれ？', a: 'あまい トマトを ゆっくり たべる。', ng: ['トマトを あまい たべる ゆっくり。', 'たべる あまい ゆっくり トマトを。', 'ゆっくり トマト あまい たべるを。'], w: 'ようす、もの、ようす、うごき の じゅんに つなぐと よく わかる' },
  ];

  // ───── 小学校の ことを しょうかいしよう
  const SEASON = [['はる', 'えん{足|そく}', 'どうぶつえんに いく'], ['なつ', 'プール', '{大|おお}きな プールで およぐ'], ['あき', '{音|おん}がくかい', 'けんばんハーモニカを えんそうする'], ['ふゆ', 'マラソン{大|たい}かい', 'はしりおわると すっきり']];
  const shokai = [
    ...SEASON.map(([s, e, x], i) => ({ lv: 1, q: `めいさんの はなしで、${s}の できごとは？`, a: e, ng: SEASON.map((y) => y[1]), w: `${s}は ${e}。${x}` })),
    F(1, (d) => ordQ('きせつの じゅんばん', ['はる', 'なつ', 'あき', 'ふゆ'], d)),
    { lv: 2, t: 'あきの {音|おん}がくかいでは、けんばんハーモニカを えんそうします。', q: 'えんそうする がっきは？', a: 'けんばんハーモニカ', ng: ['ピアノ', 'たいこ', 'カスタネット'], k: 'けんばんハーモニカ' },
    { lv: 2, t: 'はるには えん{足|そく}が あります。どうぶつえんに いきます。', q: 'えん{足|そく}で いく ところは？', a: 'どうぶつえん', ng: ['すいぞくかん', 'うみ', 'こうえん'], k: 'どうぶつえんに いきます', il: 'elephant' },
    { lv: 2, t: '{小|しょう}{学校|がっこう}の プールは {大|おお}きいので、おもいきり およげます。', q: 'おもいきり およげる わけは？', a: 'プールが {大|おお}きいから', ng: ['{水|みず}が あついから', 'みんなが いないから', 'うきわが あるから'], k: 'プールは {大|おお}きいので' },
    F(3, (d) => kjR([{ s: 'あたらしい {一|いち}{年|ねん}{生|せい}が [入|にゅう]{学|がく}する。', ng: ['はい', 'いり', 'にん'] }, { s: 'はるの えん[足|そく]', ng: ['あし', 'あ', 'た'] }, { s: '[小|しょう]{学校|がっこう}', ng: ['ちい', 'こ', 'お'] }, { s: 'みんなが はく[手|しゅ]を する。', ng: ['て', 'で', 'しょ'] }], d)),
  ];

  // ───── かん字を つかおう３
  const kanji3 = [
    F(1, (d) => kjR([{ s: '{山|やま}の [右|みぎ]がわ', ng: ['ひだり', 'うえ', 'いし'] }, { s: '{木|き}の [左|ひだり]がわ', ng: ['みぎ', 'した', 'ひだ'] }, { s: '[田|た]んぼが ひろがる。', ng: ['ひ', 'め', 'しろ'] }, { s: '[山|やま]の {右|みぎ}がわ', ng: ['かわ', 'き', 'やね'] },
      { lv: 2, s: '[八|はっ]さつの {本|ほん}', ng: ['はち', 'やっ', 'ろく'] }, { lv: 2, s: '[五|ご]{千|せん}{円|えん}', ng: ['いつ', 'ろく', 'に'] }, { lv: 2, s: '{五|ご}[千|せん]{円|えん}', ng: ['ひゃく', 'じゅう', 'まん'] }, { lv: 3, s: '[九|きゅう]{百|ひゃく}{円|えん}', ng: ['く', 'ここの', 'はち'] }, { lv: 3, s: '{九|きゅう}[百|ひゃく]{円|えん}', ng: ['せん', 'しろ', 'はく'] }, { lv: 3, s: '{九|きゅう}{百|ひゃく}[円|えん]', ng: ['まる', 'つき', 'めん'] }], d)),
    F(2, (d) => kjW([{ s: '{山|やま}の [右|みぎ]がわ', ng: ['石', '左', '名'], w: 'みぎは、くち の かたち' }, { s: '{木|き}の [左|ひだり]がわ', ng: ['右', '在', '友'], w: 'ひだりは、こう の かたち' }, { s: '[田|た]んぼ', ng: ['日', '白', '目'], w: 'たんぼを よっつに わけた かたち' },
      { lv: 3, s: '[千|せん]{円|えん}', ng: ['十', '干', '午'], w: 'じゅう の うえに ななめの せん' }, { lv: 3, s: '[百|ひゃく]{円|えん}', ng: ['白', '自', '日'], w: 'しろ の うえに よこぼう いっぽん' }, { lv: 3, s: '{百|ひゃく}[円|えん]', ng: ['月', '用', '内'], w: 'まるい おかねの えん' }], d)),
  ];

  // ───── スイミー
  const swimmy1 = [
    { lv: 1, t: 'みんな {赤|あか}いのに、{一|いっ}ぴきだけは、からす{貝|がい}よりも まっくろ。', q: 'きょうだいたちの いろは？', a: '{赤|あか}', ng: ['くろ', '{青|あお}', 'きいろ'], k: 'みんな {赤|あか}いのに', sq: 'みんな あかいのに、いっぴきだけは、からすがいよりも まっくろ。きょうだいたちの いろは なに？' },
    { lv: 1, t: 'みんな {赤|あか}いのに、{一|いっ}ぴきだけは、からす{貝|がい}よりも まっくろ。', q: 'スイミーの いろは？', a: 'まっくろ', ng: ['まっか', 'まっしろ', 'みどり'], k: 'まっくろ', sq: 'みんな あかいのに、いっぴきだけは、からすがいよりも まっくろ。スイミーの いろは なに？' },
    { lv: 1, t: 'およぐのは、だれよりも はやかった。{名|な}まえは スイミー。', q: 'スイミーの とくいな ことは？', a: 'はやく およぐ こと', ng: ['うたう こと', 'かくれる こと', 'たくさん たべる こと'], k: 'だれよりも はやかった' },
    { lv: 2, t: 'おそろしい まぐろが、おなかを すかせて、ミサイルみたいに つっこんで きた。', q: 'つっこんで きたのは？', a: 'まぐろ', ng: ['くじら', 'たこ', 'いるか'], k: 'おそろしい まぐろが', w: 'まぐろが、つっこんで きたんだね', il: 'tuna' },
    { lv: 2, t: 'おそろしい まぐろが、おなかを すかせて、ミサイルみたいに つっこんで きた。', q: 'まぐろは なにみたいに つっこんで きた？', a: 'ミサイル', ng: ['でんしゃ', 'かぜ', 'ボール'], k: 'ミサイルみたいに', il: 'tuna' },
    { lv: 2, t: '{一口|ひとくち}で、{小|ちい}さな {赤|あか}い さかなたちを、{一|いっ}ぴき のこらず のみこんだ。にげたのは スイミーだけ。', q: 'にげたのは だれ？', a: 'スイミーだけ', ng: ['みんな', '{赤|あか}い さかなたち', 'だれも いない'], k: 'にげたのは スイミーだけ', sq: 'ひとくちで、ちいさな あかい さかなたちを、いっぴき のこらず のみこんだ。にげたのは スイミーだけ。にげたのは だれ？' },
    { lv: 3, t: 'スイミーは およいだ、くらい うみの そこを。こわかった。さびしかった。とても かなしかった。', q: 'ひとりに なった スイミーの きもちは？', a: 'こわくて さびしくて かなしい', ng: ['たのしくて うれしい', 'おなかが いっぱい', 'ねむくて あくび'], k: 'こわかった。さびしかった。とても かなしかった。' },
    { lv: 3, t: 'けれど、うみには、すばらしい ものが いっぱい あった。おもしろい ものを {見|み}る たびに、スイミーは、だんだん げん{気|き}を とりもどした。', q: 'スイミーが げん{気|き}を とりもどした わけは？', a: 'おもしろい ものを {見|み}たから', ng: ['ごはんを たべたから', 'ともだちが きたから', 'よく ねたから'], k: 'おもしろい ものを {見|み}る たびに' },
  ];
  const TATOE = [['にじいろの ゼリーのような', 'くらげ', 'jellyfish'], ['{水|すい}{中|ちゅう}ブルドーザーみたいな', 'いせえび', 'spiny_lobster'], ['ドロップみたいな', 'いわ', null], ['ももいろの やしの {木|き}みたいな', 'いそぎんちゃく', 'sea_anemone'], ['ミサイルみたいに つっこんで きた', 'まぐろ', 'tuna']];
  const TOBJ = TATOE.map((x) => x[1]);
  const KJ_SW = [{ s: 'からすの [貝|かい]がら', ng: ['み', 'め', 'がい'] }, { s: '{見|み}えない [糸|いと]', ng: ['ひも', 'き', 'かい'] }, { s: 'こんぶや わかめの [林|はやし]', ng: ['もり', 'き', 'むら'] }, { lv: 2, s: '{水|すい}[中|ちゅう]ブルドーザー', ng: ['なか', 'じゅう', 'うえ'] }, { lv: 3, s: 'いわから [生|は]えて いる。', ng: ['う', 'い', 'せい'] }];
  const KW_SW = [{ s: '[貝|かい]がら', ng: ['見', '目', '具'], w: 'かいは、め の したに ちいさな あし' }, { s: '[糸|いと]で ひっぱる', ng: ['系', '米', '小'], w: 'いとを より あわせた かたち' }, { s: 'わかめの [林|はやし]', ng: ['森', '木', '休'], w: 'き が ふたつで はやし' }];
  const swimmy2 = [
    ...TATOE.map(([t, a, il]) => ({ lv: 1, q: `「${t}」のは なに？`, a, ng: [...TOBJ, 'うなぎ'], ...(il ? { il } : {}), w: `${t} ${a}` })),
    { lv: 2, q: 'かおを {見|み}る ころには、しっぽを わすれて いるほど ながいのは？', a: 'うなぎ', ng: TOBJ, il: 'eel', w: 'とても ながい うなぎ' },
    ...TATOE.slice(0, 4).map(([t, a, il]) => ({ lv: 2, q: `${a}は、なにのように かいて ある？`, a: t, ng: TATOE.map((x) => x[0]), ...(il ? { iv: il } : {}) })),
    F(2, (d) => kjR(KJ_SW, d)), F(3, (d) => kjW(KW_SW, d)), F(3, (d) => kjR(KJ_SW, d)),
  ];
  const SW_EV = ['{赤|あか}い きょうだいたちと くらす', 'まぐろが きょうだいを のみこむ', 'ひとりで くらい うみの そこを およぐ', 'おもしろい ものを {見|み}て げん{気|き}に なる', 'いわかげで きょうだいたちを {見|み}つける', '{大|おお}きな さかなの ふりを して およぐ', '{大|おお}きな さかなを おい{出|だ}す'];
  const swimmy3 = [
    { lv: 1, t: 'いわかげに スイミーは {見|み}つけた、スイミーのと そっくりの、{小|ちい}さな さかなの きょうだいたちを。', q: '{赤|あか}い さかなたちは どこに いた？', a: 'いわかげ', ng: ['うみの {上|うえ}', 'すなの {中|なか}', 'ふねの {下|した}'], k: 'いわかげに' },
    { lv: 1, t: '「だめだよ。{大|おお}きな さかなに たべられて しまうよ。」', q: '{赤|あか}い さかなたちが {出|で}て こない わけは？', a: 'たべられて しまうから', ng: ['ねむいから', 'さむいから', 'おなかが いっぱいだから'], k: 'たべられて しまうよ' },
    { lv: 2, t: '「そうだ。みんな いっしょに およぐんだ。うみで いちばん {大|おお}きな さかなの ふりを して。」', q: 'スイミーが かんがえた ことは？', a: '{大|おお}きな さかなの ふりを して およぐ', ng: ['ばらばらに にげる', 'いわかげに ずっと かくれる', 'まぐろと ともだちに なる'], k: 'いちばん {大|おお}きな さかなの ふりを して' },
    { lv: 2, t: 'スイミーは おしえた。けっして、はなればなれに ならない こと。みんな、もちばを まもる こと。', q: 'スイミーが おしえた ことは？', a: 'はなればなれに ならない こと', ng: ['はやく にげる こと', 'いわかげに かくれる こと', 'しずかに ねる こと'], k: 'はなればなれに ならない こと' },
    { lv: 2, t: 'みんなが、{一|いっ}ぴきの {大|おお}きな さかなみたいに およげるように なった とき、スイミーは いった。「ぼくが、{目|め}に なろう。」', q: 'スイミーは なにに なった？', a: '{目|め}', ng: ['しっぽ', 'ひれ', '{口|くち}'], k: '「ぼくが、{目|め}に なろう。」', w: 'まっくろな スイミーは め に ぴったり', sq: 'みんなが、いっぴきの おおきな さかなみたいに およげるように なった とき、スイミーは いった。ぼくが、めに なろう。スイミーは なにに なった？' },
    { lv: 3, q: '{赤|あか}い さかなたちと スイミーは、さいごに どう なった？', a: '{大|おお}きな さかなを おい{出|だ}した', ng: ['まぐろに たべられた', 'ばらばらに なった', 'いわかげに もどった'], k: 'みんなは およぎ、{大|おお}きな さかなを おい{出|だ}した', hs: 'おはなしの さいごに' },
    F(2, (d) => ordQ('「スイミー」の できごとの じゅんばん', SW_EV, d)),
    F(3, (d) => ordQ('「スイミー」の できごとの じゅんばん', SW_EV, d)),
    { lv: 3, q: '「スイミー」を かいた {人|ひと}の、ほかの おはなしは どれ？', a: 'じぶんだけの いろ', ng: ['おとうとねずみ チロは げんき', 'はなの すきな うし', '11ぴきの ねこ'], w: 'レオ・レオニさんの えほん' },
  ];

  // ───── かたちの にて いる かん字
  const NI = [['{三|さん}（　）で へやに {入|はい}る。', '人', ['入', '八', '大'], 'ひと は ひだりが ながい'], ['{三|さん}{人|にん}で へやに （　）る。', '入', ['人', '八', '大'], 'はいる は みぎが ながい'],
    ['{小|ちい}さな （　）を {見|み}つけた。', '貝', ['見', '目', '具'], 'かい の したは ちいさな てん ふたつ'], ['{小|ちい}さな {貝|かい}を （　）つけた。', '見', ['貝', '目', '兄'], 'みる の したは ひとの あし'],
    ['（　）{手|て}で {石|いし}を ひろう。', '右', ['石', '左', '名'], 'みぎ は うえに ななめの せんが でる'], ['{右|みぎ}{手|て}で （　）を ひろう。', '石', ['右', '名', '若'], 'いし は うえの よこぼうが みじかく ななめに つづく'],
    ['（　）のりを する {王|おう}さま。', '玉', ['王', '主', '土'], 'たま は みぎしたに てんが ある'], ['{玉|たま}のりを する （　）さま。', '王', ['玉', '主', '工'], 'おう は てんが ない'],
    ['（　）の {下|した}で {本|ほん}を よむ。', '木', ['本', '休', '水'], 'き には したの よこぼうが ない'], ['{木|き}の {下|した}で （　）を よむ。', '本', ['木', '休', '体'], 'ほん は きの したに よこぼう']];
  const niQ = (d) => { const [s, a, ng, w] = pick(NI); const ch = opts(a, ng, d);
    return { text: `（　）に あう かん字は？\n${D(s)}`, sayQ: end(Y(s)) + 'まるに あう かんじは どれ？', ans: a, choices: ch, bigC: true, kanji: true, ng: pairNg(a, 'kjs'),
      steps: [{ h: `<div class="sk-p">${D(s).replace('（　）', `<b class="mark big">${a}</b>`)}</div>`, s: `${w}。かたちの ちがいを よく みてね` }] }; };
  const MISS = [['{三|さん}{月|がつ}{十二|じゅうに}{日|にち} {火|か}よう[目|び]', '日', ['白', '月', '田'], 'ようびは ひ の じ'], ['[百|しろ]い {水|みず}{玉|たま}もよう', '白', ['日', '百', '自'], 'しろ には うえの よこぼうが ない'], ['[字|がっ]{校|こう}に いく。', '学', ['子', '字', '宇'], 'がっこうの が は うえに てんが みっつ'],
    ['[石|みぎ]{手|て}を あげる。', '右', ['石', '左', '若'], 'みぎ の したは くち'], ['{三|さん}[入|にん]で あそぶ。', '人', ['入', '八', '大'], 'ひと は ひだりが ながい'], ['[本|き]の えだに とまる。', '木', ['本', '休', '林'], 'き には したの よこぼうが ない'], ['{小|ちい}さな [見|かい]がら', '貝', ['見', '目', '具'], 'かい の したは ちいさな てん ふたつ'], ['[玉|おう]さまに あう。', '王', ['玉', '主', '土'], 'おう は てんが ない']];
  const missQ = (d) => { const [s, a, ng, w] = pick(MISS); const [, bad, yo] = s.match(TG); const ch = opts(a, ng.filter((x) => x !== a), d);
    return { text: `まちがって いる かん字が あるよ。\n${D(s.replace(TG, `<b class="mark">${bad}</b>`))}\nただしい かん字は？`, sayQ: 'まちがって いる かんじが あるよ。いろの ついた ところの ただしい かんじは どれ？', ans: a, choices: ch, bigC: true, kanji: true, ng: pairNg(a, 'kjs'),
      steps: [{ h: `<div class="sk-pair"><div class="ngp"><span class="lab">まちがい</span>${big(bad, 'kjs')}</div><div class="okp"><span class="lab">ただしい</span>${big(a, 'kjs')}</div></div>`, s: `${yo} は この かんじ。${w}` }, { h: `<div class="sk-p">${D(s.replace(TG, `<b class="mark big">${a}</b>`))}</div>`, s: Y(s.replace(TG, '$2')) }] }; };
  const KJ_NI = [{ s: '[石|いし]ころを ひろう。', ng: ['みぎ', 'かわ', 'た'] }, { s: '{水|みず}[玉|たま]もよう', ng: ['おう', 'つち', 'しろ'] }, { s: '[王|おう]さま', ng: ['たま', 'しゅ', 'つち'] }, { lv: 2, s: '[正|ただ]しい こたえ', ng: ['あた', 'ま', 'たの'] }, { s: '[雨|あめ]が ふる。', ng: ['くも', 'みず', 'ゆき'] }, { lv: 3, s: '{三|さん}[人|にん]きょうだい', ng: ['ひと', 'じん', 'いり'] }];
  const nikanji1 = [F(1, niQ), F(2, niQ), F(1, (d) => kjR(KJ_NI, d)), F(3, (d) => kjR(KJ_NI, d))];
  const nikanji2 = [F(1, missQ), F(2, missQ), F(3, missQ), F(3, (d) => kjW([{ s: '[雨|あめ]が ふる', ng: ['両', '雪', '市'], w: 'そらから あめの つぶが おちる かたち' }, { s: '[正|ただ]しい こたえ', ng: ['止', '王', '五'], w: 'とめる の うえに よこぼう' }, { s: '[石|いし]ころ', ng: ['右', '名', '若'] }, { s: '{水|みず}[玉|たま]', ng: ['王', '主', '土'] }], d))];

  // ───── 一年かんの おもいでブック
  const ZOU = 'ぞうが、ながい はなで {草|くさ}を つかんで たべて いる ところを {見|み}ました。{水|みず}を のむ ときも、はなを じょうずに つかって いました。';
  const omoide = [
    { lv: 1, t: '{一|いち}{年|ねん}かんで いちばん たのしかった ことは、えん{足|そく}で どうぶつえんに いった ことです。', q: 'めいさんが いちばん たのしかった ことは？', a: 'えん{足|そく}で どうぶつえんに いった こと', ng: ['プールで およいだ こと', 'マラソン{大|たい}かい', 'おべんとうを つくった こと'], k: 'えん{足|そく}で どうぶつえんに いった こと', il: 'elephant' },
    { lv: 1, t: ZOU, q: 'ぞうは なにで {草|くさ}を つかんだ？', a: 'はな', ng: ['あし', 'しっぽ', 'みみ'], k: 'ながい はなで {草|くさ}を つかんで', iv: 'elephant' },
    { lv: 2, t: ZOU, q: '{水|みず}を のむ ときに つかって いたのは？', a: 'はな', ng: ['{口|くち}', 'あし', 'みみ'], k: 'はなを じょうずに つかって' },
    { lv: 3, t: 'まえの {文|ぶん}：ぞうが くさを たべて いるのを {見|み}ました。', q: 'あたらしい {文|ぶん}で、くわしく なった ところは？', a: 'はなで {草|くさ}を つかんで たべて いた', ng: ['どうぶつえんに いきました', 'また いきたいと おもいました', 'えん{足|そく}が ありました'], w: 'どうやって たべて いたかが くわしく なったね', il: 'elephant' },
    F(2, (d) => kjR([{ s: 'みどりの [草|くさ]', ng: ['はな', 'き', 'はや'] }], d)),
    F(3, (d) => kjW([{ s: 'ぞうが [草|くさ]を たべる', ng: ['早', '車', '花'], w: 'はやい の うえに くさかんむり' }], d)),
  ];

  // ───── かん字を つかおう４（もりの うさぎの てがみ）
  const KJ_4 = [{ s: '[森|もり]の うさぎ', ng: ['はやし', 'き', 'やま'] }, { s: '[天|てん]{気|き}が よい。', ng: ['そら', 'たい', 'あま'] }, { s: '[竹|たけ]とんぼを とばす。', ng: ['き', 'くさ', 'たか'] }, { s: '[虫|むし]とりを する。', ng: ['ちゅう', 'くさ', 'うし'] }, { s: '[夕|ゆう]やけ', ng: ['た', 'あさ', 'よ'] }, { lv: 2, s: '[空|そら]が {赤|あか}く なる。', ng: ['くう', 'てん', 'あお'] }];
  const KW_4 = [{ s: 'こんどの [金|きん]よう{日|び}', ng: ['全', '土', '会'] }, { s: 'きんよう[日|び]', ng: ['目', '白', '月'] }, { s: 'こんどは [休|やす]みです。', ng: ['体', '木', '本'] }, { s: '{天|てん}[気|き]が よい。', ng: ['汽', '文', '先'] }, { lv: 2, s: '{空|そら}が [赤|あか]く なる。', ng: ['青', '走', '黄'] },
    { lv: 2, s: '[手|て]を あらう。', ng: ['毛', '子', '午'] }, { lv: 2, s: '[足|あし]を あらう。', ng: ['早', '兄', '是'] }, { lv: 3, s: 'きのこが [入|はい]った シチュー', ng: ['人', '八', '大'] }, { lv: 3, s: '[大|おお]きな なべ', ng: ['犬', '太', '天'] }];
  const kanji4 = [F(1, (d) => kjR(KJ_4, d)), F(2, (d) => kjW(KW_4, d)), F(3, (d) => kjW(KW_4, d)), F(3, (d) => kjR(KJ_4, d))];

  // ───── 花さかじいさん
  const hana1 = [
    { lv: 1, t: 'ばあさまが {川|かわ}で せんたくを して いると、くろぬりの りっぱな はこが ぷかりぷかりと ながれて きた。', q: 'はこは どこから きた？', a: '{川|かわ}を ながれて きた', ng: ['{山|やま}から ころがって きた', 'そらから おちて きた', 'となりの いえから きた'], k: 'ぷかりぷかりと ながれて きた' },
    { lv: 1, t: 'はこを ひろい{上|あ}げると、まっ{白|しろ}な {子|こ}{犬|いぬ}が {一|いっ}ぴき {入|はい}って おった。', q: 'はこの {中|なか}に いたのは？', a: 'まっ{白|しろ}な {子|こ}{犬|いぬ}', ng: ['くろい ねこ', '{小|ちい}さな ねずみ', 'きいろい ひよこ'], k: 'まっ{白|しろ}な {子|こ}{犬|いぬ}', il: 'white_dog' },
    { lv: 1, t: 'ふたりは {子|こ}{犬|いぬ}に シロと {名|な}まえを つけて、たいせつに そだてた。', q: '{子|こ}{犬|いぬ}の {名|な}まえは？', a: 'シロ', ng: ['ポチ', 'クロ', 'チロ'], k: 'シロと {名|な}まえを つけて', il: 'white_dog' },
    { lv: 2, t: 'シロが「ここ ほれ、わんわん。」と いうので ほって みると、{土|つち}の {中|なか}から {大|おお}ばん {小|こ}ばんが きんきん きらきら。', q: 'ほって みると {出|で}て きたのは？', a: '{大|おお}ばん {小|こ}ばん', ng: ['むかでや へび', 'うまの ふん', 'さくらの {花|はな}'], k: '{大|おお}ばん {小|こ}ばん' },
    { lv: 2, t: 'となりの なまけものの じいさまが ほると、むかでが もぞもぞ、{大|おお}へびが ぬるぬる、かえるが げこげこ。', q: 'となりの じいさまが ほると {出|で}て きたのは？', a: 'むかで・{大|おお}へび・かえる', ng: ['{大|おお}ばん {小|こ}ばん', 'おもち', 'まつの {木|き}'], k: 'むかでが もぞもぞ、{大|おお}へびが ぬるぬる、かえるが げこげこ' },
    { lv: 3, t: 'じいさまは シロを うめて、まつの {小|こ}えだを {一|いっ}{本|ぽん} さして かえった。', q: 'シロを うめた ところに さしたのは？', a: 'まつの {小|こ}えだ', ng: ['さくらの えだ', 'たけ', 'はたの ぼう'], k: 'まつの {小|こ}えだ', sq: 'じいさまは シロを うめて、まつの こえだを いっぽん さして かえった。シロを うめた ところに さしたのは なに？' },
    { lv: 3, t: 'まつの {小|こ}えだは、たった {一|ひと}ばんで {大|おお}きな {木|き}に なった。ふたりは この {木|き}で うすを つくった。', q: 'まつの {木|き}で なにを つくった？', a: 'うす', ng: ['ふね', 'いす', 'はこ'], k: 'うすを つくった', sq: 'まつの こえだは、たった ひとばんで おおきな きに なった。ふたりは この きで うすを つくった。まつの きで なにを つくった？' },
  ];
  const HANA_EV = ['はこから {子|こ}{犬|いぬ}が {出|で}て くる', '「ここ ほれ、わんわん」で {大|おお}ばん {小|こ}ばん', 'まつの {木|き}で うすを つくる', 'うすが もやされて はいに なる', 'はいを まいて {花|はな}を さかせる', 'とのさまから ほうびを もらう'];
  const hana2 = [
    { lv: 1, t: 'となりの なまけものの じいさまは、おこって うすを かまどに なげこんで、もやして しまった。', q: 'うすは どう なった？', a: 'もやされた', ng: ['かわに ながされた', 'うられた', 'こわれて すてられた'], k: 'もやして しまった' },
    { lv: 1, t: 'ふたりは、かまどの はいを すくって もって かえった。はいを まくと、かれ{木|き}に つぎつぎと {花|はな}が さいた。', q: 'はいを まくと どう なった？', a: 'かれ{木|き}に {花|はな}が さいた', ng: ['{雨|あめ}が ふった', 'おもちが {出|で}た', 'かれ{木|き}が たおれた'], k: 'かれ{木|き}に つぎつぎと {花|はな}が さいた' },
    { lv: 2, t: 'とのさまは「あっぱれ、{日|に}{本|ほん}{一|いち}の {花|はな}さかじい。」と いって、ほうびを くれた。', q: 'とのさまは じいさまを なんと よんだ？', a: '{日|に}{本|ほん}{一|いち}の {花|はな}さかじい', ng: ['はたらきものの じいさま', 'なまけものの じいさま', 'やさしい おじいさん'], k: '{日|に}{本|ほん}{一|いち}の {花|はな}さかじい', sq: 'とのさまは、あっぱれ、にっぽんいちの はなさかじい、と いって、ほうびを くれた。とのさまは じいさまを なんと よんだ？' },
    { lv: 2, t: 'なまけものの じいさまが はいを まくと、はいは とのさまの {目|め}や はなや {口|くち}に {入|はい}って しまった。', q: 'はいは どこに {入|はい}った？', a: 'とのさまの {目|め}や はなや {口|くち}', ng: ['かれ{木|き}の えだ', 'かまどの {中|なか}', 'はたけの {土|つち}'], k: 'とのさまの {目|め}や はなや {口|くち}' },
    { lv: 3, q: 'さいごに なまけものの じいさまは どう なった？', a: 'ろうやに {入|い}れられた', ng: ['ほうびを もらった', '{花|はな}さかじいに なった', 'とのさまの けらいに なった'], k: 'ろうやに {入|い}れられて しまった', hs: 'おはなしの さいごに' },
    { lv: 2, q: '「ここ ほれ、わんわん」で たからを {見|み}つけたのは？', a: 'はたらきものの じいさま', ng: ['なまけものの じいさま', 'とのさま', 'となりの ばあさま'], w: 'シロを たいせつに そだてた じいさまだね', il: 'white_dog' },
    F(2, (d) => ordQ('「{花|はな}さかじいさん」の できごとの じゅんばん', HANA_EV, d)),
    F(3, (d) => ordQ('「{花|はな}さかじいさん」の できごとの じゅんばん', HANA_EV, d)),
  ];

  // ───── ことばの ひろば（学校・一日）
  const OPP = [['{入|はい}る', '{出|で}る'], ['のぼる', 'おりる'], ['あける', 'しめる'], ['すわる', '{立|た}つ'], ['あかるい', 'くらい'], ['おきる', 'ねる']];
  const oppQ = (d) => { const [a, b] = pick(OPP); const sw = Math.random() < 0.5; const x = sw ? b : a, y = sw ? a : b; const ch = opts(y, OPP.flat().filter((z) => z !== x), d);
    return { text: `「${D(x)}」の はんたいの ことばは？`, sayQ: Y(`${x} の はんたいの ことばは どれ？`), ans: D(y), choices: ch, bigC: true, steps: [{ h: `<div class="sk-sbs">${big(D(x))}<span class="ar">と</span>${big(D(y))}</div>`, s: Y(`${x} と ${y} は はんたいの ことば`) }] }; };
  const DOU = [['かいだんを （　）。', 'のぼる', ['あける', 'うたう', 'かぞえる']], ['まどを （　）。', 'あける', ['のぼる', 'かぞえる', 'たべる']], ['うたを （　）。', 'うたう', ['はく', 'あける', 'すわる']], ['かずを （　）。', 'かぞえる', ['のぼる', 'うたう', 'はく']],
    ['ほうきで （　）。', 'はく', ['うたう', 'のむ', 'かぞえる']], ['ぞうきんで （　）。', 'ふく', ['のぼる', 'うたう', 'たべる']], ['ボールを （　）。', 'なげる', ['のむ', 'うたう', 'しめる']], ['おちゃを （　）。', 'のむ', ['なげる', 'はく', 'のぼる']]];
  const douQ = (d) => { const [s, a, ng] = pick(DOU); const ch = opts(a, ng, d);
    return { text: `（　）に あう ことばは？\n${s}`, sayQ: `${end(Y(s))}まるに あう ことばは どれ？`, ans: a, choices: ch, ...look(ch), steps: [{ h: `<div class="sk-p">${s.replace('（　）', `<b class="mark">${a}</b>`)}</div>`, s: Y(s.replace('（　）', a)) }] }; };
  const TIME = [['あさ', ['かおを あらう', 'あさごはんを たべる', 'めを さます']], ['よる', ['ふとんで ねる', 'つきや ほしを {見|み}る', 'ばんごはんを たべる']], ['ひる', ['ひるごはんを たべる', 'そうじを する', 'べんきょうを する']]];
  const timeQ = (d) => { const i = R(0, 2); const [t, L] = TIME[i]; const a = pick(L); const ng = TIME.filter((_, j) => j !== i).flatMap((x) => x[1]); const ch = opts(a, ng, d);
    return { text: `${t}に する ことは どれ？`, sayQ: `${t}に する ことは どれ？`, ans: D(a), choices: ch, txt: true, steps: [{ h: `<div class="sk-p">${t}</div><div class="sk-story">${L.map((x) => `<div>${D(x)}</div>`).join('')}</div>`, s: Y(`${t}は、${L.join('、')}`) }] }; };
  const hiroba1 = [F(1, oppQ), F(1, douQ), F(1, timeQ), F(2, oppQ), F(2, douQ), F(3, douQ)];
  const JS = [['はブラシ（　） はを みがく。', 'で'], ['{雨|あめ}（　） ふる。', 'が'], ['ふく（　） きる。', 'を'], ['かお（　） あらう。', 'を'], ['たいよう（　） のぼる。', 'が'], ['ほうき（　） はく。', 'で'], ['おちゃ（　） のむ。', 'を'], ['かぜ（　） ふく。', 'が'], ['せっけん（　） {手|て}を あらう。', 'で']];
  const HWE = [['ぼく（　） こうえんへ いく。', 'は', ['わ', 'を']], ['わたしは こうえん（　） いく。', 'へ', ['え', 'を']], ['いもうとは {本|ほん}（　） よむ。', 'を', ['お', 'は']], ['ねこ（　） ミルクを のむ。', 'は', ['わ', 'へ']], ['ぼくは がっこう（　） いく。', 'へ', ['え', 'を']], ['わたしは えほん（　） かう。', 'を', ['お', 'へ']]];
  const jsQ = (d) => { const hwe = lvOf(d) >= 2 && Math.random() < 0.5; const [s, a, ng] = hwe ? pick(HWE) : [...pick(JS), ['が', 'を', 'で']]; const ch = shuffle(uniq([a, ...ng]));
    const rd = { は: 'わ', へ: 'え', を: 'お' }[a];
    return { text: `（　）に はいる じは？\n${D(s)}`, sayQ: `${end(Y(s))}まるに はいる じは どれ？`, ans: a, choices: ch, bigC: true,
      steps: [{ h: `<div class="sk-p">${D(s).replace('（　）', `<b class="mark big">${a}</b>`)}</div>`, s: Y(s.replace('（　）', a)).replace(/。$/, '') + (hwe ? `。よむ ときは ${rd} だけど、かく ときは この じ` : '') }] }; };
  const hiroba2 = [F(1, jsQ), F(2, jsQ), F(3, jsQ)];

  return [
    U('tk_fune1', 'いろいろな ふね（やくめ）', 44, 11, fune1),
    U('tk_fune2', 'ふねの じゅんばん・かんじ', 44, 11, fune2),
    U('tk_norimono', 'のりものカード', 52, 11, norimono),
    U('tk_matome', 'まとめて よぶ ことば', 56, 11, matome),
    U('tk_kyouka', 'すきな きょうか', 58, 11, kyouka),
    U('tk_asobo', 'ことばで あそぼう', 62, 11, asobo),
    U('tk_junjo', 'じゅんじょ・かぎ', 64, 12, junjo),
    U('tk_hira2', 'ちいさい じ・のばす おと', 68, 12, hira2),
    U('tk_chiro1', 'チロ（てがみ）', 70, 12, chiro1),
    U('tk_chiro2', 'チロ（おかの き）', 74, 12, chiro2),
    U('tk_chiro3', 'チロ（じゅんばん・かんじ）', 78, 12, chiro3),
    U('tk_kanji1', 'かんじを つかおう１', 83, 12, kanji1),
    U('tk_bucket', 'きいろい ばけつ', 84, 1, bucket),
    U('tk_mimizu', 'みみずの たいそう', 88, 1, mimizu),
    U('tk_mukashi', 'むかしばなし', 90, 1, mukashi),
    U('tk_kabocha', 'かぼちゃたろう', 94, 1, kabocha),
    U('tk_kata1', 'にて いる かたかな', 100, 1, kata1),
    U('tk_kata2', 'シと ツ・ソと ン', 100, 1, kata2),
    U('tk_kanji2', 'かんじを つかおう２', 102, 1, kanji2),
    U('tk_mamoru1', 'オオアリクイの ちえ', 103, 2, mamoru1),
    U('tk_mamoru2', 'コチドリの ちえ', 106, 2, mamoru2),
    U('tk_mamoru3', 'くらべて よむ', 110, 2, mamoru3),
    U('tk_atsume', 'ことばを あつめよう', 114, 2, atsume),
    U('tk_shokai', 'しょうがっこうの しょうかい', 116, 2, shokai),
    U('tk_kanji3', 'かんじを つかおう３', 120, 2, kanji3),
    U('tk_swimmy1', 'スイミー（まぐろ）', 121, 2, swimmy1),
    U('tk_swimmy2', 'スイミー（うみの たとえ）', 126, 2, swimmy2),
    U('tk_swimmy3', 'スイミー（さくせん）', 130, 3, swimmy3),
    U('tk_nikanji1', 'にて いる かんじ', 138, 3, nikanji1),
    U('tk_nikanji2', 'かんじの まちがいさがし', 139, 3, nikanji2),
    U('tk_omoide', 'おもいでブック', 140, 3, omoide),
    U('tk_kanji4', 'かんじを つかおう４', 144, 3, kanji4),
    U('tk_hana1', 'はなさかじいさん（シロ）', 146, 3, hana1),
    U('tk_hana2', 'はなさかじいさん（はい）', 150, 3, hana2),
    U('tk_hiroba1', 'はんたいの ことば・うごき', 154, 3, hiroba1),
    U('tk_hiroba2', '「が」「を」「で」', 156, 3, hiroba2),
  ];
})();

// きょうかしょの つき（むすめの すすみぐあいに あわせる：さんすう p76・こくご p49 が いま）
const TB_MON = (u) => u.id.startsWith('tm_') ? (u.page < 88 ? 11 : u.page < 98 ? 12 : u.page < 112 ? 1 : u.page < 120 ? 2 : 3) : u.m;
[...TB_MATH, ...TB_KOKUGO].forEach((u) => { MON[u.id] = TB_MON(u); });
const TB_PAGE = Object.fromEntries([...TB_MATH, ...TB_KOKUGO].map((u) => [u.id, u.page]));
const M2 = order(['m_count', 'm_cmp', 'm_bunkai', 'm_make10', 'm_add10', 'm_sub10', 'm_teen', 'm_sub1x', 'm_clock', 'm_three', 'm_carry9', 'm_carry87', 'm_carry', 'm_shape'], NEWM, M).concat(TB_MATH);
const K2 = order(['k_hira', 'k_hira2', 'k_small', 'k_long', 'k_part', 'k_kana1', 'k_shugo', 'k_read', 'k_kata', 'k_kanjiR', 'k_bun', 'k_kanjiW', 'k_jun', 'k_kimochi'], NEWK, NEWK2, K).concat(TB_KOKUGO);
const E2 = order(['e_listen', 'e_col', 'e_num', 'e_body', 'e_greet', 'e_ani', 'e_first'], NEWE, E);
const SUBJ = { math: { n: 'さんすう', ic: '🔢', col: '#ff9a3c', L: M2 }, kokugo: { n: 'こくご', ic: '📖', col: '#ff6b8f', L: K2 }, eigo: { n: 'えいご', ic: '🔤', col: '#4dabf0', L: E2 } };

// ───────── せかいの カード（10もん せいかいごとに 1まい）
const CARDS = [['🐘', 'ぞうの はなは 5まんこの きんにくで できているよ'], ['🐧', 'ペンギンは とべないけど、およぐのは すごく はやい'], ['🦒', 'きりんの くびの ほねの かずは、ひとと おなじ 7こ'], ['🐙', 'たこには しんぞうが 3つ ある'], ['🦉', 'ふくろうは くびが ぐるっと うしろまで まわる'],
  ['🐼', 'パンダは 1にち 12じかんも ササを たべる'], ['🐨', 'コアラは 1にち 20じかんくらい ねむる'], ['🦈', 'サメの はは なんども はえかわる'], ['🐝', 'みつばちは ダンスで なかまに ばしょを おしえる'], ['🐢', 'うみがめは うまれた はまに かえってくる'],
  ['🌋', 'ふじさんは むかし ふんかした かざん'], ['🌏', 'ちきゅうの 7わりは うみ'], ['🌙', 'つきは ちきゅうの まわりを 1かげつで まわる'], ['☀️', 'たいようは ちきゅうが 100こ いじょう ならぶ おおきさ'], ['🪐', 'どせいは みずに うかぶくらい かるい'],
  ['❄️', 'ゆきの けっしょうは みんな 6かくけい'], ['🌈', 'にじは 7しょくに みえる'], ['⚡', 'かみなりは たいようの ひょうめんより あつい'], ['🦕', 'きょうりゅうの なかまは いまも とりとして いきている'], ['🦖', 'ティラノサウルスの はは バナナくらい おおきい'],
  ['🇯🇵', 'にほんには しまが 1まん4000いじょう ある'], ['🗼', 'エッフェルとうは なつに すこし のびる'], ['🏔️', 'せかいで いちばん たかい やまは エベレスト'], ['🏜️', 'さばくでも よるは とても さむい'], ['🌊', 'いちばん ふかい うみは 1まんメートルいじょう'],
  ['🍌', 'バナナは きでは なく くさの なかま'], ['🍓', 'いちごの つぶつぶが ほんとうの み'], ['🥕', 'にんじんは むかし むらさきいろ だった'], ['🍯', 'はちみつは なんぜんねんも くさらない'], ['🍅', 'トマトは くだもの？やさい？ どちらとも いわれる'],
  ['🦋', 'ちょうは あしで あじを かんじる'], ['🐌', 'かたつむりの はは 1まんこいじょう'], ['🐸', 'かえるは ひふからも みずを のむ'], ['🦜', 'オウムは ひとの ことばを まねできる'], ['🐬', 'イルカは かたほうの のうで ねむる'],
  ['🌻', 'ひまわりの たねは うずまきに ならんでいる'], ['🌲', 'せかいで いちばん たかい きは 100メートルいじょう'], ['💎', 'ダイヤモンドは すみと おなじ なかま'], ['🚀', 'うちゅうでは おとが きこえない'], ['🔭', 'よぞらの ほしの ひかりは なんねんも まえの ひかり']];

// ───────── もんだいを えらぶ（ほんの すこしずつ）
const hasEn = () => { try { const v = speechSynthesis.getVoices(); return !v.length || v.some((x) => /^en/i.test(x.lang)); } catch (e) { return false; } }; // えいごの こえが ない たんまつでは えいごを ださない
function chooseSubj(p, prefer) { if (prefer && SUBJ[prefer]) return prefer; const ks = Object.keys(SUBJ).filter((k) => k !== 'eigo' || hasEn()); const w = ks.map((k) => 1 + (p.subj[k].ng > p.subj[k].ok * 0.3 ? 0.5 : 0)); let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < ks.length; i++) { r -= w[i]; if (r <= 0) return ks[i]; } return ks[0]; }
// ───────── べつの せつめい（おなじ ところで また まちがえたら、ちがう やりかたで せつめい する）
const KW = { ア: ['🍦', 'アイス'], イ: ['🐬', 'イルカ'], エ: ['🛗', 'エレベーター'], オ: ['🍳', 'オムライス'], カ: ['📷', 'カメラ'], キ: ['🦒', 'キリン'], ク: ['🍪', 'クッキー'], ケ: ['🍰', 'ケーキ'], コ: ['🐨', 'コアラ'], サ: ['⚽', 'サッカー'], シ: ['👕', 'シャツ'], ス: ['🥄', 'スプーン'], セ: ['🧶', 'セーター'], ソ: ['🛋️', 'ソファ'], タ: ['🚕', 'タクシー'], チ: ['🧀', 'チーズ'], ツ: ['🎄', 'ツリー'], テ: ['📺', 'テレビ'], ト: ['🍅', 'トマト'], ナ: ['🔪', 'ナイフ'], ヌ: ['🍜', 'ヌードル'], ネ: ['👔', 'ネクタイ'], ノ: ['📓', 'ノート'], ハ: ['🍔', 'ハンバーガー'], ヒ: ['🦸', 'ヒーロー'], フ: ['🍴', 'フォーク'], ヘ: ['🚁', 'ヘリコプター'], ホ: ['🥞', 'ホットケーキ'], マ: ['😷', 'マスク'], ミ: ['🥛', 'ミルク'], メ: ['🍈', 'メロン'], モ: ['🚝', 'モノレール'], ヤ: ['🌴', 'ヤシ'], ユ: ['🛸', 'ユーフォー'], ヨ: ['⛵', 'ヨット'], ラ: ['🦁', 'ライオン'], リ: ['🎀', 'リボン'], ル: ['💎', 'ルビー'], レ: ['🍋', 'レモン'], ロ: ['🤖', 'ロボット'] };
const numLine = (a, max) => `<div class="sk-line">${Array.from({ length: max + 1 }, (_, k) => `<i data-v="${k}" class="${k === a ? 'st' : ''}">${k}</i>`).join('')}</div>`;
// ばらの つぶを ひとつずつ わくの あいている ところへ うごかす（ぐたいてきに）
function moveRun(n) { return async (stage, alive) => { const empt = [...stage.querySelectorAll('.sk-tf .sk-d.e')]; const bs = [...stage.querySelectorAll('.sk-dr .sk-d.b')];
  for (let i = 0; i < n && i < empt.length; i++) { if (!alive()) return; const b = bs[i]; if (b) b.style.visibility = 'hidden'; empt[i].className = 'sk-d b pop'; SE.step(); await say(String(i + 1), { fast: true }); await wait(250); }
  const tf = stage.querySelector('.sk-tf'); if (tf) tf.classList.add('full'); }; }
function hopRun(from, n, dir = 1) { return async (stage, alive) => { for (let i = 1; i <= n; i++) { if (!alive()) return; const c = stage.querySelector(`.sk-line i[data-v="${from + dir * i}"]`); if (c) c.classList.add('hop'); SE.step(); await say(String(i), { fast: true }); await wait(200); } }; }
// つまずいた ときに もどる「もとに なる たんげん」
const PRE = { m_carry9: 'm_make10', m_carry87: 'm_make10', m_carry: 'm_make10', m_carry2: 'm_make10', m_borrow: 'm_bunkai', m_borrow2: 'm_bunkai', m_sub1x: 'm_teen', m_teen: 'm_count', m_add10: 'm_count', m_sub10: 'm_bunkai', m_make10: 'm_bunkai', m_three: 'm_add10', m_word: 'm_add10' };
const MULTI = new Set(['m_teen', 'm_carry', 'm_word', 'k_shugo', 'k_kanjiR', 'k_jun', 'k_kimochi']);
const WORDQ = new Set(['tm_hiku_bun', 'tm_mono', 'tm_junban', 'tm_tasuhiku', 'tm_nanju', 'tm_nanjuto', 'tm_2keta', 'tm_2nen_bun', 'tm_ooi']); // ぶんしょうだいは もんだいで ことばを ふとじに しない（よんで きづく ちからを つける。せつめいでは つかう）
function decorate(q) {
  if (q && WORDQ.has(q.sk) && typeof q.text === 'string') q.text = q.text.replace(/<\/?b>/g, '');
  if (!q || q.altSteps !== undefined) return q;
  const t = String(q.text || '');
  q.fmt = q.sk === 'm_carry' && q.nums ? (q.nums[0] < q.nums[1] ? 's' : 'b') : q.sk === 'm_teen' ? (/は 10 と/.test(t) ? 'b' : 'a') : q.sk === 'k_shugo' ? (/だれ/.test(t) ? 'w' : 'o') : q.sk === 'k_kanjiR' ? (/sk-p/.test(q.viz || '') ? 'ctx' : 'word') : q.sk === 'k_jun' ? (/はじめ/.test(t) ? 'f' : 'l') : q.sk === 'm_word' ? t.slice(0, 6) : q.sk === 'k_kimochi' ? (/いちばん/.test(t) ? '3' : 'x' + t.length % 3) : 'a';
  q.altSteps = null;
  if (q.nums) { const [a, b, op] = q.nums; const r = op === '+' ? a + b : a - b;
    if (op === '+' && r > 10) { const hi = Math.max(a, b), lo = Math.min(a, b), need = 10 - hi, rest = lo - need;
      q.altMove = [{ h: frame(hi) + '<span class="sk-op">＋</span>' + dots(lo, 'b'), s: `${lo}こから ${need}こ、ひとつずつ わくに うごかして 10に しよう`, run: moveRun(need) }, { h: frame(hi, need, { cls: 'full' }) + '<span class="sk-op">と</span>' + dots(rest, 'b'), s: `10に なった！ のこりは ${rest}こ` }, { h: frame(10, 0, { cls: 'full' }) + '<span class="sk-op">と</span>' + dots(rest, 'b') + eq(`10 と ${rest} で <b>${r}</b>`), s: `10と ${rest}で ${r}` }];
      q.altSteps = [{ h: big(String(hi)) + '<span class="sk-op">＋</span>' + numDots(lo, 'b', 0), s: `おおきい ${hi}を あたまに いれて、${lo}こ つづけて かぞえよう`, run: countRun('.sk-d.b', hi + 1) }, { h: eq(`${a} ＋ ${b} ＝ <b>${r}</b>`), s: `${hi}から ${lo} すすむと ${r}` }]; }
    else if (op === '+') q.altSteps = [{ h: numLine(a, 10), s: `すうじの みちで、${a}から ${b}つ すすもう`, run: hopRun(a, b) }, { h: numLine(a, 10).replace(`data-v="${r}" class=""`, `data-v="${r}" class="end"`), s: `${a}から ${b} すすむと ${r}` }];
    else if (a > 10 && a - 10 < b) { const o = a - 10, rest = b - o; const hd = (x) => `<div class="sk-eqs">${a} − ${b} ＝ ${a} − <b>${o}</b> − <b>${rest}</b>${x || ''}</div>`; q.altSteps = [{ h: hd() + frame(10) + '<span class="sk-op">と</span>' + dots(o, 'b'), s: `${b}を、${o}と ${rest}に わけて とるよ` }, { h: hd() + frame(10) + '<span class="sk-op">と</span>' + dots(o, 'b'), s: `まず ばらの ${o}こを とる`, run: crossRun(o, '.sk-dr .sk-d') }, { h: hd(` → ${a - o}`) + frame(10) + '<span class="sk-op">と</span>' + dotsX(o, 'b', o), s: `ちょうど 10。つぎに 10から ${rest}こ とる`, run: crossRun(rest, '.sk-tf .sk-d') }, { h: hd(` ＝ <b class="r">${r}</b>`) + frame(10, 0, { cross: rest }) + '<span class="sk-op">と</span>' + dotsX(o, 'b', o), s: `${a} − ${o} − ${rest}、のこりは ${r}` }]; }
    else q.altSteps = [{ h: numLine(a, Math.max(10, a)), s: `すうじの みちで、${a}から ${b}つ もどろう`, run: hopRun(a, b, -1) }, { h: numLine(a, Math.max(10, a)).replace(`data-v="${r}" class=""`, `data-v="${r}" class="end"`), s: `${a}から ${b} もどると ${r}` }];
  } else if (q.sk === 'k_kana1' && KW[q.ans]) { const [e, w] = KW[q.ans]; q.altSteps = [{ h: big(e, 'emo') + big(`<b class="mark">${w[0]}</b>${w.slice(1)}`), s: `${w}の「${q.ans}」。${w}って おぼえよう` }]; }
  return q;
}
let FORCE = null; // テスト用：スキルを こてい
const defGoal = () => ({ g: 1, m: new Date().getMonth() + 1 === 8 ? 9 : new Date().getMonth() + 1 });
const goalOf = (p) => p.goal || defGoal();
// えらんだ つき までの いちばん うしろの スキル（えいごは がくねんに かんけい なし）
function capOf(p, sj) { if (sj === 'eigo') return 99; const g = goalOf(p); const L = SUBJ[sj].L; let c = 0; L.forEach((sk, i) => { if (MON[sk.id] != null && ordM(MON[sk.id]) <= ordM(g.m)) c = i; }); return g.g >= 2 ? L.length - 1 : c; }
// ★の きまり：はじめて こたえた ときの せいかいが ①3かい いじょう ②2にち いじょう ③さいきん 10かいの せいかい りつ 80% いじょう ④さいごの 2かいが せいかい ⑤ふくしゅうが のこって いない
//   ★の あとで まちがえたら「ほりゅう」（また 2かい つづけて せいかいで もどる）
const recent = (s) => (s.h || '').slice(-10);
const masteryOf = (p, id) => { const s = p.skill[id] || { ok: 0, ng: 0 }; const h = recent(s); const rate = h.length ? [...h].filter((c) => c === 'o').length / h.length : 0; const open = (p.review || []).some((it) => it.sk === id && it.stage < 3);
  const days = s.days || []; const span = days.length ? dayN(days[days.length - 1]) - dayN(days[0]) : 0; const fmOk = !MULTI.has(id) || (s.fmts || []).length >= 2;
  if (s.ok >= 3 && days.length >= 2 && span >= 3 && rate >= 0.8 && h.endsWith('oo') && !open && fmOk) return 'star'; if (s.star && !(h.endsWith('oo') && !open)) return 'hold'; if (open) return 'review'; return s.ok + s.ng ? 'practice' : 'none'; };
const mastered = (p, id) => masteryOf(p, id) === 'star';
function build(S, idx, frac, isNew, sj, r) {
  const sk = S.L[idx]; const d = isNew ? frac : 1; const q = sk.q(d); q.sk = sk.id; q.skn = sk.n; q.sj = sj; q.lv = Math.floor(r) + 1; q.isNew = isNew; q.regen = () => sk.q(d); decorate(q);
  // レートが たかいと せんたくしを ふやす（3→4）
  if (q.choices && q.choices.length === 3 && frac > 0.6 && isNew && !q.emoji && /^\d+$/.test(q.ans)) { const n = +q.ans; const extra = [n + 3, n - 3, n + 4].find((v) => v >= 0 && !q.choices.includes(String(v))); if (extra != null) q.choices = shuffle([...q.choices, String(extra)]); }
  return q;
}
// mode：'easy'＝はじめの 2もん（できている ところから）／'down'＝つづけて まちがえた あと（ひとつ やさしく）
// おなじ もんだい・おなじ こたえが つづかないように：さいきんの ものと かぶったら つくりなおす
const RECENT = []; const rKey = (t) => String(t ?? '').replace(/\{([^|}]*)\|[^}]*\}/g, '$1').replace(/<[^>]+>/g, '').replace(/[\s　。、]/g, '');
function makeQ(p, sj, mode) { if (FORCE) return makeQ0(p, sj, mode);
  const win = sj === 'math' ? 5 : 10; let q = null;
  for (let t = 0; t < 12; t++) { q = makeQ0(p, sj, t >= 8 && !mode ? 'easy' : mode); const a = rKey(q.ans), x = rKey(q.text) + '|' + rKey(q.sayQ);
    const near = RECENT.filter((r) => r.sj === sj).slice(-win); if (!near.some((r) => r.a === a) && !RECENT.slice(-30).some((r) => r.x === x)) break; }
  RECENT.push({ sj, a: rKey(q.ans), x: rKey(q.text) + '|' + rKey(q.sayQ) }); if (RECENT.length > 60) RECENT.shift(); return q; }
function makeQ0(p, sj, mode) {
  if (FORCE) for (const k of Object.keys(SUBJ)) { const i = SUBJ[k].L.findIndex((s) => s.id === FORCE); if (i >= 0) return build(SUBJ[k], i, window.__forceD != null ? window.__forceD : 0.5, true, k, p.subj[k].r); }
  const S = SUBJ[sj], r = p.subj[sj].r, cap = capOf(p, sj), top = Math.min(S.L.length - 1, Math.floor(r), cap); const frac = Math.floor(r) > cap ? 1 : r - Math.floor(r);
  // えらんだ つきより さきは「ちょっと チャレンジ」で すこしだけ（とくいな ところは さきへ）
  if (mode === 'chal' && Math.floor(r) > cap && cap + 1 < S.L.length) { const q = build(S, cap + 1, 0, true, sj, r); q.chal = true; q.peek = true; return q; }
  if (mode === 'down') return top > 0 ? build(S, top - 1, 1, false, sj, r) : build(S, 0, 0, true, sj, r);
  if (mode === 'chal') { const q = build(S, top, Math.min(1, frac + 0.4), true, sj, r); q.chal = true; return q; }
  if (mode === 'easy') { const good = S.L.slice(0, top).map((sk, i) => [i, p.skill[sk.id] || { ok: 0, ng: 0 }]).filter(([, s]) => s.ok >= 2 && s.ok >= s.ng * 2); return good.length ? build(S, pick(good)[0], 1, false, sj, r) : build(S, top, 0, true, sj, r); }
  // いちばん あたらしい スキル 60%・ふくしゅう 40%（まちがいが おおい ものを おおめに）
  let idx = top; if (top > 0 && Math.random() < 0.4) { const w = S.L.slice(0, top).map((sk) => { const s = p.skill[sk.id] || { ok: 0, ng: 0 }; return 1 + s.ng * 1.2 - Math.min(s.ok, 8) * 0.08; }); let x = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { idx = i; break; } } }
  return build(S, idx, frac, idx === top, sj, r);
}
// かずの もんだいを「もの」の もんだいに かえる（たしかめで かたちを かえる）
function objectify(r) {
  if (!r.nums) return r; const [a, b, op] = r.nums; const [em, nm] = pick([['🍎', 'りんご'], ['🍓', 'いちご'], ['🐟', 'さかな'], ['⭐', 'ほし'], ['🍪', 'クッキー']]);
  const row = (n) => `<div class="sk-objs">${em.repeat(Math.min(n, 20))}</div>`;
  return { ...r, text: op === '+' ? `${nm}が ${a}こ。${b}こ ふえると、ぜんぶで なんこ？` : `${nm}が ${a}こ。${b}こ たべると、のこりは なんこ？`, sayQ: op === '+' ? `${nm}が ${a}こ。${b}こ ふえると、ぜんぶで なんこ？` : `${nm}が ${a}こ。${b}こ たべると、のこりは なんこ？`, viz: op === '+' ? row(a) + `<div class="sk-op">＋</div>` + row(b) : row(a) };
}
// ふくしゅうの きろく：stage 0＝まちがえた → 1＝すぐあと できた（いまは できた）→ 2＝つぎの 回も（もういちど できた）→ 3＝つぎの 日も（おぼえかけ）→ 4＝3日いじょう あとも（ていちゃく）
const rkey = (q) => q.sk + '|' + q.ans;
const dayN = (d) => { const [y, m, dd] = String(d).split('-').map(Number); return Math.floor(new Date(y, m - 1, dd).getTime() / 864e5); };
function pushReview(p, q, sid) {
  p.review = p.review || []; let it = p.review.find((x) => rkey(x) === rkey(q));
  if (!it) { it = { sk: q.sk, sj: q.sj, ans: q.ans, stage: 0, miss: 0, lapses: 0, sess: sid, day: today(), first: today(), log: [] }; if (MEM.has(q.sk)) it.q = JSON.parse(JSON.stringify({ ...q, retry: null, base: null, altSteps: null, steps: (q.steps || []).map((s) => ({ h: s.h, s: s.s, en: s.en, mix: s.mix, seq: s.seq })) })); p.review.push(it); }
  else { it.lapses = (it.lapses || 0) + 1; }
  it.u = Date.now(); it.att = (it.att || []).concat(p.dev + '.' + Math.random().toString(36).slice(2, 7) + 'x').slice(-20); it.stage = it.stage >= 2 ? 1 : 0; it.miss++; it.sess = sid; it.day = today(); (it.log = it.log || []).push('x'); if (p.review.length > 25) p.review.splice(p.review.findIndex((x) => x.stage >= 4), 1);
}
// せいこう したら あいだを のばす（すぐ→つぎの回→1日→3日→⭐→7日ごとに かるく たしかめ）。しっぱい したら れきしは のこして だんかいを さげ、つぎは べつの せつめい
function markReview(p, q, sid, ok) {
  const it = (p.review || []).find((x) => rkey(x) === rkey(q)); if (!it) return; it.u = Date.now(); delete it.conflict; it.att = (it.att || []).concat(p.dev + '.' + Math.random().toString(36).slice(2, 7) + (ok ? 'o' : 'x')).slice(-20); it.log = (it.log || []).concat(ok ? 'o' : 'x').slice(-16);
  if (!ok) { it.lapses = (it.lapses || 0) + 1; it.stage = it.stage >= 2 ? 1 : 0; it.miss++; it.sess = sid; it.day = today(); return; }
  const gap = dayN(today()) - dayN(it.day);
  if (it.stage === 0) { it.stage = 1; it.sess = sid; it.day = today(); }
  else if (it.stage === 1 && it.sess !== sid) { it.stage = 2; it.sess = sid; it.day = today(); }
  else if (it.stage === 2 && gap >= 1) { it.stage = 3; it.day = today(); }
  else if (it.stage === 3 && gap >= 3) { it.stage = 4; it.day = today(); p.mastered = [...(p.mastered || []), { sk: it.sk, ans: it.ans, day: today(), miss: it.miss }].slice(-30); }
  else if (it.stage === 4 && gap >= 7) { it.day = today(); }
}
const dueReview = (p, sid, sj) => (p.review || []).filter((it) => (!sj || it.sj === sj) && ((it.stage <= 1 && it.sess !== sid) || (it.stage === 2 && dayN(today()) - dayN(it.day) >= 1) || (it.stage === 3 && dayN(today()) - dayN(it.day) >= 3) || (it.stage === 4 && dayN(today()) - dayN(it.day) >= 7)));
function reviewQ(p, it) {
  if (it.q) return decorate({ ...it.q, altSteps: undefined, choices: shuffle(it.q.choices), retry: it.stage >= 4 ? 'ひさしぶりの もんだい' : 'まえに まちがえた もんだい', fromReview: it });
  const S = SUBJ[it.sj]; const i = S && S.L.findIndex((s) => s.id === it.sk); if (!S || i < 0) return null;
  return { ...build(S, i, 1, false, it.sj, p.subj[it.sj].r), retry: it.stage >= 4 ? 'ひさしぶりの もんだい' : 'まえに まちがえた もんだい', fromReview: it };
}
// ずつきに する（たしかめ 1だんめ）
function withFig(r) { const [a, b, op] = r.nums; return { ...r, viz: op === '+' ? numDots(a, 'a', 0) + '<span class="sk-op">＋</span>' + numDots(b, 'b', 0) : numDots(a, 'a', 0) + `<span class="sk-op">− ${b}</span>` }; }
// まちがえた あとの たしかめ：おぼえる もの＝おなじ もんだいを ならびを かえて（1もん はさんで）
// かんがえる もの（けいさん）＝ ①ずつき → ②すうじだけ → ③おはなしの もんだい の 3だん。ほかは かずや ことばを かえた にた もんだい
function variant(base, st) { // たしかめの もんだい：1だんめは「おなじ かずから・すこし やさしく」、2だんめは おなじ くらい、3だんめは おはなし
  const [x, y, op] = base.nums; const carry = op === '+' && x + y > 10, borrow = op === '-' && x > 10 && x - 10 < y;
  const other = (lo, hi, not) => { const c = []; for (let v = lo; v <= hi; v++) if (v !== not) c.push(v); return c.length ? pick(c) : lo; };
  if (op === '+') { const big = Math.max(x, y); const need = 10 - big;
    if (carry) { const b2 = st === 0 ? Math.min(9, need + 1 === Math.min(x, y) ? need + 2 : need + 1) : other(need + 1, 9, Math.min(x, y)); return carryQ(big, Math.max(need + 1, Math.min(9, b2))); }
    const b2 = st === 0 ? Math.max(1, y - 1) : other(1, 10 - x, y); return addQ(x, b2); }
  if (borrow) { const o = x - 10; const m2 = st === 0 ? (o + 1 === y ? o + 2 : o + 1) : other(o + 1, 9, y); return borrowQ(x, Math.min(9, m2)); }
  const b2 = st === 0 ? Math.max(1, y - 1) : other(1, x - 1, y); return subSimpleQ(x, b2);
}
function retryQ(q, st = 0, assist = false) {
  const base = q.base || q; let r;
  if (MEM.has(base.sk)) { let ch; for (let i = 0; i < 6; i++) { ch = shuffle(base.choices); if (ch.indexOf(base.ans) !== base.choices.indexOf(base.ans)) break; } return { ...base, choices: ch, retry: 'さっきの もんだい、もういちど！', base, recheck: true }; }
  if (!base.regen) return null;
  if (base.nums) { r = st === 2 ? objectify(variant(base, 1)) : variant(base, st); if (st === 0 || assist) r = withFig(r); r.chainSt = st; r.retry = assist ? 'いっしょに かぞえよう' : ['ずを みて たしかめよう（1/3）', 'こんどは すうじだけ（2/3）', 'おはなしの もんだい（3/3）'][st]; r.assist = assist; }
  else { for (let i = 0; i < 8; i++) { r = base.regen(); if (r.ans !== base.ans) break; } r.retry = 'にた もんだいで たしかめよう'; r.recheck = true; }
  Object.assign(r, { sk: base.sk, skn: base.skn, sj: base.sj, lv: base.lv, isNew: base.isNew, regen: base.regen, nums: r.nums, base }); delete r.altSteps; return decorate(r);
}
const SLOTS = ['easy', 'easy', 'cur', 'review', 'chal']; // 5もんの くみたて
const SLOTN = { easy: 'できる もんだい', cur: 'いまの レベル', review: 'ふくしゅう', chal: 'ちょっと チャレンジ', down: 'やさしく' };
// えらんだ こたえに あわせた ひとこと（または くらべる がめん）
function ngStep(q, c) {
  if (c == null) return null;
  if (q.ng) { const r = q.ng(c); if (r) return r; }
  return null;
}
function grade(p, q, ok) {
  const s = p.subj[q.sj], before = Math.floor(s.r); const sk = p.skill[q.sk] || (p.skill[q.sk] = { ok: 0, ng: 0 }); sk.h = ((sk.h || '') + (ok ? 'o' : 'x')).slice(-20);
  s.h = ((s.h || '') + (ok ? 'o' : 'x')).slice(-10);
  if (ok) { s.ok++; sk.ok++; s.r = Math.min(SUBJ[q.sj].L.length - 0.01, s.r + (q.isNew ? 0.11 : 0.04)); }
  else { s.ng++; sk.ng++; const lv = Math.floor(s.r); s.r = Math.max(0, s.r - (q.isNew ? 0.18 : 0.06)); if (Math.floor(s.r) < lv && (!s.h.endsWith('xx') || (s.obs || 0) > 0)) s.r = lv; } // 1かいの まちがいでは さげない（2かい つづいたら）。すすんだ すぐあと 3もんは さげない
  if (s.obs) s.obs--;
  // しんきゅう はんてい：いまの たんげんを、さいきん 5かいで 4かい いじょう（いろいろな かたちが ある たんげんは 2しゅるい いじょう）できたら つぎへ
  if (Math.floor(s.r) > before) { const cur = SUBJ[q.sj].L[before]; const cs = p.skill[cur.id] || {}; const h5 = (cs.h || '').slice(-5); const okN = [...h5].filter((c) => c === 'o').length; const fm = (cs.fmts || []).length;
    if (okN < 4 || (MULTI.has(cur.id) && fm < 2)) s.r = before + 0.99; else s.obs = 3; }
  return Math.floor(s.r) > before ? SUBJ[q.sj].L[Math.floor(s.r)] : null;
}

// ───────── がめん
const CSS = `
.sk-pin .sk-pind{display:flex;gap:14px;margin:6px 0 10px}.sk-pin .sk-pind i{width:22px;height:22px;border-radius:50%;border:3px solid #d8b4c8;background:#fff}.sk-pin .sk-pind i.on{background:#ff7aa8;border-color:#ff7aa8}
.sk-keys{display:grid;grid-template-columns:repeat(3,96px);gap:12px}.sk-keys button{height:80px;border:none;border-radius:22px;background:#fff;font-size:32px;font-weight:900;box-shadow:0 4px 0 #ead8e2}
.sk-parent{max-width:820px}.sk-pcard{width:min(92vw,760px);background:#fff;border-radius:22px;padding:14px 18px;box-shadow:0 4px 0 #eadfe8;text-align:left}.sk-prow{display:flex;gap:18px;flex-wrap:wrap}.sk-prow small{display:block;color:#9a8aa0;font-weight:800;font-size:14px}.sk-prow b{font-size:24px;color:#6b5671}.sk-prow b.big{font-size:40px;color:#d08a00}
.sk-psub{margin:12px 0 6px;font-weight:900;color:#8a7a8a;font-size:16px}.sk-pbtns{display:flex;gap:8px;flex-wrap:wrap}.sk-pbtns button{border:none;border-radius:14px;padding:10px 16px;font-weight:900;font-size:17px;background:#fff3d6;color:#a06a00;box-shadow:0 3px 0 #ecd29a}.sk-pbtns button:disabled{opacity:.35}
.sk-plog div{display:flex;gap:12px;padding:4px 0;border-bottom:1px dashed #eee;font-size:15px;font-weight:700}.sk-plog b{margin-left:auto;color:#d0558a}.sk-pfam{font-weight:800;font-size:16px}.sk-pfam small{display:block;color:#9a8aa0;font-weight:700;margin-top:2px}
.sk-pform{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.sk-pform input{flex:1;min-width:160px;font:inherit;font-size:18px;padding:10px 12px;border-radius:12px;border:2px solid #e6d6e0}.sk-pform button{border:none;border-radius:12px;padding:10px 20px;font-weight:900;font-size:18px;background:#7fc8f0;color:#fff}.sk-pmsg{margin-top:6px;color:#d0558a;font-weight:800;min-height:1.2em}
@keyframes skpt{to{margin-left:-8px}}
.sk-ill{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.2em;position:relative;line-height:1}.sk-ill img{width:100%;height:100%;object-fit:contain;display:block;-webkit-user-drag:none}
.sk-ill.miss img{display:none}.sk-ill.miss::after{content:attr(data-l);position:absolute;inset:6%;border-radius:30%;background:#fff5e6;border:2px dashed #e8c9a0;color:#a07850;font-size:clamp(8px,.24em,20px);font-weight:800;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.1;overflow:hidden}
.sk-ic{display:inline-block;width:1.1em;height:1.1em;vertical-align:-.18em}.sk-sw{display:inline-block;width:1em;height:1em;border-radius:.22em;vertical-align:-.15em;box-shadow:inset 0 0 0 2px #0002}
.sk-mb small{font-size:15px;color:#9a8aa0;margin-left:8px;font-weight:700}
.sk-jar{display:inline-block;position:relative;width:20px;height:26px;border:2.5px solid #d9a441;border-top-width:5px;border-radius:5px 5px 8px 8px;background:#fffaf0;overflow:hidden;vertical-align:middle}.sk-jar b{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(#ffd95a,#f2b632);transition:height .6s cubic-bezier(.3,1.4,.5,1)}.sk-jar.big{width:44px;height:58px;border-width:3.5px;border-top-width:9px;border-radius:9px 9px 14px 14px}
.sk-coin{gap:8px}.sk-coin.bump .sk-jar{animation:skjar .5s}@keyframes skjar{30%{transform:rotate(-12deg) scale(1.2)}60%{transform:rotate(8deg)}}
.sk-milestone{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);z-index:11;background:#fff;border:5px solid #f2b632;border-radius:30px;padding:18px 34px;text-align:center;font-weight:900;font-size:30px;color:#8a5a00;box-shadow:0 10px 0 #0002;animation:sklvin .5s cubic-bezier(.2,1.5,.4,1)}.sk-milestone b{font-size:56px;color:#e8a000;display:block}.sk-milestone span{display:block;font-size:22px;color:#6b5671;margin-top:4px}
.sk-wallet{width:min(92vw,720px);background:#fff;border-radius:26px;padding:14px 18px;box-shadow:0 5px 0 #f0d8a8;border:3px solid #f6dfa8;text-align:left}.sk-wtop{display:flex;align-items:center;gap:14px}.sk-wtop small{display:block;font-weight:800;color:#a08a6a;font-size:15px}.sk-wyen{font-size:46px;color:#d08a00;line-height:1.05}.sk-wyen em{font-style:normal;font-size:22px;margin-left:4px}
.sk-wlist{margin-left:auto;border:none;background:#fff3d6;border-radius:999px;padding:10px 16px;font-weight:900;font-size:17px;color:#a06a00;box-shadow:0 3px 0 #ecd29a}
.sk-wsub{margin:10px 0 6px;font-weight:800;color:#8a7a8a;font-size:16px}.sk-buys{display:flex;gap:10px;flex-wrap:wrap}.sk-buy{display:flex;align-items:center;gap:6px;background:#fffaf2;border-radius:16px;padding:6px 12px 6px 6px;font-weight:800;font-size:17px}.sk-buy .sk-ill{font-size:40px}.sk-buy b{color:#e07a00;margin-left:6px;font-size:20px}
.sk-wnext{display:flex;align-items:center;gap:8px;margin-top:10px;background:#f2f8ff;border-radius:16px;padding:6px 12px;font-weight:800;font-size:17px;color:#4a6a8a}.sk-wnext .sk-ill{font-size:34px}.sk-wnext b{color:#2a8ad8}.sk-wnote{text-align:right;font-size:12px;color:#b8a8b8;margin-top:4px}
.sk-shop{max-width:900px}.sk-tiers{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;width:min(94vw,900px);max-height:62vh;overflow:auto;padding:4px}.sk-tier{background:#fff;border-radius:20px;padding:10px 12px;box-shadow:0 4px 0 #eadfe8}.sk-tier .h{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.sk-tier .h b{font-size:26px;color:#c07a00}.sk-tier .h em{font-style:normal;background:#ffe14d;border-radius:10px;padding:2px 8px;font-weight:900;color:#a85b00}.sk-tier .h small{color:#a898a8;font-weight:700}.sk-tier.got{border:3px solid #ffd95a}.sk-tier .its{display:flex;flex-direction:column;gap:6px}.sk-tier .sk-buy{font-size:16px}
.sk-en{display:inline-flex;align-items:center;justify-content:center;width:1.25em;height:1.25em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c2,#ffd23f 45%,#e8a600);color:#8a5a00;font-style:normal;font-weight:900;font-size:.8em;box-shadow:inset 0 -2px 0 #c98a00,0 1px 0 #fff}.sk-coin small{font-size:15px;margin-left:-2px}.sk-fx .sk-en{font-size:30px}
.sk-mb{display:inline-flex;align-items:center;gap:6px;margin:0 auto 6px;padding:6px 16px;border-radius:999px;background:#fff;border:3px solid var(--c);font-weight:900;font-size:20px;color:#5a4660;box-shadow:0 3px 0 #0001}.sk-mb span{font-size:24px}.sk-mb em{font-style:normal;color:var(--c);font-size:26px}
.sk-mb.hard{background:linear-gradient(90deg,#fff3b0,#ffd6ec);border-color:#ff9a00;animation:skhard 1.2s ease-in-out infinite}.sk-mb.hard b{color:#ff6a00;margin-right:4px}@keyframes skhard{50%{transform:scale(1.07);box-shadow:0 0 18px #ffb000}}
.sk-combo.t1 b{color:#ff9a00}.sk-combo.t2{background:#ffe3f0}.sk-combo.t2 b{color:#ff3d8b}.sk-combo.t3{background:linear-gradient(90deg,#ffe066,#ff8a3d);color:#fff}.sk-combo.t3 b{color:#fff;text-shadow:0 2px 0 #c2410c}.sk-combo.t4{background:linear-gradient(90deg,#ff4d6d,#ffa62b,#ffe14d,#4dd67a,#4dabf0,#7a5cff);background-size:200% 100%;animation:skrb 1.2s linear infinite;color:#fff}.sk-combo.t4 b{color:#fff;text-shadow:0 2px 0 #0004}.sk-combo.pop{animation:skcpop .45s}.sk-combo.t4.pop{animation:skcpop .45s,skrb 1.2s linear infinite}
@keyframes skcpop{0%{transform:scale(1)}35%{transform:scale(1.55) rotate(-6deg)}70%{transform:scale(.92)}100%{transform:scale(1)}}@keyframes skrb{to{background-position:200% 0}}
.sk-ring{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:8px solid var(--c);pointer-events:none;z-index:9;animation:skring .65s ease-out forwards}@keyframes skring{to{transform:scale(7);opacity:0;border-width:2px}}
.sk-star{position:absolute;pointer-events:none;z-index:9;transform:translate(-50%,-50%);animation:skstar .9s cubic-bezier(.2,.7,.3,1) forwards}@keyframes skstar{0%{transform:translate(-50%,-50%) scale(.2)}20%{transform:translate(calc(-50% + var(--tx) * .5),calc(-50% + var(--ty) * .5)) scale(1.3)}100%{transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty) + 40px)) scale(.5) rotate(var(--r));opacity:0}}
.sk-cbig{position:absolute;left:50%;top:16%;z-index:9;pointer-events:none;display:flex;align-items:baseline;gap:6px;font-weight:900;white-space:nowrap;animation:skcbig 1.15s cubic-bezier(.2,1.4,.4,1) forwards}.sk-cbig b{font-size:104px;line-height:1;-webkit-text-stroke:6px #fff;paint-order:stroke}.sk-cbig span{font-size:44px;-webkit-text-stroke:5px #fff;paint-order:stroke}
.sk-cbig.t1 b,.sk-cbig.t1 span{color:#ff9a00}.sk-cbig.t2 b,.sk-cbig.t2 span{color:#ff3d8b}.sk-cbig.t3 b,.sk-cbig.t3 span{color:#ff4a1c;filter:drop-shadow(0 0 12px #ffb000)}.sk-cbig.t4 b,.sk-cbig.t4 span{background:linear-gradient(90deg,#ff4d6d,#ffa62b,#ffe14d,#4dd67a,#4dabf0,#7a5cff);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;filter:drop-shadow(0 4px 0 #fff) drop-shadow(0 0 14px #fff)}
@keyframes skcbig{0%{transform:translate(-50%,-50%) scale(.2) rotate(-20deg);opacity:0}25%{transform:translate(-50%,-50%) scale(1.25) rotate(4deg);opacity:1}45%{transform:translate(-50%,-50%) scale(1) rotate(0)}80%{opacity:1}100%{transform:translate(-50%,-80%) scale(1.05);opacity:0}}
.sk-conf{position:absolute;top:-30px;z-index:9;pointer-events:none;animation:skconf linear forwards}@keyframes skconf{to{transform:translate(var(--dx),110vh) rotate(var(--r))}}
.sk-fw{position:absolute;width:10px;height:10px;margin:-5px;border-radius:50%;z-index:9;pointer-events:none;box-shadow:0 0 8px currentColor;animation:skfw 1s ease-out forwards}@keyframes skfw{0%{transform:translate(0,0) scale(1.4)}70%{opacity:1}100%{transform:translate(var(--tx),calc(var(--ty) + 50px)) scale(.3);opacity:0}}
.sk-flash{position:absolute;inset:0;z-index:8;pointer-events:none;background:radial-gradient(circle,#fff,#fff0 70%);animation:skflash .45s forwards}@keyframes skflash{0%{opacity:.9}100%{opacity:0}}
#sk.sk-shake{animation:skshk .5s}@keyframes skshk{20%{transform:translate(-8px,4px)}40%{transform:translate(7px,-5px)}60%{transform:translate(-5px,3px)}80%{transform:translate(3px,-2px)}}
#sk.fever::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;box-shadow:inset 0 0 50px 14px #ff8a00aa,inset 0 0 120px 30px #ff3d6a55;animation:skfire 0.9s ease-in-out infinite alternate}@keyframes skfire{to{box-shadow:inset 0 0 70px 22px #ffb000cc,inset 0 0 150px 40px #ff3d6a77}}
.sk-fevban{position:absolute;left:0;right:0;top:36%;z-index:10;pointer-events:none;overflow:hidden;height:110px;background:linear-gradient(90deg,#ff5a1f00,#ff5a1f 15%,#ffb000 50%,#ff5a1f 85%,#ff5a1f00);animation:skban 1.6s forwards}.sk-fevban span{display:block;font-size:72px;font-weight:900;color:#fff;text-align:center;line-height:110px;text-shadow:0 4px 0 #c2410c;white-space:nowrap;animation:skbant 1.6s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes skban{0%{transform:scaleY(0)}12%{transform:scaleY(1)}85%{transform:scaleY(1);opacity:1}100%{transform:scaleY(0);opacity:0}}@keyframes skbant{0%{transform:translateX(100%)}30%{transform:translateX(0)}75%{transform:translateX(0)}100%{transform:translateX(-100%)}}
.sk-lvup2{position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;background:#3b1d4d66;animation:skfade .3s}.sk-lvup2.out{opacity:0;transition:opacity .4s}
.sk-lvup2 .card{width:min(92vw,820px);background:#fff;border-radius:34px;padding:22px 26px 26px;text-align:center;border:6px solid var(--c);box-shadow:0 12px 0 #0002,0 0 60px #fff8;animation:sklvin .6s cubic-bezier(.2,1.5,.4,1)}@keyframes sklvin{0%{transform:scale(.3) rotate(-8deg)}100%{transform:scale(1)}}
.sk-lvup2 .t{font-size:40px;font-weight:900;color:#ff8a00;text-shadow:0 3px 0 #ffe2a8}.sk-lvup2 .g{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:8px 0 14px;font-weight:900}.sk-lvup2 .gr{font-size:30px;background:#f3ecff;border-radius:16px;padding:4px 14px}.sk-lvup2 .mo{font-size:76px;color:var(--c);line-height:1;animation:skmo 1s .5s ease-in-out 2}.sk-lvup2 .mo small{font-size:34px}.sk-lvup2 .no{font-size:28px}@keyframes skmo{50%{transform:scale(1.18)}}
.sk-lvup2 .trk{position:relative;display:flex;justify-content:space-between;gap:4px;padding:44px 6px 6px;background:#fff7fb;border-radius:20px}.sk-lvup2 .trk i{flex:1;font-style:normal;font-weight:900;font-size:18px;color:#c9b8c9;background:#f1e8f0;border-radius:12px;padding:4px 0;display:flex;flex-direction:column;align-items:center}.sk-lvup2 .trk i u{text-decoration:none;font-size:18px;filter:grayscale(1);opacity:.5}
.sk-lvup2 .trk i.past{background:var(--c);color:#fff}.sk-lvup2 .trk i.past u{filter:none;opacity:1}.sk-lvup2 .trk i.now{background:#ffe14d;color:#a85b00;transform:scale(1.25);box-shadow:0 0 0 4px #ff9a00,0 0 20px #ffb000;z-index:1;animation:sknow .8s ease-in-out infinite alternate}.sk-lvup2 .trk i.now u{filter:none;opacity:1}@keyframes sknow{to{box-shadow:0 0 0 4px #ff9a00,0 0 34px #ffd000}}
.sk-lvup2 .rk{position:absolute;top:2px;left:0;font-size:36px;transform:translateX(-50%) rotate(45deg);transition:left 1.3s cubic-bezier(.5,0,.3,1) .4s}.sk-lvup2 .u{margin-top:14px;font-size:24px;font-weight:800;color:#6b5671}
@media (orientation:portrait){.sk-lvup2 .trk i{font-size:14px}.sk-lvup2 .mo{font-size:64px}.sk-cbig b{font-size:96px}}
#sk{position:fixed;inset:0;z-index:200;font-family:"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Zen Maru Gothic",system-ui,sans-serif;color:#4a3b52;background:linear-gradient(160deg,#fff4d6,#ffe1ec 45%,#dff1ff);overflow:hidden;user-select:none;-webkit-user-select:none}
#sk.fever{animation:skfev 2s linear infinite}@keyframes skfev{0%{background:linear-gradient(160deg,#fff1a8,#ffc6e3,#c6e6ff)}50%{background:linear-gradient(160deg,#c6ffd9,#fff1a8,#ffc6e3)}100%{background:linear-gradient(160deg,#fff1a8,#ffc6e3,#c6e6ff)}}
#sk *{box-sizing:border-box}#sk button{font-family:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sk-top{position:absolute;left:0;right:0;top:0;height:64px;display:flex;align-items:center;gap:10px;padding:8px 14px}
.sk-x{width:52px;height:52px;border-radius:50%;border:none;background:#fff;font-size:24px;box-shadow:0 3px 0 #e6cfd9}
.sk-coin{margin-left:auto;background:#fff;border-radius:30px;padding:8px 16px;font-weight:900;font-size:22px;box-shadow:0 3px 0 #ecd9a6;display:flex;gap:6px;align-items:center}.sk-coin.bump{animation:skbump .35s}
@keyframes skbump{50%{transform:scale(1.25)}}
.sk-combo{font-weight:900;font-size:20px;background:#fff;border-radius:30px;padding:8px 14px;box-shadow:0 3px 0 #e6cfd9;opacity:0;transition:.2s}.sk-combo.on{opacity:1}.sk-combo b{color:#ff6b3c;font-size:26px}
.sk-bar{position:absolute;left:14px;right:14px;top:70px;height:14px;background:#ffffffaa;border-radius:9px;overflow:hidden}.sk-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb84d,#ff7aa8);border-radius:9px;transition:width .4s}
.sk-main{position:absolute;left:0;right:0;top:92px;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 16px 18px;gap:12px}
.sk-tag{font-weight:800;font-size:16px;background:#fff;border-radius:20px;padding:4px 14px}
.sk-q{background:#fff;border-radius:28px;padding:18px 64px;max-width:780px;width:100%;text-align:center;font-size:30px;font-weight:900;line-height:1.45;box-shadow:0 6px 0 #f0d8e2;white-space:pre-line;position:relative}
.sk-q .sk-say{position:absolute;right:10px;top:10px;width:46px;height:46px;border-radius:50%;border:none;background:#fff4d6;font-size:22px}
.sk-ch{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;max-width:820px;width:100%}
.sk-ch button{min-width:140px;min-height:96px;flex:1 1 140px;max-width:260px;border:none;border-radius:26px;background:#fff;font-size:34px;font-weight:900;box-shadow:0 7px 0 #d9c3ce;transition:transform .08s}
.sk-ch button:active{transform:translateY(5px);box-shadow:0 2px 0 #d9c3ce}.sk-ch.big button{font-size:44px}.sk-ch.emo button{font-size:80px}
.sk-ch button.ok{background:#a8f0c0;box-shadow:0 7px 0 #5cc183;animation:skpop .4s}.sk-ch button.ng{background:#ffe6cc;box-shadow:0 7px 0 #f3c08c;animation:skshake .3s}
@keyframes skpop{40%{transform:scale(1.15)}}@keyframes skshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.sk-viz{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;min-height:10px}.sk-viz>.sk-ill{font-size:104px}.sk-exp .sk-stage>.sk-ill{font-size:120px;display:block;margin:0 auto 6px}
.sk-dr{display:inline-flex;flex-wrap:wrap;gap:6px;max-width:260px;vertical-align:middle}.sk-tf{display:inline-grid;grid-template-columns:repeat(5,34px);gap:5px;padding:7px;border:4px solid #4a3b52;border-radius:12px;background:#fffdf6;vertical-align:middle}
.sk-d{display:inline-block;width:32px;height:32px;border-radius:50%;background:#eee;animation:skin .35s backwards;animation-delay:calc(var(--i,0)*45ms)}.sk-tf .sk-d{width:34px;height:34px}
.sk-d.a{background:#ff9a3c;box-shadow:inset 0 -4px 0 #e67a1e}.sk-d.b{background:#4dabf0;box-shadow:inset 0 -4px 0 #2d86cc}.sk-d.e{background:#f3eee6;animation:none}.sk-d.hle{background:#fff2a8;outline:3px dashed #ffb400;animation:skblink .8s infinite}
.sk-d.mv{animation:skmove .6s backwards;animation-delay:calc(var(--i,0)*60ms)}.sk-d.x{opacity:.35;position:relative}.sk-d.x::after{content:'✕';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#d33;font-weight:900;font-size:24px}
.sk-dr.join{margin-left:-2px}.sk-dr.up{transform:translateY(-6px)}
@keyframes skin{from{transform:scale(0)}}@keyframes skmove{from{transform:translate(120px,-40px) scale(.6);opacity:.3}}@keyframes skblink{50%{background:#fffbe0}}
.sk-op{font-size:40px;font-weight:900;margin:0 6px}.sk-split{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:3px dashed #4dabf0;border-radius:14px}.sk-split em{font-style:normal;font-weight:900;font-size:24px}
.sk-eq{font-size:46px;font-weight:900;background:#fff;border-radius:20px;padding:8px 20px}.sk-eq b,.sk-big b{color:#ff5a8a}
.sk-big{font-size:64px;font-weight:900;line-height:1.2;text-align:center}.sk-big.kj{font-size:120px;font-family:"Klee One","Hiragino Mincho ProN",serif}.sk-big.emo{font-size:110px}.sk-big.num u{text-decoration:none;opacity:.35}
.sk-p{font-size:28px;font-weight:800;text-align:center}.mark{background:linear-gradient(transparent 55%,#ffe066 55%);color:#e2457a}.mark.big{font-size:1.4em}
.sk-clk{width:200px;height:200px}.sk-morph{display:flex;align-items:center;gap:16px}.sk-morph span{font-size:44px}
.sk-beats{display:flex;gap:10px;justify-content:center}.sk-beats i{font-style:normal;font-size:46px;font-weight:900;background:#fff;border-radius:16px;padding:6px 14px;position:relative}.sk-beats.on i{animation:skbeat .5s backwards}.sk-beats.on i:nth-child(2){animation-delay:.5s}.sk-beats.on i:nth-child(3){animation-delay:1s}.sk-beats.on i:nth-child(4){animation-delay:1.5s}.sk-beats.on i:nth-child(5){animation-delay:2s}.sk-beats em{position:absolute;top:-30px;left:50%;transform:translateX(-50%);font-size:26px;font-style:normal}
@keyframes skbeat{0%{transform:scale(1)}40%{transform:scale(1.25);background:#fff2a8}}
.sk-exp>*{flex-shrink:0}#sk .sk-ch button:focus:not(.zz)::before{left:50%;top:-4px;transform:translate(-50%,-100%) rotate(90deg);width:50px;height:50px}.sk-count i small.cn{display:block;font-size:18px;font-weight:900;color:#6a5a75;font-style:normal;line-height:1}.smk{font-size:.7em;color:#e0457b}.sk-yomi{flex-basis:100%;text-align:center;font-size:30px;font-weight:800;color:#6a5a75;margin-top:6px;letter-spacing:2px}.sk-objs .sk-d.emo-d:has(.sk-ill[data-k^="coin"]){width:52px;height:52px;font-size:48px}.sk-clk.mins{width:270px;height:270px}.sk-exp .sk-story{font-size:30px}.sk-story.kgs{font-size:34px}.sk-story .kg{color:#e0457b;font-size:1.3em}.sk-pair .lab{white-space:nowrap}.sk-pair.row{flex-direction:row;justify-content:center}.sk-pair.row>div{flex-direction:column;gap:2px;padding:26px 30px 10px;min-width:150px}.sk-pair.row .sk-big.kjs{font-size:110px;line-height:1.1}.sk-pair .yo{font-size:24px;font-weight:900;color:#6a5a75}
.sk-story{font-size:24px;font-weight:700;text-align:left;background:#fffdf3;border-radius:16px;padding:10px 14px;margin-bottom:8px;line-height:1.7}
.sk-col{display:inline-block;width:120px;height:120px;border-radius:24px;border:4px solid #4a3b52}.sk-big .sk-col{width:100px;height:100px}
.sk-count{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:600px}.sk-count i{font-style:normal;font-size:44px;display:flex;flex-direction:column;align-items:center;animation:skin .3s backwards;animation-delay:calc(var(--i)*.55s)}.sk-count b{font-size:16px}
.sk-spell i{font-style:normal;display:inline-block;animation:skin .3s backwards;animation-delay:calc(var(--i)*.25s)}
.sk-shapes{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;max-width:520px}.sh{display:inline-block;width:56px;height:56px;transform:rotate(var(--r));background:#c8b8d6}.sh.circle{border-radius:50%}.sh.tri{clip-path:polygon(50% 0,100% 100%,0 100%)}.sh.hl{background:#ff9a3c;animation:skblink2 .9s infinite}@keyframes skblink2{50%{filter:brightness(1.25)}}
.sk-exp{position:absolute;inset:0;background:linear-gradient(160deg,#fffaf0,#fff0f6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;z-index:5;animation:skfade .3s}
.sk-exp h3{margin:0;font-size:26px}.sk-pvrow{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:flex-end}.sk-pvrow .lose{opacity:.4}.sk-pvrow .win{transform:scale(1.12);filter:drop-shadow(0 0 6px #ffb020)}.sk-q .sk-sub{font-size:.62em;color:#8a7a92;font-weight:800}.sk-grp{display:inline-flex;flex-direction:column;align-items:center;gap:4px}.sk-grp b{font-size:26px;color:#2f7fe0}.sk-cmp{display:flex;flex-direction:column;gap:8px;align-items:flex-start}.sk-cmprow{display:flex;align-items:center;gap:4px}.sk-cmprow b{font-size:22px;min-width:2.6em;text-align:right;margin-right:6px}.sk-cmprow{flex-wrap:nowrap}.sk-cmprow .sk-d{width:30px;height:30px;flex:none;font-size:26px}.sk-cmprow .sk-d.emo-d.xtra{background:#9fd0ff!important;box-shadow:0 0 0 4px #2f7fe0!important;border-radius:50%;transform:scale(1.2)}.sk-cmprow .sk-d.dim{opacity:.45}.sk-exp .sk-recap{font-size:28px;font-weight:800;color:#4a3a55;background:#fff;border:3px solid #f3d9b8;border-radius:18px;padding:8px 22px;max-width:min(90vw,820px);text-align:center;line-height:1.45;white-space:pre-line}.sk-exp .sk-recap .sk-say{display:none}.sk-exp .sk-rviz{zoom:.5;margin-top:4px;display:flex;justify-content:center;pointer-events:none}.sk-exp .sk-stage{min-height:260px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;max-width:900px}.sk-exp .sk-cap{font-size:26px;font-weight:800;text-align:center;max-width:820px;min-height:2.6em}
.sk-exp .sk-btns{display:flex;gap:12px}.sk-exp .sk-btns button{border:none;border-radius:22px;padding:14px 22px;font-size:24px;font-weight:900;background:#fff;box-shadow:0 5px 0 #e3cdd7}.sk-exp .sk-btns .go{background:#ffd34d;box-shadow:0 5px 0 #e0aa1e}
.sk-sdots{display:flex;gap:8px}.sk-sdots i{width:14px;height:14px;border-radius:50%;background:#e8dbe3}.sk-sdots i.on{background:#ff7aa8}
@keyframes skfade{from{opacity:0}}
#sk.sk-reduce *,#sk.sk-reduce *::before,#sk.sk-reduce *::after{animation-duration:.01s!important;animation-iteration-count:1!important;transition-duration:.01s!important}#sk.sk-reduce .sk-burst{animation:none!important;opacity:1}#sk.sk-norw .sk-coin{visibility:hidden}
.sk-fx{position:absolute;pointer-events:none;z-index:9;font-size:34px;animation:skfly .9s forwards}@keyframes skfly{to{transform:translate(var(--tx),var(--ty)) scale(.6);opacity:0}}
.sk-burst{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-size:64px;font-weight:900;color:#ff5a8a;text-shadow:0 4px 0 #fff,0 0 20px #fff;pointer-events:none;z-index:8;animation:skburst .75s forwards;white-space:nowrap}
@keyframes skburst{0%{transform:translate(-50%,-50%) scale(.3)}30%{transform:translate(-50%,-50%) scale(1.15)}100%{transform:translate(-50%,-90%) scale(1);opacity:0}}
.sk-home{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:860px}
.sk-home h1{margin:0;font-size:40px;letter-spacing:2px}.sk-home .sub{font-size:18px;font-weight:700;opacity:.8}
.sk-subs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;width:100%}
.sk-subs button{border:none;border-radius:28px;padding:18px;background:#fff;box-shadow:0 7px 0 #e6cfd9;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:28px;font-weight:900}
.sk-subs button span{font-size:52px}.sk-subs button small{font-size:15px;font-weight:700;opacity:.8}.sk-subs .all{background:linear-gradient(135deg,#fff3b0,#ffd0e4);white-space:nowrap;letter-spacing:-1px}
.sk-lvl{width:100%;height:10px;border-radius:6px;background:#f2e6ec;overflow:hidden}.sk-lvl i{display:block;height:100%;background:var(--c)}
.sk-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.sk-row button{border:none;border-radius:20px;padding:10px 18px;font-size:18px;font-weight:800;background:#fff;box-shadow:0 4px 0 #e6cfd9}
.sk-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;max-height:60vh;overflow:auto;width:100%;padding:4px}.sk-card{background:#fff;border-radius:18px;padding:10px;text-align:center;font-size:14px;font-weight:700;box-shadow:0 4px 0 #e6cfd9}.sk-card b{display:block;font-size:44px}.sk-card.no{opacity:.35}
.sk-newcard{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff8e8ee;z-index:10;gap:12px;animation:skfade .3s}.sk-newcard .c{background:#fff;border-radius:26px;padding:20px 28px;box-shadow:0 8px 0 #f0d39a;text-align:center;max-width:520px;animation:skflip .7s}.sk-newcard .c b{font-size:110px;display:block}.sk-newcard .c p{font-size:24px;font-weight:800;margin:6px 0}
@keyframes skflip{from{transform:rotateY(90deg) scale(.6)}}
.sk-sum{background:#fff;border-radius:28px;padding:20px 26px;box-shadow:0 7px 0 #f0d8e2;text-align:center;font-size:22px;font-weight:800;max-width:600px}.sk-sum .big{font-size:56px;color:#ff7a3c}
.sk-lvup{position:absolute;left:50%;top:18%;transform:translateX(-50%);background:#fff;border-radius:22px;padding:10px 20px;font-weight:900;font-size:22px;box-shadow:0 5px 0 #f0d39a;z-index:7;animation:skfade .3s}
.sk-d{position:relative}.sk-d.hid{visibility:hidden}.sk-d.pop{animation:skin .3s}
.sk-d[data-n]::before{content:attr(data-n);position:absolute;left:50%;top:-25px;transform:translateX(-50%);font-size:18px;font-weight:900;color:#4a3b52}
.sk-dr.join{margin-left:6px}
.sk-stage.noanim .sk-d:not(.mv):not(.pop):not(.hle){animation:none}
.sk-viz .sk-dr{max-width:380px}
.sk-tf .sk-d[data-n]::before{top:50%;transform:translate(-50%,-50%);color:#9a6200;font-size:20px}
.sk-pair{display:flex;flex-direction:column;gap:14px;align-items:stretch}.sk-pair>div{display:flex;align-items:center;justify-content:center;gap:14px;background:#fff;border-radius:22px;padding:20px 22px 8px;position:relative;flex-wrap:wrap}
.sk-pair .ngp{border:4px dashed #f09a9a;opacity:.85}.sk-pair .okp{border:5px solid #5cc183}.sk-pair .lab{position:absolute;left:14px;top:-14px;background:#fff;border-radius:10px;padding:0 8px;font-size:16px;font-weight:900}.sk-pair .ngp .lab{color:#d65a5a}.sk-pair .okp .lab{color:#2f9a5c}
.sk-pair .ar,.sk-sbs .ar{font-size:30px;font-weight:900}.sk-pair .sk-big{font-size:56px}.sk-big.kjs{font-size:64px;font-family:"Klee One","Hiragino Mincho ProN",serif}.sk-big.emos{font-size:52px}.sk-pair .sk-p{font-size:24px;margin:6px 0}
.sk-sbs{display:flex;align-items:center;gap:22px}.sk-sbs .sk-big{font-size:110px;background:#fff;border-radius:24px;padding:0 24px}
b.ngm{color:#d65a5a;text-decoration:underline wavy}
.sk-sent{font-size:30px;font-weight:900;background:#fff;border-radius:18px;padding:30px 16px 12px;line-height:1.5;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.sk-sent .w{position:relative;display:inline-block;padding:0 4px}.sk-sent .w em{position:absolute;left:50%;top:-26px;transform:translateX(-50%);font-size:16px;font-style:normal;color:#fff;background:#ff7a3c;border-radius:8px;padding:0 6px;white-space:nowrap}
.sk-jun{display:flex;align-items:center;gap:6px;justify-content:center}.sk-jun .c{background:#fff;border-radius:18px;padding:8px 10px;text-align:center;font-size:18px;font-weight:800;min-width:96px}.sk-jun .c b{display:block;font-size:48px}.sk-jun .c.q{border:4px dashed #ffb400}.sk-jun span{font-size:28px;font-weight:900}
.sk-tf.full{box-shadow:0 0 0 6px #ffe066,0 0 30px 10px #ffd34d;animation:skglow .9s}@keyframes skglow{from{box-shadow:0 0 0 0 #ffe066}}
.sk-objs{font-size:40px;letter-spacing:2px;max-width:560px;text-align:center;line-height:1.2}
.sk-story div{margin:4px 0}
.sk-ask{display:flex;gap:14px;justify-content:center;width:100%;margin-top:10px}.sk-ask button{border:none;border-radius:20px;min-width:96px;min-height:80px;font-size:40px;font-weight:900;background:#fff;box-shadow:0 6px 0 #d9c3ce}.sk-ask button.ok{background:#a8f0c0}.sk-ask button.ng{background:#ffd0d0}.sk-ask button.hint{outline:5px dashed #5cc183}
.sk-exp.asking .sk-btns{visibility:hidden}.sk-ask.gone{opacity:0;transform:scale(.8);transition:.3s}
#sk .sk-ask button.ng,#sk .sk-ch button.ng{background:#ffe6cc!important;box-shadow:0 7px 0 #f3c08c!important;outline:none!important;transform:none!important}#sk .sk-ask button.ng::before,#sk .sk-ch button.ng::before{content:none!important}#sk .sk-ask button.ok,#sk .sk-ch button.ok{background:#a8f0c0!important}
.sk-tut{position:absolute;right:14px;left:auto;bottom:14px;transform:none;pointer-events:none;opacity:.9;font-size:17px!important;padding:6px 14px!important;display:flex;align-items:center;gap:14px;background:#fffffff0;border-radius:22px;padding:10px 20px;font-size:22px;font-weight:900;box-shadow:0 5px 0 #e6cfd9;white-space:nowrap}
.sk-tut .rm{display:flex;flex-direction:column;align-items:center;background:#f4f1f6;border-radius:30px;padding:4px 12px;line-height:1.1}.sk-tut .rm i{font-style:normal;color:#ff7a3c;animation:skbob 1s infinite}.sk-tut .rm i+b+i{animation-delay:.5s}.sk-tut .rm b{display:inline-flex;width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid #ff7a3c;align-items:center;justify-content:center;color:#ff7a3c;font-size:16px;margin:2px 0}
.sk-exp .go .ok-ic{display:inline-flex;width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid #c98a00;align-items:center;justify-content:center;font-size:12px;color:#c98a00;vertical-align:middle}
.sk-exp .go.pulse{animation:skpulse 1.1s ease-in-out infinite}@keyframes skpulse{50%{transform:scale(1.12);box-shadow:0 0 0 10px #ffd34d66}}
.sk-keyhint{font-size:18px;font-weight:800;opacity:.75}
#sk.out{opacity:0;transition:opacity .5s}
.sk-lvc{width:auto!important;height:auto!important;border-radius:16px!important;padding:4px 12px;font-size:17px;font-weight:900;line-height:1.2;text-align:center;background:#fff;box-shadow:0 3px 0 #e6cfd9;color:#d0558a}
.sk-map{max-height:100%;overflow:auto}.sk-map .gr{border-radius:999px;padding:6px 16px;font-weight:900;font-size:18px;background:#fff}.sk-map .gr.on{background:#ffd34d}.sk-map .gr.off{opacity:.5}
.sk-ch.map{display:flex;flex-direction:column;align-items:stretch;gap:8px;width:min(90vw,640px)}.sk-ch.map button{flex:none;width:100%;max-width:none;min-height:64px;font-size:22px;display:grid;grid-template-columns:90px 110px 1fr;align-items:center;text-align:left;padding:8px 14px;gap:6px;position:relative}
.sk-ch.map button .st{font-size:20px;letter-spacing:1px}.sk-ch.map button .st i{font-style:normal;color:#ffb400}.sk-ch.map button .st i.no{color:#e3dbe6}.sk-ch.map button small{font-size:14px;opacity:.75;line-height:1.3}.sk-ch.map button.cur{background:#fff3c4}.sk-ch.map button em{position:absolute;right:10px;top:-10px;font-style:normal;font-size:13px;background:#ff7a3c;color:#fff;border-radius:8px;padding:0 6px}.sk-ch.map .back{display:block;text-align:center;min-height:56px}
.sk-cmp{display:flex;flex-direction:column;gap:12px;align-items:flex-start}.sk-cmp>div{display:flex;align-items:center;gap:10px}.sk-cmp b{font-size:34px;min-width:46px;text-align:right}.sk-d.emo-d:has(.sk-ill[data-k^="stick"]){width:66px;height:72px;font-size:68px}.sk-d.emo-d{background:none!important;box-shadow:none!important;font-size:34px;width:40px;height:40px;font-style:normal;display:inline-flex;align-items:center;justify-content:center}
.sk-blank{display:inline-block;width:1.1em;height:1.1em;border:3px dashed #ff7a3c;border-radius:8px;vertical-align:-0.15em;background:#fff8e6}
.sk-viz{margin-bottom:22px}
.sk-taken{display:flex;align-items:center;gap:8px;margin-top:12px;padding:6px 12px;border-radius:14px;background:#f4eef6;opacity:.8;animation:sktake .6s}.sk-taken span{font-size:16px;font-weight:900;color:#8a7a92}.sk-taken .sk-d{width:24px;height:24px}@keyframes sktake{from{transform:translate(-80px,-60px);opacity:0}}
.sk-enok{display:flex;flex-direction:column;align-items:center;gap:6px}.sk-enok .ngs{display:flex;align-items:center;gap:8px;opacity:.6;font-size:16px;font-weight:800}.sk-enok .ngs .sk-big{font-size:40px}.sk-enok .okb{display:flex;align-items:center;gap:10px;background:#fff;border:5px solid #5cc183;border-radius:26px;padding:4px 26px}
.sk-line{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:640px}.sk-line i{font-style:normal;width:46px;height:46px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;border-bottom:4px solid #e3d6e6}.sk-line i.st{background:#ffb84d;color:#fff}.sk-line i.hop{background:#8ccfff;animation:skpop .3s}.sk-line i.end{background:#5cc183;color:#fff}
.sk-ch.pick{display:grid!important;grid-template-columns:1fr 1fr;gap:16px;width:min(88vw,640px)}.sk-ch.pick button{width:100%!important;max-width:none;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative}.sk-ch.pick .ic{font-size:56px}.sk-ch.pick small{font-size:16px;opacity:.7}.sk-ch.pick em{position:absolute;top:-10px;right:10px;font-style:normal;font-size:15px;background:#ff7a3c;color:#fff;border-radius:10px;padding:0 8px}
.sk-eqs{width:100%;text-align:center;font-size:30px;font-weight:900;margin-bottom:10px}.sk-eqs b{color:#2d86cc}.sk-eqs b.r{color:#ff5a8a}
.subj-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:6px}.sk-ch.map .subj-row button{display:block;width:auto;min-height:52px;font-size:20px;padding:6px 14px;text-align:center}.sk-ch.map .subj-row button.on{background:#ffd34d}
.sk-novoice{background:#fff3cd;border-radius:14px;padding:8px 14px;font-weight:800;font-size:18px;text-align:center}.sk-novoice small{font-size:14px;font-weight:600}
.sk-ch.pick .retryv{grid-column:1 / -1;min-height:64px!important;font-size:22px}
.sk-now{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:900;background:#fff;border-radius:24px;padding:14px 28px;box-shadow:0 6px 0 #f0d8e2}.sk-now .ic{font-size:64px}
.sk-ch.nowsel button{min-height:84px;font-size:26px}
#sk .sk-ch button.ready{animation:skready .4s}@keyframes skready{50%{box-shadow:0 0 0 14px #ffd34d88}}
.sk-stamps{display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:center;font-size:14px;font-weight:800}.sk-stamps span{margin-right:6px}.sk-stamps i{font-style:normal;width:34px;height:40px;border-radius:8px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:18px;line-height:1}.sk-stamps i small{font-size:10px;opacity:.6}.sk-stamps i.on{background:#ffe3ef}
.sk-ch.map .cardsb{display:block;text-align:center;min-height:56px}.sk-ch.cardsel{flex-direction:row!important;gap:10px}.sk-ch.cardsel button{width:auto!important;min-height:64px!important;font-size:22px;flex:1}.sk-ch.cardsel button[disabled]{opacity:.4}
.sk-stampget{margin-top:6px;background:#ffe3ef;border-radius:12px;padding:4px 10px;color:#c2477d}
.sk-sum.clear{padding:26px 34px}.sk-sum.clear .hero{font-size:54px;line-height:1.2;color:#ff5a8a}.sk-sum.clear .mini{font-size:22px;opacity:.8;margin-top:8px}.sk-sum.clear .back{margin-top:10px;color:#ff7a3c}
.sk-today{background:#ffe3ef;border-radius:12px;padding:4px 14px;font-weight:900;color:#c2477d}.sk-grow{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;font-weight:900;font-size:16px}.sk-grow span{background:#e8f7ee;border-radius:10px;padding:2px 8px;font-size:14px}
.sk-card{position:relative}.sk-card em{position:absolute;top:4px;right:6px;font-style:normal}button.sk-card{border:none;font:inherit;cursor:pointer}.sk-card.no.buy{opacity:.75;outline:2px dashed #ffb400}.sk-card.no b{filter:grayscale(1);opacity:.6}
.sk-quit{position:absolute;left:12px;bottom:12px;border:none;border-radius:999px;padding:8px 14px;background:#ffffffcc;font-size:15px;font-weight:800;color:#8a7a92;z-index:4}
.sk-ch.quitsel{flex-direction:row!important;gap:14px}
.sk-fork{gap:16px;padding:20px}.sk-fork h2{margin:0;font-size:clamp(20px,3vw,28px);text-align:center}.sk-fork .fk-n{display:flex;gap:14px}.sk-fork .fk-n div{background:#fff;border-radius:18px;padding:10px 18px;text-align:center;box-shadow:0 4px 0 #f0d8e2;min-width:120px}.sk-fork .fk-n b{display:block;font-size:44px;color:#ff5a8a;line-height:1.1}.sk-fork .fk-n span{font-size:16px;font-weight:800}.sk-fork .fk-c{display:flex;flex-direction:column;gap:10px;width:min(92vw,640px)}.sk-fork .fk-c button{border:none;border-radius:18px;background:#fff;box-shadow:0 5px 0 #d9c3ce;padding:12px 18px;text-align:left;display:flex;flex-direction:column;gap:2px}.sk-fork .fk-c button b{font-size:22px}.sk-fork .fk-c button span{font-size:16px;font-weight:700;opacity:.8}#sk .sk-fork .fk-c button:focus{outline:8px solid #ff7a3c;outline-offset:3px;transform:scale(1.02)}.sk-ch.quitsel.eq{width:min(94vw,760px)}.sk-ch.quitsel.eq button{flex:1 1 0!important;min-width:0!important;white-space:nowrap;font-size:clamp(18px,3.2vw,26px)!important;padding:0 10px}.sk-ch.quitsel button{width:auto!important;min-width:220px;min-height:84px!important;font-size:26px}
.sk-burst.fx-gentle{font-size:44px;color:#5c9e6e;text-shadow:0 2px 0 #fff;animation:skgentle .75s forwards}@keyframes skgentle{0%{opacity:0;transform:translate(-50%,-40%)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}
.sk-burst.fx-sparkle{color:#ff9a00}.sk-spark{position:absolute;font-size:34px;pointer-events:none;z-index:9;animation:skspark .7s forwards}@keyframes skspark{0%{transform:scale(.2);opacity:0}30%{opacity:1;transform:scale(1.2)}100%{transform:scale(.6) translateY(-40px);opacity:0}}
.sk-ear{font-size:90px;animation:skbob 1.2s ease-in-out infinite}@keyframes skbob{50%{transform:translateY(-8px)}}
.sk-tag.re{background:#fff2a8;color:#a0522d!important}
.sk-ch.txt button{font-size:27px;line-height:1.35;padding:10px 14px}
.sk-gcard{background:#fff8e8;border-radius:18px;padding:8px 14px;margin-top:6px}.sk-gcard b{font-size:60px;display:block}.sk-gcard p{margin:4px 0;font-size:20px}
#sk.sk-lcol .sk-ch:not(.map):not(.pick):not(.quitsel):not(.cardsel):not(.nowsel){flex-direction:column;align-items:center;flex-wrap:nowrap;gap:12px}#sk.sk-lcol .sk-ch:not(.map):not(.pick):not(.quitsel):not(.cardsel):not(.nowsel) button{flex:none;width:min(70vw,460px);max-width:none;min-height:clamp(58px,10.5vh,96px);font-size:clamp(26px,5vh,40px)}
@media (orientation:landscape){#sk.sk-lcol .sk-ch:not(.map):not(.pick):not(.quitsel):not(.cardsel):not(.nowsel){gap:clamp(8px,1.6vh,14px);max-width:520px}#sk.sk-lcol .sk-viz{max-height:22vh}#sk.sk-lcol .sk-tut{position:absolute;right:16px;bottom:16px;left:auto;transform:none}}
#sk .sk-main button:focus{outline:10px solid #ff7a3c;outline-offset:4px;transform:scale(1.04);position:relative;z-index:2}
#sk.sk-lrow .sk-ch:not(.map):not(.pick){flex-direction:row;flex-wrap:nowrap}.sk-tut .rm.rw{flex-direction:row}
#sk .sk-ch button:focus,#sk .sk-exp button:focus,#sk .sk-newcard button:focus{outline:12px solid #ff7a3c;outline-offset:5px;transform:scale(1.06);background:#fff3e0;position:relative;z-index:2}
#sk .sk-ch button:focus::before{content:'';position:absolute;left:-10px;top:50%;transform:translate(-100%,-50%);width:54px;height:54px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M2.5 12h11' stroke='%23ff8a3c' stroke-width='4.5' stroke-linecap='round'/%3E%3Cpath d='M12 5.5l9 6.5-9 6.5z' fill='%23ff8a3c' stroke='%23ff8a3c' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center/contain;animation:skpt .9s ease-in-out infinite alternate}
@media (orientation:portrait){.sk-q{padding-right:64px;padding-left:64px}.sk-story{font-size:27px}.sk-ch.txt button{font-size:28px}.sk-exp .sk-stage{zoom:1.4;min-height:220px}.sk-exp .sk-cap{font-size:30px}.sk-exp h3{font-size:30px}.sk-viz{zoom:1.25}.sk-ch{flex-direction:column;align-items:center}.sk-ch button{flex:none;width:min(80vw,600px);max-width:none;min-height:104px}.sk-ch.emo button{min-height:120px}.sk-q{font-size:32px}}
@media (max-height:620px){.sk-q{font-size:24px;padding:12px 16px}.sk-ch button{min-height:74px;font-size:28px}.sk-big.kj{font-size:90px}.sk-big.emo{font-size:80px}.sk-exp .sk-stage{min-height:200px}}
`;
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export function openSekai(opt0 = {}) {
  if (document.getElementById('sk')) return null;
  const opt = { ...(opt0 && typeof opt0 === 'object' ? opt0 : {}) }; const warns = checkOpts(opt); if (warns.length) console.warn('[sekai] オプション:', warns.join(' / '));
  const RW = opt.rewards !== false; // false：コイン・カード・スタンプは アプリがわに まかせる（けっかだけ わたす）
  const REDUCE = opt.motion === 'reduce' || (opt.motion !== 'full' && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  try { sekaiVoiceInit(opt.voiceBase || new URL('voice/', import.meta.url).href); } catch (e) {}
  if (!document.getElementById('skcss')) { const s = el('style'); s.id = 'skcss'; s.textContent = CSS; document.head.appendChild(s); }
  voiceOn = opt.voice !== false; FORCE = opt.debug && opt.force ? opt.force : null; if (opt.debug) window.__skNoSync = 1;
  const p = loadProgress(); const gameId = opt.gameId || 'nakayoshi';
  if (famGet()) sekaiSync().then((r) => { if (r && r.ok) { const q = loadProgress(); Object.assign(p, q); try { coinUI(); if (main.querySelector('.sk-wallet')) home(); } catch (e) {} } });
  if (!p.tb1) { const st = { math: SUBJ.math.L.findIndex((s) => s.id === 'tm_hiku9'), kokugo: SUBJ.kokugo.L.findIndex((s) => TB_PAGE[s.id] >= 49) }; for (const k in st) if (st[k] > 0 && p.subj[k].r < st[k]) p.subj[k].r = st[k]; p.tb1 = 1; saveProgress(p); }
  if (opt.illBase) ILL_BASE = opt.illBase; else try { ILL_BASE = new URL('ill/', import.meta.url).href; } catch (e) {}
  const root = el('div'); root.id = 'sk'; if (REDUCE) root.classList.add('sk-reduce'); if (!RW) root.classList.add('sk-norw'); document.body.appendChild(root); deEmo(root); try { new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') deEmoText(m.target); else m.addedNodes.forEach(deEmo); } }).observe(root, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  const top = el('div', 'sk-top', `<button class="sk-x" title="もどる">✕</button><div class="sk-combo"></div><div class="sk-coin"><i class="sk-jar"><b></b></i><span>${opt.wallet ? opt.wallet() : p.coins}</span><small>えん</small></div>`); root.appendChild(top);
  const bar = el('div', 'sk-bar', '<i></i>'); root.appendChild(bar); bar.style.visibility = 'hidden';
  const main = el('div', 'sk-main'); root.appendChild(main);
  let session = null; const T0 = Date.now(); let ended = false;
  // おわった ときの けっか（アプリに わたす）：kind＝completed（できた）／quit（きょうは おしまい）／closed（✕で とじた）／error（こまった ことが おきた）
  const result = (kind, err) => { const s = session || {}; return { api: SEKAI_API, kind, gameId, goal: s.goal || (opt.gate ? opt.gate.goal : 0), done: s.n || 0, startedAt: opt.gate ? opt.gate.start || 0 : 0, independentCorrect: s.indep || 0, retryCorrect: s.retryOk || 0, assistedCompleted: s.assistN || 0, reviewCorrect: s.revOk || 0, wrong: s.wrong || 0, earned: RW ? s.earned || 0 : 0, rewards: RW, rewardTx: { done: txList().filter((x) => x.app === gameId && x.st === 'done' && x.t >= T0).length, pending: txList().filter((x) => mineTx(x) && x.st === 'pending').length }, ms: Date.now() - T0, doneBy: { self: 0, retry: 0, review: 0, assist: 0, ...(s.by || {}) }, rule: opt.gate ? (opt.gate.count === 'self' ? 'self' : 'all') : 'free', met: !!(s.goalHit),  hostErrors: hostErr.slice(0, 10), ...(err ? { error: String((err && err.message) || err).slice(0, 200), source: 'engine' } : {}) }; };
  // ごほうびの うけわたし：1かいずつ id を つけて のこす。アプリが うけとれなかったら つぎに ひらいた ときに もういちど（アプリは id で にじゅうに しない）
  const txList = () => (p.txOut = p.txOut || []);
  function deliver(tx) { if (!opt.onCoins) { tx.st = 'local'; return; } let r; try { r = opt.onCoins(tx.n, { id: tx.id, amount: tx.n, at: tx.t, app: tx.app }); } catch (e) { tx.st = 'pending'; tx.err = String((e && e.message) || e).slice(0, 80); tx.tries = (tx.tries || 0) + 1; hostErr.push({ at: 'onCoins', msg: tx.err }); try { p.hostLog = (p.hostLog || []).concat({ t: Date.now(), app: gameId, at: 'onCoins', msg: tx.err }).slice(-10); } catch (x) {} return; }
    const fin = (v) => { if (v === false) { tx.st = 'pending'; tx.tries = (tx.tries || 0) + 1; } else { tx.st = 'done'; delete tx.err; } saveProgress(p); };
    if (r && typeof r.then === 'function') { tx.st = 'pending'; r.then(fin, (e) => { tx.tries = (tx.tries || 0) + 1; tx.err = String((e && e.message) || e).slice(0, 80); saveProgress(p); }); } else fin(r); }
  function payOut(n) { const tx = { id: gameId + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n, t: Date.now(), app: gameId, dev: p.dev, st: 'pending' }; txList().push(tx); if (p.txOut.length > 60) p.txOut = p.txOut.filter((x) => x.st === 'pending' || p.txOut.indexOf(x) >= p.txOut.length - 60); deliver(tx); saveProgress(p); }
  const mineTx = (x) => x.app === gameId && (!x.dev || x.dev === p.dev); // この たんまつ・この ゲームの ぶん だけ（ふっきゅう した たんまつは もとの ぶんを おくらない）
  function retryPay() { for (const tx of txList()) if (tx.st === 'pending' && mineTx(tx)) deliver(tx); saveProgress(p); }
  const hostErr = []; // アプリがわ（ホスト）の コールバックの こまりごと：がくしゅうは とめない
  const call = (name, fn, ...a) => { if (typeof fn !== 'function') return; try { return fn(...a); } catch (e) { hostErr.push({ at: name, msg: String((e && e.message) || e).slice(0, 160) }); try { p.hostLog = (p.hostLog || []).concat({ t: Date.now(), app: gameId, at: name, msg: String((e && e.message) || e).slice(0, 120) }).slice(-10); saveProgress(p); } catch (x) {} console.warn('[sekai] ホストの ' + name + ' で エラー（がくしゅうは つづける）', e); } };
  const emit = (kind, err) => { if (ended) return null; ended = true; window.removeEventListener('keydown', keyCap, true); cancelAnimationFrame(padRaf); delete document.documentElement.dataset.sekai; window.dispatchEvent(new CustomEvent('sekai:close')); window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr); const r = result(kind, err); call('onResult', opt.onResult, r); return r; };
  const onErr = (ev) => { const e = ev.error || ev.reason || ev.message; const top = String((e && e.stack) || '').split('\n').find((l) => /\bat\b|@/.test(l)) || ev.filename || ''; if (!/sekai/.test(top)) return; failSafe(e); }; // がくしゅうエンジンの なかで おきた ものだけ
  function failSafe(e) { if (ended) return; console.error('[sekai] エラー', e); hush(); try { saveProgress(p); } catch (x) {} root.remove(); const r = emit('error', e); if (opt.onError) call('onError', opt.onError, r); else if (opt.gate && opt.gate.onQuit) call('onQuit', opt.gate.onQuit, r.done, r); else call('onClose', opt.onClose, r.earned, r); }
  window.addEventListener('error', onErr); window.addEventListener('unhandledrejection', onErr);
  // キー入力：ひらいている あいだは ゲームがわに とどかないように する（うしろの キャラが うごかない）。アプリが じぶんで sekaiKey を よぶ ときは keys:false
  // ならびかた：layout 'column'（たて）／'row'（よこ）／'auto'（さいごに つかった やじるしに あわせる。▲▼ なら たて、◀▶ なら よこ）
  const LAY = opt.layout || 'auto'; const setLay = (v) => { root.classList.toggle('sk-lcol', v === 'col'); root.classList.toggle('sk-lrow', v === 'row'); const h = root.querySelector('.sk-tut span:last-child'); if (h) h.innerHTML = v === 'row' ? '◀▶ で えらんで<br>まんなかで こたえる' : '▲▼ で えらんで<br>まんなかで こたえる'; const rm = root.querySelector('.sk-tut .rm'); if (rm) { rm.classList.toggle('rw', v === 'row'); rm.innerHTML = v === 'row' ? '<i>◀</i><b>●</b><i>▶</i>' : '<i>▲</i><b>●</b><i>▼</i>'; } };
  function noteDir() {} // やじるしは えらぶ だけ（ならびは かえない：こたえの ばしょが うごくと まよう）
  setLay(LAY === 'column' ? 'col' : LAY === 'row' ? 'row' : innerWidth > innerHeight ? 'row' : 'col'); // はじめに いちど だけ きめる
  const NAV = ['Enter', 'Select', ' ', 'MediaPlayPause', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const keyCap = (e) => { if (!root.isConnected) return window.removeEventListener('keydown', keyCap, true); const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; let k = e.key; if (e.keyCode === 23 || e.keyCode === 66) k = 'Enter'; if (/^F\d+$/.test(k) || k === 'Tab' || e.ctrlKey || e.metaKey) return;
    e.stopImmediatePropagation(); if (NAV.includes(k)) { e.preventDefault(); if (k.startsWith('Arrow')) noteDir(k); sekaiKey(k, e); } };
  if (opt.keys !== false) window.addEventListener('keydown', keyCap, true);
  try { document.pointerLockElement && document.exitPointerLock(); } catch (e) {}
  document.documentElement.dataset.sekai = 'open'; window.dispatchEvent(new CustomEvent('sekai:open', { detail: { api: SEKAI_API } })); // ホストは これを みて じぶんの そうさを とめる
  // ゲームパッド（PS4 など）：じゅうじキー・スティックで えらぶ、○×（0/1）で こたえる
  let padRaf = 0, padPrev = {}; const padLoop = () => { if (!root.isConnected) return; const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (gp) { const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed); const ax = gp.axes || []; const st = { u: b(12) || ax[1] < -0.6, d: b(13) || ax[1] > 0.6, l: b(14) || ax[0] < -0.6, r: b(15) || ax[0] > 0.6, ok: b(0) || b(1) };
      const K = { u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', ok: 'Enter' }; for (const k in st) if (st[k] && !padPrev[k]) { if (k !== 'ok') noteDir(K[k]); sekaiKey(K[k]); } padPrev = st; }
    padRaf = requestAnimationFrame(padLoop); };
  if (opt.gamepad !== false) padRaf = requestAnimationFrame(padLoop);
  const wallet = () => (opt.wallet ? opt.wallet() : p.coins);
  const coinUI = () => { const c = top.querySelector('.sk-coin'); const sp = c.querySelector('span'); const to = wallet(), from = +sp.textContent || 0; const jar = c.querySelector('.sk-jar b'); if (jar) jar.style.height = ((to % 100) / 100) * 100 + '%';
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); if (to <= from || REDUCE) { sp.textContent = to; return; } const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 600); sp.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
    if (Math.floor(to / 100) > Math.floor(from / 100) && from > 0) setTimeout(() => { const d = el('div', 'sk-milestone', `<b>${Math.floor(to / 100) * 100}えん</b> たまった！<span>${shopLine(to)}</span>`); root.appendChild(d); confetti(50, false); SE.card(); setTimeout(() => d.remove(), 2600); }, 650); };
  const shopLine = (bal) => { const ok = SHOP.filter((x) => x[0] <= bal); if (!ok.length) return ''; const it = pick(ok.slice(-6)); return `${it[2]}が ${cnt(Math.floor(bal / it[0]), it[3])} かえるよ`; };
  // ホームの おさいふ：いまの おかねで かえるもの と、つぎに かえるもの
  const walletCard = () => { const bal = wallet(); const ok = SHOP.filter((x) => x[0] <= bal); const nx = SHOP.find((x) => x[0] > bal);
    const pk = ok.length ? shuffle(ok.slice(-8)).slice(0, 3) : []; const row = (it) => `<div class="sk-buy">${ill(it[1])}<span>${it[2]}<b>${cnt(Math.floor(bal / it[0]), it[3])}</b></span></div>`;
    return `<div class="sk-wallet"><div class="sk-wtop"><i class="sk-jar big"><b style="height:${((bal % 100) / 100) * 100}%"></b></i><div><small>いま たまっている おかね</small><b class="sk-wyen">${bal}<em>えん</em></b></div><button class="sk-wlist">100えんで かえるもの ▶</button></div>
      ${pk.length ? `<div class="sk-wsub">この おかねで かえるもの</div><div class="sk-buys">${pk.map(row).join('')}</div>` : '<div class="sk-wsub">もんだいを とくと 1もん 5えん たまるよ</div>'}
      ${nx ? `<div class="sk-wnext">${ill(nx[1])}<span>あと <b>${nx[0] - bal}えん</b>で ${nx[2]}が かえるよ！</span></div>` : ''}<div class="sk-wnote">ねだんは だいたいです</div></div>`; };
  function showShop(back) { hush(); const tiers = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000, 10000, 20000]; const bal = wallet();
    const sets = (T) => { const fit = SHOP.filter((x) => x[0] <= T); const one = fit.filter((x) => x[0] > T / 2).slice(-2); const many = shuffle(fit.filter((x) => x[0] <= T / 2)).slice(0, 3 - Math.min(2, one.length) + 1); return [...one.map((x) => [x, 1]), ...many.map((x) => [x, Math.floor(T / x[0])])].slice(0, 4); };
    main.innerHTML = `<div class="sk-home sk-shop"><h1>おかねで かえるもの</h1><div class="sub">いま ${bal}えん ・ ねだんは だいたいです</div><div class="sk-ch cardsel"><button class="back">← もどる</button></div><div class="sk-tiers">${tiers.map((T) => `<div class="sk-tier${bal >= T ? ' got' : ''}"><div class="h"><b>${T.toLocaleString()}えん</b>${bal >= T ? '<em>かえる！</em>' : `<small>あと ${(T - bal).toLocaleString()}えん</small>`}</div><div class="its">${sets(T).map(([x, n]) => `<div class="sk-buy">${ill(x[1])}<span>${x[2]}<b>${cnt(n, x[3])}</b></span></div>`).join('')}</div></div>`).join('')}</div></div>`;
    main.querySelector('.back').onclick = back || home; }
  const close = () => { hush(); setTimeout(() => sekaiSync(), 300); if (RW && opt.onCoins) retryPay(); saveProgress(p); root.remove(); const r = emit(session && session.goalHit ? 'completed' : 'closed'); call('onClose', opt.onClose, RW && session ? session.earned : 0, r); };
  if (opt.gate && opt.gate.onQuit) { const qb = el('button', 'sk-quit', '🏠 きょうは おしまい'); root.appendChild(qb); qb.onclick = () => { hush(); const d = el('div', 'sk-newcard', `<h2 style="margin:0;font-size:30px">きょうは おしまいに する？</h2>${opt.gate.back ? '' : '<div class="sub" style="font-size:20px">どうがは つぎに チャレンジが おわってから みられるよ</div>'}<div class="sk-ch quitsel"><button class="cont">▶ つづける</button><button class="end">🏠 おしまい</button></div>`); root.appendChild(d); d.querySelector('.cont').onclick = () => d.remove(); d.querySelector('.end').onclick = () => { hush(); saveProgress(p); root.remove(); const r = emit('quit'); call('onQuit', opt.gate.onQuit, session ? session.n : 0, r); }; setTimeout(() => d.querySelector('.cont').focus(), 50); }; }
  if (opt.gate) { const gg = goalOf(p); top.querySelector('.sk-x').outerHTML = `<div class="sk-x sk-lvc">🌸 ${gg.g}ねん<br>${gg.m}がつ</div>`; top.querySelector('.sk-combo').style.display = 'none'; const g = el('div', 'sk-gate'); g.style.cssText = 'position:absolute;left:50%;top:10px;transform:translateX(-50%);background:#fff;border-radius:999px;padding:8px 26px;font-weight:900;font-size:26px;box-shadow:0 5px 0 #f0d8e2;white-space:nowrap'; g.innerHTML = `🌍 ${opt.gate.goal}もん ちょうせん`; top.appendChild(g); }
  if (opt.mapOnly) top.querySelector('.sk-x').onclick = () => close();
  else top.querySelector('.sk-x').onclick = () => { if (opt.gate) return; SE.tap(); if (session && session.n > 0) finish(); else close(); };

  function home() {
    session = null; root.classList.remove('fever'); bar.style.visibility = 'hidden'; top.querySelector('.sk-combo').classList.remove('on');
    const td = p.days[today()] || 0;
    main.innerHTML = `<div class="sk-home"><h1>🌍 せかいを しる</h1><div class="sub">きょう ${td}もん せいかい ・ カード ${p.cards.length}/${CARDS.length}まい</div>${RW && !opt.wallet ? walletCard() : ''}<div class="sk-subs"></div><div class="sk-row"><button class="mapb">🌸 わたしの まなび</button><button class="cards">🃏 せかいの カード</button><button class="code">🔑 まなびコード</button><button class="parent">おうちの ひと</button>${RW && opt.onCoins ? `<button class="txb">🧾 おかねの きろく${txList().some((x) => mineTx(x) && x.st === 'pending') ? ' <b style="color:#e0464e">●</b>' : ''}</button>` : ''}<button class="voice">${voiceOn ? '🔊 こえ あり' : '🔇 こえ なし'}</button></div></div>`;
    const subs = main.querySelector('.sk-subs');
    const all = el('button', 'all', `<span>🌈</span>ぜんぶ まぜる<small>${RW ? '1もん とくと 5えん' : 'いろいろ でるよ'}</small>`); all.onclick = () => start(null); subs.appendChild(all);
    for (const k of Object.keys(SUBJ)) { const S = SUBJ[k], r = p.subj[k].r, lv = Math.floor(r) + 1; const b = el('button', '', `<span>${S.ic}</span>${S.n}<small>レベル ${lv}：${S.L[Math.min(S.L.length - 1, Math.floor(r))].n}</small><div class="sk-lvl" style="--c:${S.col}"><i style="width:${(r / S.L.length) * 100}%"></i></div>`); b.onclick = () => start(k); subs.appendChild(b); }
    main.querySelector('.mapb').onclick = showMap; main.querySelector('.cards').onclick = () => showCards(); main.querySelector('.code').onclick = showCode; main.querySelector('.parent').onclick = () => parentGate(showParent); if (main.querySelector('.txb')) main.querySelector('.txb').onclick = showTx; main.querySelector('.voice').onclick = () => { voiceOn = !voiceOn; home(); };
    say('せかいを しる。どれに する？'); { const wl = main.querySelector('.sk-wlist'); if (wl) wl.onclick = () => showShop(home); }
  }
  // 2かいめ から：「いまは ○○」を みじかく だして、そのまま はじまる（かえる ときは ▼で「かえる」）
  function showNow() {
    const k = p.pickSubj || ''; const ic = k ? SUBJ[k].ic : '🌈', n = k ? SUBJ[k].n : 'おまかせ';
    main.innerHTML = `<div class="sk-home"><div class="sk-now"><span class="ic">${ic}</span><div>いまは <b>${n}</b></div></div><div class="sk-ch nowsel"><button class="go1">▶ このまま はじめる</button><button class="chg">🔄 きょうかを かえる</button></div></div>`;
    let tm = setTimeout(() => go(), 3500); const go = () => { clearTimeout(tm); start(k || null); };
    main.querySelector('.go1').onclick = go; main.querySelector('.chg').onclick = () => { clearTimeout(tm); showPick(); };
    setTimeout(() => { const b = main.querySelector('.go1'); b && b.focus(); }, 50); say(`いまは ${n}`);
  }
  // どれに ちょうせん する？（こどもが えらぶ。えらばなければ 10びょうで おまかせ）
  function showPick() {
    const due = (sj) => dueReview(p, 0, sj).length; const rec = Object.keys(SUBJ).filter((k) => k !== 'eigo' || hasEn()).sort((a, b) => due(b) - due(a))[0];
    const opts = [['', '🌈', 'おまかせ', 'いろいろ でるよ'], ...Object.keys(SUBJ).filter((k) => k !== 'eigo' || hasEn()).map((k) => [k, SUBJ[k].ic, SUBJ[k].n, `${Math.floor(p.subj[k].r) + 1}だんめ`])];
    const novoice = !hasEn() ? `<div class="sk-novoice">🔇 おとが でない みたい。えいごは おとが でる ときに できるよ<br><small>おとなの ひとへ：おんりょう・マナーモードを たしかめてください</small></div>` : '';
    main.innerHTML = `<div class="sk-home"><h1>どれに ちょうせん する？</h1>${novoice}<div class="sk-ch pick">${opts.map(([k, ic, n, sub]) => `<button data-k="${k}"><span class="ic">${ic}</span><span>${n}</span><small>${sub}</small>${k && k === rec && due(k) ? '<em>おすすめ</em>' : ''}</button>`).join('')}</div>${novoice ? '<button class="retryv">🔊 もういちど ためす</button>' : ''}</div><div class="sub">えらばないと「${p.pickSubj && SUBJ[p.pickSubj] ? SUBJ[p.pickSubj].n : 'おまかせ'}」に なるよ</div></div>`;
    const rv = main.querySelector('.retryv'); if (rv) { main.querySelector('.sk-ch.pick').appendChild(rv); rv.onclick = () => { try { speechSynthesis.getVoices(); } catch (e) {} clearTimeout(tm); setTimeout(showPick, 300); }; }
    let tm = setTimeout(() => go(p.pickSubj || ''), opt.gate && opt.gate.pick === 'always' ? 30000 : 10000); /* えらばない ときは まえと おなじ きょうか */ const go = (k) => { clearTimeout(tm); SE.tap(); p.pickSubj = k || ''; saveProgress(p); start(k || null); };
    main.querySelectorAll('.sk-ch.pick button').forEach((b) => b.onclick = () => go(b.dataset.k));
    setTimeout(() => { const bs = [...main.querySelectorAll('.sk-ch.pick button')]; const b0 = bs.find((b) => p.pickSubj !== undefined && b.dataset.k === p.pickSubj) || bs[0]; b0 && b0.focus(); }, 50); // まえに えらんだ きょうかに はじめから あわせておく say('どれに ちょうせん する？');
  }
  // わたしの まなび：なんねんせいの なんがつの もんだいに ちょうせんするか、じぶんで えらぶ（これまでの きろくは きえない）
  function showMap() {
    session = null; bar.style.visibility = 'hidden'; const g = goalOf(p);
    const months = SCHOOL.map((m) => { const ids = Object.keys(MON).filter((id) => MON[id] === m); const done = ids.filter((id) => mastered(p, id)).length; const names = ids.map((id) => [...M2, ...K2].find((s) => s.id === id).n);
      return `<button data-m="${m}" class="${m === g.m ? 'cur' : ''}"><span class="mm">${m}がつ</span><span class="st">${'<i>★</i>'.repeat(done)}${'<i class="no">★</i>'.repeat(ids.length - done)}</span><small>${names.join('・') || 'なつやすみ'}</small>${m === g.m ? '<em>いま ここ</em>' : ''}</button>`; }).join('');
    main.innerHTML = `<div class="sk-home sk-map"><h1>🌸 わたしの まなび</h1><div class="sub">いま ちょうせんする ところ：<b>しょうがく ${g.g}ねんせい・${g.m}がつ</b>（めやす）</div>${stampRow()}${(p.days[today()] || 0) >= 1 ? '<div class="sk-today">🌸 きょうも できたね！</div>' : ''}${growRow()}<div class="sk-row"><span class="gr on">1ねんせい</span><span class="gr off">2ねんせい（じゅんびちゅう）</span></div><div class="sk-ch map"><div class="subj-row">${[['', '🌈 おまかせ'], ...Object.keys(SUBJ).map((k) => [k, SUBJ[k].ic + ' ' + SUBJ[k].n])].map(([k, n]) => `<button class="sj${(p.pickSubj || '') === k ? ' on' : ''}" data-sj="${k}">${n}</button>`).join('')}</div>${months}<button class="cardsb">🃏 せかいの カード（${p.cards.length}/${CARDS.length}）</button><button class="back">← もどる</button></div><div class="sub" style="font-size:15px">★＝ひを あけても できた ところ。つきは「めやす」だよ。えらんだ つき までの なかから、できぐあいに あわせて でるよ。とくいな ところは すこし さきも</div></div>`;
    main.querySelectorAll('.sk-ch.map button[data-sj]').forEach((b) => b.onclick = () => { p.pickSubj = b.dataset.sj; saveProgress(p); SE.card(); say(b.textContent.replace(/^\S+\s/, '') + ' に したよ'); showMap(); setTimeout(() => { const c = main.querySelector('.sk-ch.map button.sj.on'); c && c.focus(); }, 30); });
    main.querySelectorAll('.sk-ch.map button[data-m]').forEach((b) => b.onclick = () => { p.goal = { g: 1, m: +b.dataset.m }; saveProgress(p); SE.card(); say(`${b.dataset.m}がつ に したよ`); showMap(); setTimeout(() => { const c = main.querySelector('.sk-ch.map button.cur'); c && c.focus(); }, 30); });
    main.querySelector('.sk-ch.map .cardsb').onclick = () => showCards(showMap);
    main.querySelector('.sk-ch.map .back').onclick = () => { if (opt.mapOnly) close(); else home(); };
    setTimeout(() => { const c = main.querySelector('.sk-ch.map button.cur'); c && c.focus(); }, 30);
  }
  // せかいの カード ずかん（5もん クリアで 1まい。コインは「すきな カードと こうかん」：ランダムに しない・かぶらない）
  function showCards(back) {
    const can = !opt.wallet && p.coins >= CARD_YEN; // ゲームの おかねを べつに もつ アプリ（なかよしアイランド）では こうかんしない
    main.innerHTML = `<div class="sk-home"><h1>🃏 せかいの カード <small>${p.cards.length}/${CARDS.length}</small></h1><div class="sub">5もん できたら 1まい。${CARD_YEN}えんで すきな カードと こうかん できるよ（いま ${p.coins}えん）</div><div class="sk-ch cardsel"><button class="back">← もどる</button></div><div class="sk-cards">${CARDS.map((c, i) => p.cards.includes(i) ? `<div class="sk-card" data-i="${i}"><b>${c[0]}</b>${c[1]}${p.fav === i ? '<em>💗</em>' : ''}</div>` : `<button class="sk-card no ${can ? 'buy' : ''}" data-i="${i}"><b>${c[0]}</b>${can ? `${CARD_YEN}えんで こうかん` : 'まだ'}</button>`).join('')}</div></div>`;
    main.querySelector('.back').onclick = typeof back === 'function' ? back : home;
    main.querySelectorAll('.sk-card:not(.no)').forEach((c) => c.onclick = () => { const i = +c.dataset.i; say(CARDS[i][1]); p.fav = i; saveProgress(p); }); // タップで よみあげ＋「すきな カード」に
    main.querySelectorAll('.sk-card.buy').forEach((b) => b.onclick = () => { const id = +b.dataset.i; if (p.coins < CARD_YEN || p.cards.includes(id)) return; spendYen(p, CARD_YEN, 'カード'); p.cards.push(id); saveProgress(p); coinUI(); SE.card();
      const d = el('div', 'sk-newcard', `<h2 style="margin:0;font-size:30px">🃏 こうかん したよ！</h2><div class="c"><b>${CARDS[id][0]}</b><p>${CARDS[id][1]}</p></div><div class="sk-row"><button>つづける ▶</button></div>`); root.appendChild(d); say(CARDS[id][1]); const x = d.querySelector('button'); x.onclick = () => { hush(); d.remove(); showCards(back); }; setTimeout(() => x.focus(), 50); });
    setTimeout(() => { const b = main.querySelector('.cardsel button'); b && b.focus(); }, 50);
  }
  // できるように なった こと（まえは まちがえた → いまは できる）
  const growRow = () => { const it = [...(p.review || []).filter((x) => x.stage >= 3), ...(p.mastered || [])].slice(-4); const nm = (id) => { for (const k of Object.keys(SUBJ)) { const s = SUBJ[k].L.find((x) => x.id === id); if (s) return s.n; } return ''; }; return it.length ? `<div class="sk-grow">📈 できるように なった！ ${it.map((x) => `<span>${nm(x.sk)}「${String(x.ans).replace(/<[^>]+>/g, '').slice(0, 6)}」</span>`).join('')}</div>` : ''; };
  const stampRow = () => { const t = dayN(today()); const days = Array.from({ length: 14 }, (_, i) => { const dt = new Date((t - 13 + i) * 864e5); const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`; return [(p.days[key] || 0) >= 1 || ((p.hist || {})[key] && Object.values(p.hist[key]).some((v) => Array.isArray(v) && v[1] > 0)), dt.getDate()]; }); return `<div class="sk-stamps"><span>とりくんだ ひ</span>${days.map(([ok, d]) => `<i class="${ok ? 'on' : ''}">${ok ? '🌸' : ''}<small>${d}</small></i>`).join('')}</div>`; };
  function keypad(title, sub, done) { hush(); let v = ''; main.innerHTML = `<div class="sk-home sk-pin"><h1>${title}</h1><div class="sub">${sub}</div><div class="sk-pind">${'<i></i>'.repeat(4)}</div><div class="sk-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0, '×'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
    const draw = () => main.querySelectorAll('.sk-pind i').forEach((x, i) => x.classList.toggle('on', i < v.length));
    main.querySelectorAll('.sk-keys button').forEach((b) => b.onclick = () => { const k = b.dataset.k; if (k === '×') { home(); return; } if (k === '←') v = v.slice(0, -1); else if (v.length < 4) v += k; draw(); if (v.length === 4) setTimeout(() => done(v), 150); }); }
  function parentGate(next) { if (!p.ppin) keypad('おうちの ひと', 'はじめに あんしょうばんごう（4けた）を きめてください', (a) => keypad('もういちど', 'おなじ ばんごうを いれてください', (b) => { if (a !== b) { keypad('おうちの ひと', 'ちがいました。もういちど きめてください', () => parentGate(next)); return; } p.ppin = a; saveProgress(p); next(); }));
    else keypad('おうちの ひと', 'あんしょうばんごうを いれてください', (a) => { if (a === p.ppin) next(); else keypad('ちがいます', 'もういちど いれてください', (b) => { if (b === p.ppin) next(); else home(); }); }); }
  function showParent() { hush(); const y = yenOf(p), bal = yenBal(p), earned = Object.values(y.e).reduce((a, b) => a + b, 0); const f = famGet(); const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
    main.innerHTML = `<div class="sk-home sk-parent"><h1>おうちの ひと</h1><div class="sk-ch cardsel"><button class="back">← もどる</button></div>
      <div class="sk-pcard"><div class="sk-prow"><div><small>いまの のこり</small><b class="big">${bal}えん</b></div><div><small>これまでに ためた</small><b>${earned}えん</b></div><div><small>つかった</small><b>${earned - bal}えん</b></div></div>
        <div class="sk-psub">げんきんで わたした ぶんを へらす</div><div class="sk-pbtns">${[100, 300, 500, 1000].map((n) => `<button data-n="${n}" ${bal < n ? 'disabled' : ''}>${n}えん</button>`).join('')}<button data-n="${bal}" ${bal <= 0 ? 'disabled' : ''}>ぜんぶ（${bal}えん）</button></div>
        <div class="sk-psub">さいきんの つかいみち</div><div class="sk-plog">${y.s.slice(-8).reverse().map((x) => `<div><span>${fmt(x.at)}</span><span>${x.why}</span><b>−${x.n}えん</b></div>`).join('') || '<div><span>まだ ありません</span></div>'}</div></div>
      <div class="sk-pcard"><div class="sk-psub">かぞくで おなじ きろくに する（MEGAPAD・スマホ）</div>${f ? `<div class="sk-pfam">つながっています：<b>${f.code}</b>${f.last ? `<small>さいごに あわせた ${fmt(f.last)}</small>` : ''}</div><div class="sk-pbtns"><button class="sync">いま あわせる</button><button class="unfam">この たんまつを はずす</button></div>`
        : `<div class="sk-pfam"><small>おなじ「かぞくコード」と「ばんごう」を ほかの たんまつでも いれると、きろくと おかねが おなじに なります。</small></div><div class="sk-pform"><input class="fc" placeholder="かぞくコード（ローマじ 6もじ いじょう）" autocapitalize="off" autocomplete="off"><input class="fp" placeholder="ばんごう（4けた）" inputmode="numeric" maxlength="4"><button class="join">つなぐ</button></div>`}<div class="sk-pmsg"></div></div></div>`;
    main.querySelector('.back').onclick = home; const msg = (t) => { main.querySelector('.sk-pmsg').textContent = t; };
    main.querySelectorAll('.sk-pbtns button[data-n]').forEach((b) => b.onclick = () => { const n = +b.dataset.n; if (spendYen(p, n, 'げんきん')) { saveProgress(p); coinUI(); SE.coin(); sekaiSync(); showParent(); } });
    const j = main.querySelector('.join'); if (j) j.onclick = async () => { const code = main.querySelector('.fc').value.trim().toLowerCase(), pin = main.querySelector('.fp').value.trim(); if (!/^[a-z0-9_-]{6,}$/.test(code) || !/^\d{4}$/.test(pin)) { msg('かぞくコードは ローマじ・すうじ 6もじ いじょう、ばんごうは 4けたで いれてください'); return; } msg('つないでいます…');
      famSet({ code, pin }); const r = await sekaiSync(); if (r.ok) { Object.assign(p, loadProgress()); coinUI(); showParent(); } else { famSet(null); msg(r.why === 'PIN_NG' ? 'その かぞくコードは べつの ばんごうで つかわれています' : 'つながりませんでした。インターネットを たしかめてください'); } };
    const sy = main.querySelector('.sync'); if (sy) sy.onclick = async () => { msg('あわせています…'); const r = await sekaiSync(); if (r.ok) { Object.assign(p, loadProgress()); coinUI(); showParent(); } else msg('あわせられませんでした（' + r.why + '）'); };
    const uf = main.querySelector('.unfam'); if (uf) uf.onclick = () => { famSet(null); showParent(); }; }
  function showCode() {
    main.innerHTML = `<div class="sk-home"><h1>🔑 まなびコード</h1><div class="sub">べつの たんまつや ゲームで つづきを する ときに つかうよ（おとなの ひとと いっしょに）</div><textarea class="cd" style="width:100%;height:120px;border-radius:14px;border:2px solid #e6cfd9;padding:10px;font-size:14px" readonly>${exportCode(p)}</textarea><div class="sk-row"><button class="cp">📋 コピー</button><button class="in">📥 コードを よみこむ</button><button class="back">← もどる</button></div></div>`;
    main.querySelector('.cp').onclick = () => { const t = main.querySelector('.cd'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } SE.tap(); };
    main.querySelector('.in').onclick = () => { const c = prompt('まなびコードを はりつけてね'); if (!c) return; const ck2 = importCheck(c);
      if (!ck2.ok && ck2.reason === 'fork-later') { alert(ck2.msg); return; }
      if (!ck2.ok && ck2.reason === 'fork') { const both = ck2.k + ck2.mine + (ck2.theirs || 0); const d = el('div', 'sk-newcard sk-fork', `<h2>2つの たんまつで べつべつに べんきょうした きろくが あります</h2>
        <div class="fk-n"><div><b>${ck2.k}</b><span>いっしょの ぶん</span></div><div><b>${ck2.mine}</b><span>この たんまつ</span></div><div><b>${ck2.theirs == null ? '？' : ck2.theirs}</b><span>コードの たんまつ</span></div></div>
        <div class="fk-c"><button class="both"><b>📚 まとめる（おすすめ）</b><span>${ck2.theirsOk ? `まとめると ${both}もん に なります` : `いまは ${ck2.k + ck2.mine}もん。コードの たんまつの ${ck2.theirs}もんは「ほりゅう」にして、あとで はいります`}</span></button>
        <button class="rep"><b>🔁 コードの きろくに おきかえる</b><span>この たんまつの ${ck2.mine}もんは つかわなく なります（いまの きろくは ほぞんして から）</span></button>
        <button class="later"><b>⏸ あとで</b><span>なにも かえません</span></button></div><div class="sub">おとなの ひとと いっしょに えらんでね</div>`); root.appendChild(d);
        d.querySelector('.both').onclick = () => { const np = importCode(c, 'both'); if (np) { Object.assign(p, np); saveProgress(p); SE.card(); } else alert('いまは まとめられません。もう一方の たんまつで さきに まとめてね'); d.remove(); home(); };
        d.querySelector('.rep').onclick = () => { const np = importCode(c, 'replace'); if (np) { Object.assign(p, np); saveProgress(p); } d.remove(); home(); }; d.querySelector('.later').onclick = () => { d.remove(); };
        setTimeout(() => d.querySelector('.both').focus(), 50); return; }
      if (!ck2.ok) { alert(ck2.reason === 'new' ? 'あたらしい アプリの コードだよ。アプリを さいしんに してね' : 'コードが ちがうみたい'); return; } const np = importCode(c); if (!np) { alert('コードが ちがうみたい'); return; } Object.assign(p, np); saveProgress(p); SE.card(); home(); };
    main.querySelector('.back').onclick = home;
  }

  function start(prefer) { session = { prefer, k: 0, slot: 0, plan: [], id: Date.now(), miss: {}, n: opt.gate ? (opt.gate.start || 0) : 0, indep: 0, retryOk: 0, assistN: 0, revOk: 0, wrong: 0, ok: 0, combo: 0, best: 0, earned: 0, fever: false, goal: opt.gate ? opt.gate.goal : 10 }; bar.style.visibility = 'visible'; if (p.easyNext) { session.down = true; delete p.easyNext; saveProgress(p); } next(); } // まえに むずかしくて おわった ときは やさしめ から
  function updBar() { bar.querySelector('i').style.width = Math.min(100, (session.n / session.goal) * 100) + '%'; const gt = top.querySelector('.sk-gate'); if (gt) gt.innerHTML = `🌍 ${session.n} / ${session.goal} もん　<span style="color:#ff7a3c">${session.n >= session.goal ? 'クリア！' : `あと ${session.goal - session.n}もん！`}</span>`; const c = top.querySelector('.sk-combo'); c.classList.toggle('on', session.combo >= 2); const tier = session.combo >= 10 ? 4 : session.combo >= 5 ? 3 : session.combo >= 3 ? 2 : 1; c.className = `sk-combo${session.combo >= 2 ? ' on' : ''} t${tier}`; c.innerHTML = `${session.fever ? icon('fire') : icon('star')}<b>${session.combo}</b> れんぞく`; if (session.combo >= 2) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
  function next(forced) {
    hush();
    if (session.n >= session.goal && !session.more) return finish(true);
    let q, sj;
    if (!forced && session.pending && session.k >= session.pending.at) { forced = session.pending.q; session.pending = null; }
    if (!forced) { // 5もんの くみたて：できる×2 → いまの レベル → ふくしゅう → ちょっと チャレンジ（ふくしゅうは 5もんに 2もんまで）
      const SL = opt.warmup ? ['review', 'easy', 'cur', 'review', 'chal'] : SLOTS; // ひさしぶりの ときは さいしょに みじかい ふくしゅう
      const slot = opt.gate ? SL[Math.min(session.slot, 4)] : SL[session.slot % 5]; session.slot++;
      const due = dueReview(p, session.id, session.prefer).filter((it) => it.sk !== (session.q && session.q.sk)); // えらんだ きょうかの ふくしゅう だけ（おまかせは ぜんぶ）
      if (session.pre) { const id = PRE[session.pre]; session.pre = null; for (const k of Object.keys(SUBJ)) { const i = SUBJ[k].L.findIndex((s) => s.id === id); if (i >= 0) { forced = build(SUBJ[k], i, 0, false, k, p.subj[k].r); forced.slot = 'down'; forced.retry = 'もとに なる もんだいで れんしゅう'; forced.preQ = true; } } }
      if (!forced && session.down) { forced = makeQ(p, chooseSubj(p, session.prefer), 'down'); forced.slot = 'down'; session.down = false; }
      else if ((slot === 'review' || (slot === 'cur' && due.length >= 3)) && due.length) { forced = reviewQ(p, pick(due)); if (forced) forced.slot = 'review'; }
      if (!forced) { const m = slot === 'review' ? 'cur' : slot; forced = makeQ(p, chooseSubj(p, session.prefer), m === 'cur' ? null : m); forced.slot = m; }
      forced.plan = session.plan.length; session.plan.push({ slot: forced.slot, sk: forced.sk, ok: null });
    }
    q = forced; sj = q.sj;
    session.k++; session.q = q; session.tries = 0; updBar(); keyGuard = Date.now() + 350;
    const S = SUBJ[sj]; if (opt.debug) { root.dataset.ans = q.ans; root.dataset.assist = q.assist ? 1 : 0; }
    const tag = q.retry ? `🔁 ${q.retry}` : `${S.ic} ${S.n} ・ ${q.skn}${q.peek ? ' ・ ⭐ つぎの つきを ちょっとだけ' : q.chal ? ' ・ ⭐チャレンジ' : q.isNew ? '' : ' ・ ふくしゅう'}`;
    const mo = MON[q.sk]; const hard = !!(q.chal || q.peek); const mb = mo != null ? `<div class="sk-mb${hard ? ' hard' : ''}" style="--c:${S.col}">${hard ? '<b>⭐ むずかしい！</b>' : ''}<span>${MON_EMO[mo]}</span>1ねんせい <em>${mo}がつ</em>${TB_PAGE[q.sk] ? `<small>きょうかしょ ${TB_PAGE[q.sk]}ページ</small>` : ''}</div>` : sj === 'eigo' ? `<div class="sk-mb" style="--c:${S.col}"><span>🔤</span>えいご <em>レベル ${S.L.findIndex((x) => x.id === q.sk) + 1}</em></div>` : '';
    main.innerHTML = `${mb}<div class="sk-tag${q.retry ? ' re' : ''}" style="color:${S.col}">${tag}</div><div class="sk-q">${q.text}<button class="sk-say" tabindex="-1">🔊</button></div><div class="sk-viz">${q.viz || ''}</div><div class="sk-ch ${q.emoji ? 'emo' : q.txt ? 'txt' : q.bigC ? 'big' : ''}"></div>`;
    const ch = main.querySelector('.sk-ch'); if (q.sayQ && !q.sayEn) vPrefetch(q.sayQ); if (q.sayQ && q.sayEn) [false, true].forEach((sl) => { const h = enFileH(q.sayQ, sl); if (h && !VBUF.has(h)) vBuf(h).catch(() => {}); }); (q.steps || []).slice(0, 2).forEach((s) => s && !s.en && !s.mix && vPrefetch(s.s));
    if (opt.debug) window.__skQ = q; for (const c of q.choices) { const b = el('button', '', c); if (opt.debug) b.dataset.c = c; b.onclick = () => answer(b, c); ch.appendChild(b); }
    const sayQ = () => (q.sayEn ? say(q.sayQ, { en: true }) : say(q.sayQ));
    main.querySelector('.sk-say').onclick = sayQ;
    const tut = (p.tut || 0) < 3; if (tut) { const rw = root.classList.contains('sk-lrow'); const t = el('div', 'sk-tut', `<span class="rm${rw ? ' rw' : ''}"><i>${rw ? '◀' : '▲'}</i><b>●</b><i>${rw ? '▶' : '▼'}</i></span><span>${rw ? '◀▶' : '▲▼'} で えらんで<br>まんなかで こたえる</span>`); main.appendChild(t); }
    const focus0 = () => { const b0 = ch.querySelector('button'); if (b0 && document.contains(b0)) { b0.focus({ preventScroll: true }); setTimeout(() => { b0.classList.add('ready'); setTimeout(() => b0.classList.remove('ready'), 400); }, 350); } }; // えらべる ように なった しゅんかんに かるく ひかる // さいしょの こたえを えらんだ じょうたいに（リモコンで まよわない）
    if (q.assist) { ch.style.visibility = 'hidden'; const vz = main.querySelector('.sk-viz'); say('いっしょに かぞえよう').then(sayQ).then(() => countRun('.sk-d', 1)(vz, () => document.contains(vz))).then(() => { ch.style.visibility = ''; focus0(); }); }
    else { focus0(); if (q.sayEn) { clearInterval(session.rep); let nrep = 0; session.rep = setInterval(() => { if (!root.isConnected || session.q !== q) { clearInterval(session.rep); return; } if (session.lock || root.querySelector('.sk-exp,.sk-lvup2,.sk-newcard') || isSpeaking()) return; if (++nrep > 10) { clearInterval(session.rep); return; } say(q.sayQ, { en: true, slow: nrep % 2 === 0 }); }, 4000); } const sq = q.retry ? say(q.retry.replace(/（.*）/, '')).then(sayQ) : sayQ(); if (tut && !p.tutSaid) { p.tutSaid = 1; sq.then(() => say('うえと したで えらんで、まんなかの ボタンで こたえてね')); } }
  }
  async function answer(btn, c) {
    const q = session.q; if (session.lock) return; ac();
    const firstTry = session.tries === 0; if (firstTry && q.plan != null) session.plan[q.plan].ok = c === q.ans; if (firstTry) p.tut = (p.tut || 0) + 1;
    { const ok = c === q.ans; p.ev = p.ev || []; if (p.evFrom == null && !p.ev.length) p.evFrom = dayN(today()); p.devSeq = (p.devSeq || 0) + 1; const rnd = rid10(); p.devRand = (p.devRand || '') + rnd; if (p.devRand.length > 100000) { p.devRandFrom = (p.devRandFrom || 0) + (p.devRand.length - 100000) / RW_; p.devRand = p.devRand.slice(-100000); } const chk = (p.devChk = p.devChk || {}); chk[p.devSeq] = rnd; { const ks = Object.keys(chk).map(Number).sort((x, y) => x - y); const keep = new Set(ks.slice(-30)); for (const k of ks) if (!keep.has(k) && k % 5) delete chk[k]; const k5 = ks.filter((k) => k % 5 === 0); if (k5.length > 200) for (const k of k5.slice(0, k5.length - 200)) if (!keep.has(k)) delete chk[k]; }
      p.ev.push({ i: p.dev + '.' + p.devSeq + '.' + rnd, g0: gameId, t: Date.now(), d: today(), j: q.sj, s: q.sk, c: ok ? 1 : 0, f: firstTry && !q.retry ? 1 : 0, r: firstTry && q.retry && !q.fromReview ? 1 : 0, a: q.assist ? 1 : 0, g: firstTry && !q.retry && (ok || !q.chal) ? 1 : 0 }); { const e = p.ev[p.ev.length - 1]; p.ownC = p.ownC || zeroC(); evInc(p.ownC, e); (p.ownLog = p.ownLog || []).push([p.devSeq, e.d, e.j, e.s, (e.c ? 1 : 0) | (e.f ? 2 : 0) | (e.r ? 4 : 0) | (e.a ? 8 : 0) | (e.g ? 16 : 0)]); if (p.ownLog.length > 10000) p.ownLog.splice(0, p.ownLog.length - 10000); } trimEvents(p); } // こたえ 1かいずつの きろく（べつの アプリと あわせる ため）
    { p.hist = p.hist || {}; const h0 = (p.hist[today()] = p.hist[today()] || {}); h0._all = (h0._all || 0) + 1; } // こたえた かいすう（たしかめ・やりなおし こみ）
    if (firstTry && !q.retry) { p.hist = p.hist || {}; const h = (p.hist[today()] = p.hist[today()] || {}); const v = (h[q.sj] = h[q.sj] || [0, 0]); v[1]++; if (c === q.ans) v[0]++; { const lim = dayN(today()) - HIST_DAYS; for (const d of Object.keys(p.hist)) if (dayN(d) < lim) { delete p.hist[d]; if (p.days) delete p.days[d]; } } }
    if (firstTry && q.retry && !q.fromReview) { const sk = p.skill[q.sk] || (p.skill[q.sk] = { ok: 0, ng: 0 }); sk.rt = (sk.rt || 0) + 1; if (c === q.ans) sk.ro = (sk.ro || 0) + 1; } // せつめいの あとの せいかい
    if (c === q.ans) {
      let nx = null;
      if (q.fromReview) markReview(p, q.fromReview, session.id, true);
      if (q.chainSt != null && q.chainSt < 2 && !q.assist) nx = retryQ(q.base, q.chainSt + 1); // つぎの だんへ
      else if ((q.chainSt === 2 || q.recheck) && q.base) markReview(p, q.base, session.id, true); // その すぐあとに できた（「いっしょに」は かぞえない）
      if (q.assist) { const sk = p.skill[q.sk] || (p.skill[q.sk] = { ok: 0, ng: 0 }); sk.assist = (sk.assist || 0) + 1; { const h0 = ((p.hist = p.hist || {})[today()] = p.hist[today()] || {}); h0._assist = (h0._assist || 0) + 1; } if (q.plan != null) session.plan[q.plan].assist = 1; session.pre = q.sk; }
      const SELF = !!(opt.gate && opt.gate.count === 'self'); if (q.assist && SELF) session.assistRun = (session.assistRun || 0) + 1; else if (!q.assist) session.assistRun = 0;
      const slotDone = (!q.retry || q.fromReview || q.preQ || (q.base && nx == null)) && !(q.assist && SELF); // self の ときは「いっしょに」を かぞえない // 5もんに かぞえるのは ふつうの もんだい（まちがえた ときは たしかめが おわった とき）
      if (q.assist) session.assistN++; else if (q.fromReview && firstTry) session.revOk++; else if (firstTry && !q.retry) session.indep++; else session.retryOk++;
      session.lock = true; btn.classList.add('ok'); if (slotDone) { session.n++; const by = (session.by = session.by || { self: 0, retry: 0, review: 0, assist: 0 }); by[q.assist ? 'assist' : q.fromReview ? 'review' : q.retry ? 'retry' : 'self']++; } session.ok++; session.combo++; session.best = Math.max(session.best, session.combo); session.miss[q.sk] = 0;
      const first = firstTry; if (first && !q.retry) { const sk0 = p.skill[q.sk] || (p.skill[q.sk] = { ok: 0, ng: 0 }); sk0.fmts = [...new Set([...(sk0.fmts || []), q.fmt || 'a'])].slice(-6); } const lvUp = first && !q.retry ? grade(p, q, true) : null; if (first && !q.retry) { const sk = p.skill[q.sk]; sk.fmts = [...new Set([...(sk.fmts || []), q.fmt || 'a'])].slice(-6); sk.days = sk.days || []; if (!sk.days.includes(today())) sk.days = [...sk.days, today()].slice(-10); if (mastered(p, q.sk)) sk.star = 1; }
      if (FX === 'gentle') tone(660, 0.15, 'sine', 0.06); else SE.ok(session.combo);
      if (!session.fever && session.combo >= 5) { session.fever = true; root.classList.add('fever'); SE.fever(); feverFx(); say('フィーバー！'); }
      const gain = slotDone ? YEN_PER_Q : 0; // 1もん とけたら 5えん（まちがえても さいごまで やれば おなじ。フィーバーは えんしゅつ だけ）
      if (RW && gain) { session.earned += gain; earnYen(p, gain); } p.total.ok++; p.days[today()] = (p.days[today()] || 0) + 1; p.best = Math.max(p.best, session.combo);
      if (RW && gain) { p.games[gameId] = (p.games[gameId] || 0) + gain; payOut(gain); if (!REDUCE) flyCoins(btn, 5); setTimeout(coinUI, REDUCE ? 0 : 500); }
      const grow = q.fromReview ? 'まえに まちがえた もんだい、できたね！' : q.recheck || q.chainSt === 2 ? 'せつめいを みて わかったね！' : q.preQ ? 'もとに なる ところ、ばっちり！' : null; // のびた ことを ほめる
      const praise = grow ? grow : q.retry ? pick(['わかったね！', 'できた！ すごい！', 'そのとおり！']) : session.combo >= 10 ? 'すごすぎる！' : session.combo >= 5 ? 'ノリノリ！' : session.combo >= 3 ? 'いいね！' : pick(['せいかい！', 'ピンポン！', 'やったね！']);
      burst(grow ? `🌱 ${grow}` : session.combo >= 2 ? praise : `⭕ ${praise}`); comboFx(btn, session.combo);
      if (!isSpeaking()) say(praise);
      if (lvUp) lvUpFx(lvUp, q.sj);
      saveProgress(p); updBar(); if (opt.gate) call('onProgress', opt.gate.onProgress, session.n);
      if (RW && !opt.gate && p.total.ok % 10 === 0 && p.cards.length < CARDS.length) { setTimeout(() => newCard(), 900); return; }
      setTimeout(() => { session.lock = false; if (SELF && session.assistRun >= 3) offerExit(); else next(nx); }, lvUp && !REDUCE ? 3600 : session.combo >= 3 ? 1000 : 1050);
    } else {
      btn.classList.add('ng'); btn.disabled = true; SE.ng(); session.tries++; p.total.ng++; session.wrong++;
      if (session.combo >= 3) burst('ドンマイ！'); session.combo = 0; if (session.fever) { session.fever = false; root.classList.remove('fever'); } updBar();
      if (session.tries === 1 && !q.retry && !q.chal) grade(p, q, false); saveProgress(p); // チャレンジの まちがいは レベルを さげない
      session.lock = true; await wait(500); await explain(q, c);
      const miss = (session.miss[q.sk] = (session.miss[q.sk] || 0) + 1);
      session.lock = false;
      if (q.fromReview) markReview(p, q.fromReview, session.id, false); else pushReview(p, q.base || q, session.id); saveProgress(p);
      if (miss >= 2 && q.chainSt != null && !q.assist) { next(retryQ(q, q.chainSt, true)); return; } // たしかめで 2かい まちがえたら「いっしょに かぞえる」
      if (q.assist) { const sk = p.skill[q.sk] || (p.skill[q.sk] = { ok: 0, ng: 0 }); sk.assist = (sk.assist || 0) + 1; { const h0 = ((p.hist = p.hist || {})[today()] = p.hist[today()] || {}); h0._assist = (h0._assist || 0) + 1; } session.assistN++; const SELF = !!(opt.gate && opt.gate.count === 'self'); if (SELF) session.assistRun = (session.assistRun || 0) + 1; else { session.n++; (session.by = session.by || { self: 0, retry: 0, review: 0, assist: 0 }).assist++; } updBar(); if (opt.gate && !SELF) call('onProgress', opt.gate.onProgress, session.n); burst('がんばったね！'); say('むずかしかったね。いっしょに がんばったね'); session.pre = q.sk; await wait(1200); if (SELF && session.assistRun >= 3) offerExit(); else next(); return; } // いっしょに かぞえた あとは、まちがえても 1もん すすむ（おわらない ことが ないように）
      const rq = retryQ(q, q.chainSt != null ? q.chainSt : 0);
      if (miss >= 2 || !rq) { session.down = true; session.pending = null; next(); } // 2かい つづけて まちがえたら、ひとつ やさしい もんだいへ
      else if (MEM.has(q.sk)) { session.pending = { q: rq, at: session.k + 1 }; next(); } // おぼえる もの：べつの もんだいを 1つ はさんでから もういちど
      else next(rq);
    }
  }
  // せいかいの えんしゅつ（opt.fx：'sparkle' キラキラ／'pop' ポップ／'gentle' やさしい）
  const FX = REDUCE ? 'gentle' : opt.fx || 'pop';
  function burst(t) { root.querySelectorAll('.sk-burst,.sk-spark').forEach((x) => x.remove()); const b = el('div', `sk-burst fx-${FX}`, t); root.appendChild(b); setTimeout(() => b.remove(), 750); // まえの えんしゅつは けしてから（かさならない）
    if (FX === 'sparkle' && /⭕|れんぞく|🌱/.test(t)) for (let i = 0; i < 14; i++) { const s = el('div', 'sk-spark', pick(['✨', '⭐', '💫'])); s.style.left = 50 + (Math.random() - 0.5) * 70 + '%'; s.style.top = 45 + (Math.random() - 0.5) * 40 + '%'; s.style.animationDelay = i * 0.03 + 's'; root.appendChild(s); setTimeout(() => s.remove(), 1100); } }
  // れんぞく せいかい：かずが ふえるほど はでに（2＝わっか＋ほし／3＝かみふぶき／5＝フィーバー／10＝はなび＋にじ）
  function comboFx(btn, n) {
    if (REDUCE || FX === 'gentle') return; const R0 = root.getBoundingClientRect(), r = btn.getBoundingClientRect(); const cx = r.left + r.width / 2 - R0.left, cy = r.top + r.height / 2 - R0.top;
    const tier = n >= 10 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : 1; const col = ['#ffb020', '#ffb020', '#ff5aa0', '#ff5a1f', '#7a5cff'][tier];
    const ring = el('div', 'sk-ring'); ring.style.cssText = `left:${cx}px;top:${cy}px;--c:${col}`; root.appendChild(ring); setTimeout(() => ring.remove(), 700);
    const k = Math.min(26, 8 + n * 2); for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2 + Math.random() * 0.4, d = 90 + Math.random() * (60 + tier * 40); const s = el('div', 'sk-star', pick(tier >= 3 ? ['⭐', '🔥', '✨', '💥'] : ['⭐', '✨', '💖', '🌟'])); s.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;--r:${(Math.random() - 0.5) * 540}deg;font-size:${22 + Math.random() * 18}px;animation-delay:${Math.random() * 0.06}s`; root.appendChild(s); setTimeout(() => s.remove(), 1000); }
    if (n >= 2) { root.querySelectorAll('.sk-cbig').forEach((x) => x.remove()); const b = el('div', `sk-cbig t${tier}`, `<b>${n}</b><span>れんぞく！</span>`); root.appendChild(b); setTimeout(() => b.remove(), 1150); }
    if (n >= 3) confetti(tier === 4 ? 90 : tier === 3 ? 60 : 30, tier === 4);
    if (n >= 10) { [0, 260, 520].forEach((t, j) => setTimeout(() => firework(R0.width * (0.25 + j * 0.25), R0.height * (0.22 + (j % 2) * 0.12)), t)); root.classList.remove('sk-shake'); void root.offsetWidth; root.classList.add('sk-shake'); [0, 120, 240].forEach((t) => setTimeout(() => SE.fever(), t)); }
    if (n >= 3 && n % 5 === 0 && n < 10) { const f = el('div', 'sk-flash'); root.appendChild(f); setTimeout(() => f.remove(), 450); }
  }
  function confetti(m, rainbow) { const C = rainbow ? ['#ff4d6d', '#ffa62b', '#ffe14d', '#4dd67a', '#4dabf0', '#7a5cff', '#ff7ad9'] : ['#ff7aa8', '#ffb84d', '#ffe066', '#7fd8ff', '#9be89b']; for (let i = 0; i < m; i++) { const c = el('div', 'sk-conf'); c.style.cssText = `left:${Math.random() * 100}%;background:${pick(C)};--dx:${(Math.random() - 0.5) * 160}px;--r:${(Math.random() - 0.5) * 1080}deg;animation-duration:${1.3 + Math.random() * 1.1}s;animation-delay:${Math.random() * 0.35}s;width:${8 + Math.random() * 8}px;height:${12 + Math.random() * 10}px;border-radius:${Math.random() < 0.3 ? '50%' : '3px'}`; root.appendChild(c); setTimeout(() => c.remove(), 2900); } }
  function firework(x, y) { const C = ['#ff4d6d', '#ffa62b', '#ffe14d', '#4dd67a', '#4dabf0', '#b46bff']; const n = 22; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, d = 110 + Math.random() * 50; const s = el('div', 'sk-fw'); s.style.cssText = `left:${x}px;top:${y}px;background:${C[i % C.length]};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px`; root.appendChild(s); setTimeout(() => s.remove(), 1100); } tone(180, 0.25, 'triangle', 0.08, -100); }
  function feverFx() { if (REDUCE || FX === 'gentle') { burst('🔥 フィーバー！'); return; } const b = el('div', 'sk-fevban', '<span>🔥 フィーバー！ 🔥</span>'); root.appendChild(b); setTimeout(() => b.remove(), 1600); const f = el('div', 'sk-flash'); root.appendChild(f); setTimeout(() => f.remove(), 450); confetti(70, true); }
  // レベルアップ：1ねんせいの なんがつの もんだいに なったか、こよみの うえを ロケットが すすんで ひと目で わかる
  function lvUpFx(sk, sj) {
    const S = SUBJ[sj], L = S.L, i = L.indexOf(sk), prev = L[i - 1]; const m = MON[sk.id], pm = prev ? MON[prev.id] : null;
    const d = el('div', 'sk-lvup2'); let line;
    if (m != null) { const SCH = [4, 5, 6, 7, 9, 10, 11, 12, 1, 2, 3]; line = `1ねんせいの ${m}がつに レベルアップ！`;
      d.innerHTML = `<div class="card" style="--c:${S.col}"><div class="t">⭐ レベルアップ！ ⭐</div><div class="g"><span class="gr">🎒 1ねんせい</span><span class="mo">${MON_EMO[m]} ${m}<small>がつ</small></span><span class="no">の もんだいに なったよ！</span></div><div class="trk">${SCH.map((x) => `<i data-m="${x}" class="${ordM(x) < ordM(m) ? 'past' : x === m ? 'now' : ''}"><u>${MON_EMO[x]}</u>${x}</i>`).join('')}<b class="rk">🚀</b></div><div class="u">${S.ic} ${S.n}：${sk.n}</div></div>`; }
    else { const lv = i + 1; line = `えいごの レベル ${lv}に レベルアップ！`; d.innerHTML = `<div class="card" style="--c:${S.col}"><div class="t">⭐ レベルアップ！ ⭐</div><div class="g"><span class="gr">🔤 えいご</span><span class="mo">レベル ${lv}</span></div><div class="trk">${L.map((x, j) => `<i data-m="${j}" class="${j < i ? 'past' : j === i ? 'now' : ''}">${j + 1}</i>`).join('')}<b class="rk">🚀</b></div><div class="u">${sk.n}</div></div>`; }
    root.appendChild(d); SE.card(); setTimeout(() => SE.fever(), 350); if (!REDUCE) confetti(60, true);
    const rk = d.querySelector('.rk'), trk = d.querySelector('.trk'); const at = (el2) => (el2 ? el2.offsetLeft + el2.offsetWidth / 2 : 0);
    const from = m != null ? trk.querySelector(`i[data-m="${pm != null ? pm : m}"]`) : trk.querySelectorAll('i')[Math.max(0, i - 1)]; const to = trk.querySelector('i.now');
    rk.style.left = at(from) + 'px'; requestAnimationFrame(() => requestAnimationFrame(() => { rk.style.left = at(to) + 'px'; }));
    setTimeout(() => say(line), 500); setTimeout(() => d.classList.add('out'), 3100); setTimeout(() => d.remove(), 3500);
  }
  function flyCoins(from, n) { const r = from.getBoundingClientRect(), t = top.querySelector('.sk-coin').getBoundingClientRect(); for (let i = 0; i < n; i++) { const c = el('div', 'sk-fx', '<i class="sk-en">円</i>'); const x = r.left + r.width / 2 + (Math.random() - 0.5) * 60, y = r.top + (Math.random() - 0.5) * 30; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.setProperty('--tx', t.left - x + 'px'); c.style.setProperty('--ty', t.top - y + 'px'); c.style.animationDelay = i * 0.06 + 's'; root.appendChild(c); setTimeout(() => { SE.coin(); c.remove(); }, 900 + i * 60); } }
  function showTx() { hush(); const L = txList().filter((x) => x.app === gameId).slice(-15).reverse(); const pend = L.filter((x) => x.st === 'pending' && mineTx(x)).length;
    const row = (x) => { const t = new Date(x.t); return `<tr><td>${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}</td><td>+${x.n}えん</td><td>${x.st === 'done' ? '✅ ゲームに はいった' : x.st === 'pending' && !mineTx(x) ? '🔒 べつの たんまつの ぶん（ここでは いれない）' : x.st === 'pending' ? `⏳ まだ${x.err ? `<br><small>${String(x.err).replace(/</g, '&lt;')}（${x.tries || 1}かい）</small>` : ''}` : 'ー'}</td></tr>`; };
    main.innerHTML = `<div class="sk-home"><h1>🧾 おかねの きろく</h1><div class="sub">${pend ? `まだ ゲームに はいって いない おかねが ${pend}けん あるよ` : 'ぜんぶ ゲームに はいって いるよ'}</div><table class="sk-tx" style="width:min(92vw,620px);background:#fff;border-radius:14px;padding:8px;font-size:18px;font-weight:700">${L.map(row).join('') || '<tr><td>まだ ないよ</td></tr>'}</table><div class="sk-row">${pend ? '<button class="rt">🔁 もういちど いれる</button>' : ''}<button class="back">← もどる</button></div></div>`;
    if (main.querySelector('.rt')) main.querySelector('.rt').onclick = () => { retryPay(); coinUI(); setTimeout(showTx, 300); }; main.querySelector('.back').onclick = home; setTimeout(() => (main.querySelector('.rt') || main.querySelector('.back')).focus(), 50); }
  // じぶんで できる まで かぞえる せってい で「いっしょに」が 3かい つづいた とき：じょうけんは かえずに、やめかたを えらべる ように する
  function offerExit() { hush(); session.lock = true; const d = el('div', 'sk-newcard', `<h2 style="margin:0;font-size:32px">🌟 たくさん がんばったね</h2><div class="sub" style="font-size:22px;text-align:center;line-height:1.5">むずかしい もんだいが つづいたね。<br>きょうは ここまでに しても いいよ</div><div class="sk-ch quitsel eq"><button class="cont">▶ もうすこし やる</button><button class="end">🌙 きょうは ここまで</button></div>`); root.appendChild(d);
    say('たくさん がんばったね。むずかしい もんだいが つづいたね。きょうは ここまでに しても いいよ');
    d.querySelector('.cont').onclick = () => { d.remove(); session.assistRun = 0; session.down = true; session.lock = false; next(); }; // つづける：やさしめの もんだいから
    d.querySelector('.end').onclick = () => { hush(); d.remove(); p.easyNext = 1; saveProgress(p); root.remove(); const r = emit('assistedExit'); if (opt.gate.onAssistExit) call('onAssistExit', opt.gate.onAssistExit, session.n, r); else call('onQuit', opt.gate.onQuit, session.n, r); };
    setTimeout(() => d.querySelector('.cont').focus(), 50); }
  function newCard() {
    const left = CARDS.map((_, i) => i).filter((i) => !p.cards.includes(i)); const id = pick(left); p.cards.push(id); saveProgress(p); SE.card();
    const d = el('div', 'sk-newcard', `<h2 style="margin:0;font-size:30px">🃏 せかいの カード ゲット！</h2><div class="c"><b>${CARDS[id][0]}</b><p>${CARDS[id][1]}</p></div><div class="sk-row"><button>つづける ▶</button></div>`); root.appendChild(d);
    say('せかいの カード ゲット！ ' + CARDS[id][1]);
    d.querySelector('button').onclick = () => { d.remove(); session.lock = false; next(); };
  }
  // まちがえた ときの ゆっくり せつめい
  function explain(q, c) {
    hush();
    return new Promise((res) => {
      const useAlt = q.altSteps && ((session && (session.miss[q.sk] || 0) % 2 === 1) || (q.fromReview && q.fromReview.lapses >= 1)); // おなじ ところで 2かいめ・ふくしゅうで また まちがえた ときは べつの せつめい
      const slip = c != null && /^\d+$/.test(c) && Math.abs(+c - +q.ans) === 1; // 1つ ちがい＝かぞえまちがい → かぞえる ほうほう／それいがい → ひとつずつ うごかす
      const altPick = useAlt ? (q.altMove && !slip ? q.altMove : q.altSteps) : null;
      const st = ((altPick || q.steps) || [{ h: big(q.ans), s: `こたえは ${q.ans}` }]).map((s) => ({ ...s }));
      if (useAlt) st.unshift({ h: big('💡', 'emo'), s: 'こんどは べつの やりかたで かんがえて みよう' });
      const ng = ngStep(q, c); if (ng && ng.h) st.unshift(ng); else if (ng && ng.pre) st[0] = { ...st[0], s: ng.pre + st[0].s, mix: st[0].mix };
      const d = el('div', 'sk-exp', `<h3>🤔 いっしょに かんがえよう</h3>${q.sj === 'math' ? `<div class="sk-recap">${q.text}${q.viz && !/\d/.test(String(q.text).replace(/<[^>]*>/g, '')) ? `<div class="sk-rviz">${q.viz}</div>` : ''}</div>` : ''}<div class="sk-sdots">${st.map(() => '<i></i>').join('')}</div><div class="sk-stage"></div><div class="sk-cap"></div><div class="sk-btns"><button class="again">🔁 もういちど みる</button><button class="go" style="display:none"><span class="ok-ic">●</span> わかった！ つぎへ</button></div><div class="sk-keyhint" style="visibility:hidden">▲ もういちど みる ・ ● まんなかで つぎへ</div>`);
      root.appendChild(d); let tok = 0;
      const stage = d.querySelector('.sk-stage'), cap = d.querySelector('.sk-cap');
      const fit = () => { stage.style.zoom = ''; const need = () => [...d.children].reduce((a, c) => a + c.getBoundingClientRect().height, 0) + 16 * (d.children.length - 1) + 40; let z = parseFloat(getComputedStyle(stage).zoom) || 1, n = 0; while (need() > d.clientHeight && z > 0.45 && n++ < 12) { z *= 0.9; stage.style.zoom = z; } };
      // せつめいの とちゅうで 1かいだけ「じぶんで かんがえる」
      const askRun = (a) => new Promise((ok) => {
        d.classList.add('asking'); const box = el('div', 'sk-ask', a.choices.map((v) => `<button>${v}</button>`).join('')); stage.appendChild(box);
        const end = async (t) => { box.classList.add('gone'); setTimeout(() => box.remove(), 350); const hl = stage.querySelectorAll('.sk-d.hle'); hl.forEach((x, i) => { x.className = 'sk-d b mv'; x.style.setProperty('--i', i); delete x.dataset.n; }); const tf = stage.querySelector('.sk-tf'); if (hl.length && tf && !stage.querySelector('.sk-tf .sk-d.e')) tf.classList.add('full'); cap.textContent = t; await say(t); await wait(500); d.classList.remove('asking'); ok(); };
        box.querySelectorAll('button').forEach((b) => { b.onclick = async () => { if (box.dataset.done) return; box.dataset.done = 1; ac(); b.blur();
          if (b.textContent === a.ans) { b.classList.add('ok'); SE.ok(1); await end(a.ok); }
          else { b.classList.add('ng'); SE.ng(); box.querySelectorAll('button').forEach((x) => x.textContent === a.ans && x.classList.add('hint')); cap.textContent = 'いっしょに かぞえよう'; await say('いっしょに かぞえよう'); if (a.help) await a.help(stage, () => d.isConnected); await end(a.ok); } }; });
      });
      const play = async () => { const my = ++tok; const alive = () => my === tok && d.isConnected; d.querySelector('.go').style.display = 'none';
        for (let i = 0; i < st.length; i++) { if (!alive()) return; const s = st[i]; d.querySelectorAll('.sk-sdots i').forEach((x, j) => x.classList.toggle('on', j <= i)); stage.innerHTML = s.h; stage.classList.toggle('noanim', i > 0); cap.textContent = s.s; fit(); stage.querySelectorAll('img').forEach((im) => im.addEventListener('load', fit, { once: true })); SE.step();
          if (s.seq) { for (const [t, en] of s.seq) { if (!alive()) return; if (en) { for (let r = 0; r < (en === 2 ? 1 : 3); r++) { if (!alive()) return; await say(t, { en: true, slow: r > 0 }); await wait(500); } } else await say(t); } }
          else if (s.mix) { await say(s.s.replace(s.mix, '').trim()); if (!alive()) return; for (let r = 0; r < 3; r++) { if (!alive()) return; await say(s.mix, { en: true, slow: r > 0 }); await wait(500); } } else if (s.en) { const nr = s.s.length > 20 ? 1 : 3; for (let r = 0; r < nr; r++) { if (!alive()) return; await say(s.s, { en: true, slow: r > 0 || nr === 1 }); if (nr > 1) await wait(500); } } else await say(s.s, { slow: true });
          if (!alive()) return; if (s.ask) { await askRun(s.ask); if (!alive()) return; } if (s.run) await s.run(stage, alive); if (!alive()) return; await wait(s.run ? 600 : 400 + Math.min(900, s.s.length * 20)); if (opt.debug && window.__hold) await window.__hold(i); }
        if (alive()) { keyGuard = Date.now() + 350; const g = d.querySelector('.go'); g.style.display = ''; g.focus(); d.querySelector('.sk-keyhint').style.visibility = ''; if ((p.tutExp || 0) < 3) { p.tutExp = (p.tutExp || 0) + 1; say('まんなかの ボタンで つぎへ'); } clearTimeout(d.idle); d.idle = setTimeout(() => g.classList.add('pulse'), 3000); } };
      d.querySelector('.again').onclick = () => { hush(); SE.tap(); clearTimeout(d.idle); d.querySelector('.go').classList.remove('pulse'); d.querySelector('.sk-keyhint').style.visibility = 'hidden'; play(); };
      d.querySelector('.go').onclick = () => { tok++; hush(); d.remove(); SE.tap(); res(); };
      play();
    });
  }
  function finish(goal) {
    const s = session; p.lastPlan = s.plan; saveProgress(p); root.classList.remove('fever');
    if (opt.gate) { if (s.gateDone) return; s.gateDone = true;
      // 5もん クリアの ごほうび：せかいの カードを 1まい
      s.goalHit = true; let cid = null; const left = CARDS.map((_, i) => i).filter((i) => !p.cards.includes(i)); if (RW && left.length) { cid = pick(left); p.cards.push(cid); saveProgress(p); }
      const firstToday = RW && !(p.stampSaid || {})[today()]; if (firstToday) { p.stampSaid = { [today()]: 1 }; saveProgress(p); }
      main.innerHTML = `<div class="sk-sum clear"><div class="hero">🎉<br>${s.goal}もん できた！</div><div class="mini">${RW ? `💴 +${s.earned}えん` : ''}${cid != null ? `　🃏 ${CARDS[cid][0]}` : ''}${firstToday ? '　🌸' : ''}</div><div class="back">▶ ${(opt.gate && opt.gate.back) || 'どうが'}に もどるよ</div></div>`;
      SE.card(); SE.fever(); const t0 = Date.now();
      const done = () => { if (s.doneCalled) return; s.doneCalled = true; hush(); saveProgress(p); root.remove(); const r = emit('completed'); call('onDone', opt.gate.onDone, s, r); };
      say(`${s.goal}もん できた！ ${opt.gate.back || 'どうが'}に もどるよ！`).then(() => setTimeout(() => { root.classList.add('out'); setTimeout(done, 500); }, Math.max(200, 2000 - (Date.now() - t0))));
      return; }
    if (goal) s.goalHit = true;
    main.innerHTML = `<div class="sk-sum"><div>${goal ? '🎉 10もん クリア！' : 'おつかれさま！'}</div>${RW ? `<div class="big">💴 +${s.earned}えん</div>` : ''}<div>せいかい ${s.ok}もん ・ さいこう ${s.best}れんぞく</div><div style="margin-top:10px;font-size:18px">${Object.keys(SUBJ).map((k) => `${SUBJ[k].ic} レベル${Math.floor(p.subj[k].r) + 1}`).join('　')}</div></div><div class="sk-row"><button class="more">▶ もう10もん</button><button class="hm">🏠 えらぶ がめん</button><button class="cl">✕ おわる</button></div>`;
    SE.card(); say(RW ? (goal ? `10もん クリア！ ${s.earned}えん もらえたよ` : `${s.earned}えん もらえたよ`) : goal ? '10もん クリア！' : 'おつかれさま！');
    main.querySelector('.more').onclick = () => { s.goal += 10; s.lock = false; next(); };
    main.querySelector('.hm').onclick = home; main.querySelector('.cl').onclick = close;
  }
  if (RW && opt.onCoins) { retryPay(); const iv = setInterval(() => { if (!root.isConnected) return clearInterval(iv); if (txList().some((x) => mineTx(x) && x.st === 'pending')) retryPay(); }, 60000); }
  try {
  if (opt.mapOnly) { showMap(); say('なんがつの もんだいに ちょうせん する？'); }
  else if (opt.gate && opt.gate.pick === 'always') showPick(); // まいかい きょうかを えらぶ
  else if (opt.gate && opt.gate.pick !== false && p.pickSubj === undefined) showPick(); // はじめての ときだけ えらぶ（つぎからは まえの まま。かえるのは「わたしの まなび」で）
  else if (opt.gate && p.pickSubj !== undefined && opt.gate.pick !== false) showNow();
  else if (opt.gate) start(opt.prefer || null);
  else if (opt.prefer) start(opt.prefer); else home();
  } catch (e) { failSafe(e); return null; }
  return { close, api: SEKAI_API, warnings: warns, result: () => result(ended ? 'ended' : 'running') };
}

// リモコン・キーボードで えらぶ（▲▼ で うごかす、決定で こたえる。なにも えらんでいない ときの 決定は「えらぶ」だけ）
let keyGuard = 0, lastArrow = 0;
export function sekaiKey(k, ev) {
  if (!document.getElementById('sk')) return false;
  if (ev && ev.repeat && ['Enter', 'Select', ' ', 'MediaPlayPause'].includes(k)) return true; // ながおしの くりかえしは むし
  if (['Enter', 'Select', ' ', 'MediaPlayPause'].includes(k) && (Date.now() < keyGuard || document.querySelector('#sk .sk-ch[style*="hidden"]'))) return true; // あたらしい がめんが でた すぐあとの 決定は むし（れんだ たいさく）
  if (k.startsWith('Arrow') && Date.now() - lastArrow < 120) return true; lastArrow = Date.now();
  const sel = document.querySelector('#sk .sk-exp, #sk .sk-newcard') ? '#sk .sk-exp button, #sk .sk-newcard button' : '#sk .sk-ch button';
  const vis = (b) => b.offsetParent && !b.disabled && getComputedStyle(b).visibility !== 'hidden' && b.style.display !== 'none' && b.tabIndex !== -1;
  let bs = [...document.querySelectorAll(sel)].filter(vis);
  if (!bs.length) bs = [...document.querySelectorAll('#sk .sk-main button'), ...document.querySelectorAll('#sk button.sk-x')].filter(vis); // ホーム・まとめ など：がめんの ボタンを じゅんばんに
  if (!bs.length) return true;
  let i = bs.indexOf(document.activeElement);
  if (['Enter', 'Select', ' ', 'MediaPlayPause'].includes(k)) { if (i >= 0) bs[i].click(); else bs[0].focus(); return true; }
  const dir = ['ArrowRight', 'ArrowDown'].includes(k) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(k) ? -1 : 0; if (!dir) return true;
  i = i < 0 ? (dir > 0 ? 0 : bs.length - 1) : Math.max(0, Math.min(bs.length - 1, i + dir)); bs[i].focus(); SE.tap(); return true;
}

// おうちの ひと むけ：ふくしゅうの きろくと、さいごの 5もんの くみたて
function units(p, td) {
  return Object.keys(SUBJ).map((k) => { const S = SUBJ[k], r = p.subj[k].r, top = Math.floor(r);
    const cells = S.L.map((sk, i) => { const s = p.skill[sk.id] || { ok: 0, ng: 0 }; const ms = masteryOf(p, sk.id); const st = { star: '⭐', hold: '⏸️', review: '🔁', practice: i <= top ? '🔵' : '⚪', none: '⚪' }[ms]; const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '－'; return `<span style="display:inline-block;margin:2px 8px 2px 0;white-space:nowrap">${st} ${sk.n}${s.ok + s.ng ? `<small style="opacity:.65"> はじめ${pct(s.ok, s.ok + s.ng)}（${s.ok}/${s.ok + s.ng}）${s.rt ? `・せつめいご${pct(s.ro || 0, s.rt)}` : ''}${s.assist ? `・いっしょに${s.assist}かい` : ''}</small>` : ''}</span>`; }).join('');
    return `<div style="margin:4px 0 8px"><b>${S.ic} ${S.n}</b>　レベル ${top + 1}／${S.L.length}<div style="font-size:14px">${cells}</div></div>`; }).join('') + '<div style="font-size:13px;opacity:.75">⭐ できた（はじめて こたえた ときの せいかいが 3かい いじょう・2にち いじょう・さいきん10かいで 80% いじょう・さいごの 2かい せいかい・ふくしゅう なし）　⏸️ ほりゅう（⭐の あとで まちがえた。2かい つづけて せいかいで もどる）　🔁 ふくしゅう中　🔵 れんしゅう中　⚪ これから。「はじめ」＝はじめて こたえた ときの せいかい りつ、「せつめいご」＝まちがえて せつめいを みた あとの たしかめの せいかい りつ</div>';
}
// いちばん うえに：さいきん よく できている こと／いま つまずいている こと／つぎに れんしゅう すると よい こと
// せんしゅう（8〜14日まえ）と こんしゅう（7日いない）の はじめて こたえた ときの せいかい りつ
function improved(p) { const H = p.hist || {}; const t = dayN(today()); const acc = (k, lo, hi) => { let o = 0, n = 0; for (const [d, v] of Object.entries(H)) { const g = t - dayN(d); if (g >= lo && g <= hi && Array.isArray(v[k])) { o += v[k][0]; n += v[k][1]; } } return n >= 5 ? o / n : null; };
  return Object.keys(SUBJ).map((k) => [k, acc(k, 0, 6), acc(k, 7, 13)]).filter(([, a, b]) => a != null && b != null && a - b >= 0.05); }
function summary(p, nm) {
  const all = Object.keys(SUBJ).flatMap((k) => SUBJ[k].L.map((s) => s.id)); const S = (id) => p.skill[id] || {};
  const good = all.filter((id) => (S(id).h || '').slice(-3) === 'ooo').slice(-3);
  const hard = all.filter((id) => { const h = (S(id).h || '').slice(-5); return [...h].filter((c) => c === 'x').length >= 2 || (p.review || []).some((it) => it.sk === id && (it.lapses || 0) >= 1); }).slice(0, 3);
  const imp = improved(p).map(([k, a, b]) => `${SUBJ[k].ic} ${SUBJ[k].n} ${Math.round(b * 100)}% → ${Math.round(a * 100)}%`);
  const nextL = Object.keys(SUBJ).map((k) => { const i = Math.min(Math.floor(p.subj[k].r), capOf(p, k), SUBJ[k].L.length - 1); return SUBJ[k].L[i].id; });
  const box = (t, c, items, empty, f = nm) => `<div style="border-radius:12px;padding:8px 12px;margin:6px 0;background:${c}"><b>${t}</b><div>${items.length ? items.map(f).join('　') : empty}</div></div>`;
  return box('📈 せんしゅう より よく なった こと（はじめて こたえた ときの せいかい りつ）', '#f3eaff', imp, 'データが たまると でます', (x) => x) + box('😊 さいきん よく できている こと', '#e8f7ee', good, 'まだ ありません') + box('🔁 じゅうてんてきに ふくしゅう したい たんげん', '#fff1e0', hard, 'とくに ありません') + box('👉 つぎに れんしゅう すると よい こと', '#eaf2ff', [...new Set([...hard.slice(0, 1), ...nextL])].slice(0, 3), '');
}
const nextDue = (it) => { if (it.stage <= 1) return it.stage === 0 ? 'すぐ（たしかめ）' : 'つぎの 5もん'; if (it.stage === 2) return 'あした いこう'; const d = dayN(it.day) + (it.stage >= 4 ? 7 : 3); const dt = new Date(d * 864e5); return `${dt.getMonth() + 1}/${dt.getDate()} いこう`; };
const trend = (it) => { const l = (it.log || []).slice(-4).join(''); return (['いまは できた', 'もういちど できた', 'おぼえかけ', 'いまのところ できている'][it.stage - 1] || (l.endsWith('ox') ? 'また まちがえた' : 'これから')) + (it.lapses ? `（${it.lapses}かい わすれた→べつの せつめい）` : ''); };
export function sekaiReport() {
  const p = loadProgress(); const nm = (id) => { for (const k of Object.keys(SUBJ)) { const s = SUBJ[k].L.find((x) => x.id === id); if (s) return `${SUBJ[k].ic} ${s.n}`; } return id; };
  const cut = (t) => { t = String(t).replace(/<[^>]+>/g, ''); return t.length > 14 ? t.slice(0, 14) + '…' : t; };
  const td = 'padding:6px 8px;border-bottom:1px solid #0002';
  const rows = (p.review || []).map((it) => `<tr><td style="${td}">${nm(it.sk)}</td><td style="${td}">${cut(it.ans)}</td><td style="${td};text-align:center">${it.miss}</td><td style="${td};text-align:center">${it.stage >= 1 ? '⭕' : '－'}</td><td style="${td};text-align:center">${it.stage >= 2 ? '⭕' : '－'}</td><td style="${td};text-align:center">${it.stage >= 3 ? '⭕' : '－'}</td><td style="${td};text-align:center">${it.stage >= 4 ? '⭕' : '－'}</td><td style="${td}">${trend(it)}</td><td style="${td}">${nextDue(it)}</td></tr>`).join('') + (p.mastered || []).slice(-5).reverse().map((it) => `<tr style="opacity:.75"><td style="${td}">${nm(it.sk)}</td><td style="${td}">${cut(it.ans)}</td><td style="${td};text-align:center">－</td><td style="${td};text-align:center">⭕</td><td style="${td};text-align:center">⭕</td><td style="${td};text-align:center">⭕</td><td style="${td};text-align:center">⭕</td><td style="${td}">ていちゃく</td><td style="${td}">－</td></tr>`).join('');
  const plan = (p.lastPlan || []).map((x, i) => `<li>${i + 1}. ${SLOTN[x.slot] || x.slot}：${nm(x.sk)} ${x.ok == null ? '' : x.ok ? '⭕' : x.assist ? '❌→せつめい→いっしょに できた（せいかいに かぞえない）' : '❌→せつめい→たしかめ'}</li>`).join('');
  const pend = (p.txOut || []).filter((x) => x.st === 'pending'); const hl = (p.hostLog || []).slice(-3);
  const sys = pend.length || hl.length ? `<div style="background:#ffecec;border-radius:8px;padding:6px 10px;margin-bottom:8px;font-size:14px">${pend.length ? `ゲームへのおかね反映待ち ${pend.length}件（次に開いたとき自動で再送・二重には入りません）<br>` : ''}${hl.map((x) => `${new Date(x.t).getMonth() + 1}/${new Date(x.t).getDate()} ${x.app}：${x.at} でエラー（学習は継続）`).join('<br>')}</div>` : '';
  const heldBox = (p.held || []).length ? `<div style="background:#fff4d6;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:15px;line-height:1.6"><b>保留中の記録 ${p.held.length}件（合計 ${p.held.reduce((a, h) => a + (h.n || 0), 0)}問・まだ数えていません）</b><br>理由：別の端末で分かれた後の回答が、この端末では数えられませんでした（推測では足しません）。<br>解消：その端末で、この端末の「まなびコード」を読みこんで「まとめる」→ その端末のコードをこの端末で読みこむ。<br>その端末が使えない場合：管理画面の「保留を取り消す」で、その分は数えずに続けます（学習はそのまま続けられます）。</div>` : '';
  const note = p.mergeNote ? `<div style="background:#fff4d6;border-radius:8px;padding:6px 10px;margin-bottom:8px;font-size:14px">${p.mergeNote} に 古い形式の記録を合わせました。それより前の日の回数は、2つのアプリの合計ではなく多い方になっています（少なめに出ることがあります）。</div>` : '';
  return `<div style="font-size:16px;line-height:1.5">${sys}${heldBox}${note}${summary(p, nm)}<h4 style="margin:6px 0">ふくしゅうの きろく</h4><table style="border-collapse:collapse;width:100%"><tr style="font-weight:bold"><td style="${td}">ないよう</td><td style="${td}">もんだい</td><td style="${td}">まちがい</td><td style="${td}">いま</td><td style="${td}">つぎの回</td><td style="${td}">つぎの日</td><td style="${td}">3日ご</td><td style="${td}">ようす</td><td style="${td}">つぎに でる</td></tr>${rows || `<tr><td style="${td}" colspan="10">まだ ありません</td></tr>`}</table>
  <h4 style="margin:14px 0 6px">たんげんの ようす（小1・11月ごろ）</h4>${units(p, td)}
  <h4 style="margin:14px 0 6px">さいごの 5もんの くみたて</h4><ul style="margin:0;padding-left:4px;list-style:none">${plan || '<li>まだ ありません</li>'}</ul></div>`;
}

// わたしの まなび（つきを えらぶ がめん）だけを ひらく
export function openSekaiMap(opt = {}) { return openSekai({ ...opt, mapOnly: true }); }

export const __test = { cOf, cSum, cMax, gcOwn, gcBuckets, evInc, countsOf, trimEvents, checkOpts, mergeProgress, SUBJ, ngStep, retryQ, variant, ED, KANJI, KS, MON, ordM, objectify, capOf, grade, makeQ, masteryOf, markReview, pushReview, decorate };

// おとなの せってい むけ：がくねん・つき・きょうか を よむ／かく、1しゅうかんの まとめ
export function sekaiPrefs(v) { const p = loadProgress(); if (v) { if (v.m) p.goal = { g: 1, m: +v.m }; if (v.subj !== undefined) p.pickSubj = v.subj; saveProgress(p); } return { m: goalOf(p).m, subj: p.pickSubj === undefined ? '' : p.pickSubj }; }
export function sekaiWeek() { const p = loadProgress(); const H = p.hist || {}; const t = dayN(today()); const out = {}; let q = 0;
  let all = 0, assist = 0; for (const [d, v] of Object.entries(H)) { if (t - dayN(d) > 6) continue; all += v._all || 0; assist += v._assist || 0; for (const [k, x] of Object.entries(v)) { if (!Array.isArray(x)) continue; const [o, n] = x; out[k] = out[k] || [0, 0]; out[k][0] += o; out[k][1] += n; q += n; } }
  const rv = p.review || []; const firstOk = Object.values(out).reduce((a, x) => a + x[0], 0); return { q, firstOk, all, assist, acc: out, reviewOpen: rv.filter((x) => x.stage < 3).length, reviewDone: rv.filter((x) => x.stage >= 3).length + (p.mastered || []).length, cards: p.cards.length }; }
