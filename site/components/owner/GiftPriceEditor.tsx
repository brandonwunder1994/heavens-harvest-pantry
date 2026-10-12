"use client";
import { useActionState, useCallback, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, PriceInput, SaveBar } from "@/components/owner/SaveBar";
export function GiftPriceEditor({ price }: { price: number }) {
  const [value, setValue] = useState(String(price));
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);
  return <form action={action} className="flex max-w-[620px] flex-col gap-4"><h2 className="owner-section-title">Blessing gifts</h2><p className="owner-muted">This amount is added to the chosen granola or candied almond size. It includes the jar and anonymous Friday delivery in Vistancia.</p><input type="hidden" name="key" value="blessingBag" /><input type="hidden" name="value" value={JSON.stringify({ price: value.trim() ? Number(value) : "", blurb: "Gift jar and anonymous Friday delivery in Vistancia." })} /><div className="max-w-[240px]"><Labelled label="Gift surcharge · before tax"><PriceInput value={value} onChange={v => { setValue(v); setDirty(true); }} /></Labelled></div><SaveBar state={state} label="Save gift surcharge" dirty={dirty} onSaved={settled} /></form>;
}
