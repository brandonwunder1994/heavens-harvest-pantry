// Proves the craft pass in a real browser.
//
//   python -m http.server 8794 --directory .
//   node shots.mjs        ->  shots/*.png
//
// Three of these four are things you can only prove by measuring:
//
//   * the type is about how far the page moves when the fonts land, which is
//     measured against the same page with the fix taken out;
//   * the sound is rendered offline and its waveform inspected, because a sound
//     nobody can look at is a sound nobody can prove works;
//   * the timer has to stop moving for somebody who has asked it to.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.CRAFT_URL || 'http://127.0.0.1:8794/index.html';
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

async function open(width = 1440, height = 900, extra = {}) {
  const context = await browser.newContext({ ...CONTEXT, viewport: { width, height }, deviceScaleFactor: 1, ...extra });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return { context, page };
}

// ================================================== 1. type that behaves

// How far a block of text moves between the fallback and the real face. This is
// the reflow a visitor sees, and it is measured rather than asserted.
async function reflow({ withFix }) {
  const context = await browser.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  if (!withFix) {
    // Take the fix out: the stacks go back to naked Georgia and Arial.
    await page.addStyleTag({
      content: `:root{
        --font-display:'Cinzel',Georgia,serif;
        --font-serif:'Cormorant Garamond',Georgia,serif;
        --font-ui:'Karla',Arial,sans-serif;
      }`,
    });
  }
  await page.evaluate(() => document.fonts.ready);

  const moved = await page.evaluate(async ({ withFix }) => {
    // Width, not height. A block's height only moves once the reflow is big
    // enough to change the line count, so it hides most of the drift; the width
    // of one unwrapped line is the real difference between the two faces.
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;left:-9999px;top:0;white-space:nowrap;font-size:22px;line-height:1.3';
    probe.textContent =
      'Small-batch granola, hand-stirred, jarred by hand, and dropped at your door on Thursday morning.';
    document.body.appendChild(probe);

    const measure = (family) => {
      probe.style.fontFamily = family;
      return probe.getBoundingClientRect().width;
    };

    const real = measure("'Cormorant Garamond', Georgia, serif");
    const stand = measure(withFix ? "'Cormorant Fallback', Georgia, serif" : 'Georgia, serif');
    probe.remove();
    return {
      real: Math.round(real),
      stand: Math.round(stand),
      drift: Math.round(Math.abs(real - stand)),
      percent: +((Math.abs(real - stand) / real) * 100).toFixed(1),
    };
  }, { withFix });

  await context.close();
  return moved;
}

{
  const without = await reflow({ withFix: false });
  const withIt = await reflow({ withFix: true });

  ok(
    'type: the unfixed page really does lurch when the font lands',
    without.percent > 5,
    `one line is ${without.stand}px in the fallback, ${without.real}px in the real face — ${without.percent}% out`,
  );
  ok(
    'type: with the measured stand-in, that line barely moves',
    withIt.percent < 1.5,
    `${without.percent}% out becomes ${withIt.percent}%`,
  );
}

{
  const { context, page } = await open();

  const typeset = await page.evaluate(async () => {
    const cs = (sel, prop) => {
      const n = document.querySelector(sel);
      return n ? getComputedStyle(n)[prop] : null;
    };
    // Two headline boxes, the same words: one balanced, one not.
    const boxes = [...document.querySelectorAll('.headline-demo p.raw, .headline-demo p.display')].map((n) => ({
      raw: n.classList.contains('raw'),
      lines: Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)),
      // How ragged the right edge is: the widest line minus the narrowest.
      spread: (() => {
        const r = document.createRange();
        r.selectNodeContents(n);
        const rects = [...r.getClientRects()].filter((x) => x.width > 1);
        if (rects.length < 2) return 0;
        const widths = rects.map((x) => x.width);
        return Math.round(Math.max(...widths) - Math.min(...widths));
      })(),
    }));
    return {
      boxes,
      balanced: cs('.headline-demo p.display', 'textWrap'),
      pretty: cs('.say', 'textWrap'),
      figures: cs('.menu:not(.raw) .price', 'fontVariantNumeric'),
      rawFigures: cs('.menu.raw .price', 'fontVariantNumeric'),
      // Chrome drops the declaration at parse time because it does not support
      // it, so the CSSOM cannot answer this. The source can: what matters is
      // that the rule really ships, for the browsers that do honour it.
      hanging: (await fetch('./type.css').then((r) => r.text())).includes(
        'hanging-punctuation: first last',
      ),
      stack: getComputedStyle(document.documentElement).getPropertyValue('--font-serif').trim(),
      rows: document.querySelectorAll('#metrics tbody tr').length,
    };
  });

  ok('type: headlines are balanced', typeset.balanced === 'balance', typeset.balanced);
  ok('type: body copy avoids a stranded last word', typeset.pretty === 'pretty', typeset.pretty);
  ok('type: prices are lining and tabular', typeset.figures === 'lining-nums tabular-nums', typeset.figures);
  ok('type: and the before-column is deliberately not', typeset.rawFigures === 'normal', typeset.rawFigures);
  ok('type: quotes are set to hang, for the browsers that can', typeset.hanging === true);
  ok('type: the stand-in is in the stack', typeset.stack.includes('Cormorant Fallback'), typeset.stack);
  ok('type: the measured numbers are on the page', typeset.rows === 3, String(typeset.rows));

  const raw = typeset.boxes.find((b) => b.raw);
  const bal = typeset.boxes.find((b) => !b.raw);
  ok(
    'type: balancing evens the lines rather than just rewrapping them',
    bal.spread < raw.spread,
    `ragged edge ${raw.spread}px becomes ${bal.spread}px`,
  );

  await page.screenshot({ path: 'shots/desktop.png', fullPage: true });
  await page.locator('.headline-demo').screenshot({ path: 'shots/type-headlines.png' });
  await page.locator('section.demo').nth(0).locator('.two').nth(1).screenshot({ path: 'shots/type-figures.png' });
  await context.close();
}

// ================================================== 2. real paper
{
  const { context, page } = await open();
  const paper = await page.evaluate(() => {
    const n = document.querySelector('#card');
    const before = getComputedStyle(n, '::before');
    const after = getComputedStyle(n, '::after');
    return {
      fibre: before.backgroundImage.includes('svg') && before.backgroundImage.includes('feTurbulence'),
      blend: before.mixBlendMode,
      deboss: after.boxShadow !== 'none' && after.boxShadow.includes('inset'),
      ink: getComputedStyle(document.querySelector('#card .verse')).textShadow !== 'none',
      requests: performance.getEntriesByType('resource').filter((r) => /\.(png|jpe?g|webp|avif)$/i.test(r.name)).length,
    };
  });
  ok('paper: the fibre is drawn, not downloaded', paper.fibre);
  ok('paper: it multiplies into the sheet rather than sitting on it', paper.blend === 'multiply', paper.blend);
  ok('paper: the press left a deboss', paper.deboss);
  ok('paper: the ink sinks into the surface', paper.ink);
  ok('paper: no image is fetched for any of it', paper.requests === 0, String(paper.requests));

  // The grain has to be actually visible. A texture nobody can see is not
  // restraint, it is a texture that is not there — which is exactly what the
  // first version of this was, and only measuring caught it.
  const grain = await (async () => {
    await page.evaluate(() => {
      const mk = (cls, top) => {
        const d = document.createElement('div');
        d.className = cls;
        d.id = cls.includes('no-press') ? 'probe-plain' : 'probe-grain';
        d.style.cssText = `position:fixed;left:20px;top:${top}px;width:200px;height:140px;z-index:9999`;
        document.body.appendChild(d);
      };
      mk('paper', 20);
      mk('paper no-press', 200);
    });
    await page.waitForTimeout(400);

    const patch = async (sel) => {
      const shot = (await page.locator(sel).screenshot()).toString('base64');
      return page.evaluate(async (src) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + src;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const px = x.getImageData(30, 30, 140, 80).data;
        const v = [];
        for (let i = 0; i < px.length; i += 4) v.push((px[i] + px[i + 1] + px[i + 2]) / 3);
        const m = v.reduce((a, b) => a + b, 0) / v.length;
        return +Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length).toFixed(2);
      }, shot);
    };

    const withIt = await patch('#probe-grain');
    const without = await patch('#probe-plain');
    await page.evaluate(() => {
      document.getElementById('probe-grain')?.remove();
      document.getElementById('probe-plain')?.remove();
    });
    return { withIt, without };
  })();

  ok('paper: bare paper has no grain at all without it', grain.without < 0.2, `${grain.without} levels`);
  ok('paper: and visible grain with it', grain.withIt > 1, `${grain.withIt} levels of variation`);
  ok('paper: but not so much that it reads as noise', grain.withIt < 6, `${grain.withIt} levels`);

  await page.locator('#card').screenshot({ path: 'shots/paper.png' });
  await page.locator('#card-plain').screenshot({ path: 'shots/paper-before.png' });
  await context.close();
}

// ================================================== 3. the oven timer
{
  const { context, page } = await open();
  const timer = await page.evaluate(() => {
    const wound = document.querySelector('.timer .wound');
    const hand = document.querySelector('.timer .hand');
    return {
      timers: document.querySelectorAll('.timer').length,
      winds: getComputedStyle(wound).animationName,
      turns: getComputedStyle(hand).animationName,
      live: document.querySelector('.timer').getAttribute('role'),
      dash: getComputedStyle(wound).strokeDasharray,
    };
  });
  ok('timer: three sizes on the page', timer.timers === 3, String(timer.timers));
  ok('timer: the spring unwinds', timer.winds === 'timer-unwind', timer.winds);
  ok('timer: the hand turns', timer.turns === 'timer-hand', timer.turns);
  ok('timer: it announces itself to a screen reader', timer.live === 'status', timer.live);
  ok('timer: the dial is measured, not eyeballed', timer.dash.startsWith('226'), timer.dash);

  await page.locator('#timers').screenshot({ path: 'shots/oven-timer.png' });
  await context.close();
}
{
  // Somebody who has asked their device to keep still.
  const { context, page } = await open(1440, 900, { reducedMotion: 'reduce' });
  const still = await page.evaluate(() => ({
    winds: getComputedStyle(document.querySelector('.timer .wound')).animationName,
    turns: getComputedStyle(document.querySelector('.timer .hand')).animationName,
    words: document.querySelector('.timer .said')?.textContent.trim(),
  }));
  ok('timer: reduced motion stops it dead', still.winds === 'none' && still.turns === 'none');
  ok('timer: and the words still say what it said', !!still.words, still.words);
  await page.locator('#timers').screenshot({ path: 'shots/oven-timer-still.png' });
  await context.close();
}

// ================================================== 4. one sound, once
{
  const { context, page } = await open();

  // What the crunch actually is, rendered offline and looked at.
  const wave = await page.evaluate(async () => {
    const { render, DURATION } = await import('./crunch.js');
    const rate = 48000;
    const offline = new OfflineAudioContext(1, Math.ceil(rate * 0.4), rate);
    render(offline, 0);
    const buf = await offline.startRendering();
    const d = buf.getChannelData(0);

    let peak = 0;
    let peakAt = 0;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) { peak = v; peakAt = i / rate; }
    }
    // Where it has fallen back to silence.
    let endAt = 0;
    for (let i = d.length - 1; i >= 0; i--) {
      if (Math.abs(d[i]) > peak * 0.02) { endAt = i / rate; break; }
    }
    // Zero crossings give a rough centre frequency for the burst.
    let crossings = 0;
    const upto = Math.floor(rate * DURATION);
    for (let i = 1; i < upto; i++) if (d[i - 1] < 0 !== d[i] < 0) crossings++;
    return { peak, peakAt, endAt, hz: Math.round((crossings / 2 / DURATION)) };
  });

  ok('sound: it actually makes a sound', wave.peak > 0.01, `peak ${wave.peak.toFixed(3)}`);
  ok('sound: it is not loud', wave.peak < 0.35, `peak ${wave.peak.toFixed(3)}`);
  ok('sound: it snaps rather than swells', wave.peakAt < 0.03, `peaks at ${(wave.peakAt * 1000).toFixed(0)}ms`);
  ok('sound: and it is gone in under a fifth of a second', wave.endAt < 0.2, `silent by ${(wave.endAt * 1000).toFixed(0)}ms`);
  ok('sound: it sits where a dry thing breaking sits', wave.hz > 900 && wave.hz < 4500, `${wave.hz} Hz`);

  // The rules around it.
  const rules = await page.evaluate(async () => {
    const m = await import('./crunch.js');
    localStorage.removeItem(m.STORAGE_KEY);
    m.reset();
    const offByDefault = m.soundIsOn() === false && m.crunch() === false;

    m.setSound(true);
    m.reset();
    const first = m.crunch(1000);
    const tooSoon = m.crunch(1000 + m.DEBOUNCE_MS - 20);
    const later = m.crunch(1000 + m.DEBOUNCE_MS + 20);

    m.setSound(false);
    const silentAgain = m.crunch(9_000_000);

    const remembered = (() => {
      m.setSound(true);
      return localStorage.getItem(m.STORAGE_KEY) === 'on';
    })();

    m.setSound(false);
    m.reset();
    return { offByDefault, first, tooSoon, later, silentAgain, remembered };
  });

  ok('sound: off on a first visit, always', rules.offByDefault);
  ok('sound: it plays once switched on', rules.first === true);
  ok('sound: two presses in a moment are one crunch', rules.tooSoon === false);
  ok('sound: and it is ready again straight after', rules.later === true);
  ok('sound: switching it off makes it silent again', rules.silentAgain === false);
  ok('sound: the choice is remembered', rules.remembered);

  // The switch itself.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const before = await page.getAttribute('#sw', 'aria-checked');
  await page.click('#sw');
  await page.waitForTimeout(200);
  const after = await page.getAttribute('#sw', 'aria-checked');
  ok('sound: the switch starts off and turns on', before === 'false' && after === 'true', `${before} -> ${after}`);
  ok('sound: it is a switch to a screen reader', (await page.getAttribute('#sw', 'role')) === 'switch');
  await page.locator('.sound-row').screenshot({ path: 'shots/sound-switch.png' });

  await context.close();
}

// ================================================== the phone
{
  const { context, page } = await open(390, 844);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  ok('phone: no sideways scroll', overflow <= 1, overflow > 1 ? `${overflow}px` : '');
  await page.screenshot({ path: 'shots/phone.png', fullPage: true });
  await context.close();
}

await browser.close();

console.log(`\n${ran - problems.length}/${ran} checks passed`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
