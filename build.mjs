// TXPPS VST CODE LAB — build script
// Concatenates src/ modules into a single self-contained dist/index.html
// (an HTML fragment suitable for publishing as a Claude Artifact page).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const JS_ORDER = [
  'data_zones.js',
  'data_zone1_lessons.js',
  'data_zone1_lessons_b.js',
  'data_zone1_challenges.js',
  'data_zone2_lessons.js',
  'data_zone2_lessons_b.js',
  'data_zone2_challenges.js',
  'data_zone3_lessons.js',
  'data_zone3_lessons_b.js',
  'data_zone3_challenges.js',
  'data_zone4_lessons.js',
  'data_zone4_lessons_b.js',
  'data_zone4_challenges.js',
  'data_zone5_lessons.js',
  'data_zone5_lessons_b.js',
  'data_zone5_challenges.js',
  'data_zone6_lessons.js',
  'data_zone6_lessons_b.js',
  'data_zone6_challenges.js',
  'data_zone7_lessons.js',
  'data_zone7_challenges.js',
  'data_zone7_missions.js',
  'data_glossary.js',
  'data_glossary_b.js',
  'data_glossary_c.js',
  'data_glossary_d.js',
  'data_glossary_e.js',
  'data_glossary_f.js',
  'data_glossary_g.js',
  'data_glossary_h.js',
  'data_glossary_i.js',
  'game_bus.js',
  'qa_access.js',
  'access_policy.js',
  'progression_policy.js',
  'engine.js',
  'store.js',
  'audio.js',
  'ui.js',
  'viz.js',
  'dict.js',
  'game.js',
  'boss.js',
  'qa_fixtures.js',
  'qa_inspector.js',
  'views.js',
  'app.js',
];

let js = JS_ORDER.map((f) => `/* ===== src/js/${f} ===== */\n` + read(`./src/js/${f}`)).join('\n;\n');
const css = read('./src/styles.css');

// v1.2.1: inject the owner-QA passphrase VERIFIER (a one-way hash — never the
// passphrase) from the build environment. If TXPPS_QA_PASSPHRASE_HASH is unset,
// the token is left and qa_access.js falls back to its centralized verifier
// constant. Only the verifier ever ships; a usable secret never does.
const qaVerifier = (process.env.TXPPS_QA_PASSPHRASE_HASH || '').trim();
if (/^[0-9a-f]{64}$/.test(qaVerifier)) js = js.replace('__TXPPS_QA_VERIFIER__', qaVerifier);

let html = read('./src/shell.html');
html = html.replace('/*__CSS__*/', () => css);
html = html.replace('//__JS__', () => js);

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
console.log(`Built dist/index.html (${(html.length / 1024).toFixed(1)} KB)`);
