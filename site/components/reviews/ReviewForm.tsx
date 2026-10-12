"use client";

import { useState } from "react";
import Link, { usePractice } from "@/components/ShopLink";
import { HeartSeal } from "@/components/Sprite";

/**
 * The form a customer fills in after a delivery. It does not go on the site
 * when they press send: it goes to her, and she decides.
 */
export function ReviewForm({ flavors, presetFlavor }: { flavors: string[]; presetFlavor?: string }) {
  const practice = usePractice();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [flavor, setFlavor] = useState(presetFlavor && flavors.includes(presetFlavor) ? presetFlavor : "");
  // Starts unset: a customer who never touches the stars should not be
  // recorded as having given five of them.
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setErrors({});
    setFailure("");

    try {
      const response = await fetch(practice ? "/api/mock/reviews" : "/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, flavor, rating, body }),
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
        <p className="display text-[28px] italic leading-tight sm:text-[34px]">Thank you. She reads every one.</p>
        <p className="max-w-md text-[18px] leading-relaxed text-muted">
          It goes to her first, not straight onto the page. If she puts it up you will see it here in a
          day or two.
        </p>
        <Link href="/menu" className="stamp stamp-light mt-2">
          Back to the menu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 border border-rule bg-paper px-6 py-7 sm:px-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" hint="A first name is plenty." value={name} onChange={setName} error={errors.name} />
        <Field
          label="Email"
          hint="Only so she can thank you. It is never shown."
          value={email}
          onChange={setEmail}
          type="email"
          optional
          error={errors.email}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="font-ui text-[12px] font-semibold text-muted">
            Flavor <span className="font-normal text-faint">· optional</span>
          </span>
          <select
            value={flavor}
            onChange={(e) => setFlavor(e.target.value)}
            className="h-12 w-full min-w-0 max-w-full border border-sand bg-cream px-3 font-ui text-[15px] text-ink"
          >
            <option value="">Not about one in particular</option>
            {flavors.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex min-w-0 flex-col gap-1.5">
          <legend className="font-ui text-[12px] font-semibold text-muted">How was it</legend>
          <div className="flex h-12 items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} out of 5`}
                aria-pressed={rating === star}
                className={`min-h-11 min-w-11 px-1 text-[30px] leading-none transition-colors ${
                  star <= rating ? "text-brown" : "text-muted hover:text-sage"
                }`}
              >
                {/* Shape, not just colour: an unfilled star has to be
                    distinguishable without seeing the difference in hue. */}
                {star <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
        </fieldset>
      </div>

      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-ui text-[12px] font-semibold text-muted">What you would tell a neighbor</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={900}
          aria-describedby="review-count"
          placeholder="A sentence or two is perfect."
          className={`w-full min-w-0 border bg-cream px-3.5 py-3 font-ui text-[15px] leading-relaxed text-ink placeholder:text-faint ${
            errors.body ? "border-brown" : "border-sand"
          }`}
        />
        {errors.body ? <FieldError>{errors.body}</FieldError> : null}
        <span id="review-count" className="font-ui text-[11px] text-muted">
          {body.length > 750 ? `${900 - body.length} letters left` : "As long or as short as you like."}
        </span>
      </label>

      {failure ? (
        <p role="alert" className="border border-brown px-4 py-3 font-ui text-[14px] text-brown">
          {failure}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={sending} className="stamp disabled:opacity-60">
          {sending ? "Sending…" : "Send it to her"}
        </button>
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
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  optional?: boolean;
  error?: string;
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
