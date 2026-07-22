/* ============================================================
   ZONE 6 — lessons r9–r15 (appended to ZONE6_LESSONS).
   Version-safe state, debug discipline, profiling, testing,
   validation, crash forensics, and the shipping checklist.
   ============================================================ */

ZONE6_LESSONS.push(

  /* ------------------------------------------------------ R9 */
  {
    id: 'r9', kind: 'lesson', title: 'Presets That Never Lie', short: 'Version-safe state',
    concepts: ['state-eng'], time: '~7 MIN', diff: 3,
    hook: 'A producer opens a two-year-old session. Since then you\'ve shipped v1.4 with three new knobs. If that session opens with ANY setting changed — a mix that suddenly sounds different — you\'ve broken the one promise producers never forgive. Version-safe state is how plugins keep faith with every session ever saved.',
    objective: 'Design state that survives time: defaults for missing values, a written version number, and IDs that never change meaning.',
    sections: [
      {
        h: 'The time-travel problem',
        body: 'Zone 3 built save/restore for the plugin you had THEN. But state written by v1.0 will be loaded by v1.4 (old session, new plugin — the common case), and state from v1.4 may land in v1.0 (collaborator with the update, you without). Neither direction may crash, and the golden rule for the common case: **old sessions must sound identical** — every parameter the old version knew keeps its exact value, every parameter it didn\'t know gets a default chosen to be *neutral*.',
        viz: { t: 'presetlife' },
      },
      {
        h: 'The three disciplines',
        body: 'First: **write a version number** into the state — load code can then know what it\'s reading. Second: **read with defaults** — every property lookup names its fallback, so missing values (older state) resolve harmlessly. Third: **IDs are forever** (Zone 3\'s j5 promise, now with teeth): never rename, never reuse, never repurpose a parameter ID — retire old IDs and add new ones. New-parameter defaults deserve real thought: a new Drive knob defaulting to 0.5 changes every old mix; defaulting to 0.0 (off) changes none.',
        code: '// SAVE — stamp the version:\nstate.setProperty ("stateVersion", 3, nullptr);\n\n// LOAD — every read names its default:\nint loadedVersion = state.getProperty ("stateVersion", 1);\nfloat drive = state.getProperty ("drive", 0.0f);   // v1.2\'s new knob:\n                                                   // neutral for old sessions\nif (loadedVersion < 2)\n    migrateLegacyFilterRange (state);              // explicit migration',
        codeTitle: 'state that survives time',
        breakdown: [
          ['stateVersion', 'the state says what era it\'s from — load code stops guessing'],
          ['getProperty (id, default)', 'missing value → named fallback; old sessions load clean, no crash, no surprise'],
          ['neutral defaults', 'a new feature must default to "not happening" — old mixes stay identical'],
          ['explicit migration', 'when meaning changed (a range, a curve), convert on load — once, on purpose, tested'],
        ],
        mistake: { code: '// v1.4 "cleans up" an old ID:\nlayout.add (std::make_unique<juce::AudioParameterFloat>(\n    juce::ParameterID { "drive", 1 },   // ✗ was "saturation" in v1.0\n    …));', text: 'Renaming or reusing an ID silently orphans every old session\'s saved value (and every written automation lane targeting it). The old data doesn\'t error — it just vanishes, and the mix changes. IDs are gravestones: once carved, never edited.' },
      },
      {
        h: 'The preset-switch click',
        body: 'One more production wrinkle: loading a preset while audio runs re-aims dozens of parameters at once. Glide them all (d13) and the preset "morphs" in over 20 ms — sometimes lovely, sometimes wrong. Snap them (r7\'s setCurrentAndTargetValue) and you risk a step — so pro synths pair the snap with a quick output fade or kill voices first (n15). The point: a preset load is a world boundary, like prepare — handle the transition deliberately, don\'t let it default to whatever happens.',
        warn: 'setStateInformation can arrive while audio is RUNNING (hosts restore state whenever they please). Everything it touches that audio reads must cross safely — the r3/r4 rules apply to state loading too, which is why replaceState + atomics is the JUCE-blessed path.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'state-eng',
        prompt: 'v1.4 adds a Drive knob. What default keeps two-year-old sessions honest?',
        options: [
          { t: 'The neutral value (drive off) — old sessions must sound EXACTLY as they did, and they never asked for drive', why: '' },
          { t: '0.5 — a musical middle', why: 'Musical for new users, catastrophic for old sessions: every mix made before v1.4 gains distortion it never had.' },
          { t: 'Whatever the factory preset uses', why: 'Factory presets are for new patches — old sessions aren\'t asking for your taste, they\'re asking for their OWN sound back.' },
          { t: 'It doesn\'t matter', why: 'It\'s one of the most audible decisions in plugin maintenance — the default IS what old sessions hear.' },
        ],
        answer: 0,
        explain: 'New features default to "not happening." An old session that opens changed — however slightly — is a broken promise producers remember.',
      },
      {
        type: 'fill', concept: 'state-eng',
        prompt: 'Read a property so state from ANY era loads safely.',
        code: 'float drive = state.getProperty ("drive", ___);   // neutral for old sessions',
        accept: ['0.0f', '0.f', '0.0', '0'],
        placeholder: 'default',
        hint: 'The value that changes nothing.',
        explain: 'Every read names its fallback: old state (no "drive" saved) resolves to off, and the old mix survives untouched. Defaults-on-read is the cheapest time machine in software.',
      },
      {
        type: 'mcq', concept: 'state-eng',
        prompt: 'Why is renaming a parameter ID between versions so destructive?',
        options: [
          { t: 'Saved values and automation lanes reference the OLD id — after the rename they silently match nothing, and settings just vanish', why: '' },
          { t: 'It crashes the host', why: 'Almost never — that\'s the problem. It fails SILENTLY: no error, just a knob at default and a changed mix.' },
          { t: 'The compiler rejects it', why: 'The compiler can\'t know your v1.0 shipped a different string — this contract lives entirely outside the type system.' },
          { t: 'It only matters for AU', why: 'Every format stores by ID — the promise is universal (Zone 3\'s j5, now with two years of sessions depending on it).' },
        ],
        answer: 0,
        explain: 'IDs are the address old data writes to. Change the address and the mail doesn\'t bounce — it disappears. Retire and add; never rename or reuse.',
      },
    ],
    recap: [
      'State outlives versions: stamp a version, read with named defaults, migrate explicitly.',
      'New parameters default NEUTRAL — old sessions must sound identical.',
      'IDs are forever: retire and add, never rename or reuse.',
      'Preset loads are world boundaries: handle the audible transition deliberately.',
    ],
    inside: [
      { name: 'First Signal', use: 'p17 stamps its state and proves a "v1.0 session" reopens identically' },
      { name: 'Every plugin update you\'ve installed', use: 'its changelog\'s quiet triumph: "your old sessions still sound the same"' },
    ],
    analogyPanel: 'A studio\'s tape archive: every reel is labeled with the machine and calibration that recorded it (version stamp), the playback tech aligns the deck to THE REEL\'s era (migration), and nobody ever relabels old reels to match this year\'s naming scheme (IDs are forever).',
    beginnerMistake: 'Testing state by saving and loading in the SAME build. The bugs live across versions: keep a saved state file from each release in your test folder and load them ALL with every new build — a regression suite for time itself.',
    remember: 'Old sessions are sacred: version the state, default the missing, and never touch an ID.',
    builds: ['preset', 'valuetree', 'state-versioning'],
    leads: ['versioning', 'regression-test'],
  },

  /* ------------------------------------------------------ R10 */
  {
    id: 'r10', kind: 'lesson', title: 'Debug vs Release: Two Builds, One Truth', short: 'Assertions & safe logging',
    concepts: ['quality-eng'], time: '~6 MIN', diff: 2,
    hook: 'Your synth misbehaves only in the DAW, where there\'s no console and no debugger attached. How do professionals see inside a running plugin without breaking the one rule — never make the audio thread wait? The answer is a two-build discipline: one build that checks everything, and one that ships.',
    objective: 'Use assertions and logging safely: what jassert does, why DBG is banned on the audio thread, and what each build is FOR.',
    sections: [
      {
        h: 'Two builds, two jobs',
        body: 'The **Debug build** is instrumented: no optimization (stepping works), assertions live, extra checks on. It exists to make bugs LOUD. The **Release build** is optimized, assertions stripped, checks removed — it exists to be fast, and it\'s the only build users ever run. Zone 3 introduced the pair; the pro discipline is using both *daily*: develop and test in Debug so mistakes scream; verify performance and ship from Release. A bug that appears only in Release (optimizer-exposed UB, timing) is rare and serious — r14\'s territory.',
      },
      {
        h: 'jassert: the tripwire',
        body: 'An **assertion** states an invariant: "this must be true, or the code is wrong." `jassert(cond)` checks it in Debug — halting in the debugger at the exact line, the instant the assumption breaks — and compiles to NOTHING in Release. That makes assertions free documentation with teeth: they cost users nothing and catch developers everything. Assert facts, not weather: "buffer has channels", "note is 0–127", "this pointer was wired in prepare".',
        code: 'void startNote (int note, float vel)\n{\n    jassert (note >= 0 && note <= 127);      // MIDI\'s own contract\n    jassert (vel  >= 0.0f && vel <= 1.0f);   // getFloatVelocity\'s promise\n    …\n}\n// Debug: breaks HERE the moment a caller lies.\n// Release: both lines vanish — zero cost shipped.',
        codeTitle: 'invariants with teeth',
        breakdown: [
          ['jassert (cond)', 'Debug: halts at this line when cond is false. Release: compiled away entirely'],
          ['assert facts', 'contracts and invariants — things that are WRONG, not things that are unusual'],
          ['zero shipped cost', 'the stripped assertion is why you can afford hundreds of them'],
          ['not error handling', 'users never see asserts — recoverable conditions need real handling (r14)'],
        ],
        mistake: { code: 'jassert (loadPresetFromDisk (path));   // ✗ side effect inside', text: 'In Release the whole line vanishes — including the CALL. The preset silently never loads, but only in the shipped build: a bug that exists exclusively where you can\'t debug it. Assertions must be pure checks; do the work outside, assert the result.' },
      },
      {
        h: 'Logging without lying to the deadline',
        body: '`DBG("...")` prints in Debug builds — and building its message allocates strings (r5\'s forbidden verb). On the message thread, log freely. On the AUDIO thread, even debug logging is a real-time violation that can change timing enough to hide the very race you\'re hunting. The pro pattern for audio-thread visibility: write plain values into pre-allocated atomics or a FIFO (r4), and let the UI or a timer READ and print them. The audio thread records; someone else narrates.',
        warn: 'This is also why "add prints until it works" fails on audio bugs: the prints change the timing (r3\'s observer effect) and can allocate. Instrument with atomics; observe from the message thread.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'What happens to jassert lines in the Release build?',
        options: [
          { t: 'They compile to nothing — zero cost, zero checks, which is why Debug is where you develop', why: '' },
          { t: 'They log to a file', why: 'Nothing survives: no check, no log, no cost. Shipped users never meet your assertions.' },
          { t: 'They show users an error dialog', why: 'Assertions are developer tripwires, not user UX — user-visible failures need real error handling (r14).' },
          { t: 'They slow the plugin slightly', why: 'Truly zero: the compiler removes them entirely. That free-ness is why you can write hundreds.' },
        ],
        answer: 0,
        explain: 'Debug: loud tripwire at the exact line. Release: gone. The pair is the point — checks while you build, speed when you ship.',
      },
      {
        type: 'bugspot', concept: 'quality-eng',
        prompt: 'This "works in Debug, broken in Release" bug is three tokens wide. Tap it.',
        code: [
          'bool ok = true;',
          'jassert (ok = validateVoicePool());',
          'if (! ok)',
          '    rebuildVoicePool();',
        ],
        buggy: 1,
        explain: 'The validation call lives INSIDE the assert — in Release the entire line (call included) vanishes, ok stays true, and the pool is never validated or rebuilt. Side effects in assertions create Release-only bugs. Do the work, then assert: ok = validate(); jassert(ok);',
        fix: 'ok = validateVoicePool(); jassert (ok);',
      },
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'How do professionals "see" values on the audio thread without violating real-time rules?',
        options: [
          { t: 'Write plain values into pre-allocated atomics or a FIFO; the message thread reads and prints them', why: '' },
          { t: 'DBG in the callback — it\'s debug-only', why: 'Debug-only still allocates strings and shifts timing — it violates r5 AND can hide the race you\'re chasing.' },
          { t: 'printf is fine if it\'s fast', why: 'Console I/O can BLOCK — the one verb the deadline can\'t forgive, "usually fast" or not (r1).' },
          { t: 'You can\'t observe the audio thread', why: 'You can — through the same safe channels all data uses: the thread records, the UI narrates.' },
        ],
        answer: 0,
        explain: 'Instrumentation obeys the same laws as features: values cross via atomics and rings. The audio thread never narrates its own story — it hands the notes to someone with time to talk.',
      },
    ],
    recap: [
      'Debug: instrumented, assertions live — bugs get loud. Release: optimized, stripped — users only ever run this.',
      'jassert = invariant tripwire: free in Release, precise in Debug. Never put side effects inside.',
      'DBG/logging allocates — message thread only. Audio-thread visibility: atomics/FIFO out, UI prints.',
      'Develop in Debug daily; verify and ship Release.',
    ],
    inside: [
      { name: 'First Signal', use: 'p19 ships Release, developed under a hundred live assertions' },
      { name: 'JUCE itself', use: 'jassertfalse throughout — half of learning JUCE is hitting its tripwires and reading the comment above them' },
    ],
    analogyPanel: 'Debug is the rehearsal room: mistakes stop the band, everyone hears them, that\'s the point. Release is the show: no stopping, no notes taped to the monitors — everything the rehearsal caught is already fixed.',
    beginnerMistake: 'Developing in Release "because it\'s faster" — silencing every tripwire you own, then debugging blind. The speed you saved compiles into hours of mystery. Live in Debug; visit Release to measure and ship.',
    remember: 'Assert facts, log from the message thread, and let the audio thread hand its story to someone else. Two builds, two jobs.',
    builds: ['debug-build', 'release-build', 'assertion'],
    leads: ['profiling', 'stack-trace'],
  },

  /* ------------------------------------------------------ R11 */
  {
    id: 'r11', kind: 'lesson', title: 'Profiling: Measure, Don\'t Guess', short: 'CPU, cache & SIMD',
    concepts: ['performance-eng'], time: '~7 MIN', diff: 3,
    hook: 'First Signal at 8 voices with unison eats more CPU than you\'d like, and three developers have three theories about why. All three are wrong — and that\'s normal. Intuition about performance is famously terrible. The professionals\' edge isn\'t genius optimization; it\'s refusing to optimize ANYTHING until a measurement points at the real cost.',
    objective: 'Adopt measurement-first optimization, and meet the two big levers: cache-friendly memory access and SIMD (Single Instruction, Multiple Data).',
    sections: [
      {
        h: 'The profiler tells the truth',
        body: 'A **profiler** samples the running program and reports where time actually goes. The result is nearly always a surprise: the "expensive" filter is 3%, and 40% is somewhere nobody suspected (a conversion in the inner loop, denormals (r6), a std::pow per sample). The workflow is a loop: **measure → find the hottest spot → fix ONE thing → measure again**. Any optimization not driven by a measurement is a guess wearing a lab coat — it complicates code and usually buys nothing.',
        viz: { t: 'cpumeter' },
      },
      {
        h: 'Lever one: respect the cache',
        body: 'CPUs read memory in chunks into fast caches; math on cached data is ~free, a cache MISS costs hundreds of cycles. So the shape of your loops matters as much as the math: **walk memory in order** (samples of one channel contiguously — exactly how AudioBuffer stores them), keep hot data together, avoid pointer-chasing per sample. This is why the d15/n6 architecture hoists per-block work OUT of the sample loop and keeps voice state in a compact array (n5\'s pool): the layout was performance engineering before you had the word for it.',
        code: '// hoist: per-block work stays out of the per-sample loop\nconst float g = juce::Decibels::decibelsToGain (gainParam->load());\nfloat* out = buffer.getWritePointer (0);          // one pointer, once\nfor (int i = 0; i < buffer.getNumSamples(); ++i)\n    out[i] = renderSample() * g;                  // contiguous walk',
        codeTitle: 'cache-shaped code',
        breakdown: [
          ['hoisted g', 'dB→gain has a log/pow inside — per block: 1 call; per sample: 44,100/sec for nothing'],
          ['one write pointer', 'resolved once, then a plain contiguous walk — the cache\'s favorite pattern'],
          ['out[i] in order', 'sequential access lets the CPU prefetch — the memory arrives before you ask'],
        ],
        mistake: { code: 'for (int i = 0; i < buffer.getNumSamples(); ++i)\n    buffer.getWritePointer (0)[i] =\n        renderSample() * juce::Decibels::decibelsToGain (gainParam->load());   // ✗', text: 'Three per-sample sins in one line: an atomic load, a pow-based dB conversion, and a re-resolved pointer — 44,100 times a second each, for values that change per BLOCK at most. Hoisting them is often a bigger win than any clever math.' },
      },
      {
        h: 'Lever two: SIMD, the four-lane highway',
        body: '**Single Instruction, Multiple Data (SIMD)**: modern CPUs can apply one operation to 4, 8 or 16 floats at once. For audio — the same math over long sample runs — that\'s a natural 4–8× on the right loops. The honest introduction: you rarely hand-write it. Compilers auto-vectorize simple contiguous loops (another reason cache-shaped code wins), and `juce::FloatVectorOperations` (multiply, add, copy, clear over whole buffers) is SIMD someone already wrote and tested. Reach for intrinsics only when a profiler proves a hot loop needs them.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'What\'s the first step of professional optimization?',
        options: [
          { t: 'Profile — measure where time ACTUALLY goes, because intuition about hotspots is famously wrong', why: '' },
          { t: 'Rewrite the DSP in assembly', why: 'Weeks of work aimed by a guess — the profiler usually points somewhere else entirely.' },
          { t: 'Enable every compiler optimization', why: 'Release flags matter (r10) but they\'re table stakes — they don\'t tell you WHERE your budget goes.' },
          { t: 'Reduce the voice count', why: 'That\'s surrendering features to avoid measuring. Profile first — the fix is usually cheaper than the sacrifice.' },
        ],
        answer: 0,
        explain: 'Measure → fix one thing → measure again. Everything else is guessing, and the guesses are usually wrong — that\'s not an insult, it\'s the documented human condition.',
      },
      {
        type: 'bugspot', concept: 'performance-eng',
        prompt: 'The profiler says this innocent loop owns 30% of the CPU. Tap the per-sample work that belongs per block.',
        code: [
          'float* out = buffer.getWritePointer (0);',
          'for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '{',
          '    float g = juce::Decibels::decibelsToGain (gainDb->load());',
          '    out[i] = oscSample (waveform, phase) * g;',
          '    advancePhase();',
          '}',
        ],
        buggy: 3,
        explain: 'decibelsToGain runs pow() — 44,100 times a second for a value that changes per block at most, plus an atomic load per sample. Hoist both above the loop. The profiler found it because measurement doesn\'t respect innocence.',
        fix: 'const float g = juce::Decibels::decibelsToGain (gainDb->load()); // before the loop',
      },
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'What is SIMD (Single Instruction, Multiple Data), practically, for audio code?',
        options: [
          { t: 'One CPU instruction operating on several floats at once — and you mostly get it via auto-vectorized simple loops and juce::FloatVectorOperations, not hand-written intrinsics', why: '' },
          { t: 'Running DSP on multiple threads', why: 'That\'s multithreading — SIMD is parallelism INSIDE one instruction on one core.' },
          { t: 'A GPU technique only', why: 'GPUs use similar ideas, but SIMD lives in every desktop CPU your plugin runs on.' },
          { t: 'A JUCE-only feature', why: 'It\'s CPU hardware — FloatVectorOperations is just JUCE\'s pre-written, tested way to use it.' },
        ],
        answer: 0,
        explain: 'Four-to-sixteen floats per instruction, and the pragmatic path is letting the compiler and JUCE do it: write simple contiguous loops, use FloatVectorOperations, hand-tune only what a profiler convicts.',
      },
    ],
    recap: [
      'Measure → fix one thing → measure again. Unmeasured optimization is guessing.',
      'Cache rules: walk memory in order, hoist per-block work, keep hot state compact.',
      'SIMD = one instruction, many floats: auto-vectorization + FloatVectorOperations first.',
      'The usual villains are boring: per-sample pow, atomic loads in loops, denormals.',
    ],
    inside: [
      { name: 'First Signal', use: 'p18 profiles it honestly and fixes only what the numbers convict' },
      { name: 'juce::FloatVectorOperations', use: 'buffer-wide multiply/add/clear — SIMD, pre-written and battle-tested' },
    ],
    analogyPanel: 'Mixing by ear vs by solo button: everyone SWEARS they know which track is muddy, and the solo button embarrasses everyone weekly. The profiler is the solo button for CPU — press it before you reach for a single fader.',
    beginnerMistake: 'Optimizing the DSP math because it LOOKS expensive while an atomic load and a pow sit inside the sample loop. Hot loops die from boring causes; the profiler exists because "looks expensive" and "is expensive" barely correlate.',
    remember: 'The profiler is the solo button: measure first, fix the convicted line, measure again.',
    builds: ['profiling', 'cpu', 'simd'],
    leads: ['unit-test', 'regression-test'],
  },

  /* ------------------------------------------------------ R12 */
  {
    id: 'r12', kind: 'lesson', title: 'Testing the Untestable', short: 'Proving sound correct',
    concepts: ['quality-eng'], time: '~7 MIN', diff: 3,
    hook: 'How do you write a test for "sounds right"? You can\'t — and every audio company ships tested code anyway. The trick is realizing that under the sound, your plugin is deterministic math: same input, same settings, same output, bit for bit. Determinism is testable. This lesson is how pros sleep the night before a release.',
    objective: 'Build the audio testing stack: unit tests for DSP pieces, golden-render regression tests for the whole plugin, and scripted MIDI/automation tests for behavior.',
    sections: [
      {
        h: 'Unit tests: the pieces, proven',
        body: 'A **unit test** runs one small piece with known inputs and checks the output — no host, no sound card, no ears. Your DSP is full of testable facts: midiToHz(69) must be 440.0; the d5 wrap must keep phase in [0, 2π); a full pool\'s findVictim must return the releasing voice (n8\'s ladder — as a TEST, forever); the n7 stopNote must release exactly the owner. Each test is a lesson\'s claim, frozen into code that re-verifies it on every build.',
        viz: { t: 'testpipe' },
      },
      {
        h: 'Golden renders: the whole plugin, frozen',
        body: 'The **regression test** for sound itself: render a fixed MIDI sequence through the plugin at fixed settings, offline, and compare the output buffer against a stored reference — the **golden render**. Any difference means SOMETHING changed. Refactors must match the gold exactly; intentional sound changes re-bless a new gold, deliberately, in a commit that says so. This is how a team refactors a synth engine without a single accidental sonic change slipping out.',
        code: '// the golden-render loop (test rig, not plugin code):\nsynth.prepareToPlay (44100.0, 512);\nrenderSequence (synth, testMidi, output);        // deterministic: same in → same out\n\nfor (int i = 0; i < output.getNumSamples(); ++i)\n    expectWithinAbsoluteError (output.getSample (0, i),\n                               golden.getSample (0, i), 1.0e-6f);',
        codeTitle: 'comparing against gold',
        breakdown: [
          ['fixed everything', 'rate, block, MIDI, settings — determinism is the test\'s foundation'],
          ['offline render', 'no sound card, no real time — CI machines can run it silently, fast'],
          ['tiny tolerance', 'floating-point wiggle room (compiler/platform), tight enough to catch real change'],
          ['re-bless deliberately', 'sound changes ship as CHOSEN new golds — never as surprises'],
        ],
        mistake: { code: 'srand (time (nullptr));                    // ✗ in the noise oscillator\nnoise = (rand() / (float) RAND_MAX) * 2 - 1;', text: 'Time-seeded randomness makes every render unique — no golden test can ever pass. Testable synths seed their noise deterministically (fixed seed per render, or a seed the test can set). Determinism isn\'t a limitation; it\'s the property that makes proof possible.' },
      },
      {
        h: 'Behavior tests: scripting the performer',
        body: 'Above the sound sit behaviors: does the sustain pedal defer note-offs (n10)? Does a 9th note steal the releasing voice? Does dense automation stay click-free? These get **scripted tests**: feed a constructed MidiBuffer (note-ons, CCs, pitch bend at exact sample positions), run blocks, assert on the state and output. Automation tests sweep parameters while rendering and scan the output for discontinuities. And UI-level testing exists too (scripted clicking, host simulation) — the deeper the layer, the cheaper the test, so most of the pyramid is units and golds.',
        warn: 'The uncomfortable truth this stack answers: "it sounds fine on my machine" tests ONE path of thousands. The suite tests the same thousand paths every single build — it\'s not a substitute for ears; it\'s a guarantee ears can\'t give.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'What does a golden-render regression test actually prove?',
        options: [
          { t: 'That the plugin\'s output for a fixed input is bit-identical (within float tolerance) to the blessed reference — no accidental sonic change', why: '' },
          { t: 'That the plugin sounds good', why: '"Good" needs ears. The gold proves UNCHANGED — which is what refactors and releases actually need proven.' },
          { t: 'That the plugin never crashes', why: 'A crash would fail it, but stability testing is validation\'s job (r13) — the gold\'s specialty is sonic identity.' },
          { t: 'That the CPU is efficient', why: 'Performance is the profiler\'s beat (r11). The gold only certifies WHAT was rendered, not how fast.' },
        ],
        answer: 0,
        explain: 'The gold answers one question perfectly: "did the sound change?" Refactor fearlessly — the moment anything drifts, the diff says so.',
      },
      {
        type: 'match', concept: 'quality-eng',
        prompt: 'Match each claim from earlier zones to the test that freezes it.',
        left: ['midiToHz(69) == 440', 'output identical after an engine refactor', 'pedal defers note-offs until pedal-up', 'a fast sweep produces no clicks'],
        right: ['unit test — one function, known answer', 'golden render — output vs blessed reference', 'scripted MIDI test — constructed CC 64 sequence', 'automation test — sweep + discontinuity scan'],
        explain: 'The pyramid: units prove pieces, golds prove the whole sound, scripts prove behavior. Every lesson\'s claim in this course can live as one of these — permanently.',
      },
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'Why must a testable synth\'s noise oscillator use a settable/fixed seed?',
        options: [
          { t: 'Time-seeded randomness makes every render unique — golden comparisons can never pass. Deterministic seeds keep same-in → same-out true', why: '' },
          { t: 'Fixed seeds sound better', why: 'Sound is identical in character — the seed only decides WHICH random-looking sequence you get.' },
          { t: 'rand() is too slow', why: 'Speed is a separate topic — the testing problem is uniqueness, not cost.' },
          { t: 'Noise shouldn\'t be tested', why: 'Noise paths carry gain, envelopes and filters that absolutely need regression cover — determinism is what makes that possible.' },
        ],
        answer: 0,
        explain: 'Determinism is the foundation under the whole stack. Design for it (seedable noise, no wall-clock reads in DSP) and everything becomes provable.',
      },
    ],
    recap: [
      'Unit tests freeze each lesson\'s claims: pitch math, wraps, ladders, ownership.',
      'Golden renders prove the WHOLE sound unchanged — refactor without fear.',
      'Scripted MIDI/automation tests prove behavior: pedals, stealing, click-free sweeps.',
      'Design for determinism: seedable noise, fixed configs — proof needs same-in → same-out.',
    ],
    inside: [
      { name: 'First Signal', use: 'p19 blesses its first golden render — the 1.0 sound, frozen' },
      { name: 'This very app', use: 'built the same way: validators and scripted tests ran before every zone shipped to you' },
    ],
    analogyPanel: 'A mastering engineer\'s null test: flip polarity, sum with the reference — silence means identical. The golden render is a null test your build machine performs on every commit, forever, for free.',
    beginnerMistake: 'Writing tests AFTER the bug ships, as penance. The pro habit is the reverse: every bug you fix gets a test that would have caught it — the suite becomes a museum of every mistake you\'ll never make twice.',
    remember: 'Under the sound is deterministic math, and determinism is provable. Units for pieces, gold for the sound, scripts for behavior.',
    builds: ['unit-test', 'regression-test', 'golden-render'],
    leads: ['plugin-validation', 'vst3'],
  },

  /* ------------------------------------------------------ R13 */
  {
    id: 'r13', kind: 'lesson', title: 'Validation: The Hosts\' Entrance Exam', short: 'pluginval, auval & formats',
    concepts: ['shipping'], time: '~6 MIN', diff: 2,
    hook: 'Your synth is perfect in your DAW. Then a customer\'s different DAW scans it… and quarantines it. Hosts are paranoid for good reason — one misbehaving plugin can take down a whole session — so the ecosystem built entrance exams: automated validators that torture plugins the way REAL hosts will. Passing them isn\'t bureaucracy; it\'s how you find Tuesday\'s crash on Monday.',
    objective: 'Know what plugin validators actually test, the VST3/AU/AAX landscape, and why hosts calling your lifecycle in weird orders is normal — not hostile.',
    sections: [
      {
        h: 'What validators do to you',
        body: '**pluginval** (open source, from Tracktion) loads your plugin and attacks the contract: prepare/release cycles in odd orders, absurd-but-legal buffer sizes (including 0 and 1 samples!), rapid rate switches, state saved and restored mid-render, editors opened and destroyed repeatedly, parameters swept at random. Everything it does is LEGAL host behavior — just concentrated. If validation crashes, a real host somewhere would have too, eventually, on stage.',
        viz: { t: 'testpipe', caption: 'the last two gates before humans: validators, then real DAWs' },
      },
      {
        h: 'The format landscape',
        body: '**VST3** (Steinberg): the cross-platform workhorse — Zone 3\'s lifecycle IS its shape. **Audio Unit (AU)** (Apple): macOS/iOS native, required for Logic and GarageBand; Apple ships its own validator, **auval**, which Logic runs automatically before trusting any AU. **AAX** (Avid): Pro Tools\' format, gated by Avid\'s developer program and code-signing (PACE). The professional comfort: with JUCE, they\'re *outputs of the same code* (Zone 3\'s FORMATS line) — your processor doesn\'t change; the wrapper and the entrance exam do.',
        code: '# the pre-ship ritual, in commands:\npluginval --strictness-level 10 --validate FirstSignal.vst3\nauval -v aumu Fsig Txps        # Apple\'s AU exam (type, subtype, maker)\n# AAX: Avid toolchain + signing, validated inside Pro Tools',
        codeTitle: 'the entrance exams',
        breakdown: [
          ['strictness 10', 'pluginval\'s maximum paranoia — run the level your users\' hosts will effectively apply'],
          ['auval', 'not optional on macOS: Logic literally refuses AUs that fail it'],
          ['same engine', 'one processor, three wrappers — the exams differ, your DSP doesn\'t'],
        ],
        mistake: { code: 'void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)\n{\n    // "blocks are always at least 32 samples, right?"\n    float first = buffer.getSample (0, 0);   // ✗ zero-sample blocks exist\n    …\n}', text: 'Hosts legally send 0-sample blocks (some do it constantly while paused) and 1-sample blocks (sample-accurate automation splitting). Indexing sample 0 of an empty block is undefined behavior a validator finds in seconds — and a customer\'s host finds in week three. Loops that run getNumSamples() times survive naturally; assumptions don\'t.' },
      },
      {
        h: 'Hosts are weird ON PURPOSE',
        body: 'Bounce may re-prepare you at a different block size mid-song (r7). Some hosts open the editor before ever calling prepare. Some save state from a plugin that never rendered a block. All legal. The professional posture: your plugin is a well-behaved guest in SOMEONE ELSE\'s program — it makes no assumptions about call order beyond the documented contract, and treats every documented-legal sequence as inevitable. Validation is just that posture, automated.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'shipping',
        prompt: 'Why do validators send legal-but-absurd inputs (0-sample blocks, rapid prepare cycles)?',
        options: [
          { t: 'Because real hosts DO these things eventually — validators concentrate a year of edge cases into a minute, so you crash on Monday instead of on stage', why: '' },
          { t: 'To be difficult', why: 'Every torture is documented-legal host behavior — the validator just refuses to wait a year for you to meet it naturally.' },
          { t: 'To test CPU speed', why: 'Performance isn\'t the exam — CONTRACT compliance is: lifecycle, state, threading, robustness.' },
          { t: 'Only broken hosts do these', why: 'Mainstream hosts send 0-sample blocks and mid-song re-prepares routinely. "Weird" is normal at ecosystem scale.' },
        ],
        answer: 0,
        explain: 'A validator is a time machine: all the strange-but-legal things hosts will ever do to you, compressed into one run you can debug locally.',
      },
      {
        type: 'match', concept: 'shipping',
        prompt: 'Match each format to its identity.',
        left: ['VST3', 'AU (Audio Unit)', 'AAX', 'auval'],
        right: ['Steinberg — the cross-platform workhorse', 'Apple — required for Logic & GarageBand', 'Avid — Pro Tools, gated and signed', 'Apple\'s validator — Logic runs it before trusting any AU'],
        explain: 'Three doorways, one JUCE engine behind all of them. Your DSP never changes; the wrapper and the entrance exam do.',
      },
      {
        type: 'predict', concept: 'shipping',
        prompt: 'pluginval sends a 0-sample block. What must your processBlock do?',
        code: 'buffer.getNumSamples() == 0   // legal!',
        options: [
          { t: 'Nothing, gracefully — loops bounded by getNumSamples() run zero times and fall through clean', why: '' },
          { t: 'Assert — hosts shouldn\'t do that', why: 'They may and they do — it\'s documented-legal. An assert here fails validation on correct host behavior.' },
          { t: 'Return an error code', why: 'processBlock returns void — the contract is "handle what arrives," and zero samples is an easy day.' },
          { t: 'Render one sample anyway', why: 'Writing to a zero-sample buffer is the exact out-of-bounds crash the validator is fishing for.' },
        ],
        answer: 0,
        explain: 'Code shaped by the contract (loop to getNumSamples, index nothing blindly) survives absurd-but-legal inputs without a single special case. That\'s the design working.',
      },
    ],
    recap: [
      'Validators concentrate a year of legal host weirdness into one debuggable run.',
      'VST3 (Steinberg) / AU (Apple, auval-gated) / AAX (Avid, signed) — one JUCE engine, three wrappers.',
      '0-sample and 1-sample blocks are LEGAL — bound every loop by getNumSamples().',
      'Be a good guest: assume nothing about call order beyond the documented contract.',
    ],
    inside: [
      { name: 'First Signal', use: 'p19 runs it through pluginval at strictness 10 — and fixes what screams' },
      { name: 'Logic Pro', use: 'auval runs automatically at scan — failing AUs simply never appear in the menu' },
    ],
    analogyPanel: 'Venue security at a festival: they check your rig harder than any audience ever will — cables yanked, power cycled, inputs slammed — because when 50,000 people are watching, "it worked at rehearsal" is not a plan. Validators are security for the plugin ecosystem.',
    beginnerMistake: 'Running validation once, at the end, as a formality. Run it from the FIRST week — every contract bug it catches early is an architecture decision you can still change cheaply.',
    remember: 'Validation is concentrated reality: pass the exam before your users administer it for you.',
    builds: ['plugin-validation', 'vst3', 'au'],
    leads: ['aax', 'stack-trace'],
  },

  /* ------------------------------------------------------ R14 */
  {
    id: 'r14', kind: 'lesson', title: 'Crash Forensics', short: 'Stack traces & defense',
    concepts: ['quality-eng'], time: '~7 MIN', diff: 3,
    hook: 'The email you\'ll dread: "your synth crashed my session, lost an hour of work." No repro steps, different machine, different host. Attached: a crash log — two hundred lines of hex and symbols. To a beginner it\'s noise. To a professional it\'s a map with an X on it. This lesson teaches you to read the map — and to write code that leaves better maps.',
    objective: 'Read a stack trace from the top down, know the classic crash signatures, and practice defensive programming that fails loudly-but-safely.',
    sections: [
      {
        h: 'The stack trace: a map with an X',
        body: 'When a program crashes, the OS records the **stack trace**: the chain of function calls that was in flight, newest first. Frame 0 is where it died; the frames below are who-called-whom to get there. Reading is top-down: find the topmost frame in YOUR code (crashes often die inside a library, but the mistake is usually the caller), then walk down to see how execution arrived. The trace doesn\'t say WHY — it says exactly WHERE, and where is 80% of the hunt.',
        viz: { t: 'stackviz' },
      },
      {
        h: 'The classic signatures',
        body: 'Crash addresses are fingerprints. **Address 0x0 (or near it)**: null pointer dereference — something wasn\'t wired yet (an editor touching the processor during teardown is a classic). **A small-offset address (0x10, 0x68)**: null pointer PLUS a member offset — `something->member` where something is null. **A garbage address**: use-after-free or buffer overrun (Zone 1\'s dangling patch cable, Zone 2\'s lifetime lessons — as crash logs). **Crash inside the allocator**: heap corruption — the real bug happened EARLIER; someone scribbled past a buffer and the allocator tripped over the damage later. That last one teaches the deepest lesson: where it crashed and where the bug lives can be far apart.',
        code: '// a producer\'s crash log, decoded:\n#0  FirstSignal  Voice::render (this=0x0)        ← died HERE: this is NULL\n#1  FirstSignal  Engine::renderActiveVoices()    ← handed out the null\n#2  FirstSignal  PluginProcessor::processBlock   ← the deadline, mid-flight\n#3  HostApp      AudioGraph::process\n\n// reading: a voice pointer was null during render →\n// who can null a voice while audio runs? → a lifecycle/threading suspect list',
        codeTitle: 'frame by frame',
        breakdown: [
          ['#0, this=0x0', 'the X: a method called on a null object — the address names the disease'],
          ['walk down', 'each frame is the caller of the one above — the story of how execution got there'],
          ['your topmost frame', 'libraries crash; causes live in callers — start where YOUR code enters'],
          ['suspects, not verdicts', 'the trace gives WHERE; combining it with r2/r3 knowledge gives WHO'],
        ],
      },
      {
        h: 'Defense: fail loud in Debug, safe in Release',
        body: '**Defensive programming** is writing code that survives the impossible: check pointers that "can\'t" be null, clamp indices that "can\'t" be out of range — because two years of hosts, threads and users will eventually deliver the impossible. The pro pattern pairs both builds (r10): jassert the invariant (loud in Debug, where you\'ll fix it) AND handle the failure gracefully (safe in Release, where a user is mid-take). On the audio thread, "gracefully" means: no exceptions (throwing on the deadline is its own disaster) — return silence, skip the voice, keep the block flowing.',
        code: 'void renderVoice (Voice* v, juce::AudioBuffer<float>& out)\n{\n    jassert (v != nullptr);          // Debug: scream at the exact line\n    if (v == nullptr)                // Release: survive the impossible\n        return;                      // one silent voice beats one lost session\n    …\n}',
        codeTitle: 'loud AND safe',
        mistake: { code: 'if (v == nullptr)\n    throw std::runtime_error ("null voice!");   // ✗ on the audio thread', text: 'Throwing across the callback boundary is undefined-behavior roulette with the host\'s stack — you\'ve upgraded a silent voice into a crashed session. On the audio thread, error handling means: note it (atomic flag the UI can read), skip it, keep rendering.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'A crash log shows the death at address 0x00000068. The classic reading?',
        options: [
          { t: 'Null pointer + member offset: something->member where something was null — the 0x68 is the member\'s position inside the struct', why: '' },
          { t: 'Out of memory', why: 'OOM fails allocations — it doesn\'t make programs read address 0x68. Tiny addresses are null-plus-offset fingerprints.' },
          { t: 'A corrupted plugin file', why: 'Corrupt binaries fail to LOAD — they don\'t run for ten minutes and then read near-zero memory.' },
          { t: 'A CPU overload', why: 'Overloads glitch audio (r1) — they don\'t generate memory faults at suspiciously small addresses.' },
        ],
        answer: 0,
        explain: 'Near-zero addresses are the null-dereference family: 0x0 is ->this itself, 0x68 is a member 0x68 bytes in. The address literally describes the bug\'s shape.',
      },
      {
        type: 'mcq', concept: 'quality-eng',
        prompt: 'The trace shows the crash INSIDE the memory allocator. Where\'s the bug, most likely?',
        options: [
          { t: 'Earlier and elsewhere — heap corruption: someone scribbled past a buffer, and the allocator tripped over the damage later', why: '' },
          { t: 'In the allocator', why: 'The system allocator is run by billions of programs daily — it\'s the crime SCENE here, not the criminal.' },
          { t: 'In the frame just below', why: 'That frame merely made an innocent allocation that stepped on old damage — the scribbler ran earlier, possibly seconds earlier.' },
          { t: 'There is no bug — random failure', why: 'Heap crashes are never random — they\'re delayed. The delay is what makes them the hardest class to trace (and buffer-bound discipline the best prevention).' },
        ],
        answer: 0,
        explain: 'Heap corruption divorces the crash site from the bug site. It\'s why bounds discipline (Zone 1\'s buffer lessons) is a crash-log-prevention program, not pedantry.',
      },
      {
        type: 'bugspot', concept: 'quality-eng',
        prompt: 'This defensive check makes things WORSE on the audio thread. Tap the well-meant disaster.',
        code: [
          'float renderVoice (Voice* v)',
          '{',
          '    if (v == nullptr)',
          '        throw std::runtime_error ("null voice");',
          '    return oscSample (waveform, v->phase);',
          '}',
        ],
        buggy: 3,
        explain: 'Throwing on the audio thread unwinds across the callback boundary into the host — undefined behavior, usually a full session crash. The defense upgraded a skippable glitch into a catastrophe. Audio-thread error handling: jassert for Debug, silent-skip for Release, atomic flag if the UI should know.',
        fix: 'jassert (v != nullptr); if (v == nullptr) return 0.0f;',
      },
    ],
    recap: [
      'Stack traces read top-down: frame 0 is WHERE, the walk down is HOW it got there.',
      'Signatures: 0x0/small = null(+offset); garbage = use-after-free/overrun; allocator = earlier corruption.',
      'Crash site ≠ bug site — especially for heap damage.',
      'Defense = jassert (loud, Debug) + graceful skip (safe, Release). Never throw on the audio thread.',
    ],
    inside: [
      { name: 'First Signal', use: 'p19 adds the loud-and-safe pattern at every pointer boundary' },
      { name: 'Crash reporting services', use: 'aggregate customer traces by signature — the 0x68s cluster, and the map points home' },
    ],
    analogyPanel: 'A flight recorder: it doesn\'t prevent the incident, but it turns "the plane went down somewhere" into a timeline ending at an exact point. Engineers who read recorders stop the NEXT incident — that\'s the entire safety culture of aviation, and of shipped software.',
    beginnerMistake: 'Treating a customer crash log as noise and asking for repro steps instead. The log IS the repro — frame 0, your topmost frame, the address\'s fingerprint. Ten minutes of reading beats ten emails of "what were you doing when…".',
    remember: 'The trace says where, the address says what kind, and your defense decides whether users ever see it. Loud in Debug, safe in Release.',
    builds: ['stack-trace', 'debugger', 'undefined-behavior'],
    leads: ['versioning', 'assertion'],
  },

  /* ------------------------------------------------------ R15 */
  {
    id: 'r15', kind: 'lesson', title: 'The Shipping Checklist', short: 'First Signal 1.0',
    concepts: ['shipping'], time: '~6 MIN', diff: 2,
    hook: 'There\'s a moment every builder faces: the code works, and someone asks "so… is it done?" Hobbyists answer with a feeling. Professionals answer with a LIST — because "done" isn\'t an emotion, it\'s a set of verifiable statements. This lesson is First Signal\'s list, and the release discipline that makes version 1.0 mean something.',
    objective: 'Assemble the release ritual: versioning that communicates, documentation that answers, and a shipping checklist where every line is checkable.',
    sections: [
      {
        h: 'Versioning: numbers that speak',
        body: 'The convention — **semantic versioning** — gives three numbers meaning: **MAJOR.MINOR.PATCH**. Patch (1.0.0 → 1.0.1): fixes only, sound and sessions untouched. Minor (1.0 → 1.1): new features, everything old still works — old sessions sacred (r9). Major (1.x → 2.0): breaking changes allowed, loudly announced. For plugins the stakes are r9\'s: the version number is a *promise about sessions*, and the state\'s own version stamp travels with it.',
        viz: { t: 'shipcheck' },
      },
      {
        h: 'Documentation: answers before questions',
        body: 'Not a novel — answers. A real manual covers: what every knob does (in producer language — you\'ve spent six zones learning that voice), the specs (formats, OS versions, CPU expectations), known limitations stated HONESTLY (First Signal\'s naive-waveform aliasing, d8 — documented, not hidden), and a changelog: every version, dated, in the r9 spirit ("1.1: added Drive — defaults off; old sessions unchanged"). Undocumented limitations become support tickets; documented ones become informed choices.',
      },
      {
        h: 'The checklist: done, verifiably',
        body: 'Every line binary — checked or not: **all tests green** (units, golds, scripted MIDI — r12); **pluginval at strictness 10, plus auval for AU** (r13); **state round-trips across versions** (r9\'s old-session files all load); **rate/size matrix passes** (44.1/48/96k × small/large blocks × offline bounce — r7); **automation stress clean** (r8\'s dense-curve bounce, no clicks); **CPU profile within budget, worst case** (r11, r1); **Release build, assertions verified stripped** (r10); **version bumped, changelog written, docs current**. Then — and only then — build, sign, tag the exact commit, and ship. The list is boring. Boring is the achievement.',
        warn: 'The ritual\'s hardest rule: when a late bug appears, fix it and RESTART the list. The fix that "couldn\'t affect anything else" and shipped untested is a genre of disaster with a thousand entries. The checklist has no fast lane.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'shipping',
        prompt: 'First Signal 1.1 adds a Drive knob (defaulting off) and fixes two bugs. Correct version bump?',
        options: [
          { t: 'Minor — 1.0 → 1.1: new feature, backwards compatible, old sessions unchanged', why: '' },
          { t: 'Patch — 1.0.1', why: 'Patches are fixes ONLY. A new knob — however politely it defaults — is a feature: that\'s the minor number\'s job.' },
          { t: 'Major — 2.0', why: 'Major signals BREAKING change. Drive-defaults-off breaks nothing — announcing 2.0 would cry wolf.' },
          { t: 'Any — numbers are marketing', why: 'In plugins the numbers are a compatibility promise producers rely on when deciding mid-project whether updating is safe.' },
        ],
        answer: 0,
        explain: 'MAJOR breaks, MINOR adds compatibly, PATCH fixes. A producer mid-album reads 1.1 as "safe to update" — the number is a contract, so bump it truthfully.',
      },
      {
        type: 'order', concept: 'shipping',
        prompt: 'Arrange the release ritual\'s spine top to bottom, exactly as taught: freeze → prove → validate → sessions → docs → ship.',
        lines: [
          'freeze features — only fixes may land now',
          'run the full suite: units, golden renders, scripted MIDI',
          'pass validation: pluginval strictness 10 (+ auval)',
          'verify state compatibility: every old-version session file loads identically',
          'bump the version, write the changelog, finalize docs',
          'build Release, sign, tag the exact commit — ship',
        ],
        explain: 'Freeze → prove → validate → keep the session promise → say what you did → stamp and ship. And the hard rule: any late fix restarts the list from the top.',
      },
      {
        type: 'mcq', concept: 'shipping',
        prompt: 'Why does a late "one-line, can\'t-affect-anything" fix restart the checklist?',
        options: [
          { t: 'Because "can\'t affect anything" is a guess, and the list exists precisely because guesses ship disasters — untested code is untested code', why: '' },
          { t: 'For legal reasons', why: 'Lawyers don\'t care about your checklist — the next session that loads wrong does.' },
          { t: 'It doesn\'t — one-liners are safe', why: 'The industry\'s scar tissue disagrees: the confident last-minute one-liner is a documented genre of shipped catastrophe.' },
          { t: 'To punish slow developers', why: 'It\'s not moral — it\'s statistical: the suite re-running costs minutes; a bad ship costs the release and some trust.' },
        ],
        answer: 0,
        explain: 'The entire checklist is one idea: verification beats confidence. A fix that skips the list re-introduces the confidence the list was built to replace.',
      },
    ],
    recap: [
      'Semantic versioning: PATCH fixes, MINOR adds compatibly, MAJOR breaks loudly.',
      'The version number is a session-compatibility promise (r9 travels with it).',
      'Docs = answers: knobs in producer language, honest limitations, dated changelog.',
      'Checklist lines are binary; late fixes restart the list. Boring is the achievement.',
    ],
    inside: [
      { name: 'First Signal', use: 'p19 walks this exact list — and 1.0 gets tagged' },
      { name: 'Every update dialog you\'ve trusted', use: 'someone\'s checklist held; that\'s what the trust was' },
    ],
    analogyPanel: 'An album release: mixes approved (tests), mastered and QC\'d (validation), artwork and credits final (docs), catalog number assigned (version), and THEN the press run. Nobody re-records a chorus after mastering without going back through mastering — the pipeline has no shortcuts because the pressing plant prints exactly what it\'s given.',
    beginnerMistake: 'Shipping when the code works instead of when the LIST is green. "Works" is one machine, one afternoon, one mood. The list is every machine you can\'t see — which is where all of your users live.',
    remember: '"Done" is a checklist, not a feeling. Freeze, prove, validate, promise, document, stamp — ship.',
    builds: ['versioning', 'plugin-validation', 'state-versioning'],
    leads: ['golden-render', 'unit-test'],
  }
);
