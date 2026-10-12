'use client';

// Her switch, for her own page.
//
// Two buttons and a line of her own words. It shows her the exact thing a
// customer will see before she saves it, and it tells her when the light is
// about to go out on its own, because a light that expires silently is a
// light she will be surprised by.
//
// It saves through the same action every other block on her page uses, so
// there is nothing new to trust.

import { useActionState, useState, useCallback } from 'react';
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { SaveBar } from '@/components/owner/SaveBar';
import { defaultNote, flip, ownerStatus, type Porch } from '@/lib/porch';

export function PorchSwitch({ porch }: { porch: Porch }) {
  const [state, action] = useActionState(saveBlock, idle);
  const [dirty, setDirty] = useState(false);
  const settled = useCallback(() => setDirty(false), []);
  const [lit, setLit] = useState<boolean | null>(porch.lit);
  const [note, setNote] = useState(porch.note);
  // Her words are hers. Flipping the switch never rewrites them â€” it only asks
  // her to look at them again, because "Baking Thursday" under an unlit lamp is
  // exactly the kind of thing this feature exists to prevent.
  const [recheck, setRecheck] = useState(false);

  function choose(value: boolean) {
    setDirty(true);
    setRecheck(note.trim().length > 0 && value !== lit);
    setLit(value);
  }

  const status = ownerStatus(porch);
  const showing = lit === null ? null : note.trim() || defaultNote(lit);

  // The saved shape is rebuilt here so the timestamp is stamped at the moment
  // she saves, which is the whole basis of the light going out on its own.
  const value = JSON.stringify(lit === null ? porch : flip(porch, lit, note));

  return (
    <form action={action} className="porch-switch">
      <input type="hidden" name="key" value="porch" />
      <input type="hidden" name="value" value={value} />

      <div className={`status is-${status.tone}`}>
        <span className={`porch ${status.tone === 'lit' ? 'is-lit' : 'is-out'}`} aria-hidden="true">
          <span className="porch-lamp" />
        </span>
        <div>
          <h4>{status.headline}</h4>
          <p>{status.detail}</p>
        </div>
      </div>

      <div className="choices" role="group" aria-label="The porch light">
        <button
          type="button"
          className="choice"
          data-state="lit"
          aria-pressed={lit === true}
          onClick={() => choose(true)}
        >
          <span className="dot" aria-hidden="true" />
          Baking this week · message only
        </button>
        <button
          type="button"
          className="choice"
          data-state="out"
          aria-pressed={lit === false}
          onClick={() => choose(false)}
        >
          <span className="dot" aria-hidden="true" />
          Sold out this week · message only
        </button>
      </div>

      <label className={recheck ? 'field recheck' : 'field'}>
        <span>Say it in your own words, if you like</span>
        <input
          type="text"
          value={note}
          maxLength={64}
          onChange={(event) => {
            setDirty(true);
            setNote(event.target.value);
            setRecheck(false);
          }}
          placeholder={lit === false ? 'Sold out â€” back Thursday' : 'Baking Thursday, orders open'}
        />
        {recheck ? (
          <span className="recheck-note" role="status">
            Your words did not change. Do they still fit?
          </span>
        ) : null}
        <span className="hint">
          Leave it empty and it reads &ldquo;{defaultNote(lit ?? true)}&rdquo;. Keep it short: it
          sits on one line at the top of every page.
        </span>
      </label>

      <div className="preview">
        <span>What everyone will see</span>
        {showing ? (
          <span className={`porch ${lit ? 'is-lit' : 'is-out'}`}>
            <span className="porch-lamp" aria-hidden="true" />
            <span className="porch-note">{showing}</span>
          </span>
        ) : (
          <span className="empty">Nothing yet â€” choose one above.</span>
        )}
      </div>

      <SaveBar state={state} label="Save storefront message" dirty={dirty} onSaved={settled} />
    </form>
  );
}
