/**
 * Teaches plain `node --test` the same `@/...` shorthand the app uses, so the
 * tests can import the real modules instead of a copy that drifts out of date.
 * Loaded by the `test` script in package.json; nothing at runtime uses it.
 */
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Order matters, and a bare "" must not come first: existsSync says yes to a
// directory, so `@/components/owner` would resolve to the folder, not the file.
const extensions = [".ts", ".tsx", ".mjs", ".js", "", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    const base = path.join(root, specifier.slice(2));
    const hit = extensions
      .map((ext) => base + ext)
      .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!hit) throw new Error(`Cannot resolve ${specifier} from ${root}`);

    return nextResolve(pathToFileURL(hit).href, context);
  },
});
