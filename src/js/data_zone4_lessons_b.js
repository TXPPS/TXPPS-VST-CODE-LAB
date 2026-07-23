/* ============================================================
   ZONE 4 — lessons d9–d15 (appended to ZONE4_LESSONS).
   Envelopes, clipping, mixing, stereo, zipper noise, LFOs,
   and the full First Signal output stage.
   ============================================================ */

ZONE4_LESSONS.push(

  /* ------------------------------------------------------ D9 */
  {
    id: 'd9', kind: 'lesson', title: 'Envelopes: Shaping the Note', short: 'ADSR — a gain that moves',
    concepts: ['envelopes'], time: '~6 MIN', diff: 2,
    hook: 'First Signal drones — press play, sine forever. What separates a piano hit from a pad swell isn\'t the waveform: it\'s how loudness moves through time. You\'ve tweaked that motion on a thousand presets. Its name is the envelope, and it\'s simpler than you think.',
    objective: 'Understand the amplitude envelope as a per-sample moving gain — and what Attack, Decay, Sustain and Release each really control.',
    sections: [
      {
        h: 'A gain knob that turns itself',
        body: 'An amplitude **envelope** is a number between 0.0 and 1.0 that changes over time and **multiplies** the signal. At 0.0: silence. At 1.0: full level. Everything between is a fade. The synth is just riding a fader for you — thousands of times per second, identically on every note.',
        viz: { t: 'adsr' },
      },
      {
        h: 'Three stopwatches and a fader position',
        body: '**Attack** = time from silence to peak after the key goes down. **Decay** = time from peak down to the Sustain level. **Sustain** = a *LEVEL*, not a time — held as long as the finger stays. **Release** = time from wherever-it-is to silence after the key lifts. In code it\'s one multiply, with `juce::ADSR` doing the ramp math:',
        code: 'float raw = (float) std::sin(phase);\nfloat env = adsr.getNextSample();   // 0..1, walking through A-D-S-R\nfloat s   = raw * env * 0.25f;',
        codeTitle: 'the envelope is one multiply',
        breakdown: [
          ['getNextSample()', '"where are you NOW?" — advances one sample step per call'],
          ['env', 'a plain float 0..1 — the moving gain knob'],
          ['raw * env', 'tone × shape: the entire trick'],
          ['* 0.25f', 'd6\'s headroom stays — the envelope shapes, this protects'],
        ],
        mistake: { code: 'float s = raw + env;   // ✗ adds the ramp INTO the audio', text: 'An envelope is a control signal — it scales by multiplication. Adding a slow 0→1 ramp just shoves the waveform off-center (a DC offset) and shapes nothing.' },
      },
      {
        h: 'Note on, note off',
        body: 'The envelope needs two events from outside: **note-on** starts the Attack (`adsr.noteOn()`), **note-off** starts the Release (`adsr.noteOff()`). Between them it parks at the Sustain level — for however long the *musician* decides. That\'s exactly why Sustain must be a level: its duration isn\'t the preset\'s to know.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'envelopes',
        prompt: 'Which ADSR stage is a LEVEL rather than a time?',
        options: [
          { t: 'Sustain', why: '' },
          { t: 'Attack', why: 'Attack is a duration — silence to peak, in milliseconds.' },
          { t: 'Decay', why: 'Decay is a duration — peak down to the sustain level.' },
          { t: 'Release', why: 'Release is a duration — current level down to silence.' },
        ],
        answer: 0,
        explain: 'A, D, R are stopwatches; S is a fader position. Its *duration* belongs to the player\'s finger, not the preset.',
      },
      {
        type: 'fill', concept: 'envelopes',
        prompt: 'Apply the envelope to the raw oscillator sample.',
        code: 'float env = adsr.getNextSample();\nfloat s   = raw ___ env * 0.25f;',
        accept: ['*'],
        placeholder: 'operator',
        hint: 'Scale, don\'t add.',
        mistakes: [
          { match: '^\\+$', msg: 'Adding mixes the ramp in as if it were audio — that\'s a DC offset, not a shape. Control signals multiply.' },
        ],
        explain: 'Audio × envelope: at env 0.0 silence, at 1.0 full tone, between = fade. Every synth you own does this exact multiply.',
      },
      {
        type: 'mcq', concept: 'envelopes',
        prompt: 'What starts the Release stage?',
        options: [
          { t: 'The key being let go — note-off', why: '' },
          { t: 'The envelope reaching the Sustain level', why: 'That ends *Decay*. The envelope then holds at Sustain until note-off.' },
          { t: 'A timer in the preset', why: 'No stage times the Sustain hold — the musician\'s finger does.' },
          { t: 'The end of the buffer', why: 'Envelopes span thousands of buffers — block edges are invisible to the note\'s shape.' },
        ],
        answer: 0,
        explain: 'noteOff() → Release begins from wherever the level currently is. Until then, Sustain holds for as long as the key does.',
      },
    ],
    recap: [
      'An envelope is a gain value (0..1) that moves through time — applied by multiplication.',
      'Attack, Decay, Release are times; Sustain is a held LEVEL.',
      'juce::ADSR: getNextSample() per sample; noteOn/noteOff drive the stages.',
      'Adding an envelope instead of multiplying = DC offset, not shape.',
    ],
    inside: [
      { name: 'First Signal', use: 'the p11 mission wires an ADSR into the voice' },
      { name: 'Nearly every synth', use: 'an amplitude envelope (usually ADSR); often a second one on the filter' },
    ],
    analogyPanel: 'An envelope is an automated fader ride recorded into every note. Attack: how fast you push it up. Decay: easing back. Sustain: the level you hold. Release: pulling to −∞ when the note ends.',
    beginnerMistake: 'Reading Sustain as "how long the note sustains." It has no duration. A patch that dies while you hold the key is Decay reaching a Sustain level of *zero* — not a short Sustain time.',
    remember: 'A, D, R are stopwatches; S is a fader position. The whole thing is one multiply.',
    builds: ['envelope', 'attack', 'sustain'],
    leads: ['release', 'lfo'],
  },

  /* ------------------------------------------------------ D10 */
  {
    id: 'd10', kind: 'lesson', title: 'Clipping: The Ceiling at ±1.0', short: 'Flat tops & gain staging',
    concepts: ['levels'], time: '~6 MIN', diff: 2,
    hook: 'You\'ve seen the red light: master slams, the mix turns crunchy. Analog clipping was tubes saturating — sometimes flattering. Digital clipping is brutal arithmetic: past the ceiling, the format simply can\'t hold the number, and your waveform\'s peaks get sliced flat.',
    objective: 'Know why digital audio clips at ±1.0, why flat tops sound harsh, and how gain staging plus a safety clamp keep First Signal honest.',
    sections: [
      {
        h: 'Where the slicing happens',
        body: 'Full scale is **−1.0 to +1.0** — but a float itself doesn\'t explode at 1.2. It happily carries 3.7 through your DSP. The damage happens where audio *leaves* float land: the converter to your monitors, or a fixed-point export. There, everything past ±1.0 is clamped, and smooth peaks become **flat tops**.',
        viz: { t: 'clipwave' },
      },
      {
        h: 'Why flat tops sound harsh',
        body: 'd7\'s rule: shape = harmonic recipe, and sharp corners = strong high harmonics. Clipping *adds corners* to your peaks — a clipped sine sprouts the bright grit of something square-ish. Those overtones were never in your music, and any that land past Nyquist **fold back** as inharmonic garbage (d8). Digital clipping is harshness twice over.',
      },
      {
        h: 'The seatbelt: clamp last',
        body: 'Real protection is **gain staging** — sensible levels *before* the ceiling (our `* 0.25f` is exactly that). But a defensive output stage also clamps, so an upstream bug can never blast someone\'s monitors:',
        code: 'float s = voice * gain;\ns = juce::jlimit(-1.0f, 1.0f, s);   // safety clamp at the ceiling\nbuffer.getWritePointer(ch)[i] = s;',
        codeTitle: 'the output seatbelt',
        breakdown: [
          ['jlimit(lo, hi, v)', 'JUCE\'s clamp: pins v inside [lo, hi], returns it untouched if already inside'],
          ['-1.0f, 1.0f', 'the floor AND the ceiling — audio swings negative too'],
          ['clamp ≠ strategy', 'if it engages constantly, it IS distortion — fix the gain upstream'],
        ],
        mistake: { code: 's = juce::jlimit(0.0f, 1.0f, s);   // ✗ floor at zero', text: 'Audio swings negative. A floor of 0.0 slices off the entire bottom half of every waveform — savage distortion on every note, not just overs. The floor is −1.0.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'levels',
        prompt: 'What happens, visually, to a waveform pushed past digital full scale?',
        options: [
          { t: 'Its peaks are sliced flat at the ceiling', why: '' },
          { t: 'It gets smoother', why: 'The opposite — clamping *adds* corners where round peaks used to be.' },
          { t: 'It shifts upward', why: 'That\'s DC offset — a different disease. Clipping flattens both extremes symmetrically.' },
          { t: 'It disappears', why: 'The signal survives — mangled. Everything inside ±1.0 passes; only the overshoot is destroyed.' },
        ],
        answer: 0,
        explain: 'Round peaks become flat tops. And flat tops are corners — which is why the next question exists.',
      },
      {
        type: 'mcq', concept: 'levels',
        prompt: 'WHY does clipping sound harsh?',
        options: [
          { t: 'Flat tops are sharp corners — corners mean strong new high harmonics, and past-Nyquist ones fold back', why: '' },
          { t: 'It lowers the sample rate', why: 'The grid is untouched — it\'s the *shape* riding the grid that grew corners.' },
          { t: 'It reverses the phase', why: 'Phase is where-in-the-cycle; clipping mangles the shape at the extremes instead.' },
          { t: 'It makes the audio quieter', why: 'If anything it\'s louder — that\'s usually how it got clipped. The harshness is spectral, not level.' },
        ],
        answer: 0,
        explain: 'd7 + d8 in one bug: corners breed high harmonics, and the ones over the ceiling alias back down inharmonically. Two lessons, one crunch.',
      },
      {
        type: 'fill', concept: 'levels',
        prompt: 'Clamp the finished sample to full scale — floor first.',
        code: 's = juce::jlimit(___, 1.0f, s);',
        accept: ['-1.0f', '-1.f'],
        placeholder: 'floor',
        hint: 'Audio swings both ways.',
        mistakes: [
          { match: '^0(\\.0f?|\\.f)?$', msg: 'A floor of zero deletes the bottom half of every wave — total distortion. The floor mirrors the ceiling: −1.0f.' },
          { match: '^-1(\\.0)?$', msg: 'Right value, wrong type: jlimit deduces ONE shared type — int or double bounds against float arguments won\'t compile. Write the float: -1.0f.' },
        ],
        explain: 'jlimit(−1, +1): the seatbelt engages only when something upstream went wrong. If it engages *constantly*, the bug is your gain staging.',
      },
    ],
    recap: [
      'Full scale is ±1.0 — floats carry bigger values fine; the boundary out of float-land clips them.',
      'Clipping = flat tops = new corners = harsh harmonics (+ fold-back past Nyquist).',
      'jlimit(−1.0f, 1.0f, s) as the LAST step: a seatbelt, not a strategy.',
      'Real protection is upstream gain staging — like d6\'s 0.25f.',
    ],
    inside: [
      { name: 'First Signal', use: 'its output stage clamps in d15 — after staging correctly first' },
      { name: 'Clippers & limiters', use: 'a "ceiling" knob in dBFS is jlimit\'s bound, dressed up as a feature' },
    ],
    analogyPanel: 'Clipping is a doorframe too low for the mix: every peak taller than the frame doesn\'t duck — it gets its head flattened. The flattened heads are the crunch.',
    beginnerMistake: 'Believing floats clip at 1.0 *inside* the plugin. They don\'t — which is why a trim AFTER an over-hot plugin can rescue the level, as long as nothing in between already clamped it.',
    remember: 'Stage your gain so you never touch the ceiling; clamp so a bug never gets past it.',
    builds: ['clipping', 'gain', 'decibel'],
    leads: ['headroom', 'mixing'],
  },

  /* ------------------------------------------------------ D11 */
  {
    id: 'd11', kind: 'lesson', title: 'Mixing: Addition, Honestly', short: 'The bus is a plus sign',
    concepts: ['mixing'], time: '~6 MIN', diff: 2,
    hook: 'Forty tracks collapse onto your stereo bus every time you bounce. Ever wonder what the bus actually DOES to combine them? Here\'s the anticlimax: it adds. Sample by sample, number plus number. The entire craft of mixing sits on one arithmetic operator.',
    objective: 'Know that mixing is per-sample addition, why summed peaks can crash the ceiling, and how to scale a sum so layers stay safe.',
    sections: [
      {
        h: 'Two sounds, one plus sign',
        body: 'To play a sine and a saw together: compute both samples, **add them**. Each tick, every source produces one number; the bus outputs the sum — one waveform carrying both sounds. Air does exactly this: kick and vocal in a room sum into one pressure at your eardrum. Your ear un-mixes what the plus sign combined.',
        viz: { t: 'mixsum' },
      },
      {
        h: 'The catch: peaks add too',
        body: 'A sine peaking at 0.8 plus a saw peaking at 0.8 can hit **1.6** — through d10\'s ceiling. Not always: peaks only stack fully when the waves line up in phase at the same instant. But "sometimes 1.6" is exactly the bug that ships, because it depends on what the musician plays. Worst case: N full-scale sources sum to **N**.',
        code: 'float osc1 = (float) std::sin(phase);\nfloat osc2 = sawFrom(phase2);\nfloat mix  = (osc1 + osc2) * 0.5f;   // sum, then scale the bus\nfloat s    = mix * env * gain;',
        codeTitle: 'two voices, staged safely',
        breakdown: [
          ['osc1 + osc2', 'the entire art of mixing — worst-case peak here: 2.0'],
          ['* 0.5f', 'the bus trim: two sources → half is the factor that\'s always safe'],
          ['own phase each', 'independent voices = independent bookmarks (phase, phase2)'],
          ['* env * gain', 'shape and level exactly as before — the sum slots into the chain'],
        ],
        mistake: { code: 'float mix = osc1 + osc2;   // ✗ no gain plan', text: 'The addition is fine — the missing *plan* is the bug. The moment both peaks coincide, 1.6 hits the output stage and gets flat-topped. Every sum needs a level strategy.' },
      },
      {
        h: 'Why real mixes survive',
        body: 'Divide-by-N sounds like burial — but unrelated signals rarely peak at the same instant, and the ear tracks average energy more than peaks. That statistic is why 40 tracks don\'t each need 1/40th. One sharp exception: **identical, in-phase signals double** (+6 dB) — constructive interference, arriving on the bus. Duplicate a track in your DAW and watch the meter jump exactly that.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'mixing',
        prompt: 'What operation combines two digital signals into one?',
        options: [
          { t: 'Addition, sample by sample', why: '' },
          { t: 'Multiplication, sample by sample', why: 'Multiplying signals is *modulation* territory (ring mod!) — a bus adds.' },
          { t: 'Alternating samples from each source', why: 'That would shred both signals into noise. Each tick sums *all* sources.' },
          { t: 'Averaging their sample rates', why: 'Rates describe the grid — the mix happens in the values riding it.' },
        ],
        answer: 0,
        explain: 'The bus is a plus sign, same as air pressure summing in a room. Everything else in mixing is the gain plan around it.',
      },
      {
        type: 'predict', concept: 'mixing',
        prompt: 'Both oscillators peak at ±1.0 and you sum them raw. Worst-case peak?',
        code: 'float mix = osc1 + osc2;',
        options: [
          { t: '`2.0` — when both peaks land on the same sample', why: '' },
          { t: '`1.0` — peaks can\'t stack', why: 'They can and do — whenever the waves align in phase at one instant.' },
          { t: '`0.5`', why: 'Nothing here divides — that\'s the fix you\'d *add*, not the raw sum\'s behavior.' },
          { t: 'Depends on the sample rate', why: 'The grid doesn\'t cap values — arithmetic does: 1 + 1 = 2, at any rate.' },
        ],
        answer: 0,
        explain: 'N full-scale sources can reach N. Hence the bus trim: × 0.5 for two, or musical per-voice gains with a checked worst case.',
      },
      {
        type: 'fill', concept: 'mixing',
        prompt: 'Trim the two-voice bus to a guaranteed-safe level.',
        code: 'float mix = (osc1 + osc2) * ___;',
        accept: ['0.5f', '0.5', '.5f', '.5'],
        placeholder: 'factor',
        hint: 'Two sources; make the worst case exactly 1.0.',
        explain: '2.0 worst case × 0.5 = 1.0 exactly. The 1/N rule is your guarantee; real mixes often run hotter on the statistics of peaks not aligning.',
      },
    ],
    recap: [
      'Mixing = per-sample addition. Nothing fancier.',
      'Peaks add: N full-scale sources can sum to N — plan the gain.',
      'Scale the sum (×1/N guarantees safety) or scale sources with a checked worst case.',
      'Identical in-phase signals double: +6 dB — interference on the bus.',
    ],
    inside: [
      { name: 'First Signal', use: 'polyphony (a later zone) is this addition, once per held note' },
      { name: 'Every DAW master bus', use: 'a plus sign with meters — the "summing" in summing mixer' },
    ],
    analogyPanel: 'The bus is the room itself: every instrument\'s pressure wave adds in the air, and your ear receives one summed wiggle. The bus trim is the size of the room.',
    beginnerMistake: 'Believing digital summing "degrades" audio where analog desks "glue" it. The addition is bit-exact. What desks add is their own gentle distortion and crosstalk — a flavor, not a fidelity. A plus sign has no quality knob.',
    remember: 'Mixing is addition. The skill isn\'t the plus sign — it\'s the gain plan around it.',
    builds: ['mixing', 'clipping', 'phase'],
    leads: ['stereo', 'headroom'],
  },

  /* ------------------------------------------------------ D12 */
  {
    id: 'd12', kind: 'lesson', title: 'Stereo: Two Lanes, One Image', short: 'Channels, panning, mono',
    concepts: ['stereo'], time: '~6 MIN', diff: 2,
    hook: 'Close your eyes in headphones: hat right, pad wide, vocal dead center. There is no center speaker — the image is your brain\'s trick, built from exactly two mono signals. Width, space, placement: all of it lives in how those two streams differ.',
    objective: 'See stereo as two independent sample streams, panning as a two-gain recipe, and mono compatibility as the L+R sum test.',
    sections: [
      {
        h: 'Channel 0 and channel 1',
        body: 'You met this in Zone 3 without ceremony: `getNumChannels()` returns 2, and the buffer holds **two separate sample lanes** — 0 is left, 1 is right. There\'s no "stereo sample." Identical lanes sound center-mono; *differences* create the image. First Signal\'s d6 loop writes the same `s` everywhere — honest centered mono, and exactly where panning will land.',
        viz: { t: 'stereopan' },
      },
      {
        h: 'Panning is a level recipe',
        body: 'To place a sound: send it to both lanes at **different gains**. The classy version — constant-power panning — uses a cos/sin pair so loudness doesn\'t dip as the sound sweeps through center:',
        code: 'float pan   = 0.5f;   // 0 = hard L, 0.5 = center, 1 = hard R\nfloat gainL = std::cos(pan * juce::MathConstants<float>::halfPi);\nfloat gainR = std::sin(pan * juce::MathConstants<float>::halfPi);\nbuffer.getWritePointer(0)[i] = s * gainL;\nbuffer.getWritePointer(1)[i] = s * gainR;',
        codeTitle: 'constant-power pan',
        breakdown: [
          ['cos / sin pair', 'as one gain falls the other rises — combined energy stays even'],
          ['halfPi', 'runs the curve a quarter circle: cos 1→0 while sin 0→1'],
          ['same s, two gains', 'the level DIFFERENCE is the position'],
        ],
        mistake: { code: 'L = s * pan;\nR = s * (1.0f - pan);   // ✗ linear, and inverted', text: 'Two bugs: pan = 0 puts silence LEFT (sides swapped), and linear gains dip ~3 dB at center — the classic hole in the middle. cos/sin fixes both.' },
      },
      {
        h: 'The mono button: L + R',
        body: 'Clubs, phones and many Bluetooth speakers play **left + right, summed**. Identical lanes sum fine. But if the lanes carry *opposite-polarity* versions of a sound, the mono sum cancels toward silence — destructive interference eating your mix exactly where the crowd is. Some "wideners" work precisely this way: huge in headphones, gone in mono. Now you know the tradeoff by mechanism.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'stereo',
        prompt: 'What IS a stereo signal, at the buffer level?',
        options: [
          { t: 'Two independent mono streams sharing one sample clock', why: '' },
          { t: 'One stream of special two-part samples', why: 'No such sample exists — two plain lanes, index 0 and 1, each ordinary floats.' },
          { t: 'A mono stream plus a width value', why: 'Width is an *effect* you compute — the format is simply two lanes.' },
          { t: 'Two streams at different sample rates', why: 'Same clock, same length, always — only the *contents* differ.' },
        ],
        answer: 0,
        explain: 'Channel 0, channel 1, one clock. Identical = center; different = wide; opposite = trouble in mono.',
      },
      {
        type: 'mcq', concept: 'stereo',
        prompt: 'Why cos/sin gains instead of linear pan / (1−pan)?',
        options: [
          { t: 'Linear gains dip ~3 dB at center; the cos/sin pair keeps energy constant across the sweep', why: '' },
          { t: 'cos and sin are faster', why: 'Speed isn\'t the issue — the *loudness dip* at center is.' },
          { t: 'Linear gains alias', why: 'Aliasing is about frequencies past Nyquist — pan laws are about level.' },
          { t: 'JUCE requires them', why: 'JUCE offers helpers, but the constant-power law is physics-of-hearing, not framework rules.' },
        ],
        answer: 0,
        explain: 'The "hole in the middle" is a real, audible artifact of linear pan laws — the quarter-circle pair closes it.',
      },
      {
        type: 'predict', concept: 'stereo',
        prompt: 'A widener puts opposite-polarity signal in L and R. On a mono club rig (which sums L+R), that content…',
        code: 'mono = left + right;   // left ≈ -right',
        options: [
          { t: 'cancels toward silence', why: '' },
          { t: 'gets 6 dB louder', why: 'That\'s what *identical* signals do. Opposite ones subtract.' },
          { t: 'gets wider', why: 'Mono has no width — one speaker, one lane, one sum.' },
          { t: 'plays only the left lane', why: 'Mono fold-down sums both lanes; it doesn\'t pick one.' },
        ],
        answer: 0,
        explain: 'x + (−x) = 0: destructive interference on the fold-down. Wide-in-headphones, gone-in-the-club is a *choice* — make it knowingly.',
      },
    ],
    recap: [
      'Stereo = two mono lanes (0 = L, 1 = R) on one clock.',
      'Identical lanes = center; level differences = position; opposite polarity = mono cancellation.',
      'Constant-power panning: cos/sin gains — no hole in the middle.',
      'First Signal\'s d6 channel loop is already the right home for a pan stage.',
    ],
    inside: [
      { name: 'Every pan knob', use: 'computes a two-gain recipe; "pan law" settings pick the exact curve' },
      { name: 'Mastering engineers', use: 'the mono button is the L+R sum test, hunting cancellations' },
    ],
    analogyPanel: 'Two singers reading the same line, one at each ear: unison feels center, a level difference slides it sideways, and one singing the line inverted vanishes when the room sums them.',
    beginnerMistake: 'Writing DSP that only touches channel 0, then wondering why the right side is silent or dry. The channel loop isn\'t decoration — every lane gets written, every block.',
    remember: 'Same = center. Different = wide. Opposite = gone in mono.',
    builds: ['stereo', 'audio-buffer', 'panning'],
    leads: ['mixing', 'phase'],
  },

  /* ------------------------------------------------------ D13 */
  {
    id: 'd13', kind: 'lesson', title: 'Zipper Noise: Knobs Must Glide', short: 'Smoothing, DSP edition',
    concepts: ['smoothing'], time: '~6 MIN', diff: 2,
    hook: 'Yank a cheap plugin\'s gain knob while audio plays: a crackling flutter, like grit under the knob. Producers call it zipper noise. Zone 3 handed you SmoothedValue as the cure — now you know enough DSP to see the disease itself.',
    objective: 'Connect smoothing to waveform shape: why value jumps click, why per-sample ramps fix them, and which parameters should snap instead.',
    sections: [
      {
        h: 'A jump in gain is a cliff in the wave',
        body: 'Mid-note, gain snaps from 0.2 to 0.8 between two samples: every sample after is suddenly 4× taller. Zoom in and there\'s a **vertical step** stitched into a smooth curve. d7 tells you the rest: sharp corner → burst of high harmonics → *click*. A knob swept in coarse steps is a zipper of clicks.',
        viz: { t: 'stepramp' },
      },
      {
        h: 'Spread the move across samples',
        body: 'Smoothing replaces "jump now" with "arrive over the next 20 ms": each sample nudges the value one micro-step toward the target. Level still changes — through thousands of steps too small to read as corners. The Zone 3 machinery, now with its DSP reason attached:',
        code: 'gainSmoothed.setTargetValue(target);          // per BLOCK: the destination\nfor (int i = 0; i < buffer.getNumSamples(); ++i)\n{\n    float g = gainSmoothed.getNextValue();    // per SAMPLE: one micro-step\n    float s = raw * env * g;\n    // ...\n}',
        codeTitle: 'the glide, correctly placed',
        breakdown: [
          ['setTargetValue', 'outside the loop — reading the knob once per block is plenty'],
          ['getNextValue', 'INSIDE the loop — a slightly different g every sample'],
          ['ramp length', 'set in prepareToPlay (e.g. 20 ms): long enough to kill clicks, short enough to feel instant'],
        ],
        mistake: { code: 'float g = gainSmoothed.getNextValue();  // ✗ once per block\nfor (int i = 0; i < numSamples; ++i)\n    data[i] *= g;', text: 'One step per block rebuilds the staircase with slightly smaller stairs. The ramp only kills corners if the value moves every single sample.' },
      },
      {
        h: 'Glide the continuous, snap the discrete',
        body: 'Smooth anything that scales or shifts audio continuously: gain, pan, cutoff, mix amounts. **Don\'t** smooth true switches — the waveform selector, bypass. A selector gliding between saw and square would synthesize a blurry in-between wave nobody chose. And pitch is *extra* sensitive: stepped frequency doesn\'t click, it **warbles** — though the same ramp applied on purpose is a feature you know as portamento.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'smoothing',
        prompt: 'Why does an instant gain jump click?',
        options: [
          { t: 'It draws a vertical step into the waveform — a sharp corner, i.e. a burst of high harmonics', why: '' },
          { t: 'The CPU stalls', why: 'A multiply by a new number costs the same as the old one — the artifact is in the *shape*, not the load.' },
          { t: 'It resets the phase', why: 'Phase keeps marching — it\'s the amplitude that grew a cliff.' },
          { t: 'It briefly doubles the sample rate', why: 'The grid never changes — the values riding it did, too abruptly.' },
        ],
        answer: 0,
        explain: 'One jump = one corner = one click. Zipper noise is that corner repeated every time the knob value steps.',
      },
      {
        type: 'bugspot', concept: 'smoothing',
        prompt: 'This still zippers. Tap the line that breaks the smoothing.',
        code: [
          'gainSmoothed.setTargetValue(target);',
          'float g = gainSmoothed.getNextValue();',
          'for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '{',
          '    data[i] = data[i] * g;',
          '}',
        ],
        buggy: 1,
        explain: 'getNextValue() before the loop advances the ramp once per BLOCK — a coarser staircase, not a glide. The call belongs inside the loop: one micro-step per sample.',
        fix: 'Move getNextValue() inside the sample loop',
      },
      {
        type: 'mcq', concept: 'smoothing',
        prompt: 'Which parameter should NOT be smoothed?',
        options: [
          { t: 'The waveform selector switch', why: '' },
          { t: 'Output gain', why: 'Continuous scaler — the textbook smoothing case.' },
          { t: 'Pan position', why: 'Continuous — an unsmoothed pan sweep zippers across the image.' },
          { t: 'Filter cutoff', why: 'Continuous, and famously audible when stepped — smooth it.' },
        ],
        answer: 0,
        explain: 'Gliding between saw and square would mean some in-between wave nobody chose. Switches snap; continuous scalers glide.',
      },
    ],
    recap: [
      'A parameter jump = a vertical step in the waveform = a click; repeated, it\'s zipper noise.',
      'Smoothing spreads the change across per-sample micro-steps.',
      'setTargetValue per block; getNextValue per SAMPLE, inside the loop.',
      'Glide continuous parameters; snap discrete switches. Stepped pitch warbles — or, on purpose, is portamento.',
    ],
    inside: [
      { name: 'First Signal', use: 'its Zone 3 gain smoother, now understood from the waveform side' },
      { name: 'DAW automation', use: 'hosts deliver your curves as sparse points — your smoother turns those steps into per-sample glides' },
    ],
    analogyPanel: 'An unsmoothed parameter is a lighting desk where every fader has ten hard notches — each scene change strobes. Smoothing is the motorized fader sliding through every level between.',
    beginnerMistake: 'Smoothing *everything*, then filing a bug that the waveform selector "sounds mushy between positions." The rule is not "smooth all parameters" — it\'s "smooth the continuous ones."',
    remember: 'Jumps are corners; corners are clicks. Glide what\'s continuous, snap what\'s discrete.',
    builds: ['parameter-smoothing', 'waveform', 'harmonics'],
    leads: ['zipper-noise', 'lfo'],
  },

  /* ------------------------------------------------------ D14 */
  {
    id: 'd14', kind: 'lesson', title: 'LFOs: Knobs Turned by Waves', short: 'Modulation & movement',
    concepts: ['modulation'], time: '~6 MIN', diff: 2,
    hook: 'Vibrato on a lead. A filter breathing through a techno loop. Tremolo shimmering on an amp. Nobody\'s twisting a knob five times a second — a Low-Frequency Oscillator (LFO) is doing it: a wave you never hear directly, wired to a knob. Beautiful part: you already built one.',
    objective: 'Understand modulation as one signal steering another\'s parameter — and an LFO as the d5 accumulator run slow, re-ranged, and aimed at a knob.',
    sections: [
      {
        h: 'Audio signals vs control signals',
        body: 'Everything so far produced **audio** — waves fast enough to hear. A **control signal** is the same kind of number stream used differently: it steers a parameter instead of feeding the speakers. The envelope (d9) was your first — a one-shot shape per note. An **LFO** is the looping kind: typically 0.1–20 Hz, cycling forever. Too slow to hear as a tone; perfect as a hand on a knob.',
        viz: { t: 'lfomod' },
      },
      {
        h: 'You already wrote this oscillator',
        body: 'An LFO is the d5 phase accumulator with a tiny frequency. Ask for 5 Hz instead of 440 and the same `std::sin(phase)` circles five times a second. The only new moves: **re-range** the −1..+1 output (a negative gain would flip polarity!) and scale by **depth**:',
        code: 'lfoPhase += twoPi * 5.0 / sampleRate;          // 5 Hz — d5\'s formula\nif (lfoPhase >= twoPi) lfoPhase -= twoPi;      // same wrap discipline\nfloat lfo  = (float) std::sin(lfoPhase);       // −1..+1, slowly\nfloat trem = 1.0f - depth * (0.5f + 0.5f * lfo);\nfloat s    = raw * env * trem * gain;          // tremolo, installed',
        codeTitle: 'a tremolo in four lines',
        breakdown: [
          ['5.0 / sampleRate', 'the accumulator doesn\'t know it\'s an LFO — only the increment shrank'],
          ['0.5f + 0.5f * lfo', 're-range: −1..+1 → 0..1 — gain must never swing negative'],
          ['depth', 'how far the invisible hand turns the knob: 0 = still, more = heavier tremolo'],
          ['* trem', 'modulation slots into the same multiply chain as everything else'],
        ],
        mistake: { code: 'float trem = lfo;   // ✗ raw bipolar output as gain', text: 'Half of every cycle trem is NEGATIVE — the waveform flips upside down — and at lfo = 0 the sound fully mutes. Re-range and depth-scale before it touches a gain.' },
      },
      {
        h: 'Rate, depth, destination',
        body: 'Every mod routing on every synth reduces to three choices. **Rate**: how fast it cycles (~0.1 Hz sweeps, ~5 Hz vibrato). **Depth**: how much of the parameter\'s range it covers. **Destination**: which knob — LFO→gain is *tremolo*, LFO→pitch is *vibrato*, LFO→cutoff is the classic *wobble*. Different front-panel names, identical wiring. (Tempo-synced LFOs just compute the increment from BPM instead of Hz.)',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'modulation',
        prompt: 'What separates an LFO from the audio oscillator of d6?',
        options: [
          { t: 'Only its frequency and its destination — it runs below hearing range and steers a parameter instead of filling the buffer', why: '' },
          { t: 'Different math entirely', why: 'Same accumulator, same sin — check the code: only the increment changed.' },
          { t: 'It has no phase', why: 'lfoPhase IS a phase — wrapping and all, exactly like d5.' },
          { t: 'It can only make sine waves', why: 'LFOs come in every d7 shape — a square LFO on gain is a trance gate.' },
        ],
        answer: 0,
        explain: 'Slow + aimed at a knob = control signal. The machinery is d5\'s, untouched.',
      },
      {
        type: 'fill', concept: 'modulation',
        prompt: 'Re-range the bipolar LFO into 0..1 before it modulates gain.',
        code: 'float unipolar = 0.5f + ___ * lfo;',
        accept: ['0.5f', '0.5', '.5f', '.5'],
        placeholder: 'scale',
        hint: '−1..+1 squeezed to 0..1: half amplitude, then recentered.',
        explain: '0.5 + 0.5·lfo maps −1→0 and +1→1. Skip it and half of every cycle inverts your audio\'s polarity — d7\'s noise recentering trick, run in reverse.',
      },
      {
        type: 'match', concept: 'modulation',
        prompt: 'Match each routing to its classic name.',
        left: ['LFO → gain', 'LFO → pitch', 'LFO → filter cutoff', 'envelope → gain'],
        right: ['tremolo', 'vibrato', 'the wobble', 'the note\'s ADSR shape'],
        explain: 'Same wiring, different destination, different legend. Once you read mod routings as rate/depth/destination, every synth\'s mod page is the same page.',
      },
    ],
    recap: [
      'Control signals steer parameters; you hear the effect, never the modulator.',
      'An LFO = the d5 accumulator below ~20 Hz. No new machinery.',
      'Re-range bipolar output (0.5 + 0.5·lfo) and scale by depth before it touches gain.',
      'Every routing is rate + depth + destination: tremolo, vibrato, wobble.',
    ],
    inside: [
      { name: 'First Signal', use: 'd15 installs this exact tremolo in the output stage' },
      { name: 'Every mod matrix', use: 'source / destination / amount columns — this lesson\'s three words, given a front panel' },
    ],
    analogyPanel: 'An LFO is a session robot whose only job is turning one knob back and forth, forever, in perfect time. Rate is its wrist speed, depth its twist, destination the knob you point it at.',
    beginnerMistake: 'Confusing LFOs with envelopes. Both are control signals — but an envelope is a one-shot shape per note; an LFO loops regardless of notes. Vibrato that restarts per key is an LFO with retrigger — still a loop, phase-reset at note-on.',
    remember: 'An LFO is an oscillator you hear THROUGH another sound. Rate, depth, destination.',
    builds: ['lfo', 'oscillator', 'phase'],
    leads: ['modulation', 'envelope'],
  },

  /* ------------------------------------------------------ D15 */
  {
    id: 'd15', kind: 'lesson', title: 'The Output Stage: It Sings', short: 'First Signal, assembled',
    concepts: ['dsp-voice'], time: '~7 MIN', diff: 3,
    hook: 'Zone 3 ended with a plugin that passed audio through in polite silence. Fourteen lessons later you own every block of a synth voice: oscillator, waveform family, envelope, tremolo, smoothed gain, a clamp on the door. Time to bolt them together in the one correct order.',
    objective: 'Read First Signal\'s complete voice — oscillator → envelope → LFO → smoothed gain → clamp — and know why the order matters.',
    sections: [
      {
        h: 'The chain has an order',
        body: 'Chains order stages for the same reason pedalboards do. The oscillator makes the tone; the envelope shapes the note; the LFO adds motion; the smoothed gain sets level; the clamp guards the exit. Swap carelessly and it breaks: a clamp mid-chain guards nothing, and math placed after the buffer write never reaches the listener at all. The multiplies commute with each other — the guard and the write do not.',
        viz: { t: 'chain', nodes: ['OSC', 'ENV', 'LFO', 'GAIN', 'CLAMP'], accent: 4, caption: 'tone → shape → motion → level → safety. every block is a lesson you\'ve done' },
      },
      {
        h: 'The whole loop, annotated',
        body: 'The heart of First Signal v3 — every line traceable to a lesson:',
        code: 'gainSmoothed.setTargetValue(\n    juce::Decibels::decibelsToGain(gainDb));      // d4: ears speak dB\n\nfor (int i = 0; i < buffer.getNumSamples(); ++i)\n{\n    float raw  = oscSample(waveform, phase);      // d6, d7\n    float env  = adsr.getNextSample();            // d9\n    lfoPhase  += lfoIncrement;                    // d14 (d5 math)\n    if (lfoPhase >= juce::MathConstants<double>::twoPi)\n        lfoPhase -= juce::MathConstants<double>::twoPi;\n    float trem = 1.0f - depth\n               * (0.5f + 0.5f * (float) std::sin(lfoPhase));\n    float g    = gainSmoothed.getNextValue();     // d13\n    float s    = raw * env * trem * g;            // the voice\n    s = juce::jlimit(-1.0f, 1.0f, s);             // d10 — LAST\n\n    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n        buffer.getWritePointer(ch)[i] = s;        // d12\n\n    phase += phaseIncrement;                      // d5\n    if (phase >= juce::MathConstants<double>::twoPi)\n        phase -= juce::MathConstants<double>::twoPi;\n}',
        codeTitle: 'First Signal v3 — the sounding synth',
        breakdown: [
          ['raw * env * trem * g', 'tone × shape × motion × level — four multiplies, four lessons'],
          ['jlimit LAST', 'math after a clamp is unguarded — the seatbelt goes on at the door'],
          ['per-block vs per-sample', 'knob read + dB convert once per block; env/LFO/glide micro-steps every sample'],
          ['channel loop inside', 'one mono voice to every lane: centered — and where a pan stage would slot'],
        ],
        mistake: { code: 's = juce::jlimit(-1.0f, 1.0f, raw);   // ✗ clamps the raw osc\nfloat out = s * env * trem * g;        //    …then multiplies, unguarded', text: 'The raw oscillator already lives in ±1 — clamping it does nothing, and the multiply chain runs AFTER the guard. Clamp the finished sample, always last.' },
      },
      {
        h: 'What it still can\'t do — on purpose',
        body: 'One phase accumulator = one note at a time; **polyphony** is one voice per note, summed like d11 — a later zone. The naive saw and square **alias** up high (d8); band-limited oscillators and oversampling headline Zone 5. No filter yet, envelope times fixed. Every gap is a designed next step on exactly this chain — and when you test, play HIGH notes and *hear* the d8 fizz you can now name.',
      },
    ],
    checks: [
      {
        type: 'order', concept: 'dsp-voice',
        prompt: 'Arrange one sample\'s journey through the voice, top to bottom.',
        lines: [
          'float raw  = oscSample(waveform, phase);',
          'float env  = adsr.getNextSample();',
          'float s    = raw * env * gainSmoothed.getNextValue();',
          's = juce::jlimit(-1.0f, 1.0f, s);',
          'buffer.getWritePointer(ch)[i] = s;',
        ],
        explain: 'Generate → shape → level → clamp → write. The multiplies could reorder among themselves, but the clamp must follow ALL the math, and the write comes last of all.',
      },
      {
        type: 'mcq', concept: 'dsp-voice',
        prompt: 'Why must jlimit be the LAST math before the buffer write?',
        options: [
          { t: 'Anything computed after the clamp could push past ±1.0 again, unguarded', why: '' },
          { t: 'It\'s the slowest call', why: 'jlimit is two comparisons — placement is about *safety*, not speed.' },
          { t: 'JUCE requires that order', why: 'The compiler accepts any order — only one order actually protects the output.' },
          { t: 'It resets the phase', why: 'Phase business belongs to the accumulator lines — the clamp only pins levels.' },
        ],
        answer: 0,
        explain: 'A guard guards what comes before it. Multiplies after the clamp reopen the ceiling — seatbelt on last, always.',
      },
      {
        type: 'mcq', concept: 'dsp-voice',
        prompt: 'Why does First Signal play only one note at a time?',
        options: [
          { t: 'One phase accumulator = one pitch bookmark — chords need one voice per note, summed', why: '' },
          { t: 'JUCE plugins are mono by default', why: 'Channels aren\'t voices — our stereo buffer happily carries one note to both lanes.' },
          { t: 'The buffer is too small for chords', why: 'A buffer holds *summed* sound of any complexity — the limit is upstream, in the single voice.' },
          { t: 'MIDI can only carry one note', why: 'MIDI carries dozens simultaneously — it\'s our single accumulator that can\'t.' },
        ],
        answer: 0,
        explain: 'Polyphony = N independent voices (own phase, own envelope) added per-sample, d11-style. That summing job is a later zone\'s opening act.',
      },
    ],
    recap: [
      'First Signal v3: oscillator → envelope → LFO → smoothed gain → clamp → every channel.',
      'The voice is four multiplies: raw × env × trem × g — each one a lesson.',
      'Clamp last: math after the guard is unguarded.',
      'Work that holds steady across a block goes outside the loop; per-sample work inside.',
      'Mono, naive shapes, no filter: the roadmap, not bugs.',
    ],
    inside: [
      { name: 'First Signal', use: 'v3 complete — the boss asks you to repair exactly this chain' },
      { name: 'Commercial synths', use: 'strip the GUI and the innermost voice loop reads like this one — plus filters, ×16 voices' },
    ],
    analogyPanel: 'The finished chain is a one-musician studio: oscillator the performer, envelope their touch, LFO their vibrato hand, gain the engineer riding the fader, clamp the protection limiter on the master. Fifteen lessons ago the room was empty.',
    beginnerMistake: 'Rearranging the multiply chain to "fix" a level problem — moving gain before the envelope, clamping mid-chain — instead of fixing the stage that\'s wrong. Multiplication commutes; *design* doesn\'t.',
    remember: 'Tone × shape × motion × level, clamp at the door. First Signal sings — and every block is yours.',
    builds: ['oscillator', 'envelope', 'lfo'],
    leads: ['aliasing', 'oversampling'],
  }
);
