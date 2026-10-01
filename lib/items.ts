import "server-only";
import { store } from "lib/store";
import { TOWNS, TEANECK } from "lib/geo";
import type { Item } from "lib/types";

export function slugify(title: string, code: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-[^-]*$/, "");
  return `${base || "item"}-${code.replace(/^CK-/, "")}`;
}

/**
 * Next CK number from one counter in the store, bumped with an atomic update, so two saves
 * at the same moment can never get the same number. The counter starts from the highest
 * number already used.
 */
export async function nextCode(): Promise<string> {
  const db = store();
  for (let attempt = 0; attempt < 5; attempt++) {
    const bumped = await db.update("counters", "itemCode", (c) => ({ ...c, value: c.value + 1 }));
    if (bumped) return `CK-${bumped.value}`;
    const items = await db.list("items");
    const max = items.reduce((m, i) => Math.max(m, Number(i.code.replace(/\D/g, "")) || 0), 1000);
    await db.insert("counters", { id: "itemCode", value: max }); // loses harmlessly if another save created it first
  }
  throw new Error("Could not allocate a listing number");
}

/** Saves a brand-new listing without ever replacing an existing one; retries with a fresh number if taken. */
export async function insertNewItem(build: (code: string) => Item): Promise<Item> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const item = build(await nextCode());
    if (await store().insert("items", item)) return item;
  }
  throw new Error("Could not save the new listing, please try again");
}

export function townPoint(town: string): { lat: number; lng: number } {
  return TOWNS[town] ?? { lat: TEANECK.lat, lng: TEANECK.lng };
}

export function blankItem(code: string): Item {
  const now = new Date().toISOString();
  return {
    id: code,
    code,
    slug: slugify("new item", code),
    title: "",
    categoryId: "",
    condition: "good",
    price: 0,
    priceHistory: [],
    quantity: 1,
    status: "draft",
    description: "",
    details: [],
    town: "Teaneck, NJ",
    lat: TEANECK.lat,
    lng: TEANECK.lng,
    delivery: false,
    media: [],
    keywords: [],
    postedOn: {},
    createdAt: now,
    updatedAt: now,
    views: 0,
  };
}
