/* ============================================================
   ZONE 3 — lessons j10–j17 (appended to ZONE3_LESSONS).
   ============================================================ */

ZONE3_LESSONS.push(

  /* ------------------------------------------------------ J10 */
  {
    id: 'j10', kind: 'lesson', title: 'Parameters: Knobs the Host Can See', short: 'IDs, ranges, automation',
    concepts: ['parameters'], time: '~6 MIN', diff: 2,
    hook: 'A member variable is a knob only you know about. A *parameter* is a knob the DAW can see, automate, and save. The difference is a declaration — and a promise you can never take back.',
    objective: 'Declare First Signal\'s gain parameter properly: stable ID, honest range, sensible default.',
    sections: [
      {
        h: 'What a parameter declares',
        body: 'Five decisions per knob: an **ID** (machine name — permanent!), a display **name**, a **range** (with skew for knobs ears use logarithmically), a **default**, and formatting. Hosts see parameters as **normalized 0–1** values under the hood; the range maps them to real units.',
        code: 'std::make_unique<juce::AudioParameterFloat>(\n    juce::ParameterID { "gain", 1 },   // ID + version hint\n    "Gain",                            // display name\n    juce::NormalisableRange<float>(-60.0f, 6.0f, 0.01f),\n    0.0f)                              // default: unity dB',
        codeTitle: 'First Signal\'s one knob',
        breakdown: [
          ['ParameterID { "gain", 1 }', 'the permanent machine name (+ version hint for hosts)'],
          ['"Gain"', 'what humans read — renameable anytime'],
          ['NormalisableRange(-60, 6, 0.01)', 'dB range, 0.01 steps — the map from 0–1 to real units'],
          ['0.0f', 'default: 0 dB, unity — plugins should wake transparent'],
        ],
      },
      {
        h: 'The promise you can\'t take back',
        body: 'Automation lanes and saved sessions reference parameters **by ID**. Change `"gain"` to `"outputGain"` in v1.1 and every existing session\'s automation detaches — user projects break. IDs are *forever*; names are cosmetic. This is why the ID gets one extra minute of thought and zero future edits.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'parameters',
        prompt: 'What breaks if you change a parameter\'s ID after release?',
        options: [
          { t: 'Saved sessions and automation lanes lose the parameter — user projects break', why: '' },
          { t: 'Nothing — IDs are internal', why: 'IDs are exactly what hosts store in sessions and automation. They are your public contract.' },
          { t: 'Only the display name changes', why: 'That\'s backwards: names are cosmetic, IDs are structural.' },
          { t: 'The plugin fails to build', why: 'It builds fine — and quietly breaks every existing project. The worst kind of bug.' },
        ],
        answer: 0,
        explain: 'The ID is how the outside world addresses your knob. Names can change with every redesign; the ID is carved once.',
      },
      {
        type: 'fill', concept: 'parameters',
        prompt: 'Give the gain parameter its permanent machine name (with version hint 1).',
        code: 'juce::ParameterID { "___", 1 }',
        accept: ['gain'],
        placeholder: 'id',
        hint: 'Lowercase, short, forever.',
        explain: '"gain", version 1. Short, lowercase, stable — and never edited again. (The version hint helps hosts distinguish parameter generations.)',
      },
      {
        type: 'mcq', concept: 'parameters',
        prompt: 'Why does the host see your parameter as a 0–1 normalized value?',
        options: [
          { t: 'A uniform scale lets any host automate any parameter without knowing its units', why: '' },
          { t: 'Floats can\'t hold values above 1', why: 'They can — normalization is a protocol convention, not a float limit.' },
          { t: 'To save memory', why: 'Same float either way — it\'s about a universal contract, not size.' },
          { t: 'Only gain parameters normalize', why: 'Every parameter of every plugin: one 0–1 lane format, mapped by each parameter\'s range.' },
        ],
        answer: 0,
        explain: 'The host draws one kind of lane; your NormalisableRange translates 0–1 into dB, Hz, or anything — including skewed maps for log-shaped ears.',
      },
    ],
    recap: [
      'Parameter = ID + name + range + default + formatting.',
      'IDs are permanent; names are cosmetic.',
      'Hosts speak normalized 0–1; ranges translate.',
      'Defaults should wake the plugin transparent.',
    ],
    inside: [
      { name: 'First Signal', use: 'one AudioParameterFloat: "gain", −60..+6 dB, default 0' },
      { name: 'Every plugin', use: 'every automatable knob is exactly this declaration' },
    ],
    analogyPanel: 'A parameter is a labeled patch point on the desk\'s automation bus: the tape machine records moves by channel number — renumber a channel and yesterday\'s automation plays into the wrong knob.',
    beginnerMistake: 'Treating IDs like variable names you can refactor. The moment version 1.0 ships, every ID is a public API frozen in users\' sessions.',
    remember: 'Parameter IDs are forever; everything else about a knob can change.',
    builds: ['parameter', 'automation', 'float'],
    leads: ['apvts', 'preset'],
  },

  /* ------------------------------------------------------ J11 */
  {
    id: 'j11', kind: 'lesson', title: 'APVTS, Demystified', short: 'The parameter brain',
    concepts: ['apvts'], time: '~8 MIN', diff: 3,
    hook: 'Every JUCE tutorial hands you one giant magic line and says "don\'t worry about it." Worry about it. AudioProcessorValueTreeState is three jobs in one object — and after two zones, you already understand every part of the machinery.',
    objective: 'Build First Signal\'s APVTS: the layout, the member, and thread-safe raw access — with no unexplained magic.',
    sections: [
      {
        h: 'Three jobs, one object',
        body: '**AudioProcessorValueTreeState** (APVTS) does: ① own your parameters and sync them with the host, ② expose each value as an atomic for the audio thread (Zone 2\'s bridge, now built in), ③ hold state as a **ValueTree** — a saveable named-value tree — for sessions and presets. The pieces:',
        code: '// PluginProcessor.h — the member (lives with the engine)\njuce::AudioProcessorValueTreeState apvts {\n    *this, nullptr, "PARAMS", createParameterLayout() };\n\n// PluginProcessor.cpp — the layout\njuce::AudioProcessorValueTreeState::ParameterLayout\nFirstSignalProcessor::createParameterLayout()\n{\n    juce::AudioProcessorValueTreeState::ParameterLayout layout;\n    layout.add(std::make_unique<juce::AudioParameterFloat>(\n        juce::ParameterID { "gain", 1 }, "Gain",\n        juce::NormalisableRange<float>(-60.0f, 6.0f, 0.01f),\n        0.0f));\n    return layout;\n}',
        codeTitle: 'the "magic line", disassembled',
        breakdown: [
          ['*this', 'the processor it belongs to — APVTS lives with the engine'],
          ['nullptr', 'no undo manager (a later-course feature)'],
          ['"PARAMS"', 'the ValueTree\'s type name — used when validating loaded state'],
          ['createParameterLayout()', 'your knob list, built with Zone 2\'s make_unique'],
        ],
      },
      {
        h: 'The audio thread\'s doorway',
        body: 'The engine reads knobs through **raw parameter access**: `apvts.getRawParameterValue("gain")` returns a `std::atomic<float>*` — cache the pointer once in the constructor, then `->load()` per block. Zone 2\'s handoff, now with the host automating the store side. (Attachments — the UI side — arrive in j14.)',
        code: '// constructor:\ngainParam = apvts.getRawParameterValue("gain");\n// processBlock:\nfloat gainDb = gainParam->load();',
        codeTitle: 'atomic access, cached once',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'apvts',
        prompt: 'What are APVTS\'s three jobs?',
        options: [
          { t: 'Own/sync parameters with the host, expose atomic values to audio, hold saveable state', why: '' },
          { t: 'Draw sliders, play audio, save files', why: 'It draws nothing and plays nothing — it\'s the state and parameter brain the UI and DSP both consult.' },
          { t: 'Only save presets', why: 'State is one third — host sync and atomic access are the other two.' },
          { t: 'Replace the AudioProcessor', why: 'It\'s a member OF the processor — the engine owns its brain.' },
        ],
        answer: 0,
        explain: 'Host sync + atomic bridge + saveable tree. Three lessons of machinery (parameters, atomics, state) in one well-named object.',
      },
      {
        type: 'fill', concept: 'apvts',
        prompt: 'Cache the audio thread\'s doorway to the gain value.',
        code: '// constructor:\ngainParam = apvts.___("gain");',
        accept: ['getRawParameterValue'],
        placeholder: 'method',
        hint: 'Raw, atomic, audio-thread-legal access.',
        explain: 'getRawParameterValue returns std::atomic<float>* — cache it once (string lookups per block are wasteful), load() it per block. The Zone 2 bridge with a host on the other end.',
      },
      {
        type: 'predict', concept: 'apvts',
        prompt: 'Host automation moves Gain mid-playback. What does the audio thread see?',
        code: '// audio thread, each block:\nfloat gainDb = gainParam->load();',
        options: [
          { t: 'The new value, safely — whole or old, never torn', why: '' },
          { t: 'A possibly half-written float', why: 'That\'s the plain-float race APVTS exists to prevent — the value is atomic.' },
          { t: 'Nothing until the editor opens', why: 'Automation flows host→APVTS→atomic regardless of any window — the engine never needs the panel.' },
          { t: 'A crash', why: 'This exact path is the sanctioned, lock-free design.' },
        ],
        answer: 0,
        explain: 'Host writes, atomic carries, audio loads. Indivisible values, no locks, editor irrelevant — every Zone 2 threading lesson, now doing its job in a shipping plugin.',
      },
    ],
    recap: [
      'APVTS = host sync + atomic access + saveable ValueTree.',
      'Constructor args: *this, nullptr, "PARAMS", layout().',
      'Layout = your knob list via make_unique.',
      'Cache getRawParameterValue once; load() per block.',
    ],
    inside: [
      { name: 'First Signal', use: 'one APVTS, one parameter — full architecture, small scale' },
      { name: 'Big synths', use: 'the same object holding 400 parameters' },
    ],
    analogyPanel: 'APVTS is the desk\'s patch memory + automation brain: every knob registered once, readable by the machine room (atomics), recordable by the tape (host), recallable tomorrow (state).',
    beginnerMistake: 'Calling getRawParameterValue("gain") inside processBlock every block — a string lookup on the deadline thread. Cache the pointer in the constructor; load per block.',
    remember: 'APVTS is three jobs you already understand, wearing one long name.',
    builds: ['apvts', 'atomic', 'unique-ptr'],
    leads: ['valuetree', 'slider-attachment'],
  },

  /* ------------------------------------------------------ J12 */
  {
    id: 'j12', kind: 'lesson', title: 'Smoothing the Gain', short: 'SmoothedValue in practice',
    concepts: ['smoothing'], time: '~6 MIN', diff: 2,
    hook: 'Wire the atomic straight into the multiply and First Signal works — and clicks on every knob move and automation step. The last DSP gap between "works" and "professional" is one small class: SmoothedValue.',
    objective: 'Add per-sample gain smoothing to First Signal — prepared with the sample rate, gliding to every new target.',
    sections: [
      {
        h: 'Why raw values click',
        body: 'A gain jump from 1.0 to 0.5 between two samples is a cliff in the waveform — a click (Zone 2 predicted this; Zone 4 explains the spectrum of it). **juce::SmoothedValue<float>** glides instead: set a *target*, then pull one stepped value per sample.',
        code: '// PluginProcessor.h\njuce::SmoothedValue<float> gainSmoothed;\n\n// prepareToPlay:\ngainSmoothed.reset(sampleRate, 0.05);   // 50 ms ramp\n\n// processBlock:\nfloat db = gainParam->load();\ngainSmoothed.setTargetValue(\n    juce::Decibels::decibelsToGain(db));\n\nfor (int i = 0; i < buffer.getNumSamples(); ++i)\n{\n    float g = gainSmoothed.getNextValue();\n    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)\n        buffer.getWritePointer(ch)[i] *= g;\n}',
        codeTitle: 'First Signal, de-clicked',
        breakdown: [
          ['reset(sampleRate, 0.05)', 'soundcheck: 50 ms of glide, in this session\'s samples'],
          ['setTargetValue(...)', 'per block: where the knob wants to be'],
          ['decibelsToGain(db)', 'JUCE\'s own dB→linear (your c1 formula, library edition)'],
          ['getNextValue()', 'per sample: one step of the glide'],
        ],
      },
      {
        h: 'Per-sample vs per-block',
        body: 'Pulling getNextValue() **per sample** is the clean default for gain. Cheaper per-block application (one value per block) can be fine for slow-moving things — but steps at block edges return as subtle zipper under fast automation. First Signal takes the honest per-sample path; Zone 4 studies the tradeoff properly.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'smoothing',
        prompt: 'Why does an unsmoothed gain change click?',
        options: [
          { t: 'The instant jump is a discontinuity in the waveform — ears hear the cliff', why: '' },
          { t: 'Atomics are slow', why: 'The atomic is innocent — it delivered the value perfectly. The *jump* is the problem.' },
          { t: 'Floats can\'t change quickly', why: 'They change instantly — that\'s exactly the issue.' },
          { t: 'The host sends corrupt values', why: 'The value is fine; the step-shape it creates in the audio is the click.' },
        ],
        answer: 0,
        explain: 'Any instant level change is a vertical edge in the waveform — wideband energy, heard as a click. Glide over ~50 ms and the edge becomes inaudible slope.',
      },
      {
        type: 'fill', concept: 'smoothing',
        prompt: 'Per block: tell the smoother where the knob wants to be.',
        code: 'gainSmoothed.___(\n    juce::Decibels::decibelsToGain(gainParam->load()));',
        accept: ['setTargetValue'],
        placeholder: 'method',
        hint: 'Target, not teleport.',
        explain: 'setTargetValue: the destination. getNextValue per sample walks there. Atomic delivers, smoother glides — the complete parameter pipeline.',
      },
      {
        type: 'bugspot', concept: 'smoothing',
        prompt: 'This smoother never glides at all — values snap and click. Tap the missing preparation\'s scene of the crime.',
        code: [
          'void prepareToPlay(double sampleRate, int samplesPerBlock)',
          '{',
          '    // (nothing here)',
          '}',
          'void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)',
          '{',
          '    gainSmoothed.setTargetValue(',
          '        juce::Decibels::decibelsToGain(gainParam->load()));',
          '    applySmoothed(buffer);',
          '}',
        ],
        buggy: 2,
        explain: 'The smoother was never reset(sampleRate, rampSeconds) — with no ramp configured, setTargetValue snaps instantly and every change clicks. Preparation belongs in prepareToPlay: that\'s the j6 contract.',
        fix: 'gainSmoothed.reset(sampleRate, 0.05); in prepareToPlay',
      },
    ],
    recap: [
      'Raw value jumps = waveform cliffs = clicks.',
      'reset(rate, seconds) in prepare; setTargetValue per block; getNextValue per sample.',
      'Decibels::decibelsToGain — the library owns your c1 formula.',
      'Per-sample smoothing is the honest default for gain.',
    ],
    inside: [
      { name: 'First Signal', use: 'the exact code above IS its final DSP' },
      { name: 'Every shipping plugin', use: 'every continuous knob runs through some smoother' },
    ],
    analogyPanel: 'The atomic is the fader\'s new position; the smoother is the motorized fader gliding there. Nobody ships a desk whose faders teleport.',
    beginnerMistake: 'Smoothing the dB value instead of the linear gain — the glide then warps through the log curve. Convert first, smooth the linear value.',
    remember: 'Atomic delivers the target; the smoother walks there — one step per sample.',
    builds: ['parameter-smoothing', 'atomic', 'decibel'],
    leads: ['dsp', 'gain'],
  },

  /* ------------------------------------------------------ J13 */
  {
    id: 'j13', kind: 'lesson', title: 'Building the Editor', short: 'Components, paint, resized',
    concepts: ['editor'], time: '~7 MIN', diff: 2,
    hook: 'Time to give First Signal a face: one slider, one label, one dark panel. In JUCE everything on screen is a Component — and your editor is just a Component that owns other Components.',
    objective: 'Build First Signal\'s editor: child components made visible, laid out in resized(), painted in paint().',
    sections: [
      {
        h: 'A tree of Components',
        body: 'The editor inherits `juce::AudioProcessorEditor` (itself a **Component**). Children — a `juce::Slider`, a `juce::Label` — are members; each gets `addAndMakeVisible()`. Two overrides do the visual work: **paint(g)** draws the background; **resized()** positions children. All of it on the **message thread** — never called by, and never calling into, the audio thread.',
        code: '// PluginEditor.h\nclass FirstSignalEditor : public juce::AudioProcessorEditor\n{\npublic:\n    explicit FirstSignalEditor(FirstSignalProcessor&);\n    void paint(juce::Graphics&) override;\n    void resized() override;\nprivate:\n    FirstSignalProcessor& processorRef;\n    juce::Slider gainSlider;\n    juce::Label  gainLabel;\n};',
        codeTitle: 'the panel, declared',
      },
      {
        h: 'Constructor, paint, resized',
        body: 'The constructor wires children and picks a size; `resized()` runs on every size change (do **layout math here**, not in paint); `paint` fills pixels. The pattern:',
        code: 'FirstSignalEditor::FirstSignalEditor(FirstSignalProcessor& p)\n    : AudioProcessorEditor(&p), processorRef(p)\n{\n    gainSlider.setSliderStyle(\n        juce::Slider::RotaryVerticalDrag);\n    addAndMakeVisible(gainSlider);\n    addAndMakeVisible(gainLabel);\n    setSize(300, 200);\n}\n\nvoid FirstSignalEditor::resized()\n{\n    gainSlider.setBounds(\n        getLocalBounds().reduced(40));\n}\n\nvoid FirstSignalEditor::paint(juce::Graphics& g)\n{\n    g.fillAll(juce::Colour(0xff141414));\n}',
        codeTitle: 'wire, size, place, paint',
        breakdown: [
          ['addAndMakeVisible(child)', 'adopt the child AND show it — forget it and the control is invisible'],
          ['setSize(300, 200)', 'triggers the first resized() call'],
          ['resized()', 'layout math — runs on every resize'],
          ['paint(g)', 'pixels only; no layout, no state changes'],
        ],
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'editor',
        prompt: 'A slider member exists and works in code, but doesn\'t appear on screen. Most likely cause?',
        options: [
          { t: 'addAndMakeVisible() was never called for it', why: '' },
          { t: 'The audio thread is blocking it', why: 'Threads don\'t hide components — visibility is opt-in and this one never opted in.' },
          { t: 'It needs a LookAndFeel first', why: 'Default look draws fine — LookAndFeel is styling (a later-course topic), not existence.' },
          { t: 'Sliders require attachments to render', why: 'Attachments bind values (next lesson) — rendering only needs visibility.' },
        ],
        answer: 0,
        explain: 'The single most common first-editor bug: a fully functional, entirely invisible component. addAndMakeVisible in the constructor, per child, always.',
      },
      {
        type: 'fill', concept: 'editor',
        prompt: 'Adopt and show the gain slider.',
        code: 'FirstSignalEditor::FirstSignalEditor(FirstSignalProcessor& p)\n    : AudioProcessorEditor(&p), processorRef(p)\n{\n    ___(gainSlider);\n    setSize(300, 200);\n}',
        accept: ['addAndMakeVisible'],
        placeholder: 'method',
        hint: 'Add AND make visible — one call.',
        explain: 'addAndMakeVisible: parent adopts child, child becomes drawable. Layout comes later in resized(); this call is about existence.',
      },
      {
        type: 'mcq', concept: 'editor',
        prompt: 'Where does layout math (setBounds calls) belong?',
        options: [
          { t: 'resized() — it re-runs on every size change', why: '' },
          { t: 'paint() — it runs most often', why: 'paint is pixels-only; doing layout there re-computes geometry every repaint and fights the framework.' },
          { t: 'processBlock()', why: 'UI geometry on the audio thread — the exact cross-thread sin this course exists to prevent.' },
          { t: 'The processor\'s constructor', why: 'The engine doesn\'t know or care about pixels — panels lay themselves out.' },
        ],
        answer: 0,
        explain: 'resized() is the layout callback: triggered by setSize and by user resizing. Bounds there, pixels in paint, wiring in the constructor — three homes, never mixed.',
      },
    ],
    recap: [
      'Everything visible is a Component; the editor owns its children.',
      'addAndMakeVisible per child — or it silently doesn\'t exist.',
      'resized() = layout; paint() = pixels; constructor = wiring.',
      'All of it on the message thread.',
    ],
    inside: [
      { name: 'First Signal', use: 'one rotary slider, one label, one dark panel' },
      { name: 'Big plugins', use: 'the same tree, hundreds of components deep' },
    ],
    analogyPanel: 'The editor is the faceplate build: mount the knobs (addAndMakeVisible), drill the layout (resized), silkscreen the panel (paint). The circuit behind it was finished lessons ago.',
    beginnerMistake: 'Doing layout in paint(). It works — and recomputes geometry on every repaint while resized() sits empty. Bounds in resized, pixels in paint.',
    remember: 'Wire in the constructor, place in resized(), draw in paint() — and make every child visible.',
    builds: ['audioprocessoreditor', 'gui', 'ui-thread'],
    leads: ['slider-attachment', 'component'],
  },

  /* ------------------------------------------------------ J14 */
  {
    id: 'j14', kind: 'lesson', title: 'Attachments: UI Meets Engine', short: 'SliderAttachment & lifetime',
    concepts: ['attachments'], time: '~6 MIN', diff: 2,
    hook: 'The slider turns; nothing happens. The parameter moves under automation; the slider sits still. They\'ve never met. One small object introduces them — permanently, thread-safely, in both directions.',
    objective: 'Connect First Signal\'s slider to its parameter with a SliderAttachment — declared in the right order, for a reason.',
    sections: [
      {
        h: 'The two-way patch cable',
        body: 'A **SliderAttachment** (full name `juce::AudioProcessorValueTreeState::SliderAttachment`) binds one slider to one parameter ID: drag the slider → parameter updates (host sees it, atomic updates, undo-able gesture); automation moves the parameter → slider follows. The UI never touches DSP directly — the attachment routes everything through APVTS.',
        viz: { t: 'paramflow' },
        code: '// PluginEditor.h — AFTER the slider member:\nstd::unique_ptr<juce::AudioProcessorValueTreeState\n                    ::SliderAttachment> gainAttachment;\n\n// PluginEditor.cpp — constructor:\ngainAttachment = std::make_unique<\n    juce::AudioProcessorValueTreeState::SliderAttachment>(\n        processorRef.apvts, "gain", gainSlider);',
        codeTitle: 'the introduction',
        breakdown: [
          ['unique_ptr<...SliderAttachment>', 'the editor owns the binding (Zone 2 ownership)'],
          ['processorRef.apvts', 'the brain it patches into'],
          ['"gain"', 'the permanent ID from j10 — the address'],
          ['gainSlider', 'the knob being introduced'],
        ],
      },
      {
        h: 'Declaration order is destruction order',
        body: 'Zone 1 fact, load-bearing at last: members are destroyed in **reverse declaration order**. The attachment references the slider — so it must die *first*, meaning it must be declared *after* the slider. Declare it before, and at editor close the attachment briefly references a destroyed slider: a real, shipping-plugin crash class.',
        mistake: { code: '// ✗ WRONG ORDER\nstd::unique_ptr<SliderAttachment> gainAttachment; // declared first,\njuce::Slider gainSlider;                          // destroyed LAST\n// at close: attachment outlives its slider — dangling', text: 'Slider first, attachment after. The compiler won\'t warn — only the crash log will.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'attachments',
        prompt: 'What does a SliderAttachment do?',
        options: [
          { t: 'Binds slider ↔ parameter both ways, routed through APVTS — no direct UI→DSP touching', why: '' },
          { t: 'Draws the slider', why: 'The slider draws itself — the attachment is pure plumbing, invisible.' },
          { t: 'Sends slider values straight to processBlock', why: 'Nothing goes "straight" — host sync, atomics and gestures all flow through APVTS. That indirection IS the design.' },
          { t: 'Saves the slider position to disk', why: 'State saving is APVTS/getStateInformation — the attachment just keeps knob and parameter agreeing.' },
        ],
        answer: 0,
        explain: 'Drag → parameter (host-visible, automatable); parameter → slider (automation follows on screen). One object, both directions, zero custom glue.',
      },
      {
        type: 'fill', concept: 'attachments',
        prompt: 'Introduce the slider to its parameter.',
        code: 'gainAttachment = std::make_unique<\n    juce::AudioProcessorValueTreeState::SliderAttachment>(\n        processorRef.apvts, "___", gainSlider);',
        accept: ['gain'],
        placeholder: 'parameter ID',
        hint: 'The permanent address from j10.',
        explain: 'The ID is the patch address: apvts + "gain" + slider. A mismatched ID means the attachment can\'t find its parameter — JUCE asserts/crashes the moment the editor is built. IDs are strings: type them once, reuse a constant in bigger plugins.',
      },
      {
        type: 'bugspot', concept: 'attachments',
        prompt: 'This editor crashes on close. Tap the declaration that\'s in the wrong place.',
        code: [
          'class FirstSignalEditor : public juce::AudioProcessorEditor',
          '{',
          'private:',
          '    std::unique_ptr<SliderAttachment> gainAttachment;',
          '    juce::Slider gainSlider;',
          '};',
        ],
        buggy: 3,
        explain: 'Declared before the slider → destroyed after it → the attachment\'s final moments reference a dead slider. Move the attachment below the slider: destruction order is reverse declaration order.',
        fix: 'Declare gainSlider first, gainAttachment after it',
      },
    ],
    recap: [
      'SliderAttachment: two-way slider↔parameter binding via APVTS.',
      'The editor owns it (unique_ptr); built in the constructor.',
      'Declare slider first, attachment after — destruction order.',
      'UI never mutates DSP directly; everything routes through the brain.',
    ],
    inside: [
      { name: 'First Signal', use: 'one attachment — the whole UI↔engine wiring' },
      { name: 'Buttons & combos', use: 'ButtonAttachment / ComboBoxAttachment: same pattern, other controls' },
    ],
    analogyPanel: 'The attachment is a two-way patch cable between panel and automation bus: turn the knob, the bus records; the bus plays back, the knob moves. Nobody solders the knob straight to the circuit.',
    beginnerMistake: 'Skipping the attachment and setting engine values in onValueChange. It "works" — and silently loses host automation, gestures, and state sync. Attach; don\'t wire around the brain.',
    remember: 'Slider first, attachment after — and all roads run through APVTS.',
    builds: ['slider-attachment', 'unique-ptr', 'destructor'],
    leads: ['valuetree', 'automation'],
  },

  /* ------------------------------------------------------ J15 */
  {
    id: 'j15', kind: 'lesson', title: 'Saving & Restoring State', short: 'get/setStateInformation',
    concepts: ['state'], time: '~6 MIN', diff: 2,
    hook: 'A producer dials First Signal to −7.3 dB, saves, and goes to sleep. Tomorrow the session must open at exactly −7.3. Two overrides carry that promise — and a plugin that breaks it doesn\'t get used twice.',
    objective: 'Implement both state calls: serialize the APVTS tree out, and restore incoming state defensively.',
    sections: [
      {
        h: 'Out: the session save',
        body: 'When the host saves, it calls **getStateInformation(destData)**: serialize your state into the provided memory block. With APVTS it\'s three honest lines — copy the tree, render it to XML, pour the XML into the block. Your settings then live *inside the user\'s project file*.',
        code: 'void FirstSignalProcessor::getStateInformation(\n        juce::MemoryBlock& destData)\n{\n    auto state = apvts.copyState();\n    std::unique_ptr<juce::XmlElement> xml(\n        state.createXml());\n    copyXmlToBinary(*xml, destData);\n}',
        codeTitle: 'save: tree → XML → block',
      },
      {
        h: 'In: defensive restoration',
        body: '**setStateInformation(data, size)** arrives with *whatever was saved* — possibly by an older version, possibly corrupted. Parse, **verify the tree type matches**, and only then `replaceState()`. Missing parameters in old saves keep their defaults — which is exactly how an old session still opens in a newer version, and why removing or renaming IDs breaks sessions (j10\'s promise, round two).',
        code: 'void FirstSignalProcessor::setStateInformation(\n        const void* data, int sizeInBytes)\n{\n    std::unique_ptr<juce::XmlElement> xml(\n        getXmlFromBinary(data, sizeInBytes));\n\n    if (xml != nullptr\n        && xml->hasTagName(apvts.state.getType()))\n        apvts.replaceState(\n            juce::ValueTree::fromXml(*xml));\n}',
        codeTitle: 'load: verify, then replace',
        breakdown: [
          ['getXmlFromBinary', 'unpack — may fail: returns nullptr on garbage'],
          ['xml != nullptr', 'Zone 1\'s null check, guarding real user data'],
          ['hasTagName(state.getType())', 'is this OUR "PARAMS" tree? (j11\'s name, load-bearing)'],
          ['replaceState(...)', 'swap the whole tree in — parameters update everywhere'],
        ],
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'state',
        prompt: 'When do get/setStateInformation run?',
        options: [
          { t: 'When the host saves or loads a session (and for host-side preset systems)', why: '' },
          { t: 'Every block', why: 'Serialization per block would demolish the deadline — these are rare, host-triggered events kept off the audio deadline.' },
          { t: 'Only when the editor is open', why: 'Sessions save with every window closed — state is engine business.' },
          { t: 'Only at plugin scan', why: 'Scanning interrogates capabilities; state moves when projects save and open.' },
        ],
        answer: 0,
        explain: 'Host saves → getState; project opens → setState. Your knobs ride inside the user\'s project file — that\'s the whole contract.',
      },
      {
        type: 'fill', concept: 'state',
        prompt: 'The XML checked out. Swap the restored tree in.',
        code: 'if (xml != nullptr\n    && xml->hasTagName(apvts.state.getType()))\n    apvts.___(juce::ValueTree::fromXml(*xml));',
        accept: ['replaceState'],
        placeholder: 'method',
        hint: 'Replace the whole tree, atomically-managed by APVTS.',
        explain: 'replaceState swaps the tree; parameters, atomics and any open editor all follow. Assigning to apvts.state directly skips the bookkeeping — replaceState is the door JUCE wants you to use.',
      },
      {
        type: 'predict', concept: 'state',
        prompt: 'A session saved by v1.0 (gain only) loads into v1.2 (gain + width). What happens to width?',
        code: '// old save: <PARAMS gain="-7.3"/>\n// v1.2 parameters: gain, width',
        options: [
          { t: 'width keeps its default; gain restores to −7.3', why: '' },
          { t: 'The load fails entirely', why: 'Missing values aren\'t corruption — absent parameters simply keep defaults. Old sessions stay loadable.' },
          { t: 'width gets a random value', why: 'Nothing random: unmentioned parameters are untouched — that\'s the defensive design.' },
          { t: 'gain resets too', why: 'gain is present in the save — it restores exactly. Only the newcomer defaults.' },
        ],
        answer: 0,
        explain: 'Additive evolution is safe: new parameters default, old ones restore. Renaming or deleting IDs is what breaks the past — add, don\'t rewrite.',
      },
    ],
    recap: [
      'getState: copyState → XML → binary block.',
      'setState: parse → null-check → tag-check → replaceState.',
      'State rides inside the host\'s project file.',
      'New params default on old saves — add IDs, never rename them.',
    ],
    inside: [
      { name: 'First Signal', use: 'six lines total — full session persistence' },
      { name: 'Preset systems', use: 'the same tree, saved to your own files (Zone 5)' },
    ],
    analogyPanel: 'The tour manager\'s notebook: every knob written down at load-out (save), restored exactly at the next load-in (open) — and if a page is missing or from another band\'s book, you keep your defaults instead of guessing.',
    beginnerMistake: 'Skipping the hasTagName check. setState receives whatever bytes exist — old versions, other-plugin state after a host mix-up, corruption. Verify before you replace.',
    remember: 'Save the tree, verify the tree, replace the tree — and never break an old session.',
    builds: ['valuetree', 'preset', 'nullptr'],
    leads: ['preset', 'automation'],
  },

  /* ------------------------------------------------------ J16 */
  {
    id: 'j16', kind: 'lesson', title: 'CMake: The Build Recipe', short: 'CMakeLists.txt, line by line',
    concepts: ['build-system'], time: '~7 MIN', diff: 2,
    hook: 'Five source files don\'t become a VST3 by wishing. One text file tells CMake what to build, what to call it, which formats to produce, and which JUCE modules to link. Read it once slowly and it stops being an incantation forever.',
    objective: 'Read every line of First Signal\'s CMakeLists.txt and know what each one controls.',
    sections: [
      {
        h: 'The recipe, complete',
        body: 'This is First Signal\'s entire build description — real and buildable:',
        code: 'cmake_minimum_required(VERSION 3.22)\nproject(FirstSignal VERSION 0.1.0)\n\nadd_subdirectory(JUCE)   # the framework source\n\njuce_add_plugin(FirstSignal\n    COMPANY_NAME "TXPPS"\n    PLUGIN_MANUFACTURER_CODE Txps\n    PLUGIN_CODE Fsig\n    FORMATS VST3 Standalone\n    PRODUCT_NAME "First Signal")\n\ntarget_sources(FirstSignal PRIVATE\n    Source/PluginProcessor.cpp\n    Source/PluginEditor.cpp)\n\ntarget_compile_definitions(FirstSignal PUBLIC\n    JUCE_WEB_BROWSER=0\n    JUCE_USE_CURL=0)\n\ntarget_link_libraries(FirstSignal PRIVATE\n    juce::juce_audio_utils)',
        codeTitle: 'CMakeLists.txt — all of it',
        breakdown: [
          ['juce_add_plugin(...)', 'JUCE\'s macro: declares the plugin target + formats'],
          ['PLUGIN_MANUFACTURER_CODE / PLUGIN_CODE', 'four-char codes hosts index you by (case conventions matter for AU; keep yours unique)'],
          ['target_sources', 'the .cpp list — a missing file here = j-era linker errors'],
          ['target_link_libraries', 'which JUCE modules your code may use'],
        ],
      },
      {
        h: 'Configure, then build',
        body: 'Two distinct steps: **configure** (`cmake -B build`) reads the recipe and generates platform build files into `build/`; **build** (`cmake --build build --config Release`) compiles and links. Debug vs Release is Zone 2\'s lesson applied: develop in Debug, measure and ship Release. (`--config` selects it on multi-config generators like Visual Studio/Xcode; single-config setups choose at configure time with `-DCMAKE_BUILD_TYPE=Release`.) The binaries land inside `build/` under the target\'s artefacts folder — the .vst3 and the standalone app.',
      },
    ],
    checks: [
      {
        type: 'match', concept: 'build-system',
        prompt: 'Match each CMake line to its job.',
        left: ['juce_add_plugin(...)', 'target_sources(...)', 'target_link_libraries(...)', 'FORMATS VST3 Standalone'],
        right: ['declare the plugin target and identity', 'list the .cpp files to compile', 'grant access to JUCE modules', 'choose which wrappers get built'],
        explain: 'Identity, sources, dependencies, formats — the four decisions every plugin recipe makes.',
      },
      {
        type: 'fill', concept: 'build-system',
        prompt: 'The editor\'s .cpp is missing from the build — linker errors await. Add it.',
        code: 'target_sources(FirstSignal PRIVATE\n    Source/PluginProcessor.cpp\n    Source/___)',
        accept: ['PluginEditor.cpp'],
        placeholder: 'file',
        hint: 'The panel\'s implementation file.',
        explain: 'Every .cpp must be listed or its definitions never compile — "undefined reference to FirstSignalEditor::..." is this exact omission (e3, all grown up).',
      },
      {
        type: 'mcq', concept: 'build-system',
        prompt: 'What\'s the difference between configuring and building?',
        options: [
          { t: 'Configure reads the recipe and generates build files; build actually compiles and links', why: '' },
          { t: 'They\'re synonyms', why: 'Two separate commands, two separate failures: recipe errors surface at configure; code errors at build.' },
          { t: 'Configure compiles; build packages', why: 'Backwards-ish: configure only *plans* — no compiler runs until the build step.' },
          { t: 'Only IDEs configure', why: 'cmake -B build configures anywhere — IDEs just click it for you.' },
        ],
        answer: 0,
        explain: 'cmake -B build (plan) → cmake --build build (do). Knowing which step failed halves every build-problem hunt.',
      },
    ],
    recap: [
      'One CMakeLists.txt: identity, sources, definitions, modules, formats.',
      'Four-char manufacturer/plugin codes — unique, case conventions matter.',
      'A .cpp missing from target_sources = linker errors.',
      'Configure plans; build compiles. Debug to develop, Release to ship.',
    ],
    inside: [
      { name: 'First Signal', use: 'the recipe above builds it, verbatim' },
      { name: 'Any JUCE project', use: 'same skeleton, longer source lists' },
    ],
    analogyPanel: 'CMakeLists.txt is the stage plot + input list: one document any venue\'s crew (any platform\'s compiler) can wire the show from. Configure reads the plot; build runs the cables.',
    beginnerMistake: 'Editing generated files in build/ to "fix" something. Regeneration erases it. The recipe is the only source of truth — fix CMakeLists.txt.',
    remember: 'One recipe file rules the build: identity, sources, modules, formats.',
    builds: ['cmake', 'linker-error', 'build'],
    leads: ['debug-build', 'release-build'],
  },

  /* ------------------------------------------------------ J17 */
  {
    id: 'j17', kind: 'lesson', title: 'Loading & Testing First Signal', short: 'From binary to host',
    concepts: ['deployment'], time: '~6 MIN', diff: 2,
    hook: 'The build succeeded. Somewhere in build/ sits a real .vst3 and a real app. The last mile — install locations, host scans, and the classic scan failures — is where first plugins go to sulk. Not yours.',
    objective: 'Test standalone-first, install the VST3 where hosts look, and diagnose the classic scan failures calmly.',
    sections: [
      {
        h: 'The safe test workflow',
        body: '**Standalone first**: run the built app directly — instant audio, no scanning, fastest loop. Then the **VST3**: hosts scan fixed locations — Windows: `C:\\Program Files\\Common Files\\VST3`; macOS: `~/Library/Audio/Plug-Ins/VST3` (or /Library for all users); Linux: `~/.vst3`. JUCE\'s `COPY_PLUGIN_AFTER_BUILD` option can install on every build. Then rescan in the host — or use a dedicated test host (JUCE ships AudioPluginHost) before touching your real sessions.',
        viz: { t: 'chain', nodes: ['build/', 'VST3 folder', 'host scan', 'insert & play'], accent: 2, caption: 'the last mile, in order' },
      },
      {
        h: 'When the scan comes up empty',
        body: 'The classic culprits, in checking order: **wrong folder** (a .vst3 on your desktop is invisible); **stale duplicates** (an old copy shadowing the new build — delete, rebuild, rescan); **architecture mismatch** (an ARM-only build in an Intel host, or vice versa — build universal/matching); **failed validation** (the host probed it and blacklisted — check the host\'s plugin manager list and un-blacklist after fixing). Every one is boring once you\'ve met it.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'deployment',
        prompt: 'Why test the standalone build before the VST3?',
        options: [
          { t: 'It runs directly — no install, no scan, the fastest possible feedback loop', why: '' },
          { t: 'The VST3 can\'t work until the standalone runs', why: 'They\'re independent wrappers — standalone is just the *cheapest* to test, not a prerequisite.' },
          { t: 'DAWs require it', why: 'Hosts never see your standalone — it\'s purely your dev-loop friend.' },
          { t: 'It has better audio quality', why: 'Identical processor, identical sound.' },
        ],
        answer: 0,
        explain: 'Build → double-click → hear it. When something breaks you know it\'s your code, not the install path, the scan cache, or the host. Isolate variables like an engineer.',
      },
      {
        type: 'mcq', concept: 'deployment',
        prompt: 'Your new build shows old behavior in the DAW. Most likely cause?',
        options: [
          { t: 'A stale duplicate .vst3 is being loaded instead of the fresh build', why: '' },
          { t: 'The DAW caches audio forever', why: 'Hosts cache scan *results*, not your DSP — the binary being loaded is simply the old file.' },
          { t: 'VST3s can\'t be updated', why: 'They update fine — when the file the host loads is actually the new one.' },
          { t: 'You must reboot', why: 'Rescanning after replacing the right file is all it takes.' },
        ],
        answer: 0,
        explain: 'Old copy in the scan path, new copy in build/ — the classic. Delete stale copies, install the fresh one (or COPY_PLUGIN_AFTER_BUILD), rescan. Check the file\'s timestamp when in doubt.',
      },
      {
        type: 'order', concept: 'deployment',
        prompt: 'Arrange the sane debugging order for "my plugin doesn\'t appear."',
        lines: [
          'run the standalone — does the code itself work?',
          'check the .vst3 is in the host\'s scan folder',
          'delete stale duplicate copies',
          'rescan (and check the host\'s blacklist)',
        ],
        explain: 'Code first, location second, duplicates third, scan last — each step isolates one variable. Random-order flailing is how afternoons disappear.',
      },
    ],
    recap: [
      'Standalone first: the fastest, cleanest test loop.',
      'VST3 lives in fixed per-OS folders; hosts only look there.',
      'Stale duplicates and architecture mismatches are the classic ghosts.',
      'Failed scans often mean a blacklist entry — check the host\'s plugin manager.',
    ],
    inside: [
      { name: 'First Signal', use: 'Mission 3 walks this exact path to a loaded plugin' },
      { name: 'Every release', use: 'installers automate the same folder rules' },
    ],
    analogyPanel: 'Soundcheck logic: test the synth on headphones (standalone) before patching it into the venue system (host). If the PA is silent, check the patchbay (folder) before blaming the synth.',
    beginnerMistake: 'Testing day-one builds inside your real music sessions. A crashing dev build takes the session with it — use the standalone and a test host until it\'s stable.',
    remember: 'Standalone to hear it; right folder + fresh copy + rescan for the host to see it.',
    builds: ['host', 'daw', 'vst3'],
    leads: ['debugger', 'release-build'],
  }
);
