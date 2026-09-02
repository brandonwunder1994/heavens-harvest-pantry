import { CrossWheat } from "@/components/Sprite";
import type { Verse } from "@/lib/content";

/** Past this many letters a verse stops being a band and becomes a wall. */
const LONG = 130;

type Tone = "brown" | "cream" | "sage";

const tones: Record<Tone, { wrap: string; mark: string; text: string; ref: string; body: string }> = {
  brown: {
    wrap: "bg-brown text-cream",
    mark: "#c9a06a",
    text: "text-cream",
    ref: "text-gold",
    body: "text-linen",
  },
  cream: {
    wrap: "border-y border-dashed border-hedge",
    mark: "#6b7a4a",
    text: "text-ink",
    ref: "text-sage",
    body: "text-bark",
  },
  sage: {
    wrap: "bg-sage text-cream",
    mark: "#f4eee2",
    text: "text-cream",
    ref: "text-moss",
    body: "text-moss",
  },
};

export function ScriptureBand({
  verse,
  tone = "brown",
  size = "large",
  children,
}: {
  verse: Verse;
  tone?: Tone;
  size?: "large" | "medium";
  children?: React.ReactNode;
}) {
  const t = tones[tone];
  // A long verse set at 68px is three screens of italic before the menu. Step
  // it down rather than let it swallow the page.
  const type =
    size === "large" && verse.text.length <= LONG
      ? "text-[34px] sm:text-[48px] lg:text-[68px]"
      : "text-[28px] sm:text-[36px] lg:text-[42px]";

  return (
    <section className={`flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10 lg:py-[76px] ${t.wrap}`}>
      <CrossWheat size={size === "large" ? 72 : 56} color={t.mark} />
      {verse.text ? (
        <p className={`verse max-w-5xl ${type} ${t.text}`}>&ldquo;{verse.text}&rdquo;</p>
      ) : null}
      {verse.reference ? <div className={`ref ${t.ref}`}>{verse.reference}</div> : null}
      {children ? <div className={`max-w-2xl text-[19px] leading-relaxed sm:text-[21px] ${t.body}`}>{children}</div> : null}
    </section>
  );
}
