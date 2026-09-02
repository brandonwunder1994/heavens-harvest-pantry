// The craft pass: two small things people feel and cannot name.
//
//   <Paper>…</Paper>     the verse card, pressed into cotton stock
//   <OvenTimer />        what shows while something is really being waited for
//
// Both are server components: no JavaScript reaches the browser for either.
// The switch that turns the one sound on lives beside this, in SoundSwitch.tsx,
// because a switch is a switch.

// ------------------------------------------------------------------ the paper

export function Paper({
  verse,
  from,
  className,
}: {
  verse: { text: string; reference: string };
  /** The line under the rule, e.g. "Tucked in with your order, week of 31 August". */
  from?: string;
  className?: string;
}) {
  return (
    <article className={className ? `paper ${className}` : 'paper'}>
      <p className="verse inked">&ldquo;{verse.text}&rdquo;</p>
      <p className="ref inked">{verse.reference}</p>
      {from ? <p className="from">{from}</p> : null}
    </article>
  );
}

// ------------------------------------------------------------- the oven timer

/** The circumference of the dial, so the wind-down is exact rather than eyeballed. */
const DIAL_R = 36;
const DIAL_C = 2 * Math.PI * DIAL_R;

export function OvenTimer({
  /** What is being waited for, in her words. Kept short. */
  said = 'A moment',
  size = 96,
}: {
  said?: string;
  size?: number;
}) {
  // Twelve marks, four of them long, like a real dial.
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const major = i % 3 === 0;
    const outer = 44;
    const inner = major ? 36 : 39;
    return {
      i,
      major,
      x1: 50 + Math.cos(angle) * inner,
      y1: 50 + Math.sin(angle) * inner,
      x2: 50 + Math.cos(angle) * outer,
      y2: 50 + Math.sin(angle) * outer,
    };
  });

  return (
    <div className="timer" role="status" aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ ['--dash' as string]: DIAL_C.toFixed(1) }}
      >
        {/* the winding knob on top */}
        <rect className="knob" x="45" y="1" width="10" height="7" rx="2" />
        <circle className="face" cx="50" cy="50" r="43" />
        <circle className="bezel" cx="50" cy="50" r="47" />

        {ticks.map((t) => (
          <line
            key={t.i}
            className={t.major ? 'tick tick-major' : 'tick'}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
          />
        ))}

        {/* the wound spring, unwinding */}
        <circle className="wound" cx="50" cy="50" r={DIAL_R} />

        <line className="hand" x1="50" y1="50" x2="50" y2="19" />
        <circle className="nub" cx="50" cy="50" r="4" />
      </svg>
      <span className="said">{said}</span>
    </div>
  );
}
