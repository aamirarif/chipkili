// Stages additions to EXISTING ChipKili listings (label photos, model, spec rows, keywords).
// status / title / description / condition / price change only when the spec names them. Apply with scripts/apply-item-patch.mjs.
// Usage: node scripts/stage-item-patch.mjs <patch-spec.json> <out-dir>
// spec: [{ code, price?, condition?, status?, title?, description?, model?, details?: [{label,value}], keywords?: [], photos?: [absolute file paths] }]
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const [SPEC, OUT] = process.argv.slice(2);
if (!SPEC || !OUT) throw new Error("usage: node stage-item-patch.mjs <patch-spec.json> <out-dir>");
const specs = JSON.parse(await fs.readFile(SPEC, "utf8"));
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

const patches = [];
for (const s of specs) {
  const media = [];
  for (const f of s.photos ?? []) media.push(await photo(f, `${s.code} ${s.altBase ?? "photo"} ${media.length + 1}`));
  patches.push({ code: s.code, brand: s.brand, price: s.price, condition: s.condition, status: s.status, title: s.title, description: s.description, model: s.model, details: s.details ?? [], keywords: s.keywords ?? [], media });
  console.log(`${s.code}: ${media.length} photos, ${(s.details ?? []).length} detail rows${s.model ? `, model ${s.model}` : ""}`);
}
await fs.writeFile(path.join(OUT, "patch.json"), JSON.stringify(patches, null, 1));
console.log(`staged ${patches.length} patches in ${OUT}`);
