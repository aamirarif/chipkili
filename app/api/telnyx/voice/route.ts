import { createPublicKey, verify } from "node:crypto";

/**
 * Telnyx Call Control webhook for "Call me instead" verification codes.
 * call.answered -> speak the code carried in client_state; call.speak.ended -> hang up.
 * Requests are signature-checked when TELNYX_PUBLIC_KEY (base64, from the Telnyx portal) is set.
 */
function signed(req: Request, raw: string): boolean {
  const key = process.env.TELNYX_PUBLIC_KEY;
  if (!key) return process.env.NODE_ENV !== "production";
  const sig = req.headers.get("telnyx-signature-ed25519");
  const ts = req.headers.get("telnyx-timestamp");
  if (!sig || !ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  try {
    const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(key, "base64")]);
    return verify(null, Buffer.from(`${ts}|${raw}`), createPublicKey({ key: der, format: "der", type: "spki" }), Buffer.from(sig, "base64"));
  } catch {
    return false;
  }
}

async function command(callId: string, action: string, body: Record<string, unknown>) {
  await fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(callId)}/actions/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!signed(req, raw)) return new Response("bad signature", { status: 401 });
  const evt = JSON.parse(raw) as { data?: { event_type?: string; payload?: { call_control_id?: string; client_state?: string } } };
  const type = evt.data?.event_type;
  const p = evt.data?.payload;
  if (!p?.call_control_id) return new Response("ok");
  if (type === "call.answered" && p.client_state) {
    const { say } = JSON.parse(Buffer.from(p.client_state, "base64").toString()) as { say?: string };
    if (say) await command(p.call_control_id, "speak", { payload: say, voice: "female", language: "en-US" });
  } else if (type === "call.speak.ended") {
    await command(p.call_control_id, "hangup", {});
  }
  return new Response("ok");
}
