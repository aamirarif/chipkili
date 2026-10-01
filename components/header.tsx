import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getCategories, publicCards } from "lib/catalog";
import { LOCATION_COOKIE, resolveLocation } from "lib/geo";
import { getSettings } from "lib/settings";
import { Logo } from "components/logo";
import { SearchBox } from "components/search-box";
import { LocationChip } from "components/location-chip";
import { ChatIcon, HeartIcon, HomeIcon, SearchIcon, TagIcon } from "components/icons";
import { MobileMenu } from "components/mobile-menu";

export async function Header({ activeCategory }: { activeCategory?: string }) {
  const [cats, jar, h, settings] = await Promise.all([getCategories(), cookies(), headers(), getSettings()]);
  const loc = resolveLocation(jar.get(LOCATION_COOKIE)?.value, h);
  const cards = await publicCards(loc);
  const topWithItems = cats.filter(
    (c) => !c.parentId && c.showInChips && cards.some((i) => i.categoryId === c.id || cats.find((x) => x.id === i.categoryId)?.parentId === c.id),
  );
  const topAll = cats.filter((c) => !c.parentId);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 lg:gap-5 lg:px-6">
          <MobileMenu categories={topAll} />
          <Logo size={42} />
          <div className="hidden flex-1 md:block">
            <SearchBox categories={topAll} />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-3">
            <div className="hidden lg:block">
              <LocationChip label={loc.label} zip={loc.zip} radius={settings.defaultRadiusMiles} />
            </div>
            <Link href="/saved" className="flex flex-col items-center rounded-xl px-2 py-1 text-xs font-medium text-ink-2 hover:bg-cream-2">
              <HeartIcon className="size-5" />
              <span className="hidden sm:block">Saved</span>
            </Link>
            <Link href="/messages" className="flex flex-col items-center rounded-xl px-2 py-1 text-xs font-medium text-ink-2 hover:bg-cream-2">
              <ChatIcon className="size-5" />
              <span className="hidden sm:block">Messages</span>
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchBox categories={topAll} compact />
        </div>
        <nav aria-label="Categories" className="border-t border-line/70">
          <div className="no-scrollbar mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 py-2.5 lg:px-6">
            <Link href="/search" className="chip" aria-current={activeCategory === "all" ? "true" : undefined}>
              All
            </Link>
            {topWithItems.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="chip" aria-current={activeCategory === c.id ? "true" : undefined}>
                {c.name}
              </Link>
            ))}
            <Link href="/price-drops" className="chip" aria-current={activeCategory === "drops" ? "true" : undefined}>
              Price drops
            </Link>
            <Link href="/sell" className="chip !bg-chip !text-white hover:!bg-leaf">
              Sell to ChipKili
            </Link>
            <Link href="/find" className="chip">
              Find it for me
            </Link>
          </div>
        </nav>
      </header>

      {/* phone bottom bar */}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {[
          { href: "/", label: "Home", Icon: HomeIcon },
          { href: "/search", label: "Search", Icon: SearchIcon },
          { href: "/saved", label: "Saved", Icon: HeartIcon },
          { href: "/sell", label: "Sell to us", Icon: TagIcon },
          { href: "/messages", label: "Messages", Icon: ChatIcon },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-2">
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
