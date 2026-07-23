/* ============================================================
   ZONE 2 — MODERN C++ FOR AUDIO: lessons m1–m8.
   Same lesson shape as Zone 1, plus:
     time: estimated completion ('~6 MIN')
     diff: difficulty 1–3 (rendered as dots)
     builds: [dict ids] — links to previous concepts
     leads:  [dict ids] — links to future concepts
   ============================================================ */

const ZONE2_LESSONS = [

  /* ---------------------------------------------------------- M1 */
  {
    id: 'm1', kind: 'lesson', title: 'Who Owns This Sound?', short: 'Ownership & lifetime',
    concepts: ['ownership'], time: '~5 MIN', diff: 1,
    hook: 'A voice starts playing. The note ends. The voice is gone. Who decided when it died? In C++, every object has exactly one answer to that question — and getting it wrong is where plugins crash.',
    objective: 'See that every object has a birth, a life, and a death — and that something always owns the decision.',
    sections: [
      {
        h: 'Every object has a lifetime',
        body: 'From Zone 1: locals die at their closing brace. That death is the end of a **lifetime** — birth (constructor), life, death (destructor). Nothing in C++ lives forever by accident; something always decides when each object goes.',
        viz: { t: 'lifetime' },
        code: 'void noteOn()\n{\n    Envelope env;   // born here\n    // ... used ...\n}                   // dies here — automatically',
        codeTitle: 'a lifetime in braces',
      },
      {
        h: 'Ownership: who is responsible',
        body: 'The **owner** of an object is whatever is responsible for its death. A local is owned by its scope. A **member** is owned by its object: your processor owns its oscillators, so they live exactly as long as the plugin does. One clear owner per thing = no leaks, no double-frees, no mystery crashes.',
        code: 'class SynthEngine {\nprivate:\n    SineOsc osc;          // owned member:\n    double  phase = 0.0;  // lives as long as the engine\n};',
        codeTitle: 'members live with their owner',
        warn: 'The question to ask about every object from now on: **who owns this, and when does it die?** The rest of this zone is tools for answering it well.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'ownership',
        prompt: 'When does a local variable\'s lifetime end?',
        options: [
          { t: 'At the closing brace of the scope it was declared in', why: '' },
          { t: 'When the program exits', why: 'That\'s only true for globals. Locals die far earlier — at their scope\'s end.' },
          { t: 'When you stop using it', why: 'The compiler may optimize, but the *rule* is scope: the closing brace is the guarantee.' },
          { t: 'Never — memory is permanent', why: 'Stack memory is reclaimed constantly. That\'s why returning a local\'s address dangles.' },
        ],
        answer: 0,
        explain: 'Scope is the lifetime contract: born at the declaration, destroyed at the closing brace. Automatic, guaranteed, in reverse order of creation.',
      },
      {
        type: 'predict', concept: 'ownership',
        prompt: 'The host calls this three times. What does count hold at the end of each call?',
        code: 'void processBlock(/*...*/)\n{\n    int count = 0;\n    ++count;\n}',
        options: [
          { t: '1 every time — count is reborn each call', why: '' },
          { t: '1, then 2, then 3', why: 'count is a local: it dies at the closing brace and a fresh one is born next call. Counting across blocks needs a *member*.' },
          { t: '3 every time', why: 'Each call starts from a brand-new count = 0.' },
          { t: 'Random garbage', why: 'It\'s explicitly initialized to 0 — no garbage. Just no memory between calls either.' },
        ],
        answer: 0,
        explain: 'Locals restart from scratch every call. State that must survive between blocks — a phase, a counter, a delay line — belongs in a member, owned by the plugin object.',
      },
      {
        type: 'fill', concept: 'ownership',
        prompt: 'Name the special function that runs at the moment a Voice dies.',
        code: 'class Voice {\npublic:\n    ___()\n    {\n        // cleanup runs here, automatically\n    }\n};',
        accept: ['~Voice'],
        placeholder: 'name',
        hint: 'Same name as the class, with one character in front.',
        mistakes: [
          { match: '^Voice$', msg: 'That\'s the constructor — the power-ON sequence. The power-OFF sequence adds a tilde: `~Voice`.' },
        ],
        explain: '`~Voice()` is the destructor: it runs automatically the instant a Voice\'s lifetime ends. You met it in the dictionary — this zone puts it to work.',
      },
    ],
    recap: [
      'Every object: born (constructor), lives, dies (destructor).',
      'Locals are owned by their scope; members are owned by their object.',
      'State that must survive between blocks lives in members.',
      'Always ask: who owns this, and when does it die?',
    ],
    inside: [
      { name: 'Synth', use: 'voices are owned by the engine — they die when it does' },
      { name: 'Sampler', use: 'loaded sample data has one owner deciding when to unload' },
      { name: 'Any plugin', use: 'the DAW creates and destroys your plugin object constantly' },
    ],
    analogyPanel: 'Ownership is the gear list with names on it: every rack unit has exactly one person responsible for striking it after the show. Two names on one unit — or none — is how gear gets lost.',
    beginnerMistake: 'Declaring state inside processBlock and expecting it to persist. Locals are reborn every call — a phase or counter declared there resets forever.',
    remember: 'Every object has one owner, and the owner decides when it dies.',
    builds: ['scope', 'constructor', 'destructor'],
    leads: ['raii', 'smart-pointer'],
  },

  /* ---------------------------------------------------------- M2 */
  {
    id: 'm2', kind: 'lesson', title: 'Backstage Memory: Stack vs Heap', short: 'Stack, heap, dynamic memory',
    concepts: ['memory'], time: '~5 MIN', diff: 1,
    hook: 'Some gear lives on your pedalboard — grabbed instantly, packed up after each song. Some lives in the warehouse — room for anything, but every checkout takes paperwork. Your program\'s memory works exactly like that.',
    objective: 'Know which memory your objects live in, what dynamic allocation really costs, and why you\'ll never manage it by hand.',
    sections: [
      {
        h: 'Two kinds of memory',
        body: 'The **stack**: fast, automatic, small — locals live here and vanish at the closing brace. The **heap**: the big flexible pool — sample libraries and delay lines live here, requested at runtime. Requesting heap memory is called **allocation**, and you can never quite predict how long it\'ll take.',
        viz: { t: 'twoLayer', top: 'STACK — automatic, fast', topSub: 'locals; gone at return', bottom: 'HEAP — requested, flexible', bottomSub: 'big & persistent; someone must release it', caption: 'pedalboard vs warehouse' },
      },
      {
        h: 'Manual heap management — see it once, then never again',
        body: 'Old C++ managed the heap by hand: `new` checks memory out, `delete` returns it. Forget the delete → **leak**. Delete twice → crash. This course shows it once so you can read old code — and then replaces it entirely with tools that can\'t forget.',
        mistake: { code: 'SineOsc* osc = new SineOsc();  // checked out...\n// ...forgot delete — leaked forever', text: 'A DAW session runs for hours and reloads plugins constantly. Small leaks compound into gigabytes. Modern C++ (next lesson) makes forgetting impossible.' },
        warn: 'Zone 1\'s rule still stands and now you know why: allocation is warehouse paperwork — fine in `prepareToPlay`, never in `processBlock`.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'memory',
        prompt: 'Where does a local variable like `float mix = 0.5f;` live?',
        options: [
          { t: 'On the stack — automatic, freed at scope end', why: '' },
          { t: 'On the heap', why: 'The heap is for runtime-requested memory. Plain locals get fast automatic stack slots.' },
          { t: 'In the CPU forever', why: 'Registers hold values briefly, but the variable\'s home is a stack slot with a scoped lifetime.' },
          { t: 'In the plugin\'s preset file', why: 'Presets are saved state on disk — memory at runtime is stack or heap.' },
        ],
        answer: 0,
        explain: 'Locals live on the stack: created instantly, destroyed at the brace, zero cleanup code. The heap is for what\'s big or must outlive its scope.',
      },
      {
        type: 'predict', concept: 'memory',
        prompt: 'This runs once at startup. What\'s the long-term consequence?',
        code: 'void loadClick()\n{\n    float* click = new float[48000];\n    // ... uses it ... but never: delete[] click;\n}',
        options: [
          { t: 'The memory stays reserved forever — a leak', why: '' },
          { t: 'C++ frees it at the closing brace', why: 'The *pointer* dies at the brace — the heap block it pointed at does not. That orphaned block is the leak.' },
          { t: 'It crashes immediately', why: 'Leaks are silent — that\'s what makes them dangerous. The cost shows up hours later.' },
          { t: 'Nothing — the DAW cleans up plugins', why: 'Only when the whole process exits. Across a long session with many plugin reloads, leaks pile up.' },
        ],
        answer: 0,
        explain: 'new without delete orphans the block: no one owns it, no one can free it. This is exactly the class of bug RAII (next lesson) makes structurally impossible.',
      },
      {
        type: 'fill', concept: 'memory',
        prompt: 'Give the delay line its memory in the sanctioned place — before audio starts.',
        code: 'std::vector<float> delayLine;\n\nvoid prepareToPlay(double sampleRate, int maxBlockSize)\n{\n    delayLine.___((int) sampleRate * 2);\n}',
        accept: ['resize'],
        placeholder: 'method',
        hint: 'The vector should actually contain that many zeroed samples.',
        mistakes: [
          { match: '^push_back$', msg: 'One sample at a time, possibly reallocating each step. Set the full size in one call: resize.' },
        ],
        explain: 'resize in prepareToPlay: the warehouse paperwork happens backstage, and the audio thread only ever reads and writes memory that already exists.',
      },
    ],
    recap: [
      'Stack: automatic, fast, scoped. Heap: big, flexible, must be released.',
      'new/delete is legacy manual management — read it, don\'t write it.',
      'A leak is heap memory whose owner forgot it.',
      'Allocate in prepareToPlay; never in processBlock.',
    ],
    inside: [
      { name: 'Sampler', use: 'gigabytes of sample data live on the heap' },
      { name: 'Delay', use: 'the delay line is one heap block, sized backstage' },
      { name: 'Every plugin', use: 'the plugin object itself is heap-allocated by the host' },
    ],
    analogyPanel: 'Stack = pedalboard: instant access, packed up automatically after each song. Heap = warehouse: room for anything, paperwork per checkout, and someone must sign gear back in.',
    beginnerMistake: 'Believing the pointer dying frees the memory. The sticky note gets thrown away; the warehouse shelf stays booked in your name forever.',
    remember: 'The stack cleans itself; the heap only ever gets cleaned by its owner.',
    builds: ['stack', 'heap', 'allocation', 'pointer'],
    leads: ['raii', 'unique-ptr'],
  },

  /* ---------------------------------------------------------- M3 */
  {
    id: 'm3', kind: 'lesson', title: 'RAII: Cleanup That Can\'t Be Forgotten', short: 'RAII — automatic cleanup',
    concepts: ['raii'], time: '~6 MIN', diff: 2,
    hook: 'The best crews don\'t rely on remembering to strike the stage — the venue\'s house rules do it automatically at close, every night, even when the show ends early. C++ has house rules like that. They\'re called RAII.',
    objective: 'Wire acquisition to constructors and release to destructors, so cleanup happens automatically — even on early exits.',
    sections: [
      {
        h: 'The pattern with the terrible name',
        body: '**RAII** (Resource Acquisition Is Initialization) is simple despite the name: **acquire in the constructor, release in the destructor.** Since destructors run automatically at end of life, the release can never be forgotten — not even when the function exits early.',
        viz: { t: 'chain', nodes: ['ctor: acquire', 'object alive', 'dtor: release'], accent: 2, caption: 'release is wired to death — it cannot be skipped' },
        code: 'class SampleFile {\npublic:\n    SampleFile(const char* path) { open(path); }  // acquire\n    ~SampleFile()                { close(); }     // release\n};',
        codeTitle: 'RAII in four lines',
        breakdown: [
          ['SampleFile(...)', 'constructor: takes the resource (opens the file)'],
          ['~SampleFile()', 'destructor: returns it (closes the file)'],
          ['{ SampleFile f("kick.wav"); }', 'use it in a scope…'],
          ['}', '…and the close happens here, guaranteed'],
        ],
      },
      {
        h: 'You already use it everywhere',
        body: 'std::vector is RAII: it frees its samples in its destructor. Every modern C++ tool for files, memory and locks is RAII. Plugins live and die constantly inside DAWs — RAII is why a well-written plugin can be loaded and unloaded ten thousand times without leaking a byte.',
        warn: 'Next lesson applies RAII to the heap itself: a pointer that deletes what it owns, automatically. Manual `delete` disappears from your life.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'raii',
        prompt: 'What guarantees that an RAII object\'s resource gets released?',
        options: [
          { t: 'The destructor runs automatically when the object\'s lifetime ends', why: '' },
          { t: 'The programmer remembers to call release()', why: 'That\'s exactly the manual pattern RAII replaces — human memory is the unreliable part.' },
          { t: 'The operating system checks periodically', why: 'The OS reclaims everything only at process exit — far too late for a 12-hour session.' },
          { t: 'The compiler warns if you forget', why: 'Compilers can\'t generally know a resource needed releasing. RAII moves the guarantee into the language rules themselves.' },
        ],
        answer: 0,
        explain: 'Destructors are the one thing C++ promises to run at end of life. Tie release to the destructor and cleanup stops being a task — it becomes physics.',
      },
      {
        type: 'predict', concept: 'raii',
        prompt: 'The early return fires. Does the file get closed?',
        code: 'void analyze(const char* path)\n{\n    SampleFile file(path);   // RAII: closes in destructor\n    if (tooQuiet())\n        return;              // early exit!\n    process(file);\n}',
        options: [
          { t: 'Yes — the destructor runs at the return, closing it', why: '' },
          { t: 'No — the return skips the cleanup', why: 'Early returns end the scope, and ending the scope runs destructors. That\'s the whole superpower.' },
          { t: 'Only if process() was reached', why: 'Cleanup is tied to lifetime, not to which lines executed.' },
          { t: 'The file stays open until the DAW quits', why: 'That would be a manual-cleanup bug — RAII exists precisely to prevent it.' },
        ],
        answer: 0,
        explain: 'Every path out of the scope — normal end, early return, even an exception — runs the destructor. With manual close() calls, the early return would have leaked the file handle.',
      },
      {
        type: 'fill', concept: 'raii',
        prompt: 'Complete the RAII pair: the destructor returns what the constructor took.',
        code: 'class DeviceLock {\npublic:\n    DeviceLock()  { openAudioDevice(); }\n    ~DeviceLock() { ___ }\n};',
        accept: ['closeAudioDevice();', 'closeAudioDevice()'],
        placeholder: 'statement',
        hint: 'Mirror the constructor: what\'s the opposite of openAudioDevice()?',
        explain: 'Acquire in the constructor, release in the destructor — perfectly mirrored. Anyone using DeviceLock now literally cannot forget to close the device.',
      },
    ],
    recap: [
      'RAII: acquire in the constructor, release in the destructor.',
      'Destructors run on every exit path — cleanup is guaranteed.',
      'vector, smart pointers, locks: modern C++ is RAII throughout.',
      'Plugins reload constantly; RAII is why that\'s safe.',
    ],
    inside: [
      { name: 'Sampler', use: 'sample file handles close themselves when the object dies' },
      { name: 'Every plugin', use: 'buffers free themselves when the processor is destroyed' },
      { name: 'JUCE', use: 'the framework is RAII end to end — you\'ll inherit the habit' },
    ],
    analogyPanel: 'RAII is the venue\'s house rule: gear checked out at load-in is automatically signed back in at close — even when the show ends early. No checklist, no forgetting.',
    beginnerMistake: 'Writing init()/cleanup() function pairs and calling them manually. One early return, one forgotten call, and the resource leaks. Put the pair in the constructor/destructor instead.',
    remember: 'Tie cleanup to the destructor and it can never be forgotten.',
    builds: ['constructor', 'destructor', 'scope'],
    leads: ['unique-ptr', 'vector'],
  },

  /* ---------------------------------------------------------- M4 */
  {
    id: 'm4', kind: 'lesson', title: 'unique_ptr: One Owner Per Oscillator', short: 'std::unique_ptr',
    concepts: ['smart-pointers'], time: '~6 MIN', diff: 2,
    hook: 'One oscillator. One owner. When the owner is gone, the oscillator is gone — automatically, every time. That\'s not discipline; that\'s a type. You\'ll use this when we build the voice engine in Zone 5.',
    objective: 'Own heap objects through std::unique_ptr, so delete happens automatically and double-owners are impossible.',
    sections: [
      {
        h: 'A pointer that owns',
        body: '`std::unique_ptr<SineOsc>` is RAII applied to the heap: a pointer that **deletes what it owns** in its destructor. Create with `std::make_unique`. There is exactly one owner — the compiler *refuses to copy it*, which makes double-delete impossible by construction.',
        viz: { t: 'owners', mode: 'unique' },
        code: '#include <memory>\n\nauto osc = std::make_unique<SineOsc>();\nosc->setFrequency(440.0f);   // -> just like a raw pointer\n// scope ends → SineOsc deleted, automatically',
        codeTitle: 'sole ownership',
        breakdown: [
          ['std::make_unique<SineOsc>()', 'build a SineOsc on the heap, wrapped in its owner'],
          ['auto osc', 'the owner: a std::unique_ptr<SineOsc>'],
          ['osc->', 'use it exactly like a pointer'],
          ['(scope ends)', 'the destructor deletes the oscillator — no delete keyword, ever'],
        ],
      },
      {
        h: 'Using and moving it',
        body: 'Check it like any pointer (`if (osc)`), reach members with `->`. To hand ownership to someone else, you **move** it — the full story two lessons from now. In plugins: your processor owns its DSP modules and its editor through unique_ptr. It\'s the default owning type of modern JUCE.',
        code: 'std::unique_ptr<SineOsc> a = std::make_unique<SineOsc>();\nauto b = a;              // ✗ refuses to build: no copies\nauto c = std::move(a);   // ✓ ownership handed to c; a is now empty',
        codeTitle: 'no copies — only handovers',
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'smart-pointers',
        prompt: 'Create the filter on the heap, owned properly from birth.',
        code: '#include <memory>\n\nauto filter = std::___<LadderFilter>();',
        accept: ['make_unique<LadderFilter>', 'make_unique<LadderFilter>()'],
        placeholder: 'make_...<...>',
        hint: 'The factory function that builds an object inside a unique_ptr.',
        mistakes: [
          { match: 'new', msg: 'Almost — but naked `new` is the legacy path. The modern one-step: `std::make_unique<LadderFilter>()`.' },
          { match: '^make_shared', msg: 'make_shared builds *shared* ownership. One owner (the common case) wants make_unique.' },
        ],
        explain: 'std::make_unique<T>() builds the object and its owner in one safe step. From today, this replaces `new` in everything you write.',
      },
      {
        type: 'mcq', concept: 'smart-pointers',
        prompt: 'Why does the compiler refuse to *copy* a unique_ptr?',
        options: [
          { t: 'Two owners would both delete the same object — a guaranteed crash', why: '' },
          { t: 'Copying pointers is slow', why: 'Copying a pointer is trivially cheap — the ban is about ownership logic, not speed.' },
          { t: 'unique_ptr objects are too large to copy', why: 'It\'s essentially one pointer wide. Size isn\'t the issue; double-delete is.' },
          { t: 'It\'s a temporary language limitation', why: 'It\'s the entire design: "unique" is enforced by deleting the copy operations on purpose.' },
        ],
        answer: 0,
        explain: 'If two unique_ptrs owned one oscillator, both destructors would delete it — the classic double-free crash. Making copies *uncompilable* turns a runtime disaster into a build error.',
      },
      {
        type: 'predict', concept: 'smart-pointers',
        prompt: 'After the move, what does `a` hold?',
        code: 'auto a = std::make_unique<SineOsc>();\nauto b = std::move(a);\n\nif (a) render(); else rest();',
        options: [
          { t: 'a is empty (nullptr) — rest() runs', why: '' },
          { t: 'a still owns the oscillator — render() runs', why: 'Move *transfers* ownership. b owns it now; a was left holding nothing.' },
          { t: 'Both own it now', why: 'That would be shared ownership — a different tool (next lesson). unique means unique.' },
          { t: 'It fails to compile', why: 'Moving a unique_ptr is exactly the sanctioned way to hand ownership over. It compiles cleanly.' },
        ],
        answer: 0,
        explain: 'std::move hands the oscillator to b and leaves a as a well-defined empty pointer. Always treat a moved-from unique_ptr as null until you give it something new.',
      },
    ],
    recap: [
      'unique_ptr = RAII ownership of one heap object.',
      'Create with std::make_unique — never naked new.',
      'Copies refuse to compile; ownership transfers by move.',
      'Moved-from unique_ptrs are empty (null).',
    ],
    inside: [
      { name: 'Synth', use: 'the engine owns each voice: vector of unique_ptr<Voice>' },
      { name: 'JUCE', use: 'createEditor() hands ownership of the new editor to the host' },
      { name: 'Effects', use: 'DSP modules owned by the processor, freed with it' },
    ],
    analogyPanel: 'A unique_ptr is a flight case with one name on it. Whoever holds the case owns the gear inside — hand the case over and you\'ve handed the responsibility too. Two names on one case is simply not allowed.',
    beginnerMistake: 'Calling `new` out of habit and storing it raw "just for now." There is no for-now: make_unique costs nothing extra and can\'t leak.',
    remember: 'One owner, automatic delete: make_unique is the new new.',
    builds: ['pointer', 'raii', 'nullptr'],
    leads: ['move-semantics', 'smart-pointer'],
  },

  /* ---------------------------------------------------------- M5 */
  {
    id: 'm5', kind: 'lesson', title: 'shared_ptr: The Shared Sample Bank', short: 'shared_ptr & weak_ptr',
    concepts: ['smart-pointers'], time: '~6 MIN', diff: 2,
    hook: 'One piano sample bank, four sampler instances playing from it. Who unloads it? The answer every studio knows: the last one out turns off the lights.',
    objective: 'Share one resource between several owners with std::shared_ptr — and observe without owning via weak_ptr.',
    sections: [
      {
        h: 'Counted owners',
        body: '`std::shared_ptr<SampleBank>` allows **many owners of one object**. It keeps a live count: each copy adds an owner, each destruction removes one — and when the count hits **zero**, the object is deleted. Create with `std::make_shared`.',
        viz: { t: 'owners', mode: 'shared' },
        code: 'auto bank = std::make_shared<SampleBank>("piano");\nauto user2 = bank;      // copying is ALLOWED: count → 2\n// each owner dying: count 2 → 1 → 0 → bank unloads',
        codeTitle: 'last one out unloads it',
      },
      {
        h: 'weak_ptr: a backstage pass, not a key',
        body: '`std::weak_ptr` **observes** a shared object without owning it — it never keeps the object alive. Before use you ask `lock()`: "still there?" — you get a real shared_ptr, or empty. Default to unique_ptr though: shared ownership costs counting work and blurs responsibility. (Advanced corner: a shared_ptr can carry a **custom deleter** — special strike-crew instructions for resources that need unusual cleanup.)',
        code: 'std::weak_ptr<SampleBank> peek = bank;\n\nif (auto alive = peek.lock())   // still loaded?\n    alive->play(60);',
        codeTitle: 'observe, don\'t own',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'smart-pointers',
        prompt: 'When is the SampleBank actually unloaded?',
        code: 'auto a = std::make_shared<SampleBank>();  // count: 1\nauto b = a;                               // count: 2\na.reset();                                // a lets go\nb.reset();                                // b lets go',
        options: [
          { t: 'At b.reset() — the count reaches zero there', why: '' },
          { t: 'At a.reset() — a created it, so a\'s release kills it', why: 'Creation order doesn\'t matter — only the count. After a.reset(), b still holds it: count 1.' },
          { t: 'Immediately when b copied a', why: 'Copying *adds* an owner (count 2) — nothing is freed by sharing more.' },
          { t: 'Never — shared objects leak by design', why: 'Reference counting exists precisely so the last release frees it, deterministically.' },
        ],
        answer: 0,
        explain: 'Owner count: 1 → 2 → 1 → 0. Deletion happens exactly at the 0, whoever causes it. The last one out turns off the lights.',
      },
      {
        type: 'mcq', concept: 'smart-pointers',
        prompt: 'What is std::weak_ptr for?',
        options: [
          { t: 'Watching a shared object without keeping it alive', why: '' },
          { t: 'A slower version of shared_ptr', why: 'It\'s not about speed — it\'s about *not owning*: a weak_ptr never extends a lifetime.' },
          { t: 'Owning objects that might be null', why: 'Any smart pointer can be empty. weak_ptr\'s specialty is observation without ownership.' },
          { t: 'Sharing between plugins in different DAWs', why: 'Smart pointers live inside one process — this is about ownership, not inter-app sharing.' },
        ],
        answer: 0,
        explain: 'weak_ptr is the backstage pass: you can check whether the resource is still around (lock()) but your pass never keeps the venue open. It also breaks ownership cycles — a Zone 6 story.',
      },
      {
        type: 'fill', concept: 'smart-pointers',
        prompt: 'Several samplers must share one reverb impulse response. Declare the member.',
        code: 'class SamplerVoice {\nprivate:\n    std::___<ImpulseResponse> ir;\n};',
        accept: ['shared_ptr'],
        placeholder: 'smart pointer',
        hint: 'Many owners, one resource, freed by the last.',
        mistakes: [
          { match: '^unique_ptr$', msg: 'unique_ptr allows exactly one owner — but several voices need this at once. Shared ownership: shared_ptr.' },
          { match: '^weak_ptr$', msg: 'A weak_ptr wouldn\'t keep the impulse response alive at all. The voices must co-own it: shared_ptr.' },
        ],
        explain: 'shared_ptr<ImpulseResponse>: every voice co-owns the data; the IR unloads automatically when the last voice releases it.',
      },
    ],
    recap: [
      'shared_ptr = counted co-ownership; deletion at count zero.',
      'Copying is allowed — each copy is another owner.',
      'weak_ptr observes without owning; check with lock().',
      'Default to unique_ptr; share only when sharing is real.',
    ],
    inside: [
      { name: 'Sampler', use: 'many voices share one loaded sample set' },
      { name: 'Convolution', use: 'impulse responses shared across channels' },
      { name: 'Preset system', use: 'UI safely *observes* engine data via weak references' },
    ],
    analogyPanel: 'shared_ptr is the studio sign-out sheet with multiple names: the room stays booked while anyone\'s name is on it, and the last person to sign out kills the lights. weak_ptr is a visitor pass — you can look in, but your presence keeps nothing open.',
    beginnerMistake: 'Reaching for shared_ptr everywhere "to be safe." Unclear ownership is not safety — it\'s the opposite. One owner (unique_ptr) is the default; sharing is the exception with a reason.',
    remember: 'shared_ptr: the last owner out turns off the lights.',
    builds: ['smart-pointer', 'raii'],
    leads: ['thread', 'atomic'],
  },

  /* ---------------------------------------------------------- M6 */
  {
    id: 'm6', kind: 'lesson', title: 'Copy, Move & const Correctness', short: 'Move semantics, const',
    concepts: ['move-semantics'], time: '~7 MIN', diff: 2,
    hook: 'You can ship a collaborator a copy of your 2 GB session — slow, doubles the storage. Or you can hand them the hard drive. Modern C++ knows both gestures, and audio buffers care deeply about the difference.',
    objective: 'Know when C++ copies and when it moves, request moves with std::move — and lock everything read-only with const.',
    sections: [
      {
        h: 'Copy duplicates; move hands over',
        body: 'A **copy** duplicates all contents — for a one-second buffer, 48,000 floats cloned. A **move** hands over the internals (essentially repointing one pointer) and leaves the source *valid but empty*. `std::move(x)` doesn\'t move anything itself — it marks x as "you may pillage this."',
        viz: { t: 'moveviz' },
        code: 'std::vector<float> temp = renderIR();\n\nstd::vector<float> a = temp;             // COPY: all floats cloned\nstd::vector<float> b = std::move(temp);  // MOVE: pointer handover\n// temp is now valid but empty — size() == 0',
        codeTitle: 'copy vs move',
        breakdown: [
          ['= temp', 'copy: duplicate every element'],
          ['= std::move(temp)', 'move: take temp\'s internals wholesale'],
          ['std::move', 'a cast, not an action: "permission to pillage"'],
          ['temp (after)', 'valid but empty — don\'t read it expecting data'],
        ],
      },
      {
        h: 'const correctness: promises the compiler enforces',
        body: 'Zone 1\'s `const` grows up here. A method marked const — `float getGain() const` — promises to change **nothing** in the object, and the compiler holds you to it. Read-only parameters stay `const&`. Pro C++ is const **by default**: every promise you write is a whole category of bug you can\'t have.',
        code: 'class GainStage {\npublic:\n    float getGain() const   { return gain; }  // promise: read-only\n    void  setGain(float g)  { gain = g; }     // mutating: no const\nprivate:\n    float gain = 1.0f;\n};',
        codeTitle: 'const methods',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'move-semantics',
        prompt: 'Why is moving a large audio buffer cheap when copying it is expensive?',
        options: [
          { t: 'Move hands over the internal pointer; copy duplicates every sample', why: '' },
          { t: 'Move compresses the audio first', why: 'No audio is touched at all — that\'s the point. Only the ownership handle changes hands.' },
          { t: 'Move deletes the data', why: 'Nothing is deleted — the same block of samples simply gets a new owner.' },
          { t: 'They cost the same; move is just newer syntax', why: 'For a 48,000-float buffer: copy touches 48,000 floats, move touches ~3 pointers. Vastly different.' },
        ],
        answer: 0,
        explain: 'A vector is a small handle pointing at a big heap block. Copy clones the block; move re-labels it. For audio-sized data, that\'s the difference between milliseconds and nanoseconds.',
      },
      {
        type: 'predict', concept: 'move-semantics',
        prompt: 'What does this print?',
        code: 'std::vector<float> temp(48000, 0.0f);\nstd::vector<float> ir = std::move(temp);\nstd::cout << temp.size();',
        options: [
          { t: '`0` — temp was left valid but empty', why: '' },
          { t: '`48000` — both hold the data', why: 'That would be a copy. Move transferred the block wholesale; temp holds nothing now.' },
          { t: 'Garbage / crash', why: 'Moved-from standard objects are *valid* — safe to query, just empty. Reading .size() is fine; expecting data isn\'t.' },
          { t: 'It fails to compile', why: 'Moving a vector is core modern C++ — compiles and is encouraged.' },
        ],
        answer: 0,
        explain: 'After a move, the source is a well-defined empty vector: size 0, safe to reuse or refill — but the samples live in `ir` now. Using a moved-from object *as if it still had the data* is the classic mistake.',
      },
      {
        type: 'fill', concept: 'move-semantics',
        prompt: 'The freshly rendered wavetable should be handed into the member — not cloned.',
        code: 'void setTable(std::vector<float> newTable)\n{\n    table = std::___(newTable);\n}',
        accept: ['move'],
        placeholder: 'one word',
        hint: 'Grant permission to pillage.',
        mistakes: [
          { match: '^copy$', msg: 'There is no std::copy for this job (that\'s an algorithm) — and cloning is exactly what we\'re avoiding. Hand it over: std::move.' },
        ],
        explain: 'std::move(newTable) lets the member take the table\'s internals directly. The parameter was the last stop for that data — pillaging it is free performance.',
      },
    ],
    recap: [
      'Copy duplicates contents; move transfers them.',
      'std::move = permission, not action; source ends valid but empty.',
      'Never read a moved-from object expecting its old data.',
      'const methods and const& params: promises the compiler enforces.',
    ],
    inside: [
      { name: 'Sampler', use: 'loaded sample data is moved into place, never cloned' },
      { name: 'Wavetable synth', use: 'freshly computed tables move into the engine' },
      { name: 'Preset system', use: 'big preset blobs transfer by move on load' },
    ],
    analogyPanel: 'Copy is bouncing a duplicate of the session to a second drive. Move is handing over the drive itself: instant, nothing duplicated — but your hands are empty afterward.',
    beginnerMistake: 'Using a variable after moving from it and wondering where the data went. std::move means the drive left the building — check your hands before you read.',
    remember: 'Move hands over the hard drive; copy burns a duplicate. Audio-sized data moves.',
    builds: ['reference', 'const', 'vector'],
    leads: ['move-semantics', 'audio-buffer'],
  },

  /* ---------------------------------------------------------- M7 */
  {
    id: 'm7', kind: 'lesson', title: 'Modern Containers for Audio', short: 'std::array, vector practices',
    concepts: ['containers'], time: '~6 MIN', diff: 2,
    hook: 'Racks come in two kinds: the welded 4-slot case that never changes, and the expandable touring rig you configure per show. C++ gives you exactly those two — and audio code needs both, in the right places.',
    objective: 'Choose std::array for fixed sizes and use std::vector like a professional: capacity planned, growth never on stage.',
    sections: [
      {
        h: 'std::array — the welded rack',
        body: '`std::array<float, 4>` is a fixed row whose **size is part of the type** — settled at compile time, living happily on the stack, zero allocation ever. Filter coefficient sets, small windows, per-channel state: if the size never changes, array beats vector.',
        code: 'std::array<float, 4> coeffs { 0.1f, 0.4f, 0.4f, 0.1f };\nfloat first = coeffs[0];\nint   n     = (int) coeffs.size();   // knows its size: 4',
        codeTitle: 'fixed at compile time',
      },
      {
        h: 'vector, played professionally',
        body: 'For runtime sizes, vector — with two pro habits. **resize(n)** sets the element count (zero-filled); **reserve(n)** pre-books capacity without creating elements. Both may allocate — so both belong in `prepareToPlay`. On the audio thread the vector is read and written, never grown. One contiguous block also keeps the CPU\'s cache happy — the Zone 2 finale explains why that matters.',
        mistake: { code: 'delayLine.reserve(48000);\ndelayLine[0] = 0.5f;   // ✗ size is still 0 — out of bounds!', text: 'reserve books the warehouse space but puts nothing on the shelves. Indexing needs *elements*: that\'s resize.' },
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'containers',
        prompt: 'A biquad filter always has exactly 5 coefficients. Declare the right container.',
        code: 'std::array<float, ___> coeffs;',
        accept: ['5'],
        placeholder: 'size',
        hint: 'The size is written into the type itself.',
        explain: 'std::array<float, 5>: the count is compile-time fact — no allocation, no resizing, and the compiler knows the bounds.',
      },
      {
        type: 'mcq', concept: 'containers',
        prompt: 'What does `delayLine.reserve(48000)` actually do?',
        options: [
          { t: 'Books capacity for 48,000 floats — but the vector still holds zero elements', why: '' },
          { t: 'Creates 48,000 zero-valued floats', why: 'That\'s resize. reserve is capacity only — the shelves are booked but empty.' },
          { t: 'Locks the vector so it can never grow', why: 'reserve sets a floor on capacity, not a ceiling — later growth is still possible (and still allocates).' },
          { t: 'Nothing — it\'s deprecated', why: 'reserve is a core tool: it front-loads allocation so later push_backs don\'t reallocate.' },
        ],
        answer: 0,
        explain: 'reserve = capacity, resize = size. Index only what resize (or push_back) actually created. Mixing these up is the out-of-bounds bug you met in Zone 1 — now you know its anatomy.',
      },
      {
        type: 'predict', concept: 'containers',
        prompt: 'What prints?',
        code: 'std::vector<float> buf;\nbuf.reserve(512);\nstd::cout << buf.size();',
        options: [
          { t: '`0` — capacity changed, size didn\'t', why: '' },
          { t: '`512`', why: 'reserve creates no elements. size() counts elements — still zero.' },
          { t: 'Garbage', why: 'size() is always well-defined; the answer is exactly 0.' },
          { t: 'It fails to compile', why: 'Perfectly legal — and a perfect illustration of size vs capacity.' },
        ],
        answer: 0,
        explain: 'Capacity 512, size 0: room booked, shelves empty. buf[0] here would be out of bounds — the reserve-then-index trap in its purest form.',
      },
    ],
    recap: [
      'std::array: size in the type, stack-friendly, zero allocation.',
      'vector: resize = elements, reserve = capacity only.',
      'Both resize and reserve may allocate → prepareToPlay territory.',
      'Contiguous data is fast data (finale lesson explains).',
    ],
    inside: [
      { name: 'EQ', use: 'biquad coefficients: std::array<float, 5> per band' },
      { name: 'Delay', use: 'the line: one vector, resized backstage' },
      { name: 'Synth', use: 'wavetables in vectors; per-voice state in arrays' },
    ],
    analogyPanel: 'std::array is the welded 4-slot rack — permanent, instant, no paperwork. vector is the touring rig — configure it at load-in (prepareToPlay), never re-rack it mid-set.',
    beginnerMistake: 'reserve() followed by indexing. Capacity is a booking, not gear on shelves — index only what resize or push_back actually created.',
    remember: 'Fixed size → std::array. Runtime size → vector, sized backstage.',
    builds: ['array', 'vector', 'allocation'],
    leads: ['audio-buffer'],
  },

  /* ---------------------------------------------------------- M8 */
  {
    id: 'm8', kind: 'lesson', title: 'Maybe-Values: optional & variant', short: 'std::optional, std::variant',
    concepts: ['modern-types'], time: '~6 MIN', diff: 2,
    hook: 'A synth voice between notes isn\'t playing "note zero" — it\'s playing nothing. For years C++ faked "nothing" with magic numbers like -1. Modern C++ says it honestly.',
    objective: 'Express "maybe a value" with std::optional and "one of several types" with std::variant — no magic numbers.',
    sections: [
      {
        h: 'std::optional — honestly maybe',
        body: '`std::optional<int> currentNote` holds an int **or nothing at all**. Ask `has_value()`, read with `*note` or `note.value_or(fallback)`. The type itself now documents that no-note is a real state — and the compiler makes you handle it.',
        code: 'std::optional<int> currentNote;      // starts: nothing\ncurrentNote = 64;                     // now: a note\n\nif (currentNote.has_value())\n    play(*currentNote);\n\nint n = currentNote.value_or(60);     // value, or fallback',
        codeTitle: 'a voice\'s maybe-note',
        breakdown: [
          ['std::optional<int>', 'an int OR genuinely nothing'],
          ['has_value()', '"is anything in there?"'],
          ['*currentNote', 'read the value (only after checking!)'],
          ['value_or(60)', 'the value — or your fallback, no branching'],
        ],
      },
      {
        h: 'std::variant — one of several',
        body: '`std::variant<float, bool, int>` holds **exactly one** of the listed types at a time — a typed selector switch. Perfect for parameter values that may be a knob (float), a switch (bool), or a choice (int). Ask what\'s inside with `std::get_if<float>(&v)` — you\'ll meet it again in the parameter systems of Zone 3.',
        code: 'std::variant<float, bool> value = 0.7f;   // a knob\nvalue = true;                              // now a switch\n\nif (auto* f = std::get_if<float>(&value))\n    applyGain(*f);',
        codeTitle: 'one slot, several possible types',
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'modern-types',
        prompt: 'Only play if the voice actually has a note.',
        code: 'std::optional<int> note;\n\nif (note.___())\n    play(*note);',
        accept: ['has_value', 'has_value()'],
        placeholder: 'method',
        hint: '"Is anything in there?"',
        explain: 'has_value() is the honest check — no comparing against -1 and hoping everyone remembers the convention.',
      },
      {
        type: 'predict', concept: 'modern-types',
        prompt: 'No note has been set. What prints?',
        code: 'std::optional<int> note;\nstd::cout << note.value_or(60);',
        options: [
          { t: '`60` — the fallback, because note is empty', why: '' },
          { t: '`0`', why: 'An empty optional has no value at all — value_or returns *your* fallback, which is 60.' },
          { t: 'Garbage', why: 'value_or is exactly the safe path: value if present, fallback if not. Never garbage.' },
          { t: 'It crashes', why: 'Unchecked *note could misbehave — value_or exists so you never have to risk that.' },
        ],
        answer: 0,
        explain: 'value_or(60): "the note if there is one, middle C if not" — a full if/else in one readable call.',
      },
      {
        type: 'mcq', concept: 'modern-types',
        prompt: 'What does `std::variant<float, bool, int>` hold?',
        options: [
          { t: 'Exactly one value, which is a float OR a bool OR an int at any moment', why: '' },
          { t: 'All three values at once', why: 'That would be a struct. A variant is a selector: one slot, one occupant.' },
          { t: 'A list of mixed values', why: 'A list is a vector. Variant holds a single value of one of the listed types.' },
          { t: 'Three optionals', why: 'Close in spirit, but variant guarantees exactly one is active — never zero, never two.' },
        ],
        answer: 0,
        explain: 'A variant is a typed selector switch: one slot whose occupant\'s type can change among the listed options. Parameter systems love it: knob, switch, or choice — one storage type.',
      },
    ],
    recap: [
      'optional<T>: a T or honestly nothing — no magic -1s.',
      'has_value() / value_or() make emptiness safe to handle.',
      'variant<A,B,C>: exactly one of the listed types at a time.',
      'Both make invalid states unrepresentable — pro C++\'s favorite trick.',
    ],
    inside: [
      { name: 'Synth', use: 'a voice\'s current note: optional<int> between notes' },
      { name: 'Parameters', use: 'a value that\'s knob/switch/choice: variant' },
      { name: 'Preset system', use: 'loadPreset returns optional<Preset> — it can fail honestly' },
    ],
    analogyPanel: 'optional is an insert slot that can be genuinely empty — not "occupied by silence." variant is a combo jack: one hole, several plug types, exactly one plugged at a time.',
    beginnerMistake: 'Encoding "nothing" as -1 or 0 and forgetting the convention three files later. optional writes the maybe into the type, where it can\'t be forgotten.',
    remember: 'optional = maybe a value; variant = one of several. Say it in the type.',
    builds: ['bool', 'enum', 'template'],
    leads: ['apvts', 'variant'],
  },
];
