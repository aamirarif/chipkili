"use client";

import Link from "next/link";
import { useState } from "react";
import { LeadForm } from "components/lead-form";
import { SaveButton } from "components/save-button";
import { ShareButton } from "components/share-sheet";
import { ChatIcon, CloseIcon } from "components/icons";

type Props = {
  itemId: string;
  title: string;
  price: string;
  town: string;
  image?: string;
  sold: boolean;
  similarHref: string;
  path: string;
};

const QUICK = ["Is this still available?", "Is the price negotiable?", "Can you deliver?", "What are the dimensions?", "Any dents or scratches?"];

export function ContactSeller(p: Props) {
  const [sheet, setSheet] = useState(false);
  const form = (
    <LeadForm
      type="message"
      itemId={p.itemId}
      itemTitle={p.title}
      initialMessage="Hi, is this still available?"
      quickQuestions={QUICK}
      submitLabel="Send message"
      sentText="The seller will text you back. Keep browsing while you wait."
      afterSent={
        <ul className="mt-4 space-y-1 text-sm">
          <li>Save this item to get price-drop alerts</li>
          <li>
            <Link href={p.similarHref} className="underline">
              See similar items nearby
            </Link>
          </li>
        </ul>
      }
    />
  );

  if (p.sold) {
    return (
      <div className="rounded-2xl bg-cream-2 p-5">
        <p className="font-bold">This item is sold.</p>
        <p className="mt-1 text-sm text-ink-2">Similar items still available are listed just below.</p>
        <Link href={p.similarHref} className="btn btn-dark mt-3">
          See similar items
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-2xl border border-line bg-white p-5 lg:block">
        <p className="mb-3 flex items-center gap-2 font-bold">
          <ChatIcon className="size-5 text-leaf" /> Message seller
        </p>
        {form}
      </div>
      <div className="mt-4 flex gap-2 lg:mt-3">
        <SaveButton id={p.itemId} variant="full" />
        <ShareButton variant="full" path={p.path} title={p.title} subtitle={`${p.price} - Pickup in ${p.town}`} image={p.image} itemId={p.itemId} />
      </div>

      {/* phone: sticky bar + bottom sheet */}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-line bg-paper/95 p-3 backdrop-blur md:bottom-0 lg:hidden">
        <button type="button" onClick={() => setSheet(true)} className="btn btn-primary flex-1">
          <ChatIcon className="size-5" /> Message seller
        </button>
        <SaveButton id={p.itemId} variant="full" />
      </div>
      {sheet ? (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-paper p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-bold">Message about this item</p>
                <p className="text-sm text-ink-2">
                  {p.title.slice(0, 50)} &middot; {p.price}
                </p>
              </div>
              <button onClick={() => setSheet(false)} aria-label="Close" className="rounded-full p-1 hover:bg-cream-2">
                <CloseIcon />
              </button>
            </div>
            {form}
          </div>
        </div>
      ) : null}
    </>
  );
}
