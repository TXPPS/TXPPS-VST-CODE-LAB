/* ============================================================
   ZONE 6 — PROFESSIONAL PLUGIN ENGINEERING: lessons r1–r8.
   The deadline, threads, races, lock-free thinking, allocation,
   denormals, the prepare contract, and automation.
   ============================================================ */

const ZONE6_LESSONS = [

  /* ------------------------------------------------------ R1 */
  {
    id: 'r1', kind: 'lesson', title: 'The Deadline That Never Moves', short: 'Real-time, for real',
    concepts: ['rt-discipline'], time: '~6 MIN', diff: 2,
    hook: 'A sold-out show. Your synth is on the keyboardist\'s laptop, and mid-chorus the audio hiccups — one crackle, ten thousand people hear it. No stack trace, no error dialog: just a glitch, live. Zone 6 is about why that never gets to happen. It starts with the most unforgiving number in audio: the callback budget.',
    objective: 'Understand the audio callback\'s hard deadline — why WORST-case time matters, not average — and what a missed block sounds like.',
    sections: [
      {
        h: 'The budget, in milliseconds',
        body: 'The host calls processBlock and needs the answer before the sound card runs out of samples. The budget is simply block ÷ rate: **128 samples at 44.1 kHz ≈ 2.9 ms; 512 ≈ 11.6 ms**. Miss it — even once — and the card plays whatever it has: a gap, heard as a click or dropout. There is no partial credit and no retry.',
        viz: { t: 'callbacktime' },
      },
      {
        h: 'Worst case is the only case',
        body: 'Here\'s the mental shift that makes audio engineering different: a function that\'s fast 999 times and slow once is a BROKEN function on the audio thread. Averages are for spreadsheets; the listener hears the worst block. That\'s why the real-time rules ban not slow operations, but **unpredictable** ones — anything whose worst case is unbounded: waiting on locks, touching the disk, asking the OS for memory.',
        analogy: 'Live television. A presenter who\'s brilliant for 59 minutes and freezes for 10 seconds is not "99.7% good" — they\'re unbroadcastable. The audio thread is always on air.',
      },
      {
        h: 'Deterministic beats fast',
        body: 'The professional target isn\'t "as fast as possible" — it\'s **bounded**: the same work, every block, no surprises. A synth that always takes 40% of the budget ships; one that takes 5% usually and 150% during preset loads does not. This zone\'s entire toolkit — atomics, preallocation, denormal guards, profiling — exists to make the worst case equal the average case.',
        warn: 'The budget shrinks with the buffer, and YOU don\'t choose the buffer — the producer does, and live players run small ones (64–128) for low latency. Engineering for 512 and hoping is engineering for half your users.',
      },
    ],
    checks: [
      {
        type: 'predict', concept: 'rt-discipline',
        prompt: 'A session runs 256 samples at 48 kHz. Your processBlock budget?',
        code: '// budget = block / rate',
        options: [
          { t: '≈5.3 ms — 256 ÷ 48000', why: '' },
          { t: '≈48 ms', why: 'That would be nearly TEN times the real budget (48 ms ≈ 2,304 samples at 48k). Block ÷ rate: 256/48000 ≈ 0.00533 s.' },
          { t: '≈21 ms', why: 'That\'s roughly a 1024 block at 48k — this session runs a quarter of that.' },
          { t: 'Whatever the CPU allows', why: 'The CPU sets what you can DO in the budget — the budget itself is fixed by block and rate alone.' },
        ],
        answer: 0,
        explain: '256/48000 ≈ 5.3 ms, every block, forever. Everything Zone 6 teaches is about spending that allowance with zero surprises.',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'A DSP function is fast 999 blocks out of 1000 and overruns once. Professionally, that function is…',
        options: [
          { t: 'Broken — the listener hears the worst block, and one miss is an audible glitch', why: '' },
          { t: 'Fine — 99.9% is a great score', why: 'For a web page, sure. Audio has no retry: the one slow block IS a crackle in someone\'s mix or show.' },
          { t: 'Fine if the average is low', why: 'Averages hide exactly the thing that matters — the deadline is per-block, so the worst case is the spec.' },
          { t: 'Broken only on slow machines', why: 'An unbounded worst case (a lock, an allocation) can spike on ANY machine — speed doesn\'t buy predictability.' },
        ],
        answer: 0,
        explain: 'Real-time means the worst case is the contract. The whole discipline: make the slowest block look like every other block.',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'Why do the real-time rules ban operations by UNPREDICTABILITY rather than by slowness?',
        options: [
          { t: 'A bounded-slow operation can be budgeted; an unpredictable one (lock, disk, malloc) can blow any budget on any block', why: '' },
          { t: 'Slow code is always fine', why: 'Slow-but-bounded can be fine IF it fits the budget — but "slow AND unbounded" is the true poison.' },
          { t: 'Because CPUs vary', why: 'CPU variance scales everything similarly — it\'s operations with no upper bound at all that break the contract.' },
          { t: 'Tradition from the 90s', why: 'The physics haven\'t changed: a sound card that runs dry plays a gap, in 1996 and today.' },
        ],
        answer: 0,
        explain: 'You can budget for known work. You cannot budget for "waits until the OS feels like it" — which is precisely what locks, disk I/O and allocation can do.',
      },
    ],
    recap: [
      'Budget = block ÷ rate: ~2.9 ms at 128/44.1k, ~11.6 ms at 512.',
      'One missed block = one audible glitch. No retries, no partial credit.',
      'Worst case is the spec — averages are irrelevant on the audio thread.',
      'Ban list is about unpredictability: locks, disk, allocation — unbounded waits.',
    ],
    inside: [
      { name: 'First Signal', use: 'about to have its worst case engineered, not hoped for' },
      { name: 'Every DAW\'s CPU meter', use: 'shows budget consumed per block — spikes are the enemy, not the average' },
    ],
    analogyPanel: 'The audio callback is a live radio segment that airs every 3 milliseconds forever. You can prepare anything you like off-air — but when the light goes red, you speak NOW, fully formed, every single time.',
    beginnerMistake: 'Testing only at 512 samples on a fast laptop and declaring it "efficient." The gig runs 64 samples on a hot machine with three other plugins — engineer for the worst venue, not the demo.',
    remember: 'The deadline never moves. Bounded beats fast; the worst block is the only block that matters.',
    builds: ['real-time-audio', 'audio-callback', 'block'],
    leads: ['audio-thread', 'ui-thread'],
  },

  /* ------------------------------------------------------ R2 */
  {
    id: 'r2', kind: 'lesson', title: 'Two Threads, One Plugin', short: 'Who runs where',
    concepts: ['rt-discipline'], time: '~6 MIN', diff: 2,
    hook: 'You drag First Signal\'s gain slider while a chord plays. Two things are happening AT THE SAME TIME — literally, on different CPU cores: your mouse gesture and the audio math. They\'re both inside your plugin, touching the same data. Zones 2 and 3 introduced this; Zone 6 is where it becomes the design center of everything.',
    objective: 'Sort every piece of plugin code onto its thread — and internalize the two golden rules of the boundary.',
    sections: [
      {
        h: 'The two residents',
        body: 'The **audio thread** runs processBlock on the r1 deadline — high priority, no waiting, no excuses. The **message thread** (UI thread) runs everything human-paced: painting, mouse, timers, preset browsers, file dialogs. Slow is FINE there — a 50 ms file dialog hurts nobody. The danger is never either thread alone; it\'s the *boundary* where they share data.',
        viz: { t: 'lanes' },
      },
      {
        h: 'Sorting the codebase',
        body: 'Every function you\'ve written lives somewhere. Audio thread: processBlock and everything it calls — voices, envelopes, the MIDI dispatch (n3 — the MidiBuffer arrives INSIDE processBlock). Message thread: the editor, paint(), sliders, attachment callbacks, preset loading UI. Host-decided: prepareToPlay arrives with audio safely stopped — but setStateInformation can land while audio RUNS (r9 returns to this). Treat both as "not the audio thread — and anything they share with audio must cross through the safe channels."',
        code: '// the sorting, as a habit:\nprocessBlock()            // AUDIO — the deadline\n  └ startNote, render…    // AUDIO — called from it\ncreateEditor(), paint()   // MESSAGE — human-paced\nsliderValueChanged()      // MESSAGE — a finger did this\nprepareToPlay()           // host setup call — audio not running yet',
        codeTitle: 'every line has an address',
      },
      {
        h: 'The two golden rules',
        body: 'Rule one: **the audio thread never waits** — no locks, no allocation, no disk, no logging (r5, r10 make these concrete). Rule two: **shared data crosses the boundary through safe channels only** — atomics for single values (r3), FIFOs for streams (r4). Everything professional about plugin architecture is these two rules applied without exception.',
        warn: 'The sneakiest violations are INDIRECT: a harmless-looking function called from processBlock that, three calls deep, logs a string or grows a vector. The address of a line is decided by its CALLER, not by which file it sits in.',
      },
    ],
    checks: [
      {
        type: 'match', concept: 'rt-discipline',
        prompt: 'Sort each piece of First Signal onto its thread.',
        left: ['the voice render loop', 'gainSlider dragged', 'the n3 MIDI dispatch', 'paint() drawing the panel'],
        right: ['audio — called from processBlock', 'message — a human gesture', 'audio — the MidiBuffer arrives inside processBlock', 'message — screen work is human-paced'],
        explain: 'MIDI dispatch surprises people: it feels like "input," but it arrives inside processBlock and runs on the deadline. The caller decides the address.',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'Why is a 50 ms file-load acceptable on the message thread but catastrophic on the audio thread?',
        options: [
          { t: 'The message thread has no audio deadline — slow just means a briefly busy UI. The audio thread misses ~17 blocks at 128/44.1k: an audible dropout', why: '' },
          { t: 'The message thread is faster', why: 'Usually the opposite! It\'s allowed to be slow — that\'s the point. Deadlines, not speed, divide the threads.' },
          { t: 'Files load instantly on the UI thread', why: 'Same disk, same 50 ms — the difference is that nobody\'s speaker runs dry waiting for a repaint.' },
          { t: 'It isn\'t acceptable anywhere', why: 'It\'s genuinely fine on the message thread — file dialogs, preset browsers and artwork loads do it all day.' },
        ],
        answer: 0,
        explain: '50 ms ÷ 2.9 ms ≈ 17 missed blocks — a very public crackle. The same 50 ms on the message thread is one slightly-late repaint nobody notices.',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'A helper function looks innocent, but processBlock calls it and three calls deep it appends to a std::vector. Where\'s the violation?',
        options: [
          { t: 'On the audio thread — the caller\'s address applies to the whole call chain, and the append can allocate', why: '' },
          { t: 'Nowhere — the function is small', why: 'Size is irrelevant: push_back can reallocate, and reallocation is the r5 forbidden verb, however deep it hides.' },
          { t: 'Only if the vector is large', why: 'ANY growth can trigger reallocation — the unpredictability is the crime, not the byte count.' },
          { t: 'On the message thread', why: 'The message thread didn\'t call it — processBlock did. The call chain inherits the deadline.' },
        ],
        answer: 0,
        explain: 'Thread address is inherited down the call chain. Auditing processBlock means auditing everything it reaches — the sneaky violations are always indirect.',
      },
    ],
    recap: [
      'Audio thread: processBlock + everything it calls, on the r1 deadline.',
      'Message thread: UI, mouse, timers, dialogs — slow is fine there.',
      'Rule 1: the audio thread never waits. Rule 2: shared data crosses via safe channels.',
      'A line\'s thread is decided by its CALLER — violations hide deep in call chains.',
    ],
    inside: [
      { name: 'First Signal', use: 'p16 audits every boundary crossing it has' },
      { name: 'Every plugin ever shipped', use: 'the same two residents, the same two rules — no exceptions granted' },
    ],
    analogyPanel: 'A live band (audio thread) and its front-of-house engineer (message thread). The band never stops playing to chat; the engineer never grabs an instrument mid-song. They communicate through the monitor mix — a channel built for exactly that.',
    beginnerMistake: 'Assuming "my plugin is small, threading won\'t bite me." Threading bugs don\'t scale with plugin size — they scale with boundary crossings, and even a gain knob crosses once. Every plugin is a threaded plugin.',
    remember: 'Two residents, one house: the deadline lives downstairs, the human lives upstairs, and everything they share goes through proper channels.',
    builds: ['audio-thread', 'ui-thread', 'thread'],
    leads: ['race-condition', 'atomic'],
  },

  /* ------------------------------------------------------ R3 */
  {
    id: 'r3', kind: 'lesson', title: 'The Race Condition', short: 'When threads collide',
    concepts: ['thread-safety'], time: '~6 MIN', diff: 2,
    hook: 'A producer automates your filter cutoff and bounces the mix. On one bounce in fifty, there\'s a single-sample spike — a tick nobody can reproduce. QA closes it as "can\'t reproduce." It ships. It ticks on the album. That bug is a race condition, and "can\'t reproduce" is its home address.',
    objective: 'Understand what actually goes wrong when two threads touch one value — torn reads, stale caches, vanishing writes — and why atomics are the fix for single values.',
    sections: [
      {
        h: 'What the hardware really does',
        body: 'Threads run on different cores, and cores keep private caches. Write a plain `float gain` from the UI while audio reads it and three distinct accidents are on the menu: the audio core reads a **stale** cached value (your knob does nothing for a while), reads happen mid-update across a block (**inconsistent** state), or — with types the CPU can\'t move in one step — a **torn** value that\'s half old, half new. The compiler, optimizing single-thread code, can even reorder your writes. None of this is theoretical; all of it is timing-dependent, which is why it "can\'t reproduce."',
        viz: { t: 'lanes', caption: 'two cores, two caches, one plain float — the disagreement is physical' },
      },
      {
        h: 'The atomic contract',
        body: '`std::atomic<float>` buys exactly two promises: every read sees a **whole** value (never torn), and reads/writes are **published** across cores in a well-defined order. That\'s the entire fix for single values — and it\'s why Zone 3\'s APVTS hands the audio thread an atomic pointer per parameter. It was never boilerplate; it was this lesson, pre-installed.',
        code: 'std::atomic<float> cutoffHz { 1200.0f };\n\n// message thread (slider):\ncutoffHz.store(newValue);\n\n// audio thread (per block):\nfloat hz = cutoffHz.load();   // whole, published, never torn',
        codeTitle: 'the safe single-value bridge',
        breakdown: [
          ['store / load', 'the explicit verbs: this value crosses a boundary, and the code SAYS so'],
          ['whole, always', 'no half-written 1204.7-mixed-with-800 monsters — reads see one real value'],
          ['published', 'the other core actually SEES the update, promptly and in order'],
          ['is_always_lock_free', 'on desktop CPUs, atomic float/int/pointer compile to plain fast instructions — check with this if in doubt (Zone 2)'],
        ],
        mistake: { code: 'float cutoffHz = 1200.0f;   // ✗ shared across threads\n// "it\'s just a float, writes are probably atomic anyway"', text: 'On many CPUs a plain aligned float write happens to be atomic AT THE HARDWARE LEVEL — and the code is still broken: the compiler may cache, reorder, or hoist reads out of your loop entirely. std::atomic forbids those optimizations at the exact spot they\'d hurt. "Probably fine" is the race\'s favorite phrase.' },
      },
      {
        h: 'Why races are the worst bug class',
        body: 'A crash gives you a stack trace. A race gives you a *rumor*: rare, timing-dependent, vanishing under the debugger (the debugger changes the timing!), often appearing only on customer machines with different core counts. The professional response isn\'t heroic debugging — it\'s making races **impossible by construction**: every shared value atomic, every shared stream through a FIFO (r4), zero exceptions. You don\'t catch races; you design them out.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'thread-safety',
        prompt: 'Why do race-condition bugs so often vanish when you attach a debugger?',
        options: [
          { t: 'Races are timing-dependent, and the debugger changes the timing — the collision window moves or closes', why: '' },
          { t: 'Debuggers fix memory', why: 'Debuggers observe; they repair nothing. They just make the two threads collide differently — or not at all.' },
          { t: 'They don\'t — races crash under debuggers', why: 'Sometimes! But the classic experience is the opposite: the bug politely disappears while observed, then ships.' },
          { t: 'The compiler removes races in debug builds', why: 'Debug builds change optimization and timing, which HIDES races — removing them requires atomics, not flags.' },
        ],
        answer: 0,
        explain: 'A race is a collision between instants. Anything that shifts the instants — debuggers, logging, a different machine — moves the bug. That\'s why you design races out instead of hunting them.',
      },
      {
        type: 'mcq', concept: 'thread-safety',
        prompt: 'A plain float is written by the UI and read by audio. The CPU happens to write floats atomically. Is the code safe?',
        options: [
          { t: 'No — the COMPILER may still cache, reorder, or hoist the read out of the loop; std::atomic forbids exactly those optimizations here', why: '' },
          { t: 'Yes — hardware atomicity is what matters', why: 'Hardware is only half the story: single-thread optimization legally rewrites your reads unless the type says "shared." That\'s what atomic declares.' },
          { t: 'Yes, if the float is aligned', why: 'Alignment helps the hardware half — the compiler half (caching, reordering) is still fully broken.' },
          { t: 'No, because floats can\'t be shared at all', why: 'They can — wrapped in std::atomic. The sharing isn\'t the sin; the PLAIN sharing is.' },
        ],
        answer: 0,
        explain: 'Two layers must both cooperate: hardware (whole writes) and compiler (no caching/reordering). std::atomic is the only spelling that binds both.',
      },
      {
        type: 'fill', concept: 'thread-safety',
        prompt: 'Read the shared cutoff safely on the audio thread.',
        code: 'std::atomic<float> cutoffHz { 1200.0f };\n// audio thread:\nfloat hz = cutoffHz.___();',
        accept: ['load'],
        placeholder: 'method',
        hint: 'The atomic read verb.',
        explain: 'load() reads whole-and-published. The explicit verb is a feature: every boundary crossing announces itself in the code — auditable at a glance.',
      },
    ],
    recap: [
      'Races: stale reads, torn values, vanished writes — all timing-dependent.',
      '"Can\'t reproduce" is the race\'s signature; debuggers move the timing and hide it.',
      'std::atomic = whole values + published ordering; store()/load() are the verbs.',
      'Design races out (atomics, FIFOs, no exceptions) — you don\'t debug them away.',
    ],
    inside: [
      { name: 'First Signal', use: 'p16 makes every shared value atomic — no plain crossings survive' },
      { name: 'APVTS', use: 'Zone 3\'s parameter atomics were this lesson, shipped as a library' },
    ],
    analogyPanel: 'Two engineers updating one mixing console at once, no talkback: one writes the new fader level while the other reads mid-stroke and hears a level that never existed. The atomic is the talkback protocol — finish the sentence, THEN the other reads.',
    beginnerMistake: 'Testing threading by hammering the UI for a minute and concluding "no glitches, must be safe." Races hide for weeks and surface in a client\'s bounce. Absence of symptoms is not evidence of safety — only design is.',
    remember: 'Shared value → atomic, no exceptions. Races aren\'t debugged; they\'re made impossible.',
    builds: ['race-condition', 'atomic', 'thread'],
    leads: ['lock-free', 'mutex'],
  },

  /* ------------------------------------------------------ R4 */
  {
    id: 'r4', kind: 'lesson', title: 'Lock-Free: Waiting Is Forbidden', short: 'Mutexes, FIFOs, double buffers',
    concepts: ['thread-safety'], time: '~7 MIN', diff: 3,
    hook: 'The obvious fix for sharing is a lock: one thread at a time, everyone else waits. It works beautifully — everywhere except audio. Because on the audio thread, "wait" is the one four-letter word the deadline cannot forgive. This lesson is why pros go lock-free, and the two structures that make it practical.',
    objective: 'Know why mutexes are banned on the audio thread (priority inversion), and how FIFOs and double buffering move streams and bundles safely without waiting.',
    sections: [
      {
        h: 'Why the lock is a trap',
        body: 'A **mutex** makes waiting explicit: if the UI holds the lock when processBlock arrives, audio WAITS. How long? Unbounded — the UI thread might be repainting, or worse, the OS might have paused it entirely. That\'s **priority inversion**: the highest-priority thread in the system stands idle behind a low-priority one holding the key. One contested lock can turn a 3 ms budget into a 40 ms dropout — rarely, unpredictably, at the worst possible gig.',
        viz: { t: 'lanes', blocked: true },
      },
      {
        h: 'The FIFO: a stream without waiting',
        body: 'For *streams* of data (MIDI events to the UI, meter levels, notes for a visualizer), the lock-free answer is Zone 2\'s **FIFO ring buffer**: a pre-allocated ring where one thread writes, one reads, and two atomic positions coordinate them. Nobody ever waits — if the ring is momentarily full, the writer drops or overwrites *by policy*, never by stalling. juce::AbstractFifo packages the index math.',
        viz: { t: 'fifo' },
      },
      {
        h: 'Double buffering: a bundle without tearing',
        body: 'Atomics carry one value; FIFOs carry streams. For a *bundle* that must change together (a whole EQ curve, a wavetable, a preset\'s worth of settings), the pattern is **double buffering**: keep two copies. The audio thread reads copy A; the writer prepares copy B completely, then flips ONE atomic pointer. Audio never sees a half-updated bundle — it sees old-everything or new-everything, atomically.',
        code: 'CurveData buffers[2];\nstd::atomic<CurveData*> live { &buffers[0] };\n\n// message thread: build the OTHER copy fully, then flip\nCurveData* back = (live.load() == &buffers[0]) ? &buffers[1] : &buffers[0];\n*back = newCurve;              // slow is fine here — nobody reads it yet\nlive.store(back);              // ONE atomic flip: all-new, instantly\n\n// audio thread:\nconst CurveData* c = live.load();   // old bundle or new — never a mix',
        codeTitle: 'the whole-bundle flip',
        breakdown: [
          ['two copies', 'the price of never tearing: memory is cheap, dropouts are not'],
          ['build off-line', 'the slow write happens on the copy nobody\'s reading — take your time'],
          ['one atomic flip', 'the entire update becomes a single r3-safe operation'],
          ['reader holds one', 'audio reads a coherent bundle for the whole block — no rug-pulls mid-render'],
        ],
        mistake: { code: 'const juce::ScopedLock sl (curveLock);   // ✗ in processBlock\nreadCurve();', text: 'A lock in processBlock is a dropout with a delay on it: fine in every test, fatal the day the UI holds it during a repaint while the deadline burns. The audio thread does not wait — it reads what\'s ready via atomics, FIFOs, or a flipped buffer.' },
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'thread-safety',
        prompt: 'What is priority inversion?',
        options: [
          { t: 'The highest-priority thread (audio) stuck waiting on a lock held by a lower-priority thread that the OS may not even be running', why: '' },
          { t: 'Audio running at low priority by mistake', why: 'A config bug, but not this one — inversion is correct priorities DEFEATED by a shared lock.' },
          { t: 'The UI running faster than audio', why: 'Speed isn\'t priority — inversion is about the important thread being made to WAIT on the unimportant one.' },
          { t: 'Two locks taken in opposite order', why: 'That\'s deadlock — inversion\'s even nastier cousin. Both are cured the same way here: no locks on the audio thread.' },
        ],
        answer: 0,
        explain: 'The scheduler can pause the UI thread while it holds your lock — and the deadline burns while the most important thread in the system queues behind the least. That\'s why the ban is absolute.',
      },
      {
        type: 'match', concept: 'thread-safety',
        prompt: 'Match each kind of shared data to its lock-free vehicle.',
        left: ['one float (a knob value)', 'a stream (meter levels per block)', 'a bundle that changes together (a wavetable)', 'a parameter the host automates'],
        right: ['std::atomic<float>', 'a FIFO ring buffer', 'double buffering + one atomic pointer flip', 'APVTS — atomics, prepackaged'],
        explain: 'Three shapes of sharing, three vehicles: single values ride atomics, streams ride rings, bundles ride the double-buffer flip. Choosing the right one IS the design skill.',
      },
      {
        type: 'predict', concept: 'thread-safety',
        prompt: 'Mid-flip: the writer finished *back = newCurve but hasn\'t called live.store(back) yet. The audio thread calls live.load(). What does it get?',
        code: '*back = newCurve;\n/* … audio thread reads here … */\nlive.store(back);',
        options: [
          { t: 'The complete OLD bundle — still valid, still coherent; the new one simply isn\'t published yet', why: '' },
          { t: 'A mix of old and new', why: 'Impossible by construction — audio reads through the pointer, which still aims at the untouched old copy.' },
          { t: 'A crash', why: 'Nothing dangles: both buffers live forever, and the pointer always aims at a complete one.' },
          { t: 'The new bundle', why: 'Not until the store() publishes it — that ordering is exactly what the atomic guarantees.' },
        ],
        answer: 0,
        explain: 'The flip means there is no "during": before the store it\'s all-old, after it\'s all-new. The half-written copy is invisible until it\'s finished — that invisibility is the whole pattern.',
      },
    ],
    recap: [
      'Locks make audio WAIT — priority inversion turns one contested lock into a dropout.',
      'Streams cross via pre-allocated FIFO rings; nobody ever stalls.',
      'Bundles cross via double buffering: build the back copy, flip one atomic pointer.',
      'Atomics for values, rings for streams, flips for bundles — waiting for nothing.',
    ],
    inside: [
      { name: 'First Signal', use: 'p16 gives its meter data a FIFO and its params a clean audit' },
      { name: 'juce::AbstractFifo', use: 'the ring\'s index math, shipped — you supply the buffer and the policy' },
    ],
    analogyPanel: 'A restaurant pass: the kitchen (audio) never stops cooking to chat with servers. Orders come in on a spike (FIFO), plates go out on the pass, and the menu changes by printing a NEW menu and swapping the board in one motion (double buffer) — never by editing the board while customers read it.',
    beginnerMistake: 'Reaching for a mutex because the shared thing is "only touched occasionally." Occasionally is exactly when it bites: the one automation pass that lands during a repaint. Frequency doesn\'t matter — the boundary does.',
    remember: 'The audio thread reads what\'s ready and never waits: atomics, rings, and one-pointer flips.',
    builds: ['lock-free', 'mutex', 'ring-buffer'],
    leads: ['double-buffering', 'allocation'],
  },

  /* ------------------------------------------------------ R5 */
  {
    id: 'r5', kind: 'lesson', title: 'Allocation: The Forbidden Verb', short: 'Why new is banned',
    concepts: ['rt-discipline'], time: '~6 MIN', diff: 2,
    hook: 'One line: `std::vector<float> temp(numSamples);` — clean, correct C++, reviewed and approved. In processBlock, it\'s also a random dropout generator that will pass every test on your machine and crackle on a customer\'s. Zone 2 gave you the rule; Zone 6 gives you the WHY, and the audit skills to catch it wearing disguises.',
    objective: 'Understand why heap allocation is banned in the audio callback, and recognize the disguises allocation wears.',
    sections: [
      {
        h: 'What new actually does',
        body: 'Heap allocation asks the memory allocator for space — and the allocator is a shared, global service. It may answer instantly from a free list… or take an internal **lock** another thread holds (r4\'s trap, again), or walk fragmented memory hunting for a block, or even ask the operating system for fresh pages. Its worst case is unbounded — which by r1\'s law makes it broken on the audio thread *even when it\'s usually fast*. Deallocation (`delete`, destructors) is the same service, same ban.',
        viz: { t: 'buffer', n: 8, highlight: 2, label: 'PRE-ALLOCATED IN prepareToPlay — the audio thread only ever reuses', caption: 'everything the callback touches is bought before the show, never during' },
      },
      {
        h: 'The disguises',
        body: 'Nobody writes `malloc` in processBlock. Allocation sneaks in dressed as innocent C++: `push_back` on a full vector (reallocates), constructing a `juce::String` (allocates), `std::function` capture (may allocate), resizing ANY container, logging (builds strings), and locals like `std::vector<float> temp(n)` (allocates every block!). The audit question is never "do I see new?" — it\'s "can anything on this line touch the heap?"',
        code: '// all of these can allocate — none of them says "new":\nactiveNotes.push_back(note);          // ✗ may reallocate\njuce::String msg ("note on");         // ✗ builds heap string\nstd::vector<float> temp (n);          // ✗ allocates EVERY block\nDBG ("gain: " << gain);               // ✗ strings again (r10)\n\n// the professional shape:\n// buy in prepareToPlay…\ntempBuffer.setSize (2, maxBlockSize);\nactiveNotes.reserve (128);\n// …reuse in processBlock\ntempBuffer.clear();                   // ✓ touches existing memory only',
        codeTitle: 'allocation\'s wardrobe',
        breakdown: [
          ['push_back', 'fine until the capacity line — then it silently reallocates and copies everything'],
          ['reserve() in prepare', 'buys the worst-case capacity up front — push_back below capacity is then just a write'],
          ['setSize() in prepare', 'buffers sized for maxBlockSize once — processBlock reuses forever'],
          ['clear() vs resize()', 'clear touches memory you own; resize can buy new memory — one is safe, one is the verb'],
        ],
        mistake: { code: 'void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)\n{\n    std::vector<float> scratch (buffer.getNumSamples());   // ✗\n    …\n}', text: 'A fresh vector per block = a heap transaction 344 times a second at 128/44.1k. It will be fast, fast, fast, then — one fragmented afternoon on one laptop — slow, and that block crackles. Scratch space is bought once, in prepareToPlay.' },
      },
      {
        h: 'The r1 connection, sealed',
        body: 'Notice this is r1\'s principle wearing memory clothes: allocation isn\'t banned for being slow (it\'s often microseconds) — it\'s banned for being **unbounded**. The fix is always the same shape: move the unpredictable purchase to prepareToPlay (where there\'s no deadline), and let the callback reuse what it owns. Pros audit with tools, too: some run debug allocators that assert the moment the audio thread touches the heap.',
      },
    ],
    checks: [
      {
        type: 'bugspot', concept: 'rt-discipline',
        prompt: 'This processBlock passed review — "no new anywhere." Tap the disguised allocation.',
        code: [
          'void processBlock (juce::AudioBuffer<float>& buffer,',
          '                   juce::MidiBuffer& midi)',
          '{',
          '    for (const auto metadata : midi)',
          '        heldNotes.push_back (metadata.getMessage()',
          '                                     .getNoteNumber());',
          '    renderVoices (buffer);',
          '}',
        ],
        buggy: 4,
        explain: 'push_back on the audio thread: the moment heldNotes outgrows its capacity, it reallocates — a heap purchase mid-deadline. Either reserve() worst-case capacity in prepareToPlay (making push_back a plain write), or use a fixed array with a count.',
        fix: 'heldNotes.reserve(128); // in prepareToPlay — capacity bought off-deadline',
      },
      {
        type: 'mcq', concept: 'rt-discipline',
        prompt: 'Why is allocation banned even though it\'s USUALLY microseconds-fast?',
        options: [
          { t: 'Its worst case is unbounded — allocator locks, fragmentation walks, OS page requests — and r1 says the worst case is the spec', why: '' },
          { t: 'Allocation is always slow', why: 'It\'s usually quick — that\'s what makes the bug so sneaky. "Usually" is not a real-time word.' },
          { t: 'Audio threads have no heap access', why: 'They CAN touch the heap — nothing stops them. The ban is engineering discipline, not a hardware wall.' },
          { t: 'Memory is scarce', why: 'Quantity isn\'t the issue — predictability is. A gigabyte pre-allocated in prepare is fine; sixteen bytes mid-callback is not.' },
        ],
        answer: 0,
        explain: 'The allocator is a shared global service with locks inside. Usually-fast + occasionally-unbounded = broken on the deadline, by definition.',
      },
      {
        type: 'match', concept: 'rt-discipline',
        prompt: 'Match each line to its verdict in processBlock.',
        left: ['tempBuffer.clear()', 'scratch.resize(n)', 'notes.push_back(x) after reserve(128), count < 128', 'juce::String s ("hi")'],
        right: ['safe — touches owned memory only', 'forbidden — can buy new memory', 'safe — capacity exists, it\'s a plain write', 'forbidden — heap string construction'],
        explain: 'The audit question line by line: can this touch the heap? clear() no; resize() yes; push_back below reserved capacity no; String construction yes. Verbs, not appearances.',
      },
    ],
    recap: [
      'Heap allocation/deallocation has an unbounded worst case — banned in the callback.',
      'Disguises: push_back, String, resize, std::function, per-block locals, logging.',
      'The shape of the fix: buy in prepareToPlay (setSize, reserve), reuse in processBlock.',
      'Audit by verb — "can this line touch the heap?" — not by whether you see new.',
    ],
    inside: [
      { name: 'First Signal', use: 'its pools (voices n5, matrix rows n13) were this rule all along — p18 audits the rest' },
      { name: 'Pro test rigs', use: 'debug allocators that ASSERT on audio-thread heap use — the rule, automated' },
    ],
    analogyPanel: 'A live drummer doesn\'t stop mid-song to buy a new snare head — everything that might be needed tonight was bought, mounted and tuned at soundcheck. processBlock is the song; prepareToPlay is soundcheck; the music store is closed during the set.',
    beginnerMistake: 'Believing the ban is about speed and "modern allocators are fast." They are — usually. You aren\'t banning the microseconds; you\'re banning the once-a-week millisecond that lands mid-chorus on someone else\'s machine.',
    remember: 'Buy at soundcheck, reuse on stage. If a line can touch the heap, it doesn\'t belong in the callback.',
    builds: ['allocation', 'heap', 'real-time-audio'],
    leads: ['denormals', 'cpu'],
  },

  /* ------------------------------------------------------ R6 */
  {
    id: 'r6', kind: 'lesson', title: 'Denormals: The Invisible Brake', short: 'Tiny numbers, huge cost',
    concepts: ['performance-eng'], time: '~6 MIN', diff: 2,
    hook: 'A producer reports: "your synth is light on CPU… until a few seconds after I stop playing. Then the meter CLIMBS while nothing is sounding." Nothing is exactly the problem: as tails fade toward silence, the numbers get so small the CPU switches into a slow-motion emergency mode — for values you cannot even hear.',
    objective: 'Know what denormal numbers are, why they can make float math 10–100× slower, and how one line in processBlock removes the entire problem.',
    sections: [
      {
        h: 'The floor below the floor',
        body: 'Floats normally can\'t get smaller than about 1.2 × 10⁻³⁸. Below that, the format switches to **denormal numbers** (also called subnormals) — a special encoding that keeps microscopic values from snapping to zero. Mathematically noble; practically, many CPUs handle denormals in **microcode assist** — tens to hundreds of times slower than normal float math. And where do endlessly-shrinking values come from in audio? Every decaying tail: releases, reverbs, filter memories, all sliding toward zero forever.',
        viz: { t: 'denormviz' },
      },
      {
        h: 'The one-line cure',
        body: 'Desktop CPUs have flags — flush-to-zero (FTZ) and denormals-are-zero (DAZ) — that make hardware treat denormals AS zero: full speed, and the "lost" values are ~10⁻³⁸, roughly 760 dB below full scale. Nobody\'s ears will file a complaint. JUCE wraps the flags in a scoped guard, set on entry to processBlock, restored on exit:',
        code: 'void processBlock (juce::AudioBuffer<float>& buffer,\n                   juce::MidiBuffer& midi)\n{\n    juce::ScopedNoDenormals noDenormals;   // FTZ/DAZ for this scope\n    // … render as usual — tails now decay to a clean 0.0\n}',
        codeTitle: 'the brake, released',
        breakdown: [
          ['ScopedNoDenormals', 'sets the CPU flags on construction, restores them on destruction — RAII from Zone 2, guarding a CPU mode'],
          ['per callback', 'the flags are per-thread state — setting them inside the callback covers exactly your rendering'],
          ['~760 dB down', 'the values being flushed are astronomically below hearing — the trade is free'],
        ],
        mistake: { code: 'if (std::abs(s) < 1.0e-15f)   // ✗ manual denormal patrol\n    s = 0.0f;', text: 'Hand-checking every signal path costs a branch per sample per path, misses the filter states you forgot, and still leaves internal feedback values denormal. The CPU flags fix ALL paths at once, for free. One guard beats a hundred ifs.' },
      },
      {
        h: 'Recognizing the symptom',
        body: 'Denormal trouble has a signature: CPU **rises as audio falls silent** — the opposite of intuition. Tails, releases and reverbs feed ever-smaller values into feedback paths, and the meter climbs seconds AFTER the last note. If you ever see quiet-but-expensive, check the guard before profiling anything. (First Signal has carried ScopedNoDenormals since d6 — now you know which disaster it was quietly preventing.)',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'The CPU meter climbs several seconds AFTER the player stops, while tails fade. Classic cause?',
        options: [
          { t: 'Denormals — decaying values shrink below ~10⁻³⁸ and the CPU handles them in slow microcode', why: '' },
          { t: 'A memory leak', why: 'Leaks eat RAM, not per-block CPU — and they don\'t care whether audio is fading.' },
          { t: 'The UI repainting', why: 'Different thread — the AUDIO meter climbing during silence points into the callback itself.' },
          { t: 'Voices failing to free', why: 'Stuck voices cost their normal amount — the signature here is normal audio cheap, near-silence expensive.' },
        ],
        answer: 0,
        explain: 'Quiet-but-expensive is the denormal fingerprint: the smaller the values, the slower the math. One scoped guard, symptom gone.',
      },
      {
        type: 'fill', concept: 'performance-eng',
        prompt: 'Install the guard at the top of the callback.',
        code: 'void processBlock (juce::AudioBuffer<float>& buffer,\n                   juce::MidiBuffer& midi)\n{\n    juce::___ noDenormals;\n    // render…\n}',
        accept: ['ScopedNoDenormals'],
        placeholder: 'class',
        hint: 'The RAII guard First Signal has carried since d6.',
        explain: 'ScopedNoDenormals: flags set on entry, restored on exit — Zone 2\'s RAII pattern guarding a CPU mode instead of memory. Every serious plugin\'s processBlock opens this way.',
      },
      {
        type: 'mcq', concept: 'performance-eng',
        prompt: 'Is flushing denormals to zero audible?',
        options: [
          { t: 'No — the flushed values sit around 760 dB below full scale, astronomically beneath hearing, dither, and every converter on Earth', why: '' },
          { t: 'Yes, tails get truncated', why: 'The tail still decays through the entire audible range normally — only the sub-10⁻³⁸ ghost of it snaps to zero.' },
          { t: 'Only on high-end monitors', why: 'No monitor made reproduces −760 dBFS — thermal noise in the cables is louder by dozens of orders of magnitude.' },
          { t: 'Yes, it adds distortion', why: 'Flushing is a clean snap-to-zero of inaudibly small values — no new harmonics anywhere near the audible range.' },
        ],
        answer: 0,
        explain: 'The trade is 10–100× speed for values no physical system can reproduce. It\'s the rare engineering decision with no downside — which is why it\'s universal.',
      },
    ],
    recap: [
      'Denormals: float\'s sub-10⁻³⁸ encoding — correct math, brutally slow on many CPUs.',
      'Audio makes them constantly: every tail, release and reverb decays toward zero.',
      'ScopedNoDenormals sets FTZ/DAZ for the callback — all paths fixed, one line.',
      'Signature: CPU CLIMBS as audio fades. Quiet-but-expensive = check the guard.',
    ],
    inside: [
      { name: 'First Signal', use: 'the guard has opened its processBlock since d6 — now with its reason attached' },
      { name: 'Reverbs everywhere', use: 'long feedback tails are denormal factories — every pro reverb ships the guard' },
    ],
    analogyPanel: 'A car that drives perfectly at every speed above 1 mph, but below it the engine drops into a limp mode burning 50× the fuel — to creep at a pace no passenger can perceive. Flush-to-zero just says: below 1 mph, we\'re parked.',
    beginnerMistake: 'Profiling a "mysterious CPU spike" for a day before checking whether the denormal guard exists. It\'s one line; check it FIRST. The exotic-looking symptom has the boring fix.',
    remember: 'Tails breed denormals; denormals eat CPUs. One scoped guard, entire problem gone.',
    builds: ['denormals', 'cpu', 'float'],
    leads: ['preparetoplay', 'profiling'],
  },

  /* ------------------------------------------------------ R7 */
  {
    id: 'r7', kind: 'lesson', title: 'The Prepare Contract', short: 'Rates, sizes, resets',
    concepts: ['lifecycle-eng'], time: '~6 MIN', diff: 2,
    hook: 'A producer opens your synth in a 44.1k session, then the mastering engineer reopens the project at 96k. Or bounces offline — where the host may use a different block size and call prepareToPlay again mid-life. Every number you computed from the sample rate is now wrong unless you recompute it. This lesson is the contract that keeps First Signal correct in ALL of those worlds.',
    objective: 'Treat prepareToPlay as a binding contract: recompute every rate-dependent value, size every buffer, reset every stateful thing — every time it\'s called.',
    sections: [
      {
        h: 'What the contract says',
        body: 'prepareToPlay(sampleRate, maxBlockSize) is the host saying: "here are the NEW rules — be ready." The contract has three clauses. **Recompute** everything derived from the rate: increments (d5), envelope times (d9/p11), smoother ramps (j12), LFO steps. **Size** every buffer for maxBlockSize and channel count. **Reset** stateful things to a clean start: kill voices, clear delay memories, snap smoothers to current values. And crucially: it can be called MANY times per plugin life — after rate changes, device changes, offline bounces — so it must be *re-runnable*, never assume-it-only-runs-once.',
        code: 'void prepareToPlay (double sampleRate, int samplesPerBlock) override\n{\n    // 1) RECOMPUTE rate-derived values\n    adsr.setSampleRate (sampleRate);\n    gainSmoothed.reset (sampleRate, 0.02);\n    updateAllVoiceIncrements();          // d5 math at the NEW rate\n\n    // 2) SIZE working memory (r5: buy here, reuse there)\n    scratchBuffer.setSize (2, samplesPerBlock);\n\n    // 3) RESET state to a clean start\n    allNotesOff (true);                  // n15\'s hard panic\n    gainSmoothed.setCurrentAndTargetValue (currentGain());\n}',
        codeTitle: 'the three clauses',
        breakdown: [
          ['recompute', 'any number born from a rate is stale the moment the rate changes'],
          ['size', 'maxBlockSize is the worst case the host promises — buy exactly that'],
          ['reset', 'stale voices and delay memories from the old world must not leak into the new one'],
          ['re-runnable', 'the host calls this whenever it likes — idempotent setup or subtle bugs'],
        ],
        mistake: { code: 'phaseIncrement = twoPi * 440.0 / 44100.0;   // ✗ rate hard-coded\n// "everyone uses 44.1 anyway"', text: 'At 96 kHz the same step is taken 96,000 times a second instead of 44,100 — every pitch lands more than an octave SHARP (this "A440" renders at ≈958 Hz). Hard-coded rates are wrong at every other rate, and you don\'t choose the session. The rate arrives in prepareToPlay; use the argument.' },
      },
      {
        h: 'releaseResources: the mirror',
        body: '**releaseResources()** is the host saying "playback stopped; I may not call you for a while." It\'s the polite place to let go of BIG transient resources (a huge sample buffer you can re-acquire in prepare). For most synths it\'s nearly empty — and that\'s correct. What it must NEVER do: leave the plugin unable to survive the next prepareToPlay. The pair is a cycle (Zone 3\'s lifecycle: prepare ⇄ release, many times), not a birth and a funeral.',
      },
      {
        h: 'Reset behavior: the third rail',
        body: 'When the host stops and restarts the transport, users expect SILENCE, then the new take — not the previous take\'s reverb tail or a chord held from before. That\'s reset discipline: on prepare (and on transport-stop if you handle it), stateful audio memory gets cleared — voices killed (n15\'s hard panic), delays zeroed, smoothers snapped (not glided) to their current values so playback starts clean instead of fading in from stale numbers.',
        warn: 'Snapping smoothers uses setCurrentAndTargetValue — the ONE correct use of "jump immediately." In processBlock that same call would be the r8 zipper bug; in prepare it\'s exactly right. Same method, opposite verdicts — the address decides (r2).',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'lifecycle-eng',
        prompt: 'A project made at 44.1k reopens at 96k. Which category of values MUST be recomputed in prepareToPlay?',
        options: [
          { t: 'Everything derived from the sample rate: increments, envelope times, smoother ramps, LFO steps', why: '' },
          { t: 'Only the buffer sizes', why: 'Sizes too — but the rate-derived MATH is the silent killer: same increment at 96k = wrong pitch, wrong times, wrong ramps.' },
          { t: 'Nothing — JUCE adapts automatically', why: 'JUCE hands you the new rate; adapting is YOUR contract. Every 2π·f/fs you ever wrote is stale.' },
          { t: 'Only user-visible parameters', why: 'Parameters keep their musical values — it\'s the internal DERIVED numbers (per-sample steps) that must be reborn.' },
        ],
        answer: 0,
        explain: 'The d2 rule in production: every time-based value is a conversion through the rate. New rate, new conversions — all of them, every prepare.',
      },
      {
        type: 'bugspot', concept: 'lifecycle-eng',
        prompt: 'After a rate change, this synth\'s notes hold over and its envelope times are wrong. Tap the missing discipline\'s neighbor — the line that shows setup was treated as run-once.',
        code: [
          'void prepareToPlay (double sampleRate, int samplesPerBlock)',
          '{',
          '    if (alreadyPrepared)',
          '        return;',
          '    adsr.setSampleRate (sampleRate);',
          '    scratchBuffer.setSize (2, samplesPerBlock);',
          '    alreadyPrepared = true;',
          '}',
        ],
        buggy: 2,
        explain: 'The early-return makes prepare run once per LIFE instead of once per WORLD: the second call (new rate, new block size) is ignored — stale envelope rates, stale sizes, held state. prepareToPlay must be re-runnable: do the work EVERY call.',
        fix: 'Delete the alreadyPrepared guard — recompute, resize and reset on every call',
      },
      {
        type: 'mcq', concept: 'lifecycle-eng',
        prompt: 'Where is setCurrentAndTargetValue (snap, no glide) CORRECT, and where is it a bug?',
        options: [
          { t: 'Correct in prepareToPlay/reset (start clean, no fade-in from stale values); a zipper-adjacent bug in processBlock (it defeats the ramp)', why: '' },
          { t: 'Correct everywhere', why: 'In processBlock it makes every parameter change SNAP — the exact staircase d13 taught you to fear.' },
          { t: 'A bug everywhere', why: 'On reset it\'s the right call: gliding from a stale value means every playback start fades in weirdly.' },
          { t: 'Only correct in the editor', why: 'The editor doesn\'t touch smoothers directly — this is an engine-side decision, and the ADDRESS decides it.' },
        ],
        answer: 0,
        explain: 'Same method, two verdicts: snap at world-boundaries (prepare, reset, preset load), glide during rendering. r2\'s lesson again — the caller\'s context is the meaning.',
      },
    ],
    recap: [
      'prepareToPlay\'s three clauses: recompute rate-math, size buffers, reset state.',
      'It runs MANY times per life — must be re-runnable, never guarded to run once.',
      'releaseResources: let go of big transients; keep the plugin prepare-able.',
      'Reset = silence guaranteed: kill voices, clear memories, SNAP smoothers.',
    ],
    inside: [
      { name: 'First Signal', use: 'p17/p19 verify it survives 44.1→96k reopen and offline bounce unchanged' },
      { name: 'Offline bounce', use: 'hosts re-prepare with different sizes for rendering — the contract\'s stress test' },
    ],
    analogyPanel: 'A touring band\'s changeover: new venue (rate), new stage size (block), and the crew re-tunes, re-patches and zeroes the desk EVERY night. The band that assumes "same as yesterday" plays one great show and six broken ones.',
    beginnerMistake: 'Testing rate changes by… never testing them. Open your session at 48k, 96k, and bounce offline — three minutes of testing that catches the single most common "works here, broken there" report.',
    remember: 'Every prepare is a new world: recompute, resize, reset. And prepare runs whenever the host says so.',
    builds: ['preparetoplay', 'releaseresources', 'sample-rate'],
    leads: ['automation', 'state-versioning'],
  },

  /* ------------------------------------------------------ R8 */
  {
    id: 'r8', kind: 'lesson', title: 'Automation: The Invisible Performer', short: 'The host plays your knobs',
    concepts: ['automation-eng'], time: '~6 MIN', diff: 2,
    hook: 'A producer draws a filter sweep across the drop — a curve in the timeline, rendered by YOUR plugin. Automation is the host performing your knobs: inhumanly fast, sample-locked, in every take identical. It\'s also the most demanding user your parameters will ever have, and the fastest way to expose every weakness this zone has discussed.',
    objective: 'Understand how host automation reaches your DSP, why it stresses parameters harder than hands do, and the professional recipe for smooth automated sound.',
    sections: [
      {
        h: 'How the curve reaches your code',
        body: 'The producer\'s drawn curve lives in the host. During playback the host sets your **parameters** (the Zone 3 APVTS ones) to follow it — from its own threads, at its own cadence, typically once or a few times per block. Your audio thread reads the atomic values (r3) each block and glides between them with smoothers (d13). Draw → set → read → glide: the pipeline you already own, now driven by a robot.',
        viz: { t: 'autoviz' },
      },
      {
        h: 'Why automation is the stress test',
        body: 'Hands move one knob, slowly, sometimes. Automation moves MANY parameters, every block, for the whole song — and bounces render it faster than real time. Every weak link gets found: a non-atomic share races (r3), a missing smoother zippers (d13), work done per-parameter-change that should be per-block burns CPU, and a snap where a glide belongs clicks on every curve point. If your plugin sounds right under dense automation and offline bounce, it\'s probably right everywhere.',
        code: '// the professional per-block parameter read (First Signal\'s shape):\nvoid processBlock (…)\n{\n    juce::ScopedNoDenormals nd;\n    gainSmoothed.setTargetValue (\n        juce::Decibels::decibelsToGain (gainParam->load()));\n    cutoffSmoothed.setTargetValue (cutoffParam->load());\n    // … then per-sample: getNextValue() glides (d13)\n}',
        codeTitle: 'read once per block, glide per sample',
        breakdown: [
          ['->load() per block', 'atomic read of wherever the curve is NOW — cheap, race-free, once per block'],
          ['setTargetValue', 'declares the destination; the smoother spreads the journey (d13)'],
          ['NOT per sample', 'reading params per sample buys nothing — the host doesn\'t update faster than blocks anyway'],
          ['NOT per change', 'no callbacks into DSP on parameter changes — the audio thread PULLS state; nothing pushes into it'],
        ],
        mistake: { code: 'void parameterChanged (const String& id, float v)   // ✗ pushing into DSP\n{\n    recalcFilterCoefficients (v);   // on whatever thread the host used!\n}', text: 'Reacting to parameter changes with immediate DSP recalculation runs your math on the HOST\'s thread — racing the audio thread that\'s using those coefficients right now. The professional pattern is pull: audio reads atomics per block and recalculates on its own schedule.' },
      },
      {
        h: 'Automation vs. gestures: both must work',
        body: 'One more contract: parameters must behave identically whether a human drags the slider (message thread → attachment → APVTS) or the host plays the curve (host → APVTS). Same atomic, same smoother, same sound. If you ever find yourself special-casing "was this the user?", the architecture has drifted — the APVTS pipeline exists so both performers play the same instrument.',
      },
    ],
    checks: [
      {
        type: 'mcq', concept: 'automation-eng',
        prompt: 'Why does automation expose bugs that hand-testing never finds?',
        options: [
          { t: 'It changes many parameters, every block, all song — and offline bounces render faster than real time. Density and speed find every weak link', why: '' },
          { t: 'Automation uses special parameter types', why: 'Same parameters, same APVTS — it\'s the USAGE intensity that differs, not the machinery.' },
          { t: 'It bypasses the smoothers', why: 'It shouldn\'t! If it does, that IS the bug — the pipeline must be identical for hands and curves.' },
          { t: 'Hosts send corrupted values', why: 'Hosts send perfectly normal values — relentlessly, densely, at bounce speed. The relentlessness is the test.' },
        ],
        answer: 0,
        explain: 'Hands are gentle testers; robots are thorough ones. Dense automation + offline bounce is the cheapest stress test you\'ll ever run.',
      },
      {
        type: 'bugspot', concept: 'automation-eng',
        prompt: 'Automated sweeps CLICK at every curve point on this synth. Tap the snap where a glide belongs.',
        code: [
          'void processBlock (…)',
          '{',
          '    float target = cutoffParam->load();',
          '    cutoffSmoothed.setCurrentAndTargetValue (target);',
          '    for (int i = 0; i < buffer.getNumSamples(); ++i)',
          '        renderSample (cutoffSmoothed.getNextValue());',
          '}',
        ],
        buggy: 3,
        explain: 'setCurrentAndTargetValue SNAPS the smoother — every block\'s new automation value lands as a step, and d13 taught you what steps are: clicks. In processBlock the call is setTargetValue; the snap version belongs only at world boundaries (r7).',
        fix: 'cutoffSmoothed.setTargetValue (target);',
      },
      {
        type: 'mcq', concept: 'automation-eng',
        prompt: 'Why do pros PULL parameter values in processBlock instead of reacting to change callbacks?',
        options: [
          { t: 'Callbacks arrive on host/UI threads — reacting there races the audio thread. Pulling atomics per block keeps all DSP math on the deadline thread, on schedule', why: '' },
          { t: 'Callbacks are too slow', why: 'Speed isn\'t the issue — the THREAD is: the callback runs wherever the host pleases, and your DSP state doesn\'t live there.' },
          { t: 'Pulling uses less memory', why: 'Memory is a wash — thread ownership is the entire argument.' },
          { t: 'JUCE has no parameter callbacks', why: 'It does (parameterChanged) — useful for UI concerns; wrong as a trigger for audio-thread math.' },
        ],
        answer: 0,
        explain: 'Pull, don\'t push: the audio thread reads state when IT is ready. Nothing external ever reaches into the deadline — r2\'s golden rules, applied to parameters.',
      },
    ],
    recap: [
      'Automation = the host performing your parameters: draw → set → atomic read → glide.',
      'It\'s the stress test: dense, constant, faster than real time on bounces.',
      'Per block: load() atomics, setTargetValue; per sample: getNextValue. Never snap mid-render.',
      'Pull, don\'t push: no DSP recalculation inside parameter-change callbacks.',
    ],
    inside: [
      { name: 'First Signal', use: 'p16\'s audit certifies its pipeline identical for hands and curves' },
      { name: 'Every mix you admire', use: 'hundreds of automation lanes driving plugins exactly this way' },
    ],
    analogyPanel: 'Automation is a player piano roll for your plugin\'s knobs: the same keys a human plays, struck by machine — faster, denser, perfectly repeatable. An instrument that only sounds good under gentle hands isn\'t finished; the roll finds every sticky key.',
    beginnerMistake: 'Testing parameters by dragging sliders and calling it done. Draw a fast LFO-like automation curve on EVERY parameter and bounce offline — ten minutes that finds races, zippers and CPU cliffs your hands never will.',
    remember: 'The host is your most demanding performer: read per block, glide per sample, and let nothing push into the deadline.',
    builds: ['automation', 'parameter', 'parameter-smoothing'],
    leads: ['state-versioning', 'preset'],
  },
];
