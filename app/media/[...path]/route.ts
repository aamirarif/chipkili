import { promises as fs } from "node:fs";
import { mediaPath } from "lib/media";
import { adminUser } from "lib/session";

const TYPES: Record<string, string> = { webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

/** Serves uploaded photos and videos. File names are validated, so no path tricks. Supports video seeking (Range). */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const found = mediaPath((await params).path);
  if (!found) return new Response("Not found", { status: 404 });
  if (found.private && !(await adminUser())) return new Response("Not found", { status: 404 });
  const file = found.file;
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream";
  const cache = found.private ? "private, no-store" : "public, max-age=31536000, immutable";
  const headers = { "Content-Type": type, "Cache-Control": cache, "Accept-Ranges": "bytes" };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range && type.startsWith("video")) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : Math.min(start + 2 ** 21, stat.size - 1);
    if (start >= stat.size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    const fh = await fs.open(file);
    const buf = Buffer.alloc(end - start + 1);
    await fh.read(buf, 0, buf.length, start);
    await fh.close();
    return new Response(buf, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(buf.length) } });
  }
  return new Response(await fs.readFile(file), { headers: { ...headers, "Content-Length": String(stat.size) } });
}
