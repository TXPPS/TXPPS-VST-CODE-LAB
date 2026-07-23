/* ============================================================
   AccessPolicy (v1.2.1) — the ONE place "may this be opened?" is
   decided. Course views ask AccessPolicy instead of re-deriving lock
   rules (map / profile / dict / boss all funnel here).

   Normal mode: delegates to the existing progression rules, so
   behaviour is byte-identical to v1.2.0. QA mode (owner simulation):
   returns open for every VALID node so the owner can inspect anything
   WITHOUT any completion data being written.

   This is a pure, read-only authority — it never mutates progress and
   never grades. It degrades safely: with QaAccess absent, qaOverride is
   always false and only the normal rules apply.
   ============================================================ */

const AccessPolicy = (() => {
  function qaOverride() {
    try { return typeof QaAccess !== 'undefined' && QaAccess.accessOpen(); } catch (e) { return false; }
  }
  function node(id) { try { return (typeof Engine !== 'undefined' && Engine.NODES) ? Engine.NODES[id] : null; } catch (e) { return null; } }
  function exists(id) { return !!node(id); }
  function zoneOf(id) { try { return Store.zoneOfNode(id); } catch (e) { return null; } }

  // The normal per-node gate — exactly the sequential unlock the map/profile/
  // dict already used (Store.isUnlocked ignores the zone arg; the walk is global).
  function normalNodeRule(id) {
    try { const z = zoneOf(id); return Store.isUnlocked(z ? z.id : '', id); } catch (e) { return false; }
  }

  function canOpenNode(id) {
    if (!exists(id)) return false;
    if (qaOverride()) return true;
    return normalNodeRule(id);
  }

  function canOpenZone(z) {
    if (!z) return false;
    if (qaOverride()) return true;
    return z.status === 'live';
  }

  // The boss entry-requirements gate (lessons + projects + avg mastery).
  function bossRequirements(bossId) {
    try { return Store.bossReady(bossId); } catch (e) { return { ready: false }; }
  }
  function canOpenBoss(bossId) {
    if (qaOverride()) return true;
    try { return !!bossRequirements(bossId).ready || Store.isDone(bossId); } catch (e) { return false; }
  }

  // Enforcement predicate for App.openNode. Preserves v1.2.0 reachability exactly:
  // a boss can be reached whenever it is sequentially unlocked, already ready
  // (its own entry gate), or cleared — the boss view then shows its intro or the
  // requirements screen. Regular nodes use the sequential unlock, plus replay of
  // any completed node. QA mode opens anything valid.
  function canEnter(id) {
    if (!exists(id)) return false;
    if (qaOverride()) return true;
    const n = node(id);
    if (n && n.kind === 'boss') {
      try { return normalNodeRule(id) || !!bossRequirements(id).ready || Store.isDone(id); } catch (e) { return true; }
    }
    try { return normalNodeRule(id) || Store.isDone(id); } catch (e) { return normalNodeRule(id); }
  }

  function reason(id) { return exists(id) ? 'Locked — complete the earlier steps first.' : 'Content not found.'; }

  return { qaOverride, exists, canOpenNode, canOpenZone, canOpenBoss, canEnter, bossRequirements, reason };
})();
