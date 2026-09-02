"use client";

import { useActionState, useCallback, useId, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, SaveBar, inputClass } from "@/components/owner/SaveBar";
import type { Delivery } from "@/lib/content";
import { limits } from "@/lib/shop-schema";

/** Her delivery days and the dates the site is currently promising. */
export function DeliveryEditor({ delivery }: { delivery: Delivery }) {
  const base = useId();
  const [value, setValue] = useState<Delivery>(delivery);
  const [keys, setKeys] = useState<string[]>(() => delivery.runs.map((_, i) => base + "-" + i));
  const [added, setAdded] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);

  const change = (next: (prev: Delivery) => Delivery) => {
    setDirty(true);
    setValue(next);
  };

  const setRun = (index: number, patch: Partial<Delivery["runs"][number]>) =>
    change((prev) => ({
      ...prev,
      runs: prev.runs.map((run, i) => (i === index ? { ...run, ...patch } : run)),
    }));

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="key" value="delivery" />
      <input type="hidden" name="value" value={JSON.stringify(value)} />

      <div className="grid gap-4 border border-rule bg-paper px-5 py-5 md:grid-cols-3">
        <Labelled label="Order cutoff" hint="In words, as customers should read it. Shown across the top of every page.">
          <input
            className={inputClass}
            value={value.cutoff}
            maxLength={limits.name}
            onChange={(e) => change((p) => ({ ...p, cutoff: e.target.value }))}
          />
        </Labelled>
        <Labelled label="Bake day" hint="The day you bake. Shown on the delivery page.">
          <input
            className={inputClass}
            value={value.bakeDay}
            maxLength={limits.day}
            onChange={(e) => change((p) => ({ ...p, bakeDay: e.target.value }))}
          />
        </Labelled>
        <Labelled label="Drop-off spot" hint="Where people collect instead of a porch delivery.">
          <input
            className={inputClass}
            value={value.dropOff}
            maxLength={limits.name}
            onChange={(e) => change((p) => ({ ...p, dropOff: e.target.value }))}
          />
        </Labelled>
      </div>

      {value.runs.map((run, index) => (
        <fieldset
          key={keys[index] ?? index}
          className="dashed-frame grid gap-4 bg-paper px-5 py-5 md:grid-cols-[1.2fr_1fr_1fr_auto]"
        >
          <legend className="px-2 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            {run.area || "New run"}
          </legend>
          <Labelled label="Neighborhood" hint="Customers pick this at checkout.">
            <input
              className={inputClass}
              maxLength={limits.area}
              value={run.area}
              onChange={(e) => setRun(index, { area: e.target.value })}
            />
          </Labelled>
          <Labelled label="Day" hint="The weekday, in words.">
            <input
              className={inputClass}
              maxLength={limits.day}
              value={run.day}
              onChange={(e) => setRun(index, { day: e.target.value })}
            />
          </Labelled>
          <Labelled label="Next date" hint="Exactly as it should read on the page.">
            <input
              className={inputClass}
              maxLength={limits.date}
              value={run.nextDate}
              onChange={(e) => setRun(index, { nextDate: e.target.value })}
              placeholder="Tue Sep 8"
            />
          </Labelled>
          <RemoveRun
            area={run.area}
            onRemove={() => {
              change((p) => ({ ...p, runs: p.runs.filter((_, i) => i !== index) }));
              setKeys((k) => k.filter((_, i) => i !== index));
            }}
          />
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          change((p) => ({ ...p, runs: [...p.runs, { area: "", day: "", nextDate: "" }] }));
          setKeys((k) => [...k, base + "-new-" + added]);
          setAdded((n) => n + 1);
        }}
        className="stamp stamp-light w-fit"
      >
        Add a delivery day
      </button>

      <p className="font-ui text-[12px] leading-relaxed text-faint">
        The next date is what a customer picks at checkout and what shows on your run sheet, so move it
        forward each week.
      </p>

      <SaveBar state={state} label="Save delivery days" dirty={dirty} onSaved={settled} />
    </form>
  );
}

/**
 * Removing a delivery day asks first. Orders already booked onto it do not
 * disappear -- they show on Today under a heading of their own -- but she
 * should know she is about to move them.
 */
function RemoveRun({ area, onRemove }: { area: string; onRemove: () => void }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="self-end pb-3 font-ui text-[13px] text-brown underline underline-offset-4"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3 self-end pb-3 font-ui text-[13px]">
      <span className="font-semibold text-brown">Stop delivering to {area || "here"}?</span>
      <button type="button" onClick={onRemove} className="text-brown underline underline-offset-4">
        Yes
      </button>
      <button type="button" onClick={() => setAsking(false)} className="underline underline-offset-4">
        No
      </button>
    </span>
  );
}
