// Removes eBay shipping / payment / returns boilerplate and out-of-area pickup lines from listing
// descriptions (ChipKili is local pickup in Teaneck, NJ, delivery for a fee, pay at pickup), and makes sure
// every description ends with the standard pickup line. Also used by the eBay importers (import { cleanBoilerplate }).
// Run ONLY while the chipkili container is stopped. Usage: node clean-ebay-boilerplate.mjs <data-dir> [--dry]
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ENDING = "Sold as-is. Local pickup in Teaneck, NJ; delivery available for a fee.";
const BOILERPLATE =
  /\b(ships (within|same|next|via|to|in|free|only|from|out|anywhere)|ship (weight|dims)|shipped (within|via|by|same|next)|before (the item|it) ships|shipping(?! box)|cleared payment|business days?|handling time|returns? (are )?accepted|return policy|returns? within|\d+[- ]day returns?|international (shipping|buyers|orders)|APO|FPO|Alaska|Hawaii|Puerto Rico|USPS|UPS|FedEx|Priority Mail|PayPal|eBay|feedback|buyer pays|combined (shipping|postage)|must be returned|restocking fee|North Haven|Stamford|Connecticut)\b/i;

export function cleanBoilerplate(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const kept = [];
  let keywordList = false;
  for (const raw of lines) {
    // eBay search-keyword lists: "Keywords: a, b, c" or a "Keywords for Search" heading followed by the list
    if (keywordList) {
      keywordList = false;
      continue;
    }
    if (/keywords for search\s*:?\s*$/i.test(raw)) keywordList = true;
    const line = raw.replace(/\s*-?\s*keywords for search\s*:?\s*$/i, "").replace(/\s*Keywords:.*$/i, "");
    // a heading line like "Shipping:" or "Returns" alone, or a bare bullet, goes entirely
    if (/^\s*(shipping|returns?|payment|handling|terms)\s*:?\s*$/i.test(line) || /^\s*[-•*]+\s*(terms)?\s*$/i.test(line)) continue;
    const all = line.split(/(?<=[.!?])\s+/);
    const sentences = all.filter((s) => !BOILERPLATE.test(s));
    const out = sentences.join(" ").replace(/\s+(Returns?|Shipping)\s*:?$/i, "").replace(/\s+-$/, "").trimEnd();
    // a line that lost its boilerplate and is left with only a bullet or a fragment goes too
    if (sentences.length < all.length && (out.match(/[a-z]/gi) ?? []).length < 12) continue;
    if (out.trim() || !line.trim()) kept.push(out);
  }
  let body = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  body = body.replace(/\n*Sold as-is\. Local pickup in Teaneck, NJ; delivery available for a fee\.?\s*$/i, "").trim();
  return body ? `${body}\n\n${ENDING}` : ENDING;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [DATA] = process.argv.slice(2);
  const dry = process.argv.includes("--dry");
  if (!DATA) throw new Error("usage: node clean-ebay-boilerplate.mjs <data-dir> [--dry]");
  const dbFile = path.join(DATA, "db.json");
  const db = JSON.parse(await fs.readFile(dbFile, "utf8"));
  let changed = 0;
  for (const [code, it] of Object.entries(db.items ?? {})) {
    const next = cleanBoilerplate(it.description ?? "");
    if (next === it.description) continue;
    changed++;
    if (dry) {
      const gone = (it.description ?? "").split(/(?<=[.!?])\s+|\n/).filter((s) => s.trim() && !next.includes(s.trim()));
      console.log(`${code}: removes ${gone.length}: ${gone.map((s) => s.trim().slice(0, 90)).join(" | ")}`);
    } else db.items[code] = { ...it, description: next };
  }
  if (!dry) {
    await fs.copyFile(dbFile, `${dbFile}.bak-${Date.now()}`);
    await fs.writeFile(`${dbFile}.tmp`, JSON.stringify(db));
    await fs.rename(`${dbFile}.tmp`, dbFile);
  }
  console.log(`${dry ? "[dry] " : ""}descriptions cleaned: ${changed} of ${Object.keys(db.items ?? {}).length}`);
}
