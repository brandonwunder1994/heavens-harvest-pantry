import type { OrderSnapshot } from "@/lib/order-store";
import { pickupDateLabel, saturdayDate } from "@/lib/fulfilment";

/**
 * Changing a paid order by hand: a customer texts to say they can only do
 * Saturday afternoon, or she wants to leave herself a reminder. Only the pickup
 * day (Friday or Saturday of the same bake), the pickup half-day, and her own
 * note can change. What was bought and what was paid never do.
 */
export type OrderEdit = { runDate?: unknown; pickupPeriod?: unknown; ownerNote?: unknown };
export type EditResult = { ok: true; snapshot: OrderSnapshot; changed: boolean } | { ok: false; problem: string };

const day = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(new Date(`${iso}T12:00:00Z`));
const stamp = (now: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", month: "short", day: "numeric" }).format(new Date(now));

export function editSnapshot(snapshot: OrderSnapshot, edit: OrderEdit, now = Date.now()): EditResult {
  const details = snapshot.order.details;
  const next = { ...details };
  const log = [...(details.ownerLog ?? [])];
  const hasPickup = snapshot.order.lines.some(line => !line.gift);

  if (edit.runDate !== undefined || edit.pickupPeriod !== undefined) {
    if (!hasPickup) return { ok: false, problem: "This order is blessing gifts only, so there is no pickup to change." };
    const bake = details.bakeId ?? details.runDate;
    const runDate = String(edit.runDate ?? details.runDate);
    const period = String(edit.pickupPeriod ?? details.pickupPeriod ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bake)) return { ok: false, problem: "This order has no bake date on file, so the pickup cannot be moved here. Add a note instead." };
    if (runDate !== bake && runDate !== saturdayDate(bake)) return { ok: false, problem: "Pick that bake's Friday or Saturday." };
    if (period !== "morning" && period !== "afternoon") return { ok: false, problem: "Pick morning or afternoon." };
    if (runDate !== details.runDate || period !== details.pickupPeriod) {
      log.push(`${stamp(now)}: pickup changed from ${details.runDate ? `${day(details.runDate)} ${details.pickupPeriod ?? ""}`.trim() : "unset"} to ${day(runDate)} ${period} (${pickupDateLabel(runDate)}).`);
      next.runDate = runDate;
      next.pickupPeriod = period;
    }
  }

  if (edit.ownerNote !== undefined) {
    const note = String(edit.ownerNote).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, 600);
    if (note !== (details.ownerNote ?? "")) next.ownerNote = note;
  }

  next.ownerLog = log.slice(-20);
  const changed = next.runDate !== details.runDate || next.pickupPeriod !== details.pickupPeriod || (next.ownerNote ?? "") !== (details.ownerNote ?? "");
  return { ok: true, changed, snapshot: { ...snapshot, order: { ...snapshot.order, details: next } } };
}
