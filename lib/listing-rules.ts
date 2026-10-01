import type { Item } from "lib/types";

/** Listing rule: never the words "tested" / "not tested" in title or description (the Tested field is separate). */
export function testedWarnings(item: Pick<Item, "title" | "description">): string[] {
  const out: string[] = [];
  if (/\btested\b/i.test(item.title)) out.push('The title contains "tested".');
  if (/\btested\b/i.test(item.description)) out.push('The description contains "tested". Use the Tested field instead, or leave it out.');
  return out;
}

export type SeoCheck = { label: string; ok: boolean };

export function seoChecks(item: Item): SeoCheck[] {
  const images = item.media.filter((m) => m.kind === "image");
  const titleLen = (item.seoTitle || item.title).length;
  const kw = item.keywords[0]?.toLowerCase();
  return [
    { label: "Title is 20 to 70 characters", ok: titleLen >= 20 && titleLen <= 70 },
    { label: "Description is at least 120 characters", ok: item.description.length >= 120 },
    { label: "Main keyword appears in the title", ok: Boolean(kw && item.title.toLowerCase().includes(kw)) },
    { label: "At least 3 keywords", ok: item.keywords.length >= 3 },
    { label: "At least 3 photos", ok: images.length >= 3 },
    { label: "Every photo has alt text", ok: images.length > 0 && images.every((m) => (m.alt ?? "").length > 5) },
    { label: "Brand filled in", ok: Boolean(item.brand) },
    { label: "Price set", ok: item.price > 0 },
    { label: "Category chosen", ok: Boolean(item.categoryId) },
  ];
}

/** Keyword ideas drawn from the listing itself (no outside service). */
export function keywordIdeas(item: Item, categoryName: string): string[] {
  const out = new Set<string>();
  const brand = item.brand?.toLowerCase();
  const model = item.model?.toLowerCase();
  const cat = categoryName.toLowerCase();
  const type = item.type?.toLowerCase();
  if (brand && model) out.add(`${brand} ${model}`);
  if (brand && cat) out.add(`${brand} ${cat}`);
  if (type) out.add(type);
  if (cat) {
    out.add(`used ${cat}`);
    out.add(`${cat} for sale`);
    out.add(`${cat} teaneck nj`);
    out.add(`${cat} near me`);
  }
  if (brand) out.add(`${brand} for sale`);
  if (item.condition === "new" || item.condition === "open-box") out.add(`new ${type ?? cat}`);
  return [...out].filter((k) => !item.keywords.includes(k)).slice(0, 10);
}
