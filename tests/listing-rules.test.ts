import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordIdeas, seoChecks, testedWarnings } from "../lib/listing-rules.ts";
import type { Item } from "../lib/types.ts";

function item(over: Partial<Item> = {}): Item {
  return {
    title: "Samsung 28 cu ft French-door refrigerator",
    description: "x".repeat(130),
    keywords: ["samsung", "french door", "fridge"],
    media: [1, 2, 3].map((n) => ({ id: `a${n}`, kind: "image", src: "s", thumb: "t", alt: "Front view of fridge" })),
    brand: "Samsung",
    price: 450,
    categoryId: "refrigerators",
    ...over,
  } as unknown as Item;
}

test("testedWarnings: clean title and description produce no warnings", () => {
  assert.deepEqual(testedWarnings({ title: "Dell laptop", description: "Works as it should." }), []);
});

test("testedWarnings: flags 'tested' in the title", () => {
  const w = testedWarnings({ title: "Tested Dell laptop", description: "ok" });
  assert.equal(w.length, 1);
  assert.match(w[0]!, /title/);
});

test("testedWarnings: flags 'not tested' in the description, case-insensitively", () => {
  const w = testedWarnings({ title: "Dell laptop", description: "Sold NOT TESTED." });
  assert.equal(w.length, 1);
  assert.match(w[0]!, /description/);
});

test("testedWarnings: reports title and description separately", () => {
  assert.equal(testedWarnings({ title: "tested", description: "tested" }).length, 2);
});

test("testedWarnings: does not flag words that merely contain 'tested'", () => {
  assert.deepEqual(testedWarnings({ title: "Contested Attested", description: "protested" }), []);
});

test("seoChecks: a complete listing passes every check", () => {
  const checks = seoChecks(item());
  assert.equal(checks.length, 9);
  assert.deepEqual(checks.filter((c) => !c.ok), []);
});

test("seoChecks: title length boundaries (20 ok, 19 and 71 fail)", () => {
  const ok = (t: string) => seoChecks(item({ title: t, keywords: [] }))[0]!.ok;
  assert.equal(ok("a".repeat(20)), true);
  assert.equal(ok("a".repeat(19)), false);
  assert.equal(ok("a".repeat(70)), true);
  assert.equal(ok("a".repeat(71)), false);
});

test("seoChecks: seoTitle overrides title for the length check", () => {
  const checks = seoChecks(item({ title: "short", seoTitle: "A properly long SEO title here" }));
  assert.equal(checks[0]!.ok, true);
});

test("seoChecks: description under 120 chars fails, exactly 120 passes", () => {
  assert.equal(seoChecks(item({ description: "x".repeat(119) }))[1]!.ok, false);
  assert.equal(seoChecks(item({ description: "x".repeat(120) }))[1]!.ok, true);
});

test("seoChecks: main keyword must appear in the title, ignoring case", () => {
  assert.equal(seoChecks(item({ keywords: ["SAMSUNG", "a", "b"] }))[2]!.ok, true);
  assert.equal(seoChecks(item({ keywords: ["whirlpool", "a", "b"] }))[2]!.ok, false);
  assert.equal(seoChecks(item({ keywords: [] }))[2]!.ok, false);
});

test("seoChecks: videos do not count as photos and short alt text fails", () => {
  const media = [
    { id: "a", kind: "image", src: "s", thumb: "t", alt: "Front view of fridge" },
    { id: "b", kind: "image", src: "s", thumb: "t", alt: "Back" },
    { id: "c", kind: "video", src: "s", thumb: "t" },
  ];
  const checks = seoChecks(item({ media } as Partial<Item>));
  assert.equal(checks[4]!.ok, false);
  assert.equal(checks[5]!.ok, false);
});

test("seoChecks: no photos fails the alt check rather than passing vacuously", () => {
  assert.equal(seoChecks(item({ media: [] }))[5]!.ok, false);
});

test("seoChecks: zero price and missing brand fail", () => {
  const checks = seoChecks(item({ price: 0, brand: "" }));
  assert.equal(checks[6]!.ok, false);
  assert.equal(checks[7]!.ok, false);
});

test("keywordIdeas: builds brand/model, category and local phrases", () => {
  const ideas = keywordIdeas(item({ model: "RF28", type: "Fridge", keywords: [], condition: "good" } as Partial<Item>), "Refrigerators");
  assert.ok(ideas.includes("samsung rf28"));
  assert.ok(ideas.includes("samsung refrigerators"));
  assert.ok(ideas.includes("refrigerators teaneck nj"));
  assert.ok(ideas.includes("samsung for sale"));
});

test("keywordIdeas: excludes keywords already on the listing and caps at 10", () => {
  const ideas = keywordIdeas(item({ model: "RF28", keywords: ["samsung rf28"] } as Partial<Item>), "Refrigerators");
  assert.ok(!ideas.includes("samsung rf28"));
  assert.ok(ideas.length <= 10);
});

test("keywordIdeas: adds a 'new' phrase only for new or open-box condition", () => {
  const newer = keywordIdeas(item({ condition: "open-box", keywords: [] } as Partial<Item>), "Keyboards");
  const used = keywordIdeas(item({ condition: "good", keywords: [] } as Partial<Item>), "Keyboards");
  assert.ok(newer.includes("new keyboards"));
  assert.ok(!used.includes("new keyboards"));
});
