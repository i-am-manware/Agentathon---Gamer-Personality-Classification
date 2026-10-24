import { h, toast, fmtDate } from '../ui.js';
import { sfx } from '../audio.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';
import { POLE_RING } from '../../../shared/axes.js';
import { decodeResult } from '../../../shared/codec.js';
import { hexplane } from '../components/hexplane.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// params: a = older run, b = newer run (each a server run id OR a share code)
export async function diffView(root, params) {
  document.title = 'Diff — SPAWNPOINT';

  async function resolve(token) {
    if (UUID_RE.test(token)) {
      if (!state.user) throw new Error('sign in to diff server runs (or diff share codes)');
      const { run } = await api.getRun(token);
      // rehydrate a score-shaped object from the stored summary
      const shares = {};
      const total = run.affinities.reduce((s, n) => s + n, 0) || 1;
      POLE_RING.forEach((pole, i) => (shares[pole] = run.affinities[i] / total));
      const ranked = [...POLE_RING].sort((a, b) => shares[b] - shares[a]);
      return {
        run,
        score: {
          affinities: ranked.map((id) => ({ id, share: shares[id], pct: run.affinities[POLE_RING.indexOf(id)] })),
          shares,
          axes: run.axes.map((value, i) => {
            const PAIRS = [
              { id: 'valor', plus: 'conqueror', minus: 'wayfarer' },
              { id: 'order', plus: 'architect', minus: 'gremlin' },
              { id: 'campfire', plus: 'hypeman', minus: 'lorekeeper' },
            ];
            return { ...PAIRS[i], value, strength: Math.abs(value), toward: value >= 0 ? PAIRS[i].plus : PAIRS[i].minus };
          }),
          point: run.point,
          primary: run.primary,
          secondary: run.secondary,
          conviction: { pct: run.convictionPct },
          title: run.title,
        },
      };
    }
    const score = decodeResult(token);
    if (!score) throw new Error('one of the codes is corrupted');
    return { run: null, score };
  }

  let older, newer;
  try {
    [older, newer] = await Promise.all([resolve(params.a), resolve(params.b)]);
  } catch (err) {
    root.append(h('section', { class: 'module module--error' },
      h('h2', { class: 'module__title' }, 'DIFF FAILED'),
      h('p', null, err.message || 'could not load one of the runs'),
      h('p', null, h('a', { class: 'btn', href: '#/profile' }, 'BACK TO SAVE DATA'))));
    return null;
  }

  const a = older.score;
  const b = newer.score;
  const aPct = Object.fromEntries(a.affinities.map((r) => [r.id, r.pct]));
  const bPct = Object.fromEntries(b.affinities.map((r) => [r.id, r.pct]));

  const moved = Math.hypot(b.point.x - a.point.x, b.point.y - a.point.y);
  const movedPct = Math.round(moved * 100);

  let biggestMover = null;
  for (const pole of POLE_RING) {
    const d = (bPct[pole] ?? 0) - (aPct[pole] ?? 0);
    if (!biggestMover || Math.abs(d) > Math.abs(biggestMover.d)) biggestMover = { pole, d };
  }
  const convDelta = (b.conviction.pct ?? 0) - (a.conviction.pct ?? 0);

  const answerDrift =
    older.run && newer.run && Array.isArray(older.run.answers) && Array.isArray(newer.run.answers)
      ? older.run.answers.reduce((acc, v, i) => acc + (v !== newer.run.answers[i] ? 1 : 0), 0)
      : null;

  const plane = hexplane({ score: b, ghost: a, ghostLabel: 'OLD', reveal: false });

  const axisRows = b.axes.map((ax, i) => {
    const va = a.axes[i].value;
    const vb = ax.value;
    const delta = vb - va;
    const towardPole = delta >= 0 ? ax.plus : ax.minus;
    const arch = ARCHETYPES[towardPole];
    const fill = h('i', { class: 'axis-track__fill' + (delta >= 0 ? ' axis-track__fill--right' : ' axis-track__fill--left'), style: `--c:${arch.color}` });
    const width = Math.min(50, Math.abs(delta) * 50);
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${width}%`)));
    return h(
      'div',
      { class: 'axislean-row' },
      h('span', { class: 'axislean-row__pole' }, `${ARCHETYPES[ax.plus].name} ${va >= 0 ? '+' : ''}${va.toFixed(2)}`),
      h('span', { class: 'axis-track' }, h('i', { class: 'axis-track__notch' }), fill),
      h('span', { class: 'axislean-row__pole axislean-row__pole--r' },
        `${vb >= 0 ? '+' : ''}${vb.toFixed(2)} ${ARCHETYPES[ax.minus].name}`)
    );
  });

  const affRows = POLE_RING.map((pole) => {
    const before = aPct[pole] ?? 0;
    const after = bPct[pole] ?? 0;
    const d = after - before;
    return h(
      'div',
      { class: 'affrow', style: `--c:${ARCHETYPES[pole].color}` },
      h('span', { class: 'affrow__name' }, ARCHETYPES[pole].name),
      h('span', { class: 'affrow__vals' },
        h('b', null, `${before}%`), h('i', { class: 'affrow__arrow' }, '→'), h('b', null, `${after}%`)),
      h('span', { class: 'affrow__delta' + (d > 0 ? ' is-up' : d < 0 ? ' is-down' : '') },
        d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '· 0')
    );
  });

  const when = (side) =>
    side.run ? fmtDate(side.run.createdAt) : side.run === null ? 'a code' : '';

  root.append(
    h('header', { class: 'pagehead' },
      h('h1', { class: 'pagehead__title' }, 'RUN DIFF'),
      h('p', { class: 'pagehead__sub' },
        `from “${older.run ? older.run.title : a.primary + '/' + a.secondary}” (${when(older)}) `,
        `to “${newer.run ? newer.run.title : b.primary + '/' + b.secondary}” (${when(newer)})`)),
    h('div', { class: 'result-grid' },
      h('section', { class: 'module planemodule' },
        h('h2', { class: 'module__title' }, 'MOVEMENT — old ghost → new spawn'),
        plane.el,
        h('div', { class: 'planemodule__lean' },
          h('h3', { class: 'subtle-title' }, 'AXIS DRIFT (Δ)'),
          h('div', { class: 'axislean' }, axisRows))),
      h('div', { class: 'result-col' },
        h('section', { class: 'module mixmodule' },
          h('h2', { class: 'module__title' }, 'VERDICT'),
          h('div', { class: 'diffstats' },
            diffStat('MOVED', `${movedPct >= 100 ? 99 : movedPct}% of the map`, movedPct < 8 ? 'basically the same person' : movedPct > 40 ? 'a whole new save file' : 'recognizable, but drifting'),
            diffStat('BIGGEST MOVER', `${biggestMover.d > 0 ? '+' : ''}${biggestMover.d}% ${ARCHETYPES[biggestMover.pole].name}`, biggestMover.d > 0 ? 'you fed that side of you' : 'that side of you went quiet'),
            diffStat('CONVICTION', `${convDelta >= 0 ? '+' : ''}${convDelta} pts`, convDelta > 0 ? 'your answers got louder' : 'your answers got softer'),
            answerDrift != null
              ? diffStat('ANSWER DRIFT', `${answerDrift} of 24 queries`, answerDrift === 0 ? 'identical answers — impressive consistency' : 'the needle moved on these')
              : diffStat('ANSWER DRIFT', 'n/a', 'answer-level diff needs two server saves'))),
        h('section', { class: 'module mixmodule' },
          h('h2', { class: 'module__title' }, 'AFFINITY SHIFT'),
          h('div', { class: 'afftable' }, affRows)))),
    h('section', { class: 'ctamodule' },
      h('a', { class: 'btn btn--primary', href: '#/quiz' }, 'RUN IT AGAIN →'),
      h('a', { class: 'btn', href: '#/profile' }, 'BACK TO SAVE DATA'))
  );

  sfx.reveal();
  return null;
}

function diffStat(label, value, note) {
  return h('div', { class: 'diffstat' },
    h('span', { class: 'diffstat__label' }, label),
    h('b', { class: 'diffstat__value' }, value),
    h('span', { class: 'diffstat__note' }, note));
}

export const title = 'Diff — SPAWNPOINT';
