import { FloatingJars } from "@/components/FloatingJars";
import type { Flavor } from "@/lib/content";
import { isNut } from "@/lib/products";

/** The two lineups on the front of the shop: granola first, then the candied nuts. */
export function HeroShelf({ flavors }: { flavors: Flavor[] }) {
  const nuts = flavors.filter(isNut);
  const granola = flavors.filter(flavor => !isNut(flavor));
  return (
    <>
      <FloatingJars flavors={granola} title="The Granola Lineup" id="granola-lineup" />
      <FloatingJars flavors={nuts} title="The Candied Nuts Lineup" id="nuts-lineup" />
    </>
  );
}

/** A name split across the two lines a jar label holds. */
export function jarLabel(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [words[0] ?? "", ""];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}
