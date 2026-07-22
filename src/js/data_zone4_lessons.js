/* ============================================================
   ZONE 4 — DSP WORKSHOP: lessons d1–d8.
   First Signal grows from silent framework to sounding synth.
   ============================================================ */

const ZONE4_LESSONS = [

  /* ------------------------------------------------------ D1 */
  {
    id: 'd1', kind: 'lesson', title: 'What Sound Actually Is', short: 'Waves, samples, DSP',
    concepts: ['dsp-basics'], time: '~5 MIN', diff: 1,
    hook: 'Three zones of architecture, and First Signal still only makes other audio quieter. Time to make audio from nothing. First question, honestly answered: what IS the thing we\'re about to make?',
    objective: 'Connect pressure waves to sample streams — the physical truth behind Digital Signal Processing (DSP).',
    sections: [
      {
        h: 'Pressure, measured very fast',
        body: 'Sound is air pressure wobbling around stillness. A microphone turns that wobble into voltage; a converter measures the voltage tens of thousands of times per second. Each measurement is a **sample** — one float. **Digital Signal Processing (DSP)** is simply doing math on that stream of measurements.',
        viz: { t: 'wave', type: 'samples' },
      },
      {
        h: 'Which means: you can write sound',
        body: 'Flip it around: if playback is just "feed floats to the speaker," then **any code that fills a buffer with the right numbers is an instrument.** Fill it with a repeating shape and you get a tone. That\'s the whole secret of synthesis — the rest of this zone is learning which numbers to write.',
        code: '// this IS synthesis — nothing more mystical:\nfor (int i = 0; i < buffer.getNumSamples(); ++i)\n    data[i] = /* the right number */;',
        codeTitle: 'the whole game',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'dsp-basics',
        prompt: 'What is a single audio sample, physically?',
        options: [
          { t: 'One measurement of the pressure wave\'s height at one instant', why: '' },
          { t: 'One note', why: 'A note lasts thousands of samples — a sample is one dot on the waveform, ~1/48000th of a second.' },
          { t: 'One cycle of a wave', why: 'A cycle contains many samples — at 48kHz, a 440 Hz cycle spans about 109 of them.' },
          { t: 'A small audio file', why: 'That\'s the sampler-world meaning. In DSP, a sample is a single float measurement.' },
        ],
        answer: 0,
        explain: 'One float, one instant of pressure. Everything you\'ve ever heard through speakers was a stream of these — and now you\'re going to write them directly.',
      },
      {
        type: 'mcq', concept: 'dsp-basics',
        prompt: 'What does Digital Signal Processing (DSP) fundamentally do?',
        options: [
          { t: 'Math on streams of sample values', why: '' },
          { t: 'Convert audio to MIDI', why: 'That\'s one exotic application — the foundation is arithmetic on sample streams.' },
          { t: 'Compress files', why: 'Data compression is its own field; audio DSP is about *changing or creating* the signal.' },
          { t: 'Something requiring special hardware', why: 'Your laptop\'s CPU does it fine — DSP is math, and you\'ve been writing it since Zone 1\'s gain loop.' },
        ],
        answer: 0,
        explain: 'Multiply for gain, add for mixing, generate for synthesis: DSP is arithmetic with taste. You\'ve been doing it since `sample * gain` — now it gets creative.',
      },
      {
        type: 'fill', concept: 'dsp-basics',
        prompt: 'Write pure silence into the buffer — the "zero pressure" resting point.',
        code: 'for (int i = 0; i < buffer.getNumSamples(); ++i)\n    data[i] = ___;',
        accept: ['0.0f', '0.f', '0', '0.0'],
        placeholder: 'value',
        hint: 'No wobble at all.',
        explain: 'Silence is 0.0f — air at rest. Every waveform you\'ll generate wobbles around this center line. (Not silence-the-absence: silence-the-number.)',
      },
    ],
    recap: [
      'Sound = air pressure wobbling; samples = fast measurements of it.',
      'DSP (Digital Signal Processing) = math on the sample stream.',
      'Any code that fills a buffer IS an instrument.',
      'Silence is the number 0.0f, not the absence of numbers.',
    ],
    inside: [
      { name: 'First Signal', use: 'about to write its first non-zero samples' },
      { name: 'Every recording', use: 'a long row of floats, wearing a waveform display' },
    ],
    analogyPanel: 'The waveform view in your DAW isn\'t a picture OF the audio — zoomed in far enough, it IS the audio: every dot a number, every number about to be yours to write.',
    beginnerMistake: 'Thinking synthesis requires secret knowledge beyond "fill the buffer." The mystery is which numbers — and that\'s exactly what the next fourteen lessons teach.',
    remember: 'Speakers replay numbers; synthesis is writing the numbers yourself.',
    builds: ['sample', 'dsp', 'audio-buffer'],
    leads: ['sample-rate', 'oscillator'],
  },

  /* ------------------------------------------------------ D2 */
  {
    id: 'd2', kind: 'lesson', title: 'Sample Rate: The Grid of Time', short: 'Rates & the Nyquist limit',
    concepts: ['dsp-basics'], time: '~5 MIN', diff: 1,
    hook: 'You\'ve set sessions to 44.1k or 48k a hundred times. Zone 4 finally answers the question behind the dropdown: what do those numbers buy — and what\'s the highest pitch a given rate can even hold?',
    objective: 'Use sample rate to convert time to samples, and meet the Nyquist limit that caps what the grid can represent.',
    sections: [
      {
        h: 'Time, gridded',
        body: 'The **sample rate** is measurements per second: at 48,000 Hz, one second is 48,000 floats and one millisecond is 48 of them. Every time-based DSP value — delay lengths, envelope times, oscillator steps — is a conversion through this one number. That\'s why `prepareToPlay` hands it to you first.',
        code: 'int samplesFor(float seconds, double sampleRate)\n{\n    return (int) (seconds * sampleRate);\n}\n// 0.5 s at 48kHz → 24,000 samples',
        codeTitle: 'the conversion everything uses',
      },
      {
        h: 'The ceiling: Nyquist',
        body: 'A grid that measures 48,000 times per second can only capture wobbles up to **half** that speed — 24,000 Hz, the **Nyquist frequency**. Ask it to hold anything faster and the wave doesn\'t vanish: it *folds back* as a wrong, inharmonic pitch. That misbehavior has a name — aliasing — and its own lesson soon. For now: **half the rate is the ceiling.**',
        viz: { t: 'wave', type: 'samples', caption: 'the dots can only track wobbles slower than half their own speed' },
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'dsp-basics',
        prompt: 'The session runs at 48 kHz. How many samples is a 250 ms delay?',
        code: 'int n = (int)(0.25f * 48000.0f);',
        options: [
          { t: '`12000`', why: '' },
          { t: '`48000`', why: 'That\'s a full second. A quarter of it: 12,000.' },
          { t: '`250`', why: 'Milliseconds aren\'t samples — multiply through the rate: 0.25 × 48000.' },
          { t: '`192000`', why: 'That would be four seconds. Time × rate, not rate ÷ time.' },
        ],
        answer: 0,
        explain: '0.25 × 48000 = 12,000 samples. Seconds × rate = samples: the conversion you\'ll type in every delay, envelope and LFO you ever build.',
      },
      {
        type: 'mcq', concept: 'dsp-basics',
        prompt: 'What is the Nyquist frequency of a 44.1 kHz session?',
        options: [
          { t: '22,050 Hz — half the sample rate', why: '' },
          { t: '44,100 Hz', why: 'The grid can\'t track a wobble as fast as itself — the ceiling is half.' },
          { t: '20,000 Hz exactly', why: 'That\'s roughly human hearing\'s edge — related to why 44.1k was chosen, but Nyquist is exactly half the rate.' },
          { t: 'It depends on the buffer size', why: 'Buffer size is about latency; the frequency ceiling comes from the rate alone.' },
        ],
        answer: 0,
        explain: 'Nyquist = rate ÷ 2. And 44.1k was chosen precisely so the ceiling (22.05 kHz) clears human hearing (~20 kHz) with margin for filtering.',
      },
      {
        type: 'fill', concept: 'dsp-basics',
        prompt: 'Convert an envelope time to samples, the professional way.',
        code: 'void prepareToPlay(double sampleRate, int samplesPerBlock)\n{\n    attackSamples = (int)(attackSeconds * ___);\n}',
        accept: ['sampleRate'],
        placeholder: 'factor',
        hint: 'The number that turns seconds into samples.',
        explain: 'seconds × sampleRate — computed in prepare, using the real rate. Hard-code 44100 here and every 48k session runs your envelope 8% fast.',
      },
    ],
    recap: [
      'Sample rate = measurements per second; seconds × rate = samples.',
      'Nyquist frequency = rate ÷ 2 — the pitch ceiling of the grid.',
      'Faster-than-Nyquist content folds back wrong (aliasing, soon).',
      'Convert times in prepareToPlay with the real rate.',
    ],
    inside: [
      { name: 'First Signal', use: 'its oscillator\'s step size divides by the rate' },
      { name: 'Delay/Reverb', use: 'every time knob is a seconds×rate conversion' },
    ],
    analogyPanel: 'Sample rate is the frame rate of audio. And like a film of a wagon wheel, motion faster than half the frame rate doesn\'t disappear — it appears to spin the wrong way. That backwards wheel is aliasing.',
    beginnerMistake: 'Thinking higher rates "sound warmer" per se. What 96k really buys is a higher Nyquist ceiling — headroom for processing — not magic. The craft is using the grid you have correctly.',
    remember: 'Seconds × rate = samples; and the grid tops out at half its own speed.',
    builds: ['sample-rate', 'preparetoplay', 'latency'],
    leads: ['nyquist', 'aliasing'],
  },

  /* ------------------------------------------------------ D3 */
  {
    id: 'd3', kind: 'lesson', title: 'Frequency: Pitch as a Number', short: 'Hz and the MIDI map',
    concepts: ['dsp-basics'], time: '~5 MIN', diff: 1,
    hook: 'A440. You\'ve tuned to it, argued about it, maybe detuned from it on purpose. It means: the wave repeats 440 times per second. Every pitch your synth will ever play is just one of these numbers — and MIDI notes map onto them with one formula.',
    objective: 'Convert between musical pitch and Hertz — including the MIDI-note formula every synth contains.',
    sections: [
      {
        h: 'Cycles per second',
        body: '**Frequency**, in Hertz (Hz), counts full wave cycles per second. Double the frequency = one octave up: A440 → A880. That doubling is why pitch feels logarithmic — and why each of the 12 semitones multiplies frequency by the 12th root of 2 (≈1.0595) rather than adding a fixed amount.',
        viz: { t: 'compare2', mode: 'freq' },
      },
      {
        h: 'The formula inside every synth',
        body: 'MIDI note 69 is A440 by convention. Each semitone away multiplies by 2^(1/12). So:',
        code: 'float midiToHz(int note)\n{\n    return 440.0f * std::pow(2.0f,\n        (note - 69) / 12.0f);\n}\n// 69 → 440 Hz   60 (middle C) → ~261.63 Hz',
        codeTitle: 'the pitch map',
        breakdown: [
          ['440.0f', 'the anchor: A440, MIDI note 69'],
          ['note - 69', 'how many semitones away from the anchor'],
          ['/ 12.0f', 'twelve semitones per octave (float division — Zone 1!)'],
          ['std::pow(2, …)', 'octaves double: 2 to the octave-distance'],
        ],
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'dsp-basics',
        prompt: 'A440 plays. You go up exactly one octave. New frequency?',
        code: '// one octave above 440 Hz = ?',
        options: [
          { t: '`880 Hz` — octaves double', why: '' },
          { t: '`440 + 12 = 452 Hz`', why: 'Semitones multiply, they never add — pitch is a ratio world.' },
          { t: '`660 Hz`', why: 'That\'s a perfect fifth up (×1.5), not an octave (×2).' },
          { t: '`4400 Hz`', why: '×10 is between three and four octaves — an octave is exactly ×2.' },
        ],
        answer: 0,
        explain: 'Octave = ×2, always. It\'s why frequency knobs map logarithmically and why your EQ\'s octave bands spread the way they do.',
      },
      {
        type: 'fill', concept: 'dsp-basics',
        prompt: 'Complete the MIDI map: which note number is the A440 anchor?',
        code: 'float midiToHz(int note)\n{\n    return 440.0f * std::pow(2.0f, (note - ___) / 12.0f);\n}',
        accept: ['69'],
        placeholder: 'note',
        hint: 'The A above middle C (60).',
        explain: 'Note 69 = A440. Sanity-check the formula with it: (69−69)/12 = 0, 2⁰ = 1, result 440. Anchors you can verify by ear are anchors you can trust.',
      },
      {
        type: 'mcq', concept: 'dsp-basics',
        prompt: 'Why is the division written `/ 12.0f` and not `/ 12`?',
        options: [
          { t: '(note - 69) is an int — int ÷ int would truncate the semitone fraction to whole octaves', why: '' },
          { t: 'Style preference only', why: 'It\'s functional: integer division quantizes every pitch to a whole octave (truncating toward the anchor). Every note becomes an A.' },
          { t: '12.0f is faster', why: 'Speed is identical — correctness is the issue: Zone 1\'s truncation trap, hiding in a synth formula.' },
          { t: 'pow requires it', why: 'pow accepts either — the truncation happens before pow ever sees the value.' },
        ],
        answer: 0,
        explain: '(70−69)/12 in int math = 0 — a semitone that vanishes. Zone 1\'s very first trap, caught guarding real synthesis code. This is why that lesson came first.',
      },
    ],
    recap: [
      'Frequency = cycles per second (Hz); octave = ×2.',
      'midiToHz: 440 × 2^((note−69)/12).',
      'Note 69 = A440; middle C (60) ≈ 261.63 Hz.',
      'Float division in the formula — truncation kills semitones.',
    ],
    inside: [
      { name: 'First Signal', use: 'its frequency knob speaks Hz; MIDI arrives in Zone 5' },
      { name: 'Every synth', use: 'this exact formula runs on every note-on' },
    ],
    analogyPanel: 'Frequency knobs are logarithmic for the same reason fretboards get narrower up the neck: equal musical steps are equal *ratios*, not equal distances.',
    beginnerMistake: 'Mapping a pitch knob linearly in Hz — the whole bottom octave squeezes into the first millimeter of travel. Musical controls need logarithmic (skewed) ranges.',
    remember: 'Pitch is a ratio world: octaves double, semitones multiply by 2^(1/12).',
    builds: ['frequency', 'midi', 'float'],
    leads: ['oscillator', 'phase'],
  },

  /* ------------------------------------------------------ D4 */
  {
    id: 'd4', kind: 'lesson', title: 'Amplitude, Gain & Headroom', short: 'Level, dB, the ceiling',
    concepts: ['dsp-basics'], time: '~5 MIN', diff: 1,
    hook: 'You\'ve gain-staged a hundred mixes. Now you\'re the one *implementing* the fader — so the loose concepts need exact numbers: what amplitude is, what gain does to it, and where the digital ceiling actually sits.',
    objective: 'Pin down amplitude vs gain vs decibels — and respect the ±1.0 ceiling your synth is about to threaten.',
    sections: [
      {
        h: 'Height, multiplier, scale',
        body: '**Amplitude** is the wave\'s height — how far samples swing from zero. **Gain** is a multiplier applied to it. **Decibels** are the logarithmic ruler ears prefer: gain = 10^(dB/20), so −6 dB ≈ ×0.5 and +6 dB ≈ ×2. All Zone 1 knowledge — now with a synthesis-shaped consequence:',
        viz: { t: 'compare2', mode: 'amp' },
      },
      {
        h: 'The ceiling is real now',
        body: 'Playback converters treat **±1.0 as full scale**. An effect processing existing audio rarely worries — but a *generator* chooses its own amplitude, and a full-swing oscillator is already AT the ceiling before mixing, enveloping or resonance. Professional synths generate with **headroom** — well below 1.0 — and manage level at the output stage. First Signal will too.',
        code: 'float osc = std::sin(phase);        // swings ±1.0\nfloat out = osc * 0.25f;             // ~ -12 dB headroom\n// louder belongs at the OUTPUT stage, not the source',
        codeTitle: 'generate with headroom',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'dsp-basics',
        prompt: 'A sine swings ±0.5. You apply gain 0.5f. New swing — and roughly how many dB did it drop?',
        code: 'sample = sample * 0.5f;',
        options: [
          { t: '±0.25 — about −6 dB', why: '' },
          { t: '±0.5 — gain under 1 does nothing', why: 'Every multiply below 1.0 shrinks the swing: 0.5 × 0.5 = 0.25.' },
          { t: '±0.0 — halving twice is silence', why: 'Halving approaches zero but never reaches it — that\'s the exponential nature of dB steps.' },
          { t: '±1.0', why: 'Gain 0.5 attenuates; ×2 would be the +6 dB direction.' },
        ],
        answer: 0,
        explain: 'Amplitude × gain, and ×0.5 ≈ −6 dB — the landmark you\'ve known by ear since Zone 1 now predicting synthesis levels.',
      },
      {
        type: 'mcq', concept: 'dsp-basics',
        prompt: 'Why should a synth voice generate well below full scale?',
        options: [
          { t: 'Mixing voices, resonance and effects all add level — headroom is where that growth lives', why: '' },
          { t: 'Quiet code runs faster', why: 'The CPU costs the same at any amplitude — headroom is about the signal, not the silicon.' },
          { t: 'Full scale is illegal in VST3', why: 'Nothing forbids it — physics just punishes it: the first sum of two full-scale voices clips.' },
          { t: 'It shouldn\'t — louder is better', why: 'The loudness war ends at ±1.0 with hard clipping. Level belongs at the output stage, chosen deliberately.' },
        ],
        answer: 0,
        explain: 'Eight voices at full swing sum to ±8.0 — brutal clipping. Generate around 0.2–0.3, mix freely, set final level once at the output: gain staging, now in code.',
      },
      {
        type: 'fill', concept: 'dsp-basics',
        prompt: 'Give the oscillator ~−12 dB of headroom at the source.',
        code: 'float out = std::sin(phase) * ___;',
        accept: ['0.25f', '0.25', '.25f', '.25'],
        placeholder: 'gain',
        hint: '−6 dB is 0.5; −12 dB is half of that again.',
        explain: '×0.25 ≈ −12 dB: audible, healthy, and four voices can sum before even reaching full scale. The dB landmarks are becoming design tools.',
      },
    ],
    recap: [
      'Amplitude = swing; gain = multiplier; dB = the log ruler.',
      '±1.0 is digital full scale — the converter\'s ceiling.',
      'Generators choose amplitude: create with headroom.',
      'Final loudness is an output-stage decision, made once.',
    ],
    inside: [
      { name: 'First Signal', use: 'its oscillator will generate at 0.25, output stage at the gain knob' },
      { name: 'Every mix', use: 'the same staging you practice in sessions, now enforced in code' },
    ],
    analogyPanel: 'Gain staging in code is gain staging at the desk: healthy levels at every stage, one fader deciding the final print level — never ten stages each trying to be loud.',
    beginnerMistake: 'Making the oscillator "nice and loud" at the source, then wondering why two notes together distort. Sources stay conservative; output stages get the level knob.',
    remember: 'Generate quiet, mix freely, get loud exactly once — at the output.',
    builds: ['amplitude', 'gain', 'decibel'],
    leads: ['clipping', 'mixing'],
  },

  /* ------------------------------------------------------ D5 */
  {
    id: 'd5', kind: 'lesson', title: 'Phase: The Oscillator\'s Bookmark', short: 'Phase & the increment',
    concepts: ['oscillators'], time: '~6 MIN', diff: 2,
    hook: 'Zone 1\'s Sine Oscillator mission taught the mechanics. Now you know why they work — and First Signal gets its own phase accumulator, the single double that makes an instrument possible.',
    objective: 'Own the phase machinery completely: position, increment, wrap — implemented in First Signal\'s processor.',
    sections: [
      {
        h: 'Position in the cycle',
        body: '**Phase** is where in its cycle the wave currently is: 0 to 2π, then wrap. The oscillator\'s whole life is: *read the shape at the current phase, step forward, repeat.* The step size — the **phase increment** — encodes pitch: 2π × frequency ÷ sampleRate radians per sample.',
        code: '// First Signal\'s new members (PluginProcessor.h):\ndouble phase = 0.0;            // the bookmark (double!)\ndouble phaseIncrement = 0.0;   // set when freq changes\n\nvoid updateIncrement(float freqHz)\n{\n    phaseIncrement = juce::MathConstants<double>::twoPi\n                   * freqHz / getSampleRate();\n}',
        codeTitle: 'the bookmark, installed',
        breakdown: [
          ['double phase', 'double, not float: a tiny step repeated 48,000× a second — Zone 1\'s precision habits'],
          ['twoPi * freq', 'full cycles per second, in radians'],
          ['/ getSampleRate()', 'per second → per sample'],
          ['≈0.0576 @ 440Hz/48k', 'the step that IS the pitch'],
        ],
      },
      {
        h: 'Wrap by subtraction',
        body: 'Past 2π, subtract 2π — **never reset to zero**. The overshoot fraction is real phase; discarding it stretches every cycle to a whole number of samples — at 48 kHz, a “440 Hz” oscillator actually plays ≈436 Hz, about 14 cents flat, immediately and permanently. (You fixed exactly this in p2 — now you know what it costs.)',
        mistake: { code: 'if (phase >= twoPi)\n    phase = 0.0;        // ✗ throws away the overshoot\n\nif (phase >= twoPi)\n    phase -= twoPi;     // ✓ keeps the fraction', text: 'Subtract, don\'t reset. One cycle looks identical on a scope — but every cycle gets stretched to a whole sample count, and the note sits audibly flat, constantly.' },
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'oscillators',
        prompt: 'Set First Signal\'s step size for a given pitch.',
        code: 'phaseIncrement = twoPi * freqHz / ___;',
        accept: ['getSampleRate()', 'sampleRate', 'getSampleRate ()'],
        placeholder: 'divisor',
        hint: 'Per-second motion → per-sample motion.',
        explain: '2π·f/fs — the formula from p2, now permanent equipment. Change the session rate and prepare recomputes it: that\'s why the rate arrives there.',
      },
      {
        type: 'predict', concept: 'oscillators',
        prompt: 'phase is 6.20; the increment is 0.15; twoPi ≈ 6.283. After advance-and-wrap, phase = ?',
        code: 'phase += 0.15;              // 6.35\nif (phase >= twoPi)\n    phase -= twoPi;         // ?',
        options: [
          { t: '≈0.067 — the overshoot survives the wrap', why: '' },
          { t: '0.0 exactly', why: 'That\'s the reset bug — subtraction keeps the 0.067 of real phase that crossed the line.' },
          { t: '6.35 — no wrap happens', why: '6.35 ≥ 6.283, so the wrap fires.' },
          { t: '0.15', why: 'That\'s the increment, not the wrapped position: 6.35 − 6.283 ≈ 0.067.' },
        ],
        answer: 0,
        explain: '6.35 − 6.283 ≈ 0.067: the cycle restarts exactly where physics says, no phase stolen. Pitch stays honest for hours.',
      },
      {
        type: 'mcq', concept: 'oscillators',
        prompt: 'Why is the phase accumulator a double while samples stay float?',
        options: [
          { t: 'The increment is tiny and reused forever — float\'s coarse steps quantize tuning, and a slow LFO\'s step can even vanish; double is free insurance', why: '' },
          { t: 'double sounds warmer', why: 'The output is converted to float anyway — precision matters in the *accumulator*, not the copy.' },
          { t: 'JUCE requires it', why: 'JUCE doesn\'t care — numerics do. Long-running sums are exactly double\'s job (Zone 1, l1).' },
          { t: 'No reason; float is fine', why: 'A wrapped audio-rate phase mostly survives float — but float quantizes the tiny increment, and a very slow LFO\'s step can be swallowed entirely near 2π. Double costs nothing; real synths use it.' },
        ],
        answer: 0,
        explain: 'Precision matters where values are tiny and reused — the increment, the running phase. Outputs are used once and shipped as float. Double for accumulators, float for samples: a habit that never bites.',
      },
    ],
    recap: [
      'Phase = cycle position (0–2π); increment = 2π·f/fs.',
      'The increment IS the pitch.',
      'Wrap by subtracting 2π — resets steal phase and drift pitch.',
      'Accumulators are double; samples are float.',
    ],
    inside: [
      { name: 'First Signal', use: 'phase + increment members just landed in its processor' },
      { name: 'Wavetable synths', use: 'the same bookmark, reading a table instead of sin()' },
    ],
    analogyPanel: 'Phase is a tape loop\'s playhead position; the increment is the tape speed. Splice the loop badly (reset to zero) and every pass silently pastes in an extra millimeter — the loop plays flat, permanently.',
    beginnerMistake: 'Recomputing the increment every sample from scratch "to be safe." Compute it when frequency *changes*; the audio loop just adds. Cheap and correct beats busy.',
    remember: 'The increment is the pitch; the wrap keeps the fraction; the accumulator is a double.',
    builds: ['phase', 'double', 'sample-rate'],
    leads: ['oscillator', 'lfo'],
  },

  /* ------------------------------------------------------ D6 */
  {
    id: 'd6', kind: 'lesson', title: 'First Sound: The Sine Voice', short: 'First Signal speaks',
    concepts: ['oscillators'], time: '~6 MIN', diff: 2,
    hook: 'Every piece is on the bench: phase, increment, headroom, the block loop, the smoothed gain. This lesson bolts them together — and First Signal, silent through three zones, produces its first tone.',
    objective: 'Wire the sine oscillator into processBlock and understand every line of First Signal\'s first voice.',
    sections: [
      {
        h: 'The voice, assembled',
        body: 'A tone-generating processBlock: compute each sample from the phase, write it to **every** channel, advance, wrap. Note what changed from the gain plugin: we *ignore* the input and **write** the buffer instead of scaling it.',
        code: 'void FirstSignalProcessor::processBlock(\n        juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)\n{\n    juce::ScopedNoDenormals noDenormals;\n\n    for (int i = 0; i < buffer.getNumSamples(); ++i)\n    {\n        float s = (float) std::sin(phase) * 0.25f;\n\n        for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n            buffer.getWritePointer(ch)[i] = s;\n\n        phase += phaseIncrement;\n        if (phase >= juce::MathConstants<double>::twoPi)\n            phase -= juce::MathConstants<double>::twoPi;\n    }\n}',
        codeTitle: 'First Signal v2 — it makes sound',
        breakdown: [
          ['std::sin(phase) * 0.25f', 'the shape at the bookmark, with −12 dB headroom'],
          ['= s (not *= )', 'a generator WRITES the buffer; effects scale it'],
          ['every channel gets s', 'same voice to L and R: centered mono, honestly'],
          ['advance + wrap per sample', 'the d5 machinery, exactly once per sample'],
        ],
      },
      {
        h: 'Why one sample loop outside, channels inside',
        body: 'The phase must advance once per *sample*, not once per channel — so the sample loop owns the advance, and the channel loop just copies the computed value. Let the advance slip inside the channel loop and stereo steps the clock twice per sample: an octave up and wrong. Loop structure IS correctness here.',
      },
    ],
    checks: [
      {
        type: 'bugspot', concept: 'oscillators',
        prompt: 'This "stereo" version plays an octave too high. Tap the structural mistake.',
        code: [
          'for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '{',
          '    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
          '    {',
          '        buffer.getWritePointer(ch)[i] =',
          '            (float) std::sin(phase) * 0.25f;',
          '        phase += phaseIncrement;',
          '    }',
          '}',
        ],
        buggy: 6,
        explain: 'The advance sits inside the channel loop: stereo steps the phase twice per sample, doubling the effective pitch (and offsetting the two channels by one step). Compute once per sample, copy to every channel, advance exactly once — outside the channel loop.',
        fix: 'Move phase += phaseIncrement out of the channel loop — one advance per sample',
      },
      {
        type: 'fill', concept: 'oscillators',
        prompt: 'A generator replaces the buffer contents. Complete the write.',
        code: 'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n    buffer.getWritePointer(ch)[i] ___ s;',
        accept: ['=', ' = '],
        placeholder: 'operator',
        hint: 'Write, don\'t scale.',
        mistakes: [
          { match: '\\*=', msg: 'That scales whatever audio was already there — effect behavior. A synth *writes*: plain =.' },
        ],
        explain: '`=` writes the generated sample over the input. First Signal just changed species: from effect to instrument.',
      },
      {
        type: 'predict', concept: 'oscillators',
        prompt: 'Fresh instance: phase starts at 0.0. The very first sample out is…',
        code: 'float s = (float) std::sin(phase) * 0.25f;   // phase == 0.0',
        options: [
          { t: '`0.0` — sin(0) is the zero crossing: a click-free start', why: '' },
          { t: '`0.25` — full headroom amplitude', why: 'sin reaches its peak a quarter-cycle in; at phase 0 it\'s crossing zero.' },
          { t: '`1.0`', why: 'The 0.25 headroom caps the swing at ±0.25 — and sin(0) is 0 anyway.' },
          { t: 'Unpredictable', why: 'phase was initialized to 0.0 in the header — deterministic from the first sample. (Uninitialized would be the scary answer.)' },
        ],
        answer: 0,
        explain: 'Starting at the zero crossing means no step, no click — the same reasoning as p2, now in a real plugin. First Signal\'s first breath is clean.',
      },
    ],
    recap: [
      'Generators write (=); effects scale (*=).',
      'Sample loop outside, channel copy inside, advance once.',
      'Same value to all channels = honest centered mono.',
      'First Signal now produces a 440 Hz sine at −12 dB.',
    ],
    inside: [
      { name: 'First Signal', use: 'v2: a sounding sine — the p9 mission makes it yours' },
      { name: 'Every synth', use: 'strip any voice to its skeleton and this loop is there' },
    ],
    analogyPanel: 'The first tone from a synth you built is the DIY pedal builder\'s first hum — objectively humble, subjectively unforgettable. You now make sound from arithmetic.',
    beginnerMistake: 'Testing generators at full amplitude through headphones at mixing volume. Your ears get one warning per day — start at 0.25 and low monitors, always.',
    remember: 'Read the shape, write every channel, advance once, wrap — that\'s an instrument.',
    builds: ['oscillator', 'processblock', 'phase'],
    leads: ['waveform', 'envelope'],
  },

  /* ------------------------------------------------------ D7 */
  {
    id: 'd7', kind: 'lesson', title: 'The Waveform Family', short: 'Saw, square, triangle, noise',
    concepts: ['waveforms'], time: '~6 MIN', diff: 2,
    hook: 'One knob-turn on any synth: sine becomes saw and the room changes. Same pitch, different recipe of overtones. Today First Signal learns the whole family — in their simple, honest "naive" forms first.',
    objective: 'Generate saw, square, triangle and white noise from phase — and know what each shape\'s harmonics mean for the ear.',
    sections: [
      {
        h: 'Shapes from the same bookmark',
        body: 'Every classic shape is a different function of the *same phase*. Normalize phase to 0–1 (divide by 2π) and the math is plain: a rising line (saw), a threshold (square), a folded line (triangle) — and **white noise** ignores phase entirely: every sample random in ±1.',
        code: 'double t = phase / twoPi;               // 0..1 through the cycle\n\nfloat saw    = (float)(2.0 * t - 1.0);          // rising line\nfloat square = t < 0.5 ? 1.0f : -1.0f;          // threshold\nfloat tri    = (float)(4.0 * std::abs(t - 0.5) - 1.0);\nfloat noise  = random.nextFloat() * 2.0f - 1.0f; // juce::Random',
        codeTitle: 'the family, naive editions',
        breakdown: [
          ['t = phase / twoPi', 'one knob position, normalized 0–1'],
          ['saw: 2t − 1', 'ramps −1→+1, snaps back: every harmonic present'],
          ['square: threshold', 'two levels, hollow odd-harmonic tone'],
          ['noise: random ±1', 'no cycle at all — all frequencies at once'],
        ],
      },
      {
        h: 'What the ear hears',
        body: 'Sine = the fundamental alone. **Saw** = every harmonic (1st, 2nd, 3rd…), fading upward: bright, brassy, the filter\'s favorite meal. **Square** = odd harmonics only: hollow, clarinet-ish. **Triangle** = odd harmonics too but fading fast: soft, flute-ish. The shape you pick is a spectrum you serve. One honest caveat, next lesson: those instant jumps in saw and square hide a digital trap.',
        viz: { t: 'wave', type: 'saw', caption: 'the saw: brightest of the family — every harmonic on the guest list' },
      },
    ],
    checks: [
      {
        type: 'match', concept: 'waveforms',
        prompt: 'Match each waveform to its sonic character.',
        left: ['sine', 'saw', 'square', 'triangle'],
        right: ['fundamental only — pure', 'all harmonics — bright, brassy', 'odd harmonics — hollow', 'odd harmonics, fading fast — soft'],
        explain: 'Shape = harmonic recipe = character. This mapping is the vocabulary of subtractive synthesis: pick a rich shape, then filter it.',
      },
      {
        type: 'fill', concept: 'waveforms',
        prompt: 'Generate white noise: juce::Random gives 0..1 — map it to ±1.',
        code: 'float noise = random.nextFloat() * 2.0f - ___;',
        accept: ['1.0f', '1.f', '1', '1.0'],
        placeholder: 'offset',
        hint: '0..2 needs recentering around zero.',
        explain: '×2 stretches 0..1 to 0..2; −1 centers it to ±1. Without the recentering you\'d have noise riding a massive DC offset — the dictionary\'s waveform-off-center problem, self-inflicted.',
      },
      {
        type: 'predict', concept: 'waveforms',
        prompt: 'Normalized phase t = 0.75. What does the naive square output?',
        code: 'float square = t < 0.5 ? 1.0f : -1.0f;   // t = 0.75',
        options: [
          { t: '`-1.0` — second half of the cycle', why: '' },
          { t: '`+1.0`', why: '0.75 fails the t < 0.5 test — we\'re in the low half.' },
          { t: '`0.5`', why: 'A square knows only two values — that\'s its entire personality.' },
          { t: '`0.0`', why: 'The naive square never rests at zero: high half, low half, nothing between.' },
        ],
        answer: 0,
        explain: 'First half high, second half low: t = 0.75 → −1. Two levels, one threshold — and that instantaneous cliff between them is exactly next lesson\'s subject.',
      },
    ],
    recap: [
      'All shapes are functions of the same phase (normalize: t = phase/2π).',
      'Saw: all harmonics. Square: odd. Triangle: odd, fading fast.',
      'Noise ignores phase — random ±1 per sample.',
      'These are the naive forms — honest, teachable, and trapped (next lesson).',
    ],
    inside: [
      { name: 'First Signal', use: 'the p10 mission installs the selector switch' },
      { name: 'Every subtractive synth', use: 'rich shape in, filter shapes it — the whole genre' },
    ],
    analogyPanel: 'Waveforms are starting timbres the way mic choices are starting tones: pick the character at the source, sculpt it downstream. Saw is the condenser — bright and detailed; triangle is the ribbon — soft and round.',
    beginnerMistake: 'Expecting the naive square to sound like a vintage synth\'s. Analog squares have rounded corners; the digital cliff-edge version has a fizzy sting — the aliasing story, one lesson away.',
    remember: 'One phase, many shapes — and every shape is a harmonic recipe.',
    builds: ['waveform', 'phase', 'harmonics'],
    leads: ['aliasing', 'white-noise'],
  },

  /* ------------------------------------------------------ D8 */
  {
    id: 'd8', kind: 'lesson', title: 'Aliasing: The Fold-Back Trap', short: 'Why naive shapes fizz',
    concepts: ['aliasing-intro'], time: '~6 MIN', diff: 2,
    hook: 'Play your naive saw up the keyboard and listen: somewhere past C5 a metallic fizz creeps in — overtones that aren\'t in the harmonic series, moving the WRONG way as you play higher. That\'s aliasing, and every digital synth ever made had to face it.',
    objective: 'Understand why sharp-edged waveforms alias, recognize the sound, and know the two standard escape routes — by name.',
    sections: [
      {
        h: 'Harmonics past the ceiling',
        body: 'A saw\'s harmonics march upward forever: 440, 880, 1320… The grid\'s ceiling (Nyquist, d2) doesn\'t stop them politely — everything past it **folds back down** into hearable range at wrong, inharmonic frequencies. Worse: play higher and the folded tones move *down*. The ear flags it instantly as "cheap digital."',
        viz: { t: 'wave', type: 'saw', caption: 'that instant cliff = infinite harmonics = guaranteed fold-back' },
      },
      {
        h: 'The escape routes (introductions only)',
        body: 'Two standard cures, both aiming to keep harmonics under the ceiling. **Band-limited synthesis**: generate shapes with only the harmonics that fit (techniques with names like additive synthesis, BLEP/PolyBLEP, wavetables — Zone 5 territory). **Oversampling**: run the DSP at 2× or 4× the rate so the ceiling sits far higher, then filter and come back down — the "HQ switch" on your plugins, at real CPU cost. For First Signal\'s learning journey, the naive shapes stay — *labeled honestly*.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'aliasing-intro',
        prompt: 'What does aliasing sound like on a naive saw played up the keyboard?',
        options: [
          { t: 'Inharmonic metallic fizz — extra tones that move down as you play up', why: '' },
          { t: 'Warm analog drift', why: 'Aliasing is the opposite of warm — folded partials land at mathematically unrelated pitches.' },
          { t: 'Silence above C5', why: 'The energy doesn\'t vanish — it reflects back into the audible range at wrong frequencies.' },
          { t: 'A volume drop', why: 'Level stays; *tuning* of the upper content is what breaks.' },
        ],
        answer: 0,
        explain: 'Wrong-way-moving inharmonic partials are the fingerprint. Once you\'ve heard it knowingly, you\'ll identify aliasing in two seconds forever.',
      },
      {
        type: 'mcq', concept: 'aliasing-intro',
        prompt: 'WHY does the naive saw alias when a pure sine doesn\'t?',
        options: [
          { t: 'Its instant jump implies harmonics far past Nyquist, and those fold back', why: '' },
          { t: 'The saw code has a bug', why: 'The code is a faithful ramp — the *shape itself* demands more harmonics than the grid can hold.' },
          { t: 'Saws are recorded at lower quality', why: 'Nothing is recorded — we generate it. The math of the shape is the whole cause.' },
          { t: 'sin() is more accurate than arithmetic', why: 'Both are exact; the sine just has exactly one harmonic, safely under any ceiling.' },
        ],
        answer: 0,
        explain: 'A vertical edge needs infinite harmonics to describe; the grid can hold finitely many. The overflow folds. Sine = one harmonic = immune.',
      },
      {
        type: 'match', concept: 'aliasing-intro',
        prompt: 'Match each cure to its approach.',
        left: ['band-limited shapes', 'oversampling', 'naive shapes', 'pure sine'],
        right: ['generate only harmonics that fit', 'raise the ceiling, process, come back down', 'honest for learning — fizzy up high', 'immune: one harmonic'],
        explain: 'Fit under the ceiling, or raise the ceiling. First Signal keeps its naive shapes with a warning label; Zone 5\'s wavetables do it properly.',
      },
    ],
    recap: [
      'Harmonics past Nyquist fold back as inharmonic tones.',
      'Sharp edges (saw/square) imply infinite harmonics → guaranteed aliasing.',
      'Cures: band-limited generation, or oversampling (high-level for now).',
      'Naive shapes are fine for learning — label them honestly.',
    ],
    inside: [
      { name: 'First Signal', use: 'its shapes stay naive-and-labeled; the fizz is a feature of learning' },
      { name: 'Commercial synths', use: 'the "HQ/oversample" switch is exactly this tradeoff' },
    ],
    analogyPanel: 'The wagon wheel in old films spinning backwards: motion too fast for the frame rate doesn\'t vanish, it lies about its direction. Harmonics too fast for the sample rate do the same — in pitch.',
    beginnerMistake: 'Reaching for 192 kHz sessions to "fix" aliasing from naive shapes. A higher ceiling does soften the fizz — at 4× the CPU, everywhere, forever — and the shape still implies infinite harmonics. Band-limit the source instead.',
    remember: 'What can\'t fit under Nyquist doesn\'t vanish — it folds back and lies.',
    builds: ['aliasing', 'nyquist', 'harmonics'],
    leads: ['oversampling', 'waveform'],
  },
];
