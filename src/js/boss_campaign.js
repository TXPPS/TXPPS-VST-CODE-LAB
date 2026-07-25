/* ============================================================
   BossCampaign (v1.3.0) — the one authoritative registry of all seven
   zone bosses. Data only: no policy, no state, no side effects.

   IMPORTANT distinction this registry encodes:
   - Zones 1–4 are PRODUCTION BossKit encounters (definitionId 'bossN') that
     real learners fight via the boss route.
   - Zones 5–7 register a DEVELOPMENT BossKit encounter (definitionId
     'dev_bossN') that is QA-only. Real learners still fight those zone
     bosses through the untouched LEGACY encounter (legacyLearnerEncounter),
     which remains finished content. The development encounters are the
     future upgrade path and are never presented to learners as complete.
   ============================================================ */

const BossCampaign = (() => {
  function zone(n) { try { return ZONES.find((z) => z.num === n) || null; } catch (e) { return null; } }
  function zoneTitle(n) { const z = zone(n); return z ? z.title : ('Zone ' + n); }

  // Base, zone-agnostic shape assembled per zone below.
  const PRODUCTION = { 1: true, 2: true, 3: true, 4: true };  // Zones 1–4 are production encounters
  function bkdef(id) { try { return (typeof BossKit !== 'undefined') ? BossKit.def(id) : null; } catch (e) { return null; } }

  const REGISTRY = {};
  for (let n = 1; n <= 7; n++) {
    const production = !!PRODUCTION[n];
    const nodeId = 'boss' + n;
    const definitionId = production ? nodeId : ('dev_boss' + n);
    const def = bkdef(definitionId);
    REGISTRY[nodeId] = {
      id: nodeId,
      zoneId: 'z' + n,
      zoneNum: n,
      nodeId: nodeId,
      title: production ? ((def && def.name) || ('Zone ' + n + ' Boss')) : ('Zone ' + n + ' Boss'),
      subtitle: production ? ((def && def.subtitle) || zoneTitle(n)) : (zoneTitle(n) + ' — encounter in development'),
      theme: zoneTitle(n),
      status: production ? 'production' : 'development',
      implementationLevel: production ? (n === 1 ? 'reference' : 'production') : 'development',
      prerequisiteRule: 'zoneMastery',                       // lessons + missions done + avg mastery >= 2
      definitionId: definitionId,                            // the BossKit definition to instantiate
      introSequence: 'standard',
      phaseCount: 3,
      rewardId: 'zone' + n + '_clear',                       // the achievement a real learner victory grants
      completionRule: 'passNeed',                            // clear passNeed of N stages (owned by the runner)
      nextBossId: n < 7 ? ('boss' + (n + 1)) : null,
      accessibilityLabel: production
        ? ('Zone ' + n + ' boss — production encounter.')
        : ('Zone ' + n + ' boss — development encounter, QA only, not finished content.'),
      qaLaunchable: true,                                    // every boss can be launched from Owner QA
      learnerLaunchable: production,                         // only the production BossKit encounter is learner-facing
      legacyLearnerEncounter: !production,                   // zones 2–7: learners still fight the legacy boss
    };
  }
  REGISTRY.boss7.rewardId = 'graduate';                      // final boss additionally confers Graduate status

  const ORDER = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7'];

  return {
    ORDER,
    all() { return ORDER.map((id) => REGISTRY[id]); },
    get(id) { return REGISTRY[id] || null; },
    forZone(zoneId) { return ORDER.map((id) => REGISTRY[id]).find((b) => b.zoneId === zoneId) || null; },
    isProduction(id) { return !!(REGISTRY[id] && REGISTRY[id].status === 'production'); },
    isDevelopment(id) { return !!(REGISTRY[id] && REGISTRY[id].status === 'development'); },
  };
})();
