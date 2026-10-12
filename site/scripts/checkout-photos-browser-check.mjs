import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const runtime = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const { chromium } = runtime.default ?? runtime;
const origin = process.env.HHP_CHECK_ORIGIN ?? "http://127.0.0.1:3014";
const output = "output/playwright/checkout-photos";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-proxy-server"] });
const context = await browser.newContext({ reducedMotion: "reduce" });
await context.addInitScript(() => {
  if (!localStorage.getItem("hhp-checkout-photos-seeded")) {
    localStorage.setItem("hhp-cart-v1", JSON.stringify({ lines: [{ slug: "maple-pecan", format: "bag", sizeOz: 8, qty: 1 }], jarsReturned: 0, blessingBags: 0 }));
    localStorage.setItem("hhp-checkout-photos-seeded", "true");
  }
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const results = [];
try {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(`${origin}/checkout`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    console.log(JSON.stringify({ url: page.url(), title: await page.title(), headings: await page.locator("h1,h2").allTextContents() }));
    await page.getByRole("heading", { name: "Your order", exact: true }).waitFor();
    const product = page.locator('section').filter({ has: page.getByRole("heading", { name: "Your order", exact: true }) }).locator('li img');
    assert.ok(await product.count());
    assert.ok((await product.first().getAttribute("src")).includes("apple-maple-pecan"));
    await page.getByRole("img", { name: /Granola blessing jar with a cream ribbon/ }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/checkout-${width}.png`, fullPage: true });
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src) }));
    assert.equal(layout.overflow, false);
    assert.deepEqual(layout.brokenImages, []);
    results.push({ width, ...layout });
  }
  const subtotal = page.locator('dl > div').filter({ has: page.getByText("Subtotal", { exact: true }) }).locator('dd');
  const before = await subtotal.innerText();
  await page.getByRole("button", { name: /^One more/ }).first().click();
  assert.notEqual(await subtotal.innerText(), before);
  await page.reload({ waitUntil: "networkidle" });
  assert.notEqual(await subtotal.innerText(), before);
  await page.getByRole("button", { name: /^One fewer/ }).first().click();
  assert.equal(await subtotal.innerText(), before);
  await page.getByRole("button", { name: "Choose a blessing gift", exact: true }).click();
  assert.equal(await page.getByLabel(/^Verse card · optional/).inputValue(), "");
  await page.getByRole("button", { name: "Add this gift", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "recipient" }).waitFor();
  await page.getByLabel("Gift size").selectOption("8");
  await page.getByLabel("Recipient’s name", { exact: true }).fill("Sample Recipient");
  await page.getByLabel("Recipient’s delivery address", { exact: true }).fill("Sample Vistancia address for browser checks");
  await page.getByLabel("This address is in Vistancia.", { exact: true }).check();
  await page.getByRole("button", { name: "Add this gift", exact: true }).click();
  assert.equal(await page.locator('li img').count(), 2);
  assert.equal(await page.getByRole("radio").count(), 4);
  await page.screenshot({ path: `${output}/mixed-checkout-390.png`, fullPage: true });
  if (process.env.HHP_PAYMENT_SMOKE === "1") {
    const displayed = await page.locator("dl").innerText();
    assert.match(displayed, /Sales tax\s+\$0\.89/);
    assert.match(displayed, /Total including tax\s+\$27\.89/);
    await page.getByRole("radio").first().check();
    await page.getByLabel("Your name", { exact: true }).fill("Launch Verification 2026-10-08");
    await page.getByLabel("Phone number", { exact: true }).fill("6235550100");
    const responsePromise = page.waitForResponse(r => r.url().endsWith("/api/checkout") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Continue to secure payment", exact: true }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const data = await response.json();
    const sessionId = data.clientSecret.split("_secret_")[0];
    assert.match(sessionId, /^cs_live_/);
    writeFileSync(`${output}/payment-session.json`, JSON.stringify({ sessionId, marker: "Launch Verification 2026-10-08", displayed, request: response.request().postDataJSON() }, null, 2));
    console.log("Marked unpaid checkout session created; cleanup identifier saved locally.");
    let paymentFrame;
    for (let retry = 0; retry < 45; retry++) {
      for (const frame of page.frames()) {
        if (frame !== page.mainFrame() && await frame.getByTestId("hosted-payment-submit-button").count()) paymentFrame = frame;
      }
      if (paymentFrame) break;
      await page.waitForTimeout(1000);
    }
    assert.ok(paymentFrame, "Stripe payment form and Pay control loaded");
    assert.match(await paymentFrame.locator("body").innerText(), /27\.89/);
    await paymentFrame.getByTestId("hosted-payment-submit-button").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/stripe-payment-390.png`, fullPage: true });
    console.log("PASS live Stripe form shows the same $27.89 total; no card details entered or payment submitted.");
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/checks.json`, JSON.stringify({ origin, results, errors, interactions: "quantity updates, persistence, matching bag/jar images, gift validation, optional verse unchanged" }, null, 2));
  console.log("PASS checkout desktop/mobile images, layout, quantities, persistence and blessing gifts. No payment submitted.");
} finally {
  await browser.close();
}
