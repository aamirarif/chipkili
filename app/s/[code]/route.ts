import { NextResponse } from "next/server";
import { store } from "lib/store";
import { absolute } from "lib/site";

/** Short share links made in Admin: /s/abc123 -> the target page, with its source tag, and a click count. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/i.test(code)) return NextResponse.redirect(absolute("/"), 302);
  const link = await store().update("shares", code, (l) => ({ ...l, clicks: l.clicks + 1 }));
  if (!link) return NextResponse.redirect(absolute("/"), 302);
  const target = new URL(absolute(link.target));
  target.searchParams.set("src", link.source);
  return NextResponse.redirect(target.toString(), 302);
}
