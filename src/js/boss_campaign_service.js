/* ============================================================
   BossCampaignService (v1.3.0) — the campaign authority: boss lookup,
   sequencing, availability, campaign progress, idempotent victory
   observation, and safe session persistence.

   It defers to AccessPolicy (who may open a boss), ProgressionPolicy
   (whether anything permanent may be written), and the existing Store
   completion state (the real campaign progress). It holds NO scattered
   qaMode checks and NEVER writes learner progression itself — real
   rewards stay in the encounter's completeNode path. Invalid ids fail
   safely (null / false).
   ============================================================ */

const BossCampaignService = (() => {
  const SESSION_KEY = 'txpps_boss_session';
  const SESSION_V = 1;

  function bus(t, p) { try { if (typeof GameBus !== 'undefined') GameBus.emit(t, p); } catch (e) { /* decorative */ } }
  function reg(id) { try { return BossCampaign.get(id); } catch (e) { return null; } }
  function qaActive() { try { return typeof AccessPolicy !== 'undefined' && AccessPolicy.qaOverride(); } catch (e) { return false; } }
  function persistOk() { try { return (typeof ProgressionPolicy === 'undefined') || ProgressionPolicy.shouldPersist(); } catch (e) { return true; } }
  function isDone(id) { try { return Store.isDone(id); } catch (e) { return false; } }

  /* ---- lookups ---- */
  function getBossById(id) { return reg(id); }
  function getBossForZone(zoneId) { try { return BossCampaign.forZone(zoneId); } catch (e) { return null; } }
  function listBosses() { try { return BossCampaign.all(); } catch (e) { return []; } }
  function getImplementationStatus(id) { const b = reg(id); return b ? b.status : 'unknown'; }
  function getNextBoss(id) { const b = reg(id); return (b && b.nextBossId) ? reg(b.nextBossId) : null; }
  function getPreviousBoss(id) {
    const b = reg(id); if (!b) return null;
    const prev = BossCampaign.all().find((x) => x.nextBossId === id);
    return prev || null;
  }

  /* ---- availability & launch (defers to AccessPolicy) ---- */
  // Real-learner access to the boss NODE, ignoring any QA override.
  function learnerCanOpenBoss(nodeId) {
    try { return !!Store.bossReady(nodeId).ready || Store.isDone(nodeId); } catch (e) { return false; }
  }
  function getBossAvailability(id) {
    const b = reg(id);
    if (!b) return { valid: false, learner: false, qa: false, status: 'unknown', reason: 'unknown boss' };
    const learner = !!b.learnerLaunchable && learnerCanOpenBoss(b.nodeId);
    const qa = !!b.qaLaunchable && qaActive();
    return {
      valid: true, status: b.status, development: b.status === 'development',
      learner, qa,
      completed: isDone(b.nodeId),
      reason: b.status === 'development' ? 'development encounter — QA only' : (learner ? 'available' : 'zone not yet mastered'),
    };
  }
  function canLaunchBoss(id, opts) {
    const b = reg(id);
    if (!b) return false;
    const qa = !!(opts && opts.qa);
    if (qa) return !!b.qaLaunchable && qaActive();
    return !!b.learnerLaunchable && learnerCanOpenBoss(b.nodeId);
  }

  /* ---- campaign progress (read-only over real completion state) ---- */
  function getCampaignProgress() {
    const all = listBosses();
    const cleared = all.filter((b) => isDone(b.nodeId)).map((b) => b.id);
    return {
      total: all.length,
      clearedCount: cleared.length,
      cleared,
      graduate: isDone('boss7'),
      productionCount: all.filter((b) => b.status === 'production').length,
      developmentCount: all.filter((b) => b.status === 'development').length,
    };
  }

  /* ---- idempotent victory observation ----
     Does NOT award or persist anything (the encounter's completeNode owns real
     rewards). It emits the campaign-level victory event and, only for a genuine
     non-QA production completion, the campaign-completed event when the final
     boss is cleared. Emitting twice is harmless — nothing is granted here. ---- */
  function recordCampaignVictory(id, ctx) {
    const b = reg(id); if (!b) return { ok: false };
    const qa = qaActive() || !!(ctx && ctx.qa) || b.status !== 'production';
    bus('BOSS_VICTORY_RECORDED', { bossId: b.id, zoneId: b.zoneId, qa: qa, development: b.status === 'development' });
    if (!qa && persistOk() && b.id === 'boss7' && isDone('boss7')) {
      bus('BOSS_CAMPAIGN_COMPLETED', { total: getCampaignProgress().total });
    }
    return { ok: true, qa: qa };
  }
  function recordCampaignDefeat(id, ctx) {
    const b = reg(id); if (!b) return { ok: false };
    bus('BOSS_DEFEAT_RECORDED', { bossId: b.id, zoneId: b.zoneId, qa: qaActive() || b.status !== 'production' });
    return { ok: true };
  }

  /* ---- session persistence (separate key; production, non-QA only) ---- */
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function isProductionDef(defId) {
    try { return typeof BossKit !== 'undefined' && BossKit.has(defId) && !BossKit.isDevelopment(defId); } catch (e) { return false; }
  }
  // Persist a lightweight resume record — ONLY for a production encounter and only
  // when real writes are allowed (never during QA). Temporary visual/haptic/QA
  // state is never stored.
  function saveCampaignSession(rec) {
    if (!rec || !isProductionDef(rec.defId) || !persistOk() || qaActive()) return false;
    const clean = {
      schema: 'txpps.boss.session', v: SESSION_V,
      defId: String(rec.defId), nodeId: String(rec.nodeId || ''),
      questionIndex: rec.questionIndex | 0, correctCount: rec.correctCount | 0,
      firstTryCount: rec.firstTryCount | 0, incorrectCount: rec.incorrectCount | 0,
      earned: rec.earned | 0,
    };
    return lsSet(SESSION_KEY, JSON.stringify(clean));
  }
  // Return a valid production session for `defId`, else null (discarding anything
  // malformed, version-mismatched, QA/development, or for another boss).
  function restoreCampaignSession(defId) {
    const raw = lsGet(SESSION_KEY);
    if (!raw) return null;
    let rec; try { rec = JSON.parse(raw); } catch (e) { clearCampaignSession(); return null; }
    if (!rec || rec.schema !== 'txpps.boss.session' || rec.v !== SESSION_V) { clearCampaignSession(); return null; }
    if (!isProductionDef(rec.defId)) { clearCampaignSession(); return null; }
    if (defId && rec.defId !== defId) return null;                 // a different boss's session — leave it
    if (typeof rec.questionIndex !== 'number' || rec.questionIndex < 0) { clearCampaignSession(); return null; }
    return rec;
  }
  function clearCampaignSession() { lsDel(SESSION_KEY); }

  function openCampaign(source) { bus('BOSS_CAMPAIGN_OPENED', { source: source || 'qa' }); }

  return {
    getBossById, getBossForZone, listBosses, getImplementationStatus,
    getNextBoss, getPreviousBoss,
    getBossAvailability, canLaunchBoss, getCampaignProgress,
    recordCampaignVictory, recordCampaignDefeat,
    saveCampaignSession, restoreCampaignSession, clearCampaignSession,
    openCampaign,
  };
})();
