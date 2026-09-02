import { Jar } from "@/components/Sprite";

/** The three jars on their shelf. Framed tighter on small screens so the
 *  drawing stays legible instead of shrinking to a smudge. */
export function HeroShelf({ labels }: { labels: string[] }) {
  return (
    <>
      <svg
        viewBox="270 10 770 360"
        className="mx-auto h-auto w-full max-w-[560px] lg:hidden"
        aria-hidden
        focusable="false"
      >
        <Shelf labels={labels} />
      </svg>

      <svg viewBox="0 0 1296 500" className="hidden h-auto w-full lg:block" aria-hidden focusable="false">
        <use href="#branch" transform="translate(30 130) scale(1.6)" />
        <use href="#branch" transform="translate(1266 130) scale(-1.6 1.6)" />
        <Shelf labels={labels} />
        <g transform="translate(1176 410)">
          <circle r="66" fill="none" stroke="#5b3d1e" strokeWidth="1.2" />
          <circle r="60" fill="none" stroke="#5b3d1e" strokeWidth="0.8" strokeDasharray="3 3" />
          <path id="seal-ring" d="M -46 0 a 46 46 0 1 1 92 0 a 46 46 0 1 1 -92 0" fill="none" />
          <text
            fontFamily="var(--font-display)"
            fontSize="9.5"
            fontWeight="600"
            letterSpacing="2.4"
            fill="#5b3d1e"
          >
            <textPath href="#seal-ring">MADE IN A HOME KITCHEN · SMALL BATCH · VISTANCIA ARIZONA · </textPath>
          </text>
          <use href="#heart" transform="translate(-12 -13)" fill="#c9a06a" />
        </g>
        <text x="110" y="400" fontFamily="var(--font-serif)" fontSize="22" fontStyle="italic" fill="#5a4530">
          Drawn by hand, until the photographs are taken.
        </text>
      </svg>
    </>
  );
}

/** A name split across the two lines a jar label holds. */
export function jarLabel(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [words[0] ?? "", ""];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}

function Shelf({ labels }: { labels: string[] }) {
  const [one, two, three] = labels;
  return (
    <>
      <Jar x={300} y={60} scale={1.22} label={jarLabel(one ?? "")} />
      <Jar x={548} y={30} scale={1.42} label={jarLabel(two ?? "")} />
      <Jar x={820} y={60} scale={1.22} label={jarLabel(three ?? "")} />
      <path d="M180 320 H1116" stroke="#5b3d1e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M200 328 H1096" stroke="#5b3d1e" strokeWidth="1" opacity="0.4" />
      <ellipse cx="380" cy="330" rx="4" ry="2.5" fill="#c9a06a" />
      <ellipse cx="470" cy="333" rx="3" ry="2" fill="#a97f4a" />
      <ellipse cx="760" cy="331" rx="4" ry="2.5" fill="#c9a06a" />
      <ellipse cx="950" cy="334" rx="3" ry="2" fill="#a97f4a" />
    </>
  );
}
