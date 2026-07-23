/* ============================================================
   ZONE 3 — JUCE PLUGIN FOUNDATION: lessons j1–j9.
   Reference project throughout: TXPPS First Signal (gain plugin).
   Same lesson shape as Zone 2 (time/diff/builds/leads included).
   ============================================================ */

const ZONE3_LESSONS = [

  /* ------------------------------------------------------ J1 */
  {
    id: 'j1', kind: 'lesson', title: 'What JUCE Actually Is', short: 'The framework, honestly',
    concepts: ['juce-basics'], time: '~5 MIN', diff: 1,
    hook: 'Two zones of C++ later, you could write a synth engine — but a DAW still couldn\'t load it. The missing piece isn\'t more C++. It\'s the framework that speaks to hosts for you: JUCE.',
    objective: 'Know exactly what JUCE (Jules\' Utility Class Extensions) provides, what it doesn\'t, and how your code fits into it.',
    sections: [
      {
        h: 'A framework, not a language',
        body: 'JUCE is a **C++ framework**: a huge library of pre-built classes plus a build recipe. Everything you learned still applies — JUCE just supplies the pieces you shouldn\'t write yourself: the plugin-format wrappers (VST3, AU), audio device handling, UI components, and parameter plumbing.',
        viz: { t: 'chain', nodes: ['your C++', '+ JUCE classes', '= loadable plugin'], accent: 1 },
      },
      {
        h: 'What it does — and doesn\'t — do',
        body: 'JUCE gives you: `juce::AudioProcessor` to inherit, buffers, sliders, and one build that outputs every format. It does **not** write your DSP, design your sound, or make bad real-time code safe. You write two classes and one CMake file; JUCE wraps them into something a DAW can scan and load.',
        warn: 'Everything in JUCE lives in the `juce::` namespace — Zone 2\'s namespace lesson, now load-bearing on every line.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'juce-basics',
        prompt: 'What is JUCE?',
        options: [
          { t: 'A C++ framework: pre-built classes plus a build system for audio apps and plugins', why: '' },
          { t: 'A new programming language', why: 'It\'s plain modern C++ — every Zone 1 and 2 skill applies directly.' },
          { t: 'A DAW', why: 'JUCE builds the plugins that DAWs load — it isn\'t a host itself.' },
          { t: 'A compiler', why: 'Your normal compiler builds JUCE code; JUCE supplies classes and build recipes, not compilation.' },
        ],
        answer: 0,
        explain: 'JUCE is a library plus build tooling. You supply the processor, editor and CMake description; it supplies everything between your code and the DAW.',
      },
      {
        type: 'mcq', concept: 'juce-basics',
        prompt: 'Which of these does JUCE do for you automatically?',
        options: [
          { t: 'Wrap your processor so hosts can load it as VST3, AU or standalone', why: '' },
          { t: 'Write your DSP', why: 'The sound is entirely yours — JUCE hands you buffers, not algorithms.' },
          { t: 'Make allocation in processBlock safe', why: 'The real-time rules from Zone 2 are still your responsibility — no framework can suspend physics.' },
          { t: 'Design your interface', why: 'It provides Slider and Label components; what you build with them is up to you.' },
        ],
        answer: 0,
        explain: 'The format wrappers are the superpower: one AudioProcessor, every format. The DSP, the design, and the discipline remain yours.',
      },
      {
        type: 'fill', concept: 'juce-basics',
        prompt: 'JUCE classes live in a namespace. Complete the type name.',
        code: '___::AudioProcessor',
        accept: ['juce'],
        placeholder: 'namespace',
        hint: 'Four letters — the framework\'s own group prefix.',
        explain: '`juce::` before everything: AudioProcessor, Slider, AudioBuffer. Zone 2\'s namespace lesson pays off on every single line of Zone 3.',
      },
    ],
    recap: [
      'JUCE = C++ framework: classes + build recipe, not a language.',
      'It wraps your code into VST3/AU/standalone.',
      'DSP, design and real-time discipline stay yours.',
      'Everything is juce::-prefixed.',
    ],
    inside: [
      { name: 'First Signal', use: 'the gain plugin we build this zone is pure JUCE + your C++' },
      { name: 'Commercial plugins', use: 'a huge share of the plugins you own are built on it' },
    ],
    analogyPanel: 'JUCE is the pro studio you move into: patchbays wired, monitors aligned, formats handled. You still have to make the record.',
    beginnerMistake: 'Copy-pasting JUCE examples as incantations. Every line is ordinary C++ you can now read — classes, namespaces, unique_ptr, atomics. Read it; don\'t chant it.',
    remember: 'JUCE is the bridge between your C++ and every DAW — you still write both ends.',
    builds: ['juce', 'namespace', 'class'],
    leads: ['audioprocessor', 'cmake'],
  },

  /* ------------------------------------------------------ J2 */
  {
    id: 'j2', kind: 'lesson', title: 'Anatomy of a Plugin Project', short: 'The five files',
    concepts: ['juce-basics'], time: '~6 MIN', diff: 1,
    hook: 'Open any JUCE plugin repo — including the one we\'re about to build — and the same five files greet you. Learn this map once and no plugin codebase will ever look foreign again.',
    objective: 'Know each core file of TXPPS First Signal and exactly what belongs in it.',
    sections: [
      {
        h: 'The file map',
        body: 'Four source files and one build recipe. **PluginProcessor.h/.cpp** — the audio engine (Zone 1\'s panel/circuit split). **PluginEditor.h/.cpp** — the interface. **CMakeLists.txt** — the build recipe that turns them into a plugin. The `build/` folder is *generated* — machine output you never edit and never commit.',
        viz: { t: 'filemap' },
      },
      {
        h: 'Who includes whom',
        body: 'The editor includes the processor\'s header (it displays the engine\'s state) — **never the other way around**. The processor must compile, run, and make sound with no editor at all. That one-way street is the architecture rule this whole zone enforces.',
        code: '// PluginEditor.h\n#pragma once\n#include "PluginProcessor.h"   // editor sees engine ✓\n\n// PluginProcessor.h NEVER includes PluginEditor.h ✗',
        codeTitle: 'the one-way street',
      },
    ],
    checks: [
      {
        type: 'match', concept: 'juce-basics',
        prompt: 'Match each file to its responsibility.',
        left: ['PluginProcessor.cpp', 'PluginEditor.cpp', 'CMakeLists.txt', 'build/'],
        right: ['the audio engine\'s implementation', 'the interface\'s implementation', 'the build recipe', 'generated output — never edited'],
        explain: 'Engine, panel, recipe, output. Every JUCE project you\'ll ever read is a variation of this map.',
      },
      {
        type: 'mcq', concept: 'juce-basics',
        prompt: 'Which include direction is correct?',
        options: [
          { t: 'PluginEditor.h includes PluginProcessor.h', why: '' },
          { t: 'PluginProcessor.h includes PluginEditor.h', why: 'That couples the engine to its panel — the engine must run headless (no window, no editor) in every host.' },
          { t: 'Both include each other', why: 'Circular includes fail to build — and the design is wrong in one direction anyway.' },
          { t: 'Neither — they communicate by file', why: 'They communicate by direct C++ references (editor holds a reference to the processor), set up at editor creation.' },
        ],
        answer: 0,
        explain: 'The editor is a temporary window onto a permanent engine — so the window knows the engine, never the reverse. Hosts run processors with no editor open constantly.',
      },
      {
        type: 'fill', concept: 'juce-basics',
        prompt: 'Give the editor sight of the engine.',
        code: '// PluginEditor.h\n#pragma once\n#include "___"',
        accept: ['PluginProcessor.h'],
        placeholder: 'header',
        hint: 'The engine\'s panel file, in quotes.',
        explain: 'The editor includes the processor\'s header. Zone 1\'s quotes-for-your-own-headers rule, in its natural habitat.',
      },
    ],
    recap: [
      'Five files: Processor .h/.cpp, Editor .h/.cpp, CMakeLists.txt.',
      'build/ is generated — never edit, never commit.',
      'Editor includes processor; never the reverse.',
      'The engine must work with no editor at all.',
    ],
    inside: [
      { name: 'First Signal', use: 'exactly these five files — nothing more' },
      { name: 'Every JUCE repo', use: 'the same map, sometimes with dsp/ and ui/ folders added' },
    ],
    analogyPanel: 'The processor is the rack unit; the editor is a remote control for it. You can unplug the remote any time — the rack keeps playing.',
    beginnerMistake: 'Editing or committing files inside build/. It\'s machine output — regenerating erases your changes. Source lives in Source/; the recipe lives in CMakeLists.txt.',
    remember: 'Engine, panel, recipe — and the editor looks at the engine, never the reverse.',
    builds: ['header-file', 'source-file', 'cmake'],
    leads: ['audioprocessor', 'audioprocessoreditor'],
  },

  /* ------------------------------------------------------ J3 */
  {
    id: 'j3', kind: 'lesson', title: 'Plugin Formats, Honestly', short: 'VST3, AU, AAX, standalone',
    concepts: ['formats'], time: '~5 MIN', diff: 1,
    hook: 'One codebase, many doorways: the same First Signal source can enter Ableton as a VST3, Logic as an AU, and your desktop as its own app. But not every doorway exists on every platform — and pretending otherwise ships broken promises.',
    objective: 'Know which formats exist, where each one works, and which ones First Signal will target.',
    sections: [
      {
        h: 'The doorways',
        body: '**VST3** — Steinberg\'s format: the standard on Windows, widely supported everywhere except Apple\'s own DAWs. **AU** (Audio Units) — Apple\'s format: what Logic and GarageBand load; **macOS only**. **AUv3** — the sandboxed, App Store generation (iOS/iPadOS and mac). **AAX** — Pro Tools only, requiring Avid\'s SDK and signing. **Standalone** — your plugin as its own app, no DAW needed: the fastest way to test.',
      },
      {
        h: 'What First Signal targets',
        body: 'One line in CMake decides: `FORMATS VST3 Standalone` (plus `AU` when building on a Mac — CMake simply skips formats a platform can\'t build). JUCE compiles your one AudioProcessor into each wrapper. AAX stays out of scope: its SDK and signing process are something to deal with when you ship, not when you\'re building your first plugin.',
        code: 'juce_add_plugin(FirstSignal\n    FORMATS VST3 Standalone   # add AU on macOS\n    ...)',
        codeTitle: 'formats, chosen in one line',
      },
    ],
    checks: [
      {
        type: 'match', concept: 'formats',
        prompt: 'Match the format to its home.',
        left: ['VST3', 'AU', 'AAX', 'Standalone'],
        right: ['Windows standard, wide support elsewhere', 'Logic & GarageBand — macOS only', 'Pro Tools only, Avid SDK + signing', 'your plugin as its own app'],
        explain: 'Same source, different doorways — and each doorway has a landlord. Knowing whose is whose prevents impossible promises.',
      },
      {
        type: 'mcq', concept: 'formats',
        prompt: 'Why build the Standalone format at all?',
        options: [
          { t: 'It\'s the fastest test loop: run your plugin as an app, no DAW scan needed', why: '' },
          { t: 'DAWs require a standalone to exist', why: 'Hosts only care about their own format — standalone is purely for you (and users without a DAW).' },
          { t: 'It sounds better', why: 'Identical audio code — the wrapper differs, the sound doesn\'t.' },
          { t: 'It\'s required for VST3 to work', why: 'Formats are independent doorways into the same engine.' },
        ],
        answer: 0,
        explain: 'Build → double-click → hear it. No scanning, no host quirks. Testing in standalone first is the working rhythm you\'ll use from Mission 3 on.',
      },
      {
        type: 'mcq', concept: 'formats',
        prompt: 'You\'re on Windows. Which format list can your machine actually build?',
        options: [
          { t: 'VST3 and Standalone — AU is macOS-only', why: '' },
          { t: 'All formats everywhere', why: 'AU requires Apple\'s frameworks; AAX requires Avid\'s SDK. Platforms and licenses are real constraints.' },
          { t: 'Only VST3', why: 'Standalone builds fine on Windows too — it\'s just an app.' },
          { t: 'None without a license fee', why: 'VST3 and standalone builds are free (VST3 under Steinberg\'s dual license, GPL/proprietary via agreement). AAX is the gated one.' },
        ],
        answer: 0,
        explain: 'AU needs macOS frameworks; AAX needs Avid\'s SDK and signing. Listing a format in CMake that the platform can\'t build is simply skipped — but promising it to users is another matter.',
      },
    ],
    recap: [
      'VST3: Windows standard, broad support. AU: Apple DAWs, macOS.',
      'AUv3: App Store / mobile. AAX: Pro Tools, gated by Avid.',
      'Standalone = your plugin as an app: the fast test loop.',
      'One FORMATS line in CMake; platforms build what they can.',
    ],
    inside: [
      { name: 'First Signal', use: 'FORMATS VST3 Standalone (+ AU on a Mac)' },
      { name: 'Shipping', use: 'commercial releases add AU + AAX with proper signing' },
    ],
    analogyPanel: 'Formats are connector standards: the same synth with XLR, jack and USB outputs. You don\'t solder three synths — one engine, several output stages.',
    beginnerMistake: 'Assuming every format works everywhere. AU on Windows doesn\'t exist; AAX without Avid\'s blessing doesn\'t ship. Honest format lists save support tickets.',
    remember: 'One engine, many doorways — and each doorway has a landlord.',
    builds: ['vst3', 'au', 'aax', 'plugin'],
    leads: ['cmake', 'host'],
  },

  /* ------------------------------------------------------ J4 */
  {
    id: 'j4', kind: 'lesson', title: 'AudioProcessor: The Engine', short: 'Your plugin\'s core class',
    concepts: ['processor'], time: '~7 MIN', diff: 2,
    hook: 'Here it is — the class your entire plugin IS. The host constructs it, owns it, and speaks to it only through methods you override. Zone 2\'s Synth Skeleton was secretly a rehearsal for this exact moment.',
    objective: 'Read First Signal\'s processor declaration and know who owns it, who calls it, and why it must never depend on its editor.',
    sections: [
      {
        h: 'Inheriting the engine',
        body: 'Your plugin is a class **inheriting** `juce::AudioProcessor` — it *is-a* processor, and fills in the framework\'s blanks. The **host owns the object**: it constructs your processor when the user loads the plugin, calls its methods on its schedule, and destroys it on removal. You never write `main()` — you are the guest, not the program.',
        code: '// PluginProcessor.h  (First Signal, v1)\n#pragma once\n#include <juce_audio_processors/juce_audio_processors.h>\n\nclass FirstSignalProcessor : public juce::AudioProcessor\n{\npublic:\n    FirstSignalProcessor();\n    void prepareToPlay(double sampleRate, int samplesPerBlock) override;\n    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;\n    void releaseResources() override;\n    juce::AudioProcessorEditor* createEditor() override;\n    bool hasEditor() const override { return true; }\n    // ...plus the remaining required overrides\n    //    (name, programs, state, midi flags)\n};',
        codeTitle: 'First Signal\'s engine, declared',
        breakdown: [
          [': public juce::AudioProcessor', 'inherit the engine contract — your class IS a processor'],
          ['override', 'each method fills a blank the host will call'],
          ['processBlock(...)', 'the audio callback — Zone 2\'s deadline lives here'],
          ['createEditor()', 'the host asks for a panel; the engine never needs one'],
        ],
      },
      {
        h: 'Independent of its panel',
        body: 'The processor also declares the audio doors — stereo in, stereo out for First Signal — and owns all state: parameters, smoothers, DSP. What it must never do: reference the editor. Hosts render entire sessions with every window closed; an engine that leans on its panel silences itself.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'processor',
        prompt: 'Who constructs and owns your AudioProcessor object?',
        options: [
          { t: 'The host — it creates one per loaded instance and destroys it on removal', why: '' },
          { t: 'You, in main()', why: 'Plugins have no main() — the host is the program; your processor is its guest.' },
          { t: 'The editor', why: 'Backwards: the *processor* outlives and never depends on the editor.' },
          { t: 'JUCE, once, globally', why: 'Load First Signal on eight tracks: eight independent processor objects — Zone 1\'s class/object lesson at work.' },
        ],
        answer: 0,
        explain: 'Host constructs, host calls, host destroys. Eight tracks = eight instances, each with its own members — which is why state lives in members, never globals.',
      },
      {
        type: 'fill', concept: 'processor',
        prompt: 'Declare the inheritance: First Signal IS a JUCE processor.',
        code: 'class FirstSignalProcessor : public ___\n{\n    // ...\n};',
        accept: ['juce::AudioProcessor'],
        placeholder: 'base class',
        hint: 'namespace::EngineClass.',
        mistakes: [
          { match: '^AudioProcessor$', msg: 'Close — but JUCE types need their namespace: juce::AudioProcessor.' },
        ],
        explain: '`: public juce::AudioProcessor` — the inheritance that turns your class into something every DAW knows how to talk to.',
      },
      {
        type: 'mcq', concept: 'processor',
        prompt: 'Why must the processor never depend on the editor?',
        options: [
          { t: 'Hosts run audio with editors closed (or never created) — the engine must work headless', why: '' },
          { t: 'Editors are too slow to link against', why: 'It\'s not performance — it\'s lifetime: the editor may simply not exist.' },
          { t: 'It\'s only a style preference', why: 'It\'s structural: renderers, headless hosts and closed windows are everyday reality.' },
          { t: 'The compiler forbids it', why: 'It compiles fine — and crashes or silences the plugin in real sessions. Discipline, not syntax.' },
        ],
        answer: 0,
        explain: 'The panel is optional; the engine is not. Every architecture decision in this zone flows downhill from this one fact.',
      },
    ],
    recap: [
      'Your plugin = a class inheriting juce::AudioProcessor.',
      'The host owns it: constructs, calls, destroys.',
      'Multiple instances = multiple objects, independent state.',
      'The engine never references its editor.',
    ],
    inside: [
      { name: 'First Signal', use: 'FirstSignalProcessor — the class the rest of the zone completes' },
      { name: 'Every plugin', use: 'same inheritance, same contract, any complexity' },
    ],
    analogyPanel: 'The processor is a rack unit installed in the venue\'s system: the house engineer (host) powers it, routes it and strikes it. It plays whether or not anyone is looking at its front panel.',
    beginnerMistake: 'Storing audio state in the editor "because that\'s where the knob is." The knob is a remote control; the state lives in the engine — always.',
    remember: 'The host owns the engine; the engine owns the state; the editor just visits.',
    builds: ['audioprocessor', 'class', 'host'],
    leads: ['audioprocessoreditor', 'preparetoplay'],
  },

  /* ------------------------------------------------------ J5 */
  {
    id: 'j5', kind: 'lesson', title: 'The Plugin Lifecycle', short: 'Scan to destruction',
    concepts: ['lifecycle'], time: '~7 MIN', diff: 2,
    hook: 'From the moment a DAW boots to the moment a session closes, your plugin lives a precise, host-scripted life. Learn the script once and every mysterious bug gets an address: "which lifecycle stage broke?"',
    objective: 'Follow every call the host makes, in order — and know what your code must do at each stage.',
    sections: [
      {
        h: 'The script',
        body: '**Scan**: the DAW finds your binary and briefly interrogates it. **Construct**: user loads it → your constructor runs (Zone 2: power on valid). **prepareToPlay(sampleRate, maxBlockSize)**: allocate and reset. **processBlock(...)**: called repeatedly, on the audio thread, until playback stops. **releaseResources()**: teardown of heavy scratch state. **Destruction**: instance removed. prepare/release can cycle *many times* — sample-rate changes, device switches.',
        viz: { t: 'lifecycle' },
      },
      {
        h: 'The side quests',
        body: 'Alongside the audio spine: **createEditor()** whenever the user opens your window (and the editor dies when they close it — the engine plays on); **getStateInformation() / setStateInformation()** when the host saves or loads the session — your settings ride inside the user\'s project file. Miss those two and every session reopens with a factory-reset plugin.',
      },
    ],
    checks: [
      {
        type: 'order', concept: 'lifecycle',
        prompt: 'Arrange the audio spine of the lifecycle, first event on top.',
        lines: [
          'host scans and finds the binary',
          'constructor runs (instance created)',
          'prepareToPlay(sampleRate, maxBlockSize)',
          'processBlock(...) — repeatedly',
          'releaseResources()',
          'destructor runs (instance removed)',
        ],
        explain: 'Scan → construct → prepare → process → release → destroy. Editors and state calls weave in and out, but this spine never reorders.',
      },
      {
        type: 'mcq', concept: 'lifecycle',
        prompt: 'The user closes your plugin\'s window mid-playback. What happens?',
        options: [
          { t: 'The editor is destroyed; the processor keeps making sound untouched', why: '' },
          { t: 'Audio stops until the window reopens', why: 'That would make mixing impossible — engines run headless as a matter of course.' },
          { t: 'The processor is destroyed too', why: 'Only removal from the track destroys the processor. The window is a visitor.' },
          { t: 'The plugin saves state and unloads', why: 'State saves happen on host save — closing a window is just closing a window.' },
        ],
        answer: 0,
        explain: 'Editor lifetime ⊂ processor lifetime, strictly. Every session has closed windows over playing plugins — this is the rule that makes j4\'s independence law non-negotiable.',
      },
      {
        type: 'mcq', concept: 'lifecycle',
        prompt: 'How many times can prepareToPlay run over one plugin instance\'s life?',
        options: [
          { t: 'Many — sample-rate changes, device switches, transport restarts can each re-trigger it', why: '' },
          { t: 'Exactly once', why: 'Assuming once is a classic bug: change the buffer size in preferences and watch a once-only prepare fall over.' },
          { t: 'Once per block', why: 'That\'s processBlock. Prepare runs at configuration changes, not per block.' },
          { t: 'Only if the plugin requests it', why: 'The host decides — your job is to make prepare safely re-runnable.' },
        ],
        answer: 0,
        explain: 'Write prepareToPlay as "reset the world to a valid state for THIS rate and size" — idempotent, safe to allocate in, callable forever.',
      },
    ],
    recap: [
      'Spine: scan → construct → prepare → process → release → destroy.',
      'prepare/release can cycle many times per instance.',
      'Editors are created/destroyed freely; the engine plays on.',
      'get/setStateInformation carry your settings inside the session.',
    ],
    inside: [
      { name: 'First Signal', use: 'each stage becomes real code across this zone' },
      { name: 'Debugging', use: '"which stage broke?" is the first diagnostic question' },
    ],
    analogyPanel: 'A touring rig\'s day: load-in (construct), soundcheck (prepare), the show (process, song after song), strike (release), truck (destroy) — and the tour manager\'s notebook (state) remembers every setting for the next city.',
    beginnerMistake: 'Doing setup work in the constructor that needs the sample rate. The constructor doesn\'t know it yet — the rate arrives at prepareToPlay. Construct valid; configure in prepare.',
    remember: 'The host runs the script; your overrides play the parts. Prepare can always run again.',
    builds: ['preparetoplay', 'releaseresources', 'constructor'],
    leads: ['processblock', 'preset'],
  },

  /* ------------------------------------------------------ J6 */
  {
    id: 'j6', kind: 'lesson', title: 'prepareToPlay: Soundcheck', short: 'Setup before audio',
    concepts: ['lifecycle'], time: '~6 MIN', diff: 2,
    hook: 'Two numbers arrive backstage before every show: the sample rate and the biggest block you\'ll ever be handed. Everything your plugin will need on stage gets built from those two numbers, right here, right now.',
    objective: 'Implement First Signal\'s prepareToPlay: size what allocates, reset what remembers, assume nothing about block sizes.',
    sections: [
      {
        h: 'Two numbers, all your setup',
        body: 'The host passes `sampleRate` (converts time↔samples: Zone 2\'s delay-line math) and `samplesPerBlock` — the **maximum** block size, not a promise. Real blocks vary, and can be *smaller* at any moment. Here — and only here on the audio path — allocation is legal: size vectors, build tables, prepare smoothers.',
        code: 'void FirstSignalProcessor::prepareToPlay(\n        double sampleRate, int samplesPerBlock)\n{\n    gainSmoothed.reset(sampleRate, 0.05); // 50 ms glide\n    gainSmoothed.setCurrentAndTargetValue(1.0f);\n}',
        codeTitle: 'First Signal\'s soundcheck',
        breakdown: [
          ['sampleRate', 'time↔samples conversion for everything downstream'],
          ['samplesPerBlock', 'the MAXIMUM you\'ll see — real blocks vary'],
          ['gainSmoothed.reset(rate, 0.05)', 'teach the smoother the rate: 50 ms of glide'],
          ['setCurrentAndTargetValue', 'start settled — no gliding up from zero on first play'],
        ],
      },
      {
        h: 'Reset what remembers',
        body: 'Prepare also **resets state**: phases to 0, delay lines to silence, envelopes to idle. Why? Prepare re-runs — after a rate change, a stale delay line holds audio at the *wrong rate*. The mantra: *size for the maximum, reset to silence, assume nothing.*',
        mistake: { code: 'jassert(numSamples == samplesPerBlock); // ✗ fires constantly\n// hosts send SMALLER blocks whenever they like', text: 'samplesPerBlock is a ceiling, not a constant. Loops read the real count from the buffer, every block.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'lifecycle',
        prompt: 'What does the samplesPerBlock argument actually promise?',
        options: [
          { t: 'An upper bound — real blocks can be smaller at any time', why: '' },
          { t: 'The exact size of every block', why: 'Hosts routinely send short blocks (loop points, automation edges, plugin deltas). Fixed-size assumptions are a classic crash.' },
          { t: 'The minimum block size', why: 'It\'s the ceiling, not the floor.' },
          { t: 'Nothing — it\'s deprecated', why: 'It\'s essential: it\'s what you size worst-case scratch buffers from.' },
        ],
        answer: 0,
        explain: 'Size buffers for it; never loop by it. The real count comes from buffer.getNumSamples() each block.',
      },
      {
        type: 'fill', concept: 'lifecycle',
        prompt: 'Teach the gain smoother the session\'s rate — 50 milliseconds of glide.',
        code: 'void prepareToPlay(double sampleRate, int samplesPerBlock)\n{\n    gainSmoothed.___(sampleRate, 0.05);\n}',
        accept: ['reset'],
        placeholder: 'method',
        hint: 'The smoother\'s own soundcheck call.',
        explain: 'SmoothedValue::reset(sampleRate, seconds) converts your ramp time into per-sample steps. A never-reset smoother has no ramp at all — values snap instantly and the clicks come back.',
      },
      {
        type: 'mcq', concept: 'lifecycle',
        prompt: 'The user switches the session from 44.1k to 96k. Your delay line still holds old audio. Why must prepare reset it?',
        options: [
          { t: 'The stored samples were recorded at the old rate — played back now, they\'re at the wrong pitch/time', why: '' },
          { t: 'Old samples corrupt memory', why: 'Memory is fine — the *meaning* of the samples changed with the rate.' },
          { t: 'JUCE requires empty buffers', why: 'JUCE doesn\'t check — physics does. Rate changes invalidate time-based state.' },
          { t: 'No reason — keeping it is fine', why: 'A 500 ms echo becomes a 230 ms chipmunk echo. Reset to silence.' },
        ],
        answer: 0,
        explain: 'Time-based state is rate-relative. Prepare = "make everything valid for THIS rate": resize, recompute, and clear what remembers.',
      },
    ],
    recap: [
      'Two gifts: sampleRate, and samplesPerBlock (a maximum!).',
      'Allocate and prepare smoothers here — the sanctioned spot.',
      'Reset phases, lines and envelopes: prepare re-runs.',
      'Never assume fixed block sizes anywhere.',
    ],
    inside: [
      { name: 'First Signal', use: 'one smoother reset — small plugin, same discipline' },
      { name: 'Delay/Reverb', use: 'lines resized to rate × max-time, cleared to silence' },
    ],
    analogyPanel: 'Soundcheck: you learn the room (rate), the largest song in the set (max block), then tune, patch and zero the desk. When doors open, everything is already true.',
    beginnerMistake: 'Preparing once and assuming forever. Rates change, devices change, hosts re-prepare — write it to be safely run a hundred times.',
    remember: 'Size for the maximum, reset to silence, assume nothing.',
    builds: ['preparetoplay', 'sample-rate', 'allocation'],
    leads: ['processblock', 'parameter-smoothing'],
  },

  /* ------------------------------------------------------ J7 */
  {
    id: 'j7', kind: 'lesson', title: 'processBlock: The Show', short: 'The real audio callback',
    concepts: ['processblock'], time: '~7 MIN', diff: 2,
    hook: 'Every rule you\'ve learned since Zone 1 was preparation for this method. The host hands you audio and MIDI, starts the clock, and expects the block back before the deadline — hundreds of times a second, on the audio thread, forever.',
    objective: 'Implement First Signal\'s processBlock: in-place processing under the full real-time contract.',
    sections: [
      {
        h: 'The signature, for real',
        body: 'Two arguments: the **AudioBuffer** (this block\'s samples, all channels — you process it *in place*) and the **MidiBuffer** (this block\'s events). First Signal\'s complete v1:',
        code: 'void FirstSignalProcessor::processBlock(\n        juce::AudioBuffer<float>& buffer,\n        juce::MidiBuffer& midi)\n{\n    juce::ScopedNoDenormals noDenormals;\n\n    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n    {\n        float* data = buffer.getWritePointer(ch);\n        for (int i = 0; i < buffer.getNumSamples(); ++i)\n            data[i] *= 0.5f;          // v1: fixed -6 dB\n    }\n}',
        codeTitle: 'First Signal v1 — it makes sound quieter!',
        breakdown: [
          ['AudioBuffer<float>&', 'the block, by reference — you edit the host\'s actual audio'],
          ['ScopedNoDenormals', 'RAII guard flushing denormals for this scope (Zone 2, twice over)'],
          ['getWritePointer(ch)', 'a float* into one channel — Zone 1\'s pointer, employed'],
          ['getNumSamples()', 'the REAL count this block — never samplesPerBlock'],
        ],
      },
      {
        h: 'The contract, consolidated',
        body: 'Audio thread. Hard deadline. Therefore — the complete list, now with a home: **no allocation, no locks, no file access, no logging, no throwing, no UI calls.** Parameters arrive by atomic (Zone 2\'s bridge — formalized next lessons). Everything the block needs must already exist. This is the exam Zone 2 was studying for.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'processblock',
        prompt: 'Which thread calls processBlock, and what does that imply?',
        options: [
          { t: 'The audio thread — so only bounded, non-blocking work is legal inside', why: '' },
          { t: 'The UI thread — so repainting there is fine', why: 'Never — the editor\'s thread and this one are the two lanes from Zone 2\'s race lesson.' },
          { t: 'A new thread each call', why: 'One real-time thread calls it serially, block after block.' },
          { t: 'Whatever thread is free', why: 'Hosts dedicate a high-priority audio thread — that\'s what makes the deadline enforceable.' },
        ],
        answer: 0,
        explain: 'processBlock IS Zone 2\'s audio callback with its real name. Same deadline, same rules, no exceptions — literally.',
      },
      {
        type: 'fill', concept: 'processblock',
        prompt: 'Loop over the block\'s true length — the count that\'s actually in the buffer.',
        code: 'for (int i = 0; i < buffer.___(); ++i)\n    data[i] *= 0.5f;',
        accept: ['getNumSamples'],
        placeholder: 'method',
        hint: 'Ask the buffer, not prepareToPlay.',
        mistakes: [
          { match: 'samplesPerBlock', msg: 'That was the *maximum*, captured at prepare. This block\'s real size lives in the buffer: getNumSamples().' },
        ],
        explain: 'buffer.getNumSamples() — per block, every block. The fixed-size assumption bug dies here.',
      },
      {
        type: 'bugspot', concept: 'processblock',
        prompt: 'One line breaks the contract. Tap it.',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer& midi)',
          '{',
          '    auto preset = loadPresetFromDisk("warm.pst");',
          '    applyGain(buffer, currentGain);',
          '}',
        ],
        buggy: 3,
        explain: 'Disk access on the audio thread: unbounded, blocking, and guaranteed to glitch. Preset loads belong on the UI/background side, handed over lock-free (Zone 2\'s FIFO). The gain line? Perfectly legal.',
        fix: 'Load on the UI thread; hand results across via atomics/FIFO',
      },
    ],
    recap: [
      'processBlock(AudioBuffer&, MidiBuffer&) — in place, audio thread.',
      'ScopedNoDenormals guards the scope, RAII-style.',
      'Loop by getNumSamples(), never samplesPerBlock.',
      'The full contract: no alloc/locks/files/logs/throws/UI.',
    ],
    inside: [
      { name: 'First Signal', use: 'v1 ships a fixed gain; the zone upgrades it to a real parameter' },
      { name: 'Every plugin ever', use: 'this signature, this contract, any DSP inside' },
    ],
    analogyPanel: 'The show itself: reels arrive on the conveyor, the deadline never blinks, and nobody restocks the warehouse mid-song. Everything you touch was placed backstage.',
    beginnerMistake: '"Just one quick file read / lock / print" inside processBlock. There is no quick on the deadline thread — there is only bounded and unbounded.',
    remember: 'processBlock is Zone 2\'s exam: bounded work on pre-built state, every block, forever.',
    builds: ['processblock', 'audio-thread', 'denormals'],
    leads: ['audio-buffer', 'midibuffer'],
  },

  /* ------------------------------------------------------ J8 */
  {
    id: 'j8', kind: 'lesson', title: 'AudioBuffer, Channel by Channel', short: 'The block, dissected',
    concepts: ['buffers'], time: '~6 MIN', diff: 2,
    hook: 'The buffer isn\'t one stream — it\'s a grid: channels down, samples across. Stereo at 512 samples is a 2×512 grid, handed to you whole. Most first-plugin bugs are grid bugs: wrong channel, wrong length, wrong assumption.',
    objective: 'Navigate AudioBuffer safely: channels vs samples, read vs write pointers, and the outputs you must clear.',
    sections: [
      {
        h: 'The grid',
        body: '`getNumChannels()` × `getNumSamples()` — that\'s the block. `getWritePointer(ch)` hands you a mutable float* into one channel row; `getReadPointer(ch)` a read-only one (const correctness, employed). Channel counts follow the *track*, not your assumptions: mono tracks send one channel.',
        viz: { t: 'audioGrid' },
        code: 'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n{\n    float* data = buffer.getWritePointer(ch);\n    for (int i = 0; i < buffer.getNumSamples(); ++i)\n        data[i] *= gain;\n}\n// or, the built-in for exactly this job:\nbuffer.applyGain(gain);',
        codeTitle: 'walking the grid — and the shortcut',
      },
      {
        h: 'Clear what you don\'t fill',
        body: 'Hosts can hand you **more output channels than inputs** (mono→stereo insert). Unwritten output channels contain *whatever was left in memory* — garbage that plays as noise. The standard prologue clears them:',
        code: 'for (int ch = getTotalNumInputChannels();\n         ch < getTotalNumOutputChannels(); ++ch)\n    buffer.clear(ch, 0, buffer.getNumSamples());',
        codeTitle: 'the standard prologue',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'buffers',
        prompt: 'A stereo block of 512 samples. What is buffer\'s shape?',
        options: [
          { t: '2 channels × 512 samples — two rows of floats', why: '' },
          { t: '1024 interleaved samples in one row', why: 'JUCE buffers are per-channel (planar): one contiguous float row per channel — cache-friendly, Zone 2 style.' },
          { t: '512 channels × 2 samples', why: 'Channels down, samples across — two rows, 512 long.' },
          { t: 'It depends on the DAW', why: 'The AudioBuffer layout is JUCE\'s own, host-independent: always planar rows.' },
        ],
        answer: 0,
        explain: 'Planar rows: getWritePointer(0) is the left row, (1) the right. Each row is contiguous — the cache lesson made real.',
      },
      {
        type: 'fill', concept: 'buffers',
        prompt: 'Get a writable pointer into channel ch.',
        code: 'float* data = buffer.___(ch);',
        accept: ['getWritePointer'],
        placeholder: 'method',
        hint: 'Write access to one channel row.',
        mistakes: [
          { match: '^getReadPointer$', msg: 'That\'s the const, read-only row — fine for metering. To *change* samples: getWritePointer.' },
        ],
        explain: 'getWritePointer(ch): a raw float* into the host\'s actual audio for that channel. Read-only paths take getReadPointer — say what you mean.',
      },
      {
        type: 'bugspot', concept: 'buffers',
        prompt: 'This works on stereo tracks and crashes on mono ones. Tap why.',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    float* left  = buffer.getWritePointer(0);',
          '    float* right = buffer.getWritePointer(1);',
          '    applyGain(left, right, buffer.getNumSamples());',
          '}',
        ],
        buggy: 4,
        explain: 'On a mono track there IS no channel 1 — getWritePointer(1) indexes a nonexistent row: out-of-bounds, undefined behavior, host crash. Loop over getNumChannels() and let the count be whatever it is.',
        fix: 'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
      },
    ],
    recap: [
      'The block is a grid: channels × samples, planar rows.',
      'getWritePointer to change; getReadPointer to inspect.',
      'applyGain() exists for the everyday case.',
      'Clear output channels you didn\'t write — or they play garbage.',
    ],
    inside: [
      { name: 'First Signal', use: 'the channel loop + clear prologue = its whole DSP' },
      { name: 'Meters', use: 'getReadPointer + getMagnitude on the read-only path' },
    ],
    analogyPanel: 'A multitrack tape frame: channels are the lanes, samples the inches. You process lane by lane — and blank the lanes you didn\'t record, or the tape plays whatever was on it before.',
    beginnerMistake: 'Hard-coding channels 0 and 1. Mono tracks, surround buses and instrument-only outputs all exist. The buffer tells you its shape — believe it.',
    remember: 'Ask the buffer its shape every block: channels, samples, and clear the rest.',
    builds: ['audio-buffer', 'pointer', 'const'],
    leads: ['midibuffer', 'dsp'],
  },

  /* ------------------------------------------------------ J9 */
  {
    id: 'j9', kind: 'lesson', title: 'MIDI in the Block', short: 'MidiBuffer, previewed',
    concepts: ['midi-io'], time: '~5 MIN', diff: 2,
    hook: 'That second argument you\'ve been ignoring? It\'s the piano roll, delivered: every note-on, note-off and knob twist that lands inside this block, stamped to the sample. Zone 5 builds the synth — today you learn to read the mail.',
    objective: 'Know what a MidiBuffer carries, how events sit at sample positions inside the block, and what a synth will eventually do with them.',
    sections: [
      {
        h: 'Events, stamped to samples',
        body: 'A **MidiBuffer** holds this block\'s MIDI events — each with a **sample position**: "note-on for C4 at sample 137 of this block." Iterating is plain modern C++ (range-for, Zone 2):',
        code: 'for (const auto metadata : midi)\n{\n    auto msg = metadata.getMessage();\n    int  at  = metadata.samplePosition;   // 0..numSamples-1\n\n    if (msg.isNoteOn())\n        startVoice(msg.getNoteNumber(),\n                   msg.getVelocity(), at);\n}',
        codeTitle: 'reading the mail',
        breakdown: [
          ['for (const auto metadata : midi)', 'range-for over this block\'s events'],
          ['samplePosition', 'WHERE in the block it happens — sample-accurate'],
          ['isNoteOn()', 'the message asks itself what it is'],
          ['getNoteNumber(), getVelocity()', 'the dictionary\'s MIDI facts, live'],
        ],
      },
      {
        h: 'Why the position matters',
        body: 'A note-on at sample 137 means the voice starts *mid-block* — samples 0–136 render without it. Quantize every event to block starts and timing wobbles by up to a block (~10 ms at 512/48k): audibly sloppy. Effects like First Signal pass MIDI through untouched; instruments consume it. That\'s the whole Zone 5 preview.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'midi-io',
        prompt: 'What does a MidiBuffer contain?',
        options: [
          { t: 'This block\'s MIDI events, each stamped with a sample position', why: '' },
          { t: 'Audio rendered from MIDI', why: 'MIDI stays messages — turning them into audio is your synth\'s job (Zone 5).' },
          { t: 'The whole song\'s MIDI', why: 'Only this block\'s slice — the host feeds events block by block, like audio.' },
          { t: 'Only note-ons', why: 'Note-offs, CCs, pitch bend, program changes — the full mail, all stamped.' },
        ],
        answer: 0,
        explain: 'Events + positions, scoped to the block. The dictionary\'s MIDI messages, arriving through the same conveyor as audio.',
      },
      {
        type: 'predict', concept: 'midi-io',
        prompt: 'A note-on sits at samplePosition 137 in a 512-sample block. When should the voice start sounding?',
        code: '// block: samples 0..511\n// event: note-on at sample 137',
        options: [
          { t: 'At sample 137 — samples 0–136 render without it', why: '' },
          { t: 'At sample 0 of this block', why: 'That\'s block-quantizing: up to ~10 ms of timing slop that tight producers absolutely hear.' },
          { t: 'At the next block', why: 'Even worse — a full block late, every note.' },
          { t: 'Whenever is convenient', why: 'Sample-accurate handling is the difference between tight and mushy instruments.' },
        ],
        answer: 0,
        explain: 'Sample-accurate events: render up to the position, start the voice, render the rest. Zone 5 turns this sentence into a synth.',
      },
      {
        type: 'fill', concept: 'midi-io',
        prompt: 'Ask the message whether it starts a note.',
        code: 'if (msg.___())\n    startVoice(msg.getNoteNumber(), msg.getVelocity(), at);',
        accept: ['isNoteOn', 'isNoteOn()'],
        placeholder: 'method',
        hint: 'The message classifies itself.',
        explain: 'isNoteOn() — with isNoteOff(), isController(), isPitchWheel() beside it. The MidiMessage class answers so you don\'t parse bytes.',
      },
    ],
    recap: [
      'MidiBuffer = this block\'s events, sample-stamped.',
      'Range-for iterates; messages classify themselves.',
      'Positions make instruments tight; quantizing makes them mushy.',
      'Effects pass MIDI through; synths consume it (Zone 5).',
    ],
    inside: [
      { name: 'First Signal', use: 'ignores midi — an honest gain plugin' },
      { name: 'Zone 5 synth', use: 'this exact loop feeds the voice allocator you built in p3' },
    ],
    analogyPanel: 'The block is a bar of the song; MIDI events are cue marks written at exact beats within it. A good player hits the cue mid-bar — not at the next barline.',
    beginnerMistake: 'Handling all MIDI at the top of the block "to keep it simple." That bakes in timing error of up to a full block. Read positions now, even before you need them.',
    remember: 'MIDI arrives as sample-stamped mail — deliver each event at its exact sample.',
    builds: ['midi', 'velocity', 'block'],
    leads: ['voice', 'polyphony'],
  },
];
