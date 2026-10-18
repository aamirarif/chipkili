import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPhone, prettyPhone, toE164 } from "../lib/phone.ts";

test("toE164 accepts common US formats", () => {
  for (const s of ["201-555-0142", "(201) 555-0142", "201.555.0142", "2015550142", " 201 555 0142 "]) {
    assert.equal(toE164(s), "+12015550142", s);
  }
});

test("toE164 accepts a leading country code 1 or +1", () => {
  assert.equal(toE164("+1 (201) 555-0142"), "+12015550142");
  assert.equal(toE164("12015550142"), "+12015550142");
});

test("toE164 rejects wrong lengths", () => {
  for (const s of ["", "555-0142", "201555014", "201555014299", "22015550142"]) {
    assert.equal(toE164(s), null, s);
  }
});

test("toE164 rejects area codes or exchanges starting with 0 or 1", () => {
  assert.equal(toE164("1015550142"), null);
  assert.equal(toE164("0015550142"), null);
  assert.equal(toE164("2011550142"), null);
  assert.equal(toE164("2010550142"), null);
});

test("toE164 rejects letters-only and non-US country codes", () => {
  assert.equal(toE164("call me"), null);
  assert.equal(toE164("+44 20 7946 0958"), null);
});

test("prettyPhone formats E.164 as (XXX) XXX-XXXX", () => {
  assert.equal(prettyPhone("+12015550142"), "(201) 555-0142");
});

test("maskPhone hides the exchange but keeps area code and last four", () => {
  const masked = maskPhone("+12015550142");
  assert.ok(masked.startsWith("(201) "));
  assert.ok(masked.endsWith("-0142"));
  assert.ok(!masked.includes("555"));
});
