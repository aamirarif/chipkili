/**
 * Small in-memory search, enough for a few thousand listings:
 * tokens, synonyms (fridge = refrigerator), prefix match while typing,
 * and one-typo tolerance on longer words.
 */

export type Searchable = {
  title: string;
  brand?: string;
  model?: string;
  type?: string;
  categoryName?: string;
  keywords?: string[];
  description?: string;
};

const STOP = new Set(["a", "an", "and", "the", "for", "with", "of", "in", "on", "to", "w", "or"]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t && !STOP.has(t));
}

/** Each query token becomes a group of alternatives from the synonym table. */
export function expand(tokens: string[], synonyms: string[][]): string[][] {
  return tokens.map((t) => {
    const alts = new Set([t]);
    for (const group of synonyms) {
      const words = group.map(normalize);
      if (words.includes(t)) words.forEach((w) => w.split(" ").forEach((x) => alts.add(x)));
    }
    return [...alts];
  });
}

export function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenScore(q: string, words: string[], weight: number): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return weight;
    if (w.startsWith(q) && q.length >= 2) best = Math.max(best, weight * 0.8);
    else if (q.length >= 5 && editDistanceAtMostOne(q, w)) best = Math.max(best, weight * 0.6);
  }
  return best;
}

/** Returns 0 when any query group has no match at all (every word must match somewhere). */
export function scoreItem(doc: Searchable, groups: string[][]): number {
  if (groups.length === 0) return 1;
  const fields: [string[], number][] = [
    [tokenize(doc.title), 5],
    [tokenize([doc.brand, doc.model, doc.type].filter(Boolean).join(" ")), 4],
    [tokenize((doc.keywords ?? []).join(" ")), 3],
    [tokenize(doc.categoryName ?? ""), 3],
    [tokenize(doc.description ?? ""), 1],
  ];
  let total = 0;
  for (const alts of groups) {
    let groupBest = 0;
    for (const alt of alts) {
      for (const [words, weight] of fields) groupBest = Math.max(groupBest, tokenScore(alt, words, weight));
    }
    if (groupBest === 0) return 0;
    total += groupBest;
  }
  return total;
}
