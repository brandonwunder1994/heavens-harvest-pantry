import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ScriptureBand } from "@/components/ScriptureBand";
import { business, filled } from "@/lib/content";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Our story",
  description:
    `Why a home kitchen in ${business.city} bakes granola for its neighbors, and what goes into every batch.`,
};

export default async function StoryPage() {
  const { verses, delivery } = await getShop();

  return (
    <>
      <PageHeader
        eyebrow="Why this kitchen exists"
        title={
          <>
            A pantry is a small
            <br />
            way to love people.
          </>
        }
      />

      <section className="mx-auto mt-12 grid w-full max-w-[1100px] gap-10 px-6 sm:px-10 lg:grid-cols-[420px_1fr] lg:gap-16">
        <div className="flex flex-col gap-3.5">
          <div className="dashed-frame flex h-[380px] items-center justify-center bg-paper p-2.5 lg:h-[520px]">
            <p className="px-8 text-center text-[19px] italic text-muted">
              A photograph of her kitchen belongs here.
            </p>
          </div>
          {filled(business.ownerName) ? (
            <p className="small-caps text-faint">{filled(business.ownerName)} · founder, baker, jar washer</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 text-[19px] leading-relaxed text-bark sm:text-[21px]">
          <p className="dropcap">
            It started the way these things usually do. A neighbor was having a hard week, so she baked a batch and
            walked it over. Then someone else asked for a jar, and then their sister did, and the oven has not really
            cooled since.
          </p>
          <p>
            Everything that leaves this kitchen is made the same way it would be for family: honest ingredients,
            nothing hurried, and a prayer over the list before the first tray goes in.
          </p>
          <p>
            Nothing is baked before it is ordered. {delivery.cutoff}, she bakes {delivery.bakeDay}, and drives it
            around herself. That is the whole operation. It is small on purpose.
          </p>

          <div className="flex flex-col gap-2 border-l-[3px] border-gold py-1.5 pl-6">
            <p className="verse text-[26px] text-ink sm:text-[32px]">&ldquo;{verses.work.text}&rdquo;</p>
            <div className="ref text-sage">{verses.work.reference}</div>
          </div>

          <div className="dashed-frame flex flex-col gap-3 bg-paper p-6">
            <div className="small-caps">What goes in</div>
            <p className="text-[18px] leading-relaxed">
              Rolled oats, honey or real maple, olive oil, nuts, a pinch of salt, and whatever makes that flavor what
              it is. Nothing you cannot pronounce, and no shortcuts that save her twenty minutes and cost you the taste.
            </p>
            <p className="text-[18px] leading-relaxed">
              This is a home kitchen, registered with the Arizona Department of Health Services under the state cottage
              food program. Every bag and jar carries its ingredients, its allergens, and a line telling you it was made
              at home. That is the law, and it is also just fair.
            </p>
          </div>

          <Link href="/menu" className="stamp w-fit">
            See this week&apos;s flavors
          </Link>
        </div>
      </section>

      <div className="mt-20">
        <ScriptureBand verse={verses.table} tone="cream" size="medium" />
      </div>
    </>
  );
}
