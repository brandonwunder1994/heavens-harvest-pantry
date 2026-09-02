// Keeps know-jesus.css in step with the prototype page, and scopes every rule
// under .kj so dropping the page into the site cannot restyle anything else.
//   node build-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].trim();

const scopeOne = (sel) => {
  const s = sel.trim();
  if (!s) return s;
  if (s === ':root' || s === 'body' || s === 'html') return '.kj';
  if (s === '*') return '.kj *';
  if (s.startsWith(':')) return `.kj ${s}`;      // :focus-visible etc
  return `.kj ${s}`;
};
const scope = (sel) => sel.split(',').map(scopeOne).join(', ');

// Walk top-level rules, recursing one level into @media.
function transform(block) {
  let out = '';
  let i = 0;
  while (i < block.length) {
    const open = block.indexOf('{', i);
    if (open === -1) { out += block.slice(i); break; }
    const prelude = block.slice(i, open).trim();
    // find the matching close brace
    let depth = 1, j = open + 1;
    while (j < block.length && depth > 0) {
      if (block[j] === '{') depth++;
      else if (block[j] === '}') depth--;
      j++;
    }
    const body = block.slice(open + 1, j - 1);
    if (prelude.startsWith('@')) {
      out += `${prelude} {\n${transform(body).replace(/^/gm, '  ').trimEnd()}\n}\n\n`;
    } else {
      out += `${scope(prelude)} {${body.replace(/\s+$/, '')} }\n`;
    }
    i = j;
  }
  return out;
}

writeFileSync(
  new URL('./know-jesus.css', import.meta.url),
  '/* Want to know Jesus? — page styles.\n' +
  '   Generated from index.html by `node build-css.mjs`. Edit the prototype, not this file.\n' +
  '   Every rule is scoped under .kj, so it cannot reach the rest of the site. */\n\n' +
  transform(css).trim() + '\n'
);
console.log('know-jesus.css updated and scoped');
