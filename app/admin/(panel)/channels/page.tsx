import Link from "next/link";
import { store } from "lib/store";
import { SITE_URL } from "lib/site";

export const metadata = { title: "Channels" };

const CHANNELS = [
  { key: "ebay", label: "eBay", how: "Copy text from each listing now. Push and sold-sync switch on after the one-time eBay seller sign-in (developer.ebay.com, User Tokens)." },
  { key: "facebook", label: "Facebook Marketplace", how: "No public posting API. Copy the title, description and link from the listing, post by hand, tick Posted." },
  { key: "offerup", label: "OfferUp", how: "Post by hand with the copy buttons." },
  { key: "craigslist", label: "Craigslist", how: "Post by hand with the copy buttons." },
];

export default async function ChannelsPage() {
  const items = (await store().list("items")).filter((i) => i.status === "live" || i.status === "pending");
  const sold = (await store().list("items")).filter((i) => i.status === "sold" && Object.values(i.postedOn).some(Boolean));
  return (
    <div className="space-y-6">
      <h1 className="heading text-3xl">Channels</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {CHANNELS.map((c) => {
          const posted = items.filter((i) => i.postedOn[c.key]).length;
          return (
            <section key={c.key} className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{c.label}</h2>
                <span className="text-sm text-ink-2">
                  {posted} of {items.length} live listings posted
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-2">{c.how}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-leaf">Not posted yet ({items.length - posted})</summary>
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
                  {items
                    .filter((i) => !i.postedOn[c.key])
                    .map((i) => (
                      <li key={i.id}>
                        <Link href={`/admin/items/${i.id}`} className="hover:underline">
                          {i.code} {i.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </details>
            </section>
          );
        })}
      </div>
      <section className="card p-5">
        <h2 className="text-lg font-bold">Sold here, still posted elsewhere</h2>
        <p className="text-sm text-ink-2">Take these down on the other sites so no one buys a sold item. Untick Posted once removed.</p>
        {sold.length ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {sold.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/admin/items/${i.id}`} className="hover:underline">
                  {i.code} {i.title}
                </Link>
                <span className="text-ink-3">
                  {Object.entries(i.postedOn)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink-2">Nothing to take down.</p>
        )}
      </section>
      <section className="card p-5 text-sm text-ink-2">
        <h2 className="text-lg font-bold text-ink">Facebook and Google feeds</h2>
        <p className="mt-1">
          Off until proven: a catalog feed only goes live after one test item is approved and a price change and a removal are seen coming through (plan v1.1). Google
          Shopping needs a checkout, so it stays off; items still reach Google through normal search, the sitemap ({SITE_URL}/sitemap.xml) and product data on every page.
        </p>
      </section>
    </div>
  );
}
