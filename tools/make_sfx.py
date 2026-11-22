# おこづかいクエスト：おかねを すいこむ ときの こうかおん（すべて その場で 合成。著作権の ある 音は つかわない）
import numpy as np, scipy.signal as sg, subprocess, os, sys
SR = 44100; OUT = sys.argv[1] if len(sys.argv) > 1 else 'sfx'; rng = np.random.default_rng(7)
def t(d): return np.arange(int(SR * d)) / SR
def env(x, a=0.002, d=0.3):
    n = len(x); tt = np.arange(n) / SR; e = np.minimum(1, tt / a) * np.exp(-tt / d); return x * e
def bell(f, d, parts=((1, 1), (2.76, .5), (5.40, .28), (8.93, .14), (13.3, .07)), decay=.35):
    tt = t(d); y = sum(a * np.sin(2 * np.pi * f * r * tt + rng.random() * 6) * np.exp(-tt / (decay / (1 + r * .35))) for r, a in parts); return y
def bp(x, lo, hi, order=2): b, a = sg.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return sg.lfilter(b, a, x)
def hp(x, f): b, a = sg.butter(2, f / (SR / 2), 'high'); return sg.lfilter(b, a, x)
def norm(x, peak=.89): return x / (np.max(np.abs(x)) + 1e-9) * peak
def place(dst, src, at):
    i = int(at * SR); dst[i:i + len(src)] += src[:max(0, len(dst) - i)]
def save(name, y, stereo=None):
    y = norm(y); wav = f'/tmp/sfx/{name}.wav'
    import wave; w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
    os.makedirs(OUT, exist_ok=True); subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '96k', f'{OUT}/{name}.mp3'], check=True)
# チャリン：2かいの ちいさな うちあわせ＋きらきらの のこり
y = np.zeros(int(SR * .6)); click = hp(rng.standard_normal(int(SR * .004)), 4000) * .5
place(y, env(bell(2350, .5), .001, .18) + np.pad(click, (0, int(SR * .5) - len(click))), 0)
place(y, env(bell(3130, .55, decay=.42), .001, .25) * .8, .045)
place(y, env(bell(4700, .4, decay=.2), .001, .12) * .25, .05)
save('coin', y)
# すいこみ：ノイズを バンドパスで ゆらす（ループ できる 2びょう）
n = int(SR * 2.0); w = rng.standard_normal(n + SR); out = np.zeros(n + SR)
for k in range(0, n + SR, 512):
    ph = k / SR; c = 900 + 500 * np.sin(2 * np.pi * ph * 1.5) + 250 * np.sin(2 * np.pi * ph * 4.1); seg = w[max(0, k - 2048):k + 512]
    f = bp(seg, max(200, c * .6), min(8000, c * 1.6))[-512:] if len(seg) > 600 else seg[-512:]; out[k:k + 512] = f[:len(out[k:k + 512])]
out = out[:n + SR]; lp = out[:n].copy(); fade = int(SR * .5); x = np.linspace(0, 1, fade)
lp[:fade] = lp[:fade] * x + out[n:n + fade] * (1 - x)  # はじめと おわりを まぜて つなぎめを なくす
lp += .25 * np.sin(2 * np.pi * 70 * t(2.0)) * (0.6 + .4 * np.sin(2 * np.pi * t(2.0) * 1.5))  # ひくい うなり
save('suck', lp)
# ぽん：ふくろが はじける
y = np.zeros(int(SR * 1.0)); tt = t(.35); thump = np.sin(2 * np.pi * np.cumsum(np.linspace(160, 45, len(tt))) / SR) * np.exp(-tt / .09)
place(y, thump, 0); place(y, env(bp(rng.standard_normal(int(SR * .25)), 600, 5000), .001, .05) * .7, 0)
for i, f in enumerate([1568, 1976, 2349, 3136, 3951]): place(y, env(bell(f, .5), .001, .2) * .35, .05 + i * .045)
save('pop', y)
# コトン：ぶたの ちょきんばこに はいる
y = np.zeros(int(SR * .5)); tt = t(.25); wood = sum(a * np.sin(2 * np.pi * np.cumsum(np.linspace(f, f * .7, len(tt))) / SR) for f, a in ((420, 1), (1130, .35), (2300, .12))) * np.exp(-tt / .05)
place(y, wood, 0); place(y, env(bell(2637, .35), .001, .1) * .35, .01); save('drop', y)
# ファンファーレ：きらきら＋ドミソド
y = np.zeros(int(SR * 3.2)); notes = [(523.25, 0), (659.25, .11), (783.99, .22), (1046.5, .33)]
for f, at in notes:
    tt = t(1.6); tone_ = (np.sin(2 * np.pi * f * tt) + .45 * np.sin(2 * np.pi * 2 * f * tt) + .2 * np.sin(2 * np.pi * 3 * f * tt)) * np.exp(-tt / .7) * np.minimum(1, tt / .01)
    place(y, tone_ * .5, at); place(y, env(bell(f * 2, 1.2, decay=.6), .002, .5) * .35, at)
for i in range(28): place(y, env(bell(2000 + rng.random() * 4000, .5, decay=.15), .001, .12) * .12, .35 + rng.random() * 1.4)
tt = t(1.4); chord = sum(np.sin(2 * np.pi * f * tt) for f in (523.25, 659.25, 783.99, 1046.5)) * np.exp(-tt / .9) * np.minimum(1, tt / .03) * .3; place(y, chord, .45)
fo = int(SR * .4); y[-fo:] *= np.linspace(1, 0, fo); save('fanfare', y)
print('ok')
