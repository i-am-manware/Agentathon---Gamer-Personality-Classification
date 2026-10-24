// First-boot demo seed: a demo account with three save files on the memory
// card, so a fresh install has something to look at in the SAVE DATA screen.
// Runs through the exact same scoring path as real traffic.

import { QUESTIONS, QUIZ_VERSION } from '../shared/questions.js';
import { config } from './lib/config.js';
import { hashPassword } from './auth/passwords.js';

function answersForPersona(persona) {
  return QUESTIONS.map((q) => {
    if (q.type === 'slider') {
      const target = persona.sliders[q.axis];
      if (!target) return 50; // neutral shrug
      const [pole, strength] = target;
      return q.toward === pole ? 50 + 50 * strength : 50 - 50 * strength;
    }
    let best = 0;
    let bestScore = -1;
    q.options.forEach((opt, i) => {
      let s = 0;
      for (const [pole, weight] of Object.entries(opt.w)) {
        s += weight * (persona.weights[pole] || 0);
      }
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    return best;
  });
}

const PERSONAS = [
  {
    label: 'gremlin/hypeman',
    weights: { gremlin: 2, hypeman: 1 },
    sliders: { order: ['gremlin', 0.6], campfire: ['hypeman', 0.5], valor: ['wayfarer', 0.3] },
    createdAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
  },
  {
    label: 'conqueror/architect',
    weights: { conqueror: 2, architect: 1 },
    sliders: { order: ['architect', 0.6], valor: ['conqueror', 0.5], campfire: ['lorekeeper', 0.4] },
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    label: 'wayfarer/lorekeeper',
    weights: { wayfarer: 2, lorekeeper: 1 },
    sliders: { valor: ['wayfarer', 0.7], campfire: ['lorekeeper', 0.5], order: ['architect', 0.2] },
    createdAt: Date.now() - 36 * 60 * 60 * 1000,
  },
];

export function ensureSeed({ userRepo, runRepo, runService }, { quiet = false } = {}) {
  if (userRepo.findByUsername(config.demoAccount.username)) return false;
  const demo = userRepo.create({
    username: config.demoAccount.username,
    passHash: hashPassword(config.demoAccount.password),
  });
  for (const persona of PERSONAS) {
    const answers = answersForPersona(persona);
    const record = runService.persistableRun(answers);
    runRepo.create(demo.usernameLower, { ...record, createdAt: persona.createdAt });
  }
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(
      `[seed] demo save file created - sign in as "${config.demoAccount.username}" / "${config.demoAccount.password}"`
    );
  }
  return true;
}
