/**
 * SPAWNPOINT — the quiz screen.
 *
 * Three phases in one view: start, questioning, handing off to results.
 *
 * The live preview plane is the reason this quiz is fun to take. It re-scores
 * the partial answer set through the *shared* scoring module after every
 * answer, so what you see while answering is exactly the algorithm the server
 * will re-run at the end — not an approximation of it.
 */

import { el, mount, clamp, tween, prefersReducedMotion, pct } from './dom.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY, OPPOSING_PAIRS } from '/shared/archetypes.js';
import { score, encodeAnswers } from '/shared/scoring.js';
import { PlaneRenderer, markerFor } from './plane.js';
import { sfx } from './sfx.js';
import { toastErr, toastOk } from './toasts.js';
import { saveProgress, clearProgress, loadProgress } from './store.js';
import { openModal } from './modal.js';

const OPTION_KEYS = ['1', '2', '3', '4', '5', '6'];

export function createQuiz({ questions, onFinish, onExit }) {
  const answers = new Array(questions.length).fill(null);
  let index = 0;
  let startedAt = Date.now();
  let phase = 'start';
  let preview = null;
  let previewRaf = null;
  let host = null;

  /* ---------------------------------------------------------------------- */
  /* Scoring helpers                                                         */
  /* ---------------------------------------------------------------------- */

  function partialResult() {
    return score(answers, questions);
  }

  function answeredCount() {
    return answers.filter((a) => Number.isInteger(a)).length;
  }

  function schedulePreview() {
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewRaf = requestAnimationFrame(() => {
      previewRaf = null;
      if (!preview) return;
      const s = partialResult();
      preview.setMarker({
        x: s.x,
        y: s.y,
        color: ARCHETYPE_BY_KEY[s.primary]?.color || '#4dd4ff',
        label: ARCHETYPE_BY_KEY[s.primary]?.name || '',
      });
      preview.reveal = 1;
      preview.draw();
    });
  }

  function persist() {
    saveProgress({
      answers,
      index,
      length: questions.length,
      startedAt,
      version: 1,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Public API                                                              */
  /* ---------------------------------------------------------------------- */

  const api = {
    render(root) {
      host = root;
      phase = 'start';
      renderStart();
    },

    destroy() {
      preview?.destroy();
      preview = null;
      if (previewRaf) cancelAnimationFrame(previewRaf);
    },

    /** Resume an interrupted run stored in localStorage. */
    resume() {
      const p = loadProgress();
      if (!p) return false;
      answers.splice(0, answers.length, ...p.answers);
      index = clamp(p.index ?? 0, 0, questions.length - 1);
      startedAt = p.startedAt ? new Date(p.startedAt).getTime() : Date.now();
      phase = 'quiz';
      renderQuiz();
      return true;
    },

    hasProgress() {
      const p = loadProgress();
      return !!p && p.answers.some((a) => Number.isInteger(a));
    },
  };

  /* ---------------------------------------------------------------------- */
  /* Start screen                                                            */
  /* ---------------------------------------------------------------------- */

  function renderStart() {
    const saved = loadProgress();
    const resumable = saved && saved.answers.some((a) => Number.isInteger(a));

    const pairs = el(
      'div.pairs',
      OPPOSING_PAIRS.map((p) => {
        const [a, b] = p.keys.map((k) => ARCHETYPE_BY_KEY[k]);
        return el('div.pairchip', [
          el('span', { style: { color: a.color } }, `${a.glyph} ${a.short}`),
          el('span.pairchip__vs', 'VS'),
          el('span', { style: { color: b.color, textAlign: 'right' } }, `${b.short} ${b.glyph}`),
        ]);
      }),
    );

    const view = el('div.intro', [
      el('div.panel.panel--ticked', [
        el('p.eyebrow', 'Calibration run'),
        el('h1', { style: { fontSize: 'clamp(2rem, 5.4vw, 3.4rem)' } }, [
          'Find your ',
          el('span', { style: { color: 'var(--phos)' } }, 'spawn point'),
        ]),
        el('p.lede', [
          `${questions.length} questions. Six archetypes. One coordinate on the Playstyle Plane. `,
          'There are no right answers and no personality quiz psychobabble — every option is something a real player would actually do.',
        ]),
        el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1.4rem' } }, [
          el('button.btn.btn--primary.btn--lg', { type: 'button', id: 'quiz-begin', onclick: begin }, 'Begin calibration'),
          el('a.btn.btn--ghost.btn--lg', { href: '/plane', 'data-link': true }, 'See the plane first'),
        ]),
        el('p.hero__note', 'No account needed. Your answers never leave this browser unless you choose to save them.'),
      ]),

      resumable
        ? el('div.resume-banner', [
            el('span', [
              'You have an unfinished run — ',
              el('b', `${saved.answers.filter((a) => Number.isInteger(a)).length} of ${questions.length}`),
              ' answered.',
            ]),
            el('div', { style: { display: 'flex', gap: '0.4rem' } }, [
              el('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => api.resume() }, 'Resume'),
              el('button.btn.btn--sm.btn--ghost', {
                type: 'button',
                onclick: (e) => {
                  clearProgress();
                  e.target.closest('.resume-banner').remove();
                },
              }, 'Discard'),
            ]),
          ])
        : null,

      el('div.start', [
        el('div.panel', [
          el('p.eyebrow', 'How it works'),
          el('ul.rules', [
            el('li', [el('b', 'Answer honestly.'), ' The algorithm has no interest in flattering you.']),
            el('li', [el('b', 'Watch the plane.'), ' It re-plots after every answer, so you can see your coordinate forming.']),
            el('li', [el('b', 'Skip if you must.'), ' A skipped question is genuinely skipped — it is not scored as a neutral.']),
            el('li', [el('b', 'Change your mind.'), ' Jump back to any question from the progress rail on the left.']),
            el('li', [el('b', 'Use the keyboard.'), ' Press 1–4 to answer, ← and → to navigate, Enter to advance.']),
          ]),
        ]),
        el('div.panel', [
          el('p.eyebrow', 'The six archetypes'),
          el('div.grid', { style: { gap: '0.7rem' } },
            ARCHETYPES.map((a) =>
              el('div.archetype-card', { style: { '--ac': a.color } }, [
                el('span.archetype-card__glyph', a.glyph),
                el('h4', a.name),
                el('p.archetype-card__tag', a.tagline),
              ]),
            ),
          ),
        ]),
      ]),

      el('div.panel', [
        el('p.eyebrow', 'Three opposing pairs'),
        el('p.muted', { style: { fontSize: '0.88rem', maxWidth: '62ch' } },
          'The six archetypes are arranged as three opposing pairs around the plane. Your coordinate is the weighted centre of everything you chose — so a strong pull toward one archetype physically pushes you away from the one opposite it.'),
        pairs,
      ]),
    ]);

    mount(host, view);
    host.querySelector('#quiz-begin')?.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Quiz screen                                                             */
  /* ---------------------------------------------------------------------- */

  function begin() {
    sfx.unlock();
    phase = 'quiz';
    startedAt = Date.now();
    index = 0;
    renderQuiz();
  }

  function renderQuiz() {
    const rail = el('aside.quiz__rail', { id: 'quiz-rail' });
    const side = el('aside.quiz__side', [
      el('h3', 'Live plot'),
      el('canvas.quiz__preview', { id: 'quiz-preview' }),
      el('div.quiz__sidefoot', [
        el('div', [el('b', 'Reading: '), el('span', { id: 'preview-read' }, '—')]),
        el('div', [el('b', 'Intensity: '), el('span', { id: 'preview-int' }, '—')]),
      ]),
    ]);
    const card = el('section.qcard', { id: 'quiz-card' });

    mount(host, el('div.quiz', [card, el('div', { style: { display: 'grid', gap: '1rem' } }, [rail, side])]));

    const canvas = host.querySelector('#quiz-preview');
    preview = new PlaneRenderer(canvas, {
      pad: 0.34,
      showLabels: true,
      showGrid: true,
      showSectors: true,
      showPopulation: false,
    });
    preview.reveal = 1;

    renderRail();
    renderCard();
    schedulePreview();
    persist();
  }

  function renderRail() {
    const rail = host.querySelector('#quiz-rail');
    if (!rail) return;
    const done = answeredCount();
    const current = questions[index];

    const pips = questions.map((q, i) => {
      const state = Number.isInteger(answers[i]) ? 'done' : i === index ? 'current' : 'todo';
      return el('button.rail__pip', {
        type: 'button',
        dataset: { state },
        title: `Question ${i + 1}`,
        'aria-label': `Go to question ${i + 1}${Number.isInteger(answers[i]) ? ' (answered)' : ''}`,
        onclick: () => goTo(i),
      });
    });

    mount(rail, [
      el('div.quiz__railhead', [
        el('div.quiz__counter', [
          String(index + 1),
          el('small', ` / ${questions.length}`),
        ]),
        el('div.readout', [el('strong', `${done}`), ' answered']),
      ]),
      el('div.rail', pips),
      el('div.progressbar', [
        el('div.progressbar__fill', { id: 'quiz-progress', style: { width: pct(done / questions.length) } }),
      ]),
      el('div.rail__hint', [
        el('div', [el('b', current.section ?? 'Calibration'), '']),
        el('div', `${questions.length - done} remaining`),
        el('div', { style: { marginTop: '0.4rem' } }, 'Keys: 1–4 answer · ← → move · Enter next'),
      ]),
      el('div.rail__actions', [
        el('button.btn.btn--ghost.btn--sm', {
          type: 'button',
          disabled: index === 0,
          onclick: () => goTo(index - 1),
        }, '← Back'),
        el('button.btn.btn--ghost.btn--sm', {
          type: 'button',
          disabled: index >= questions.length - 1,
          onclick: () => goTo(index + 1),
        }, 'Next →'),
      ]),
      el('div.rail__actions', [
        el('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => previewResult() }, 'Preview result'),
      ]),
      el('div.rail__actions', [
        el('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => finish(true) }, 'Finish now'),
      ]),
    ]);
  }

  function renderCard() {
    const card = host.querySelector('#quiz-card');
    if (!card) return;
    const q = questions[index];
    const chosen = answers[index];

    const options = q.options.map((o, i) =>
      el('button.option', {
        type: 'button',
        'aria-pressed': chosen === i ? 'true' : 'false',
        class: chosen === i ? 'is-chosen' : '',
        onclick: () => choose(i),
        onpointerenter: () => sfx.hover(),
      }, [
        el('span.option__key', OPTION_KEYS[i] ?? String(i + 1)),
        el('span', o.label),
      ]),
    );

    const body = el('div', [
      el('div.qcard__head', [
        el('span.qcard__index', `Question ${index + 1} of ${questions.length}`),
        el('span.qcard__id', q.id.toUpperCase()),
      ]),
      el('h2.qcard__prompt', q.prompt),
      q.sub ? el('p.qcard__sub', q.sub) : el('p.qcard__sub', ''),
      el('div.options', options),
    ]);

    mount(card, body);
    card.classList.remove('is-leaving');
  }

  function goTo(i) {
    const next = clamp(i, 0, questions.length - 1);
    if (next === index) return;
    sfx.back();
    index = next;
    renderRail();
    renderCard();
    persist();
    host.querySelector('#quiz-card')?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function choose(i) {
    const wasEmpty = !Number.isInteger(answers[index]);
    answers[index] = i;
    sfx.select();

    const card = host.querySelector('#quiz-card');
    const buttons = card?.querySelectorAll('.option') ?? [];
    buttons.forEach((b, bi) => {
      b.classList.toggle('is-chosen', bi === i);
      b.setAttribute('aria-pressed', bi === i ? 'true' : 'false');
    });

    renderRail();
    schedulePreview();
    persist();

    if (answeredCount() === questions.length) {
      sfx.complete();
      setTimeout(() => finish(false), 320);
      return;
    }

    // Auto-advance, but only when this was a fresh answer. Re-answering an
    // earlier question should not yank you forward.
    if (wasEmpty) {
      const nextUnanswered = findNextUnanswered();
      if (nextUnanswered !== -1) setTimeout(() => goTo(nextUnanswered), 260);
      else if (index < questions.length - 1) setTimeout(() => goTo(index + 1), 260);
    }
  }

  function findNextUnanswered() {
    for (let i = index + 1; i < questions.length; i++) if (!Number.isInteger(answers[i])) return i;
    for (let i = 0; i < index; i++) if (!Number.isInteger(answers[i])) return i;
    return -1;
  }

  /* ---------------------------------------------------------------------- */
  /* Preview / finish                                                        */
  /* ---------------------------------------------------------------------- */

  function previewResult() {
    const done = answeredCount();
    if (done === 0) {
      toastErr('Answer at least one question first.');
      return;
    }
    const s = partialResult();
    const p = ARCHETYPE_BY_KEY[s.primary];
    openModal((close) =>
      el('div', [
        el('div.modal__head', [
          el('div', [
            el('p.eyebrow', { style: { marginBottom: '0.2rem' } }, 'Provisional reading'),
            el('h3', { style: { margin: 0 } }, `${p.glyph} ${p.name}`),
          ]),
          el('button.icon-btn', { type: 'button', onclick: () => close(), 'aria-label': 'Close' }, '✕'),
        ]),
        el('p.muted', { style: { fontSize: '0.9rem' } },
          `Based on ${done} of ${questions.length} answers. This is where the plane currently thinks you sit — it will move as you keep going.`),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' } },
          ARCHETYPES.slice()
            .sort((a, b) => s.affinities[b.key] - s.affinities[a.key])
            .map((a) =>
              el('div.coord__block', { style: { '--ac': a.color } }, [
                el('div.coord__k', { style: { color: a.color } }, `${a.glyph} ${a.short}`),
                el('div.coord__v', [el('b', String(Math.round(s.affinities[a.key]))), el('small.mono.faint', ' / 100')]),
              ]),
            ),
        ),
        el('div', { style: { display: 'flex', gap: '0.5rem', marginTop: '1.2rem' } }, [
          el('button.btn.btn--ghost', { type: 'button', onclick: () => close() }, 'Keep answering'),
          el('button.btn.btn--primary', { type: 'button', onclick: () => { close(); finish(true); } }, 'See full result'),
        ]),
      ]),
    );
  }

  function finish(early) {
    const done = answeredCount();
    if (done === 0) {
      toastErr('You have not answered anything yet.');
      return;
    }
    if (early && done < questions.length) {
      const missing = questions.length - done;
      confirmFinish(missing);
      return;
    }
    commit();
  }

  function confirmFinish(missing) {
    openModal((close) =>
      el('div', [
        el('div.modal__head', [el('h3', { style: { margin: 0 } }, 'Finish with gaps?')]),
        el('p.muted', { style: { fontSize: '0.9rem' } },
          `${missing} question${missing === 1 ? '' : 's'} left unanswered. Skipped questions are excluded from the score entirely rather than counted as neutral — so the reading will be based on ${questions.length - missing} answers.`),
        el('div', { style: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.2rem' } }, [
          el('button.btn.btn--ghost', { type: 'button', onclick: () => close() }, 'Go back'),
          el('button.btn.btn--primary', { type: 'button', onclick: () => { close(); commit(); } }, 'Finish anyway'),
        ]),
      ]),
    );
  }

  function commit() {
    const result = partialResult();
    const payload = {
      answers,
      code: encodeAnswers(answers),
      durationMs: Date.now() - startedAt,
    };
    clearProgress();
    sfx.reveal();
    onFinish(result, payload);
  }

  /* ---------------------------------------------------------------------- */
  /* Keyboard                                                                */
  /* ---------------------------------------------------------------------- */

  function onKey(e) {
    if (phase !== 'quiz') return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= questions[index].options.length) {
      e.preventDefault();
      choose(n - 1);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const next = findNextUnanswered();
      if (next !== -1) goTo(next);
    }
  }

  document.addEventListener('keydown', onKey);
  const baseDestroy = api.destroy;
  api.destroy = () => {
    document.removeEventListener('keydown', onKey);
    baseDestroy();
  };

  return api;
}

/* -------------------------------------------------------------------------- */
/* Shared: the archetype legend used on several screens                        */
/* -------------------------------------------------------------------------- */

export function archetypeLegend(counts, { total } = {}) {
  const sum = total ?? ARCHETYPES.reduce((s, a) => s + (counts?.[a.key] || 0), 0);
  return el(
    'div.legend',
    ARCHETYPES.map((a) => {
      const n = counts?.[a.key] || 0;
      const share = sum ? n / sum : 0;
      return el('div.legend__row', [
        el('span.legend__glyph', { style: { color: a.color } }, a.glyph),
        el('span.legend__name', [el('b', a.short), el('span.faint', ` — ${a.tagline}`)]),
        el('span.legend__count', sum ? `${pct(share, 1)} · ${n}` : `${n}`),
      ]);
    }),
  );
}

export { tween, toastOk };
