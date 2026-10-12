import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const runtime = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const { chromium } = runtime.default ?? runtime;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-proxy-server"] });
mkdirSync("output/playwright/mobile-pickup", { recursive: true });
try {
  const page = await browser.newPage();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("https://heavensharvestpantry.com/checkout", { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    const header = page.locator("header");
    assert.equal(await header.getByText("Order by Tues, Porch Pickup Fri/Sat", { exact: true }).isVisible(), true);
    assert.equal(await header.getByText("Porch pickup Friday and Saturday", { exact: true }).isVisible(), width >= 768);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await header.screenshot({ path: `output/playwright/mobile-pickup/header-${width}.png` });
  }
  console.log("PASS live mobile header has one pickup line; desktop header is preserved.");
} finally {
  await browser.close();
}
