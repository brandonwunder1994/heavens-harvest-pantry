import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrossWheat } from "@/components/Sprite";
import { TheParcel } from "@/components/gift/TheParcel";
import { readGift, markOpened } from "@/lib/gift-store";
import { business } from "@/lib/content";

// A card is written and then opened. There is nothing to cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Something for you",
  description: "A card, wrapped.",
  robots: { index: false, follow: false },
};

export default async function GiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const gift = await readGift(code);
  if (!gift) notFound();

  // Noted after it is fetched, so a card is never marked opened by a request
  // that failed to show it to anybody.
  await markOpened(gift.code);

  return (
    <main className="giftp">
      <div className="giftp-mark">
        <CrossWheat size={40} color="#a9803f" />
      </div>

      <TheParcel to={gift.to}>
        <p className="giftp-verse">&ldquo;{gift.verseText}&rdquo;</p>
        <div className="giftp-ref">{gift.verseRef}</div>
        <p className="giftp-note">{gift.note}</p>
        <div className="giftp-from">— {gift.from}</div>
      </TheParcel>

      <p className="giftp-foot">
        Sent with a jar from <Link href="/">{business.name}</Link>, baked in a home kitchen in{" "}
        {business.city}.
      </p>
    </main>
  );
}
