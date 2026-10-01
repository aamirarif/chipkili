import { store } from "lib/store";
import { getSettings } from "lib/settings";
import { TOWNS } from "lib/geo";
import { SITE_URL } from "lib/site";
import { orderCategories } from "lib/categories";
import { blankItem } from "lib/items";
import { ItemEditor } from "../item-editor";

export const metadata = { title: "Add listing" };

export default async function NewItem() {
  const [cats, settings] = await Promise.all([store().list("categories"), getSettings()]);
  return (
    <ItemEditor
      views={0}
      item={blankItem("new")}
      isNew
      categories={orderCategories(cats)}
      towns={Object.keys(TOWNS)}
      siteUrl={SITE_URL}
      pickupTown={settings.pickupTown}
    />
  );
}
