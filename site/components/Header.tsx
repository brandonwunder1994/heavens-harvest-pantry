"use client";
import { REWARDS_ENABLED } from "@/lib/features";

import Image from "next/image";
import Link from "@/components/ShopLink";
import { CartCount } from "@/components/cart/CartBar";
import { PorchLight } from "@/components/PorchLight";
import { business, type Shop } from "@/lib/content";
import { porchState } from "@/lib/porch";
import { PICKUP_LABEL } from "@/lib/fulfilment";
import { ORDERS_PAUSED_MESSAGE } from "@/lib/fulfilment";
import { useCart } from "@/components/cart/CartProvider";

const leftLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/story", label: "Our Story" },
  { href: "/pickup", label: "Pickup" },
];

const rightLinks = [
  ...(REWARDS_ENABLED ? [{ href: "/rewards", label: "Rewards" }] : []),
  { href: "/reviews", label: "Reviews" },
];

export function Header({ shop }: { shop: Shop }) {
  const { ordersPaused } = useCart();
  return (
    <header>
      {ordersPaused ? (
        <div role="status" className="bg-brown px-6 py-3 text-center font-ui text-[12px] font-semibold tracking-[0.04em] text-cream sm:text-[13px]">
          {ORDERS_PAUSED_MESSAGE} Browse the menu while you wait.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-b border-dashed border-hedge px-6 py-3 text-center font-ui text-[10px] font-semibold uppercase tracking-[0.22em] text-sage sm:justify-between sm:px-10 lg:px-18 lg:text-[11px]">
        <span>
          {ordersPaused ? "Ordering temporarily paused" : "Order by Tues, Porch Pickup Fri/Sat"}
        </span>
        {/* The lamp when there is something honest to say, and the line we
            always had when there is not. */}
        {porchState(shop.porch).show ? (
          <PorchLight porch={shop.porch} />
        ) : (
          <span className="hidden md:inline">Baked with prayer in a home kitchen · {business.city}</span>
        )}
        <span className="hidden md:inline">{PICKUP_LABEL}</span>
      </div>

      {/* Below lg the masthead stacks and stays centred; from lg it becomes the
          three-column arrangement with the wreath in the middle. */}
      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-5 sm:px-10 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-10 lg:px-18 lg:pt-7">
        <nav className="caps hidden gap-8 text-[12px] text-brown lg:flex xl:gap-10">
          {leftLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-sage">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" aria-label={`${business.name}, home`}>
          <Image
            src="/logo.webp"
            alt={business.name}
            width={420}
            height={420}
            priority
            className="h-[124px] w-[124px] sm:h-[150px] sm:w-[150px] lg:h-[196px] lg:w-[196px]"
          />
        </Link>

        <nav className="caps flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-brown lg:hidden">
          {[...leftLinks, ...rightLinks].map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-sage">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-8 lg:gap-8 xl:gap-10">
          <nav className="caps hidden gap-8 text-[12px] text-brown lg:flex xl:gap-10">
            {rightLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-sage">
                {link.label}
              </Link>
            ))}
          </nav>
          <CartCount />
          <Link href="/menu" className="stamp !min-h-11 !px-6 !text-[11px]">
            {ordersPaused ? "Ordering paused" : "Order"}
          </Link>
        </div>
      </div>
    </header>
  );
}
