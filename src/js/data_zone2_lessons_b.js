/* ============================================================
   ZONE 2 — lessons m9–m15 (appended to ZONE2_LESSONS).
   ============================================================ */

ZONE2_LESSONS.push(

  /* ---------------------------------------------------------- M9 */
  {
    id: 'm9', kind: 'lesson', title: 'Cleaner Wiring: enum class, auto & Friends', short: 'enum class, auto, range-for',
    concepts: ['modern-syntax'], time: '~6 MIN', diff: 1,
    hook: 'In Zone 1 your waveform selector ran on raw numbers — case 0, case 1. It worked. But professionals label the ring. Modern C++ has four small tools that make everyday code cleaner and safer at once.',
    objective: 'Label selectors with enum class, let auto infer obvious types, and sweep buffers with range-based for loops.',
    sections: [
      {
        h: 'enum class: the labeled selector ring',
        body: '`enum class Waveform { sine, saw, square };` gives you a type that can only ever be one of those names. No silent conversion to int, no nonsense value 47, and a `switch` over it can warn when a position is missing. Every mode selector you write from now on uses this.',
        code: 'enum class Waveform { sine, saw, square };\n\nWaveform wave = Waveform::saw;\n\nswitch (wave) {\n    case Waveform::sine:   /* ... */ break;\n    case Waveform::saw:    /* ... */ break;\n    case Waveform::square: /* ... */ break;\n}',
        codeTitle: 'a type-safe selector',
      },
      {
        h: 'auto and range-based for',
        body: '`auto` asks the compiler to infer an obvious type — perfect for `auto osc = std::make_unique<SineOsc>();` where the type is written once already. And the **range-based for** sweeps a whole container: `for (auto& s : buffer)`. That `&` is load-bearing: with it you edit the real samples; without it you edit throwaway copies. (`constexpr` from Zone 1 and `inline` for small header functions round out the kit — you\'ll meet inline again when we lay out a project.)',
        mistake: { code: 'for (auto s : buffer)   // ✗ s is a COPY\n    s *= gain;          // the buffer never changes!', text: 'The missing & is Zone 1\'s "effect does nothing" bug wearing modern clothes: `for (auto& s : buffer)` edits the real audio.' },
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'modern-syntax',
        prompt: 'Upgrade the selector to the type-safe kind.',
        code: 'enum ___ FilterMode { lowPass, highPass, bandPass };',
        accept: ['class', 'struct'],
        placeholder: 'keyword',
        hint: 'One word turns a loose enum into a scoped, type-safe one.',
        explain: '`enum class` scopes the names (FilterMode::lowPass) and blocks silent int conversion — the compiler now guards your selector.',
      },
      {
        type: 'predict', concept: 'modern-syntax',
        prompt: 'What happens to the buffer?',
        code: 'std::vector<float> buffer(4, 0.8f);\n\nfor (auto s : buffer)\n    s *= 0.5f;\n\nstd::cout << buffer[0];',
        options: [
          { t: '`0.8` — the loop halved copies; the buffer is untouched', why: '' },
          { t: '`0.4` — every sample was halved', why: 'That needs `auto&`. Without the &, each s is a fresh copy — modified, then discarded.' },
          { t: '`0` — the buffer was cleared', why: 'Nothing clears anything — the writes just land on copies and evaporate.' },
          { t: 'It fails to compile', why: 'Legal C++ — silently useless, which is worse than an error.' },
        ],
        answer: 0,
        explain: 'for (auto s : …) copies each element into s. The halving happens to the copy and vanishes. One character — `auto&` — makes it process the real audio.',
      },
      {
        type: 'fill', concept: 'modern-syntax',
        prompt: 'Fix that exact bug: make the loop touch the real samples.',
        code: 'for (auto___ s : buffer)\n    s *= gain;',
        accept: ['&', ' &'],
        placeholder: 'character',
        hint: 'The alias character from Zone 1.',
        explain: '`auto&` makes s a reference — a second label on each actual sample. Now the gain lands on the audio, not on ghosts.',
      },
    ],
    recap: [
      'enum class = scoped, type-safe selector positions.',
      'auto infers obvious types — use where the type is clear.',
      'for (auto& s : buffer) sweeps real elements; the & is load-bearing.',
      'constexpr and inline: compile-time values, header-friendly small functions.',
    ],
    inside: [
      { name: 'Synth', use: 'Waveform and FilterMode selectors as enum class' },
      { name: 'Every effect', use: 'range-for over channels and samples' },
      { name: 'JUCE', use: 'the codebase you\'ll read is written in exactly this style' },
    ],
    analogyPanel: 'enum class is the silkscreened label ring around a selector — only real positions exist. Range-for is running the whole tape head-to-tail without managing the counter yourself.',
    beginnerMistake: 'for (auto s : buffer) without the & — processing copies while the mix stays dry. If a range-for "does nothing," check for the missing &.',
    remember: 'Label selectors with enum class; sweep buffers with for (auto& s : buffer).',
    builds: ['enum', 'switch-statement', 'loop', 'reference'],
    leads: ['template', 'apvts'],
  },

  /* ---------------------------------------------------------- M10 */
  {
    id: 'm10', kind: 'lesson', title: 'Lambdas: Patchable Behavior', short: 'Lambdas, captures, std::function',
    concepts: ['lambdas'], time: '~7 MIN', diff: 2,
    hook: '"When the red light comes on, mute channel 3." The best studio instructions are taped exactly where they\'re needed. C++ lets you write little unnamed functions the same way — right at the spot where they\'ll fire.',
    objective: 'Write lambdas, choose captures deliberately, and store behavior in std::function — the pattern behind every knob callback.',
    sections: [
      {
        h: 'A function without a name',
        body: 'A **lambda** is a small inline function: `[capture](arguments) { body }`. The magic is the **capture list** `[...]` — which outside variables the lambda may use. This is how UI code says "when this knob moves, do that":',
        code: 'gainSlider.onValueChange = [this]\n{\n    updateGain();   // fires every time the knob moves\n};',
        codeTitle: 'a knob callback',
        breakdown: [
          ['[this]', 'capture: let the lambda reach this object\'s members'],
          ['(no args)', 'this callback receives nothing — it just reacts'],
          ['{ updateGain(); }', 'the taped-up instruction itself'],
          ['onValueChange =', 'the slider stores it, and fires it later'],
        ],
      },
      {
        h: 'Captures — and the box that stores them',
        body: '`[=]` captures used variables **by copy** (a snapshot); `[&]` **by reference** (live view — dangerous if the lambda outlives the scope!); `[this]` grants access to the object\'s members. `std::function<void()>` is the storage box: it can hold any callable with that shape, which is how sliders keep your lambda until the knob actually moves.',
        mistake: { code: 'auto makeCallback() {\n    float localGain = 0.5f;\n    return [&] { apply(localGain); }; // ✗ captures a local\n}                                     //   by reference — it dies!', text: 'The lambda outlives localGain — a dangling capture, the lambda-shaped cousin of Zone 1\'s dangling pointer. Capture locals by value.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'lambdas',
        prompt: 'What does the capture list `[...]` of a lambda control?',
        options: [
          { t: 'Which outside variables the lambda may use, and whether by copy or reference', why: '' },
          { t: 'The lambda\'s arguments', why: 'Arguments live in the parentheses. The brackets govern access to *surrounding* variables.' },
          { t: 'Which thread the lambda runs on', why: 'Threads are a separate world (two lessons ahead) — captures are about variable access.' },
          { t: 'How fast the lambda runs', why: 'Captures affect semantics (copy vs live reference), not speed in any way you\'d tune here.' },
        ],
        answer: 0,
        explain: 'The capture list is the patch bay between the lambda and its surroundings: nothing gets in unless you patch it — by copy [=], by reference [&], or via the object [this].',
      },
      {
        type: 'fill', concept: 'lambdas',
        prompt: 'The callback needs to call a member function of this editor. Capture accordingly.',
        code: 'cutoffSlider.onValueChange = [___]\n{\n    updateFilter();   // a member of this editor\n};',
        accept: ['this', '&'],
        placeholder: 'capture',
        hint: 'Members belong to an object — capture the object\'s handle.',
        mistakes: [
          { match: '^=$', msg: 'That compiles — [=] silently grabs `this` too — but that implicit capture is deprecated in modern C++. Say what you mean: [this].' },
        ],
        explain: '[this] is the standard JUCE UI capture: the lambda gets the editor\'s handle and can call its members. (It also means the editor must outlive the callback — JUCE\'s components manage that for their own sliders.)',
      },
      {
        type: 'predict', concept: 'lambdas',
        prompt: 'What does the callback print when fired?',
        code: 'float gain = 0.5f;\nauto show = [=] { std::cout << gain; };  // capture by COPY\ngain = 2.0f;\nshow();',
        options: [
          { t: '`0.5` — the copy was taken at creation', why: '' },
          { t: '`2.0` — it sees the live value', why: 'That\'s [&] behavior. [=] snapshots the value at the moment the lambda is born.' },
          { t: 'Garbage', why: 'A by-copy capture is self-contained and always safe — it printed its snapshot.' },
          { t: 'It fails to compile', why: 'Textbook-legal — and a textbook illustration of copy-capture semantics.' },
        ],
        answer: 0,
        explain: '[=] photographs the scene at creation: the lambda carries gain = 0.5 inside itself forever. [&] would watch the live variable instead — powerful, and only safe while that variable is alive.',
      },
    ],
    recap: [
      'Lambda = [capture](args){ body } — behavior written in place.',
      '[=] copies, [&] references (lifetime beware), [this] reaches members.',
      'std::function stores any matching callable for later.',
      'Dangling captures are the lambda-shaped dangling pointer.',
    ],
    inside: [
      { name: 'Editor', use: 'every slider\'s onValueChange is a lambda' },
      { name: 'Async work', use: '"when the file finishes loading, do this"' },
      { name: 'Timers', use: 'metering updates fire a stored callback' },
    ],
    analogyPanel: 'A lambda is a taped-up instruction at the exact spot on the desk where it applies. The capture list is which cables you patched into it — snapshots or live feeds.',
    beginnerMistake: 'Capturing locals with [&] and letting the lambda outlive them. The instruction survives; the things it points at don\'t. Locals get captured by value.',
    remember: 'Lambdas are instructions taped where they fire; captures decide what they can touch.',
    builds: ['function', 'lambda', 'scope'],
    leads: ['audioprocessoreditor', 'ui-thread'],
  },

  /* ---------------------------------------------------------- M11 */
  {
    id: 'm11', kind: 'lesson', title: 'Templates, Namespaces & Project Layout', short: 'Templates, namespaces, files',
    concepts: ['templates'], time: '~6 MIN', diff: 2,
    hook: 'By now you\'ve typed std::vector<float> fifty times without ceremony. You\'ve been using templates all along — time to read them fluently, and to organize a project bigger than one file.',
    objective: 'Read nested template types calmly, wrap your utilities in a namespace, and lay out files like a professional plugin project.',
    sections: [
      {
        h: 'Reading (and once in a while writing) templates',
        body: 'A **template** is a recipe with a type plugged in: `std::vector<float>` is the vector recipe cooked for floats. Read nested ones inside-out: `std::vector<std::unique_ptr<Voice>>` = "a resizable row of sole-ownership handles to Voices" — the exact type of a synth\'s voice pool. Writing one is rarer, but small utilities earn it:',
        code: 'template <typename T>\nT wrapPhase(T phase, T period)\n{\n    return (phase >= period) ? phase - period : phase;\n}\n// works for float AND double — one recipe',
        codeTitle: 'one recipe, any float type',
      },
      {
        h: 'Namespaces and the shape of a real project',
        body: 'Wrap your own code in a **namespace** (`namespace txpps { ... }`) so your Filter never collides with anyone else\'s. And as the files pile up, group them by role: `dsp/` for engines, `ui/` for components, one class per .h/.cpp pair. Tiny functions defined in headers get marked **inline** — the Zone 1 panel/circuit split, grown to fit a whole product.',
        viz: { t: 'twoLayer', top: 'dsp/ — SynthEngine, Voice, Filter', topSub: 'the sound', bottom: 'ui/ — Editor, Knobs, Meters', bottomSub: 'the panel', caption: 'folders by role — the standard plugin layout' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'templates',
        prompt: 'How do you read `std::vector<std::unique_ptr<Voice>>`?',
        options: [
          { t: 'A resizable row of sole-ownership handles, each owning one Voice', why: '' },
          { t: 'A Voice that owns many vectors', why: 'Read inside-out: unique_ptr<Voice> is the element; vector of those is the container.' },
          { t: 'A copy of every Voice', why: 'unique_ptrs never copy their Voices — each element *owns* one, exactly once.' },
          { t: 'A syntax error — templates can\'t nest', why: 'Nesting is everyday C++: containers of smart pointers are the standard voice-pool type.' },
        ],
        answer: 0,
        explain: 'Inside-out: Voice → owned by unique_ptr → collected in a vector. This precise type is your Zone 5 voice pool — growable backstage, each voice with one clear owner.',
      },
      {
        type: 'fill', concept: 'templates',
        prompt: 'Declare the voice pool: a resizable row where each element solely owns a Voice.',
        code: 'std::vector<std::___<Voice>> voices;',
        accept: ['unique_ptr'],
        placeholder: 'owner type',
        hint: 'One owner per voice — the smart pointer from three lessons ago.',
        mistakes: [
          { match: '^shared_ptr$', msg: 'Nothing else co-owns a voice — the engine is its one owner. unique_ptr keeps that truth in the type.' },
        ],
        explain: 'std::vector<std::unique_ptr<Voice>> — the canonical voice pool. Sized in prepareToPlay, owned unambiguously, freed automatically.',
      },
      {
        type: 'mcq', concept: 'templates',
        prompt: 'Your project has grown to a synth engine, three DSP modules and an editor. Best layout?',
        options: [
          { t: 'Folders by role (dsp/, ui/), one class per .h/.cpp pair, your code in a namespace', why: '' },
          { t: 'Everything in main.cpp until it hurts', why: 'It already hurts at this size: no reuse, brutal merge conflicts, and each build recompiles everything.' },
          { t: 'One giant header with all the code', why: 'Every file including it recompiles the world on any change — and inline-everything bloats the build.' },
          { t: 'A new folder per function', why: 'Over-fragmentation is its own maze. Classes are the natural file unit; folders group by role.' },
        ],
        answer: 0,
        explain: 'Role folders, one class per header/source pair, your code in a namespace — the layout every JUCE plugin you\'ll read in Zone 3 uses. Structure is a gift to future-you.',
      },
    ],
    recap: [
      'Templates: recipes with types plugged in — read nested ones inside-out.',
      'vector<unique_ptr<Voice>> is the canonical voice pool type.',
      'namespace txpps { } prevents name collisions at scale.',
      'Folders by role, one class per .h/.cpp pair, inline for tiny header functions.',
    ],
    inside: [
      { name: 'Synth', use: 'the voice pool type is a nested template' },
      { name: 'JUCE', use: 'juce:: is a namespace; AudioBuffer<float> is a template' },
      { name: 'Your repo', use: 'dsp/ and ui/ folders from your very first real plugin' },
    ],
    analogyPanel: 'A template is one enclosure design built for guitar, bass, or synth level. A namespace is the group prefix on a big desk — Drums/Kick and Keys/Kick coexist peacefully.',
    beginnerMistake: 'Panicking at nested angle brackets. Read inside-out, one layer at a time — every scary template type is a plain sentence wearing punctuation.',
    remember: 'Read templates inside-out; organize files by role; wrap your world in a namespace.',
    builds: ['template', 'namespace', 'header-file', 'unique-ptr'],
    leads: ['juce', 'cmake'],
  },

  /* ---------------------------------------------------------- M12 */
  {
    id: 'm12', kind: 'lesson', title: 'When Things Go Wrong: Assertions & Exceptions', short: 'assert, exceptions, RT rules',
    concepts: ['error-handling'], time: '~6 MIN', diff: 2,
    hook: 'A good tuner pedal screams at rehearsal and stays silent at the gig. C++ has both channels for handling trouble — and one iron rule about which is allowed anywhere near the audio thread.',
    objective: 'Trip impossible states early with assertions, know what exceptions are — and why they\'re banned from the audio thread.',
    sections: [
      {
        h: 'Assertions: rehearsal tripwires',
        body: '`assert(condition)` checks an assumption in **debug builds** and stops loudly at the exact line when it\'s false. In **release builds** it compiles away to nothing — zero cost for users. JUCE\'s version is `jassert`. Use them to document what must be true: indexes in range, pointers non-null, sizes prepared.',
        code: 'void startVoice(int index)\n{\n    jassert(index < kMaxVoices);  // debug: screams here\n    voices[index]->start();       // release: check vanishes\n}',
        codeTitle: 'a tripwire',
      },
      {
        h: 'Exceptions — and the audio-thread ban',
        body: '**Exceptions** (`throw` / `catch`) handle rare failures like a missing sample file: normal flow stops and control jumps to a handler. Fine on the UI thread. On the **audio thread: never.** Throwing has unpredictable cost, and an exception escaping into the host is a crash. Audio code reports trouble with return values and `std::optional` — honest, bounded, and silent at the gig.',
        mistake: { code: 'void processBlock(...)\n{\n    if (!tableReady)\n        throw std::runtime_error("no table"); // ✗ never here\n}', text: 'The real-time list grows one final entry: no allocation, no locks, no I/O, no logging — **and no throwing** — on the audio thread.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'error-handling',
        prompt: 'What does `assert(index < kMaxVoices)` do in a release build?',
        options: [
          { t: 'Nothing at all — it compiles away completely', why: '' },
          { t: 'Shows the user an error dialog', why: 'Assertions are developer tripwires, not user UI — and in release they don\'t even exist.' },
          { t: 'Slows the plugin slightly', why: 'Zero cost in release is the design: all the checking happens in your debug sessions.' },
          { t: 'Throws an exception', why: 'A failed debug assert halts at the line for the debugger — no exceptions involved.' },
        ],
        answer: 0,
        explain: 'Debug: a screaming tripwire at the exact broken line. Release: not a single instruction. That trade is why you can assert generously.',
      },
      {
        type: 'mcq', concept: 'error-handling',
        prompt: 'Why are exceptions banned on the audio thread?',
        options: [
          { t: 'Throwing has unpredictable cost, and an escaping exception crashes the host', why: '' },
          { t: 'Exceptions don\'t work in plugins at all', why: 'They work fine on the UI thread — file dialogs and loaders use them. The ban is specifically real-time.' },
          { t: 'They\'re too old-fashioned', why: 'Age isn\'t the issue — determinism is. The callback deadline tolerates no surprises.' },
          { t: 'The compiler forbids it', why: 'The compiler happily builds a throw in processBlock. The discipline is yours — which is why it must be a habit.' },
        ],
        answer: 0,
        explain: 'The audio thread\'s contract is bounded time, every block. Stack unwinding is unbounded, and hosts don\'t catch your exceptions. Report trouble with return values or optional instead.',
      },
      {
        type: 'fill', concept: 'error-handling',
        prompt: 'Guard the assumption the JUCE way: this index must be in range (debug builds only).',
        code: 'void noteOn(int voiceIndex)\n{\n    ___(voiceIndex < kMaxVoices);\n    voices[voiceIndex]->start();\n}',
        accept: ['jassert', 'assert'],
        placeholder: 'macro',
        hint: 'JUCE\'s flavor starts with a j.',
        explain: 'jassert (or plain assert): rehearsal tripwires that vanish at the gig. Generous asserting is how professionals catch impossible states the same day they\'re written.',
      },
    ],
    recap: [
      'assert / jassert: loud in debug, free in release.',
      'Assert your assumptions: ranges, non-null, prepared sizes.',
      'Exceptions: fine for UI-thread failures, never on the audio thread.',
      'Audio code reports trouble via return values and optional.',
    ],
    inside: [
      { name: 'JUCE', use: 'jassert fires constantly in debug when you misuse an API' },
      { name: 'Sampler', use: 'file loading throws on the UI thread; playback never does' },
      { name: 'Every plugin', use: 'the RT rule list: no alloc, locks, I/O, logging — or throwing' },
    ],
    analogyPanel: 'assert is the tuner that screams at rehearsal and doesn\'t exist at the gig. Exceptions are a fire alarm — appropriate in the lobby (UI), unthinkable mid-take (audio thread).',
    beginnerMistake: 'Wrapping processBlock code in try/catch "to be safe." That\'s not safety — the throw itself is the hazard. Design the audio path so it cannot need to throw.',
    remember: 'Assert generously in debug; never throw where the deadline lives.',
    builds: ['debug-build', 'undefined-behavior', 'optional'],
    leads: ['audio-thread', 'real-time-audio'],
  },

  /* ---------------------------------------------------------- M13 */
  {
    id: 'm13', kind: 'lesson', title: 'Two Threads, One Synth', short: 'Threads, races, mutex danger',
    concepts: ['threading'], time: '~7 MIN', diff: 3,
    hook: 'You drag the cutoff knob *while* the synth is rendering audio. Two hands on the same instrument, the same microsecond. Nothing in Zone 1 prepared that knob for this — and most real plugin bugs are born right here.',
    objective: 'See what a race condition actually is, and why the obvious fix — a lock — is forbidden where the deadline lives.',
    sections: [
      {
        h: 'The race',
        body: 'Your plugin runs (at least) two **threads**: the UI thread moving knobs, the audio thread rendering blocks. When both touch the same plain variable with no coordination, you get a **race condition**: half-written values, stale reads, corruption — randomly, rarely, and worst of all *differently on every machine*.',
        viz: { t: 'lanes' },
        code: 'float cutoff = 1000.0f;        // plain float — shared!\n\n// UI thread:      cutoff = 8000.0f;\n// audio thread:   filter.set(cutoff);  // may read a mangled value',
        codeTitle: 'a race in two lines',
      },
      {
        h: 'Why the obvious fix is worse',
        body: 'The classic answer is a **mutex** (mutual exclusion lock): one thread at a time. But if the audio thread ever *waits* for the UI thread to release a lock — while the UI is busy repainting — the block misses its deadline. That\'s a dropout, delivered by your "fix." **Never lock on the audio thread.** The real bridge arrives next lesson.',
        viz: { t: 'lanes', blocked: true },
        mistake: { code: 'void processBlock(...)\n{\n    std::lock_guard lock(mutex);  // ✗ audio thread may WAIT here\n    // ... render ...\n}', text: 'A lock that\'s ever contested turns the hard deadline into a coin flip. Mutexes belong to the UI/background world.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'threading',
        prompt: 'What is a race condition?',
        options: [
          { t: 'Two threads touching the same data with no coordination — results depend on timing luck', why: '' },
          { t: 'Code that runs too fast', why: 'Speed isn\'t the problem — *uncoordinated simultaneous access* is. Slow code races just as badly.' },
          { t: 'Two plugins competing for CPU', why: 'That\'s load balancing. Races are about shared memory inside one program.' },
          { t: 'A compiler error about threads', why: 'That\'s the tragedy: races compile silently and pass your tests. They fail on stage.' },
        ],
        answer: 0,
        explain: 'A race is timing-dependent corruption: whichever thread wins the microsecond decides the result. It works in every demo and fails in one studio in Berlin — the worst bug class in audio.',
      },
      {
        type: 'mcq', concept: 'threading',
        prompt: 'What\'s the worst-case outcome of locking a mutex inside processBlock?',
        options: [
          { t: 'The audio thread waits for the UI thread — the deadline is missed and audio drops out', why: '' },
          { t: 'Slightly higher CPU on the meter', why: 'The cost isn\'t average load — it\'s the *unbounded wait* when the lock is contested at the wrong moment.' },
          { t: 'The UI freezes forever', why: 'Usually the UI is the one *holding* the lock; it\'s the audio thread left waiting past its deadline.' },
          { t: 'Nothing — mutexes are instant', why: 'Uncontested, nearly. Contested, the wait is unbounded — and contested-at-the-worst-moment is what live sessions do best.' },
        ],
        answer: 0,
        explain: 'Priority inversion in one sentence: the real-time thread ends up waiting on the leisurely one. One contested lock = one audible glitch. This single rule explains half of professional plugin architecture.',
      },
      {
        type: 'predict', concept: 'threading',
        prompt: 'Both threads run this once, at the same time, on a shared plain int starting at 0. What can `count` be afterward?',
        code: '// shared: int count = 0;\n// each thread executes:\ncount = count + 1;',
        options: [
          { t: 'Sometimes 2, sometimes 1 — it\'s a race', why: '' },
          { t: 'Always 2', why: 'Only with coordination. Both can read 0, both write 1 — one increment silently vanishes.' },
          { t: 'Always 1', why: 'They *can* interleave safely and produce 2 — the point is you can\'t know which you\'ll get.' },
          { t: 'Always 0', why: 'Each thread definitely writes something ≥1 — the question is whether one update is lost.' },
        ],
        answer: 0,
        explain: 'Read-modify-write is three steps; interleave two threads\' steps and an update can vanish. "Usually 2, occasionally 1, depends on the machine" — that sentence is why the next lesson exists.',
      },
    ],
    recap: [
      'A plugin is always ≥2 threads: UI and audio.',
      'Races = uncoordinated shared access; timing decides the damage.',
      'Mutexes fix races but can block — never lock on the audio thread.',
      'The real-time rule list: no alloc, I/O, logging, throwing — or locks.',
    ],
    inside: [
      { name: 'Every plugin', use: 'every knob is UI-thread data the audio thread needs' },
      { name: 'Meters', use: 'audio writes levels; UI reads them — a race waiting to happen' },
      { name: 'Preset load', use: 'a background thread swapping state under a running engine' },
    ],
    analogyPanel: 'Two engineers, one desk, no talkback: each grabs the same fader at the same instant. A mutex is "one person at the desk at a time" — fine, until the performer is the one left waiting outside.',
    beginnerMistake: '"It worked when I tested it." Races don\'t show up on your machine at your buffer size — they show up on stage. Absence of glitches is not evidence of thread safety.',
    remember: 'Two threads share your plugin — and the audio thread must never be made to wait.',
    builds: ['thread', 'audio-thread', 'ui-thread'],
    leads: ['atomic', 'mutex'],
  },

  /* ---------------------------------------------------------- M14 */
  {
    id: 'm14', kind: 'lesson', title: 'Atomics & Lock-Free Thinking', short: 'std::atomic, producer/consumer',
    concepts: ['threading'], time: '~7 MIN', diff: 3,
    hook: 'A relay team doesn\'t stop to discuss the baton — the handoff is a single, indivisible gesture. C++ has that gesture for data. It\'s called an atomic, and it\'s how every knob in every modern plugin actually reaches the audio.',
    objective: 'Bridge threads with std::atomic — indivisible reads and writes, no locks — and meet the producer/consumer pattern.',
    sections: [
      {
        h: 'The indivisible handoff',
        body: '`std::atomic<float>` guarantees every read and write is **indivisible** — no thread can ever see a half-written value — and it\'s lock-free on every desktop platform you\'ll ship to. UI thread `store()`s, audio thread `load()`s. This is the standard bridge for parameter values, and it\'s exactly what APVTS (AudioProcessorValueTreeState) hands you in Zone 3.',
        viz: { t: 'lanes', atomic: true },
        code: 'std::atomic<float> targetCutoff { 1000.0f };\n\n// UI thread (knob moved):\ntargetCutoff.store(newValue);\n\n// audio thread (each block):\nfloat cutoff = targetCutoff.load();',
        codeTitle: 'the parameter bridge',
        breakdown: [
          ['std::atomic<float>', 'a float with indivisible access — no torn values, ever'],
          ['{ 1000.0f }', 'initialized like any member'],
          ['.store(x)', 'the UI thread\'s write — safe mid-render'],
          ['.load()', 'the audio thread\'s read — bounded, no waiting'],
        ],
      },
      {
        h: 'Lock-free thinking: producer / consumer',
        body: 'Atomics carry single values. For *streams* of events — MIDI from the UI, level data to meters — the pattern is **producer/consumer**: one thread pushes into a pre-allocated ring queue (a FIFO — First In, First Out), the other pops, and atomics track the positions. No locks anywhere. JUCE ships one as `AbstractFifo`; Zone 6 goes deep.',
        viz: { t: 'fifo' },
        warn: 'Loaded values still jump — pair the atomic with Zone 4\'s parameter smoothing: load the *target*, then glide per sample.',
      },
    ],
    checks: [
      {
        type: 'fill', concept: 'threading',
        prompt: 'The knob just moved on the UI thread. Publish the new value safely.',
        code: 'std::atomic<float> targetGain { 1.0f };\n\nvoid sliderChanged(float newValue)\n{\n    targetGain.___(newValue);\n}',
        accept: ['store'],
        placeholder: 'method',
        hint: 'The writing half of the handoff.',
        mistakes: [
          { match: '^load$', msg: 'load is the *reading* side (audio thread). The UI is publishing: store.' },
        ],
        explain: '.store() publishes indivisibly: whenever the audio thread looks, it sees the complete old value or the complete new one — never a mangled in-between.',
      },
      {
        type: 'fill', concept: 'threading',
        prompt: 'Now the audio thread picks the value up, once per block.',
        code: 'void processBlock(...)\n{\n    float gain = targetGain.___();\n    // ... smooth toward it, then apply ...\n}',
        accept: ['load'],
        placeholder: 'method',
        hint: 'The reading half.',
        explain: '.load() is bounded and never waits — legal on the audio thread. The loaded target then feeds a smoother so the gain glides instead of stepping.',
      },
      {
        type: 'mcq', concept: 'threading',
        prompt: 'In a producer/consumer FIFO between UI and audio, who does what?',
        options: [
          { t: 'One thread pushes events in; the other pops them out — positions tracked by atomics, no locks', why: '' },
          { t: 'Both threads push and pop freely', why: 'The classic lock-free FIFO is single-producer/single-consumer — one writer, one reader, by design.' },
          { t: 'The queue grows whenever it\'s full', why: 'Growing allocates — banned. Real-time FIFOs are pre-allocated rings; full means drop or handle, never grow.' },
          { t: 'A mutex guards each end', why: 'The entire point is *no* locks: atomic read/write positions keep both ends safe and bounded.' },
        ],
        answer: 0,
        explain: 'One producer, one consumer, a pre-allocated ring, atomic positions: the pattern behind MIDI queues, meter taps and preset handoffs in every serious plugin. Zone 6 has you build one.',
      },
    ],
    recap: [
      'std::atomic = indivisible reads/writes, no locks, no torn values.',
      'UI store()s, audio load()s — the standard parameter bridge.',
      'Streams of events flow through pre-allocated producer/consumer FIFOs.',
      'Pair loaded targets with smoothing — atomics deliver, smoothers glide.',
    ],
    inside: [
      { name: 'Every plugin', use: 'each APVTS parameter reaches audio as an atomic' },
      { name: 'Meters', use: 'audio stores levels; the UI loads and repaints' },
      { name: 'MIDI FX', use: 'UI-generated events queue through a lock-free FIFO' },
    ],
    analogyPanel: 'An atomic is a relay baton: the handoff is one indivisible gesture — you hold it or you don\'t, never half. A FIFO is the tape loop between rooms: one room records onto it, the other plays from it, nobody waits.',
    beginnerMistake: 'Making a shared float atomic and calling the job done — then reading it per-sample and wondering about zipper noise. Atomics move the value safely; smoothing makes it musical. You need both.',
    remember: 'UI stores, audio loads: the atomic handoff is how knobs reach the sound.',
    builds: ['thread', 'race-condition', 'parameter'],
    leads: ['apvts', 'parameter-smoothing'],
  },

  /* ---------------------------------------------------------- M15 */
  {
    id: 'm15', kind: 'lesson', title: 'Fast & Readable: Professional Habits', short: 'Performance, cache, style',
    concepts: ['performance'], time: '~5 MIN', diff: 2,
    hook: 'Great sessions run on two invisible disciplines: gain staging and labeling. Great codebases run on their twins — mechanical sympathy for the CPU, and names a stranger can read at 2 a.m.',
    objective: 'Keep data cache-friendly, measure before optimizing, and write C++ that your future collaborators can trust.',
    sections: [
      {
        h: 'Cache friendliness: why contiguous wins',
        body: 'CPUs read memory in chunks into a small fast **cache**. Data sitting side by side (a vector of floats) streams beautifully; data scattered across the heap (chains of pointers) makes the CPU wait on every hop. It\'s why your buffers are flat arrays — and why you process one channel fully before the next. And the golden rule: **measure before optimizing**, in a Release build — hunches lie, profilers don\'t.',
        viz: { t: 'buffer', n: 8, highlight: 0, label: 'CONTIGUOUS FLOATS', caption: 'side-by-side data streams; pointer-chasing stalls' },
      },
      {
        h: 'Readable is professional',
        body: 'The habits that mark production code: names that say intent (`numActiveVoices`, not `n`), `const` by default, functions that do one thing, early returns over deep nesting. Readable code is debuggable at 2 a.m. — and in audio, 2 a.m. is when the bug reports arrive.',
        code: '// before                      // after\nfloat p(float x, int n) {      float processSample(\n  if (n != 0) { /*20 lines*/ }     float sample,\n}                                  int numActiveVoices)',
        codeTitle: 'names carry the meaning',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'performance',
        prompt: 'Why does DSP code prefer one flat vector of floats over a linked chain of heap nodes?',
        options: [
          { t: 'Contiguous data streams through the CPU cache; pointer-chasing stalls it', why: '' },
          { t: 'Vectors sound warmer', why: 'Tempting, but no — identical math, wildly different memory traffic.' },
          { t: 'Linked structures can\'t hold floats', why: 'They can — they\'re just scattered across memory, and every hop is a potential cache miss.' },
          { t: 'It makes no measurable difference', why: 'It\'s often a several-fold difference in tight loops — among the largest wins in DSP performance.' },
        ],
        answer: 0,
        explain: 'The cache prefetches neighbors: walk contiguous floats and the data arrives before you ask. Chase pointers and the CPU idles per hop. Flat buffers aren\'t a style choice — they\'re mechanical sympathy.',
      },
      {
        type: 'mcq', concept: 'performance',
        prompt: 'Your synth feels heavy on CPU. First move?',
        options: [
          { t: 'Profile a Release build and find where the time actually goes', why: '' },
          { t: 'Rewrite the biggest file from scratch', why: 'Effort ≠ heat. The hot spot is usually three lines you\'d never have guessed — measure first.' },
          { t: 'Convert all floats to doubles', why: 'That typically makes it *slower* — twice the memory traffic through the cache.' },
          { t: 'Delete the meters', why: 'Maybe they\'re the cost — maybe 2%. Only the profiler knows.' },
        ],
        answer: 0,
        explain: 'Measure, in Release, then fix the top of the list. Optimizing by intuition mostly polishes code the CPU barely visits.',
      },
      {
        type: 'match', concept: 'performance',
        prompt: 'Match each professional habit to what it buys you.',
        left: ['contiguous data', 'descriptive names', 'const by default', 'small functions'],
        right: ['the cache streams it — speed for free', 'readable (and debuggable) at 2 a.m.', 'the compiler catches accidental changes', 'testable, reusable pieces'],
        explain: 'Speed and readability aren\'t rivals — the same habits deliver both. This is the style every zone from here on assumes.',
      },
    ],
    recap: [
      'Contiguous data is fast data; pointer-chasing stalls the cache.',
      'Measure in Release before optimizing anything.',
      'Names say intent; const by default; small functions; early returns.',
      'Readable code is what survives contact with 2 a.m.',
    ],
    inside: [
      { name: 'Every effect', use: 'flat channel buffers exist for the cache\'s sake' },
      { name: 'Synth', use: 'voice data laid out contiguously for the render loop' },
      { name: 'Shipping', use: 'profiling in Release is a release-checklist item' },
    ],
    analogyPanel: 'Cache friendliness is tape flowing past the head in one smooth pass instead of rewinding for every note. Readable code is the labeled patchbay — anyone can work the room.',
    beginnerMistake: 'Optimizing by vibe: shortening names, cramming lines, "probably faster." Unreadable and unmeasured is the worst of both worlds. Profile first; keep the labels.',
    remember: 'Flat data for the CPU, honest names for the humans — measure before touching either.',
    builds: ['cpu', 'vector', 'release-build'],
    leads: ['juce', 'audioprocessor'],
  }
);
