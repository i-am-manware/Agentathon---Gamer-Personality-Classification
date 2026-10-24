import { h, store } from '../dom.js';
import { ARCH, TITLES, decodeCode, analyze } from '/shared/engine.js';
import { PROFILES, HYBRIDS } from '/shared/content.js';
import { createPlane } from '../plane.js';
import { getStats } from '../state.js';
import { describeArch } from './home.js';

export async function renderAtlas(root) {
  document.title = 'The atlas · PLAYERPRINT';
  const last = store.get('pp.last');
  const mine = last && decodeCode(last.code) ? analyze(decodeCode(last.code), { bootstrap: 0 }) : null;

  const detail = h('div', { class: 'panel', style: { marginTop: '24px' } });
  const showDetail = (key) => {
    const base = key.length === 1 ? key : key[0];
    const prof = HYBRIDS[key] || PROFILES[key];
    detail.style.setProperty('--c', ARCH[base]?.color || 'var(--D)');
    detail.replaceChildren(
      h('span', { class: 'kicker' }, key.length === 2 ? `${ARCH[key[0]].name} × ${ARCH[key[1]].name}` : key === 'O' ? 'Dead centre' : 'Pure pole'),
      h('h3', { style: { fontSize: '34px', margin: '6px 0 8px' } }, TITLES[key]),
      h('p', { class: 'serif-i', style: { fontSize: '20px', margin: '0 0 8px' } }, prof.tagline),
      h('p', { style: { margin: 0, color: 'var(--ink-2)' } }, prof.body));
  };

  const plane = createPlane({ describe: describeArch, onSelect: (k) => { plane.highlight(k); showDetail(k); } });
  if (mine) plane.setMe(mine.point, { tag: 'YOU' });

  const dist = h('div', { class: 'dist' });
  const totals = h('p', { class: 'kicker', style: { textTransform: 'none', letterSpacing: 0 } }, 'Loading the crowd…');

  root.append(h('section', { class: 'page' }, h('div', { class: 'wrap' },
    h('div', { class: 'page-head' },
      h('span', { class: 'kicker' }, 'Population view'),
      h('h1', 'The atlas'),
      h('p', 'Every finished run, anonymised to a single dot. Darker halftone = more players. Click a region or a print to read about it.')),
    h('div', { class: 'atlas-grid' },
      h('section', { class: 'panel' }, plane.el, totals),
      h('section', {},
        h('div', { class: 'panel' },
          h('div', { class: 'panel-title' }, h('h3', 'How common is each print?')),
          dist),
        detail)))));

  showDetail(mine ? mine.titleKey : 'O');

  const st = await getStats(true);
  if (!st) { totals.textContent = 'Could not load population stats.'; return; }
  plane.setCrowd(st);
  const real = st.total - st.seeded;
  totals.textContent = `${st.total.toLocaleString()} prints charted — ${real.toLocaleString()} from real runs, ${st.seeded.toLocaleString()} simulated seed profiles generated through the same scoring engine so the map isn't empty on day one.`;
  const rows = Object.keys(TITLES).map((k) => ({ k, n: st.titles[k] || 0 })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...rows.map((r) => r.n));
  dist.replaceChildren(...rows.map(({ k, n }) => {
    const c1 = k === 'O' ? 'var(--ink-3)' : ARCH[k[0]].color;
    const c2 = k.length === 2 ? ARCH[k[1]].color : c1;
    return h('button', { type: 'button', class: ['dist-row', mine?.titleKey === k && 'me'], style: { '--c': c1, '--c2': c2, background: 'none', border: 0, padding: '2px 0', textAlign: 'left', width: '100%' }, onclick: () => showDetail(k) },
      h('span', { class: 'nm' }, TITLES[k].replace(/^The /, '')),
      h('span', { class: 'tr' }, h('i', { class: k.length === 2 ? 'split' : null, style: { width: `${(n / max) * 100}%` } })),
      h('span', { class: 'pc' }, `${st.total ? ((n / st.total) * 100).toFixed(1) : 0}%`));
  }));
}
