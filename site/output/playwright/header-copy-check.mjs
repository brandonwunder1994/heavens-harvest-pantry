import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "file:///C:/Users/brand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const output = "output/playwright/header-copy";
mkdirSync(output, { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("https://heavensharvestpantry.com", { waitUntil: "networkidle", timeout: 60000 });
    assert.equal(response.status(), 200);
    const copy = page.locator("header").getByText("Order by Tues, Porch Pickup Fri/Sat", { exact: true });
    await copy.waitFor({ state: "visible" });
    assert.equal(await page.locator("header").getByText("Order by Tuesday at 9 p.m. for Friday or Saturday pickup", { exact: true }).count(), 0);
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth }));
    assert.equal(layout.overflow, false);
    await page.screenshot({ path: `${output}/${width}.png` });
    console.log(JSON.stringify({ width, text: await copy.textContent(), ...layout, status: response.status() }));
  }
} finally {
  await browser.close();
}
