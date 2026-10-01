import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "lib/store";
import { prettyPhone } from "lib/phone";
import { money, timeAgo } from "lib/site";
import { getSettings } from "lib/settings";
import { SITE_URL } from "lib/site";
import { expand, scoreItem, tokenize } from "lib/search";
import { LeadActions } from "./lead-actions";

export const metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, items, events, settings] = await Promise.all([store().get("leads", id), store().list("items"), store().list("events"), getSettings()]);
  if (!lead) notFound();
  const item = items.find((i) => i.id === lead.itemId);
  const history = lead.visitorId
    ? events
        .filter((e) => e.visitorId === lead.visitorId && e.kind === "view" && e.itemId)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, 12)
        .map((e) => ({ at: e.at, item: items.find((i) => i.id === e.itemId) }))
        .filter((x) => x.item)
    : [];
  const findMatches =
    lead.type === "find"
      ? (() => {
          const groups = expand(tokenize(`${lead.message} ${lead.fields["Brand or model"] ?? ""}`), settings.synonyms).slice(0, 4);
          const max = Number((lead.fields["Budget up to"] ?? "").replace(/\D/g, "")) || Infinity;
          return items.filter((i) => i.status === "live" && i.price <= max && scoreItem(i, groups) > 0).slice(0, 12);
        })()
      : [];
  const sms = `sms:${lead.phone}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <Link href={`/admin/leads${lead.type === "sell" || lead.type === "find" ? `?type=${lead.type}` : ""}`} className="text-sm text-ink-3 hover:underline">
            &larr; Back
          </Link>
          <h1 className="heading text-3xl">{lead.name}</h1>
          <p className="text-ink-2">
            {prettyPhone(lead.phone)} (verified){lead.email ? ` · ${lead.email}` : ""} · {timeAgo(lead.createdAt)}
            {lead.source ? ` · source: ${lead.source}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={sms} className="btn btn-primary !py-2 text-sm">
              Text {lead.name.split(" ")[0]}
            </a>
            <a href={`tel:${lead.phone}`} className="btn btn-outline !py-2 text-sm">
              Call
            </a>
          </div>
        </div>
        {item ? (
          <Link href={`/admin/items/${item.id}`} className="card flex items-center gap-3 p-3 hover:shadow-[var(--shadow-pop)]">
            <span className="relative size-14 overflow-hidden rounded-lg bg-cream-2">
              {item.media[0] ? <Image src={item.media[0].thumb} alt="" fill sizes="56px" className="object-cover" /> : null}
            </span>
            <span>
              <b>{item.title}</b>
              <span className="block text-sm text-ink-3">
                {item.code} · {money(item.price)} · {item.status}
              </span>
            </span>
          </Link>
        ) : null}
        <section className="card p-5">
          <h2 className="font-bold">Message</h2>
          <p className="mt-2 whitespace-pre-line text-ink-2">{lead.message}</p>
          {Object.keys(lead.fields).length ? (
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {Object.entries(lead.fields)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </section>
        {lead.media.length ? (
          <section className="card p-5">
            <h2 className="font-bold">Photos and video</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {lead.media.map((m) =>
                m.kind === "video" ? (
                  <video key={m.id} src={m.src} controls className="aspect-square w-full rounded-xl bg-black object-contain" />
                ) : (
                  <a key={m.id} href={m.src} target="_blank" className="relative aspect-square overflow-hidden rounded-xl bg-cream-2">
                    {/* plain img: owner-only files need the signed-in cookie, which the image optimizer does not send */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.thumb} alt="" className="h-full w-full object-cover" />
                  </a>
                ),
              )}
            </div>
          </section>
        ) : null}
        {findMatches.length ? (
          <section className="card p-5">
            <h2 className="font-bold">Listings that match this request</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {findMatches.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <a href={`${SITE_URL}/i/${i.slug}`} target="_blank" className="hover:underline">
                    {i.title}
                  </a>
                  <b>{money(i.price)}</b>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <aside className="space-y-6">
        <LeadActions id={lead.id} type={lead.type} status={lead.status} notes={lead.notes ?? ""} ebayQuery={lead.type === "sell" || lead.type === "find" ? (lead.fields["Brand and model"] || lead.fields["Brand or model"] || lead.message).slice(0, 80) : ""} />
        <section className="card p-5">
          <h2 className="font-bold">What they looked at</h2>
          {history.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="line-clamp-1">{h.item!.title}</span>
                  <span className="shrink-0 text-ink-3">{timeAgo(h.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-2">No browsing history (the visitor did not allow it, or browsed on another device).</p>
          )}
        </section>
      </aside>
    </div>
  );
}
