import { NextResponse } from "next/server";
import { spendLink, startRewardsSession } from "@/lib/rewards-auth";
import { siteUrl } from "@/lib/site-url";

/**
 * Where the link in the email lands.
 *
 * This has to be a route handler, not a page: a cookie cannot be set while a
 * page is being rendered. The earlier version tried, which crashed with a 500
 * *after* it had already spent the customer's one-time token — so they got an
 * error page and a link that would never work again.
 *
 * The token is swapped for a cookie here and the customer is sent on, so it
 * never sits in the address bar or in their history.
 */
export async function GET(request: Request) {
  const origin = siteUrl() ?? new URL(request.url).origin;
  const token = new URL(request.url).searchParams.get("token") ?? "";

  let email: string | null = null;
  try {
    email = await spendLink(token);
  } catch (error) {
    console.error("[rewards] could not open a sign-in link", error);
    return NextResponse.redirect(`${origin}/rewards?link=trouble`, { status: 303 });
  }

  if (!email) return NextResponse.redirect(`${origin}/rewards?link=spent`, { status: 303 });

  await startRewardsSession(email);
  return NextResponse.redirect(`${origin}/rewards/me`, { status: 303 });
}
