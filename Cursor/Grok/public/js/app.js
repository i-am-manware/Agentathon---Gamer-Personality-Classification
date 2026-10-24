import { formatNE, mountPlane } from './plane.js';

const QUIZ_KEY = 'rift.quiz';
let user = null;
let atlasCache = null;
let quizCache = null;
let viewAbort = new AbortController();
let renderSeq = 0;
let toastTimer = 0;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function ink(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#f3eee4';
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function formatDate(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ms));
}

function ensureClaim() {
  let token = localStorage.getItem('rift.claim');
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('rift.claim', token);
  }
  return token;
}

async function api(url, { method = 'GET', body, signal } = {}) {
  const headers = {};
  const claim = localStorage.getItem('rift.claim');
  if (claim) headers['x-claim-token'] = claim;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'same-origin',
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error(data.error || 'The night desk stumbled.');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function getAtlas(signal) {
  if (!atlasCache) atlasCache = await api('/api/atlas', { signal });
  return atlasCache;
}

async function getQuiz(signal) {
  if (!quizCache) quizCache = await api('/api/quiz', { signal });
  return quizCache;
}

function paintAccount() {
  const link = document.querySelector('#account-link');
  if (!link) return;
  link.textContent = user ? user.displayName : 'Sign in';
  const path = location.pathname;
  document.querySelectorAll('header nav a').forEach((a) => {
    const current = a.pathname === path || (a.id === 'account-link' && path === '/account');
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function nextSignal() {
  viewAbort.abort();
  viewAbort = new AbortController();
  return viewAbort.signal;
}

function navigate(href) {
  const next = new URL(href, location.origin);
  history.pushState({}, '', next.pathname + next.search);
  render();
}

function safeNext() {
  const next = new URLSearchParams(location.search).get('next') || '';
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '';
}

function metersHTML(pairs) {
  return (pairs || []).map((pair) => `
    <div class="axis" role="img" aria-label="${esc(pair.label)}: ${esc(pair.pos.label)} ${pair.pos.score}, ${esc(pair.neg.label)} ${pair.neg.score}">
      <div class="axis-top">
        <span><i class="swatch" style="background:${ink(pair.pos.color)}"></i>${esc(pair.pos.label)} <b>${pair.pos.score}</b></span>
        <span class="axis-name">${esc(pair.label)}</span>
        <span><b>${pair.neg.score}</b> ${esc(pair.neg.label)} <i class="swatch" style="background:${ink(pair.neg.color)}"></i></span>
      </div>
      <div class="track" aria-hidden="true">
        <i class="pos" style="width:${pair.pos.score}%;background:${ink(pair.pos.color)}"></i>
        <i class="neg" style="width:${pair.neg.score}%;background:${ink(pair.neg.color)}"></i>
      </div>
    </div>
  `).join('');
}

function chipsHTML(data) {
  const chips = [];
  if (data.clarity) chips.push(`Clarity <b>${esc(data.clarity.label)}</b>`);
  if (data.reach != null) chips.push(`Reach <b>${Number(data.reach).toFixed(2)}</b>`);
  for (const braid of data.braids || []) {
    const pair = (data.pairs || []).find((item) => item.id === braid);
    chips.push(`Braid <b>${esc(pair?.label || braid)}</b>`);
  }
  if (!chips.length) return '';
  return `<ul class="chips">${chips.map((chip) => `<li>${chip}</li>`).join('')}</ul>`;
}

function readingHTML(data) {
  const ne = formatNE(data.point.x, data.point.y);
  const guest = !user && data.owned && !sessionStorage.getItem(`rift.hide.${data.slug}`);
  const answers = data.answers ? `
    <details class="answers">
      <summary>Your answers</summary>
      <ol>
        ${data.answers.map((item) => `<li><p class="kicker">${esc(item.kicker)}</p><p>${esc(item.prompt)}</p><p class="choice">${esc(item.choice)}</p></li>`).join('')}
      </ol>
    </details>` : '';
  return `
    <article class="frame plate">
      <div class="read-kicker">
        <span>${esc(data.catalog || 'Playground')}</span>
        <span>${esc(formatDate(data.createdAt))}</span>
      </div>
      ${data.comparison ? `<aside class="drift"><span>Drift</span><p>${esc(data.comparison.narrative)}</p></aside>` : ''}
      <div class="read-grid">
        <div class="read-field">
          <div id="plane"></div>
          <p class="coords"><span>N ${ne.n}</span><span>E ${ne.e}</span></p>
          <p class="plane-note">Bright names are pulling. The jewel is their center of mass.</p>
          ${metersHTML(data.pairs)}
          ${chipsHTML(data)}
        </div>
        <div class="read-copy">
          <p class="callsign">${esc(data.callsign)}</p>
          <h1 class="read-title">${esc(data.title)}</h1>
          <p class="epithet">${esc(data.epithet)}</p>
          <blockquote class="pull">${esc(data.pull)}</blockquote>
          ${(data.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}
          ${data.slug ? `
            <div class="actions">
              <button type="button" class="btn primary" id="copy-link">Copy share line</button>
              <button type="button" class="btn ghost" id="save-png">Download PNG</button>
              <a class="btn ghost" href="/api/results/${esc(data.slug)}/card.svg" download="rift-index-${esc(data.slug)}.svg">SVG</a>
              <a class="btn ghost" href="/quiz?fresh=1">Read again</a>
              ${navigator.share ? '<button type="button" class="btn ghost" id="native-share">Share</button>' : ''}
              ${user && data.owned ? '<button type="button" class="text-btn" id="delete-chart">Remove from file</button>' : ''}
            </div>` : ''}
          ${guest ? `
            <div class="banner" id="guest-banner">
              <p>This chart has a link either way. A file keeps the next reading beside this one.</p>
              <div class="actions">
                <a class="btn primary" href="/account?next=${encodeURIComponent(`/r/${data.slug}`)}">Create a file</a>
                <button type="button" class="btn ghost" id="dismiss-guest">Continue without an account</button>
              </div>
            </div>` : ''}
          ${!data.owned ? `<p class="fine"><a href="/quiz">Take the reading yourself.</a></p>` : ''}
          ${answers}
        </div>
      </div>
    </article>
  `;
}

function mountReading(data, { trail, ghosts } = {}) {
  const host = document.querySelector('#plane');
  if (!host) return;
  mountPlane(host, data, {
    ghosts: ghosts || (data.comparison ? [{ x: data.comparison.point.x, y: data.comparison.point.y, title: data.comparison.title }] : []),
    trail: trail || (data.comparison ? [data.comparison.point, data.point] : []),
  });
}

async function copyShare(data) {
  const url = `${location.origin}/r/${data.slug}`;
  const ne = formatNE(data.point.x, data.point.y);
  const line = `${data.title} — ${data.callsign}. North ${ne.n}, east ${ne.e}. ${url}`;
  try {
    await navigator.clipboard.writeText(line);
  } catch {
    const area = document.createElement('textarea');
    area.value = line;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast('Share line copied.');
}

async function downloadPng(slug) {
  const svg = await fetch(`/api/results/${slug}/card.svg`).then((res) => {
    if (!res.ok) throw new Error('The card could not be drawn.');
    return res.text();
  });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('The card could not be drawn.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#110f0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = `rift-index-${slug}.png`;
    a.click();
    toast('PNG downloaded.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderCover(app, signal) {
  document.title = 'Rift Index';
  const atlas = await getAtlas(signal);
  if (signal.aborted) return;
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(QUIZ_KEY) || 'null'); } catch { /* ignore */ }
  const last = localStorage.getItem('rift.last');
  app.innerHTML = `
    <section class="frame cover-grid">
      <div class="cover-copy">
        <p class="eyebrow">Vol. 01 · The playfield</p>
        <h1>Where do you<br><em>play from?</em></h1>
        <p class="lede">Twenty-four situations. Six signals, set as three opposing pairs. A coordinate, not a costume.</p>
        <div class="cta-row">
          <a class="btn primary" href="/quiz">${saved && saved.step > -1 ? 'Resume the reading' : 'Begin the reading'}</a>
          <a class="btn ghost" href="/r/sample">View a finished chart</a>
        </div>
        <p class="fine">About six minutes. <a href="/quiz">Continue without an account</a> and the full chart is still yours.</p>
        ${last ? `<p class="fine"><a href="/r/${esc(last)}">Your latest chart</a></p>` : ''}
      </div>
      <div>
        <div id="hero-plane"></div>
        <p class="demo-caption" id="demo-caption"></p>
      </div>
    </section>
  `;
  const host = document.querySelector('#hero-plane');
  const caption = document.querySelector('#demo-caption');
  let index = 0;
  const show = (i) => {
    const demo = atlas.demos[i % atlas.demos.length];
    caption.textContent = `Demonstration · ${demo.title}`;
    mountPlane(host, demo, { animate: true });
  };
  show(0);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && atlas.demos.length > 1) {
    const timer = setInterval(() => {
      index += 1;
      show(index);
    }, 4600);
    signal.addEventListener('abort', () => clearInterval(timer));
  }
}

function loadQuizState(version) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(QUIZ_KEY) || 'null');
    if (saved && saved.version === version) return saved;
  } catch { /* ignore */ }
  return { version, callsign: user?.displayName || '', step: -1, answers: {} };
}

function saveQuizState(state) {
  sessionStorage.setItem(QUIZ_KEY, JSON.stringify(state));
}

async function renderQuiz(app, signal) {
  document.title = 'The reading — Rift Index';
  if (new URLSearchParams(location.search).get('fresh') === '1') {
    sessionStorage.removeItem(QUIZ_KEY);
    history.replaceState({}, '', '/quiz');
  }
  const quiz = await getQuiz(signal);
  if (signal.aborted) return;
  const state = loadQuizState(quiz.version);
  if (!state.callsign && user) state.callsign = user.displayName;

  const paintShell = () => {
    app.innerHTML = `
      <section class="frame narrow quiz">
        <div class="quiz-top">
          <button type="button" id="quiz-back">Back</button>
          <p id="quiz-count"></p>
          <a href="/">Leave</a>
        </div>
        <div class="bar" aria-hidden="true"><span id="quiz-bar"></span></div>
        <div class="ticks" id="quiz-ticks" aria-hidden="true">${quiz.questions.map(() => '<i></i>').join('')}</div>
        <div id="quiz-body"></div>
        <p class="keys" id="quiz-keys"></p>
        <p class="sr-live" id="quiz-live" aria-live="polite"></p>
      </section>
    `;
    document.querySelector('#quiz-back').addEventListener('click', () => {
      if (state.step <= -1) {
        navigate('/');
        return;
      }
      state.step -= 1;
      saveQuizState(state);
      paint();
    }, { signal });
  };

  const paint = () => {
    const count = document.querySelector('#quiz-count');
    const bar = document.querySelector('#quiz-bar');
    const ticks = document.querySelector('#quiz-ticks');
    const body = document.querySelector('#quiz-body');
    const keys = document.querySelector('#quiz-keys');
    const live = document.querySelector('#quiz-live');
    if (!body) return;
    if (state.step < 0) {
      count.textContent = 'The plate';
      bar.style.width = '0%';
      ticks.querySelectorAll('i').forEach((tick) => { tick.className = ''; });
      keys.textContent = '';
      body.innerHTML = `
        <p class="kicker">Name on the chart</p>
        <h1>What should we print?</h1>
        <form id="callsign-form" class="stack">
          <label>Callsign
            <input name="callsign" maxlength="22" placeholder="${user ? esc(user.displayName) : 'Optional'}" value="${esc(state.callsign)}">
          </label>
          <button class="btn primary" type="submit">Begin the reading</button>
        </form>
        <p class="fine">${user
          ? `This reading will be filed under ${esc(user.displayName)}.`
          : 'Continue without an account. The full chart is issued either way.'}</p>
      `;
      body.querySelector('#callsign-form').addEventListener('submit', (event) => {
        event.preventDefault();
        state.callsign = new FormData(event.target).get('callsign') || '';
        state.step = 0;
        saveQuizState(state);
        paint();
      }, { signal });
      live.textContent = 'What should we print on the chart?';
      return;
    }
    const q = quiz.questions[state.step];
    count.textContent = `${String(state.step + 1).padStart(2, '0')}  /  ${String(quiz.questions.length).padStart(2, '0')}`;
    bar.style.width = `${((state.step + 1) / quiz.questions.length) * 100}%`;
    ticks.querySelectorAll('i').forEach((tick, i) => {
      tick.className = i < state.step ? 'on' : '';
    });
    keys.textContent = '1–4 answer  ·  ← back';
    body.innerHTML = `
      <p class="kicker">${esc(q.kicker)}</p>
      <h1 id="prompt">${esc(q.prompt)}</h1>
      <div class="options" role="radiogroup" aria-labelledby="prompt">
        ${q.options.map((option, i) => `
          <button type="button" class="option" role="radio" data-id="${esc(option.id)}" aria-checked="${state.answers[q.id] === option.id ? 'true' : 'false'}">
            <span class="key">${['A', 'B', 'C', 'D'][i]}</span>
            <span>${esc(option.text)}</span>
          </button>
        `).join('')}
      </div>
    `;
    live.textContent = `${q.kicker}. ${q.prompt}`;
    body.querySelectorAll('.option').forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.id), { signal });
    });
  };

  let lock = false;
  function choose(id) {
    if (lock || state.step < 0) return;
    const q = quiz.questions[state.step];
    state.answers[q.id] = id;
    saveQuizState(state);
    document.querySelectorAll('.option').forEach((btn) => {
      btn.setAttribute('aria-checked', btn.dataset.id === id ? 'true' : 'false');
    });
    lock = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      lock = false;
      if (signal.aborted) return;
      if (state.step < quiz.questions.length - 1) {
        state.step += 1;
        saveQuizState(state);
        paint();
      } else {
        finish();
      }
    }, reduce ? 0 : 220);
  }

  async function finish() {
    const ritualSignal = signal;
    app.innerHTML = `
      <section class="frame ritual" aria-live="polite">
        <p class="on" id="r1">Fixing the plate</p>
        <p id="r2">Reading the pull</p>
        <p id="r3">Naming the signal</p>
      </section>
    `;
    const lines = ['r1', 'r2', 'r3'];
    let line = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = reduce ? 0 : setInterval(() => {
      line = Math.min(lines.length - 1, line + 1);
      lines.forEach((id, i) => document.getElementById(id)?.classList.toggle('on', i <= line));
    }, 380);
    try {
      ensureClaim();
      const started = performance.now();
      const data = await api('/api/results', {
        method: 'POST',
        body: { answers: state.answers, callsign: state.callsign },
      });
      const wait = (reduce ? 160 : 1100) - (performance.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (timer) clearInterval(timer);
      if (ritualSignal.aborted) return;
      sessionStorage.removeItem(QUIZ_KEY);
      localStorage.setItem('rift.last', data.slug);
      history.replaceState({}, '', `/r/${data.slug}`);
      render();
    } catch (err) {
      if (timer) clearInterval(timer);
      if (ritualSignal.aborted) return;
      toast(err.message);
      paintShell();
      paint();
    }
  }

  paintShell();
  paint();

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea')) return;
    if (state.step < 0) return;
    if (event.key >= '1' && event.key <= '4') {
      event.preventDefault();
      const option = quiz.questions[state.step].options[Number(event.key) - 1];
      if (option) choose(option.id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      state.step -= 1;
      saveQuizState(state);
      paint();
    }
  }, { signal });
}

async function renderReading(app, signal, slug) {
  let data;
  try {
    data = await api(`/api/results/${slug}`, { signal });
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return;
    if (err.status === 404) {
      document.title = 'Not on file — Rift Index';
      app.innerHTML = `<section class="frame narrow"><p class="kicker">Missing chart</p><h1>This chart is not on file.</h1><p><a class="btn primary" href="/">Back to the desk</a></p></section>`;
      return;
    }
    throw err;
  }
  if (signal.aborted) return;
  document.title = `${data.title} — Rift Index`;
  app.innerHTML = readingHTML(data);
  mountReading(data);
  document.querySelector('#copy-link')?.addEventListener('click', () => copyShare(data), { signal });
  document.querySelector('#save-png')?.addEventListener('click', () => downloadPng(data.slug).catch((err) => toast(err.message)), { signal });
  document.querySelector('#native-share')?.addEventListener('click', () => {
    const ne = formatNE(data.point.x, data.point.y);
    navigator.share({
      title: `${data.title} — Rift Index`,
      text: `${data.pull} North ${ne.n}, east ${ne.e}.`,
      url: `${location.origin}/r/${data.slug}`,
    }).catch(() => {});
  }, { signal });
  document.querySelector('#dismiss-guest')?.addEventListener('click', () => {
    sessionStorage.setItem(`rift.hide.${data.slug}`, '1');
    document.querySelector('#guest-banner')?.remove();
  }, { signal });
  const del = document.querySelector('#delete-chart');
  del?.addEventListener('click', async () => {
    if (del.dataset.armed !== '1') {
      del.dataset.armed = '1';
      del.textContent = 'Remove it?';
      return;
    }
    await api(`/api/results/${data.slug}`, { method: 'DELETE' });
    toast('Removed from your file.');
    navigate('/account');
  }, { signal });
}

async function renderAtlas(app, signal) {
  document.title = 'Atlas — Rift Index';
  const atlas = await getAtlas(signal);
  if (signal.aborted) return;
  app.innerHTML = `
    <section class="frame">
      <p class="eyebrow">Field guide</p>
      <h1 class="page-title">Six signals, three arguments.</h1>
      <p class="lede atlas-intro">Every reading is a pull between planned and improvised, victory and wandering, shared and solitary. The names at the rim are directions. Your chart is where those directions agree to sit.</p>
      <div id="atlas-plane"></div>
      ${atlas.pairs.map((pair) => {
        const pos = atlas.archetypes.find((a) => a.id === pair.pos);
        const neg = atlas.archetypes.find((a) => a.id === pair.neg);
        return `
          <section class="pair">
            <p class="kicker">${esc(pair.hint)}</p>
            <h2>${esc(pair.label)}</h2>
            <div class="pair-grid">
              ${[pos, neg].map((arch) => `
                <article class="pair-card">
                  <p class="kicker" style="color:${ink(arch.color)}">${esc(arch.label)}</p>
                  <p>${esc(arch.blurb)}</p>
                  <ul class="play">${arch.play.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
                  <p class="fine">Opposes ${esc(arch.oppositeLabel)}.</p>
                </article>
              `).join('')}
            </div>
          </section>
        `;
      }).join('')}
    </section>
  `;
  mountPlane(document.querySelector('#atlas-plane'), atlas.demos[0], { animate: true });
}

async function renderMethod(app, signal) {
  document.title = 'Method — Rift Index';
  const atlas = await getAtlas(signal);
  if (signal.aborted) return;
  const start = atlas.demos[0];
  app.innerHTML = `
    <section class="frame method-grid">
      <div class="method-copy">
        <p class="eyebrow">The instrument</p>
        <h1 class="page-title">How a coordinate is issued.</h1>
        <p>Each situation offers four moves. Every move puts weight on one pole of one axis, and each of the six signals has the same ceiling, so none of them is easier to become.</p>
        <p>Affinity is the weight you earned divided by the weight you could have earned. Opposing poles then collapse into a lean: Architect minus Wildcard, Laureate minus Nomad, Chorus minus Shade. When both poles are loud, the lean shrinks. The bars remember the argument. The jewel does not pick a side that the answers refused to pick.</p>
        <p>The jewel is the center of mass of the leans that survive, placed on the rim and eased inward when a reading splits. A single loud signal reaches the edge. A braid stays nearer the middle. Clarity is the correlation between the odd questions and the even ones: Sharp, Braided, or Mixed.</p>
        <p>Six names around a flat field cannot all be nearest-neighbors of every blend. Read the bright names and the lines. The title is the verdict. The nearest dim word on the rim is just geometry.</p>
        <div id="leans" class="leans"></div>
        <div id="sliders"></div>
      </div>
      <div>
        <div id="method-plane"></div>
        <div id="method-read"></div>
      </div>
    </section>
  `;
  const sliders = document.querySelector('#sliders');
  sliders.innerHTML = atlas.archetypes.map((arch) => `
    <label class="slider">${esc(arch.label)} <output></output>
      <input type="range" min="0" max="100" value="${Math.round((start.affinity[arch.id] || 0) * 100)}" data-id="${esc(arch.id)}" style="accent-color:${ink(arch.color)}">
    </label>
  `).join('');
  let timer = 0;
  const refresh = async () => {
    const affinity = {};
    sliders.querySelectorAll('input').forEach((input) => {
      affinity[input.dataset.id] = Number(input.value) / 100;
      input.parentElement.querySelector('output').textContent = input.value;
    });
    const data = await api('/api/project', { method: 'POST', body: { affinity }, signal });
    if (signal.aborted) return;
    mountPlane(document.querySelector('#method-plane'), data, { animate: false });
    const ne = formatNE(data.point.x, data.point.y);
    document.querySelector('#method-read').innerHTML = `
      <p class="callsign">${esc(data.title)}</p>
      <p class="epithet">${esc(data.epithet)}</p>
      <p class="coords"><span>N ${ne.n}</span><span>E ${ne.e}</span></p>
      ${metersHTML(data.pairs)}
    `;
    document.querySelector('#leans').innerHTML = `<ul>${data.pairs.map((pair) => {
      const mag = Math.abs(pair.lean);
      const text = mag < 0.08
        ? `${pair.label} is balanced.`
        : `${pair.label} leans ${mag.toFixed(2)} toward ${pair.lean > 0 ? pair.pos.label : pair.neg.label}.`;
      return `<li>${esc(text)}</li>`;
    }).join('')}</ul>`;
  };
  sliders.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => refresh().catch((err) => toast(err.message)), 70);
  }, { signal });
  signal.addEventListener('abort', () => clearTimeout(timer));
  await refresh();
}

async function renderAccount(app, signal) {
  document.title = user ? 'Your file — Rift Index' : 'Sign in — Rift Index';
  if (!user) {
    app.innerHTML = `
      <section class="frame account-grid">
        <div>
          <p class="eyebrow">Optional</p>
          <h1 class="page-title">A file, if you want one.</h1>
          <p class="lede">The chart is issued either way. A file keeps the drift: every reading on one playfield, and the last jewel ghosted under the next.</p>
          <p><a class="btn ghost" href="/quiz">Continue without an account</a></p>
        </div>
        <div>
          <form id="login-form" class="stack card">
            <h2>Sign in</h2>
            <label>Email <input name="email" type="email" autocomplete="username" required></label>
            <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
            <p class="alert" id="login-error"></p>
            <button class="btn primary" type="submit">Open the file</button>
          </form>
          <aside class="demo-slip">
            <p>Night desk demo</p>
            <p>ada@riftindex.demo</p>
            <p>night-desk</p>
            <button type="button" class="text-btn" id="fill-demo">Use this login</button>
          </aside>
          <form id="register-form" class="stack card" style="margin-top:16px">
            <h2>Create a file</h2>
            <label>Name <input name="displayName" type="text" maxlength="24" required></label>
            <label>Email <input name="email" type="email" autocomplete="email" required></label>
            <label>Password <input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
            <p class="alert" id="register-error"></p>
            <button class="btn ghost" type="submit">File me</button>
          </form>
        </div>
      </section>
    `;
    document.querySelector('#fill-demo').addEventListener('click', () => {
      const form = document.querySelector('#login-form');
      form.email.value = 'ada@riftindex.demo';
      form.password.value = 'night-desk';
      form.password.focus();
    }, { signal });
    document.querySelector('#login-form').addEventListener('submit', (event) => submitAuth(event, '/api/auth/login', 'login-error'), { signal });
    document.querySelector('#register-form').addEventListener('submit', (event) => submitAuth(event, '/api/auth/register', 'register-error'), { signal });
    return;
  }

  const history = await api('/api/me/history', { signal });
  const atlas = await getAtlas(signal);
  if (signal.aborted) return;
  app.innerHTML = `
    <section class="frame">
      <div class="account-head">
        <div>
          <p class="eyebrow">On file</p>
          <h1 class="page-title">${esc(user.displayName)}</h1>
          <p class="fine">${esc(user.email)} · ${history.readings.length} reading${history.readings.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" class="text-btn" id="logout">Sign out</button>
      </div>
      ${history.readings.length ? '<div id="drift-plane"></div>' : '<p class="lede">No readings filed yet. The playfield is patient.</p>'}
      <ul class="history">
        ${history.readings.map((item) => `
          <li><a href="/r/${esc(item.slug)}">
            <span><strong>${esc(item.title)}</strong><br><small>${esc(item.epithet)}</small></span>
            <span>${esc(formatDate(item.createdAt))}</span>
          </a></li>
        `).join('')}
      </ul>
      <form id="rename-form" class="stack" style="max-width:420px;margin-top:22px">
        <label>Name on the file <input name="displayName" type="text" maxlength="24" value="${esc(user.displayName)}"></label>
        <button class="btn ghost" type="submit">Update name</button>
      </form>
      <p><button type="button" class="text-btn" id="burn">Burn this file</button></p>
    </section>
  `;
  if (history.readings.length) {
    const ordered = [...history.readings].reverse();
    const latest = history.readings[0];
    mountPlane(document.querySelector('#drift-plane'), {
      title: latest.title,
      point: latest.point,
      affinity: Object.fromEntries(Object.entries(latest.scores).map(([key, value]) => [key, value / 100])),
      highlight: [latest.primary?.id, latest.secondary?.id].filter(Boolean),
      leaders: [latest.primary?.id, latest.secondary?.id].filter(Boolean),
      markers: atlas.archetypes,
    }, {
      ghosts: ordered.slice(0, -1).map((item) => ({ x: item.point.x, y: item.point.y, title: item.title })),
      trail: ordered.map((item) => item.point),
    });
  }
  document.querySelector('#logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    user = null;
    paintAccount();
    toast('Signed out.');
    render();
  }, { signal });
  document.querySelector('#rename-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const displayName = new FormData(event.target).get('displayName');
    const data = await api('/api/me', { method: 'PATCH', body: { displayName } });
    user = data.user;
    paintAccount();
    toast('Name updated.');
    render();
  }, { signal });
  const burn = document.querySelector('#burn');
  burn.addEventListener('click', async () => {
    if (burn.dataset.armed !== '1') {
      burn.dataset.armed = '1';
      burn.textContent = 'Burn the file and every chart?';
      return;
    }
    await api('/api/me', { method: 'DELETE' });
    user = null;
    paintAccount();
    toast('File burned.');
    navigate('/');
  }, { signal });
}

async function submitAuth(event, url, errorId) {
  event.preventDefault();
  const form = event.target;
  const error = document.querySelector(`#${errorId}`);
  error.textContent = '';
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    ensureClaim();
    const data = await api(url, { method: 'POST', body });
    user = data.user;
    await api('/api/claim', { method: 'POST', body: {} }).catch(() => {});
    paintAccount();
    const next = safeNext();
    toast('File open.');
    if (next) navigate(next);
    else render();
  } catch (err) {
    error.textContent = err.message;
  }
}

function renderMissing(app) {
  document.title = 'Not on file — Rift Index';
  app.innerHTML = `<section class="frame narrow"><p class="kicker">404</p><h1>Nothing filed at this address.</h1><p><a class="btn primary" href="/">Return</a></p></section>`;
}

async function render() {
  const signal = nextSignal();
  const seq = ++renderSeq;
  paintAccount();
  const app = document.querySelector('#app');
  const path = location.pathname;
  try {
    if (path === '/') await renderCover(app, signal);
    else if (path === '/quiz') await renderQuiz(app, signal);
    else if (path === '/atlas') await renderAtlas(app, signal);
    else if (path === '/method') await renderMethod(app, signal);
    else if (path === '/account') await renderAccount(app, signal);
    else if (path.startsWith('/r/')) await renderReading(app, signal, decodeURIComponent(path.slice(3)));
    else renderMissing(app);
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return;
    app.innerHTML = `<section class="frame narrow"><h1>The desk stumbled.</h1><p>${esc(err.message)}</p></section>`;
  }
  if (signal.aborted || seq !== renderSeq) return;
  window.scrollTo(0, 0);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  if (link.origin !== location.origin) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate(link.pathname + link.search);
});
window.addEventListener('popstate', () => render());

const me = await api('/api/auth/me').catch(() => ({ user: null }));
user = me.user;
paintAccount();
render();
