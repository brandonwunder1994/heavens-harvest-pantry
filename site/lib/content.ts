import { noPorch, type Porch } from "@/lib/porch";
import { launchFlavors, type Omission, type SizeOz } from "@/lib/products";
import type { ExtrasState } from "@/lib/extras";

/**
 * Every piece of copy and every number the owner will eventually edit from her
 * own page lives here. Until the database lands in step 3, this file is the
 * single source of truth, so nothing is duplicated across components.
 *
 * Anything in [square brackets] is a placeholder waiting on the owner.
 */

export const business = {
  name: "Heaven's Harvest Pantry",
  shortName: "Heaven's Harvest",
  tagline: "Wholesome ingredients, shared with love.",
  city: "Peoria, Arizona",
  kitchen: "Vistancia",
  domain: "[herdomain.com]",
  phone: "[her number]",
  ownerName: "[her name]",
} as const;

export type DeliveryRun = { area: string; day: string; nextDate: string };

export type Delivery = {
  cutoff: string;
  bakeDay: string;
  runs: DeliveryRun[];
  dropOff: string;
};

export const delivery: Delivery = {
  cutoff: "Order by Tuesday at 9 p.m. Arizona time",
  bakeDay: "Fresh for Friday and Saturday pickup",
  runs: [
    { area: "Vistancia", day: "Tuesdays", nextDate: "Tue Sep 8" },
    { area: "Anthem", day: "Fridays", nextDate: "Fri Sep 11" },
  ],
  dropOff: "[spot name]",
};

export type Flavor = {
  sizePrices?: Record<SizeOz, number>;
  allowedOmissions?: Omission[];
  requiresCooling?: boolean;
  category?: "granola" | "almonds";
  /** Menu-only: dark/semi-sweet style choices folded under one entry. */
  variants?: Flavor[];
  variantLabel?: string;
  slug: string;
  name: string;
  blurb: string;
  ingredients: string;
  allergens: string;
  bagPrice: number;
  jarPrice: number;
  /** Price in dollars for a 3 oz sampler bag. */
  samplerPrice?: number;
  soldOut?: boolean;
  backOn?: string;
  /**
   * What goes in it besides the oats, as she would say it: "almonds, honey".
   *
   * This is the whole of "build your blend". Somebody picks what they want in
   * a jar, and the only jars they can be offered are the ones she already
   * bakes — so the list of possible add-ins is not a separate thing to keep up
   * to date, it is simply everything named here across her menu.
   */
  addIns?: string;
  /**
   * Up to three pictures of what it is, for the bag label. Leave this off and
   * the name is read instead: Apple Maple Pecan becomes an apple, a maple leaf,
   * and a pecan. A new flavor does the same, so the pictures stay current.
   */
  icons?: string[];
};

/** The approved menu; saved owner edits override these defaults. */
export const flavors: Flavor[] = launchFlavors;

export type JarRules = {
  creditDollars: number;
  bonusPoints: number;
  bagSize: string;
  jarSize: string;
};

export const jarRules: JarRules = {
  creditDollars: 2,
  bonusPoints: 5,
  bagSize: "3 oz, 8 oz, or 1 lb",
  jarSize: "16-ounce glass mason jar",
};

/** The only customer-facing jar option: a gift jar for a blessing bag. */
export const giftJarPrice = 2;

export type RewardRules = {
  pointsPerDollar: number;
  rewardAt: number;
  welcomeBonus: number;
  referralCredit: number;
};

export const rewards: RewardRules = {
  pointsPerDollar: 1,
  rewardAt: 100,
  welcomeBonus: 30,
  referralCredit: 3,
};

/** What the shop tells neighbors. Ten bags or jars, then one is free. */
export const rewardOffer = {
  sentence: "Buy 10 Get 1 Free",
} as const;

export type BlessingBag = { price: number; blurb: string };

export const blessingBag: BlessingBag = {
  price: 7,
  blurb:
    "Add $7 to your chosen granola or candied almonds for a cute gift jar and anonymous delivery in Vistancia.",
};

export type Verse = {
  text: string;
  reference: string;
};

/**
 * A granola label she has saved for the T50M Pro. Produced date and tracker
 * code are typed at print time, not stored here — those change every bake.
 */
export type LabelSize = "bag" | "jar";

export type LabelTemplate = {
  flavorSlug: string;
  title: string;
  ingredients: string;
  allergens: string;
  scripture: Verse;
  netWeight: string;
  size: LabelSize;
};

export type LabelSettings = {
  templates: LabelTemplate[];
  scripture: Verse;
  qrUrl: string;
};

/** The verse that ships on a new label until she writes her own. */
export const labelScripture: Verse = {
  text: "Rejoice in the Lord always; again I will say, rejoice.",
  reference: "Philippians 4 : 4",
};

/** Same address as the footer QR, so a scan from a bag lands on the menu. */
export const labelQrUrl = "https://heavensharvestpantry.com/menu?src=qr";

export const defaultLabelSettings: LabelSettings = {
  templates: [],
  scripture: labelScripture,
  qrUrl: labelQrUrl,
};

/** The verse card that goes into every order this week. She changes it weekly. */
export const verseOfTheWeek: Verse = {
  text: "Taste and see that the Lord is good.",
  reference: "Psalm 34 : 8",
};

/** Verses that carry the page. Each one is editable from the owner's page. */
export const verses: Record<string, Verse> = {
  hero: verseOfTheWeek,
  work: {
    text: "Whatever you do, work at it with all your heart, as working for the Lord.",
    reference: "Colossians 3 : 23",
  },
  card: {
    text: "Give us today our daily bread.",
    reference: "Matthew 6 : 11",
  },
  giving: {
    text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
    reference: "Galatians 6 : 9",
  },
  table: {
    text: "They broke bread in their homes and ate together with glad and sincere hearts.",
    reference: "Acts 2 : 46",
  },
  blessing: {
    text: "The Lord bless you and keep you; the Lord make his face shine on you.",
    reference: "Numbers 6 : 24 – 25",
  },
};

/**
 * Anything still in [square brackets] is waiting on her, and must never be
 * shown to a customer as though it were real. `filled` returns an empty string
 * for a placeholder so the caller can leave the whole line out.
 */
export const isPlaceholder = (value: string): boolean => /^\s*\[.*\]\s*$/.test(value);

export const filled = (value: string): string => (isPlaceholder(value) ? "" : value);

/**
 * A dollar figure the way she would write it. She can price a bag at 11.50 now,
 * so a raw number would read "$11.5"; whole dollars stay whole.
 */
export const money = (dollars: number): string => {
  const n = Number(dollars) || 0;
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
};

/** The same figure without the sign, for copy that already has one. */
export const amount = (dollars: number): string => money(dollars).slice(1);

/**
 * Everything above, gathered into the one object the site actually runs on.
 * `lib/settings.ts` lays whatever she has saved in the database over the top of
 * this, so these values are the defaults, never the last word.
 */
export type Shop = {
  flavors: Flavor[];
  /** Whether she is baking this week. See `lib/porch.ts`. */
  porch: Porch;
  jarRules: JarRules;
  rewards: RewardRules;
  blessingBag: BlessingBag;
  delivery: Delivery;
  verseOfTheWeek: Verse;
  verses: Record<string, Verse>;
  /** Owner-only. Customer pages never read this. */
  labelTemplates: LabelSettings;
  /** This weekend's leftover bags, ready now. Present only while she has them open. */
  extras?: ExtrasState;
  /** The same extras as sellable products. Kept apart so they never appear on the regular menu. */
  extraFlavors?: Flavor[];
};

export const defaultShop: Shop = {
  flavors: launchFlavors,
  porch: noPorch,
  jarRules,
  rewards,
  blessingBag,
  delivery,
  verseOfTheWeek,
  verses,
  labelTemplates: defaultLabelSettings,
};
