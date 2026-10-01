"use client";

import { useState, useTransition } from "react";
import type { Settings } from "lib/types";
import { fillSample } from "./sample";
import { updateSettings } from "../../actions";

const box = "rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] space-y-3";

export function SettingsForm({ initial, notifyLive }: { initial: Settings; notifyLive: boolean }) {
  const [s, setS] = useState<Settings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  const text = (k: keyof Settings, label: string, hint?: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="field" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      {hint ? <span className="mt-1 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  );

  const sms = (k: "smsLeadToOwner" | "smsAutoReply" | "smsContactAutoReply", label: string) => {
    const sample = fillSample(s[k]);
    const segs = sample.length <= 160 ? 1 : Math.ceil(sample.length / 153);
    return (
      <label className="block">
        <span className="label">{label}</span>
        <textarea className="field min-h-20" value={s[k]} onChange={(e) => set(k, e.target.value)} />
        <span className="mt-1 block rounded-xl bg-cream p-2 text-xs text-ink-2">
          Preview: {sample} <b className={segs > 2 ? "text-btn" : ""}>({sample.length} characters, {segs} text{segs > 1 ? "s" : ""})</b>
        </span>
      </label>
    );
  };

  return (
    <div className="mt-5 grid gap-6 pb-24 xl:grid-cols-2">
      <section className={box}>
        <h2 className="text-lg font-bold">You and the site</h2>
        {text("operatorLine", "Who runs the site (footer and legal pages)")}
        {text("publicPhone", "Public phone (Call about this item)", "Format: +12013444230")}
        {text("replyTime", "Usually replies within", 'For example "a few hours"')}
        {text("ebayStoreUrl", "eBay store link")}
        {text("heroText", "Home page text under the slogan")}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-btn" checked={s.watermark} onChange={(e) => set("watermark", e.target.checked)} />
          Put a small ChipKili mark on new listing photos
        </label>
      </section>

      <section className={box}>
        <h2 className="text-lg font-bold">Leads and alerts</h2>
        <p className={`rounded-xl p-3 text-sm ${notifyLive ? "bg-sage" : "bg-gold/25"}`}>
          {notifyLive
            ? "Texts and emails are LIVE."
            : "Texts and emails are in test mode: nothing is sent, every message is written to the outbox log on the server. Switch on only after the texting number is approved."}
        </p>
        {text("alertPhone", "Your cell for lead alerts", "Format: +12013444230")}
        {text("alertEmail", "Your email for lead alerts")}
        {sms("smsLeadToOwner", "Text to you when a lead comes in")}
        {sms("smsAutoReply", "Automatic reply to the buyer (about an item)")}
        {sms("smsContactAutoReply", "Automatic reply (contact, sell, find)")}
        <p className="text-xs text-ink-3">Placeholders: {"{name} {phone} {item} {price} {message}"}. Keep it plain: no links, no emojis, under 2 texts.</p>
      </section>

      <section className={box}>
        <h2 className="text-lg font-bold">Pickup and delivery</h2>
        <div className="grid grid-cols-2 gap-3">
          {text("pickupTown", "Pickup town shown on the site")}
          {text("pickupZip", "ZIP")}
        </div>
        {text("deliveryNote", "Delivery line")}
        <label className="block">
          <span className="label">Default search radius (miles)</span>
          <input className="field" type="number" value={s.defaultRadiusMiles} onChange={(e) => set("defaultRadiusMiles", Number(e.target.value) || 25)} />
        </label>
        <p className="label">Delivery fees by distance</p>
        {s.deliveryBands.map((b, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            up to
            <input className="field !w-20" type="number" value={b.upToMiles} onChange={(e) => set("deliveryBands", s.deliveryBands.map((x, j) => (j === i ? { ...x, upToMiles: Number(e.target.value) } : x)))} />
            mi: $
            <input className="field !w-24" type="number" value={b.fee} onChange={(e) => set("deliveryBands", s.deliveryBands.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)))} />
            <button className="px-2 text-btn" onClick={() => set("deliveryBands", s.deliveryBands.filter((_, j) => j !== i))} aria-label="Remove">
              &times;
            </button>
          </div>
        ))}
        <button className="text-sm text-leaf underline" onClick={() => set("deliveryBands", [...s.deliveryBands, { upToMiles: 50, fee: 100 }])}>
          + Add a distance band
        </button>
        <p className="text-xs text-ink-3">Farther than the last band shows &quot;Ask for a quote&quot;.</p>
      </section>

      <section className={box}>
        <h2 className="text-lg font-bold">Search and Sell to ChipKili</h2>
        <label className="block">
          <span className="label">Search synonyms (one group per line, words separated by commas)</span>
          <textarea
            className="field min-h-32 font-mono text-sm"
            value={s.synonyms.map((g) => g.join(", ")).join("\n")}
            onChange={(e) =>
              set(
                "synonyms",
                e.target.value
                  .split("\n")
                  .map((l) => l.split(",").map((w) => w.trim()).filter(Boolean))
                  .filter((g) => g.length > 1),
              )
            }
          />
        </label>
        <p className="label">&quot;We buy&quot; pages</p>
        {s.weBuyTypes.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-cream p-3 sm:grid-cols-[1fr_2fr]">
            <input className="field" value={t.name} onChange={(e) => set("weBuyTypes", s.weBuyTypes.map((x, j) => (j === i ? { ...x, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : x)))} />
            <input className="field" value={t.items} onChange={(e) => set("weBuyTypes", s.weBuyTypes.map((x, j) => (j === i ? { ...x, items: e.target.value } : x)))} />
          </div>
        ))}
        <button className="text-sm text-leaf underline" onClick={() => set("weBuyTypes", [...s.weBuyTypes, { slug: "new-type", name: "New type", items: "What you buy" }])}>
          + Add a We buy page
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-[240px]">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
          {msg ? <p className={`text-sm font-semibold ${msg.ok ? "text-chip" : "text-btn"}`}>{msg.text}</p> : null}
          <button
            disabled={pending}
            className="btn btn-dark ml-auto !py-2 text-sm"
            onClick={() =>
              start(async () => {
                const res = await updateSettings(s);
                setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error ?? "Could not save" });
              })
            }
          >
            {pending ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
