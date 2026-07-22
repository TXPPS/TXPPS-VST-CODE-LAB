/* ============================================================
   Viz — tiny data-driven SVG diagrams for lessons.
   Sections reference these by spec: { t: 'knobToVar', ... }.
   Drawn in the app palette; decorative (aria-hidden) with the
   teaching content carried by the surrounding text.
   ============================================================ */

const Viz = (() => {
  const C = {
    ink: '#EAE4D4', dim: '#A29D8F', faint: '#857F6E',
    phos: '#5DE894', phosDim: '#2E8757', amber: '#F0B450', red: '#F07862',
    line: '#2A313B', bg: '#0B0E12',
  };
  const MONO = 'ui-monospace,Menlo,Consolas,monospace';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function txt(x, y, s, fill, size, anchor, spacing) {
    return `<text x="${x}" y="${y}" fill="${fill || C.dim}" font-family="${MONO}" font-size="${size || 10}" text-anchor="${anchor || 'start'}" letter-spacing="${spacing || 0.5}">${esc(s)}</text>`;
  }
  function box(x, y, w, h, stroke, dash, fill) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill || 'none'}" stroke="${stroke || C.line}" stroke-width="1.2"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
  }
  function arrow(x1, y1, x2, y2, color) {
    const c = color || C.phosDim;
    const a = Math.atan2(y2 - y1, x2 - x1);
    const hx = x2 - 7 * Math.cos(a), hy = y2 - 7 * Math.sin(a);
    const p1x = hx + 4 * Math.cos(a + Math.PI / 2), p1y = hy + 4 * Math.sin(a + Math.PI / 2);
    const p2x = hx + 4 * Math.cos(a - Math.PI / 2), p2y = hy + 4 * Math.sin(a - Math.PI / 2);
    return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${c}" stroke-width="1.4"/>` +
           `<polygon points="${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}" fill="${c}"/>`;
  }
  function knob(cx, cy, r, angleDeg, color) {
    const a = (angleDeg - 90) * Math.PI / 180;
    const tx = cx + (r - 4) * Math.cos(a), ty = cy + (r - 4) * Math.sin(a);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color || C.dim}" stroke-width="1.6"/>` +
           `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" stroke="${color || C.ink}" stroke-width="1.8" stroke-linecap="round"/>`;
  }

  /* ---- generators: each returns { svg, h } ---- */
  const GEN = {

    // A knob feeding a memory slot: where the value actually lives.
    knobToVar(o) {
      const s = [];
      s.push(knob(52, 44, 21, 40 + 250 * (o.amount !== undefined ? o.amount : 0.6), C.ink));
      s.push(txt(52, 82, o.knob || 'CUTOFF', C.dim, 9.5, 'middle', 1.5));
      s.push(txt(52, 20, 'you turn this…', C.faint, 9, 'middle'));
      s.push(arrow(84, 44, 148, 44));
      s.push(txt(116, 36, 'stored', C.faint, 8.5, 'middle'));
      s.push(box(154, 24, 174, 40, C.phosDim, false, 'rgba(93,232,148,0.05)'));
      s.push(txt(241, 48, o.code || 'float cutoff = 1200.0f;', C.phos, 10.5, 'middle'));
      s.push(txt(241, 82, '…the plugin remembers it here', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 92 };
    },

    // Signal chain of boxes with arrows; accent highlights one stage.
    chain(o) {
      const nodes = o.nodes || [];
      const n = nodes.length;
      const gap = 26, W = 340;
      const bw = Math.min(110, (W - 16 - gap * (n - 1)) / n);
      const total = bw * n + gap * (n - 1);
      let x = (W - total) / 2;
      const s = [];
      nodes.forEach((label, i) => {
        const hot = i === o.accent;
        s.push(box(x, 26, bw, 34, hot ? C.phosDim : C.line, false, hot ? 'rgba(93,232,148,0.05)' : 'none'));
        s.push(txt(x + bw / 2, 47, label, hot ? C.phos : C.dim, 9.5, 'middle'));
        if (i < n - 1) s.push(arrow(x + bw + 3, 43, x + bw + gap - 3, 43));
        x += bw + gap;
      });
      if (o.caption) s.push(txt(170, 82, o.caption, C.faint, 9, 'middle'));
      return { svg: s.join(''), h: o.caption ? 92 : 74 };
    },

    // Mini oscilloscope: sine/saw/square/noise, or 'samples' (dots on a sine).
    wave(o) {
      const s = [box(8, 8, 324, 74, C.line, false, '#07090B')];
      for (let gx = 30; gx < 330; gx += 30) s.push(`<line x1="${gx}" y1="8" x2="${gx}" y2="82" stroke="rgba(93,232,148,0.06)"/>`);
      s.push(`<line x1="8" y1="45" x2="332" y2="45" stroke="rgba(93,232,148,0.12)"/>`);
      const pts = [];
      for (let x = 0; x <= 300; x += 3) {
        const ph = (x / 300) * Math.PI * 4;
        let v = 0;
        if (o.type === 'saw') v = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
        else if (o.type === 'square') v = Math.sin(ph) >= 0 ? 0.9 : -0.9;
        else v = Math.sin(ph);
        pts.push(`${16 + x},${45 - v * 28}`);
      }
      s.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${C.phos}" stroke-width="1.5"/>`);
      if (o.type === 'samples') {
        for (let x = 0; x <= 300; x += 25) {
          const v = Math.sin((x / 300) * Math.PI * 4);
          const y = 45 - v * 28;
          s.push(`<line x1="${16 + x}" y1="45" x2="${16 + x}" y2="${y}" stroke="${C.amber}" stroke-width="1"/>`);
          s.push(`<circle cx="${16 + x}" cy="${y}" r="2.6" fill="${C.amber}"/>`);
        }
        s.push(txt(170, 100, 'each dot = one sample = one float number', C.faint, 9, 'middle'));
        return { svg: s.join(''), h: 108 };
      }
      if (o.caption) { s.push(txt(170, 100, o.caption, C.faint, 9, 'middle')); return { svg: s.join(''), h: 108 }; }
      return { svg: s.join(''), h: 92 };
    },

    // A row of memory cells (buffer / delay line / block), 0-indexed.
    buffer(o) {
      const n = o.n || 8;
      const cw = Math.min(36, 300 / (n + (o.overflow ? 1 : 0)));
      const x0 = (340 - cw * (n + (o.overflow ? 1 : 0))) / 2;
      const s = [];
      if (o.label) s.push(txt(170, 16, o.label, C.dim, 9.5, 'middle', 1.5));
      for (let i = 0; i < n; i++) {
        const x = x0 + i * cw;
        const hot = i === o.highlight;
        s.push(box(x, 24, cw - 3, 30, hot ? C.phosDim : C.line, false, hot ? 'rgba(93,232,148,0.07)' : 'none'));
        if (o.values && o.values[i] !== undefined) s.push(txt(x + (cw - 3) / 2, 43, String(o.values[i]), hot ? C.phos : C.dim, 8.5, 'middle'));
        s.push(txt(x + (cw - 3) / 2, 66, String(i), C.faint, 8.5, 'middle'));
      }
      if (o.overflow) {
        const x = x0 + n * cw;
        s.push(box(x, 24, cw - 3, 30, C.red, true));
        s.push(txt(x + (cw - 3) / 2, 43, '✗', C.red, 11, 'middle'));
        s.push(txt(x + (cw - 3) / 2, 66, String(n), C.red, 8.5, 'middle'));
      }
      if (o.cursor !== undefined) {
        const x = x0 + o.cursor * cw + (cw - 3) / 2;
        s.push(`<polygon points="${x},76 ${x - 4},84 ${x + 4},84" fill="${C.amber}"/>`);
        s.push(txt(x, 96, o.cursorLabel || 'i', C.amber, 9, 'middle'));
      }
      const cap = o.caption ? txt(170, (o.cursor !== undefined ? 112 : 84), o.caption, C.faint, 9, 'middle') : '';
      return { svg: s.join('') + cap, h: o.cursor !== undefined ? (o.caption ? 118 : 102) : (o.caption ? 92 : 76) };
    },

    // Noise gate: signal bursts against a threshold line.
    gate() {
      const s = [box(8, 8, 324, 80, C.line, false, '#07090B')];
      const pts = [];
      for (let x = 0; x <= 316; x += 2) {
        const loud = (x > 60 && x < 130) || (x > 210 && x < 280);
        const amp = loud ? 26 : 5;
        pts.push(`${12 + x},${50 - Math.sin(x * 0.9) * amp}`);
      }
      s.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${C.phos}" stroke-width="1.2"/>`);
      s.push(`<line x1="12" y1="30" x2="328" y2="30" stroke="${C.amber}" stroke-width="1.2" stroke-dasharray="5 4"/>`);
      s.push(txt(322, 24, 'threshold', C.amber, 8.5, 'end'));
      s.push(txt(95, 20, 'OPEN', C.phos, 9, 'middle', 1.5));
      s.push(txt(245, 20, 'OPEN', C.phos, 9, 'middle', 1.5));
      s.push(txt(170, 102, 'if (input > threshold) → the gate opens', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 110 };
    },

    // Waveform selector: one knob, discrete positions = switch cases.
    selector(o) {
      const opts = o.options || ['SINE', 'SAW', 'SQUARE', 'NOISE'];
      const act = o.active !== undefined ? o.active : 1;
      const s = [];
      s.push(knob(70, 52, 26, 15 + act * 60, C.ink));
      s.push(txt(70, 96, o.label || 'WAVE', C.dim, 9.5, 'middle', 1.5));
      opts.forEach((op, i) => {
        const y = 22 + i * 22;
        const hot = i === act;
        s.push(`<circle cx="150" cy="${y - 3}" r="3" fill="${hot ? C.phos : 'none'}" stroke="${hot ? C.phos : C.line}" stroke-width="1.2"/>`);
        s.push(txt(162, y, op, hot ? C.phos : C.dim, 9.5));
        s.push(txt(240, y, `case ${i}:`, hot ? C.phos : C.faint, 9.5));
      });
      s.push(txt(170, 116, 'one selector, fixed positions — that is a switch', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 124 };
    },

    // Patchbay mult: two labels wired to ONE value (references).
    mult(o) {
      const s = [];
      s.push(box(16, 14, 120, 30, C.line));
      s.push(txt(76, 33, o.a || 'buffer[0]', C.dim, 10, 'middle'));
      s.push(box(16, 60, 120, 30, C.phosDim));
      s.push(txt(76, 79, o.b || 'float& current', C.phos, 10, 'middle'));
      s.push(`<path d="M 136 29 C 190 29, 190 52, 232 52" fill="none" stroke="${C.phosDim}" stroke-width="1.4"/>`);
      s.push(`<path d="M 136 75 C 190 75, 190 52, 232 52" fill="none" stroke="${C.phosDim}" stroke-width="1.4"/>`);
      s.push(arrow(232, 52, 240, 52));
      s.push(box(242, 34, 84, 36, C.phosDim, false, 'rgba(93,232,148,0.05)'));
      s.push(txt(284, 56, o.value || '0.80f', C.phos, 11, 'middle'));
      s.push(txt(170, 110, o.caption || 'two names on the patchbay — one actual signal', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 118 };
    },

    // A written-down patch location pointing at a rack slot (pointer / nullptr).
    rackPointer(o) {
      const s = [];
      s.push(box(14, 20, 128, 52, C.amber, false, 'rgba(240,180,80,0.05)'));
      s.push(txt(78, 40, o.code || 'float* osc', C.amber, 10.5, 'middle'));
      s.push(txt(78, 58, o.note || '"rack 2, slot 5"', C.dim, 9, 'middle'));
      s.push(txt(78, 88, 'the pointer: just directions', C.faint, 8.5, 'middle'));
      s.push(arrow(146, 46, 196, 46, C.amber));
      for (let i = 0; i < 3; i++) {
        const x = 200 + i * 44;
        const target = i === 1;
        if (target && o.empty) {
          s.push(box(x, 26, 40, 40, C.red, true));
          s.push(txt(x + 20, 50, '—', C.red, 12, 'middle'));
        } else {
          s.push(box(x, 26, 40, 40, target ? C.phosDim : C.line, false, target ? 'rgba(93,232,148,0.07)' : 'none'));
          s.push(txt(x + 20, 50, target ? (o.slot || 'OSC') : '·', target ? C.phos : C.faint, 9.5, 'middle'));
        }
      }
      s.push(txt(266, 88, o.empty ? 'nullptr — nothing patched' : 'the actual gear lives here', o.empty ? C.red : C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 98 };
    },

    // One schematic, two independent hardware units (class → objects).
    blueprint(o) {
      const s = [];
      s.push(box(108, 10, 124, 30, C.dim, true));
      s.push(txt(170, 29, o.cls || 'class Filter', C.ink, 10.5, 'middle'));
      s.push(txt(170, 50, 'the schematic', C.faint, 8.5, 'middle'));
      s.push(arrow(140, 44, 84, 66));
      s.push(arrow(200, 44, 256, 66));
      [[24, o.aName || 'Filter a', o.a || 'cutoff: 200', 0.25], [216, o.bName || 'Filter b', o.b || 'cutoff: 2000', 0.85]].forEach(([x, name, val, amt]) => {
        s.push(box(x, 70, 100, 46, C.phosDim, false, 'rgba(93,232,148,0.04)'));
        s.push(knob(x + 22, 93, 12, 40 + 250 * amt, C.ink));
        s.push(txt(x + 64, 88, name, C.phos, 9.5, 'middle'));
        s.push(txt(x + 64, 104, val, C.dim, 8.5, 'middle'));
      });
      s.push(txt(170, 132, 'one design — every unit keeps its own knob positions', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 140 };
    },

    // Plugin project file map: recipe + four sources.
    filemap() {
      const s = [];
      s.push(box(110, 8, 120, 26, C.amber, false, 'rgba(240,180,80,0.05)'));
      s.push(txt(170, 25, 'CMakeLists.txt', C.amber, 9.5, 'middle'));
      s.push(txt(170, 44, 'the recipe — builds everything below', C.faint, 8, 'middle'));
      const files = [['PluginProcessor.h', 'engine panel'], ['PluginProcessor.cpp', 'engine circuit'], ['PluginEditor.h', 'UI panel'], ['PluginEditor.cpp', 'UI circuit']];
      files.forEach(([f, r], i) => {
        const x = 8 + i * 82;
        s.push(box(x, 56, 76, 30, i < 2 ? C.phosDim : C.line, false, i < 2 ? 'rgba(93,232,148,0.04)' : 'none'));
        s.push(txt(x + 38, 69, f, i < 2 ? C.phos : C.dim, 7.5, 'middle'));
        s.push(txt(x + 38, 80, r, C.faint, 7, 'middle'));
        s.push(arrow(170, 36, x + 38, 54));
      });
      s.push(txt(170, 104, 'editor includes processor — never the reverse', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 110 };
    },

    // Plugin lifecycle timeline with process loop.
    lifecycle() {
      const s = [];
      const stages = [['scan', C.faint], ['construct', C.dim], ['prepare', C.phos], ['process ⟳', C.phos], ['release', C.amber], ['destroy', C.red]];
      const w = 50, gap = 4;
      let x = 8;
      stages.forEach(([label, col], i) => {
        s.push(box(x, 26, w, 28, col === C.faint ? C.line : col, false, col === C.phos ? 'rgba(93,232,148,0.05)' : 'none'));
        s.push(txt(x + w / 2, 43, label, col, 7.5, 'middle'));
        if (i < stages.length - 1) s.push(arrow(x + w + 1, 40, x + w + gap + 1, 40));
        x += w + gap + 2;
      });
      s.push(`<path d="M 190 26 C 190 12, 160 12, 160 26" fill="none" stroke="${C.phosDim}" stroke-width="1.2"/>`);
      s.push(txt(175, 10, 'repeats', C.faint, 7.5, 'middle'));
      s.push(txt(170, 72, 'prepare ⇄ release can cycle many times per instance', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 80 };
    },

    // The audio block as a channels × samples grid.
    audioGrid() {
      const s = [];
      s.push(txt(170, 14, 'ONE BLOCK — channels × samples', C.dim, 9, 'middle', 1.5));
      ['L', 'R'].forEach((ch, r) => {
        const y = 24 + r * 30;
        s.push(txt(20, y + 17, ch, C.phos, 10, 'middle'));
        for (let i = 0; i < 10; i++) {
          const x = 34 + i * 29;
          s.push(box(x, y, 26, 24, r === 0 && i === 2 ? C.phosDim : C.line, false, r === 0 && i === 2 ? 'rgba(93,232,148,0.08)' : 'none'));
        }
      });
      s.push(txt(47 + 2 * 29, 100, '↑ buffer.getWritePointer(0)[2]', C.faint, 8, 'start'));
      s.push(txt(170, 116, 'rows: getNumChannels() — columns: getNumSamples()', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 122 };
    },

    // Parameter flow: slider → attachment → APVTS → atomic → smoother → audio.
    paramflow() {
      const s = [];
      const steps = [['slider', 'UI thread'], ['attachment', 'binds both ways'], ['APVTS', 'brain + host'], ['atomic', 'the bridge'], ['smoother', 'the glide'], ['audio', 'the sound']];
      steps.forEach(([label, sub], i) => {
        const y = 8 + i * 26;
        const hot = i >= 3;
        s.push(box(96, y, 148, 20, hot ? C.phosDim : C.line, false, hot ? 'rgba(93,232,148,0.05)' : 'none'));
        s.push(txt(170, y + 13, label, hot ? C.phos : C.dim, 9, 'middle'));
        s.push(txt(252, y + 13, sub, C.faint, 7.5, 'start'));
        if (i < steps.length - 1) s.push(arrow(170, y + 21, 170, y + 26, C.phosDim));
      });
      s.push(txt(90, 47, 'automation →', C.amber, 7.5, 'end'));
      return { svg: s.join(''), h: 168 };
    },

    // Object lifetime timeline: born -> alive -> destroyed (scope braces).
    lifetime() {
      const s = [];
      s.push(txt(20, 20, '{', C.dim, 22));
      s.push(txt(316, 20, '}', C.dim, 22));
      s.push(`<line x1="60" y1="40" x2="280" y2="40" stroke="${C.phos}" stroke-width="2"/>`);
      s.push(`<circle cx="60" cy="40" r="5" fill="${C.phos}"/>`);
      s.push(`<circle cx="280" cy="40" r="5" fill="none" stroke="${C.red}" stroke-width="2"/>`);
      s.push(txt(60, 62, 'constructor', C.phos, 8.5, 'middle'));
      s.push(txt(60, 74, 'born', C.faint, 8, 'middle'));
      s.push(txt(170, 32, 'alive — the object\'s lifetime', C.dim, 9, 'middle'));
      s.push(txt(280, 62, 'destructor', C.red, 8.5, 'middle'));
      s.push(txt(280, 74, 'dies at the brace', C.faint, 8, 'middle'));
      return { svg: s.join(''), h: 84 };
    },

    // Ownership: unique (one owner) or shared (counted owners) of a resource.
    owners(o) {
      const s = [];
      const shared = o && o.mode === 'shared';
      if (shared) {
        [[30, 'sampler A'], [30, ''], [30, '']].forEach(() => {});
        const ys = [16, 52, 88];
        ys.forEach((y, i) => {
          s.push(box(16, y, 96, 28, C.phosDim));
          s.push(txt(64, y + 18, 'owner ' + (i + 1), C.phos, 9, 'middle'));
          s.push(arrow(112, y + 14, 196, 62));
        });
        s.push(box(200, 44, 122, 40, C.line, false, 'rgba(93,232,148,0.04)'));
        s.push(txt(261, 62, 'SampleBank', C.ink, 10, 'middle'));
        s.push(txt(261, 76, 'freed at count 0', C.faint, 8, 'middle'));
        s.push(`<circle cx="322" cy="44" r="11" fill="#10130f" stroke="${C.amber}" stroke-width="1.4"/>`);
        s.push(txt(322, 48, '3', C.amber, 10, 'middle'));
        s.push(txt(170, 132, 'shared_ptr: counted owners — the last one out frees it', C.faint, 9, 'middle'));
        return { svg: s.join(''), h: 138 };
      }
      s.push(box(24, 30, 120, 36, C.phosDim, false, 'rgba(93,232,148,0.05)'));
      s.push(txt(84, 48, 'unique_ptr', C.phos, 10, 'middle'));
      s.push(txt(84, 60, 'the ONE owner', C.faint, 8, 'middle'));
      s.push(arrow(146, 48, 208, 48));
      s.push(txt(177, 40, 'owns', C.faint, 8.5, 'middle'));
      s.push(box(212, 30, 104, 36, C.line));
      s.push(txt(264, 52, 'SineOsc', C.ink, 10, 'middle'));
      s.push(txt(170, 90, 'owner dies → deleted automatically. no copies allowed.', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 98 };
    },

    // Copy vs move, side by side.
    moveviz() {
      const s = [];
      s.push(txt(88, 14, 'COPY', C.dim, 9.5, 'middle', 2));
      s.push(box(24, 22, 56, 30, C.line));
      s.push(txt(52, 41, '48000', C.dim, 8.5, 'middle'));
      s.push(arrow(84, 37, 116, 37));
      s.push(box(120, 22, 56, 30, C.line));
      s.push(txt(148, 41, '48000', C.dim, 8.5, 'middle'));
      s.push(txt(100, 66, 'every sample duplicated — slow', C.faint, 8, 'middle'));
      s.push(`<line x1="185" y1="10" x2="185" y2="76" stroke="${C.line}"/>`);
      s.push(txt(262, 14, 'MOVE', C.phos, 9.5, 'middle', 2));
      s.push(box(198, 22, 56, 30, C.line, true));
      s.push(txt(226, 41, 'empty', C.faint, 8.5, 'middle'));
      s.push(arrow(258, 37, 282, 37, C.phos));
      s.push(box(286, 22, 50, 30, C.phosDim, false, 'rgba(93,232,148,0.06)'));
      s.push(txt(311, 41, '48000', C.phos, 8.5, 'middle'));
      s.push(txt(262, 66, 'handles swapped — instant', C.faint, 8, 'middle'));
      return { svg: s.join(''), h: 80 };
    },

    // Two thread lanes sharing a value; optional blocked (mutex) or atomic bridge.
    lanes(o) {
      const s = [];
      s.push(box(12, 12, 316, 30, C.line));
      s.push(txt(20, 31, 'UI THREAD', C.dim, 8.5, 'start', 1.5));
      s.push(box(12, 84, 316, 30, C.line));
      s.push(txt(20, 103, 'AUDIO THREAD', C.dim, 8.5, 'start', 1.5));
      if (o && o.atomic) {
        s.push(box(140, 50, 100, 26, C.phosDim, false, 'rgba(93,232,148,0.07)'));
        s.push(txt(190, 67, 'atomic<float>', C.phos, 8.5, 'middle'));
        s.push(arrow(170, 42, 178, 50, C.phos));
        s.push(txt(148, 47, 'store', C.faint, 7.5, 'end'));
        s.push(arrow(202, 76, 210, 84, C.phos));
        s.push(txt(232, 82, 'load', C.faint, 7.5, 'start'));
        s.push(txt(170, 132, 'indivisible handoff — nobody waits, nothing tears', C.faint, 9, 'middle'));
      } else if (o && o.blocked) {
        s.push(box(140, 50, 100, 26, C.amber, false, 'rgba(240,180,80,0.06)'));
        s.push(txt(190, 67, 'MUTEX  🔒', C.amber, 8.5, 'middle'));
        s.push(txt(100, 67, 'UI holds it…', C.faint, 8, 'end'));
        s.push(txt(258, 60, 'audio WAITS', C.red, 8.5, 'start'));
        s.push(txt(258, 71, 'deadline dies', C.red, 7.5, 'start'));
        s.push(txt(170, 132, 'a contested lock turns the deadline into a coin flip', C.faint, 9, 'middle'));
      } else {
        s.push(box(150, 50, 80, 26, C.red, true));
        s.push(txt(190, 67, 'float gain', C.red, 8.5, 'middle'));
        s.push(arrow(175, 42, 182, 50, C.red));
        s.push(arrow(198, 76, 205, 84, C.red));
        s.push(txt(170, 132, 'both touch one plain value — a race condition', C.faint, 9, 'middle'));
      }
      return { svg: s.join(''), h: 138 };
    },

    // Producer/consumer FIFO ring between threads.
    fifo() {
      const s = [];
      s.push(box(12, 36, 80, 32, C.line));
      s.push(txt(52, 50, 'PRODUCER', C.dim, 8, 'middle', 1));
      s.push(txt(52, 61, 'UI thread', C.faint, 7.5, 'middle'));
      s.push(arrow(94, 52, 118, 52));
      for (let i = 0; i < 5; i++) {
        const filled = i < 3;
        s.push(box(122 + i * 22, 40, 19, 24, filled ? C.phosDim : C.line, false, filled ? 'rgba(93,232,148,0.07)' : 'none'));
        if (filled) s.push(txt(131 + i * 22, 56, '♪', C.phos, 9, 'middle'));
      }
      s.push(arrow(234, 52, 258, 52));
      s.push(box(262, 36, 66, 32, C.line));
      s.push(txt(295, 50, 'CONSUMER', C.dim, 8, 'middle', 1));
      s.push(txt(295, 61, 'audio', C.faint, 7.5, 'middle'));
      s.push(txt(170, 20, 'PRE-ALLOCATED RING (FIFO)', C.dim, 8.5, 'middle', 1.5));
      s.push(txt(170, 88, 'one pushes, one pops — atomic positions, zero locks', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 96 };
    },

    // ADSR envelope shape with labeled stages.
    adsr() {
      const s = [box(8, 8, 324, 84, C.line, false, '#07090B')];
      const y0 = 78, yPeak = 18, ySus = 44;
      const xA = 70, xD = 130, xS = 230, xR = 310;
      s.push(`<path d="M 16 ${y0} L ${xA} ${yPeak} L ${xD} ${ySus} L ${xS} ${ySus} L ${xR} ${y0}" fill="none" stroke="${C.phos}" stroke-width="1.8"/>`);
      s.push(`<line x1="16" y1="${y0}" x2="316" y2="${y0}" stroke="rgba(93,232,148,0.15)"/>`);
      [[43, 'A'], [100, 'D'], [180, 'S'], [270, 'R']].forEach(([x, l]) => s.push(txt(x, 100, l, C.amber, 10, 'middle', 2)));
      s.push(txt(180, 38, 'sustain = a LEVEL', C.faint, 8.5, 'middle'));
      s.push(txt(170, 116, 'attack · decay · sustain · release — the note\'s life cycle', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 122 };
    },

    // Low-pass filter response curve with cutoff + resonance bump.
    filtercurve() {
      const s = [box(8, 8, 324, 80, C.line, false, '#07090B')];
      s.push(`<path d="M 16 40 L 190 40 C 215 40, 210 24, 225 24 C 240 24, 238 84, 260 84 L 262 84" fill="none" stroke="${C.phos}" stroke-width="1.8"/>`);
      s.push(`<line x1="225" y1="12" x2="225" y2="84" stroke="${C.amber}" stroke-width="1" stroke-dasharray="4 3"/>`);
      s.push(txt(225, 104, 'cutoff', C.amber, 9, 'middle'));
      s.push(txt(120, 30, 'passes', C.faint, 8.5, 'middle'));
      s.push(txt(292, 40, 'cut', C.faint, 8.5, 'middle'));
      s.push(txt(250, 20, 'resonance', C.dim, 8, 'start'));
      s.push(txt(170, 118, 'low-pass: lows through, highs reduced past the cutoff', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 124 };
    },

    // Voice slots with held notes; steal mode shows the oldest being reassigned.
    voices(o) {
      const s = [];
      s.push(txt(170, 14, o && o.steal ? '9th NOTE ARRIVES — ALL 8 BUSY' : 'VOICE POOL', C.dim, 9, 'middle', 1.5));
      for (let i = 0; i < 8; i++) {
        const x = 26 + i * 37;
        const busy = i < (o && o.steal ? 8 : 5);
        const stolen = o && o.steal && i === 0;
        s.push(box(x, 24, 32, 34, stolen ? C.red : (busy ? C.phosDim : C.line), stolen, busy && !stolen ? 'rgba(93,232,148,0.06)' : 'none'));
        s.push(txt(x + 16, 45, stolen ? '↻' : (busy ? '♪' : '·'), stolen ? C.red : (busy ? C.phos : C.faint), 11, 'middle'));
        s.push(txt(x + 16, 70, 'v' + (i + 1), C.faint, 8, 'middle'));
      }
      s.push(txt(170, 90, o && o.steal ? 'oldest voice fades fast, then plays the new note' : 'each ♪ is one object of your Voice class', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 96 };
    },

    // A key press becoming a MIDI message.
    midimsg() {
      const s = [];
      for (let i = 0; i < 5; i++) {
        const x = 16 + i * 20;
        const pressed = i === 2;
        s.push(box(x, 16, 17, 44, pressed ? C.phosDim : C.line, false, pressed ? 'rgba(93,232,148,0.1)' : 'none'));
      }
      s.push(txt(66, 74, 'you press C4', C.faint, 8.5, 'middle'));
      s.push(arrow(122, 38, 158, 38));
      s.push(box(164, 14, 162, 48, C.amber, false, 'rgba(240,180,80,0.05)'));
      s.push(txt(245, 30, 'NOTE ON', C.amber, 9.5, 'middle', 1.5));
      s.push(txt(245, 46, 'note: 60   velocity: 100', C.dim, 9.5, 'middle'));
      s.push(txt(245, 74, 'a message — not a sound', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 84 };
    },

    // Two layers: front panel (public / header) over circuitry (private / cpp).
    twoLayer(o) {
      const s = [];
      s.push(box(20, 12, 300, 40, C.phosDim, false, 'rgba(93,232,148,0.04)'));
      [56, 84, 112].forEach((x) => s.push(`<circle cx="${x}" cy="32" r="6" fill="none" stroke="${C.phos}" stroke-width="1.4"/>`));
      s.push(txt(305, 30, o.top || 'front panel — what everyone sees', C.phos, 9.5, 'end'));
      s.push(txt(305, 44, o.topSub || '', C.dim, 8.5, 'end'));
      s.push(box(20, 60, 300, 40, C.line));
      s.push(`<path d="M 40 80 h 24 v -8 h 20 v 16 h 22 v -8 h 18" fill="none" stroke="${C.faint}" stroke-width="1.2"/>`);
      s.push(txt(305, 78, o.bottom || 'circuitry inside — hidden', C.dim, 9.5, 'end'));
      s.push(txt(305, 92, o.bottomSub || '', C.faint, 8.5, 'end'));
      if (o.caption) s.push(txt(170, 118, o.caption, C.faint, 9, 'middle'));
      return { svg: s.join(''), h: o.caption ? 124 : 108 };
    },

    // Two stacked waves comparing frequency ('freq') or amplitude ('amp').
    compare2(o) {
      const amp = o.mode === 'amp';
      const s = [];
      const lane = (y, cycles, height, label, col) => {
        s.push(box(8, y, 324, 44, C.line, false, '#07090B'));
        s.push(`<line x1="8" y1="${y + 22}" x2="332" y2="${y + 22}" stroke="rgba(93,232,148,0.12)"/>`);
        const pts = [];
        for (let x = 0; x <= 300; x += 3) pts.push(`${16 + x},${y + 22 - Math.sin((x / 300) * Math.PI * 2 * cycles) * height}`);
        s.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.5"/>`);
        s.push(txt(326, y + 12, label, col, 8.5, 'end'));
      };
      if (amp) {
        lane(8, 3, 17, 'loud — tall wave', C.phos);
        lane(58, 3, 5, 'quiet — same pitch', C.amber);
        s.push(txt(170, 118, 'same frequency, different amplitude: height is loudness', C.faint, 9, 'middle'));
      } else {
        lane(8, 2, 15, 'low note — slow wobble', C.phos);
        lane(58, 6, 15, 'high note — fast wobble', C.amber);
        s.push(txt(170, 118, 'same amplitude, different frequency: speed is pitch', C.faint, 9, 'middle'));
      }
      return { svg: s.join(''), h: 124 };
    },

    // A sine pushed past full scale: peaks sliced flat at the ±1.0 lines.
    clipwave() {
      const s = [box(8, 8, 324, 84, C.line, false, '#07090B')];
      const mid = 50, ceil = 26, floor = 74;
      s.push(`<line x1="8" y1="${mid}" x2="332" y2="${mid}" stroke="rgba(93,232,148,0.12)"/>`);
      const pts = [];
      for (let x = 0; x <= 300; x += 2) {
        let v = Math.sin((x / 300) * Math.PI * 4) * 1.6;
        if (v > 1) v = 1; if (v < -1) v = -1;
        pts.push(`${16 + x},${mid - v * (mid - ceil)}`);
      }
      s.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${C.phos}" stroke-width="1.6"/>`);
      s.push(`<line x1="8" y1="${ceil}" x2="332" y2="${ceil}" stroke="${C.red}" stroke-width="1" stroke-dasharray="5 4"/>`);
      s.push(`<line x1="8" y1="${floor}" x2="332" y2="${floor}" stroke="${C.red}" stroke-width="1" stroke-dasharray="5 4"/>`);
      s.push(txt(326, 20, '+1.0', C.red, 8.5, 'end'));
      s.push(txt(326, 88, '−1.0', C.red, 8.5, 'end'));
      s.push(txt(170, 108, 'past full scale the peaks slice flat — flat tops = harsh new harmonics', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 116 };
    },

    // Mixing: sine + saw = their per-sample sum.
    mixsum() {
      const s = [];
      const sine = (x) => Math.sin((x / 300) * Math.PI * 4);
      const saw = (x) => 2 * (((x / 300) * 2.5) % 1) - 1;
      const lane = (y, fn, height, label, col) => {
        s.push(box(8, y, 324, 36, C.line, false, '#07090B'));
        s.push(`<line x1="8" y1="${y + 18}" x2="332" y2="${y + 18}" stroke="rgba(93,232,148,0.1)"/>`);
        const pts = [];
        for (let x = 0; x <= 296; x += 2) pts.push(`${16 + x},${y + 18 - fn(x) * height}`);
        s.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.3"/>`);
        s.push(txt(326, y + 11, label, col, 8, 'end'));
      };
      lane(6, sine, 12, 'sine', C.phos);
      lane(46, saw, 12, 'saw', C.amber);
      s.push(txt(170, 94, '+', C.dim, 13, 'middle'));
      lane(100, (x) => (sine(x) + saw(x)) * 0.5, 14, 'sum × 0.5', C.ink);
      s.push(txt(170, 152, 'the bus adds them sample by sample — one wave, two sounds inside', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 158 };
    },

    // Stereo: one source, two gains, two lanes.
    stereopan() {
      const s = [];
      s.push(box(14, 34, 84, 32, C.phosDim, false, 'rgba(93,232,148,0.05)'));
      s.push(txt(56, 48, 'voice s', C.phos, 9.5, 'middle'));
      s.push(txt(56, 60, 'one mono source', C.faint, 7.5, 'middle'));
      s.push(arrow(98, 42, 168, 24, C.phosDim));
      s.push(arrow(98, 58, 168, 76, C.phosDim));
      s.push(txt(130, 26, '× gainL', C.amber, 8.5, 'middle'));
      s.push(txt(130, 76, '× gainR', C.amber, 8.5, 'middle'));
      s.push(box(172, 10, 152, 28, C.line));
      s.push(txt(180, 28, 'ch 0 — LEFT', C.dim, 9, 'start', 1));
      s.push(box(172, 62, 152, 28, C.line));
      s.push(txt(180, 80, 'ch 1 — RIGHT', C.dim, 9, 'start', 1));
      s.push(txt(170, 110, 'two lanes, one clock — the level difference IS the position', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 118 };
    },

    // Parameter step (staircase = clicks) vs per-sample ramp (glide).
    stepramp() {
      const s = [];
      s.push(txt(88, 14, 'JUMPS — clicks', C.red, 9, 'middle', 1.5));
      s.push(box(8, 20, 156, 64, C.line, false, '#07090B'));
      s.push(`<path d="M 16 74 L 56 74 L 56 52 L 96 52 L 96 34 L 156 34" fill="none" stroke="${C.red}" stroke-width="1.6"/>`);
      s.push(`<circle cx="56" cy="63" r="6" fill="none" stroke="${C.red}" stroke-width="1" stroke-dasharray="2 2"/>`);
      s.push(`<circle cx="96" cy="43" r="6" fill="none" stroke="${C.red}" stroke-width="1" stroke-dasharray="2 2"/>`);
      s.push(txt(252, 14, 'RAMP — smooth', C.phos, 9, 'middle', 1.5));
      s.push(box(176, 20, 156, 64, C.line, false, '#07090B'));
      s.push(`<path d="M 184 74 C 230 74, 280 34, 324 34" fill="none" stroke="${C.phos}" stroke-width="1.6"/>`);
      s.push(txt(170, 102, 'same start, same end — the staircase has corners, corners click', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 110 };
    },

    // An LFO breathing the amplitude of a fast wave (tremolo).
    lfomod() {
      const s = [];
      s.push(box(8, 8, 324, 40, C.line, false, '#07090B'));
      const lp = [];
      for (let x = 0; x <= 300; x += 3) lp.push(`${16 + x},${28 - Math.sin((x / 300) * Math.PI * 2) * 14}`);
      s.push(`<polyline points="${lp.join(' ')}" fill="none" stroke="${C.amber}" stroke-width="1.4"/>`);
      s.push(txt(326, 20, 'LFO — slow, unheard', C.amber, 8, 'end'));
      s.push(arrow(170, 50, 170, 60, C.amber));
      s.push(txt(196, 58, 'steers the gain', C.faint, 8, 'start'));
      s.push(box(8, 62, 324, 48, C.line, false, '#07090B'));
      s.push(`<line x1="8" y1="86" x2="332" y2="86" stroke="rgba(93,232,148,0.1)"/>`);
      const ap = [];
      for (let x = 0; x <= 300; x += 2) {
        const env = 0.55 + 0.45 * Math.sin((x / 300) * Math.PI * 2);
        ap.push(`${16 + x},${86 - Math.sin(x * 0.55) * 20 * env}`);
      }
      s.push(`<polyline points="${ap.join(' ')}" fill="none" stroke="${C.phos}" stroke-width="1.2"/>`);
      s.push(txt(326, 74, 'audio — breathing', C.phos, 8, 'end'));
      s.push(txt(170, 126, 'you hear the effect, never the LFO itself — that\'s tremolo', C.faint, 9, 'middle'));
      return { svg: s.join(''), h: 132 };
    },

    // Piano keyboard: pressed keys glow (with velocity bars), optional message.
    keys(o) {
      const s = [];
      const pressed = o.pressed || [];
      const vels = o.vels || [];
      const x0 = 26, kw = 21, nWhite = 14, y = 14, kh = 46;
      for (let i = 0; i < nWhite; i++) {
        const x = x0 + i * kw;
        const hit = pressed.indexOf(i);
        s.push(`<rect x="${x}" y="${y}" width="${kw - 2}" height="${kh}" rx="2" fill="${hit >= 0 ? 'rgba(93,232,148,0.18)' : '#10141A'}" stroke="${hit >= 0 ? C.phos : C.line}" stroke-width="1.2"${hit >= 0 ? ' class="viz-pulse"' : ''}/>`);
        if (hit >= 0 && vels[hit] !== undefined) {
          const vh = Math.round((vels[hit] / 127) * (kh - 8));
          s.push(`<rect x="${x + 4}" y="${y + kh - 4 - vh}" width="${kw - 10}" height="${vh}" rx="1.5" fill="${C.amber}" opacity="0.85"/>`);
          s.push(txt(x + (kw - 2) / 2, y + kh + 12, String(vels[hit]), C.amber, 8, 'middle'));
        }
      }
      // black keys (skip after white indices 2 and 6 in each 7-key octave)
      for (let i = 0; i < nWhite - 1; i++) {
        const pos = i % 7;
        if (pos === 2 || pos === 6) continue;
        s.push(`<rect x="${x0 + i * kw + kw - 8}" y="${y}" width="12" height="${Math.round(kh * 0.58)}" rx="2" fill="#05070A" stroke="${C.line}" stroke-width="1"/>`);
      }
      let hy = y + kh + (vels.length ? 20 : 8);
      if (o.msg) {
        s.push(box(52, hy, 236, 22, C.amber, false, 'rgba(240,180,80,0.05)'));
        s.push(txt(170, hy + 14, o.msg, C.amber, 9, 'middle'));
        hy += 30;
      }
      if (o.caption) { s.push(txt(170, hy + 8, o.caption, C.faint, 9, 'middle')); hy += 16; }
      return { svg: s.join(''), h: hy + 4 };
    },

    // Voice cards: pool with note owners and states (free/busy/rel/alloc/steal).
    voicecards(o) {
      const cards = o.cards || [];
      const s = [];
      if (o.zoom && cards.length === 1) {
        const c = cards[0];
        s.push(box(96, 10, 148, 96, C.phosDim, false, 'rgba(93,232,148,0.04)'));
        s.push(txt(170, 28, 'VOICE 1 · ' + (c.note || '—'), C.phos, 10, 'middle', 1.5));
        ['int note', 'double phase', 'double increment', 'juce::ADSR adsr', 'float velGain · age'].forEach((m, i) => {
          s.push(txt(170, 44 + i * 13, m, i === 0 ? C.amber : C.dim, 8.5, 'middle'));
        });
        if (o.caption) s.push(txt(170, 122, o.caption, C.faint, 9, 'middle'));
        return { svg: s.join(''), h: o.caption ? 128 : 112 };
      }
      const n = cards.length || 4;
      const cw = Math.min(76, (324 - 8 * (n - 1)) / n);
      const total = cw * n + 8 * (n - 1);
      let x = (340 - total) / 2;
      const STATE = {
        free:  { col: C.line,    fill: 'none',                    tag: 'FREE' },
        busy:  { col: C.phosDim, fill: 'rgba(93,232,148,0.06)',   tag: 'BUSY' },
        rel:   { col: C.amber,   fill: 'rgba(240,180,80,0.05)',   tag: 'RELEASING' },
        alloc: { col: C.phos,    fill: 'rgba(93,232,148,0.12)',   tag: '← TAKES IT' },
        steal: { col: C.red,     fill: 'rgba(240,120,98,0.07)',   tag: 'STOLEN' },
      };
      cards.forEach((c, i) => {
        const st = STATE[c.state] || STATE.free;
        const anim = c.state === 'alloc' || c.state === 'steal' ? ' class="viz-pulse"' : '';
        s.push(`<rect x="${x}" y="18" width="${cw}" height="52" rx="5" fill="${st.fill}" stroke="${st.col}" stroke-width="1.3"${anim}/>`);
        s.push(txt(x + cw / 2, 38, c.note || '—', c.state === 'free' ? C.faint : C.ink, 11, 'middle'));
        s.push(txt(x + cw / 2, 56, st.tag, st.col, 7.5, 'middle', 1));
        s.push(txt(x + cw / 2, 84, 'v' + (i + 1), C.faint, 8, 'middle'));
        x += cw + 8;
      });
      if (o.caption) s.push(txt(170, 104, o.caption, C.faint, 9, 'middle'));
      return { svg: s.join(''), h: o.caption ? 112 : 94 };
    },

    // Voice lifecycle: idle → A → D → S → R → idle, with who drives each hop.
    voicelife(o) {
      const s = [];
      const stages = [['idle', C.faint], ['attack', C.phos], ['decay', C.phos], ['sustain', C.phos], ['release', C.amber], ['idle', C.faint]];
      const w = 47, gap = 8;
      let x = 6;
      stages.forEach(([label, col], i) => {
        s.push(box(x, 30, w, 26, col === C.faint ? C.line : col, false, col === C.phos ? 'rgba(93,232,148,0.05)' : 'none'));
        s.push(txt(x + w / 2, 46, label, col, 8, 'middle'));
        if (i < stages.length - 1) s.push(arrow(x + w + 1, 43, x + w + gap - 1, 43));
        x += w + gap;
      });
      s.push(txt(34, 20, 'note-on ↓', C.phos, 8, 'middle'));
      s.push(txt(226, 20, 'note-off ↓', C.amber, 8, 'middle'));
      s.push(txt(292, 70, '↑ envelope finishes', C.faint, 8, 'end'));
      s.push(txt(170, 86, 'the player drives on/off; the envelope drives everything between — and the FREE flip', C.faint, 8.5, 'middle'));
      if (o && o.caption) { s.push(txt(170, 102, o.caption, C.faint, 9, 'middle')); return { svg: s.join(''), h: 108 }; }
      return { svg: s.join(''), h: 94 };
    },

    // Sustain pedal: deferred note-offs queueing while down.
    pedalviz(o) {
      const s = [];
      s.push(`<path d="M 30 76 L 78 76 L 88 56 L 30 56 Z" fill="rgba(93,232,148,0.08)" stroke="${C.phos}" stroke-width="1.4"/>`);
      s.push(txt(56, 92, 'CC 64 · DOWN', C.phos, 8.5, 'middle', 1));
      s.push(box(116, 20, 130, 64, C.line));
      s.push(txt(181, 34, 'DEFERRED GOODBYES', C.dim, 8, 'middle', 1));
      ['C4 off — held', 'E4 off — held', 'G4 off — held'].forEach((t, i) => {
        s.push(box(126, 40 + i * 14, 110, 11, C.amber, true, 'rgba(240,180,80,0.04)'));
        s.push(txt(181, 48.5 + i * 14, t, C.amber, 7.5, 'middle'));
      });
      s.push(arrow(252, 52, 288, 52, C.phosDim));
      s.push(txt(302, 44, 'pedal', C.faint, 8, 'middle'));
      s.push(txt(302, 55, 'up →', C.faint, 8, 'middle'));
      s.push(txt(302, 68, 'ALL fire', C.phos, 8, 'middle'));
      s.push(txt(170, (o && o.caption) ? 112 : 104, (o && o.caption) || 'while down, note-offs queue as marks — pedal-up releases them together', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 118 };
    },

    // Pitch-bend or mod wheel with value scale.
    bendwheel(o) {
      const s = [];
      const mod = o.mode === 'mod';
      s.push(box(40, 12, 56, 92, C.line, false, '#0A0D11'));
      const wy = mod ? 76 : 58;
      s.push(`<rect x="46" y="${wy - 9}" width="44" height="18" rx="4" fill="rgba(93,232,148,0.15)" stroke="${C.phos}" stroke-width="1.4"${mod ? '' : ' class="viz-snap"'}/>`);
      s.push(txt(68, 118, mod ? 'MOD (CC 1)' : 'PITCH BEND', C.dim, 8.5, 'middle', 1));
      if (mod) {
        [[20, '127', 'full depth'], [58, '64', 'half'], [96, '0', 'no vibrato']].forEach(([y, v, l]) => {
          s.push(txt(112, y, v, C.amber, 8.5, 'start'));
          s.push(txt(136, y, l, C.faint, 8.5, 'start'));
        });
        s.push(txt(226, 56, 'no spring — it stays put', C.dim, 9, 'middle'));
        s.push(txt(226, 70, 'value → a mod DEPTH', C.phos, 9, 'middle'));
      } else {
        [[20, '16383', '+2 st'], [58, '8192', 'HOME · ratio 1.0'], [96, '0', '−2 st']].forEach(([y, v, l]) => {
          s.push(txt(112, y, v, C.amber, 8.5, 'start'));
          s.push(txt(152, y, l, C.faint, 8.5, 'start'));
        });
        s.push(txt(232, 56, 'spring-loaded: always', C.dim, 9, 'middle'));
        s.push(txt(232, 70, 'snaps back to 8192', C.phos, 9, 'middle'));
      }
      if (o.caption) { s.push(txt(170, 138, o.caption, C.faint, 9, 'middle')); return { svg: s.join(''), h: 144 }; }
      return { svg: s.join(''), h: 128 };
    },

    // Mod matrix: source → destination × amount rows.
    modmatrix(o) {
      const rows = o.rows || [['LFO 1', 'PITCH', 0.3], ['WHEEL', 'LFO DEPTH', 1.0]];
      const s = [];
      s.push(txt(60, 16, 'SOURCE', C.dim, 8, 'middle', 1.5));
      s.push(txt(196, 16, 'DESTINATION', C.dim, 8, 'middle', 1.5));
      s.push(txt(298, 16, 'AMOUNT', C.dim, 8, 'middle', 1.5));
      rows.forEach(([src, dst, amt], i) => {
        const y = 26 + i * 26;
        s.push(box(14, y, 92, 20, C.phosDim, false, 'rgba(93,232,148,0.04)'));
        s.push(txt(60, y + 13, src, C.phos, 8.5, 'middle'));
        s.push(arrow(108, y + 10, 148, y + 10));
        s.push(box(150, y, 92, 20, C.line));
        s.push(txt(196, y + 13, dst, C.dim, 8.5, 'middle'));
        s.push(box(268, y, 60, 20, C.amber, false, 'rgba(240,180,80,0.04)'));
        s.push(txt(298, y + 13, (amt >= 0 ? '+' : '') + amt, C.amber, 8.5, 'middle'));
      });
      const hy = 26 + rows.length * 26 + 6;
      s.push(txt(170, hy + 6, o.caption || 'each row: one invisible hand — rows aimed at one destination ADD', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: hy + 14 };
    },

    // Keyboard tracking: key position drives a parameter slope.
    keytrack() {
      const s = [];
      const x0 = 26, kw = 21, nWhite = 14, ky = 62, kh = 34;
      for (let i = 0; i < nWhite; i++) {
        const mid = i === 7;
        s.push(`<rect x="${x0 + i * kw}" y="${ky}" width="${kw - 2}" height="${kh}" rx="2" fill="${mid ? 'rgba(240,180,80,0.12)' : '#10141A'}" stroke="${mid ? C.amber : C.line}" stroke-width="1.1"/>`);
      }
      s.push(txt(x0 + 7 * kw + 9, ky + kh + 12, 'middle C — anchor (0)', C.amber, 8, 'middle'));
      s.push(`<line x1="${x0}" y1="52" x2="${x0 + nWhite * kw - 2}" y2="16" stroke="${C.phos}" stroke-width="1.6"/>`);
      s.push(txt(x0 + 4, 40, '−', C.phos, 12, 'middle'));
      s.push(txt(x0 + nWhite * kw - 8, 14, '+', C.phos, 12, 'middle'));
      s.push(txt(170, 30, 'parameter value', C.faint, 8.5, 'middle'));
      s.push(txt(170, 124, 'the key POSITION is the mod source: low keys pull down, high keys push up', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 130 };
    },

    // Unison: one key fans into detuned, panned copies.
    unisonviz() {
      const s = [];
      s.push(box(24, 40, 44, 30, C.phosDim, false, 'rgba(93,232,148,0.07)'));
      s.push(txt(46, 59, 'C4', C.phos, 10.5, 'middle'));
      s.push(txt(46, 84, 'one key', C.faint, 8, 'middle'));
      const copies = [['−12¢', 'L', 18], ['−6¢', 'L½', 36], ['0¢', 'C', 54], ['+6¢', 'R½', 72], ['+12¢', 'R', 90]];
      copies.forEach(([cents, pan, y], i) => {
        const center = i === 2;
        s.push(`<path d="M 68 55 C 110 55, 120 ${y} , 152 ${y}" fill="none" stroke="${center ? C.phos : C.phosDim}" stroke-width="1.2"/>`);
        s.push(box(154, y - 8, 74, 16, center ? C.phos : C.line, false, center ? 'rgba(93,232,148,0.08)' : 'none'));
        s.push(txt(191, y + 3.5, cents + '  ·  ' + pan, center ? C.phos : C.dim, 8, 'middle'));
      });
      s.push(txt(268, 22, 'detuned copies,', C.dim, 8.5, 'start'));
      s.push(txt(268, 34, 'panned wide —', C.dim, 8.5, 'start'));
      s.push(txt(268, 46, 'center stays', C.phos, 8.5, 'start'));
      s.push(txt(268, 58, 'in tune', C.phos, 8.5, 'start'));
      s.push(txt(170, 118, 'the shimmer is their interference — five near-misses, one anchor', C.faint, 8.5, 'middle'));
      return { svg: s.join(''), h: 124 };
    },
  };

  function render(spec) {
    const gen = GEN[spec.t];
    const wrap = document.createElement('div');
    wrap.className = 'viz-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    if (!gen) return wrap;
    try {
      const { svg, h } = gen(spec);
      wrap.innerHTML = `<svg viewBox="0 0 340 ${h}" preserveAspectRatio="xMidYMid meet">${svg}</svg>` +
        (spec.cap ? `<div class="viz-cap">${esc(spec.cap)}</div>` : '');
    } catch (e) { /* a broken diagram must never break a lesson */ }
    return wrap;
  }

  return { render };
})();
