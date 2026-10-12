import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.HHP_CHECK_ORIGIN ?? "http://127.0.0.1:3013";
const output = "output/playwright/launch-public";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-proxy-server"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const checks = [];
try {
  for (const width of (process.env.HHP_INTERACTIONS_ONLY === "1" ? [] : [1280, 390])) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/menu", "/story", "/pickup", "/reviews", "/bowl", "/blessing-bags", "/verses", "/checkout"]) {
      const response = await page.goto(origin + path, { waitUntil: "networkidle", timeout: 120000 });
      assert.equal(response.status(), 200, path);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute("src")),
      }));
      assert.equal(layout.overflow, false, `${path} overflows at ${width}`);
      assert.deepEqual(layout.brokenImages, [], `${path} has missing images`);
      checks.push({ path, width, ...layout });
      if (["/menu", "/checkout", "/"].includes(path)) await page.screenshot({ path: `${output}/${path === "/" ? "home" : path.slice(1)}-${width}.png`, fullPage: true });
      console.log(`Checked public ${path} at ${width}`);
    }
  }

  writeFileSync(`${output}/layout-checks.json`, JSON.stringify(checks, null, 2));
  await page.goto(origin + "/menu", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /16 oz \/ 1 lb bag of/ }).first().click();
  await page.getByRole("dialog").waitFor();
  const omission = page.getByRole("checkbox", { name: "No apples", exact: true });
  if (await omission.count()) await omission.check();
  for (const size of ["3 oz", "8 oz", "1 lb"]) {
    await page.getByRole("button", { name: new RegExp("^" + size.replaceAll("/", "\\/" ) + " ·") }).click();
    await page.getByRole("button", { name: `Add ${size} bag`, exact: true }).click();
  }
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0, "Escape closes the product dialog");
  await page.goto(origin + "/checkout", { waitUntil: "networkidle" });
  assert.equal(await page.getByRole("radio").count(), 4);
  assert.equal(await page.getByText("$31.00", { exact: true }).count(), 1);
  await page.getByRole("button", { name: /^One more/ }).first().click();
  await page.getByText("$36.00", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("$36.00", { exact: true }).waitFor();
  await page.getByRole("button", { name: /^One fewer.*3 oz/ }).first().click();
  await page.getByText("$31.00", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Choose a blessing gift", exact: true }).click();
  await page.getByRole("button", { name: "Add this gift", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "recipient" }).waitFor();
  await page.getByLabel("Gift size").selectOption("8");
  await page.getByLabel("Recipient’s name", { exact: true }).fill("Sample Recipient");
  await page.getByLabel("Recipient’s delivery address", { exact: true }).fill("Sample Vistancia address for browser checks");
  await page.getByLabel("This address is in Vistancia.", { exact: true }).check();
  await page.getByRole("button", { name: "Add this gift", exact: true }).click();
  await page.getByText("$48.00", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("$48.00", { exact: true }).waitFor();
  await page.getByRole("radio").last().check();
  await page.getByLabel("Your name", { exact: true }).fill("Sample Browser Buyer");
  await page.getByLabel("Phone number", { exact: true }).fill("6235550100");
  await page.getByText(/Confirmation email is currently unavailable/).waitFor();
  await page.route("**/api/capacity", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.getByRole("button", { name: "Check space for this bake", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Bake availability could not load" }).waitFor();
  await page.unroute("**/api/capacity");
  await page.screenshot({ path: `${output}/mixed-checkout-390.png`, fullPage: true });
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/checks.json`, JSON.stringify({ checks, interactions: "passed", errors }, null, 2));
  console.log("PASS: public desktop/mobile routes, images, no overflow or JavaScript crashes; sizes, omissions, dialog keyboard control, quantities, reload persistence, gift validation, mixed basket, pickup and failed capacity feedback. No order was submitted.");
} finally {
  await browser.close();
}
