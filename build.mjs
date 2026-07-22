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
  'data_glossary.js',
  'data_glossary_b.js',
  'data_glossary_c.js',
  'data_glossary_d.js',
  'data_glossary_e.js',
  'data_glossary_f.js',
  'data_glossary_g.js',
  'data_glossary_h.js',
  'engine.js',
  'store.js',
  'audio.js',
  'ui.js',
  'viz.js',
  'dict.js',
  'views.js',
  'app.js',
];

const js = JS_ORDER.map((f) => `/* ===== src/js/${f} ===== */\n` + read(`./src/js/${f}`)).join('\n;\n');
const css = read('./src/styles.css');

let html = read('./src/shell.html');
html = html.replace('/*__CSS__*/', () => css);
html = html.replace('//__JS__', () => js);

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
console.log(`Built dist/index.html (${(html.length / 1024).toFixed(1)} KB)`);
