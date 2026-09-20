"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { useStore } from "@/lib/store";
import type { SavedItem } from "@/lib/types";
import { friendlyDay, timeAgo } from "@/lib/utils";
import { ItemArt } from "@/components/ui/ItemArt";
import { PillButton, SourceChip } from "@/components/ui/bits";
import { useItemActions } from "./useItemActions";

interface Props {
  item: SavedItem;
  onMenu: (item: SavedItem) => void;
}

export function ItemCard({ item, onMenu }: Props) {
  const { profiles } = useStore();
  const { letsGo } = useItemActions();
  const cat = CATEGORY_BY_ID[item.category];
  const by = profiles.find((p) => p.id === item.created_by)?.name ?? "someone";

  return (
    <motion.article layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} whileTap={{ scale: 0.985 }} className="overflow-hidden rounded-card bg-card shadow-soft">
      <Link href={`/later/${item.id}`} className="block" aria-label={`open ${item.title}`}>
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <ItemArt item={item} emojiClass="text-7xl" />
          <span className="glass absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-semibold">
            {cat.emoji} {cat.label}
          </span>
          {item.status !== "saved" && (
            <span className="glass absolute right-3 top-3 rounded-full px-3 py-1.5 text-xs font-semibold capitalize">{item.status}</span>
          )}
        </div>
        <div className="px-5 pb-1 pt-4">
          <h3 className="font-display text-[22px] font-semibold leading-tight tracking-tight">{item.title}</h3>
          {item.description && <p className="mt-0.5 text-[15px] text-mute">{item.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink/70">
            {item.location_name && <span>📍 {item.location_name}</span>}
            {item.release_date && <span>🗓️ {friendlyDay(item.release_date)}</span>}
          </div>
          {item.source_url && <SourceChip url={item.source_url} className="mt-3" />}
          <p className="mt-3 text-[13px] text-mute">
            saved by {by} · {timeAgo(item.created_at)}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-4 pb-4 pt-3">
        {item.status === "done" ? (
          <PillButton tone="ghost" className="flex-1" disabled>
            we did this 🎉
          </PillButton>
        ) : item.status === "planned" ? (
          <PillButton tone="sun" className="flex-1" disabled>
            planned ✓
          </PillButton>
        ) : (
          <PillButton className="flex-1" onClick={() => letsGo(item)}>
            let&apos;s go
          </PillButton>
        )}
        <PillButton tone="ghost" className="w-11 !px-0" aria-label={`more options for ${item.title}`} onClick={() => onMenu(item)}>
          <span aria-hidden className="text-lg leading-none tracking-widest">•••</span>
        </PillButton>
      </div>
    </motion.article>
  );
}
