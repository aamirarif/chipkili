// Imports the seller's LIVE eBay listings into a staging folder for ChipKili.
// Read-only on eBay (Browse API, application token from the shared eBay keyset).
// Output: <out>/import.json ({ items, categories }) + <out>/media/<id>/{lg,md,th}.webp
// Then merge into the live data with scripts/merge-import.mjs while the container is stopped.
// Usage: node scripts/import-ebay.mjs <out-dir> [--seller=balianti786] [--start=2001]
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const OUT = process.argv[2];
if (!OUT) {
  console.error("usage: node scripts/import-ebay.mjs <out-dir> [--seller=balianti786] [--start=2001]");
  process.exit(1);
}
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const SELLER = arg("seller", "balianti786");
let nextNum = Number(arg("start", "2001"));
const ENV_PATH = "C:/Users/Kathleen/Desktop/Stuff/projects/marketing/physical-resale/.env";

// ---- eBay keys, read at runtime, never printed ----
const env = Object.fromEntries(
  (await fs.readFile(ENV_PATH, "utf8"))
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*['"]?(.*?)['"]?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const basic = Buffer.from(`${env.EBAY_APP_ID}:${env.EBAY_CERT_ID}`).toString("base64");
const tokRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
  method: "POST",
  headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", scope: env.EBAY_OAUTH_SCOPE || "https://api.ebay.com/oauth/api_scope" }),
});
const token = (await tokRes.json()).access_token;
if (!token) throw new Error("could not get an eBay token");
const ebay = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } });
  if (!r.ok) throw new Error(`eBay ${r.status} for ${url.slice(0, 90)}`);
  return r.json();
};

// ---- find every live listing of the seller (search each top-level category) ----
const L1 = [20081, 550, 2984, 267, 12576, 625, 15032, 11450, 11116, 1, 58058, 293, 14339, 237, 11232, 45100, 99, 172008, 26395, 11700, 3252, 1249, 260, 888, 64482, 1305, 220, 3187, 9800, 316, 6000, 131090, 281, 619, 870, 10542, 8, 113, 1281, 163, 1293, 159912, 173484];
const found = new Map();
for (const c of L1) {
  const qs = new URLSearchParams({ category_ids: String(c), filter: `sellers:{${SELLER}}`, limit: "200" });
  const d = await ebay(`https://api.ebay.com/buy/browse/v1/item_summary/search?${qs}`).catch(() => ({}));
  for (const it of d.itemSummaries ?? []) found.set(it.itemId, it);
}
console.log(`live listings found: ${found.size}`);

// ---- ChipKili rules ----
const NEW_CATEGORIES = [
  { id: "commercial-refrigeration", name: "Commercial refrigeration", parentId: "restaurant-equipment", order: 1 },
  { id: "wall-art", name: "Wall art", parentId: "home-decor", order: 1 },
  { id: "porcelain-vases", name: "Porcelain & vases", parentId: "home-decor", order: 2 },
  { id: "clothing-gear", name: "Clothing, shoes & gear", order: 13 },
  { id: "collectibles", name: "Collectibles", order: 14 },
];
function categoryFor(title, path) {
  const t = `${title} ${path}`.toLowerCase();
  if (/refrigerat|freezer|cooler|ice machine|reach-in/.test(t)) return "commercial-refrigeration";
  if (/\boven\b|mixer|trash receptacle|water filter|restaurant|commercial kitchen/.test(t)) return "restaurant-equipment";
  if (/\bpos\b|cash drawer|counterfeit|terminal|point of sale/.test(t)) return "pos-business";
  if (/wall art|metal wall|wall decor/.test(t)) return "wall-art";
  if (/porcelain|vase|ginger jar|tea caddy|temple jar|lidded box|chinoiserie/.test(t)) return "porcelain-vases";
  if (/jacket|helmet|sandal|chappal|shoe|clothing/.test(t)) return "clothing-gear";
  if (/lighter|star wars|collectible|display case|figure/.test(t)) return "collectibles";
  if (/cabinet|hutch|dining|table|chair|sofa|furniture/.test(t)) return "furniture";
  if (/sculpture|fish mount|decor|statue/.test(t)) return "home-decor";
  if (/laptop|computer|keyboard/.test(t)) return "computers";
  return "home-decor";
}
function conditionFor(c = "", title = "") {
  const s = `${c} ${title}`.toLowerCase();
  if (/for parts|not working/.test(s)) return "for-parts";
  if (/new with|new without|^new$|brand new|\bnew\b(?! other)/.test(c.toLowerCase())) return /without box/.test(s) ? "open-box" : "new";
  if (/open box|new other/.test(s)) return "open-box";
  if (/excellent|like new|mint/.test(s)) return "like-new";
  return "good";
}
// Listing rule: never the words "tested" / "not tested" (the Tested field is separate)
const noTested = (s) =>
  s
    .replace(/\b(not\s+)?tested(\s+(and\s+)?working)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
const dropTestedSentences = (s) =>
  s
    .split(/(?<=[.!?])\s+/)
    .filter((x) => !/\btested\b/i.test(x))
    .join(" ")
    .trim();
const htmlToText = (h = "") =>
  h
    .replace(/<\s*(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&[a-z]+;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
const slugify = (s, code) =>
  `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-[^-]*$/, "") || "item"}-${code.slice(3)}`;
const BRAND_BLOCK = /\bsubway\b/i; // standing rule: the Subway name never appears publicly

async function savePhoto(url, outMedia, alt) {
  const big = url.replace(/s-l\d+\./, "s-l1600.");
  const r = await fetch(big);
  if (!r.ok) throw new Error(`photo ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(outMedia, id);
  await fs.mkdir(dir, { recursive: true });
  const base = sharp(buf).rotate();
  let lg = { width: 1600, height: 1200 };
  for (const [name, width] of [["lg", 1600], ["md", 800], ["th", 400]]) {
    const o = await base.clone().resize({ width, withoutEnlargement: true }).webp({ quality: name === "th" ? 72 : 80 }).toFile(path.join(dir, `${name}.webp`));
    if (name === "lg") lg = { width: o.width, height: o.height };
  }
  return { id, kind: "image", src: `/media/${id}/lg.webp`, thumb: `/media/${id}/th.webp`, ...lg, alt };
}

await fs.mkdir(path.join(OUT, "media"), { recursive: true });
const items = [];
const report = [];
for (const summary of found.values()) {
  const it = await ebay(`https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(summary.itemId)}`);
  const code = `CK-${nextNum++}`;
  const rawTitle = it.title ?? summary.title;
  const title = noTested(rawTitle).replace(/[\s–—,:;/-]+$/, "").slice(0, 120);
  const aspects = (it.localizedAspects ?? []).map((a) => ({ label: a.name, value: a.value }));
  const aspect = (n) => aspects.find((a) => a.label.toLowerCase() === n)?.value;
  const urls = [it.image?.imageUrl, ...(it.additionalImages ?? []).map((x) => x.imageUrl)].filter(Boolean).slice(0, 24);
  const media = [];
  for (const u of urls) {
    try {
      media.push(await savePhoto(u, path.join(OUT, "media"), `${title} photo ${media.length + 1}`));
    } catch (e) {
      report.push(`${code}: a photo failed (${e.message})`);
    }
  }
  const description = dropTestedSentences(htmlToText(it.description || it.shortDescription || ""));
  const price = Number(it.price?.value ?? summary.price?.value ?? 0);
  const now = new Date().toISOString();
  const hidden = BRAND_BLOCK.test(`${rawTitle} ${description}`);
  if (hidden) report.push(`${code}: names a franchise brand, imported as a DRAFT for review: ${title}`);
  items.push({
    id: code,
    code,
    slug: slugify(title, code),
    title,
    categoryId: categoryFor(title, it.categoryPath ?? ""),
    brand: it.brand || aspect("brand") || undefined,
    type: aspect("type") || undefined,
    model: aspect("model") || it.mpn || undefined,
    condition: conditionFor(it.condition ?? summary.condition, rawTitle),
    price,
    priceHistory: [{ price, at: now }],
    quantity: it.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity ?? 1,
    status: hidden ? "draft" : "live",
    description,
    details: aspects.filter((a) => !/tested/i.test(`${a.label} ${a.value}`)).slice(0, 12),
    town: "Teaneck, NJ",
    lat: 40.8932,
    lng: -74.0116,
    delivery: price >= 150,
    media,
    keywords: [...new Set([it.brand, aspect("type"), aspect("model"), ...(it.categoryPath ?? "").split("|").slice(-2)].filter(Boolean).map((k) => String(k).toLowerCase()))].slice(0, 10),
    postedOn: { ebay: true },
    ebayItemId: summary.itemId,
    createdAt: now,
    updatedAt: now,
    views: 0,
  });
  process.stdout.write(`${code} ${media.length} photos ${hidden ? "[DRAFT] " : ""}${title.slice(0, 60)}\n`);
}
await fs.writeFile(path.join(OUT, "import.json"), JSON.stringify({ items, categories: NEW_CATEGORIES }, null, 1));
console.log(`\nstaged ${items.length} listings in ${OUT}`);
if (report.length) console.log(report.join("\n"));
