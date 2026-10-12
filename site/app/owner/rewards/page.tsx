import { redirect } from "next/navigation";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { isSignedIn } from "@/lib/owner-auth";
import { everyStanding } from "@/lib/rewards-source";
export const dynamic = "force-dynamic";
export default async function OwnerRewardsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const result = await everyStanding();
  return <OwnerShell active="/owner/rewards"><OwnerHeading title="Historical reward balances" note="Rewards are paused. This is a read-only record of saved balances; customers cannot join or earn new points." />{result.status !== "ok" ? <p role="alert" className="owner-alert">Saved balances could not load. Refresh to try again. Existing points have not been changed.</p> : result.standings.length ? <table className="owner-table owner-responsive-table"><thead><tr><th>Name</th><th>Email</th><th>Saved points</th></tr></thead><tbody>{result.standings.map(person => <tr key={person.email}><td>{person.name || "Customer"}</td><td className="break-all">{person.email}</td><td className="tabular-nums">{person.points}</td></tr>)}</tbody></table> : <p className="owner-empty">No historical balances are saved.</p>}</OwnerShell>;
}
