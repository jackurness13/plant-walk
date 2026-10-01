// SVG renderers that make each reading look like a real field instrument.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT = `font-family="'Arial Narrow','sans-serif-condensed','Roboto Condensed',Arial,Helvetica,sans-serif"`;

/** Estimated rendered width (worst case: plain bold Arial). */
const estW = (str, fs) => String(str).length * fs * 0.58;
/** Text that is squeezed (never clipped) if it would exceed maxW. */
function fitText(x, y, str, fs, maxW, attrs = '') {
  const fit = estW(str, fs) > maxW ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${x}" y="${y}" ${FONT} font-size="${fs}"${fit} ${attrs}>${esc(str)}</text>`;
}

/** Short label + icon used on the covered "tap to read" button. */
export const INSTRUMENT_META = {
  nameplate: { icon: '▤', verb: 'Read plate' },
  gauge: { icon: '◔', verb: 'Read gauge' },
  logger: { icon: '〰', verb: 'Download data' },
  ir: { icon: '⌖', verb: 'Shoot IR' },
  thermo: { icon: '℉', verb: 'Take reading' },
  light: { icon: '☼', verb: 'Measure' },
  ultra: { icon: ')))', verb: 'Scan' },
  flue: { icon: '≋', verb: 'Sample flue' },
};

export function renderInstrument(r) {
  switch (r.type) {
    case 'nameplate': return nameplate(r);
    case 'gauge': return gauge(r);
    case 'logger': return logger(r);
    case 'ir': return irGun(r, true);
    case 'thermo': return irGun(r, false);
    case 'light': return lightMeter(r);
    case 'ultra': return ultrasonic(r);
    case 'flue': return flue(r);
    default: return '';
  }
}

const svg = (h, body, title) =>
  `<svg class="inst" viewBox="0 0 300 ${h}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

function rivet(x, y) {
  return `<circle cx="${x}" cy="${y}" r="4" fill="url(#rivetG)" stroke="#6b7076" stroke-width=".8"/>`;
}

export const INSTRUMENT_DEFS = `<defs>
<linearGradient id="plateG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dde1"/><stop offset=".45" stop-color="#b9bfc5"/><stop offset=".55" stop-color="#c9ced3"/><stop offset="1" stop-color="#a7adb4"/></linearGradient>
<radialGradient id="rivetG" cx=".35" cy=".35"><stop offset="0" stop-color="#f2f4f6"/><stop offset="1" stop-color="#7d838a"/></radialGradient>
<linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f45"/><stop offset="1" stop-color="#22262a"/></linearGradient>
<linearGradient id="lcdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7d6b0"/><stop offset="1" stop-color="#a9bd8f"/></linearGradient>
<radialGradient id="dialG" cx=".5" cy=".4"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e6ea"/></radialGradient>
<linearGradient id="bezelG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e9ec"/><stop offset=".5" stop-color="#8d949b"/><stop offset="1" stop-color="#d0d4d8"/></linearGradient>
</defs>`;

function nameplate(r) {
  const rows = r.rows || [];
  const h = 62 + rows.length * 22;
  let body =
    `<rect x="3" y="3" width="294" height="${h - 6}" rx="8" fill="url(#plateG)" stroke="#80868c" stroke-width="2"/>` +
    `<rect x="10" y="10" width="280" height="${h - 20}" rx="5" fill="none" stroke="#8a9096" stroke-width="1" stroke-dasharray="1 0"/>` +
    rivet(16, 16) + rivet(284, 16) + rivet(16, h - 16) + rivet(284, h - 16) +
    `<rect x="28" y="16" width="244" height="26" rx="3" fill="#2a2e33"/>` +
    fitText(150, 34, r.heading, 14, 230, 'text-anchor="middle" font-weight="700" fill="#e8eaec"');
  rows.forEach(([k, v], i) => {
    const y = 64 + i * 22;
    const kw = Math.min(estW(k, 13), 120);
    body += fitText(24, y, k.toUpperCase(), 13, 120, 'font-weight="600" fill="#3c4248"') +
      fitText(276, y, v, 15, 252 - kw - 14, 'text-anchor="end" font-weight="700" fill="#111"') +
      (i < rows.length - 1 ? `<line x1="24" x2="276" y1="${y + 7}" y2="${y + 7}" stroke="#8f959b" stroke-width=".6"/>` : '');
  });
  return svg(h, body, r.heading);
}

function polar(cx, cy, rad, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
}

function gauge(r) {
  const cx = 150, cy = 100, R = 78;
  const span = 270, start = 135;
  const ang = (v) => start + (span * (v - r.min)) / (r.max - r.min);
  let ticks = '';
  const minorStep = r.step / 5;
  for (let v = r.min; v <= r.max + 1e-9; v += minorStep) {
    const major = Math.abs((v - r.min) / r.step - Math.round((v - r.min) / r.step)) < 1e-6;
    const [x1, y1] = polar(cx, cy, R - 4, ang(v));
    const [x2, y2] = polar(cx, cy, R - (major ? 16 : 10), ang(v));
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1b1e22" stroke-width="${major ? 2.4 : 1}"/>`;
    if (major) {
      const [tx, ty] = polar(cx, cy, R - 28, ang(v));
      ticks += `<text x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#1b1e22">${Math.round(v)}</text>`;
    }
  }
  const [nx, ny] = polar(cx, cy, R - 12, ang(r.value));
  const [bx1, by1] = polar(cx, cy, 6, ang(r.value) + 90);
  const [bx2, by2] = polar(cx, cy, 6, ang(r.value) - 90);
  const [tx, ty] = polar(cx, cy, 16, ang(r.value) + 180);
  const body =
    `<rect x="3" y="3" width="294" height="214" rx="12" fill="url(#bodyG)"/>` +
    `<text x="150" y="208" text-anchor="middle" ${FONT} font-size="14" font-weight="700" letter-spacing="1.5" fill="#cfd4d9">${esc(r.label)}</text>` +
    `<circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="url(#bezelG)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R + 2}" fill="url(#dialG)" stroke="#555" stroke-width="1"/>` +
    ticks +
    `<text x="${cx}" y="${cy + 34}" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#444">${esc(r.unit)}</text>` +
    `<g class="needle" style="--rot:${(ang(r.value) - start).toFixed(1)}deg">` +
    `<polygon points="${nx.toFixed(1)},${ny.toFixed(1)} ${bx1.toFixed(1)},${by1.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${bx2.toFixed(1)},${by2.toFixed(1)}" fill="#cc0000" stroke="#7a0000" stroke-width=".8"/></g>` +
    `<circle cx="${cx}" cy="${cy}" r="7" fill="#2a2e33" stroke="#999"/>` +
    `<rect x="${cx - 38}" y="${cy + 44}" width="76" height="22" rx="3" fill="#15181b" stroke="#555"/>` +
    `<text x="${cx}" y="${cy + 60}" text-anchor="middle" ${FONT} font-size="15" font-weight="700" fill="#f5f5f5">${esc(r.value)} ${esc(r.unit.split(' ')[0])}</text>`;
  return svg(220, body, `${r.label}: ${r.value} ${r.unit}`);
}

function logger(r) {
  const x0 = 46, x1 = 280, y0 = 44, y1 = 150;
  const n = r.series.length;
  const px = (i) => x0 + ((x1 - x0) * i) / (n - 1);
  const py = (v) => y1 - ((y1 - y0) * v) / r.ymax;
  const pts = r.series.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const area = `${x0},${y1} ${pts} ${x1},${y1}`;
  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const y = y0 + ((y1 - y0) * k) / 4;
    grid += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="#7f9467" stroke-width=".6" stroke-dasharray="2 3"/>`;
  }
  const yl = (v) => `<text x="${x0 - 5}" y="${py(v) + 4}" text-anchor="end" ${FONT} font-size="12" font-weight="600" fill="#2b3a1f">${v}</text>`;
  const xl = (r.xLabels || []).map((l, i, a) => {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / a.length;
    return `<text x="${x.toFixed(1)}" y="${y1 + 15}" text-anchor="middle" ${FONT} font-size="12" font-weight="600" fill="#2b3a1f">${esc(l)}</text>`;
  }).join('');
  const body =
    `<rect x="3" y="3" width="294" height="214" rx="12" fill="url(#bodyG)"/>` +
    `<circle cx="20" cy="20" r="4" fill="#3ddc84"/><text x="30" y="24" ${FONT} font-size="12" font-weight="700" fill="#aab2ba" letter-spacing="1">DATA LOGGER</text>` +
    `<rect x="12" y="30" width="276" height="146" rx="5" fill="url(#lcdG)" stroke="#111" stroke-width="2"/>` +
    fitText(x0, y0 - 3, r.label, 12, 200, 'font-weight="700" fill="#1f2a16"') +
    `<text x="${x1}" y="${y0 - 3}" text-anchor="end" ${FONT} font-size="12" font-weight="700" fill="#1f2a16">${esc(r.unit)}</text>` +
    grid + yl(0) + yl(r.ymax) + yl(r.ymax / 2) +
    `<polygon points="${area}" fill="#1f2a16" fill-opacity=".18"/>` +
    `<polyline class="trace" points="${pts}" fill="none" stroke="#1f2a16" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" stroke="#1f2a16" stroke-width="1.2"/><line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="#1f2a16" stroke-width="1.2"/>` +
    xl +
    fitText(150, 203, r.caption, 14, 276, 'text-anchor="middle" font-weight="700" fill="#f1f3f5"');
  return svg(220, body, `${r.label}. ${r.caption}`);
}

function lcdBig(x, y, w, h, value, unit, size = 46) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="url(#lcdG)" stroke="#111" stroke-width="2"/>` +
    `<text x="${x + w - 44}" y="${y + h / 2 + size * 0.36}" text-anchor="end" ${FONT} font-size="${size}" font-weight="800" fill="#16200f">${esc(value)}</text>` +
    `<text x="${x + w - 8}" y="${y + h / 2 + size * 0.36}" text-anchor="end" ${FONT} font-size="20" font-weight="800" fill="#16200f">${esc(unit)}</text>`;
}

function irGun(r, isIR) {
  // IR = pistol-grip thermometer; thermo = handheld probe thermometer
  const body = (isIR
    ? `<path d="M20 40 h170 a14 14 0 0 1 14 14 v62 a14 14 0 0 1 -14 14 h-58 l-14 60 h-46 l10 -60 h-62 a14 14 0 0 1 -14 -14 v-62 a14 14 0 0 1 14 -14z" fill="url(#bodyG)" stroke="#111" stroke-width="2"/>` +
      `<rect x="204" y="64" width="40" height="40" rx="4" fill="#2a2e33" stroke="#111"/><circle cx="224" cy="84" r="12" fill="#111" stroke="#666"/>` +
      `<line x1="244" y1="84" x2="294" y2="84" stroke="#cc0000" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<rect x="20" y="40" width="184" height="10" fill="#f2b705"/>` +
      `<text x="96" y="180" text-anchor="middle" ${FONT} font-size="11" font-weight="700" fill="#ccc">IR</text>`
    : `<rect x="16" y="36" width="200" height="104" rx="14" fill="url(#bodyG)" stroke="#111" stroke-width="2"/>` +
      `<rect x="216" y="80" width="78" height="8" rx="4" fill="#b8bec4" stroke="#555"/>` +
      `<rect x="16" y="36" width="200" height="10" rx="5" fill="#f2b705"/>`) +
    lcdBig(28, 56, 176, 66, r.value, r.unit) +
    fitText(116, 26, r.label, 14, 220, 'text-anchor="middle" font-weight="700" fill="currentColor"') +
    (isIR
      ? fitText(214, 150, r.target, 12.5, 150, 'text-anchor="middle" font-weight="600" fill="currentColor"')
      : fitText(116, 162, r.target, 12.5, 220, 'text-anchor="middle" font-weight="600" fill="currentColor"'));
  return svg(isIR ? 196 : 176, body, `${r.label}: ${r.value}${r.unit}, ${r.target}`);
}

function lightMeter(r) {
  const body =
    `<rect x="60" y="8" width="180" height="170" rx="16" fill="url(#bodyG)" stroke="#111" stroke-width="2"/>` +
    `<circle cx="150" cy="38" r="20" fill="#f3f3ee" stroke="#999" stroke-width="3"/><circle cx="150" cy="38" r="12" fill="#fff"/>` +
    lcdBig(74, 68, 152, 62, r.value, r.unit, 44) +
    fitText(150, 152, r.label, 12, 164, 'text-anchor="middle" font-weight="700" fill="#cfd4d9"') +
    fitText(150, 170, r.caption, 12.5, 164, 'text-anchor="middle" font-weight="600" fill="#cfd4d9"');
  return svg(186, body, `${r.label}: ${r.value} ${r.unit}`);
}

function ultrasonic(r) {
  const rows = r.hits.map((h, i) => {
    const y = 72 + i * 36;
    const w = (h.db / 80) * 90;
    return fitText(24, y, h.loc, 13, 180, 'font-weight="700" fill="#16200f"') +
      `<rect x="24" y="${y + 6}" width="90" height="10" fill="none" stroke="#16200f" stroke-width="1"/>` +
      `<rect x="24" y="${y + 6}" width="${w.toFixed(1)}" height="10" fill="#16200f"/>` +
      `<text x="124" y="${y + 16}" ${FONT} font-size="15" font-weight="800" fill="#16200f">${h.db} dB</text>` +
      `<text x="276" y="${y + 8}" text-anchor="end" ${FONT} font-size="15" font-weight="800" fill="#16200f">${esc(h.size)}</text>`;
  }).join('');
  const body =
    `<rect x="3" y="3" width="294" height="214" rx="12" fill="url(#bodyG)"/>` +
    `<text x="18" y="24" ${FONT} font-size="12" font-weight="700" fill="#aab2ba" letter-spacing="1">ULTRASONIC · ${esc(r.label.split('·')[1] || '')}</text>` +
    `<path d="M262 14 q8 8 0 16 M270 10 q12 12 0 24 M278 6 q16 16 0 32" stroke="#aab2ba" stroke-width="2" fill="none"/>` +
    `<rect x="12" y="34" width="276" height="150" rx="5" fill="url(#lcdG)" stroke="#111" stroke-width="2"/>` +
    `<text x="24" y="52" ${FONT} font-size="11.5" font-weight="700" fill="#2b3a1f">LOCATION / SIGNAL</text>` +
    `<text x="276" y="52" text-anchor="end" ${FONT} font-size="11.5" font-weight="700" fill="#2b3a1f">EST. ORIFICE</text>` +
    rows +
    fitText(150, 205, r.caption, 13.5, 276, 'text-anchor="middle" font-weight="700" fill="#f1f3f5"');
  return svg(220, body, r.label);
}

function flue(r) {
  const rows = r.rows.map(([k, v, u], i) => {
    const y = 66 + i * 30;
    return `<text x="28" y="${y}" ${FONT} font-size="16" font-weight="700" fill="#16200f">${esc(k)}</text>` +
      `<text x="226" y="${y}" text-anchor="end" ${FONT} font-size="24" font-weight="800" fill="#16200f">${esc(v)}</text>` +
      `<text x="234" y="${y}" ${FONT} font-size="15" font-weight="700" fill="#16200f">${esc(u)}</text>`;
  }).join('');
  const body =
    `<rect x="3" y="3" width="294" height="190" rx="12" fill="url(#bodyG)"/>` +
    `<rect x="3" y="3" width="294" height="12" rx="6" fill="#cc0000"/>` +
    `<text x="18" y="32" ${FONT} font-size="12" font-weight="700" fill="#aab2ba" letter-spacing="1">${esc(r.label)} · NAT GAS</text>` +
    `<rect x="12" y="40" width="276" height="134" rx="5" fill="url(#lcdG)" stroke="#111" stroke-width="2"/>` +
    rows;
  return svg(196, body, r.label);
}
