"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Ticking a doorstep off the run.
 *
 * The failure message is rendered whichever way the chip currently reads. It
 * used to exist only on the "not delivered" side, so undoing a mistaken tick
 * could fail — an expired sign-in, a bad minute at Stripe — and the chip would
 * simply stay green. She would drive off believing an order was already
 * delivered that had never been made.
 */
export function DeliveredToggle({ orderId, delivered }: { orderId: string; delivered: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  const working = busy || pending;

  async function toggle() {
    setBusy(true);
    setFailed("");
    try {
      const response = await fetch("/api/owner/delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, delivered: !delivered }),
      });
      if (response.status === 401) {
        // "Try again" would be advice that fails forever.
        setFailed("Your sign-in expired. Open the page again.");
        return;
      }
      if (!response.ok) throw new Error("failed");
      startTransition(() => router.refresh());
    } catch {
      setFailed("Did not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={working}
        title={delivered ? "Tap to undo" : undefined}
        className={
          delivered
            ? "caps w-full bg-moss px-2.5 py-1.5 text-[9px] text-sage-deep disabled:opacity-50"
            : "caps w-full border border-brown px-2.5 py-1.5 text-[9px] text-brown hover:bg-brown hover:text-cream disabled:opacity-50"
        }
      >
        {working ? "Saving…" : delivered ? "Delivered" : "Mark delivered"}
      </button>

      {failed ? (
        <span role="alert" className="font-ui text-[10px] font-semibold text-brown">
          {failed}
        </span>
      ) : null}
    </div>
  );
}
