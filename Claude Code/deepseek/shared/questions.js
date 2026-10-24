/**
 * SPAWNPOINT — the question bank.
 *
 * 24 questions, four options each. Every option carries a sparse weight map
 * over the six archetypes. Weights are *relative*: the client and server both
 * normalise them, so you can write `{ competitor: 2, architect: 1 }` and trust
 * that the option contributes 2/3 to Competitor and 1/3 to Architect.
 *
 * Design rules used when authoring these:
 *   - Never ask a question the player can "guess the right answer" to.
 *   - Every option should be something a real person would actually pick.
 *   - At least one option per question should be funny, and one should sting
 *     a little bit because it's true.
 *
 * `intensity` (1-3) is how strongly the option signals. 3 = "this is my whole
 * personality", 1 = "sure, sometimes". It scales the option's total weight.
 */

export const QUESTIONS = [
  {
    id: 'q01',
    prompt: 'The character creation screen loads.',
    sub: 'You have been in here for eleven minutes. It shows.',
    options: [
      { label: 'Preset. The face is behind a helmet 90% of the time.', w: { competitor: 2, architect: 1 }, intensity: 2 },
      { label: 'Straight to the stat page — I need to know what the numbers actually do.', w: { architect: 3, curator: 1 }, intensity: 2 },
      { label: 'Two hours. Hair physics. A backstory nobody will ever read.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Wiki open in a second tab: does this race lock me out of any missables?', w: { curator: 3, architect: 1 }, intensity: 3 },
    ],
  },
  {
    id: 'q02',
    prompt: 'Forty hours in, a stranger tells you the main quest is in an entirely different region.',
    sub: '',
    options: [
      { label: 'Different region? There is a different region?', w: { wanderer: 3 }, intensity: 2 },
      { label: 'That tracks. I have been doing side content since hour two.', w: { wanderer: 2, curator: 1 }, intensity: 3 },
      { label: 'Good. I was starting to run out of things to tick off.', w: { curator: 3 }, intensity: 2 },
      { label: 'I will get there. I am currently three tiers deep in a crafting tree.', w: { architect: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q03',
    prompt: 'The boss has killed you eleven times.',
    sub: 'Attempt twelve is loading.',
    options: [
      { label: 'Again. Faster this time. I felt the dodge window.', w: { competitor: 3 }, intensity: 2 },
      { label: 'Stop. Read the move list. Come back with a plan and the right resistances.', w: { architect: 3 }, intensity: 3 },
      { label: 'Turn the difficulty down and enjoy the rest of the story.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Ask a friend to co-op it with me. Preferably one who is better than me.', w: { connector: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q04',
    prompt: 'A brand new multiplayer game drops. Your honest first move:',
    sub: '',
    options: [
      { label: 'Ranked. Immediately. Let me see where I actually stand.', w: { competitor: 3 }, intensity: 3 },
      { label: 'Watch 40 minutes of guides before I touch it.', w: { architect: 2, curator: 1 }, intensity: 2 },
      { label: 'Load into a private lobby with the group and figure it out together.', w: { connector: 3 }, intensity: 3 },
      { label: 'Pick the weirdest character nobody is playing and see what happens.', w: { wanderer: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q05',
    prompt: 'A rare drop lands. It is a duplicate of something already in your inventory.',
    sub: '',
    options: [
      { label: 'Stats are better? Equip. Stats are worse? Vault. Next.', w: { architect: 2, competitor: 1 }, intensity: 2 },
      { label: 'Into the collection. The set is the point, not the item.', w: { curator: 3 }, intensity: 3 },
      { label: 'Trade it to whoever in the group needs it.', w: { connector: 3 }, intensity: 3 },
      { label: 'Nice. I will find a use for it eventually. Probably.', w: { wanderer: 2 }, intensity: 1 },
    ],
  },
  {
    id: 'q06',
    prompt: 'There is a mountain on the horizon with clearly nothing on it.',
    sub: 'No marker. No quest. No reason.',
    options: [
      { label: 'I am going to the top of that mountain.', w: { wanderer: 3 }, intensity: 3 },
      { label: 'There is definitely something on it. There is always something on it.', w: { curator: 3, wanderer: 1 }, intensity: 3 },
      { label: 'Check the map. If it is not on the map, it is not content.', w: { architect: 2, competitor: 1 }, intensity: 2 },
      { label: 'Only if someone comes with me.', w: { connector: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q07',
    prompt: 'A friend asks you to play a game you have never heard of.',
    sub: '',
    options: [
      { label: 'Installing. Send the invite.', w: { connector: 3 }, intensity: 3 },
      { label: 'What is the win condition? Is there a ranked mode?', w: { competitor: 3 }, intensity: 2 },
      { label: 'Sure, but I am reading about it first so I am not dead weight.', w: { architect: 3 }, intensity: 2 },
      { label: 'Only if I can play it my own way and not follow a guide.', w: { wanderer: 2, storyteller: 1 }, intensity: 2 },
    ],
  },
  {
    id: 'q08',
    prompt: 'The puzzle requires a mechanic you have never used once.',
    sub: 'The tutorial for it was nineteen hours ago.',
    options: [
      { label: 'Try things until it clicks. That is what the mechanic is for.', w: { wanderer: 3 }, intensity: 2 },
      { label: 'Menu. Ability list. Read everything. The answer is in the UI.', w: { architect: 3 }, intensity: 3 },
      { label: 'Look it up. I am not spending my evening on this.', w: { competitor: 2, connector: 1 }, intensity: 2 },
      { label: 'Honestly? The room is beautiful. I will figure it out later.', w: { storyteller: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q09',
    prompt: 'The game lets you change the difficulty at any time.',
    sub: 'Nothing is locked behind it.',
    options: [
      { label: 'Leave it. Easier is not the same game.', w: { competitor: 3 }, intensity: 2 },
      { label: 'Bump it up one notch — I want to be forced to engage with the systems.', w: { architect: 3 }, intensity: 2 },
      { label: 'Whatever keeps the story moving. I am here for the story.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'I will change it per-boss and feel zero guilt about it.', w: { wanderer: 2, curator: 1 }, intensity: 1 },
    ],
  },
  {
    id: 'q10',
    prompt: 'You just won an absurdly close match. Voice chat erupts.',
    sub: '',
    options: [
      { label: 'That is the whole reason I play. Run it back.', w: { connector: 3, competitor: 1 }, intensity: 3 },
      { label: 'Clip it. I want to watch my own clutch back in slow motion.', w: { competitor: 3 }, intensity: 2 },
      { label: 'I am already opening the stats screen to see what I could have done better.', w: { architect: 3 }, intensity: 2 },
      { label: 'Chat for ten more minutes, then someone suggests a totally different game.', w: { connector: 3, wanderer: 1 }, intensity: 3 },
    ],
  },
  {
    id: 'q11',
    prompt: 'There is a hidden achievement called "???" with no description.',
    sub: 'Nobody in the community has unlocked it.',
    options: [
      { label: 'I am going to be the one who unlocks it. Bookmark me.', w: { competitor: 2, curator: 2 }, intensity: 3 },
      { label: 'Spreadsheet. Datamine. Community Discord. I will find it systematically.', w: { architect: 3 }, intensity: 3 },
      { label: 'It is probably behind a lore thing. Let me reread the codex entries.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'It goes on my list. The list is long. It does not care about ???.', w: { curator: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q12',
    prompt: 'The credits roll on a 60-hour game.',
    sub: '',
    options: [
      { label: 'New game plus. I want to see the numbers go higher.', w: { competitor: 2, curator: 2 }, intensity: 2 },
      { label: 'Sit with it. That ending is going to live in my head for weeks.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Check the completion percentage. There is unfinished business.', w: { curator: 3 }, intensity: 3 },
      { label: 'Uninstall, and start something completely new tomorrow.', w: { wanderer: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q13',
    prompt: 'Free evening. No plans. Nobody online.',
    sub: '',
    options: [
      { label: 'Ranked solo queue. Tonight I climb.', w: { competitor: 3 }, intensity: 2 },
      { label: 'Finally finish that survival base I have been designing in my head.', w: { architect: 3 }, intensity: 2 },
      { label: 'Start a new save of a game I have already finished twice.', w: { storyteller: 2, curator: 1 }, intensity: 3 },
      { label: 'Boot up an exploration game and just walk in one direction.', w: { wanderer: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q14',
    prompt: 'Patch notes drop. Your main just got nerfed.',
    sub: '',
    options: [
      { label: 'Read every line. Recalculate the build. Adapt by tomorrow.', w: { architect: 3 }, intensity: 3 },
      { label: 'Good. Now winning means something again.', w: { competitor: 3 }, intensity: 2 },
      { label: 'Swap to whatever looks funniest and treat it as a fresh playthrough.', w: { wanderer: 3 }, intensity: 2 },
      { label: 'Wait for the hotfix and play something else with the group meanwhile.', w: { connector: 2, curator: 1 }, intensity: 2 },
    ],
  },
  {
    id: 'q15',
    prompt: 'Someone in your lobby is being loudly, joyfully terrible at the game.',
    sub: '',
    options: [
      { label: 'I am going to coach them. Quietly. Kindly. Relentlessly.', w: { connector: 2, architect: 2 }, intensity: 3 },
      { label: 'Fine, but we are losing this one and I am muting.', w: { competitor: 3 }, intensity: 2 },
      { label: 'This is the funniest thing that has happened all week. Keep them.', w: { connector: 3 }, intensity: 3 },
      { label: 'Leave the lobby. I have limited time and this is not it.', w: { architect: 3 }, intensity: 1 },
    ],
  },
  {
    id: 'q16',
    prompt: 'Two games, same price. One is 12 brilliant hours. One is 200 pretty good ones.',
    sub: '',
    options: [
      { label: '12 hours. I want the punch, not the treadmill.', w: { storyteller: 3 }, intensity: 2 },
      { label: '200. Every hour is another chance to get good at it.', w: { competitor: 2, curator: 2 }, intensity: 2 },
      { label: '200. I want a world that is still hiding things from me in month three.', w: { wanderer: 3 }, intensity: 3 },
      { label: 'Which one can I play with other people? That one.', w: { connector: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q17',
    prompt: 'Your save corrupts. Sixty hours, gone.',
    sub: '',
    options: [
      { label: 'Start over tonight. Speedrun it to where I was by the weekend.', w: { competitor: 3, architect: 1 }, intensity: 3 },
      { label: 'Devastating. I need a few days. Some of that was a *performance*.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Do I have a backup? Do I have a *system* of backups? I will now.', w: { architect: 2, curator: 2 }, intensity: 2 },
      { label: 'Genuinely? Relief. A reason to see a new part of the map.', w: { wanderer: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q18',
    prompt: 'There is a locked door. There is no key anywhere. There is no quest marker.',
    sub: '',
    options: [
      { label: 'It has to open eventually. I am writing down the room layout.', w: { architect: 2, curator: 2 }, intensity: 3 },
      { label: 'I will spend the entire session on this door. It is personal now.', w: { competitor: 3, architect: 1 }, intensity: 2 },
      { label: 'Beautiful bit of environmental storytelling. It might never open.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Leave it. There are four unexplored paths I could take instead.', w: { wanderer: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q19',
    prompt: 'You are winning 10–0 with four minutes left.',
    sub: '',
    options: [
      { label: 'Run up the score. I do not know how to do anything else.', w: { competitor: 3 }, intensity: 3 },
      { label: 'Relax and let the other player have a nice time.', w: { connector: 3 }, intensity: 2 },
      { label: 'Start experimenting with stuff I would never try in a close match.', w: { wanderer: 3 }, intensity: 2 },
      { label: 'Leave a couple of collectibles for a clean sweep later.', w: { curator: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q20',
    prompt: 'The game ships with a codex, a character journal and collectible lore entries.',
    sub: '',
    options: [
      { label: 'Read all of it, in order, properly.', w: { storyteller: 3 }, intensity: 3 },
      { label: 'Collect all of it, in order, properly.', w: { curator: 3 }, intensity: 3 },
      { label: 'Skim it for mechanics hints I can use. Skip the prose.', w: { architect: 3 }, intensity: 2 },
      { label: 'Skim it out loud to my friends in a silly voice.', w: { connector: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q21',
    prompt: 'Your squad wants to run a strategy you are fairly sure is bad.',
    sub: '',
    options: [
      { label: 'Bring the numbers. Show them why it fails against a competent opponent.', w: { architect: 3 }, intensity: 2 },
      { label: 'Sure. Losing with friends beats winning with strangers.', w: { connector: 3 }, intensity: 3 },
      { label: 'Fine by me. Chaos is a legitimate strategy and it is fun.', w: { wanderer: 2, connector: 1 }, intensity: 1 },
      { label: 'Argue for three minutes, then do it my way and win the round.', w: { competitor: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q22',
    prompt: 'Endless mode. No win condition, no timer, it just keeps going.',
    sub: '',
    options: [
      { label: 'Then I make my own condition, and I make it brutal.', w: { competitor: 3 }, intensity: 3 },
      { label: 'Time to build something enormous and completely unnecessary.', w: { architect: 3 }, intensity: 2 },
      { label: 'I will wander until I hit the edge of what the game can generate.', w: { wanderer: 3 }, intensity: 3 },
      { label: 'Perfect streaming game. Everyone watches, nobody plays.', w: { connector: 3 }, intensity: 3 },
    ],
  },
  {
    id: 'q23',
    prompt: 'Someone asks, genuinely, why you play games.',
    sub: '',
    options: [
      { label: 'To be good at something. Simple as that.', w: { competitor: 3 }, intensity: 3 },
      { label: 'To be inside a world I cannot get to any other way.', w: { storyteller: 3, wanderer: 1 }, intensity: 3 },
      { label: 'To be somewhere with the people I like, doing something silly.', w: { connector: 3 }, intensity: 3 },
      { label: 'To have a thing that is entirely, satisfyingly mine.', w: { curator: 3 }, intensity: 2 },
    ],
  },
  {
    id: 'q24',
    prompt: 'A new season starts. The meta is unrecognisable.',
    sub: '',
    options: [
      { label: 'Fresh ladder. This is the good part.', w: { competitor: 3 }, intensity: 3 },
      { label: 'New systems to learn? Excellent. Where is the theorycrafting thread.', w: { architect: 3 }, intensity: 3 },
      { label: 'I will play my old build anyway and see how far it goes.', w: { storyteller: 2, curator: 1 }, intensity: 1 },
      { label: 'New map, new corners, new things to find before anyone else does.', w: { wanderer: 3 }, intensity: 3 },
    ],
  },
];

export const QUESTIONS_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Sanity check used by the test suite: every archetype must be reachable. */
export function optionCoverage() {
  const cover = {};
  for (const q of QUESTIONS) {
    for (const o of q.options) {
      for (const k of Object.keys(o.w)) cover[k] = (cover[k] || 0) + 1;
    }
  }
  return cover;
}
