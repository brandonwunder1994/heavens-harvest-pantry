'use client';

// Build your blend, and put a name on the glass.
//
// The list of things you can put in a jar is not a second menu somebody has to
// keep up to date. It is everything she has named as an add-in across her own
// flavours — so every jar this can build is a jar she already bakes, in a batch
// she has already costed, under a label she has already written. When a set of
// choices is not one of hers it says so and names the nearest, rather than
// quietly selling something else.
//
// The jar is a picture of the answer. The answer itself is words and buttons,
// so somebody who never gets the picture can still build a blend, read what it
// would be, and buy it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { basketCrunch } from '@/components/craft/SoundSwitch';
import { stillReason } from '@/components/hero/still';
import { NAME_LIMIT, cleanName, matchBlend, stockOf } from '@/lib/blend';
import { hourFor } from '@/lib/hour';
import { materialFor } from '@/lib/material';
import { money, type Flavor } from '@/lib/content';

type Turn = {
  dispose(): void;
  turn(radians?: number): void;
  setFlavor(flavor: Flavor, look: ReturnType<typeof materialFor>, forWhom?: string): void;
};

/** "pecans and cinnamon", "almonds, honey and sea salt". */
function listed(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function BuildYourBlend({ flavors }: { flavors: Flavor[] }) {
  const { add } = useCart();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turnRef = useRef<Turn | null>(null);

  const [possible, setPossible] = useState(false);
  const [live, setLive] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [who, setWho] = useState('');
  const [added, setAdded] = useState<string | null>(null);

  const stock = useMemo(() => stockOf(flavors), [flavors]);
  const match = useMemo(() => matchBlend(flavors, chosen), [flavors, chosen]);
  const named = cleanName(who);

  // What the jar is showing: what she would actually bake for this.
  const showing = match.exact ?? match.closest ?? flavors[0] ?? null;
  const buyable = match.exact ?? (match.closest && !match.closest.soldOut ? match.closest : null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flavors.length) return;
    if (stillReason()) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPossible(true);
    let cancelled = false;

    (async () => {
      try {
        const [{ createTurn }, data] = await Promise.all([
          import('@/components/hero/turn.js'),
          fetch('/pour.json').then((r) => r.json()),
        ]);
        if (cancelled) return;
        const start = flavors[0];
        turnRef.current = createTurn({
          canvas,
          data,
          flavor: start,
          look: materialFor(start),
          hour: hourFor(new Date()),
        });
        setLive(true);
      } catch (error) {
        if (!cancelled) console.error('[blend] the jar could not start', error);
      }
    })();

    return () => {
      cancelled = true;
      turnRef.current?.dispose();
      turnRef.current = null;
    };
  }, [flavors]);

  useEffect(() => {
    if (!showing) return;
    turnRef.current?.setFlavor(showing, materialFor(showing), named);
  }, [showing, named]);

  if (!flavors.length) return null;

  if (!stock.length) {
    // She has not said what goes in anything yet. Rather than an empty room,
    // say so plainly and send people to the menu.
    return (
      <p className="mx-auto max-w-[640px] px-6 text-[19px] italic leading-snug text-muted">
        She has not written down what goes in each flavor yet, so there is nothing to build with. This
        week&apos;s menu has everything she is baking.
      </p>
    );
  }

  function toggle(item: string) {
    setAdded(null);
    setChosen((prev) => (prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]));
  }

  return (
    <div className="blend">
      <div className="blend-stage" hidden={!possible} data-live={live ? 'yes' : 'no'}>
        <canvas
          ref={canvasRef}
          className="turn-glass"
          tabIndex={0}
          role="img"
          aria-label={
            showing
              ? `A jar of ${showing.name}${named ? `, labelled for ${named}` : ''}. Drag it, or use the arrow keys, to turn it round.`
              : 'A jar'
          }
        />
      </div>

      <div className="blend-choices">
        <fieldset className="blend-set">
          <legend className="small-caps">What would you like in it?</legend>
          <p className="blend-note">Oats, olive oil and a pinch of salt are in every jar. This is the rest.</p>
          <div className="blend-tiles">
            {stock.map((item) => {
              const on = chosen.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  className="blend-tile"
                  aria-pressed={on}
                  onClick={() => toggle(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="blend-set">
          <legend className="small-caps">Whose jar is it?</legend>
          <p className="blend-note">Leave it blank and the label stays as it always is.</p>
          <input
            className="blend-name"
            type="text"
            value={who}
            maxLength={NAME_LIMIT + 8}
            placeholder="A name for the label"
            aria-label="A name for the label"
            onChange={(e) => {
              setWho(e.target.value);
              setAdded(null);
            }}
          />
        </fieldset>

        <div className="blend-verdict" role="status">
          {chosen.length === 0 ? (
            <p className="blend-says">Pick what you would like in it, and she will tell you what that is.</p>
          ) : match.exact ? (
            <p className="blend-says">
              She bakes that. It is her <strong>{match.exact.name}</strong>.
            </p>
          ) : match.closest ? (
            <p className="blend-says">
              She does not bake exactly that. The nearest is her <strong>{match.closest.name}</strong>
              {match.missing.length ? <> — no {listed(match.missing)}</> : null}
              {match.extra.length ? <>{match.missing.length ? ', and it has ' : ' — it has '}{listed(match.extra)} in it too</> : null}.
              {match.closest.soldOut ? <> It is sold out this week.</> : null}
            </p>
          ) : (
            <p className="blend-says">Nothing she bakes is close to that. Have a look at this week&apos;s menu.</p>
          )}

          {buyable ? (
            <button
              type="button"
              className="stamp !min-h-11 !px-6 !text-[11px]"
              onClick={() => {
                add(buyable.slug, 'jar', 1, named);
                basketCrunch();
                setAdded(`${buyable.name}${named ? ` for ${named}` : ''}`);
              }}
            >
              Add {match.exact ? 'that jar' : `her ${buyable.name}`} · {money(buyable.jarPrice)}
            </button>
          ) : null}

          {added ? <p className="blend-added">{added} is in your basket.</p> : null}
        </div>
      </div>
    </div>
  );
}
