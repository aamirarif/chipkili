// Stages hand-written listings (photos in a folder + text) for ChipKili, in the same
// import.json format as the eBay importer, so scripts/merge-import.mjs can merge them.
// Usage: node scripts/stage-folder-items.mjs <items.json> <out-dir> --start=3001
// items.json: [{ folder, title, price, originalPrice?, condition, brand?, model?, description, status?, keywords? }]
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const [SPEC, OUT] = process.argv.slice(2);
let next = Number((process.argv.find((a) => a.startsWith("--start=")) ?? "=3001").split("=")[1]);
const CATEGORY = (process.argv.find((a) => a.startsWith("--category=")) ?? "=commercial-refrigeration").split("=")[1];
if (!SPEC || !OUT) throw new Error("usage: node stage-folder-items.mjs <items.json> <out-dir> --start=3001");

const specs = JSON.parse(await fs.readFile(SPEC, "utf8"));
const slugify = (s, code) => `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-[^-]*$/, "") || "item"}-${code.slice(3)}`;
await fs.mkdir(path.join(OUT, "media"), { recursive: true });

async function photo(file, alt) {
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(OUT, "media", id);
  await fs.mkdir(dir, { recursive: true });
  const base = sharp(await fs.readFile(file)).rotate(); // re-encode: phone GPS and all metadata dropped
  let lg = { width: 1600, height: 1200 };
  for (const [name, width] of [["lg", 1600], ["md", 800], ["th", 400]]) {
    const o = await base.clone().resize({ width, withoutEnlargement: true }).webp({ quality: name === "th" ? 72 : 80 }).toFile(path.join(dir, `${name}.webp`));
    if (name === "lg") lg = { width: o.width, height: o.height };
  }
  return { id, kind: "image", src: `/media/${id}/lg.webp`, thumb: `/media/${id}/th.webp`, ...lg, alt };
}

const items = [];
for (const s of specs) {
  const code = `CK-${next++}`;
  const files = (await fs.readdir(s.folder)).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const media = [];
  for (const f of files) media.push(await photo(path.join(s.folder, f), `${s.title} photo ${media.length + 1}`));
  const now = new Date().toISOString();
  items.push({
    id: code,
    code,
    slug: slugify(s.title, code),
    title: s.title,
    categoryId: CATEGORY,
    brand: s.brand,
    model: s.model,
    condition: s.condition ?? "like-new",
    price: s.price,
    originalPrice: s.originalPrice,
    priceHistory: s.originalPrice ? [{ price: s.originalPrice, at: now }, { price: s.price, at: now }] : [{ price: s.price, at: now }],
    quantity: s.quantity ?? 1,
    status: s.status ?? "live",
    description: s.description,
    details: s.details ?? [],
    town: "Teaneck, NJ",
    lat: 40.8932,
    lng: -74.0116,
    delivery: true,
    media,
    keywords: s.keywords ?? [],
    postedOn: { facebook: true },
    createdAt: now,
    updatedAt: now,
    views: 0,
  });
  console.log(`${code} ${media.length} photos ${s.status === "draft" ? "[DRAFT] " : ""}${s.title}`);
}
await fs.writeFile(path.join(OUT, "import.json"), JSON.stringify({ items, categories: [] }, null, 1));
console.log(`staged ${items.length} in ${OUT}`);
