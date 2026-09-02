"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  MAX_QTY_PER_LINE,
  lineKey,
  priceOrder,
  sanitizeCart,
  type CartLine,
  type Format,
  type Totals,
} from "@/lib/cart";
import type { Shop } from "@/lib/content";

const STORAGE_KEY = "hhp-cart-v1";

type CartState = {
  lines: CartLine[];
  jarsReturned: number;
  blessingBags: number;
};

type CartContextValue = CartState & {
  /** Her live prices, flavors and rules, handed down from the server render. */
  shop: Shop;
  /** How many saved lines she has since removed or marked sold out. */
  dropped: number;
  ready: boolean;
  totals: Totals;
  qtyOf: (slug: string, format: Format) => number;
  setQty: (slug: string, format: Format, qty: number) => void;
  add: (slug: string, format: Format, qty?: number) => void;
  setJarsReturned: (n: number) => void;
  setBlessingBags: (n: number) => void;
  clear: () => void;
};

const empty: CartState = { lines: [], jarsReturned: 0, blessingBags: 0 };

const CartContext = createContext<CartContextValue | null>(null);

function read(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      jarsReturned: Number(parsed.jarsReturned) || 0,
      blessingBags: Number(parsed.blessingBags) || 0,
    };
  } catch {
    return empty;
  }
}

export function CartProvider({ shop, children }: { shop: Shop; children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(empty);
  // The cart lives in this browser only, so it cannot be read during the server
  // render. Everything renders empty first, then fills in once mounted.
  const [ready, setReady] = useState(false);

  // The basket lives in this browser only, so it cannot exist during the server
  // render. Reading it on mount is the one legitimate case for setting state
  // from an effect: there is no earlier moment at which the value is knowable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A private window with storage blocked still gets a working cart for
      // this page view; it just will not survive a reload.
    }
  }, [state, ready]);

  const setQty = useCallback((slug: string, format: Format, qty: number) => {
    setState((prev) => {
      const key = lineKey({ slug, format });
      const next = Math.max(0, Math.min(Math.floor(qty), MAX_QTY_PER_LINE));
      const without = prev.lines.filter((l) => lineKey(l) !== key);
      return { ...prev, lines: next === 0 ? without : [...without, { slug, format, qty: next }] };
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    // What was saved in this browser is measured against her prices as they are
    // now, not as they were when it was saved. Anything she has since sold out
    // drops off the total but stays in storage, so it comes back when she does.
    const lines = sanitizeCart(shop, state.lines);
    const dropped = Math.max(0, state.lines.length - lines.length);
    const totals = priceOrder(shop, lines, {
      jarsReturned: state.jarsReturned,
      blessingBags: state.blessingBags,
    });
    const qtyOf = (slug: string, format: Format) =>
      lines.find((l) => l.slug === slug && l.format === format)?.qty ?? 0;

    return {
      ...state,
      lines,
      dropped,
      shop,
      ready,
      totals,
      qtyOf,
      setQty,
      add: (slug, format, qty = 1) => setQty(slug, format, qtyOf(slug, format) + qty),
      setJarsReturned: (n) => setState((p) => ({ ...p, jarsReturned: Math.max(0, Math.floor(n)) })),
      setBlessingBags: (n) => setState((p) => ({ ...p, blessingBags: Math.max(0, Math.floor(n)) })),
      clear: () => setState(empty),
    };
  }, [state, shop, ready, setQty]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

/** Her live prices and rules, for any client component that needs them. */
export function useShop(): Shop {
  return useCart().shop;
}
