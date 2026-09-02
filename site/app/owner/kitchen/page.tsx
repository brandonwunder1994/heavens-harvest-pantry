import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { FlavorEditor } from "@/components/owner/FlavorEditor";
import { DeliveryEditor } from "@/components/owner/DeliveryEditor";
import { RulesEditor } from "@/components/owner/RulesEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const { shop, live } = await readShop();

  return (
    <OwnerShell active="/owner/kitchen">
      <OwnerHeading
        eyebrow="Flavors & prices"
        title="What you are selling this week."
        note="Change anything here and the shop shows it straight away. Prices are in dollars; a customer who already has something in their basket gets the new price at checkout, never the old one."
      />

      {!live ? (
        <CannotReach what="menu" />
      ) : (
        <>
          <section className="flex flex-col gap-5">
            <h2 className="display m-0 text-[26px]">Flavors and prices</h2>
            <FlavorEditor flavors={shop.flavors} />
          </section>

          <section className="mt-6 flex flex-col gap-5">
            <h2 className="display m-0 text-[26px]">Delivery days</h2>
            <DeliveryEditor delivery={shop.delivery} />
          </section>

          <section className="mt-6 flex flex-col gap-5">
            <h2 className="display m-0 text-[26px]">The rules behind the numbers</h2>
            <RulesEditor jarRules={shop.jarRules} rewards={shop.rewards} blessingBag={shop.blessingBag} />
          </section>
        </>
      )}
    </OwnerShell>
  );
}
