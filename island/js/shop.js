// おみせ：きほんの ブロックは むりょう。ほかは コインで かう（いちど かえば ずっと つかえる）
import { B, CATS, RECOMMEND } from './blocks.js';
import { HOUSES } from './world.js';

const CAT_PRICE = { nature: 4, wood: 6, stone: 6, color: 5, glass: 6, roof: 10, door: 8, furn: 12, kfurn: 15, light: 8, plant: 4, fence: 5 };
const FREE_PER_CAT = 3;
let FREE = null, FAMN = null;
function init() {
  if (FREE) return; FREE = new Set(); FAMN = {};
  for (const d of B) if (d.id) FAMN[d.fam] = (FAMN[d.fam] || 0) + 1;
  for (const n of RECOMMEND) { const d = B.find((x) => x.name === n); if (d) FREE.add(d.fam); }
  for (const c of CATS) { if (c.id === 'house') continue; const seen = []; for (const d of B) { if (!d.id || d.cat !== c.id || d.secret || seen.includes(d.fam)) continue; seen.push(d.fam); if (seen.length > FREE_PER_CAT) break; FREE.add(d.fam); } }
}
export const FREE_HOUSES = ['yofu', 'tofu'];
export function freeCount() { init(); return FREE.size; }
export function owned(G, d) { init(); if (!d || !d.id) return true; if (G.allOwned) return true; return FREE.has(d.fam) || !!(G.owned && G.owned[d.fam]) || !!d.secret; }
export function houseOwned(G, key) { return G.allOwned || FREE_HOUSES.includes(key) || !!(G.owned && G.owned['h:' + key]); }
export function price(d) { init(); const n = FAMN[d.fam] || 1; return 5 * ((CAT_PRICE[d.cat] || 6) + Math.min(14, Math.round((n - 1) * 0.7))); }
export function housePrice(key) { const i = HOUSES.findIndex((h) => h.key === key); return 5 * (30 + (i % 4) * 10); }
export function buy(G, fam, cost) { if ((G.money || 0) < cost) return false; G.money -= cost; G.owned = G.owned || {}; G.owned[fam] = 1; return true; }
// おみせの たな：まだ もっていない ものを カテゴリごとに（1しゅるい 1こ）
export function shelf(G, cat) {
  init();
  if (cat === 'house') return HOUSES.filter((h) => !houseOwned(G, h.key)).map((h) => ({ house: h, fam: 'h:' + h.key, cost: housePrice(h.key) }));
  const seen = new Set(), out = [];
  for (const d of B) { if (!d.id || d.cat !== cat || d.secret || seen.has(d.fam)) continue; seen.add(d.fam); if (owned(G, d)) continue; out.push({ d, fam: d.fam, n: FAMN[d.fam] || 1, cost: price(d) }); }
  return out.sort((a, b) => a.cost - b.cost);
}
// おねがいの ごほうび（むずかしさで かわる）
export const REWARD = { food: 3, gift: 5, quiz: 6, friend: 8, consult: 10, episode: 12, house: 15, dream: 20 };
