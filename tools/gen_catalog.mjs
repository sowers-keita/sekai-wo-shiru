// もんだいカタログを いまの sekai.js から つくりなおす（レビュー用）。つかいかた：node tools/gen_catalog.mjs <コミット>
// 2026-11-20 アストラ レビュー：カタログに 生成元コミット・日付・月（いまの つきか さきか）・ぐたいてきな かずの れいを 1つ いれる
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
globalThis.window = globalThis; globalThis.localStorage = { getItem() { return null; }, setItem() {} }; globalThis.document = { getElementById() { return null; } };
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.join(here, '..');
const m = await import(path.join(root, 'sekai.js'));
const { SUBJ, MON } = m.__test; const commit = process.argv[2] || '（ふめい）'; const day = new Date().toISOString().slice(0, 10);
const strip = (t) => String(t ?? '').replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const nz = (t) => t.replace(/\d+/g, 'N');
const out = []; const all = Object.entries(SUBJ).flatMap(([k, S]) => S.L.map((sk, i) => [k, sk, i]));
for (const [k, sk] of all) { const seen = new Map(); let ex = null;
  for (let i = 0; i < 400; i++) { let q; try { q = sk.q([0, 0.35, 0.7, 1][i % 4]); } catch (e) { continue; } const steps = (q.steps || []).map((s) => strip(s.s)).join(' ▶ ');
    const line = `- 【問】${strip(q.text)} 【選】${(q.choices || []).map(strip).join(' / ')} 【答】${strip(q.ans)}${q.viz && /sk-ill|sk-d|sk-objs/.test(q.viz) ? ' 【図】あり' : ''}${q.sayEn ? ' 【音】えいご' : ''}\n  【説明】${steps}`;
    const key = nz(line); if (!seen.has(key)) seen.set(key, line); if (!ex && /\d/.test(line)) ex = line; }
  const mo = MON[sk.id]; out.push({ k, txt: `## [${k}] ${sk.id}  ${sk.n}${mo ? `（${mo}がつ）` : ''}  (${seen.size})\n` + [...seen.keys()].slice(0, 30).join('\n') + (ex ? `\n  ＜れい＞\n${ex.replace(/^- /, '  ')}` : '') });
}
const head = `# せかいを しる もんだいカタログ（生成元コミット ${commit}・${day}）\n# かずは N に おきかえ。各たんげんの さいごに ぐたいてきな れいを 1つ。（○がつ）は きょうかしょの めやす\n`;
const per = Math.ceil(out.length / 4); for (let f = 0; f < 4; f++) fs.writeFileSync(path.join(root, 'review', `mondai_${f + 1}.txt`), head + out.slice(f * per, (f + 1) * per).map((x) => x.txt).join('\n') + '\n');
console.log('skills', out.length);
