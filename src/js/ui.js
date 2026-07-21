/* ============================================================
   UI helpers — element builder, markup formatter, C++ highlighter,
   shared widgets (code panel, stars, toast, sheet, scope canvas).
   ============================================================ */

const UI = (() => {

  /* ---- element builder ---- */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- inline markup: `code` and **bold** ---- */
  function fmt(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }

  /* ---- minimal C++ syntax highlighter (regex, single pass) ---- */
  const CPP_KW = /\b(class|struct|public|private|protected|const|constexpr|return|if|else|switch|case|break|default|for|while|do|void|float|double|int|bool|char|auto|true|false|nullptr|new|delete|this|namespace|using|static|enum|template|typename)\b/g;

  function highlightCpp(code) {
    const src = String(code);
    let out = '';
    let i = 0;
    const n = src.length;
    while (i < n) {
      const rest = src.slice(i);
      let m;
      if ((m = rest.match(/^\/\/[^\n]*/))) {
        out += '<span class="tok-com">' + escapeHtml(m[0]) + '</span>'; i += m[0].length;
      } else if ((m = rest.match(/^"(?:[^"\\\n]|\\.)*"/))) {
        out += '<span class="tok-str">' + escapeHtml(m[0]) + '</span>'; i += m[0].length;
      } else if ((m = rest.match(/^#\s*\w+/))) {
        out += '<span class="tok-pre">' + escapeHtml(m[0]) + '</span>'; i += m[0].length;
      } else if ((m = rest.match(/^\b\d+\.?\d*f?F?\b/))) {
        out += '<span class="tok-num">' + escapeHtml(m[0]) + '</span>'; i += m[0].length;
      } else if ((m = rest.match(/^[A-Za-z_]\w*/))) {
        const word = m[0];
        CPP_KW.lastIndex = 0;
        if (CPP_KW.test(word) && word.match(/^(class|struct|public|private|protected|const|constexpr|return|if|else|switch|case|break|default|for|while|do|void|float|double|int|bool|char|auto|true|false|nullptr|new|delete|this|namespace|using|static|enum|template|typename)$/)) {
          out += '<span class="tok-kw">' + word + '</span>';
        } else {
          out += escapeHtml(word);
        }
        i += word.length;
      } else {
        out += escapeHtml(src[i]); i += 1;
      }
    }
    return out;
  }

  /* ---- code panel widget ---- */
  function codePanel(code, title) {
    return el('div', { class: 'code' },
      el('div', { class: 'code-head' },
        el('span', { class: 'dot' }), el('span', { class: 'dot' }),
        el('span', null, title || 'C++')),
      el('pre', { html: highlightCpp(code) }));
  }

  /* ---- simulated compiler panel ---- */
  function compilerPanel(errorText) {
    return el('div', { class: 'compiler', role: 'group', 'aria-label': 'Simulated compiler feedback' },
      el('div', { class: 'compiler-head' }, '⚠ Simulated Compiler Feedback'),
      el('pre', null, errorText));
  }

  /* ---- stars ---- */
  function stars(count, of) {
    const total = of || 3;
    const s = el('span', { class: 'stars', 'aria-label': count + ' of ' + total + ' stars' });
    for (let i = 0; i < total; i++) {
      s.appendChild(el('span', { class: i < count ? '' : 'off' }, i < count ? '★' : '☆'));
    }
    return s;
  }

  /* ---- toast ---- */
  let toastTimer = null;
  function toast(msg, ms) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = el('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), ms || 2600);
  }

  /* ---- bottom sheet / modal ---- */
  function sheet(children, opts) {
    const veil = el('div', { class: 'sheet-veil' });
    const box = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, children);
    veil.appendChild(box);
    veil.addEventListener('click', (e) => { if (e.target === veil && !(opts && opts.sticky)) close(); });
    const onKey = (e) => { if (e.key === 'Escape' && !(opts && opts.sticky)) close(); };
    document.addEventListener('keydown', onKey);
    function close() { document.removeEventListener('keydown', onKey); veil.remove(); }
    document.body.appendChild(veil);
    return { close, box };
  }

  function confirmSheet(title, body, confirmLabel, onConfirm, danger) {
    const s = sheet([
      el('div', { class: 'eyebrow ' + (danger ? 'red' : 'phos') }, title),
      el('p', { class: 'small dim' }, body),
      el('div', { class: 'row' },
        el('button', { class: 'btn ghost', style: 'flex:1', onclick: () => s.close() }, 'Cancel'),
        el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), style: 'flex:1', onclick: () => { s.close(); onConfirm(); } }, confirmLabel)),
    ]);
    return s;
  }

  /* ---- oscilloscope canvas (dashboard flourish) ---- */
  function scope(level) {
    const wrap = el('div', { class: 'scope-wrap', 'aria-hidden': 'true' });
    const canvas = el('canvas');
    const label = el('div', { class: 'scope-label' }, 'SIGNAL MONITOR — LV ' + level);
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    let raf = 0;
    let t = 0;
    const animate = Store.state.settings.motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth || 320;
      const h = 92;
      if (canvas.width !== Math.floor(w * dpr)) { canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = 'rgba(93,232,148,0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 23) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      // waveform: harmonics grow with level
      const harmonics = Math.min(1 + Math.floor((level - 1) / 2), 6);
      ctx.strokeStyle = '#5DE894';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(93,232,148,0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        const ph = (x / w) * Math.PI * 4 + t;
        let v = 0;
        for (let k = 1; k <= harmonics; k++) v += Math.sin(ph * (2 * k - 1)) / (2 * k - 1);
        const y = h / 2 - v * (h * 0.32);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      t += 0.035;
      if (animate) raf = requestAnimationFrame(draw);
    }
    // draw after mount (needs layout width)
    requestAnimationFrame(draw);
    wrap.cleanup = () => cancelAnimationFrame(raf);
    return wrap;
  }

  /* ---- svg icons (stroke style) ---- */
  const ICONS = {
    home: '<path d="M3 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1z"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    practice: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/>',
    glossary: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 17a2 2 0 0 1 2-2h11"/><path d="M9 8h6"/>',
    profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M2 12h3M19 12h3M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    flame: '<path d="M12 3c1 3-3 5-3 9a4.5 4.5 0 0 0 9 0c0-2-1-3.5-2-5-.4 1.2-1 2-2 2.5C14.5 8 14 5 12 3z"/>',
    zap: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  };

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  /* ---- waveform divider (decorative svg) ---- */
  function waveDivider() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 300 18');
    svg.setAttribute('class', 'divider-wave');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'none');
    let d = 'M0 9';
    for (let x = 0; x <= 300; x += 4) d += ' L' + x + ' ' + (9 - Math.sin(x / 10) * 5).toFixed(1);
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#2A313B" stroke-width="1.2"/>';
    return svg;
  }

  return { el, fmt, escapeHtml, highlightCpp, codePanel, compilerPanel, stars, toast, sheet, confirmSheet, scope, icon, waveDivider };
})();
