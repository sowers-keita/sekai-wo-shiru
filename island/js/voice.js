// こえの ほん：VOICEVOX（ずんだもん）で つくった こえを ならす。ない ことばは ブラウザの よみあげ
let VB = null, vctx = null, vsrc = null, vEnd = 0; const vbuf = new Map();
export const vkey = (t) => String(t).replace(/[\s、。，．,.！？!?〜…・「」『』（）()]/g, '');
export function loadVoices(base = '') { return fetch(base + 'assets/voice.json').then((r) => (r.ok ? r.json() : null)).then((j) => { VB = j || {}; }).catch(() => { VB = {}; }); }
export const hasVoice = (t) => !!(VB && VB[vkey(t)]);
export const speaking = () => (window.speechSynthesis && speechSynthesis.speaking) || performance.now() < vEnd;
export function stopVoice() { try { if (vsrc) vsrc.stop(); } catch (e) {} vsrc = null; vEnd = 0; }
export async function playVoice(t, vol = 1) {
  const k = vkey(t); const b64 = VB && VB[k]; if (!b64) return false;
  try {
    vctx = vctx || new (window.AudioContext || window.webkitAudioContext)(); if (vctx.state === 'suspended') await vctx.resume();
    let buf = vbuf.get(k); if (!buf) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); buf = await vctx.decodeAudioData(u.buffer); vbuf.set(k, buf); }
    stopVoice(); if (window.speechSynthesis) speechSynthesis.cancel();
    const src = vctx.createBufferSource(); src.buffer = buf; const gn = vctx.createGain(); gn.gain.value = vol; src.connect(gn).connect(vctx.destination); src.start(); vsrc = src; vEnd = performance.now() + buf.duration * 1000;
    return buf.duration;
  } catch (e) { return false; }
}
