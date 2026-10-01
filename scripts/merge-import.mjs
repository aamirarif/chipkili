// Merges a staged import (import.json + media/) into a ChipKili data folder.
// Run ONLY while the chipkili container is stopped (the file store is single-process).
// Skips listings whose eBay item id is already present. Usage: node merge-import.mjs <staging-dir> <data-dir>
import { promises as fs } from "node:fs";
import path from "node:path";

const [STAGE, DATA] = process.argv.slice(2);
if (!STAGE || !DATA) throw new Error("usage: node merge-import.mjs <staging-dir> <data-dir>");
const staged = JSON.parse(await fs.readFile(path.join(STAGE, "import.json"), "utf8"));
const dbFile = path.join(DATA, "db.json");
const db = JSON.parse(await fs.readFile(dbFile, "utf8"));
await fs.copyFile(dbFile, `${dbFile}.bak-${Date.now()}`);

db.categories ??= {};
for (const c of staged.categories) if (!db.categories[c.id]) db.categories[c.id] = { slug: c.id, showInChips: !c.parentId, intro: "", ...c };

const have = new Set(Object.values(db.items ?? {}).map((i) => i.ebayItemId).filter(Boolean));
const usedCodes = new Set(Object.keys(db.items ?? {}));
let added = 0;
let skipped = 0;
for (const it of staged.items) {
  if (have.has(it.ebayItemId) || usedCodes.has(it.id)) {
    skipped++;
    continue;
  }
  for (const m of it.media) await fs.cp(path.join(STAGE, "media", m.id), path.join(DATA, "media", m.id), { recursive: true });
  db.items[it.id] = it;
  added++;
}
// keep the CK-number counter ahead of every code now in use
const max = Object.keys(db.items).reduce((m, k) => Math.max(m, Number(k.replace(/\D/g, "")) || 0), 1000);
db.counters = { ...(db.counters ?? {}), itemCode: { id: "itemCode", value: Math.max(max, db.counters?.itemCode?.value ?? 0) } };
await fs.writeFile(`${dbFile}.tmp`, JSON.stringify(db));
await fs.rename(`${dbFile}.tmp`, dbFile);
console.log(`merged: ${added} added, ${skipped} already present; items now ${Object.keys(db.items).length}`);
