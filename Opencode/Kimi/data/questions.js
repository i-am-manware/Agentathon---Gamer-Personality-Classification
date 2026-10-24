'use strict';

/**
 * The Reading — 24 trials, two doors each.
 *
 * Balance contract (verified by scripts/smoke.js):
 *  - Every pole appears exactly 8 times across all options.
 *  - 12 questions are "within-pair" duels (4 per opposing pair) — they measure
 *    one axis directly.
 *  - 12 questions are "cross-pair" duels (each pole appears exactly 4 times) —
 *    they keep the reading unpredictable and enable cross-validation of leans.
 *
 * Option order in this file is meaningless: the server shuffles both question
 * order and option order for every session, and keeps the pole mapping secret
 * server-side so results can't be gamed from the client.
 */

const QUESTIONS = [
  // ---- Within-pair: Glory (CMP vs SOC) ----
  {
    id: 'q01', pair: 'glory',
    q: 'Final circle. One enemy squad stands between yours and the crown.',
    a: { t: 'Third-party their fight and clip the whole thing for the montage.', p: 'CMP' },
    b: { t: 'Ping the plan, rally the squad — win or lose, we do it together.', p: 'SOC' },
  },
  {
    id: 'q02', pair: 'glory',
    q: 'A random teammate whiffs the easiest play of the century in your ranked match.',
    a: { t: 'Vote-kick. This is ranked, not a charity.', p: 'CMP' },
    b: { t: '\u201cnp np, we got this\u201d — and you actually mean it.', p: 'SOC' },
  },
  {
    id: 'q03', pair: 'glory',
    q: 'Match over. You top-fragged… and still lost.',
    a: { t: 'Seethe. The only stat that matters is the W.', p: 'CMP' },
    b: { t: '\u201cgg go next\u201d — the lobby vibes were immaculate.', p: 'SOC' },
  },
  {
    id: 'q04', pair: 'glory',
    q: 'It\u2019s game night with friends. You set the agenda.',
    a: { t: 'A bracket. With stakes. Someone must be crowned.', p: 'CMP' },
    b: { t: 'Co-op campaign, snacks within reach, comms full of bits.', p: 'SOC' },
  },

  // ---- Within-pair: Pursuit (EXP vs ACH) ----
  {
    id: 'q05', pair: 'pursuit',
    q: 'Hour one of a hundred-hour open world. You—',
    a: { t: 'Beeline for the weird mountain on the horizon. Tutorial optional.', p: 'EXP' },
    b: { t: 'Open the achievement list and start planning the route.', p: 'ACH' },
  },
  {
    id: 'q06', pair: 'pursuit',
    q: 'The credits roll on a game you genuinely loved.',
    a: { t: 'Straight into something completely different. New worlds wait.', p: 'EXP' },
    b: { t: 'Straight back in. Three endings and a secret boss remain.', p: 'ACH' },
  },
  {
    id: 'q07', pair: 'pursuit',
    q: 'Your backlog is 47 games deep. How do you feel?',
    a: { t: 'Rich. So many worlds, so little time.', p: 'EXP' },
    b: { t: 'Guilty. A library is meant to be finished.', p: 'ACH' },
  },
  {
    id: 'q08', pair: 'pursuit',
    q: 'A side quest sends you across the entire map for a cosmetic hat.',
    a: { t: 'Whatever I stumble into along the way IS the quest.', p: 'EXP' },
    b: { t: 'Already en route. The hat will be mine.', p: 'ACH' },
  },

  // ---- Within-pair: Method (ARC vs DAR) ----
  {
    id: 'q09', pair: 'method',
    q: 'The boss arena gates slam shut behind you.',
    a: { t: 'Good. You studied the strats — phase two starts at 60% HP.', p: 'ARC' },
    b: { t: 'Good. Time to learn by dying gloriously.', p: 'DAR' },
  },
  {
    id: 'q10', pair: 'method',
    q: 'A new patch drops with 4,000 words of notes.',
    a: { t: 'Read every line. The meta is clay in your hands.', p: 'ARC' },
    b: { t: 'TL;DR. You\u2019ll feel out what\u2019s broken by breaking it.', p: 'DAR' },
  },
  {
    id: 'q11', pair: 'method',
    q: 'Your inventory is an archaeological dig site of loose items.',
    a: { t: 'Give me ten minutes and a sorting system.', p: 'ARC' },
    b: { t: 'If I can\u2019t see it, it doesn\u2019t exist. Send it.', p: 'DAR' },
  },
  {
    id: 'q12', pair: 'method',
    q: 'The plan falls apart mid-raid.',
    a: { t: 'Freeze. Recompute. There is always an optimal line.', p: 'ARC' },
    b: { t: 'Finally. This is where it gets fun.', p: 'DAR' },
  },

  // ---- Cross-pair duels ----
  {
    id: 'q13', pair: null,
    q: 'Two invites hit at the same time.',
    a: { t: 'Ranked grind with the sweatiest players you know.', p: 'CMP' },
    b: { t: 'Some weird indie roguelike nobody has heard of yet.', p: 'EXP' },
  },
  {
    id: 'q14', pair: null,
    q: 'Pick a superpower for your guild.',
    a: { t: 'Everyone actually shows up, every raid night.', p: 'SOC' },
    b: { t: 'Every achievement auto-completes on your account.', p: 'ACH' },
  },
  {
    id: 'q15', pair: null,
    q: 'Victory tastes sweetest when—',
    a: { t: 'It unfolds exactly according to your design.', p: 'ARC' },
    b: { t: 'You rip it straight out of their hands.', p: 'CMP' },
  },
  {
    id: 'q16', pair: null,
    q: 'Which clip are you posting?',
    a: { t: 'The 1v4 clutch at zero HP with no plan whatsoever.', p: 'DAR' },
    b: { t: 'The perfectly synced team play you laughed through the whole time.', p: 'SOC' },
  },
  {
    id: 'q17', pair: null,
    q: 'The map pings two icons: an unmarked \u201c???\u201d cave and a timed event.',
    a: { t: 'The cave. It\u2019s always the cave.', p: 'EXP' },
    b: { t: 'Timed event — danger with a deadline? Yes.', p: 'DAR' },
  },
  {
    id: 'q18', pair: null,
    q: 'Your dream in-game house has—',
    a: { t: 'A trophy wall for every rare drop you\u2019ve earned.', p: 'ACH' },
    b: { t: 'A fully automated sorting system you designed yourself.', p: 'ARC' },
  },
  {
    id: 'q19', pair: null,
    q: 'Match point. Everything on the line. You—',
    a: { t: 'Stare them down and take the 1v1. Personally.', p: 'CMP' },
    b: { t: 'Do something so reckless no one could possibly predict it.', p: 'DAR' },
  },
  {
    id: 'q20', pair: null,
    q: 'Your best night in a game this year was—',
    a: { t: 'Teaching a new friend the ropes until 3 AM.', p: 'SOC' },
    b: { t: 'Stumbling into an unmarked cave that hid an entire secret boss.', p: 'EXP' },
  },
  {
    id: 'q21', pair: null,
    q: 'Which one stings more?',
    a: { t: 'A missable achievement you can never go back for.', p: 'ACH' },
    b: { t: 'A match you should have won.', p: 'CMP' },
  },
  {
    id: 'q22', pair: null,
    q: 'In every group project, you\u2019re the one who—',
    a: { t: 'Builds the plan, the roles, the spreadsheet.', p: 'ARC' },
    b: { t: 'Keeps morale alive while everything burns.', p: 'SOC' },
  },
  {
    id: 'q23', pair: null,
    q: 'A new strategy game drops. First thing you do—',
    a: { t: 'Start a blind run. Discovery is the whole point.', p: 'EXP' },
    b: { t: 'Watch three guides so your first run is a masterpiece.', p: 'ARC' },
  },
  {
    id: 'q24', pair: null,
    q: 'A boss offers a coward\u2019s shortcut around the fight.',
    a: { t: 'Decline. The record must show the full clear.', p: 'ACH' },
    b: { t: 'Take it, style on the boss anyway, dare anyone to call it cheap.', p: 'DAR' },
  },
];

module.exports = { QUESTIONS };
