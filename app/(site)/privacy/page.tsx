import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "lib/settings";
import { LegalPage } from "components/legal-page";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage
      title="Privacy"
      updated="September 30, 2026"
      sections={[
        ["Who we are", <p key="a">{s.operatorLine} This page explains what ChipKili collects on chipkili.com and why.</p>],
        [
          "What we collect",
          <ul key="b" className="list-disc space-y-1 pl-5">
            <li>When you send a message or a form: your name, mobile number, optional email, your message, and any photos or videos you upload. Photo location data is removed when you upload.</li>
            <li>A random device ID in a cookie, used to stop spam and to keep your device verified after you confirm your phone.</li>
            <li>Only if you choose &quot;Yes, remember&quot;: the items you view and search on this site, so we can show them to you next time.</li>
            <li>Your approximate location, only if you allow it or type a ZIP, to show distances. We store it in a cookie on your device.</li>
          </ul>,
        ],
        [
          "How we use it",
          <p key="c">
            To answer your message, make an offer, find an item you asked for, show you relevant listings, and keep the site safe. We do not sell or share your
            personal data, and we do not use it for advertising profiles.
          </p>,
        ],
        [
          "Text messages",
          <p key="d">
            When you send a form, you agree to receive texts about that request: a verification code, a confirmation, and replies from the seller. Message frequency
            varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Mobile numbers and text consent are never shared with third parties for
            their marketing.
          </p>,
        ],
        [
          "Service providers",
          <p key="e">
            We use providers to run the site: hosting and database, text messaging and email delivery, and maps (OpenStreetMap). They process data only to provide
            those services to us.
          </p>,
        ],
        ["How long we keep it", <p key="f">Messages and leads are kept while they are useful for answering you and for our records, then deleted. Verification codes expire in 5 minutes.</p>],
        [
          "Your choices and rights",
          <p key="g">
            You can change cookie choices any time on <Link href="/cookies" className="underline">Cookie settings</Link>. New Jersey residents and others may ask to see,
            correct or delete their personal data, or opt out of any sale or targeted advertising (we do neither). Send the request through the{" "}
            <Link href="/contact" className="underline">contact page</Link>.
          </p>,
        ],
        ["Children", <p key="h">The site is not meant for children under 13 and we do not knowingly collect their data.</p>],
        ["Changes", <p key="i">If this page changes, the date at the top changes too.</p>],
      ]}
    />
  );
}
