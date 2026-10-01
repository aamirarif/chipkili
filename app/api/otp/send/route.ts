import { z } from "zod";
import { fail, limited, ok, sameOrigin, clientIp } from "lib/http";
import { toE164, maskPhone } from "lib/phone";
import { sendOtp } from "lib/otp";
import { visitorId } from "lib/session";

const Body = z.object({ phone: z.string().min(7).max(30), channel: z.enum(["sms", "voice"]).default("sms") });

const REASON: Record<string, string> = {
  rate_phone: "Too many codes for this number. Wait 10 minutes and try again.",
  rate_device: "Too many codes from this device today. Try again tomorrow or call us.",
  send_failed: "We could not send the code right now. Try 'Call me instead' or call us.",
};

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  if (limited(`otp-ip:${clientIp(req)}`, 20, 3600_000)) return fail(429, "Too many requests. Try again later.");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Enter a valid US mobile number.");
  const phone = toE164(parsed.data.phone);
  if (!phone) return fail(400, "Enter a valid 10-digit US mobile number.");
  const result = await sendOtp(phone, await visitorId(), parsed.data.channel);
  if (!result.ok) return fail(result.reason === "send_failed" ? 502 : 429, REASON[result.reason] ?? "Could not send the code.");
  return ok({ masked: maskPhone(phone), channel: result.channel, devCode: result.devCode });
}
