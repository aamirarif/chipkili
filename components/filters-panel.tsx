"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CONDITIONS, CONDITION_LABEL, type Condition } from "lib/types";
import { DISTANCES, POSTED, SORTS, filtersToQuery, type Filters, type Posted, type Sort } from "lib/filters";
import { CloseIcon, FilterIcon } from "components/icons";

type Props = {
  filters: Filters;
  defaultDistance: number;
  brands: { name: string; count: number }[];
  subcategories: { id: string; slug: string; name: string }[];
  zip?: string;
  /** on /c/[slug] pages the category comes from the path, so it is left out of the query */
  lockedCategory?: boolean;
};

export function useApply(filters: Filters, defaultDistance: number, lockedCategory?: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const apply = (patch: Partial<Filters>) => {
    const next = { ...filters, page: 1, ...patch };
    const q = filtersToQuery(lockedCategory ? { ...next, category: undefined } : next, { distance: defaultDistance });
    start(() => router.push(`${pathname}${q}`, { scroll: false }));
  };
  return { apply, pending };
}

export function FiltersPanel(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline !py-2 text-sm lg:hidden">
        <FilterIcon className="size-4" /> Filters
      </button>
      <aside className="hidden lg:block">
        <FilterFields {...props} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-paper p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="heading text-xl">Filters</p>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-full p-1 hover:bg-cream-2">
                <CloseIcon />
              </button>
            </div>
            <FilterFields {...props} />
            <button onClick={() => setOpen(false)} className="btn btn-dark mt-4 w-full">
              Show results
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FilterFields({ filters, defaultDistance, brands, subcategories, zip, lockedCategory }: Props) {
  const { apply, pending } = useApply(filters, defaultDistance, lockedCategory);
  const [min, setMin] = useState(filters.min?.toString() ?? "");
  const [max, setMax] = useState(filters.max?.toString() ?? "");
  const [allBrands, setAllBrands] = useState(false);

  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const section = "border-b border-line py-4";
  const title = "mb-2 text-sm font-bold";

  return (
    <div className={`text-sm transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <div className="flex items-center justify-between pb-2">
        <p className="font-bold">Filters</p>
        <button
          type="button"
          className="text-sm text-leaf underline underline-offset-2"
          onClick={() => {
            setMin("");
            setMax("");
            apply({ min: undefined, max: undefined, conditions: [], brands: [], distance: defaultDistance, delivery: false, video: false, drop: false, posted: "any" });
          }}
        >
          Clear all
        </button>
      </div>

      {subcategories.length ? (
        <div className={section}>
          <p className={title}>Category</p>
          <ul className="space-y-1.5">
            {subcategories.map((s) => (
              <li key={s.id}>
                <a href={`/c/${s.slug}`} className="hover:underline">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={section}>
        <p className={title}>Price</p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ min: min ? Number(min) : undefined, max: max ? Number(max) : undefined });
          }}
        >
          <input className="field !py-1.5" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
          <span>to</span>
          <input className="field !py-1.5" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-dark !px-3 !py-1.5 text-sm">Go</button>
        </form>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={filters.drop} onChange={(e) => apply({ drop: e.target.checked })} className="size-4 accent-btn" />
          Price dropped only
        </label>
      </div>

      <div className={section}>
        <p className={title}>Condition</p>
        {CONDITIONS.map((c) => (
          <label key={c} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              checked={filters.conditions.includes(c)}
              onChange={() => apply({ conditions: toggle<Condition>(filters.conditions, c) })}
              className="size-4 accent-btn"
            />
            {CONDITION_LABEL[c]}
          </label>
        ))}
      </div>

      <div className={section}>
        <p className={title}>Distance from {zip ?? "07666"}</p>
        <div className="flex flex-wrap gap-1.5">
          {DISTANCES.map((d) => (
            <button key={d} type="button" className="chip !py-1" aria-pressed={filters.distance === d} onClick={() => apply({ distance: d })}>
              {d ? `${d} mi` : "Any"}
            </button>
          ))}
        </div>
      </div>

      {brands.length ? (
        <div className={section}>
          <p className={title}>Brand</p>
          {(allBrands ? brands : brands.slice(0, 6)).map((b) => (
            <label key={b.name} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" checked={filters.brands.includes(b.name)} onChange={() => apply({ brands: toggle(filters.brands, b.name) })} className="size-4 accent-btn" />
              {b.name} <span className="text-ink-3">({b.count})</span>
            </label>
          ))}
          {brands.length > 6 ? (
            <button type="button" onClick={() => setAllBrands((v) => !v)} className="mt-1 text-leaf underline underline-offset-2">
              {allBrands ? "Show fewer" : "Show all brands"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={section}>
        <p className={title}>More</p>
        <label className="flex items-center gap-2 py-0.5">
          <input type="checkbox" checked={filters.video} onChange={(e) => apply({ video: e.target.checked })} className="size-4 accent-btn" />
          Has video
        </label>
        <label className="flex items-center gap-2 py-0.5">
          <input type="checkbox" checked={filters.delivery} onChange={(e) => apply({ delivery: e.target.checked })} className="size-4 accent-btn" />
          Delivery available
        </label>
      </div>

      <div className="py-4">
        <p className={title}>Posted</p>
        <select className="field !py-1.5" value={filters.posted} onChange={(e) => apply({ posted: e.target.value as Posted })} aria-label="Posted">
          {Object.entries(POSTED).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function SortSelect({ filters, defaultDistance, lockedCategory }: { filters: Filters; defaultDistance: number; lockedCategory?: boolean }) {
  const { apply } = useApply(filters, defaultDistance, lockedCategory);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold">Sort</span>
      <select className="field !w-auto !py-1.5" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as Sort })}>
        {Object.entries(SORTS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PerPage({ filters, defaultDistance, lockedCategory }: { filters: Filters; defaultDistance: number; lockedCategory?: boolean }) {
  const { apply } = useApply(filters, defaultDistance, lockedCategory);
  return (
    <label className="flex items-center gap-2 text-sm">
      Per page
      <select className="field !w-auto !py-1" value={filters.per} onChange={(e) => apply({ per: Number(e.target.value) })}>
        {[24, 48, 96].map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}

export function ActiveChips({ filters, defaultDistance, lockedCategory, categoryName }: { filters: Filters; defaultDistance: number; lockedCategory?: boolean; categoryName?: string }) {
  const { apply } = useApply(filters, defaultDistance, lockedCategory);
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (categoryName && !lockedCategory) chips.push({ label: categoryName, clear: { category: undefined } });
  if (filters.min !== undefined || filters.max !== undefined)
    chips.push({ label: `$${filters.min ?? 0} - ${filters.max !== undefined ? `$${filters.max}` : "any"}`, clear: { min: undefined, max: undefined } });
  if (filters.drop) chips.push({ label: "Price dropped", clear: { drop: false } });
  for (const c of filters.conditions) chips.push({ label: CONDITION_LABEL[c], clear: { conditions: filters.conditions.filter((x) => x !== c) } });
  for (const b of filters.brands) chips.push({ label: b, clear: { brands: filters.brands.filter((x) => x !== b) } });
  if (filters.distance !== defaultDistance) chips.push({ label: filters.distance ? `Within ${filters.distance} mi` : "Any distance", clear: { distance: defaultDistance } });
  if (filters.video) chips.push({ label: "Has video", clear: { video: false } });
  if (filters.delivery) chips.push({ label: "Delivery", clear: { delivery: false } });
  if (filters.posted !== "any") chips.push({ label: POSTED[filters.posted], clear: { posted: "any" } });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={() => apply(c.clear)} className="chip !bg-sage !py-1 text-sm">
          {c.label} <CloseIcon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
