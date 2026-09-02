import { HeartSeal } from "@/components/Sprite";

export function PageHeader({
  eyebrow,
  title,
  standfirst,
}: {
  eyebrow: string;
  title: React.ReactNode;
  standfirst?: string;
}) {
  return (
    <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
      <HeartSeal size={38} />
      <div className="small-caps">{eyebrow}</div>
      <h1 className="display m-0 max-w-4xl text-[42px] sm:text-[60px] lg:text-[72px]">{title}</h1>
      {standfirst ? (
        <p className="max-w-2xl text-[19px] leading-relaxed text-bark sm:text-[22px]">{standfirst}</p>
      ) : null}
    </section>
  );
}

/**
 * An honest note about a part of the site that is built but not yet wired up.
 * Better than a dead link or an invented feature.
 */
export function NotYetLive({ note }: { note: string }) {
  return (
    <div className="dashed-frame mx-auto flex w-full max-w-[820px] flex-col gap-1.5 bg-paper px-6 py-5 text-center">
      <div className="small-caps">Not switched on yet</div>
      <p className="text-[18px] leading-snug text-bark">{note}</p>
    </div>
  );
}
