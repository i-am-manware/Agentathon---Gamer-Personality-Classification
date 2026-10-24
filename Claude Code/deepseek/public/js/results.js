/**
 * SPAWNPOINT — the results screen.
 *
 * Everything here is built from one scoring payload. The plane is the hero,
 * but the screen has to work as a *reading* — so the coordinate readout, the
 * six-axis breakdown, the three bipolar pairs and the written insight all
 * describe the same point from different angles.
 */

import { el, mount, tween, prefersReducedMotion, signed, formatDate, alpha } from './dom.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY, OPPOSING_PAIRS } from '/shared/archetypes.js';
import { buildInsight } from '/shared/insight.js';
import { PlaneRenderer, markerFor, populationPoints } from './plane.js';
import { renderCardBlob, downloadBlob, shareCard, cardFilename, CARD_W, CARD_H } from './share.js';
import { api } from './api.js';
import { sfx } from './sfx.js';
import { toast, toastOk, toastErr, copyText } from './toasts.js';
import { rememberAttemptId, loadLastResult } from './store.js';

/**
 * @param {HTMLElement} root
 * @param {object} result      scoring payload
 * @param {object} ctx         { payload, attempt, user, onRetake, onOpenHistory }
 */
export async function renderResults(root, result, ctx = {}) {
  const insight = buildInsight(result);
  const primary = ARCHETYPE_BY_KEY[result.primary];
  const marker = markerFor(result);
  const shareUrl = ctx.shareUrl || buildShareUrl(ctx.payload?.code, result);

  const planeCanvas = el('canvas', { 'aria-label': 'Your position on the Playstyle Plane' });
  const tooltip = el('div.plane-tooltip', { role: 'tooltip' });
  const hudBr = el('div.plane-hud.plane-hud--br');

  const wrap = el('div.plane-wrap', [
    el('div.plane-hud.plane-hud--tl', [el('b', 'PLAYSTYLE PLANE')]),
    el('div.plane-hud.plane-hud--tr', [el('b', result.signature)]),
    el('div.plane-hud.plane-hud--bl', [el('b', `${result.answeredCount}/${result.answeredCount + result.skippedCount}`), ' answered']),
    hudBr,
    planeCanvas,
    tooltip,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Layout                                                                  */
  /* ---------------------------------------------------------------------- */

  const view = el('div.result', [
    el('header.result__head', [
      el('div', [
        el('p.eyebrow', { style: { marginBottom: '0.4rem' } }, `Result · ${insight.band} · ${result.sector.label}`),
        el('h1.result__title', [
          primary.glyph + ' ',
          insight.title.includes('Hybrid') ? [insight.title.replace(' Hybrid', ''), el('em', ' Hybrid')] : el('em', insight.title.replace(/^The /, '')),
        ]),
        el('div.result__sub', [
          el('span', `Coord ${signed(result.x)} ${signed(result.y)}`),
          el('span', `·`),
          el('span', `Intensity ${Math.round(result.radius * 100)}%`),
          el('span', '·'),
          el('span', `Call sign ${result.signature}`),
          el('span', '·'),
          el('span', ctx.attempt?.createdAt ? formatDate(ctx.attempt.createdAt) : 'just now'),
        ]),
      ]),
      el('div.result__actions', [
        el('button.btn.btn--primary', { type: 'button', id: 'res-share' }, '⇪ Share card'),
        el('button.btn.btn--ghost', { type: 'button', id: 'res-copy' }, 'Copy link'),
        el('button.btn.btn--ghost', { type: 'button', id: 'res-retake' }, '↻ Retake'),
      ]),
    ]),

    el('div.plane-stage', [
      wrap,
      el('div.coord', { id: 'res-coord' }),
    ]),

    el('section.panel.panel--ticked', [
      el('p.eyebrow', 'The reading'),
      el('div.insight', [
        el('div.prose', [
          el('h2', { style: { fontSize: 'clamp(1.3rem, 2.6vw, 1.7rem)' } }, insight.title),
          ...insight.paragraphs.map((p) => el('p', p)),
          el('div.reads', insight.reads.map((r) =>
            el('div.read', [
              el('div.read__label', r.label),
              el('p', r.text),
            ]),
          )),
        ]),
        el('div', { style: { display: 'grid', gap: '0.8rem' } }, [
          el('div.coord__block', [
            el('div.coord__k', 'Band'),
            el('div', { style: { fontFamily: 'var(--font-display)', fontSize: '1.4rem' } }, insight.band),
            el('p.faint', { style: { fontSize: '0.82rem', margin: '0.3rem 0 0' } }, insight.kicker),
          ]),
          el('div.tension', [
            el('div.callout__k', 'The tension'),
            el('p', insight.tension),
          ]),
          el('div.callout', [
            el('div.callout__k', 'One experiment'),
            el('p', insight.recommendation),
          ]),
          el('div.coord__block', [
            el('div.coord__k', 'Sector'),
            el('div.coord__v', el('b', result.sector.label)),
            el('p.faint', { style: { fontSize: '0.8rem', margin: '0.35rem 0 0', lineHeight: '1.55' } },
              `On the plane, ${result.sector.text}.`),
          ]),
        ]),
      ]),
    ]),

    el('div', { style: { display: 'grid', gap: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' } }, [
      el('section.panel', [
        el('p.eyebrow', 'Affinity breakdown'),
        el('p.faint', { style: { fontSize: '0.82rem', marginBottom: '0.9rem' } },
          'Each axis is scored 0–100 against a neutral baseline of 50. A bar above the midline is pulling your coordinate toward that vertex of the hexagon.'),
        el('div.breakdown', { id: 'res-axes' }),
      ]),
      el('section.panel', [
        el('p.eyebrow', 'Opposing pairs'),
        el('p.faint', { style: { fontSize: '0.82rem', marginBottom: '0.9rem' } },
          'The six archetypes are three opposing pairs. These bars show the balance within each pair — the dot is you, the centre is a dead tie.'),
        el('div', { id: 'res-pairs', style: { marginBottom: '1rem' } }),
        el('hr.divider'),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' } }, [
          stat('Versatility', `${Math.round(result.versatility * 100)}%`, 'how evenly your excess is spread'),
          stat('Decisiveness', `${Math.round(result.decisiveness * 100)}%`, 'how much one archetype runs away with it'),
          stat('Top gap', `${Math.round(result.margin)} pts`, `${primary.short} over ${ARCHETYPE_BY_KEY[result.secondary].short}`),
          stat('Noise floor', result.calibration.floor.toFixed(3), 'the instrument’s own baseline'),
        ]),
      ]),
    ]),

    el('section.panel', [
      el('p.eyebrow', 'All six archetypes'),
      el('p.faint', { style: { fontSize: '0.82rem', marginBottom: '0.9rem' } },
        'Your top archetype, your second voice, and the four you are least aligned with — in the algorithm’s own order.'),
      el('div.detail-grid', { id: 'res-details' }),
    ]),

    el('section.panel.panel--ticked', { id: 'res-share-panel' }, [
      el('p.eyebrow', 'Share'),
      el('div.share-grid', [
        el('div', [
          el('div.share-preview', { id: 'res-preview' }),
          el('p.faint', { style: { fontSize: '0.76rem', marginTop: '0.5rem' } },
            `A ${CARD_W}×${CARD_H} PNG, drawn in your browser. No upload, no tracking pixel.`),
        ]),
        el('div', { style: { display: 'grid', gap: '0.8rem', alignContent: 'start' } }, [
          el('div', [
            el('div.coord__k', 'Share link'),
            el('div.linkbox', [
              el('input', { id: 'res-link', readonly: true, value: shareUrl, 'aria-label': 'Share link' }),
              el('button.btn.btn--ghost.btn--sm', { type: 'button', id: 'res-link-copy' }, 'Copy'),
            ]),
            el('p.faint', { style: { fontSize: '0.76rem', marginTop: '0.45rem' } },
              'The link carries your answers, not your identity — anyone opening it sees this exact result, recomputed from scratch.'),
          ]),
          el('div', [
            el('div.coord__k', 'Export'),
            el('div.socials', [
              el('button.btn.btn--primary.btn--sm', { type: 'button', id: 'res-download' }, '↓ Download PNG'),
              el('button.btn.btn--ghost.btn--sm', { type: 'button', id: 'res-native' }, '⇪ Share…'),
              el('button.btn.btn--ghost.btn--sm', { type: 'button', id: 'res-copysummary' }, 'Copy summary'),
            ]),
          ]),
          el('div.coord__block', [
            el('div.coord__k', 'Call sign'),
            el('div.coord__v', el('b', result.signature)),
            el('p.faint', { style: { fontSize: '0.78rem', margin: '0.35rem 0 0' } },
              'Derived from your answer pattern and coordinate. Identical playthroughs collide — that is the point.'),
          ]),
          ctx.user
            ? el('div.coord__block', [
                el('div.coord__k', 'Saved'),
                el('div.coord__v', ctx.attempt ? el('b', 'In your history') : 'Saving…'),
                el('p.faint', { style: { fontSize: '0.78rem', margin: '0.35rem 0 0' } },
                  'Signed in as ' + ctx.user.displayName + '.'),
              ])
            : el('div.coord__block', [
                el('div.coord__k', 'Keep this'),
                el('button.btn.btn--ghost.btn--sm', { type: 'button', id: 'res-signin' }, 'Create an account'),
                el('p.faint', { style: { fontSize: '0.78rem', margin: '0.45rem 0 0' } },
                  'Optional. An account saves every run so you can watch your coordinate drift over time.'),
              ]),
        ]),
      ]),
    ]),

    el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, [
      el('button.btn.btn--ghost', { type: 'button', onclick: () => ctx.onRetake?.() }, '↻ Take it again'),
      el('a.btn.btn--ghost', { href: '/plane', 'data-link': true }, 'See the whole population'),
      el('a.btn.btn--ghost', { href: '/about', 'data-link': true }, 'How the algorithm works'),
    ]),
  ]);

  mount(root, view);

  /* ---------------------------------------------------------------------- */
  /* Plane                                                                   */
  /* ---------------------------------------------------------------------- */

  const plane = new PlaneRenderer(planeCanvas, {
    pad: 0.3,
    fullLabels: true,
    interactive: true,
    showPopulation: true,
  });
  plane.setMarker(marker);
  plane.reveal = prefersReducedMotion() ? 1 : 0;

  plane.onHover = (point, screen) => {
    if (!point || !screen) {
      tooltip.classList.remove('is-visible');
      return;
    }
    const a = ARCHETYPE_BY_KEY[point.primary];
    mount(tooltip, [
      el('b', { style: { color: a?.color } }, `${a?.glyph ?? ''} ${a?.short ?? 'Unknown'}`),
      el('span', `Plotted at ${signed(point.x)} ${signed(point.y)}`),
    ]);
    tooltip.style.left = `${screen.sx}px`;
    tooltip.style.top = `${screen.sy}px`;
    tooltip.classList.add('is-visible');
  };

  // Population + reveal run together; neither should block the reading.
  loadPopulation(plane, hudBr);

  if (!prefersReducedMotion()) {
    plane.animateReveal(1100).then(() => sfx.reveal());
  } else {
    plane.draw();
  }

  /* ---------------------------------------------------------------------- */
  /* Breakdowns                                                              */
  /* ---------------------------------------------------------------------- */

  renderAxes(root.querySelector('#res-axes'), result);
  renderPairs(root.querySelector('#res-pairs'), result);
  renderDetails(root.querySelector('#res-details'), result);

  // Bars animate in, after the plane has begun its reveal.
  setTimeout(() => animateBars(root, result), prefersReducedMotion() ? 0 : 260);

  /* ---------------------------------------------------------------------- */
  /* Coordinate readout                                                      */
  /* ---------------------------------------------------------------------- */

  const coord = root.querySelector('#res-coord');
  mount(coord, [
    el('div.coord__block', [
      el('div.coord__k', 'Coordinate'),
      el('div.coord__v', [el('b', signed(result.x)), '  ', el('b', signed(result.y))]),
      el('p.faint', { style: { fontSize: '0.76rem', margin: '0.4rem 0 0' } }, 'x, y in unit-plane space'),
    ]),
    el('div.coord__block', [
      el('div.coord__k', 'Distance from centre'),
      el('div.coord__v', [el('b', `${Math.round(result.radius * 100)}%`), el('small.mono.faint', ` of the rim`)]),
      el('div.coord__meter', [el('i', { id: 'res-radius-meter' })]),
      el('p.faint', { style: { fontSize: '0.76rem', margin: '0.45rem 0 0' } }, insight.kicker),
    ]),
    el('div.coord__block', [
      el('div.coord__k', 'Heading'),
      el('div.coord__v', [el('b', `${result.heading}°`), el('small.mono.faint', ' from east')]),
      el('p.faint', { style: { fontSize: '0.76rem', margin: '0.4rem 0 0' } },
        `Pointing at ${primary.short} territory.`),
    ]),
    el('div.coord__block', [
      el('div.coord__k', 'Primary / Secondary'),
      el('div.coord__v', [
        el('b', { style: { color: primary.color } }, primary.short),
        el('small.mono.faint', ' / '),
        el('b', { style: { color: ARCHETYPE_BY_KEY[result.secondary].color } }, ARCHETYPE_BY_KEY[result.secondary].short),
      ]),
      el('p.faint', { style: { fontSize: '0.76rem', margin: '0.4rem 0 0' } },
        result.margin < 9 ? 'Close enough to read as a genuine blend.' : `A ${Math.round(result.margin)}-point gap.`),
    ]),
    el('div.coord__block', [
      el('div.coord__k', 'Instrument'),
      el('div.coord__v', [el('b', `v${result.version}`), el('small.mono.faint', ' scoring model')]),
      el('p.faint', { style: { fontSize: '0.74rem', margin: '0.4rem 0 0', fontFamily: 'var(--font-mono)' } },
        `floor ${result.calibration.floor.toFixed(3)} · ceiling ${result.calibration.ceiling.toFixed(3)}`),
    ]),
  ]);

  requestAnimationFrame(() => {
    const m = root.querySelector('#res-radius-meter');
    if (m) m.style.width = `${Math.round(result.radius * 100)}%`;
  });

  /* ---------------------------------------------------------------------- */
  /* Share panel                                                             */
  /* ---------------------------------------------------------------------- */

  const previewHost = root.querySelector('#res-preview');
  let cardBlob = null;

  (async () => {
    try {
      const blob = await renderCardBlob(result, marker, {
        signature: result.signature,
        shareUrl,
        username: ctx.user?.username,
      });
      cardBlob = blob;
      const url = URL.createObjectURL(blob);
      mount(previewHost, el('img', { src: url, alt: 'Your shareable result card', loading: 'lazy' }));
      previewHost.querySelector('img').addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    } catch {
      mount(previewHost, el('div.empty', 'Could not render the card preview.'));
    }
  })();

  const doShare = async () => {
    try {
      const res = await shareCard(result, marker, { signature: result.signature, shareUrl, username: ctx.user?.username });
      if (res.shared) toastOk('Card shared.');
      else if (!res.aborted) toastOk('Card downloaded.', { ms: 2600 });
    } catch {
      toastErr('Could not build the share card.');
    }
  };

  root.querySelector('#res-share')?.addEventListener('click', doShare);
  root.querySelector('#res-native')?.addEventListener('click', doShare);

  root.querySelector('#res-download')?.addEventListener('click', async () => {
    try {
      const blob = cardBlob || (await renderCardBlob(result, marker, { signature: result.signature, shareUrl }));
      downloadBlob(blob, cardFilename(result));
      sfx.copy();
      toastOk('PNG downloaded.');
    } catch {
      toastErr('Could not export the card.');
    }
  });

  const copyLink = async () => {
    const ok = await copyText(shareUrl);
    if (ok) {
      sfx.copy();
      toastOk('Link copied.');
    } else toastErr('Could not copy — select the field and copy manually.');
  };
  root.querySelector('#res-copy')?.addEventListener('click', copyLink);
  root.querySelector('#res-link-copy')?.addEventListener('click', copyLink);

  root.querySelector('#res-copysummary')?.addEventListener('click', async () => {
    const text =
      `${insight.title} — ${result.signature}\n` +
      `${insight.summary}\n` +
      `Coordinate ${signed(result.x)} ${signed(result.y)} · ${Math.round(result.radius * 100)}% intensity\n` +
      `${primary.tagline}\n${shareUrl}`;
    const ok = await copyText(text);
    ok ? (sfx.copy(), toastOk('Summary copied.')) : toastErr('Could not copy.');
  });

  root.querySelector('#res-retake')?.addEventListener('click', () => ctx.onRetake?.());
  root.querySelector('#res-signin')?.addEventListener('click', () => ctx.onSignIn?.());

  /* ---------------------------------------------------------------------- */
  /* Persist                                                                 */
  /* ---------------------------------------------------------------------- */

  if (ctx.payload && !ctx.attempt) {
    try {
      const saved = await api.saveAttempt({
        answers: ctx.payload.answers,
        code: ctx.payload.code,
        x: result.x,
        y: result.y,
        durationMs: ctx.payload.durationMs,
      });
      if (saved?.id) {
        ctx.attempt = saved.attempt ?? saved;
        rememberAttemptId(saved.id ?? saved.attempt?.id);
        root.querySelector('#res-link')?.setAttribute('value', shareUrl);
      }
    } catch (err) {
      // A failed save must never break the result screen.
      if (err?.status === 409) toast('Saved result rejected by the server — showing your local score.', { kind: 'info' });
    }
  }

  return { plane, result };
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

function stat(k, v, note) {
  return el('div.stat', [
    el('div.stat__k', k),
    el('div.stat__v', v),
    note ? el('div.faint', { style: { fontSize: '0.7rem', marginTop: '0.2rem' } }, note) : null,
  ]);
}

function renderAxes(host, result) {
  if (!host) return;
  const ranked = [...ARCHETYPES].sort((a, b) => result.affinities[b.key] - result.affinities[a.key]);
  mount(host, ranked.map((a) => {
    const v = result.affinities[a.key];
    const frac = (v - 50) / 50;
    const w = Math.abs(frac) * 50; // percent of the track
    return el('div.axis', { style: { '--ac': a.color }, dataset: { key: a.key } }, [
      el('div.axis__name', [
        el('span.axis__glyph', a.glyph),
        el('b', a.short),
        a.key === result.primary ? el('span.tag.tag--phos', { style: { fontSize: '0.55rem' } }, 'top') : null,
        a.key === result.least ? el('span.tag', { style: { fontSize: '0.55rem' } }, 'least') : null,
      ]),
      el('div.axis__track', [
        el('div.axis__mid'),
        el('div.axis__fill', {
          class: frac >= 0 ? 'axis__fill--pos' : 'axis__fill--neg',
          dataset: { w: String(w), dir: frac >= 0 ? 'pos' : 'neg' },
        }),
      ]),
      el('div.axis__val', [
        String(Math.round(v)),
        el('small', signed(result.deviation[a.key], 3)),
      ]),
    ]);
  }));
}

function renderPairs(host, result) {
  if (!host) return;
  mount(host, result.pairs.map((p) => {
    const left = ARCHETYPE_BY_KEY[p.left];
    const right = ARCHETYPE_BY_KEY[p.right];
    const pos = (p.value + 100) / 200; // 0..1 along the track
    return el('div.pairbar', [
      el('div.pairbar__label', { class: p.value < 0 ? 'is-lead' : '', style: { color: p.value < 0 ? left.color : undefined } }, left.short),
      el('div.pairbar__track', [
        el('div.pairbar__mid'),
        el('div.pairbar__dot', { dataset: { pos: String(pos * 100) } }),
      ]),
      el('div.pairbar__label.pairbar__label--right', { class: p.value > 0 ? 'is-lead' : '', style: { color: p.value > 0 ? right.color : undefined } }, right.short),
    ]);
  }));
}

function renderDetails(host, result) {
  if (!host) return;
  const ranked = [...ARCHETYPES].sort((a, b) => result.affinities[b.key] - result.affinities[a.key]);
  mount(host, ranked.map((a, i) => {
    const role = i === 0 ? 'Primary' : i === 1 ? 'Second voice' : i === ranked.length - 1 ? 'Thinnest thread' : `Rank ${i + 1}`;
    return el('div.detail', { style: { '--ac': a.color } }, [
      el('h4', [el('span', a.glyph), a.name]),
      el('p.detail__motto', `“${a.motto}”`),
      el('p.readout', { style: { marginBottom: '0.5rem' } },
        `${role} · ${Math.round(result.affinities[a.key])}/100 · ${result.share[a.key].toFixed(1)}% of answers`),
      el('p.muted', { style: { fontSize: '0.85rem', lineHeight: '1.6' } }, a.blurb),
      el('div.chips', [
        ...a.loves.slice(0, 3).map((l) => el('span.chip', l)),
        ...a.dreads.slice(0, 2).map((d) => el('span.chip.chip--bad', d)),
      ]),
    ]);
  }));
}

/** Animate every bar from the centre outward. */
async function animateBars(root, result) {
  const fills = root.querySelectorAll('.axis__fill');
  fills.forEach((f) => {
    const w = Number(f.dataset.w);
    const dir = f.dataset.dir;
    f.style.width = '0%';
    requestAnimationFrame(() => {
      f.style.width = `${w}%`;
      if (dir === 'neg') f.style.left = `${50 - w}%`;
    });
  });

  const dots = root.querySelectorAll('.pairbar__dot');
  dots.forEach((d) => {
    const pos = Number(d.dataset.pos);
    d.style.left = '50%';
    requestAnimationFrame(() => {
      d.style.left = `${pos}%`;
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Population                                                                 */
/* -------------------------------------------------------------------------- */

async function loadPopulation(plane, hudBr) {
  try {
    const data = await api.population(1400);
    const points = populationPoints(data.points || []);
    plane.setPopulation(points);
    mount(hudBr, [el('b', String(data.summary?.total ?? points.length)), ' plotted']);
  } catch {
    mount(hudBr, [el('b', '—'), ' population offline']);
  }
}

/* -------------------------------------------------------------------------- */
/* Share links                                                                */
/* -------------------------------------------------------------------------- */

export function buildShareUrl(code, result) {
  const origin = location.origin;
  if (code) return `${origin}/r/${code}`;
  return `${origin}/r/${result.signature}`;
}

export { loadLastResult };
