"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Media } from "lib/types";
import { mediaSize } from "lib/media-url";
import { ChevronIcon, CloseIcon, PlayIcon } from "components/icons";

export function Gallery({ media, title }: { media: Media[]; title: string }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const touch = useRef<number | null>(null);
  const n = media.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, go]);

  if (!n) return <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-cream-2 text-ink-3">No photos yet</div>;
  const cur = media[i]!;

  const stage = (big: boolean) => (
    <div
      className={`relative overflow-hidden ${big ? "h-full w-full" : "aspect-[4/3] rounded-3xl bg-cream-2"}`}
      onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {cur.kind === "video" ? (
        <video key={cur.id} src={cur.src} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
      ) : (
        <button type="button" onClick={() => !big && setFull(true)} className={`block h-full w-full ${big ? "cursor-default" : "cursor-zoom-in"}`} aria-label="Open full screen">
          <Image
            key={cur.id}
            src={big || i === 0 ? cur.src : mediaSize(cur.src, "md")}
            alt={cur.alt ?? `${title} photo ${i + 1}`}
            fill
            sizes={big ? "100vw" : "(max-width: 1024px) 100vw, 60vw"}
            priority={i === 0}
            className="object-contain"
          />
        </button>
      )}
      {n > 1 ? (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow">
            <ChevronIcon className="size-5 rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow">
            <ChevronIcon className="size-5" />
          </button>
        </>
      ) : null}
      <span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-white">
        {i + 1} / {n} {cur.kind === "video" ? "video" : "photos"}
      </span>
    </div>
  );

  return (
    <div>
      {stage(false)}
      {n > 1 ? (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {media.map((m, k) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Show ${m.kind} ${k + 1}`}
              aria-current={k === i}
              className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 sm:size-20 ${k === i ? "border-kili" : "border-transparent opacity-80 hover:opacity-100"}`}
            >
              <Image src={m.thumb} alt="" fill sizes="80px" className="object-cover" />
              {m.kind === "video" ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/30 text-white">
                  <PlayIcon />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {full ? (
        <div role="dialog" aria-modal="true" aria-label="Photos" className="fixed inset-0 z-50 bg-ink">
          <button type="button" onClick={() => setFull(false)} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white">
            <CloseIcon />
          </button>
          {stage(true)}
        </div>
      ) : null}
    </div>
  );
}
