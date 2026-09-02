// The small drawings this page uses. Stroke-based, they take their colour from
// whatever they sit inside, and they scale without going fuzzy.

export function Mark({ size = 112 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M30 8 v44 M18 22 h24" />
        <path d="M9 52 c 1 -16 5 -24 13 -33" />
        <path d="M51 52 c -1 -16 -5 -24 -13 -33" />
      </g>
      <g fill="#c9a06a">
        <ellipse cx="12" cy="41" rx="3" ry="4.6" transform="rotate(-22 12 41)" />
        <ellipse cx="15" cy="32" rx="3" ry="4.6" transform="rotate(-22 15 32)" />
        <ellipse cx="19" cy="24" rx="3" ry="4.6" transform="rotate(-22 19 24)" />
        <ellipse cx="48" cy="41" rx="3" ry="4.6" transform="rotate(22 48 41)" />
        <ellipse cx="45" cy="32" rx="3" ry="4.6" transform="rotate(22 45 32)" />
        <ellipse cx="41" cy="24" rx="3" ry="4.6" transform="rotate(22 41 24)" />
      </g>
    </svg>
  );
}

export function Door() {
  return (
    <svg width="18" height="21" viewBox="0 0 44 52" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 46 V10 c0 -2 2 -4 4 -4 h20 c2 0 4 2 4 4 v36" />
      <path d="M2 46 h40" />
      <path d="M20 6 v40" />
      <circle cx="26" cy="28" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="10" viewBox="0 0 15 10" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M1 5 h12 M9 1 l4 4 -4 4" />
    </svg>
  );
}

export function ArrowLeft() {
  return (
    <svg width="15" height="10" viewBox="0 0 15 10" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M14 5 H2 M6 1 L2 5 l4 4" />
    </svg>
  );
}
