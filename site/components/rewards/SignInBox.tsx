"use client";

import { useState } from "react";

/**
 * No password, no account to make. They type the email their order went to and
 * a link arrives. If mail is not switched on yet the box says so instead of
 * pretending to send.
 */
export function SignInBox({ disabled = false }: { disabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setProblem("");

    try {
      const response = await fetch("/api/rewards/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { errors?: Record<string, string>; message?: string };

      if (response.ok) {
        setState("sent");
        return;
      }
      setState("idle");
      setProblem(data.errors?.email ?? data.message ?? "That did not go through. Try again in a moment.");
    } catch {
      setState("idle");
      setProblem("That did not go through. Check your connection and try again.");
    }
  }

  if (state === "sent") {
    return (
      <div
        ref={(node) => node?.focus()}
        tabIndex={-1}
        role="status"
        className="bg-brown px-8 py-10 text-center text-cream outline-none shadow-[inset_0_0_0_4px_#5b3d1e,inset_0_0_0_5px_#c9a06a]"
      >
        <div className="small-caps !text-gold">Check your inbox</div>
        <p className="mt-3 text-[19px] leading-relaxed text-linen">
          If {email} has ordered before, a link is on its way. It works once and lasts an hour.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-brown px-8 py-10 text-center text-cream shadow-[inset_0_0_0_4px_#5b3d1e,inset_0_0_0_5px_#c9a06a]"
    >
      <div className="small-caps !text-gold">Check your card</div>
      <p className="mx-auto mt-3 max-w-md text-[19px] leading-relaxed text-linen">
        Type the email your order went to. We send you a link. There is no password to forget and no
        account to make.
      </p>

      <div className="mx-auto mt-5 flex w-full max-w-[420px] flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          disabled={disabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Your email"
          className="h-12 flex-1 border border-gold/50 bg-cream px-3.5 font-ui text-[15px] text-ink placeholder:text-faint"
        />
        <button type="submit" disabled={disabled || state === "sending"} className="stamp stamp-gold disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Send the link"}
        </button>
      </div>

      {problem ? (
        <p role="alert" className="mx-auto mt-4 max-w-md font-ui text-[14px] font-semibold text-gold">
          {problem}
        </p>
      ) : null}
    </form>
  );
}
