import { h, toast, iconSVG, fmtDate } from '../ui.js';
import { sfx } from '../audio.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';

export async function profileView(root) {
  document.title = 'Save Data — SPAWNPOINT';

  if (!state.user) {
    root.append(signinRequired());
    return null;
  }

  const box = h('section', { class: 'module profilemodule' });
  root.append(box);

  try {
    const { runs } = await api.listRuns();
    render(runs);
  } catch (err) {
    box.replaceChildren(
      h('h2', { class: 'module__title' }, 'SAVE DATA'),
      h('p', { class: 'dim' }, err.message || 'could not read the memory card')
    );
    return null;
  }

  function render(runs) {
    const newest = runs[0];
    const second = runs[1];

    box.replaceChildren(
      h('h2', { class: 'module__title' }, `SAVE DATA — ${state.user.username.toUpperCase()}`),
      h('p', { class: 'profilemodule__sub' },
        `memory card · ${runs.length} ${runs.length === 1 ? 'save' : 'saves'} · oldest rolls off at 100`),
      h('div', { class: 'btnrow' },
        h('a', { class: 'btn btn--primary', href: '#/quiz' }, 'RUN DIAGNOSTIC'),
        second
          ? h('a', { class: 'btn', href: `#/diff/${second.id}/${newest.id}` }, 'DIFF LATEST TWO')
          : null)
    );

    if (runs.length === 0) {
      box.append(h('div', { class: 'empty' },
        h('p', { class: 'empty__big' }, 'EMPTY MEMORY CARD'),
        h('p', { class: 'dim' }, 'Nothing saved yet. Run the diagnostic — signed-in players save automatically.')));
      return;
    }

    const slots = runs.map((run, i) => {
      const mini = h(
        'span',
        { class: 'minibars', title: run.affinities.map((pct, j) => `${ARCHETYPES[run.poleRing[j]].name} ${pct}%`).join(' · ') },
        run.affinities.map((pct, j) => h('i', {
          class: 'minibars__bar',
          style: `--c:${ARCHETYPES[run.poleRing[j]].color}; --w:${Math.max(4, pct * 1.6)}px`,
        }))
      );
      const next = runs[i - 1]; // newer than this one
      let formatBtn = h('button', { class: 'btn btn--ghost btn--small btn--danger', type: 'button' }, 'FORMAT');
      formatBtn.addEventListener('click', () => {
        if (formatBtn.dataset.armed !== '1') {
          formatBtn.dataset.armed = '1';
          formatBtn.textContent = 'SURE?';
          sfx.tap();
          setTimeout(() => {
            formatBtn.dataset.armed = '';
            formatBtn.textContent = 'FORMAT';
          }, 2600);
          return;
        }
        formatBtn.disabled = true;
        api.deleteRun(run.id)
          .then(() => {
            toast('slot formatted');
            return api.listRuns();
          })
          .then(({ runs: fresh }) => render(fresh))
          .catch((err) => toast(err.message || 'format failed', { tone: 'error' }));
      });

      return h(
        'article',
        { class: 'slot' },
        h('div', { class: 'slot__no' }, `SLOT ${String(runs.length - i).padStart(2, '0')}`),
        h(
          'div',
          { class: 'slot__main' },
          h('div', { class: 'slot__title', style: `--c:${ARCHETYPES[run.primary].color}` }, run.title),
          h('div', { class: 'slot__meta' },
            h('span', { class: 'slot__date' }, fmtDate(run.createdAt)),
            h('span', { class: 'slot__blend' },
              `${ARCHETYPES[run.primary].name} × ${ARCHETYPES[run.secondary].name}`),
            h('span', { class: 'slot__sector' }, run.sector),
            h('span', { class: 'slot__conv' }, `CONV ${run.convictionPct}%`)),
          mini
        ),
        h('div', { class: 'slot__actions' },
          h('a', { class: 'btn btn--small', href: `#/r/${run.code}` }, 'VIEW'),
          next ? h('a', { class: 'btn btn--small', href: `#/diff/${run.id}/${next.id}` }, 'DIFF NEWER') : null,
          formatBtn)
      );
    });
    box.append(h('div', { class: 'slots' }, slots));
  }

  return null;
}

function signinRequired() {
  return h(
    'section',
    { class: 'module module--error' },
    h('h2', { class: 'module__title' }, 'SIGN-IN REQUIRED'),
    h('p', null, 'The memory card lives behind a sign-in. Guests run the full diagnostic and get full results + share links — they just don\u2019t keep history.'),
    h('div', { class: 'btnrow' },
      h('a', { class: 'btn btn--primary', href: '#/signin' }, 'SIGN IN'),
      h('a', { class: 'btn', href: '#/quiz' }, 'CONTINUE AS GUEST'))
  );
}

export const title = 'Save Data — SPAWNPOINT';
