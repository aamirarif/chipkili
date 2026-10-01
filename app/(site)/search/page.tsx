import type { Metadata } from "next";
import { parseFilters } from "lib/filters";
import { getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { ResultsView } from "components/results-view";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : "";
  const cats = await getCategories();
  const cat = cats.find((c) => c.id === p.cat);
  const title = q ? `${q}${cat ? ` in ${cat.name}` : ""} near Teaneck, NJ` : "All listings near Teaneck, NJ";
  return {
    title,
    description: `${title}. New, open box and used. Local pickup in Teaneck, NJ, delivery available for a fee.`,
    // search result pages are shareable but not indexed; categories and items are
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const settings = await getSettings();
  const filters = parseFilters(await searchParams, { distance: settings.defaultRadiusMiles });
  return <ResultsView filters={filters} basePath="/search" />;
}
