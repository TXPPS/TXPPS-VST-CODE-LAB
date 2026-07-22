// Validates Signal Dictionary data integrity against the curriculum.
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8');

const src = ['data_zones.js', 'data_zone1_lessons.js', 'data_zone1_lessons_b.js', 'data_zone1_challenges.js',
  'data_glossary.js', 'data_glossary_b.js', 'data_glossary_c.js'].map(read).join('\n;\n');
const fn = new Function(src + '\n  return { DICT, DICT_CATS, ZONES, ZONE1_LESSONS, ZONE1_CHALLENGES };');
const { DICT, DICT_CATS, ZONES, ZONE1_LESSONS, ZONE1_CHALLENGES } = fn();

const nodeIds = new Set([...ZONE1_LESSONS, ...ZONE1_CHALLENGES].map((n) => n.id));
const ids = new Set();
const VIZ_TYPES = new Set(['knobToVar', 'chain', 'wave', 'buffer', 'gate', 'selector', 'mult', 'rackPointer', 'blueprint', 'twoLayer', 'adsr', 'filtercurve', 'voices', 'midimsg']);
const problems = [];

for (const e of DICT) {
  const where = `[${e.id}]`;
  if (ids.has(e.id)) problems.push(`${where} duplicate id`);
  ids.add(e.id);
  for (const f of ['id', 't', 'c', 'plain', 'why', 'studio', 'mistake', 'remember']) {
    if (!e[f] || typeof e[f] !== 'string') problems.push(`${where} missing field: ${f}`);
  }
  if (!Array.isArray(e.uses) || e.uses.length === 0) problems.push(`${where} missing uses`);
  if (!Array.isArray(e.related) || e.related.length === 0) problems.push(`${where} missing related`);
  if (!Array.isArray(e.appears) || e.appears.length === 0) problems.push(`${where} missing appears`);
  if (!DICT_CATS.includes(e.c)) problems.push(`${where} unknown category: ${e.c}`);
  if (e.viz && !VIZ_TYPES.has(e.viz.t)) problems.push(`${where} unknown viz type: ${e.viz.t}`);
  for (const a of e.appears || []) {
    if (a.z === 1 && a.node && !nodeIds.has(a.node)) problems.push(`${where} appears references unknown node: ${a.node}`);
    if (a.z !== 1 && !a.label) problems.push(`${where} future-zone appears needs a label`);
    if (a.z < 1 || a.z > 7) problems.push(`${where} bad zone: ${a.z}`);
  }
}
for (const e of DICT) {
  for (const r of e.related || []) if (!ids.has(r)) problems.push(`[${e.id}] related id not found: ${r}`);
}
console.log(`entries: ${DICT.length}, categories: ${DICT_CATS.length - 1}`);
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('DICTIONARY VALID');
