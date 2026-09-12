import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { business } from "@/lib/content";
import { endSession } from "@/lib/owner-auth";

/**
 * The frame every owner screen sits in: her sidebar on the left, the work on
 * the right. `active` is the href of the page she is looking at.
 */

type Section = { href: string; label: string };

const sections: Section[] = [
  { href: "/owner", label: "Today" },
  { href: "/owner/kitchen", label: "Flavors & prices" },
  { href: "/owner/labels", label: "Labels" },
  { href: "/owner/verse", label: "Verse card" },
  { href: "/owner/reviews", label: "Reviews" },
  { href: "/owner/rewards", label: "Rewards" },
];

export function OwnerShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  async function signOut() {
    "use server";
    await endSession();
    redirect("/owner/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* On a phone this is a single scrolling row rather than a full screen of
          navigation she has to scroll past on every page. */}
      <aside className="flex flex-col gap-1 bg-brown-deep px-3.5 py-3 lg:min-h-screen lg:py-5">
        <div className="flex items-center gap-2.5 px-3.5 pb-3 lg:pb-5">
          <Image src="/logo.webp" alt="" width={72} height={72} className="h-9 w-9 rounded-full bg-cream" />
          <div className="flex flex-col">
            <span className="font-ui text-[13px] font-semibold text-cream">Owner&apos;s page</span>
            <span className="font-ui text-[11px] text-gold">{business.shortName}</span>
          </div>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              aria-current={section.href === active ? "page" : undefined}
              className={`whitespace-nowrap px-3.5 py-2.5 font-ui text-[14px] ${
                section.href === active
                  ? "bg-cream/12 font-semibold text-cream"
                  : "text-linen hover:text-cream"
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 flex gap-1 border-t border-cream/15 pt-3 lg:mt-auto lg:flex-col lg:border-t-0 lg:pt-0">
          <Link
            href="/"
            className="flex items-center gap-3 px-3.5 py-2.5 font-ui text-[14px] text-linen hover:text-cream"
          >
            View the shop
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-3.5 py-2.5 text-left font-ui text-[14px] text-linen hover:text-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex flex-col gap-6 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}

/**
 * Said out loud when the database could not be reached. Without it her editor
 * shows the built-in sample flavors and prices as though they were hers.
 */
export function CannotReach({ what }: { what: string }) {
  return (
    <p
      role="alert"
      className="border-2 border-brown bg-[#fdf6ea] px-5 py-4 font-ui text-[14px] leading-relaxed text-brown"
    >
      <strong className="font-semibold">This is not your {what}.</strong> The place your settings are kept
      could not be reached just now, so the built-in examples are showing instead. Nothing here is saved
      and nothing has been lost. Give it a minute and reload the page.
    </p>
  );
}

/** A page heading on the owner's side: what this screen is and what it does. */
export function OwnerHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="small-caps">{eyebrow}</div>
      <h1 className="display m-0 text-[32px] sm:text-[38px]">{title}</h1>
      {note ? <p className="max-w-[62ch] font-ui text-[14px] leading-relaxed text-muted">{note}</p> : null}
    </header>
  );
}
