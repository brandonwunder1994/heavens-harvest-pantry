import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JAR_PHOTO, bagPhotoFor, jarMarkName, jarPhotoFor, packPhotoFor } from "@/lib/jars";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

test("this week's bags get the jar that is in them", () => {
  assert.equal(
    jarPhotoFor({ name: "Apple Maple Pecan Granola- 1lb" }),
    "/jars/apple-maple-pecan.png",
  );
  assert.equal(
    jarPhotoFor({ name: "Dark Chocolate Coconut Cashew Granola- 1 lb" }),
    "/jars/chocolate-coconut-cashew.png",
  );
  assert.equal(
    jarPhotoFor({ name: "Vanilla Blueberry Almond Granola- 1 lb" }),
    "/jars/vanilla-blueberry-almond.png",
  );
  assert.equal(jarPhotoFor("honey-almond-crunch"), "/jars/honey-almond.png");
  assert.equal(jarPhotoFor({ name: "Candied Almonds-1 lb" }), "/jars/candied-almonds.png");
});

test("a jar label drops the bag size and the word granola", () => {
  assert.equal(jarMarkName("Apple Maple Pecan Granola- 1lb"), "Apple Maple Pecan");
  assert.equal(jarMarkName("Candied Almonds-1 lb"), "Candied Almonds");
});

test("a bag photo follows the flavor name", () => {
  assert.equal(
    bagPhotoFor({ name: "Apple Maple Pecan Granola- 1lb" }),
    "/bags/apple-maple-pecan.png",
  );
  assert.equal(packPhotoFor({ name: "Candied Almonds-1 lb" }, "bag"), "/bags/candied-almonds.png");
  assert.equal(packPhotoFor({ name: "Candied Almonds-1 lb" }, "jar"), "/jars/candied-almonds.png");
});

test("legacy product identities win over misleading words in their slugs", () => {
  const blueberry = { slug: "cinnamon-apple", name: "Vanilla Blueberry Almond Granola" };
  assert.equal(jarPhotoFor(blueberry), "/jars/vanilla-blueberry-almond.png");
  assert.equal(bagPhotoFor(blueberry), "/bags/vanilla-blueberry-almond.png");
  assert.equal(packPhotoFor(blueberry, "sampler"), bagPhotoFor(blueberry));
  assert.equal(bagPhotoFor({ slug: "maple-pecan", name: "Apple Maple Pecan Granola" }), "/bags/apple-maple-pecan.png");
  assert.equal(bagPhotoFor({ slug: "c", name: "Candied Almonds" }), "/bags/candied-almonds.png");
  assert.equal(bagPhotoFor({ slug: "chocolate-chip-coconut-cashew", name: "Chocolate Chip Coconut Cashew Granola" }), "/bags/chocolate-coconut-cashew.png");
});

test("unknown bags never borrow unrelated food or a jar photograph", () => {
  assert.equal(packPhotoFor({ slug: "new-flavor", name: "Cherry Crunch" }, "bag"), undefined);
  assert.equal(packPhotoFor({ slug: "honey-almond-crunch", name: "Honey Almond Crunch" }, "bag"), undefined);
});

test("the jar photographs are real PNGs", () => {
  const files = [
    "jars/apple-maple-pecan.png",
    "jars/chocolate-coconut-cashew.png",
    "jars/vanilla-blueberry-almond.png",
    "jars/honey-almond.png",
    "jars/maple-pecan.png",
    "jars/dark-chocolate.png",
    "jars/candied-almonds.png",
    "bags/apple-maple-pecan.png",
    "bags/chocolate-coconut-cashew.png",
    "bags/vanilla-blueberry-almond.png",
    "bags/candied-almonds.png",
  ];
  for (const file of files) {
    const bytes = readFileSync(join(publicDir, file));
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    assert.ok(bytes.length > 40_000);
  }
  assert.equal(JAR_PHOTO.width, 720);
  assert.equal(JAR_PHOTO.height, 1000);
});
