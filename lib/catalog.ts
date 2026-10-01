import "server-only";
import { cache } from "react";
import { store } from "lib/store";
import { getSettings } from "lib/settings";
import { milesBetween, type Point } from "lib/geo";
import { expand, scoreItem, tokenize } from "lib/search";
import type { Filters } from "lib/filters";
import type { Category, Item } from "lib/types";

export type Card = Item & { miles: number; categoryName: string; drop: number };

const PUBLIC = new Set(["live", "pending", "hold"]);

export const getCategories = cache(async (): Promise<Category[]> => {
  const all = await store().list("categories");
  return [...all].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
});

export function categoryPath(cats: Category[], id: string | undefined): Category[] {
  const out: Category[] = [];
  let cur = cats.find((c) => c.id === id);
  while (cur && out.length < 6) {
    out.unshift(cur);
    cur = cats.find((c) => c.id === cur?.parentId);
  }
  return out;
}

/** The category and all of its children (so /c/appliances includes refrigerators). */
export function categoryFamily(cats: Category[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of cats) if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) ids.add(c.id), (grew = true);
  }
  return ids;
}

export const getAllItems = cache(async (): Promise<Item[]> => store().list("items"));

export function dropAmount(item: Item): number {
  return item.originalPrice && item.originalPrice > item.price ? item.originalPrice - item.price : 0;
}

/** Last real price cut, from the price history (never invented). */
export function lastDrop(item: Item): { amount: number; at: string } | null {
  const h = item.priceHistory;
  for (let i = h.length - 1; i > 0; i--) {
    const cur = h[i];
    const prev = h[i - 1];
    if (cur && prev && cur.price < prev.price) return { amount: prev.price - cur.price, at: cur.at };
  }
  return null;
}

function toCard(item: Item, cats: Category[], from: Point): Card {
  return {
    ...item,
    miles: milesBetween(from, item),
    categoryName: cats.find((c) => c.id === item.categoryId)?.name ?? "",
    drop: dropAmount(item),
  };
}

export async function publicCards(from: Point): Promise<Card[]> {
  const [items, cats] = await Promise.all([getAllItems(), getCategories()]);
  return items.filter((i) => PUBLIC.has(i.status)).map((i) => toCard(i, cats, from));
}

const POSTED_MS = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 } as const;

export type SearchResult = {
  cards: Card[];
  total: number;
  pages: number;
  brands: { name: string; count: number }[];
  priceRange: [number, number];
};

export async function searchCards(f: Filters, from: Point): Promise<SearchResult> {
  const [cards, cats, settings] = await Promise.all([publicCards(from), getCategories(), getSettings()]);
  const groups = expand(tokenize(f.q), settings.synonyms);
  const family = f.category ? categoryFamily(cats, f.category) : null;
  const now = Date.now();

  const inScope = cards.filter((c) => !family || family.has(c.categoryId));
  const brandCounts = new Map<string, number>();
  for (const c of inScope) if (c.brand) brandCounts.set(c.brand, (brandCounts.get(c.brand) ?? 0) + 1);

  const scored: { c: Card; s: number }[] = [];
  for (const c of inScope) {
    if (f.min !== undefined && c.price < f.min) continue;
    if (f.max !== undefined && c.price > f.max) continue;
    if (f.conditions.length && !f.conditions.includes(c.condition)) continue;
    if (f.brands.length && !f.brands.some((b) => b.toLowerCase() === (c.brand ?? "").toLowerCase())) continue;
    if (f.distance > 0 && c.miles > f.distance) continue;
    if (f.delivery && !c.delivery) continue;
    if (f.video && !c.media.some((m) => m.kind === "video")) continue;
    if (f.drop && c.drop <= 0) continue;
    if (f.posted !== "any" && now - Date.parse(c.createdAt) > POSTED_MS[f.posted]) continue;
    const s = scoreItem(c, groups);
    if (s > 0) scored.push({ c, s });
  }

  const by: Record<Filters["sort"], (a: { c: Card; s: number }, b: { c: Card; s: number }) => number> = {
    best: (a, b) => b.s - a.s || Date.parse(b.c.createdAt) - Date.parse(a.c.createdAt),
    newest: (a, b) => Date.parse(b.c.createdAt) - Date.parse(a.c.createdAt),
    "price-asc": (a, b) => a.c.price - b.c.price,
    "price-desc": (a, b) => b.c.price - a.c.price,
    nearest: (a, b) => a.c.miles - b.c.miles,
    drop: (a, b) => b.c.drop - a.c.drop,
  };
  scored.sort(by[f.sort]);

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / f.per));
  const page = Math.min(f.page, pages);
  const prices = inScope.map((c) => c.price);
  return {
    cards: scored.slice((page - 1) * f.per, page * f.per).map((x) => x.c),
    total,
    pages,
    brands: [...brandCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    priceRange: prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0],
  };
}

export async function getItemBySlug(slug: string): Promise<Item | null> {
  const items = await getAllItems();
  const found = items.find((i) => i.slug === slug);
  if (found) return found;
  // tolerate old slugs: match on the trailing id number
  const num = slug.match(/-(\d+)$/)?.[1];
  return (num && items.find((i) => i.code === `CK-${num}`)) || null;
}

/** Same category first, then similar price band and brand, nearest first. */
export async function similarTo(item: Item, from: Point, limit = 6): Promise<Card[]> {
  const cards = (await publicCards(from)).filter((c) => c.id !== item.id);
  const score = (c: Card) =>
    (c.categoryId === item.categoryId ? 10 : 0) +
    (c.brand && c.brand === item.brand ? 3 : 0) +
    (Math.abs(c.price - item.price) <= item.price * 0.4 ? 3 : 0) -
    c.miles / 50;
  return cards
    .map((c) => ({ c, s: score(c) }))
    .filter((x) => x.s > 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Items viewed in the same visit by other visitors, counted from view events. */
export async function alsoViewed(item: Item, from: Point, limit = 6): Promise<Card[]> {
  const events = (await store().list("events")).filter((e) => e.kind === "view" && e.itemId);
  const visitors = new Set(events.filter((e) => e.itemId === item.id).map((e) => e.visitorId));
  const counts = new Map<string, number>();
  for (const e of events) {
    if (visitors.has(e.visitorId) && e.itemId && e.itemId !== item.id) counts.set(e.itemId, (counts.get(e.itemId) ?? 0) + 1);
  }
  const cards = await publicCards(from);
  const ranked = cards
    .filter((c) => counts.has(c.id))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, limit);
  return ranked;
}

export function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  const out = [...arr];
  let s = seed % 2147483647 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export async function relatedSearches(item: Item): Promise<string[]> {
  const cats = await getCategories();
  const cat = cats.find((c) => c.id === item.categoryId)?.name.toLowerCase();
  const out = new Set<string>();
  if (item.brand && cat) out.add(`${item.brand.toLowerCase()} ${cat}`);
  if (cat) out.add(cat);
  if (item.type) out.add(item.type.toLowerCase());
  if (cat) out.add(`${cat} under $${Math.ceil((item.price * 1.2) / 50) * 50}`);
  for (const k of item.keywords.slice(0, 4)) out.add(k.toLowerCase());
  return [...out].slice(0, 6);
}
