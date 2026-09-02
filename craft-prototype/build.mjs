// Compiles crunch.ts to the crunch.js the standalone demo imports.
//
//   node build.mjs

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

await build({
  entryPoints: [here('./crunch.ts')],
  outfile: here('./crunch.js'),
  format: 'esm',
  target: 'es2020',
  bundle: false,
  banner: { js: '// Written by build.mjs from crunch.ts. Do not edit by hand.' },
});
console.log('crunch.js written from crunch.ts');
