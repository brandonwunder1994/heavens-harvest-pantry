"use client";

import { usePractice } from "@/components/ShopLink";
import { useEffect, useRef, useState } from "react";
import { AddToCart } from "@/components/cart/AddToCart";
import { FloatingJar } from "@/components/FloatingJars";
import { type SizeOz } from "@/lib/products";
import { type Flavor } from "@/lib/content";

export function FlavorModal({
  flavor,
  onClose,
}: {
  flavor: Flavor | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (flavor && !dialog.open) dialog.showModal();
    if (!flavor && dialog.open) dialog.close();
  }, [flavor]);

  return (
    <dialog
      ref={dialogRef}
      className="flavor-dialog"
      aria-labelledby={flavor ? "flavor-modal-title" : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {flavor ? (
        <FlavorSheet key={flavor.slug} flavor={flavor} onClose={onClose} />
      ) : null}
    </dialog>
  );
}

function FlavorSheet({flavor,onClose}:{flavor:Flavor;onClose:()=>void}) {
  const practice = usePractice();
  const [size, setSize] = useState<SizeOz>(8);
  return <div className="flavor-sheet">
          {practice && <p className="col-span-full mb-0 bg-brown-deep px-4 py-3 font-ui text-[13px] text-cream">MOCK — practice basket only. No real order or charge.</p>}
          <button type="button" className="flavor-close" onClick={onClose}>
            Close
          </button>

          <div className="flavor-sheet-jar">
            <FloatingJar
              flavor={flavor}
              featured
              linked={false}
              format={size === 3 ? "sampler" : "bag"}
              sizeOz={size}
              mark="none"
            />
          </div>

          <div className="flavor-sheet-copy">
            <h2 id="flavor-modal-title" className="display m-0 text-[32px] sm:text-[40px]">
              {flavor.name}
            </h2>
            <p className="font-ui text-[13px] font-semibold text-sage">3 oz, 8 oz, or 1 lb bags</p>
            <p className="m-0 text-[19px] italic leading-snug text-muted">{flavor.blurb}</p>

            <dl className="grid gap-x-8 gap-y-1.5 font-ui text-[13px] leading-relaxed text-muted sm:grid-cols-[110px_1fr]">
              <dt className="small-caps !text-[10px] text-faint">Ingredients</dt>
              <dd className="m-0">{flavor.ingredients}</dd>
              <dt className="small-caps !text-[10px] text-faint">Allergens</dt>
              <dd className="m-0">{flavor.allergens}</dd>
            </dl>

            {flavor.soldOut ? (
              <div className="caps w-fit -rotate-2 border-2 border-brown px-2.5 py-1.5 text-[10px] text-brown">
                Sold out · back {flavor.backOn}
              </div>
            ) : (
              <AddToCart
                key={flavor.slug}
                flavor={flavor}
                sizeOz={size}
                onSizeChange={setSize}
              />
            )}
          </div>
        </div>;
}
