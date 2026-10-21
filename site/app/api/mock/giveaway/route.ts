import { NextResponse } from "next/server";
import { checkEntry } from "@/lib/giveaway";
import { mockRun, sameOrigin } from "@/lib/mock-auth";

/** The practice shop's giveaway form: checks the entry like the real one, saves and sends nothing. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const run = await mockRun();
  if (!run) return NextResponse.json({ error: "owner_login_required" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const result = checkEntry(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });
  return NextResponse.json({ received: true, mock: true });
}
