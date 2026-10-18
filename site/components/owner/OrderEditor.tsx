"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ownerInputClass } from "@/lib/owner-ui";

/**
 * Change one paid order by hand: the pickup day and half-day, and her own note.
 * Customers sometimes message her on the side; this is where that goes.
 */
export function OrderEditor({ orderId, days, runDate, pickupPeriod, ownerNote, canMovePickup }: {
  orderId: string;
  /** The two pickup days of this order's bake, Friday then Saturday. */
  days: { value: string; label: string }[];
  runDate: string;
  pickupPeriod: string;
  ownerNote: string;
  canMovePickup: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(runDate);
  const [period, setPeriod] = useState(pickupPeriod === "afternoon" ? "afternoon" : "morning");
  const [note, setNote] = useState(ownerNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/owner/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "edit", ownerNote: note, ...(canMovePickup ? { runDate: date, pickupPeriod: period } : {}) }),
      });
      if (response.status === 401) { setMessage({ ok: false, text: "Your sign-in expired. Open the page again." }); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage({ ok: false, text: body.message ?? "That did not save. Please try again." });
        return;
      }
      setMessage({ ok: true, text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "That did not save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3">
      <summary className="owner-link cursor-pointer">Change pickup or add a note</summary>
      <div className="mt-3 flex flex-col gap-3">
        {canMovePickup ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Pickup day
              <select className={ownerInputClass} value={date} onChange={e => setDate(e.target.value)}>
                {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Pickup time
              <select className={ownerInputClass} value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon (from noon)</option>
              </select>
            </label>
          </div>
        ) : null}
        <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Your note on this order (the customer never sees it)
          <textarea className={ownerInputClass} rows={3} maxLength={600} value={note} onChange={e => setNote(e.target.value)} placeholder="Texted me: coming at 4 instead" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="stamp stamp-light !min-h-11 !px-3 !text-[11px] disabled:opacity-60" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          {message ? <p role="status" className={`font-ui text-[13px] ${message.ok ? "text-sage-deep" : "font-semibold text-brown"}`}>{message.text}</p> : null}
        </div>
      </div>
    </details>
  );
}
