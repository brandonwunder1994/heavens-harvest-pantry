import Image from "next/image";
import Link from "next/link";
import InviteLine from "@/components/InviteLine";
import { SoundSwitch } from "@/components/craft/SoundSwitch";
import { business, filled, type Shop } from "@/lib/content";

const shopLinks = [
  { href: "/menu", label: "This week's menu" },
  { href: "/jars", label: "Jar returns" },
  { href: "/blessing-bags", label: "Blessing bags" },
  { href: "/rewards", label: "Rewards" },
];

export function Footer({ shop }: { shop: Shop }) {
  const { delivery, verses } = shop;

  return (
    <footer className="px-6 pb-14 sm:px-10 lg:px-18">
      <div className="border border-brown p-2.5">
        <div className="dashed-frame flex flex-col gap-8 px-6 py-9 sm:px-10 lg:px-12">
          <div className="grid gap-9 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center lg:gap-10">
            <div className="flex items-center gap-5">
              <Image src="/logo.webp" alt="" width={220} height={220} className="h-[110px] w-[110px]" />
              <div className="flex flex-col gap-1.5">
                <div className="caps text-[13px] text-brown">{business.name}</div>
                <p className="text-[17px] italic text-sage">{business.tagline}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 font-ui text-[15px]">
              <div className="small-caps">Shop</div>
              {shopLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-brown hover:text-sage">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-2 font-ui text-[15px] text-brown">
              <div className="small-caps">Find us</div>
              {/* A blanked field must not leave a dangling middot, and a
                  placeholder she has not filled in yet must not show at all. */}
              {delivery.runs.map((run) => (
                <span key={run.area}>
                  {run.area}
                  {run.day ? ` · ${run.day}` : ""}
                </span>
              ))}
              {filled(delivery.dropOff) ? <span>Drop-off · {filled(delivery.dropOff)}</span> : null}
              {filled(business.phone) ? <span>Text · {filled(business.phone)}</span> : null}
            </div>

            <div className="flex flex-col items-center gap-2">
              <Image src="/qr.svg" alt="Scan to reorder" width={104} height={104} className="h-[104px] w-[104px]" />
              <div className="small-caps text-faint">Scan to reorder</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-sand pt-6">
            <p className="verse max-w-2xl text-center text-[22px] text-brown sm:text-[27px]">
              &ldquo;{verses.blessing.text}&rdquo;
            </p>
            <div className="ref !text-[10px] text-faint">{verses.blessing.reference}</div>
          </div>

          {/* A small door, six words and an arrow, under the blessing. It is
              deliberately quiet: easy to walk past, easy to follow. */}
          <InviteLine />

          <div className="flex justify-center">
            <SoundSwitch label="A small sound when something goes in the basket" />
          </div>

          <p className="text-center font-ui text-[11px] leading-relaxed text-faint">
            Made in a home kitchen in {business.city}. Registered with the Arizona Department of Health Services
            cottage food program. Ingredients and allergens are listed on every flavor and every label.
          </p>
        </div>
      </div>
    </footer>
  );
}
