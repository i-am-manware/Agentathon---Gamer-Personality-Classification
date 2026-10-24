import { s, h, tween, easeOutCubic } from '../dom.js';

const VBX = 178;
const VBY = 170;
const R = 100;

function polar(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: -Math.sin(a) * radius };
}

function hexPoints(radius, archetypes) {
  return archetypes.map((a) => {
    const p = polar(a.angle, radius);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
}

export function renderPlane({
  archetypes,
  result = null,
  field = null,
  interactive = true,
  mini = false,
  demo = false,
  animate = true,
  onFocus = null
}) {
  const svg = s('svg', {
    viewBox: `-${VBX} -${VBY} ${VBX * 2} ${VBY * 2}`,
    role: 'img',
    'aria-label': result ? 'Your player DNA coordinate on the archetype plane' : 'Archetype plane overview'
  });
  const mount = h('div', { class: 'plane-mount' }, svg);
  const jobs = [];

  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const dominantKey = result?.dominant || null;
  svg.style.setProperty('--c', dominantKey ? colorOf(dominantKey) : '#7cf7d0');

  const grid = s('g', { class: 'grid' });
  const ring = [...archetypes].sort((a, b) => a.angle - b.angle);
  for (const frac of [0.3333, 0.6666, 1]) {
    grid.append(
      s('polygon', {
        class: `hex-ring${frac === 1 ? ' major' : ''}`,
        points: hexPoints(R * frac, ring)
      })
    );
  }
  for (let i = 0; i < archetypes.length; i += 2) {
    const a1 = polar(archetypes[i].angle, R);
    const a2 = polar(archetypes[i].angle + 180, R);
    grid.append(s('line', { class: 'axis-line', x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y }));
  }
  grid.append(s('circle', { class: 'center-mark', cx: 0, cy: 0, r: 2.2, fill: 'none' }));
  svg.append(grid);

  const counts = archetypes.map(() => 0);
  const dotsByArch = archetypes.map(() => []);
  if (field?.points?.length && !mini) {
    const fieldGroup = s('g', { class: 'field' });
    let points = field.points;
    if (points.length > 900) {
      const step = points.length / 900;
      const sampled = [];
      for (let i = 0; i < 900; i++) sampled.push(points[Math.floor(i * step)]);
      points = sampled;
    }
    for (const [px, py, a] of points) {
      if (a >= 0 && a < counts.length) counts[a] += 1;
      const dot = s('circle', {
        class: 'field-dot',
        cx: (px * R).toFixed(2),
        cy: (-py * R).toFixed(2),
        r: 1.45,
        fill: archetypes[a]?.color || '#8b98a5',
        'fill-opacity': 0.42
      });
      fieldGroup.append(dot);
      if (a >= 0 && a < dotsByArch.length) dotsByArch[a].push(dot);
    }
    svg.append(fieldGroup);
  }

  if (result) {
    const color = colorOf(result.dominant);
    const line = s('line', { class: 'point-line', x1: 0, y1: 0, x2: 0, y2: 0 });
    const point = s(
      'g',
      { class: 'point' },
      s('circle', { class: 'point-halo', r: 24 }),
      s('circle', { class: 'pulse-ring', r: 11 }),
      s('circle', { class: 'pulse-ring d2', r: 11 }),
      s('circle', { class: 'point-ring', r: 13 }),
      s('path', { class: 'point-bracket', d: 'M-17 -12 L-17 -17 L-12 -17' }),
      s('path', { class: 'point-bracket', d: 'M12 -17 L17 -17 L17 -12' }),
      s('path', { class: 'point-bracket', d: 'M17 12 L17 17 L12 17' }),
      s('path', { class: 'point-bracket', d: 'M-12 17 L-17 17 L-17 12' }),
      s('circle', { class: 'point-core', r: 4.6 })
    );
    point.style.setProperty('--c', color);
    svg.append(line, point);

    const tx = result.coord.x * R;
    const ty = -result.coord.y * R;
    if (animate) {
      jobs.push(
        tween({
          duration: 1250,
          ease: easeOutCubic,
          onUpdate: (t) => {
            const x = tx * t;
            const y = ty * t;
            point.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
            line.setAttribute('x2', x.toFixed(2));
            line.setAttribute('y2', y.toFixed(2));
          }
        })
      );
    } else {
      point.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`);
      line.setAttribute('x2', tx.toFixed(2));
      line.setAttribute('y2', ty.toFixed(2));
    }
  }

  if (demo && !mini) {
    const demoPoint = s('circle', { class: 'demo-point', r: 4.5, cx: 0, cy: 0 });
    svg.append(demoPoint);
    const stops = [
      { angle: 84, frac: 0.74 },
      { angle: 24, frac: 0.48 },
      { angle: 332, frac: 0.7 },
      { angle: 205, frac: 0.52 },
      { angle: 152, frac: 0.38 },
      { angle: 268, frac: 0.78 },
      { angle: 0, frac: 0.16 }
    ].map((stop) => {
      const p = polar(stop.angle, stop.frac * R);
      return p;
    });
    let index = 1;
    let cancelled = false;
    let prev = { x: 0, y: 0 };
    const moveNext = () => {
      if (cancelled) return;
      const target = stops[index % stops.length];
      index += 1;
      jobs.push(
        tween({
          duration: 2600,
          ease: easeOutCubic,
          onUpdate: (t) => {
            const x = prev.x + (target.x - prev.x) * t;
            const y = prev.y + (target.y - prev.y) * t;
            demoPoint.setAttribute('cx', x.toFixed(2));
            demoPoint.setAttribute('cy', y.toFixed(2));
          },
          onDone: () => {
            prev = target;
            timer = setTimeout(moveNext, 1500);
          }
        })
      );
    };
    let timer = setTimeout(moveNext, 900);
    jobs.push(() => {
      cancelled = true;
      clearTimeout(timer);
    });
  }

  const nodes = [];
  const tooltip = mini
    ? null
    : h('div', { class: 'plane-tooltip', role: 'tooltip' });
  if (!mini) mount.append(tooltip);

  archetypes.forEach((a, index) => {
    const nodePos = polar(a.angle, R);
    const node = s(
      'g',
      {
        class: 'vertex-node',
        style: `--c:${a.color}`,
        tabindex: interactive ? '0' : '-1',
        role: 'button',
        'aria-label': `${a.name} vertex`
      },
      s('circle', { class: 'vn-disc', cx: nodePos.x, cy: nodePos.y, r: mini ? 4 : 8 }),
      s('circle', { class: 'vn-core', cx: nodePos.x, cy: nodePos.y, r: mini ? 1.6 : 2.8 })
    );

    if (!mini) {
      const labelPos = polar(a.angle, 108);
      const anchor = Math.abs(nodePos.x) < 1 ? 'middle' : nodePos.x > 0 ? 'start' : 'end';
      node.append(
        s('text', {
          class: 'vertex-label',
          x: labelPos.x.toFixed(2),
          y: labelPos.y.toFixed(2),
          'text-anchor': anchor,
          'dominant-baseline': 'middle'
        }, a.name)
      );

      const enter = () => showTooltip(index);
      const leave = () => {
        if (tooltip) tooltip.classList.remove('on');
      };
      node.addEventListener('mouseenter', enter);
      node.addEventListener('mouseleave', leave);
      node.addEventListener('focus', enter);
      node.addEventListener('blur', leave);
      if (interactive) {
        node.addEventListener('click', () => toggleFocus(index));
        node.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleFocus(index);
          }
        });
      }
    }

    function showTooltip(i) {
      if (!tooltip) return;
      const arch = archetypes[i];
      const rect = svg.getBoundingClientRect();
      const px = ((nodePos.x + VBX) / (VBX * 2)) * rect.width;
      const py = ((nodePos.y + VBY) / (VBY * 2)) * rect.height;
      tooltip.style.left = `${px}px`;
      tooltip.style.top = `${py}px`;
      tooltip.style.setProperty('--c', arch.color);
      const pct = result ? result.scores.find((sc) => sc.key === arch.key)?.pct : null;
      const count = counts[i];
      tooltip.innerHTML = '';
      tooltip.append(
        h('div', { class: 'tt-name' }, arch.name),
        h('div', { class: 'tt-body' }, arch.tagline),
        pct != null ? h('div', { class: 'tt-body' }, 'your score: ', h('span', { class: 'tt-score' }, `${Math.round(pct)}%`)) : null,
        count ? h('div', { class: 'tt-body' }, `${count} charted scans in this cluster`) : null,
        interactive ? h('div', { class: 'tt-body dim' }, 'click to isolate') : null
      );
      tooltip.classList.add('on');
    }

    nodes.push(node);
    svg.append(node);
  });

  let focused = null;
  function toggleFocus(index) {
    focused = focused === index ? null : index;
    nodes.forEach((node, i) => node.classList.toggle('focused', focused === i));
    dotsByArch.forEach((dots, i) => {
      for (const dot of dots) {
        dot.classList.toggle('faded', focused != null && focused !== i);
        dot.classList.toggle('focused', focused === i);
      }
    });
    onFocus?.(focused == null ? null : { index: focused, count: counts[focused], archetype: archetypes[focused] });
  }

  return {
    el: mount,
    focusArchetype: (key) => {
      const index = archetypes.findIndex((a) => a.key === key);
      if (index >= 0 && index !== focused) toggleFocus(index);
    },
    dispose: () => {
      for (const job of jobs) job();
    }
  };
}
