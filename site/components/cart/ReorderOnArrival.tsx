"use client";

import { usePractice } from "@/components/ShopLink";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { readReorder, reorderNote } from "@/lib/reorder";

/**
 * Puts a past order back in the basket when somebody arrives from the one-tap
 * reorder link, then takes the instruction out of the address so a reload does
 * not add everything a second time.
 *
 * It always says what it did. Filling somebody's basket without telling them is
 * how a shop ends up charging for something nobody chose.
 */
export function ReorderOnArrival() {
  const router = useRouter();
  const practice = usePractice();
  const params = useSearchParams();
  const cart = useCart();
  const [note, setNote] = useState("");

  const again = params.get("again");
  const { ready, shop, setQty } = cart;

  useEffect(() => {
    if (!again || !ready) return;

    const lines = readReorder(again, shop.flavors);
    for (const line of lines) setQty(line.slug, line.format, line.qty);

    const asked = again.split(",").length;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote(reorderNote(asked, lines.length));
    router.replace(practice ? "/mockorder/menu" : "/menu", { scroll: false });
  }, [again, ready, shop, setQty, router, practice]);

  if (!note) return null;

  return (
    <p
      role="status"
      className="dashed-frame mx-auto mb-6 w-full max-w-[820px] bg-paper px-6 py-4 text-center text-[18px] leading-snug text-bark"
    >
      {note}
    </p>
  );
}
