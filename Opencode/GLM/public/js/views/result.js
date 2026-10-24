import { h, toast, iconSVG, fmtDate, prefersReducedMotion } from '../ui.js';
import { sfx } from '../audio.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';
import { POLE_RING } from '../../../shared/axes.js';
import { decodeResult } from '../../../shared/codec.js';
import { buildInsight } from '../../../shared/insights.js';
import { QUESTIONS, QUIZ_VERSION } from '../../../shared/questions.js';
import { hexplane } from '../components/hexplane.js';
import { affinityBars, axisLeanBars } from '../components/bars.js';
import { exportShareCard, nativeShareCard } from '../components/sharecard.js';
import { state, getPrevRun, setPendingClaim } from '../state.js';
import { api } from '../api.js';

export function resultView(root, params) {
  const score = decodeResult(params.code);
  if (!score) {
    root.append(corruptModule());
    return null;
  }

  const insight = buildInsight(score);
  document.title = `${insight.title} — SPAWNPOINT`;

  const primary = ARCHETYPES[score.primary];
  const secondary = ARCHETYPES[score.secondary];
  const affById = Object.fromEntries(score.affinities.map((r) => [r.id, r]));
  const prev = getPrevRun();
  const ghostScore = prev && prev.code && prev.code !== params.code ? decodeResult(prev.code) : null;

  const plane = hexplane({
    score,
    ghost: ghostScore,
    ghostLabel: 'PREV RUN',
    onPick(pole) {
      sfx.tap();
      const details = document.getElementById(`readout-${pole}`);
      if (details) {
        details.open = true;
        details.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    },
  });

  const actions = h('section', { class: 'module actionsmodule' }, h('h2', { class: 'module__title' }, 'SHARE + SAVE'));
  const btnRow = h('div', { class: 'btnrow' });

  const pngBtn = h('button', { class: 'btn btn--primary', type: 'button', onclick: onPng }, 'SAVE PNG');
  const cardBtn = h('a', { class: 'btn', href: `#/card/${params.code}` }, 'VIEW SHARE CARD');
  const linkBtn = h('button', { class: 'btn', type: 'button', onclick: onCopy }, 'COPY LINK');
  const shareBtn = navigator.share
    ? h('button', { class: 'btn', type: 'button', onclick: onNativeShare }, 'SHARE…')
    : null;
  const rerunBtn = h('a', { class: 'btn', href: '#/quiz' }, 'RE-RUN');
  let saveBtn = null;

  const last = JSON.parse(localStorage.getItem('sp_lastRun') || 'null');
  const canSave = last && Array.isArray(last.answers) && last.answers.length === QUESTIONS.length;

  if (state.user) {
    saveBtn = h(
      'button',
      { class: 'btn btn--save', type: 'button', disabled: !canSave, title: canSave ? 'save this run to your memory card' : 're-run the diagnostic while signed in to save', onclick: onSave },
      canSave ? 'SAVE TO MEMORY CARD' : 'NO ANSWERS TO SAVE'
    );
  } else {
    saveBtn = h(
      'button',
      { class: 'btn btn--save', type: 'button', disabled: !canSave, title: canSave ? 'sign in and this run is claimed' : 're-run the diagnostic to claim it', onclick: onClaim },
      canSave ? 'CLAIM THIS RUN' : 'RE-RUN TO CLAIM'
    );
  }

  btnRow.append(pngBtn, cardBtn, linkBtn, ...(shareBtn ? [shareBtn] : []), rerunBtn, saveBtn);
  actions.append(
    btnRow,
    h('p', { class: 'actionsmodule__note' },
      'The PNG is a 1200×630 postcard of your spawn. The link re-creates this exact screen for anyone — no account, no database.')
  );

  async function onPng() {
    pngBtn.disabled = true;
    try {
      const blob = await exportShareCard({ score, insight });
      toast(blob ? 'PNG saved — go post it' : 'could not export PNG in this browser', { tone: blob ? 'ok' : 'error' });
    } finally {
      pngBtn.disabled = false;
    }
  }

  async function onCopy() {
    const url = `${location.origin}${location.pathname}#/r/${params.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('share link copied — send it to the squad');
    } catch {
      toast(url, { duration: 6500 });
    }
  }

  async function onNativeShare() {
    const ok = await nativeShareCard({ score, insight });
    if (!ok) onCopy();
  }

  async function onSave() {
    saveBtn.disabled = true;
    try {
      await api.saveRun(last.answers, QUIZ_VERSION);
      toast('run saved to your memory card');
      saveBtn.textContent = 'SAVED ✓';
    } catch (err) {
      toast(err.message || 'could not save the run', { tone: 'error' });
      saveBtn.disabled = false;
    }
  }

  function onClaim() {
    setPendingClaim({ answers: last.answers, version: QUIZ_VERSION, returnTo: `#/r/${params.code}` });
    location.hash = '#/signin';
  }

  const readout = h(
    'section',
    { class: 'module readoutmodule' },
    h('h2', { class: 'module__title' }, 'FULL READOUT — ALL SIX'),
    POLE_RING.map((pole) => {
      const arch = ARCHETYPES[pole];
      const pct = affById[pole]?.pct ?? 0;
      return h(
        'details',
        { class: 'readout', id: `readout-${pole}`, style: `--c:${arch.color}` },
        h(
          'summary',
          { class: 'readout__summary' },
          h('span', { class: 'readout__icon', html: iconSVG(pole, { size: 18 }) }),
          h('span', { class: 'readout__name' }, arch.name),
          h('span', { class: 'readout__pct' }, `${pct}%`),
          h('span', { class: 'readout__spot' }, arch.spot),
          h('span', { class: 'readout__chevron', 'aria-hidden': 'true' }, '▾')
        ),
        h(
          'div',
          { class: 'readout__body' },
          h('p', null, arch.about),
          h('div', { class: 'tri' },
            h('div', { class: 'tri__col' },
              h('h4', { class: 'tri__title tri__title--ok' }, 'PARTY BUFFS'),
              h('ul', { class: 'list' }, arch.strengths.map((s) => h('li', null, s)))),
            h('div', { class: 'tri__col' },
              h('h4', { class: 'tri__title tri__title--warn' }, 'SIDE EFFECTS'),
              h('ul', { class: 'list' }, arch.fatigue.map((s) => h('li', null, s)))),
            h('div', { class: 'tri__col' },
              h('h4', { class: 'tri__title tri__title--dim' }, 'SPAWN NEARBY'),
              h('ul', { class: 'list' }, arch.kin.map((s) => h('li', null, s))))
          )
        )
      );
    })
  );

  root.append(
    h(
      'header',
      { class: 'result-head' },
      h('p', { class: 'result-meta' },
        `DIAGNOSTIC COMPLETE · ${new Date().toLocaleDateString()} · v${score.version}`,
        h(
          'button',
          {
            class: 'codechip', type: 'button', title: 'share code — click to copy the link',
            onclick: onCopy,
          },
          `CODE: ${params.code.slice(0, 10)}…`
        )),
      h('h1', { class: 'result-title', style: `--c:${primary.color}` }, insight.title),
      h('p', { class: 'result-epithet', style: `--c:${primary.color}` },
        `${primary.epithet} · ${primary.name} × ${secondary.name}`),
      h('p', { class: 'result-tagline' }, insight.tagline),
      h(
        'div',
        { class: 'chips' },
        chip('CONVICTION', `${score.conviction.pct}% ${score.conviction.tier}`),
        chip('TERRITORY', score.territory.label),
        chip('SECTOR', score.sector),
        chip('TOP BLEND', `${primary.name} ${affById[score.primary].pct}% × ${secondary.name} ${affById[score.secondary].pct}%`)
      )
    ),
    h(
      'div',
      { class: 'result-grid' },
      h(
        'section',
        { class: 'module planemodule' },
        h('h2', { class: 'module__title' }, 'THE GREAT MAP — YOUR SPAWN',
          ghostScore ? h('span', { class: 'module__title-note' }, ' · ghost = your previous run') : null),
        plane.el,
        ghostScore
          ? h('a', { class: 'ghostlink', href: `#/diff/${prev.code}/${params.code}` }, 'DIFF THIS RUN VS PREVIOUS →')
          : null,
        h('div', { class: 'planemodule__lean' },
          h('h3', { class: 'subtle-title' }, 'AXIS LEAN'),
          axisLeanBars(score))
      ),
      h(
        'div',
        { class: 'result-col' },
        h('section', { class: 'module mixmodule' },
          h('h2', { class: 'module__title' }, 'ARCHETYPE MIX — RANKED'),
          affinityBars(score),
          h('p', { class: 'mixmodule__note' }, 'Evidence-smoothed share of your play-energy. Sums to 100%.')),
        actions
      )
    ),
    h(
      'section',
      { class: 'module insightmodule' },
      h('h2', { class: 'module__title' }, 'WRITTEN INSIGHT'),
      insight.paragraphs.map((p) => h('p', { class: 'insight-p' }, p)),
      h('div', { class: 'tri' },
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--ok' }, 'PARTY BUFFS'),
          h('ul', { class: 'list' }, insight.strengths.map((s) => h('li', null, s)))),
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--warn' }, 'SIDE EFFECTS'),
          h('ul', { class: 'list' }, insight.fatigue.map((s) => h('li', null, s)))),
        h('div', { class: 'tri__col' },
          h('h4', { class: 'tri__title tri__title--dim' }, 'SPAWN NEARBY'),
          h('ul', { class: 'list' }, insight.kin.map((s) => h('li', null, s))))
      )
    ),
    readout
  );

  sfx.reveal();
  return null;
}

function chip(label, value) {
  return h('span', { class: 'chip' }, h('b', null, label), h('span', null, value));
}

function corruptModule() {
  return h(
    'section',
    { class: 'module module--error' },
    h('h2', { class: 'module__title' }, 'CORRUPT SAVE CODE'),
    h('p', null, 'That share code didn\u2019t survive the trip. It may have been truncated by a chat app with opinions.'),
    h('p', null, h('a', { class: 'btn', href: '#/quiz' }, 'RUN YOUR OWN DIAGNOSTIC'))
  );
}

export const title = 'Results — SPAWNPOINT';
