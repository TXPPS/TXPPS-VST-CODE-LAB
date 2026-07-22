/* ============================================================
   Challenge engine — pure logic, no DOM.
   Builds the question index and evaluates answers deterministically.
   All "compiler" feedback in this app is simulated and labeled so.
   ============================================================ */

const Engine = (() => {

  /* ---- content index ------------------------------------------------ */
  // NODES: id -> node object (lesson/challenge/project/boss)
  // QINDEX: qid -> { q, nodeId, ctx } for practice/daily reuse
  const NODES = {};
  const QINDEX = {};

  function indexAll() {
    const all = [...ZONE1_LESSONS, ...ZONE1_CHALLENGES, ...ZONE2_LESSONS, ...ZONE2_CHALLENGES];
    for (const node of all) {
      NODES[node.id] = node;
      const qs = questionsOf(node);
      qs.forEach((q, i) => {
        const qid = node.id + '.q' + (i + 1);
        q.qid = qid;
        QINDEX[qid] = { q, nodeId: node.id };
      });
    }
  }

  function questionsOf(node) {
    if (node.kind === 'lesson') return node.checks;
    if (node.kind === 'challenge') return node.questions;
    if (node.kind === 'project') return node.steps.map((s) => s.q);
    if (node.kind === 'boss') return node.stages;
    return [];
  }

  /* ---- deterministic shuffle (stable per qid) ------------------------ */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededShuffle(arr, seedStr) {
    const a = arr.slice();
    let s = seedFrom(seedStr) || 1;
    const rnd = () => {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Shuffled order for an `order` question; guaranteed != correct order.
  function shuffledOrder(q) {
    const idx = q.lines.map((_, i) => i);
    let out = seededShuffle(idx, q.qid || q.prompt);
    if (out.every((v, i) => v === i)) out = seededShuffle(idx, (q.qid || q.prompt) + 'x');
    if (out.every((v, i) => v === i)) out.reverse();
    return out;
  }

  // Shuffled right-column order for a `match` question.
  function shuffledMatch(q) {
    const idx = q.right.map((_, i) => i);
    let out = seededShuffle(idx, (q.qid || q.prompt) + 'm');
    if (out.every((v, i) => v === i)) out.reverse();
    return out;
  }

  /* ---- answer normalization & evaluation ----------------------------- */
  function normalize(s) {
    return String(s || '')
      .replace(/ /g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .trim()
      .replace(/\s+/g, ' ');
  }

  // Loose form: also drop spaces entirely and any single trailing semicolon,
  // so `output[i]=input[i]*gain` matches `output[i] = input[i] * gain;`.
  function loose(s) {
    return normalize(s).replace(/;\s*$/, '').replace(/\s+/g, '');
  }

  function evalFill(q, input) {
    const raw = normalize(input);
    if (!raw) return { correct: false, empty: true, msg: 'Type an answer first.' };

    // Known-mistake patterns get targeted feedback.
    if (q.mistakes) {
      for (const m of q.mistakes) {
        let re = null;
        try { re = new RegExp(m.match, 'i'); } catch (e) { re = null; }
        if (re && re.test(raw)) {
          // Only report as a mistake if it isn't also an accepted answer.
          const isAccepted = q.accept.some((a) => loose(a) === loose(raw));
          if (!isAccepted) return { correct: false, msg: m.msg };
        }
      }
    }
    if (q.forbidden && q.forbidden.some((f) => raw.includes(f))) {
      return { correct: false, msg: 'Not quite — check the hint and look again at the bounds.' };
    }
    const ok = q.accept.some((a) => loose(a) === loose(raw));
    return { correct: ok, msg: ok ? q.explain : null };
  }

  function evalMcq(q, chosenIndex) {
    return { correct: chosenIndex === q.answer };
  }

  function evalOrder(q, arrangement) {
    // arrangement: array of original line indexes, top to bottom.
    const wrong = [];
    arrangement.forEach((orig, pos) => { if (orig !== pos) wrong.push(pos); });
    return { correct: wrong.length === 0, wrongPositions: wrong };
  }

  function evalBugspot(q, lineIndex) {
    return { correct: lineIndex === q.buggy };
  }

  function evalMatch(q, pairs) {
    // pairs: array where pairs[leftIndex] = rightIndex chosen.
    const wrong = [];
    q.left.forEach((_, li) => { if (pairs[li] !== li) wrong.push(li); });
    return { correct: wrong.length === 0, wrongLeft: wrong };
  }

  /* ---- daily challenge ----------------------------------------------- */
  function dailyQid(dateStr) {
    const pool = DAILY_POOL.filter((qid) => QINDEX[qid]);
    if (pool.length === 0) return null;
    return pool[seedFrom(dateStr) % pool.length];
  }

  /* ---- zone helpers --------------------------------------------------- */
  function zoneNodes(zoneId) {
    const z = ZONES.find((z2) => z2.id === zoneId);
    if (!z || !z.nodeOrder) return [];
    return z.nodeOrder.map((id) => NODES[id]).filter(Boolean);
  }

  indexAll();

  return {
    NODES, QINDEX, questionsOf, zoneNodes, dailyQid,
    shuffledOrder, shuffledMatch,
    evalFill, evalMcq, evalOrder, evalBugspot, evalMatch,
    seedFrom,
  };
})();
