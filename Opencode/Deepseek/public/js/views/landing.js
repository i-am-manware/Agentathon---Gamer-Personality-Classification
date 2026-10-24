import { h, fmtInt } from '../dom.js';
import { icon, archetypeIcon } from '../icons.js';
import { renderPlane } from '../components/plane.js';

function ticker() {
  const phrases = [
    'ARCADE ORACLE <b>ONLINE</b>',
    '25 QUESTIONS // 6 ARCHETYPES // 1 COORDINATE',
    'NO ACCOUNT REQUIRED',
    'YOUR PLAYER DNA <b>CHARTED IN 3 MINUTES</b>',
    'SHAREABLE REPORT CARD',
    'SIGNED-IN PLAYERS KEEP A FULL ARCHIVE',
    'THE CABINET NEVER JUDGES — IT ONLY PLOTS'
  ];
  const track = h('div', { class: 'ticker-track' });
  for (let i = 0; i < 2; i++) {
    for (const phrase of phrases) track.append(h('span', { html: `◆ ${phrase}` }));
  }
  return h('div', { class: 'ticker' }, track);
}

export async function landingView(ctx) {
  const { quiz, field, stats } = ctx;
  const el = h('div', {});
  el.append(ticker());

  const hero = h('section', { class: 'shell hero' });

  const total = field?.total ?? 0;
  const scans = stats?.scans ?? 0;

  const progress = ctx.state.progress;
  const hasProgress = progress && Array.isArray(progress.answers) && progress.answers.some((a) => a != null);

  const copy = h(
    'div',
    { class: 'hero-copy' },
    h('p', { class: 'kicker' }, 'ARCADE ORACLE // PSYCHE-2000 CABINET'),
    h(
      'h1',
      { class: 'hero-title' },
      h('span', { class: 'glitch', 'data-text': 'PIXEL' }, 'PIXEL'),
      h('br'),
      h('span', { class: 'glitch', 'data-text': 'PSYCHE' }, 'PSYCHE')
    ),
    h(
      'p',
      { class: 'hero-lede' },
      'Twenty-five questions. The cabinet reads your answers, runs them through ',
      h('strong', {}, 'three opposing drives'),
      ', and plots you on a live plane of gamer archetypes. You get a ',
      h('strong', {}, 'coordinate, not a label'),
      ' — plus a readout you will actually want to screenshot.'
    ),
    h(
      'div',
      { class: 'hero-cta' },
      h('a', { class: 'btn btn-primary', href: '#/quiz' }, hasProgress ? 'RESUME SCAN ▸' : 'INSERT COIN — START SCAN ▸'),
      h('a', { class: 'btn', href: '#/method' }, 'HOW IT WORKS')
    ),
    h(
      'div',
      { class: 'hero-stats' },
      h('div', { class: 'stat' }, h('div', { class: 'stat-value mono-num' }, fmtInt(scans)), h('div', { class: 'stat-label' }, 'SCANS RECORDED')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-value mono-num' }, fmtInt(total)), h('div', { class: 'stat-label' }, 'GHOST FIELD POINTS')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-value mono-num' }, '6'), h('div', { class: 'stat-label' }, 'ARCHETYPES'))
    )
  );

  const plane = renderPlane({
    archetypes: quiz.archetypes,
    field,
    demo: true,
    interactive: true
  });

  const planeCard = h(
    'div',
    { class: 'panel plane-card' },
    plane.el,
    h(
      'div',
      { class: 'plane-caption' },
      h('span', {}, h('span', { class: 'live-dot' }), 'LIVE GHOST FIELD'),
      h('span', {}, `${fmtInt(total)} scans plotted`)
    ),
    h(
      'div',
      { class: 'field-note' },
      'Every scan is plotted anonymously. Hover a vertex to inspect a cluster; click it to isolate the field.'
    )
  );

  hero.append(copy, h('div', { class: 'hero-visual' }, planeCard));
  el.append(hero);

  const rosterSection = h(
    'section',
    { class: 'shell section' },
    h(
      'div',
      { class: 'section-head' },
      h('p', { class: 'kicker' }, 'THE ROSTER'),
      h('h2', { class: 'h2' }, 'Six archetypes. Three tensions. One coordinate.'),
      h(
        'p',
        { class: 'lede' },
        'Each archetype pulls against its opposite. Your answers decide how hard each side pulls, and the vector sum is where you land.'
      ),
      h(
        'div',
        { class: 'chip-row', style: { marginTop: '18px' } },
        ...quiz.pairs.map((pair) =>
          h(
            'span',
            { class: 'chip' },
            h('span', { class: 'swatch', style: { '--c': quiz.archetypes.find((a) => a.key === pair.pos).color } }),
            quiz.archetypes.find((a) => a.key === pair.pos).name,
            h('span', { class: 'dim' }, ' ⇄ '),
            quiz.archetypes.find((a) => a.key === pair.neg).name
          )
        )
      )
    ),
    h(
      'div',
      { class: 'roster-grid' },
      ...quiz.archetypes.map((a) =>
        h(
          'article',
          { class: 'panel panel-pad arch-card', style: `--c:${a.color}` },
          h('div', { class: 'arch-icon' }, archetypeIcon(a.icon, 30)),
          h('h3', { class: 'arch-name' }, a.name),
          h('p', { class: 'arch-tag' }, a.tagline),
          h('p', { class: 'arch-short' }, a.short)
        )
      )
    )
  );
  el.append(rosterSection);

  const stepsSection = h(
    'section',
    { class: 'shell section' },
    h(
      'div',
      { class: 'section-head' },
      h('p', { class: 'kicker warm' }, 'THE SCAN'),
      h('h2', { class: 'h2' }, 'Three minutes in the cabinet.')
    ),
    h(
      'div',
      { class: 'steps-grid' },
      h(
        'article',
        { class: 'panel step' },
        h('div', { class: 'step-num' }, 'STEP 01'),
        h('h3', {}, 'Answer 25 questions'),
        h('p', {}, 'Fast, playful situations — loot chests, boss wipes, patch notes and party chat. No clinical scales. Trust your gut.')
      ),
      h(
        'article',
        { class: 'panel step' },
        h('div', { class: 'step-num' }, 'STEP 02'),
        h('h3', {}, 'The cabinet crunches'),
        h('p', {}, 'Every answer feeds six archetype scores. Scores become three tension values, and the tensions are projected onto the plane as one coordinate.')
      ),
      h(
        'article',
        { class: 'panel step' },
        h('div', { class: 'step-num' }, 'STEP 03'),
        h('h3', {}, 'Get charted'),
        h('p', {}, 'Full six-axis breakdown, signal clarity, a written readout, and a share card that looks like it fell out of an arcade machine.')
      )
    ),
    h(
      'div',
      { class: 'panel cta-band' },
      h(
        'div',
        {},
        h('h2', {}, 'The cabinet is warm.'),
        h('p', { class: 'muted', style: { margin: 0 } }, 'Your answers are unknown, even to you. Find out where you land.')
      ),
      h('a', { class: 'btn btn-primary', href: '#/quiz' }, 'START THE SCAN ▸')
    )
  );
  el.append(stepsSection);

  return { el, dispose: () => plane.dispose() };
}
