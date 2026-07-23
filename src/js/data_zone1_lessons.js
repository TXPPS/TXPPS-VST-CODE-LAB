/* ============================================================
   ZONE 1 — C++ SIGNAL PATH: lesson content (lessons 1–6).
   Lessons 7–12 are appended in data_zone1_lessons_b.js.

   Teaching structure per lesson (producer-first):
     hook      — a familiar studio situation, before any jargon
     sections  — one idea each: behind-the-scenes → the C++ →
                 breakdown of every piece → where it shows up
     checks    — interactive (ids `${nodeId}.q${n}`; stable!)
     recap     — short bullets
     inside    — 🎛 Inside a Real Plugin panel
     analogyPanel / beginnerMistake / remember — end panels
   Text markup: `code`, **bold**.
   ============================================================ */

const ZONE1_LESSONS = [

  /* ---------------------------------------------------------- L1 */
  {
    id: 'l1', kind: 'lesson', title: 'Signals & Variables', short: 'Variables and types',
    concepts: ['variables', 'types'],
    hook: 'You turn a knob in your favorite synth. You let go. The plugin still knows exactly where you left it — even after you save and reopen the session. Where does that number live?',
    objective: 'Find out where every knob value actually lives — and pick the right kind of number for audio, MIDI and switches.',
    sections: [
      {
        h: 'Every knob is a remembered number',
        body: 'Move the cutoff. Behind the panel, the plugin stores that position as a number, and the DSP reads it constantly. That remembered number is called a **variable** — your first real piece of plugin code.',
        viz: { t: 'knobToVar', knob: 'CUTOFF', code: 'float cutoff = 1200.0f;' },
        code: 'float cutoff = 1200.0f;',
        codeTitle: 'a knob, in code',
        breakdown: [
          ['float', 'the kind of value: a number with a decimal point'],
          ['cutoff', 'the name you chose for it'],
          ['=', 'store what follows inside it'],
          ['1200.0f', 'the value right now — the f says "this is a float"'],
          [';', 'end of the instruction (every one ends with it)'],
        ],
      },
      {
        h: 'Four kinds of values',
        body: 'C++ asks what *kind* of value each variable holds — and you already know all four from your DAW: knob positions and samples are `float`, MIDI notes and counters are `int`, switches are `bool`, and extra-precise things like an oscillator\'s phase use `double`.',
        code: 'float gain = 0.5f;      // knob position\nint   midiNote = 60;    // middle C\nbool  bypassed = false; // on/off switch\ndouble phase = 0.0;     // high-precision position',
        codeTitle: 'the four workhorses',
      },
      {
        h: 'The audio itself is numbers too',
        body: 'Zoom into any waveform: it\'s thousands of tiny measurements, each one a `float`, normally between **-1.0** and **+1.0**. One trap to learn on day one: when two whole numbers divide, C++ throws the remainder away — `3 / 2` gives `1`, not 1.5.',
        viz: { t: 'wave', type: 'samples' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'types',
        prompt: 'A single audio sample flowing through your plugin has the value 0.73. Which type should hold it?',
        options: [
          { t: '`float`', why: '' },
          { t: '`int`', why: 'An int can only hold whole numbers — 0.73 would truncate to 0 and your audio would vanish.' },
          { t: '`bool`', why: 'A bool is only true/false — fine for a bypass switch, useless for a signal value.' },
          { t: '`char`', why: 'A char holds a small integer/character. Audio samples need fractional values.' },
        ],
        answer: 0,
        explain: 'Audio samples are fractional values, normally between -1.0 and +1.0 — and `float` is the sample type you\'ll see all over JUCE and most plugin APIs.',
      },
      {
        type: 'fill', concept: 'types',
        prompt: 'Set the gain to exactly half, using a proper float literal.',
        code: 'float gain = ___;',
        accept: ['0.5f', '0.5F', '.5f', '.5F'],
        placeholder: 'value',
        hint: 'Half is 0.5 — and float literals carry a suffix letter.',
        mistakes: [
          { match: '^0?\\.5$', msg: 'Almost — `0.5` on its own is a double literal. It compiles, but the float habit in audio code is the `f` suffix: `0.5f`.' },
          { match: '^1/2$|^1\\s*/\\s*2$', msg: '`1/2` is integer division, which gives 0 — your plugin would go silent. Write the value directly: `0.5f`.' },
        ],
        explain: '`0.5f` is a float literal. The `f` suffix keeps the value a float from the start instead of creating a double and converting it.',
      },
      {
        type: 'predict', concept: 'types',
        prompt: 'This runs inside a tempo utility. What value ends up in bars?',
        code: 'int beats = 3;\nint bars  = beats / 2;',
        options: [
          { t: '`1`', why: '' },
          { t: '`1.5`', why: 'Both operands are ints, so C++ performs integer division before anything can hold 1.5.' },
          { t: '`2`', why: 'Integer division truncates toward zero — it never rounds up.' },
          { t: 'It fails to compile', why: 'It compiles fine — that\'s what makes this bug so sneaky.' },
        ],
        answer: 0,
        explain: 'Two whole numbers divide as whole numbers — the remainder just gets thrown away, so 3 / 2 is 1. Want to keep the .5? Make at least one side a float: `beats / 2.0f`.',
      },
    ],
    recap: [
      '`float` for samples, `int` for counts and MIDI, `bool` for switches, `double` for precision math.',
      'Samples normally live between -1.0 and +1.0.',
      'Use the `f` suffix on float literals: `0.5f`.',
      'int / int truncates — a classic silent DSP bug.',
    ],
    inside: [
      { name: 'Synth', use: 'cutoff, resonance, osc mix — every panel control is a float underneath' },
      { name: 'Sampler', use: 'start point and loop points are ints — counted in samples' },
      { name: 'Delay', use: 'delay time and feedback amount live in floats' },
      { name: 'Compressor', use: 'threshold and ratio: floats the DSP reads on every sample' },
      { name: 'Any plugin', use: 'the bypass switch is a bool; MIDI notes arrive as ints (0–127)' },
    ],
    analogyPanel: 'A variable is the memory behind a knob. The knob is just the handle you grab — the number it stores is what the DSP actually reads, thousands of times a second.',
    beginnerMistake: 'Expecting `3 / 2` to give 1.5. When both sides are whole numbers, C++ drops the remainder — the classic cause of a "50% mix" knob that outputs silence. Make one side a float: `3 / 2.0f`.',
    remember: 'Every knob you have ever moved is just a number stored in a variable.',
  },

  /* ---------------------------------------------------------- L2 */
  {
    id: 'l2', kind: 'lesson', title: 'Locked Controls: const', short: 'const and constexpr',
    concepts: ['const'],
    hook: 'Your session runs at 48 kHz. Imagine if any plugin could quietly change that mid-take. Some values must be set once — then locked.',
    objective: 'Lock the values that should never change, so mistakes get caught before they can ever reach your speakers.',
    sections: [
      {
        h: 'Some numbers must not move',
        body: 'A plugin learns the sample rate when the session starts, and from then on nothing should touch it. In C++ you write that rule into the code with one word: `const`. Any code that tries to change a locked value simply **refuses to build**. (Its stricter cousin `constexpr` locks a value even before the plugin runs.)',
        code: 'const float sampleRate = 48000.0f;\n\nsampleRate = 44100.0f; // ✗ refuses to build',
        codeTitle: 'a locked value',
        breakdown: [
          ['const', '"locked — read it, never rewrite it"'],
          ['float', 'still an ordinary decimal number'],
          ['sampleRate', 'the name'],
          ['= 48000.0f', 'set once, right here — the only chance'],
        ],
      },
      {
        h: 'Lending values without risk',
        body: 'Plugins hand big things around constantly — a preset, a wavetable. Copying them every time would burn CPU. Instead, C++ *lends* the original marked read-only: like sharing your project file as **view-only**. The `&` means "the original, not a copy" — a full lesson on it is coming soon.',
        viz: { t: 'chain', nodes: ['your Preset', 'view-only loan', 'showPreset()'], accent: 1, caption: 'no copy made — and it can\'t be modified' },
        code: 'void showPreset(const Preset& preset)\n{\n    // look, don\'t touch\n}',
        codeTitle: 'read-only lending',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'const',
        prompt: 'What does marking a variable `const` actually do?',
        options: [
          { t: 'The compiler refuses to build any code that modifies it', why: '' },
          { t: 'It can still change, but changes print a warning at runtime', why: 'const is enforced at compile time — the build fails, it never becomes a runtime warning.' },
          { t: 'It makes the variable global', why: 'const affects mutability, not scope or visibility.' },
          { t: 'It automatically converts the value to float', why: 'const never changes a variable\'s type — only whether it can be written to.' },
        ],
        answer: 0,
        explain: 'const is a promise the compiler enforces: try to change the value and the build simply fails. Bugs the compiler catches are bugs you never have to debug in a DAW.',
      },
      {
        type: 'fill', concept: 'const',
        prompt: 'The session sample rate must never be accidentally changed after setup. Lock it.',
        code: '___ float sampleRate = 44100.0f;',
        accept: ['const', 'constexpr'],
        placeholder: 'keyword',
        hint: 'One keyword makes it read-only.',
        explain: '`const` makes the value read-only after initialization. `constexpr` also works here and goes further: the value is fixed at compile time. Real plugins receive the actual sample rate at runtime in `prepareToPlay`, so plain `const` is the everyday tool.',
      },
      {
        type: 'mcq', concept: 'const',
        prompt: 'A function only needs to *read* a large `WaveTable` object. Which parameter style is best?',
        options: [
          { t: '`const WaveTable& table` — const reference', why: '' },
          { t: '`WaveTable table` — by value', why: 'By value copies the entire wavetable every call — wasted memory traffic, and pointless when you only read it.' },
          { t: '`WaveTable& table` — mutable reference', why: 'No copy, but it advertises that the function may modify the table — a false promise that hides intent.' },
          { t: '`bool table` — convert it first', why: 'A wavetable can\'t meaningfully become a bool — this loses all the data.' },
        ],
        answer: 0,
        explain: 'Const reference is the standard way to read a big object: no copy is made, and the compiler guarantees the function can\'t modify the caller\'s object.',
      },
    ],
    recap: [
      '`const` is a compile-time lock — try to modify it and the build fails.',
      '`constexpr` goes further — the value is fixed at compile time.',
      'Pass large read-only objects by `const&` to skip the copy.',
      'Default to const; drop it only where you actually mean to change the value.',
    ],
    inside: [
      { name: 'Synth', use: 'twoPi and tuning constants inside every oscillator' },
      { name: 'Delay', use: 'the maximum delay time — fixed when the buffer is sized' },
      { name: 'Reverb', use: 'the room-model constants that define the algorithm' },
      { name: 'Any plugin', use: 'reading parameter values in the audio path without modifying them' },
    ],
    analogyPanel: '`const` is the locked sample rate of a rolling session: everyone can read it, nobody flips it mid-take.',
    beginnerMistake: 'Leaving everything changeable "to keep it simple" — then spending a night hunting whoever changed a value. Lock what shouldn\'t move and the compiler does the hunting for you, instantly.',
    remember: 'If a value should never change, say so with const — and let the compiler stand guard.',
  },

  /* ---------------------------------------------------------- L3 */
  {
    id: 'l3', kind: 'lesson', title: 'Functions: Signal In, Signal Out', short: 'Functions, parameters, returns',
    concepts: ['functions'],
    hook: 'Every pedal on your board does one job: signal goes in, the circuit works, signal comes out. C++ has the exact same building block.',
    objective: 'Build and read the "pedals" of C++ — named blocks of processing with inputs, a circuit, and an output.',
    sections: [
      {
        h: 'A function is a pedal',
        body: 'A **function** is a named block of processing: feed it values, it does its one job, it hands the result back. Here\'s a one-knob gain pedal, in code:',
        viz: { t: 'chain', nodes: ['sample in', 'applyGain()', 'sample out'], accent: 1 },
        code: 'float applyGain(float sample, float gain)\n{\n    return sample * gain;\n}',
        codeTitle: 'a gain pedal, in code',
        breakdown: [
          ['float (first)', 'what comes out: one processed sample'],
          ['applyGain', 'the pedal\'s name'],
          ['(float sample, float gain)', 'the inputs: the signal, plus the knob setting'],
          ['return sample * gain;', 'do the job, send the result out the output jack'],
        ],
      },
      {
        h: 'Plugging in',
        body: 'Calling the function runs a signal through the pedal: `applyGain(0.8f, 0.5f)` hands back `0.4f`. Store the result, or feed it straight into the next function — pedals into pedals, exactly like an FX chain. A function marked `void` returns nothing: it just *acts*, like tapping a footswitch.',
        code: 'float out = applyGain(0.8f, 0.5f); // out == 0.4f\n\nvoid reset()   // acts — returns nothing\n{\n    // clear state here\n}',
        codeTitle: 'calling functions',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'functions',
        prompt: 'In `float applyGain(float sample, float gain)`, what does the first `float` declare?',
        options: [
          { t: 'The type of value the function returns', why: '' },
          { t: 'The type of the first parameter', why: 'Parameter types sit inside the parentheses. The leading type is what the function gives back.' },
          { t: 'That the function runs on the audio thread', why: 'C++ signatures say nothing about threads — that\'s architecture, not syntax.' },
          { t: 'The function\'s memory usage', why: 'Signatures declare types, not resource usage.' },
        ],
        answer: 0,
        explain: 'The leading type is the return type — the type of the value that comes out of the function. Here: one processed float sample.',
      },
      {
        type: 'fill', concept: 'functions',
        prompt: 'Complete the body: output the sample scaled by the gain.',
        code: 'float applyGain(float sample, float gain)\n{\n    return ___;\n}',
        accept: ['sample * gain', 'sample*gain', 'gain * sample', 'gain*sample'],
        placeholder: 'expression',
        hint: 'Gain is a multiplier — the same math as a fader.',
        mistakes: [
          { match: '\\+', msg: 'Adding gain would shift the waveform up (DC offset), not make it louder. Gain scales a signal: multiply.' },
        ],
        explain: 'Gain is multiplication: `sample * gain`. A gain of 0.5 halves the amplitude (about -6 dB), 1.0 is unity, 2.0 doubles it (+6 dB).',
      },
      {
        type: 'match', concept: 'functions',
        prompt: 'Match each function concept to its pedalboard equivalent.',
        left: ['parameters', 'function body', 'return value', 'calling the function'],
        right: ['input jack + knob settings you hand it', 'the circuitry inside the enclosure', 'the processed signal at the output jack', 'plugging a signal through the pedal'],
        explain: 'Parameters in, circuitry inside, processed signal out — every function call is one pass through a pedal.',
      },
    ],
    recap: [
      'A signature is three parts: the return type, the name, and the parameter list.',
      'Arguments are copied into parameters; `return` sends one value back.',
      '`void` functions act instead of answering.',
      'Don\'t discard a return value you needed.',
    ],
    inside: [
      { name: 'EQ', use: 'each band is a function: sample in, shaped sample out' },
      { name: 'Distortion', use: 'the waveshaper is one function applied to every sample' },
      { name: 'Synth', use: 'nextSample() on an oscillator — you\'ll write it in this zone' },
      { name: 'Delay', use: 'read and write functions move audio through the delay line' },
    ],
    analogyPanel: 'Functions are pedals: parameters are the input jack plus knob settings, the body is the circuit, return is the output jack — and calling one is plugging your signal through it.',
    beginnerMistake: 'Running a signal through the pedal and never patching the output: `applyGain(x, 0.5f);` on its own line computes the result and throws it away. Store it: `x = applyGain(x, 0.5f);`.',
    remember: 'Signal in, processing inside, signal out — every function is a pedal.',
  },

  /* ---------------------------------------------------------- L4 */
  {
    id: 'l4', kind: 'lesson', title: 'Gates & Thresholds: if / else', short: 'Branching with if/else',
    concepts: ['control-flow'],
    hook: 'Watch a noise gate on a vocal bus. Quiet room — closed. The singer leans in — open. The gate is making a decision, thousands of times a second.',
    objective: 'Teach your code to make decisions — the same threshold logic behind every gate, compressor and limiter.',
    sections: [
      {
        h: 'Code that decides',
        body: '`if` runs code only when a condition is true; `else` covers everything else. That\'s a gate: **if** the input rises above the threshold, let signal through — **else**, stay closed.',
        viz: { t: 'gate' },
        code: 'if (input > threshold)\n    open();    // signal passes\nelse\n    close();   // silence',
        codeTitle: 'a noise gate, in code',
      },
      {
        h: 'Chains of decisions',
        body: 'Stack alternatives with `else if`. The chain checks top to bottom and runs exactly **one** branch — like a meter deciding which LED to light. (In the checks you\'ll also meet `std::cout << "text"` — that\'s simply C++ for "print this to the screen.")',
        code: 'if (level > 0.9f)\n    state = "hot";\nelse if (level > 0.5f)\n    state = "healthy";\nelse\n    state = "quiet";',
        codeTitle: 'level meter logic',
      },
      {
        h: 'The one-character disaster',
        body: 'One equals sign **stores**; two equals signs **compare**. `if (bypass = true)` doesn\'t check your bypass switch — it *rewrites* it, and the branch always runs. For switches, skip the comparison entirely:',
        mistake: { code: 'if (bypass = true)   // ✗ REWRITES bypass, always runs\nif (bypass == true)  // compares — what you meant\nif (bypass)          // cleanest for switches', text: 'Compilers warn about `=` inside a condition. Treat that warning like a clip light.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'control-flow',
        prompt: 'A gate should open when the input rises above the threshold. Which condition is correct?',
        options: [
          { t: '`if (input > threshold)`', why: '' },
          { t: '`if (input < threshold)`', why: 'That opens the gate when the signal is *below* the threshold — an inverted gate that mutes your loud parts.' },
          { t: '`if (input = threshold)`', why: 'Single = assigns threshold into input, destroying the sample value. You want a comparison.' },
          { t: '`if (threshold)`', why: 'That only tests whether threshold is non-zero — it ignores the input completely.' },
        ],
        answer: 0,
        explain: '`>` compares the two values: the branch runs only while the input exceeds the threshold — exactly a gate opening.',
      },
      {
        type: 'predict', concept: 'control-flow',
        prompt: 'What does this print?',
        code: 'float level = 0.4f;\n\nif (level > 0.5f)\n    std::cout << "LOUD";\nelse if (level > 0.25f)\n    std::cout << "MEDIUM";\nelse\n    std::cout << "quiet";',
        options: [
          { t: '`MEDIUM`', why: '' },
          { t: '`LOUD`', why: '0.4 is not greater than 0.5, so the first branch is skipped.' },
          { t: '`quiet`', why: 'The chain stops at the first true condition — 0.4 > 0.25, so the else never runs.' },
          { t: '`MEDIUMquiet`', why: 'Only one branch of an if / else-if / else chain ever runs.' },
        ],
        answer: 0,
        explain: '0.4 fails the first test (> 0.5) but passes the second (> 0.25), so MEDIUM prints and the rest of the chain is skipped.',
      },
      {
        type: 'mcq', concept: 'control-flow',
        prompt: 'What actually happens here?',
        code: 'bool bypass = false;\nif (bypass = true)\n    skipProcessing();',
        options: [
          { t: 'bypass is set to true and skipProcessing() always runs', why: '' },
          { t: 'It compares bypass to true, which is false, so nothing runs', why: 'That would need `==`. A single `=` is assignment, not comparison.' },
          { t: 'It fails to compile', why: 'Assignment inside a condition is legal C++ — that\'s exactly why it\'s dangerous. Most compilers only warn.' },
          { t: 'Undefined behavior', why: 'It\'s well-defined — just well-defined to do the wrong thing: assign, then branch on the assigned value.' },
        ],
        answer: 0,
        explain: '`bypass = true` assigns, and the whole expression evaluates to true — so the branch always runs and your bypass state is silently overwritten. Write `if (bypass)` and this trap disappears.',
      },
    ],
    recap: [
      'if / else if / else — exactly one branch runs.',
      'Threshold logic is the heart of gates, compressors and envelopes.',
      '`=` assigns, `==` compares. For bools, just `if (flag)`.',
      'Treat compiler warnings on conditions as errors.',
    ],
    inside: [
      { name: 'Gate / Comp', use: 'threshold logic is literally if (level > threshold)' },
      { name: 'Limiter', use: 'if the peak would clip, turn it down — a decision per sample' },
      { name: 'Synth', use: 'if a voice has gone silent, it can be reused for the next note' },
      { name: 'Any plugin', use: 'if bypassed, skip the processing entirely' },
    ],
    analogyPanel: 'if/else is a gate: above threshold the branch opens, otherwise the else path runs. Compressors, limiters and envelope followers are threshold decisions all the way down.',
    beginnerMistake: 'Typing `=` when you mean `==`. One stores, two compare — and `if (x = 1)` silently rewrites x. Write `if (bypass)` for switches and the trap can\'t happen.',
    remember: 'A gate is just an if statement with good marketing.',
  },

  /* ---------------------------------------------------------- L5 */
  {
    id: 'l5', kind: 'lesson', title: 'The Waveform Selector: switch', short: 'switch statements',
    concepts: ['control-flow'],
    hook: 'Reach for the OSC section on any synth: SINE / SAW / SQUARE / NOISE. One selector, a handful of fixed positions. C++ has a statement shaped exactly like that knob.',
    objective: 'Handle fixed-position choices — waveforms, filter modes, algorithms — with the selector statement built for them.',
    sections: [
      {
        h: 'One knob, fixed positions',
        body: 'When one integer-like value picks between **fixed options**, `switch` says it more clearly than a pile of if/elses. Each `case` is one click of the selector; `default` is the "anything else" position. It works on whole-number values (int, char, enums) — not floats.',
        viz: { t: 'selector', options: ['SINE', 'SAW', 'SQUARE', 'NOISE'], active: 1 },
        code: 'switch (waveform) {\n    case 0:  name = "sine";   break;\n    case 1:  name = "saw";    break;\n    case 2:  name = "square"; break;\n    default: name = "noise";  break;\n}',
        codeTitle: 'the waveform selector',
      },
      {
        h: 'break — where a position ends',
        body: 'Cases don\'t end themselves. Without `break`, the code **falls through** into the next case and keeps running — the selector "leaks" into the next position. In a synth, that bug sounds like *"why does saw also trigger square?"*',
        mistake: { code: 'case 1: name = "saw";      // no break!\ncase 2: name = "square";   // runs too — saw is overwritten', text: 'If a fallthrough is ever intentional, say so loudly with a comment (or `[[fallthrough]];`) so nobody "fixes" it.' },
        warn: 'In Zone 2 you\'ll upgrade raw numbers to `enum class Waveform` — then the compiler can even warn you when a selector position is missing.',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'control-flow',
        prompt: 'One break is missing. What does this print?',
        code: 'int wave = 1;\nswitch (wave) {\n    case 0: std::cout << "sine";   break;\n    case 1: std::cout << "saw";\n    case 2: std::cout << "square"; break;\n    default: std::cout << "noise"; break;\n}',
        options: [
          { t: '`sawsquare`', why: '' },
          { t: '`saw`', why: 'case 1 has no break, so execution falls straight through into case 2.' },
          { t: '`sawsquarenoise`', why: 'case 2 does have a break — the fallthrough stops there.' },
          { t: '`square`', why: 'wave is 1, so execution enters at case 1 first.' },
        ],
        answer: 0,
        explain: 'Execution enters at case 1, prints "saw", and — with no break — falls through into case 2 and prints "square" before the break there stops it.',
      },
      {
        type: 'fill', concept: 'control-flow',
        prompt: 'Stop the fallthrough: complete case 1 so only "saw" is selected.',
        code: 'case 1:\n    name = "saw";\n    ___\ncase 2:\n    name = "square";\n    break;',
        accept: ['break;', 'break'],
        placeholder: 'statement',
        hint: 'One keyword exits the switch.',
        explain: '`break;` exits the switch immediately. Without it, case 1 keeps executing into case 2 and "saw" is overwritten by "square".',
      },
      {
        type: 'mcq', concept: 'control-flow',
        prompt: 'Which of these can a `switch` statement branch on?',
        options: [
          { t: 'Integer-like values: `int`, `char`, and enums', why: '' },
          { t: 'Floats, so you can switch on a gain value', why: 'Floats can\'t be switch conditions — exact float equality is unreliable anyway. Use if/else with thresholds.' },
          { t: '`std::string` values', why: 'C++ switch doesn\'t accept strings. Use if/else comparisons or map strings to enums first.' },
          { t: 'Anything that can be compared with ==', why: 'switch is restricted to integral types — much narrower than == comparability.' },
        ],
        answer: 0,
        explain: 'switch requires an integral type: ints, chars, enums. Mode selectors are the natural fit — continuous values like gain belong in if/else threshold logic.',
      },
    ],
    recap: [
      'A rotary mode selector for integer-like values — that\'s all a switch is.',
      'Every case needs `break` unless fallthrough is deliberate.',
      'default catches unknown values.',
      'enum class (Zone 2) makes selectors type-safe.',
    ],
    inside: [
      { name: 'Synth', use: 'waveform selectors and filter-type switches (LP / HP / BP)' },
      { name: 'Sampler', use: 'play mode: one-shot / loop / ping-pong' },
      { name: 'Delay', use: 'sync mode: free / 1/4 / 1/8 dotted' },
      { name: 'Reverb', use: 'algorithm choice: room / hall / plate' },
    ],
    analogyPanel: 'switch is a rotary selector: whole-number positions, each wired to its own circuit, with default as the "anything else" position.',
    beginnerMistake: 'Forgetting `break`. Without it the selector leaks into the next position — saw also triggers square. Every case ends with break unless you loudly mean otherwise.',
    remember: 'switch is a rotary selector; break is the click that stops it turning further.',
  },

  /* ---------------------------------------------------------- L6 */
  {
    id: 'l6', kind: 'lesson', title: 'The Block Loop', short: 'Loops over buffers',
    concepts: ['loops'],
    hook: 'Your DAW never asks a plugin for one sample. It hands over a block — say 512 samples — and says: process all of these, right now. The tool for "do this to every sample" is a loop.',
    objective: 'Write the loop at the heart of every plugin: visit each sample in a block exactly once.',
    sections: [
      {
        h: 'The block loop',
        body: 'Audio arrives in **blocks**. Your code walks through the block one sample at a time with a `for` loop — a counter that starts at the first slot, moves one step per pass, and stops at the end. This is the single most important pattern in audio programming:',
        viz: { t: 'buffer', n: 8, cursor: 2, highlight: 2, label: 'ONE BLOCK OF SAMPLES', caption: 'the counter i visits every slot exactly once' },
        code: 'for (int i = 0; i < numSamples; ++i)\n{\n    buffer[i] = buffer[i] * gain;\n}',
        codeTitle: 'the canonical block loop',
        breakdown: [
          ['int i = 0', 'start a counter at the first slot (slot zero!)'],
          ['i < numSamples', 'keep going while samples remain'],
          ['++i', 'step to the next sample after each pass'],
          ['buffer[i]', 'the sample the counter is currently pointing at'],
        ],
      },
      {
        h: 'Counting from zero, stopping before the end',
        body: 'Slots are numbered from **0**, so a 512-sample block has slots 0 through **511**. That\'s why the condition is `i < numSamples` — the `<=` version takes one step too many, into memory that isn\'t yours. (`for` when you know the count; `while` for open-ended repeats.)',
        mistake: { code: 'for (int i = 0; i <= numSamples; ++i) // ✗ one step too far\n                                       // touches buffer[numSamples]', text: 'That one extra step is **undefined behavior**: maybe a click, maybe a crash in the DAW three minutes later. The safe habit: start at 0, compare with `<`.' },
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'loops',
        prompt: 'Complete the loop condition to visit every sample exactly once — and never step past the end.',
        code: 'for (int i = 0; ___; ++i)\n{\n    buffer[i] *= gain;\n}',
        accept: ['i < numSamples', 'i<numSamples', 'numSamples > i', 'numSamples>i', 'i != numSamples', 'i!=numSamples'],
        placeholder: 'condition',
        forbidden: ['<='],
        hint: 'Valid indexes are 0 up to numSamples - 1.',
        mistakes: [
          { match: '<=', msg: '`<=` runs the loop one extra time and reads `buffer[numSamples]` — one past the end. That\'s undefined behavior. Use `<`.' },
          { match: '^i\\s*<\\s*numSamples\\s*-\\s*1$', msg: 'That stops one sample early — the last sample never gets processed. `i < numSamples` is exactly right.' },
        ],
        explain: '`i < numSamples` visits indexes 0 … numSamples-1: every sample exactly once, never out of bounds. (`i != numSamples` also works here, but `<` is the defensive habit — it still terminates if i ever skips past the boundary.)',
      },
      {
        type: 'predict', concept: 'loops',
        prompt: 'How many times does the body run?',
        code: 'int count = 0;\nfor (int i = 0; i < 4; ++i)\n    ++count;',
        options: [
          { t: '4 times (i = 0, 1, 2, 3)', why: '' },
          { t: '5 times', why: 'The loop stops as soon as i reaches 4 — the condition 4 < 4 is false.' },
          { t: '3 times', why: 'Count them: i = 0, 1, 2, 3 — that\'s four passes.' },
          { t: 'Forever', why: '++i moves i toward 4 every pass, so the condition eventually fails.' },
        ],
        answer: 0,
        explain: 'Zero-based counting: i takes the values 0, 1, 2, 3 — four passes — and the loop exits when i becomes 4. A 4-sample buffer processed exactly once per sample.',
      },
      {
        type: 'mcq', concept: 'loops',
        prompt: 'You know the block contains exactly `numSamples` samples. Which loop fits best?',
        options: [
          { t: 'A `for` loop — the count is known up front', why: '' },
          { t: 'A `while (true)` loop with a break inside', why: 'That works but hides the count and invites infinite-loop bugs. In an audio callback, an unbounded loop can glitch the whole DAW.' },
          { t: 'Recursion — the function calls itself per sample', why: 'Recursion burns stack per call and risks overflow at large block sizes. Audio code uses plain loops.' },
          { t: 'No loop — process the whole block in one statement', why: 'Some vectorized helpers exist (you\'ll meet juce::FloatVectorOperations later), but the fundamental model is the per-sample loop.' },
        ],
        answer: 0,
        explain: 'When you know the count up front, reach for a `for` loop. It puts the start, end and step on one line, so a reader — or a reviewer — can check the bounds at a glance.',
      },
    ],
    recap: [
      'DAWs deliver audio in blocks; plugins loop over each sample.',
      'The canonical loop: `for (int i = 0; i < numSamples; ++i)`.',
      'Indexes run 0 … n-1: `<` not `<=`.',
      'Known count → for; open-ended → while.',
    ],
    inside: [
      { name: 'Every effect', use: 'processBlock is this exact loop wrapped around your DSP' },
      { name: 'Synth', use: 'each voice renders its part of the block in a loop' },
      { name: 'Delay', use: 'one loop moves audio through the delay line, sample by sample' },
      { name: 'Meter', use: 'a loop finds the loudest sample in each block' },
    ],
    analogyPanel: 'The DAW is a tape machine handing you one reel (block) at a time; the loop is you rolling through that reel sample by sample. That repeated hand-off is the audio callback you\'ll meet in Zone 3.',
    beginnerMistake: 'Writing `<=` and stepping one slot past the end of the block. That single extra pass is undefined behavior — the click-today, crash-tomorrow kind of bug.',
    remember: 'for (int i = 0; i < numSamples; ++i) — the most important line in audio programming.',
  },
];
