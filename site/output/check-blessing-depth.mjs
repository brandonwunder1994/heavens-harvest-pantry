import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const runtime = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const { chromium } = runtime.default ?? runtime;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-proxy-server"] });
const origin = process.env.HHP_CHECK_ORIGIN ?? "http://127.0.0.1:3014";
const output = "output/playwright/blessing-depth";
mkdirSync(output, { recursive: true });
const results = [];
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390, isMobile: width === 390, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(origin + "/checkout", { waitUntil: "networkidle" });
    const visual = page.locator(".blessing-gift-visual");
    await visual.scrollIntoViewIfNeeded();
    assert.equal(await visual.locator("img").evaluate(i => i.complete && i.naturalWidth > 0), true);
    const normal = await visual.evaluate(el => ({
      animation: getComputedStyle(el.querySelector(".blessing-gift-float")).animationName,
      filter: getComputedStyle(el.querySelector("img")).filter,
      shadow: getComputedStyle(el, "::after").filter,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(normal.animation, "blessing-gift-float");
    assert.match(normal.filter, /drop-shadow/);
    assert.match(normal.shadow, /blur/);
    assert.equal(normal.overflow, false);
    if (width === 1280) {
      await visual.hover();
      await page.waitForTimeout(650);
      assert.notEqual(await visual.locator(".blessing-gift-stage").evaluate(el => getComputedStyle(el).transform), "none");
    }
    await visual.locator("..").screenshot({ path: `${output}/jar-${width}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await visual.locator(".blessing-gift-float").evaluate(el => getComputedStyle(el).animationName), "none");
    assert.equal(await visual.locator(".blessing-gift-stage").evaluate(el => getComputedStyle(el).transform), "none");
    assert.deepEqual(errors, []);
    results.push({ width, ...normal, reducedMotion: "passed", errors });
    await context.close();
  }
  writeFileSync(`${output}/checks.json`, JSON.stringify({ origin, results }, null, 2));
  console.log("PASS: jar depth, hover, desktop/mobile layout, reduced motion and no JavaScript errors.");
} finally {
  await browser.close();
}
