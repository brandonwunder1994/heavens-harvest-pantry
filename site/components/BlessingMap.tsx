import { fieldsFor, countedIn, type Given } from "@/lib/blessings";

/**
 * Every blessing bag that has gone out, as a warm point over the round it went
 * out on.
 *
 * Not a map of anybody. There are no streets on it, no names in it and no
 * addresses behind it — a point is a dot scattered inside the shape of a
 * delivery area, placed from the payment's own id. Two bags to the same porch
 * are two points in different places.
 *
 * It will look like almost nothing for a long time, and that is honest: it
 * fills itself, one Tuesday at a time.
 */
export function BlessingMap({
  given,
  areas,
}: {
  /** Null when there is no order book to read yet. */
  given: Given[] | null;
  areas: string[];
}) {
  const fields = fieldsFor(given ?? [], areas);
  const total = countedIn(fields);

  // Two areas side by side; more would simply share the width.
  const wide = 720;
  // Tall enough for the round's name and its tally under the circle. At 300 the
  // tally was cut in half by the edge of the drawing.
  const tall = 344;
  const step = wide / fields.length;
  const radius = Math.min(step * 0.36, 118);

  return (
    <figure className="bmap">
      <svg viewBox={`0 0 ${wide} ${tall}`} className="bmap-sheet" role="img"
        aria-label={
          total > 0
            ? `${total} blessing ${total === 1 ? "bag" : "bags"} given, shown as points of light over ${areas.join(" and ")}. No names or addresses.`
            : `A map of ${areas.join(" and ")} with no blessing bags on it yet.`
        }
      >
        <defs>
          <radialGradient id="bmap-glow">
            <stop offset="0%" stopColor="#f0c579" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#dda94f" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#dda94f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bmap-ground">
            <stop offset="0%" stopColor="#efe6d2" />
            <stop offset="100%" stopColor="#efe6d2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {fields.map((field, i) => {
          const cx = step * (i + 0.5);
          const cy = tall * 0.45;
          return (
            <g key={field.area}>
              <circle cx={cx} cy={cy} r={radius} fill="url(#bmap-ground)" />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#d8cbb0"
                strokeWidth="1.2"
                strokeDasharray="5 7"
              />

              {field.lights.map((light, n) => (
                <g key={n}>
                  <circle
                    cx={cx + light.x * radius}
                    cy={cy + light.y * radius}
                    r={17}
                    fill="url(#bmap-glow)"
                    opacity={1 - light.age * 0.55}
                  />
                  <circle
                    cx={cx + light.x * radius}
                    cy={cy + light.y * radius}
                    r={2.6}
                    fill="#b8863c"
                    opacity={1 - light.age * 0.4}
                  />
                </g>
              ))}

              <text x={cx} y={cy + radius + 30} className="bmap-name" textAnchor="middle">
                {field.area}
              </text>
              <text x={cx} y={cy + radius + 50} className="bmap-tally" textAnchor="middle">
                {field.bags === 0 ? "none yet" : `${field.bags} ${field.bags === 1 ? "bag" : "bags"}`}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="bmap-says">
        {given === null
          ? "The map lights up as bags go out. Nothing has gone out yet."
          : total === 0
            ? "No blessing bags yet. The first one lights the first point."
            : `${total} ${total === 1 ? "bag" : "bags"} in the last year. One point each, and not one of them is anybody's address.`}
      </figcaption>
    </figure>
  );
}
