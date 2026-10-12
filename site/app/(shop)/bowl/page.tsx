import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ShopLink";
import { HeartSeal } from "@/components/Sprite";

export const metadata: Metadata = {
  alternates: { canonical: "/bowl" },
  title: "Ways to eat granola",
  description: "A few simple ways to enjoy small-batch granola at home or on the trail.",
};

const ideas = [
  { title: "Over yogurt", copy: "Spoon it over yogurt with berries and a drizzle of honey.", image: "/ways/yogurt.png", alt: "Granola spooned over yogurt with berries" },
  { title: "Trail mix", copy: "Pack a handful with dried fruit and pecans for the hike.", image: "/ways/trail-mix.png", alt: "Granola trail mix ready for a hike" },
  { title: "On a smoothie bowl", copy: "Sprinkle granola on top of your favorite smoothie bowl.", image: "/ways/fruit-bowl.png", alt: "A berry smoothie bowl topped with fruit and granola" },
  { title: "Over fresh fruit", copy: "Add crunch to sliced apples, peaches, berries, or whatever is in season.", image: "/ways/fresh-fruit.png", alt: "Fresh sliced fruit topped with golden granola" },
  { title: "On ice cream", copy: "Add a crunchy topping to your favorite ice cream.", image: "/ways/ice-cream.png", alt: "Vanilla ice cream topped with granola" },
  { title: "Like cereal", copy: "Pour milk over a bowl of granola and enjoy.", image: "/ways/cereal.png", alt: "Granola cereal in a bowl of milk" },
  { title: "Straight from the bag", copy: "A few clusters in the car, at the desk, or wherever the day takes you.", image: "/ways/handful.png", alt: "A handful of chocolate granola straight from the bag" },
];

export default function BowlPage() {
  return (
    <>
      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">Ways to eat granola</h1>
        <p className="mx-auto max-w-[620px] text-[19px] italic leading-snug text-sage sm:text-[22px]">
          Breakfast, trail mix, a topping, or a handful between errands. However you eat it, start with the good stuff.
        </p>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-[1100px] gap-5 px-6 pb-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-3">
        {ideas.map((idea) => (
          <article key={idea.title} className="dashed-frame flex flex-col gap-4 bg-paper p-3">
            <div className="relative aspect-[4/3] overflow-hidden bg-moss">
              <Image src={idea.image} alt={idea.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-1 px-2 pb-2">
              <h2 className="display text-[28px]">{idea.title}</h2>
              <p className="text-[17px] leading-snug text-muted">{idea.copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">Ready to order</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          Choose a 3 oz, 8 oz, or 1 lb bag, then make it your own at the table.
        </p>
        <Link href="/menu" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">See this week&apos;s flavors</Link>
      </section>
    </>
  );
}
