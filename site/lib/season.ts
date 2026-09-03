/**
 * What time of year it is, in her kitchen and in the church calendar.
 *
 * Not a theme picker. There is no control for this anywhere on the site and
 * nothing announces it: the shop is simply a slightly different colour when you
 * come back in December than it was in August, the way a room is.
 *
 * The shifts are accents only — the cream, the brown and the ink never move —
 * because a shop that repaints itself four times a year stops looking like one
 * shop. What changes is the green, the gold and the paper's warmth.
 *
 * Import-free, so `node --test` runs it directly.
 */

export type Season = "monsoon" | "harvest" | "advent" | "christmas" | "easter" | "ordinary";

/** Anonymous Gregorian computus. The one copy; the verse tests use this. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * The first Sunday of Advent: four Sundays before Christmas Day.
 *
 * Counted back from the Sunday on or before the 24th, so a Christmas Day that
 * falls on a Sunday does not steal a week from it.
 */
export function adventStart(year: number): Date {
  const eve = new Date(year, 11, 24);
  const sunday = new Date(year, 11, 24 - eve.getDay());
  return new Date(year, 11, sunday.getDate() - 21);
}

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * The season a date falls in.
 *
 * Ordered by which is most particular. Easter moves and is short, so it is
 * asked first; Advent is fixed to Christmas; the monsoon is Arizona's own
 * season and runs mid-June to the end of September; harvest is what is left of
 * the autumn. Everything else is simply the shop as it usually looks.
 */
export function seasonFor(when: Date = new Date()): Season {
  if (Number.isNaN(when.getTime())) return "ordinary";

  const year = when.getFullYear();
  const now = day(when);

  // Holy Week and Easter week: the Sunday before, through the Saturday after.
  const easter = easterSunday(year);
  const palm = new Date(year, easter.getMonth(), easter.getDate() - 7);
  const low = new Date(year, easter.getMonth(), easter.getDate() + 7);
  if (now >= day(palm) && now <= day(low)) return "easter";

  // Advent, up to and including Christmas Eve. It stops there because violet is
  // the colour of waiting, and on Christmas Day the waiting is over.
  if (now >= day(adventStart(year)) && now <= day(new Date(year, 11, 24))) return "advent";

  // The twelve days. White and pale gold, the same as Easter, because they are
  // the same thing being celebrated from either end — and because a shop that
  // is violet on the 24th and plain on the 25th looks broken.
  if (now >= day(new Date(year, 11, 25))) return "christmas";
  if (now <= day(new Date(year, 0, 6))) return "christmas";

  // The Arizona monsoon. Hot, green, and the only season here nobody has to be
  // told about.
  if (now >= day(new Date(year, 5, 15)) && now <= day(new Date(year, 8, 30))) return "monsoon";

  // Autumn, from October until Advent takes over.
  if (now >= day(new Date(year, 9, 1)) && now < day(adventStart(year))) return "harvest";

  return "ordinary";
}

/** What each one is called, for anyone reading the code or a test. */
export const SEASONS: Record<Season, string> = {
  ordinary: "the shop as it usually looks",
  monsoon: "hot green, mid-June to the end of September",
  harvest: "harvest gold, October until Advent",
  advent: "deep violet, the four Sundays before Christmas",
  christmas: "white and pale gold, Christmas Day to Epiphany",
  easter: "white and pale gold, Holy Week and Easter week",
};
