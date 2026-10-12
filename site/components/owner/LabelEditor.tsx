"use client";

import { useActionState, useCallback, useId, useRef, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { LabelPreview } from "@/components/owner/LabelPreview";
import { Labelled, SaveBar, inputClass } from "@/components/owner/SaveBar";
import type { Flavor, LabelSettings, LabelSize } from "@/lib/content";
import { flavorMarksFor } from "@/lib/flavor-marks";
import {
  LABEL_HEIGHT_PX,
  LABEL_WIDTH_PX,
  pngFilename,
  templateFor,
  todayIso,
  trackerFrom,
  upsertTemplate,
  mmdd,
} from "@/lib/label";
import { idle } from "@/lib/save-state";
import { limits } from "@/lib/shop-schema";
import { SIZES, netWeight as purchasedWeight, ingredientsWithout, omissionLabel, type SizeOz, type Omission } from "@/lib/products";
import type { OrderItem } from "@/lib/orders";

export type LabelOrderOption = {
  id: string;
  name: string;
  runDate: string;
  items: OrderItem[];
};

export function LabelEditor({
  flavors,
  settings,
  orders,
  initialOrderId,
  initialItemIndex = 0,
}: {
  flavors: Flavor[];
  settings: LabelSettings;
  orders: LabelOrderOption[];
  initialOrderId?: string;
  initialItemIndex?: number;
}) {
  const initialOrder = orders.find(o => o.id === initialOrderId);
  const initialItem = initialOrder?.items[initialItemIndex];
  const first = (initialItem ? flavors.find(f => f.slug === initialItem.slug) : null) ?? flavors[0];
  const opening = first ? templateFor(settings, first) : null;

  const [slug, setSlug] = useState(opening?.flavorSlug ?? "");
  const [title, setTitle] = useState(initialItem?.name ?? opening?.title ?? "");
  const [ingredients, setIngredients] = useState(initialItem?.ingredients ?? opening?.ingredients ?? "");
  const [allergens, setAllergens] = useState(initialItem?.allergens ?? opening?.allergens ?? "");
  const [scriptureText, setScriptureText] = useState(opening?.scripture.text ?? settings.scripture.text);
  const [scriptureRef, setScriptureRef] = useState(opening?.scripture.reference ?? settings.scripture.reference);
  const [size, setSize] = useState<LabelSize>(initialItem ? initialItem.gift ? "jar" : "bag" : opening?.size ?? "bag");
  const [sizeOz, setSizeOz] = useState<SizeOz>(initialItem?.sizeOz ?? 16);
  const [omissions,setOmissions]=useState<Omission[]>(initialItem?.omissions ?? []);
  const [netWeight, setNetWeight] = useState(purchasedWeight(initialItem?.sizeOz ?? 16));
  const [producedDate, setProducedDate] = useState(todayIso);
  const [tracker, setTracker] = useState(initialItem ? trackerFrom(initialItem.gift?.recipientName ?? initialOrder!.name, initialItem.name, todayIso()) : "");
  const [orderId, setOrderId] = useState(initialItem ? `${initialOrder!.id}::${initialItemIndex}` : "");
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(saveBlock, idle);
  const settled = useCallback(() => setDirty(false), []);
  const printRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const scripture = { text: scriptureText, reference: scriptureRef };

  const payload = first
    ? upsertTemplate(settings, {
        flavorSlug: slug || first.slug,
        title,
        ingredients,
        allergens,
        scripture,
        netWeight,
        size,
      })
    : settings;

  const touch = () => setDirty(true);

  const loadFlavor = (nextSlug: string) => {
    const flavor = flavors.find((row) => row.slug === nextSlug);
    if (!flavor) return;
    const saved = templateFor(settings, flavor);
    setSlug(flavor.slug);
    setTitle(saved.title);
    setIngredients(saved.ingredients);
    setAllergens(saved.allergens);
    setScriptureText(saved.scripture.text);
    setScriptureRef(saved.scripture.reference);
    setSize(saved.size);
    setNetWeight(purchasedWeight(sizeOz));
    setOmissions([]);
  };

  const chooseSize = (next: SizeOz) => {
    touch();
    setSizeOz(next);
    setNetWeight(purchasedWeight(next));
  };

  const chooseOrder = (id: string) => {
    setOrderId(id);
    if (!id) return;
    const [parentId,index]=id.split("::");
    const order = orders.find((row) => row.id === parentId);
    if (!order) return;
    const only = order.items[Number(index)||0];
    const matched = only ? flavors.find((row) => row.slug===only.slug || row.name.replace(/\s*[·-]?\s*(?:1 lb|16 oz).*$/i,"") === only.name.replace(/\s*[·-]?\s*(?:1 lb|16 oz).*$/i,"")) : undefined;
    if (matched && only) {
      loadFlavor(matched.slug);
      setSize(only.gift?"jar":"bag");
      setSizeOz(only.sizeOz??(only.format==="sampler"?3:16));
      setNetWeight(purchasedWeight(only.sizeOz??(only.format==="sampler"?3:16)));
      setOmissions(only.omissions??[]);
      setTitle(only.name);
      setIngredients(only.ingredients??ingredientsWithout(matched.ingredients,only.omissions));
      setAllergens(only.allergens??matched.allergens);
      setTracker(trackerFrom(only.gift?.recipientName??order.name, matched.name, producedDate));
      touch();
      return;
    }
    setTracker(trackerFrom(order.name, title, producedDate));
    touch();
  };

  const changeDate = (iso: string) => {
    touch();
    const previous = mmdd(producedDate);
    const next = mmdd(iso);
    setProducedDate(iso);
    if (previous && next && tracker.endsWith(previous)) {
      setTracker(tracker.slice(0, -previous.length) + next);
    }
  };

  const downloadPng = async () => {
    const node = printRef.current;
    if (!node) return;
    setDownloading(true);
    setDownloadMessage("");
    try {
      await document.fonts.ready;
      await Promise.all(
        [...node.querySelectorAll("img")].map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => reject(new Error("qr")), { once: true });
          });
        }),
      );
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        width: LABEL_WIDTH_PX,
        height: LABEL_HEIGHT_PX,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = pngFilename(slug, producedDate, tracker);
      link.click();
      setDownloadMessage("Saved to your downloads. Open it in the Katasymbol app and print.");
    } catch (error) {
      console.error("[labels] png failed", error);
      setDownloadMessage("The picture could not be made. Try again in a moment.");
    } finally {
      setDownloading(false);
    }
  };

  if (!first) {
    return (
      <p className="border-2 border-brown bg-[#fdf6ea] px-5 py-4 font-ui text-[14px] leading-relaxed text-brown">
        There are no flavors on the menu yet, so there is nothing to put on a label. Add one under Flavors
        &amp; prices first.
      </p>
    );
  }

  const flavor = flavors.find((row) => row.slug === slug);
  const previewMarks = flavorMarksFor(
    {
      icons: flavor?.icons,
      name: title,
      addIns: flavor?.addIns,
    },
    title,
  );

  const preview = (
    <LabelPreview
      title={title}
      ingredients={ingredients}
      allergens={allergens}
      scripture={scripture}
      netWeight={netWeight}
      producedDate={producedDate}
      tracker={tracker}
      tone="preview"
      marks={previewMarks}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <aside className="flex flex-col items-center gap-3">
        <div className="owner-label-preview">
          <div className="owner-label-preview-stage">
            {preview}
          </div>
        </div>
        <p className="max-w-[640px] text-center font-ui text-[12px] leading-relaxed text-muted">
          Landscape, 80 mm × 50 mm at 203 DPI — brand up top, the flavor a little
          below it, then the pictures of what it is. The download is black on white
          for the thermal printer.
        </p>
      </aside>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="key" value="labelTemplates" />
        <input type="hidden" name="value" value={JSON.stringify(payload)} />

        <fieldset className="dashed-frame flex flex-col gap-4 bg-paper px-5 py-5">
          <legend className="px-2 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            This bake
          </legend>

          <Labelled label="Flavor" hint="Choosing a flavor fills the ingredients and allergens. You can still edit them.">
            <select
              className={inputClass}
              value={slug}
              onChange={(event) => {
                touch();
                loadFlavor(event.target.value);
              }}
            >
              {flavors.map((flavor) => (
                <option key={flavor.slug} value={flavor.slug}>
                  {flavor.name}
                </option>
              ))}
            </select>
          </Labelled>

          <Labelled label="Granola name" hint="The large title on the label.">
            <input
              className={inputClass}
              maxLength={limits.name}
              value={title}
              onChange={(event) => {
                touch();
                setTitle(event.target.value);
              }}
            />
          </Labelled>

          <div>
            <span className="font-ui text-[12px] font-semibold text-muted">Purchased net weight · bags and gift jars</span>
            <div className="mt-1.5 flex gap-2">
              {SIZES.map(oz=><SizeButton key={oz} current={sizeOz} value={oz} onChoose={chooseSize}>{oz} oz</SizeButton>)}
            </div>
          </div>
          {!!flavor?.allowedOmissions?.length&&<fieldset><legend className="font-ui text-[12px] font-semibold">Recipe choices</legend>{flavor.allowedOmissions.map(o=><label key={o} className="mt-2 flex items-center gap-2 font-ui text-[13px]"><input type="checkbox" checked={omissions.includes(o)} onChange={e=>{const next=e.target.checked?[...omissions,o]:omissions.filter(v=>v!==o);setOmissions(next);setIngredients(ingredientsWithout(flavor.ingredients,next));setAllergens(flavor.allergens);touch();}}/>{omissionLabel[o]}</label>)}<p className="mt-2 font-ui text-[12px] text-muted">Coconut oil and allergen notes stay included.</p></fieldset>}

          {orders.length > 0 ? (
            <Labelled
              label="Whose order this is"
              hint="Choose the exact item. Gift labels use the recipient’s name, keeping the giver private."
            >
              <select className={inputClass} value={orderId} onChange={(event) => chooseOrder(event.target.value)}>
                <option value="">Type a code yourself</option>
                {orders.flatMap(order=>order.items.map((item,index)=><option key={`${order.id}::${index}`} value={`${order.id}::${index}`}>{item.gift?.recipientName??order.name} · {item.qty}× {item.name} · {item.sizeOz??(item.format==="sampler"?3:16)} oz{item.omissions?.length?` · ${item.omissions.map(o=>omissionLabel[o]).join(", ")}`:""}</option>))}
              </select>
            </Labelled>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Produced date" hint="Printed as Packed, with the day you baked.">
              <input
                className={inputClass}
                type="date"
                value={producedDate}
                onChange={(event) => changeDate(event.target.value)}
              />
            </Labelled>
            <Labelled
              label="Tracker code"
              hint="A short code so you know which order this bag belongs to. Not the Stripe number."
            >
              <input
                className={inputClass}
                maxLength={limits.tracker}
                value={tracker}
                onChange={(event) => {
                  touch();
                  setOrderId("");
                  setTracker(event.target.value.toUpperCase());
                }}
                placeholder="JANE-HA-0912"
              />
            </Labelled>
          </div>
        </fieldset>

        <fieldset className="dashed-frame flex flex-col gap-4 bg-paper px-5 py-5">
          <legend className="px-2 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            What is printed
          </legend>

          <Labelled label="Ingredients" hint="Most first, the way Arizona wants it on the label.">
            <textarea
              className={`${inputClass} min-h-[88px]`}
              maxLength={limits.prose}
              value={ingredients}
              onChange={(event) => {
                touch();
                setIngredients(event.target.value);
              }}
            />
          </Labelled>

          <Labelled label="Allergens" hint="What is in this batch, and what else the kitchen handles.">
            <textarea
              className={`${inputClass} min-h-[76px]`}
              maxLength={limits.prose}
              value={allergens}
              onChange={(event) => {
                touch();
                setAllergens(event.target.value);
              }}
            />
          </Labelled>

          <Labelled label="Net weight">
            <input
              className={inputClass}
              maxLength={limits.netWeight}
              value={netWeight}
              onChange={(event) => {
                touch();
                setNetWeight(event.target.value);
              }}
            />
          </Labelled>

          <Labelled label="Scripture" hint="Philippians 4:4 until you put other words here.">
            <textarea
              className={`${inputClass} min-h-[76px]`}
              maxLength={limits.verse}
              value={scriptureText}
              onChange={(event) => {
                touch();
                setScriptureText(event.target.value);
              }}
            />
          </Labelled>

          <Labelled label="Where it is from">
            <input
              className={inputClass}
              maxLength={limits.reference}
              value={scriptureRef}
              onChange={(event) => {
                touch();
                setScriptureRef(event.target.value);
              }}
            />
          </Labelled>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" className="stamp w-fit" onClick={downloadPng} disabled={downloading}>
            {downloading ? "Making the picture…" : "Download PNG for T50M Pro"}
          </button>
          <p className="max-w-[52ch] font-ui text-[13px] leading-relaxed text-muted">
            Katasymbol app → 50×80 mm tape → Import image → turn it landscape if the app stands it up →
            Print. The file is 640×384 pixels.
          </p>
        </div>
        <p role="status" aria-live="polite" className="font-ui text-[13px] text-sage-deep">
          {downloadMessage}
        </p>

        <SaveBar state={state} label="Save this flavor's label" dirty={dirty} onSaved={settled} />
      </form>

      <div
        aria-hidden
        id={`${formId}-print`}
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          pointerEvents: "none",
        }}
      >
        <div ref={printRef}>
          <LabelPreview
            title={title}
            ingredients={ingredients}
            allergens={allergens}
            scripture={scripture}
            netWeight={netWeight}
            producedDate={producedDate}
            tracker={tracker}
            tone="print"
            marks={previewMarks}
          />
        </div>
      </div>
    </div>
  );
}

function SizeButton({
  current,
  value,
  onChoose,
  children,
}: {
  current: SizeOz;
  value: SizeOz;
  onChoose: (value: SizeOz) => void;
  children: React.ReactNode;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChoose(value)}
      className={`min-h-11 px-4 font-ui text-[13px] font-semibold ${
        selected ? "bg-brown text-cream" : "border border-sand bg-paper text-brown hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

