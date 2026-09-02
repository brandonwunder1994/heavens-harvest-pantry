// The three things a returning customer sees on their own page.
//
//   <WelcomeBack …/>   a reorder in one tap
//   <JarShelf …/>      a shelf that gains a jar every time one comes back
//   <VerseWall …/>      every card that came in their boxes
//
// All three are server components: nothing here needs the browser except the
// reorder button, which is an ordinary link. Each one says something true when
// there is nothing to show rather than rendering an empty box.
//
// See README.md for where each file goes.

import {
  describeBasket,
  howLong,
  jarsKept,
  shelf,
  shelfLine,
  verseWall,
  welcome,
  type PastOrder,
} from '@/lib/account';

type Verse = { text: string; reference: string };

// ---------------------------------------------------------------- welcome back

/** Beyond this the shelf is drawn as full and the number carries the rest.
    How many fit on a plank is the stylesheet's business: it wraps to whatever
    width it is given, which is the only way it survives a phone. */
const MAX_DRAWN = 70;

export function WelcomeBack({
  name,
  orders,
  reorderHref,
  now,
}: {
  name: string;
  orders: PastOrder[];
  /** Where the one-tap reorder goes — the basket, prefilled. */
  reorderHref: (order: PastOrder['items']) => string;
  now?: Date;
}) {
  const { greeting, usual, sinceDays } = welcome(name, orders, now);

  return (
    <section className="rtn welcome">
      <p className="eyebrow">Your page</p>
      <h2>{greeting}</h2>

      {usual ? (
        <div className="again">
          <div className="what">
            <p>{describeBasket(usual.items)}?</p>
            <p className="when">
              {usual.times > 1
                ? `Your usual — ${usual.times} orders, the last ${howLong(sinceDays)}.`
                : `What you had last time, ${howLong(sinceDays)}.`}
              {usual.area ? ` ${usual.method === 'dropoff' ? 'Collected at' : 'Delivered to'} ${usual.area}.` : ''}
            </p>
          </div>
          <a className="stamp-btn" href={reorderHref(usual.items)}>
            Put it in the basket
          </a>
        </div>
      ) : (
        <p className="first-time">
          Nothing here yet. Once you have ordered once, this is where your usual sits, one tap
          away.
        </p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ jar shelf

export function JarShelf({ orders }: { orders: PastOrder[] }) {
  const total = jarsKept(orders);
  const jars = shelf(orders).slice(0, MAX_DRAWN);

  return (
    <section className="rtn shelf">
      <p className="eyebrow">Your shelf</p>
      <h3>Jars you have brought back</h3>

      {jars.length === 0 ? (
        <div className="empty-board">The shelf is empty, for now.</div>
      ) : (
        <div className="boards">
          {jars.map((jar) => (
            <span className="jar" key={jar.nth} title={`Jar ${jar.nth}`} />
          ))}
        </div>
      )}

      <p className="count">{shelfLine(total)}</p>
      {total > MAX_DRAWN ? (
        <p className="more">
          The shelf holds {MAX_DRAWN}. The other {total - MAX_DRAWN} are in the number.
        </p>
      ) : null}
    </section>
  );
}

// ----------------------------------------------------------------- verse wall

export function VerseWall({
  orders,
  verseFor,
}: {
  orders: PastOrder[];
  /** The shop's own weekly rotation, so the wall cannot disagree with the site. */
  verseFor: (on: Date) => Verse;
}) {
  const cards = verseWall(orders, verseFor);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <section className="rtn wall">
      <p className="eyebrow">Your wall</p>
      <h3>Every card that came with an order</h3>

      {cards.length === 0 ? (
        <p className="nothing">
          The first card arrives in your first box. They hang here after that, in order, with the
          date each one came.
        </p>
      ) : (
        <div className="cards">
          {cards.map((card) => (
            <article className="card" key={card.orderId}>
              <p className="t">&ldquo;{card.verse.text}&rdquo;</p>
              <div className="b">
                <span className="r">{card.verse.reference}</span>
                <span className="d">{fmt(card.on)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
