import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { SellLayout } from "components/sell-layout";

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ type }, settings] = await Promise.all([params, getSettings()]);
  const t = settings.weBuyTypes.find((x) => x.slug === type);
  if (!t) return {};
  return {
    title: `Sell used ${t.name.toLowerCase()} in North Jersey - we pick up`,
    description: `ChipKili buys used ${t.name.toLowerCase()}: ${t.items}. Send a photo, get an offer, we pick up in North Jersey and NYC.`,
    alternates: { canonical: `/we-buy/${t.slug}` },
  };
}

export default async function WeBuyPage({ params }: Props) {
  const [{ type }, settings, cats] = await Promise.all([params, getSettings(), getCategories()]);
  const t = settings.weBuyTypes.find((x) => x.slug === type);
  if (!t) notFound();
  return (
    <SellLayout
      categories={cats.filter((c) => !c.parentId).map((c) => c.name)}
      phone={settings.publicPhone}
      weBuy={settings.weBuyTypes}
      preset={t.name}
      heading={`We buy used ${t.name.toLowerCase()} in North Jersey`}
      sub={`${t.items}. Send a photo, get an offer, we pick up.`}
    />
  );
}
