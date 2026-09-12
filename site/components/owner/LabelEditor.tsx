"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import { saveBlock } from "@/app/owner/actions";
import { LabelPreview } from "@/components/owner/LabelPreview";
import { Labelled, SaveBar, inputClass } from "@/components/owner/SaveBar";
import type { Flavor, LabelSettings, LabelSize } from "@/lib/content";
import {
  LABEL_HEIGHT_PX,
  LABEL_WIDTH_PX,
  defaultNetWeight,
  pngFilename,
  templateFor,
  todayIso,
  trackerFrom,
  upsertTemplate,
  mmdd,
} from "@/lib/label";
import { idle } from "@/lib/save-state";
import { limits } from "@/lib/shop-schema";

export type LabelOrderOption = {
  id: string;
  name: string;
  runDate: string;
  items: { name: string; format: LabelSize; qty: number }[];
};

export function LabelEditor({
  flavors,
  settings,
  orders,
}: {
  flavors: Flavor[];
  settings: LabelSettings;
  orders: LabelOrderOption[];
}) {
  const first = flavors[0];
  const opening = first ? templateFor(settings, first) : null;

  const [slug, setSlug] = useState(opening?.flavorSlug ?? "");
  const [title, setTitle] = useState(opening?.title ?? "");
  const [ingredients, setIngredients] = useState(opening?.ingredients ?? "");
  const [allergens, setAllergens] = useState(opening?.allergens ?? "");
  const [scriptureText, setScriptureText] = useState(opening?.scripture.text ?? settings.scripture.text);
  const [scriptureRef, setScriptureRef] = useState(opening?.scripture.reference ?? settings.scripture.reference);
  const [size, setSize] = useState<LabelSize>(opening?.size ?? "bag");
  const [netWeight, setNetWeight] = useState(opening?.netWeight ?? defaultNetWeight("bag"));
  const [producedDate, setProducedDate] = useState(todayIso);
  const [tracker, setTracker] = useState("");
  const [orderId, setOrderId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    const url = settings.qrUrl.trim() || "https://heavens-harvest-pantry.vercel.app/menu?src=qr";
    QRCode.toDataURL(url, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1208", light: "#ffffff" },
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.qrUrl]);

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
    setNetWeight(saved.netWeight);
  };

  const chooseSize = (next: LabelSize) => {
    touch();
    setSize(next);
    setNetWeight(defaultNetWeight(next));
  };

  const chooseOrder = (id: string) => {
    setOrderId(id);
    if (!id) return;
    const order = orders.find((row) => row.id === id);
    if (!order) return;
    const only = order.items.length === 1 ? order.items[0] : null;
    const matched = only ? flavors.find((row) => row.name === only.name) : undefined;
    if (matched && only) {
      loadFlavor(matched.slug);
      setSize(only.format);
      setNetWeight(defaultNetWeight(only.format));
      setTracker(trackerFrom(order.name, matched.name, producedDate));
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
    if (!qrDataUrl) {
      setDownloadMessage("The QR code is still drawing. Try again in a second.");
      return;
    }
    const node = printRef.current;
    if (!node) return;
    setDownloading(true);
    setDownloadMessage("");
    try {
      await document.fonts.ready;
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

  const preview = (
    <LabelPreview
      title={title}
      ingredients={ingredients}
      allergens={allergens}
      scripture={scripture}
      netWeight={netWeight}
      producedDate={producedDate}
      tracker={tracker}
      qrDataUrl={qrDataUrl}
      tone="preview"
    />
  );

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
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
            <span className="font-ui text-[12px] font-semibold text-muted">Bag or jar</span>
            <div className="mt-1.5 flex gap-2">
              <SizeButton current={size} value="bag" onChoose={chooseSize}>
                Bag · 12 oz
              </SizeButton>
              <SizeButton current={size} value="jar" onChoose={chooseSize}>
                Jar · 16 oz
              </SizeButton>
            </div>
          </div>

          {orders.length > 0 ? (
            <Labelled
              label="Whose order this is"
              hint="Picking a name fills the tracker code. A single-flavor order also switches the label to that granola."
            >
              <select className={inputClass} value={orderId} onChange={(event) => chooseOrder(event.target.value)}>
                <option value="">Type a code yourself</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {orderLabel(order)}
                  </option>
                ))}
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
            Katasymbol app → 50×80 mm tape → Import image → Print. The file is 384×640 pixels, the exact
            size that printer can mark.
          </p>
        </div>
        <p role="status" aria-live="polite" className="font-ui text-[13px] text-sage-deep">
          {downloadMessage}
        </p>

        <SaveBar state={state} label="Save this flavor's label" dirty={dirty} onSaved={settled} />
      </form>

      <aside className="flex flex-col items-center gap-3 xl:sticky xl:top-6">
        <div
          className="bg-brown-deep p-3"
          style={{
            boxShadow: "0 18px 36px -24px rgba(58, 39, 18, 0.55)",
          }}
        >
          {preview}
        </div>
        <p className="max-w-[384px] text-center font-ui text-[12px] leading-relaxed text-muted">
          50 mm × 80 mm at 203 DPI — cream here so you can see the branding. The download is black on white
          for the thermal printer.
        </p>
      </aside>

      <div
        aria-hidden
        id={`${formId}-print`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          transform: "translateX(-100vw)",
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
            qrDataUrl={qrDataUrl}
            tone="print"
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
  current: LabelSize;
  value: LabelSize;
  onChoose: (value: LabelSize) => void;
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

function orderLabel(order: LabelOrderOption): string {
  const items = order.items.map((item) => `${item.qty}× ${item.name}`).join(", ");
  const who = order.name.trim() || "An order";
  if (items && order.runDate) return `${who} · ${items} · ${order.runDate}`;
  if (items) return `${who} · ${items}`;
  return who;
}
