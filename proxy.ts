import { NextResponse, type NextRequest } from "next/server";

/**
 * - admin.chipkili.com/* is served from /admin/* (and /admin is not reachable on the public host in production)
 * - /<INDEXNOW_KEY>.txt answers the IndexNow ownership check
 * - every visitor gets an anonymous device id cookie (spam limits, verified-device memory)
 */
export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const adminHost = process.env.ADMIN_HOST?.toLowerCase();
  const key = process.env.INDEXNOW_KEY;

  if (key && url.pathname === `/${key}.txt`) return new NextResponse(key, { headers: { "Content-Type": "text/plain" } });

  let res: NextResponse;
  if (adminHost && host === adminHost) {
    if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/media") && !url.pathname.startsWith("/brand") && !url.pathname.startsWith("/kili")) {
      const to = url.clone();
      to.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
      res = NextResponse.rewrite(to);
    } else res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (url.pathname.startsWith("/admin") && (adminHost || process.env.NODE_ENV === "production")) {
    // public host never serves Admin in production; if ADMIN_HOST is missing Admin is simply closed
    return new NextResponse("Not found", { status: 404 });
  } else {
    res = NextResponse.next();
  }

  if (!req.cookies.get("ck_vid")) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    res.cookies.set("ck_vid", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 365 * 86400, path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
