/* ============================================================
   ZONE 5 — challenges, missions p12–p15, and the boss.
   Synth Engineering: First Signal becomes a playable instrument.
   ============================================================ */

const ZONE5_CHALLENGES = [

  /* ============ READING THE SIGNAL PATH ============ */
  {
    id: 'nr1', kind: 'challenge', ctype: 'reading', title: 'Read: The Voice Card', short: 'Trace the code',
    concepts: ['voices-poly'],
    intro: 'One Voice struct, fully loaded. Read it like a channel strip: what\'s state, what\'s paperwork, what\'s shared with the whole desk.',
    questions: [
      {
        type: 'match', concept: 'voices-poly',
        prompt: 'Match each member to its job.',
        left: ['int note = -1', 'double phase', 'juce::ADSR adsr', 'juce::uint32 age'],
        right: ['ownership stamp — −1 means free', 'this note\'s own d5 bookmark', 'this note\'s own life story', 'birth certificate — stealing sorts by it'],
        explain: 'Everything a note needs, boxed. The note field doubles as the entire ownership system; age exists purely so stealing can find the elder.',
      },
      {
        type: 'mcq', concept: 'voices-poly',
        prompt: 'Which of these belongs on the SYNTH, not inside each Voice?',
        code: 'struct Voice { int note; double phase, increment;\n               float velGain; juce::ADSR adsr; };\n// and somewhere: ??? ',
        options: [
          { t: 'bendRatio — the pitch wheel bends every voice together, so it\'s channel-wide state', why: '' },
          { t: 'phase — voices could share one', why: 'Shared phase = one blurred pitch for all notes. Per-voice phase is the foundation of polyphony (n5).' },
          { t: 'adsr — one envelope is enough', why: 'One envelope would chop every held note when any new key hit — chords need independent life stories.' },
          { t: 'velGain — velocity is global', why: 'Velocity is per-STRIKE: each note keeps the dynamics it was born with, for its whole life.' },
        ],
        answer: 0,
        explain: 'Classic MIDI bend is a channel message: one wheel, everyone slides (n11). Per-note things live in the Voice; channel-wide things live on the synth — the split IS the architecture.',
      },
    ],
  },
  {
    id: 'nr2', kind: 'challenge', ctype: 'reading', title: 'Read: The Dispatch Chain', short: 'Trace the code',
    concepts: ['midi-basics'],
    intro: 'A full inbox loop from a working synth. Read it as the synth\'s ear: which question catches which gesture.',
    questions: [
      {
        type: 'match', concept: 'midi-basics',
        prompt: 'Match each query to the player gesture it catches.',
        left: ['isNoteOn()', 'isPitchWheel()', 'isController() && number == 64', 'isChannelPressure()'],
        right: ['a key going down', 'the sprung left wheel moving', 'the sustain pedal', 'leaning into held keys'],
        explain: 'The dispatch chain is the synth\'s ear: one question per gesture family. Every capability in this zone started as one more else-if.',
      },
      {
        type: 'mcq', concept: 'midi-basics',
        prompt: 'In this loop, what is metadata.samplePosition used for?',
        code: 'for (const auto metadata : midiMessages)\n{\n    const auto msg = metadata.getMessage();\n    // metadata.samplePosition — the stamp\n    dispatch(msg);\n}',
        options: [
          { t: 'Sample-accurate timing: it says which sample within this block the event belongs to', why: '' },
          { t: 'Sorting the messages', why: 'The buffer already delivers them in time order — the stamp tells you WHEN, not in what order.' },
          { t: 'Identifying the sender', why: 'Channel (inside the message) identifies lanes; the stamp is purely temporal.' },
          { t: 'Nothing — it\'s legacy', why: 'It\'s the difference between tight and mushy instruments: a note at sample 137 should start at sample 137, not at the block edge.' },
        ],
        answer: 0,
        explain: 'Events land mid-block constantly. Handling them at their samplePosition (pros split the block there) is what makes an instrument feel tight under fast hands.',
      },
    ],
  },
  {
    id: 'nr3', kind: 'challenge', ctype: 'reading', title: 'Trace: Who Owns Middle C?', short: 'Allocation puzzle',
    concepts: ['allocation'],
    intro: 'A 4-voice pool, a busy passage, and a clipboard. Play stage manager: seat every note, then survive the overflow.',
    questions: [
      {
        type: 'match', concept: 'allocation',
        prompt: 'Pool starts empty; voices are scanned left to right. Seat the passage: C3 on, E3 on, C3 off, G3 on.',
        left: ['C3 note-on', 'E3 note-on', 'C3 note-off', 'G3 note-on'],
        right: ['voice 1 — first free card', 'voice 2 — next free card', 'voice 1 releases — stamp matches C3', 'voice 1 again — freed and rehired'],
        explain: 'Allocation always hunts from the left, so freed cards get rehired before untouched ones. (Assume C3\'s release completed before G3 arrived — n9\'s flip already happened.)',
      },
      {
        type: 'predict', concept: 'allocation',
        prompt: 'All 4 voices busy: C2 (age 1, held), E3 (age 4, held), G3 (age 2, RELEASING), B3 (age 3, held). A 5th note arrives. Using the n8 ladder, who is stolen?',
        code: '// ladder: free → releasing → oldest',
        options: [
          { t: 'G3 — releasing beats everything; its age never even gets compared', why: '' },
          { t: 'C2 — oldest always pays', why: 'Oldest is the FALLBACK rung. The ladder finds the releasing G3 first and stops looking.' },
          { t: 'E3 — highest age', why: 'Highest age = NEWEST — the note the player just asked for. Stealing it is the most audible mistake available.' },
          { t: 'B3 — middle age is fairest', why: 'The ladder doesn\'t do “fair” — it does “least audible”: dying voices first, then the longest-heard.' },
        ],
        answer: 0,
        explain: 'A releasing voice is a gift: already fading, already filed away by the ear. The ladder\'s whole job is finding the exit nobody will notice.',
      },
    ],
  },

  /* ============ COMPLETION ============ */
  {
    id: 'nc1', kind: 'challenge', ctype: 'completion', title: 'Complete: The Note-On Handler', short: 'Code completion',
    concepts: ['allocation'],
    intro: 'Allocation with two blanks: the paperwork is done — start the sound, and honor the one-voice rule.',
    questions: [
      {
        type: 'fill', concept: 'allocation',
        prompt: 'The voice is claimed and tuned. Begin its attack.',
        code: 'v.note = note;\nv.velGain = vel;\nv.age = ++ageCounter;\nv.adsr.___();',
        accept: ['noteOn'],
        placeholder: 'method',
        hint: 'The envelope call that starts a note\'s life.',
        explain: 'noteOn() launches the attack — after the paperwork, so the voice never sounds before it knows its pitch and owner.',
      },
      {
        type: 'fill', concept: 'allocation',
        prompt: 'One note-on must claim exactly ONE voice. Stop the hunt after a claim.',
        code: 'for (auto& v : voices)\n    if (v.note == -1)\n    {\n        claimVoice(v, note, vel);\n        ___;\n    }',
        accept: ['return', 'break', 'return;', 'break;'],
        placeholder: 'statement',
        hint: 'Leave the loop — the gig is filled.',
        explain: 'Without it, every free card claims the same note: one press, a full-pool unison blast at +18 dB. One note-on, one voice — enforced by one keyword.',
      },
    ],
  },
  {
    id: 'nc2', kind: 'challenge', ctype: 'completion', title: 'Complete: The Chord Bus', short: 'Code completion',
    concepts: ['voices-poly'],
    intro: 'The polyphonic render: eight voices, one bus, one gain plan. Two blanks keep it honest.',
    questions: [
      {
        type: 'fill', concept: 'voices-poly',
        prompt: 'Each active voice contributes to the bus. Which operator mixes it in?',
        code: 'float mix = 0.0f;\nfor (auto& v : voices)\n{\n    if (! v.adsr.isActive()) continue;\n    mix ___ renderVoice(v);\n}',
        accept: ['+='],
        placeholder: 'operator',
        hint: 'd11: a bus is a plus sign.',
        mistakes: [
          { match: '^=$', msg: 'Plain = OVERWRITES: only the last active voice would survive — chords collapse to one note. The bus accumulates: +=.' },
        ],
        explain: '+= is d11\'s entire lesson as an operator. Each voice adds its sample; the sum is the chord.',
      },
      {
        type: 'fill', concept: 'voices-poly',
        prompt: 'Eight full-scale voices worst-case to exactly 1.0: trim the bus.',
        code: 'float s = mix * ___;   // 8-voice pool',
        accept: ['0.125f', '0.125', '.125f', '.125', '(1.0f / 8.0f)', '1.0f / 8.0f', '1.0f/8.0f'],
        placeholder: 'factor',
        hint: 'The 1/N guarantee with N = 8.',
        explain: '8 × 1.0 × 0.125 = 1.0: the d11 gain plan at synth scale. Real synths run hotter on peak statistics — but the guarantee is where a trustworthy instrument starts.',
      },
    ],
  },
  {
    id: 'nc3', kind: 'challenge', ctype: 'completion', title: 'Complete: The Pedal Logic', short: 'Code completion',
    concepts: ['performance'],
    intro: 'Both halves of the sustain pedal — the deferral and the last call. One blank each.',
    questions: [
      {
        type: 'fill', concept: 'performance',
        prompt: 'Pedal is down and a key lifts. Defer the goodbye.',
        code: 'if (v.note == note && v.adsr.isActive())\n{\n    if (pedalDown) v.___ = true;   // mark, don\'t release\n    else           v.adsr.noteOff();\n}',
        accept: ['sustained'],
        placeholder: 'member',
        hint: 'The mark that says “the pedal vouches for me.”',
        explain: 'The mark replaces the release — the voice keeps singing on the pedal\'s word. The envelope never hears about the key-up until the foot lifts.',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'The pedal lifts. Fire every deferred goodbye.',
        code: 'if (! down)\n    for (auto& v : voices)\n        if (v.sustained)\n        {\n            v.sustained = false;\n            v.adsr.___();\n        }',
        accept: ['noteOff'],
        placeholder: 'method',
        hint: 'The release that was postponed.',
        explain: 'Every marked voice gets its real noteOff at once — the pianist\'s wash ending together. Clear the mark as you fire: stale marks are stuck notes waiting to happen.',
      },
    ],
  },
  {
    id: 'nc4', kind: 'challenge', ctype: 'completion', title: 'Complete: The Bend Decoder', short: 'Code completion',
    concepts: ['performance'],
    intro: 'From raw wheel to frequency ratio in three lines. Two blanks carry the whole conversion.',
    questions: [
      {
        type: 'fill', concept: 'performance',
        prompt: 'Center the 14-bit value so the wheel\'s rest position means zero.',
        code: 'int raw = msg.getPitchWheelValue();          // 0..16383\nfloat centered = (raw - ___) / 8192.0f;      // −1..+1',
        accept: ['8192', '8192.0', '8192.0f', '8192.f'],
        placeholder: 'center',
        hint: 'The midpoint of 0..16383.',
        explain: '8192 is home: subtract it and rest reads as 0.0, full down −1.0, full up ≈ +1.0. Forget the centering and the wheel\'s REST position bends you sharp.',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'Semitones to ratio — the law that runs all pitch.',
        code: 'float semitones = centered * 2.0f;           // ±2 st range\nbendRatio = std::pow(2.0f, semitones / ___);',
        accept: ['12.0f', '12', '12.0', '12.f'],
        placeholder: 'divisor',
        hint: 'Semitones per octave.',
        explain: '2^(st/12), d3\'s law with the wheel feeding the exponent. Applied at render as increment × bendRatio — the base stays pure so home means exactly in tune.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'nb1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Stuck Note', short: 'Find the bug',
    concepts: ['allocation'],
    intro: 'Lift a key and a DIFFERENT note dies — while yours rings on forever. The clipboard is being ignored. Tap where.',
    questions: [
      {
        type: 'bugspot', concept: 'allocation',
        prompt: 'This stopNote releases the wrong voice. Which line ignores ownership?',
        code: [
          'void stopNote(int note)',
          '{',
          '    for (auto& v : voices)',
          '        if (v.adsr.isActive())',
          '        {',
          '            v.adsr.noteOff();',
          '            return;',
          '        }',
          '}',
        ],
        buggy: 3,
        explain: 'The condition never checks WHOSE note this is — it releases the first active voice it meets (usually the oldest chord tone), while the lifted key\'s voice never gets its noteOff. The stamp exists for exactly this: v.note == note && v.adsr.isActive().',
        fix: 'if (v.note == note && v.adsr.isActive())',
      },
    ],
  },
  {
    id: 'nb2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Upside-Down Hunt', short: 'Find the bug',
    concepts: ['allocation'],
    intro: 'Every new note cuts off a sounding one — even with six voices sitting idle. The free hunt is finding the wrong crowd. Tap it.',
    questions: [
      {
        type: 'bugspot', concept: 'allocation',
        prompt: 'This allocator steals constantly and never uses free voices. Which line is backwards?',
        code: [
          'Voice* findFreeVoice()',
          '{',
          '    for (auto& v : voices)',
          '        if (v.note != -1)',
          '            return &v;',
          '    return nullptr;',
          '}',
        ],
        buggy: 3,
        explain: '!= -1 finds OWNED voices — the hunt returns the first BUSY card, silencing its note, while genuinely free cards are skipped. One flipped comparison turns allocation into permanent stealing: the free test is v.note == -1.',
        fix: 'if (v.note == -1)',
      },
    ],
  },
  {
    id: 'nb3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Backwards Pedal', short: 'Find the bug',
    concepts: ['performance'],
    intro: 'Foot DOWN chops every note short; foot UP makes everything hang forever. The pedal works — in a mirror. Tap the inversion.',
    questions: [
      {
        type: 'bugspot', concept: 'performance',
        prompt: 'One comparison runs the pedal upside down. Which line?',
        code: [
          'else if (msg.isController())',
          '{',
          '    if (msg.getControllerNumber() == 64)',
          '        setPedal(msg.getControllerValue() < 64);',
          '}',
        ],
        buggy: 3,
        explain: 'The convention is ≥64 = down. With < 64, pressing the pedal reports UP (releasing your wash) and lifting it reports DOWN (deferring everything forever). One flipped comparison, a perfectly mirrored pedal: >= 64.',
        fix: 'setPedal(msg.getControllerValue() >= 64);',
      },
    ],
  },
  {
    id: 'nb4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Runaway Bend', short: 'Find the bug',
    concepts: ['performance'],
    intro: 'Wiggle the bend wheel a few times and the whole synth drifts sharp — release the wheel and it NEVER comes back in tune. Tap the compounding line.',
    questions: [
      {
        type: 'bugspot', concept: 'performance',
        prompt: 'The bend is being applied destructively. Which line?',
        code: [
          'else if (msg.isPitchWheel())',
          '{',
          '    float ratio = ratioFor(msg.getPitchWheelValue());',
          '    for (auto& v : voices)',
          '        v.increment *= ratio;',
          '}',
        ],
        buggy: 4,
        explain: 'Multiplying the STORED increment applies each wheel message on top of the last — wiggles compound, and “wheel home” multiplies by ~1.0 without ever undoing the damage. Bend is a live multiplier at render time (v.increment * bendRatio); the stored base never gets edited.',
        fix: 'bendRatio = ratio;  // apply at render: v.increment * bendRatio',
      },
    ],
  },

  /* ============ COMPILER ============ */
  {
    id: 'ne1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Read-Only Voice', short: 'Read the error',
    concepts: ['voices-poly'],
    intro: 'The render loop refuses to build. The compiler is protecting you from a promise you made two tokens earlier. Decode it.',
    questions: [
      {
        type: 'compiler', concept: 'voices-poly',
        prompt: 'What fixes this build?',
        code: 'for (const auto& v : voices)\n{\n    mix += renderVoice(v);\n    v.phase += v.increment;   // advance the bookmark\n}',
        error: "error: assignment of member 'Voice::phase'\nin read-only object\n    v.phase += v.increment;\n            ^",
        options: [
          { t: 'Loop with auto& (drop the const) — the render loop MUTATES each voice', why: '' },
          { t: 'Make phase a global variable', why: 'Sharing one phase across voices is the n6 blurred-pitch bug — the fix is permission to write, not demolition of the design.' },
          { t: 'Cast away the const', why: 'const_cast silences the guard instead of honoring it — the loop\'s declaration should simply tell the truth: it writes.' },
          { t: 'Advance the phase somewhere else', why: 'Somewhere else needs write access too — the honest fix is declaring the intent where the work happens.' },
        ],
        answer: 0,
        explain: 'const auto& promises “I\'ll only look” — then the advance writes. The render loop changes phase and envelope state every sample, so it must borrow mutably: for (auto& v : voices). Zone 1\'s const contract, enforced at synth scale.',
      },
    ],
  },

  /* ============ ORDERING ============ */
  {
    id: 'no1', kind: 'challenge', ctype: 'ordering', title: 'Order: The Note-On Path', short: 'Arrange the code',
    concepts: ['allocation'],
    intro: 'One key press, four moves. Only one order finds a card, survives a full pool, and never sounds before the paperwork is done.',
    questions: [
      {
        type: 'order', concept: 'allocation',
        prompt: 'Arrange the note-on path exactly as n7/n8 teach it: find, fall back, paperwork, attack.',
        lines: [
          'Voice* v = findFreeVoice();',
          'if (v == nullptr) v = findVictim();',
          'claimVoice(*v, note, vel);   // ownership, pitch, age, marks',
          'v->adsr.noteOn();            // the attack — after the paperwork',
        ],
        explain: 'Hunt free first (stealing is the fallback, not the norm), then claim, then sound. noteOn() last means a voice never sings before it knows its pitch, owner, and a clean pedal mark.',
      },
    ],
  },

  /* ============ MISSIONS ============ */
  {
    id: 'p12', kind: 'project', title: 'Mission 1: The Ear Opens', short: 'Zone mission',
    concepts: ['midi-basics'],
    brief: 'First Signal has played its own note since Zone 4. Today it plays YOURS: read the MidiBuffer, dispatch note events, tune the voice from the key, and carry the strike in the gain. When this mission ends, your keyboard is wired to your code.',
    steps: [
      {
        note: 'Step 1 — Find the mail. Where has MIDI been arriving all along?',
        q: {
          type: 'mcq', concept: 'midi-basics',
          prompt: 'Where does MIDI reach your plugin?',
          options: [
            { t: 'The second parameter of processBlock — the MidiBuffer you\'ve ignored since Zone 3', why: '' },
            { t: 'A separate callback', why: 'No separate delivery — audio and MIDI arrive together, every block, in the same call.' },
            { t: 'The editor forwards it', why: 'The editor is the panel (message thread) — performance data goes straight to the engine.' },
            { t: 'You must poll the host', why: 'The host pushes; you read. The buffer is already in your hands each block.' },
          ],
          answer: 0,
          explain: 'processBlock(buffer, midiMessages) — both rivers in one call. The MidiBuffer was always there; today it gets read.',
        },
      },
      {
        note: 'Step 2 — The dispatch. Ask each message what it is.',
        q: {
          type: 'fill', concept: 'midi-basics',
          prompt: 'Route key-down events to your handler.',
          code: 'for (const auto metadata : midiMessages)\n{\n    const auto msg = metadata.getMessage();\n    if (msg.___())\n        startNote(msg.getNoteNumber(), msg.getFloatVelocity());\n    else if (msg.isNoteOff())\n        stopNote(msg.getNoteNumber());\n}',
          accept: ['isNoteOn'],
          placeholder: 'query',
          hint: 'The question that catches a key going down.',
          explain: 'isNoteOn() — and by using the query (not raw bytes), the velocity-0 convention from n2 is already handled: those report as note-offs.',
        },
      },
      {
        note: 'Step 3 — Pitch from the key. The d3 map finally gets its real input.',
        q: {
          type: 'fill', concept: 'midi-basics',
          prompt: 'Tune the voice from the incoming note number.',
          code: 'void startNote(int note, float vel)\n{\n    increment = juce::MathConstants<double>::twoPi\n              * ___(note) / getSampleRate();\n    velGain = vel;\n    adsr.noteOn();\n}',
          accept: ['midiToHz'],
          placeholder: 'function',
          hint: 'Note number → Hertz — you built it in dc1.',
          explain: 'midiToHz(note) → Hz → 2π·f/fs → increment: key press to pitch in one line. First Signal just played a note YOU chose — the first time since Zone 3 it obeyed a musician.',
        },
      },
      {
        note: 'Step 4 — Understand what just changed. This is bigger than a feature.',
        q: {
          type: 'mcq', concept: 'midi-basics',
          prompt: 'Architecturally, what did this mission do to First Signal?',
          options: [
            { t: 'It became event-driven: the player\'s messages now steer the DSP, instead of the DSP playing itself', why: '' },
            { t: 'It got a better oscillator', why: 'Same oscillator — what changed is WHO decides its frequency: the musician, not a hard-coded 440.' },
            { t: 'It moved to the message thread', why: 'Everything still renders on the audio thread — MIDI arrives IN processBlock precisely so no thread hop is needed.' },
            { t: 'It became polyphonic', why: 'Not yet — one voice obeys the keys (mono). The pool arrives in Mission 2.' },
          ],
          answer: 0,
          explain: 'The event river now feeds the audio river. Every remaining mission just adds more ways for the player to steer — the architecture turn happened HERE.',
        },
      },
    ],
  },
  {
    id: 'p13', kind: 'project', title: 'Mission 2: The Voice Rack', short: 'Zone mission',
    concepts: ['voices-poly', 'allocation'],
    brief: 'One voice obeys the keyboard; now build eight. Refactor Zone 4\'s machinery into the Voice struct, wire allocation and ownership, install the stealing ladder, and recycle voices when their tails end. Chords, at last.',
    steps: [
      {
        note: 'Step 1 — Sort the state. Polyphony begins with knowing what\'s per-voice and what\'s shared.',
        q: {
          type: 'match', concept: 'voices-poly',
          prompt: 'Per-voice, or shared synth state?',
          left: ['phase', 'adsr', 'bendRatio', 'waveform selector'],
          right: ['per-voice — every note has its own bookmark', 'per-voice — every note dies on its own schedule', 'shared — one wheel bends everyone (n11)', 'shared — one panel switch, all voices obey'],
          explain: 'The split rule: if two simultaneous notes could need different values, it lives in the Voice. If the player has ONE control for it, it lives on the synth.',
        },
      },
      {
        note: 'Step 2 — The free hunt. Allocation\'s first question.',
        q: {
          type: 'fill', concept: 'allocation',
          prompt: 'Find an unowned card.',
          code: 'Voice* findFreeVoice()\n{\n    for (auto& v : voices)\n        if (v.note == ___)\n            return &v;\n    return nullptr;\n}',
          accept: ['-1'],
          placeholder: 'tag',
          hint: 'The “nobody owns me” value from n5.',
          explain: '-1 is the free tag — no real key is negative. nullptr from this hunt is the signal that n8\'s ladder must choose a victim instead.',
        },
      },
      {
        note: 'Step 3 — The ladder. Arrange the victim hunt in priority order.',
        q: {
          type: 'order', concept: 'allocation',
          prompt: 'Arrange findVictim\'s body: the n8 ladder, top to bottom.',
          lines: [
            'if (! v.adsr.isActive()) return &v;   // free: not a steal at all',
            'if (isReleasing(v)) return &v;        // dying anyway: perfect victim',
            'if (oldest == nullptr || v.age < oldest->age)',
            '    oldest = &v;                      // track the elder as fallback',
          ],
          explain: 'Free beats releasing beats oldest. The early returns ARE the priority: cheaper victims exit the hunt before the fallback bookkeeping even runs.',
        },
      },
      {
        note: 'Step 4 — The recycling moment. When does a card truly return to the pool?',
        q: {
          type: 'predict', concept: 'allocation',
          prompt: 'A pad with a 3-second release. Player holds a chord, lifts all keys, and 1 second later presses ONE new note. What does allocation find?',
          code: '// all chord voices: keys up, envelopes mid-release',
          options: [
            { t: 'No free voices — the tails still own their cards, so the ladder steals a releasing voice', why: '' },
            { t: 'All voices free — the keys are up', why: 'Keys up started the releases; the cards free only when each envelope FINISHES (n9). Two more seconds to go.' },
            { t: 'A crash', why: 'Routine traffic: full pool, releasing candidates everywhere — the ladder\'s favorite weather.' },
            { t: 'The new note is dropped', why: 'Never — the ladder exists so the new note ALWAYS plays. A releasing chord tone pays, barely audibly.' },
          ],
          answer: 0,
          explain: 'Tails are tenants. The isActive() flip is the only true checkout — until then, new notes go through the ladder, which finds the releasing chord gladly.',
        },
      },
    ],
  },
  {
    id: 'p14', kind: 'project', title: 'Mission 3: The Performance Deck', short: 'Zone mission',
    concepts: ['performance'],
    brief: 'Chords work; now make them SING. Wire the sustain pedal\'s deferred goodbyes, decode the 14-bit bend wheel into a live ratio, and hand the mod wheel to d14\'s vibrato. After this mission, First Signal responds to feet, thumbs, and drama.',
    steps: [
      {
        note: 'Step 1 — The pedal\'s address. One controller number, forty years old.',
        q: {
          type: 'fill', concept: 'performance',
          prompt: 'Catch the sustain pedal in the dispatch chain.',
          code: 'else if (msg.isController())\n{\n    if (msg.getControllerNumber() == ___)\n        setPedal(msg.getControllerValue() >= 64);\n}',
          accept: ['64'],
          placeholder: 'CC number',
          hint: 'Sustain\'s controller number — same as its threshold, coincidentally.',
          explain: 'CC 64 is sustain by MIDI convention (and ≥64 = down — the number appearing twice is pure coincidence). CC 1 will join this chain in step 3.',
        },
      },
      {
        note: 'Step 2 — The wheel, decoded. Guard the one line everyone gets wrong.',
        q: {
          type: 'bugspot', concept: 'performance',
          prompt: 'This bend decoder plays everything 2 semitones SHARP with the wheel at rest. Tap why.',
          code: [
            'int raw = msg.getPitchWheelValue();',
            'float centered  = raw / 8192.0f;',
            'float semitones = centered * 2.0f;',
            'bendRatio = std::pow(2.0f, semitones / 12.0f);',
          ],
          buggy: 1,
          explain: 'No centering: at rest, raw = 8192 → centered = 1.0 → +2 semitones, permanently. Subtract the midpoint first: (raw − 8192) / 8192.0f — home must decode to exactly zero.',
          fix: 'float centered = (raw - 8192) / 8192.0f;',
        },
      },
      {
        note: 'Step 3 — The thumb takes the depth. CC 1 meets d14\'s vibrato.',
        q: {
          type: 'fill', concept: 'performance',
          prompt: 'Normalize the mod wheel into the vibrato depth.',
          code: 'if (msg.getControllerNumber() == 1)\n    vibratoDepth = msg.getControllerValue() / ___;',
          accept: ['127.0f', '127.f', '127.0'],
          placeholder: 'divisor',
          hint: 'Float, or Zone 1\'s truncation trap strikes.',
          mistakes: [
            { match: '^127$', msg: 'Integer division: 0 for every value below 127 — a mod wheel that\'s dead until slammed fully up. Divide by 127.0f.' },
          ],
          explain: 'value / 127.0f → 0..1 into d14\'s depth. The int version is the boss\'s favorite fault: a wheel that only works at maximum.',
        },
      },
      {
        note: 'Step 4 — Contract check. The wheel is math, but its RANGE is a handshake.',
        q: {
          type: 'mcq', concept: 'performance',
          prompt: 'Your bends sound four times too wide on a friend\'s controller. Most likely cause?',
          options: [
            { t: 'The synth and controller disagree on bend RANGE — e.g. your ±2 st assumption vs their ±8 expectation', why: '' },
            { t: 'Their controller is broken', why: 'Both devices are fine — they\'re just speaking different ranges over the same 14-bit wire.' },
            { t: 'The 14-bit math is wrong', why: 'The wire math is universal; the RANGE multiplier is the negotiable part — and the usual culprit.' },
            { t: 'Their DAW resamples MIDI', why: 'MIDI values pass through hosts untouched — the disagreement is at the endpoints.' },
          ],
          answer: 0,
          explain: 'The wheel sends position; the synth decides what it MEANS. Pro synths expose bend range as a setting precisely because this handshake breaks constantly in the wild.',
        },
      },
    ],
  },
  {
    id: 'p15', kind: 'project', title: 'Mission 4: The Choir & The Brake', short: 'Zone mission',
    concepts: ['unison-poly', 'performance'],
    brief: 'The final capabilities: stack detuned unison copies across the stereo field, then install panic — the total state reset every stage-worthy instrument carries. When this mission ends, First Signal is a complete playable synthesizer.',
    steps: [
      {
        note: 'Step 1 — The shimmer math. Cents, not semitones.',
        q: {
          type: 'fill', concept: 'unison-poly',
          prompt: 'Convert a per-copy detune in cents to a frequency ratio.',
          code: 'float cents  = spread * detuneAmount;   // e.g. ±12 cents\ndouble ratio = std::pow(2.0, cents / ___);',
          accept: ['1200.0', '1200', '1200.0f', '1200.f'],
          placeholder: 'divisor',
          hint: '100 cents per semitone, 12 semitones per octave.',
          mistakes: [
            { match: '^12(\\.0f?)?$', msg: 'That reads cents as SEMITONES — ±12 cents of shimmer becomes ±a whole octave of chaos. Cents divide by 1200.' },
          ],
          explain: '2^(cents/1200) — the octave law at cent resolution. A dozen cents is invisible alone and lush in a stack; a dozen SEMITONES is a different genre.',
        },
      },
      {
        note: 'Step 2 — The bill. Unison spends voices; count them before the player does.',
        q: {
          type: 'predict', concept: 'unison-poly',
          prompt: '8-voice pool, 3-voice unison. The player plays a 3-note chord. What happens on the LAST note?',
          code: '// 3 keys × 3 copies = 9 voices wanted, 8 exist',
          options: [
            { t: 'Its third copy triggers the stealing ladder — 9 wanted, 8 exist, someone releasing (or oldest) pays', why: '' },
            { t: 'All 9 copies play', why: 'The pool is physics: 8 cards. The 9th copy must be seated by the ladder, not by wishes.' },
            { t: 'The chord is refused', why: 'Refusing the player is the one policy synths never choose — the ladder absorbs the overflow instead.' },
            { t: 'Unison switches off', why: 'Only if you designed that policy. Default behavior: allocation runs dry and n8 handles it, note by note.' },
          ],
          answer: 0,
          explain: '3 × 3 = 9 > 8: unison multiplies demand, and the ladder eats the overflow. This is why unison modes ship with explicit polyphony budgets.',
        },
      },
      {
        note: 'Step 3 — The brake. Panic is a state reset, not a mute.',
        q: {
          type: 'fill', concept: 'performance',
          prompt: 'Panic must reset the pedal itself, not just the voices.',
          code: 'void allNotesOff(bool hard)\n{\n    for (auto& v : voices)\n    {\n        v.sustained = false;\n        if (hard) { v.adsr.reset(); v.note = -1; }\n        else if (v.adsr.isActive()) v.adsr.noteOff();\n    }\n    pedalDown = ___;\n}',
          accept: ['false'],
          placeholder: 'value',
          hint: 'After a panic, no foot is on anything.',
          explain: 'Every piece of performance state resets: marks, envelopes, and the pedal flag itself. Half a reset (voices silenced, pedal still “down”) just schedules the next stuck note.',
        },
      },
      {
        note: 'Step 4 — Ship check. Diagnose like the engineer you now are.',
        q: {
          type: 'mcq', concept: 'performance',
          prompt: 'Field report: “notes stick — but ONLY in songs where I used the sustain pedal at some point.” Where do you look first?',
          options: [
            { t: 'A stale sustained mark — a reused voice kept its old pedal mark, so its later note-off gets deferred forever. Check that startNote clears it', why: '' },
            { t: 'The oscillator', why: 'Pitch machinery can\'t make notes REFUSE to end — endings live in envelope and pedal bookkeeping.' },
            { t: 'The stealing ladder', why: 'Stealing cuts notes SHORT — the opposite symptom. Notes that overstay point at deferred or lost releases.' },
            { t: 'The buffer size', why: 'Block size affects latency, never note lifetimes — lifecycle bugs are state bugs.' },
          ],
          answer: 0,
          explain: 'The condition (“only after pedal use”) is the fingerprint: stale sustained marks surviving into a voice\'s next life. First Signal is complete — and you just debugged it like a professional. The Forgotten Polysynth is waiting.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss5', kind: 'boss', title: 'BOSS: The Forgotten Polysynth', short: 'Zone 5 boss', passNeed: 5,
    concepts: ['midi-basics', 'allocation', 'performance', 'voices-poly'],
    brief: 'A legendary 1983 8-voice polysynth, reborn as a plugin — badly. Chords lose notes, half the voice cards are dead, lifting one key kills another, everything plays sharp, the pedal murders what you\'re holding, the mod wheel is dead until slammed, and stolen voices go silent. Seven systems, seven faults. Repair 5 and the legend sings again.',
    stages: [
      {
        type: 'bugspot', concept: 'midi-basics',
        prompt: 'Stage 1 — Play a chord tightly: only ONE note sounds. The inbox is being abandoned. Tap where.',
        code: [
          'for (const auto metadata : midiMessages)',
          '{',
          '    const auto msg = metadata.getMessage();',
          '    handleMessage(msg);',
          '    break;',
          '}',
        ],
        buggy: 4,
        explain: 'break exits after the FIRST event — a tight chord delivers several note-ons in one block, and all but one go unread. Remove the break: the loop must drain the whole inbox, every block.',
        fix: 'Delete the break — handle every message in the buffer',
      },
      {
        type: 'bugspot', concept: 'allocation',
        prompt: 'Stage 2 — It claims 8 voices, but a 5-note chord always steals. Half the rack is unreachable. Tap why.',
        code: [
          'Voice* findFreeVoice()',
          '{',
          '    for (int i = 0; i < 4; ++i)',
          '        if (voices[i].note == -1)',
          '            return &voices[i];',
          '    return nullptr;   // voices.size() == 8',
          '}',
        ],
        buggy: 2,
        explain: 'The hunt stops at 4 — voices 4..7 exist, render, and are NEVER offered work: dead cards by loop bound. Hunt the whole rack: i < 8, or better, range-for over voices so the bound can\'t lie.',
        fix: 'for (auto& v : voices)  — never hard-code the pool size twice',
      },
      {
        type: 'bugspot', concept: 'allocation',
        prompt: 'Stage 3 — Lift ANY key and the oldest sounding note dies instead; the lifted note rings on. Tap the ignored clipboard.',
        code: [
          'void stopNote(int note)',
          '{',
          '    for (auto& v : voices)',
          '        if (v.adsr.isActive())',
          '        {',
          '            v.adsr.noteOff();',
          '            return;',
          '        }',
          '}',
        ],
        buggy: 3,
        explain: 'No ownership check: the first active voice pays for every key-up, and the actual owner never releases — wrong victim AND stuck note in one condition. The stamp is the fix: v.note == note && v.adsr.isActive().',
        fix: 'if (v.note == note && v.adsr.isActive())',
      },
      {
        type: 'fill', concept: 'performance',
        prompt: 'Stage 4 — Every note plays exactly 2 semitones sharp until the wheel is yanked fully down. Complete the missing decode step.',
        code: 'int raw = msg.getPitchWheelValue();          // 0..16383, rest = 8192\nfloat centered  = (raw - ___) / 8192.0f;\nfloat semitones = centered * 2.0f;\nbendRatio = std::pow(2.0f, semitones / 12.0f);',
        accept: ['8192', '8192.0', '8192.0f', '8192.f'],
        placeholder: 'center',
        hint: 'Rest position must decode to zero semitones.',
        explain: 'Uncentered, rest reads 8192/8192 = +1.0 → a permanent +2 st bend — the synth is “broken sharp” with a healthy oscillator. Subtract the midpoint and home means home. (Not a subtle detune — two full semitones. The tuner never lies.)',
      },
      {
        type: 'bugspot', concept: 'performance',
        prompt: 'Stage 5 — Pedal-up CUTS the notes you\'re still holding and leaves the pedal wash ringing forever. Tap the inverted filter.',
        code: [
          'void setPedal(bool down)',
          '{',
          '    pedalDown = down;',
          '    if (down) return;',
          '    for (auto& v : voices)',
          '        if (! v.sustained)',
          '            v.adsr.noteOff();',
          '}',
        ],
        buggy: 5,
        explain: 'The filter is inverted: it releases every voice EXCEPT the sustained ones — held keys get chopped, deferred notes stay deferred forever. Release the marked voices (if (v.sustained)), clearing each mark as you fire.',
        fix: 'if (v.sustained) { v.sustained = false; v.adsr.noteOff(); }',
      },
      {
        type: 'mcq', concept: 'performance',
        prompt: 'Stage 6 — The mod wheel does nothing… until slammed to the top, where vibrato snaps to maximum. Diagnose.',
        code: 'vibratoDepth = msg.getControllerValue() / 127;',
        options: [
          { t: 'Integer division: every value below 127 truncates to 0, and 127 gives exactly 1 — dead wheel, then full blast. Divide by 127.0f', why: '' },
          { t: 'The LFO is broken', why: 'The LFO is fine — at full wheel the vibrato works perfectly. Only the DEPTH arithmetic is wrong, and only below the top.' },
          { t: 'CC 1 is the wrong controller', why: 'CC 1 IS the mod wheel — and the wheel demonstrably reaches the code. The division is the culprit.' },
          { t: 'The wheel needs centering like pitch bend', why: 'The mod wheel has no center — it\'s 0..127 one-way. The bug is Zone 1\'s truncation trap, not missing bend math.' },
        ],
        answer: 0,
        explain: 'int / int truncates: 126/127 = 0. One .0f resurrects the whole wheel — Zone 1\'s very first trap, found alive inside a 1983 legend.',
      },
      {
        type: 'bugspot', concept: 'voices-poly',
        prompt: 'Stage 7 — Last fault: everything else repaired, yet the synth is STILL totally silent — every claimed voice is a dead card. claimVoice is the only place the envelope gets started. Tap the wrong call.',
        code: [
          'void claimVoice(Voice& v, int note, float vel)',
          '{',
          '    v.note      = note;',
          '    v.increment = incrementFor(note);',
          '    v.velGain   = vel;',
          '    v.adsr.reset();',
          '}',
        ],
        buggy: 5,
        explain: 'reset() parks the envelope at idle and never starts it — isActive() stays false, the render loop skips the voice, and every claimed note (fresh or stolen) is a silent card. The claim must START a life: v.adsr.noteOn(). (A quick pre-fade before restarting a stolen voice is the polish; the attack is the fix.)',
        fix: 'v.adsr.noteOn();',
      },
    ],
  },
];
