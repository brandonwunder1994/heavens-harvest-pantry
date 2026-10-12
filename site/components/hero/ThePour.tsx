'use client';

// Drop-in hero for the Heaven's Harvest Pantry site.
//
//   <ThePour>
//     <h1>Made slow, in a real kitchen.</h1>
//     ...
//   </ThePour>
//
// The words are in the first paint. The granola pours behind them. Anyone on
// an old phone, a metered connection, or with motion switched off is shown a
// photograph of the identical scene instead, and the moving pieces are never
// requested.
//
// The light follows the visitor's own clock: low gold in the morning, overhead
// at midday, amber before dinner, one warm bulb after dark.

import { useEffect, useRef, useState } from 'react';
import { stillReason, showStill } from './still';
import { hourFor, isHour } from '@/lib/hour';

type Pour = {
  dispose(): void;
  seek(t: number): void;
  start(): void;
  stage: { setHour(name: string): boolean };
};

let pourAssets: ReturnType<typeof loadPour> | null = null;

function loadPour() {
  return import('./live-pour').then(async (mod) => {
    const flakes = await mod.preloadPour();
    return { mod, flakes };
  });
}

function loadPourAssets() {
  pourAssets ??= loadPour();
  return pourAssets;
}

export default function ThePour({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState<string | null>(null);
  const [hour, setHour] = useState<string | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const ground = stillRef.current;
    if (!scene || !canvas || !ground) return;

    const reason = stillReason();
    if (reason) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStill(reason);
      showStill(ground, { base: '/still/' });
      return;
    }

    const assets = loadPourAssets();

    let pour: Pour | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { mod, flakes } = await assets;
        if (cancelled) return;
        pour = mod.createPour({ scene, canvas, flakes });

        const search = new URLSearchParams(window.location.search);
        const asked = search.get('hour');
        const lit = isHour(asked) ? asked : hourFor(new Date());
        pour.stage.setHour(lit);
        setHour(lit);

        const frozen = search.get('pour');
        if (frozen !== null) {
          const at = Number(frozen);
          if (Number.isFinite(at)) pour.seek(at);
        }
        pour.start();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => ground.classList.add('off'))
        );
      } catch (error) {
        if (cancelled) return;
        console.error('[pour] the scene could not start', error);
        setStill('failed');
        ground.classList.remove('off');
        showStill(ground, { base: '/still/' });
      }
    })();

    const failsafe = window.setTimeout(() => {
      if (cancelled || pour) return;
      showStill(ground, { base: '/still/' });
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      pour?.dispose();
    };
  }, []);

  return (
    <section
      className={className ? `the-pour ${className}` : 'the-pour'}
      data-still={still ?? undefined}
      data-hour={hour ?? undefined}
    >
      <div
        ref={sceneRef}
        className="scene"
        aria-hidden="true"
        style={{ display: still ? 'none' : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="plate wide" src="/hero/plate-wide.webp" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="plate tall" src="/hero/plate-tall.webp" alt="" />
        <div className="jar-stack">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="jar-empty" src="/hero/jar-empty.png" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="jar-fill" src="/hero/jar-filled.png" alt="" />
          <div className="steam" />
        </div>
        <canvas ref={canvasRef} className="flakes" />
      </div>
      <div className="still" ref={stillRef} aria-hidden="true" />
      <noscript>
        <style>{'.the-pour .scene{display:none}.the-pour .words{animation:none}'}</style>
        <picture>
          <source media="(orientation: portrait)" srcSet="/still/counter-tall.webp" />
          <img className="still-photo in" src="/still/counter-wide.webp" alt="" aria-hidden="true" />
        </picture>
      </noscript>
      <div className="words">{children}</div>
    </section>
  );
}
