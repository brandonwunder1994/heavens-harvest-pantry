import "server-only";
import { cookies } from "next/headers";
import { isSignedIn } from "@/lib/owner-auth";
import { sql } from "@/lib/db";
export const MOCK_COOKIE = "hhp_mock_run";
export const uuid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export async function mockRun() {
  if (!(await isSignedIn())) return null;
  const id = (await cookies()).get(MOCK_COOKIE)?.value;
  if (!uuid(id)) return null;
  const rows = await sql()`select id from mock_runs where id=${id}::uuid`;
  return rows.length ? id : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
