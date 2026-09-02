import "server-only";

/**
 * Sending mail. One provider, Resend, because it is the one thing she has to
 * sign up for and one is enough.
 *
 * Until `RESEND_API_KEY` and `MAIL_FROM` are set, `mailReady` is false and every
 * screen that needs mail says so plainly rather than pretending to send.
 */

export const mailReady = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export type Sent = { ok: true } | { ok: false; reason: string; detail?: string };

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<Sent> {
  if (!mailReady) return { ok: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text, html }),
      // Without this a hung provider holds the customer on "Sending…" until the
      // whole request is killed, and they get a raw network error.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("[mail] refused:", response.status, detail);
      return { ok: false, reason: "refused", detail };
    }
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("[mail] could not send", error);
    return { ok: false, reason: "network", detail };
  }
}
