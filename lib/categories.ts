/** Top-level categories in order, each followed by its subcategories. */
export function orderCategories<T extends { id: string; parentId?: string; order: number; name: string }>(cats: T[]): T[] {
  const sort = (a: T, b: T) => a.order - b.order || a.name.localeCompare(b.name);
  const top = cats.filter((c) => !c.parentId).sort(sort);
  const orphans = cats.filter((c) => c.parentId && !cats.some((p) => p.id === c.parentId));
  return [...top.flatMap((t) => [t, ...cats.filter((c) => c.parentId === t.id).sort(sort)]), ...orphans];
}
