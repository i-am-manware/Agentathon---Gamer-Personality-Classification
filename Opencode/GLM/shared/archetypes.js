// SPAWNPOINT — the six archetypes of the Great Map, plus the copy system that
// assembles result readings. Pure data, isomorphic (Node + browser).

export const AXIS_LABELS = {
  valor: 'CONQUEROR ⟷ WAYFARER',
  order: 'ARCHITECT ⟷ GREMLIN',
  campfire: 'HYPEMAN ⟷ LOREKEEPER',
};

export const ARCHETYPES = {
  conqueror: {
    id: 'conqueror',
    name: 'CONQUEROR',
    epithet: 'THE LADDER IS HOME',
    color: '#ff5d5d',
    spot: 'Wins. On purpose.',
    vibe: 'Scoreboards are receipts and you keep every one.',
    about:
      "You don't play games — you settle them. A lobby is a courtroom, the scoreboard is the verdict, and 'gg' is a verdict you intend to win. Every loss is data for the next run, every win is a receipt, and the phrase 'it's just for fun' has never once made sense to you.",
    strengths: [
      'Carries teams through pure, uncut willpower',
      'Turns losses into patch notes for the soul',
      'Never tilts (externally)',
    ],
    fatigue: [
      'Physically cannot understand people who queue ranked "to relax"',
      'Treats casual lobbies like tournament finals',
    ],
    kin: [
      'The grinder with a personal spreadsheet of their own winrate',
      'The friend who says "we can still win this" at 1–4',
    ],
  },

  wayfarer: {
    id: 'wayfarer',
    name: 'WAYFARER',
    epithet: 'THE HORIZON OWES YOU NOTHING',
    color: '#35e0c0',
    spot: 'Goes. Just goes.',
    vibe: 'The map border is a suggestion and you have proof.',
    about:
      "The minimap is a to-do list written by someone who does not get you. You're the one at the edge of the world, screenshotting a sunset made of polygons. Fast travel? That's just skipping the game. There is always one more ridge, and you have never once wondered whether you should see what's behind it.",
    strengths: [
      'Finds everything the fast-travel menu skips',
      'Zero FOMO — you were never following the objective anyway',
      'Screenshots folder reads like a travel magazine',
    ],
    fatigue: [
      'Gets visibly, genuinely sad when the map hits 100%',
      'Has definitely fallen off the playable world "for science"',
    ],
    kin: [
      'The "look where you can get to" clip account',
      'The friend who pings a viewpoint mid-firefight',
    ],
  },

  architect: {
    id: 'architect',
    name: 'ARCHITECT',
    epithet: 'THE PLAN SURVIVES FIRST CONTACT',
    color: '#7ad0ff',
    spot: 'Plans. Then wins.',
    vibe: 'Keybinds are ergonomics and rotations are calendars.',
    about:
      "You don't check the meta — you commute with it. Keybinds are ergonomics, rotations are calendars, and 'improvisation' is a word people use when they didn't bring a plan. You brought a plan. It has tabs. When the squad is screaming, you are somehow the calmest person in the call, and also the reason everyone survives.",
    strengths: [
      'Turns squad chaos into tidy build orders',
      'Knows the patch notes better than the devs who wrote them',
      'Solo-queues like it\u2019s a project deliverable',
    ],
    fatigue: [
      'Feels physical pain at the phrase "we\u2019ll figure it out as we go"',
      'Has a plan for the pizza break',
    ],
    kin: [
      'The raid leader with a laminated flowchart',
      'The friend who says "hold on, doing the math" mid-fight',
    ],
  },

  gremlin: {
    id: 'gremlin',
    name: 'GREMLIN',
    epithet: "THE PHYSICS ENGINE'S PROBLEM CHILD",
    color: '#ff6ad5',
    spot: 'Breaks it. Films it.',
    vibe: 'Rules are suggestions with poor enforcement.',
    about:
      "You play games the way prosecutors play cases: looking for the loophole, the clip, the catastrophe. If a chair can be launched, it must be launched. If a wall can be clipped, it will be, on stream, by accident, in the middle of a ranked match. The devs know your name. Not in a good way.",
    strengths: [
      'Finds three exploits before breakfast',
      'Turns any engine into a comedy engine',
      'Priceless clutch moments (unauthorized)',
    ],
    fatigue: [
      'Has been asked to "please stop crouch-spamming the NPC dialogue"',
      'Banned from the family Minecraft server (twice)',
    ],
    kin: [
      'The clip that ends the group chat',
      'The friend whose screen is always doing something illegal',
    ],
  },

  lorekeeper: {
    id: 'lorekeeper',
    name: 'LOREKEEPER',
    epithet: 'THE CODEX WAS LOAD-BEARING',
    color: '#a78bff',
    spot: 'Reads. Everything.',
    vibe: 'The world is a manuscript and you do the reading.',
    about:
      "You read the item descriptions. All of them. The world isn't a level — it's a manuscript, and apparently you're the only one doing the reading. An NPC's death hits harder than any boss phase, and you have strong opinions about the timeline that nobody asked for (correctly).",
    strengths: [
      'Connects plot dots across three DLCs and a patch note',
      'Emotional damage: maximum (intended)',
      'Explains the timeline unprompted (blessed)',
    ],
    fatigue: [
      'A "skippable cutscene" has never once been skipped',
      'Will not "just shoot the guy" — the guy has a backstory',
    ],
    kin: [
      'The "it was foreshadowing!" screenshot account',
      'The friend who cried at a loading-screen lore dump',
    ],
  },

  hypeman: {
    id: 'hypeman',
    name: 'HYPEMAN',
    epithet: 'MAIN QUEST: THE SQUAD',
    color: '#ffb347',
    spot: 'Rallies. Wins?',
    vibe: 'The game is a venue; the people are the event.',
    about:
      "You don't check the ladder — you check who's online. Win or lose, the post-game lobby is the actual game, and you're its commissioner. You can build a party out of five strangers and a typo, and somehow, by the end of the night, they all have nicknames.",
    strengths: [
      'Builds parties out of strangers',
      'Aura buff: +200% squad morale (stacking)',
      "Turns 'one more game' into a shared religion",
    ],
    fatigue: [
      'Owns 400 hours of games and zero finished storylines',
      'Lonely in single-player. Visibly.',
    ],
    kin: [
      'The Discord dad with twelve active channels',
      'The friend who organizes the "quick 20-minute" raid (4 hours)',
    ],
  },
};

// Combo titles: primary × secondary — the headline of the results screen.
export const TITLES = {
  conqueror_wayfarer: 'The Horizon Duelist',
  conqueror_architect: 'The Meta Warlord',
  conqueror_gremlin: 'The Unsanctioned Champion',
  conqueror_lorekeeper: 'The Saga Chaser',
  conqueror_hypeman: 'The Shotcaller',

  wayfarer_conqueror: 'The Frontier Racer',
  wayfarer_architect: 'The Cartographer Prime',
  wayfarer_gremlin: 'The Off-Map Menace',
  wayfarer_lorekeeper: 'The Wandering Archivist',
  wayfarer_hypeman: 'The Caravan Leader',

  architect_conqueror: 'The Build-Order Warlord',
  architect_wayfarer: 'The Route Planner',
  architect_gremlin: 'The Non-Euclidean Engineer',
  architect_lorekeeper: 'The Codex Compiler',
  architect_hypeman: 'The Raid Scheduler',

  gremlin_conqueror: 'The Banned-Technique Legend',
  gremlin_wayfarer: 'The Void Tourist',
  gremlin_architect: 'The Glitched Blueprint',
  gremlin_lorekeeper: 'The Unreliable Narrator',
  gremlin_hypeman: 'The Party Detonator',

  lorekeeper_conqueror: 'The Feat Chronicler',
  lorekeeper_wayfarer: 'The World Reader',
  lorekeeper_architect: 'The Lore Analyst',
  lorekeeper_gremlin: 'The Codex Vandal',
  lorekeeper_hypeman: 'The Campfire Bard',

  hypeman_conqueror: 'The Lobby Legend',
  hypeman_wayfarer: 'The Party Pathfinder',
  hypeman_architect: 'The Draft Night Host',
  hypeman_gremlin: 'The Crowd Surfer',
  hypeman_lorekeeper: 'The Encore Giver',
};

// One line per (primary × secondary) describing the blend.
export const BLEND_LINES = {
  conqueror_wayfarer: 'You chase wins — but the horizon keeps calling timeouts.',
  conqueror_architect: "You don't just win. You win on schedule, with receipts.",
  conqueror_gremlin: 'Victory by any means — especially the means the devs patched out.',
  conqueror_lorekeeper: 'Every win is a chapter. You are building a saga of receipts.',
  conqueror_hypeman: 'You carry — and you make the whole lobby feel carried.',

  wayfarer_conqueror: 'You wander, but you race while doing it. First to the horizon, every time.',
  wayfarer_architect: 'Your wanderings have spreadsheets. Routes, rest stops, snack windows.',
  wayfarer_gremlin: 'You explore the map the way trespassers explore buildings.',
  wayfarer_lorekeeper: 'Every vista is a manuscript. You stop and read the sunset.',
  wayfarer_hypeman: 'You lead the whole squad to the edge of the map. They complain. They come.',

  architect_conqueror: 'Your plans end in victory screens. The ladder was the deliverable.',
  architect_wayfarer: 'Your routes have scenic rest stops. Planned ones. Bookmarked ones.',
  architect_gremlin: 'You plan meticulously — and keep one slot labeled "chaos, just in case."',
  architect_lorekeeper: 'Your builds have lore. Your spreadsheet has footnotes.',
  architect_hypeman: 'You organize the chaos of people with the calm of a build order.',

  gremlin_conqueror: 'Your exploits win games. The devs are furious. The replay is priceless.',
  gremlin_wayfarer: "You've been places the map doesn't officially admit exist.",
  gremlin_architect: 'You found fourteen loopholes and documented all of them. In the dev\u2019s own format.',
  gremlin_lorekeeper: 'You read the lore — mostly to find out what you are allowed to break.',
  gremlin_hypeman: 'Your chaos is a team sport. Everyone is involved. Nobody is safe.',

  lorekeeper_conqueror: "You don't just read the saga — you settle it. Canonically.",
  lorekeeper_wayfarer: 'You read the world, then walk to where it was written.',
  lorekeeper_architect: 'Your lore has index cards. Cross-referenced. Color-coded.',
  lorekeeper_gremlin: 'You keep the canon — and one drawer of cursed footnotes.',
  lorekeeper_hypeman: 'You retell the campaign to the squad. They ask for updates. Weekly.',

  hypeman_conqueror: 'You rally the lobby — then top the scoreboard to prove a point.',
  hypeman_wayfarer: 'You lead the party off the map, and it becomes the story everyone retells.',
  hypeman_architect: 'Your lobby nights have agendas. Printed. Everyone is secretly grateful.',
  hypeman_gremlin: 'The party follows you anywhere — mostly to keep an eye on you.',
  hypeman_lorekeeper: 'You feel every cutscene — and narrate them to the group chat.',
};

// Paragraphs for the archetype a player keeps at arm's length (lowest affinity).
export const WEAK_LINES = {
  conqueror:
    "the CONQUEROR. Winning is not the reason you press play, and ranked anxiety is a foreign country you've never needed a visa for. Honestly? The ladder misses you, but you don't have to answer.",
  wayfarer:
    'the WAYFARER. You will optimize the path before you ever wander off it — the world is content and content should be cleared. The unexplored 3% of the map is safe. From you, anyway.',
  architect:
    "the ARCHITECT. You improvise, you vibe, you wing it — and it works, which is somehow more annoying. A plan would help. You will not be making one today.",
  gremlin:
    'the GREMLIN. You are a certified steward of the rules-as-written. The physics engine sleeps soundly when you are online, and every exploit dies of loneliness in your presence.',
  lorekeeper:
    "the LOREKEEPER. You'll learn the mechanic long before you learn why the villain did it — and honestly? The villain deserved better. The codex is right there. No pressure.",
  hypeman:
    'the HYPEMAN. Your quest log is your quest log; the squad can admire your progress from a respectful distance. Just remember: "wp everyone" is free, and so is the friend you haven\u2019t invited yet.',
};

export const CONVICTION_TIERS = [
  { max: 0.25, label: 'SOFT-LOCKED', line: 'You hedged. The needle wobbled. The Great Map has opinions anyway.' },
  { max: 0.55, label: 'DECISIVE', line: 'Firm answers, firm vectors. The Map did not have to work hard to read you.' },
  { max: 1.01, label: 'LOCKED IN', line: 'You did not hesitate once. The Great Map barely needed the quiz.' },
];

export const TERRITORY_TIERS = [
  { max: 0.3, label: 'THE CROSSROADS', line: 'You spawn near the heart of the Map — a citizen of everywhere, native to nowhere.' },
  { max: 0.62, label: 'THE BORDERLANDS', line: 'You spawn between regions — close enough to borrow two playstyles before breakfast.' },
  { max: 1.01, label: 'DEEP TERRITORY', line: 'You spawn deep in claimed land. The locals recognize you.' },
];

export const INTRO_BLURB =
  'Twenty-four queries. No right answers — though there are plenty of wrong ones. The diagnostic maps your play personality onto the Great Map: six archetypes, three opposing axes, one spawn point. Yours.';
