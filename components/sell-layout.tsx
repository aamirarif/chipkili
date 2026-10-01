import Image from "next/image";
import Link from "next/link";
import { prettyPhone } from "lib/phone";
import { SellForm } from "components/sell-form";
import { JsonLd } from "components/json-ld";
import { PhoneIcon } from "components/icons";

export const SELL_FAQ: [string, string][] = [
  ["What do you buy?", "Kitchen and restaurant equipment, refrigeration, appliances, office furniture, POS and electronics, tools, store fixtures, surplus and overstock. If you are not sure, send a photo."],
  ["How fast do I get an offer?", "Usually within a day. We text you."],
  ["Do you pick up?", "Yes, in North Jersey and NYC. Tell us about stairs, loading docks or parking so we bring the right help."],
  ["How do I get paid?", "At pickup, once we see the item matches the photos."],
  ["Does it have to work?", "No. Tell us honestly if it works, doesn't, or you are not sure. It changes the offer, not whether we are interested."],
];

export function SellLayout({
  categories,
  phone,
  weBuy,
  preset,
  heading = "Got something collecting dust? Send a photo, get an offer.",
  sub = "Restaurants, offices, shops, warehouses and homes in North Jersey and NYC. We pick up.",
}: {
  categories: string[];
  phone: string;
  weBuy: { slug: string; name: string; items: string }[];
  preset?: string;
  heading?: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-8 lg:px-6">
      <section className="grid items-center gap-6 rounded-3xl bg-chip p-6 text-white sm:p-10 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-gold">Sell to ChipKili</p>
          <h1 className="wordmark mt-2 text-4xl leading-tight sm:text-5xl">{heading}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/85">{sub}</p>
          <a href={`tel:${phone}`} className="btn btn-gold mt-5">
            <PhoneIcon className="size-5" /> Call or text {prettyPhone(phone)}
          </a>
        </div>
        <Image src="/kili/box.webp" alt="" width={260} height={190} className="mx-auto h-44 w-auto" priority />
      </section>

      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["1", "Send photos", "A few photos, the label or data plate, and a short note."],
          ["2", "Get an offer", "Kili texts you an offer, usually within a day."],
          ["3", "We pick up and pay", "We come to you, check it matches, and pay at pickup."],
        ].map(([n, t, d]) => (
          <li key={n} className="card p-5">
            <span className="grid size-9 place-items-center rounded-full bg-kili font-bold text-white">{n}</span>
            <p className="mt-3 text-lg font-bold">{t}</p>
            <p className="text-ink-2">{d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <section className="card p-5 sm:p-7" aria-labelledby="sellform">
          <h2 id="sellform" className="heading text-3xl">Tell us what you have</h2>
          <p className="mb-5 text-ink-2">The more photos, the better the offer.</p>
          <SellForm categories={categories} preset={preset} />
        </section>
        <aside className="space-y-8">
          <section>
            <h2 className="heading text-2xl">What we buy</h2>
            <ul className="mt-3 space-y-3">
              {weBuy.map((t) => (
                <li key={t.slug}>
                  <Link href={`/we-buy/${t.slug}`} className="block rounded-2xl bg-white p-4 hover:shadow-[var(--shadow-card)]">
                    <p className="font-bold">{t.name}</p>
                    <p className="text-sm text-ink-2">{t.items}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="heading text-2xl">Questions</h2>
            <dl className="mt-3 space-y-4">
              {SELL_FAQ.map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold">{q}</dt>
                  <dd className="text-ink-2">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SELL_FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
    </div>
  );
}
