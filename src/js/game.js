/* ============================================================
   Game-feel layer (v1.1.0) — PATCH the workshop assistant plus the
   Animation / Audio / Haptic / Reaction / Accessibility directors.

   Everything here is DECORATIVE and subscribes to GameBus events.
   It never drives grading, navigation, or saving, and every entry
   point is wrapped so a failure can't reach course logic. If any of
   PATCH, audio, haptics or motion is unavailable, the course is
   fully usable and every result stays clear in text.

   Original PATCH design: a compact retro workshop robot with a
   CRT/oscilloscope face. Built as one inline-SVG base with reusable
   parts and a state machine — not derived from any existing mascot.
   ============================================================ */

const Game = (() => {
  const { el } = UI;
  const E = GameBus.EVENTS;
  const raf = (fn) => (window.requestAnimationFrame || ((f) => setTimeout(f, 16)))(fn);

  /* =====================================================================
     ACCESSIBILITY / INTENSITY CONTROLLER
     ===================================================================== */
  const DEFAULTS = {
    patch: 'balanced',        // full | balanced | minimal | hidden
    effects: 'balanced',      // full | balanced | minimal
    reducedMotion: 'system',  // system | on | off
    particles: true,
    screenShake: false,
    haptics: true,
    audio: { enabled: true, master: 70, ui: 70, feedback: 80, celebration: 80, patch: 70 },
    seen: {},                 // one-time reaction flags (introSeen, ach:<id>, rank:<n>, ...)
  };
  function gs() {
    const s = (Store.state && Store.state.settings && Store.state.settings.game) || {};
    return Object.assign({}, DEFAULTS, s, { audio: Object.assign({}, DEFAULTS.audio, s.audio || {}), seen: s.seen || {} });
  }
  const Access = {
    systemReduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } },
    reducedMotion() {
      const g = gs();
      if (g.reducedMotion === 'on') return true;
      if (g.reducedMotion === 'off') return false;
      // system: honour prefers-reduced-motion AND the existing Motion toggle
      return Access.systemReduced() || !(Store.state.settings.motion);
    },
    intensity() { return gs().effects; },                 // full | balanced | minimal
    particlesOn() { const g = gs(); return g.particles && !Access.reducedMotion() && g.effects !== 'minimal'; },
    presence() { return gs().patch; },                    // full | balanced | minimal | hidden
    // scale a duration by intensity + reduced motion
    scale(ms) {
      if (Access.reducedMotion()) return Math.min(ms, 120);
      const i = Access.intensity();
      return i === 'minimal' ? Math.round(ms * 0.6) : i === 'full' ? Math.round(ms * 1.1) : ms;
    },
  };

  /* =====================================================================
     ANIMATION DIRECTOR — cancelable, route-scoped, reduced-motion aware.
     Views never scatter their own timeouts for reactions; they go here.
     ===================================================================== */
  const Anim = (() => {
    let timers = new Set();
    let paused = false;
    function after(ms, fn, opts) {
      const id = setTimeout(() => { timers.delete(rec); if (!paused || (opts && opts.always)) { try { fn(); } catch (e) { /* isolate */ } } }, Access.scale(ms));
      const rec = { id, fn };
      timers.add(rec);
      return () => { clearTimeout(id); timers.delete(rec); };
    }
    function pulse(node, cls, ms) {
      if (!node) return () => {};
      if (Access.reducedMotion()) { node.classList.add(cls + '-rm'); const c = after(ms || 200, () => node.classList.remove(cls + '-rm'), { always: true }); return c; }
      node.classList.add(cls);
      const c = after(ms || 500, () => node.classList.remove(cls), { always: true });
      return () => { node.classList.remove(cls); c(); };
    }
    function cancelRoute() { for (const r of Array.from(timers)) { clearTimeout(r.id); timers.delete(r); } }
    function setPaused(v) { paused = v; }
    return { after, pulse, cancelRoute, setPaused, scale: Access.scale };
  })();

  /* =====================================================================
     AUDIO DIRECTOR — one WebAudio context, original synth sound language,
     categories + group volumes + cooldowns + gesture unlock + suspend.
     No files, no network. Silent + harmless when unavailable.
     ===================================================================== */
  const Audio = (() => {
    let ctx = null, master = null, unlocked = false, voices = 0;
    const lastAt = {};
    const MAXVOICES = 8;
    const GROUP = { // category -> volume group
      UI_PRESS: 'ui', NAVIGATION: 'ui',
      CORRECT: 'feedback', CORRECT_AFTER_RETRY: 'feedback', INCORRECT: 'feedback', HINT_AVAILABLE: 'feedback',
      QUIZ_PASS: 'celebration', QUIZ_PERFECT: 'celebration', QUIZ_FAIL: 'feedback',
      LESSON_COMPLETE: 'celebration', CHALLENGE_COMPLETE: 'celebration', MISSION_COMPLETE: 'celebration',
      ACHIEVEMENT_UNLOCK: 'celebration', RANK_UP: 'celebration', ZONE_UNLOCKED: 'celebration',
      PROFILE_CREATED: 'patch', PROFILE_SAVED: 'ui', SAVE_FAILED: 'feedback', BACKUP_COMPLETE: 'ui',
      PATCH_BOOT: 'patch', PATCH_ENTER: 'patch', PATCH_EXIT: 'patch',
      BOSS_INTRO: 'celebration', PLAYER_ATTACK: 'feedback', PLAYER_ATTACK_HEAVY: 'feedback', PLAYER_DAMAGE: 'feedback',
      BOSS_PHASE: 'celebration', BOSS_WARNING: 'feedback', BOSS_DEFEATED: 'celebration', PLAYER_DEFEATED: 'feedback',
    };
    const COOLDOWN = { UI_PRESS: 45, NAVIGATION: 90, INCORRECT: 120, CORRECT: 120, PROFILE_SAVED: 400, PLAYER_ATTACK: 150, PLAYER_DAMAGE: 150 };

    function tryCtx() {
      if (ctx) return ctx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      } catch (e) { ctx = null; }
      return ctx;
    }
    function unlock() {
      const c = tryCtx(); if (!c) return;
      try { if (c.state === 'suspended') c.resume(); unlocked = true; } catch (e) { /* ignore */ }
    }
    function groupVol(cat) {
      const a = gs().audio;
      if (!a.enabled) return 0;
      const g = GROUP[cat] || 'ui';
      return (a.master / 100) * ((a[g] != null ? a[g] : 70) / 100);
    }
    // one enveloped oscillator
    function tone(t, freq, dur, type, peak) {
      if (voices >= MAXVOICES) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      voices += 1; o.onended = () => { voices -= 1; };
      o.start(t); o.stop(t + dur + 0.02);
    }
    function slide(t, f0, f1, dur, type, peak) {
      if (voices >= MAXVOICES) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); voices += 1; o.onended = () => { voices -= 1; };
      o.start(t); o.stop(t + dur + 0.02);
    }
    // original sound recipes — small FM/analog blips, relays, patch clicks, clean signals
    const REC = {
      UI_PRESS: (t, v) => tone(t, 660, 0.04, 'sine', 0.05 * v),
      NAVIGATION: (t, v) => { slide(t, 480, 720, 0.09, 'sine', 0.05 * v); },
      CORRECT: (t, v) => { tone(t, 587.33, 0.08, 'sine', 0.09 * v); tone(t + 0.07, 880, 0.12, 'sine', 0.08 * v); },
      CORRECT_AFTER_RETRY: (t, v) => { tone(t, 523.25, 0.08, 'sine', 0.08 * v); tone(t + 0.07, 698.46, 0.09, 'sine', 0.08 * v); tone(t + 0.15, 880, 0.14, 'sine', 0.08 * v); },
      INCORRECT: (t, v) => { slide(t, 300, 190, 0.16, 'triangle', 0.05 * v); },
      HINT_AVAILABLE: (t, v) => { tone(t, 784, 0.05, 'sine', 0.05 * v); tone(t + 0.06, 784, 0.09, 'sine', 0.05 * v); },
      QUIZ_PASS: (t, v) => { [523.25, 659.25, 783.99].forEach((f, i) => tone(t + i * 0.08, f, 0.14, 'triangle', 0.07 * v)); },
      QUIZ_PERFECT: (t, v) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.075, f, 0.16, 'triangle', 0.08 * v)); tone(t + 0.34, 1318.5, 0.22, 'sine', 0.06 * v); },
      QUIZ_FAIL: (t, v) => { tone(t, 392, 0.12, 'sine', 0.06 * v); tone(t + 0.1, 329.63, 0.16, 'sine', 0.06 * v); },
      LESSON_COMPLETE: (t, v) => { tone(t, 659.25, 0.1, 'triangle', 0.07 * v); tone(t + 0.09, 987.77, 0.16, 'triangle', 0.07 * v); },
      CHALLENGE_COMPLETE: (t, v) => { [587.33, 880, 1174.66].forEach((f, i) => tone(t + i * 0.07, f, 0.14, 'triangle', 0.07 * v)); },
      MISSION_COMPLETE: (t, v) => { [523.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(t + i * 0.08, f, 0.16, 'triangle', 0.08 * v)); },
      ACHIEVEMENT_UNLOCK: (t, v) => { slide(t, 660, 1320, 0.14, 'sine', 0.07 * v); tone(t + 0.16, 1320, 0.18, 'triangle', 0.06 * v); },
      RANK_UP: (t, v) => { [440, 554.37, 659.25, 880].forEach((f, i) => tone(t + i * 0.09, f, 0.2, 'sawtooth', 0.05 * v)); },
      ZONE_UNLOCKED: (t, v) => { slide(t, 400, 900, 0.2, 'sine', 0.05 * v); },
      PROFILE_CREATED: (t, v) => { slide(t, 300, 700, 0.14, 'sine', 0.06 * v); tone(t + 0.16, 900, 0.2, 'triangle', 0.06 * v); },
      PROFILE_SAVED: (t, v) => tone(t, 1200, 0.03, 'sine', 0.03 * v),
      SAVE_FAILED: (t, v) => { tone(t, 220, 0.14, 'square', 0.05 * v); tone(t + 0.16, 180, 0.18, 'square', 0.05 * v); },
      BACKUP_COMPLETE: (t, v) => { tone(t, 784, 0.05, 'sine', 0.05 * v); tone(t + 0.07, 1046.5, 0.1, 'sine', 0.05 * v); },
      PATCH_BOOT: (t, v) => { slide(t, 200, 660, 0.22, 'triangle', 0.05 * v); },
      PATCH_ENTER: (t, v) => tone(t, 880, 0.04, 'sine', 0.03 * v),
      PATCH_EXIT: (t, v) => tone(t, 520, 0.04, 'sine', 0.025 * v),
      // boss encounter — restrained, still the workshop sound language
      BOSS_INTRO: (t, v) => { slide(t, 220, 110, 0.3, 'sawtooth', 0.045 * v); tone(t + 0.32, 98, 0.24, 'triangle', 0.05 * v); },
      PLAYER_ATTACK: (t, v) => { slide(t, 500, 900, 0.07, 'square', 0.045 * v); tone(t + 0.06, 1100, 0.06, 'sine', 0.05 * v); },
      PLAYER_ATTACK_HEAVY: (t, v) => { slide(t, 400, 1000, 0.09, 'square', 0.05 * v); tone(t + 0.08, 1244.5, 0.12, 'triangle', 0.06 * v); },
      PLAYER_DAMAGE: (t, v) => { slide(t, 260, 140, 0.14, 'sawtooth', 0.045 * v); },
      BOSS_PHASE: (t, v) => { tone(t, 174.61, 0.14, 'sawtooth', 0.05 * v); tone(t + 0.13, 233.08, 0.18, 'sawtooth', 0.05 * v); },
      BOSS_WARNING: (t, v) => { tone(t, 196, 0.1, 'square', 0.045 * v); tone(t + 0.14, 196, 0.1, 'square', 0.045 * v); },
      BOSS_DEFEATED: (t, v) => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.08, f, 0.18, 'triangle', 0.07 * v)); },
      PLAYER_DEFEATED: (t, v) => { slide(t, 330, 165, 0.3, 'triangle', 0.05 * v); tone(t + 0.32, 130.81, 0.28, 'sine', 0.05 * v); },
    };
    function play(cat) {
      try {
        if (!unlocked) return;
        if (document.hidden) return;
        const v = groupVol(cat); if (v <= 0) return;
        const rec = REC[cat]; if (!rec) return;
        const nowMs = Date.now();
        const cd = COOLDOWN[cat] || 0;
        if (cd && lastAt[cat] && nowMs - lastAt[cat] < cd) return;   // cooldown + dedup
        lastAt[cat] = nowMs;
        const c = tryCtx(); if (!c) return;
        if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
        rec(c.currentTime + 0.001, v);
      } catch (e) { /* audio never crashes the app */ }
    }
    function setVisibility() { if (!ctx) return; try { if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); } catch (e) {} }
    return { unlock, play, setVisibility, get unlocked() { return unlocked; }, get supported() { return !!(window.AudioContext || window.webkitAudioContext); } };
  })();

  /* =====================================================================
     HAPTIC DIRECTOR — capability-honest, semantic-category based.

     Course/boss logic NEVER touches navigator.vibrate; it emits GameBus
     events, and only this director maps them to physical feedback through
     the active adapter. iOS Safari exposes no vibration API, so on iPhone
     browsers the status reports "unsupported" — we never simulate or
     falsely claim haptics there.

     NATIVE ADAPTER CONTRACT (for a future iOS/Android shell — e.g. a
     Core Haptics bridge). Inject via Game.setHapticAdapter(adapter):
       adapter = {
         supported(): boolean       // real capability on this device
         play(category: string)     // one of Haptic.CATEGORIES below;
                                    // map to impact styles as suits the
                                    // platform, e.g.:
                                    //   UI_LIGHT            -> selection/light impact
                                    //   UI_CONFIRM          -> light impact
                                    //   ANSWER_CORRECT      -> success notification
                                    //   ANSWER_INCORRECT    -> warning notification
                                    //   PLAYER_ATTACK_HEAVY -> heavy impact
                                    //   PLAYER_DAMAGE_HEAVY -> error notification
                                    //   BOSS_DEFEATED       -> custom success pattern
         // optional: name(): string  — shown in diagnostics ("native")
       }
     The director handles enable/disable, cooldowns, and page-visibility
     suppression — adapters only render a category when asked.
     ===================================================================== */
  const Haptic = (() => {
    let adapter = null;
    const lastAt = {};              // per-category cooldown clocks
    let lastAnyAt = 0;              // global cooldown clock (minor events only)

    // ONE centralized pattern table — raw vibration arrays live nowhere else.
    // critical:true events may supersede the global minor-event cooldown.
    // tick:true events (the sub-perceptual UI press tick) never advance the
    // global clock, so the meaningful haptic produced by the same click —
    // e.g. the capture-phase UI_LIGHT immediately before an ANSWER_CORRECT —
    // is never starved by its own accompanying tick.
    const CATEGORIES = {
      UI_LIGHT:            { pat: [8],               cd: 60, tick: true },
      UI_CONFIRM:          { pat: [12],              cd: 80 },
      ANSWER_CORRECT:      { pat: [14],              cd: 120 },
      ANSWER_RECOVERED:    { pat: [10, 30, 16],      cd: 120 },
      ANSWER_INCORRECT:    { pat: [22],              cd: 120 },
      HINT_AVAILABLE:      { pat: [8, 40, 8],        cd: 300 },
      PLAYER_ATTACK_LIGHT: { pat: [12],              cd: 100 },
      PLAYER_ATTACK_HEAVY: { pat: [10, 30, 22],      cd: 150, critical: true },
      PLAYER_DAMAGE_LIGHT: { pat: [18],              cd: 100 },
      PLAYER_DAMAGE_HEAVY: { pat: [26, 40, 18],      cd: 150, critical: true },
      BOSS_PHASE_CHANGE:   { pat: [14, 50, 14, 50, 22], cd: 800, critical: true },
      BOSS_WARNING:        { pat: [24, 60, 24],      cd: 800, critical: true },
      BOSS_DEFEATED:       { pat: [16, 40, 16, 40, 30], cd: 1500, critical: true },
      PLAYER_DEFEATED:     { pat: [30, 60, 30],      cd: 1500, critical: true },
      ACHIEVEMENT:         { pat: [12, 40, 12],      cd: 400, critical: true },
      RANK_UP:             { pat: [20, 60, 20],      cd: 400, critical: true },
      MISSION_COMPLETE:    { pat: [12, 40, 12, 40, 18], cd: 400, critical: true },
      WARNING_SAVE:        { pat: [30, 40, 30],      cd: 800, critical: true },
    };
    // Back-compat aliases: pre-1.2.0 dotted names -> semantic categories.
    const ALIAS = {
      'ui.light': 'UI_LIGHT', 'feedback.correct': 'ANSWER_CORRECT', 'feedback.incorrect': 'ANSWER_INCORRECT',
      'milestone.lesson': 'UI_CONFIRM', 'milestone.perfect': 'MISSION_COMPLETE', 'milestone.rank': 'RANK_UP',
      'warning.save': 'WARNING_SAVE',
    };
    const GLOBAL_CD = 90;           // minor events share this floor; critical events bypass it

    function browserSupported() { try { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; } catch (e) { return false; } }
    function supported() { return !!(adapter ? (adapter.supported && adapter.supported()) : browserSupported()); }
    function enabled() { return gs().haptics !== false; }
    function adapterName() { return adapter ? ((adapter.name && adapter.name()) || 'native') : (browserSupported() ? 'browser vibration' : 'none'); }
    function status() { return !supported() ? 'unsupported' : (enabled() ? 'on' : 'off'); }
    // Rich diagnostics for the settings screen — always honest.
    function diagnostics() {
      return {
        enabled: enabled(), supported: supported(), adapter: adapterName(),
        deliverable: enabled() && supported() && !document.hidden,
        status: status(),
      };
    }
    // Raw delivery — adapter first, else browser vibration. No cooldown logic.
    function deliver(c, cat) {
      if (adapter && adapter.play) { adapter.play(cat); return true; }
      return navigator.vibrate(c.pat) !== false;
    }
    function trigger(name) {
      try {
        const cat = CATEGORIES[name] ? name : ALIAS[name];
        const c = CATEGORIES[cat];
        if (!c) return false;
        if (!enabled() || !supported() || document.hidden) return false;
        const nowMs = Date.now();
        if (lastAt[cat] && nowMs - lastAt[cat] < c.cd) return false;         // per-category cooldown
        if (!c.critical && nowMs - lastAnyAt < GLOBAL_CD) return false;      // global floor for minor events
        lastAt[cat] = nowMs;
        if (!c.tick) lastAnyAt = nowMs;   // UI ticks don't advance the global clock
        return deliver(c, cat);
      } catch (e) { return false; }   // silent, never breaks anything
    }
    // Honest test: a deliberate user action, so it bypasses incidental
    // cooldowns and delivers straight to the device — but never fakes success
    // when the device genuinely can't (unsupported, off, or hidden page).
    function test() {
      try {
        const d = diagnostics();
        if (!d.supported) return { ok: false, message: 'Haptic feedback is unavailable in this browser. Audio and visual feedback remain active.' };
        if (!d.enabled) return { ok: false, message: 'Haptic feedback is switched off.' };
        if (document.hidden) return { ok: false, message: 'The page is in the background — bring it forward and try again.' };
        const fired = deliver(CATEGORIES.UI_CONFIRM, 'UI_CONFIRM');
        return fired ? { ok: true, message: 'Test pulse sent via ' + d.adapter + '.' }
                     : { ok: false, message: 'The browser declined the test pulse.' };
      } catch (e) { return { ok: false, message: 'The browser declined the test pulse.' }; }
    }
    return { trigger, supported, status, diagnostics, test, CATEGORIES, setAdapter(a) { adapter = a; } };
  })();

  /* =====================================================================
     PATCH — original inline-SVG workshop robot + state machine.
     ===================================================================== */
  const Patch = (() => {
    let dock = null, svg = null, bubble = null, mounted = false;
    let state = 'HIDDEN', idleTimer = null, returnTimer = null, ambientTimer = null;

    // state table: face + demeanour + timing
    const FACE = {
      BOOTING: { mouth: 'boot', eyes: 'dot', led: 'phos', cls: 'p-boot' },
      IDLE: { mouth: 'wave', eyes: 'dot', led: 'dim', cls: '' },
      ATTENTIVE: { mouth: 'flat', eyes: 'dot', led: 'phos', cls: 'p-attn' },
      NAVIGATING: { mouth: 'flat', eyes: 'dot', led: 'phos', cls: 'p-nav' },
      LISTENING: { mouth: 'wave', eyes: 'dot', led: 'phos', cls: 'p-attn' },
      THINKING: { mouth: 'dots', eyes: 'up', led: 'amber', cls: 'p-think' },
      APPROVING: { mouth: 'smile', eyes: 'happy', led: 'phos', cls: 'p-approve' },
      ENCOURAGING: { mouth: 'smile', eyes: 'dot', led: 'phos', cls: 'p-approve' },
      CONCERNED: { mouth: 'wavy', eyes: 'flat', led: 'amber', cls: 'p-concern' },
      DIAGNOSING: { mouth: 'spike', eyes: 'up', led: 'amber', cls: 'p-think' },
      TEACHING: { mouth: 'flat', eyes: 'dot', led: 'phos', cls: 'p-attn' },
      SAVING: { mouth: 'flat', eyes: 'dot', led: 'phos', cls: 'p-save' },
      STORING: { mouth: 'flat', eyes: 'dot', led: 'phos', cls: 'p-save' },
      CELEBRATING: { mouth: 'smile', eyes: 'happy', led: 'phos', cls: 'p-celebrate' },
      ACHIEVEMENT: { mouth: 'smile', eyes: 'happy', led: 'amber', cls: 'p-celebrate' },
      RANK_UP: { mouth: 'smile', eyes: 'happy', led: 'amber', cls: 'p-celebrate' },
      MISSION_COMPLETE: { mouth: 'smile', eyes: 'happy', led: 'phos', cls: 'p-celebrate' },
      OFFLINE: { mouth: 'flat', eyes: 'dot', led: 'dim', cls: '' },
      RECOVERING: { mouth: 'wavy', eyes: 'dot', led: 'amber', cls: 'p-save' },
      SLEEPING: { mouth: 'flat', eyes: 'shut', led: 'dim', cls: 'p-sleep' },
      HIDDEN: { mouth: 'wave', eyes: 'dot', led: 'dim', cls: '' },
      // boss encounter states (v1.2.0) — reuse the accepted shared mouth
      // geometry; no new paths, so the v1.1.1 alignment guarantees hold.
      BOSS_INTRO: { mouth: 'flat', eyes: 'dot', led: 'amber', cls: 'p-attn' },
      BOSS_ASSIST: { mouth: 'wave', eyes: 'dot', led: 'phos', cls: 'p-attn' },
      BOSS_CONCERNED: { mouth: 'wavy', eyes: 'flat', led: 'amber', cls: 'p-concern' },
      BOSS_VICTORY: { mouth: 'smile', eyes: 'happy', led: 'phos', cls: 'p-celebrate' },
    };
    // Every mouth shares ONE stable coordinate system so no state can drift:
    //   horizontal centre x = 24 (directly under the eyes at cx 18 / 30),
    //   baseline y = 26, span x 17..31, and nothing rises above y ≈ 24 — the eyes
    //   occupy y ≈ 18.3..21.7, so the mouth never enters the eye region.
    const MOUTH = {
      wave: 'M17 26 q3.5 -3 7 0 t7 0', flat: 'M17 26 h14', dots: 'M18 26 h2 M23 26 h2 M28 26 h2',
      smile: 'M18 25 q6 4.5 12 0', wavy: 'M17 26 q3.5 1.8 7 0 t7 -1.5', spike: 'M17 26 h4 l2 -2 l2 4 l2 -2 h4',
      boot: 'M17 26 h14',
    };

    function svgBase() {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 48 48');
      s.setAttribute('class', 'patch-svg');
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', 'PATCH, the workshop assistant');
      s.innerHTML = [
        '<line class="patch-ant" x1="24" y1="9" x2="24" y2="5"/>',
        '<circle class="patch-led" cx="24" cy="4" r="1.9"/>',
        '<rect class="patch-body" x="6" y="9.5" width="36" height="30" rx="6"/>',
        '<rect class="patch-screen" x="9.5" y="13" width="29" height="19" rx="3"/>',
        '<g class="patch-face">',
        '<g class="patch-eyes"><circle class="pe pe-l" cx="18" cy="20" r="1.7"/><circle class="pe pe-r" cx="30" cy="20" r="1.7"/></g>',
        '<path class="patch-mouth" d="' + MOUTH.wave + '" fill="none"/>',
        '</g>',
        '<line class="patch-scan" x1="9.5" y1="17" x2="38.5" y2="17"/>',
        '<rect class="patch-foot" x="12" y="39.5" width="6" height="3" rx="1"/>',
        '<rect class="patch-foot" x="30" y="39.5" width="6" height="3" rx="1"/>',
        '<path class="patch-cable" d="M42 33 q6 2 4 8" fill="none"/>',
        '</g>',
      ].join('');
      return s;
    }

    function applyFace(st) {
      if (!svg) return;
      const f = FACE[st] || FACE.IDLE;
      const mouth = svg.querySelector('.patch-mouth');
      const eyes = svg.querySelector('.patch-eyes');
      const led = svg.querySelector('.patch-led');
      if (mouth) mouth.setAttribute('d', MOUTH[f.mouth] || MOUTH.wave);
      if (eyes) eyes.setAttribute('class', 'patch-eyes eyes-' + f.eyes);
      if (led) led.setAttribute('class', 'patch-led led-' + f.led);
      // Under reduced motion, drop the p-* entrance/idle animation class entirely
      // (state still reads via face shape + LED); CSS alone can't see this setting.
      svg.setAttribute('class', 'patch-svg ' + (Access.reducedMotion() ? '' : f.cls));
    }

    function mount() {
      if (mounted) return;
      dock = el('div', { class: 'patch-dock', 'aria-live': 'polite' });
      bubble = el('div', { class: 'patch-bubble', role: 'status' });
      svg = svgBase();
      const avatar = el('div', { class: 'patch-avatar' }, svg);
      dock.appendChild(bubble);
      dock.appendChild(avatar);
      document.body.appendChild(dock);
      mounted = true;
      applyPresence();
    }
    function applyPresence() {
      if (!dock) return;
      const hidden = Access.presence() === 'hidden';
      dock.classList.toggle('hidden', hidden);
      if (hidden) { clearTimeout(ambientTimer); ambientTimer = null; state = 'HIDDEN'; }
    }

    function say(text) {
      if (!bubble || !text || Access.presence() === 'hidden') return;
      bubble.textContent = text;
      bubble.classList.add('show');
      Anim.after(2400, () => bubble && bubble.classList.remove('show'), { always: true });
    }
    function hideBubble() { if (bubble) bubble.classList.remove('show'); }

    // set a transient state, then return to idle; dur scaled by intensity
    function setState(st, opts) {
      if (Access.presence() === 'hidden') return;
      opts = opts || {};
      if (!FACE[st]) st = 'IDLE';
      state = st;
      applyFace(st);
      if (dock) { dock.classList.add('active'); dock.classList.remove('withdrawn'); }
      if (opts.text) say(opts.text); else hideBubble();   // never leave stale dialogue from a prior reaction
      clearTimeout(returnTimer);
      const dur = opts.dur || 1600;
      if (st !== 'IDLE' && st !== 'HIDDEN') {
        returnTimer = setTimeout(() => toIdle(), Access.scale(dur));
      }
      scheduleAmbient();
    }
    function toIdle() {
      if (Access.presence() === 'hidden') return;
      state = 'IDLE'; applyFace('IDLE'); hideBubble();   // clear dialogue when returning to idle / on route change
      if (dock) dock.classList.remove('active');
      scheduleAmbient();
    }
    function scheduleAmbient() {
      clearTimeout(ambientTimer); ambientTimer = null;
      if (document.hidden) return;
      if (Access.reducedMotion() || Access.presence() === 'minimal' || Access.presence() === 'hidden') return;
      // infrequent subtle blink / waveform breath while idle
      ambientTimer = setTimeout(() => {
        if (state === 'IDLE' && !document.hidden) {
          const eyes = svg && svg.querySelector('.patch-eyes');
          if (eyes) { eyes.setAttribute('class', 'patch-eyes eyes-shut'); Anim.after(150, () => eyes.setAttribute('class', 'patch-eyes eyes-dot'), { always: true }); }
        }
        scheduleAmbient();
      }, 9000 + Math.floor((Date.now() % 5000)));
    }
    function pauseAmbient() { clearTimeout(ambientTimer); ambientTimer = null; }

    return { mount, setState, toIdle, say, applyPresence, pauseAmbient, scheduleAmbient, states: () => Object.keys(FACE), get state() { return state; }, get mounted() { return mounted; } };
  })();

  /* =====================================================================
     REACTION QUEUE / CELEBRATION DIRECTOR — priorities, dedup, collapse,
     route cancellation. Common events must never build a queue.
     ===================================================================== */
  const Reactions = (() => {
    let current = null;            // {priority, endsAt}
    const lastKey = {};            // dedupe window per key
    function busy() { return current && Date.now() < current.endsAt; }
    // priority 0 ambient .. 5 reserved (bosses)
    function dispatch(r) {
      try {
        const now = Date.now();
        if (r.dedupeKey) { if (lastKey[r.dedupeKey] && now - lastKey[r.dedupeKey] < (r.dedupeMs || 350)) return; lastKey[r.dedupeKey] = now; }
        if (busy()) {
          if (r.priority < current.priority) return;                 // never interrupt a higher-priority reaction (protects BOSS_DEFEATED)
          if (r.priority === current.priority && r.priority < 3) return;   // don't restack equal low-priority reactions
        }
        current = { priority: r.priority, endsAt: now + (r.holdMs || 600) };
        r.run();
      } catch (e) { /* a decorative reaction can never break anything */ }
    }
    function cancelRoute() { current = null; Anim.cancelRoute(); Patch.toIdle(); }
    return { dispatch, cancelRoute, busy };
  })();

  /* =====================================================================
     PATCH DIRECTOR — maps course events to restrained reactions, honouring
     the presence mode. This is the only place events become PATCH behaviour.
     ===================================================================== */
  const NAV_LINE = {
    dashboard: 'Workshop station ready.', map: 'Scanning the zone route.', practice: 'Diagnostic bench open.',
    glossary: 'Consulting the reference.', profile: 'Operator badge on file.', settings: 'Adjusting the bench.',
  };
  const CORRECT_LINES = ['Clean signal.', "That's it.", 'Correct path.', 'System stable.'];
  const RETRY_LINES = ['That adjustment fixed it.', 'Good recovery.'];
  const INCORRECT_LINES = ['Let us inspect that signal.', 'Check the routing.', 'One part needs adjustment.'];

  function presence() { return Access.presence(); }
  function full() { return presence() === 'full'; }
  function atLeastBalanced() { const p = presence(); return p === 'full' || p === 'balanced'; }
  function pick(arr, seed) { return arr[Math.abs(seed || 0) % arr.length]; }

  // zone-aware demeanour foundation (short, not narrative)
  function zoneTone() {
    try {
      const z = Store.zoneOfNode(Store.nextNode() || (Store.state && Store.state.currentNode) || 'l1');
      return z ? z.num : 1;
    } catch (e) { return 1; }
  }

  function wire() {
    const on = GameBus.on;

    on(E.PROFILE_CREATED, () => {
      markSeen('introSeen');
      // createProfile emits synchronously and the welcome flow immediately reboots to
      // Home (a route change cancels in-flight reactions). Defer the intro so it lands
      // on the freshly-rendered dashboard instead of being torn down in the same tick.
      setTimeout(() => {
        // If the learner already navigated into a work screen (lesson/boss —
        // marked by has-actionbar), skip the greeting rather than letting it
        // land as stale dialogue on an unrelated screen. introSeen is already
        // recorded, so it simply never replays.
        if (document.body.classList.contains('has-actionbar')) return;
        Reactions.dispatch({ priority: 4, holdMs: 1800, run: () => {
          Patch.setState('BOOTING', { text: 'Workshop profile registered.', dur: 2200 });
          Audio.play('PROFILE_CREATED');
          Haptic.trigger('UI_CONFIRM');
          Anim.after(700, () => Patch.setState('APPROVING', { text: 'Welcome to the lab.', dur: 1600 }));
        } });
      }, 550);
    });

    on(E.PROFILE_UPDATED, () => { if (atLeastBalanced()) Patch.setState('APPROVING', { text: 'Profile updated.', dur: 1200 }); Audio.play('PROFILE_SAVED'); });

    on(E.NAVIGATION_COMPLETED, (ev) => {
      Audio.play('NAVIGATION');
      if (!atLeastBalanced()) return;
      Reactions.dispatch({ priority: 1, dedupeKey: 'nav', dedupeMs: 500, holdMs: 500, run: () => {
        Patch.setState('NAVIGATING', full() ? { text: NAV_LINE[ev.to] || '', dur: 1100 } : { dur: 900 });
      } });
    });

    on(E.QUESTION_PRESENTED, () => { if (atLeastBalanced()) Reactions.dispatch({ priority: 1, dedupeKey: 'q', dedupeMs: 400, holdMs: 400, run: () => Patch.setState('LISTENING', { dur: 1200 }) }); });

    on(E.ANSWER_CORRECT, (ev) => {
      Audio.play('CORRECT'); Haptic.trigger('ANSWER_CORRECT');
      Reactions.dispatch({ priority: 2, holdMs: 800, run: () => Patch.setState('APPROVING', (full() || (atLeastBalanced() && ((ev.id % 3) === 0))) ? { text: pick(CORRECT_LINES, ev.id), dur: 1400 } : { dur: 1200 }) });
    });
    on(E.ANSWER_CORRECT_AFTER_RETRY, (ev) => {
      Audio.play('CORRECT_AFTER_RETRY'); Haptic.trigger('ANSWER_RECOVERED');
      Reactions.dispatch({ priority: 2, holdMs: 900, run: () => Patch.setState('APPROVING', atLeastBalanced() ? { text: pick(RETRY_LINES, ev.id), dur: 1600 } : { dur: 1200 }) });
    });
    on(E.ANSWER_INCORRECT, (ev) => {
      Audio.play('INCORRECT'); Haptic.trigger('ANSWER_INCORRECT');
      Reactions.dispatch({ priority: 2, holdMs: 800, run: () => Patch.setState('CONCERNED', full() ? { text: pick(INCORRECT_LINES, ev.id), dur: 1400 } : { dur: 1100 }) });
    });
    on(E.ANSWER_REPEATED_INCORRECT, () => {
      Audio.play('HINT_AVAILABLE');
      // priority 3 so the diagnostic-hint nudge preempts the priority-2 ANSWER_INCORRECT
      // reaction that is emitted immediately before it in the same tick.
      Reactions.dispatch({ priority: 3, holdMs: 1400, run: () => Patch.setState('DIAGNOSING', atLeastBalanced() ? { text: 'Need a diagnostic hint?', dur: 2000 } : { dur: 1200 }) });
    });

    on(E.LESSON_COMPLETE, () => milestone('LESSON_COMPLETE', 'CELEBRATING', 'UI_CONFIRM', 'Lesson complete — filed.', 3));
    on(E.CHALLENGE_COMPLETE, () => milestone('CHALLENGE_COMPLETE', 'CELEBRATING', 'UI_CONFIRM', 'Diagnostic resolved.', 3));
    on(E.QUIZ_PERFECT, () => milestone('QUIZ_PERFECT', 'CELEBRATING', 'MISSION_COMPLETE', 'Clean 100% signal.', 3, 2200));
    on(E.QUIZ_PASSED, () => { Audio.play('QUIZ_PASS'); Haptic.trigger('UI_CONFIRM'); Reactions.dispatch({ priority: 3, holdMs: 1200, run: () => Patch.setState('APPROVING', atLeastBalanced() ? { text: 'Passed. Signal is stable.', dur: 1600 } : { dur: 1200 }) }); });
    on(E.QUIZ_FAILED, () => { Audio.play('QUIZ_FAIL'); Reactions.dispatch({ priority: 3, holdMs: 1400, run: () => Patch.setState('DIAGNOSING', atLeastBalanced() ? { text: 'Review the diagnostic, then retry.', dur: 2000 } : { dur: 1200 }) }); });
    on(E.MISSION_COMPLETE, () => milestone('MISSION_COMPLETE', 'MISSION_COMPLETE', 'MISSION_COMPLETE', 'Module connected. Mission complete.', 4, 2600));

    on(E.ACHIEVEMENT_UNLOCKED, (ev) => {
      const key = 'ach:' + (ev.achievementId || '');
      if (wasSeen(key)) { return; }        // never replay a badge celebration
      markSeen(key);
      Audio.play('ACHIEVEMENT_UNLOCK'); Haptic.trigger('ACHIEVEMENT');
      Reactions.dispatch({ priority: 4, holdMs: 1800, run: () => Patch.setState('ACHIEVEMENT', atLeastBalanced() ? { text: 'Badge installed.', dur: 2000 } : { dur: 1400 }) });
    });
    on(E.RANK_UP, (ev) => {
      const key = 'rank:' + (ev.to || ev.level || '');
      if (wasSeen(key)) return;
      markSeen(key);
      Audio.play('RANK_UP'); Haptic.trigger('RANK_UP');
      Reactions.dispatch({ priority: 4, holdMs: 2000, run: () => Patch.setState('RANK_UP', atLeastBalanced() ? { text: 'ID plate updated.', dur: 2200 } : { dur: 1400 }) });
    });
    on(E.ZONE_UNLOCKED, () => { Audio.play('ZONE_UNLOCKED'); if (atLeastBalanced()) Reactions.dispatch({ priority: 3, holdMs: 1600, run: () => Patch.setState('ATTENTIVE', { text: 'New workspace online.', dur: 1600 }) }); });

    on(E.LOCAL_SAVE_COMPLETE, () => { if (Patch.state === 'SAVING' || Patch.state === 'STORING') Patch.toIdle(); });
    on(E.LOCAL_SAVE_FAILED, () => { Audio.play('SAVE_FAILED'); Haptic.trigger('WARNING_SAVE'); Patch.setState('CONCERNED', { text: 'Save failed — export a backup.', dur: 2600 }); });
    on(E.STORAGE_RECOVERED, () => { Patch.setState('RECOVERING', { text: 'Backup restored. No progress lost.', dur: 2400 }); });
    on(E.BACKUP_EXPORTED, () => { Audio.play('BACKUP_COMPLETE'); if (atLeastBalanced()) Patch.setState('STORING', { text: 'Backup archived.', dur: 1400 }); });
    on(E.BACKUP_IMPORTED, () => { Audio.play('BACKUP_COMPLETE'); Patch.setState('STORING', { text: 'Profile restored.', dur: 1600 }); });

    on(E.SETTINGS_UPDATED, () => { Patch.applyPresence(); });

    /* ---- boss encounter (v1.2.0) ---- */
    on(E.BOSS_INTRO, () => { Audio.play('BOSS_INTRO'); Reactions.dispatch({ priority: 4, holdMs: 1800, run: () => Patch.setState('BOSS_INTRO', atLeastBalanced() ? { text: 'Diagnostics ready. I am with you.', dur: 2200 } : { dur: 1400 }) }); });
    on(E.BOSS_STARTED, () => { if (atLeastBalanced()) Reactions.dispatch({ priority: 3, holdMs: 1400, run: () => Patch.setState('BOSS_ASSIST', { dur: 1400 }) }); });
    on(E.BOSS_HP_CHANGED, (ev) => {
      if (ev.delta < 0) { Audio.play(ev.heavy ? 'PLAYER_ATTACK_HEAVY' : 'PLAYER_ATTACK'); Haptic.trigger(ev.heavy ? 'PLAYER_ATTACK_HEAVY' : 'PLAYER_ATTACK_LIGHT'); if (atLeastBalanced()) Reactions.dispatch({ priority: 2, holdMs: 700, run: () => Patch.setState('BOSS_ASSIST', { dur: 1000 }) }); }
    });
    on(E.PLAYER_HP_CHANGED, (ev) => {
      if (ev.delta < 0) { Audio.play('PLAYER_DAMAGE'); Haptic.trigger(ev.integrity <= 1 ? 'PLAYER_DAMAGE_HEAVY' : 'PLAYER_DAMAGE_LIGHT'); if (atLeastBalanced()) Reactions.dispatch({ priority: 2, holdMs: 700, run: () => Patch.setState('BOSS_CONCERNED', { dur: 1100 }) }); }
    });
    on(E.PLAYER_LOW_HP, () => { Audio.play('BOSS_WARNING'); Haptic.trigger('BOSS_WARNING'); Reactions.dispatch({ priority: 3, holdMs: 1400, run: () => Patch.setState('BOSS_CONCERNED', atLeastBalanced() ? { text: 'Integrity low. Steady — read each signal.', dur: 2000 } : { dur: 1200 }) }); });
    on(E.BOSS_LOW_HP, () => { if (atLeastBalanced()) Patch.setState('BOSS_ASSIST', { text: 'It is failing. Keep the pressure on.', dur: 1800 }); });
    on(E.BOSS_PHASE_CHANGED, () => { Audio.play('BOSS_PHASE'); Haptic.trigger('BOSS_PHASE_CHANGE'); Reactions.dispatch({ priority: 3, holdMs: 1200, run: () => Patch.setState('BOSS_ASSIST', { dur: 1400 }) }); });
    on(E.BOSS_DEFEATED, () => { Audio.play('BOSS_DEFEATED'); Haptic.trigger('BOSS_DEFEATED'); Reactions.dispatch({ priority: 5, holdMs: 2400, run: () => Patch.setState('BOSS_VICTORY', atLeastBalanced() ? { text: 'System repaired. Clean work.', dur: 2600 } : { dur: 1600 }) }); });
    on(E.BOSS_GAME_OVER, () => { Audio.play('PLAYER_DEFEATED'); Haptic.trigger('PLAYER_DEFEATED'); Reactions.dispatch({ priority: 5, holdMs: 2400, run: () => Patch.setState('BOSS_CONCERNED', atLeastBalanced() ? { text: 'No damage done. Regroup and retry.', dur: 2600 } : { dur: 1600 }) }); });
    on(E.BOSS_RESTARTED, () => { if (atLeastBalanced()) Patch.setState('BOSS_ASSIST', { text: 'Fresh diagnostics. Go again.', dur: 1600 }); });
  }

  function milestone(sound, state, haptic, text, prio, holdMs) {
    Audio.play(sound); Haptic.trigger(haptic);
    Reactions.dispatch({ priority: prio, holdMs: holdMs || 1600, run: () => Patch.setState(state, atLeastBalanced() ? { text, dur: holdMs || 1800 } : { dur: 1200 }) });
  }

  /* ---- one-time reaction memory (persisted in the profile) ---- */
  function wasSeen(key) { try { return !!(gs().seen[key]); } catch (e) { return false; } }
  function markSeen(key) {
    try {
      const s = Store.state.settings; s.game = s.game || {}; s.game.seen = s.game.seen || {};
      if (s.game.seen[key]) return;
      s.game.seen[key] = 1; Store.save();
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
     BUTTON FEEDBACK — one delegated interaction lifecycle (click), so we
     never double-fire from pointerdown + click. Pressed visual is pure CSS.
     ===================================================================== */
  function wireButtons() {
    document.addEventListener('click', (e) => {
      try {
        const t = e.target && e.target.closest && e.target.closest('.btn, .opt, .card-tap, .avatar-opt, .gloss-term, .chip, .icon-btn');
        if (!t || t.classList.contains('tab')) return;   // tabs get NAVIGATION instead
        Audio.play('UI_PRESS');
        Haptic.trigger('UI_LIGHT');
      } catch (err) { /* ignore */ }
    }, true);
  }

  /* =====================================================================
     INIT — called once from App.boot() AFTER the shell exists.
     ===================================================================== */
  let started = false;
  function init() {
    if (started) return; started = true;
    try {
      Patch.mount();
      wire();
      wireButtons();
      // audio unlocks on the first real user gesture (browser policy)
      const unlock = () => { Audio.unlock(); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      // pause decorative work when the tab is hidden
      document.addEventListener('visibilitychange', () => { Audio.setVisibility(); Anim.setPaused(document.hidden); if (document.hidden) Patch.pauseAmbient(); else Patch.scheduleAmbient(); });
      window.addEventListener('pagehide', () => { Anim.cancelRoute(); });
      Patch.setState('BOOTING', { dur: 900 }); Audio.play('PATCH_BOOT');
      Anim.after(900, () => Patch.toIdle());
    } catch (e) { /* the game layer must never block boot */ }
  }
  // called by App.go on every route change: cancel stale reactions/dialogue
  function onRoute() { try { Reactions.cancelRoute(); } catch (e) {} }

  return {
    init, onRoute, EVENTS: E,
    Access, Anim, Audio, Haptic, Patch, Reactions,
    settingsDefaults: DEFAULTS, gs,
    // future native haptic bridge hook (Core Haptics adapter injected here)
    setHapticAdapter: (a) => Haptic.setAdapter(a),
  };
})();
