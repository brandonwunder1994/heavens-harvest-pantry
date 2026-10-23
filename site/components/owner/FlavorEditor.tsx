"use client";

import { useActionState, useCallback, useId, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, PriceInput, SaveBar, inputClass } from "@/components/owner/SaveBar";
import { FlavorMarkPicker } from "@/components/owner/FlavorMarks";
import type { Flavor } from "@/lib/content";
import { flavorMarksFor, sanitizeFlavorMarks, type FlavorMarkId } from "@/lib/flavor-marks";
import { OMISSIONS, omissionLabel } from "@/lib/products";
import { limits } from "@/lib/shop-schema";

type Row = Omit<Flavor, "bagPrice" | "jarPrice" | "samplerPrice" | "sizePrices" | "icons"> & { id: string; prices: Record<3 | 8 | 16, string>; icons: FlavorMarkId[] };
const toRow = (f: Flavor): Row => ({ ...f, id: f.slug, prices: { 3: String(f.sizePrices?.[3] ?? f.samplerPrice ?? 5), 8: String(f.sizePrices?.[8] ?? (f.category === "almonds" ? 12 : 10)), 16: String(f.sizePrices?.[16] ?? f.bagPrice) }, icons: sanitizeFlavorMarks(f.icons) });
export function FlavorEditor({ flavors }: { flavors: Flavor[] }) {
  const base = useId();
  const [rows, setRows] = useState<Row[]>(() => flavors.map(toRow));
  const [added, setAdded] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);
  function update(id: string, patch: Partial<Row>) { setDirty(true); setRows(prev => prev.map(row => row.id === id ? { ...row, ...patch } : row)); }
  const payload = rows.map(row => ({ slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: row.name, blurb: row.blurb, ingredients: row.ingredients, allergens: row.allergens, sizePrices: Object.fromEntries(Object.entries(row.prices).map(([size, price]) => [size, price.trim() === "" ? "" : Number(price)])), icons: row.icons, allowedOmissions: row.allowedOmissions ?? [], requiresCooling: row.requiresCooling ?? false, category: row.category ?? "granola", soldOut: !!row.soldOut, backOn: row.soldOut ? row.backOn : "" }));
  return <form action={action} className="flex flex-col gap-4">
    <input type="hidden" name="key" value="flavors" /><input type="hidden" name="value" value={JSON.stringify(payload)} />
    <p className="owner-muted">Prices are before tax. Change the sizes or availability here; open Edit for recipes and label artwork.</p>
    <div>{rows.map(row => <section key={row.id} className="owner-product" aria-label={row.name || "New product"}>
      <div className="owner-product-row">
        <div className="owner-product-name"><h2 className="font-semibold text-[15px]">{row.name || "New product"}</h2><p className="owner-muted mt-1 text-[12px]">{row.category === "almonds" ? "Candied nuts" : "Granola"}{row.requiresCooling ? " · Refrigerated pickup" : ""}</p></div>
        {([3, 8, 16] as const).map(size => <Labelled key={size} label={size === 16 ? "1 lb" : `${size} oz`}><PriceInput value={row.prices[size]} onChange={price => update(row.id, { prices: { ...row.prices, [size]: price } })} /></Labelled>)}
        <label className="owner-product-availability flex min-h-11 items-center gap-2"><input type="checkbox" checked={!row.soldOut} onChange={e => update(row.id, { soldOut: !e.target.checked })} className="h-4 w-4 accent-[#5b3d1e]" />Available</label>
        <button type="button" aria-expanded={editing === row.id} aria-controls={`product-${row.id}`} className="owner-link min-h-11" onClick={() => setEditing(editing === row.id ? null : row.id)}>{editing === row.id ? "Close" : "Edit"}</button>
      </div>
      {!state.ok && row.name && state.message.startsWith(row.name) && <p role="alert" className="mt-3 text-brown">{state.message}</p>}
      {row.soldOut && <div className="mt-3 max-w-[300px]"><Labelled label="Back on · optional"><input className={inputClass} value={row.backOn ?? ""} maxLength={limits.day} onChange={e => update(row.id, { backOn: e.target.value })} placeholder="Friday" /></Labelled></div>}
      {editing === row.id && <div id={`product-${row.id}`} className="owner-product-detail">
        <div className="grid gap-4 sm:grid-cols-2"><Labelled label="Product name"><input required className={inputClass} value={row.name} maxLength={limits.name} onChange={e => update(row.id, { name: e.target.value })} /></Labelled><Labelled label="Category"><select className={inputClass} value={row.category ?? "granola"} onChange={e => update(row.id, { category: e.target.value === "almonds" ? "almonds" : "granola" })}><option value="granola">Granola</option><option value="almonds">Candied nuts</option></select></Labelled></div>
        <Labelled label="Menu description"><input className={inputClass} value={row.blurb} maxLength={limits.blurb} onChange={e => update(row.id, { blurb: e.target.value })} /></Labelled>
        <div className="grid gap-4 sm:grid-cols-2"><Labelled label="Ingredients"><textarea className={inputClass} value={row.ingredients} maxLength={limits.prose} onChange={e => update(row.id, { ingredients: e.target.value })} /></Labelled><Labelled label="Allergens" hint="Include ingredients and any kitchen cross-contact notes."><textarea className={inputClass} value={row.allergens} maxLength={limits.prose} onChange={e => update(row.id, { allergens: e.target.value })} /></Labelled></div>
        <fieldset><legend className="mb-2 font-semibold">Permitted recipe omissions</legend><div className="flex flex-wrap gap-4">{OMISSIONS.map(o => <label key={o} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={row.allowedOmissions?.includes(o) ?? false} onChange={e => update(row.id, { allowedOmissions: e.target.checked ? [...(row.allowedOmissions ?? []), o] : (row.allowedOmissions ?? []).filter(v => v !== o) })} />{omissionLabel[o]}</label>)}</div></fieldset>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!row.requiresCooling} onChange={e => update(row.id, { requiresCooling: e.target.checked })} />Keep pickup orders in the porch fridge</label>
        <div><h3 className="mb-2 font-semibold">Pictures on the label</h3><p className="owner-muted mb-3 text-[12px]">Choose up to three, or leave empty to choose from the product name.</p><FlavorMarkPicker selected={row.icons} preview={flavorMarksFor({ name: row.name })} onChange={icons => update(row.id, { icons })} /></div>
        <div className="border-t border-rule pt-4">{removing === row.id ? <div className="flex flex-wrap items-center gap-4"><p>Remove {row.name || "this product"} from the menu? Paid orders stay intact.</p><button type="button" className="owner-link min-h-11" onClick={() => { setRows(prev => prev.filter(r => r.id !== row.id)); setDirty(true); setEditing(null); setRemoving(null); }}>Yes, remove</button><button type="button" className="owner-link min-h-11" onClick={() => setRemoving(null)}>Keep product</button></div> : <button type="button" className="owner-link min-h-11" onClick={() => setRemoving(row.id)}>Remove product</button>}</div>
      </div>}
    </section>)}</div>
    <div className="flex flex-wrap items-center gap-4"><button type="button" className="stamp stamp-light" onClick={() => { const id = `${base}-new-${added}`; setRows(prev => [...prev, { id, slug: "", name: "", blurb: "", ingredients: "", allergens: "", prices: { 3: "5", 8: "10", 16: "16" }, icons: [], soldOut: false, category: "granola", allowedOmissions: [], requiresCooling: false }]); setAdded(n => n + 1); setEditing(id); setDirty(true); }}>Add product</button><p className="owner-muted text-[12px]">Taking a week off? Clear Available to mark a product sold out.</p></div>
    <SaveBar state={state} label="Save products & prices" dirty={dirty} onSaved={settled} />
  </form>;
}
