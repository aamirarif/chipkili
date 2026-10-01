import QRCode from "qrcode";
import { absolute } from "lib/site";

/** QR code (SVG) for any path on this site, tagged with a source so scans are counted. */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 500) return new Response("bad path", { status: 400 });
  const target = new URL(absolute(path));
  if (!target.searchParams.has("src")) target.searchParams.set("src", "qr");
  const svg = await QRCode.toString(target.toString(), { type: "svg", margin: 1, color: { dark: "#0B4D1E", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
