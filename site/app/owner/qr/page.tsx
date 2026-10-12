import Link from "next/link";
import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { labelQrUrl } from "@/lib/content";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function QrAdminPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const { live } = await readShop();
  const dest = labelQrUrl.replace(/^https:\/\//, "");

  return (
    <OwnerShell active="/owner/qr">
      <OwnerHeading
        eyebrow="QR"
        title="The code on every bag."
        note="The same picture as the footer: brown modules, sage corners, and a gold heart in the middle. A phone scan opens this week's menu."
      />

      {!live ? <CannotReach what="QR" /> : null}

      <section className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="w-fit border border-brown bg-paper p-2.5">
          <div className="dashed-frame p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qr.svg?v=6"
              alt="Heaven's Harvest QR code, with a gold heart in the center"
              width={320}
              height={320}
              className="h-[320px] w-[320px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="max-w-[52ch] font-ui text-[15px] leading-relaxed text-brown">
            It is already on the granola labels and at the bottom of the shop. Print tags from here if
            you want the same code on a card in the jar or on the table.
          </p>
          <p className="max-w-[52ch] font-ui text-[14px] leading-relaxed text-muted">
            A scan goes to{" "}
            <a href={labelQrUrl} className="text-brown underline decoration-gold underline-offset-4">
              {dest}
            </a>
            .
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a href="/qr.svg?v=6" download="heavens-harvest-qr.svg" className="stamp w-fit">
              Download the color QR
            </a>
            <a href="/qr-print.svg?v=6" download="heavens-harvest-qr-print.svg" className="stamp stamp-light w-fit">
              Download for the thermal printer
            </a>
            <Link href="/owner/qr/print" className="stamp stamp-light w-fit" target="_blank">
              Print tags
            </Link>
          </div>
        </div>
      </section>
    </OwnerShell>
  );
}
