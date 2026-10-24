/**
 * The instrument: 24 situations, 8 on each opposing pair.
 * Weights stay on that pair so every signal has the same ceiling.
 * Echoes are private. The public quiz payload strips them.
 */

export const CONTENT_VERSION = 1;

export const AXES = [
  {
    id: 'composition',
    label: 'Composition',
    hint: 'Planned and improvised',
    pos: 'architect',
    neg: 'wildcard',
  },
  {
    id: 'destination',
    label: 'Destination',
    hint: 'Victory and wandering',
    pos: 'laureate',
    neg: 'nomad',
  },
  {
    id: 'company',
    label: 'Company',
    hint: 'Shared and solitary',
    pos: 'chorus',
    neg: 'shade',
  },
];

export const COPY = {
  architect: {
    blurb: 'You treat a game as a system that can be learned, named, and finally made to behave.',
    play: ['Remaps, rebuilds, and rereads', 'One variable at a time', 'Notes you trust more than panic'],
  },
  wildcard: {
    blurb: 'You are here to see what the game does when you refuse to be reasonable.',
    play: ['Funny talents and bad modifiers', 'Theories tested in live fire', 'The stupid idea, kept on retainer'],
  },
  laureate: {
    blurb: 'The result matters, and you like it sharp, public, and a little harder than last time.',
    play: ['One more ranked set', 'Endings, badges, clean closes', 'A win with a signature on it'],
  },
  nomad: {
    blurb: 'You follow the part of the map that forgot to justify itself.',
    play: ['Markers off, horizons on', 'Side rooms before the credits', 'Sessions that dissolve instead of finish'],
  },
  chorus: {
    blurb: 'A game is a room. A room with nobody in it is just a menu you can hear.',
    play: ['You bail into the party queue', 'Voice on, clips already flying', 'Teaching by walking with someone'],
  },
  shade: {
    blurb: 'You prefer the version of the game that does not know you have friends.',
    play: ['Muted, or never joined', 'Private folders, private endings', 'Help sent as a letter, not a lobby'],
  },
};

/** Affinity presets for the cover instrument. Scored by the real model. */
export const DEMOS = [
  {
    id: 'draft',
    affinity: { architect: 0.92, wildcard: 0.08, laureate: 0.18, nomad: 0.16, chorus: 0.1, shade: 0.78 },
  },
  {
    id: 'squad',
    affinity: { architect: 0.12, wildcard: 0.1, laureate: 0.9, nomad: 0.08, chorus: 0.86, shade: 0.1 },
  },
  {
    id: 'detour',
    affinity: { architect: 0.1, wildcard: 0.84, laureate: 0.12, nomad: 0.9, chorus: 0.14, shade: 0.2 },
  },
  {
    id: 'still',
    affinity: { architect: 0.74, wildcard: 0.72, laureate: 0.7, nomad: 0.73, chorus: 0.71, shade: 0.75 },
  },
];

export const QUESTIONS = [
  {
    id: 'q01',
    axis: 'composition',
    kicker: 'First boot',
    prompt: 'The install bar hits the end. Nobody is waiting on you. What is the first move?',
    options: [
      {
        id: 'a',
        text: 'Settings. Kill the tutorials, remap the awkward key, then earn the right to play.',
        weights: { architect: 3 },
        echo: 'open the settings before you let yourself play',
      },
      {
        id: 'b',
        text: 'Mash through the intro and press the button the tooltip has not mentioned yet.',
        weights: { wildcard: 3 },
        echo: 'press the button the tooltip has not earned yet',
      },
      {
        id: 'c',
        text: 'Skim the controls, change the one binding that already annoys you, and get in.',
        weights: { architect: 2 },
        echo: 'change a single binding and then get on with it',
      },
      {
        id: 'd',
        text: 'Start blind. Open a menu only after the game has personally offended you.',
        weights: { wildcard: 2 },
        echo: 'start blind and open a menu only after the game offends you',
      },
    ],
  },
  {
    id: 'q02',
    axis: 'composition',
    kicker: 'The build',
    prompt: 'A new character. A blank talent tree. Twelve points, and a little too much freedom.',
    options: [
      {
        id: 'a',
        text: 'You take the talent that sounds funniest and agree to live with the consequences.',
        weights: { wildcard: 3 },
        echo: 'pick a talent because it sounds funny',
      },
      {
        id: 'b',
        text: 'You already read two guides. You are here to execute the correct one.',
        weights: { architect: 3 },
        echo: 'arrive with the build already decided',
      },
      {
        id: 'c',
        text: 'You click whatever is glowing and trust the next boss to be your editor.',
        weights: { wildcard: 2 },
        echo: 'spend points on whatever is glowing',
      },
      {
        id: 'd',
        text: 'You sketch a build that should work, and leave one point unspent for later evidence.',
        weights: { architect: 2 },
        echo: 'leave a talent point unspent until the game gives you evidence',
      },
    ],
  },
  {
    id: 'q03',
    axis: 'composition',
    kicker: 'Stuck',
    prompt: 'Forty minutes on the same fight. Pride is now one of the mechanics.',
    options: [
      {
        id: 'a',
        text: 'You pause, write down what killed you, and change exactly one variable.',
        weights: { architect: 3 },
        echo: 'change one variable at a time until a fight confesses',
      },
      {
        id: 'b',
        text: 'You look up the mechanic, then close the tab before it can spoil the rest.',
        weights: { architect: 2 },
        echo: 'look up one mechanic and close the tab before it spoils the rest',
      },
      {
        id: 'c',
        text: 'You change every variable at once, including your dignity, and slam the door again.',
        weights: { wildcard: 3 },
        echo: 'change everything at once and kick the door back in',
      },
      {
        id: 'd',
        text: 'You try the idea you joked about, because the sensible ones have already failed.',
        weights: { wildcard: 2 },
        echo: 'try the joke strategy once the sensible ones fail',
      },
    ],
  },
  {
    id: 'q04',
    axis: 'composition',
    kicker: 'The patch',
    prompt: 'A giant balance patch drops an hour before you play. The notes are long. The queue is not.',
    options: [
      {
        id: 'a',
        text: 'You ignore the notes and queue, planning to meet the meta by becoming its victim.',
        weights: { wildcard: 3 },
        echo: 'skip the patch notes and let the meta hit you in the face',
      },
      {
        id: 'b',
        text: 'You read the notes beside a spreadsheet you pretend is not a spreadsheet.',
        weights: { architect: 3 },
        echo: 'read the patch notes with a spreadsheet open beside them',
      },
      {
        id: 'c',
        text: 'You read one outrageous nerf out loud and immediately try to make it work anyway.',
        weights: { wildcard: 2 },
        echo: 'pick the nerfed thing and try to make it work out of spite',
      },
      {
        id: 'd',
        text: 'You read the three lines about your main and rebuild around them before you queue.',
        weights: { architect: 2 },
        echo: 'rebuild around the three patch lines that mention your main',
      },
    ],
  },
  {
    id: 'q05',
    axis: 'composition',
    kicker: 'The stash',
    prompt: 'Inventory is full. A strong drop lands, cousin to six you already refuse to vendor.',
    options: [
      {
        id: 'a',
        text: 'You sort by a rule, vendor with that rule, and keep the piece that completes a set.',
        weights: { architect: 3 },
        echo: 'vendor by a rule instead of a feeling',
      },
      {
        id: 'b',
        text: 'You spend ten minutes on two numbers, then keep both and delete a trophy instead.',
        weights: { architect: 2 },
        echo: 'compare two numbers for ten minutes and still keep both',
      },
      {
        id: 'c',
        text: 'You make a dramatic pile on the ground and pick up whatever you remember loving.',
        weights: { wildcard: 3 },
        echo: 'solve a full inventory by making a pile and vibing it',
      },
      {
        id: 'd',
        text: 'You equip the new one immediately, stats unread, because it looks like a decision.',
        weights: { wildcard: 2 },
        echo: 'equip a drop before you have read the stats',
      },
    ],
  },
  {
    id: 'q06',
    axis: 'composition',
    kicker: 'A hidden rule',
    prompt: 'You suspect the game has a system it never bothered to explain.',
    options: [
      {
        id: 'a',
        text: 'You spam the input in a live match to see if anything spectacular happens.',
        weights: { wildcard: 3 },
        echo: 'test a theory in a live match where everyone can watch it fail',
      },
      {
        id: 'b',
        text: 'You test it in a quiet corner, one input at a time, until it repeats.',
        weights: { architect: 3 },
        echo: 'test a hidden rule one input at a time',
      },
      {
        id: 'c',
        text: 'You commit to the half-proven theory mid-fight and let the result be embarrassing.',
        weights: { wildcard: 2 },
        echo: 'commit to a half-proven theory in the middle of a fight',
      },
      {
        id: 'd',
        text: 'You confirm the rule, then fold it into the way you play from the next attempt on.',
        weights: { architect: 2 },
        echo: 'confirm a hidden rule and then play as if it had always been documented',
      },
    ],
  },
  {
    id: 'q07',
    axis: 'composition',
    kicker: 'The sandbox',
    prompt: 'There is a creative mode, a mod menu, or a private lobby with the safeties unscrewed.',
    options: [
      {
        id: 'a',
        text: 'You build a small test range so you can measure the thing that has been bothering you.',
        weights: { architect: 3 },
        echo: 'build a test range just to measure one annoying thing',
      },
      {
        id: 'b',
        text: 'You recreate a tricky encounter so you can practice the correct answer in peace.',
        weights: { architect: 2 },
        echo: 'rebuild a tricky encounter just to practice the correct answer',
      },
      {
        id: 'c',
        text: 'You spawn the biggest object available and see if the physics have a sense of humor.',
        weights: { wildcard: 3 },
        echo: 'spawn the biggest object just to see if the physics flinches',
      },
      {
        id: 'd',
        text: 'You invent a house rule the mode was not designed for, and you play that instead.',
        weights: { wildcard: 2 },
        echo: 'invent a house rule the mode was not built to allow',
      },
    ],
  },
  {
    id: 'q08',
    axis: 'composition',
    kicker: 'Assists',
    prompt: 'The difficulty menu is full of kindly switches. Some of them are also dares.',
    options: [
      {
        id: 'a',
        text: 'You turn on every absurd modifier that makes the game worse, and funnier.',
        weights: { wildcard: 3 },
        echo: 'flip on the modifiers that make the game worse on purpose',
      },
      {
        id: 'b',
        text: 'You turn the assists off, then negotiate one back if a specific fight argues for it.',
        weights: { architect: 3 },
        echo: 'turn the assists off and negotiate them back one at a time',
      },
      {
        id: 'c',
        text: 'You randomize the modifiers, or the closest thing to it, and accept the first screen.',
        weights: { wildcard: 2 },
        echo: 'randomize the modifiers and live with the first screen',
      },
      {
        id: 'd',
        text: 'You pick the intended difficulty and leave the menu alone for the rest of the game.',
        weights: { architect: 2 },
        echo: 'pick the intended difficulty and never reopen the menu',
      },
    ],
  },
  {
    id: 'q09',
    axis: 'destination',
    kicker: 'One more',
    prompt: 'You told yourself you would stop ten minutes ago. The game is still open. So are you.',
    options: [
      {
        id: 'a',
        text: 'You queue one more ranked set. Stopping on a loss is not a real stop.',
        weights: { laureate: 3 },
        echo: 'queue one more ranked game because a loss is not where you stop',
      },
      {
        id: 'b',
        text: 'You ignore the objective and walk toward a shape on the horizon.',
        weights: { nomad: 3 },
        echo: 'ignore the objective and walk toward a shape on the horizon',
      },
      {
        id: 'c',
        text: 'You play one clean exhibition, just to end the night on something sharp.',
        weights: { laureate: 2 },
        echo: 'end the night on one clean exhibition instead of a sloppy queue',
      },
      {
        id: 'd',
        text: 'You open the quietest corner of the map and let the session dissolve there.',
        weights: { nomad: 2 },
        echo: 'end a session by dissolving into the quietest corner of the map',
      },
    ],
  },
  {
    id: 'q10',
    axis: 'destination',
    kicker: 'Three losses',
    prompt: 'Three ranked losses in a row. The night could still be rescued, or abandoned with dignity.',
    options: [
      {
        id: 'a',
        text: 'You leave the mode entirely and go do something with no score attached.',
        weights: { nomad: 3 },
        echo: 'abandon the mode with a score and go where nothing is counted',
      },
      {
        id: 'b',
        text: 'You queue again before the tilt has time to become a personality.',
        weights: { laureate: 3 },
        echo: 'queue again before a losing streak becomes a personality',
      },
      {
        id: 'c',
        text: 'You switch to a side activity you owe nothing, and let the rank cool off alone.',
        weights: { nomad: 2 },
        echo: 'switch to a side activity the moment a streak gets personal',
      },
      {
        id: 'd',
        text: 'You watch the last fight once, name the mistake, and queue.',
        weights: { laureate: 2 },
        echo: 'name the mistake out loud and queue again',
      },
    ],
  },
  {
    id: 'q11',
    axis: 'destination',
    kicker: 'The checklist',
    prompt: 'An achievement asks for a tedious, specific, deeply unbeautiful thing.',
    options: [
      {
        id: 'a',
        text: 'You do it. An empty checkbox is loud, and completion is a kind of appetite.',
        weights: { laureate: 3 },
        echo: 'grind the tedious achievement because an empty checkbox feels loud',
      },
      {
        id: 'b',
        text: 'You read it, laugh once, and never think about it again.',
        weights: { nomad: 3 },
        echo: 'read an achievement and let it die',
      },
      {
        id: 'c',
        text: 'You knock it out efficiently, because a missing hundred percent will itch later.',
        weights: { laureate: 2 },
        echo: 'clear a boring achievement because a missing hundred percent will itch',
      },
      {
        id: 'd',
        text: 'You might do it if you happen to be nearby. You will not arrange to be nearby.',
        weights: { nomad: 2 },
        echo: 'leave a tedious achievement for a visit you will never schedule',
      },
    ],
  },
  {
    id: 'q12',
    axis: 'destination',
    kicker: 'Season night',
    prompt: 'A new ranked season starts tonight. The people you know are already loud about it.',
    options: [
      {
        id: 'a',
        text: 'You are online at reset with a plan for the first ten games.',
        weights: { laureate: 3 },
        echo: 'show up at season reset with a plan for the first ten games',
      },
      {
        id: 'b',
        text: 'You wander in after the wolves have thinned out. The season can start without you.',
        weights: { nomad: 3 },
        echo: 'let a new season start without you and wander in later',
      },
      {
        id: 'c',
        text: 'You push placements hard, then relax once the badge looks like you.',
        weights: { laureate: 2 },
        echo: 'push placements until the badge looks like you, then exhale',
      },
      {
        id: 'd',
        text: 'You poke the new map for the art and the weird spawns. Rank stays untouched.',
        weights: { nomad: 2 },
        echo: 'tour a new season for the art and leave the rank untouched',
      },
    ],
  },
  {
    id: 'q13',
    axis: 'destination',
    kicker: 'The marker',
    prompt: 'An open world puts a glowing path on the ground, helpful as a hand on your shoulder.',
    options: [
      {
        id: 'a',
        text: 'You turn the path off, or look away from it, the moment you notice it working.',
        weights: { nomad: 3 },
        echo: 'turn the guiding path off the moment it starts helping',
      },
      {
        id: 'b',
        text: 'You follow it. Arriving is the pleasure, and you like being good at it.',
        weights: { laureate: 3 },
        echo: 'follow the glowing path because arriving is the pleasure',
      },
      {
        id: 'c',
        text: 'You follow it until something unlisted looks better, which is almost immediately.',
        weights: { nomad: 2 },
        echo: 'leave a guiding path the first time something unlisted looks better',
      },
      {
        id: 'd',
        text: 'You follow it, and you clear every marked optional on the way. Thorough victory.',
        weights: { laureate: 2 },
        echo: 'follow the path and clear every marked optional on the way',
      },
    ],
  },
  {
    id: 'q14',
    axis: 'destination',
    kicker: 'The lobby',
    prompt: 'You are, unfortunately, the best player currently in this lobby. Everyone can feel it.',
    options: [
      {
        id: 'a',
        text: 'You play it correctly and try to end it. A clean win is the whole pleasure.',
        weights: { laureate: 3 },
        echo: 'try to close a won lobby faster instead of playing with it',
      },
      {
        id: 'b',
        text: 'You wander off to look at something and let the match become scenery.',
        weights: { nomad: 3 },
        echo: 'get bored of winning and wander off inside the match',
      },
      {
        id: 'c',
        text: 'You add a little signature. A win should be recognizable as yours.',
        weights: { laureate: 2 },
        echo: 'add a signature to a win that was already safe',
      },
      {
        id: 'd',
        text: 'You stop chasing the objective and go see if the map edge does anything.',
        weights: { nomad: 2 },
        echo: 'leave a secured win to go inspect the map edge',
      },
    ],
  },
  {
    id: 'q15',
    axis: 'destination',
    kicker: 'The shop',
    prompt: 'The store rotates a beautiful cosmetic and a boring, powerful upgrade. You can afford one.',
    options: [
      {
        id: 'a',
        text: 'You buy the cosmetic and equip it somewhere with no enemies, just to look.',
        weights: { nomad: 3 },
        echo: 'buy the useless beautiful thing and go where nothing can shoot you',
      },
      {
        id: 'b',
        text: 'You buy the upgrade. Beauty can wait until the win rate behaves.',
        weights: { laureate: 3 },
        echo: 'buy the upgrade and let the pretty thing wait',
      },
      {
        id: 'c',
        text: 'You buy the cosmetic. If it makes you walk somewhere new, it paid for itself.',
        weights: { nomad: 2 },
        echo: 'buy a cosmetic because it might make you walk somewhere new',
      },
      {
        id: 'd',
        text: 'You buy the upgrade, then spend twenty minutes previewing the cosmetic anyway.',
        weights: { laureate: 2 },
        echo: 'buy the upgrade and still spend twenty minutes staring at the cosmetic',
      },
    ],
  },
  {
    id: 'q16',
    axis: 'destination',
    kicker: 'The ending',
    prompt: 'You can see the credits from here. One road goes to them. Several roads do not.',
    options: [
      {
        id: 'a',
        text: 'You go straight there. An ending is a scoreboard you can touch.',
        weights: { laureate: 3 },
        echo: 'walk straight at the credits once you can see them',
      },
      {
        id: 'b',
        text: 'You turn around. The ending will keep. This side room might not.',
        weights: { nomad: 3 },
        echo: 'turn away from a visible ending to check a side room',
      },
      {
        id: 'c',
        text: 'You finish the main path, then immediately start the harder version, the plus, the remix.',
        weights: { laureate: 2 },
        echo: 'finish the story and immediately start the harder version',
      },
      {
        id: 'd',
        text: 'You delay the last mission for days. The world is nicer unfinished.',
        weights: { nomad: 2 },
        echo: 'delay the last mission because the world is nicer unfinished',
      },
    ],
  },
  {
    id: 'q17',
    axis: 'company',
    kicker: 'The ping',
    prompt: 'A friend invites you in the middle of something you were actually enjoying alone.',
    options: [
      {
        id: 'a',
        text: 'You bail. The session is better if they are in it, even halfway through.',
        weights: { chorus: 3 },
        echo: 'drop a good solo session because a friend pinged',
      },
      {
        id: 'b',
        text: 'You decline without guilt. This one is yours, and you say so.',
        weights: { shade: 3 },
        echo: 'decline a friend because the session belongs to you',
      },
      {
        id: 'c',
        text: 'You finish the next checkpoint, then you join. Company, on a timer.',
        weights: { chorus: 2 },
        echo: 'finish one checkpoint and then join the friend who pinged',
      },
      {
        id: 'd',
        text: 'You stay where you are and send a clip later, instead of your presence.',
        weights: { shade: 2 },
        echo: 'send a clip later instead of joining the call',
      },
    ],
  },
  {
    id: 'q18',
    axis: 'company',
    kicker: 'Voice',
    prompt: 'The squad wants voice chat. The game is already noisy. The question is you.',
    options: [
      {
        id: 'a',
        text: 'You stay muted, or you never join. The game audio is the company you wanted.',
        weights: { shade: 3 },
        echo: 'leave the voice channel off and keep the game audio',
      },
      {
        id: 'b',
        text: 'You join, talk, and get slightly funnier than you are in daylight.',
        weights: { chorus: 3 },
        echo: 'get on voice and become a slightly louder version of yourself',
      },
      {
        id: 'c',
        text: 'You type. Chat is plenty of friendship. A microphone is a commitment.',
        weights: { shade: 2 },
        echo: 'type instead of talking, because a microphone is a commitment',
      },
      {
        id: 'd',
        text: 'You join, mostly to listen, and you call the two things that actually matter.',
        weights: { chorus: 2 },
        echo: 'join voice mostly to listen and call the two things that matter',
      },
    ],
  },
  {
    id: 'q19',
    axis: 'company',
    kicker: 'The clip',
    prompt: 'You do something so clean you surprise yourself. The round is not over. The feeling is.',
    options: [
      {
        id: 'a',
        text: 'You save it and send it to the group chat before the round ends.',
        weights: { chorus: 3 },
        echo: 'send the clip to the group chat before the round ends',
      },
      {
        id: 'b',
        text: 'You smile alone and keep playing. A witness would make it smaller.',
        weights: { shade: 3 },
        echo: 'keep a perfect play to yourself',
      },
      {
        id: 'c',
        text: 'You save it, then retell it badly on purpose so everyone gets to laugh.',
        weights: { chorus: 2 },
        echo: 'retell a great play badly so the group can laugh at the retelling',
      },
      {
        id: 'd',
        text: 'You save it to a private folder you will rewatch once and never post.',
        weights: { shade: 2 },
        echo: 'file a perfect play in a private folder and never post it',
      },
    ],
  },
  {
    id: 'q20',
    axis: 'company',
    kicker: 'Teaching',
    prompt: 'A newer friend wants to learn the game you love. They are sincere. You are busy.',
    options: [
      {
        id: 'a',
        text: 'You build them a path, queue with them, and enjoy the version of you that explains.',
        weights: { chorus: 3 },
        echo: 'build a friend a path through a game and walk it with them',
      },
      {
        id: 'b',
        text: 'You send a kind, precise note and a link, then go back to your own session.',
        weights: { shade: 3 },
        echo: 'send a careful guide and then go back to playing alone',
      },
      {
        id: 'c',
        text: 'You hop into a private match and let them fail somewhere safe while you narrate.',
        weights: { chorus: 2 },
        echo: 'narrate a private match so a friend can fail somewhere safe',
      },
      {
        id: 'd',
        text: 'You write the guide you wish you had, late, with no plan to play it together.',
        weights: { shade: 2 },
        echo: 'write the guide you wish you had and never schedule playing it together',
      },
    ],
  },
  {
    id: 'q21',
    axis: 'company',
    kicker: 'Spoilers',
    prompt: 'Someone offers to tell you how it ends. They are already smiling like they might.',
    options: [
      {
        id: 'a',
        text: 'You let them. The shared reaction is worth more than a pristine surprise.',
        weights: { chorus: 3 },
        echo: 'take the spoiler so you can react to it with someone',
      },
      {
        id: 'b',
        text: 'You refuse, almost physically. You will meet the ending alone, and on time.',
        weights: { shade: 3 },
        echo: 'refuse a spoiler like it tried to touch you',
      },
      {
        id: 'c',
        text: 'You ask for a hint small enough to share, not the whole ending.',
        weights: { chorus: 2 },
        echo: 'ask for a hint small enough to share, not the ending',
      },
      {
        id: 'd',
        text: 'You leave the chat until you are done. Friendship can resume after the credits.',
        weights: { shade: 2 },
        echo: 'leave the chat until the credits, then resume the friendship',
      },
    ],
  },
  {
    id: 'q22',
    axis: 'company',
    kicker: 'The carry',
    prompt: 'Your team is struggling, and you can feel that you could fix it by yourself.',
    options: [
      {
        id: 'a',
        text: 'You just do it, quietly, and you skip the speech.',
        weights: { shade: 3 },
        echo: 'carry a team without making a speech about it',
      },
      {
        id: 'b',
        text: 'You shotcall. If you are going to carry, the team should get to be inside the carry.',
        weights: { chorus: 3 },
        echo: 'shotcall a carry so the whole team gets to be in it',
      },
      {
        id: 'c',
        text: 'You mute the complaints and play your own game inside theirs.',
        weights: { shade: 2 },
        echo: 'mute the complaints and play your own game inside the team game',
      },
      {
        id: 'd',
        text: 'You narrate the comeback in chat. The mood is the other half of the win.',
        weights: { chorus: 2 },
        echo: 'narrate a comeback in chat because the mood is half the win',
      },
    ],
  },
  {
    id: 'q23',
    axis: 'company',
    kicker: 'Last queue',
    prompt: 'The group wants one more. You are the tired one. The button is right there.',
    options: [
      {
        id: 'a',
        text: 'You stay. A worse version of you in the call still beats a clean logout.',
        weights: { chorus: 3 },
        echo: 'stay in the call past the point of being good at the game',
      },
      {
        id: 'b',
        text: 'You log. They can tell the story of the last one without you.',
        weights: { shade: 3 },
        echo: 'log off while the group queues one more',
      },
      {
        id: 'c',
        text: 'You stay for one, on a comfort pick, so you can still be pleasant company.',
        weights: { chorus: 2 },
        echo: 'stay for one more on a comfort pick so you can still be pleasant',
      },
      {
        id: 'd',
        text: 'You leave a small goodbye and go play the quiet game you have been saving.',
        weights: { shade: 2 },
        echo: 'leave the group and go play the quiet game you have been saving',
      },
    ],
  },
  {
    id: 'q24',
    axis: 'company',
    kicker: 'An empty room',
    prompt: 'You load in and realize nobody you know is online. The menu waits to see what you do with that.',
    options: [
      {
        id: 'a',
        text: 'You feel your shoulders drop. This is the good version of the evening.',
        weights: { shade: 3 },
        echo: 'relax when you realize nobody you know is online',
      },
      {
        id: 'b',
        text: 'You open the social menu, send two invites, and wait. The game is a room.',
        weights: { chorus: 3 },
        echo: 'send invites into an empty room before you are willing to start',
      },
      {
        id: 'c',
        text: 'You take the chance to do the long, weird project you will not do on a call.',
        weights: { shade: 2 },
        echo: 'spend an empty lobby on the weird project you will not do on a call',
      },
      {
        id: 'd',
        text: 'You queue a public mode specifically to hear strangers being people.',
        weights: { chorus: 2 },
        echo: 'queue with strangers just to hear other people exist',
      },
    ],
  },
];

export function publicQuiz() {
  return {
    version: CONTENT_VERSION,
    count: QUESTIONS.length,
    questions: QUESTIONS.map((q) => ({
      id: q.id,
      kicker: q.kicker,
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}
