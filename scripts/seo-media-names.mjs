// Gives every listing's photos and videos descriptive URLs + alt text from its title
// (/media/<id>/<title-slug>-image-1.webp). Mirrors seoMedia in lib/media-url.ts; keep the two in sync.
// Files on disk are not renamed: the media route maps any valid name back to lg/md/th.webp.
// Run ONLY while the chipkili container is stopped. Usage: node seo-media-names.mjs <data-dir>
import { promises as fs } from "node:fs";
import path from "node:path";

const [DATA] = process.argv.slice(2);
if (!DATA) throw new Error("usage: node seo-media-names.mjs <data-dir>");
const MAX_NAME = 80;

function mediaSlug(title) {
  const full = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cut = full.length > MAX_NAME ? full.slice(0, MAX_NAME).replace(/-[^-]*$/, "") : full;
  return cut || "item";
}

function seoMedia(title, media) {
  const base = mediaSlug(title);
  let photos = 0;
  let videos = 0;
  return media.map((m) => {
    if (!/^[a-f0-9]{16}$/.test(m.id)) return m;
    const dir = m.src.startsWith("/media/p/") ? "/media/p/" : "/media/";
    if (m.kind === "image") {
      photos++;
      const name = `${base}-image-${photos}`;
      return { ...m, src: `${dir}${m.id}/${name}.webp`, thumb: `${dir}${m.id}/${name}-th.webp`, alt: `${title} image ${photos}` };
    }
    videos++;
    const ext = m.src.match(/\.(mp4|webm|mov)$/)?.[1] ?? "mp4";
    return { ...m, src: `${dir}${m.id}/${base}-video-${videos}.${ext}`, alt: `${title} video ${videos}` };
  });
}

const dbFile = path.join(DATA, "db.json");
const db = JSON.parse(await fs.readFile(dbFile, "utf8"));
await fs.copyFile(dbFile, `${dbFile}.bak-${Date.now()}`);
let changed = 0;
for (const [code, it] of Object.entries(db.items ?? {})) {
  const media = seoMedia(it.title, it.media ?? []);
  if (JSON.stringify(media) !== JSON.stringify(it.media)) {
    db.items[code] = { ...it, media };
    changed++;
  }
}
await fs.writeFile(`${dbFile}.tmp`, JSON.stringify(db));
await fs.rename(`${dbFile}.tmp`, dbFile);
console.log(`descriptive media names: ${changed} listings updated of ${Object.keys(db.items ?? {}).length}`);
