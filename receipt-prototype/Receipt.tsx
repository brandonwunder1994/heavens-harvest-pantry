// The receipt, as the customer sees it the moment they have paid.
//
// It is a kitchen ticket: the same shape as the one that goes up over her oven,
// with the week's verse below the perforation. People screenshot a beautiful
// receipt, and this is the first thing every customer keeps.
//
// A server component. No JavaScript reaches the browser for it, and it prints
// on its own — everything else on the page drops away.

import { formatMoney } from '@/lib/cart';
import { business } from '@/lib/content';
import { creditShortfallCents, stamp, whatHappensNext, type Receipt as Ticket } from '@/lib/receipt';

export function Receipt({ receipt }: { receipt: Ticket }) {
  const shortfall = creditShortfallCents(receipt);

  return (
    <article className="ticket" aria-label="Your order">
      <div className="head">
        <p className="shop">{business.name}</p>
        <p className="where">Baked Thursday mornings in {business.kitchen}</p>
        <p className="kind">Order ticket</p>
        <p className="stamp">
          <span className="no">No. {receipt.number}</span>
          <span>{stamp(receipt.placedAt)}</span>
        </p>
      </div>

      <div className="who">
        <p className="name">{receipt.firstName ? `For ${receipt.firstName}` : 'For you'}</p>
        {receipt.runArea && receipt.runDate ? (
          <p className="run">
            {receipt.method === 'dropoff' ? 'Collect at' : 'Delivering to'} {receipt.runArea}
            {' · '}
            {receipt.runDate}
          </p>
        ) : null}
      </div>

      <div className="lines">
        {receipt.lines.map((line, i) => (
          <div className="line" key={`${line.what}-${i}`}>
            <span className="qty">{line.qty}&times;</span>
            <span className="what">{line.what}</span>
            <i className="dots" aria-hidden="true" />
            <span className="amt">{formatMoney(line.cents)}</span>
          </div>
        ))}

        {receipt.jarCreditCents > 0 ? (
          <div className="line credit">
            <span className="qty">{receipt.jarsReturned}&times;</span>
            <span className="what">Jar back, thank you</span>
            <i className="dots" aria-hidden="true" />
            <span className="amt">&minus;{formatMoney(receipt.jarCreditCents)}</span>
          </div>
        ) : null}
      </div>

      {shortfall > 0 ? (
        <p className="shortfall">
          {formatMoney(shortfall)} of your jar credit did not fit on this order &mdash; an order has
          to come to something.
        </p>
      ) : null}

      <div className="total">
        <span className="label">Paid</span>
        <span className="amt">{formatMoney(receipt.totalCents)}</span>
      </div>

      {receipt.pointsEarned > 0 ? (
        <p className="points">
          <span>Points earned</span>
          <b>+{receipt.pointsEarned}</b>
        </p>
      ) : null}
      {receipt.pointsBalance !== null && receipt.pointsBalance > 0 ? (
        <p className="points">
          <span>Your total</span>
          <b>{receipt.pointsBalance}</b>
        </p>
      ) : null}

      <p className="next">{whatHappensNext(receipt)}</p>

      {receipt.porchNote ? (
        <p className="porch">
          <span>Your note to her</span>
          {receipt.porchNote}
        </p>
      ) : null}

      <div className="perf" aria-hidden="true" />

      <div className="verse">
        <p>&ldquo;{receipt.verse.text}&rdquo;</p>
        <p className="ref">{receipt.verse.reference}</p>
        <p className="aside">This week&rsquo;s card, tucked in with your order.</p>
      </div>

      <p className="foot">
        {business.name}
        <br />
        {business.phone}
      </p>
    </article>
  );
}
