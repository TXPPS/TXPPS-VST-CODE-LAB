# TXPPS VST CODE LAB

An interactive training game that teaches professional VST3 / JUCE plugin development in
modern C++ — built for musicians and producers who understand signal flow better than
syntax. Learning is structured as a progression game: short lessons, code challenges,
bug hunts, simulated compiler errors, mini-project missions, and zone boss fights, with
XP, levels, streaks, mastery stars and a practice queue.

**Zone 1 — C++ Signal Path** is fully playable (12 lessons, 16 standalone challenges,
2 mini-projects, 1 boss — ~70 interactive questions). Zones 2–7 are mapped in the
curriculum and ship in future updates.

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
    data_glossary.js         glossary terms with studio analogies
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

## Build & test

```sh
node build.mjs        # produces dist/index.html
```

A Playwright smoke test (boot, navigation, full lesson run, XP, persistence,
storage-blocked mode, mobile overflow, desktop layout) is run against the built file
during development.
