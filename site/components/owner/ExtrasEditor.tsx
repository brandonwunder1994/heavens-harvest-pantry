"use client";

import { useActionState, useCallback, useState } from "react";
import { saveExtras } from "@/app/owner/extras-actions";
import { idle } from "@/lib/save-state";
import { SaveBar, inputClass } from "@/components/owner/SaveBar";
import { EXTRA_SIZES, type ExtraSize } from "@/lib/extras";

export type ExtraFlavorChoice = { slug: string; name: string; prices: Record<ExtraSize, number> };
type Row = { key: string; slug: string; sizeOz: ExtraSize; qty: number; price: string; claimed: number };

const sizeName = (s: number) => (s === 16 ? "1 lb" : `${s} oz`);
let counter = 0;

export function ExtrasEditor({ flavors, initial, open: wasOpen, note: wasNote, weekendLabel }: {
  flavors: ExtraFlavorChoice[];
  initial: { slug: string; sizeOz: ExtraSize; qty: number; price: number; claimed: number }[];
  open: boolean;
  note: string;
  weekendLabel: string;
}) {
  const [open, setOpen] = useState(wasOpen);
  const [note, setNote] = useState(wasNote);
  const [rows, setRows] = useState<Row[]>(() => initial.map(i => ({ key: `r${counter++}`, slug: i.slug, sizeOz: i.sizeOz, qty: i.qty, price: i.price.toFixed(2), claimed: i.claimed })));
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveExtras, idle);
  const settled = useCallback(() => setDirty(false), []);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };
  const update = (key: string, patch: Partial<Row>) => { setDirty(true); setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r))); };
  const nameOf = (slug: string) => flavors.find(f => f.slug === slug)?.name ?? slug;

  const payload = { open, note, items: rows.map(r => ({ slug: r.slug, sizeOz: r.sizeOz, qty: r.qty, price: Number(r.price) })) };

  function addRow() {
    const first = flavors[0];
    if (!first) return;
    const usedKeys = new Set(rows.map(r => `${r.slug}:${r.sizeOz}`));
    const free = flavors.flatMap(f => EXTRA_SIZES.map(s => ({ f, s }))).find(({ f, s }) => !usedKeys.has(`${f.slug}:${s}`)) ?? { f: first, s: 8 as ExtraSize };
    const regular = free.f.prices[free.s];
    setDirty(true);
    setRows(prev => [...prev, { key: `r${counter++}`, slug: free.f.slug, sizeOz: free.s, qty: 1, price: (Math.round(regular * 0.8 * 4) / 4).toFixed(2), claimed: 0 }]);
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="value" value={JSON.stringify(payload)} />

      <section className="owner-panel flex flex-col gap-4">
        <label className="flex min-h-11 items-center gap-3 text-[16px] font-semibold">
          <input type="checkbox" checked={open} onChange={e => touch(setOpen)(e.target.checked)} className="h-5 w-5 accent-[#5b3d1e]" />
          Show these extras on the website
        </label>
        <p className="owner-muted">For pickup {weekendLabel}. They close by themselves at the end of Saturday. Turn this off any time to hide them.</p>
        <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">A line for customers (optional)
          <input className={inputClass} maxLength={300} value={note} onChange={e => touch(setNote)(e.target.value)} placeholder="Just came out of the oven. Porch pickup tonight or tomorrow." />
        </label>
      </section>

      <section className="flex flex-col gap-3" aria-label="Extras list">
        {rows.length === 0 && <p className="owner-muted">Nothing here yet. Add what you have left over.</p>}
        {rows.map(r => {
          const left = Math.max(0, r.qty - r.claimed);
          const regular = flavors.find(f => f.slug === r.slug)?.prices[r.sizeOz];
          return (
            <div key={r.key} className="owner-panel grid gap-3 sm:grid-cols-[1.6fr_0.8fr_0.7fr_0.8fr_auto] sm:items-end">
              <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Flavor
                <select className={inputClass} value={r.slug} onChange={e => update(r.key, { slug: e.target.value })}>
                  {flavors.map(f => <option key={f.slug} value={f.slug}>{f.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Bag size
                <select className={inputClass} value={r.sizeOz} onChange={e => update(r.key, { sizeOz: Number(e.target.value) as ExtraSize })}>
                  {EXTRA_SIZES.map(s => <option key={s} value={s}>{sizeName(s)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Total to sell this weekend
                <input className={inputClass} type="number" min={0} max={500} step={1} inputMode="numeric" value={r.qty} onChange={e => update(r.key, { qty: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
              </label>
              <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Price each ($)
                <input className={inputClass} type="number" min={0.5} max={999} step="0.01" inputMode="decimal" value={r.price} onChange={e => update(r.key, { price: e.target.value })} />
                {regular ? <span className="font-normal">Regular {`$${regular.toFixed(2)}`}</span> : null}
              </label>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                <span className="font-ui text-[13px] tabular-nums text-sage-deep">{r.claimed} claimed · {left} left</span>
                <button type="button" className="owner-link min-h-11" onClick={() => { setDirty(true); setRows(prev => prev.filter(x => x.key !== r.key)); }}>Remove</button>
              </div>
              <p className="owner-muted text-[12px] sm:col-span-full">{nameOf(r.slug)}, {sizeName(r.sizeOz)}. The site subtracts what customers claim. Found a few more? Raise the total. At zero it shows sold out and points people to the next bake.</p>
            </div>
          );
        })}
        <button type="button" className="stamp stamp-light w-fit" onClick={addRow}>Add an extra</button>
      </section>

      <SaveBar state={state} label="Save extras" dirty={dirty} onSaved={settled} />
    </form>
  );
}
