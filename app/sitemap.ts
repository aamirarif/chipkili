import type { MetadataRoute } from "next";
import { getAllItems, getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { absolute } from "lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, cats, settings] = await Promise.all([getAllItems(), getCategories(), getSettings()]);
  const now = new Date();
  const pages = ["/", "/price-drops", "/sell", "/find", "/about", "/faq", "/contact", "/privacy", "/terms"].map((p) => ({
    url: absolute(p),
    lastModified: now,
    changeFrequency: p === "/" ? ("daily" as const) : ("weekly" as const),
    priority: p === "/" ? 1 : 0.6,
  }));
  return [
    ...pages,
    ...settings.weBuyTypes.map((t) => ({ url: absolute(`/we-buy/${t.slug}`), lastModified: now, priority: 0.6 })),
    ...cats.map((c) => ({ url: absolute(`/c/${c.slug}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
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
