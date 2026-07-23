/* ============================================================
   Progress store — state, XP/levels/mastery/streak, persistence.
   localStorage is wrapped defensively: if unavailable (private
   browsing, sandbox), the app runs on an in-memory fallback.
   ============================================================ */

const Store = (() => {
  const LEGACY_KEY = 'txpps_vst_code_lab_v1';   // the pre-1.0.1 single save
  const INDEX_KEY = 'txpps_profiles_v1';        // registry of local profiles
  const SAVE_V = 2;
  const pKey = (id) => 'txpps_profile_' + id;   // a profile's current save
  const bKey = (id) => 'txpps_profile_' + id + '_bak'; // its previous save (backup)

  // Curated offline avatar set — emoji only, no uploads, no network.
  const AVATARS = ['🎹', '🎛️', '🎚️', '🎧', '🎸', '🎺', '🥁', '🎤', '🔊', '⚡', '🌊', '🔥', '🌀', '💾', '📼', '🎶'];

  let storageOk = true;
  let memory = {};        // key -> json string, used when localStorage is blocked
  let activeId = null;
  let needsWelcome = false;
  let recoveredFlag = false;
  let state;              // active profile: flat identity + progress + settings

  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  // FNV-1a 32-bit — a tiny dependency-free integrity checksum for corruption detection.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }
  function newId() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function cleanName(s) { return String(s == null ? '' : s).replace(/[\x00-\x1f]/g, '').trim().slice(0, 40); }
  function cleanUser(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24); }

  function identityDefaults() {
    return { displayName: 'Producer', username: 'producer', avatar: AVATARS[0], bio: '', createdAt: nowIso(), lastPlayed: nowIso() };
  }

  /* ---- low-level storage, with an in-memory fallback when blocked ----
     `memory` holds only keys whose latest write could NOT reach localStorage
     (quota/private mode). Reads prefer it so a value written this session is
     always visible; a later successful write clears it so localStorage becomes
     authoritative again. rawLocalGet() bypasses memory to probe what actually
     persisted to disk (used by the atomic migration confirm). */
  function lsGet(key) { if (key in memory) return memory[key]; try { return window.localStorage.getItem(key); } catch (e) { storageOk = false; return null; } }
  function lsSet(key, val) { try { window.localStorage.setItem(key, val); storageOk = true; delete memory[key]; return true; } catch (e) { storageOk = false; memory[key] = val; return false; } }
  function lsDel(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } delete memory[key]; }
  function rawLocalGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }

  /* ---- versioned save envelope + checksum ---- */
  function pack(data) { const body = JSON.stringify(data); return JSON.stringify({ schema: 'txpps.profile', v: SAVE_V, sum: hash(body), data: data }); }
  function unpack(raw) {
    if (!raw) return null;
    let env; try { env = JSON.parse(raw); } catch (e) { return null; }
    if (!env || typeof env !== 'object' || env.schema !== 'txpps.profile' || !env.data || typeof env.data !== 'object') return null;
    if (env.sum !== undefined && hash(JSON.stringify(env.data)) !== env.sum) return null; // corrupt
    return env.data;
  }

  /* ---- atomic double-buffered write: current save + previous backup ---- */
  function writeProfile(id, data) {
    const raw = pack(data);
    const cur = lsGet(pKey(id));
    if (cur && unpack(cur)) lsSet(bKey(id), cur);  // only ever promote a *valid* prior save to backup
    lsSet(pKey(id), raw);                           // setItem is all-or-nothing per key — never a partial overwrite
  }
  function readProfile(id) {
    const data = unpack(lsGet(pKey(id)));
    if (data) return { data, recovered: false };
    const bak = unpack(lsGet(bKey(id)));            // current missing/corrupt -> restore the backup
    if (bak) { lsSet(pKey(id), pack(bak)); return { data: bak, recovered: true }; }
    return { data: null, recovered: false };
  }

  /* ---- profile index (which profiles exist, which is active) ---- */
  function readIndex() {
    const raw = lsGet(INDEX_KEY);
    if (!raw) return null;
    let idx; try { idx = JSON.parse(raw); } catch (e) { return null; }
    if (!idx || idx.schema !== 'txpps.index' || !Array.isArray(idx.ids)) return null;
    return idx;
  }
  function writeIndex(idx) { lsSet(INDEX_KEY, JSON.stringify(idx)); }

  function readLegacy() {
    const raw = lsGet(LEGACY_KEY);
    if (!raw) return null;
    try { const o = JSON.parse(raw); return (o && typeof o === 'object') ? o : null; } catch (e) { return null; }
  }

  function freshState() { return Object.assign(defaults(), identityDefaults(), { v: SAVE_V, id: null, currentNode: null }); }

  // Merge & clean identity fields on top of the existing progress sanitizer.
  function sanitizeFull(raw) {
    const s = sanitize(raw);
    const idn = identityDefaults();
    s.displayName = cleanName(raw && raw.displayName) || idn.displayName;
    s.username = cleanUser(raw && raw.username) || idn.username;
    s.avatar = (raw && typeof raw.avatar === 'string' && raw.avatar) ? raw.avatar : idn.avatar;
    s.bio = (raw && typeof raw.bio === 'string') ? raw.bio.slice(0, 280) : '';
    s.createdAt = (raw && typeof raw.createdAt === 'string' && raw.createdAt) ? raw.createdAt : idn.createdAt;
    s.lastPlayed = (raw && typeof raw.lastPlayed === 'string' && raw.lastPlayed) ? raw.lastPlayed : idn.lastPlayed;
    s.currentNode = (raw && typeof raw.currentNode === 'string') ? raw.currentNode : null;
    s.id = (raw && raw.id) || activeId || null;
    s.v = SAVE_V;
    return s;
  }

  // One-time migration: an existing single-save learner becomes a local profile
  // with every field of progress preserved and a default identity attached.
  function migrate() {
    let idx = readIndex();
    if (idx && idx.ids.length) {
      if (!idx.ids.includes(idx.activeId)) idx.activeId = idx.ids[0];
      return idx;
    }
    const legacy = readLegacy();
    if (legacy) {
      const id = newId();
      const data = Object.assign(freshState(), sanitize(legacy), {
        id, displayName: 'Producer', username: 'producer', avatar: AVATARS[0], bio: '',
        createdAt: (typeof legacy.createdAt === 'string' && legacy.createdAt) ? legacy.createdAt : nowIso(),
        lastPlayed: nowIso(), v: SAVE_V,
      });
      writeProfile(id, data);
      idx = { schema: 'txpps.index', v: 1, activeId: id, ids: [id], migratedFromLegacy: true };
      // ATOMIC migration. Commit the index and retire the legacy key ONLY once the
      // new profile is confirmed on DISK (not merely the in-memory fallback). If the
      // profile write hit quota, keep the index in memory for this session and leave
      // the legacy save authoritative, so the next launch re-migrates it instead of
      // being permanently shadowed by a half-committed index.
      if (unpack(rawLocalGet(pKey(id)))) {
        writeIndex(idx);
        if (rawLocalGet(INDEX_KEY)) lsDel(LEGACY_KEY);   // drop legacy only after the index is on disk too
      } else {
        memory[INDEX_KEY] = JSON.stringify(idx);          // session-only; reload re-migrates from the intact legacy save
      }
      return idx;
    }
    return null;
  }

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

  (function initState() {
    const idx = migrate();
    if (idx) {
      activeId = idx.activeId;
      let r = readProfile(activeId);
      if (!r.data) {                       // active profile unreadable — try any other, else fall through to welcome
        const alt = idx.ids.find((pid) => readProfile(pid).data);
        if (alt) { activeId = alt; idx.activeId = alt; writeIndex(idx); r = readProfile(alt); }
      }
      if (r.data) { state = sanitizeFull(r.data); recoveredFlag = r.recovered; }
      else { state = freshState(); activeId = null; needsWelcome = true; }
    } else {
      state = freshState();                // truly first launch — no profile, no legacy save
      needsWelcome = true;
    }
  })();

  function save() {
    if (!activeId) return;                 // welcome pending — nothing to persist yet
    state.lastPlayed = nowIso();
    state.id = activeId;
    writeProfile(activeId, state);
  }

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

  function setCurrentNode(id) {
    if (!state || state.currentNode === id) return;
    state.currentNode = id;
    save();
  }

  /* ---- portable, human-readable export / import ---- */
  function buildExport(data) {
    return {
      schema: 'txpps.profile.export', v: SAVE_V, app: 'TXPPS VST CODE LAB', exportedAt: nowIso(),
      profile: { displayName: data.displayName, username: data.username, avatar: data.avatar, bio: data.bio, createdAt: data.createdAt },
      progress: {
        xp: data.xp, nodes: data.nodes, achievements: data.achievements, weak: data.weak,
        streak: data.streak, daily: data.daily, dailyDone: data.dailyDone,
        practiceCleared: data.practiceCleared, dictViewed: data.dictViewed, currentNode: data.currentNode,
      },
      settings: data.settings,
    };
  }
  function exportProfile(id) {
    const src = (id === activeId) ? state : (readProfile(id).data);
    if (!src) return '';
    return JSON.stringify(buildExport(sanitizeFull(src)), null, 2);
  }
  function exportJson() { return exportProfile(activeId); }

  function coerceImport(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.schema === 'txpps.profile.export' && obj.progress && typeof obj.progress === 'object') {
      return Object.assign({}, obj.progress, obj.settings ? { settings: obj.settings } : {}, obj.profile || {});
    }
    if (obj.schema === 'txpps.profile' && obj.data && typeof obj.data === 'object') return obj.data;
    if (typeof obj.xp === 'number') return obj;  // legacy flat save
    return null;
  }
  function importProfileText(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'That isn\'t valid JSON — paste the exact text you exported.' }; }
    const flat = coerceImport(obj);
    if (!flat) return { ok: false, error: 'That JSON doesn\'t look like a TXPPS profile (no progress found).' };
    const id = createProfile({
      displayName: flat.displayName || 'Imported learner',
      username: flat.username || ('learner' + newId().slice(-4)),
      avatar: flat.avatar || AVATARS[0], bio: flat.bio || '',
    });
    const merged = sanitizeFull(Object.assign({}, flat, {
      id, displayName: state.displayName, username: state.username, avatar: state.avatar, bio: state.bio,
      createdAt: (typeof flat.createdAt === 'string' && flat.createdAt) ? flat.createdAt : state.createdAt,
      lastPlayed: nowIso(),
    }));
    state = merged; save();
    return { ok: true, id };
  }
  function importJson(text) { return importProfileText(text); }

  function reset() {
    if (!activeId) { state = freshState(); return; }
    const keep = { displayName: state.displayName, username: state.username, avatar: state.avatar, bio: state.bio, createdAt: state.createdAt };
    state = Object.assign(freshState(), keep, { id: activeId, lastPlayed: nowIso() });
    save();
  }

  /* ---- profile registry operations ---- */
  function profileMeta(id) {
    const src = (id === activeId) ? state : (readProfile(id).data);
    if (!src) return null;
    const s = (id === activeId) ? state : sanitizeFull(src);
    const order = liveOrder();
    const done = order.filter((x) => s.nodes[x] && s.nodes[x].done).length;
    let lv = 1; for (let i = 0; i < LEVELS.length; i++) if (s.xp >= LEVELS[i]) lv = i + 1;
    return {
      id, displayName: s.displayName, username: s.username, avatar: s.avatar, bio: s.bio,
      xp: s.xp, level: lv, rank: LEVEL_TITLES[Math.min(lv - 1, LEVEL_TITLES.length - 1)],
      completion: order.length ? Math.round((done / order.length) * 100) : 0, doneCount: done, total: order.length,
      graduate: !!(s.nodes['boss7'] && s.nodes['boss7'].done),
      achievements: Array.isArray(s.achievements) ? s.achievements.length : 0,
      createdAt: s.createdAt, lastPlayed: s.lastPlayed, active: id === activeId,
    };
  }
  function listProfiles() {
    const idx = readIndex();
    if (!idx) return activeId ? [profileMeta(activeId)].filter(Boolean) : [];
    return idx.ids.map(profileMeta).filter(Boolean);
  }
  function createProfile(identity) {
    if (activeId) save();
    const id = newId();
    state = Object.assign(freshState(), {
      id,
      displayName: cleanName(identity && identity.displayName) || 'Producer',
      username: cleanUser(identity && identity.username) || ('user' + id.slice(-4)),
      avatar: (identity && identity.avatar) || AVATARS[0],
      bio: String((identity && identity.bio) || '').slice(0, 280),
      createdAt: nowIso(), lastPlayed: nowIso(),
    });
    activeId = id;
    writeProfile(id, state);
    const idx = readIndex() || { schema: 'txpps.index', v: 1, activeId: id, ids: [] };
    if (!idx.ids.includes(id)) idx.ids.push(id);
    idx.activeId = id;
    writeIndex(idx);
    needsWelcome = false;
    return id;
  }
  function switchProfile(id) {
    if (id === activeId) return true;
    const idx = readIndex();
    if (!idx || !idx.ids.includes(id)) return false;
    if (activeId) save();
    const r = readProfile(id);
    if (!r.data) return false;
    activeId = id; state = sanitizeFull(r.data); recoveredFlag = r.recovered;
    idx.activeId = id; writeIndex(idx); needsWelcome = false;
    return true;
  }
  function editProfile(id, patch) {
    patch = patch || {};
    const apply = (d) => {
      if (patch.displayName !== undefined) d.displayName = cleanName(patch.displayName) || d.displayName;
      if (patch.username !== undefined) d.username = cleanUser(patch.username) || d.username;
      if (patch.avatar !== undefined && patch.avatar) d.avatar = patch.avatar;
      if (patch.bio !== undefined) d.bio = String(patch.bio || '').slice(0, 280);
      return d;
    };
    if (id === activeId) { apply(state); save(); return true; }
    const r = readProfile(id);
    if (!r.data) return false;
    const d = apply(sanitizeFull(r.data)); d.id = id;
    writeProfile(id, d);
    return true;
  }
  function deleteProfile(id) {
    const idx = readIndex();
    if (!idx || !idx.ids.includes(id)) return { ok: false };
    idx.ids = idx.ids.filter((x) => x !== id);
    lsDel(pKey(id)); lsDel(bKey(id));
    let switchedTo = null;
    if (id === activeId) {
      const alt = idx.ids.find((pid) => readProfile(pid).data);   // first READABLE profile, not blindly ids[0]
      if (alt) {
        const r = readProfile(alt);
        activeId = alt; state = sanitizeFull(r.data); recoveredFlag = recoveredFlag || r.recovered;
        idx.activeId = alt; switchedTo = alt;
      } else {
        activeId = null; idx.activeId = null; state = freshState(); needsWelcome = true;
      }
    }
    writeIndex(idx);
    return { ok: true, switchedTo, needsWelcome };
  }

  // Cross-tab convergence: when another tab writes THIS tab's active profile,
  // adopt the newer save so our next autosave can't clobber it with stale state.
  function adoptExternal(key) {
    if (!activeId || key !== pKey(activeId)) return false;
    const d = unpack(rawLocalGet(pKey(activeId)));
    if (!d) return false;
    state = sanitizeFull(d);
    return true;
  }

  return {
    get state() { return state; },
    get storageOk() { return storageOk; },
    get needsWelcome() { return needsWelcome; },
    get activeId() { return activeId; },
    get recovered() { return recoveredFlag; },
    clearRecovered() { recoveredFlag = false; },
    AVATARS,
    save, todayStr, touchStreak,
    level, levelTitle, levelProgress, addXp,
    nodeState, isDone, isUnlocked, nextNode, liveOrder, zoneOfNode, completeNode, setProjectStep, starsFor,
    markWeak, clearWeak, weakList, weakConcepts,
    dailyToday, completeDaily,
    grant, drainAchievements,
    zoneMastery, bossReady,
    setSetting, markDictViewed, setCurrentNode,
    exportJson, importJson, exportProfile, importProfileText, reset,
    listProfiles, profileMeta, createProfile, switchProfile, editProfile, deleteProfile, adoptExternal,
  };
})();
