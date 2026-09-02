// Renders the porch light in a real browser and saves stills.
//
//   python -m http.server 8791 --directory .
//   node shots.mjs        ->  shots/*.png
//
// It also drives her switch the way she would, and checks the customer-facing
// lamp actually changes when she does.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.PORCH_URL || 'http://127.0.0.1:8791/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
let ran = 0;
const ok = (label, pass, detail) => {
  ran++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) problems.push(label);
};

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__porch', null, { timeout: 8000 });
  await page.waitForTimeout(1100);
  return page;
}

// ---- how it looks, on both shapes of screen ---------------------------------
for (const [name, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  const page = await open(w, h);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  ok(`${name}: no sideways scroll`, overflow <= 1, overflow > 1 ? `${overflow}px` : '');

  // The three strips on the page are lit, out, and the one with no lamp at all.
  const strips = await page.$$eval('.strip', (nodes) =>
    nodes.map((n) => ({
      lit: !!n.querySelector('.porch.is-lit'),
      out: !!n.querySelector('.porch.is-out'),
      lamp: !!n.querySelector('.porch-lamp'),
    })),
  );
  ok(`${name}: the lit strip is lit`, strips[0]?.lit === true);
  ok(`${name}: the sold-out strip is not`, strips[1]?.out === true && strips[1]?.lit === false);
  ok(`${name}: the forgotten strip has no lamp at all`, strips[2]?.lamp === false);

  // Both messages have to be readable at 10px. "Sold out" is the quieter of the
  // two on purpose, and quiet is one step from illegible.
  const contrasts = await page.$$eval('.strip .porch', (nodes) => {
    const lum = (s) => {
      const [r, g, b] = s.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    return nodes.map((n) => {
      const a = lum(getComputedStyle(n.querySelector('.porch-note')).color);
      const b = lum(getComputedStyle(n.closest('.strip')).backgroundColor);
      return {
        which: n.classList.contains('is-lit') ? 'lit' : 'out',
        ratio: +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)),
      };
    });
  });
  for (const c of contrasts) {
    ok(`${name}: "${c.which}" text is readable`, c.ratio >= 4.5, `${c.ratio}:1`);
  }

  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });

  if (name === 'desktop') {
    await page.locator('.strip').first().screenshot({ path: 'shots/strip-lit.png' });
    await page.locator('.strip').nth(1).screenshot({ path: 'shots/strip-out.png' });
    await page.locator('.strip').nth(2).screenshot({ path: 'shots/strip-none.png' });
  }
  await page.close();
}

// ---- her switch, driven the way she would ------------------------------------
{
  const page = await open(1440, 900);

  const preview = () =>
    page.evaluate(() => {
      const p = document.querySelector('#preview .porch');
      return p
        ? { lit: p.classList.contains('is-lit'), words: p.querySelector('.porch-note').textContent }
        : null;
    });
  const status = () => page.$eval('#st-head', (n) => n.textContent.trim());

  ok('before she touches it: nothing to show', (await preview()) === null);
  ok('before she touches it: her page says the light is off', (await status()) === 'The light is off');

  await page.click('#btn-lit');
  await page.waitForTimeout(250);
  ok('"I am baking": the lamp lights', (await preview())?.lit === true);
  ok('"I am baking": default words appear', (await preview())?.words === 'Baking this week');
  ok('"I am baking": her page confirms it', (await status()) === 'Your light is on');
  await page.locator('.owner-frame').screenshot({ path: 'shots/switch-lit.png' });

  await page.fill('#note', 'Baking Thursday, orders open');
  await page.waitForTimeout(250);
  ok('her own words replace the default', (await preview())?.words === 'Baking Thursday, orders open');

  await page.click('#btn-out');
  await page.waitForTimeout(250);
  ok('"sold out": the lamp goes out', (await preview())?.lit === false);
  ok('"sold out": her words are kept, never rewritten for her', (await preview())?.words === 'Baking Thursday, orders open');
  ok(
    '"sold out": she is asked whether her words still fit',
    await page.locator('#recheck').isVisible(),
  );
  await page.fill('#note', 'Sold out — back Thursday');
  await page.waitForTimeout(200);
  ok('the nudge goes once she has edited them', !(await page.locator('#recheck').isVisible()));
  ok('"sold out": her page confirms it', (await status()) === 'Your light is out');
  await page.locator('.owner-frame').screenshot({ path: 'shots/switch-out.png' });

  await page.close();
}

await browser.close();

console.log(`\n${ran - problems.length}/${ran} checks passed`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
