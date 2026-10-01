"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { viewedItems } from "lib/client-memory";
import { money, timeAgo } from "lib/site";
import { ItemCard, type CardData } from "components/item-card";

type Mini = CardData & { categoryName?: string; drop?: number };

async function fetchCards(url: string): Promise<Mini[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return ((await res.json()) as { cards: Mini[] }).cards;
  } catch {
    return [];
  }
}

/** Right rail: "Pick up where you left off" + "Because you viewed ...". Falls back to Just listed. */
export function PersonalRail({ fallback }: { fallback: Mini[] }) {
  const [recent, setRecent] = useState<(Mini & { at: string })[] | null>(null);
  const [because, setBecause] = useState<{ label: string; cards: Mini[] } | null>(null);

  useEffect(() => {
    const viewed = viewedItems().slice(0, 12);
    if (!viewed.length) return setRecent([]);
    const ids = viewed.map((v) => v.id).join(",");
    fetchCards(`/api/cards?ids=${ids}`).then((cards) => {
      const byId = new Map(cards.map((c) => [c.id, c]));
      setRecent(viewed.flatMap((v) => (byId.has(v.id) ? [{ ...byId.get(v.id)!, at: v.at }] : [])));
    });
    fetch(`/api/recs?ids=${ids}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { label: string; cards: Mini[] } | null) => d && d.cards.length && setBecause(d))
      .catch(() => undefined);
  }, []);

  if (recent === null) return <div className="shimmer h-64 rounded-[var(--radius-card)]" />;

  if (!recent.length) {
    return (
      <section aria-labelledby="just-listed">
        <h2 id="just-listed" className="heading text-xl">Just listed</h2>
        <p className="text-xs text-ink-3">The newest finds near Teaneck</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {fallback.slice(0, 4).map((c) => (
            <ItemCard key={c.id} item={c} size="sm" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="left-off" className="card p-4">
        <h2 id="left-off" className="heading text-xl">Pick up where you left off</h2>
        <p className="text-xs text-ink-3">Items you viewed on this device</p>
        <ul className="mt-3 space-y-3">
          {recent.slice(0, 4).map((c) => {
            const photo = c.media.find((m) => m.kind === "image");
            return (
              <li key={c.id}>
                <Link href={`/i/${c.slug}`} className="flex gap-3 rounded-xl p-1 hover:bg-cream">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                    {photo ? <Image src={photo.thumb} alt="" fill sizes="64px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="line-clamp-2 leading-snug">{c.title}</p>
                    <p className="mt-0.5">
                      <b>{money(c.price)}</b>{" "}
                      <span className="text-xs text-ink-3">
                        {c.originalPrice && c.originalPrice > c.price ? "price dropped" : `viewed ${timeAgo(c.at)}`}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      {because ? (
        <section aria-labelledby="because">
          <h2 id="because" className="heading text-xl">{because.label}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {because.cards.slice(0, 4).map((c) => (
              <ItemCard key={c.id} item={c} size="sm" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Horizontal strip version for phones and product pages. */
export function RecentStrip({ title = "Your recently viewed", exclude }: { title?: string; exclude?: string }) {
  const [cards, setCards] = useState<Mini[]>([]);
  useEffect(() => {
    const ids = viewedItems()
      .map((v) => v.id)
      .filter((id) => id !== exclude)
      .slice(0, 12);
    if (ids.length) fetchCards(`/api/cards?ids=${ids.join(",")}`).then(setCards);
  }, [exclude]);
  if (!cards.length) return null;
  return <Strip title={title} note="Saved on this device" cards={cards} />;
}

export function Strip({ title, note, cards }: { title: string; note?: string; cards: Mini[] }) {
  if (!cards.length) return null;
  return (
    <section className="mt-10">
      <h2 className="heading text-2xl">{title}</h2>
      {note ? <p className="text-sm text-ink-3">{note}</p> : null}
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {cards.map((c) => (
          <div key={c.id} className="w-40 shrink-0 snap-start sm:w-48">
            <ItemCard item={c} size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
}
