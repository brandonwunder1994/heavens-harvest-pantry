/**
 * Shared SVG definitions, rendered once in the root layout. Everything that
 * repeats across the site (the mason jar, the olive branch, the cross and
 * wheat mark, the heart from the logo) is referenced with <use href="#id">.
 */
export function Sprite() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 0 0.05 0.08" />
          </feComponentTransfer>
        </filter>

        <pattern id="oats" width="14" height="14" patternUnits="userSpaceOnUse">
          <ellipse cx="4" cy="4" rx="3" ry="2" fill="#c9a06a" />
          <ellipse cx="11" cy="9" rx="2.6" ry="1.8" fill="#a97f4a" transform="rotate(30 11 9)" />
          <circle cx="8" cy="12" r="1.3" fill="#5b3d1e" opacity="0.7" />
        </pattern>

        <path
          id="heart"
          d="M12 21s-7.5-4.6-9.6-9.1C.8 8.3 3 4.5 6.6 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.4C19.5 16.4 12 21 12 21z"
        />

        <g id="crosswheat" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M30 8 v44 M18 22 h24" />
          <path d="M9 52 c 1 -16 5 -24 13 -33" />
          <path d="M51 52 c -1 -16 -5 -24 -13 -33" />
          <g fill="#c9a06a" stroke="none">
            <ellipse cx="12" cy="41" rx="3" ry="4.6" transform="rotate(-22 12 41)" />
            <ellipse cx="15" cy="32" rx="3" ry="4.6" transform="rotate(-22 15 32)" />
            <ellipse cx="19" cy="24" rx="3" ry="4.6" transform="rotate(-22 19 24)" />
            <ellipse cx="48" cy="41" rx="3" ry="4.6" transform="rotate(22 48 41)" />
            <ellipse cx="45" cy="32" rx="3" ry="4.6" transform="rotate(22 45 32)" />
            <ellipse cx="41" cy="24" rx="3" ry="4.6" transform="rotate(22 41 24)" />
          </g>
        </g>

        <g id="branch" fill="none" stroke="#6b7a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 90 C 40 70, 90 40, 170 8" />
          <path d="M34 66 c -12 -14 -8 -30 6 -36 c 8 12 6 28 -6 36 z" fill="#e2e6cf" />
          <path d="M58 54 c 0 -18 12 -28 26 -26 c -2 16 -12 26 -26 26 z" fill="#e2e6cf" />
          <path d="M84 40 c -12 -14 -8 -30 6 -36 c 8 12 6 28 -6 36 z" fill="#e2e6cf" />
          <path d="M110 28 c 0 -18 12 -28 26 -26 c -2 16 -12 26 -26 26 z" fill="#e2e6cf" />
          <path d="M136 16 c -10 -12 -6 -26 6 -30 c 6 10 4 24 -6 30 z" fill="#e2e6cf" />
          <circle cx="48" cy="64" r="2.2" fill="#6b7a4a" />
          <circle cx="98" cy="42" r="2.2" fill="#6b7a4a" />
          <circle cx="124" cy="30" r="1.8" fill="#6b7a4a" />
        </g>

        <clipPath id="jarBody">
          <path d="M48 30v12c0 6-14 10-14 22v122c0 10 8 16 18 16h56c10 0 18-6 18-16V64c0-12-14-16-14-22V30z" />
        </clipPath>

        <g id="jar">
          <rect x="42" y="8" width="76" height="22" rx="4" fill="#f4eee2" stroke="#5b3d1e" strokeWidth="1.6" />
          <path d="M48 14h64M48 24h64" stroke="#5b3d1e" strokeWidth="1" opacity="0.5" />
          <path
            d="M48 30v12c0 6-14 10-14 22v122c0 10 8 16 18 16h56c10 0 18-6 18-16V64c0-12-14-16-14-22V30z"
            fill="#fbf8f1"
            stroke="#5b3d1e"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="30" y="68" width="100" height="140" fill="url(#oats)" clipPath="url(#jarBody)" opacity="0.9" />
          <path d="M42 80v100M118 80v100" stroke="#fff" strokeWidth="3" opacity="0.45" />
          <rect x="50" y="104" width="60" height="62" rx="3" fill="#f4eee2" stroke="#5b3d1e" strokeWidth="1.2" />
          <rect x="54" y="108" width="52" height="54" rx="2" fill="none" stroke="#a9b18a" strokeWidth="0.8" strokeDasharray="2 2" />
          <text
            x="80"
            y="120"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="5.2"
            fontWeight="700"
            letterSpacing="0.8"
            fill="#5b3d1e"
          >
            HEAVEN&apos;S HARVEST
          </text>
          <use href="#heart" transform="translate(76 148) scale(0.34)" fill="#c9a06a" />
        </g>
      </defs>
    </svg>
  );
}

/** Paper grain, laid over the page so the cream reads as stock rather than a fill. */
export function Grain() {
  return (
    <svg
      aria-hidden
      focusable="false"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full mix-blend-multiply"
    >
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

export function CrossWheat({ size = 56, color = "#6b7a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ color }} aria-hidden focusable="false">
      <use href="#crosswheat" />
    </svg>
  );
}

/** The dotted seal from the logo, used as a small section marker. */
export function HeartSeal({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden focusable="false">
      <circle cx="22" cy="22" r="20" fill="none" stroke="#6b7a4a" strokeWidth="1" />
      <circle cx="22" cy="22" r="16" fill="none" stroke="#6b7a4a" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
      <use href="#heart" transform="translate(13 12.5) scale(0.75)" fill="#c9a06a" />
    </svg>
  );
}

export function Jar({
  x,
  y,
  scale = 1,
  label,
}: {
  x: number;
  y: number;
  scale?: number;
  label?: [string, string?];
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <use href="#jar" />
      {label ? (
        <>
          <text
            x="80"
            y="134"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize={label[0].length > 14 ? 8.6 : 9.5}
            fontWeight="600"
            fill="#3a2712"
          >
            {label[0]}
          </text>
          {label[1] ? (
            <text
              x="80"
              y="143"
              textAnchor="middle"
              fontFamily="var(--font-serif)"
              fontSize="9.5"
              fontWeight="600"
              fill="#3a2712"
            >
              {label[1]}
            </text>
          ) : null}
        </>
      ) : null}
    </g>
  );
}
