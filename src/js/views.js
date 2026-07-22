/* ============================================================
   Views — every screen + the shared question runner.
   All views are functions returning a DOM element; App handles
   routing, the top bar and the tab bar.
   ============================================================ */

const Views = (() => {
  const { el, fmt } = UI;

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

    const root = el('div', { class: 'col', style: 'gap:12px' });
    const feedbackSlot = el('div', { 'aria-live': 'polite' });
    const controls = el('div', { class: 'col', style: 'gap:10px' });

    function resolve(correct, revealed) {
      if (resolved) return;
      resolved = true;
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
        el('div', { class: 'eyebrow phos' }, 'ALL CURRENT ZONES COMPLETE'),
        el('div', { class: 'h-sub mt-s' }, 'You\'ve cleared everything currently built. Sharpen mastery in Practice Mode, or replay any node from the map. The next zone arrives in a future update.')));
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
      el('p', { class: 'small dim' }, 'Zone 1 is fully playable now. Later zones show their planned curriculum and unlock in future updates.')));

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
            completionSheet(node, result, Store.starsFor(result.firstTry, result.total));
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
  function profile() {
    const st = Store.state;
    const lv = Store.level();
    const mastery = Store.zoneMastery();
    const order = Store.liveOrder();
    const doneCount = order.filter(Store.isDone).length;
    const main = el('div', { class: 'main' });

    main.appendChild(el('div', { class: 'col gap-s' },
      el('div', { class: 'row between' },
        el('div', null,
          el('div', { class: 'eyebrow phos' }, 'OPERATOR PROFILE'),
          el('h1', { class: 'h-display' }, 'LV ' + lv + ' — ' + Store.levelTitle())),
        el('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => App.go('settings') }, UI.icon('gear')))));

    main.appendChild(el('div', { class: 'statgrid' },
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, st.xp.toLocaleString()), el('div', { class: 'k' }, 'Total XP')),
      el('div', { class: 'stat amber' }, el('div', { class: 'v tnum' }, String(st.streak.count || 0)), el('div', { class: 'k' }, 'Day streak')),
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, doneCount + '/' + order.length), el('div', { class: 'k' }, 'Nodes cleared')),
      el('div', { class: 'stat' }, el('div', { class: 'v tnum' }, mastery.pct + '%'), el('div', { class: 'k' }, 'Zone 1 mastery'))));

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
      el('div', { class: 'col mt-m', style: 'gap:2px' }, [...ZONE1_LESSONS, ...ZONE2_LESSONS, ...ZONE3_LESSONS, ...ZONE4_LESSONS].map((l) => {
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

    main.appendChild(el('div', { class: 'card' },
      toggleRow('Feedback sounds', 'Small synth blips on answers and level-ups.', 'sound'),
      toggleRow('Motion & animation', 'Scope animation and transitions.', 'motion'),
      (() => {
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
      })()));

    // data
    const ioArea = el('textarea', { class: 'io', placeholder: 'Exported JSON appears here. To import: paste JSON here, then tap Import.', 'aria-label': 'Progress JSON' });
    main.appendChild(el('div', { class: 'card col', style: 'gap:10px' },
      el('div', { class: 'eyebrow' }, 'PROGRESS DATA'),
      el('p', { class: 'small faint' }, Store.storageOk
        ? 'Progress saves automatically to this browser\'s local storage.'
        : '⚠ Local storage is blocked in this browser — export JSON to keep your progress.'),
      ioArea,
      el('div', { class: 'row wrap' },
        el('button', { class: 'btn sm', onclick: () => {
          ioArea.value = Store.exportJson();
          ioArea.select();
          try { navigator.clipboard && navigator.clipboard.writeText(ioArea.value); UI.toast('Progress JSON copied to clipboard'); } catch (e) { UI.toast('JSON in the text box — copy it manually'); }
        } }, 'Export'),
        el('button', { class: 'btn sm', onclick: () => {
          if (!ioArea.value.trim()) { UI.toast('Paste exported JSON into the box first'); return; }
          const r = Store.importJson(ioArea.value);
          if (r.ok) { UI.toast('Progress imported'); App.go('dashboard'); }
          else UI.toast(r.error);
        } }, 'Import'),
        el('button', { class: 'btn sm', onclick: () => {
          try {
            const blob = new Blob([Store.exportJson()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'txpps-vst-code-lab-progress.json';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
          } catch (e) { UI.toast('Download blocked here — use Export + copy instead'); }
        } }, 'Download file'))));

    main.appendChild(el('div', { class: 'card col', style: 'gap:10px' },
      el('div', { class: 'eyebrow red' }, 'DANGER ZONE'),
      el('button', { class: 'btn danger block', onclick: () => {
        UI.confirmSheet('RESET ALL PROGRESS?', 'XP, stars, streak, achievements and the practice queue will be wiped. This cannot be undone (export first if unsure).', 'Wipe everything', () => {
          Store.reset();
          UI.toast('Progress reset');
          App.go('dashboard');
        }, true);
      } }, 'Reset progress')));

    main.appendChild(el('div', { class: 'card col', style: 'gap:8px' },
      el('div', { class: 'eyebrow' }, 'ABOUT'),
      el('p', { class: 'small dim' }, 'TXPPS VST CODE LAB — an interactive training ground for JUCE / VST3 development in modern C++. Zone 1 (C++ Signal Path) is fully playable; Zones 2–7 are mapped and arrive in future updates.'),
      el('p', { class: 'small faint' }, 'Honesty note: this app runs entirely in your browser with no C++ compiler. All compiler output is deterministic and clearly labeled "Simulated Compiler Feedback". Code samples are educational excerpts, simplified on purpose — not production-ready plugin code.')));
    return main;
  }

  return { dashboard, map, lesson, challenge, project, boss, practice, practiceRun, daily, glossary, profile, settings, questionView, sequenceRunner, nodeKindLabel, conceptLabel };
})();
