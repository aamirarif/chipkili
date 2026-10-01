import { getAllItems, getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { absolute, money } from "lib/site";
import { CONDITION_LABEL } from "lib/types";

export const dynamic = "force-dynamic";

/** A plain-text guide for AI assistants: what ChipKili is, its categories and current listings. */
export async function GET() {
  const [items, cats, s] = await Promise.all([getAllItems(), getCategories(), getSettings()]);
  const live = items.filter((i) => i.status === "live" || i.status === "pending");
  const lines = [
    "# ChipKili",
    "",
    "> ChipKili (chipkili.com) lists appliances, equipment, electronics and home goods for sale near Teaneck, NJ (Bergen County, about 5 miles from New York City). New, open box and used. No online checkout: buyers message the seller, then pick up in Teaneck or pay a fee for delivery.",
    "",
    `- Pickup: ${s.pickupTown}. ${s.deliveryNote}`,
    "- Sell to ChipKili: people and businesses can send photos of unused items and get an offer: " + absolute("/sell"),
    "- Find it for me: buyers can ask ChipKili to find a specific item: " + absolute("/find"),
    "- Price drops: " + absolute("/price-drops"),
    "",
    "## Categories",
    ...cats.map((c) => `- [${c.name}](${absolute(`/c/${c.slug}`)})`),
    "",
    "## Current listings",
    ...live
      .slice(0, 500)
      .map((i) => `- [${i.title}](${absolute(`/i/${i.slug}`)}): ${money(i.price)}, ${CONDITION_LABEL[i.condition]}, ${i.town}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
