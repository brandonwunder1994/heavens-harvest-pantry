import type { Flavor } from "@/lib/content";
export const SIZES = [3, 8, 16] as const;
/** The sizes a flavor is sold in. Candied nuts skip the 3 oz sampler unless the flavor says otherwise. */
/** The candied nuts, left to right as they stand in the Candied Nuts lineup. Saved menus match by these web addresses. */
export const NUT_ORDER = ["c", "candied-almonds", "coconut-cashews", "candied-pecans", "candied-cashews"] as const;
const BAG_ONLY_NUTS = ["coconut-cashews", "candied-pecans", "candied-cashews"];
export const isNut = (flavor: { slug?: string; name?: string; category?: string }): boolean =>
  flavor.category === "almonds" || NUT_ORDER.some(slug => slug === flavor.slug) || /candied/i.test(flavor.name ?? "");
export const flavorSizes = (flavor: { slug?: string; sizes?: readonly SizeOz[] }): readonly SizeOz[] =>
  flavor.sizes?.length ? SIZES.filter(s => flavor.sizes!.includes(s)) : BAG_ONLY_NUTS.includes(flavor.slug ?? "") ? [8, 16] : SIZES;
export const BLESSING_SIZES = [8, 16] as const;
export type SizeOz = typeof SIZES[number];
export const OMISSIONS = ["apples", "blueberries", "shredded-coconut"] as const;
export type Omission = typeof OMISSIONS[number];
export const omissionLabel: Record<Omission, string> = { apples: "No apples", blueberries: "No blueberries", "shredded-coconut": "No shredded coconut" };
export const sizeLabel = (size: number) => size === 16 ? "1 lb" : `${size} oz`;
export const netWeight = (size: number) => `Net Wt ${size} oz (${size === 3 ? 85 : size === 8 ? 227 : 454} g)`;
export function cleanOmissions(value: unknown): Omission[] { return Array.isArray(value) ? OMISSIONS.filter(o => value.includes(o)) : []; }
export function ingredientsWithout(ingredients: string, omissions: Omission[] = []): string {
  const parts = ingredients.split(/,(?![^()]*\))/);
  return parts.filter(part => !omissions.some(o => o === "apples" ? /\bapples?\b/i.test(part) : o === "blueberries" ? /\bblueberr(?:y|ies)\b/i.test(part) : /shredded coconut/i.test(part))).map(p => p.trim()).join(", ");
}
const darkIngredients = "Organic Rolled Oats, Organic Cashews, Organic Honey, Organic Dark Chocolate (Organic Cane Sugar, Organic Cacao Beans, Organic Cocoa Butter, Organic Sunflower Lecithin), Organic Coconut Oil, Organic Cocoa Powder, Organic Shredded Coconut, Organic Chia Seeds, Organic Pure Vanilla Extract, Himalayan pink salt.";
const base = { bagPrice: 16, jarPrice: 16, samplerPrice: 5, sizePrices: { 3: 5, 8: 10, 16: 16 }, soldOut: false };
const candiedNut = { ...base, bagPrice: 20, jarPrice: 20, samplerPrice: 6, sizePrices: { 3: 6, 8: 12, 16: 20 }, sizes: [8, 16] as SizeOz[], allowedOmissions: [], requiresCooling: false, category: "almonds" as const, blurb: "A new candied nut. Flavor name coming soon.", ingredients: "To be confirmed." };
export const launchFlavors: Flavor[] = [
  { ...base, slug: "maple-pecan", name: "Apple Maple Pecan Granola", blurb: "Sweet apples, warm maple, and crunchy pecans. The cozy one.", ingredients: "Organic Rolled Oats, Organic Pecans, Organic Maple Syrup, Organic Sun-dried Apples, Organic Flaxseed, Organic Coconut Oil, Organic Cinnamon, Pure Vanilla Extract, Himalayan pink salt.", allergens: "Pecans.", allowedOmissions: ["apples"], requiresCooling: false },
  { ...base, slug: "dark-chocolate-sea-salt", name: "Dark Chocolate Coconut Cashew Granola", blurb: "Rich dark chocolate, toasted coconut and crunchy cashews. The decadent one.", ingredients: darkIngredients, allergens: "Cashews.", allowedOmissions: ["shredded-coconut"], requiresCooling: true },
  { ...base, slug: "chocolate-chip-coconut-cashew", name: "Chocolate Chip Coconut Cashew Granola", blurb: "Chocolate chips, toasted coconut and crunchy cashews. The sweet and salty one.", ingredients: darkIngredients.replace(/Organic Dark Chocolate \([^)]*\)/, "Organic chocolate (organic cane sugar, organic cacao mass, cocoa liquor, and organic cocoa butter)"), allergens: "Cashews.", allowedOmissions: ["shredded-coconut"], requiresCooling: true },
  { ...base, slug: "cinnamon-apple", name: "Vanilla Blueberry Almond Granola", blurb: "Sweet blueberries, creamy vanilla, and crunchy almonds. The classic one.", ingredients: "Organic Rolled Oats, Organic Maple Syrup, Organic Coconut Oil, Organic Sliced Almonds, Organic sweetened blueberries (organic blueberries, organic cane sugar, organic expeller-pressed sunflower oil), Organic Cinnamon, Pure Vanilla Extract, Himalayan pink salt.", allergens: "Almonds.", allowedOmissions: ["blueberries"], requiresCooling: false },
  { ...base, slug: "c", name: "Candied Almonds", blurb: "Crunchy almonds toasted in cinnamon sugar.", ingredients: "Almonds, Organic Granulated Sugar, Organic Egg White, Pure Vanilla Extract, Organic Ground Cinnamon, Himalayan pink salt.", allergens: "Almonds. Eggs.", bagPrice: 20, jarPrice: 20, samplerPrice: 6, sizePrices: { 3: 6, 8: 12, 16: 20 }, allowedOmissions: [], requiresCooling: false, category: "almonds" },
  { ...candiedNut, slug: "coconut-cashews", name: "Coconut Cashews", blurb: "Crunchy cashews candied with coconut.", allergens: "Cashews. Coconut." },
  { ...candiedNut, slug: "candied-pecans", name: "Candied Pecans", blurb: "Crunchy pecans, candied in small batches.", allergens: "Pecans." },
  { ...candiedNut, slug: "candied-cashews", name: "Candied Cashews", blurb: "Crunchy cashews, candied in small batches.", allergens: "Cashews." },
];
