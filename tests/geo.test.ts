import { test } from "node:test";
import assert from "node:assert/strict";
import { TEANECK, TOWNS, formatMiles, milesBetween, parseLocationCookie, resolveLocation } from "../lib/geo.ts";

const enc = (o: unknown) => encodeURIComponent(JSON.stringify(o));

test("milesBetween is zero for the same point and symmetric", () => {
  const a = TOWNS["Teaneck, NJ"]!;
  const b = TOWNS["Paramus, NJ"]!;
  assert.equal(milesBetween(a, a), 0);
  assert.ok(Math.abs(milesBetween(a, b) - milesBetween(b, a)) < 1e-9);
});

test("milesBetween gives plausible NJ distances", () => {
  const d = milesBetween(TOWNS["Teaneck, NJ"]!, TOWNS["Paramus, NJ"]!);
  assert.ok(d > 3 && d < 6, String(d));
});

test("milesBetween: one degree of latitude is about 69 miles", () => {
  const d = milesBetween({ lat: 40, lng: -74 }, { lat: 41, lng: -74 });
  assert.ok(Math.abs(d - 69) < 0.5, String(d));
});

test("formatMiles shows 'under 1 mi' below one mile and rounds otherwise", () => {
  assert.equal(formatMiles(0.4), "under 1 mi");
  assert.equal(formatMiles(1), "1 mi");
  assert.equal(formatMiles(4.6), "5 mi");
});

test("parseLocationCookie parses a valid cookie and tags the source", () => {
  const loc = parseLocationCookie(enc({ lat: 40.7, lng: -74, label: "Newark, NJ", zip: "07102" }));
  assert.deepEqual(loc, { lat: 40.7, lng: -74, label: "Newark, NJ", zip: "07102", source: "cookie" });
});

test("parseLocationCookie rejects missing, malformed and out-of-range values", () => {
  assert.equal(parseLocationCookie(undefined), null);
  assert.equal(parseLocationCookie("not json"), null);
  assert.equal(parseLocationCookie(enc({ lat: "40", lng: -74 })), null);
  assert.equal(parseLocationCookie(enc({ lat: 91, lng: 0 })), null);
  assert.equal(parseLocationCookie(enc({ lat: 0, lng: 181 })), null);
});

test("parseLocationCookie defaults and truncates the label", () => {
  assert.equal(parseLocationCookie(enc({ lat: 1, lng: 1 }))!.label, "Your location");
  assert.equal(parseLocationCookie(enc({ lat: 1, lng: 1, label: "x".repeat(100) }))!.label.length, 60);
});

test("resolveLocation prefers the cookie over Cloudflare headers", () => {
  const h = new Headers({ "cf-iplatitude": "10", "cf-iplongitude": "10" });
  assert.equal(resolveLocation(enc({ lat: 40.7, lng: -74 }), h).source, "cookie");
});

test("resolveLocation uses Cloudflare headers when there is no cookie", () => {
  const h = new Headers({ "cf-iplatitude": "40.9", "cf-iplongitude": "-74.1", "cf-ipcity": "Paramus", "cf-region-code": "NJ", "cf-postal-code": "07652" });
  assert.deepEqual(resolveLocation(undefined, h), { lat: 40.9, lng: -74.1, label: "Paramus, NJ", zip: "07652", source: "ip" });
});

test("resolveLocation labels an IP location 'Near you' without a city", () => {
  const h = new Headers({ "cf-iplatitude": "40.9", "cf-iplongitude": "-74.1" });
  assert.equal(resolveLocation(undefined, h).label, "Near you");
});

test("resolveLocation falls back to Teaneck with no cookie or headers", () => {
  const loc = resolveLocation(undefined, new Headers());
  assert.equal(loc.source, "default");
  assert.equal(loc.lat, TEANECK.lat);
  assert.equal(loc.zip, "07666");
});
