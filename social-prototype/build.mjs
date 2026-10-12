import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * One source, two outputs.
 *
 * `page.html` is body-only, because that is what the Artifact host wants: it
 * supplies the doctype and head itself. `index.html` is the same thing wrapped
 * so it opens off the disk like every other prototype in this repo.
 *
 * The hundred posts are injected rather than pasted, so the prototype can never
 * drift from site/content/social-posts.json.
 */

const here = dirname(fileURLToPath(import.meta.url));
const posts = readFileSync(join(here, "..", "site", "content", "social-posts.json"), "utf8").trim();
const template = readFileSync(join(here, "page.html"), "utf8");

const marker = /\/\*POSTS\*\/[\s\S]*?\/\*END\*\//;
if (!marker.test(template)) throw new Error("page.html has lost its /*POSTS*/ marker");

// </script> inside a string literal would close the block early.
const safe = posts.replace(/<\//g, "<\\/");
const filled = template.replace(marker, safe);

writeFileSync(join(here, "artifact.html"), filled, "utf8");
writeFileSync(
  join(here, "index.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body style="margin:0">\n${filled}\n</body>\n</html>\n`,
  "utf8",
);

console.log(`built with ${JSON.parse(posts).length} posts`);
