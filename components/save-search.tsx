"use client";

import { useState } from "react";
import { saveSearch } from "lib/client-memory";
import { HeartIcon } from "components/icons";

export function SaveSearchButton({ label, href }: { label: string; href: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline !px-4 !py-2 text-sm"
      onClick={() => {
        saveSearch(label, href);
        setDone(true);
      }}
    >
      <HeartIcon filled={done} className={`size-[18px] ${done ? "text-btn" : ""}`} /> {done ? "Search saved" : "Save this search"}
    </button>
  );
}
