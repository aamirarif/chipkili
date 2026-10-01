import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { newId } from "lib/crypto";
import type { Media } from "lib/types";

export const MEDIA_ROOT = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "media");
/** Uploads from the public (Sell to ChipKili) live here and are served to the signed-in owner only. */
export const PRIVATE_ROOT = path.join(MEDIA_ROOT, "private");
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_MB || 80) * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

let mark: Buffer | null = null;
async function watermark(width: number): Promise<Buffer> {
  if (!mark) mark = await fs.readFile(path.join(process.cwd(), "public", "brand", "watermark.png"));
  return sharp(mark).resize(Math.max(48, Math.round(width * 0.09))).png().toBuffer();
}

/** The file really is a video container (MP4/MOV "ftyp" box or WebM header), not just labelled as one. */
function looksLikeVideo(buf: Buffer): boolean {
  return buf.subarray(4, 8).toString("latin1") === "ftyp" || buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

/**
 * Saves an upload. Images are re-encoded (which drops ALL metadata, including the
 * GPS location phones put in photos) into large, medium and thumb WebP files.
 * Videos are stored as sent (no re-encoding on this server), so their metadata stays:
 * public uploads therefore go to the private folder, never straight onto the site.
 */
export async function saveUpload(buf: Buffer, mime: string, opts: { watermark: boolean; alt?: string; private?: boolean }): Promise<Media> {
  const id = newId();
  const dir = path.join(opts.private ? PRIVATE_ROOT : MEDIA_ROOT, id);
  const web = opts.private ? `/media/p/${id}` : `/media/${id}`;
  if (VIDEO_TYPES[mime]) {
    if (buf.length > MAX_VIDEO_BYTES) throw new Error(`Video is larger than ${MAX_VIDEO_BYTES / 1024 / 1024} MB`);
    if (!looksLikeVideo(buf)) throw new Error("That file is not a video");
    await fs.mkdir(dir, { recursive: true });
    const file = `video.${VIDEO_TYPES[mime]}`;
    await fs.writeFile(path.join(dir, file), buf);
    return { id, kind: "video", src: `${web}/${file}`, thumb: "/kili/box.webp", alt: opts.alt };
  }
  if (!IMAGE_TYPES.has(mime)) throw new Error("Only photos (JPG, PNG, WebP, HEIC) and videos (MP4, WebM, MOV) are allowed");
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("Photo is larger than 15 MB");

  const base = sharp(buf, { failOn: "error" }).rotate(); // apply phone orientation, then drop metadata
  const meta = await base.metadata();
  await fs.mkdir(dir, { recursive: true });
  const sizes = [
    { name: "lg", width: 1600 },
    { name: "md", width: 800 },
    { name: "th", width: 400 },
  ];
  let lgSize = { width: meta.width ?? 1600, height: meta.height ?? 1200 };
  for (const s of sizes) {
    let img = base.clone().resize({ width: s.width, withoutEnlargement: true });
    if (opts.watermark && s.name !== "th") {
      const resized = await img.toBuffer({ resolveWithObject: true });
      const wm = await watermark(resized.info.width);
      img = sharp(resized.data).composite([{ input: wm, gravity: "southeast" }]);
    }
    const out = await img.webp({ quality: s.name === "th" ? 72 : 80 }).toFile(path.join(dir, `${s.name}.webp`));
    if (s.name === "lg") lgSize = { width: out.width, height: out.height };
  }
  return { id, kind: "image", src: `${web}/lg.webp`, thumb: `${web}/th.webp`, ...lgSize, alt: opts.alt };
}

/** Maps /media/<id>/<file> (public) or /media/p/<id>/<file> (owner only) to a disk path; null if the name is not allowed. */
export function mediaPath(parts: string[]): { file: string; private: boolean } | null {
  const priv = parts[0] === "p";
  const rest = priv ? parts.slice(1) : parts;
  if (rest.length !== 2) return null;
  const [id, file] = rest as [string, string];
  if (!/^[a-f0-9]{16}$/.test(id) || !/^(lg|md|th)\.webp$|^video\.(mp4|webm|mov)$/.test(file)) return null;
  return { file: path.join(priv ? PRIVATE_ROOT : MEDIA_ROOT, id, file), private: priv };
}

/** Moves owner-only media (from a Sell request) into public media when it becomes a listing. */
export async function publishMedia(list: Media[]): Promise<Media[]> {
  const out: Media[] = [];
  for (const m of list) {
    if (m.kind === "video") continue; // never publish a private video: its location data is not stripped
    if (!m.src.startsWith("/media/p/")) {
      out.push(m);
      continue;
    }
    await fs.cp(path.join(PRIVATE_ROOT, m.id), path.join(MEDIA_ROOT, m.id), { recursive: true });
    out.push({ ...m, src: m.src.replace("/media/p/", "/media/"), thumb: m.thumb.replace("/media/p/", "/media/") });
  }
  return out;
}

export function mdOf(m: Media): string {
  return m.kind === "image" ? m.src.replace(/lg\.webp$/, "md.webp") : m.thumb;
}
