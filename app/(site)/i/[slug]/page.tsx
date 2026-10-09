import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { alsoViewed, categoryPath, getCategories, getItemBySlug, lastDrop, relatedSearches, similarTo } from "lib/catalog";
import { getSettings } from "lib/settings";
import { visitorLocation } from "lib/visitor";
import { formatMiles, milesBetween } from "lib/geo";
import { absolute, cutWords, money, shortDate, timeAgo } from "lib/site";
import { CONDITION_HELP, CONDITION_LABEL } from "lib/types";
import { Gallery } from "components/gallery";
import { ContactSeller } from "components/contact-seller";
import { RecordView } from "components/record";
import { RecentStrip, Strip } from "components/rails";
import { toCardData } from "lib/card";
import { JsonLd } from "components/json-ld";
import { ChevronIcon, PhoneIcon, PinIcon } from "components/icons";
import { PickupMap } from "components/pickup-map";

type Props = { params: Promise<{ slug: string }> };

// the layout template adds " | ChipKili" (11 chars): 48 keeps the whole title under about 60
const SEO_TITLE_MAX = 48;
/** Offer prices are re-stated on every save; Google wants an end date on the price. */
const PRICE_VALID_DAYS = 45;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getItemBySlug((await params).slug);
  if (!item) return {};
  // search results show about 60 characters: keep the price only when it fits, cut on a word boundary
  const withPrice = `${item.title} - ${money(item.price)}`;
  const title = item.seoTitle || (withPrice.length <= SEO_TITLE_MAX ? withPrice : cutWords(item.title, SEO_TITLE_MAX, false));
  const description =
    item.seoDescription ||
    cutWords(
      `${CONDITION_LABEL[item.condition]} ${item.title} for ${money(item.price)}. Local pickup in ${item.town}${item.delivery ? ", delivery available for a fee" : ""}. ${item.description}`,
      158,
    );
  const img = item.media.find((m) => m.kind === "image");
  return {
    title,
    description,
    keywords: item.keywords,
    alternates: { canonical: `/i/${item.slug}` },
    robots: item.status === "draft" || item.status === "archived" ? { index: false } : undefined,
    openGraph: {
      title: `${money(item.price)} - ${item.title}`,
      description: `${CONDITION_LABEL[item.condition]} - Pickup in ${item.town}`,
      url: `/i/${item.slug}`,
      images: img ? [{ url: img.src, width: img.width, height: img.height, alt: item.title }] : undefined,
    },
  };
}

export default async function ItemPage({ params }: Props) {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item || item.status === "draft" || item.status === "archived") notFound();
  if (item.slug !== slug) permanentRedirect(`/i/${item.slug}`);

  const [settings, cats, loc] = await Promise.all([getSettings(), getCategories(), visitorLocation()]);
  const [similar, viewed, related] = await Promise.all([similarTo(item, loc, 8), alsoViewed(item, loc, 8), relatedSearches(item)]);
  const crumbs = categoryPath(cats, item.categoryId);
  const cat = crumbs.at(-1);
  const miles = milesBetween(loc, item);
  const drop = lastDrop(item);
  const sold = item.status === "sold";
  const photo = item.media.find((m) => m.kind === "image");
  const similarHref = cat ? `/c/${cat.slug}` : "/search";
  const band = settings.deliveryBands.find((b) => miles <= b.upToMiles);
  const seoBrand = item.brand || item.details.find((d) => d.label.toLowerCase() === "brand")?.value;
  const details = [
    { label: "Condition", value: CONDITION_LABEL[item.condition] },
    { label: "Brand", value: item.brand },
    { label: "Type", value: item.type },
    { label: "Model", value: item.model },
    ...item.details,
    { label: "Size", value: item.dimensions },
    { label: "What's included", value: item.whatsIncluded },
    { label: "Tested", value: item.testedOn },
    { label: "Quantity", value: item.quantity > 1 ? `${item.quantity} available` : "1 available" },
    { label: "Item ID", value: item.code },
  ]
    .filter((d): d is { label: string; value: string } => Boolean(d.value && String(d.value).trim()))
    .filter((d, i, all) => all.findIndex((x) => x.label.toLowerCase() === d.label.toLowerCase()) === i);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 lg:px-6 lg:pb-10">
      <RecordView itemId={item.id} />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-3">
        <Link href="/" className="hover:underline">Home</Link>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronIcon className="size-3.5" />
            <Link href={`/c/${c.slug}`} className="hover:underline">{c.name}</Link>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <ChevronIcon className="size-3.5" />
          <span className="line-clamp-1 text-ink-2">{item.title}</span>
        </span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <div className="relative">
            <Gallery media={item.media} title={item.title} />
            {sold ? (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink px-5 py-2 text-lg font-bold text-white">Sold</div>
            ) : drop ? (
              <div className="pointer-events-none absolute left-4 top-4 badge badge-drop !px-3 !py-1.5 !text-sm">Price dropped {money(drop.amount)}</div>
            ) : null}
          </div>

          {sold ? (
            <p className="mt-5 rounded-2xl bg-sage p-4 text-sm">
              This one is gone. <Link href={similarHref} className="font-semibold underline">Browse {cat?.name.toLowerCase() ?? "similar items"}</Link> or{" "}
              <Link href="/find" className="font-semibold underline">tell us what you are looking for</Link> and we will find it for you.
            </p>
          ) : null}
          {sold && similar.length ? <Strip title="Similar items still available" cards={similar.map(toCardData)} /> : null}

          <section className="mt-8">
            <h2 className="heading text-2xl">Details</h2>
            <dl className="mt-3 grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="flex gap-4 border-b border-line px-4 py-3 text-sm sm:odd:border-r">
                  <dt className="w-32 shrink-0 text-ink-3">{d.label}</dt>
                  <dd className="font-medium">
                    {d.value}
                    {d.label === "Condition" ? <span className="block text-xs font-normal text-ink-3">{CONDITION_HELP[item.condition]}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {item.description ? (
            <section className="mt-8">
              <h2 className="heading text-2xl">Description</h2>
              <div className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{item.description}</div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="heading text-2xl">Pickup location</h2>
            <div className="mt-3 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_1.3fr]">
              <div className="text-sm">
                <p className="flex items-center gap-2 text-base font-bold">
                  <PinIcon className="size-5 text-leaf" /> {item.town}
                </p>
                <p className="mt-1 text-ink-2">Approximate area. The exact address is texted after you confirm a pickup time.</p>
                <p className="mt-2 font-semibold">About {formatMiles(miles)} from you</p>
                <p className="mt-3 text-ink-2">
                  {item.delivery
                    ? band
                      ? `Delivery to your area: ${money(band.fee)}.`
                      : "Delivery available for a fee. Ask for a quote."
                    : "Local pickup only."}
                </p>
              </div>
              <PickupMap lat={item.lat} lng={item.lng} label={item.town} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{item.title}</h1>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-bold">{money(item.price)}</span>
            {item.originalPrice && item.originalPrice > item.price ? (
              <>
                <span className="text-lg text-ink-3 line-through">{money(item.originalPrice)}</span>
                <span className="badge badge-drop">You save {money(item.originalPrice - item.price)}</span>
              </>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {drop ? `Price dropped ${shortDate(drop.at)} · ` : ""}Listed {timeAgo(item.createdAt)} · {CONDITION_LABEL[item.condition]} · Pickup in {item.town.replace(", NJ", "")}
          </p>
          {item.status === "pending" ? <p className="badge badge-pending mt-3">Pending pickup: someone is coming for it</p> : null}
          {item.availableToOrder ? <p className="badge badge-new mt-3">Available to order</p> : null}

          <div className="mt-5">
            <ContactSeller
              itemId={item.id}
              title={item.title}
              price={money(item.price)}
              town={item.town}
              image={photo?.thumb}
              sold={sold}
              similarHref={similarHref}
              path={`/i/${item.slug}`}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4 text-sm">
            <p className="font-bold">Sold by ChipKili</p>
            <p className="text-ink-3">
              {settings.pickupTown} · Usually replies within {settings.replyTime}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.publicPhone ? (
                <a href={`tel:${settings.publicPhone}`} className="chip !bg-cream">
                  <PhoneIcon className="size-4" /> Call about this item
                </a>
              ) : null}
              <Link href="/search" className="chip !bg-cream">
                All items from seller
              </Link>
            </div>
            <ul className="mt-4 space-y-1.5 text-ink-2">
              <li>Inspect it before you pay, at pickup.</li>
              <li>{settings.deliveryNote}</li>
              <li>We never ask for codes or payment in advance.</li>
            </ul>
          </div>

          {related.length ? (
            <div className="mt-5">
              <p className="text-sm font-bold">Related searches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {related.map((r) => (
                  <Link key={r} href={`/search?q=${encodeURIComponent(r.replace(/ under \$\d+$/, ""))}${/under \$(\d+)/.test(r) ? `&max=${r.match(/under \$(\d+)/)![1]}` : ""}`} className="chip !bg-white border border-line text-sm">
                    {r}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-5 text-xs">
            <Link href={`/contact?about=${item.code}`} className="text-ink-3 underline">
              Report this listing
            </Link>
          </p>
        </aside>
      </div>

      {!sold ? <Strip title={`Similar ${cat?.name.toLowerCase() ?? "items"}`} note="Same kind and price range" cards={similar.map(toCardData)} /> : null}
      <Strip title="People who viewed this also viewed" note="Based on browsing on ChipKili" cards={viewed.map(toCardData)} />
      <RecentStrip exclude={item.id} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: item.title,
              sku: item.code,
              description: item.description.slice(0, 5000),
              image: item.media.filter((m) => m.kind === "image").map((m) => absolute(m.src)),
              // global identifiers Google asks for: brand (field, or a "Brand" detail row) and the model number as mpn
              brand: seoBrand ? { "@type": "Brand", name: seoBrand } : undefined,
              model: item.model,
              mpn: item.model,
              category: cat?.name,
              keywords: item.keywords.join(", "),
              offers: {
                "@type": "Offer",
                url: absolute(`/i/${item.slug}`),
                price: item.price.toFixed(2),
                priceCurrency: "USD",
                itemCondition: `https://schema.org/${item.condition === "new" ? "NewCondition" : item.condition === "for-parts" ? "DamagedCondition" : item.condition === "open-box" ? "RefurbishedCondition" : "UsedCondition"}`,
                availability: `https://schema.org/${sold ? "SoldOut" : item.availableToOrder ? "PreOrder" : "InStock"}`,
                // the current price took effect on its last price change (or when the listing went up)
                validFrom: item.priceHistory.at(-1)?.at ?? item.createdAt,
                priceValidUntil: new Date(Date.parse(item.updatedAt) + PRICE_VALID_DAYS * 86400000).toISOString().slice(0, 10),
                availableDeliveryMethod: "https://schema.org/OnSitePickup",
                areaServed: "Teaneck, NJ",
                // local pickup or paid local delivery only: nothing ships, and buyers inspect before paying
                shippingDetails: {
                  "@type": "OfferShippingDetails",
                  doesNotShip: true,
                  shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
                },
                hasMerchantReturnPolicy: {
                  "@type": "MerchantReturnPolicy",
                  applicableCountry: "US",
                  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
                },
                seller: { "@id": absolute("/#seller") },
              },
              subjectOf: item.media
                .filter((m) => m.kind === "video")
                .map((m) => ({
                  "@type": "VideoObject",
                  name: m.alt ?? item.title,
                  description: item.title,
                  contentUrl: absolute(m.src),
                  thumbnailUrl: absolute(m.thumb.startsWith("/media/") ? m.thumb : (photo?.src ?? "/brand/face-192.png")),
                  uploadDate: item.createdAt,
                })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [{ name: "Home", path: "/" }, ...crumbs.map((c) => ({ name: c.name, path: `/c/${c.slug}` })), { name: item.title, path: `/i/${item.slug}` }].map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: b.name,
                item: absolute(b.path),
              })),
            },
          ],
        }}
      />
    </div>
  );
}
