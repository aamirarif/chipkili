export type Point = { lat: number; lng: number };

export const TEANECK: Point & { label: string; zip: string } = {
  lat: 40.8932,
  lng: -74.0116,
  label: "Teaneck, NJ",
  zip: "07666",
};

const EARTH_MILES = 3958.8;

export function milesBetween(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

export function formatMiles(mi: number): string {
  if (mi < 1) return "under 1 mi";
  return `${Math.round(mi)} mi`;
}

/** Towns an item can be listed in (approximate centers, never a street address). */
export const TOWNS: Record<string, Point> = {
  "Teaneck, NJ": { lat: 40.8932, lng: -74.0116 },
  "Hackensack, NJ": { lat: 40.8859, lng: -74.0435 },
  "Englewood, NJ": { lat: 40.8929, lng: -73.9726 },
  "Bergenfield, NJ": { lat: 40.9276, lng: -73.9974 },
  "Fort Lee, NJ": { lat: 40.8509, lng: -73.9701 },
  "Paramus, NJ": { lat: 40.9445, lng: -74.0754 },
  "Lyndhurst, NJ": { lat: 40.812, lng: -74.1243 },
  "Ridgefield Park, NJ": { lat: 40.857, lng: -74.0215 },
};

export type VisitorLocation = Point & { label: string; zip?: string; source: "cookie" | "ip" | "default" };

export const LOCATION_COOKIE = "ck_loc";

export function parseLocationCookie(raw: string | undefined): VisitorLocation | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<VisitorLocation>;
    if (typeof v.lat === "number" && typeof v.lng === "number" && Math.abs(v.lat) <= 90 && Math.abs(v.lng) <= 180) {
      return { lat: v.lat, lng: v.lng, label: String(v.label ?? "Your location").slice(0, 60), zip: v.zip, source: "cookie" };
    }
  } catch {
    /* ignore bad cookie */
  }
  return null;
}

/** Cookie first, then Cloudflare visitor-location headers, then Teaneck. */
export function resolveLocation(cookieValue: string | undefined, headers: Headers): VisitorLocation {
  const fromCookie = parseLocationCookie(cookieValue);
  if (fromCookie) return fromCookie;
  const lat = Number(headers.get("cf-iplatitude"));
  const lng = Number(headers.get("cf-iplongitude"));
  if (lat && lng) {
    const city = headers.get("cf-ipcity");
    const region = headers.get("cf-region-code");
    return {
      lat,
      lng,
      label: city ? `${city}${region ? `, ${region}` : ""}` : "Near you",
      zip: headers.get("cf-postal-code") ?? undefined,
      source: "ip",
    };
  }
  return { lat: TEANECK.lat, lng: TEANECK.lng, label: TEANECK.label, zip: TEANECK.zip, source: "default" };
}
