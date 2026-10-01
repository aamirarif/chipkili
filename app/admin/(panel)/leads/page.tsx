import Link from "next/link";
import { store } from "lib/store";
import { prettyPhone } from "lib/phone";
import { timeAgo } from "lib/site";
import { LEAD_TYPES, type Lead } from "lib/types";
import { expand, scoreItem, tokenize } from "lib/search";
import { getSettings } from "lib/settings";

export const metadata = { title: "Leads" };

const TITLES: Record<string, string> = { message: "Messages", contact: "Contact form", sell: "Sell requests", find: "Find requests" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const [{ type, status }, leads, items, settings] = await Promise.all([searchParams, store().list("leads"), store().list("items"), getSettings()]);
  const t = (LEAD_TYPES as readonly string[]).includes(type ?? "") ? type : undefined;
  const rows = leads
    .filter((l) => (t ? l.type === t : l.type === "message" || l.type === "contact"))
    .filter((l) => !status || l.status === status)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const live = items.filter((i) => i.status === "live");
  const matches = (l: Lead) => {
    if (l.type !== "find") return 0;
    const groups = expand(tokenize(`${l.message} ${l.fields["Brand or model"] ?? ""}`), settings.synonyms).slice(0, 4);
    const max = Number((l.fields["Budget up to"] ?? "").replace(/\D/g, "")) || Infinity;
    return live.filter((i) => i.price <= max && scoreItem(i, groups) > 0).length;
  };

  return (
    <div>
      <h1 className="heading text-3xl">{t ? TITLES[t] : "Leads"}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["", "Messages and contact"],
          ["sell", "Sell requests"],
          ["find", "Find requests"],
        ].map(([k, label]) => (
          <Link key={k} href={k ? `/admin/leads?type=${k}` : "/admin/leads"} className="chip" aria-current={(t ?? "") === k ? "true" : undefined}>
            {label}
          </Link>
        ))}
        <span className="mx-1 self-center text-ink-3">|</span>
        {["new", "replied", "offer-sent", "done"].map((s) => (
          <Link key={s} href={`/admin/leads?${t ? `type=${t}&` : ""}status=${s}`} className="chip !py-1 text-sm" aria-current={status === s ? "true" : undefined}>
            {s}
          </Link>
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {rows.map((l) => {
          const it = items.find((i) => i.id === l.itemId);
          const m = matches(l);
          return (
            <li key={l.id}>
              <Link href={`/admin/leads/${l.id}`} className="card block p-4 hover:shadow-[var(--shadow-pop)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <b>{l.name}</b> <span className="text-ink-3">{prettyPhone(l.phone)}</span>
                  </p>
                  <span className="flex items-center gap-2 text-xs">
                    {m ? <span className="rounded-full bg-sage px-2 py-0.5 font-bold text-chip">{m} match(es)</span> : null}
                    {l.media.length ? <span className="rounded-full bg-cream-2 px-2 py-0.5">{l.media.length} photo(s)</span> : null}
                    <span className={`rounded-full px-2 py-0.5 font-bold ${l.status === "new" ? "bg-kili text-white" : "bg-cream-2"}`}>{l.status}</span>
                    <span className="text-ink-3">{timeAgo(l.createdAt)}</span>
                  </span>
                </div>
                {it ? <p className="mt-1 text-sm font-semibold text-leaf">{it.title}</p> : null}
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{l.message}</p>
                {l.source ? <p className="mt-1 text-xs text-ink-3">Source: {l.source}</p> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {!rows.length ? <p className="mt-6 text-ink-2">Nothing here yet.</p> : null}
    </div>
  );
}
