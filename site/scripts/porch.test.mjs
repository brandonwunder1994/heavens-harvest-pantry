// Proves the porch light never says something that is not true.
//
//   npm test
//
// The light is one lamp and four words, so the only thing worth testing is the
// decision behind it: when does it speak, and when does it keep quiet.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  porchState,
  ownerStatus,
  defaultNote,
  flip,
  noPorch,
  TRUSTED_FOR_DAYS,
} from "@/lib/porch.ts";

const DAY = 86_400_000;
const NOW = new Date('2026-09-02T09:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY).toISOString();

// Each check is a named test, so a failure says which rule broke rather than
// only which file did.
function check(label, got, want) {
  test(label, () => assert.deepEqual(got, want));
}

const shown = (porch) => {
  const s = porchState(porch, NOW);
  return s.show ? { lit: s.lit, words: s.note || defaultNote(s.lit) } : null;
};

// ---- she has never touched it ----------------------------------------------
check('never set: says nothing', shown(noPorch), null);
check(
  'never set: her page explains why',
  ownerStatus(noPorch, NOW).headline,
  'The light is off',
);

// ---- lit ---------------------------------------------------------------------
const lit = { lit: true, note: '', flippedAt: daysAgo(0) };
check('flipped on today: lit, with the default words', shown(lit), {
  lit: true,
  words: 'Baking this week',
});

const litWithWords = { lit: true, note: '  Baking Thursday, orders open  ', flippedAt: daysAgo(2) };
check('her own words win, trimmed', shown(litWithWords), {
  lit: true,
  words: 'Baking Thursday, orders open',
});

// ---- out ---------------------------------------------------------------------
check(
  'sold out: out, with the default words',
  shown({ lit: false, note: '', flippedAt: daysAgo(1) }),
  { lit: false, words: 'Sold out this week' },
);

// ---- the rule that matters ----------------------------------------------------
check(
  `still trusted on day ${TRUSTED_FOR_DAYS}`,
  shown({ lit: true, note: '', flippedAt: daysAgo(TRUSTED_FOR_DAYS) }) !== null,
  true,
);
check(
  `gone on day ${TRUSTED_FOR_DAYS + 1}`,
  shown({ lit: true, note: '', flippedAt: daysAgo(TRUSTED_FOR_DAYS + 1) }),
  null,
);
check(
  'a forgotten "sold out" goes too, not just a forgotten "baking"',
  shown({ lit: false, note: '', flippedAt: daysAgo(60) }),
  null,
);
check(
  'her page says the light went out and how to bring it back',
  ownerStatus({ lit: true, note: '', flippedAt: daysAgo(40) }, NOW).headline,
  'The light has gone out',
);
check(
  'she is warned five days before it goes',
  ownerStatus({ lit: true, note: '', flippedAt: daysAgo(TRUSTED_FOR_DAYS - 4) }, NOW).detail.includes(
    'goes away on its own in 4 days',
  ),
  true,
);
check(
  'no warning while there is plenty of time',
  ownerStatus({ lit: true, note: '', flippedAt: daysAgo(2) }, NOW).detail,
  'Everyone can see this at the top of every page.',
);

// ---- things that should not take the site down ---------------------------------
check('a garbled date says nothing rather than crashing', shown({ lit: true, note: '', flippedAt: 'last tuesday' }), null);
check('a missing date says nothing', shown({ lit: true, note: '', flippedAt: null }), null);
check(
  'a clock running behind the save does not hide the light',
  shown({ lit: true, note: '', flippedAt: new Date(NOW.getTime() + 3 * DAY).toISOString() }),
  { lit: true, words: 'Baking this week' },
);

// ---- flipping ------------------------------------------------------------------
const flipped = flip(noPorch, true, '  Baking Thursday  ', NOW);
check('flipping stamps the time', flipped.flippedAt, NOW.toISOString());
check('flipping trims her words', flipped.note, 'Baking Thursday');
check(
  'flipping to sold out keeps the words she already wrote',
  flip({ lit: true, note: 'Back Monday', flippedAt: daysAgo(3) }, false, undefined, NOW).note,
  'Back Monday',
);
