import Link from "@/components/ShopLink";
import { CrossWheat } from "@/components/Sprite";
import { thanksgivingPhase } from "@/lib/fulfilment";

/**
 * Lauren's Thanksgiving ordering update, in the site's own hand. Up until
 * Saturday at 9 p.m. it invites orders; after that it tells people the
 * Thanksgiving list is closed and when ordering picks back up. It takes
 * itself down at the end of Tuesday, November 24.
 */
export function ThanksgivingNotice() {
  const phase = thanksgivingPhase();
  if (phase === "over") return null;
  const open = phase === "ordering";

  return (
    <section aria-labelledby="thanksgiving" className="mx-6 mt-10 sm:mx-10 lg:mx-18">
      <div className="relative overflow-hidden bg-brown text-cream">
        <Leaves className="pointer-events-none absolute -right-10 -top-12 w-[240px] text-gold/25 sm:w-[300px]" />
        <Leaves className="pointer-events-none absolute -bottom-16 -left-14 w-[220px] rotate-180 text-gold/15" />

        <div className="relative grid gap-10 px-7 py-11 sm:px-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14 lg:px-16 lg:py-14">
          <div className="flex flex-col items-start gap-4">
            <div className="small-caps !text-gold">Thanksgiving ordering update</div>
            <h2 id="thanksgiving" className="display m-0 text-[42px] leading-[1.02] text-cream sm:text-[56px]">
              {open ? (
                <>
                  Stock up
                  <br />
                  <em className="italic text-gold">for the holiday.</em>
                </>
              ) : (
                <>
                  Thanksgiving orders
                  <br />
                  <em className="italic text-gold">are baking.</em>
                </>
              )}
            </h2>
            <p className="max-w-[440px] text-[19px] leading-relaxed text-linen sm:text-[20px]">
              {open
                ? "Thanksgiving is sneaking up on us, and I want everyone to have a chance to stock up. I’m baking one last batch this weekend, with special pickup days on Monday and Tuesday."
                : "The last Thanksgiving batch is in the oven. If you ordered, your pickup is Monday or Tuesday, just as you chose. Ordering for December is open now."}
            </p>
            <Link href="/menu" className="stamp stamp-gold mt-2">
              {open ? "Order for Thanksgiving" : "Order for December 4 or 5"}
            </Link>
          </div>

          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {open ? (
              <Card eyebrow="Last day to order" title="Saturday, November 21" note="by 9 p.m. Arizona time" highlight />
            ) : null}
            <Card eyebrow="Special pickup days" title="Monday, Nov 23 & Tuesday, Nov 24" note="Morning or night. Either one is fine." highlight={!open} />
            <Card
              eyebrow="No porch pickups"
              title="Friday, Nov 27 & Saturday, Nov 28"
              note="I’ll be out of town Thanksgiving weekend. Pickups pick back up Friday, December 4."
              quiet
            />
          </ol>
        </div>

        <div className="relative flex items-center justify-center gap-3 border-t border-cream/15 px-6 py-4 text-center">
          <CrossWheat size={22} color="#c9a06a" />
          <p className="verse m-0 text-[19px] italic text-linen sm:text-[21px]">Thank you for supporting our small business.</p>
        </div>
      </div>
    </section>
  );
}

function Card({ eyebrow, title, note, highlight, quiet }: { eyebrow: string; title: string; note: string; highlight?: boolean; quiet?: boolean }) {
  return (
    <li
      className={`flex flex-col gap-1 px-6 py-5 ${
        highlight
          ? "bg-cream text-ink shadow-[0_14px_30px_rgba(0,0,0,0.22)]"
          : quiet
            ? "border border-dashed border-cream/35"
            : "bg-brown-deep"
      }`}
    >
      <span className={`caps text-[11px] ${highlight ? "text-sage" : "text-gold"}`}>{eyebrow}</span>
      <span className={`display text-[26px] leading-tight sm:text-[30px] ${highlight ? "text-ink" : "text-cream"}`}>{title}</span>
      <span className={`font-ui text-[15px] ${highlight ? "text-bark" : "text-linen"}`}>{note}</span>
    </li>
  );
}

/** A small sprig of autumn leaves, drawn in currentColor. */
function Leaves({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false" fill="currentColor">
      <path d="M100 190 C 98 140, 92 100, 70 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 60 C 40 55, 22 30, 26 6 C 52 10, 74 30, 70 60 Z" />
      <path d="M84 98 C 120 92, 150 70, 160 40 C 128 40, 96 62, 84 98 Z" />
      <path d="M92 128 C 60 130, 34 116, 20 92 C 50 86, 80 100, 92 128 Z" />
      <path d="M98 160 C 128 160, 160 146, 178 122 C 146 114, 112 132, 98 160 Z" />
    </svg>
  );
}
