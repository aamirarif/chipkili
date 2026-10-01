import { CONDITIONS, type Condition } from "lib/types";

export const SORTS = {
  best: "Best match",
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  nearest: "Nearest first",
  drop: "Biggest price drop",
} as const;
export type Sort = keyof typeof SORTS;

export const POSTED = { any: "Any time", "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
export type Posted = keyof typeof POSTED;

export const PER_PAGE = [24, 48, 96] as const;
export const DISTANCES = [5, 10, 25, 50, 0] as const; // 0 = any distance

export type Filters = {
  q: string;
  category?: string;
  min?: number;
  max?: number;
  conditions: Condition[];
  brands: string[];
  distance: number;
  delivery: boolean;
  video: boolean;
  drop: boolean;
  posted: Posted;
  sort: Sort;
  page: number;
  per: number;
};

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function many(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(",")).flatMap((x) => x.split(",")).filter(Boolean);
}
function num(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseFilters(params: Params, defaults: { distance: number }): Filters {
  const sort = one(params.sort) as Sort | undefined;
  const posted = one(params.posted) as Posted | undefined;
  const per = Number(one(params.per));
  const page = Math.max(1, Math.floor(Number(one(params.page)) || 1));
  const dist = one(params.dist);
  return {
    q: (one(params.q) ?? "").slice(0, 120),
    category: one(params.cat),
    min: num(one(params.min)),
    max: num(one(params.max)),
    conditions: many(params.cond).filter((c): c is Condition => (CONDITIONS as readonly string[]).includes(c)),
    brands: many(params.brand).map((b) => b.slice(0, 40)).slice(0, 20),
    distance: dist === undefined ? defaults.distance : Math.max(0, Number(dist) || 0),
    delivery: one(params.delivery) === "1",
    video: one(params.video) === "1",
    drop: one(params.drop) === "1",
    posted: posted && posted in POSTED ? posted : "any",
    sort: sort && sort in SORTS ? sort : "best",
    page,
    per: (PER_PAGE as readonly number[]).includes(per) ? per : 24,
  };
}

/** Builds the query string for a filter state; defaults are left out so links stay short. */
export function filtersToQuery(f: Partial<Filters>, defaults: { distance: number }): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("cat", f.category);
  if (f.min !== undefined) p.set("min", String(f.min));
  if (f.max !== undefined) p.set("max", String(f.max));
  if (f.conditions?.length) p.set("cond", f.conditions.join(","));
  if (f.brands?.length) p.set("brand", f.brands.join(","));
  if (f.distance !== undefined && f.distance !== defaults.distance) p.set("dist", String(f.distance));
  if (f.delivery) p.set("delivery", "1");
  if (f.video) p.set("video", "1");
  if (f.drop) p.set("drop", "1");
  if (f.posted && f.posted !== "any") p.set("posted", f.posted);
  if (f.sort && f.sort !== "best") p.set("sort", f.sort);
  if (f.per && f.per !== 24) p.set("per", String(f.per));
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
