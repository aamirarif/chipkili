import { store } from "lib/store";
import { SITE_URL } from "lib/site";
import { ShareBuilder } from "./share-builder";

export const metadata = { title: "Share links" };

export default async function SharesPage() {
  const [shares, cats] = await Promise.all([store().list("shares"), store().list("categories")]);
  return (
    <div>
      <h1 className="heading text-3xl">Share links</h1>
      <p className="max-w-3xl text-ink-2">
        Make a short link for any category, search or item and share it in messages, groups and your profile. Every link carries a source tag, so the dashboard shows
        which shares bring visitors. Tip: do any search on the site, then copy the address from the browser and paste it below.
      </p>
      <ShareBuilder
        siteUrl={SITE_URL}
        shares={[...shares].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))}
        categories={cats.map((c) => ({ label: c.name, path: `/c/${c.slug}` }))}
      />
    </div>
  );
}
