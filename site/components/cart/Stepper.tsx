"use client";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  tone = "brown",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  tone?: "brown" | "gold";
}) {
  const border = tone === "gold" ? "border-gold" : "border-brown";
  const ink = tone === "gold" ? "text-gold" : "text-brown";

  return (
    <div className={`flex items-center border ${border}`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`One fewer ${label}`}
        className={`flex h-11 w-11 items-center justify-center font-ui text-[20px] leading-none ${ink} disabled:opacity-35`}
      >
        &minus;
      </button>
      <span
        aria-live="polite"
        className={`min-w-11 text-center font-ui text-[18px] font-semibold ${ink}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`One more ${label}`}
        className={`flex h-11 w-11 items-center justify-center font-ui text-[20px] leading-none ${ink} disabled:opacity-35`}
      >
        +
      </button>
    </div>
  );
}
