/* ============================================================
   ZONE 5 — lessons n9–n15 (appended to ZONE5_LESSONS).
   Voice lifecycle, sustain pedal, pitch bend, performance
   controls, the mod matrix, unison, and the playable synth.
   ============================================================ */

ZONE5_LESSONS.push(

  /* ------------------------------------------------------ N9 */
  {
    id: 'n9', kind: 'lesson', title: 'Release Isn\'t Dead Yet', short: 'The voice lifecycle',
    concepts: ['allocation'], time: '~6 MIN', diff: 2,
    hook: 'Lift a key on a pad patch with a 4-second release. The note keeps singing — beautifully, on purpose — for four more seconds. Question: during those seconds, is that voice free? Answer wrong and you get either stolen tails or a synth that runs out of voices while half its pool sits “busy” doing almost nothing.',
    objective: 'Track the full voice lifecycle — idle → attack → decay → sustain → release → idle — and know exactly when a voice returns to the pool.',
    sections: [
      {
        h: 'The life of a voice',
        body: 'Every note your synth plays moves through a handful of states, and each transition has an owner: **note-on** starts attack; the envelope itself walks attack → decay → sustain; **note-off** starts release; and the envelope *finishing* release is what makes the voice idle again. Two different events end a note: the player ends the *key*, the envelope ends the *sound*.',
        viz: { t: 'voicelife', caption: 'two hands on the wheel: the player drives note-on and note-off; the envelope drives everything between and after' },
      },
      {
        h: 'Busy until the tail ends',
        body: 'During release the voice still renders — that IS the tail you hear. So it\'s not free: its phase advances, its envelope fades, its samples land on the bus. `adsr.isActive()` stays true through release and flips false only when the fade completes. That flip is the pool\'s recycling moment:',
        code: '// in the render loop, after getting the envelope value:\nif (! v.adsr.isActive())     // release just finished\n    v.note = -1;             // recycle: back to the pool\n',
        codeTitle: 'the recycling moment',
        breakdown: [
          ['isActive()', 'true from noteOn until the release fade completes — the whole audible life'],
          ['the flip', 'the envelope, not the player, declares death — note-off only *started* the ending'],
          ['v.note = -1', 'n5\'s free tag restored — allocation can hire this card again'],
        ],
        mistake: { code: 'void stopNote(int note)\n{\n    for (auto& v : voices)\n        if (v.note == note)\n        {\n            v.adsr.noteOff();\n            v.note = -1;      // ✗ freed while still singing\n        }\n}', text: 'Freeing at note-off orphans the tail: the voice still renders its release, but allocation now sees a “free” card and hands it a new note mid-fade — the tail is randomly assassinated. Free when the ENVELOPE finishes, never at note-off.' },
      },
      {
        h: 'Why releasing voices are prime steal targets',
        body: 'Now n8\'s ladder fully makes sense: a releasing voice is *audibly leaving* — stealing it merely shortens a goodbye. And notice the resource math: with long releases, a fast passage can have MORE releasing voices than held ones. That\'s why real polyphony counts sound, not fingers — eight voices means eight *tails and notes combined*.',
        analogy: 'A voice in release is a guest with their coat on, saying goodbye at the door. They\'re still IN the room (still rendering), but when a new guest knocks, everyone knows whose spot to take — and nobody\'s offended.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'allocation',
        prompt: 'When does a voice actually return to the free pool?',
        options: [
          { t: 'When its envelope finishes the release fade — isActive() flips false', why: '' },
          { t: 'At note-off', why: 'Note-off only STARTS release — the tail is still rendering. Freeing here orphans it (and gets it assassinated).' },
          { t: 'When a new note needs it', why: 'That\'s stealing — the exception path. The normal return is the envelope completing its fade.' },
          { t: 'At the end of each block', why: 'Block edges are invisible to notes — a release can span hundreds of blocks.' },
        ],
        answer: 0,
        explain: 'The player ends the key; the envelope ends the sound. The pool listens to the envelope.',
      },
      {
        type: 'predict', concept: 'allocation',
        prompt: 'A pad has a 4-second release. The player rapidly plays 8 short notes, lifting each key immediately. Two seconds later, how does the pool look?',
        code: '// 8 voices, all notes released quickly, release = 4 s',
        options: [
          { t: 'All 8 voices busy — every one is mid-release, still rendering its tail', why: '' },
          { t: 'All 8 free — the keys are up', why: 'Keys up ≠ sound done: each tail has 2 more seconds to sing, and each occupies its voice the whole time.' },
          { t: '4 busy, 4 free', why: 'Nothing halves — all 8 releases started within the burst and all are still fading.' },
          { t: 'The synth crashed', why: 'Perfectly healthy — just fully booked. The 9th note would invoke n8\'s ladder (and find 8 lovely releasing victims).' },
        ],
        answer: 0,
        explain: 'Long releases book the pool with tails. This is why pad patches steal constantly and why the ladder prefers releasing voices — the pool is often FULL of goodbyes.',
      },
      {
        type: 'bugspot', concept: 'allocation',
        prompt: 'Tails randomly cut off mid-fade on this synth. Tap the premature paperwork.',
        code: [
          'void stopNote(int note)',
          '{',
          '    for (auto& v : voices)',
          '        if (v.note == note && v.adsr.isActive())',
          '        {',
          '            v.adsr.noteOff();',
          '            v.note = -1;',
          '        }',
          '}',
        ],
        buggy: 6,
        explain: 'v.note = -1 at note-off marks a still-singing voice as free — the next note-on hijacks it mid-tail. Release the envelope here; free the voice later, in the render loop, when isActive() flips false.',
        fix: 'Remove the line — recycle in the render loop when !v.adsr.isActive()',
      },
    ],
    recap: [
      'Lifecycle: idle → attack → decay → sustain → release → idle.',
      'Note-off starts release; the ENVELOPE finishing is what frees the voice.',
      'isActive() spans the whole audible life, tail included.',
      'Long releases fill pools with tails — polyphony counts sound, not fingers.',
    ],
    inside: [
      { name: 'First Signal', use: 'p13\'s render loop recycles voices at the isActive() flip' },
      { name: 'juce::SynthesiserVoice', use: 'clearCurrentNote() is its “I\'m done” call — same flip, stock name' },
    ],
    analogyPanel: 'A note is a firework: the button press launches it (note-on), letting go ends nothing — the shell keeps flying (sustain), bursts, and only when the last spark fades (release complete) is the sky free for the next one.',
    beginnerMistake: 'Testing with organ-style patches (release ≈ 0) where note-off and voice-free happen at nearly the same instant — hiding lifecycle bugs completely. Test with a LONG release: that\'s where orphaned tails and premature frees become audible.',
    remember: 'Two endings per note: the key\'s (note-off) and the sound\'s (envelope done). The pool only cares about the second.',
    builds: ['release', 'envelope', 'voice'],
    leads: ['sustain-pedal', 'voice-stealing'],
  },

  /* ------------------------------------------------------ N10 */
  {
    id: 'n10', kind: 'lesson', title: 'The Sustain Pedal: CC 64', short: 'Deferred goodbyes',
    concepts: ['performance'], time: '~6 MIN', diff: 2,
    hook: 'Foot down, and every note you play hangs in the air after your fingers leave — chords stack into a wash. Foot up, and the whole cloud releases at once. Pianists don\'t think about this; your synth has to. The pedal doesn\'t make notes longer — it makes note-offs *wait*.',
    objective: 'Understand Continuous Controllers (CC), and implement sustain-pedal logic: defer note-offs while down, release the deferred on pedal-up.',
    sections: [
      {
        h: 'Meet the Continuous Controllers',
        body: 'Your keyboard sends more than notes. Every knob, slider, and pedal on it speaks in **Continuous Controller (CC)** messages: a controller number (which knob/pedal/slider, 0–127) and a value (0–127). CC 1 is the mod wheel (n12), CC 7 volume, CC 64 the **sustain pedal**. The pedal is a switch wearing a controller costume: by convention, value **64 and above means down**, below 64 means up.',
        code: 'else if (msg.isController())\n{\n    if (msg.getControllerNumber() == 64)              // sustain pedal\n        setPedal(msg.getControllerValue() >= 64);     // ≥64 = down\n}',
        codeTitle: 'the inbox grows an ear for feet',
        breakdown: [
          ['isController()', 'the CC family test — one branch for every knob and pedal'],
          ['getControllerNumber()', 'WHICH controller: 64 is sustain, by 40-year-old agreement'],
          ['>= 64', 'the half-way convention turns a continuous value into a switch'],
        ],
      },
      {
        h: 'The pedal defers goodbyes',
        body: 'The logic is bookkeeping, not sound: while the pedal is down, a note-off doesn\'t release its voice — it *marks* it “held by pedal.” When the pedal lifts, every marked voice finally gets its noteOff(). The voice\'s n9 lifecycle is untouched; the pedal just delays one transition.',
        viz: { t: 'pedalviz', caption: 'foot down: note-offs queue up as “sustained” marks — foot up: every mark converts to a real release, at once' },
        code: 'void stopNote(int note)\n{\n    for (auto& v : voices)\n        if (v.note == note && v.adsr.isActive())\n        {\n            if (pedalDown) v.sustained = true;   // goodbye, deferred\n            else           v.adsr.noteOff();     // goodbye, now\n        }\n}\n\nvoid setPedal(bool down)\n{\n    pedalDown = down;\n    if (! down)                                   // pedal lifted:\n        for (auto& v : voices)\n            if (v.sustained)\n            {\n                v.sustained = false;\n                v.adsr.noteOff();                 // the deferred goodbyes fire\n            }\n}',
        codeTitle: 'deferred release, both halves',
        breakdown: [
          ['v.sustained = true', 'the mark: key is up, but the pedal vouches for this voice'],
          ['pedal-up loop', 'the wash releasing all at once — every mark converts to a real noteOff'],
          ['sustained = false first', 'clear the mark as you fire — a voice must never stay marked into its next life'],
        ],
      },
      {
        h: 'Where sustain bugs come from',
        body: 'Every stuck-note story in this territory is one of three misses: the pedal-up loop never runs (notes hang forever), the ≥64 test is inverted (pedal works backwards), or a stolen/reused voice keeps its old `sustained` mark (a NEW note mysteriously refuses to release later). The fix for the third: clear `sustained` in startNote — allocation paperwork, again.',
        warn: 'Also real: a note pressed *while* the pedal is down, then released — it defers like any other. And a note that\'s re-pressed while sustained should clear its mark and retrigger. Pedal logic is small but it multiplies against every other note path; treat it with release-review care.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'performance',
        prompt: 'What does the sustain pedal actually do to note-offs, mechanically?',
        options: [
          { t: 'While down, note-offs mark voices “sustained” instead of releasing; pedal-up fires all the deferred releases', why: '' },
          { t: 'It lengthens the release time', why: 'The envelope\'s R knob never moves — the pedal delays WHEN release starts, not how long it takes.' },
          { t: 'It holds the keys down electronically', why: 'The keys (and their note-offs) behave normally — the *synth* chooses to postpone acting on them.' },
          { t: 'It boosts sustain level', why: 'Different “sustain”: the S in ADSR is a level; CC 64 is a hold pedal. Sharing the word is MIDI\'s little joke on all of us.' },
        ],
        answer: 0,
        explain: 'The pedal is pure bookkeeping: goodbyes get queued, then fired together at pedal-up. The envelope itself never changes.',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'Decode the pedal switch from its CC value.',
        code: 'if (msg.getControllerNumber() == 64)\n    setPedal(msg.getControllerValue() >= ___);',
        accept: ['64'],
        placeholder: 'threshold',
        hint: 'Half of the 0–127 range, by convention.',
        explain: '≥64 = down, <64 = up — the standard MIDI convention for switch-style CCs. (Half-pedaling exists on fancy pianos, but the switch reading is the universal baseline.)',
      },
      {
        type: 'predict', concept: 'performance',
        prompt: 'Pedal goes down. You play C4 and release the key. Then the pedal lifts. What does C4\'s voice experience?',
        code: 'pedal down → C4 on → C4 key up → pedal up',
        options: [
          { t: 'noteOn at press; “sustained” mark at key-up; real noteOff (release begins) only at pedal-up', why: '' },
          { t: 'It releases at key-up as normal', why: 'The pedal was down — stopNote takes the defer branch and only MARKS the voice.' },
          { t: 'It never releases', why: 'Pedal-up runs the deferred-release loop: every marked voice gets its noteOff then. Never-releasing is the BUG version.' },
          { t: 'It releases twice', why: 'Once, at pedal-up. The key-up produced a mark, not a release — that\'s the whole deferral.' },
        ],
        answer: 0,
        explain: 'Press → mark → deferred release: the pianist\'s wash, implemented as three lines of bookkeeping around n9\'s lifecycle.',
      },
    ],
    recap: [
      'CC messages = controller number + value; CC 64 is sustain, ≥64 means down.',
      'Pedal down: note-offs mark voices sustained instead of releasing.',
      'Pedal up: every marked voice fires its deferred noteOff at once.',
      'Clear the sustained mark in startNote — stale marks are stuck notes waiting.',
    ],
    inside: [
      { name: 'First Signal', use: 'p14 wires the pedal — then the boss puts the whole rig through a release-review load test' },
      { name: 'Every piano plugin', use: 'plus resonance modeling — but the deferral logic underneath is exactly this' },
    ],
    analogyPanel: 'The pedal is a bartender holding the tab open: every “I\'m leaving” (note-off) goes on the tab instead of being settled. Foot up = last call — every open tab settles in the same instant. And a new customer must never inherit someone\'s old tab.',
    beginnerMistake: 'Implementing pedal-down (easy, notes hang — sounds right!) and forgetting pedal-up\'s release loop. The synth demos fine for ten seconds, then drowns in a hundred-voice wash. Both halves or neither.',
    remember: 'The pedal defers goodbyes. Down = mark instead of release; up = fire every mark.',
    builds: ['cc', 'sustain-pedal', 'release'],
    leads: ['pitch-bend', 'panic'],
  },

  /* ------------------------------------------------------ N11 */
  {
    id: 'n11', kind: 'lesson', title: 'Pitch Bend: The Sliding Wheel', short: '14 bits, ±2 semitones',
    concepts: ['performance'], time: '~6 MIN', diff: 2,
    hook: 'Push the left wheel up and your lead cries; let go and it snaps home. Guitarists bend strings, singers scoop — the wheel is keyboard players\' claim to the same expression. Under your thumb: a spring, a sensor, and the highest-resolution message in classic MIDI.',
    objective: 'Decode the 14-bit pitch-bend message, convert it through a semitone range to a frequency ratio, and apply it to every sounding voice.',
    sections: [
      {
        h: 'Why 14 bits',
        body: 'Notes are steps; bends are *glides*. A 0–127 bend would zipper audibly (d13\'s staircase, in pitch — the ear\'s most sensitive dimension). So pitch bend gets two bytes glued together: **0 to 16,383**, with **8,192 as center** (wheel at rest). Up from center bends up; down bends down; the spring always returns you to 8,192.',
        viz: { t: 'bendwheel', mode: 'bend', caption: 'the wheel is a spring-loaded 14-bit number: 0 · 8192 (home) · 16383' },
      },
      {
        h: 'From wheel to ratio',
        body: 'Three conversions, each one you already own: center the raw value (−1..+1), scale by the **bend range** in semitones (±2 is the universal default — synth and controller must agree), then d3\'s law turns semitones into a frequency **ratio**. The ratio multiplies each voice\'s increment at render time — the base increment stays untouched, so releasing the wheel lands you *exactly* back in tune.',
        code: 'else if (msg.isPitchWheel())\n{\n    int raw = msg.getPitchWheelValue();               // 0..16383\n    float centered  = (raw - 8192) / 8192.0f;         // −1..+1\n    float semitones = centered * 2.0f;                // ±2 st range\n    bendRatio = std::pow(2.0f, semitones / 12.0f);    // d3\'s law\n}\n// render: v.phase += v.increment * bendRatio;        // every voice bends',
        codeTitle: 'wheel → semitones → ratio',
        breakdown: [
          ['(raw - 8192) / 8192', 'center then normalize: rest = 0.0, full down = −1.0, full up ≈ +1.0'],
          ['* 2.0f', 'the bend RANGE — a whole tone each way; change this and the wheel\'s reach changes'],
          ['pow(2, st/12)', 'semitones→ratio, the d3 formula — pitch is a ratio world, bends included'],
          ['multiply at render', 'base increments stay pure: wheel home ⇒ ratio 1.0 ⇒ perfectly in tune'],
        ],
        mistake: { code: 'v.increment *= bendRatio;   // ✗ every wheel message compounds', text: 'Multiplying the STORED increment applies the bend again on every message — wiggle the wheel and pitch drifts off into the weeds, never returning home. Bend is a live multiplier at render time, never an edit to the base.' },
      },
      {
        h: 'One wheel, every voice',
        body: 'Pitch bend is a **channel** message: it bends every sounding note on the channel together — the whole chord slides as one, like a guitarist bending a barre. That\'s why `bendRatio` lives on the *synth*, not the voice, and every voice multiplies by it. (Per-note bends exist in MIDI Polyphonic Expression (MPE) — the modern per-finger standard — but classic bend is all-or-everyone.)',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'performance',
        prompt: 'The wheel sits at rest. What raw value arrives, and what must the resulting ratio be?',
        code: 'int raw = msg.getPitchWheelValue();   // wheel at rest → ?',
        options: [
          { t: '8192 → ratio 1.0 — center means “multiply by exactly nothing extra”', why: '' },
          { t: '0 → ratio 1.0', why: 'Raw 0 is the wheel pinned fully DOWN — center of a 14-bit range is 8192.' },
          { t: '8192 → ratio 0.0', why: 'A ratio of 0 would set every increment to zero — pitch death. Center must be the do-nothing multiplier: 1.0.' },
          { t: '16383 → ratio 2.0', why: '16383 is fully UP; and with a ±2 st range it\'s ~1.122, not 2.0 (that would be a whole octave).' },
        ],
        answer: 0,
        explain: '8192 centers to 0 semitones, and 2^(0/12) = 1.0. The wheel\'s home position must be mathematically invisible — that\'s what “in tune” means.',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'Complete the semitones-to-ratio conversion.',
        code: 'bendRatio = std::pow(2.0f, semitones / ___);',
        accept: ['12.0f', '12', '12.0', '12.f'],
        placeholder: 'divisor',
        hint: 'Semitones per octave — d3\'s constant.',
        explain: '2^(st/12): the same law that maps MIDI notes to Hz maps bend amounts to ratios. Pitch is a ratio world; the wheel just feeds the exponent continuously.',
      },
      {
        type: 'mcq', concept: 'performance',
        prompt: 'Why is bendRatio applied at render (increment × ratio) instead of written into each voice\'s stored increment?',
        options: [
          { t: 'The stored increment stays pure, so wheel-home means exactly in tune — and repeated messages can\'t compound', why: '' },
          { t: 'Multiplying at render is faster', why: 'Cost is a wash — CORRECTNESS is the point: an edited base has no clean way back to “in tune.”' },
          { t: 'Voices can\'t modify their increment', why: 'They can (note-on does). The choice is architectural: base state vs live modifier.' },
          { t: 'JUCE forbids modifying increments', why: 'JUCE has no opinion — the compounding-drift bug is what forbids it.' },
        ],
        answer: 0,
        explain: 'Base value + live multiplier is the modulation pattern from d14, again: the modulator never edits the target\'s stored state, it rides on top.',
      },
    ],
    recap: [
      'Pitch bend is 14-bit: 0–16383, center 8192 = wheel at rest.',
      'Convert: center → normalize → × range (±2 st default) → 2^(st/12) ratio.',
      'Apply at render: increment × bendRatio. Never edit the stored base.',
      'Classic bend is per-channel — every voice slides together (per-note = MPE).',
    ],
    inside: [
      { name: 'First Signal', use: 'p14 installs the wheel — one more real-time path the release review must certify' },
      { name: 'MPE controllers', use: 'per-finger bend — the same math, one bendRatio per note instead of per channel' },
    ],
    analogyPanel: 'The bend wheel is a whammy bar for the whole keyboard: one spring-loaded lever that detunes everything sounding, then physically snaps back to zero. The snap-home IS the ratio returning to exactly 1.0.',
    beginnerMistake: 'Forgetting the synth and controller must AGREE on bend range. Synth set to ±12 with a controller assuming ±2 turns a subtle vibrato gesture into a six-semitone lurch — the classic “my bends are huge” support ticket.',
    remember: 'Wheel → semitones → ratio → multiply at render. Home is 8192, and home must mean ratio 1.0.',
    builds: ['pitch-bend', 'frequency', 'phase'],
    leads: ['mod-wheel', 'aftertouch'],
  },

  /* ------------------------------------------------------ N12 */
  {
    id: 'n12', kind: 'lesson', title: 'The Mod Wheel & Friends', short: 'Performance controls',
    concepts: ['performance'], time: '~6 MIN', diff: 2,
    hook: 'Right wheel up: the lead starts to shimmer with vibrato. Press harder into the key: it swells. Tap a patch-change button mid-set: new sound, same hands. None of these are notes — they\'re the player steering the *synth* while it plays. Your inbox already speaks their language.',
    objective: 'Wire the mod wheel (CC 1) into d14\'s LFO depth, and meet aftertouch and program change.',
    sections: [
      {
        h: 'The mod wheel: a depth knob for your thumb',
        body: 'The **mod wheel** is CC 1 — no spring, it stays where you leave it. By tradition it controls **vibrato depth**: wheel down = clean, wheel up = expressive wobble. You built the entire machine in d14 — LFO, re-range, depth, destination. The wheel simply *becomes* the depth:',
        viz: { t: 'bendwheel', mode: 'mod', caption: 'no spring, no center — 0..127 straight into a mod DEPTH. the wheel is a routing amount with a handle' },
        code: 'else if (msg.isController())\n{\n    if (msg.getControllerNumber() == 1)              // mod wheel\n        vibratoDepth = msg.getControllerValue() / 127.0f;\n}\n// render, per voice — d14\'s vibrato with the wheel as depth:\n// pitchMod = 1.0f + vibratoDepth * 0.03f * (float) std::sin(lfoPhase);\n// v.phase += v.increment * bendRatio * pitchMod;',
        codeTitle: 'CC 1 → LFO depth',
        breakdown: [
          ['/ 127.0f', 'normalize to 0..1 — the same reflex as getFloatVelocity'],
          ['vibratoDepth', 'd14\'s “amount” knob — now the player\'s thumb owns it'],
          ['* 0.03f', 'scale to a musical width (~half a semitone) — full wheel ≠ seasick'],
          ['stacks with bendRatio', 'bend × vibrato: two live multipliers riding one pure base increment (n11\'s pattern)'],
        ],
      },
      {
        h: 'Aftertouch: pressing INTO the key',
        body: '**Aftertouch** is pressure applied after the key bottoms out — lean into a held note and the synth responds (swell, brightness, vibrato). Two flavors: **channel pressure** (one value for the whole keyboard — `isChannelPressure()`, the common one) and **polyphonic aftertouch** (per-key pressure — `isAftertouch()`, rare and glorious). Route it like any control signal: another depth, another destination.',
      },
      {
        h: 'Program change: the patch switcher',
        body: '**Program change** is the smallest channel message — a single data byte meaning “switch to preset N” — how players flip sounds from the controller without touching the screen. Your Zone 3 state system is the machinery it drives: program change N ↦ load preset N. One message type, and suddenly set-lists work.',
        warn: 'All these controls are *channel-wide* state (like n11\'s bend), stored on the synth and read by voices at render. The pattern never changes: message → normalized value → stored → live multiplier somewhere in the voice math. Learn it once, wire anything.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'performance',
        prompt: 'The mod wheel traditionally controls…',
        options: [
          { t: 'Vibrato depth — how much the pitch LFO is allowed to move things', why: '' },
          { t: 'Pitch directly, like the bend wheel', why: 'That\'s the OTHER wheel — the sprung one. The mod wheel stays put and scales a modulation.' },
          { t: 'Master volume', why: 'Volume is CC 7. CC 1 is modulation — the clue is in the name.' },
          { t: 'Waveform selection', why: 'Selectors snap (d13); the wheel is continuous. Tradition wires it to a continuous thing: depth.' },
        ],
        answer: 0,
        explain: 'CC 1 → vibrato depth is the 40-year default. It\'s d14\'s depth knob with a thumb-sized handle — and being tradition, players EXPECT it.',
      },
      {
        type: 'mcq', concept: 'performance',
        prompt: 'What separates channel pressure from polyphonic aftertouch?',
        options: [
          { t: 'Channel pressure is one value for all keys; poly aftertouch reports each key\'s pressure separately', why: '' },
          { t: 'Channel pressure is velocity-sensitive', why: 'Velocity is the strike (n2); aftertouch is pressure AFTER the key lands — different moment, different message.' },
          { t: 'Poly aftertouch only works on channel 10', why: 'Channel 10 is a drum convention, unrelated — poly AT works anywhere the hardware supports it.' },
          { t: 'They\'re two names for one message', why: 'Two distinct message types (isChannelPressure vs isAftertouch in JUCE) — one shared value vs per-key values.' },
        ],
        answer: 0,
        explain: 'One squeeze for the whole keyboard vs a squeeze per finger. Channel pressure is common; per-key is the luxury option (and MPE\'s ancestor).',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'Normalize the mod wheel into a 0..1 depth.',
        code: 'if (msg.getControllerNumber() == 1)\n    vibratoDepth = msg.getControllerValue() / ___;',
        accept: ['127.0f', '127.f', '127.0'],
        placeholder: 'divisor',
        hint: 'The top of the CC value range, as a float.',
        mistakes: [
          { match: '^127$', msg: 'Integer division: value/127 is 0 for every value below 127 — the wheel would do nothing until fully up, then snap. Zone 1\'s truncation trap rides again: 127.0f.' },
        ],
        explain: 'value / 127.0f → 0..1. The int-division version is a genuinely classic bug: a mod wheel that only works at maximum.',
      },
    ],
    recap: [
      'Mod wheel = CC 1, no spring: traditionally vibrato depth (d14\'s amount knob).',
      'Aftertouch = pressure after the strike: channel-wide or per-key (poly).',
      'Program change = “load preset N” — Zone 3\'s state system, player-driven.',
      'The universal pattern: message → normalize → store → live multiplier at render.',
    ],
    inside: [
      { name: 'First Signal', use: 'p14 gives the player\'s thumb the vibrato depth' },
      { name: 'Stage keyboards', use: 'program change is how set-lists flip sounds between songs, hands-free' },
    ],
    analogyPanel: 'Performance controls are the difference between a player piano and a pianist: same notes, but a human leans, presses, and steers WHILE the notes sound. These messages are the leaning, digitized.',
    beginnerMistake: 'Wiring the mod wheel to maximum-depth vibrato because it demos dramatically. Players ride the wheel constantly and expect SUBTLE at low values — scale the range so full wheel is expressive, not carnival.',
    remember: 'Bend is the sprung wheel, mod is the one that stays. Both are just live multipliers a musician steers.',
    builds: ['mod-wheel', 'aftertouch', 'cc'],
    leads: ['mod-matrix', 'program-change'],
  },

  /* ------------------------------------------------------ N13 */
  {
    id: 'n13', kind: 'lesson', title: 'The Modulation Matrix', short: 'Routing as data',
    concepts: ['performance'], time: '~7 MIN', diff: 3,
    hook: 'Open the mod page of any serious synth: a grid of rows, each saying “THIS moves THAT, this much.” LFO → pitch, envelope → cutoff, velocity → brightness, wheel → depth. You\'ve hand-wired four of these already, one if-statement at a time. The matrix is what happens when you stop hand-wiring and make routing *data*.',
    objective: 'Generalize sources → destinations × amount into a routing table — and meet keyboard tracking, the mod source hiding inside the note number itself.',
    sections: [
      {
        h: 'Three columns, everything',
        body: 'Every routing you\'ve built is the d14 sentence: **source** (LFO, envelope, velocity, wheel…), **destination** (pitch, gain, cutoff…), **amount** (how much). A **modulation matrix** stores these sentences as rows in a table, and one loop applies them all. Adding a routing stops being “write new code” and becomes “add a row” — the same data-driven turn this app took with lessons.',
        viz: { t: 'modmatrix', rows: [['LFO 1', 'PITCH', 0.3], ['MOD WHEEL', 'LFO DEPTH', 1.0], ['VELOCITY', 'GAIN', 0.8], ['KEY TRACK', 'BRIGHTNESS', 0.5]], caption: 'each row is one sentence: source moves destination, this much' },
        code: 'struct ModRoute { Source src; Dest dst; float amount; };\nstd::array<ModRoute, 8> matrix;   // fixed rows — the n5 pool rule again\n\nfloat modValueFor(Dest d, const Voice& v)\n{\n    float total = 0.0f;\n    for (const auto& r : matrix)\n        if (r.dst == d)\n            total += sourceValue(r.src, v) * r.amount;\n    return total;   // summed, like the d11 bus — control signals mix too\n}',
        codeTitle: 'routing as a table',
        breakdown: [
          ['ModRoute', 'one sentence as a struct: who, whom, how much'],
          ['fixed std::array', 'no allocation on the audio thread — even routing obeys Zone 2'],
          ['r.dst == d', '“all rows aimed at pitch, report in” — the destination collects its movers'],
          ['total +=', 'multiple sources on one destination ADD — a control-signal mix bus'],
        ],
      },
      {
        h: 'Keyboard tracking: the note number as a source',
        body: '**Keyboard tracking** feeds the *note number itself* into the matrix: higher keys → higher value. Why: real instruments change character across their range (a piano\'s top is brighter and shorter than its bass), and filters need it badly — a cutoff that flatters C2 strangles C6. Normalize the key position and route it like anything else:',
        code: 'float keyTrack(const Voice& v)\n{\n    return (v.note - 60) / 32.0f;   // middle C = 0, ±1 ≈ edges of a 61-key bed\n}\n// row: { Source::keyTrack, Dest::brightness, 0.5f }',
        codeTitle: 'the keyboard as a mod source',
        analogy: 'Keyboard tracking is a lighting rig that follows the singer across the stage: nobody moves a spotlight per note — the POSITION drives the light. Here, the key position drives brightness, level, envelope speed — whatever the rows say.',
      },
      {
        h: 'Why matrices win',
        body: 'The hand-wired ifs from n11–n12 still live inside `sourceValue()` — the matrix didn\'t delete the wiring, it *organized* it. The win is combinatorial: 6 sources × 6 destinations is 36 possible routings; as ifs that\'s 36 code paths, as a matrix it\'s one loop and a menu. This is the exact moment synth architecture becomes software architecture.',
        warn: 'Amounts can be negative — wheel-down opens the filter, tracking DARKENS high notes. A matrix without negative amounts is missing half its sound design. (And note what sums can do: two rows both aimed at pitch is how you stack vibrato on top of a bend.)',
      },
    ],
    checks: [
      {
        type: 'match', concept: 'performance',
        prompt: 'Match each matrix row to the sound it makes.',
        left: ['LFO → pitch, small amount', 'Mod wheel → LFO depth', 'Velocity → gain', 'Key track → brightness'],
        right: ['vibrato', 'player\'s thumb controls the vibrato', 'harder strikes are louder', 'higher notes cut through brighter'],
        explain: 'Four rows you\'ve already built as separate wiring — in a matrix they\'re just data. Reading rows as sentences is reading any synth\'s mod page.',
      },
      {
        type: 'mcq', concept: 'performance',
        prompt: 'Two matrix rows both target PITCH (an LFO and the bend wheel). What happens?',
        options: [
          { t: 'Their contributions add — vibrato rides on top of the bend, like signals on the d11 bus', why: '' },
          { t: 'The second row overwrites the first', why: 'Overwriting would make multi-source modulation impossible — the loop SUMS matching rows on purpose.' },
          { t: 'It\'s a configuration error', why: 'It\'s a classic patch! Bend a note while vibrato wobbles it — two movers, one destination, summed.' },
          { t: 'Only the larger amount applies', why: 'No contest is held — control signals mix by addition, exactly like audio does.' },
        ],
        answer: 0,
        explain: 'Destinations collect ALL their movers and sum them — a control-signal mix bus. That summing is what makes matrices musical instead of merely tidy.',
      },
      {
        type: 'predict', concept: 'performance',
        prompt: 'keyTrack returns (note − 60) / 32. The player hits C2 (note 36). Sign and rough size of the value?',
        code: 'float k = (36 - 60) / 32.0f;',
        options: [
          { t: 'Negative, about −0.75 — keys below middle C push their destinations DOWN', why: '' },
          { t: 'Positive, about 0.75', why: '36 − 60 = −24: bass keys sit BELOW the middle-C zero point, so tracking goes negative.' },
          { t: 'Zero — tracking only affects high notes', why: 'Zero happens only AT middle C — the anchor. Everything else pushes, one way or the other.' },
          { t: '36 — the raw note number', why: 'The subtraction and divide normalize it: tracking speaks in ±1-ish, not in raw key numbers.' },
        ],
        answer: 0,
        explain: '(36−60)/32 = −0.75: a low note DARKENS a brightness destination (with a positive amount). Bidirectional tracking is the point — middle C is home, both directions push.',
      },
    ],
    recap: [
      'A mod matrix stores source → destination × amount rows as data.',
      'One loop per destination sums every matching row — control signals mix.',
      'Keyboard tracking = the note number as a source, normalized around middle C.',
      'Negative amounts are half the design space; fixed rows obey the no-allocation rule.',
    ],
    inside: [
      { name: 'First Signal', use: 'its wheel/velocity/tracking wiring, seen as three rows of a matrix' },
      { name: 'Flagship synths', use: 'the mod page IS this table with a GUI — 30 rows, same three columns' },
    ],
    analogyPanel: 'A mod matrix is a patchbay for invisible hands (d14\'s robots, unionized): every row is one cable — from a mover, to a knob, with an attenuator on the way. The synth just walks the bay top to bottom, every sample.',
    beginnerMistake: 'Hand-wiring a fifth and sixth routing as more ifs because the matrix “can wait.” The refactor gets harder with every wire — the moment you have three routings is the moment the table pays for itself.',
    remember: 'Source, destination, amount. Rows are sentences; the matrix is the paragraph; sums make it music.',
    builds: ['mod-matrix', 'keyboard-tracking', 'lfo'],
    leads: ['unison', 'modulation'],
  },

  /* ------------------------------------------------------ N14 */
  {
    id: 'n14', kind: 'lesson', title: 'Unison: One Note, A Choir', short: 'Detune & stereo spread',
    concepts: ['unison-poly'], time: '~6 MIN', diff: 2,
    hook: 'Every anthem lead and every supersaw pad shares one trick: press ONE key, hear SEVEN voices — each a hair out of tune with its neighbors, fanned across the stereo field. Alone, each copy is a plain saw. Together they shimmer. The shimmer has an implementation, and you own every piece of it.',
    objective: 'Implement unison: multiple detuned copies per note, spread across the stereo field — and pay its polyphony bill knowingly.',
    sections: [
      {
        h: 'Detune: near-misses on purpose',
        body: 'Stack copies of one note at slightly different pitches — offsets measured in **cents** (hundredths of a semitone, ratio 2^(cents/1200)) — and their waves drift in and out of phase: d11\'s summed signals interfering as slow, animated *beating*. A few cents apart = lush chorus shimmer; the copies are wrong together in a way that sounds rich, the same physics as a 12-string guitar or a string section\'s slightly-human tuning.',
        viz: { t: 'unisonviz', caption: 'one key → 5 copies: detuned in cents around center, panned across the field — the shimmer is their interference' },
        code: 'const int unisonCount = 5;\nfor (int u = 0; u < unisonCount; ++u)\n{\n    float spread = (u - 2) / 2.0f;                 // −1 .. +1 across copies\n    float cents  = spread * detuneAmount;          // e.g. ±12 cents\n    double ratio = std::pow(2.0, cents / 1200.0);  // cents → ratio\n    startUnisonVoice(note, vel,\n                     baseIncrement * ratio,        // detuned pitch\n                     spread);                      // doubles as pan position!\n}',
        codeTitle: 'the choir, hired',
        breakdown: [
          ['(u - 2) / 2.0f', 'five copies → positions −1, −0.5, 0, +0.5, +1: symmetric around the true pitch'],
          ['cents / 1200', 'd3\'s ratio law at cent resolution — 100 cents per semitone, 1200 per octave'],
          ['center copy = 0 cents', 'one voice stays PERFECTLY in tune — the anchor the ear locks onto'],
          ['spread → pan', 'the same −1..+1 feeds d12\'s pan recipe: detune positions become stage positions'],
        ],
      },
      {
        h: 'Stereo spread: the choir takes the stage',
        body: 'Detune alone is thick but mono. Feed each copy\'s spread position into d12\'s constant-power pan — the far-left copy pans hard left, the center copy sits dead center — and the note *widens* into a field. This is THE supersaw recipe: detune × spread. (d12\'s warning applies: spread built from level differences folds to mono gracefully; fancy phase tricks may not.)',
      },
      {
        h: 'The bill: unison eats polyphony',
        body: 'Five-voice unison means one key consumes FIVE voice cards. An 8-voice pool plays one-and-a-half unison notes — press a chord and n8\'s stealing goes into overdrive. Real synths budget explicitly (unison mode may cap polyphony to 2, or the pool grows and the CPU pays). There is no free shimmer: unison is polyphony *spent on thickness* instead of on notes.',
        warn: 'Sum-scaling changes too: each unison note is a 5-voice sum before it even reaches the chord bus — the d11 gain plan must count TOTAL sounding copies, not pressed keys. Forgetting this is why first unison builds clip on the second key.',
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'unison-poly',
        prompt: 'Convert a detune in cents to a frequency ratio.',
        code: 'double ratio = std::pow(2.0, cents / ___);',
        accept: ['1200.0', '1200', '1200.0f', '1200.f'],
        placeholder: 'divisor',
        hint: '100 cents per semitone, 12 semitones per octave.',
        mistakes: [
          { match: '^12(\\.0f?)?$', msg: 'Dividing by 12 reads cents as SEMITONES — your ±12-cent shimmer becomes a ±one-octave catastrophe. Cents need /1200.' },
        ],
        explain: '2^(cents/1200): the octave law at cent resolution. 12 cents ≈ 0.7% frequency — invisible alone, shimmering in a stack.',
      },
      {
        type: 'predict', concept: 'unison-poly',
        prompt: '8-voice pool, 5-voice unison enabled. The player presses a two-note interval. What happens?',
        code: '// 2 keys × 5 copies = 10 voices wanted, 8 exist',
        options: [
          { t: 'The pool overflows: 10 copies wanted, 8 cards exist — stealing fires on the SECOND key', why: '' },
          { t: 'Both notes get 5 copies', why: 'That needs 10 cards — two more than exist. Something yields: n8\'s ladder decides what.' },
          { t: 'Unison disables automatically', why: 'Only if you designed that policy! By default the allocator just runs dry and steals.' },
          { t: 'The second note is dropped', why: 'Dropping the new note is the one thing stealing exists to prevent — victims come from what\'s already sounding.' },
        ],
        answer: 0,
        explain: 'Unison multiplies voice demand: 2 keys × 5 = 10 > 8. This is why unison modes ship with explicit polyphony budgets — the shimmer is paid for in cards.',
      },
      {
        type: 'mcq', concept: 'unison-poly',
        prompt: 'Why does one copy stay at exactly 0 cents in a symmetric unison stack?',
        options: [
          { t: 'It\'s the in-tune anchor — the ear locks to it while the detuned copies shimmer around it', why: '' },
          { t: 'To save CPU', why: 'Same cost as any copy — the reason is musical: pitch needs a home.' },
          { t: 'Zero cents means silent', why: 'Cents measure PITCH offset, not level — the center copy plays at full voice, perfectly in tune.' },
          { t: 'MIDI requires it', why: 'MIDI sent one note and went home — the stack is entirely the synth\'s interior decoration.' },
        ],
        answer: 0,
        explain: 'Symmetric spreads keep a true-pitch anchor so the note reads as IN TUNE with shimmer around it — rather than as a cloud with no center.',
      },
    ],
    recap: [
      'Unison = N copies per note, detuned in cents (2^(cents/1200)), panned by spread.',
      'The shimmer is interference — d11\'s summing physics as slow beating.',
      'Spread positions feed d12\'s constant-power pan: detune becomes width.',
      'Unison multiplies voice demand and re-scales the gain plan — budget for both.',
    ],
    inside: [
      { name: 'First Signal', use: 'p15 installs unison — the last capability before the boss' },
      { name: 'The supersaw', use: 'the most sampled synth sound of the century is exactly this recipe, ×7' },
    ],
    analogyPanel: 'Unison is a string section: twelve violinists play the same line, each humanly imperfect, seated across the stage. One perfect violin is a soloist; twelve imperfect ones are a SECTION. The imperfection, spread out, is the lushness.',
    beginnerMistake: 'Detuning ALL copies off-center (none at 0 cents) — the note loses its pitch anchor and reads as out of tune rather than wide. Symmetry around zero, with one copy ON zero, is the difference between lush and seasick.',
    remember: 'Detune in cents, spread across the stage, keep one copy honest — and pay the polyphony bill.',
    builds: ['unison', 'detune', 'stereo'],
    leads: ['polyphony', 'voice-stealing'],
  },

  /* ------------------------------------------------------ N15 */
  {
    id: 'n15', kind: 'lesson', title: 'The Playable Synth', short: 'First Signal, complete',
    concepts: ['unison-poly'], time: '~7 MIN', diff: 3,
    hook: 'Fifteen lessons ago First Signal ignored your keyboard. Now trace one key press: the inbox reads it, allocation seats it, a voice renders it with YOUR velocity, the wheels steer it, the pedal holds it, unison thickens it, the bus sums it. Nothing in that chain is someone else\'s magic anymore. Let\'s read the whole instrument — and add its emergency brake.',
    objective: 'Read First Signal\'s complete performance architecture end to end, and implement panic — the all-notes-off everything needs.',
    sections: [
      {
        h: 'The whole instrument, one diagram',
        body: 'The architecture now has two rivers meeting in processBlock: the **event river** (MIDI → dispatch → allocation/pedal/wheels → voice state) and the **audio river** (voices render → sum → gain plan → clamp → channels). Zone 4 built the audio river; Zone 5 built the event river and the government between them.',
        viz: { t: 'chain', nodes: ['MIDI', 'DISPATCH', 'VOICES', 'SUM', 'PERF', 'OUT'], accent: 2, caption: 'events steer the pool; the pool renders the river — First Signal v6, whole' },
      },
      {
        h: 'Panic: the emergency brake',
        body: 'Every synth eventually meets a stuck note — a lost note-off, a MIDI cable yanked mid-phrase, a crashed sequencer. **Panic** (all-notes-off) is the escape hatch: release everything, clear every mark, trust nothing. MIDI even has a dedicated message (CC 123, All Notes Off) — and hosts send it on stop. Respond, and also give the UI a panic button that calls the same code:',
        code: 'void allNotesOff(bool hard)\n{\n    for (auto& v : voices)\n    {\n        v.sustained = false;          // no pedal exemptions in an emergency\n        if (hard)  { v.adsr.reset(); v.note = -1; }   // instant silence\n        else if (v.adsr.isActive())\n                     v.adsr.noteOff();                 // musical: release tails\n    }\n    pedalDown = false;                // the pedal itself resets too\n}\n// inbox: else if (msg.isAllNotesOff()) allNotesOff(false);',
        codeTitle: 'the emergency brake, two strengths',
        breakdown: [
          ['sustained = false', 'pedal marks are exactly what causes stuck notes — clear them FIRST'],
          ['soft: noteOff()', 'the polite stop — every voice fades through its own release'],
          ['hard: reset() + free', 'the fire alarm — instant silence, pool scrubbed (clicks allowed; it\'s an emergency)'],
          ['pedalDown = false', 'panic resets the STATE, not just the voices — half a reset is a future bug'],
        ],
        mistake: { code: 'void allNotesOff()\n{\n    for (auto& v : voices)\n        v.adsr.noteOff();   // ✗ sustained marks survive\n}', text: 'Releasing envelopes without clearing sustained marks and pedalDown leaves ghosts: the next pedal-up “releases” voices that are already dead, and stale marks stick future notes. Panic means ALL the state.' },
      },
      {
        h: 'What First Signal has become — and what\'s next',
        body: 'Take inventory: it reads every message type this zone taught, allocates and steals with a policy, tracks the full voice lifecycle, defers goodbyes for the pedal, bends and wobbles under the wheels, tracks the keyboard, and stacks unison — a genuinely playable instrument with honest limits (naive waveforms from d8, no filter yet). Zone 6 turns from *capability* to *professionalism*: thread safety at depth, testing, debugging, shipping. The instrument works; next we make it bulletproof.',
      },
    ],
    checks: [
      {
        type: 'order', concept: 'unison-poly',
        prompt: 'Trace one key press through the instrument, top to bottom.',
        lines: [
          'the MidiBuffer delivers NOTE ON, note 64, velocity 96',
          'dispatch asks isNoteOn() and routes to startNote()',
          'allocation finds a free voice and stamps its ownership',
          'the voice renders: oscillator × envelope × velocity gain',
          'the bus sums all voices and the gain plan stages the mix',
          'the clamp guards the finished samples into every channel',
        ],
        explain: 'Inbox → dispatch → allocation → render → sum → guard: the event river feeding the audio river. Every line is a lesson; together they\'re an instrument.',
      },
      {
        type: 'mcq', concept: 'unison-poly',
        prompt: 'Why must panic clear sustained marks and pedalDown, not just release envelopes?',
        options: [
          { t: 'Stale pedal state re-sticks future notes — panic must reset ALL state, not just silence voices', why: '' },
          { t: 'Envelopes can\'t release while marks exist', why: 'They can — but the leftover marks corrupt the NEXT notes\' bookkeeping. The bug arrives later, which is worse.' },
          { t: 'MIDI requires it', why: 'CC 123 just says “all notes off” — HOW thoroughly you reset is your engineering, and half-resets breed ghosts.' },
          { t: 'It\'s faster', why: 'Speed is irrelevant in a panic — completeness is the whole point of the button.' },
        ],
        answer: 0,
        explain: 'Panic is a state reset wearing a mute button. Silencing voices while keeping stale bookkeeping just schedules the next emergency.',
      },
      {
        type: 'predict', concept: 'unison-poly',
        prompt: 'A note is held by the sustain pedal (key up, foot down). SOFT panic (all-notes-off) arrives. What happens to that voice?',
        code: 'v.sustained == true, adsr active   →   allNotesOff(false)',
        options: [
          { t: 'Its mark clears and noteOff() fires — it fades out through its normal release', why: '' },
          { t: 'Nothing — the pedal protects it', why: 'Panic clears sustained FIRST — no exemptions is the entire point of an emergency brake.' },
          { t: 'It\'s instantly silenced', why: 'That\'s the HARD variant. Soft panic is musical: everything releases, tails intact.' },
          { t: 'It waits for pedal-up', why: 'pedalDown is force-cleared too — panic doesn\'t wait for anyone\'s foot.' },
        ],
        answer: 0,
        explain: 'Soft panic: clear the mark, release the envelope, reset the pedal — the wash ends gracefully. Hard panic exists for when graceful is a luxury.',
      },
    ],
    recap: [
      'Two rivers: events steer voice state; voices render the audio.',
      'Panic = total state reset: marks, pedal, envelopes — soft (release) or hard (reset).',
      'CC 123 (All Notes Off) arrives from hosts on stop — respond to it.',
      'First Signal is now a playable instrument; Zone 6 makes it professional.',
    ],
    inside: [
      { name: 'First Signal', use: 'v6 complete — next, the release review: certify it under real-time load' },
      { name: 'Every DAW', use: 'the MIDI panic menu item sends exactly these messages when things get weird' },
    ],
    analogyPanel: 'The finished synth is a small theater company: the inbox is the stage door, allocation the stage manager, voices the cast, the wheels a director giving live notes, the pedal a hold cue, and panic the house lights — one switch that ends every scene at once, no exceptions.',
    beginnerMistake: 'Shipping without panic because “note-offs always arrive.” They don\'t: cables drop, hosts hiccup, loops truncate. The first stuck note in front of an audience teaches this lesson much more expensively than this paragraph does.',
    remember: 'Events steer, voices render, and panic resets EVERYTHING. That\'s a synthesizer — and you can read all of it.',
    builds: ['panic', 'polyphony', 'sustain-pedal'],
    leads: ['voice', 'mod-matrix'],
  }
);
