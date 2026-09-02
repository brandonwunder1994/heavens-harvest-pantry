// Proves the four reasons to come back.
//
//   npm test
//
// What is worth testing here is what each piece does when the data is thin or
// odd: somebody with no orders, somebody whose habit is changing, two orders in
// one week, and an email that must not claim she is baking when nobody said so.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  basketKey, describeBasket, howLong, jarsKept, newestFirst,
  shelf, shelfLine, theUsual, verseWall, welcome,
} from "@/lib/account.ts";
import {
  asHtml, asText, jarLine, kitchenLine, linkLabel, pointsLine, subject, worthSending,
} from "@/lib/sunday-note.ts";

const NOW = new Date('2026-09-02T09:00:00Z');
const daysAgo = (n) => Math.floor(NOW.getTime() / 1000) - n * 86400;

// Each check is a named test, so a failure says which rule broke rather
// than only which file did.
function check(label, got, want) {
  test(label, () => assert.deepEqual(got, want));
}

const HA = 'Honey Almond Crunch', MP = 'Maple Pecan', DC = 'Dark Chocolate Sea Salt';
const order = (id, days, items, jars = 0, area = 'Vistancia', method = 'delivery') =>
  ({ id, createdAt: daysAgo(days), method, area, runDate: '', jarsReturned: jars, items });

// ---- their usual ---------------------------------------------------------------
{
  const regular = [
    order('a', 6, [{ qty: 2, name: HA, format: 'bag' }], 2),
    order('b', 27, [{ qty: 2, name: HA, format: 'bag' }], 2),
    order('c', 48, [{ qty: 1, name: MP, format: 'jar' }], 0),
    order('d', 72, [{ qty: 2, name: HA, format: 'bag' }], 1),
  ];
  const usual = theUsual(regular);
  check('the usual is the basket they buy most', describeBasket(usual.items), 'two bags of Honey Almond Crunch');
  check('and it knows how many times', usual.times, 3);
  check('and when they last had it', usual.lastAt, daysAgo(6));
}
{
  // Two baskets, once each. The newer one wins: a habit that is changing is
  // followed rather than argued with.
  const twice = [
    order('new', 19, [{ qty: 1, name: DC, format: 'jar' }], 1),
    order('old', 63, [{ qty: 2, name: MP, format: 'bag' }], 0),
  ];
  check('a tie goes to the more recent basket', describeBasket(theUsual(twice).items), 'a jar of Dark Chocolate Sea Salt');
}
check('nobody with no orders gets a usual', theUsual([]), null);
check('an order with nothing in it is not a usual', theUsual([order('x', 3, [], 1)]), null);

check('the same basket in a different order is the same basket',
  basketKey([{ qty: 1, name: MP, format: 'jar' }, { qty: 2, name: HA, format: 'bag' }]),
  basketKey([{ qty: 2, name: HA, format: 'bag' }, { qty: 1, name: MP, format: 'jar' }]));

// ---- how it reads ----------------------------------------------------------------
check('one bag reads as a bag, not 1 bags',
  describeBasket([{ qty: 1, name: HA, format: 'bag' }]), 'a bags of Honey Almond Crunch'.replace('bags', 'bag'));
check('three things are joined with an and',
  describeBasket([
    { qty: 2, name: HA, format: 'bag' },
    { qty: 1, name: MP, format: 'jar' },
    { qty: 3, name: DC, format: 'bag' },
  ]),
  'two bags of Honey Almond Crunch, a jar of Maple Pecan and three bags of Dark Chocolate Sea Salt');

check('yesterday is yesterday', howLong(1), 'yesterday');
check('today is today', howLong(0), 'earlier today');
check('a fortnight is weeks, not days', howLong(21), '3 weeks ago');
check('half a year is months', howLong(180), '6 months ago');
check('never ordered says nothing at all', howLong(null), '');

// ---- welcome back ------------------------------------------------------------------
{
  const w = welcome('Sarah Keller', [order('a', 6, [{ qty: 2, name: HA, format: 'bag' }], 2)], NOW);
  check('the greeting uses the first name only', w.greeting, 'Welcome back, Sarah.');
  check('and counts the days honestly', w.sinceDays, 6);
}
check('with no name it does not guess one', welcome('', [], NOW).greeting, 'Welcome back.');
check('with no orders there is nothing to offer again', welcome('Sarah', [], NOW).usual, null);
check('and no days to count', welcome('Sarah', [], NOW).sinceDays, null);

// ---- the shelf --------------------------------------------------------------------
{
  const orders = [order('a', 6, [], 2), order('b', 40, [], 1), order('c', 90, [], 3)];
  check('every jar returned is on the shelf', shelf(orders).length, 6);
  check('the shelf fills oldest first', shelf(orders)[0].at, daysAgo(90));
  check('and they are numbered as they came back', shelf(orders).map((j) => j.nth), [1, 2, 3, 4, 5, 6]);
  check('the total is the total', jarsKept(orders), 6);
  check('the line under it is a real number', shelfLine(6), '6 jars kept out of the landfill, and $12 off along the way.');
}
check('an empty shelf invites rather than apologises', shelfLine(0), 'Bring a jar back and the first one lands here.');
check('one jar is singular', shelfLine(1), 'One jar kept out of the landfill, and two dollars off.');
check('a nonsense jar count cannot go negative', jarsKept([order('a', 1, [], -4)]), 0);

// ---- the wall ----------------------------------------------------------------------
{
  const verseFor = (on) => ({ text: `week of ${on.getMonth() + 1}/${on.getDate()}`, reference: 'X 1:1' });
  const orders = [order('a', 6, [], 0), order('b', 40, [], 0), order('c', 90, [], 0)];
  check('one card per order', verseWall(orders, verseFor).length, 3);
  check('newest first', verseWall(orders, verseFor)[0].orderId, 'a');

  // Two orders in the same week shared one card, so the wall shows one.
  const sameWeek = [order('mon', 6, [], 0), order('thu', 3, [], 0)];
  check('two orders in one week share a card', verseWall(sameWeek, verseFor).length, 1);
}
check('no orders means no wall, not an empty one', verseWall([], () => null), []);

check('newestFirst does not disturb the list it was given', (() => {
  const list = [order('a', 40, [], 0), order('b', 6, [], 0)];
  newestFirst(list);
  return list[0].id;
})(), 'a');

// ---- the Sunday note ------------------------------------------------------------------
const note = (over = {}) => ({
  firstName: 'Sarah',
  verse: { text: 'Taste and see that the Lord is good.', reference: 'Psalm 34:8' },
  points: 72, toNextBag: 28, bagsWaiting: 0, jarsKept: 12,
  baking: true, bakingNote: '',
  accountUrl: 'https://example.test/rewards/me',
  unsubscribeUrl: 'https://example.test/rewards/stop?t=x',
  shopName: "Heaven's Harvest Pantry", ownerName: 'her name',
  ...over,
});

check('it never claims she is baking unless the light says so', kitchenLine(note({ baking: null })), '');
check('sold out is said plainly', kitchenLine(note({ baking: false })), 'She is sold out this week, so the oven is off until next.');
check('her own words win when she wrote some', kitchenLine(note({ bakingNote: 'Baking Thursday, orders open.' })), 'Baking Thursday, orders open.');

check('the subject leads with a free bag when there is one', subject(note({ bagsWaiting: 2 })), "This week's verse, and a free bag waiting for you");
check('otherwise it leads with the baking', subject(note()), "This week's verse, and she is baking");
check('and with nothing else, just the verse', subject(note({ baking: null })), "This week's verse");

check('points are only mentioned when there are some', pointsLine(note({ points: 0, bagsWaiting: 0 })), '');
check('a waiting bag is spelled out', pointsLine(note({ bagsWaiting: 1 })), 'You have a free bag waiting. She will put it in with your next order.');
check('two waiting bags read as two', pointsLine(note({ bagsWaiting: 2 })), 'You have 2 free bags waiting. She will put them in with your next order.');
check('jars are only mentioned once there are some', jarLine(note({ jarsKept: 0 })), '');
check('one jar is singular here too', jarLine(note({ jarsKept: 1 })), 'One jar back so far. It is on your shelf.');

check('a note with no verse is not worth sending', worthSending(note({ verse: { text: '   ', reference: '' } })), false);
check('a verse on its own is', worthSending(note({ points: 0, jarsKept: 0, baking: null })), true);

{
  const text = asText(note());
  const html = asHtml(note());
  check('the plain-words version carries the verse', text.includes('Taste and see that the Lord is good.'), true);
  check('the plain-words version carries an unsubscribe', text.includes('https://example.test/rewards/stop?t=x'), true);
  check('the html version carries an unsubscribe', html.includes('rewards/stop'), true);
  check('the html uses tables, which is what email clients render', html.includes('<table role="presentation"'), true);
  check('and inline styles, not a stylesheet', html.includes('<style'), false);
  const bare = asText(note({ points: 0, bagsWaiting: 0, jarsKept: 0, baking: null }));
  check('somebody with nothing but a verse is told nothing about points', bare.includes('free bag'), false);
  check('and nothing about a shelf', bare.includes('shelf'), false);
  check('the link is named for what is actually behind it',
    linkLabel(note({ points: 0, bagsWaiting: 0, jarsKept: 0 })), 'Your page');
  check('points but no jars names points only',
    linkLabel(note({ jarsKept: 0 })), 'Your wall and your points');
  check('both named when both are there', linkLabel(note()), 'Your wall, your points and your shelf');
  check('a name with a quote in it cannot break the html',
    asHtml(note({ firstName: 'Sa"rah<' })).includes('Sa&quot;rah&lt;'), true);
}
