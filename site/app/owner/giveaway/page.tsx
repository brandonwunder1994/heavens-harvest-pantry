import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { GiveawayEditor } from "@/components/owner/GiveawayEditor";
import { GiveawayEntryRow } from "@/components/owner/GiveawayEntryRow";
import { GiveawayWinner } from "@/components/owner/GiveawayWinner";
import ShopLink from "@/components/ShopLink";
import { databaseReady } from "@/lib/db";
import { drawLabel, roundKey } from "@/lib/giveaway";
import { currentWinner, listEntries, readGiveaway, type Entry } from "@/lib/giveaway-store";
import { mailReady } from "@/lib/mailer";
import { isSignedIn } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function OwnerGiveawayPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const { setting, live } = databaseReady ? await readGiveaway() : { setting: undefined, live: false };
  const round = setting ? roundKey(setting) : "";

  let entries: Entry[] = [];
  let winner: Entry | null = null;
  let readable = live;
  if (live) {
    try {
      [entries, winner] = await Promise.all([listEntries(round), currentWinner(round)]);
    } catch (error) {
      console.error("[giveaway] could not read the entries", error);
      readable = false;
    }
  }

  const waiting = entries.filter((e) => !e.verified);
  const verified = entries.filter((e) => e.verified);

  return (
    <OwnerShell active="/owner/giveaway">
      <OwnerHeading
        title="Monthly giveaway"
        note="Paste your Instagram post, set the prize and date, then check each entry against Instagram. Only entries you verify land on the wheel."
      />
      {!readable || !setting ? (
        <CannotReach what="giveaway" />
      ) : (
        <>
          <p className={`owner-alert ${setting.open ? "" : "is-quiet"}`} role="status">
            {setting.open
              ? `Open on the website${drawLabel(setting) ? `. Draw: ${drawLabel(setting)}` : ""}.`
              : "Closed. The giveaway page says there isn't one open."}{" "}
            <ShopLink href="/monthly-giveaway" className="underline underline-offset-4">
              View the page
            </ShopLink>
          </p>
          {!mailReady ? (
            <p className="owner-alert" role="status">
              Email is not switched on yet, so confirmation emails will not send until it is.
            </p>
          ) : null}

          <GiveawayEditor initial={setting} />

          {winner ? <GiveawayWinner winner={winner} /> : null}

          <section className="flex flex-col gap-4">
            <h2 className="display m-0 text-[24px]">
              {entries.length === 0
                ? "No entries yet"
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} this month · ${verified.length} verified`}
            </h2>
            {entries.length === 0 ? (
              <p className="dashed-frame bg-paper px-5 py-8 text-center font-ui text-[14px] text-muted">
                When someone enters, they show up here. Tap their Instagram name to open their profile, check that they liked and
                shared your post, then tap Verified. They get their &ldquo;you&apos;re in&rdquo; email with the draw date.
              </p>
            ) : null}
            {waiting.length > 0 ? (
              <div className="flex flex-col gap-4">
                <h3 className="font-ui text-[13px] font-semibold uppercase tracking-[0.12em] text-brown">Waiting on you ({waiting.length})</h3>
                {waiting.map((entry) => (
                  <GiveawayEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : null}
            {verified.length > 0 ? (
              <div className="flex flex-col gap-4">
                <h3 className="font-ui text-[13px] font-semibold uppercase tracking-[0.12em] text-sage-deep">Verified ({verified.length})</h3>
                {verified.map((entry) => (
                  <GiveawayEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </OwnerShell>
  );
}
