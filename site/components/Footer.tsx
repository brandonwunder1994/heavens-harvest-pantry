import { REWARDS_ENABLED } from "@/lib/features";
import Image from "next/image";
import Link from "@/components/ShopLink";
import InviteLine from "@/components/InviteLine";
import { WheatHem } from "@/components/craft/WheatHem";
import { business, filled, type Shop } from "@/lib/content";
import { PICKUP_LABEL } from "@/lib/fulfilment";

const shopLinks = [
  { href: "/menu", label: "This week's menu" },
  { href: "/bowl", label: "Ways to eat granola" },
  { href: "/blessing-bags", label: "Blessing bags" },
  ...(REWARDS_ENABLED ? [{ href: "/rewards", label: "Rewards" }] : []),
];

export function Footer({ shop, practice = false }: { shop: Shop; practice?: boolean }) {
  const { verses } = shop;

  return (
    <>
      <footer className="px-6 pb-8 sm:px-10 lg:px-18">
        <div className="border-t border-dashed border-hedge pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-8">
            <Link href="/" className="flex items-center gap-3" aria-label={`${business.name}, home`}>
              <Image src="/logo.webp" alt="" width={96} height={96} className="h-12 w-12" />
              <div className="flex flex-col gap-0.5">
                <div className="caps text-[11px] text-brown">{business.name}</div>
                <p className="text-[15px] italic leading-snug text-sage">{business.tagline}</p>
              </div>
            </Link>

            <nav aria-label="Shop" className="flex flex-col gap-2">
              <div className="small-caps">Shop</div>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 font-ui text-[13px]">
                {shopLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-brown hover:text-sage">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-col gap-1.5 font-ui text-[13px] text-brown">
              <div className="small-caps">Find us</div>
              <span>{PICKUP_LABEL}</span>
              <Link href="/pickup" className="text-sage hover:text-brown">Pickup details</Link>
              {filled(business.phone) ? <span>Text · {filled(business.phone)}</span> : null}
            </div>

            <div className="flex items-center gap-2.5 lg:flex-col lg:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={practice ? "/api/mock/qr" : "/qr.svg?v=6"} alt={practice ? "Scan for practice menu" : "Scan to reorder"} width={56} height={56} className="h-14 w-14" />
              <div className="small-caps text-faint">{practice ? "Practice menu" : "Scan to reorder"}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-sand pt-4 sm:flex-row sm:items-center">
            <p className="verse max-w-xl text-[17px] leading-snug text-brown sm:text-[19px]">
              &ldquo;{verses.blessing.text}&rdquo;{" "}
              <span className="ref !text-[9px] text-faint">{verses.blessing.reference}</span>
            </p>
            <InviteLine compact />
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-sand pt-3 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="font-ui text-[11px] leading-relaxed text-faint">
              Made in a home kitchen in {business.city}. Registered with the Arizona Department of Health
              Services cottage food program. Ingredients and allergens are listed on every flavor and every
              label.
            </p>
            <Link href={practice ? "/owner/mock" : "/owner/login"} className="shrink-0 font-ui text-[11px] text-faint hover:text-sage">
              {practice ? "Mock receipts" : "Owner sign-in"}
            </Link>
          </div>
        </div>
      </footer>

      {/* A horizon for the blessing to sit above. It is outside the footer's
          own box so the grass runs the full width of the page and reaches the
          very bottom of it. */}
      <WheatHem />
    </>
  );
}
