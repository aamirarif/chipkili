import type { Metadata } from "next";
import { getSettings } from "lib/settings";
import { LegalPage } from "components/legal-page";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage
      title="Terms"
      updated="September 30, 2026"
      sections={[
        ["About the site", <p key="a">{s.operatorLine} chipkili.com shows items for sale and lets you message the seller. There is no online checkout.</p>],
        [
          "Listings",
          <p key="b">
            Items are sold as-is. Descriptions, photos and prices are given in good faith and can change or be withdrawn at any time. An item is not reserved until the
            seller confirms by text. Please inspect every item at pickup before paying.
          </p>,
        ],
        ["Pickup and delivery", <p key="c">{s.deliveryNote} Delivery fees depend on distance and are confirmed by text before delivery.</p>],
        [
          "Sell to ChipKili and Find it for me",
          <p key="d">
            Offers are made by text and are valid only after the item is seen in person. By sending an item, you confirm you own it or are allowed to sell it. Find it for me
            requests are free and carry no obligation on either side.
          </p>,
        ],
        ["Your messages", <p key="e">Do not send anything unlawful, abusive or misleading. We may block numbers that misuse the site.</p>],
        ["Liability", <p key="f">To the extent the law allows, ChipKili is not liable for indirect losses from using the site. Nothing here limits rights you have by law.</p>],
        ["Contact", <p key="g">Questions about these terms: use the contact page.</p>],
      ]}
    />
  );
}
