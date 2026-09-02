// Proves the rotation stays in season.
//
//   node check-seasons.mjs
//
// The list is ordered by calendar week, so every anchor below has to land on a
// verse that belongs to it — in every year, not just the first one. Easter and
// the American holidays all move, so each test names every verse that would be
// a good answer, and the run fails if any year falls outside them.

import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./verses.json', import.meta.url), 'utf8'));
const list = data.verses;
const DAY = 86_400_000;
const FROM = 2026;
const TO = 2070;

function calendarWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  const jan1 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - jan1) / DAY + 1) / 7);
}
const verseOn = (d) => {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return list[Math.min(calendarWeek(monday), list.length) - 1];
};

// Anonymous Gregorian computus.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const nth = (y, mo, dow, n) => {
  const first = 1 + ((dow - new Date(y, mo, 1).getDay() + 7) % 7);
  return new Date(y, mo, first + 7 * (n - 1));
};

const TESTS = [
  ['Easter Sunday',       (y) => easter(y),          ['Isaiah 53:5', 'Luke 24:6', 'John 12:24', '2 Corinthians 5:17', '1 Peter 1:3']],
  ['Christmas Day',       (y) => new Date(y, 11, 25), ['Luke 2:10-11', 'Isaiah 9:6']],
  ['Advent, first week',  (y) => new Date(y, 11, 3),  ['Philippians 4:6', 'Isaiah 9:2', 'Colossians 3:15']],
  ['Thanksgiving',        (y) => nth(y, 10, 4, 4),    ['Colossians 3:15', 'Psalm 107:1', '1 Thessalonians 5:18']],
  ["New Year's Day",      (y) => new Date(y, 0, 1),   ['Numbers 6:24-25', 'Luke 2:10-11', 'Isaiah 43:19']],
  ["Valentine's Day",     (y) => new Date(y, 1, 14),  ['1 Corinthians 13:4', 'Psalm 143:8']],
  ["Mother's Day",        (y) => nth(y, 4, 0, 2),     ['Proverbs 31:15', 'Psalm 1:3']],
  ['Independence Day',    (y) => new Date(y, 6, 4),   ['Galatians 5:1', 'Psalm 34:8']],
  ['Labor Day',           (y) => nth(y, 8, 1, 1),     ['Ecclesiastes 4:9', 'James 1:17']],
  ['peak Arizona summer', (y) => new Date(y, 6, 20),  ['Isaiah 58:11', 'John 4:14', 'Psalm 121:5-6', 'Matthew 11:28', 'Psalm 63:1', 'Psalm 46:10', 'Isaiah 40:31']],
  ['harvest, mid-October',(y) => new Date(y, 9, 15),  ['Galatians 6:9', 'Psalm 65:11', 'John 6:35', 'Luke 6:38']],
];

const years = TO - FROM + 1;
let failed = 0;

// The list has to be a full year, or the site falls back to a plain loop and
// none of this holds.
if (list.length < 52) {
  console.log(`FAIL  the list is ${list.length} long; the calendar order needs 52`);
  failed++;
} else {
  console.log(`ok    ${list.length} verses, ordered by calendar week`);
}
const refs = list.map((v) => v.ref);
const dupes = refs.filter((r, i) => refs.indexOf(r) !== i);
console.log(dupes.length ? `FAIL  repeated inside one year: ${dupes.join(', ')}` : 'ok    no verse repeats inside a year');
if (dupes.length) failed++;

for (const [name, dateOf, want] of TESTS) {
  const misses = [];
  for (let y = FROM; y <= TO; y++) {
    const ref = verseOn(dateOf(y)).ref;
    if (!want.includes(ref)) misses.push(`${y}: ${ref}`);
  }
  if (misses.length) failed++;
  console.log(
    `${misses.length ? 'FAIL' : 'ok  '}  ${name.padEnd(21)} ${
      misses.length ? misses.slice(0, 5).join('; ') : `${years}/${years} years in season`
    }`
  );
}

// Said plainly rather than tested around: Lent is the one season a fixed weekly
// rotation cannot follow. It opens anywhere from 4 February to 10 March — five
// weeks of travel — so in some years week nine is already Lent and in others it
// is still a fortnight away. What is guaranteed is the part that matters: Easter
// Sunday itself always lands on one of the five cross-and-resurrection verses.
// For the year she wants Lent exact, `pinned` holds one verse in place.
console.log('');
console.log('Known limit: Lent moves five weeks, so weeks 9-11 are Lent-shaped');
console.log('rather than Lent-aligned. Easter Sunday itself is exact, every year.');

console.log(failed ? `\n${failed} failed` : `\nEvery anchor holds, ${FROM} to ${TO}.`);
process.exitCode = failed ? 1 : 0;
