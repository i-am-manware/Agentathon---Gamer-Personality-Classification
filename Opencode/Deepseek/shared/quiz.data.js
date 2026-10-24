export const QUIZ_VERSION = 1;

export const ARCHETYPES = [
  {
    key: 'duelist',
    name: 'DUELIST',
    color: '#ff4d6d',
    angle: 90,
    icon: 'swords',
    tagline: 'Born to compete.',
    short: 'You play to win, and you want witnesses.'
  },
  {
    key: 'architect',
    name: 'ARCHITECT',
    color: '#ff922b',
    angle: 270,
    icon: 'hammer',
    tagline: 'Born to build.',
    short: 'Give you a canvas and you will fill it with something colossal.'
  },
  {
    key: 'curator',
    name: 'CURATOR',
    color: '#b197fc',
    angle: 30,
    icon: 'gem',
    tagline: 'Born to complete.',
    short: 'If it can be collected, counted or completed, it will be.'
  },
  {
    key: 'pathfinder',
    name: 'PATHFINDER',
    color: '#4dabf7',
    angle: 210,
    icon: 'compass',
    tagline: 'Born to discover.',
    short: 'The map ends where your curiosity ends, and it never ends.'
  },
  {
    key: 'tactician',
    name: 'TACTICIAN',
    color: '#51cf66',
    angle: 150,
    icon: 'grid',
    tagline: 'Born to optimize.',
    short: 'Every game is a machine, and every machine can be understood.'
  },
  {
    key: 'bard',
    name: 'BARD',
    color: '#ffd43b',
    angle: 330,
    icon: 'note',
    tagline: 'Born to gather.',
    short: 'The lobby is the game, and the game is just the excuse.'
  }
];

export const PAIRS = [
  { pos: 'duelist', neg: 'architect', label: 'Arena vs Workshop', posBlurb: 'proving it', negBlurb: 'making it' },
  { pos: 'curator', neg: 'pathfinder', label: 'Collection vs Frontier', posBlurb: 'completing it', negBlurb: 'discovering it' },
  { pos: 'tactician', neg: 'bard', label: 'Systems vs People', posBlurb: 'solving it', negBlurb: 'sharing it' }
];

export const QUESTIONS = [
  {
    id: 'q1',
    prompt: 'A new game just finished installing. Your very first move?',
    options: [
      { text: 'Crank it to max difficulty. Trial by fire.', w: { duelist: 3 } },
      { text: 'Pull up a build guide before I even hit Play.', w: { tactician: 3 } },
      { text: 'Walk the opposite way the tutorial arrow points.', w: { pathfinder: 3 } },
      { text: 'Open the achievements tab and plan the 100% route.', w: { curator: 3 } },
      { text: 'Character creator. See you in two hours.', w: { architect: 3 } },
      { text: 'Invite the whole friend list. Immediately.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q2',
    prompt: "It's Friday night. Your ideal lobby looks like...",
    options: [
      { text: 'Ranked queue. Climbing or nothing.', w: { duelist: 2, tactician: 1 } },
      { text: 'Four-player co-op, zero strategy, maximum chaos.', w: { bard: 3 } },
      { text: 'Creative mode and an empty canvas.', w: { architect: 3 } },
      { text: 'A quiet backlog of side quests, one by one.', w: { curator: 2, pathfinder: 1 } },
      { text: 'Running the bracket for the whole server.', w: { tactician: 2, bard: 1 } },
      { text: "Solo deep-dive somewhere nobody's mapped yet.", w: { pathfinder: 3 } }
    ]
  },
  {
    id: 'q3',
    prompt: 'A glowing chest sits off the main path. The boss door is RIGHT THERE.',
    options: [
      { text: 'Loot first. Always loot first.', w: { curator: 3 } },
      { text: 'Off the path is where the real game lives.', w: { pathfinder: 3 } },
      { text: "Boss now. Loot when I'm overleveled.", w: { duelist: 2, tactician: 1 } },
      { text: "I'll plot a route that hits both. Perfectly.", w: { tactician: 3 } },
      { text: 'Is it cosmetic? Because my base needs it.', w: { architect: 2, curator: 1 } },
      { text: 'If a friend is online, we loot it together.', w: { bard: 2, curator: 1 } }
    ]
  },
  {
    id: 'q4',
    prompt: 'Your squad would describe you as...',
    options: [
      { text: 'the one who carries.', w: { duelist: 3 } },
      { text: 'the one who builds the base.', w: { architect: 3 } },
      { text: 'the one who finds every secret.', w: { pathfinder: 3 } },
      { text: 'the one with the spreadsheet.', w: { tactician: 3 } },
      { text: 'the one who owns every cosmetic.', w: { curator: 3 } },
      { text: 'the one who talks to every NPC.', w: { bard: 2, pathfinder: 1 } }
    ]
  },
  {
    id: 'q5',
    prompt: "An achievement pops: 'Defeat 100 enemies with the starter sword.'",
    options: [
      { text: 'Equipping it now. Tonight, even.', w: { curator: 3 } },
      { text: 'Already done. I never unequip starter gear.', w: { duelist: 2, curator: 1 } },
      { text: 'Only if my friends are there to witness the stupidity.', w: { bard: 2, curator: 1 } },
      { text: "Skip. That's six hours I could spend optimizing my build.", w: { tactician: 3 } },
      { text: 'Only if the sword has lore. Does it have lore?', w: { pathfinder: 2, curator: 1 } }
    ]
  },
  {
    id: 'q6',
    prompt: "You've died to the same boss nine times. Round ten looks like...",
    options: [
      { text: "Same door. I'm learning its tells.", w: { duelist: 3 } },
      { text: 'Wiki tab open. Rebuilding my loadout from scratch.', w: { tactician: 3 } },
      { text: 'Wandering off to get stronger and wiser.', w: { pathfinder: 2, curator: 1 } },
      { text: 'Building a deathtrap arena and luring it in.', w: { architect: 3 } },
      { text: 'Grabbing a friend. Bosses are better as a duo.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q7',
    prompt: 'In any open world, your true nature shows when you...',
    options: [
      { text: 'Black out every fog-of-war tile before the credits.', w: { pathfinder: 3 } },
      { text: 'Fast-travel only where the quest demands.', w: { tactician: 2, duelist: 1 } },
      { text: 'Find the prettiest spot and build a forever home.', w: { architect: 3 } },
      { text: "Pick up every item that isn't nailed down.", w: { curator: 3 } },
      { text: 'Follow a friend around and cause problems together.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q8',
    prompt: "MMO character select. You're picking...",
    options: [
      { text: 'Whatever class has the best PvP win rate.', w: { duelist: 3 } },
      { text: "Support. Everyone needs a healer, and I'm everyone's.", w: { bard: 3 } },
      { text: 'The crafting/housing main. Endgame is interior design.', w: { architect: 3 } },
      { text: 'The class with the most ridiculous rotation.', w: { tactician: 3 } },
      { text: 'The one with the best mount-collection synergy.', w: { curator: 2, pathfinder: 1 } }
    ]
  },
  {
    id: 'q9',
    prompt: 'Be honest about your inventory...',
    options: [
      { text: "Sorted by value. I know what's in slot 47.", w: { tactician: 3 } },
      { text: "Full of 'I might need this in 40 hours' items.", w: { curator: 3 } },
      { text: "Full of materials for a base I'll finish next year.", w: { architect: 3 } },
      { text: 'Light. I travel fast and loot faster.', w: { duelist: 2, pathfinder: 1 } },
      { text: 'A community chest. Take what you need, friends.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q10',
    prompt: 'An NPC starts a nine-line monologue. You...',
    options: [
      { text: "Skip, skip, skip. Where's the fight?", w: { duelist: 3 } },
      { text: 'Read every line. This is the good stuff.', w: { pathfinder: 3 } },
      { text: 'Pick the funniest option, consequences be damned.', w: { bard: 3 } },
      { text: 'Pick whichever response leads to the best reward.', w: { tactician: 2, curator: 1 } },
      { text: "Accept every quest in the zone first. I'll sort later.", w: { curator: 3 } }
    ]
  },
  {
    id: 'q11',
    prompt: 'Patch notes drop. You scroll straight to...',
    options: [
      { text: "Buffs and nerfs. Who's strong now?", w: { duelist: 3 } },
      { text: 'New items and cosmetics. Show me the shinies.', w: { curator: 2, architect: 1 } },
      { text: 'New zones and questlines. Map me the new ground.', w: { pathfinder: 3 } },
      { text: 'System changes. Time to break a new build.', w: { tactician: 3 } },
      { text: 'Social features and guild tools. The crew grows.', w: { bard: 2, architect: 1 } }
    ]
  },
  {
    id: 'q12',
    prompt: 'A 0.1% drop rate item exists. Your honest take:',
    options: [
      { text: "The grind IS the game. I'm at attempt 412.", w: { curator: 3 } },
      { text: "I'll find a strategy that raises the odds.", w: { tactician: 3 } },
      { text: "Boring. I'd rather fight real players.", w: { duelist: 2, bard: 1 } },
      { text: "I'll trade for it using my crafting empire.", w: { architect: 2, bard: 1 } },
      { text: "Not worth it. There's a whole map I haven't seen.", w: { pathfinder: 3 } }
    ]
  },
  {
    id: 'q13',
    prompt: 'Your perfect game night ends with...',
    options: [
      { text: 'A rank-up screen and a new personal best.', w: { duelist: 3 } },
      { text: 'A finished mega-base lit up at night.', w: { architect: 3 } },
      { text: '100% completion on a chunky checklist.', w: { curator: 3 } },
      { text: 'A fully mapped region and a tale for the group chat.', w: { pathfinder: 2, bard: 1 } },
      { text: 'Voice chat still going at 3 a.m.', w: { bard: 3 } },
      { text: 'A solved spreadsheet and a flawless run.', w: { tactician: 3 } }
    ]
  },
  {
    id: 'q14',
    prompt: 'You find a hilarious bug that breaks the economy.',
    options: [
      { text: "Patch it? I'm climbing the ladder with it first.", w: { duelist: 3 } },
      { text: "I'll chart exactly how it works. For science.", w: { tactician: 3 } },
      { text: 'Straight to the group chat. The lulz are priceless.', w: { bard: 3 } },
      { text: "I'll exploit it to decorate my base with 400 statues.", w: { architect: 3 } },
      { text: "I won't touch it until my collection's complete.", w: { curator: 2, tactician: 1 } },
      { text: 'I find a hidden corner of the map it cannot reach.', w: { pathfinder: 3 } }
    ]
  },
  {
    id: 'q15',
    prompt: 'You join a lobby. Where are you headed?',
    options: [
      { text: 'Ranked playlist. Highest stakes.', w: { duelist: 3 } },
      { text: 'The sandbox server where my build waits.', w: { architect: 3 } },
      { text: "The community hub. I'm here for the people.", w: { bard: 3 } },
      { text: 'Custom game browser. Show me the weird modes.', w: { pathfinder: 3 } },
      { text: 'Whatever pays the best weekly completion rewards.', w: { curator: 2, tactician: 1 } },
      { text: 'Wherever my spreadsheet says the win rate is highest.', w: { tactician: 3 } }
    ]
  },
  {
    id: 'q16',
    prompt: "Your character's look is best described as...",
    options: [
      { text: 'Meta loadout. Function over fashion.', w: { tactician: 2, duelist: 1 } },
      { text: 'Lore-accurate cosplay from the source material.', w: { pathfinder: 2, architect: 1 } },
      { text: 'Every rare cosmetic I own. At once. No regrets.', w: { curator: 3 } },
      { text: 'Guaranteed to make my friends laugh on sight.', w: { bard: 3 } },
      { text: 'Custom colors and a backstory I wrote myself.', w: { architect: 3 } }
    ]
  },
  {
    id: 'q17',
    prompt: 'The difficulty slider asks for honesty.',
    options: [
      { text: 'Hardest available. I want the game to fear me.', w: { duelist: 3 } },
      { text: "Story mode. I'm here for the world.", w: { pathfinder: 3 } },
      { text: 'Normal first, hardest on the collectible run.', w: { curator: 3 } },
      { text: 'Whatever the meta says is optimal.', w: { tactician: 3 } },
      { text: 'Whatever keeps the party alive and laughing.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q18',
    prompt: 'You finish a game you love. What is next?',
    options: [
      { text: 'Straight into NG+ for a cleaner, faster route.', w: { tactician: 2, duelist: 1 } },
      { text: 'Replay to mop up the last achievements.', w: { curator: 3 } },
      { text: 'Endgame sandbox. Time to build something ridiculous.', w: { architect: 3 } },
      { text: "Queue up with friends who haven't played it yet.", w: { bard: 3 } },
      { text: 'Look up the world record and start practicing.', w: { duelist: 3 } },
      { text: 'New game, new choices, see the endings I missed.', w: { pathfinder: 3 } }
    ]
  },
  {
    id: 'q19',
    prompt: 'Your guild needs a leader. You...',
    options: [
      { text: 'Take the throne. Raids run on my clock.', w: { duelist: 2, tactician: 1 } },
      { text: 'Host every game night and keep the vibes immaculate.', w: { bard: 3 } },
      { text: 'Design the hall, the emblem, the aesthetic.', w: { architect: 3 } },
      { text: 'Quietly become the one who actually knows everything.', w: { tactician: 3 } },
      { text: 'Curate the guild bank and raid supplies.', w: { curator: 3 } },
      { text: "Volunteer as the scout who knows every corner of the map.", w: { pathfinder: 3 } }
    ]
  },
  {
    id: 'q20',
    prompt: 'Your shelf of gaming memories holds...',
    options: [
      { text: 'Tournament brackets and clutch clips.', w: { duelist: 3 } },
      { text: "Screenshots of builds I'm proud of.", w: { architect: 3 } },
      { text: "A spreadsheet of every game I've 100%-ed.", w: { curator: 3 } },
      { text: 'Stories about that one playthrough with the crew.', w: { bard: 3 } },
      { text: 'A map with every secret marked.', w: { pathfinder: 3 } },
      { text: 'A notebook of strategies for every game I love.', w: { tactician: 3 } }
    ]
  },
  {
    id: 'q21',
    prompt: 'A new season drops and everyone starts fresh.',
    options: [
      { text: 'Fresh ladder. Time to climb from zero.', w: { duelist: 3 } },
      { text: 'New meta to solve. This is my Super Bowl.', w: { tactician: 3 } },
      { text: 'New zones and seasonal collectibles to chase.', w: { curator: 2, pathfinder: 1 } },
      { text: "New season, new base. This year it's a castle.", w: { architect: 3 } },
      { text: 'New reasons to drag everyone back online.', w: { bard: 3 } }
    ]
  },
  {
    id: 'q22',
    prompt: 'A friend is hopelessly stuck on a boss. You...',
    options: [
      { text: 'Take the controller. Watch and learn.', w: { duelist: 3 } },
      { text: 'Explain the mechanics and the exact punish windows.', w: { tactician: 3 } },
      { text: 'Hop in co-op and body-block for them.', w: { bard: 3 } },
      { text: 'Point them toward the secret weapon nearby.', w: { pathfinder: 3 } },
      { text: 'Decorate their base while they retry. Moral support.', w: { architect: 3 } }
    ]
  },
  {
    id: 'q23',
    prompt: 'The crafting system runs deep. Your reaction:',
    options: [
      { text: "I'll master every recipe. Completion demands it.", w: { curator: 3 } },
      { text: "I'll find the one broken recipe and become unstoppable.", w: { tactician: 3 } },
      { text: "I'll build a village, then a kingdom, then a monument.", w: { architect: 3 } },
      { text: 'Craft only what I need to keep moving outward.', w: { pathfinder: 2, duelist: 1 } },
      { text: "I'll trade my crafts to the whole server.", w: { bard: 2, architect: 1 } }
    ]
  },
  {
    id: 'q24',
    prompt: 'Your ideal loot system would be...',
    options: [
      { text: 'Prestige gear, earned only in PvP.', w: { duelist: 3 } },
      { text: 'Rare random drops with a beautiful 0.01% tail.', w: { curator: 2, pathfinder: 1 } },
      { text: 'Craftable and customizable from scratch.', w: { architect: 3 } },
      { text: 'Fully tradeable. The economy is half the game.', w: { bard: 2, tactician: 1 } },
      { text: "Deterministic. Publish the drop table or don't.", w: { tactician: 3 } }
    ]
  },
  {
    id: 'q25',
    prompt: 'Last one. The cabinet asks why you play. You say...',
    options: [
      { text: "To win. It's that simple.", w: { duelist: 3 } },
      { text: "To make something that's mine.", w: { architect: 3 } },
      { text: "To see what's over the next hill.", w: { pathfinder: 3 } },
      { text: 'To have it all. Every last piece.', w: { curator: 3 } },
      { text: 'To be the smartest person in the room.', w: { tactician: 3 } },
      { text: 'To be with my people.', w: { bard: 3 } }
    ]
  }
];

export const ARCHETYPE_KEYS = ARCHETYPES.map((a) => a.key);

export function archetype(key) {
  return ARCHETYPES.find((a) => a.key === key);
}

export function publicQuiz() {
  return {
    version: QUIZ_VERSION,
    archetypes: ARCHETYPES.map((a) => ({
      key: a.key,
      name: a.name,
      color: a.color,
      angle: a.angle,
      icon: a.icon,
      tagline: a.tagline,
      short: a.short
    })),
    pairs: PAIRS.map((p) => ({ ...p })),
    questions: QUESTIONS.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((o) => ({ text: o.text }))
    }))
  };
}
