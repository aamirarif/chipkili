import type { Metadata } from "next";
import { getSettings } from "lib/settings";
import { JsonLd } from "components/json-ld";
import { SELL_FAQ } from "components/sell-layout";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Buying, pickup, delivery, selling to ChipKili, texts and privacy.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const s = await getSettings();
  const groups: { title: string; items: [string, string][] }[] = [
    {
      title: "Buying",
      items: [
        ["Do you take payment on the website?", "No. There is no checkout. Message about the item, agree a time, inspect it and pay at pickup."],
        ["Is the price negotiable?", "Ask in your message. Some prices are firm, some are not."],
        ["What do the conditions mean?", "New: never used. Open box: box opened, unused or barely used. Like new: used but looks and works like new. Good: normal signs of use. Fair: visible wear, described in the listing. For parts: sold as-is for parts or repair."],
        ["Are items sold as-is?", "Yes. Everything is described as honestly as possible and you inspect it before you pay."],
      ],
    },
    {
      title: "Pickup and delivery",
      items: [
        ["Where is pickup?", `${s.pickupTown}. The exact address is texted after you confirm a pickup time.`],
        ["Do you deliver?", `${s.deliveryNote} The fee depends on distance and is shown on each item.`],
        ["Can I hold an item?", "Ask in your message. Items on hold show as pending."],
      ],
    },
    { title: "Selling to ChipKili", items: SELL_FAQ },
    {
      title: "Texts and privacy",
      items: [
        ["Why do you verify my phone?", "It stops spam and makes sure the seller can text you back. You verify once per device."],
        ["Will you text me ads?", "No. Texts are only about what you asked. Reply STOP any time."],
        ["What do you remember about my browsing?", "Only if you say yes: the items you viewed and searched, on this device, to show them to you next time. Nothing is sold or shared."],
      ],
    },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8">
      <h1 className="heading text-4xl">Questions</h1>
      {groups.map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="heading text-2xl">{g.title}</h2>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-white">
            {g.items.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q} <span className="text-xl text-ink-3 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: groups.flatMap((g) => g.items).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
    </div>
  );
}
