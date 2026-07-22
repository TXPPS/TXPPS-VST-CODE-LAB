/* ============================================================
   Dict — Signal Dictionary logic: index, mastery computation,
   scored search, abbreviation auto-linking, and the entry card
   (rendered in the existing bottom-sheet pattern).
   ============================================================ */

const Dict = (() => {
  const byId = {};
  DICT.forEach((e) => { byId[e.id] = e; });

  const LEVELS_ = [
    { glyph: '○', label: 'never seen' },
    { glyph: '◔', label: 'introduced' },
    { glyph: '◑', label: 'practiced' },
    { glyph: '◕', label: 'learned' },
    { glyph: '●', label: 'mastered' },
  ];

  const ZONE_TITLES = { 1: 'C++ Signal Path', 2: 'Modern C++ for Audio', 3: 'JUCE Plugin Foundation', 4: 'DSP Workshop', 5: 'Synth Engineering', 6: 'Professional Plugin Engineering', 7: 'Final Product Missions' };

  /* ---- mastery: derived from lesson progress + views ---- */
  function z1Nodes(entry) {
    return (entry.appears || []).filter((a) => a.z === 1 && a.node && Engine.NODES[a.node]);
  }

  function masteryLevel(entry) {
    const viewed = (Store.state.dictViewed || []).includes(entry.id);
    const nodes = z1Nodes(entry);
    if (nodes.length === 0) return viewed ? 1 : 0;
    const done = nodes.filter((n) => Store.isDone(n.node));
    const anyUnlocked = nodes.some((n) => Store.isUnlocked('z1', n.node));
    if (done.length === 0) return (viewed || anyUnlocked) ? 1 : 0;
    if (done.length < nodes.length) return 2;
    const weak = Store.weakList().some((w) => nodes.some((n) => n.node === w.nodeId));
    if (weak) return 2;
    const avg = done.reduce((s, n) => s + ((Store.state.nodes[n.node] || {}).stars || 0), 0) / done.length;
    if (avg >= 2.999) return 4;
    if (avg >= 2) return 3;
    return 2;
  }

  function mastery(entry) {
    const lvl = masteryLevel(entry);
    return { level: lvl, ...LEVELS_[lvl] };
  }

  /* ---- search: term > full/aka > keywords > body text ---- */
  function search(query, cat) {
    const q = String(query || '').trim().toLowerCase();
    let list = DICT.filter((e) => cat === 'ALL' || e.c === cat);
    if (!q) return list.slice().sort((a, b) => a.t.localeCompare(b.t));
    const scored = [];
    for (const e of list) {
      const t = e.t.toLowerCase();
      let score = 0;
      if (t === q) score = 120;
      else if (t.startsWith(q)) score = 100;
      else if (t.includes(q)) score = 85;
      if (score < 75) {
        const names = [e.full || '', ...(e.aka || [])].map((x) => x.toLowerCase());
        if (names.some((n) => n && (n.includes(q) || q.includes(n)))) score = Math.max(score, 75);
      }
      if (score < 60) {
        const kws = (e.search || []).map((x) => x.toLowerCase());
        if (kws.some((k) => k.includes(q) || q.includes(k))) score = Math.max(score, 60);
      }
      if (score < 30) {
        const body = (e.plain + ' ' + e.why + ' ' + e.studio).toLowerCase();
        if (body.includes(q)) score = 30;
      }
      if (score > 0) scored.push([score, e]);
    }
    return scored.sort((a, b) => b[0] - a[0] || a[1].t.localeCompare(b[1].t)).map(([, e]) => e);
  }

  /* ---- abbreviation auto-linking in prose (first mention per block) ---- */
  const LINKABLE = [
    ['APVTS', 'apvts'], ['VST3', 'vst3'], ['AUv3', 'auv3'], ['CMake', 'cmake'],
    ['MIDI', 'midi'], ['JUCE', 'juce'], ['ADSR', 'envelope'], ['AAX', 'aax'],
    ['DSP', 'dsp'], ['DAW', 'daw'], ['GUI', 'gui'], ['CPU', 'cpu'],
    ['RAM', 'ram'], ['API', 'api'], ['IDE', 'ide'], ['LFO', 'lfo'], ['VST', 'vst'],
  ];

  function autoLink(html) {
    // Split into tag / text segments; skip linking inside <code> and existing links.
    const parts = String(html).split(/(<[^>]+>)/);
    let inCode = 0;
    const linked = new Set();
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (seg.startsWith('<')) {
        if (/^<code[\s>]/i.test(seg)) inCode++;
        else if (/^<\/code>/i.test(seg)) inCode = Math.max(0, inCode - 1);
        continue;
      }
      if (inCode || !seg) continue;
      let out = seg;
      for (const [abbr, id] of LINKABLE) {
        if (linked.has(abbr) || !byId[id]) continue;
        const re = new RegExp('\\b' + abbr + '\\b');
        if (re.test(out)) {
          out = out.replace(re, '<span class="term-link" role="link" tabindex="0" data-term="' + id + '">' + abbr + '</span>');
          linked.add(abbr);
        }
      }
      parts[i] = out;
    }
    return parts.join('');
  }

  /* ---- the entry card (bottom sheet) ---- */
  let currentSheet = null;

  function open(id) {
    const e = byId[id];
    if (!e) { UI.toast('Term not found in the dictionary'); return; }
    if (currentSheet) { currentSheet.close(); currentSheet = null; }
    Store.markDictViewed(e.id);
    const { el, fmt } = UI;
    const m = mastery(e);

    const bits = [];
    bits.push(el('div', { class: 'row between' },
      el('span', { class: 'eyebrow phos' }, 'SIGNAL DICTIONARY'),
      el('span', { class: 'mono small', style: 'color:var(--amber)', 'aria-label': 'mastery: ' + m.label }, m.glyph + ' ' + m.label.toUpperCase())));
    bits.push(el('div', null,
      el('div', { class: 'h-display' }, e.t),
      e.full ? el('div', { class: 'dict-full' }, e.full) : null,
      el('div', { class: 'mt-s' }, el('span', { class: 'chip' }, e.c))));

    bits.push(el('div', null,
      el('div', { class: 'eyebrow' }, 'PLAIN ENGLISH'),
      el('p', { class: 'prose mt-s', style: 'font-size:14.5px', html: fmt(e.plain) })));

    bits.push(el('div', null,
      el('div', { class: 'eyebrow amber' }, 'WHY IT MATTERS FOR YOUR VST'),
      el('p', { class: 'small mt-s', style: 'color:var(--ink-dim); line-height:1.55; max-width:62ch', html: fmt(e.why) })));

    if (e.studio) bits.push(el('div', { class: 'callout analogy' },
      el('div', { class: 'co-head' }, '🎹 STUDIO TAKE'),
      el('div', { html: fmt(e.studio) })));

    if (e.viz) bits.push(Viz.render(e.viz));

    if (e.uses && e.uses.length) bits.push(el('div', null,
      el('div', { class: 'eyebrow' }, 'REAL PLUGIN USE'),
      el('div', { class: 'chips mt-s' }, e.uses.map((u) => el('span', { class: 'chip' }, u)))));

    if (e.mistake) bits.push(el('div', { class: 'callout mistake' },
      el('div', { class: 'co-head' }, '⚠ COMMON BEGINNER MISTAKE'),
      el('div', { html: fmt(e.mistake) })));

    if (e.remember) bits.push(el('div', { class: 'callout remember' },
      el('div', { class: 'co-head' }, '💡 REMEMBER THIS'),
      el('div', { class: 'co-body', html: fmt(e.remember) })));

    const rel = (e.related || []).filter((r) => byId[r]);
    if (rel.length) bits.push(el('div', null,
      el('div', { class: 'eyebrow' }, 'RELATED TERMS'),
      el('div', { class: 'chips mt-s' }, rel.map((r) =>
        el('button', { class: 'chip', style: 'color:var(--phos); border-color:var(--phos-dim)', onclick: () => { Sfx.tap(); open(r); } }, '→ ' + byId[r].t)))));

    if (e.appears && e.appears.length) {
      bits.push(el('div', null,
        el('div', { class: 'eyebrow' }, 'APPEARS IN THE CURRICULUM'),
        el('div', { class: 'col mt-s', style: 'gap:2px' }, e.appears.map((a) => {
          const node = a.node ? Engine.NODES[a.node] : null;
          const live = a.z === 1 && node;
          const label = node ? node.title : (a.label || '');
          const unlocked = live && Store.isUnlocked('z1', a.node);
          const done = live && Store.isDone(a.node);
          return el('button', { class: 'appears-row', onclick: () => {
            if (!live) { UI.toast('Zone ' + a.z + ' ships in a future update'); return; }
            if (!unlocked) { UI.toast('Locked — progress through the map first'); return; }
            if (currentSheet) { currentSheet.close(); currentSheet = null; }
            App.openNode(a.node);
          } },
            el('span', { class: 'z-badge' + (live ? ' live' : '') }, 'Z' + a.z),
            el('div', { style: 'min-width:0; text-align:left' },
              el('div', { class: 'small' }, label),
              el('div', { class: 'mono', style: 'font-size:9.5px; color:var(--ink-faint); letter-spacing:.08em' }, ZONE_TITLES[a.z] || '')),
            el('span', { class: 'mono small', style: 'margin-left:auto; color:' + (done ? 'var(--phos)' : 'var(--ink-faint)') },
              live ? (done ? '✓' : (unlocked ? '▶' : '🔒')) : 'SOON'));
        }))));
    }

    currentSheet = UI.sheet(bits);
    return currentSheet;
  }

  return { byId, mastery, search, autoLink, open, LEVELS: LEVELS_ };
})();
