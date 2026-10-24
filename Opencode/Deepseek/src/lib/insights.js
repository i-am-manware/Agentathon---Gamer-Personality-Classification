import { archetype } from '../../shared/quiz.data.js';

export const ARCH_COPY = {
  duelist: {
    intro:
      'You play like the scoreboard is watching. Competition is not a mode you select from a menu - it is the lens every game gets filtered through. A lobby is not a lobby until somebody can lose it.',
    strengths: [
      'Reads opponents like cheap paperbacks',
      'Turns pressure into fuel',
      'Sets a pace the rest of the lobby has to match'
    ],
    kryptonite: 'Downtime. If nothing is at stake, the game feels switched off.',
    signature: 'The clutch play that makes the whole room go quiet.',
    partyRole: 'The tip of the spear',
    genres: ['Ranked shooters', 'Fighting games', 'MOBAs', 'Souls-likes']
  },
  architect: {
    intro:
      'You do not just play worlds - you renovate them. Given an empty patch of land and a decent toolkit, you will produce something people screenshot. Your games are less about finishing and more about what you leave standing when you log off.',
    strengths: [
      'Turns blank space into landmarks',
      'Thinks in systems and silhouettes',
      'Patience for the long project others abandon'
    ],
    kryptonite: 'A game that will not let you touch anything. No building, no modding, no say.',
    signature: 'The build that makes strangers stop and ask how you did it.',
    partyRole: 'The one who leaves a home behind for the squad',
    genres: ['Sandbox builders', 'Survival crafters', 'Modding scenes', 'City sims']
  },
  curator: {
    intro:
      'Completion is your love language. You do not finish games - you close them out, every side quest stamped, every shelf dusted, every counter at 100%. The list is not a chore; the list is the game.',
    strengths: [
      'A memory for items that borders on folklore',
      'Endless stamina for the long grind',
      'Notices the collectible everyone else walks past'
    ],
    kryptonite: 'Missable content. Nothing stings like a locked door you can never reopen.',
    signature: 'The 100% save file with a platinum trophy and a tidy spreadsheet.',
    partyRole: 'The living encyclopedia of everything the squad missed',
    genres: ['Open-world completionists', 'Collect-a-thons', 'Achievement hunting', 'Gacha inventory games']
  },
  pathfinder: {
    intro:
      'You are allergic to the main path. Every wall is a suggestion, every horizon is a promise, and every question mark on the map is a personal invitation. You play to be somewhere no one has stood before.',
    strengths: [
      'Finds the secret the developers hid for one player in a thousand',
      'Curiosity that survives the hundredth loading screen',
      'Reads a world like other people read novels'
    ],
    kryptonite: 'Invisible walls. Tell you no and you will test it twice.',
    signature: 'The impossible view from a place the map says does not exist.',
    partyRole: 'The scout with the map already in their head',
    genres: ['Open-world exploration', 'Metroidvanias', 'Walking sims', 'Survival discovery']
  },
  tactician: {
    intro:
      'You do not play games; you reverse-engineer them. Somewhere behind the fun you can hear the machinery ticking, and you want to know exactly how it works. Then you want to know how to make it sing.',
    strengths: [
      'Spots the optimal route before the tutorial ends',
      'Comfortable in spreadsheets, wikis and frame data',
      'Turns chaos into a solvable problem'
    ],
    kryptonite: 'RNG that ignores good decisions. You can forgive a loss, never a coin flip.',
    signature: 'The build nobody saw coming because nobody else did the math.',
    partyRole: 'The brain the raid wipes without',
    genres: ['Strategy and tactics', 'Auto-battlers', 'Deckbuilders', 'RPG number games']
  },
  bard: {
    intro:
      'For you, games are people. The lobby, the voice chat, the inside joke from three years ago - that is the actual endgame. You are the reason the group stays together long after the content runs dry.',
    strengths: [
      'Turns strangers into a squad by hour two',
      'Keeps morale alive through the worst wipes',
      'The memory that holds the group lore'
    ],
    kryptonite: 'Empty servers. A great game alone is just a screensaver.',
    signature: 'The 3 a.m. voice call where nobody wants to log off.',
    partyRole: 'The heart that keeps the party coming back',
    genres: ['Co-op shooters', 'MMOs', 'Party games', 'Sandbox with friends']
  }
};

export const SOLO_TITLES = {
  duelist: 'The Apex Predator',
  architect: 'The Worldwright',
  curator: 'The Grand Completionist',
  pathfinder: 'The Uncharted',
  tactician: 'The Grandmaster',
  bard: 'The Heart of the Party'
};

export const PAIR_TITLES = {
  'duelist+architect': 'The Arena Architect',
  'duelist+pathfinder': 'The Vanguard Scout',
  'duelist+curator': 'The Trophy Hunter',
  'duelist+tactician': 'The Cold-Blooded Closer',
  'duelist+bard': 'The Crowd-Pleaser',
  'architect+duelist': 'The Siege Engineer',
  'architect+pathfinder': 'The Frontier Homesteader',
  'architect+curator': 'The Master Builder',
  'architect+tactician': 'The Machine Whisperer',
  'architect+bard': 'The Guild Hall Host',
  'pathfinder+duelist': 'The Risk Tourist',
  'pathfinder+architect': 'The Wildlands Cartographer',
  'pathfinder+curator': 'The Relic Sleuth',
  'pathfinder+tactician': 'The Deep-Field Analyst',
  'pathfinder+bard': 'The Campfire Storyteller',
  'curator+duelist': 'The Leaderboard Archivist',
  'curator+architect': 'The Museum Keeper',
  'curator+pathfinder': 'The World Compiler',
  'curator+tactician': 'The Checklist Assassin',
  'curator+bard': 'The Trade Baron',
  'tactician+duelist': 'The Duel Calculator',
  'tactician+architect': 'The Systems Artisan',
  'tactician+pathfinder': 'The Frontier Analyst',
  'tactician+curator': 'The Perfect Run Planner',
  'tactician+bard': 'The Raid Caller',
  'bard+duelist': 'The Hype Machine',
  'bard+architect': 'The Tavern Keeper',
  'bard+pathfinder': 'The Road Trip Legend',
  'bard+curator': 'The Community Historian',
  'bard+tactician': 'The Game Night Director'
};

const TENSION_LINES = {
  'duelist+': 'When the crossroads appears, you take the one with a scoreboard on it - the arena calls louder than the sandbox.',
  'architect+': 'When the crossroads appears, you take the one with a workbench on it - you would rather build something permanent than win something temporary.',
  'curator+': 'When the crossroads appears, you take the one that finishes the set - completion is the destination, not the achievement.',
  'pathfinder+': 'When the crossroads appears, you take the one that leaves the map - there is always one more hill.',
  'tactician+': 'When the crossroads appears, you take the one with the best expected value - feelings are just data you have not plotted yet.',
  'bard+': 'When the crossroads appears, you take the one your friends are on - the game is people, the rest is scenery.'
};

const NEUTRAL_TENSION_LINE =
  'No single tension dominates your chart - you move between arena, workshop and frontier like you have keys to all of them.';

const CLARITY_LINES = [
  { min: 72, text: 'Signal clarity is high. Your answers pull hard in one direction, and subtlety was never the plan.' },
  { min: 46, text: 'A clear signal with healthy static. You are decisive without being a cartoon about it.' },
  { min: 0, text: 'Your signal is diffuse, and that is not confusion - it is range. You answer to the game in front of you, not a label.' }
];

const BALANCE_LINE =
  'And you land close to the center of the chart, which is its own rare build: a bit of every archetype, able to read any lobby and match its energy. Squads quietly depend on players like you.';

export function buildInsight(result) {
  const d = archetype(result.dominant);
  const s = archetype(result.secondary);
  const w = archetype(result.weakest);
  const dCopy = ARCH_COPY[result.dominant];
  const sCopy = ARCH_COPY[result.secondary];
  const solo = result.gap >= 16;
  const title = solo ? SOLO_TITLES[result.dominant] : PAIR_TITLES[`${result.dominant}+${result.secondary}`];
  const pair = [...result.tensions].sort((a, b) => Math.abs(b.net) - Math.abs(a.net))[0];
  const lean = pair.net >= 0 ? pair.pos : pair.neg;
  const leanLine = Math.abs(pair.net) < 10
    ? NEUTRAL_TENSION_LINE
    : TENSION_LINES[`${lean}+`] ?? NEUTRAL_TENSION_LINE;
  const clarity = CLARITY_LINES.find((c) => result.confidence >= c.min) ?? CLARITY_LINES[CLARITY_LINES.length - 1];

  const paragraphs = [
    `${dCopy.intro}`,
    solo
      ? `Underneath that primary drive there is a clear ${s.name.toLowerCase()} current running, and it shows: ${lower(sCopy.intro.split('. ')[0])}.`
      : `Your chart pairs two strong currents - ${d.name} first, with ${s.name} close behind. That combination is rarer than either alone: ${lower(sCopy.intro.split('. ')[0])}.`,
    `${leanLine} ${clarity.text}`,
    ...(result.coord.r < 0.24 ? [BALANCE_LINE] : []),
    `Your kryptonite is easy to name: ${lower(dCopy.kryptonite)} Nobody in your squad is surprised by that. Your party role is simple - ${lower(dCopy.partyRole)}.`
  ];

  return {
    title,
    subtitle: `${d.name} PRIMARY // ${s.name} SECONDARY`,
    eyebrow: `${result.tier.name} // SIGNAL CLARITY ${result.confidence}%`,
    paragraphs,
    strengths: dCopy.strengths.slice(0, 3),
    kryptonite: dCopy.kryptonite,
    signature: dCopy.signature,
    partyRole: dCopy.partyRole,
    genres: unique([...dCopy.genres, ...sCopy.genres]).slice(0, 6),
    weakest: { key: w.key, name: w.name, blurb: ARCH_COPY[w.key].kryptonite },
    dominantName: d.name,
    secondaryName: s.name,
    lean: { toward: lean, pair: pair.label }
  };
}

function lower(str) {
  if (!str) return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function unique(list) {
  return [...new Set(list)];
}
