import type { Flavor, LabelSettings, LabelSize, LabelTemplate, Verse } from "@/lib/content";
import { defaultLabelSettings, labelScripture } from "@/lib/content";

/**
 * The T50M Pro prints 203 DPI on 50mm-wide tape. This label is landscape:
 * 80mm along the feed (640 dots) by 48mm of printable height (384 dots).
 */
export const LABEL_WIDTH_PX = 640;
export const LABEL_HEIGHT_PX = 384;

export const LABEL_COTTAGE = "Made in a home kitchen · Peoria, AZ";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function defaultNetWeight(size: LabelSize): string {
  void size; // Legacy bag/jar templates both default to one pound.
  return "Net Wt 16 oz (454 g)";
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Sep 12, 2026" from a date box, so packed dates do not shift with UTC. */
export function formatPackedDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso.trim();
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso.trim();
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function mmdd(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return match ? `${match[2]}${match[3]}` : "";
}

/**
 * Two letters from the flavor, so Honey Almond Crunch is HA and Maple Pecan is
 * MP. "Sea Salt" is dropped because it is a taste, not the flavor's name.
 */
export function flavorInitials(name: string): string {
  const skip = /^(and|the|of|with|sea|salt)$/i;
  const letters = name
    .split(/\s+/)
    .filter((word) => word && !skip.test(word))
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "HH";
}

export function trackerFrom(customerName: string, flavorName: string, producedIso: string): string {
  const first =
    (customerName.trim().split(/\s+/)[0] ?? "")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 8) || "ORDER";
  const date = mmdd(producedIso) || mmdd(todayIso());
  return `${first}-${flavorInitials(flavorName)}-${date}`;
}

export function pngFilename(slug: string, producedIso: string, tracker: string): string {
  const date = mmdd(producedIso) || "date";
  const code = tracker
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "batch";
  const flavor = slug.replace(/[^a-z0-9-]+/g, "") || "granola";
  return `hhp-${flavor}-${date}-${code}.png`;
}

export function templateFor(
  settings: LabelSettings,
  flavor: Flavor,
): Omit<LabelTemplate, "flavorSlug"> & { flavorSlug: string } {
  const saved = settings.templates.find((row) => row.flavorSlug === flavor.slug);
  if (saved) return saved;
  return {
    flavorSlug: flavor.slug,
    title: flavor.name,
    ingredients: flavor.ingredients,
    allergens: flavor.allergens,
    scripture: settings.scripture.text.trim() ? settings.scripture : labelScripture,
    netWeight: defaultNetWeight("bag"),
    size: "bag",
  };
}

export function upsertTemplate(settings: LabelSettings, template: LabelTemplate): LabelSettings {
  const rest = settings.templates.filter((row) => row.flavorSlug !== template.flavorSlug);
  return {
    scripture: template.scripture,
    qrUrl: settings.qrUrl.trim() || defaultLabelSettings.qrUrl,
    templates: [...rest, template],
  };
}

export type LabelDraft = {
  title: string;
  ingredients: string;
  allergens: string;
  scripture: Verse;
  netWeight: string;
  producedDate: string;
  tracker: string;
};
