"use client";
import Link from "next/link";
import { useState } from "react";
export function PracticeBanner() {
  const [resetting,setResetting]=useState(false);
  const [failure,setFailure]=useState("");
  async function reset() {
    setResetting(true);setFailure("");
    try {
      const response=await fetch("/api/mock/start",{method:"POST"});
      if (!response.ok) throw new Error();
      // A fresh document remounts the run-scoped cart after the HttpOnly cookie changes.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/mockorder");
    } catch { setResetting(false);setFailure("Practice could not restart. Please try again."); }
  }
  return <aside aria-label="Practice shop" className="sticky top-0 z-50 border-b-2 border-gold bg-brown-deep px-4 py-3 text-cream shadow-sm sm:px-10">
    <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div><p className="font-ui text-[13px] font-semibold">MOCK — private practice shop</p><p className="mt-1 font-ui text-[12px] leading-relaxed">No real charges or orders. Practice payment uses a sample card. Emails are previews only in the simulation.</p></div>
      <div className="flex flex-wrap items-center gap-4 font-ui text-[12px]">
        <button type="button" onClick={reset} className="min-h-11 border border-gold px-3 disabled:opacity-60" disabled={resetting}>{resetting?"Starting fresh…":"Start over"}</button>
        <Link className="min-h-11 border border-gold px-3 py-3 font-semibold" href="/mockorder/orders">Mock orders</Link>
        <Link className="py-3 underline" href="/menu">Exit practice</Link>
      </div>
    </div>
    {failure&&<p role="alert" className="mt-2 font-ui text-[12px]">{failure}</p>}
  </aside>;
}
