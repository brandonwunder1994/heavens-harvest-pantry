import { FloatingJars } from "@/components/FloatingJars";
import type { Flavor } from "@/lib/content";

/** The five jars on the front of the shop. */
export function HeroShelf({ flavors }: { flavors: Flavor[] }) {
  return <FloatingJars flavors={flavors} />;
}

/** A name split across the two lines a jar label holds. */
export function jarLabel(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [words[0] ?? "", ""];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}
