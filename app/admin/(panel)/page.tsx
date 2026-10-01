import Link from "next/link";
import { store } from "lib/store";
import { money, timeAgo } from "lib/site";
import { prettyPhone } from "lib/phone";
import { viewCounts } from "lib/views";

const DAY = 864e5;

export default async function Dashboard() {
  const [items, leads, events, shares] = await Promise.all([store().list("items"), store().list("leads"), store().list("events"), store().list("shares")]);
  const views = await viewCounts();
  const now = Date.now();
  const week = (iso: string) => now - Date.parse(iso) < 7 * DAY;
  const live = items.filter((i) => i.status === "live" || i.status === "pending");
  const views7 = events.filter((e) => e.kind === "view" && week(e.at));
  const visitors7 = new Set(events.filter((e) => week(e.at)).map((e) => e.visitorId)).size;
  const needsReply = leads.filter((l) => l.status === "new").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const soldWeek = items.filter((i) => i.status === "sold" && i.soldAt && week(i.soldAt));
  const top = [...live].sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0)).slice(0, 8);
  const zero = new Map<string, number>();
  for (const e of events) if (e.kind === "zero" && e.query && week(e.at)) zero.set(e.query.toLowerCase(), (zero.get(e.query.toLowerCase()) ?? 0) + 1);
  const sources = new Map<string, number>();
  for (const e of events) if (e.source && week(e.at)) sources.set(e.source, (sources.get(e.source) ?? 0) + 1);
  const drafts = items.filter((i) => i.status === "draft").length;

  const tiles = [
    { label: "Live listings", value: live.length, href: "/admin/items?status=live" },
    { label: "Visitors (7 days)", value: visitors7 },
    { label: "Item views (7 days)", value: views7.length },
    { label: "Need a reply", value: needsReply.length, href: "/admin/leads", hot: needsReply.length > 0 },
    { label: "Sell requests (new)", value: leads.filter((l) => l.type === "sell" && l.status === "new").length, href: "/admin/leads?type=sell" },
    { label: "Find requests (new)", value: leads.filter((l) => l.type === "find" && l.status === "new").length, href: "/admin/leads?type=find" },
    { label: "Sold this week", value: soldWeek.length },
    { label: "Drafts", value: drafts, href: "/admin/items?status=draft" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading text-3xl">Dashboard</h1>
        <Link href="/admin/items/new" className="btn btn-primary">
          + Add listing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-sm text-ink-2">{t.label}</p>
              <p className={`mt-1 text-3xl font-bold ${t.hot ? "text-btn" : ""}`}>{t.value}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card p-4 hover:shadow-[var(--shadow-pop)]">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card p-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-bold">Needs a reply</h2>
          {needsReply.length ? (
            <ul className="mt-3 divide-y divide-line">
              {needsReply.slice(0, 8).map((l) => {
                const it = items.find((i) => i.id === l.itemId);
                return (
                  <li key={l.id} className="py-2.5">
                    <Link href={`/admin/leads/${l.id}`} className="flex items-start justify-between gap-3 hover:underline">
                      <span>
                        <b>{l.name}</b> <span className="text-ink-3">{prettyPhone(l.phone)}</span>
                        <span className="block text-sm text-ink-2">{it ? it.title : l.type === "sell" ? "Sell to ChipKili" : l.type === "find" ? "Find it for me" : "Contact"}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-3">{timeAgo(l.createdAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-ink-2">All caught up.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Top items by views</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {top.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/items/${i.id}`} className="line-clamp-1 hover:underline">
                  {i.title}
                </Link>
                <span className="shrink-0 text-ink-3">
                  {views.get(i.id) ?? 0} views &middot; {money(i.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Searches with no results (7 days)</h2>
          <p className="text-sm text-ink-3">What people want that you don&apos;t have yet. Your buying list.</p>
          {zero.size ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...zero.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 30)
                .map(([q, n]) => (
                  <li key={q} className="chip !bg-cream-2 text-sm">
                    {q} <b>{n}</b>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-2">None yet.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Where visitors came from (7 days)</h2>
          <p className="text-sm text-ink-3">From share links, QR codes and source tags.</p>
          {sources.size ? (
            <ul className="mt-3 divide-y divide-line text-sm">
              {[...sources.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([s, n]) => (
                  <li key={s} className="flex justify-between py-1.5">
                    <span>{s}</span>
                    <b>{n}</b>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-2">No tagged visits yet. Share links from Admin, Share links, to see them here.</p>
          )}
          <p className="mt-3 text-sm text-ink-3">{shares.length} share link(s), {shares.reduce((a, s) => a + s.clicks, 0)} clicks total.</p>
        </section>
      </div>
    </div>
  );
}
