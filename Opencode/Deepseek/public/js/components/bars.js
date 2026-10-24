import { h, s, animateWidth, tween, easeOutCubic } from '../dom.js';

export function renderBars({ archetypes, scores, deltas = null }) {
  const wrap = h('div', { class: 'bars' });
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const nameOf = (key) => archetypes.find((a) => a.key === key)?.name || key;
  const sorted = [...scores].sort((a, b) => b.pct - a.pct);

  for (const score of sorted) {
    const delta = deltas?.[score.key];
    const value = h('div', { class: 'bar-value mono-num' }, `${Math.round(score.pct)}%`);
    if (delta != null && Math.abs(delta) >= 0.5) {
      value.append(
        h(
          'small',
          { class: delta > 0 ? 'up' : 'down', style: { marginLeft: '6px', color: delta > 0 ? '#51cf66' : '#ff4d6d' } },
          `${delta > 0 ? '+' : ''}${delta.toFixed(0)}`
        )
      );
    }
    const fill = h('div', { class: 'bar-fill', style: { background: `linear-gradient(90deg, ${colorOf(score.key)}55, ${colorOf(score.key)})` } });
    const row = h(
      'div',
      { class: 'bar-row', style: `--c:${colorOf(score.key)}` },
      h('div', { class: 'bar-name' }, nameOf(score.key)),
      h('div', { class: 'bar-track' }, fill),
      value
    );
    wrap.append(row);
    animateWidth(fill, Math.max(1.5, score.pct));
  }
  return wrap;
}

export function renderTensions({ archetypes, tensions }) {
  const wrap = h('div', { class: 'stack' });
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const nameOf = (key) => archetypes.find((a) => a.key === key)?.name || key;

  for (const tension of tensions) {
    const posColor = colorOf(tension.pos);
    const negColor = colorOf(tension.neg);
    const marker = h('div', {
      class: 'tension-marker',
      style: {
        left: '50%',
        background: tension.net >= 0 ? posColor : negColor,
        boxShadow: `0 0 10px ${tension.net >= 0 ? posColor : negColor}`
      }
    });
    const track = h('div', {
      class: 'tension-track',
      style: {
        background: `linear-gradient(90deg, ${negColor}26, transparent 45%, transparent 55%, ${posColor}26)`
      }
    });
    track.append(marker);
    wrap.append(
      h(
        'div',
        { class: 'tension' },
        h('div', { class: `tension-label right ${tension.net < 0 ? 'leaning' : ''}` }, nameOf(tension.neg)),
        track,
        h('div', { class: `tension-label ${tension.net >= 0 ? 'leaning' : ''}` }, nameOf(tension.pos))
      )
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        marker.style.left = `${((tension.net + 100) / 200) * 100}%`;
      });
    });
  }
  return wrap;
}

export function renderConfidence({ value }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const ring = s('circle', {
    cx: 37,
    cy: 37,
    r: radius,
    fill: 'none',
    stroke: '#7cf7d0',
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke-dasharray': circumference.toFixed(2),
    'stroke-dashoffset': circumference.toFixed(2),
    style: 'filter: drop-shadow(0 0 5px rgba(124,247,208,.55))'
  });
  const svg = s(
    'svg',
    { viewBox: '0 0 74 74', width: 74, height: 74, 'aria-hidden': 'true' },
    s('circle', { cx: 37, cy: 37, r: radius, fill: 'none', stroke: '#1e2937', 'stroke-width': 5 }),
    ring
  );
  const val = h('div', { class: 'cr-value' }, `${value}%`);
  const wrap = h('div', { class: 'confidence-ring' }, svg, val);
  tween({
    duration: 1100,
    ease: easeOutCubic,
    onUpdate: (t) => {
      ring.setAttribute('stroke-dashoffset', (circumference * (1 - (value / 100) * t)).toFixed(2));
    }
  });
  return wrap;
}
