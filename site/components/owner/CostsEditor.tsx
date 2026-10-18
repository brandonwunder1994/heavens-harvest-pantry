"use client";

import { useActionState, useCallback, useState } from "react";
import { saveCosts } from "@/app/owner/costs-actions";
import { idle } from "@/lib/save-state";
import { SaveBar, inputClass } from "@/components/owner/SaveBar";
import {
  SIZE_KEYS, bagCost, bagMargin, batchCost, costPerOz, dollars, packagingCost, unitCost,
  type Costs, type Ingredient, type RecipeLine, type SizeKey, type Unit,
} from "@/lib/costs";

export type CostFlavor = { slug: string; name: string; prices: Record<SizeKey, number> };

const sizeName = (k: SizeKey) => (k === "16" ? "1 lb" : `${k} oz`);
const unitName: Record<Unit, string> = { oz: "ounces", lb: "pounds", each: "pieces (each)" };
const perName = (u: Unit) => (u === "each" ? "each" : "per oz");
let counter = 0;
const newId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`;

export function CostsEditor({ initial, flavors }: { initial: Costs; flavors: CostFlavor[] }) {
  const [costs, setCosts] = useState<Costs>(initial);
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveCosts, idle);
  const settled = useCallback(() => setDirty(false), []);
  const change = (next: Costs) => { setDirty(true); setCosts(next); };

  const setIngredient = (id: string, patch: Partial<Ingredient>) => change({ ...costs, ingredients: costs.ingredients.map(i => (i.id === id ? { ...i, ...patch } : i)) });
  const removeIngredient = (id: string) => {
    const strip = (lines: RecipeLine[]) => lines.filter(l => l.ingredientId !== id);
    change({
      ...costs,
      ingredients: costs.ingredients.filter(i => i.id !== id),
      recipes: Object.fromEntries(Object.entries(costs.recipes).map(([slug, r]) => [slug, { ...r, lines: strip(r.lines) }])),
      packaging: { "3": strip(costs.packaging["3"]), "8": strip(costs.packaging["8"]), "16": strip(costs.packaging["16"]) },
    });
  };
  const recipeOf = (slug: string) => costs.recipes[slug] ?? { yieldOz: 0, lines: [] };
  const setRecipe = (slug: string, patch: Partial<{ yieldOz: number; lines: RecipeLine[] }>) => change({ ...costs, recipes: { ...costs.recipes, [slug]: { ...recipeOf(slug), ...patch } } });
  const setPack = (size: SizeKey, lines: RecipeLine[]) => change({ ...costs, packaging: { ...costs.packaging, [size]: lines } });
  const ingredient = (id: string) => costs.ingredients.find(i => i.id === id);
  const unitFor = (id: string): Unit | undefined => ingredient(id)?.unit;

  const lineEditor = (lines: RecipeLine[], onChange: (lines: RecipeLine[]) => void, only?: (i: Ingredient) => boolean) => {
    const choices = costs.ingredients.filter(i => (only ? only(i) : true));
    return (
      <div className="flex flex-col gap-2">
        {lines.map((line, n) => {
          const unit = unitFor(line.ingredientId);
          return (
            <div key={n} className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
              <select className={inputClass} aria-label="Ingredient" value={line.ingredientId} onChange={e => onChange(lines.map((l, m) => (m === n ? { ...l, ingredientId: e.target.value } : l)))}>
                {choices.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input className={inputClass} aria-label="Amount" type="number" min={0} step="any" inputMode="decimal" value={line.amount || ""} onChange={e => onChange(lines.map((l, m) => (m === n ? { ...l, amount: Number(e.target.value) } : l)))} />
                <span className="font-ui text-[12px] text-muted">{unit === "each" ? "pc" : "oz"}</span>
              </div>
              <button type="button" className="owner-link min-h-11" onClick={() => onChange(lines.filter((_, m) => m !== n))}>Remove</button>
            </div>
          );
        })}
        <button
          type="button"
          className="owner-link min-h-11 w-fit"
          disabled={!choices.length}
          onClick={() => { const used = new Set(lines.map(l => l.ingredientId)); const pick = choices.find(i => !used.has(i.id)) ?? choices[0]; if (pick) onChange([...lines, { ingredientId: pick.id, amount: 0 }]); }}
        >
          + Add a line
        </button>
        {!choices.length && <p className="owner-muted text-[12px]">Add what you buy first (the box above), then pick from it here.</p>}
      </div>
    );
  };

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="value" value={JSON.stringify(costs)} />

      <section className="owner-panel flex flex-col gap-4" aria-labelledby="buy-title">
        <div>
          <h2 id="buy-title" className="owner-section-title">1. What I buy</h2>
          <p className="owner-muted mt-1">Every ingredient, plus bags and stickers. Say how much comes in a pack and what you pay. Example: cashews, pounds, 2, $18.</p>
        </div>
        {costs.ingredients.length === 0 && <p className="owner-muted">Nothing here yet.</p>}
        {costs.ingredients.map(i => (
          <div key={i.id} className="grid gap-2 border-t border-rule pt-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Name<input className={inputClass} value={i.name} maxLength={80} onChange={e => setIngredient(i.id, { name: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Sold by<select className={inputClass} value={i.unit} onChange={e => setIngredient(i.id, { unit: e.target.value as Unit })}>{(Object.keys(unitName) as Unit[]).map(u => <option key={u} value={u}>{unitName[u]}</option>)}</select></label>
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">In a pack<input className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={i.packQty || ""} onChange={e => setIngredient(i.id, { packQty: Number(e.target.value) })} /></label>
            <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Pack price ($)<input className={inputClass} type="number" min={0} step="0.01" inputMode="decimal" value={i.packPrice || ""} onChange={e => setIngredient(i.id, { packPrice: Number(e.target.value) })} /></label>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-0">
              <span className="font-ui text-[13px] tabular-nums text-sage-deep">{unitCost(i) > 0 ? `${dollars(unitCost(i))} ${perName(i.unit)}` : "—"}</span>
              <button type="button" className="owner-link min-h-11" onClick={() => removeIngredient(i.id)}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="stamp stamp-light w-fit" onClick={() => change({ ...costs, ingredients: [...costs.ingredients, { id: newId(), name: "", unit: "lb", packQty: 0, packPrice: 0 }] })}>Add something I buy</button>
      </section>

      <section className="owner-panel flex flex-col gap-4" aria-labelledby="pack-title">
        <div>
          <h2 id="pack-title" className="owner-section-title">2. What goes with every bag</h2>
          <p className="owner-muted mt-1">The bag itself, the sticker, anything else that goes out with one bag of each size. Set these up as &ldquo;pieces (each)&rdquo; above.</p>
        </div>
        {SIZE_KEYS.map(size => (
          <div key={size} className="border-t border-rule pt-3">
            <h3 className="mb-2 font-semibold">{sizeName(size)} bag <span className="owner-muted font-normal">· {dollars(packagingCost(costs, Number(size)))} each</span></h3>
            {lineEditor(costs.packaging[size], lines => setPack(size, lines), i => i.unit === "each")}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="rec-title">
        <div>
          <h2 id="rec-title" className="owner-section-title">3. My batch recipes</h2>
          <p className="owner-muted mt-1">For each flavor: what goes into one batch, and how many ounces of granola it makes. The profit shows right under it.</p>
        </div>
        {flavors.map(f => {
          const r = recipeOf(f.slug);
          const perOz = costPerOz(costs, f.slug);
          return (
            <article key={f.slug} className="owner-panel flex flex-col gap-4" aria-label={f.name}>
              <h3 className="font-semibold text-[16px]">{f.name}</h3>
              <label className="flex max-w-[260px] flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">This batch makes (ounces)
                <input className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={r.yieldOz || ""} onChange={e => setRecipe(f.slug, { yieldOz: Number(e.target.value) })} placeholder="e.g. 96" />
              </label>
              {lineEditor(r.lines, lines => setRecipe(f.slug, { lines }))}
              <div className="overflow-x-auto">
                <table className="owner-table">
                  <thead><tr><th>Size</th><th>Price</th><th>Ingredients</th><th>Bag + sticker</th><th>Card fee</th><th>You keep</th></tr></thead>
                  <tbody>
                    {SIZE_KEYS.map(size => {
                      const c = bagCost(costs, f.slug, Number(size));
                      const m = bagMargin(costs, f.slug, Number(size), f.prices[size]);
                      return (
                        <tr key={size}>
                          <td>{sizeName(size)}</td>
                          <td className="tabular-nums">{dollars(f.prices[size])}</td>
                          <td className="tabular-nums">{c ? dollars(c.ingredients) : "—"}</td>
                          <td className="tabular-nums">{c ? dollars(c.packaging) : "—"}</td>
                          <td className="tabular-nums">{m ? dollars(f.prices[size] * (costs.feePercent / 100)) : "—"}</td>
                          <td className="tabular-nums font-semibold">{m ? `${dollars(m.profit)} (${Math.round(m.marginPct)}%)` : "Fill in the recipe"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="owner-muted text-[12px]">{perOz === null ? "Add the yield and at least one ingredient to see the cost." : `One batch costs ${dollars(batchCost(costs, f.slug))} in ingredients, or ${dollars(perOz)} per ounce.`}</p>
            </article>
          );
        })}
      </section>

      <section className="owner-panel flex flex-col gap-3" aria-labelledby="fee-title">
        <h2 id="fee-title" className="owner-section-title">4. Card fees</h2>
        <p className="owner-muted">Stripe takes a small cut of each order. The usual is 2.9% plus 30 cents; change it if yours is different.</p>
        <div className="grid max-w-[420px] gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Percent of the order<input className={inputClass} type="number" min={0} max={20} step="0.1" value={costs.feePercent} onChange={e => change({ ...costs, feePercent: Number(e.target.value) })} /></label>
          <label className="flex flex-col gap-1.5 font-ui text-[12px] font-semibold text-muted">Plus per order ($)<input className={inputClass} type="number" min={0} max={5} step="0.01" value={costs.feeFixed} onChange={e => change({ ...costs, feeFixed: Number(e.target.value) })} /></label>
        </div>
      </section>

      <SaveBar state={state} label="Save my costs" dirty={dirty} onSaved={settled} />
    </form>
  );
}
