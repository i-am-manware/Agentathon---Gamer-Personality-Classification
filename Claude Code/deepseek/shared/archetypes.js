/**
 * SPAWNPOINT — archetype definitions.
 *
 * Six archetypes arranged as three opposing pairs on the Playstyle Plane.
 * Each archetype owns a fixed angle on the unit circle (60° apart), so the
 * six form a regular hexagon. Opposing pairs sit exactly 180° apart:
 *
 *                        ARCHITECT (60°)
 *                                *
 *           STORYTELLER (120°) *     * CONNECTOR (300°)   <- mirrored below X
 *                                *
 *   WANDERER (180°) *            +            * COMPETITOR (0°)
 *                                *
 *                        CURATOR (240°)
 *
 *   Pair "Conquest / Discovery"  : Competitor    (  0°) <-> Wanderer  (180°)
 *   Pair "Build / Belong"        : Architect     ( 60°) <-> Connector (240°)
 *   Pair "Immerse / Chronicle"   : Storyteller   (120°) <-> Curator   (300°)
 *
 * Angles are stored in degrees measured counter-clockwise from east (+X),
 * because that is how a human reads a star chart. The renderer flips Y.
 */

export const ARCHETYPES = [
  {
    key: 'competitor',
    name: 'The Competitor',
    short: 'Competitor',
    angle: 0,
    glyph: '▲',
    color: '#ff4d6d',
    tagline: 'Second place is a rounding error.',
    blurb:
      'You load in to win. Scoreboards are a language you read fluently, and every ' +
      'session is a chance to prove the number goes up. You would rather lose a hard ' +
      'match than win an easy one.',
    loves: ['Ranked ladders', 'Speedrun timers', 'Clutch 1v3s', 'Leaderboard grinds'],
    dreads: ['Tutorial levels', 'Zero-stakes sandboxes', 'Being carried'],
    motto: 'If it is not measured, it did not happen.',
    shadow: 'wanderer',
  },
  {
    key: 'architect',
    name: 'The Architect',
    short: 'Architect',
    angle: 60,
    glyph: '◈',
    color: '#4dd4ff',
    tagline: 'You did not beat the boss. You solved it.',
    blurb:
      'You see games as machinery. Before you fight anything you read the numbers, ' +
      'map the systems, and draft a plan. Half the fun happens in the spreadsheet, ' +
      'not the boss arena.',
    loves: ['Build optimisation', 'Theorycrafting', 'Base building', 'Spreadsheet planning'],
    dreads: ['Random outcomes', 'Button-mashing', 'Wasted stats'],
    motto: 'The plan is the game.',
    shadow: 'curator',
  },
  {
    key: 'storyteller',
    name: 'The Storyteller',
    short: 'Storyteller',
    angle: 120,
    glyph: '❋',
    color: '#c77dff',
    tagline: 'You remember the ending, not the score.',
    blurb:
      'You play for the moment the music swells. You talk to every NPC, read every ' +
      'lore entry, and you have absolutely reloaded a save to get a better ending.',
    loves: ['Lore dives', 'Dialogue trees', 'Photo mode', 'Emotional gut-punches'],
    dreads: ['Skipped cutscenes', 'Blank-slate protagonists', 'Silent protagonists'],
    motto: 'A game is a story you get to stand inside.',
    shadow: 'connector',
  },
  {
    key: 'wanderer',
    name: 'The Wanderer',
    short: 'Wanderer',
    angle: 180,
    glyph: '✦',
    color: '#4ade80',
    tagline: 'What is over that ridge? Okay, what is over *that* ridge?',
    blurb:
      'You are constitutionally incapable of following the main quest while there is ' +
      'an unexplored corner of the map. Discovery is the reward; everything else is ' +
      'a detour.',
    loves: ['Off-map secrets', 'Fog of war', 'New biomes', 'Getting lost on purpose'],
    dreads: ['Invisible walls', 'Corridor levels', 'Locked fast travel'],
    motto: 'The map is the campaign.',
    shadow: 'competitor',
  },
  {
    key: 'curator',
    name: 'The Curator',
    short: 'Curator',
    angle: 240,
    glyph: '❖',
    color: '#fbbf24',
    tagline: '99% complete is 0% complete.',
    blurb:
      'You are building an archive. Every collectible has a home, every achievement ' +
      'has a slot, and a half-finished checklist itches at you until it is clean.',
    loves: ['100% completion', 'Rare drops', 'Trophy hunting', 'Organised inventories'],
    dreads: ['Missable content', 'Point-of-no-return warnings', 'Deleted saves'],
    motto: 'If it exists, it goes in the collection.',
    shadow: 'architect',
  },
  {
    key: 'connector',
    name: 'The Connector',
    short: 'Connector',
    angle: 300,
    glyph: '◉',
    color: '#ff9f45',
    tagline: 'Solo queue is a punishment, not a game mode.',
    blurb:
      'The game is the excuse. You are here for the people — the voice chat, the ' +
      'inside jokes, the four-hour session that was 20% gameplay and 80% talking.',
    loves: ['Co-op chaos', 'Guild nights', 'Party games', 'Carrying friends'],
    dreads: ['Empty lobbies', 'Muted teammates', 'Forced single-player'],
    motto: 'Nobody remembers the score. Everybody remembers the bit.',
    shadow: 'storyteller',
  },
];

/** @type {Record<string, typeof ARCHETYPES[number]>} */
export const ARCHETYPE_BY_KEY = Object.fromEntries(ARCHETYPES.map((a) => [a.key, a]));

export const ARCHETYPE_KEYS = ARCHETYPES.map((a) => a.key);

/** Human-readable name for each of the three opposing pairs. */
export const OPPOSING_PAIRS = [
  { keys: ['competitor', 'wanderer'], label: 'Conquest vs. Discovery', axis: 'X' },
  { keys: ['architect', 'curator'], label: 'Build vs. Collect', axis: 'T' },
  { keys: ['storyteller', 'connector'], label: 'Immerse vs. Belong', axis: 'Z' },
];

/** Named regions of the plane, used for the written insight. */
export const SECTORS = [
  {
    key: 'conqueror',
    from: -30,
    to: 30,
    label: 'The Arena Rim',
    text: 'you sit on the sharpest point of the plane, where play is a contest and the only honest feedback is a scoreboard',
  },
  {
    key: 'engineer',
    from: 30,
    to: 90,
    label: 'The Workshop',
    text: 'you sit in the workshop quarter, where systems are meant to be taken apart and rebuilt better',
  },
  {
    key: 'dreamer',
    from: 90,
    to: 150,
    label: 'The Long Chapter',
    text: 'you sit deep in narrative territory, where the reward for playing is having felt something',
  },
  {
    key: 'pathfinder',
    from: 150,
    to: 210,
    label: 'The Horizon Line',
    text: 'you sit out toward the horizon, where the map runs out before your curiosity does',
  },
  {
    key: 'archivist',
    from: 210,
    to: 270,
    label: 'The Vault',
    text: 'you sit in the vault wing, cataloguing everything the game thought it could hide from you',
  },
  {
    key: 'campfire',
    from: 270,
    to: 330,
    label: 'The Campfire',
    text: 'you sit at the campfire edge, where the game is mostly an excuse to be in a lobby with your people',
  },
];

export const CENTER_SECTOR = {
  key: 'meridian',
  label: 'The Meridian',
  text: 'you sit near the middle of the plane, which makes you unusually hard to pigeonhole — you sample every archetype and commit to none',
};
