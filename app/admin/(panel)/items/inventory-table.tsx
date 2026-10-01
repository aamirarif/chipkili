"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, CONDITION_LABEL, type Condition, type ItemStatus } from "lib/types";
import { money } from "lib/site";
import { setStatus } from "../../actions";

type Row = {
  id: string;
  code: string;
  slug: string;
  title: string;
  thumb?: string;
  category: string;
  price: number;
  condition: Condition;
  status: ItemStatus;
  views: number;
  postedOn: Record<string, boolean>;
};

const STATUS_STYLE: Record<ItemStatus, string> = {
  draft: "bg-cream-2 text-ink-2",
  live: "bg-sage text-chip",
  pending: "bg-kili/15 text-btn",
  hold: "bg-gold/30 text-ink",
  sold: "bg-ink text-white",
  archived: "bg-line text-ink-3",
};

export function InventoryTable({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const all = sel.length === rows.length && rows.length > 0;

  function bulk(status: ItemStatus) {
    start(async () => {
      await setStatus(sel, status);
      setSel([]);
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      {sel.length ? (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-3 text-sm text-white">
          <b>{sel.length} selected</b>
          {(["live", "pending", "hold", "sold", "draft", "archived"] as ItemStatus[]).map((s) => (
            <button key={s} disabled={pending} onClick={() => bulk(s)} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
              Mark {s}
            </button>
          ))}
          <button onClick={() => setSel([])} className="ml-auto underline">
            Clear
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="p-3">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} className="size-4 accent-btn" />
              </th>
              <th className="p-3">Item</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Status</th>
              <th className="p-3">Views</th>
              <th className="p-3">Posted on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-cream/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.title}`}
                    checked={sel.includes(r.id)}
                    onChange={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                    className="size-4 accent-btn"
                  />
                </td>
                <td className="p-3">
                  <Link href={`/admin/items/${r.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                      {r.thumb ? <Image src={r.thumb} alt="" fill sizes="44px" className="object-cover" /> : null}
                    </span>
                    <span>
                      <span className="line-clamp-1 font-medium">{r.title || "(untitled)"}</span>
                      <span className="text-xs text-ink-3">{r.code}</span>
                    </span>
                  </Link>
                </td>
                <td className="p-3 text-ink-2">{r.category}</td>
                <td className="p-3 font-semibold">{money(r.price)}</td>
                <td className="p-3 text-ink-2">{CONDITION_LABEL[r.condition]}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </td>
                <td className="p-3 text-ink-2">{r.views}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.postedOn)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="rounded bg-cream-2 px-1.5 py-0.5 text-[11px] font-semibold">
                          {k}
                        </span>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-6 text-center text-ink-2">No listings match.</p> : null}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {rows.length} listing(s). Statuses: {STATUSES.join(", ")}.
      </p>
    </div>
  );
}
