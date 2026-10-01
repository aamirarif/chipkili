import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "lib/admin-auth";
import { SITE_URL } from "lib/site";
import { store } from "lib/store";
import { logout } from "../actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | ChipKili Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const leads = await store().list("leads");
  const counts = {
    leads: leads.filter((l) => l.status === "new" && (l.type === "message" || l.type === "contact")).length,
    sell: leads.filter((l) => l.status === "new" && l.type === "sell").length,
    find: leads.filter((l) => l.status === "new" && l.type === "find").length,
  };
  return (
    <div className="min-h-dvh bg-[#f9f6ef] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-chip text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-4">
          <Image src="/brand/mark.webp" alt="" width={36} height={36} />
          <span className="wordmark text-xl">ChipKili</span>
          <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">Admin</span>
        </div>
        <AdminNav counts={counts} />
        <div className="hidden border-t border-white/15 px-5 py-4 text-sm lg:block">
          <p className="text-white/70">Signed in as {user}</p>
          <div className="mt-2 flex gap-3">
            <a href={SITE_URL} target="_blank" className="underline">
              View site
            </a>
            <form action={logout}>
              <button className="underline">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
