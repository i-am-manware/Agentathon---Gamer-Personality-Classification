// SPAWNPOINT — the diagnostic questionnaire (24 queries, version 1).
// Isomorphic: the browser scores the run instantly; the server re-scores with
// this exact module before persisting, so the client is never trusted.
//
// Option weights are evidence points FOR an archetype. Three axes of the Great
// Map are fed indirectly: e.g. points for CONQUEROR pull one way, WAYFARER the
// other. Slider queries contribute |value - 50|/50 * 3 evidence toward the pole
// at the "toward" end (below a 10% offset they count as a neutral shrug).

export const QUIZ_VERSION = 1;

export const QUESTIONS = [
  {
    id: 'Q01',
    tag: 'CAMPFIRE CHECK',
    type: 'choice',
    prompt: "It's 11:47 PM. 'One more game' has been said three times. What actually gets you to log off?",
    options: [
      { t: 'The ladder. I stop on a win — or on a lesson.', w: { conqueror: 3 } },
      { t: 'The squad. If they are staying, I am staying.', w: { hypeman: 3 } },
      { t: 'A clean story beat. You don\u2019t quit mid-chapter.', w: { lorekeeper: 2, architect: 1 } },
      { t: 'Physics. I stop once the chair-stacking hypothesis is proven.', w: { gremlin: 3 } },
    ],
  },
  {
    id: 'Q02',
    tag: 'TWO DOORS',
    type: 'versus',
    prompt: 'A shimmering portal no guide has ever mentioned — or a door labeled BOSS, RECOMMENDED LV 30. You enter…',
    options: [
      { t: 'The portal. Obviously the portal.', w: { wayfarer: 3 } },
      { t: 'The boss door. It\u2019s progression o\u2019clock.', w: { conqueror: 3 } },
    ],
  },
  {
    id: 'Q03',
    tag: 'CALIBRATION // THE PLAN',
    type: 'slider',
    prompt: 'CALIBRATE: how long do you stare at the map before moving?',
    axis: 'order',
    toward: 'architect',
    left: 'Move first. Think later.',
    right: 'Route memorized before spawn.',
  },
  {
    id: 'Q04',
    tag: 'PATCH DAY',
    type: 'choice',
    prompt: 'A patch note reads: "Fixed an exploit that let players clip through the third wall." Your reaction?',
    options: [
      { t: 'RIP. That was load-bearing for my route.', w: { gremlin: 2 } },
      { t: 'Good. The game is as intended. Time to re-learn the meta.', w: { architect: 3 } },
      { t: 'Wait — there was lore behind that wall?', w: { lorekeeper: 2, wayfarer: 2 } },
      { t: 'Legend behavior. Whoever found it, I want them in my lobby.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q05',
    tag: 'RECEIPTS',
    type: 'choice',
    prompt: 'Your screenshots folder is mostly…',
    options: [
      { t: 'Scoreboards. Receipts.', w: { conqueror: 3 } },
      { t: 'Vistas. Golden hour on a fake planet.', w: { wayfarer: 3 } },
      { t: 'My squad being completely unhinged, mid-air, on fire.', w: { gremlin: 2, hypeman: 1 } },
      { t: 'An NPC standing poignantly in the rain. It\u2019s dust. I have dust in my eye.', w: { lorekeeper: 3 } },
    ],
  },
  {
    id: 'Q06',
    tag: 'RITUALS',
    type: 'versus',
    prompt: 'Which post-game utterance is more you?',
    options: [
      { t: '"GG, well played." The ritual is the game.', w: { hypeman: 3 } },
      { t: '"W map, great rotation." I was literally studying the map.', w: { wayfarer: 3 } },
    ],
  },
  {
    id: 'Q07',
    tag: 'CALIBRATION // THE NAME TEST',
    type: 'slider',
    prompt: 'CALIBRATE: be honest — which roster do you actually know?',
    axis: 'campfire',
    toward: 'hypeman',
    left: 'Every NPC\u2019s name, and their beef with each other.',
    right: 'Every teammate\u2019s name, their dog, their dog\u2019s beef.',
  },
  {
    id: 'Q08',
    tag: 'IDEAL DLC',
    type: 'choice',
    prompt: 'The devs announce your dream DLC. It is…',
    options: [
      { t: 'A new raid plus a fresh ladder season.', w: { conqueror: 2, architect: 1 } },
      { t: 'A whole new region with zero map markers.', w: { wayfarer: 3 } },
      { t: 'A level editor with infinite undo.', w: { gremlin: 2, architect: 1 } },
      { t: 'Canon backstory for my favorite NPC.', w: { lorekeeper: 3 } },
    ],
  },
  {
    id: 'Q09',
    tag: 'LAST ALIVE',
    type: 'choice',
    prompt: 'Squad\u2019s down. You\u2019re last alive. 1v4. You…',
    options: [
      { t: 'Clutch or die trying. This is the whole game.', w: { conqueror: 3 } },
      { t: 'Do something so unhinged the enemy team salutes in spectator.', w: { gremlin: 3 } },
      { t: 'Take the L with style. It\u2019s one round — keep the vibe alive.', w: { hypeman: 2 } },
      { t: 'Realize the math said reset this fight 30 seconds ago. Next time.', w: { architect: 3 } },
    ],
  },
  {
    id: 'Q10',
    tag: 'CALIBRATION // 97% EXPLORED',
    type: 'slider',
    prompt: 'CALIBRATE: "The map is 97% explored." How does that sentence feel?',
    axis: 'valor',
    toward: 'wayfarer',
    left: 'A finished game. Cozy.',
    right: 'A tragedy. Those last 3 percent…',
  },
  {
    id: 'Q11',
    tag: 'FIRST 20 MINUTES',
    type: 'choice',
    prompt: 'You boot a brand-new game. The first twenty minutes go to…',
    options: [
      { t: 'Settings: keybinds, sensitivities, a DPS spreadsheet. We\u2019ll rush later.', w: { architect: 3 } },
      { t: 'Dying. Tutorial skipped. We learn by dying.', w: { gremlin: 2, conqueror: 1 } },
      { t: 'Talking to every NPC in the starter village. Every. One.', w: { lorekeeper: 3 } },
      { t: 'Checking crossplay so the squad can pile in tonight.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q12',
    tag: 'LOBBY TYPE',
    type: 'versus',
    prompt: 'Pick your lobby: perfectly balanced ranked — or cursed customs at 200% speed with gravity set to "feels bad."',
    options: [
      { t: 'Ranked. Balanced. Now.', w: { conqueror: 2, architect: 1 } },
      { t: 'Cursed customs. Chaos is content.', w: { gremlin: 2, hypeman: 1 } },
    ],
  },
  {
    id: 'Q13',
    tag: 'COMMUNITY DISCOURSE',
    type: 'choice',
    prompt: 'The game\u2019s community is having an enormous argument online. You…',
    options: [
      { t: 'Write the fourteen-post breakdown with frame data. Someone has to be right.', w: { architect: 3 } },
      { t: 'Just want everyone to get along and play together. Both sides have points.', w: { hypeman: 2, lorekeeper: 1 } },
      { t: 'Ignore it. I\u2019m 60 hours deep in the swamp, cataloguing frogs.', w: { wayfarer: 2, lorekeeper: 1 } },
      { t: 'Post the cursed clip that started it. I have it. In 4K.', w: { gremlin: 3 } },
    ],
  },
  {
    id: 'Q14',
    tag: 'FRIENDS LIST',
    type: 'choice',
    prompt: 'Describe your friends list.',
    options: [
      { t: 'Two hundred deep. I remember how we met. All of them.', w: { hypeman: 3 } },
      { t: 'Small. Elite. It\u2019s a ranked duo queue, not a party.', w: { conqueror: 3 } },
      { t: 'Half of it is NPCs and I stand by that.', w: { lorekeeper: 3 } },
      { t: 'I appear, cause chaos, vanish. They know what I am.', w: { gremlin: 3 } },
    ],
  },
  {
    id: 'Q15',
    tag: 'PICK A LOADOUT',
    type: 'choice',
    prompt: 'One loadout for the rest of your gaming life. You take…',
    options: [
      { t: 'Glass cannon. All damage. No plan needed — only follow-through.', w: { conqueror: 3 } },
      { t: 'Grappling hook. Not for combat — for seeing what\u2019s up there.', w: { wayfarer: 3 } },
      { t: 'Toolkit: traps, turrets, spreadsheets. The build plays itself. I conduct.', w: { architect: 3 } },
      { t: 'The most cursed skin plus an emote wheel with one emote: "oops."', w: { gremlin: 3 } },
      { t: 'Support kit. Buffs for days. My win is the team\u2019s win.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q16',
    tag: 'TWELVE MINUTES',
    type: 'choice',
    prompt: 'Someone speedruns your favorite game in twelve minutes. You…',
    options: [
      { t: 'Grieve. They raced past an entire world. That\u2019s a crime scene.', w: { wayfarer: 2, lorekeeper: 2 } },
      { t: 'Respect it — my ladder points remain superior.', w: { conqueror: 2 } },
      { t: 'Study the route. The optimization is the art.', w: { architect: 3 } },
      { t: 'Try it immediately. End up in the ocean. Worth it.', w: { gremlin: 3 } },
    ],
  },
  {
    id: 'Q17',
    tag: 'DROP SPOT',
    type: 'choice',
    prompt: 'The match starts. Where do you drop?',
    options: [
      { t: 'Hot drop. Let\u2019s find out who\u2019s built different.', w: { conqueror: 3 } },
      { t: 'Far map edge. Nobody loots a mountain. I loot the mountain view.', w: { wayfarer: 3 } },
      { t: 'Wherever the squad lands. My home is people.', w: { hypeman: 3 } },
      { t: 'The mathematically optimal loot route, obviously.', w: { architect: 3 } },
    ],
  },
  {
    id: 'Q18',
    tag: 'STORY SOURCE',
    type: 'versus',
    prompt: 'The best gaming stories come from…',
    options: [
      { t: 'A perfectly executed plan. The build order IS the story.', w: { architect: 3 } },
      { t: 'A plan on fire. Screaming. Somewhere, a chair is airborne.', w: { gremlin: 3 } },
    ],
  },
  {
    id: 'Q19',
    tag: 'THE UNFINISHED ROOM',
    type: 'choice',
    prompt: 'You clip into a hidden area: placeholder cubes, dev text on the walls, no loot. You…',
    options: [
      { t: 'Screenshot every corner. This is found footage and I am the archivist.', w: { wayfarer: 3 } },
      { t: 'Report it properly. The game must be balanced.', w: { architect: 3 } },
      { t: 'Feel eerie. What WAS this place? Already writing the fanfic.', w: { lorekeeper: 3 } },
      { t: 'Summon the squad. Everyone must see this immediately.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q20',
    tag: 'THE ALGORITHM',
    type: 'choice',
    prompt: 'The gaming creators you actually watch, past midnight, are…',
    options: [
      { t: 'Lore deep-divers reading every item description out loud.', w: { lorekeeper: 3 } },
      { t: 'Top-500 grinders VOD-reviewing their own ranked games.', w: { conqueror: 3 } },
      { t: 'Sandbox gremlins assembling machines the devs did not intend.', w: { gremlin: 3 } },
      { t: 'Co-op crews — it\u2019s the chemistry, not the game.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q21',
    tag: 'THE FINAL SCREEN',
    type: 'versus',
    prompt: 'The perfect ending to your favorite game is…',
    options: [
      { t: 'Credits rolling over the aftermath. Epilogues for everyone. You need a minute.', w: { lorekeeper: 3 } },
      { t: 'Your name on the ladder. Permanently. Forever.', w: { conqueror: 3 } },
    ],
  },
  {
    id: 'Q22',
    tag: 'THE FOURTH FETCH QUEST',
    type: 'choice',
    prompt: 'An NPC asks you to fetch something for the fourth time in a row. You…',
    options: [
      { t: 'Do it. There\u2019s a payoff at the end of this arc. There HAS to be.', w: { lorekeeper: 3 } },
      { t: 'Refuse creatively. I have standards and access to the physics engine.', w: { gremlin: 3 } },
      { t: 'Check if it unlocks the best-ending route first. Efficiency.', w: { architect: 3 } },
      { t: 'Accept — a fetch quest is just a podcast with movement required.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q23',
    tag: 'THE 5% MOUNT',
    type: 'choice',
    prompt: 'A rare mount drops from a boss at a 5% rate. You…',
    options: [
      { t: 'Run it until it drops. The mount fears my schedule.', w: { conqueror: 2, architect: 1 } },
      { t: 'Ride whatever crosses my path. The ride was the point.', w: { wayfarer: 3 } },
      { t: 'Breed the two ugliest mounts into something cursed yet majestic.', w: { gremlin: 3 } },
      { t: 'Organize a forty-person guild run. Everyone gets one. EVERYONE.', w: { hypeman: 3 } },
    ],
  },
  {
    id: 'Q24',
    tag: 'THE REAL QUESTION',
    type: 'choice',
    prompt: 'Strip it all away — the meta, the patch notes, the party. Why do you actually play?',
    options: [
      { t: 'To be the best.', w: { conqueror: 3 } },
      { t: 'To see what\u2019s out there.', w: { wayfarer: 3 } },
      { t: 'To understand how it all works.', w: { architect: 3 } },
      { t: 'To see what breaks.', w: { gremlin: 3 } },
      { t: 'To feel the story.', w: { lorekeeper: 3 } },
      { t: 'To be with my people.', w: { hypeman: 3 } },
    ],
  },
];

// Slider queries: evidence below this |offset| counts as a neutral shrug.
export const SLIDER_NEUTRAL = 0.2;
export const SLIDER_MAX_EVIDENCE = 3;
