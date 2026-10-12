import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { FlavorEditor } from "@/components/owner/FlavorEditor";
import { GiftPriceEditor } from "@/components/owner/GiftPriceEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function KitchenPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const { shop, live } = await readShop();
  return <OwnerShell active="/owner/kitchen"><OwnerHeading title="Products & prices" note="Saved changes appear on the shop immediately. Customers review any changed total before paying; paid orders keep their original prices." />{live ? <><FlavorEditor flavors={shop.flavors} /><section className="border-t border-rule pt-7"><GiftPriceEditor price={shop.blessingBag.price} /></section></> : <CannotReach what="menu" />}</OwnerShell>;
}
