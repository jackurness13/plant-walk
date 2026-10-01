// Unit tests: every savings calculation, independently re-derived, and every answer key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, GLOBALS as G, ZONES, NO_ACTION, MAX_DOLLARS, gradeFor } from '../js/equipment.js';

const byId = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));
const $perKWyr = G.demandRate * 12; // $144 per kW-yr
const elec = (kWh, kW) => kWh * G.elecRate + kW * $perKWyr;

// Independent derivations straight from the brief (do NOT call item.calc here).
const EXPECTED = {
  compA: () => { const kW = (6.5 + 26 + 104) * 0.2; return { kWh: kW * 6000, kW, $: elec(kW * 6000, kW) }; },
  header: () => { const kW = 80 * (125 - 100) / 2 * 0.01; return { kWh: kW * 6000, kW, $: elec(kW * 6000, kW) }; },
  intake: () => { const kW = 80 * (95 - 55) / 5 * 0.01; return { kWh: kW * 6000, kW, $: elec(kW * 6000, kW) }; },
  exhaustFan: () => { const kW = 36 - (40 * 0.7 ** 3) / 0.93; return { kWh: kW * 6000, kW, $: elec(kW * 6000, kW) }; },
  prodLights: () => { const kW = (120 * (172 - 70)) / 1000; return { kWh: kW * 6000, kW, $: elec(kW * 6000, kW) }; },
  whLights: () => { const kWh = 40 * 0.15 * 8760 * 0.35; return { kWh, kW: 0, $: kWh * G.elecRate }; },
  boiler: () => { const mm = 5 * 0.5 * 6000 * 0.025; return { mmbtu: mm, $: mm * G.gasRate }; },
  steamLine: () => { const mm = (20 * 1000 * 0.9 * 6000) / 1e6 / 0.8; return { mmbtu: mm, $: mm * G.gasRate }; },
};

// The "common mistake" distractors, re-derived so the wrong answers are wrong for a stated reason.
const MISTAKES = {
  compA: 27.3 * 6000 * G.elecRate,                               // forgot demand
  header: 80 * 0.25 * (6000 * G.elecRate + $perKWyr),            // 1%/psi instead of 1%/2 psi
  intake: 80 * 0.40 * (6000 * G.elecRate + $perKWyr),            // 1%/°F instead of 1%/5°F
  exhaustFan: (36 - (40 * 0.7) / 0.93) * (6000 * G.elecRate + $perKWyr), // linear instead of cube law
  prodLights: (120 * (160 - 70) / 1000) * (6000 * G.elecRate + $perKWyr), // ignored ballast losses
  whLights: 6 * 6000 * 0.35 * G.elecRate,                        // 6,000 h instead of 8,760 h
  boiler: 5 * 6000 * 0.025 * G.gasRate,                          // forgot 50% firing rate
  steamLine: (20 * 1000 * 0.9 * 6000) / 1e6 * G.gasRate,         // forgot boiler efficiency
};

test('globals match the brief', () => {
  assert.deepEqual([G.hours, G.elecRate, G.demandRate, G.gasRate], [6000, 0.08, 12, 8]);
});

test('13 items: 8 real findings + 5 decoys, 3–4 per zone', () => {
  assert.equal(EQUIPMENT.length, 13);
  assert.equal(EQUIPMENT.filter((e) => e.real).length, 8);
  assert.equal(EQUIPMENT.filter((e) => !e.real).length, 5);
  for (const z of ZONES) {
    const n = EQUIPMENT.filter((e) => e.zone === z.id).length;
    assert.ok(n >= 3 && n <= 4, `${z.id} has ${n} items`);
  }
  assert.equal(new Set(EQUIPMENT.map((e) => e.id)).size, 13);
});

for (const [id, f] of Object.entries(EXPECTED)) {
  test(`savings calc: ${id}`, () => {
    const e = byId[id];
    const exp = f();
    const got = e.calc(G);
    assert.equal(got.dollars, Math.round(exp.$), 'annual $');
    if (exp.kWh !== undefined) assert.equal(got.kWh, Math.round(exp.kWh), 'kWh/yr');
    if (exp.kW !== undefined) assert.ok(Math.abs(got.kW - exp.kW) < 0.01, 'kW');
    if (exp.mmbtu !== undefined) assert.equal(got.mmbtu, Math.round(exp.mmbtu), 'MMBtu/yr');
    assert.ok(got.cost > 0, 'implementation cost');
    assert.ok(Math.abs(got.payback - got.cost / got.dollars) < 0.006, 'payback');
  });

  test(`answer key: ${id} correct $ option equals computed value`, () => {
    const e = byId[id];
    const correct = e.savings.filter((s) => s.correct);
    assert.equal(correct.length, 1);
    assert.equal(correct[0].value, e.calc(G).dollars);
  });

  test(`distractors: ${id} has one common-mistake value and one ~10× value`, () => {
    const e = byId[id];
    const truth = e.calc(G).dollars;
    const wrong = e.savings.filter((s) => !s.correct);
    assert.equal(e.savings.length, 3);
    assert.equal(new Set(e.savings.map((s) => s.value)).size, 3, 'values distinct');
    assert.ok(wrong.every((s) => typeof s.why === 'string' && s.why.length > 10), 'each wrong value explained');
    assert.ok(wrong.some((s) => s.value === Math.round(MISTAKES[id])), `mistake value ${Math.round(MISTAKES[id])}`);
    const ratios = wrong.map((s) => s.value / truth);
    assert.ok(ratios.some((r) => r > 7 && r < 13), `one option ~10× (ratios ${ratios.map((r) => r.toFixed(2))})`);
  });

  test(`show-math: ${id} ends at the computed $`, () => {
    const e = byId[id];
    const lines = e.math(G).join('\n');
    assert.ok(lines.includes('$' + e.calc(G).dollars.toLocaleString('en-US')), lines);
  });
}

test('every item: 4 diagnosis options, exactly one correct, includes "Already efficient"', () => {
  for (const e of EQUIPMENT) {
    assert.equal(e.options.length, 4, e.id);
    assert.equal(e.options.filter((o) => o.correct).length, 1, e.id);
    assert.equal(e.options.filter((o) => o.text === NO_ACTION).length, 1, e.id);
    const right = e.options.find((o) => o.correct);
    assert.equal(right.text === NO_ACTION, !e.real, `${e.id}: "already efficient" is correct iff decoy`);
    for (const o of e.options.filter((x) => !x.correct)) assert.ok(o.why, `${e.id}: wrong option needs a why`);
    assert.ok(e.readings.length >= 2 && e.readings.length <= 3, `${e.id} readings`);
    assert.ok(e.insight);
  }
});

test('max $ and grading', () => {
  assert.equal(MAX_DOLLARS, 17035 + 6240 + 3994 + 13258 + 7638 + 1472 + 3000 + 1080);
  assert.equal(gradeFor(MAX_DOLLARS, 1).name, 'Lead Assessor');
  assert.equal(gradeFor(0, 0).name, 'Rookie');
});
