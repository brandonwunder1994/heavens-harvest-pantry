// Proves "Everything, without the graphics".
//
//   python -m http.server 8788 --directory .
//   node shots-still.mjs      ->  shots/still-*.png
//
// For each reason a visitor might not get the pour, this loads the page in a
// real browser, screenshots what they actually see, and — the part that matters
// — asserts that three.js and the physics recording were never requested.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.POUR_URL || 'http://127.0.0.1:8788/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const HEAVY = /three\.module|pour\.js|pour\.json/;

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader'],
});

const problems = [];
let checks = 0;
const ok = (label, pass, detail) => {
  checks++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) problems.push(label);
};

async function look({ name, query, viewport, context = {}, scripts = true }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...context });
  const page = await ctx.newPage();
  const asked = [];
  page.on('request', (r) => asked.push(r.url()));
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));

  await page.goto(PAGE_URL + query, { waitUntil: 'networkidle' });
  await page.waitForTimeout(scripts ? 1400 : 900);
  await page.screenshot({ path: `shots/still-${name}.png` });

  const heavy = asked.filter((u) => HEAVY.test(u));
  const photo = asked.some((u) => /counter-(wide|tall)\.webp/.test(u));
  const state = await page.evaluate(() => ({
    wordsVisible: getComputedStyle(document.getElementById('words')).opacity === '1',
    canvasHidden: getComputedStyle(document.getElementById('scene')).display === 'none',
    photoIn: !!document.querySelector('.still-photo.in'),
    reason: document.getElementById('still')?.dataset.reason || null,
    ctaHittable: (() => {
      const b = document.querySelector('.stamp');
      if (!b) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === b;
    })(),
  }));

  await ctx.close();
  return { heavy, photo, state };
}

// ---- the five reasons, each on desktop -------------------------------------
for (const [name, query, context] of [
  ['no-webgl', '?still=no-webgl', {}],
  ['reduced-motion', '', { reducedMotion: 'reduce' }],
  ['save-data', '?still=save-data', {}],
  ['slow-network', '?still=slow-network', {}],
  ['small-device', '?still=small-device', {}],
]) {
  const r = await look({ name, query, viewport: { width: 1440, height: 900 }, context });
  ok(`${name}: three.js never requested`, r.heavy.length === 0, r.heavy.join(', '));
  ok(`${name}: the photograph is on screen`, r.photo && r.state.photoIn);
  ok(`${name}: canvas is gone, words are readable`, r.state.canvasHidden && r.state.wordsVisible);
  ok(`${name}: the button still takes a click`, r.state.ctaHittable);
}

// ---- the phone gets the upright photograph ---------------------------------
{
  const r = await look({ name: 'phone', query: '?still=no-webgl', viewport: { width: 390, height: 844 } });
  ok('phone: three.js never requested', r.heavy.length === 0, r.heavy.join(', '));
  ok('phone: the upright photograph is on screen', r.photo && r.state.photoIn);
}

// ---- with JavaScript switched off entirely ---------------------------------
{
  const r = await look({
    name: 'no-javascript',
    query: '',
    viewport: { width: 1440, height: 900 },
    context: { javaScriptEnabled: false },
    scripts: false,
  });
  ok('no javascript: three.js never requested', r.heavy.length === 0, r.heavy.join(', '));
  ok('no javascript: the photograph is on screen', r.photo);
}

// ---- and the machine that can draw it still gets the pour ------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const asked = [];
  page.on('request', (r) => asked.push(r.url()));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.words.in', { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shots/still-full-3d.png' });
  const gotScene = asked.some((u) => /three\.module/.test(u));
  const gotPhoto = asked.some((u) => /counter-(wide|tall)\.webp/.test(u));
  ok('capable browser: the pour still runs', gotScene);
  ok('capable browser: the photograph is NOT downloaded as well', !gotPhoto);
  await ctx.close();
}

await browser.close();

console.log(`\n${checks - problems.length}/${checks} checks passed`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
