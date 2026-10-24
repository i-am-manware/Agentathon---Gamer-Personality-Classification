import { h } from '../ui.js';
import { sfx } from '../audio.js';
import { takePendingCode, takeClaimFlag, state, clearQuizSession, getLastRun } from '../state.js';
import { api } from '../api.js';
import { decodeResult } from '../../../shared/codec.js';
import { scoreRun } from '../../../shared/scoring.js';
import { QUESTIONS, QUIZ_VERSION } from '../../../shared/questions.js';

// Theater with real numbers where we have them: the share code carries the
// axes/affinities/conviction; evidence totals come from the stashed answers.
const LINES = (score, evidenceTotal) => [
  `> ingesting responses ............. ${QUESTIONS.length}/${QUESTIONS.length} OK`,
  evidenceTotal != null
    ? `> weighing evidence ............... ${evidenceTotal} pts`
    : '> weighing evidence ............... heavy ones',
  `> dominance ratios (kappa=2.0) .... ${score.axes.length} axes`,
  `> affinity smoothing (beta=1) ..... 6 poles`,
  `> convex placement ................ (${score.point.x.toFixed(2)}, ${score.point.y.toFixed(2)})`,
  `> conviction ....................... ${score.conviction.pct}% ${score.conviction.tier}`,
  `> formatting verdict .............. done`,
];

export function computeView(root) {
  document.title = 'Computing — SPAWNPOINT';
  const code = takePendingCode();
  if (!code) {
    location.hash = '#/';
    return null;
  }
  const score = decodeResult(code);
  if (!score) {
    location.hash = '#/';
    return null;
  }

  clearQuizSession();

  const last = getLastRun();
  let evidenceTotal = null;
  if (last && Array.isArray(last.answers) && last.answers.length === QUESTIONS.length) {
    try {
      evidenceTotal = Object.values(scoreRun(last.answers).evidence).reduce((s, n) => s + n, 0);
    } catch {
      /* theater only */
    }
  }

  const lines = LINES(score, evidenceTotal);
  const log = h('div', { class: 'bootlog bootlog--compute' },
    lines.map((line, i) => h('div', { class: 'bootlog__line', style: `--i:${i}` }, line))
  );
  const done = h('div', { class: 'compute__done' }, 'SPAWN COORDINATES LOCKED. RENDERING…');

  root.append(
    h(
      'section',
      { class: 'module computemodule' },
      h('h2', { class: 'module__title' }, 'ANALYZING PLAYER DATA'),
      log,
      done
    )
  );

  sfx.reveal();

  // signed-in players: quietly save the fresh run to their memory card
  const claim = takeClaimFlag();
  if (state.user && claim && last && Array.isArray(last.answers)) {
    api.saveRun(last.answers, QUIZ_VERSION).catch(() => {});
  }

  const timer = setTimeout(() => {
    location.hash = `#/r/${code}`;
  }, 2100);

  return () => clearTimeout(timer);
}

export const title = 'Computing — SPAWNPOINT';
