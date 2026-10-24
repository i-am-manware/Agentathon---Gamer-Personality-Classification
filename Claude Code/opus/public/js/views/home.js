import { h, store, reducedMotion } from '../dom.js';
import { ARCH, ARCH_ORDER, OPPOSITE, AXES, TITLES, QUESTIONS, decodeCode, analyze } from '/shared/engine.js';
import { PROFILES, AXIS_BLURB } from '/shared/content.js';
import { createPlane } from '../plane.js';
import { glyph } from '../glyphs.js';
import { getStats } from '../state.js';

const RAD = Math.PI / 180;

export function describeArch(k) {
  return { kicker: `Pole · vs ${ARCH[OPPOSITE[k]].name}`, title: `The ${ARCH[k].name}`, body: PROFILES[k].short + ' ' + PROFILES[k].habitat + '.' };
}

export function renderHome(root) {
  document.title = 'PLAYERPRINT — the gamer soul atlas';
  const progress = store.get('pp.progress');
  const last = store.get('pp.last');
  const lastResult = last && decodeCode(last.code) ? analyze(decodeCode(last.code), { bootstrap: 0 }) : null;
  const inProgress = progress && Array.isArray(progress.answers) && progress.answers.some((a) => a !== null) && !progress.answers.every((a) => a !== null);

  const plane = createPlane({ describe: describeArch, onSelect: (k) => document.getElementById(`arch-${k}`)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }) });
  getStats().then((st) => st && plane.setCrowd(st));

  const stampTitle = h('b', 'The Wayfarer');
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'wrap hero-grid' },
      h('div', { class: 'hero-copy' },
        h('div', { class: 'issue-line kicker' }, h('span', 'Issue Nº 01'), h('span', 'A field atlas of gamer souls'), h('span', `${QUESTIONS.length} questions`)),
        h('h1', {},
          h('span', { class: 'line' }, 'What kind'),
          h('span', { class: 'line' }, 'of player are'),
          h('span', { class: 'line' }, 'you, ', h('em', { class: 'riso wobble', 'data-text': 'really?' }, 'really?'))),
        h('p', { class: 'lede' },
          'Not a label. A location. Answer ', String(QUESTIONS.length), ' unreasonably specific questions and we plot you on a six-pole map of how people actually play — then tell you what your spot says about you.'),
        h('div', { class: 'hero-cta' },
          h('a', { class: 'btn btn-hot', href: '/quiz', 'data-link': '' }, inProgress ? 'Resume the field test' : 'Start the field test', h('span', { class: 'arrow' }, '→')),
          h('a', { class: 'btn btn-ghost', href: '/atlas', 'data-link': '' }, 'See the atlas')),
        h('div', { class: 'hero-meta kicker' }, h('span', '~4 minutes'), h('span', 'No sign-up required'), h('span', 'Shareable card')),
        lastResult ? h('a', { class: 'resume', href: `/r/${last.code}` }, 'Your last print: ', h('b', lastResult.title), ' →') : null),
      h('div', { class: 'hero-art' }, plane.el, h('div', { class: 'hero-stamp', 'aria-hidden': 'true' }, 'Now plotting', stampTitle))));

  // Wandering demo dot: drifts between archetypes, updating the stamp.
  let alive = true;
  (async () => {
    const tour = ['W', 'AW', 'A', 'AB', 'B', 'BC', 'C', 'CG', 'G', 'DG', 'D', 'DW'];
    let i = 0;
    await plane.setMe({ x: 0, y: 0 }, { animate: false, tag: 'YOU?' });
    while (alive) {
      const key = tour[i % tour.length];
      const ang = key.length === 1 ? ARCH[key].angle : (() => {
        const [p, q] = key.split('');
        let a = ARCH[p].angle, b = ARCH[q].angle;
        if (Math.abs(a - b) > 180) b += b < a ? 360 : -360;
        return (a + b) / 2;
      })();
      const r = 0.55 + ((i * 37) % 30) / 100;
      plane.highlight(key.length === 1 ? key : null);
      await plane.setMe({ x: r * Math.cos(ang * RAD) * 0.92, y: r * Math.sin(ang * RAD) * 0.92 }, { ms: 1400, bounce: false });
      if (!alive) break;
      stampTitle.textContent = TITLES[key];
      await new Promise((res) => setTimeout(res, reducedMotion() ? 3000 : 1100));
      i++;
    }
  })();

  const titles = Object.values(TITLES);
  const tickerRow = () => h('span', titles.map((t) => [h('i', t), h('i', { 'aria-hidden': 'true' }, '✦')]));
  const ticker = h('div', { class: 'ticker', 'aria-hidden': 'true' }, h('div', { class: 'ticker-track' }, tickerRow(), tickerRow()));

  const axes = h('section', { class: 'section' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('span', { class: 'num' }, '01'),
        h('h2', 'Three tensions.'),
        h('p', 'Every gamer is pulled between three pairs of opposite desires. Your answers measure all six poles independently — so you can be high on both ends of a pair (we call that a paradox, and it\'s more common than you think).')),
      h('div', { class: 'axes-grid' }, AXES.map((ax) => {
        const b = AXIS_BLURB[ax.id];
        return h('article', { class: 'axis-card' },
          h('div', { class: 'vs' }, h('span', ax.poles[0]), h('span', 'vs'), h('span', ax.poles[1])),
          h('div', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: { background: ARCH[ax.a].color } }), h('i', { style: { background: ARCH[ax.b].color } })),
          h('div', { class: 'poles' }, h('span', ARCH[ax.a].name), h('span', ARCH[ax.b].name)),
          h('p', b.body));
      }))));

  const gallery = h('section', { class: 'section', style: { paddingTop: '0' } },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('span', { class: 'num' }, '02'),
        h('h2', 'Six poles. Nineteen prints.'),
        h('p', 'Six pure archetypes sit at the corners of the atlas. Land between two and you get one of twelve hybrids; land dead centre and you\'re the rare Omnivore.')),
      h('div', { class: 'arch-grid' }, ARCH_ORDER.map((k) => h('article', { class: 'arch-card', id: `arch-${k}`, style: { '--c': ARCH[k].color } },
        h('div', { class: 'glyph' }, glyph(k, { width: 46, height: 46 })),
        h('div', { class: 'opp' }, `Opposes the ${ARCH[OPPOSITE[k]].name}`),
        h('h3', `The ${ARCH[k].name}`),
        h('p', { class: 'tag' }, PROFILES[k].tagline),
        h('p', { class: 'hab' }, PROFILES[k].habitat))))));

  const how = h('section', { class: 'section', style: { paddingTop: '0' } },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' }, h('span', { class: 'num' }, '03'), h('h2', 'How the print is made.')),
      h('div', { class: 'steps' },
        h('div', { class: 'step' }, h('h3', 'Answer honestly'), h('p', 'Scenarios, this-or-that duels and sliders. No right answers, only revealing ones. Your dot moves live as you go.')),
        h('div', { class: 'step' }, h('h3', 'Get plotted'), h('p', 'Your strongest pole picks your region, the others tilt you inside it, and we resample your answers 160 times to show how sure we are.')),
        h('div', { class: 'step' }, h('h3', 'Print & compare'), h('p', 'Export a specimen card, send a link, overlay a friend\'s print — or sign in to track how you drift between retakes.'))),
      h('p', { style: { marginTop: '28px' } }, h('a', { href: '/about', 'data-link': '', class: 'linkish' }, 'Read exactly how the scoring works →'))));

  const band = h('section', { class: 'cta-band' },
    h('h2', h('span', { class: 'riso', 'data-text': 'Insert coin.' }, 'Insert coin.')),
    h('a', { class: 'btn btn-ink', href: '/quiz', 'data-link': '' }, 'Take the field test', h('span', { class: 'arrow' }, '→')));

  root.append(hero, ticker, axes, gallery, how, band);
  return () => { alive = false; };
}

