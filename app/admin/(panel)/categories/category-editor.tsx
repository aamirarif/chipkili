"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Category } from "lib/types";
import { ShareButton } from "components/share-sheet";
import { deleteCategory, saveCategory } from "../../actions";

const empty: Category = { id: "", slug: "", name: "", order: 50, showInChips: true, intro: "" };

export function CategoryEditor({ categories, counts, siteUrl }: { categories: Category[]; counts: Record<string, number>; siteUrl: string }) {
  const [edit, setEdit] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    if (!edit) return;
    start(async () => {
      const res = await saveCategory({
        id: edit.id,
        name: edit.name,
        parentId: edit.parentId,
        order: Number(edit.order) || 0,
        intro: edit.intro,
        ebayCategoryId: edit.ebayCategoryId,
        showInChips: edit.showInChips,
      });
      if (!res.ok) return setErr(res.error ?? "Could not save");
      setEdit(null);
      setErr("");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Listings</th>
              <th className="p-3">Order</th>
              <th className="p-3">In menu</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className={`p-3 ${c.parentId ? "pl-8 text-ink-2" : "font-semibold"}`}>{c.name}</td>
                <td className="p-3">{counts[c.id] ?? 0}</td>
                <td className="p-3">{c.order}</td>
                <td className="p-3">{c.parentId ? "-" : c.showInChips ? "Yes" : "No"}</td>
                <td className="flex flex-wrap justify-end gap-2 p-3">
                  <ShareButton origin={siteUrl} path={`/c/${c.slug}`} title={`${c.name} on ChipKili`} subtitle="Everything in this category near Teaneck" label="Share" variant="chip" />
                  <button
                    className="chip !py-1 text-xs"
                    onClick={() => {
                      setEdit({ ...c });
                      setIsNew(false);
                      setErr("");
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
        {edit ? (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">{isNew ? "New category" : `Edit ${edit.name}`}</h2>
            <label className="block">
              <span className="label">Name</span>
              <input
                className="field"
                value={edit.name}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    name: e.target.value,
                    id: isNew ? e.target.value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : edit.id,
                  })
                }
              />
            </label>
            <p className="text-xs text-ink-3">Web address: /c/{edit.id || "..."}</p>
            <label className="block">
              <span className="label">Parent (leave empty for a top category)</span>
              <select className="field" value={edit.parentId ?? ""} onChange={(e) => setEdit({ ...edit, parentId: e.target.value || undefined })}>
                <option value="">(top category)</option>
                {categories
                  .filter((c) => !c.parentId && c.id !== edit.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Order</span>
                <input className="field" type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} />
              </label>
              <label className="block">
                <span className="label">eBay category id</span>
                <input className="field" value={edit.ebayCategoryId ?? ""} onChange={(e) => setEdit({ ...edit, ebayCategoryId: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-btn" checked={edit.showInChips} onChange={(e) => setEdit({ ...edit, showInChips: e.target.checked })} />
              Show in the menu chips (top categories with listings)
            </label>
            <label className="block">
              <span className="label">Intro text for the category page and Google</span>
              <textarea className="field min-h-28" value={edit.intro ?? ""} onChange={(e) => setEdit({ ...edit, intro: e.target.value })} />
            </label>
            {err ? <p className="text-sm font-semibold text-btn">{err}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button disabled={pending} onClick={save} className="btn btn-dark !py-2 text-sm">
                Save
              </button>
              <button onClick={() => setEdit(null)} className="btn btn-outline !py-2 text-sm">
                Cancel
              </button>
              {!isNew ? (
                <button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteCategory(edit.id);
                      if (!res.ok) return setErr(res.error ?? "Could not delete");
                      setEdit(null);
                      router.refresh();
                    })
                  }
                  className="ml-auto text-sm text-btn underline"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-ink-2">Pick a category to edit, or add a new one.</p>
            <button
              className="btn btn-primary mt-4 !py-2 text-sm"
              onClick={() => {
                setEdit({ ...empty });
                setIsNew(true);
                setErr("");
              }}
            >
              + New category
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
