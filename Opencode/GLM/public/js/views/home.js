import { h, iconSVG, prefersReducedMotion } from '../ui.js';
import { sfx } from '../audio.js';
import { INTRO_BLURB, ARCHETYPES } from '../../../shared/archetypes.js';
import { POLE_RING } from '../../../shared/axes.js';
import { decodeResult } from '../../../shared/codec.js';
import { state, wasBooted, markBooted, getLastRun, getPrevRun } from '../state.js';

const BOOT_LINES = [
  'SPAWNPOINT SYSTEM BOOT v1.0',
  '> memory check .................... 64K OK (it\u2019s plenty)',
  '> cartridge: PERSONALITY DIAGNOSTIC .... LOADED',
  '> coordinate engine ................ ONLINE',
  '> archetypes indexed ............... 6/6',
  '> opposing axes calibrated .......... 3/3',
  '> permission to judge you ........... GRANTED',
  'READY. PRESS START.',
];

export function homeView(root) {
  const instant = wasBooted() || prefersReducedMotion();
  if (instant) markBooted();

  const bootlog = h('div', { class: 'bootlog' + (instant ? ' bootlog--done' : '') },
    BOOT_LINES.map((line, i) => h('div', { class: 'bootlog__line', style: `--i:${i}` }, line))
  );

  const hero = h(
    'section',
    { class: 'hero module' },
    h('div', { class: 'hero__mark', html: iconSVG('brand', { size: 46, color: 'var(--phos)' }) }),
    h('h1', { class: 'hero__title' }, 'SPAWN', h('i', { class: 'hero__slash' }, '//'), 'POINT'),
    h('p', { class: 'hero__sub' }, 'THE GAMER PERSONALITY DIAGNOSTIC'),
    h('p', { class: 'hero__blurb' }, INTRO_BLURB),
    h(
      'div',
      { class: 'menu' },
      h('a', { class: 'menu__item menu__item--primary', href: '#/quiz' },
        h('span', { class: 'menu__key' }, '▶'),
        h('span', { class: 'menu__label' }, 'BEGIN DIAGNOSTIC'),
        h('span', { class: 'menu__note' }, '24 queries · ~3 min · no right answers')),
      h('a', { class: 'menu__item', href: '#/map' },
        h('span', { class: 'menu__key' }, '◈'),
        h('span', { class: 'menu__label' }, 'VIEW THE GREAT MAP'),
        h('span', { class: 'menu__note' }, 'six regions, three axes, one plane')),
      h('a', { class: 'menu__item', href: state.user ? '#/profile' : '#/signin', 'data-auth-link': true },
        h('span', { class: 'menu__key' }, '⛁'),
        h('span', { class: 'menu__label' }, state.user ? 'SAVE DATA — ' + state.user.username.toUpperCase() : 'SIGN IN / SAVE DATA'),
        h('span', { class: 'menu__note' }, state.user ? 'your run history + diffs' : 'optional — history for signed-in players')),
    ),
    h('p', { class: 'hero__guestnote' },
      'Guests are first-class citizens here: full diagnostic, full results, share links. ',
      'An account only adds a memory card — ', h('a', { href: '#/signin' }, 'the details'), '.')
  );

  const last = getLastRun();
  let lastPanel = null;
  if (last && last.code) {
    const decoded = decodeResult(last.code);
    if (decoded) {
      const prev = getPrevRun();
      const prevDecoded = prev && prev.code ? decodeResult(prev.code) : null;
      lastPanel = h(
        'section',
        { class: 'module lastsave' },
        h('h2', { class: 'module__title' }, 'LAST SAVE'),
        h(
          'div',
          { class: 'lastsave__row' },
          h('span', { class: 'lastsave__title', style: `--c:${titleColor(decoded)}` }, decoded.primary.toUpperCase() + ' / ' + decoded.secondary.toUpperCase()),
          h('span', { class: 'lastsave__date' }, new Date(last.ts).toLocaleDateString()),
          h('a', { class: 'btn btn--small', href: `#/r/${last.code}` }, 'VIEW'),
          prevDecoded
            ? h('a', { class: 'btn btn--small', href: `#/diff/${prev.code}/${last.code}` }, 'DIFF VS PREV')
            : null
        )
      );
    }
  }

  const strip = h(
    'section',
    { class: 'module archstrip' },
    h('h2', { class: 'module__title' }, 'THE SIX'),
    h(
      'div',
      { class: 'archstrip__grid' },
      POLE_RING.map((id) =>
        h(
          'a',
          { class: 'archchip', href: '#/map', title: ARCHETYPES[id].about, style: `--c:${ARCHETYPES[id].color}` },
          h('span', { class: 'archchip__icon', html: iconSVG(id, { size: 22 }) }),
          h('span', { class: 'archchip__name' }, ARCHETYPES[id].name),
          h('span', { class: 'archchip__spot' }, ARCHETYPES[id].spot)
        )
      )
    )
  );

  root.append(bootlog, hero, lastPanel, strip);

  if (!instant) {
    const timer = setTimeout(finish, BOOT_LINES.length * 240 + 300);
    function finish() {
      clearTimeout(timer);
      markBooted();
      sfx.reveal();
      bootlog.classList.add('bootlog--done');
      hero.classList.add('hero--in');
      document.removeEventListener('keydown', finish);
      hero.removeEventListener('click', finish);
    }
    document.addEventListener('keydown', finish, { once: false });
    hero.addEventListener('click', finish);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', finish);
    };
  }
  hero.classList.add('hero--in');
  return null;
}

function titleColor(decoded) {
  return decoded ? '#3dfa7e' : '#7fae93';
}

export const title = 'SPAWNPOINT — the gamer personality diagnostic';
