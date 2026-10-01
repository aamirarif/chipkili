"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; count?: "leads" | "sell" | "find" }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/items", label: "Inventory" },
  { href: "/admin/items/new", label: "Add listing" },
  { href: "/admin/import", label: "Bulk import" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/leads", label: "Leads", count: "leads" },
  { href: "/admin/leads?type=sell", label: "Sell requests", count: "sell" },
  { href: "/admin/leads?type=find", label: "Find requests", count: "find" },
  { href: "/admin/shares", label: "Share links" },
  { href: "/admin/channels", label: "Channels" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/activity", label: "Activity log" },
];

export function AdminNav({ counts }: { counts: Record<"leads" | "sell" | "find", number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-0.5 lg:pb-4">
      {LINKS.map((l) => {
        const base = l.href.split("?")[0]!;
        const active = base === "/admin" ? path === "/admin" : path === base || (base !== "/admin/items" && path.startsWith(base));
        const n = l.count ? counts[l.count] : 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium ${active ? "bg-white text-chip" : "text-white/85 hover:bg-white/10"}`}
          >
            {l.label}
            {n ? <span className="rounded-full bg-kili px-2 text-xs font-bold text-white">{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
