import { notFound } from "next/navigation";
import { store } from "lib/store";
import { getSettings } from "lib/settings";
import { TOWNS } from "lib/geo";
import { SITE_URL } from "lib/site";
import { orderCategories } from "lib/categories";
import { viewCounts } from "lib/views";
import { ItemEditor } from "../item-editor";

export const metadata = { title: "Edit listing" };

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, cats, settings, views] = await Promise.all([store().get("items", id), store().list("categories"), getSettings(), viewCounts()]);
  if (!item) notFound();
  const ordered = orderCategories(cats);
  return <ItemEditor views={views.get(item.id) ?? 0} item={item} isNew={false} categories={ordered} towns={Object.keys(TOWNS)} siteUrl={SITE_URL} pickupTown={settings.pickupTown} />;
}
