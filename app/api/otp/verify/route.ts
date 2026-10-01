import { z } from "zod";
import { fail, ok, sameOrigin } from "lib/http";
import { toE164 } from "lib/phone";
import { verifyOtp } from "lib/otp";
import { markPhoneVerified } from "lib/session";

const Body = z.object({ phone: z.string().min(7).max(30), code: z.string().regex(/^\d{6}$/) });

const REASON = {
  no_code: "No active code for this number. Send a new one.",
  expired: "That code expired. Send a new one.",
  too_many: "Too many wrong tries. Send a new code.",
  wrong: "That code is not right. Check the text and try again.",
} as const;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Enter the 6-digit code.");
  const phone = toE164(parsed.data.phone);
  if (!phone) return fail(400, "Enter a valid US mobile number.");
  const result = await verifyOtp(phone, parsed.data.code);
  if (!result.ok) return fail(400, REASON[result.reason]);
  await markPhoneVerified(phone);
  return ok();
}
