"use client";

import { useState } from "react";
import Link, { usePractice } from "@/components/ShopLink";
import { HeartSeal } from "@/components/Sprite";

/**
 * The entry form. Nothing here proves a like or a share; it collects the name,
 * email and Instagram name she needs to check them by hand.
 */
export function GiveawayForm({ drawLabel, closed = false }: { drawLabel: string; closed?: boolean }) {
  const practice = usePractice();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (closed) return;
    setSending(true);
    setErrors({});
    setFailure("");

    try {
      const response = await fetch(practice ? "/api/mock/giveaway" : "/api/giveaway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, instagram, phone, confirmed }),
      });
      const data = (await response.json()) as { errors?: Record<string, string>; message?: string };

      if (response.ok) {
        setSent(true);
        return;
      }
      if (response.status === 422 && data.errors) {
        setErrors(data.errors);
        return;
      }
      setFailure(data.message ?? "It did not go through. Please try again in a moment.");
    } catch {
      setFailure("It did not go through. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        ref={(node) => node?.focus()}
        tabIndex={-1}
        role="status"
        className="dashed-frame flex flex-col items-center gap-3 bg-paper px-8 py-12 text-center outline-none"
      >
        <HeartSeal size={40} />
        <p className="display text-[28px] italic leading-tight sm:text-[34px]">You&apos;re entered. Thank you!</p>
        <p className="max-w-md text-[18px] leading-relaxed text-muted">
          Check your email. We&apos;ll look for your like and share on Instagram, and once we&apos;ve found them
          you&apos;ll get a second email confirming you&apos;re in{drawLabel ? `, with the draw on ${drawLabel}` : ""}.
        </p>
        <Link href="/menu" className="stamp stamp-light mt-2">
          While you wait, see the menu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 border border-rule bg-paper px-6 py-7 sm:px-8" noValidate>
      <fieldset disabled={closed} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 disabled:opacity-60">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
        <Field
          label="Email"
          hint="We send your confirmation here, so it has to be real."
          value={email}
          onChange={setEmail}
          type="email"
          error={errors.email}
          autoComplete="email"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Instagram name"
          hint="Like @yourname. It's how we find your like and share."
          value={instagram}
          onChange={setInstagram}
          error={errors.instagram}
          placeholder="@yourname"
          autoComplete="off"
        />
        <Field
          label="Phone"
          hint="Only if you'd like a text when the winner is picked."
          value={phone}
          onChange={setPhone}
          type="tel"
          optional
          error={errors.phone}
          autoComplete="tel"
        />
      </div>

      <label className="flex items-start gap-3 font-ui text-[15px] leading-snug text-ink">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#5b3d1e]"
        />
        <span>I liked and shared the post on Instagram.</span>
      </label>
      {errors.confirmed ? <FieldError>{errors.confirmed}</FieldError> : null}
      </fieldset>

      {failure ? (
        <p role="alert" className="border border-brown px-4 py-3 font-ui text-[14px] text-brown">
          {failure}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={sending || closed} className="stamp disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale">
          {closed ? "Entries open soon" : sending ? "Sending…" : "Enter the giveaway"}
        </button>
        <span className="font-ui text-[12px] text-faint">
          {closed ? "The form unlocks when the next giveaway opens." : "One entry each month. Your details are never shown."}
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = "text",
  optional,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  optional?: boolean;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-ui text-[12px] font-semibold text-muted">
        {label}
        {optional ? <span className="font-normal text-faint"> · optional</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full min-w-0 border bg-cream px-3.5 font-ui text-[15px] text-ink placeholder:text-faint ${
          error ? "border-brown" : "border-sand"
        }`}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      {hint && !error ? <span className="font-ui text-[11px] leading-relaxed text-faint">{hint}</span> : null}
    </label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="font-ui text-[12px] font-semibold text-brown">{children}</span>;
}
