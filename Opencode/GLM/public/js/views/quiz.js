import { h, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { QUESTIONS, QUIZ_VERSION } from '../../../shared/questions.js';
import { AXES, opposite } from '../../../shared/axes.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';
import { scoreRun } from '../../../shared/scoring.js';
import { encodeResult } from '../../../shared/codec.js';
import { getQuizSession, setQuizSession, clearQuizSession, stashRun, setPendingCode, setClaimFlag, state } from '../state.js';

let lock = false;

export function quizView(root) {
  document.title = 'Diagnostic — SPAWNPOINT';
  lock = false;

  const session = getQuizSession() || { answers: [], idx: 0 };

  const shell = h('section', { class: 'quiz' });
  root.append(shell);

  function rerender() {
    const q = QUESTIONS[session.idx];
    if (!q) return finish();

    shell.replaceChildren();

    const progress = h(
      'div',
      { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': QUESTIONS.length, 'aria-valuenow': session.idx + 1, 'aria-label': `query ${session.idx + 1} of ${QUESTIONS.length}` },
      QUESTIONS.map((_, i) =>
        h('i', { class: 'progress__cell' + (i < session.idx ? ' is-done' : i === session.idx ? ' is-now' : '') })
      )
    );

    const head = h(
      'div',
      { class: 'quiz__head' },
      h('span', { class: 'quiz__counter' }, `QUERY ${String(session.idx + 1).padStart(2, '0')}/${QUESTIONS.length}`),
      h('span', { class: 'quiz__tag' }, `SECTOR: ${q.tag}`),
      h(
        'span',
        { class: 'quiz__syscheck' },
        'SYSTEM CHECK — no right answers. Wrong ones? Plenty.'
      )
    );

    const card = h(
      'article',
      { class: 'qcard qcard--enter' },
      h('h2', { class: 'qcard__prompt' }, q.prompt)
    );

    let confirmBtn = null;

    if (q.type === 'slider') {
      const axis = AXES.find((a) => a.id === q.axis);
      const leftPole = opposite(q.toward);
      const stored = session.answers[session.idx];
      const input = h('input', {
        type: 'range', min: 0, max: 100, step: 1, value: stored != null ? stored : 50,
        class: 'slider__input', 'aria-label': q.prompt,
      });
      const bubble = h('b', { class: 'slider__bubble' }, `${stored != null ? stored : 50}`);
      const readout = h('div', { class: 'slider__readout' }, bubble, h('span', { class: 'slider__unit' }, '/100'));
      input.addEventListener('input', () => {
        bubble.textContent = input.value;
        session.answers[session.idx] = Number(input.value);
        persist();
        sfx.tap();
      });
      confirmBtn = h(
        'button',
        {
          class: 'btn btn--primary btn--big',
          type: 'button',
          onclick: () => { if (!lock) { sfx.select(); advance(); } },
        },
        'CALIBRATED — CONFIRM ⏎'
      );
      card.append(
        h(
          'div',
          { class: 'slider' },
          h('div', { class: 'slider__ends' },
            h('span', { class: 'slider__end' },
              h('i', { class: 'slider__dot', style: `--c:${ARCHETYPES[leftPole].color}` }),
              ARCHETYPES[leftPole].name),
            h('span', { class: 'slider__end slider__end--r' },
              ARCHETYPES[q.toward].name,
              h('i', { class: 'slider__dot', style: `--c:${ARCHETYPES[q.toward].color}` }))),
          input,
          h('div', { class: 'slider__labels' },
            h('span', { class: 'slider__label' }, q.left),
            h('span', { class: 'slider__label slider__label--r' }, q.right)),
          h('div', { class: 'slider__confirm' }, readout, confirmBtn)
        )
      );
    } else {
      const opts = q.options.map((opt, i) =>
        h(
          'button',
          {
            class: 'opt' + (q.type === 'versus' ? ' opt--versus' : ''),
            type: 'button',
            'data-opt': i,
            onclick: () => pick(i, opt),
          },
          h(
            'span',
            { class: 'opt__inner' },
            h('span', { class: 'opt__key' }, q.type === 'versus' ? (i === 0 ? 'A' : 'B') : String(i + 1)),
            h('span', { class: 'opt__text' }, opt.t)
          )
        )
      );
      card.append(h('div', { class: 'optgrid' + (q.type === 'versus' ? ' optgrid--versus' : '') }, opts));
    }

    const nav = h(
      'div',
      { class: 'quiz__nav' },
      session.idx > 0
        ? h('button', {
            class: 'btn btn--ghost btn--small', type: 'button',
            onclick: () => { sfx.back(); session.idx--; persist(); rerender(); },
          }, '← BACK')
        : null,
      h('a', { class: 'btn btn--ghost btn--small', href: '#/' }, 'ABANDON')
    );

    shell.append(progress, head, card, nav, h('p', { class: 'kbd-hints' },
      h('kbd', null, '1-6'), ' select · ', h('kbd', null, 'A/B'), ' versus · ',
      h('kbd', null, '← →'), ' calibrate · ', h('kbd', null, '⏎'), ' confirm'));
  }

  function pick(i) {
    if (lock) return;
    lock = true;
    sfx.select();
    session.answers[session.idx] = i;
    persist();
    const btn = shell.querySelector(`[data-opt="${i}"]`);
    if (btn) btn.classList.add('opt--picked');
    setTimeout(advance, 230);
  }

  function advance() {
    lock = false;
    session.idx++;
    persist();
    rerender();
  }

  function finish() {
    clearQuizSession();
    try {
      const score = scoreRun(session.answers);
      const code = encodeResult(score);
      stashRun(code, session.answers, Date.now());
      setPendingCode(code);
      if (state.user) setClaimFlag();
      location.hash = '#/compute';
    } catch (err) {
      console.error(err);
      toast('the diagnostic tripped over its own wiring — restarting', { tone: 'error' });
      session.idx = 0;
      session.answers = [];
      setQuizSession(session);
      rerender();
    }
  }

  function persist() {
    setQuizSession({ answers: session.answers, idx: session.idx });
  }

  function onKey(e) {
    if (lock) return;
    const q = QUESTIONS[session.idx];
    if (!q) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      if (q.type === 'slider' && e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
      return;
    }
    if (q.type === 'slider') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const input = shell.querySelector('.slider__input');
        if (input) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          input.value = Number(input.value) + (e.key === 'ArrowLeft' ? -step : step);
          input.dispatchEvent(new Event('input'));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
      return;
    }
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= q.options.length) {
      e.preventDefault();
      pick(n - 1);
      return;
    }
    if (q.type === 'versus' && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); pick(0); }
    if (q.type === 'versus' && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); pick(1); }
  }

  function confirm() {
    if (lock) return;
    lock = true;
    sfx.select();
    setTimeout(advance, 140);
  }

  document.addEventListener('keydown', onKey);
  rerender();
  if (session.idx >= QUESTIONS.length) finish();

  return () => {
    document.removeEventListener('keydown', onKey);
    lock = false;
  };
}

export const title = 'Diagnostic — SPAWNPOINT';
