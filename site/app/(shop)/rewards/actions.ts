"use server";

import { redirect } from "next/navigation";
import { endRewardsSession } from "@/lib/rewards-auth";

export async function signOutOfRewards(): Promise<void> {
  await endRewardsSession();
  redirect("/rewards");
}
