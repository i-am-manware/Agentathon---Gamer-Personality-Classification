/**
 * SPAWNPOINT — the written reading.
 *
 * A deterministic prose generator. It composes from per-archetype fragments
 * rather than a lookup table, so the 6 primary x 6 secondary x 3 intensity
 * bands space produces thousands of distinct readings without any of them
 * reading like a mail-merge.
 *
 * Same answers -> same reading, always. Retakes that differ will differ here too.
 */

import { ARCHETYPE_BY_KEY } from './archetypes.js';

const FRAGMENTS = {
  competitor: {
    noun: 'appetite for stakes',
    adjective: 'competitive',
    essence: 'you need there to be something on the line',
    tell: 'you notice the scoreboard before you notice the scenery',
    gift: 'you apply pressure that other players simply do not have in them, and you do it on demand rather than when you feel like it',
    blindspot: 'you can walk past an entire act of a game because nothing in it was graded',
    minor: 'you quietly rank everyone in the lobby, including your friends, including yourself',
    rec: 'Play one game this month with the score hidden and the difficulty fixed. Notice how much of your enjoyment survives.',
    alt: ['the ladder', 'the timer', 'the rematch'],
  },
  architect: {
    noun: 'need to understand the machine',
    adjective: 'systematic',
    essence: 'you refuse to press buttons you do not understand',
    tell: 'you read the ability descriptions before the tutorial tells you to',
    gift: 'you find the load-bearing detail in a system that everyone else treated as flavour text',
    blindspot: 'you can spend an evening optimising a decision that a coin flip would have resolved',
    minor: 'you have explained a build to somebody who did not ask',
    rec: 'Start one run with no wiki, no guide and no notes. Let the first plan be a bad one.',
    alt: ['the spreadsheet', 'the build guide', 'the patch notes'],
  },
  storyteller: {
    noun: 'need for the world to mean something',
    adjective: 'narrative-driven',
    essence: 'you are here to be moved, not to be measured',
    tell: 'you remember what a place felt like long after you forget what it dropped',
    gift: 'you extract meaning from games that other players sprint straight through',
    blindspot: 'you will defend a beautiful game that is genuinely not fun to play',
    minor: 'you have an opinion about a character who appeared in exactly two scenes',
    rec: 'Play something with no story at all for one evening. Let the mechanics carry the weight.',
    alt: ['the ending', 'the soundtrack', 'the second playthrough'],
  },
  wanderer: {
    noun: 'need to see what is over the next hill',
    adjective: 'restless',
    essence: 'the unexplored thing is always louder than the urgent thing',
    tell: 'you have arrived at a story mission with forty hours on the clock',
    gift: 'you find the seams and secrets a game hid from the people who followed the arrow',
    blindspot: 'you leave more games unfinished than you finish',
    minor: 'you have never once taken the recommended route',
    rec: 'Finish one thing. Pick the game you have abandoned most often and see its credits roll.',
    alt: ['the fog of war', 'the off-map path', 'the wrong turn'],
  },
  curator: {
    noun: 'need for the set to be complete',
    adjective: 'completist',
    essence: 'an unfinished checklist is a physical sensation',
    tell: 'you check the collectibles tab before you check the quest log',
    gift: 'you see the whole shape of a game, including the parts it wanted you to skip',
    blindspot: 'you have completed things you did not enjoy, purely to be finished with them',
    minor: 'you have reloaded a save to undo a missable',
    rec: 'Leave one game deliberately at 60%. Sit with it for a week and see if it actually bothers you.',
    alt: ['the collection', 'the trophy list', 'the hundred percent'],
  },
  connector: {
    noun: 'need for the lobby to be full',
    adjective: 'communal',
    essence: 'the game is a place to be together',
    tell: 'you boot the game and immediately check who is online',
    gift: 'you turn a mediocre game into a good night, which is a rarer skill than being good',
    blindspot: 'you will play something you find boring for eight hours because it is what the group is playing',
    minor: 'you have carried somebody through a fight they had no business surviving',
    rec: 'Play one short game alone, with voice off, and let it be entirely yours.',
    alt: ['the party', 'the group chat', 'the co-op run'],
  },
};

const INTENSITY_BANDS = [
  {
    max: 0.3,
    label: 'Broad',
    line: 'You are spread across the plane rather than parked in one corner of it',
    note: 'This is not indecision. It is range.',
  },
  {
    max: 0.55,
    label: 'Readable',
    line: 'You have a clear lean with significant secondary territory',
    note: 'Most interesting players land here — enough focus to have a style, enough spread to change it.',
  },
  {
    max: 0.75,
    label: 'Defined',
    line: 'You commit. Your playstyle has a strong centre of gravity',
    note: 'People who play with you regularly can predict what you will want to do next.',
  },
  {
    max: 1.01,
    label: 'Extreme',
    line: 'You are deep in one territory of the plane',
    note: 'There is not much of you elsewhere — which is a superpower with a cost attached.',
  },
];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function buildInsight(s) {
  const p = ARCHETYPE_BY_KEY[s.primary];
  const sec = ARCHETYPE_BY_KEY[s.secondary];
  const least = ARCHETYPE_BY_KEY[s.least];
  const fp = FRAGMENTS[s.primary];
  const fs = FRAGMENTS[s.secondary];
  const fl = FRAGMENTS[s.least];

  const seed = hash(`${s.primary}|${s.secondary}|${s.heading}|${Math.round(s.radius * 100)}`);
  const band = INTENSITY_BANDS.find((b) => s.radius < b.max) ?? INTENSITY_BANDS[INTENSITY_BANDS.length - 1];

  // Title: a pure type, or an honest hybrid when the top two are close.
  const hybrid = s.margin < 9;
  const title = hybrid ? `The ${p.short}–${sec.short} Hybrid` : p.name;

  const pts = (v) => `${Math.round(v)}`;
  const affinity = (k) => s.affinities?.[k] ?? 50;

  const paragraphs = [
    `Across ${s.answeredCount} questions your answers settled at ${s.x.toFixed(2)}, ${s.y.toFixed(2)} — ` +
      `${band.label.toLowerCase()} territory, roughly ${Math.round(s.radius * 100)}% of the way out from the centre of the ` +
      `Playstyle Plane, in the direction of ${p.name.toLowerCase()}. ${p.tagline}`,

    `Underneath the label, the model reads your strongest signal as ${p.short.toLowerCase()} at ${pts(affinity(s.primary))}` +
      ` against a baseline of 50, followed by ${sec.short.toLowerCase()} at ${pts(affinity(s.secondary))}` +
      (hybrid
        ? ` — close enough that you should treat this as a blend rather than a verdict.`
        : ` — a gap of ${pts(s.margin)} points, which is a real one.`) +
      ` Your thinnest thread is ${least.short.toLowerCase()} at ${pts(affinity(s.least))}, and that is usually where the ` +
      `interesting tension lives.`,
  ];

  const reads = [
    {
      label: 'The tell',
      text: `${fp.tell.charAt(0).toUpperCase()}${fp.tell.slice(1)}. In practice that means ${fp.essence} — and when it is missing you feel it immediately, even if you cannot name what is wrong.`,
    },
    {
      label: 'The second voice',
      text: `Your ${sec.short.toLowerCase()} streak is not a footnote: ${fs.minor}. It shows up most often around ${pick(fs.alt, seed)}, which is where your answers kept drifting back to.`,
    },
    {
      label: 'The edge',
      text: `${fp.gift.charAt(0).toUpperCase()}${fp.gift.slice(1)}. The cost is on the other side: ${fp.blindspot}.`,
    },
  ];

  const tension =
    `Your tension sits against ${ARCHETYPE_BY_KEY[s.tension]?.name ?? fl.noun}. ` +
    `${ARCHETYPE_BY_KEY[s.tension]?.name ?? ''} players are not wrong, they are just solving a different problem — ` +
    `and the parts of a game you find pointless are, to them, the entire point.`;

  const versatilityLine =
    s.versatility > 0.9
      ? 'Your answers were unusually even across all six archetypes, which is rare and reads as genuine range.'
      : s.versatility > 0.72
        ? 'You spread your excess across several archetypes, with a couple doing the heavy lifting.'
        : 'Your answers concentrated hard on a narrow band of archetypes, which is what drove you so far from the centre.';

  const recommendation = `${fp.rec} ${versatilityLine}`;

  return {
    title,
    band: band.label,
    kicker: `${band.note}`,
    paragraphs,
    reads,
    tension,
    recommendation,
    summary: `${band.label} ${p.short.toLowerCase()}${hybrid ? `–${sec.short.toLowerCase()}` : ''} · ${s.sector.label}`,
  };
}
