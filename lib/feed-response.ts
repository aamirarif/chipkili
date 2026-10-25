import "server-only";
import { getAllItems, getCategories } from "lib/catalog";
import { buildFeedCsv, buildGoogleFeed } from "lib/feed";
import { getSettings } from "lib/settings";
import { SITE_URL } from "lib/site";

const TYPES = {
  xml: { type: "application/xml; charset=utf-8", build: buildGoogleFeed },
  csv: { type: "text/csv; charset=utf-8", build: buildFeedCsv },
} as const;

/** Serves the product feed, or a plain 404 while Settings.feedEnabled is off. */
export async function feedResponse(kind: keyof typeof TYPES): Promise<Response> {
  const settings = await getSettings();
  if (!settings.feedEnabled) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const [items, cats] = await Promise.all([getAllItems(), getCategories()]);
  const { type, build } = TYPES[kind];
  return new Response(build(items, cats, SITE_URL), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=600" } });
}
