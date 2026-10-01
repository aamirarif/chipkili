import Link from "next/link";
import { store } from "lib/store";
import { seoChecks } from "lib/listing-rules";
import { SITE_URL } from "lib/site";

export const metadata = { title: "SEO" };

export default async function SeoPage() {
  const [items, cats, events] = await Promise.all([store().list("items"), store().list("categories"), store().list("events")]);
  const live = items.filter((i) => i.status === "live" || i.status === "pending");
  const scored = live
    .map((i) => {
      const c = seoChecks(i);
      return { i, score: c.filter((x) => x.ok).length, total: c.length, missing: c.filter((x) => !x.ok).map((x) => x.label) };
    })
    .sort((a, b) => a.score - b.score);
  const noIntro = cats.filter((c) => !c.intro);
  const searches = new Map<string, number>();
  for (const e of events) if ((e.kind === "search" || e.kind === "zero") && e.query) searches.set(e.query.toLowerCase(), (searches.get(e.query.toLowerCase()) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <h1 className="heading text-3xl">SEO</h1>
      <section className="card grid gap-4 p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-ink-2">Average listing score</p>
          <p className="text-3xl font-bold">{scored.length ? (scored.reduce((a, s) => a + s.score / s.total, 0) / scored.length * 100).toFixed(0) : 0}%</p>
        </div>
        <div>
          <p className="text-ink-2">For search engines</p>
          <p>
            <a className="underline" href={`${SITE_URL}/sitemap.xml`} target="_blank">sitemap.xml</a> ·{" "}
            <a className="underline" href={`${SITE_URL}/robots.txt`} target="_blank">robots.txt</a> ·{" "}
            <a className="underline" href={`${SITE_URL}/llms.txt`} target="_blank">llms.txt</a>
          </p>
        </div>
        <div>
          <p className="text-ink-2">Still to do once live</p>
          <p>Verify the site in Google Search Console and Bing Webmaster Tools (a DNS record in Cloudflare), and set up the Google Business Profile as a service-area business.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Listings to improve (lowest score first)</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {scored.slice(0, 40).map(({ i, score, total, missing }) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <Link href={`/admin/items/${i.id}`} className="font-medium hover:underline">
                {i.code} {i.title}
              </Link>
              <span className="text-xs text-ink-3">
                <b className={score >= 8 ? "text-chip" : "text-btn"}>
                  {score}/{total}
                </b>{" "}
                {missing.slice(0, 3).join("; ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Categories without an intro</h2>
        <p className="text-sm text-ink-2">A short paragraph on each category page helps it rank. Add it in Categories.</p>
        <p className="mt-2 text-sm">{noIntro.map((c) => c.name).join(", ") || "All done."}</p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">What people search for on ChipKili</h2>
        <p className="text-sm text-ink-2">Use these words in titles and keywords.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {[...searches.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 40)
            .map(([q, n]) => (
              <li key={q} className="chip !bg-cream-2 text-sm">
                {q} <b>{n}</b>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
