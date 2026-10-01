import type { Metadata } from "next";
import { getCategories } from "lib/catalog";
import { getSettings } from "lib/settings";
import { SellLayout } from "components/sell-layout";

export const metadata: Metadata = {
  title: "Sell your unused equipment - get an offer",
  description:
    "Restaurant, office, shop or home: send a photo of what you don't use and get an offer from ChipKili. We pick up in North Jersey and NYC.",
  alternates: { canonical: "/sell" },
};

export default async function SellPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [cats, settings, { type }] = await Promise.all([getCategories(), getSettings(), searchParams]);
  const preset = settings.weBuyTypes.find((t) => t.slug === type)?.name;
  return (
    <SellLayout
      categories={cats.filter((c) => !c.parentId).map((c) => c.name)}
      phone={settings.publicPhone}
      weBuy={settings.weBuyTypes}
      preset={preset}
    />
  );
}
