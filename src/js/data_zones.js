/* ============================================================
   Curriculum structure: zones, node order, levels, achievements.
   Zone 1 node content lives in data_zone1_lessons.js and
   data_zone1_challenges.js and is stitched together in app.js.
   ============================================================ */

const ZONES = [
  {
    id: 'z1', num: 1, title: 'C++ SIGNAL PATH', status: 'live',
    tagline: 'The C++ core every plugin is built on',
    desc: 'Variables, functions, control flow, containers, pointers, classes and compiler errors — taught through gain stages, buffers and oscillators.',
    nodeOrder: [
      'l1', 'l2', 'l3', 'c1', 'l4', 'l5', 'e1', 'l6', 'o1', 'c2',
      'l7', 'b1', 'c3', 'l8', 'l9', 'b2', 'e2', 'p1', 'l10', 'o2',
      'l11', 'c4', 'b3', 'l12', 'e3', 'c5', 'o3', 'b4', 'c6', 'p2', 'boss1',
    ],
  },
  {
    id: 'z2', num: 2, title: 'MODERN C++ FOR AUDIO', status: 'live',
    tagline: 'Professional C++ techniques used in real VST plugins',
    desc: 'Ownership, RAII, smart pointers, move semantics, atomics and lock-free thinking — modern C++ taught entirely through plugin development.',
    nodeOrder: [
      'm1', 'm2', 'm3', 'mo1', 'm4', 'mc1', 'me1', 'm5', 'm6', 'mb1',
      'mc2', 'm7', 'mb2', 'p3', 'm8', 'mc3', 'm9', 'me2', 'm10', 'mb3',
      'm11', 'mc4', 'p4', 'm12', 'm13', 'mb4', 'm14', 'mc5', 'mo2',
      'm15', 'p5', 'boss2',
    ],
  },
  {
    id: 'z3', num: 3, title: 'JUCE PLUGIN FOUNDATION', status: 'planned',
    tagline: 'AudioProcessor to a loadable VST3',
    desc: 'The JUCE plugin lifecycle, APVTS parameters, state, MIDI and audio buffers, buses, and CMake builds.',
    topics: ['AudioProcessor', 'AudioProcessorEditor', 'prepareToPlay / processBlock / releaseResources', 'APVTS & parameter layouts', 'ValueTree state', 'attachments', 'MIDI & audio buffers', 'buses & formats', 'standalone + VST3 builds', 'CMake structure'],
  },
  {
    id: 'z4', num: 4, title: 'DSP WORKSHOP', status: 'planned',
    tagline: 'Oscillators, filters, delays, smoothing',
    desc: 'Sample-accurate DSP: phase, envelopes, delay lines, interpolation, aliasing, denormals, wet/dry and stereo.',
    topics: ['sample rate & buffer size', 'phase / amplitude / frequency', 'oscillators', 'envelopes', 'filters', 'gain & parameter smoothing', 'delay lines & interpolation', 'distortion & oversampling', 'aliasing & denormals', 'wet/dry & stereo'],
  },
  {
    id: 'z5', num: 5, title: 'SYNTH ENGINEERING', status: 'planned',
    tagline: 'Voices, polyphony, MIDI, modulation',
    desc: 'Voice allocation and stealing, note lifecycle, velocity, pitch bend, unison, mod matrices and presets.',
    topics: ['voices & polyphony', 'note ownership & stealing', 'note-on / note-off', 'velocity & sustain', 'pitch bend & mod wheel', 'unison', 'modulation matrices', 'preset management', 'panic behavior', 'sample-accurate events'],
  },
  {
    id: 'z6', num: 6, title: 'PROFESSIONAL PLUGIN ENGINEERING', status: 'planned',
    tagline: 'Thread safety, testing, shipping',
    desc: 'Lock-free communication, deterministic DSP tests, crash debugging, profiling, validation and packaging.',
    topics: ['audio/UI thread safety', 'lock-free FIFOs', 'deterministic DSP tests', 'regression testing', 'debugging crashes', 'profiling', 'automation & preset compatibility', 'version migration', 'DAW validation & scanning', 'installers & accessibility'],
  },
  {
    id: 'z7', num: 7, title: 'FINAL PRODUCT MISSIONS', status: 'planned',
    tagline: 'Ship complete plugins',
    desc: 'Guided end-to-end builds: from a gain plugin to a commercially presentable VST3 instrument.',
    topics: ['Gain plugin', 'Tremolo', 'Delay', 'Chorus', 'Distortion', 'Filter effect', 'Mono synth', 'Poly synth', 'Sampler', 'Modulation effect', 'Complete commercial VST3'],
  },
];

/* Cumulative XP required to reach each level (index 0 = level 1). */
const LEVELS = [0, 150, 400, 750, 1200, 1750, 2400, 3150, 4000, 5000, 6200, 7600, 9200, 11000, 13000];
const LEVEL_TITLES = [
  'Bedroom Coder', 'Patch Tweaker', 'Signal Tracer', 'Module Builder', 'DSP Apprentice',
  'Buffer Wrangler', 'Class Architect', 'Pointer Handler', 'Compiler Whisperer', 'Signal Engineer',
  'Plugin Craftsman', 'Rack Architect', 'DSP Journeyman', 'Audio Systems Engineer', 'Plugin Professional',
];

const ACHIEVEMENTS = [
  { id: 'power_on', name: 'POWER ON', desc: 'Complete your first lesson.' },
  { id: 'signal_present', name: 'SIGNAL PRESENT', desc: 'Earn 100 XP.' },
  { id: 'clean_take', name: 'CLEAN TAKE', desc: 'Finish any lesson with 3 stars.' },
  { id: 'gain_staged', name: 'GAIN STAGED', desc: 'Complete the Gain Utility mini-project.' },
  { id: 'osc_online', name: 'OSCILLATOR ONLINE', desc: 'Complete the Sine Oscillator mini-project.' },
  { id: 'bug_squasher', name: 'BUG SQUASHER', desc: 'Clear all four bug-hunt challenges.' },
  { id: 'error_reader', name: 'ERROR READER', desc: 'Clear all three compiler-error challenges.' },
  { id: 'hot_streak', name: 'HOT STREAK', desc: 'Keep a 3-day streak.' },
  { id: 'studio_regular', name: 'STUDIO REGULAR', desc: 'Keep a 7-day streak.' },
  { id: 'daily_driver', name: 'DAILY DRIVER', desc: 'Complete 5 daily challenges.' },
  { id: 'level_5', name: 'LEVEL 5', desc: 'Reach level 5.' },
  { id: 'zone1_clear', name: 'ZONE 1 CLEARED', desc: 'Defeat the Zone 1 boss.' },
  { id: 'zone2_clear', name: 'ZONE 2 CLEARED', desc: 'Exorcise the Haunted Synth.' },
  { id: 'modern_hands', name: 'MODERN HANDS', desc: 'Complete all three Zone 2 missions.' },
];

/* XP rewards by node kind (first completion; retries of questions inside give partial). */
const XP_RULES = {
  lesson: 60,
  challenge: 40,
  project: 100,
  boss: 250,
  daily: 40,
  practiceQuestion: 10,
};

/* Question ids used for the daily-challenge rotation (self-contained questions only). */
const DAILY_POOL = [
  'l1.q1', 'l1.q3', 'l2.q1', 'l3.q1', 'l4.q1', 'l4.q3', 'l5.q1', 'l6.q1',
  'l6.q2', 'l7.q1', 'l7.q3', 'l8.q1', 'l9.q1', 'l9.q2', 'l10.q1', 'l10.q2',
  'l11.q2', 'l12.q1', 'l12.q2', 'c1.q1', 'b1.q1', 'e1.q1', 'o1.q1', 'b4.q1',
  'm1.q1', 'm3.q1', 'm4.q2', 'm6.q1', 'm8.q3', 'm9.q2', 'm13.q1', 'm14.q3',
  'mc1.q1', 'mb4.q1', 'me1.q1', 'mb2.q1',
];
