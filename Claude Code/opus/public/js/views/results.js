import { h, rich, toast, store, fmtDate } from '../dom.js';
import { ARCH, ARCH_ORDER, OPPOSITE, analyze, decodeCode, CODE_RE } from '/shared/engine.js';
import { PROFILES, buildInsight } from '/shared/content.js';
import { createPlane } from '../plane.js';
import { glyph } from '../glyphs.js';
import { renderCard } from '../card.js';
import { api } from '../api.js';
import { session, getStats, navigate, openAuth, shareUrl } from '../state.js';

const pct = (v) => Math.round(v * 100);
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}`;

function parseCodeInput(text) {
  const t = String(text || '').trim();
  const m = /\/r\/([0-9a-z]+)/i.exec(t);
  const code = (m ? m[1] : t).toLowerCase();
  return CODE_RE.test(code) && decodeCode(code) ? code : null;
}

function chemistry(a, b) {
  const diff = ARCH_ORDER.reduce((acc, k) => acc + Math.abs(a.scores[k] - b.scores[k]), 0) / 6;
  const score = Math.round(100 * (1 - diff * 1.6));
  let verdict;
  if (a.primary === b.primary) verdict = 'Mirror match — you want the same things from a game. Great co-op, brutal rivalry.';
  else if (OPPOSITE[a.primary] === b.primary) verdict = 'Opposite poles. You will argue about what "fun" means, and you will each be better for it.';
  else if (PROFILES[a.primary].partner === b.primary || PROFILES[b.primary].partner === a.primary) verdict = 'A classic duo — your strengths cover each other\'s blind spots.';
  else verdict = 'Different flavours with plenty of overlap. Pick games from the hybrid zone between you.';
  return { score: Math.max(0, Math.min(100, score)), verdict };
}

export async function renderResults(root, { params, query }) {
  const code = params[0];
  const answers = decodeCode(code);
  if (!answers) {
    root.append(h('section', { class: 'notfound' }, h('div', {},
      h('h1', '???'), h('p', 'That print code is smudged beyond recognition.'),
      h('a', { class: 'btn btn-hot', href: '/quiz', 'data-link': '' }, 'Take the test'))));
    return;
  }

  const r = analyze(answers);
  const ins = buildInsight(r);
  document.title = `${r.title} · PLAYERPRINT`;
  const prim = ARCH[r.primary];
  const sec = ARCH[r.secondary];
  const accent = { '--c': prim.color };

  const vsCode = parseCodeInput(query.get('vs'));
  const fr = vsCode && vsCode !== code ? analyze(decodeCode(vsCode), { bootstrap: 0 }) : null;

  let fresh = false;
  try { fresh = sessionStorage.getItem('pp.fresh') === code; if (fresh) sessionStorage.removeItem('pp.fresh'); } catch { /* ignore */ }
  const mine = (store.get('pp.last')?.code === code);

  await session.ready;
  let alive = true;
  let saving = false;

  /* ------------------------------------------------------------ */
  /* Header                                                        */
  /* ------------------------------------------------------------ */
  const name = r.title.replace(/^The\s+/, '');
  const overprint = r.hybrid ? sec.color : r.primary === 'A' ? ARCH.D.color : ARCH.A.color;
  const theLabel = h('span', { class: 'the' }, mine || fresh ? 'You are the' : 'Specimen classified as the');
  const head = h('div', { class: 'res-head' },
    h('div', {},
      h('div', { class: 'kicker' },
        h('span', { class: 'pill', style: { background: prim.color, color: '#1E1B18' } }, glyph(r.primary, { width: 12, height: 12 }), prim.name),
        r.hybrid ? h('span', { class: 'pill', style: { background: sec.color, color: '#1E1B18' } }, glyph(r.secondary, { width: 12, height: 12 }), sec.name) : null,
        r.titleKey === 'O' ? h('span', { class: 'pill hot' }, 'Rare: centre of the atlas') : null,
        fr ? null : h('span', mine || fresh ? 'Your print' : 'A shared print')),
      h('h1', { class: 'res-title' },
        theLabel,
        h('span', { class: 'riso-over', 'data-text': name, style: { '--c1': prim.color, '--c2': overprint } }, name)),
      h('p', { class: 'res-tagline' }, `“${ins.tagline}”`)),
    h('div', { class: 'res-glyphs', 'aria-hidden': 'true' },
      h('div', { class: 'g', style: { '--c': prim.color } }, glyph(r.primary)),
      r.hybrid ? h('div', { class: 'g', style: { '--c': sec.color } }, glyph(r.secondary)) : null));

  const specimen = h('div', { class: 'specimen-bar kicker' },
    h('span', `Specimen Nº ${code.toUpperCase()}`),
    h('span', fresh ? 'Freshly developed' : 'PLAYERPRINT · Vol. 01'),
    h('span', `${r.answered} answers · 160 resamples`));

  /* ------------------------------------------------------------ */
  /* Plane                                                         */
  /* ------------------------------------------------------------ */
  const inspector = h('div', { class: 'inspector' });
  const plane = createPlane({
    describe: (k) => ({ kicker: `Your pull: ${pct(r.scores[k])} / 100`, title: `The ${ARCH[k].name}`, body: PROFILES[k].short }),
    onSelect: (k) => inspect(k),
    ariaLabel: `Atlas plane with your position in the ${prim.name} region`,
  });
  function inspect(k) {
    plane.highlight(k);
    const p = PROFILES[k];
    inspector.replaceChildren(h('div', { class: 'party-row', style: { marginTop: '14px' } },
      h('div', { class: 'g', style: { '--c': ARCH[k].color } }, glyph(k)),
      h('div', {},
        h('span', { class: 'k' }, k === r.primary ? 'Your home region' : `Region · you score ${pct(r.scores[k])}`),
        h('b', `The ${ARCH[k].name}`),
        h('span', { class: 'serif-i' }, p.tagline))));
  }

  const layerState = { crowd: true, cloud: true, tethers: true, trail: false, ghost: true, friend: true };
  const chip = (key, label, color) => {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(layerState[key]) },
      h('span', { class: 'sw', style: { color: color || 'var(--ink-3)' } }), label);
    b.addEventListener('click', () => {
      layerState[key] = !layerState[key];
      b.setAttribute('aria-pressed', String(layerState[key]));
      plane.setLayer(key, layerState[key]);
    });
    return b;
  };
  const chips = h('div', { class: 'chips' }, chip('crowd', 'Crowd'), chip('cloud', 'Certainty cloud'), chip('tethers', 'Pulls', prim.color));
  plane.setLayer('trail', false);

  const [p1, p2] = r.poles;
  const explain = r.titleKey === 'O'
    ? `Your three tensions nearly cancel out — conviction is just ${pct(r.conviction)}%, which puts you in the atlas's quiet centre.`
    : `Your strongest lean (${ARCH[p1.id].name}, net +${pct(p1.m)}) chose the wedge; ${ARCH[p2.id].name} (+${pct(p2.m)}) tilted you toward its side. Distance from the centre is conviction: ${pct(r.conviction)}%.`;

  const mapPanel = h('section', { class: 'panel map-panel', 'aria-label': 'Your position on the atlas' },
    h('div', { class: 'panel-title' }, h('h3', 'Your coordinates'), h('span', { class: 'kicker' }, `x ${r.point.x.toFixed(2)} · y ${r.point.y.toFixed(2)}`)),
    chips,
    plane.el,
    h('p', { class: 'map-legend' }, explain),
    inspector);

  /* ------------------------------------------------------------ */
  /* Stats + axis bars                                             */
  /* ------------------------------------------------------------ */
  const rarityV = h('div', { class: 'v' }, '—');
  const rarityL = h('div', { class: 'l' }, 'of players share this print');
  const driveJ = r.drive >= 0;
  const stat = (v, l, meter) => h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l),
    meter !== undefined ? h('div', { class: 'meter' }, h('i', { style: { width: `${pct(meter)}%` } })) : null);
  const stats = h('div', { class: 'stat-row' },
    stat([String(pct(r.conviction)), h('small', '%')], 'Conviction · distance from centre', r.conviction),
    stat([String(pct(r.confidence ?? 0)), h('small', '%')], 'Certainty · resamples that agree', r.confidence ?? 0),
    h('div', { class: 'stat' }, rarityV, rarityL),
    stat([driveJ ? 'Journey' : 'Trophy', h('small', ` ${pct(Math.abs(r.drive))}`)], 'Hidden drive · 3rd dimension'));

  const axisBars = h('div', { class: 'axis-bars' });
  function paintAxes(prev) {
    axisBars.replaceChildren(...r.axes.map((ax) => {
      const lean = ax.net >= 0 ? ax.poles[0] : ax.poles[1];
      const m = pct(Math.abs(ax.net));
      const fillA = h('i', { class: 'fill', style: { background: ARCH[ax.a].color } });
      const fillB = h('i', { class: 'fill', style: { background: ARCH[ax.b].color } });
      // Kick the CSS transition on the next task (timers also run in background tabs, unlike rAF).
      setTimeout(() => { fillA.style.width = `${pct(ax.sa)}%`; fillB.style.width = `${pct(ax.sb)}%`; }, 50);
      const halves = [h('div', { class: 'half' }, fillA), h('div', { class: 'half' }, fillB)];
      let deltaNote = null;
      if (prev) {
        const pa = prev.scores[ax.a], pb = prev.scores[ax.b];
        halves[0].append(h('span', { class: 'ghostmark', style: { right: `${pct(pa)}%` }, title: 'Previous run' }));
        halves[1].append(h('span', { class: 'ghostmark', style: { left: `${pct(pb)}%` }, title: 'Previous run' }));
        const da = pct(ax.sa) - pct(pa), db = pct(ax.sb) - pct(pb);
        deltaNote = h('span', {}, ' · since last run: ',
          h('span', { class: ['delta', da > 0 ? 'up' : da < 0 && 'down'] }, `${ARCH[ax.a].name} ${signed(da)}`), ', ',
          h('span', { class: ['delta', db > 0 ? 'up' : db < 0 && 'down'] }, `${ARCH[ax.b].name} ${signed(db)}`));
      }
      return h('div', { class: 'abar' },
        h('div', { class: 'abar-head' },
          h('span', { class: 'n' }, h('span', { style: { color: ARCH[ax.a].color } }, glyph(ax.a)), ARCH[ax.a].name, h('span', { class: 'pct' }, pct(ax.sa))),
          h('span', { class: 'mid' }, `${ax.poles[0]} / ${ax.poles[1]}`),
          h('span', { class: 'n' }, h('span', { class: 'pct' }, pct(ax.sb)), ARCH[ax.b].name, h('span', { style: { color: ARCH[ax.b].color } }, glyph(ax.b)))),
        h('div', { class: 'abar-track', role: 'img', 'aria-label': `${ARCH[ax.a].name} ${pct(ax.sa)}, ${ARCH[ax.b].name} ${pct(ax.sb)}` }, halves),
        h('div', { class: 'abar-foot' }, m < 8 ? h('b', r.voids.includes(ax.id) ? 'Neither pulls you' : 'Dead even') : ['Leans ', h('b', lean), ` by ${m}`],
          r.tensions.includes(ax.id) ? h('span', { class: 'pill hot', style: { marginLeft: '8px' } }, 'paradox') : null,
          r.voids.includes(ax.id) ? h('span', { class: 'pill', style: { marginLeft: '8px' } }, 'both low') : null, deltaNote));
    }));
  }
  paintAxes(null);

  const knob = h('span', { class: 'drive-knob', style: { left: '50%' } });
  setTimeout(() => { knob.style.left = `${50 + Math.max(-48, Math.min(48, r.drive * 160))}%`; }, 50);
  const drive = h('div', { class: 'drive' },
    h('div', { class: 'kicker' }, 'Hidden dial · Trophy vs Journey'),
    h('div', { class: 'drive-track' }, knob),
    h('div', { class: 'drive-ends' }, h('span', 'Trophy · plan, win, keep'), h('span', 'Journey · play, bond, roam')));

  const scorePanel = h('section', { class: 'panel', 'aria-label': 'Score breakdown' },
    h('div', { class: 'panel-title' }, h('h3', 'All six poles'), h('span', { class: 'kicker' }, '0–100, scored independently')),
    stats, axisBars, drive);

  /* ------------------------------------------------------------ */
  /* Insight                                                       */
  /* ------------------------------------------------------------ */
  const insight = h('section', { class: 'panel insight', style: accent, 'aria-label': 'Personality insight' },
    h('div', { class: 'tape', 'aria-hidden': 'true' }),
    h('div', { class: 'panel-title' }, h('h3', 'The reading'), h('span', { class: 'kicker' }, r.hybrid ? `${prim.name} × ${sec.name}` : prim.name)),
    ins.paragraphs.map((p) => h('p', rich(p))),
    h('div', { class: 'facts' },
      h('div', {}, h('h4', 'Strengths'), h('ul', ins.strengths.map((x) => h('li', x)))),
      h('div', { class: 'minus' }, h('h4', 'Watch out for'), h('ul', ins.blindspots.map((x) => h('li', x))))));

  const partner = ins.partner, nemesis = ins.nemesis;
  const party = h('section', { class: 'panel', 'aria-label': 'Party fit' },
    h('div', { class: 'panel-title' }, h('h3', 'Party fit')),
    h('div', { class: 'party' },
      h('div', { class: 'party-row' }, h('div', { class: 'g', style: { '--c': prim.color } }, glyph(r.primary)),
        h('div', {}, h('span', { class: 'k' }, 'Your role'), h('b', ins.role))),
      h('div', { class: 'party-row' }, h('div', { class: 'g', style: { '--c': ARCH[partner].color } }, glyph(partner)),
        h('div', {}, h('span', { class: 'k' }, 'Best co-op partner'), h('b', `The ${ARCH[partner].name}`))),
      h('div', { class: 'party-row' }, h('div', { class: 'g', style: { '--c': ARCH[nemesis].color } }, glyph(nemesis)),
        h('div', {}, h('span', { class: 'k' }, 'Natural nemesis'), h('b', `The ${ARCH[nemesis].name}`)))));

  const games = h('section', { class: 'panel', 'aria-label': 'Games to try' },
    h('div', { class: 'panel-title' }, h('h3', 'Your habitat')),
    h('p', { style: { margin: '0 0 14px', color: 'var(--ink-2)' } }, ins.habitat + '.'),
    h('div', { class: 'games' }, ins.games.map((g, i) => h('span', { class: 'game', style: { '--r': `${((i * 7) % 5) - 2}deg` } }, g))));

  const stripPanel = h('section', { class: 'panel', 'aria-label': 'Your answer print' },
    h('div', { class: 'panel-title' }, h('h3', 'Your playerprint'), h('span', { class: 'kicker' }, 'one bar per answer')),
    h('div', { class: 'print-strip' }, r.strip.map((k, i) => h('i', { class: k ? null : 'neutral', style: k ? { background: ARCH[k].color } : null, title: `Q${i + 1}: ${k ? ARCH[k].name : 'neutral'}` }))),
    h('div', { class: 'print-cap' }, h('span', 'Q01'), h('span', 'colour = pole the answer fed'), h('span', `Q${r.strip.length}`)));

  /* ------------------------------------------------------------ */
  /* Share                                                         */
  /* ------------------------------------------------------------ */
  const url = shareUrl(code);
  const canvas = h('canvas', { width: 1080, height: 1350, 'aria-label': 'Share card preview' });
  const cardReady = renderCard(canvas, r, { code, origin: location.host, tagline: ins.tagline });
  const fileName = `playerprint-${r.title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.png`;
  const toBlob = () => cardReady.then(() => new Promise((res) => canvas.toBlob(res, 'image/png')));

  async function download() {
    const blob = await toBlob();
    const a = h('a', { href: URL.createObjectURL(blob), download: fileName });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Card saved. Go post it.');
  }
  async function copyLink(input) {
    try { await navigator.clipboard.writeText(url); toast('Link copied.'); }
    catch { input.select(); document.execCommand?.('copy'); toast('Link selected — copy it.'); }
  }
  async function nativeShare() {
    const text = `I'm ${r.title} on PLAYERPRINT — ${ins.tagline}`;
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: r.title, text, url, files: [file] });
      else await navigator.share({ title: r.title, text, url });
    } catch (e) { if (e?.name !== 'AbortError') toast('Sharing failed — try copying the link.'); }
  }

  const linkInput = h('input', { value: url, readonly: true, 'aria-label': 'Share link', onfocus: (e) => e.target.select() });
  const cmpInput = h('input', { placeholder: 'Paste a friend\'s PLAYERPRINT link or code', 'aria-label': 'Friend link or code', value: fr ? shareUrl(vsCode) : '' });
  const cmpForm = h('form', { class: 'compare-form' }, cmpInput, h('button', { class: 'btn btn-sm btn-sun', type: 'submit' }, 'Compare'));
  cmpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = parseCodeInput(cmpInput.value);
    if (!c) { toast('That doesn\'t look like a PLAYERPRINT link.'); return; }
    if (c === code) { toast('That\'s this same print!'); return; }
    navigate(`/r/${code}?vs=${c}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const share = h('section', { class: 'share-panel', 'aria-label': 'Share' },
    h('div', { class: 'share-preview' }, canvas),
    h('div', { class: 'share-actions' },
      h('span', { class: 'kicker' }, 'Specimen card · 1080 × 1350'),
      h('h2', 'Print it. Post it. Start arguments.'),
      h('div', { class: 'share-btns' },
        h('button', { class: 'btn btn-hot', type: 'button', onclick: download }, 'Download card', h('span', { class: 'arrow' }, '↓')),
        navigator.share ? h('button', { class: 'btn', type: 'button', onclick: nativeShare }, 'Share…') : null),
      h('div', { class: 'linkbox' }, linkInput, h('button', { type: 'button', onclick: () => copyLink(linkInput) }, 'Copy')),
      h('p', { class: 'kicker', style: { margin: '0', textTransform: 'none', letterSpacing: '0' } }, 'The link encodes your answers — anyone who opens it sees this exact print. No account needed.'),
      h('div', {}, h('div', { class: 'kicker', style: { marginBottom: '8px' } }, 'Compare with a friend'), cmpForm)));

  /* ------------------------------------------------------------ */
  /* Account: save CTA / previous run                              */
  /* ------------------------------------------------------------ */
  const saveSlot = h('div');
  function paintSaveCta(saved) {
    saveSlot.replaceChildren();
    if (!(mine || fresh)) return;
    if (session.user && saved) return;
    if (session.user) {
      saveSlot.append(h('div', { class: 'save-cta' },
        h('p', h('b', 'Not in your field log yet.'), ' Save it to track how you drift over time.'),
        h('button', { class: 'btn btn-sm btn-ink', type: 'button', onclick: saveNow }, 'Save this run')));
      return;
    }
    saveSlot.append(h('div', { class: 'save-cta' },
      h('p', h('b', 'Want to see how you change?'), ' Sign in (optional, 10 seconds) to keep this print in a private field log, compare retakes and watch your dot drift across the atlas.'),
      h('button', { class: 'btn btn-sm btn-ink', type: 'button', onclick: saveNow }, 'Save to my field log')));
  }
  async function saveNow() {
    saving = true; // suppress the sign-in re-render until the save has landed
    if (!session.user) {
      const u = await openAuth({ mode: 'register', reason: 'Create an account (or switch to “Sign in”) and this print goes straight into your field log.' });
      if (!u) { saving = false; return; }
    }
    try {
      const anon = store.get('pp.anon') || {};
      await api.submit(code, anon[code] ? { claim: anon[code] } : {});
      if (anon[code]) { delete anon[code]; store.set('pp.anon', anon); }
      toast('Saved to your field log.');
    } catch (e) { toast(e.message); }
    saving = false;
    if (alive) navigate(location.pathname + location.search, { replace: true });
  }

  const chemSlot = h('div');
  if (fr) {
    const c = chemistry(r, fr);
    chemSlot.append(h('div', { class: 'chem' },
      h('div', { class: 'chem-pair' },
        h('div', { class: 'g', style: { '--c': prim.color }, title: r.title }, glyph(r.primary)),
        h('div', { class: 'score' }, `${c.score}%`),
        h('div', { class: 'g', style: { '--c': ARCH[fr.primary].color }, title: fr.title }, glyph(fr.primary))),
      h('div', {},
        h('span', { class: 'kicker', style: { display: 'block', marginBottom: '4px' } }, 'Chemistry'),
        h('b', `${r.title} × ${fr.title}`),
        h('p', c.verdict),
        h('p', {}, h('a', { href: `/r/${vsCode}`, 'data-link': '' }, 'Open their print →'), ' · ', h('a', { href: `/r/${code}`, 'data-link': '' }, 'Hide comparison')))));
    chips.append(chip('friend', `Friend · ${fr.title.replace(/^The /, '')}`, ARCH[fr.primary].color));
  }

  let historyChip = null;
  async function loadHistory() {
    if (!session.user) { paintSaveCta(false); return; }
    let runs = [];
    try { runs = (await api.history()).results; } catch { return; }
    if (!alive) return;
    const hasThis = runs.some((x) => x.code === code);
    if (hasThis) theLabel.textContent = 'You are the';
    paintSaveCta(hasThis);
    const current = runs.find((x) => x.code === code);
    const prev = runs.find((x) => x.code !== code && (!current || x.createdAt < current.createdAt));
    if (prev) {
      plane.setGhost({ x: prev.x, y: prev.y }, `prev · ${fmtDate(prev.createdAt)}`);
      paintAxes(prev);
    }
    const chrono = [...runs].reverse();
    if (chrono.length > 1) {
      plane.setTrail(chrono.map((x) => ({ x: x.x, y: x.y })));
      if (!historyChip) { historyChip = chip('trail', `My ${chrono.length} runs`); chips.append(historyChip); }
    }
  }

  /* ------------------------------------------------------------ */
  /* Assemble                                                      */
  /* ------------------------------------------------------------ */
  root.append(h('section', { class: 'results' }, h('div', { class: 'wrap' },
    specimen, head, saveSlot, chemSlot,
    h('div', { class: 'res-main' }, mapPanel, scorePanel),
    h('div', { class: 'res-lower' }, insight, h('div', { class: 'side-stack' }, party, games, stripPanel)),
    share,
    h('div', { class: 'retake' },
      h('span', { class: 'kicker' }, 'Moods change. Prints drift.'),
      h('div', { class: 'share-btns', style: { justifyContent: 'center' } },
        h('a', { class: 'btn', href: '/quiz', 'data-link': '' }, mine || fresh ? 'Retake the test' : 'Take the test yourself', h('span', { class: 'arrow' }, '→')),
        h('a', { class: 'btn btn-ghost', href: '/atlas', 'data-link': '' }, 'Explore the atlas'))))));

  // Plane content
  plane.setCloud(r.cloud, 'var(--ink)');
  plane.setTethers(r.scores, r.point);
  plane.setMe(r.point, { tag: mine || fresh ? 'YOU' : fr ? 'THIS' : 'THEM', ms: 1400 }).then(() => {
    if (fr && alive) plane.setFriend(fr.point, fr.title.replace(/^The /, ''), ARCH[fr.primary].color);
  });
  inspect(r.primary);

  getStats().then((st) => {
    if (!st || !alive) return;
    plane.setCrowd(st);
    const n = st.titles[r.titleKey] || 0;
    const share = st.total ? n / st.total : 0;
    rarityV.replaceChildren(share < 0.005 ? '<1' : String(Math.round(share * 100)), h('small', '%'));
    rarityL.textContent = `of ${st.total.toLocaleString()} charted players${share > 0 ? ` · 1 in ${Math.max(1, Math.round(1 / share))}` : ''}`;
  });

  // First view of a freshly-finished run: submit (anonymous → atlas; signed in → field log).
  if (fresh) {
    try {
      const res = await api.submit(code);
      if (res.saved) toast('Saved to your field log.');
      else {
        // Remember our anonymous row so it can be claimed if we sign up later.
        const anon = store.get('pp.anon') || {};
        anon[code] = res.result.publicId;
        store.set('pp.anon', Object.fromEntries(Object.entries(anon).slice(-20)));
      }
    } catch { /* offline is fine — the link still works */ }
  }
  loadHistory();

  const unsub = session.subscribe(() => { if (alive && !saving) navigate(location.pathname + location.search, { replace: true }); });
  return () => { alive = false; unsub(); };
}

