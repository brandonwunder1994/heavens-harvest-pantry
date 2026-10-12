import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { PageHeader } from "@/components/PageHeader";
import { getShop } from "@/lib/settings";
import { blessingSurchargeCents, formatMoney, unitPriceCents } from "@/lib/cart";
import { BLESSING_SIZES, sizeLabel } from "@/lib/products";
export const metadata: Metadata = {
  alternates: { canonical: "/blessing-bags" }, title: "Blessing gifts", description: "Choose granola or candied almonds with a gift jar and anonymous Friday delivery in Vistancia." };
export default async function BlessingBagsPage() {
  const shop = await getShop();
  const flavors = shop.flavors.filter(f => !f.soldOut);
  const surcharge = blessingSurchargeCents(shop);
  return <><PageHeader eyebrow="Blessing gifts" title="A little care, sent anonymously." standfirst={`Add ${formatMoney(surcharge)} to your chosen granola or candied almonds for a cute gift jar and anonymous delivery in Vistancia.`} /><section className="mx-auto mt-12 flex max-w-[800px] flex-col gap-8 px-6 pb-20 sm:px-10"><div><h2 className="display text-[28px]">Choose a flavor</h2><p className="mt-2 text-[19px] text-bark">Each price below includes your chosen flavor, gift jar, and delivery, before tax.</p>{flavors.length ? <ul className="mt-4 space-y-3">{flavors.map(f => <li key={f.slug}><strong>{f.name}</strong><p>{BLESSING_SIZES.map(size => `${sizeLabel(size)}: ${formatMoney(unitPriceCents(f, "bag", size) + surcharge)}`).join(" · ")}</p></li>)}</ul> : <p className="mt-4">Blessing gifts are sold out for now. Check the menu for availability.</p>}</div><div><h2 className="display text-[28px]">Tell us who it is for</h2><p className="mt-2 text-[19px] text-bark">Add the recipient’s name and delivery address at checkout. Delivery is available in Vistancia only. Add a verse card if you like.</p></div><div><h2 className="display text-[28px]">We deliver it on Friday</h2><p className="mt-2 text-[19px] text-bark">Your gift goes out anonymously with that bake’s Friday deliveries. Your name is not shared with the recipient.</p></div><Link href="/checkout" className="stamp w-fit">Choose a blessing gift</Link></section></>;
}
