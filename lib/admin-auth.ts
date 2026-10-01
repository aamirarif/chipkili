import "server-only";
import { redirect } from "next/navigation";
import { authenticator } from "otplib";
import { checkPassword } from "lib/crypto";
import { adminUser } from "lib/session";

authenticator.options = { window: 1 };

/**
 * Admin sign-in has two steps:
 * 1. user + password (scrypt hash in ADMIN_PASSWORD_HASH)
 * 2. a 6-digit code texted to the owner's alert phone (and emailed as a backup).
 *    If ADMIN_TOTP_SECRET is set, a code from an authenticator app is accepted too.
 */
export function checkAdminPassword(user: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER || "owner";
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  const userOk = user.trim().toLowerCase() === expectedUser.toLowerCase();
  const pwOk = checkPassword(password, hash);
  return userOk && pwOk;
}

export function checkAuthenticatorCode(code: string): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET;
  return Boolean(secret && authenticator.check(code.replace(/\s/g, ""), secret));
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<string> {
  const user = await adminUser();
  if (!user) redirect("/admin/login");
  return user;
}
