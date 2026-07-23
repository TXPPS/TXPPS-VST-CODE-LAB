/* ============================================================
   ZONE 3 — challenges (incl. 'reading' ctype), missions, boss.
   ============================================================ */

const ZONE3_CHALLENGES = [

  /* ============ READING THE SIGNAL PATH ============ */
  {
    id: 'jr1', kind: 'challenge', ctype: 'reading', title: 'Read: PluginProcessor.h', short: 'Trace the code',
    concepts: ['processor'],
    intro: 'A realistic processor header. Read it like a session engineer reads a patch sheet: who owns what, who calls what, which thread.',
    questions: [
      {
        type: 'match', concept: 'processor',
        prompt: 'Match each member to its truth.',
        left: ['processBlock(...)', 'apvts member', 'createEditor()', 'gainSmoothed member'],
        right: ['host calls it, audio thread', 'the engine owns the parameter brain', 'host calls it when the window opens', 'engine-owned DSP state'],
        explain: 'The host calls the overrides; the engine owns the members. Two facts that decode any processor header.',
      },
      {
        type: 'mcq', concept: 'processor',
        prompt: 'In this header, which code runs on the audio thread?',
        code: 'class FirstSignalProcessor : public juce::AudioProcessor {\npublic:\n    void prepareToPlay(double, int) override;\n    void processBlock(juce::AudioBuffer<float>&,\n                      juce::MidiBuffer&) override;\n    juce::AudioProcessorEditor* createEditor() override;\nprivate:\n    juce::AudioProcessorValueTreeState apvts;\n};',
        options: [
          { t: 'Only processBlock runs on the audio thread', why: '' },
          { t: 'All of it', why: 'prepare and createEditor aren\'t audio-thread calls — only processBlock lives on the deadline.' },
          { t: 'createEditor', why: 'Editors are pure message-thread citizens.' },
          { t: 'None — headers don\'t run', why: 'Fair pedantry! But the question is where these *methods* run when called — and processBlock is the audio-thread one.' },
        ],
        answer: 0,
        explain: 'One method on the deadline, everything else off it. Reading a header and instantly sorting methods by thread is the Zone 3 superpower.',
      },
    ],
  },
  {
    id: 'jr2', kind: 'challenge', ctype: 'reading', title: 'Read: The Parameter Layout', short: 'Trace the code',
    concepts: ['apvts'],
    intro: 'A layout function from a real processor. Find where the knob is born and what each argument commits to.',
    questions: [
      {
        type: 'mcq', concept: 'apvts',
        prompt: 'Where exactly is the Gain parameter created?',
        code: 'juce::AudioProcessorValueTreeState::ParameterLayout\ncreateParameterLayout()\n{\n    juce::AudioProcessorValueTreeState::ParameterLayout layout;\n    layout.add(std::make_unique<juce::AudioParameterFloat>(\n        juce::ParameterID { "gain", 1 }, "Gain",\n        juce::NormalisableRange<float>(-60.0f, 6.0f, 0.01f),\n        0.0f));\n    return layout;\n}',
        options: [
          { t: 'In createParameterLayout, once, before the APVTS is constructed with it', why: '' },
          { t: 'Every processBlock', why: 'Parameters are born once at construction — per-block creation would allocate on the deadline.' },
          { t: 'When the editor opens', why: 'Parameters exist editor-or-not; the slider merely attaches to one later.' },
          { t: 'In the host\'s code', why: 'The host *learns* about it from this layout — you author it here.' },
        ],
        answer: 0,
        explain: 'The layout runs once, feeding the APVTS constructor. From then on the parameter exists for the host, the atomics, and any future attachment.',
      },
      {
        type: 'match', concept: 'apvts',
        prompt: 'Match each argument to its commitment.',
        left: ['{ "gain", 1 }', '"Gain"', 'NormalisableRange(-60, 6, ...)', '0.0f'],
        right: ['permanent ID — sessions depend on it', 'display name — free to change', 'the 0–1 ↔ dB map', 'default: wakes at unity'],
        explain: 'One line, four commitments — only one of them is forever.',
      },
    ],
  },
  {
    id: 'jr3', kind: 'challenge', ctype: 'reading', title: 'Read: The Editor Pair', short: 'Trace the code',
    concepts: ['attachments'],
    intro: 'An editor header with one planted flaw and several truths. Read the lifetime story.',
    questions: [
      {
        type: 'mcq', concept: 'attachments',
        prompt: 'Which statement about this editor is TRUE?',
        code: 'class FirstSignalEditor : public juce::AudioProcessorEditor {\npublic:\n    explicit FirstSignalEditor(FirstSignalProcessor&);\n    void paint(juce::Graphics&) override;\n    void resized() override;\nprivate:\n    FirstSignalProcessor& processorRef;\n    juce::Slider gainSlider;\n    std::unique_ptr<SliderAttachment> gainAttachment;\n};',
        options: [
          { t: 'Closing the window destroys all of this; the processor keeps playing', why: '' },
          { t: 'processorRef owns the processor', why: 'A reference borrows — the host owns the processor. The editor is the guest here.' },
          { t: 'gainSlider runs on the audio thread', why: 'Sliders are Components: message-thread only, always.' },
          { t: 'The attachment order shown is a bug', why: 'Slider first, attachment after — this one is actually correct. (You fixed the reversed version in jb-land.)' },
        ],
        answer: 0,
        explain: 'Editor members live and die with the window; the engine plays on. Note the reference (borrow) vs the unique_ptr (own) — Zone 2 vocabulary telling the whole lifetime story in two declarations.',
      },
    ],
  },

  /* ============ COMPLETION ============ */
  {
    id: 'jc1', kind: 'challenge', ctype: 'completion', title: 'Complete: The Smoother\'s Soundcheck', short: 'Code completion',
    concepts: ['smoothing'],
    intro: 'A smoother that was never prepared has no ramp at all — values snap and click. Prepare it properly.',
    questions: [
      {
        type: 'fill', concept: 'smoothing',
        prompt: 'Give the smoother its 50 ms ramp, in this session\'s time.',
        code: 'void prepareToPlay(double sampleRate, int samplesPerBlock)\n{\n    gainSmoothed.reset(___, 0.05);\n    gainSmoothed.setCurrentAndTargetValue(1.0f);\n}',
        accept: ['sampleRate'],
        placeholder: 'argument',
        hint: 'Seconds only mean something once the rate is known.',
        explain: 'reset(sampleRate, seconds): now "0.05" is a real 50 ms at this session\'s rate. A smoother nobody prepared snaps instead of gliding — a boss-stage ghost you\'ve now pre-exorcised.',
      },
    ],
  },
  {
    id: 'jc2', kind: 'challenge', ctype: 'completion', title: 'Complete: Walk the Grid', short: 'Code completion',
    concepts: ['buffers'],
    intro: 'The channel loop of a real processBlock. One method name completes it.',
    questions: [
      {
        type: 'fill', concept: 'buffers',
        prompt: 'Loop over however many channels this block actually has.',
        code: 'for (int ch = 0; ch < buffer.___(); ++ch)\n{\n    float* data = buffer.getWritePointer(ch);\n    // ...\n}',
        accept: ['getNumChannels'],
        placeholder: 'method',
        hint: 'Ask the buffer its shape — rows first.',
        mistakes: [
          { match: '^getNumSamples$', msg: 'That\'s the row *length*. The outer loop wants the number of rows: getNumChannels().' },
        ],
        explain: 'getNumChannels() per block: mono sends 1, stereo 2, surround more. The buffer knows; assumptions crash.',
      },
    ],
  },
  {
    id: 'jc3', kind: 'challenge', ctype: 'completion', title: 'Complete: The Engine\'s Doorway', short: 'Code completion',
    concepts: ['apvts'],
    intro: 'The audio thread needs the gain parameter — through the sanctioned atomic doorway, cached once.',
    questions: [
      {
        type: 'fill', concept: 'apvts',
        prompt: 'Read this block\'s gain from the cached atomic pointer.',
        code: '// member: std::atomic<float>* gainParam = nullptr;\n// constructor: gainParam = apvts.getRawParameterValue("gain");\n\nvoid processBlock(...)\n{\n    float gainDb = gainParam->___();\n}',
        accept: ['load'],
        placeholder: 'method',
        hint: 'Zone 2\'s receiving half.',
        explain: 'Cached pointer + load() per block: no string lookups, no locks, no torn values. The complete professional read path.',
      },
    ],
  },
  {
    id: 'jc4', kind: 'challenge', ctype: 'completion', title: 'Complete: Make the Introduction', short: 'Code completion',
    concepts: ['attachments'],
    intro: 'Slider, meet parameter. One constructor call binds them for life.',
    questions: [
      {
        type: 'fill', concept: 'attachments',
        prompt: 'Build the attachment: brain, address, knob.',
        code: 'gainAttachment = std::make_unique<\n    juce::AudioProcessorValueTreeState::SliderAttachment>(\n        processorRef.___, "gain", gainSlider);',
        accept: ['apvts'],
        placeholder: 'member',
        hint: 'The parameter brain, reached through the processor reference.',
        explain: 'processorRef.apvts + "gain" + gainSlider: the two-way binding. Drag updates the host; automation moves the knob. Zero custom glue.',
      },
    ],
  },

  /* ============ BUG HUNTS ============ */
  {
    id: 'jb1', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Mono Crash', short: 'Find the bug',
    concepts: ['buffers'],
    intro: 'Works on every stereo track; crashes the DAW on a mono voice channel. Tap the assumption.',
    questions: [
      {
        type: 'bugspot', concept: 'buffers',
        prompt: 'One line indexes a channel that may not exist. Which?',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    float* left  = buffer.getWritePointer(0);',
          '    float* right = buffer.getWritePointer(1);',
          '    processStereo(left, right, buffer.getNumSamples());',
          '}',
        ],
        buggy: 4,
        explain: 'Channel 1 doesn\'t exist on a mono track — out-of-bounds row access, undefined behavior, host down. Loop getNumChannels() or branch on the count; never hard-code the grid\'s shape.',
        fix: 'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
      },
    ],
  },
  {
    id: 'jb2', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Deadline Logger', short: 'Find the bug',
    concepts: ['processblock'],
    intro: 'A "helpful" debugging habit is glitching the whole session. Tap the contraband.',
    questions: [
      {
        type: 'bugspot', concept: 'processblock',
        prompt: 'Which line breaks the real-time contract?',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    float g = gainParam->load();',
          '    juce::Logger::writeToLog("gain: " + juce::String(g));',
          '    buffer.applyGain(g);',
          '}',
        ],
        buggy: 4,
        explain: 'Logging is I/O — string building (which allocates!) plus a possibly-blocking write, on the deadline thread, hundreds of times a second. The atomic load above and applyGain below are model citizens. Meter through atomics; log from the message thread.',
        fix: 'Delete it — expose values via atomics for the editor to read',
      },
    ],
  },
  {
    id: 'jb3', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Engine in the Panel', short: 'Find the bug',
    concepts: ['editor'],
    intro: 'This plugin only makes the right sound while its window is open. Tap the architectural sin.',
    questions: [
      {
        type: 'bugspot', concept: 'editor',
        prompt: 'One declaration puts engine state in the wrong house. Which?',
        code: [
          'class FirstSignalEditor : public juce::AudioProcessorEditor',
          '{',
          'private:',
          '    juce::Slider gainSlider;',
          '    juce::SmoothedValue<float> gainSmoothed;',
          '    std::unique_ptr<SliderAttachment> gainAttachment;',
          '};',
        ],
        buggy: 4,
        explain: 'The gain smoother is DSP state — it belongs to the *processor*. Living in the editor, it dies when the window closes and never exists in headless hosts: the sound literally depends on a window. Engine state in the engine; the panel only displays.',
        fix: 'Move gainSmoothed into FirstSignalProcessor',
      },
    ],
  },
  {
    id: 'jb4', kind: 'challenge', ctype: 'bugfix', title: 'Bug Hunt: The Amnesiac Save', short: 'Find the bug',
    concepts: ['state'],
    intro: 'Sessions save fine — and always reopen at factory defaults. The save path works; tap what the load path forgot.',
    questions: [
      {
        type: 'bugspot', concept: 'state',
        prompt: 'One line inspects the restored tree and then… nothing. Which line is the dead end?',
        code: [
          'void setStateInformation(const void* data, int sizeInBytes)',
          '{',
          '    std::unique_ptr<juce::XmlElement> xml(',
          '        getXmlFromBinary(data, sizeInBytes));',
          '    if (xml != nullptr)',
          '        auto restored = juce::ValueTree::fromXml(*xml);',
          '}',
        ],
        buggy: 5,
        explain: 'The tree is parsed into a local… which dies at the semicolon (Zone 2 lifetime!). Nothing ever reaches the APVTS. The missing call: apvts.replaceState(restored) — parse, verify, *replace*.',
        fix: 'apvts.replaceState(juce::ValueTree::fromXml(*xml));',
      },
    ],
  },

  /* ============ SIMULATED COMPILER / BUILD ============ */
  {
    id: 'je1', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Unlinked Module', short: 'Read the error',
    concepts: ['build-system'],
    intro: 'The build dies on the very first file: JUCE headers can\'t be found. Decode the build error, pick the recipe fix.',
    questions: [
      {
        type: 'compiler', concept: 'build-system',
        prompt: 'What fixes this build?',
        code: '# CMakeLists.txt (excerpt)\ntarget_sources(FirstSignal PRIVATE\n    Source/PluginProcessor.cpp\n    Source/PluginEditor.cpp)\n# (no target_link_libraries line)',
        error: "PluginProcessor.h:2:10: fatal error:\njuce_audio_processors/juce_audio_processors.h:\nNo such file or directory\ncompilation terminated.",
        options: [
          { t: 'Add `target_link_libraries(FirstSignal PRIVATE juce::juce_audio_utils)`', why: '' },
          { t: 'Fix the #include path by hand', why: 'The path is right — linking a JUCE module is what *supplies* its include paths (and compiled code). No module link, no headers.' },
          { t: 'Rewrite the editor without JUCE classes', why: 'The classes are fine — the recipe just never granted the target their implementation.' },
          { t: 'Delete build/ and pray', why: 'A clean rebuild of an incomplete recipe fails identically. Fix the recipe.' },
        ],
        answer: 0,
        explain: 'Linking a JUCE module via target_link_libraries grants BOTH its include paths and its compiled code — omit it and the build fails at the very first #include. One recipe line, two gifts.',
      },
    ],
  },
  {
    id: 'je2', kind: 'challenge', ctype: 'compiler', title: 'Decode: The Override That Isn\'t', short: 'Read the error',
    concepts: ['editor'],
    intro: 'A one-letter slip means your paint function silently never runs — except the compiler catches it. Read why.',
    questions: [
      {
        type: 'compiler', concept: 'editor',
        prompt: 'What\'s the fix?',
        code: 'class FirstSignalEditor : public juce::AudioProcessorEditor\n{\npublic:\n    void paint(const juce::Graphics& g) override;  // note the const\n};',
        error: "PluginEditor.h:4:10: error: 'void FirstSignalEditor::paint(const juce::Graphics&)'\nmarked 'override', but does not override\nnote: candidate: 'virtual void juce::Component::paint(juce::Graphics&)'",
        options: [
          { t: 'Match the base exactly: `void paint(juce::Graphics&)` — drop the const', why: '' },
          { t: 'Remove the override keyword', why: 'That silences the error and ships the bug: a paint that never gets called. override is the tripwire *saving* you here.' },
          { t: 'Rename the function to Paint', why: 'The name is right — the parameter type (const Graphics& vs Graphics&) is the mismatch. Read the candidate note.' },
          { t: 'Add virtual instead', why: 'It\'s already virtual in the base — the fix is matching its signature, not re-declaring it.' },
        ],
        answer: 0,
        explain: '"marked override, but does not override" = your signature differs from the base\'s. The candidate note shows the real one: a non-const Graphics&. This is why override goes on everything — it turns silent never-called bugs into loud build errors.',
      },
    ],
  },

  /* ============ ORDERING ============ */
  {
    id: 'jo1', kind: 'challenge', ctype: 'ordering', title: 'Assemble: The Lifecycle', short: 'Order the sequence',
    concepts: ['lifecycle'],
    intro: 'The host\'s script for one plugin instance, shuffled. Restore the spine.',
    questions: [
      {
        type: 'order', concept: 'lifecycle',
        prompt: 'Arrange one instance\'s life, first event on top.',
        lines: [
          'constructor runs',
          'prepareToPlay(sampleRate, maxBlock)',
          'processBlock — repeatedly',
          'getStateInformation (host saves session)',
          'releaseResources()',
          'destructor runs',
        ],
        explain: 'Construct → prepare → process → (save rides along) → release → destroy. The spine every diagnostic conversation starts from.',
      },
    ],
  },

  /* ============ MISSIONS ============ */
  {
    id: 'p6', kind: 'project', title: 'Mission 1: The Empty Plugin Wakes Up', short: 'Zone mission',
    concepts: ['processor', 'lifecycle'],
    brief: 'First Signal exists as five nearly-empty files. Bring the processor to life: identify the map, follow the host\'s calls, and pass audio through safely — the moment a plugin first breathes.',
    steps: [
      {
        note: 'Step 1 — Orientation. You\'ve cloned the empty repo. Prove you know the map.',
        q: {
          type: 'match', concept: 'processor',
          prompt: 'Match each file to what Mission 1 will do with it.',
          left: ['PluginProcessor.cpp', 'PluginEditor.cpp', 'CMakeLists.txt', 'build/'],
          right: ['today\'s work: the engine breathes', 'untouched until Mission 2', 'already lists both .cpp files', 'will appear when we first configure'],
          explain: 'Mission 1 is engine-only. The panel waits; the recipe is ready; build/ doesn\'t exist yet.',
        },
      },
      {
        note: 'Step 2 — The host will construct your processor with stereo doors. Declare the inheritance.',
        q: {
          type: 'fill', concept: 'processor',
          prompt: 'Complete the class declaration.',
          code: 'class FirstSignalProcessor : public ___\n{\npublic:\n    FirstSignalProcessor();\n    // lifecycle overrides follow\n};',
          accept: ['juce::AudioProcessor'],
          placeholder: 'base',
          hint: 'The engine contract, namespaced.',
          explain: 'One inheritance and the host knows how to talk to you: construct, prepare, process, release — the whole j5 script.',
        },
      },
      {
        note: 'Step 3 — First Signal has no state that depends on the sample rate yet, but the prepare override must exist and be honest.',
        q: {
          type: 'mcq', concept: 'lifecycle',
          prompt: 'What belongs in an empty-but-correct prepareToPlay today?',
          options: [
            { t: 'Nothing yet — but the override exists, ready for the smoother in Mission 2', why: '' },
            { t: 'A jassert that block size never changes', why: 'j6\'s exact anti-lesson: samplesPerBlock is a ceiling, not a promise.' },
            { t: 'Creating the editor', why: 'The host asks for editors separately (createEditor) — prepare is audio setup only.' },
            { t: 'A file read to load defaults', why: 'Defaults are constructor/parameter territory. Prepare is for rate-dependent setup — and this plugin has none yet.' },
          ],
          answer: 0,
          explain: 'An honest empty prepare beats a busy wrong one. The slot exists; Mission 2 fills it with the smoother reset.',
        },
      },
      {
        note: 'Step 4 — The heart. Assemble the safe passthrough processBlock: clear unused outputs, touch nothing else.',
        q: {
          type: 'order', concept: 'processblock',
          prompt: 'Arrange the passthrough processBlock.',
          lines: [
            'void processBlock(juce::AudioBuffer<float>& buffer,',
            '                  juce::MidiBuffer&) {',
            '    juce::ScopedNoDenormals noDenormals;',
            '    for (int ch = getTotalNumInputChannels();',
            '             ch < getTotalNumOutputChannels(); ++ch)',
            '        buffer.clear(ch, 0, buffer.getNumSamples());',
            '}',
          ],
          explain: 'Signature → denormal guard → clear the outputs you didn\'t write → done. Input samples pass through untouched: a correct do-nothing plugin that can\'t leak stray noise — which is a real milestone.',
        },
      },
      {
        note: 'Step 5 — Wake-up review. One line snuck in from an old habit.',
        q: {
          type: 'bugspot', concept: 'processblock',
          prompt: 'This passthrough glitches under small host buffers. Tap the lie.',
          code: [
            'void processBlock(juce::AudioBuffer<float>& buffer,',
            '                  juce::MidiBuffer&)',
            '{',
            '    for (int i = 0; i < preparedBlockSize; ++i)',
            '        monitorLevel(buffer.getReadPointer(0)[i]);',
            '}',
          ],
          buggy: 3,
          explain: 'Looping by the prepared (maximum) size reads past the end of every smaller block the host sends — j6\'s warning made flesh. buffer.getNumSamples(), always. First Signal breathes — Mission 2 gives it a voice.',
          fix: 'for (int i = 0; i < buffer.getNumSamples(); ++i)',
        },
      },
    ],
  },
  {
    id: 'p7', kind: 'project', title: 'Mission 2: Wire the Control Room', short: 'Zone mission',
    concepts: ['apvts', 'attachments', 'smoothing'],
    brief: 'Give First Signal its knob: declare the gain parameter, build the APVTS, smooth the value, raise the editor, and attach the slider — then trace one drag all the way from finger to waveform.',
    steps: [
      {
        note: 'Step 1 — Declare the knob in the layout: permanent ID, honest dB range, transparent default.',
        q: {
          type: 'fill', concept: 'apvts',
          prompt: 'Complete the parameter: range −60 to +6 dB, default unity.',
          code: 'layout.add(std::make_unique<juce::AudioParameterFloat>(\n    juce::ParameterID { "gain", 1 }, "Gain",\n    juce::NormalisableRange<float>(-60.0f, 6.0f, 0.01f),\n    ___));',
          accept: ['0.0f', '0.f', '0.0F', '0.0', '0'],
          placeholder: 'default',
          hint: 'Unity, in dB.',
          explain: '0 dB default: insert the plugin, hear no change — the professional first impression. (Zone 1\'s dB landmarks, deciding a real API.)',
        },
      },
      {
        note: 'Step 2 — The engine\'s doorway: cache the atomic once, at construction.',
        q: {
          type: 'fill', concept: 'apvts',
          prompt: 'Cache the raw parameter pointer.',
          code: '// constructor body:\ngainParam = apvts.___("gain");',
          accept: ['getRawParameterValue'],
          placeholder: 'method',
          hint: 'Raw, atomic, cached once — never per block.',
          explain: 'One lookup at construction; load() forever after. The deadline thread never does string searches.',
        },
      },
      {
        note: 'Step 3 — De-click it. Assemble the smoothed DSP core.',
        q: {
          type: 'order', concept: 'smoothing',
          prompt: 'Arrange the per-block DSP, top to bottom.',
          lines: [
            'float db = gainParam->load();',
            'gainSmoothed.setTargetValue(',
            '    juce::Decibels::decibelsToGain(db));',
            'for (int i = 0; i < buffer.getNumSamples(); ++i) {',
            '    float g = gainSmoothed.getNextValue();',
            '    applyToAllChannels(buffer, i, g);',
            '}',
          ],
          explain: 'Load → convert → target → glide per sample. The complete professional parameter pipeline: atomic delivers, smoother walks, ears never notice the machinery.',
        },
      },
      {
        note: 'Step 4 — Raise the panel: the slider must actually appear.',
        q: {
          type: 'fill', concept: 'editor',
          prompt: 'Adopt and show the slider in the editor\'s constructor.',
          code: 'FirstSignalEditor::FirstSignalEditor(FirstSignalProcessor& p)\n    : AudioProcessorEditor(&p), processorRef(p)\n{\n    ___(gainSlider);\n    setSize(300, 200);\n}',
          accept: ['addAndMakeVisible'],
          placeholder: 'call',
          hint: 'Adopt AND show, one call.',
          explain: 'The most-forgotten line in first editors. Layout lands in resized(); existence starts here.',
        },
      },
      {
        note: 'Step 5 — The introduction: bind slider to parameter.',
        q: {
          type: 'fill', concept: 'attachments',
          prompt: 'Complete the attachment: brain, address, knob.',
          code: 'gainAttachment = std::make_unique<\n    juce::AudioProcessorValueTreeState::SliderAttachment>(\n        processorRef.apvts, "___", gainSlider);',
          accept: ['gain'],
          placeholder: 'ID',
          hint: 'The address carved in Step 1.',
          explain: 'Brain + address + knob. The slider now speaks host: automation, gestures, state — all free.',
        },
      },
      {
        note: 'Step 6 — Trace the full path. You drag the slider down 6 dB. Order the journey.',
        q: {
          type: 'order', concept: 'attachments',
          prompt: 'Arrange the value\'s journey, finger to waveform.',
          lines: [
            'slider drag (message thread)',
            'attachment updates the parameter in APVTS',
            'host records the gesture; atomic value updates',
            'audio thread load()s the new target',
            'smoother glides; samples scale',
          ],
          explain: 'Finger → attachment → brain/host → atomic → smoother → sound. Two threads, zero races, one knob that moves without clicks or pops. You just traced the architecture this whole zone exists to teach — the control room is wired.',
        },
      },
    ],
  },
  {
    id: 'p8', kind: 'project', title: 'Mission 3: Build & Load First Signal', short: 'Zone mission',
    concepts: ['build-system', 'state', 'deployment'],
    brief: 'The finale: repair the build recipe line by line, wire session persistence, build both formats, and walk the last mile into a host. At the end, First Signal is architecturally complete — a real plugin you can take to a real compiler.',
    steps: [
      {
        note: 'Step 1 — The recipe\'s identity block has one blank. Plugin codes are four characters (unique per plugin; case conventions matter for AU compatibility).',
        q: {
          type: 'fill', concept: 'build-system',
          prompt: 'Complete the format list: VST3 plus the self-testing app.',
          code: 'juce_add_plugin(FirstSignal\n    COMPANY_NAME "TXPPS"\n    PLUGIN_MANUFACTURER_CODE Txps\n    PLUGIN_CODE Fsig\n    FORMATS VST3 ___\n    PRODUCT_NAME "First Signal")',
          accept: ['Standalone'],
          placeholder: 'format',
          hint: 'The no-DAW-needed doorway.',
          explain: 'VST3 for hosts, Standalone for the fast loop. (On a Mac you\'d append AU — and codes like Txps/Fsig stay reserved to you, not copy-pasted from tutorials, for release.)',
        },
      },
      {
        note: 'Step 2 — The linker will want JUCE\'s implementation, not just its headers.',
        q: {
          type: 'fill', concept: 'build-system',
          prompt: 'Grant the target its JUCE module.',
          code: 'target_link_libraries(FirstSignal PRIVATE\n    juce::___)',
          accept: ['juce_audio_utils'],
          placeholder: 'module',
          hint: 'The audio-app umbrella module used all zone.',
          explain: 'juce::juce_audio_utils pulls in processors, GUI basics and device handling — the one-module diet a first plugin needs. Without it: je1\'s missing-header build failure.',
        },
      },
      {
        note: 'Step 3 — Persistence: the save side is written; finish the defensive load.',
        q: {
          type: 'order', concept: 'state',
          prompt: 'Arrange setStateInformation, defensive and complete.',
          lines: [
            'std::unique_ptr<juce::XmlElement> xml(',
            '    getXmlFromBinary(data, sizeInBytes));',
            'if (xml != nullptr',
            '    && xml->hasTagName(apvts.state.getType()))',
            '    apvts.replaceState(',
            '        juce::ValueTree::fromXml(*xml));',
          ],
          explain: 'Parse → null-check → tag-check → replace. Sessions now reopen at exactly the producer\'s −7.3 dB. The amnesia bug (jb4) can never happen here.',
        },
      },
      {
        note: 'Step 4 — Two commands stand between source and binaries.',
        q: {
          type: 'order', concept: 'build-system',
          prompt: 'Arrange the terminal session, first command on top.',
          lines: [
            'cmake -B build            # configure: read the recipe',
            'cmake --build build --config Release',
            '# outputs: FirstSignal.vst3 + standalone app in build/',
          ],
          explain: 'Configure plans, build compiles. Two commands, two failure domains, one pair of fresh binaries. (--config applies to multi-config generators; single-config setups pass -DCMAKE_BUILD_TYPE=Release at configure. And note: this runs on your machine with a real compiler — this app simulates and teaches; it doesn\'t compile C++.)',
        },
      },
      {
        note: 'Step 5 — The last mile. The standalone plays; the DAW shows nothing.',
        q: {
          type: 'mcq', concept: 'deployment',
          prompt: 'First thing to check?',
          options: [
            { t: 'Is the .vst3 actually in the host\'s scan folder (e.g. Common Files\\VST3 / ~/Library/Audio/Plug-Ins/VST3)?', why: '' },
            { t: 'Rewrite processBlock', why: 'The standalone plays — the code works. This is a plumbing problem, not a DSP one.' },
            { t: 'Reinstall the DAW', why: 'The nuclear option for a filing problem. Location, duplicates, rescan — in that order.' },
            { t: 'Switch to AU', why: 'Different doorway, same filing rules. Fix the path you have.' },
          ],
          answer: 0,
          explain: 'Standalone-works + host-blind = location/scan issue, near-certainly. j17\'s checklist: folder → duplicates → rescan → blacklist. First Signal is complete: engine, knob, panel, persistence, recipe, and the path into a host. Zone 3\'s boss awaits.',
        },
      },
    ],
  },

  /* ============ BOSS ============ */
  {
    id: 'boss3', kind: 'boss', title: 'BOSS: Signal Integrity', short: 'Zone 3 boss', passNeed: 4,
    concepts: ['clipping', 'aliasing', 'gain-staging', 'filters', 'buffer-flow', 'oversampling'],
    brief: 'A professional audio engine is losing signal integrity: a stage is clipping, an out-of-band tone is aliasing, the gain structure is wrong, and the buffer flow has a routing fault. Diagnose the path, then repair it. Six faults, one retry each — stabilise at least 4 to ship a clean signal.',
    stages: [
      {
        type: 'mcq', concept: 'clipping', qid: 'b3s1',
        prompt: 'Phase 1 — Signal Diagnosis. The output meter is pinned at 0 dBFS and the scope shows flat-topped peaks. The input peaks near 0.9. Diagnose the fault.',
        code: 'float applyGain(float in)\n{\n    return in * 6.0f;   // input peaks near 0.9\n}',
        options: [
          { t: 'Hard clipping — the signal is driven past ±1.0 and flattened at the ceiling', why: '' },
          { t: 'The gain is far too quiet', why: 'A ×6 gain is the opposite of quiet — about +15.6 dB of boost. The flat-topped peaks are the tell: the signal is too HOT, not too soft.' },
          { t: 'Normal loud audio — flat tops are expected when loud', why: 'Clean audio, however loud, keeps its wave shape. Flat tops mean samples that wanted to go past ±1.0 were sliced off at full scale — that is distortion, not loudness.' },
          { t: 'A DC offset shifting the waveform', why: 'A DC offset shifts the whole wave up or down; it does not slice the peaks flat. Symmetric flat tops at the rails are the signature of clipping.' },
        ],
        answer: 0,
        explain: '0.9 × 6.0 = 5.4 — more than five times past the ±1.0 full-scale ceiling. 0 dBFS is the largest value a sample can hold; anything beyond it is flattened, adding harsh harmonics. The meter pins and the peaks slice flat. Fix: reduce the gain (or add headroom) so peaks stay below 0 dBFS.',
      },
      {
        type: 'predict', concept: 'aliasing', qid: 'b3s2',
        prompt: 'Phase 1 — Signal Diagnosis. A 30 kHz tone reaches a 44.1 kHz path with no anti-aliasing filter. Nyquist is 22.05 kHz. What appears at the output?',
        code: 'sampleRate = 44100;   // Nyquist = 22050 Hz\ntoneHz     = 30000;   // above Nyquist\n// no anti-aliasing filter before sampling',
        options: [
          { t: 'A false 14.1 kHz tone — the 30 kHz content folds back below Nyquist', why: '' },
          { t: 'A clean 30 kHz tone, faithfully reproduced', why: 'A path sampled at 44.1 kHz cannot represent anything above 22.05 kHz. The 30 kHz tone has nowhere legitimate to land, so it does not survive as itself.' },
          { t: 'Silence — the out-of-band tone is simply discarded', why: 'Nothing discards it: with no anti-aliasing filter, the energy is still sampled — it just gets misread as a lower frequency. That phantom is the whole danger.' },
          { t: 'A 22.05 kHz tone sitting exactly at Nyquist', why: 'Aliasing mirrors the tone around Nyquist rather than parking it there. |44100 − 30000| = 14100 Hz — the fold lands at 14.1 kHz, squarely in the audible band.' },
        ],
        answer: 0,
        explain: 'Any frequency above Nyquist folds back into the band: alias = |sampleRate − f| = |44100 − 30000| = 14100 Hz. With no filter to remove content above Nyquist before sampling, that 14.1 kHz phantom is now indistinguishable from real signal. This is exactly why anti-aliasing filters — and oversampling — exist.',
      },
      {
        type: 'mcq', concept: 'gain-staging', qid: 'b3s3',
        prompt: 'Phase 2 — Repair Chain. A signal peaking at −3 dBFS is multiplied by 8.0 in the gain stage. Where does the level land, and what happens?',
        code: 'float g = 8.0f;       // linear gain\n// input peaks at -3 dBFS\nout[i] = in[i] * g;',
        options: [
          { t: 'It reaches about +15 dBFS — that headroom does not exist, so the stage clips', why: '' },
          { t: 'It stays at about −3 dBFS — the gain has no real effect', why: 'A linear gain of 8.0 is +18 dB, not a no-op. It moves the level a long way up — well past the ceiling from a −3 dBFS start.' },
          { t: 'It reaches about +8 dBFS', why: 'That treats the linear factor 8.0 as if it were 8 dB. In decibels 8.0× is 20·log10(8) ≈ +18 dB, so the arithmetic is −3 + 18, not −3 + 8.' },
          { t: 'It stays safely below 0 dBFS', why: 'Starting at −3 dBFS you only have 3 dB of headroom, and this stage asks for ~18 dB. It blows through the ceiling and clips.' },
        ],
        answer: 0,
        explain: 'Linear gain 8.0 is 20·log10(8) ≈ +18.06 dB. −3 dBFS + 18 dB ≈ +15 dBFS — but 0 dBFS is the ceiling, so ~15 dB has nowhere to go and the stage clips. Gain staging means keeping each stage below 0 dBFS with headroom to spare: cut this gain, or leave more room earlier in the chain.',
      },
      {
        type: 'fill', concept: 'filters', qid: 'b3s4',
        prompt: 'Phase 2 — Repair Chain. The signal carries a DC offset (energy at 0 Hz) that is eating headroom. Insert the filter that rejects it while passing the audio band.',
        code: '// DC lives at 0 Hz; keep 20 Hz and up\nfilter.setType(FilterType::___Pass);\nfilter.setCutoff(20.0f);',
        accept: ['High', 'high'],
        placeholder: 'type',
        hint: 'DC sits at 0 Hz — the very bottom. Which pass filter rejects the lowest frequencies and lets the rest through?',
        mistakes: [
          { match: '^[Ll]ow$', msg: 'A low-pass keeps the LOW frequencies and removes the highs — that keeps the 0 Hz DC you are trying to reject. You want its mirror image: a high-pass.' },
          { match: '^[Bb]and$', msg: 'A band-pass keeps a middle band and rejects both extremes — it would also throw away wanted high-frequency content. A high-pass with a low cutoff is the surgical tool for DC.' },
          { match: '^[Aa]ll$', msg: 'An all-pass changes phase but leaves amplitude alone, so it cannot remove the DC energy at all. You need a high-pass.' },
        ],
        explain: 'A high-pass filter attenuates frequencies below its cutoff and passes everything above. Set low (≈20 Hz) it removes the 0 Hz DC offset and subsonic rumble while leaving the audio untouched — recovering the headroom the DC was stealing. A low-pass would do the exact opposite and keep the DC.',
      },
      {
        type: 'bugspot', concept: 'buffer-flow', qid: 'b3s5',
        prompt: 'Phase 3 — Signal Stabilisation. The right channel is silent and the left is running hot. Tap the line that breaks the per-channel signal flow.',
        code: [
          'for (int ch = 0; ch < buffer.getNumChannels(); ++ch)',
          '{',
          '    float* data = buffer.getWritePointer(0);',
          '    for (int i = 0; i < numSamples; ++i)',
          '        data[i] *= gain;',
          '}',
        ],
        buggy: 2,
        explain: 'The loop counts channels with ch, but getWritePointer(0) always fetches channel 0 — so every pass gains the left channel (it gets hit on every iteration) and the right channel is never touched at all. The write pointer must follow the loop: buffer.getWritePointer(ch). Matching the buffer index to the loop variable is the heart of correct buffer flow.',
        fix: 'float* data = buffer.getWritePointer(ch);',
      },
      {
        type: 'order', concept: 'oversampling', qid: 'b3s6',
        prompt: 'Phase 3 — Signal Stabilisation. Final repair. A nonlinear distortion stage generates harmonics above Nyquist. Arrange the oversampling pipeline top to bottom so those harmonics cannot alias.',
        lines: [
          'oversampler.upsample(buffer);        // move to a higher sample rate',
          'applyNonlinearDistortion(buffer);    // harmonics now have room above the old Nyquist',
          'oversampler.downsample(buffer);      // low-pass, then decimate back to the base rate',
        ],
        explain: 'Upsample first so Nyquist moves up and the distortion has room to create harmonics without folding. Process at the higher rate. Then downsample — which low-passes above the original Nyquist before decimating — so nothing above the base-rate Nyquist survives to alias. Wrong order and the harmonics fold straight back into the audible band. Signal path stable: Zone 3 cleared.',
      },
    ],
  },
];
