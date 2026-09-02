// Proves the ticket cannot disagree with what was charged.
//
//   node build.mjs && node check-receipt.mjs
//
// The receipt is mostly presentation, so what is worth testing is the small
// amount that is not: the number people read down a phone, the jar credit that
// did not fit, and the sentence about what happens next — which must never
// invent a delivery day that was not recorded.

import { receiptFrom, ticketNumber, creditShortfallCents, subtotalCents, whatHappensNext, stamp } from './receipt.js';

const verse = { text: 'Taste and see that the Lord is good.', reference: 'Psalm 34 : 8' };

let ran = 0;
let failed = 0;
function check(label, got, want) {
  ran++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
}

const build = (meta, items, total, balance = null, id = 'cs_test_a1b2c3d4e5f6g7h8QK4T9K') =>
  receiptFrom({ id, created: 1788350400, amount_total: total, metadata: meta }, items, verse, balance);

// ---- the number ---------------------------------------------------------------
check('the ticket number is short and readable', ticketNumber('cs_test_a1b2c3d4e5f6g7h8QK4T9K'), 'QK4-T9K');
check('live and test payments number the same way', ticketNumber('cs_live_zzzzzzzzzzzzABCDEF'), 'ABC-DEF');
check('the same payment always gets the same number', ticketNumber('cs_test_xxxxxxHH8N4C'), ticketNumber('cs_test_xxxxxxHH8N4C'));
check('a short or odd id does not produce a fake number', ticketNumber('cs_test_ab'), 'PENDING');

// ---- the money ----------------------------------------------------------------
{
  const r = build(
    { customer_name: 'Sarah Keller', method: 'delivery', run_area: 'Vistancia', run_date: 'Tue Sep 8', points_earned: '42' },
    [
      { description: 'Honey Almond Crunch · bag', quantity: 2, amount_total: 2600 },
      { description: 'Maple Pecan · mason jar', quantity: 1, amount_total: 1600 },
    ],
    4200,
    72,
  );
  check('the lines add up to what was charged', subtotalCents(r), r.totalCents);
  check('no jar credit means no credit line', r.jarCreditCents, 0);
  check('nothing is owed back', creditShortfallCents(r), 0);
  check('the first name is used, not the whole name', r.firstName, 'Sarah');
  check('points are carried through', [r.pointsEarned, r.pointsBalance], [42, 72]);
}

// ---- jars back, and the floor --------------------------------------------------
{
  const r = build(
    { customer_name: 'Marcus Hale', method: 'dropoff', run_area: 'the Anthem market', run_date: 'Fri Sep 11',
      jars_returned: '7', jar_credit_cents: '1200', jar_credit_asked_cents: '1400', points_earned: '1' },
    [{ description: 'Honey Almond Crunch · bag', quantity: 1, amount_total: 1300 }],
    100,
    108,
  );
  check('the credit that came off is what is shown', r.jarCreditCents, 1200);
  check('the part that did not fit is worked out', creditShortfallCents(r), 200);
  check('the lines, the credit and the total agree', subtotalCents(r) - r.jarCreditCents, r.totalCents);
  check(
    'collection reads as collection, not delivery',
    whatHappensNext(r),
    'She bakes Monday, and it is waiting for you at the Anthem market on Fri Sep 11. Leave your 7 jars out and she will take them.',
  );
}

// ---- one jar reads as one jar ----------------------------------------------------
{
  const r = build(
    { method: 'delivery', run_area: 'Anthem', run_date: 'Fri Sep 11', jars_returned: '1', jar_credit_cents: '200' },
    [{ description: 'Cinnamon Apple · bag', quantity: 1, amount_total: 1400 }],
    1200,
  );
  check(
    'one jar is singular all the way through',
    whatHappensNext(r),
    'She bakes Monday, and it is on your porch in Anthem on Fri Sep 11. Leave your 1 jar out and she will take it.',
  );
}

// ---- what it must never invent -----------------------------------------------------
{
  const r = build({ points_earned: '13' }, [{ description: 'Cinnamon Apple · bag', quantity: 1, amount_total: 1300 }], 1300);
  check(
    'with no run recorded it promises no day',
    whatHappensNext(r),
    'She bakes Monday and will text you when she sets out.',
  );
  check('with no name it does not guess one', r.firstName, '');
  check('a balance that has not landed stays absent, not zero', r.pointsBalance, null);
  check('an unknown method is not assumed to be delivery', r.method, null);
}

// ---- payments that arrive half-formed -------------------------------------------
{
  const r = receiptFrom({ id: 'cs_test_xxxxxxWD5X1F' }, [], verse);
  check('no metadata at all does not throw', r.lines.length, 0);
  check('no metadata means no invented total', r.totalCents, 0);
  check('a missing timestamp still stamps a real date', Number.isNaN(r.placedAt.getTime()), false);
  check('rubbish in the numbers reads as zero, not NaN',
    receiptFrom({ id: 'cs_test_xxxxxxWD5X1F', metadata: { points_earned: 'lots', jars_returned: '' } }, [], verse).pointsEarned, 0);
}

// ---- the stamp -------------------------------------------------------------------
check(
  'the date and time print like a docket',
  /^[A-Z][a-z]{2} \d{1,2}, \d{4} · \d{1,2}:\d{2} (AM|PM)$/.test(stamp(new Date('2026-09-02T15:04:00'))),
  true,
);

console.log(`\n${ran - failed}/${ran} checks passed`);
process.exitCode = failed ? 1 : 0;
