import Image from "next/image";
import Link from "next/link";
import { getCategories, publicCards, shuffle } from "lib/catalog";
import { getSettings } from "lib/settings";
import { visitorLocation } from "lib/visitor";
import { ItemCard } from "components/item-card";
import { toCardData } from "lib/card";
import { DiscoverRail } from "components/discover-rail";
import { PersonalRail, RecentStrip } from "components/rails";
import { LocationChip, LocationForm } from "components/location-chip";
import { ChevronIcon, PinIcon } from "components/icons";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [{ page: pageRaw }, settings, cats, loc] = await Promise.all([searchParams, getSettings(), getCategories(), visitorLocation()]);
  const all = await publicCards(loc);
  const pinned = settings.pinnedItemIds.map((id) => all.find((c) => c.id === id)).filter(Boolean) as typeof all;
  const rest = all
    .filter((c) => !settings.pinnedItemIds.includes(c.id))
    .sort((a, b) => a.miles - b.miles + (Date.parse(b.createdAt) - Date.parse(a.createdAt)) / 864e5 / 3);
  const picks = [...pinned, ...rest];
  const pages = Math.max(1, Math.ceil(picks.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(pageRaw) || 1));
  const shown = picks.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const discover = shuffle(all, Math.floor(Date.now() / 36e5)).slice(0, 25).map(toCardData);
  const justListed = [...all].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4).map(toCardData);
  const top = cats.filter((c) => !c.parentId && all.some((i) => i.categoryId === c.id || cats.find((x) => x.id === i.categoryId)?.parentId === c.id));
  const firstCat = top[0];

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 lg:px-6">
      {/* hero */}
      <section className="grid items-center gap-6 lg:grid-cols-[1fr_420px]">
        <div>
          <h1 className="wordmark text-4xl leading-[1.02] text-chip sm:text-6xl">
            See It. Grab It. <span className="text-kili">Go.</span>
          </h1>
          <p className="mt-3 hidden max-w-xl text-lg text-ink-2 sm:block">{settings.heroText}</p>
          <div className="mt-3 sm:hidden">
            <LocationChip label={loc.label} zip={loc.zip} radius={settings.defaultRadiusMiles} />
          </div>
          <div className="mt-5 hidden flex-wrap gap-3 sm:flex">
            {firstCat ? (
              <Link href={`/c/${firstCat.slug}`} className="btn btn-primary">
                Shop {firstCat.name.toLowerCase()}
              </Link>
            ) : null}
            <Link href="/price-drops" className="btn btn-outline">
              See price drops
            </Link>
          </div>
        </div>
        <div className="hidden rounded-3xl bg-chip p-6 text-white sm:block">
          <p className="flex items-center gap-2 font-bold">
            <PinIcon className="size-5 text-gold" /> Showing items near {loc.label}
          </p>
          <p className="mt-1 text-sm text-white/80">Share your location or enter a ZIP to see exact distances and pickup times.</p>
          <LocationForm dark />
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr_300px]">
        {/* left rail */}
        <aside className="order-3 space-y-8 lg:order-1">
          <DiscoverRail pool={discover} />
          <nav aria-labelledby="browse" className="hidden lg:block">
            <h2 id="browse" className="border-t border-line pt-6 font-bold">Browse categories</h2>
            <ul className="mt-2">
              {top.map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="flex items-center justify-between rounded-lg px-1 py-2 text-sm hover:bg-cream-2">
                    {c.name} <ChevronIcon className="size-4 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* center grid */}
        <section aria-labelledby="picks" className="order-1 lg:order-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="picks" className="heading text-3xl">Today&apos;s picks near you</h2>
              <p className="text-sm text-ink-3">
                Showing {shown.length ? (page - 1) * PER_PAGE + 1 : 0}-{(page - 1) * PER_PAGE + shown.length} of {picks.length} items
              </p>
            </div>
            <Link href="/search?sort=newest" className="text-sm font-semibold text-leaf underline underline-offset-2">
              See everything
            </Link>
          </div>
          <div className="lg:hidden">
            <RecentStrip title="Pick up where you left off" />
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((c, i) => (
              <li key={c.id}>
                <ItemCard item={toCardData(c)} priority={i < 4} />
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link href={page === 2 ? "/" : `/?page=${page - 1}`} className="btn btn-outline !py-1.5 text-sm" rel="prev">
                  Previous
                </Link>
              ) : null}
              <span className="px-3 text-sm text-ink-3">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={`/?page=${page + 1}`} className="btn btn-dark !py-1.5 text-sm" rel="next">
                  <Image src="/kili/box.webp" alt="" width={28} height={20} className="h-5 w-auto" /> Load more
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        {/* right rail */}
        <aside className="order-2 hidden lg:order-3 lg:block">
          <PersonalRail fallback={justListed} />
        </aside>
      </div>

      {/* sell + find promos */}
      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <Link href="/sell" className="card group flex items-center gap-5 overflow-hidden !bg-chip p-6 text-white">
          <Image src="/kili/box.webp" alt="" width={140} height={100} className="h-24 w-auto transition-transform group-hover:-rotate-3" />
          <div>
            <p className="wordmark text-2xl">Got something you don&apos;t use?</p>
            <p className="mt-1 text-white/80">Send a photo, get an offer. We pick up.</p>
          </div>
        </Link>
        <Link href="/find" className="card group flex items-center gap-5 overflow-hidden p-6">
          <Image src="/kili/sunglasses.webp" alt="" width={120} height={100} className="h-24 w-auto transition-transform group-hover:rotate-3" />
          <div>
            <p className="wordmark text-2xl text-chip">Can&apos;t find it?</p>
            <p className="mt-1 text-ink-2">Tell Kili what you&apos;re hunting for. We find it and text you.</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
