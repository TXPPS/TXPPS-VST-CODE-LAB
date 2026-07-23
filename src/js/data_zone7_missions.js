/* ============================================================
   ZONE 7 — the product line: missions p20–p30.
   Appended to ZONE7_CHALLENGES (declared in data_zone7_challenges.js).
   Guidance decreases as the line progresses; the capstone
   treats the learner as a junior professional.
   ============================================================ */

ZONE7_CHALLENGES.push(

  /* ------------------------------------------------ P20 · GAIN */
  {
    id: 'p20', kind: 'project', title: 'Product 1: TXPPS Gain', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Gain 1.0. A gain utility so polished it earns rack space: dB-calibrated knob, automation with no clicks or pops, true bypass, output meter, full preset/session recall. Nothing here is new — that\'s the point. This build proves your Zones 1–6 foundations ship.',
    steps: [
      {
        note: 'PLANNING — Map the architecture before a line is written. Every block is a zone you own.',
        q: {
          type: 'match', concept: 'product-eng',
          prompt: 'Match each component to its job in TXPPS Gain.',
          left: ['APVTS + AudioParameterFloat', 'SmoothedValue<float>', 'the cached atomic parameter pointer', 'get/setStateInformation'],
          right: ['the knob\'s brain: host automation + editor binding (Zone 3)', 'the glide that kills zipper (d13)', 'the race-free bridge into the callback (r3)', 'session recall, defensive and versioned (r9)'],
          explain: 'Four components, four zones, one product plan. The pros always start here — by naming which solved problem each requirement maps to.',
        },
      },
      {
        note: 'IMPLEMENTATION — The render core. Per-block work stays out of the sample loop (r11).',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Hoist the dB conversion — once per block, not per sample.',
          code: 'gainSmoothed.setTargetValue (\n    juce::Decibels::___ (gainParam->load()));\n// then per sample: out[i] = in[i] * gainSmoothed.getNextValue();',
          accept: ['decibelsToGain'],
          placeholder: 'function',
          hint: 'Ears speak dB; multiplication speaks linear (d4).',
          explain: 'decibelsToGain runs a pow — per block it\'s free, per sample it\'s a hotspot (rb3\'s cousin). The knob speaks dB, the math speaks linear, the smoother speaks glide.',
        },
      },
      {
        note: 'QA TICKET #1 — "Bypass SILENCES my track instead of passing audio through." Severity: release blocker.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap the line that turned bypass into mute.',
          code: [
            'void processBlock (juce::AudioBuffer<float>& buffer,',
            '                   juce::MidiBuffer&)',
            '{',
            '    if (bypassed) { buffer.clear(); return; }',
            '    applyGain (buffer);',
            '}',
          ],
          buggy: 3,
          explain: 'Bypass means "pretend I\'m not here" — the input must pass through UNTOUCHED. clear() replaces it with silence: the opposite promise. Correct bypass simply returns without touching the buffer (and pros crossfade the transition so engaging it doesn\'t click — d13\'s law even here).',
          fix: 'if (bypassed) return;   // the buffer already holds the input — leave it alone',
        },
      },
      {
        note: 'IMPLEMENTATION — The meter: audio measures, UI narrates (r10). No waiting, no racing.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Publish the block\'s peak for the UI\'s 30 Hz timer to read.',
          code: 'std::atomic<float> meterLevel { 0.0f };\n// audio thread, end of block:\nmeterLevel.___ (blockPeak);',
          accept: ['store'],
          placeholder: 'method',
          hint: 'The atomic write verb (r3).',
          explain: 'store() on the deadline, load() in a UI timer — the meter crosses the boundary with zero locks and zero races. The bridge you audited in p16, now shipping in a product.',
        },
      },
      {
        note: 'RELEASE — Final gate before 1.0. Choose the proof that protects your USERS\' existing work.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Which test specifically proves "sessions saved with the beta reopen identically in 1.0"?',
          options: [
            { t: 'The state round-trip suite: load every saved beta state file and verify all parameters match exactly (r9/r12)', why: '' },
            { t: 'pluginval at strictness 10', why: 'Validation proves the host CONTRACT — it never checks that YOUR old values still mean the same thing.' },
            { t: 'The CPU profile', why: 'Performance says nothing about recall — a fast plugin can still forget a producer\'s settings.' },
            { t: 'Listening to it', why: 'Ears check one session, once. The suite checks every saved era, every build, forever (r12).' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS GAIN 1.0 ▮ Features: dB gain, smoothing, true bypass, meter, full recall. Engineering: thread-safe, zipper-free, state-versioned. Tests: units + state suite GREEN. Validation: strictness 10 PASS. QA: bypass blocker fixed. STATUS: RELEASED. One product down — the line is open.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P21 · TREMOLO */
  {
    id: 'p21', kind: 'project', title: 'Product 2: TXPPS Tremolo', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Tremolo 1.0. The d14 machine, productized: rate (free or synced), depth, LFO waveform selector, and a stereo mode that turns tremolo into auto-pan. Ship it with the mono button in mind.',
    steps: [
      {
        note: 'IMPLEMENTATION — The core multiply. One line carries the whole effect.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Re-range the bipolar LFO so depth breathes gain between (1−depth) and 1.',
          code: 'float trem = 1.0f - depth * (___ + 0.5f * lfo);\nout[i] = in[i] * trem;',
          accept: ['0.5f', '0.5', '.5f', '.5'],
          placeholder: 'offset',
          hint: 'Half up, half of the swing — d14\'s unipolar recipe.',
          explain: '0.5 + 0.5·lfo maps −1..+1 into 0..1; scaled by depth and subtracted from 1, gain breathes without ever flipping polarity. The d14 tremolo, now with a product name on it.',
        },
      },
      {
        note: 'FEATURE — LFO waveform selector. Square LFO = trance gate. Design question first.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'The LFO waveform selector: smoothed or snapped?',
          options: [
            { t: 'Snapped — it\'s a discrete switch (d13); but the square LFO ITSELF gets slew-limited edges, or every gate transition clicks', why: '' },
            { t: 'Smoothed like any knob', why: 'Gliding between sine and square synthesizes an unchosen in-between LFO — selectors snap (d13, p10\'s exact ruling).' },
            { t: 'Neither matters for an LFO', why: 'A square LFO switching gain instantly IS a d13 step on the audio — the modulator\'s edges need manners even though the selector snaps.' },
            { t: 'Remove the square option', why: 'The trance gate is the feature request! Ship it with softened edges, not amputated.' },
          ],
          answer: 0,
          explain: 'Two rules at once: the SELECTOR snaps (discrete choice), the square LFO\'s EDGES glide a few ms (continuous gain can\'t step). Product design is choosing which rule applies where.',
        },
      },
      {
        note: 'FEATURE — Stereo mode: auto-pan. One LFO, two channels, one phase trick.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Give the right channel the opposite phase — as left ducks, right blooms.',
          code: 'float lfoL = (float) std::sin (lfoPhase);\nfloat lfoR = (float) std::sin (lfoPhase\n                    + juce::MathConstants<double>::___);',
          accept: ['pi'],
          placeholder: 'constant',
          hint: 'Half a cycle apart — opposite breathing.',
          explain: 'A π offset inverts the right channel\'s modulation: the sound leans left, then right — tremolo becomes auto-pan with one constant. (d12\'s stereo lesson: difference IS the image.)',
        },
      },
      {
        note: 'QA TICKET #2 — "In MONO, stereo mode\'s movement disappears completely." Investigate before you "fix."',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'Why does π-offset auto-pan vanish on a mono fold-down — and is it a bug?',
          code: 'mono = (inL * tremL + inR * tremR) ;  // tremR mirrors tremL',
          options: [
            { t: 'The two gains mirror each other, so their sum stays ~constant — the movement cancels (d12). Not a bug: document it, and the mono button explains itself', why: '' },
            { t: 'A race condition', why: 'Perfectly deterministic — it cancels EVERY time. The math is the "culprit," and the math is correct.' },
            { t: 'The LFO is broken in mono', why: 'The LFO runs fine — mono SUMS the channels, and mirrored gains sum to a near-constant (d12\'s fold-down lesson).' },
            { t: 'Ship a warning dialog', why: 'A manual note ("stereo movement folds to steady level in mono") beats interrupting every session — r15\'s honest-docs rule.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS TREMOLO 1.0 ▮ Features: rate/depth/waveform, tempo sync, auto-pan. Engineering: unipolar-safe, slew-limited gates. QA: mono behavior investigated → documented (not a bug). Tests GREEN, validation PASS. STATUS: RELEASED.',
          },
      },
    ],
  },

  /* ------------------------------------------------ P22 · DELAY */
  {
    id: 'p22', kind: 'project', title: 'Product 3: TXPPS Delay', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Delay 1.0. The f1 machine with knobs: time (20 ms – 2 s, syncable), feedback, wet/dry. Requirements: no allocation after prepare, no crash at any knob position, repeats that always decay.',
    steps: [
      {
        note: 'ARCHITECTURE — prepareToPlay builds the machine. Order the setup (r5, r7).',
        q: {
          type: 'order', concept: 'product-eng',
          prompt: 'Arrange the delay\'s prepare, top to bottom, as the contracts demand.',
          lines: [
            'lineLength = (int) (MAX_DELAY_SECONDS * sampleRate);',
            'line.setSize (1, lineLength);          // buy the worst case (r5)',
            'line.clear();                          // no stale echoes from the old world (r7)',
            'writePos = 0;                          // heads reset last, onto clean tape',
          ],
          explain: 'Size from the MAX (the knob never triggers a purchase), buy once, wipe the old world\'s audio, park the heads. Every line is a zone-6 clause with a product attached.',
        },
      },
      {
        note: 'QA TICKET #1 — Intermittent crash at short delay times. You read this trace in fb1; now harden the fix into the product.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Wrap the read head the explicit, sign-safe way.',
          code: 'int readPos = writePos - delaySamples;\nif (readPos < 0)\n    readPos += ___;',
          accept: ['lineLength'],
          placeholder: 'value',
          hint: 'The size of the circle.',
          explain: 'Subtract, test, add the line length — no % surprises (f1). The read head now wraps for every knob position a customer can reach.',
        },
      },
      {
        note: 'QA TICKET #2 — "Feedback at max: repeats never die." Predict before you patch.',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'feedback = 1.0 exactly. What do the repeats do?',
          code: 'data[writePos] = input + delayed * 1.0f;',
          options: [
            { t: 'Never decay — each echo re-records at full level: an infinite hold that stacks with every new note until it clips', why: '' },
            { t: 'Decay slowly', why: 'Decay needs feedback < 1.0 — at exactly 1.0 each pass reproduces the last at FULL level, forever.' },
            { t: 'Stop after one repeat', why: 'One repeat is feedback = 0 territory. 1.0 is the opposite wall: the tape loop that never fades.' },
            { t: 'Alias', why: 'No new harmonics are made by a copy — the failure is energy accounting (d10/d11), not spectrum.' },
          ],
          answer: 0,
          explain: 'At 1.0 the loop conserves everything and ADDS each new input on top — runaway by accumulation. The product clamps feedback below 1.0 (0.95 keeps dub tails without the meltdown).',
        },
      },
      {
        note: 'CODE REVIEW — A teammate\'s "optimization" is waiting for approval. Review it like it\'s your name on the release.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'This change re-sizes the line whenever the time knob moves. Tap the violation.',
          code: [
            'void setDelayTime (float seconds)',
            '{',
            '    delaySamples = (int) (seconds * sampleRate);',
            '    line.setSize (1, delaySamples);   // "save memory"',
            '}',
          ],
          buggy: 3,
          explain: 'setSize is a heap purchase — and setDelayTime runs from the knob while audio renders: allocation on (or racing with) the deadline, r5\'s forbidden verb hiding in a "memory saving." The line stays at MAX size from prepare; the knob only moves the read head. REVIEW: REJECTED.',
          fix: 'Delete the setSize — the knob moves delaySamples, never the buffer',
        },
      },
      {
        note: 'RELEASE — Sync lands (fc2\'s conversion), docs written, gates green. Final check on the sync path.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'The correct tempo-sync pipeline, host to read head?',
          options: [
            { t: 'BPM → 60/BPM seconds per beat → × note ratio → × sampleRate → glide the change (d13)', why: '' },
            { t: 'BPM → × sampleRate directly', why: 'BPM is a rate, not a duration — the 60/BPM inversion turns it into seconds first (fc2).' },
            { t: 'BPM → seconds → snap the delay time', why: 'Snapping the read head teleports through the tape: a click on every tempo nudge. Glide it (f1).' },
            { t: 'Hard-code common tempos', why: 'The host owns tempo, including automation of it — conversion is live math, not a lookup of your favorites.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS DELAY 1.0 ▮ Features: time/sync, feedback (clamped 0.95), wet/dry. Engineering: max-size line, sign-safe wrap, glided time. QA: crash + runaway fixed, review rejected an allocation. Tests GREEN, validation PASS. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P23 · CHORUS */
  {
    id: 'p23', kind: 'project', title: 'Product 4: TXPPS Chorus', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Chorus 1.0. A short delay (5–30 ms) whose time is swept by an LFO, blended with the dry: one voice becomes a slightly-imperfect ensemble. Stereo width via LFO phase offset. The delay line you shipped, taught to shimmer.',
    steps: [
      {
        note: 'PLANNING — Know the machine before building. What IS chorus, mechanically?',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Chorus, in one architecture sentence:',
          options: [
            { t: 'A short modulated delay (5–30 ms) mixed with the dry signal — the moving delay detunes the copy slightly, like a second imperfect performer (n14\'s physics)', why: '' },
            { t: 'Several full copies of the track', why: 'That\'s unison/doubling by brute force — chorus fakes the second performer with ONE delayed, wobbling copy.' },
            { t: 'A reverb with short decay', why: 'Reverb scatters thousands of echoes; chorus is ONE echo, so short it fuses, moving so it detunes.' },
            { t: 'A pitch shifter', why: 'Close! The moving delay DOES shift pitch slightly (f1\'s tape-speed law) — but only as a byproduct of the sweep.' },
          ],
          answer: 0,
          explain: 'Delay short enough to fuse + LFO motion (the detune) + dry blend (the "two performers") = chorus. Three shipped components, one new patch between them.',
        },
      },
      {
        note: 'IMPLEMENTATION — The modulated read. The LFO moves the read head around a center.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Sweep the delay time around its center — in samples, at THIS rate.',
          code: 'float delayMs      = 12.0f + 6.0f * (float) std::sin (lfoPhase);\nfloat delaySamples = delayMs * 0.001f * (float) ___;',
          accept: ['sampleRate', 'getSampleRate()', 'getSampleRate ()'],
          placeholder: 'factor',
          hint: 'ms → seconds → samples: the d2 conversion, never hard-coded (fb2!).',
          explain: 'The LFO breathes 6–18 ms around a 12 ms center, converted through the REAL rate — fb2\'s regression can never ship here. The moving fractional distance is why the next step exists.',
        },
      },
      {
        note: 'QA TICKET #1 — "Chorus sounds gritty/grainy, worse at faster rates." The read head is landing between slots.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap the truncation that grinds the sweep.',
          code: [
            'float pos     = writePos - delaySamples;   // fractional!',
            'if (pos < 0) pos += lineLength;',
            'float delayed = data[(int) pos];',
            'out[i] = in[i] * dry + delayed * wet;',
          ],
          buggy: 2,
          explain: 'A modulated delay is fractional almost every sample — truncating snaps the read to slot boundaries, and the sweep zippers into grit (f4\'s crunchy-sampler bug, chorus edition). Linear interpolation between data[i] and data[i+1] by the fraction: three operations, silk restored.',
          fix: 'int i = (int) pos; float fr = pos - i; delayed = data[i] + fr * (data[i+1 < lineLength ? i+1 : 0] - data[i]);',
        },
      },
      {
        note: 'FEATURE — Stereo width. Same machine, second read head, offset LFO.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Give the right channel\'s LFO a quarter-cycle head start.',
          code: 'float lfoR = (float) std::sin (lfoPhase\n            + juce::MathConstants<double>::___);',
          accept: ['halfPi'],
          placeholder: 'constant',
          hint: 'A quarter cycle — the channels sweep out of step, never mirrored.',
          explain: 'π/2 offset: the two sweeps are decorrelated (not opposite — π would mirror, and mirrored detune can hollow the mono sum). Width from level-and-time DIFFERENCES, d12-style, with the mono button in mind. ▮ PRODUCT SHIPPED — TXPPS CHORUS 1.0 ▮ Features: rate/depth/mix, stereo spread. Engineering: interpolated modulated reads, rate-safe conversions. Tests GREEN, validation PASS. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P24 · DISTORTION */
  {
    id: 'p24', kind: 'project', title: 'Product 5: TXPPS Distortion', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Distortion 1.0. The f2 curve with a front panel: drive, tone, output, mix. Requirement from the label: "the drive knob must sound like MORE, not just LOUDER." That sentence is an engineering spec.',
    steps: [
      {
        note: 'IMPLEMENTATION — The shaper stage, f2\'s recipe.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Push the signal INTO the curve\'s bend.',
          code: 'float shaped = std::tanh (in * ___);',
          accept: ['drive'],
          placeholder: 'factor',
          hint: 'The doorway into distortion (f2).',
          explain: 'Drive is gain into the curve: more drive, more of the signal lives in the bend, more harmonics. Without it, tanh of clean audio is a very expensive wire (f2\'s mistake panel).',
        },
      },
      {
        note: 'SPEC CHECK — "MORE, not just LOUDER." Verify your drive knob honors the label\'s sentence.',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'Drive doubles; output compensation stays fixed. What does the customer hear?',
          code: 'out = std::tanh (in * drive) * fixedComp;',
          options: [
            { t: 'More harmonics AND more loudness — and the loudness bribes their ears into "better." The spec fails: compensation must track drive', why: '' },
            { t: 'Only more harmonics', why: 'tanh\'s output grows toward ±1 as drive rises — level climbs too, and level is the ear\'s favorite lie (f2).' },
            { t: 'No audible change', why: 'Doubling drive audibly thickens the harmonic recipe — the question is whether loudness rides along uninvited. It does.' },
            { t: 'Less loudness', why: 'Backwards: harder driving pushes the output closer to full scale, not away from it.' },
          ],
          answer: 0,
          explain: 'The label\'s sentence is a gain-staging spec: comp ≈ inverse of drive\'s loudness effect, so the knob changes TONE at constant level. Level-matched honesty, productized.',
        },
      },
      {
        note: 'QA TICKET #1 — A teammate moved the compensation "for efficiency." The tone collapsed. Review it.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Same multiplies, wrong stage. Tap the line that changed the SOUND.',
          code: [
            'float driven = in * drive * outputComp;',
            'float shaped = std::tanh (driven);',
            'out[i] = shaped * wet + in[i] * (1.0f - wet);',
          ],
          buggy: 0,
          explain: 'Compensation INSIDE the drive path scales the signal BEFORE the curve — it un-drives the distortion instead of trimming its loudness. Multiplication commutes; STAGES don\'t (d15\'s law): comp belongs after the shaper, where it touches level without touching tone.',
          fix: 'float shaped = std::tanh (in * drive); out = shaped * outputComp * wet + …;',
        },
      },
      {
        note: 'RELEASE — QA\'s bright-source aliasing report is in (you diagnosed it in f2). Decide the 1.0 posture.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Aliasing fizz on bright sources at high drive. The 1.0 decision?',
          options: [
            { t: 'Ship 1.0 with the limitation DOCUMENTED and an oversampled HQ mode on the roadmap — an honest r15 choice, priced and stated', why: '' },
            { t: 'Silently ship it', why: 'Undocumented limitations become support tickets and distrust (r15) — the fizz WILL be found.' },
            { t: 'Block release until 4× oversampling is perfect', why: 'A defensible call — but the brief scoped 1.0 without it. Scope discipline plus honest docs beats a slipped launch, PROVIDED the docs are honest.' },
            { t: 'Filter all input above 5 kHz', why: 'Amputating the customer\'s material to hide your artifact — the cure that\'s worse than the fizz.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS DISTORTION 1.0 ▮ Features: drive/tone/output/mix, level-tracked compensation. Known limitation: naive shaping aliases on bright sources at high drive (documented; HQ mode roadmapped). Tests GREEN, validation PASS. STATUS: RELEASED — honestly.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P25 · FILTER */
  {
    id: 'p25', kind: 'project', title: 'Product 6: TXPPS Filter', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Filter 1.0. Low-pass and high-pass modes, resonance, and a cutoff sweep smooth enough to perform with. The f3 machine, stage-ready.',
    steps: [
      {
        note: 'IMPLEMENTATION — The one-pole core, f3\'s eight words.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'The follower steps toward the input. Complete the filter.',
          code: 'y = y + k * (___ - y);   // y: state, k: cutoff coefficient',
          accept: ['x', 'input', 'in'],
          placeholder: 'signal',
          hint: 'What is the follower chasing?',
          explain: 'y += k(x − y): the smoother aimed at audio (f3). k near 0 = sluggish = dark; k near 1 = eager = bright. Eight words, one product core.',
        },
      },
      {
        note: 'QA TICKET #1 — "The cutoff knob does NOTHING… until I bounce, then the bounce sounds different." Lifecycle smell (r7).',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap the line that renders with a fossilized coefficient.',
          code: [
            'void prepareToPlay (double sampleRate, int samplesPerBlock)',
            '{',
            '    k = coefficientFor (cutoffParam->load(), sampleRate);',
            '}',
            'void processBlock (…)',
            '{',
            '    for (int i = 0; i < buffer.getNumSamples(); ++i)',
            '        out[i] = onePole (in[i], k);',
            '}',
          ],
          buggy: 8,
          explain: 'The render uses k frozen at prepare time — the knob updates the parameter, but nothing re-derives k, so the cutoff is dead until the next prepare (the bounce!) resurrects it. (The prepare-time computation itself is CORRECT — an initial value belongs there.) Per block: read the atomic, smooth the cutoff, recompute k — r8\'s pull pattern.',
          fix: 'Per block: recompute k from cutoffSmoothed before the loop — pull, don\'t fossilize',
        },
      },
      {
        note: 'QA MATRIX — Four field reports on the beta. Diagnose all four from the symptoms alone.',
        q: {
          type: 'match', concept: 'product-eng',
          prompt: 'Match each beta report to its diagnosis.',
          left: ['"sweeps crackle like a dirty pot"', '"chords sound blurry and wrong" (synth version)', '"resonance at max SCREAMS forever"', '"filter pops when I flip LP → HP"'],
          right: ['unsmoothed cutoff — the most zipper-prone knob in audio (f3)', 'shared filter state across voices — n5\'s law violated', 'self-oscillation unclamped — bound the resonance range', 'mode switch needs a snap-with-fade, not a mid-render jump (d13/r9)'],
          explain: 'Every symptom names its lesson. A QA matrix is the curriculum wearing customer language — and you just read it fluently.',
        },
      },
      {
        note: 'RELEASE — Performance sign-off. The sweep is the product; prove it ships clean.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Which automated test best guards the filter\'s HEADLINE feature (the performable sweep)?',
          options: [
            { t: 'An automation stress render: sweep cutoff hard while rendering, scan the output for discontinuities (r8/r12) — clicks fail the build', why: '' },
            { t: 'A unit test on coefficientFor()', why: 'Worth having — but it proves the MATH, not the swept EXPERIENCE. The discontinuity scan proves the performance.' },
            { t: 'pluginval', why: 'Contract, not sound (fr1\'s lesson). The sweep needs a sonic gate.' },
            { t: 'Manual listening on release day', why: 'Ears once vs a machine every build — r12 already settled this argument.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS FILTER 1.0 ▮ Features: LP/HP, resonance (bounded), performable sweep. Engineering: per-block pull, smoothed cutoff, guarded by an automation-stress gate. Tests GREEN, validation PASS. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P26 · MONO SYNTH */
  {
    id: 'p26', kind: 'project', title: 'Product 7: TXPPS Mono', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Mono 1.0. A performance mono synth: one massive voice, last-note priority, legato/retrigger switch, portamento, filter + amp envelope. First Signal\'s bloodline, tuned for basslines. Guidance thins from here — you\'ve built all of this.',
    steps: [
      {
        note: 'ARCHITECTURE — Order the voice\'s signal chain. (You\'ve drawn this since d15.)',
        q: {
          type: 'order', concept: 'product-eng',
          prompt: 'Arrange the mono voice source-to-output, as the chain is taught: tone → filter → shape/level → clamp.',
          lines: [
            'oscSample (waveform, phase)      // the tone (d6/d7)',
            'voiceFilter.process (raw)        // sculpt brightness (f3)',
            '* adsr.getNextSample() * gainSmoothed.getNextValue()  // shape × level (d9/d13)',
            'jlimit (-1.0f, 1.0f, s)          // the seatbelt, LAST (d10)',
          ],
          explain: 'Tone → filter → shape × level → clamp. The multiplies commute with each other (d15), so they ride one line; the filter sits before them so the amp envelope stays in charge of the note\'s outline, and the clamp guards everything, last.',
        },
      },
      {
        note: 'FEATURE — The legato/retrigger switch, n4\'s personality knob.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Fresh attack only when retrigger demands it — or when nothing was sounding.',
          code: 'bool wasSilent = ! adsr.isActive();\nsetPitchTarget (note);\nif (retrigger || ___)\n    adsr.noteOn();',
          accept: ['wasSilent'],
          placeholder: 'condition',
          hint: 'Legato binds OVERLAPPED notes — a phrase\'s first note still needs its attack.',
          explain: 'Legato skips the attack only mid-phrase; a note from silence always strikes. One boolean carries the whole mono feel (n4).',
        },
      },
      {
        note: 'FEATURE — Portamento. You own every piece; recognize the assembly.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Portamento (glide between pitches) is, in components you\'ve shipped:',
          options: [
            { t: 'A d13 smoother aimed at PITCH: setTargetValue on note change, getNextValue feeding the increment each sample — glide time is the ramp length', why: '' },
            { t: 'A new oscillator type', why: 'Same oscillator — only its frequency input changes gradually instead of instantly.' },
            { t: 'Crossfading two voices', why: 'That\'s a different (polyphonic) trick — classic mono glide is ONE voice whose pitch travels.' },
            { t: 'A pitch-bend automation', why: 'Bend is the player\'s wheel (n11); portamento is the SYNTH gliding between played notes on its own.' },
          ],
          answer: 0,
          explain: 'd13\'s machinery, third deployment: knobs, cutoff, now pitch. Recognizing old tools in new requests is the senior-engineer reflex this zone trains.',
        },
      },
      {
        note: 'QA TICKET — "With glide on, my bassline CHOPS between overlapped notes instead of sliding." Diagnose from the symptom.',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'Overlapped notes chop instead of binding. Which switch is in the wrong position — and where\'s the fix?',
          code: '// glide time: 80 ms · retrigger: ??? · phrase: overlapped keys',
          options: [
            { t: 'Retrigger is ON — every overlap fires a fresh attack that chops the phrase. Legato mode (or an "auto" that binds overlaps) is the fix (n4)', why: '' },
            { t: 'The glide time is too short', why: '80 ms glides audibly — and a glide can\'t bind notes whose envelope RESTARTS. The attack is the chop.' },
            { t: 'The filter is too dark', why: 'Tone can\'t create rhythmic chopping — the symptom is temporal, and temporal points at the envelope.' },
            { t: 'The oscillator is broken', why: 'Pitch machinery makes wrong NOTES, not wrong PHRASING. Articulation lives in the retrigger switch.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS MONO 1.0 ▮ Features: last-note priority, legato/retrigger, portamento, filter + amp env. QA: articulation ticket closed by a switch, not a rewrite. Tests GREEN, validation PASS. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P27 · POLY SYNTH */
  {
    id: 'p27', kind: 'project', title: 'Product 8: TXPPS Poly', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Poly 1.0. TXPPS Mono, multiplied: 8 voices, allocation + stealing, per-voice filters, unison mode, full performance controls. The Zone 5 government, running a shipping product.',
    steps: [
      {
        note: 'PLANNING — Voice budget math. The spec says: 8 voices, optional 2× unison.',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'Unison ×2 enabled. The player holds a 5-note chord. What does allocation face?',
          code: '// 5 keys × 2 copies = 10 demanded, 8 exist',
          options: [
            { t: 'Ten voices demanded, eight exist — the n8 ladder steals twice (releasing first, then oldest), and the product spec must SAY so', why: '' },
            { t: 'All ten play', why: 'The pool is physics (n5): eight cards. Demand beyond it goes through the ladder, not around it.' },
            { t: 'Unison disables', why: 'Only if you design that policy — and the spec here chose stealing. Policies are decisions, not defaults.' },
            { t: 'The chord is refused', why: 'Refusing the player is the one policy nobody ships (n8) — the new notes always win.' },
          ],
          answer: 0,
          explain: 'Budget math is product design: 8 voices with 2× unison is a 4-key instrument before stealing begins. The spec documents it; the manual repeats it; support tickets never mention it.',
        },
      },
      {
        note: 'QA TICKET #1 — "Pitch bend works on NEW notes but held notes ignore the wheel." A Zone 5 contract, violated.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap where the bend got baked instead of applied live.',
          code: [
            'void claimVoice (Voice& v, int note, float vel)',
            '{',
            '    v.increment = baseIncrementFor (note) * bendRatio;',
            '    v.adsr.noteOn();',
            '}',
            '// render: v.phase += v.increment;',
          ],
          buggy: 2,
          explain: 'bendRatio is frozen INTO the stored increment at claim time — held notes keep the ratio from their birth, deaf to the wheel forever after. n11\'s law: the base stays pure, the bend multiplies at RENDER (v.increment * bendRatio), so every sounding voice follows the wheel live.',
          fix: 'v.increment = baseIncrementFor (note); // render: phase += v.increment * bendRatio',
        },
      },
      {
        note: 'PERFORMANCE — The clinic\'s question (p18), now at product scale.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Eight voices, two sounding. What makes the six idle voices nearly free?',
          options: [
            { t: 'The render loop gates on isActive(): idle cards cost one boolean test, zero math (n9/p18) — the pool\'s price is paid only by sound', why: '' },
            { t: 'Idle voices are deallocated', why: 'Never — the pool is permanent (n5/r5). Idle means CHEAP, not gone.' },
            { t: 'The compiler removes them', why: 'The compiler can\'t know a voice is silent — the isActive gate is YOUR design doing that job.' },
            { t: 'They aren\'t free — 8 voices always costs 8', why: 'Only in a build missing the gate — which is exactly the p18 clinic finding this question guards against.' },
          ],
          answer: 0,
          explain: 'One if per idle voice per sample: polyphony\'s cost scales with NOTES, not with the pool. That property is what lets the spec promise "8 voices" without promising "8 voices of CPU."',
        },
      },
      {
        note: 'RELEASE — The poly-specific gate. Choose the test that catches what mono testing never can.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Which scripted test is the POLY release\'s signature gate?',
          options: [
            { t: 'A fists-on-keyboard MIDI script: dense chords + pedal + bend + steal pressure, asserting no stuck notes, no silent claims, no clicks (n-zone laws, automated)', why: '' },
            { t: 'A single-note golden render', why: 'Keep it — but single notes can\'t catch allocation, stealing, or shared-state bugs. Poly bugs live in COMBINATIONS (n6\'s warning).' },
            { t: 'A CPU profile at idle', why: 'Idle proves the gate works; the poly disaster class is correctness under density, not idle cost.' },
            { t: 'Longer manual jamming', why: 'Jamming finds bugs once; the script finds them every build (r12). Automate the fists.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS POLY 1.0 ▮ Features: 8 voices, ladder stealing, per-voice filters, unison, full performance deck. QA: live-bend contract fixed. Gates: fists-script + golds + validation GREEN. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P28 · SAMPLER */
  {
    id: 'p28', kind: 'project', title: 'Product 9: TXPPS Sampler', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Sampler 1.0. Load a recording, play it across the keyboard: root-note pitching, loop points for sustained notes, per-voice playheads, d9 envelopes. f4\'s machine with a serial number.',
    steps: [
      {
        note: 'IMPLEMENTATION — The pitch map, f4\'s heart.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Semitone distance to playback ratio — the law every pitched machine obeys.',
          code: 'float ratio = std::pow (2.0f, (note - rootNote) / ___);',
          accept: ['12.0f', '12', '12.0', '12.f'],
          placeholder: 'divisor',
          hint: 'Semitones per octave — d3, n11, n14, f4: same constant every time.',
          explain: 'The fifth appearance of 2^(x/12) in this curriculum — synth pitch, bends, detune, and now sample playback. One law, every machine.',
        },
      },
      {
        note: 'QA TICKET #1 — "Sustained pads DIE after a few seconds instead of holding." The loop isn\'t looping.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap the exit that should be a wrap.',
          code: [
            'playhead += ratio;',
            'if (playhead >= loopEnd)',
            '    endVoice();',
            'float out = readInterpolated (playhead);',
          ],
          buggy: 2,
          explain: 'Crossing the loop end must WRAP to loop start (playhead = loopStart + overshoot — d5\'s keep-the-fraction, sampler edition), not end the voice. endVoice() there turns every sustained patch into a one-shot. Loops wrap; one-shots bound (f4) — this code confused the exits.',
          fix: 'playhead -= (loopEnd - loopStart);   // wrap, keep the fractional overshoot',
        },
      },
      {
        note: 'DESIGN REVIEW — A teammate asks: "the recording already has a natural decay — why force an envelope on it?"',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Why does every sampler voice still need a d9 envelope?',
          options: [
            { t: 'Note-off must FADE the voice — cutting a playhead mid-waveform is a d13 cliff (click) on every release; the envelope is also what makes loops feel like notes', why: '' },
            { t: 'It doesn\'t — recordings are pre-shaped', why: 'The recording\'s shape ends where the player\'s finger does — lift mid-sample and SOMETHING must fade the cut. That something is d9.' },
            { t: 'Envelopes fix aliasing', why: 'Different department (d8) — envelopes shape TIME, not spectrum.' },
            { t: 'Only for looped samples', why: 'One-shots released early need the same mercy — any note the player can end needs an envelope to end it kindly.' },
          ],
          answer: 0,
          explain: 'The envelope isn\'t decoration; it\'s the difference between an instrument and a soundboard. Every voice that can be released mid-sound needs a shaped goodbye.',
        },
      },
      {
        note: 'RELEASE — Architecture sign-off, the n5 split at product scale.',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'Two keys play the SAME recording at different pitches, overlapping. Works because…',
          code: '// one loaded buffer · two sounding voices',
          options: [
            { t: 'The buffer is shared read-only; each voice owns its playhead, ratio and envelope (f4/n5) — reads race nothing (r3)', why: '' },
            { t: 'The sample was copied per voice', why: 'No copies needed — read-only data is race-free (r3 cares about writes). RAM thanks the architecture.' },
            { t: 'The voices take turns', why: 'Turn-taking is chip-era history — both playheads read the same memory simultaneously, freely.' },
            { t: 'It shouldn\'t work', why: 'It\'s the n5 split doing exactly its job — the answer you could give cold is why this ships.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS SAMPLER 1.0 ▮ Features: root-note pitching, loops, per-voice playback, envelopes. Engineering: shared read-only buffer, bounded one-shots, wrapped loops. Tests GREEN, validation PASS. STATUS: RELEASED.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P29 · MOTION FX */
  {
    id: 'p29', kind: 'project', title: 'Product 10: TXPPS Motion FX', short: 'Product build',
    concepts: ['product-eng'],
    brief: 'PRODUCT BRIEF — TXPPS Motion FX 1.0. A modulation multi-effect: two LFOs and a mod matrix routed at delay time, filter cutoff and output gain — chorus, wobble, tremolo and combinations, one processor. Spec only; you know the components.',
    steps: [
      {
        note: 'SPEC §2 — The routing table IS the product. Verify you can read your own spec.',
        q: {
          type: 'match', concept: 'product-eng',
          prompt: 'Match each matrix row to the effect the customer hears.',
          left: ['LFO1 → delay time (small depth)', 'LFO1 → filter cutoff', 'LFO2 → output gain', 'LFO2 → LFO1 depth'],
          right: ['chorus/flanger territory — the moving read head detunes (f1/p23)', 'the wobble — acid\'s favorite wire (f3/n13)', 'tremolo — d14\'s original patch', 'motion that EVOLVES — a modulator modulating a modulator'],
          explain: 'Ten weeks ago this table was jargon. Now each row is a machine you\'ve shipped, and the last row — modulating modulation — is where sound design becomes signature.',
        },
      },
      {
        note: 'SPEC §4 — Matrix application. One loop, summed contributions (n13). No hints beyond the blank.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Apply every row aimed at this destination.',
          code: 'float modValueFor (Dest d)\n{\n    float total = 0.0f;\n    for (const auto& r : matrix)\n        if (r.dst == d)\n            total += sourceValue (r.src) * ___;\n    return total;\n}',
          accept: ['r.amount', 'amount'],
          placeholder: 'factor',
          hint: '',
          explain: 'source × amount, summed per destination — n13\'s control-signal bus, verbatim. The matrix pattern transfers to every product that ever needs motion.',
        },
      },
      {
        note: 'QA TICKET #1 — "At max depth the delay crackles and occasionally SCREAMS." Two ceilings are missing. Pick the engineering-complete fix.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'LFO-modulated delay time at extreme depth: what must the render clamp, and why?',
          options: [
            { t: 'Clamp the MODULATED time to [1 sample, maxDelay] — the sweep can otherwise push the read head past the line (crash territory) or through the write head (screaming feedback geometry)', why: '' },
            { t: 'Clamp only the LFO output', why: 'The LFO is fine at ±1 — it\'s the DERIVED time (center + depth×lfo) that escapes the line\'s physical range.' },
            { t: 'Shrink the depth knob\'s range', why: 'Amputating the feature to dodge the bounds check — the clamp costs two comparisons and keeps the drama usable.' },
            { t: 'Allocate a bigger line at max depth', why: 'r5, again, forever: no purchases mid-render. The line was sized for max at prepare; the CLAMP honors that budget.' },
          ],
          answer: 0,
          explain: 'Derived values need their own seatbelts: the knob is bounded, but knob × modulation is not. Clamping the COMPUTED time is the difference between dramatic and broken.',
        },
      },
      {
        note: 'RELEASE — Motion FX automates EVERYTHING. One gate proves it. (You know which.)',
        q: {
          type: 'predict', concept: 'product-eng',
          prompt: 'The release gate for a plugin whose whole identity is modulation + automation?',
          code: '// r8: the host is your most demanding performer',
          options: [
            { t: 'The automation stress bounce: every parameter swept hard, offline render, discontinuity scan — clicks or NaNs fail the build (r8/r12)', why: '' },
            { t: 'A long manual jam', why: 'Finds bugs once (r12) — the bounce finds them on every commit, at faster-than-real-time.' },
            { t: 'pluginval alone', why: 'Contract ≠ sound (fr1). A modulation product needs its MOTION proven clean, not just its lifecycle.' },
            { t: 'Golden render at default settings', why: 'Defaults barely move — this product\'s risk lives at the extremes the stress bounce visits on purpose.' },
          ],
          answer: 0,
          explain: '▮ PRODUCT SHIPPED — TXPPS MOTION FX 1.0 ▮ Features: 2 LFOs, mod matrix, delay/filter/gain destinations. Engineering: clamped derived values, interpolated reads. Gate: automation stress bounce GREEN. STATUS: RELEASED. The product line stands at ten.',
        },
      },
    ],
  },

  /* ------------------------------------------------ P30 · CAPSTONE */
  {
    id: 'p30', kind: 'project', title: 'CAPSTONE: TXPPS Signature', short: 'Commercial VST3',
    concepts: ['product-eng'],
    brief: 'SPECIFICATION — TXPPS SIGNATURE 2.0, commercial VST3. ENGINE: the 8-voice poly core + saturation stage + motion delay + master section. UI MOCKUP: three panels (VOICE / MOTION / MASTER), meter bridge, preset browser. ENGINEERING REQS: lock-free throughout, state that still loads in the next version, worst-case CPU ≤ 40% at 64/44.1k. QA REQS: pluginval strictness 10, golden renders, old-session suite, automation stress. You are the engineer of record. Hints are over.',
    steps: [
      {
        note: 'ARCHITECTURE — Order the build. (No guidance. You have shipped ten products.)',
        q: {
          type: 'order', concept: 'product-eng',
          prompt: 'Arrange the build plan as a professional would sequence it.',
          lines: [
            'engine skeleton: processor, prepare contract, pool of 8 voices',
            'parameters + state: APVTS, atomics, version stamp, defaults',
            'DSP chain: voices → saturation → motion delay → master',
            'editor: three panels binding through attachments',
            'gates: units, golds, old-session suite, validation, stress bounce',
          ],
          explain: 'Engine before knobs, knobs before panels, panels before proof — each layer tests the one beneath it. Ten products taught you this order; the capstone just asked you to say it out loud.',
        },
      },
      {
        note: 'QA BLOCKER #1 — "Master volume automation sounds STEPPED, and worse with more voices sounding." Subtle. Read carefully.',
        q: {
          type: 'bugspot', concept: 'product-eng',
          prompt: 'Tap the line that makes the smoother run at the wrong speed — voice-count-dependent.',
          code: [
            'for (int i = 0; i < buffer.getNumSamples(); ++i)',
            '{',
            '    float mix = 0.0f;',
            '    for (auto& v : voices)',
            '        if (v.adsr.isActive())',
            '            mix += renderVoice (v) * masterSmoothed.getNextValue();',
            '    out[i] = mix * 0.125f;',
            '}',
          ],
          buggy: 5,
          explain: 'getNextValue() advances the ramp — calling it INSIDE the voice loop steps the smoother once per ACTIVE VOICE per sample: the glide runs N× too fast, unevenly, and its speed changes with polyphony. One call per sample, hoisted above the voice loop, applied to the sum. A d13 machine misused by one line of placement.',
          fix: 'float g = masterSmoothed.getNextValue(); …loop… out[i] = mix * 0.125f * g;',
        },
      },
      {
        note: 'QA BLOCKER #2 — Migration. v1 saved filter cutoff as 0..1 normalized; 2.0 stores Hz. Old sessions must load IDENTICAL.',
        q: {
          type: 'fill', concept: 'product-eng',
          prompt: 'Gate the migration on the state\'s era.',
          code: 'int v = state.getProperty ("stateVersion", 1);\nif (v < ___)\n    migrateNormalizedCutoffToHz (state);   // 0..1 → Hz, once, on load',
          accept: ['2'],
          placeholder: 'version',
          hint: '',
          explain: 'Stamped state makes migration surgical: era 1 saves convert once, era 2 saves pass untouched. r9\'s machinery carrying a real change of meaning across a major version — the hardest state problem, handled in two lines.',
        },
      },
      {
        note: 'QA BLOCKER #3 — pluginval, strictness 10: "data race — setStateInformation during processBlock." The last thread lesson, unassisted.',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'State restore can land mid-render (r9). The engineering-complete response?',
          options: [
            { t: 'All audio-read state crosses safely: replaceState + parameter atomics for values; double-buffer + atomic flip for any bundled engine config (r3/r4/r9)', why: '' },
            { t: 'Lock processBlock during restores', why: 'A mutex on the deadline — r4\'s cardinal sin. The cure that\'s the disease.' },
            { t: 'Defer restores until playback stops', why: 'Hosts restore whenever they please (r13) — a plugin that argues with its host fails validation forever.' },
            { t: 'Copy state in the constructor', why: 'The constructor runs once; restores arrive for a lifetime. The safe channels exist precisely for this traffic.' },
          ],
          answer: 0,
          explain: 'The full boundary discipline in one ticket: atomics for values, the flip for bundles, replaceState for the tree. Signature\'s state now loads mid-chorus without a click or a race.',
        },
      },
      {
        note: 'RELEASE DECISION — Every gate is green: units, golds, old sessions, stress bounce, strictness 10, worst-case CPU 38%. The label wants one more feature "since we\'re shipping anyway."',
        q: {
          type: 'mcq', concept: 'product-eng',
          prompt: 'Your call, engineer of record.',
          options: [
            { t: 'Ship 2.0 as gated and green. The feature enters the NEXT cycle at the top of the checklist — late additions restart the list, and the list has no fast lane (r15)', why: '' },
            { t: 'Add it — it\'s small', why: '"Small" is a guess and the gates haven\'t seen it (r15/p19). The last-minute addition is a documented genre of shipped disaster.' },
            { t: 'Delay the release a month', why: 'For an UNREQUESTED-by-users feature? Scope discipline: green gates ship; roadmaps absorb ambition.' },
            { t: 'Ship it untested but flagged "beta"', why: 'A beta flag on an untested path in a 2.0 is a support queue with a bow on it.' },
          ],
          answer: 0,
          explain: '▮▮▮ PRODUCT LINE COMPLETE ▮▮▮ TXPPS Signature 2.0: GATED, GREEN, SHIPPED. Eleven products — Gain, Tremolo, Delay, Chorus, Distortion, Filter, Mono, Poly, Sampler, Motion FX, Signature — every one built on the same laws, every one released with its gates green. One session remains: QA\'s final pass on the Release Candidate. Clear it, and you graduate.',
        },
      },
    ],
  }
);
