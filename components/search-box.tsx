"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Category } from "lib/types";
import { SearchIcon } from "components/icons";

type Suggestion = { kind: "query" | "item" | "category"; label: string; href: string };

export function SearchBox({ categories, compact = false }: { categories: Category[]; compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("cat") ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [slow, setSlow] = useState(false);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    clearTimeout(timer.current);
    const ctrl = new AbortController();
    timer.current = setTimeout(async () => {
      const slowTimer = setTimeout(() => setSlow(true), 300);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setItems(((await res.json()) as { suggestions: Suggestion[] }).suggestions);
      } catch {
        /* typing again cancels */
      } finally {
        clearTimeout(slowTimer);
        setSlow(false);
      }
    }, 150);
    return () => ctrl.abort();
  }, [q]);

  function go(href?: string) {
    setOpen(false);
    if (href) return router.push(href);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cat) p.set("cat", cat);
    router.push(`/search${p.size ? `?${p}` : ""}`);
  }

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? items[active]?.href : undefined);
      }}
    >
      <div className="flex h-12 items-stretch overflow-hidden rounded-full border-[1.5px] border-ink/80 bg-white focus-within:border-leaf focus-within:ring-4 focus-within:ring-leaf/15">
        {!compact ? (
          <select
            aria-label="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="max-w-[11rem] border-r border-line bg-cream px-4 text-sm font-medium outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, items.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search fridges, washers, printers, tools..."
          aria-label="Search listings"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && items.length > 0}
          role="combobox"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-3"
          enterKeyHint="search"
        />
        <button type="submit" aria-label="Search" className="grid w-14 place-items-center bg-btn text-white hover:bg-btn-dark">
          <SearchIcon />
        </button>
      </div>
      {open && (items.length > 0 || slow) ? (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-[3.3rem] z-50 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-[var(--shadow-pop)]">
          {slow && items.length === 0 ? (
            <li className="loader-delayed flex items-center justify-between px-4 py-3 text-sm text-ink-2">
              Kili is checking every listing...
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kili/walk.webp" alt="" className="h-8 w-auto" />
            </li>
          ) : null}
          {items.map((s, i) => (
            <li key={s.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s.href)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-cream ${i === active ? "bg-cream" : ""}`}
              >
                <SearchIcon className="size-4 shrink-0 text-ink-3" />
                <span className="truncate">{s.label}</span>
                <span className="ml-auto text-xs text-ink-3">{s.kind === "category" ? "Category" : s.kind === "item" ? "Listing" : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
