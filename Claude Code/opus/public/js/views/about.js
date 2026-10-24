import { h, rich } from '../dom.js';
import { QUESTIONS, ARCH, AXES } from '/shared/engine.js';

const counts = QUESTIONS.reduce((m, q) => ({ ...m, [q.type]: (m[q.type] || 0) + 1 }), {});

const SECTIONS = [
  ['The model', [
    `Six archetypes sit on the corners of a hexagon in three opposing pairs: ${AXES.map((a) => `**${ARCH[a.a].name} ↔ ${ARCH[a.b].name}** (${a.poles.join(' vs ')})`).join(', ')}.`,
    'Around the hexagon the poles alternate between two hidden families — *Trophy* (Architect, Curator, Duelist: plan, keep, win) and *Journey* (Bard, Gremlin, Wayfarer: bond, play, roam). Any flat map of three axes loses one dimension; we report that lost dimension as your “hidden drive” instead of throwing it away.',
  ]],
  ['Questions', [
    `${QUESTIONS.length} questions in three formats: ${counts.scenario} scenarios (4 options), ${counts.versus} this-or-that duels and ${counts.spectrum} five-stop spectrums. Every option carries small weights toward one or more poles — sometimes negative (refusing voice chat nudges Bard *down*).`,
  ]],
  ['Step 1 — Range-normalised pole scores', [
    'Questions don\'t cover every pole equally, so raw totals would be biased. Each pole is scored against the minimum and maximum that were actually *achievable* on the questions you answered:',
    'FORMULA:score(k) = (raw(k) − min(k)) / (max(k) − min(k))      ∈ [0, 1]',
    'Poles are scored independently, which means you can be high on both ends of a pair. When both ends of an axis are ≥ 50 we flag a **paradox**; when both are ≤ 25 we flag a **void** (that axis just doesn\'t matter to you). Both get their own paragraph in your reading.',
  ]],
  ['Step 2 — Pole-dominance projection', [
    'Each pair collapses into a signed lean: n = score(a) − score(b). A naive linear projection of those three leans onto the plane has an aliasing problem — strong Architect + strong Curator would land in the *Bard* wedge, because two vectors 120° apart sum to the one between them. So we project non-linearly:',
    'FORMULA:wedge    = pole with the largest |n|\ntilt     = Σ others |nᵢ|·sin(θᵢ − θ₁) / |n₁|        (clamped, ±28°)\nstrength = 0.6·|n₁| + 0.25·|n₂| + 0.15·|n₃|\nradius   = 1 − (1 − min(1, 1.45·strength))^1.2',
    'Result: your dot always sits in the region named by your title, leans toward your runner-up, and its distance from the centre is your **conviction**. The gain and curve were calibrated with Monte-Carlo simulation (`npm run calibrate`) so random clickers huddle near the middle and committed players reach the rim.',
  ]],
  ['Step 3 — Title', [
    'Conviction under 16% → **The Omnivore**. Otherwise, if your second-strongest lean is at least 55% of your strongest, you get the hybrid of the two (12 hybrids); if not, the pure archetype. Six pure + twelve hybrid + one centre = 19 possible prints.',
  ]],
  ['Step 4 — Certainty via bootstrap', [
    'We resample your answers with replacement 160 times and re-score each copy. The dots around your marker are those resamples; **certainty** is the share that still land in your home region. A deterministic seed (derived from your answers) means the cloud is identical on every device.',
  ]],
  ['Step 5 — Integrity checks', [
    'Answer options are ordered so that no archetype lives in the same slot, which keeps honest answers from looking patterned. If you pick the same slot on 80% or more of the choice questions (under 0.01% of random clickers ever do) or park nearly every slider on “Torn”, the reading says so, gently.',
  ]],
  ['Privacy', [
    'Your whole result is a 12-character code — the answers packed in base-5. Share links are stateless. Finished runs are added to the anonymous atlas (coordinates and title only). Accounts are a username and a scrypt-hashed password; nothing else is collected.',
  ]],
];

export function renderAbout(root) {
  document.title = 'How scoring works · PLAYERPRINT';
  root.append(h('section', { class: 'page' }, h('div', { class: 'wrap' },
    h('div', { class: 'page-head' },
      h('span', { class: 'kicker' }, 'Methodology'),
      h('h1', 'How the print is made'),
      h('p', 'No black box. Here is exactly how your answers become a dot. The same engine runs in your browser and on the server.')),
    h('div', { class: 'prose' },
      SECTIONS.map(([title, paras]) => [
        h('h2', title),
        paras.map((p) => p.startsWith('FORMULA:') ? h('div', { class: 'formula' }, p.slice(8)) : h('p', rich(p.replace(/`([^`]+)`/g, '$1')))),
      ]),
      h('p', { style: { marginTop: '40px' } }, h('a', { class: 'btn btn-hot', href: '/quiz', 'data-link': '' }, 'Try it', h('span', { class: 'arrow' }, '→')))))));
}
