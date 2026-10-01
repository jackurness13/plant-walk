// Plant Walk — single source of truth for equipment, readings, answers and savings math.
// Every savings number shown in the game is derived from (or verified against) calc() below.

export const GLOBALS = {
  hours: 6000,        // operating hr/yr
  elecRate: 0.08,     // $/kWh
  demandRate: 12,     // $/kW-month
  gasRate: 8,         // $/MMBtu
  hours24x7: 8760,
};

export const ZONES = [
  { id: 'compressor', name: 'Compressor Room', short: 'Compressors' },
  { id: 'production', name: 'Production Floor', short: 'Production' },
  { id: 'boiler', name: 'Boiler Room', short: 'Boiler' },
  { id: 'warehouse', name: 'Warehouse / Office', short: 'Warehouse' },
];

export const NO_ACTION = 'Already efficient — no action';

// ---- shared formula helpers ----
const r2 = (n) => Math.round(n * 100) / 100;
export const fmt = (n, d = 0) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (n) => '$' + fmt(Math.round(n));

/** Electric savings $/yr = kWh·rate + kW·demand·12 */
export function elecDollars(G, kWh, kW) {
  return kWh * G.elecRate + kW * G.demandRate * 12;
}
export function gasDollars(G, mmbtu) {
  return mmbtu * G.gasRate;
}
/** Finalise a calc result: round $ and compute payback. */
function result(G, { kWh = 0, kW = 0, mmbtu = 0, cost }) {
  const dollars = Math.round(elecDollars(G, kWh, kW) + gasDollars(G, mmbtu));
  return { kWh: Math.round(kWh), kW: r2(kW), mmbtu: Math.round(mmbtu), dollars, cost, payback: r2(cost / dollars) };
}
const elecMath = (G, kWh, kW) => [
  `Energy: ${fmt(kWh)} kWh × $${G.elecRate}/kWh = ${money(kWh * G.elecRate)}`,
  `Demand: ${fmt(kW, 2)} kW × $${G.demandRate}/kW-mo × 12 = ${money(kW * G.demandRate * 12)}`,
  `Total = ${money(elecDollars(G, kWh, kW))}/yr`,
];

// Each item:
//  readings  – instruments the player taps to reveal (2–3)
//  options   – diagnosis choices; exactly one has correct:true; wrong ones carry `why`
//  insight   – shown when diagnosed correctly (and in "missed findings")
//  calc(G)   – real findings only: { kWh, kW, mmbtu, dollars, cost, payback }
//  savings   – real findings only: 3 options [{ value, correct?, why }]
//  math(G)   – real findings only: lines for "Show math"
export const EQUIPMENT = [
  // ================= COMPRESSOR ROOM =================
  {
    id: 'compA',
    zone: 'compressor',
    name: 'Compressor A',
    label: 'Comp A',
    kind: 'compressor',
    pos: [20, 340],
    real: true,
    arTitle: 'Repair compressed-air leaks',
    observed: 'Ultrasonic survey found 3 leaking fittings (≈1/16″, 1/8″, 1/4″ orifices). Compressor A stays 40% loaded all weekend with production shut down.',
    readings: [
      {
        type: 'ultra', name: 'Ultrasonic leak detector', label: 'Ultrasonic survey · 40 kHz',
        hits: [
          { loc: 'Drop #4 quick-connect', db: 38, size: '≈1/16″' },
          { loc: 'FRL at press line', db: 52, size: '≈1/8″' },
          { loc: 'Header union, bay 3', db: 71, size: '≈1/4″' },
        ],
        caption: 'Background: 12 dB. System at 100 psig.',
      },
      {
        type: 'logger', name: 'Power data logger', label: 'Comp A — % load, 1 week',
        unit: '%', ymax: 100,
        series: [86, 90, 88, 92, 85, 89, 91, 87, 88, 90, 40, 41, 40, 40],
        xLabels: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'],
        caption: 'Sat–Sun: production OFF, no scheduled air use.',
      },
      {
        type: 'nameplate', name: 'Compressor nameplate', heading: 'ROTARY SCREW AIR COMPRESSOR',
        rows: [['Model', 'RS-100'], ['Motor', '100 hp'], ['Control', 'Load/unload'], ['Rated', '100 psig'], ['Spec. power', '0.20 kW/CFM']],
      },
    ],
    options: [
      { text: 'Repair compressed-air leaks', correct: true },
      { text: 'Replace with a larger compressor', why: 'Demand is not the problem — 40% load with zero production is air escaping. A bigger machine just feeds the leaks more expensively.' },
      { text: 'Add a VFD to Compressor A', why: 'A VFD trims part-load losses but the ~137 CFM still leaks out 24/7. Stop the leaks first; that is the waste the ultrasonic meter found.' },
      { text: NO_ACTION, why: 'A compressor loaded 40% with production off is a classic leak signature, and the ultrasonic meter found three active leaks.' },
    ],
    insight: '40% load on a weekend with no production = leaks. Leak flow at 100 psig: 1/16″ ≈ 6.5 CFM, 1/8″ ≈ 26 CFM, 1/4″ ≈ 104 CFM (136.5 CFM total) × 0.20 kW/CFM.',
    calc(G) {
      const cfm = 6.5 + 26 + 104;
      const kW = cfm * 0.20;
      return result(G, { kWh: kW * G.hours, kW, cost: 2500 });
    },
    math(G) {
      const cfm = 6.5 + 26 + 104, kW = cfm * 0.2, kWh = kW * G.hours;
      return [
        `Leak flow @100 psig: 6.5 + 26 + 104 = ${cfm} CFM`,
        `Power: ${cfm} CFM × 0.20 kW/CFM = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours)} h = ${fmt(kWh)} kWh/yr`,
        ...elecMath(G, kWh, kW),
      ];
    },
    savings: [
      { value: 17035, correct: true },
      { value: 13104, why: 'Forgot the demand savings: 27.3 kW × $12 × 12 = $3,931/yr also disappears when the leaks are fixed.' },
      { value: 163800, why: 'That is the kWh/yr (163,800), not dollars — an order-of-magnitude slip.' },
    ],
  },
  {
    id: 'header',
    zone: 'compressor',
    name: 'Main Air Header',
    label: 'Header',
    kind: 'header',
    pos: [70, 50],
    real: true,
    arTitle: 'Reduce compressed-air pressure to ~100 psig',
    observed: 'Discharge header held at 125 psig while the most demanding end use (press clutch) requires 90 psig.',
    readings: [
      { type: 'gauge', name: 'Header pressure gauge', label: 'DISCHARGE HEADER', min: 0, max: 160, value: 125, unit: 'psig', step: 20 },
      {
        type: 'nameplate', name: 'Highest end-use nameplate', heading: 'PNEUMATIC PRESS CLUTCH',
        rows: [['Unit', 'Press P-7'], ['Req. supply', '90 psig'], ['Flow', '18 SCFM'], ['Note', 'Highest-pressure user in plant']],
      },
      {
        type: 'logger', name: 'Power data logger', label: 'Comp A — input kW, 1 day',
        unit: 'kW', ymax: 100,
        series: [79, 81, 80, 82, 78, 80, 81, 79, 80, 80, 82, 78],
        xLabels: ['0h', '6h', '12h', '18h', '24h'],
        caption: 'Average input power: 80 kW (100 hp unit).',
      },
    ],
    options: [
      { text: 'Lower header pressure to ~100 psig', correct: true },
      { text: 'Add a second air receiver tank', why: 'Storage helps with transient demand, but it does nothing about a setpoint 35 psi above the highest need.' },
      { text: 'Raise pressure to protect end uses', why: 'The highest end use needs only 90 psig; every extra 2 psi costs ~1% compressor energy.' },
      { text: NO_ACTION, why: '125 psig is 35 psi above the highest end-use requirement — ~100 psig leaves ample margin for distribution drop.' },
    ],
    insight: 'Rule of thumb: ~1% compressor energy per 2 psi. 125 → 100 psig = 25 psi ≈ 12.5% of 80 kW, still 10 psi of margin above the 90 psig press.',
    calc(G) {
      const kW = 80 * (25 / 2) / 100;
      return result(G, { kWh: kW * G.hours, kW, cost: 1000 });
    },
    math(G) {
      const kW = 80 * 0.125, kWh = kW * G.hours;
      return [
        'Pressure drop: 125 − 100 = 25 psi',
        'Savings fraction: 25 psi ÷ 2 psi × 1% = 12.5%',
        `Power: 80 kW × 12.5% = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours)} h = ${fmt(kWh)} kWh/yr`,
        ...elecMath(G, kWh, kW),
      ];
    },
    savings: [
      { value: 6240, correct: true },
      { value: 12480, why: 'Used 1% per psi. The rule of thumb is ~1% per 2 psi, so 25 psi ≈ 12.5%, not 25%.' },
      { value: 60000, why: 'That is the kWh/yr (60,000), not dollars.' },
    ],
  },
  {
    id: 'intake',
    zone: 'compressor',
    name: 'Compressor Intake Filter',
    label: 'Intake',
    kind: 'intake',
    pos: [250, 170],
    real: true,
    arTitle: 'Duct compressor intake to outdoor air',
    observed: 'Compressor A draws 95°F room air through its intake filter; annual-average outdoor air is 55°F.',
    readings: [
      { type: 'thermo', name: 'Thermometer at intake', label: 'AIR TEMP @ INTAKE FILTER', value: 95, unit: '°F', target: 'Inside compressor room' },
      { type: 'thermo', name: 'Weather file (TMY3)', label: 'OUTDOOR ANNUAL AVG', value: 55, unit: '°F', target: 'Site weather data' },
      {
        type: 'nameplate', name: 'Filter housing tag', heading: 'INTAKE FILTER — COMP A',
        rows: [['Serves', 'Compressor A (100 hp)'], ['Avg input', '80 kW'], ['Source', 'Room air'], ['Filter ΔP', '0.4 in. w.c. (clean)']],
      },
    ],
    options: [
      { text: 'Duct intake to outdoor air', correct: true },
      { text: 'Change the intake filter more often', why: 'Filter ΔP is only 0.4 in. w.c. (clean). The issue is temperature: hot room air is less dense, so the compressor works harder per CFM.' },
      { text: 'Air-condition the compressor room', why: 'Mechanically cooling the room costs more energy than it saves. Outdoor air is colder on average and free.' },
      { text: NO_ACTION, why: 'Intake air is 40°F hotter than the outdoor annual average — that costs ~8% compressor energy.' },
    ],
    insight: 'Rule of thumb: ~1% compressor energy per 5°F of intake temperature. 95 − 55 = 40°F → 8% of 80 kW.',
    calc(G) {
      const kW = 80 * (40 / 5) / 100;
      return result(G, { kWh: kW * G.hours, kW, cost: 3500 });
    },
    math(G) {
      const kW = 80 * 0.08, kWh = kW * G.hours;
      return [
        'ΔT = 95°F − 55°F = 40°F',
        'Savings fraction: 40 ÷ 5 × 1% = 8%',
        `Power: 80 kW × 8% = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours)} h = ${fmt(kWh)} kWh/yr`,
        ...elecMath(G, kWh, kW),
      ];
    },
    savings: [
      { value: 3994, correct: true },
      { value: 19968, why: 'Used 1% per °F. The rule of thumb is ~1% per 5°F, so 40°F ≈ 8%, not 40%.' },
      { value: 38400, why: 'That is the kWh/yr (38,400), not dollars.' },
    ],
  },
  {
    id: 'compB',
    zone: 'compressor',
    name: 'Compressor B',
    label: 'Comp B',
    kind: 'compressor',
    pos: [200, 340],
    real: false,
    readings: [
      {
        type: 'nameplate', name: 'Compressor nameplate', heading: 'ROTARY SCREW AIR COMPRESSOR',
        rows: [['Model', 'RS-50V'], ['Motor', '50 hp'], ['Control', 'VFD (trim)'], ['Setpoint', '100 psig'], ['Intake', 'Ducted — outdoor air']],
      },
      { type: 'gauge', name: 'Discharge pressure gauge', label: 'COMP B DISCHARGE', min: 0, max: 160, value: 100, unit: 'psig', step: 20 },
      { type: 'thermo', name: 'Thermometer at intake', label: 'AIR TEMP @ INTAKE DUCT', value: 56, unit: '°F', target: 'Ducted from outdoors' },
    ],
    options: [
      { text: NO_ACTION, correct: true },
      { text: 'Duct intake to outdoor air', why: 'It already is — the intake reads 56°F, essentially outdoor air.' },
      { text: 'Lower setpoint to 90 psig', why: 'End uses need 90 psig at the point of use; 100 psig at discharge leaves the normal ~10 psi for distribution and filter drop.' },
      { text: 'Install a VFD', why: 'Read the nameplate — Compressor B is already the VFD trim machine.' },
    ],
    insight: 'VFD trim control, 100 psig setpoint and an outdoor-air intake (56°F) — this is how a trim compressor should be set up.',
  },

  // ================= PRODUCTION FLOOR =================
  {
    id: 'prodLights',
    zone: 'production',
    name: 'Production Lighting',
    label: 'Lights',
    kind: 'fixtures',
    pos: [30, 40],
    real: true,
    arTitle: 'Retrofit production lighting to LED',
    observed: '120 four-lamp F40T12 fixtures on magnetic ballasts drawing 172 W each, operating 6,000 h/yr.',
    readings: [
      {
        type: 'nameplate', name: 'Fixture label', heading: 'FLUORESCENT FIXTURE',
        rows: [['Lamps', 'F40T12 × 4'], ['Ballast', 'Magnetic'], ['Input', '172 W / fixture'], ['Qty (survey)', '120 fixtures']],
      },
      { type: 'light', name: 'Light meter', label: 'WORK-PLANE ILLUMINANCE', value: 48, unit: 'fc', caption: 'Assembly line, 30 in. AFF' },
      {
        type: 'logger', name: 'Lighting logger', label: 'Lights ON vs production',
        unit: '%', ymax: 100,
        series: [100, 100, 100, 100, 100, 0, 0, 100, 100, 100, 100, 100, 0, 0],
        xLabels: ['wk1', '', '', 'wk2', ''],
        caption: 'Lights ON only during production: 6,000 h/yr.',
      },
    ],
    options: [
      { text: 'Retrofit to LED fixtures (70 W)', correct: true },
      { text: 'De-lamp to 2 lamps per fixture', why: 'Halving lamps drops 48 fc to ~24 fc — below task needs — and keeps the lossy magnetic ballasts.' },
      { text: 'Add occupancy sensors', why: 'The logger shows lights already track production hours (6,000 h). The waste is the 172 W T12 wattage, not the hours.' },
      { text: NO_ACTION, why: 'F40T12 lamps on magnetic ballasts are obsolete; a 70 W LED replaces 172 W with equal light.' },
    ],
    insight: 'T12 + magnetic ballast = 172 W/fixture vs 70 W LED. Use the measured input watts (ballast losses included), not 4 × 40 W.',
    calc(G) {
      const kW = 120 * (172 - 70) / 1000;
      return result(G, { kWh: kW * G.hours, kW, cost: 120 * 150 });
    },
    math(G) {
      const kW = 120 * 102 / 1000, kWh = kW * G.hours;
      return [
        'ΔW per fixture: 172 W − 70 W = 102 W',
        `Demand: 120 × 102 W ÷ 1000 = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours)} h = ${fmt(kWh)} kWh/yr`,
        ...elecMath(G, kWh, kW),
        'Cost: 120 fixtures × $150 = $18,000',
      ];
    },
    savings: [
      { value: 7638, correct: true },
      { value: 6739, why: 'Used 4 × 40 W = 160 W and ignored magnetic-ballast losses. The measured input is 172 W per fixture.' },
      { value: 73440, why: 'That is the kWh/yr (73,440), not dollars.' },
    ],
  },
  {
    id: 'procMotor',
    zone: 'production',
    name: 'Process Motor',
    label: 'Motor',
    kind: 'motor',
    pos: [20, 330],
    real: false,
    readings: [
      {
        type: 'nameplate', name: 'Motor nameplate', heading: 'NEMA PREMIUM® EFFICIENCY',
        rows: [['Power', '75 hp'], ['RPM', '1,780'], ['Nom. eff.', '95.0%'], ['Enclosure', 'TEFC'], ['Duty', 'Continuous']],
      },
      {
        type: 'logger', name: 'Power data logger', label: 'Motor load, % of rated, 1 week',
        unit: '%', ymax: 100,
        series: [82, 83, 81, 82, 82, 83, 82, 81, 82, 83, 82, 82],
        xLabels: ['M', 'W', 'F', 'Su'],
        caption: 'Steady 82% load. Constant-speed conveyor drive.',
      },
    ],
    options: [
      { text: NO_ACTION, correct: true },
      { text: 'Replace with NEMA Premium motor', why: 'It already is NEMA Premium at 95.0% nominal efficiency.' },
      { text: 'Downsize the motor', why: 'Motors are most efficient around 75–100% load. 82% is right in the sweet spot; downsizing risks overload.' },
      { text: 'Install a VFD', why: 'The load is a steady constant-speed conveyor at 82%. There is no variable flow to capture — a VFD would add ~3% losses.' },
    ],
    insight: 'NEMA Premium (95.0%) at a steady 82% load sits at the top of the motor efficiency curve. Nothing to gain.',
  },
  {
    id: 'cwPump',
    zone: 'production',
    name: 'Cooling-Water Pump',
    label: 'CW Pump',
    kind: 'pump',
    pos: [210, 330],
    real: false,
    readings: [
      {
        type: 'nameplate', name: 'Pump/drive nameplate', heading: 'CENTRIFUGAL PUMP + DRIVE',
        rows: [['Motor', '25 hp, 1,770 rpm'], ['Drive', 'VFD, PID on ΔP'], ['Design', '600 gpm @ 80 ft']],
      },
      { type: 'gauge', name: 'Valve position indicator', label: 'DISCHARGE VALVE', min: 0, max: 100, value: 100, unit: '% open', step: 25 },
      {
        type: 'logger', name: 'VFD trend', label: 'VFD output speed, 1 week',
        unit: '%', ymax: 100,
        series: [77, 79, 78, 80, 76, 78, 79, 78, 77, 78, 79, 78],
        xLabels: ['M', 'W', 'F', 'Su'],
        caption: 'Average 78% speed, tracking cooling load.',
      },
    ],
    options: [
      { text: NO_ACTION, correct: true },
      { text: 'Install a VFD', why: 'It already has one, running ~78% speed with the valve wide open — exactly right.' },
      { text: 'Throttle the discharge valve', why: 'Throttling adds pressure drop and wastes pump energy. Flow is already controlled by speed.' },
      { text: 'Trim the impeller', why: 'The VFD already matches flow to load; trimming would permanently remove capacity for no added savings.' },
    ],
    insight: 'VFD speed control with the valve 100% open is the efficient way to vary flow — no throttling losses.',
  },

  // ================= BOILER ROOM =================
  {
    id: 'boiler',
    zone: 'boiler',
    name: 'Steam Boiler',
    label: 'Boiler',
    kind: 'boiler',
    pos: [20, 150],
    real: true,
    arTitle: 'Tune burner / O₂ trim to ~15% excess air',
    observed: 'Flue gas O₂ 7.5% (≈45% excess air), stack 450°F, CO low. 5 MMBtu/hr boiler averaging 50% firing rate.',
    readings: [
      {
        type: 'flue', name: 'Flue-gas analyzer', label: 'COMBUSTION ANALYZER',
        rows: [['O₂', '7.5', '%'], ['Excess air', '45', '%'], ['Stack', '450', '°F'], ['CO', '20', 'ppm']],
      },
      {
        type: 'nameplate', name: 'Boiler nameplate', heading: 'FIRETUBE STEAM BOILER',
        rows: [['Input', '5.0 MMBtu/hr'], ['Fuel', 'Natural gas'], ['Pressure', '125 psig MAWP'], ['Burner', 'Linkage, no O₂ trim']],
      },
      {
        type: 'logger', name: 'Firing-rate trend', label: 'Firing rate, % of max',
        unit: '%', ymax: 100,
        series: [48, 52, 50, 49, 51, 50, 52, 48, 50, 51, 49, 50],
        xLabels: ['M', 'W', 'F', 'Su'],
        caption: 'Average 50% firing rate, 6,000 h/yr.',
      },
    ],
    options: [
      { text: 'Tune burner / add O₂ trim (~15% excess air)', correct: true },
      { text: 'Increase excess air to reduce CO', why: 'CO is already low (20 ppm). More air just heats more nitrogen and sends it up the stack.' },
      { text: 'Replace with a larger boiler', why: 'It averages 50% firing — it is already oversized. Bigger would cycle more and lose more.' },
      { text: NO_ACTION, why: '7.5% O₂ ≈ 45% excess air. Well-tuned gas burners run ~15% (≈3% O₂); the extra air is heated and dumped up the stack.' },
    ],
    insight: '7.5% O₂ ≈ 45% excess air. Tuning to ~15% excess air saves ≈2.5% of fuel input. Input = 5 MMBtu/hr × 50% × 6,000 h.',
    calc(G) {
      const fuel = 5 * 0.5 * G.hours;
      return result(G, { mmbtu: fuel * 0.025, cost: 4000 });
    },
    math(G) {
      const fuel = 5 * 0.5 * G.hours, s = fuel * 0.025;
      return [
        `Fuel input: 5 MMBtu/hr × 50% × ${fmt(G.hours)} h = ${fmt(fuel)} MMBtu/yr`,
        `Savings: ${fmt(fuel)} × 2.5% = ${fmt(s)} MMBtu/yr`,
        `Cost savings: ${fmt(s)} MMBtu × $${G.gasRate}/MMBtu = ${money(s * G.gasRate)}/yr`,
      ];
    },
    savings: [
      { value: 3000, correct: true },
      { value: 6000, why: 'Used the full 5 MMBtu/hr rating. The trend shows the boiler averages 50% firing rate.' },
      { value: 30000, why: 'Used 25% instead of 2.5% — a decimal slip worth 10×.' },
    ],
  },
  {
    id: 'steamLine',
    zone: 'boiler',
    name: 'Steam Distribution Line',
    label: 'Steam Line',
    kind: 'pipe',
    pos: [160, 50],
    real: true,
    arTitle: 'Insulate bare steam line',
    observed: '20 ft of bare 4″ steam pipe with a 350°F surface temperature.',
    readings: [
      { type: 'ir', name: 'IR thermometer', label: 'SURFACE TEMP', value: 350, unit: '°F', target: '4″ steam pipe, ε = 0.90' },
      {
        type: 'nameplate', name: 'Line tag / survey', heading: 'STEAM LINE S-2',
        rows: [['Size', '4″ Sch 40'], ['Service', '100 psig steam'], ['Length', '20 ft'], ['Jacket', 'None (bare)']],
      },
    ],
    options: [
      { text: 'Insulate the bare pipe', correct: true },
      { text: 'Replace steam traps', why: 'Failed traps show up as blow-through downstream of a trap. This is a bare pipe surface at 350°F radiating heat.' },
      { text: 'Lower boiler steam pressure', why: 'The process needs 100 psig steam. The bare pipe would still lose heat; insulation is the fix.' },
      { text: NO_ACTION, why: 'A 350°F bare surface is a burn hazard and loses ~1,000 Btu/hr per foot.' },
    ],
    insight: 'Bare 4″ steam pipe at 350°F loses ≈1,000 Btu/hr·ft. Insulation cuts that ~90%; divide by 80% boiler efficiency to get fuel.',
    calc(G) {
      const out = 20 * 1000 * 0.9 * G.hours / 1e6;
      return result(G, { mmbtu: out / 0.8, cost: 600 });
    },
    math(G) {
      const loss = 20 * 1000, saved = loss * 0.9, out = saved * G.hours / 1e6, fuel = out / 0.8;
      return [
        `Bare loss: 20 ft × 1,000 Btu/hr·ft = ${fmt(loss)} Btu/hr`,
        `Avoided: ${fmt(loss)} × 90% = ${fmt(saved)} Btu/hr`,
        `Annual: ${fmt(saved)} × ${fmt(G.hours)} h ÷ 10⁶ = ${fmt(out)} MMBtu/yr (steam)`,
        `Fuel: ${fmt(out)} ÷ 0.80 boiler eff. = ${fmt(fuel)} MMBtu/yr`,
        `Cost savings: ${fmt(fuel)} × $${G.gasRate}/MMBtu = ${money(fuel * G.gasRate)}/yr`,
        'Cost: 20 ft × $30/ft = $600',
      ];
    },
    savings: [
      { value: 1080, correct: true },
      { value: 864, why: 'Forgot boiler efficiency. Each Btu of heat saved avoids 1/0.80 Btu of fuel.' },
      { value: 10800, why: 'Order-of-magnitude slip (e.g., 10,000 Btu/hr·ft). Sanity check: 18,000 Btu/hr × 6,000 h ≈ 108 MMBtu.' },
    ],
  },
  {
    id: 'condensate',
    zone: 'boiler',
    name: 'Condensate Return Line',
    label: 'Condensate',
    kind: 'pipe',
    pos: [160, 430],
    real: false,
    readings: [
      { type: 'ir', name: 'IR thermometer', label: 'SURFACE TEMP', value: 92, unit: '°F', target: 'Jacket surface, ε = 0.90' },
      {
        type: 'nameplate', name: 'Line tag / survey', heading: 'CONDENSATE RETURN C-1',
        rows: [['Size', '2″'], ['Fluid temp', '≈190°F'], ['Insulation', '1.5″ fiberglass'], ['Jacket', 'All-service jacket']],
      },
    ],
    options: [
      { text: NO_ACTION, correct: true },
      { text: 'Insulate the condensate line', why: 'It is already insulated — 1.5″ fiberglass with a 92°F jacket surface on a 190°F fluid.' },
      { text: 'Replace steam traps', why: 'Nothing here points to trap failure — condensate is returning at the expected temperature.' },
      { text: 'Add a second layer of insulation', why: 'Jacket is 92°F — near ambient. Extra thickness would save very little and pay back over decades.' },
    ],
    insight: 'A 92°F jacket over 190°F condensate means the insulation is doing its job.',
  },

  // ================= WAREHOUSE / OFFICE =================
  {
    id: 'whLights',
    zone: 'warehouse',
    name: 'Warehouse High-Bays',
    label: 'High-Bays',
    kind: 'highbay',
    pos: [20, 40],
    real: true,
    arTitle: 'Install occupancy sensors on warehouse high-bays',
    observed: '40 LED high-bays (150 W) burn 24/7 (8,760 h/yr); occupancy logger shows the aisles vacant 35% of the time.',
    readings: [
      {
        type: 'nameplate', name: 'Fixture label', heading: 'LED HIGH-BAY',
        rows: [['Input', '150 W'], ['Qty', '40 fixtures'], ['Control', 'Breaker panel only']],
      },
      {
        type: 'logger', name: 'Lighting logger', label: 'Lights ON, 1 week',
        unit: '%', ymax: 100,
        series: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
        xLabels: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'],
        caption: 'ON 24/7 = 8,760 h/yr.',
      },
      {
        type: 'logger', name: 'Occupancy logger', label: 'Aisle occupancy, 1 week',
        unit: '%', ymax: 100,
        series: [90, 30, 85, 25, 88, 20, 92, 35, 80, 30, 40, 10, 35, 10],
        xLabels: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'],
        caption: 'Vacant 35% of hours.',
      },
    ],
    options: [
      { text: 'Install occupancy sensors', correct: true },
      { text: 'Retrofit to LED', why: 'They are already LED high-bays at 150 W. The waste is hours, not wattage.' },
      { text: 'Remove every other fixture', why: 'Light levels are needed when the aisles are in use. The waste is the 35% of hours the lights burn in an empty warehouse.' },
      { text: NO_ACTION, why: 'Lights on 24/7 in aisles that are vacant 35% of the time — those hours can be switched off.' },
    ],
    insight: 'Lights run all 8,760 h. Sensors cut the 35% vacant hours. Peak demand still occurs while occupied, so no kW-demand credit.',
    calc(G) {
      const kW = 40 * 150 / 1000;
      return result(G, { kWh: kW * G.hours24x7 * 0.35, kW: 0, cost: 40 * 80 });
    },
    math(G) {
      const kW = 6, kWh = kW * G.hours24x7 * 0.35;
      return [
        `Connected load: 40 × 150 W = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours24x7)} h × 35% vacant = ${fmt(kWh)} kWh/yr`,
        'Demand: 0 kW (peak still occurs while occupied)',
        `Total = ${fmt(kWh)} × $${G.elecRate} = ${money(kWh * G.elecRate)}/yr`,
        'Cost: 40 sensors × $80 = $3,200',
      ];
    },
    savings: [
      { value: 1472, correct: true },
      { value: 1008, why: 'Used 6,000 h/yr. These lights run 24/7 — use 8,760 h.' },
      { value: 18396, why: 'That is the kWh/yr (18,396), not dollars.' },
    ],
  },
  {
    id: 'exhaustFan',
    zone: 'warehouse',
    name: 'Exhaust Fan EF-1',
    label: 'Exhaust Fan',
    kind: 'fan',
    pos: [232, 170],
    real: true,
    arTitle: 'Install VFD on exhaust fan, remove damper',
    observed: '50 hp exhaust fan throttled by an outlet damper 55% closed; flow averages 70% of design; measured input 36 kW.',
    readings: [
      {
        type: 'nameplate', name: 'Motor nameplate', heading: 'EXHAUST FAN EF-1',
        rows: [['Motor', '50 hp, 1,780 rpm'], ['Drive', 'Across-the-line'], ['Input @ design flow', '40 kW'], ['Flow ctrl', 'Outlet damper']],
      },
      { type: 'gauge', name: 'Damper position indicator', label: 'OUTLET DAMPER', min: 0, max: 100, value: 55, unit: '% closed', step: 25 },
      {
        type: 'logger', name: 'Flow + power logger', label: 'Airflow, % of design, 1 week',
        unit: '%', ymax: 100,
        series: [72, 68, 70, 71, 69, 70, 72, 68, 70, 71, 69, 70],
        xLabels: ['M', 'W', 'F', 'Su'],
        caption: 'Avg flow 70% of design · measured input 36 kW.',
      },
    ],
    options: [
      { text: 'Install VFD and remove damper', correct: true },
      { text: 'Close the damper further', why: 'Damper throttling barely reduces fan power — it burns energy as pressure drop. Speed control is the fix.' },
      { text: 'Replace with a premium-efficiency motor', why: 'A motor upgrade gains a few %. Slowing the fan to 70% speed cuts power ~60% (cube law).' },
      { text: NO_ACTION, why: 'A fan throttled to 70% flow by a 55%-closed damper is the textbook VFD opportunity.' },
    ],
    insight: 'Fan affinity law: P ∝ speed³. At 70% flow: 40 kW × 0.70³ ÷ 0.93 VFD eff ≈ 14.8 kW vs 36 kW measured with the damper.',
    calc(G) {
      const kW = 36 - 40 * Math.pow(0.7, 3) / 0.93;
      return result(G, { kWh: kW * G.hours, kW, cost: 14000 });
    },
    math(G) {
      const pv = 40 * Math.pow(0.7, 3) / 0.93, kW = 36 - pv, kWh = kW * G.hours;
      return [
        `VFD power: 40 kW × 0.70³ ÷ 0.93 = ${fmt(pv, 2)} kW`,
        `Savings: 36 kW (damper) − ${fmt(pv, 2)} kW = ${fmt(kW, 2)} kW`,
        `kWh: ${fmt(kW, 2)} kW × ${fmt(G.hours)} h = ${fmt(kWh)} kWh/yr`,
        ...elecMath(G, kWh, kW),
      ];
    },
    savings: [
      { value: 13258, correct: true },
      { value: 3677, why: 'Used a linear speed–power relationship. Fan power follows the cube law: 0.70³ = 0.343, not 0.70.' },
      { value: 127484, why: 'That is the kWh/yr (127,484), not dollars.' },
    ],
  },
  {
    id: 'officeLights',
    zone: 'warehouse',
    name: 'Office Lighting',
    label: 'Office',
    kind: 'troffer',
    pos: [20, 380],
    real: false,
    readings: [
      {
        type: 'nameplate', name: 'Fixture label', heading: 'LED TROFFER 2×4',
        rows: [['Input', '32 W'], ['Efficacy', '130 lm/W'], ['Control', 'Occupancy sensor (installed)']],
      },
      { type: 'light', name: 'Light meter', label: 'DESK ILLUMINANCE', value: 42, unit: 'fc', caption: 'IES office target 30–50 fc' },
      {
        type: 'logger', name: 'Lighting vs occupancy', label: 'Lights ON tracks occupancy',
        unit: '%', ymax: 100,
        series: [0, 100, 100, 0, 0, 100, 100, 0, 0, 100, 0, 0, 0, 0],
        xLabels: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'],
        caption: 'Lights OFF whenever offices are empty.',
      },
    ],
    options: [
      { text: NO_ACTION, correct: true },
      { text: 'Retrofit to LED', why: 'They are already 32 W LED troffers.' },
      { text: 'Install occupancy sensors', why: 'Sensors are already installed — the logger shows lights switching off when offices empty.' },
      { text: 'De-lamp to reduce light level', why: '42 fc is within the IES 30–50 fc office target; de-lamping would under-light desks.' },
    ],
    insight: 'LED troffers with working occupancy sensors, delivering 42 fc — already best practice.',
  },
];

/** Maximum possible $ (all real findings, correct estimates). */
export const MAX_DOLLARS = EQUIPMENT.filter((e) => e.real).reduce((s, e) => s + e.calc(GLOBALS).dollars, 0);

export const GRADES = [
  { min: 0.9, name: 'Lead Assessor' },
  { min: 0.75, name: 'Senior Assessor' },
  { min: 0.55, name: 'Assessor' },
  { min: 0.35, name: 'Assessor-in-Training' },
  { min: 0, name: 'Rookie' },
];
/** Grade index = 70% $ captured share + 30% diagnosis accuracy. */
export function gradeFor(dollars, accuracy) {
  const idx = 0.7 * (dollars / MAX_DOLLARS) + 0.3 * accuracy;
  return { idx, ...GRADES.find((g) => idx >= g.min) };
}
