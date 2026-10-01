// Seeds data/db.json (the local development store) from the prepared eBay items:
// C:\Users\Kathleen\Desktop\Stuff\Facebook Marketplace\aasiya_facebook_project\EBAY_BULK_UPLOAD.csv
// Photos are re-encoded with sharp (metadata, including GPS, is dropped) into data/media.
// Usage: node scripts/seed-from-ebay-csv.mjs [path-to-csv] [--limit-photos=6]
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const CSV =
  process.argv.find((a) => a.endsWith(".csv")) ??
  "C:/Users/Kathleen/Desktop/Stuff/Facebook Marketplace/aasiya_facebook_project/EBAY_BULK_UPLOAD.csv";
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit-photos=")) ?? "=8").split("=")[1]);
const DATA = process.env.DATA_DIR || path.join(process.cwd(), "data");
const MEDIA = path.join(DATA, "media");

// --- tiny CSV parser (quoted fields, embedded newlines) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^\uFEFF/, ""), r[i] ?? ""])));
}

const CATEGORIES = [
  { id: "appliances", name: "Appliances", order: 1 },
  { id: "refrigerators", name: "Refrigerators", parentId: "appliances", order: 1 },
  { id: "washers-dryers", name: "Washers & dryers", parentId: "appliances", order: 2 },
  { id: "kitchen-appliances", name: "Kitchen appliances", parentId: "appliances", order: 3 },
  { id: "restaurant-equipment", name: "Restaurant equipment", order: 2 },
  { id: "pos-business", name: "POS & business", order: 3 },
  { id: "computers", name: "Computers & accessories", order: 4 },
  { id: "laptops", name: "Laptops", parentId: "computers", order: 1 },
  { id: "keyboards-mice", name: "Keyboards & mice", parentId: "computers", order: 2 },
  { id: "drives-storage", name: "Drives & storage", parentId: "computers", order: 3 },
  { id: "cables-networking", name: "Cables & networking", parentId: "computers", order: 4 },
  { id: "electronics", name: "Phones & electronics", order: 5 },
  { id: "kitchen", name: "Kitchen", order: 6 },
  { id: "furniture", name: "Furniture", order: 7 },
  { id: "home-decor", name: "Home & decor", order: 8 },
  { id: "tools", name: "Tools & hardware", order: 9 },
  { id: "lighting-electrical", name: "Lighting & electrical", order: 10 },
  { id: "cleaning", name: "Cleaning & maintenance", order: 11 },
  { id: "sports-outdoors", name: "Sports & outdoors", order: 12 },
];

function categoryFor(p) {
  const s = p.toLowerCase();
  if (s.includes("laptops")) return "laptops";
  if (s.includes("keyboard") || s.includes("mice")) return "keyboards-mice";
  if (s.includes("drives") || s.includes("docking")) return "drives-storage";
  if (s.includes("cables") || s.includes("network")) return "cables-networking";
  if (s.includes("point of sale")) return "pos-business";
  if (s.includes("restaurant")) return "restaurant-equipment";
  if (s.includes("kitchen, dining")) return "kitchen";
  if (s.includes("electrical equipment") || s.includes("bulbs")) return "lighting-electrical";
  if (s.includes("cleaning") || s.includes("janitorial")) return "cleaning";
  if (s.includes("sporting")) return "sports-outdoors";
  if (s.includes("home decor")) return "home-decor";
  if (s.includes("consumer electronics")) return "electronics";
  return "electronics";
}

function conditionFor(c, title) {
  const t = `${c} ${title}`.toLowerCase();
  if (t.includes("sealed") || c === "New") return "new";
  if (t.includes("open box") || t.includes("new other")) return "open-box";
  if (t.includes("like new")) return "like-new";
  if (t.includes("no receiver") || t.includes("for parts")) return "for-parts";
  return "good";
}

// Aamir's listing rule: never write "tested" or "not tested" in a listing.
function dropTested(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !/\btested\b/i.test(s))
    .join(" ")
    .replace(/\s*-?\s*\bnot tested\b/gi, "")
    .trim();
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-[^-]*$/, "");

async function processPhoto(file) {
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(MEDIA, id);
  await fs.mkdir(dir, { recursive: true });
  const base = sharp(await fs.readFile(file)).rotate();
  let lg = { width: 1600, height: 1200 };
  for (const [name, width] of [["lg", 1600], ["md", 800], ["th", 400]]) {
    const out = await base.clone().resize({ width, withoutEnlargement: true }).webp({ quality: name === "th" ? 72 : 80 }).toFile(path.join(dir, `${name}.webp`));
    if (name === "lg") lg = { width: out.width, height: out.height };
  }
  return { id, kind: "image", src: `/media/${id}/lg.webp`, thumb: `/media/${id}/th.webp`, ...lg };
}

const rows = parseCsv(await fs.readFile(CSV, "utf8"));
const now = Date.now();
const items = {};
let n = 1001;
for (const [i, r] of rows.entries()) {
  const price = Number(r.start_price);
  const title = dropTested(r.title).replace(/\s+/g, " ").trim();
  const code = `CK-${n++}`;
  const folder = r.photo_folder;
  let files = [];
  try {
    files = (await fs.readdir(folder)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, LIMIT);
  } catch {
    console.warn(`no photos for ${r.custom_label}: ${folder}`);
  }
  const media = [];
  for (const f of files) media.push({ ...(await processPhoto(path.join(folder, f))), alt: `${title} photo ${media.length + 1}` });

  const specs = r.item_specifics_full
    .split("\n")
    .map((l) => l.split(/:\s*/))
    .filter(([k, v]) => k && v && !/tested/i.test(`${k} ${v}`))
    .slice(0, 8)
    .map(([k, v]) => ({ label: k.trim(), value: v.trim() }));
  const created = new Date(now - (rows.length - i) * 3.6e6 * 7).toISOString();
  // a few realistic price drops so the price-drop features have data
  const original = i % 5 === 0 && price > 10 ? Math.round(price * 1.2) : undefined;
  items[code] = {
    id: code,
    code,
    slug: `${slugify(title)}-${code.slice(3)}`,
    title,
    categoryId: categoryFor(r.category_path),
    brand: r.brand?.split("/")[0]?.trim() || undefined,
    model: r.model || undefined,
    condition: conditionFor(r.condition, r.title),
    price: Number.isFinite(price) && price > 0 ? price : 0,
    originalPrice: original,
    priceHistory: original ? [{ price: original, at: created }, { price, at: new Date(now - 2 * 864e5).toISOString() }] : [{ price, at: created }],
    quantity: Number(r.quantity) || 1,
    status: Number.isFinite(price) && price > 0 ? "live" : "draft",
    description: dropTested(r.description),
    details: specs,
    town: "Teaneck, NJ",
    lat: 40.8932,
    lng: -74.0116,
    delivery: price >= 50,
    media,
    keywords: r.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 12),
    postedOn: { ebay: true, facebook: false },
    createdAt: created,
    updatedAt: created,
    views: 0,
  };
  process.stdout.write(`${code} ${media.length} photos  ${title.slice(0, 50)}\n`);
}

const categories = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, { slug: c.id, showInChips: !c.parentId, intro: "", ...c }]),
);
const dbFile = path.join(DATA, "db.json");
let db = {};
try { db = JSON.parse(await fs.readFile(dbFile, "utf8")); } catch {}
db.items = { ...(db.items ?? {}), ...items };
db.categories = { ...categories, ...(db.categories ?? {}) };
await fs.mkdir(DATA, { recursive: true });
await fs.writeFile(dbFile, JSON.stringify(db));
console.log(`seeded ${Object.keys(items).length} items, ${CATEGORIES.length} categories into ${dbFile}`);
