'use client';

// The one sound, and the switch that turns it off.
//
// On unless this browser has said otherwise. It still only fires when
// something goes into the basket, so a first visit is quiet until then.

import { useEffect, useState } from 'react';
import { crunch, preview, setSound, soundIsOn } from '@/lib/crunch';

// -------------------------------------------------------------- the one sound

export function SoundSwitch({ label = 'Sound' }: { label?: string }) {
  // Rendered on to match the default, then corrected once the browser has been
  // asked. A switch that flicks itself off for someone who already said no is
  // honest; one that flicks itself on is not.
  const [on, setOn] = useState(true);
  useEffect(() => {
    // Whether sound is on is kept in this browser, so it cannot be known until
    // the browser is there to ask. On is the honest answer until then.
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
 * sound. Silent only if somebody has switched it off.
 */
export const basketCrunch = crunch;
