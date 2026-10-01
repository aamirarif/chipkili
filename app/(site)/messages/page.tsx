import type { Metadata } from "next";
import Link from "next/link";
import { store } from "lib/store";
import { verifiedPhone } from "lib/session";
import { maskPhone } from "lib/phone";
import { timeAgo } from "lib/site";
import { KiliState } from "components/kili-state";

export const metadata: Metadata = { title: "Your messages", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const phone = await verifiedPhone();
  if (!phone) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-8">
        <KiliState
          pose="wink"
          title="No messages on this device yet"
          text="When you message the seller about an item, it shows up here. Replies come to your phone by text."
          action={{ href: "/", label: "Browse listings" }}
        />
      </div>
    );
  }
  const [leads, items] = await Promise.all([store().list("leads"), store().list("items")]);
  const mine = leads.filter((l) => l.phone === phone).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <h1 className="heading text-4xl">Your messages</h1>
      <p className="text-ink-2">Sent from {maskPhone(phone)}. Replies come to your phone by text.</p>
      <ul className="mt-6 space-y-3">
        {mine.map((l) => {
          const item = items.find((i) => i.id === l.itemId);
          return (
            <li key={l.id} className="card p-4">
              <p className="text-xs text-ink-3">
                {timeAgo(l.createdAt)} · {l.type === "message" ? "About an item" : l.type === "sell" ? "Sell to ChipKili" : l.type === "find" ? "Find it for me" : "Contact"}
              </p>
              {item ? (
                <Link href={`/i/${item.slug}`} className="font-semibold underline-offset-2 hover:underline">
                  {item.title}
                </Link>
              ) : null}
              <p className="mt-1 whitespace-pre-line text-ink-2">{l.message}</p>
            </li>
          );
        })}
      </ul>
      {!mine.length ? <p className="mt-6 text-ink-2">Nothing sent yet.</p> : null}
    </div>
  );
}
