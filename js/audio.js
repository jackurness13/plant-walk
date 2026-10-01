// Tiny Web Audio synth — no audio files. Lazily created on first user gesture (iOS requirement).
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('plantwalk.muted') === '1'; } catch { /* storage blocked */ }

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('plantwalk.muted', m ? '1' : '0'); } catch { /* ignore */ }
}

function tone(freq, start, dur, { type = 'sine', gain = 0.2, slideTo = null } = {}) {
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(start, dur, gain = 0.15, hp = 2000) {
  const t0 = ctx.currentTime + start;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0);
}

const SOUNDS = {
  click: () => tone(900, 0, 0.05, { type: 'square', gain: 0.05 }),
  reveal: () => tone(520, 0, 0.12, { type: 'triangle', gain: 0.12, slideTo: 880 }),
  // "Ka-ching": drawer clunk + two bright bells
  ching: () => {
    noise(0, 0.08, 0.25, 800);
    tone(140, 0, 0.12, { type: 'square', gain: 0.08 });
    tone(2093, 0.1, 0.6, { gain: 0.18 });
    tone(2637, 0.16, 0.8, { gain: 0.16 });
    tone(4186, 0.16, 0.4, { gain: 0.05 });
  },
  good: () => { tone(660, 0, 0.12, { type: 'triangle', gain: 0.15 }); tone(990, 0.1, 0.22, { type: 'triangle', gain: 0.15 }); },
  half: () => { tone(660, 0, 0.12, { type: 'triangle', gain: 0.12 }); tone(560, 0.12, 0.25, { type: 'triangle', gain: 0.12 }); },
  buzz: () => { tone(150, 0, 0.35, { type: 'sawtooth', gain: 0.12, slideTo: 90 }); },
  tick: () => tone(1200, 0, 0.04, { type: 'square', gain: 0.05 }),
  end: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', gain: 0.14 })),
};

export function play(name) {
  if (muted || !ctx || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* never let audio break the game */ }
}
