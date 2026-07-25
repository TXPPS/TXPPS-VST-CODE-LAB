/* ============================================================
   ZONE 4 — challenges, missions p9–p11, and the boss.
   The DSP Workshop: First Signal becomes a sounding synth.
   ============================================================ */

const ZONE4_CHALLENGES = [

  /* ============ READING THE SIGNAL PATH ============ */
  {
    id: 'dr1', kind: 'challenge', ctype: 'reading', title: 'Read: The Sine Voice', short: 'Trace the code',
    concepts: ['oscillators'],
    intro: 'Here\'s First Signal\'s v2 processBlock, every line of it. Read it like a modular patch: what generates, what advances, what merely copies.',
    questions: [
      {
        type: 'match', concept: 'oscillators',
        prompt: 'Match each line to its job in the voice.',
        left: ['std::sin(phase) * 0.25f', 'getWritePointer(ch)[i] = s', 'phase += phaseIncrement', 'phase -= twoPi'],
        right: ['the shape, read at the bookmark, with headroom', 'one voice copied to every lane', 'the pitch, applied one step', 'the wrap — keeps the overshoot'],
        explain: 'Generate, copy, advance, wrap: the four verbs of every oscillator loop you\'ll ever read.',
      },
      {
        type: 'mcq', concept: 'oscillators',
        prompt: 'How many times does the phase advance per sample on a STEREO track?',
        code: 'for (int i = 0; i < buffer.getNumSamples(); ++i)\n{\n    float s = (float) std::sin(phase) * 0.25f;\n    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n        buffer.getWritePointer(ch)[i] = s;\n    phase += phaseIncrement;\n    if (phase >= juce::MathConstants<double>::twoPi)\n        phase -= juce::MathConstants<double>::twoPi;\n}',
        options: [
          { t: 'Exactly once — the advance sits in the sample loop, outside the channel loop', why: '' },
          { t: 'Twice — once per channel', why: 'Look at the braces: the channel loop closes *before* the advance. That placement is the whole design.' },
          { t: 'Once per block', why: 'Per block would freeze the wave inside each block — the advance runs every iteration of the sample loop.' },
          { t: 'It depends on the host', why: 'The host picks block sizes; the *loop structure* fixes advances-per-sample at exactly one.' },
        ],
        answer: 0,
        explain: 'Channels copy; the sample loop advances. One advance per sample regardless of channel count — d6\'s octave-ghost bug, prevented by brace placement.',
      },
    ],
  },
  {
    id: 'dr2', kind: 'challenge', ctype: 'reading', title: 'Read: The Motion Section', short: 'Trace the code',
    concepts: ['modulation'],
    intro: 'An envelope and an LFO share this loop — one shapes the note, one shakes it. Sort out who does what, and what the player actually hears.',
    questions: [
      {
        type: 'match', concept: 'modulation',
        prompt: 'Match each signal to its truth.',
        left: ['adsr.getNextSample()', 'std::sin(lfoPhase)', 'raw * env * trem', 'depth'],
        right: ['one-shot shape — driven by note-on/off', 'loops forever — a control wave', 'audio × two invisible hands', 'how far the LFO turns the knob'],
        explain: 'The envelope is triggered, playing A-D-S-R once. The LFO free-runs in a loop. Both reach the audio the same way — by multiplication.',
      },
      {
        type: 'mcq', concept: 'modulation',
        prompt: 'depth is 0.0. What does the listener hear?',
        code: 'float trem = 1.0f - depth * (0.5f + 0.5f * (float) std::sin(lfoPhase));\nfloat s    = raw * env * trem;',
        options: [
          { t: 'The enveloped tone, unchanged — trem is exactly 1.0, a transparent multiply', why: '' },
          { t: 'Silence — the LFO is off', why: 'Depth 0 doesn\'t mute; it makes trem = 1 − 0 = 1.0. The modulation vanishes, not the sound.' },
          { t: 'Full-depth tremolo', why: 'That\'s depth = 1.0 — the other end of the knob.' },
          { t: 'A pitch wobble', why: 'This LFO is routed to gain (tremolo). Pitch wobble means routing it to the increment — different destination.' },
        ],
        answer: 0,
        explain: 'depth scales the modulation, not the audio: at 0 the term collapses to ×1.0. That\'s why an unused mod routing costs nothing audible.',
      },
    ],
  },

  /* ============ COMPLETION ============ */
  {
    id: 'dc1', kind: 'challenge', ctype: 'completion', title: 'Complete: The Pitch Map', short: 'Code completion',
    concepts: ['dsp-basics'],
    intro: 'A MIDI note arrives; the oscillator needs Hertz, then a step size. Two blanks between a key press and a pitch.',
    questions: [
      {
        type: 'fill', concept: 'dsp-basics',
        prompt: 'The MIDI map: which note number is the anchor A440?',
        code: 'float hz = 440.0f * std::pow(2.0f, (note - ___) / 12.0f);',
        accept: ['69', '69.0f', '69.0', '69.f'],
        placeholder: 'note #',
        hint: 'The A above middle C.',
        explain: 'MIDI 69 = A440. Each semitone away multiplies by 2^(1/12) — twelve of them doubles the frequency: one octave. Every synth contains this line.',
      },
      {
        type: 'fill', concept: 'oscillators',
        prompt: 'Turn that frequency into the oscillator\'s per-sample step.',
        code: 'phaseIncrement = juce::MathConstants<double>::twoPi\n               * hz / ___;',
        accept: ['getSampleRate()', 'sampleRate', 'getSampleRate ()'],
        placeholder: 'divisor',
        hint: 'Cycles per second → radians per sample.',
        explain: '2π·f/fs: full circles per second, divided into per-sample steps. Key press → Hz → increment → pitch. The whole journey is two lines.',
      },
    ],
  },
  {
    id: 'dc2', kind: 'challenge', ctype: 'completion', title: 'Complete: The Bus Trim', short: 'Code completion',
    concepts: ['mixing'],
    intro: 'Two oscillators, one output — and a worst case that crashes the ceiling. Finish the gain plan.',
    questions: [
      {
        type: 'fill', concept: 'mixing',
        prompt: 'Both sources peak at ±1.0. Trim the sum so the worst case is exactly full scale.',
        code: 'float mix = (osc1 + osc2) * ___;',
        accept: ['0.5f', '0.5', '.5f', '.5'],
        placeholder: 'factor',
        hint: 'Two sources; worst-case sum is 2.0.',
        mistakes: [
          { match: '^2(\\.0f?)?$', msg: 'That doubles the crash — ×2 turns a worst case of 2.0 into 4.0. The trim *divides* by the source count: 0.5.' },
        ],
        explain: '2.0 × 0.5 = 1.0 exactly: the 1/N guarantee. Real mixes usually run hotter than that, since two peaks rarely hit their loudest at the same instant — but the guarantee is where you start.',
      },
      {
        type: 'fill', concept: 'levels',
        prompt: 'Bolt on the output seatbelt — the floor of the clamp.',
        code: 's = juce::jlimit(___, 1.0f, s);',
        accept: ['-1.0f', '-1.f'],
        placeholder: 'floor',
        hint: 'The ceiling has a mirror.',
        mistakes: [
          { match: '^0(\\.0f?|\\.f)?$', msg: 'Floor at zero deletes the bottom half of every waveform — total distortion, not protection. The floor mirrors the ceiling: −1.0f.' },
          { match: '^-1(\\.0)?$', msg: 'Right value, wrong type: jlimit deduces ONE shared type, and an int or double bound against float arguments won\'t compile. Write it as a float: -1.0f.' },
        ],
        explain: 'jlimit(−1, +1) engages only when upstream staging failed. If it engages constantly, it IS the distortion — fix the gain plan, not the clamp.',
      },
    ],
  },
  {
    id: 'dc3', kind: 'challenge', ctype: 'completion', title: 'Complete: The Envelope Hookup', short: 'Code completion',
    concepts: ['envelopes'],
    intro: 'The ADSR exists; nothing drives it. Wire the two events that give a note its beginning and its end.',
    questions: [
      {
        type: 'fill', concept: 'envelopes',
        prompt: 'A key went down — start the envelope\'s journey.',
        code: 'if (msg.isNoteOn())\n{\n    updateIncrement(midiToHz(msg.getNoteNumber()));\n    adsr.___();\n}',
        accept: ['noteOn'],
        placeholder: 'method',
        hint: 'The event that launches the Attack.',
        explain: 'noteOn() starts the Attack climb. Pitch first, envelope second — the voice tunes, then it fires.',
      },
      {
        type: 'fill', concept: 'envelopes',
        prompt: 'Inside the loop: ask the envelope for its current value.',
        code: 'float env = adsr.___();\nfloat s   = raw * env * 0.25f;',
        accept: ['getNextSample'],
        placeholder: 'method',
        hint: 'One micro-step of A-D-S-R per call.',
        explain: 'getNextSample() advances the envelope one sample and returns 0..1 — the moving gain knob, multiplied into the voice. Call it per sample, inside the loop — otherwise the shape grows corners.',
      },
    ],
  },
  {
    id: 'dc4', kind: 'challenge', ctype: 'completion', title: 'Complete: Constant-Power Pan', short: 'Code completion',
    concepts: ['stereo'],
    intro: 'A pan knob with a hole in the middle is an amateur tell. Finish the professional pan law.',
    questions: [
      {
        type: 'fill', concept: 'stereo',
        prompt: 'The left gain falls as pan moves right. Which function starts at 1 and falls to 0 over the quarter circle?',
        code: 'float gainL = std::___(pan * juce::MathConstants<float>::halfPi);\nfloat gainR = std::sin(pan * juce::MathConstants<float>::halfPi);',
        accept: ['cos'],
        placeholder: 'function',
        hint: 'sin\'s partner — the one that begins at its peak.',
        mistakes: [
          { match: '^sin$', msg: 'sin starts at ZERO — pan hard left would mute the left channel. The left side needs the curve that starts at 1: cos.' },
        ],
        explain: 'cos falls 1→0 while sin rises 0→1, and their combined energy stays even across the sweep — no 3 dB hole at center. One source, two gains: the level difference IS the position.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'db1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Leaning Noise', short: 'Find the bug',
    concepts: ['waveforms'],
    intro: 'The new noise oscillator hisses — but the woofer sits pushed forward, and a click fires every note-on. The waveform is off-center. Tap why.',
    questions: [
      {
        type: 'bugspot', concept: 'waveforms',
        prompt: 'One line generates 0..1 where audio needs ±1. Which?',
        code: [
          'float nextNoiseSample()',
          '{',
          '    return random.nextFloat();',
          '}',
          '// intended: white noise centered on silence',
        ],
        buggy: 2,
        explain: 'nextFloat() gives 0..1 — all positive, so the noise rides a huge DC offset: the speaker leans forward and every start/stop clicks. Stretch and recenter: nextFloat() * 2.0f − 1.0f.',
        fix: 'return random.nextFloat() * 2.0f - 1.0f;',
      },
    ],
  },
  {
    id: 'db2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Flat Oscillator', short: 'Find the bug',
    concepts: ['oscillators'],
    intro: 'The tuner says this synth never quite hits pitch — every note sits about 14 cents flat, always, on every key. Tap the line that lies.',
    questions: [
      {
        type: 'bugspot', concept: 'oscillators',
        prompt: 'The wrap is wrong in a way a scope won\'t show for one cycle. Which line?',
        code: [
          'phase += phaseIncrement;',
          'if (phase >= juce::MathConstants<double>::twoPi)',
          '    phase = 0.0;',
        ],
        buggy: 2,
        explain: 'Reset-to-zero throws away the overshoot fraction, stretching every cycle to a whole number of samples — a “440 Hz” note at 48 kHz actually plays ≈436 Hz, about 14 cents flat, constantly. Subtract twoPi: the fraction survives and pitch stays honest.',
        fix: 'phase -= juce::MathConstants<double>::twoPi;',
      },
    ],
  },
  {
    id: 'db3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Upside-Down Tremolo', short: 'Find the bug',
    concepts: ['modulation'],
    intro: 'The new tremolo pulses — but it fully mutes twice a cycle, and half the time the waveform is inverted. Tap the raw wire.',
    questions: [
      {
        type: 'bugspot', concept: 'modulation',
        prompt: 'A bipolar signal is driving a gain. Which line?',
        code: [
          'lfoPhase += lfoIncrement;',
          'float trem = (float) std::sin(lfoPhase);',
          'float s    = raw * env * trem;',
        ],
        buggy: 1,
        explain: 'sin gives −1..+1: half of every cycle trem is NEGATIVE (polarity flip), and at the zero crossings the sound fully mutes. Gains want 0..1 territory — re-range: 1.0f − depth * (0.5f + 0.5f * lfo).',
        fix: 'float trem = 1.0f - depth * (0.5f + 0.5f * (float) std::sin(lfoPhase));',
      },
    ],
  },
  {
    id: 'db4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Half-Wave Butcher', short: 'Find the bug',
    concepts: ['levels'],
    intro: 'The "safety clamp" was added yesterday. Today every note is savage distortion — even quiet ones. Tap the boundary that\'s wrong.',
    questions: [
      {
        type: 'bugspot', concept: 'levels',
        prompt: 'The clamp mangles clean audio. Which line?',
        code: [
          'float s = raw * env * gain;',
          's = juce::jlimit(0.0f, 1.0f, s);',
          'buffer.getWritePointer(ch)[i] = s;',
        ],
        buggy: 1,
        explain: 'Audio swings negative — a floor of 0.0 slices off the entire bottom half of every waveform, on every note, at any level. The floor mirrors the ceiling: jlimit(−1.0f, 1.0f, s).',
        fix: 's = juce::jlimit(-1.0f, 1.0f, s);',
      },
    ],
  },

  /* ============ COMPILER ============ */
  {
    id: 'de1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Missing Toolbox', short: 'Read the error',
    concepts: ['dsp-basics'],
    intro: 'The oscillator code is textbook-correct — and the build refuses it. The compiler names exactly what it can\'t find. Decode, then fix.',
    questions: [
      {
        type: 'compiler', concept: 'dsp-basics',
        prompt: 'What fixes this build?',
        code: '// PluginProcessor.cpp\n#include "PluginProcessor.h"\n\nfloat OscVoice::nextSample()\n{\n    return (float) std::sin(phase) * 0.25f;\n}',
        error: "PluginProcessor.cpp:6:26: error:\nno member named 'sin' in namespace 'std';\ndid you mean simply 'sin'?",
        options: [
          { t: 'Add `#include <cmath>` at the top of the file', why: '' },
          { t: 'Rename std::sin to std::sine', why: 'The function IS std::sin — the compiler just hasn\'t been handed the header that declares it.' },
          { t: 'Write your own sin() function', why: 'Reinventing trig is a research project. The standard one exists — one include away.' },
          { t: 'Change phase to float', why: 'std::sin happily takes a double — the type isn\'t the complaint; the missing declaration is.' },
        ],
        answer: 0,
        explain: '"No member named X in namespace std" almost always means the header declaring X was never included. <cmath> brings std::sin, std::pow, std::abs — the DSP toolbox. (It often sneaks in via other headers, which is why code "works" until an include shuffle breaks it.)',
      },
    ],
  },

  /* ============ ORDERING ============ */
  {
    id: 'do1', kind: 'challenge', ctype: 'ordering', title: 'Order: One Sample\'s Journey', short: 'Arrange the code',
    concepts: ['oscillators'],
    intro: 'The oscillator loop, shuffled. Only one order generates, copies, advances and wraps without lying about the pitch.',
    questions: [
      {
        type: 'order', concept: 'oscillators',
        prompt: 'Arrange the loop body top to bottom, exactly as d6 teaches it: generate → copy → advance → wrap.',
        lines: [
          'float s = (float) std::sin(phase) * 0.25f;',
          'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
          '    buffer.getWritePointer(ch)[i] = s;',
          'phase += phaseIncrement;',
          'if (phase >= juce::MathConstants<double>::twoPi)',
          '    phase -= juce::MathConstants<double>::twoPi;',
        ],
        explain: 'Generate → copy to every lane → advance → wrap. Advance before the *generate* and every sample reads a bookmark that already moved; wrap before the advance and the check tests stale phase. d6 keeps all the clockwork last — signal first, bookkeeping after.',
      },
    ],
  },

  /* ============ MISSIONS ============ */
  {
    id: 'p9', kind: 'project', title: 'Mission 1: The Oscillator Installed', short: 'Zone mission',
    concepts: ['oscillators', 'dsp-basics'],
    brief: 'First Signal has processed silence for a whole zone. Install the phase machinery — members, increment, the generating loop — and hear the plugin\'s first tone. This is the mission where your plugin becomes an instrument.',
    steps: [
      {
        note: 'Step 1 — The voice needs memory between blocks. Give the processor its bookmark (header, private section).',
        q: {
          type: 'mcq', concept: 'oscillators',
          prompt: 'Which declarations are correct for the phase machinery?',
          options: [
            { t: 'double phase = 0.0; double phaseIncrement = 0.0;', why: '' },
            { t: 'float phase = 0.0f; float phaseIncrement = 0.0f;', why: 'A wrapped phase mostly survives float — but float quantizes the tiny increment. Double costs nothing: make it the accumulator habit (d5).' },
            { t: 'static double phase;', why: 'static would SHARE one phase across every instance of the plugin — two tracks, one interleaved mess. Each processor owns its own.' },
            { t: 'double phase; (no initializer)', why: 'Uninitialized memory as your first sample: a click, or worse, garbage. = 0.0 starts at the zero crossing, silently.' },
          ],
          answer: 0,
          explain: 'Real members, one per instance, kept as double and started at 0.0 — the bookmark opens at the zero crossing and never lies. Zone 1\'s precision lesson, put to work.',
        },
      },
      {
        note: 'Step 2 — When the pitch changes, the step has to change with it. Complete the increment setter.',
        q: {
          type: 'fill', concept: 'oscillators',
          prompt: 'The formula that turns Hertz into a per-sample step.',
          code: 'void updateIncrement(float freqHz)\n{\n    phaseIncrement = juce::MathConstants<double>::twoPi\n                   * freqHz / ___;\n}',
          accept: ['getSampleRate()', 'sampleRate', 'getSampleRate ()'],
          placeholder: 'divisor',
          hint: 'Per-second → per-sample.',
          explain: '2π·f/fs. Called on note changes — not per sample. The audio loop just adds; the setter does the math when something actually changes.',
        },
      },
      {
        note: 'Step 3 — The heart. Arrange the generating loop body.',
        q: {
          type: 'order', concept: 'oscillators',
          prompt: 'Arrange one iteration of the sample loop.',
          lines: [
            'float s = (float) std::sin(phase) * 0.25f;',
            'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
            '    buffer.getWritePointer(ch)[i] = s;',
            'phase += phaseIncrement;',
            'if (phase >= juce::MathConstants<double>::twoPi)',
            '    phase -= juce::MathConstants<double>::twoPi;',
          ],
          explain: 'Generate with headroom, write every channel, advance once, wrap by subtraction. First Signal v2\'s exact heartbeat.',
        },
      },
      {
        note: 'Step 4 — A generator has a different relationship with the buffer than an effect. Prove it.',
        q: {
          type: 'mcq', concept: 'dsp-basics',
          prompt: 'Why `= s` (write) and not `*= s` (scale)?',
          options: [
            { t: 'A generator REPLACES the buffer with its own signal; scaling would multiply against whatever audio arrived', why: '' },
            { t: '*= is slower', why: 'Same cost — the difference is *meaning*: write vs scale, instrument vs effect.' },
            { t: '= avoids clipping', why: 'Clipping is about level, not operator. Headroom (the 0.25f) handles that.' },
            { t: 'JUCE forbids *= on buffers', why: 'JUCE allows anything — Zone 3\'s gain plugin scaled with *= happily. Species decides operator.' },
          ],
          answer: 0,
          explain: 'Effects transform what arrives; instruments write over it. One operator is the difference between First Signal v1 and v2 — press play, and for the first time: a tone.',
        },
      },
    ],
  },
  {
    id: 'p10', kind: 'project', title: 'Mission 2: The Waveform Selector', short: 'Zone mission',
    concepts: ['waveforms', 'dsp-basics'],
    brief: 'One sine is a test tone; a waveform family is an instrument. Install saw, square, triangle and noise behind a selector switch — and handle the one shape that needs recentering.',
    steps: [
      {
        note: 'Step 1 — The switch. Zone 1\'s selector pattern, now choosing shapes.',
        q: {
          type: 'fill', concept: 'waveforms',
          prompt: 'Normalize the phase so every shape reads the same 0..1 knob.',
          code: 'double t = phase / juce::MathConstants<double>::___;',
          accept: ['twoPi'],
          placeholder: 'constant',
          hint: 'A full cycle, in radians.',
          explain: 't = phase/2π: one normalized position, every shape a function of it. Saw: 2t−1. Square: threshold at 0.5. Triangle: folded line. One bookmark, four personalities.',
        },
      },
      {
        note: 'Step 2 — The saw, from the normalized position.',
        q: {
          type: 'fill', concept: 'waveforms',
          prompt: 'A rising line from −1 to +1 across the cycle.',
          code: 'case Waveform::saw:\n    return (float)(2.0 * t - ___);',
          accept: ['1.0', '1', '1.0f', '1.f'],
          placeholder: 'offset',
          hint: '0..2 needs recentering.',
          explain: '2t spans 0..2; −1 centers it to ±1. The brightest shape in the family — every harmonic on the guest list, and d8\'s fold-back warning on the label.',
        },
      },
      {
        note: 'Step 3 — Noise is the special case: it ignores the phase entirely.',
        q: {
          type: 'bugspot', concept: 'waveforms',
          prompt: 'This noise case has the Leaning Noise bug. Tap it.',
          code: [
            'case Waveform::noise:',
            '    return random.nextFloat();',
          ],
          buggy: 1,
          explain: '0..1 is all-positive: a DC offset the size of half your signal. Stretch and recenter — nextFloat() * 2.0f − 1.0f — or the woofer leans and every note-on clicks.',
          fix: 'return random.nextFloat() * 2.0f - 1.0f;',
        },
      },
      {
        note: 'Step 4 — A design decision: should the selector be smoothed like the gain knob?',
        q: {
          type: 'mcq', concept: 'waveforms',
          prompt: 'Smooth the waveform selector?',
          options: [
            { t: 'No — it\'s a discrete switch; gliding would synthesize unchosen in-between shapes. Snap it', why: '' },
            { t: 'Yes — smooth every parameter', why: 'Smooth every CONTINUOUS parameter. A selector has no meaningful in-between to visit (d13).' },
            { t: 'Only at high sample rates', why: 'The rate doesn\'t change what a selector IS: a discrete choice.' },
            { t: 'Yes, to prevent aliasing', why: 'Aliasing comes from the shapes\' harmonics (d8), not from switching between them.' },
          ],
          answer: 0,
          explain: 'Glide the continuous, snap the discrete. (If the snap itself clicks, pros crossfade briefly between old and new shape — a topic for later.) First Signal now has a voice AND a wardrobe.',
        },
      },
    ],
  },
  {
    id: 'p11', kind: 'project', title: 'Mission 3: Shape & Motion', short: 'Zone mission',
    concepts: ['envelopes', 'modulation', 'levels'],
    brief: 'The finale: wire the ADSR so notes live and die, install the tremolo LFO, and bolt the safety clamp on the door. When this mission ends, First Signal is a sounding, breathing synth — every stage yours.',
    steps: [
      {
        note: 'Step 1 — The envelope needs its marching orders each session. Configure it where the rate is known.',
        q: {
          type: 'fill', concept: 'envelopes',
          prompt: 'Tell the ADSR the session\'s time grid.',
          code: 'void prepareToPlay(double sampleRate, int samplesPerBlock)\n{\n    adsr.setSampleRate(___);\n    adsr.setParameters({ 0.01f, 0.10f, 0.8f, 0.30f });\n}',
          accept: ['sampleRate', 'getSampleRate()'],
          placeholder: 'argument',
          hint: 'Its A/D/R times are in seconds — seconds need a rate.',
          explain: 'Attack 10 ms, Decay 100 ms, Sustain LEVEL 0.8, Release 300 ms — but those times only mean something once the envelope knows the rate. Rate-dependent setup lives in prepareToPlay, always.',
        },
      },
      {
        note: 'Step 2 — Note events drive the envelope. Wire the note-off.',
        q: {
          type: 'fill', concept: 'envelopes',
          prompt: 'The key came up — begin the fade to silence.',
          code: 'if (msg.isNoteOff())\n    adsr.___();',
          accept: ['noteOff'],
          placeholder: 'method',
          hint: 'Starts the Release stage.',
          explain: 'noteOff() → Release, from wherever the level currently is. Between noteOn and noteOff the envelope holds at Sustain — for as long as the player decides.',
        },
      },
      {
        note: 'Step 3 — The full voice multiply. Arrange the chain\'s inner lines.',
        q: {
          type: 'order', concept: 'modulation',
          prompt: 'Arrange: generate, shape, guard, deliver.',
          lines: [
            'float raw    = oscSample(waveform, phase);',
            'float shaped = raw * adsr.getNextSample();',
            'float s      = shaped * trem * gainSmoothed.getNextValue();',
            's = juce::jlimit(-1.0f, 1.0f, s);',
            'buffer.getWritePointer(ch)[i] = s;',
          ],
          explain: 'Each line feeds the next: tone → shaped → leveled, THEN the clamp, THEN the write. Math after a clamp is unguarded — the seatbelt goes on last, and only the write comes after it.',
        },
      },
      {
        note: 'Step 4 — Ship check. The synth is done when you can explain its one honest flaw.',
        q: {
          type: 'mcq', concept: 'levels',
          prompt: 'High notes on the saw have a faint metallic fizz. Ship-blocking bug?',
          options: [
            { t: 'No — that\'s aliasing from the naive shapes, a known and labeled limitation; band-limiting is Zone 5\'s opening act', why: '' },
            { t: 'Yes — the clamp is misplaced', why: 'A clamp bug distorts loud material at ANY pitch. Fizz that appears with pitch height is d8\'s fingerprint.' },
            { t: 'Yes — the LFO is leaking', why: 'An LFO leak would pulse at the LFO rate. This artifact tracks the NOTE, appearing up high: fold-back.' },
            { t: 'Yes — raise the session to 192 kHz', why: 'That moves the ceiling, not the problem — naive shapes still imply infinite harmonics (d8\'s beginner trap).' },
          ],
          answer: 0,
          explain: 'Knowing which artifacts are bugs and which are documented tradeoffs is what shipping means. First Signal v3 is complete: oscillator, wardrobe, envelope, motion, level, seatbelt. It sings — now the boss asks you to think like an architect: a full design review of a plugin whose structure is failing.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss4', kind: 'boss', title: 'BOSS: Plugin Architect', short: 'Zone 4 boss', passNeed: 4,
    concepts: ['processor-editor', 'lifecycle', 'automation', 'smoothing', 'thread-safety', 'state'],
    brief: 'A commercial plugin is failing architecture review: DSP state lives in the editor, the setup guesses the sample rate, host automation reaches nothing, the gain zippers, and the audio thread allocates on the deadline. Six design faults, one retry each — clear at least 4 to pass review.',
    stages: [
      {
        type: 'mcq', concept: 'processor-editor', qid: 'b4s1',
        prompt: 'Phase 1 — Broken Architecture. The delay tail cuts out every time the user closes the plugin window, and reopening the window resets it. Diagnose the design fault.',
        code: 'class DelayEditor : public juce::AudioProcessorEditor\n{\n    juce::AudioBuffer<float> delayBuffer;   // the delay line lives HERE\n};',
        options: [
          { t: 'The delay line lives in the editor — the host destroys the editor when the window closes. DSP state belongs in the processor.', why: '' },
          { t: 'The delay buffer is too small', why: 'Size is not the symptom — the tail dies exactly when the window closes. The buffer is destroyed with its owner, whatever its size.' },
          { t: 'The editor should be kept alive after the window closes', why: 'The host owns the editor\'s lifecycle: it may close, reopen, or never create it at all (think offline render). The architecture must survive that, not fight it.' },
          { t: 'processBlock should pause while the window is closed', why: 'Audio must keep running with no GUI — most of a plugin\'s life is spent with its window closed. Pausing DSP on window state would silence every mixdown.' },
        ],
        answer: 0,
        explain: 'The processor lives as long as the plugin instance and owns ALL audio state; the editor is a disposable view the host creates and destroys freely — and may never create at all. Anything the sound depends on must live in the processor, with the editor only displaying and controlling it.',
      },
      {
        type: 'bugspot', concept: 'lifecycle', qid: 'b4s2',
        prompt: 'Phase 1 — Broken Architecture. The delay is exactly right at 44.1 kHz sessions and audibly short at 96 kHz. Tap the line doing its work in the wrong lifecycle stage.',
        code: [
          'DelayProcessor::DelayProcessor()',
          '{',
          '    delayLine.setSize(1, 44100 * 2);   // "2 seconds"',
          '}',
          'void DelayProcessor::prepareToPlay(',
          '        double sampleRate, int samplesPerBlock)',
          '{',
          '}',
        ],
        buggy: 2,
        explain: 'The constructor runs before the host has revealed the sample rate, so "44100 * 2" is a guess — at 96 kHz those samples last under a second. prepareToPlay is the lifecycle callback that delivers the real sampleRate (and runs again whenever it changes): rate-dependent setup belongs there, sized from the argument.',
        fix: 'delayLine.setSize(1, (int) (sampleRate * 2.0)); in prepareToPlay',
      },
      {
        type: 'mcq', concept: 'automation', qid: 'b4s3',
        prompt: 'Phase 2 — Repair Communication. The cutoff knob works by hand, but automation written in the host moves nothing. Diagnose the wiring.',
        code: '// editor —\ncutoffSlider.onValueChange = [this] {\n    processorRef.cutoffHz = (float) cutoffSlider.getValue();\n};\n// processBlock reads processorRef.cutoffHz',
        options: [
          { t: 'The knob bypasses the parameter — the host automates the registered APVTS parameter, which nothing reads. Attach the slider and read the parameter in processBlock.', why: '' },
          { t: 'The editor needs a timer to poll the host faster', why: 'Automation is delivered host → parameter whether or not any editor exists — no editor timer is involved, and a GUI-side fix would still break with the window closed.' },
          { t: 'cutoffHz must be a double, not a float', why: 'Precision is not the problem. The host writes automation into the parameter it was told about at registration — it cannot see this plain member at all.' },
          { t: 'The host needs to rescan the plugin', why: 'Rescans discover plugins; they do not reroute automation. The parameter already exists in the layout — the plugin simply never reads it.' },
        ],
        answer: 0,
        explain: 'Parameters registered in the APVTS layout are the plugin\'s contract with the host: automation lands there and nowhere else. Wire the knob with a SliderAttachment (knob ↔ parameter, both directions) and make processBlock read the parameter — one value, and the hand, the host and the audio all agree on it.',
      },
      {
        type: 'fill', concept: 'smoothing', qid: 'b4s4',
        prompt: 'Phase 2 — Repair Communication. Automation arrives now — but the gain steps once per block and zippers. Complete the per-sample glide.',
        code: '// once per block: read the parameter, aim the smoother\ngainSmoothed.setTargetValue(apvts.getRawParameterValue("gain")->load());\n// every sample: step toward the target\nout[i] = in[i] * gainSmoothed.___();',
        accept: ['getNextValue'],
        placeholder: 'method',
        hint: 'The SmoothedValue call that advances the ramp one sample toward the target — and returns where it landed.',
        mistakes: [
          { match: '^getnextvalue$', msg: 'Almost — C++ is case-sensitive. The method is getNextValue, capital N, capital V.' },
          { match: '^getTargetValue$', msg: 'That returns where the glide is HEADING. Multiplying by it per sample reproduces exactly the block-sized jumps you are removing.' },
          { match: '^getCurrentValue$', msg: 'That reads the ramp without advancing it — the gain would freeze mid-glide. You need the call that takes one step per call.' },
        ],
        explain: 'getNextValue() advances the ramp one sample and returns the new value: the block-rate parameter step becomes an inaudible per-sample glide. The full path — atomic load once per block, setTargetValue to aim, getNextValue in the loop — is how parameter changes reach audio without zipper noise.',
      },
      {
        type: 'bugspot', concept: 'thread-safety', qid: 'b4s5',
        prompt: 'Phase 3 — Production Stability. Rare dropouts under load, worse with small buffers. Tap the line that breaks the audio thread\'s real-time contract.',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    std::vector<float> scratch(buffer.getNumSamples());',
          '    mixToScratch(scratch, buffer);',
          '    writeBack(buffer, scratch);',
          '}',
        ],
        buggy: 3,
        explain: 'That vector heap-allocates every block — and an allocation can wait on a lock or the OS for an unbounded time. Miss the buffer deadline once and the host plays a gap. The contract: prepareToPlay owns allocation; processBlock only touches memory that already exists. Pre-allocate the scratch buffer in prepareToPlay and reuse it.',
        fix: 'Allocate scratch in prepareToPlay (member), reuse it here',
      },
      {
        type: 'order', concept: 'state', qid: 'b4s6',
        prompt: 'Phase 3 — Production Stability. Final review. The host hands back a saved session as raw bytes. Arrange setStateInformation top to bottom so the preset restores safely: decode, verify, then swap coherently.',
        lines: [
          'auto xml = getXmlFromBinary(data, sizeInBytes);          // bytes -> XML',
          'if (xml == nullptr || ! xml->hasTagName(apvts.state.getType())) return;   // reject junk untouched',
          'apvts.replaceState(juce::ValueTree::fromXml(*xml));      // the sanctioned swap',
        ],
        explain: 'Decode first — you cannot inspect bytes you have not parsed. Verify before touching live state — corrupt or foreign data must be rejected while the current sound is still intact. Then replaceState(), the APVTS door that swaps the tree while keeping parameters, attachments, the host and any open editor coherent. Architecture review passed: every owner correct, every wire connected — Zone 4 is yours.',
      },
    ],
  },
];
