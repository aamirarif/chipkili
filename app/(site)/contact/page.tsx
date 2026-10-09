import type { Metadata } from "next";
import { getSettings } from "lib/settings";
import { prettyPhone } from "lib/phone";
import { ContactForm } from "components/sell-form";
import { PhoneIcon } from "components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Text, call or message ChipKili in Teaneck, NJ.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const [s, { about }] = await Promise.all([getSettings(), searchParams]);
  return (
    <div className="mx-auto grid max-w-[1100px] gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1fr_320px] lg:px-6">
      <section className="card p-5 sm:p-7">
        <h1 className="heading text-4xl">Contact</h1>
        <p className="mb-5 text-ink-2">Send a message. It goes straight to the seller&apos;s phone and email.</p>
        <ContactForm about={about?.replace(/[^A-Z0-9-]/gi, "").slice(0, 12)} />
      </section>
      <aside className="space-y-4">
        {s.publicPhone ? (
          <a href={`tel:${s.publicPhone}`} className="card flex items-center gap-3 p-5 hover:shadow-[var(--shadow-pop)]">
            <PhoneIcon className="size-6 text-leaf" />
            <span>
              <span className="block font-bold">Call or text</span>
              {prettyPhone(s.publicPhone)}
            </span>
          </a>
        ) : null}
        <div className="card p-5 text-sm text-ink-2">
          <p className="font-bold text-ink">Pickup area</p>
          <p>{s.pickupTown}. The exact address is texted after you confirm a pickup time.</p>
          <p className="mt-2">{s.deliveryNote}</p>
          <p className="mt-2">Usually replies within {s.replyTime}.</p>
        </div>
      </aside>
    </div>
  );
}
