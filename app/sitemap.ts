import type { MetadataRoute } from "next";
import { categoryStats, getAllItems, getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { absolute } from "lib/site";

export const dynamic = "force-dynamic";

/** Date the static pages last really changed; bump it when their content changes (lastmod must be honest). */
const STATIC_UPDATED = new Date("2026-10-04T00:00:00Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, cats, settings, stats] = await Promise.all([getAllItems(), getCategories(), getSettings(), categoryStats()]);
  const forSale = items.filter((i) => ["live", "pending", "hold"].includes(i.status));
  const newest = forSale.reduce((max, i) => (i.updatedAt > max ? i.updatedAt : max), STATIC_UPDATED.toISOString());
  const pages = ["/", "/price-drops", "/sell", "/find", "/about", "/faq", "/contact", "/privacy", "/terms"].map((p) => ({
    url: absolute(p),
    // home and price drops change with the listings; the rest only when their text changes
    lastModified: p === "/" || p === "/price-drops" ? new Date(newest) : STATIC_UPDATED,
    changeFrequency: p === "/" ? ("daily" as const) : ("weekly" as const),
    priority: p === "/" ? 1 : 0.6,
  }));
  return [
    ...pages,
    ...settings.weBuyTypes.map((t) => ({ url: absolute(`/we-buy/${t.slug}`), lastModified: STATIC_UPDATED, priority: 0.6 })),
    // only categories with something for sale (empty ones are noindex)
    ...cats
      .filter((c) => stats.get(c.id)?.forSale)
      .map((c) => ({
        url: absolute(`/c/${c.slug}`),
        lastModified: new Date(stats.get(c.id)?.updatedAt ?? STATIC_UPDATED),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ...items
      .filter((i) => ["live", "pending", "hold", "sold"].includes(i.status))
      .map((i) => ({
        url: absolute(`/i/${i.slug}`),
        lastModified: new Date(i.updatedAt),
        changeFrequency: "weekly" as const,
        priority: i.status === "sold" ? 0.3 : 0.9,
        images: i.media.filter((m) => m.kind === "image").slice(0, 10).map((m) => absolute(m.src)),
      })),
  ];
}
