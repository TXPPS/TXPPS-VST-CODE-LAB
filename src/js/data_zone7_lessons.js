/* ============================================================
   ZONE 7 — FINAL PRODUCT MISSIONS: lessons f1–f4.
   Only the DSP the product line genuinely needs and no zone
   taught: delay lines, waveshaping, filters, sample playback.
   ============================================================ */

const ZONE7_LESSONS = [

  /* ------------------------------------------------------ F1 */
  {
    id: 'f1', kind: 'lesson', title: 'The Delay Line', short: 'Circular buffers & echoes',
    concepts: ['delay-dsp'], time: '~7 MIN', diff: 2,
    hook: 'Slapback on a vocal, dub echoes chasing a snare, the eighth-note delay that IS half of your favorite guitar sound. Every one is the same machine: audio written into memory, read back later, maybe fed into itself. You already own every part of it — a buffer, two bookmarks, a wrap, and a plus sign.',
    objective: 'Build the delay line: a circular buffer with a write head and a read head, feedback, wet/dry — and know why fractional delays need interpolation.',
    sections: [
      {
        h: 'A tape loop made of memory',
        body: 'A **delay line** is a pre-allocated buffer treated as a circle: a **write head** records the incoming sample and advances; a **read head** trails it by exactly the delay time, in samples (seconds × rate — d2\'s conversion). Both heads wrap at the end like d5\'s phase. Old tape echoes were literally this — a loop of tape, a record head, a playback head further along. Yours is silicon, but the geometry is identical.',
        viz: { t: 'delayviz' },
      },
      {
        h: 'One sample through the machine',
        body: 'Per sample, four moves in strict order: read the delayed sample, write input PLUS feedback into the line, mix the output, advance and wrap. **Feedback** routes the delayed signal back into the line — each pass through is one more echo, quieter by the feedback factor. Keep it below 1.0 or every repeat gets LOUDER: the runaway delay, a d10 disaster on a timer.',
        code: '// prepareToPlay: buy the line once (r5)\nlineLength = (int) (maxDelaySeconds * sampleRate);\nline.setSize (1, lineLength);\n\n// per sample:\nint readPos = writePos - delaySamples;\nif (readPos < 0) readPos += lineLength;            // wrap backwards\nfloat delayed = data[readPos];\ndata[writePos] = input + delayed * feedback;       // the echo feeds itself\nfloat out = input * dry + delayed * wet;           // d11: mixing is addition\nif (++writePos >= lineLength) writePos = 0;        // wrap forwards',
        codeTitle: 'the whole echo machine',
        breakdown: [
          ['writePos - delaySamples', 'the read head trails the write head by the delay — subtraction, then wrap'],
          ['+= lineLength on negative', 'indices wrap like d5\'s phase — but integer math needs the manual add'],
          ['input + delayed * feedback', 'the regeneration loop: each echo is the last one, scaled'],
          ['dry/wet mix', '**wet/dry** = two gains on two signals, summed — d11 wearing an effects costume'],
          ['advance + wrap', 'the write head circles forever; the buffer never grows (r5)'],
        ],
        mistake: { code: 'int readPos = (writePos - delaySamples) % lineLength;   // ✗', text: 'C++\'s % keeps the DIVIDEND\'s sign: a negative left side yields a NEGATIVE result — an out-of-bounds read the moment the read head wraps (Zone 1\'s buffer law, back with interest). Wrap explicitly: subtract, then add lineLength if negative.' },
      },
      {
        h: 'Fractional delays & tempo sync',
        body: 'Two production realities. First: a delay of 302.7 samples lands BETWEEN two memory slots — reading the nearest one detunes modulated delays audibly. **Interpolation** (start with linear: blend the two neighbors by the fraction) reads between slots; it\'s what chorus (p23) will lean on. Second: musicians think in note values, not milliseconds — **tempo sync** converts through the host\'s BPM: one beat = 60 ÷ BPM seconds, then × rate for samples. And when the delay TIME changes while running, glide it (d13): jumping the read head teleports through the tape — a click; sliding it is the tape-speed pitch swoop dub loves.',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'delay-dsp',
        prompt: 'A 500 ms delay at 48 kHz. How many samples does the read head trail the write head?',
        code: 'delaySamples = (int)(0.5 * sampleRate);',
        options: [
          { t: '24,000 — seconds × rate (d2\'s conversion)', why: '' },
          { t: '500', why: 'Milliseconds aren\'t samples — the grid runs 48,000 per second: 0.5 × 48000.' },
          { t: '48,000', why: 'That\'s a full second of trailing. Half of it: 24,000.' },
          { t: 'Depends on the buffer size', why: 'Block size affects delivery, never musical time — the delay is rate math alone.' },
        ],
        answer: 0,
        explain: '0.5 × 48000 = 24,000 samples of memory between the heads. Every time knob in every delay you own is this one conversion.',
      },
      {
        type: 'mcq', concept: 'delay-dsp',
        prompt: 'What does the feedback control actually route?',
        options: [
          { t: 'The delayed output back into the line\'s input — each echo re-records, scaled by the feedback amount', why: '' },
          { t: 'The dry signal into the wet', why: 'That\'s the wet/dry MIX. Feedback is the echo eating its own tail — regeneration.' },
          { t: 'The output back to the host', why: 'Everything goes to the host eventually — feedback is an INTERNAL loop inside the line.' },
          { t: 'MIDI back to the keyboard', why: 'No MIDI here — feedback is pure audio routing, the dub engineer\'s favorite wire.' },
        ],
        answer: 0,
        explain: 'write = input + delayed × feedback: each pass is one more repeat, quieter by the factor. At 1.0+ the repeats GROW — the runaway delay.',
      },
      {
        type: 'bugspot', concept: 'delay-dsp',
        prompt: 'Customer bug: “random crashes — worse at longer delay times.” Tap the sign trap.',
        code: [
          'int readPos = (writePos - delaySamples) % lineLength;',
          'float delayed = data[readPos];',
          'data[writePos] = input + delayed * feedback;',
        ],
        buggy: 0,
        explain: 'When writePos < delaySamples the subtraction goes negative — and C++\'s % keeps that sign, producing a NEGATIVE index straight into data[]. Out-of-bounds read: sometimes garbage, sometimes a crash. Wrap explicitly: subtract, then if (readPos < 0) readPos += lineLength.',
        fix: 'int readPos = writePos - delaySamples; if (readPos < 0) readPos += lineLength;',
      },
    ],
    recap: [
      'Delay line = circular buffer + write head + read head trailing by seconds × rate.',
      'Read → write (input + delayed × feedback) → mix wet/dry → advance & wrap.',
      'C++ % keeps the dividend\'s sign — wrap indices explicitly.',
      'Fractional delays interpolate; tempo sync = 60/BPM seconds; glide time changes.',
    ],
    inside: [
      { name: 'TXPPS Delay', use: 'p22 ships this exact machine with knobs on it' },
      { name: 'Every echo since the 50s', use: 'tape loop, bucket brigade, or RAM — same two heads, same circle' },
    ],
    analogyPanel: 'A tape echo is the honest picture: one loop of tape passing a record head and a playback head. The gap between heads is the delay time, the loop splice is the wrap, and turning up the playback-into-record knob is feedback — the whole plugin is that machine, minus the flutter.',
    beginnerMistake: 'Allocating the line from the CURRENT delay time instead of the maximum. The knob then can\'t go higher without a resize — an r5 allocation mid-render. Buy maxDelaySeconds once in prepare; the knob just moves the read head.',
    remember: 'Two heads on a circle: write now, read then, feed a little back. Echoes are geometry.',
    builds: ['audio-buffer', 'interpolation', 'phase'],
    leads: ['delay-line', 'feedback'],
  },

  /* ------------------------------------------------------ F2 */
  {
    id: 'f2', kind: 'lesson', title: 'Waveshaping: Drawing Distortion', short: 'Transfer curves & drive',
    concepts: ['shaping-dsp'], time: '~6 MIN', diff: 2,
    hook: 'Every distortion you\'ve ever loved — tube warmth, fuzz, saturation on a drum bus — is one idea: a rule that answers “when THIS level comes in, THAT level goes out.” Draw the rule as a curve and you\'ve designed the pedal. Straight line: clean. Bent: warm. Cornered: fuzz.',
    objective: 'Understand transfer curves, why soft clipping sounds warmer than hard, what drive and output compensation really do, and why distortion demands the aliasing conversation.',
    sections: [
      {
        h: 'The transfer curve',
        body: '**Waveshaping** applies a fixed function to every sample: out = shape(in). Draw it with input on one axis, output on the other. A straight diagonal is a wire (out = in). d10\'s hard clip is a diagonal with the ends snapped flat — corners, harsh harmonics. The classic **soft clip**, tanh, bends gently toward the ceiling instead: the same loudness ambition, rounder corners, warmer harmonic recipe (d7\'s law, applied on purpose).',
        viz: { t: 'shaperviz' },
      },
      {
        h: 'Drive in, compensation out',
        body: '**Drive** is just gain INTO the curve: multiply the input up and more of the signal lives in the bent region — more harmonics, more “amount of pedal.” But drive also makes everything LOUDER, and louder always sounds “better” — so honest distortions pair it with **output compensation**: as drive rises, trim the output down so the loudness stays comparable and the ear judges the TONE, not the volume. A **tone** control after the shaper (a d13-style darkening filter) tames the new highs.',
        code: 'float driven = in * drive;                    // push INTO the bend\nfloat shaped = std::tanh (driven);            // the curve\nfloat out    = shaped * outputComp * wet\n             + in * (1.0f - wet);             // d11: blend with the dry',
        codeTitle: 'the whole pedal',
        breakdown: [
          ['in * drive', 'drive moves the signal deeper into the curve\'s bend — the “more” knob'],
          ['std::tanh', 'the soft-clip curve: approaches ±1 asymptotically, never corners'],
          ['outputComp', 'roughly 1/shape-of-drive — loudness held steady so tone can be judged honestly'],
          ['wet blend', 'parallel distortion (drum-bus saturation) is the same pedal with the dry mixed back'],
        ],
        mistake: { code: 'float shaped = std::tanh (in);   // ✗ no drive stage\n// "the distortion knob barely does anything"', text: 'tanh of a signal already inside ±1 barely bends — the curve\'s interesting region starts past where clean audio lives. Without a drive stage pushing INTO the bend, the pedal is a very expensive wire. Drive isn\'t decoration; it\'s the doorway.' },
      },
      {
        h: 'The aliasing bill',
        body: 'Distortion is a harmonics FACTORY — that\'s its whole job — and new harmonics march straight toward Nyquist (d8). Push hard and the fold-back fizz arrives, especially on bright sources. That\'s why serious distortions ship **oversampling** (d8\'s “raise the ceiling” cure, r11\'s CPU bill): shape at 2–4× the rate, filter, come back down. First Signal\'s honest-naive rule applies to products too: ship the simple version WITH the caveat documented (r15), or pay the oversampling bill knowingly.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'shaping-dsp',
        prompt: 'On a transfer curve, what does a perfectly straight diagonal line mean?',
        options: [
          { t: 'A wire — out equals in, no distortion at all', why: '' },
          { t: 'Maximum distortion', why: 'Distortion IS the departure from the straight line — bends and corners. Straight = untouched.' },
          { t: 'Silence', why: 'Silence would be a flat horizontal line at zero — everything maps to nothing.' },
          { t: 'A volume boost', why: 'A STEEPER straight line boosts; the 45° diagonal is exactly unity — in equals out.' },
        ],
        answer: 0,
        explain: 'The curve IS the effect: straight is clean, bent is warm, cornered is fuzz. Reading transfer curves is reading distortion pedals.',
      },
      {
        type: 'mcq', concept: 'shaping-dsp',
        prompt: 'Why do honest distortion designs turn the OUTPUT down as drive goes up?',
        options: [
          { t: 'Louder always sounds “better” — compensation holds loudness steady so the ear judges the tone, not the volume', why: '' },
          { t: 'To prevent all clipping', why: 'The shaper itself bounds the signal (tanh never exceeds ±1) — compensation is about honest listening, not safety.' },
          { t: 'To save CPU', why: 'A multiply costs the same at any value — this is psychoacoustics, not performance.' },
          { t: 'MIDI requires it', why: 'No MIDI in a pedal — this is the oldest trick in A/B listening: level-match or the louder one wins.' },
        ],
        answer: 0,
        explain: 'Level-matched comparison is the engineering ethic behind every good drive knob — and behind every honest plugin demo you\'ve ever trusted.',
      },
      {
        type: 'predict', concept: 'shaping-dsp',
        prompt: 'A producer cranks your distortion on a bright synth lead and reports “metallic fizz that moves the WRONG way as I play higher.” Diagnosis?',
        code: '// heavy waveshaping on a harmonically rich, high-pitched source',
        options: [
          { t: 'Aliasing — the shaper\'s new harmonics crossed Nyquist and folded back (d8); oversampling is the cure, documentation the honest interim', why: '' },
          { t: 'The tanh is broken', why: 'tanh is doing its job — making harmonics. The GRID ran out of room for them (d2\'s ceiling).' },
          { t: 'Bad MIDI timing', why: 'The fingerprint (inharmonic, wrong-way movement) is spectral, not temporal — d8\'s signature exactly.' },
          { t: 'The drive knob is mis-scaled', why: 'Scaling changes AMOUNT; it can\'t make partials move the wrong direction — only fold-back does that.' },
        ],
        answer: 0,
        explain: 'Distortion manufactures harmonics; Nyquist folds the overflow. The wrong-way fizz is d8\'s fingerprint, met in the wild — and why pro distortions ship an HQ switch.',
      },
    ],
    recap: [
      'Waveshaping: out = shape(in). Straight = clean, bent = warm, cornered = fuzz.',
      'Drive pushes INTO the bend; output compensation holds loudness honest.',
      'tanh = the classic soft clip: rounded corners, warmer recipe than hard clipping.',
      'Distortion breeds harmonics → aliasing risk → oversample or document.',
    ],
    inside: [
      { name: 'TXPPS Distortion', use: 'p24 ships this curve with drive, tone and honest compensation' },
      { name: 'Every saturation plugin', use: 'a drawn transfer curve, drive in, makeup out — the whole genre' },
    ],
    analogyPanel: 'A transfer curve is a mixing console\'s input transformer drawn as a graph: feed it gently and it\'s a wire; push it and the iron “rounds off” the peaks — which is why engineers drive tape and desks on purpose. Waveshaping is that behavior, designable in one line.',
    beginnerMistake: 'Judging distortion settings without level-matching. Drive up = louder = “better” every single time — your ears are honest, but loudness bribes them. Compensate first, then decide.',
    remember: 'The curve is the pedal: drive pushes in, compensation levels out, and every new harmonic pays the Nyquist toll.',
    builds: ['clipping', 'harmonics', 'oversampling'],
    leads: ['waveshaping', 'drive'],
  },

  /* ------------------------------------------------------ F3 */
  {
    id: 'f3', kind: 'lesson', title: 'The Filter: Sculpting Brightness', short: 'One-pole to resonance',
    concepts: ['filter-dsp'], time: '~7 MIN', diff: 3,
    hook: 'The most-turned knob in electronic music is a filter cutoff. You\'ve swept a thousand of them. Here\'s the twist that makes filters feel like an old friend instead of new math: you already built one. d13\'s parameter smoother — the thing that glides knob values — IS a low-pass filter. Aim it at audio instead of knobs, and brightness obeys you.',
    objective: 'Understand filters as frequency-dependent gain, build the one-pole low-pass, meet resonance — and know which parts to take from the library.',
    sections: [
      {
        h: 'A filter is gain that discriminates',
        body: 'Every gain you\'ve built treated all frequencies equally. A **filter** is gain that plays favorites: a **low-pass** lets lows through and turns highs down past the **cutoff**; a **high-pass** does the reverse. The producer intuition is exact: filters are EQ\'s building blocks, and subtractive synthesis (d7\'s rich shapes, then carving) is a saw into a low-pass.',
        viz: { t: 'filtercurve' },
      },
      {
        h: 'The one-pole: a smoother aimed at audio',
        body: 'The simplest low-pass is one line: the output takes a step toward the input each sample. Sound familiar? It\'s d13\'s smoother, verbatim. A sluggish follower can\'t track fast wobbles (highs die) but follows slow ones fine (lows pass) — smoothing IS low-pass filtering; the only question is what you aim it at. The coefficient k sets the cutoff: bigger k = faster following = brighter.',
        code: '// the one-pole low-pass — d13\'s smoother, aimed at audio:\ny = y + k * (x - y);      // y: output state, x: input sample\n// k from cutoff (the exact map lives in the library):\n// higher cutoff → bigger k → faster following → brighter',
        codeTitle: 'the eight-word filter',
        breakdown: [
          ['y + k * (x − y)', 'step toward the input: a follower with adjustable laziness'],
          ['y persists', 'filter STATE — memory across samples, per channel, per voice (n5\'s law!)'],
          ['k ↔ cutoff', 'the coefficient IS the knob; the precise formula ships in the library'],
          ['smooth the cutoff', 'a stepped cutoff zippers worse than gain — d13 applies to the filter\'s own knob'],
        ],
        mistake: { code: '// one filter object, shared by all 8 voices:\nfloat y = lowpass.process (voiceSample);   // ✗ shared state', text: 'Filter state is per-signal memory: eight voices through ONE filter object means eight interleaved histories corrupting each other — a blurry, wrong wobble. Like phase and envelopes (n5), every voice owns its own filter state. Shared DSP state is the poly bug that keeps on giving.' },
      },
      {
        h: 'Resonance, tracking, and the library',
        body: '**Resonance** feeds a little filter output back near the cutoff — a peak that makes sweeps sing and squelch (the acid sound is a resonant filter doing push-ups). Proper resonant filters (the state-variable filter family) need more careful math than one line — this is where professionals reach for the shipped, tested tool: `juce::dsp::StateVariableTPTFilter` gives you low/high/band-pass with stable resonance. Your architecture skills stay the same: smooth the cutoff (d13), track the keyboard (n13), state per voice (n5). The library does the algebra; YOU do the engineering.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'filter-dsp',
        prompt: 'What is a low-pass filter, in one sentence?',
        options: [
          { t: 'Gain that discriminates by frequency: lows pass, highs are turned down past the cutoff', why: '' },
          { t: 'A volume control for quiet sounds', why: 'Level and frequency are different axes — a low-pass cares about pitch content, not loudness.' },
          { t: 'A noise gate', why: 'Gates open and close on LEVEL over time (Zone 1\'s gate) — filters shape the spectrum continuously.' },
          { t: 'A reverb remover', why: 'Filters can darken reverb, but they discriminate by frequency, not by wet/dry.' },
        ],
        answer: 0,
        explain: 'Frequency-dependent gain — the phrase that turns every EQ curve and synth filter into something you can read.',
      },
      {
        type: 'mcq', concept: 'filter-dsp',
        prompt: 'Why is d13\'s parameter smoother secretly a low-pass filter?',
        options: [
          { t: 'A sluggish follower can\'t track fast wobbles (highs die) but follows slow ones (lows pass) — smoothing IS low-pass filtering, aimed at knobs', why: '' },
          { t: 'It isn\'t — they just look similar', why: 'Same equation, same behavior: y += k(x−y) low-passes whatever you feed it. Knob values or audio — the math can\'t tell.' },
          { t: 'Both use buffers', why: 'The one-pole needs no buffer — one float of state. The kinship is the EQUATION, not the memory.' },
          { t: 'JUCE implements them together', why: 'The insight is mathematical, not organizational: a smoother is a filter whose input happens to be a parameter.' },
        ],
        answer: 0,
        explain: 'The deepest connection in the curriculum: you built your first filter in Zone 3 without knowing it. Everything is gain; some gain has memory.',
      },
      {
        type: 'bugspot', concept: 'filter-dsp',
        prompt: 'The poly synth\'s new filter makes chords sound blurry and wrong. Tap the shared-state bug (n5\'s law).',
        code: [
          'juce::dsp::StateVariableTPTFilter<float> filter;   // ONE, on the synth',
          'float renderVoice (Voice& v)',
          '{',
          '    float raw = oscSample (v);',
          '    return filter.processSample (0, raw);',
          '}',
        ],
        buggy: 0,
        explain: 'One filter object serves every voice — eight interleaved signal histories corrupting one state. Filter state is per-signal memory: it belongs INSIDE the Voice (n5), one filter per card, like phase and envelope before it.',
        fix: 'Move the filter into the Voice struct — each voice owns its own state',
      },
    ],
    recap: [
      'Filter = frequency-dependent gain; low-pass darkens, high-pass thins.',
      'The one-pole (y += k(x−y)) is d13\'s smoother aimed at audio — k is the cutoff.',
      'Filter state is per-voice, per-channel memory — n5\'s law extends to DSP state.',
      'Resonance = the singing peak; use the library\'s SVF for the careful math.',
    ],
    inside: [
      { name: 'TXPPS Filter', use: 'p25 ships cutoff, resonance and a smoothed sweep' },
      { name: 'Acid, and all its children', use: 'a resonant low-pass swept with feeling — the most famous filter sound on Earth' },
    ],
    analogyPanel: 'A filter is a tone control with ambition. The one-pole is the treble knob on a guitar amp; resonance is cupping your hands around the mic of that treble — a peak that makes the sweep TALK. Every synth filter is those two ideas with better math.',
    beginnerMistake: 'Sweeping an unsmoothed cutoff and shipping the zipper. The filter\'s own knob is the most zipper-prone parameter in audio (d13\'s warning, squared) — cutoff gets a smoother before it gets a UI.',
    remember: 'Everything is gain; filters are gain with taste; and you built your first one in Zone 3 by accident.',
    builds: ['filter', 'cutoff', 'resonance'],
    leads: ['parameter-smoothing', 'keyboard-tracking'],
  },

  /* ------------------------------------------------------ F4 */
  {
    id: 'f4', kind: 'lesson', title: 'Sample Playback', short: 'Playheads, pitch & loops',
    concepts: ['sampler-dsp'], time: '~6 MIN', diff: 2,
    hook: 'Load a vocal chop, play it up a fourth, watch it get faster AND higher — the chipmunk effect every producer discovers in week one. That coupling of pitch and speed isn\'t a bug; it\'s the physics of a playhead. A sampler is an oscillator whose waveform is a recording — and you\'ve already built the oscillator.',
    objective: 'Understand sample playback as a playhead over a recorded buffer: pitch as playback ratio, interpolation between slots, looping, and per-voice playheads.',
    sections: [
      {
        h: 'A playhead over a recording',
        body: 'A sampler holds a **recorded buffer** and a **playhead** that walks it. Advance by exactly 1.0 per output sample and the recording plays at its original pitch. Advance by a **ratio** other than 1.0 and pitch changes: 2.0 = an octave up (the recording races by — twice as fast AND twice as high). It\'s d5\'s phase accumulator with a recording instead of sin(): position, increment, and — for loops — a wrap.',
        code: 'float ratio = std::pow (2.0f, (note - rootNote) / 12.0f);  // d3\'s law\nplayhead += ratio;                                          // d5\'s advance\nint   i    = (int) playhead;\nif (i + 1 >= sampleLength)          // interpolation reads i+1 —\n    { endVoice(); return 0.0f; }    // one-shots bound ONE SLOT EARLY\nfloat frac = playhead - i;\nfloat out  = sample[i] + frac * (sample[i + 1] - sample[i]); // f1\'s interpolation',
        codeTitle: 'the sampler\'s heart',
        breakdown: [
          ['rootNote', 'the key at which the recording plays untouched — press it, ratio = 1.0'],
          ['2^(semis/12)', 'the same pitch law as d3: samplers, synths and bends all obey it'],
          ['playhead += ratio', 'a fractional position — pitch IS the step size, exactly like phase'],
          ['linear interpolation', 'fractional positions read BETWEEN slots — f1\'s blend, mandatory here'],
          ['bound one slot early', 'the blend touches i+1, so the one-shot check stops at length−1 (pros also keep a guard sample)'],
        ],
        mistake: { code: 'float out = sample[(int) playhead];   // ✗ truncate and hope', text: 'Truncating the playhead snaps every read to the slot boundary — gritty aliasing-like distortion on any ratio that isn\'t exactly 1.0. Fractional playback without interpolation is the classic “why does my sampler sound crunchy” ticket. Blend the neighbors; it\'s three operations.' },
      },
      {
        h: 'Loops, envelopes, and the end of the tape',
        body: 'A one-shot ends when the playhead passes the last slot — and code MUST check (reading past the buffer is Zone 1\'s cardinal sin). Sustained instruments **loop**: when the playhead crosses the loop end, wrap it back to loop start (d5\'s wrap with different landmarks) and the note holds as long as the key does — with d9\'s envelope shaping it, exactly as if the oscillator were still a sine. Clean loop POINTS are sound-design craft (matched levels at both ends, or a crossfade); the engineering is just the wrap.',
      },
      {
        h: 'Polyphony: playheads are per-voice',
        body: 'Eight keys means eight playheads at eight positions, possibly eight ratios — n5\'s law, third appearance: per-note state lives in the Voice. The recorded buffer itself is SHARED (read-only data races nothing — r3\'s rules care about writes); the playhead, ratio and envelope are each voice\'s own. A sampler is First Signal\'s architecture with the oscillator swapped for a reader.',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'sampler-dsp',
        prompt: 'A vocal chop\'s root note is C4 (note 60). The player presses C5 — an octave up. What happens?',
        code: 'ratio = pow (2, (72 - 60) / 12.0) = 2.0',
        options: [
          { t: 'An octave higher AND twice as fast — the playhead races through the recording at double speed', why: '' },
          { t: 'Higher at the same speed', why: 'Speed and pitch are COUPLED in playhead samplers — decoupling them is time-stretching, a much fancier machine.' },
          { t: 'The same pitch, twice as long', why: 'Backwards twice: ratio 2.0 raises pitch and HALVES duration — the chipmunk package deal.' },
          { t: 'A crash', why: 'Perfectly legal — the playhead just steps by 2.0. The only crash risk is forgetting the end-of-buffer check.' },
        ],
        answer: 0,
        explain: 'Ratio 2.0 = octave up = half the duration. The chipmunk coupling IS playhead physics — every classic sampler works (and sounds) this way.',
      },
      {
        type: 'fill', concept: 'sampler-dsp',
        prompt: 'Compute the playback ratio from the pressed key and the root note.',
        code: 'float ratio = std::pow (2.0f, (note - ___) / 12.0f);',
        accept: ['rootNote'],
        placeholder: 'anchor',
        hint: 'The key at which the recording plays untouched.',
        explain: 'Distance from the root in semitones, through d3\'s law: press the root, get ratio 1.0, hear the recording as recorded. One formula runs synths, bends, detune and samplers.',
      },
      {
        type: 'mcq', concept: 'sampler-dsp',
        prompt: 'Eight voices play the same sample. What is shared, and what is per-voice?',
        options: [
          { t: 'The recorded buffer is shared (read-only); each voice owns its playhead, ratio and envelope', why: '' },
          { t: 'Everything is per-voice, including eight copies of the sample', why: 'Copying megabytes per voice wastes RAM for nothing — read-only data races nothing (r3 cares about writes).' },
          { t: 'Everything is shared, including the playhead', why: 'One shared playhead = every key plays the same position — n5\'s blurred-pitch bug, sampler edition.' },
          { t: 'It depends on the sample rate', why: 'The rate scales the math, not the ownership map. State that differs per note lives per voice — always.' },
        ],
        answer: 0,
        explain: 'The n5 split, third time: shared read-only data, per-voice mutable state. Once you can answer this question cold, you can architect any instrument.',
      },
    ],
    recap: [
      'A sampler = a playhead over a recorded buffer: position + ratio + wrap.',
      'Pitch is the step size: ratio = 2^((note−root)/12) — speed and pitch couple.',
      'Fractional playheads need interpolation; buffer ends need bounds checks.',
      'Buffer shared read-only; playhead/ratio/envelope per voice (n5\'s law).',
    ],
    inside: [
      { name: 'TXPPS Sampler', use: 'p28 ships playback, looping, pitch and polyphony' },
      { name: 'Every drum machine & romper', use: 'playheads over recordings — the architecture behind half of modern music' },
    ],
    analogyPanel: 'A sampler is a record player with a MIDI-controlled speed knob: press higher keys, spin faster, hear higher-and-quicker. Loops are locked grooves; the envelope is your hand on the fader. First Signal already taught your hands the whole gesture.',
    beginnerMistake: 'Skipping the end-of-buffer check because “the loop wrap handles it” — then a one-shot at ratio 2.0 sails past the last slot into foreign memory. Loops wrap; one-shots BOUND. Different exits, both mandatory.',
    remember: 'An oscillator reads a formula; a sampler reads a recording. Same bookmark, same laws, same architecture.',
    builds: ['sample', 'frequency', 'envelope'],
    leads: ['sample-playback', 'wet-dry'],
  },
];
