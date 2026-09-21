"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ItemArt } from "@/components/ui/ItemArt";
import { CATEGORY_BY_ID, iconFor } from "@/lib/categories";
import { toggleInteraction } from "@/lib/store";
import type { SavedItem } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { cn, timeAgo } from "@/lib/utils";

/** "from you" / "from Aarav": recent finds as a carousel, each with a one-tap ❤️ so reacting takes no navigation. */
export function FindsRow({ title, items }: { title: string; items: SavedItem[] }) {
  const { sig, partner } = useShared();
  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        <Link href="/later" className="py-2 text-sm font-semibold text-mute">see all →</Link>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {items.map((i) => {
          const s = sig(i);
          const liked = s.mine.has("like");
          const theirLike = s.theirs.has("like");
          return (
            <motion.div key={i.id} whileTap={{ scale: 0.97 }} className="relative w-[172px] shrink-0 snap-start self-start">
              <Link href={`/later/${i.id}`} className="block overflow-hidden rounded-[28px] bg-card shadow-soft">
                {i.image_url ? (
                  <div className="aspect-[4/5] w-full">
                    <ItemArt item={i} />
                  </div>
                ) : (
                  // no photo: no empty picture, just the little object
                  <div className="flex h-[92px] items-end px-4 pt-4">
                    <CategoryIcon category={iconFor(i)} size="lg" />
                  </div>
                )}
                <div className="p-3.5">
                  <p className="line-clamp-2 font-display text-[17px] font-semibold leading-tight tracking-tight">{i.title}</p>
                  <p className="mt-1 truncate text-xs text-mute">
                    {CATEGORY_BY_ID[i.category].emoji} {i.location_name.split(",")[0] || CATEGORY_BY_ID[i.category].label} · {timeAgo(i.created_at)}
                  </p>
                </div>
              </Link>
              {/* a sibling of the link, never nested inside it */}
              <button
                type="button"
                aria-pressed={liked}
                aria-label={liked ? `unlike ${i.title}` : `like ${i.title}${theirLike && partner ? ` (${partner.name} liked it)` : ""}`}
                onClick={() => toggleInteraction(i.id, "like")}
                className={cn("glass absolute right-2.5 top-2.5 flex h-10 w-10 items-center justify-center rounded-full text-lg", theirLike && !liked && "ring-2 ring-sun")}
              >
                <span aria-hidden>{liked ? "❤️" : "🤍"}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
