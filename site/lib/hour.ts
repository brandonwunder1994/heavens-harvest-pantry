/**
 * What time of day it is, as far as the light is concerned.
 *
 * Her kitchen window faces the same way all day; what changes is where the sun
 * is in it. Four settings cover a day without pretending to be an almanac: the
 * low gold she actually bakes in, the flat overhead of midday, the amber that
 * comes in sideways before dinner, and the one warm bulb after dark.
 *
 * This is separate from the scene on purpose. It is a rule about clocks, it has
 * no idea what three.js is, and it can be tested without a browser.
 */
export type Hour = "dawn" | "noon" | "evening" | "night";

export const HOURS: readonly Hour[] = ["dawn", "noon", "evening", "night"];

/**
 * The light for a moment in the visitor's own day.
 *
 * The boundaries are where a kitchen actually changes, not where the clock
 * does: it is still morning light at nine, still evening at seven, and the
 * lamp is on by eight.
 */
export function hourFor(at: Date | number): Hour {
  const h = typeof at === "number" ? at : at.getHours();
  if (!Number.isFinite(h)) return "dawn";

  const clock = ((Math.floor(h) % 24) + 24) % 24;
  if (clock >= 5 && clock < 10) return "dawn";
  if (clock >= 10 && clock < 16) return "noon";
  if (clock >= 16 && clock < 20) return "evening";
  return "night";
}

/** True if `name` is one of the four, so a URL cannot ask for a fifth. */
export function isHour(name: string | null | undefined): name is Hour {
  return typeof name === "string" && (HOURS as readonly string[]).includes(name);
}
