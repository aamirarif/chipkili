import Link from "next/link";
import { getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { Logo } from "components/logo";

export async function Footer() {
  const [cats, settings] = await Promise.all([getCategories(), getSettings()]);
  const top = cats.filter((c) => !c.parentId).slice(0, 8);
  const col = "space-y-2 text-sm text-white/75";
  return (
    <footer className="mt-16 bg-chip pb-24 text-white md:pb-0">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-6">
        <div className="lg:col-span-2">
          <div className="inline-block rounded-2xl bg-paper px-3 py-2">
            <Logo size={40} />
          </div>
          <p className="wordmark mt-4 text-2xl">
            See It. Grab It. <span className="text-gold">Go.</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-white/75">
            {settings.deliveryNote} Pickup area: {settings.pickupTown}. The exact address is texted after you confirm a time.
          </p>
        </div>
        <div>
          <p className="font-semibold">Shop</p>
          <ul className={`mt-3 ${col}`}>
            {top.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/price-drops" className="hover:text-white">
                Price drops
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Sell and find</p>
          <ul className={`mt-3 ${col}`}>
            <li>
              <Link href="/sell" className="hover:text-white">
                Sell to ChipKili
              </Link>
            </li>
            {settings.weBuyTypes.map((t) => (
              <li key={t.slug}>
                <Link href={`/we-buy/${t.slug}`} className="hover:text-white">
                  We buy {t.name.toLowerCase()}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/find" className="hover:text-white">
                Find it for me
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">ChipKili</p>
          <ul className={`mt-3 ${col}`}>
            <li><Link href="/about" className="hover:text-white">About and pickup</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            {settings.ebayStoreUrl ? (
              <li>
                <a href={settings.ebayStoreUrl} rel="noopener" className="hover:text-white">
                  eBay store
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs text-white/70 lg:px-6">
          <span>&copy; {new Date().getFullYear()} ChipKili.com</span>
          <span>{settings.operatorLine}</span>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/cookies" className="hover:text-white">Cookie settings</Link>
        </div>
      </div>
    </footer>
  );
}
