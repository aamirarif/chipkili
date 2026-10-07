// Sets category intro text (shown on the category page and used as its meta description).
// Run ONLY while the chipkili container is stopped. Usage: node apply-category-intros.mjs <intros.json> <data-dir>
// intros.json: { "<category id>": "<intro>" }
import { promises as fs } from "node:fs";
import path from "node:path";

const [SPEC, DATA] = process.argv.slice(2);
if (!SPEC || !DATA) throw new Error("usage: node apply-category-intros.mjs <intros.json> <data-dir>");
const intros = JSON.parse(await fs.readFile(SPEC, "utf8"));
const dbFile = path.join(DATA, "db.json");
const db = JSON.parse(await fs.readFile(dbFile, "utf8"));
await fs.copyFile(dbFile, `${dbFile}.bak-${Date.now()}`);
let set = 0;
for (const [id, intro] of Object.entries(intros)) {
  if (!db.categories?.[id]) throw new Error(`unknown category ${id}; nothing written`);
}
for (const [id, intro] of Object.entries(intros)) {
  db.categories[id] = { ...db.categories[id], intro: String(intro).trim() };
  set++;
}
await fs.writeFile(`${dbFile}.tmp`, JSON.stringify(db));
await fs.rename(`${dbFile}.tmp`, dbFile);
console.log(`category intros set: ${set}`);
