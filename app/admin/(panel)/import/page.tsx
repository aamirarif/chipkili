import { ImportForm } from "./import-form";

export const metadata = { title: "Bulk import" };

export default function ImportPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="heading text-3xl">Bulk import</h1>
      <p className="mt-1 text-ink-2">
        Upload a spreadsheet saved as CSV. Every row becomes a draft listing; add photos in each listing, then publish. Columns (first row):
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-4 text-sm">title, category, brand, model, condition, price, original_price, quantity, description, keywords, town</pre>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
        <li>category: the category name or its web id (for example Laptops or laptops)</li>
        <li>condition: new, open box, like new, good, fair, for parts</li>
        <li>keywords: separated by semicolons</li>
        <li>town: Teaneck, NJ (default) or another town from the list</li>
      </ul>
      <ImportForm />
    </div>
  );
}
