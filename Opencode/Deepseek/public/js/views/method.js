import { h, s } from '../dom.js';

function polar(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: -Math.sin(a) * radius };
}

function diagram(archetypes) {
  const svg = s('svg', { viewBox: '-190 -180 380 360', role: 'img', 'aria-label': 'How the three tension axes project onto the plane' });
  const R = 100;
  const ring = [...archetypes].sort((a, b) => a.angle - b.angle);

  svg.append(
    s(
      'polygon',
      {
        points: ring.map((a) => {
          const p = polar(a.angle, R);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }).join(' '),
        fill: 'none',
        stroke: '#2b3a4d',
        'stroke-width': 1.4
      }
    )
  );

  for (const a of archetypes) {
    const p = polar(a.angle, R);
    svg.append(
      s('line', {
        x1: 0,
        y1: 0,
        x2: p.x * 1.12,
        y2: p.y * 1.12,
        stroke: '#1a2431',
        'stroke-width': 1.2,
        'stroke-dasharray': '4 4'
      })
    );
  }

  const example = { angle: 62, frac: 0.62 };
  const point = polar(example.angle, R * example.frac);
  svg.append(
    s('line', { x1: 0, y1: 0, x2: point.x, y2: point.y, stroke: '#7cf7d0', 'stroke-width': 2 }),
    s('circle', { cx: point.x, cy: point.y, r: 5.5, fill: '#ffffff', stroke: '#7cf7d0', 'stroke-width': 2.5 }),
    s(
      'text',
      { x: point.x + 10, y: point.y - 8, fill: '#7cf7d0', 'font-size': 11, 'font-family': 'IBM Plex Mono, monospace' },
      'you = (x, y)'
    ),
    s('circle', { cx: 0, cy: 0, r: 3, fill: '#93a1b1' })
  );

  for (const a of archetypes) {
    const p = polar(a.angle, R);
    const lp = polar(a.angle, R + 30);
    const anchor = Math.abs(p.x) < 1 ? 'middle' : p.x > 0 ? 'start' : 'end';
    svg.append(
      s('circle', { cx: p.x, cy: p.y, r: 6, fill: '#070a0e', stroke: a.color, 'stroke-width': 2 }),
      s('circle', { cx: p.x, cy: p.y, r: 2.4, fill: a.color }),
      s(
        'text',
        {
          x: lp.x,
          y: lp.y + 3,
          fill: a.color,
          'font-size': 10,
          'font-family': 'Press Start 2P, monospace',
          'text-anchor': anchor
        },
        a.name
      )
    );
  }

  const mid = polar(210, 52);
  svg.append(
    s(
      'text',
      { x: mid.x, y: mid.y, fill: '#5d6c7c', 'font-size': 10, 'font-family': 'IBM Plex Mono, monospace', 'text-anchor': 'middle' },
      '60° apart'
    )
  );

  return h('div', { class: 'diagram' }, svg);
}

export async function methodView(ctx) {
  const archetypes = ctx.quiz?.archetypes || [];
  const nameOf = (key) => archetypes.find((a) => a.key === key)?.name || key.toUpperCase();

  const el = h(
    'div',
    { class: 'shell method-shell' },
    h('p', { class: 'kicker' }, 'CABINET MANUAL // HOW THE ORACLE THINKS'),
    h('h1', { class: 'h2', style: { fontSize: 'clamp(26px,4vw,40px)' } }, 'One coordinate, not a label.'),
    h(
      'p',
      { class: 'lede', style: { marginBottom: '30px' } },
      'Most quizzes hand you a box to sit in. Pixel Psyche plots you as a point on a plane: six archetypes, three opposing drives at 60°, and one vector sum that decides where you land. This page is the full method — no hand-waving.'
    ),

    h(
      'section',
      { class: 'panel method-block' },
      h('h2', {}, '01 · The model'),
      h(
        'p',
        {},
        h('strong', {}, 'Six archetypes'),
        ' are arranged as ',
        h('strong', {}, 'three opposing pairs'),
        ': ',
        `${nameOf('duelist')} versus ${nameOf('architect')} (prove it vs. make it), ${nameOf('curator')} versus ${nameOf('pathfinder')} (complete it vs. discover it), ${nameOf('tactician')} versus ${nameOf('bard')} (solve it vs. share it).`
      ),
      diagram(archetypes),
      h(
        'p',
        {},
        'Each answered question awards points to one or more archetypes — some answers split their weight, because real players do too. Points are normalized against the maximum score each archetype could have earned across the whole quiz, so no archetype is easier to max out than another.'
      ),
      h('div', { class: 'formula' }, 'score(archetype) = points earned ÷ maximum available × 100'),
      h(
        'p',
        {},
        'Your six scores collapse into three tension values, each between −100 and +100. Those tensions push along three unit vectors 60° apart, and the vector sum is your coordinate.'
      ),
      h('div', { class: 'formula' }, 't₁ = DUELIST − ARCHITECT   t₂ = CURATOR − PATHFINDER   t₃ = TACTICIAN − BARD'),
      h('div', { class: 'formula' }, 'v = ½ · (t₁·û₁ + t₂·û₂ + t₃·û₃)      r = 0.97 · tanh(3.1 · |v|)'),
      h(
        'p',
        {},
        'The tanh curve compresses extreme vectors so the plane keeps its headroom: specialists sit near their vertex, generalists near the center, and nobody ever gets glued to the rim.'
      )
    ),

    h(
      'section',
      { class: 'panel method-block' },
      h('h2', {}, '02 · Worked example'),
      h(
        'p',
        {},
        'Suppose you answer hard toward Duelist and Curator: normalized scores come out around ',
        h('strong', {}, 'Duelist 83, Architect 0, Curator 35, Pathfinder 0, Tactician 1, Bard 0'),
        '. The tensions are ',
        h('strong', {}, 't₁ = +83, t₂ = +35, t₃ = +1'),
        '. Resolving the vectors gives a magnitude of about 105 (out of 200), which the curve maps to radius ',
        h('strong', {}, 'r ≈ 0.90'),
        ' at an angle in the upper-right of the plane — between the Duelist and Curator vertices. The readout then names that build. Change two answers and the point moves; the point is always earned.'
      )
    ),

    h(
      'section',
      { class: 'panel method-block' },
      h('h2', {}, '03 · Signal clarity'),
      h(
        'p',
        {},
        'Confidence is not a vibe — it is measured. The cabinet takes the entropy of your six scores (how spread out they are) and blends it with how far your coordinate is pulled from the center. A spiky, single-minded chart reads as high clarity; an even, many-sided chart reads as low clarity — which is a valid answer, not a failure.'
      ),
      h('div', { class: 'formula' }, 'clarity = 1 − H(scores) ÷ ln(6)      confidence = 0.55·clarity + 0.45·min(1, pull)')
    ),

    h(
      'section',
      { class: 'panel method-block' },
      h('h2', {}, '04 · The ghost field & your data'),
      h(
        'ul',
        {},
        h('li', {}, 'Every completed scan plots one anonymous point on the shared ghost field: a coordinate and a dominant archetype. Nothing else.'),
        h('li', {}, 'No IP addresses, no answers and no identifiers are attached to field points.'),
        h('li', {}, 'Accounts are optional. If you make one, your scans, handle and sessions live in a single JSON document on this server — no third-party services, no analytics, no tracking pixels.'),
        h('li', {}, 'The only external request the page can make is Google Fonts; without a connection the interface falls back to system monospace and keeps working.'),
        h('li', {}, 'Share links encode nothing but your 25 answer indices with a checksum — anyone opening one gets the identical coordinate, and nothing about you.')
      )
    ),

    h(
      'section',
      { class: 'panel method-block faq' },
      h('h2', {}, '05 · Cabinet FAQ'),
      h(
        'details',
        {},
        h('summary', {}, 'Can I retake it and get the same result?'),
        h('p', {}, 'You will land close, not identical — answers move the point. Your archive (signed in) stores every retake and shows the drift, which is often more interesting than the coordinate itself.')
      ),
      h(
        'details',
        {},
        h('summary', {}, 'Why 25 questions?'),
        h('p', {}, 'It is the sweet spot where every archetype gets enough opportunities to show up, while the scan still finishes in about three minutes. Shorter quizzes produce noisy coordinates; longer ones lose the arcade feel.')
      ),
      h(
        'details',
        {},
        h('summary', {}, 'Can I game the result to get a specific archetype?'),
        h('p', {}, 'You can answer toward a vertex — but the point is recomputed from the same math, so your title will follow honestly. The cabinet notices performative answers not at all, and this is by design.')
      ),
      h(
        'details',
        {},
        h('summary', {}, 'Do answers leave this machine?'),
        h('p', {}, 'No. Scoring runs on the server that serves this page, field points stay anonymous, and there are zero external API dependencies.')
      )
    ),

    h(
      'div',
      { class: 'panel cta-band' },
      h('div', {}, h('h2', {}, 'Enough theory. Get plotted.'), h('p', { class: 'muted', style: { margin: 0 } }, 'Twenty-five questions between you and your coordinate.')),
      h('a', { class: 'btn btn-primary', href: '#/quiz' }, 'START THE SCAN ▸')
    )
  );

  return { el };
}
