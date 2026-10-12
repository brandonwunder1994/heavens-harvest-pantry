"use client";

import { useActionState, useCallback, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, SaveBar, inputClass } from "@/components/owner/SaveBar";
import { CrossWheat } from "@/components/Sprite";
import type { Verse } from "@/lib/content";
import { limits } from "@/lib/shop-schema";

/**
 * This week's card, and the verses that carry the rest of the site. The card is
 * kept separate because it is the one she changes every week.
 */

const slots: { key: string; where: string }[] = [
  { key: "table", where: "The closing verse on the home and story pages" },
];

export function WeeklyVerseEditor({ verse }: { verse: Verse }) {
  const [value, setValue] = useState<Verse>(verse);
  const [archive, setArchive] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);

  const change = (patch: Partial<Verse>) => {
    setDirty(true);
    setValue((p) => ({ ...p, ...patch }));
  };

  const CARD_COMFORT = 220;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="key" value="verseOfTheWeek" />
      <input type="hidden" name="value" value={JSON.stringify({ ...value, archive })} />

      <div className="flex flex-col gap-4 border border-rule bg-paper px-5 py-5">
        <Labelled
          label="The verse"
          hint={
            value.text.length > CARD_COMFORT
              ? `That is ${value.text.length} letters, which will not fit a printed card. Under ${CARD_COMFORT} is comfortable.`
              : "Just the words. It goes on the card, the menu and the front page."
          }
        >
          <textarea
            className={`${inputClass} min-h-[110px]`}
            maxLength={limits.verse}
            value={value.text}
            onChange={(e) => change({ text: e.target.value })}
          />
        </Labelled>
        <Labelled label="Where it is from" hint="Printed under the words on the card.">
          <input
            className={inputClass}
            required
            maxLength={limits.reference}
            value={value.reference}
            onChange={(e) => change({ reference: e.target.value })}
            placeholder="Psalm 34 : 8"
          />
        </Labelled>

        <label className="flex items-start gap-2.5 font-ui text-[14px] leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#5b3d1e]"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
          />
          <span>
            Put the verse this replaces on the public verse wall.
            <span className="block text-[12px] text-muted">
              Untick if you are only fixing a typo. Once a verse is on the wall it stays there.
            </span>
          </span>
        </label>

        <SaveBar state={state} label="Make this week's verse" dirty={dirty} onSaved={settled} />
      </div>

      {/* What she is about to publish, drawn the way the customer will see it. */}
      <aside className="flex flex-col gap-2.5 self-start border border-moss-line bg-moss px-5 py-5">
        <div className="flex items-baseline justify-between">
          <span className="small-caps">How it will look</span>
          <CrossWheat size={26} color="#4f5a35" />
        </div>
        <p className="verse text-[21px] text-ink">&ldquo;{value.text || "â€¦"}&rdquo;</p>
        <div className="ref !text-[10px] text-sage-deep">{value.reference || "reference"}</div>
      </aside>
    </form>
  );
}

export function PageVersesEditor({ verses }: { verses: Record<string, Verse> }) {
  const [value, setValue] = useState<Record<string, Verse>>(verses);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);

  const set = (key: string, patch: Partial<Verse>) => {
    setDirty(true);
    setValue((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="key" value="verses" />
      <input type="hidden" name="value" value={JSON.stringify(value)} />

      {slots.map((slot) => (
        <fieldset key={slot.key} className="dashed-frame grid gap-4 bg-paper px-5 py-5 md:grid-cols-[2fr_1fr]">
          <legend className="px-2 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            {slot.where}
          </legend>
          <Labelled label="The verse">
            <textarea
              className={`${inputClass} min-h-[76px]`}
              maxLength={limits.verse}
              value={value[slot.key]?.text ?? ""}
              onChange={(e) => set(slot.key, { text: e.target.value })}
            />
          </Labelled>
          <Labelled label="Where it is from">
            <input
              className={inputClass}
              maxLength={limits.reference}
              value={value[slot.key]?.reference ?? ""}
              onChange={(e) => set(slot.key, { reference: e.target.value })}
            />
          </Labelled>
        </fieldset>
      ))}

      <SaveBar state={state} label="Save these verses" dirty={dirty} onSaved={settled} />
    </form>
  );
}
