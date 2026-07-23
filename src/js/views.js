/* ============================================================
   Views — every screen + the shared question runner.
   All views are functions returning a DOM element; App handles
   routing, the top bar and the tab bar.
   ============================================================ */

const Views = (() => {
  const { el, fmt } = UI;
  const emitG = (t, p) => { try { GameBus.emit(t, p); } catch (e) { /* decorative game layer */ } };
  const REPEAT_THRESHOLD = 2;   // wrong attempts on one question before a diagnostic-hint nudge

  /* =====================================================================
     QUESTION RUNNER — one component for all 7 interaction types.
     opts: { onResolved({correct, firstTry, revealed, attempts}),
             onWrongAttempt(), maxAttempts (default: unlimited w/ reveal
             offered after 2 wrong), allowReveal (default true) }
     ===================================================================== */
  const PRAISE = ['Correct — clean take', 'Correct — nailed it', 'Correct — that\'s the one', 'Correct — locked in', 'Correct — right on'];
  function praiseFor(q) { return PRAISE[Engine.seedFrom(q.qid || q.prompt || 'x') % PRAISE.length]; }

  function questionView(q, opts) {
    opts = opts || {};
    const maxAttempts = opts.maxAttempts || Infinity;
    const allowReveal = opts.allowReveal !== false;
    let attempts = 0;
    let resolved = false;
    const qctx = () => ({ questionId: q.qid, nodeId: (Store.state && Store.state.currentNode) || null, qType: q.type });

    const root = el('div', { class: 'col', style: 'gap:12px' });
    const feedbackSlot = el('div', { 'aria-live': 'polite' });
    const controls = el('div', { class: 'col', style: 'gap:10px' });
    emitG('QUESTION_PRESENTED', qctx());

    function resolve(correct, revealed) {
      if (resolved) return;
      resolved = true;
      if (correct) {
        emitG('ANSWER_SUBMITTED', Object.assign(qctx(), { attempt: attempts, correct: true }));
        emitG(attempts > 1 ? 'ANSWER_CORRECT_AFTER_RETRY' : 'ANSWER_CORRECT', Object.assign(qctx(), { attempt: attempts, previousAttempts: attempts - 1 }));
      }
      if (opts.onResolved) opts.onResolved({ correct, firstTry: correct && attempts === 1, revealed: !!revealed, attempts });
    }

    function showFeedback(kind, head, body) {
      feedbackSlot.replaceChildren(
        el('div', { class: 'feedback ' + kind },
          el('div', { class: 'fb-head' }, head),
          el('div', { html: fmt(body || '') })));
      feedbackSlot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function wrongFlow(customMsg) {
      attempts += 1;
      Sfx.wrong();
      emitG('ANSWER_SUBMITTED', Object.assign(qctx(), { attempt: attempts, correct: false }));
      emitG('ANSWER_INCORRECT', Object.assign(qctx(), { attempt: attempts, previousAttempts: attempts - 1 }));
      if (attempts >= REPEAT_THRESHOLD) emitG('ANSWER_REPEATED_INCORRECT', Object.assign(qctx(), { attempt: attempts }));
      if (opts.onWrongAttempt) opts.onWrongAttempt();
      if (attempts >= maxAttempts) {
        showFeedback('bad', 'Not this time', (customMsg ? customMsg + ' ' : '') + (q.explain ? 'Here\'s the idea: ' + q.explain : ''));
        resolve(false, false);
        return true; // exhausted
      }
      const revealBtn = (allowReveal && attempts >= 2)
        ? el('button', { class: 'btn sm ghost', style: 'margin-top:10px', onclick: reveal }, 'Reveal answer (no XP)')
        : null;
      feedbackSlot.replaceChildren(
        el('div', { class: 'feedback bad' },
          el('div', { class: 'fb-head' }, 'Not quite — try again'),
          el('div', { html: fmt(customMsg || 'Take another look. Wrong answers here cost nothing but XP — this is the practice room, not the gig.') }),
          revealBtn));
      return false;
    }

    let reveal = () => {};

    /* ---------- MCQ / PREDICT / COMPILER ---------- */
    if (q.type === 'mcq' || q.type === 'predict' || q.type === 'compiler') {
      let chosen = -1;
      const optBtns = [];
      if (q.type === 'predict' && q.code) root.appendChild(UI.codePanel(q.code, 'predict the result'));
      if (q.type === 'compiler') {
        if (q.code) root.appendChild(UI.codePanel(q.code, 'the code'));
        root.appendChild(UI.compilerPanel(q.error));
      } else if (q.type === 'mcq' && q.code) {
        root.appendChild(UI.codePanel(q.code, 'the code'));
      }
      root.appendChild(el('p', { style: 'font-size:15px', html: fmt(q.prompt) }));

      const opts_ = el('div', { class: 'opts', role: 'radiogroup' });
      q.options.forEach((o, i) => {
        const b = el('button', { class: 'opt', role: 'radio', 'aria-checked': 'false', onclick: () => {
          if (resolved) return;
          Sfx.tap();
          chosen = i;
          optBtns.forEach((bb, j) => {
            bb.classList.toggle('sel', j === i);
            bb.setAttribute('aria-checked', j === i ? 'true' : 'false');
          });
          checkBtn.disabled = false;
        } },
          el('span', { class: 'key' }, String.fromCharCode(65 + i)),
          el('span', { html: fmt(o.t) }));
        optBtns.push(b);
        opts_.appendChild(b);
      });
      root.appendChild(opts_);

      const checkBtn = el('button', { class: 'btn primary block', disabled: true, onclick: () => {
        if (resolved || chosen < 0) return;
        const r = Engine.evalMcq(q, chosen);
        if (r.correct) {
          Sfx.correct();
          optBtns[chosen].classList.remove('sel');
          optBtns[chosen].classList.add('right');
          optBtns.forEach((b) => { b.disabled = true; });
          attempts += 1;
          showFeedback('ok', praiseFor(q), q.explain);
          resolve(true);
        } else {
          optBtns[chosen].classList.remove('sel');
          optBtns[chosen].classList.add('wrong');
          const why = q.options[chosen].why;
          const exhausted = wrongFlow(why);
          if (exhausted) {
            optBtns.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('right'); });
          } else {
            const picked = chosen;
            setTimeout(() => optBtns[picked] && optBtns[picked].classList.remove('wrong'), 900);
            chosen = -1;
            checkBtn.disabled = true;
          }
        }
      } }, 'Check');
      controls.appendChild(checkBtn);

      reveal = () => {
        if (resolved) return;
        optBtns.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('right'); });
        showFeedback('info', 'Answer revealed', q.explain);
        resolve(false, true);
      };
    }

    /* ---------- FILL ---------- */
    else if (q.type === 'fill') {
      root.appendChild(el('p', { style: 'font-size:15px', html: fmt(q.prompt) }));
      const codeHolder = el('div');
      function renderCode(filled) {
        let html;
        if (filled !== undefined) {
          // Substitute the answer, highlight, then mark the filled region.
          const MARK = 'XTXPPSBLANKX';
          html = UI.highlightCpp(q.code.replace('___', MARK + filled + MARK));
          const seg = html.split(MARK);
          html = seg.length === 3
            ? seg[0] + '<span class="blank-mark">' + seg[1] + '</span>' + seg[2]
            : UI.highlightCpp(q.code.replace('___', filled));
        } else {
          // ___ survives highlighting as a plain identifier token.
          html = UI.highlightCpp(q.code).replace('___', '<span class="blank-mark">____</span>');
        }
        codeHolder.replaceChildren(
          el('div', { class: 'code' },
            el('div', { class: 'code-head' }, el('span', { class: 'dot' }), el('span', { class: 'dot' }), el('span', null, 'fill the blank')),
            el('pre', { html })));
      }
      renderCode();
      root.appendChild(codeHolder);

      const input = el('input', {
        class: 'blank-input', type: 'text',
        placeholder: q.placeholder || 'type the missing code',
        autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
        'aria-label': 'Your answer',
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doCheck(); } });
      root.appendChild(input);

      const hintSlot = el('div');
      if (q.hint) {
        controls.appendChild(el('button', { class: 'btn sm ghost', onclick: (e) => {
          emitG('HINT_OPENED', qctx());
          hintSlot.replaceChildren(el('div', { class: 'feedback info' },
            el('div', { class: 'fb-head' }, 'Hint'),
            el('div', { html: fmt(q.hint) })));
          e.target.remove();
        } }, 'Hint'));
      }
      root.appendChild(hintSlot);

      function doCheck() {
        if (resolved) return;
        const r = Engine.evalFill(q, input.value);
        if (r.empty) { UI.toast('Type an answer first'); return; }
        if (r.correct) {
          Sfx.correct();
          attempts += 1;
          renderCode(input.value.trim());
          input.disabled = true;
          showFeedback('ok', 'Correct — Simulated check passed', q.explain);
          resolve(true);
        } else {
          wrongFlow(r.msg);
        }
      }
      controls.appendChild(el('button', { class: 'btn primary block', onclick: doCheck }, 'Check'));

      reveal = () => {
        if (resolved) return;
        renderCode(q.accept[0]);
        input.disabled = true;
        showFeedback('info', 'Answer revealed', 'The answer was `' + q.accept[0] + '`. ' + (q.explain || ''));
        resolve(false, true);
      };
    }

    /* ---------- ORDER ---------- */
    else if (q.type === 'order') {
      root.appendChild(el('p', { style: 'font-size:15px', html: fmt(q.prompt) }));
      let arrangement = Engine.shuffledOrder(q); // arrangement[pos] = original index
      const listHolder = el('div');

      function renderList(marks) {
        const list = el('div', { class: 'order-list', role: 'list' });
        arrangement.forEach((orig, pos) => {
          const row = el('div', { class: 'order-row' + (marks ? (marks.includes(pos) ? ' wrong' : ' right') : ''), role: 'listitem' },
            el('div', { class: 'order-line', html: UI.highlightCpp(q.lines[orig]) }),
            el('div', { class: 'order-ctl' },
              el('button', { 'aria-label': 'Move line up', disabled: pos === 0 || resolved, onclick: () => move(pos, -1) }, '▲'),
              el('button', { 'aria-label': 'Move line down', disabled: pos === arrangement.length - 1 || resolved, onclick: () => move(pos, 1) }, '▼')));
          list.appendChild(row);
        });
        listHolder.replaceChildren(list);
      }

      function move(pos, dir) {
        if (resolved) return;
        Sfx.tap();
        const j = pos + dir;
        [arrangement[pos], arrangement[j]] = [arrangement[j], arrangement[pos]];
        renderList();
      }

      renderList();
      root.appendChild(listHolder);

      controls.appendChild(el('button', { class: 'btn primary block', onclick: () => {
        if (resolved) return;
        const r = Engine.evalOrder(q, arrangement);
        if (r.correct) {
          Sfx.correct();
          attempts += 1;
          renderList([]);
          showFeedback('ok', 'Correct — it compiles (simulated)', q.explain);
          resolve(true);
        } else {
          const exhausted = wrongFlow(r.wrongPositions.length + (r.wrongPositions.length === 1 ? ' line is' : ' lines are') + ' in the wrong position (marked red).');
          renderList(r.wrongPositions);
          if (exhausted) {
            arrangement = q.lines.map((_, i) => i);
            renderList([]);
          }
        }
      } }, 'Check order'));

      reveal = () => {
        if (resolved) return;
        arrangement = q.lines.map((_, i) => i);
        renderList([]);
        showFeedback('info', 'Answer revealed', q.explain);
        resolve(false, true);
      };
    }

    /* ---------- BUGSPOT ---------- */
    else if (q.type === 'bugspot') {
      root.appendChild(el('p', { style: 'font-size:15px', html: fmt(q.prompt) }));
      let selected = -1;
      const lineBtns = [];
      const codeBox = el('div', { class: 'code' },
        el('div', { class: 'code-head' }, el('span', { class: 'dot' }), el('span', { class: 'dot' }), el('span', null, 'tap the buggy line')));
      q.code.forEach((line, i) => {
        const b = el('button', { class: 'codeline', onclick: () => {
          if (resolved) return;
          Sfx.tap();
          selected = i;
          lineBtns.forEach((bb, j) => bb.classList.toggle('sel', j === i));
          checkBtn.disabled = false;
        } });
        b.appendChild(el('span', { class: 'ln' }, String(i + 1)));
        const codeSpan = el('span');
        codeSpan.innerHTML = UI.highlightCpp(line || ' ');
        b.appendChild(codeSpan);
        lineBtns.push(b);
        codeBox.appendChild(b);
      });
      root.appendChild(codeBox);

      const checkBtn = el('button', { class: 'btn primary block', disabled: true, onclick: () => {
        if (resolved || selected < 0) return;
        const r = Engine.evalBugspot(q, selected);
        if (r.correct) {
          Sfx.correct();
          attempts += 1;
          lineBtns.forEach((b, j) => { b.disabled = true; b.classList.remove('sel'); if (j === q.buggy) b.classList.add('hit'); });
          showFeedback('ok', 'Bug found — nice ears', q.explain + (q.fix ? ' **Fix:** `' + q.fix + '`' : ''));
          resolve(true);
        } else {
          lineBtns[selected].classList.remove('sel');
          const wrongLine = lineBtns[selected];
          wrongLine.classList.add('hit');
          setTimeout(() => wrongLine.classList.remove('hit'), 800);
          const exhausted = wrongFlow('That line is fine, actually. Look for the line that breaks a rule you\'ve learned.');
          if (exhausted) {
            lineBtns.forEach((b, j) => { b.disabled = true; if (j === q.buggy) b.classList.add('hit'); });
          } else {
            selected = -1;
            checkBtn.disabled = true;
          }
        }
      } }, 'This is the bug');
      controls.appendChild(checkBtn);

      reveal = () => {
        if (resolved) return;
        lineBtns.forEach((b, j) => { b.disabled = true; if (j === q.buggy) b.classList.add('hit'); });
        showFeedback('info', 'Answer revealed', q.explain + (q.fix ? ' **Fix:** `' + q.fix + '`' : ''));
        resolve(false, true);
      };
    }

    /* ---------- MATCH ---------- */
    else if (q.type === 'match') {
      root.appendChild(el('p', { style: 'font-size:15px', html: fmt(q.prompt) }));
      root.appendChild(el('p', { class: 'small faint' }, 'Tap a left item, then its partner on the right. Tap a paired item to unpair.'));
      const rightOrder = Engine.shuffledMatch(q); // display order of right items
      const pairs = new Array(q.left.length).fill(-1); // leftIdx -> rightOriginalIdx
      let activeLeft = -1;
      const leftBtns = [], rightBtns = [];

      const grid = el('div', { class: 'match-grid' });
      const maxRows = Math.max(q.left.length, rightOrder.length);
      for (let r = 0; r < maxRows; r++) {
        // left cell
        if (r < q.left.length) {
          const li = r;
          const b = el('button', { class: 'match-item code', onclick: () => {
            if (resolved) return;
            Sfx.tap();
            if (pairs[li] !== -1) { pairs[li] = -1; refresh(); return; }
            activeLeft = (activeLeft === li) ? -1 : li;
            refresh();
          } }, q.left[li]);
          leftBtns.push(b);
          grid.appendChild(b);
        } else grid.appendChild(el('div'));
        // right cell
        if (r < rightOrder.length) {
          const ri = rightOrder[r];
          const b = el('button', { class: 'match-item', onclick: () => {
            if (resolved) return;
            Sfx.tap();
            const pairedLeft = pairs.indexOf(ri);
            if (pairedLeft !== -1) { pairs[pairedLeft] = -1; refresh(); return; }
            if (activeLeft !== -1) { pairs[activeLeft] = ri; activeLeft = -1; refresh(); }
          } }, q.right[ri]);
          rightBtns.push({ b, ri });
          grid.appendChild(b);
        } else grid.appendChild(el('div'));
      }

      function refresh(marks) {
        leftBtns.forEach((b, li) => {
          b.classList.toggle('sel', activeLeft === li);
          b.classList.toggle('paired', pairs[li] !== -1);
          b.classList.toggle('wrongpair', !!(marks && marks.includes(li)));
        });
        rightBtns.forEach(({ b, ri }) => {
          const li = pairs.indexOf(ri);
          b.classList.toggle('paired', li !== -1);
          b.classList.toggle('wrongpair', !!(marks && li !== -1 && marks.includes(li)));
        });
        checkBtn.disabled = pairs.some((p) => p === -1);
      }

      root.appendChild(grid);
      const checkBtn = el('button', { class: 'btn primary block', disabled: true, onclick: () => {
        if (resolved) return;
        const r = Engine.evalMatch(q, pairs);
        if (r.correct) {
          Sfx.correct();
          attempts += 1;
          refresh();
          leftBtns.forEach((b) => { b.disabled = true; });
          rightBtns.forEach(({ b }) => { b.disabled = true; });
          showFeedback('ok', 'All connected — clean patch', q.explain);
          resolve(true);
        } else {
          const exhausted = wrongFlow(r.wrongLeft.length + (r.wrongLeft.length === 1 ? ' pair is' : ' pairs are') + ' mismatched (marked red). Unpair and rewire them.');
          refresh(r.wrongLeft);
          if (exhausted) {
            for (let i = 0; i < pairs.length; i++) pairs[i] = i;
            refresh();
            leftBtns.forEach((b) => { b.disabled = true; });
            rightBtns.forEach(({ b }) => { b.disabled = true; });
          }
        }
      } }, 'Check connections');
      controls.appendChild(checkBtn);
      refresh();

      reveal = () => {
        if (resolved) return;
        for (let i = 0; i < pairs.length; i++) pairs[i] = i;
        refresh();
        leftBtns.forEach((b) => { b.disabled = true; });
        rightBtns.forEach(({ b }) => { b.disabled = true; });
        showFeedback('info', 'Answer revealed', q.explain);
        resolve(false, true);
      };
    }

    root.appendChild(feedbackSlot);
    root.appendChild(controls);
    return root;
  }

  /* =====================================================================
     SEQUENCE RUNNER — plays a list of questions with XP accounting.
     Used by lessons (checks), challenges, projects, boss and practice.
     cfg: { title, eyebrow, questions:[{q, note?}], baseXp, nodeId,
            bossMode?, onFinish({correct, firstTry, earned}) , stepStart?,
            onStep? }
     ===================================================================== */
  function sequenceRunner(cfg) {
    const wrap = el('div', { class: 'col', style: 'gap:14px' });
    const n = cfg.questions.length;
    const share = cfg.baseXp / n;
    let idx = cfg.stepStart || 0;
    let firstTryCount = 0;
    let correctCount = 0;
    let earned = 0;
    const stageResults = [];

    const track = el('div', { class: 'stage-track', 'aria-hidden': 'true' });
    const trackCells = [];
    for (let i = 0; i < n; i++) {
      const c = el('i', { class: i < idx ? 'done' : (i === idx ? 'now' : '') });
      trackCells.push(c);
      track.appendChild(c);
    }
    wrap.appendChild(el('div', { class: 'col gap-s' },
      el('span', { class: 'eyebrow phos' }, cfg.eyebrow || ''),
      track));

    const slot = el('div');
    wrap.appendChild(slot);

    function renderStep() {
      const item = cfg.questions[idx];
      trackCells.forEach((c, i) => { c.className = stageResults[i] === false ? 'fail' : (i < idx ? 'done' : (i === idx ? 'now' : '')); });

      const stepBits = el('div', { class: 'col', style: 'gap:12px' });
      stepBits.appendChild(el('div', { class: 'row between' },
        el('span', { class: 'mono small dim' }, 'STEP ' + (idx + 1) + ' / ' + n),
        el('span', { class: 'mono small faint' }, conceptLabel(item.q.concept) || '')));
      if (item.note) stepBits.appendChild(el('div', { class: 'callout warn' },
        el('div', { class: 'co-head' }, 'Briefing'),
        el('div', { html: fmt(item.note) })));

      const qv = questionView(item.q, {
        maxAttempts: cfg.bossMode ? 2 : Infinity,
        allowReveal: !cfg.bossMode,
        onWrongAttempt: () => {
          if (item.q.qid) Store.markWeak(item.q.qid, cfg.nodeId || '', item.q.concept);
        },
        onResolved: (res) => {
          stageResults[idx] = res.correct;
          if (cfg.onQuestionResolved) cfg.onQuestionResolved(item, res);
          if (res.correct) {
            correctCount += 1;
            if (res.firstTry) firstTryCount += 1;
            earned += share > 0 ? (res.firstTry ? share : share / 2) : 0;
          }
          trackCells[idx].className = res.correct ? 'done' : 'fail';
          const isLast = idx === n - 1;
          stepBits.appendChild(el('div', { class: 'action-bar' },
            el('button', { class: 'btn primary block', onclick: () => {
              idx += 1;
              if (cfg.onStep) cfg.onStep(idx);
              if (idx >= n) {
                cfg.onFinish({ correct: correctCount, firstTry: firstTryCount, earned: Math.round(earned), total: n });
              } else {
                renderStep();
              }
            } }, isLast ? 'Finish' : 'Continue')));
        },
      });
      stepBits.appendChild(qv);
      slot.replaceChildren(stepBits);
      wrap.scrollIntoView({ block: 'start' });
      window.scrollTo({ top: 0 });
    }

    renderStep();
    return wrap;
  }

  /* ---- shared: sub-screen chrome ---- */
  function subScreen(title, eyebrow, children, backTo) {
    return el('div', { class: 'main' },
      el('div', { class: 'back-row' },
        el('button', { class: 'back-btn', onclick: () => App.go(backTo || 'map') }, UI.icon('back'), ' BACK'),
      ),
      el('div', { class: 'col gap-s' },
        el('div', { class: 'eyebrow phos' }, eyebrow),
        el('h1', { class: 'h-display' }, title)),
      ...children);
  }

  /* ---- completion sheet after a node ---- */
  function completionSheet(node, result, starCount) {
    // Decorative milestone events (progress was already saved by completeNode).
    try {
      const perfect = result && result.total > 0 && result.firstTry === result.total;
      const p = { nodeId: node.id, zoneId: (Store.zoneOfNode(node.id) || {}).id };
      if (node.kind === 'lesson') { emitG('LESSON_COMPLETE', p); emitG(perfect ? 'QUIZ_PERFECT' : 'QUIZ_PASSED', p); }
      else if (node.kind === 'challenge') { emitG('CHALLENGE_COMPLETE', p); emitG(perfect ? 'QUIZ_PERFECT' : 'QUIZ_PASSED', p); }
      else if (node.kind === 'project') { emitG('MISSION_COMPLETE', p); }
      else if (node.kind === 'boss' && node.id !== 'boss7') { emitG('ZONE_UNLOCKED', p); }
    } catch (e) { /* decorative */ }
    const nextId = Store.nextNode();
    const s = UI.sheet([
      el('div', { class: 'center col', style: 'gap:10px; padding:6px 0' },
        el('div', { class: 'eyebrow phos', style: 'justify-content:center' }, node.kind === 'boss' ? 'ZONE CLEARED' : 'COMPLETE'),
        el('div', { class: 'h-display' }, node.title),
        starCount !== null ? el('div', { style: 'font-size:26px; letter-spacing:6px' }, UI.stars(starCount)) : null,
        el('div', { class: 'xp-pop', style: 'font-size:24px' }, '+' + result.earned + ' XP'),
        el('div', { class: 'small dim' }, result.firstTry + ' of ' + result.total + ' first try'),
      ),
      el('div', { class: 'col gap-s' },
        nextId ? el('button', { class: 'btn primary block', onclick: () => { s.close(); App.openNode(nextId); } },
          'Next: ' + (Engine.NODES[nextId] ? Engine.NODES[nextId].title : '')) : null,
        el('button', { class: 'btn block', onclick: () => { s.close(); App.go('map'); } }, 'Curriculum map'),
        el('button', { class: 'btn ghost block', onclick: () => { s.close(); App.go('dashboard'); } }, 'Dashboard')),
    ], { sticky: true });
  }

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  function dashboard() {
    const st = Store.state;
    const lv = Store.level();
    const lp = Store.levelProgress();
    const nextId = Store.nextNode();
    const nextNodeObj = nextId ? Engine.NODES[nextId] : null;
    const curZone = nextId ? Store.zoneOfNode(nextId) : ZONES.filter((z) => z.status === 'live').slice(-1)[0];
    const mastery = Store.zoneMastery(curZone ? curZone.id : 'z1');
    const daily = Store.dailyToday();
    const weak = Store.weakConcepts().slice(0, 4);
    const order = Store.liveOrder();
    const zoneOrder = curZone ? curZone.nodeOrder : order;
    const doneCount = zoneOrder.filter(Store.isDone).length;

    // recently completed (last 3 with stars)
    const recent = order.filter(Store.isDone).slice(-3).reverse()
      .map((id) => ({ node: Engine.NODES[id], ns: st.nodes[id] }));

    const main = el('div', { class: 'main' });

    main.appendChild(UI.scope(lv));

    const grid = el('div', { class: 'dash-grid col', style: 'gap:14px' });

    // level card
    grid.appendChild(el('div', { class: 'card span2' },
      el('div', { class: 'row between' },
        el('div', null,
          el('div', { class: 'eyebrow' }, 'OPERATOR LEVEL'),
          el('div', { class: 'h-display', style: 'margin-top:4px' }, 'LV ' + lv + ' — ' + Store.levelTitle())),
        el('div', { class: 'stat', style: 'border:none; background:none; text-align:right; padding:0' },
          el('div', { class: 'v tnum' }, st.xp.toLocaleString()),
          el('div', { class: 'k' }, 'TOTAL XP'))),
      el('div', { class: 'mt-m' },
        el('div', { class: 'meter' }, el('i', { style: 'width:' + lp.pct + '%' })),
        el('div', { class: 'row between mt-s' },
          el('span', { class: 'mono small faint tnum' }, lp.next !== null ? lp.into + ' / ' + lp.span + ' XP into level' : 'MAX LEVEL'),
          el('span', { class: 'mono small dim tnum' }, lp.next !== null ? (lp.next - st.xp) + ' XP to LV ' + (lv + 1) : ''))),
    ));

    // continue learning
    if (nextNodeObj) {
      grid.appendChild(el('button', { class: 'card raised card-tap span2', onclick: () => App.openNode(nextId) },
        el('div', { class: 'eyebrow phos' }, 'CONTINUE LEARNING — ZONE ' + (curZone ? curZone.num : 1)),
        el('div', { class: 'h-display', style: 'margin-top:6px' }, nextNodeObj.title),
        el('div', { class: 'h-sub mt-s' }, nodeKindLabel(nextNodeObj)),
        el('div', { class: 'mt-m' }, el('span', { class: 'btn primary sm', style: 'pointer-events:none' }, '▶ Continue')),
      ));
    } else {
      grid.appendChild(el('div', { class: 'card raised span2' },
        el('div', { class: 'eyebrow phos' }, 'CURRICULUM COMPLETE'),
        el('div', { class: 'h-sub mt-s' }, 'Seven zones cleared and the whole product line shipped — you\'ve finished the curriculum. Keep your edge sharp in Practice Mode, or drop back into any node from the map.')));
    }

    // daily challenge
    grid.appendChild(el('button', { class: 'card card-tap', onclick: () => App.go('daily') },
      el('div', { class: 'row between' },
        el('div', { class: 'eyebrow amber' }, UI.icon('zap'), ' DAILY CHALLENGE'),
        el('span', { class: 'mono small ' + (daily.done ? 'dim' : ''), style: daily.done ? '' : 'color:var(--amber)' }, daily.done ? (daily.correct ? 'DONE ✓' : 'DONE') : 'READY')),
      el('div', { class: 'h-sub mt-s' }, daily.done ? 'Back tomorrow with a fresh one.' : 'One question. +40 XP. Keeps the streak alive.')));

    // streak
    grid.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow amber' }, UI.icon('flame'), ' STREAK'),
      el('div', { class: 'row mt-s', style: 'align-items:baseline; gap:8px' },
        el('span', { class: 'stat amber', style: 'border:none;background:none;padding:0' }, el('span', { class: 'v tnum' }, String(st.streak.count || 0))),
        el('span', { class: 'dim small' }, (st.streak.count === 1 ? 'day' : 'days') + (st.streak.last === Store.todayStr() ? ' — active today' : ''))),
    ));

    // zone progress
    grid.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow' }, 'ZONE ' + (curZone ? curZone.num : 1) + ' PROGRESS'),
      el('div', { class: 'mt-m meter' }, el('i', { style: 'width:' + Math.round((doneCount / zoneOrder.length) * 100) + '%' })),
      el('div', { class: 'row between mt-s' },
        el('span', { class: 'mono small dim tnum' }, doneCount + ' / ' + zoneOrder.length + ' nodes'),
        el('span', { class: 'mono small faint tnum' }, 'MASTERY ' + mastery.pct + '%'))));

    // weak concepts
    grid.appendChild(el('div', { class: 'card' },
      el('div', { class: 'row between' },
        el('div', { class: 'eyebrow' }, 'REVIEW QUEUE'),
        weak.length ? el('button', { class: 'btn sm ghost', onclick: () => App.go('practice') }, 'Practice') : null),
      weak.length
        ? el('div', { class: 'chips mt-m' }, weak.map((w) => el('span', { class: 'chip weak' }, conceptLabel(w.concept) + ' ×' + w.n)))
        : el('div', { class: 'h-sub mt-s' }, 'No weak spots on the board. Miss a question and it lands here for review.')));

    // recent mastery
    if (recent.length) {
      grid.appendChild(el('div', { class: 'card span2' },
        el('div', { class: 'eyebrow' }, 'RECENT MASTERY'),
        el('div', { class: 'col mt-m', style: 'gap:8px' }, recent.map(({ node, ns }) =>
          el('button', { class: 'row between card-tap', style: 'padding:6px 2px; border:none', onclick: () => App.openNode(node.id) },
            el('span', { class: 'small' }, node.title),
            node.kind === 'lesson' || node.kind === 'boss' ? UI.stars(ns.stars) : el('span', { class: 'mono small phosdim', style: 'color:var(--phos)' }, '✓'))))));
    }

    // next unlock
    if (nextNodeObj) {
      const nextIdx = order.indexOf(nextId);
      const after = order[nextIdx + 1] ? Engine.NODES[order[nextIdx + 1]] : null;
      if (after) {
        grid.appendChild(el('div', { class: 'card span2', style: 'opacity:.75' },
          el('div', { class: 'eyebrow' }, 'NEXT UNLOCK'),
          el('div', { class: 'row mt-s' },
            el('span', { class: 'node-ico ' + after.kind }, nodeIcoText(after)),
            el('div', null,
              el('div', { class: 'node-name' }, after.title),
              el('div', { class: 'node-sub' }, nodeKindLabel(after))))));
      }
    }

    main.appendChild(grid);
    if (!Store.storageOk) {
      main.appendChild(el('div', { class: 'callout warn' },
        el('div', { class: 'co-head' }, 'Storage unavailable'),
        el('div', { class: 'small' }, 'This browser is blocking local storage, so progress lasts only for this visit. Use Settings → Export to save your progress as JSON.')));
    }
    return main;
  }

  function nodeKindLabel(node) {
    if (node.kind === 'lesson') return 'Lesson · ' + node.short;
    if (node.kind === 'project') return 'Mini-project mission';
    if (node.kind === 'boss') return 'Boss challenge';
    const map = { completion: 'Code completion', bugfix: 'Bug hunt', ordering: 'Code ordering', compiler: 'Compiler challenge', reading: 'Reading the signal path' };
    return 'Challenge · ' + (map[node.ctype] || 'Challenge');
  }

  function nodeIcoText(node) {
    if (node.kind === 'lesson') return '§';
    if (node.kind === 'project') return '◆';
    if (node.kind === 'boss') return '☠';
    const map = { completion: '{}', bugfix: '✗', ordering: '≡', compiler: '⚠', reading: '⇆' };
    return map[node.ctype] || '?';
  }

  const CONCEPT_LABELS = {
    'variables': 'variables', 'types': 'types', 'const': 'const', 'functions': 'functions',
    'control-flow': 'if/switch', 'loops': 'loops', 'containers': 'arrays & vectors',
    'references': 'references', 'pointers': 'pointers', 'memory': 'memory safety',
    'classes': 'classes', 'encapsulation': 'encapsulation', 'headers': 'headers',
    'compiler-errors': 'compiler errors', 'realtime-safety': 'real-time safety',
  };
  function conceptLabel(c) { return CONCEPT_LABELS[c] || c; }

  /* =====================================================================
     CURRICULUM MAP
     ===================================================================== */
  function map() {
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'CURRICULUM MAP'),
      el('h1', { class: 'h-display' }, 'Seven zones to shipping plugins'),
      el('p', { class: 'small dim' }, 'All seven zones are open — from your first line of C++ to shipping a commercial plugin. Work straight through, or drop back into any station to sharpen it.')));

    ZONES.forEach((z) => {
      const live = z.status === 'live';
      const rack = el('div', { class: 'zone-rack' + (live ? '' : ' locked') });

      const headBtn = el('button', { class: 'zone-head', 'aria-expanded': live ? 'true' : 'false', onclick: () => {
        if (!live) {
          UI.sheet([
            el('div', { class: 'eyebrow amber' }, 'ZONE ' + z.num + ' — PLANNED'),
            el('div', { class: 'h-display' }, z.title),
            el('p', { class: 'small dim' }, z.desc),
            el('div', { class: 'eyebrow', style: 'margin-top:4px' }, 'PLANNED CURRICULUM'),
            el('div', { class: 'chips' }, z.topics.map((t) => el('span', { class: 'chip' }, t))),
            el('p', { class: 'small faint' }, 'This zone ships in a future update. Zone 1 completion is its prerequisite.'),
          ]);
          return;
        }
        const list = rack.querySelector('.node-list');
        const open = !list.classList.contains('hidden');
        list.classList.toggle('hidden', open);
        headBtn.setAttribute('aria-expanded', String(!open));
      } },
        el('span', { class: 'zone-num' }, String(z.num)),
        el('div', null,
          el('div', { class: 'zone-title' }, z.title),
          el('div', { class: 'zone-tag' }, z.tagline)),
        el('div', { class: 'zone-meta' }, live
          ? z.nodeOrder.filter(Store.isDone).length + '/' + z.nodeOrder.length
          : 'LOCKED'));
      rack.appendChild(headBtn);

      if (live) {
        const list = el('div', { class: 'node-list' });
        z.nodeOrder.forEach((id) => {
          const node = Engine.NODES[id];
          if (!node) return;
          const done = Store.isDone(id);
          const unlocked = Store.isUnlocked(z.id, id);
          const ns = Store.state.nodes[id];
          const row = el('button', { class: 'node-row' + (unlocked ? '' : ' locked'), onclick: () => {
            if (!unlocked) { UI.toast('Locked — complete the previous step first'); return; }
            App.openNode(id);
          } },
            el('span', { class: 'node-ico ' + node.kind }, nodeIcoText(node)),
            el('div', { style: 'min-width:0' },
              el('div', { class: 'node-name' }, node.title),
              el('div', { class: 'node-sub' }, nodeKindLabel(node))),
            el('div', { class: 'node-right' },
              done && (node.kind === 'lesson' || node.kind === 'boss') ? UI.stars(ns.stars) : null,
              done && node.kind !== 'lesson' && node.kind !== 'boss' ? el('span', { style: 'color:var(--phos); font-family:var(--mono)' }, '✓') : null,
              !unlocked ? el('span', { class: 'mono small faint' }, '🔒') : null,
              unlocked && !done ? el('span', { style: 'color:var(--amber); font-family:var(--mono); font-size:11px' }, '▶') : null));
          list.appendChild(row);
        });
        rack.appendChild(list);
      }
      main.appendChild(rack);
    });
    return main;
  }

  /* =====================================================================
     LESSON PLAYER
     ===================================================================== */
  function lesson(params) {
    const node = Engine.NODES[params.id];
    const totalSteps = 1 + node.sections.length + node.checks.length + 1; // objective + sections + checks + recap
    let step = 0;
    let firstTryCount = 0;
    let earned = 0;
    const share = XP_RULES.lesson / node.checks.length;
    const alreadyDone = Store.isDone(node.id);

    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('map') }, UI.icon('back'), ' EXIT LESSON')));

    const dots = el('div', { class: 'dots' });
    const dotEls = [];
    for (let i = 0; i < totalSteps; i++) { const d = el('i'); dotEls.push(d); dots.appendChild(d); }

    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'LESSON — ZONE ' + ((Store.zoneOfNode(node.id) || {}).num || 1) + (alreadyDone ? ' · REPLAY' : '')),
      el('h1', { class: 'h-display' }, node.title),
      dots));

    const slot = el('div', { class: 'col', style: 'gap:14px' });
    main.appendChild(slot);

    function renderStep() {
      dotEls.forEach((d, i) => { d.className = i < step ? 'done' : (i === step ? 'now' : ''); });
      window.scrollTo({ top: 0 });

      // step 0: objective
      if (step === 0) {
        slot.replaceChildren(
          el('div', { class: 'card raised' },
            node.hook ? el('div', { class: 'hook', style: 'margin-bottom:14px', html: fmt(node.hook, { links: true }) }) : null,
            el('div', { class: 'eyebrow phos' }, 'MISSION BRIEF'),
            el('p', { class: 'prose mt-s', html: fmt(node.objective) }),
            el('div', { class: 'mt-m row wrap' },
              node.diff ? el('span', { class: 'chip', style: 'color:var(--amber); border-color:var(--amber)' },
                '●'.repeat(node.diff) + '○'.repeat(3 - node.diff) + ' ' + ['INTRO', 'CORE', 'DEEP'][node.diff - 1]) : null,
              node.time ? el('span', { class: 'chip' }, node.time) : null,
              el('span', { class: 'chip' }, node.sections.length + ' concepts'),
              el('span', { class: 'chip' }, node.checks.length + ' checks'),
              el('span', { class: 'chip' }, '+' + XP_RULES.lesson + ' XP' + (alreadyDone ? ' (already earned)' : '')))),
          nextBtn('Start'));
        return;
      }
      // sections
      const sIdx = step - 1;
      if (sIdx < node.sections.length) {
        const s = node.sections[sIdx];
        const bits = [el('h2', { class: 'h-display', style: 'font-size:16px' }, s.h),
          el('div', { class: 'prose', html: fmt(s.body, { links: true }) })];
        if (s.viz) bits.push(Viz.render(s.viz));
        if (s.code) {
          bits.push(UI.codePanel(s.code, s.codeTitle));
          if (s.breakdown) bits.push(el('div', { class: 'breakdown' },
            el('div', { class: 'bd-head' }, 'PIECE BY PIECE'),
            s.breakdown.map(([piece, what]) => el('div', { class: 'bd-row' },
              el('span', { class: 'bd-code' }, piece),
              el('span', { class: 'bd-what', html: fmt(what) })))));
        }
        if (s.analogy) bits.push(el('div', { class: 'callout analogy' },
          el('div', { class: 'co-head' }, '⌁ Studio analogy'),
          el('div', { html: fmt(s.analogy, { links: true }) })));
        if (s.mistake) {
          const mk = [el('div', { class: 'co-head' }, '✗ Common mistake')];
          if (s.mistake.code) mk.push(el('div', { class: 'code', style: 'margin:6px 0' }, el('pre', { html: UI.highlightCpp(s.mistake.code) })));
          mk.push(el('div', { html: fmt(s.mistake.text, { links: true }) }));
          bits.push(el('div', { class: 'callout mistake' }, mk));
        }
        if (s.warn) bits.push(el('div', { class: 'callout warn' },
          el('div', { class: 'co-head' }, '⚠ Worth knowing'),
          el('div', { html: fmt(s.warn, { links: true }) })));
        slot.replaceChildren(el('div', { class: 'card col', style: 'gap:12px' }, bits), nextBtn(sIdx === node.sections.length - 1 ? 'To the checks' : 'Next'));
        return;
      }
      // checks
      const qIdx = step - 1 - node.sections.length;
      if (qIdx < node.checks.length) {
        const q = node.checks[qIdx];
        const holder = el('div', { class: 'card col', style: 'gap:12px' },
          el('div', { class: 'row between' },
            el('span', { class: 'eyebrow amber' }, 'CHECK ' + (qIdx + 1) + ' / ' + node.checks.length),
            el('span', { class: 'mono small faint' }, conceptLabel(q.concept))));
        const qv = questionView(q, {
          onWrongAttempt: () => Store.markWeak(q.qid, node.id, q.concept),
          onResolved: (res) => {
            if (res.correct) {
              if (res.firstTry) firstTryCount += 1;
              if (!alreadyDone) earned += res.firstTry ? share : share / 2;
            }
            holder.appendChild(el('div', { class: 'action-bar' },
              el('button', { class: 'btn primary block', onclick: () => { step += 1; renderStep(); } },
                qIdx === node.checks.length - 1 ? 'Finish lesson' : 'Next check')));
          },
        });
        holder.appendChild(qv);
        slot.replaceChildren(holder);
        return;
      }
      // recap
      earned = Math.round(earned);
      if (earned > 0) App.awardXp(earned);
      const { stars: starCount } = Store.completeNode(node.id, firstTryCount, node.checks.length);
      App.flushAchievements();
      const endPanels = [];
      if (node.inside && node.inside.length) endPanels.push(el('div', { class: 'card col', style: 'gap:10px' },
        el('div', { class: 'eyebrow phos' }, '\uD83C\uDF9B INSIDE A REAL PLUGIN'),
        el('div', { class: 'col gap-s' }, node.inside.map((x) => el('div', { class: 'plugin-use' },
          el('span', { class: 'pu-name' }, x.name),
          el('span', { class: 'pu-desc', html: fmt(x.use, { links: true }) }))))));
      if (node.analogyPanel) endPanels.push(el('div', { class: 'callout analogy' },
        el('div', { class: 'co-head' }, '\uD83C\uDFB9 STUDIO ANALOGY'),
        el('div', { html: fmt(node.analogyPanel, { links: true }) })));
      if (node.beginnerMistake) endPanels.push(el('div', { class: 'callout mistake' },
        el('div', { class: 'co-head' }, '\u26A0 COMMON BEGINNER MISTAKE'),
        el('div', { html: fmt(node.beginnerMistake, { links: true }) })));
      if (node.remember) endPanels.push(el('div', { class: 'callout remember' },
        el('div', { class: 'co-head' }, '\uD83D\uDCA1 REMEMBER THIS'),
        el('div', { class: 'co-body', html: fmt(node.remember) })));
      const conceptChip = (id) => Dict.byId[id]
        ? el('button', { class: 'chip', style: 'color:var(--phos); border-color:var(--phos-dim)', onclick: () => { Sfx.tap(); Dict.open(id); } }, Dict.byId[id].t)
        : el('span', { class: 'chip' }, id);
      if (node.builds && node.builds.length) endPanels.push(el('div', { class: 'card col', style: 'gap:8px' },
        el('div', { class: 'eyebrow' }, 'BUILDS ON'),
        el('div', { class: 'chips' }, node.builds.map(conceptChip))));
      if (node.leads && node.leads.length) endPanels.push(el('div', { class: 'card col', style: 'gap:8px' },
        el('div', { class: 'eyebrow amber' }, 'LEADS TO'),
        el('div', { class: 'chips' }, node.leads.map(conceptChip))));
      slot.replaceChildren(
        el('div', { class: 'card raised col', style: 'gap:12px' },
          el('div', { class: 'eyebrow phos' }, 'RECAP'),
          el('ul', { style: 'padding-left:20px; display:flex; flex-direction:column; gap:8px; font-size:14.5px' },
            node.recap.map((r) => el('li', { html: fmt(r) })))),
        ...endPanels,
        el('button', { class: 'btn primary block', onclick: () => completionSheet(node, { earned, firstTry: firstTryCount, total: node.checks.length }, starCount) }, 'Collect results'));
    }

    function nextBtn(label) {
      return el('button', { class: 'btn primary block', onclick: () => { Sfx.tap(); step += 1; renderStep(); } }, label);
    }

    renderStep();
    return main;
  }

  /* =====================================================================
     CHALLENGE SCREEN (completion / bugfix / ordering / compiler)
     ===================================================================== */
  function challenge(params) {
    const node = Engine.NODES[params.id];
    const alreadyDone = Store.isDone(node.id);
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('map') }, UI.icon('back'), ' EXIT')));
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow amber' }, nodeKindLabel(node).toUpperCase() + (alreadyDone ? ' · REPLAY' : '')),
      el('h1', { class: 'h-display' }, node.title),
      node.intro ? el('p', { class: 'small dim', style: 'max-width:62ch', html: fmt(node.intro, { links: true }) }) : null));

    main.appendChild(el('div', { class: 'card' }, sequenceRunner({
      eyebrow: 'CHALLENGE',
      questions: node.questions.map((q) => ({ q })),
      baseXp: alreadyDone ? 0 : XP_RULES.challenge,
      nodeId: node.id,
      onFinish: (result) => {
        if (result.earned > 0) App.awardXp(result.earned);
        Store.completeNode(node.id, result.firstTry, result.total);
        App.flushAchievements();
        completionSheet(node, result, null);
      },
    })));
    return main;
  }

  /* =====================================================================
     MINI-PROJECT MISSION
     ===================================================================== */
  function project(params) {
    const node = Engine.NODES[params.id];
    const alreadyDone = Store.isDone(node.id);
    const savedStep = Math.min(Store.nodeState(node.id).step || 0, node.steps.length - 1);
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('map') }, UI.icon('back'), ' EXIT MISSION')));
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'MINI-PROJECT MISSION' + (alreadyDone ? ' · REPLAY' : '')),
      el('h1', { class: 'h-display' }, node.title),
      el('p', { class: 'small dim', style: 'max-width:62ch', html: fmt(node.brief, { links: true }) }),
      savedStep > 0 && !alreadyDone ? el('p', { class: 'mono small', style: 'color:var(--amber)' }, 'RESUMING AT STEP ' + (savedStep + 1)) : null));

    main.appendChild(el('div', { class: 'card' }, sequenceRunner({
      eyebrow: 'MISSION',
      questions: node.steps.map((s) => ({ q: s.q, note: s.note })),
      baseXp: alreadyDone ? 0 : XP_RULES.project,
      nodeId: node.id,
      stepStart: alreadyDone ? 0 : savedStep,
      onStep: (i) => { if (!alreadyDone) Store.setProjectStep(node.id, i); },
      onFinish: (result) => {
        if (result.earned > 0) App.awardXp(result.earned);
        Store.completeNode(node.id, result.firstTry, result.total);
        App.flushAchievements();
        completionSheet(node, result, null);
      },
    })));
    return main;
  }

  /* =====================================================================
     BOSS CHALLENGE
     ===================================================================== */
  function boss(params) {
    const node = Engine.NODES[params.id];
    const ready = Store.bossReady(node.id);
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('map') }, UI.icon('back'), ' RETREAT')));

    if (!ready.ready && !Store.isDone(node.id)) {
      main.appendChild(el('div', { class: 'boss-banner col', style: 'gap:10px' },
        el('div', { class: 'eyebrow red' }, '☠ BOSS — LOCKED'),
        el('h1', { class: 'h-display' }, node.title),
        el('p', { class: 'small dim' }, node.brief)));
      main.appendChild(el('div', { class: 'card col', style: 'gap:12px' },
        el('div', { class: 'eyebrow' }, 'ENTRY REQUIREMENTS'),
        reqRow('All ' + ready.totalLessons + ' Zone ' + ready.zoneNum + ' lessons complete', ready.lessonsDone),
        reqRow('All ' + ready.totalProjects + ' zone missions complete', ready.projectsDone),
        reqRow('Average lesson mastery ≥ ★★ (yours: ' + ready.avgStars.toFixed(1) + ')', ready.avgStars >= ready.need),
        el('p', { class: 'small faint' }, 'Raise mastery by replaying lessons — stars only ever go up.'),
        el('button', { class: 'btn amber block', onclick: () => App.go('practice') }, 'Train in Practice Mode')));
      return main;
    }

    let started = false;
    const intro = el('div', { class: 'col', style: 'gap:14px' },
      el('div', { class: 'boss-banner col', style: 'gap:10px' },
        el('div', { class: 'eyebrow red' }, '☠ ZONE ' + ((Store.zoneOfNode(node.id) || {}).num || 1) + ' BOSS' + (Store.isDone(node.id) ? ' · CLEARED — REPLAY' : '')),
        el('h1', { class: 'h-display' }, node.title),
        el('p', { class: 'small', style: 'color:var(--ink-dim)' }, node.brief),
        el('div', { class: 'row wrap mt-s' },
          el('span', { class: 'chip' }, node.stages.length + ' stages'),
          el('span', { class: 'chip' }, '1 retry per stage'),
          el('span', { class: 'chip' }, 'clear ' + (node.passNeed || 4) + '+ to win'),
          el('span', { class: 'chip' }, '+' + XP_RULES.boss + ' XP max')),
        el('button', { class: 'btn danger block', style: 'margin-top:6px', onclick: start }, 'Enter the session')));
    main.appendChild(intro);

    function start() {
      if (started) return;
      started = true;
      const alreadyDone = Store.isDone(node.id);
      intro.replaceChildren(el('div', { class: 'card' }, sequenceRunner({
        eyebrow: 'BOSS FIGHT',
        bossMode: true,
        questions: node.stages.map((q) => ({ q })),
        baseXp: alreadyDone ? 0 : XP_RULES.boss,
        nodeId: node.id,
        onFinish: (result) => {
          const passed = result.correct >= (node.passNeed || 4);
          if (passed) {
            if (result.earned > 0) App.awardXp(result.earned);
            Store.completeNode(node.id, result.firstTry, result.total);
            App.flushAchievements();
            if (node.id === 'boss7') graduationSheet(result);
            else completionSheet(node, result, Store.starsFor(result.firstTry, result.total));
          } else {
            UI.sheet([
              el('div', { class: 'center col', style: 'gap:10px; padding:6px 0' },
                el('div', { class: 'eyebrow red', style: 'justify-content:center' }, 'SESSION FAILED'),
                el('div', { class: 'h-display' }, result.correct + ' / ' + result.total + ' stages cleared'),
                el('p', { class: 'small dim' }, 'You need ' + (node.passNeed || 4) + '. The plugin is still broken — but now you know exactly which concepts to sharpen. No XP banked this run: clear the session to collect it.')),
              el('button', { class: 'btn amber block', onclick: () => App.go('practice') }, 'Review weak concepts'),
              el('button', { class: 'btn block', onclick: () => App.go('boss', { id: node.id }) }, 'Try again'),
              el('button', { class: 'btn ghost block', onclick: () => App.go('map') }, 'Back to map'),
            ], { sticky: true });
          }
        },
      })));
    }

    function reqRow(label, ok) {
      return el('div', { class: 'row' },
        el('span', { style: 'color:' + (ok ? 'var(--phos)' : 'var(--red)') + '; font-family:var(--mono)' }, ok ? '✓' : '✗'),
        el('span', { class: 'small' + (ok ? ' dim' : '') }, label));
    }

    // Curriculum-complete celebration — shown once boss7 falls.
    function graduationSheet(result) {
      const st = Store.state;
      const order = Store.liveOrder();
      const products = ['Gain', 'Tremolo', 'Delay', 'Chorus', 'Distortion', 'Filter', 'Mono', 'Poly', 'Sampler', 'Motion FX', 'Signature'];
      UI.sheet([
        el('div', { class: 'center col', style: 'gap:8px; padding:6px 0' },
          el('div', { class: 'eyebrow amber', style: 'justify-content:center' }, '★ CURRICULUM COMPLETE ★'),
          el('div', { class: 'h-display' }, 'RELEASE APPROVED — YOU GRADUATE'),
          el('p', { class: 'small dim' }, 'Seven zones. ' + order.length + ' stations. ' + result.correct + '/' + result.total + ' final QA defects cleared. From "what is a variable?" to signing a commercial release: every stage of this instrument — and this skill — is yours.')),
        el('div', { class: 'card raised col', style: 'gap:8px' },
          el('div', { class: 'eyebrow phos' }, 'FIRST SIGNAL — THE WHOLE JOURNEY'),
          Viz.render({ t: 'fstimeline' })),
        el('div', { class: 'card raised' },
          el('div', { class: 'eyebrow phos' }, 'THE TXPPS PRODUCT LINE — ALL SHIPPED'),
          el('div', { class: 'chips mt-m' }, products.map((p) => el('span', { class: 'chip' }, 'TXPPS ' + p + ' ✓')))),
        el('div', { class: 'card raised center', style: 'padding:14px' },
          el('div', { class: 'a-name', style: 'font-size:14px; color:var(--amber)' }, '★ GRADUATE ★'),
          el('p', { class: 'small dim mt-s' }, 'The highest achievement is yours, and your profile now carries permanent Graduate status. Total XP: ' + st.xp.toLocaleString() + '.')),
        el('button', { class: 'btn primary block', onclick: () => App.go('profile') }, 'View your Graduate profile'),
        el('button', { class: 'btn ghost block', onclick: () => App.go('map') }, 'Back to the map'),
      ], { sticky: true });
    }
    return main;
  }

  /* =====================================================================
     PRACTICE MODE
     ===================================================================== */
  function practice() {
    const weak = Store.weakList();
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'PRACTICE MODE'),
      el('h1', { class: 'h-display' }, 'The woodshed'),
      el('p', { class: 'small dim', style: 'max-width:62ch' }, 'Every question you miss lands here. Clear it with a correct first-try answer to remove it from the queue (+' + XP_RULES.practiceQuestion + ' XP each).')));

    if (weak.length === 0) {
      main.appendChild(el('div', { class: 'card center', style: 'padding:32px 16px' },
        el('div', { style: 'font-size:30px' }, '✓'),
        el('div', { class: 'h-display mt-s', style: 'font-size:16px' }, 'Queue clear'),
        el('p', { class: 'small dim mt-s' }, 'Nothing to review. Keep progressing — anything you miss shows up here.'),
        el('button', { class: 'btn primary', style: 'margin-top:14px', onclick: () => App.go('dashboard') }, 'Back to dashboard')));
      return main;
    }

    main.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow' }, 'WEAK CONCEPTS'),
      el('div', { class: 'chips mt-m' }, Store.weakConcepts().map((w) => el('span', { class: 'chip weak' }, conceptLabel(w.concept) + ' ×' + w.n)))));

    const session = weak.slice(0, 5);
    main.appendChild(el('div', { class: 'card col', style: 'gap:10px' },
      el('div', { class: 'row between' },
        el('div', { class: 'eyebrow amber' }, 'REVIEW SESSION'),
        el('span', { class: 'mono small dim tnum' }, session.length + ' of ' + weak.length + ' queued')),
      el('button', { class: 'btn primary block', onclick: () => App.go('practiceRun') }, 'Start session')));
    return main;
  }

  function practiceRun() {
    const weak = Store.weakList().slice(0, 5);
    if (weak.length === 0) return practice();
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('practice') }, UI.icon('back'), ' EXIT PRACTICE')));
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow amber' }, 'REVIEW SESSION'),
      el('h1', { class: 'h-display' }, 'Clear the queue')));

    let cleared = 0;
    main.appendChild(el('div', { class: 'card' }, sequenceRunner({
      eyebrow: 'PRACTICE',
      questions: weak.map((w) => ({ q: Engine.QINDEX[w.qid].q })),
      baseXp: 0, // XP is awarded per cleared question below
      nodeId: 'practice',
      onQuestionResolved: (item, res) => {
        if (res.firstTry) {
          Store.clearWeak(item.q.qid);
          cleared += 1;
          App.awardXp(XP_RULES.practiceQuestion);
        }
      },
      onFinish: () => {
        UI.sheet([
          el('div', { class: 'center col', style: 'gap:10px; padding:6px 0' },
            el('div', { class: 'eyebrow phos', style: 'justify-content:center' }, 'SESSION DONE'),
            el('div', { class: 'h-display' }, cleared + ' cleared from the queue'),
            el('div', { class: 'xp-pop', style: 'font-size:22px' }, '+' + (cleared * XP_RULES.practiceQuestion) + ' XP')),
          el('button', { class: 'btn primary block', onclick: () => App.go('practice') }, 'Back to Practice'),
          el('button', { class: 'btn ghost block', onclick: () => App.go('dashboard') }, 'Dashboard'),
        ], { sticky: true });
      },
    })));
    return main;
  }

  /* =====================================================================
     DAILY CHALLENGE
     ===================================================================== */
  function daily() {
    const d = Store.dailyToday();
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('dashboard') }, UI.icon('back'), ' BACK')));
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow amber' }, UI.icon('zap'), ' DAILY CHALLENGE — ' + d.date),
      el('h1', { class: 'h-display' }, 'One take, every day')));

    if (!d.qid || !Engine.QINDEX[d.qid]) {
      main.appendChild(el('div', { class: 'card' }, el('p', { class: 'dim' }, 'No daily challenge available.')));
      return main;
    }

    if (d.done) {
      main.appendChild(el('div', { class: 'card center', style: 'padding:32px 16px' },
        el('div', { style: 'font-size:30px' }, d.correct ? '✓' : '—'),
        el('div', { class: 'h-display mt-s', style: 'font-size:16px' }, d.correct ? 'Today\'s take is in the can' : 'Done for today'),
        el('p', { class: 'small dim mt-s' }, 'A fresh challenge lands at midnight. Streak: ' + Store.state.streak.count + ' ' + (Store.state.streak.count === 1 ? 'day' : 'days') + '.'),
        el('button', { class: 'btn primary', style: 'margin-top:14px', onclick: () => App.go('dashboard') }, 'Dashboard')));
      return main;
    }

    const q = Engine.QINDEX[d.qid].q;
    const holder = el('div', { class: 'card col', style: 'gap:12px' },
      el('div', { class: 'row between' },
        el('span', { class: 'eyebrow amber' }, '+' + XP_RULES.daily + ' XP FIRST TRY'),
        el('span', { class: 'mono small faint' }, conceptLabel(q.concept))));
    holder.appendChild(questionView(q, {
      onWrongAttempt: () => Store.markWeak(q.qid, Engine.QINDEX[d.qid].nodeId, q.concept),
      onResolved: (res) => {
        Store.completeDaily(d.date, res.correct);
        if (res.correct) App.awardXp(res.firstTry ? XP_RULES.daily : XP_RULES.daily / 2);
        App.flushAchievements();
        holder.appendChild(el('div', { class: 'action-bar' },
          el('button', { class: 'btn primary block', onclick: () => App.go('dashboard') }, 'Done — Dashboard')));
      },
    }));
    main.appendChild(holder);
    return main;
  }

  /* =====================================================================
     GLOSSARY
     ===================================================================== */
  function glossary() {
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'SIGNAL DICTIONARY'),
      el('h1', { class: 'h-display' }, 'The signal dictionary'),
      el('p', { class: 'small dim', style: 'max-width:62ch' }, DICT.length + ' terms — each one a mini-lesson: plain English, why it matters, a studio take, and where it appears in the curriculum.'),
      el('div', { class: 'mastery-legend' }, Dict.LEVELS.map((l) => l.glyph + ' ' + l.label).join('   '))));

    let filter = '';
    let cat = 'ALL';

    const search = el('input', { type: 'search', placeholder: 'Search — try "memory", "volume", "wobble"…', 'aria-label': 'Search the signal dictionary',
      oninput: (e) => { filter = e.target.value; renderList(); } });
    main.appendChild(el('div', { class: 'search-row' }, search));

    const chipRow = el('div', { class: 'cat-row' });
    DICT_CATS.forEach((c) => {
      chipRow.appendChild(el('button', { class: 'chip', onclick: () => { Sfx.tap(); cat = c; renderChips(); renderList(); } }, c));
    });
    function renderChips() {
      [...chipRow.children].forEach((b, i) => {
        const on = DICT_CATS[i] === cat;
        b.style.borderColor = on ? 'var(--phos)' : '';
        b.style.color = on ? 'var(--phos)' : '';
      });
    }
    renderChips();
    main.appendChild(chipRow);

    const listCard = el('div', { class: 'card' });
    main.appendChild(listCard);

    function renderList() {
      const items = Dict.search(filter, cat);
      if (items.length === 0) {
        listCard.replaceChildren(el('p', { class: 'dim small', style: 'padding:8px 0' }, 'No terms match. Try a shorter search — or a producer word like "wobble" or "volume".'));
        return;
      }
      listCard.replaceChildren(...items.map((g) => {
        const m = Dict.mastery(g);
        const btn = el('button', { class: 'gloss-term', onclick: () => { Sfx.tap(); Dict.open(g.id); } },
          el('span', { class: 'gloss-glyph', style: 'color:' + (m.level >= 2 ? 'var(--phos)' : (m.level === 1 ? 'var(--amber)' : 'var(--ink-faint)')), 'aria-label': m.label }, m.glyph),
          el('span', { class: 't' }, g.t),
          el('span', { class: 'c' }, g.c));
        return el('div', { class: 'gloss-item' }, btn);
      }));
    }
    renderList();
    return main;
  }

  /* =====================================================================
     PROFILE & PROGRESS
     ===================================================================== */
  /* =====================================================================
     PROFILES — welcome, reusable form, and the expanded profile page
     ===================================================================== */
  function avatarBadge(emoji, cls) {
    return el('div', { class: 'avatar-badge ' + (cls || ''), 'aria-hidden': 'true' }, emoji || '🎹');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function fmtWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - d.getTime();
    const day = 86400000;
    if (diff < 0) return 'just now';
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < day) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 2 * day) return 'yesterday';
    if (diff < 7 * day) return Math.floor(diff / day) + ' days ago';
    return fmtDate(iso);
  }

  // Reusable identity form → { node, read() }. read() validates and returns
  // {displayName, username, bio, avatar}, or null after showing an inline error.
  function profileFormFields(initial) {
    initial = initial || {};
    const nameIn = el('input', { class: 'txt', type: 'text', maxlength: '40', placeholder: 'e.g. Hunter', value: initial.displayName || '', 'aria-label': 'Display name', autocomplete: 'off', autocapitalize: 'words' });
    const userIn = el('input', { class: 'txt', type: 'text', maxlength: '24', placeholder: 'e.g. hunter_beats', value: initial.username || '', 'aria-label': 'Username', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const bioIn = el('textarea', { class: 'txt bio', maxlength: '280', rows: '3', placeholder: 'Optional — what do you make? (synthwave, hip-hop, film scores…)', 'aria-label': 'Bio' });
    bioIn.value = initial.bio || '';
    let userEdited = !!initial.username;
    userIn.addEventListener('input', () => { userEdited = true; });
    nameIn.addEventListener('input', () => {
      if (!userEdited) userIn.value = nameIn.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    });
    let chosen = initial.avatar || Store.AVATARS[0];
    const grid = el('div', { class: 'avatar-grid' });
    Store.AVATARS.forEach((a) => {
      const b = el('button', { class: 'avatar-opt' + (a === chosen ? ' on' : ''), type: 'button', 'aria-label': 'Choose avatar ' + a, onclick: () => {
        chosen = a; Sfx.tap();
        [...grid.children].forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
      } }, a);
      grid.appendChild(b);
    });
    const err = el('div', { class: 'form-err', role: 'alert' });
    const node = el('div', { class: 'col', style: 'gap:14px' },
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Display name'), nameIn),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Username'), userIn),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Bio (optional)'), bioIn),
      el('div', { class: 'field' }, el('span', { class: 'field-label' }, 'Pick an avatar'), grid),
      err);
    function read() {
      const displayName = nameIn.value.trim();
      const username = userIn.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!displayName) { err.textContent = 'A display name helps — even just a first name.'; nameIn.focus(); return null; }
      if (!username) { err.textContent = 'Pick a username — letters, numbers and underscores.'; userIn.focus(); return null; }
      err.textContent = '';
      return { displayName, username, bio: bioIn.value.trim(), avatar: chosen };
    }
    return { node, read };
  }

  // First-launch modal CARD (app.js mounts it inside the fixed overlay). Single
  // profile only — no "add profile", no switching.
  function welcome(opts) {
    opts = opts || {};
    const form = profileFormFields();
    const submit = () => { const v = form.read(); if (!v) return; Sfx.tap(); Store.createProfile(v); if (opts.onDone) opts.onDone(v); };
    const card = el('div', { class: 'welcome-card card raised col', style: 'gap:16px', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Set up your profile' },
      el('div', { class: 'brand welcome-brand' }, el('span', { class: 'led' }), el('span', null, 'TXPPS '), el('b', null, 'VST CODE LAB')),
      el('div', { class: 'col', style: 'gap:4px' },
        el('div', { class: 'eyebrow phos' }, 'WELCOME TO THE LAB'),
        el('h1', { class: 'h-display' }, 'Set up your profile'),
        el('p', { class: 'small dim' }, 'This profile and your progress are stored locally on this device.')),
      form.node,
      el('button', { class: 'btn primary block', onclick: submit }, 'Start learning'),
      el('p', { class: 'small faint center' }, 'No account, no password, nothing sent anywhere.'));
    return card;
  }

  // One-time migration chooser CARD (rare: several 1.0.1 profiles, no clear active one).
  function migrationChooser(opts) {
    opts = opts || {};
    const cands = (Store.pendingMigration && Store.pendingMigration.candidates) || [];
    return el('div', { class: 'welcome-card card raised col', style: 'gap:14px', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose your profile' },
      el('div', { class: 'col', style: 'gap:4px' },
        el('div', { class: 'eyebrow amber' }, 'ONE MORE STEP'),
        el('h1', { class: 'h-display' }, 'Choose your profile'),
        el('p', { class: 'small dim' }, 'This version keeps a single local profile. Pick the one to keep — the rest are saved to a backup on this device first. Only one profile can remain active.')),
      el('div', { class: 'col', style: 'gap:10px' }, cands.map((p) =>
        el('button', { class: 'profile-card card-tap', style: 'text-align:left; width:100%', onclick: () => { if (Store.commitMigrationChoice(p.id)) { if (opts.onDone) opts.onDone(); } else { UI.toast('That profile could not be read — pick another.'); } } },
          el('div', { class: 'row', style: 'gap:10px; align-items:center' },
            avatarBadge(p.avatar, 'sm'),
            el('div', { style: 'min-width:0; flex:1' },
              el('div', { class: 'pc-name' }, p.displayName, p.graduate ? el('span', { class: 'amber', style: 'margin-left:4px' }, '★') : null),
              el('div', { class: 'pc-sub' }, '@' + p.username + ' · LV ' + p.level + ' · ' + p.completion + '% · ' + fmtWhen(p.lastPlayed))))))));
  }

  // Edit the single profile identity (shared form) — never regenerates the profile ID.
  function editProfileSheet(after) {
    const form = profileFormFields(Store.profileMeta() || {});
    const s = UI.sheet([
      el('div', { class: 'eyebrow phos' }, 'EDIT PROFILE'),
      el('p', { class: 'small faint' }, 'Progress, XP and achievements stay exactly as they are — this only updates your identity.'),
      form.node,
      el('div', { class: 'row' },
        el('button', { class: 'btn ghost', style: 'flex:1', onclick: () => s.close() }, 'Cancel'),
        el('button', { class: 'btn primary', style: 'flex:1', onclick: () => {
          const v = form.read(); if (!v) return;
          Store.editProfile(v);
          s.close(); UI.toast('Profile updated');
          if (after) after();
        } }, 'Save')),
    ]);
    return s;
  }

  function exportBackupFile() {
    const json = Store.exportProfile();
    if (!json) { UI.toast('Nothing to export yet'); return; }
    const meta = Store.profileMeta();
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'txpps-backup-' + (meta ? meta.username : 'profile') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      UI.toast('Backup exported to a file');
    } catch (e) {
      try { if (navigator.clipboard) navigator.clipboard.writeText(json); UI.toast('Backup JSON copied to clipboard'); } catch (e2) { UI.toast('Export blocked here'); }
    }
  }

  // Import a backup as THE single profile. If one already exists, preview + confirm
  // the replacement (Store backs the current one up automatically first).
  function importReplaceSheet(after) {
    const ta = el('textarea', { class: 'io', placeholder: 'Paste exported backup JSON here…', 'aria-label': 'Backup JSON' });
    const file = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    file.addEventListener('change', () => { const f = file.files && file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { ta.value = String(rd.result || ''); }; rd.readAsText(f); });
    const doImport = () => {
      if (!ta.value.trim()) { UI.toast('Paste JSON or choose a file first'); return; }
      const p = Store.parseImport(ta.value);
      if (!p.ok) { UI.toast(p.error); return; }
      const m = p.meta; const hasCur = Store.hasProfile;
      UI.confirmSheet(hasCur ? 'Replace your profile?' : 'Import this profile?',
        (hasCur ? 'This REPLACES your current profile and progress. Your current profile is saved to a local backup first, so it can be recovered. ' : '') +
        'Importing: ' + m.displayName + ' (@' + m.username + ') — ' + m.completion + '% complete, LV ' + m.level + '.',
        hasCur ? 'Replace' : 'Import', () => {
          const r = Store.importProfileText(ta.value);
          if (r.ok) { s.close(); if (after) after(); App.reboot(); UI.toast(hasCur ? 'Profile replaced from backup' : 'Profile imported'); }
          else UI.toast(r.error);
        }, hasCur);
    };
    const s = UI.sheet([
      el('div', { class: 'eyebrow phos' }, 'IMPORT BACKUP'),
      el('p', { class: 'small dim' }, Store.hasProfile
        ? 'Load a backup you exported before. It replaces your current single profile — your current one is backed up first, and no second profile is created.'
        : 'Load a backup you exported before to restore your profile.'),
      el('button', { class: 'btn sm', onclick: () => file.click() }, 'Choose a file…'),
      ta,
      el('div', { class: 'row' },
        el('button', { class: 'btn ghost', style: 'flex:1', onclick: () => s.close() }, 'Cancel'),
        el('button', { class: 'btn primary', style: 'flex:1', onclick: doImport }, 'Continue')),
    ]);
    return s;
  }

  function profile() {
    const st = Store.state;
    const lv = Store.level();
    const order = Store.liveOrder();
    const doneCount = order.filter(Store.isDone).length;
    const pct = order.length ? Math.round((doneCount / order.length) * 100) : 0;
    const next = Store.nextNode();
    const curId = next || st.currentNode || order[0];
    const curNode = curId ? Engine.NODES[curId] : null;
    const curZone = curId ? Store.zoneOfNode(curId) : null;
    const grad = Store.isDone('boss7');
    const dictPct = DICT.length ? Math.round(((st.dictViewed || []).length / DICT.length) * 100) : 0;
    const main = el('div', { class: 'main' });

    // hero
    main.appendChild(el('div', { class: 'card profile-hero col', style: 'gap:12px' },
      el('div', { class: 'row', style: 'gap:14px; align-items:center' },
        avatarBadge(st.avatar, 'lg'),
        el('div', { style: 'min-width:0; flex:1' },
          el('div', { class: 'eyebrow ' + (grad ? 'amber' : 'phos') }, grad ? '★ GRADUATE — OPERATOR PROFILE' : 'OPERATOR PROFILE'),
          el('h1', { class: 'h-display', style: 'margin-top:2px' }, st.displayName || 'Producer'),
          el('div', { class: 'small dim' }, '@' + (st.username || 'producer') + ' · LV ' + lv + ' — ' + Store.levelTitle())),
        el('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => App.go('settings') }, UI.icon('gear'))),
      st.bio ? el('p', { class: 'small', style: 'color:var(--ink-dim)' }, st.bio) : null,
      el('div', { class: 'row wrap', style: 'gap:8px' },
        el('button', { class: 'btn sm', onclick: () => editProfileSheet(() => App.go('profile')) }, 'Edit profile'))));

    if (grad) {
      main.appendChild(el('div', { class: 'card', style: 'border-color:var(--amber); background:linear-gradient(180deg, rgba(240,180,80,0.07), var(--bg1))' },
        el('div', { class: 'eyebrow amber' }, '★ TXPPS VST CODE LAB — GRADUATE'),
        el('p', { class: 'small dim mt-s' }, 'Every zone cleared, every product shipped, the Release Candidate signed. This status is permanent — like the skills.')));
    }

    main.appendChild(el('div', { class: 'statgrid' },
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, st.xp.toLocaleString()), el('div', { class: 'k' }, 'Total XP')),
      el('div', { class: 'stat amber' }, el('div', { class: 'v tnum' }, String(st.streak.count || 0)), el('div', { class: 'k' }, 'Day streak')),
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, pct + '%'), el('div', { class: 'k' }, 'Complete')),
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, doneCount + '/' + order.length), el('div', { class: 'k' }, 'Nodes cleared'))));

    // snapshot
    const snapRow = (k, v) => el('div', { class: 'row between snap-row' }, el('span', { class: 'small faint' }, k), el('span', { class: 'small', style: 'text-align:right' }, v));
    main.appendChild(el('div', { class: 'card col', style: 'gap:0' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'SNAPSHOT'),
      snapRow('Rank', 'LV ' + lv + ' — ' + Store.levelTitle()),
      snapRow('Graduate status', grad ? '★ Graduate' : 'In progress'),
      snapRow('Current zone', curZone ? ('Zone ' + curZone.num + ' — ' + curZone.title) : '—'),
      snapRow('Current lesson', grad ? 'Curriculum complete' : (curNode ? curNode.title : '—')),
      snapRow('Dictionary', dictPct + '% explored'),
      snapRow('Last active', fmtWhen(st.lastPlayed)),
      snapRow('Profile created', fmtDate(st.createdAt))));

    // achievements
    main.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow' }, 'ACHIEVEMENTS — ' + st.achievements.length + '/' + ACHIEVEMENTS.length),
      el('div', { class: 'ach-grid mt-m' }, ACHIEVEMENTS.map((a) =>
        el('div', { class: 'ach' + (st.achievements.includes(a.id) ? ' got' : '') },
          el('div', { class: 'a-name' }, a.name),
          el('div', { class: 'a-desc' }, a.desc))))));

    // lesson mastery table
    main.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow' }, 'LESSON MASTERY'),
      el('div', { class: 'col mt-m', style: 'gap:2px' }, [...ZONE1_LESSONS, ...ZONE2_LESSONS, ...ZONE3_LESSONS, ...ZONE4_LESSONS, ...ZONE5_LESSONS, ...ZONE6_LESSONS, ...ZONE7_LESSONS].map((l) => {
        const ns = st.nodes[l.id];
        return el('button', { class: 'row between card-tap', style: 'border:none; padding:9px 2px; min-height:44px', onclick: () => { if (Store.isUnlocked('z1', l.id)) App.openNode(l.id); else UI.toast('Locked — progress through the map first'); } },
          el('span', { class: 'small', style: 'text-align:left' }, l.title),
          ns && ns.done ? UI.stars(ns.stars) : el('span', { class: 'mono small faint' }, Store.isUnlocked('z1', l.id) ? 'NOT DONE' : 'LOCKED'));
      }))));

    main.appendChild(el('button', { class: 'btn block', onclick: () => App.go('settings') }, 'Settings & data'));
    return main;
  }

  /* =====================================================================
     SETTINGS
     ===================================================================== */
  function settings() {
    const st = Store.state;
    const main = el('div', { class: 'main' });
    main.appendChild(el('div', { class: 'back-row' },
      el('button', { class: 'back-btn', onclick: () => App.go('profile') }, UI.icon('back'), ' BACK')));
    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'eyebrow phos' }, 'SETTINGS'),
      el('h1', { class: 'h-display' }, 'The patch bay')));

    function toggleRow(name, desc, key) {
      const sw = el('button', { class: 'switch' + (st.settings[key] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!st.settings[key]), 'aria-label': name, onclick: () => {
        Store.setSetting(key, !Store.state.settings[key]);
        sw.classList.toggle('on');
        sw.setAttribute('aria-checked', String(Store.state.settings[key]));
        if (key === 'motion') { App.applyMotion(); App.go('settings'); }
        Sfx.tap();
      } }, el('i'));
      return el('div', { class: 'set-row' },
        el('div', null, el('div', { class: 'set-name' }, name), el('div', { class: 'set-desc' }, desc)),
        sw);
    }

    function codeSizeRow() {
      const seg = el('div', { class: 'seg' });
      ['s', 'm', 'l'].forEach((size) => {
        const b = el('button', { class: st.settings.codeSize === size ? 'on' : '', onclick: () => {
          Store.setSetting('codeSize', size);
          [...seg.children].forEach((c, i) => c.classList.toggle('on', ['s', 'm', 'l'][i] === size));
          App.applyCodeSize();
        } }, size.toUpperCase());
        seg.appendChild(b);
      });
      return el('div', { class: 'set-row' },
        el('div', null, el('div', { class: 'set-name' }, 'Code text size'), el('div', { class: 'set-desc' }, 'Size of code panels.')),
        seg);
    }
    main.appendChild(el('div', { class: 'card' },
      toggleRow('Motion & animation', 'Scope animation and screen transitions.', 'motion'),
      codeSizeRow()));

    /* ---- v1.1.0 game-feel controls ---- */
    const G = Game.gs();
    function segRow(name, desc, cur, opts, onPick) {
      const seg = el('div', { class: 'seg' });
      opts.forEach(([val, label]) => {
        const b = el('button', { class: cur === val ? 'on' : '', 'aria-pressed': String(cur === val), onclick: () => { [...seg.children].forEach((c) => c.classList.remove('on')); b.classList.add('on'); onPick(val); } }, label);
        seg.appendChild(b);
      });
      return el('div', { class: 'set-row' }, el('div', null, el('div', { class: 'set-name' }, name), el('div', { class: 'set-desc' }, desc)), seg);
    }
    function gToggle(name, desc, val, onToggle, disabled) {
      const sw = el('button', { class: 'switch' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(!!val), 'aria-disabled': String(!!disabled), 'aria-label': name, onclick: () => { if (disabled) return; const nv = !sw.classList.contains('on'); sw.classList.toggle('on', nv); sw.setAttribute('aria-checked', String(nv)); onToggle(nv); } }, el('i'));
      if (disabled) sw.style.opacity = '0.4';
      return el('div', { class: 'set-row' }, el('div', null, el('div', { class: 'set-name' }, name), el('div', { class: 'set-desc' }, desc)), sw);
    }
    function volRow(name, key, val) {
      const out = el('span', { class: 'mono small dim', style: 'min-width:30px; text-align:right' }, String(val));
      const range = el('input', { type: 'range', min: '0', max: '100', step: '5', value: String(val), class: 'vol', 'aria-label': name });
      range.addEventListener('input', () => { out.textContent = range.value; });
      range.addEventListener('change', () => { Store.setGameSetting('audio.' + key, parseInt(range.value, 10)); });
      return el('div', { class: 'set-row' }, el('div', { style: 'min-width:0' }, el('div', { class: 'set-name' }, name)), el('div', { class: 'row', style: 'gap:8px; align-items:center' }, range, out));
    }
    const hStatus = Game.Haptic.status();   // on | off | unsupported
    main.appendChild(el('div', { class: 'card col', style: 'gap:4px' },
      el('div', { class: 'eyebrow phos', style: 'margin-bottom:4px' }, 'WORKSHOP & GAME FEEL'),
      segRow('PATCH presence', 'How often PATCH the assistant reacts.', G.patch, [['full', 'FULL'], ['balanced', 'BAL'], ['minimal', 'MIN'], ['hidden', 'OFF']], (v) => { Store.setGameSetting('patch', v); Game.Patch.applyPresence(); }),
      segRow('Effects intensity', 'Strength of reaction animation.', G.effects, [['full', 'FULL'], ['balanced', 'BAL'], ['minimal', 'MIN']], (v) => Store.setGameSetting('effects', v)),
      segRow('Reduced motion (reactions)', 'AUTO follows your system + Motion switch.', G.reducedMotion, [['system', 'AUTO'], ['on', 'ON'], ['off', 'OFF']], (v) => Store.setGameSetting('reducedMotion', v)),
      gToggle('Particles', 'Small signal particles on milestones.', G.particles, (nv) => Store.setGameSetting('particles', nv)),
      gToggle('Screen shake', 'Off by default; reserved for future events.', G.screenShake, (nv) => Store.setGameSetting('screenShake', nv)),
      gToggle('Haptic feedback', hStatus === 'unsupported' ? 'Unsupported on this device / browser.' : 'Short vibration on supported devices.', hStatus === 'on', (nv) => Store.setGameSetting('haptics', nv), hStatus === 'unsupported')));

    main.appendChild(el('div', { class: 'card col', style: 'gap:4px' },
      el('div', { class: 'eyebrow phos', style: 'margin-bottom:2px' }, 'GAME AUDIO'),
      el('p', { class: 'small faint', style: 'margin-bottom:6px' }, 'Sound starts only after your first tap (browser policy) and never plays before that.'),
      gToggle('Game audio', 'Master enable for all game sounds.', G.audio.enabled, (nv) => Store.setGameSetting('audio.enabled', nv)),
      volRow('Master volume', 'master', G.audio.master),
      volRow('UI sounds', 'ui', G.audio.ui),
      volRow('Feedback sounds', 'feedback', G.audio.feedback),
      volRow('Celebration sounds', 'celebration', G.audio.celebration),
      volRow('PATCH sounds', 'patch', G.audio.patch),
      el('div', { class: 'row wrap', style: 'gap:8px; margin-top:8px' },
        el('button', { class: 'btn sm', onclick: () => { Game.Audio.unlock(); Game.Audio.play('CORRECT'); } }, 'Test sound'),
        el('button', { class: 'btn sm ghost', onclick: () => { Store.setGameSetting('audio', Object.assign({}, Game.settingsDefaults.audio)); UI.toast('Audio reset to defaults'); App.go('settings'); } }, 'Restore audio defaults'))));

    // data management
    const ioArea = el('textarea', { class: 'io', placeholder: 'Your backup JSON appears here when you tap Export.', 'aria-label': 'Backup JSON' });
    main.appendChild(el('div', { class: 'card col', style: 'gap:10px' },
      el('div', { class: 'eyebrow' }, 'BACKUP & DATA'),
      el('p', { class: 'small faint' }, Store.storageOk
        ? 'Your profile saves automatically to local storage on this device. Export a backup to keep a copy or move it to another device; Import restores a backup, replacing the current profile (the current one is backed up first).'
        : '⚠ Local storage is blocked in this browser — export a backup to keep your profile, since it can\'t be saved here.'),
      ioArea,
      el('div', { class: 'row wrap' },
        el('button', { class: 'btn sm', onclick: () => {
          ioArea.value = Store.exportJson();
          ioArea.select();
          emitG('BACKUP_EXPORTED', {});
          try { navigator.clipboard && navigator.clipboard.writeText(ioArea.value); UI.toast('Backup JSON copied to clipboard'); } catch (e) { UI.toast('JSON in the text box — copy it manually'); }
        } }, 'Export backup'),
        el('button', { class: 'btn sm', onclick: () => { emitG('BACKUP_EXPORTED', {}); exportBackupFile(); } }, 'Download file'),
        el('button', { class: 'btn sm ghost', onclick: () => importReplaceSheet() }, 'Import backup'))));

    main.appendChild(el('div', { class: 'card col', style: 'gap:10px' },
      el('div', { class: 'eyebrow red' }, 'DANGER ZONE'),
      el('p', { class: 'small faint' }, 'A full reset returns the app to its first-launch state.'),
      el('button', { class: 'btn danger block', onclick: () => {
        UI.confirmSheet('RESET LOCAL PROFILE AND PROGRESS', 'This permanently removes your profile identity, all course progress, achievements, settings, and local backups on this device, then returns to the welcome screen. This cannot be undone — export a backup first if you might want any of it back.', 'Reset everything', () => {
          Store.resetProfile();
          App.showWelcome();
        }, true);
      } }, 'Reset local profile and progress')));

    main.appendChild(el('div', { class: 'card col', style: 'gap:8px' },
      el('div', { class: 'eyebrow' }, 'ABOUT'),
      el('p', { class: 'small dim' }, 'TXPPS VST CODE LAB — an interactive training ground for JUCE / VST3 development in modern C++. All seven zones are playable, carrying you from your first C++ signal to a commercial VST3 and Graduate status. This is Version 1.0.2, with a single local learner profile stored on this device.'),
      el('p', { class: 'small faint' }, 'Honesty note: this app runs entirely in your browser with no C++ compiler. All compiler output is deterministic and clearly labeled "Simulated Compiler Feedback". Code samples are educational excerpts, simplified on purpose — not production-ready plugin code.')));
    return main;
  }

  return { dashboard, map, lesson, challenge, project, boss, practice, practiceRun, daily, glossary, profile, settings, welcome, migrationChooser, questionView, sequenceRunner, nodeKindLabel, conceptLabel };
})();
