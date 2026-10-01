import { CONDITION_LABEL, type Item } from "lib/types";

/**
 * Ready-to-paste listing text for sites without an API connection (and for eBay until the
 * one-time eBay sign-in is done). Follows the listing rules: Brand / Type / Model first,
 * sold as-is, never the words "tested" or "not tested", no emojis.
 */
export type ChannelCopy = { channel: string; label: string; title: string; body: string };

function header(item: Item): string[] {
  return [
    item.brand ? `Brand: ${item.brand}` : "",
    item.type ? `Type: ${item.type}` : "",
    item.model ? `Model: ${item.model}` : "",
    item.dimensions ? `Size: ${item.dimensions}` : "",
  ].filter(Boolean);
}

const clean = (s: string) => s.replace(/[^\S\r\n]*\b(not )?tested\b[^.\n]*[.]?/gi, "").replace(/\n{3,}/g, "\n\n").trim();

export function channelCopies(item: Item, siteUrl: string, pickupTown: string): ChannelCopy[] {
  const link = `${siteUrl}/i/${item.slug}`;
  const cond = CONDITION_LABEL[item.condition];
  const desc = clean(item.description);
  const included = item.whatsIncluded ? `Included: ${item.whatsIncluded}` : "";
  const shortTitle = item.title.slice(0, 80);

  const ebay = [...header(item), "", desc, included, "", `Condition: ${cond}. Sold as-is.`].filter((l, i, a) => l || a[i - 1]).join("\n");
  const local = [
    ...header(item),
    "",
    desc,
    included,
    "",
    `Condition: ${cond}. Sold as-is. Inspect at pickup.`,
    `Pickup in ${pickupTown}.${item.delivery ? " Delivery available for a fee." : ""}`,
    `More photos: ${link}`,
  ]
    .filter((l, i, a) => l || a[i - 1])
    .join("\n");

  return [
    { channel: "ebay", label: "eBay", title: shortTitle, body: ebay },
    { channel: "facebook", label: "Facebook Marketplace", title: item.title.slice(0, 100), body: local },
    { channel: "offerup", label: "OfferUp", title: item.title.slice(0, 50), body: local },
    { channel: "craigslist", label: "Craigslist", title: item.title.slice(0, 70), body: local },
  ];
}
