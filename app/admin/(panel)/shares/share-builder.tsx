"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShareLink } from "lib/types";
import { createShare, deleteShare } from "../../actions";

export function ShareBuilder({ siteUrl, shares, categories }: { siteUrl: string; shares: ShareLink[]; categories: { label: string; path: string }[] }) {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [source, setSource] = useState("facebook-group");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function normalize(v: string): string {
    try {
      if (/^https?:\/\//.test(v)) {
        const u = new URL(v);
        u.searchParams.delete("src");
        return `${u.pathname}${u.search}`;
      }
    } catch {
      /* fall through */
    }
    return v.trim();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-bold">New share link</h2>
        <label className="block">
          <span className="label">What to share</span>
          <select className="field" value="" onChange={(e) => e.target.value && (setTarget(e.target.value), setLabel(e.target.selectedOptions[0]?.text ?? ""))}>
            <option value="">Pick a category, or paste any link below</option>
            <option value="/">Home page</option>
            <option value="/price-drops">Price drops</option>
            <option value="/sell">Sell to ChipKili</option>
            <option value="/find">Find it for me</option>
            {categories.map((c) => (
              <option key={c.path} value={c.path}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Link (a search, a category or an item)</span>
          <input className="field" placeholder="/search?q=laptop&max=100" value={target} onChange={(e) => setTarget(normalize(e.target.value))} />
        </label>
        <label className="block">
          <span className="label">Name for you</span>
          <input className="field" placeholder="Laptops under $100 for the Teaneck group" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Where you will post it (source tag)</span>
          <input className="field" value={source} onChange={(e) => setSource(e.target.value)} list="sources" />
          <datalist id="sources">
            {["facebook-group", "facebook-profile", "marketplace-reply", "ebay-message", "whatsapp", "instagram", "flyer-qr", "text"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        {err ? <p className="text-sm font-semibold text-btn">{err}</p> : null}
        <button
          disabled={pending || !target}
          className="btn btn-primary w-full !py-2 text-sm"
          onClick={() =>
            start(async () => {
              const res = await createShare(label, target, source);
              if (!res.ok) return setErr(res.error ?? "Could not create");
              setErr("");
              setTarget("");
              setLabel("");
              router.refresh();
            })
          }
        >
          Create short link
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="p-3">Link</th>
              <th className="p-3">Source</th>
              <th className="p-3">Clicks</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shares.map((s) => {
              const short = `${siteUrl}/s/${s.code}`;
              return (
                <tr key={s.code}>
                  <td className="p-3">
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-ink-3">
                      {short} &rarr; {s.target}
                    </p>
                  </td>
                  <td className="p-3">{s.source}</td>
                  <td className="p-3 font-bold">{s.clicks}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="chip !py-1 text-xs" onClick={() => copy(short)}>
                        {copied === short ? "Copied" : "Copy"}
                      </button>
                      <button className="chip !py-1 text-xs" onClick={() => setQr(qr === s.code ? null : s.code)}>
                        QR
                      </button>
                      <button
                        className="chip !py-1 text-xs"
                        onClick={() =>
                          start(async () => {
                            await deleteShare(s.code);
                            router.refresh();
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                    {qr === s.code ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/qr?path=${encodeURIComponent(`/s/${s.code}`)}`} alt="QR code" className="ml-auto mt-2 size-40" />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shares.length ? <p className="p-6 text-center text-ink-2">No share links yet.</p> : null}
      </div>
    </div>
  );
}
