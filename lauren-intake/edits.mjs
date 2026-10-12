// Lauren's change list.
//
//   node edits.mjs add '{"where":"Home page","what":"...","from":"...","to":"..."}'
//   node edits.mjs list
//
// Her job is to say what she wants in whatever order it occurs to her. This
// file's job is to lose none of it.
//
// Two rules:
//
//   1. Her words are stored EXACTLY as she typed them. If she writes copy, that
//      copy goes in character for character, punctuation and all. Tidying up
//      somebody's own writing is how the wrong thing ends up on their website.
//   2. Nothing is ever deleted. An edit she changes her mind about is marked
//      superseded and stays in the file, because "what happened to that thing I
//      asked for" needs an answer.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const STORE = new URL('./edits.json', import.meta.url);
const SHEET = new URL('./EDITS.md', import.meta.url);

export function load() {
  return existsSync(STORE) ? JSON.parse(readFileSync(STORE, 'utf8')) : { edits: [] };
}

export function add(entry) {
  const data = load();
  const item = {
    n: data.edits.length + 1,
    at: new Date().toISOString(),
    status: 'open',
    // Where on the site, in her terms.
    where: entry.where ?? 'Not said',
    // What she wants, in one line.
    what: entry.what ?? '',
    // Exact copy, when she gave exact copy.
    from: entry.from ?? null,
    to: entry.to ?? null,
    // Anything I am not sure about and should ask her.
    unclear: entry.unclear ?? null,
    // The text of hers this came from, so nothing is ever taken out of context.
    saidAt: entry.saidAt ?? null,
    ...entry,
  };
  data.edits.push(item);
  writeFileSync(STORE, JSON.stringify(data, null, 2), 'utf8');
  render(data);
  return item;
}

export function render(data = load()) {
  const open = data.edits.filter((e) => e.status === 'open');
  const lines = [
    "# Lauren's change list",
    '',
    `${open.length} change${open.length === 1 ? '' : 's'} to make. Everything she has asked for, in the order she asked for it.`,
    '',
    'Her exact words are reproduced exactly. Where she wrote replacement copy, it is',
    'character for character as she typed it, punctuation included.',
    '',
  ];

  for (const e of data.edits) {
    lines.push(`## ${e.n}. ${e.where}${e.status === 'open' ? '' : `  (${e.status})`}`);
    lines.push('');
    lines.push(e.what);
    lines.push('');
    if (e.from) {
      lines.push('**Currently reads:**');
      lines.push('');
      lines.push(`> ${e.from.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    if (e.to) {
      lines.push('**She wants:**');
      lines.push('');
      lines.push(`> ${e.to.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    if (e.unclear) {
      lines.push(`**Still to check with her:** ${e.unclear}`);
      lines.push('');
    }
    lines.push(`_Asked ${e.at.slice(0, 16).replace('T', ' ')} UTC_`);
    lines.push('');
  }

  writeFileSync(SHEET, lines.join('\n'), 'utf8');
}

// ---- command line ----------------------------------------------------------
const [, , cmd, payload] = process.argv;
if (cmd === 'add') {
  const item = add(JSON.parse(payload));
  console.log(`saved #${item.n}: ${item.where} — ${item.what}`);
} else if (cmd === 'list') {
  const data = load();
  console.log(`${data.edits.length} on the list.`);
  for (const e of data.edits) console.log(`  ${e.n}. [${e.status}] ${e.where}: ${e.what}`);
} else if (cmd === 'render') {
  render();
  console.log('EDITS.md rewritten.');
}
