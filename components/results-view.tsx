import Link from "next/link";
import { categoryPath, getCategories, searchCards } from "lib/catalog";
import { filtersToQuery, type Filters } from "lib/filters";
import { getSettings } from "lib/settings";
import { visitorLocation } from "lib/visitor";
import type { Category } from "lib/types";
import { ItemCard } from "components/item-card";
import { toCardData } from "lib/card";
import { ActiveChips, FiltersPanel, PerPage, SortSelect } from "components/filters-panel";
import { KiliState } from "components/kili-state";
import { ShareButton } from "components/share-sheet";
import { SaveSearchButton } from "components/save-search";
import { ChevronIcon } from "components/icons";
import { RecordSearch } from "components/record";

export async function ResultsView({
  filters,
  category,
  basePath,
}: {
  filters: Filters;
  category?: Category;
  basePath: string;
}) {
  const [settings, cats, loc] = await Promise.all([getSettings(), getCategories(), visitorLocation()]);
  const f = { ...filters, category: category?.id ?? filters.category };
  const result = await searchCards(f, loc);
  const crumbs = categoryPath(cats, f.category);
  const current = crumbs.at(-1);
  const subs = cats.filter((c) => c.parentId === (current?.id ?? "__none"));
  const defaults = { distance: settings.defaultRadiusMiles };
  const locked = Boolean(category);
  const pageHref = (page: number) =>
    `${basePath}${filtersToQuery(locked ? { ...f, category: undefined, page } : { ...f, page }, defaults)}`;
  const selfPath = pageHref(f.page > 1 ? f.page : 1);
  const heading = f.q ? `"${f.q}"${current ? ` in ${current.name}` : ""}` : (current?.name ?? "All listings");
  const shareTitle = f.q ? `${f.q}${current ? ` in ${current.name}` : ""} on ChipKili` : `${current?.name ?? "Everything"} on ChipKili`;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-5 lg:px-6">
      <RecordSearch query={f.q} categoryId={f.category} zero={result.total === 0} />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-3">
        <Link href="/" className="hover:underline">Home</Link>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronIcon className="size-3.5" />
            <Link href={`/c/${c.slug}`} className="hover:underline">{c.name}</Link>
          </span>
        ))}
      </nav>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl sm:text-4xl">{heading}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {result.total} {result.total === 1 ? "result" : "results"} near {loc.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton path={selfPath} title={shareTitle} subtitle={`${result.total} listings near ${settings.pickupTown}`} label="Share this search" />
          <SaveSearchButton label={heading} href={selfPath} />
        </div>
      </div>

      {current?.intro && f.page === 1 && !f.q ? <p className="mt-3 max-w-3xl text-ink-2">{current.intro}</p> : null}

      <div className="mt-5 grid gap-8 lg:grid-cols-[250px_1fr]">
        <FiltersPanel filters={f} defaultDistance={defaults.distance} brands={result.brands} subcategories={subs} zip={loc.zip} lockedCategory={locked} />
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <ActiveChips filters={f} defaultDistance={defaults.distance} lockedCategory={locked} categoryName={current?.name} />
            <div className="ml-auto">
              <SortSelect filters={f} defaultDistance={defaults.distance} lockedCategory={locked} />
            </div>
          </div>

          {result.cards.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
              {result.cards.map((c, i) => (
                <li key={c.id}>
                  <ItemCard item={toCardData(c)} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <KiliState
              pose="noResults"
              title="Nothing nearby... yet"
              text={
                <>
                  Try a wider distance, or tell Kili what you want and we text you when one comes in.
                </>
              }
              action={{ href: `/find${f.q ? `?q=${encodeURIComponent(f.q)}` : ""}`, label: "Find it for me" }}
            />
          )}

          {result.pages > 1 ? (
            <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-3">
                Page {f.page} of {result.pages} &middot; {f.per} per page
              </p>
              <div className="flex items-center gap-1">
                {f.page > 1 ? (
                  <Link href={pageHref(f.page - 1)} className="btn btn-outline !px-4 !py-1.5 text-sm" rel="prev">
                    Previous
                  </Link>
                ) : null}
                {pageNumbers(f.page, result.pages).map((p, i) =>
                  p === 0 ? (
                    <span key={`gap${i}`} className="px-1 text-ink-3">...</span>
                  ) : (
                    <Link
                      key={p}
                      href={pageHref(p)}
                      aria-current={p === f.page ? "page" : undefined}
                      className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${p === f.page ? "bg-ink text-white" : "hover:bg-cream-2"}`}
                    >
                      {p}
                    </Link>
                  ),
                )}
                {f.page < result.pages ? (
                  <Link href={pageHref(f.page + 1)} className="btn btn-outline !px-4 !py-1.5 text-sm" rel="next">
                    Next
                  </Link>
                ) : null}
              </div>
              <PerPage filters={f} defaultDistance={defaults.distance} lockedCategory={locked} />
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pageNumbers(cur: number, total: number): number[] {
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i && p - sorted[i - 1]! > 1) out.push(0);
    out.push(p);
  }
  return out;
}
