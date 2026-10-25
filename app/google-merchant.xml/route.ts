import { feedResponse } from "lib/feed-response";

export const dynamic = "force-dynamic";

/** Google Merchant Center product feed (RSS 2.0 with g: fields). Off until Settings.feedEnabled. */
export async function GET() {
  return feedResponse("xml");
}
