"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";

const livePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function EmbeddedPayment({ clientSecret, publishableKey = livePublishableKey }: { clientSecret: string; publishableKey?: string }) {
  const target = useRef<HTMLDivElement>(null);
  const [failure, setFailure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let checkout: StripeEmbeddedCheckout | undefined;
    async function mount() {
      try {
        const stripe = publishableKey ? await loadStripe(publishableKey) : null;
        if (!stripe) throw new Error("Stripe is unavailable");
        const instance = await stripe.createEmbeddedCheckoutPage({ clientSecret });
        if (cancelled) { instance.destroy(); return; }
        checkout = instance;
        if (target.current) instance.mount(target.current);
        setLoading(false);
      } catch {
        if (!cancelled) { setFailure(true); setLoading(false); }
      }
    }
    void mount();
    return () => { cancelled = true; checkout?.destroy(); };
  }, [clientSecret, attempt, publishableKey]);

  return (
    <section aria-label="Secure card payment" className="mx-auto mt-8 w-full max-w-[560px]">
      <h2 className="display mb-3 text-[28px]">Secure payment</h2>
      <p className="mb-5 font-ui text-[14px] leading-relaxed text-muted">Review your order and enter your card details below. Stripe securely processes your payment.</p>
      {loading ? <p role="status" className="py-8 text-center font-ui text-[14px] text-muted">Loading secure payment…</p> : null}
      {failure ? <div role="alert" className="dashed-frame bg-paper p-5 font-ui text-[14px] leading-relaxed">
        <p>The payment form could not load. Check your connection and try again.</p>
        <button type="button" className="stamp mt-4" onClick={() => { setFailure(false); setLoading(true); setAttempt((value) => value + 1); }}>Retry payment form</button>
      </div> : null}
      <div ref={target} />
    </section>
  );
}
