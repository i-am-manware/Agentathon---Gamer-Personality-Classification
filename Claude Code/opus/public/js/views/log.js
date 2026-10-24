import { h, s, toast, fmtDate, armable } from '../dom.js';
import { ARCH, ARCH_ORDER, TITLES, decodeCode, analyze } from '/shared/engine.js';
import { createPlane } from '../plane.js';
import { api } from '../api.js';
import { session, openAuth, navigate } from '../state.js';

const pct = (v) => Math.round(v * 100);
const ICON = {
  pin: 'M5 12h14M12 5v14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
};
const icon = (d) => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s('path', { d }));

export async function renderLog(root) {
  document.title = 'Field log · PLAYERPRINT';
  await session.ready;
  const head = h('div', { class: 'page-head' },
    h('span', { class: 'kicker' }, 'Signed-in extra'),
    h('h1', 'Field log'),
    h('p', 'Every run you save lands here. Watch your dot drift across the atlas, name your eras, and diff any two prints.'));
  const page = h('section', { class: 'page' }, h('div', { class: 'wrap' }, head));
  root.append(page);
  const body = h('div');
  page.firstChild.append(body);

  if (!session.user) {
    body.append(h('div', { class: 'empty' },
      h('h3', 'Sign in to open your field log'),
      h('p', 'It\'s optional — the quiz and full results work without an account. Want a peek first? Use the demo account (demo / playerprint).'),
      h('div', { class: 'share-btns', style: { justifyContent: 'center', marginTop: '18px' } },
        h('button', { class: 'btn btn-hot', type: 'button', onclick: async () => { if (await openAuth({ mode: 'login' })) navigate('/me', { replace: true }); } }, 'Sign in'),
        h('a', { class: 'btn btn-ghost', href: '/quiz', 'data-link': '' }, 'Take the test'))));
    const unsub = session.subscribe((u) => { if (u) navigate('/me', { replace: true }); });
    return unsub;
  }

  let runs;
  try { runs = (await api.history()).results; } catch (e) { body.append(h('p', e.message)); return; }
  if (!runs.length) {
    body.append(h('div', { class: 'empty' },
      h('h3', 'No runs yet'),
      h('p', 'Take the test while signed in and it will show up here automatically.'),
      h('a', { class: 'btn btn-hot', href: '/quiz', 'data-link': '', style: { marginTop: '16px' } }, 'Take the test →')));
    return;
  }

  const chrono = [...runs].reverse();
  const picked = new Set([runs[0].publicId, runs[1]?.publicId].filter(Boolean));

  /* trajectory */
  const plane = createPlane({ interactive: false, ariaLabel: 'Your runs plotted over time' });
  plane.setTrail(chrono.map((r) => ({ x: r.x, y: r.y })));
  const latest = runs[0];
  plane.setMe({ x: latest.x, y: latest.y }, { tag: 'NOW' });

  const counts = {};
  for (const r of runs) counts[r.titleKey] = (counts[r.titleKey] || 0) + 1;
  const fav = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  let travelled = 0;
  for (let i = 1; i < chrono.length; i++) travelled += Math.hypot(chrono[i].x - chrono[i - 1].x, chrono[i].y - chrono[i - 1].y);

  const trajectory = h('section', { class: 'panel' },
    h('div', { class: 'panel-title' }, h('h3', 'Your drift'), h('span', { class: 'kicker' }, `${runs.length} run${runs.length > 1 ? 's' : ''}`)),
    plane.el,
    h('div', { class: 'stat-row', style: { marginTop: '18px', marginBottom: '0' } },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, TITLES[latest.titleKey].replace(/^The /, '')), h('div', { class: 'l' }, 'Current print')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, TITLES[fav].replace(/^The /, '')), h('div', { class: 'l' }, 'Most frequent print')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, travelled.toFixed(2)), h('div', { class: 'l' }, 'Atlas units travelled')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtDate(chrono[0].createdAt)), h('div', { class: 'l' }, 'First charted'))));

  /* compare */
  const cmp = h('section', { class: 'panel' });
  function paintCompare() {
    const sel = runs.filter((r) => picked.has(r.publicId)).sort((a, b) => a.createdAt - b.createdAt);
    if (sel.length < 2) {
      cmp.replaceChildren(h('div', { class: 'panel-title' }, h('h3', 'Compare two runs')), h('p', { style: { margin: 0, color: 'var(--ink-2)' } }, 'Pick two runs with the ⊕ button to diff them.'));
      return;
    }
    const [a, b] = sel;
    const deltas = ARCH_ORDER.map((k) => ({ k, d: pct(b.scores[k]) - pct(a.scores[k]) })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const top = deltas[0];
    cmp.replaceChildren(
      h('div', { class: 'panel-title' }, h('h3', 'Compare two runs'), h('span', { class: 'kicker' }, `${fmtDate(a.createdAt)} → ${fmtDate(b.createdAt)}`)),
      h('div', { class: 'cmp-bars' }, ARCH_ORDER.map((k) => h('div', { class: 'cmp-row', style: { '--c': ARCH[k].color } },
        h('span', { class: 'nm' }, h('i'), ARCH[k].name),
        h('div', { class: 'cmp-track', title: `${pct(a.scores[k])} → ${pct(b.scores[k])}` },
          h('span', { class: 'a', style: { width: `${pct(a.scores[k])}%` } }),
          h('span', { class: 'b', style: { width: `${pct(b.scores[k])}%` } })),
        h('span', { class: ['delta', pct(b.scores[k]) > pct(a.scores[k]) ? 'up' : pct(b.scores[k]) < pct(a.scores[k]) && 'down'] },
          `${pct(b.scores[k]) - pct(a.scores[k]) > 0 ? '+' : ''}${pct(b.scores[k]) - pct(a.scores[k])}`)))),
      h('p', { class: 'drift-line' },
        a.titleKey === b.titleKey ? ['Still ', h('b', TITLES[b.titleKey]), '. '] : ['From ', h('b', TITLES[a.titleKey]), ' to ', h('b', TITLES[b.titleKey]), '. '],
        `You moved ${dist.toFixed(2)} atlas units; the biggest shift was ${ARCH[top.k].name} (${top.d > 0 ? '+' : ''}${top.d}).`),
      h('p', { class: 'kicker', style: { margin: '6px 0 0', textTransform: 'none', letterSpacing: 0 } }, 'Hatched = earlier run · colour = later run'));
  }

  /* list */
  const list = h('div', { class: 'runs' });
  function paintList() {
    list.replaceChildren(...runs.map((r) => {
      const mini = createPlane({ interactive: false, labels: false, mini: true, ariaLabel: `${TITLES[r.titleKey]} position` });
      mini.setMe({ x: r.x, y: r.y }, { animate: false });
      const labelEl = h('div', { class: 'lab' }, r.label || '');
      const pinBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': String(picked.has(r.publicId)), title: 'Select for comparison', 'aria-label': 'Select for comparison' }, icon(ICON.pin));
      pinBtn.addEventListener('click', () => {
        if (picked.has(r.publicId)) picked.delete(r.publicId);
        else { if (picked.size >= 2) picked.delete([...picked][0]); picked.add(r.publicId); }
        paintList(); paintCompare();
      });
      const editBtn = h('button', { class: 'icon-btn', type: 'button', title: 'Name this run', 'aria-label': 'Name this run' }, icon(ICON.edit));
      editBtn.addEventListener('click', () => {
        const input = h('input', { value: r.label || '', maxlength: 40, placeholder: 'e.g. “Exam season”', style: { width: '100%', border: '1.5px solid var(--ink)', padding: '4px 6px', background: 'var(--paper)' } });
        labelEl.replaceChildren(input);
        input.focus();
        const commit = async () => {
          const v = input.value.trim();
          try { await api.label(r.publicId, v); r.label = v || null; } catch (e) { toast(e.message); }
          labelEl.replaceChildren(r.label || '');
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = r.label || ''; input.blur(); } });
        input.addEventListener('blur', commit, { once: true });
      });
      const delBtn = armable(h('button', { class: 'icon-btn', type: 'button', title: 'Delete run (tap twice)', 'aria-label': `Delete ${TITLES[r.titleKey]} run` }, icon(ICON.trash)), 'Sure?', async () => {
        try {
          await api.remove(r.publicId);
          toast('Run deleted.');
          navigate('/me', { replace: true });
        } catch (e) { toast(e.message); }
      });
      return h('article', { class: ['run', picked.has(r.publicId) && 'picked'] },
        h('div', { class: 'mini' }, mini.el),
        h('div', {},
          h('div', { class: 't' }, h('a', { href: `/r/${r.code}`, 'data-link': '' }, TITLES[r.titleKey])),
          labelEl,
          h('div', { class: 'd' }, `${fmtDate(r.createdAt)} · ${ARCH[r.primary].name} region`)),
        h('div', { class: 'acts' }, pinBtn, editBtn, delBtn));
    }));
  }
  paintList();
  paintCompare();

  // Full analysis of the latest run (codes are the canonical record).
  const latestFull = decodeCode(latest.code) ? analyze(decodeCode(latest.code)) : null;

  body.append(h('div', { class: 'log-grid' },
    h('div', { class: 'side-stack' }, trajectory, cmp),
    h('div', { class: 'side-stack' },
      h('div', { class: 'panel-title' }, h('h3', 'All runs'), h('a', { class: 'btn btn-sm', href: '/quiz', 'data-link': '' }, 'New run +')),
      list,
      latestFull ? h('p', { class: 'kicker', style: { textTransform: 'none', letterSpacing: 0 } }, `Latest conviction ${pct(latestFull.conviction)}% · certainty ${pct(latestFull.confidence ?? 0)}%`) : null)));

  return session.subscribe(() => navigate('/me', { replace: true }));
}
