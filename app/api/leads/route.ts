import { z } from "zod";
import { fail, limited, ok, sameOrigin, clientIp } from "lib/http";
import { verifiedPhone, visitorId } from "lib/session";
import { createLead } from "lib/leads";
import { saveUpload } from "lib/media";
import { store } from "lib/store";
import { LEAD_TYPES, type Media } from "lib/types";
import { newId } from "lib/crypto";

const Body = z.object({
  type: z.enum(LEAD_TYPES),
  name: z.string().trim().min(2).max(80),
  email: z.union([z.literal(""), z.email().max(120)]).optional(),
  message: z.string().trim().min(2).max(1500),
  itemId: z.string().max(40).optional(),
  source: z.string().max(60).optional(),
  fields: z.record(z.string().max(60), z.string().max(500)).default({}),
});

const MAX_FILES = 10;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  const phone = await verifiedPhone();
  if (!phone) return fail(401, "Please verify your phone first.");
  if (limited(`lead:${phone}`, 10, 3600_000) || limited(`lead-ip:${clientIp(req)}`, 30, 3600_000)) {
    return fail(429, "You have sent a lot of messages. Please wait a bit or call us.");
  }

  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Bad request");
  if (String(form.get("website") ?? "")) return ok(); // spam trap filled: pretend success, store nothing

  let fields: unknown = {};
  try {
    fields = JSON.parse(String(form.get("fields") ?? "{}"));
  } catch {
    return fail(400, "Bad form data");
  }
  const parsed = Body.safeParse({
    type: form.get("type"),
    name: form.get("name"),
    email: form.get("email") ?? "",
    message: form.get("message"),
    itemId: form.get("itemId") || undefined,
    source: form.get("source") || undefined,
    fields,
  });
  if (!parsed.success) return fail(400, "Please check the form and try again.");
  const d = parsed.data;

  if (d.itemId && !(await store().get("items", d.itemId))) return fail(400, "That item is no longer listed.");

  const media: Media[] = [];
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_FILES);
  if (files.length && d.type !== "sell") return fail(400, "Uploads are only for Sell to ChipKili.");
  try {
    for (const f of files) media.push(await saveUpload(Buffer.from(await f.arrayBuffer()), f.type, { watermark: false, alt: `${d.name} upload`, private: true }));
  } catch (err) {
    return fail(400, (err as Error).message);
  }

  const outcome = await createLead({
    type: d.type,
    name: d.name,
    phone,
    email: d.email || undefined,
    itemId: d.itemId,
    message: d.message,
    fields: d.fields,
    media,
    source: d.source,
    visitorId: await visitorId(),
  });
  await store().put("events", {
    id: newId(),
    at: new Date().toISOString(),
    visitorId: await visitorId(),
    kind: "lead",
    itemId: d.itemId,
    source: d.source,
  });
  return ok({ id: outcome.lead.id });
}
