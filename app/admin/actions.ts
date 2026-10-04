"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { store } from "lib/store";
import { adminConfigured, checkAdminPassword, checkAuthenticatorCode, requireAdmin } from "lib/admin-auth";
import { sendOtp, verifyOtp } from "lib/otp";
import { maskPhone } from "lib/phone";
import { adminPending, clearAdmin, clearAdminPending, setAdmin, setAdminPending } from "lib/session";
import { isBlocked, limited } from "lib/http";
import { logActivity } from "lib/leads";
import { publishMedia, saveUpload } from "lib/media";
import { seoMedia } from "lib/media-url";
import { getSettings, saveSettings } from "lib/settings";
import { blankItem, insertNewItem, slugify, townPoint } from "lib/items";
import { newId } from "lib/crypto";
import { pingIndexNow } from "lib/indexnow";
import { CONDITIONS, LEAD_STATUSES, STATUSES, type Item, type Media, type Settings } from "lib/types";

export type ActionResult = { ok: boolean; error?: string; id?: string; media?: Media[]; item?: Item };

/* ---------- sign in ---------- */

export type LoginState = { ok: boolean; error?: string; step?: "password" | "code"; sentTo?: string };

/** Step 1: user + password. On success a 6-digit code is texted (and emailed) to the owner. */
export async function login(_prev: LoginState | null, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { ok: false, step: "password", error: "Admin is not set up yet. Run: npm run admin:setup" };
  const user = String(form.get("user") ?? "");
  const key = `admin-login:${user.toLowerCase()}`;
  if (isBlocked(key, 8)) return { ok: false, step: "password", error: "Too many wrong tries. Wait 15 minutes." };
  if (!checkAdminPassword(user, String(form.get("password") ?? ""))) {
    limited(key, 8, 15 * 60_000); // counts failures only
    return { ok: false, step: "password", error: "User or password is not right." };
  }
  const settings = await getSettings();
  const sent = await sendOtp(settings.alertPhone, `admin:${user}`, "sms", "admin", settings.alertEmail);
  if (!sent.ok) {
    return { ok: false, step: "password", error: sent.reason === "rate_phone" ? "Too many codes. Wait 10 minutes." : "Could not send the code. Try again." };
  }
  await setAdminPending(user);
  return { ok: true, step: "code", sentTo: maskPhone(settings.alertPhone) };
}

/** Step 2: the texted code (or an authenticator-app code if one is set up). */
export async function loginCode(_prev: LoginState | null, form: FormData): Promise<LoginState> {
  const user = await adminPending();
  if (!user) return { ok: false, step: "password", error: "That took too long. Start again with your password." };
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const key = `admin-code:${user.toLowerCase()}`;
  if (isBlocked(key, 8)) return { ok: false, step: "code", error: "Too many wrong codes. Wait 15 minutes." };
  const settings = await getSettings();
  const ok = code.length === 6 && ((await verifyOtp(settings.alertPhone, code, "admin")).ok || checkAuthenticatorCode(code));
  if (!ok) {
    limited(key, 8, 15 * 60_000);
    return { ok: false, step: "code", error: "That code is not right. Check the text and try again." };
  }
  await clearAdminPending();
  await setAdmin(user);
  await logActivity(user, "signed in");
  redirect("/admin");
}

export async function logout() {
  await clearAdmin();
  redirect("/admin/login");
}

/* ---------- listings ---------- */

const ItemInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is too short").max(120),
  categoryId: z.string().min(1, "Choose a category"),
  brand: z.string().trim().max(60).optional(),
  type: z.string().trim().max(60).optional(),
  model: z.string().trim().max(80).optional(),
  condition: z.enum(CONDITIONS),
  price: z.number().min(0).max(1_000_000),
  /** null = owner cleared the "was" price; undefined = keep what is stored */
  originalPrice: z.number().min(0).max(1_000_000).nullable().optional(),
  quantity: z.number().int().min(0).max(10_000),
  status: z.enum(STATUSES),
  description: z.string().max(8000),
  details: z.array(z.object({ label: z.string().max(40), value: z.string().max(200) })).max(30),
  testedOn: z.string().max(60).optional(),
  whatsIncluded: z.string().max(300).optional(),
  dimensions: z.string().max(120).optional(),
  town: z.string().max(60),
  delivery: z.boolean(),
  media: z.array(z.object({ id: z.string(), kind: z.enum(["image", "video"]), src: z.string(), thumb: z.string(), width: z.number().optional(), height: z.number().optional(), alt: z.string().max(200).optional() })).max(40),
  keywords: z.array(z.string().trim().min(1).max(60)).max(25),
  seoTitle: z.string().max(80).optional(),
  seoDescription: z.string().max(170).optional(),
  postedOn: z.record(z.string(), z.boolean()),
  ebayItemId: z.string().max(40).optional(),
  availableToOrder: z.boolean().optional(),
});
export type ItemInputT = z.infer<typeof ItemInput>;

/** The crossed-out "was" price: set by the owner, or kept automatically when the price is cut. */
function wasPrice(input: number | null | undefined, price: number, existing: Item | null): number | undefined {
  if (input === null) return undefined;
  if (input !== undefined) return input > price ? input : undefined;
  if (existing && price < existing.price) return Math.max(existing.originalPrice ?? 0, existing.price);
  return existing?.originalPrice && existing.originalPrice > price ? existing.originalPrice : undefined;
}

export async function saveItem(input: ItemInputT): Promise<ActionResult> {
  const who = await requireAdmin();
  const parsed = ItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  const db = store();
  const build = (base: Item, existing: Item | null): Item => {
    const now = new Date().toISOString();
    const code = base.code;
    const priceChanged = !existing || existing.price !== d.price;
    return {
      ...base,
      ...d,
      id: base.id,
      code,
      slug: slugify(d.title, code),
      brand: d.brand || undefined,
      type: d.type || undefined,
      model: d.model || undefined,
      // "was" price: owner-set, or kept automatically when the price is cut
      originalPrice: wasPrice(d.originalPrice, d.price, existing),
      priceHistory: priceChanged ? [...base.priceHistory, { price: d.price, at: now }] : base.priceHistory,
      ...townPoint(d.town),
      details: d.details.filter((r) => r.label.trim() && r.value.trim()),
      // descriptive photo URLs and alt text from the title; also rebuilds src from the media id
      media: seoMedia(d.title, d.media),
      testedOn: d.testedOn || undefined,
      whatsIncluded: d.whatsIncluded || undefined,
      dimensions: d.dimensions || undefined,
      seoTitle: d.seoTitle || undefined,
      seoDescription: d.seoDescription || undefined,
      createdAt: base.status === "draft" && d.status === "live" ? now : base.createdAt,
      soldAt: d.status === "sold" ? (base.soldAt ?? now) : undefined,
      updatedAt: now,
    };
  };
  let next: Item | null;
  try {
    if (d.id) {
      // edit: applied to the latest stored version in one step
      next = await db.update("items", d.id, (cur) => build(cur, cur));
      if (!next) return { ok: false, error: "This listing no longer exists." };
    } else {
      // new: gets a fresh CK number and can never overwrite another listing
      next = await insertNewItem((code) => build(blankItem(code), null));
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const code = next.code;
  await logActivity(who, d.id ? "updated listing" : "created listing", `${code} ${d.title}`);
  if (["live", "sold"].includes(next.status)) await pingIndexNow([`/i/${next.slug}`]);
  revalidatePath("/", "layout");
  return { ok: true, id: next.id, item: next };
}

export async function uploadMedia(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const settings = await getSettings();
  const alt = String(form.get("alt") ?? "");
  const out: Media[] = [];
  try {
    for (const f of form.getAll("files")) {
      if (!(f instanceof File) || !f.size) continue;
      out.push(await saveUpload(Buffer.from(await f.arrayBuffer()), f.type, { watermark: settings.watermark, alt: alt ? `${alt} photo ${out.length + 1}` : undefined }));
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: true, media: out };
}

export async function setStatus(ids: string[], status: (typeof STATUSES)[number]): Promise<ActionResult> {
  const who = await requireAdmin();
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Bad status" };
  const db = store();
  const now = new Date().toISOString();
  for (const id of ids.slice(0, 500)) {
    await db.update("items", id, (it) => ({ ...it, status, soldAt: status === "sold" ? (it.soldAt ?? now) : it.soldAt, updatedAt: now }));
  }
  await logActivity(who, `set ${ids.length} listing(s) to ${status}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPosted(id: string, channel: string, value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[a-z]{2,20}$/.test(channel)) return { ok: false, error: "Bad channel" };
  const it = await store().update("items", id, (x) => ({ ...x, postedOn: { ...x.postedOn, [channel]: value }, updatedAt: new Date().toISOString() }));
  if (!it) return { ok: false, error: "Not found" };
  revalidatePath("/admin/channels");
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const who = await requireAdmin();
  // archive instead of hard delete, so shared links show "no longer listed" and history is kept
  const it = await store().update("items", id, (x) => ({ ...x, status: "archived", updatedAt: new Date().toISOString() }));
  if (!it) return { ok: false, error: "Not found" };
  await logActivity(who, "archived listing", `${it.code} ${it.title}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- categories ---------- */

const CatInput = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, "Use lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(60),
  parentId: z.string().optional(),
  order: z.number().int().min(0).max(999),
  intro: z.string().max(1200).optional(),
  ebayCategoryId: z.string().max(20).optional(),
  showInChips: z.boolean(),
});

export async function saveCategory(input: z.infer<typeof CatInput>): Promise<ActionResult> {
  const who = await requireAdmin();
  const p = CatInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message };
  if (p.data.parentId === p.data.id) return { ok: false, error: "A category cannot be its own parent" };
  await store().put("categories", { ...p.data, slug: p.data.id, parentId: p.data.parentId || undefined });
  await logActivity(who, "saved category", p.data.name);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const who = await requireAdmin();
  const [items, cats] = await Promise.all([store().list("items"), store().list("categories")]);
  if (items.some((i) => i.categoryId === id && i.status !== "archived")) return { ok: false, error: "Move its listings to another category first." };
  if (cats.some((c) => c.parentId === id)) return { ok: false, error: "Delete or move its subcategories first." };
  await store().remove("categories", id);
  await logActivity(who, "deleted category", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- leads ---------- */

export async function updateLead(id: string, status: (typeof LEAD_STATUSES)[number], notes: string): Promise<ActionResult> {
  const who = await requireAdmin();
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Bad status" };
  const lead = await store().update("leads", id, (l) => ({ ...l, status, notes: notes.slice(0, 2000), updatedAt: new Date().toISOString() }));
  if (!lead) return { ok: false, error: "Not found" };
  await logActivity(who, `lead ${status}`, lead.name);
  revalidatePath("/admin/leads");
  return { ok: true };
}

/** Sell request -> draft listing with the seller's photos and details already filled in. */
export async function leadToListing(id: string): Promise<ActionResult> {
  const who = await requireAdmin();
  const lead = await store().get("leads", id);
  if (!lead) return { ok: false, error: "Not found" };
  const f = lead.fields;
  const [brand, ...modelParts] = (f["Brand and model"] ?? "").split(" ");
  const cats = await store().list("categories");
  const cat = cats.find((c) => c.name === f["Category"]);
  const cond = CONDITIONS.find((c) => c.replace("-", " ") === (f["Condition"] ?? "").toLowerCase()) ?? "good";
  const title = lead.message.slice(0, 80);
  // only photos go public (re-encoded, no location data); videos stay in the private folder, never copied
  const media = await publishMedia(lead.media.filter((m) => m.kind === "image"));
  const item = await insertNewItem((code) => ({
    ...blankItem(code),
    title,
    slug: slugify(title, code),
    brand: brand || undefined,
    model: modelParts.join(" ") || undefined,
    categoryId: cat?.id ?? "",
    condition: cond,
    quantity: Number(f["Quantity"]) || 1,
    description: lead.message,
    media,
  }));
  const code = item.code;
  await store().put("leads", { ...lead, status: "done", notes: `${lead.notes ?? ""}\nTurned into listing ${code}`.trim(), updatedAt: new Date().toISOString() });
  await logActivity(who, "turned sell request into listing", code);
  redirect(`/admin/items/${code}`);
}

/* ---------- share links ---------- */

export async function createShare(label: string, target: string, source: string): Promise<ActionResult> {
  const who = await requireAdmin();
  if (!target.startsWith("/") || target.startsWith("//") || target.length > 500) return { ok: false, error: "Paste a link from this site (it starts with /)" };
  const code = newId(3);
  await store().put("shares", {
    id: code,
    code,
    label: label.trim().slice(0, 80) || target,
    target,
    source: (source.trim() || "share").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40),
    clicks: 0,
    createdAt: new Date().toISOString(),
  });
  await logActivity(who, "created share link", target);
  revalidatePath("/admin/shares");
  return { ok: true, id: code };
}

export async function deleteShare(code: string): Promise<ActionResult> {
  await requireAdmin();
  await store().remove("shares", code);
  revalidatePath("/admin/shares");
  return { ok: true };
}

/* ---------- settings ---------- */

export async function updateSettings(input: Settings): Promise<ActionResult> {
  let next: Settings = input;
  const who = await requireAdmin();
  const phone = z.string().regex(/^\+1\d{10}$/, "Phone numbers must look like +12015550123");
  const text = (max: number) => z.string().max(max);
  const s = z
    .object({
      sellerName: text(60),
      operatorLine: text(200),
      alertPhone: phone,
      alertEmail: z.email("Alert email is not valid"),
      publicPhone: phone,
      replyTime: text(40),
      pickupTown: text(60),
      pickupZip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
      pickupLat: z.number().min(-90).max(90),
      pickupLng: z.number().min(-180).max(180),
      defaultRadiusMiles: z.number().int().min(1).max(500),
      deliveryBands: z.array(z.object({ upToMiles: z.number().min(0).max(1000), fee: z.number().min(0).max(100000) })).max(10),
      deliveryNote: text(200),
      ebayStoreUrl: z.union([z.literal(""), z.url().startsWith("https://")]).optional(),
      synonyms: z.array(z.array(text(40)).max(10)).max(200),
      smsLeadToOwner: z.string().min(10).max(320),
      smsAutoReply: z.string().min(10).max(320),
      smsContactAutoReply: z.string().min(10).max(320),
      weBuyTypes: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,60}$/, "We buy page names need letters"), name: text(60), items: text(300) })).max(20),
      heroTitle: text(80),
      heroText: text(300),
      pinnedItemIds: z.array(text(20)).max(24),
      watermark: z.boolean(),
    })
    .strict()
    .safeParse(next);
  if (!s.success) return { ok: false, error: s.error.issues[0]?.message ?? "Check the settings" };
  next = { ...s.data, deliveryBands: [...s.data.deliveryBands].sort((x, y) => x.upToMiles - y.upToMiles) };
  await saveSettings(next);
  await logActivity(who, "updated settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- bulk import ---------- */

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  return body.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** CSV columns: title, category, brand, model, condition, price, original_price, quantity, description, keywords, town. Rows become drafts. */
export async function importCsv(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const who = await requireAdmin();
  const file = form.get("csv");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a CSV file" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "CSV is larger than 5 MB" };
  const rows = parseCsv(await file.text());
  const cats = await store().list("categories");
  let n = 0;
  const problems: string[] = [];
  for (const [i, r] of rows.entries()) {
    if (!r.title) {
      problems.push(`row ${i + 2}: no title`);
      continue;
    }
    const cat = cats.find((c) => c.id === r.category || c.name.toLowerCase() === (r.category ?? "").toLowerCase());
    const cond = CONDITIONS.find((c) => c === (r.condition ?? "").toLowerCase().replace(/\s+/g, "-")) ?? "good";
    const price = Number((r.price ?? "").replace(/[$,]/g, "")) || 0;
    const title = r.title.slice(0, 120);
    await insertNewItem((code) => ({
      ...blankItem(code),
      title,
      slug: slugify(title, code),
      categoryId: cat?.id ?? "",
      brand: r.brand || undefined,
      model: r.model || undefined,
      condition: cond,
      price,
      originalPrice: Number(r.original_price) || undefined,
      priceHistory: price ? [{ price, at: new Date().toISOString() }] : [],
      quantity: Number(r.quantity) || 1,
      description: r.description ?? "",
      keywords: (r.keywords ?? "").split(/[;,]/).map((k) => k.trim()).filter(Boolean).slice(0, 25),
      town: r.town || "Teaneck, NJ",
      ...townPoint(r.town || "Teaneck, NJ"),
    }));
    if (!cat) problems.push(`row ${i + 2}: category "${r.category ?? ""}" not found, left blank`);
    n++;
  }
  await logActivity(who, `imported ${n} draft listing(s)`);
  revalidatePath("/admin/items");
  return { ok: true, error: problems.length ? problems.slice(0, 20).join("; ") : undefined, id: String(n) };
}
