import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { LabelEditor } from "@/components/owner/LabelEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { loadOrders } from "@/lib/orders-source";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const [{ shop, live }, result] = await Promise.all([readShop(), loadOrders()]);
  const orders =
    result.status === "ok"
      ? result.orders
          .filter((order) => !order.delivered)
          .map((order) => ({
            id: order.id,
            name: order.name,
            runDate: order.runDate,
            items: order.items,
          }))
      : [];

  return (
    <OwnerShell active="/owner/labels">
      <OwnerHeading
        eyebrow="Labels"
        title="The tape for the T50M Pro."
        note="Each flavor keeps its own label. Change the words, save them, then download a picture sized for that printer and open it in the Katasymbol app."
      />

      {!live ? (
        <CannotReach what="labels" />
      ) : (
        <LabelEditor flavors={shop.flavors} settings={shop.labelTemplates} orders={orders} />
      )}
    </OwnerShell>
  );
}
