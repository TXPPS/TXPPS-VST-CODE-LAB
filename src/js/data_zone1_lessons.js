/* ============================================================
   ZONE 1 — C++ SIGNAL PATH: lesson content.
   Shape: { id, kind:'lesson', title, short, concepts, objective,
            sections:[{h, body, code?, codeTitle?, analogy?, mistake?, warn?}],
            checks:[Question...], recap:[...] }
   Question ids are assigned as `${nodeId}.q${n}` when indexed.
   Text markup: `code`, **bold**.
   ============================================================ */

const ZONE1_LESSONS = [

  /* ---------------------------------------------------------- L1 */
  {
    id: 'l1', kind: 'lesson', title: 'Signals & Variables', short: 'Variables and types',
    concepts: ['variables', 'types'],
    objective: 'Choose the right C++ type for audio data, MIDI data and on/off state — and understand why samples are floats.',
    sections: [
      {
        h: 'Every value needs a type',
        body: 'In C++ every variable declares its **type** up front, and the type never changes. Audio code leans on four workhorses: `float` for signal values, `int` for counts and MIDI data, `bool` for on/off state, and `double` for high-precision math like phase accumulators.',
        code: 'float gain = 0.5f;      // signal level\nint   midiNote = 60;    // middle C\nbool  bypassed = false; // on/off state\ndouble phase = 0.0;     // high-precision position',
        codeTitle: 'four workhorse types',
        analogy: 'A patch cable carries audio, a MIDI cable carries notes, a footswitch carries on/off. You never plug a MIDI cable into an audio input — C++ types are the same idea: each variable is a jack that only accepts one kind of value.',
      },
      {
        h: 'Samples are floats',
        body: 'Inside a plugin, one audio **sample** is a `float`, usually between **-1.0 and +1.0** — the same range you see on a bipolar waveform display. The `f` suffix (`0.5f`) marks a float literal; without it, `0.5` is a `double` that gets converted, which is a silent extra step you don\'t want scattered through DSP code.',
        mistake: { text: 'Writing `float gain = 0.5;` compiles, but the literal is a `double` first. Harmless once — noisy and sloppy across thousands of DSP lines. Get in the habit: `0.5f`.' },
      },
      {
        h: 'Integer math truncates',
        body: 'When both sides of a division are `int`, C++ performs **integer division** and throws away the remainder: `3 / 2` is `1`, not `1.5`. This is a top-five source of silent DSP bugs — a half-speed LFO or a detune that never detunes. If you want fractional results, make at least one side a float: `3 / 2.0f`.',
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
        explain: 'Audio samples are fractional values, normally in the -1.0 to +1.0 range, and `float` is the standard sample type in JUCE and most plugin APIs.',
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
        explain: 'int / int is integer division: the fractional part is discarded, so 3 / 2 is 1. To keep the .5, at least one side must be floating point: `beats / 2.0f`.',
      },
    ],
    recap: [
      '`float` for samples, `int` for counts and MIDI, `bool` for switches, `double` for precision math.',
      'Samples normally live between -1.0 and +1.0.',
      'Use the `f` suffix on float literals: `0.5f`.',
      'int / int truncates — a classic silent DSP bug.',
    ],
  },

  /* ---------------------------------------------------------- L2 */
  {
    id: 'l2', kind: 'lesson', title: 'Locked Controls: const', short: 'const and constexpr',
    concepts: ['const'],
    objective: 'Use const to make values read-only, so the compiler catches accidental modification for you.',
    sections: [
      {
        h: 'const means read-only',
        body: 'Mark a variable `const` and the compiler **rejects any code that tries to change it**. That\'s not a runtime check — it\'s a compile-time guarantee, caught before the plugin ever runs. Values that are known at compile time can go further and use `constexpr`.',
        code: 'const float maxGain = 2.0f;\nconstexpr float twoPi = 6.28318530718f;\n\nmaxGain = 3.0f; // ERROR: assignment of read-only variable',
        codeTitle: 'const in action',
        analogy: 'Once a session is rolling, the sample rate is locked — nobody flips a session from 44.1k to 96k mid-take. `const` puts that same lock on a value: anyone who reaches for it gets stopped at the door.',
      },
      {
        h: 'const parameters protect callers',
        body: 'Big objects are expensive to copy, so C++ often passes them **by const reference**: `const Preset& p`. The reference avoids the copy, and the `const` promises the function will only *read* the object. The caller hands over the original, knowing it can\'t be modified.',
        code: 'void printPresetName(const Preset& preset)\n{\n    // read-only access: fast, and provably safe\n}',
        codeTitle: 'const reference parameter',
        mistake: { text: 'Beginners default everything to mutable and hunt down "who changed this value?" bugs later. Professionals default to `const` and remove it only where mutation is genuinely needed.' },
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
        explain: 'const is a compile-time contract: any attempt to modify the value is a build error. Bugs the compiler catches are bugs you never have to debug in a DAW.',
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
        explain: 'Const reference is the standard for read-only access to anything non-trivial: no copy is made, and the compiler guarantees the function can\'t modify the caller\'s object.',
      },
    ],
    recap: [
      '`const` = compile-time lock: modification becomes a build error.',
      '`constexpr` = fixed at compile time.',
      'Pass large read-only objects by `const&` to skip the copy.',
      'Default to const; remove it only where mutation is intended.',
    ],
  },

  /* ---------------------------------------------------------- L3 */
  {
    id: 'l3', kind: 'lesson', title: 'Functions: Signal In, Signal Out', short: 'Functions, parameters, returns',
    concepts: ['functions'],
    objective: 'Read and write function signatures: return type, name, parameters — and understand the flow of data through a call.',
    sections: [
      {
        h: 'Anatomy of a function',
        body: 'A function is a named, reusable block of processing. Its **signature** tells you everything about how to use it: what comes out (**return type**), what it\'s called, and what goes in (**parameters**).',
        code: '//  return   name       parameters\n//  ┌─┴──┐ ┌───┴───┐ ┌──────────┴──────────┐\n    float  applyGain (float sample, float gain)\n    {\n        return sample * gain;  // the output\n    }',
        codeTitle: 'signature anatomy',
        analogy: 'A function is a pedal on your board. Parameters are the input jack plus the knob settings you hand it; the body is the circuitry inside; the return value is the processed signal at the output jack. Calling the function is plugging a signal through the pedal.',
      },
      {
        h: 'Calling and using the result',
        body: 'When you call `applyGain(0.8f, 0.5f)`, the arguments are copied into the parameters, the body runs, and `return` sends a value back to wherever the call happened. A function with return type `void` returns nothing — it acts, rather than answers.',
        code: 'float out = applyGain(0.8f, 0.5f); // out == 0.4f\n\nvoid reset()   // returns nothing — it just acts\n{\n    // clear state here\n}',
        codeTitle: 'calling functions',
        mistake: { text: 'Calling a non-void function and ignoring its return value — `applyGain(x, 0.5f);` on its own line — computes the result and throws it away. The signal was processed, but nothing was patched to the output.' },
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
      'Signature = return type, name, parameter list.',
      'Arguments are copied into parameters; `return` sends one value back.',
      '`void` functions act instead of answering.',
      'Don\'t discard a return value you needed.',
    ],
  },

  /* ---------------------------------------------------------- L4 */
  {
    id: 'l4', kind: 'lesson', title: 'Gates & Thresholds: if / else', short: 'Branching with if/else',
    concepts: ['control-flow'],
    objective: 'Route program flow with if / else if / else, and dodge the = vs == trap.',
    sections: [
      {
        h: 'Branching on a condition',
        body: 'An `if` statement runs code only when a condition is true. Chain alternatives with `else if`, and catch everything else with `else`. Exactly **one** branch of the chain runs.',
        code: 'if (level > 0.9f)\n    state = "hot";\nelse if (level > 0.5f)\n    state = "healthy";\nelse\n    state = "quiet";',
        codeTitle: 'level meter logic',
        analogy: 'A noise gate is a living if-statement: **if** the input rises above the threshold, the gate opens and signal passes; **else**, it stays closed. Compressors, limiters and envelope followers are all built on threshold branches like this.',
      },
      {
        h: 'The = vs == trap',
        body: 'One equals sign **assigns**; two equals signs **compare**. Writing `if (bypass = true)` doesn\'t test bypass — it *sets* it to true, and the condition then evaluates that assigned value. The branch always runs and your state is silently corrupted. Compilers warn about this; treat that warning as an error.',
        mistake: { code: 'if (bypass = true)   // ASSIGNS true, always runs!\n    return;\n\nif (bypass == true)  // compares — what you meant\nif (bypass)          // cleanest for bools', text: 'For bools, skip the comparison entirely: `if (bypass)` reads best and can\'t fall into the trap.' },
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
  },

  /* ---------------------------------------------------------- L5 */
  {
    id: 'l5', kind: 'lesson', title: 'The Waveform Selector: switch', short: 'switch statements',
    concepts: ['control-flow'],
    objective: 'Select between fixed modes with switch/case, and never forget what break does.',
    sections: [
      {
        h: 'One value, many modes',
        body: 'When you branch on **one integer-like value with a fixed set of options** — a waveform selector, a filter mode, an FX slot — `switch` says it more clearly than a ladder of else-ifs. Each `case` is one position of the selector; `default` is the fallback.',
        code: 'switch (waveform) {\n    case 0:  name = "sine";   break;\n    case 1:  name = "saw";    break;\n    case 2:  name = "square"; break;\n    default: name = "noise";  break;\n}',
        codeTitle: 'waveform selector',
        analogy: 'This is a hardware rotary switch: one knob, discrete positions, each wired to a different circuit. `switch` works on integer-like values (int, char, enums) — not floats or strings.',
      },
      {
        h: 'break, or fall through',
        body: 'Cases don\'t end themselves. Without `break`, execution **falls through** into the next case and keeps going. Occasionally that\'s used deliberately — but forgetting a `break` is one of the oldest bugs in C, and in a synth it sounds like "why does saw also trigger square?"',
        mistake: { code: 'case 1: name = "saw";      // no break!\ncase 2: name = "square";   // runs too — saw is overwritten', text: 'If a fallthrough is ever intentional, say so loudly with a comment (or `[[fallthrough]];`) so no one "fixes" it.' },
        warn: 'Modern compilers can warn on unintentional fallthrough. In Zone 2 you\'ll upgrade raw ints to `enum class Waveform` so the compiler can also warn when a case is missing entirely.',
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
      'switch = a rotary mode selector for integer-like values.',
      'Every case needs `break` unless fallthrough is deliberate.',
      'default catches unknown values.',
      'enum class (Zone 2) makes selectors type-safe.',
    ],
  },

  /* ---------------------------------------------------------- L6 */
  {
    id: 'l6', kind: 'lesson', title: 'The Block Loop', short: 'Loops over buffers',
    concepts: ['loops'],
    objective: 'Write the loop at the heart of every plugin: visit each sample in a buffer exactly once.',
    sections: [
      {
        h: 'Audio arrives in blocks',
        body: 'Your DAW doesn\'t hand a plugin one sample at a time — it delivers a **block** (say 512 samples), and the plugin loops over every sample, processes it, and returns the block. This `for` loop is the single most important pattern in audio programming: **start at 0, run while `i < numSamples`, step by one**.',
        code: 'for (int i = 0; i < numSamples; ++i)\n{\n    buffer[i] = buffer[i] * gain;\n}',
        codeTitle: 'the canonical block loop',
        analogy: 'The DAW is a tape machine that hands you one reel (block) at a time. The loop is you rolling through that reel sample by sample. When the reel ends, the DAW immediately hands you the next — that repeated hand-off is the audio callback you\'ll meet in Zone 3.',
      },
      {
        h: 'Counting from zero, stopping before the end',
        body: 'Arrays start at index **0**, so a 512-sample buffer has valid indexes 0 through **511**. That\'s why the condition is `i < numSamples`, never `i <= numSamples` — the `<=` version reads one slot past the end. `while` loops handle open-ended repetition, but for a known count, `for` is the tool.',
        mistake: { code: 'for (int i = 0; i <= numSamples; ++i) // reads buffer[numSamples]\n                                       // one past the end!', text: 'Off-by-one on a buffer is undefined behavior: at best a click, at worst a crash in the DAW. The safe habit: `<` with a zero start.' },
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
        explain: 'Known iteration count = `for` loop. It puts the start, end and step on one line where a reader (and reviewer) can verify the bounds at a glance.',
      },
    ],
    recap: [
      'DAWs deliver audio in blocks; plugins loop over each sample.',
      'The canonical loop: `for (int i = 0; i < numSamples; ++i)`.',
      'Indexes run 0 … n-1: `<` not `<=`.',
      'Known count → for; open-ended → while.',
    ],
  },

  /* ---------------------------------------------------------- L7 */
  {
    id: 'l7', kind: 'lesson', title: 'Buffers: Arrays & std::vector', short: 'Arrays and std::vector',
    concepts: ['containers'],
    objective: 'Store sequences of samples in fixed arrays and resizable vectors — and know when resizing is forbidden.',
    sections: [
      {
        h: 'Fixed arrays',
        body: 'An **array** is a fixed-length row of values of one type, sitting side by side in memory. Size is set at compile time and never changes. Indexing starts at **0**: a 4-slot array has slots 0, 1, 2, 3.',
        code: 'float window[4] = { 0.1f, 0.4f, 0.4f, 0.1f };\nfloat first = window[0];  // 0.1f\nfloat last  = window[3];  // 0.1f — index 3, not 4',
        codeTitle: 'fixed array',
        analogy: 'A fixed array is a hardware step sequencer: 16 slots, wired in, forever. You can change what\'s *in* each slot, never how many slots exist.',
      },
      {
        h: 'std::vector — the resizable buffer',
        body: '`std::vector<float>` is the workhorse container of C++: an array that can **grow and shrink at runtime**. It knows its own size (`.size()`), you can `.resize()` it, and `.push_back()` appends. This is what you\'ll use for delay lines, wavetables and working buffers.',
        code: 'std::vector<float> delayLine;\ndelayLine.resize(48000);      // one second at 48kHz\ndelayLine[0] = 0.25f;\nint n = (int) delayLine.size(); // 48000',
        codeTitle: 'a delay line',
        warn: 'Growing a vector can **allocate heap memory**, and allocation can take an unpredictable amount of time. That\'s fine during setup — but inside the audio callback it can cause dropouts. Rule: **size your buffers in prepareToPlay, never in processBlock.** Zone 2 goes deep on why.',
      },
      {
        h: 'Stay in bounds',
        body: 'Neither arrays nor `operator[]` on vectors check your index. Reading `buffer[512]` on a 512-sample buffer reaches into memory you don\'t own — **undefined behavior**: maybe garbage audio, maybe a crash three minutes later in an unrelated function. The bounds live in your loop condition; write them carefully.',
        mistake: { code: 'for (int i = 0; i <= buffer.size(); ++i) // one too far', text: '`<=` with size() walks one slot past the end. (Also: size() returns an unsigned type — comparing it with int draws a compiler warning worth heeding.)' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'containers',
        prompt: 'A buffer holds 512 samples. Which expression reads its **first** sample?',
        options: [
          { t: '`buffer[0]`', why: '' },
          { t: '`buffer[1]`', why: 'C++ indexes from zero — buffer[1] is the *second* sample.' },
          { t: '`buffer[512]`', why: 'Valid indexes are 0–511. Index 512 is one past the end: undefined behavior.' },
          { t: '`buffer.first`', why: 'Vectors have `.front()`, not `.first` — and raw arrays have neither. Indexing with [0] works for both.' },
        ],
        answer: 0,
        explain: 'Indexes run from 0 to size-1. First sample: `buffer[0]`; last of 512: `buffer[511]`.',
      },
      {
        type: 'fill', concept: 'containers',
        prompt: 'During plugin setup, give the delay line room for `maxDelaySamples` samples.',
        code: 'std::vector<float> delayLine;\n\nvoid prepare(int maxDelaySamples)\n{\n    delayLine.___(maxDelaySamples);\n}',
        accept: ['resize'],
        placeholder: 'method',
        hint: 'You want the vector to actually contain that many (zero-initialized) samples.',
        mistakes: [
          { match: '^reserve$', msg: '`reserve` allocates capacity but the vector still has size 0 — indexing it would be out of bounds. `resize` sets the actual element count (new floats are zero-initialized).' },
          { match: '^push_back$', msg: 'push_back appends one element per call. To set the whole size at once, use `resize`.' },
        ],
        explain: '`resize(n)` makes the vector hold exactly n elements, zero-initialized — a silent delay line, ready before the first audio callback.',
      },
      {
        type: 'mcq', concept: 'realtime-safety',
        prompt: 'Why is `delayLine.push_back(sample)` dangerous inside the audio callback?',
        options: [
          { t: 'It may allocate heap memory, which can take unpredictable time and glitch the audio', why: '' },
          { t: 'push_back is always slow, even without allocation', why: 'When capacity is available, push_back is cheap. The danger is specifically the *possible* reallocation.' },
          { t: 'Vectors can\'t store audio samples', why: 'std::vector<float> stores samples perfectly well — it\'s the standard working buffer.' },
          { t: 'It\'s not dangerous — modern computers are fast enough', why: 'Speed isn\'t the issue; *predictability* is. The callback has a hard deadline every few milliseconds, and one slow allocation can blow it.' },
        ],
        answer: 0,
        explain: 'When a vector outgrows its capacity, push_back allocates a bigger block and copies everything over. Allocation time is unbounded — and the audio callback has a hard real-time deadline. Allocate in prepareToPlay; only read and write in processBlock.',
      },
    ],
    recap: [
      'Arrays: fixed size, zero-indexed, no bounds checking.',
      '`std::vector` resizes at runtime and knows its size.',
      'Size buffers during setup (prepareToPlay), never in the audio callback.',
      'Out-of-bounds access is undefined behavior — bounds live in your loop conditions.',
    ],
  },

  /* ---------------------------------------------------------- L8 */
  {
    id: 'l8', kind: 'lesson', title: 'References: One Signal, Two Labels', short: 'References',
    concepts: ['references'],
    objective: 'Use references as aliases to existing values — the no-copy way to share and modify data.',
    sections: [
      {
        h: 'A reference is an alias',
        body: 'A **reference** (`float&`) is a second name for an existing variable — not a copy, the *same* value. Write through either name and both see the change. A reference must be initialized when created and can never be re-pointed at something else.',
        code: 'float sample = 0.8f;\nfloat& alias = sample;  // same value, second name\n\nalias = 0.2f;\n// sample is now 0.2f too — there is only one value',
        codeTitle: 'reference basics',
        analogy: 'A reference is a mult on your patchbay: the same channel appearing at two jack labels. Turn down the signal at either jack and it\'s down everywhere — because there was only ever one signal.',
      },
      {
        h: 'Why audio code loves references',
        body: 'Passing by reference lets a function **modify the caller\'s data** (`float& sample` in a per-sample processor) or **read big objects without copying** (`const Preset& p`). Copying a full audio buffer every function call would wreck performance; handing out references costs nothing.',
        code: 'void processSample(float& s)   // modifies the caller\'s sample\n{\n    s *= 0.5f;\n}\n\nvoid show(const Preset& p)     // reads without copying\n{\n    // look, don\'t touch\n}',
        codeTitle: 'references as parameters',
        mistake: { text: 'Forgetting the `&` — `void processSample(float s)` — silently processes a *copy*. The function runs, no error appears, and the caller\'s audio never changes. If your effect "does nothing", check for a missing &.' },
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'references',
        prompt: 'What prints?',
        code: 'float sample = 0.8f;\nfloat& alias = sample;\nalias = 0.2f;\nstd::cout << sample;',
        options: [
          { t: '`0.2`', why: '' },
          { t: '`0.8`', why: 'alias isn\'t a copy — it\'s the same variable under a second name, so writing to it changes sample.' },
          { t: '`1.0`', why: 'Nothing sums here — a reference aliases, it doesn\'t mix two signals.' },
          { t: 'It fails to compile', why: 'This is exactly how references are meant to be used — it compiles cleanly.' },
        ],
        answer: 0,
        explain: 'alias and sample are one value with two names. Assigning through alias changes the one underlying float, so sample reads back 0.2.',
      },
      {
        type: 'fill', concept: 'references',
        prompt: 'Declare `current` as an alias for the first sample — so writing to it writes into the buffer.',
        code: '___ current = buffer[0];\ncurrent = 0.0f;   // must silence buffer[0] itself',
        accept: ['float&', 'float &'],
        placeholder: 'type',
        hint: 'One character turns a copy into an alias.',
        mistakes: [
          { match: '^float$', msg: 'Plain `float` copies the value out of the buffer — silencing the copy leaves buffer[0] untouched. Add `&` to alias the buffer slot itself.' },
        ],
        explain: '`float&` binds current to the actual buffer slot. `float` alone would copy the value out, and the write-back would never happen — the classic "my effect does nothing" bug.',
      },
      {
        type: 'mcq', concept: 'references',
        prompt: 'A function needs read-only access to a large `SampleBank`. Best parameter?',
        options: [
          { t: '`const SampleBank& bank`', why: '' },
          { t: '`SampleBank bank`', why: 'That copies the entire bank — possibly megabytes of sample data — on every call.' },
          { t: '`SampleBank& bank`', why: 'No copy, but the missing const advertises that the function might modify the bank. Say what you mean.' },
          { t: '`float bank`', why: 'A sample bank can\'t collapse into a single float without losing everything.' },
        ],
        answer: 0,
        explain: 'const reference: zero-copy access plus a compiler-enforced promise not to modify. This is the default way to pass anything bigger than a few bytes read-only.',
      },
    ],
    recap: [
      'A reference is an alias — same value, second name.',
      'Must be initialized; can\'t be re-seated.',
      '`float&` parameters modify the caller\'s data; `const&` reads without copying.',
      'A missing & is the classic "effect does nothing" bug.',
    ],
  },

  /* ---------------------------------------------------------- L9 */
  {
    id: 'l9', kind: 'lesson', title: 'Pointers & Memory Safety', short: 'Pointers, nullptr, safety',
    concepts: ['pointers', 'memory'],
    objective: 'Read pointer syntax, guard against null, and recognize the two classic pointer disasters.',
    sections: [
      {
        h: 'A pointer holds an address',
        body: 'A **pointer** (`float*`) doesn\'t hold a value — it holds the *memory address* where a value lives. `&x` takes the address of x; `*p` (**dereferencing**) follows the pointer to the value. Unlike references, pointers can be re-pointed, do arithmetic, and — crucially — can point at **nothing**: `nullptr`.',
        code: 'float sample = 0.8f;\nfloat* p = &sample;   // p holds sample\'s address\n*p = 0.5f;            // write through the pointer\n\nfloat* q = nullptr;   // points at nothing (yet)',
        codeTitle: 'pointer basics',
        analogy: 'A pointer is a written-down patch location: "the delay is at rack 2, slot 5." Following the note is dereferencing. `nullptr` is a note that says "nothing is patched here" — and walking up to an empty slot expecting a delay (dereferencing null) is how you blow the monitors.',
      },
      {
        h: 'The two classic disasters',
        body: '**Null dereference:** using `*p` when p is nullptr — undefined behavior, usually an instant crash (and in a plugin, it takes the DAW down with it). Guard first: `if (p != nullptr)`. **Dangling pointer:** a pointer to memory that no longer exists, like the address of a local variable after its function returned. The note still names rack 2 slot 5 — but the gear was struck down after the show.',
        mistake: { code: 'float* makeBuffer()\n{\n    float local[512];\n    return local;   // local dies when the function returns!\n}', text: 'Returning the address of a local: the array lives on the stack and is destroyed at return. The caller gets a dangling pointer to reclaimed memory.' },
        warn: 'Where you *see* pointers in JUCE: `buffer.getWritePointer(channel)` hands you a float* into the audio buffer. Raw *owning* pointers (new/delete) are legacy style — Zone 2 replaces them with smart pointers.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'pointers',
        prompt: 'What is `nullptr`?',
        options: [
          { t: 'A pointer value meaning "points at no object"', why: '' },
          { t: 'A pointer to memory address zero that you can safely read', why: 'You can never safely dereference nullptr — that\'s exactly the crash it exists to help you avoid.' },
          { t: 'The same thing as the number 0.0f', why: 'nullptr is a distinct pointer type, deliberately not interchangeable with numbers — that\'s an improvement over the old NULL macro.' },
          { t: 'A deleted variable', why: 'nullptr says nothing about deletion — it\'s a value a pointer holds when it currently targets nothing.' },
        ],
        answer: 0,
        explain: 'nullptr is the explicit "not pointing at anything" value. Its whole job is to be *checkable*: `if (p != nullptr)` before you follow the pointer.',
      },
      {
        type: 'predict', concept: 'memory',
        prompt: 'The editor hasn\'t been created yet. What happens?',
        code: 'Editor* editor = nullptr;\neditor->repaint();',
        options: [
          { t: 'Undefined behavior — in practice, a crash', why: '' },
          { t: 'Nothing — the call is silently skipped', why: 'C++ inserts no automatic null checks. The call is attempted on address null.' },
          { t: 'The editor is created automatically', why: 'Pointers never create objects on their own — dereferencing null doesn\'t summon an Editor.' },
          { t: 'A compile error', why: 'The compiler can\'t generally know a pointer will be null at runtime — this builds cleanly and crashes later.' },
        ],
        answer: 0,
        explain: 'Calling a member through a null pointer is undefined behavior — typically an access violation that crashes the host DAW. This exact pattern (UI object not yet created, audio code pokes it) is one of the most common real plugin crashes.',
      },
      {
        type: 'fill', concept: 'pointers',
        prompt: 'Only process if the oscillator actually exists.',
        code: 'if (osc ___ nullptr)\n    osc->process(buffer);',
        accept: ['!='],
        placeholder: 'operator',
        hint: 'You want: "is NOT null".',
        mistakes: [
          { match: '^==$', msg: '`==` would process only when osc is null — dereferencing the null pointer and crashing. You want `!=`.' },
        ],
        explain: '`if (osc != nullptr)` guards the dereference. Idiomatic shorthand you\'ll also see: `if (osc)`.',
      },
    ],
    recap: [
      'Pointers hold addresses; `*` follows them, `&` takes them.',
      'nullptr = points at nothing; always guard before dereferencing.',
      'Dangling pointer = address of something already destroyed.',
      'JUCE hands you non-owning pointers (getWritePointer); owning raw pointers get replaced in Zone 2.',
    ],
  },

  /* ---------------------------------------------------------- L10 */
  {
    id: 'l10', kind: 'lesson', title: 'Classes: Your Synth Blueprint', short: 'Classes and objects',
    concepts: ['classes'],
    objective: 'Define a class, create objects from it, and understand why each object carries its own independent state.',
    sections: [
      {
        h: 'Class = design, object = the unit on your desk',
        body: 'A **class** bundles data (**member variables**) with the functions that operate on it (**member functions**). The class itself is just the design; an **object** is one built instance. From one class you can create many objects — and each holds its own copy of the member variables.',
        code: 'class Filter {\npublic:\n    void setCutoff(float hz) { cutoff = hz; }\n    float getCutoff() const  { return cutoff; }\n\nprivate:\n    float cutoff = 1000.0f;   // each object gets its own\n};',
        codeTitle: 'a minimal Filter class',
        analogy: 'The class is the schematic for a filter module. Every unit built from that schematic — every **object** — has its own physical cutoff knob. Turning the knob on unit A does nothing to unit B, even though they share one design.',
      },
      {
        h: 'Creating and using objects',
        body: 'Declaring `Filter a;` builds one object. The dot operator reaches its members: `a.setCutoff(200.0f)`. This per-object state is exactly how a synth runs one filter **per voice**: eight voices, eight Filter objects, eight independent cutoffs — one class.',
        code: 'Filter a;\nFilter b;\na.setCutoff(200.0f);\nb.setCutoff(2000.0f);\n// a and b hold completely separate state',
        codeTitle: 'independent instances',
        mistake: { text: 'Thinking of a class as a container of globals. If two objects seem to share state, something is wrong (usually a `static` member or a shared pointer) — by default, every object\'s members are its own.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'classes',
        prompt: 'What\'s the relationship between a class and an object?',
        options: [
          { t: 'The class is the design; an object is one instance built from it', why: '' },
          { t: 'They\'re two names for the same thing', why: 'One class can produce thousands of objects — design and instance are different layers.' },
          { t: 'Objects are classes that have been compiled', why: 'Compilation happens to all code. Objects are created at *runtime* from a class definition.' },
          { t: 'A class can only ever create one object', why: 'Unlimited instances is the whole point — think one Voice class, eight voice objects.' },
        ],
        answer: 0,
        explain: 'Class = the synth schematic. Object = one unit on the desk. `Filter a; Filter b;` builds two independent units from one design.',
      },
      {
        type: 'predict', concept: 'classes',
        prompt: 'Two filters, two settings. What prints?',
        code: 'Filter a;\nFilter b;\na.setCutoff(200.0f);\nb.setCutoff(2000.0f);\nstd::cout << a.getCutoff();',
        options: [
          { t: '`200`', why: '' },
          { t: '`2000`', why: 'b\'s setting lives in b\'s own member variable — it never touches a.' },
          { t: '`1000` — the default', why: 'a.setCutoff(200.0f) already overwrote a\'s default.' },
          { t: '`2200`', why: 'Member variables don\'t sum across objects — each object is fully independent.' },
        ],
        answer: 0,
        explain: 'Each object owns its own members. a\'s cutoff is 200, b\'s is 2000, and reading a gives 200. This independence is what makes per-voice processing possible.',
      },
      {
        type: 'match', concept: 'classes',
        prompt: 'Match each C++ term to the synth-hardware idea.',
        left: ['class', 'object', 'member variable', 'member function'],
        right: ['the schematic a module is built from', 'one physical unit on your desk', 'a knob position stored inside one unit', 'pressing a button that makes the unit act'],
        explain: 'Design → instance → per-instance state → per-instance behavior. Hold onto this map — JUCE\'s AudioProcessor is exactly a class you\'ll instantiate.',
      },
    ],
    recap: [
      'Classes bundle data + behavior; objects are built instances.',
      'Every object owns an independent copy of the member variables.',
      'Dot operator reaches members: `a.setCutoff(200.0f)`.',
      'Polyphony = one Voice class, many voice objects.',
    ],
  },

  /* ---------------------------------------------------------- L11 */
  {
    id: 'l11', kind: 'lesson', title: 'Constructors & the Front Panel', short: 'Constructors, encapsulation',
    concepts: ['classes', 'encapsulation'],
    objective: 'Initialize objects correctly with constructors, and use public/private to design a safe control surface.',
    sections: [
      {
        h: 'The constructor runs at power-on',
        body: 'A **constructor** is a special function — same name as the class, no return type — that runs **exactly when an object is created**. Its job: make sure the object starts in a valid state. The **member initializer list** (after the `:`) sets members before the body even runs; modern C++ also allows **default member initializers** right at the declaration.',
        code: 'class GainStage {\npublic:\n    GainStage(float initialGain)\n        : gain(initialGain)      // initializer list\n    {\n    }\n\nprivate:\n    float gain = 1.0f;           // default if no ctor sets it\n};',
        codeTitle: 'constructor + initializer list',
        analogy: 'The constructor is the power-on sequence of a hardware unit: relays click, defaults load, the unit comes up in a known state. No serious gear powers on with random values on every parameter — and no serious C++ object should either.',
      },
      {
        h: 'public is the panel, private is the circuitry',
        body: '`public:` members are the **front panel** — what outside code may touch. `private:` members are the **circuitry inside** — reachable only by the class\'s own functions. This is **encapsulation**: outside code can\'t put the object into an invalid state, because every change goes through a public function that can enforce the rules.',
        code: 'public:\n    void setGain(float g)\n    {\n        gain = std::clamp(g, 0.0f, 2.0f); // enforce limits\n    }\nprivate:\n    float gain = 1.0f;   // nobody sets this to 9000 directly',
        codeTitle: 'a guarded setter',
        mistake: { text: 'Making everything public "to keep it simple". It works — until any code anywhere can set `gain = 9000.0f` and you\'re hunting a blown-out mix bus across the entire codebase. Private members shrink the search space to one class.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'classes',
        prompt: 'When does a constructor run?',
        options: [
          { t: 'Automatically, at the moment the object is created', why: '' },
          { t: 'Whenever you call it manually, like any function', why: 'You never call a constructor on an existing object — creation *is* the call.' },
          { t: 'Once, when the program starts', why: 'It runs per object created — eight voices means eight constructor runs.' },
          { t: 'Only if the object is created with new', why: '`Filter f;` on the stack runs the constructor just the same — new isn\'t special here.' },
        ],
        answer: 0,
        explain: 'Creation and construction are one event: every time an object comes into existence, its constructor runs first. That\'s your guarantee against half-initialized objects.',
      },
      {
        type: 'fill', concept: 'classes',
        prompt: 'Complete the member initializer list so the member `gain` starts as the value passed in.',
        code: 'class GainStage {\npublic:\n    GainStage(float g) : ___ { }\nprivate:\n    float gain = 1.0f;\n};',
        accept: ['gain(g)', 'gain{g}', 'gain (g)', 'gain { g }', 'gain{ g }', 'gain( g )'],
        placeholder: 'member(value)',
        hint: 'membername(parametername)',
        explain: 'The initializer list `: gain(g)` initializes the member directly from the parameter — the preferred style over assigning inside the constructor body, because members are initialized exactly once.',
      },
      {
        type: 'mcq', concept: 'encapsulation',
        prompt: 'Why make the `gain` member private and expose only `setGain()`?',
        options: [
          { t: 'Every change funnels through one function that can enforce valid limits', why: '' },
          { t: 'Private variables use less memory', why: 'Access control is a compile-time concept — it changes who may touch the data, not its size.' },
          { t: 'Private variables are automatically thread-safe', why: 'Threads don\'t care about access specifiers. Thread safety is real engineering you\'ll do in Zone 6.' },
          { t: 'It makes the code run faster', why: 'public and private compile to identical machine code — this is about correctness, not speed.' },
        ],
        answer: 0,
        explain: 'Encapsulation = the panel-controls principle: users of the class turn the knob you provided (setGain, which clamps), and can\'t reach into the circuitry to bend a value out of range. Invalid states become impossible instead of merely discouraged.',
      },
    ],
    recap: [
      'Constructors run at object creation — objects start valid.',
      'Initializer list `: member(value)` is the preferred init style.',
      'public = panel controls; private = internal circuitry.',
      'Guarded setters make invalid states impossible.',
    ],
  },

  /* ---------------------------------------------------------- L12 */
  {
    id: 'l12', kind: 'lesson', title: 'Headers, Sources & Reading Errors', short: '.h/.cpp files, compiler errors',
    concepts: ['headers', 'compiler-errors'],
    objective: 'Split code into header and implementation files, and diagnose the difference between compiler and linker errors.',
    sections: [
      {
        h: 'The .h / .cpp split',
        body: 'C++ projects split each class in two: the **header** (`.h`) holds the *declaration* — the class\'s shape, its public interface — and the **implementation** (`.cpp`) holds the *definitions* — the actual function bodies. Other files `#include` the header to use the class. `#pragma once` at the top of a header stops it being included twice. Every JUCE plugin you\'ve seen follows this: `PluginProcessor.h` / `PluginProcessor.cpp`.',
        code: '// SineOsc.h — the interface\n#pragma once\n\nclass SineOsc {\npublic:\n    void  setFrequency(float hz);\n    float nextSample();\nprivate:\n    double phase = 0.0;\n    float  freq  = 440.0f;\n};',
        codeTitle: 'the header',
        analogy: 'The header is the module\'s **front panel silkscreen** — every jack and knob labeled, so anyone can patch it without opening the case. The .cpp is the circuit board inside. Other modules only ever see the panel.',
      },
      {
        h: 'Definitions live in the .cpp',
        body: 'The `.cpp` includes its own header first, then defines each function using the `ClassName::` prefix, which says "this body belongs to that class".',
        code: '// SineOsc.cpp — the implementation\n#include "SineOsc.h"\n\nvoid SineOsc::setFrequency(float hz)\n{\n    freq = hz;\n}',
        codeTitle: 'the implementation',
      },
      {
        h: 'Compiler errors vs linker errors',
        body: 'Two build stages, two error families. The **compiler** checks each .cpp against the declarations it can see — typos, type mismatches, missing semicolons. The **linker** then stitches the compiled pieces together — and fails with **"undefined reference"** when something was *declared* but never *defined* (or its .cpp isn\'t in the build). Reading order matters: fix the **first** error first — later errors are often echoes of it.',
        mistake: { text: 'Chasing the *last* error in a wall of forty. Most are echoes of the first — one missing semicolon can confuse everything after it. Scroll to the top, fix error #1, rebuild.' },
        warn: 'The classic: you declared `nextSample()` in the header, forgot to write the body in the .cpp, and the compiler is perfectly happy — the *linker* is the one that catches the hole, in language that mentions no file or line. Now you know why.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'headers',
        prompt: 'What belongs in a header (.h) file?',
        options: [
          { t: 'Declarations — the class\'s interface, for other files to include', why: '' },
          { t: 'Only comments and documentation', why: 'Headers hold real code — the class declaration other files compile against.' },
          { t: 'The compiled machine code', why: 'Machine code lives in object files the build produces — headers are plain source text.' },
          { t: 'Nothing important — headers are optional style', why: 'Without the header, no other file can know your class exists. It\'s the mechanism of code sharing in C++.' },
        ],
        answer: 0,
        explain: 'The header is the public interface — the panel silkscreen. Implementation details go in the .cpp. (Templates and small inline functions do live in headers; you\'ll meet those in Zone 2.)',
      },
      {
        type: 'mcq', concept: 'compiler-errors',
        prompt: 'Your build fails with: `undefined reference to SineOsc::process()`. Which stage produced it, and what does it mean?',
        options: [
          { t: 'The linker — process() was declared but no compiled definition exists', why: '' },
          { t: 'The compiler — there\'s a syntax error in process()', why: 'A syntax error names a file and line. "undefined reference" is the linker failing to *find* the function body at all.' },
          { t: 'The DAW — the plugin failed validation', why: 'This error happens at build time, long before any DAW is involved.' },
          { t: 'The compiler — the header is missing', why: 'A missing header gives a different error ("No such file or directory") at compile time.' },
        ],
        answer: 0,
        explain: '"undefined reference" is the linker\'s signature: the function was promised (declared) but its body was never compiled — either you didn\'t write it, or its .cpp file isn\'t part of the build (a very common CMake mistake).',
      },
      {
        type: 'fill', concept: 'headers',
        prompt: 'At the top of SineOsc.cpp, include the class\'s own header.',
        code: '___\n\nvoid SineOsc::setFrequency(float hz)\n{\n    freq = hz;\n}',
        accept: ['#include "SineOsc.h"', '#include"SineOsc.h"'],
        placeholder: '#include ...',
        hint: 'Your own headers use quotes, not angle brackets.',
        mistakes: [
          { match: '<SineOsc\\.h>', msg: 'Angle brackets `<...>` search system/library paths. Your own project headers use quotes: `#include "SineOsc.h"`.' },
          { match: '^#include\\s*$', msg: 'Close — now name the file: `#include "SineOsc.h"`.' },
        ],
        explain: 'Quotes mean "look in this project first" — the convention for your own headers. Angle brackets are for system and library headers like `<vector>` or `<juce_core/juce_core.h>`.',
      },
    ],
    recap: [
      'Header = declaration (interface); .cpp = definition (bodies).',
      '`#pragma once` guards against double inclusion.',
      'Compiler errors: per-file syntax/type problems. Linker errors: missing definitions.',
      'Always fix the first error first.',
    ],
  },
];
