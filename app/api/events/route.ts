import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "lib/store";
import { hasHistoryConsent, visitorId } from "lib/session";
import { newId } from "lib/crypto";
import { limited, sameOrigin, clientIp } from "lib/http";

const Body = z.object({
  kind: z.enum(["view", "search", "save", "share", "zero"]),
  itemId: z.string().max(40).optional(),
  query: z.string().max(200).optional(),
  categoryId: z.string().max(60).optional(),
  source: z.string().max(80).optional(),
});

/**
 * Anonymous activity counts. Item views and searches are always counted (no personal data,
 * used for view counts and "also viewed"). The per-visitor link is only kept with consent.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req) || limited(`ev:${clientIp(req)}`, 300, 3600_000)) return new NextResponse(null, { status: 204 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const e = parsed.data;
  const vid = (await hasHistoryConsent()) ? await visitorId() : `anon-${newId(4)}`;
  // views are counted from these events (lib/views.ts); the listing itself is never rewritten here
  await store().put("events", { id: newId(), at: new Date().toISOString(), visitorId: vid, ...e });
  return new NextResponse(null, { status: 204 });
}
