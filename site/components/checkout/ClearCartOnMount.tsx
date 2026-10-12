"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";

/** Once payment has actually succeeded, the basket is done with. */
export function ClearCartOnMount({ receiptId }: { receiptId?: string }) {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (!ready) return;
    if (receiptId) {
      try {
        const key=`hhp-cleared-receipt:${receiptId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key,"yes");
      } catch { /* Blocked browser storage still allows checkout to finish. */ }
    }
    clear();
    // Only ever fires on the first render after the cart has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
