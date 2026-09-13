"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { SoundSwitch } from "@/components/craft/SoundSwitch";
import { Stepper } from "@/components/cart/Stepper";
import { MAX_JARS_RETURNED, describeLine, formatMoney } from "@/lib/cart";
import { packPhotoFor } from "@/lib/jars";

import { filled, money, rewardOffer } from "@/lib/content";
import type { FulfilmentMethod } from "@/lib/order";

type Errors = Record<string, string>;

export function CheckoutForm({ paymentsLive, testMode }: { paymentsLive: boolean; testMode: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const { totals, shop } = cart;
  const { blessingBag, delivery, jarRules } = shop;

  const [method, setMethod] = useState<FulfilmentMethod>("delivery");
  const [runIndex, setRunIndex] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [prayer, setPrayer] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [priceMoved, setPriceMoved] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const empty = cart.ready && totals.itemCount === 0 && cart.blessingBags === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);
    setErrors({});
    setPriceMoved(null);
    setSubmitting(true);
    const run = delivery.runs[runIndex];
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines,
          jarsReturned: cart.jarsReturned,
          blessingBags: cart.blessingBags,
          // What this browser last showed. If her prices moved while the page
          // was open the server refuses rather than charging a different sum.
          expectedTotalCents: totals.totalCents,
          details: {
            method,
            runArea: run?.area ?? "",
            runDate: run?.nextDate ?? "",
            name,
            phone,
            address,
            note,
            prayer,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 422 && data.errors) {
        setErrors(data.errors as Errors);
        return;
      }
      if (response.status === 409) {
        setPriceMoved(Number(data.totalCents));
        // Pull the page again so the summary beside the button is hers, not ours.
        router.refresh();
        return;
      }
      if (response.status === 503) {
        setFailure(
          "Card payments are not switched on yet. Everything else on this page is working; the moment her Stripe account is connected this button will take you to payment.",
        );
        return;
      }
      if (!response.ok || !data.url) {
        setFailure(
          data.message ??
            "Something went wrong reaching the payment page. Nothing has been charged. Please try again.",
        );
        return;
      }
      window.location.assign(data.url as string);
    } catch {
      setFailure("We could not reach the payment page. Nothing has been charged. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.ready) {
    return <div className="py-20 text-center font-ui text-[14px] text-faint">Fetching your order…</div>;
  }

  if (empty) {
    return (
      <div className="dashed-frame mx-auto flex max-w-[560px] flex-col items-center gap-4 bg-paper px-8 py-14 text-center">
        <p className="display text-[32px]">Nothing in the basket yet.</p>
        <p className="text-[18px] leading-relaxed text-muted">
          Pick a flavor or two and they will show up here.
        </p>
        <Link href="/menu" className="stamp mt-1">
          See this week&apos;s menu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-[560px] flex-col gap-0" noValidate>
      <Section title="Your order">
        <div className="flex flex-col gap-2.5">
          {totals.lines.map((p) => {
            const src = packPhotoFor(p.flavor, p.line.format);
            return (
              <div key={`${p.line.slug}-${p.line.format}-${p.line.name ?? ""}`} className="flex items-center gap-3">
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    width={54}
                    height={75}
                    className="h-[72px] w-auto shrink-0"
                  />
                ) : null}
                <div className="leader min-w-0 flex-1">
                  <span className="text-[19px]">{describeLine(p)}</span>
                  <span className="leader-dots" />
                  <span className="whitespace-nowrap font-ui text-[13px] font-semibold">
                    {formatMoney(p.totalCents)}
                  </span>
                </div>
              </div>
            );
          })}
          {cart.blessingBags > 0 ? (
            <div className="leader text-sage">
              <span className="text-[19px]">
                Blessing bag{cart.blessingBags > 1 ? `s ×${cart.blessingBags}` : ""}
              </span>
              <span className="leader-dots" />
              <span className="whitespace-nowrap font-ui text-[13px] font-semibold">
                {formatMoney(totals.blessingCents)}
              </span>
            </div>
          ) : null}
        </div>
        <Link href="/menu" className="font-ui text-[12px] font-semibold tracking-wide text-sage hover:text-brown">
          Change something
        </Link>
        {errors.lines ? <FieldError>{errors.lines}</FieldError> : null}
      </Section>

      <div className="mt-6 bg-brown p-5 text-cream shadow-[inset_0_0_0_4px_#5b3d1e,inset_0_0_0_5px_#c9a06a]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="display text-[24px] text-cream">Jars coming back?</div>
            <p className="font-ui text-[12px] text-linen">
              {money(jarRules.creditDollars)} off each. Leave them on the porch.
            </p>
          </div>
          <Stepper
            tone="gold"
            value={cart.jarsReturned}
            max={MAX_JARS_RETURNED}
            label="jars returned"
            onChange={cart.setJarsReturned}
          />
        </div>
        {totals.jarCreditAppliedCents > 0 ? (
          <div className="mt-3 flex justify-between border-t border-dashed border-gold/50 pt-3 font-ui text-[14px] font-semibold text-gold">
            <span>Jar credit</span>
            <span>&minus;{formatMoney(totals.jarCreditAppliedCents)}</span>
          </div>
        ) : null}
        {totals.jarCreditRequestedCents > totals.jarCreditAppliedCents ? (
          <p className="mt-3 border-t border-dashed border-gold/50 pt-3 font-ui text-[12px] leading-relaxed text-linen">
            That is more credit than this order can take. We have applied{" "}
            {formatMoney(totals.jarCreditAppliedCents)} now, and every jar still punches the card.
            Mention the rest to her at the door.
          </p>
        ) : null}
      </div>

      <div className="mt-4 bg-sage p-5 text-cream">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="display text-[23px] text-cream">Add a blessing bag?</div>
            <p className="max-w-[280px] font-ui text-[12px] leading-relaxed text-moss">
              {money(blessingBag.price)} puts a bag on the porch of a neighbor in a hard season.
            </p>
          </div>
          <Stepper
            tone="gold"
            value={cart.blessingBags}
            max={10}
            label="blessing bags"
            onChange={cart.setBlessingBags}
          />
        </div>
      </div>

      <Divider />
      <Section title="How do you want it?">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Choice
            selected={method === "delivery"}
            onSelect={() => setMethod("delivery")}
            title="Porch delivery"
            note={`${delivery.runs.map((r) => r.area).join(" & ")} · free`}
          />
          <Choice
            selected={method === "dropoff"}
            onSelect={() => setMethod("dropoff")}
            title="Drop-off spot"
            note={filled(delivery.dropOff) ? `${filled(delivery.dropOff)} · free` : "free"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {delivery.runs.map((run, i) => (
            <button
              key={run.area}
              type="button"
              onClick={() => setRunIndex(i)}
              aria-pressed={runIndex === i}
              className={`font-ui text-[12px] font-semibold ${
                runIndex === i
                  ? "bg-brown px-3.5 py-2.5 text-cream"
                  : "border border-dashed border-hedge px-3.5 py-2.5 text-muted"
              }`}
            >
              {run.nextDate} · {run.area}
            </button>
          ))}
        </div>
        {errors.runIndex ? <FieldError>{errors.runIndex}</FieldError> : null}
      </Section>

      <Divider />
      <Section title="Who it's for">
        <Field
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Sarah M."
          autoComplete="name"
          error={errors.name}
        />
        <Field
          label="Mobile number"
          value={phone}
          onChange={setPhone}
          placeholder="(623) 555-0199"
          type="tel"
          autoComplete="tel"
          error={errors.phone}
          hint="For the text when she sets out. Your rewards card is kept against your email."
        />
        {method === "delivery" ? (
          <Field
            label="Address"
            value={address}
            onChange={setAddress}
            placeholder="12844 W Example Dr, Peoria"
            autoComplete="street-address"
            error={errors.address}
          />
        ) : null}
        <Field
          label="Note for the porch"
          value={note}
          onChange={setNote}
          placeholder="Gate code, or where to leave it"
          optional
        />
      </Section>

      <Divider />
      <Section title="Anything to pray about?">
        <label className="sr-only" htmlFor="prayer">
          Prayer request
        </label>
        <textarea
          id="prayer"
          value={prayer}
          onChange={(e) => setPrayer(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Optional. She reads these and nobody else does."
          className="border border-sand bg-paper px-3.5 py-3 font-ui text-[15px] text-ink placeholder:text-faint"
        />
      </Section>

      <Divider />
      <div className="flex flex-col gap-2 px-1 pt-5">
        <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />
        {totals.blessingCents > 0 ? (
          <Row label="Blessing bags" value={formatMoney(totals.blessingCents)} tone="sage" />
        ) : null}
        {totals.jarCreditAppliedCents > 0 ? (
          <Row
            label={`${cart.jarsReturned} jar${cart.jarsReturned === 1 ? "" : "s"} returned`}
            value={`−${formatMoney(totals.jarCreditAppliedCents)}`}
            tone="sage"
          />
        ) : null}
        <Row label="Delivery" value="Free" />
        <div className="leader mt-1.5">
          <span className="display text-[30px]">Total</span>
          <span className="leader-dots" />
          <span className="display text-[30px]">{formatMoney(totals.totalCents)}</span>
        </div>
        <p className="font-ui text-[12px] font-semibold leading-relaxed text-sage">
          {rewardOffer.sentence} This order punches the card.
        </p>
      </div>

      {cart.ready && cart.dropped > 0 ? (
        <p
          role="status"
          className="dashed-frame bg-paper px-4 py-3 font-ui text-[14px] leading-relaxed text-bark"
        >
          {cart.dropped === 1 ? "One thing has" : `${cart.dropped} things have`} come off your basket
          since you added {cart.dropped === 1 ? "it" : "them"} — sold out, or no longer on the menu. The
          total below is what is left.
        </p>
      ) : null}

      {priceMoved !== null ? (
        <p
          role="alert"
          className="border-2 border-brown bg-[#fdf6ea] px-4 py-3 font-ui text-[14px] leading-relaxed text-brown"
        >
          <strong className="font-semibold">Her prices changed while you were shopping.</strong> The
          total is now {formatMoney(priceMoved)}. Nothing has been charged. Have a look, then press the
          button again if it still suits you.
        </p>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="mt-5 border border-brown bg-paper px-5 py-4 font-ui text-[14px] leading-relaxed text-brown"
        >
          {failure}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 pb-4 pt-6">
        <button type="submit" disabled={submitting} className="stamp !min-h-14 disabled:opacity-60">
          {submitting ? "Taking you to payment…" : `Pay ${formatMoney(totals.totalCents)}`}
        </button>
        <p className="text-center font-ui text-[11px] leading-relaxed text-faint">
          {paymentsLive
            ? "Card details go straight to Stripe. We never see them."
            : "Card payments are not connected yet, so this button will tell you so rather than charging anything."}
          {testMode ? " Running in test mode: no real money moves." : ""}
        </p>
        <div className="flex justify-center pt-1">
          <SoundSwitch label="Basket sound" />
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 px-1 pt-5">
      <h2 className="ref !text-[10px] text-sage">{title}</h2>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="mt-5 border-t border-dashed border-hedge" />;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "sage" }) {
  return (
    <div className={`flex justify-between font-ui text-[14px] ${tone === "sage" ? "text-sage" : "text-muted"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="font-ui text-[12px] font-semibold text-brown">
      {children}
    </p>
  );
}

function Choice({
  selected,
  onSelect,
  title,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1 px-4 py-3.5 text-left ${
        selected ? "border-[1.5px] border-brown bg-paper" : "border border-dashed border-hedge"
      }`}
    >
      <span className={`font-ui text-[14px] font-semibold ${selected ? "text-ink" : "text-muted"}`}>{title}</span>
      <span className="font-ui text-[12px] text-faint">{note}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  error,
  hint,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-ui text-[12px] font-semibold text-muted">
        {label}
        {optional ? <span className="font-normal text-faint"> · optional</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={`h-12 border bg-paper px-3.5 font-ui text-[15px] text-ink placeholder:text-faint ${
          error ? "border-brown" : "border-sand"
        }`}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      {hint && !error ? <p className="font-ui text-[12px] leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}
