// Validates Signal Dictionary data integrity against the curriculum.
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8');

const src = ['data_zones.js', 'data_zone1_lessons.js', 'data_zone1_lessons_b.js', 'data_zone1_challenges.js',
  'data_zone2_lessons.js', 'data_zone2_lessons_b.js', 'data_zone2_challenges.js',
  'data_zone3_lessons.js', 'data_zone3_lessons_b.js', 'data_zone3_challenges.js',
  'data_zone4_lessons.js', 'data_zone4_lessons_b.js', 'data_zone4_challenges.js',
  'data_zone5_lessons.js', 'data_zone5_lessons_b.js', 'data_zone5_challenges.js',
  'data_zone6_lessons.js', 'data_zone6_lessons_b.js', 'data_zone6_challenges.js',
  'data_zone7_lessons.js', 'data_zone7_challenges.js', 'data_zone7_missions.js',
  'data_glossary.js', 'data_glossary_b.js', 'data_glossary_c.js', 'data_glossary_d.js', 'data_glossary_e.js', 'data_glossary_f.js', 'data_glossary_g.js', 'data_glossary_h.js', 'data_glossary_i.js'].map(read).join('\n;\n');
const fn = new Function(src + '\n  return { DICT, DICT_CATS, ZONES, ZONE1_LESSONS, ZONE1_CHALLENGES, ZONE2_LESSONS, ZONE2_CHALLENGES, ZONE3_LESSONS, ZONE3_CHALLENGES, ZONE4_LESSONS, ZONE4_CHALLENGES, ZONE5_LESSONS, ZONE5_CHALLENGES, ZONE6_LESSONS, ZONE6_CHALLENGES, ZONE7_LESSONS, ZONE7_CHALLENGES };');
const { DICT, DICT_CATS, ZONES, ZONE1_LESSONS, ZONE1_CHALLENGES, ZONE2_LESSONS, ZONE2_CHALLENGES, ZONE3_LESSONS, ZONE3_CHALLENGES, ZONE4_LESSONS, ZONE4_CHALLENGES, ZONE5_LESSONS, ZONE5_CHALLENGES, ZONE6_LESSONS, ZONE6_CHALLENGES, ZONE7_LESSONS, ZONE7_CHALLENGES } = fn();

const nodeIds = new Set([...ZONE1_LESSONS, ...ZONE1_CHALLENGES, ...ZONE2_LESSONS, ...ZONE2_CHALLENGES, ...ZONE3_LESSONS, ...ZONE3_CHALLENGES, ...ZONE4_LESSONS, ...ZONE4_CHALLENGES, ...ZONE5_LESSONS, ...ZONE5_CHALLENGES, ...ZONE6_LESSONS, ...ZONE6_CHALLENGES, ...ZONE7_LESSONS, ...ZONE7_CHALLENGES].map((n) => n.id));
const ids = new Set();
const VIZ_TYPES = new Set(['knobToVar', 'chain', 'wave', 'buffer', 'gate', 'selector', 'mult', 'rackPointer', 'blueprint', 'twoLayer', 'adsr', 'filtercurve', 'voices', 'midimsg', 'lifetime', 'owners', 'moveviz', 'lanes', 'fifo', 'filemap', 'lifecycle', 'audioGrid', 'paramflow', 'compare2', 'clipwave', 'mixsum', 'stereopan', 'stepramp', 'lfomod', 'keys', 'voicecards', 'voicelife', 'pedalviz', 'bendwheel', 'modmatrix', 'keytrack', 'unisonviz', 'callbacktime', 'autoviz', 'presetlife', 'denormviz', 'cpumeter', 'testpipe', 'stackviz', 'shipcheck', 'delayviz', 'shaperviz', 'fstimeline']);
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
    if (a.node && !nodeIds.has(a.node)) problems.push(`${where} appears references unknown node: ${a.node}`);
    if (!a.node && !a.label) problems.push(`${where} appears needs node or label`);
    if (a.z < 1 || a.z > 7) problems.push(`${where} bad zone: ${a.z}`);
  }
}
for (const e of DICT) {
  for (const r of e.related || []) if (!ids.has(r)) problems.push(`[${e.id}] related id not found: ${r}`);
}
const dictIds = ids;
for (const l of [...ZONE2_LESSONS, ...ZONE3_LESSONS, ...ZONE4_LESSONS, ...ZONE5_LESSONS, ...ZONE6_LESSONS, ...ZONE7_LESSONS]) {
  for (const b of [...(l.builds || []), ...(l.leads || [])]) {
    if (!dictIds.has(b)) problems.push(`[lesson ${l.id}] builds/leads id not in dictionary: ${b}`);
  }
  for (const sec of l.sections || []) {
    if (sec.viz && !VIZ_TYPES.has(sec.viz.t)) problems.push(`[lesson ${l.id}] unknown viz: ${sec.viz.t}`);
  }
}
for (const z of ZONES.filter((z) => z.status === 'live')) {
  for (const nid of z.nodeOrder) if (!nodeIds.has(nid)) problems.push(`[zone ${z.id}] nodeOrder references unknown node: ${nid}`);
}
console.log(`entries: ${DICT.length}, categories: ${DICT_CATS.length - 1}, z2 nodes: ${ZONE2_LESSONS.length + ZONE2_CHALLENGES.length}, z3 nodes: ${ZONE3_LESSONS.length + ZONE3_CHALLENGES.length}, z4 nodes: ${ZONE4_LESSONS.length + ZONE4_CHALLENGES.length}, z5 nodes: ${ZONE5_LESSONS.length + ZONE5_CHALLENGES.length}, z6 nodes: ${ZONE6_LESSONS.length + ZONE6_CHALLENGES.length}, z7 nodes: ${ZONE7_LESSONS.length + ZONE7_CHALLENGES.length}`);
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('DICTIONARY VALID');
