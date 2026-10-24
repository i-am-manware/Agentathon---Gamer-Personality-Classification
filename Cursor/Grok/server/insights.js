/**
 * Written readings. The title follows the resolved identity.
 * Paragraphs stay specific to the blend, then pick up intensity,
 * braids, one echoed answer, and a clarity caveat when the halves disagree.
 */

import { AXES } from './content.js';
import { archetype, axisById } from './scoring.js';

const PURE = {
  architect: {
    title: 'The Architect',
    epithet: 'Systems, made obedient.',
    pull: 'You do not hope the game makes sense. You arrange it until it does.',
    thesis: 'You play like someone taking apart a watch on a clean table. The fun is the moment the mechanism admits how it works.',
    texture: 'Guides, keybinds, and one-variable tests are love letters you write to your future self.',
  },
  wildcard: {
    title: 'The Wildcard',
    epithet: 'The ill-advised button, studied.',
    pull: 'The ill-advised button is a research program.',
    thesis: 'You are at your best when the reasonable option has left the room. Chaos, for you, is a way of asking the game a better question.',
    texture: 'You will repeat a ridiculous idea until it becomes a technique, or a story worth keeping.',
  },
  laureate: {
    title: 'The Laureate',
    epithet: 'A result with your name on it.',
    pull: 'A win is a story that kept its receipts.',
    thesis: 'You want the night to resolve. Rank, credits, a clean close: these are how you know the session happened.',
    texture: 'You will take the harder queue on purpose, because an easy win forgets to congratulate you.',
  },
  nomad: {
    title: 'The Nomad',
    epithet: 'The path that forgot to explain itself.',
    pull: 'The minimap is a suggestion you keep declining.',
    thesis: 'You treat destinations as optional scenery. The game starts, for you, when the marker stops being the point.',
    texture: 'You remember side rooms the way other people remember final bosses.',
  },
  chorus: {
    title: 'The Chorus',
    epithet: 'A game is a room you fill.',
    pull: 'A lobby without a witness is just a menu.',
    thesis: 'Play is a social instrument in your hands. The clip, the call, the "did you see that" are the actual loot.',
    texture: 'You will abandon a perfectly good solo session if a friend is holding a door open.',
  },
  shade: {
    title: 'The Shade',
    epithet: 'The quiet version, on purpose.',
    pull: 'You like the game that does not know you have friends.',
    thesis: 'Solitude is a craft choice. You keep the lobby small so the game can speak in a normal voice.',
    texture: 'You help, often generously, and you prefer to do it as a letter rather than a crowd.',
  },
};

const BLENDS = {
  architect: {
    wildcard: {
      title: 'The Controlled Burn',
      epithet: 'The plan includes the mess.',
      pull: 'You learn the system so you can betray it on purpose.',
      thesis: 'You like a clean model, and you like setting a corner of it on fire. The spreadsheet and the stupid idea are both yours.',
      texture: 'People call this indecision. It is range. You can execute, and you can refuse to.',
    },
    laureate: {
      title: 'The Grandmaster',
      epithet: 'Victory, drafted in advance.',
      pull: 'You win before the lobby finishes loading.',
      thesis: 'Rank is a craft problem with a public answer. You study the path until the win looks like it was always going to happen.',
      texture: 'You will take the unfashionable correct play, then you will want the badge that proves it.',
    },
    nomad: {
      title: 'The Cartographer',
      epithet: 'The map is the score that counts.',
      pull: 'You wander with a pencil behind your ear.',
      thesis: 'You leave the critical path, and you do not get lost. You are making the document the game forgot to ship.',
      texture: 'Completion, for you, looks like a coastline drawn from memory.',
    },
    chorus: {
      title: 'The Shotcaller',
      epithet: 'You hand other people a better game.',
      pull: 'Your favorite ability is a sentence said at the right time.',
      thesis: 'A system is more fun once the party can see it. You explain, ping, and build the route everyone can actually walk.',
      texture: 'A private victory tastes unfinished. You want the call to have heard it too.',
    },
    shade: {
      title: 'The Night Draftsman',
      epithet: 'You build the machine, then you play it alone.',
      pull: 'The optimal line, walked with the lights off.',
      thesis: 'You will learn a game down to its screws and still decline the squad that wants your notes. The draft stays cleaner that way.',
      texture: 'Solitude here is a workshop. You like the door closed while the build is still wet.',
    },
  },
  wildcard: {
    architect: {
      title: 'The Loose Screw',
      epithet: 'Mastery, used as a prank.',
      pull: 'You know the machine well enough to rattle it.',
      thesis: 'The guides have been read. You are simply unwilling to let them flatten the evening. Your best plays look like mistakes that did the homework.',
      texture: 'You break a rule only after you can say, out loud, which rule it was.',
    },
    laureate: {
      title: 'The Showmatch',
      epithet: 'Rank is the loudest room in the building.',
      pull: 'You climb so the clip has a crowd.',
      thesis: 'Winning matters, and winning plain is a missed opportunity. You want the highlight with the scoreboard still attached.',
      texture: 'A silent stomp bores you. A chaotic win is a trophy.',
    },
    nomad: {
      title: 'The Detour',
      epithet: 'Getting lost is the build you queued.',
      pull: 'The objective was a rumor you let expire.',
      thesis: 'You leave the route because the route is behaving itself. Somewhere unmarked, the game is more honest, and you intend to catch it in the act.',
      texture: 'You come back, if you come back, with a story and no apology.',
    },
    chorus: {
      title: 'The Instigator',
      epithet: 'You are why the call got strange.',
      pull: 'The lobby is braver after you speak.',
      thesis: 'Chaos is a group activity in your hands. You propose the bad idea, and you want them in it with you, already laughing.',
      texture: 'The clip is better when four people are yelling.',
    },
    shade: {
      title: 'The Solo Glitch',
      epithet: 'Mischief, with the mic off.',
      pull: 'You break the game quietly, in a corner you like.',
      thesis: 'You still press the ill-advised button. You simply decline an audience for the experiment. The bug can be yours for a while.',
      texture: 'Discovery first. The retelling can wait, or never arrive.',
    },
  },
  laureate: {
    architect: {
      title: 'The Metagame',
      epithet: 'Glory keeps a notebook.',
      pull: 'You do not chase the win. You draft it.',
      thesis: 'The leaderboard is the point, and the path there should be studied until it looks obvious. Panic is other people\'s build.',
      texture: 'You review your own losses the way a coach would, including the wince.',
    },
    wildcard: {
      title: 'The Clutch',
      epithet: 'Best work, once the plan has died.',
      pull: 'You trust the last ten seconds more than the first ten minutes.',
      thesis: 'You want the win, and you want it to feel slightly illegal. A rescue interests you more than a controlled stroll.',
      texture: 'You are calmest when the round is already on fire.',
    },
    nomad: {
      title: 'The Touring Champion',
      epithet: 'A competitor with one foot off the road.',
      pull: 'You can take the match, then vanish into the map.',
      thesis: 'The ranked queue has your respect, and so does the ridge behind the arena. You chase a win, then you go missing on purpose.',
      texture: 'Seasons matter. So do the Tuesdays you refuse them.',
    },
    chorus: {
      title: 'The Squad Ace',
      epithet: 'A win the party gets to stand inside.',
      pull: 'You carry, and you narrate the carry.',
      thesis: 'Personal rank is sweeter when the call shares the spike. You play to be the reason the night turned.',
      texture: 'You take the hero play, then you hand the story back to everyone else.',
    },
    shade: {
      title: 'The Ladder Ghost',
      epithet: 'The badge is public. The grind is not.',
      pull: 'You climb where nobody can spectate the sweating.',
      thesis: 'You care about the result enough to suffer for it, and you prefer the suffering unwitnessed. No speech, no clip, just the number moving.',
      texture: 'If they ask how, you will shrug, and mean it as a kindness.',
    },
  },
  nomad: {
    architect: {
      title: 'The Field Notes',
      epithet: 'Wandering, with a method.',
      pull: 'You stray on purpose and write down what the path missed.',
      thesis: 'Exploration gets the same attention other people save for a final boss. You are rigorous about getting lost.',
      texture: 'Your screenshots have the energy of evidence.',
    },
    wildcard: {
      title: 'The Side Quest',
      epithet: 'The critical path can file a complaint.',
      pull: 'You will absolutely go over there instead.',
      thesis: 'A glowing marker is a dare to do something else. You trust digressions, including the ones that spend twenty beautiful, useless minutes.',
      texture: 'The main story is a place you might visit.',
    },
    laureate: {
      title: 'The Off-Season',
      epithet: 'A climber, currently looking at the view.',
      pull: 'You remember how to win. You would rather see the ridge.',
      thesis: 'The skills of a competitor are still in your hands. You spend them on secrets, skylines, and the occasional unnecessary perfect run.',
      texture: 'You can queue whenever you want. Wanting is the rare part.',
    },
    chorus: {
      title: 'The Caravan',
      epithet: 'Lost, and well accompanied.',
      pull: 'You get the group beautifully off course.',
      thesis: 'Wandering is better as a shared mistake. You pick a horizon and talk the whole way there, until the horizon is the session.',
      texture: 'Nobody is sure it was efficient. Everyone can retell it.',
    },
    shade: {
      title: 'The Far Signal',
      epithet: 'Distance, taken personally.',
      pull: 'You go where the marker is not, and you go quiet.',
      thesis: 'The edge of the map is a private room. You walk it without a party frame and without a reason that would survive a meeting.',
      texture: 'Coming back is optional. Looking is not.',
    },
  },
  chorus: {
    architect: {
      title: 'The Raid Lead',
      epithet: 'Your fun is other people\'s positioning.',
      pull: 'You win by making the room smarter.',
      thesis: 'A plan is a gift you give the party, not a secret you keep. You track the boring numbers so someone else lands the pretty hit.',
      texture: 'If the call is calm, you did the job, even when the clip belongs to somebody else.',
    },
    wildcard: {
      title: 'The Hype',
      epithet: 'Confidence, distributed at volume.',
      pull: 'You keep the lobby braver than it is.',
      thesis: 'You believe the next attempt works, and you say so until it does. The silly strat gets a sponsor, and the sponsor is you.',
      texture: 'Morale is a build you are always specced into.',
    },
    laureate: {
      title: 'The Banner',
      epithet: 'Glory, with the group chat attached.',
      pull: 'You want the win, and you want witnesses.',
      thesis: 'A private rank-up is a draft. You play for the moment the party realizes this one is actually going to land.',
      texture: 'Celebration is part of the clear, not a courtesy you add later.',
    },
    nomad: {
      title: 'The Tour Guide',
      epithet: 'Hospitality, aimed at the horizon.',
      pull: 'You will get them lost somewhere beautiful.',
      thesis: 'Your favorite content is a friend\'s first time in a place you already love. You steer, then you let them stray, then you steer again.',
      texture: 'The session counts if someone says: wait, go back.',
    },
    shade: {
      title: 'The Open Secret',
      epithet: 'Half in the call, half already elsewhere.',
      pull: 'You love the group. You also love the door.',
      thesis: 'Company is real for you, and so is the need to vanish mid-sentence. You show up fully, and you keep one room of the game that is only yours.',
      texture: 'The mute and the invite are both sincere. You contain both.',
    },
  },
  shade: {
    architect: {
      title: 'The Lone Theorist',
      epithet: 'Notes, and no audience.',
      pull: 'The wiki is a conversation you prefer to have with yourself.',
      thesis: 'You will theorycraft past the point of usefulness because the model is company enough. Publishing the guide is someone else\'s hobby.',
      texture: 'The solution is allowed to stay in your pocket.',
    },
    wildcard: {
      title: 'The Quiet Bug',
      epithet: 'Experiments in an empty instance.',
      pull: 'You break things softly, where the squad cannot turn it into a bit.',
      thesis: 'The weird interaction still calls you. You answer it somewhere private, and you enjoy the result before anyone else names it.',
      texture: 'Discovery first. Distribution is a separate hobby you may never pick up.',
    },
    laureate: {
      title: 'The Anonymous Ace',
      epithet: 'Sweat, without the speech.',
      pull: 'The leaderboard knows your name. The lobby does not.',
      thesis: 'You can play at a level that usually comes with a crowd. You keep the crowd theoretical and the execution very real.',
      texture: 'The win is for the record. The recap can mind its own business.',
    },
    nomad: {
      title: 'The Walker',
      epithet: 'A long loop, voice chat closed.',
      pull: 'No party frame. No marker. No hurry.',
      thesis: 'You take the scenic route alone, which is how the scenery survives. Nothing needs to be performed, cleared, or explained.',
      texture: 'The session ends when the light changes, not when a bar fills.',
    },
    chorus: {
      title: 'The Reluctant Party',
      epithet: 'Affection, with an escape route.',
      pull: 'You came for them. You stay for the quiet underneath.',
      thesis: 'There are people you will log on for. You will also feel the exact minute the game would have been better solo, and you will love them anyway.',
      texture: 'Friendship is a reason you respect. It is also a mode you notice you are in.',
    },
  },
};

const SPECIAL = {
  still: {
    title: 'The Still Point',
    epithet: 'Every signal showed up.',
    pull: 'You are a full lobby, convened inside one player.',
    thesis: 'Planned and improvised, glory and drifting, the crowd and the quiet: the plate heard all of it at volume. Opposites cancel, so the jewel rests in the middle of a very loud room.',
    texture: 'This is a crowded reading that refuses to elect a captain. The bars are the portrait. The center is the truce.',
  },
  faint: {
    title: 'The Unfinished Plate',
    epithet: 'A light touch on the instrument.',
    pull: 'You brushed the playfield and left most of it clean.',
    thesis: 'No signal grabbed hard enough to drag the jewel out to a rim. You borrow, switch, and decline the costume, at least tonight.',
    texture: 'Read it as a sketch. A louder night will push the same hands further across the field.',
  },
};

function intensityParagraph(peak, label) {
  if (peak >= 0.84) {
    return `This is a loud ${label} reading. The other signals are visiting a house that already has rules.`;
  }
  if (peak >= 0.62) {
    return `The ${label} signal leads, and it leaves a chair out for a second habit.`;
  }
  if (peak >= 0.4) {
    return `Nothing here shouts. The ${label} lean is real, and it shares the room.`;
  }
  return 'What follows is a lean, not a costume. The plate caught a direction and left the volume low.';
}

function axisName(id) {
  return axisById(id)?.label || id;
}

export function narrate(scored) {
  const { identity, affinity, braids, clarity, echoes } = scored;
  const primary = identity.primary;
  const secondary = identity.secondary;
  let pack;
  if (identity.mode === 'still') pack = SPECIAL.still;
  else if (identity.mode === 'faint') pack = SPECIAL.faint;
  else if (identity.mode === 'pure' || !secondary) pack = PURE[primary];
  else pack = BLENDS[primary]?.[secondary] || PURE[primary];

  const paragraphs = [pack.thesis, pack.texture];

  if (identity.mode === 'paradox') {
    paragraphs.push('Those two sit on opposite ends of the same axis, so they cancel on the playfield. The bars stay loud. The jewel stays near the middle, which is the argument, drawn to scale.');
  } else if (identity.mode === 'pure' || identity.mode === 'blend') {
    paragraphs.push(intensityParagraph(affinity[primary] || 0, archetype(primary).label));
    if (braids.length) {
      const names = braids.map(axisName).join(' and ');
      paragraphs.push(`There is a braid on ${names}: both poles are awake, so that axis pulls inward instead of electing a side.`);
    }
  }

  if (echoes?.[0] && identity.mode !== 'faint') {
    paragraphs.push(`A tell, from your own answers: you would ${echoes[0]}.`);
  }

  if (clarity != null && clarity < 0.15 && identity.mode !== 'faint' && identity.mode !== 'still') {
    paragraphs.push('The two halves of the quiz disagree with each other. Treat the coordinate as weather: real, and likely to move.');
  }

  return {
    title: pack.title,
    epithet: pack.epithet,
    pull: pack.pull,
    paragraphs: paragraphs.filter(Boolean),
  };
}

export { PURE, BLENDS, SPECIAL, AXES };
