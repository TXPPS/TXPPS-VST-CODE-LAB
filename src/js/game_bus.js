/* ============================================================
   Game Event Bus (v1.1.0) — the one place course logic talks to
   the reaction layer. Views/lessons EMIT semantic events; they
   never touch PATCH, audio, haptics, or animation directly.

   A handler that throws is isolated — a decorative subsystem can
   never break grading, navigation, or saving. Emitting is always
   safe even if no director is listening.

   Payload model: callers pass the relevant fields for an event
   (never whole curriculum records). The bus stamps id/type/t.
   Common fields: profileId, zoneId, lessonId, nodeId, questionId,
   attempt, previousAttempts, xp, achievementId, from, to,
   saveStatus, severity, replay.
   ============================================================ */

const GameBus = (() => {
  // Live event catalog for this phase.
  const EVENTS = {
    APPLICATION_BOOT_STARTED: 'APPLICATION_BOOT_STARTED',
    APPLICATION_READY: 'APPLICATION_READY',
    PROFILE_CREATED: 'PROFILE_CREATED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    NAVIGATION_SELECTED: 'NAVIGATION_SELECTED',
    NAVIGATION_COMPLETED: 'NAVIGATION_COMPLETED',
    LESSON_ENTERED: 'LESSON_ENTERED',
    LESSON_EXITED: 'LESSON_EXITED',
    QUESTION_PRESENTED: 'QUESTION_PRESENTED',
    ANSWER_SUBMITTED: 'ANSWER_SUBMITTED',
    ANSWER_CORRECT: 'ANSWER_CORRECT',
    ANSWER_CORRECT_AFTER_RETRY: 'ANSWER_CORRECT_AFTER_RETRY',
    ANSWER_INCORRECT: 'ANSWER_INCORRECT',
    ANSWER_REPEATED_INCORRECT: 'ANSWER_REPEATED_INCORRECT',
    HINT_OFFERED: 'HINT_OFFERED',
    HINT_OPENED: 'HINT_OPENED',
    HINT_DISMISSED: 'HINT_DISMISSED',
    QUIZ_STARTED: 'QUIZ_STARTED',
    QUIZ_PERFECT: 'QUIZ_PERFECT',
    QUIZ_PASSED: 'QUIZ_PASSED',
    QUIZ_FAILED: 'QUIZ_FAILED',
    LESSON_COMPLETE: 'LESSON_COMPLETE',
    CHALLENGE_COMPLETE: 'CHALLENGE_COMPLETE',
    MISSION_COMPLETE: 'MISSION_COMPLETE',
    ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
    XP_GAINED: 'XP_GAINED',
    RANK_UP: 'RANK_UP',
    ZONE_UNLOCKED: 'ZONE_UNLOCKED',
    LOCAL_SAVE_STARTED: 'LOCAL_SAVE_STARTED',
    LOCAL_SAVE_COMPLETE: 'LOCAL_SAVE_COMPLETE',
    LOCAL_SAVE_FAILED: 'LOCAL_SAVE_FAILED',
    BACKUP_EXPORTED: 'BACKUP_EXPORTED',
    BACKUP_IMPORTED: 'BACKUP_IMPORTED',
    OFFLINE_READY: 'OFFLINE_READY',
    STORAGE_RECOVERED: 'STORAGE_RECOVERED',
    STORAGE_WARNING: 'STORAGE_WARNING',
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
    // ---- boss encounter catalog (activated in v1.2.0) ----
    BOSS_UNLOCKED: 'BOSS_UNLOCKED',
    BOSS_ENTERED: 'BOSS_ENTERED',
    BOSS_INTRO: 'BOSS_INTRO',
    BOSS_STARTED: 'BOSS_STARTED',
    BOSS_QUESTION_RESOLVED: 'BOSS_QUESTION_RESOLVED',
    BOSS_HP_CHANGED: 'BOSS_HP_CHANGED',
    PLAYER_HP_CHANGED: 'PLAYER_HP_CHANGED',
    BOSS_PHASE_CHANGED: 'BOSS_PHASE_CHANGED',
    PLAYER_LOW_HP: 'PLAYER_LOW_HP',
    BOSS_LOW_HP: 'BOSS_LOW_HP',
    BOSS_GAME_OVER: 'BOSS_GAME_OVER',
    BOSS_RESTARTED: 'BOSS_RESTARTED',
    BOSS_DEFEATED: 'BOSS_DEFEATED',
    // ---- owner QA layer (v1.2.1). Payloads never carry the passphrase,
    //      verifier, attempt text, or full profile data. ----
    OWNER_ACCESS_OPENED: 'OWNER_ACCESS_OPENED',
    OWNER_ACCESS_UNLOCKED: 'OWNER_ACCESS_UNLOCKED',
    OWNER_ACCESS_LOCKED: 'OWNER_ACCESS_LOCKED',
    QA_MODE_ENABLED: 'QA_MODE_ENABLED',
    QA_MODE_DISABLED: 'QA_MODE_DISABLED',
    QA_NODE_OPENED: 'QA_NODE_OPENED',
    QA_SIMULATION_STARTED: 'QA_SIMULATION_STARTED',
    QA_SIMULATION_ENDED: 'QA_SIMULATION_ENDED',
    QA_PROFILE_CREATED: 'QA_PROFILE_CREATED',
    QA_PROFILE_RESET: 'QA_PROFILE_RESET',
  };

  // Reserved for the future zone-completion / graduation pass. Declared so
  // code can be wired against stable names, but NOTHING emits these yet.
  const FUTURE = {
    ZONE_COMPLETE: 'ZONE_COMPLETE',
    COURSE_COMPLETE: 'COURSE_COMPLETE',
    GRADUATION_STARTED: 'GRADUATION_STARTED',
    GRADUATION_COMPLETE: 'GRADUATION_COMPLETE',
  };

  const ALL = Object.assign({}, EVENTS, FUTURE);
  const known = new Set(Object.values(ALL));

  const handlers = Object.create(null);   // type -> [fn]
  const recent = [];                      // small ring buffer for tests/diagnostics
  let seq = 0;
  let enabled = true;

  function now() { try { return Date.now(); } catch (e) { return 0; } }

  function on(type, fn) {
    (handlers[type] || (handlers[type] = [])).push(fn);
    return () => off(type, fn);
  }
  function off(type, fn) {
    if (handlers[type]) handlers[type] = handlers[type].filter((f) => f !== fn);
  }

  function emit(type, payload) {
    // reserved envelope fields (id/type/t) always win over any payload keys
    const ev = Object.assign({}, payload || {}, { id: ++seq, type, t: now() });
    recent.push(ev); if (recent.length > 80) recent.shift();
    if (!enabled) return ev;
    const fire = (list) => { if (list) for (const fn of list.slice()) { try { fn(ev); } catch (e) { /* isolate decorative failures */ } } };
    fire(handlers[type]);
    fire(handlers['*']);         // wildcard subscribers (diagnostics/tests)
    return ev;
  }

  return {
    EVENTS, FUTURE, ALL,
    isKnown: (t) => known.has(t),
    on, off, emit,
    get recent() { return recent; },
    get seq() { return seq; },
    setEnabled(v) { enabled = !!v; },   // tests: prove course logic survives a dead bus
    reset() { for (const k of Object.keys(handlers)) delete handlers[k]; recent.length = 0; },
  };
})();
