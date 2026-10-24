'use strict';
const html = require('fs').readFileSync('public/index.html', 'utf8');
const ids = ['sky', 'whoami', 'nav-atlas', 'nav-auth', 'nav-logout', 'screen-landing', 'cta-begin', 'demo-chart', 'archetype-grid', 'screen-quiz', 'quiz-progress-fill', 'quiz-counter', 'quiz-back', 'quiz-card', 'quiz-question', 'opt-a', 'opt-b', 'screen-analyzing', 'analyzing-line', 'screen-results', 'res-eyebrow', 'res-title', 'res-epithet', 'res-chips', 'result-chart', 'pole-tip', 'toggle-souls', 'coord-readout', 'axis-bars', 'pair-meters', 'insight-body', 'games-row', 'btn-copy', 'btn-png', 'btn-retake', 'btn-save', 'saved-note', 'share-cta', 'screen-dashboard', 'dash-title', 'dash-drift', 'dash-empty', 'dash-list', 'compare-panel', 'compare-chart', 'compare-deltas', 'compare-close', 'compare-note', 'screen-404', 'auth-modal', 'auth-close', 'tab-signin', 'tab-signup', 'auth-form', 'field-name', 'auth-name', 'auth-email', 'auth-password', 'auth-error', 'auth-submit', 'toast'];
const missing = ids.filter((i) => !html.includes(`id="${i}"`));
console.log(missing.length ? 'MISSING IDS: ' + missing.join(', ') : `all ${ids.length} ids present`);
for (const tag of ['section', 'div', 'main', 'header', 'button', 'form', 'label', 'canvas']) {
  const opens = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const closes = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  const selfOk = tag === 'canvas' ? true : opens === closes;
  console.log(`${tag}: ${opens} open / ${closes} close ${selfOk ? 'OK' : '*** MISMATCH ***'}`);
}
