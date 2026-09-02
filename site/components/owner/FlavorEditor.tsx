"use client";

import { useActionState, useCallback, useId, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, PriceInput, SaveBar, inputClass } from "@/components/owner/SaveBar";
import type { Flavor } from "@/lib/content";
import { limits } from "@/lib/shop-schema";

/**
 * Her flavor list, exactly as the shop reads it. Prices are dollars, because
 * that is what she thinks in; the site turns them into cents at the till.
 */

/**
 * A row on screen. Prices are held as text so she can clear a box and retype it
 * without it snapping to zero under her fingers, and `id` is stable so removing
 * a row in the middle does not drop her cursor into somebody else's flavor.
 */
type Row = Omit<Flavor, "bagPrice" | "jarPrice"> & {
  id: string;
  bagPrice: string;
  jarPrice: string;
};

const toRow = (flavor: Flavor, id: string): Row => ({
  ...flavor,
  id,
  bagPrice: String(flavor.bagPrice),
  jarPrice: String(flavor.jarPrice),
});

const blank = (id: string): Row => ({
  id,
  slug: "",
  name: "",
  blurb: "",
  ingredients: "",
  allergens: "",
  bagPrice: "9",
  jarPrice: "12",
  soldOut: false,
  backOn: "",
});

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function FlavorEditor({ flavors }: { flavors: Flavor[] }) {
  const base = useId();
  const [rows, setRows] = useState<Row[]>(() => flavors.map((f, i) => toRow(f, base + "-" + i)));
  const [added, setAdded] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);

  const update = (index: number, patch: Partial<Row>) => {
    setDirty(true);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  // A brand new flavor gets its web address from its name. An existing one
  // keeps the address it has, so a link someone saved does not break.
  const rename = (index: number, name: string) =>
    update(index, { name, slug: rows[index].slug || slugify(name) });

  // `id` is only for React's benefit on screen, so it is left behind here.
  const payload = rows.map((row) => ({
    slug: row.slug.trim() || slugify(row.name),
    name: row.name,
    blurb: row.blurb,
    ingredients: row.ingredients,
    allergens: row.allergens,
    soldOut: row.soldOut,
    // Sent exactly as typed, never coerced: an empty price box has to reach the
    // server as empty so it can be refused by name, rather than quietly
    // becoming free granola.
    bagPrice: row.bagPrice.trim() === "" ? "" : Number(row.bagPrice),
    jarPrice: row.jarPrice.trim() === "" ? "" : Number(row.jarPrice),
    backOn: row.soldOut ? row.backOn : "",
  }));

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="key" value="flavors" />
      <input type="hidden" name="value" value={JSON.stringify(payload)} />

      {rows.map((row, index) => (
        <fieldset key={row.id} className="dashed-frame flex flex-col gap-4 bg-paper px-5 py-5">
          <legend className="px-2 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            {row.name || "New flavor"}
          </legend>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <Labelled label="Name" hint="What it is called on the menu.">
              <input
                className={inputClass}
                maxLength={limits.name}
                value={row.name}
                onChange={(e) => rename(index, e.target.value)}
                placeholder="Honey Almond Crunch"
              />
            </Labelled>
            <Labelled label="Bag price" hint="Cents are fine, like 9.75.">
              <PriceInput value={row.bagPrice} onChange={(v) => update(index, { bagPrice: v })} />
            </Labelled>
            <Labelled label="Jar price" hint="Cents are fine, like 12.50.">
              <PriceInput value={row.jarPrice} onChange={(v) => update(index, { jarPrice: v })} />
            </Labelled>
          </div>

          <Labelled label="One line about it" hint="This is what people read on the menu.">
            <input
              className={inputClass}
              maxLength={limits.blurb}
              value={row.blurb}
              onChange={(e) => update(index, { blurb: e.target.value })}
              placeholder="Local honey, toasted almonds, a little sea salt."
            />
          </Labelled>

          <div className="grid gap-4 md:grid-cols-2">
            <Labelled label="Ingredients" hint="In order, most first. Arizona requires this on the label.">
              <textarea
                className={`${inputClass} min-h-[76px]`}
                value={row.ingredients}
                onChange={(e) => update(index, { ingredients: e.target.value })}
              />
            </Labelled>
            <Labelled label="Allergens" hint="Say what is in the kitchen as well as what is in the jar.">
              <textarea
                className={`${inputClass} min-h-[76px]`}
                value={row.allergens}
                onChange={(e) => update(index, { allergens: e.target.value })}
              />
            </Labelled>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <label className="flex items-center gap-2.5 font-ui text-[14px]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#5b3d1e]"
                checked={Boolean(row.soldOut)}
                onChange={(e) => update(index, { soldOut: e.target.checked })}
              />
              Sold out
            </label>

            {row.soldOut ? (
              <Labelled label="Back on">
                <input
                  className={inputClass}
                  maxLength={limits.day}
                  value={row.backOn ?? ""}
                  onChange={(e) => update(index, { backOn: e.target.value })}
                  placeholder="Friday"
                />
              </Labelled>
            ) : null}

            <RemoveFlavor
              name={row.name}
              onRemove={() => {
                setDirty(true);
                setRows((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          setDirty(true);
          setRows((prev) => [...prev, blank(base + "-new-" + added)]);
          setAdded((n) => n + 1);
        }}
        className="stamp stamp-light w-fit"
      >
        Add a flavor
      </button>

      <p className="font-ui text-[12px] leading-relaxed text-faint">
        Taking a flavor off for a week? Tick sold out rather than removing it, so the page it lives on
        keeps working and anyone who bookmarked it still lands somewhere.
      </p>

      <SaveBar state={state} label="Save the menu" dirty={dirty} onSaved={settled} />
    </form>
  );
}

/** Removing a flavor asks first, because there is no way to get it back. */
function RemoveFlavor({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="ml-auto font-ui text-[13px] text-brown underline underline-offset-4 hover:text-brown-deep"
      >
        Remove this flavor
      </button>
    );
  }

  return (
    <span className="ml-auto flex flex-wrap items-center gap-3 font-ui text-[13px]">
      <span className="font-semibold text-brown">Remove {name || "this flavor"}?</span>
      <button type="button" onClick={onRemove} className="text-brown underline underline-offset-4">
        Yes, remove
      </button>
      <button type="button" onClick={() => setAsking(false)} className="underline underline-offset-4">
        Keep it
      </button>
    </span>
  );
}
