import { NextResponse } from "next/server";
import { getAllItems, getCategories, publicCards } from "lib/catalog";
import { visitorLocation } from "lib/visitor";
import { toCardData } from "lib/card";

/** "Because you viewed ...": the category this visitor looked at most, excluding what they already saw. */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 30);
  const [items, cats, loc] = await Promise.all([getAllItems(), getCategories(), visitorLocation()]);
  const seen = new Set(ids);
  const counts = new Map<string, number>();
  ids.forEach((id, rank) => {
    const it = items.find((i) => i.id === id);
    if (it) counts.set(it.categoryId, (counts.get(it.categoryId) ?? 0) + (30 - rank));
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return NextResponse.json({ label: "", cards: [] });
  const cat = cats.find((c) => c.id === top);
  const family = new Set([top, ...(cat?.parentId ? [cat.parentId] : [])]);
  const cards = (await publicCards(loc))
    .filter((c) => !seen.has(c.id) && (family.has(c.categoryId) || cats.find((x) => x.id === c.categoryId)?.parentId === cat?.parentId))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 4)
    .map(toCardData);
  return NextResponse.json(
    { label: `Because you viewed ${cat?.name.toLowerCase() ?? "similar items"}`, cards },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
