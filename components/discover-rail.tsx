"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { money } from "lib/site";
import type { CardData } from "components/item-card";

/** Left rail: "Something different", random picks, fresh each visit. */
export function DiscoverRail({ pool }: { pool: CardData[] }) {
  const [offset, setOffset] = useState(0);
  const shown = pool.length ? Array.from({ length: Math.min(5, pool.length) }, (_, i) => pool[(offset + i) % pool.length]!) : [];
  if (!shown.length) return null;
  return (
    <section aria-labelledby="discover">
      <h2 id="discover" className="font-bold">Something different</h2>
      <p className="text-xs text-ink-3">Random picks, fresh each visit</p>
      <ul className="mt-3 space-y-2.5">
        {shown.map((c) => {
          const photo = c.media.find((m) => m.kind === "image");
          return (
            <li key={c.id}>
              <Link href={`/i/${c.slug}`} className="flex gap-3 rounded-xl p-1 hover:bg-cream-2">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                  {photo ? <Image src={photo.thumb} alt="" fill sizes="56px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0 text-sm">
                  <p className="line-clamp-2 leading-snug">{c.title}</p>
                  <p className="font-bold">{money(c.price)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => setOffset((o) => o + 5)} className="btn btn-outline mt-3 w-full !border-line !py-2 text-sm">
        Shuffle
      </button>
    </section>
  );
}
