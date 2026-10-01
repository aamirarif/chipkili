import "server-only";
import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** Rejects cross-site form posts (CSRF): the Origin must be this site when present. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations and sendBeacon from older browsers
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Small in-memory limiter per key (per process); the OTP limits are stored and enforced separately. */
const g = globalThis as unknown as { __chipkiliBuckets?: Map<string, { n: number; reset: number }> };
const buckets = (g.__chipkiliBuckets ??= new Map());
export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  b.n += 1;
  return b.n > max;
}

/** True when a key already hit its limit, without counting this call. */
export function isBlocked(key: string, max: number): boolean {
  const b = buckets.get(key);
  return Boolean(b && b.reset >= Date.now() && b.n >= max);
}

/** Behind Cloudflare only cf-connecting-ip can be trusted (the origin is reachable only through the tunnel). */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  if (process.env.NODE_ENV === "production") return "unknown";
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
