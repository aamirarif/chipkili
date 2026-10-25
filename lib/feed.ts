import { mediaSize } from "lib/media-url";
import type { Category, Condition, Item } from "lib/types";

/**
 * Product feed for Google Merchant Center (RSS 2.0, g: namespace) and a matching CSV.
 * Pure functions over plain data: no server-only imports, so they are unit-testable.
 * Allowlist: live, not available-to-order, non-empty title, price above zero, at least one public image, not for-parts.
 * Never emitted: phone, email, views, postedOn, ebayItemId, priceHistory, quantity, lat, lng, gtin.
 */

const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;
const MAX_ID = 50;
const MAX_EXTRA_IMAGES = 10;
const GOOGLE_NS = "http://base.google.com/ns/1.0";

export const FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "condition",
  "brand",
  "mpn",
  "identifier_exists",
  "google_product_category",
  "product_type",
] as const;

type FeedRow = Record<(typeof FEED_COLUMNS)[number], string>;

const CONDITION_MAP: Partial<Record<Condition, "new" | "used">> = {
  new: "new",
  "open-box": "used",
  "like-new": "used",
  good: "used",
  fair: "used",
};

/** Drops characters XML 1.0 forbids and HTML tags; collapses runs of spaces. */
function plain(text: string | undefined): string {
  return (text ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd();
}

const MIN_IMAGE_PX = 500; // Google Merchant Center floor (enforced from 2027-01-31); unknown sizes pass, known small ones are dropped
const bigEnough = (m: Item["media"][number]): boolean => (m.width ?? MIN_IMAGE_PX) >= MIN_IMAGE_PX && (m.height ?? MIN_IMAGE_PX) >= MIN_IMAGE_PX;
const isPublicImage = (m: Item["media"][number]): boolean => m.kind === "image" && m.src.startsWith("/media/") && !m.src.startsWith("/media/p/") && bigEnough(m);

function publicImages(item: Item, siteUrl: string): string[] {
  return item.media.filter(isPublicImage).map((m) => `${siteUrl}${mediaSize(m.src, "lg")}`);
}

export function isFeedEligible(item: Item): boolean {
  const hasTitle = Boolean(plain(item.seoTitle) || plain(item.title));
  // availableToOrder items are PreOrder on the page and would need availability_date here; keep them out so feed and page agree
  return item.status === "live" && !item.availableToOrder && hasTitle && Number.isFinite(item.price) && item.price > 0 && item.condition in CONDITION_MAP && item.media.some(isPublicImage);
}

function describe(item: Item): string {
  const base = plain(item.description);
  const included = plain(item.whatsIncluded);
  const full = included ? `${base}\nIncluded: ${included}` : base;
  const text = full.length <= MAX_DESCRIPTION ? full : base;
  return cut(text, MAX_DESCRIPTION) || cut(plain(item.title), MAX_DESCRIPTION);
}

function toRow(item: Item, cat: Category | undefined, siteUrl: string): FeedRow {
  const images = publicImages(item, siteUrl);
  const brand = plain(item.brand);
  const model = plain(item.model);
  return {
    id: cut(item.code, MAX_ID),
    title: cut(plain(item.seoTitle) || plain(item.title), MAX_TITLE),
    description: describe(item),
    link: `${siteUrl}/i/${item.slug}?src=gmc`,
    image_link: images[0] ?? "",
    additional_image_link: images.slice(1, 1 + MAX_EXTRA_IMAGES).join(","),
    availability: "in_stock",
    price: `${item.price.toFixed(2)} USD`,
    condition: CONDITION_MAP[item.condition] ?? "used",
    brand,
    mpn: brand && model ? model : "",
    identifier_exists: brand && model ? "" : "no",
    google_product_category: plain(cat?.googleTaxonomy),
    product_type: plain(cat?.name),
  };
}

function rows(items: Item[], categories: Category[], siteUrl: string): FeedRow[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return items.filter(isFeedEligible).map((i) => toRow(i, byId.get(i.categoryId), siteUrl));
}

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function xmlItem(row: FeedRow): string {
  const tags: string[] = [];
  for (const col of FEED_COLUMNS) {
    const value = row[col];
    if (!value) continue;
    const parts = col === "additional_image_link" ? value.split(",") : [value];
    for (const p of parts) tags.push(`<g:${col}>${xmlEscape(p)}</g:${col}>`);
  }
  return `<item>${tags.join("")}</item>`;
}

export type FeedChannel = { title: string; description: string };
const DEFAULT_CHANNEL: FeedChannel = { title: "ChipKili", description: "" };

export function buildGoogleFeed(items: Item[], categories: Category[], siteUrl: string, channel: FeedChannel = DEFAULT_CHANNEL): string {
  const body = rows(items, categories, siteUrl).map(xmlItem).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rss version="2.0" xmlns:g="${GOOGLE_NS}">`,
    "<channel>",
    `<title>${xmlEscape(channel.title)}</title>`,
    `<link>${xmlEscape(siteUrl)}</link>`,
    `<description>${xmlEscape(channel.description)}</description>`,
    body,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function csvEscape(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildFeedCsv(items: Item[], categories: Category[], siteUrl: string, _channel: FeedChannel = DEFAULT_CHANNEL): string {
  const lines = rows(items, categories, siteUrl).map((r) => FEED_COLUMNS.map((c) => csvEscape(r[c])).join(","));
  return [FEED_COLUMNS.join(","), ...lines, ""].join("\r\n");
}
