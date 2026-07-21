/* ============================================================
   Feedback tones — tiny WebAudio blips. Created lazily on first
   user gesture (iOS requirement); fully optional via Settings.
   ============================================================ */

const Sfx = (() => {
  let ctx = null;

  function ensure() {
    if (!Store.state.settings.sound) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function blip(freq, time, dur, type, gain) {
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(gain || 0.08, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g).connect(c.destination);
      o.start(time);
      o.stop(time + dur + 0.02);
    } catch (e) { /* sound is never worth crashing over */ }
  }

  return {
    tap()     { const c = ensure(); if (c) blip(880, c.currentTime, 0.05, 'sine', 0.03); },
    correct() { const c = ensure(); if (c) { blip(660, c.currentTime, 0.09, 'sine', 0.07); blip(990, c.currentTime + 0.07, 0.14, 'sine', 0.07); } },
    wrong()   { const c = ensure(); if (c) blip(140, c.currentTime, 0.16, 'square', 0.04); },
    levelUp() { const c = ensure(); if (c) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, c.currentTime + i * 0.09, 0.18, 'triangle', 0.07)); } },
  };
})();
