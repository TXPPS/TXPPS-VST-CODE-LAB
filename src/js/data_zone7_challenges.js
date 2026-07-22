/* ============================================================
   ZONE 7 — engineering-task challenges and the final boss.
   (Product missions p20–p30 live in data_zone7_missions.js,
   which pushes into ZONE7_CHALLENGES after this file runs.)
   ============================================================ */

const ZONE7_CHALLENGES = [

  /* ============ TICKETS: READING ============ */
  {
    id: 'fr1', kind: 'challenge', ctype: 'reading', title: 'Ticket: The Validation Log', short: 'Read the report',
    concepts: ['product-eng'],
    intro: 'QA attached a pluginval run for the product line. Four findings. Read it like the engineer on call: each line names a lesson you already own.',
    questions: [
      {
        type: 'match', concept: 'product-eng',
        prompt: 'Match each validation finding to its fix.',
        left: ['CRASH: processBlock, buffer of 0 samples', 'FAIL: state restored while rendering caused a data race', 'WARN: prepare(96000, 64) after prepare(44100, 512) — output detuned', 'CRASH: editor opened before prepareToPlay, null deref'],
        right: ['bound every loop by getNumSamples() (r13)', 'state must cross via replaceState + atomics (r9)', 'prepare must recompute ALL rate math, every call (r7)', 'defend the pointer: jassert + null-check (r14)'],
        explain: 'A validation log is a map of assumptions. Every finding traces to one contract — and every contract has a zone behind it.',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'The log shows all four findings fixed, strictness 10 green. What does that PROVE — and not prove?',
        options: [
          { t: 'The plugin honors the host contract under concentrated legal stress — it does NOT prove the sound is right (that\'s the golden render\'s job)', why: '' },
          { t: 'The plugin is bug-free', why: 'Validation exercises the CONTRACT, not your DSP\'s musical correctness — different gates, both required (r12/r13).' },
          { t: 'The plugin is fast enough', why: 'Performance is the profiler\'s verdict (r11) — validators barely glance at CPU.' },
          { t: 'Nothing — validators are theater', why: 'Every finding above was a real crash a real host would eventually find. Concentrated reality, not theater.' },
        ],
        answer: 0,
        explain: 'Each gate proves one thing: units prove pieces, golds prove the sound, validation proves the contract, profiling proves the budget. Shipping means ALL gates green — no gate substitutes for another.',
      },
    ],
  },
  {
    id: 'fr2', kind: 'challenge', ctype: 'reading', title: 'Ticket: The Crash Report', short: 'Read the trace',
    concepts: ['product-eng'],
    intro: 'A customer session went down with TXPPS Poly Synth loaded. No repro steps — just the trace. Ten minutes of reading beats ten emails of "what were you doing when…" (r14).',
    questions: [
      {
        type: 'match', concept: 'product-eng',
        prompt: 'Read the trace top-down. Match each frame to what it tells you.',
        left: ['#0 Voice::renderFilter (this=0x00000068)', '#1 Engine::renderActiveVoices', '#2 Processor::processBlock', '#3 HostApp::AudioGraph::process'],
        right: ['the X: null-plus-offset — a voice pointer was null, 0x68 is a member offset', 'your topmost caller — it handed out the null', 'the deadline was mid-flight when it died', 'the host\'s territory — not your suspect'],
        explain: 'Frame 0 says WHERE, the tiny address says WHAT KIND (null + member offset), and your topmost frame starts the suspect list — r14\'s whole method in four rows.',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'Given null-voice-during-render, which suspect list does the trace justify FIRST?',
        options: [
          { t: 'Code that can null or free a voice while audio runs: preset loads, prepare/reset paths, anything crossing the thread boundary (r2/r9)', why: '' },
          { t: 'The filter math', why: 'The filter never ran — this was null BEFORE the math. The address says lifecycle/threading, not DSP.' },
          { t: 'The customer\'s RAM', why: 'Hardware paranoia comes after the obvious: something in YOUR code handed render a null voice.' },
          { t: 'The host', why: 'Frame #3 is the host doing its job. The null was born in frames #0–#2 — your house.' },
        ],
        answer: 0,
        explain: 'The trace narrows a codebase to a shortlist: who can invalidate a voice mid-render? That question — not the stack itself — is what solves the case.',
      },
    ],
  },

  /* ============ TICKETS: FEATURES ============ */
  {
    id: 'fc1', kind: 'challenge', ctype: 'completion', title: 'Feature Request: Wet/Dry', short: 'Implement it',
    concepts: ['product-eng'],
    intro: 'REQUEST #112: "Love the delay — can I blend it with the dry signal for parallel processing?" Estimated: two lines. You\'ve had both since d11.',
    questions: [
      {
        type: 'fill', concept: 'product-eng',
        prompt: 'Implement the blend: two gains, two signals, one bus.',
        code: 'float out = input * (1.0f - mix) ___ delayed * mix;',
        accept: ['+'],
        placeholder: 'operator',
        hint: 'd11: a bus is a plus sign.',
        explain: 'Dry scaled down as wet scales up, summed. mix = 0 is pure dry, 1 is pure wet, 0.5 is parallel processing. Feature shipped — d11 closed the ticket.',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'QA asks: should the new mix knob be smoothed?',
        options: [
          { t: 'Yes — it\'s a continuous scaler on audio; stepped changes zipper (d13). setTargetValue per block, getNextValue per sample', why: '' },
          { t: 'No — it\'s a new parameter', why: 'Age doesn\'t matter; SHAPE does. Continuous scalers glide, switches snap — the d13 rule covers every future knob too.' },
          { t: 'Only above 50%', why: 'Zipper physics doesn\'t care where the knob points — every step is a corner at any position.' },
          { t: 'Smoothing is only for gain', why: 'Gain, pan, cutoff, mix — anything continuously scaling audio. The rule is about the parameter\'s nature, not its name.' },
        ],
        answer: 0,
        explain: 'Every new continuous parameter inherits the whole discipline automatically: atomic crossing (r3), smoothing (d13), state with defaults (r9). That inheritance is what "architecture" means.',
      },
    ],
  },
  {
    id: 'fc2', kind: 'challenge', ctype: 'completion', title: 'Feature Request: Tempo Sync', short: 'Implement it',
    concepts: ['product-eng'],
    intro: 'REQUEST #118: "Delay times in note values, please — my dub patches live at dotted eighths." The host supplies BPM; you supply the conversion.',
    questions: [
      {
        type: 'fill', concept: 'product-eng',
        prompt: 'Convert the host\'s tempo to seconds per beat.',
        code: 'double secondsPerBeat = ___ / hostBpm;   // 120 BPM → 0.5 s',
        accept: ['60.0', '60', '60.0f', '60.f'],
        placeholder: 'numerator',
        hint: 'Beats per minute → seconds per beat.',
        explain: '60 ÷ BPM: at 120 BPM a beat is half a second. Multiply by the note-value ratio (0.75 for dotted eighth of a beat… of a quarter — define your table!), then × sampleRate for the read-head distance (f1).',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'The producer automates a TEMPO CHANGE mid-song. What must the synced delay do?',
        options: [
          { t: 'Recompute delaySamples from the new BPM — and GLIDE the change (d13), or the read head jumps with a click', why: '' },
          { t: 'Ignore it — sync happens at load', why: 'Tempo automation is routine in the wild; a synced delay that ignores it drifts off the grid immediately.' },
          { t: 'Re-allocate the delay line', why: 'The line was sized for MAX delay (f1) — tempo changes just move the read head. No purchase needed, ever.' },
          { t: 'Ask the user to reload', why: 'Plugins are guests that adapt (r13) — a reload dialog for a tempo change would be a one-star review generator.' },
        ],
        answer: 0,
        explain: 'Sync is a live conversion, not a load-time constant: new BPM → new delaySamples → glided move. Every zone\'s discipline shows up in a two-line feature.',
      },
    ],
  },

  /* ============ TICKETS: BUGS ============ */
  {
    id: 'fb1', kind: 'challenge', ctype: 'bugfix', title: 'Customer Bug: The Sometimes-Crash', short: 'Fix it',
    concepts: ['product-eng'],
    intro: 'TICKET #204: "TXPPS Delay crashes my session — but only at very short delay times, and only sometimes." Sometimes is a clue: think about WHEN the math goes bad.',
    questions: [
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'Tap the line that sometimes computes an illegal index.',
        code: [
          'void processSample (float input)',
          '{',
          '    int readPos = (writePos - delaySamples) % lineLength;',
          '    float delayed = data[readPos];',
          '    data[writePos] = input + delayed * feedback;',
          '    if (++writePos >= lineLength) writePos = 0;',
          '}',
        ],
        buggy: 2,
        explain: 'Early in the buffer\'s life writePos < delaySamples, the subtraction goes negative — and C++\'s % preserves that sign: a negative index into data[]. "Sometimes" = whenever the write head is near the wrap. Explicit wrap: subtract, then add lineLength if negative (f1\'s law).',
        fix: 'int readPos = writePos - delaySamples; if (readPos < 0) readPos += lineLength;',
      },
    ],
  },
  {
    id: 'fb2', kind: 'challenge', ctype: 'bugfix', title: 'Regression: The Detuned Chorus', short: 'Fix it',
    concepts: ['product-eng'],
    intro: 'REGRESSION #77: "Chorus sounded perfect in the 44.1k demo session; in my 96k project the movement is wrong — too shallow, too fast-feeling." A number stopped meaning what someone assumed.',
    questions: [
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'One line treats milliseconds as samples. Tap it.',
        code: [
          'void prepareToPlay (double sampleRate, int samplesPerBlock)',
          '{',
          '    centerDelay = (int) (12.0 * 44.1);   // "12 ms, in samples"',
          '    line.setSize (1, (int)(0.05 * sampleRate));',
          '}',
        ],
        buggy: 2,
        explain: 'The samples-per-millisecond factor is HARD-CODED at 44.1 — exactly right in a 44.1k session, and silently wrong everywhere else: at 96k those 529 samples are only ~5.5 ms, so the chorus center halves and the movement changes character. Convert through the argument the host just handed you: (int)(0.012 * sampleRate) — the rate lives in code, never in a constant (d2, r7, fb2 closed).',
        fix: 'centerDelay = (int) (0.012 * sampleRate);   // ms → samples, at THIS rate',
      },
    ],
  },
  {
    id: 'fb3', kind: 'challenge', ctype: 'bugfix', title: 'Customer Bug: The Wandering Sampler', short: 'Fix it',
    concepts: ['product-eng'],
    intro: 'TICKET #231: "High notes on TXPPS Sampler sometimes play a burst of static at the end of the sound." High notes = fast playheads = something running past an edge.',
    questions: [
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'A one-shot voice reads past the end of the recording. Tap the missing boundary\'s neighbor — the line that trusts the playhead.',
        code: [
          'playhead += ratio;',
          'int   i    = (int) playhead;',
          'float frac = playhead - i;',
          'float out  = sample[i] + frac * (sample[i + 1] - sample[i]);',
        ],
        buggy: 3,
        explain: 'At ratio 2.0 the playhead sails past the last slot and sample[i + 1] reads foreign memory — static, then sometimes a crash (Zone 1\'s cardinal sin at product scale). One-shots must BOUND: if (i + 1 >= length) { endVoice(); return 0.0f; } before any read. Loops wrap; one-shots bound — both exits mandatory (f4).',
        fix: 'if (i + 1 >= sampleLength) { endVoice(); return 0.0f; }',
      },
    ],
  },

  /* ============ COMPILER ============ */
  {
    id: 'fe1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Buffer That Isn\'t an Array', short: 'Read the error',
    concepts: ['product-eng'],
    intro: 'The delay refactor won\'t build. juce::AudioBuffer guards its samples behind methods — the compiler is reminding you where the doorway is.',
    questions: [
      {
        type: 'compiler', concept: 'product-eng',
        prompt: 'What fixes this build?',
        code: 'juce::AudioBuffer<float> line;\n\nfloat readDelayed (int readPos)\n{\n    return line[readPos];   // read the delay line\n}',
        error: "error: no match for 'operator[]'\n(operand types are 'juce::AudioBuffer<float>' and 'int')\n    return line[readPos];\n               ^",
        options: [
          { t: 'Go through the doorway: line.getReadPointer(0)[readPos] (or getSample) — AudioBuffer is channels × samples, not a flat array', why: '' },
          { t: 'Cast the buffer to float*', why: 'Casting past an interface abandons every guarantee it encodes (channel layout, bounds discipline). The methods ARE the design.' },
          { t: 'Use std::vector instead', why: 'It would compile — and orphan you from every JUCE facility (clear, setSize, channel handling) the product line leans on.' },
          { t: 'Overload operator[] yourself', why: 'Modifying library types you don\'t own is a maintenance trap — the accessor already exists, with a channel argument for a reason.' },
        ],
        answer: 0,
        explain: 'AudioBuffer is a grid (channels × samples, j-era lesson), so access names the channel: getReadPointer(ch) for a lane, getSample for one value. The "missing operator" is the API telling you its shape.',
      },
    ],
  },

  /* ============ ORDERING ============ */
  {
    id: 'fo1', kind: 'challenge', ctype: 'ordering', title: 'Order: One Sample Through the Delay', short: 'Arrange it',
    concepts: ['product-eng'],
    intro: 'The f1 machine, shuffled. Only one order reads yesterday, records today, and keeps the circle honest.',
    questions: [
      {
        type: 'order', concept: 'product-eng',
        prompt: 'Arrange the per-sample delay algorithm exactly as f1 teaches it: read → write → mix → advance.',
        lines: [
          'float delayed = readLine (writePos - delaySamples);  // read the past',
          'writeLine (writePos, input + delayed * feedback);    // record + regen',
          'float out = input * dry + delayed * wet;             // mix the bus',
          'if (++writePos >= lineLength) writePos = 0;          // advance & wrap',
        ],
        explain: 'Read before write (or a zero-length delay eats its own fresh input), mix from what you read, advance last so both heads stay in step. The order IS the machine.',
      },
    ],
  },

  /* ============ FINAL BOSS ============ */
  {
    id: 'boss7', kind: 'boss', title: 'BOSS: The Release Candidate', short: 'Final boss', passNeed: 6,
    concepts: ['product-eng'],
    brief: 'The last build of TXPPS Signature — the capstone plugin — sits one approval away from launch. QA\'s final pass found eight defects, and they span EVERYTHING: Zone 1 arithmetic, Zone 4 DSP, Zone 5 voices, Zone 6 discipline, Zone 7 products. No single lesson saves you. All of them do. Clear 6 of 8, sign the release — and graduate.',
    stages: [
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'QA #1 — "The wet/dry knob does nothing until 100%, then snaps to full wet." A Zone 1 ghost. Tap it.',
        code: [
          'int mixPercent = (int) mixParam->load();   // 0..100',
          'float mix = mixPercent / 100;',
          'out = dry * (1.0f - mix) + wet * mix;',
        ],
        buggy: 1,
        explain: 'int ÷ int truncates: every value below 100 becomes 0, and 100 becomes exactly 1 — the knob is a switch. Zone 1\'s first trap, alive in a shipping product: divide by 100.0f.',
        fix: 'float mix = mixPercent / 100.0f;',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'QA #2 — "The saturation stage sounds great low, but bright leads get an inharmonic fizz that moves DOWN as I play UP." Diagnose and pick the release-grade response.',
        code: '// heavy tanh drive on harmonically rich material',
        options: [
          { t: 'Aliasing (d8): the shaper\'s new harmonics fold past Nyquist. Release-grade: oversample the saturation stage, or ship with the limitation documented (r15) — chosen deliberately', why: '' },
          { t: 'Lower the output gain', why: 'Level doesn\'t un-fold harmonics — the fizz is spectral (d8\'s fingerprint), not a loudness issue.' },
          { t: 'Blame the customer\'s converter', why: 'The wrong-way movement is fold-back, generated inside YOUR shaper — d8 signed this ticket.' },
          { t: 'Filter the input to remove all highs', why: 'That "fix" removes the material the customer bought the plugin to saturate. Raise the ceiling (oversample) or document — don\'t amputate.' },
        ],
        answer: 0,
        explain: 'd8 taught the fingerprint, f2 taught who breeds the harmonics, r15 taught the honest choice. Release engineering is picking a cure ON PURPOSE — including "documented limitation" when that\'s the truthful trade.',
      },
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'QA #3 — "After using the sustain pedal ONCE, some later notes never release." Zone 5\'s bookkeeping. Tap the poisoned claim.',
        code: [
          'void claimVoice (Voice& v, int note, float vel)',
          '{',
          '    v.note      = note;',
          '    v.velGain   = vel;',
          '    v.sustained = true;',
          '    v.adsr.noteOn();',
          '}',
        ],
        buggy: 4,
        explain: 'Every new note is born PRE-MARKED as pedal-held: its eventual note-off gets deferred forever if the pedal logic ever consults the flag. The claim must CLEAR the mark (v.sustained = false) — stale pedal marks are n10\'s stuck-note factory, and p15\'s field report, shipped.',
        fix: 'v.sustained = false;   // a new life starts with clean paperwork',
      },
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'QA #4 — "Debug builds crackle under load; Release is clean. Also: WHY is there console spam?" Tap the r10 violation.',
        code: [
          'for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '{',
          '    out[i] = renderSample();',
          '    DBG ("out: " + juce::String (out[i]));',
          '}',
        ],
        buggy: 3,
        explain: 'DBG builds a heap String and prints — per SAMPLE, on the audio thread: allocation (r5) plus I/O, 44,100 times a second. Debug-only doesn\'t mean harmless: it hides races by shifting timing and makes Debug untestable. Audio-thread visibility = values into atomics/FIFOs; the UI narrates (r10).',
        fix: 'Delete it — meter via a std::atomic the UI reads',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'QA #5 — "Customers report old sessions sound DISTORTED after the update." The update added a Saturation knob. Diagnose.',
        code: '// v2.1 added: AudioParameterFloat "saturation", default = 0.5f',
        options: [
          { t: 'The new parameter defaults to HALF DRIVE — every old session inherits distortion it never had. New features default NEUTRAL (r9): 0.0, off', why: '' },
          { t: 'The saturation algorithm is wrong', why: 'The algorithm is fine for those who ASK for it — the crime is volunteering it to two years of finished mixes.' },
          { t: 'Old sessions are corrupt', why: 'The sessions are pristine — they simply never saved a "saturation" value, so the DEFAULT is what they hear (r9\'s whole lesson).' },
          { t: 'Ship a preference toggle', why: 'A setting to un-break old sessions is an apology wearing a checkbox. Fix the default; old mixes must load IDENTICAL.' },
        ],
        answer: 0,
        explain: 'r9\'s golden rule met its consequence: the default IS what old sessions hear. Change it to neutral, ship 2.1.1 as a patch, and the archive is sacred again.',
      },
      {
        type: 'bugspot', concept: 'product-eng',
        prompt: 'QA #6 — "The delay\'s repeats get LOUDER each pass until everything clips." Tap the ceiling that isn\'t one.',
        code: [
          'void setFeedback (float fb)',
          '{',
          '    feedback = juce::jlimit (0.0f, 1.2f, fb);',
          '}',
        ],
        buggy: 3,
        explain: 'The clamp exists — with the wrong ceiling: 1.2 permits gain-greater-than-one regeneration, and each echo grows by 20% until d10\'s flat-tops arrive. Runaway feedback is exponential; the safe ceiling is below 1.0 (0.95 leaves dub headroom without the meltdown).',
        fix: 'feedback = juce::jlimit (0.0f, 0.95f, fb);',
      },
      {
        type: 'fill', concept: 'product-eng',
        prompt: 'QA #7 — "Synced delays are off-grid at every rate except 44.1k." Complete the conversion with the value that is true in EVERY session.',
        code: 'double secondsPerBeat = 60.0 / hostBpm;\ndelaySamples = (int) (secondsPerBeat * beatRatio * ___);',
        accept: ['sampleRate', 'getSampleRate()', 'getSampleRate ()'],
        placeholder: 'factor',
        hint: 'The number that turns seconds into samples — prepareToPlay hands it to you (r7).',
        explain: 'Someone hard-coded 44100 and every other rate drifted off-grid. Seconds × sampleRate — the d2 conversion, read from the argument the host provides, recomputed every prepare (r7). The oldest lesson closes the newest ticket.',
      },
      {
        type: 'mcq', concept: 'product-eng',
        prompt: 'QA #8 — FINAL GATE. All seven fixes are in. The golden render now FAILS — output differs from the blessed 2.0 reference. Your call, engineer.',
        code: '// compareBuffers(output, golden_2_0): FAIL — max diff 0.31',
        options: [
          { t: 'Expected: the fixes CHANGED the output (bugs removed). Verify each diff traces to a fix, re-bless a new golden in its own commit, restart the checklist, ship', why: '' },
          { t: 'Loosen the tolerance until it passes', why: 'Negotiating with the ruler (r12) — the test caught real change, which is its job. Blessing is deliberate; fudging is forever.' },
          { t: 'Revert the fixes to keep the gold green', why: 'Shipping known bugs to satisfy a test inverts the entire point of testing. Golds serve the product, not the other way around.' },
          { t: 'Delete the golden test', why: 'The test just did EXACTLY what it exists for. Keep it, re-bless it, and it guards version 2.1 the way it guarded 2.0.' },
        ],
        answer: 0,
        explain: 'The last lesson of the curriculum: tests are instruments, not obstacles. Verify, re-bless deliberately, restart the list (r15), ship with your name on it. Release approved — TXPPS Signature 2.1 is GO. And so are you.',
      },
    ],
  },
];
