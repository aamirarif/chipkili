import "server-only";
import { store } from "lib/store";
import { newId, sha256, safeEqual, sixDigitCode } from "lib/crypto";
import { callWithCode, sendEmail, sendSms } from "lib/notify";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAX_PER_PHONE_10MIN = 3;
export const MAX_PER_DEVICE_DAY = 10;
export const MAX_ATTEMPTS = 5;

export type SendOtpResult =
  | { ok: true; channel: "sms" | "voice"; devCode?: string }
  | { ok: false; reason: "rate_phone" | "rate_device" | "send_failed"; detail?: string };

function hashCode(phone: string, code: string): string {
  return sha256(`${phone}:${code}`);
}

export type OtpPurpose = "verify" | "admin";

/**
 * Sends a 6-digit code. "verify" = a buyer confirming their phone; "admin" = the owner signing in
 * to Admin (also emailed as a backup). Codes of one purpose can never be used for the other.
 */
export async function sendOtp(
  phone: string,
  deviceId: string,
  channel: "sms" | "voice",
  purpose: OtpPurpose = "verify",
  email?: string,
): Promise<SendOtpResult> {
  const db = store();
  const now = Date.now();
  const all = await db.list("otp");
  const recentPhone = all.filter((o) => o.phone === phone && o.purpose === purpose && now - Date.parse(o.createdAt) < 10 * 60 * 1000);
  if (recentPhone.length >= MAX_PER_PHONE_10MIN) return { ok: false, reason: "rate_phone" };
  const dayDevice = all.filter((o) => o.deviceId === deviceId && now - Date.parse(o.createdAt) < 864e5);
  if (dayDevice.length >= MAX_PER_DEVICE_DAY) return { ok: false, reason: "rate_device" };

  // a new code cancels any earlier unused code for this phone
  for (const o of recentPhone.filter((o) => !o.used)) await db.put("otp", { ...o, used: true });

  const code = sixDigitCode();
  await db.put("otp", {
    id: newId(),
    phone,
    codeHash: hashCode(phone, code),
    purpose,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    attempts: 0,
    used: false,
    createdAt: new Date(now).toISOString(),
    deviceId,
  });

  const text =
    purpose === "admin"
      ? `ChipKili Admin sign-in code: ${code}. It expires in 5 minutes. If you did not try to sign in, ignore this.`
      : `Your ChipKili code is ${code}. It expires in 5 minutes. ChipKili will never ask you for this code.`;
  const sent = channel === "voice" ? await callWithCode(phone, code) : await sendSms(phone, text);
  if (purpose === "admin" && email) {
    const mailed = await sendEmail(email, "ChipKili Admin sign-in code", `${text}

This copy is the backup in case the text is slow.`);
    if (!sent.ok && mailed.ok) return { ok: true, channel };
  }
  if (!sent.ok) return { ok: false, reason: "send_failed", detail: sent.error };
  const devCode = process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_CODE === "1" ? code : undefined;
  return { ok: true, channel, devCode };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "no_code" | "expired" | "too_many" | "wrong" };

export async function verifyOtp(phone: string, code: string, purpose: OtpPurpose = "verify"): Promise<VerifyResult> {
  const db = store();
  const open = (await db.list("otp"))
    .filter((o) => o.phone === phone && o.purpose === purpose && !o.used)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!open) return { ok: false, reason: "no_code" };
  if (Date.parse(open.expiresAt) < Date.now()) {
    await db.update("otp", open.id, (o) => ({ ...o, used: true }));
    return { ok: false, reason: "expired" };
  }
  if (open.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  // count the try first, atomically, so parallel guesses cannot share one attempt
  const counted = await db.update("otp", open.id, (o) => ({ ...o, attempts: o.attempts + 1 }));
  if (!counted || counted.used || counted.attempts > MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  if (!safeEqual(open.codeHash, hashCode(phone, code.trim()))) {
    if (counted.attempts >= MAX_ATTEMPTS) await db.update("otp", open.id, (o) => ({ ...o, used: true }));
    return { ok: false, reason: counted.attempts >= MAX_ATTEMPTS ? "too_many" : "wrong" };
  }
  // claim the code: only the request whose token lands first succeeds, so a code works exactly once
  const token = newId();
  const claimed = await db.update("otp", open.id, (o) => (o.used ? o : { ...o, used: true, claimedBy: token }));
  if (!claimed || claimed.claimedBy !== token) return { ok: false, reason: "no_code" };
  return { ok: true };
}
