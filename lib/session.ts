import "server-only";
import { cookies } from "next/headers";
import { newId, sign, unsign } from "lib/crypto";

export const VISITOR_COOKIE = "ck_vid";
export const CONSENT_COOKIE = "ck_consent"; // "all" | "essential"
export const PHONE_COOKIE = "ck_phone";
export const ADMIN_COOKIE = "ck_admin";
export const ADMIN_PENDING_COOKIE = "ck_admin_pending";

const YEAR = 365 * 24 * 3600;
const DEVICE_VERIFIED_SECONDS = 180 * 24 * 3600;
const ADMIN_SECONDS = 12 * 3600;

const secure = () => process.env.NODE_ENV === "production";

/** Anonymous device id. Always set (essential: rate limits, form spam checks). */
export async function visitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing && /^[a-f0-9]{16}$/.test(existing)) return existing;
  const id = newId();
  try {
    jar.set(VISITOR_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: secure(), maxAge: YEAR, path: "/" });
  } catch {
    /* cookies are read-only while rendering a page; the API routes set it */
  }
  return id;
}

export async function hasHistoryConsent(): Promise<boolean> {
  return (await cookies()).get(CONSENT_COOKIE)?.value === "all";
}

export async function verifiedPhone(): Promise<string | null> {
  return unsign((await cookies()).get(PHONE_COOKIE)?.value);
}

export async function markPhoneVerified(phone: string): Promise<void> {
  (await cookies()).set(PHONE_COOKIE, sign(phone, DEVICE_VERIFIED_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    maxAge: DEVICE_VERIFIED_SECONDS,
    path: "/",
  });
}

export async function adminUser(): Promise<string | null> {
  return unsign((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function setAdmin(user: string): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, sign(user, ADMIN_SECONDS), {
    httpOnly: true,
    sameSite: "strict",
    secure: secure(),
    maxAge: ADMIN_SECONDS,
    path: "/",
  });
}

export async function clearAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Step 1 of admin sign-in passed (password OK); the texted code must follow within 10 minutes. */
export async function setAdminPending(user: string): Promise<void> {
  (await cookies()).set(ADMIN_PENDING_COOKIE, sign(user, 600), { httpOnly: true, sameSite: "strict", secure: secure(), maxAge: 600, path: "/" });
}

export async function adminPending(): Promise<string | null> {
  return unsign((await cookies()).get(ADMIN_PENDING_COOKIE)?.value);
}

export async function clearAdminPending(): Promise<void> {
  (await cookies()).delete(ADMIN_PENDING_COOKIE);
}
