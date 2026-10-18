import { test } from "node:test";
import assert from "node:assert/strict";
import { toCardData } from "../lib/card.ts";

const base = {
  id: "1",
  slug: "s",
  title: "T",
  price: 10,
  condition: "good" as const,
  town: "Teaneck, NJ",
  miles: 2,
  status: "active",
  createdAt: "2026-01-01",
  media: [1, 2, 3].map((n) => ({ kind: "image", thumb: `t${n}`, src: `s${n}`, alt: `a${n}` })),
};

test("toCardData keeps only the first two media entries", () => {
  assert.deepEqual(toCardData(base).media.map((m) => m.thumb), ["t1", "t2"]);
});

test("toCardData strips fields that are not part of the card", () => {
  const out = toCardData({ ...base, secretNotes: "cost 5", description: "long" });
  assert.ok(!("secretNotes" in out));
  assert.ok(!("description" in out));
});

test("toCardData does not mutate its input", () => {
  const copy = structuredClone(base);
  toCardData(base);
  assert.deepEqual(base, copy);
});

test("toCardData handles an item with no media", () => {
  assert.deepEqual(toCardData({ ...base, media: [] }).media, []);
});
