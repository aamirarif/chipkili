import "server-only";
import { redirect } from "next/navigation";
import { authenticator } from "otplib";
import { checkPassword } from "lib/crypto";
import { adminUser } from "lib/session";

authenticator.options = { window: 1 };

/**
 * Admin sign-in: password + a 6-digit code from an authenticator app (not SMS, so Admin
 * never depends on texting). Set up with: npm run admin:setup
 */
export function checkAdminLogin(user: string, password: string, totp: string): boolean {
  const expectedUser = process.env.ADMIN_USER || "owner";
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!hash || !secret) return false;
  const userOk = user.trim().toLowerCase() === expectedUser.toLowerCase();
  const pwOk = checkPassword(password, hash);
  const codeOk = authenticator.check(totp.replace(/\s/g, ""), secret);
  return userOk && pwOk && codeOk;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_TOTP_SECRET);
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<string> {
  const user = await adminUser();
  if (!user) redirect("/admin/login");
  return user;
}
