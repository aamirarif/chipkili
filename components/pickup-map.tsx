/**
 * Approximate pickup area: an OpenStreetMap view of the town with a circle, never a pin on
 * an address. The map is centered on the town center, not the pickup address.
 */
export function PickupMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const d = 0.035;
  const bbox = [lng - d * 1.4, lat - d, lng + d * 1.4, lat + d].map((n) => n.toFixed(4)).join(",");
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-cream-2">
      <iframe
        title={`Map of the ${label} area`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
        className="pointer-events-none h-full w-full border-0 grayscale-[30%]"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-kili bg-kili/15" />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow"
      >
        Get directions to the area
      </a>
    </div>
  );
}
