import { h, iconSVG } from '../ui.js';
import { sfx } from '../audio.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';
import { POLE_RING, vertex, AXES, clamp } from '../../../shared/axes.js';
import { hexplane, demoShares, dominantPole } from '../components/hexplane.js';
import { affinityBars, axisLeanBars } from '../components/bars.js';

const AXIS_BLURBS = {
  valor: 'win the world ⟷ see the world — conquest versus pure horizon',
  order: 'plan it ⟷ break it — spreadsheets versus physics crimes',
  campfire: 'the squad\u2019s story ⟷ the world\u2019s story — parties versus codexes',
};

const AXES_ROMAN = { valor: 'AXIS I — VALOR', order: 'AXIS II — ORDER', campfire: 'AXIS III — CAMPFIRE' };

export function mapView(root) {
  document.title = 'The Great Map — SPAWNPOINT';

  let demoPoint = { x: 0.52, y: 0.34 };
  let selected = dominantPole(demoShares(demoPoint));

  const dossier = h('section', { class: 'module dossier' });
  const livePanel = h('section', { class: 'module livepanel' });

  function scoreFromPoint(p) {
    const shares = demoShares(p);
    const ranked = [...POLE_RING].sort((a, b) => shares[b] - shares[a]);
    let floors = ranked.map((id) => Math.floor(shares[id] * 100));
    let rem = 100 - floors.reduce((s, n) => s + n, 0);
    const fracs = ranked.map((id) => shares[id] * 100 - Math.floor(shares[id] * 100));
    const order = [...fracs.keys()].sort((a, b) => fracs[b] - fracs[a]);
    for (let k = 0; k < rem; k++) floors[order[k % floors.length]]++;
    const affinities = ranked.map((id, i) => ({ id, share: shares[id], pct: floors[i], rank: i + 1 }));
    const axes = AXES.map((ax) => {
      const u = vertex(ax.plus);
      const value = clamp(p.x * u.x + p.y * u.y, -1, 1);
      return { id: ax.id, plus: ax.plus, minus: ax.minus, value, strength: Math.abs(value), toward: value >= 0 ? ax.plus : ax.minus };
    });
    return {
      affinities,
      axes,
      shares,
      point: p,
      primary: ranked[0],
      secondary: ranked[1],
      conviction: { pct: Math.round((axes.reduce((s, ax) => s + ax.strength, 0) / 3) * 100) },
    };
  }

  function renderDossier(pole) {
    const arch = ARCHETYPES[pole];
    dossier.replaceChildren(
      h('h2', { class: 'module__title' }, 'DOSSIER'),
      h(
        'div',
        { class: 'dossier__head', style: `--c:${arch.color}` },
        h('span', { class: 'dossier__icon', html: iconSVG(pole, { size: 40 }) }),
        h(
          'div',
          null,
          h('div', { class: 'dossier__name' }, arch.name),
          h('div', { class: 'dossier__epithet' }, arch.epithet)
        )
      ),
      h('p', { class: 'dossier__about' }, arch.about),
      h('div', { class: 'tri' },
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--ok' }, 'PARTY BUFFS'),
          h('ul', { class: 'list' }, arch.strengths.map((s) => h('li', null, s)))),
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--warn' }, 'SIDE EFFECTS'),
          h('ul', { class: 'list' }, arch.fatigue.map((s) => h('li', null, s)))),
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--dim' }, 'SPAWN NEARBY'),
          h('ul', { class: 'list' }, arch.kin.map((s) => h('li', null, s))))
      )
    );
  }

  function renderLive(p) {
    const score = scoreFromPoint(p);
    livePanel.replaceChildren(
      h('h2', { class: 'module__title' }, 'DEMO READOUT'),
      h('p', { class: 'livepanel__hint' },
        'This is a playground point — drag it. A real spawn comes from the diagnostic.'),
      h('div', { class: 'livepanel__place', style: `--c:${ARCHETYPES[score.primary].color}` },
        h('span', { class: 'livepanel__label' }, 'STRONGEST REGION'),
        h('b', { class: 'livepanel__value' }, ARCHETYPES[score.primary].name),
        h('span', { class: 'livepanel__spot' }, ARCHETYPES[score.primary].spot)),
      h('div', { class: 'livepanel__bars' }, affinityBars(score, { animate: false })),
      h('div', { class: 'livepanel__axes' }, axisLeanBars(score))
    );
  }

  const plane = hexplane({
    demoPoint,
    onDemo(p) {
      demoPoint = p;
      renderLive(p);
    },
    onPick(pole) {
      selected = pole;
      sfx.tap();
      renderDossier(pole);
    },
    reveal: false,
  });

  const axesRows = AXES.map((ax) =>
    h(
      'div',
      { class: 'axisrow' },
      h('span', { class: 'axisrow__roman' }, AXES_ROMAN[ax.id]),
      h('span', { class: 'axisrow__dots' },
        h('i', { class: 'axisrow__dot', style: `--c:${ARCHETYPES[ax.plus].color}` }),
        h('i', { class: 'axisrow__vs' }, '⟷'),
        h('i', { class: 'axisrow__dot', style: `--c:${ARCHETYPES[ax.minus].color}` })),
      h('span', { class: 'axisrow__label' }, `${ARCHETYPES[ax.plus].name} ⟷ ${ARCHETYPES[ax.minus].name}`),
      h('span', { class: 'axisrow__blurb' }, AXIS_BLURBS[ax.id])
    )
  );

  root.append(
    h(
      'header',
      { class: 'pagehead' },
      h('h1', { class: 'pagehead__title' }, 'THE GREAT MAP'),
      h('p', { class: 'pagehead__sub' },
        'Six archetypes live on the vertices of a hexagonal plane, arranged as three opposing axes. ',
        'Your answers pull you along each axis; the diagnostic places your spawn where the pulls cancel out.')
    ),
    h(
      'div',
      { class: 'mapgrid' },
      h('section', { class: 'module planemodule' },
        h('h2', { class: 'module__title' }, 'THE PLANE — drag the demo point'),
        plane.el),
      h('div', { class: 'mapside' }, livePanel, dossier)
    ),
    h('section', { class: 'module axesmodule' },
      h('h2', { class: 'module__title' }, 'THE THREE AXES'),
      axesRows),
    h('section', { class: 'ctamodule' },
      h('a', { class: 'btn btn--primary btn--big', href: '#/quiz' }, 'RUN THE DIAGNOSTIC →'),
      h('span', { class: 'ctamodule__note' }, '24 queries · ~3 minutes · shareable spawn coordinates'))
  );

  renderLive(demoPoint);
  renderDossier(selected);
  return null;
}

export const title = 'The Great Map — SPAWNPOINT';
