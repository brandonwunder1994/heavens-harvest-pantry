import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { loadOrders } from "@/lib/orders-source";
import { reconcileOpenOrders } from "@/lib/order-store";
import { guideSample } from "@/lib/handoff-sample";

/** One reconciliation and complete order read per owner request, shared by widgets. */
export const ownerOrders = cache(async () => {
  if (!(await isSignedIn())) redirect("/owner/login");
  let warning = "";
  if (!guideSample) {
    try { await reconcileOpenOrders(); }
    catch { warning = "Payment updates could not refresh. Refresh before using these figures or baking."; }
  }
  const result = await loadOrders(0);
  return { result, warning };
});
