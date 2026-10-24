'use strict';

/* ═══════════════════════════════════════════════════════════════════
   HEXAXIS client — SPA state machine
   routes: /  /quiz  /results/:id  /r/:id  /dashboard
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    content: null,
    user: null,
    quiz: null,           // {token, questions, answers[], index}
    result: null,         // current result payload
    souls: [],
    charts: [],           // live StarChart instances to clean up
    timers: [],
    comparePick: [],
  };

  /* ── tiny helpers ─────────────────────────────────────────────── */
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'The atlas flickered.'), { status: res.status });
    return data;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2800);
  }

  function roman(n) {
    const table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
    return out;
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const signed = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);

  function glyphSVG(pole, cls) {
    const pts = pole.glyph.stars;
    const lines = pole.glyph.links
      .map(([a, b]) => `<line class="g-line" x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}"/>`)
      .join('');
    const dots = pts.map((p) => `<circle class="g-star" cx="${p[0]}" cy="${p[1]}" r="4.5"/>`).join('');
    return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${lines}${dots}</svg>`;
  }

  function trackChart(chart) { state.charts.push(chart); return chart; }
  function cleanup() {
    for (const c of state.charts) c.destroy();
    state.charts = [];
    for (const t of state.timers) clearInterval(t);
    state.timers = [];
  }

  /* ── background starfield ─────────────────────────────────────── */
  function initSky() {
    const canvas = $('#sky');
    const ctx = canvas.getContext('2d');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars = [];
    let mx = 0, my = 0;

    function resize() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((innerWidth * innerHeight) / 11000);
      stars = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: 0.4 + Math.random() * 1.4,
        depth: 0.25 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        gold: Math.random() > 0.88,
      }));
    }
    resize();
    addEventListener('resize', resize);
    if (!reduced && matchMedia('(pointer:fine)').matches) {
      addEventListener('mousemove', (e) => {
        mx = (e.clientX / innerWidth - 0.5) * 14;
        my = (e.clientY / innerHeight - 0.5) * 14;
      });
    }
    function frame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const t = now / 1000;
      for (const s of stars) {
        const tw = reduced ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * 0.5 * s.depth + s.phase));
        ctx.globalAlpha = 0.75 * tw * s.depth;
        ctx.fillStyle = s.gold ? '#f2d8a0' : '#cfd8f5';
        ctx.beginPath();
        ctx.arc(s.x + mx * s.depth, s.y + my * s.depth, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── router ───────────────────────────────────────────────────── */
  function route() {
    cleanup();
    const path = location.pathname;
    const screens = $$('.screen');
    screens.forEach((s) => { s.hidden = true; });

    if (path === '/') return show('screen-landing'), mountLanding();
    if (path === '/quiz') return show('screen-quiz'), mountQuiz();
    const resMatch = path.match(/^\/(?:r|results)\/([A-Za-z0-9_-]{8,32})$/);
    if (resMatch) return show('screen-results'), mountResults(resMatch[1]);
    if (path === '/dashboard') return show('screen-dashboard'), mountDashboard();
    return show('screen-404');
  }

  function show(id) {
    $('#' + id).hidden = false;
    scrollTo({ top: 0, behavior: 'instant' });
  }

  function nav(path) {
    history.pushState({}, '', path);
    route();
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (a) { e.preventDefault(); nav(a.getAttribute('href')); }
  });
  addEventListener('popstate', route);

  /* ── header / auth state ──────────────────────────────────────── */
  function renderAuthState() {
    const u = state.user;
    $('#whoami').hidden = !u;
    if (u) $('#whoami').textContent = u.name;
    $('#nav-atlas').hidden = !u;
    $('#nav-auth').hidden = !!u;
    $('#nav-logout').hidden = !u;
  }

  /* ── landing ──────────────────────────────────────────────────── */
  function mountLanding() {
    document.title = 'HEXAXIS — A Cartography of the Gamer Soul';
    const grid = $('#archetype-grid');
    grid.innerHTML = '';
    const axisName = { CMP: 'Glory', SOC: 'Glory', EXP: 'Pursuit', ACH: 'Pursuit', ARC: 'Method', DAR: 'Method' };
    for (const code of state.content.poleOrder) {
      const p = state.content.poles[code];
      const card = document.createElement('article');
      card.className = 'arch-card';
      card.style.setProperty('--arch', p.color);
      card.innerHTML = `
        <span class="arch-axis">${axisName[code]} axis</span>
        ${glyphSVG(p, 'arch-glyph')}
        <h3 class="arch-name">${p.name}</h3>
        <p class="arch-const">${p.constellation}</p>
        <p class="arch-motto">“${p.motto}”</p>
        <p class="arch-lore">${p.lore}</p>`;
      grid.appendChild(card);
    }

    // ambient demo chart: souls + a wanderer drifting between destinations
    const chart = trackChart(new StarChart($('#demo-chart'), { mini: false }));
    chart.setContent(state.content);
    api('/api/population').then((pop) => {
      state.souls = pop.souls;
      chart.setSouls(pop.souls);
    }).catch(() => {});
    let dest = null, cur = { x: 0, y: 0 };
    const wander = setInterval(() => {
      dest = { x: (Math.random() * 2 - 1) * 1.1, y: (Math.random() * 2 - 1) * 1.1 };
    }, 3400);
    state.timers.push(wander);
    const drift = setInterval(() => {
      if (!dest) return;
      cur.x += (dest.x - cur.x) * 0.04;
      cur.y += (dest.y - cur.y) * 0.04;
      const r = Math.hypot(cur.x, cur.y);
      chart.setUser({ x: cur.x, y: cur.y, rDisplay: Math.min(0.98, r * 0.9) }, '#d8b26e');
      chart.t = 1;
      chart._render(performance.now());
    }, 50);
    state.timers.push(drift);
    chart.play();
  }

  /* ── quiz ─────────────────────────────────────────────────────── */
  const QUIZ_KEY = 'hexaxis.quiz';

  async function mountQuiz() {
    document.title = 'HEXAXIS — The Reading';
    const saved = sessionStorage.getItem(QUIZ_KEY);
    if (saved) {
      try {
        const q = JSON.parse(saved);
        if (q && q.token && Array.isArray(q.questions) && q.answers.length < q.questions.length) {
          state.quiz = q;
          return renderQuestion(false);
        }
      } catch { /* fall through to fresh start */ }
    }
    try {
      const data = await api('/api/quiz/start', { method: 'POST', body: {} });
      state.quiz = { token: data.token, questions: data.questions, answers: [], index: 0 };
      sessionStorage.setItem(QUIZ_KEY, JSON.stringify(state.quiz));
      renderQuestion(false);
    } catch (err) {
      toast(err.message);
      nav('/');
    }
  }

  function renderQuestion(animate = true) {
    const q = state.quiz;
    const item = q.questions[q.index];
    const card = $('#quiz-card');
    const total = q.questions.length;

    const paint = () => {
      $('#quiz-question').textContent = item.text;
      $('#opt-a').querySelector('.opt-text').textContent = item.options[0];
      $('#opt-b').querySelector('.opt-text').textContent = item.options[1];
      $('#opt-a').classList.remove('chosen');
      $('#opt-b').classList.remove('chosen');
      $('#quiz-counter').textContent = `TRIAL ${roman(q.index + 1)} · ${roman(total)}`;
      $('#quiz-progress-fill').style.width = `${(q.index / total) * 100}%`;
      $('#quiz-back').hidden = q.index === 0;
      card.classList.remove('swap-out');
      card.classList.add('swap-in');
      setTimeout(() => card.classList.remove('swap-in'), 380);
    };

    if (animate) {
      card.classList.add('swap-out');
      setTimeout(paint, 210);
    } else paint();
  }

  function answer(pick) {
    const q = state.quiz;
    if (!q || q.index >= q.questions.length) return;
    const btn = pick === 0 ? $('#opt-a') : $('#opt-b');
    btn.classList.add('chosen');
    q.answers[q.index] = { id: q.questions[q.index].id, pick };
    sessionStorage.setItem(QUIZ_KEY, JSON.stringify(q));
    $('#quiz-progress-fill').style.width = `${((q.index + 1) / q.questions.length) * 100}%`;

    setTimeout(() => {
      if (q.index + 1 >= q.questions.length) submitQuiz();
      else { q.index++; sessionStorage.setItem(QUIZ_KEY, JSON.stringify(q)); renderQuestion(); }
    }, 300);
  }

  async function submitQuiz() {
    const q = state.quiz;
    show('screen-analyzing');
    $('#screen-quiz').hidden = true;
    const lines = [
      'Charting your star…',
      'Weighing the six pulls…',
      'Cross-examining your instincts…',
      'Consulting the atlas…',
      'Ink drying…',
    ];
    let li = 0;
    $('#analyzing-line').textContent = lines[0];
    const lineTimer = setInterval(() => {
      li = (li + 1) % lines.length;
      $('#analyzing-line').textContent = lines[li];
    }, 640);
    state.timers.push(lineTimer);

    const started = Date.now();
    try {
      const result = await api('/api/quiz/submit', { method: 'POST', body: { token: q.token, answers: q.answers } });
      const wait = Math.max(0, 2500 - (Date.now() - started));
      setTimeout(() => {
        sessionStorage.removeItem(QUIZ_KEY);
        state.quiz = null;
        state.freshResultId = result.id;
        nav(`/results/${result.id}`);
      }, wait);
    } catch (err) {
      sessionStorage.removeItem(QUIZ_KEY);
      state.quiz = null;
      toast(err.message || 'The reading was lost to the void. Begin again.');
      nav('/quiz');
    }
  }

  $('#opt-a').addEventListener('click', () => answer(0));
  $('#opt-b').addEventListener('click', () => answer(1));
  $('#quiz-back').addEventListener('click', () => {
    if (state.quiz && state.quiz.index > 0) {
      state.quiz.index--;
      state.quiz.answers.length = state.quiz.index;
      sessionStorage.setItem(QUIZ_KEY, JSON.stringify(state.quiz));
      renderQuestion();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ($('#screen-quiz').hidden || !state.quiz) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') answer(0);
    else if (k === 'b' || k === 'arrowright') answer(1);
    else if (k === 'backspace') $('#quiz-back').click();
  });

  /* ── results ──────────────────────────────────────────────────── */
  async function mountResults(id) {
    let result;
    try {
      result = await api(`/api/results/${encodeURIComponent(id)}`);
    } catch {
      return show('screen-404');
    }
    state.result = result;
    document.title = `HEXAXIS · ${result.title}`;

    // "just charted" = you finished the reading in this browser session and
    // landed here — the only context where claiming your star makes sense.
    const justCharted = state.freshResultId === result.id;
    const visiting = !result.mine && !justCharted; // looking at someone else's star
    const dateStr = fmtDate(result.createdAt);
    $('#res-eyebrow').textContent = visiting
      ? `Charted by ${result.ownerName || 'a fellow traveler'} · ${dateStr}`
      : `The Atlas has spoken · ${dateStr}`;
    $('#res-title').textContent = result.title;
    $('#res-epithet').textContent = result.epithet;

    // chips
    const prim = state.content.poles[result.primary];
    const sec = state.content.poles[result.secondary];
    const chips = [
      `<span class="chip"><span class="dot" style="background:${prim.color}"></span>primary <b>${prim.name}</b></span>`,
      result.hybrid ? `<span class="chip"><span class="dot" style="background:${sec.color}"></span>undertow <b>${sec.name}</b></span>` : '',
      `<span class="chip">conviction <b>${result.conviction.value}</b></span>`,
      `<span class="chip">consistency <b>${result.consistency.value}</b></span>`,
    ];
    $('#res-chips').innerHTML = chips.join('');

    $('#coord-readout').textContent =
      `x ${signed(result.point.x)}  ·  y ${signed(result.point.y)}  ·  pull ${result.point.r.toFixed(2)} — the Still Center lies behind you`;

    // chart
    const tip = $('#pole-tip');
    const chart = trackChart(new StarChart($('#result-chart'), {
      interactive: true,
      onPoleHover: (code, x, y, pinned) => {
        const p = state.content.poles[code];
        tip.style.setProperty('--tip-color', p.color);
        tip.innerHTML = `<h4>${p.name} · ${p.constellation}</h4><p class="tip-motto">“${p.motto}”</p><p class="tip-lore">${p.lore}</p>`;
        tip.hidden = false;
        if (x != null) {
          const holder = $('.chart-holder').getBoundingClientRect();
          tip.style.left = Math.min(Math.max(8, x + 16), holder.width - 250) + 'px';
          tip.style.top = Math.max(8, y - 10) + 'px';
        } else {
          tip.style.left = '16px';
          tip.style.top = '16px';
        }
      },
      onPoleLeave: () => { tip.hidden = true; },
    }));
    chart.setContent(state.content);
    if (state.souls.length) chart.setSouls(state.souls);
    else api('/api/population').then((pop) => { state.souls = pop.souls; chart.setSouls(pop.souls); }).catch(() => {});
    chart.setUser(result.point, '#7cd4ff');
    chart.play();

    $('#toggle-souls').checked = true;
    $('#toggle-souls').onchange = (e) => {
      chart.setSouls(e.target.checked ? state.souls : []);
      chart.t = 1;
      chart._render(performance.now());
    };

    // axis bars
    const bars = $('#axis-bars');
    bars.innerHTML = '';
    for (const code of state.content.poleOrder) {
      const p = state.content.poles[code];
      const s = result.poles[code].s;
      const pct = result.percentiles[code];
      const row = document.createElement('div');
      row.className = 'axis-row';
      row.style.setProperty('--arch', p.color);
      row.innerHTML = `
        ${glyphSVG(p, 'axis-glyph')}
        <div class="axis-main">
          <div class="axis-top">
            <span class="axis-name">${p.name}</span>
            <span class="axis-val"><b>${Math.round(s * 100)}%</b> pull</span>
          </div>
          <div class="axis-track"><div class="axis-fill"></div></div>
          <p class="axis-pct">more ${p.name.toLowerCase()} than ${pct}% of charted souls</p>
        </div>`;
      bars.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        row.querySelector('.axis-fill').style.width = `${s * 100}%`;
      }));
    }

    // pair meters
    const meters = $('#pair-meters');
    meters.innerHTML = '';
    for (const axis of state.content.axes) {
      const a = state.content.poles[axis.a];
      const b = state.content.poles[axis.b];
      const d = result.axes[axis.id].d;
      const el = document.createElement('div');
      el.className = 'pair-meter';
      el.innerHTML = `
        <span class="pair-name"><span class="pdot" style="background:${a.color}"></span>${a.name}</span>
        <div class="pair-track" style="--ca:${a.color};--cb:${b.color}"><div class="pair-marker"></div></div>
        <span class="pair-name right">${b.name}<span class="pdot" style="background:${b.color}"></span></span>
        <span class="pair-axis-label">the ${axis.name} axis · ${Math.abs(Math.round(d * 100))}% ${d >= 0 ? a.name : b.name}</span>`;
      meters.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.querySelector('.pair-marker').style.left = `${50 + d * 50}%`;
      }));
    }

    // insight
    $('#insight-body').innerHTML = result.insight.map((p) => `<p>${p}</p>`).join('');

    // games
    $('#games-row').innerHTML = result.games.map((g) => `<span class="game-chip">${g}</span>`).join('');

    // share row state
    const canClaim = justCharted && !result.claimed;
    $('#btn-save').hidden = !canClaim;
    $('#saved-note').hidden = !result.mine;
    $('#share-cta').hidden = !visiting;

    $('#btn-copy').onclick = async () => {
      const url = location.origin + result.sharePath;
      try {
        await navigator.clipboard.writeText(url);
        toast('Share link copied — go forth and compare stars.');
      } catch {
        prompt('Copy your share link:', url);
      }
    };
    $('#btn-png').onclick = () => {
      HexaxisExport.exportPNG(result, state.content, state.souls);
      toast('Portrait downloaded.');
    };
    $('#btn-retake').onclick = () => { sessionStorage.removeItem(QUIZ_KEY); nav('/quiz'); };
    $('#btn-save').onclick = () => {
      if (!state.user) openAuth('signup', result.id);
      else {
        api(`/api/results/${result.id}/claim`, { method: 'POST', body: {} })
          .then(() => { $('#btn-save').hidden = true; $('#saved-note').hidden = false; toast('Saved to your atlas.'); })
          .catch((e) => toast(e.message));
      }
    };

    // stagger reveals
    $$('#screen-results .reveal').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.09}s`;
    });
  }

  /* ── dashboard ────────────────────────────────────────────────── */
  async function mountDashboard() {
    document.title = 'HEXAXIS — Your Atlas';
    if (!state.user) {
      try {
        const me = await api('/api/me');
        state.user = me.user;
        renderAuthState();
      } catch { /* ignore */ }
    }
    if (!state.user) {
      openAuth('signin');
      $('#dash-empty').hidden = false;
      $('#dash-empty').querySelector('p').textContent = 'Sign in to see the stars you have charted.';
      $('#dash-list').innerHTML = '';
      $('#dash-drift').hidden = true;
      $('#compare-panel').hidden = true;
      return;
    }
    const { results } = await api('/api/me/results');
    state.comparePick = [];
    $('#compare-panel').hidden = true;

    $('#dash-empty').hidden = results.length > 0;
    const list = $('#dash-list');
    list.innerHTML = '';

    if (results.length >= 2) {
      const first = results[results.length - 1];
      const last = results[0];
      const dx = last.point.x - first.point.x;
      const dy = last.point.y - first.point.y;
      const drift = Math.hypot(dx, dy);
      $('#dash-drift').innerHTML =
        `Across <b>${results.length}</b> readings your star has wandered <b>${drift.toFixed(2)}</b> units — ` +
        (drift < 0.3 ? 'remarkably steady. You know what you are.' : drift < 0.7 ? 'a healthy drift. You contain weather.' : 'restless. The Atlas approves of range.');
      $('#dash-drift').hidden = false;
    } else {
      $('#dash-drift').hidden = true;
    }

    for (const r of results) {
      const card = document.createElement('div');
      card.className = 'dash-card';
      card.innerHTML = `
        <button class="dash-del" title="Unchart this star" aria-label="Delete">&times;</button>
        <canvas></canvas>
        <h4>${r.title}</h4>
        <p class="dash-meta">${fmtDate(r.createdAt)} · conviction ${r.conviction.value}</p>`;
      list.appendChild(card);
      const mini = trackChart(new StarChart(card.querySelector('canvas'), { mini: true }));
      mini.setContent(state.content);
      mini.setUser(r.point, '#7cd4ff');
      mini.t = 1;
      mini._render(performance.now());

      card.addEventListener('click', (e) => {
        if (e.target.closest('.dash-del')) return;
        if (e.shiftKey || state.comparePick.length > 0) return toggleComparePick(r, card);
        nav(`/results/${r.id}`);
      });
      card.querySelector('.dash-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Unchart “${r.title}”? This cannot be undone.`)) return;
        try {
          await api(`/api/results/${r.id}`, { method: 'DELETE' });
          toast('Star uncharted.');
          mountDashboard();
        } catch (err) { toast(err.message); }
      });
      card.title = 'Click to view · Shift-click to compare two readings';
    }
  }

  function toggleComparePick(result, card) {
    const i = state.comparePick.findIndex((r) => r.id === result.id);
    if (i >= 0) {
      state.comparePick.splice(i, 1);
      card.classList.remove('selected');
    } else {
      if (state.comparePick.length >= 2) {
        const old = state.comparePick.shift();
        $$('.dash-card').forEach((c) => c.classList.remove('selected'));
        state.comparePick.push(old, result);
        card.classList.add('selected');
        // re-mark: simplest is to re-render dashboard selections
      } else {
        state.comparePick.push(result);
        card.classList.add('selected');
      }
    }
    if (state.comparePick.length === 2) renderCompare(state.comparePick[0], state.comparePick[1]);
    else $('#compare-panel').hidden = true;
  }

  function renderCompare(a, b) {
    const panel = $('#compare-panel');
    panel.hidden = false;
    const chart = trackChart(new StarChart($('#compare-chart'), {}));
    chart.setContent(state.content);
    chart.setCompare(a.point, b.point);
    chart.play();

    const deltas = $('#compare-deltas');
    deltas.innerHTML = `<p class="chart-note" style="text-align:left">gold — ${a.title} (${fmtDate(a.createdAt)})<br>azure — ${b.title} (${fmtDate(b.createdAt)})</p>`;
    for (const code of state.content.poleOrder) {
      const p = state.content.poles[code];
      const row = document.createElement('div');
      row.className = 'delta-row';
      row.innerHTML = `
        <div class="delta-name"><span>${p.name}</span><span>${Math.round(a.poles[code].s * 100)}% → ${Math.round(b.poles[code].s * 100)}%</span></div>
        <div class="delta-track">
          <div class="delta-dot" style="left:${a.poles[code].s * 100}%;background:#d8b26e"></div>
          <div class="delta-dot" style="left:${b.poles[code].s * 100}%;background:#7cd4ff"></div>
        </div>`;
      deltas.appendChild(row);
    }
    const dx = b.point.x - a.point.x, dy = b.point.y - a.point.y;
    $('#compare-note').textContent = `your star wandered ${Math.hypot(dx, dy).toFixed(2)} units between these two readings`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('#compare-close').addEventListener('click', () => {
    state.comparePick = [];
    $$('.dash-card').forEach((c) => c.classList.remove('selected'));
    $('#compare-panel').hidden = true;
  });

  /* ── auth modal ───────────────────────────────────────────────── */
  let authMode = 'signin';
  let authClaim = null;

  function openAuth(mode, claim = null) {
    authMode = mode;
    authClaim = claim;
    $('#auth-modal').hidden = false;
    $('#auth-error').hidden = true;
    setAuthTab(mode);
    $('#auth-note').textContent = claim
      ? 'Create an account and this star is saved to your atlas forever.'
      : 'Accounts are optional — the reading is always free, always full.';
    setTimeout(() => $('#auth-email').focus(), 60);
  }
  function closeAuth() { $('#auth-modal').hidden = true; }

  function setAuthTab(mode) {
    authMode = mode;
    $('#tab-signin').classList.toggle('active', mode === 'signin');
    $('#tab-signup').classList.toggle('active', mode === 'signup');
    $('#field-name').hidden = mode !== 'signup';
    $('#auth-submit').textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    $('#auth-password').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
  }

  $('#nav-auth').addEventListener('click', () => openAuth('signin'));
  $('#auth-close').addEventListener('click', closeAuth);
  $('#auth-modal').addEventListener('click', (e) => { if (e.target === $('#auth-modal')) closeAuth(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#auth-modal').hidden) closeAuth(); });
  $('#tab-signin').addEventListener('click', () => setAuthTab('signin'));
  $('#tab-signup').addEventListener('click', () => setAuthTab('signup'));

  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#auth-error');
    errEl.hidden = true;
    const btn = $('#auth-submit');
    btn.disabled = true;
    const body = {
      email: $('#auth-email').value.trim(),
      password: $('#auth-password').value,
      claim: authClaim || undefined,
    };
    if (authMode === 'signup') body.name = $('#auth-name').value.trim();
    try {
      const { user } = await api(`/api/auth/${authMode === 'signup' ? 'signup' : 'login'}`, { method: 'POST', body });
      state.user = user;
      renderAuthState();
      closeAuth();
      toast(authClaim ? `Welcome, ${user.name} — your star is saved.` : `Welcome back, ${user.name}.`);
      if (authClaim && state.result) {
        $('#btn-save').hidden = true;
        $('#saved-note').hidden = false;
        state.result.mine = true;
      }
      if (location.pathname === '/dashboard') mountDashboard();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  $('#nav-logout').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* ignore */ }
    state.user = null;
    renderAuthState();
    toast('Logged out. The stars keep your secrets.');
    if (location.pathname === '/dashboard') nav('/');
  });

  /* ── boot ─────────────────────────────────────────────────────── */
  async function boot() {
    initSky();
    try {
      const [content, me] = await Promise.all([
        api('/api/content'),
        api('/api/me').catch(() => ({ user: null })),
        document.fonts ? document.fonts.ready : Promise.resolve(),
      ]);
      state.content = content;
      state.user = me.user;
    } catch (err) {
      document.body.innerHTML = '<p style="padding:40px;font-family:monospace;color:#ece2c9">The Atlas failed to wake. Is the server running?</p>';
      return;
    }
    renderAuthState();
    route();
  }

  boot();
})();
