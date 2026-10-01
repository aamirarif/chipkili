import "server-only";
import { store } from "lib/store";

/** Item views, counted from view events (so a view never rewrites the listing itself). */
export async function viewCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const e of await store().list("events")) if (e.kind === "view" && e.itemId) counts.set(e.itemId, (counts.get(e.itemId) ?? 0) + 1);
  return counts;
}
