import type { Format } from "@/lib/cart";
import type { Flavor } from "@/lib/content";

/**
 * The one-tap reorder link.
 *
 * The basket lives in the customer's own browser, so there is nothing on the
 * server to point at. Instead the link carries the order in the address —
 * `slug:format:qty` — and the menu page puts it in their basket when they
 * arrive. Anything she has since renamed or sold out simply is not in the link,
 * so the button can never add something that is not for sale.
 *
 * Import-free apart from types, so `node --test` runs it directly.
 */

export type ReorderLine = { slug: string; format: Format; qty: number };

const MAX_LINES = 12;
const MAX_QTY = 20;

/** Builds the link, or null when nothing on the old order can still be bought. */
export function reorderLink(
  items: { qty: number; name: string; format: "jar" | "bag" }[],
  flavors: Flavor[],
): string | null {
  const bySlug = new Map(flavors.filter((f) => !f.soldOut).map((f) => [f.name.toLowerCase(), f.slug]));

  const parts: string[] = [];
  for (const item of items.slice(0, MAX_LINES)) {
    const slug = bySlug.get(item.name.trim().toLowerCase());
    const qty = Math.min(Math.max(1, Math.floor(Number(item.qty) || 0)), MAX_QTY);
    if (!slug) continue;
    parts.push(`${slug}:${item.format}:${qty}`);
  }

  return parts.length > 0 ? `/menu?again=${encodeURIComponent(parts.join(","))}` : null;
}

/** Reads the link back. Anything malformed is dropped rather than guessed at. */
export function readReorder(raw: string | null | undefined, flavors: Flavor[]): ReorderLine[] {
  if (!raw) return [];

  const sellable = new Set(flavors.filter((f) => !f.soldOut).map((f) => f.slug));
  const seen = new Set<string>();
  const lines: ReorderLine[] = [];

  for (const part of raw.split(",").slice(0, MAX_LINES)) {
    const [slug, format, qty] = part.split(":");
    if (!sellable.has(slug)) continue;
    if (format !== "jar" && format !== "bag") continue;

    const key = `${slug}:${format}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 1) continue;
    lines.push({ slug, format, qty: Math.min(n, MAX_QTY) });
  }

  return lines;
}

/** What to tell them when the basket has been filled for them. */
export function reorderNote(asked: number, added: number): string {
  if (added === 0) return "Nothing from that order is on the menu this week. Have a look at what is.";
  if (added < asked) {
    return `Some of that order is back in your basket. The rest is not on the menu this week.`;
  }
  return added === 1
    ? "That is back in your basket. Change anything you like before you order."
    : "Those are back in your basket. Change anything you like before you order.";
}
