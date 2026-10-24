/**
 * SPAWNPOINT — application entry point.
 *
 * A hand-rolled hash router (with real-path support for shared result links),
 * a small view registry, and the boot sequence. No framework: the whole
 * client is about as much code as a framework's hello world.
 */

import { el, mount, $ } from './dom.js';
import { api, setAttemptHeader } from './api.js';
import { sfx } from './sfx.js';
import { toast, toastErr } from './toasts.js';
import { createQuiz, archetypeLegend } from './quiz.js';
import { renderResults } from './results.js';
import { refreshUser, renderAccountSlot, renderHistory, openAuth, getUser } from './auth.js';
import { PlaneRenderer, markerFor, populationPoints } from './plane.js';
import { loadAttemptIds, loadLastResult, saveLastResult, markSeenIntro } from './store.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY } from '/shared/archetypes.js';
import { decodeAnswers, score } from '/shared/scoring.js';

const main = document.getElementById('main');
const statusEl = document.getElementById('footer-status');

let quizData = null;
let activeCleanup = null;

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

async function boot() {
  wireChrome();
  setAttemptHeader(loadAttemptIds());

  try {
    quizData = await api.quiz();
  } catch (err) {
    mount(main, el('div.panel', [
      el('p.eyebrow', 'Offline'),
      el('h1', 'Cannot reach the server'),
      el('p.lede', err?.message || 'The API did not respond.'),
      el('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, 'Retry'),
    ]));
    setStatus('offline');
    return;
  }

  setStatus(`${quizData.questions.length} questions loaded`);
  await refreshUser();
  renderAccountSlot($('#account-slot'), { onOpenHistory: () => navigate('/history') });

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  route();
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

/* -------------------------------------------------------------------------- */
/* Chrome (top bar, sfx toggle, link interception)                            */
/* -------------------------------------------------------------------------- */

function wireChrome() {
  const toggle = document.getElementById('sfx-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(sfx.enabled));
    toggle.addEventListener('click', () => {
      const on = sfx.toggle();
      toggle.setAttribute('aria-pressed', String(on));
      if (on) toast('Sound on.', { kind: 'info', ms: 1600 });
    });
  }

  // Any click is a chance to unlock the AudioContext.
  const unlock = () => sfx.unlock();
  document.addEventListener('pointerdown', unlock, { once: true });

  // Intercept same-origin navigations so the SPA router handles them.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//')) return;
    e.preventDefault();
    navigate(href);
  });
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === target) route();
  else location.hash = target;
}

/* -------------------------------------------------------------------------- */
/* Router                                                                     */
/* -------------------------------------------------------------------------- */

function cleanup() {
  activeCleanup?.();
  activeCleanup = null;
}

function route() {
  cleanup();
  const path = location.hash.replace(/^#/, '') || '/';
  const [head, ...rest] = path.split('/').filter(Boolean);
  window.scrollTo({ top: 0, behavior: 'auto' });

  switch (head) {
    case undefined:
      return viewHome();
    case 'quiz':
      return viewQuiz();
    case 'r':
      return viewShared(rest.join('/'));
    case 'plane':
      return viewPlane();
    case 'about':
      return viewAbout();
    case 'history':
      return viewHistory();
    case 'result':
      return viewLastResult();
    default:
      return viewNotFound(path);
  }
}

function setNav(path) {
  document.querySelectorAll('.topnav__link').forEach((a) => {
    const href = a.getAttribute('href').replace(/^#/, '') || '/';
    if (href === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

function viewHome() {
  setNav('/');
  const quiz = createQuiz({
    questions: quizData.questions,
    onFinish: (result, payload) => {
      cleanup();
      showResult(result, { payload });
    },
  });
  quiz.render(main);
  activeCleanup = () => quiz.destroy();
}

function viewQuiz() {
  setNav('/');
  viewHome();
}

/** The canonical result view, also used after finishing the quiz. */
async function showResult(result, ctx) {
  const host = el('div');
  mount(main, host);
  setStatus(`Result ${result.signature}`);

  const handle = await renderResults(host, result, {
    ...ctx,
    user: getUser(),
    onRetake: () => navigate('/'),
    onSignIn: () => openAuth('register'),
  });

  saveLastResult({ result, payload: ctx.payload, at: Date.now() });
  activeCleanup = () => handle.plane?.destroy();
}

/** Recompute a result from a share code (or call sign) in the URL. */
async function viewShared(code) {
  setNav('');
  mount(main, el('div.panel', [el('p.eyebrow', 'Decoding'), el('p.muted', 'Recomputing this result from its answers…')]));

  // A call sign is not reversible, so look it up on the server first.
  const isCode = /^[0-9a-z-]+$/i.test(code) && code.length <= 64 && code.includes('-') === false;

  let answers = null;
  if (isCode) {
    answers = decodeAnswers(code, quizData.questions.length);
  } else {
    try {
      const found = await api.getAttempt(code);
      answers = decodeAnswers(found.answers, quizData.questions.length);
    } catch {
      answers = null;
    }
  }

  if (!answers || !answers.some((a) => Number.isInteger(a))) {
    mount(main, el('div.panel', [
      el('p.eyebrow', 'Not found'),
      el('h1', 'That result link is not valid'),
      el('p.lede', 'The code may be mistyped, or the run it points at was deleted.'),
      el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Take the quiz instead'),
    ]));
    return;
  }

  const result = score(answers, quizData.questions);
  await showResult(result, { payload: { answers, code } });
}

function viewLastResult() {
  setNav('');
  const saved = loadLastResult();
  if (!saved?.result) {
    mount(main, el('div.panel', [
      el('p.eyebrow', 'Nothing here'),
      el('h1', 'No result yet'),
      el('p.lede', 'Take the quiz and your coordinate will live here.'),
      el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Start the quiz'),
    ]));
    return;
  }
  showResult(saved.result, { payload: saved.payload });
}

async function viewPlane() {
  setNav('/plane');

  const canvas = el('canvas', { 'aria-label': 'Population distribution on the Playstyle Plane' });
  const tooltip = el('div.plane-tooltip');
  const hudTr = el('div.plane-hud.plane-hud--tr');
  const hudBr = el('div.plane-hud.plane-hud--br');

  const wrap = el('div.plane-wrap', { style: { maxWidth: '620px' } }, [
    el('div.plane-hud.plane-hud--tl', el('b', 'POPULATION PLOT')),
    hudTr,
    hudBr,
    canvas,
    tooltip,
  ]);

  const legendHost = el('div', { id: 'plane-legend' });

  mount(main, [
    el('header.result__head', [
      el('div', [
        el('p.eyebrow', { style: { marginBottom: '0.3rem' } }, 'Live telemetry'),
        el('h1', { style: { fontSize: 'clamp(1.9rem, 5vw, 3rem)' } }, 'The Playstyle Plane'),
        el('p.lede', 'Every run this server has ever scored, plotted at its own coordinate. The seeds are simulated players; the bright points are real ones.'),
      ]),
      el('div.result__actions', [
        el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Add your point'),
      ]),
    ]),
    el('div.plane-stage', [
      wrap,
      el('div.coord', [
        el('div.coord__block', [
          el('div.coord__k', 'Population'),
          el('div.coord__v', [el('b', { id: 'pop-total' }, '—'), el('small.mono.faint', ' runs')]),
        ]),
        el('div.coord__block', [
          el('div.coord__k', 'Distribution'),
          legendHost,
        ]),
        el('div.coord__block', [
          el('div.coord__k', 'How to read it'),
          el('p.faint', { style: { fontSize: '0.8rem', margin: 0, lineHeight: '1.6' } },
            'Distance from the centre is intensity, not quality. Points near the middle are players with genuinely broad taste; points on the rim are specialists. Hover any point for its coordinate.'),
        ]),
      ]),
    ]),
  ]);

  const plane = new PlaneRenderer(canvas, { pad: 0.3, fullLabels: true, interactive: true });
  plane.onHover = (point, screen) => {
    if (!point || !screen) return tooltip.classList.remove('is-visible');
    const a = ARCHETYPE_BY_KEY[point.primary];
    mount(tooltip, [
      el('b', { style: { color: a?.color } }, `${a?.glyph ?? ''} ${a?.short ?? 'Unknown'}`),
      el('span', `${point.source === 'seed' ? 'Simulated' : 'Real player'} · ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`),
    ]);
    tooltip.style.left = `${screen.sx}px`;
    tooltip.style.top = `${screen.sy}px`;
    tooltip.classList.add('is-visible');
  };

  try {
    const data = await api.population(1800);
    const summary = data.summary ?? {};
    plane.setPopulation(populationPoints(data.points || []));
    mount($('#pop-total'), String(summary.total ?? 0));
    mount(hudTr, el('b', String(data.sampled ?? (data.points || []).length)), ' sampled');
    mount(legendHost, archetypeLegend(summary.counts, { total: summary.total }));
  } catch {
    mount(legendHost, el('p.faint', 'Population data unavailable.'));
  }

  activeCleanup = () => plane.destroy();
}

function viewAbout() {
  setNav('/about');

  mount(main, [
    el('header', [
      el('p.eyebrow', { style: { marginBottom: '0.3rem' } }, 'Methodology'),
      el('h1', { style: { fontSize: 'clamp(1.9rem, 5vw, 3rem)' } }, 'How the algorithm works'),
      el('p.lede', 'No personality science was harmed in the making of this quiz. Here is exactly what the model does with your answers.'),
    ]),

    el('div', { style: { display: 'grid', gap: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', marginTop: '1.6rem' } }, [
      el('section.panel.panel--ticked', [
        el('p.eyebrow', '1 · The frame'),
        el('p.muted', 'Each archetype owns a fixed unit vector on the plane, 60° apart. Your answers produce a weight vector over the six, normalised to a distribution w. Your coordinate is the weighted barycentre of the six vertices:'),
        el('pre', { style: preStyle }, 'P = Σ wᵢ · Vᵢ'),
        el('p.muted', 'A hexagon is not decoration here — it is the load-bearing choice. It is the only regular polygon whose six vertices sum to the origin while still forming three clean opposing pairs. That is what makes “no strong preference” land exactly on (0,0) rather than drifting to one side.'),
      ]),
      el('section.panel.panel--ticked', [
        el('p.eyebrow', '2 · Debiasing'),
        el('p.muted', 'No question bank is perfectly even. If Competitor options are worded more often than Curator options, a player answering at random still drifts toward Competitor — which is a lie. So the model computes E, the weight vector a uniformly random playthrough would score against this exact bank, and works with the deviation:'),
        el('pre', { style: preStyle }, 'd = w − E'),
        el('p.muted', 'E is derived from the bank at runtime and memoised. Questions can be rewritten later without silently shifting everyone’s coordinate.'),
      ]),
      el('section.panel.panel--ticked', [
        el('p.eyebrow', '3 · Whitening'),
        el('p.muted', 'Some archetypes are simply easier to trigger than others. Left alone, that gives them a longer lever over the coordinate than their siblings. The model measures how far a maximally-consistent playthrough for each archetype can push the point, and rescales the axes so all six reach the same distance.'),
        el('p.muted', 'It also folds in the spread of each archetype under random play, so a noisier archetype does not outrank a stable one on sampling luck alone.'),
      ]),
      el('section.panel.panel--ticked', [
        el('p.eyebrow', '4 · Taring the radius'),
        el('p.muted', 'Raw deviation is a narrow band: about 0.15 for a coin-flip responder, rising to about 0.6 for someone who picks the most on-brand option every single time. Plotted raw, everybody lands in a small ring near the middle. So the scale is tared the way you would zero a set of scales:'),
        el('pre', { style: preStyle }, 'r = ((|d| − FLOOR) / (CEILING − FLOOR)) ^ 0.62'),
        el('p.muted', 'FLOOR is the mean |d| of a simulated coin-flip responder — the instrument’s noise floor. CEILING is the mean |d| of the six maximally-consistent playthroughs. Both are computed from the bank at startup, not hand-tuned magic numbers.'),
      ]),
    ]),

    el('section.panel', { style: { marginTop: '1.2rem' } }, [
      el('p.eyebrow', 'What the numbers mean'),
      el('div', { style: { display: 'grid', gap: '0.7rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } }, [
        readout('Affinity (0–100)', 'Per archetype, against a neutral baseline of 50. A bar above the midline is physically pulling your coordinate toward that vertex.'),
        readout('Radius (0–1)', 'Distance from the centre. 0 means the model genuinely cannot tell your preference from randomness; 1 means as committed as this quiz can detect.'),
        readout('Heading', 'The direction of your coordinate in degrees from east. It names the archetype territory you point at.'),
        readout('Versatility', 'Entropy of your positive excess across the six archetypes. High means you spread your excess widely; low means you concentrated it.'),
        readout('Margin', 'The affinity gap between your top two archetypes. Below 9 points the reading is presented as a hybrid rather than a verdict.'),
        readout('Call sign', 'A deterministic six-character code derived from your answer pattern and coordinate. Identical playthroughs collide.'),
      ]),
    ]),

    el('section.panel', { style: { marginTop: '1.2rem' } }, [
      el('p.eyebrow', 'Honest limitations'),
      el('ul.rules', [
        el('li', 'This is a designed classifier, not a validated psychometric instrument. It has no claim to scientific validity and does not want one.'),
        el('li', 'The archetypes were chosen to be recognisable and fun to argue about, not to be exhaustive.'),
        el('li', 'Skipped questions are excluded from the score entirely rather than counted as neutral, so a run with gaps is genuinely a run with gaps.'),
        el('li', 'The scoring module is shared verbatim between the browser and the server — the live preview you watch while answering is the identical code path that produces your final result.'),
      ]),
    ]),

    el('div', { style: { display: 'flex', gap: '0.6rem', marginTop: '1.4rem', flexWrap: 'wrap' } }, [
      el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Take the quiz'),
      el('a.btn.btn--ghost', { href: '/plane', 'data-link': true }, 'See the population'),
    ]),
  ]);
}

const preStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.86rem',
  padding: '0.7rem 0.9rem',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--phos)',
  overflowX: 'auto',
  margin: '0 0 0.9rem',
};

function readout(k, v) {
  return el('div.coord__block', [
    el('div.coord__k', k),
    el('p.muted', { style: { fontSize: '0.85rem', margin: 0, lineHeight: '1.6' } }, v),
  ]);
}

async function viewHistory() {
  setNav('');
  const host = el('div');
  mount(main, host);
  await renderHistory(host, {
    onOpen: async (a) => {
      mount(main, el('div.panel', [el('p.eyebrow', 'Loading'), el('p.muted', 'Recomputing that run…')]));
      const result = score(decodeAnswers(a.answers, quizData.questions.length), quizData.questions);
      await showResult(result, { attempt: a, payload: { answers: decodeAnswers(a.answers, quizData.questions.length), code: a.answers } });
    },
    onRetake: () => navigate('/'),
  });
}

function viewNotFound(path) {
  setNav('');
  mount(main, el('div.panel.panel--ticked', [
    el('p.eyebrow', '404'),
    el('h1', 'No such coordinate'),
    el('p.lede', `Nothing is mapped at ${path}.`),
    el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Back to the quiz'),
  ]));
}

/* -------------------------------------------------------------------------- */
/* Go                                                                         */
/* -------------------------------------------------------------------------- */

boot().catch((err) => {
  console.error(err);
  mount(main, el('div.panel', [
    el('p.eyebrow', 'Crash'),
    el('h1', 'Something broke on boot'),
    el('pre', { style: preStyle }, String(err?.stack || err)),
  ]));
});
