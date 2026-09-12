import { LABEL_COTTAGE, LABEL_HEIGHT_PX, LABEL_WIDTH_PX, formatPackedDate } from "@/lib/label";
import type { Verse } from "@/lib/content";

/**
 * One 50mm × 80mm T50M Pro label, drawn at the printer's own 203 DPI canvas
 * (384 × 640). Preview uses the shop's cream and brown; print is black on
 * white so the thermal head does not dither.
 */

export type LabelPreviewProps = {
  title: string;
  ingredients: string;
  allergens: string;
  scripture: Verse;
  netWeight: string;
  producedDate: string;
  tracker: string;
  qrDataUrl: string;
  tone: "preview" | "print";
};

type Palette = {
  paper: string;
  ink: string;
  mute: string;
  rule: string;
  faint: string;
};

const palettes: Record<LabelPreviewProps["tone"], Palette> = {
  preview: {
    paper: "#fbf8f1",
    ink: "#3a2712",
    mute: "#5b3d1e",
    rule: "#6b7a4a",
    faint: "#6f6047",
  },
  print: {
    paper: "#ffffff",
    ink: "#1a1208",
    mute: "#1a1208",
    rule: "#1a1208",
    faint: "#1a1208",
  },
};

export function LabelPreview({
  title,
  ingredients,
  allergens,
  scripture,
  netWeight,
  producedDate,
  tracker,
  qrDataUrl,
  tone,
}: LabelPreviewProps) {
  const color = palettes[tone];
  const packed = formatPackedDate(producedDate);
  const longTitle = title.trim().length > 22;

  return (
    <article
      data-label-tone={tone}
      aria-label={`${title} granola label`}
      style={{
        boxSizing: "border-box",
        width: LABEL_WIDTH_PX,
        height: LABEL_HEIGHT_PX,
        padding: "16px 18px 14px",
        display: "flex",
        flexDirection: "column",
        background: color.paper,
        color: color.ink,
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <LabelMark color={color.rule} />
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-ui), Karla, sans-serif",
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: color.rule,
          }}
        >
          Heaven&apos;s Harvest Pantry
        </p>
      </header>

      <Hairline color={color.rule} solid={tone === "print"} />

      <h1
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display), Cinzel, serif",
          fontSize: longTitle ? 20 : 24,
          fontWeight: 600,
          letterSpacing: "0.04em",
          lineHeight: 1.08,
          textAlign: "center",
          textWrap: "balance",
          color: color.ink,
        }}
      >
        {title.trim() || "Granola"}
      </h1>

      <section style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        <Block label="Ingredients" body={ingredients} color={color} />
        <Block label="Allergens" body={allergens} color={color} />
      </section>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "var(--font-ui), Karla, sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          color: color.mute,
        }}
      >
        <span>{netWeight.trim() || "Net Wt"}</span>
        <span>Packed {packed}</span>
      </div>

      <Hairline color={color.rule} solid={tone === "print"} />

      {scripture.text.trim() ? (
        <blockquote style={{ margin: "8px 0 0", padding: 0, border: 0 }}>
          <p
            className="verse"
            style={{
              margin: 0,
              fontFamily: "var(--font-serif), 'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              fontSize: 13,
              lineHeight: 1.22,
              textAlign: "center",
              color: color.ink,
            }}
          >
            &ldquo;{scripture.text.trim()}&rdquo;
          </p>
          {scripture.reference.trim() ? (
            <p
              style={{
                margin: "5px 0 0",
                fontFamily: "var(--font-display), Cinzel, serif",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textAlign: "center",
                color: color.rule,
              }}
            >
              {scripture.reference.trim()}
            </p>
          ) : null}
        </blockquote>
      ) : null}

      <Hairline color={color.rule} solid={tone === "print"} />

      <footer
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "108px 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            background: color.paper,
            border: `1px solid ${color.rule}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {qrDataUrl ? (
            // The QR is generated as a data URL so html-to-image can rasterize it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" width={100} height={100} style={{ display: "block", width: 100, height: 100 }} />
          ) : (
            <span style={{ fontFamily: "var(--font-ui), Karla, sans-serif", fontSize: 8, color: color.faint }}>QR</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-ui), Karla, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: color.rule,
            }}
          >
            Scan to reorder
          </p>
          {tracker.trim() ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                fontVariantNumeric: "tabular-nums",
                color: color.ink,
                overflowWrap: "anywhere",
              }}
            >
              {tracker.trim()}
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 10,
                color: color.faint,
              }}
            >
              No tracker yet
            </p>
          )}
        </div>
      </footer>

      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-ui), Karla, sans-serif",
          fontSize: 8,
          letterSpacing: "0.06em",
          textAlign: "center",
          color: color.faint,
        }}
      >
        {LABEL_COTTAGE}
      </p>
    </article>
  );
}

function Hairline({ color, solid = false }: { color: string; solid?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        marginTop: 8,
        height: 1,
        background: color,
        opacity: solid ? 1 : 0.55,
      }}
    />
  );
}

function Block({
  label,
  body,
  color,
}: {
  label: string;
  body: string;
  color: Palette;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minHeight: 0 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-ui), Karla, sans-serif",
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: color.rule,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-ui), Karla, sans-serif",
          fontSize: 10.5,
          lineHeight: 1.32,
          color: color.ink,
        }}
      >
        {body.trim() || "—"}
      </p>
    </div>
  );
}

/** Cross and wheat, inlined so a PNG capture does not depend on the page sprite. */
function LabelMark({ color }: { color: string }) {
  return (
    <svg width={26} height={26} viewBox="0 0 60 60" aria-hidden focusable="false">
      <g fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <path d="M30 8 v44 M18 22 h24" />
        <path d="M9 52 c 1 -16 5 -24 13 -33" />
        <path d="M51 52 c -1 -16 -5 -24 -13 -33" />
      </g>
      <g fill={color}>
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
