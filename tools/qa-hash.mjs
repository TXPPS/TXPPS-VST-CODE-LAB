// tools/qa-hash.mjs — compute the owner-QA passphrase VERIFIER hash.
//
// Usage:
//   node tools/qa-hash.mjs "your-owner-passphrase"
//
// Prints the salted SHA-256 hex to embed as TXPPS_QA_PASSPHRASE_HASH at build
// time (or as the fallback constant in src/js/qa_access.js). The passphrase is
// only read from argv and never written anywhere — do NOT commit it. Keep the
// SALT below identical to src/js/qa_access.js or existing verifiers won't match.
import { createHash } from 'node:crypto';

const SALT = 'TXPPS::qa::v1::';
const pass = process.argv[2];
if (!pass) {
  console.error('Usage: node tools/qa-hash.mjs "your-owner-passphrase"');
  process.exit(1);
}
const hex = createHash('sha256').update(Buffer.from(SALT + pass, 'utf8')).digest('hex');
console.log(hex);
console.error('\nTo use it:  TXPPS_QA_PASSPHRASE_HASH=' + hex + ' node build.mjs');
console.error('(the passphrase itself was not stored — only this one-way hash is printed)');
