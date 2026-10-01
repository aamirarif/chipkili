import { NextResponse } from "next/server";
import { getCategories, publicCards } from "lib/catalog";
import { getSettings } from "lib/settings";
import { TEANECK } from "lib/geo";
import { expand, normalize, scoreItem, tokenize } from "lib/search";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (!q.trim()) return NextResponse.json({ suggestions: [] });
  const [cards, cats, settings] = await Promise.all([publicCards(TEANECK), getCategories(), getSettings()]);
  const groups = expand(tokenize(q), settings.synonyms);
  const nq = normalize(q);

  const catHits = cats
    .filter((c) => normalize(c.name).includes(nq) || groups.some((g) => g.some((t) => normalize(c.name).includes(t))))
    .slice(0, 3)
    .map((c) => ({ kind: "category" as const, label: c.name, href: `/c/${c.slug}` }));

  const itemHits = cards
    .map((c) => ({ c, s: scoreItem(c, groups) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map(({ c }) => ({ kind: "item" as const, label: c.title, href: `/i/${c.slug}` }));

  const suggestions = [{ kind: "query" as const, label: `Search "${q}"`, href: `/search?q=${encodeURIComponent(q)}` }, ...catHits, ...itemHits];
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=30" } });
}
