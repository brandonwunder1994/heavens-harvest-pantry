/**
 * Product photographs of the mason jars. Matched from the flavor name so a
 * renamed bag still gets the right picture.
 */
export const JAR_PHOTO = {
  width: 720,
  height: 1000,
} as const;

type FlavorHint = { slug?: string; name?: string };

const JAR_BY_SLUG: Record<string, string> = {
  "honey-almond-crunch": "/jars/honey-almond.png",
  "maple-pecan": "/jars/apple-maple-pecan.png",
  "dark-chocolate-sea-salt": "/jars/chocolate-coconut-cashew.png",
  "cinnamon-apple": "/jars/vanilla-blueberry-almond.png",
  "chocolate-chip-coconut-cashew": "/jars/chocolate-coconut-cashew.png",
  c: "/jars/candied-almonds.png",
};

const JAR_BY_HINT: { test: RegExp; src: string }[] = [
  { test: /candied/, src: "/jars/candied-almonds.png" },
  { test: /apple|maple|pecan/, src: "/jars/apple-maple-pecan.png" },
  { test: /coconut|cashew/, src: "/jars/chocolate-coconut-cashew.png" },
  { test: /vanilla|blueberry/, src: "/jars/vanilla-blueberry-almond.png" },
  { test: /honey/, src: "/jars/honey-almond.png" },
  { test: /chocolate|cacao/, src: "/jars/dark-chocolate.png" },
];

export const JAR_PHOTOS = {
  ...JAR_BY_SLUG,
  "apple-maple-pecan": "/jars/apple-maple-pecan.png",
  "dark-chocolate-coconut-cashew": "/jars/chocolate-coconut-cashew.png",
  "vanilla-blueberry-almond": "/jars/vanilla-blueberry-almond.png",
  "candied-almonds": "/jars/candied-almonds.png",
} as const;

/** The name as it should read on a jar — no bag size, no "granola". */
export function jarMarkName(name: string): string {
  return name
    .replace(/\bgranola\b.*$/i, "")
    .replace(/\s*[-–—]\s*\d.*$/i, "")
    .replace(/\s*\d+\s*(lb|oz|pound)s?\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function jarPhotoFor(flavor: string | FlavorHint): string | undefined {
  const slug = typeof flavor === "string" ? flavor : flavor.slug;
  const known = slug ? JAR_PHOTOS[slug as keyof typeof JAR_PHOTOS] : undefined;
  return known ?? matchHint(typeof flavor === "string" ? flavor : flavor.name ?? "", JAR_BY_HINT);
}

const BAG_BY_HINT: { test: RegExp; src: string }[] = [
  { test: /candied/, src: "/bags/candied-almonds.png" },
  { test: /apple|maple|pecan/, src: "/bags/apple-maple-pecan.png" },
  { test: /coconut|cashew/, src: "/bags/chocolate-coconut-cashew.png" },
  { test: /vanilla|blueberry/, src: "/bags/vanilla-blueberry-almond.png" },
];

const BAG_BY_SLUG: Record<string, string> = {
  "maple-pecan": "/bags/apple-maple-pecan.png",
  "apple-maple-pecan": "/bags/apple-maple-pecan.png",
  "dark-chocolate-sea-salt": "/bags/chocolate-coconut-cashew.png",
  "dark-chocolate-coconut-cashew": "/bags/chocolate-coconut-cashew.png",
  "chocolate-chip-coconut-cashew": "/bags/chocolate-coconut-cashew.png",
  "cinnamon-apple": "/bags/vanilla-blueberry-almond.png",
  "vanilla-blueberry-almond": "/bags/vanilla-blueberry-almond.png",
  "candied-almonds": "/bags/candied-almonds.png",
  c: "/bags/candied-almonds.png",
};

export function bagPhotoFor(flavor: string | FlavorHint): string | undefined {
  const hay = typeof flavor === "string" ? flavor : flavor.name ?? "";
  const slug = typeof flavor === "string" ? flavor : flavor.slug;
  return (slug ? BAG_BY_SLUG[slug] : undefined) ?? matchHint(hay, BAG_BY_HINT);
}

export function packPhotoFor(
  flavor: string | FlavorHint,
  format: "jar" | "bag" | "sampler" = "jar",
): string | undefined {
  return format === "jar" ? jarPhotoFor(flavor) : bagPhotoFor(flavor);
}

function matchHint(hay: string, rows: { test: RegExp; src: string }[] = JAR_BY_HINT): string | undefined {
  const text = hay.toLowerCase();
  return rows.find((row) => row.test.test(text))?.src;
}
