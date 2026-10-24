'use strict';

/**
 * HEXAXIS content model.
 *
 * Six archetypes arranged as three opposing pairs around a hexagonal plane:
 *
 *      EXP (60°)        ARC (120°)
 *             \         /
 *   CMP (0°) ————————— SOC (180°)
 *             /         \
 *     DAR (300°)       ACH (240°)
 *
 * Pair 1 — Glory:   Competitor (CMP) vs Socializer (SOC)   "me vs the world" / "us together"
 * Pair 2 — Pursuit: Explorer  (EXP) vs Achiever   (ACH)   "the new" / "the finished"
 * Pair 3 — Method:  Architect (ARC) vs Daredevil  (DAR)   "mastery by design" / "mastery by nerve"
 */

const POLES = {
  CMP: {
    code: 'CMP',
    name: 'Competitor',
    constellation: 'The Arena',
    epithet: 'The Star of the Arena',
    motto: 'Glory is a scoreboard.',
    color: '#e8b34b',
    noun: 'Champion',
    prefix: 'Ruthless',
    lore: 'You play to test yourself against the only worthy opponent: everyone else.',
    insight:
      'You keep score — not out of vanity, but because the scoreboard is the only narrator you fully trust. ' +
      'Victory is your proof of existence in a lobby of ghosts: fleeting, luminous, earned. Others see the ' +
      'highlight reel; you see the four hundred hours of whiffed shots behind it. The Atlas notes, gently, ' +
      'that your fiercest rivalry has always been with the player you were yesterday — and that particular ' +
      'match never ends in a handshake.',
    modifier: 'Beneath it all runs a competitive current — you want the win, and you want it witnessed.',
    games: ['Street Fighter 6', 'Valorant', 'Rocket League', 'Chess.com blitz at 2 AM'],
    glyph: {
      stars: [[20, 72], [35, 36], [50, 62], [65, 36], [80, 72], [20, 72]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]],
    },
  },
  SOC: {
    code: 'SOC',
    name: 'Socializer',
    constellation: 'The Hearth',
    epithet: 'The Star of the Hearth',
    motto: 'The lobby is the game.',
    color: '#f27ea0',
    noun: 'Hearthkeeper',
    prefix: 'Radiant',
    lore: 'Games are your excuse to gather; gathering is your gift.',
    insight:
      'Somewhere along the way you realized the loot was never the point — it was the voices in the channel ' +
      'when the loot dropped. You are the reason the group survived its third failed raid, its guild drama, ' +
      'its long offseason. Others log off when the session ends; you linger in the lobby, because for you that ' +
      'was the session all along. The Atlas has watched a thousand players chase rare drops, and stands by ' +
      'this: the rarest thing in any game is someone like you, still talking after the credits.',
    modifier: 'Through it all, you play for people — the session is better simply because you were in it.',
    games: ['Deep Rock Galactic', 'Final Fantasy XIV', 'Overcooked! 2', 'Among Us'],
    glyph: {
      stars: [[50, 22], [74, 36], [74, 64], [50, 78], [26, 64], [26, 36]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3]],
    },
  },
  EXP: {
    code: 'EXP',
    name: 'Explorer',
    constellation: 'The Horizon',
    epithet: 'The Star of the Horizon',
    motto: "What's over that hill?",
    color: '#4fc9b3',
    noun: 'Wayfarer',
    prefix: 'Boundless',
    lore: 'Completionists finish games; you finish possibilities.',
    insight:
      'The main quest can wait; it always can. You play the way ravens fly — toward the glint of the unknown, ' +
      'the unrendered edge of the map, the cave the developers hid for exactly one person like you. Your save ' +
      'files are archaeological sites of curiosity, and your backlog is not a guilt pile but a fleet of ' +
      'unlaunched ships. Somewhere out there, forty worlds spin patiently in your library, and every one of ' +
      'them understands: you were never lost. You were surveying.',
    modifier: 'A horizon-hunger rides with you — novelty is your oxygen, and routine your only debuff.',
    games: ['Outer Wilds', 'Elden Ring', 'No Man\u2019s Sky', 'Breath of the Wild'],
    glyph: {
      stars: [[50, 8], [50, 30], [70, 55], [50, 80], [30, 55]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]],
    },
  },
  ACH: {
    code: 'ACH',
    name: 'Achiever',
    constellation: 'The Vault',
    epithet: 'The Star of the Vault',
    motto: '100% or nothing.',
    color: '#8fd45f',
    noun: 'Laureate',
    prefix: 'Relentless',
    lore: 'A game is a contract, and you honor every clause.',
    insight:
      'Where others see a checklist, you see a promise. The 100% is not obsession; it is craftsmanship applied ' +
      'to leisure — the belief that a thing worth playing is worth playing completely. The secret boss, the ' +
      'last relic, the achievement only 0.3% of players hold: these are not chores to you, they are vows. ' +
      'The Atlas would offer one small heresy, take it or leave it: the credits were also part of the game, ' +
      'and you are allowed, occasionally, to simply sit and watch them roll.',
    modifier: 'There is a completist\u2019s patience in you — unfinished business genuinely itches.',
    games: ['Hades (heat ladder)', 'Slay the Spire ascensions', 'Any Platinum trophy hunt', 'Vampire Survivors unlocks'],
    glyph: {
      stars: [[28, 40], [50, 22], [72, 40], [72, 74], [28, 74]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]],
    },
  },
  ARC: {
    code: 'ARC',
    name: 'Architect',
    constellation: 'The Orrery',
    epithet: 'The Star of the Orrery',
    motto: 'Every system can be solved.',
    color: '#9d8bff',
    noun: 'Grandmaster',
    prefix: 'Calculated',
    lore: 'Where others feel the flow, you see the clockwork.',
    insight:
      'Every game whispers its rules to you, and you answer in spreadsheets. The economy curve, the damage ' +
      'formula, the optimal line through chaos — you do not play systems so much as hold them up to the light. ' +
      'Victory tastes best when it unfolded exactly according to design: yours. Yet the Atlas has noticed ' +
      'something you may have missed in the margins of your own models: your favorite moments were the ones no ' +
      'spreadsheet predicted. Leave a blank cell in the plan. The best moves live there.',
    modifier: 'A strategist\u2019s patience underlies it — some part of you is always three turns ahead.',
    games: ['Factorio', 'Civilization VI', 'Against the Storm', 'Opus Magnum'],
    glyph: {
      stars: [[50, 22], [76, 68], [24, 68], [50, 52]],
      links: [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]],
    },
  },
  DAR: {
    code: 'DAR',
    name: 'Daredevil',
    constellation: 'The Comet',
    epithet: 'The Star of the Comet',
    motto: 'Plans are for people with slower reflexes.',
    color: '#ff6b4a',
    noun: 'Wildfire',
    prefix: 'Untamed',
    lore: 'Your best plays were never rehearsed — they were survived.',
    insight:
      'You play on instinct, on nerve, on the half-second where thinking would only get in the way. Your ' +
      'greatest clips were never rehearsed — they were survived, and then watched back four times because even ' +
      'you didn\u2019t quite believe them. Others call it recklessness; you call it reading the situation faster ' +
      'than language allows. The Atlas notes a trail of heroic corpses behind your highlight reel, and offers ' +
      'one small lantern: occasionally — very occasionally — the coward\u2019s way through is also a way through.',
    modifier: 'There is lightning in your wrists — when the moment comes, you act first and narrate later.',
    games: ['ULTRAKILL', 'Neon White', 'Doom Eternal', 'Titanfall 2'],
    glyph: {
      stars: [[62, 12], [38, 46], [58, 46], [30, 86]],
      links: [[0, 1], [1, 2], [2, 3]],
    },
  },
};

const POLE_ORDER = ['CMP', 'EXP', 'ARC', 'SOC', 'ACH', 'DAR']; // clockwise around the plane

const AXES = [
  {
    id: 'glory',
    name: 'Glory',
    a: 'CMP',
    b: 'SOC',
    angle: 0,
    leanA: 'On the axis of Glory you stand with the Arena — triumph matters more to you than togetherness.',
    leanB: 'On the axis of Glory you stand with the Hearth — togetherness outranks triumph.',
  },
  {
    id: 'pursuit',
    name: 'Pursuit',
    a: 'EXP',
    b: 'ACH',
    angle: 60,
    leanA: 'On the axis of Pursuit you sail with the Horizon — the new outranks the finished.',
    leanB: 'On the axis of Pursuit you keep with the Vault — the finished outranks the new.',
  },
  {
    id: 'method',
    name: 'Method',
    a: 'ARC',
    b: 'DAR',
    angle: 120,
    leanA: 'On the axis of Method you plot with the Orrery — mastery through design.',
    leanB: 'On the axis of Method you burn with the Comet — mastery through nerve.',
  },
];

const CONVICTION = {
  high: 'Your star burns far from the center — these are not preferences, they are convictions. Some may call you intense. The Atlas calls you legible.',
  mid: 'Your star holds a steady orbit — clear pulls in clear directions, with room to drift when the mood demands it.',
  low: 'Your star hovers near the Still Center — rare air. You shapeshift between playstyles, reading the room before the room knows it has a mood.',
};

const BALANCED_TITLE = {
  noun: 'Still Center',
  epithet: 'The Sixth Direction',
  line: 'All six stars claim you equally — the Atlas has no single name for you, and so it gives you its rarest one.',
};

const CONSISTENCY = {
  high: 'Your answers agreed with each other across the whole reading — what you say you love is what you keep choosing.',
  mid: 'A few answers pulled against your own pattern — you contain multitudes, or at least two sincerely held opinions.',
  low: 'Your answers wandered between readings — either you contain multitudes, or you answered with your mood instead of your habits. Both are allowed.',
};

module.exports = { POLES, POLE_ORDER, AXES, CONVICTION, BALANCED_TITLE, CONSISTENCY };
