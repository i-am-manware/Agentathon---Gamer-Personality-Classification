// Human-facing copy + the insight generator. Shared by client and server.
import { ARCH, AXES, OPPOSITE, TITLES, titleKey } from './engine.js';

export const PROFILES = {
  A: {
    tagline: 'Every system is a puzzle, and every puzzle has an optimal solution.',
    body: "You play with the menu open in your head. Where other people see a game, you see an engine — rates, curves, breakpoints, cooldowns — and the joy is understanding it so well it bends to your plan. You'd rather spend forty minutes designing the perfect build than five minutes playing a sloppy one. Honestly? The forty minutes are the fun part.",
    strengths: ['Sees the hidden math', 'Turns chaos into a checklist', 'Wins the long game'],
    blindspots: ['Can optimize the fun right out of a game', 'Mild panic when a plan meets a Gremlin'],
    habitat: 'Factory builders, grand strategy, tactics RPGs, puzzle games with real teeth',
    games: ['Factorio', 'Into the Breach', 'Slay the Spire', 'Civilization VI'],
    role: 'Shotcaller', partner: 'B',
    short: 'Plans, optimizes, theorycrafts.',
  },
  B: {
    tagline: "The game is just the excuse. You're the reason.",
    body: "For you, a game is a campfire. It's where the group chat becomes a party, where inside jokes are born, where a stranger in voice chat becomes a friend by the third raid. You'll happily play something mediocre if the right people are there — and you quietly make sure everyone's having a good time, even the new player who keeps dying.",
    strengths: ['Glue of every group', 'Reads the room', 'Turns strangers into squads'],
    blindspots: ['Solo campaigns gather dust', 'Will play anything if the crew is there — including bad things'],
    habitat: 'Co-op games, MMOs, party games, anything with a voice channel',
    games: ['Deep Rock Galactic', 'It Takes Two', 'Final Fantasy XIV', 'Jackbox Party Pack'],
    role: 'Morale Officer', partner: 'A',
    short: 'Plays for the people.',
  },
  C: {
    tagline: "Gotta catch, sort, label and display 'em all.",
    body: "You're here for the long haul. The checklist, the collection log, the museum missing exactly one fossil. There's a deep calm in watching a completion percentage tick upward, and a deeper pride in a perfectly arranged house or a fully-upgraded roster. Other players move on; you settle in and make the place yours.",
    strengths: ['Legendary patience', 'Knows where every item lives', 'Finishes what they start'],
    blindspots: ['That last 1% can own your whole weekend', 'Starting a new game feels like leaving home'],
    habitat: 'Monster collectors, life sims, looter progression, anything with a museum',
    games: ['Pokémon', 'Stardew Valley', 'Animal Crossing', 'Hades'],
    role: 'Quartermaster', partner: 'B',
    short: 'Collects, completes, keeps.',
  },
  G: {
    tagline: 'The rules are more like… suggestions.',
    body: "You play to find out what happens. What happens if I stack forty explosive barrels? What if I bring only a spoon? The designers built a world; you're here to stress-test it. Your best stories aren't victories — they're the moments a physics engine gave up and you were there, crying laughing.",
    strengths: ['Finds fun in any game', 'Impossible to predict', 'Every session becomes a story'],
    blindspots: ['Tutorials: skipped. Consequences: many.', "Teammates don't always share the joke"],
    habitat: 'Physics sandboxes, immersive sims, party games, anything with ragdolls',
    games: ['Totally Accurate Battle Simulator', 'Teardown', 'Tears of the Kingdom', 'Goat Simulator 3'],
    role: 'Wildcard', partner: 'B',
    short: 'Improvises, breaks, experiments.',
  },
  D: {
    tagline: 'GG means nothing unless I earned it.',
    body: "You want an opponent. Not a script, not a bot on easy — a person, across the map, who wants it as badly as you do. You live for the ladder, the clutch, the frame-perfect punish and the quiet glow of a rank badge you bled for. Losing stings, but it also tells you exactly what to fix next.",
    strengths: ['Clutch under pressure', 'Learns fast from losses', "Raises everyone's game"],
    blindspots: ["'One more match' is a lie you tell nightly", 'Casual modes make you itchy'],
    habitat: 'Fighting games, competitive shooters, MOBAs, ranked anything',
    games: ['Street Fighter 6', 'Valorant', 'Rocket League', 'Tekken 8'],
    role: 'Carry', partner: 'A',
    short: 'Competes, climbs, clutches.',
  },
  W: {
    tagline: "What's over that hill? Only one way to find out.",
    body: "You're pulled by the horizon. A mysterious door, an unmarked cave, a story beat hinting at something bigger — that's the hook. You'd rather be surprised than prepared, which is why you avoid wikis like spoilers (because they are spoilers). When a world has nothing left to reveal, you're already packing for the next one.",
    strengths: ['Finds what others miss', 'Endlessly curious', 'Brings back the best stories'],
    blindspots: ['Main quest? Eventually. Probably.', 'Your backlog is now geological'],
    habitat: 'Open worlds, narrative adventures, metroidvanias, games with secrets',
    games: ['Outer Wilds', 'Elden Ring', 'Subnautica', 'Hollow Knight'],
    role: 'Scout', partner: 'G',
    short: 'Roams, discovers, wonders.',
  },
};

export const HYBRIDS = {
  AB: { tagline: 'Has a spreadsheet, a Discord, and a plan for all of you.',
    body: 'You love systems and you love people, so naturally you ended up organizing both. The strat is yours, the group is yours, and somehow the raid actually starts on time.',
    games: ['World of Warcraft', 'Helldivers 2', 'Destiny 2'] },
  AC: { tagline: 'Completion: 100%. Efficiency: also 100%.',
    body: "You don't just collect everything — you collect it in the optimal order. Routing, tracking and cataloguing are one art form to you, and your notes could be sold as a strategy guide.",
    games: ['Old School RuneScape', 'Satisfactory', 'Pokémon (shiny hunting)'] },
  AD: { tagline: 'Wins the match before it starts.',
    body: 'Competition is chess to you, even when it is a shooter. You theorycraft, lab, review replays and show up with an answer to every question your opponent could ask.',
    games: ['StarCraft II', 'Teamfight Tactics', 'Hearthstone'] },
  AW: { tagline: 'Maps the world — and the rules that run it.',
    body: "Exploration isn't aimless for you; it's research. You chart every region, learn how every system connects, and come home with a mental model of the entire world.",
    games: ['Outer Wilds', 'Noita', 'Tunic'] },
  BC: { tagline: 'Home is wherever the crafting bench is.',
    body: 'You build cozy places and fill them with people. The garden is immaculate, the house is decorated for the season, and every visitor leaves with a gift.',
    games: ['Stardew Valley', 'Animal Crossing', 'Palia'] },
  BG: { tagline: 'Chaos is better with witnesses.',
    body: "You're the reason the lobby is laughing. You bring the bits, the bad ideas and the energy — and nobody ever remembers who actually won.",
    games: ['Overcooked 2', 'Lethal Company', 'Fall Guys'] },
  BW: { tagline: 'Adventure is better in a convoy.',
    body: "You want the wonder of the unknown, but you want to point at it and yell 'LOOK' to someone. Expeditions, road trips, co-op journeys — you're steering the ship.",
    games: ['Valheim', 'Sea of Thieves', 'Journey'] },
  CG: { tagline: 'Collects weird things. Especially cursed ones.',
    body: 'Your inventory is a museum of the absurd: glitched items, novelty hats, four hundred of something useless. You complete collections nobody else knew existed.',
    games: ['Katamari Damacy', 'Balatro', 'Skyrim (the cheese wheels)'] },
  CD: { tagline: "If it's not on the profile, it didn't happen.",
    body: 'You want receipts: platinum trophies, rank badges, seasonal rewards. Winning and completing are the same drive — proof you were here and you were good.',
    games: ['Apex Legends', 'Tetris Effect', 'Destiny 2'] },
  DG: { tagline: "Technically, that's legal.",
    body: "You want to win — just not the way anyone expects. Off-meta picks, absurd strats, exploits the devs will patch next week: your victories come with a side of disbelief.",
    games: ['Super Smash Bros. Ultimate', 'Worms W.M.D', 'Magic: The Gathering Arena'] },
  GW: { tagline: 'The intended path is merely a rumor.',
    body: 'You wander off-map, climb what should not be climbable, and discover the world from angles the level designer never considered.',
    games: ['Tears of the Kingdom', 'Super Mario 64', 'Minecraft'] },
  DW: { tagline: 'High risk, high reward, high speed.',
    body: 'You chase the unknown with the stakes turned all the way up — permadeath, extraction, one more room. The frontier and the fight are the same thrill.',
    games: ['Hades II', 'Risk of Rain 2', 'Hunt: Showdown'] },
  O: { tagline: "You don't have a genre. You have an appetite.",
    body: 'Your scores are unusually balanced — you can plan, improvise, compete, cooperate, roam and hoard depending on the night. That is rare, and it makes you the best person to hand a random game.',
    games: ['Baldur’s Gate 3', 'Minecraft', 'Monster Hunter: World'] },
};

const TENSION_TEXT = {
  order: "**Planned chaos.** You score high on both Architect *and* Gremlin — you draft meticulous plans specifically so you can set them on fire. Speedrunners and immersive-sim players live here.",
  rivalry: "**Friendly fire.** Duelist and Bard both run hot in you: you want to win, and you want everyone to have a great time losing to you. You're the rival people actually like.",
  horizon: "**The completionist explorer.** Wayfarer and Curator are both high — you need to see everything *and* keep everything. Open-world maps full of icons are both your heaven and your curse.",
};

const VOID_TEXT = {
  order: "**Along for the ride.** Neither scheming nor tinkering grabs you — you take a game as it's served and let it lead. That makes you wonderfully easy to please.",
  rivalry: "**Lone wolf.** Winning and bonding both barely register — other players are basically weather to you. Single-player worlds are where you do your best playing.",
  horizon: "**Here and now.** You're not chasing new horizons or hoarding what you've got — you play what's in front of you, then put the controller down. Healthy, honestly.",
};

const pct = (v) => Math.round(v * 100);

function leanPhrase(m) {
  if (m < 0.08) return 'sit right on the fence';
  if (m < 0.2) return 'lean slightly';
  if (m < 0.38) return 'lean clearly';
  return 'are all-in';
}

/** Structured, fully-deterministic personality write-up. */
export function buildInsight(r) {
  const key = r.titleKey;
  const prim = PROFILES[r.primary];
  const hyb = HYBRIDS[key];
  const out = { headline: TITLES[key], tagline: hyb ? hyb.tagline : prim.tagline, paragraphs: [] };

  if (key === 'O') {
    out.paragraphs.push(hyb.body);
    out.paragraphs.push(`If we *had* to pick, your strongest pull is toward the **${ARCH[r.primary].name}** — ${prim.short.toLowerCase()} But it's a whisper, not a shout.`);
  } else {
    out.paragraphs.push(prim.body);
    if (hyb) out.paragraphs.push(`But you're not a pure ${ARCH[r.primary].name}. Your ${ARCH[r.secondary].name} streak is nearly as loud, which makes you **${TITLES[key]}**: ${hyb.body.charAt(0).toLowerCase()}${hyb.body.slice(1)}`);
    else out.paragraphs.push(`Your runner-up pull is the **${ARCH[r.secondary].name}** (${pct(r.scores[r.secondary])}/100) — lean into it a little more and you'd print as **${TITLES[titleKey(r.primary, r.secondary)]}**.`);
  }

  const axisLines = r.axes.map((ax) => {
    const m = Math.abs(ax.net);
    const pole = ax.net >= 0 ? ax.poles[0] : ax.poles[1];
    const phrase = leanPhrase(m);
    if (r.voids?.includes(ax.id)) return `On **${ax.poles[0]} vs ${ax.poles[1]}** neither side really moves you (${pct(ax.sa)} / ${pct(ax.sb)}).`;
    if (m < 0.08) return `On **${ax.poles[0]} vs ${ax.poles[1]}** you ${phrase} (${pct(ax.sa)} / ${pct(ax.sb)}).`;
    return `On **${ax.poles[0]} vs ${ax.poles[1]}** you ${phrase} toward *${pole}* (${pct(ax.sa)} / ${pct(ax.sb)}).`;
  });
  out.paragraphs.push(axisLines.join(' '));

  for (const t of r.tensions) out.paragraphs.push(TENSION_TEXT[t]);
  for (const v of r.voids || []) out.paragraphs.push(VOID_TEXT[v]);

  const d = r.drive;
  if (Math.abs(d) < 0.06) out.paragraphs.push("**Hidden depth:** your Trophy and Journey drives are perfectly balanced — you care as much about *what you earned* as *how it felt getting there*.");
  else if (d > 0) out.paragraphs.push(`**Hidden depth:** under the map sits a third dial — Trophy vs Journey — and you tip **Journey** by ${pct(d)} points. Moments, discoveries and surprises matter more to you than the tally at the end.`);
  else out.paragraphs.push(`**Hidden depth:** under the map sits a third dial — Trophy vs Journey — and you tip **Trophy** by ${pct(-d)} points. You like proof: ranks, completions, a finished plan.`);

  if (r.confidence !== null) {
    if (r.confidence >= 0.8) out.paragraphs.push(`Your answers were remarkably consistent: in ${pct(r.confidence)}% of 160 resampled versions of your quiz, you still land in ${ARCH[r.primary].name} territory.`);
    else if (r.runnerUp) out.paragraphs.push(`You're a border-dweller. Resampling your answers lands you in ${ARCH[r.primary].name} territory ${pct(r.confidence)}% of the time and ${ARCH[r.runnerUp.id].name} ${pct(r.runnerUp.share)}% — so retake it on a different day and you might drift.`);
  }

  const ORD = ['first', 'second', 'third', 'fourth'];
  if (r.integrity?.masher) {
    const m = r.integrity.masher;
    out.paragraphs.push(`**Integrity check:** you picked the ${ORD[m.slot] || 'same'} option on ${m.count} of ${m.of} multiple-choice questions. Either you are remarkably consistent or you speedran this quiz — honest answers make a much more interesting print.`);
  }
  if (r.integrity?.fenceSitter) {
    const f = r.integrity.fenceSitter;
    out.paragraphs.push(`**Fence-sitter alert:** you chose “Torn” on ${f.count} of ${f.of} sliders. Commitment issues, or a genuinely balanced soul? Your sliders didn't move your dot at all.`);
  }

  const partner = PROFILES[r.primary].partner;
  out.strengths = hyb && key !== 'O' ? [...prim.strengths.slice(0, 2), PROFILES[r.secondary].strengths[0]] : prim.strengths;
  out.blindspots = prim.blindspots;
  out.habitat = prim.habitat;
  out.games = [...new Set([...(hyb ? hyb.games : []), ...prim.games])].slice(0, 5);
  out.role = prim.role;
  out.partner = partner;
  out.nemesis = OPPOSITE[r.primary];
  return out;
}

/** One-liner for link previews. */
export function describeShort(r) {
  const hyb = HYBRIDS[r.titleKey];
  return `${r.title} — ${hyb ? hyb.tagline : PROFILES[r.primary].tagline} Find your own place on the PLAYERPRINT gamer atlas.`;
}

export const AXIS_BLURB = {
  order: { title: 'Plan ⟷ Play', body: 'Do you conquer a game by understanding it — or by poking it until something funny happens?' },
  rivalry: { title: 'Win ⟷ Bond', body: 'Are other players your opponents, or your audience and friends?' },
  horizon: { title: 'Roam ⟷ Keep', body: 'Do you chase what is new, or perfect what you already have?' },
};

export { AXES };
