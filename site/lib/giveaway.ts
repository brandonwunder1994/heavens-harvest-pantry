/**
 * The monthly giveaway: what she sets, what an entrant types, and how both are
 * tidied. Import-free on purpose, so `node --test` runs it straight from
 * TypeScript with no build step.
 */

export type GiveawaySetting = {
  /** Entries are being accepted. */
  open: boolean;
  /** The Instagram post people must like and share. */
  postUrl: string;
  /** What the winner gets, in her words. */
  prize: string;
  /** "YYYY-MM-DD", Arizona time. Also decides which month's entries count. */
  drawDate: string;
  /** Free text, e.g. "7:00 PM". */
  drawTime: string;
  /** How the winner collects the prize. */
  pickupNote: string;
  /** False keeps every name off the wheel (and out of the page) until draw day. */
  revealed: boolean;
};

export const noGiveaway: GiveawaySetting = {
  open: false,
  postUrl: "",
  prize: "",
  drawDate: "",
  drawTime: "",
  pickupNote: "",
  revealed: false,
};

export const giveawayLimits = { prize: 160, time: 30, note: 300, url: 300 } as const;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const tidy = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Only a link to Instagram itself, so the button can never point somewhere else. */
export function cleanPostUrl(value: unknown): string {
  const raw = tidy(value, giveawayLimits.url);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return "";
    if (host !== "instagram.com" && !host.endsWith(".instagram.com") && host !== "instagr.am") return "";
    return url.toString();
  } catch {
    return "";
  }
}

const validDate = (value: unknown): string => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw ? "" : raw;
};

/** Whatever is stored, made safe to render. Forgiving: a bad field becomes blank. */
export function cleanGiveaway(value: unknown): GiveawaySetting {
  const v = asObject(value);
  return {
    open: v.open === true,
    postUrl: cleanPostUrl(v.postUrl),
    prize: tidy(v.prize, giveawayLimits.prize),
    drawDate: validDate(v.drawDate),
    drawTime: tidy(v.drawTime, giveawayLimits.time),
    pickupNote: tidy(v.pickupNote, giveawayLimits.note),
    revealed: v.revealed === true,
  };
}

export type SettingCheck = { ok: true; setting: GiveawaySetting } | { ok: false; problem: string };

/** Strict: what she is about to save. The message is what she reads. */
export function checkGiveawaySetting(value: unknown): SettingCheck {
  const v = asObject(value);
  const setting = cleanGiveaway(v);

  if (typeof v.postUrl === "string" && v.postUrl.trim() && !setting.postUrl) {
    return { ok: false, problem: "That link is not an Instagram link. Open the post, copy its link, and paste it here." };
  }
  if (typeof v.drawDate === "string" && v.drawDate.trim() && !setting.drawDate) {
    return { ok: false, problem: "That draw date does not look right. Pick it from the calendar." };
  }
  if (setting.open && !setting.postUrl) {
    return { ok: false, problem: "Add the Instagram post link before opening the giveaway, so people know what to like and share." };
  }
  if (setting.open && !setting.drawDate) {
    return { ok: false, problem: "Pick the draw date before opening the giveaway. It goes in everyone's email." };
  }
  if (setting.open && !setting.prize) {
    return { ok: false, problem: "Say what the winner gets before opening the giveaway." };
  }
  return { ok: true, setting };
}

// ------------------------------------------------------------------ dates

const phoenixMonth = (now: number): string => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit" }).formatToParts(new Date(now));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
};

/**
 * Which month's entries these are. It follows the draw date, so moving the draw
 * to a new month starts a fresh list, and last month's entrants can enter again.
 */
export function roundKey(setting: GiveawaySetting, now = Date.now()): string {
  return setting.drawDate ? setting.drawDate.slice(0, 7) : phoenixMonth(now);
}

/** "Friday, November 27 at 7:00 PM Arizona time", or "" if no date is set. */
export function drawLabel(setting: GiveawaySetting): string {
  if (!setting.drawDate) return "";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(
    new Date(`${setting.drawDate}T12:00:00Z`),
  );
  return setting.drawTime ? `${day} at ${setting.drawTime} Arizona time` : day;
}

// ---------------------------------------------------------------- entries

export type EntryDraft = {
  name: string;
  email: string;
  instagram: string;
  phone: string;
};

export type EntryCheck =
  | { ok: true; draft: EntryDraft }
  | { ok: false; errors: Record<string, string> };

/** "@Jane.Doe", "jane.doe " and "https://instagram.com/jane.doe/" all become "jane.doe". */
export function cleanInstagram(value: unknown): string {
  let raw = tidy(value, 120).toLowerCase();
  const link = raw.match(/instagram\.com\/([^/?#\s]+)/);
  if (link) raw = link[1];
  raw = raw.replace(/^@+/, "");
  return /^[a-z0-9._]{1,30}$/.test(raw) ? raw : "";
}

export function checkEntry(input: unknown): EntryCheck {
  const raw = asObject(input);
  const errors: Record<string, string> = {};

  const name = tidy(raw.name, 60);
  if (name.length < 2) errors.name = "Please type your name.";

  const email = tidy(raw.email, 120).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "We need a real email so we can send your confirmation.";

  const instagram = cleanInstagram(raw.instagram);
  if (!instagram) errors.instagram = "Type your Instagram name, like @yourname, so we can find your like and share.";

  const phoneRaw = tidy(raw.phone, 30);
  const digits = phoneRaw.replace(/\D/g, "");
  if (phoneRaw && (digits.length < 10 || digits.length > 15)) errors.phone = "That phone number does not look right. You can leave it blank.";

  if (raw.confirmed !== true) errors.confirmed = "Please like and share the post first, then tick this box.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, draft: { name, email, instagram, phone: phoneRaw } };
}

/** "Jane D." — enough to cheer for, not enough to find. */
export function wheelName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
