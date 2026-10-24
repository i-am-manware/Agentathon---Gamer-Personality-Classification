import { h, s, store, toast, reducedMotion, armable } from '../dom.js';
import { QUESTIONS, ARCH, SPECTRUM_STOPS, optionCount, dominantOf, analyze, encodeAnswers } from '/shared/engine.js';
import { createPlane } from '../plane.js';
import { navigate } from '../state.js';

const N = QUESTIONS.length;
const KEY_LETTERS = ['A', 'B', 'C', 'D', 'E'];

const ANALYZE_LINES = [
  'Normalizing six poles against what was achievable…',
  'Resolving three tensions…',
  'Resampling your answers 160 times…',
  'Consulting the atlas…',
  'Inking the print…',
];

export function renderQuiz(root) {
  document.title = 'Field test · PLAYERPRINT';
  const saved = store.get('pp.progress');
  let answers = saved && Array.isArray(saved.answers) && saved.answers.length === N ? saved.answers : new Array(N).fill(null);
  let idx = saved && Number.isInteger(saved.idx) ? Math.min(Math.max(saved.idx, 0), N - 1) : 0;
  if (answers.every((a) => a !== null)) { answers = new Array(N).fill(null); idx = 0; }
  let advancing = false;
  let pending = null;
  let direction = 'enter';
  const trail = [];

  const persist = () => store.set('pp.progress', { answers, idx });

  /* ---- chrome ---- */
  const count = h('div', { class: 'quiz-count' });
  const backBtn = h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => go(idx - 1, 'enter-back') }, '← Back');
  const restart = armable(h('button', { class: 'linkish', type: 'button', title: 'Clear all answers (tap twice)' }, 'Restart'), 'Tap again to clear', () => {
    answers = new Array(N).fill(null); idx = 0; trail.length = 0; persist(); paint(); paintLive();
    toast('Fresh start.');
  });
  const strip = h('div', { class: 'strip', style: { '--n': N }, 'aria-hidden': 'true' },
    QUESTIONS.map((_, i) => h('i', { title: `Question ${i + 1}`, onclick: () => { if (answers[i] !== null || i <= firstOpen()) go(i, i < idx ? 'enter-back' : 'enter'); } })));

  const plane = createPlane({ interactive: false, labels: false, mini: true, ariaLabel: 'Live estimate of your position' });
  plane.setMe({ x: 0, y: 0 }, { animate: false });
  const liveTitle = h('div', { class: 'live-title' });
  const liveHint = h('div', { class: 'kicker' });
  const side = h('aside', { class: 'quiz-side' },
    plane.el,
    h('div', { class: 'live-info' },
      h('div', { class: 'kicker live-label' }, h('span', 'Live reading')),
      liveTitle, liveHint));

  const stage = h('div', { class: 'quiz-stage', 'aria-live': 'polite' });
  const nav = h('div', { class: 'quiz-nav' },
    backBtn,
    h('span', { class: 'quiz-hint' }, 'Keys: 1–5 to answer · ← back · → skip ahead'),
    restart);

  root.append(h('section', { class: 'quiz' },
    h('div', { class: 'wrap' },
      h('div', { class: 'quiz-top' }, count),
      strip,
      h('div', { class: 'quiz-grid' }, h('div', {}, stage, nav), side))));

  const firstOpen = () => { const i = answers.indexOf(null); return i < 0 ? N : i; };

  function paintStrip() {
    [...strip.children].forEach((cell, i) => {
      const a = answers[i];
      const k = a === null ? null : dominantOf(QUESTIONS[i], a);
      cell.style.background = k ? ARCH[k].color : '';
      cell.classList.toggle('neutral', a !== null && !k);
      cell.classList.toggle('cur', i === idx);
    });
  }

  function paintLive() {
    const done = answers.filter((a) => a !== null).length;
    const r = analyze(answers, { bootstrap: 0, damp: true });
    trail.push([r.point.x, r.point.y]);
    if (trail.length > 8) trail.shift();
    plane.setCloud(trail.slice(0, -1), 'var(--ink)', false);
    plane.setMe(r.point, { ms: 650, bounce: true });
    if (done < 4) { liveTitle.textContent = '???'; liveHint.textContent = `${4 - done} more answer${4 - done === 1 ? '' : 's'} to get a reading`; }
    else { liveTitle.textContent = r.title; liveHint.textContent = `${Math.round((done / N) * 100)}% charted`; }
  }

  function choose(i, btn) {
    if (advancing) return;
    answers[idx] = i;
    persist();
    paintStrip();
    paintLive();
    [...stage.querySelectorAll('.opt, .spec-stop')].forEach((b) => { b.classList.remove('sel', 'stamp'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('sel');
    btn.setAttribute('aria-pressed', 'true');
    if (btn.classList.contains('opt')) btn.classList.add('stamp');
    advancing = true;
    pending = setTimeout(advance, reducedMotion() ? 120 : 380);
  }

  // Move to the next unanswered question (or finish). Called after the short
  // "stamp" beat — or immediately if a fast keyboard user is already answering.
  function advance() {
    clearTimeout(pending);
    pending = null;
    advancing = false;
    const after = answers.indexOf(null, idx + 1);
    const next = after >= 0 ? after : answers.indexOf(null);
    if (next < 0) finish(); else go(next, next < idx ? 'enter-back' : 'enter');
  }

  function go(i, dir) {
    if (i < 0 || i >= N) return;
    idx = i; direction = dir; persist(); paint();
  }

  function renderQuestion(q) {
    const cur = answers[idx];
    const color = (opt) => { const k = dominantOf(q, opt); return k ? ARCH[k].color : 'var(--ink-3)'; };
    let body;
    if (q.type === 'scenario') {
      body = h('div', { class: 'opts', role: 'group', 'aria-label': 'Answers' }, q.options.map((o, i) => {
        const b = h('button', { type: 'button', class: ['opt', cur === i && 'sel'], 'aria-pressed': String(cur === i), style: { '--c': color(i) } },
          h('span', { class: 'key' }, String(i + 1)), h('span', o.label));
        b.addEventListener('click', () => choose(i, b));
        return b;
      }));
    } else if (q.type === 'versus') {
      const mk = (i) => {
        const b = h('button', { type: 'button', class: ['opt', cur === i && 'sel'], 'aria-pressed': String(cur === i), style: { '--c': color(i) } },
          h('span', { class: 'key' }, `${i + 1} · ${KEY_LETTERS[i]}`), h('span', q.options[i].label));
        b.addEventListener('click', () => choose(i, b));
        return b;
      };
      body = h('div', { class: 'versus', role: 'group', 'aria-label': 'Pick one' }, mk(0), h('div', { class: 'vs-badge', 'aria-hidden': 'true' }, 'VS'), mk(1));
    } else {
      body = h('div', { class: 'spectrum' },
        h('div', { class: 'spec-ends' },
          h('div', h('small', '← this'), q.left.label),
          h('div', h('small', 'that →'), q.right.label)),
        h('div', { class: 'spec-track', role: 'group', 'aria-label': 'Where do you sit?' }, SPECTRUM_STOPS.map((lab, i) => {
          const b = h('button', { type: 'button', class: ['spec-stop', cur === i && 'sel'], 'aria-pressed': String(cur === i), style: { '--c': i === 2 ? 'var(--ink-3)' : color(i) },
            'aria-label': i === 2 ? 'Torn between both' : `${lab} ${i < 2 ? 'left' : 'right'}: ${i < 2 ? q.left.label : q.right.label}` },
            h('span', { class: 'dot' }), h('span', { class: 'k' }, String(i + 1)), h('span', { class: 'lab' }, lab));
          b.addEventListener('click', () => choose(i, b));
          return b;
        })));
    }
    return h('div', { class: ['qcard', direction] },
      h('div', { class: 'qnum', 'aria-hidden': 'true' }, String(idx + 1).padStart(2, '0')),
      h('span', { class: 'kicker' }, q.kicker),
      h('h2', { id: 'qprompt' }, q.prompt),
      body);
  }

  function paint() {
    const q = QUESTIONS[idx];
    count.replaceChildren('Question ', h('b', String(idx + 1).padStart(2, '0')), ` / ${N}`);
    backBtn.disabled = idx === 0;
    stage.replaceChildren(renderQuestion(q));
    paintStrip();
  }

  async function finish() {
    const code = encodeAnswers(answers);
    store.set('pp.last', { code, at: Date.now() });
    store.del('pp.progress');
    try { sessionStorage.setItem('pp.fresh', code); } catch { /* private mode */ }
    alive = false;
    const log = h('div', { class: 'log' });
    root.replaceChildren(h('section', { class: 'analyzing' },
      h('div', {},
        s('svg', { class: 'spinner-hex', viewBox: '-12 -12 24 24', html: '<polygon points="0,-10 8.66,-5 8.66,5 0,10 -8.66,5 -8.66,-5" fill="none" stroke="currentColor" stroke-width="1.4"/><polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="var(--D)" opacity=".8"/>' }),
        h('h2', 'Developing your print'),
        log)));
    const delay = reducedMotion() ? 60 : 300;
    for (const line of ANALYZE_LINES) {
      log.append(h('div', line));
      await new Promise((r) => setTimeout(r, delay));
    }
    navigate(`/r/${code}`);
  }

  let alive = true;
  function onKey(e) {
    if (!alive || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.matches?.('input, textarea')) return;
    if (document.querySelector('dialog[open]')) return;
    if (advancing && /^([1-5a-eA-E]|Arrow(Left|Right)|Backspace)$/.test(e.key)) {
      advance(); // don't drop keystrokes typed during the stamp animation
      if (!alive) return;
    }
    const q = QUESTIONS[idx];
    const n = optionCount(q);
    let pick = -1;
    if (/^[1-5]$/.test(e.key)) pick = Number(e.key) - 1;
    else if (q.type !== 'spectrum' && /^[a-eA-E]$/.test(e.key)) pick = e.key.toUpperCase().charCodeAt(0) - 65;
    if (pick >= 0 && pick < n) {
      e.preventDefault();
      const btns = stage.querySelectorAll('.opt, .spec-stop');
      choose(pick, btns[pick]);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); go(idx - 1, 'enter-back'); }
    if (e.key === 'ArrowRight' && answers[idx] !== null) { e.preventDefault(); go(Math.min(idx + 1, firstOpen()), 'enter'); }
  }
  document.addEventListener('keydown', onKey);

  paint();
  if (answers.some((a) => a !== null)) { paintLive(); toast('Picked up where you left off.'); }
  else { liveTitle.textContent = '???'; liveHint.textContent = 'Answer a few to get a reading'; }

  return () => { alive = false; clearTimeout(pending); document.removeEventListener('keydown', onKey); };
}
