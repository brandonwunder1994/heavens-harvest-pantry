"use client";

// The jar at the top of the menu, and the list of her flavours beside it.
// Hover swaps the photograph. Click opens the flavor.

import { Fragment, useEffect, useState } from "react";
import { FloatingJar } from "@/components/FloatingJars";
import { FlavorModal } from "@/components/menu/FlavorModal";
import { type Flavor } from "@/lib/content";
import { entryHasSlug } from "@/lib/menu-groups";
import { isNut } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";
import { formatMoney, unitPriceCents } from "@/lib/cart";

function slugFromHash(): string {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

export function TurnTheJar({ flavors }: { flavors: Flavor[] }) {
  const { ordersPaused } = useCart();
  const [at, setAt] = useState(() => Math.max(0, flavors.findIndex((f) => !f.soldOut)));
  const [open, setOpen] = useState<Flavor | null>(null);
  const chosen = flavors[at] ?? flavors[0];

  useEffect(() => {
    const apply = () => {
      const slug = slugFromHash();
      if (!slug) {
        setOpen(null);
        return;
      }
      const index = flavors.findIndex((flavor) => entryHasSlug(flavor, slug));
      if (index < 0) return;
      setAt(index);
      setOpen(flavors[index] ?? null);
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [flavors]);

  function openFlavor(flavor: Flavor) {
    setAt(flavors.findIndex((row) => row.slug === flavor.slug));
    setOpen(flavor);
    if (window.location.hash !== `#${flavor.slug}`) {
      window.history.replaceState(null, "", `#${flavor.slug}`);
    }
  }

  function close() {
    setOpen(null);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  if (!flavors.length || !chosen) return null;

  return (
    <>
      <div className="turn">
        <div className="turn-stage">
          <div className="turn-photo">
            <FloatingJar
              key={chosen.slug}
              flavor={chosen}
              featured
              linked={false}
              format="bag"
              onSelect={() => openFlavor(chosen)}
            />
          </div>
        </div>

        <div className="turn-picks" role="group" aria-label="Choose a flavor">
          {flavors.map((flavor, i) => (
            <Fragment key={flavor.slug}>
            {(i === 0 || isNut(flavor) !== isNut(flavors[i - 1])) && <p className="turn-group">{isNut(flavor) ? "Candied nuts" : "Granola"}</p>}
            <button
              type="button"
              className="turn-pick"
              aria-pressed={i === at}
              data-sold-out={flavor.soldOut ? "yes" : undefined}
              onPointerEnter={() => setAt(i)}
              onFocus={() => setAt(i)}
              onClick={() => openFlavor(flavor)}
            >
              <span className="turn-pick-name">{flavor.name}</span>
              <span className="turn-pick-price">{flavor.soldOut ? "sold out" : ordersPaused ? "ordering paused" : `8 oz · ${formatMoney(unitPriceCents(flavor, "bag", 8))}`}</span>
            </button>
            </Fragment>
          ))}
        </div>
      </div>

      <FlavorModal flavor={open} onClose={close} />
    </>
  );
}
