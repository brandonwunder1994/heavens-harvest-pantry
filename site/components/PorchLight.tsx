// The porch light, as a visitor sees it.
//
// It sits in the strip at the very top of every page, beside the delivery days,
// which is where a returning customer's eye already goes.
//
// It renders nothing at all when there is nothing honest to say — she has never
// flipped it, or she has not flipped it in three weeks. That is deliberate: an
// empty space is better than a lamp claiming she is baking on the strength of a
// switch nobody has touched since April.
//
// A server component. No JavaScript reaches the browser for this.

import { porchState, defaultNote, type Porch } from '@/lib/porch';

export function PorchLight({ porch }: { porch: Porch }) {
  const state = porchState(porch);
  if (!state.show) return null;

  const words = state.note || defaultNote(state.lit);

  return (
    <span className={`porch ${state.lit ? 'is-lit' : 'is-out'}`}>
      <span className="porch-lamp" aria-hidden="true" />
      <span className="porch-note">{words}</span>
    </span>
  );
}
