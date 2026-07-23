/* ============================================================
   ProgressionPolicy / RewardPolicy (v1.2.1) — the ONE place that
   decides whether a PERMANENT progression write or a REWARD grant is
   allowed to land. The store's reward funnels (completeNode, addXp,
   grant, touchStreak, completeDaily, markWeak, clearWeak,
   setProjectStep) consult these instead of each carrying its own check.

   Default: allow (returns true). While the owner's QA simulation mode
   is active they return false, so opening/answering content in QA mode
   grades and animates normally but writes NOTHING to the learner's
   real progress — no XP, stars, ranks, achievements, streaks, node
   completion, boss stats, or graduation.

   Degrades safely: with QaAccess absent, nothing is ever suppressed.
   These are pure predicates — they never mutate anything.
   ============================================================ */

const ProgressionPolicy = (() => {
  function suppressed() { try { return typeof QaAccess !== 'undefined' && QaAccess.suppresses(); } catch (e) { return false; } }
  return {
    // May a permanent write to real learner progress be persisted right now?
    shouldPersist: () => !suppressed(),
    suppressed,
  };
})();

const RewardPolicy = (() => {
  function suppressed() { try { return typeof QaAccess !== 'undefined' && QaAccess.suppresses(); } catch (e) { return false; } }
  return {
    // May a reward (XP / stars / achievement / streak) be granted right now?
    shouldGrant: () => !suppressed(),
  };
})();
