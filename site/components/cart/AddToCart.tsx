"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { basketCrunch } from "@/components/craft/SoundSwitch";
import { Stepper } from "@/components/cart/Stepper";
import { MAX_QTY_PER_LINE, type Format } from "@/lib/cart";
import { money, type Flavor } from "@/lib/content";

export function AddToCart({ flavor }: { flavor: Flavor }) {
  const { qtyOf, setQty, add, ready } = useCart();
  const [format, setFormat] = useState<Format>("jar");
  const qty = ready ? qtyOf(flavor.slug, format) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-11 border border-brown" role="group" aria-label={`Packaging for ${flavor.name}`}>
        {(["jar", "bag"] as const).map((f) => {
          const active = format === f;
          const price = f === "jar" ? flavor.jarPrice : flavor.bagPrice;
          const inCart = ready ? qtyOf(flavor.slug, f) : 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={active}
              className={`caps flex items-center px-4 text-[10px] ${
                active ? "bg-brown text-cream" : "text-brown hover:bg-paper"
              }`}
            >
              {f === "jar" ? "Jar" : "Bag"} {money(price)}
              {inCart > 0 ? <span className="ml-1.5 normal-case tracking-normal">({inCart})</span> : null}
            </button>
          );
        })}
      </div>

      {qty > 0 ? (
        <Stepper
          value={qty}
          min={0}
          max={MAX_QTY_PER_LINE}
          label={`${flavor.name} ${format}`}
          onChange={(next) => setQty(flavor.slug, format, next)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            add(flavor.slug, format);
            // Decides for itself whether to make a noise, so the basket does
            // not have to know anything about sound.
            basketCrunch();
          }}
          className="stamp !min-h-11 !px-6 !text-[11px]"
        >
          Add {format === "jar" ? "a jar" : "a bag"}
        </button>
      )}
    </div>
  );
}
