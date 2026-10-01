import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "lib/settings";
import { money } from "lib/site";
import { KiliIntro } from "components/kili-intro";
import { PickupMap } from "components/pickup-map";

export const metadata: Metadata = {
  title: "About ChipKili and pickup",
  description: "ChipKili sells appliances, equipment and home finds from Teaneck, NJ. How pickup and delivery work.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-8 lg:px-6">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <KiliIntro />
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-kili">Chip &middot; KIL-ee</p>
          <h1 className="heading mt-2 text-4xl">Meet Kili, the little lizard who grabs a good deal.</h1>
          <p className="mt-4 text-lg text-ink-2">
            The chipkali is the house lizard everyone in Pakistan knows: quick, curious, always finds the good stuff. ChipKili is one seller in Teaneck,
            NJ, listing appliances, equipment, electronics and home finds, the same items you may have seen on Facebook Marketplace and eBay, all in one
            place with the latest prices.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">Browse listings</Link>
            <Link href="/sell" className="btn btn-outline">Sell to ChipKili</Link>
            <Link href="/find" className="btn btn-outline">Find it for me</Link>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="heading text-3xl">How pickup works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-2">
            <li>Message about the item. You verify your phone once with a text code.</li>
            <li>We text you back to confirm it is available and agree a time.</li>
            <li>The exact pickup address is texted to you after the time is confirmed.</li>
            <li>Inspect it in person. Pay at pickup.</li>
          </ol>
          <p className="mt-4 text-ink-2">
            Delivery is available for a fee:{" "}
            {s.deliveryBands.map((b, i) => (
              <span key={b.upToMiles}>
                {i ? ", " : ""}up to {b.upToMiles} mi {money(b.fee)}
              </span>
            ))}
            {s.deliveryBands.length ? ", farther: ask." : " ask for a quote."}
          </p>
          <p className="mt-4 rounded-2xl bg-sage p-4 text-sm">
            Safe dealing: we never ask for codes or payment in advance. If anyone messages you pretending to be ChipKili and asks for a code, it is not us.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="heading text-3xl">Pickup area</h2>
          <p className="mt-2 text-ink-2">{s.pickupTown} {s.pickupZip}, about 5 miles from New York City.</p>
          <div className="mt-4">
            <PickupMap lat={s.pickupLat} lng={s.pickupLng} label={s.pickupTown} />
          </div>
          <p className="mt-4 text-sm text-ink-2">Usually replies within {s.replyTime}.</p>
          {s.ebayStoreUrl ? (
            <a href={s.ebayStoreUrl} rel="noopener" className="btn btn-outline mt-4">
              See our eBay store and feedback
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
