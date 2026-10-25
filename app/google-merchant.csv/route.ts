import { feedResponse } from "lib/feed-response";

export const dynamic = "force-dynamic";

/** The same product feed as CSV, for Microsoft, Pinterest and other importers. Off until Settings.feedEnabled. */
export async function GET() {
  return feedResponse("csv");
}
