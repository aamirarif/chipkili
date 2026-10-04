// Applies a staged patch (patch.json + media/) to EXISTING listings in a ChipKili data folder.
// Run ONLY while the chipkili container is stopped (the file store is single-process).
// Adds photos (after the current ones, skipping ids already present), sets model, upserts detail rows by label,
// adds keywords. Optional status / title / description / condition / price are set only when the patch names them (a price change is appended to priceHistory). Usage: node apply-item-patch.mjs <stage-dir> <data-dir>
import { promises as fs } from "node:fs";
import path from "node:path";

const [STAGE, DATA] = process.argv.slice(2);
if (!STAGE || !DATA) throw new Error("usage: node apply-item-patch.mjs <stage-dir> <data-dir>");
const patches = JSON.parse(await fs.readFile(path.join(STAGE, "patch.json"), "utf8"));
const dbFile = path.join(DATA, "db.json");
const db = JSON.parse(await fs.readFile(dbFile, "utf8"));
await fs.copyFile(dbFile, `${dbFile}.bak-${Date.now()}`);

const now = new Date().toISOString();
for (const p of patches) {
  const it = db.items?.[p.code];
  if (!it) throw new Error(`${p.code} not found; nothing written`);
}
for (const p of patches) {
  const it = db.items[p.code];
  const haveIds = new Set(it.media.map((m) => m.id));
  const newMedia = p.media.filter((m) => !haveIds.has(m.id));
  for (const m of newMedia) await fs.cp(path.join(STAGE, "media", m.id), path.join(DATA, "media", m.id), { recursive: true });
  const details = [...(it.details ?? [])];
  for (const row of p.details) {
    const at = details.findIndex((d) => d.label.toLowerCase() === row.label.toLowerCase());
    if (at >= 0) details[at] = row;
    else details.push(row);
  }
  db.items[p.code] = {
    ...it,
    model: p.model ?? it.model,
    details,
    keywords: [...new Set([...(it.keywords ?? []), ...p.keywords])],
    media: [...it.media, ...newMedia],
    ...(p.title ? { title: p.title } : {}),
    ...(p.condition ? { condition: p.condition } : {}),
    ...(p.price > 0 && p.price !== it.price ? { price: p.price, priceHistory: [...(it.priceHistory ?? []), { price: p.price, at: now }] } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.status ? { status: p.status, soldAt: p.status === "sold" ? (it.soldAt ?? now) : it.soldAt } : {}),
    updatedAt: now,
  };
  console.log(`${p.code}: +${newMedia.length} photos (now ${it.media.length + newMedia.length}), details ${details.length}`);
}
await fs.writeFile(`${dbFile}.tmp`, JSON.stringify(db));
await fs.rename(`${dbFile}.tmp`, dbFile);
console.log(`patched ${patches.length} listings`);
