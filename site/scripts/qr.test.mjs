import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const heartPath =
  "M12 21s-7.5-4.6-9.6-9.1C.8 8.3 3 4.5 6.6 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.4C19.5 16.4 12 21 12 21z";

test("the shop QR keeps the custom modules and original gold heart", () => {
  const svg = readFileSync(join(publicDir, "qr.svg"), "utf8");
  assert.ok(svg.includes(heartPath));
  assert.match(svg, /fill="#5b3d1e"/);
  assert.match(svg, /stroke="#6b7a4a"/);
  assert.match(svg, /id="hh-heart"/);
  assert.match(svg, /fill="#c9a06a"/);
  assert.equal(svg.includes("data:image/png;base64,"), false);
  assert.equal(svg.includes('width="62" height="18"'), false);
});

test("the thermal QR is the same picture in black ink", () => {
  const color = readFileSync(join(publicDir, "qr.svg"), "utf8");
  const print = readFileSync(join(publicDir, "qr-print.svg"), "utf8");
  assert.equal(print.includes("#c9a06a") || print.includes("#5b3d1e") || print.includes("#6b7a4a"), false);
  assert.match(print, /fill="#1a1208"/);
  assert.match(print, /id="hh-heart"/);
  assert.ok(print.includes(heartPath));
  assert.equal(color.match(/<rect/g)?.length, print.match(/<rect/g)?.length);
});
