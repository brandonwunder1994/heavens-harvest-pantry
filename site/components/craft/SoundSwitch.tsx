'use client';

// The one sound, and the switch that turns it on.
//
// Off on a first visit, always. Nobody's first visit makes a noise.

import { useEffect, useState } from 'react';
import { crunch, preview, setSound, soundIsOn } from '@/lib/crunch';

// -------------------------------------------------------------- the one sound

export function SoundSwitch({ label = 'Sound' }: { label?: string }) {
  // Rendered off on the server, then corrected once the browser has been asked.
  // Never the other way round: a switch that flicks itself on is worse than one
  // that takes a beat to flick itself off.
  const [on, setOn] = useState(false);
  useEffect(() => {
    // Whether sound is on is kept in this browser, so it cannot be known until
    // the browser is there to ask. Off is the honest answer until then.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(soundIsOn());
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSound(next);
    // Hearing what you have just turned on is the whole reason anybody trusts
    // the switch. Turning it off, obviously, is silent.
    if (next) preview();
  }

  return (
    <div className="sound">
      <button type="button" role="switch" aria-checked={on} onClick={toggle}>
        <span className="sr-only">{on ? `${label} on` : `${label} off`}</span>
      </button>
      <span className="label" aria-hidden="true">
        {label} &middot; {on ? 'on' : 'off'}
      </span>
    </div>
  );
}

/**
 * Call this wherever something goes into the basket. It decides for itself
 * whether to make a noise, so the basket does not have to know anything about
 * sound. Silent unless somebody has switched it on.
 */
export const basketCrunch = crunch;
