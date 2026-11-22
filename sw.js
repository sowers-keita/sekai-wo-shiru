// おこづかいクエスト（旧 せかいを しる）：オフラインでも うごくように（え・こえは つかった ものから ためておく）
const V = 'sekai-v7';
const CORE = ['./', './index.html', './sekai.js', './manifest.webmanifest', './icon-192.png', './ill/okz_pouch.webp', './ill/okz_c_gold.webp', './ill/okz_c_pink.webp', './ill/okz_c_mint.webp', './ill/okz_c_bag.webp', './ill/okz_bg.webp', './sfx/coin.mp3', './sfx/suck.mp3', './sfx/pop.mp3', './sfx/drop.mp3', './sfx/fanfare.mp3', './voice/index.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k.startsWith('sekai-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const media = /\/(ill|voice)\//.test(u.pathname) && !u.pathname.endsWith('index.json');
  if (media) { e.respondWith(caches.open(V).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }))); return; }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) caches.open(V).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request))); });
