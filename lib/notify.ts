import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

/**
 * Outbound texts, calls and email.
 * NOTIFY_MODE=live sends for real. Anything else (the default) is dry-run:
 * nothing leaves the machine, every message is appended to data/outbox.log.
 */
const live = () => process.env.NOTIFY_MODE === "live";

export type SendResult = { ok: boolean; id?: string; dryRun?: boolean; error?: string };

async function outbox(entry: Record<string, unknown>): Promise<SendResult> {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(path.join(dir, "outbox.log"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  return { ok: true, dryRun: true };
}

/** Carrier-friendly text: plain ASCII, no long dashes, one line, at most 2 segments. */
export function smsSafe(body: string): string {
  return body
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 306);
}

async function telnyx(pathname: string, payload: Record<string, unknown>): Promise<SendResult> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) return { ok: false, error: "TELNYX_API_KEY missing" };
  const res = await fetch(`https://api.telnyx.com/v2/${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { id?: string }; errors?: { detail?: string }[] };
  // A 200 means Telnyx accepted it, not that the phone received it. Delivery is checked separately.
  if (!res.ok) return { ok: false, error: json.errors?.[0]?.detail ?? `HTTP ${res.status}` };
  return { ok: true, id: json.data?.id };
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const text = smsSafe(body);
  if (!live()) return outbox({ channel: "sms", to, text });
  return telnyx("messages", {
    from: process.env.TELNYX_FROM,
    messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
    to,
    text,
  });
}

/** Reads a code aloud (no text registration needed). Requires a Call Control app. */
export async function callWithCode(to: string, code: string): Promise<SendResult> {
  const spoken = code.split("").join(", ");
  if (!live()) return outbox({ channel: "voice", to, code });
  const connection = process.env.TELNYX_CALL_CONTROL_APP_ID;
  if (!connection) return { ok: false, error: "voice codes are not set up" };
  const said = `Your ChipKili code is ${spoken}. Again, ${spoken}.`;
  return telnyx("calls", {
    connection_id: connection,
    from: process.env.TELNYX_VOICE_FROM ?? process.env.TELNYX_FROM,
    to,
    client_state: Buffer.from(JSON.stringify({ say: said })).toString("base64"),
  });
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!live()) return outbox({ channel: "email", to, subject, text });
  const user = process.env.ZOHO_USER;
  const pass = process.env.ZOHO_PASSWORD;
  if (!user || !pass) return { ok: false, error: "ZOHO_USER / ZOHO_PASSWORD missing" };
  const transport = nodemailer.createTransport({ host: process.env.ZOHO_HOST ?? "smtp.zoho.com", port: 465, secure: true, auth: { user, pass } });
  try {
    const info = await transport.sendMail({
      from: `"ChipKili" <${process.env.MAIL_FROM ?? user}>`,
      to,
      subject,
      text,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
