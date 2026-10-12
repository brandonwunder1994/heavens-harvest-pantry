/** The real kitchen. Same photograph on the home story and the Our story page. */
export function KitchenPhoto() {
  return (
    <div className="dashed-frame bg-paper p-2.5">
      {/* The file is already the display size we need. Next's optimizer was
          recompressing it at quality 75 and cropping a tall slice, which is
          why the last upload still looked soft. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kitchen-hd.jpg"
        alt="The home kitchen in Vistancia where Heaven's Harvest granola is baked."
        width={1024}
        height={653}
        className="block h-auto w-full"
      />
    </div>
  );
}
