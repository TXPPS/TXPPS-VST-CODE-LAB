/* ============================================================
   QaAccess (v1.2.1) — owner-facing QA authorization + mode state.

   HONEST SECURITY MODEL (read this before trusting it):
   This is a browser app with NO trusted backend. This gate is a
   LOCAL QA access control whose only job is to stop accidental
   discovery and ordinary-user access to the owner tooling. It is
   NOT server-grade authorization and cannot stop someone determined
   to read or modify client code. It never:
     - stores the plaintext passphrase (only a one-way verifier hash),
     - transmits anything over a network,
     - persists the passphrase in profile data / storage / exports /
       logs / diagnostics / GameBus payloads.

   The passphrase is checked by hashing SALT+passphrase (SHA-256) and
   comparing to a verifier. The verifier is injected at build time from
   the TXPPS_QA_PASSPHRASE_HASH env var; if that is absent a centralized
   fallback verifier constant is used. Only the verifier ships — never a
   usable secret. Web Crypto is used where available (secure context);
   a self-contained SHA-256 is the fallback so file:// / non-secure
   contexts still work identically.
   ============================================================ */

const QaAccess = (() => {
  const SALT = 'TXPPS::qa::v1::';
  // Build-time injection point: build.mjs replaces the token with the hex of
  // env TXPPS_QA_PASSPHRASE_HASH, or leaves it (→ fallback) when unset.
  const BUILD_VERIFIER = '__TXPPS_QA_VERIFIER__';
  // Centralized fallback verifier — salted SHA-256 of the maintainer passphrase.
  // A one-way hash, not the passphrase. Rotate via the env var (see README).
  const FALLBACK_VERIFIER = '07487d7b4e8fc8764a08b77fadc4cdf792e926e19a2072e9ccf4bbc30020cad9';

  const OWNER_MARKER = 'txpps_qa_owner';   // sessionStorage flag only — NEVER a secret
  const MAX_FAILS = 5;
  const COOLDOWN_MS = 30000;

  let testVerifier = null;   // test-only override (see setTestVerifier)
  let authorized = false;    // owner unlocked this browser session
  let qaOn = false;          // QA simulation mode active (in-memory only; off on reload)
  let fails = 0;
  let cooldownUntil = 0;

  function bus(t, p) { try { if (typeof GameBus !== 'undefined') GameBus.emit(t, p); } catch (e) { /* decorative */ } }
  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }
  function hex64(s) { return typeof s === 'string' && /^[0-9a-f]{64}$/.test(s); }

  function activeVerifier() {
    if (testVerifier) return testVerifier;
    if (hex64(BUILD_VERIFIER)) return BUILD_VERIFIER;   // real build-injected hash
    return FALLBACK_VERIFIER;
  }

  /* ---- SHA-256 ---- Web Crypto when available; a self-contained fallback
     otherwise. Both hash the UTF-8 bytes of the input, so their hex outputs
     are identical and a verifier built with either matches at check time. */
  function utf8(s) { try { return unescape(encodeURIComponent(s)); } catch (e) { return s; } }

  function sha256hexJs(asciiInput) {
    // Compact, stateless SHA-256 (operates on a byte-string, 0..255 per char).
    function rr(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    const maxWord = Math.pow(2, 32);
    let result = '';
    const words = [];
    let ascii = asciiInput;
    const asciiBitLength = ascii.length * 8;
    let hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return null;   // not a byte-string — caller must utf8() first
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = (hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? (w[i] | 0) : (
              (w[i - 16]
                + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
                + w[i - 7]
                + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0
            ))) | 0;
        const temp2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  async function sha256hex(input) {
    const bytes = utf8(input);
    try {
      const subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
      if (subtle) {
        const buf = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i) & 255;
        const digest = await subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through to JS */ }
    return sha256hexJs(bytes);
  }

  /* ---- session marker (no secret) ---- */
  function markOwner(on) {
    try {
      if (on) window.sessionStorage.setItem(OWNER_MARKER, '1');
      else window.sessionStorage.removeItem(OWNER_MARKER);
    } catch (e) { /* sessionStorage unavailable — in-memory `authorized` still holds */ }
  }
  function readOwnerMarker() { try { return window.sessionStorage.getItem(OWNER_MARKER) === '1'; } catch (e) { return false; } }

  function init() {
    // Owner authorization may survive a same-tab reload (session-scoped, no secret);
    // it never survives tab close or browser restart. QA simulation always starts OFF.
    authorized = readOwnerMarker();
    qaOn = false;
  }

  function cooldownRemaining() { const r = cooldownUntil - nowMs(); return r > 0 ? r : 0; }

  // Verify a submitted passphrase. Resolves { ok, cooldownMs } — NEVER echoes the
  // input, its length, or any detail into logs / events / the return value.
  async function verify(passphrase) {
    if (cooldownRemaining() > 0) return { ok: false, cooldownMs: cooldownRemaining() };
    let ok = false;
    try {
      const got = await sha256hex(SALT + String(passphrase == null ? '' : passphrase));
      const want = activeVerifier();
      ok = !!got && got.length === want.length && constantTimeEqual(got, want);
    } catch (e) { ok = false; }
    if (ok) {
      fails = 0; cooldownUntil = 0;
      authorize();
      return { ok: true, cooldownMs: 0 };
    }
    fails += 1;
    if (fails >= MAX_FAILS) { cooldownUntil = nowMs() + COOLDOWN_MS; fails = 0; }
    return { ok: false, cooldownMs: cooldownRemaining() };
  }

  function constantTimeEqual(a, b) {
    let diff = a.length ^ b.length;
    for (let i = 0; i < a.length && i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function authorize() {
    if (authorized) return;
    authorized = true;
    markOwner(true);
    bus('OWNER_ACCESS_UNLOCKED', {});
  }

  function lock() {
    const wasQa = qaOn;
    qaOn = false;
    authorized = false;
    markOwner(false);
    if (wasQa) bus('QA_MODE_DISABLED', {});
    bus('OWNER_ACCESS_LOCKED', {});
  }

  function enableQa() {
    if (!authorized) return false;
    if (qaOn) return true;
    qaOn = true;
    bus('QA_MODE_ENABLED', {});
    bus('QA_SIMULATION_STARTED', {});
    return true;
  }
  function disableQa() {
    if (!qaOn) return true;
    qaOn = false;
    bus('QA_MODE_DISABLED', {});
    bus('QA_SIMULATION_ENDED', {});
    return true;
  }

  return {
    init,
    verify,
    isAuthorized: () => authorized,
    lock,
    enableQa, disableQa,
    qaMode: () => qaOn,
    // Access override + reward suppression are BOTH exactly "QA simulation is on".
    accessOpen: () => qaOn,
    suppresses: () => qaOn,
    cooldownMs: cooldownRemaining,
    maxFails: () => MAX_FAILS,
    // Test-only: inject a known verifier so tests can prove unlock without ever
    // committing the real passphrase. Passing null restores production behavior.
    setTestVerifier: (hex) => { testVerifier = (typeof hex === 'string' && /^[0-9a-f]{64}$/.test(hex)) ? hex : null; },
    // Test-only: compute a verifier hash for a chosen test passphrase.
    hashFor: (pass) => sha256hex(SALT + String(pass)),
  };
})();
