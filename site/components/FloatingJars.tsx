"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import Link from "@/components/ShopLink";
import { type Flavor } from "@/lib/content";
import { JAR_PHOTO, bagPhotoFor, jarMarkName, packPhotoFor } from "@/lib/jars";
import { type SizeOz, sizeLabel } from "@/lib/products";
import "./floating-jars.css";

type Card = Flavor & { src: string; lineupOnly: boolean };

/**
 * The lineup: one bag of each flavor, floating. The shadow lives under the
 * bag, not in the picture, so it can spread as the bag lifts.
 */
export function FloatingJars({ flavors, title = "The Lineup", id = "float-shelf" }: { flavors: Flavor[]; title?: string; id?: string }) {
  const lineup = flavors.map(flavor => ({ ...flavor, lineupOnly: false }));
  const cards = lineup
    .map((flavor) => {
      const src = bagPhotoFor(flavor);
      return src ? { ...flavor, src } : null;
    })
    .filter((row): row is Card => row !== null);

  const [hot, setHot] = useState<string | null>(null);

  if (!cards.length) return null;

  return (
    <section className="float-shelf" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="float-title">
        {title}
      </h2>
      <div className="float-row" data-hot={hot ? "yes" : "no"}>
        {cards.map((flavor, i) => (
          <FloatingJar
            key={flavor.slug}
            flavor={flavor}
            delay={i}
            quiet={hot !== null && hot !== flavor.slug}
            linked={!flavor.lineupOnly}
            onHot={setHot}
            format="bag"
            mark="none"
            sizeOz={16}
            caption
          />
        ))}
      </div>
    </section>
  );
}

export function FloatingJar({
  flavor,
  featured = false,
  delay = 0,
  quiet = false,
  tone = "cream",
  linked = true,
  format = "jar",
  mark = "full",
  sizeOz,
  caption = false,
  onSelect,
  onHot,
}: {
  flavor: Flavor;
  featured?: boolean;
  delay?: number;
  quiet?: boolean;
  tone?: "cream" | "brown";
  linked?: boolean;
  format?: "jar" | "bag" | "sampler";
  mark?: "full" | "logo" | "none";
  sizeOz?: SizeOz;
  /** Print the flavor name under the pack. Every bag wears the same sticker. */
  caption?: boolean;
  onSelect?: () => void;
  onHot?: (slug: string | null) => void;
}) {
  const src = packPhotoFor(flavor, format);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 28 });
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const label = jarMarkName(flavor.name);
  if (!src) return <span className="float-placeholder">{label}</span>;
  const isBag = format !== "jar";
  const size = sizeOz ?? (format === "sampler" ? 3 : 16);
  const shared = {
    className: "float-card",
    "data-featured": featured ? "yes" : "no",
    "data-quiet": quiet ? "yes" : "no",
    "data-tone": tone,
    "data-sold-out": flavor.soldOut ? "yes" : undefined,
    "data-mark": mark,
    "data-pack": format,
    "data-size": isBag ? size : undefined,
    "data-linked": linked || onSelect ? "yes" : "no",
    "aria-label": isBag ? `${sizeLabel(size)} bag of ${label}` : `A jar of ${label}`,
    style: {
      "--bob-delay": `${delay * 0.45}s`,
      "--rx": `${tilt.x}deg`,
      "--ry": `${tilt.y}deg`,
      "--shine-x": `${shine.x}%`,
      "--shine-y": `${shine.y}%`,
      "--pack-scale": isBag ? (size === 3 ? 0.6 : size === 8 ? 0.8 : 1) : 1,
    } as CSSProperties,
    onPointerEnter: () => onHot?.(flavor.slug),
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      const box = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;
      setTilt({ x: (0.5 - py) * 8, y: (px - 0.5) * 12 });
      setShine({ x: px * 100, y: py * 100 });
    },
    onPointerLeave: () => {
      onHot?.(null);
      setTilt({ x: 0, y: 0 });
      setShine({ x: 50, y: 28 });
    },
    onFocus: () => onHot?.(flavor.slug),
    onBlur: () => onHot?.(null),
  };

  const inner = (
    <>
      <span className="float-pack-slot"><span className="float-pack">
      <span className="float-bob">
        <span className="float-stage">
          <Image
            src={src}
            alt=""
            width={JAR_PHOTO.width}
            height={JAR_PHOTO.height}
            className="float-photo"
            sizes="(max-width: 640px) 240px, 320px"
            quality={90}
            loading={featured ? "eager" : "lazy"}
            onLoad={() => setLoadedSrc(src)}
          />
          {!isBag && mark !== "none" && loadedSrc === src ? (
            <span className="float-mark">
              <Image src="/logo.webp" alt="" width={72} height={72} className="float-mark-logo" />
              {mark === "full" ? <span className="float-mark-name">{label}</span> : null}
            </span>
          ) : null}
          <span className="float-shine" aria-hidden />
          <span className="float-glow" aria-hidden />
        </span>
      </span>
      <span className="float-shadow" aria-hidden />
      </span></span>
      {caption ? <span className="float-caption">{label}</span> : null}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" {...shared} onClick={onSelect}>
        {inner}
      </button>
    );
  }

  if (!linked) {
    return <div {...shared}>{inner}</div>;
  }

  return (
    <Link href={`/menu#${flavor.slug}`} {...shared}>
      {inner}
    </Link>
  );
}
