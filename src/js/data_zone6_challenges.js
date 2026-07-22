/* ============================================================
   ZONE 6 — challenges, missions p16–p19, and the boss.
   Professional Plugin Engineering: real studio disasters,
   thread reasoning, and the shipping deadline.
   ============================================================ */

const ZONE6_CHALLENGES = [

  /* ============ READING THE SIGNAL PATH ============ */
  {
    id: 'rr1', kind: 'challenge', ctype: 'reading', title: 'Read: The Thread Map', short: 'Trace the code',
    concepts: ['rt-discipline'],
    intro: 'A page of First Signal, every line an address. Sort it like the engineer you\'re becoming: which thread, and therefore which rules.',
    questions: [
      {
        type: 'match', concept: 'rt-discipline',
        prompt: 'Match each line to its thread — and its law.',
        left: ['adsr.getNextSample() in the render loop', 'gainSlider.setValue(...) in the editor', 'startNote() called from the MIDI dispatch', 'loadPresetFile() from a browser click'],
        right: ['audio — envelopes advance on the deadline, per sample', 'message — a mouse gesture, human-paced', 'audio — the MIDI dispatch runs INSIDE processBlock', 'message — disk I/O is legal off the deadline'],
        explain: 'The caller decides the address (r2). The MIDI dispatch fools everyone once: it FEELS like input handling, but it runs inside processBlock, on the deadline.',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'A utility function formats a juce::String. It\'s called from paint() AND from processBlock. Verdict?',
        options: [
          { t: 'Legal from paint(), a violation from processBlock — the same function inherits each caller\'s thread and rules', why: '' },
          { t: 'Fine from both — it\'s the same code', why: 'Same code, two addresses: String construction allocates (r5), which only one of those addresses forbids.' },
          { t: 'Illegal from both', why: 'The message thread allocates freely — half the violation is missing. Context is the whole verdict.' },
          { t: 'Depends on the string\'s length', why: 'Length changes the odds, not the crime — ANY heap touch on the deadline is the violation.' },
        ],
        answer: 0,
        explain: 'Functions don\'t have threads — CALLS do. Auditing means walking every path INTO a function, which is why the sneaky violations are always three calls deep.',
      },
    ],
  },
  {
    id: 'rr2', kind: 'challenge', ctype: 'reading', title: 'Read: The Prepare Contract', short: 'Trace the code',
    concepts: ['lifecycle-eng'],
    intro: 'A prepareToPlay from a working synth. Read it clause by clause: what\'s recomputed, what\'s sized, what\'s reset — and what the host may do next.',
    questions: [
      {
        type: 'match', concept: 'lifecycle-eng',
        prompt: 'Match each line to its contract clause.',
        left: ['adsr.setSampleRate (sampleRate)', 'scratch.setSize (2, samplesPerBlock)', 'allNotesOff (true)', 'gainSmoothed.setCurrentAndTargetValue (g)'],
        right: ['recompute — rate-derived math reborn', 'size — worst-case memory bought here (r5)', 'reset — no stale voices leak into the new world', 'reset — snap, don\'t glide, at a world boundary'],
        explain: 'Recompute, size, reset — every prepare, every time. The snap is the r7 exception that proves d13\'s rule: world boundaries jump, rendering glides.',
      },
      {
        type: 'predict', concept: 'lifecycle-eng',
        prompt: 'The host calls prepareToPlay(44100, 512)… then later prepareToPlay(96000, 64) mid-session. What must be true afterward?',
        code: '// same plugin instance, no destruction in between',
        options: [
          { t: 'All rate math reflects 96k, buffers fit 64-sample blocks, and stale state was reset — because prepare re-ran its whole contract', why: '' },
          { t: 'The second call is ignored — already prepared', why: 'The run-once guard is the r7 bug: the second world\'s rules never land, and everything rate-derived is silently wrong.' },
          { t: 'The host would never do that', why: 'Offline bounce and device changes do exactly this — it\'s routine, documented-legal host behavior (r13).' },
          { t: 'The plugin must be reinstantiated', why: 'No — prepare exists precisely so one instance can move between worlds. That\'s the contract.' },
        ],
        answer: 0,
        explain: 'Prepare is re-entrant by design: every call is a complete new world. Plugins that treat it as run-once work until the first bounce.',
      },
    ],
  },
  {
    id: 'rr3', kind: 'challenge', ctype: 'reading', title: 'Case File: The Frozen Piano', short: 'Investigate',
    concepts: ['performance-eng'],
    intro: 'DISASTER REPORT: a piano library runs beautifully — until a dense sustain-pedal passage hits ~64 held notes, then the audio stutters. CPU averages look FINE. Read the evidence like a professional.',
    questions: [
      {
        type: 'match', concept: 'performance-eng',
        prompt: 'Match each piece of evidence to what it tells the investigator.',
        left: ['average CPU is low, but stutters happen', 'stutters correlate with NOTE COUNT, not loudness', 'profiler: spikes inside operator new during noteOn', 'no stutter when the same passage is bounced offline slowly'],
        right: ['worst-case problem, not a load problem (r1)', 'the cost scales with an allocation-per-note suspect', 'the smoking gun: heap purchases on the audio thread', 'confirms a deadline miss, not a math error'],
        explain: 'Averages lie; worst cases stutter. Cost-scales-with-notes plus new-in-the-note-path is the classic "grows a container per note" signature.',
      },
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'The culprit: `activeNotes.push_back(note)` growing past capacity at note 64. The professional fix?',
        options: [
          { t: 'reserve() the worst case in prepareToPlay (or a fixed pool, n5-style) — the purchase moves off-deadline and push_back becomes a plain write', why: '' },
          { t: 'Limit the piano to 63 notes', why: 'Shipping the bug as a spec. The allocation is the flaw, not the pianist\'s pedal technique.' },
          { t: 'Bigger audio buffers', why: 'A longer deadline hides the spike until a denser passage — the unbounded purchase is still there (r1: unpredictability is the crime).' },
          { t: 'A faster computer', why: 'The allocator\'s worst case is unbounded on ANY machine — speed doesn\'t buy predictability (r5).' },
        ],
        answer: 0,
        explain: 'Buy at soundcheck, reuse on stage (r5). Capacity 128 costs a few hundred bytes and deletes the entire disaster class — the Frozen Piano thaws with one line in prepare.',
      },
    ],
  },

  /* ============ COMPLETION ============ */
  {
    id: 'rc1', kind: 'challenge', ctype: 'completion', title: 'Complete: The Atomic Bridge', short: 'Code completion',
    concepts: ['thread-safety'],
    intro: 'DISASTER FILE — The Race Condition: UI and audio disagree about one float, once per fifty bounces. Build the bridge that ends the argument.',
    questions: [
      {
        type: 'fill', concept: 'thread-safety',
        prompt: 'Declare the shared cutoff so both threads can touch it safely.',
        code: 'std::___<float> cutoffHz { 1200.0f };',
        accept: ['atomic'],
        placeholder: 'template',
        hint: 'Whole values, published ordering — r3\'s contract.',
        explain: 'std::atomic<float>: never torn, always published, and — on desktop CPUs — lock-free plain instructions. The declaration is the design decision.',
      },
      {
        type: 'fill', concept: 'thread-safety',
        prompt: 'Publish the slider\'s new value from the message thread.',
        code: '// slider callback (message thread):\ncutoffHz.___(newValue);',
        accept: ['store'],
        placeholder: 'method',
        hint: 'The atomic write verb.',
        explain: 'store() publishes whole-and-ordered; the audio thread\'s load() sees a real value, never a half-written one. Two explicit verbs, zero races, forever.',
      },
    ],
  },
  {
    id: 'rc2', kind: 'challenge', ctype: 'completion', title: 'Complete: The Denormal Guard', short: 'Code completion',
    concepts: ['performance-eng'],
    intro: 'A reverb\'s CPU meter climbs as its tail fades — the r6 fingerprint. One line releases the brake.',
    questions: [
      {
        type: 'fill', concept: 'performance-eng',
        prompt: 'Install the guard at the top of the reverb\'s callback.',
        code: 'void processBlock (juce::AudioBuffer<float>& buffer,\n                   juce::MidiBuffer& midi)\n{\n    juce::___ guard;\n    processReverbTail (buffer);\n}',
        accept: ['ScopedNoDenormals'],
        placeholder: 'class',
        hint: 'RAII around a CPU mode: FTZ/DAZ on entry, restored on exit.',
        explain: 'ScopedNoDenormals flushes sub-10⁻³⁸ values to zero — full-speed math on every decay path at once, for values ~700 dB below hearing. The exotic symptom, the boring one-line fix.',
      },
    ],
  },
  {
    id: 'rc3', kind: 'challenge', ctype: 'completion', title: 'Complete: The Defensive Load', short: 'Code completion',
    concepts: ['state-eng'],
    intro: 'State arrives from the outside world: old versions, other machines, corrupted files. Two blanks make the load survive all of it.',
    questions: [
      {
        type: 'fill', concept: 'state-eng',
        prompt: 'Guard against corrupted or foreign data before touching anything.',
        code: 'auto xml = getXmlFromBinary (data, sizeInBytes);\nif (xml == ___ || ! xml->hasTagName (apvts.state.getType()))\n    return;   // corrupted preset: keep current state, never crash',
        accept: ['nullptr'],
        placeholder: 'value',
        hint: 'What a failed parse hands you.',
        explain: 'Parse → null-check → tag-check → only then replace. A corrupted preset should cost the user nothing: the plugin keeps playing its current state instead of crashing their session.',
      },
      {
        type: 'fill', concept: 'state-eng',
        prompt: 'Read a v1.2 parameter so v1.0 sessions load unchanged.',
        code: 'float drive = state.getProperty ("drive", ___);   // neutral: off',
        accept: ['0.0f', '0.f', '0.0', '0'],
        placeholder: 'default',
        hint: 'The value that changes no old mix.',
        explain: 'Every read names its fallback (r9): missing property → neutral default → the two-year-old session sounds exactly as it did. Defaults-on-read is the cheapest time machine in software.',
      },
    ],
  },
  {
    id: 'rc4', kind: 'challenge', ctype: 'completion', title: 'Complete: The Tripwire', short: 'Code completion',
    concepts: ['quality-eng'],
    intro: 'A contract worth stating: MIDI notes are 0–127, and any caller who says otherwise is wrong. Wire the tripwire that costs shipped users nothing.',
    questions: [
      {
        type: 'fill', concept: 'quality-eng',
        prompt: 'Assert the invariant — loud in Debug, free in Release.',
        code: 'void startNote (int note, float vel)\n{\n    ___ (note >= 0 && note <= 127);\n    …\n}',
        accept: ['jassert'],
        placeholder: 'macro',
        hint: 'JUCE\'s Debug-only invariant check.',
        explain: 'jassert halts at this exact line the instant a caller lies — and compiles to nothing in Release. Free documentation with teeth; write hundreds.',
      },
      {
        type: 'fill', concept: 'quality-eng',
        prompt: 'The Release-safe half: survive the impossible gracefully (r14).',
        code: 'jassert (v != nullptr);\nif (v == nullptr)\n    ___;   // one silent voice beats one crashed session',
        accept: ['return', 'return;'],
        placeholder: 'statement',
        hint: 'Skip it, keep the block flowing — never throw here.',
        explain: 'The pro pair: assert for the developer, graceful skip for the user. Loud in Debug, safe in Release — the same invariant, both audiences served.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'rb1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Crackling Compressor', short: 'Find the bug',
    concepts: ['thread-safety'],
    intro: 'DISASTER FILE: a compressor crackles — but only while its UI is being dragged during playback. On stage, that\'s every show. Tap the wait.',
    questions: [
      {
        type: 'bugspot', concept: 'thread-safety',
        prompt: 'The audio thread has been made to queue. Which line?',
        code: [
          'void processBlock (juce::AudioBuffer<float>& buffer,',
          '                   juce::MidiBuffer&)',
          '{',
          '    std::lock_guard<std::mutex> guard (settingsMutex);',
          '    applyCompression (buffer);',
          '}',
        ],
        buggy: 3,
        explain: 'A mutex in processBlock: whenever the UI holds settingsMutex (mid-drag, mid-repaint), audio WAITS — priority inversion, and the deadline burns (r4). The settings must cross via atomics or a double-buffer flip; the audio thread reads what\'s ready and never queues.',
        fix: 'Share settings via std::atomic values or a double-buffered struct + atomic pointer flip',
      },
    ],
  },
  {
    id: 'rb2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Memory Leak', short: 'Find the bug',
    concepts: ['quality-eng'],
    intro: 'DISASTER FILE: RAM climbs a little with EVERY preset change, forever. After an afternoon of sound design: gigabytes. Tap the ownership hole.',
    questions: [
      {
        type: 'bugspot', concept: 'quality-eng',
        prompt: 'Something is bought on every load and never returned. Which line?',
        code: [
          'void loadPreset (int index)',
          '{',
          '    presetXml = new juce::XmlElement (*factory[index]);',
          '    apvts.replaceState (juce::ValueTree::fromXml (*presetXml));',
          '}',
        ],
        buggy: 2,
        explain: 'A raw new whose pointer is OVERWRITTEN next load — the previous XmlElement is orphaned every time: a leak per click, forever (Zone 2\'s exact lesson). Ownership wants RAII: a std::unique_ptr member (old copy auto-deleted on reassignment), or better, a stack-local copy that dies at the brace.',
        fix: 'auto presetXml = std::make_unique<juce::XmlElement> (*factory[index]);',
      },
    ],
  },
  {
    id: 'rb3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The CPU Monster', short: 'Find the bug',
    concepts: ['performance-eng'],
    intro: 'DISASTER FILE: one innocent-looking line owns a third of the CPU, says the profiler. It compiles clean. It reads clean. Tap it anyway.',
    questions: [
      {
        type: 'bugspot', concept: 'performance-eng',
        prompt: 'The profiler convicted this loop. Which line is the monster?',
        code: [
          'float* out = buffer.getWritePointer (0);',
          'for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '{',
          '    float g = apvts.getRawParameterValue ("gain")->load();',
          '    out[i] = renderSample() * g;',
          '}',
        ],
        buggy: 3,
        explain: 'getRawParameterValue is a STRING-KEYED LOOKUP — running 44,100 times a second to find the same pointer every time, plus an atomic load per sample for a per-block value. Cache the pointer once (a member, fetched in the constructor), load it once per block, hoist g above the loop (r11).',
        fix: 'Cache: gainParam = apvts.getRawParameterValue("gain"); then per block: const float g = gainParam->load();',
      },
    ],
  },
  {
    id: 'rb4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Silent Plugin', short: 'Find the bug',
    concepts: ['lifecycle-eng'],
    intro: 'DISASTER FILE: loads perfectly, passes the host scan, meters wiggle inside — and outputs pure silence. Trace the signal to where it dies.',
    questions: [
      {
        type: 'bugspot', concept: 'lifecycle-eng',
        prompt: 'The audio is rendered and then murdered. Which line?',
        code: [
          'void processBlock (juce::AudioBuffer<float>& buffer,',
          '                   juce::MidiBuffer& midi)',
          '{',
          '    handleMidi (midi);',
          '    renderVoices (buffer);',
          '    buffer.clear();   // tidy up before returning',
          '}',
        ],
        buggy: 5,
        explain: 'clear() AFTER rendering zeroes the freshly-written audio — the buffer leaves full of silence every block. (The internal meters read pre-clear, which is why they wiggle: the classic trap.) Generators clear-then-render or just overwrite; nothing "tidies" the output on the way out.',
        fix: 'Delete the clear — or clear FIRST, then render into the buffer',
      },
    ],
  },

  /* ============ COMPILER ============ */
  {
    id: 're1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Deleted Copy', short: 'Read the error',
    concepts: ['thread-safety'],
    intro: 'A meter refactor won\'t build: the compiler refuses to copy an atomic. It\'s not being difficult — it\'s teaching thread design. Decode it.',
    questions: [
      {
        type: 'compiler', concept: 'thread-safety',
        prompt: 'What fixes this build — and honors the design?',
        code: 'std::atomic<float> meterLevel { 0.0f };\n\nvoid updateMeterUi (std::atomic<float> level)   // pass by value\n{\n    meterDisplay.setLevel (level);\n}\n// call site:\nupdateMeterUi (meterLevel);',
        error: "error: use of deleted function\n'std::atomic<float>::atomic(const std::atomic<float>&)'\n    updateMeterUi (meterLevel);\n                   ^~~~~~~~~~",
        options: [
          { t: 'Pass the CONTENTS: updateMeterUi (meterLevel.load()) — take a float snapshot; atomics themselves are deliberately uncopyable', why: '' },
          { t: 'Pass by reference instead', why: 'It compiles — but now the function reads a LIVE shared value mid-update. The design wanted one snapshot: load() it, pass the float.' },
          { t: 'Remove the atomic wrapper', why: 'That un-fixes r3: the value is shared across threads — plain float sharing is the race you just cured.' },
          { t: 'Write a copy constructor for atomic', why: 'You can\'t (it\'s the library\'s type) — and shouldn\'t: "what does copying a synchronization point mean?" has no safe answer, which is WHY it\'s deleted.' },
        ],
        answer: 0,
        explain: 'Atomics are places, not values — copying a synchronization point is meaningless, so the standard deletes it. The compiler error is the design speaking: take a snapshot (load) and pass the plain float.',
      },
    ],
  },

  /* ============ ORDERING ============ */
  {
    id: 'ro1', kind: 'challenge', ctype: 'ordering', title: 'Order: The Golden Render', short: 'Arrange the test',
    concepts: ['quality-eng'],
    intro: 'The regression test that lets you refactor a synth engine fearlessly. Four steps, one correct order.',
    questions: [
      {
        type: 'order', concept: 'quality-eng',
        prompt: 'Arrange the golden-render procedure, top to bottom.',
        lines: [
          'synth.prepareToPlay (44100.0, 512);        // fix the world',
          'renderSequence (synth, testMidi, output);  // deterministic render',
          'compareBuffers (output, golden, 1.0e-6f);  // the null test',
          '// intentional sound change? re-bless a NEW golden, in its own commit',
        ],
        explain: 'Fix the world, render, compare — and when the sound changes ON PURPOSE, the new gold gets blessed deliberately, in a commit that says so. Refactors match the gold; surprises never ship.',
      },
    ],
  },

  /* ============ MISSIONS ============ */
  {
    id: 'p16', kind: 'project', title: 'Mission 1: The Thread Audit', short: 'Zone mission',
    concepts: ['thread-safety', 'rt-discipline'],
    brief: 'First Signal works — now prove it\'s SAFE. Audit every boundary crossing, replace the risky ones with proper vehicles, and give the meter its lock-free channel. Nothing may wait, nothing may race, nothing may allocate on the deadline.',
    steps: [
      {
        note: 'Step 1 — The audit. Walk every shared value and pass verdicts.',
        q: {
          type: 'match', concept: 'thread-safety',
          prompt: 'Verdicts for four crossings found in the audit.',
          left: ['gainParam->load() (APVTS)', 'float meterLevel; written by audio, read by UI', 'int waveform; written by UI, read by audio', 'heldNotes, touched ONLY inside processBlock'],
          right: ['already safe — APVTS atomics (r3)', 'unsafe — needs std::atomic<float>', 'unsafe — needs std::atomic<int>', 'safe — never crosses a boundary at all'],
          explain: 'The audit question is "who touches this, from where?" Single-thread data needs nothing; crossing data needs a vehicle. Two of four failed — typical for a first audit.',
        },
      },
      {
        note: 'Step 2 — The meter bridge. Audio measures; the UI narrates (r10).',
        q: {
          type: 'fill', concept: 'thread-safety',
          prompt: 'Declare the meter\'s safe crossing.',
          code: 'std::___<float> meterLevel { 0.0f };\n// audio thread, per block:  meterLevel.store (peak);\n// UI timer, 30 Hz:          display (meterLevel.load());',
          accept: ['atomic'],
          placeholder: 'template',
          hint: 'One value, two threads — r3\'s vehicle.',
          explain: 'Audio stores a peak per block; a UI timer loads and paints at its leisure. Nobody waits, nothing tears — the meter is now boring, which is the goal.',
        },
      },
      {
        note: 'Step 3 — The audit found a wait. Remove it.',
        q: {
          type: 'bugspot', concept: 'thread-safety',
          prompt: 'One line makes the deadline negotiable. Tap it.',
          code: [
            'void processBlock (juce::AudioBuffer<float>& buffer,',
            '                   juce::MidiBuffer& midi)',
            '{',
            '    const juce::ScopedLock sl (presetLock);',
            '    handleMidi (midi);',
            '    renderVoices (buffer);',
            '}',
          ],
          buggy: 3,
          explain: 'ScopedLock is a mutex in JUCE clothing: when the preset browser holds it, audio queues behind the UI — priority inversion on the deadline (r4). Preset data reaches audio via a double-buffered swap and one atomic pointer flip; the callback never waits.',
          fix: 'Double-buffer the preset data; audio reads via one atomic pointer load',
        },
      },
      {
        note: 'Step 4 — Policy question. The visualizer FIFO fills up. What does the audio-side writer do?',
        q: {
          type: 'mcq', concept: 'thread-safety',
          prompt: 'The ring is momentarily full. The writer (audio thread) should…',
          options: [
            { t: 'Drop the new data and move on — a visualizer missing one frame is invisible; audio waiting is audible', why: '' },
            { t: 'Wait for the reader to catch up', why: 'Waiting is THE forbidden verb (r4) — one slow repaint and the deadline dies for a pretty scope trace.' },
            { t: 'Grow the ring', why: 'Growth is allocation — r5\'s forbidden verb, mid-deadline. The ring\'s size was bought at soundcheck.' },
            { t: 'Crash with an error', why: 'A full ring is normal traffic, not an error — the design just needs a policy, and "drop" is the right one for display data.' },
          ],
          answer: 0,
          explain: 'For display data, dropping is free and waiting is fatal. Every FIFO ships with a full-ring policy chosen ON PURPOSE — that choice is the design (r4). First Signal\'s boundaries are now all vehicles, no waits.',
        },
      },
    ],
  },
  {
    id: 'p17', kind: 'project', title: 'Mission 2: The Preset Vault 2.0', short: 'Zone mission',
    concepts: ['state-eng', 'lifecycle-eng'],
    brief: 'First Signal\'s state must survive time, corruption, and live switching. Stamp versions, default the missing, keep every ID sacred — and make preset changes click-free. Old sessions are the customers you can\'t see.',
    steps: [
      {
        note: 'Step 1 — Stamp the era. Load code should never guess what it\'s reading.',
        q: {
          type: 'fill', concept: 'state-eng',
          prompt: 'Read the state\'s version — with the right default for PRE-stamp saves.',
          code: '// v1.0 never wrote a stamp; its saves must read as version…\nint loadedVersion = state.getProperty ("stateVersion", ___);',
          accept: ['1'],
          placeholder: 'default',
          hint: 'What era is a save with NO stamp from?',
          explain: 'Unstamped state IS v1.0 state — so the default for the missing stamp is 1. The stamp system must handle its own absence: version-safety begins at version one.',
        },
      },
      {
        note: 'Step 2 — The ID graveyard. v2.0 wants to rename "cutoff" to "brightness".',
        q: {
          type: 'mcq', concept: 'state-eng',
          prompt: 'The correct move?',
          options: [
            { t: 'Keep the ID "cutoff" forever — change only the display name. IDs are addresses old sessions and automation lanes write to', why: '' },
            { t: 'Rename it — 2.0 allows breaking changes', why: 'Major versions allow breaking BEHAVIOR — silently orphaning every session\'s saved value and automation is not a change, it\'s data loss.' },
            { t: 'Rename and migrate on load', why: 'State can migrate — but written AUTOMATION LANES in sessions target the old ID at the host level, beyond your load code\'s reach.' },
            { t: 'Ship both IDs', why: 'Two live IDs for one value = double automation targets and state ambiguity. The display name is the rename lever; the ID never moves.' },
          ],
          answer: 0,
          explain: 'Display names are yours; IDs belong to every session ever saved. Zone 3 made the promise, r9 explained the stakes — the graveyard rule: carved once, never edited.',
        },
      },
      {
        note: 'Step 3 — The Click of Doom. Preset changes pop while a chord rings. Arrange the click-free swap.',
        q: {
          type: 'order', concept: 'state-eng',
          prompt: 'Arrange the live preset-switch sequence, top to bottom.',
          lines: [
            'beginShortOutputFade();            // duck the output — a few ms',
            'apvts.replaceState (preset.state); // swap the world mid-silence',
            'snapAllSmoothers();                // world boundary: snap, don\'t glide (r7)',
            'endShortOutputFade();              // return clean — no pop shipped',
          ],
          explain: 'Fade, swap, snap, return: the audible step hides inside a deliberate fade. A preset load is a world boundary — handled on purpose, not left to whatever happens (r9).',
        },
      },
      {
        note: 'Step 4 — The time-machine test. Prove the promise.',
        q: {
          type: 'predict', concept: 'state-eng',
          prompt: 'A session saved by v1.0 opens in v1.2 (which added Drive, default off, and stamped versions). What does the producer hear?',
          code: '// v1.0 state: no "stateVersion", no "drive" property',
          options: [
            { t: 'Exactly the v1.0 sound: version defaults to 1, drive defaults to off, every known parameter keeps its saved value', why: '' },
            { t: 'A slightly driven version', why: 'Only if the default were wrong — drive defaults NEUTRAL precisely so this session is untouched (r9).' },
            { t: 'A crash on the missing properties', why: 'Every read names a fallback — missing properties resolve, never throw. That\'s the entire defensive-load design.' },
            { t: 'Default factory settings', why: 'The saved values all load — only the properties v1.0 never wrote fall back. The mix survives intact.' },
          ],
          answer: 0,
          explain: 'The whole discipline in one test: old sessions sound identical, new features default to silent, nothing crashes. First Signal now keeps faith with sessions that don\'t exist yet.',
        },
      },
    ],
  },
  {
    id: 'p18', kind: 'project', title: 'Mission 3: The Performance Clinic', short: 'Zone mission',
    concepts: ['performance-eng'],
    brief: 'First Signal visits the clinic: profile honestly, fix only what the numbers convict, and leave the CPU budget with headroom for the biggest patch on the smallest buffer. Measurement first — heroics never.',
    steps: [
      {
        note: 'Step 1 — Read the profile. Four findings, four verdicts.',
        q: {
          type: 'match', concept: 'performance-eng',
          prompt: 'Match each profiler finding to the clinic\'s diagnosis.',
          left: ['31%: decibelsToGain inside the sample loop', 'CPU climbs while tails fade to silence', 'spike during noteOn under heavy chords', 'steady 12% in renderVoices, flat under load'],
          right: ['hoist it — per-block value, per-sample cost (r11)', 'denormals — install the guard (r6)', 'allocation in the note path — pre-buy it (r5)', 'healthy — leave it alone'],
          explain: 'The clinic treats what the numbers convict — and explicitly does NOT treat the healthy 12%. Knowing what to leave alone is half of professional optimization.',
        },
      },
      {
        note: 'Step 2 — The cheapest win: idle voices must cost one if, not a render.',
        q: {
          type: 'fill', concept: 'performance-eng',
          prompt: 'Skip silent voices before any math happens.',
          code: 'for (auto& v : voices)\n{\n    if (! v.adsr.___())\n        continue;          // idle card: one test, zero math\n    renderVoice (v);\n}',
          accept: ['isActive'],
          placeholder: 'method',
          hint: 'The n9 lifecycle test.',
          explain: 'An 8-voice pool playing 2 notes should cost 2 renders + 6 ifs — not 8 renders. The n9 flag doubles as the performance gate: lifecycle and efficiency, one boolean.',
        },
      },
      {
        note: 'Step 3 — Buffer-wide math goes through the SIMD library, not a hand loop.',
        q: {
          type: 'fill', concept: 'performance-eng',
          prompt: 'Apply the output gain to the whole channel with JUCE\'s vectorized ops.',
          code: 'juce::FloatVectorOperations::___ (out, g,\n                                  buffer.getNumSamples());',
          accept: ['multiply'],
          placeholder: 'function',
          hint: 'Every sample × g, SIMD-wide, pre-tested.',
          explain: 'FloatVectorOperations::multiply runs the loop 4–8 floats per instruction — SIMD someone already wrote, tested, and tuned (r11). Simple contiguous math belongs in the library call.',
        },
      },
      {
        note: 'Step 4 — The exit exam: when do you hand-write SIMD intrinsics?',
        q: {
          type: 'mcq', concept: 'performance-eng',
          prompt: 'The clinic\'s rule for reaching for intrinsics?',
          options: [
            { t: 'Only when the profiler convicts a hot loop AFTER the boring fixes (hoisting, guards, library calls) — and a measurement proves the intrinsics won', why: '' },
            { t: 'Everywhere — SIMD is faster', why: 'Hand-vectorized code is harder to read, test and port — spent where measurements don\'t demand it, it\'s pure cost.' },
            { t: 'Never — compilers always win', why: 'Compilers miss real cases; pros DO hand-tune — but only convicted loops, and only after measuring the win.' },
            { t: 'Whenever loops look slow', why: '"Looks slow" is the exact instinct the profiler exists to overrule (r11). Measure, fix boring things, measure again.' },
          ],
          answer: 0,
          explain: 'The clinic discharges First Signal with headroom to spare — from hoists, a guard, an if, and one library call. No heroics were required; they almost never are.',
        },
      },
    ],
  },
  {
    id: 'p19', kind: 'project', title: 'Mission 4: Release Candidate', short: 'Zone mission',
    concepts: ['shipping', 'quality-eng'],
    brief: 'The last mission before the deadline: First Signal faces the entrance exams, blesses its first golden render, and walks the shipping checklist. At the end, a build is tagged 1.0 — and it MEANS something.',
    steps: [
      {
        note: 'Step 1 — pluginval reports a crash: "processBlock, buffer of 0 samples." Diagnose.',
        q: {
          type: 'mcq', concept: 'shipping',
          prompt: 'The crash is real and the host behavior is legal. What\'s the fix?',
          options: [
            { t: 'Find the code that indexes the buffer without checking getNumSamples() — loops bounded by the real count survive 0-sample blocks naturally (r13)', why: '' },
            { t: 'Report a pluginval bug', why: 'Real hosts send 0-sample blocks routinely (paused transports do it constantly) — the validator is playing documented reality.' },
            { t: 'Return early if samples == 0', why: 'It patches THIS symptom — but code bounded by getNumSamples() needs no special case, and special cases breed. Fix the shape, not the instance.' },
            { t: 'Require a minimum buffer size', why: 'You don\'t set the terms — the host does (r1). The plugin is the guest; the contract says handle what arrives.' },
          ],
          answer: 0,
          explain: 'The validator found an assumption, not an edge case. Code shaped by the contract has no 0-sample story to special-case — it just runs zero iterations and exits clean.',
        },
      },
      {
        note: 'Step 2 — Run the exam at full paranoia.',
        q: {
          type: 'fill', concept: 'shipping',
          prompt: 'Maximum strictness — the level your users\' hosts effectively apply.',
          code: 'pluginval --strictness-level ___ --validate FirstSignal.vst3',
          accept: ['10'],
          placeholder: 'level',
          hint: 'The top of the scale.',
          explain: 'Strictness 10: every lifecycle torture, every absurd-but-legal input, concentrated. Passing it Monday beats a customer administering the same exam on Friday (r13).',
        },
      },
      {
        note: 'Step 3 — Bless the sound. The golden render becomes 1.0\'s sonic signature.',
        q: {
          type: 'predict', concept: 'quality-eng',
          prompt: 'A month AFTER 1.0, a refactor accidentally changes the saw\'s level by 0.2 dB. What happens on the next build?',
          code: '// CI runs: compareBuffers (output, golden_1_0, 1.0e-6f)',
          options: [
            { t: 'The golden test FAILS the build — the accidental sonic change is caught before any user hears it', why: '' },
            { t: 'Nothing — 0.2 dB is inaudible', why: 'Audible-to-whom isn\'t the question: the gold certifies IDENTICAL. 0.2 dB is astronomically beyond 1e-6 tolerance — the diff screams.' },
            { t: 'The gold updates automatically', why: 'Golds re-bless only DELIBERATELY, in a commit that says so (r12) — automatic updates would make the test decorative.' },
            { t: 'Only users notice', why: 'That\'s the world WITHOUT the gold — the entire point of blessing one is that the build machine notices first, forever.' },
          ],
          answer: 0,
          explain: 'The gold is 1.0\'s sound, frozen: refactor fearlessly, and the moment anything drifts, a machine says so. This is how engines get rebuilt without a single accidental sonic change shipping.',
        },
      },
      {
        note: 'Step 4 — The list is green. Then QA finds a typo-level bug in the pedal logic.',
        q: {
          type: 'mcq', concept: 'shipping',
          prompt: 'You fix it in one line. Now what?',
          options: [
            { t: 'Restart the checklist from the top — the fix is untested code, and the list exists because "can\'t affect anything" is a guess (r15)', why: '' },
            { t: 'Ship — it\'s one line', why: 'The confident last-minute one-liner is a documented genre of shipped disaster. The list has no fast lane.' },
            { t: 'Ship and patch later', why: 'Knowingly shipping an unverified build spends the trust the whole zone was building — and patches don\'t un-ring bells.' },
            { t: 'Revert the fix and ship the bug', why: 'A KNOWN pedal bug in 1.0? The deadline pressure is real — and the answer is still: fix, re-verify, ship right.' },
          ],
          answer: 0,
          explain: 'Freeze → prove → validate → ship, and any change re-enters at the top. The suite re-runs in minutes; a bad 1.0 lasts forever. First Signal 1.0: tagged, tested, TRUE. One boss stands between you and the release.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss6', kind: 'boss', title: 'BOSS: The Shipping Deadline', short: 'Zone 6 boss', passNeed: 6,
    concepts: ['thread-safety', 'rt-discipline', 'state-eng', 'performance-eng', 'shipping'],
    brief: 'First Signal 1.0 ships tomorrow at 9 AM. Tonight, QA files eight critical bugs: a random crackle, a once-in-fifty tick, a crash on corrupted presets, a zippering sweep, a validator failure, a screaming startup, a silence-fed CPU climb, and RAM that never comes back. Repair 6 of 8 before dawn and the release goes out with your name on it.',
    stages: [
      {
        type: 'bugspot', concept: 'rt-discipline',
        prompt: 'QA #1 — Random crackles under load, worse with more voices. Tap the heap purchase on the deadline.',
        code: [
          'void processBlock (juce::AudioBuffer<float>& buffer,',
          '                   juce::MidiBuffer& midi)',
          '{',
          '    std::vector<float> wet (buffer.getNumSamples());',
          '    renderInto (wet);',
          '    mixToOutput (buffer, wet);',
          '}',
        ],
        buggy: 3,
        explain: 'A fresh vector per block: heap allocation 344 times a second at 128/44.1k — usually fast, occasionally unbounded, audibly crackling under load (r5). Scratch space is a member, sized once in prepareToPlay, reused forever.',
        fix: 'Member buffer sized in prepareToPlay: wetBuffer.setSize (1, samplesPerBlock);',
      },
      {
        type: 'bugspot', concept: 'thread-safety',
        prompt: 'QA #2 — A one-sample tick in bounces, once in ~fifty renders, never reproducible in the debugger. Tap the race\'s home.',
        code: [
          '// PluginProcessor.h — members:',
          'float uiCutoff = 1200.0f;   // slider writes, audio reads',
          'std::atomic<float> outputGain { 1.0f };',
          'juce::ADSR adsr;',
        ],
        buggy: 1,
        explain: 'A plain float crossing the thread boundary: the slider stores, audio loads, and once in fifty bounces they collide — stale, torn, or reordered (r3). "Can\'t reproduce" is the race\'s signature. The neighbor got it right: std::atomic<float>, like outputGain.',
        fix: 'std::atomic<float> uiCutoff { 1200.0f };',
      },
      {
        type: 'fill', concept: 'state-eng',
        prompt: 'QA #3 — A corrupted preset file CRASHES the synth mid-session. Complete the guard that keeps a bad file harmless.',
        code: 'auto xml = getXmlFromBinary (data, sizeInBytes);\nif (xml == nullptr || ! xml->hasTagName (apvts.state.getType()))\n    ___;   // bad data: keep playing the current state\napvts.replaceState (juce::ValueTree::fromXml (*xml));',
        accept: ['return', 'return;'],
        placeholder: 'statement',
        hint: 'A corrupted preset should cost the user NOTHING.',
        explain: 'Parse, null-check, tag-check, and bail politely — the session keeps its current sound instead of dying (rc3, r14). Defensive loading turns "crash on corrupt file" into "nothing happened."',
      },
      {
        type: 'bugspot', concept: 'automation-eng',
        prompt: 'QA #4 — Automated CUTOFF sweeps zipper; gain sweeps are silky. Same smoothers, different calls. Tap the snap.',
        code: [
          'void processBlock (…)',
          '{',
          '    gainSmoothed.setTargetValue (gainParam->load());',
          '    cutoffSmoothed.setCurrentAndTargetValue (cutoffParam->load());',
          '    renderBlock (buffer);',
          '}',
        ],
        buggy: 3,
        explain: 'setCurrentAndTargetValue SNAPS — every automation update lands as a step, and steps are d13\'s clicks. Mid-render the call is setTargetValue (glide); the snap belongs only at world boundaries like prepare and preset loads (r7, r8).',
        fix: 'cutoffSmoothed.setTargetValue (cutoffParam->load());',
      },
      {
        type: 'bugspot', concept: 'shipping',
        prompt: 'QA #5 — pluginval crashes it in seconds with small and zero-sample blocks. Tap the assumption.',
        code: [
          'void processBlock (juce::AudioBuffer<float>& buffer,',
          '                   juce::MidiBuffer&)',
          '{',
          '    float* out = buffer.getWritePointer (0);',
          '    for (int i = 0; i < 512; ++i)',
          '        out[i] = renderSample();',
          '}',
        ],
        buggy: 4,
        explain: 'A hard-coded 512 writes past the end of every smaller block — including the perfectly legal 0- and 1-sample blocks validators (and paused hosts) send (r13). The bound is always buffer.getNumSamples(): the host sets the terms, every block.',
        fix: 'for (int i = 0; i < buffer.getNumSamples(); ++i)',
      },
      {
        type: 'bugspot', concept: 'lifecycle-eng',
        prompt: 'QA #6 — In one host the synth loads DEAD: the output is poisoned with NaNs until any knob is touched. Fine everywhere else. Tap the too-early question.',
        code: [
          'FirstSignalProcessor::FirstSignalProcessor()',
          '{',
          '    lfoIncrement = juce::MathConstants<double>::twoPi',
          '                 * 5.0 / getSampleRate();',
          '}',
        ],
        buggy: 3,
        explain: 'getSampleRate() in the CONSTRUCTOR — before any prepareToPlay it returns 0, so the division yields infinity, sin(∞) yields NaN, and NaN poisons every sample it touches: dead output until something recomputes the increment. Rate-derived math belongs in prepareToPlay, where the rate is real (r7 — and boss3\'s ghost, returned).',
        fix: 'Compute lfoIncrement in prepareToPlay, from the sampleRate argument',
      },
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'QA #7 — CPU is low while playing, then CLIMBS for ~10 seconds as every release tail fades. Diagnose and fix.',
        code: '// profile: float math in the voice loop, cost rising as levels fall',
        options: [
          { t: 'Denormals: decaying tails cross ~10⁻³⁸ and hit microcode-slow float handling — add juce::ScopedNoDenormals at the top of processBlock', why: '' },
          { t: 'Voices failing to free — fix the lifecycle', why: 'Stuck voices cost their NORMAL amount; the fingerprint here is cost RISING as values shrink — that\'s r6\'s brake, not n9\'s flip.' },
          { t: 'The UI meter polling too fast', why: 'Wrong thread entirely — the climb is inside the voice loop\'s float math, says the profile.' },
          { t: 'Raise the buffer size', why: 'A longer deadline hides the symptom without touching the cause — the math itself is running 10–100× slow.' },
        ],
        answer: 0,
        explain: 'Quiet-but-expensive: the r6 fingerprint, verbatim. One scoped guard flushes the sub-audible values to zero and the whole climb vanishes — the night\'s cheapest fix.',
      },
      {
        type: 'bugspot', concept: 'quality-eng',
        prompt: 'QA #8 — RAM grows with every preset load and never returns. Ships in 9 hours. Tap the orphan-maker.',
        code: [
          'void setStateInformation (const void* data, int sizeInBytes)',
          '{',
          '    auto* xml = getXmlFromBinary (data, sizeInBytes).release();',
          '    if (xml != nullptr)',
          '        apvts.replaceState (juce::ValueTree::fromXml (*xml));',
          '}',
        ],
        buggy: 2,
        explain: '.release() strips the unique_ptr\'s ownership and hands you a raw pointer nobody ever deletes — one orphaned XmlElement per preset load, forever (Zone 2\'s RAII lesson, on deadline night). Keep the smart pointer: auto xml = getXmlFromBinary(…); use *xml — it frees itself at the brace.',
        fix: 'auto xml = getXmlFromBinary (data, sizeInBytes);  // no .release() — RAII owns it',
      },
    ],
  },
];
