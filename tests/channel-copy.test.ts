import { test } from "node:test";
import assert from "node:assert/strict";
import { channelCopies } from "../lib/channel-copy.ts";
import type { Item } from "../lib/types.ts";

function item(over: Partial<Item> = {}): Item {
  return {
    title: "Samsung 28 cu ft French-door refrigerator, stainless steel, ice maker",
    slug: "samsung-fridge",
    description: "Clean fridge.\nTested and works great. Not tested with the ice maker.\nSecond line.",
    condition: "good",
    brand: "Samsung",
    type: "Refrigerator",
    model: "RF28",
    dimensions: "36x70 in",
    whatsIncluded: "Two shelves",
    delivery: true,
    ...over,
  } as unknown as Item;
}

const copies = (over?: Partial<Item>) => channelCopies(item(over), "https://chipkili.com", "Teaneck, NJ");
const by = (c: ReturnType<typeof copies>, ch: string) => c.find((x) => x.channel === ch)!;

test("produces ebay, facebook, offerup and craigslist copies", () => {
  assert.deepEqual(copies().map((c) => c.channel), ["ebay", "facebook", "offerup", "craigslist"]);
});

test("no channel body ever contains the word 'tested'", () => {
  for (const c of copies()) assert.doesNotMatch(c.body, /tested/i, c.channel);
});

test("cleaning keeps the unrelated lines of the description", () => {
  const body = by(copies(), "ebay").body;
  assert.match(body, /Clean fridge\./);
  assert.match(body, /Second line\./);
});

test("brand, type, model and size lead the body in that order", () => {
  const lines = by(copies(), "ebay").body.split("\n");
  assert.deepEqual(lines.slice(0, 4), ["Brand: Samsung", "Type: Refrigerator", "Model: RF28", "Size: 36x70 in"]);
});

test("header lines are skipped for missing fields", () => {
  const body = by(copies({ brand: undefined, type: undefined, model: undefined, dimensions: undefined }), "ebay").body;
  assert.doesNotMatch(body, /Brand:|Type:|Model:|Size:/);
});

test("every body says sold as-is with the condition label", () => {
  for (const c of copies()) assert.match(c.body, /Condition: Good\. Sold as-is\./, c.channel);
});

test("local channels include pickup town, delivery note and item link", () => {
  const fb = by(copies(), "facebook").body;
  assert.match(fb, /Pickup in Teaneck, NJ\. Delivery available for a fee\./);
  assert.match(fb, /More photos: https:\/\/chipkili\.com\/i\/samsung-fridge/);
});

test("delivery note is dropped when the item has no delivery", () => {
  assert.doesNotMatch(by(copies({ delivery: false }), "offerup").body, /Delivery available/);
});

test("eBay copy has no pickup or link lines", () => {
  assert.doesNotMatch(by(copies(), "ebay").body, /Pickup in|More photos/);
});

test("titles are cut to each channel's length limit", () => {
  const c = copies({ title: "A".repeat(150) });
  assert.equal(by(c, "ebay").title.length, 80);
  assert.equal(by(c, "facebook").title.length, 100);
  assert.equal(by(c, "offerup").title.length, 50);
  assert.equal(by(c, "craigslist").title.length, 70);
});

test("bodies never contain three consecutive newlines", () => {
  for (const c of copies({ whatsIncluded: undefined })) assert.doesNotMatch(c.body, /\n{3,}/, c.channel);
});
