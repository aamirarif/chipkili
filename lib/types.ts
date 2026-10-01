export const CONDITIONS = [
  "new",
  "open-box",
  "like-new",
  "good",
  "fair",
  "for-parts",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABEL: Record<Condition, string> = {
  new: "New",
  "open-box": "Open box",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  "for-parts": "For parts",
};

export const CONDITION_HELP: Record<Condition, string> = {
  new: "Brand new, never used. May be in the original box.",
  "open-box": "Box opened, item unused or barely used.",
  "like-new": "Used, but looks and works like new.",
  good: "Normal signs of use. Works as it should.",
  fair: "Visible wear or small defects, described in the listing.",
  "for-parts": "Sold as-is for parts or repair.",
};

export const STATUSES = ["draft", "live", "pending", "hold", "sold", "archived"] as const;
export type ItemStatus = (typeof STATUSES)[number];

export type Media = {
  id: string;
  kind: "image" | "video";
  /** web path of the large rendition, e.g. /media/ab12/lg.webp */
  src: string;
  /** web path of the thumbnail */
  thumb: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type PricePoint = { price: number; at: string };

export type Item = {
  id: string;
  /** human item number, CK-1042 */
  code: string;
  slug: string;
  title: string;
  categoryId: string;
  brand?: string;
  type?: string;
  model?: string;
  condition: Condition;
  price: number;
  /** "was" price shown crossed out; only when the owner sets it */
  originalPrice?: number;
  priceHistory: PricePoint[];
  quantity: number;
  status: ItemStatus;
  description: string;
  /** free-form details table rows shown on the product page; empty values never render */
  details: { label: string; value: string }[];
  testedOn?: string;
  whatsIncluded?: string;
  dimensions?: string;
  town: string;
  lat: number;
  lng: number;
  delivery: boolean;
  media: Media[];
  keywords: string[];
  seoTitle?: string;
  seoDescription?: string;
  /** channel checkboxes: ebay, facebook, offerup, craigslist ... */
  postedOn: Record<string, boolean>;
  ebayItemId?: string;
  availableToOrder?: boolean;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  views: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  order: number;
  intro?: string;
  icon?: string;
  ebayCategoryId?: string;
  showInChips: boolean;
};

export const LEAD_TYPES = ["message", "contact", "sell", "find"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
export const LEAD_STATUSES = ["new", "replied", "offer-sent", "accepted", "pickup-booked", "done", "declined", "no-show"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  phone: string;
  email?: string;
  itemId?: string;
  message: string;
  /** form-specific fields (sell: brand, model, condition...; find: budget...) */
  fields: Record<string, string>;
  media: Media[];
  source?: string;
  visitorId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryBand = { upToMiles: number; fee: number };

export type Settings = {
  sellerName: string;
  /** legal line shown in the footer and legal pages */
  operatorLine: string;
  alertPhone: string;
  alertEmail: string;
  publicPhone: string;
  replyTime: string;
  pickupTown: string;
  pickupZip: string;
  pickupLat: number;
  pickupLng: number;
  defaultRadiusMiles: number;
  deliveryBands: DeliveryBand[];
  deliveryNote: string;
  ebayStoreUrl?: string;
  synonyms: string[][];
  smsLeadToOwner: string;
  smsAutoReply: string;
  smsContactAutoReply: string;
  weBuyTypes: { slug: string; name: string; items: string }[];
  heroTitle: string;
  heroText: string;
  pinnedItemIds: string[];
  watermark: boolean;
};

export type AnalyticsEvent = {
  id: string;
  at: string;
  visitorId: string;
  kind: "view" | "search" | "save" | "share" | "lead" | "zero";
  itemId?: string;
  query?: string;
  categoryId?: string;
  source?: string;
};

export type ShareLink = {
  code: string;
  label: string;
  target: string;
  source: string;
  clicks: number;
  createdAt: string;
};

export type ActivityEntry = { id: string; at: string; who: string; action: string; target?: string };

export type OtpRecord = {
  id: string;
  phone: string;
  codeHash: string;
  purpose: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  createdAt: string;
  deviceId: string;
  /** set once, by the one request that successfully used this code */
  claimedBy?: string;
};
