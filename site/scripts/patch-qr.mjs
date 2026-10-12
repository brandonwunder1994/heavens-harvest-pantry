import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Keep the existing custom module QR (cream, brown modules, sage finders)
 * and restore the original heart in the quiet center.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "qr.svg");
const heartPath =
  "M12 21s-7.5-4.6-9.6-9.1C.8 8.3 3 4.5 6.6 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.4C19.5 16.4 12 21 12 21z";
const heart = (fill) =>
  `<g id="hh-heart" transform="translate(229.5 229.5) scale(1.2916666666666667)"><path d="${heartPath}" fill="${fill}"/></g>`;
const center = /<g id="hh-cross">[\s\S]*?<\/g>|<g id="hh-heart"[\s\S]*?<\/g>|<g transform="translate\(229\.5 229\.5\) scale\(1\.2916666666666667\)">[\s\S]*?<\/g>/;

let svg = readFileSync(src, "utf8");
if (!center.test(svg)) {
  throw new Error("Could not find the center mark in public/qr.svg");
}
svg = svg.replace(center, heart("#c9a06a"));
writeFileSync(src, svg);

const print = svg
  .replaceAll("#5b3d1e", "#1a1208")
  .replaceAll("#6b7a4a", "#1a1208")
  .replace(heart("#c9a06a"), heart("#1a1208"));
writeFileSync(join(root, "public", "qr-print.svg"), print);

console.log("Wrote public/qr.svg and public/qr-print.svg with the original heart");
