/* ============================================================
   QaUi (v1.2.1) — the owner-facing QA surface: the persistent QA
   indicator, the hidden owner-access entry + passphrase dialog, the
   authorized Owner QA panel, and the Curriculum Inspector (with boss /
   PATCH / haptic inspection). Everything is local and offline.

   It never echoes the passphrase anywhere, drives the REAL BossKit /
   PATCH / Haptic systems (no parallel fakes), and degrades safely — if
   QaAccess is absent the owner entry simply does nothing.
   ============================================================ */

const QaUi = (() => {
  const el = UI.el;
  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }
  function authed() { return safe(() => typeof QaAccess !== 'undefined' && QaAccess.isAuthorized()) || false; }
  function qaOn() { return safe(() => typeof QaAccess !== 'undefined' && QaAccess.qaMode()) || false; }
  function toast(m, ms) { safe(() => UI.toast(m, ms)); }
  function nodeKind(id) { return safe(() => (Engine.NODES[id] || {}).kind) || ''; }
  function nodeTitle(id) { return safe(() => (Engine.NODES[id] || {}).title) || id; }

  /* ---------- persistent QA indicator ---------- */
  let indicator = null, patchAcked = false;
  function mountIndicator() {
    if (indicator) return;
    const status = el('span', { role: 'status', 'aria-live': 'polite', class: 'qa-ind-text' }, '');
    const exit = el('button', { class: 'qa-ind-exit', 'aria-label': 'Exit QA mode', onclick: () => { safe(() => QaAccess.disableQa()); } }, 'Exit');
    indicator = el('div', { class: 'qa-indicator', 'data-qa': 'indicator' },
      el('span', { class: 'qa-dot', 'aria-hidden': 'true' }),
      status, exit);
    document.body.appendChild(indicator);
    indicator._status = status;
    refreshIndicator();
  }
  function refreshIndicator() {
    const on = qaOn();
    document.body.classList.toggle('qa-active', on);
    if (indicator && indicator._status) indicator._status.textContent = on ? 'QA MODE — progression & rewards are simulated' : '';
    if (on && !patchAcked) { patchAcked = true; safe(() => Game.Patch.say && Game.Patch.say('QA mode. Nothing you do here is saved.', 2600)); }
    if (!on) patchAcked = false;
  }

  /* ---------- generic accessible overlay ---------- */
  function mountPanel(contentEl, opts) {
    opts = opts || {};
    const prevFocus = document.activeElement;
    const card = el('div', { class: 'qa-panel-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || 'QA panel' }, contentEl);
    const veil = el('div', { class: 'qa-panel-veil' }, card);
    document.body.appendChild(veil);
    document.body.classList.add('modal-open');
    const focusables = () => Array.from(card.querySelectorAll('input,textarea,select,button,[tabindex]:not([tabindex="-1"])')).filter((n) => !n.disabled && n.offsetParent !== null);
    const f0 = focusables()[0]; if (f0) safe(() => f0.focus());
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (!card.contains(document.activeElement)) { e.preventDefault(); a.focus(); return; }
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey, true);
      veil.remove();
      if (!document.querySelector('.qa-panel-veil')) document.body.classList.remove('modal-open');
      safe(() => opts.onClose && opts.onClose());
      safe(() => prevFocus && prevFocus.focus && prevFocus.focus());
    }
    return { close, card };
  }

  /* ---------- hidden owner entry: 5 activations within a window ---------- */
  function attachOwnerEntry(row) {
    if (!row || typeof QaAccess === 'undefined') return row;
    let count = 0, timer = null;
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', 'Application version. Activate five times to open owner access.');
    const bump = () => {
      count += 1;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { count = 0; }, 3000);
      if (count >= 5) { count = 0; if (timer) clearTimeout(timer); openAccessDialog(); }
    };
    row.addEventListener('click', bump);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(); } });
    return row;
  }

  /* ---------- owner access (passphrase) dialog ---------- */
  function openAccessDialog() {
    if (typeof QaAccess === 'undefined') return;
    safe(() => GameBus.emit('OWNER_ACCESS_OPENED', {}));
    if (authed()) { toast('Owner access already unlocked.'); return; }
    let shown = false;
    const input = el('input', { type: 'password', class: 'qa-input', id: 'qa-pass', 'aria-label': 'Owner passphrase', 'aria-describedby': 'qa-pass-err', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const err = el('div', { class: 'qa-err', id: 'qa-pass-err', role: 'alert', 'aria-live': 'assertive' }, '');
    const showBtn = el('button', { type: 'button', class: 'btn sm ghost', 'aria-pressed': 'false', onclick: () => { shown = !shown; input.type = shown ? 'text' : 'password'; showBtn.setAttribute('aria-pressed', String(shown)); showBtn.textContent = shown ? 'Hide' : 'Show'; input.focus(); } }, 'Show');
    const submit = () => {
      const cd = safe(() => QaAccess.cooldownMs()) || 0;
      if (cd > 0) { err.textContent = 'Too many attempts — wait ' + Math.ceil(cd / 1000) + 's and try again.'; return; }
      const val = input.value; input.value = '';
      QaAccess.verify(val).then((r) => {
        if (r && r.ok) { panel.close(); toast('Owner access unlocked.'); App.go('settings'); }
        else if (r && r.cooldownMs > 0) { err.textContent = 'Too many attempts — locked for ' + Math.ceil(r.cooldownMs / 1000) + 's.'; }
        else { err.textContent = 'That passphrase was not accepted.'; input.focus(); }
      });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    const content = el('div', { class: 'qa-dialog col' },
      el('div', { class: 'eyebrow phos' }, 'OWNER ACCESS'),
      el('p', { class: 'small dim' }, 'Enter the owner passphrase to reveal local QA tools. This is a local access gate — not account security — and works entirely offline on this device. Your passphrase is never stored or sent anywhere.'),
      el('div', { class: 'row', style: 'gap:8px; align-items:center' }, input, showBtn),
      err,
      el('div', { class: 'row', style: 'gap:8px; margin-top:6px' },
        el('button', { class: 'btn primary', onclick: submit }, 'Unlock QA Mode'),
        el('button', { class: 'btn ghost', onclick: () => panel.close() }, 'Cancel')));
    const panel = mountPanel(content, { label: 'Owner access' });
  }

  /* ---------- owner QA panel (rendered into Settings when authorized) ---------- */
  function ownerPanel() {
    if (!authed()) return null;
    const statusLine = el('div', { class: 'small', role: 'status', 'aria-live': 'polite' }, '');
    function refresh() {
      const on = qaOn();
      statusLine.textContent = (Store.isQaProfile ? 'Active profile: TXPPS QA (test profile). ' : '')
        + (on ? 'QA MODE ON — access to all content is open; progress & rewards are simulated (not saved).' : 'QA MODE OFF — normal progression rules apply.');
    }
    refresh();   // the Enable/Disable buttons below call refresh() directly; no persistent
                 // subscription here so re-rendering Settings never leaks GameBus handlers.

    const inspectionCard = el('div', { class: 'card col', style: 'gap:8px' },
      el('div', { class: 'eyebrow phos' }, 'OWNER QA — INSPECTION'),
      statusLine,
      el('div', { class: 'row wrap', style: 'gap:8px' },
        el('button', { class: 'btn sm', onclick: () => { safe(() => QaAccess.enableQa()); refresh(); toast('QA mode enabled.'); } }, 'Enable QA Mode'),
        el('button', { class: 'btn sm ghost', onclick: () => { safe(() => QaAccess.disableQa()); refresh(); toast('QA mode disabled.'); } }, 'Disable QA Mode'),
        el('button', { class: 'btn sm', onclick: () => openInspector() }, 'Open Curriculum Inspector'),
        el('button', { class: 'btn sm', onclick: () => openCampaign() }, 'Boss Campaign'),
        el('button', { class: 'btn sm ghost', onclick: () => openHapticPanel() }, 'Haptic diagnostics'),
        el('button', { class: 'btn sm ghost', onclick: () => openPatchPanel() }, 'PATCH state preview')));

    const dangerCard = el('div', { class: 'card col', style: 'gap:8px' },
      el('div', { class: 'eyebrow red' }, 'OWNER QA — TEST DATA (mutates local data)'),
      el('p', { class: 'small faint' }, 'These change local storage on this device. Your real profile is stashed and restorable while a QA test profile is active.'),
      el('div', { class: 'row wrap', style: 'gap:8px' },
        el('button', { class: 'btn sm', onclick: () => openFixtures() }, 'Create QA Test Profile'),
        Store.isQaProfile ? el('button', { class: 'btn sm amber', onclick: () => restoreReal() }, 'Restore real profile') : null,
        el('button', { class: 'btn sm ghost', onclick: () => { safe(() => QaAccess.disableQa()); refresh(); toast('QA session reset — simulation off.'); } }, 'Reset Current QA Session')));

    const lockCard = el('div', { class: 'card col', style: 'gap:8px' },
      el('div', { class: 'eyebrow' }, 'OWNER ACCESS'),
      el('p', { class: 'small faint' }, 'Locking clears owner access for this browser session and turns QA mode off. Access never persists across a browser restart.'),
      el('button', { class: 'btn danger sm', onclick: () => { safe(() => QaAccess.lock()); toast('Owner access locked.'); App.go('settings'); } }, 'Lock Owner Access'));

    return el('div', { class: 'col', style: 'gap:12px' }, inspectionCard, dangerCard, lockCard);
  }

  function restoreReal() {
    UI.confirmSheet('RESTORE REAL PROFILE', 'This removes the QA test profile and restores your stashed real profile (or returns to first-launch if none was stashed). QA progress in the test profile is discarded.', 'Restore', () => {
      const r = safe(() => Store.restoreRealProfile());
      safe(() => QaAccess.disableQa());
      if (r && r.welcome) { App.showWelcome(); } else { App.reboot(); }
      toast(r && r.restored ? 'Real profile restored.' : 'Returned to first-launch.');
    }, true);
  }

  /* ---------- QA test-profile fixtures ---------- */
  function openFixtures() {
    const list = safe(() => QaFixtures.presets()) || [];
    const rows = list.map((p) => el('button', { class: 'qa-list-row', onclick: () => {
      panel.close();   // close first so the confirm sheet is not hidden behind this panel
      UI.confirmSheet('CREATE QA TEST PROFILE', 'This stashes your real profile and installs a labelled "TXPPS QA" test profile preset: ' + p.label + '. ' + p.desc + ' You can restore your real profile afterwards.', 'Create ' + p.label, () => {
        const r = safe(() => QaFixtures.create(p.key));
        App.reboot();
        toast('QA profile created: ' + p.label + (r ? ' (' + r.nodesCompleted + ' nodes)' : ''));
      }, false);
    } }, el('div', { style: 'text-align:left; min-width:0' }, el('div', { class: 'small' }, p.label), el('div', { class: 'mono small faint' }, p.desc))));
    const content = el('div', { class: 'qa-scroll col', style: 'gap:8px' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'CREATE QA TEST PROFILE'), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      el('p', { class: 'small faint' }, 'Each preset installs a validated "TXPPS QA" profile built with the real completion factories. Your real profile is stashed first.'),
      ...rows);
    const panel = mountPanel(content, { label: 'Create QA test profile' });
  }

  /* ---------- Curriculum Inspector ---------- */
  function realStatus(id) {
    if (safe(() => Store.isDone(id))) return 'done';
    if (safe(() => Store.isUnlocked((Store.zoneOfNode(id) || {}).id || '', id))) return 'unlocked';
    return 'locked';
  }
  function openInspector() {
    const zones = safe(() => ZONES.filter((z) => z.status === 'live')) || [];
    const state = { q: '', zone: 'all', kind: 'all', status: 'all' };
    const listWrap = el('div', { class: 'qa-scroll col', style: 'gap:10px', role: 'list', 'aria-label': 'Curriculum nodes' });

    function nodeCard(id) {
      const node = Engine.NODES[id]; if (!node) return null;
      const rs = realStatus(id);
      const badge = el('span', { class: 'qa-badge ' + rs }, rs.toUpperCase());
      const qaBadge = el('span', { class: 'qa-badge qa' }, 'QA: OPEN');
      const kindBadge = el('span', { class: 'qa-badge kind' }, (node.kind || 'node').toUpperCase());
      const actions = el('div', { class: 'row wrap', style: 'gap:6px; margin-top:6px' },
        el('button', { class: 'btn sm', onclick: () => { safe(() => QaAccess.enableQa()); panel.close(); App.openNode(id); } }, 'Open (QA)'),
        el('button', { class: 'btn sm ghost', onclick: () => { safe(() => QaAccess.disableQa()); panel.close(); App.openNode(id); } }, 'Open normally'),
        el('button', { class: 'btn sm ghost', onclick: () => copyId(id) }, 'Copy ID'),
        el('button', { class: 'btn sm ghost', onclick: () => prereqSheet(id) }, 'Prereqs'),
        node.kind === 'boss' ? el('button', { class: 'btn sm amber', onclick: () => bossSim(id) }, 'Simulate') : null);
      return el('div', { class: 'qa-node', role: 'listitem' },
        el('div', { class: 'row between', style: 'align-items:flex-start; gap:8px' },
          el('div', { style: 'min-width:0' },
            el('div', { class: 'small', style: 'font-weight:600' }, node.title),
            el('div', { class: 'mono small faint' }, id)),
          el('div', { class: 'row wrap', style: 'gap:4px; justify-content:flex-end' }, kindBadge, badge, qaBadge)),
        actions);
    }

    function render() {
      const q = state.q.trim().toLowerCase();
      listWrap.replaceChildren();
      let shown = 0;
      zones.forEach((z, zi) => {
        if (state.zone !== 'all' && state.zone !== z.id) return;
        const matches = (z.nodeOrder || []).filter((id) => {
          const node = Engine.NODES[id]; if (!node) return false;
          if (state.kind !== 'all' && node.kind !== state.kind) return false;
          if (state.status !== 'all' && realStatus(id) !== state.status) return false;
          if (q && !((node.title || '').toLowerCase().includes(q) || id.toLowerCase().includes(q))) return false;
          return true;
        });
        if (!matches.length) return;
        listWrap.appendChild(el('div', { class: 'eyebrow', style: 'margin-top:4px' }, 'ZONE ' + (z.num || (zi + 1)) + ' — ' + z.title));
        matches.forEach((id) => { const c = nodeCard(id); if (c) { listWrap.appendChild(c); shown += 1; } });
      });
      if (!shown) listWrap.appendChild(el('p', { class: 'small faint', style: 'padding:12px 0' }, 'No nodes match these filters.'));
    }

    const search = el('input', { class: 'qa-input', type: 'search', placeholder: 'Search title or node ID…', 'aria-label': 'Search curriculum' });
    search.addEventListener('input', () => { state.q = search.value; render(); });
    function seg(label, key, options) {
      const sel = el('select', { class: 'qa-select', 'aria-label': label });
      options.forEach(([v, l]) => sel.appendChild(el('option', { value: v }, l)));
      sel.addEventListener('change', () => { state[key] = sel.value; render(); });
      return el('label', { class: 'qa-filter' }, el('span', { class: 'mono small faint' }, label), sel);
    }
    const filters = el('div', { class: 'qa-filters row wrap', style: 'gap:8px' },
      seg('Zone', 'zone', [['all', 'All']].concat(zones.map((z) => [z.id, 'Z' + (z.num || '')]))),
      seg('Type', 'kind', [['all', 'All'], ['lesson', 'Lesson'], ['challenge', 'Challenge'], ['project', 'Project'], ['boss', 'Boss']]),
      seg('Status', 'status', [['all', 'All'], ['locked', 'Locked'], ['unlocked', 'Unlocked'], ['done', 'Done']]),
      el('button', { class: 'btn sm ghost', onclick: () => { state.q = ''; state.zone = 'all'; state.kind = 'all'; state.status = 'all'; search.value = ''; [...filters.querySelectorAll('select')].forEach((s) => { s.value = 'all'; }); render(); } }, 'Clear'));

    const header = el('div', { class: 'qa-insp-head col', style: 'gap:8px' },
      el('div', { class: 'row between' },
        el('div', { class: 'eyebrow phos' }, 'CURRICULUM INSPECTOR'),
        el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      el('p', { class: 'small faint' }, 'Real learner status is shown per node; "Open (QA)" opens it under QA mode (nothing saved), "Open normally" respects real locks.'),
      search, filters);
    const content = el('div', { class: 'qa-insp col', style: 'gap:10px' }, header, listWrap);
    render();
    const panel = mountPanel(content, { label: 'Curriculum inspector' });
  }

  function copyId(id) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(id); } catch (e) { /* ignore */ }
    toast('Node ID copied: ' + id);
  }

  function prereqSheet(id) {
    const node = Engine.NODES[id];
    const rows = [];
    if (node && node.kind === 'boss') {
      const r = safe(() => Store.bossReady(id)) || {};
      rows.push(el('div', { class: 'small' }, 'Boss entry (real): ' + (r.ready ? 'READY' : 'NOT READY')));
      rows.push(el('div', { class: 'small dim' }, 'Lessons done: ' + (r.lessonsDone ? 'yes' : 'no') + ' · Missions done: ' + (r.projectsDone ? 'yes' : 'no') + ' · Avg mastery: ' + (r.avgStars != null ? r.avgStars.toFixed(1) : '?') + ' (need ' + (r.need || 2) + ')'));
    } else {
      const order = safe(() => Store.liveOrder()) || [];
      const idx = order.indexOf(id);
      const blocking = order.slice(0, idx).filter((x) => !Store.isDone(x));
      rows.push(el('div', { class: 'small' }, 'Sequential unlock: ' + (blocking.length ? blocking.length + ' earlier node(s) still incomplete' : 'all earlier nodes complete')));
      if (blocking.length) rows.push(el('div', { class: 'mono small faint' }, 'Next blocking: ' + blocking[0] + ' — ' + nodeTitle(blocking[0])));
    }
    const content = el('div', { class: 'qa-scroll col', style: 'gap:8px' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'PREREQUISITES'), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      el('div', { class: 'small mono faint' }, id + ' · ' + (node ? node.kind : '?')),
      ...rows,
      el('div', { class: 'qa-note', role: 'note' }, 'Under QA mode this node opens regardless of the above.'));
    const panel = mountPanel(content, { label: 'Prerequisites' });
  }

  /* ---------- Boss campaign — all seven bosses ---------- */
  function statusBadge(status) {
    const cls = status === 'production' ? 'done' : (status === 'development' ? 'unlocked' : 'locked');
    return el('span', { class: 'qa-badge ' + cls }, String(status || '?').toUpperCase());
  }
  function openCampaign() {
    safe(() => BossCampaignService.openCampaign('qa'));
    const bosses = safe(() => BossCampaignService.listBosses()) || [];
    const cards = bosses.map((b) => {
      const av = safe(() => BossCampaignService.getBossAvailability(b.id)) || {};
      const sess = safe(() => BossCampaignService.restoreCampaignSession(b.definitionId));
      const info = el('div', { class: 'mono small faint' },
        'zone ' + b.zoneNum + ' · ' + b.definitionId
        + ' · learner: ' + (av.learner ? 'yes' : 'no')
        + ' · real done: ' + (av.completed ? 'yes' : 'no')
        + ' · QA: ' + (av.qa ? 'launchable' : 'enable QA')
        + ' · session: ' + (sess ? ('stage ' + (sess.questionIndex + 1)) : 'none'));
      return el('div', { class: 'qa-node', role: 'listitem' },
        el('div', { class: 'row between', style: 'align-items:flex-start; gap:8px' },
          el('div', { style: 'min-width:0' },
            el('div', { class: 'small', style: 'font-weight:600' }, b.title),
            el('div', { class: 'mono small faint' }, b.id)),
          statusBadge(b.status)),
        b.status === 'development' ? el('div', { class: 'dev-banner', role: 'note' }, 'DEVELOPMENT ENCOUNTER — QA ONLY') : null,
        info,
        el('div', { class: 'row wrap', style: 'gap:6px; margin-top:6px' },
          el('button', { class: 'btn sm', onclick: () => bossConsole(b) }, 'Console'),
          el('button', { class: 'btn sm amber', onclick: () => { safe(() => QaAccess.enableQa()); panel.close(); launchEncounter(b); } }, 'Launch (QA)')));
    });
    const content = el('div', { class: 'qa-scroll col', style: 'gap:10px', role: 'list', 'aria-label': 'Boss campaign' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'BOSS CAMPAIGN'), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      el('p', { class: 'small faint' }, 'All seven zone bosses. Zone 1 is the production encounter; Zones 2–7 are development encounters (QA only) that run the real BossKit. Console drives the state machine deterministically; Launch opens the real encounter under QA. Nothing here records rewards.'),
      ...cards);
    const panel = mountPanel(content, { label: 'Boss campaign' });
  }

  function launchEncounter(b) {
    if (b.status === 'development') App.go('boss', { id: b.nodeId, campaign: b.definitionId });
    else App.openNode(b.nodeId);
  }

  // Per-boss console — feeds deterministic commands into the REAL BossKit session.
  function bossConsole(b) {
    const defId = b.definitionId;
    const development = b.status === 'development';
    if (typeof BossKit === 'undefined' || !BossKit.has(defId)) { toast('No BossKit definition for ' + defId); return; }
    const phases = (safe(() => BossKit.def(defId).phases)) || [];
    let session = BossKit.createSession(defId);
    if (!session) { toast('Encounter data unavailable for ' + defId); return; }
    const base = session.snapshot;   // static maxHp/maxIntegrity/defeatLine/total/passNeed
    const snap = el('pre', { class: 'qa-snap mono small', 'aria-live': 'polite' }, '');
    const show = () => {
      const s = session.snapshot;
      snap.textContent = 'state: ' + session.state + '\nphase: ' + (s.phase ? s.phase.id : '-') + '\n' + s.maxHp + ' stages · repair line ' + s.defeatLine + ' · pass ' + s.passNeed
        + '\nboss HP: ' + s.bossHp + '/' + s.maxHp + '\nintegrity: ' + s.playerIntegrity + '/' + s.maxIntegrity
        + '\ncorrect: ' + s.correctCount + '  wrong: ' + s.incorrectCount + '  q: ' + s.questionIndex + '/' + s.total;
    };
    const terminal = () => ['VICTORY', 'DEFEAT', 'COMPLETE'].includes(session.state);
    const reset = () => { session = BossKit.createSession(defId); show(); };
    const ensure = () => { if (session.state === 'READY') { session.enter(); session.start(); } };
    const step = (res) => { ensure(); session.resolve(res); session.advance(); show(); };
    const drive = (cor, wr) => {
      reset(); session.enter(); session.start();
      let c = cor, w = wr;
      while ((c > 0 || w > 0) && !terminal()) { const correct = c > 0; if (correct) c--; else w--; session.resolve({ correct: correct, firstTry: true }); session.advance(); }
      show();
    };
    const corToPhase = (p) => (p <= 0 ? 0 : Math.max(0, base.maxHp - (phases[p - 1] ? phases[p - 1].until : 0)));
    const b1 = (label, fn, cls) => el('button', { class: 'btn sm ' + (cls || 'ghost'), onclick: () => fn() }, label);
    const content = el('div', { class: 'qa-scroll col', style: 'gap:8px' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'CONSOLE — ' + b.id), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      development ? el('div', { class: 'dev-banner', role: 'note' }, 'DEVELOPMENT ENCOUNTER — QA ONLY') : null,
      el('p', { class: 'small faint' }, 'Drives the real BossKit for ' + defId + '. Semantic BOSS_* events fire (PATCH / audio / haptics react). No rewards recorded.'),
      snap,
      el('div', { class: 'qa-grid' },
        b1('Launch Intro', () => { reset(); session.enter(); show(); }),
        b1('Start Encounter', () => { if (session.state === 'INTRO') { session.start(); show(); } else { ensure(); show(); } }),
        b1('Jump Phase 1', () => drive(corToPhase(0), 0)),
        b1('Jump Phase 2', () => drive(corToPhase(1), 0)),
        b1('Jump Phase 3', () => drive(corToPhase(2), 0)),
        b1('Set Low Boss HP', () => drive(base.passNeed, 0)),
        b1('Set Low Integrity', () => drive(0, Math.max(0, base.maxIntegrity - 1))),
        b1('Simulate Correct', () => step({ correct: true, firstTry: true })),
        b1('Simulate Wrong', () => step({ correct: false })),
        b1('Trigger Victory', () => drive(base.total, 0), 'amber'),
        b1('Trigger Defeat', () => drive(0, base.maxIntegrity), 'amber'),
        b1('Retry', () => { reset(); safe(() => session.restartEvent && session.restartEvent()); }),
        b1('Reset', () => reset())),
      el('button', { class: 'btn sm block', onclick: () => { safe(() => QaAccess.enableQa()); panel.close(); launchEncounter(b); } }, 'Launch real encounter (QA)'));
    reset();
    const panel = mountPanel(content, { label: 'Boss console', onClose: () => safe(() => Game.Reactions && Game.Reactions.cancelRoute()) });
  }

  // Back-compat: the inspector's per-node "Simulate" opens the campaign console.
  function bossSim(bossId) {
    const b = safe(() => BossCampaignService.getBossById(bossId));
    if (b) return bossConsole(b);
    toast('No campaign entry for ' + bossId);
  }

  /* ---------- PATCH state preview (real state machine) ---------- */
  function openPatchPanel() {
    const states = safe(() => Game.Patch.states()) || [];
    const rows = states.map((s) => el('button', { class: 'qa-list-row', onclick: () => { safe(() => Game.Patch.setState(s, { dur: 4000 })); toast('PATCH → ' + s); } }, el('span', { class: 'small mono' }, s)));
    const content = el('div', { class: 'qa-scroll col', style: 'gap:8px' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'PATCH STATE PREVIEW'), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      el('p', { class: 'small faint' }, 'Previews the real PATCH state machine (v1.1.1 geometry). Previews auto-clear when you close this panel; no dialogue seen-flags are consumed.'),
      el('div', { class: 'qa-grid' }, ...rows));
    const panel = mountPanel(content, { label: 'PATCH state preview', onClose: () => safe(() => Game.Patch.toIdle()) });
  }

  /* ---------- Haptic diagnostics (real Haptic director) ---------- */
  function openHapticPanel() {
    const cats = safe(() => Object.keys(Game.Haptic.CATEGORIES)) || [];
    const d = safe(() => Game.Haptic.diagnostics()) || {};
    const diagLine = el('div', { class: 'small dim' }, 'adapter: ' + (d.adapter || '?') + ' · supported: ' + (!!d.supported) + ' · enabled: ' + (!!d.enabled) + ' · status: ' + (d.status || '?'));
    const rows = cats.map((c) => {
      const result = el('span', { class: 'mono small faint', style: 'margin-left:auto' }, '');
      return el('button', { class: 'qa-list-row', onclick: () => {
        const dd = safe(() => Game.Haptic.diagnostics()) || {};
        if (!dd.supported) { result.textContent = 'unsupported'; return; }
        if (!dd.enabled) { result.textContent = 'disabled'; return; }
        const ok = safe(() => Game.Haptic.trigger(c));
        result.textContent = ok ? 'delivered' : 'suppressed (cooldown)';
      } }, el('span', { class: 'small mono' }, c), result);
    });
    const content = el('div', { class: 'qa-scroll col', style: 'gap:8px' },
      el('div', { class: 'row between' }, el('div', { class: 'eyebrow phos' }, 'HAPTIC DIAGNOSTICS'), el('button', { class: 'btn sm ghost', onclick: () => panel.close() }, 'Close')),
      diagLine,
      el('p', { class: 'small faint' }, 'Fires each semantic category through the real Haptic director and reports the honest result. Never claims delivery when the device is unsupported.'),
      ...rows);
    const panel = mountPanel(content, { label: 'Haptic diagnostics' });
  }

  /* ---------- init ---------- */
  function init() {
    if (typeof QaAccess === 'undefined') return;
    safe(() => QaAccess.init());
    mountIndicator();
    safe(() => {
      GameBus.on('QA_MODE_ENABLED', refreshIndicator);
      GameBus.on('QA_MODE_DISABLED', refreshIndicator);
      GameBus.on('OWNER_ACCESS_LOCKED', refreshIndicator);
    });
    refreshIndicator();
  }

  return { init, attachOwnerEntry, ownerPanel, openAccessDialog, openInspector, refreshIndicator, isAuthorized: authed };
})();
