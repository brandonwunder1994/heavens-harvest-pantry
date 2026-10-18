"use client";

import Link from "@/components/ShopLink";
import { useCart } from "@/components/cart/CartProvider";
import { Stepper } from "@/components/cart/Stepper";
import { formatMoney, lineKey, dollarsToCents, type CartLine } from "@/lib/cart";
import { pickupDateLabel, saturdayDate } from "@/lib/fulfilment";
import { sizeLabel } from "@/lib/products";

/**
 * This weekend's leftover bags, ready to pick up now at a discount. Shown only
 * while she has extras open. Each row counts down as people pay, and a row that
 * sells out says so and points to the next bake instead of vanishing.
 */
export function ReadyNow() {
  const cart = useCart();
  const extras = cart.shop.extras;
  if (!extras || !extras.items.length) return null;
  const allGone = extras.items.every(i => i.remaining <= 0);

  return (
    <section aria-labelledby="ready-now" className="mx-auto mt-10 w-full max-w-[1000px] px-6 sm:px-10">
      <div className="dashed-frame flex flex-col gap-5 bg-paper px-6 py-7 sm:px-9">
        <div className="flex flex-col gap-1.5">
          <div className="small-caps">Just baked · limited</div>
          <h2 id="ready-now" className="display m-0 text-[34px] sm:text-[44px]">Ready now</h2>
          <p className="text-[18px] italic text-sage">
            Extras from this weekend&apos;s bake, at a special price. Pickup {pickupDateLabel(extras.weekend)} or {pickupDateLabel(saturdayDate(extras.weekend))}.
          </p>
          {extras.note ? <p className="text-[17px] text-bark">{extras.note}</p> : null}
        </div>

        <ul className="divide-y divide-sand">
          {extras.items.map(item => {
            const line: CartLine = { slug: item.key, format: item.sizeOz === 3 ? "sampler" : "bag", sizeOz: item.sizeOz, qty: 1 };
            const inBasket = cart.ready ? (cart.lines.find(l => lineKey(l) === lineKey(line))?.qty ?? 0) : 0;
            const gone = item.remaining <= 0;
            return (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="text-[19px] leading-snug">{item.name.replace(/ · ready now$/, "")} <span className="text-sage">· {sizeLabel(item.sizeOz)}</span></p>
                  <p className="font-ui text-[13px] text-muted">
                    {gone ? "Sold out" : item.remaining <= 3 ? `Only ${item.remaining} left` : `${item.remaining} left`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-ui text-[16px] font-semibold tabular-nums">{formatMoney(dollarsToCents(item.price))}</span>
                  {gone ? (
                    <span className="caps -rotate-2 border-2 border-brown px-2.5 py-1.5 text-[10px] text-brown">Sold out</span>
                  ) : cart.ordersPaused ? (
                    <button type="button" disabled className="stamp opacity-60">Ordering paused</button>
                  ) : inBasket > 0 ? (
                    <Stepper value={inBasket} min={0} max={Math.min(item.remaining, 20)} label={`${item.name}, ${sizeLabel(item.sizeOz)}`} onChange={n => cart.setLineQty(line, Math.min(n, item.remaining))} />
                  ) : (
                    <button type="button" className="stamp !min-h-11" onClick={() => cart.addLine(line)}>Claim</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {allGone ? (
          <p className="text-[18px] text-bark">
            The extras are gone this weekend. <Link href="/menu#order-next" className="text-sage underline">Pre-order the next bake</Link> and we will have yours fresh.
          </p>
        ) : (
          <p className="font-ui text-[13px] text-muted">Extras are checked out on their own, for pickup this weekend only. They cannot be sent as blessing gifts.</p>
        )}
      </div>
    </section>
  );
}
