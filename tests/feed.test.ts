import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFeedCsv, buildGoogleFeed } from "../lib/feed.ts";
import type { Category, Item } from "../lib/types.ts";

const SITE = "https://chipkili.com";
const cats = [{ id: "kitchen", slug: "kitchen", name: "Kitchen", order: 1, showInChips: true, googleTaxonomy: "Home & Garden > Kitchen & Dining" }] as Category[];

function item(over: Partial<Item> = {}): Item {
  return {
    id: "a1",
    code: "CK-1001",
    slug: "samsung-fridge",
    title: "Samsung fridge",
    categoryId: "kitchen",
    brand: "Samsung",
    model: "RF28",
    condition: "good",
    price: 899,
    quantity: 1,
    status: "live",
    description: "Clean fridge.",
    priceHistory: [{ price: 899, at: "2026-01-01" }],
    postedOn: { ebay: true },
    ebayItemId: "999",
    views: 42,
    lat: 40.89,
    lng: -74.01,
    media: [
      { id: "ab12ab12ab12ab12", kind: "image", src: "/media/ab12ab12ab12ab12/samsung-fridge-image-1.webp", thumb: "/media/ab12ab12ab12ab12/samsung-fridge-image-1-th.webp" },
      { id: "cd34cd34cd34cd34", kind: "image", src: "/media/cd34cd34cd34cd34/samsung-fridge-image-2.webp", thumb: "/media/cd34cd34cd34cd34/samsung-fridge-image-2-th.webp" },
    ],
    ...over,
  } as unknown as Item;
}

const xml = (items: Item[]) => buildGoogleFeed(items, cats, SITE);
const csv = (items: Item[]) => buildFeedCsv(items, cats, SITE);
const count = (s: string) => (s.match(/<item>/g) ?? []).length;

test("used item emits condition used; new item emits new", () => {
  assert.match(xml([item({ condition: "good" })]), /<g:condition>used<\/g:condition>/);
  assert.match(xml([item({ condition: "new" })]), /<g:condition>new<\/g:condition>/);
  for (const c of ["open-box", "like-new", "fair"] as const) assert.match(xml([item({ condition: c })]), /<g:condition>used<\/g:condition>/, c);
});

test("lot items pass through", () => {
  const out = xml([item({ title: "Lot of 6 prep tables", quantity: 6 })]);
  assert.equal(count(out), 1);
  assert.match(out, /Lot of 6 prep tables/);
});

test("missing brand and model: identifier_exists no and no mpn", () => {
  const out = xml([item({ brand: undefined, model: undefined })]);
  assert.match(out, /<g:identifier_exists>no<\/g:identifier_exists>/);
  assert.doesNotMatch(out, /g:mpn/);
  assert.doesNotMatch(xml([item({ brand: undefined })]), /g:mpn/);
  assert.match(xml([item({ model: undefined })]), /<g:identifier_exists>no/);
});

test("brand with model emits mpn and no identifier_exists, never gtin", () => {
  const out = xml([item()]);
  assert.match(out, /<g:mpn>RF28<\/g:mpn>/);
  assert.doesNotMatch(out, /identifier_exists/);
  assert.doesNotMatch(out, /gtin/);
});

test("item with no public image is excluded", () => {
  assert.equal(count(xml([item({ media: [] })])), 0);
  const priv = [{ id: "ee", kind: "image", src: "/media/p/ee/x.webp", thumb: "/media/p/ee/x-th.webp" }] as Item["media"];
  assert.equal(count(xml([item({ media: priv })])), 0);
});

test("sold, hold, pending, draft, archived, for-parts and price 0 are absent", () => {
  const bad = [
    item({ status: "sold" }),
    item({ status: "hold" }),
    item({ status: "pending" }),
    item({ status: "draft" }),
    item({ status: "archived" }),
    item({ condition: "for-parts" }),
    item({ price: 0 }),
  ];
  assert.equal(count(xml(bad)), 0);
  assert.equal(csv(bad).trim().split("\r\n").length, 1);
});

test("price formats as 899.00 USD and link carries the channel tag", () => {
  const out = xml([item()]);
  assert.match(out, /<g:price>899\.00 USD<\/g:price>/);
  assert.match(out, /<g:link>https:\/\/chipkili\.com\/i\/samsung-fridge\?src=gmc<\/g:link>/);
  assert.match(out, /<g:image_link>https:\/\/chipkili\.com\/media\/ab12ab12ab12ab12\/samsung-fridge-image-1\.webp<\/g:image_link>/);
  assert.match(out, /<g:additional_image_link>https:\/\/chipkili\.com\/media\/cd34/);
  assert.match(out, /<g:availability>in_stock<\/g:availability>/);
});

test("category taxonomy and product_type", () => {
  const out = xml([item()]);
  assert.match(out, /<g:google_product_category>Home &amp; Garden &gt; Kitchen &amp; Dining<\/g:google_product_category>/);
  assert.match(out, /<g:product_type>Kitchen<\/g:product_type>/);
  assert.doesNotMatch(buildGoogleFeed([item()], [{ ...cats[0]!, googleTaxonomy: undefined }], SITE), /google_product_category/);
});

test("ampersand and quotes are escaped in XML and CSV", () => {
  const t = 'Hobart "Pro" mixer & slicer';
  const x = xml([item({ title: t, description: "Fits 5 < 6 pans" })]);
  assert.match(x, /<g:title>Hobart &quot;Pro&quot; mixer &amp; slicer<\/g:title>/);
  assert.match(x, /<g:description>Fits 5 &lt; 6 pans<\/g:description>/);
  assert.match(csv([item({ title: t })]), /"Hobart ""Pro"" mixer & slicer"/);
});

test("declares the g namespace and never leaks private fields", () => {
  const out = xml([item()]) + csv([item()]);
  assert.match(out, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  for (const bad of ["views", "postedOn", "ebayItemId", "priceHistory", "quantity", "40.89", "-74.01", "phone", "email"]) assert.ok(!out.includes(bad), bad);
});

test("item count equals the number of qualifying items", () => {
  const items = [item(), item({ id: "a2", code: "CK-1002", slug: "b" }), item({ id: "a3", code: "CK-1003", slug: "c", status: "sold" }), item({ id: "a4", code: "CK-1004", slug: "d", price: 0 })];
  assert.equal(count(xml(items)), 2);
  assert.equal(csv(items).trim().split("\r\n").length, 3);
});

test("item with an empty title is excluded; a seoTitle alone is enough", () => {
  const items = [item({ id: "a5", code: "CK-1005", slug: "e", title: "", seoTitle: "" }), item({ id: "a6", code: "CK-1006", slug: "f", title: "", seoTitle: "Hobart mixer 20 qt" })];
  const out = xml(items);
  assert.equal(count(out), 1);
  assert.ok(!out.includes("CK-1005"));
  assert.match(out, /<g:title>Hobart mixer 20 qt<\/g:title>/);
});

test("channel title and description come from the caller, escaped", () => {
  const out = buildGoogleFeed([item()], cats, SITE, { title: "Shop & Co", description: "Pickup in \"town\"" });
  assert.match(out, /<title>Shop &amp; Co<\/title>/);
  assert.match(out, /<description>Pickup in &quot;town&quot;<\/description>/);
});
