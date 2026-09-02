import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { loadOrders } from "@/lib/orders-source";
import {
  bakeList,
  formatCents,
  formatCentsExact,
  orphanedOrders,
  runSheet,
  summarise,
  unitsIn,
  type BakeRow,
  type Order,
} from "@/lib/orders";
import { DeliveredToggle } from "@/components/owner/DeliveredToggle";
import { CrossWheat } from "@/components/Sprite";
import { OwnerShell } from "@/components/owner/Shell";
import { PorchSwitch } from "@/components/owner/PorchSwitch";
import { getShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const shop = await getShop();
  const { delivery, verseOfTheWeek } = shop;
  const result = await loadOrders();
  const orders = result.status === "ok" ? result.orders : [];
  // This page is force-dynamic and its whole job is to say what today looks
  // like, so reading the clock here is the point rather than an impurity.
  // eslint-disable-next-line react-hooks/purity
  const now = Math.floor(Date.now() / 1000);

  // Every run she lists gets its own sheet. Showing only one meant a second
  // delivery day stayed invisible until the first was manually moved on, and
  // orders booked onto a run she has since removed disappeared altogether.
  const runs = delivery.runs.map((r) => ({
    ...r,
    stops: runSheet(orders, r.nextDate),
    bake: bakeList(orders, r.nextDate),
  }));
  const orphans = orphanedOrders(orders, delivery.runs.map((r) => r.nextDate));

  const next = runs.find((r) => r.stops.some((s) => !s.delivered)) ?? runs[0];
  const summary = summarise(orders, now, next.nextDate);
  const prayers = orders.filter((o) => o.prayer).slice(0, 4);
  const outstanding = runs.reduce((n, r) => n + r.stops.filter((s) => !s.delivered).length, 0);

  return (
    <OwnerShell active="/owner">
        <header id="today" className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="small-caps">
              Next run · {next.nextDate} · {next.area}
            </div>
            <h1 className="display m-0 text-[32px] sm:text-[38px]">
              {result.status !== "ok"
                ? "Waiting on the payment account"
                : orders.length === 0
                  ? "No orders yet."
                  : `${outstanding} still to deliver, ${summary.jarsDueBack} jars coming back.`}
            </h1>
          </div>
          {outstanding > 0 ? (
            <div className="flex gap-2.5">
              <Link href="#run" className="stamp stamp-light !min-h-11 !px-4 !text-[11px]">
                Today&apos;s run sheet
              </Link>
            </div>
          ) : null}
        </header>

        {result.status === "not_configured" ? (
          <Banner>
            The shop is live but no payment account is connected yet, so there are no orders to show.
            Everything on this page fills in on its own the moment the Stripe key is in place.
          </Banner>
        ) : null}
        {result.status === "error" ? (
          <Banner tone="warn">
            Could not reach Stripe just now, so these numbers may be missing or stale. {result.message}
          </Banner>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Tile label="Today" value={formatCents(summary.todayCents)} note={`${summary.todayCount} orders`} />
          <Tile
            label="This week"
            value={formatCents(summary.weekCents)}
            note={weekNote(summary.weekCents, summary.previousWeekCents)}
          />
          <Tile label="Jars out there" value={String(summary.jarsOut)} note={`${summary.jarsDueBack} due back this run`} />
          <Tile label="Came back" value={`${summary.repeatRate}%`} note="ordered more than once" />
          <Tile
            label="Blessing bags"
            value={String(summary.blessingBagsWaiting)}
            note="bought, still to deliver"
            tone="moss"
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          <div id="run" className="flex flex-col gap-4">
            {runs.map((r) => (
              <RunSheet key={`${r.area}-${r.nextDate}`} area={r.area} date={r.nextDate} stops={r.stops} />
            ))}

            {orphans.length > 0 ? (
              <section className="border-2 border-brown bg-[#fdf6ea]">
                <div className="flex flex-col gap-1 px-5 py-4">
                  <h2 className="display m-0 text-[22px]">
                    {orphans.length} order{orphans.length === 1 ? "" : "s"} for a day you no longer list
                  </h2>
                  <p className="font-ui text-[13px] leading-relaxed text-brown">
                    These were paid for and still need delivering. Add that delivery day back on your
                    Flavors &amp; prices page, or take them round with your next run.
                  </p>
                </div>
                {orphans.map((order) => (
                  <RunRow key={order.id} order={order} />
                ))}
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            {runs.map((r) => (
              <BakeList key={`${r.area}-${r.nextDate}`} date={r.nextDate} rows={r.bake} />
            ))}

            <section id="porch" className="border border-rule bg-paper px-5 py-4">
              <PorchSwitch porch={shop.porch} />
            </section>

            <section id="jars" className="flex flex-col gap-2 border border-rule bg-paper px-5 py-4">
              <h2 className="display m-0 text-[22px]">Jars</h2>
              <div className="flex items-baseline justify-between font-ui text-[13px]">
                <span className="text-muted">Out with customers</span>
                <span className="font-semibold tabular-nums">{summary.jarsOut}</span>
              </div>
              <div className="flex items-baseline justify-between font-ui text-[13px]">
                <span className="text-muted">Coming back on {next.nextDate}</span>
                <span className="font-semibold tabular-nums text-sage">{summary.jarsDueBack}</span>
              </div>
              <p className="font-ui text-[12px] leading-relaxed text-faint">
                Counted from every jar sold against every jar handed back at checkout.
              </p>
            </section>

            <section id="verse" className="flex flex-col gap-2.5 border border-moss-line bg-moss px-5 py-4">
              <div className="flex items-baseline justify-between">
                <h2 className="display m-0 text-[21px]">This week&apos;s verse card</h2>
                <CrossWheat size={26} color="#4f5a35" />
              </div>
              <p className="verse text-[19px] text-ink">&ldquo;{verseOfTheWeek.text}&rdquo;</p>
              <div className="ref !text-[10px] text-sage-deep">{verseOfTheWeek.reference}</div>
              <Link
                href="/owner/verse"
                className="w-fit font-ui text-[12px] font-semibold text-sage-deep underline underline-offset-4 hover:text-brown"
              >
                Change it, or print this week&apos;s cards
              </Link>
            </section>
          </div>
        </div>

        <section id="prayers" className="flex flex-col gap-3 border border-rule bg-paper px-5 py-4">
          <div className="flex items-baseline justify-between">
            <h2 className="display m-0 text-[22px]">Prayer requests</h2>
            <span className="font-ui text-[12px] text-muted">Only you see these</span>
          </div>
          {prayers.length === 0 ? (
            <p className="font-ui text-[13px] text-faint">
              Nothing yet. They appear here when someone writes one at checkout.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {prayers.map((order) => (
                <div key={order.id} className="dashed-frame flex flex-col gap-1.5 bg-cream px-4 py-3">
                  <div className="flex items-baseline justify-between font-ui text-[12px] text-muted">
                    <span className="font-semibold text-ink">{order.name || "A customer"}</span>
                    <span>{shortDate(order.createdAt)}</span>
                  </div>
                  <p className="text-[17px] italic leading-snug">{order.prayer}</p>
                </div>
              ))}
            </div>
          )}
        </section>
    </OwnerShell>
  );
}

/** One delivery day's doorsteps, in the order she should drive them. */
function RunSheet({ area, date, stops }: { area: string; date: string; stops: Order[] }) {
  const left = stops.filter((s) => !s.delivered).length;

  return (
    <section className="border border-rule bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <h2 className="display m-0 text-[22px]">
          {area} · {date}
        </h2>
        <span className="font-ui text-[12px] text-muted">
          {stops.length === 0
            ? "nothing yet"
            : left === 0
              ? "all delivered"
              : `${left} still to deliver`}
        </span>
      </div>

      {stops.length === 0 ? (
        <EmptyRow>Nothing on the list for {date} yet. Orders appear here as they come in.</EmptyRow>
      ) : (
        <>
          <div className="hidden grid-cols-[1.2fr_0.8fr_1.6fr_0.5fr_0.9fr] gap-3 border-t border-rule bg-cream px-5 py-2.5 lg:grid">
            {["Customer", "Area", "Items", "Jars", "Status"].map((h) => (
              <span key={h} className="small-caps !text-[10px] text-faint">
                {h}
              </span>
            ))}
          </div>
          {stops.map((order) => (
            <RunRow key={order.id} order={order} />
          ))}
        </>
      )}
    </section>
  );
}

/** What to bake for one run, biggest batch first. */
function BakeList({ date, rows }: { date: string; rows: BakeRow[] }) {
  // Never divide by a zero top row: that renders width:NaN% and every bar goes.
  const most = Math.max(1, rows[0]?.total ?? 1);

  return (
    <section id="bake" className="flex flex-col gap-3 border border-rule bg-paper px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="display m-0 text-[22px]">Bake for {date}</h2>
        <span className="font-ui text-[12px] text-muted">from orders so far</span>
      </div>
      {rows.length === 0 ? (
        <p className="font-ui text-[13px] text-faint">Nothing ordered for this run yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_90px_28px] items-center gap-3">
                <span className="truncate font-ui text-[13px]">{row.name}</span>
                <span
                  className="h-3 bg-brown"
                  style={{ width: `${Math.max(8, (row.total / most) * 100)}%` }}
                  aria-hidden
                />
                <span className="text-right font-ui text-[13px] font-semibold tabular-nums">{row.total}</span>
              </div>
            ))}
          </div>
          <p className="font-ui text-[12px] text-muted">
            {rows.reduce((n, r) => n + r.total, 0)} units · {rows.reduce((n, r) => n + r.jars, 0)} jars,{" "}
            {rows.reduce((n, r) => n + r.bags, 0)} bags
          </p>
        </>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "moss";
}) {
  return (
    <div
      className={`flex flex-col gap-1 border px-5 py-4 ${
        tone === "moss" ? "border-moss-line bg-moss" : "border-rule bg-paper"
      }`}
    >
      <span className="small-caps">{label}</span>
      <span className="display text-[32px] tabular-nums">{value}</span>
      <span className="font-ui text-[12px] text-muted">{note}</span>
    </div>
  );
}

function RunRow({ order }: { order: Order }) {
  const items = order.items.map((i) => `${i.qty} ${i.name} ${i.format}`).join(", ");
  return (
    <div
      className={`grid grid-cols-1 items-start gap-2 border-t border-rule px-5 py-3.5 lg:grid-cols-[1.2fr_0.8fr_1.6fr_0.5fr_0.9fr] lg:items-center lg:gap-3 ${
        order.delivered ? "bg-paper" : "bg-[#fdf6ea]"
      }`}
    >
      <div className="flex flex-col">
        <span className="font-ui text-[14px] font-semibold">{order.name || "Customer"}</span>
        <span className="font-ui text-[12px] text-muted">{order.address}</span>
        {order.note ? <span className="font-ui text-[12px] italic text-faint">{order.note}</span> : null}
      </div>
      <span className="font-ui text-[13px] text-muted">
        {order.method === "dropoff" ? "Drop-off" : order.area}
      </span>
      <span className="font-ui text-[13px]">
        {items || `${unitsIn(order)} items`}
        {order.blessingBags > 0 ? (
          <span className="text-sage"> · {order.blessingBags} blessing</span>
        ) : null}
      </span>
      <span className="font-ui text-[13px] tabular-nums">
        {order.jarsReturned > 0 ? (
          <span className="font-semibold">{order.jarsReturned} back</span>
        ) : (
          <span className="text-faint">none</span>
        )}
      </span>
      <div className="flex flex-col items-start gap-1">
        <DeliveredToggle orderId={order.id} delivered={order.delivered} />
        <span className="font-ui text-[11px] text-faint tabular-nums">
          {formatCentsExact(order.amountCents)}
        </span>
      </div>
    </div>
  );
}

function Banner({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <p
      role="status"
      className={`px-5 py-4 font-ui text-[14px] leading-relaxed ${
        tone === "warn" ? "border border-brown bg-paper text-brown" : "dashed-frame bg-paper text-bark"
      }`}
    >
      {children}
    </p>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-rule px-5 py-8 text-center font-ui text-[13px] text-faint">{children}</p>
  );
}

function weekNote(current: number, previous: number): string {
  if (previous === 0) return "first week of orders";
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "level with last week";
  return `${change > 0 ? "up" : "down"} ${Math.abs(change)}% on last week`;
}

function shortDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
