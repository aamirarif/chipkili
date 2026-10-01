"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CONDITIONS, CONDITION_LABEL, STATUSES, type Category, type Item, type Media } from "lib/types";
import { keywordIdeas, seoChecks, testedWarnings } from "lib/listing-rules";
import { channelCopies } from "lib/channel-copy";
import { money, shortDate } from "lib/site";
import { deleteItem, saveItem, setPosted, setStatus, uploadMedia, type ItemInputT } from "../../actions";

type Props = {
  item: Item;
  views: number;
  isNew: boolean;
  categories: Category[];
  towns: string[];
  siteUrl: string;
  pickupTown: string;
};

const box = "rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]";
const h2 = "text-lg font-bold";

export function ItemEditor({ item, views, isNew, categories, towns, siteUrl, pickupTown }: Props) {
  const router = useRouter();
  const [f, setF] = useState<Item>(item);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [kw, setKw] = useState("");
  const [copied, setCopied] = useState("");
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((s) => ({ ...s, [k]: v }));
  // opening another listing replaces the form; saves update it from the save result below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(item), [item.id]);

  const catName = categories.find((c) => c.id === f.categoryId)?.name ?? "";
  const checks = useMemo(() => seoChecks(f), [f]);
  const ideas = useMemo(() => keywordIdeas(f, catName), [f, catName]);
  const warnings = useMemo(() => testedWarnings(f), [f]);
  const copies = useMemo(() => channelCopies(f, siteUrl, pickupTown), [f, siteUrl, pickupTown]);
  const score = checks.filter((c) => c.ok).length;
  const previewTitle = (f.seoTitle || `${f.title} - ${money(f.price)}`).slice(0, 70);
  const previewDesc = (f.seoDescription || `${CONDITION_LABEL[f.condition]} ${f.title} for ${money(f.price)}. Local pickup in ${f.town}. ${f.description}`).slice(0, 158);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file);
    form.set("alt", f.title);
    const res = await uploadMedia(form);
    setUploading(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Upload failed" });
    set("media", [...f.media, ...(res.media ?? [])]);
  }

  function move(i: number, d: number) {
    const m = [...f.media];
    const j = i + d;
    if (j < 0 || j >= m.length) return;
    [m[i], m[j]] = [m[j]!, m[i]!];
    set("media", m);
  }

  function fillFromDetails() {
    const head = [f.brand, f.type, f.model].filter(Boolean).join(" ");
    const title = f.title || [head, f.dimensions, CONDITION_LABEL[f.condition]].filter(Boolean).join(" ");
    const lines = [
      f.brand ? `Brand: ${f.brand}` : "",
      f.type ? `Type: ${f.type}` : "",
      f.model ? `Model: ${f.model}` : "",
      f.dimensions ? `Size: ${f.dimensions}` : "",
      "",
      f.description || `${head || "This item"} in ${CONDITION_LABEL[f.condition].toLowerCase()} condition.`,
      f.whatsIncluded ? `Included: ${f.whatsIncluded}` : "",
      "",
      "Sold as-is. Inspect at pickup.",
    ].filter((l, i, a) => l || (a[i - 1] ?? ""));
    setF((s) => ({ ...s, title: title.slice(0, 120), description: lines.join("\n").trim() }));
  }

  function save(statusOverride?: Item["status"]) {
    setMsg(null);
    const input: ItemInputT = {
      id: isNew ? undefined : f.id,
      title: f.title,
      categoryId: f.categoryId,
      brand: f.brand,
      type: f.type,
      model: f.model,
      condition: f.condition,
      price: Number(f.price) || 0,
      originalPrice: f.originalPrice ? Number(f.originalPrice) : item.originalPrice ? null : undefined,
      quantity: Number(f.quantity) || 0,
      status: statusOverride ?? f.status,
      description: f.description,
      details: f.details,
      testedOn: f.testedOn,
      whatsIncluded: f.whatsIncluded,
      dimensions: f.dimensions,
      town: f.town,
      delivery: f.delivery,
      media: f.media,
      keywords: f.keywords,
      seoTitle: f.seoTitle,
      seoDescription: f.seoDescription,
      postedOn: f.postedOn,
      ebayItemId: f.ebayItemId,
      availableToOrder: f.availableToOrder,
    };
    startSave(async () => {
      const res = await saveItem(input);
      if (!res.ok || !res.item) return setMsg({ ok: false, text: res.error ?? "Could not save" });
      setF(res.item); // exactly what was stored
      setMsg({ ok: true, text: statusOverride === "live" ? "Published." : "Saved." });
      if (isNew) router.replace(`/admin/items/${res.item.id}`);
    });
  }

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  const input = (k: keyof Item, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="field" value={(f[k] as string | number | undefined) ?? ""} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </label>
  );

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/items" className="text-sm text-ink-3 hover:underline">
            &larr; Inventory
          </Link>
          <h1 className="heading text-3xl">{isNew ? "Add listing" : f.title || "Edit listing"}</h1>
          {!isNew ? (
            <p className="text-sm text-ink-3">
              {f.code} &middot; {views} views &middot;{" "}
              {["live", "pending", "hold", "sold"].includes(f.status) ? (
                <a href={`${siteUrl}/i/${f.slug}`} target="_blank" className="underline">
                  View on site
                </a>
              ) : (
                "not public yet"
              )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className={box}>
            <h2 className={h2}>Photos and video</h2>
            <p className="text-sm text-ink-3">First photo is the cover. Photo location data is removed on upload; video location data is not, so record videos with location turned off.</p>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {f.media.map((m: Media, i) => (
                <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl bg-cream-2">
                  <Image src={m.thumb} alt={m.alt ?? ""} fill sizes="160px" className="object-cover" />
                  {i === 0 ? <span className="badge badge-new absolute left-1.5 top-1.5">Cover</span> : null}
                  {m.kind === "video" ? <span className="badge badge-video absolute left-1.5 top-1.5">Video</span> : null}
                  <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/95 px-1.5 text-xs font-bold" aria-label="Move left">
                      &larr;
                    </button>
                    <button type="button" onClick={() => set("media", f.media.filter((x) => x.id !== m.id))} className="rounded bg-white/95 px-1.5 text-xs font-bold text-btn" aria-label="Remove">
                      Remove
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/95 px-1.5 text-xs font-bold" aria-label="Move right">
                      &rarr;
                    </button>
                  </div>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-sm hover:border-leaf">
                <span>
                  <span className="block text-2xl">+</span>
                  {uploading ? "Uploading..." : "Add photos or video"}
                </span>
                <input type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only" disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
              </label>
            </div>
          </section>

          <section className={box}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={h2}>Basics</h2>
              <button type="button" onClick={fillFromDetails} className="btn btn-outline !px-3 !py-1.5 text-sm">
                Draft title and description from the details
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">{input("title", "Title (Brand, Type, Model first)", { maxLength: 120 })}</div>
              <label className="block">
                <span className="label">Category</span>
                <select className="field" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">Choose...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `  - ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Condition</span>
                <select className="field" value={f.condition} onChange={(e) => set("condition", e.target.value as Item["condition"])}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              {input("brand", "Brand")}
              {input("type", "Type (for example: French-door refrigerator)")}
              {input("model", "Model")}
              {input("dimensions", "Size or dimensions")}
              {input("quantity", "Quantity", { type: "number", min: 0 })}
              <label className="block">
                <span className="label">Status</span>
                <select className="field" value={f.status} onChange={(e) => set("status", e.target.value as Item["status"])}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="size-4 accent-btn" checked={Boolean(f.availableToOrder)} onChange={(e) => set("availableToOrder", e.target.checked)} />
                Available to order (wholesale item, not in hand yet)
              </label>
            </div>
          </section>

          <section className={box}>
            <h2 className={h2}>Price</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {input("price", "Price ($)", { type: "number", min: 0, step: "0.01" })}
              {input("originalPrice", 'Was price ($), shown crossed out. Leave blank for none', { type: "number", min: 0, step: "0.01" })}
            </div>
            <p className="mt-2 text-xs text-ink-3">Lowering the price records a price drop: the old price shows crossed out and the item appears in Price drops.</p>
            {f.priceHistory.length ? (
              <p className="mt-2 text-sm text-ink-2">
                History: {f.priceHistory.map((p) => `${money(p.price)} (${shortDate(p.at)})`).join(" → ")}
              </p>
            ) : null}
          </section>

          <section className={box}>
            <h2 className={h2}>Description and details</h2>
            {warnings.length ? (
              <p className="mt-2 rounded-xl bg-gold/25 p-3 text-sm">{warnings.join(" ")}</p>
            ) : null}
            <label className="mt-3 block">
              <span className="label">Description</span>
              <textarea className="field min-h-40" value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {input("whatsIncluded", "What's included")}
              {input("testedOn", "Tested (optional, shown only if filled)")}
            </div>
            <p className="label mt-4">More details (shown as a table)</p>
            <div className="space-y-2">
              {f.details.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input className="field !w-40" value={d.label} placeholder="Label" onChange={(e) => set("details", f.details.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="field" value={d.value} placeholder="Value" onChange={(e) => set("details", f.details.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" className="px-2 text-btn" onClick={() => set("details", f.details.filter((_, j) => j !== i))} aria-label="Remove row">
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" className="text-sm text-leaf underline" onClick={() => set("details", [...f.details, { label: "", value: "" }])}>
                + Add a row
              </button>
            </div>
          </section>

          <section className={box}>
            <h2 className={h2}>Pickup and delivery</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Pickup town (the exact address is never shown)</span>
                <select className="field" value={f.town} onChange={(e) => set("town", e.target.value)}>
                  {towns.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input type="checkbox" className="size-4 accent-btn" checked={f.delivery} onChange={(e) => set("delivery", e.target.checked)} />
                Delivery available for a fee
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={box}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>SEO</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${score >= 8 ? "bg-sage text-chip" : score >= 5 ? "bg-gold/30" : "bg-kili/15 text-btn"}`}>
                {score}/{checks.length}
              </span>
            </div>
            <div className="mt-3 rounded-xl border border-line p-3">
              <p className="text-xs text-ink-3">chipkili.com &rsaquo; i &rsaquo; {f.slug.slice(0, 30)}</p>
              <p className="line-clamp-1 text-[17px] text-[#1a0dab]">{previewTitle}</p>
              <p className="line-clamp-2 text-xs text-ink-2">{previewDesc}</p>
            </div>
            <label className="mt-3 block">
              <span className="label">Keywords (press Enter)</span>
              <input
                className="field"
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kw.trim()) {
                    e.preventDefault();
                    if (!f.keywords.includes(kw.trim())) set("keywords", [...f.keywords, kw.trim()]);
                    setKw("");
                  }
                }}
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.keywords.map((k) => (
                <button key={k} type="button" onClick={() => set("keywords", f.keywords.filter((x) => x !== k))} className="chip !bg-sage !py-0.5 text-xs">
                  {k} &times;
                </button>
              ))}
            </div>
            {ideas.length ? (
              <>
                <p className="mt-3 text-xs font-semibold text-ink-3">Suggestions (tap to add)</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ideas.map((k) => (
                    <button key={k} type="button" onClick={() => set("keywords", [...f.keywords, k])} className="chip !py-0.5 text-xs">
                      + {k}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <div className="mt-3 space-y-2">
              {input("seoTitle", "Search title (optional)", { maxLength: 80 })}
              <label className="block">
                <span className="label">Search description (optional)</span>
                <textarea className="field min-h-16" maxLength={170} value={f.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} />
              </label>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? "text-chip" : "text-ink-3"}>
                  {c.ok ? "✓" : "○"} {c.label}
                </li>
              ))}
            </ul>
          </section>

          {!isNew ? (
            <section className={box}>
              <h2 className={h2}>Channels</h2>
              <p className="text-sm text-ink-3">Copy the text, paste it on the site, tick when posted.</p>
              <ul className="mt-3 space-y-3">
                {copies.map((c) => (
                  <li key={c.channel} className="rounded-xl bg-cream p-3">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm">{c.label}</b>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="size-4 accent-btn"
                          checked={Boolean(f.postedOn[c.channel])}
                          onChange={async (e) => {
                            const v = e.target.checked;
                            set("postedOn", { ...f.postedOn, [c.channel]: v });
                            await setPosted(f.id, c.channel, v);
                          }}
                        />
                        Posted
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copy(`${c.channel}-t`, c.title)} className="chip !bg-white text-xs">
                        {copied === `${c.channel}-t` ? "Copied" : "Copy title"}
                      </button>
                      <button type="button" onClick={() => copy(`${c.channel}-b`, c.body)} className="chip !bg-white text-xs">
                        {copied === `${c.channel}-b` ? "Copied" : "Copy description"}
                      </button>
                      <button type="button" onClick={() => copy(`${c.channel}-l`, `${siteUrl}/i/${f.slug}?src=${c.channel}`)} className="chip !bg-white text-xs">
                        {copied === `${c.channel}-l` ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-3">Push to eBay switches on after the one-time eBay seller sign-in.</p>
            </section>
          ) : null}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-[240px]">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 lg:px-8">
          {msg ? <p className={`text-sm font-semibold ${msg.ok ? "text-chip" : "text-btn"}`}>{msg.text}</p> : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {!isNew ? (
              <button
                type="button"
                className="btn btn-outline !py-2 text-sm"
                onClick={() =>
                  startSave(async () => {
                    if (!confirm("Archive this listing? It leaves the site but stays in Admin.")) return;
                    await deleteItem(f.id);
                    router.push("/admin/items");
                  })
                }
              >
                Archive
              </button>
            ) : null}
            <button type="button" disabled={saving || uploading} onClick={() => save()} className="btn btn-dark !py-2 text-sm">
              {uploading ? "Wait: uploading photos..." : saving ? "Saving..." : "Save"}
            </button>
            {f.status !== "live" ? (
              <button type="button" disabled={saving || uploading} onClick={() => save("live")} className="btn btn-primary !py-2 text-sm">
                Save and publish
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() =>
                  startSave(async () => {
                    const res = await setStatus([f.id], "sold");
                    if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Could not mark sold" });
                    setF((s) => ({ ...s, status: "sold" }));
                    setMsg({ ok: true, text: "Marked sold." });
                  })
                }
                className="btn btn-primary !py-2 text-sm"
              >
                Mark sold
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
