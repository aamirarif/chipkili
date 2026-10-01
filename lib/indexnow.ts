import "server-only";
import { absolute, SITE_URL } from "lib/site";

/**
 * Tells Bing, Yandex and other IndexNow engines that a page changed, so new listings,
 * price changes and sales are picked up fast. Only runs when INDEXNOW_KEY is set and
 * NOTIFY_MODE=live; the key file is served at /<key>.txt by the indexnow route.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || process.env.NOTIFY_MODE !== "live" || !paths.length) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: absolute(`/${key}.txt`), urlList: paths.map(absolute) }),
    });
  } catch {
    /* best effort; the sitemap covers anything missed */
  }
}
