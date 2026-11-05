// こうかおん（WebAudioで合成）
let ctx = null, on = true; const VOL = { se: 1, voice: 1, bgm: 0.6 }; let cur = 'se'; let bgmT = null, bgmK = null, bgmI = 0;
const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
function tone(f, d = 0.1, type = 'sine', v = 0.12, slide = 0, delay = 0) {
  const c = ac(); if (!c || !on) return; const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  v *= VOL[cur] ?? 1; if (v <= 0.0005) return; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
function noise(d = 0.08, v = 0.1, hp = 800) { const c = ac(); if (!c || !on) return; const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length); const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = c.createGain(); g.gain.value = v * (VOL[cur] ?? 1); s.connect(f); f.connect(g); g.connect(c.destination); s.start(); }
export const SFX = {
  set on(v) { on = v; }, get on() { return on; }, unlock: ac, vol: VOL,
  pon() { tone(520, 0.09, 'sine', 0.16, 420); tone(1040, 0.05, 'sine', 0.05, 0, 0.03); },
  melody() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 0, i * 0.13)); },
  hit() { noise(0.25, 0.12, 900); tone(880, 0.12, 'square', 0.05, 400); tone(1320, 0.18, 'sine', 0.08, 0, 0.1); },
  splash() { noise(0.35, 0.1, 400); },
  clap() { for (let i = 0; i < 6; i++) setTimeout(() => noise(0.05, 0.09, 1500), i * 110 + Math.random() * 40); },
  bgm(kind) { if (bgmK === kind) return; bgmK = kind; if (bgmT) { clearInterval(bgmT); bgmT = null; } if (!kind) return;
    const S = kind === 'night' ? [[392, 330, 294, 262, 294, 330, 392, 0], [330, 294, 262, 196, 262, 294, 330, 0]] : [[523, 587, 659, 784, 659, 587, 523, 0], [440, 523, 587, 659, 587, 523, 440, 0]];
    bgmT = setInterval(() => { if (!on || !VOL.bgm) return; cur = 'bgm'; try { const ph = S[Math.floor(bgmI / 8) % S.length], f = ph[bgmI % 8]; if (f) { tone(f, kind === 'night' ? 1.1 : 0.5, 'sine', 0.035, 0); if (bgmI % 4 === 0) tone(f / 2, 1.4, 'triangle', 0.02, 0); } } finally { cur = 'se'; } bgmI++; }, kind === 'night' ? 820 : 520); },
  rare() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.09, 0, i * 0.11)); [262, 392].forEach((f, i) => tone(f, 0.9, 'sine', 0.06, 0, 0.4 + i * 0.2)); },
  sticker() { [1318, 1568, 2093].forEach((f, i) => tone(f, 0.14, 'sine', 0.07, 0, i * 0.07)); },
  place() { tone(220, 0.08, 'triangle', 0.15, -60); noise(0.05, 0.05, 2000); },
  dig() { noise(0.12, 0.14, 600); tone(140, 0.08, 'square', 0.04, -40); },
  pop() { tone(660, 0.08, 'sine', 0.12, 300); },
  ok() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.09)); },
  ng() { tone(300, 0.2, 'sawtooth', 0.06, -120); },
  level() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.06, 0, i * 0.08)); },
  door() { tone(180, 0.12, 'triangle', 0.08, 40); },
  babble(p, n, v = 1, kind = '', text = '', uid = 0) { cur = 'voice'; try {
    const base = ([520, 300, 420, 380, 560, 480, 340][p] || 400) * v * (kind === 'sad' ? 0.85 : kind === 'surprise' ? 1.25 : 1); const type = ['sine', 'triangle', 'sine'][uid % 3];
    if (/あはは|ふふ|えへへ|うふふ|わはは|きゃはは|にしし/.test(text)) { for (let i = 0; i < 4; i++) tone(base * (1.15 - i * 0.05), 0.09, type, 0.06, -base * 0.2, i * 0.13); return; }
    const k = Math.min(8, n); for (let i = 0; i < k; i++) { const c = kind === 'joy' ? i * 30 : kind === 'sad' ? -i * 22 : kind === 'surprise' ? (i === 0 ? 260 : 0) : kind === 'angry' ? (i % 2) * 60 : /？$/.test(text) && i === k - 1 ? 160 : 0; tone(base + c + Math.random() * 110, 0.06, kind === 'angry' ? 'square' : type, kind === 'angry' ? 0.03 : 0.045, 0, i * 0.075); }
  } finally { cur = 'se'; } },
  bird() { const f = 2200 + Math.random() * 800; for (let i = 0; i < 3; i++) tone(f + i * 120, 0.07, 'sine', 0.03, 600, i * 0.11); },
  wave() { noise(1.2, 0.025, 300); },
  cricket() { for (let i = 0; i < 4; i++) tone(4200, 0.03, 'square', 0.008, 0, i * 0.06); },
  firework() { noise(0.4, 0.12, 200); tone(900, 0.5, 'sine', 0.04, -700); },
};
