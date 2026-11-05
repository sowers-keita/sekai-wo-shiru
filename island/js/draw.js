// おえかき機（ズームしてどこまでも細かく描ける）
const PALETTE = ['#000000', '#3a3a3a', '#7a7a7a', '#bdbdbd', '#ffffff', '#5a3a24', '#8a5a34', '#c8955a', '#f5d0a8', '#ffe6d5',
  '#c8322e', '#ff5a5a', '#ff9aa8', '#ee8a24', '#ffc070', '#f5cf30', '#fff08a', '#86c63a', '#4a7f2c', '#a8e8a0',
  '#2aa6a0', '#4fb6e3', '#a8dcf8', '#3352b8', '#22305e', '#7f3ca8', '#b8a6e6', '#c04bb4', '#f08cb2', '#ffd8e8'];

let el = null;
function ui() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'draw'; el.className = 'overlay draw';
  el.innerHTML = `
  <div class="dw-top"><button class="dw-x big">✕</button><b class="dw-title"></b><span class="sp"></span>
    <button data-a="undo" class="ic">↶</button><button data-a="redo" class="ic">↷</button>
    <button data-a="zo" class="ic">－</button><span class="dw-zoom">100%</span><button data-a="zi" class="ic">＋</button><button data-a="fit" class="ic">⤢</button>
    <button data-a="mirror" class="ic tg" title="さゆうおなじ">⇋</button><button data-a="grid" class="ic tg" title="ます">▦</button>
    <button class="dw-ok big ok">できた！</button></div>
  <div class="dw-mid"><div class="dw-tools">
    <button data-t="pen" class="on">✏️<i>ペン</i></button><button data-t="dot">▪️<i>ドット</i></button><button data-t="brush">🖌️<i>ふで</i></button>
    <button data-t="eraser">🧽<i>けす</i></button><button data-t="fill">🪣<i>ぬる</i></button><button data-t="pick">💧<i>いろとり</i></button><button data-t="hand">✋<i>うごかす</i></button>
    <div class="dw-size"><input type="range" min="1" max="80" value="6"><span>6</span></div><div class="dw-cur"></div>
  </div><div class="dw-view"><canvas></canvas><div class="dw-prev"></div></div></div>
  <div class="dw-pal"></div>`;
  document.body.appendChild(el);
  const pal = el.querySelector('.dw-pal');
  for (const c of PALETTE) { const b = document.createElement('button'); b.style.background = c; b.dataset.c = c; pal.appendChild(b); }
  const ci = document.createElement('input'); ci.type = 'color'; ci.className = 'dw-cpick'; pal.appendChild(ci);
  return el;
}

export function openDraw(opt) {
  return new Promise((resolve) => {
    const E = ui(); E.classList.add('show');
    const S = opt.size || 1024, layer = opt.layer, lg = layer.getContext('2d', { willReadFrequently: true });
    const backup = lg.getImageData(0, 0, S, S);
    E.querySelector('.dw-title').textContent = opt.title || 'おえかき';
    const view = E.querySelector('.dw-view'), cv = view.querySelector('canvas'), g = cv.getContext('2d');
    const prevBox = E.querySelector('.dw-prev'); prevBox.innerHTML = ''; if (opt.previewEl) prevBox.appendChild(opt.previewEl);
    const st = { tool: 'pen', size: 6, color: opt.color || '#000000', mirror: !!opt.mirror, grid: false, s: 1, ox: 0, oy: 0, undo: [], redo: [] };
    let under = null; const refreshUnder = () => { if (!opt.under) return; under = under || document.createElement('canvas'); under.width = under.height = S; const ug = under.getContext('2d'); ug.clearRect(0, 0, S, S); opt.under(ug, S); };
    refreshUnder();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { const r = view.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; };
    const fit = () => { const r = view.getBoundingClientRect(); st.s = Math.min(r.width, r.height) * 0.94 / S; st.ox = (r.width - S * st.s) / 2; st.oy = (r.height - S * st.s) / 2; dirty = true; };
    let dirty = true;
    const setTool = (t) => { st.tool = t; E.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); };
    const setColor = (c) => { st.color = c; E.querySelector('.dw-cur').style.background = c; E.querySelectorAll('.dw-pal button').forEach((b) => b.classList.toggle('on', b.dataset.c === c)); if (st.tool === 'eraser' || st.tool === 'pick' || st.tool === 'hand') setTool('pen'); };
    setColor(st.color); setTool('pen');
    const sizeIn = E.querySelector('.dw-size input'), sizeSp = E.querySelector('.dw-size span');
    sizeIn.value = st.size; sizeIn.oninput = () => { st.size = +sizeIn.value; sizeSp.textContent = st.size; };
    E.querySelector('[data-a=mirror]').classList.toggle('on', st.mirror);
    const toTex = (cx, cy) => [(cx - st.ox) / st.s, (cy - st.oy) / st.s];
    const zoomAt = (f, cx, cy) => { const ns = Math.min(40, Math.max(0.15, st.s * f)); const [tx, ty] = toTex(cx, cy); st.s = ns; st.ox = cx - tx * ns; st.oy = cy - ty * ns; dirty = true; };
    const snap = () => { st.undo.push(lg.getImageData(0, 0, S, S)); if (st.undo.length > 14) st.undo.shift(); st.redo = []; };
    const strokeTo = (a, b, pr = 1) => {
      const sz = Math.max(0.6, st.size * (st.tool === 'brush' ? pr : 1));
      const doLine = (p, q) => {
        if (st.tool === 'dot') { const n = Math.max(1, Math.round(sz / 2)); const steps = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])) + 1; for (let i = 0; i <= steps; i++) { const x = Math.floor(p[0] + (q[0] - p[0]) * i / steps), y = Math.floor(p[1] + (q[1] - p[1]) * i / steps); if (st.eraseDot) lg.clearRect(x - (n >> 1), y - (n >> 1), n, n); else { lg.fillStyle = st.color; lg.fillRect(x - (n >> 1), y - (n >> 1), n, n); } } return; }
        lg.save(); lg.globalCompositeOperation = st.tool === 'eraser' ? 'destination-out' : 'source-over';
        lg.strokeStyle = st.color; lg.lineWidth = sz; lg.lineCap = 'round'; lg.lineJoin = 'round'; if (st.tool === 'brush') lg.globalAlpha = 0.55;
        lg.beginPath(); lg.moveTo(p[0], p[1]); lg.lineTo(q[0], q[1]); lg.stroke(); lg.restore();
      };
      doLine(a, b); if (st.mirror) doLine([S - a[0], a[1]], [S - b[0], b[1]]);
      dirty = true;
    };
    const flood = (tx, ty) => {
      tx = Math.floor(tx); ty = Math.floor(ty); if (tx < 0 || ty < 0 || tx >= S || ty >= S) return;
      const comp = document.createElement('canvas'); comp.width = comp.height = S; const cg = comp.getContext('2d'); if (under) cg.drawImage(under, 0, 0); cg.drawImage(layer, 0, 0);
      const cd = cg.getImageData(0, 0, S, S).data, ld = lg.getImageData(0, 0, S, S); const L = ld.data;
      const i0 = (ty * S + tx) * 4, r0 = cd[i0], g0 = cd[i0 + 1], b0 = cd[i0 + 2], a0 = cd[i0 + 3];
      const c = [parseInt(st.color.slice(1, 3), 16), parseInt(st.color.slice(3, 5), 16), parseInt(st.color.slice(5, 7), 16)];
      const seen = new Uint8Array(S * S), q = [ty * S + tx]; const tol = 40;
      const same = (k) => { const i = k * 4; return Math.abs(cd[i] - r0) + Math.abs(cd[i + 1] - g0) + Math.abs(cd[i + 2] - b0) + Math.abs(cd[i + 3] - a0) < tol; };
      let n = 0;
      while (q.length && n < S * S) { const k = q.pop(); if (seen[k]) continue; seen[k] = 1; if (!same(k)) continue; n++; const i = k * 4; L[i] = c[0]; L[i + 1] = c[1]; L[i + 2] = c[2]; L[i + 3] = 255; const x = k % S, y = (k / S) | 0; if (x > 0) q.push(k - 1); if (x < S - 1) q.push(k + 1); if (y > 0) q.push(k - S); if (y < S - 1) q.push(k + S); }
      lg.putImageData(ld, 0, 0); dirty = true;
    };
    const pick = (tx, ty) => { const comp = document.createElement('canvas'); comp.width = comp.height = 1; const cg = comp.getContext('2d'); if (under) cg.drawImage(under, -Math.floor(tx), -Math.floor(ty)); cg.drawImage(layer, -Math.floor(tx), -Math.floor(ty)); const d = cg.getImageData(0, 0, 1, 1).data; setColor('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')); };
    // 入力
    const ptrs = new Map(); let drawing = false, last = null, pinch = null, panning = null, strokeChanged = false;
    const rel = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = (e) => {
      cv.setPointerCapture(e.pointerId); const p = rel(e); ptrs.set(e.pointerId, p);
      if (ptrs.size === 2) { if (drawing && strokeChanged) { const u = st.undo.pop(); if (u) lg.putImageData(u, 0, 0); } drawing = false; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; return; }
      if (st.tool === 'hand' || e.button === 1 || e.button === 2) { panning = p; return; }
      const t = toTex(...p);
      if (st.tool === 'fill') { snap(); flood(...t); done1(); return; }
      if (st.tool === 'pick') { pick(...t); return; }
      snap(); drawing = true; strokeChanged = true; last = t; st.eraseDot = false; strokeTo(t, t, e.pressure || 0.5);
    };
    cv.onpointermove = (e) => {
      if (!ptrs.has(e.pointerId)) return; const p = rel(e); ptrs.set(e.pointerId, p);
      if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; st.ox += m[0] - pinch.m[0]; st.oy += m[1] - pinch.m[1]; zoomAt(d / pinch.d, m[0], m[1]); pinch = { d, m }; return; }
      if (panning) { st.ox += p[0] - panning[0]; st.oy += p[1] - panning[1]; panning = p; dirty = true; return; }
      if (!drawing) return; const t = toTex(...p);
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) { const q = toTex(...rel(ev)); strokeTo(last, q, ev.pressure || 0.5); last = q; }
      last = t;
    };
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) panning = null; if (drawing && !ptrs.size) { drawing = false; done1(); } };
    cv.onpointerup = up; cv.onpointercancel = up; cv.oncontextmenu = (e) => e.preventDefault();
    cv.onwheel = (e) => { e.preventDefault(); const p = rel(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, ...p); };
    const done1 = () => { opt.onStroke && opt.onStroke(layer); };
    E.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
    E.querySelectorAll('.dw-pal button').forEach((b) => (b.onclick = () => setColor(b.dataset.c)));
    E.querySelector('.dw-cpick').oninput = (e) => setColor(e.target.value);
    E.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const r = view.getBoundingClientRect(), a = b.dataset.a;
      if (a === 'undo' && st.undo.length) { st.redo.push(lg.getImageData(0, 0, S, S)); lg.putImageData(st.undo.pop(), 0, 0); dirty = true; done1(); }
      if (a === 'redo' && st.redo.length) { st.undo.push(lg.getImageData(0, 0, S, S)); lg.putImageData(st.redo.pop(), 0, 0); dirty = true; done1(); }
      if (a === 'zi') zoomAt(2, r.width / 2, r.height / 2); if (a === 'zo') zoomAt(0.5, r.width / 2, r.height / 2); if (a === 'fit') fit();
      if (a === 'mirror') { st.mirror = !st.mirror; b.classList.toggle('on', st.mirror); }
      if (a === 'grid') { st.grid = !st.grid; b.classList.toggle('on', st.grid); dirty = true; }
    }));
    const keyH = (e) => { if (e.key === 'z' && (e.ctrlKey || e.metaKey)) E.querySelector('[data-a=undo]').click(); };
    window.addEventListener('keydown', keyH);
    // 描画ループ
    let alive = true;
    const chk = document.createElement('canvas'); chk.width = chk.height = 16; { const c = chk.getContext('2d'); c.fillStyle = '#eee'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, 8, 8); c.fillRect(8, 8, 8, 8); }
    const pat = g.createPattern(chk, 'repeat');
    const loop = () => {
      if (!alive) return; requestAnimationFrame(loop);
      if (!dirty) return; dirty = false;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#2b2d3a'; g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(dpr * st.s, 0, 0, dpr * st.s, dpr * st.ox, dpr * st.oy);
      g.imageSmoothingEnabled = st.s < 3;
      g.fillStyle = pat; g.fillRect(0, 0, S, S);
      if (under) g.drawImage(under, 0, 0);
      g.drawImage(layer, 0, 0);
      if (opt.guide) opt.guide(g, S);
      if (st.grid || st.s >= 10) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1 / st.s; const step = st.s >= 10 ? 1 : st.s >= 2.5 ? 8 : 32; const r = view.getBoundingClientRect(); const [x0, y0] = toTex(0, 0), [x1, y1] = toTex(r.width, r.height); g.beginPath(); for (let x = Math.max(0, Math.floor(x0 / step) * step); x <= Math.min(S, x1); x += step) { g.moveTo(x, Math.max(0, y0)); g.lineTo(x, Math.min(S, y1)); } for (let y = Math.max(0, Math.floor(y0 / step) * step); y <= Math.min(S, y1); y += step) { g.moveTo(Math.max(0, x0), y); g.lineTo(Math.min(S, x1), y); } g.stroke(); }
      if (st.mirror) { g.strokeStyle = 'rgba(80,140,255,0.35)'; g.lineWidth = 2 / st.s; g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke(); }
      E.querySelector('.dw-zoom').textContent = Math.round(st.s * 100 * (S / 1024) * 1.6) + '%';
    };
    requestAnimationFrame(() => { resize(); fit(); loop(); });
    const onRes = () => { resize(); dirty = true; }; window.addEventListener('resize', onRes);
    const close = (ok) => { alive = false; E.classList.remove('show'); window.removeEventListener('resize', onRes); window.removeEventListener('keydown', keyH); if (!ok) lg.putImageData(backup, 0, 0); resolve(ok); };
    E.querySelector('.dw-ok').onclick = () => close(true);
    E.querySelector('.dw-x').onclick = () => close(false);
    st.refreshUnder = () => { refreshUnder(); dirty = true; };
  });
}
