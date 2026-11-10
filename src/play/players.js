/**
 * players.js — the five ways of playing a paragraph, built for one thumb.
 *
 * A phone cannot show four long sentences at once, so none of these ask you to
 * hold four sentences in your head. Each one turns the exam's question into a
 * physical move on the text itself:
 *
 *   chain   tap the next sentence and it couples on; every coupling says why
 *   stray   one sentence wandered in; tap it and it drifts out of the paragraph
 *   gap     tap an option and it drops into the gap, so you read it in place
 *   seat    tap a gap and the sentence sits there, so you read it in place
 *   point   four summaries, one true one; a miss names exactly how it missed
 *
 * Players know nothing about ropes, rooms or storage. They take an item and
 * call back with what happened; a duel or a room decides what that means.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { play } from '../world/audio.js';
import { reduced, buzz } from '../duel/fx.js';

const GUIDED_TIERS = new Set(['beginner', 'foundation', 'easy', 'medium']);

/** The exam's trap names, said the way a friend would say them. */
export const TRAP_NAMES = Object.freeze({
  prescriptive_swap: 'It turns a description into advice',
  evidence_as_thesis: 'That is the evidence, not the point',
  stance_flip: 'It flips what the writer thinks',
  concession_as_thesis: 'That is what the writer gives away, not the point',
  scope_broadening: 'It claims more than the paragraph does',
  near_miss: 'So close, but it changes the claim',
  example_as_thesis: 'That is an example, not the point',
  certainty_inflation: 'It is more certain than the writer',
  tendency_to_universal: 'It turns "often" into "always"',
  implication_addition: 'It adds a conclusion the writer never drew',
  information_addition: 'It adds something the paragraph never said',
  half_truth: 'Only half of the point',
  owner_swap: 'It gives the view to the wrong person',
  cause_effect_reversal: 'Cause and effect are swapped',
  stance_flattening: 'It loses the writer\'s attitude',
  setup_as_payoff: 'That is the set-up, not the point',
  category_shift: 'It drifts to a different subject',
  scope_narrowing: 'Too narrow for the whole paragraph',
  contrast_collapse: 'It loses the contrast',
  verbatim_lure: 'The same words, a different meaning',
  extreme_language: 'Too extreme',
  necessary_sufficient_swap: 'It mixes up "needed" and "enough"',
  assumption_as_thesis: 'That is only an assumption',
  wrong_reference_target: 'It points back at the wrong thing',
  right_idea_wrong_position: 'Right idea, wrong place',
  local_fit_global_break: 'It fits next door but breaks the paragraph',
  attractive_generality: 'It sounds wise and says nothing',
  redundant_restatement: 'It only repeats what was just said',
  contradicts_neighbour: 'It contradicts the sentence beside it',
  topic_match_function_mismatch: 'Right topic, wrong job',
  premature_conclusion: 'It concludes too soon',
  stance_shift: 'It changes the writer\'s attitude',
  scope_jump: 'It jumps to something bigger',
  wrong_connective: 'The linking word does not fit',
  summary_where_development_needed: 'It sums up when the paragraph wants more',
  new_topic_introduced: 'It brings in a new subject',
  tense_break: 'The time does not match',
});

export const trapName = (id) => TRAP_NAMES[id] ?? null;

function flip(el, mutate, ms = 320) {
  const a = el.getBoundingClientRect();
  mutate();
  if (reduced()) return;
  const b = el.getBoundingClientRect();
  try { el.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.85,.25,1.15)' }); } catch { /* old engine */ }
}

const seededIndex = (s, n) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };
const shuffle = (a, seed) => {
  const out = [...a]; let h = 11; for (const c of String(seed)) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

function eyebrow(item) {
  const title = item.meta?.title ?? item.title;
  return title ? `<p class="pl__title">${esc(title)}</p>` : '';
}

const shake = (el) => { if (reduced()) return; el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); };

/* ------------------------------------------------------------------ */
/* Chain: para jumbles                                                 */
/* ------------------------------------------------------------------ */

export function mountChain(el, item, { guided = GUIDED_TIERS.has(item.meta?.tier), onStep = () => {}, onDone = () => {} } = {}) {
  const started = Date.now();
  const order = item.correct_order;
  const byL = new Map(item.sentences.map((s) => [s.label, s]));
  const linkFor = (a, b) => item.links?.find((l) => l.from === a && l.to === b)?.explanation ?? '';
  const seed = item.meta?.id ?? 'x';
  // Never deal them in the writer's order.
  let deal = shuffle(item.sentences.map((s) => s.label), seed);
  if (deal.every((l, i) => l === order[i])) deal = [deal[1], deal[0], ...deal.slice(2)];

  el.innerHTML = `
    <div class="pl pl--chain">
      ${eyebrow(item)}
      <p class="pl__ask" id="ask">Which sentence comes <b>first</b>?</p>
      <ol class="ch__built" id="built"></ol>
      <div class="ch__yard" id="yard">
        ${deal.map((l) => `<button class="ch__car" data-l="${l}"><span class="ch__txt">${esc(byL.get(l).text)}</span></button>`).join('')}
      </div>
      ${guided ? '' : '<button class="pl__go" id="go" hidden>Couple them</button>'}
      <p class="pl__tip" id="tip" role="status"></p>
    </div>`;
  const built = el.querySelector('#built'), yard = el.querySelector('#yard'), ask = el.querySelector('#ask'), tip = el.querySelector('#tip');
  const go = el.querySelector('#go');
  const firstTaps = [];
  const placed = [];
  let mistakes = 0, done = false, lock = false;

  const tipText = (t) => { tip.textContent = t; tip.classList.toggle('is-on', !!t); };

  function couple(card, label) {
    const prev = placed[placed.length - 1];
    placed.push(label);
    flip(card, () => {
      const li = document.createElement('li');
      li.className = 'ch__link';
      li.appendChild(card);
      built.appendChild(li);
      card.disabled = true;
      card.classList.add('is-coupled');
    });
    if (prev) card.closest('li').classList.add('has-hook');
    return prev;
  }

  function finishGuided() {
    done = true;
    ask.innerHTML = 'The whole train is coupled.';
    built.classList.add('is-complete');
    const share = Math.max(0, 1 - mistakes * 0.34);
    onDone({ correct: mistakes === 0, share, entered: firstTaps.slice(), mistakes, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
  }

  yard.addEventListener('click', (e) => {
    const card = e.target.closest('.ch__car');
    if (!card || done || lock) return;
    const label = card.dataset.l;
    if (!firstTaps.includes(label)) firstTaps.push(label);
    if (!guided) {
      couple(card, label);
      card.disabled = false;
      play('tap');
      ask.innerHTML = placed.length === order.length ? 'Happy with the order? Tap one to take it back.' : 'What comes <b>next</b>?';
      if (go) go.hidden = placed.length !== order.length;
      return;
    }
    const want = order[placed.length];
    if (label === want) {
      const prev = couple(card, label);
      play('place'); buzz(12);
      onStep({ correct: true, index: placed.length - 1 });
      tipText(prev ? linkFor(prev, label) : '');
      if (placed.length === order.length - 1) {
        // One carriage left: it can only go last. Couple it for them, a beat later.
        const last = yard.querySelector('.ch__car');
        lock = true;
        setTimeout(() => {
          if (!last?.isConnected) return;
          const p = couple(last, last.dataset.l);
          if (!firstTaps.includes(last.dataset.l)) firstTaps.push(last.dataset.l);
          play('place');
          tipText(p ? linkFor(p, last.dataset.l) : '');
          onStep({ correct: true, index: placed.length - 1 });
          lock = false;
          finishGuided();
        }, reduced() ? 60 : 460);
      } else ask.innerHTML = 'What comes <b>next</b>?';
    } else {
      mistakes += 1;
      shake(card); play('wrong'); buzz([20, 30, 20]);
      onStep({ correct: false });
      tipText(placed.length === 0 ? 'That one leans on something earlier. Which sentence needs nothing before it?' : 'That does not follow yet. Look for the word that points backward.');
    }
  });

  if (!guided) {
    built.addEventListener('click', (e) => {
      const card = e.target.closest('.ch__car');
      if (!card || done) return;
      const i = placed.indexOf(card.dataset.l);
      if (i < 0) return;
      placed.splice(i, 1);
      card.classList.remove('is-coupled');
      flip(card, () => { yard.appendChild(card); });
      built.querySelectorAll('li').forEach((li) => { if (!li.firstElementChild) li.remove(); });
      play('tap');
      ask.innerHTML = placed.length === 0 ? 'Which sentence comes <b>first</b>?' : 'What comes <b>next</b>?';
      if (go) go.hidden = true;
    });
    go?.addEventListener('click', () => {
      done = true; go.hidden = true;
      let linksRight = 0;
      const rows = [...built.querySelectorAll('.ch__car')];
      rows.forEach((c, i) => {
        c.disabled = true;
        const right = i < order.length - 1 ? order[order.indexOf(placed[i]) + 1] === placed[i + 1] : true;
        c.classList.add(placed[i] === order[i] ? 'is-right' : 'is-off');
        if (i < rows.length - 1 && right) linksRight += 1;
      });
      const correct = placed.join() === order.join();
      ask.innerHTML = correct ? 'Perfect coupling.' : `The writer's order was <b>${order.map((l) => placed.indexOf(l) + 1).join(', ')}</b> of yours.`;
      onDone({ correct, share: linksRight / (order.length - 1), entered: placed.slice(), mistakes: correct ? 0 : 1, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
    });
  }
  return { destroy() { done = true; el.innerHTML = ''; } };
}

/* ------------------------------------------------------------------ */
/* Stray: odd one out                                                  */
/* ------------------------------------------------------------------ */

export function mountStray(el, item, { onDone = () => {} } = {}) {
  const started = Date.now();
  const byL = new Map(item.sentences.map((s) => [s.label, s]));
  const core = item.core_order;
  // Early on, the four true sentences are read in their real order with the
  // stowaway slipped between them. Later it is five shuffled sentences, as the exam sets it.
  let shown;
  if (GUIDED_TIERS.has(item.meta?.tier)) {
    const at = 1 + seededIndex(item.meta?.id, core.length - 1);
    shown = [...core.slice(0, at), item.outlier, ...core.slice(at)];
  } else shown = item.sentences.map((s) => s.label);

  el.innerHTML = `
    <div class="pl pl--stray">
      ${eyebrow(item)}
      <p class="pl__ask" id="ask">One sentence wandered in from somewhere else. <b>Tap it.</b></p>
      <div class="st__list" id="list">
        ${shown.map((l) => `<button class="st__s" data-l="${l}"><i class="st__star" aria-hidden="true"></i><span>${esc(byL.get(l).text)}</span></button>`).join('')}
      </div>
      <button class="pl__go" id="go" hidden>This one does not belong</button>
    </div>`;
  const list = el.querySelector('#list'), go = el.querySelector('#go'), ask = el.querySelector('#ask');
  let picked = null, done = false;
  list.addEventListener('click', (e) => {
    const s = e.target.closest('.st__s');
    if (!s || done) return;
    picked = s.dataset.l;
    list.querySelectorAll('.st__s').forEach((x) => x.classList.toggle('is-picked', x === s));
    go.hidden = false;
    play('tap'); buzz(8);
  });
  go.addEventListener('click', () => {
    if (done || !picked) return;
    done = true; go.hidden = true;
    const correct = picked === item.outlier;
    const buttons = [...list.querySelectorAll('.st__s')];
    buttons.forEach((b) => { b.disabled = true; });
    const strayEl = buttons.find((b) => b.dataset.l === item.outlier);
    const pickedEl = buttons.find((b) => b.dataset.l === picked);
    if (!correct) { pickedEl.classList.add('is-wrong'); }
    strayEl.classList.add('is-stray');
    setTimeout(() => {
      if (!strayEl.isConnected) return;
      strayEl.classList.add('is-gone');
      setTimeout(() => {
        if (!strayEl.isConnected) return;
        strayEl.style.display = 'none';
        // The four true sentences fall into their real order and join up.
        for (const l of core) { const b = buttons.find((x) => x.dataset.l === l); flip(b, () => list.appendChild(b), 380); b.classList.add('is-joined'); }
        list.classList.add('is-joined');
      }, reduced() ? 0 : 520);
    }, reduced() ? 0 : correct ? 200 : 900);
    ask.innerHTML = correct ? 'Found it. The other four were one thought all along.' : 'That one belonged. Here is the real stray.';
    onDone({ correct, share: correct ? 1 : 0, chosen: picked, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
  });
  return { destroy() { done = true; el.innerHTML = ''; } };
}

/* ------------------------------------------------------------------ */
/* Gap: paragraph completion                                           */
/* ------------------------------------------------------------------ */

export function mountGap(el, item, { onDone = () => {} } = {}) {
  const started = Date.now();
  const { sentences, gap_index: gap } = item.body;
  const keys = Object.keys(item.options);
  const before = sentences.slice(0, gap).map(esc).join(' ');
  const after = sentences.slice(gap).map(esc).join(' ');
  el.innerHTML = `
    <div class="pl pl--gap">
      ${eyebrow(item)}
      <p class="pl__para">${before} <span class="gp__slot" id="slot" tabindex="-1"><span class="gp__empty">the missing sentence</span></span> ${after}</p>
      <p class="pl__ask" id="ask">What belongs in the gap? <b>Tap one to try it.</b></p>
      <div class="pl__opts" id="opts">
        ${keys.map((k) => `<button class="pl__opt" data-k="${k}">${esc(item.options[k])}</button>`).join('')}
      </div>
      <button class="pl__go" id="go" hidden>Lock it in</button>
    </div>`;
  const slot = el.querySelector('#slot'), opts = el.querySelector('#opts'), go = el.querySelector('#go'), ask = el.querySelector('#ask');
  let picked = null, done = false;
  opts.addEventListener('click', (e) => {
    const b = e.target.closest('.pl__opt');
    if (!b || done) return;
    picked = b.dataset.k;
    opts.querySelectorAll('.pl__opt').forEach((x) => x.classList.toggle('is-picked', x === b));
    slot.textContent = item.options[picked];
    slot.classList.add('is-filled');
    slot.classList.remove('is-in'); void slot.offsetWidth; slot.classList.add('is-in');
    ask.innerHTML = 'Read it in place. <b>Does it fit?</b>';
    go.hidden = false;
    play('tap'); buzz(8);
  });
  go.addEventListener('click', () => {
    if (done || !picked) return;
    done = true; go.hidden = true;
    const correct = picked === item.correct;
    opts.querySelectorAll('.pl__opt').forEach((b) => { b.disabled = true; b.classList.toggle('is-right', b.dataset.k === item.correct); b.classList.toggle('is-wrong', b.dataset.k === picked && !correct); b.classList.toggle('is-dim', b.dataset.k !== picked && b.dataset.k !== item.correct); });
    slot.textContent = item.options[item.correct];
    slot.classList.add(correct ? 'is-right' : 'is-fixed');
    const trap = item.distractors?.find((d) => d.option === picked)?.trap_type;
    ask.innerHTML = correct ? 'The cog turns.' : esc(trapName(trap) ?? 'That one does not fit.');
    onDone({ correct, share: correct ? 1 : 0, chosen: picked, trap, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
  });
  return { destroy() { done = true; el.innerHTML = ''; } };
}

/* ------------------------------------------------------------------ */
/* Seat: sentence placement                                            */
/* ------------------------------------------------------------------ */

export function mountSeat(el, item, { onDone = () => {} } = {}) {
  const started = Date.now();
  const { sentences, missing, positions } = item.body;
  const byPos = new Map(Object.entries(positions).map(([k, p]) => [Number(p), k]));
  const seatHTML = (p) => (byPos.has(p) ? `<button class="se__seat" data-k="${byPos.get(p)}" aria-label="Seat the sentence here"><i></i></button>` : '');
  el.innerHTML = `
    <div class="pl pl--seat">
      ${eyebrow(item)}
      <p class="pl__ask" id="ask">Tap the gap where this sentence belongs.</p>
      <div class="se__para" id="para">
        ${seatHTML(0)}
        ${sentences.map((s) => `<span class="se__s">${esc(s.text)} </span>${seatHTML(s.n)}`).join('')}
      </div>
      <div class="se__guest" id="guest"><span class="se__tag">The sentence looking for a seat</span>${esc(missing)}</div>
      <button class="pl__go" id="go" hidden>Lock it in</button>
    </div>`;
  const para = el.querySelector('#para'), go = el.querySelector('#go'), ask = el.querySelector('#ask'), guest = el.querySelector('#guest');
  let picked = null, done = false;
  const seats = [...para.querySelectorAll('.se__seat')];
  para.addEventListener('click', (e) => {
    const b = e.target.closest('.se__seat');
    if (!b || done) return;
    picked = b.dataset.k;
    seats.forEach((s) => { const on = s === b; s.classList.toggle('is-picked', on); s.innerHTML = on ? `<span class="se__sat">${esc(missing)}</span>` : '<i></i>'; });
    guest.classList.add('is-seated');
    ask.innerHTML = 'Read it in place. <b>Does it fit here?</b>';
    go.hidden = false;
    play('tap'); buzz(8);
  });
  go.addEventListener('click', () => {
    if (done || !picked) return;
    done = true; go.hidden = true;
    const correct = picked === item.correct;
    seats.forEach((s) => { s.disabled = true; const k = s.dataset.k; if (k === item.correct) { s.classList.add(correct ? 'is-right' : 'is-fixed'); s.classList.remove('is-picked'); s.innerHTML = `<span class="se__sat">${esc(missing)}</span>`; } else if (k === picked) { s.classList.add('is-wrong'); s.innerHTML = '<i></i>'; } else s.classList.add('is-dim'); });
    const trap = item.distractors?.find((d) => d.option === picked)?.trap_type;
    ask.innerHTML = correct ? 'Everyone is seated.' : esc(trapName(trap) ?? 'Not that seat.');
    onDone({ correct, share: correct ? 1 : 0, chosen: picked, trap, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
  });
  return { destroy() { done = true; el.innerHTML = ''; } };
}

/* ------------------------------------------------------------------ */
/* Point: para summary                                                 */
/* ------------------------------------------------------------------ */

export function mountPoint(el, item, { onDone = () => {} } = {}) {
  const started = Date.now();
  const q = item.question;
  const keys = Object.keys(q.options);
  const paragraph = item.paragraph.sentences.map((s) => esc(s.text)).join(' ');
  el.innerHTML = `
    <div class="pl pl--point">
      ${eyebrow(item)}
      <p class="pl__para">${paragraph}</p>
      <p class="pl__ask" id="ask">What is the <b>point</b> of all that?</p>
      <div class="pl__opts" id="opts">
        ${keys.map((k) => `<button class="pl__opt" data-k="${k}">${esc(q.options[k])}</button>`).join('')}
      </div>
      <button class="pl__go" id="go" hidden>That is the point</button>
    </div>`;
  const opts = el.querySelector('#opts'), go = el.querySelector('#go'), ask = el.querySelector('#ask');
  let picked = null, done = false;
  opts.addEventListener('click', (e) => {
    const b = e.target.closest('.pl__opt');
    if (!b || done) return;
    picked = b.dataset.k;
    opts.querySelectorAll('.pl__opt').forEach((x) => x.classList.toggle('is-picked', x === b));
    go.hidden = false;
    play('tap'); buzz(8);
  });
  go.addEventListener('click', () => {
    if (done || !picked) return;
    done = true; go.hidden = true;
    const correct = picked === q.correct;
    opts.querySelectorAll('.pl__opt').forEach((b) => { b.disabled = true; b.classList.toggle('is-right', b.dataset.k === q.correct); b.classList.toggle('is-wrong', b.dataset.k === picked && !correct); b.classList.toggle('is-dim', b.dataset.k !== picked && b.dataset.k !== q.correct); });
    const d = q.explanation?.distractors?.find((x) => x.option === picked);
    const trap = d?.archetype;
    ask.innerHTML = correct ? 'Bullseye.' : esc(trapName(trap) ?? 'That misses the point.');
    onDone({ correct, share: correct ? 1 : 0, chosen: picked, trap, ms: Date.now() - started, teach: item.mentor?.takeaway ?? '', started });
  });
  return { destroy() { done = true; el.innerHTML = ''; } };
}

export const PLAYERS = Object.freeze({ chain: mountChain, stray: mountStray, gap: mountGap, seat: mountSeat, point: mountPoint });

/** The longer explanation, for a room where there is time for it. Plain HTML, escaped. */
export function whyHTML(type, item, outcome) {
  const para = (t) => (t ? `<p>${esc(t)}</p>` : '');
  const head = (t) => `<h3 class="why__h">${esc(t)}</h3>`;
  if (type === 'chain') {
    const links = (item.links ?? []).map((l) => `<li>${esc(l.explanation)}</li>`).join('');
    return `${head('In plain words')}${para(item.mentor?.paragraph_plain)}${links ? `${head('Why each sentence follows the last')}<ul class="why__list">${links}</ul>` : ''}`;
  }
  if (type === 'stray') {
    const e = item.explanation ?? {};
    return `${head('Why it does not belong')}${para(e.why_it_breaks)}${head('The four that do')}${para(e.spine_note)}${e.detection_habit ? `${head('Next time')}${para(e.detection_habit)}` : ''}`;
  }
  if (type === 'gap' || type === 'seat') {
    const e = item.explanation ?? {};
    const d = outcome?.chosen ? item.distractors?.find((x) => x.option === outcome.chosen) : null;
    return `${head('Why this one')}${para(e.correct_reasoning)}${e.question_type_note ? `${head('What to look for')}${para(e.question_type_note)}` : ''}${d?.why_wrong ? `${head('Why not yours')}${para(d.why_wrong)}` : ''}`;
  }
  if (type === 'point') {
    const e = item.question?.explanation ?? {};
    const d = outcome?.chosen ? e.distractors?.find((x) => x.option === outcome.chosen) : null;
    return `${head('What it really says')}${para(e.paragraph_meaning)}${head('Why this one')}${para(e.correct_reasoning)}${d?.why_wrong ? `${head('Why not yours')}${para(d.why_wrong)}` : ''}`;
  }
  return '';
}
