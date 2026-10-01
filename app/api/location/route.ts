import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCATION_COOKIE } from "lib/geo";
import { fail, limited, sameOrigin, clientIp } from "lib/http";

const Body = z.union([
  z.object({ zip: z.string().regex(/^\d{5}$/) }),
  z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
]);

/** Sets the visitor's location cookie from a ZIP (looked up once) or from the browser's location. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  if (limited(`loc:${clientIp(req)}`, 30, 3600_000)) return fail(429, "Too many requests.");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Enter a 5-digit ZIP.");

  let loc: { lat: number; lng: number; label: string; zip?: string };
  if ("zip" in parsed.data) {
    const zip = parsed.data.zip;
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { next: { revalidate: 60 * 60 * 24 * 30 } }).catch(() => null);
    if (!res?.ok) return fail(400, "We could not find that ZIP.");
    const d = (await res.json()) as { places?: { "place name": string; "state abbreviation": string; latitude: string; longitude: string }[] };
    const p = d.places?.[0];
    if (!p) return fail(400, "We could not find that ZIP.");
    loc = { lat: Number(p.latitude), lng: Number(p.longitude), label: `${p["place name"]}, ${p["state abbreviation"]}`, zip };
  } else {
    // round to ~1 km: enough for distances, not a precise home location
    loc = { lat: Math.round(parsed.data.lat * 100) / 100, lng: Math.round(parsed.data.lng * 100) / 100, label: "Your location" };
  }
  const res = NextResponse.json({ ok: true, ...loc });
  res.cookies.set(LOCATION_COOKIE, encodeURIComponent(JSON.stringify(loc)), {
    path: "/",
    sameSite: "lax",
    maxAge: 90 * 86400,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
