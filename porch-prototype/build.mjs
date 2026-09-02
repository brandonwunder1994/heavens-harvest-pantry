// Compiles porch.ts down to the porch.js the standalone demo imports.
//
//   node build.mjs
//
// porch.ts is the single copy of the rule about what a visitor sees. The site
// takes the TypeScript; this page needs plain JavaScript; neither is allowed to
// be a second, drifting copy of the logic.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

await build({
  entryPoints: [here('./porch.ts')],
  outfile: here('./porch.js'),
  format: 'esm',
  target: 'es2020',
  bundle: false,
  banner: { js: '// Written by build.mjs from porch.ts. Do not edit by hand.' },
});

console.log('porch.js written from porch.ts');
