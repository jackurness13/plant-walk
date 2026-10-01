// Static zone scenes. Equipment drawings are deliberately generic: identical items look identical,
// and nothing hints at waste. The only animation is the same pulse marker on every unresolved item.

export const SCENE_W = 360, SCENE_H = 520;

const STEEL = '#5b636b', STEEL_D = '#3c434a', STEEL_L = '#8a939b', DARK = '#23272b';

const KINDS = {
  compressor: { w: 140, h: 116, draw: () => `
    <rect x="4" y="96" width="132" height="14" rx="2" fill="${STEEL_D}"/>
    <rect x="10" y="20" width="120" height="78" rx="6" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    <rect x="18" y="30" width="54" height="40" rx="3" fill="${STEEL_D}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="22" x2="68" y1="${36 + i * 7}" y2="${36 + i * 7}" stroke="${DARK}" stroke-width="2.5"/>`).join('')}
    <rect x="82" y="30" width="38" height="24" rx="2" fill="${DARK}"/><rect x="86" y="34" width="30" height="10" fill="#4d5a45"/>
    <circle cx="92" cy="49" r="2" fill="${STEEL_L}"/><circle cx="102" cy="49" r="2" fill="${STEEL_L}"/>
    <rect x="82" y="62" width="38" height="28" rx="2" fill="${STEEL_D}"/>
    <rect x="60" y="4" width="10" height="18" fill="${STEEL}"/><rect x="54" y="0" width="22" height="6" rx="2" fill="${STEEL_L}"/>` },
  header: { w: 220, h: 66, draw: () => `
    <rect x="0" y="40" width="220" height="16" fill="url(#pipeG)" stroke="${DARK}" stroke-width="1.5"/>
    <rect x="40" y="36" width="10" height="24" rx="2" fill="${STEEL_D}"/><rect x="170" y="36" width="10" height="24" rx="2" fill="${STEEL_D}"/>
    <rect x="104" y="22" width="12" height="20" fill="${STEEL}"/>
    <circle cx="110" cy="16" r="15" fill="#e9ecef" stroke="${STEEL_L}" stroke-width="4"/>
    <line x1="110" y1="16" x2="104" y2="8" stroke="${DARK}" stroke-width="2"/><circle cx="110" cy="16" r="2" fill="${DARK}"/>` },
  intake: { w: 90, h: 92, draw: () => `
    <rect x="34" y="0" width="22" height="30" fill="${STEEL}"/>
    <rect x="8" y="26" width="74" height="54" rx="6" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${18 + i * 11}" x2="${18 + i * 11}" y1="34" y2="72" stroke="${STEEL_D}" stroke-width="3"/>`).join('')}
    <rect x="38" y="80" width="14" height="12" fill="${STEEL}"/>` },
  fixtures: { w: 300, h: 60, draw: () => [0, 1, 2].map((i) => `
    <line x1="${50 + i * 100}" x2="${50 + i * 100}" y1="0" y2="16" stroke="${STEEL_L}" stroke-width="2"/>
    <rect x="${10 + i * 100}" y="16" width="80" height="20" rx="3" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    <rect x="${16 + i * 100}" y="34" width="68" height="6" rx="2" fill="#d9dccf"/>
    <path d="M${16 + i * 100} 40 L${2 + i * 100} 60 L${98 + i * 100} 60 L${84 + i * 100} 40Z" fill="#fffbe6" opacity=".07"/>`).join('') },
  motor: { w: 150, h: 106, draw: () => `
    <rect x="0" y="90" width="150" height="14" rx="2" fill="${STEEL_D}"/>
    <rect x="12" y="28" width="82" height="62" rx="10" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${22 + i * 12}" x2="${22 + i * 12}" y1="32" y2="86" stroke="${STEEL_D}" stroke-width="2"/>`).join('')}
    <rect x="40" y="14" width="30" height="16" rx="2" fill="${STEEL}" stroke="${DARK}"/>
    <rect x="94" y="54" width="20" height="10" fill="${STEEL_L}"/>
    <rect x="114" y="38" width="32" height="42" rx="4" fill="${STEEL}" stroke="${DARK}" stroke-width="2"/>
    <circle cx="130" cy="59" r="9" fill="${STEEL_D}"/>` },
  pump: { w: 130, h: 106, draw: () => `
    <rect x="0" y="90" width="130" height="14" rx="2" fill="${STEEL_D}"/>
    <rect x="62" y="40" width="62" height="50" rx="8" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="${72 + i * 13}" x2="${72 + i * 13}" y1="44" y2="86" stroke="${STEEL_D}" stroke-width="2"/>`).join('')}
    <circle cx="34" cy="64" r="26" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/><circle cx="34" cy="64" r="8" fill="${STEEL_D}"/>
    <rect x="26" y="8" width="16" height="32" fill="url(#pipeG)" stroke="${DARK}"/>
    <rect x="20" y="16" width="28" height="6" rx="2" fill="${STEEL_D}"/>
    <rect x="0" y="56" width="10" height="16" fill="url(#pipeG)" stroke="${DARK}"/>` },
  boiler: { w: 180, h: 186, draw: () => `
    <rect x="70" y="0" width="22" height="40" fill="${STEEL}" stroke="${DARK}"/>
    <rect x="6" y="40" width="168" height="130" rx="18" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    <rect x="6" y="58" width="168" height="6" fill="${STEEL_D}" opacity=".6"/><rect x="6" y="146" width="168" height="6" fill="${STEEL_D}" opacity=".6"/>
    <circle cx="44" cy="106" r="22" fill="${STEEL_D}" stroke="${DARK}" stroke-width="2"/><circle cx="44" cy="106" r="10" fill="${DARK}"/>
    <rect x="100" y="80" width="56" height="40" rx="3" fill="${DARK}"/><rect x="106" y="86" width="44" height="14" fill="#4d5a45"/>
    <circle cx="114" cy="110" r="3" fill="${STEEL_L}"/><circle cx="128" cy="110" r="3" fill="${STEEL_L}"/>
    <rect x="12" y="170" width="20" height="14" fill="${STEEL_D}"/><rect x="148" y="170" width="20" height="14" fill="${STEEL_D}"/>` },
  pipe: { w: 180, h: 46, draw: () => `
    <rect x="0" y="12" width="180" height="22" fill="url(#pipeG)" stroke="${DARK}" stroke-width="1.5"/>
    <rect x="26" y="6" width="10" height="34" rx="2" fill="${STEEL_D}"/><rect x="144" y="6" width="10" height="34" rx="2" fill="${STEEL_D}"/>
    <line x1="90" y1="34" x2="90" y2="46" stroke="${STEEL_L}" stroke-width="3"/>` },
  highbay: { w: 200, h: 70, draw: () => [0, 1, 2].map((i) => `
    <line x1="${34 + i * 66}" x2="${34 + i * 66}" y1="0" y2="18" stroke="${STEEL_L}" stroke-width="2"/>
    <path d="M${18 + i * 66} 18 h32 l10 26 h-52z" fill="url(#skinG)" stroke="${DARK}" stroke-width="2"/>
    <rect x="${10 + i * 66}" y="44" width="48" height="5" rx="2" fill="#d9dccf"/>`).join('') },
  fan: { w: 110, h: 110, draw: () => `
    <rect x="4" y="4" width="102" height="102" rx="8" fill="${STEEL_D}" stroke="${DARK}" stroke-width="2"/>
    <circle cx="55" cy="55" r="42" fill="${DARK}" stroke="${STEEL_L}" stroke-width="3"/>
    ${[0, 72, 144, 216, 288].map((a) => `<path d="M55 55 q12 -30 0 -38 q-14 4 0 38z" fill="${STEEL_L}" transform="rotate(${a} 55 55)"/>`).join('')}
    <circle cx="55" cy="55" r="8" fill="${STEEL}"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="13" x2="97" y1="${19 + i * 12}" y2="${19 + i * 12}" stroke="${STEEL}" stroke-width="1" opacity=".55"/>`).join('')}` },
  troffer: { w: 170, h: 84, draw: () => `
    <rect x="0" y="0" width="170" height="84" rx="4" fill="#2f353b" stroke="${STEEL}" stroke-width="2"/>
    <rect x="18" y="8" width="56" height="20" rx="2" fill="url(#skinG)" stroke="${DARK}"/><rect x="96" y="8" width="56" height="20" rx="2" fill="url(#skinG)" stroke="${DARK}"/>
    <rect x="24" y="12" width="44" height="12" fill="#d9dccf" opacity=".5"/><rect x="102" y="12" width="44" height="12" fill="#d9dccf" opacity=".5"/>
    <rect x="22" y="54" width="56" height="8" fill="${STEEL}"/><rect x="28" y="62" width="4" height="18" fill="${STEEL}"/><rect x="68" y="62" width="4" height="18" fill="${STEEL}"/>
    <rect x="36" y="40" width="26" height="14" rx="1" fill="${DARK}"/>
    <rect x="100" y="54" width="56" height="8" fill="${STEEL}"/><rect x="106" y="62" width="4" height="18" fill="${STEEL}"/><rect x="146" y="62" width="4" height="18" fill="${STEEL}"/>
    <rect x="114" y="40" width="26" height="14" rx="1" fill="${DARK}"/>` },
};

const SCENE_DEFS = `<defs>
<linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f99a3"/><stop offset="1" stop-color="#5f6973"/></linearGradient>
<linearGradient id="pipeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ab"/><stop offset=".5" stop-color="#6c757d"/><stop offset="1" stop-color="#4a5259"/></linearGradient>
<pattern id="floorP" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#24282c"/><path d="M40 0H0V40" fill="none" stroke="#2e3338" stroke-width="1"/></pattern>
<pattern id="wallP" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="#2b3035"/><path d="M0 30H60M30 0V15M0 15H60M0 15V30M60 15V30" fill="none" stroke="#32383e" stroke-width="1"/></pattern>
</defs>`;

/** Background decoration per zone — non-interactive, low contrast. */
const BACKDROPS = {
  compressor: `
    <rect x="0" y="0" width="360" height="330" fill="url(#wallP)"/><rect x="0" y="330" width="360" height="190" fill="url(#floorP)"/>
    <rect x="0" y="88" width="360" height="12" fill="#3b4248"/>
    <rect x="40" y="170" width="44" height="100" rx="20" fill="#30363b" stroke="#3b4248"/>
    <text x="62" y="224" text-anchor="middle" font-size="9" fill="#4a5259" font-weight="700">RCVR</text>`,
  production: `
    <rect x="0" y="0" width="360" height="320" fill="url(#wallP)"/><rect x="0" y="320" width="360" height="200" fill="url(#floorP)"/>
    <rect x="0" y="230" width="360" height="22" rx="4" fill="#30363b" stroke="#3b4248"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<circle cx="${20 + i * 40}" cy="241" r="7" fill="#3b4248"/>`).join('')}
    <rect x="40" y="200" width="34" height="30" fill="#353b41"/><rect x="150" y="196" width="44" height="34" fill="#353b41"/><rect x="270" y="202" width="30" height="28" fill="#353b41"/>`,
  boiler: `
    <rect x="0" y="0" width="360" height="380" fill="url(#wallP)"/><rect x="0" y="380" width="360" height="140" fill="url(#floorP)"/>
    <rect x="231" y="190" width="90" height="130" rx="6" fill="#30363b" stroke="#3b4248"/>
    <text x="276" y="258" text-anchor="middle" font-size="9" fill="#4a5259" font-weight="700">DEAERATOR</text>
    <rect x="100" y="74" width="62" height="10" fill="#3b4248"/>`,
  warehouse: `
    <rect x="0" y="0" width="360" height="340" fill="url(#wallP)"/><rect x="0" y="340" width="360" height="180" fill="url(#floorP)"/>
    ${[0, 1].map((i) => `<g transform="translate(${20 + i * 104} 175)"><rect width="92" height="130" fill="none" stroke="#3b4248" stroke-width="4"/>
      <line x1="0" x2="92" y1="43" y2="43" stroke="#3b4248" stroke-width="4"/><line x1="0" x2="92" y1="86" y2="86" stroke="#3b4248" stroke-width="4"/>
      <rect x="8" y="19" width="30" height="22" fill="#33393f"/><rect x="50" y="62" width="34" height="22" fill="#33393f"/><rect x="10" y="105" width="40" height="22" fill="#33393f"/></g>`).join('')}
    <rect x="216" y="360" width="128" height="120" fill="none" stroke="#3b4248" stroke-width="3" stroke-dasharray="8 6"/>
    <text x="280" y="424" text-anchor="middle" font-size="10" fill="#4a5259" font-weight="700">DOCK</text>`,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Build zone SVG markup. `state(id)` returns 'open' | 'good' | 'partial' | 'bad'. */
export function renderScene(zoneId, items, state) {
  let out = `<svg viewBox="0 0 ${SCENE_W} ${SCENE_H}" xmlns="http://www.w3.org/2000/svg" class="scene-svg" preserveAspectRatio="xMidYMid meet">${SCENE_DEFS}${BACKDROPS[zoneId] || ''}`;
  for (const it of items) {
    const k = KINDS[it.kind];
    const [x, y] = it.pos;
    const st = state(it.id);
    const lw = Math.max(84, it.label.length * 8.6 + 24);
    const lx = k.w / 2 - lw / 2;
    const badge =
      st === 'open'
        ? `<g class="marker" transform="translate(${k.w - 6} 4)"><circle class="pulse" r="11" fill="none" stroke="#cc0000" stroke-width="2"/><circle r="6" fill="#cc0000"/></g>`
        : `<g transform="translate(${k.w - 6} 4)"><circle r="14" fill="${st === 'bad' ? '#7a1010' : st === 'partial' ? '#8a6d00' : '#1f7a3a'}" stroke="#fff" stroke-width="2"/>
           <path d="${st === 'bad' ? 'M-5 -5 L5 5 M5 -5 L-5 5' : 'M-6 0 L-2 5 L6 -5'}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    out += `<g class="equip ${st !== 'open' ? 'resolved' : ''}" data-id="${it.id}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="Inspect ${esc(it.name)}">
      <rect class="hit" x="-8" y="-8" width="${k.w + 16}" height="${k.h + 40}" rx="10"/>
      <g class="idle">${k.draw()}</g>
      <g transform="translate(${lx} ${k.h + 6})"><rect width="${lw}" height="24" rx="5" fill="#15181b" stroke="#4a5259"/>
      <text x="${lw / 2}" y="17" text-anchor="middle" font-size="14" font-weight="700" fill="#e9ecef">${esc(it.label)}</text></g>
      ${badge}
    </g>`;
  }
  return out + '</svg>';
}

export function kindSize(kind) {
  return KINDS[kind];
}
