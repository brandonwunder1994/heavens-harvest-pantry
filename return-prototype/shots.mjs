// Renders phase two in a real browser and saves stills.
//
//   python -m http.server 8793 --directory .
//   node shots.mjs        ->  shots/*.png
//
// It walks all three people, checks each piece says something true for each of
// them, and holds every one to a readability floor. The Sunday note is checked
// inside its own frame, because that is where it will actually live.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.RETURN_URL || 'http://127.0.0.1:8793/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
let ran = 0;
const ok = (label, pass, detail) => {
  ran++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) problems.push(label);
};

const CONTEXT = { timezoneId: 'America/Phoenix', locale: 'en-US' };

async function open(width, height) {
  const context = await browser.newContext({ ...CONTEXT, viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__return', null, { timeout: 8000 });
  await page.waitForTimeout(900);
  return { context, page };
}

const read = (page) =>
  page.evaluate(() => ({
    greeting: document.querySelector('.rtn.welcome h2')?.textContent.trim() ?? '',
    offer: document.querySelector('.rtn.welcome .again .what p')?.textContent.trim() ?? null,
    firstTime: document.querySelector('.rtn.welcome .first-time')?.textContent.trim() ?? null,
    jars: document.querySelectorAll('.rtn.shelf .jar').length,
    boards: document.querySelectorAll('.rtn.shelf .boards').length,
    shelfLine: document.querySelector('.rtn.shelf .count')?.textContent.trim() ?? '',
    emptyBoard: !!document.querySelector('.rtn.shelf .empty-board'),
    cards: document.querySelectorAll('.rtn.wall .card').length,
    wallNothing: !!document.querySelector('.rtn.wall .nothing'),
    subject: document.getElementById('mail-subject')?.textContent.trim() ?? '',
    plain: document.getElementById('mail-text')?.textContent ?? '',
  }));

// ---- the regular ----------------------------------------------------------------
{
  const { context, page } = await open(1440, 900);
  const r = await read(page);

  ok('regular: greeted by name', r.greeting === 'Welcome back, Sarah.', r.greeting);
  ok('regular: offered her usual', r.offer === 'two bags of Honey Almond Crunch?', r.offer);
  ok('regular: twelve jars on the shelf', r.jars === 12, String(r.jars));
  ok('regular: the shelf counts them', r.shelfLine.startsWith('12 jars kept'), r.shelfLine);
  ok('regular: a card for each week she ordered', r.cards === 9, String(r.cards));
  // She is on 372 points, which is three free bags. A waiting bag outranks the
  // baking in the subject line, and should.
  ok('regular: the note leads with her free bag', r.subject === "This week's verse, and a free bag waiting for you", r.subject);
  ok('regular: the note mentions her jars', r.plain.includes('12 jars back so far'));

  await page.screenshot({ path: 'shots/desktop-regular.png', fullPage: true });
  await page.locator('.rtn.welcome').screenshot({ path: 'shots/welcome-back.png' });
  await page.locator('.rtn.shelf').screenshot({ path: 'shots/jar-shelf.png' });
  await page.locator('.rtn.wall').screenshot({ path: 'shots/verse-wall.png' });
  await page.locator('.mail-frame').screenshot({ path: 'shots/sunday-note.png' });
  await context.close();
}

// ---- ordered twice, no habit yet -------------------------------------------------
{
  const { context, page } = await open(1440, 900);
  await page.click('#who button[data-key="dana"]');
  await page.waitForTimeout(400);
  const r = await read(page);

  ok('two orders: greeted by name', r.greeting === 'Welcome back, Dana.', r.greeting);
  ok('two orders: offered what she had last, not an invented habit',
    r.offer === 'a jar of Dark Chocolate Sea Salt and a bag of Cinnamon Apple?', r.offer);
  ok('two orders: one jar on the shelf', r.jars === 1, String(r.jars));
  ok('two orders: the singular reads right', r.shelfLine === 'One jar kept out of the landfill, and two dollars off.', r.shelfLine);
  ok('two orders: two cards on the wall', r.cards === 2, String(r.cards));
  await page.locator('.rtn.shelf').screenshot({ path: 'shots/jar-shelf-one.png' });
  await context.close();
}

// ---- never ordered -----------------------------------------------------------------
{
  const { context, page } = await open(1440, 900);
  await page.click('#who button[data-key="new"]');
  await page.waitForTimeout(400);
  const r = await read(page);

  ok('new: still greeted by name', r.greeting === 'Welcome back, Marcus.', r.greeting);
  ok('new: nothing is offered again', r.offer === null);
  ok('new: and it says why, rather than showing a gap', !!r.firstTime && r.firstTime.length > 20);
  ok('new: the shelf is drawn empty, not missing', r.emptyBoard && r.jars === 0);
  ok('new: the shelf invites rather than apologises',
    r.shelfLine === 'Bring a jar back and the first one lands here.', r.shelfLine);
  ok('new: the wall says where the first card comes from', r.wallNothing && r.cards === 0);
  ok('new: the note promises no shelf he has not got', !r.plain.includes('shelf'));

  await page.screenshot({ path: 'shots/desktop-new.png', fullPage: true });
  await page.locator('.rtn.welcome').screenshot({ path: 'shots/welcome-first-time.png' });
  await context.close();
}

// ---- the phone -----------------------------------------------------------------------
{
  const { context, page } = await open(390, 844);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  ok('phone: no sideways scroll', overflow <= 1, overflow > 1 ? `${overflow}px` : '');

  // The shelf is the one thing here that can overrun its plank.
  const spills = await page.evaluate(() =>
    [...document.querySelectorAll('.rtn.shelf .boards')].some(
      (b) => b.scrollWidth - b.clientWidth > 1,
    ),
  );
  ok('phone: no jar falls off the end of a shelf', !spills);
  await page.screenshot({ path: 'shots/phone-regular.png', fullPage: true });
  await context.close();
}

// ---- readability ------------------------------------------------------------------------
{
  const { context, page } = await open(1440, 900);
  const contrasts = await page.evaluate(() => {
    const lum = (s) => {
      const [r, g, b] = s.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const behind = (n) => {
      let el = n;
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        el = el.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const ratio = (n) => {
      const a = lum(getComputedStyle(n).color);
      const b = lum(behind(n));
      return +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
    };
    return [
      ['the shelf count', '.rtn.shelf .count'],
      ['a verse card', '.rtn.wall .card .t'],
      ['the card date', '.rtn.wall .card .d'],
      ['the reorder line', '.rtn.welcome .again .when'],
      ['the reorder button', '.rtn.welcome .stamp-btn'],
    ]
      .map(([what, sel]) => {
        const n = document.querySelector(sel);
        return n ? { what, ratio: ratio(n) } : null;
      })
      .filter(Boolean);
  });
  for (const c of contrasts) ok(`readable: ${c.what}`, c.ratio >= 4.5, `${c.ratio}:1`);
  await context.close();
}

await browser.close();

console.log(`\n${ran - problems.length}/${ran} checks passed`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
