"use client";

/**
 * What this device remembers (saved items, recently viewed, saved searches).
 * Stored in the browser only. Recently viewed is kept only after the visitor
 * says "Yes, remember" on the cookie prompt.
 */
const SAVED = "ck_saved";
const VIEWED = "ck_viewed";
const SEARCHES = "ck_searches";
const MAX_VIEWED = 30;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("ck-memory"));
  } catch {
    /* private mode or storage full: remembering is a convenience only */
  }
}

export function hasConsent(): boolean {
  return document.cookie.split("; ").includes("ck_consent=all");
}

export const savedIds = (): string[] => read<string[]>(SAVED, []);
export function toggleSaved(id: string): boolean {
  const cur = savedIds();
  const on = !cur.includes(id);
  write(SAVED, on ? [id, ...cur] : cur.filter((x) => x !== id));
  return on;
}

export type Viewed = { id: string; at: string };
export const viewedItems = (): Viewed[] => read<Viewed[]>(VIEWED, []);
export function rememberView(id: string) {
  if (!hasConsent()) return;
  const rest = viewedItems().filter((v) => v.id !== id);
  write(VIEWED, [{ id, at: new Date().toISOString() }, ...rest].slice(0, MAX_VIEWED));
}
export function forgetAll() {
  for (const k of [VIEWED, SEARCHES]) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event("ck-memory"));
}

export type SavedSearch = { label: string; href: string; at: string };
export const savedSearches = (): SavedSearch[] => read<SavedSearch[]>(SEARCHES, []);
export function saveSearch(label: string, href: string) {
  const rest = savedSearches().filter((s) => s.href !== href);
  write(SEARCHES, [{ label, href, at: new Date().toISOString() }, ...rest].slice(0, 20));
}
export function removeSearch(href: string) {
  write(SEARCHES, savedSearches().filter((s) => s.href !== href));
}
