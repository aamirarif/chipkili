import type { Media } from "lib/types";

/**
 * Descriptive media URLs for search engines: /media/<id>/<title-slug>-image-1.webp (large),
 * ...-image-1-md.webp and ...-image-1-th.webp. Files on disk keep their short names (lg/md/th.webp);
 * lib/media mediaPath maps any valid name back to them, so renaming a listing never breaks an old URL.
 * Pure (no node imports) so client components can use it. scripts/seo-media-names.mjs mirrors seoMedia.
 */
export type MediaSize = "lg" | "md" | "th";

const MAX_NAME = 80;

export function mediaSlug(title: string): string {
  const full = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // cut long titles at a word boundary
  const cut = full.length > MAX_NAME ? full.slice(0, MAX_NAME).replace(/-[^-]*$/, "") : full;
  return cut || "item";
}

/** The same picture at another size, for both the old (lg.webp) and the descriptive naming. */
export function mediaSize(src: string, size: MediaSize): string {
  const short = src.match(/^(.*\/)(?:lg|md|th)\.webp$/);
  if (short) return `${short[1]}${size}.webp`;
  const named = src.match(/^(.*?)(?:-(?:md|th))?\.webp$/);
  if (!named) return src;
  return size === "lg" ? `${named[1]}.webp` : `${named[1]}-${size}.webp`;
}

/** Gives every photo and video of a listing a descriptive URL and alt text from its title. */
export function seoMedia(title: string, media: Media[]): Media[] {
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
