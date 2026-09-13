import { NextResponse } from "next/server";
import { databaseReady } from "@/lib/db";
import { mailReady, sendMail } from "@/lib/mailer";
import { looksLikeEmail, normaliseEmail } from "@/lib/rewards";
import { accountFor } from "@/lib/rewards-source";
import { issueLink, linkIssuedRecently, rewardsAuthReady, sweepLinks } from "@/lib/rewards-auth";
import { siteUrl } from "@/lib/site-url";
import { business } from "@/lib/content";

/**
 * Sends someone a link to their own points.
 *
 * Two things this must get right. It answers the same way whether or not the
 * email has ever ordered, so it cannot be used to find out who her customers
 * are. And it never says "check your inbox" unless a message really went: a
 * customer who is told to check an inbox that stays empty tries three more
 * addresses and gives up, and nobody ever finds out the mail was broken.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = normaliseEmail(String((body as { email?: string })?.email ?? ""));
  if (!looksLikeEmail(email)) {
    return NextResponse.json(
      { error: "invalid", errors: { email: "That email does not look right." } },
      { status: 422 },
    );
  }

  const origin = siteUrl();
  if (!databaseReady || !rewardsAuthReady() || !mailReady || !origin) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Signing in is not switched on yet. Your card is still counting.",
      },
      { status: 503 },
    );
  }

  try {
    const account = await accountFor(email, { strict: true });

    // Nobody gets to post the same address a thousand times and fill a
    // neighbour's inbox. One live link at a time is all anyone needs.
    if (account && !(await linkIssuedRecently(email))) {
      await sweepLinks();
      const token = await issueLink(email);
      const link = `${origin}/api/rewards/open?token=${token}`;
      const sent = await sendMail(
        email,
        `Your ${business.shortName} rewards card`,
        [
          "Here is the link to your rewards card. It works once, for the next hour.",
          "",
          link,
          "",
          "If you did not ask for this, nothing has happened and you can ignore it.",
        ].join("\n"),
        [
          `<p style="font:16px Georgia,serif;color:#3a2712">Here is the link to your rewards card. It works once, for the next hour.</p>`,
          `<p><a href="${link}" style="font:15px Helvetica,Arial,sans-serif;color:#5b3d1e">See my card</a></p>`,
          `<p style="font:13px Helvetica,Arial,sans-serif;color:#8a7a62">If you did not ask for this, nothing has happened and you can ignore it.</p>`,
        ].join(""),
      );

      if (!sent.ok) {
        return NextResponse.json(
          {
            error: "send_failed",
            message: "We could not send that just now. Try again in a minute, or text her.",
          },
          { status: 502 },
        );
      }
    }
  } catch (error) {
    console.error("[rewards] link failed", error);
    return NextResponse.json(
      {
        error: "send_failed",
        message: "We could not send that just now. Try again in a minute, or text her.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true });
}
