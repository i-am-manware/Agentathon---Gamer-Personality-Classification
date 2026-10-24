import { h, fmtDate, timeAgo } from '../dom.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { sfx } from '../sfx.js';
import { toast } from '../components/toast.js';
import { openAuthModal } from '../components/modal.js';
import { renderPlane } from '../components/plane.js';
import { renderRadar } from '../components/radar.js';
import { renderBars, renderTensions, renderConfidence } from '../components/bars.js';
import { downloadShareCard, copyShareCard, shareCardFile } from '../sharecard.js';

const loadingEl = () =>
  h('div', { class: 'shell' }, h('div', { class: 'loading-line' }, 'READING CASSETTE ', h('span', { class: 'pulse' }, '▮▮▮')));

export async function resultView(ctx, params = {}) {
  const quiz = ctx.quiz;
  if (!quiz) return { el: loadingEl() };

  let payload = null;
  let mode = 'fresh';
  let attempt = null;

  if (params.code) {
    mode = 'shared';
    try {
      payload = await api.result({ code: params.code });
    } catch (err) {
      return { el: errorPanel(err.message) };
    }
  } else if (params.id) {
    mode = 'archived';
    if (!state.user) {
      openAuthModal({ message: 'Sign in to open a scan from your archive.' });
      navigate('/archive');
      return { el: loadingEl() };
    }
    try {
      const list = await api.attempts();
      attempt = list.attempts.find((a) => a.id === params.id);
      if (!attempt) throw new Error('That scan is not in your archive.');
      payload = await api.result({ answers: attempt.answers });
    } catch (err) {
      return { el: errorPanel(err.message) };
    }
  } else if (state.last?.result) {
    payload = state.last;
  } else {
    toast('The machine has no scan loaded yet. Take the quiz first.', 'warn');
    navigate('/quiz');
    return { el: loadingEl() };
  }

  const { result, insight } = payload;
  const archetypes = quiz.archetypes;
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || '#7cf7d0';
  const dominantColor = colorOf(result.dominant);

  let saved = !!payload.saved || mode === 'archived';
  let attemptId = payload.attemptId || (attempt?.id ?? null);

  const root = h('div', { class: 'shell result-shell' });

  if (mode === 'shared') {
    root.append(
      h(
        'div',
        { class: 'panel panel-pad shared-banner' },
        h('p', { class: 'kicker' }, 'INCOMING TRANSMISSION // SHARED SCAN'),
        h(
          'p',
          { class: 'muted', style: { margin: 0, flex: '1 1 240px' } },
          'Someone sent you their player DNA coordinate. Take the scan yourself and see who lands closer to the arena.'
        ),
        h('a', { class: 'btn btn-small btn-primary', href: '#/quiz' }, 'TAKE YOUR OWN SCAN ▸')
      )
    );
  }

  if (mode === 'archived' && attempt) {
    root.append(
      h(
        'div',
        { class: 'panel panel-pad shared-banner' },
        h('p', { class: 'kicker' }, `ARCHIVED SCAN // ${fmtDate(attempt.createdAt)}`),
        h('p', { class: 'muted', style: { margin: 0, flex: '1 1 240px' } }, `Frozen ${timeAgo(attempt.createdAt)}. The chart never changes after the fact.`),
        h('a', { class: 'btn btn-small', href: '#/archive' }, '◀ BACK TO ARCHIVE')
      )
    );
  }

  root.append(
    h('div', { class: 'result-stamp' }, '■ SCAN COMPLETE'),
    h(
      'header',
      { class: 'result-head' },
      h('div', { class: 'result-eyebrow' }, insight.eyebrow),
      h('h1', { class: 'result-title', style: `--c:${dominantColor}` }, insight.title),
      h('p', { class: 'result-subtitle' }, `${insight.subtitle} // ${result.tier.name}`)
    )
  );

  const focusNote = h(
    'div',
    { class: 'field-note' },
    'Click any vertex (or legend chip) to isolate that cluster in the ghost field.'
  );

  const plane = renderPlane({
    archetypes,
    result,
    field: ctx.field,
    interactive: true,
    onFocus: (focus) => {
      if (!focus) {
        focusNote.textContent = 'Click any vertex (or legend chip) to isolate that cluster in the ghost field.';
      } else {
        focusNote.textContent = `${focus.archetype.name} cluster: ${focus.count} charted scans within reach. Your score there: ${Math.round(
          result.scores.find((s) => s.key === focus.archetype.key).pct
        )}%.`;
      }
    }
  });

  const legend = h('div', { class: 'plane-legend' });
  const sortedScores = [...result.scores].sort((a, b) => b.pct - a.pct);
  for (const score of sortedScores) {
    const arch = archetypes.find((a) => a.key === score.key);
    const chip = h(
      'button',
      {
        class: `chip${score.key === result.dominant ? ' strong' : ''}`,
        type: 'button',
        style: `--c:${arch.color}`,
        onclick: () => plane.focusArchetype(score.key)
      },
      h('span', { class: 'swatch' }),
      arch.name,
      h('span', { class: 'dim' }, `${Math.round(score.pct)}%`)
    );
    legend.append(chip);
  }

  const planePanel = h(
    'div',
    { class: 'panel plane-panel' },
    plane.el,
    legend,
    h(
      'div',
      { class: 'term-block', style: { marginTop: '14px', fontSize: '12.5px' } },
      h('span', { class: 'term-dim' }, '> coordinate: '),
      `x ${signed(result.coord.x)}  y ${signed(result.coord.y)}  r ${result.coord.r.toFixed(2)}  θ ${result.coord.angle.toFixed(1)}°`,
      h('br'),
      h('span', { class: 'term-dim' }, '> sector: '),
      sectorLabel(archetypes, result.coord)
    ),
    focusNote,
    h(
      'div',
      { class: 'plane-caption' },
      h('span', {}, h('span', { class: 'live-dot' }), 'LIVE GHOST FIELD'),
      h('span', {}, `${ctx.field?.total ? ctx.field.total : 0} scans plotted`)
    )
  );

  const confidenceCopy = h(
    'div',
    { class: 'confidence-copy' },
    h('div', {}, h('strong', {}, 'SIGNAL CLARITY') , ' — how strongly your answers agree.'),
    h('div', { class: 'dim' }, `${result.tier.name}: ${result.tier.note}`)
  );

  const scoresPanel = h(
    'div',
    { class: 'panel scores-panel' },
    h('div', { class: 'confidence' }, renderConfidence({ value: result.confidence }), confidenceCopy),
    (() => {
      const mountEl = h('div', { class: 'radar-mount' });
      mountEl.append(renderRadar({ archetypes, scores: result.scores }).el);
      return mountEl;
    })(),
    renderBars({ archetypes, scores: result.scores }),
    h('div', {}, h('p', { class: 'kicker', style: { marginBottom: '12px' } }, 'TENSION READOUT'), renderTensions({ archetypes, tensions: result.tensions }))
  );

  root.append(h('div', { class: 'result-grid' }, planePanel, scoresPanel));

  const shareUrl = `${window.location.origin}/#/r/${payload.shareCode}`;

  const shareButtons = h('div', { class: 'share-row' });

  const downloadBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      type: 'button',
      onclick: async () => {
        downloadBtn.disabled = true;
        const original = downloadBtn.textContent;
        downloadBtn.textContent = 'RENDERING...';
        try {
          await downloadShareCard({
            result,
            insight,
            archetypes,
            field: ctx.field,
            name: state.user?.username,
            origin: `${window.location.host}/#/r/${payload.shareCode}`
          });
          sfx.coin();
          toast('Share card exported. Frame it, post it, attach it to your résumé.');
        } catch (err) {
          toast(`Card render failed: ${err.message}`, 'error');
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = original;
        }
      }
    },
    'DOWNLOAD CARD'
  );

  const copyLinkBtn = h(
    'button',
    {
      class: 'btn',
      type: 'button',
      onclick: async () => {
        const ok = await copyText(shareUrl);
        if (ok) {
          sfx.tick();
          toast('Share link copied. Anyone who opens it gets your exact coordinate.');
        } else {
          toast('Could not access the clipboard — copy it from the panel below.', 'warn');
        }
      }
    },
    'COPY LINK'
  );

  shareButtons.append(downloadBtn, copyLinkBtn);

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    shareButtons.append(
      h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: async (event) => {
            const btn = event.currentTarget;
            btn.disabled = true;
            const ok = await copyShareCard({
              result,
              insight,
              archetypes,
              field: ctx.field,
              name: state.user?.username,
              origin: `${window.location.host}/#/r/${payload.shareCode}`
            });
            btn.disabled = false;
            if (ok) {
              sfx.coin();
              toast('Share card copied to clipboard as an image.');
            } else {
              toast('Clipboard images are not available here — use DOWNLOAD CARD.', 'warn');
            }
          }
        },
        'COPY IMAGE'
      )
    );
  }

  if (navigator.share) {
    shareButtons.append(
      h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: async () => {
            const sharedFile = await shareCardFile({
              result,
              insight,
              archetypes,
              field: ctx.field,
              name: state.user?.username,
              origin: `${window.location.host}/#/r/${payload.shareCode}`
            });
            if (!sharedFile) {
              try {
                await navigator.share({
                  title: 'PIXEL PSYCHE — Player DNA Report',
                  text: `I charted as ${insight.title}. Where do you land?`,
                  url: shareUrl
                });
              } catch {
                /* user cancelled */
              }
            }
          }
        },
        'SHARE'
      )
    );
  }

  const archiveBtn = h('button', { class: 'btn', type: 'button' }, '');
  function renderArchiveState() {
    if (saved) {
      archiveBtn.textContent = 'ARCHIVED ✓';
      archiveBtn.classList.add('btn-ghost');
      archiveBtn.disabled = true;
    } else {
      archiveBtn.textContent = state.user ? 'SAVE TO ARCHIVE' : 'SIGN IN TO ARCHIVE';
      archiveBtn.classList.remove('btn-ghost');
      archiveBtn.disabled = false;
    }
  }
  archiveBtn.addEventListener('click', async () => {
    if (!state.user) {
      openAuthModal({
        message: 'Link an archive to keep every scan, compare retakes, and watch your coordinate drift over time.',
        onSuccess: () => archiveCurrent()
      });
      return;
    }
    archiveCurrent();
  });

  async function archiveCurrent() {
    try {
      if (mode === 'shared') {
        const data = await api.result({ code: params.code, record: true });
        saved = true;
        attemptId = data.attemptId;
      } else if (mode === 'archived') {
        saved = true;
      } else if (payload.answers) {
        const data = await api.saveAttempt(payload.answers);
        saved = true;
        attemptId = data.attempt.id;
      } else {
        saved = true;
      }
      sfx.coin();
      toast('Scan archived. Your coordinate is on the record now.');
      renderArchiveState();
      renderDeltas();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
  renderArchiveState();
  shareButtons.append(archiveBtn);

  const sharePanel = h(
    'div',
    { class: 'panel panel-pad insight-panel' },
    h('p', { class: 'kicker' }, 'SHARE YOUR SCAN'),
    h(
      'p',
      { class: 'muted', style: { marginBottom: '4px' } },
      'The card is a 1080×1350 export built from your plane — ready for feeds, stories and group chats.'
    ),
    shareButtons,
    h(
      'div',
      { class: 'term-block', style: { marginTop: '18px' } },
      h('span', { class: 'term-dim' }, '> your share link: '),
      h('span', {}, shareUrl)
    )
  );

  root.append(sharePanel);

  const statGrid = h(
    'div',
    { class: 'stat-grid' },
    h(
      'div',
      { class: 'mini-panel', style: `--c:${dominantColor}` },
      h('div', { class: 'mp-label' }, 'STRENGTHS'),
      h('ul', { style: { margin: 0, paddingLeft: '18px', color: 'var(--dim)', fontSize: '14px' } }, ...insight.strengths.map((s) => h('li', {}, s)))
    ),
    h(
      'div',
      { class: 'mini-panel', style: `--c:${colorOf(result.secondary)}` },
      h('div', { class: 'mp-label' }, 'SIGNATURE MOVE'),
      h('div', { class: 'mp-body' }, insight.signature)
    ),
    h(
      'div',
      { class: 'mini-panel', style: `--c:${colorOf(result.dominant)}` },
      h('div', { class: 'mp-label' }, 'PARTY ROLE'),
      h('div', { class: 'mp-body' }, insight.partyRole)
    ),
    h(
      'div',
      { class: 'mini-panel', style: `--c:${colorOf(result.weakest)}` },
      h('div', { class: 'mp-label' }, 'KRYPTONITE'),
      h('div', { class: 'mp-body' }, insight.kryptonite)
    )
  );

  root.append(
    h(
      'div',
      { class: 'panel insight-panel' },
      h('h2', {}, 'The readout'),
      h('div', { class: 'insight-paragraphs' }, ...insight.paragraphs.map((p) => h('p', {}, p))),
      statGrid,
      h(
        'div',
        { class: 'chip-row', style: { marginTop: '22px' } },
        h('span', { class: 'kicker', style: { margin: 0, alignSelf: 'center' } }, 'LOAD UP:'),
        ...insight.genres.map((g) => h('span', { class: 'chip' }, g))
      )
    )
  );

  const deltaMount = h('div', {});
  root.append(deltaMount);

  async function renderDeltas() {
    deltaMount.innerHTML = '';
    if (!state.user || !attemptId || mode === 'archived') return;
    try {
      const list = await api.attempts();
      const idx = list.attempts.findIndex((a) => a.id === attemptId);
      const previous = idx >= 0 ? list.attempts[idx + 1] : null;
      if (!previous) return;
      const deltas = sortedScores.map((score) => {
        const prev = previous.result.scores.find((s) => s.key === score.key);
        const diff = score.pct - (prev?.pct ?? 0);
        return { key: score.key, diff };
      });
      const changed = deltas.filter((d) => Math.abs(d.diff) >= 0.5);
      deltaMount.append(
        h(
          'div',
          { class: 'panel delta-strip' },
          h('h3', {}, `DRIFT SINCE YOUR LAST SCAN (${fmtDate(previous.createdAt)})`),
          h(
            'div',
            { class: 'delta-chips' },
            ...(changed.length
              ? changed.map((d) =>
                  h(
                    'span',
                    { class: `delta-chip ${d.diff > 0 ? 'up' : 'down'}` },
                    `${d.diff > 0 ? '▲' : '▼'} ${archetypes.find((a) => a.key === d.key).name} ${d.diff > 0 ? '+' : ''}${d.diff.toFixed(1)}`
                  )
                )
              : [h('span', { class: 'delta-chip' }, 'A nearly identical coordinate — you are who you are.')])
          ),
          h(
            'p',
            { class: 'muted', style: { margin: '14px 0 0', fontSize: '13px' } },
            `Previous build: ${previous.title}. `
          )
        )
      );
    } catch {
      /* delta comparison is a bonus; ignore failures */
    }
  }
  renderDeltas();

  if (!state.user) {
    root.append(
      h(
        'div',
        { class: 'panel panel-pad', style: { marginTop: '20px', display: 'flex', gap: '18px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } },
        h(
          'div',
          {},
          h('p', { class: 'kicker', style: { marginBottom: '6px' } }, 'OPTIONAL // KEEP A RECORD'),
          h('p', { class: 'muted', style: { margin: 0 } }, 'Accounts are free and optional. Sign in to archive this scan and compare retakes over time.')
        ),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => openAuthModal({ onSuccess: () => archiveCurrent() }) }, 'CREATE ACCOUNT'),
          h('a', { class: 'btn btn-small btn-ghost', href: '#/quiz' }, 'RUN IT BACK ▸')
        )
      )
    );
  }

  return { el: root, dispose: () => plane.dispose() };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function signed(value) {
  const fixed = value.toFixed(2);
  return value >= 0 ? `+${fixed}` : fixed;
}

function sectorLabel(archetypes, coord) {
  if (coord.r < 0.12) return 'CORE — balanced build, no dominant sector';
  const sorted = [...archetypes].sort((a, b) => a.angle - b.angle);
  const norm = (deg) => ((deg % 360) + 360) % 360;
  const target = norm(coord.angle);
  for (let i = 0; i < sorted.length; i++) {
    const start = norm(sorted[i].angle);
    const end = norm(sorted[(i + 1) % sorted.length].angle);
    const span = norm(end - start) || 360;
    if (norm(target - start) <= span) {
      return `${sorted[i].name} ⇄ ${sorted[(i + 1) % sorted.length].name}`;
    }
  }
  return 'CORE';
}

function errorPanel(message) {
  return h(
    'div',
    { class: 'shell', style: { paddingTop: '70px' } },
    h(
      'div',
      { class: 'panel panel-pad', style: { maxWidth: '620px', margin: '0 auto', textAlign: 'center' } },
      h('p', { class: 'kicker warm' }, 'TRANSMISSION DAMAGED'),
      h('h1', { class: 'h2' }, 'That scan could not be read.'),
      h('p', { class: 'muted' }, message || 'The link may be mistyped or from an older firmware.'),
      h(
        'div',
        { class: 'row', style: { justifyContent: 'center', marginTop: '22px' } },
        h('a', { class: 'btn btn-primary', href: '#/quiz' }, 'TAKE A FRESH SCAN ▸'),
        h('a', { class: 'btn', href: '#/' }, 'RETURN TO BASE')
      )
    )
  );
}
