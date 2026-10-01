"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { removeSearch, savedIds, savedSearches, type SavedSearch } from "lib/client-memory";
import { ItemCard, type CardData } from "components/item-card";
import { KiliState } from "components/kili-state";

export function SavedView() {
  const [cards, setCards] = useState<CardData[] | null>(null);
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const load = () => {
      setSearches(savedSearches());
      const ids = savedIds();
      if (!ids.length) return setCards([]);
      fetch(`/api/cards?ids=${ids.join(",")}&includeSold=1`)
        .then((r) => r.json())
        .then((d: { cards: CardData[] }) => setCards(d.cards))
        .catch(() => setCards([]));
    };
    load();
    window.addEventListener("ck-memory", load);
    return () => window.removeEventListener("ck-memory", load);
  }, []);

  return (
    <div className="mt-6 space-y-10">
      <section>
        <h2 className="heading text-2xl">Saved items</h2>
        {cards === null ? (
          <div className="shimmer mt-4 h-48 rounded-[var(--radius-card)]" />
        ) : cards.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((c) => (
              <li key={c.id}>
                <ItemCard item={c} />
                {c.status === "sold" ? <p className="mt-1 text-sm font-semibold text-btn">Sold</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <KiliState pose="wink" title="Nothing saved yet" text="Tap the heart on any item. Kili keeps it here, on this device." action={{ href: "/", label: "Start browsing" }} />
          </div>
        )}
      </section>
      <section>
        <h2 className="heading text-2xl">Saved searches</h2>
        {searches.length ? (
          <ul className="mt-4 divide-y divide-line rounded-2xl bg-white">
            {searches.map((s) => (
              <li key={s.href} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={s.href} className="font-semibold hover:underline">
                  {s.label}
                </Link>
                <button type="button" onClick={() => removeSearch(s.href)} className="text-sm text-ink-3 underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink-2">Use &quot;Save this search&quot; on any results page.</p>
        )}
      </section>
    </div>
  );
}
