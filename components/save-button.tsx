"use client";

import { useEffect, useState } from "react";
import { savedIds, toggleSaved } from "lib/client-memory";
import { HeartIcon } from "components/icons";

export function SaveButton({ id, variant = "float" }: { id: string; variant?: "float" | "full" }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(savedIds().includes(id));
    sync();
    window.addEventListener("ck-memory", sync);
    return () => window.removeEventListener("ck-memory", sync);
  }, [id]);

  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleSaved(id);
    setOn(now);
    if (now) navigator.sendBeacon?.("/api/events", JSON.stringify({ kind: "save", itemId: id }));
  }

  if (variant === "full") {
    return (
      <button type="button" onClick={click} aria-pressed={on} className="btn btn-outline flex-1">
        <HeartIcon filled={on} className={`size-5 ${on ? "text-btn" : ""}`} />
        {on ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save item"}
      className="grid size-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105"
    >
      <HeartIcon filled={on} className={`size-[18px] ${on ? "text-btn" : "text-ink"}`} />
    </button>
  );
}
