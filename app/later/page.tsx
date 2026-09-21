"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryBar, type CategoryFilter } from "@/components/later/CategoryBar";
import { ItemCard } from "@/components/later/ItemCard";
import { ItemMenu } from "@/components/later/ItemMenu";
import { useAppUI } from "@/components/ui/AppUI";
import { Chip, EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { inView } from "@/lib/shared";
import type { SavedItem } from "@/lib/types";
import { useShared } from "@/lib/useShared";

type View = "our" | "mine" | "theirs" | "done";

export default function LaterPage() {
  const { ready, items, error, sig, meId, partner } = useShared();
  const { openAdd, setDefaultCategory } = useAppUI();
  const [chosen, setChosen] = useState<View | null>(null);
  const [cat, setCat] = useState<CategoryFilter>("all");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<SavedItem | null>(null);

  useEffect(() => {
    setDefaultCategory(cat === "all" ? undefined : cat);
    return () => setDefaultCategory(undefined);
  }, [cat, setDefaultCategory]);

  const partnerName = partner?.name ?? "their";
  const inViewFn = useCallback((i: SavedItem, v: View) => (v === "done" ? i.status === "done" : inView(i, sig(i), v, meId)), [sig, meId]);

  const counts = useMemo(() => {
    const c: Record<View, number> = { our: 0, mine: 0, theirs: 0, done: 0 };
    for (const i of items) for (const v of ["our", "mine", "theirs", "done"] as View[]) if (inViewFn(i, v)) c[v]++;
    return c;
  }, [items, inViewFn]);

  // land on "our list" when there is one; otherwise on whichever side has something
  const view: View = chosen ?? (counts.our > 0 ? "our" : counts.mine > 0 ? "mine" : counts.theirs > 0 ? "theirs" : "our");

  const inThisView = useMemo(() => items.filter((i) => inViewFn(i, view)), 
    [items, view, inViewFn]);

  const catCounts = useMemo(() => {
    const out: Partial<Record<CategoryFilter, number>> = { all: inThisView.length };
    for (const i of inThisView) out[i.category] = (out[i.category] ?? 0) + 1;
    return out;
  }, [inThisView]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inThisView
      .filter((i) => cat === "all" || i.category === cat)
      .filter((i) => !needle || [i.title, i.description, i.location_name, i.tags.join(" ")].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => (view === "our" ? (sig(b).mutualAt ?? b.created_at).localeCompare(sig(a).mutualAt ?? a.created_at) : b.created_at.localeCompare(a.created_at)));
  }, [inThisView, cat, q, view, sig]);

  const tabs: { id: View; label: string }[] = [
    { id: "our", label: "our list" },
    { id: "mine", label: "my finds" },
    { id: "theirs", label: partner ? `${partnerName}'s finds` : "their finds" },
    { id: "done", label: "done ✓" },
  ];

  return (
    <main>
      <ScreenHeader title="later" subtitle="things we keep meaning to do" />

      <div className="space-y-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="whose finds">
          {tabs.map((t) => (
            <Chip key={t.id} active={view === t.id} onClick={() => setChosen(t.id)} className="flex items-center gap-1.5">
              {t.label}
              {ready && counts[t.id] > 0 && <span className={view === t.id ? "opacity-70" : "text-mute"}>{counts[t.id]}</span>}
            </Chip>
          ))}
        </div>

        <label className="glass flex h-12 items-center gap-3 rounded-full px-5 shadow-soft">
          <span aria-hidden className="text-mute">⌕</span>
          <span className="sr-only">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search our list" type="search" className="h-full w-full bg-transparent outline-none placeholder:text-mute" />
        </label>

        <CategoryBar value={cat} onChange={setCat} counts={ready ? catCounts : undefined} />
      </div>

      {error && <p className="mt-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}

      <section aria-live="polite" className="mt-5">
        {!ready ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[420px]" />
            <Skeleton className="h-[420px]" />
          </div>
        ) : shown.length === 0 ? (
          <Empty view={view} cat={cat} partnerName={partner?.name} searching={Boolean(q.trim())} onAdd={() => openAdd({ category: cat === "all" ? undefined : cat })} />
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

function Empty({ view, cat, partnerName, searching, onAdd }: { view: View; cat: CategoryFilter; partnerName?: string; searching: boolean; onAdd: () => void }) {
  if (searching) return <EmptyState emoji="🔎" title="nothing like that on our list" body="try another word, or save it now." action={<PillButton onClick={onAdd}>save something</PillButton>} />;
  if (cat !== "all") return <EmptyState emoji={CATEGORY_BY_ID[cat].emoji} title={CATEGORY_BY_ID[cat].empty} action={<PillButton onClick={onAdd}>save somewhere</PillButton>} />;
  switch (view) {
    case "our":
      return <EmptyState emoji="👀" title="nothing you both love yet" body={`react to ${partnerName ? `${partnerName}'s` : "their"} finds and yours will land here.`} />;
    case "mine":
      return <EmptyState emoji="🌤️" title="you haven't found anything yet" body="see something? save it and it shows up for both of you." action={<PillButton onClick={onAdd}>save something</PillButton>} />;
    case "theirs":
      return <EmptyState emoji="🫧" title={partnerName ? `${partnerName} hasn't found anything yet` : "nothing here yet"} body="when they save something, it appears here on its own." />;
    case "done":
      return <EmptyState emoji="🌱" title="nothing done yet" body="do one thing together and it starts here." />;
  }
}
