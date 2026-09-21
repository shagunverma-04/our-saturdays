"use client";

import { MemoryCard } from "@/components/memories/MemoryCard";
import { useAppUI } from "@/components/ui/AppUI";
import { EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { groupByMonth } from "@/lib/memories";
import { useStore } from "@/lib/store";

export default function MemoriesPage() {
  const { ready, memories, error } = useStore();
  const { openMemory } = useAppUI();
  const groups = groupByMonth(memories);

  return (
    <main>
      <ScreenHeader title="memories" subtitle="the photo wall of us" />
      {error && <p className="mb-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}

      {!ready ? (
        <div className="columns-2 gap-3">
          <Skeleton className="mb-3 h-56" />
          <Skeleton className="mb-3 h-40" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState emoji="📸" title="we haven't made enough memories yet." body="do something worth remembering, then keep it here." action={<PillButton onClick={() => openMemory()}>keep the first one</PillButton>} />
      ) : (
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
          <PillButton tone="ghost" onClick={() => openMemory()} className="w-full">📷 add a memory</PillButton>
        </div>
      )}
    </main>
  );
}
