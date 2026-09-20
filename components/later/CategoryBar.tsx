"use client";

import { CategoryTile } from "@/components/ui/CategoryIcon";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

export type CategoryFilter = CategoryId | "all";

export function CategoryBar({ value, onChange, counts }: { value: CategoryFilter; onChange: (v: CategoryFilter) => void; counts?: Partial<Record<CategoryFilter, number>> }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-3 py-1 sm:mx-0 sm:px-0" role="group" aria-label="categories">
      <CategoryTile category="all" label="all" selected={value === "all"} onSelect={() => onChange("all")} hint={counts?.all !== undefined ? String(counts.all) : undefined} />
      {CATEGORIES.map((c) => (
        <CategoryTile key={c.id} category={c.id} label={c.label} selected={value === c.id} onSelect={() => onChange(c.id)} hint={counts?.[c.id] !== undefined ? String(counts[c.id]) : undefined} />
      ))}
    </div>
  );
}
