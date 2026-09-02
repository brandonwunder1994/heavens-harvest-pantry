// Compiles account.ts and sunday-note.ts to the JavaScript the demo imports.
//
//   node build.mjs
//
// Those two files are the single copy of every rule in phase two. The site
// takes the TypeScript; this page needs plain JavaScript; neither is allowed to
// be a second, drifting copy.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

for (const name of ['account', 'sunday-note']) {
  await build({
    entryPoints: [here(`./${name}.ts`)],
    outfile: here(`./${name}.js`),
    format: 'esm',
    target: 'es2020',
    bundle: false,
    banner: { js: `// Written by build.mjs from ${name}.ts. Do not edit by hand.` },
  });
  console.log(`${name}.js written from ${name}.ts`);
}
