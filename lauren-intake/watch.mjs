// Watches Lauren's thread continuously and writes a line the moment she texts.
//
//   node watch.mjs        (leave running)
//
// The timer-based check missed two of her messages for forty-five minutes,
// because a timer only knows what time it is, not what has happened. This polls
// every forty seconds and appends to inbox.log, which something else can watch
// and wake on. A person waiting on a reply notices four minutes; they very much
// notice forty-five.

import { appendFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { thread } from './ghl.mjs';

const LOG = new URL('./inbox.log', import.meta.url);
const SEEN = new URL('./watched.json', import.meta.url);
const EVERY_MS = 40_000;

let seen = existsSync(SEEN) ? new Set(JSON.parse(readFileSync(SEEN, 'utf8')).ids) : new Set();

// Anything already on the thread at start-up is not news.
try {
  for (const m of await thread()) if (m.from === 'lauren') seen.add(m.id);
  writeFileSync(SEEN, JSON.stringify({ ids: [...seen] }, null, 2), 'utf8');
  console.log(`watching. ${seen.size} of her messages already handled.`);
} catch (error) {
  console.log('could not reach the thread at start-up:', error.message);
}

async function tick() {
  try {
    const hers = (await thread()).filter((m) => m.from === 'lauren' && !seen.has(m.id));
    for (const m of hers) {
      seen.add(m.id);
      appendFileSync(
        LOG,
        `NEW FROM LAUREN ${m.at} ${m.id}\n${m.body.replace(/\n/g, ' \n ')}\n\n`,
        'utf8',
      );
      console.log(`NEW FROM LAUREN ${m.at}: ${m.body.slice(0, 70)}`);
    }
    if (hers.length) writeFileSync(SEEN, JSON.stringify({ ids: [...seen] }, null, 2), 'utf8');
  } catch (error) {
    // A blip at the CRM is not a reason to stop watching.
    console.log('poll failed, carrying on:', error.message);
  }
}

await tick();
setInterval(tick, EVERY_MS);
