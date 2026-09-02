// Renders the receipt in a real browser and saves stills.
//
//   python -m http.server 8792 --directory .
//   node shots.mjs        ->  shots/*.png, shots/printed.pdf
//
// The print rules are the half of this that a screenshot cannot show, so the
// page is really printed to PDF and the result is checked: one ticket, at
// paper width, with nothing else from the page on it.

import { chromium } from 'playwright-core';
import { mkdirSync, statSync } from 'node:fs';

const PAGE_URL = process.env.RECEIPT_URL || 'http://127.0.0.1:8792/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
let ran = 0;
const ok = (label, pass, detail) => {
  ran++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) problems.push(label);
};

// A fixed clock and zone, so the stamped time on the ticket is the same on any
// machine that runs this.
const CONTEXT = { timezoneId: 'America/Phoenix', locale: 'en-US' };

async function open(width, height) {
  const context = await browser.newContext({ ...CONTEXT, viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__receipt', null, { timeout: 8000 });
  await page.waitForTimeout(900);
  return { context, page };
}

// ---- how it looks ------------------------------------------------------------
for (const [name, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  const { context, page } = await open(w, h);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  ok(`${name}: no sideways scroll`, overflow <= 1, overflow > 1 ? `${overflow}px` : '');

  const tickets = await page.locator('.ticket').count();
  ok(`${name}: all four example tickets render`, tickets === 4, String(tickets));

  const first = await page.locator('.ticket').first().evaluate((n) => ({
    number: n.querySelector('.stamp .no').textContent.trim(),
    total: n.querySelector('.total .amt').textContent.trim(),
    lines: [...n.querySelectorAll('.line .amt')].map((a) => a.textContent.trim()),
    verse: !!n.querySelector('.verse .ref'),
  }));
  ok(`${name}: the ticket carries its number`, first.number === 'No. QK4-T9K', first.number);
  ok(`${name}: the total is what was charged`, first.total === '$42.00', first.total);
  ok(`${name}: the lines are itemised`, first.lines.join(' ') === '$26.00 $16.00', first.lines.join(' '));
  ok(`${name}: the verse is on it`, first.verse);

  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
  if (name === 'desktop') {
    for (const [i, label] of [[0, 'plain'], [1, 'jars-back'], [2, 'credit-overflows'], [3, 'points-pending']]) {
      await page.locator('.ticket').nth(i).screenshot({ path: `shots/ticket-${label}.png` });
    }
  }
  await context.close();
}

// ---- the credit that did not fit ----------------------------------------------
{
  const { context, page } = await open(1440, 900);
  const third = page.locator('.ticket').nth(2);
  const short = await third.locator('.shortfall').textContent();
  ok('the ticket says what did not fit', short.includes('$2.00'), short.trim());
  ok('and only on the ticket it applies to', (await page.locator('.ticket .shortfall').count()) === 1);

  const pending = page.locator('.ticket').nth(3);
  ok('a balance that has not landed is simply absent', (await pending.locator('.points').count()) === 1);
  await context.close();
}

// ---- printing ------------------------------------------------------------------
{
  const context = await browser.newContext(CONTEXT);
  const page = await context.newPage();
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__receipt', null, { timeout: 8000 });
  await page.waitForTimeout(900);

  // What actually survives the print rules.
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);

  const survives = await page.evaluate(() => {
    // checkVisibility, not computed display: an element inside a hidden parent
    // still reports its own display as block.
    const visible = (n) => !!n && n.checkVisibility({ checkVisibilityCSS: true });
    return {
      tickets: [...document.querySelectorAll('.ticket')].filter(visible).length,
      headline: visible(document.querySelector('h1')),
      button: visible(document.querySelector('#print')),
      footer: visible(document.querySelector('footer')),
      captions: [...document.querySelectorAll('.case > h3')].filter(visible).length,
      tears: getComputedStyle(document.querySelector('.ticket'), '::before').display,
      ink: getComputedStyle(document.querySelector('.ticket')).color,
    };
  });

  ok('print: exactly one ticket', survives.tickets === 1, String(survives.tickets));
  ok('print: the page headline is gone', !survives.headline);
  ok('print: the print button is gone', !survives.button);
  ok('print: the page footer is gone', !survives.footer);
  ok('print: the example captions are gone', survives.captions === 0, String(survives.captions));
  ok('print: the torn edges are not printed as ink', survives.tears === 'none', survives.tears);
  ok('print: the ticket sets in black', survives.ink === 'rgb(0, 0, 0)', survives.ink);

  await page.emulateMedia({ media: null });
  await page.pdf({ path: 'shots/printed.pdf', format: 'Letter', printBackground: false });
  const size = statSync(new URL('./shots/printed.pdf', import.meta.url)).size;
  ok('print: a real PDF comes out', size > 2000, `${(size / 1024).toFixed(1)} KB`);

  await context.close();
}

await browser.close();

console.log(`\n${ran - problems.length}/${ran} checks passed`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
