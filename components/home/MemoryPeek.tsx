"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MemoryCover } from "@/components/memories/MemoryCard";
import { homeMemory, howLongAgo } from "@/lib/memories";
import { useStore } from "@/lib/store";

/** A brand-new memory gets pride of place; otherwise a quiet "remember this?" from further back. Nothing if there's none. */
export function MemoryPeek() {
  const { memories } = useStore();
  const pick = useMemo(() => homeMemory(memories), [memories]);
  if (!pick) return null;
  const { memory, fresh } = pick;

  return (
    <Link href={`/memories/${memory.id}`} className="flex items-center gap-4 rounded-[28px] bg-card p-3 shadow-soft active:scale-[0.99]" aria-label={`${fresh ? "new memory" : "remember this"}: ${memory.title}`}>
      <MemoryCover memory={memory} ratio="1 / 1" className="w-24 shrink-0 rounded-[20px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{fresh ? "new memory 📸" : "remember this? 📸"}</p>
        <p className="mt-1 truncate font-display text-xl font-semibold tracking-tight">{memory.title}</p>
        <p className="text-sm text-mute">{howLongAgo(memory.date)}</p>
        {memory.description && <p className="mt-1 line-clamp-2 text-[14px] text-ink/70">{memory.description}</p>}
      </div>
    </Link>
  );
}
