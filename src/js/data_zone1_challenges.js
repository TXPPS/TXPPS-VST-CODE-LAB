/* ============================================================
   ZONE 1 — standalone challenges, mini-projects, boss.
   Challenge shape: { id, kind:'challenge', ctype, title, short,
                      concepts, intro?, questions:[Question...] }
   ctype: 'completion' | 'bugfix' | 'ordering' | 'compiler'
   Project shape:   { id, kind:'project', title, brief, steps:[{note?, q}] }
   Boss shape:      { id, kind:'boss', title, brief, stages:[Question...] }
   ============================================================ */

const ZONE1_CHALLENGES = [

  /* ============ CODE COMPLETION ============ */
  {
    id: 'c1', kind: 'challenge', ctype: 'completion', title: 'Complete: dB to Gain', short: 'Code completion',
    concepts: ['functions', 'types'],
    intro: 'Faders think in dB; DSP multiplies by linear gain. This conversion appears in nearly every plugin you will ever write.',
    questions: [
      {
        type: 'mcq', concept: 'functions',
        prompt: 'Select the missing line. -6 dB should give roughly 0.5, 0 dB exactly 1.0.',
        code: 'float dbToGain(float dB)\n{\n    ___________\n}',
        options: [
          { t: '`return std::pow(10.0f, dB / 20.0f);`', why: '' },
          { t: '`return std::pow(10.0f, dB / 10.0f);`', why: '/10 is the *power* ratio formula. Amplitude uses /20 — this version turns -6 dB into ~0.25, a gain error you would hear immediately.' },
          { t: '`return dB / 20.0f;`', why: 'That\'s linear scaling, not the exponential dB curve — 0 dB would return 0.0 and mute the signal.' },
          { t: '`return std::log10(dB) * 20.0f;`', why: 'That\'s the *opposite* conversion (gain → dB), and it fails for dB ≤ 0.' },
        ],
        answer: 0,
        explain: 'Amplitude: gain = 10^(dB/20). Check the landmarks: 0 dB → 10^0 = 1.0 (unity), -6 dB → ≈0.501 (half), +6 dB → ≈1.995 (double). The /10 version is for power, not amplitude.',
      },
    ],
  },
  {
    id: 'c2', kind: 'challenge', ctype: 'completion', title: 'Complete: Apply Gain to a Block', short: 'Code completion',
    concepts: ['loops'],
    intro: 'Every gain stage comes down to this: the output carries the input, scaled by gain.',
    questions: [
      {
        type: 'fill', concept: 'loops',
        prompt: 'Fill in the processing line: write the gain-scaled input sample into the output.',
        code: 'void process(const float* input, float* output,\n             int numSamples, float gain)\n{\n    for (int i = 0; i < numSamples; ++i)\n        ___\n}',
        accept: ['output[i] = input[i] * gain;', 'output[i]=input[i]*gain;', 'output[i] = gain * input[i];', 'output[i]=gain*input[i];', 'output[i] = input[i] * gain', 'output[i] = gain * input[i]'],
        placeholder: 'output[?] = ...',
        hint: 'Read from input[i], scale, write to output[i].',
        mistakes: [
          { match: 'input\\[i\\]\\s*=', msg: 'That writes into the *input* buffer — it\'s marked const, and the processed audio would never reach the output. Assign to output[i].' },
          { match: '\\+\\s*gain', msg: 'Adding gain shifts the waveform (DC offset). Gain scales: multiply.' },
          { match: 'output\\[0\\]|input\\[0\\]', msg: 'Index with the loop variable `i`, or you\'ll process only the first sample over and over.' },
        ],
        explain: '`output[i] = input[i] * gain;` — read sample i, scale it, store sample i. The loop index ties input and output sample-for-sample.',
      },
    ],
  },
  {
    id: 'c3', kind: 'challenge', ctype: 'completion', title: 'Complete: Prepare the Delay Line', short: 'Code completion',
    concepts: ['containers', 'realtime-safety'],
    intro: 'Buffers get their memory during setup — before the first audio callback ever fires.',
    questions: [
      {
        type: 'mcq', concept: 'realtime-safety',
        prompt: 'Select the missing line. prepare() runs once before audio starts; process() runs on the audio thread.',
        code: 'std::vector<float> delayLine;\n\nvoid prepare(double sampleRate)\n{\n    int maxSamples = (int) (sampleRate * 2.0); // 2s max\n    ___________\n}',
        options: [
          { t: '`delayLine.resize(maxSamples, 0.0f);`', why: '' },
          { t: '`delayLine.reserve(maxSamples);`', why: 'reserve allocates capacity but size stays 0 — the first `delayLine[i]` in process() would be out of bounds.' },
          { t: 'Nothing — resize it inside process() when needed', why: 'That defers the allocation onto the audio thread — exactly the unpredictable-timing hazard prepare() exists to avoid.' },
          { t: '`float delayLine[maxSamples];`', why: 'That declares a *new local* array (and a variable-length one isn\'t standard C++). The member vector would remain empty.' },
        ],
        answer: 0,
        explain: 'resize(n, 0.0f) gives the vector n real, zero-valued samples — allocation done, buffer silent, before the audio thread ever touches it. reserve() is a common trap here: capacity without size.',
      },
    ],
  },
  {
    id: 'c4', kind: 'challenge', ctype: 'completion', title: 'Complete: Voice Constructor', short: 'Code completion',
    concepts: ['classes'],
    intro: 'A synth voice must power on in a known state.',
    questions: [
      {
        type: 'mcq', concept: 'classes',
        prompt: 'Select the constructor that correctly initializes both members using an initializer list.',
        code: 'class Voice {\npublic:\n    // constructor goes here\nprivate:\n    float frequency;\n    float level;\n};',
        options: [
          { t: '`Voice(float f, float l) : frequency(f), level(l) {}`', why: '' },
          { t: '`Voice(float f, float l) { f = frequency; l = level; }`', why: 'Backwards — this copies the *uninitialized members into the parameters*, leaving frequency and level as garbage.' },
          { t: '`void Voice(float f, float l) : frequency(f), level(l) {}`', why: 'Constructors have no return type — not even void. This is a hard compile error (gcc: \"return type specification for constructor invalid\") — only a constructor may share the class\'s name and carry an initializer list.' },
          { t: '`Voice() : frequency, level {}`', why: 'Initializer list entries need values: `frequency(f)`. Bare names don\'t compile.' },
        ],
        answer: 0,
        explain: 'Same name as the class, no return type, `: member(value)` list. The backwards-assignment option is worth a second look — it compiles and silently leaves both members uninitialized.',
      },
    ],
  },
  {
    id: 'c5', kind: 'challenge', ctype: 'completion', title: 'Complete: Guard the Header', short: 'Code completion',
    concepts: ['headers'],
    intro: 'Headers get included from many files. Without a guard, the second inclusion redefines the class — and the build fails.',
    questions: [
      {
        type: 'fill', concept: 'headers',
        prompt: 'Add the modern include guard at the top of the header.',
        code: '___\n\nclass DelayLine {\npublic:\n    void prepare(int maxSamples);\nprivate:\n    std::vector<float> data;\n};',
        accept: ['#pragma once', '#pragma  once'],
        placeholder: '#...',
        hint: 'One pragma line — the modern replacement for #ifndef guards.',
        mistakes: [
          { match: '#ifndef|#define', msg: 'Classic #ifndef/#define/#endif guards work too, but need all three lines placed correctly. The modern one-liner is `#pragma once`.' },
          { match: '#include', msg: 'This line should *protect* the header, not include another one. You want `#pragma once`.' },
        ],
        explain: '`#pragma once` tells the preprocessor: include this file at most once per translation unit. Every header you write starts with it. (This header also needs `#include <vector>` for std::vector — spotting missing includes becomes second nature.)',
      },
    ],
  },
  {
    id: 'c6', kind: 'challenge', ctype: 'completion', title: 'Complete: Inside processBlock', short: 'Code completion',
    concepts: ['loops', 'realtime-safety'],
    intro: 'A simplified look at a real JUCE processBlock — the audio callback where your DSP lives. (Educational excerpt, not a full production processor.)',
    questions: [
      {
        type: 'fill', concept: 'loops',
        prompt: 'Apply the gain in place: scale each sample in the channel data.',
        code: '// simplified JUCE-style callback (educational)\nvoid processBlock(AudioBuffer& buffer)\n{\n    float* channelData = buffer.getWritePointer(0);\n    int numSamples = buffer.getNumSamples();\n\n    for (int i = 0; i < numSamples; ++i)\n        ___\n}',
        accept: ['channelData[i] *= gain;', 'channelData[i]*=gain;', 'channelData[i] = channelData[i] * gain;', 'channelData[i]=channelData[i]*gain;', 'channelData[i] = gain * channelData[i];', 'channelData[i] *= gain'],
        placeholder: 'channelData[?] ...',
        hint: 'In-place: read, scale, write back to the same slot. `*=` says it in one operator.',
        mistakes: [
          { match: 'buffer\\[i\\]', msg: 'The buffer object isn\'t indexed directly here — you already pulled out `channelData`, the float* into channel 0. Index that.' },
          { match: '^gain\\s*\\*?=', msg: 'That modifies the gain value, not the audio. Write to channelData[i].' },
        ],
        explain: '`channelData[i] *= gain;` — in-place processing through the write pointer. This is, genuinely, the entire DSP of a gain plugin; everything else in Zone 3 is the framework around this loop.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'b1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Click at Block End', short: 'Find the bug',
    concepts: ['loops', 'containers'],
    intro: 'A gain utility clicks and occasionally crashes the DAW at the end of every block. Tap the line that causes it.',
    questions: [
      {
        type: 'bugspot', concept: 'loops',
        prompt: 'One line reads past the end of the buffer. Which?',
        code: [
          'void applyGain(std::vector<float>& buffer, float gain)',
          '{',
          '    int n = (int) buffer.size();',
          '    for (int i = 0; i <= n; ++i)',
          '        buffer[i] *= gain;',
          '}',
        ],
        buggy: 3,
        explain: 'The condition `i <= n` runs one extra pass and touches `buffer[n]` — one slot past the end. Out-of-bounds access is undefined behavior: sometimes a click, sometimes a crash minutes later. Fix: `i < n`.',
        fix: 'for (int i = 0; i < n; ++i)',
      },
    ],
  },
  {
    id: 'b2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Vanishing Buffer', short: 'Find the bug',
    concepts: ['pointers', 'memory'],
    intro: 'This helper returns a "temporary buffer" — and the audio that comes back is garbage. Tap the broken line.',
    questions: [
      {
        type: 'bugspot', concept: 'memory',
        prompt: 'One line hands out memory that is about to be destroyed. Which?',
        code: [
          'float* makeScratchBuffer()',
          '{',
          '    float scratch[512] = {};',
          '    return scratch;',
          '}',
        ],
        buggy: 3,
        explain: '`scratch` is a local array on the stack — it is destroyed the instant the function returns. The returned pointer is *dangling*: it names memory that no longer belongs to you. Reading it gives whatever landed there next. Fix: the buffer must outlive the function — make it a member of a class (sized in prepare), or return a std::vector by value.',
        fix: 'Store the buffer as a class member sized in prepare()',
      },
    ],
  },
  {
    id: 'b3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Setter That Sets Nothing', short: 'Find the bug',
    concepts: ['classes'],
    intro: 'Automation moves the gain knob, setGain runs... and the plugin\'s volume never changes. Tap the line that does nothing.',
    questions: [
      {
        type: 'bugspot', concept: 'classes',
        prompt: 'One line assigns a variable to itself. Which?',
        code: [
          'class GainStage {',
          'public:',
          '    void setGain(float gain)',
          '    {',
          '        gain = gain;',
          '    }',
          'private:',
          '    float gain = 1.0f;',
          '};',
        ],
        buggy: 4,
        explain: 'The parameter `gain` *shadows* the member `gain` — inside setGain, the name refers to the parameter, so `gain = gain` assigns the parameter to itself and the member never changes. Fixes: `this->gain = gain;`, or better, name parameters distinctly: `void setGain(float newGain) { gain = newGain; }`. Compilers can warn about shadowing (-Wshadow) — turn that on.',
        fix: 'void setGain(float newGain) { gain = newGain; }',
      },
    ],
  },
  {
    id: 'b4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: Danger on the Audio Thread', short: 'Find the bug',
    concepts: ['realtime-safety'],
    intro: 'This processBlock works in testing, then glitches under load. One line breaks the cardinal rule of audio callbacks. Tap it.',
    questions: [
      {
        type: 'bugspot', concept: 'realtime-safety',
        prompt: 'Which line is unsafe inside an audio callback?',
        code: [
          'void processBlock(AudioBuffer& buffer)',
          '{',
          '    std::vector<float> temp(buffer.getNumSamples());',
          '    float* data = buffer.getWritePointer(0);',
          '    for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '        data[i] *= 0.5f;',
          '}',
        ],
        buggy: 2,
        explain: 'Constructing `std::vector<float> temp(n)` allocates heap memory *on the audio thread, every block*. Allocation can take an unbounded amount of time (the allocator may lock), and the callback has a hard deadline of a few milliseconds — miss it and the DAW glitches. The same rule bans file access, blocking locks, logging, and UI work in the callback. Fix: make temp a member, sized once in prepareToPlay.',
        fix: 'Preallocate temp as a member in prepareToPlay()',
      },
    ],
  },

  /* ============ CODE ORDERING ============ */
  {
    id: 'o1', kind: 'challenge', ctype: 'ordering', title: 'Assemble: The Block Loop', short: 'Order the code',
    concepts: ['loops'],
    intro: 'Rebuild the gain-processing function so it compiles and processes every sample. Use the arrows to arrange the lines.',
    questions: [
      {
        type: 'order', concept: 'loops',
        prompt: 'Arrange top to bottom into a valid function.',
        lines: [
          'void applyGain(float* data, int numSamples, float gain)',
          '{',
          '    for (int i = 0; i < numSamples; ++i)',
          '        data[i] = data[i] * gain;',
          '}',
        ],
        explain: 'Signature → open brace → loop header → loop body → close brace. The body must sit inside the loop, and the loop inside the function — braces are the wiring that decides what contains what.',
      },
    ],
  },
  {
    id: 'o2', kind: 'challenge', ctype: 'ordering', title: 'Assemble: A Class Declaration', short: 'Order the code',
    concepts: ['classes'],
    intro: 'Rebuild the SineOsc class declaration: public interface first, private state below.',
    questions: [
      {
        type: 'order', concept: 'classes',
        prompt: 'Arrange into a valid class declaration (JUCE style: public interface first).',
        lines: [
          'class SineOsc {',
          'public:',
          '    void setFrequency(float hz);',
          'private:',
          '    float freq = 440.0f;',
          '};',
        ],
        explain: 'class name + brace, then the public panel, then the private circuitry, then the closing `};` — that final semicolon after the brace is required, and forgetting it produces famously confusing errors in the *next* file.',
      },
    ],
  },
  {
    id: 'o3', kind: 'challenge', ctype: 'ordering', title: 'Assemble: A Header File', short: 'Order the code',
    concepts: ['headers'],
    intro: 'Rebuild DelayLine.h top to bottom: guard, includes, then the class.',
    questions: [
      {
        type: 'order', concept: 'headers',
        prompt: 'Arrange the header file in conventional top-to-bottom order.',
        lines: [
          '#pragma once',
          '#include <vector>',
          'class DelayLine {',
          'public:',
          '    void prepare(int maxSamples);',
          'private:',
          '    std::vector<float> data;',
          '};',
        ],
        explain: 'Guard first (protects everything below), includes second (the class needs std::vector declared before using it), then the declaration: public interface, private members, closing `};`.',
      },
    ],
  },

  /* ============ SIMULATED COMPILER ERRORS ============ */
  {
    id: 'e1', kind: 'challenge', ctype: 'compiler', title: 'Decode: expected \';\'', short: 'Read the error',
    concepts: ['compiler-errors'],
    intro: 'The build failed. Read the simulated compiler output, find what it\'s really telling you, and pick the fix.',
    questions: [
      {
        type: 'compiler', concept: 'compiler-errors',
        prompt: 'What fixes this build?',
        code: 'float applyGain(float sample, float gain)\n{\n    float result = sample * gain\n    return result;\n}',
        error: "gain.cpp:4:5: error: expected ';' before 'return'\n    4 |     return result;\n      |     ^~~~~~",
        options: [
          { t: 'Add `;` to the end of line 3: `float result = sample * gain;`', why: '' },
          { t: 'Delete the return statement the error points at', why: 'The error *points* at line 4 but the missing semicolon is on line 3 — the compiler only noticed when it hit the next token. Deleting return would break the function.' },
          { t: 'Add `;` after the closing brace of the function', why: 'Function definitions don\'t take a trailing semicolon (class definitions do). The missing one is after `sample * gain`.' },
          { t: 'Rename result — it conflicts with a keyword', why: '`result` is a perfectly legal name. The message says exactly what\'s missing: a semicolon.' },
        ],
        answer: 0,
        explain: 'Key skill: the compiler reports where it *noticed* the problem, which is often one line *after* where you caused it. "expected \';\' before X" almost always means the previous statement is unterminated.',
      },
    ],
  },
  {
    id: 'e2', kind: 'challenge', ctype: 'compiler', title: 'Decode: no matching function', short: 'Read the error',
    concepts: ['compiler-errors', 'pointers'],
    intro: 'A pointer is being handed to a function that wants a value. Decode the message, pick the fix.',
    questions: [
      {
        type: 'compiler', concept: 'compiler-errors',
        prompt: 'processSample takes a float. What fixes the call?',
        code: 'float processSample(float sample);\n\nvoid run(float* input)\n{\n    float out = processSample(input);\n}',
        error: "chain.cpp:5:30: error: no matching function for call to\n'processSample(float*&)'\nnote: candidate: 'float processSample(float)'\nnote:   no known conversion from 'float*' to 'float'",
        options: [
          { t: 'Dereference the pointer: `processSample(*input)`', why: '' },
          { t: 'Take the address instead: `processSample(&input)`', why: 'That produces a float** — a pointer to a pointer — moving one level *further* from the float the function wants.' },
          { t: 'Change processSample to return float*', why: 'The mismatch is in the *argument* (what goes in), not the return type. Read the "no known conversion" note — it names the exact types.' },
          { t: 'Cast it: `processSample((float) input)`', why: 'Forcing an address to become a number would pass a memory address as an audio sample — the compiler error was protecting you from exactly this.' },
        ],
        answer: 0,
        explain: 'The notes are the goldmine: "no known conversion from float* to float" says precisely what\'s wrong — you have an address, the function wants the value. `*input` follows the pointer to the first float. (Passing a *buffer* usually means the function should take the pointer and a length — but this one is a per-sample processor.)',
      },
    ],
  },
  {
    id: 'e3', kind: 'challenge', ctype: 'compiler', title: 'Decode: undefined reference', short: 'Read the error',
    concepts: ['compiler-errors', 'headers'],
    intro: 'Everything compiled — then the final link step failed. This is a different beast from a compile error.',
    questions: [
      {
        type: 'compiler', concept: 'compiler-errors',
        prompt: 'SineOsc.h declares `float nextSample();`. The build ends with this. What\'s the likely cause and fix?',
        code: '// main.cpp\n#include "SineOsc.h"\n\nint main()\n{\n    SineOsc osc;\n    float s = osc.nextSample();\n}',
        error: "ld: error: undefined reference to\n'SineOsc::nextSample()'\ncollect2: error: ld returned 1 exit status",
        options: [
          { t: 'nextSample() was declared but never defined — write its body in SineOsc.cpp (and make sure that file is in the build)', why: '' },
          { t: 'The #include line has a typo', why: 'A broken include fails at *compile* time with "No such file or directory". This error comes from ld — the linker — after compilation succeeded.' },
          { t: 'main() is missing a return statement', why: 'main may omit its return (it defaults to 0). And that wouldn\'t produce a linker error about SineOsc.' },
          { t: 'You must call the constructor before nextSample()', why: '`SineOsc osc;` already ran the constructor. The linker\'s complaint is that nextSample\'s *body* doesn\'t exist anywhere.' },
        ],
        answer: 0,
        explain: '"undefined reference" = the linker searched every compiled object file and found no body for the promised function. Two usual suspects: the body was never written, or the .cpp containing it isn\'t listed in the build (in a CMake project: missing from target_sources / add_executable). This error will greet you again in real JUCE projects — now you can read it.',
      },
    ],
  },

  /* ============ MINI-PROJECTS ============ */
  {
    id: 'p1', kind: 'project', title: 'Mission: TXPPS Gain Utility', short: 'Mini-project',
    concepts: ['functions', 'loops', 'control-flow'],
    brief: 'Build the complete processing core of a gain utility — the same math that powers a real gain plugin. Five steps: signature, dB conversion, safety clamp, the block loop, final review.',
    steps: [
      {
        note: 'Step 1 — The interface. Your gain stage processes one block of audio at a set gain.',
        q: {
          type: 'mcq', concept: 'functions',
          prompt: 'Choose the best signature for the block processor.',
          options: [
            { t: '`void processBlock(float* data, int numSamples, float gain)`', why: '' },
            { t: '`float processBlock(float data)`', why: 'One float in, one float out can\'t address a whole block — you\'d have no buffer and no length.' },
            { t: '`void processBlock(std::vector<float> data, float gain)`', why: 'Passing the vector *by value* copies the entire audio block every call. At minimum you\'d want a reference — and the raw pointer + length form matches what hosts actually hand you.' },
            { t: '`int processBlock(float gain)`', why: 'No audio data goes in at all — there\'d be nothing to process.' },
          ],
          answer: 0,
          explain: 'Pointer to the samples + count + parameters, returning void (we process in place). This mirrors real plugin APIs: JUCE\'s processBlock hands you exactly a buffer of channel pointers and a sample count.',
        },
      },
      {
        note: 'Step 2 — Musicians think in dB. Convert the dB value the user sees into a linear multiplier.',
        q: {
          type: 'fill', concept: 'functions',
          prompt: 'Complete the amplitude conversion: 0 dB → 1.0, -6 dB → ≈0.5.',
          code: 'float dbToGain(float dB)\n{\n    return std::pow(10.0f, dB / ___);\n}',
          accept: ['20.0f', '20.f', '20.0', '20', '20.0F'],
          placeholder: 'divisor',
          hint: 'Amplitude uses one constant, power uses another. Faders are amplitude.',
          mistakes: [
            { match: '^10(\\.0f?)?$', msg: '/10 is the power-ratio formula. For amplitude (what a fader controls), it\'s dB/20 — check: -6/20 → 10^-0.3 ≈ 0.501.' },
          ],
          explain: 'gain = 10^(dB/20) for amplitude. Sanity-check with landmarks you already know by ear: -6 dB halves, +6 dB doubles, -inf mutes.',
        },
      },
      {
        note: 'Step 3 — Safety. Whatever the host sends, never let gain exceed 2.0 (+6 dB) or go negative.',
        q: {
          type: 'fill', concept: 'control-flow',
          prompt: 'Clamp the gain into the range 0.0 to 2.0 using std::clamp(value, low, high).',
          code: 'float safeGain = std::clamp(gain, ___);',
          accept: ['0.0f, 2.0f', '0.0f,2.0f', '0.f, 2.f', '0.f,2.f', '0.0f, 2.f', '0.f, 2.0f'],
          placeholder: 'low, high',
          hint: 'Two arguments: the floor, then the ceiling.',
          mistakes: [
            { match: '^2.*0', msg: 'Order matters: std::clamp(value, low, high) — low first. Swapped bounds are undefined behavior.' },
            { match: '^0(\\.0)?\\s*,\\s*2(\\.0)?$', msg: 'Close — but std::clamp is a template that deduces ONE type from all three arguments. gain is a float, so int or double bounds fail to compile ("deduced conflicting types"). Give the bounds the f suffix: 0.0f, 2.0f.' },
          ],
          explain: 'std::clamp(gain, 0.0f, 2.0f) pins the value into [0, 2]. All three arguments must be the same type — std::clamp deduces one template type, so float value + int bounds refuses to compile (a famous gotcha). Defensive clamping at the edges of your DSP is a professional habit — hosts and automation send out-of-range values.',
        },
      },
      {
        note: 'Step 4 — The engine room. Assemble the processing loop.',
        q: {
          type: 'order', concept: 'loops',
          prompt: 'Arrange the complete processor.',
          lines: [
            'void processBlock(float* data, int numSamples, float gain)',
            '{',
            '    float safeGain = std::clamp(gain, 0.0f, 2.0f);',
            '    for (int i = 0; i < numSamples; ++i)',
            '        data[i] *= safeGain;',
            '}',
          ],
          explain: 'Clamp once *outside* the loop (the gain doesn\'t change mid-block), then the canonical per-sample loop. Hoisting invariant work out of the loop is a core DSP habit.',
        },
      },
      {
        note: 'Step 5 — Code review. A teammate "optimized" your function. Something broke.',
        q: {
          type: 'bugspot', concept: 'loops',
          prompt: 'Their version clicks at block boundaries. Tap the broken line.',
          code: [
            'void processBlock(float* data, int numSamples, float gain)',
            '{',
            '    float safeGain = std::clamp(gain, 0.0f, 2.0f);',
            '    for (int i = 1; i < numSamples; ++i)',
            '        data[i] *= safeGain;',
            '}',
          ],
          buggy: 3,
          explain: 'The loop starts at i = 1, so sample 0 of every block passes through *unprocessed*. At block boundaries the gain jumps between processed and raw levels — a click every 512 samples. Off-by-one bugs at the *start* are quieter than the ones at the end, but just as real. Loops over buffers start at 0.',
          fix: 'for (int i = 0; i < numSamples; ++i)',
        },
      },
    ],
  },
  {
    id: 'p2', kind: 'project', title: 'Mission: Sine Oscillator Class', short: 'Mini-project',
    concepts: ['classes', 'loops', 'types'],
    brief: 'Design a SineOsc class from scratch: choose its private state, compute the phase increment, wrap the phase, assemble nextSample(), and predict its first output.',
    steps: [
      {
        note: 'Step 1 — Design the state. A sine oscillator must remember where it is in its cycle between calls.',
        q: {
          type: 'mcq', concept: 'classes',
          prompt: 'Which members belong in the private section of SineOsc?',
          options: [
            { t: '`phase`, `frequency`, and `sampleRate`', why: '' },
            { t: 'Nothing — recompute everything from scratch each sample', why: 'An oscillator without stored phase restarts its cycle every call — you\'d output the same value forever, not a wave.' },
            { t: 'The entire output buffer for the whole song', why: 'Oscillators generate on demand, sample by sample. Storing a full song of audio is a sampler\'s job, and even those stream.' },
            { t: 'Only `frequency` — phase should be a global variable', why: 'A global phase means every oscillator in your synth shares one cycle position — 8 voices, one blurred pitch. Per-object state is the whole point of the class.' },
          ],
          answer: 0,
          explain: 'phase (where in the cycle), frequency (how fast to move), sampleRate (how time maps to samples). Each SineOsc object carries its own — which is exactly what lets a poly synth run one per voice.',
        },
      },
      {
        note: 'Step 2 — The phase increment: how far the phase advances per sample. One full cycle is 2π radians, and frequency cycles happen per second.',
        q: {
          type: 'fill', concept: 'types',
          prompt: 'Complete the increment: cycles per second × radians per cycle ÷ samples per second.',
          code: 'void updateIncrement()\n{\n    phaseIncrement = twoPi * frequency / ___;\n}',
          accept: ['sampleRate', 'sampleRate;'],
          placeholder: 'divisor',
          hint: 'What converts "per second" into "per sample"?',
          mistakes: [
            { match: '^frequency$', msg: 'frequency is already in the expression. Dividing by sampleRate is what converts per-second motion into per-sample motion.' },
            { match: '^2$|^twoPi$', msg: 'twoPi is already the multiplier. The divisor turns per-second into per-sample: sampleRate.' },
          ],
          explain: 'phaseIncrement = 2π · f / fs. At 440 Hz and 48 kHz: 2π × 440 / 48000 ≈ 0.0576 radians per sample. Change the sample rate and the increment must change too — which is why oscillators get told the rate in prepareToPlay.',
        },
      },
      {
        note: 'Step 3 — Keep the phase bounded. After passing 2π, wrap it back so it never grows forever (large floats lose precision).',
        q: {
          type: 'fill', concept: 'control-flow',
          prompt: 'Wrap the phase when it passes one full cycle.',
          code: 'phase += phaseIncrement;\nif (phase >= twoPi)\n    ___',
          accept: ['phase -= twoPi;', 'phase -= twoPi', 'phase = phase - twoPi;', 'phase = phase - twoPi'],
          placeholder: 'statement',
          hint: 'Subtract a full cycle — don\'t reset to zero.',
          mistakes: [
            { match: '^phase\\s*=\\s*0(\\.0f?)?;?$', msg: 'Resetting to exactly 0 throws away the fractional overshoot — a tiny phase error every cycle that detunes the oscillator. Subtract twoPi to keep the remainder.' },
          ],
          explain: '`phase -= twoPi;` keeps the overshoot: if phase reached 6.30, it becomes ~0.017, not 0. sin() is periodic, so the waveform is identical — but the phase float stays small and precise for hours of playback.',
        },
      },
      {
        note: 'Step 4 — Assemble nextSample(): compute the output, advance, wrap, return.',
        q: {
          type: 'order', concept: 'classes',
          prompt: 'Arrange the body of nextSample().',
          lines: [
            'float nextSample()',
            '{',
            '    float out = std::sin(phase);',
            '    phase += phaseIncrement;',
            '    if (phase >= twoPi) phase -= twoPi;',
            '    return out;',
            '}',
          ],
          explain: 'Read the current phase first, then advance for next time. Computing `out` before incrementing means the very first sample is sin(0) — the wave starts cleanly at zero.',
        },
      },
      {
        note: 'Step 5 — Verify by prediction, like checking a scope before you trust a build.',
        q: {
          type: 'predict', concept: 'classes',
          prompt: 'Fresh oscillator, phase starts at 0.0. What is the very first value nextSample() returns?',
          code: 'SineOsc osc;          // phase == 0.0\nfloat first = osc.nextSample();',
          options: [
            { t: '`0.0` — sin(0) is zero', why: '' },
            { t: '`1.0` — full amplitude', why: 'sin reaches 1.0 a quarter-cycle in (phase = π/2), not at phase 0.' },
            { t: '`-1.0`', why: 'That\'s the trough at phase 3π/2 — three quarters through the cycle.' },
            { t: 'Random — depends on memory contents', why: 'phase was explicitly initialized to 0.0 — no garbage involved. (If it *hadn\'t* been initialized, this answer would be the scary truth.)' },
          ],
          answer: 0,
          explain: 'sin(0) = 0: the wave starts at the zero crossing and rises, so it begins with no click. Your SineOsc is complete: state, increment, wrap, output. In Zone 4 this exact class grows anti-aliasing and modulation inputs.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss1', kind: 'boss', title: 'BOSS: The Broken Gain Plugin', short: 'Zone 1 boss',
    concepts: ['types', 'loops', 'pointers', 'classes', 'realtime-safety', 'compiler-errors'],
    brief: 'You\'ve inherited GainPlug — a half-finished plugin from a developer who left the project. It doesn\'t build, and when it did, it glitched. Work through six stages to ship it: fix the build, hunt the bugs, harden the callback. One retry per stage; clear at least 4 of 6.',
    stages: [
      {
        type: 'compiler', concept: 'compiler-errors',
        prompt: 'Stage 1 — It won\'t build. What\'s the fix?',
        code: 'class GainPlug {\npublic:\n    void setGain(float g);\nprivate:\n    float gain = 1.0f;\n}\n\nvoid GainPlug::setGain(float g)\n{\n    gain = g;\n}',
        error: "GainPlug.h:6:2: error: expected ';' after class definition\n    6 | }\n      |  ^\n      |  ;",
        options: [
          { t: 'Add `;` after the class\'s closing brace: `};`', why: '' },
          { t: 'Remove the `GainPlug::` prefix from setGain', why: 'The prefix is required to define a member outside the class. The error names exactly what\'s missing: a semicolon after the class definition.' },
          { t: 'Move setGain\'s body inside the private section', why: 'Definitions can live outside the class — that\'s the normal .cpp pattern. The class just needs its terminating semicolon.' },
          { t: 'Delete the private section', why: 'private members are fine. Read the error: "expected \';\' after class definition".' },
        ],
        answer: 0,
        explain: 'Class definitions end with `};` — brace AND semicolon. Miss it and the error often lands on whatever code comes next. You read the message instead of guessing: that\'s the skill.',
      },
      {
        type: 'bugspot', concept: 'loops',
        prompt: 'Stage 2 — It builds now, but crashes the host at random. Tap the line that reads out of bounds.',
        code: [
          'void process(float* data, int numSamples)',
          '{',
          '    for (int i = 0; i <= numSamples; ++i)',
          '        data[i] *= gain;',
          '}',
        ],
        buggy: 2,
        explain: '`<=` walks one past the end: data[numSamples] is not yours. Undefined behavior — the "random" crashes weren\'t random at all. `i < numSamples`.',
        fix: 'for (int i = 0; i < numSamples; ++i)',
      },
      {
        type: 'predict', concept: 'types',
        prompt: 'Stage 3 — The "50% mix" control outputs silence. Why?',
        code: 'int mixPercent = 50;\nfloat mix = mixPercent / 100;   // intended: 0.5\nsample *= mix;',
        options: [
          { t: 'mix is 0 — integer division truncated 50/100 before the float could hold it', why: '' },
          { t: 'mix is 0.5 and something else is broken', why: 'Both operands of the division are ints — 50/100 truncates to 0 *first*, and only then converts. The float destination can\'t rescue a value already lost.' },
          { t: 'It fails to compile', why: 'Perfectly legal C++ — that\'s what makes it a career-long trap.' },
          { t: 'mix is 2.0 — the division inverted', why: 'Integer division truncates toward zero; it never inverts.' },
        ],
        answer: 0,
        explain: '50 / 100 in int arithmetic is 0. Fix: make the math floating point *before* dividing — `mixPercent / 100.0f`. You met this in Lesson 1; here it is wearing a mix knob.',
      },
      {
        type: 'order', concept: 'loops',
        prompt: 'Stage 4 — Rebuild the cleaned-up processor from the pieces.',
        lines: [
          'void process(float* data, int numSamples)',
          '{',
          '    float g = std::clamp(gain, 0.0f, 2.0f);',
          '    for (int i = 0; i < numSamples; ++i)',
          '        data[i] *= g;',
          '}',
        ],
        explain: 'Clamp once before the loop, then the canonical bounded loop. This is the reference shape for every block processor you\'ll write from here on.',
      },
      {
        type: 'fill', concept: 'pointers',
        prompt: 'Stage 5 — The plugin sometimes runs before its oscillator exists. Guard it.',
        code: 'if (osc ___ nullptr)\n    osc->render(data, numSamples);',
        accept: ['!='],
        placeholder: 'operator',
        hint: 'Render only when the pointer is NOT null.',
        mistakes: [
          { match: '^==$', msg: '`==` renders only when osc is null — a guaranteed crash. Flip it: `!=`.' },
        ],
        explain: 'Null-check before dereference. In real plugins, "the editor/oscillator/buffer doesn\'t exist yet" is a whole class of crashes — the guard is one operator wide.',
      },
      {
        type: 'mcq', concept: 'realtime-safety',
        prompt: 'Stage 6 — Final review. Which of these is SAFE to do inside processBlock?',
        options: [
          { t: 'Multiply every sample by a pre-computed gain value', why: '' },
          { t: 'Resize a std::vector to match the block size', why: 'Resizing may allocate heap memory — unbounded time on a hard-deadline thread. Size it in prepareToPlay.' },
          { t: 'Write debug info to a log file', why: 'File I/O can block for milliseconds — an eternity in a callback. Log from the UI/message thread instead.' },
          { t: 'Lock a mutex shared with the UI thread', why: 'If the UI holds that lock, the audio thread *waits* — priority inversion, dropouts. Zone 6 teaches lock-free alternatives.' },
        ],
        answer: 0,
        explain: 'Pure arithmetic on data you already own: always safe. Allocation, file I/O and blocking locks all have unbounded worst-case time — and the callback deadline is absolute. This one rule separates plugins that glitch from plugins that ship. GainPlug is stable — Zone 1 cleared.',
      },
    ],
  },
];
