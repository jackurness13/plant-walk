# Plant Walk: U-CREW Energy Assessment Challenge

A mobile-first web game for energy-engineering students. You have **6 minutes** to walk a manufacturing plant.
None of the waste is visible. You find it by reading instrument data, diagnosing the right action, and estimating the annual savings.

**Play:** https://jackurness13.github.io/plant-walk/

## How it plays
- **4 zones** (Compressor Room, Production Floor, Boiler Room, Warehouse/Office) hold **13 items**: 8 real findings and 5 decoys.
- **Inspect:** tap each instrument to read it (nameplate, analog gauge, data logger, IR/air thermometer, light meter, ultrasonic detector, flue-gas analyzer). Diagnosis stays locked until every reading has been revealed.
- **Diagnose:** there are 4 options. A wrong choice costs −30 s, shakes the panel, explains why it was wrong, and closes the item. Correctly calling a decoy "Already efficient" earns +15 s.
- **Quantify** (real findings only): there are 3 $/yr options. The right one earns full credit and a wrong one earns half. You then see an AR card (kWh or MMBtu, kW, $/yr, cost, payback) with a "Show math" section.
- **Hint** (−30 s) tells you which zone still has an undiagnosed real finding.
- **End screen:** grade, totals, an AR summary table, missed findings with the reasoning and math, false alarms, and a local top-10 leaderboard.

## Files
| Path | Purpose |
|---|---|
| `index.html` | All screens and modals |
| `css/style.css` | Dark industrial theme with U of U red. Bottom sheet on phones, side panel at ≥900 px |
| `js/equipment.js` | **One config array** covering equipment, readings, options, explanations, formulas (`calc`, `math`), $ options, and grading |
| `js/instruments.js` | Inline-SVG instrument renderers |
| `js/scenes.js` | Inline-SVG zone scenes. All equipment drawings are generic, with no visual tells |
| `js/main.js` | Game state, UI, timer, scoring, and leaderboard |
| `js/audio.js` / `js/confetti.js` | Web Audio synth sounds (with a mute toggle) and canvas confetti |
| `tests/calc.test.mjs` | Node unit tests. Each savings calculation is re-derived independently, and the answer keys and distractors are checked |
| `tests/game.spec.mjs` | Playwright tests at 390×844 and 1280×800: screenshots every screen and plays a full game (1 wrong diagnosis, 1 wrong estimate) and a timeout. Any console error fails the test |

There is no build step. To run it locally: `npm run serve` then open http://localhost:4173. Tests: `npm install && npx playwright install chromium && npm test`.

## Savings (globals: 6,000 h/yr, $0.08/kWh, $12/kW-month, $8/MMBtu)
| # | Finding | Basis | $/yr | Cost | Payback |
|---|---|---|---|---|---|
| 1 | Repair air leaks (Comp A) | (6.5+26+104) CFM × 0.20 kW/CFM = 27.3 kW | 17,035 | 2,500 | 0.15 yr |
| 2 | Lower header 125→100 psig | 25 psi ÷ 2 × 1% = 12.5% × 80 kW | 6,240 | 1,000 | 0.16 yr |
| 3 | Duct intake outdoors (95→55°F) | 40°F ÷ 5 × 1% = 8% × 80 kW | 3,994 | 3,500 | 0.88 yr |
| 4 | Exhaust fan VFD | 36 kW − 40 kW × 0.7³ ÷ 0.93 | 13,258 | 14,000 | 1.06 yr |
| 5 | LED retrofit | 120 × (172 − 70) W | 7,638 | 18,000 | 2.36 yr |
| 6 | Warehouse occupancy sensors | 6 kW × 8,760 h × 35%, no demand credit | 1,472 | 3,200 | 2.17 yr |
| 7 | Boiler tune / O₂ trim | 5 MMBtu/hr × 50% × 6,000 h × 2.5% | 3,000 | 4,000 | 1.33 yr |
| 8 | Insulate steam line | 20 ft × 1,000 Btu/hr·ft × 90% × 6,000 h ÷ 0.80 | 1,080 | 600 | 0.56 yr |
| | **Total possible** | | **53,717** | | |

Each wrong $ option has a named cause: one is a common mistake (forgot demand, 1%/psi, 1%/°F, linear fan law, ignored ballast watts, 6,000 h instead of 8,760, forgot 50% firing, forgot boiler efficiency) and the other is roughly 10× off (usually kWh reported as dollars, or a decimal slip).

## Assumptions
1. **Compressor A's input power is 80 kW** (a measured average for the 100 hp unit). The pressure and intake findings both apply to it. The game shows this value on the readings.
2. Interactions between measures are ignored, as in a typical AR list. For example, fixing leaks would slightly reduce the pressure and intake savings.
3. Leaks, pressure, and intake are counted at 6,000 h/yr (the global default), not 8,760 h.
4. **Exhaust fan:** design-flow input is 40 kW and measured input with the damper is 36 kW. After the VFD: 40 × 0.7³ ÷ 0.93.
5. Occupancy sensors get **no demand credit**, because the facility peak still happens while the space is occupied.
6. Electric demand savings are credited for 12 months at $12/kW-month.
7. Implementation costs are rough typical values: leaks $2.5k, pressure $1k, intake duct $3.5k, VFD $14k, LED $150/fixture, sensors $80 each, burner tune/O₂ trim $4k, insulation $30/ft.
8. The exhaust fan sits in the Warehouse/Office zone and the cooling-water pump on the Production Floor, so each zone has 3–4 items (4/3/3/3).
9. A wrong diagnosis closes the item. Otherwise players could brute-force the options at 30 s apiece, and the game is meant to reward knowledge. The missed finding is revealed on the end screen.
10. Diagnosis unlocks only after every instrument on an item has been read.
11. Grade index = 70% × (share of $ captured) + 30% × diagnosis accuracy. Lead Assessor ≥ 0.90, Senior ≥ 0.75, Assessor ≥ 0.55, Assessor-in-Training ≥ 0.35, otherwise Rookie.
12. The clock stops once all 13 items are resolved. Remaining time is shown on the end screen but does not add to the score.
13. The leaderboard is per device (localStorage). With a live audience on their own phones, every phone keeps its own board.
14. Answer order is shuffled each game, so neighbours can't copy positions.
15. Only system fonts are used (no CDNs). SVG text that might overflow on devices without condensed fonts is compressed with `textLength`.
