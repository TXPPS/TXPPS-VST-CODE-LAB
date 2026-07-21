/* ============================================================
   ZONE 1 — lesson content, lessons 7–12 (appended to
   ZONE1_LESSONS defined in data_zone1_lessons.js).
   Same shape and teaching structure as part A.
   ============================================================ */

ZONE1_LESSONS.push(

  /* ---------------------------------------------------------- L7 */
  {
    id: 'l7', kind: 'lesson', title: 'Buffers: Arrays & std::vector', short: 'Arrays and std::vector',
    concepts: ['containers'],
    hook: 'A delay pedal doesn\'t "slow down" audio — it remembers it. Inside is a memory bank holding the last second of sound, replayed a moment later. Time to build memory banks.',
    objective: 'Store rows of samples — fixed banks and resizable ones — and learn when resizing is forbidden.',
    sections: [
      {
        h: 'A row of slots',
        body: 'An **array** is a fixed row of values, side by side, numbered from **0**. Like a hardware step sequencer: 16 slots, wired in forever. You can change what\'s *in* a slot — never how many slots exist.',
        viz: { t: 'buffer', n: 4, values: ['0.1', '0.4', '0.4', '0.1'], highlight: 0, label: 'float window[4]', caption: 'first slot is window[0] — last of four is window[3]' },
        code: 'float window[4] = { 0.1f, 0.4f, 0.4f, 0.1f };\nfloat first = window[0];  // 0.1f\nfloat last  = window[3];  // index 3, not 4',
        codeTitle: 'a fixed array',
      },
      {
        h: 'The resizable bank: std::vector',
        body: '`std::vector<float>` is the workhorse: a row of floats that can **change size while the plugin runs**. It knows its own length (`.size()`), and `.resize()` sets how many slots it holds. Delay lines, wavetables, working buffers — this is what they\'re made of.',
        code: 'std::vector<float> delayLine;\ndelayLine.resize(48000);   // one second at 48kHz\ndelayLine[0] = 0.25f;',
        codeTitle: 'a delay line',
        breakdown: [
          ['std::vector<float>', 'a resizable row of floats'],
          ['delayLine', 'the name — this will remember audio'],
          ['.resize(48000)', 'give it 48,000 slots, all starting at silence'],
          ['delayLine[0]', 'read or write slot 0, like any array'],
        ],
      },
      {
        h: 'Size it backstage, never on stage',
        body: 'Growing a vector can ask the system for **new memory**, and that can take an unpredictable amount of time. During setup: fine. While audio is running: that pause becomes a **glitch**. And one more rule: nothing stops you reading past the last slot — except your own loop bounds.',
        mistake: { code: 'for (int i = 0; i <= buffer.size(); ++i) // ✗ one slot too far', text: '`<=` with size() walks one slot past the end — undefined behavior. (Also: size() is an unsigned number; comparing it with int draws a compiler warning worth heeding.)' },
        warn: 'The rule that will follow you through this whole course: **size buffers in prepareToPlay, only read and write them in processBlock.** Zone 2 explains exactly why.',
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
    inside: [
      { name: 'Delay', use: 'the delay line is a vector sized to the maximum delay time' },
      { name: 'Sampler', use: 'the loaded sample lives in one big vector of floats' },
      { name: 'Synth', use: 'wavetables are arrays your oscillator reads its shapes from' },
      { name: 'Chorus', use: 'a short delay line — same vector, smaller size' },
    ],
    analogyPanel: 'An array is a hardware step sequencer: slots wired in forever. A vector is a modular case you can re-rack between sessions — but never mid-performance.',
    beginnerMistake: 'Growing a buffer while audio is running (push_back in the callback). Growth can allocate, allocation can stall, and a stalled audio thread is a glitch the whole room hears.',
    remember: 'Buffers get their size backstage (prepare) — never on stage (processBlock).',
  },

  /* ---------------------------------------------------------- L8 */
  {
    id: 'l8', kind: 'lesson', title: 'References: One Signal, Two Labels', short: 'References',
    concepts: ['references'],
    hook: 'On a patchbay, one mult puts the same signal on two jacks. Two labels, one wire: mute the source and it vanishes at both — because there was only ever one signal.',
    objective: 'Give existing values a second name — the no-copy way plugins share and modify audio.',
    sections: [
      {
        h: 'Two names, one value',
        body: 'A **reference** (`float&`) is a second name for a value that already exists. Not a copy — the *same* value. Write through either name and both see it, because there\'s only one thing being named.',
        viz: { t: 'mult', a: 'sample', b: 'float& alias', value: '0.2f', caption: 'write through either name — there is only one value' },
        code: 'float sample = 0.8f;\nfloat& alias = sample;  // same value, second name\n\nalias = 0.2f;\n// sample is now 0.2f too',
        codeTitle: 'an alias',
        breakdown: [
          ['float&', '"another name for an existing float" — the & makes it an alias'],
          ['alias', 'the second label'],
          ['= sample', 'which value it names — locked in at birth, forever'],
        ],
      },
      {
        h: 'Why audio code runs on references',
        body: 'Hand a function a reference and it works on **your actual audio**, not a private copy: `void processSample(float& s)` changes the caller\'s sample. Mark it `const&` and it\'s the view-only loan from the const lesson — read big things, copy nothing.',
        code: 'void processSample(float& s)   // edits the real sample\n{\n    s *= 0.5f;\n}\n\nvoid show(const Preset& p)     // reads without copying\n{\n    // look, don\'t touch\n}',
        codeTitle: 'references as parameters',
        mistake: { text: 'Forget the `&` — `void processSample(float s)` — and the function silently processes a **copy**. No error, no warning: your effect simply "does nothing." If a processor seems dead, check for a missing &.' },
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
    inside: [
      { name: 'Every effect', use: 'processBlock hands you the host\'s buffer by reference — you edit the real audio' },
      { name: 'Mixer', use: 'a channel strip processes its track through references, never copies' },
      { name: 'Synth', use: 'voices receive the output buffer by reference and add their sound into it' },
      { name: 'Presets', use: 'const Preset& lets the UI read a preset without duplicating it' },
    ],
    analogyPanel: 'A reference is a patchbay mult: one signal, two jack labels. There is no copy — both names carry the same audio.',
    beginnerMistake: 'Forgetting the &. `void process(float s)` quietly processes a copy — the original never changes, and your "broken" effect is actually working perfectly… on the wrong signal.',
    remember: 'A reference is a second label on the same signal — not a copy.',
  },

  /* ---------------------------------------------------------- L9 */
  {
    id: 'l9', kind: 'lesson', title: 'Pointers & Memory Safety', short: 'Pointers, nullptr, safety',
    concepts: ['pointers', 'memory'],
    hook: '"The delay is in rack 2, slot 5." That sticky note isn\'t the delay — it\'s directions to it. C++ has written-down directions too: pointers. Handled well, they\'re everywhere in JUCE. Handled badly, they\'re why plugins crash DAWs.',
    objective: 'Read pointer code, guard against "nothing patched here", and recognize the two classic pointer disasters.',
    sections: [
      {
        h: 'A note with an address',
        body: 'A **pointer** (`float*`) doesn\'t hold a value — it holds *where a value lives*. Following the directions to the actual value is called **dereferencing**. And a pointer can hold one special note: `nullptr` — "nothing patched here."',
        viz: { t: 'rackPointer', code: 'float* p', note: '"rack 2, slot 5"', slot: 'OSC' },
        code: 'float sample = 0.8f;\nfloat* p = &sample;   // write down sample\'s location\n*p = 0.5f;            // follow the note, change the value\n\nfloat* q = nullptr;   // note says: nothing patched',
        codeTitle: 'pointers',
        breakdown: [
          ['float*', '"directions to a float" — the * makes it a pointer'],
          ['&sample', '"the location of sample" — write the directions down'],
          ['*p', 'follow the directions; touch the value that lives there'],
          ['nullptr', 'directions that honestly say: nothing here'],
        ],
      },
      {
        h: 'Check before you patch',
        body: 'Follow a `nullptr` note — walk up to the empty slot expecting gear — and the program crashes. In a plugin, it takes the **whole DAW** down with it. The guard is one line, and it\'s a daily habit in real plugin code. (`osc->process()` means: follow the pointer, then use that object\'s controls — the pointer version of the dot.)',
        viz: { t: 'rackPointer', code: 'float* osc', note: 'nullptr', empty: true },
        code: 'if (osc != nullptr)\n    osc->process(buffer);   // safe: the gear exists',
        codeTitle: 'the null check',
      },
      {
        h: 'The vanished rack',
        body: 'Second disaster: directions to gear that\'s been **struck down**. A local variable dies when its function ends — return its address and the caller holds a note pointing at an empty stage. That\'s a **dangling pointer**.',
        mistake: { code: 'float* makeBuffer()\n{\n    float local[512];\n    return local;   // ✗ local dies right here\n}', text: 'The note still says "rack 2, slot 5" — but the show is over and the gear is gone. Whatever the caller reads is garbage.' },
        warn: 'Where you\'ll *see* pointers in JUCE: `buffer.getWritePointer(channel)` hands you a float* straight into the audio. Owning things through raw pointers (new/delete) is old-school — Zone 2 replaces it with smart pointers.',
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
    inside: [
      { name: 'JUCE buffers', use: 'getWritePointer(channel) is a float* straight into the audio block' },
      { name: 'Editor', use: 'the UI may not exist yet — real plugins null-check it constantly' },
      { name: 'Sampler', use: 'a playhead is effectively a pointer into the loaded sample data' },
      { name: 'Crash logs', use: 'most DAW crash reports end at a null or dangling pointer' },
    ],
    analogyPanel: 'A pointer is a written-down patch location. nullptr is a note that says "nothing patched here" — and walking up to an empty slot expecting gear is how plugins take DAWs down.',
    beginnerMistake: 'Following the directions without checking them. One `if (ptr != nullptr)` before the visit is the difference between a quiet skip and crashing the session.',
    remember: 'A pointer is directions to a value — always check the directions before you follow them.',
  },

  /* ---------------------------------------------------------- L10 */
  {
    id: 'l10', kind: 'lesson', title: 'Classes: Your Synth Blueprint', short: 'Classes and objects',
    concepts: ['classes'],
    hook: 'One Minimoog schematic. Thousands of Minimoogs built from it — each with its own knob positions. That one relationship is the most important idea in plugin code.',
    objective: 'Design once, build many: create classes, make objects from them, and see why each object keeps its own settings.',
    sections: [
      {
        h: 'Design vs. unit',
        body: 'A **class** is the schematic: it bundles the knobs (**member variables**) with the behavior (**member functions**) into one design. An **object** is one unit built from it. One design — as many units as you want.',
        viz: { t: 'blueprint', cls: 'class Filter', a: 'cutoff: 200', b: 'cutoff: 2000' },
        code: 'class Filter {\npublic:\n    void setCutoff(float hz) { cutoff = hz; }\n    float getCutoff()        { return cutoff; }\n\nprivate:\n    float cutoff = 1000.0f;   // each unit gets its own\n};',
        codeTitle: 'a filter design',
        breakdown: [
          ['class Filter', 'a new design, named Filter'],
          ['public:', 'the front panel — what everyone may touch'],
          ['private:', 'inside the case — only the unit itself'],
          ['};', 'end of design — that semicolon is required!'],
        ],
      },
      {
        h: 'Every unit remembers its own settings',
        body: '`Filter a;` builds one unit; the dot reaches its panel: `a.setCutoff(200.0f)`. Build a second and they\'re fully independent — same design, separate knobs. This is exactly how **polyphony** works: one Voice class, eight voice objects, eight independent sounds.',
        code: 'Filter a;\nFilter b;\na.setCutoff(200.0f);\nb.setCutoff(2000.0f);\n// two units, two separate cutoffs',
        codeTitle: 'independent units',
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
    inside: [
      { name: 'Synth', use: 'one Voice class → eight voice objects = polyphony' },
      { name: 'Stereo FX', use: 'two identical filter objects — one per channel' },
      { name: 'JUCE', use: 'your whole plugin is one class: the AudioProcessor' },
      { name: 'Modulation', use: 'three LFO objects from one LFO class, each at its own rate' },
    ],
    analogyPanel: 'Class = schematic, object = the unit on your desk, member variables = its knob positions, member functions = its buttons.',
    beginnerMistake: 'Thinking objects share their insides. Two filters from one class are as separate as two hardware units — if state ever *seems* shared, something is miswired (usually a static or a shared pointer).',
    remember: 'A class is the design; every object built from it lives its own life.',
  },

  /* ---------------------------------------------------------- L11 */
  {
    id: 'l11', kind: 'lesson', title: 'Constructors & the Front Panel', short: 'Constructors, encapsulation',
    concepts: ['classes', 'encapsulation'],
    hook: 'Flip the power switch on good hardware: relays click, defaults load, the unit wakes in a known state. No serious gear boots with random values on every knob — and no serious code object should either.',
    objective: 'Give objects a power-on sequence, and design a control surface that makes invalid settings impossible.',
    sections: [
      {
        h: 'The power-on sequence',
        body: 'A **constructor** runs automatically the instant an object is built — its job is to wake the unit in a valid state. It shares the class\'s name and has no return type. The `: member(value)` list sets members first, before anything else happens.',
        code: 'class GainStage {\npublic:\n    GainStage(float initialGain)\n        : gain(initialGain)      // set before anything runs\n    {\n    }\n\nprivate:\n    float gain = 1.0f;           // the default otherwise\n};',
        codeTitle: 'power-on sequence',
        breakdown: [
          ['GainStage(float initialGain)', 'runs by itself the instant a GainStage is built'],
          [': gain(initialGain)', 'the initializer list — members set first'],
          ['{ }', 'the body — often empty when the list did the work'],
          ['float gain = 1.0f;', 'the built-in default if nobody says otherwise'],
        ],
      },
      {
        h: 'Panel vs. circuitry',
        body: '`public:` is the **front panel** — what outside code may touch. `private:` is the **circuitry** — reachable only from inside. Every change then flows through a panel control that can enforce the rules. This idea has a name: **encapsulation**.',
        viz: { t: 'twoLayer', top: 'public: — the front panel', topSub: 'setGain(), getGain()', bottom: 'private: — the circuitry', bottomSub: 'float gain', caption: 'outside code turns knobs — it never resolders' },
        code: 'public:\n    void setGain(float g)\n    {\n        gain = std::clamp(g, 0.0f, 2.0f); // enforce limits\n    }\nprivate:\n    float gain = 1.0f;   // nobody sets this to 9000 directly',
        codeTitle: 'a guarded knob',
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
    inside: [
      { name: 'Synth', use: 'every voice constructs silent and ready — never random' },
      { name: 'JUCE', use: 'your processor\'s constructor declares its parameters' },
      { name: 'Effect', use: 'setters clamp values so host automation can\'t push DSP into chaos' },
      { name: 'Presets', use: 'loading a preset calls guarded setters, not raw variables' },
    ],
    analogyPanel: 'The constructor is the power-on sequence; public members are the front panel; private members are the circuitry behind it. Users turn knobs — they don\'t resolder.',
    beginnerMistake: 'Making everything public "for now." It works — until any code anywhere can set gain = 9000 and you\'re hunting a blown mix bus across the whole project. Private + a clamping setter ends that search before it starts.',
    remember: 'Objects should power on valid — and only change through their panel controls.',
  },

  /* ---------------------------------------------------------- L12 */
  {
    id: 'l12', kind: 'lesson', title: 'Headers, Sources & Reading Errors', short: '.h/.cpp files, compiler errors',
    concepts: ['headers', 'compiler-errors'],
    hook: 'You can patch a modular synth you\'ve never opened — because the front panel tells you everything: every jack, every knob, labeled. C++ files split the exact same way: panel on the outside, circuit inside.',
    objective: 'Split a class into its panel (.h) and circuit (.cpp) — and learn to read the two kinds of build failure calmly.',
    sections: [
      {
        h: 'The panel and the circuit',
        body: 'Each class ships as two files. The **header** (`.h`) is the front panel: what the class offers, for other files to `#include`. The **implementation** (`.cpp`) is the circuit board: how it actually works. Every JUCE project you\'ve seen follows it: `PluginProcessor.h` / `PluginProcessor.cpp`.',
        viz: { t: 'twoLayer', top: 'SineOsc.h — the front panel', topSub: 'what exists', bottom: 'SineOsc.cpp — the circuit board', bottomSub: 'how it works', caption: 'other files see only the panel' },
        code: '// SineOsc.h — the panel\n#pragma once\n\nclass SineOsc {\npublic:\n    void  setFrequency(float hz);\n    float nextSample();\nprivate:\n    double phase = 0.0;\n    float  freq  = 440.0f;\n};',
        codeTitle: 'the header',
        breakdown: [
          ['#pragma once', '"read this panel at most once" — every header starts with it'],
          ['class SineOsc {', 'the design\'s name and jack list'],
          ['void setFrequency(float);', 'a promise: this control exists (its body lives in the .cpp)'],
          ['};', 'end of panel — that semicolon matters'],
        ],
      },
      {
        h: 'The circuit board',
        body: 'The `.cpp` includes its own header first, then wires up each promised control. The `SineOsc::` prefix says "this body belongs to that design."',
        code: '// SineOsc.cpp — the circuit\n#include "SineOsc.h"\n\nvoid SineOsc::setFrequency(float hz)\n{\n    freq = hz;\n}',
        codeTitle: 'the implementation',
      },
      {
        h: 'When the build fails (and it will)',
        body: 'Builds fail in two ways, and telling them apart saves hours. The **compiler** is a proofreader: it checks each file for typos and wrong types, and names a file and line. The **linker** wires panels to circuits afterward — its error **"undefined reference"** means a control was promised on a panel but no circuit exists behind it.',
        warn: 'The classic: you declared `nextSample()` in the header, forgot the body in the .cpp — and the *compiler* is perfectly happy. The linker catches the hole, in language that names no file or line. Now you can read it.',
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
    inside: [
      { name: 'JUCE', use: 'PluginProcessor.h / PluginProcessor.cpp — the split you\'ll live in' },
      { name: 'CMake', use: 'a .cpp missing from the build = "undefined reference" at link time' },
      { name: 'Any project', use: 'every class you write ships as panel (.h) + circuit (.cpp)' },
      { name: 'Debugging', use: 'reading errors top-down, first error first, is a daily skill' },
    ],
    analogyPanel: 'The header is the front-panel silkscreen; the .cpp is the circuit board. Other modules patch to the panel — nobody opens the case.',
    beginnerMistake: 'Panicking at a wall of forty errors and reading from the bottom. Most are echoes of the first one. Scroll to the top, fix error #1, rebuild — the wall usually collapses.',
    remember: 'Panel in the .h, circuit in the .cpp — and always fix the first error first.',
  }
);
