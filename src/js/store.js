/* ============================================================
   Progress store — state, XP/levels/mastery/streak, persistence.
   localStorage is wrapped defensively: if unavailable (private
   browsing, sandbox), the app runs on an in-memory fallback.
   ============================================================ */

const Store = (() => {
  const KEY = 'txpps_vst_code_lab_v1';
  let memoryFallback = null;
  let storageOk = true;

  function defaults() {
    return {
      v: 1,
      xp: 0,
      nodes: {},          // nodeId -> {done, stars, attempts, firstTry, checks, step}
      weak: {},           // qid -> {nodeId, concept, misses, ts}
      streak: { count: 0, last: '' },
      daily: {},          // dateStr -> {qid, done, correct}
      dailyDone: 0,
      achievements: [],
      settings: { sound: true, motion: true, codeSize: 'm' },
      practiceCleared: 0,
      dictViewed: [],
      createdAt: new Date().toISOString(),
    };
  }

  /* ---- safe persistence ---- */
  function rawLoad() {
    try {
      const s = window.localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      storageOk = false;
      return memoryFallback ? JSON.parse(memoryFallback) : null;
    }
  }

  function rawSave(obj) {
    const json = JSON.stringify(obj);
    try {
      window.localStorage.setItem(KEY, json);
      storageOk = true;
    } catch (e) {
      storageOk = false;
      memoryFallback = json;
    }
  }

  // Merge loaded data over defaults so missing/renamed fields never crash.
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    const s = { ...d, ...raw };
    s.xp = Number.isFinite(s.xp) && s.xp >= 0 ? Math.floor(s.xp) : 0;
    s.nodes = (s.nodes && typeof s.nodes === 'object') ? s.nodes : {};
    s.weak = (s.weak && typeof s.weak === 'object') ? s.weak : {};
    s.daily = (s.daily && typeof s.daily === 'object') ? s.daily : {};
    s.streak = (s.streak && typeof s.streak === 'object') ? { count: s.streak.count | 0, last: String(s.streak.last || '') } : d.streak;
    s.achievements = Array.isArray(s.achievements) ? s.achievements.filter((a) => typeof a === 'string') : [];
    s.settings = { ...d.settings, ...(s.settings && typeof s.settings === 'object' ? s.settings : {}) };
    s.dailyDone = s.dailyDone | 0;
    s.practiceCleared = s.practiceCleared | 0;
    if (!['s', 'm', 'l'].includes(s.settings.codeSize)) s.settings.codeSize = 'm';
    s.dictViewed = Array.isArray(s.dictViewed) ? s.dictViewed.filter((x) => typeof x === 'string') : [];
    // deep-clean per-entry shapes so a hand-edited import can't poison renders
    const nodes = {};
    for (const [k, v] of Object.entries(s.nodes)) {
      if (v && typeof v === 'object') {
        nodes[k] = {
          done: !!v.done,
          stars: Math.max(0, Math.min(3, v.stars | 0)),
          attempts: Math.max(0, v.attempts | 0),
          firstTry: Math.max(0, v.firstTry | 0),
          checks: Math.max(0, v.checks | 0),
          step: Math.max(0, v.step | 0),
        };
      }
    }
    s.nodes = nodes;
    const weak = {};
    for (const [k, v] of Object.entries(s.weak)) {
      if (v && typeof v === 'object') {
        weak[k] = {
          nodeId: String(v.nodeId || ''),
          concept: String(v.concept || ''),
          misses: Math.max(0, v.misses | 0),
          ts: Number.isFinite(v.ts) ? v.ts : 0,
        };
      }
    }
    s.weak = weak;
    const daily = {};
    for (const [k, v] of Object.entries(s.daily)) {
      if (v && typeof v === 'object') {
        daily[k] = { qid: typeof v.qid === 'string' ? v.qid : null, done: !!v.done, correct: !!v.correct };
      }
    }
    s.daily = daily;
    return s;
  }

  let state = sanitize(rawLoad());

  function save() { rawSave(state); }

  /* ---- date helpers ---- */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function touchStreak() {
    const today = todayStr();
    const last = state.streak.last;
    if (last === today) return;
    if (last) {
      const diff = Math.round((new Date(today) - new Date(last)) / 86400000);
      state.streak.count = (diff === 1) ? state.streak.count + 1 : 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.last = today;
    if (state.streak.count >= 3) grant('hot_streak');
    if (state.streak.count >= 7) grant('studio_regular');
    save();
  }

  /* ---- XP & levels ---- */
  function level() {
    let lv = 1;
    for (let i = 0; i < LEVELS.length; i++) if (state.xp >= LEVELS[i]) lv = i + 1;
    return lv;
  }

  function levelTitle() { return LEVEL_TITLES[Math.min(level() - 1, LEVEL_TITLES.length - 1)]; }

  function levelProgress() {
    const lv = level();
    const base = LEVELS[lv - 1];
    const next = LEVELS[lv] !== undefined ? LEVELS[lv] : null;
    if (next === null) return { pct: 100, into: 0, span: 0, next: null };
    return { pct: Math.min(100, Math.round(((state.xp - base) / (next - base)) * 100)), into: state.xp - base, span: next - base, next };
  }

  function addXp(amount) {
    const before = level();
    state.xp += Math.max(0, Math.round(amount));
    if (state.xp >= 100) grant('signal_present');
    if (level() >= 5) grant('level_5');
    touchStreak();
    save();
    return { leveledUp: level() > before, level: level() };
  }

  /* ---- nodes ---- */
  function nodeState(id) {
    if (!state.nodes[id]) state.nodes[id] = { done: false, stars: 0, attempts: 0, firstTry: 0, checks: 0, step: 0 };
    return state.nodes[id];
  }

  function isDone(id) { return !!(state.nodes[id] && state.nodes[id].done); }

  // Concatenated node order across all live zones — unlock is
  // sequential through the whole curriculum.
  function liveOrder() {
    return ZONES.filter((z) => z.status === 'live').flatMap((z) => z.nodeOrder);
  }

  function zoneOfNode(nodeId) {
    return ZONES.find((z) => z.nodeOrder && z.nodeOrder.includes(nodeId)) || null;
  }

  // Sequential unlock. Everything before the first incomplete node is
  // replayable; the first incomplete node is next. (zoneId kept for
  // call-site compatibility; the walk is global.)
  function isUnlocked(zoneId, nodeId) {
    for (const id of liveOrder()) {
      if (id === nodeId) return true;
      if (!isDone(id)) return false;
    }
    return false;
  }

  function nextNode() {
    for (const id of liveOrder()) if (!isDone(id)) return id;
    return null;
  }

  function starsFor(firstTry, checks) {
    if (checks <= 0) return 1;
    const f = firstTry / checks;
    if (f >= 0.999) return 3;
    if (f >= 0.66) return 2;
    return 1;
  }

  function completeNode(id, firstTry, checks) {
    const ns = nodeState(id);
    const stars = starsFor(firstTry, checks);
    const firstCompletion = !ns.done;
    ns.done = true;
    ns.attempts += 1;
    ns.firstTry = firstTry;
    ns.checks = checks;
    ns.stars = Math.max(ns.stars, stars);
    ns.step = 0;
    const node = Engine.NODES[id];
    if (node) {
      if (node.kind === 'lesson') {
        grant('power_on');
        if (stars === 3) grant('clean_take');
      }
      if (id === 'p1') grant('gain_staged');
      if (id === 'p2') grant('osc_online');
      if (id === 'boss1') grant('zone1_clear');
      if (id === 'boss2') grant('zone2_clear');
      if (id === 'boss3') grant('zone3_clear');
      if (id === 'boss4') grant('zone4_clear');
      if (id === 'boss5') grant('zone5_clear');
      if (id === 'boss6') grant('zone6_clear');
      if (id === 'boss7') { grant('zone7_clear'); grant('graduate'); }
      if (['p3', 'p4', 'p5'].every(isDone)) grant('modern_hands');
      if (['p6', 'p7', 'p8'].every(isDone)) grant('first_signal');
      if (['p9', 'p10', 'p11'].every(isDone)) grant('first_sound');
      if (['p12', 'p13', 'p14', 'p15'].every(isDone)) grant('playable_synth');
      if (['p16', 'p17', 'p18', 'p19'].every(isDone)) grant('release_ready');
      if (['p20', 'p21', 'p22', 'p23', 'p24', 'p25', 'p26', 'p27', 'p28', 'p29', 'p30'].every(isDone)) grant('product_line');
      if (node.ctype === 'bugfix' && ['b1', 'b2', 'b3', 'b4'].every(isDone)) grant('bug_squasher');
      if (node.ctype === 'compiler' && ['e1', 'e2', 'e3'].every(isDone)) grant('error_reader');
    }
    save();
    return { stars, firstCompletion };
  }

  function setProjectStep(id, step) {
    nodeState(id).step = step;
    save();
  }

  /* ---- weak topics / practice ---- */
  function markWeak(qid, nodeId, concept) {
    const w = state.weak[qid] || { nodeId, concept, misses: 0, ts: 0 };
    w.misses += 1;
    w.ts = Date.now();
    w.concept = concept || w.concept;
    state.weak[qid] = w;
    save();
  }

  function clearWeak(qid) {
    if (state.weak[qid]) {
      delete state.weak[qid];
      state.practiceCleared += 1;
      save();
    }
  }

  function weakList() {
    return Object.entries(state.weak)
      .map(([qid, w]) => ({ qid, ...w }))
      .filter((w) => Engine.QINDEX[w.qid])
      .sort((a, b) => b.misses - a.misses || b.ts - a.ts);
  }

  function weakConcepts() {
    const counts = {};
    for (const w of weakList()) counts[w.concept] = (counts[w.concept] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ concept: c, n }));
  }

  /* ---- daily ---- */
  function dailyToday() {
    const t = todayStr();
    if (!state.daily[t]) {
      const qid = Engine.dailyQid(t);
      state.daily[t] = { qid, done: false, correct: false };
      save();
    }
    return { date: t, ...state.daily[t] };
  }

  function completeDaily(dateStr, correct) {
    const t = dateStr || todayStr();
    if (state.daily[t] && !state.daily[t].done) {
      state.daily[t].done = true;
      state.daily[t].correct = !!correct;
      state.dailyDone += 1;
      if (state.dailyDone >= 5) grant('daily_driver');
      save();
    }
  }

  /* ---- achievements ---- */
  let achQueue = [];
  function grant(id) {
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return;
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    achQueue.push(id);
    save();
  }
  function drainAchievements() { const q = achQueue; achQueue = []; return q; }

  /* ---- mastery ---- */
  function zoneLessons(zoneId) {
    const z = ZONES.find((zz) => zz.id === zoneId);
    if (!z || !z.nodeOrder) return [];
    return z.nodeOrder.filter((id) => Engine.NODES[id] && Engine.NODES[id].kind === 'lesson');
  }

  function zoneMastery(zoneId) {
    const lessons = zoneLessons(zoneId || 'z1');
    const doneLessons = lessons.filter(isDone);
    if (doneLessons.length === 0) return { pct: 0, avgStars: 0, doneLessons: 0, totalLessons: lessons.length };
    const totalStars = doneLessons.reduce((s, id) => s + (state.nodes[id].stars || 0), 0);
    const avg = totalStars / doneLessons.length;
    return {
      pct: Math.round((totalStars / (lessons.length * 3)) * 100),
      avgStars: avg,
      doneLessons: doneLessons.length,
      totalLessons: lessons.length,
    };
  }

  function bossReady(bossId) {
    const zone = zoneOfNode(bossId || 'boss1') || ZONES[0];
    const m = zoneMastery(zone.id);
    const lessonsDone = m.doneLessons === m.totalLessons;
    const projects = zone.nodeOrder.filter((id) => Engine.NODES[id] && Engine.NODES[id].kind === 'project');
    const projectsDone = projects.every(isDone);
    return { ready: lessonsDone && projectsDone && m.avgStars >= 2, lessonsDone, projectsDone, avgStars: m.avgStars, need: 2, totalLessons: m.totalLessons, totalProjects: projects.length, zoneNum: zone.num };
  }

  /* ---- settings / io ---- */
  function setSetting(k, v) { state.settings[k] = v; save(); }

  function markDictViewed(id) {
    if (!state.dictViewed.includes(id)) {
      state.dictViewed.push(id);
      save();
    }
  }

  function exportJson() { return JSON.stringify(state, null, 2); }

  function importJson(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'That isn\'t valid JSON — paste the exact text from Export Progress.' }; }
    if (!obj || typeof obj !== 'object' || typeof obj.xp !== 'number') {
      return { ok: false, error: 'That JSON doesn\'t look like TXPPS progress data (missing xp field).' };
    }
    state = sanitize(obj);
    save();
    return { ok: true };
  }

  function reset() {
    state = defaults();
    try { window.localStorage.removeItem(KEY); } catch (e) { /* fallback mode */ }
    memoryFallback = null;
    save();
  }

  return {
    get state() { return state; },
    get storageOk() { return storageOk; },
    save, todayStr, touchStreak,
    level, levelTitle, levelProgress, addXp,
    nodeState, isDone, isUnlocked, nextNode, liveOrder, zoneOfNode, completeNode, setProjectStep, starsFor,
    markWeak, clearWeak, weakList, weakConcepts,
    dailyToday, completeDaily,
    grant, drainAchievements,
    zoneMastery, bossReady,
    setSetting, markDictViewed, exportJson, importJson, reset,
  };
})();
