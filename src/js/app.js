/* ============================================================
   App — router, chrome (top bar / tab bar), XP + achievement
   notifications, and error-safe boot.
   ============================================================ */

const App = (() => {
  const { el } = UI;
  const root = document.getElementById('app');
  const EV = GameBus.EVENTS;
  function emitG(t, p) { try { GameBus.emit(t, p); } catch (e) { /* game layer is decorative */ } }
  let current = { name: 'dashboard', params: {} };
  let topbarEl = null;
  let tabbarEl = null;
  let screenEl = null;

  const SCREENS = {
    dashboard: () => Views.dashboard(),
    map: () => Views.map(),
    lesson: (p) => Views.lesson(p),
    challenge: (p) => Views.challenge(p),
    project: (p) => Views.project(p),
    boss: (p) => Views.boss(p),
    practice: () => Views.practice(),
    practiceRun: () => Views.practiceRun(),
    daily: () => Views.daily(),
    glossary: () => Views.glossary(),
    profile: () => Views.profile(),
    settings: () => Views.settings(),
  };

  const TABS = [
    { name: 'dashboard', label: 'HOME', icon: 'home' },
    { name: 'map', label: 'MAP', icon: 'map' },
    { name: 'practice', label: 'PRACTICE', icon: 'practice' },
    { name: 'glossary', label: 'GLOSSARY', icon: 'glossary' },
    { name: 'profile', label: 'PROFILE', icon: 'profile' },
  ];
  // which tab is highlighted for sub-screens
  const TAB_OF = {
    dashboard: 'dashboard', daily: 'dashboard',
    map: 'map', lesson: 'map', challenge: 'map', project: 'map', boss: 'map',
    practice: 'practice', practiceRun: 'practice',
    glossary: 'glossary',
    profile: 'profile', settings: 'profile',
  };

  function renderTopbar() {
    const lv = Store.level();
    const lp = Store.levelProgress();
    const st = Store.state;
    const bar = el('div', { class: 'topbar' },
      el('div', { class: 'brand' }, el('span', { class: 'led' }), el('span', null, 'TXPPS '), el('b', null, 'VST CODE LAB')),
      el('div', { class: 'topbar-right' },
        st.streak.count > 0 ? el('span', { class: 'streak-chip', 'aria-label': st.streak.count + ' day streak' }, '◆ ' + st.streak.count + 'd') : null,
        el('div', { class: 'xp-chip' },
          el('span', { class: 'lvl' }, 'LV ' + lv),
          el('div', { class: 'vu', 'aria-label': 'XP progress to next level' }, el('i', { style: 'width:' + lp.pct + '%' })),
          el('span', { class: 'tnum' }, st.xp + 'xp'))));
    if (topbarEl) topbarEl.replaceWith(bar); else root.appendChild(bar);
    topbarEl = bar;
  }

  function renderTabbar() {
    const active = TAB_OF[current.name] || '';
    const inner = el('div', { class: 'tabbar-inner' });
    TABS.forEach((t) => {
      inner.appendChild(el('button', {
        class: 'tab' + (t.name === active ? ' on' : ''),
        'aria-label': t.label,
        'aria-current': t.name === active ? 'page' : null,
        onclick: () => { Sfx.tap(); go(t.name); },
      }, UI.icon(t.icon), el('span', null, t.label)));
    });
    const bar = el('nav', { class: 'tabbar', 'aria-label': 'Main navigation' }, inner);
    if (tabbarEl) tabbarEl.replaceWith(bar); else root.appendChild(bar);
    tabbarEl = bar;
  }

  function go(name, params) {
    if (!SCREENS[name]) name = 'dashboard';
    const from = current.name;
    emitG(EV.NAVIGATION_SELECTED, { from, to: name });
    try { Game.onRoute(); } catch (e) { /* decorative */ }   // cancel stale reactions/dialogue
    // cleanup old screen (scope canvas raf etc.)
    if (screenEl) {
      screenEl.querySelectorAll('.scope-wrap').forEach((sw) => { if (sw.cleanup) sw.cleanup(); });
      screenEl.remove();
      screenEl = null;
    }
    document.querySelectorAll('.sheet-veil').forEach((v) => v.remove());
    current = { name, params: params || {} };
    let view;
    try {
      view = SCREENS[name](current.params);
    } catch (err) {
      view = el('div', { class: 'main' },
        el('div', { class: 'card col', style: 'gap:10px' },
          el('div', { class: 'eyebrow red' }, 'SCREEN ERROR'),
          el('p', { class: 'small dim' }, 'This screen hit an unexpected error. Your progress is safe.'),
          el('pre', { class: 'mono small faint', style: 'overflow-x:auto' }, String(err && err.message || err)),
          el('button', { class: 'btn primary', onclick: () => go('dashboard') }, 'Back to dashboard')));
    }
    renderTopbar();
    screenEl = view;
    root.insertBefore(view, tabbarEl);
    renderTabbar();
    // lift PATCH clear of a screen's sticky Check/Continue action bar
    document.body.classList.toggle('has-actionbar', ['lesson', 'challenge', 'project', 'boss'].includes(name));
    window.scrollTo({ top: 0 });
    emitG(EV.NAVIGATION_COMPLETED, { from, to: name });
  }

  function openNode(id) {
    const node = Engine.NODES[id];
    if (!node) { UI.toast('Content not found'); return; }
    Sfx.tap();
    Store.setCurrentNode(id);
    const z = Store.zoneOfNode(id);
    emitG(EV.LESSON_ENTERED, { nodeId: id, kind: node.kind, zoneId: z ? z.id : null });
    if (node.kind === 'lesson') go('lesson', { id });
    else if (node.kind === 'project') go('project', { id });
    else if (node.kind === 'boss') go('boss', { id });
    else go('challenge', { id });
  }

  function awardXp(amount) {
    if (!amount || amount <= 0) { Store.touchStreak(); renderTopbar(); return; }
    const before = Store.level();
    const r = Store.addXp(amount);
    renderTopbar();
    emitG(EV.XP_GAINED, { xp: amount, total: Store.state.xp });
    if (r.leveledUp) {
      Sfx.levelUp();
      emitG(EV.RANK_UP, { from: before, to: r.level, level: r.level, rank: Store.levelTitle() });
      UI.toast('▲ LEVEL UP — LV ' + r.level + ': ' + Store.levelTitle(), 3200);
    }
    flushAchievements();
  }

  function flushAchievements() {
    const ids = Store.drainAchievements();
    ids.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) { emitG(EV.ACHIEVEMENT_UNLOCKED, { achievementId: id, name: a.name }); setTimeout(() => UI.toast('🏆 ' + a.name + ' — ' + a.desc, 3000), 400 + i * 3200); }
    });
  }

  function applyCodeSize() {
    const size = Store.state.settings.codeSize;
    document.body.classList.toggle('code-s', size === 's');
    document.body.classList.toggle('code-l', size === 'l');
  }

  function applyMotion() {
    document.body.classList.toggle('reduce-motion', !Store.state.settings.motion);
  }

  // Autosave heartbeat (belt-and-suspenders — every mutation already saves).
  let autosaveTimer = null;
  function startAutosave() {
    if (autosaveTimer) return;
    autosaveTimer = setInterval(() => { try { Store.save(); } catch (e) { /* keep running */ } }, 30000);
  }
  function stopAutosave() { if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; } }

  // First-launch / migration setup is a TRUE modal overlay: the app shell renders
  // behind it, but the overlay (mounted on <body>, not the app flow) blocks all
  // interaction, locks background scroll, and traps focus until setup completes.
  let overlayEl = null;
  function mountOverlay(card) {
    unmountOverlay();
    const veil = el('div', { class: 'welcome-overlay' }, card);
    document.body.appendChild(veil);
    document.body.classList.add('modal-open');
    overlayEl = veil;
    const focusables = () => Array.from(veil.querySelectorAll('input,textarea,button,[tabindex]:not([tabindex="-1"])')).filter((n) => !n.disabled && n.offsetParent !== null);
    const f0 = focusables()[0];
    if (f0) { try { f0.focus(); } catch (e) { /* ignore */ } setTimeout(() => { try { if (!veil.contains(document.activeElement)) f0.focus(); } catch (e) { /* ignore */ } }, 40); }
    veil._onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); return; }   // setup cannot be dismissed
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (!veil.contains(document.activeElement)) { e.preventDefault(); a.focus(); return; } // pull focus back in
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    veil._onFocus = (e) => { if (!veil.contains(e.target)) { const f = focusables()[0]; if (f) { try { f.focus(); } catch (x) { /* ignore */ } } } };
    document.addEventListener('keydown', veil._onKey, true);
    document.addEventListener('focusin', veil._onFocus, true);
    return veil;
  }
  function unmountOverlay() {
    if (overlayEl) {
      if (overlayEl._onKey) document.removeEventListener('keydown', overlayEl._onKey, true);
      if (overlayEl._onFocus) document.removeEventListener('focusin', overlayEl._onFocus, true);
      overlayEl.remove(); overlayEl = null;
    }
    document.body.classList.remove('modal-open');
  }

  function showWelcome() {
    go('dashboard');                                            // render the app shell behind the overlay
    mountOverlay(Views.welcome({ onDone: () => { unmountOverlay(); startAutosave(); reboot(); } }));
  }
  function showMigrationChooser() {
    go('dashboard');
    mountOverlay(Views.migrationChooser({ onDone: () => { unmountOverlay(); startAutosave(); reboot(); } }));
  }

  // Re-apply the active profile's settings and return to the dashboard
  // (used after switching, creating, importing, or resetting a profile).
  function reboot() {
    applyCodeSize();
    applyMotion();
    notifyIfRecovered();
    go('dashboard');
    flushAchievements();
  }

  // Recovery from a corrupted save can happen on boot OR mid-session (switching
  // to / deleting into a profile whose current save was corrupt) — announce it
  // everywhere, not just at boot, per the "notify the learner" requirement.
  function notifyIfRecovered() {
    if (Store.recovered) {
      emitG(EV.STORAGE_RECOVERED, { severity: 'info' });
      UI.toast('⚠ A save looked corrupted — we restored your previous backup. No progress lost.', 5200);
      Store.clearRecovered();
    }
  }

  function boot() {
    try {
      emitG(EV.APPLICATION_BOOT_STARTED, {});
      try { Game.init(); } catch (e) { /* the game-feel layer must never block boot */ }
      // tap-to-define: abbreviations in prose open their dictionary card
      document.addEventListener('click', (e) => {
        const tl = e.target.closest && e.target.closest('.term-link');
        if (tl) { e.preventDefault(); e.stopPropagation(); Sfx.tap(); Dict.open(tl.dataset.term); }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const tl = e.target.closest && e.target.closest('.term-link');
        if (tl) { e.preventDefault(); Dict.open(tl.dataset.term); }
      });
      // capture progress the moment the tab is hidden or closed
      window.addEventListener('pagehide', () => { try { Store.save(); } catch (e) { /* ignore */ } });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { Store.save(); } catch (e) { /* ignore */ } } });
      // cross-tab convergence for the single profile: adopt a newer save, adopt a
      // profile another tab just created (closing our setup overlay), or return to
      // first-launch if another tab reset the profile out from under us.
      window.addEventListener('storage', (e) => {
        try {
          const action = Store.syncTab(e.key);
          if (action === 'reset') { stopAutosave(); showWelcome(); }
          else if (action === 'created') { unmountOverlay(); startAutosave(); reboot(); }
          else if (action === 'adopt') { renderTopbar(); }
        } catch (err) { /* ignore */ }
      });

      applyCodeSize();
      applyMotion();
      emitG(EV.OFFLINE_READY, {});
      if (Store.pendingMigration) { showMigrationChooser(); return; }   // rare: several 1.0.1 profiles
      if (Store.needsWelcome) { showWelcome(); return; }
      startAutosave();
      notifyIfRecovered();
      go('dashboard');
      emitG(EV.APPLICATION_READY, { profileId: Store.state && Store.state.id });
    } catch (err) {
      root.innerHTML = '';
      root.appendChild(el('div', { style: 'padding:24px; font-family:monospace; color:#EAE4D4' },
        el('div', { style: 'color:#F07862; letter-spacing:.14em; font-size:11px' }, 'BOOT ERROR'),
        el('p', { style: 'margin-top:10px; font-size:14px' }, 'TXPPS VST CODE LAB failed to start. Try reloading the page.'),
        el('pre', { style: 'margin-top:10px; font-size:11px; color:#A29D8F; overflow-x:auto' }, String(err && (err.stack || err.message) || err))));
    }
  }

  // public API (Views call these)
  return { go, openNode, awardXp, flushAchievements, applyCodeSize, applyMotion, showWelcome, showMigrationChooser, reboot, boot };
})();

App.boot();
