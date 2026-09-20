"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { CategoryBar, type CategoryFilter } from "@/components/later/CategoryBar";
import { ItemCard } from "@/components/later/ItemCard";
import { ItemMenu } from "@/components/later/ItemMenu";
import { useAppUI } from "@/components/ui/AppUI";
import { Chip, EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { useStore } from "@/lib/store";
import type { SavedItem, Status } from "@/lib/types";

type StatusFilter = "todo" | Exclude<Status, "saved">;

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: "todo", label: "to do" },
  { id: "planned", label: "planned" },
  { id: "maybe", label: "maybe" },
  { id: "done", label: "done" },
  { id: "archived", label: "archived" },
];

const matches = (i: SavedItem, f: StatusFilter) => (f === "todo" ? i.status === "saved" || i.status === "planned" : i.status === f);

export default function LaterPage() {
  const { ready, items, error } = useStore();
  const { openAdd, setDefaultCategory } = useAppUI();
  const [cat, setCat] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("todo");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<SavedItem | null>(null);

  useEffect(() => {
    setDefaultCategory(cat === "all" ? undefined : cat);
    return () => setDefaultCategory(undefined);
  }, [cat, setDefaultCategory]);

  const counts = useMemo(() => {
    const open = items.filter((i) => matches(i, status));
    const out: Partial<Record<CategoryFilter, number>> = { all: open.length };
    for (const i of open) out[i.category] = (out[i.category] ?? 0) + 1;
    return out;
  }, [items, status]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => matches(i, status))
      .filter((i) => cat === "all" || i.category === cat)
      .filter((i) => !needle || [i.title, i.description, i.location_name, i.tags.join(" ")].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [items, cat, status, q]);

  return (
    <main>
      <ScreenHeader title="later" subtitle="things we keep meaning to do" />

      <div className="space-y-4">
        <label className="glass flex h-12 items-center gap-3 rounded-full px-5 shadow-soft">
          <span aria-hidden className="text-mute">⌕</span>
          <span className="sr-only">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search our list" type="search" className="h-full w-full bg-transparent outline-none placeholder:text-mute" />
        </label>

        <CategoryBar value={cat} onChange={setCat} counts={ready ? counts : undefined} />

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="status">
          {STATUS_CHIPS.map((s) => (
            <Chip key={s.id} active={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}

      <section aria-live="polite" className="mt-5">
        {!ready ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[380px]" />
            <Skeleton className="h-[380px]" />
          </div>
        ) : shown.length === 0 ? (
          <Empty cat={cat} status={status} searching={Boolean(q.trim())} onAdd={() => openAdd({ category: cat === "all" ? undefined : cat })} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {shown.map((i) => (
                <ItemCard key={i.id} item={i} onMenu={setMenu} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <ItemMenu item={menu} onClose={() => setMenu(null)} />
    </main>
  );
}

function Empty({ cat, status, searching, onAdd }: { cat: CategoryFilter; status: StatusFilter; searching: boolean; onAdd: () => void }) {
  if (searching) return <EmptyState emoji="🔎" title="nothing like that on our list" body="try another word, or save it now." action={<PillButton onClick={onAdd}>save something</PillButton>} />;
  if (status === "done") return <EmptyState emoji="🌱" title="nothing done yet" body="pick one thing this saturday and it starts here." />;
  if (status !== "todo") return <EmptyState emoji="🫧" title="all clear here" body="nothing in this pile." />;
  const title = cat === "all" ? "our list is empty. that's a first." : CATEGORY_BY_ID[cat].empty;
  return <EmptyState emoji={cat === "all" ? "🌤️" : CATEGORY_BY_ID[cat].emoji} title={title} action={<PillButton onClick={onAdd}>save somewhere</PillButton>} />;
}
