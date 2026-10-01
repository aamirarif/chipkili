import Link from "next/link";
import { store } from "lib/store";
import { STATUSES } from "lib/types";
import { viewCounts } from "lib/views";
import { InventoryTable } from "./inventory-table";

export const metadata = { title: "Inventory" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; cat?: string }> }) {
  const [{ status, q, cat }, items, cats, views] = await Promise.all([searchParams, store().list("items"), store().list("categories"), viewCounts()]);
  const needle = (q ?? "").toLowerCase();
  const rows = items
    .filter((i) => (status ? i.status === status : i.status !== "archived"))
    .filter((i) => !cat || i.categoryId === cat)
    .filter((i) => !needle || `${i.title} ${i.code} ${i.brand ?? ""} ${i.model ?? ""}`.toLowerCase().includes(needle))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const count = (s: string) => items.filter((i) => i.status === s).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading text-3xl">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn btn-outline !py-2 text-sm">
            Bulk import
          </Link>
          <Link href="/admin/items/new" className="btn btn-primary !py-2 text-sm">
            + Add listing
          </Link>
        </div>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search title, CK number, brand, model" className="field !w-72 !py-2" />
        <select name="status" defaultValue={status ?? ""} className="field !w-auto !py-2">
          <option value="">All but archived</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({count(s)})
            </option>
          ))}
        </select>
        <select name="cat" defaultValue={cat ?? ""} className="field !w-auto !py-2">
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-dark !py-2 text-sm">Filter</button>
      </form>
      <InventoryTable
        rows={rows.map((i) => ({
          id: i.id,
          code: i.code,
          slug: i.slug,
          title: i.title,
          thumb: i.media.find((m) => m.kind === "image")?.thumb,
          category: cats.find((c) => c.id === i.categoryId)?.name ?? "(none)",
          price: i.price,
          condition: i.condition,
          status: i.status,
          views: views.get(i.id) ?? 0,
          postedOn: i.postedOn,
        }))}
      />
    </div>
  );
}
