import "server-only";
import { store } from "lib/store";
import type { Settings } from "lib/types";

export const DEFAULT_SETTINGS: Settings = {
  sellerName: "ChipKili",
  operatorLine: "ChipKili is run by an individual seller based in Teaneck, NJ.",
  alertPhone: "+12013444230",
  alertEmail: "aamirarif@gmail.com",
  // empty = no public number on the site; buyers use the verified Message seller / contact forms
  publicPhone: "",
  replyTime: "a few hours",
  pickupTown: "Teaneck, NJ",
  pickupZip: "07666",
  pickupLat: 40.8932,
  pickupLng: -74.0116,
  defaultRadiusMiles: 25,
  deliveryBands: [
    { upToMiles: 10, fee: 40 },
    { upToMiles: 25, fee: 75 },
  ],
  deliveryNote: "Local pickup only. Delivery available for a fee.",
  ebayStoreUrl: "https://www.ebay.com/usr/balianti786",
  synonyms: [
    ["fridge", "refrigerator"],
    ["tv", "television"],
    ["washer", "washing machine"],
    ["dryer", "clothes dryer"],
    ["microwave", "microwave oven"],
    ["printer", "receipt printer"],
    ["pos", "point of sale"],
    ["laptop", "notebook"],
    ["couch", "sofa"],
  ],
  smsLeadToOwner:
    'ChipKili lead: {name} {phone} about {item} ${price}. Msg: "{message}". Text them back directly.',
  smsAutoReply:
    "Thanks {name}, Kili got your message about the {item}! Someone will text you shortly. Need an answer now? Call or text 201-344-4230. Saved items get price-drop alerts. Reply STOP to opt out.",
  smsContactAutoReply:
    "Thanks {name}, Kili got your message! Someone will text you shortly. Need an answer now? Call or text 201-344-4230. Reply STOP to opt out.",
  weBuyTypes: [
    { slug: "restaurant-equipment", name: "Restaurant equipment", items: "Ovens, fryers, prep tables, mixers, slicers, warmers, smallwares" },
    { slug: "commercial-refrigeration", name: "Commercial refrigeration", items: "Reach-in coolers and freezers, prep coolers, display cases, ice machines" },
    { slug: "office-furniture", name: "Office furniture", items: "Desks, chairs, filing cabinets, conference tables" },
    { slug: "pos-and-electronics", name: "POS and electronics", items: "Receipt printers, cash drawers, bill counters, monitors, networking gear" },
    { slug: "tools-and-shop-equipment", name: "Tools and shop equipment", items: "Power tools, hand tools, compressors, shelving, carts" },
  ],
  heroTitle: "See It. Grab It. Go.",
  heroText:
    "Appliances, equipment and home finds near Teaneck. Everything listed on Facebook Marketplace and eBay, in one place, with the latest prices.",
  pinnedItemIds: [],
  watermark: true,
};

export async function getSettings(): Promise<Settings> {
  const saved = await store().get("settings", "main");
  if (!saved) return DEFAULT_SETTINGS;
  const { id: _id, ...rest } = saved;
  return { ...DEFAULT_SETTINGS, ...rest };
}

export async function saveSettings(next: Settings): Promise<void> {
  await store().put("settings", { ...next, id: "main" });
}

/** Fills {placeholders}; unknown keys become empty. */
export function fillTemplate(tpl: string, vars: Record<string, string | number | undefined>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
