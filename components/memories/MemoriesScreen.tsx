"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppUI } from "@/components/ui/AppUI";
import { EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { groupByMonth, sortMemories } from "@/lib/memories";
import { removeMemory, updateMemory, useStore } from "@/lib/store";
import type { Memory } from "@/lib/types";
import { MemoryCard } from "./MemoryCard";
import { MemoryDeck } from "./MemoryDeck";

/** The memories area: swipe view by default, a month-by-month wall on request. `startId` opens the swipe view at one memory. */
export function MemoriesScreen({ startId }: { startId?: string }) {
  const { ready, memories, error, trips } = useStore();
  const { openMemory, pickMemoryPhotos, toast } = useAppUI();
  const router = useRouter();
  const [view, setView] = useState<"deck" | "grid">("deck");
  const [menu, setMenu] = useState<Memory | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [tagging, setTagging] = useState(false);
  const sorted = useMemo(() => sortMemories(memories), [memories]);

  if (!ready) {
    return (
      <main>
        <ScreenHeader title="memories" subtitle="the photo wall of us" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  if (sorted.length === 0) {
    return (
      <main>
        <ScreenHeader title="memories" subtitle="the photo wall of us" />
        <EmptyState emoji="📸" title="we haven't made enough memories yet." body="pick some photos. the date comes from the photo itself." action={<PillButton onClick={() => pickMemoryPhotos()}>add photos</PillButton>} />
      </main>
    );
  }

  const menuSheet = (
    <Sheet open={Boolean(menu)} onClose={() => { setMenu(null); setConfirm(false); setTagging(false); }} title="memory options">
      {menu && (
        tagging ? (
          <div className="space-y-2.5 pb-2">
            <h2 className="mb-3 font-display text-2xl font-bold tracking-tight">which trip?</h2>
            {trips.map((t) => <button key={t.id} className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft" onClick={() => { updateMemory(menu.id, { trip_id: t.id }); toast(`tagged to ${t.title}`, "✈️"); setTagging(false); setMenu(null); }}><span aria-hidden>✈️</span> {t.title}{menu.trip_id === t.id ? " ✓" : ""}</button>)}
            {menu.trip_id && <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft" onClick={() => { updateMemory(menu.id, { trip_id: null }); setTagging(false); setMenu(null); }}><span aria-hidden>➖</span> not from a trip</button>}
          </div>
        ) : confirm ? (
          <div className="pb-2 text-center">
            <p className="text-5xl" aria-hidden>🥺</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">remove &ldquo;{menu.title}&rdquo;?</h2>
            <p className="mt-1 text-mute">its photos go too, for both of you. this can&apos;t be undone.</p>
            <div className="mt-6 flex gap-3">
              <PillButton tone="ghost" size="lg" className="flex-1" onClick={() => setConfirm(false)}>keep it</PillButton>
              <PillButton size="lg" className="flex-1 !bg-[#c4432b] !text-white" onClick={() => { removeMemory(menu.id); toast("removed", "🗑️"); setMenu(null); setConfirm(false); if (startId) router.replace("/memories"); }}>remove</PillButton>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pb-2">
            <h2 className="mb-3 truncate font-display text-2xl font-bold tracking-tight">{menu.title}</h2>
            <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft" onClick={() => { const m = menu; setMenu(null); openMemory({ edit: m }); }}><span aria-hidden>✏️</span> edit (photos, date, place, words)</button>
            {trips.length > 0 && <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft" onClick={() => setTagging(true)}><span aria-hidden>✈️</span> {menu.trip_id ? "change trip" : "tag to a trip"}</button>}
            <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium text-[#c4432b] shadow-soft" onClick={() => setConfirm(true)}><span aria-hidden>🗑️</span> remove</button>
          </div>
        )
      )}
    </Sheet>
  );

  if (view === "grid") {
    const groups = groupByMonth(sorted);
    return (
      <main>
        <ScreenHeader
          title="memories"
          subtitle="the photo wall of us"
          right={<PillButton tone="glass" onClick={() => setView("deck")} aria-label="swipe through them">swipe ↕</PillButton>}
        />
        {error && <p className="mb-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h2 className="mb-3 px-1 font-display text-xl font-bold tracking-tight text-ink/80">{g.label}</h2>
              <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                {g.memories.map((m) => (
                  <MemoryCard key={m.id} memory={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {menuSheet}
      </main>
    );
  }

  return (
    <>
      <MemoryDeck memories={sorted} startId={startId} onGrid={() => setView("grid")} onMore={setMenu} />
      {menuSheet}
    </>
  );
}
