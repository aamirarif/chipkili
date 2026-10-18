import { test } from "node:test";
import assert from "node:assert/strict";
import { filtersToQuery, parseFilters } from "../lib/filters.ts";

const D = { distance: 25 };

test("parseFilters returns sane defaults for empty params", () => {
  const f = parseFilters({}, D);
  assert.equal(f.q, "");
  assert.equal(f.sort, "best");
  assert.equal(f.posted, "any");
  assert.equal(f.page, 1);
  assert.equal(f.per, 24);
  assert.equal(f.distance, 25);
  assert.deepEqual(f.conditions, []);
});

test("parseFilters ignores unknown sort, posted, per and conditions", () => {
  const f = parseFilters({ sort: "hax", posted: "yesterday", per: "999", cond: "good,broken,new" }, D);
  assert.equal(f.sort, "best");
  assert.equal(f.posted, "any");
  assert.equal(f.per, 24);
  assert.deepEqual(f.conditions, ["good", "new"]);
});

test("parseFilters clamps page to >= 1 and floors decimals", () => {
  assert.equal(parseFilters({ page: "-5" }, D).page, 1);
  assert.equal(parseFilters({ page: "abc" }, D).page, 1);
  assert.equal(parseFilters({ page: "3.9" }, D).page, 3);
});

test("parseFilters rejects negative or non-numeric prices but keeps zero", () => {
  const f = parseFilters({ min: "-1", max: "abc" }, D);
  assert.equal(f.min, undefined);
  assert.equal(f.max, undefined);
  assert.equal(parseFilters({ min: "0" }, D).min, 0);
});

test("parseFilters truncates long queries and brand lists", () => {
  assert.equal(parseFilters({ q: "a".repeat(500) }, D).q.length, 120);
  const brands = Array.from({ length: 30 }, (_, i) => `b${i}`).join(",");
  assert.equal(parseFilters({ brand: brands }, D).brands.length, 20);
  assert.equal(parseFilters({ brand: "x".repeat(100) }, D).brands[0]!.length, 40);
});

test("parseFilters accepts repeated params and comma lists for brand", () => {
  assert.deepEqual(parseFilters({ brand: ["dell,hp", "lg"] }, D).brands, ["dell", "hp", "lg"]);
});

test("parseFilters treats dist=0 as any distance and bad values as 0", () => {
  assert.equal(parseFilters({ dist: "0" }, D).distance, 0);
  assert.equal(parseFilters({ dist: "-10" }, D).distance, 0);
  assert.equal(parseFilters({ dist: "junk" }, D).distance, 0);
});

test("filtersToQuery omits defaults and returns '' when nothing is set", () => {
  assert.equal(filtersToQuery(parseFilters({}, D), D), "");
});

test("filtersToQuery round-trips a full filter state", () => {
  const params = { q: "fridge", cat: "appliances", min: "10", max: "500", cond: "good,fair", brand: "lg", dist: "10", delivery: "1", video: "1", drop: "1", posted: "7d", sort: "price-asc", per: "48", page: "2" };
  const f = parseFilters(params, D);
  const back = parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f, D))), D);
  assert.deepEqual(back, f);
});

test("filtersToQuery encodes special characters in the query", () => {
  assert.equal(filtersToQuery({ q: "a&b c" }, D), "?q=a%26b+c");
});
