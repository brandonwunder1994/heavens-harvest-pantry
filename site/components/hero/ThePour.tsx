'use client';

// Drop-in hero for the Heaven's Harvest Pantry site.
//
//   <ThePour>
//     <h1>Made slow, in a real kitchen.</h1>
//     ...
//   </ThePour>
//
// The children are the words. They stay hidden until the granola has settled,
// then rise into place.
//
// Everything, without the graphics: before three.js is asked for, still.js
// decides whether this visitor should get it at all. Anyone on an old phone, a
// metered connection, or with motion switched off is shown a photograph of the
// identical scene instead, and the 177 KB is never requested. The page reads
// the same either way, and nobody is told they are missing anything.
//
// See README.md for the files this needs beside it.

import { useEffect, useRef, useState } from 'react';
import { stillReason, showStill } from './still';

type Pour = { dispose(): void; seek(t: number): void };

export default function ThePour({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [still, setStill] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ground = stillRef.current;
    if (!canvas || !ground) return;

    // Asked first, and answered without downloading anything.
    const reason = stillReason();
    if (reason) {
      // Deciding this needs the browser, so it cannot happen any earlier than
      // here. Setting it once on mount is the whole point of the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStill(reason);
      setShown(true);
      ground.classList.add('on');
      showStill(ground, { base: '/still/' });
      return;
    }

    let pour: Pour | null = null;
    let cancelled = false;

    // The blurred ground is already the right colour and costs no request, so
    // there is no empty rectangle while the scene boots.
    ground.classList.add('on');

    (async () => {
      try {
        const [{ createPour }, data] = await Promise.all([
          import('./pour.js'),
          fetch('/pour.json').then((r) => r.json()),
        ]);
        if (cancelled) return;
        pour = createPour({ canvas, data, onFinish: () => setShown(true) });

        // A review hatch, the same way still.js has one: `?pour=1.4` freezes the
        // scene at that second so a screenshot is the same image every time.
        // The site never sets it, and without it nothing here runs.
        const frozen = new URLSearchParams(window.location.search).get('pour');
        if (frozen !== null) {
          const at = Number(frozen);
          if (Number.isFinite(at)) {
            pour.seek(at);
            setShown(true);
          }
        }
        // Two frames, so the first real one is already on screen.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => ground.classList.remove('on'))
        );
      } catch (error) {
        if (cancelled) return;
        // The photograph covers the visitor either way, but a scene that fails
        // silently is a scene nobody ever fixes.
        console.error('[pour] the scene could not start', error);
        setStill('failed');
        setShown(true);
        ground.classList.add('on');
        showStill(ground, { base: '/still/' });
      }
    })();

    // If anything stalls, the words arrive on their own and the photograph is
    // fetched then, and only then. Nobody waits for a scene that is not coming.
    const failsafe = window.setTimeout(() => {
      if (cancelled) return;
      setShown(true);
      if (!pour) {
        setStill('stalled');
        ground.classList.add('on');
        showStill(ground, { base: '/still/' });
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      pour?.dispose();
    };
  }, []);

  return (
    <section
      className={className ? `the-pour ${className}` : 'the-pour'}
      data-pour={shown ? 'settled' : 'pouring'}
      data-still={still ?? undefined}
    >
      <canvas
        ref={canvasRef}
        className="scene"
        aria-hidden="true"
        style={{ display: still ? 'none' : 'block' }}
      />
      <div className="still" ref={stillRef} aria-hidden="true" />
      <noscript>
        {/* With JavaScript off there is no scene and nothing to wait for, so
            the words are simply there, over the photograph. */}
        <style>{'.the-pour canvas.scene{display:none}.the-pour .words{opacity:1;transform:none}'}</style>
        <picture>
          <source media="(orientation: portrait)" srcSet="/still/counter-tall.webp" />
          <img className="still-photo in" src="/still/counter-wide.webp" alt="" aria-hidden="true" />
        </picture>
      </noscript>
      <div className="words">{children}</div>
    </section>
  );
}
