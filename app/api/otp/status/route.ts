import { NextResponse } from "next/server";
import { verifiedPhone } from "lib/session";

export async function GET() {
  const phone = await verifiedPhone();
  return NextResponse.json({ phone }, { headers: { "Cache-Control": "no-store" } });
}
