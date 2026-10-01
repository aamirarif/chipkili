import { NextResponse } from "next/server";
import { getAllItems, getCategories } from "lib/catalog";
import { visitorLocation } from "lib/visitor";
import { milesBetween } from "lib/geo";
import { toCardData } from "lib/card";

/** Cards for ids the browser remembers (recently viewed, saved). Only public statuses, plus sold for Saved. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 60);
  const includeSold = url.searchParams.get("includeSold") === "1";
  const [items, cats, loc] = await Promise.all([getAllItems(), getCategories(), visitorLocation()]);
  const allowed = new Set(["live", "pending", "hold", ...(includeSold ? ["sold"] : [])]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const cards = ids
    .map((id) => byId.get(id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i && allowed.has(i.status)))
    .map((i) => ({ ...toCardData({ ...i, miles: milesBetween(loc, i) }), categoryName: cats.find((c) => c.id === i.categoryId)?.name }));
  return NextResponse.json({ cards }, { headers: { "Cache-Control": "private, max-age=30" } });
}
