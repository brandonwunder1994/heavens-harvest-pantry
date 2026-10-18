import type { Flavor } from "@/lib/content";

/**
 * The menu shows one "Chocolate Coconut Cashew" and lets a customer pick dark
 * or semi-sweet inside it. Behind the scenes they stay two flavors, so orders,
 * bag labels, kitchen counts and costs keep working exactly as before.
 */
const GROUPS = [
  {
    slug: "chocolate-coconut-cashew",
    name: "Chocolate Coconut Cashew Granola",
    blurb: "Toasted coconut and crunchy cashews in your choice of dark or semi-sweet chocolate. The decadent one.",
    members: [
      { slug: "dark-chocolate-sea-salt", label: "Dark chocolate" },
      { slug: "chocolate-chip-coconut-cashew", label: "Semi-sweet chocolate" },
    ],
  },
] as const;

/** What the customer sees on the menu: variants folded into one entry. */
export function menuFlavors(flavors: Flavor[]): Flavor[] {
  const taken = new Set<string>();
  const out: Flavor[] = [];
  for (const flavor of flavors) {
    if (taken.has(flavor.slug)) continue;
    const group = GROUPS.find(g => g.members.some(m => m.slug === flavor.slug));
    if (!group) { out.push(flavor); continue; }
    const variants = group.members.flatMap(m => {
      const found = flavors.find(f => f.slug === m.slug);
      return found ? [{ ...found, variantLabel: m.label }] : [];
    });
    variants.forEach(v => taken.add(v.slug));
    if (variants.length < 2) { out.push(flavor); continue; }
    const first = variants.find(v => !v.soldOut) ?? variants[0];
    out.push({ ...first, slug: group.slug, name: group.name, blurb: group.blurb, soldOut: variants.every(v => v.soldOut), variants });
  }
  return out;
}

/** True if a menu entry (or the old link slug) refers to this flavor slug. */
export function entryHasSlug(entry: Flavor, slug: string): boolean {
  return entry.slug === slug || !!entry.variants?.some(v => v.slug === slug);
}
