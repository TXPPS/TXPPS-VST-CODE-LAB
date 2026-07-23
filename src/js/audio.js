/* ============================================================
   Sfx — compatibility shim. Historically a tiny standalone blip
   synth; as of v1.1.0 all sound is owned by the Audio Director in
   game.js. These delegators keep existing call sites working while
   routing (or intentionally muting) them so nothing double-fires:
   press sounds go through UI_PRESS; correct/wrong/level are driven
   by the ANSWER_* / RANK_UP events instead. Safe if Game is absent.
   ============================================================ */

const Sfx = (() => {
  function A() { return (typeof Game !== 'undefined' && Game.Audio) ? Game.Audio : null; }
  return {
    tap() { const a = A(); if (a) a.play('UI_PRESS'); },
    correct() { /* handled by ANSWER_CORRECT via the Audio Director */ },
    wrong() { /* handled by ANSWER_INCORRECT via the Audio Director */ },
    levelUp() { /* handled by RANK_UP via the Audio Director */ },
  };
})();
