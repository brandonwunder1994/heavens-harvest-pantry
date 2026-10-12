import Link from "@/components/ShopLink";
import { type Shop } from "@/lib/content";

/**
 * The menu as a printed bill of fare: name and dot leaders. Used on the
 * home page and, in a denser form, on the menu page itself.
 */
export function MenuList({ shop }: { shop: Shop }) {
  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      {shop.flavors.map((flavor) => (
        <div key={flavor.slug} className="relative flex flex-col gap-1.5">
          <div className={`menu-leader ${flavor.soldOut ? "opacity-55" : ""}`}>
            <Link
              href={`/menu#${flavor.slug}`}
              className="display min-w-0 text-[26px] hover:text-sage sm:text-[32px]"
            >
              {flavor.name}
            </Link>
            <span className="leader-dots" aria-hidden="true" />
            <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-sage sm:text-[12px]">
              3 oz · 8 oz · 1 lb
            </span>
          </div>
          <p
            className={`text-[17px] italic leading-snug text-muted sm:text-[19px] ${
              flavor.soldOut ? "opacity-55" : ""
            }`}
          >
            {flavor.blurb}
          </p>
          {flavor.soldOut ? (
            <span className="caps mt-1 w-fit -rotate-3 border-2 border-brown bg-cream px-2.5 py-1.5 text-[10px] text-brown sm:absolute sm:right-40 sm:top-[-6px] sm:mt-0 sm:text-[11px]">
              Sold out · back {flavor.backOn}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
