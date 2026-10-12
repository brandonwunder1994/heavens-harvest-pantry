import { NextResponse } from "next/server";
import { mockRun } from "@/lib/mock-auth";
import { mockCapacity, reconcileMock } from "@/lib/mock-store";
export async function GET() {
  const run=await mockRun(); if (!run) return NextResponse.json({error:"owner_login_required"},{status:401});
  await reconcileMock(run);
  return NextResponse.json(await mockCapacity(run),{headers:{"Cache-Control":"private, no-store"}});
}
