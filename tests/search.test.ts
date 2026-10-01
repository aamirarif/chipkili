import { test } from "node:test";
import assert from "node:assert/strict";
import { editDistanceAtMostOne, expand, normalize, scoreItem, tokenize } from "../lib/search.ts";

const syn = [
  ["fridge", "refrigerator"],
  ["tv", "television"],
];
const fridge = { title: "Samsung 28 cu ft French-door refrigerator, stainless", brand: "Samsung", categoryName: "Refrigerators" };
const keyboard = { title: "HP KB-0316 PS/2 Wired Keyboard", brand: "HP", model: "KB-0316", categoryName: "Keyboards & mice" };

test("normalize strips accents, punctuation and case", () => {
  assert.equal(normalize("Café  Déjà-Vu!"), "cafe deja-vu");
});

test("tokenize drops filler words", () => {
  assert.deepEqual(tokenize("the washer and dryer for sale"), ["washer", "dryer", "sale"]);
});

test("synonym: 'fridge' finds a refrigerator", () => {
  assert.ok(scoreItem(fridge, expand(tokenize("fridge"), syn)) > 0);
});

test("one typo on a longer word still matches", () => {
  assert.ok(editDistanceAtMostOne("keybord", "keyboard"));
  assert.ok(scoreItem(keyboard, expand(tokenize("keybord"), syn)) > 0);
});

test("short words must match exactly or by prefix, not by typo", () => {
  assert.equal(scoreItem(keyboard, expand(tokenize("hq"), syn)), 0);
});

test("every word must match somewhere", () => {
  assert.equal(scoreItem(fridge, expand(tokenize("samsung washer"), syn)), 0);
  assert.ok(scoreItem(fridge, expand(tokenize("samsung french"), syn)) > 0);
});

test("prefix while typing", () => {
  assert.ok(scoreItem(fridge, expand(tokenize("refrig"), syn)) > 0);
});

test("model numbers match", () => {
  assert.ok(scoreItem(keyboard, expand(tokenize("kb-0316"), syn)) > 0);
});

test("title matches outrank description-only matches", () => {
  const inTitle = scoreItem({ title: "Dell laptop" }, [["laptop"]]);
  const inDesc = scoreItem({ title: "Dell computer", description: "a laptop" }, [["laptop"]]);
  assert.ok(inTitle > inDesc);
});

test("empty query matches everything", () => {
  assert.equal(scoreItem(fridge, []), 1);
});
