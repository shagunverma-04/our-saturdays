"use client";

import { motion } from "framer-motion";
import { toggleInteraction } from "@/lib/store";
import { useShared } from "@/lib/useShared";
import type { InteractionType, SavedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const REACTIONS: { type: InteractionType; emoji: string; label: string; text?: string }[] = [
  { type: "like", emoji: "❤️", label: "I like this" },
  { type: "interested", emoji: "👀", label: "I'm interested" },
  { type: "saturday", emoji: "📅", label: "Saturday?", text: "saturday?" },
];

/**
 * The whole "maintenance" surface of an item: ❤️ 👀 📅 (tap again to undo) and •••.
 * A subtle sun ring shows the ones your person has tapped, so agreement is visible at a glance.
 */
export function ReactionBar({ item, onMore, className }: { item: SavedItem; onMore?: () => void; className?: string }) {
  const { sig, partner } = useShared();
  const s = sig(item);
  const their = partner?.name ?? "they";

  return (
    <div className={cn("flex items-center gap-2", className)} role="group" aria-label={`react to ${item.title}`}>
      {REACTIONS.map((r) => {
        const mine = s.mine.has(r.type);
        const theirs = s.theirs.has(r.type);
        return (
          <motion.button
            key={r.type}
            type="button"
            aria-pressed={mine}
            aria-label={`${r.label}${theirs ? ` (${their} did too)` : ""}`}
            onClick={() => toggleInteraction(item.id, r.type)}
            whileTap={{ scale: 0.88 }}
            animate={mine ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold",
              r.text ? "px-4" : "w-12",
              mine ? "bg-ink text-on-ink" : "bg-ink/[0.07] text-ink",
              theirs && "ring-2 ring-sun",
            )}
          >
            <span aria-hidden>{r.emoji}</span>
            {r.text && <span>{r.text}</span>}
          </motion.button>
        );
      })}
      {onMore && (
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onMore} aria-label={`more options for ${item.title}`} className="ml-auto flex h-11 w-12 items-center justify-center rounded-full bg-ink/[0.07]">
          <span aria-hidden className="text-lg leading-none tracking-widest">•••</span>
        </motion.button>
      )}
    </div>
  );
}
