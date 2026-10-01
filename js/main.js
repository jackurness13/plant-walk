import { EQUIPMENT, ZONES, GLOBALS, MAX_DOLLARS, NO_ACTION, fmt, money, gradeFor } from './equipment.js';
import { renderInstrument, INSTRUMENT_META, INSTRUMENT_DEFS } from './instruments.js';
import { renderScene } from './scenes.js';
import * as audio from './audio.js';
import { burst } from './confetti.js';

const GAME_MS = 6 * 60 * 1000;
const PENALTY_MS = 30 * 1000;
const BONUS_MS = 15 * 1000;
const LB_KEY = 'plantwalk.leaderboard.v1';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const byId = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));

let S = null; // game state
let timerHandle = 0;

// ---------------------------------------------------------------- helpers
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
function show(screenId) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === screenId));
  window.scrollTo(0, 0);
}
function toast(msg, kind = '') {
  const t = $('#toast');
  t.className = `toast show ${kind}`;
  t.innerHTML = msg;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => (t.className = 'toast'), 3200);
}
function floatPenalty(text, kind) {
  const el = $('#float-pen');
  el.textContent = text;
  el.className = `float-pen go ${kind}`;
  clearTimeout(floatPenalty._h);
  floatPenalty._h = setTimeout(() => (el.className = 'float-pen'), 1300);
}
function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// ---------------------------------------------------------------- state
function newGame() {
  S = {
    phase: 'play',
    timeLeft: GAME_MS,
    last: performance.now(),
    zone: ZONES[0].id,
    current: null,
    dollars: 0,
    shownDollars: 0,
    diagMade: 0,
    diagRight: 0,
    hints: 0,
    items: Object.fromEntries(
      EQUIPMENT.map((e) => [e.id, {
        revealed: new Set(),
        order: shuffle(e.options.map((_, i) => i)),
        sOrder: e.savings ? shuffle(e.savings.map((_, i) => i)) : [],
        diag: null, // index chosen
        quant: null, // index chosen
        dollars: 0,
        open: false, // math expander
      }]),
    ),
  };
}
const itemState = (id) => S.items[id];
const isDiagCorrect = (e, st) => st.diag !== null && e.options[st.diag].correct === true;
function isResolved(e) {
  const st = itemState(e.id);
  if (st.diag === null) return false;
  if (!e.real || !isDiagCorrect(e, st)) return true;
  return st.quant !== null;
}
function sceneStatus(e) {
  const st = itemState(e.id);
  if (!isResolved(e)) return 'open';
  if (!isDiagCorrect(e, st)) return 'bad';
  if (e.real && !e.savings[st.quant].correct) return 'partial';
  return 'good';
}
const resolvedCount = () => EQUIPMENT.filter(isResolved).length;

// ---------------------------------------------------------------- HUD + timer
function tick() {
  if (!S || S.phase !== 'play') return;
  const now = performance.now();
  const dt = now - S.last;
  S.last = now;
  const before = Math.ceil(S.timeLeft / 1000);
  S.timeLeft -= dt;
  const after = Math.ceil(S.timeLeft / 1000);
  if (after !== before && after <= 10 && after > 0) audio.play('tick');
  // animate $ ticker
  if (S.shownDollars !== S.dollars) {
    const diff = S.dollars - S.shownDollars;
    S.shownDollars = Math.abs(diff) < 20 ? S.dollars : S.shownDollars + diff * 0.18;
  }
  renderHud();
  if (S.timeLeft <= 0) {
    S.timeLeft = 0;
    renderHud();
    finish('time');
  }
}
function renderHud() {
  $('#timer').textContent = fmtTime(S.timeLeft);
  $('#hud-timer').classList.toggle('low', S.timeLeft <= 60000);
  $('#ticker').textContent = money(S.shownDollars);
  $('#resolved').textContent = `${resolvedCount()}/${EQUIPMENT.length}`;
  const hintAvail = EQUIPMENT.some((e) => e.real && itemState(e.id).diag === null);
  $('#btn-hint').disabled = !hintAvail || S.phase !== 'play';
}
function adjustTime(ms) {
  S.timeLeft = Math.max(0, S.timeLeft + ms);
  floatPenalty(`${ms > 0 ? '+' : '−'}${Math.abs(ms / 1000)} s`, ms > 0 ? 'plus' : 'minus');
  const t = $('#hud-timer');
  t.classList.remove('flash-plus', 'flash-minus');
  void t.offsetWidth;
  t.classList.add(ms > 0 ? 'flash-plus' : 'flash-minus');
  renderHud();
}
function renderMute() {
  const m = audio.isMuted();
  $('#mute-ico').textContent = m ? '✕' : '♪';
  $('#mute-lbl').textContent = m ? 'Muted' : 'Sound';
  $('#btn-mute').setAttribute('aria-pressed', String(m));
}

// ---------------------------------------------------------------- zones + scene
function renderZones() {
  $('#zones').innerHTML = ZONES.map((z) => {
    const items = EQUIPMENT.filter((e) => e.zone === z.id);
    const done = items.filter(isResolved).length;
    return `<button role="tab" class="zone-tab ${z.id === S.zone ? 'active' : ''} ${S.hinted === z.id ? 'hinted' : ''}" data-zone="${z.id}" aria-selected="${z.id === S.zone}">
      <span class="zn">${esc(z.name)}</span><span class="zs">${esc(z.short)}</span><span class="zc">${done}/${items.length}</span></button>`;
  }).join('');
}
function renderSceneView() {
  const items = EQUIPMENT.filter((e) => e.zone === S.zone);
  $('#scene').innerHTML = renderScene(S.zone, items, (id) => sceneStatus(byId[id])) +
    '<p class="scene-cap">Tap equipment to inspect · <span class="dot"></span> = not yet resolved</p>';
}
function setZone(z) {
  S.zone = z;
  renderZones();
  renderSceneView();
}

// ---------------------------------------------------------------- inspection sheet
function openItem(id) {
  S.current = id;
  const e = byId[id];
  if (e.zone !== S.zone) setZone(e.zone);
  renderSheet();
  $('#sheet').classList.add('open');
  document.body.classList.add('sheet-open');
  $('#sheet').scrollTop = 0;
}
function closeSheet() {
  S.current = null;
  $('#sheet').classList.remove('open');
  document.body.classList.remove('sheet-open');
  renderSheet();
  if (S.phase !== 'over' && resolvedCount() === EQUIPMENT.length) finish('complete');
}

function renderSheet(focus) {
  const sheet = $('#sheet');
  if (!S || !S.current) {
    sheet.innerHTML = `<div class="sheet-empty"><div class="big">Tap any equipment to inspect it</div>
      <p>Read every instrument, then diagnose. Nothing on the floor looks wasteful — the numbers are your only clue.</p></div>`;
    return;
  }
  const e = byId[S.current];
  const st = itemState(e.id);
  const zone = ZONES.find((z) => z.id === e.zone);
  const allRead = st.revealed.size === e.readings.length;
  const resolved = isResolved(e);
  let html = `<div class="sheet-head">
      <div><div class="sh-zone">${esc(zone.name)}</div><h2 class="sh-name">${esc(e.name)}</h2></div>
      <button class="btn-close" data-act="close" aria-label="Back to plant">✕</button>
    </div>`;

  // 1 · INSPECT
  html += `<section class="step"><h3><span class="num">1</span>Inspect <small>${st.revealed.size}/${e.readings.length} read</small></h3><div class="readings">`;
  e.readings.forEach((r, i) => {
    const meta = INSTRUMENT_META[r.type];
    html += st.revealed.has(i)
      ? `<figure class="reading revealed ${focus === `r${i}` ? 'just' : ''}"><figcaption>${esc(r.name)}</figcaption>${renderInstrument(r)}</figure>`
      : `<button class="reading covered" data-act="reveal" data-i="${i}"><span class="ri">${meta.icon}</span>
          <span class="rn">${esc(r.name)}</span><span class="rv">${meta.verb} ›</span></button>`;
  });
  html += `</div></section>`;

  // 2 · DIAGNOSE
  html += `<section class="step ${allRead ? '' : 'locked'}" id="step-diag"><h3><span class="num">2</span>Diagnose</h3>`;
  if (!allRead) html += `<p class="hint-line">Read all ${e.readings.length} instruments to unlock diagnosis.</p>`;
  html += `<div class="opts">`;
  st.order.forEach((oi) => {
    const o = e.options[oi];
    let cls = '';
    if (st.diag !== null) {
      if (oi === st.diag) cls = o.correct ? 'right' : 'wrong';
      else cls = 'dim';
    }
    html += `<button class="opt ${cls} ${o.text === NO_ACTION ? 'noact' : ''}" data-act="diag" data-i="${oi}" ${!allRead || st.diag !== null ? 'disabled' : ''}>${esc(o.text)}</button>`;
  });
  html += `</div>`;
  if (st.diag !== null) {
    const o = e.options[st.diag];
    if (o.correct && e.real) {
      html += `<div class="fb good"><b>Correct diagnosis.</b> ${esc(e.insight)}</div>`;
    } else if (o.correct) {
      html += `<div class="fb good"><b>Good call! +15 s.</b> ${esc(e.insight)}</div>`;
    } else {
      html += `<div class="fb bad"><b>Not quite. −30 s.</b> ${esc(o.why)} <span class="fb-note">${e.real ? 'This finding is lost — the answer is revealed at the end.' : 'False alarm — this item is closed.'}</span></div>`;
    }
  }
  html += `</section>`;

  // 3 · QUANTIFY
  if (e.real && isDiagCorrect(e, st)) {
    html += `<section class="step" id="step-quant"><h3><span class="num">3</span>Quantify annual savings</h3>
      <p class="hint-line">6,000 h/yr · $0.08/kWh · $12/kW-mo · $8/MMBtu</p><div class="opts money-opts">`;
    st.sOrder.forEach((si) => {
      const s = e.savings[si];
      let cls = '';
      if (st.quant !== null) cls = si === st.quant ? (s.correct ? 'right' : 'wrong') : s.correct ? 'reveal' : 'dim';
      html += `<button class="opt money ${cls}" data-act="quant" data-i="${si}" data-value="${s.value}" ${st.quant !== null ? 'disabled' : ''}>${money(s.value)}<small>/yr</small></button>`;
    });
    html += `</div>`;
    if (st.quant !== null) {
      const s = e.savings[st.quant];
      html += s.correct
        ? `<div class="fb good"><b>Ka-ching! +${money(st.dollars)}/yr.</b></div>`
        : `<div class="fb warn"><b>Half credit: +${money(st.dollars)}/yr.</b> ${esc(s.why)}</div>`;
      html += arCard(e, st);
    }
    html += `</section>`;
  }

  html += `<div class="sheet-foot"><button class="btn ${resolved ? 'btn-primary' : 'btn-ghost'}" data-act="close">${
    resolved && resolvedCount() === EQUIPMENT.length ? 'See results →' : '← Back to plant'}</button></div>`;
  sheet.innerHTML = html;
}

function arCard(e, st) {
  const c = e.calc(GLOBALS);
  const n = EQUIPMENT.filter((x) => x.real).indexOf(e) + 1;
  return `<div class="ar-card">
    <div class="ar-head"><span class="ar-tag">AR #${n}</span><span class="ar-title">${esc(e.arTitle)}</span></div>
    <p class="ar-obs"><b>Observed:</b> ${esc(e.observed)}</p>
    <dl class="ar-grid">
      ${c.kWh ? `<div><dt>Energy</dt><dd>${fmt(c.kWh)} <small>kWh/yr</small></dd></div>` : ''}
      ${c.mmbtu ? `<div><dt>Fuel</dt><dd>${fmt(c.mmbtu)} <small>MMBtu/yr</small></dd></div>` : ''}
      ${!c.mmbtu ? `<div><dt>Demand</dt><dd>${fmt(c.kW, 1)} <small>kW</small></dd></div>` : ''}
      <div><dt>Savings</dt><dd class="hl">${money(c.dollars)} <small>/yr</small></dd></div>
      <div><dt>Impl. cost</dt><dd>${money(c.cost)}</dd></div>
      <div><dt>Payback</dt><dd>${c.payback < 1 ? `${fmt(c.payback * 12, 0)} <small>months</small>` : `${fmt(c.payback, 1)} <small>yr</small>`}</dd></div>
    </dl>
    <details class="math" ${st.open ? 'open' : ''}><summary>Show math</summary><ol>${e.math(GLOBALS).map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>
  </div>`;
}

function reveal(i) {
  const st = itemState(S.current);
  if (st.revealed.has(i)) return;
  st.revealed.add(i);
  audio.play('reveal');
  renderSheet(`r${i}`);
}

function diagnose(oi) {
  const e = byId[S.current];
  const st = itemState(e.id);
  if (st.diag !== null || S.phase !== 'play') return;
  st.diag = oi;
  S.diagMade++;
  const o = e.options[oi];
  if (o.correct) {
    S.diagRight++;
    if (e.real) {
      audio.play('good');
    } else {
      audio.play('good');
      adjustTime(BONUS_MS);
    }
  } else {
    audio.play('buzz');
    adjustTime(-PENALTY_MS);
    if (navigator.vibrate) try { navigator.vibrate(120); } catch { /* ignore */ }
  }
  renderSheet();
  refreshFloor();
  if (!o.correct) {
    shake($('#sheet'));
    shake($('#step-diag .opt.wrong'));
  } else if (e.real) {
    $('#step-quant')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (S.timeLeft <= 0) finish('time');
}

function quantify(si) {
  const e = byId[S.current];
  const st = itemState(e.id);
  if (st.quant !== null || S.phase !== 'play') return;
  st.quant = si;
  const s = e.savings[si];
  const full = e.calc(GLOBALS).dollars;
  st.dollars = s.correct ? full : Math.round(full / 2);
  S.dollars += st.dollars;
  if (s.correct) {
    audio.play('ching');
    burst(110);
  } else {
    audio.play('half');
    shake($('#step-quant .opt.wrong'));
  }
  renderSheet();
  refreshFloor();
  setTimeout(() => $('#sheet .ar-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
}

function refreshFloor() {
  renderZones();
  renderSceneView();
  renderHud();
  if (resolvedCount() === EQUIPMENT.length && S.phase === 'play') {
    S.phase = 'done-wait'; // freeze clock; results on closing the panel
    renderHud();
  }
}

function useHint() {
  if (S.phase !== 'play') return;
  const zonesLeft = ZONES.filter((z) => EQUIPMENT.some((e) => e.zone === z.id && e.real && itemState(e.id).diag === null));
  if (!zonesLeft.length) return;
  const pick = zonesLeft.find((z) => z.id !== S.zone) || zonesLeft[0];
  S.hints++;
  adjustTime(-PENALTY_MS);
  audio.play('click');
  S.hinted = pick.id;
  renderZones();
  toast(`<b>Hint:</b> the <b>${esc(pick.name)}</b> still has an unfound energy-saving opportunity.`, 'info');
  clearTimeout(useHint._h);
  useHint._h = setTimeout(() => { S && (S.hinted = null); S && renderZones(); }, 8000);
  if (S.timeLeft <= 0) finish('time');
}

// ---------------------------------------------------------------- game lifecycle
function startGame() {
  audio.unlock();
  audio.play('click');
  newGame();
  show('screen-game');
  renderZones();
  renderSceneView();
  renderSheet();
  renderHud();
  renderMute();
  clearInterval(timerHandle);
  S.last = performance.now();
  timerHandle = setInterval(tick, 200);
}

function finish(reason) {
  if (!S || S.phase === 'over') return;
  S.phase = 'over';
  clearInterval(timerHandle);
  S.shownDollars = S.dollars;
  renderHud();
  $('#sheet').classList.remove('open');
  document.body.classList.remove('sheet-open');
  const msg = $('#overlay-msg');
  msg.innerHTML = reason === 'time' ? '<span>Time’s up!</span>' : '<span>Walkthrough complete!</span>';
  msg.hidden = false;
  audio.play('end');
  setTimeout(() => {
    msg.hidden = true;
    renderEnd();
    show('screen-end');
    if (S.dollars > 0) burst(140, innerWidth / 2, innerHeight * 0.2);
  }, 1400);
}

// ---------------------------------------------------------------- end screen
function loadBoard() {
  try {
    const b = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
    return Array.isArray(b) ? b : [];
  } catch { return []; }
}
function saveBoard(b) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(b)); } catch { /* storage blocked */ }
}
function boardHtml(highlightTs) {
  const b = loadBoard();
  if (!b.length) return '<p class="empty">No scores yet — be the first Lead Assessor.</p>';
  return `<ol class="board">${b.map((r, i) => `<li class="${r.ts === highlightTs ? 'me' : ''}"><span class="rk">${i + 1}</span>
    <span class="in">${esc(r.initials)}</span><span class="gr">${esc(r.grade)}</span><span class="d">${money(r.dollars)}</span></li>`).join('')}</ol>`;
}

function renderEnd() {
  const reals = EQUIPMENT.filter((e) => e.real);
  const found = reals.filter((e) => isDiagCorrect(e, itemState(e.id)) && itemState(e.id).quant !== null);
  const missed = reals.filter((e) => !found.includes(e));
  const falseAlarms = EQUIPMENT.filter((e) => !e.real && itemState(e.id).diag !== null && !isDiagCorrect(e, itemState(e.id)));
  const acc = S.diagMade ? S.diagRight / S.diagMade : 0;
  const grade = gradeFor(S.dollars, acc);
  const tot = found.reduce((a, e) => {
    const c = e.calc(GLOBALS);
    a.kWh += c.kWh; a.kW += c.kW; a.mmbtu += c.mmbtu; a.cost += c.cost;
    return a;
  }, { kWh: 0, kW: 0, mmbtu: 0, cost: 0 });
  const pct = Math.round((S.dollars / MAX_DOLLARS) * 100);

  const rows = found.map((e) => {
    const c = e.calc(GLOBALS);
    const st = itemState(e.id);
    const half = !e.savings[st.quant].correct;
    return `<tr><td>${esc(e.arTitle)}${half ? ' <span class="half">½ credit</span>' : ''}</td><td class="n">${money(st.dollars)}</td>
      <td class="n">${money(c.cost)}</td><td class="n">${fmt(c.payback, 1)}</td></tr>`;
  }).join('');

  $('#end').innerHTML = `
    <div class="grade-card">
      <div class="g-kicker">Final rating</div>
      <div class="g-name">${esc(grade.name)}</div>
      <div class="g-bar"><span style="width:${Math.round(Math.min(1, grade.idx) * 100)}%"></span></div>
      <div class="g-sub">${money(S.dollars)}/yr captured · ${pct}% of ${money(MAX_DOLLARS)} possible</div>
    </div>
    <div class="stats">
      <div class="stat"><span class="v">${Math.round(acc * 100)}%</span><span class="l">Diagnosis accuracy</span></div>
      <div class="stat"><span class="v">${found.length}/${reals.length}</span><span class="l">Findings</span></div>
      <div class="stat"><span class="v">${resolvedCount()}/${EQUIPMENT.length}</span><span class="l">Resolved</span></div>
      <div class="stat"><span class="v">${fmtTime(S.timeLeft)}</span><span class="l">Time left</span></div>
    </div>
    <div class="totals">
      <div><span class="l">Electricity</span><span class="v">${fmt(tot.kWh)} <small>kWh/yr</small></span></div>
      <div><span class="l">Demand</span><span class="v">${fmt(tot.kW, 1)} <small>kW</small></span></div>
      <div><span class="l">Natural gas</span><span class="v">${fmt(tot.mmbtu)} <small>MMBtu/yr</small></span></div>
      <div><span class="l">Cost savings</span><span class="v hl">${money(S.dollars)} <small>/yr</small></span></div>
    </div>
    <h3 class="sec">Assessment recommendations</h3>
    ${found.length ? `<div class="table-wrap"><table class="ar-table"><thead><tr><th>Recommendation</th><th class="n">$/yr</th><th class="n">Cost</th><th class="n">Payback<br>(yr)</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td>Total</td><td class="n">${money(S.dollars)}</td><td class="n">${money(tot.cost)}</td><td class="n">${S.dollars ? fmt(tot.cost / S.dollars, 1) : '—'}</td></tr></tfoot></table></div>`
      : '<p class="empty">No recommendations captured this round.</p>'}
    ${missed.length ? `<h3 class="sec">Missed findings</h3><div class="missed">${missed.map((e) => {
      const c = e.calc(GLOBALS);
      const o = e.options.find((x) => x.correct);
      return `<details class="miss"><summary><span>${esc(e.name)}</span><b>${money(c.dollars)}/yr</b></summary>
        <p><b>Action:</b> ${esc(o.text)}</p><p>${esc(e.insight)}</p><ol class="mini-math">${e.math(GLOBALS).map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>`;
    }).join('')}</div>` : '<p class="perfect">Every real finding captured. 🎯</p>'}
    ${falseAlarms.length ? `<h3 class="sec">False alarms</h3><div class="missed">${falseAlarms.map((e) => `<details class="miss"><summary><span>${esc(e.name)}</span><b>Already efficient</b></summary><p>${esc(e.insight)}</p></details>`).join('')}</div>` : ''}
    <form class="save" id="save-form" autocomplete="off">
      <label for="initials">Your initials for the leaderboard</label>
      <div class="save-row"><input id="initials" name="initials" maxlength="3" required pattern="[A-Za-z0-9]{1,3}" placeholder="ABC" autocapitalize="characters" spellcheck="false" inputmode="text">
      <button class="btn btn-primary" type="submit" id="btn-save">Save score</button></div>
    </form>
    <h3 class="sec">Leaderboard</h3>
    <div id="end-board">${boardHtml()}</div>
    <div class="end-actions"><button class="btn btn-primary btn-xl" id="btn-again">Play Again</button>
      <button class="btn btn-ghost" id="btn-menu">Main menu</button></div>`;

  $('#save-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const ini = $('#initials').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!ini) return;
    const ts = Date.now();
    const b = loadBoard();
    b.push({ initials: ini, dollars: S.dollars, acc: Math.round(acc * 100), grade: grade.name, ts });
    b.sort((x, y) => y.dollars - x.dollars || y.acc - x.acc || x.ts - y.ts);
    saveBoard(b.slice(0, 10));
    $('#end-board').innerHTML = boardHtml(ts);
    $('#save-form').innerHTML = `<p class="saved">Saved as <b>${esc(ini)}</b>.</p>`;
    audio.play('good');
  });
  $('#initials').addEventListener('input', (ev) => { ev.target.value = ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('#btn-again').addEventListener('click', startGame);
  $('#btn-menu').addEventListener('click', () => show('screen-title'));
}

// ---------------------------------------------------------------- modals + wiring
function openModal(id) {
  const m = $(id);
  m.hidden = false;
  m.querySelector('[data-close]')?.focus();
}
document.addEventListener('click', (ev) => {
  const closeBtn = ev.target.closest('[data-close]');
  if (closeBtn || ev.target.classList.contains('modal')) {
    (closeBtn?.closest('.modal') || ev.target).hidden = true;
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') document.querySelectorAll('.modal').forEach((m) => (m.hidden = true));
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest?.('.equip')) {
    ev.preventDefault();
    openItem(ev.target.closest('.equip').dataset.id);
  }
});

function init() {
  $('#inst-defs').innerHTML = INSTRUMENT_DEFS;
  $('#btn-start').addEventListener('click', startGame);
  $('#btn-howto').addEventListener('click', () => { audio.unlock(); openModal('#modal-howto'); });
  $('#btn-board').addEventListener('click', () => { $('#board-list').innerHTML = boardHtml(); openModal('#modal-board'); });
  $('#btn-hint').addEventListener('click', useHint);
  $('#btn-mute').addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.isMuted()); renderMute(); audio.play('click'); });
  $('#zones').addEventListener('click', (ev) => {
    const b = ev.target.closest('.zone-tab');
    if (!b) return;
    audio.play('click');
    setZone(b.dataset.zone);
  });
  $('#scene').addEventListener('click', (ev) => {
    const g = ev.target.closest('.equip');
    if (!g || !S || S.phase === 'over') return;
    audio.play('click');
    openItem(g.dataset.id);
  });
  $('#sheet').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || !S) return;
    const i = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'close': closeSheet(); break;
      case 'reveal': reveal(i); break;
      case 'diag': diagnose(i); break;
      case 'quant': quantify(i); break;
    }
  });
  $('#sheet').addEventListener('toggle', (ev) => {
    if (ev.target.matches('details.math') && S?.current) itemState(S.current).open = ev.target.open;
  }, true);
  renderMute();
}

// Exposed for automated tests only (read-only snapshot, no answers).
window.__plantWalk = { get phase() { return S?.phase ?? 'title'; }, get dollars() { return S?.dollars ?? 0; } };

init();
