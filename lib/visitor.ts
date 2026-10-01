import "server-only";
import { cookies, headers } from "next/headers";
import { LOCATION_COOKIE, resolveLocation, type VisitorLocation } from "lib/geo";

export async function visitorLocation(): Promise<VisitorLocation> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return resolveLocation(jar.get(LOCATION_COOKIE)?.value, h);
}
