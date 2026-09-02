import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { CrossWheat } from "@/components/Sprite";
import { getShop, verseArchive } from "@/lib/settings";

export const metadata: Metadata = {
  title: "The verse archive",
  description: "Every verse card that has gone out with an order, kept in one place.",
};

export default async function VersesPage() {
  const [{ verseOfTheWeek, verses }, past] = await Promise.all([getShop(), verseArchive()]);
  // Cards that have actually gone out come first. Before there are any, the
  // verses already carrying the site stand in, so the wall is never bare.
  const archive =
    past.length > 0 ? past : [verses.work, verses.card, verses.giving, verses.table, verses.blessing];

  return (
    <>
      <PageHeader
        eyebrow="A verse for your week"
        title="Every card she has sent out."
        standfirst="Each week she picks a verse and writes it on a card that goes into every order. They all end up here, so you can look back at the one from the week you needed it."
      />

      <section className="mx-auto mt-12 w-full max-w-[560px] px-6 sm:px-10">
        <div className="bg-paper p-2.5 shadow-[0_16px_30px_rgba(58,39,18,0.18)]">
          <div className="dashed-frame flex flex-col items-center gap-4 px-8 py-12 text-center">
            <CrossWheat size={52} />
            <div className="caps text-[9px] text-sage">This week</div>
            <p className="verse text-[30px] text-ink sm:text-[36px]">&ldquo;{verseOfTheWeek.text}&rdquo;</p>
            <div className="ref text-sage">{verseOfTheWeek.reference}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[900px] px-6 sm:px-10">
        <div className="small-caps mb-4">{past.length > 0 ? "Earlier cards" : "The verses that carry this place"}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {archive.map((verse) => (
            <div key={verse.reference} className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
              <p className="verse text-[22px] text-ink">&ldquo;{verse.text}&rdquo;</p>
              <div className="ref !text-[10px] text-sage">{verse.reference}</div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}
