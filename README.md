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

**Version 1.0.2 — Single Local Profile** gives the app one local learner
profile, like a single signed-in account (no cloud, no password, no
network). On first launch a centered modal overlay — rendered above the app
shell, not as a section in the page — collects a display name, username,
optional bio and avatar and creates the one profile; afterwards it loads on
its own every visit and the overlay never returns. The profile is viewed and
edited from the Profile tab (editing never changes the profile id or touches
progress); a backup can be exported to / imported from a human-readable JSON
file (import replaces the single profile, backing the current one up first);
and a clearly-labelled reset returns the app to first-launch. Every earlier
save — a pre-1.0.1 single save, or a 1.0.1 profile / multi-profile
registry — is migrated into the one profile with no progress lost, backing up
prior data before any cleanup.

**Version 1.1.0 — PATCH: Living Workshop Assistant** adds a game-feel layer on
top of the finished course, without touching any curriculum, grading,
progression, or save behaviour. Course logic emits semantic events on a typed
Game Event Bus; a set of isolated directors (PATCH, Animation, Audio, Haptic,
Reaction, Accessibility) turn those into restrained reactions — an original
inline-SVG workshop robot with a CRT/oscilloscope face and a state machine,
short synthesized sounds (no files, no network), capability-honest haptics
(browser vibration where it exists, a pluggable adapter for a future native
iOS bridge), and answer/navigation/milestone feedback. Everything is
independently adjustable (PATCH presence Full/Balanced/Minimal/Hidden, effects
intensity, reduced motion, particles, per-category audio volumes, haptics) and
degrades safely: a failure in any decorative subsystem can never reach grading,
navigation, or saving, and every result stays clear in text with PATCH hidden
and audio off. Boss/graduation events are reserved as hooks only — not
implemented in this pass. **Version 1.1.1** is a focused visual correction that
re-centres PATCH's waveform mouth beneath its eyes across every face state,
using one shared mouth coordinate system so no state can drift.

**Version 1.2.0 — Haptic Expansion & Zone 1 Boss** expands the haptic system
into a semantic category vocabulary (one centralized pattern table, global +
per-category cooldowns, critical events superseding minor ones, an honest
Test control, and a documented adapter contract so a future native iOS shell
can inject Core Haptics without touching course code — iPhone browsers still
honestly report "unavailable"). It also introduces BossKit, a reusable
data-driven boss framework (`boss.js`): definitions reference curriculum
nodes (no duplicated questions), and a pure deterministic session state
machine mirrors the existing runner's resolutions as boss HP, player signal
integrity, and phases — grading, retries, XP, stars, and achievements stay
byte-identical to the legacy rules. The Zone 1 encounter (THE BROKEN GAIN
PLUGIN) is the vertical slice: corruption bar with a repair-threshold marker,
integrity cells, three phases, early defeat only when passing is already
mathematically impossible, and PATCH assisting from the dock. Bosses 2–7
keep the legacy flow until future releases.

**Version 1.2.1 — Owner QA layer** adds a hidden, local-only quality-assurance
tool for the owner: a passphrase-gated Owner Access entry inside Settings (a
five-tap / five-Enter gesture on the version row), a temporary **QA Mode** that
opens every zone and node for inspection, and a Curriculum Inspector for direct
navigation to any lesson/quiz/challenge/mission/project/boss with real-vs-QA
status, boss state-machine simulation, PATCH previews, and honest haptic
diagnostics. Access decisions route through one `AccessPolicy`; permanent
writes/rewards route through one `ProgressionPolicy` / `RewardPolicy` that
suppresses XP, stars, ranks, achievements, streaks, boss stats, and node
completion while QA Mode is active — so inspecting content never touches genuine
learner progress. A clearly-labelled **TXPPS QA** test profile (built from
validated fixtures, with the real profile stashed and restorable) supports
deliberate persistent testing. See **Honest security limitations** below.

**Version 1.3.0 — Boss Campaign Framework** promotes the Zone 1 BossKit into
a reusable, seven-zone campaign. One registry (`boss_campaign.js`) defines all
seven bosses and one service (`boss_campaign_service.js`) owns lookup,
sequencing, availability, campaign progress, idempotent victory observation and
safe session persistence — deferring to `AccessPolicy`, `ProgressionPolicy` and
`RewardPolicy` with no scattered QA checks. Zone 1 stays the **production**
reference encounter for real learners. Zones 2–7 register **development**
encounters (`dev_boss2`…`dev_boss7`) that run the *real* BossKit on deterministic
curriculum-derived prompts but are **QA-only** — clearly labelled "DEVELOPMENT
ENCOUNTER — QA ONLY", launchable from the expanded Owner QA **Boss Campaign**
panel, and never presented to learners (who keep fighting the untouched legacy
Zone 2–7 bosses). The encounter shell is now shared: intro (concepts, PATCH
briefing, keyboard/screen-reader friendly), the HP/integrity HUD with live text
labels, phase transitions, an enhanced victory summary (accuracy, concepts
demonstrated, rewards granted **or** suppressed-in-QA, next unlock) and defeat
flow (review/retry), plus a validated, production-only session resume. Rewards
stay authoritative and idempotent; QA simulations and development encounters
never touch real progression.

**Version 1.3.1 — Zone 2 Boss: Ownership Crisis** promotes Zone 2 from a
development encounter to the first fully-authored production BossKit boss, and
sets the quality bar for future educational bosses. Themed as a corrupting
memory-ownership graph (no fantasy lore — it reads like debugging a real system),
its six technically-accurate stages teach modern C++ ownership through gameplay
across three phases: **Who Owns This?** (stack vs heap, object lifetime, dangling
references), **Resource Repair** (unique_ptr, ownership transfer via `std::move`,
RAII destructors), and **Ownership Cascade** (double ownership / double delete,
shared_ptr reference cycles broken with weak_ptr). Correct answers describe the
repair, wrong answers the engineering consequence (leaked, orphaned, double
delete) — PATCH stays supportive throughout with authored briefing / victory /
defeat dialogue, and a reused ownership-graph diagram lightly illustrates the
intro. It runs on the same shared encounter shell (HUD, phases, victory/defeat,
retry, resume) and the same Owner QA campaign console; Zones 3–7 remain
development encounters.

**Version 1.3.2 — Zone 3 Boss: Signal Integrity** promotes Zone 3 to a
production BossKit encounter that feels like diagnosing a professional audio
engine rather than fantasy combat. A failing signal path is losing integrity, and
its six technically-accurate stages teach core audio-DSP concepts through gameplay
across three phases: **Signal Diagnosis** (recognise hard clipping past ±1.0 /
0 dBFS from a flat-topped scope, and out-of-band aliasing folding back under
Nyquist — `|44100 − 30000| = 14100 Hz`), **Repair Chain** (gain staging and
headroom — a linear ×8 is +18 dB, so −3 dBFS clips — and inserting a high-pass to
reject a 0 Hz DC offset), and **Signal Stabilisation** (correcting per-channel
buffer flow, `getWritePointer(ch)` not `(0)`, and ordering an oversampling
pipeline — upsample → process → downsample — so distortion harmonics cannot
alias). Correct answers name the fix in DSP terms, wrong answers name the audible
consequence; PATCH acts as an engineering mentor with authored briefing / victory
/ defeat dialogue, and a clipped-waveform scope lightly illustrates the intro. It
reuses the same shared encounter shell (HUD, phases, victory/defeat, retry,
resume) and the same Owner QA campaign console. Zones 1–3 are now production
encounters; Zones 4–7 remain development encounters (QA-only).

**Version 1.3.3 — Zone 4 Boss: Plugin Architect** promotes Zone 4 to a
production BossKit encounter framed as the architecture review of a failing
commercial plugin — the capstone of the JUCE architecture taught across Zone 3.
Its six technically-accurate stages teach plugin architecture through gameplay
across three phases: **Broken Architecture** (the processor/editor split — DSP
state must live in the processor because the host destroys the editor freely,
and rate-dependent setup belongs in `prepareToPlay`, not a constructor guessing
44100), **Repair Communication** (host automation lands only on registered APVTS
parameters — a knob writing a plain member bypasses it — and per-sample
`getNextValue()` smoothing turns block-rate steps into an inaudible glide), and
**Production Stability** (the real-time contract: no heap allocation in
`processBlock`, and defensive state restoration ordered parse → validate →
`replaceState`). Correct answers name the repair, wrong answers the engineering
consequence; PATCH mentors as a senior plugin engineer with authored briefing /
victory / defeat dialogue, and the existing parameter-flow diagram (slider →
attachment → APVTS → atomic → smoother → audio, with the automation inlet)
illustrates the intro. Stale glossary "appears" links were retargeted to match
the new boss content. Zones 1–4 are now production encounters; Zones 5–7 remain
development encounters (QA-only).

**Version 1.3.4 — Zone 5 Boss: Real-Time Guardian** promotes Zone 5 to a
production BossKit encounter framed as the performance pass of a release review:
a commercial synth that sounds perfect on the bench but glitches under
production load. Its six technically-accurate stages teach real-time audio
engineering across three phases: **Performance Diagnosis** (a mutex shared with
the message thread makes the callback's worst case unbounded — real-time is a
worst-case contract, not an average-case one — and a CPU spike on fading tails
is denormal floats hitting the microcode slow path, fixed with flush-to-zero /
`juce::ScopedNoDenormals`), **Real-Time Stabilisation** (an allocating note-on
becomes a pre-allocated voice pool, and the GUI meter is fed through a
`std::atomic<float>` the editor polls on its own timer — no locks, no
allocation, no GUI work on the audio thread), and **Production Load Test**
(hard-cut voice stealing is a step discontinuity — a click — so production
synths fade the victim for a few milliseconds first, and the finale orders a
single-producer/single-consumer ring-buffer handoff: write the slot, publish the
index with a release-store, consume behind an acquire-load). PATCH mentors as a
Lead Performance Engineer ("we measure: worst case, not average case"); the
existing callback-deadline diagram ("worst case IS the spec") illustrates the
intro. The zone5_clear achievement and all pre-boss lead-ins that promised the
old synth-repair encounter were retargeted in the same pass. Zones 1–5 are now
production encounters; Zones 6–7 remain development encounters (QA-only).

Every lesson is written producer-first: it opens with a familiar studio situation
(the hook), explains what happens behind the panel, introduces the C++ with a
piece-by-piece breakdown of every token, shows an inline SVG diagram (knob→memory,
signal chains, buffer slots, gates, selectors, patchbay mults, rack pointers,
blueprint→units, panel/circuit layers), and closes with four panels: 🎛 Inside a
Real Plugin, 🎹 Studio Analogy, ⚠ Common Beginner Mistake, and 💡 Remember This.

## Running it

The build output `dist/index.html` is a self-contained HTML fragment (inline CSS + JS,
no dependencies, no network calls) designed to be published as a Claude Artifact page —
it also works wrapped in any plain HTML document. The single local profile persists in
`localStorage` as one versioned, checksummed save object, written with a current +
previous double buffer so a corrupted save is detected on load and the previous one is
restored automatically. Autosave fires on every completion, achievement, profile edit
and settings change, on a 30-second heartbeat, and when the tab is hidden or closed; a
`storage`-event listener keeps a second tab from overwriting newer progress. A defensive
in-memory fallback keeps everything working (for the session) when storage is blocked,
and the profile can be exported to / imported from JSON.

## Honesty by design

The app contains **no C++ compiler**. All build feedback is deterministic, produced by a
structured validation engine, and labeled **“Simulated Compiler Feedback”** in the UI.
Code samples are educational excerpts — intentionally simplified, never claimed to be
production-ready.

## Owner QA layer (v1.2.1)

A hidden, entirely local quality-assurance tool that lets the owner inspect and
test the whole app without completing every prerequisite by hand.

**Reveal & unlock.** Settings → the **Version** row: activate it five times
(five taps, or focus it and press Enter five times) to open the Owner Access
dialog. Enter the owner passphrase to reveal the Owner QA panel. Owner access is
session-scoped (it survives a same-tab reload via a `sessionStorage` flag that
holds *no* secret, and clears on tab close, browser restart, or **Lock Owner
Access**). QA Mode itself always starts **off** on load.

**Honest security limitations.** This is a browser app with **no trusted
backend**, so this is a *local access gate*, not account security. It only
prevents accidental discovery and ordinary-user access; a determined user can
still read or modify client code. The passphrase is **never** stored, sent over
a network, or written into profile data, storage, exports, logs, diagnostics, or
GameBus payloads. Only a one-way **verifier hash** ever ships. Comparison uses
Web Crypto where available (secure contexts) and a self-contained SHA-256
fallback otherwise, so it works identically offline / on `file://`. Repeated
wrong attempts trigger a short local cooldown — no lockout, no clues, no network.

**Passphrase / verifier configuration.** The verifier is injected at build time
from `TXPPS_QA_PASSPHRASE_HASH` (a salted SHA-256 hex); if unset, a centralized
fallback verifier constant in `src/js/qa_access.js` is used. To **rotate** the
owner passphrase, compute a new verifier and rebuild:

```sh
node tools/qa-hash.mjs "your-new-owner-passphrase"      # prints the hash only
TXPPS_QA_PASSPHRASE_HASH=<that-hash> node build.mjs      # bakes it into dist
```

or paste the new hash into the `FALLBACK_VERIFIER` constant. See `.env.example`.
Never commit the passphrase or a real `.env` (both are git-ignored).

**QA Mode (temporary access).** With QA Mode on, `AccessPolicy` opens every valid
node and a persistent “QA MODE — progression & rewards are simulated” indicator
shows on every screen. `ProgressionPolicy` / `RewardPolicy` suppress *all*
permanent writes — XP, stars, ranks, achievements, streaks, boss stats, node
completion, graduation — so grading, sheets and events still run but nothing is
saved. Turning QA Mode off restores normal locks immediately and, if the open
route is now locked, returns you to the map. Locking Owner Access also exits QA
Mode. QA state never appears in profile exports and never syncs between tabs.

**QA test profile.** “Create QA Test Profile” stashes your real profile and
installs a clearly-labelled **TXPPS QA** profile built from a validated preset
(clean / zone-1 / boss-ready / mid-course / all-zones / graduation). It uses the
real completion factories, is labelled everywhere (and in exports as
`isQaProfile: true`), and is fully restorable via **Restore real profile**. A QA
profile — with QA Mode off — is where deliberate persistent/destructive testing
happens.

**Run the QA tests.** `node build.mjs`, then the Playwright suites
`qatest.mjs` (authorization, access policy, reward suppression, boss QA) and
`qashots.mjs` (responsive + accessibility). Tests inject a throwaway **test**
verifier (`QaAccess.setTestVerifier`) — the real owner passphrase never appears
in any test file.

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
    game_bus.js              typed Game Event Bus — course logic emits semantic
                             events; the reaction layer subscribes (isolated)
    qa_access.js             owner QA authorization: salted SHA-256 verifier
                             (Web Crypto + JS fallback), session marker,
                             attempt cooldown, QA-mode state (v1.2.1)
    access_policy.js         one authority for canOpenNode/Zone/Boss — normal
                             rules in normal mode, open-all under QA (v1.2.1)
    progression_policy.js    one authority for shouldPersist/shouldGrant —
                             suppresses permanent writes/rewards in QA (v1.2.1)
    qa_fixtures.js           validated QA test-profile presets, built from the
                             live curriculum via the real factories (v1.2.1)
    qa_inspector.js          owner UI: indicator, access dialog, QA panel,
                             Curriculum Inspector, boss/PATCH/haptic tools (v1.2.1)
    game.js                  PATCH the workshop assistant + Animation / Audio /
                             Haptic / Reaction / Accessibility directors (v1.1.0)
    boss.js                  BossKit — data-driven boss encounter framework:
                             definitions reference curriculum nodes; a pure
                             deterministic session mirrors runner results as
                             HP / integrity / phases (v1.2.0 Zone 1 slice; v1.3.0
                             adds auto-phases + QA-only dev_boss definitions; v1.3.1–
                             v1.3.4 author production boss2–boss5)
    boss_campaign.js         one registry of all seven zone bosses — production
                             (Zones 1–5) vs development (Zones 6–7), fields, order (v1.3.0)
    boss_campaign_service.js campaign authority: lookup, sequencing, availability,
                             progress, idempotent victory, safe session persistence;
                             defers to Access/Progression/Reward policies (v1.3.0)
    engine.js                pure challenge evaluation (no DOM): fill/mcq/order/
                             bugspot/match validation, seeded shuffles, daily pick
    store.js                 single-profile state + progress; versioned checksummed
                             saves, current+backup double buffer, corruption recovery,
                             1.0.1 + legacy migration, edit / import-replace / export
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
