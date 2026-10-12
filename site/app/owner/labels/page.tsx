import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { LabelEditor } from "@/components/owner/LabelEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { ownerOrders } from "@/lib/owner-data";
import { OrderReadWarning } from "@/components/owner/Work";
import type { Flavor } from "@/lib/content";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ order?: string; item?: string }> }) {
  if (!(await isSignedIn())) redirect("/owner/login");

  const params = await searchParams;
  const [{ shop, live }, { result, warning }] = await Promise.all([readShop(), ownerOrders()]);
  const orders =
    result.status === "ok"
      ? result.orders
          .filter((order) => !order.delivered || order.id === params.order)
          .map((order) => ({
            id: order.id,
            name: order.name,
            runDate: order.runDate,
            // Samplers use the bag label template; keep their actual format in
            // the paid order and bake list.
            items: order.items.map((item, index) => ({ ...item, slug: item.slug || `archived-${order.id}-${index}`, format: item.format === "sampler" ? "bag" as const : item.format })),
          }))
      : [];
  // Label-only choices retain purchased ingredients even after menu removal.
  const flavors = [...shop.flavors];
  for (const order of orders) for (const item of order.items) {
    if (!flavors.some(f => f.slug === item.slug)) flavors.push({ slug: item.slug!, name: item.name, blurb: "Historical order Â· label only", ingredients: item.ingredients ?? "", allergens: item.allergens ?? "", bagPrice: 0, jarPrice: 0, soldOut: true } satisfies Flavor);
  }

  return (
    <OwnerShell active="/owner/labels">
      <OwnerHeading
        eyebrow="Labels"
        title="Product labels"
        note="Each flavor keeps its own landscape label, with the branded QR and a gold heart. Change the words, save them, then download a picture sized for that printer and open it in the Katasymbol app."
      />
      <OrderReadWarning result={result} warning={warning} />

      {!live ? (
        <CannotReach what="labels" />
      ) : (
        <LabelEditor flavors={flavors} settings={shop.labelTemplates} orders={orders} initialOrderId={params.order} initialItemIndex={Number(params.item) || 0} />
      )}
    </OwnerShell>
  );
}
