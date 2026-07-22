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
    id: 'z3', num: 3, title: 'JUCE PLUGIN FOUNDATION', status: 'live',
    tagline: 'From AudioProcessor to a loadable VST3',
    desc: 'The real plugin architecture: lifecycle, buffers, APVTS parameters, editors, attachments, state, and the CMake build — culminating in TXPPS First Signal.',
    nodeOrder: [
      'j1', 'j2', 'j3', 'j4', 'jr1', 'j5', 'jo1', 'j6', 'j7', 'jb2',
      'j8', 'jc2', 'jb1', 'p6', 'j9', 'j10', 'j11', 'jc3', 'jr2',
      'j12', 'jc1', 'j13', 'je2', 'j14', 'jc4', 'jb3', 'jr3', 'p7',
      'j15', 'jb4', 'j16', 'je1', 'j17', 'p8', 'boss3',
    ],
  },
  {
    id: 'z4', num: 4, title: 'DSP WORKSHOP', status: 'live',
    tagline: 'From silence to your first synthesized sound',
    desc: 'Digital Signal Processing (DSP) for real: samples, frequency, amplitude, phase, oscillators and the waveform family, envelopes, mixing, stereo, smoothing and aliasing — First Signal becomes a sounding synth.',
    nodeOrder: [
      'd1', 'd2', 'd3', 'dc1', 'd4', 'd5', 'db2', 'd6', 'dr1', 'p9',
      'd7', 'db1', 'de1', 'd8', 'do1', 'p10', 'd9', 'dc3', 'd10', 'db4',
      'd11', 'dc2', 'd12', 'dc4', 'd13', 'd14', 'db3', 'dr2', 'd15',
      'p11', 'boss4',
    ],
  },
  {
    id: 'z5', num: 5, title: 'SYNTH ENGINEERING', status: 'live',
    tagline: 'From sound generator to playable instrument',
    desc: 'How a synthesizer receives notes and performs: MIDI, velocity, voices and polyphony, allocation and stealing, the sustain pedal, pitch bend, mod wheel, mod matrix, unison — First Signal becomes fully playable.',
    nodeOrder: [
      'n1', 'n2', 'n3', 'nr2', 'p12', 'n4', 'n5', 'nr1', 'n6', 'nc2',
      'n7', 'nc1', 'no1', 'nb2', 'n8', 'nr3', 'n9', 'nb1', 'p13',
      'n10', 'nc3', 'nb3', 'n11', 'nc4', 'nb4', 'n12', 'ne1', 'p14',
      'n13', 'n14', 'n15', 'p15', 'boss5',
    ],
  },
  {
    id: 'z6', num: 6, title: 'PROFESSIONAL PLUGIN ENGINEERING', status: 'live',
    tagline: 'From working prototype to shippable product',
    desc: 'What keeps plugins stable inside real DAWs: the real-time deadline, thread safety and lock-free design, allocation rules, denormals, version-safe state, automation, profiling, testing, validation, crash forensics — and the shipping checklist that makes 1.0 mean something.',
    nodeOrder: [
      'r1', 'r2', 'rr1', 'r3', 'rc1', 'r4', 'rb1', 'p16', 'r5', 'rb2',
      'r6', 'rc2', 'r7', 'rr2', 'r8', 'rb4', 'r9', 'rc3', 'p17',
      'r10', 'rc4', 'r11', 'rb3', 'p18', 'r12', 'rr3', 'ro1', 'r13',
      're1', 'r14', 'r15', 'p19', 'boss6',
    ],
  },
  {
    id: 'z7', num: 7, title: 'FINAL PRODUCT MISSIONS', status: 'live',
    tagline: 'You are the engineer now — ship the product line',
    desc: 'Eleven complete product builds — Gain, Tremolo, Delay, Chorus, Distortion, Filter, Mono, Poly, Sampler, Motion FX, and the TXPPS Signature capstone — with briefs, QA tickets, code reviews and release gates. Guidance fades; the engineer remains.',
    nodeOrder: [
      'p20', 'p21', 'f1', 'p22', 'fo1', 'fb1', 'fc1', 'p23', 'fb2',
      'f2', 'p24', 'f3', 'p25', 'fc2', 'p26', 'fr2', 'p27', 'f4',
      'p28', 'fb3', 'fe1', 'p29', 'fr1', 'p30', 'boss7',
    ],
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
  { id: 'zone3_clear', name: 'ZONE 3 CLEARED', desc: 'Make the Silent Plugin sing.' },
  { id: 'first_signal', name: 'FIRST SIGNAL', desc: 'Complete all three Zone 3 missions.' },
  { id: 'zone4_clear', name: 'ZONE 4 CLEARED', desc: 'Repair the Broken Synth.' },
  { id: 'first_sound', name: 'FIRST SOUND', desc: 'Complete all three Zone 4 missions.' },
  { id: 'zone5_clear', name: 'ZONE 5 CLEARED', desc: 'Revive the Forgotten Polysynth.' },
  { id: 'playable_synth', name: 'FULLY PLAYABLE', desc: 'Complete all four Zone 5 missions.' },
  { id: 'zone6_clear', name: 'ZONE 6 CLEARED', desc: 'Beat the Shipping Deadline.' },
  { id: 'release_ready', name: 'RELEASE APPROVED', desc: 'Complete all four Zone 6 missions.' },
  { id: 'zone7_clear', name: 'ZONE 7 CLEARED', desc: 'Ship the Release Candidate.' },
  { id: 'product_line', name: 'PRODUCT LINE', desc: 'Ship all eleven Zone 7 products.' },
  { id: 'graduate', name: '★ GRADUATE ★', desc: 'Complete the entire TXPPS VST CODE LAB curriculum.' },
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
  'j1.q1', 'j4.q1', 'j5.q2', 'j7.q2', 'j8.q1', 'j10.q1', 'j11.q2', 'j14.q1',
  'jc2.q1', 'jb2.q1', 'je2.q1', 'jo1.q1',
  'd1.q1', 'd2.q2', 'd5.q2', 'd6.q3', 'd7.q3', 'd8.q1', 'd9.q1', 'd10.q2',
  'd11.q2', 'd12.q3', 'd13.q3', 'd15.q2', 'dc1.q1', 'db2.q1', 'de1.q1', 'dr1.q2',
  'n1.q1', 'n2.q2', 'n3.q3', 'n5.q2', 'n6.q1', 'n8.q1', 'n9.q1', 'n10.q1',
  'n11.q1', 'n12.q2', 'n13.q2', 'n14.q3', 'nb3.q1', 'ne1.q1',
  'r1.q2', 'r2.q2', 'r3.q1', 'r4.q1', 'r5.q2', 'r6.q1', 'r7.q3', 'r9.q3',
  'r10.q1', 'r11.q3', 'r12.q1', 'r13.q3', 'r14.q1', 'r15.q3', 'rb1.q1', 're1.q1',
  'f1.q1', 'f1.q2', 'f2.q1', 'f2.q2', 'f3.q1', 'f3.q2', 'f4.q1', 'f4.q2',
  'fb1.q1', 'fe1.q1', 'fo1.q1', 'fc2.q1',
];
