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
    id: 'boss3', kind: 'boss', title: 'BOSS: The Silent Plugin', short: 'Zone 3 boss', passNeed: 5,
    concepts: ['processor', 'apvts', 'smoothing', 'state', 'build-system'],
    brief: 'A client\'s "finished" gain plugin: it builds, but the DAW can\'t always see it, it\'s silent on mono tracks, the knob clicks, and every session forgets its settings. Seven faults hide across the whole architecture. Clear 5 of 7 to ship the fix.',
    stages: [
      {
        type: 'compiler', concept: 'build-system',
        prompt: 'Stage 1 — It stopped building after the editor was added. Fix the recipe.',
        code: 'target_sources(SilentGain PRIVATE\n    Source/PluginProcessor.cpp)\n# PluginEditor.cpp exists on disk — note its absence',
        error: "ld: error: undefined reference to\n'SilentGainEditor::SilentGainEditor(SilentGainProcessor&)'\ncollect2: error: ld returned 1 exit status",
        options: [
          { t: 'Add Source/PluginEditor.cpp to target_sources', why: '' },
          { t: 'Include PluginEditor.h in more files', why: 'Headers satisfy the compiler; this is the *linker* missing compiled bodies — the .cpp never entered the build.' },
          { t: 'Delete the editor class', why: 'The plugin needs its panel — the recipe just needs to know the file exists.' },
          { t: 'Link another JUCE module', why: 'The missing symbol is *your* class, not juce:: — that\'s the tell: your file, not their module.' },
        ],
        answer: 0,
        explain: 'Undefined reference to YOUR class = your .cpp missing from target_sources. To a juce:: class = missing module link. Learn the tell; halve the debugging.',
      },
      {
        type: 'bugspot', concept: 'lifecycle',
        prompt: 'Stage 2 — The smoother glides at garbage speed. Tap the misplaced setup.',
        code: [
          'SilentGainProcessor::SilentGainProcessor()',
          '{',
          '    gainSmoothed.reset(44100.0, 0.05);',
          '}',
          'void SilentGainProcessor::prepareToPlay(',
          '        double sampleRate, int samplesPerBlock)',
          '{',
          '}',
        ],
        buggy: 2,
        explain: 'The rate is guessed (44100) at construction — sessions at 48k/96k glide wrong, and rate changes never re-teach it. Rate-dependent setup lives in prepareToPlay, with the REAL sampleRate argument.',
        fix: 'gainSmoothed.reset(sampleRate, 0.05); in prepareToPlay',
      },
      {
        type: 'bugspot', concept: 'buffers',
        prompt: 'Stage 3 — Silent on mono tracks, and hissy on mono→stereo inserts. Tap the grid bug.',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    float* right = buffer.getWritePointer(1);',
          '    for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '        right[i] *= gain;',
          '}',
        ],
        buggy: 3,
        explain: 'Hard-coded channel 1: crashes or misbehaves on mono, and channel 0 is never processed at all (plus unwritten outputs never cleared — the hiss). Loop getNumChannels(), clear unused outputs: j8\'s whole gospel.',
        fix: 'Loop channels 0..getNumChannels(); clear extra outputs',
      },
      {
        type: 'bugspot', concept: 'processblock',
        prompt: 'Stage 4 — Dropouts every time settings change. Tap the contraband.',
        code: [
          'void processBlock(juce::AudioBuffer<float>& buffer,',
          '                  juce::MidiBuffer&)',
          '{',
          '    if (settingsChanged)',
          '        saveSettingsToFile("gain.cfg");',
          '    buffer.applyGain(currentGain);',
          '}',
        ],
        buggy: 4,
        explain: 'File I/O on the deadline thread — the oldest sin in the book, now spotted on sight. State belongs to get/setStateInformation, kept off the audio thread; processBlock touches memory that already exists, only.',
        fix: 'Delete it — the host persists state via getStateInformation',
      },
      {
        type: 'fill', concept: 'attachments',
        prompt: 'Stage 5 — The editor asserts the moment it opens: the attachment is addressed to an ID that doesn\'t exist. Fix the address (the layout declares ParameterID { "gain", 1 }).',
        code: 'gainAttachment = std::make_unique<SliderAttachment>(\n    processorRef.apvts, "___", gainSlider);',
        accept: ['gain'],
        placeholder: 'ID',
        hint: 'Exactly as the layout carved it.',
        explain: 'IDs are strings: "Gain" ≠ "gain" — and an attachment that can\'t find its parameter asserts/crashes at editor creation. Match the layout exactly (and share a constant in bigger code).',
      },
      {
        type: 'predict', concept: 'state',
        prompt: 'Stage 6 — Settings vanish on reopen. The load code parses XML, checks the tag… and assigns to apvts.state directly. What\'s wrong?',
        code: 'if (xml != nullptr && xml->hasTagName("PARAMS"))\n    apvts.state = juce::ValueTree::fromXml(*xml);',
        options: [
          { t: 'Direct assignment skips APVTS\'s bookkeeping — use apvts.replaceState(...) instead', why: '' },
          { t: 'The null check is unnecessary', why: 'The null check is correct and stays — the assignment is the flaw.' },
          { t: 'XML can\'t store parameters', why: 'XML is exactly the serialization JUCE generates — the transport is fine, the door is wrong.' },
          { t: 'Nothing — this works', why: 'It half-works, which is worse: parameters, atomics and attachments can desync from the swapped tree. replaceState is the sanctioned door.' },
        ],
        answer: 0,
        explain: 'replaceState() swaps the tree AND keeps parameters, atomics, host and any open editor coherent. Direct .state assignment is the subtle half-bug that "mostly works" — until it doesn\'t.',
      },
      {
        type: 'mcq', concept: 'deployment',
        prompt: 'Stage 7 — Fixed, rebuilt… and the DAW still runs the OLD version. Final diagnosis?',
        options: [
          { t: 'A stale copy in the VST3 scan folder is shadowing the fresh build — replace it and rescan', why: '' },
          { t: 'The DAW compiles plugins itself and needs source', why: 'Hosts load binaries — they never see your source.' },
          { t: 'VST3s update only on OS restart', why: 'They update the moment the *right file* is replaced and rescanned.' },
          { t: 'The plugin must change its ID every build', why: 'IDs are forever — the file in the scan path is the whole story.' },
        ],
        answer: 0,
        explain: 'Fresh binary in build/, stale binary in the scan path — the last-mile classic. Replace, rescan, hear the fix. Seven ghosts, one architecture, fully exorcised: the Silent Plugin sings, and Zone 3 is yours.',
      },
    ],
  },
];
