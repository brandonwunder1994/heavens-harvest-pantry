"use client";

import { useActionState, useCallback, useState } from "react";
import { saveGiveaway } from "@/app/owner/giveaway-actions";
import { idle } from "@/lib/save-state";
import { giveawayLimits, type GiveawaySetting } from "@/lib/giveaway";
import { SaveBar, inputClass } from "@/components/owner/SaveBar";

/** The giveaway's settings: the post link, the prize, the draw date, and the two switches. */
export function GiveawayEditor({ initial }: { initial: GiveawaySetting }) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveGiveaway, idle);
  const settled = useCallback(() => setDirty(false), []);
  const set = <K extends keyof GiveawaySetting>(key: K) => (next: GiveawaySetting[K]) => {
    setDirty(true);
    setValue((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="value" value={JSON.stringify(value)} />

      <section className="owner-panel flex flex-col gap-4">
        <label className="flex min-h-11 items-center gap-3 text-[16px] font-semibold">
          <input type="checkbox" checked={value.open} onChange={(e) => set("open")(e.target.checked)} className="h-5 w-5 accent-[#5b3d1e]" />
          Accept entries on the website
        </label>
        <p className="owner-muted">Turn this off to close the giveaway. The page stays up and says there isn&apos;t one open.</p>

        <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">
          Instagram post link
          <input
            className={inputClass}
            type="url"
            maxLength={giveawayLimits.url}
            value={value.postUrl}
            onChange={(e) => set("postUrl")(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
          />
          <span className="font-normal">Open the post on Instagram, tap the three dots, choose Copy link, and paste it here. The giveaway page shows a button to it.</span>
        </label>

        <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">
          What the winner gets
          <input
            className={inputClass}
            maxLength={giveawayLimits.prize}
            value={value.prize}
            onChange={(e) => set("prize")(e.target.value)}
            placeholder="A free 1 lb bag of any granola"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">
            Draw date
            <input className={inputClass} type="date" value={value.drawDate} onChange={(e) => set("drawDate")(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">
            Draw time (optional)
            <input
              className={inputClass}
              maxLength={giveawayLimits.time}
              value={value.drawTime}
              onChange={(e) => set("drawTime")(e.target.value)}
              placeholder="7:00 PM"
            />
          </label>
        </div>
        <p className="owner-muted">
          The date goes in every email. It also decides which month&apos;s list you&apos;re working on: move it into a new month and
          you start a fresh list, so last month&apos;s entrants can enter again.
        </p>

        <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">
          How the winner picks it up (optional)
          <input
            className={inputClass}
            maxLength={giveawayLimits.note}
            value={value.pickupNote}
            onChange={(e) => set("pickupNote")(e.target.value)}
            placeholder="Pick it up from the porch on Friday or Saturday with your confirmation email."
          />
        </label>
      </section>

      <section className="owner-panel flex flex-col gap-3">
        <label className="flex min-h-11 items-center gap-3 text-[16px] font-semibold">
          <input type="checkbox" checked={value.revealed} onChange={(e) => set("revealed")(e.target.checked)} className="h-5 w-5 accent-[#5b3d1e]" />
          Show names on the wheel
        </label>
        <p className="owner-muted">
          Leave this off until draw day. While it&apos;s off, the public page only has &ldquo;Entry 1, Entry 2…&rdquo; and the names are blurred, so
          nobody&apos;s information is shown. On draw day, turn it on, save, open the giveaway page while signed in, start recording,
          and tap Spin.
        </p>
      </section>

      <SaveBar state={state} label="Save giveaway" dirty={dirty} onSaved={settled} />
    </form>
  );
}
