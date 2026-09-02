import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { CrossWheat } from "@/components/Sprite";
import { getShop, verseArchive } from "@/lib/settings";
import { wall, weeksUntilRepeat } from "@/lib/verses";

export const metadata: Metadata = {
  title: "The verse archive",
  description: "Every verse card that has gone out with an order, kept in one place.",
};

export default async function VersesPage() {
  const [{ verseOfTheWeek }, hers] = await Promise.all([getShop(), verseArchive()]);

  // The wall is worked out from the date: every week since the site opened has
  // a verse whether or not anyone did anything that Monday. Weeks where she put
  // her own words in are not in here — those are in `hers`, below.
  const weeks = wall().slice(1, 40);
  const repeat = weeksUntilRepeat();

  return (
    <>
      <PageHeader
        eyebrow="A verse a week"
        title="The cards that went in the boxes."
        standfirst={`A new one arrives every Monday morning. There are ${repeat} of them, one for each week of the year, so the seasons stay where they belong and nobody sees the same card twice inside a year.`}
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

      {hers.length > 0 ? (
        <section className="mx-auto mt-14 w-full max-w-[900px] px-6 sm:px-10">
          <div className="small-caps mb-4">Weeks she chose herself</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {hers.map((verse) => (
              <div key={verse.reference + verse.text} className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
                <p className="verse text-[22px] text-ink">&ldquo;{verse.text}&rdquo;</p>
                <div className="ref !text-[10px] text-sage">{verse.reference}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-14 w-full max-w-[900px] px-6 pb-16 sm:px-10">
        <div className="small-caps mb-4">Earlier cards</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {weeks.map(({ verse, on, week }) => (
            <div key={week} className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
              <div className="small-caps !text-[9px] text-faint">{weekOf(on)}</div>
              <p className="verse text-[22px] text-ink">&ldquo;{verse.text}&rdquo;</p>
              <div className="ref !text-[10px] text-sage">{verse.ref}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Her kitchen's clock, so the date does not change between the server and the
 * reader's browser.
 */
function weekOf(on: Date): string {
  return `Week of ${on.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/Phoenix",
  })}`;
}
