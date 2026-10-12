import type { FlavorMarkId } from "@/lib/flavor-marks";
import { FLAVOR_MARKS } from "@/lib/flavor-marks";

/**
 * Custom botanical stamps, drawn for this pantry. Preview keeps the sage ink;
 * the thermal PNG is the same picture in black so the head does not dither.
 */

type MarkProps = {
  color: string;
  paper: string;
  size?: number;
};

const PRINT_INKS = new Set(["#1a1208", "#000000", "#000"]);

export function FlavorMark({
  id,
  color,
  size = 30,
}: MarkProps & { id: FlavorMarkId }) {
  const print = PRINT_INKS.has(color.toLowerCase());
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flavor-marks/${id}.png?v=1`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        objectFit: "contain",
        filter: print ? "grayscale(1) contrast(1.6) brightness(0)" : undefined,
      }}
    />
  );
}

export function FlavorMarkRow({
  ids,
  color,
  paper,
  size = 42,
}: MarkProps & { ids: FlavorMarkId[] }) {
  if (!ids.length) return null;
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 10,
      }}
    >
      <span style={{ display: "block", width: 16, height: 1, background: color }} />
      {ids.map((id) => (
        <FlavorMark key={id} id={id} color={color} paper={paper} size={size} />
      ))}
      <span style={{ display: "block", width: 16, height: 1, background: color }} />
    </div>
  );
}

export function FlavorMarkPicker({
  selected,
  preview = [],
  onChange,
  color = "#6b7a4a",
  paper = "#fbf8f1",
}: {
  selected: FlavorMarkId[];
  preview?: FlavorMarkId[];
  onChange: (next: FlavorMarkId[]) => void;
  color?: string;
  paper?: string;
}) {
  const showing = selected.length ? selected : preview;
  const toggle = (id: FlavorMarkId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((row) => row !== id));
      return;
    }
    if (selected.length >= 3) return;
    onChange([...selected, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {showing.length ? (
          <div className="flex items-center gap-2" aria-hidden>
            {showing.map((id) => (
              <FlavorMark key={id} id={id} color={color} paper={paper} size={32} />
            ))}
          </div>
        ) : (
          <span className="font-ui text-[13px] text-faint">The name has not named a fruit or nut yet.</span>
        )}
        {selected.length ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="font-ui text-[13px] text-brown underline underline-offset-4"
          >
            Use the name
          </button>
        ) : null}
      </div>
      <details className="font-ui text-[13px]">
        <summary className="cursor-pointer text-brown underline underline-offset-4">
          Choose different pictures
        </summary>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FLAVOR_MARKS.filter((spec) => spec.id !== "oat").map((spec) => {
            const on = selected.includes(spec.id);
            const full = selected.length >= 3 && !on;
            return (
              <button
                key={spec.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(spec.id)}
                title={spec.label}
                className={`flex h-12 min-w-12 items-center justify-center border px-2 ${
                  on
                    ? "border-sage bg-moss text-sage-deep"
                    : "border-sand bg-paper text-brown hover:border-gold"
                } ${full ? "opacity-40" : ""}`}
              >
                <FlavorMark id={spec.id} color={on ? color : "#5b3d1e"} paper={paper} size={28} />
                <span className="sr-only">{spec.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-ui text-[12px] leading-relaxed text-faint">
          Up to three, in the order they should sit on the label. A new flavor picks these up from
          its name unless you pin different ones here.
        </p>
      </details>
    </div>
  );
}
