/* ============================================================
   ZONE 2 — standalone challenges, projects, boss.
   Same shapes as Zone 1 challenges/projects/boss.
   ============================================================ */

const ZONE2_CHALLENGES = [

  /* ============ ORDERING ============ */
  {
    id: 'mo1', kind: 'challenge', ctype: 'ordering', title: 'Assemble: An RAII Resource Class', short: 'Order the code',
    concepts: ['raii'],
    intro: 'Build the classic RAII shape: acquire in the constructor, release in the destructor — conventional order, top to bottom.',
    questions: [
      {
        type: 'order', concept: 'raii',
        prompt: 'Arrange into a valid RAII class (public interface first).',
        lines: [
          'class AudioDevice {',
          'public:',
          '    AudioDevice()  { open(); }',
          '    ~AudioDevice() { close(); }',
          '};',
        ],
        explain: 'Name, public panel, the acquire/release pair, closing `};`. Constructor opens, destructor closes — from now on, cleanup that can\'t be forgotten is your default shape.',
      },
    ],
  },
  {
    id: 'mo2', kind: 'challenge', ctype: 'ordering', title: 'Assemble: The Parameter Handoff', short: 'Order the flow',
    concepts: ['threading'],
    intro: 'A knob value must travel from a UI drag to smooth audio. Put the four stages of that journey in order.',
    questions: [
      {
        type: 'order', concept: 'threading',
        prompt: 'Arrange the parameter\'s journey, first step at the top.',
        lines: [
          '// UI thread: knob moves',
          'targetGain.store(newValue);',
          '// audio thread, each block:',
          'float target = targetGain.load();',
          'smoothed.setTarget(target);   // glide, don\'t jump',
        ],
        explain: 'UI stores → audio loads → smoother glides. Atomic for safety, smoothing for musicality — the exact pipeline behind every knob in a shipping plugin.',
      },
    ],
  },

  /* ============ COMPLETION ============ */
  {
    id: 'mc1', kind: 'challenge', ctype: 'completion', title: 'Complete: Own the Oscillator', short: 'Code completion',
    concepts: ['smart-pointers'],
    intro: 'The engine needs an oscillator that lives on the heap, with one clear owner, built the modern way.',
    questions: [
      {
        type: 'fill', concept: 'smart-pointers',
        prompt: 'Create the oscillator, owned from birth.',
        code: 'class SynthEngine {\n    void prepareToPlay(double sr, int maxBlock)\n    {\n        osc = std::___<WavetableOsc>();\n    }\n    std::unique_ptr<WavetableOsc> osc;\n};',
        accept: ['make_unique<WavetableOsc>', 'make_unique<WavetableOsc>()'],
        placeholder: 'make_...<...>',
        hint: 'One factory call: build + own, no naked new.',
        mistakes: [
          { match: 'new', msg: 'Legacy path. The one-step modern form: std::make_unique<WavetableOsc>().' },
        ],
        explain: 'make_unique in prepareToPlay: allocation backstage, ownership unambiguous, cleanup automatic when the engine dies.',
      },
    ],
  },
  {
    id: 'mc2', kind: 'challenge', ctype: 'completion', title: 'Complete: The Read-Only Promise', short: 'Code completion',
    concepts: ['move-semantics'],
    intro: 'A metering method only reads state. Write the promise into the signature so the compiler enforces it.',
    questions: [
      {
        type: 'fill', concept: 'move-semantics',
        prompt: 'Mark the method as read-only.',
        code: 'class Meter {\npublic:\n    float getPeak() ___ { return peak; }\nprivate:\n    float peak = 0.0f;\n};',
        accept: ['const'],
        placeholder: 'keyword',
        hint: 'The lock from Zone 1, applied to a whole method.',
        explain: 'A trailing `const` promises the method changes nothing — and lets it be called on const Meters. Read-only paths marked read-only: const correctness in one word.',
      },
    ],
  },
  {
    id: 'mc3', kind: 'challenge', ctype: 'completion', title: 'Complete: The Maybe-Note', short: 'Code completion',
    concepts: ['modern-types'],
    intro: 'A voice between notes holds honestly nothing. Read its note with a safe fallback.',
    questions: [
      {
        type: 'fill', concept: 'modern-types',
        prompt: 'Read the note — or fall back to middle C (60) if there is none.',
        code: 'std::optional<int> currentNote;\n\nint noteToShow = currentNote.___(60);',
        accept: ['value_or'],
        placeholder: 'method',
        hint: 'The value… or something.',
        explain: 'value_or(60): the note if present, your fallback if not — an if/else compressed into one honest call.',
      },
    ],
  },
  {
    id: 'mc4', kind: 'challenge', ctype: 'completion', title: 'Complete: The Voice Pool Type', short: 'Code completion',
    concepts: ['templates'],
    intro: 'Declare the voice pool every synth is built on: resizable, one clear owner per voice.',
    questions: [
      {
        type: 'fill', concept: 'templates',
        prompt: 'Fill the element type: each slot solely owns one Voice.',
        code: 'std::vector<std::___<Voice>> voices;',
        accept: ['unique_ptr'],
        placeholder: 'owner',
        hint: 'Read it inside-out: a row of sole-ownership handles.',
        mistakes: [
          { match: '^shared_ptr$', msg: 'The engine is the only owner of its voices — sharing blurs that for no benefit. unique_ptr.' },
        ],
        explain: 'vector<unique_ptr<Voice>>: the type you\'ll type in Zone 5 for real. Growable backstage, unambiguous ownership, automatic cleanup.',
      },
    ],
  },
  {
    id: 'mc5', kind: 'challenge', ctype: 'completion', title: 'Complete: The Atomic Bridge', short: 'Code completion',
    concepts: ['threading'],
    intro: 'The audio thread needs this block\'s target cutoff — safely, without locks.',
    questions: [
      {
        type: 'fill', concept: 'threading',
        prompt: 'Pick the value up on the audio thread.',
        code: 'std::atomic<float> targetCutoff { 1000.0f };\n\nvoid processBlock(...)\n{\n    float cutoff = targetCutoff.___();\n    filter.setCutoff(cutoff);\n}',
        accept: ['load'],
        placeholder: 'method',
        hint: 'The reading half of the handoff.',
        mistakes: [
          { match: '^store$', msg: 'store publishes (the UI side). The audio thread is receiving: load.' },
        ],
        explain: '.load(): indivisible, bounded, and free of waiting — the only kind of cross-thread read the audio thread accepts.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'mb1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Pillaged Buffer', short: 'Find the bug',
    concepts: ['move-semantics'],
    intro: 'A wavetable is moved into the engine — then the code keeps using the leftovers. Tap the line that reads from an empty husk.',
    questions: [
      {
        type: 'bugspot', concept: 'move-semantics',
        prompt: 'One line uses a moved-from object as if it still had the data. Which?',
        code: [
          'std::vector<float> table = renderTable();',
          'engine.setTable(std::move(table));',
          'float peak = findPeak(table);',
          'display.show(peak);',
        ],
        buggy: 2,
        explain: 'Line 2 handed the table\'s contents to the engine — after a move, `table` is valid but empty. findPeak scans zero samples and "peak" is meaningless. Fix: compute the peak *before* moving, or ask the engine for it.',
        fix: 'float peak = findPeak(table);  // BEFORE the move',
      },
    ],
  },
  {
    id: 'mb2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Gain That Ghosts', short: 'Find the bug',
    concepts: ['modern-syntax'],
    intro: 'A range-based loop applies gain… and the output is bone dry. Tap the line processing ghosts.',
    questions: [
      {
        type: 'bugspot', concept: 'modern-syntax',
        prompt: 'One line makes the loop edit copies instead of the real samples. Which?',
        code: [
          'void applyGain(std::vector<float>& buffer, float gain)',
          '{',
          '    for (auto sample : buffer)',
          '        sample *= gain;',
          '}',
        ],
        buggy: 2,
        explain: '`for (auto sample : …)` copies each element — the gain lands on throwaway copies and the buffer never changes. One character fixes it: `for (auto& sample : buffer)`. The modern face of Zone 1\'s missing-& bug.',
        fix: 'for (auto& sample : buffer)',
      },
    ],
  },
  {
    id: 'mb3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Callback That Outlived Its World', short: 'Find the bug',
    concepts: ['lambdas'],
    intro: 'A stored callback captures a local by reference. The local dies; the callback lives on. Tap the doomed line.',
    questions: [
      {
        type: 'bugspot', concept: 'lambdas',
        prompt: 'One line captures something that won\'t exist when the lambda finally runs. Which?',
        code: [
          'void setupSlider()',
          '{',
          '    float scale = computeScale();',
          '    slider.onValueChange = [&] { apply(scale); };',
          '}',
        ],
        buggy: 3,
        explain: '`[&]` captures `scale` by reference — but scale dies at the closing brace, and the callback fires much later. A dangling capture: the lambda cousin of the dangling pointer. Fix: capture by value — `[scale]` (or `[=]`).',
        fix: 'slider.onValueChange = [scale] { apply(scale); };',
      },
    ],
  },
  {
    id: 'mb4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Lock on Stage', short: 'Find the bug',
    concepts: ['threading'],
    intro: 'This plugin drops out whenever its editor repaints. One line makes the audio thread wait. Tap it.',
    questions: [
      {
        type: 'bugspot', concept: 'threading',
        prompt: 'Which line can block the audio thread past its deadline?',
        code: [
          'void processBlock(AudioBuffer& buffer)',
          '{',
          '    std::lock_guard<std::mutex> lock(paramMutex);',
          '    float gain = sharedGain;',
          '    applyGain(buffer, gain);',
          '}',
        ],
        buggy: 2,
        explain: 'A mutex in processBlock: whenever the UI holds that lock, the audio thread *waits* — and the deadline dies. Fix: make sharedGain a `std::atomic<float>` and `.load()` it. Locks never belong where the deadline lives.',
        fix: 'float gain = sharedGain.load();  // std::atomic<float>',
      },
    ],
  },

  /* ============ SIMULATED COMPILER ============ */
  {
    id: 'me1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Copy That Can\'t', short: 'Read the error',
    concepts: ['smart-pointers'],
    intro: 'Someone tried to copy a unique_ptr. The compiler said no — in its own special way. Decode it, pick the fix.',
    questions: [
      {
        type: 'compiler', concept: 'smart-pointers',
        prompt: 'What fixes this build — while keeping single ownership?',
        code: 'auto osc = std::make_unique<SineOsc>();\nauto osc2 = osc;   // hand it to the voice',
        error: "engine.cpp:2:13: error: use of deleted function\n'std::unique_ptr<SineOsc>::unique_ptr(const unique_ptr&)'\nnote: declared here — copying a unique_ptr is deleted",
        options: [
          { t: 'Transfer ownership: `auto osc2 = std::move(osc);`', why: '' },
          { t: 'Switch both to raw pointers', why: 'That "fixes" the error by deleting the safety — back to manual delete and double-free land.' },
          { t: 'Use memcpy to copy it', why: 'Bypassing the type system doesn\'t bypass the double-delete — it guarantees it, plus undefined behavior.' },
          { t: 'Declare osc2 first, then assign', why: 'Assignment hits a matching deleted function — the copy assignment — same failure, one line later.' },
        ],
        answer: 0,
        explain: '"use of deleted function" = this operation was banned *on purpose*. unique_ptr deletes its copy constructor so two owners can\'t exist. The sanctioned gesture is the handover: std::move.',
      },
    ],
  },
  {
    id: 'me2', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Selector That Won\'t Mix', short: 'Read the error',
    concepts: ['modern-syntax'],
    intro: 'An enum class refuses to act like a number — because that\'s its job. Read the message, pick the fix.',
    questions: [
      {
        type: 'compiler', concept: 'modern-syntax',
        prompt: 'What\'s the right fix?',
        code: 'enum class Waveform { sine, saw, square };\n\nWaveform wave = Waveform::saw;\nint index = wave;   // for the wavetable lookup',
        error: "osc.cpp:4:13: error: cannot convert 'Waveform'\nto 'int' in initialization\nnote: no implicit conversion from scoped enum",
        options: [
          { t: 'Convert explicitly where you truly need a number: `int index = (int) wave;`', why: '' },
          { t: 'Change enum class back to plain enum', why: 'That reopens the hole enum class closed — silent conversions and nonsense values. Keep the safety; convert explicitly at the one place you need it.' },
          { t: 'Store waveforms as raw ints everywhere', why: 'Then nothing stops waveform 47. The labeled ring exists for a reason.' },
          { t: 'It can\'t be fixed — enum class values are unusable as indexes', why: 'They\'re usable — the language just insists the conversion be *visible*: a deliberate cast.' },
        ],
        answer: 0,
        explain: 'enum class blocks *implicit* conversion by design — that\'s the type safety. Where an index is genuinely needed (wavetable lookup), you cast explicitly and visibly: `(int) wave` (or static_cast<int>(wave)). The safety stays; the intent is on the page.',
      },
    ],
  },

  /* ============ PROJECTS ============ */
  {
    id: 'p3', kind: 'project', title: 'Mission: The Voice Rack', short: 'Mini-project',
    concepts: ['smart-pointers', 'ownership'],
    brief: 'Build a synth\'s voice allocator: an owned pool of voices, a free-voice search, and a stealing policy — the exact machinery inside every polysynth you own. You\'ll wire this into a real engine in Zone 5.',
    steps: [
      {
        note: 'Step 1 — Choose the pool\'s type. Eight voices, owned by the engine, created backstage.',
        q: {
          type: 'mcq', concept: 'smart-pointers',
          prompt: 'Which storage is right for the voice pool?',
          options: [
            { t: '`std::vector<std::unique_ptr<Voice>>` — sized in prepareToPlay', why: '' },
            { t: '`std::vector<Voice*>` with manual new/delete', why: 'Raw owning pointers: one forgotten delete per code path. unique_ptr makes cleanup automatic.' },
            { t: '`std::vector<std::shared_ptr<Voice>>`', why: 'Nobody co-owns a voice — the engine is its only owner. Sharing adds counting cost and blurs responsibility.' },
            { t: 'Eight global Voice variables', why: 'Globals can\'t resize, can\'t loop cleanly, and leak state across plugin instances.' },
          ],
          answer: 0,
          explain: 'The pool every synth leans on: resizable backstage, one owner per voice, automatic teardown. You typed this type in the challenges — now it\'s load-bearing.',
        },
      },
      {
        note: 'Step 2 — Populate it. Eight voices, built the modern way, in the sanctioned place.',
        q: {
          type: 'fill', concept: 'smart-pointers',
          prompt: 'Create each voice inside the setup loop.',
          code: 'void prepareToPlay(double sr, int maxBlock)\n{\n    voices.clear();\n    for (int i = 0; i < 8; ++i)\n        voices.push_back(std::___<Voice>());\n}',
          accept: ['make_unique<Voice>', 'make_unique<Voice>()'],
          placeholder: 'factory',
          hint: 'Build + own in one call.',
          explain: 'Eight make_unique calls, all in prepareToPlay: allocation backstage, push_back safe here (and only here). The audio thread will meet a pool that\'s already complete.',
        },
      },
      {
        note: 'Step 3 — Note-on arrives: find a free voice.',
        q: {
          type: 'fill', concept: 'ownership',
          prompt: 'A voice is available when it is NOT active. Complete the test.',
          code: 'Voice* findFreeVoice()\n{\n    for (auto& v : voices)\n        if (___)\n            return v.get();\n    return nullptr;    // all busy\n}',
          accept: ['!v->isActive()', '! v->isActive()', 'v->isActive() == false'],
          placeholder: 'condition',
          hint: 'Reach through the unique_ptr with ->, and negate.',
          mistakes: [
            { match: '^v->isActive\\(\\)$', msg: 'That finds a *busy* voice. You want the idle ones: negate it with !.' },
            { match: 'v\\.isActive', msg: 'v is a unique_ptr — reach the Voice through it with the arrow: v->isActive().' },
          ],
          explain: '!v->isActive(): sweep the pool, hand back the first idle voice. Note the return type — a raw Voice* here is a *non-owning* peek, which is exactly what borrowers should get. (Returning nullptr honestly says "none free" — the caller decides what\'s next.)',
        },
      },
      {
        note: 'Step 4 — All eight busy, and a ninth note arrives. Assemble the noteOn policy.',
        q: {
          type: 'order', concept: 'ownership',
          prompt: 'Arrange the noteOn flow, first decision at the top.',
          lines: [
            'Voice* v = findFreeVoice();',
            'if (v == nullptr)',
            '    v = stealOldestVoice();   // fast-fade, reassign',
            'v->startNote(note, velocity);',
          ],
          explain: 'Try free first; steal only when forced; then start the note on whichever voice you ended up with. Graceful stealing (fade, then reassign) is what separates smooth polysynths from clicky ones.',
        },
      },
      {
        note: 'Step 5 — Code review. A teammate "optimized" voice creation. The plugin now glitches on busy passages.',
        q: {
          type: 'bugspot', concept: 'smart-pointers',
          prompt: 'Tap the line that breaks the real-time rules.',
          code: [
            'void noteOn(int note, float velocity)',
            '{',
            '    if (findFreeVoice() == nullptr)',
            '        voices.push_back(std::make_unique<Voice>());',
            '    startOnFreeVoice(note, velocity);',
            '}',
          ],
          buggy: 3,
          explain: 'Growing the pool during noteOn — which runs on the audio thread — allocates: make_unique allocates the Voice AND push_back may reallocate the vector. Two allocations where zero are allowed. Real synths steal instead: the pool\'s size is a backstage decision.',
          fix: 'Steal an active voice instead — the pool never grows on stage',
        },
      },
    ],
  },
  {
    id: 'p4', kind: 'project', title: 'Mission: The Preset Vault', short: 'Mini-project',
    concepts: ['modern-types', 'move-semantics'],
    brief: 'Build the loading path of a preset manager: honest maybe-values for presets that fail to load, and move semantics so big preset blobs transfer without copying. The same shapes reappear in Zone 3\'s ValueTree state.',
    steps: [
      {
        note: 'Step 1 — Loading can fail (missing file, wrong version). Choose the honest return type.',
        q: {
          type: 'mcq', concept: 'modern-types',
          prompt: 'What should loadPreset(path) return?',
          options: [
            { t: '`std::optional<Preset>` — a Preset, or honestly nothing', why: '' },
            { t: '`Preset` with all-zero values on failure', why: 'A silent zeroed preset *looks* loaded — the failure hides until a user notices their patch is gone.' },
            { t: '`Preset*` that\'s null on failure', why: 'Workable but raw: who owns that pointer? optional carries the maybe *and* the value, no ownership puzzle.' },
            { t: '`bool`, with the preset in a global', why: 'Globals plus a flag is the pattern optional was invented to replace.' },
          ],
          answer: 0,
          explain: 'optional<Preset> writes "this can fail" into the signature. Callers are forced to handle the empty case — no zombie presets, no conventions to remember.',
        },
      },
      {
        note: 'Step 2 — Declare it.',
        q: {
          type: 'fill', concept: 'modern-types',
          prompt: 'Complete the signature.',
          code: 'std::___<Preset> loadPreset(const std::string& path);',
          accept: ['optional'],
          placeholder: 'template',
          hint: 'Maybe a Preset.',
          explain: 'std::optional<Preset>: the maybe is now part of the type, checked by the compiler at every call site.',
        },
      },
      {
        note: 'Step 3 — Show the loaded preset\'s name — or a safe default when nothing loaded.',
        q: {
          type: 'predict', concept: 'modern-types',
          prompt: 'The load failed (empty optional). What does the display show?',
          code: 'auto preset = loadPreset("missing.pst");   // empty\n\ndisplay.setText(\n    preset.has_value() ? preset->name\n                       : "INIT");',
          options: [
            { t: '`INIT` — the empty branch runs', why: '' },
            { t: 'The missing preset\'s name', why: 'There is no preset — has_value() is false, so the fallback branch runs.' },
            { t: 'Garbage text', why: 'That\'s what the check prevents: no unchecked access ever happens.' },
            { t: 'It crashes', why: 'has_value() guards the access — this is exactly the safe pattern.' },
          ],
          answer: 0,
          explain: 'Check, then branch: the UI shows INIT and the session keeps rolling. Failure became a state, not an accident.',
        },
      },
      {
        note: 'Step 4 — The preset holds big data (wavetables, sample refs). Store it without cloning.',
        q: {
          type: 'fill', concept: 'move-semantics',
          prompt: 'Hand the loaded preset into the member — no copy.',
          code: 'void applyPreset(Preset loaded)\n{\n    currentPreset = std::___(loaded);\n}',
          accept: ['move'],
          placeholder: 'one word',
          hint: 'Permission to pillage.',
          explain: 'std::move(loaded): the parameter was this data\'s last stop — the member takes its internals wholesale. Megabytes handed over for the price of a pointer swap.',
        },
      },
      {
        note: 'Step 5 — Assemble the full loading path.',
        q: {
          type: 'order', concept: 'modern-types',
          prompt: 'Arrange applyIfLoaded, top to bottom.',
          lines: [
            'auto loaded = loadPreset(path);',
            'if (!loaded.has_value())',
            '    return;             // keep current sound',
            'currentPreset = std::move(*loaded);',
            'rebuildVoices();',
          ],
          explain: 'Load → check → move → rebuild. Failure exits early (RAII cleans anything partial); success transfers the blob without a single copied sample. This shape is production code.',
        },
      },
    ],
  },
  {
    id: 'p5', kind: 'project', title: 'Mission: The Synth Skeleton', short: 'Zone project',
    concepts: ['threading', 'smart-pointers', 'ownership'],
    brief: 'The Zone 2 finale: assemble the architecture of a real synthesizer — owned voice pool, atomic parameter bridge, and a processBlock that stays clean on the real-time thread. This exact skeleton becomes a sounding instrument in Zones 3–5.',
    steps: [
      {
        note: 'Step 1 — The blueprint. An engine, its voices, and two threads that must never collide.',
        q: {
          type: 'mcq', concept: 'ownership',
          prompt: 'Which architecture is right?',
          options: [
            { t: 'Engine owns the voices (vector of unique_ptr); knob values cross via atomics; UI only observes', why: '' },
            { t: 'The editor owns the voices, since it has the knobs', why: 'The editor comes and goes with the window — sound would die when it closed. Audio state lives with the processor.' },
            { t: 'Voices own each other in a chain', why: 'A chain of owners means one voice\'s death cascades — and nobody can reason about lifetime.' },
            { t: 'Everything global, everything shared', why: 'Every lesson in this zone was a case against exactly this.' },
          ],
          answer: 0,
          explain: 'The engine (your AudioProcessor, come Zone 3) owns all sound-making state. The UI is a temporary window that stores atomics and observes. This division IS plugin architecture.',
        },
      },
      {
        note: 'Step 2 — Declare the parameter bridge.',
        q: {
          type: 'fill', concept: 'threading',
          prompt: 'Cutoff must cross threads safely. Complete the member.',
          code: 'class SynthEngine {\nprivate:\n    std::vector<std::unique_ptr<Voice>> voices;\n    std::___<float> targetCutoff { 1000.0f };\n};',
          accept: ['atomic'],
          placeholder: 'template',
          hint: 'The indivisible-handoff type.',
          explain: 'std::atomic<float>: the knob\'s bridge. UI stores, audio loads, nobody waits, nothing tears.',
        },
      },
      {
        note: 'Step 3 — The audio thread picks up the target each block.',
        q: {
          type: 'fill', concept: 'threading',
          prompt: 'Read the bridge, audio-side.',
          code: 'void processBlock(AudioBuffer& buffer)\n{\n    float cutoff = targetCutoff.___();\n    for (auto& v : voices)\n        v->render(buffer, cutoff);\n}',
          accept: ['load'],
          placeholder: 'method',
          hint: 'The receiving half.',
          explain: 'load once per block, hand the value down to every voice. (Zone 4 adds the smoother between load and render.) Note the range-for with & — every habit from this zone, working together.',
        },
      },
      {
        note: 'Step 4 — Assemble the engine\'s lifecycle.',
        q: {
          type: 'order', concept: 'ownership',
          prompt: 'Arrange the skeleton\'s flow: setup, then per-block work.',
          lines: [
            'void prepareToPlay(double sr, int maxBlock) {',
            '    buildVoicePool();       // allocate everything',
            '}',
            'void processBlock(AudioBuffer& buffer) {',
            '    renderAllVoices(buffer); // allocate NOTHING',
            '}',
          ],
          explain: 'Everything heavy in prepare; only bounded work per block. Two functions, one law — the plugin lifecycle you\'ll fill with real JUCE in Zone 3.',
        },
      },
      {
        note: 'Step 5 — Final review. One line of debug helpfulness snuck into the render path.',
        q: {
          type: 'bugspot', concept: 'threading',
          prompt: 'Tap the real-time violation.',
          code: [
            'void processBlock(AudioBuffer& buffer)',
            '{',
            '    float cutoff = targetCutoff.load();',
            '    std::cout << "cutoff: " << cutoff << "\\n";',
            '    for (auto& v : voices)',
            '        v->render(buffer, cutoff);',
            '}',
          ],
          buggy: 3,
          explain: 'Logging is I/O: std::cout can block on the console, the disk, anything — unbounded time on the deadline thread. Debug prints live on the UI thread or behind debug-build metering. The atomic load above it? Perfectly legal. Now you can tell them apart on sight.',
          fix: 'Delete it — meter via atomics to the UI instead',
        },
      },
      {
        note: 'Step 6 — Ship-readiness check.',
        q: {
          type: 'mcq', concept: 'threading',
          prompt: 'Which of these is SAFE in this engine\'s processBlock?',
          options: [
            { t: 'targetCutoff.load(), then arithmetic on the voices\' buffers', why: '' },
            { t: 'voices.push_back to add a voice on demand', why: 'Allocation on stage — the exact bug from the Voice Rack mission. Pool size is a backstage decision.' },
            { t: 'std::lock_guard around the render loop', why: 'A contested lock turns the deadline into a coin flip — the mb4 bug.' },
            { t: 'throw std::runtime_error if a table is missing', why: 'Unbounded, and hosts don\'t catch it. Report with optional/return values instead.' },
          ],
          answer: 0,
          explain: 'Atomic loads and pure arithmetic on pre-allocated data: the entire legal vocabulary of the audio thread. Your skeleton is clean — Zone 2 cleared, architecture in hand.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss2', kind: 'boss', title: 'BOSS: The Haunted Synth', short: 'Zone 2 boss',
    concepts: ['smart-pointers', 'move-semantics', 'threading', 'raii'],
    brief: 'A collaborator\'s half-finished synth: it leaks, it drops out when the editor opens, and sometimes a preset loads as silence. Every ghost in it is a Zone 2 lesson wearing a sheet. Six stages, one retry each, clear 4 to ship it.',
    stages: [
      {
        type: 'compiler', concept: 'smart-pointers',
        prompt: 'Stage 1 — It won\'t even build. Fix it while keeping single ownership.',
        code: 'auto voice = std::make_unique<Voice>();\nactiveVoices.push_back(voice);',
        error: "synth.cpp:2:29: error: use of deleted function\n'std::unique_ptr<Voice>::unique_ptr(const unique_ptr&)'",
        options: [
          { t: '`activeVoices.push_back(std::move(voice));`', why: '' },
          { t: 'Store raw pointers instead', why: 'Trading a build error for manual delete and double-free risk. Keep the safety; use the handover.' },
          { t: 'Make the vector hold copies of Voice objects', why: 'Possible but changes the design — and copying voices mid-life duplicates state. The intended fix is one word: move.' },
          { t: 'Remove the unique_ptr entirely', why: '"Delete the safety" is never the fix. The compiler is asking for a transfer, not a surrender.' },
        ],
        answer: 0,
        explain: '"use of deleted function" on a unique_ptr copy = the compiler protecting single ownership. push_back(std::move(voice)) hands the voice into the pool — one owner, before and after.',
      },
      {
        type: 'bugspot', concept: 'threading',
        prompt: 'Stage 2 — Dropouts whenever the editor repaints. Tap the cause.',
        code: [
          'void processBlock(AudioBuffer& buffer)',
          '{',
          '    std::lock_guard<std::mutex> lock(uiMutex);',
          '    renderVoices(buffer);',
          '}',
        ],
        buggy: 2,
        explain: 'The editor holds uiMutex while repainting; processBlock waits; the deadline dies. Knob values cross by atomic, streams by FIFO — locks never enter the render path.',
        fix: 'Replace the shared state with std::atomic values',
      },
      {
        type: 'predict', concept: 'move-semantics',
        prompt: 'Stage 3 — Presets sometimes load as silence. Why?',
        code: 'auto table = loadWavetable(path);\nengine.setTable(std::move(table));\nvalidateTable(table);   // "verify after applying"',
        options: [
          { t: 'validateTable checks an empty husk — the data moved into the engine', why: '' },
          { t: 'std::move deleted the table', why: 'Nothing is deleted — the contents changed owner. But the old name now holds an empty vector, and validating *that* is meaningless.' },
          { t: 'loadWavetable always fails', why: 'The load is fine — the post-move read is the ghost.' },
          { t: 'setTable copies, so everything works', why: 'std::move exists to prevent exactly that copy — and it did. The husk is the price.' },
        ],
        answer: 0,
        explain: 'Validating after moving validates nothing. Check *before* the handover — or ask the engine to validate what it received. Moved-from means empty-handed.',
      },
      {
        type: 'order', concept: 'threading',
        prompt: 'Stage 4 — Rebuild the knob-to-audio path properly.',
        lines: [
          '// UI thread:',
          'targetGain.store(sliderValue);',
          '// audio thread:',
          'float target = targetGain.load();',
          'applySmoothed(target);',
        ],
        explain: 'Store → load → smooth. Safe crossing, musical result — the pipeline every parameter in this synth now uses.',
      },
      {
        type: 'fill', concept: 'raii',
        prompt: 'Stage 5 — The old code leaked its sample file handle on early returns. Give the wrapper its RAII release.',
        code: 'class SampleHandle {\npublic:\n    SampleHandle(const char* path) { open(path); }\n    ___()                          { close(); }\n};',
        accept: ['~SampleHandle'],
        placeholder: 'name',
        hint: 'The power-down twin of the constructor.',
        explain: '~SampleHandle(): with close() wired to the destructor, every path out — normal, early return, error — releases the file. The leak is structurally gone.',
      },
      {
        type: 'mcq', concept: 'threading',
        prompt: 'Stage 6 — Final ship check. Which belongs in this synth\'s processBlock?',
        options: [
          { t: 'Atomic loads, smoothing math, and rendering into pre-allocated buffers', why: '' },
          { t: 'A quick std::cout to trace gain values', why: 'I/O on the deadline thread — the Synth Skeleton\'s ghost. Meter through atomics instead.' },
          { t: 'make_unique for voices as notes arrive', why: 'Allocation on stage. The pool was sized in prepareToPlay; busy pools steal.' },
          { t: 'A try/catch around everything, throwing on bad state', why: 'Throwing is banned where the deadline lives — design the path so it can\'t need to.' },
        ],
        answer: 0,
        explain: 'Load, compute, write — on memory that already exists. That\'s the whole legal vocabulary, and this synth now speaks it fluently. The haunting is over: Zone 2 cleared.',
      },
    ],
  },
];
