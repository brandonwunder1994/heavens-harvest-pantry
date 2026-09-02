"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";

/** Once payment has actually succeeded, the basket is done with. */
export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
    // Only ever fires on the first render after the cart has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
