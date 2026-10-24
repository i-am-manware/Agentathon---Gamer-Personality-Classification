const SVG = 'http://www.w3.org/2000/svg';
const R = 78;

export function formatNE(x, y) {
  const fmt = (n) => {
    const v = Number(n) || 0;
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
  };
  return { n: fmt(y), e: fmt(x) };
}

function pt(angle, radius) {
  const a = (angle * Math.PI) / 180;
  return [100 + Math.cos(a) * radius, 100 - Math.sin(a) * radius];
}

function xy(x, y) {
  return [100 + x * R, 100 - y * R];
}

function ink(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#f3eee4';
}

export function mountPlane(el, model, options = {}) {
  const token = {};
  el._plane = token;
  const markers = model.markers || [];
  const highlight = new Set(model.highlight || []);
  const leaders = new Set(model.leaders || []);
  const reduce = options.animate === false
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ne = formatNE(model.point?.x, model.point?.y);
  const hex = (radius) => markers.map((m) => pt(m.angle, radius).map((n) => n.toFixed(1)).join(',')).join(' ');

  const diameters = [];
  const seen = new Set();
  for (const marker of markers) {
    const opp = markers.find((m) => m.opposite === marker.id || m.id === marker.opposite);
    if (!opp) continue;
    const key = [marker.id, opp.id].sort().join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    const [x1, y1] = pt(marker.angle, R);
    const [x2, y2] = pt(opp.angle, R);
    diameters.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="axis-line"/>`);
  }

  el.innerHTML = `
    <div class="instrument">
      <svg viewBox="0 0 200 200" role="img" aria-label="${escapeAttr(`${model.title || 'Playfield'}. North ${ne.n}, east ${ne.e}.`)}">
        <defs>
          <filter id="jewel-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <polygon points="${hex(R)}" class="ring"/>
        <polygon points="${hex(R * 0.66)}" class="ring"/>
        <polygon points="${hex(R * 0.33)}" class="ring"/>
        ${diameters.join('')}
        <circle cx="100" cy="100" r="1.4" class="origin"/>
        <g class="dynamic"></g>
      </svg>
    </div>
    <p class="arch-blurb" hidden></p>
  `;

  const svg = el.querySelector('svg');
  const dynamic = el.querySelector('.dynamic');
  const instrument = el.querySelector('.instrument');
  const blurb = el.querySelector('.arch-blurb');

  for (const marker of markers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arch-label';
    const on = highlight.size === 0 || highlight.has(marker.id);
    const dim = highlight.size > 0 && !highlight.has(marker.id);
    btn.classList.toggle('is-on', highlight.has(marker.id));
    btn.classList.toggle('is-dim', dim);
    if (on && highlight.has(marker.id)) btn.style.color = ink(marker.color);
    btn.textContent = marker.label;
    const rad = (marker.angle * Math.PI) / 180;
    btn.style.left = `${50 + Math.cos(rad) * 44}%`;
    btn.style.top = `${50 - Math.sin(rad) * 44}%`;
    const show = () => {
      blurb.hidden = false;
      blurb.innerHTML = `<strong>${escapeHtml(marker.label)}</strong> opposes ${escapeHtml(marker.oppositeLabel || 'its pair')}. ${escapeHtml(marker.blurb || '')}`;
    };
    const hide = () => {
      blurb.hidden = true;
      blurb.textContent = '';
    };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('blur', hide);
    instrument.appendChild(btn);
  }

  function draw(u) {
    const radar = markers.map((m) => {
      const radius = (model.affinity?.[m.id] || 0) * u * R * 0.92;
      return pt(m.angle, radius).map((n) => n.toFixed(1)).join(',');
    }).join(' ');
    const jx = (model.point?.x || 0) * u;
    const jy = (model.point?.y || 0) * u;
    const [cx, cy] = xy(jx, jy);
    const parts = [];
    if (options.trail && options.trail.length > 1) {
      const d = options.trail.map((p, i) => {
        const [x, y] = xy(p.x, p.y);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
      parts.push(`<path d="${d}" class="trail"/>`);
    }
    for (const ghost of options.ghosts || []) {
      const [x, y] = xy(ghost.x, ghost.y);
      const title = escapeHtml(ghost.title || 'Earlier reading');
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.7" class="ghost"><title>${title}</title></circle>`);
    }
    parts.push(`<polygon points="${radar}" class="radar"/>`);
    for (const marker of markers) {
      if (!leaders.has(marker.id)) continue;
      const [x, y] = pt(marker.angle, R * 0.96);
      parts.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${ink(marker.color)}" stroke-width="1.15" stroke-linecap="round"/>`);
    }
    for (const marker of markers) {
      const [x, y] = pt(marker.angle, R);
      const hot = highlight.has(marker.id);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${hot ? 2.5 : 1.7}" fill="${hot ? ink(marker.color) : 'rgba(243,238,228,0.32)'}"/>`);
    }
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.2" fill="rgba(226,255,77,0.22)" filter="url(#jewel-glow)"/>`);
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.3" fill="#e2ff4d"/>`);
    dynamic.innerHTML = parts.join('');
  }

  if (reduce) {
    draw(1);
  } else {
    const start = performance.now();
    const step = (now) => {
      if (el._plane !== token) return;
      const u = Math.min(1, (now - start) / 880);
      draw(1 - (1 - u) ** 3);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { destroy() { el.innerHTML = ''; } };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
