import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { categoryPath, categoryStats, getCategories, publicCards } from "lib/catalog";
import { parseFilters } from "lib/filters";
import { getSettings } from "lib/settings";
import { TEANECK } from "lib/geo";
import { absolute } from "lib/site";
import { ResultsView } from "components/results-view";
import { JsonLd } from "components/json-ld";

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(slugs: string[]) {
  const cats = await getCategories();
  return { cats, cat: cats.find((c) => c.slug === slugs.at(-1)) };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { cat } = await resolve(slug);
  if (!cat) return {};
  // filtered views and categories with nothing for sale right now stay out of the index (still crawlable)
  const filtered = Object.keys(sp).some((k) => k !== "src");
  const empty = !(await categoryStats()).get(cat.id)?.forSale;
  const desc = cat.intro || `${cat.name} for sale near Teaneck, NJ: new, open box and used. See photos, prices and price drops. Local pickup, delivery available for a fee.`;
  return {
    title: `${cat.name} for sale near Teaneck, NJ`,
    description: desc.slice(0, 160),
    alternates: { canonical: `/c/${cat.slug}` },
    robots: filtered || empty ? { index: false, follow: true } : undefined,
    openGraph: { title: `${cat.name} on ChipKili`, description: desc.slice(0, 160), url: `/c/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const { cats, cat } = await resolve(slug);
  if (!cat) notFound();
  if (slug.length > 1 || slug[0] !== cat.slug) permanentRedirect(`/c/${cat.slug}`);
  const filters = parseFilters(sp, { distance: settings.defaultRadiusMiles });
  const path = categoryPath(cats, cat.id);
  const cards = (await publicCards(TEANECK)).filter((c) => c.categoryId === cat.id || cats.find((x) => x.id === c.categoryId)?.parentId === cat.id);
  return (
    <>
      <ResultsView filters={filters} category={cat} basePath={`/c/${cat.slug}`} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [{ name: "Home", path: "/" }, ...path.map((c) => ({ name: c.name, path: `/c/${c.slug}` }))].map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: b.name,
                item: absolute(b.path),
              })),
            },
            {
              "@type": "ItemList",
              name: `${cat.name} for sale near Teaneck, NJ`,
              numberOfItems: cards.length,
              itemListElement: cards.slice(0, 30).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: absolute(`/i/${c.slug}`), name: c.title })),
            },
          ],
        }}
      />
    </>
  );
}
