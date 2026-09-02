// Written by build.mjs from receipt.ts. Do not edit by hand.
function ticketNumber(sessionId) {
  const tail = sessionId.replace(/^cs_(test|live)_/, "").replace(/[^a-zA-Z0-9]/g, "");
  const six = tail.slice(-6).toUpperCase();
  return six.length === 6 ? `${six.slice(0, 3)}-${six.slice(3)}` : "PENDING";
}
function creditShortfallCents(receipt) {
  return Math.max(0, receipt.jarCreditAskedCents - receipt.jarCreditCents);
}
function subtotalCents(receipt) {
  return receipt.lines.reduce((sum, line) => sum + line.cents, 0);
}
function whatHappensNext(receipt) {
  const jars = receipt.jarsReturned > 0 ? ` Leave your ${receipt.jarsReturned} jar${receipt.jarsReturned === 1 ? "" : "s"} out and she will take ${receipt.jarsReturned === 1 ? "it" : "them"}.` : "";
  if (receipt.runArea && receipt.runDate) {
    const where = receipt.method === "dropoff" ? "waiting for you at" : "on your porch in";
    return `She bakes Monday, and it is ${where} ${receipt.runArea} on ${receipt.runDate}.${jars}`;
  }
  return `She bakes Monday and will text you when she sets out.${jars}`;
}
function stamp(when) {
  const date = when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} \xB7 ${time}`;
}
function receiptFrom(session, lineItems, verse, pointsBalance = null) {
  const meta = session.metadata ?? {};
  const method = meta.method === "delivery" || meta.method === "dropoff" ? meta.method : null;
  return {
    number: ticketNumber(session.id),
    placedAt: new Date((session.created ?? Math.floor(Date.now() / 1e3)) * 1e3),
    firstName: (meta.customer_name ?? "").trim().split(/\s+/)[0] ?? "",
    lines: lineItems.map((item) => ({
      what: item.description ?? "Granola",
      qty: item.quantity ?? 1,
      cents: item.amount_total ?? 0
    })),
    jarsReturned: Number(meta.jars_returned ?? 0) || 0,
    jarCreditCents: Number(meta.jar_credit_cents ?? 0) || 0,
    jarCreditAskedCents: Number(meta.jar_credit_asked_cents ?? meta.jar_credit_cents ?? 0) || 0,
    totalCents: session.amount_total ?? 0,
    pointsEarned: Number(meta.points_earned ?? 0) || 0,
    pointsBalance,
    method,
    runArea: meta.run_area ?? "",
    runDate: meta.run_date ?? "",
    porchNote: (meta.porch_note ?? "").trim(),
    verse
  };
}
export {
  creditShortfallCents,
  receiptFrom,
  stamp,
  subtotalCents,
  ticketNumber,
  whatHappensNext
};
