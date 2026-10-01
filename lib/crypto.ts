import "server-only";
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ chars) is required");
    return "dev-only-session-secret-not-for-production-use";
  }
  return s;
}

export function newId(bytes = 8): string {
  return randomBytes(bytes).toString("hex");
}

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** value.expiry.signature, all url-safe */
export function sign(value: string, maxAgeSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const body = `${Buffer.from(value).toString("base64url")}.${exp}`;
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function unsign(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [b64, exp, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", secret()).update(`${b64}.${exp}`).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Buffer.from(b64, "base64url").toString();
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function checkPassword(pw: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(pw, salt, 64).toString("hex"), hash);
}
