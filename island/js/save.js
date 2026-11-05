// IndexedDB に保存
const DB = 'nakayoshi-island', ST = 'save';
function open() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
const valid = (d) => !!(d && d.v && d.world && Array.isArray(d.residents) && typeof d.time === 'number');
let lastBak = 0;
export async function saveGame(data) { try { if (!valid(data)) return false; const db = await open(); const get = (k) => new Promise((res) => { const r = db.transaction(ST, 'readonly').objectStore(ST).get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  const rot = Date.now() - lastBak > 10 * 60 * 1000; let b1 = null, cur = null; if (rot) { cur = await get('main'); b1 = await get('bak1'); }
  await new Promise((res, rej) => { const tx = db.transaction(ST, 'readwrite'); const s = tx.objectStore(ST); if (rot && valid(cur)) { if (valid(b1)) s.put(b1, 'bak2'); s.put(cur, 'bak1'); } s.put(data, 'main'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); if (rot) lastBak = Date.now(); return true; } catch (e) { console.warn('save', e); return false; } }
export async function loadGame() { try { const db = await open(); const get = (k) => new Promise((res) => { const r = db.transaction(ST, 'readonly').objectStore(ST).get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); for (const k of ['main', 'bak1', 'bak2']) { const d = await get(k); if (valid(d)) { if (k !== 'main') d._restored = k; return d; } } return null; } catch (e) { return null; } }
export async function clearGame() { try { const db = await open(); await new Promise((res) => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).delete('main'); tx.oncomplete = res; }); } catch (e) {} }
