// What has Lauren said, and what is still missing.
//
//   node check.mjs
//
// Run on a schedule. It prints her new messages and the shortest honest summary
// of where the intake has got to. It never writes anything: reading is safe to
// repeat, and writing is not.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { since, thread } from './ghl.mjs';
import { readSettings } from './db.mjs';

const STATE = new URL('./state.json', import.meta.url);

const WANTED = [
  ['flavors', 'Her flavours, what is in each, and the allergens'],
  ['prices', 'What a bag costs and what a jar costs'],
  ['delivery', 'Delivery days, areas, and any drop-off spot'],
  ['photos', 'A few photographs'],
  ['story', 'A few sentences on how she started'],
  ['phone', 'A number customers can text'],
  ['stripe', 'A Stripe account, so she can take cards'],
  ['cottage', "Arizona's free cottage food registration"],
];

const state = existsSync(STATE)
  ? JSON.parse(readFileSync(STATE, 'utf8'))
  : { lastSeenId: null, have: {}, asked: [], notes: [] };

const fresh = await since(state.lastSeenId);
const all = await thread();

console.log(`Thread: ${all.length} messages, ${all.filter((m) => m.from === 'lauren').length} from Lauren.`);

if (fresh.length === 0) {
  console.log('\nNothing new from her.');
} else {
  console.log(`\n${fresh.length} new from Lauren:\n`);
  for (const m of fresh) {
    console.log(`  [${m.at.slice(0, 16).replace('T', ' ')}]`);
    console.log(`  ${m.body.replace(/\n/g, '\n  ')}`);
    if (m.attachments.length) console.log(`  (${m.attachments.length} attachment(s))`);
    console.log('');
  }
  console.log('  ^ these have NOT been marked seen. Run `node seen.mjs` once they are handled.');
}

// What is actually saved on the shop, which is the only record that counts.
const saved = await readSettings();
const savedKeys = new Set(saved.map((r) => r.key));

console.log('\nStill outstanding:');
let outstanding = 0;
for (const [key, what] of WANTED) {
  const done = state.have[key] || savedKeys.has(key);
  if (!done) outstanding++;
  console.log(`  ${done ? '[x]' : '[ ]'} ${what}`);
}
console.log(`\n${WANTED.length - outstanding} of ${WANTED.length} in. The shop still shows placeholders for the rest.`);

writeFileSync(
  STATE,
  JSON.stringify({ ...state, lastChecked: new Date().toISOString() }, null, 2),
  'utf8',
);
