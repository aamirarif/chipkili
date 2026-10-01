import { Suspense } from "react";
import { Header } from "components/header";
import { Footer } from "components/footer";
import { CookieBanner } from "components/cookie-banner";
import { JsonLd } from "components/json-ld";
import { getSettings } from "lib/settings";
import { SITE_URL } from "lib/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Suspense fallback={<div className="h-[132px] border-b border-line bg-paper" />}>
        <Header />
      </Suspense>
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <CookieBanner />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${SITE_URL}/#seller`,
          name: "ChipKili",
          slogan: "See It. Grab It. Go.",
          url: SITE_URL,
          logo: `${SITE_URL}/brand/face-192.png`,
          telephone: s.publicPhone,
          areaServed: ["Teaneck NJ", "Bergen County NJ", "North Jersey", "New York City"],
          address: { "@type": "PostalAddress", addressLocality: "Teaneck", addressRegion: "NJ", postalCode: s.pickupZip, addressCountry: "US" },
          sameAs: s.ebayStoreUrl ? [s.ebayStoreUrl] : [],
        }}
      />
    </>
  );
}
