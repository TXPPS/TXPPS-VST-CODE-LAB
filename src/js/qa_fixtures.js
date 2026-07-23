/* ============================================================
   QaFixtures (v1.2.1) — validated QA test-profile presets.

   Presets are derived from the live curriculum (ZONES) at runtime — no
   duplicated node catalog. Each preset installs a labelled QA profile
   (Store.installQaProfile, which stashes the real learner profile) and
   then populates it through the REAL factories (Store.completeNode /
   Store.addXp), so the resulting state is always schema-valid and its
   stars / achievements obey the exact same rules as genuine play. QA
   simulation mode is turned OFF first so those writes actually land in
   the QA profile (this is deliberate persistent testing, not simulation).
   ============================================================ */

const QaFixtures = (() => {
  function liveZones() { try { return ZONES.filter((z) => z.status === 'live'); } catch (e) { return []; } }
  function kindOf(id) { try { return (Engine.NODES[id] || {}).kind; } catch (e) { return null; } }
  function allNodes() { return liveZones().flatMap((z) => z.nodeOrder || []); }

  // Node IDs to complete for each preset (data-driven from ZONES).
  function nodesFor(key) {
    const zones = liveZones();
    if (!zones.length) return [];
    switch (key) {
      case 'clean': return [];
      case 'zone1': return (zones[0].nodeOrder || []).filter((id) => kindOf(id) === 'lesson').slice(0, 3);
      case 'bossReady': return (zones[0].nodeOrder || []).filter((id) => kindOf(id) !== 'boss');
      case 'mid': return zones.slice(0, 3).flatMap((z) => z.nodeOrder || []);
      case 'allZones': return allNodes().filter((id) => id !== 'boss7');
      case 'grad': return allNodes();
      default: return [];
    }
  }

  const XP = { clean: 0, zone1: 120, bossReady: 420, mid: 1800, allZones: 5200, grad: 7200 };

  const PRESETS = [
    { key: 'clean', label: 'Clean profile', desc: 'Fresh QA profile, nothing completed — test first-run and early locks.' },
    { key: 'zone1', label: 'Zone 1 in progress', desc: 'First few Zone 1 lessons done — mid-zone mastery table.' },
    { key: 'bossReady', label: 'Zone 1 boss-ready', desc: 'All Zone 1 lessons/projects cleared — boss1 unlocked & ready.' },
    { key: 'mid', label: 'Mid-course', desc: 'Zones 1–3 fully cleared, including their bosses.' },
    { key: 'allZones', label: 'All zones accessible', desc: 'Everything cleared except the final boss — all content open.' },
    { key: 'grad', label: 'Graduation-ready', desc: 'Entire curriculum complete — Graduate status.' },
  ];

  function presets() { return PRESETS.slice(); }

  // Build (or rebuild) the QA profile for a preset. Deliberate, confirmed action.
  function create(key) {
    try { if (typeof QaAccess !== 'undefined') QaAccess.disableQa(); } catch (e) { /* ignore */ }   // writes must land
    const id = Store.installQaProfile({ displayName: 'TXPPS QA', username: 'txpps-qa' });
    const nodes = nodesFor(key);
    for (const nid of nodes) {
      if (!Engine.NODES[nid]) continue;
      Store.completeNode(nid, 1, 1);     // 3-star completion via the real factory (grants achievements)
    }
    const xp = XP[key] || 0;
    if (xp) Store.addXp(xp);
    try { Store.save(); } catch (e) { /* ignore */ }
    return { id, key, nodesCompleted: nodes.length };
  }

  return { presets, nodesFor, create };
})();
