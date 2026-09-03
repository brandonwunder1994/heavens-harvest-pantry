'use client';

// The jar at the top of the menu, and the row of her flavours under it.
//
// Point at a flavour and the granola in the glass becomes it. Turn the jar over
// and the ingredients and allergens are on the back, where they are on a real
// jar.
//
// Nothing here is the only copy of anything. Every flavour, every ingredient
// and every allergen is written out in plain text further down the page, so a
// visitor who never gets the jar — no WebGL, a metered connection, motion
// switched off, JavaScript off — is not missing a word of it. That is why the
// fallback is simply the drawing of three jars that was here before.

import { useEffect, useRef, useState } from 'react';
import { stillReason } from '@/components/hero/still';
import { hourFor } from '@/lib/hour';
import { materialFor } from '@/lib/material';
import { money, type Flavor } from '@/lib/content';

type Turn = {
  dispose(): void;
  turn(radians?: number): void;
  setFlavor(flavor: Flavor, look: ReturnType<typeof materialFor>): void;
};

export function TurnTheJar({
  flavors,
  children,
}: {
  flavors: Flavor[];
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turnRef = useRef<Turn | null>(null);
  // Two separate questions. `possible` is whether this visitor should be given
  // a jar at all, answered on mount without downloading a thing — the drawing
  // stays for anyone it says no to. `live` is whether the jar has arrived yet,
  // which only fades it in.
  const [possible, setPossible] = useState(false);
  const [live, setLive] = useState(false);
  const [at, setAt] = useState(() => Math.max(0, flavors.findIndex((f) => !f.soldOut)));

  const chosen = flavors[at] ?? flavors[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flavors.length) return;
    if (stillReason()) return;

    // Said before the scene is asked for, so the canvas is on the page and has
    // a real size by the time anything measures it.
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

        const first = flavors[Math.max(0, flavors.findIndex((f) => !f.soldOut))] ?? flavors[0];
        turnRef.current = createTurn({
          canvas,
          data,
          flavor: first,
          look: materialFor(first),
          hour: hourFor(new Date()),
        });
        setLive(true);
      } catch (error) {
        // The drawing below is already on the page and says everything this
        // does, so nothing is lost — but a jar that quietly never appears is a
        // jar nobody ever fixes.
        if (!cancelled) console.error('[jar] the jar could not start', error);
      }
    })();

    return () => {
      cancelled = true;
      turnRef.current?.dispose();
      turnRef.current = null;
    };
  }, [flavors]);

  useEffect(() => {
    if (!chosen) return;
    turnRef.current?.setFlavor(chosen, materialFor(chosen));
  }, [chosen]);

  if (!flavors.length) return null;

  return (
    <div className="turn" data-live={live ? 'yes' : 'no'} data-jar={possible ? 'yes' : 'no'}>
      {/* The drawing that was always here. It stays for anyone who is not being
          given the jar, and it says nothing the page does not also say. */}
      {possible ? null : <div className="turn-still">{children}</div>}

      <div className="turn-stage" hidden={!possible}>
        <canvas
          ref={canvasRef}
          className="turn-glass"
          tabIndex={0}
          role="img"
          aria-label={`A jar of ${chosen.name}. Drag it, or use the left and right arrow keys, to turn it round and read the back.`}
        />
        <div className="turn-tools">
          <button
            type="button"
            className="turn-round"
            onClick={() => turnRef.current?.turn()}
          >
            Turn it round
          </button>
          <span className="turn-hint">Ingredients and allergens are on the back</span>
        </div>
      </div>

      <div className="turn-picks" role="group" aria-label="Show a flavor in the jar" hidden={!possible}>
        {flavors.map((flavor, i) => (
          <button
            key={flavor.slug}
            type="button"
            className="turn-pick"
            aria-pressed={i === at}
            data-sold-out={flavor.soldOut ? 'yes' : undefined}
            onPointerEnter={() => setAt(i)}
            onFocus={() => setAt(i)}
            onClick={() => {
              setAt(i);
              document.getElementById(flavor.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="turn-pick-name">{flavor.name}</span>
            <span className="turn-pick-price">
              {flavor.soldOut ? 'sold out' : `jar ${money(flavor.jarPrice)}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
