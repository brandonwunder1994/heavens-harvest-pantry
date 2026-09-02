// Compiles receipt.ts down to the receipt.js the standalone demo imports.
//
//   node build.mjs
//
// receipt.ts is the single copy of how a payment becomes a ticket. The site
// takes the TypeScript; this page needs plain JavaScript; neither is allowed to
// be a second, drifting copy.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

await build({
  entryPoints: [here('./receipt.ts')],
  outfile: here('./receipt.js'),
  format: 'esm',
  target: 'es2020',
  bundle: false,
  banner: { js: '// Written by build.mjs from receipt.ts. Do not edit by hand.' },
});

console.log('receipt.js written from receipt.ts');
