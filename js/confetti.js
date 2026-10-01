// Lightweight canvas confetti burst.
const COLORS = ['#cc0000', '#ffffff', '#f2b705', '#9aa3ab', '#ff4d4d'];
let canvas, c2d, parts = [], raf = 0;

function ensure() {
  if (canvas) return;
  canvas = document.getElementById('confetti');
  c2d = canvas.getContext('2d');
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  addEventListener('resize', fit);
}

export function burst(n = 90, x = innerWidth / 2, y = innerHeight * 0.35) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ensure();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 8;
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[i % COLORS.length], life: 90 + Math.random() * 40,
    });
  }
  if (!raf) raf = requestAnimationFrame(step);
}

function step() {
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life-- > 0 && p.y < innerHeight + 20);
  for (const p of parts) {
    p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    c2d.save(); c2d.translate(p.x, p.y); c2d.rotate(p.r);
    c2d.globalAlpha = Math.min(1, p.life / 30);
    c2d.fillStyle = p.c; c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c2d.restore();
  }
  raf = parts.length ? requestAnimationFrame(step) : 0;
  if (!raf) c2d.clearRect(0, 0, innerWidth, innerHeight);
}
