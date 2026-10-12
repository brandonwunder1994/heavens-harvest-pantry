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
import { PracticeContext } from "@/components/ShopLink";
import { cleanName } from "@/lib/blend";
import type { Shop } from "@/lib/content";
import { ordersArePaused } from "@/lib/fulfilment";

const STORAGE_KEY = "hhp-cart-v1";

type CartState = {
  lines: CartLine[];
  jarsReturned: number;
  blessingBags: number;
};

type CartContextValue = CartState & {
  setLineQty: (line: CartLine, qty: number) => void;
  addLine: (line: CartLine) => void;
  /** Her live prices, flavors and rules, handed down from the server render. */
  shop: Shop;
  /** How many saved lines she has since removed or marked sold out. */
  dropped: number;
  ready: boolean;
  ordersPaused: boolean;
  totals: Totals;
  /** A jar with a name on it is its own line, so the name is part of asking. */
  qtyOf: (slug: string, format: Format, name?: string) => number;
  setQty: (slug: string, format: Format, qty: number, name?: string) => void;
  add: (slug: string, format: Format, qty?: number, name?: string) => void;
  setJarsReturned: (n: number) => void;
  setBlessingBags: (n: number) => void;
  clear: () => void;
};

const empty: CartState = { lines: [], jarsReturned: 0, blessingBags: 0 };

const CartContext = createContext<CartContextValue | null>(null);

function read(storageKey: string): CartState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      jarsReturned: Number(parsed.jarsReturned) || 0,
      blessingBags: 0,
    };
  } catch {
    return empty;
  }
}

export function CartProvider({ shop, initialOrdersPaused, storageKey = STORAGE_KEY, practice = false, children }: { shop: Shop; initialOrdersPaused: boolean; storageKey?: string; practice?: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(empty);
  const ordersPaused = initialOrdersPaused;
  // The cart lives in this browser only, so it cannot be read during the server
  // render. Everything renders empty first, then fills in once mounted.
  const [ready, setReady] = useState(false);

  // The basket lives in this browser only, so it cannot exist during the server
  // render. Reading it on mount is the one legitimate case for setting state
  // from an effect: there is no earlier moment at which the value is knowable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(read(storageKey));
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // A private window with storage blocked still gets a working cart for
      // this page view; it just will not survive a reload.
    }
  }, [state, ready, storageKey]);

  const setQty = useCallback((slug: string, format: Format, qty: number, name?: string) => {
    if (ordersArePaused()) return;
    setState((prev) => {
      const named = cleanName(name);
      const key = lineKey({ slug, format, name: named });
      const next = Math.max(0, Math.min(Math.floor(qty), MAX_QTY_PER_LINE));
      const without = prev.lines.filter((l) => lineKey(l) !== key);
      const line: CartLine = { slug, format, qty: next, ...(named ? { name: named } : {}) };
      return { ...prev, lines: next === 0 ? without : [...without, line] };
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    // What was saved in this browser is measured against her prices as they are
    // now, not as they were when it was saved. Anything she has since sold out
    // drops off the total but stays in storage, so it comes back when she does.
    const lines = ordersPaused ? [] : sanitizeCart(shop, state.lines);
    const dropped = Math.max(0, state.lines.length - lines.length);
    const totals = priceOrder(shop, lines, {
      jarsReturned: state.jarsReturned,
      blessingBags: state.blessingBags,
    });
    const qtyOf = (slug: string, format: Format, name?: string) => {
      const key = lineKey({ slug, format, name: cleanName(name) });
      return lines.find((l) => lineKey(l) === key)?.qty ?? 0;
    };

    return {
      setLineQty: (line, qty) => setState(prev => ({ ...prev, lines: [...prev.lines.filter(l => lineKey(l) !== lineKey(line)), ...(qty > 0 ? [{ ...line, qty: Math.min(MAX_QTY_PER_LINE, Math.floor(qty)) }] : [])] })),
      addLine: (line) => setState(prev => { const key=lineKey(line); const existing=prev.lines.find(l=>lineKey(l)===key); return {...prev,lines:[...prev.lines.filter(l=>lineKey(l)!==key),{...line,qty:Math.min(MAX_QTY_PER_LINE,(existing?.qty??0)+line.qty)}]}; }),
      ...state,
      lines,
      dropped,
      shop,
      ready,
      ordersPaused,
      totals,
      qtyOf,
      setQty,
      add: (slug, format, qty = 1, name) => {
        if (ordersArePaused()) return;
        setQty(slug, format, qtyOf(slug, format, name) + qty, name);
      },
      setJarsReturned: (n) => setState((p) => ({ ...p, jarsReturned: Math.max(0, Math.floor(n)) })),
      setBlessingBags: (n) => setState((p) => ({ ...p, blessingBags: Math.max(0, Math.floor(n)) })),
      clear: () => setState(empty),
    };
  }, [state, shop, ready, setQty, ordersPaused]);

  return <PracticeContext.Provider value={practice}><CartContext.Provider value={value}>{children}</CartContext.Provider></PracticeContext.Provider>;
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
