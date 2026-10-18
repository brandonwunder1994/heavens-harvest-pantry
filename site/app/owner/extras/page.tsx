import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { ExtrasEditor, type ExtraFlavorChoice } from "@/components/owner/ExtrasEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";
import { readExtrasSetting, extrasClaimed } from "@/lib/extras-store";
import { extraSlug, extrasAreOpen, weekendFor } from "@/lib/extras";
import { pickupDateLabel, saturdayDate } from "@/lib/fulfilment";
import type { Flavor } from "@/lib/content";
export const dynamic = "force-dynamic";

const priceOf = (f: Flavor, size: 3 | 8 | 16) => f.sizePrices?.[size] ?? (size === 3 ? f.samplerPrice ?? 5 : f.bagPrice);

export default async function ExtrasPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const [{ shop, live }, { setting, live: extrasLive }] = await Promise.all([readShop(), readExtrasSetting()]);
  const weekend = weekendFor();
  // Last weekend's list stays visible but starts fresh, so a new weekend never inherits old counts.
  const current = setting.weekend === weekend ? setting : { ...setting, open: false, items: [] };
  const claimed = live && extrasLive ? await extrasClaimed(current).catch(() => new Map<string, number>()) : new Map<string, number>();
  const flavors: ExtraFlavorChoice[] = shop.flavors.map(f => ({ slug: f.slug, name: f.name, prices: { 3: priceOf(f, 3), 8: priceOf(f, 8), 16: priceOf(f, 16) } }));
  const showing = extrasAreOpen(current);

  return (
    <OwnerShell active="/owner/extras">
      <OwnerHeading title="Extras & stock" note="The bags left over after the bake. Post them on Instagram, set the count here, and the site sells exactly that many, then shows sold out." />
      {!live || !extrasLive ? <CannotReach what="extras" /> : (
        <>
          <p className={`owner-alert ${showing ? "" : "is-quiet"}`} role="status">
            {showing ? `Live now for pickup ${pickupDateLabel(weekend)} or ${pickupDateLabel(saturdayDate(weekend))}.` : "Not showing on the website right now."}
          </p>
          <ExtrasEditor
            flavors={flavors}
            open={current.open}
            note={current.note}
            weekendLabel={`${pickupDateLabel(weekend)} or ${pickupDateLabel(saturdayDate(weekend))}`}
            initial={current.items.map(i => ({ slug: i.slug, sizeOz: i.sizeOz, qty: i.qty, price: i.price, claimed: claimed.get(extraSlug(i.slug, i.sizeOz)) ?? 0 }))}
          />
        </>
      )}
    </OwnerShell>
  );
}
