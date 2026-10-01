"use client";

import { useEffect } from "react";
import { rememberView } from "lib/client-memory";

function beacon(body: Record<string, unknown>) {
  const src = new URLSearchParams(window.location.search).get("src") ?? undefined;
  const payload = JSON.stringify({ ...body, source: src });
  if (!navigator.sendBeacon?.("/api/events", payload)) {
    fetch("/api/events", { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
  }
}

export function RecordView({ itemId }: { itemId: string }) {
  useEffect(() => {
    rememberView(itemId);
    beacon({ kind: "view", itemId });
  }, [itemId]);
  return null;
}

export function RecordSearch({ query, categoryId, zero }: { query: string; categoryId?: string; zero: boolean }) {
  useEffect(() => {
    if (query) beacon({ kind: zero ? "zero" : "search", query, categoryId });
  }, [query, categoryId, zero]);
  return null;
}
