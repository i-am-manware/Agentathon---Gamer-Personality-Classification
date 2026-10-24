import { s, tween, easeOutCubic } from '../dom.js';

const R = 100;

function polar(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: -Math.sin(a) * radius };
}

export function renderRadar({ archetypes, scores, animate = true }) {
  const svg = s('svg', {
    viewBox: '-180 -143 360 286',
    role: 'img',
    'aria-label': 'Six-axis score radar'
  });
  const pctOf = Object.fromEntries(scores.map((sc) => [sc.key, sc.pct]));
  const dominant = [...scores].sort((a, b) => b.pct - a.pct)[0]?.key;
  const color = archetypes.find((a) => a.key === dominant)?.color || '#7cf7d0';

  const ring = [...archetypes].sort((a, b) => a.angle - b.angle);
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    svg.append(
      s('polygon', {
        class: 'hex-ring',
        points: ring
          .map((a) => {
            const p = polar(a.angle, R * frac);
            return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          })
          .join(' ')
      })
    );
  }

  for (const a of archetypes) {
    const p = polar(a.angle, R);
    svg.append(s('line', { class: 'axis-line', x1: 0, y1: 0, x2: p.x, y2: p.y }));
  }

  const poly = s('polygon', {
    points: archetypes.map(() => '0,0').join(' '),
    fill: color,
    'fill-opacity': 0.16,
    stroke: color,
    'stroke-width': 1.8,
    'stroke-linejoin': 'round',
    style: `filter: drop-shadow(0 0 6px ${color}66)`
  });
  svg.append(poly);

  const vertexDots = archetypes.map((a) => {
    const dot = s('circle', {
      class: 'vn-core',
      cx: 0,
      cy: 0,
      r: 3,
      fill: a.color,
      'fill-opacity': 0.95
    });
    svg.append(dot);
    return dot;
  });

  function applyPoints(scale) {
    const coords = archetypes.map((a) => {
      const pct = (pctOf[a.key] || 0) * scale;
      return polar(a.angle, (pct / 100) * R);
    });
    poly.setAttribute('points', coords.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
    coords.forEach((p, i) => {
      vertexDots[i].setAttribute('cx', p.x.toFixed(2));
      vertexDots[i].setAttribute('cy', p.y.toFixed(2));
    });
  }

  if (animate) {
    tween({
      duration: 1150,
      ease: easeOutCubic,
      onUpdate: (t) => applyPoints(t)
    });
  } else {
    applyPoints(1);
  }

  const labels = s('g', {});
  for (const a of archetypes) {
    const namePos = polar(a.angle, 110);
    const pctPos = polar(a.angle, 126);
    const anchor = Math.abs(namePos.x) < 1 ? 'middle' : namePos.x > 0 ? 'start' : 'end';
    labels.append(
      s(
        'text',
        {
          class: 'vertex-label',
          x: namePos.x.toFixed(2),
          y: namePos.y.toFixed(2),
          'text-anchor': anchor,
          'dominant-baseline': 'middle',
          style: `--c:${a.color}`
        },
        a.name
      ),
      s(
        'text',
        {
          class: 'vertex-pct',
          x: pctPos.x.toFixed(2),
          y: pctPos.y.toFixed(2),
          'text-anchor': anchor,
          'dominant-baseline': 'middle'
        },
        `${Math.round(pctOf[a.key] || 0)}%`
      )
    );
  }
  svg.append(labels);

  return { el: svg, dispose: () => {} };
}
