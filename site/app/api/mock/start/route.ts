import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isSignedIn } from "@/lib/owner-auth";
import { MOCK_COOKIE, sameOrigin } from "@/lib/mock-auth";
import { sql } from "@/lib/db";
async function start(request: Request) {
  if (!(await isSignedIn())) return NextResponse.redirect(new URL("/owner/login?next=/mockorder", request.url),303);
  const id = randomUUID();
  await sql()`insert into mock_runs(id) values(${id}::uuid)`;
  const response = NextResponse.redirect(new URL("/mockorder", request.url), 303);
  response.cookies.set(MOCK_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60*60*24*30 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function GET(request: Request) {
  // Initial owner-only bootstrap. Resetting an existing run requires a POST.
  const { mockRun } = await import("@/lib/mock-auth");
  if (await mockRun()) return NextResponse.redirect(new URL("/mockorder", request.url));
  return start(request);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error:"invalid_origin"},{status:403});
  return start(request);
}
