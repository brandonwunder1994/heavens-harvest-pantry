import { LABEL_COTTAGE, LABEL_HEIGHT_PX, LABEL_WIDTH_PX, formatPackedDate } from "@/lib/label";
import type { Verse } from "@/lib/content";
import type { FlavorMarkId } from "@/lib/flavor-marks";
import { FlavorMarkRow } from "@/components/owner/FlavorMarks";

/**
 * Landscape 80mm × 50mm T50M Pro label at 203 DPI (640 × 384). Letterhead:
 * brand up top, flavor name a little below it, custom botanical stamps for
 * what it is, verse, then legal copy balanced with the QR. Print is black on
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
  tone: "preview" | "print";
  marks?: FlavorMarkId[];
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
  tone,
  marks = [],
}: LabelPreviewProps) {
  const color = palettes[tone];
  const qrSrc = tone === "print" ? "/qr-print.svg?v=6" : "/qr.svg?v=6";
  const packed = formatPackedDate(producedDate);
  const name = title.trim() || "Granola";
  const longTitle = name.length > 22;
  const verse = scripture.text.trim();
  const reference = scripture.reference.trim();

  return (
    <article
      data-label-tone={tone}
      aria-label={`${name} granola label`}
      style={{
        boxSizing: "border-box",
        width: LABEL_WIDTH_PX,
        height: LABEL_HEIGHT_PX,
        padding: 8,
        background: color.paper,
        color: color.ink,
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          boxSizing: "border-box",
          height: "100%",
          border: `1.5px solid ${color.rule}`,
          padding: 14,
          display: "flex",
          flexDirection: "row",
          gap: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Lockup color={color} />

            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display), Cinzel, serif",
                fontSize: longTitle ? 22 : 26,
                fontWeight: 600,
                letterSpacing: "0.04em",
                lineHeight: 1.08,
                textAlign: "center",
                textWrap: "balance",
                maxWidth: "18ch",
                color: color.ink,
              }}
            >
              {name}
            </h1>

            <FlavorMarkRow ids={marks} color={color.rule} paper={color.paper} size={42} />

            {verse ? (
              <blockquote
                style={{
                  margin: "8px auto 0",
                  padding: 0,
                  border: 0,
                  maxWidth: "36ch",
                  textAlign: "center",
                }}
              >
                <p
                  className="verse"
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-serif), 'Cormorant Garamond', Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 12,
                    lineHeight: 1.25,
                    color: color.ink,
                  }}
                >
                  &ldquo;{verse}&rdquo;
                </p>
                {reference ? (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontFamily: "var(--font-display), Cinzel, serif",
                      fontSize: 8,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: color.rule,
                    }}
                  >
                    {reference}
                  </p>
                ) : null}
              </blockquote>
            ) : null}
          </div>

          <div style={{ flex: 1, minHeight: 12 }} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                maxWidth: "52ch",
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 9,
                lineHeight: 1.28,
                color: color.mute,
              }}
            >
              {ingredients.trim() || "—"}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                maxWidth: "52ch",
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 8,
                lineHeight: 1.25,
                color: color.faint,
              }}
            >
              Contains {allergens.trim() || "—"}
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                fontVariantNumeric: "tabular-nums",
                color: color.mute,
              }}
            >
              {netWeight.trim() || "Net Wt"} · Packed {packed}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 8,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: color.rule,
              }}
            >
              {LABEL_COTTAGE}
            </p>
          </div>
        </div>

        <div aria-hidden style={{ width: 1, alignSelf: "stretch", background: color.rule }} />

        <div
          style={{
            width: 128,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              boxSizing: "border-box",
              padding: 4,
              border: `1px solid ${color.rule}`,
              background: color.paper,
            }}
          >
            {/* Gold heart in the quiet center. Print is a 1-bit twin. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="" width={104} height={104} style={{ display: "block", width: 104, height: 104 }} />
          </div>
          {tracker.trim() ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui), Karla, sans-serif",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontVariantNumeric: "tabular-nums",
                textAlign: "center",
                color: color.ink,
                overflowWrap: "anywhere",
              }}
            >
              {tracker.trim()}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Lockup({ color }: { color: Palette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display), Cinzel, serif",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: color.ink,
        }}
      >
        Heaven&apos;s Harvest
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "block", width: 24, height: 1, background: color.rule }} />
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display), Cinzel, serif",
            fontSize: 7,
            fontWeight: 600,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: color.rule,
          }}
        >
          Pantry
        </p>
        <span style={{ display: "block", width: 24, height: 1, background: color.rule }} />
      </div>
    </div>
  );
}
