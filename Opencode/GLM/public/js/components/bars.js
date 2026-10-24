// Result breakdown bars: ranked archetype mix + center-anchored axis lean.

import { h, iconSVG, prefersReducedMotion } from '../ui.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';

export function affinityBars(score, { animate = true } = {}) {
  const rows = score.affinities.map((row) => {
    const arch = ARCHETYPES[row.id];
    const barFill = h('i', { class: 'bar__fill', style: `--c:${arch.color}` });
    const bar = h('span', { class: 'bar', role: 'presentation' }, barFill);
    if (animate && !prefersReducedMotion()) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        barFill.style.transform = `scaleX(${row.pct / 100})`;
      }));
    } else {
      barFill.style.transform = `scaleX(${row.pct / 100})`;
    }
    return h(
      'div',
      { class: 'bar-row', title: `${arch.name} — ${arch.spot}` },
      h('span', { class: 'bar-row__icon', style: `--c:${arch.color}`, html: iconSVG(row.id, { size: 18 }) }),
      h('span', { class: 'bar-row__name' }, arch.name),
      bar,
      h('b', { class: 'bar-row__pct', style: `--c:${arch.color}` }, `${row.pct}%`)
    );
  });
  return h('div', { class: 'affinity-bars' }, rows);
}

export function axisLeanBars(score) {
  const rows = score.axes.map((ax) => {
    const pct = Math.round(Math.abs(ax.value) * 100);
    const toward = ARCHETYPES[ax.toward];
    const left = ARCHETYPES[ax.plus];
    const right = ARCHETYPES[ax.minus];
    const leftPct = Math.round(((ax.value + 1) / 2) * 100);
    const fill = h('i', {
      class: 'axis-track__fill' + (ax.value >= 0 ? ' axis-track__fill--right' : ' axis-track__fill--left'),
      style: `--c:${toward.color}`,
    });
    if (!prefersReducedMotion()) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.width = `${pct / 2}%`;
      }));
    } else {
      fill.style.width = `${pct / 2}%`;
    }
    return h(
      'div',
      { class: 'axislean-row' },
      h('span', { class: 'axislean-row__pole', style: `--c:${left.color}` }, `${left.name} ${leftPct}%`),
      h(
        'span',
        { class: 'axis-track', role: 'presentation' },
        h('i', { class: 'axis-track__notch' }),
        fill
      ),
      h(
        'span',
        { class: 'axislean-row__pole axislean-row__pole--r', style: `--c:${right.color}` },
        `${100 - leftPct}% ${right.name}`
      )
    );
  });
  return h('div', { class: 'axislean' }, rows);
}
