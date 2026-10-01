"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LEAD_STATUSES, type LeadStatus, type LeadType } from "lib/types";
import { leadToListing, updateLead } from "../../../actions";

export function LeadActions({ id, type, status, notes, ebayQuery }: { id: string; type: LeadType; status: LeadStatus; notes: string; ebayQuery: string }) {
  const [s, setS] = useState(status);
  const [n, setN] = useState(notes);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-bold">Status and notes</h2>
      <select className="field" value={s} onChange={(e) => setS(e.target.value as LeadStatus)}>
        {LEAD_STATUSES.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <textarea className="field min-h-28" placeholder="Private notes: offer amount, pickup time..." value={n} onChange={(e) => setN(e.target.value)} />
      <button
        disabled={pending}
        className="btn btn-dark w-full !py-2 text-sm"
        onClick={() =>
          start(async () => {
            await updateLead(id, s, n);
            setSaved(true);
            router.refresh();
          })
        }
      >
        {pending ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
      {ebayQuery ? (
        <a
          href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ebayQuery)}&LH_Sold=1&LH_Complete=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline w-full !py-2 text-sm"
        >
          Check eBay sold prices
        </a>
      ) : null}
      {type === "sell" ? (
        <button disabled={pending} onClick={() => start(async () => void (await leadToListing(id)))} className="btn btn-primary w-full !py-2 text-sm">
          Turn into a listing
        </button>
      ) : null}
    </section>
  );
}
