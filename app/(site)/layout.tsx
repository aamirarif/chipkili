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
          "@graph": [
            {
              // one seller, no storefront: Organization (not LocalBusiness), and the pickup address stays private
              "@type": "Organization",
              "@id": `${SITE_URL}/#seller`,
              name: "ChipKili",
              slogan: "See It. Grab It. Go.",
              url: SITE_URL,
              logo: `${SITE_URL}/brand/face-192.png`,
              telephone: s.publicPhone || undefined,
              areaServed: ["Teaneck NJ", "Bergen County NJ", "North Jersey", "New York City"],
              sameAs: s.ebayStoreUrl ? [s.ebayStoreUrl] : [],
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "ChipKili",
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}/#seller` },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />
    </>
  );
}
