# TXPPS VST CODE LAB

An interactive training game that teaches professional VST3 / JUCE plugin development in
modern C++ — built for musicians and producers who understand signal flow better than
syntax. Learning is structured as a progression game: short lessons, code challenges,
bug hunts, simulated compiler errors, mini-project missions, and zone boss fights, with
XP, levels, streaks, mastery stars and a practice queue.

**The curriculum is complete — all seven zones are fully playable**:
Zone 1 (C++ Signal Path), Zone 2 (Modern C++ for Audio), Zone 3 (JUCE Plugin
Foundation — building the TXPPS First Signal gain plugin), Zone 4 (DSP
Workshop — First Signal becomes a sounding synth), Zone 5 (Synth Engineering —
First Signal becomes a playable instrument), Zone 6 (Professional Plugin
Engineering — First Signal becomes a shippable product) and Zone 7 (Final
Product Missions — eleven complete product builds from TXPPS Gain to the
TXPPS Signature commercial-VST3 capstone, ending at the Release Candidate
final boss and permanent Graduate status). This is Version 1.0 of the
TXPPS VST CODE LAB curriculum.

Every lesson is written producer-first: it opens with a familiar studio situation
(the hook), explains what happens behind the panel, introduces the C++ with a
piece-by-piece breakdown of every token, shows an inline SVG diagram (knob→memory,
signal chains, buffer slots, gates, selectors, patchbay mults, rack pointers,
blueprint→units, panel/circuit layers), and closes with four panels: 🎛 Inside a
Real Plugin, 🎹 Studio Analogy, ⚠ Common Beginner Mistake, and 💡 Remember This.

## Running it

The build output `dist/index.html` is a self-contained HTML fragment (inline CSS + JS,
no dependencies, no network calls) designed to be published as a Claude Artifact page —
it also works wrapped in any plain HTML document. Progress persists in `localStorage`
(with a defensive in-memory fallback and JSON export/import when storage is blocked).

## Honesty by design

The app contains **no C++ compiler**. All build feedback is deterministic, produced by a
structured validation engine, and labeled **“Simulated Compiler Feedback”** in the UI.
Code samples are educational excerpts — intentionally simplified, never claimed to be
production-ready.

## Architecture

```
src/
  shell.html                 HTML skeleton (title, viewport, mount point)
  styles.css                 design system — "studio at night" dark theme
  js/
    data_zones.js            zones 1–7 map, node order, levels, achievements, XP rules
    data_zone1_lessons.js    lessons 1–6: hook, sections, viz specs, breakdowns,
                             checks, recap, end panels
    data_zone1_lessons_b.js  lessons 7–12 (same shape, appended)
    data_zone1_challenges.js standalone challenges, mini-projects, boss stages
    data_zone2_*.js          Zone 2 lessons & challenges (same shapes)
    data_zone3_*.js          Zone 3 lessons & challenges (same shapes)
    data_zone4_*.js          Zone 4 lessons & challenges (same shapes)
    data_zone5_*.js          Zone 5 lessons & challenges (same shapes)
    data_zone6_*.js          Zone 6 lessons & challenges (same shapes)
    data_zone7_*.js          Zone 7 lessons, tickets & the 11-product line
    data_glossary*.js        Signal Dictionary mini-lesson entries (parts a–i)
    engine.js                pure challenge evaluation (no DOM): fill/mcq/order/
                             bugspot/match validation, seeded shuffles, daily pick
    store.js                 progress state + safe persistence (localStorage w/ fallback)
    audio.js                 optional WebAudio feedback blips
    ui.js                    DOM helpers, C++ highlighter, shared widgets
    viz.js                   data-driven SVG lesson diagrams (palette-matched)
    views.js                 every screen + the shared question runner
    app.js                   router, chrome, XP/achievement notifications, boot
build.mjs                    concatenates src → dist/index.html
dist/index.html              the deployable artifact (committed)
```

Content is pure data; presentation is generic components. Question types: `mcq`,
`predict`, `fill` (accept-list + targeted mistake patterns), `order`, `bugspot`,
`compiler` (simulated error + fix choice), `match`. Adding a lesson or zone means
adding data objects and a `nodeOrder` entry — no view code.

The data shapes are deliberately framework-neutral so the app can be migrated to a
Vite + TypeScript + React PWA without rewriting content.

## Backlog

- Zone 2–7 challenge and boss nodes are not yet shown in the profile
  mastery table (lessons are).
- Daily-challenge selection could weight toward the learner's weak concepts.
- (Both deferred to the post-1.0 refinement phase.)

## Build & test

```sh
node build.mjs        # produces dist/index.html
```

A Playwright smoke test (boot, navigation, full lesson run, XP, persistence,
storage-blocked mode, mobile overflow, desktop layout) is run against the built file
during development.
