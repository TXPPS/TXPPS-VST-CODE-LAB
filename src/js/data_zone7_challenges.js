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
        explain: '60 ÷ BPM: at 120 BPM a beat is half a second. Multiply by the note-value ratio (0.75 for dotted eighth of a beat… of a quarter — define your table!), then × sampleRate to get how far back to place the read head (f1).',
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
        explain: 'Sync isn\'t a number you set once at load — it\'s a live conversion: new BPM → new delaySamples → glided move. Every zone\'s discipline shows up in a two-line feature.',
      },
    ],
  },

  /* ============ TICKETS: BUGS ============ */
  {
    id: 'fb1', kind: 'challenge', ctype: 'bugfix', title: 'Customer Bug: The Sometimes-Crash', short: 'Fix it',
    concepts: ['product-eng'],
    intro: 'TICKET #204: "TXPPS Delay crashes my session — only sometimes, and it seems WORSE at long delay times." Sometimes is a clue: think about WHEN the math goes bad.',
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
        explain: 'Whenever writePos < delaySamples — the window just after each wrap — the subtraction goes negative, and C++\'s % preserves that sign: a negative index into data[]. Longer delays widen the window, which is why the ticket says "worse at long delay times." Explicit wrap: subtract, then add lineLength if negative (f1\'s law).',
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

  /* ============ BOSS ============ */
  {
    id: 'boss7', kind: 'boss', title: 'BOSS: Master Signal', short: 'Final boss', passNeed: 4,
    concepts: ['architecture-review', 'root-cause', 'integration', 'evidence-debugging', 'release-decision', 'ship-signoff'],
    brief: 'The final release review of First Signal 1.0 — and you are leading it. Six open questions span everything you have learned: ownership, signal integrity, architecture, threading, testing, judgment. No single zone answers any of them; all of them do. Settle at least 4 to make the ship decision. This is not an exam. It is your first review as the engineer in charge.',
    stages: [
      {
        type: 'bugspot', concept: 'architecture-review', qid: 'b7s1',
        prompt: 'Phase 1 — Engineering Review. Final architecture sweep of the editor. One line will dangle the moment the host changes sample rate — and it spans three zones\' rules at once. Tap it.',
        code: [
          'class FirstSignalEditor : public juce::AudioProcessorEditor,',
          '                          private juce::Timer',
          '{',
          '    void timerCallback() override',
          '    {',
          '        levelLabel.setText(juce::String(processorRef.currentRms.load()),',
          '                           juce::dontSendNotification);   // GUI timer reads the atomic',
          '    }',
          '    SynthVoice* hotVoice = processorRef.voices.front().get();   // cached for "speed"',
          '};',
        ],
        buggy: 8,
        explain: 'The timer reading the atomic (lines 6–7) is exactly right — that is Zone 5\'s meter bridge on Zone 4\'s message thread, and it stays. The defect is the cached raw pointer: the PROCESSOR owns its voices (Zone 2 — one owner, visible in the type), and prepareToPlay may rebuild that pool on any rate change (Zone 4 — the lifecycle contract), leaving the editor holding a dangling pointer it never owned. Editors ask the processor when they need something; they never cache into another object\'s ownership. One line, three zones.',
        fix: 'Remove the cache — query through processorRef when needed',
      },
      {
        type: 'predict', concept: 'root-cause', qid: 'b7s2',
        prompt: 'Phase 1 — Engineering Review. QA reports: "bounced mixes crackle." The crackle is present IN the rendered file, and the bounce is offline — not real-time. Predict what the evidence forces you to conclude.',
        code: '// repro: offline bounce -> crackle audible in the .wav\n// same session, real-time playback: sometimes clean\n// CPU during bounce: irrelevant? (offline renders wait for each block)',
        options: [
          { t: 'It cannot be a missed deadline — offline rendering has no real-time deadline. An artifact baked into the file was written by the signal path: scope the peaks for clipping or a discontinuity.', why: '' },
          { t: 'CPU overload dropped buffers during the bounce', why: 'An offline render is not racing a deadline — the host simply waits for each block. Heavy CPU makes the bounce slower, never gappier. The evidence eliminates this whole class.' },
          { t: 'A lock in the callback stalled the audio thread', why: 'Locks cause dropouts when a DEADLINE is missed — Zone 5\'s failure mode. Offline, the host waits politely at every block. A crackle in the file itself is in the samples, not the scheduling.' },
          { t: 'The listener\'s audio interface is faulty', why: 'The artifact survives in the rendered file — it exists before any playback hardware touches it. Follow the evidence: your plugin wrote those samples.' },
        ],
        answer: 0,
        explain: 'Root-cause by elimination, the Zone 6 way: the reproduction conditions rule out entire failure classes before you read a line of code. Offline rendering removes the real-time deadline, so Zone 5\'s dropout mechanisms are eliminated; an artifact persisted in the file means the DSP wrote it — so Zone 3\'s instruments (peak trace, scope, null test against a known-good render) localize it. Evidence first, code second: that is the difference between debugging and guessing.',
      },
      {
        type: 'mcq', concept: 'integration', qid: 'b7s3',
        prompt: 'Phase 2 — Integration Review. The cutoff zippers during host automation — but ONLY while the plugin window is open. Which mechanism explains a GUI-dependent audio artifact?',
        code: '// closed window: automation sweeps are smooth\n// open window:   the same sweep zippers\n// editor code:  cutoffSlider.onValueChange = [this] { processorRef.setCutoffNow((float) cutoffSlider.getValue()); };',
        options: [
          { t: 'Two write paths, one destination: automation flows through the parameter and its smoother, but the open editor\'s callback writes the raw value straight into the DSP. Route every writer through the parameter.', why: '' },
          { t: 'Repainting the window steals CPU and drops audio', why: 'Zipper is STEPPED VALUES, not missing buffers — and painting runs on the message thread, outside Zone 5\'s deadline. The artifact tracks the parameter path, not the load.' },
          { t: 'Guard the cutoff with a mutex so the writers take turns', why: 'Zone 5 closed this door: a lock reachable from the audio path trades zipper for dropouts. The defect is having two paths at all — fix the routing, not the contention.' },
          { t: 'Host automation is unreliable; document "close the window while automating"', why: 'The host is doing its job — writing the parameter. Your editor is the second, unsmoothed writer, and the GUI-open correlation is the fingerprint that proves it.' },
        ],
        answer: 0,
        explain: 'The GUI-open correlation is the whole diagnosis: opening the window activates a second writer. The attachment moves the slider with automation, the slider\'s callback shoves raw values past the smoother, and the two paths interleave — block-rate steps, audible zipper. The repair is Zone 4\'s contract carried through Zone 5\'s glide: ONE authority (the APVTS parameter), every writer routed through it, the smoother the only thing that touches the DSP. Architecture, automation and real-time reasoning — one artifact.',
      },
      {
        type: 'order', concept: 'evidence-debugging', qid: 'b7s4',
        prompt: 'Phase 2 — Integration Review. An intermittent glitch report just landed. Order the investigation the way a professional runs it — so the fix, when it comes, is aimed and provable.',
        lines: [
          'reproduceUnderControlledLoad();     // make it happen on demand — no repro, no mechanism',
          'captureEvidence();                  // profiler, scope, logs: name the mechanism, not the symptom',
          'applyMinimalAimedFix();             // change one thing, aimed at the named mechanism',
          'proveWithRegressionRender();        // golds + load test green — fixed, and it stays fixed',
        ],
        explain: 'Reproduce → measure → fix → prove. Skip the first step and you are patching a ghost; skip the second and the fix is a guess; skip the last and the bug is merely resting. The loop is zone-agnostic — the mechanism it names might be Zone 3 clipping, a Zone 2 lifetime, a Zone 4 contract breach or a Zone 5 lock — but the discipline is identical, and it is what Zone 6 turned into your reflex. This is how intermittent bugs die: on evidence, in order.',
      },
      {
        type: 'mcq', concept: 'release-decision', qid: 'b7s5',
        prompt: 'Phase 3 — Release Decision. Release day. Three findings remain open. Which one blocks the ship?',
        code: '// (a) crash when the host recalls a corrupted preset\n// (b) GUI meter repaints at 60 fps where 30 would do\n// (c) typo in the About box ("recieve")',
        options: [
          { t: '(a) only — a crash on hostile state bytes hits every session that recalls a bad preset. Validate-before-touch is the contract. The meter rate and the typo are triaged, ticketed, and shipped.', why: '' },
          { t: 'All three — a release must be flawless', why: 'A release is a risk decision, not a perfection contest. Blocking a green candidate on cosmetics ships nothing, ever. Triage — separating must-fix from noted — IS the engineering judgment being tested.' },
          { t: 'None — a corrupted preset is the file\'s fault, not ours', why: 'The host will recall whatever bytes exist on disk, and setStateInformation must reject junk without dying — parse, validate, then touch state. That contract belongs to the plugin. Crashing on input is always ours.' },
          { t: '(b) — performance findings always block release', why: 'A repaint rate is a message-thread cosmetic with zero audio-thread cost — Zone 5\'s separation is exactly why it cannot glitch the sound. Measure it, ticket it, ship.' },
        ],
        answer: 0,
        explain: 'Severity × likelihood × contract: the crash breaches Zone 4\'s defensive-load contract (validate before touching live state) on an input path the plugin does not control — a data-loss risk in the field, and the fix plus its regression test are a day\'s work. The meter rate and the typo are real findings with real tickets — and zero ship risk. Knowing WHICH open findings block is the judgment call that separates release engineering from list-checking.',
      },
      {
        type: 'mcq', concept: 'ship-signoff', qid: 'b7s6',
        prompt: 'Phase 3 — Release Decision. The crash is fixed and covered by a new regression test. Suites green, validation passed, known issues documented with owners. You hold the pen on First Signal 1.0. Which sign-off do you write?',
        code: '// the review dossier is on the table.\n// the team is waiting on your line.',
        options: [
          { t: '"Approved. Evidence attached: suites green, host validation passed, the preset-crash fix carries a regression test, known issues ticketed with owners. Ship 1.0."', why: '' },
          { t: '"Approved — it sounded great when I played it last night."', why: 'A senior reviewer never signs a personal impression. The approval must cite evidence a colleague could re-run tomorrow — that is what makes it an engineering document instead of an opinion.' },
          { t: '"Approved, but first rewrite the voice pool — I would have designed it differently."', why: 'Taste is not a finding. The pool passes its tests and holds its deadline; blocking a green candidate on style preference is how releases die. Review the evidence, respect the design.' },
          { t: '"Rejected — some day, somewhere, a bug might surface."', why: 'Every shipped product carries unknown unknowns; that is why the regression net and the triage process exist. Reviews reject on FINDINGS, never on fear — or nothing would ever reach a single listener.' },
        ],
        answer: 0,
        explain: 'The sign-off is the whole curriculum in one sentence: a claim backed by artifacts. Ownership clean since Zone 2. Signal integrity proven since Zone 3. Contracts held since Zone 4. The deadline safe since Zone 5. Evidence over opinion since Zone 6. You did not memorize this decision — you reasoned your way to it, which is the only way it counts. First Signal 1.0: approved. Campaign complete, engineer.',
      },
    ],
  },
];
