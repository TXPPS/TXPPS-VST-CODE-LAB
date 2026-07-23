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
  };

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

  return { has, def, createSession, stats, recordAttempt, recordVictory, STATES, TRANSITIONS: T };
})();
