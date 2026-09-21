"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORY_BY_ID } from "@/lib/categories";
import type { SavedItem } from "@/lib/types";
import { friendlyDay, timeAgo } from "@/lib/utils";
import { useShared } from "@/lib/useShared";
import { ItemArt } from "@/components/ui/ItemArt";
import { SourceChip } from "@/components/ui/bits";
import { ReactionBar } from "./ReactionBar";

export function ItemCard({ item, onMenu }: { item: SavedItem; onMenu: (item: SavedItem) => void }) {
  const { line, foundBy } = useShared();
  const cat = CATEGORY_BY_ID[item.category];
  const talk = line(item);

  return (
    <motion.article layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="overflow-hidden rounded-card bg-card shadow-soft">
      <Link href={`/later/${item.id}`} className="block" aria-label={`open ${item.title}`}>
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <ItemArt item={item} emojiClass="text-7xl" />
          <span className="glass absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-semibold">
            {cat.emoji} {cat.label}
          </span>
        </div>
        <div className="px-5 pb-1 pt-4">
          <h3 className="font-display text-[22px] font-semibold leading-tight tracking-tight">{item.title}</h3>
          {item.description && <p className="mt-0.5 text-[15px] text-mute">{item.description}</p>}
          {talk && <p className="mt-2.5 text-[15px] font-semibold">{talk}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink/70">
            {item.location_name && <span>📍 {item.location_name}</span>}
            {item.release_date && <span>🗓️ {friendlyDay(item.release_date)}</span>}
          </div>
          {item.source_url && <SourceChip url={item.source_url} saved className="mt-2.5" />}
          <p className="mt-2.5 text-[13px] text-mute">
            {foundBy(item)} · {timeAgo(item.created_at)}
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4 pt-3">
        <ReactionBar item={item} onMore={() => onMenu(item)} />
      </div>
    </motion.article>
  );
}
