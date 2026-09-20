"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { ItemArt } from "@/components/ui/ItemArt";
import { PillButton } from "@/components/ui/bits";
import { useAppUI } from "@/components/ui/AppUI";

export function RecentlySaved() {
  const { items } = useStore();
  const { openAdd } = useAppUI();
  const recent = items
    .filter((i) => i.status !== "done" && i.status !== "archived")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  return (
    <section aria-labelledby="recent-h">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="recent-h" className="font-display text-2xl font-bold tracking-tight">recently saved</h2>
        <Link href="/later" className="py-2 text-sm font-semibold text-mute">see all →</Link>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {recent.map((i) => (
          <motion.div key={i.id} whileTap={{ scale: 0.96 }} className="w-[172px] shrink-0 snap-start">
            <Link href={`/later/${i.id}`} className="block overflow-hidden rounded-[28px] bg-card shadow-soft">
              <div className="aspect-[4/5] w-full">
                <ItemArt item={i} emojiClass="text-6xl" />
              </div>
              <div className="p-3.5">
                <p className="line-clamp-2 font-display text-[17px] font-semibold leading-tight tracking-tight">{i.title}</p>
                <p className="mt-1 truncate text-xs text-mute">
                  {CATEGORY_BY_ID[i.category].emoji} {i.location_name.split(",")[0] || CATEGORY_BY_ID[i.category].label} · {timeAgo(i.created_at)}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
        <button onClick={() => openAdd()} className="flex w-[172px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-ink/15 text-mute" aria-label="save something new">
          <span className="text-3xl" aria-hidden>+</span>
          <span className="text-sm font-medium">save another</span>
        </button>
      </div>
      {recent.length === 0 && (
        <PillButton onClick={() => openAdd()} className="mx-1">save something</PillButton>
      )}
    </section>
  );
}
