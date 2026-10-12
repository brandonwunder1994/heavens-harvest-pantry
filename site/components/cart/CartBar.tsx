"use client";

import Link from "@/components/ShopLink";
import { useCart } from "@/components/cart/CartProvider";
import { formatMoney } from "@/lib/cart";

/** Sticky bar at the foot of the menu, so the order is always one tap away. */
export function CartBar() {
  const { ready, totals, ordersPaused } = useCart();
  if (ordersPaused || !ready || (totals.itemCount === 0 && totals.blessingBags === 0)) return null;

  return (
    <div className="sticky bottom-0 z-40 border-t border-dashed border-hedge bg-cream/95 px-6 py-3 backdrop-blur sm:px-10">
      <Link
        href="/checkout"
        className="stamp mx-auto flex w-full max-w-[900px] !justify-between !px-6"
      >
        <span>
          Checkout · {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
        </span>
        <span>{formatMoney(totals.totalCents)}</span>
      </Link>
    </div>
  );
}

/** The little count beside the basket in the masthead. */
export function CartCount() {
  const { ready, totals, ordersPaused } = useCart();
  return (
    <Link
      href={ordersPaused ? "/menu" : "/checkout"}
      className="flex items-center gap-1.5 text-brown hover:text-sage"
      aria-label={ordersPaused ? "Ordering temporarily paused" : `Basket, ${ready ? totals.itemCount : 0} items`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 7h12l-1 13H7z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em]">{ordersPaused ? "Oct 8" : ready ? totals.itemCount : 0}</span>
    </Link>
  );
}
