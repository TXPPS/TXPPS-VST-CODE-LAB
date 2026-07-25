/* ============================================================
   BossKit (v1.2.0) — reusable, data-driven boss encounter framework.

   Design rules:
   - GRADING STAYS WHERE IT WAS. The curriculum's sequence runner still
     evaluates every answer, counts retries, awards XP and calls
     Store.completeNode exactly as before. BossKit only OBSERVES those
     resolutions and turns them into HP / integrity / phase state.
   - Question pools REFERENCE the validated curriculum node (nodeRef);
     no question is duplicated into a boss definition.
   - The session is a pure, deterministic state machine: no timers, no
     animation dependence. It stays correct with reduced motion, muted
     audio, no haptics, PATCH hidden, the GameBus disabled, or the page
     hidden. All emissions are guarded.
   - HP model (honest mapping onto the existing rules):
       maxHp            = number of stages
       damage per stage = 1 (a correct answer, first try or retry)
       defeat line      = maxHp - passNeed  (hp at/below it at the end
                          of the run means the boss falls — identical to
                          "clear passNeed+ of N stages")
       player integrity = stages - passNeed + 1 (each failed stage costs
                          1; reaching 0 means passing is mathematically
                          impossible, so the run ends early — the same
                          failed outcome the legacy full run would record)
   ============================================================ */

const BossKit = (() => {
  function bus(t, p) { try { if (typeof GameBus !== 'undefined') GameBus.emit(t, p); } catch (e) { /* decorative */ } }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /* ---- BossDefinition table (Zone 1 vertical slice) ----
     Later zones add entries here; bosses without an entry keep the
     legacy presentation untouched. */
  const DEFS = {
    boss1: {
      id: 'boss1', zoneId: 'z1', nodeRef: 'boss1',
      name: 'THE BROKEN GAIN PLUGIN',
      subtitle: 'GainPlug v0.9 — corrupted inheritance',
      description: 'A half-finished plugin left behind by a departed developer. It fights back with build errors, silent bugs and an unsafe callback. Repair it stage by stage.',
      // phases: active while bossHp > until (scan top-down). Deterministic from HP.
      phases: [
        { id: 'shielded', until: 4, title: 'PHASE 1 — SHIELDED FAULTS', behavior: 'The corruption hides behind compiler errors.' },
        { id: 'exposed', until: 2, title: 'PHASE 2 — EXPOSED WIRING', behavior: 'The faults are visible. Precision matters now.' },
        { id: 'critical', until: -1, title: 'PHASE 3 — SYSTEM FAILING', behavior: 'The plugin is failing. Finish the repair.' },
      ],
      presentation: { integrityLabel: 'SIGNAL INTEGRITY', hpLabel: 'CORRUPTION', defeatLineLabel: 'REPAIR THRESHOLD' },
      accessibility: { textOnly: 'Answer stages to repair the plugin. Each correct stage removes one block of corruption; each failed stage costs one integrity cell. Repair enough stages to win.' },
    },
    // ---- Zone 2 (v1.3.1) — the first fully-authored production encounter.
    //      Theme: modern C++ memory ownership. Questions live in the boss2
    //      curriculum node (nodeRef); phases/dialogue/viz are authored here. ----
    boss2: {
      id: 'boss2', zoneId: 'z2', nodeRef: 'boss2',
      name: 'THE OWNERSHIP CRISIS',
      subtitle: 'Corrupted ownership graph — objects with no owner',
      description: 'The synth\'s ownership graph is corrupting: objects allocated with no clear owner, resources that never release, pointers that outlive what they point to. Trace every object back to exactly one owner before the leaks cascade.',
      phases: [
        { id: 'identify', until: 4, title: 'PHASE 1 — WHO OWNS THIS?', behavior: 'Objects are appearing with no clear owner. Work out who is responsible for cleaning up each one.' },
        { id: 'repair', until: 2, title: 'PHASE 2 — RESOURCE REPAIR', behavior: 'Owners are wrong or missing. Give each resource a safe owner and a guaranteed release.' },
        { id: 'cascade', until: -1, title: 'PHASE 3 — OWNERSHIP CASCADE', behavior: 'Ownership is tangled across the graph. Untangle the final cycles before the leaks spread.' },
      ],
      presentation: { integrityLabel: 'GRAPH INTEGRITY', hpLabel: 'CORRUPTION', defeatLineLabel: 'CONTAINMENT' },
      accessibility: { textOnly: 'Answer each ownership problem to contain the corruption. Each correct repair removes one block of corruption; each miss costs one graph-integrity cell. Contain enough repairs to stabilise the ownership graph.' },
      dialogue: {
        briefing: 'Every object needs exactly one owner and a clean path to release. Trace each allocation to its owner — I will help you read the graph.',
        victory: 'Ownership graph stabilised. Every resource has one owner and a guaranteed release — that is production-grade C++.',
        defeat: 'A few owners are still unclear, so the graph is not contained yet — but nothing shipped and nothing broke. Review the ownership rules and run it again.',
      },
      viz: { t: 'owners', mode: 'shared' },   // the generator draws its own caption
    },
    // ---- Zone 3 (v1.3.2) — production encounter. Theme: audio DSP signal integrity.
    //      Questions live in the boss3 curriculum node (nodeRef); phases/dialogue/viz
    //      are authored here. Diagnose a failing signal path, then repair it. ----
    boss3: {
      id: 'boss3', zoneId: 'z3', nodeRef: 'boss3',
      name: 'SIGNAL INTEGRITY',
      subtitle: 'A failing signal path — clipping, aliasing, broken gain staging',
      description: 'A professional audio engine is losing signal integrity: a stage is clipping past full scale, an out-of-band tone is aliasing back into the audible band, the gain structure has no headroom, and the buffer flow has a routing fault. Diagnose the path, then repair it stage by stage.',
      phases: [
        { id: 'diagnose', until: 4, title: 'PHASE 1 — SIGNAL DIAGNOSIS', behavior: 'Read the meters and the scope. Identify what is clipping, what is aliasing, and where the level goes wrong before you touch anything.' },
        { id: 'repair', until: 2, title: 'PHASE 2 — REPAIR CHAIN', behavior: 'The faults are located. Fix the gain staging and insert the right filter so the signal stays inside its headroom.' },
        { id: 'stabilise', until: -1, title: 'PHASE 3 — SIGNAL STABILISATION', behavior: 'Tie the DSP concepts together. Correct the buffer flow and the oversampling order to deliver a clean, production-quality path.' },
      ],
      presentation: { integrityLabel: 'SIGNAL INTEGRITY', hpLabel: 'DISTORTION', defeatLineLabel: 'STABILISE THRESHOLD' },
      accessibility: { textOnly: 'Diagnose and repair a failing audio signal path. Each correct stage removes one block of distortion; each miss costs one signal-integrity cell. Stabilise enough stages to deliver a clean signal.' },
      dialogue: {
        briefing: 'Signal integrity is dropping across the path. We diagnose before we repair: read the meter, read the scope, name the fault in DSP terms — then fix it. I will walk the chain with you.',
        victory: 'Signal path stable. Nothing is clipping, nothing is aliasing, and every stage sits inside its headroom — that is a production-quality signal chain.',
        defeat: 'A couple of faults are still corrupting the path, so the signal is not clean yet — but nothing shipped and nothing broke. Review the meters and the gain structure, then run it again.',
      },
      viz: { t: 'clipwave' },   // clipped-waveform scope: the signal driven past full scale
    },
    // ---- Zone 4 (v1.3.3) — production encounter. Theme: JUCE plugin architecture.
    //      Questions live in the boss4 curriculum node (nodeRef); phases/dialogue/viz
    //      are authored here. An architecture review of a failing plugin. ----
    boss4: {
      id: 'boss4', zoneId: 'z4', nodeRef: 'boss4',
      name: 'THE PLUGIN ARCHITECT',
      subtitle: 'A plugin failing architecture review — wrong owners, dead wiring, unsafe threads',
      description: 'A commercial plugin is failing its architecture review: DSP state lives in the wrong class, host automation reaches nothing, parameter changes step audibly, and the audio thread breaks its real-time contract. Walk the design like a senior engineer — diagnose each fault, then repair the architecture.',
      phases: [
        { id: 'architecture', until: 4, title: 'PHASE 1 — BROKEN ARCHITECTURE', behavior: 'Map the responsibilities first. Which class owns the DSP state, and which lifecycle callback owns the setup? Fix the structure before touching the wiring.' },
        { id: 'communication', until: 2, title: 'PHASE 2 — REPAIR COMMUNICATION', behavior: 'The structure stands. Now wire host, parameters and audio together: automation into the APVTS parameter, and smoothed values into the block.' },
        { id: 'stability', until: -1, title: 'PHASE 3 — PRODUCTION STABILITY', behavior: 'Final review. Enforce the real-time contract on the audio thread and restore saved state defensively — ship-quality architecture, end to end.' },
      ],
      presentation: { integrityLabel: 'ARCHITECTURE INTEGRITY', hpLabel: 'DESIGN FAULTS', defeatLineLabel: 'REVIEW THRESHOLD' },
      accessibility: { textOnly: 'Diagnose and repair a plugin\'s architecture. Each correct stage clears one design fault; each miss costs one architecture-integrity cell. Clear enough faults to pass the review.' },
      dialogue: {
        briefing: 'This plugin fails architecture review: state in the wrong owner, automation that reaches nothing, an audio thread missing its deadline. We fix architecture the way senior engineers do — responsibilities first, then the wiring, then the real-time contract. Reason each call out loud with me.',
        victory: 'Architecture review passed. Every piece of state has the right owner, the host and the audio thread speak through the parameters, and the block never blocks. That is a plugin you can ship — and maintain.',
        defeat: 'The review found design faults still standing, so this build does not ship yet — but nothing here touched a real release. Re-read the processor/editor split and the parameter path, then bring it back to review.',
      },
      viz: { t: 'paramflow' },   // slider → attachment → APVTS → atomic → smoother → audio, with the automation inlet
    },
    // ---- Zone 5 (v1.3.4) — production encounter. Theme: real-time performance engineering.
    //      Questions live in the boss5 curriculum node (nodeRef); phases/dialogue/viz
    //      are authored here. A release candidate failing under production load. ----
    boss5: {
      id: 'boss5', zoneId: 'z5', nodeRef: 'boss5',
      name: 'THE REAL-TIME GUARDIAN',
      subtitle: 'A release candidate failing under load — locks, spikes, clicking steals',
      description: 'A commercial synth is one review away from release. It sounds perfect on the bench, but under production workloads the meters spike and the audio clicks: a lock on the audio thread, denormal tails, allocation in the note path, a meter wired through the wrong thread, voices stolen with a bang. Profile it, pin every source of instability, and certify it for release.',
      phases: [
        { id: 'diagnose', until: 4, title: 'PHASE 1 — PERFORMANCE DIAGNOSIS', behavior: 'Reproduce, then measure. Read the profiler like a scope: find the lock and the CPU spike before touching any code.' },
        { id: 'stabilise', until: 2, title: 'PHASE 2 — REAL-TIME STABILISATION', behavior: 'Make the callback deterministic: allocation-free note handling, and thread crossings that never wait — atomics and lock-free queues only.' },
        { id: 'loadtest', until: -1, title: 'PHASE 3 — PRODUCTION LOAD TEST', behavior: 'Full session, every voice lit. Click-free voice stealing and a watertight producer/consumer handoff — hold the deadline through the worst case.' },
      ],
      presentation: { integrityLabel: 'DEADLINE MARGIN', hpLabel: 'INSTABILITY', defeatLineLabel: 'CERTIFY THRESHOLD' },
      accessibility: { textOnly: 'Diagnose and eliminate real-time instabilities in a release candidate. Each correct stage removes one block of instability; each miss costs one cell of deadline margin. Stabilise enough stages to certify the release.' },
      dialogue: {
        briefing: 'Release review, performance pass. It sounds right — that is not the bar. We measure: worst case, not average case. Reproduce the glitch, name the mechanism, then make the fix boring and deterministic. Walk the profiler with me.',
        victory: 'Certified. The callback is allocation-free, every thread crossing is lock-free, and the worst case fits inside the deadline with margin to spare. Real-time does not mean fast — it means predictable. Ship it.',
        defeat: 'The load test still catches instabilities, so this candidate is not certified — and better this rig catches them than a stage does. Re-read the real-time contract (worst case, not average), then bring it back for another pass.',
      },
      viz: { t: 'callbacktime' },   // one block's budget vs the deadline — "worst case IS the spec"
    },
  };

  /* ---- v1.3.0: generic 3-phase generator, so a definition need not hand-tune
     phase thresholds. For a 6-stage boss it yields exactly boss1's 4/2/-1. ---- */
  function autoPhases(maxHp) {
    const a = Math.max(1, Math.round(maxHp * 2 / 3));
    const b = Math.max(0, Math.round(maxHp * 1 / 3));
    return [
      { id: 'onset', until: a, title: 'PHASE 1 — ONSET', behavior: 'Development phase one — faults appear.' },
      { id: 'rising', until: b, title: 'PHASE 2 — RISING', behavior: 'Development phase two — instability climbs.' },
      { id: 'critical', until: -1, title: 'PHASE 3 — CRITICAL', behavior: 'Development phase three — finish the stabilisation.' },
    ];
  }

  /* ---- v1.3.0: QA-only DEVELOPMENT definitions for Zones 2–7. These run on the
     REAL BossKit using the zone's curriculum boss node (nodeRef) for deterministic
     prompts. They use DISTINCT ids (dev_bossN), so BossKit.has('bossN') stays false
     and the learner boss2–7 legacy encounters are completely untouched. They are
     `development: true` and never launchable by normal learners. ---- */
  (function registerDevelopmentBosses() {
    for (let z = 6; z <= 7; z++) {   // Zones 1–5 are production encounters (DEFS.boss1–5); Zones 6–7 remain development
      const nodeId = 'boss' + z;
      let stages = 6, passNeed = 4;
      try {
        const n = (typeof Engine !== 'undefined' && Engine.NODES) ? Engine.NODES[nodeId] : null;
        if (n && Array.isArray(n.stages) && n.stages.length) { stages = n.stages.length; passNeed = n.passNeed || 4; }
      } catch (e) { /* fall back to 6/4 */ }
      DEFS['dev_boss' + z] = {
        id: 'dev_boss' + z, zoneId: 'z' + z, nodeRef: nodeId, development: true,
        name: 'DEVELOPMENT ENCOUNTER — ZONE ' + z,
        subtitle: 'zone-' + z + '-development-boss (framework test)',
        description: 'Structural development encounter for Zone ' + z + '. It runs on the real BossKit with deterministic curriculum-derived prompts to exercise intro, phase changes, victory, defeat, retry and exit. This is not finished content and awards nothing.',
        phases: autoPhases(stages),
        presentation: { integrityLabel: 'SIGNAL INTEGRITY', hpLabel: 'INSTABILITY', defeatLineLabel: 'STABILISE THRESHOLD' },
        accessibility: { textOnly: 'Development encounter for framework testing. Answer curriculum-derived prompts; each correct prompt lowers instability, each miss costs an integrity cell. QA only — nothing is saved.' },
        _passNeedHint: passNeed,
      };
    }
  })();

  const STATES = ['LOCKED', 'READY', 'INTRO', 'QUESTION', 'RESOLVING_CORRECT', 'RESOLVING_INCORRECT', 'PHASE_TRANSITION', 'VICTORY', 'DEFEAT', 'PAUSED', 'COMPLETE'];
  // Deterministic transition table: state -> the states it may move to.
  const T = {
    LOCKED: ['READY'],
    READY: ['INTRO'],
    INTRO: ['QUESTION'],
    QUESTION: ['RESOLVING_CORRECT', 'RESOLVING_INCORRECT', 'PAUSED'],
    RESOLVING_CORRECT: ['QUESTION', 'PHASE_TRANSITION', 'VICTORY', 'DEFEAT', 'PAUSED'],
    RESOLVING_INCORRECT: ['QUESTION', 'PHASE_TRANSITION', 'VICTORY', 'DEFEAT', 'PAUSED'],
    PHASE_TRANSITION: ['QUESTION', 'VICTORY', 'DEFEAT', 'PAUSED'],
    VICTORY: ['COMPLETE'],
    DEFEAT: ['COMPLETE'],
    PAUSED: ['QUESTION', 'RESOLVING_CORRECT', 'RESOLVING_INCORRECT', 'PHASE_TRANSITION'],
    COMPLETE: [],
  };

  function has(id) { return !!DEFS[id]; }
  function def(id) { return DEFS[id] || null; }

  function node(id) {
    try { return (typeof Engine !== 'undefined' && Engine.NODES[DEFS[id].nodeRef]) || null; } catch (e) { return null; }
  }

  function createSession(bossId) {
    const d = DEFS[bossId];
    const n = node(bossId);
    if (!d || !n || !Array.isArray(n.stages) || !n.stages.length) return null;

    const total = n.stages.length;
    const passNeed = n.passNeed || 4;
    const maxHp = total;
    const defeatLine = maxHp - passNeed;                 // hp <= this at run end => boss falls
    const maxIntegrity = total - passNeed + 1;

    const s = {
      bossId, state: 'READY',
      bossHp: maxHp, maxHp, defeatLine, passNeed,
      playerIntegrity: maxIntegrity, maxIntegrity,
      phaseIndex: 0, questionIndex: 0, total,
      correctCount: 0, incorrectCount: 0, retryCount: 0,
      startedAt: null, completedAt: null,
      lowHpWarned: false, lowIntegrityWarned: false,
    };

    function phaseIndexFor(hp) {
      for (let i = 0; i < d.phases.length; i++) if (hp > d.phases[i].until) return i;
      return d.phases.length - 1;
    }
    function to(next) {
      if (!STATES.includes(next)) return false;          // unknown state: fail safely, keep current
      if (!(T[s.state] || []).includes(next)) return false;
      s.state = next;
      return true;
    }

    return {
      get state() { return s.state; },
      get snapshot() { return Object.assign({}, s, { phase: d.phases[s.phaseIndex] }); },
      def: d,

      enter() {
        if (!to('INTRO')) return false;
        bus('BOSS_ENTERED', { bossId, zoneId: d.zoneId });
        bus('BOSS_INTRO', { bossId, name: d.name });
        return true;
      },
      start() {
        if (!to('QUESTION')) return false;
        s.startedAt = nowIso();
        bus('BOSS_STARTED', { bossId, maxHp, maxIntegrity: s.maxIntegrity, passNeed });
        return true;
      },
      // Observe a stage resolution from the curriculum runner. `res` is the
      // runner's result: { correct, firstTry, attempts }.
      resolve(res) {
        const target = res.correct ? 'RESOLVING_CORRECT' : 'RESOLVING_INCORRECT';
        to(target);                                       // QUESTION or PAUSED -> RESOLVING_*
        if (s.state !== target) return null;              // invalid from any other state: fail safely
        s.questionIndex += 1;
        if (!res.firstTry && res.correct) s.retryCount += 1;
        const before = { hp: s.bossHp, integrity: s.playerIntegrity, phase: s.phaseIndex };
        if (res.correct) {
          s.correctCount += 1;
          s.bossHp = Math.max(0, s.bossHp - 1);
          bus('BOSS_HP_CHANGED', { bossId, hp: s.bossHp, maxHp, delta: -1, heavy: !!res.firstTry, belowDefeatLine: s.bossHp <= defeatLine });
          if (!s.lowHpWarned && s.bossHp <= defeatLine) { s.lowHpWarned = true; bus('BOSS_LOW_HP', { bossId, hp: s.bossHp }); }
        } else {
          s.incorrectCount += 1;
          s.playerIntegrity = Math.max(0, s.playerIntegrity - 1);
          bus('PLAYER_HP_CHANGED', { bossId, integrity: s.playerIntegrity, maxIntegrity: s.maxIntegrity, delta: -1 });
          if (!s.lowIntegrityWarned && s.playerIntegrity === 1) { s.lowIntegrityWarned = true; bus('PLAYER_LOW_HP', { bossId, integrity: 1 }); }
        }
        bus('BOSS_QUESTION_RESOLVED', { bossId, index: s.questionIndex - 1, correct: !!res.correct, attempt: res.attempts });
        const newPhase = phaseIndexFor(s.bossHp);
        const phaseChanged = newPhase !== before.phase;
        if (phaseChanged) {
          s.phaseIndex = newPhase;
          to('PHASE_TRANSITION');
          bus('BOSS_PHASE_CHANGED', { bossId, phaseIndex: newPhase, phaseId: d.phases[newPhase].id, title: d.phases[newPhase].title });
        }
        return { correct: !!res.correct, bossHp: s.bossHp, integrity: s.playerIntegrity, phaseChanged, phase: d.phases[s.phaseIndex], defeatImminent: s.playerIntegrity === 0 };
      },
      // Advance after a resolution: next question, or a terminal state.
      // Called by the view when the learner continues (or immediately on
      // early defeat). Deterministic — depends only on counters.
      advance() {
        if (s.playerIntegrity <= 0) {                     // passing is now impossible
          if (to('DEFEAT')) { s.completedAt = nowIso(); bus('BOSS_GAME_OVER', { bossId, correct: s.correctCount, total: s.total }); }
          return 'DEFEAT';
        }
        if (s.questionIndex >= s.total) {
          if (s.correctCount >= passNeed) {
            if (to('VICTORY')) { s.completedAt = nowIso(); bus('BOSS_DEFEATED', { bossId, correct: s.correctCount, total: s.total, integrity: s.playerIntegrity }); }
            return 'VICTORY';
          }
          if (to('DEFEAT')) { s.completedAt = nowIso(); bus('BOSS_GAME_OVER', { bossId, correct: s.correctCount, total: s.total }); }
          return 'DEFEAT';
        }
        to('QUESTION');
        return 'QUESTION';
      },
      pause() { if (s.state === 'QUESTION') to('PAUSED'); },
      resume() { if (s.state === 'PAUSED') to('QUESTION'); },
      acknowledge() { to('COMPLETE'); },
      restartEvent() { bus('BOSS_RESTARTED', { bossId }); },
    };
  }

  /* ---- small persisted stats (attempts / victories) ---- */
  function stats(bossId) {
    try { return (Store.gameSetting('boss.' + bossId) || { attempts: 0, victories: 0 }); } catch (e) { return { attempts: 0, victories: 0 }; }
  }
  // Boss attempt/victory tallies are permanent progression — suppressed while
  // the owner's QA simulation mode is active (see ProgressionPolicy).
  function persistOk() { try { return (typeof ProgressionPolicy === 'undefined') || ProgressionPolicy.shouldPersist(); } catch (e) { return true; } }
  function recordAttempt(bossId) {
    if (!persistOk()) return;
    try { const st = stats(bossId); Store.setGameSetting('boss.' + bossId, { attempts: (st.attempts | 0) + 1, victories: st.victories | 0 }); } catch (e) { /* decorative */ }
  }
  function recordVictory(bossId) {
    if (!persistOk()) return;
    try { const st = stats(bossId); Store.setGameSetting('boss.' + bossId, { attempts: st.attempts | 0, victories: (st.victories | 0) + 1 }); } catch (e) { /* decorative */ }
  }

  function isDevelopment(id) { return !!(DEFS[id] && DEFS[id].development); }
  function listDefs() { return Object.keys(DEFS); }

  return { has, def, createSession, stats, recordAttempt, recordVictory, STATES, TRANSITIONS: T, isDevelopment, listDefs, autoPhases };
})();
