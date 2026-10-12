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
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/orders", label: "Orders" },
  { href: "/mockorder", label: "Practice shop" },
  { href: "/owner/fulfilment", label: "Bake & pickup" },
  { href: "/owner/kitchen", label: "Products & prices" },
  { href: "/owner/print", label: "Print studio" },
  { href: "/owner/settings", label: "Settings" },
  { href: "/owner/change-password", label: "Change password" },
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

  const selected = active.startsWith("/owner/mock") ? "/mockorder" : ["/owner/labels", "/owner/qr", "/owner/thank-you"].some(path => active.startsWith(path)) ? "/owner/print"
    : ["/owner/verse", "/owner/reviews", "/owner/rewards", "/owner/help"].some(path => active.startsWith(path)) ? "/owner/settings" : active;
  const navigation = (
        <nav aria-label="Owner navigation" className="owner-nav">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              aria-current={section.href === selected ? "page" : undefined}
              className={`whitespace-nowrap px-3.5 py-2.5 font-ui text-[14px] ${
                section.href === selected
                  ? "bg-cream/12 font-semibold text-cream"
                  : "text-linen hover:text-cream"
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>
  );
  return (
    <div className="owner-app min-h-screen lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Desktop navigation stays visible; phones use a native disclosure. */}
      <aside className="owner-sidebar flex flex-col gap-1 bg-brown-deep px-3.5 py-3 lg:min-h-screen lg:py-5">
        <div className="flex items-center gap-2.5 px-3.5 pb-3 lg:pb-5">
          <Image src="/logo.webp" alt="" width={72} height={72} className="h-9 w-9 rounded-full bg-cream" />
          <div className="flex flex-col">
            <span className="font-ui text-[13px] font-semibold text-cream">Owner&apos;s page</span>
            <span className="font-ui text-[11px] text-gold">{business.shortName}</span>
          </div>
        </div>

        <div className="owner-desktop-nav">{navigation}</div>
        <details className="owner-menu">
        <summary className="owner-menu-toggle">Menu <span>{sections.find(s => s.href === selected)?.label}</span></summary>
        {navigation}
        </details>

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

      <main id="owner-main" className="owner-main flex min-w-0 flex-col gap-7 px-5 py-7 sm:px-9 sm:py-9">{children}</main>
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
export function OwnerHeading({ title, note }: { eyebrow?: string; title: string; note?: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="m-0 text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px]">{title}</h1>
      {note ? <p className="max-w-[62ch] font-ui text-[14px] leading-relaxed text-muted">{note}</p> : null}
    </header>
  );
}
