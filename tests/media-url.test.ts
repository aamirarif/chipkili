import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaSize, mediaSlug, seoMedia } from "../lib/media-url.ts";
import type { Media } from "../lib/types.ts";

// Same pattern the admin save action enforces on stored media URLs (app/admin/actions.ts, MEDIA_URL).
// That module is a "use server" file and does not export it, so the contract is pinned here.
const ADMIN_MEDIA_URL = /^\/media\/(p\/)?[a-f0-9]{16}\/[a-z0-9]+(-[a-z0-9]+)*\.(webp|mp4|webm|mov)$/;

const ID = "0123456789abcdef";
const photo = (id = ID): Media => ({ id, kind: "image", src: `/media/${id}/lg.webp`, thumb: `/media/${id}/th.webp` }) as Media;

test("admin media URL pattern accepts generated public, private and video URLs", () => {
  for (const u of [`/media/${ID}/lg.webp`, `/media/p/${ID}/video.mp4`, `/media/${ID}/dell-laptop-image-1-th.webp`]) {
    assert.ok(ADMIN_MEDIA_URL.test(u), u);
  }
});

test("admin media URL pattern rejects traversal, external, javascript: and wrong hex length", () => {
  const bad = [
    `/media/${ID}/../../etc/passwd`,
    `/media/../${ID}/lg.webp`,
    `https://evil.example/media/${ID}/lg.webp`,
    `//evil.example/media/${ID}/lg.webp`,
    `javascript:alert(1)`,
    `/media/${ID.slice(0, 15)}/lg.webp`,
    `/media/${ID}0/lg.webp`,
    `/media/${ID.toUpperCase()}/lg.webp`,
    `/media/${ID}/lg.svg`,
    `/media/${ID}/a/b.webp`,
  ];
  for (const u of bad) assert.equal(ADMIN_MEDIA_URL.test(u), false, u);
});

test("seoMedia output always satisfies the admin media URL pattern", () => {
  const video = { ...photo(), kind: "video", src: `/media/${ID}/video.webm` } as Media;
  const out = seoMedia("Dell Latitude 5420 (i5) / 16GB!", [photo(), video]);
  for (const m of out) assert.ok(ADMIN_MEDIA_URL.test(m.src), m.src);
  assert.ok(ADMIN_MEDIA_URL.test(out[0]!.thumb));
});

test("seoMedia leaves media with a malformed id untouched", () => {
  const evil = { id: "../../x", kind: "image", src: "/media/../../x/lg.webp", thumb: "t" } as Media;
  assert.deepEqual(seoMedia("Title", [evil]), [evil]);
});

test("seoMedia numbers photos and videos independently and sets alt text", () => {
  const vid = { id: "fedcba9876543210", kind: "video", src: "/media/fedcba9876543210/video.mov", thumb: "t" } as Media;
  const out = seoMedia("Red Chair", [photo(), vid, photo("aaaaaaaaaaaaaaaa")]);
  assert.equal(out[0]!.src, `/media/${ID}/red-chair-image-1.webp`);
  assert.equal(out[1]!.src, "/media/fedcba9876543210/red-chair-video-1.mov");
  assert.equal(out[2]!.alt, "Red Chair image 2");
});

test("seoMedia keeps the private /media/p/ folder for private uploads", () => {
  const m = { id: ID, kind: "image", src: `/media/p/${ID}/lg.webp`, thumb: "t" } as Media;
  assert.ok(seoMedia("Lamp", [m])[0]!.src.startsWith(`/media/p/${ID}/`));
});

test("mediaSlug lowercases, strips accents and punctuation", () => {
  assert.equal(mediaSlug("  Café Table -- 4 Chairs! "), "cafe-table-4-chairs");
});

test("mediaSlug falls back to 'item' when nothing usable remains", () => {
  assert.equal(mediaSlug("!!!"), "item");
  assert.equal(mediaSlug(""), "item");
});

test("mediaSlug cuts long titles at a word boundary within 80 chars", () => {
  const slug = mediaSlug(Array(30).fill("sturdy").join(" "));
  assert.ok(slug.length <= 80);
  assert.ok(!slug.endsWith("-"));
  assert.ok(slug.split("-").every((w) => w === "sturdy"));
});

test("mediaSize maps short and descriptive names between sizes", () => {
  assert.equal(mediaSize(`/media/${ID}/lg.webp`, "th"), `/media/${ID}/th.webp`);
  assert.equal(mediaSize(`/media/${ID}/chair-image-1.webp`, "md"), `/media/${ID}/chair-image-1-md.webp`);
  assert.equal(mediaSize(`/media/${ID}/chair-image-1-th.webp`, "lg"), `/media/${ID}/chair-image-1.webp`);
  assert.equal(mediaSize(`/media/${ID}/chair-image-1-md.webp`, "th"), `/media/${ID}/chair-image-1-th.webp`);
});

test("mediaSize returns non-webp sources unchanged", () => {
  assert.equal(mediaSize(`/media/${ID}/video.mp4`, "md"), `/media/${ID}/video.mp4`);
});
