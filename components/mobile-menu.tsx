"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "lib/types";
import { CloseIcon, MenuIcon } from "components/icons";

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 rounded-xl p-1.5 hover:bg-cream-2 lg:hidden">
        <MenuIcon />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={close}>
          <nav
            aria-label="Menu"
            className="h-full w-[85%] max-w-sm overflow-y-auto bg-paper p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="wordmark text-2xl">
                <span className="text-chip">Chip</span>
                <span className="text-kili">Kili</span>
              </span>
              <button onClick={close} aria-label="Close menu" className="rounded-full p-1 hover:bg-cream-2">
                <CloseIcon />
              </button>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-3">Shop</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link onClick={close} href="/search" className="block rounded-lg px-2 py-2 hover:bg-cream-2">
                  All listings
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link onClick={close} href={`/c/${c.slug}`} className="block rounded-lg px-2 py-2 hover:bg-cream-2">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link onClick={close} href="/price-drops" className="block rounded-lg px-2 py-2 hover:bg-cream-2">
                  Price drops
                </Link>
              </li>
            </ul>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-3">More</p>
            <ul className="mt-2 space-y-1">
              {[
                ["/sell", "Sell to ChipKili"],
                ["/find", "Find it for me"],
                ["/about", "About and pickup"],
                ["/faq", "FAQ"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link onClick={close} href={href!} className="block rounded-lg px-2 py-2 hover:bg-cream-2">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
