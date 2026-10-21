/** Slow, decorative confetti behind the page heading. Purely for fun, hidden from screen readers. */
const COLORS = ["#c9a06a", "#6b7a4a", "#5b3d1e", "#a9b18a", "#e2c48f"];

const bits = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 6 + ((i * 5) % 7),
  color: COLORS[i % COLORS.length],
  delay: `${-((i * 1.7) % 11).toFixed(1)}s`,
  dur: `${8 + ((i * 3) % 6)}s`,
  drift: `${((i % 2 ? 1 : -1) * (14 + ((i * 7) % 30)))}px`,
  wide: i % 3 === 0,
}));

export function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((bit, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: bit.left,
            width: bit.wide ? bit.size * 1.6 : bit.size,
            height: bit.size,
            background: bit.color,
            ["--dur" as string]: bit.dur,
            ["--delay" as string]: bit.delay,
            ["--drift" as string]: bit.drift,
          }}
        />
      ))}
    </div>
  );
}
