import { h, fmtDate, timeAgo, fmtInt } from '../dom.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { sfx } from '../sfx.js';
import { toast } from '../components/toast.js';
import { openAuthModal, openConfirmModal } from '../components/modal.js';
import { renderPlane } from '../components/plane.js';

export async function archiveView(ctx) {
  if (!state.user) {
    return { el: signedOut() };
  }
  let attempts = [];
  let loadError = null;
  try {
    const data = await api.attempts();
    attempts = data.attempts;
  } catch (err) {
    loadError = err.message;
  }
  return { el: build(ctx, attempts, loadError) };
}

function signedOut() {
  return h(
    'div',
    { class: 'shell archive-shell' },
    h(
      'div',
      { class: 'panel panel-pad', style: { maxWidth: '640px', margin: '40px auto 0', textAlign: 'center' } },
      h('p', { class: 'kicker warm' }, 'ARCHIVE LOCKED'),
      h('h1', { class: 'h2' }, 'Sign in to open the archive.'),
      h(
        'p',
        { class: 'muted' },
        'Accounts are optional and free — the scan itself never requires one. Linking an archive keeps every scan, powers retake comparisons, and lets you reopen any coordinate.'
      ),
      h(
        'div',
        { class: 'empty-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openAuthModal({ onSuccess: () => navigate('/archive') }) }, 'SIGN IN / CREATE ACCOUNT'),
        h('a', { class: 'btn', href: '#/quiz' }, 'TAKE A SCAN FIRST ▸')
      ),
      h(
        'p',
        { class: 'modal-note' },
        'Demo archive available: ',
        h('code', {}, 'PLAYER1'),
        ' / ',
        h('code', {}, 'arcade123')
      )
    )
  );
}

function build(ctx, attempts, loadError) {
  const quiz = ctx.quiz;
  const archetypes = quiz.archetypes;
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const nameOf = (key) => archetypes.find((a) => a.key === key)?.name || key;
  const selected = [];

  const content = h('div', {});

  const mostCharted = (() => {
    if (!attempts.length) return null;
    const counts = {};
    for (const a of attempts) counts[a.result.dominant] = (counts[a.result.dominant] || 0) + 1;
    const [key, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { key, count };
  })();

  const root = h(
    'div',
    { class: 'shell archive-shell' },
    h(
      'div',
      { class: 'archive-head' },
      h(
        'div',
        {},
        h('p', { class: 'kicker' }, 'PLAYER ARCHIVE'),
        h('h1', { class: 'h2' }, `@${state.user.username}`),
        h('p', { class: 'muted', style: { margin: 0 } }, `Linked ${fmtDate(state.user.createdAt)} — every scan stays on the record.`)
      ),
      h(
        'div',
        { class: 'archive-stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-value mono-num' }, fmtInt(attempts.length)), h('div', { class: 'stat-label' }, 'ARCHIVED SCANS')),
        mostCharted
          ? h(
              'div',
              { class: 'stat', style: `border-color:${colorOf(mostCharted.key)}` },
              h('div', { class: 'stat-value', style: { fontSize: '18px', color: colorOf(mostCharted.key) } }, nameOf(mostCharted.key)),
              h('div', { class: 'stat-label' }, `MOST CHARTED ×${mostCharted.count}`)
            )
          : h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, '—'), h('div', { class: 'stat-label' }, 'MOST CHARTED'))
      )
    ),
    content
  );

  function render() {
    content.innerHTML = '';

    if (loadError) {
      content.append(
        h(
          'div',
          { class: 'panel panel-pad', style: { textAlign: 'center' } },
          h('p', { class: 'kicker warm' }, 'ARCHIVE UNREADABLE'),
          h('p', { class: 'muted' }, loadError)
        )
      );
      return;
    }

    if (!attempts.length) {
      content.append(
        h(
          'div',
          { class: 'panel empty-state' },
          h('p', { class: 'kicker' }, 'NO RECORDS YET'),
          h('h2', {}, 'The archive is empty.'),
          h('p', {}, 'Take a scan and link it to start your chart. Every retake gets compared automatically.'),
          h('div', { class: 'empty-actions' }, h('a', { class: 'btn btn-primary', href: '#/quiz' }, 'START A SCAN ▸'))
        )
      );
      return;
    }

    if (selected.length === 2) {
      const [a, b] = selected
        .map((id) => attempts.find((x) => x.id === id))
        .sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
      content.append(comparePanel(ctx, a, b, () => {
        selected.length = 0;
        render();
      }));
    }

    content.append(
      h(
        'p',
        { class: 'muted', style: { marginTop: '10px' } },
        selected.length === 1
          ? 'Select one more scan to compare coordinates.'
          : 'Select any two scans to compare their coordinates side by side.'
      )
    );

    const grid = h('div', { class: 'attempt-grid' });
    attempts.forEach((attempt, i) => {
      const previous = attempts[i + 1];
      const card = h('article', { class: `panel attempt-card${selected.includes(attempt.id) ? ' selected' : ''}` });

      const mini = renderPlane({
        archetypes,
        result: attempt.result,
        mini: true,
        animate: false,
        interactive: false
      });

      const top3 = [...attempt.result.scores].sort((x, y) => y.pct - x.pct).slice(0, 3);

      const deltaChips = previous
        ? top3.slice(0, 1).map((score) => {
            const prev = previous.result.scores.find((s) => s.key === score.key);
            const diff = score.pct - (prev?.pct ?? 0);
            if (Math.abs(diff) < 0.5) return null;
            return h(
              'span',
              { class: `delta-chip ${diff > 0 ? 'up' : 'down'}`, style: { fontSize: '11px', padding: '3px 7px' } },
              `${diff > 0 ? '▲' : '▼'} ${score.key.toUpperCase()} ${diff > 0 ? '+' : ''}${diff.toFixed(0)}`
            );
          })
        : [];

      card.append(
        h('div', { class: 'attempt-mini' }, mini.el),
        h('div', {}, h('div', { class: 'attempt-title' }, attempt.title), h('div', { class: 'attempt-meta' }, `${fmtDate(attempt.createdAt)} · ${timeAgo(attempt.createdAt)} · ${attempt.result.tier.name}`)),
        h(
          'div',
          { class: 'attempt-chips' },
          ...top3.map((score) =>
            h(
              'span',
              { class: 'chip', style: `--c:${colorOf(score.key)}; font-size: 11px; padding: 3px 8px` },
              h('span', { class: 'swatch' }),
              nameOf(score.key),
              h('span', { class: 'dim' }, `${Math.round(score.pct)}%`)
            )
          ),
          ...deltaChips.filter(Boolean)
        ),
        h(
          'div',
          { class: 'attempt-actions' },
          h('a', { class: 'btn btn-small', href: `#/a/${attempt.id}` }, 'VIEW REPORT'),
          h(
            'button',
            {
              class: `btn btn-small${selected.includes(attempt.id) ? ' btn-primary' : ''}`,
              type: 'button',
              onclick: () => {
                const at = selected.indexOf(attempt.id);
                if (at >= 0) selected.splice(at, 1);
                else {
                  if (selected.length >= 2) selected.shift();
                  selected.push(attempt.id);
                }
                sfx.select();
                render();
              }
            },
            'COMPARE'
          ),
          h(
            'button',
            {
              class: 'btn btn-small btn-danger',
              type: 'button',
              onclick: () =>
                openConfirmModal({
                  title: 'Delete this scan?',
                  body: `${attempt.title} from ${fmtDate(attempt.createdAt)} will be removed from the archive. This cannot be undone.`,
                  confirmLabel: 'DELETE SCAN',
                  onConfirm: async () => {
                    try {
                      await api.deleteAttempt(attempt.id);
                      attempts = attempts.filter((x) => x.id !== attempt.id);
                      const at = selected.indexOf(attempt.id);
                      if (at >= 0) selected.splice(at, 1);
                      toast('Scan deleted from the archive.');
                      render();
                    } catch (err) {
                      toast(err.message, 'error');
                    }
                  }
                })
            },
            'DELETE'
          )
        )
      );
      grid.append(card);
    });
    content.append(grid);
  }

  render();
  return { el: root };
}

function comparePanel(ctx, older, newer, onClear) {
  const archetypes = ctx.quiz.archetypes;
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const nameOf = (key) => archetypes.find((a) => a.key === key)?.name || key;

  const side = (attempt, label) =>
    h(
      'div',
      { class: 'compare-side' },
      h('p', { class: 'kicker', style: { marginBottom: '4px' } }, label),
      h('h3', {}, attempt.title),
      h('div', { class: 'attempt-meta' }, `${fmtDate(attempt.createdAt)} · ${timeAgo(attempt.createdAt)}`),
      h(
        'div',
        { class: 'attempt-mini' },
        renderPlane({ archetypes, result: attempt.result, mini: true, animate: false, interactive: false }).el
      )
    );

  const rows = archetypes.map((arch) => {
    const to = newer.result.scores.find((s) => s.key === arch.key)?.pct ?? 0;
    const from = older.result.scores.find((s) => s.key === arch.key)?.pct ?? 0;
    const diff = to - from;
    const row = h(
      'div',
      { class: 'compare-row' },
      h('div', { class: 'bar-name', style: `--c:${arch.color}`, text: arch.name }),
      h(
        'div',
        { class: 'compare-bar' },
        h('div', { class: 'from', style: { left: '1px', width: `${from}%`, background: '#2b3a4d' } }),
        h('div', { class: 'to', style: { left: '1px', width: `${to}%`, background: arch.color } })
      ),
      h(
        'div',
        { class: 'mono-num', style: { textAlign: 'right', color: Math.abs(diff) < 0.5 ? 'var(--muted)' : diff > 0 ? '#51cf66' : '#ff4d6d' } },
        `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`
      )
    );
    return row;
  });

  return h(
    'div',
    { class: 'panel compare-panel' },
    h(
      'div',
      { class: 'row', style: { justifyContent: 'space-between', marginBottom: '16px' } },
      h('p', { class: 'kicker', style: { margin: 0 } }, 'COMPARE SCANS'),
      h('button', { class: 'btn btn-small btn-ghost', type: 'button', onclick: onClear }, 'CLEAR SELECTION')
    ),
    h('div', { class: 'compare-grid' }, side(older, 'EARLIER SCAN'), side(newer, 'LATER SCAN')),
    h('div', { class: 'compare-deltas' }, h('p', { class: 'kicker', style: { margin: '6px 0 0' } }, 'PER-ARCHETYPE DRIFT'), ...rows),
    h(
      'p',
      { class: 'muted', style: { fontSize: '13px', marginTop: '16px' } },
      'Dull bars are the earlier scan; bright bars are the later one. Watch which way your coordinate has drifted.'
    )
  );
}
