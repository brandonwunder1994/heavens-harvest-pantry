import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { KitchenPhoto } from "@/components/KitchenPhoto";
import { StoryNarrative } from "@/components/StoryNarrative";
import { PageHeader } from "@/components/PageHeader";
import { ScriptureBand } from "@/components/ScriptureBand";
import { business, filled } from "@/lib/content";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/story" },
  title: "Our story",
  description:
    `Why a home kitchen in ${business.city} bakes granola for its neighbors, and what goes into every batch.`,
};

export default async function StoryPage() {
  const { verses } = await getShop();

  return (
    <>
      <PageHeader
        eyebrow="Why this kitchen exists"
        title={
          <>
            It started at home, in the mundane moments, and the ordinary chaos.
            <br />
          </>
        }
      />

      <section className="mx-auto mt-12 grid w-full max-w-[1100px] gap-10 px-6 sm:px-10 lg:grid-cols-[420px_1fr] lg:gap-16">
        <div className="flex flex-col gap-3.5">
          <KitchenPhoto />
          {filled(business.ownerName) ? (
            <p className="small-caps text-faint">{filled(business.ownerName)} · founder, baker, jar washer</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 text-[19px] leading-relaxed text-bark sm:text-[21px]">
          <StoryNarrative />

          <div className="flex flex-col gap-2 border-l-[3px] border-gold py-1.5 pl-6">
            <p className="verse text-[26px] text-ink sm:text-[32px]">&ldquo;{verses.work.text}&rdquo;</p>
            <div className="ref text-sage">{verses.work.reference}</div>
          </div>

          <div className="dashed-frame flex flex-col gap-3 bg-paper p-6">
            <div className="small-caps">What goes in</div>
            <p className="text-[18px] leading-relaxed">
              This is a home kitchen, registered with the Arizona Department of Health Services under the state cottage
              food program. Every bag carries its ingredients, its allergens, and a line telling you it was made
              at home.
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
