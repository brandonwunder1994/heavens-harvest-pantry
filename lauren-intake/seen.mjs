// Marks everything Lauren has said so far as handled.
//
//   node seen.mjs
//
// Deliberately separate from check.mjs: reading her messages must never be the
// thing that makes them disappear from the next report. Only run this once her
// answers have actually been acted on.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { thread } from './ghl.mjs';

const STATE = new URL('./state.json', import.meta.url);
const state = existsSync(STATE)
  ? JSON.parse(readFileSync(STATE, 'utf8'))
  : { lastSeenId: null, have: {}, asked: [], notes: [] };

const hers = (await thread()).filter((m) => m.from === 'lauren');
if (hers.length === 0) {
  console.log('Nothing from her yet, so nothing to mark.');
} else {
  state.lastSeenId = hers[hers.length - 1].id;
  writeFileSync(STATE, JSON.stringify(state, null, 2), 'utf8');
  console.log(`Marked ${hers.length} of her messages as handled.`);
}
