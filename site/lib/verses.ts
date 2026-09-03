// Which verse is "this week".
//
// Worked out from the date rather than stored anywhere, so nobody has to
// remember to change it on a Monday morning and it can never be missed. She
// edits verses.json and nothing else.

import data from "@/content/verses.json" with { type: "json" };

export type Verse = { ref: string; text: string; note: string | null };

const DAY = 86_400_000;

/** The Monday at or before `when`, at the hour she has chosen (default 5am). */
export function mondayOf(when: Date): Date {
  const [h, m] = (data.changesAt || '05:00').split(':').map(Number);
  const x = new Date(when.getFullYear(), when.getMonth(), when.getDate(), h, m, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 0 = Monday
  if (when < x) x.setDate(x.getDate() - 7);        // before 5am Monday is still last week
  return x;
}

const anchor = mondayOf(new Date(data.anchorMonday + 'T12:00:00'));

export function weekNumber(when: Date = new Date()): number {
  return Math.max(0, Math.round((mondayOf(when).getTime() - anchor.getTime()) / (7 * DAY)));
}

/** Which week of the calendar a date belongs to — the week owning its Thursday. */
export function calendarWeek(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  const jan1 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - jan1.getTime()) / DAY + 1) / 7);
}

// With a full year loaded, the list IS the calendar: verse one is the week of
// New Year, verse fifty-two is Christmas week. That is what keeps Advent in
// December for good, instead of sliding a day earlier every year the way a
// plain fifty-two-week loop does. A shorter list falls back to the loop.
const byCalendar =
  (data as { orderedBy?: string }).orderedBy === 'calendar-week' &&
  (data.verses as Verse[]).length >= 52;

export function verseForWeek(week: number): Verse {
  const list = data.verses as Verse[];
  if (data.pinned != null) return list[data.pinned as number];
  if (byCalendar) {
    const on = new Date(anchor.getTime() + week * 7 * DAY);
    return list[Math.min(calendarWeek(on), list.length) - 1];
  }
  return list[week % list.length];
}

export function thisWeek(when: Date = new Date()) {
  const week = weekNumber(when);
  return {
    week,
    verse: verseForWeek(week),
    startsOn: new Date(anchor.getTime() + week * 7 * DAY),
    nextOn: new Date(anchor.getTime() + (week + 1) * 7 * DAY),
    translation: data.translation as string,
  };
}

/** Every verse from the first week to this one, newest first. */
export function wall(when: Date = new Date()) {
  const week = weekNumber(when);
  const out: Array<{ verse: Verse; on: Date; week: number }> = [];
  for (let w = week; w >= 0; w--) {
    out.push({ verse: verseForWeek(w), on: new Date(anchor.getTime() + w * 7 * DAY), week: w });
  }
  return out;
}

/**
 * Every verse she has, in the order she wrote them.
 *
 * For choosing one deliberately — the card you send with a jar — rather than
 * being handed the week's. `pinned` is ignored here on purpose: pinning is how
 * she holds one week still, not a way of shortening her own book.
 */
export function everyVerse(): Verse[] {
  return (data.verses as Verse[]).slice();
}

/** How long the rotation runs before anyone sees a verse twice. */
export function weeksUntilRepeat(): number {
  return (data.verses as Verse[]).length;
}

/**
 * This week's verse in the shape the rest of the site uses.
 *
 * The calendar chooses it, so there is no Monday morning task and nothing to
 * forget. Her own choice, saved on her page, overrides this — see
 * `lib/settings.ts`, which is the only place the two meet.
 */
export function weeklyVerse(when: Date = new Date()): { text: string; reference: string } {
  const { verse } = thisWeek(when);
  return { text: verse.text, reference: verse.ref };
}
