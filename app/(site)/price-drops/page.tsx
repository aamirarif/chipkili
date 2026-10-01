import type { Metadata } from "next";
import Image from "next/image";
import { publicCards, lastDrop } from "lib/catalog";
import { visitorLocation } from "lib/visitor";
import { money, shortDate } from "lib/site";
import { ItemCard } from "components/item-card";
import { toCardData } from "lib/card";
import { KiliState } from "components/kili-state";
import { ShareButton } from "components/share-sheet";

export const metadata: Metadata = {
  title: "Price drops near Teaneck, NJ",
  description: "Everything that just got cheaper at ChipKili. Biggest price drops first. Local pickup in Teaneck, NJ.",
  alternates: { canonical: "/price-drops" },
};

export default async function PriceDrops() {
  const cards = (await publicCards(await visitorLocation())).filter((c) => c.drop > 0).sort((a, b) => b.drop - a.drop);
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image src="/kili/deal.webp" alt="" width={140} height={80} className="h-16 w-auto" />
          <div>
            <h1 className="heading text-4xl">Price drops</h1>
            <p className="text-ink-2">{cards.length} items just got cheaper. Biggest drop first.</p>
          </div>
        </div>
        <ShareButton path="/price-drops" title="Price drops on ChipKili" subtitle="Everything that just got cheaper near Teaneck" />
      </div>
      {cards.length ? (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c, i) => {
            const d = lastDrop(c);
            return (
              <li key={c.id}>
                <ItemCard item={toCardData(c)} priority={i < 5} />
                <p className="mt-1 text-xs">
                  <span className="badge badge-drop">You save {money(c.drop)}</span>
                  {d ? <span className="ml-1 text-ink-3">dropped {shortDate(d.at)}</span> : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8">
          <KiliState pose="drop" title="No drops right now" text="Save items you like and Kili tells you when the price drops." action={{ href: "/", label: "Keep browsing" }} />
        </div>
      )}
    </div>
  );
}
