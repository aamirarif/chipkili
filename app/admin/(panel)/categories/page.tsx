import { store } from "lib/store";
import { orderCategories } from "lib/categories";
import { SITE_URL } from "lib/site";
import { CategoryEditor } from "./category-editor";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const [cats, items] = await Promise.all([store().list("categories"), store().list("items")]);
  const counts = Object.fromEntries(cats.map((c) => [c.id, items.filter((i) => i.categoryId === c.id && i.status !== "archived").length]));
  return (
    <div>
      <h1 className="heading text-3xl">Categories</h1>
      <p className="text-ink-2">The menu chips, filters and category pages come from here. Each category page has its own intro text for Google.</p>
      <CategoryEditor categories={orderCategories(cats)} counts={counts} siteUrl={SITE_URL} />
    </div>
  );
}
