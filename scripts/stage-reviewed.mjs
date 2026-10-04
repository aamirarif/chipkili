// Stages reviewed Facebook folders (review batch JSON, see _facebook_items/review_*/REVIEW_BRIEF.txt) for ChipKili.
// action "new"        -> new listing in import.json (merge with scripts/merge-import.mjs); no price -> draft
// action "add-photos" -> photos added to targetCode in patch.json (apply with scripts/apply-item-patch.mjs)
// duplicateOf (eBay)  -> that listing archived in patch.json (Facebook wins)
// "hold" / "skip"     -> nothing staged, listed in the summary.
// Photos are re-encoded (all metadata incl. GPS dropped). Videos are re-encoded with ffmpeg, metadata and
// data streams dropped, 720p H.264 with a poster frame.
// Usage: node scripts/stage-reviewed.mjs <out-dir> --start=3012 [--only=<folder substring>] <batch.json>...
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import os from "node:os";
import sharp from "sharp";

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith("--"));
const batches = args.filter((a) => !a.startsWith("--") && a !== OUT);
let next = Number((args.find((a) => a.startsWith("--start=")) ?? "=0").split("=")[1]);
const only = (args.find((a) => a.startsWith("--only=")) ?? "").slice(7);
if (!OUT || !batches.length || !next) throw new Error("usage: node stage-reviewed.mjs <out-dir> --start=N <batch.json>...");
const ROOT = "C:/Users/Kathleen/Desktop/Stuff/Facbook_chipkilli";
const CONDITIONS = ["new", "open-box", "like-new", "good", "fair", "for-parts"];
const ENDING = "Sold as-is. Local pickup in Teaneck, NJ; delivery available for a fee.";

await fs.mkdir(path.join(OUT, "media"), { recursive: true });
const slugify = (s, code) => `${s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-[^-]*$/, "") || "item"}-${code.slice(3)}`;

async function photo(file, alt) {
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(OUT, "media", id);
  await fs.mkdir(dir, { recursive: true });
  const base = sharp(await fs.readFile(file)).rotate();
  let lg = { width: 1600, height: 1200 };
  for (const [name, width] of [["lg", 1600], ["md", 800], ["th", 400]]) {
    const o = await base.clone().resize({ width, withoutEnlargement: true }).webp({ quality: name === "th" ? 72 : 80 }).toFile(path.join(dir, `${name}.webp`));
    if (name === "lg") lg = { width: o.width, height: o.height };
  }
  return { id, kind: "image", src: `/media/${id}/lg.webp`, thumb: `/media/${id}/th.webp`, ...lg, alt };
}

async function video(file, alt) {
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(OUT, "media", id);
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, "video.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1", "-map_chapters", "-1",
    "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out]);
  const frame = path.join(os.tmpdir(), `${id}.png`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "1", "-i", out, "-frames:v", "1", frame]);
  const poster = sharp(await fs.readFile(frame));
  const meta = await poster.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, "lg.webp"));
  await poster.clone().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(dir, "th.webp"));
  await fs.rm(frame, { force: true });
  return { id, kind: "video", src: `/media/${id}/video.mp4`, thumb: `/media/${id}/th.webp`, width: meta.width, height: meta.height, alt };
}

const items = [];
const categories = [];
const patches = [];
const summary = [];
for (const b of batches) {
  for (const s of JSON.parse(await fs.readFile(b, "utf8"))) {
    if (only && !s.folder.includes(only)) continue;
    const dir = path.join(ROOT, s.folder);
    if (s.action === "hold" || s.action === "skip") {
      summary.push(`${s.action.toUpperCase()}  ${s.folder}`);
      continue;
    }
    const media = [];
    for (const f of s.photos ?? []) media.push(await photo(path.join(dir, f), s.title));
    for (const v of (s.videos ?? []).filter((v) => v.use)) media.push(await video(path.join(dir, v.file), s.title));
    // a second folder of the same item (merged by the reviewer)
    const extraDir = s.extraFolder ? path.join(ROOT, s.extraFolder) : null;
    for (const f of extraDir ? (s.extraPhotos ?? []) : []) media.push(await photo(path.join(extraDir, f), s.title));
    for (const v of extraDir ? (s.extraVideos ?? []) : []) media.push(await video(path.join(extraDir, v.file), s.title));
    if (s.action === "add-photos") {
      patches.push({ code: s.targetCode, details: [], keywords: [], media });
      summary.push(`ADD   ${s.targetCode} +${media.length} media  (${s.folder})`);
      continue;
    }
    if (!CONDITIONS.includes(s.condition)) throw new Error(`${s.folder}: bad condition ${s.condition}`);
    if (s.proposedCategory && !categories.some((c) => c.id === s.proposedCategory.id)) categories.push({ order: 50, ...s.proposedCategory });
    const code = `CK-${next++}`;
    const now = new Date().toISOString();
    const priced = typeof s.price === "number" && s.price > 0;
    const description = s.description.trim().endsWith(ENDING) ? s.description.trim() : `${s.description.trim()}\n\n${ENDING}`;
    items.push({
      id: code, code, slug: slugify(s.title, code), title: s.title,
      categoryId: s.proposedCategory?.id ?? s.categoryId,
      brand: s.brand || undefined, type: s.type || undefined, model: s.model || undefined,
      condition: s.condition,
      price: priced ? s.price : 0,
      originalPrice: s.originalPrice && s.originalPrice > s.price ? s.originalPrice : undefined,
      priceHistory: priced ? [{ price: s.price, at: now }] : [],
      quantity: s.quantity || 1,
      status: priced && s.status !== "draft" ? "live" : "draft",
      description,
      details: (s.details ?? []).filter((d) => d.label?.trim() && d.value?.trim()),
      town: "Teaneck, NJ", lat: 40.8932, lng: -74.0116, delivery: true,
      media, keywords: s.keywords ?? [], postedOn: { facebook: true },
      createdAt: now, updatedAt: now, views: 0,
    });
    if (s.duplicateOf) patches.push({ code: s.duplicateOf, status: "archived", details: [], keywords: [], media: [] });
    summary.push(`${priced ? "LIVE " : "DRAFT"} ${code} ${media.length} media  ${s.title}${s.duplicateOf ? `  (archives ${s.duplicateOf})` : ""}`);
  }
}
await fs.writeFile(path.join(OUT, "import.json"), JSON.stringify({ items, categories }, null, 1));
await fs.writeFile(path.join(OUT, "patch.json"), JSON.stringify(patches, null, 1));
await fs.writeFile(path.join(OUT, "summary.txt"), summary.join("\n") + "\n");
console.log(summary.join("\n"));
console.log(`staged ${items.length} new, ${patches.length} patches, ${categories.length} new categories in ${OUT}`);
