/* ============================================================
   App — router, chrome (top bar / tab bar), XP + achievement
   notifications, and error-safe boot.
   ============================================================ */

const App = (() => {
  const { el } = UI;
  const root = document.getElementById('app');
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
    window.scrollTo({ top: 0 });
  }

  function openNode(id) {
    const node = Engine.NODES[id];
    if (!node) { UI.toast('Content not found'); return; }
    Sfx.tap();
    Store.setCurrentNode(id);
    if (node.kind === 'lesson') go('lesson', { id });
    else if (node.kind === 'project') go('project', { id });
    else if (node.kind === 'boss') go('boss', { id });
    else go('challenge', { id });
  }

  function awardXp(amount) {
    if (!amount || amount <= 0) { Store.touchStreak(); renderTopbar(); return; }
    const r = Store.addXp(amount);
    renderTopbar();
    if (r.leveledUp) {
      Sfx.levelUp();
      UI.toast('▲ LEVEL UP — LV ' + r.level + ': ' + Store.levelTitle(), 3200);
    }
    flushAchievements();
  }

  function flushAchievements() {
    const ids = Store.drainAchievements();
    ids.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) setTimeout(() => UI.toast('🏆 ' + a.name + ' — ' + a.desc, 3000), 400 + i * 3200);
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

  // First-launch identity screen — shown full-screen, without the app chrome.
  function showWelcome(mode) {
    if (screenEl) { screenEl.remove(); screenEl = null; }
    if (topbarEl) { topbarEl.remove(); topbarEl = null; }
    if (tabbarEl) { tabbarEl.remove(); tabbarEl = null; }
    document.querySelectorAll('.sheet-veil').forEach((v) => v.remove());
    const view = Views.welcome({
      mode: mode || 'first',
      onDone: () => { startAutosave(); reboot(); },
      onCancel: () => { reboot(); },
    });
    root.appendChild(view);
    window.scrollTo({ top: 0 });
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
      UI.toast('⚠ A save looked corrupted — we restored your previous backup. No progress lost.', 5200);
      Store.clearRecovered();
    }
  }

  function boot() {
    try {
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
      // cross-tab convergence: adopt a newer save written by another tab of the
      // same profile, so our autosave heartbeat can't overwrite it with stale state
      window.addEventListener('storage', (e) => {
        try { if (e.key && Store.adoptExternal(e.key)) renderTopbar(); } catch (err) { /* ignore */ }
      });

      applyCodeSize();
      applyMotion();
      if (Store.needsWelcome) { showWelcome('first'); return; }
      startAutosave();
      notifyIfRecovered();
      go('dashboard');
    } catch (err) {
      root.innerHTML = '';
      root.appendChild(el('div', { style: 'padding:24px; font-family:monospace; color:#EAE4D4' },
        el('div', { style: 'color:#F07862; letter-spacing:.14em; font-size:11px' }, 'BOOT ERROR'),
        el('p', { style: 'margin-top:10px; font-size:14px' }, 'TXPPS VST CODE LAB failed to start. Try reloading the page.'),
        el('pre', { style: 'margin-top:10px; font-size:11px; color:#A29D8F; overflow-x:auto' }, String(err && (err.stack || err.message) || err))));
    }
  }

  // public API (Views call these)
  return { go, openNode, awardXp, flushAchievements, applyCodeSize, applyMotion, showWelcome, reboot, boot };
})();

App.boot();
