// End-to-end: screenshot every screen and play a full game, failing on any console error.
import { test, expect } from '@playwright/test';
import { EQUIPMENT, ZONES, GLOBALS, MAX_DOLLARS } from '../js/equipment.js';

const WRONG_DIAG = 'cwPump';    // decoy: pick a wrong action (−30 s)
const WRONG_SAVINGS = 'header'; // real: pick the common-mistake $ (half credit)

function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  return errors;
}

test('full plant walk', async ({ page }, info) => {
  const errors = watchErrors(page);
  let n = 0;
  const shot = async (name, opts = {}) => {
    n++;
    await page.screenshot({ path: `tests/screenshots/${info.project.name}/${String(n).padStart(2, '0')}-${name}.png`, ...opts });
  };

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#screen-title')).toBeVisible();
  await shot('title');

  await page.click('#btn-howto');
  await expect(page.locator('#modal-howto')).toBeVisible();
  await shot('howto');
  await page.click('#modal-howto [data-close]');

  await page.click('#btn-board');
  await expect(page.locator('#modal-board')).toBeVisible();
  await shot('leaderboard-empty');
  await page.click('#modal-board [data-close]');

  await page.click('#btn-start');
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#timer')).toHaveText(/^[56]:\d\d$/);

  for (const z of ZONES) {
    await page.click(`.zone-tab[data-zone="${z.id}"]`);
    await expect(page.locator('.equip')).toHaveCount(EQUIPMENT.filter((e) => e.zone === z.id).length);
    await shot(`zone-${z.id}`);
  }

  let expected = 0;
  let i = 0;
  for (const e of EQUIPMENT) {
    i++;
    await page.click(`.zone-tab[data-zone="${e.zone}"]`);
    await page.click(`.equip[data-id="${e.id}"]`);
    const sheet = page.locator('#sheet');
    await expect(sheet.locator('.sh-name')).toHaveText(e.name);

    // diagnosis is locked until every instrument has been read
    await expect(sheet.locator('[data-act="diag"]').first()).toBeDisabled();
    if (i === 1) await shot(`covered-${e.id}`);
    for (let k = 0; k < e.readings.length; k++) {
      await sheet.locator('[data-act="reveal"]').first().click();
    }
    await expect(sheet.locator('.reading.revealed')).toHaveCount(e.readings.length);
    await page.waitForTimeout(400);
    await sheet.locator('.reading.revealed').first().scrollIntoViewIfNeeded();
    await shot(`inspect-${e.id}`);

    const correctIdx = e.options.findIndex((o) => o.correct);
    const pick = e.id === WRONG_DIAG ? e.options.findIndex((o) => !o.correct) : correctIdx;
    await sheet.locator(`[data-act="diag"][data-i="${pick}"]`).click();
    await expect(sheet.locator('.fb').first()).toBeVisible();
    if (e.id === WRONG_DIAG) {
      await expect(sheet.locator('.fb.bad')).toContainText('−30 s');
      await page.waitForTimeout(500);
      await sheet.locator('.fb.bad').scrollIntoViewIfNeeded();
      await shot(`wrong-diagnosis-${e.id}`);
    } else if (!e.real) {
      await expect(sheet.locator('.fb.good')).toContainText('Good call');
      if (e.id === 'compB') { await sheet.locator('.fb.good').scrollIntoViewIfNeeded(); await shot(`decoy-good-call-${e.id}`); }
    }

    if (e.real && pick === correctIdx) {
      const truth = e.calc(GLOBALS).dollars;
      const s = e.id === WRONG_SAVINGS
        ? e.savings.find((x) => !x.correct && x.value / truth < 5)
        : e.savings.find((x) => x.correct);
      if (e.id === 'compA') { await sheet.locator('#step-quant').scrollIntoViewIfNeeded(); await shot(`quantify-${e.id}`); }
      await sheet.locator(`[data-act="quant"][data-value="${s.value}"]`).click();
      await expect(sheet.locator('.ar-card')).toBeVisible();
      expected += s.correct ? truth : Math.round(truth / 2);
      await sheet.locator('details.math summary').click();
      await expect(sheet.locator('details.math li').first()).toBeVisible();
      await page.waitForTimeout(300);
      await sheet.locator('.ar-card').scrollIntoViewIfNeeded();
      await shot(`ar-card-${e.id}`);
    }

    await sheet.locator('.sheet-foot [data-act="close"]').click();
    if (i === 3) {
      await page.click('#btn-hint');
      await expect(page.locator('#toast')).toContainText('Hint');
      await shot('hint');
    }
    if (i === 6) await shot('floor-progress');
  }

  await expect(page.locator('#screen-end')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(2500); // let confetti settle
  await shot('end-top');
  await shot('end-full', { fullPage: true });

  const header = EQUIPMENT.find((e) => e.id === WRONG_SAVINGS);
  expect(expected).toBe(MAX_DOLLARS - header.calc(GLOBALS).dollars + Math.round(header.calc(GLOBALS).dollars / 2));
  await expect(page.locator('.g-sub')).toContainText('$' + expected.toLocaleString('en-US'));
  await expect(page.locator('.stat').first()).toContainText('92%'); // 12 of 13 diagnoses right
  await expect(page.locator('.ar-table tbody tr')).toHaveCount(8);
  await expect(page.locator('.ar-table .half')).toHaveCount(1);

  await page.fill('#initials', 'ucr');
  await page.click('#btn-save');
  await expect(page.locator('#end-board .board li.me')).toContainText('UCR');
  await page.locator('#end-board').scrollIntoViewIfNeeded();
  await shot('end-leaderboard');

  await page.click('#btn-menu');
  await page.click('#btn-board');
  await expect(page.locator('#board-list li')).toHaveCount(1);
  await shot('leaderboard-filled');
  await page.click('#modal-board [data-close]');

  await page.click('#btn-start');
  await expect(page.locator('#timer')).toHaveText(/^[56]:\d\d$/);
  await expect(page.locator('#ticker')).toHaveText('$0');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('timer runs out to the end screen', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.clock.install();
  await page.goto('/');
  await page.click('#btn-start');
  await page.clock.runFor(6 * 60 * 1000 + 500);
  await expect(page.locator('#overlay-msg')).toContainText('Time');
  await page.screenshot({ path: `tests/screenshots/${info.project.name}/99-times-up.png` });
  await page.clock.runFor(2000);
  await expect(page.locator('#screen-end')).toBeVisible();
  await expect(page.locator('.g-name')).toHaveText('Rookie');
  expect(errors, errors.join('\n')).toEqual([]);
});
