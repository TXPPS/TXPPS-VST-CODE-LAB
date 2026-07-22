/* ============================================================
   SIGNAL DICTIONARY — part E: terms introduced by Zone 3.
   ============================================================ */

DICT.push(
  {
    id: 'valuetree', t: 'ValueTree', c: 'JUCE',
    plain: 'JUCE\'s saveable data structure: a named tree of properties and children. APVTS keeps your parameter state in one, and it serializes to XML — which is how sessions and presets travel.',
    why: 'Every getStateInformation you write copies a ValueTree out; every setStateInformation replaces one. Understanding the tree means state code stops being boilerplate.',
    studio: 'The session\'s recall sheet: a structured page of every setting, copyable, storable, and re-loadable.',
    uses: ['APVTS state', 'Session save/restore', 'Preset files'],
    mistake: 'Assigning to apvts.state directly. Use replaceState() — it swaps the tree while keeping parameters, atomics and editors coherent.',
    remember: 'The ValueTree is your plugin\'s recall sheet — copy it out to save, replace it to restore.',
    related: ['apvts', 'preset', 'audioprocessor'],
    appears: [{ z: 3, node: 'j15' }, { z: 3, node: 'jb4' }],
    aka: ['value tree', 'replaceState', 'copyState'],
    search: ['state', 'save settings', 'xml', 'session'],
  },
  {
    id: 'slider-attachment', t: 'SliderAttachment', full: 'AudioProcessorValueTreeState::SliderAttachment', c: 'JUCE',
    plain: 'A small object that binds one slider to one parameter, both ways: drag the slider and the parameter updates (host sees it); automation moves the parameter and the slider follows.',
    why: 'Without it you\'d hand-wire callbacks and silently lose automation, gestures and state sync. With it, one constructor call buys the whole professional pipeline.',
    studio: 'A two-way patch cable between a panel knob and the automation bus.',
    uses: ['Every slider↔parameter link', 'ButtonAttachment / ComboBoxAttachment siblings'],
    viz: { t: 'paramflow' },
    mistake: 'Declaring the attachment before its slider. Members destroy in reverse order — the attachment must die first, so declare it after.',
    remember: 'Slider first, attachment after — and all roads run through APVTS.',
    related: ['apvts', 'parameter', 'unique-ptr', 'audioprocessoreditor'],
    appears: [{ z: 3, node: 'j14' }, { z: 3, node: 'jc4' }, { z: 3, node: 'p7' }],
    aka: ['attachment', 'ButtonAttachment'],
    search: ['connect slider', 'knob to parameter', 'binding'],
  },
  {
    id: 'component', t: 'Component', full: 'juce::Component', c: 'JUCE',
    plain: 'The base class of everything visible in JUCE: sliders, labels, buttons, and your editor itself. Each draws itself in paint(), lays out children in resized(), and lives on the message thread.',
    why: 'Your editor is a Component owning child Components — grasp that tree and every JUCE interface, no matter how complex, reads the same way.',
    studio: 'A module in the faceplate: every knob, screen and panel section is one, mounted inside a bigger one.',
    uses: ['Sliders & labels', 'Your editor', 'Meters & custom displays'],
    mistake: 'Forgetting addAndMakeVisible for a child — the component works perfectly and appears never.',
    remember: 'Everything on screen is a Component; visibility is opt-in per child.',
    related: ['audioprocessoreditor', 'gui', 'ui-thread'],
    appears: [{ z: 3, node: 'j13' }],
    aka: ['juce::Slider', 'juce::Label', 'addAndMakeVisible'],
    search: ['slider', 'label', 'widget', 'ui element'],
  },
  {
    id: 'midibuffer', t: 'MidiBuffer', c: 'JUCE',
    plain: 'The container of this block\'s MIDI events, each stamped with a sample position inside the block. processBlock receives one next to the audio buffer.',
    why: 'Sample positions are what make instruments tight: a note-on at sample 137 starts the voice mid-block, not at the block edge. Your Zone 5 synth is built on reading these.',
    studio: 'Cue marks written at exact beats within one bar of the song.',
    uses: ['Synth note input', 'MIDI effects', 'Controller handling'],
    mistake: 'Handling all events at the block start "for simplicity" — that quantizes timing by up to a block and players feel it.',
    remember: 'MIDI arrives sample-stamped — deliver each event at its exact sample.',
    related: ['midi', 'processblock', 'block', 'velocity'],
    appears: [{ z: 3, node: 'j9' }, { z: 5, node: 'n3' }],
    aka: ['midi buffer', 'samplePosition'],
    search: ['midi events', 'note on position', 'midi in block'],
  }
);

/* Retarget existing JUCE entries' Zone 3 appearances to real nodes. */
for (const [id, node] of [
  ['juce', 'j1'], ['audioprocessor', 'j4'], ['audioprocessoreditor', 'j13'],
  ['preparetoplay', 'j6'], ['processblock', 'j7'], ['releaseresources', 'j5'],
  ['apvts', 'j11'], ['audio-buffer', 'j8'], ['cmake', 'j16'], ['vst3', 'j3'],
]) {
  const e = DICT.find((x) => x.id === id);
  if (e) {
    e.appears = e.appears.filter((a) => !(a.z === 3 && !a.node));
    if (!e.appears.some((a) => a.node === node)) e.appears.push({ z: 3, node });
  }
}
